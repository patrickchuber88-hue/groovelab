import React, { useState } from 'react';
import { 
  ShieldAlert, BookOpen, AlertOctagon, CheckCircle2, Play, 
  RotateCcw, X, Server, Database, Lock, RefreshCw, ChevronRight, Activity
} from 'lucide-react';

interface DisasterRecoveryRunbookModalProps {
  onClose: () => void;
  onTriggerDrTest?: () => void;
  isRunningDrTest?: boolean;
}

export const DisasterRecoveryRunbookModal: React.FC<DisasterRecoveryRunbookModalProps> = ({
  onClose,
  onTriggerDrTest,
  isRunningDrTest = false
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      id: 1,
      title: 'Stufe 1: Alarmierung, Triage & Mandanten-Isolation',
      leadTime: '< 2 Min.',
      desc: 'Erkennen eines Integritäts-Zwischenfalls oder Datenverlusts. Unmittelbares Schalten der betroffenen Schule in den schreibgeschützten Wartungsmodus.',
      actions: [
        'Prüfen des Vorfalls im ClientErrorTelemetryPanel & Audit Trail.',
        'Schalten des Wartungsmodus im Master-Admin Cockpit (MaintenanceTab: MaintenanceLockoutOverlay aktivieren).',
        'Sperren kompromittierter Benutzer-Tokens über switch_user_active_role oder Session-Zeroize.'
      ]
    },
    {
      id: 2,
      title: 'Stufe 2: Point-in-Time-Recovery (Datenbank-Wiederherstellung)',
      leadTime: '~ 10-15 Min.',
      desc: 'Wiederherstellung der PostgreSQL-Datenbank aus dem letzten validierten GFS-Snapshot mit automatischer Staging-Prüfung.',
      actions: [
        'Ermitteln des letzten sauberen Snapshots (scripts/backup_supabase_enterprise.sh: HOURLY oder DAILY Dump).',
        'Validieren der kryptografischen Prüfsumme: sha256sum -c backup_*.sql.gz.sha256.',
        'Entschlüsseln und Einspielen in Staging-DB via scripts/verify_backup_restore.sh.',
        'Prüfen der 24 Tabellen-Integritäten (students, kiosks, schedules, billing_invoices).',
        'Atomarer Swap des produktiven PostgreSQL-Clusters.'
      ]
    },
    {
      id: 3,
      title: 'Stufe 3: Audio-Tresor & Objektspeicher-Resynchronisation',
      leadTime: '~ 5-10 Min.',
      desc: 'Abgleich des Hetzner Volume Mounts (/mnt/supabase_data/storage) und Rekonstruktion unvollständiger Audio-Deskriptoren.',
      actions: [
        'Prüfen des Volume Mounts auf dem Server: df -h /mnt/supabase_data.',
        'Verifizieren der Audio-Tresor Hash-Tabellen (recordings, loopstation_tracks, audio_biographies).',
        'Synchronisieren fehlender Blöcke aus dem georedundanten Cold-Storage (scripts/sync_offsite_backup.sh).'
      ]
    },
    {
      id: 4,
      title: 'Stufe 4: Freigabe, Audit-Dokumentation & Meldepflichten',
      leadTime: '< 72 Std.',
      desc: 'Wiederfreigabe der Plattform, Erstellung des forensischen Abschlussberichts und ggf. Information der Cyber-Versicherung (Hiscox) und DPO.',
      actions: [
        'Freigabe der Mandanten-Umgebung: Deaktivieren des Wartungsmodus.',
        'Revisionssichere Protokollierung des Vorfalls in public.audit_logs und cg_master_backup_audit.',
        'Falls personenbezogene Daten kompromittiert wurden: DSGVO Art. 33 Meldung innerhalb von 72 Stunden an die Aufsichtsbehörde.',
        'Meldung des Vorfalls an den Hiscox Krisendienstleister zur Versicherungsregulierung.'
      ]
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
      <div role="dialog" aria-modal="true"
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '22px 28px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 6px 16px -2px rgba(239, 68, 68, 0.35)'
              }}
            >
              <BookOpen size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Disaster Recovery &amp; Notfall-Runbook
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                Verbindlicher Leitfaden für System-Wiederanlauf &amp; Incident-Management (Hiscox CyberSafe)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onTriggerDrTest && (
              <button
                type="button"
                onClick={onTriggerDrTest}
                disabled={isRunningDrTest}
                style={{
                  padding: '9px 16px',
                  borderRadius: '12px',
                  background: isRunningDrTest ? '#94a3b8' : '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: isRunningDrTest ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)'
                }}
              >
                {isRunningDrTest ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>{isRunningDrTest ? 'Simuliere Test...' : 'DR-Testlauf starten'}</span>
              </button>
            )}

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

        {/* CONTENT */}
        <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }}>
          {/* Quick Notice */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertOctagon size={20} color="#ef4444" />
              <div style={{ fontSize: '0.84rem', color: '#334155', fontWeight: 650 }}>
                Maximale garantierte Wiederherstellungszeit (RTO): <strong>&lt; 15 Minuten</strong> • Maximaler Datenverlust (RPO): <strong>&lt; 60 Minuten</strong>.
              </div>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '3px 9px',
                borderRadius: '999px',
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0'
              }}
            >
              Hiscox SLA konform
            </span>
          </div>

          {/* 4-Step Process Navigator */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {steps.map((s) => {
              const isSelected = activeStep === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStep(s.id)}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: isSelected ? '2px solid #ef4444' : '1px solid #e2e8f0',
                    background: isSelected ? '#fef2f2' : '#ffffff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: isSelected ? '#dc2626' : '#64748b' }}>
                    STUFE {s.id}
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.title.split(':')[1] || s.title}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Step Detail Box */}
          {steps.map((s) => {
            if (s.id !== activeStep) return null;
            return (
              <div
                key={s.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  border: '1px solid #e2e8f0',
                  padding: '24px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    {s.title}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 850,
                      padding: '3px 10px',
                      borderRadius: '100px',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe'
                    }}
                  >
                    Richtzeit: {s.leadTime}
                  </span>
                </div>

                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
                  {s.desc}
                </p>

                <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                  Verbindliche Handlungsanweisungen:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {s.actions.map((act, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        border: '1px solid #f1f5f9',
                        fontSize: '0.84rem',
                        color: '#334155'
                      }}
                    >
                      <span style={{ fontWeight: 900, color: '#ef4444' }}>{idx + 1}.</span>
                      <span style={{ lineHeight: 1.45 }}>{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
