import React, { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { School } from '../MasterAdminTypes';

interface SuspendSchoolModalProps {
  school: School | null;
  reason: string;
  onChangeReason: (val: string) => void;
  suspending: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const SuspendSchoolModal: React.FC<SuspendSchoolModalProps> = ({
  school,
  reason,
  onChangeReason,
  suspending,
  onClose,
  onSubmit
}) => {
  useEffect(() => {
    if (!school) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [school, onClose]);

  if (!school) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mandanten pausieren und sperren"
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
    >
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.25)',
        border: '1px solid #fee2e2',
        maxWidth: '520px',
        width: '100%',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={26} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.20rem', fontWeight: 800, color: '#991b1b' }}>
              Mandanten pausieren &amp; sperren?
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
              Sperrung für „{school.name}“.
            </p>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
          Achtung: Durch die Pausierung werden <strong>alle aktiven Sitzungen</strong> von Lehrkräften und Schülern dieser Schule sofort beendet. Der Zugang wird gesperrt.
        </p>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
              Pflichtangabe: Grund für die Sperrung *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => onChangeReason(e.target.value)}
              placeholder="z. B. Zahlungsverzug nach 2. Mahnung / Sommerpause auf Kundenwunsch"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>

            <button
              type="submit"
              disabled={suspending}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 850,
                cursor: 'pointer',
                boxShadow: 'none'
              }}
            >
              {suspending ? 'Wird gesperrt...' : 'Mandanten kostenpflichtig sperren'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
