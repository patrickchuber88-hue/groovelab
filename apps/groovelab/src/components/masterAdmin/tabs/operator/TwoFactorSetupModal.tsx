import React from 'react';
import QRCode from 'react-qr-code';
import { ShieldCheck } from 'lucide-react';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  adminUsername: string;
  twoFactorSecret: string;
  twoFactorCodeInput: string;
  setTwoFactorCodeInput: (code: string) => void;
  onClose: () => void;
  onConfirm: (e: React.FormEvent) => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  adminUsername,
  twoFactorSecret,
  twoFactorCodeInput,
  setTwoFactorCodeInput,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '20px'
    }} className="animate-fade-in">
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '460px',
        padding: '32px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '14px',
          background: '#dcfce7',
          color: '#15803d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ShieldCheck size={26} />
        </div>

        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
          2-Faktor-Authentifizierung einrichten
        </h3>
        <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748b', lineHeight: 1.4 }}>
          Scannen Sie den QR-Code mit einer Authenticator-App (Apple Passwörter, Google Authenticator, 1Password) und geben Sie den 6-stelligen Code ein.
        </p>

        <div style={{ padding: '16px', background: '#ffffff', borderRadius: '18px', border: '2px solid #0f172a', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <QRCode 
            value={`otpauth://totp/Campus-Groovelab:${encodeURIComponent(adminUsername || 'admin')}?secret=${twoFactorSecret}&issuer=Campus-Groovelab&algorithm=SHA1&digits=6&period=30`}
            size={150}
            style={{ width: '150px', height: '150px', display: 'block' }}
          />
        </div>

        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
          Manueller Schlüssel: <strong style={{ fontFamily: 'monospace', color: '#0f172a', letterSpacing: '1.5px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>{twoFactorSecret.match(/.{1,4}/g)?.join(' ') || twoFactorSecret}</strong>
        </div>

        <form onSubmit={onConfirm} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            placeholder="6-stelliger Code (z.B. 482910)"
            value={twoFactorCodeInput}
            onChange={(e) => setTwoFactorCodeInput(e.target.value)}
            required
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1.5px solid #0284c7',
              textAlign: 'center',
              fontSize: '1.1rem',
              fontWeight: 800,
              letterSpacing: '3px',
              outline: 'none'
            }}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                background: '#f1f5f9',
                border: 'none',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                background: '#16a34a',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
              }}
            >
              2FA Aktivieren
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
