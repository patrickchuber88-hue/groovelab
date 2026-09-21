import React from 'react';
import { AlertTriangle, AlertCircle, Mail } from 'lucide-react';
import { Invoice, getSchoolNumericId } from '../types';

interface DunningSubTabProps {
  invoices: Invoice[];
  totalUnpaid: number;
  getPaidInvoices: (schoolId: string) => string[];
  onSendDunningEmail: (invoice: { id: string; amount: number }, inv: Invoice, level: 1 | 2 | 3) => void;
}

export const DunningSubTab: React.FC<DunningSubTabProps> = ({
  invoices,
  totalUnpaid,
  getPaidInvoices,
  onSendDunningEmail
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '28px 32px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={24} color="#dc2626" />
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
              Offene Posten (OPOS) &amp; 3-Stufen-Mahnwesen
            </h3>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Automatische Verzugsüberwachung inkl. gesetzlicher Verzugszinsen und Mahngebühren.
          </p>
        </div>

        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '8px 16px', borderRadius: '12px', fontWeight: 850, fontSize: '0.88rem' }}>
          Offene Gesamtforderungen: {totalUnpaid.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
        </div>
      </div>

      {/* Dunning Invoices Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '24px 28px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>Musikschule</th>
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>Rechnungs-ID</th>
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>Fälligkeit</th>
                <th style={{ padding: '10px 14px', fontWeight: 800, textAlign: 'right' }}>Betrag</th>
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>Mahnstufe</th>
                <th style={{ padding: '10px 14px', fontWeight: 800, textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {invoices.filter(inv => inv.total > 0 && inv.status !== 'bypass').map((inv, idx) => {
                const numId = getSchoolNumericId(inv.schoolId);
                const now = new Date();
                const yy = String(now.getFullYear()).slice(-2);
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const invId = `RE-${numId}-${yy}${mm}-01`;
                const isPaid = getPaidInvoices(inv.schoolId).includes(invId);

                if (isPaid) return null;

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>{inv.schoolName}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700 }}>{invId}</td>
                    <td style={{ padding: '12px 14px', color: '#dc2626', fontWeight: 700 }}>Seit 14 Tagen überfällig</td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'right', color: '#0f172a' }}>{inv.total.toFixed(2).replace('.', ',')} €</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '0.70rem', padding: '3px 8px', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c', fontWeight: 800 }}>
                        Stufe 1 (Zahlungserinnerung)
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => onSendDunningEmail({ id: invId, amount: inv.total }, inv, 1)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#334155',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <Mail size={13} /> Erinnerung
                        </button>
                        <button
                          type="button"
                          onClick={() => onSendDunningEmail({ id: invId, amount: inv.total }, inv, 2)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#b45309',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <AlertTriangle size={13} /> 1. Mahnung (+5 €)
                        </button>
                        <button
                          type="button"
                          onClick={() => onSendDunningEmail({ id: invId, amount: inv.total }, inv, 3)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <AlertCircle size={13} /> 2. Mahnung (+40 € / Sperre)
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
