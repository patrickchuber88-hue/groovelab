import React from 'react';
import { AlertTriangle, AlertCircle, Mail, Zap, Award, Sun, CheckCircle2 } from 'lucide-react';
import { Invoice, getSchoolNumericId } from '../types';
import { resolveEffectiveBillingDate } from '../../../domain/schoolDunningEngine';

interface DbInvoiceRecord {
  id?: string;
  invoice_number?: string;
  school_id?: string;
  due_date?: string;
  billing_date?: string;
  created_at?: string;
  status?: string;
}

interface DunningSubTabProps {
  invoices: Invoice[];
  dbInvoices?: DbInvoiceRecord[];
  totalUnpaid: number;
  getPaidInvoices: (schoolId: string) => string[];
  onSendDunningEmail: (invoice: { id: string; amount: number; date?: string }, inv: Invoice, level: 1 | 2 | 3) => void;
}

export const DunningSubTab: React.FC<DunningSubTabProps> = ({
  invoices,
  dbInvoices = [],
  totalUnpaid,
  getPaidInvoices,
  onSendDunningEmail
}) => {
  const effectiveNow = resolveEffectiveBillingDate();

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
            Kanonische B2B-Verzugsüberwachung (BGB Verzug & Zinsen) mit INF-/AKT-Belegtrennung, Kulanzjoker (+30T), 48h-Trust-Pass &amp; 100 % Didaktischer Immunität.
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
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>Musikschule &amp; Schutz-Status</th>
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>Offene Belege (INF / AKT)</th>
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>Fälligkeit &amp; Verzugstage</th>
                <th style={{ padding: '10px 14px', fontWeight: 800, textAlign: 'right' }}>Forderung (inkl. Pauschale)</th>
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>Mahnstufe (SSOT)</th>
                <th style={{ padding: '10px 14px', fontWeight: 800, textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {invoices.filter(inv => inv.total > 0 && inv.status !== 'bypass' && inv.status !== 'trial').map((inv, idx) => {
                const ds = inv.dunningStatus;
                const overdueList = ds?.overdueInvoicesList || [];
                const numId = getSchoolNumericId(inv.schoolId);
                const yy = String(effectiveNow.getFullYear()).slice(-2);
                const mm = String(effectiveNow.getMonth() + 1).padStart(2, '0');
                const fallbackInfId = `INF-${String(numId).padStart(3, '0')}-${yy}${mm}-01`;

                if (overdueList.length === 0 && getPaidInvoices(inv.schoolId).includes(fallbackInfId)) {
                  return null;
                }

                const primaryInvId = overdueList.length > 0
                  ? (overdueList.length === 1 ? overdueList[0].id : `${overdueList[0].id} (+${overdueList.length - 1} weitere)`)
                  : fallbackInfId;
                const referenceIds = overdueList.length > 0
                  ? overdueList.map((o: any) => o.id).join(', ')
                  : fallbackInfId;

                const diffDays = ds ? ds.overdueDays : 0;
                const baseAmount = ds && ds.totalOverdueAmount > 0 ? ds.totalOverdueAmount : inv.total;
                const appliedFee = ds ? ds.appliedDunningFee : 0;
                const canonicalFee = ds ? ds.dunningFee : (inv.hasCampus && inv.hasGroovelab ? 19.90 : 14.90);
                const totalPayable = ds && ds.totalPayableAmount > 0 ? ds.totalPayableAmount : baseAmount;

                const dueLabel = ds?.hasSepaMandate
                  ? 'SEPA-Lastschrift aktiv (BGB Verzugsausschluss)'
                  : diffDays > 0
                    ? `Seit ${diffDays} Tag${diffDays === 1 ? '' : 'en'} überfällig (Kulanz: ${ds?.baseGraceDays || 28}T)`
                    : 'Offen (innerhalb 30T Zahlungsziel)';

                let stageBadgeText = 'Offen (innerhalb Frist)';
                let stageBg = '#fef3c7';
                let stageColor = '#b45309';

                if (ds?.hasSepaMandate) {
                  stageBadgeText = 'SEPA-Einzug (Kein Verzug)';
                  stageBg = '#ecfdf5';
                  stageColor = '#047857';
                } else if (ds?.isSecretaryReadOnly) {
                  if (ds.isTrustExtended) {
                    stageBadgeText = ds.isKulanzActive
                      ? 'Stufe 3 (Entsperrt durch +30T Kulanzjoker)'
                      : `Stufe 3 (Entsperrt durch 48h-Trust-Pass: ${ds.trustRemainingHours}h)`;
                    stageBg = '#ecfdf5';
                    stageColor = '#047857';
                  } else {
                    stageBadgeText = 'Stufe 3 (Schreibschutz aktiv)';
                    stageBg = '#fee2e2';
                    stageColor = '#b91c1c';
                  }
                } else if (ds?.isDelinquent || diffDays > 0) {
                  stageBadgeText = diffDays > 14 ? 'Stufe 2 (1. Mahnung / Kulanzfrist)' : 'Stufe 1 (Zahlungserinnerung)';
                  stageBg = diffDays > 14 ? '#ffedd5' : '#fef3c7';
                  stageColor = diffDays > 14 ? '#c2410c' : '#b45309';
                }

                return (
                  <tr key={inv.schoolId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>
                      <div>{inv.schoolName}</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {ds?.isTrustExtended && !ds?.isKulanzActive && (
                          <span style={{ fontSize: '0.66rem', padding: '2px 6px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Zap size={10} /> 48h-Trust-Pass ({ds.trustRemainingHours}h)
                          </span>
                        )}
                        {ds?.isKulanzActive && (
                          <span style={{ fontSize: '0.66rem', padding: '2px 6px', borderRadius: '6px', background: '#d1fae5', color: '#047857', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Award size={10} /> Kulanzjoker (+30T aktiv)
                          </span>
                        )}
                        {inv.summerMoratoriumActive && (
                          <span style={{ fontSize: '0.66rem', padding: '2px 6px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Sun size={10} /> 42T Ferien-Moratorium
                          </span>
                        )}
                        {ds?.hasSepaMandate && (
                          <span style={{ fontSize: '0.66rem', padding: '2px 6px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={10} /> SEPA-Mandat
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700 }}>
                      <div>{primaryInvId}</div>
                      {overdueList.length > 1 && (
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                          {overdueList.map((o: any) => `${o.id} (${o.amount.toFixed(2).replace('.', ',')} €)`).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: diffDays > 0 ? '#dc2626' : '#d97706', fontWeight: 700 }}>
                      {dueLabel}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'right', color: '#0f172a' }}>
                      <div>{totalPayable.toFixed(2).replace('.', ',')} €</div>
                      {appliedFee > 0 && (
                        <div style={{ fontSize: '0.68rem', color: '#b91c1c', fontWeight: 700 }}>
                          ({baseAmount.toFixed(2).replace('.', ',')} € + {appliedFee.toFixed(2).replace('.', ',')} € Pauschale)
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '0.70rem', padding: '3px 8px', borderRadius: '6px', background: stageBg, color: stageColor, fontWeight: 800 }}>
                        {stageBadgeText}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => onSendDunningEmail({ id: referenceIds, amount: baseAmount, date: overdueList[0]?.due_date }, inv, 1)}
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
                          onClick={() => onSendDunningEmail({ id: referenceIds, amount: baseAmount, date: overdueList[0]?.due_date }, inv, 2)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: '#fffbeb',
                            border: 'none',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#b45309',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <AlertTriangle size={13} /> 1. Mahnung (0,00 € Kulanz)
                        </button>
                        <button
                          type="button"
                          onClick={() => onSendDunningEmail({ id: referenceIds, amount: baseAmount, date: overdueList[0]?.due_date }, inv, 3)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: '#fee2e2',
                            border: 'none',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <AlertCircle size={13} /> 2. Mahnung (+{canonicalFee.toFixed(2).replace('.', ',')} € / Schreibschutz)
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
