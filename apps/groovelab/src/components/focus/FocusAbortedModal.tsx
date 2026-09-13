import React, { useEffect } from 'react';
import { TimerOff, AlertOctagon, RotateCcw } from 'lucide-react';
import { FocusAbortReason } from '../../hooks/useFocusInterruptionGuard';

export interface FocusAbortedModalProps {
  isOpen: boolean;
  reason: FocusAbortReason | null;
  toolName?: string;
  onClose: () => void;
}

export const FocusAbortedModal: React.FC<FocusAbortedModalProps> = ({
  isOpen,
  reason,
  toolName = 'Übe-Tool',
  onClose
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isStrikeLimit = reason === 'strike_limit_exceeded';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-abort-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeInFocusGuard 0.2s ease-out'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '32px 24px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          border: '1px solid #fee2e2'
        }}
      >
        {/* Icon Circle */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}
        >
          {isStrikeLimit ? <AlertOctagon size={36} /> : <TimerOff size={36} />}
        </div>

        {/* Title */}
        <h2
          id="focus-abort-title"
          style={{
            margin: '0 0 12px 0',
            fontSize: '22px',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.02em'
          }}
        >
          Übe-Session abgebrochen
        </h2>

        {/* Reason Box */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '14px 16px',
            marginBottom: '20px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <p
            style={{
              margin: '0 0 6px 0',
              fontSize: '14px',
              fontWeight: 700,
              color: '#dc2626'
            }}
          >
            {isStrikeLimit
              ? 'Kulanz-Limit erreicht (2. Unterbrechung)'
              : '10-Sekunden-Zeitlimit überschritten'}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#475569',
              lineHeight: 1.4
            }}
          >
            {isStrikeLimit
              ? `Du hast das ${toolName} während einer laufenden Session ein zweites Mal verlassen. Die Kulanz von 10 Sekunden gilt nur maximal 1× pro Session.`
              : `Du hast das ${toolName} verlassen und bist nicht innerhalb von 10 Sekunden zurückgekehrt.`}
          </p>
        </div>

        {/* Explanation */}
        <p
          style={{
            margin: '0 0 24px 0',
            fontSize: '13px',
            color: '#64748b',
            lineHeight: 1.5
          }}
        >
          Die angebrochene Übezeit und XP dieser Session wurden nach den Fokus-Regeln verworfen. Starte einfach gleich eine neue Runde und bleibe konzentriert dabei!
        </p>

        {/* Action Button */}
        <button
          type="button"
          autoFocus
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClose();
            }
          }}
          style={{
            width: '100%',
            minHeight: '48px',
            padding: '12px 24px',
            background: '#0f172a',
            color: '#facc15',
            border: 'none',
            borderRadius: '14px',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            touchAction: 'manipulation',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
            outline: 'none'
          }}
          aria-label="Abbruch-Hinweis bestätigen und schließen"
        >
          <RotateCcw size={18} />
          <span>Verstanden &amp; Neue Session starten</span>
        </button>
      </div>

      <style>{`
        @keyframes fadeInFocusGuard {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
