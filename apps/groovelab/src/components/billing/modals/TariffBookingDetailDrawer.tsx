import React from 'react';
import { X, Download, RotateCcw } from 'lucide-react';
import { generateTariffReceiptPDF } from '../../../utils/tariffReceiptPdfGenerator';
import { Invoice } from '../types';

interface TariffBookingDetailDrawerProps {
  selectedBookingForDrawer: any | null;
  onClose: () => void;
  onStornoTrigger: (booking: any) => void;
  invoices: Invoice[];
  allTariffBookings: any[];
}

export const TariffBookingDetailDrawer: React.FC<TariffBookingDetailDrawerProps> = ({
  selectedBookingForDrawer,
  onClose,
  onStornoTrigger,
  invoices,
  allTariffBookings
}) => {
  if (!selectedBookingForDrawer) return null;

  const sName = selectedBookingForDrawer.school_name || invoices.find(i => i.schoolId === selectedBookingForDrawer.school_id)?.schoolName || selectedBookingForDrawer.school_id;
  const matchingInv = invoices.find(i => String(i.schoolId || '').toLowerCase() === String(selectedBookingForDrawer.school_id || '').toLowerCase())
    || invoices.find(i => (i.schoolName || '').toLowerCase() === (sName || '').toLowerCase());

  const handleDownloadPDF = () => {
    generateTariffReceiptPDF({
      receiptNumber: selectedBookingForDrawer.receipt_number,
      schoolName: sName,
      schoolAddress: {
        street: matchingInv?.schoolStreet || '',
        zipCode: matchingInv?.schoolZipCode || '',
        city: matchingInv?.schoolCity || '',
        country: selectedBookingForDrawer.currency === 'CHF' ? 'CH' : 'DE'
      },
      bookedBy: selectedBookingForDrawer.booked_by_name || 'Schulleitung',
      bookingType: selectedBookingForDrawer.booking_type,
      hasCampus: selectedBookingForDrawer.has_campus_subscription,
      hasGroovelab: selectedBookingForDrawer.has_groovelab_subscription,
      studentBillingOption: selectedBookingForDrawer.student_billing_option,
      storageAddonGb: selectedBookingForDrawer.storage_addon_gb,
      storageAddonFee: Number(selectedBookingForDrawer.storage_addon_monthly_fee || 0),
      storageStatus: selectedBookingForDrawer.storage_addon_status,
      storagePendingDowngradeGb: selectedBookingForDrawer.storage_pending_downgrade_gb,
      storagePendingEffectiveDate: selectedBookingForDrawer.storage_pending_effective_date,
      totalMonthlyRateNet: Number(selectedBookingForDrawer.total_monthly_rate_net || 0),
      currency: selectedBookingForDrawer.currency || 'EUR',
      effectiveDate: selectedBookingForDrawer.effective_date,
      createdAt: selectedBookingForDrawer.created_at,
      notes: selectedBookingForDrawer.notes
    });
  };

  const revReceipt = allTariffBookings.find(item => item.reversal_of_receipt_number === selectedBookingForDrawer.receipt_number);
  const canReverse = selectedBookingForDrawer.booking_type !== 'REVERSAL_STORNO' && !revReceipt;

  return (
    <div 
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          background: '#ffffff',
          boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Drawer Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                GoBD Beleg-Inspektion
              </span>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: '#ecfdf5', color: '#059669' }}>
                Append-Only
              </span>
            </div>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
              {selectedBookingForDrawer.receipt_number}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '8px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status & School Card */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Mandant</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>
                {sName}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Ereignistyp</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: selectedBookingForDrawer.booking_type === 'REVERSAL_STORNO' ? '#b91c1c' : '#0f172a' }}>
                {selectedBookingForDrawer.booking_type}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Gebucht durch</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                {selectedBookingForDrawer.booked_by_name || 'Schulleitung'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Erfassungszeitpunkt (UTC)</span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#475569' }}>
                {selectedBookingForDrawer.created_at}
              </span>
            </div>
          </div>

          {/* Financial Rate Calculation Breakdown */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a' }}>
              Tarifberechnung &amp; Monatsrate
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem' }}>
              <span style={{ color: '#64748b' }}>Cloud-Hosting Campus:</span>
              <span style={{ fontWeight: 700 }}>{selectedBookingForDrawer.has_campus_subscription ? '14,90 € / Mo.' : '0,00 €'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem' }}>
              <span style={{ color: '#64748b' }}>Cloud-Hosting GrooveLab:</span>
              <span style={{ fontWeight: 700 }}>{selectedBookingForDrawer.has_groovelab_subscription ? '9,90 € / Mo.' : '0,00 €'}</span>
            </div>
            {selectedBookingForDrawer.has_campus_subscription && selectedBookingForDrawer.has_groovelab_subscription && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', color: '#059669' }}>
                <span>Kombi-Vorteilsrabatt:</span>
                <span style={{ fontWeight: 800 }}>-4,90 € / Mo.</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem' }}>
              <span style={{ color: '#64748b' }}>Audio-Tresor Add-on:</span>
              <span style={{ fontWeight: 700 }}>+{selectedBookingForDrawer.storage_addon_gb || 0} GB ({Number(selectedBookingForDrawer.storage_addon_monthly_fee || 0).toFixed(2).replace('.', ',')} €)</span>
            </div>
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>Gesamt-Monatsrate netto:</strong>
              <strong style={{ fontSize: '1.1rem', color: selectedBookingForDrawer.booking_type === 'REVERSAL_STORNO' ? '#b91c1c' : '#0f172a' }}>
                {selectedBookingForDrawer.booking_type === 'REVERSAL_STORNO' ? '-' : ''}{Math.abs(Number(selectedBookingForDrawer.total_monthly_rate_net || 0)).toFixed(2).replace('.', ',')} € / Mo.
              </strong>
            </div>
          </div>

          {/* Reversal / Storno Information */}
          {selectedBookingForDrawer.reversal_of_receipt_number && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <strong style={{ fontSize: '0.78rem', color: '#991b1b' }}>GoBD-Generalumkehr:</strong>
              <span style={{ fontSize: '0.74rem', color: '#7f1d1d' }}>
                Dieser Beleg storniert den Originalbeleg <strong>{selectedBookingForDrawer.reversal_of_receipt_number}</strong>.
              </span>
            </div>
          )}

          {revReceipt && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <strong style={{ fontSize: '0.78rem', color: '#991b1b' }}>Storniert im Journal:</strong>
              <span style={{ fontSize: '0.74rem', color: '#7f1d1d' }}>
                Dieser Beleg wurde neutralisiert durch Stornobeleg <strong>{revReceipt.receipt_number}</strong> am {new Date(revReceipt.created_at).toLocaleDateString('de-DE')}.
              </span>
            </div>
          )}

          {/* Raw Metadata Viewer */}
          <div>
            <span style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
              Kryptografische Metadaten &amp; Rohdaten (JSON)
            </span>
            <pre style={{
              background: '#0f172a',
              color: '#f8fafc',
              padding: '12px',
              borderRadius: '10px',
              fontSize: '0.70rem',
              fontFamily: 'monospace',
              overflowX: 'auto',
              maxHeight: '180px'
            }}>
              {JSON.stringify(selectedBookingForDrawer, null, 2)}
            </pre>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div style={{ padding: '18px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <button
            type="button"
            onClick={handleDownloadPDF}
            style={{ padding: '9px 16px', borderRadius: '10px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 800, fontSize: '0.80rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={13} />
            PDF herunterladen
          </button>

          {canReverse && (
            <button
              type="button"
              onClick={() => onStornoTrigger(selectedBookingForDrawer)}
              style={{ padding: '9px 16px', borderRadius: '10px', background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 800, fontSize: '0.80rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={13} />
              Stornobeleg erzeugen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
