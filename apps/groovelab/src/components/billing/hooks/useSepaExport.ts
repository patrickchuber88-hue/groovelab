import { useState } from 'react';
import { downloadSepaXmlFile, SepaDebtorTransaction } from '../../../utils/sepaXmlGenerator';
import { logSecurityEvent } from '../../../services/auditLogService';
import { Invoice, formatSchoolNumericId } from '../types';
import { resolveEffectiveBillingDate } from '../../../domain/schoolDunningEngine';

export function useSepaExport(showActionToast: (msg: string) => void) {
  const [sepaExportModalOpen, setSepaExportModalOpen] = useState<boolean>(false);
  const [sepaCreditorId, setSepaCreditorId] = useState<string>('DE98ZZZ09999999999');
  const [sepaCollectionDate, setSepaCollectionDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  const handleExportSepaXml = (
    invoices: Invoice[],
    getPaidInvoices: (schoolId: string) => string[],
    operatorCompany: string,
    operatorIban: string,
    operatorBic: string
  ) => {
    try {
      const sepaTxs: SepaDebtorTransaction[] = [];
      const now = resolveEffectiveBillingDate();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');

      invoices.forEach(inv => {
        if (inv.total > 0 && !inv.subscriptionBypass && inv.status === 'active') {
          const numId = formatSchoolNumericId(inv.schoolId, 3);
          const effectiveIban = inv.sepaIban || inv.billingIban;
          if (!effectiveIban) return;

          const paidIds = getPaidInvoices(inv.schoolId);
          const overdueList = inv.overdueInvoices && inv.overdueInvoices.length > 0
            ? inv.overdueInvoices
            : null;

          if (overdueList) {
            overdueList.forEach((oInv, idx) => {
              if (!paidIds.includes(oInv.id) && oInv.amount > 0) {
                sepaTxs.push({
                  instructionId: `SEPA-INST-${numId}-${idx}-${Date.now().toString().slice(-4)}`,
                  endToEndId: oInv.id,
                  amount: oInv.amount,
                  debtorName: inv.sepaAccountHolder || inv.schoolName,
                  debtorIban: effectiveIban.replace(/\s+/g, '').toUpperCase(),
                  debtorBic: inv.sepaBic || undefined,
                  mandateId: inv.sepaMandateId || `MANDAT-MS-${numId}`,
                  mandateSignatureDate: inv.sepaMandateDate || '2026-01-01',
                  remittanceInfo: `Campus-Groovelab Cloud-Hosting ${oInv.id}`
                });
              }
            });
          } else {
            const infId = `INF-${numId}-${yy}${mm}-01`;
            const aktId = `AKT-${numId}-${yy}${mm}-01`;
            const glStudentFee = ((inv.activeGroovelabCount || 0) * 0.49);
            const infAmount = parseFloat((
              (inv.baseFee || 0) +
              (inv.teachersHostingFee || 0) +
              (inv.passiveStudentsHostingFee || 0) +
              (inv.storageAddonMonthlyFee || 0) +
              glStudentFee
            ).toFixed(2));
            const aktAmount = parseFloat((
              ((inv.activeCampusCount !== undefined ? inv.activeCampusCount : inv.activeStudents || 0) * 0.49)
            ).toFixed(2));

            if (infAmount > 0 && !paidIds.includes(infId)) {
              sepaTxs.push({
                instructionId: `SEPA-INST-${numId}-INF-${Date.now().toString().slice(-4)}`,
                endToEndId: infId,
                amount: infAmount,
                debtorName: inv.sepaAccountHolder || inv.schoolName,
                debtorIban: effectiveIban.replace(/\s+/g, '').toUpperCase(),
                debtorBic: inv.sepaBic || undefined,
                mandateId: inv.sepaMandateId || `MANDAT-MS-${numId}`,
                mandateSignatureDate: inv.sepaMandateDate || '2026-01-01',
                remittanceInfo: `Campus-Groovelab Infrastruktur ${infId}`
              });
            }
            if (aktAmount > 0 && !paidIds.includes(aktId)) {
              sepaTxs.push({
                instructionId: `SEPA-INST-${numId}-AKT-${Date.now().toString().slice(-4)}`,
                endToEndId: aktId,
                amount: aktAmount,
                debtorName: inv.sepaAccountHolder || inv.schoolName,
                debtorIban: effectiveIban.replace(/\s+/g, '').toUpperCase(),
                debtorBic: inv.sepaBic || undefined,
                mandateId: inv.sepaMandateId || `MANDAT-MS-${numId}`,
                mandateSignatureDate: inv.sepaMandateDate || '2026-01-01',
                remittanceInfo: `Campus-Groovelab Schuelerlizenzen ${aktId}`
              });
            }
          }
        }
      });

      if (sepaTxs.length === 0) {
        return alert('Keine offenen fälligen Posten für den SEPA-Lastschrifteinzug gefunden.');
      }

      downloadSepaXmlFile({
        initiatorName: operatorCompany || 'Campus-Groovelab',
        creditorName: operatorCompany || 'Campus-Groovelab Plattformbetrieb',
        creditorIban: operatorIban || 'DE89370400440532948211',
        creditorBic: operatorBic || 'WELADED1XYZ',
        creditorId: sepaCreditorId,
        collectionDate: sepaCollectionDate,
        transactions: sepaTxs
      });

      showActionToast(`📥 SEPA pain.008 XML Datei (${sepaTxs.length} Lastschriften, Summe: ${sepaTxs.reduce((s, t) => s + t.amount, 0).toFixed(2)} €) heruntergeladen.`);
      logSecurityEvent({
        action: 'FINANCIAL_LEDGER_EXPORT_TRIGGERED',
        metadata: {
          exportType: 'SEPA_PAIN_008',
          recordCount: sepaTxs.length,
          totalAmount: sepaTxs.reduce((s, t) => s + t.amount, 0),
          collectionDate: sepaCollectionDate
        }
      });
      setSepaExportModalOpen(false);
    } catch (err: any) {
      alert('Fehler beim Generieren der SEPA XML Datei: ' + err.message);
    }
  };

  return {
    sepaExportModalOpen,
    setSepaExportModalOpen,
    sepaCreditorId,
    setSepaCreditorId,
    sepaCollectionDate,
    setSepaCollectionDate,
    handleExportSepaXml
  };
}
