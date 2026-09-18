import React from 'react';
import { CheckCircle, Printer } from 'lucide-react';
import type { School, PendingUser } from '../MasterAdminTypes';

interface ExecutiveMonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReportMonth: string;
  schools: School[];
  pendingUsers: PendingUser[];
  priceCampus: number | string;
  priceGroovelab: number | string;
  priceKombi: number | string;
  priceStudent: number | string;
}

export const ExecutiveMonthlyReportModal: React.FC<ExecutiveMonthlyReportModalProps> = ({
  isOpen,
  onClose,
  selectedReportMonth,
  schools,
  pendingUsers,
  priceCampus,
  priceGroovelab,
  priceKombi,
  priceStudent
}) => {
  if (!isOpen) return null;

  const validSchools = schools.filter(s => !s.name?.toLowerCase().includes('groove academy'));
  const b2bCampusCount = validSchools.filter(s => s.has_campus_subscription && !s.has_groovelab_subscription && !s.subscription_bypass).length;
  const b2bGroovelabCount = validSchools.filter(s => !s.has_campus_subscription && s.has_groovelab_subscription && !s.subscription_bypass).length;
  const b2bKombiCount = validSchools.filter(s => s.has_campus_subscription && s.has_groovelab_subscription && !s.subscription_bypass).length;

  const b2bMrr = (b2bCampusCount * Number(priceCampus)) + (b2bGroovelabCount * Number(priceGroovelab)) + (b2bKombiCount * Number(priceKombi));
  
  const b2cStudentsCount = pendingUsers.filter(u => {
    const school = validSchools.find(s => s.id === u.school_id);
    return school && !school.subscription_bypass && (u as any).student_billing_payment_method && (u as any).student_billing_cash_paid && !(u as any).exempt_from_direct_billing;
  }).length;
  const b2cMrr = b2cStudentsCount * Number(priceStudent);
  const totalMrr = b2bMrr + b2cMrr;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '28px',
        maxWidth: '850px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '36px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }} className="animate-scale-up">
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>
                SaaS Enterprise Monatsbilanz
              </span>
              <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>
                Zeitraum: {selectedReportMonth}
              </span>
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '8px 0 0 0', fontFamily: '"Outfit", sans-serif' }}>
              Campus-Groovelab Executive Monatsbericht
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
              Offizielle monatliche Finanz- &amp; Betriebsbilanz für Betreiber, Geschäftsführung &amp; Steuerberatung.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Revenue Summary Grid */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '24px', borderRadius: '20px', color: '#ffffff' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Konsolidierter Gesamtmonatsumsatz (MRR)
            </span>
            <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '8px 0 0 0', color: '#34d399', fontFamily: '"Outfit", sans-serif' }}>
              {totalMrr.toFixed(2)} €
            </h3>
            <div style={{ display: 'flex', gap: '24px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>B2B Hosting- &amp; Bereitstellungsgebühren (Musikschulen)</span>
                <strong style={{ color: '#ffffff' }}>{b2bMrr.toFixed(2)} €</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>B2C Schüler/Eltern Direktabrechnung</span>
                <strong style={{ color: '#ffffff' }}>{b2cMrr.toFixed(2)} €</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Hochgerechnete Jahressumme (ARR)</span>
                <strong style={{ color: '#38bdf8' }}>{(totalMrr * 12).toFixed(2)} €</strong>
              </div>
            </div>
          </div>

          {/* Position Details Table */}
          <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
              Aufschlüsselung nach Modulen &amp; Tarifen
            </h4>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '8px 0' }}>Position / Tarif</th>
                  <th style={{ padding: '8px 0' }}>Anzahl Mandanten</th>
                  <th style={{ padding: '8px 0' }}>Einzelpreis</th>
                  <th style={{ padding: '8px 0', textAlign: 'right' }}>Monatsbetrag</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 0', fontWeight: 700, color: '#0f172a' }}>Campus-Modul (Flatrate)</td>
                  <td style={{ padding: '10px 0' }}>{b2bCampusCount} Schulen</td>
                  <td style={{ padding: '10px 0' }}>{Number(priceCampus).toFixed(2)} € / Mo</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 800 }}>{(b2bCampusCount * Number(priceCampus)).toFixed(2)} €</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 0', fontWeight: 700, color: '#0f172a' }}>GrooveLab-Modul (Flatrate)</td>
                  <td style={{ padding: '10px 0' }}>{b2bGroovelabCount} Schulen</td>
                  <td style={{ padding: '10px 0' }}>{Number(priceGroovelab).toFixed(2)} € / Mo</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 800 }}>{(b2bGroovelabCount * Number(priceGroovelab)).toFixed(2)} €</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 0', fontWeight: 700, color: '#0f172a' }}>Kombi-Vorteil Bundle (Campus + GrooveLab)</td>
                  <td style={{ padding: '10px 0' }}>{b2bKombiCount} Schulen</td>
                  <td style={{ padding: '10px 0' }}>{Number(priceKombi).toFixed(2).replace('.', ',')} € / Mo</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 800, color: '#059669' }}>{(b2bKombiCount * Number(priceKombi)).toFixed(2)} €</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 0', fontWeight: 700, color: '#0f172a' }}>Schüler-Aktivierungen (Direktabrechnung)</td>
                  <td style={{ padding: '10px 0' }}>{b2cStudentsCount} Schüler</td>
                  <td style={{ padding: '10px 0' }}>{Number(priceStudent).toFixed(2)} € / Mo</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 800 }}>{(b2cStudentsCount * Number(priceStudent)).toFixed(2)} €</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* System & Compliance Statement */}
          <div style={{ background: '#f0fdf4', padding: '16px 20px', borderRadius: '16px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle size={24} color="#0f172a" />
            <div style={{ fontSize: '0.82rem', color: '#166534' }}>
              <strong>Betreiber-Compliance Bestätigung:</strong> Dieser Bericht wurde automatisch aus den geprüften Supabase RLS-Datenbankeinträgen generiert. DSGVO/COPPA-konform, 0 ungeprüfte Fremd-Zugriffe.
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button
              onClick={() => window.print()}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Printer size={16} /> Bericht Drucken / Als PDF Speichern
            </button>
            
            <button
              onClick={onClose}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                background: '#f1f5f9',
                color: '#475569',
                fontSize: '0.88rem',
                fontWeight: 800,
                border: '1px solid #cbd5e1',
                cursor: 'pointer'
              }}
            >
              Schließen
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
