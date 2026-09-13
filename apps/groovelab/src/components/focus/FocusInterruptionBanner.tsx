import React from 'react';
import { AlertTriangle, ArrowLeft, Clock, ShieldAlert } from 'lucide-react';

export interface FocusInterruptionBannerProps {
  isInterrupted: boolean;
  graceSecondsLeft: number;
  strikes: number;
  toolName?: string;
  onReturn: () => void;
}

export const FocusInterruptionBanner: React.FC<FocusInterruptionBannerProps> = ({
  isInterrupted,
  graceSecondsLeft,
  strikes,
  toolName = 'Übe-Tool',
  onReturn
}) => {
  if (!isInterrupted) return null;

  const isCritical = graceSecondsLeft <= 3;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: isCritical
          ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
          : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: '#ffffff',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
        padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        borderBottom: '2px solid rgba(255, 255, 255, 0.25)',
        animation: 'slideDownFocusGuard 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            backdropFilter: 'blur(8px)'
          }}
        >
          {isCritical ? (
            <ShieldAlert size={22} color="#ffffff" style={{ animation: 'pulse 0.6s infinite' }} />
          ) : (
            <AlertTriangle size={22} color="#ffffff" />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '-0.01em' }}>
              Achtung: Du hast das {toolName} verlassen!
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#fef08a'
              }}
            >
              Kulanz-Warnung (1/1)
            </span>
          </div>
          <span style={{ fontSize: '12px', opacity: 0.95, lineHeight: 1.3 }}>
            Kehre sofort zurück, sonst bricht die Session automatisch ab und die Zeit verfällt.
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {/* Countdown Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: '#ffffff',
            color: isCritical ? '#dc2626' : '#b45309',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '15px',
            fontVariantNumeric: 'tabular-nums',
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
          }}
          aria-label={`Verbleibende Zeit: ${graceSecondsLeft} Sekunden`}
        >
          <Clock size={16} />
          <span>00:0{Math.max(0, graceSecondsLeft)}s</span>
        </div>

        {/* Sofort Zurück Button */}
        <button
          type="button"
          onClick={onReturn}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onReturn();
            }
          }}
          style={{
            minHeight: '44px',
            minWidth: '44px',
            padding: '0 16px',
            background: '#0f172a',
            color: '#facc15',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            touchAction: 'manipulation',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'transform 0.15s ease, background 0.15s ease'
          }}
          aria-label={`Sofort zurück zum ${toolName}`}
        >
          <ArrowLeft size={16} />
          <span className="hidden-mobile-xs">Zurück zum Üben</span>
        </button>
      </div>

      <style>{`
        @keyframes slideDownFocusGuard {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        @media (max-width: 480px) {
          .hidden-mobile-xs { display: none; }
        }
      `}</style>
    </div>
  );
};
