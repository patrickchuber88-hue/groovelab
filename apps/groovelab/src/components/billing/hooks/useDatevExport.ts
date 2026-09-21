import { useState } from 'react';
import { 
  ChartOfAccounts, 
  DatevBookingRecord, 
  DATEV_ACCOUNT_MAPPINGS, 
  downloadDatevExportFile 
} from '../../../utils/datevExporter';
import { logSecurityEvent } from '../../../services/auditLogService';
import { Invoice, DatevTaxMode } from '../types';

export function useDatevExport(showActionToast: (msg: string) => void) {
  const [selectedChartOfAccounts, setSelectedChartOfAccounts] = useState<ChartOfAccounts>('SKR03');
  const [datevPeriodMonth, setDatevPeriodMonth] = useState<number>(new Date().getMonth() + 1);
  const [datevPeriodYear, setDatevPeriodYear] = useState<number>(new Date().getFullYear());
  const [datevTaxMode, setDatevTaxMode] = useState<DatevTaxMode>('small_business');

  const handleDatevExport = (
    chart: ChartOfAccounts,
    invoices: Invoice[],
    getSchoolInvoices: (schoolId: string, currentInvoiceAmount: number, schoolStatus?: string, contractStartDate?: string | null, createdAt?: string | null, schoolMetrics?: any) => any[],
    operatorCompany: string
  ) => {
    try {
      const records: DatevBookingRecord[] = [];
      const mapping = DATEV_ACCOUNT_MAPPINGS[chart];
      const revAccount = datevTaxMode === 'standard_vat' ? mapping.revenue19 : mapping.revenueExempt;
      const debtorsAccount = mapping.debtorsCollective;

      // Filter all active invoices for selected period
      invoices.forEach(inv => {
        if (inv.total <= 0 && inv.status !== 'active') return;

        const schoolInvs = getSchoolInvoices(inv.schoolId, inv.total, inv.status, inv.contractStartDate, inv.createdAt, inv);
        const deMonthsMap: Record<string, number> = {
          'Januar': 1, 'Februar': 2, 'März': 3, 'April': 4,
          'Mai': 5, 'Juni': 6, 'Juli': 7, 'August': 8,
          'September': 9, 'Oktober': 10, 'November': 11, 'Dezember': 12
        };

        schoolInvs.forEach(si => {
          let docDate = new Date();
          if (si.date) {
            const parts = si.date.split('. ');
            if (parts.length >= 3) {
              const year = parseInt(parts[2], 10) || new Date().getFullYear();
              const month = deMonthsMap[parts[1]] || 1;
              docDate = new Date(year, month - 1, 1);
            }
          }
          if (docDate.getFullYear() === datevPeriodYear && (docDate.getMonth() + 1) === datevPeriodMonth) {
            records.push({
              amount: si.amount,
              isCredit: si.amount >= 0,
              accountNumber: revAccount,
              contraAccountNumber: debtorsAccount,
              bookingDate: docDate,
              documentNumber: si.id,
              bookingText: `Cloud-Hosting ${inv.schoolName.substring(0, 30)}`,
              taxRate: datevTaxMode === 'standard_vat' ? 19 : 0,
              isFixed: true
            });
          }
        });
      });

      // If no period matches, create at least current month snapshot
      if (records.length === 0) {
        invoices.forEach(inv => {
          if (inv.total > 0) {
            const numId = inv.schoolId ? inv.schoolId.replace(/[^0-9]/g, '').substring(0, 3) || '104' : '104';
            const yy = String(datevPeriodYear).slice(-2);
            const mm = String(datevPeriodMonth).padStart(2, '0');
            records.push({
              amount: inv.total,
              isCredit: true,
              accountNumber: revAccount,
              contraAccountNumber: debtorsAccount,
              bookingDate: new Date(datevPeriodYear, datevPeriodMonth - 1, 28),
              documentNumber: `RE-${numId}-${yy}${mm}-01`,
              bookingText: `SaaS-Hosting ${inv.schoolName.substring(0, 30)}`,
              taxRate: datevTaxMode === 'standard_vat' ? 19 : 0,
              isFixed: true
            });
          }
        });
      }

      const periodStart = new Date(datevPeriodYear, datevPeriodMonth - 1, 1);
      const periodEnd = new Date(datevPeriodYear, datevPeriodMonth, 0);

      downloadDatevExportFile(records, {
        chartOfAccounts: chart,
        taxMode: datevTaxMode,
        companyName: operatorCompany || 'Campus-Groovelab',
        periodStart,
        periodEnd
      });

      showActionToast(`📁 DATEV-Buchungsstapel (${chart}) für ${String(datevPeriodMonth).padStart(2, '0')}/${datevPeriodYear} erfolgreich exportiert!`);
      logSecurityEvent({
        action: 'EXPORT_DATEV_CSV',
        metadata: { chart, recordCount: records.length, period: `${datevPeriodYear}-${datevPeriodMonth}` }
      });
    } catch (err: any) {
      alert('Fehler beim DATEV-Export: ' + err.message);
    }
  };

  return {
    selectedChartOfAccounts,
    setSelectedChartOfAccounts,
    datevPeriodMonth,
    setDatevPeriodMonth,
    datevPeriodYear,
    setDatevPeriodYear,
    datevTaxMode,
    setDatevTaxMode,
    handleDatevExport
  };
}
