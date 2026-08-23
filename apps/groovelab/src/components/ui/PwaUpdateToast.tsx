import React from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';

interface PwaUpdateToastProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export const PwaUpdateToast: React.FC<PwaUpdateToastProps> = ({ onUpdate, onDismiss }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999999,
      maxWidth: '480px',
      width: 'calc(100% - 32px)',
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '100px',
      padding: '8px 12px 8px 16px',
      boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      animation: 'cgSlideUpFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
      <style>{`
        @keyframes cgSlideUpFade {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'rgba(52, 168, 83, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Sparkles size={15} color="#4ade80" />
        </div>
        <div style={{
          fontSize: '0.82rem',
          fontWeight: 700,
          color: '#f8fafc',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          Neues Update verfügbar!
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={onUpdate}
          style={{
            padding: '6px 14px',
            borderRadius: '100px',
            background: '#34a853',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 2px 8px rgba(52, 168, 83, 0.3)',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#2e9549'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#34a853'; }}
        >
          <RefreshCw size={13} />
          Aktualisieren
        </button>

        <button
          type="button"
          onClick={onDismiss}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'transparent',
            color: '#94a3b8',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease'
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = '#ffffff'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
          title="Später"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
