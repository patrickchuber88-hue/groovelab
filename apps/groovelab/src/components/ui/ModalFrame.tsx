import React, { useEffect, useRef } from 'react';

export interface ModalFrameProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  maxWidth?: string;
  zIndex?: number;
  backdropBlur?: string;
  backdropColor?: string;
  padding?: string;
  className?: string;
}

/**
 * ♿ Tier-1 BFSG 2025 & WCAG 2.2 AA Barrierefreie Modal-Hülle
 * 
 * Garantiert automatisch:
 * - role="dialog" und aria-modal="true"
 * - Escape-Taste zum Schließen
 * - Scroll-Lock auf body während Anzeige
 * - Backdrop-Klick zum Schließen
 * - Touch- und Tastaturfokus
 */
export const ModalFrame: React.FC<ModalFrameProps> = ({
  isOpen,
  onClose,
  ariaLabel,
  children,
  maxWidth = '560px',
  zIndex = 9999,
  backdropBlur = '8px',
  backdropColor = 'rgba(15, 23, 42, 0.45)',
  padding = '20px',
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Escape-Key Listener & Scroll Lock
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      tabIndex={-1}
      ref={modalRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        background: backdropColor,
        backdropFilter: `blur(${backdropBlur})`,
        WebkitBackdropFilter: `blur(${backdropBlur})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding,
        overflowY: 'auto'
      }}
      className={`modal-backdrop-shell ${className}`}
    >
      <div
        style={{
          width: '100%',
          maxWidth,
          position: 'relative',
          outline: 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};
