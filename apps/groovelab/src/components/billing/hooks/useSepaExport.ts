import { useState } from 'react';
import { downloadSepaXmlFile, SepaDebtorTransaction } from '../../../utils/sepaXmlGenerator';
import { logSecurityEvent } from '../../../services/auditLogService';
import { Invoice, getSchoolNumericId } from '../types';

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
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');

      invoices.forEach(inv => {
        if (inv.total > 0 && !inv.subscriptionBypass && inv.status === 'active') {
          const numId = getSchoolNumericId(inv.schoolId);
          const invId = `RE-${numId}-${yy}${mm}-01`;
          const paid = getPaidInvoices(inv.schoolId).includes(invId);

          if (!paid) {
            sepaTxs.push({
              instructionId: `SEPA-INST-${numId}-${Date.now().toString().slice(-4)}`,
              endToEndId: invId,
              amount: inv.total,
              debtorName: inv.schoolName,
              debtorIban: 'DE' + (inv.schoolId.replace(/[^0-9]/g, '') + '000000000000000000').substring(0, 20),
              mandateId: `MANDAT-MS-${numId}`,
              mandateSignatureDate: '2026-01-01',
              remittanceInfo: `Campus-Groovelab Cloud-Hosting ${invId}`
            });
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
