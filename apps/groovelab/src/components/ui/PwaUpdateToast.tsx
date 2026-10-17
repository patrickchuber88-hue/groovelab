import React from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';

interface PwaUpdateToastProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export const PwaUpdateToast: React.FC<PwaUpdateToastProps> = ({ onUpdate, onDismiss }) => {
  return (
    <div 
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'fixed',
        top: typeof window !== 'undefined' && window.innerWidth <= 768 
          ? 'calc(env(safe-area-inset-top, 16px) + 16px)' 
          : '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999999,
        maxWidth: '460px',
        width: 'calc(100% - 32px)',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(16, 185, 129, 0.28)',
        borderRadius: '100px',
        padding: '6px 8px 6px 14px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        animation: 'cgSlideDownFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      <style>{`
        @keyframes cgSlideDownFade {
          from { opacity: 0; transform: translate(-50%, -18px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <div style={{
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Sparkles size={16} color="#059669" />
        </div>
        <div style={{
          fontSize: '0.84rem',
          fontWeight: 750,
          color: '#0f172a',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          letterSpacing: '-0.01em'
        }}>
          Neues Update verfügbar!
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={onUpdate}
          style={{
            padding: '8px 18px',
            minHeight: '42px',
            borderRadius: '100px',
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.80rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'none',
            transition: 'all 0.15s ease',
            touchAction: 'manipulation'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#059669'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#10b981'; }}
        >
          <RefreshCw size={13} strokeWidth={2.4} />
          Aktualisieren
        </button>

        <button
          type="button"
          onClick={onDismiss}
          style={{
            width: '36px',
            height: '36px',
            minWidth: '36px',
            minHeight: '36px',
            borderRadius: '50%',
            background: 'transparent',
            color: '#64748b',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            touchAction: 'manipulation'
          }}
          onMouseOver={(e) => { 
            e.currentTarget.style.color = '#0f172a'; 
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
          }}
          onMouseOut={(e) => { 
            e.currentTarget.style.color = '#64748b'; 
            e.currentTarget.style.background = 'transparent';
          }}
          title="Später"
          aria-label="Hinweis schließen"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
