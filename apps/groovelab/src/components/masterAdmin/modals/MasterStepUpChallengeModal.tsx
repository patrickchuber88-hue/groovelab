import React, { useEffect } from 'react';
import { ShieldAlert, Fingerprint, X } from 'lucide-react';

interface MasterStepUpChallengeModalProps {
  isOpen: boolean;
  actionName: string;
  mode?: 'biometric_or_totp' | 'totp_only';
  loading: boolean;
  error: string | null;
  totpInput: string;
  setTotpInput: (val: string) => void;
  onClose: () => void;
  onVerifyBiometrics: () => void;
  onVerifyTotp: (e?: React.FormEvent) => void;
}

export const MasterStepUpChallengeModal: React.FC<MasterStepUpChallengeModalProps> = ({
  isOpen,
  actionName,
  mode = 'biometric_or_totp',
  loading,
  error,
  totpInput,
  setTotpInput,
  onClose,
  onVerifyBiometrics,
  onVerifyTotp,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stepup-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '10px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ea4335',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={26} />
          </div>
          <div>
            <h3
              id="stepup-title"
              style={{
                fontSize: '1.15rem',
                fontWeight: 900,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Sicherheits-Freigabe (Step-Up)
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
              Kritische Master-Aktion bestätigen
            </span>
          </div>
        </div>

        {/* Zwingende 2FA Badge für totp_only */}
        {mode === 'totp_only' && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              color: '#92400e',
              fontSize: '0.74rem',
              fontWeight: 800,
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <ShieldAlert size={14} color="#d97706" />
            <span>Zwingende 2FA-Pflicht: Google Authenticator</span>
          </div>
        )}

        {/* Info Box */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: mode === 'totp_only' ? '#fff7ed' : '#fffbeb',
            border: `1px solid ${mode === 'totp_only' ? '#fed7aa' : '#fde68a'}`,
            fontSize: '0.82rem',
            color: mode === 'totp_only' ? '#9a3412' : '#92400e',
            marginBottom: '20px',
            lineHeight: 1.45,
          }}
        >
          Aktion: <strong>{actionName}</strong>
          <div style={{ marginTop: '4px', fontSize: '0.75rem', color: mode === 'totp_only' ? '#c2410c' : '#b45309', fontWeight: mode === 'totp_only' ? 700 : 500 }}>
            {mode === 'totp_only'
              ? 'Für diese sensible Mandanten-Aktion ist zwingend ein 6-stelliger Google Authenticator (TOTP) Code erforderlich. Biometrische Freigaben sind hierfür gesperrt.'
              : 'Erfordert zur Absicherung eine frische Bestätigung per Touch ID oder Google Authenticator.'}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#fef2f2',
              color: '#dc2626',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {/* 1. Primär: Biometrie (nur wenn nicht im totp_only Modus) */}
        {mode !== 'totp_only' && (
          <>
            <button
              type="button"
              onClick={onVerifyBiometrics}
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '12px',
                background: '#0f172a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.88rem',
                border: 'none',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '14px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
              }}
            >
              <Fingerprint size={20} color="#10b981" />
              <span>{loading ? 'Verifiziere...' : 'Mit Touch ID / Fingerabdruck freigeben'}</span>
            </button>

            {/* Trennlinie */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              <span style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>ODER</span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>
          </>
        )}

        {/* 2. Google Authenticator */}
        <form onSubmit={onVerifyTotp} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoFocus={mode === 'totp_only'}
            placeholder="Google Authenticator (6 Ziffern)"
            value={totpInput}
            onChange={(e) => setTotpInput(e.target.value.replace(/[^0-9]/g, ''))}
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              fontSize: '1rem',
              fontWeight: 800,
              letterSpacing: '0.15em',
              textAlign: 'center',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'monospace',
              background: '#f8fafc',
            }}
          />
          <button
            type="submit"
            disabled={loading || totpInput.trim().length !== 6}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '10px',
              background: totpInput.trim().length === 6 ? '#059669' : '#94a3b8',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.84rem',
              border: 'none',
              cursor: totpInput.trim().length === 6 ? 'pointer' : 'not-allowed',
            }}
          >
            Aktion freigeben
          </button>
        </form>
      </div>
    </div>
  );
};
