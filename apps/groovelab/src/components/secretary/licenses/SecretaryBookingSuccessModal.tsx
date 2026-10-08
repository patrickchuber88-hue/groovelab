import React from 'react';
import { useModalA11y } from '../../../hooks/useModalA11y';

export interface SecretaryBookingSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 🏛️ Autarker Feature-Monolith: Buchungs-Erfolgsmodal (0,1% Enterprise Goldstandard)
 * Bounded Context: Secretary / Licenses
 */
export function SecretaryBookingSuccessModal({ isOpen, onClose }: SecretaryBookingSuccessModalProps) {
  const modalRef = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-booking-success-title"
      ref={modalRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '20px'
      }}
    >
      <div className="glass-panel" style={{
        background: '#ffffff',
        border: '2px solid #34a853',
        borderRadius: '24px',
        padding: '40px 32px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: '#e6f4ea',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#34a853',
          fontSize: '2.5rem',
          fontWeight: 900,
          boxShadow: 'none'
        }}>
          ✓
        </div>
        <div>
          <h3 id="license-booking-success-title" style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', fontFamily: 'Urbanist' }}>Buchung erfolgreich abgeschlossen!</h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: '1.4' }}>
            Dein Abonnement wurde erfolgreich eingerichtet. Die Freischaltung aller Module und die Verbuchung sind abgeschlossen.
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: '12px',
            border: 'none',
            background: '#34a853',
            color: '#ffffff',
            fontSize: '0.86rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: 'none',
            transition: 'all 0.2s'
          }}
        >
          Zum Dashboard wechseln ➔
        </button>
      </div>
    </div>
  );
}
