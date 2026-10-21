import React, { useEffect } from 'react';
import { X, Printer, Scissors, QrCode, ShieldCheck } from 'lucide-react';
import { IDBadgeCard } from '../../../IDBadgeCard';
import { resolveUserCampusId } from '../../../../utils/campusIdHelper';

export interface StudentIdCardPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  schoolName?: string;
  activePlatform?: string;
}

export const StudentIdCardPrintModal: React.FC<StudentIdCardPrintModalProps> = ({
  isOpen,
  onClose,
  student,
  schoolName = 'Campus-Groovelab Partner-Musikschule',
  activePlatform = 'campus'
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const studentName = student?.first_name 
    ? `${student.first_name} ${student.last_name || ''}`.trim() 
    : (student?.name || 'Schüler');

  const campusId = resolveUserCampusId(student);
  const formattedDate = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <>
      {/* ─── PRINT CSS ENGINE: FAIL-PROOF DIN A4 LAYOUT ─── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 14mm 16mm;
          }

          /* Force exact print color rendering for Safari, Chrome & Firefox */
          html, body, * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide entire main application, background elements, navigation & tour */
          #root, header, nav, aside, footer, .tour-step-backdrop, .no-print {
            display: none !important;
          }

          /* Transform modal backdrop into clean paper canvas */
          .student-id-print-backdrop {
            position: absolute !important;
            inset: 0 !important;
            background: #ffffff !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            display: block !important;
            padding: 0 !important;
            z-index: 999999 !important;
            overflow: visible !important;
          }

          .student-id-screen-container {
            display: none !important;
          }

          .student-id-print-sheet {
            display: block !important;
            width: 100% !important;
            max-width: 180mm !important;
            margin: 0 auto !important;
            color: #0f172a !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          }
        }

        @media screen {
          .student-id-print-sheet {
            display: none !important;
          }
        }
      `}</style>

      {/* ─── BACKDROP & DIALOG SHELL ─── */}
      <div
        className="student-id-print-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label={`Schülerausweis für ${studentName}`}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 11000,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        {/* ─── 1. SCREEN VIEW CONTAINER (INTERACTIVE) ─── */}
        <div
          className="student-id-screen-container"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '24px 28px',
            maxWidth: '420px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            position: 'relative',
            boxSizing: 'border-box'
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px'
            }}
          >
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>
                Schülerausweis &amp; Campus-Pass
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                ID: {campusId || '001-1-0001'} • Druckfertiges CR80-Format
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Ausweis-Ansicht schließen"
              style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Visual ID Card Preview */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
            <IDBadgeCard
              user={student}
              activePlatform={activePlatform}
              schoolName={schoolName}
              isPrintVersion={false}
            />
          </div>

          {/* Action Button Panel (Apple HIG konform) */}
          <div
            style={{
              marginTop: '22px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {/* Primärer Druck-Button */}
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Ausweis jetzt drucken oder als PDF speichern"
              style={{
                width: '100%',
                background: '#34a853',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '13px 20px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2d9247';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#34a853';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Printer size={18} />
              <span>Ausweis drucken (A4 / PDF)</span>
            </button>

            {/* Dezent-neutraler Schließen-Button (Apple Secondary) */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Modal schließen"
              style={{
                width: '100%',
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '14px',
                padding: '11px 20px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e2e8f0';
                e.currentTarget.style.color = '#1e293b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#475569';
              }}
            >
              Schließen
            </button>
          </div>
        </div>

        {/* ─── 2. PRINT SHEET CANVAS (A4 DRUCKVORLAGE) ─── */}
        <div className="student-id-print-sheet">
          {/* Kopfzeile mit Schulinformation */}
          <div
            style={{
              borderBottom: '2px solid #0f172a',
              paddingBottom: '14px',
              marginBottom: '26px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end'
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#64748b'
                }}
              >
                {schoolName}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                Offizieller Campus- &amp; GrooveLab-Ausweis
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                Schüler-Pass für {studentName} • Schuljahr 2026/2027
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>
                Ausgestellt am: {formattedDate}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                ID: {campusId || '001-1-0001'}
              </div>
            </div>
          </div>

          {/* Mittlerer Bereich: Ausweis im Maßstab 54mm x 86mm mit Schnittmarken */}
          <div
            style={{
              margin: '30px auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                color: '#64748b',
                fontWeight: 700,
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Scissors size={14} />
              <span>Hier entlang der gestrichelten Linie ausschneiden (Standard-Scheckkarten-Format 54 × 86 mm)</span>
            </div>

            {/* Schnittkontur */}
            <div
              style={{
                padding: '6px',
                border: '1.5px dashed #94a3b8',
                borderRadius: '16px',
                display: 'inline-block',
                background: '#ffffff'
              }}
            >
              <IDBadgeCard
                user={student}
                activePlatform={activePlatform}
                schoolName={schoolName}
                isPrintVersion={true}
              />
            </div>
          </div>

          {/* Unterer Bereich: Kurzanleitung für Eltern & Schüler */}
          <div
            style={{
              marginTop: '36px',
              padding: '18px 22px',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '16px'
            }}
          >
            <div
              style={{
                fontSize: '0.88rem',
                fontWeight: 900,
                color: '#0f172a',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <QrCode size={18} color="#34a853" />
              <span>So nutzt du deinen Campus-Pass:</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.76rem', color: '#334155', lineHeight: 1.45 }}>
              <div>
                <strong style={{ color: '#0f172a' }}>1. Sofort-Login per Smartphone:</strong><br />
                Öffnen Sie einfach die Kamera-App auf Ihrem Smartphone und richten Sie sie auf den QR-Code des Ausweises. Sie gelangen direkt in das digitale Campus-Portal Ihres Kindes – ganz ohne Passwort-Eingabe.
              </div>
              <div>
                <strong style={{ color: '#0f172a' }}>2. Im Musikschulunterricht:</strong><br />
                Der Ausweis dient als physischer Schlüssel zum Check-in am Tablet der Lehrkraft und an den GrooveLab-Bandstationen.
              </div>
              <div>
                <strong style={{ color: '#0f172a' }}>3. Notenheft-Tipp:</strong><br />
                Kleben oder legen Sie den Ausweis in das aktuelle Notenheft, damit er zu jeder Unterrichtsstunde griffbereit ist.
              </div>
              <div>
                <strong style={{ color: '#0f172a' }}>4. Datenschutz &amp; Sicherheit:</strong><br />
                Der QR-Code enthält keine Klartext-Passwörter. Souveräne Datenverarbeitung zu 100% in ISO/IEC 27001 zertifizierten deutschen Rechenzentren.
              </div>
            </div>
          </div>

          {/* Footer Fußnote */}
          <div
            style={{
              marginTop: '30px',
              textAlign: 'center',
              fontSize: '0.66rem',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <ShieldCheck size={12} />
            <span>Campus &amp; GrooveLab Bildungsplattform • Souveräne Datenhaltung (DSGVO / OWASP ASVS Level 3) • Zero US-Cloud Doktrin</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentIdCardPrintModal;
