import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function StudentBillingInvoicesSection({ studentUser, studentId }: { studentUser: any; studentId?: string }) {
  const isDirectBilled = studentUser?.is_direct_billed;
  const isHardship = studentUser?.is_hardship_exempt;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Status Card */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 850, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            💳 Bereitstellungs- &amp; Abrechnungsstatus
          </span>
          <span style={{
            background: isHardship ? '#fef3c7' : (isDirectBilled ? '#eff6ff' : '#f0fdf4'),
            color: isHardship ? '#92400e' : (isDirectBilled ? '#1e40af' : '#166534'),
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: '100px',
            border: `1px solid ${isHardship ? '#fde68a' : (isDirectBilled ? '#bfdbfe' : '#bbf7d0')}`
          }}>
            {isHardship ? 'Härtefall / Befreit' : (isDirectBilled ? 'Direktabrechnung' : 'Sammelzahler (Musikschule)')}
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.5, fontWeight: 550 }}>
          {isHardship
            ? 'Dieses Schülerprofil ist von der Direktabrechnung befreit. Alle Cloud- & Datenbank-Bereitstellungskosten werden vollständig von deiner Musikschule getragen.'
            : isDirectBilled
            ? 'Die Bereitstellung für das Campus-Modul wird direkt über die hinterlegte Zahlungsart abgerechnet. GrooveLab-Bereitstellungen sind immer vollständig inklusive.'
            : 'Deine Musikschule übernimmt alle Cloud- und Datenbank-Bereitstellungsgebühren für dieses Profil. Für dich fallen 0,00 € Gebühren an.'}
        </p>

        {/* Download Contract Confirmation Button */}
        <div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
              Gesetzliche Vertragsbestätigung (§ 312f Abs. 2 BGB)
            </div>
            <div style={{ fontSize: '0.70rem', color: '#64748b' }}>
              2-seitiges Dokument mit Bereitstellungsnachweis, GoBD-Siegel &amp; gesetzlicher Widerrufsbelehrung.
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              const { generateB2CParentContractPDF } = await import('../../utils/pdfGenerator');
              const studentName = `${studentUser?.first_name || 'Schüler'} ${(studentUser?.last_name ? studentUser.last_name.slice(0, 1) + '.' : '')}`.trim();
              generateB2CParentContractPDF({
                studentName,
                studentId: studentId || studentUser?.id || 'schueler',
                schoolName: studentUser?.school_name || 'Musikschule',
                isDirectBilled: isDirectBilled,
                isHardship: isHardship
              });
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: '#ffffff',
              color: '#0f172a',
              border: '1.5px solid #cbd5e1',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.15s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0f172a'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
            title="Offizielle Vertragsbestätigung und Widerrufsbelehrung herunterladen"
          >
            <ShieldCheck size={14} color="#15803d" />
            <span>Vertragsbeleg (PDF) herunterladen</span>
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <ShieldCheck size={20} color="#15803d" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
          <strong style={{ color: '#0f172a' }}>Keine Lizenzkaufgebühren (0,00 €):</strong> Campus-Groovelab wird ohne Software-Lizenzkaufgebühren bereitgestellt. Es fallen ausschließlich transparente Cloud-Hosting- und Bereitstellungsgebühren an.
        </div>
      </div>
    </div>
  );
}
