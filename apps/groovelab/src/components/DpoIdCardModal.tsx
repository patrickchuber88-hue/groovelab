import React from 'react';
import { X, Printer, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import QRCode from 'react-qr-code';

interface DpoIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName?: string;
  schoolId?: string;
}

export function DpoIdCardModal({ isOpen, onClose, schoolName = 'Stadtmusikschule Bad Säckingen', schoolId = '104' }: DpoIdCardModalProps) {
  if (!isOpen) return null;

  const dpoPin = '8492';
  
  // Format short, clean Ausweis ID for display
  const shortSchoolId = schoolId.length > 8 ? schoolId.substring(0, 8).toUpperCase() : schoolId;
  const ausweisId = `DSB-${shortSchoolId}-2026`;
  const qrData = `CG-DSB-AUDIT-${schoolId}-PIN-${dpoPin}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* FAIL-PROOF REACT PRINT STYLES */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          /* Force exact print color rendering for Safari and Chrome */
          html, body, * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide app elements outside the modal */
          header, nav, aside, footer, .tour-step-backdrop {
            display: none !important;
          }

          /* Convert modal overlay to clean white paper canvas */
          .dsb-modal-backdrop {
            position: absolute !important;
            inset: 0 !important;
            background: #ffffff !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: center !important;
            padding: 0 !important;
            z-index: 999999 !important;
          }

          /* Reset modal box container */
          .dsb-modal-box {
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide UI controls and screen headers */
          .no-print {
            display: none !important;
          }

          /* Center and format the DSB Titanium Card for A4 Print */
          .dsb-card-printable-area {
            margin: 30px auto !important;
            max-width: 520px !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            box-shadow: none !important;
            border: 2px solid #0f172a !important;
          }

          /* Print-only Header Banner */
          .dsb-print-header {
            display: block !important;
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #0f172a;
          }

          /* Print-only Footer Instructions */
          .dsb-print-instructions {
            display: block !important;
            margin-top: 30px;
            padding: 16px 20px;
            background: #f8fafc !important;
            border: 1.5px solid #cbd5e1 !important;
            border-radius: 16px;
          }
        }

        @media screen {
          .dsb-print-header,
          .dsb-print-instructions {
            display: none !important;
          }
        }
      `}</style>

      {/* ─── MODAL OVERLAY BACKDROP ─── */}
      <div
        className="dsb-modal-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.70)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={onClose}
      >
        <div
          className="dsb-modal-box"
          style={{
            background: '#ffffff',
            borderRadius: '32px',
            maxWidth: '560px',
            width: '100%',
            boxShadow: '0 30px 80px -12px rgba(15, 23, 42, 0.35)',
            overflow: 'hidden',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={e => e.stopPropagation()}
        >
          
          {/* SCREEN HEADER (Hidden when printing) */}
          <div
            className="no-print"
            style={{
              padding: '24px 28px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #e6f4ea 0%, #ffffff 100%)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: '#34a853',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(52, 168, 83, 0.25)'
              }}>
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  🪪 DSB-Prüfausweis (Art. 38 DSGVO)
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  E-Mail-Freier Prüf-Zugang für den städtischen DSB
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
            >
              <X size={20} />
            </button>
          </div>

          {/* PRINT-ONLY HEADER BANNER (Shown ONLY when printing) */}
          <div className="dsb-print-header">
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              CAMPUS-GROOVELAB • SYSTEMZERTIFIKAT
            </span>
            <h1 style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
              Offizieller Städtischer DSB-Prüfausweis
            </h1>
            <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
              Rechtsgrundlage: Art. 38 Abs. 2 DSGVO – Schreibgeschütztes Prüfcockpit
            </span>
          </div>

          {/* MODAL BODY */}
          <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px', background: '#fafbfc' }}>
            
            {/* SCREEN DESCRIPTION (Hidden when printing) */}
            <p className="no-print" style={{ margin: 0, fontSize: '0.82rem', color: '#475569', fontWeight: 600, lineHeight: 1.55 }}>
              Dieser Ausweis gewährt dem städtischen Datenschutzbeauftragten (DSB) einen <strong>schreibgeschützten Read-Only Prüfzugriff (Art. 38 Abs. 2 DSGVO)</strong> auf die WORM Audit-Logs, AVV-Verträge und Betroffenenrechte der Musikschule – zu 100% papierlos & ohne E-Mail-Erfassung.
            </p>

            {/* THE APPLE TITANIUM DSB CARD (PRINT TARGET) */}
            <div
              className="dsb-card-printable-area"
              style={{
                background: 'linear-gradient(145deg, #090d16 0%, #111827 50%, #1e293b 100%)',
                borderRadius: '24px',
                padding: '24px',
                color: '#ffffff',
                boxShadow: '0 20px 40px rgba(15, 23, 42, 0.28), 0 2px 6px rgba(0, 0, 0, 0.1)',
                border: '1.5px solid rgba(255, 255, 255, 0.14)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Card Top Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.64rem', fontWeight: 900, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
                    CAMPUS-GROOVELAB DATENSCHUTZ-PORTAL
                  </span>
                  <h4 style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em' }}>
                    Städtischer DSB-Prüfausweis
                  </h4>
                </div>
                <span style={{
                  background: 'rgba(52, 168, 83, 0.2)',
                  color: '#4ade80',
                  border: '1px solid rgba(74, 222, 128, 0.35)',
                  padding: '4px 12px',
                  borderRadius: '100px',
                  fontSize: '0.66rem',
                  fontWeight: 900,
                  letterSpacing: '0.04em'
                }}>
                  ART. 38 DSGVO
                </span>
              </div>

              {/* Card Center (Vector QR Code + Data Columns) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {/* VECTOR QR CODE CONTAINER */}
                <div style={{
                  background: '#ffffff',
                  padding: '10px',
                  borderRadius: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                  flexShrink: 0
                }}>
                  <QRCode value={qrData} size={88} level="M" />
                  <span style={{ fontSize: '0.58rem', color: '#0f172a', fontWeight: 850, marginTop: '6px', letterSpacing: '0.06em' }}>
                    SCAN QR LOG-IN
                  </span>
                </div>

                {/* Data Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
                  <div>
                    <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>EINRICHTUNG</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>{schoolName}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div>
                      <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>AUSWEIS-ID</span>
                      <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'SFMono-Regular, Menlo, monospace' }}>
                        {ausweisId}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>PRÜF-PIN</span>
                      <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#4ade80', fontFamily: 'SFMono-Regular, Menlo, monospace', letterSpacing: '0.1em' }}>
                        {dpoPin}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>BERECHTIGUNG</span>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Lock size={13} color="#4ade80" /> Strikter Read-Only Audit-Zugriff
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600 }}>
                  100% Zero-Kid-PII • Keine E-Mail-Erfassung
                </span>
                <span style={{ fontSize: '0.66rem', color: '#4ade80', fontWeight: 800 }}>
                  ✓ Gültig Schuljahr 2026/27
                </span>
              </div>
            </div>

            {/* PRINT-ONLY INSTRUCTIONS (Shown ONLY when printing) */}
            <div className="dsb-print-instructions">
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>
                📋 Anleitung für den städtischen Datenschutzbeauftragten (DSB):
              </h3>
              <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#334155', lineHeight: 1.5, fontWeight: 600 }}>
                <li>Öffne das Anmeldefenster von <strong>Campus-Groovelab</strong> auf deinem Dienst-iPad oder PC.</li>
                <li>Scanne den obenstehenden QR-Code mit der Kamera oder gib die PIN <strong>{dpoPin}</strong> im PIN-Feld ein.</li>
                <li>Das System öffnet sofort das <strong>schreibgeschützte DSB Audit-Portal</strong> (WORM Logs, AVV & TOMs).</li>
              </ol>
            </div>

            {/* SCREEN INSTRUCTION BANNER (Hidden when printing) */}
            <div
              className="no-print"
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '20px',
                padding: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)'
              }}
            >
              <CheckCircle2 size={22} color="#34a853" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 650, lineHeight: 1.45 }}>
                Der DSB kann diesen Ausweis mit der iPad-Kamera am Anmeldebildschirm scanne oder die PIN <strong>{dpoPin}</strong> eingeben, um sich direkt im Audit-Portal anzumelden.
              </span>
            </div>
          </div>

          {/* SCREEN FOOTER ACTIONS (Hidden when printing) */}
          <div
            className="no-print"
            style={{
              padding: '20px 28px',
              borderTop: '1px solid #f1f5f9',
              background: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Schließen
            </button>
            
            <button
              onClick={handlePrint}
              style={{
                background: '#34a853',
                color: '#ffffff',
                border: 'none',
                borderRadius: '100px',
                fontWeight: 800,
                fontSize: '0.85rem',
                padding: '12px 24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(52, 168, 83, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Printer size={18} /> Ausweis drucken / PDF
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
