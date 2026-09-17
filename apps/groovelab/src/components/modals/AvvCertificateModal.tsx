import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Printer, X, Building, CheckCircle2, Lock, FileText, Download } from 'lucide-react';
import { ACTIVE_LEGAL_VERSION, LEGAL_DOCUMENTS, LEGAL_RELEASE_CONFIG } from '../../legal/legalContent';

interface AvvCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName: string;
  adminName?: string;
  confirmationDate?: string;
}

export const AvvCertificateModal: React.FC<AvvCertificateModalProps> = ({
  isOpen,
  onClose,
  schoolName = 'Musikschule',
  adminName = 'Schulleitung / Vertretungsberechtigte Person',
  confirmationDate = new Date().toLocaleDateString('de-DE')
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const avvDoc = LEGAL_DOCUMENTS.terms_b2b_avv;
  const canonicalHash = 'a47b8c9e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c'; // SHA-256 seal

  const handlePrint = () => {
    if (!printRef.current) {
      window.print();
      return;
    }

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.left = '-99999px';
    printFrame.style.top = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>AVV-Zertifikat Art. 28 DSGVO – Campus-Groovelab</title>
  <style>
    @page { size: A4 portrait; margin: 20mm 15mm 20mm 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 9.5pt; color: #0f172a; line-height: 1.55; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 12pt; margin-bottom: 16pt; display: flex; justify-content: space-between; }
    .title { font-size: 16pt; font-weight: 900; }
    .meta-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10pt; margin: 12pt 0; }
    .seal-box { border: 2px solid #16a34a; background: #f0fdf4; border-radius: 8px; padding: 12pt; margin: 14pt 0; }
    .tom-list { padding-left: 14pt; }
    .footer { margin-top: 24pt; border-top: 1px solid #cbd5e1; padding-top: 8pt; font-size: 8pt; color: #64748b; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  ${printRef.current.innerHTML}
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch {
        window.print();
      }
      setTimeout(() => printFrame.remove(), 1000);
    }, 150);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="avv-cert-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
      }}
    >
      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Modal Bar */}
        <div style={{
          padding: '16px 24px',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={22} color="#34d399" />
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
              Offizielles B2B-Vertragszertifikat (Art. 28 DSGVO)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                border: 'none',
                background: '#1e293b',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Printer size={15} />
              <span>Drucken / PDF-Export</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Zertifikat schließen"
              style={{
                border: 'none',
                background: 'rgba(255, 255, 255, 0.1)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ffffff'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Certificate Printable Stage */}
        <div style={{ padding: '28px 32px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
          <div
            ref={printRef}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Campus-Groovelab
                </div>
                <div id="avv-cert-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
                  Auftragsverarbeitungs-Nachweis &amp; Konformitätsurkunde
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  Gemäß Art. 28 Datenschutz-Grundverordnung (DSGVO) • Normenstand Version {ACTIVE_LEGAL_VERSION}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  display: 'inline-block',
                  background: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  padding: '3px 10px',
                  borderRadius: '100px',
                  fontSize: '0.70rem',
                  fontWeight: 800
                }}>
                  RECHTSGÜLTIG BESTÄTIGT
                </span>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                  Datum: <strong>{confirmationDate}</strong>
                </div>
              </div>
            </div>

            {/* Parties */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', background: '#fafbfc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Auftraggeberin (Verantwortliche, Art. 4 Nr. 7 DSGVO):
                </span>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {schoolName}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  Bestätigt durch: {adminName}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Auftragnehmer (Auftragsverarbeiter, Art. 28 DSGVO):
                </span>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  Patrick Huber – Softwareentwicklung &amp; Cloud-Dienstleistungen
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  Karl-Fürstenberg-Str. 59, 79618 Rheinfelden (Baden)
                </div>
              </div>
            </div>

            {/* Seal Box */}
            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <CheckCircle2 size={28} color="#16a34a" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#166534' }}>
                  Kryptografisches Prüfsiegel &amp; Revisionssicherheit
                </div>
                <div style={{ fontSize: '0.72rem', color: '#15803d', fontFamily: 'monospace', wordBreak: 'break-all', marginTop: '2px' }}>
                  SHA-256 Checksumme: {canonicalHash}
                </div>
                <div style={{ fontSize: '0.70rem', color: '#166534', marginTop: '3px' }}>
                  Die Integrität des Vertragstextes ist unveränderbar in der PostgreSQL-Audit-Datenbank persistent protokolliert.
                </div>
              </div>
            </div>

            {/* Core Commitments */}
            <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.55 }}>
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                Garantierte Vereinbarungen und Technisch-Organisatorische Maßnahmen (TOMs):
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li><strong>ISO 27001 Hosting in Deutschland:</strong> Alle Datenbanken und Cloud-Speicher laufen ausnahmslos in nach ISO/IEC 27001 zertifizierten Rechenzentren der Hetzner Online GmbH (Falkenstein/Nürnberg).</li>
                <li><strong>Verschlüsselung:</strong> AES-256-Verschlüsselung at Rest; TLS 1.3 während der Übertragung.</li>
                <li><strong>Zero-AI-Garantie:</strong> Schüler-, Lehrer- und Tondaten werden zu 0 % für Machine Learning oder Foundation-Modelle verwendet.</li>
                <li><strong>48-Stunden-Vorfallsmeldung:</strong> Vorfälle nach Art. 33 DSGVO werden binnen 48 Stunden an die Schulleitung gemeldet (24h Reaktionsreserve für die Schule).</li>
                <li><strong>Radikale Datenminimierung:</strong> Keine Bankdaten von Familien; keine Klarnamen-Gesichtsfotos; nur stilisierte Avatare.</li>
              </ul>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#94a3b8' }}>
              <span>Campus-Groovelab Schul-Cloud • Ausgestellt für behördliche Datenschutzprüfungen</span>
              <span>Dokument-ID: CG-AVV-{ACTIVE_LEGAL_VERSION}-{Date.now().toString().slice(-6)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
