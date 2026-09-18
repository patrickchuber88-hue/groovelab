import React from 'react';
import { Eye, ShieldCheck } from 'lucide-react';
import type { School } from '../MasterAdminTypes';

interface GhostGateModalProps {
  ghostGateSchool: School | null;
  ghostGateReason: string;
  setGhostGateReason: (reason: string) => void;
  ghostGateTicketRef: string;
  setGhostGateTicketRef: (ref: string) => void;
  onClose: () => void;
  onConfirm: (school: School, fullReason: string) => void;
}

export const GhostGateModal: React.FC<GhostGateModalProps> = ({
  ghostGateSchool,
  ghostGateReason,
  setGhostGateReason,
  ghostGateTicketRef,
  setGhostGateTicketRef,
  onClose,
  onConfirm
}) => {
  if (!ghostGateSchool) return null;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ghost-gate-title"
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.25)',
          width: '100%',
          maxWidth: '520px',
          overflow: 'hidden',
          animation: 'modalSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '22px 26px 18px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
            }}>
              <Eye size={22} />
            </div>
            <div>
              <div id="ghost-gate-title" style={{ fontSize: '1.02rem', fontWeight: 900, color: '#0f172a' }}>
                Support-Ghost Autorisierung
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 650 }}>
                {ghostGateSchool.name} • {ghostGateSchool.city || 'Standort hinterlegt'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 26px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '10px' }}>
            Zweck &amp; Anlass der Ghost-Sitzung (Pflichtangabe):
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {[
              { id: 'support_ticket', label: 'Support-Anfrage', desc: 'Schulleitung bittet um Hilfe' },
              { id: 'bug_diagnosis', label: 'Fehlerdiagnose', desc: 'Technische Sync/Audio Prüfung' },
              { id: 'onboarding', label: 'Onboarding-Hilfe', desc: 'Ersteinrichtung & Begleitung' },
              { id: 'security_audit', label: 'Sicherheits-Audit', desc: 'AVV & Rechte-Überprüfung' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setGhostGateReason(cat.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  textAlign: 'left',
                  background: ghostGateReason === cat.id ? '#f0f9ff' : '#f8fafc',
                  border: ghostGateReason === cat.id ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  color: ghostGateReason === cat.id ? '#0284c7' : '#1e293b'
                }}>
                  {cat.label}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                  {cat.desc}
                </div>
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
              Ticket-ID oder dokumentierte Weisung (optional):
            </label>
            <input
              type="text"
              value={ghostGateTicketRef}
              onChange={(e) => setGhostGateTicketRef(e.target.value)}
              placeholder="z. B. #SUP-104 oder Telefonat mit Schulleitung"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* DSGVO Compliance Banner */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start'
          }}>
            <ShieldCheck size={16} color="#0284c7" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '0.70rem', color: '#475569', lineHeight: '1.45' }}>
              <strong>DSGVO Art. 28 &amp; AVV Goldstandard:</strong> Diese Support-Sitzung wird mit Ihrem Operator-Account und Zweck revisionssicher protokolliert. Das Token erlischt nach maximal 2 Stunden oder per 1-Klick (⌥+Q). Nach Sitzungsende wird die Dauer automatisch im Datenschutz-Logbuch der Musikschule hinterlegt.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 26px',
          background: '#f8fafc',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontSize: '0.80rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={() => {
              const target = ghostGateSchool;
              const reasonLabel = {
                support_ticket: 'Support-Anfrage Schulleitung',
                bug_diagnosis: 'Technische Fehlerdiagnose',
                onboarding: 'Onboarding-Begleitung',
                security_audit: 'Sicherheits- & AVV-Audit'
              }[ghostGateReason] || 'Support-Diagnostik';

              const fullReason = ghostGateTicketRef.trim() 
                ? `${reasonLabel} (Ref: ${ghostGateTicketRef.trim()})`
                : reasonLabel;

              onConfirm(target, fullReason);
            }}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
            }}
            className="hover-scale-mini"
          >
            <Eye size={14} /> Ghost-Sitzung starten (2h TTL)
          </button>
        </div>
      </div>
    </div>
  );
};
