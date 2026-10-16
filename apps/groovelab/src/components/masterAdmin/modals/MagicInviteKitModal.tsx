import React, { useState, useEffect } from 'react';
import { Check, CheckCircle, Copy } from 'lucide-react';

export interface MagicInviteKitData {
  schoolName: string;
  loginUrl: string;
  email: string;
  contactPerson: string;
  initialAdminPin?: string;
}

interface MagicInviteKitModalProps {
  data: MagicInviteKitData | null;
  onClose: () => void;
}

export const MagicInviteKitModal: React.FC<MagicInviteKitModalProps> = ({ data, onClose }) => {
  const [inviteCopied, setInviteCopied] = useState(false);
  const [briefingCopied, setBriefingCopied] = useState(false);

  useEffect(() => {
    if (!data) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, onClose]);

  if (!data) return null;

  const briefingText = `Guten Tag ${data.contactPerson},\n\nhier ist Ihr persönlicher Einrichtungs- und Aktivierungszugang für Campus-Groovelab an der Musikschule ${data.schoolName}:\n${data.loginUrl}${data.initialAdminPin ? `\n\nInitiale Schulleiter-PIN / Ausweis-Nr.: ${data.initialAdminPin}` : ''}\n\nDieser gesicherte Einladungslink ist für 14 Tage gültig. Der 3-Schritte-Assistent führt Sie direkt durch das Setup und die DSGVO-AVV-Gegenzeichnung.\n\nBei Fragen unterstützen wir Sie jederzeit gerne!\n\nHerzliche Grüße,\nPatrick Huber | Campus-Groovelab Leitstand`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bereitstellungs-Kit für neue Musikschule"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.50)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        maxWidth: '560px',
        width: '100%',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={26} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.20rem', fontWeight: 800, color: '#0f172a' }}>
              Schule erfolgreich angelegt!
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
              Bereitstellungs-Kit für „{data.schoolName}“ generiert.
            </p>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
            Persönlicher Einladungs-Link (14 Tage gültig)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              readOnly
              value={data.loginUrl}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                color: '#0f172a'
              }}
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(data.loginUrl);
                setInviteCopied(true);
                setTimeout(() => setInviteCopied(false), 2500);
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {inviteCopied ? 'Kopiert!' : 'Kopieren'}
            </button>
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            Vorformulierter Übergabe-Text für die Schulleitung
          </span>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
            {briefingText}
          </p>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(briefingText);
              setBriefingCopied(true);
              setTimeout(() => setBriefingCopied(false), 2500);
            }}
            style={{
              marginTop: '12px',
              padding: '9px 14px',
              borderRadius: '10px',
              background: briefingCopied ? '#059669' : '#ffffff',
              color: briefingCopied ? '#ffffff' : '#1e293b',
              border: briefingCopied ? 'none' : '1px solid #cbd5e1',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {briefingCopied ? <Check size={13} /> : <Copy size={13} />}
            <span>{briefingCopied ? 'Briefing-Text kopiert!' : 'Fertigen Briefing-Text kopieren'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
};
