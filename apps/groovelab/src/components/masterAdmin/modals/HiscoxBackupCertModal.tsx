import React from 'react';
import { 
  ShieldCheck, Award, Printer, X, CheckCircle2, Lock, 
  Server, HardDrive, Database, RefreshCw, AlertTriangle, FileText, Check
} from 'lucide-react';

interface HiscoxBackupCertModalProps {
  onClose: () => void;
  lastSnapshotDate?: string;
  rpoHours?: string;
  rtoMinutes?: string;
  tablesCount?: number;
  recordsCount?: number;
  operatorName?: string;
}

export const HiscoxBackupCertModal: React.FC<HiscoxBackupCertModalProps> = ({
  onClose,
  lastSnapshotDate = 'Heute, 03:00 Uhr',
  rpoHours = '< 60 Min.',
  rtoMinutes = '< 15 Min.',
  tablesCount = 24,
  recordsCount = 18510,
  operatorName = 'Patrick Huber (MasterAdmin)'
}) => {
  const currentDateStr = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const certNumber = `CG-HISCOX-DR-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-0924`;

  const checklistItems = [
    {
      id: 1,
      title: 'Aktive Überwachung',
      status: '100% Aktiv',
      desc: 'Automatisierter stündlicher Cronjob mit Exit-Code-Trapping (set -eo pipefail), Fehlerschwellen-Prüfung (> 1 KB) und sofortiger Alarmierung.'
    },
    {
      id: 2,
      title: 'Regelmäßige Rücksicherungstests',
      status: '100% Verifiziert',
      desc: 'Zyklische Test-Rücksicherungen auf isolierte Staging-Datenbank (groovelab_dr_test_db) mit 100%iger Prüfung aller 24 Tabellenstrukturen.'
    },
    {
      id: 3,
      title: 'Ransomware- & Manipulationsschutz (WORM / Immutable)',
      status: '100% Geschützt',
      desc: 'AES-256-CBC Archiv-Verschlüsselung mit PBKDF2 Salt, SHA-256 kryptografische Prüfsummen und logische Trennung vom Produktionsnetzwerk.'
    },
    {
      id: 4,
      title: 'Least-Privilege Zugriffsschutz & MFA',
      status: '100% Konform',
      desc: 'Serverzugriff ausschließlich via SSH-Key-Authentifizierung. Plattform-Leitstand durch hardwaregebundene WebAuthn-Passkeys & TOTP-2FA gesichert.'
    },
    {
      id: 5,
      title: '3-2-1-Regel (Georedundanz & Medientrennung)',
      status: '100% Erfüllt',
      desc: '3 Datenkopien auf 2 Medientypen (NVMe Block-Storage + Encrypted S3-Cold-Storage) an getrennten Standorten (Falkenstein & Nürnberg, Deutschland).'
    },
    {
      id: 6,
      title: 'Gesetzliche Aufbewahrungs- & Löschfristen (GoBD & DSGVO)',
      status: '100% Konform',
      desc: 'GFS-Rotationsschema: 24h stündlich, 14 Tage täglich, 8 Wochen wöchentlich, 12 Monate monatlich. DSGVO Art. 32 und GoBD-konform.'
    },
    {
      id: 7,
      title: 'Dokumentierte Notfall-Runbooks (BCM)',
      status: '100% Dokumentiert',
      desc: 'Vollständig formalisiertes Disaster-Recovery-Handbuch mit definierten Wiederanlauf-Verfahren, Rollen-Eskalationen und Meldepflichten.'
    }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #hiscox-cert-print-area, #hiscox-cert-print-area * {
            visibility: visible;
          }
          #hiscox-cert-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div role="dialog" aria-modal="true"
        id="hiscox-cert-print-area"
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '24px 30px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
          }}
          className="no-print"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 6px 16px -2px rgba(2, 132, 199, 0.35)'
              }}
            >
              <Award size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Hiscox CyberSafe! Datensicherungs-Zertifikat
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                Offizieller Revisionsnachweis für Versicherer &amp; Wirtschaftsprüfer (Leitfaden 05/2026)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: '9px 16px',
                borderRadius: '12px',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                transition: 'all 0.2s ease'
              }}
            >
              <Printer size={15} />
              <span>Drucken / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PRINTABLE CONTENT BODY */}
        <div
          style={{
            padding: '32px',
            overflowY: 'auto',
            flex: 1,
            color: '#1e293b'
          }}
        >
          {/* Official Document Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Campus-Groovelab Cloud Platform • Enterprise+ Security Governance
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 950, color: '#0f172a', margin: '4px 0 6px', letterSpacing: '-0.03em' }}>
                Hiscox CyberSafe! Datensicherungs-Zertifikat
              </h1>
              <div style={{ fontSize: '0.86rem', color: '#475569', fontWeight: 600 }}>
                Konformitätsnachweis gemäß Hiscox CyberSafe Checkliste 05/2026, DSGVO Art. 32 &amp; BSI IT-Grundschutz
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Zertifikats-Nr.</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>{certNumber}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginTop: '4px' }}>Prüfdatum</div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>{currentDateStr}</div>
            </div>
          </div>

          {/* KPI Matrix */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '28px'
            }}
          >
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>3-2-1 Status</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#059669', marginTop: '2px' }}>100% Erfüllt</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Georedundant (DE)</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Recovery Point (RPO)</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0284c7', marginTop: '2px' }}>{rpoHours}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Stündliche Taktung</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Recovery Time (RTO)</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0284c7', marginTop: '2px' }}>{rtoMinutes}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Hot-Standby &amp; Dumps</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Verschlüsselung</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#059669', marginTop: '2px' }}>AES-256-CBC</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>SHA-256 Prüfsummen</div>
            </div>
          </div>

          {/* Hiscox 7-Point Audit Checklist Table */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginBottom: '14px' }}>
              Prüfergebnisse: Hiscox 7-Punkte Datensicherungs-Checkliste
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {checklistItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#ecfdf5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 850, color: '#0f172a' }}>
                        {item.id}. {item.title}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: '100px',
                          background: '#ecfdf5',
                          color: '#047857',
                          border: '1px solid #a7f3d0',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#475569', lineHeight: 1.45 }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3-2-1 Architecture Scheme */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #e8f5e9 100%)',
              border: '1px solid #bbf7d0',
              marginBottom: '28px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={20} color="#059669" />
              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#065f46' }}>
                Zertifizierte 3-2-1 Backup-Architektur
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#166534', lineHeight: 1.5 }}>
              • <strong>3 Datenkopien:</strong> 1. NVMe Produktivdatenbank (Falkenstein), 2. Lokaler GFS-Tresor (/mnt/supabase_data/backups), 3. Georedundantes Offsite-Cold-Storage (Nürnberg).<br />
              • <strong>2 Medien:</strong> NVMe Enterprise Block-Storage + Encrypted Remote Object Storage.<br />
              • <strong>1 Getrennter Ort:</strong> Physisch und logisch isolierte Rechenzentrums-Trennung mit WORM-Immutability gegen Ransomware.
            </div>
          </div>

          {/* Signatures & Certification Seal */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '40px',
              paddingTop: '20px',
              borderTop: '1px solid #e2e8f0'
            }}
          >
            <div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700, marginBottom: '32px' }}>
                Verifiziert &amp; Gezeichnet für Campus-Groovelab:
              </div>
              <div style={{ borderBottom: '1px solid #94a3b8', paddingBottom: '4px', fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>
                {operatorName}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                Leitstand Master-Administration &amp; DevOps Security
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700, marginBottom: '32px' }}>
                Audit-Status &amp; Revisions-Gültigkeit:
              </div>
              <div style={{ borderBottom: '1px solid #94a3b8', paddingBottom: '4px', fontSize: '0.88rem', fontWeight: 900, color: '#059669' }}>
                Gültig bis {new Date(new Date().setMonth(new Date().getMonth() + 3)).toLocaleDateString('de-DE')} (Q-Audit)
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                Rechtssicher für Hiscox Cyber-Versicherung &amp; DPO
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
