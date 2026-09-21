import React from 'react';
import { 
  Search, 
  RefreshCw, 
  Download, 
  ScrollText, 
  Clock, 
  Check, 
  Copy, 
  Eye 
} from 'lucide-react';
import { generateTariffReceiptPDF } from '../../../utils/tariffReceiptPdfGenerator';
import { Invoice } from '../types';

interface LedgerSubTabProps {
  allTariffBookings: any[];
  loadingTariffBookings: boolean;
  invoices: Invoice[];
  ledgerSearchQuery: string;
  setLedgerSearchQuery: (q: string) => void;
  ledgerSchoolFilter: string;
  setLedgerSchoolFilter: (s: string) => void;
  ledgerTypeFilter: string;
  setLedgerTypeFilter: (t: string) => void;
  ledgerDateFilter: string;
  setLedgerDateFilter: (d: string) => void;
  copiedReceiptId: string | null;
  onRefresh: () => void;
  onExportCsv: (filteredBookings: any[]) => void;
  onCopyReceipt: (receiptNumber: string) => void;
  onSelectBookingForDrawer: (booking: any) => void;
}

export const LedgerSubTab: React.FC<LedgerSubTabProps> = ({
  allTariffBookings,
  loadingTariffBookings,
  invoices,
  ledgerSearchQuery,
  setLedgerSearchQuery,
  ledgerSchoolFilter,
  setLedgerSchoolFilter,
  ledgerTypeFilter,
  setLedgerTypeFilter,
  ledgerDateFilter,
  setLedgerDateFilter,
  copiedReceiptId,
  onRefresh,
  onExportCsv,
  onCopyReceipt,
  onSelectBookingForDrawer
}) => {
  // Filter logic for ledger
  const filteredBookings = allTariffBookings.filter(b => {
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

  // Compute KPIs
  const totalBaseMrr = allTariffBookings.reduce((acc, b) => {
    if (b.booking_type === 'STORAGE_UPGRADE' || b.booking_type === 'STORAGE_DOWNGRADE') return acc;
    if (b.booking_type === 'REVERSAL_STORNO') return acc + Number(b.total_monthly_rate_net || 0);
    const baseRate = (b.has_campus_subscription && b.has_groovelab_subscription) ? 19.90 : b.has_campus_subscription ? 14.90 : 9.90;
    return acc + baseRate;
  }, 0);

  const totalStorageMrr = allTariffBookings.reduce((acc, b) => {
    if (b.booking_type === 'REVERSAL_STORNO') return acc;
    return acc + Number(b.storage_addon_monthly_fee || 0);
  }, 0);
  const activeStorageBookingsCount = allTariffBookings.filter(b => b.booking_type !== 'REVERSAL_STORNO' && Number(b.storage_addon_gb || 0) > 0).length;
  const pendingDowngradesCount = allTariffBookings.filter(b => b.storage_pending_downgrade_gb !== null && b.storage_pending_downgrade_gb !== undefined).length;

  // Unique school list for filter dropdown
  const schoolFilterOptions = Array.from(new Set(allTariffBookings.map(b => b.school_id))).map(id => {
    const name = allTariffBookings.find(b => b.school_id === id)?.school_name || invoices.find(i => i.schoolId === id)?.schoolName || id;
    return { id, name };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Gebuchte Basis-MRR</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', fontFeatureSettings: '"tnum"' }}>
            {totalBaseMrr.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700 }}>✓ Campus &amp; GrooveLab Hosting</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Audio-Tresor Add-on MRR</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', fontFeatureSettings: '"tnum"' }}>
            {totalStorageMrr.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{activeStorageBookingsCount} aktive Speicherpakete</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Gesamt-Belege im Ledger</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', fontFeatureSettings: '"tnum"' }}>
            {allTariffBookings.length}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Append-Only Audit Trail</span>
        </div>

        <div style={{ background: pendingDowngradesCount > 0 ? '#fffbeb' : '#ffffff', border: pendingDowngradesCount > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0', borderRadius: '18px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: pendingDowngradesCount > 0 ? '#b45309' : '#64748b', textTransform: 'uppercase' }}>Vorgemerkte Downgrades</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: pendingDowngradesCount > 0 ? '#d97706' : '#0f172a', fontFeatureSettings: '"tnum"' }}>
            {pendingDowngradesCount}
          </div>
          <span style={{ fontSize: '0.68rem', color: pendingDowngradesCount > 0 ? '#b45309' : '#64748b' }}>
            {pendingDowngradesCount > 0 ? 'Wirksam zum Monatswechsel' : 'Keine Vormerkungen offen'}
          </span>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', minWidth: '220px' }}>
            <Search size={15} color="#64748b" />
            <input
              type="text"
              value={ledgerSearchQuery}
              onChange={(e) => setLedgerSearchQuery(e.target.value)}
              placeholder="Suche nach Schule, Beleg-Nr., Name..."
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.82rem', width: '100%', color: '#0f172a' }}
            />
            {ledgerSearchQuery && (
              <button onClick={() => setLedgerSearchQuery('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            )}
          </div>

          <select
            value={ledgerSchoolFilter}
            onChange={(e) => setLedgerSchoolFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.82rem', color: '#0f172a', fontWeight: 650, outline: 'none' }}
          >
            <option value="all">Alle Musikschulen ({schoolFilterOptions.length})</option>
            {schoolFilterOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>

          <select
            value={ledgerTypeFilter}
            onChange={(e) => setLedgerTypeFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.82rem', color: '#0f172a', fontWeight: 650, outline: 'none' }}
          >
            <option value="all">Alle Buchungstypen</option>
            <option value="SUBSCRIPTION_BOOKING">Schuljahres-Buchungen</option>
            <option value="STORAGE_UPGRADE">Speicher-Upgrades</option>
            <option value="STORAGE_DOWNGRADE">Downgrade vorgemerkt</option>
            <option value="STORAGE_DOWNGRADE_CANCEL">Downgrade widerrufen</option>
            <option value="INITIAL_BASELINE">System-Baselines</option>
            <option value="REVERSAL_STORNO">Stornos &amp; Generalumkehr</option>
          </select>

          <select
            value={ledgerDateFilter}
            onChange={(e) => setLedgerDateFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.82rem', color: '#0f172a', fontWeight: 650, outline: 'none' }}
          >
            <option value="all">Alle Zeiträume</option>
            <option value="this_month">Aktueller Monat</option>
            <option value="last_month">Letzter Monat</option>
            <option value="this_quarter">Laufendes Quartal</option>
            <option value="this_year">Aktuelles Kalenderjahr</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onRefresh}
            style={{ padding: '8px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.80rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} className={loadingTariffBookings ? 'animate-spin' : ''} />
            Aktualisieren
          </button>

          <button
            type="button"
            onClick={() => onExportCsv(filteredBookings)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              background: '#0f172a',
              border: '1px solid #1e293b',
              color: '#ffffff',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="hover-scale-mini"
          >
            <Download size={13} />
            CSV Export
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)' }}>
        <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
            Revisionssicheres Buchungsjournal ({filteredBookings.length} Einträge)
          </span>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Lückenlose GoBD-Belegkette (Multi-Tenant)
          </span>
        </div>

        {loadingTariffBookings ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#ea4335' }} />
            Buchungsjournal wird geladen...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
            <ScrollText size={36} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Keine Buchungsbelege gefunden</div>
            <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Passe deine Filterkriterien an oder aktualisiere die Daten.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 800 }}>Beleg-Nr.</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>Datum</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>Musikschule</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>Ereignistyp</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>Module</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>Audio-Tresor</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, textAlign: 'right' }}>Monatsrate</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>Gebucht durch</th>
                  <th style={{ padding: '12px 18px', fontWeight: 800, textAlign: 'center' }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b, idx) => {
                  const isReversal = b.booking_type === 'REVERSAL_STORNO';
                  const isUpgrade = b.booking_type === 'STORAGE_UPGRADE';
                  const isDowngrade = b.booking_type === 'STORAGE_DOWNGRADE' || b.booking_type === 'STORAGE_CANCEL';
                  const isDowngradeCancel = b.booking_type === 'STORAGE_DOWNGRADE_CANCEL';
                  const isBaseline = b.booking_type === 'INITIAL_BASELINE';
                  const isSubBooking = b.booking_type === 'SUBSCRIPTION_BOOKING';

                  const typeLabel = isReversal
                    ? 'Storno / Generalumkehr'
                    : isUpgrade
                      ? `Speicher +${b.storage_addon_gb} GB`
                      : isDowngrade
                        ? `Downgrade vorgemerkt (+${b.storage_pending_downgrade_gb ?? b.storage_addon_gb} GB)`
                        : isDowngradeCancel
                          ? 'Downgrade widerrufen'
                          : isBaseline
                            ? 'System-Baseline'
                            : isSubBooking
                              ? 'Vertragsabschluss'
                              : b.booking_type;

                  const badgeBg = isReversal 
                    ? '#fee2e2' 
                    : (isUpgrade || isSubBooking ? '#dcfce7' : isDowngrade ? '#fef3c7' : isDowngradeCancel ? '#f3e8ff' : '#f1f5f9');
                  const badgeColor = isReversal 
                    ? '#b91c1c' 
                    : (isUpgrade || isSubBooking ? '#166534' : isDowngrade ? '#92400e' : isDowngradeCancel ? '#6b21a8' : '#475569');

                  const sName = b.school_name || invoices.find(i => i.schoolId === b.school_id)?.schoolName || 'Musikschule';
                  const sCity = invoices.find(i => i.schoolId === b.school_id)?.schoolCity || '';
                  const formattedDate = new Date(b.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                  const isAlreadyReversed = allTariffBookings.some(item => item.reversal_of_receipt_number === b.receipt_number);

                  return (
                    <tr
                      key={b.id || idx}
                      style={{ 
                        borderBottom: idx < filteredBookings.length - 1 ? '1px solid #f1f5f9' : 'none', 
                        transition: 'background 0.15s ease',
                        background: isReversal ? 'rgba(254, 226, 226, 0.15)' : '#ffffff'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = isReversal ? 'rgba(254, 226, 226, 0.25)' : '#fafbfc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = isReversal ? 'rgba(254, 226, 226, 0.15)' : '#ffffff'}
                    >
                      <td style={{ padding: '14px 18px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span 
                            onClick={() => onSelectBookingForDrawer(b)}
                            style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(15,23,42,0.25)' }}
                            title="Klick für GoBD Beleg-Inspektion (Drawer)"
                          >
                            {b.receipt_number}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCopyReceipt(b.receipt_number);
                            }}
                            title="Belegnummer kopieren"
                            style={{
                              background: copiedReceiptId === b.receipt_number ? '#ecfdf5' : '#f1f5f9',
                              border: '1px solid ' + (copiedReceiptId === b.receipt_number ? '#a7f3d0' : '#cbd5e1'),
                              borderRadius: '6px',
                              padding: '3px 5px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {copiedReceiptId === b.receipt_number ? (
                              <Check size={11} color="#059669" />
                            ) : (
                              <Copy size={11} color="#64748b" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formattedDate}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ color: '#0f172a', display: 'block' }}>{sName}</strong>
                        {sCity && <span style={{ fontSize: '0.70rem', color: '#64748b' }}>{sCity}</span>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                          <span style={{ background: badgeBg, color: badgeColor, padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            {typeLabel}
                          </span>
                          {isAlreadyReversed && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '1px 5px', borderRadius: '4px' }}>
                              Storniert
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {b.has_campus_subscription && b.has_groovelab_subscription ? 'Campus + GrooveLab' : b.has_campus_subscription ? 'Campus' : 'GrooveLab'}
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: b.storage_addon_gb > 0 ? '#166534' : '#64748b' }}>
                          {b.storage_addon_gb > 0 ? `+${b.storage_addon_gb} GB (${Number(b.storage_addon_monthly_fee).toFixed(2).replace('.', ',')} €)` : '1 GB Basis (0 €)'}
                        </strong>
                        {b.storage_pending_downgrade_gb !== null && b.storage_pending_downgrade_gb !== undefined && (
                          <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Clock size={11} color="#d97706" />
                            <span>Ziel: +{b.storage_pending_downgrade_gb} GB zum {b.storage_pending_effective_date}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, color: isReversal ? '#b91c1c' : '#0f172a', whiteSpace: 'nowrap' }}>
                        {isReversal ? '-' : ''}{Math.abs(Number(b.total_monthly_rate_net || 0)).toFixed(2).replace('.', ',')} € / Mo.
                        {b.reversal_of_receipt_number && (
                          <div style={{ fontSize: '0.64rem', color: '#b91c1c', fontWeight: 700 }}>
                            zu {b.reversal_of_receipt_number}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569', fontSize: '0.74rem' }}>
                        {b.booked_by_name || 'Schulleitung'}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const matchingInv = invoices.find(i => String(i.schoolId || '').toLowerCase() === String(b.school_id || '').toLowerCase())
                                || invoices.find(i => (i.schoolName || '').toLowerCase() === (sName || '').toLowerCase());
                              generateTariffReceiptPDF({
                                receiptNumber: b.receipt_number,
                                schoolName: sName,
                                schoolAddress: {
                                  street: matchingInv?.schoolStreet || '',
                                  zipCode: matchingInv?.schoolZipCode || '',
                                  city: matchingInv?.schoolCity || '',
                                  country: b.currency === 'CHF' ? 'CH' : 'DE'
                                },
                                bookedBy: b.booked_by_name || 'Schulleitung',
                                bookingType: b.booking_type,
                                hasCampus: b.has_campus_subscription,
                                hasGroovelab: b.has_groovelab_subscription,
                                studentBillingOption: b.student_billing_option,
                                storageAddonGb: b.storage_addon_gb,
                                storageAddonFee: Number(b.storage_addon_monthly_fee || 0),
                                storageStatus: b.storage_addon_status,
                                storagePendingDowngradeGb: b.storage_pending_downgrade_gb,
                                storagePendingEffectiveDate: b.storage_pending_effective_date,
                                totalMonthlyRateNet: Number(b.total_monthly_rate_net || 0),
                                currency: b.currency || 'EUR',
                                effectiveDate: b.effective_date,
                                createdAt: b.created_at,
                                notes: b.notes
                              });
                            }}
                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Download size={12} />
                            PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectBookingForDrawer(b)}
                            title="GoBD-Details & Prüfung anzeigen"
                            style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
