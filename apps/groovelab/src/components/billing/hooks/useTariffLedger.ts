import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { logSecurityEvent } from '../../../services/auditLogService';
import { downloadCsvFile } from '../../../utils/csvHelper';
import { Invoice } from '../types';

export function useTariffLedger(showActionToast: (msg: string) => void) {
  const [allTariffBookings, setAllTariffBookings] = useState<any[]>([]);
  const [loadingTariffBookings, setLoadingTariffBookings] = useState<boolean>(false);
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState<string>('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('all');
  const [ledgerSchoolFilter, setLedgerSchoolFilter] = useState<string>('all');
  const [ledgerDateFilter, setLedgerDateFilter] = useState<string>('all');
  const [copiedReceiptId, setCopiedReceiptId] = useState<string | null>(null);
  const [selectedBookingForDrawer, setSelectedBookingForDrawer] = useState<any | null>(null);
  const [stornoModalBooking, setStornoModalBooking] = useState<any | null>(null);
  const [tariffStornoReason, setTariffStornoReason] = useState<string>('GoBD-Korrektur / Storno');
  const [processingTariffStorno, setProcessingTariffStorno] = useState<boolean>(false);

  const fetchAllTariffBookings = async (loadedInvoices?: Invoice[]) => {
    setLoadingTariffBookings(true);
    try {
      const { data, error } = await supabase
        .from('school_tariff_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setAllTariffBookings(data);
      } else {
        const invList = loadedInvoices || [];
        const baselines: any[] = [];
        invList.forEach(inv => {
          if (inv.status === 'active' || inv.total > 0) {
            const hex = (inv.schoolId || '000000').replace(/-/g, '').slice(0, 6).toUpperCase();
            baselines.push({
              id: `baseline-${inv.schoolId}`,
              school_id: inv.schoolId,
              school_name: inv.schoolName,
              receipt_number: `TB-${hex}-260901-INIT`,
              booking_type: 'SUBSCRIPTION_BOOKING',
              has_campus_subscription: inv.hasCampus,
              has_groovelab_subscription: inv.hasGroovelab,
              student_billing_option: inv.studentBillingOption,
              storage_addon_gb: inv.storageAddonGb,
              storage_addon_monthly_fee: inv.storageAddonMonthlyFee,
              storage_addon_status: inv.storageAddonGb > 0 ? 'active' : 'none',
              storage_pending_downgrade_gb: null,
              storage_pending_effective_date: null,
              total_monthly_rate_net: (inv.hasCampus && inv.hasGroovelab ? 19.90 : inv.hasCampus ? 14.90 : 9.90) + (inv.storageAddonMonthlyFee || 0),
              currency: 'EUR',
              effective_date: inv.contractStartDate || '2026-09-01',
              notes: 'Initialer Schuljahres-Vertragsabschluss 2026/2027 (Campus-Groovelab)',
              booked_by_name: 'Schulleitung',
              created_at: inv.contractStartDate ? `${inv.contractStartDate}T09:00:00Z` : (inv.createdAt || new Date().toISOString())
            });
          }
        });
        setAllTariffBookings(baselines);
      }
    } catch (err) {
      console.error('Error loading tariff bookings in Master Admin:', err);
    } finally {
      setLoadingTariffBookings(false);
    }
  };

  const handleCopyReceipt = (receiptNumber: string) => {
    if (!receiptNumber) return;
    navigator.clipboard.writeText(receiptNumber);
    setCopiedReceiptId(receiptNumber);
    showActionToast(`📋 Beleg-Nr. ${receiptNumber} in die Zwischenablage kopiert`);
    setTimeout(() => {
      setCopiedReceiptId(prev => (prev === receiptNumber ? null : prev));
    }, 1800);
  };

  const handleExecuteTariffStorno = async () => {
    if (!stornoModalBooking) return;
    setProcessingTariffStorno(true);
    try {
      const { data, error } = await supabase.rpc('revert_tariff_booking_entry', {
        p_booking_id: stornoModalBooking.id,
        p_reason: tariffStornoReason
      });

      if (error) {
        throw error;
      }

      showActionToast(`↩️ GoBD-Stornobeleg ${data?.receipt_number || ''} erfolgreich eingebucht!`);
      logSecurityEvent({
        action: 'TARIFF_BOOKING_REVERSED',
        metadata: {
          originalReceipt: stornoModalBooking.receipt_number,
          stornoReceipt: data?.receipt_number,
          reason: tariffStornoReason,
          schoolId: stornoModalBooking.school_id
        }
      });
      setStornoModalBooking(null);
      if (selectedBookingForDrawer?.id === stornoModalBooking.id) {
        setSelectedBookingForDrawer(null);
      }
      await fetchAllTariffBookings();
    } catch (err: any) {
      alert(`Fehler beim Erzeugen des GoBD-Stornobelegs: ${err.message || err}`);
    } finally {
      setProcessingTariffStorno(false);
    }
  };

  const handleExportLedgerCsv = (invoices: Invoice[], filteredBookings: any[]) => {
    const headers = [
      'Belegnummer',
      'Datum',
      'Musikschule',
      'Buchungstyp',
      'Campus',
      'GrooveLab',
      'AudioTresorGB',
      'MonatsgebuehrNetto',
      'GebuchtDurch',
      'Notizen'
    ];
    const rows = filteredBookings.map(b => {
      const sName = b.school_name || invoices.find(i => i.schoolId === b.school_id)?.schoolName || b.school_id;
      const dateStr = new Date(b.created_at).toLocaleDateString('de-DE');
      return [
        b.receipt_number,
        dateStr,
        sName,
        b.booking_type,
        b.has_campus_subscription ? 'Ja' : 'Nein',
        b.has_groovelab_subscription ? 'Ja' : 'Nein',
        b.storage_addon_gb || 0,
        Number(b.total_monthly_rate_net || 0).toFixed(2),
        b.booked_by_name || 'Schulleitung',
        b.notes || ''
      ];
    });
    downloadCsvFile(`buchungsjournal_campus_groovelab_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    showActionToast(`📁 Buchungsjournal (${filteredBookings.length} Belege) als CSV exportiert.`);
    logSecurityEvent({
      action: 'FINANCIAL_LEDGER_EXPORT_TRIGGERED',
      metadata: {
        exportType: 'CSV_LEDGER',
        recordCount: filteredBookings.length,
        schoolFilter: ledgerSchoolFilter,
        typeFilter: ledgerTypeFilter,
        dateFilter: ledgerDateFilter
      }
    });
  };

  // Helper calculation for filtered bookings
  const getFilteredBookings = (invoices: Invoice[]) => {
    return allTariffBookings.filter(b => {
      const q = ledgerSearchQuery.toLowerCase().trim();
      const schoolName = (b.school_name || invoices.find(i => i.schoolId === b.school_id)?.schoolName || '').toLowerCase();
      const receipt = (b.receipt_number || '').toLowerCase();
      const bookedBy = (b.booked_by_name || '').toLowerCase();
      const matchesQuery = !q || schoolName.includes(q) || receipt.includes(q) || bookedBy.includes(q);

      const matchesSchool = ledgerSchoolFilter === 'all' || b.school_id === ledgerSchoolFilter;

      let matchesType = true;
      if (ledgerTypeFilter !== 'all') {
        matchesType = b.booking_type === ledgerTypeFilter;
      }

      let matchesDate = true;
      if (ledgerDateFilter !== 'all') {
        const bDate = new Date(b.created_at || b.effective_date || Date.now());
        const now = new Date();
        if (ledgerDateFilter === 'this_month') {
          matchesDate = bDate.getFullYear() === now.getFullYear() && bDate.getMonth() === now.getMonth();
        } else if (ledgerDateFilter === 'last_month') {
          const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          matchesDate = bDate.getFullYear() === lastM.getFullYear() && bDate.getMonth() === lastM.getMonth();
        } else if (ledgerDateFilter === 'this_quarter') {
          const currentQ = Math.floor(now.getMonth() / 3);
          const bookingQ = Math.floor(bDate.getMonth() / 3);
          matchesDate = bDate.getFullYear() === now.getFullYear() && currentQ === bookingQ;
        } else if (ledgerDateFilter === 'this_year') {
          matchesDate = bDate.getFullYear() === now.getFullYear();
        }
      }

      return matchesQuery && matchesSchool && matchesType && matchesDate;
    });
  };

  return {
    allTariffBookings,
    loadingTariffBookings,
    ledgerSearchQuery,
    setLedgerSearchQuery,
    ledgerTypeFilter,
    setLedgerTypeFilter,
    ledgerSchoolFilter,
    setLedgerSchoolFilter,
    ledgerDateFilter,
    setLedgerDateFilter,
    copiedReceiptId,
    selectedBookingForDrawer,
    setSelectedBookingForDrawer,
    stornoModalBooking,
    setStornoModalBooking,
    tariffStornoReason,
    setTariffStornoReason,
    processingTariffStorno,
    fetchAllTariffBookings,
    handleCopyReceipt,
    handleExecuteTariffStorno,
    handleExportLedgerCsv,
    getFilteredBookings
  };
}
