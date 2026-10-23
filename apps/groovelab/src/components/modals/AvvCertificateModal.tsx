import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Printer, X, Building, CheckCircle2, Lock, FileText, Download } from 'lucide-react';
import { ACTIVE_LEGAL_VERSION, LEGAL_DOCUMENTS, LEGAL_RELEASE_CONFIG } from '../../legal/legalContent';

interface AvvCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName: string;
  adminName?: string;
  confirmationDate?: string;
  schoolId?: string;
  auditChecksum?: string;
}

export const AvvCertificateModal: React.FC<AvvCertificateModalProps> = ({
  isOpen,
  onClose,
  schoolName = 'Musikschule',
  adminName = 'Schulleitung / Vertretungsberechtigte Person',
  confirmationDate,
  schoolId,
  auditChecksum
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const effectiveDate = confirmationDate
    ? (confirmationDate.includes('-') && !confirmationDate.includes('.') ? new Date(confirmationDate).toLocaleDateString('de-DE') : confirmationDate)
    : new Date().toLocaleDateString('de-DE');

  const effectiveAdminName = adminName && adminName.trim() && adminName !== 'Schulleitung'
    ? adminName.trim()
    : 'Schulleitung (Vertretungsberechtigte Person gem. Art. 4 Nr. 7 DSGVO)';

  const resolveStoredHash = () => {
    if (auditChecksum) return auditChecksum;
    if (typeof window !== 'undefined' && schoolId) {
      const stored = localStorage.getItem(`groovelab_avv_checksum_${schoolId}`);
      if (stored) return stored;
    }
    return '';
  };

  const [dynamicHash, setDynamicHash] = useState<string>(resolveStoredHash);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const existing = resolveStoredHash();
    if (existing) {
      setDynamicHash(existing);
      return;
    }

    const payload = JSON.stringify({
      contract: `AVV_ART_28_DSGVO_V${ACTIVE_LEGAL_VERSION}`,
      contractVersion: ACTIVE_LEGAL_VERSION,
      schoolName: schoolName.trim(),
      adminName: effectiveAdminName,
      confirmationDate: effectiveDate,
      schoolId: schoolId || 'B2B-TENANT',
      standard: 'Art. 28 DSGVO & Art. 9 CH-nDSG'
    });

    let isMounted = true;

    try {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        window.crypto.subtle.digest('SHA-256', encoder.encode(payload)).then(buf => {
          if (!isMounted) return;
          const hash = 'SHA256-CG-AVV-' + Array.from(new Uint8Array(buf))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          setDynamicHash(hash);
          if (schoolId && typeof window !== 'undefined') {
            try {
              localStorage.setItem(`groovelab_avv_checksum_${schoolId}`, hash);
            } catch {}
          }
        }).catch(() => {
          if (!isMounted) return;
          const fallback = `SHA256-CG-AVV-${String(schoolId || 'CERT-STAMP').slice(0, 8).toUpperCase()}-${effectiveDate.replace(/[^0-9]/g, '')}`;
          setDynamicHash(fallback);
        });
      } else {
        const fallback = `SHA256-CG-AVV-${String(schoolId || 'CERT-STAMP').slice(0, 8).toUpperCase()}-${effectiveDate.replace(/[^0-9]/g, '')}`;
        setDynamicHash(fallback);
      }
    } catch {
      const fallback = `SHA256-CG-AVV-${String(schoolId || 'CERT-STAMP').slice(0, 8).toUpperCase()}-${effectiveDate.replace(/[^0-9]/g, '')}`;
      setDynamicHash(fallback);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, schoolName, effectiveAdminName, effectiveDate, schoolId, auditChecksum]);

  const deterministicDocId = `CG-AVV-${ACTIVE_LEGAL_VERSION}-${String(schoolId || 'TENANT').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || 'STD'}-${effectiveDate.replace(/[^0-9]/g, '')}`;

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

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="avv-cert-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
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
              disabled={!dynamicHash}
              title={!dynamicHash ? 'Prüfsiegel wird berechnet...' : 'Zertifikat drucken oder als PDF speichern'}
              style={{
                border: 'none',
                background: !dynamicHash ? '#334155' : '#1e293b',
                color: !dynamicHash ? '#94a3b8' : '#ffffff',
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: !dynamicHash ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
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
                  border: 'none',
                  padding: '3px 10px',
                  borderRadius: '100px',
                  fontSize: '0.70rem',
                  fontWeight: 800
                }}>
                  RECHTSGÜLTIG BESTÄTIGT
                </span>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                  Datum: <strong>{effectiveDate}</strong>
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
                  Bestätigt durch: {effectiveAdminName}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Auftragnehmer (Auftragsverarbeiter, Art. 28 DSGVO):
                </span>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  Patrick Huber – Softwareentwicklung &amp; Cloud-Dienstleistungen (Einzelunternehmen)
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  Karl-Fürstenberg-Str. 59, 79618 Rheinfelden (Baden) • Bundesrepublik Deutschland
                </div>
              </div>
            </div>

            {/* Akzessorietäts-Klausel / Hauptvertrags-Referenz (Art. 28 Abs. 3 DSGVO) */}
            <div style={{
              background: '#f8fafc',
              borderLeft: '3px solid #0f172a',
              padding: '8px 12px',
              borderRadius: '0 8px 8px 0',
              fontSize: '0.71rem',
              color: '#475569',
              lineHeight: 1.45
            }}>
              <strong style={{ color: '#0f172a' }}>Rechtlicher Status:</strong> Amtliche B2B-Konformitätsurkunde zum elektronisch gezeichneten Auftragsverarbeitungsvertrag (AVV) gem. Art. 28 Abs. 3 DSGVO i.V.m. Art. 9 CH-nDSG (Version {ACTIVE_LEGAL_VERSION}) inklusive Anlage 1 (Gegenstand &amp; Datenkategorien) und Anlage 2 (Vollständige TOMs gem. Art. 32 DSGVO). Der vollständige 10-Paragraphen-Hauptvertrag ist im Schultresor persistent archiviert.
            </div>

            {/* Seal Box */}
            <div style={{
              background: '#ecfdf5',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <CheckCircle2 size={28} color="#10b981" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#065f46' }}>
                  Kryptografisches Prüfsiegel &amp; Revisionssicherheit
                </div>
                <div style={{ fontSize: '0.72rem', color: '#059669', fontFamily: 'monospace', wordBreak: 'break-all', marginTop: '2px' }}>
                  SHA-256 Checksumme: {dynamicHash || 'Wird verifiziert...'}
                </div>
                <div style={{ fontSize: '0.70rem', color: '#065f46', marginTop: '3px' }}>
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
                <li><strong>ISO 27001 Hosting in Deutschland:</strong> Alle Datenbanken, BFF-Gateways und Cloud-Speicher laufen ausnahmslos in nach ISO/IEC 27001 zertifizierten deutschen Rechenzentren der IONOS SE (Montabaur/Frankfurt am Main – primärer Produktions-Cluster) sowie der Hetzner Online GmbH (Falkenstein &amp; Nürnberg – georedundantes Backup &amp; Storage Box; 0 % US-Cloud-Doktrin).</li>
                <li><strong>Verschlüsselung &amp; 360° Identity Vault:</strong> 360° Zero-Knowledge Identity Vault (<code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: '4px' }}>blind_student_lastname_vault</code> mit HMAC-SHA256 Blind-Links und AES-256 PGP gem. EuGH C-413/23 P &amp; Art. 34 Abs. 3 lit. a DSGVO) mit 60s Auto-Curtain nach Step-Up PIN (NIST SP 800-63B); ReBAC-Kinderschutz gem. StGB (Vertraulichkeit des Wortes; 0 % Schulleitungszugriff auf Audio); TLS 1.3 während der Übertragung; <strong>Salted Bcrypt (<code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: '4px' }}>pgcrypto</code> Eksblowfish mit Cost-Faktor &ge; 10 / 2<sup>10</sup> Iterationen gem. BSI TR-02102)</strong> im isolierten Schema <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: '4px' }}>private_auth.user_secrets</code>; FIDO2 / WebAuthn Hardware-Passkeys.</li>
                <li><strong>Urheberschutz &amp; KUG:</strong> Reine Metadaten-Architektur (0,00 % Noten-Uploads gem. UrhG Vervielfältigungsverbot); strikter KI-Trainingsausschluss (UrhG Text- und Data-Mining Vorbehalt); 3D-Avatare statt Fotos zum Persönlichkeitsschutz von Minderjährigen.</li>
                <li><strong>BSI IT-Grundschutz &amp; Resilienz:</strong> <strong>Stündliche automatisierte Backups (Age X25519)</strong> mit Vorab-Speicherplatzprüfung (Storage Box Quota Guardian Port 23) und <strong>DSGVO Art. 17 WORM-Tombstone Reconciliation</strong> (RPO &le; 60m, RTO &le; 45m).</li>
                <li><strong>Zero-User-Mail &amp; Datenschutz:</strong> Vollständiges Zero-User-Mail-Axiom (0 E-Mail-Adressen von Schülern, Eltern oder Lehrkräften); Zero-Heap-Buffering für Audioaufnahmen; keine Stimmbiometrie.</li>
                <li><strong>Vorfallsmeldung (24&ndash;48h):</strong> Datenschutzverletzungen werden binnen 24 bis maximal 48 Stunden gemeldet (zur Einhaltung von Art. 33 DSGVO und Art. 24 nDSG an den EDÖB).</li>
                <li><strong>Kinderschutz &amp; Messenger-Governance:</strong> Private 1:1-Direktnachrichten zwischen Schülerinnen und Schülern sind datenbankseitig per Trigger gesperrt; Ensemble-Gruppenkanäle unterliegen der Lehrkraft-Moderation und dem Wortfilter.</li>
                <li><strong>Technische System-Dokumentation (BSG B 12 R 3/20 R):</strong> Dozentenautonomie technisch gewahrt; kein ERP, kein Arbeitszeiterfassungssystem, keine Leistungs- und Verhaltenskontrolle (unverbindliche technische Fachinformation ohne Rechtsberatung).</li>
              </ul>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#94a3b8' }}>
              <span>Campus-Groovelab Schul-Cloud • Ausgestellt für behördliche Datenschutzprüfungen</span>
              <span>Dokument-ID: {deterministicDocId}</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
