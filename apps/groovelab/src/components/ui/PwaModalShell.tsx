import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export interface PwaModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
  maxWidth?: string;
  zIndex?: number;
  ariaLabel?: string;
  className?: string;
  bodyPadding?: string;
  hideCloseButton?: boolean;
}

/**
 * 🏛️ Universal PWA Tier-1 Modal Shell (Apple HIG & WebKit Compliant)
 * 
 * 3-Zonen-Architektur ("Correct-by-Construction"):
 * 1. ZONE 1 (Header): Feststehend (flexShrink: 0), inkl. 44×44px Touch-Target Schließen-Button.
 * 2. ZONE 2 (Body): Elastischer Scroll-Bereich (flex: 1 1 auto, minHeight: 0, overflowY: auto, overscroll-behavior: contain).
 * 3. ZONE 3 (Footer): Feststehender Sticky-Footer (flexShrink: 0), 100% immer sichtbar inkl. Safe-Area-Inset-Bottom.
 * 
 * Desktop (>= 769px): Schwebender, zentrierter Kasten (Desktop Layout Immunity).
 * Mobile (<= 768px): Intelligentes Bottom-Sheet / Responsive Card mit dvh-Obergrenze.
 */
export const PwaModalShell: React.FC<PwaModalShellProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  subtitle,
  children,
  footerActions,
  maxWidth = '480px',
  zIndex = 9999,
  ariaLabel,
  className = '',
  bodyPadding,
  hideCloseButton = false
}) => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  const bodyRef = useRef<HTMLDivElement>(null);

  // Responsive Viewport Detection (Desktop Layout Immunity Guard)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to top on open
  useEffect(() => {
    if (isOpen && bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  // Escape-Key Listener & Body Scroll Lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const accessibleLabel = typeof title === 'string' ? title : (ariaLabel || 'Modal-Dialog');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={accessibleLabel}
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : '16px',
        overscrollBehavior: 'contain',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      className={`pwa-modal-overlay ${className}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: isMobile ? '28px 28px 0 0' : '24px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          width: isMobile ? '100%' : maxWidth,
          maxWidth: '100%',
          maxHeight: isMobile
            ? 'calc(100dvh - 32px - env(safe-area-inset-top, 0px))'
            : 'min(90dvh, 760px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
          position: 'relative',
          outline: 'none',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          animation: isMobile
            ? 'slideUpSheet 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
            : 'scaleUpDialog 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className="pwa-modal-card"
      >
        {/* Apple Sheet Pull-Indicator on Mobile */}
        {isMobile && (
          <div
            style={{
              width: '36px',
              height: '4px',
              background: '#cbd5e1',
              borderRadius: '2px',
              margin: '10px auto 4px auto',
              flexShrink: 0
            }}
          />
        )}

        {/* ── ZONE 1: HEADER (Feststehend) ── */}
        {(title || !hideCloseButton) && (
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: isMobile ? '14px 20px 14px 20px' : '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              flexShrink: 0,
              gap: '12px',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              {icon && (
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  {icon}
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                {title && (
                  <h3
                    style={{
                      margin: 0,
                      fontSize: isMobile ? '1.1rem' : '1.25rem',
                      fontWeight: 900,
                      color: '#0f172a',
                      lineHeight: 1.3,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word'
                    }}
                  >
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p
                    style={{
                      margin: '3px 0 0 0',
                      fontSize: '0.78rem',
                      color: '#64748b',
                      fontWeight: 600,
                      lineHeight: 1.4
                    }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Apple 44×44px Touch Target Close Button */}
            {!hideCloseButton && (
              <button
                onClick={onClose}
                type="button"
                aria-label="Dialog schließen"
                title="Schließen"
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  minWidth: '36px',
                  minHeight: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  userSelect: 'none'
                }}
                className="hover-scale"
                onMouseOver={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              >
                <X size={18} />
              </button>
            )}
          </header>
        )}

        {/* ── ZONE 2: BODY (Elastischer Scroll-Bereich) ── */}
        <main
          ref={bodyRef}
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
            touchAction: 'pan-y',
            padding: bodyPadding || (isMobile ? '16px 20px' : '20px 24px'),
            boxSizing: 'border-box'
          }}
          className="pwa-scroll-container"
        >
          {children}
        </main>

        {/* ── ZONE 3: FOOTER (Feststehender Sticky-Footer) ── */}
        {footerActions && (
          <footer
            style={{
              flexShrink: 0,
              padding: isMobile ? '14px 20px' : '16px 24px',
              paddingBottom: isMobile
                ? 'calc(max(14px, env(safe-area-inset-bottom, 14px)) + 4px)'
                : '16px',
              background: '#ffffff',
              borderTop: '1px solid #f1f5f9',
              boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.04)',
              width: '100%',
              boxSizing: 'border-box',
              position: 'relative',
              zIndex: 10
            }}
            className="pwa-modal-footer"
          >
            {footerActions}
          </footer>
        )}
      </div>
    </div>
  );
};
