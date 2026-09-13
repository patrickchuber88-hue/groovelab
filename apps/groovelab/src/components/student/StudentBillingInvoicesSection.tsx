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

      {/* 📅 Transparente Schuljahres-Laufzeit (Befristeter Festbeitrag ohne Abo) */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '16px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>📅</span>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 850, color: '#0f172a' }}>
                Befristeter Schuljahres-Zugang (Kein Abo)
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 550 }}>
                Laufzeit endet automatisch zum Ende des laufenden Schuljahres (31. August).
              </div>
            </div>
          </div>
          <span style={{
            background: '#f0fdf4',
            color: '#166534',
            padding: '4px 10px',
            borderRadius: '100px',
            fontSize: '0.72rem',
            fontWeight: 800,
            border: '1px solid #bbf7d0'
          }}>
            Endet automatisch
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
          Es gibt <strong>keine automatische Vertragsverlängerung und keine Kündigungsfristen</strong>. Der Zugang läuft nach Ablauf des Schuljahres automatisch aus. Eine Kündigung ist daher nicht erforderlich.
        </p>

        <div style={{
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          borderRadius: '12px',
          padding: '12px',
          fontSize: '0.74rem',
          color: '#64748b',
          lineHeight: 1.45,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <span>Du ziehst um oder möchtest den Unterricht vorzeitig beenden?</span>
          <a
            href={`mailto:${studentUser?.school_email || 'sekretariat@musikschule.de'}?subject=Abmeldung%20Unterricht%20${encodeURIComponent(studentUser?.first_name || 'Schueler')}`}
            style={{
              color: '#0284c7',
              fontWeight: 800,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            Vorzeitige Abmeldung an das Sekretariat melden →
          </a>
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
