import React from 'react';
import { Lock, Fingerprint, LogOut } from 'lucide-react';

interface MasterIdleLockModalProps {
  isIdleLocked: boolean;
  idleUnlockLoading: boolean;
  idlePinInput: string;
  setIdlePinInput: (value: string) => void;
  idleError: string | null;
  onIdleUnlock: (e?: React.FormEvent) => void;
  masterPasskeyActive: boolean;
  onLogout: () => void;
}

export const MasterIdleLockModal: React.FC<MasterIdleLockModalProps> = ({
  isIdleLocked,
  idleUnlockLoading,
  idlePinInput,
  setIdlePinInput,
  idleError,
  onIdleUnlock,
  masterPasskeyActive,
  onLogout,
}) => {
  if (!isIdleLocked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Leitstand gesperrt"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '28px',
          padding: '36px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ea4335',
            boxShadow: '0 8px 16px -4px rgba(234, 67, 53, 0.2)',
          }}
        >
          <Lock size={36} />
        </div>

        <div>
          <h3
            style={{
              fontSize: '1.4rem',
              fontWeight: 900,
              color: '#0f172a',
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Leitstand gesperrt
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            Automatische Bildschirmsperre nach 15 Minuten Inaktivität zum Schutz vertraulicher Daten.
          </p>
        </div>

        {idleError && (
          <div
            style={{
              width: '100%',
              padding: '10px 14px',
              background: '#fef2f2',
              borderRadius: '12px',
              color: '#dc2626',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            {idleError}
          </div>
        )}

        <form onSubmit={onIdleUnlock} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* 1. Primär: Biometrischer Fingerabdruck / Touch ID Button */}
          <button
            type="button"
            onClick={() => onIdleUnlock()}
            disabled={idleUnlockLoading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              background: '#0f172a',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.92rem',
              border: 'none',
              cursor: idleUnlockLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
              transition: 'all 0.2s ease',
            }}
          >
            <Fingerprint size={22} color="#10b981" />
            <span>{idleUnlockLoading ? 'Verifiziere...' : 'Mit Touch ID / Fingerabdruck entsperren'}</span>
          </button>

          {/* Trennlinie */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>ODER</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* 2. Sekundär: 6-stelliger Google Authenticator Code */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Google Authenticator (6 Ziffern)"
              value={idlePinInput}
              onChange={(e) => setIdlePinInput(e.target.value.replace(/[^0-9]/g, ''))}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                fontSize: '1.05rem',
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
              disabled={idleUnlockLoading || idlePinInput.trim().length !== 6}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: idlePinInput.trim().length === 6 ? '#059669' : '#94a3b8',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.88rem',
                border: 'none',
                cursor: idlePinInput.trim().length === 6 ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s ease',
              }}
            >
              Code bestätigen &amp; entsperren
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem('groovelab_is_master_admin');
                localStorage.removeItem('groovelab_is_master_admin');
                sessionStorage.setItem('groovelab_active_workspace', 'secretary');
                localStorage.setItem('groovelab_active_workspace', 'secretary');
                sessionStorage.setItem('groovelab_active_platform', 'campus');
                sessionStorage.setItem('campus_active_tab', 'briefing');
              } catch (e) {
                console.warn('Storage operation failed in MasterIdleLockModal:', e);
              }
              window.location.reload();
            }}
            style={{
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '6px',
            }}
          >
            🏛️ Zur Schulleitung wechseln
          </button>

          <button
            type="button"
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <LogOut size={14} />
            Vollständig abmelden
          </button>
        </form>
      </div>
    </div>
  );
};
