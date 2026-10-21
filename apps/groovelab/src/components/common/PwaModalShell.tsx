import React from 'react';

export interface PwaModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  maxWidth?: string | number;
  titleId?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const PwaModalShell: React.FC<PwaModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = '640px',
  titleId = 'pwa-modal-shell-title',
  children,
  footer,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="pwa-modal-shell"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="pwa-modal-card"
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth,
          maxHeight: 'calc(100dvh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.18)',
          border: '1px solid #e2e8f0',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: '#f8fafc',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2
              id={titleId}
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#0f172a',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            data-testid="modal-close-btn"
            aria-label="Dialog schließen"
            onClick={onClose}
            style={{
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '50%',
              border: 'none',
              background: '#f1f5f9',
              color: '#475569',
              fontSize: '1.05rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              touchAction: 'manipulation',
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
