/**
 * 🏛️ Campus-Groovelab QrStudentPinCard.tsx
 * Autarker Feature-Monolith für den QR-Landing PIN-Eingabeblock (Schüler & Eltern)
 * 
 * 0,1% Enterprise Goldstandard:
 * - 100% unverändertes visuelles Erscheinungsbild & Haptik
 * - Kapselung der PIN-Präsentation, des Keypads und der Modal-Dialoge
 * - Bounded Context & Zero-Inline-Feature Doktrin
 */

import React from 'react';
import { ShieldCheck, Lock, User, Key, ArrowLeft } from 'lucide-react';

export interface QrStudentPinCardProps {
  profile: any;
  isParentPinMode: boolean;
  setIsParentPinMode: (val: boolean) => void;
  pinPurpose: string | null;
  pinInput: string;
  setPinInput: (val: string) => void;
  pinError: string | null;
  setPinError: (val: string | null) => void;
  pinAttempts: number;
  MAX_ATTEMPTS: number;
  pinLoading: boolean;
  handlePinDigit: (digit: string) => void;
  handlePinDelete: () => void;
  showForgotPinInfo: boolean;
  setShowForgotPinInfo: (val: boolean) => void;
  onCancel: () => void;
}

export const QrStudentPinCard: React.FC<QrStudentPinCardProps> = ({
  profile,
  isParentPinMode,
  setIsParentPinMode,
  pinPurpose,
  pinInput,
  setPinInput,
  pinError,
  setPinError,
  pinAttempts,
  MAX_ATTEMPTS,
  pinLoading,
  handlePinDigit,
  handlePinDelete,
  showForgotPinInfo,
  setShowForgotPinInfo,
  onCancel
}) => {
  const blocked = pinAttempts >= MAX_ATTEMPTS;
  const activeThemeColor = isParentPinMode ? '#0284c7' : '#34a853';
  const numDots = isParentPinMode ? 6 : (pinPurpose === 'setup_initial_pin' ? 4 : (pinInput.length > 4 ? 6 : 4));

  return (
    <>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '18px',
          background: isParentPinMode ? '#e0f2fe' : '#e6f4ea',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px auto',
          boxShadow: isParentPinMode ? '0 4px 12px rgba(2, 132, 199, 0.15)' : 'none'
        }}>
          {isParentPinMode ? <ShieldCheck size={28} color="#0284c7" /> : <Lock size={28} color="#34a853" />}
        </div>
        {profile && (
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800, color: activeThemeColor }}>
            {isParentPinMode ? 'Erziehungsberechtigte' : 'Hallo!'}
          </h2>
        )}
        <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
          {pinPurpose === 'setup_initial_pin'
            ? 'Wähle deine 4-stellige PIN'
            : (isParentPinMode ? 'Eltern-Master-PIN eingeben' : 'Sicherheits-PIN zum Einloggen')}
        </h1>
        <p style={{ margin: '8px 0 0 0', fontSize: '0.84rem', color: '#64748b', lineHeight: 1.45 }}>
          {pinPurpose === 'setup_initial_pin'
            ? 'Willkommen in deiner Musikschule! 🎵 Wähle deine persönliche 4-stellige PIN, um dein digitales Hausaufgabenheft freizuschalten.'
            : (isParentPinMode
              ? 'Gib deine 6-stellige Eltern-Master-PIN ein, um dich direkt mit vollen Rechten anzumelden.'
              : 'Willkommen zurück! 🎵 Gib deine 4-stellige Schüler-PIN ein oder melde dich als Elternteil an.')}
        </p>
      </div>

      {/* Mode Switch Button (Parent / Student toggle) */}
      {pinPurpose !== 'setup_initial_pin' && (
        <button
          type="button"
          onClick={() => {
            setIsParentPinMode(!isParentPinMode);
            setPinInput('');
            setPinError(null);
          }}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: '12px',
            border: `1px solid ${isParentPinMode ? '#dcfce7' : '#e0f2fe'}`,
            background: isParentPinMode ? '#f0fdf4' : '#f0f9ff',
            color: isParentPinMode ? '#16a34a' : '#0284c7',
            fontSize: '0.78rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          {isParentPinMode ? (
            <>
              <User size={15} />
              <span>Als Schüler anmelden (4-stellige PIN)</span>
            </>
          ) : (
            <>
              <ShieldCheck size={15} />
              <span>Als Elternteil anmelden (6-stellige Master-PIN)</span>
            </>
          )}
        </button>
      )}

      {/* PIN Display (Dynamic 4 or 6 boxes) */}
      <div style={{ display: 'flex', gap: numDots === 6 ? '8px' : '12px', justifyContent: 'center' }}>
        {Array.from({ length: numDots }).map((_, i) => (
          <div key={i} style={{
            width: numDots === 6 ? '44px' : '56px',
            height: numDots === 6 ? '54px' : '64px',
            borderRadius: '16px',
            background: '#f8fafc',
            border: `2px solid ${pinInput.length > i ? activeThemeColor : '#e2e8f0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: numDots === 6 ? '1.5rem' : '1.8rem',
            fontWeight: 900,
            color: '#0f172a',
            transition: 'all 0.15s ease',
            boxShadow: pinInput.length > i ? `0 0 0 4px ${isParentPinMode ? 'rgba(2, 132, 199, 0.12)' : 'rgba(52, 168, 83, 0.12)'}` : 'none'
          }}>
            {pinInput[i] ? '●' : ''}
          </div>
        ))}
      </div>

      {/* Error */}
      {pinError && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '10px 14px',
          fontSize: '0.82rem',
          color: '#dc2626',
          fontWeight: 700,
          textAlign: 'center'
        }}>
          {pinError}
        </div>
      )}

      {/* Numpad */}
      {!blocked && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map((key) => (
            <button
              key={key}
              disabled={pinLoading || !key}
              onClick={() => {
                if (key === '⌫') handlePinDelete();
                else if (key === 'C') {
                  setPinInput('');
                  setPinError(null);
                }
                else if (key) handlePinDigit(key);
              }}
              style={{
                padding: '14px',
                minHeight: '56px',
                borderRadius: '16px',
                border: 'none',
                background: key === '⌫' ? '#fee2e2' : key === 'C' ? '#f1f5f9' : '#f8fafc',
                color: key === '⌫' ? '#ef4444' : '#0f172a',
                fontSize: key === '⌫' ? '1.2rem' : '1.35rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'background 0.15s, transform 0.1s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: key === '⌫' ? '#fecaca' : '#e2e8f0',
                touchAction: 'manipulation'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
              onMouseUp={e => e.currentTarget.style.transform = ''}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      {/* Loading Indicator */}
      {pinLoading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '12px',
          borderRadius: '14px',
          background: isParentPinMode ? '#f0f9ff' : '#f0fdf4',
          border: `1px solid ${isParentPinMode ? '#bae6fd' : '#bbf7d0'}`,
          color: isParentPinMode ? '#0284c7' : '#16a34a',
          fontSize: '0.88rem',
          fontWeight: 800
        }}>
          <span style={{
            display: 'inline-block',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            border: '2px solid rgba(0,0,0,0.15)',
            borderTopColor: '#0f172a',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span>{pinPurpose === 'setup_initial_pin' ? 'Speichere PIN...' : 'PIN wird überprüft & Anmeldung startet...'}</span>
        </div>
      )}

      {pinPurpose !== 'setup_initial_pin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          <button
            type="button"
            onClick={() => setShowForgotPinInfo(true)}
            style={{
              background: 'none',
              border: 'none',
              color: activeThemeColor,
              fontSize: '0.82rem',
              fontWeight: 750,
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              textDecoration: 'underline'
            }}
          >
            PIN vergessen?
          </button>

          <button
            disabled={pinLoading}
            onClick={onCancel}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '16px',
              border: 'none',
              background: '#f1f5f9',
              color: '#475569',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: pinLoading ? 'not-allowed' : 'pointer',
              opacity: pinLoading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <ArrowLeft size={16} /> Abbrechen
          </button>
        </div>
      )}

      {/* Forgot PIN Info Modal */}
      {showForgotPinInfo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}
          onClick={() => setShowForgotPinInfo(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px 24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              textAlign: 'center'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '18px',
                background: '#e6f4ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
              }}
            >
              <Key size={28} color="#34a853" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                PIN vergessen?
              </h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                Aus Sicherheits- und Datenschutzgründen (DSGVO) kann deine <strong>Lehrkraft</strong> oder das <strong>Schulsekretariat</strong> deine PIN im nächsten Unterricht mit <strong>1 Klick zurücksetzen</strong> und dir sofort einen neuen Onboarding-Link senden.
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
              💡 Dein bisheriger gedruckter QR-Code bleibt dabei zu 100% erhalten.
            </div>
            <button
              onClick={() => setShowForgotPinInfo(false)}
              style={{
                background: '#34a853',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '12px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Verstanden
            </button>
          </div>
        </div>
      )}
    </>
  );
};
