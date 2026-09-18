import React, { memo } from 'react';

export interface SecretaryTrialBlockedOverlayProps {
  show: boolean;
  schoolName: string;
  onNavigateToLicenses: () => void;
}

/**
 * Full-screen modal overlay shown when the 30-day music school trial period has expired.
 * Prompts the administrator/secretary to complete the official contract checkout.
 */
export const SecretaryTrialBlockedOverlay: React.FC<SecretaryTrialBlockedOverlayProps> = memo(({
  show,
  schoolName,
  onNavigateToLicenses
}) => {
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif"
    }}>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="blocked-overlay-title"
        style={{
          background: '#ffffff',
          borderRadius: '32px',
          padding: '40px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 30px 80px rgba(15, 23, 42, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px'
        }}
      >
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
          fontSize: '2rem'
        }}>
          🎸
        </div>
        <div>
          <h2 id="blocked-overlay-title" style={{ margin: '0 0 10px 0', fontSize: '1.5rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', fontFamily: 'Outfit' }}>
            Testphase abgelaufen!
          </h2>
          <p style={{ margin: 0, fontSize: '0.92rem', color: '#475569', lineHeight: 1.5 }}>
            Die 30-tägige Testphase für deine Musikschule <strong>{schoolName}</strong> ist abgelaufen. Um alle Funktionen, Stundenpläne und Schüler-Dashboards weiterhin zu nutzen, schließe bitte den offiziellen Bestellprozess ab.
          </p>
        </div>

        <button
          onClick={onNavigateToLicenses}
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
            border: 'none',
            color: '#ffffff',
            fontWeight: 900,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 10px 20px rgba(52, 168, 83, 0.18)',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          Jetzt Vertrag abschließen (Bestellprozess)
        </button>
      </div>
    </div>
  );
});

SecretaryTrialBlockedOverlay.displayName = 'SecretaryTrialBlockedOverlay';
