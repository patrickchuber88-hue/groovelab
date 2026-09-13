import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Lock, Key, Fingerprint, Delete, LogOut, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { isWebAuthnSupported, authenticateParentBiometricPasskey } from '../../utils/webauthn';

interface SessionLockModalProps {
  user: any;
  supabase: any;
  schoolData?: any;
  activePlatform?: string;
  onUnlock: () => void;
  onLogout: () => void;
}

export const SessionLockModal: React.FC<SessionLockModalProps> = ({
  user,
  supabase,
  activePlatform = 'campus',
  onUnlock,
  onLogout
}) => {
  const [pinInput, setPinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [unlockMode, setUnlockMode] = useState<'pin' | 'password'>('pin');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isStaff = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary' || user?.role === 'master_admin';
  const webAuthnAvailable = isWebAuthnSupported();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Determine user display name
  const displayName = 
    user?.display_name || 
    user?.name || 
    (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '') || 
    'Angemeldeter Benutzer';

  // Determine role title
  const getRoleLabel = () => {
    switch (user?.role) {
      case 'admin':
        return 'Schulleitung & Administration';
      case 'secretary':
        return 'Sekretariat & Verwaltung';
      case 'teacher':
        return 'Lehrkraft';
      case 'student':
        return 'Schüler';
      case 'master_admin':
        return 'Master Admin';
      default:
        return 'Benutzer';
    }
  };

  // Determine user avatar per platform rules
  const getAvatarSrc = () => {
    // Platform rule: admin and secretary strictly use briefing board image across all modules
    if (user?.role === 'admin' || user?.role === 'secretary') {
      return '/campus_login_hero.png';
    }
    if (activePlatform === 'groovelab') {
      return user?.avatar_url || user?.photo_url || '/avatar_ghost.jpg';
    }
    return user?.photo_url || user?.avatar_url || '/default_avatar.png';
  };

  // Trigger error shake feedback
  const triggerError = useCallback((msg: string) => {
    setErrorMessage(msg);
    setShake(true);
    setTimeout(() => setShake(false), 600);
    setPinInput('');
  }, []);

  // Server-side PIN verification (Student 4-digit or Parent 6-digit)
  const verifyPin = useCallback(async (pinToTest: string) => {
    if (loading || !user?.id) return;
    const clean = pinToTest.trim();
    if (clean.length !== 4 && clean.length !== 6) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      let isMatch = false;

      if (clean.length === 4) {
        const { data: pinOk, error: rpcErr } = await supabase.rpc('verify_personal_pin', {
          user_uuid: user.id,
          input_pin: clean
        });
        if (!rpcErr && pinOk === true) {
          isMatch = true;
        }
      } else if (clean.length === 6) {
        const { data: parentOk, error: rpcErr } = await supabase.rpc('verify_parent_pin', {
          student_id: user.id,
          input_pin: clean
        });
        if (!rpcErr && parentOk === true) {
          isMatch = true;
        }
      }

      if (isMatch) {
        onUnlock();
      } else {
        triggerError('PIN nicht korrekt. Bitte versuche es erneut.');
      }
    } catch (err: any) {
      console.error('[SessionLockModal] PIN verification error:', err);
      triggerError('Verbindungsfehler bei der Überprüfung.');
    } finally {
      setLoading(false);
    }
  }, [loading, user?.id, supabase, onUnlock, triggerError]);

  // Server-side Password verification for Staff/Admins
  const verifyPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading || !passwordInput.trim() || !user) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const { data: authResult, error: rpcErr } = await supabase.rpc('authenticate_by_credential', {
        p_credential: passwordInput.trim(),
        p_school_id: user.school_id || null
      });

      if (!rpcErr && (authResult?.success === true || authResult?.user?.id === user.id)) {
        onUnlock();
      } else {
        triggerError('Passwort nicht korrekt. Bitte erneut versuchen.');
        setPasswordInput('');
      }
    } catch (err: any) {
      console.error('[SessionLockModal] Password verification error:', err);
      triggerError('Verbindungsfehler bei der Überprüfung.');
    } finally {
      setLoading(false);
    }
  };

  // WebAuthn / Passkey Biometric Unlock
  const handleBiometricUnlock = async () => {
    if (loading || !user?.id) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const authRes = await authenticateParentBiometricPasskey(
        supabase,
        user.id,
        user.school_id || null
      );

      if (authRes.success) {
        onUnlock();
      } else if (authRes.error && !authRes.error.includes('abgebrochen')) {
        setErrorMessage(authRes.error);
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        setErrorMessage(err.message || 'Passkey-Entsperrung fehlgeschlagen.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Keypad button click handler
  const handleKeyClick = (key: string) => {
    if (loading) return;
    setErrorMessage(null);

    if (key === 'clear') {
      setPinInput('');
    } else if (key === 'back') {
      setPinInput(prev => prev.slice(0, -1));
    } else if (pinInput.length < 6) {
      const next = pinInput + key;
      setPinInput(next);
      if (next.length === 4 || next.length === 6) {
        verifyPin(next);
      }
    }
  };

  // Native keyboard listener (Numbers 0-9, Backspace, Enter, Escape)
  useEffect(() => {
    if (unlockMode !== 'pin') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setPinInput(prev => {
          if (prev.length >= 6) return prev;
          const next = prev + e.key;
          if (next.length === 4 || next.length === 6) {
            verifyPin(next);
          }
          return next;
        });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPinInput(prev => prev.slice(0, -1));
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setPinInput('');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pinInput.length === 4 || pinInput.length === 6) {
          verifyPin(pinInput);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [unlockMode, pinInput, verifyPin]);

  // Handle logout with loading state
  const handleLogoutClick = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      await onLogout();
    } catch (err) {
      console.error('[SessionLockModal] Logout error:', err);
      setLogoutLoading(false);
    }
  };

  const slotsCount = pinInput.length > 4 ? 6 : 4;
  const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bildschirm gesperrt"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto'
      }}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '32px',
          padding: '36px 28px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 65px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.6) inset',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* User Avatar with Status Badge */}
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '26px',
              overflow: 'hidden',
              background: '#e2e8f0',
              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.15), 0 0 0 3px #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={getAvatarSrc()}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/campus_login_hero.png';
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2), 0 0 0 2px #ffffff'
            }}
          >
            <Lock size={12} />
          </div>
        </div>

        {/* User Identity */}
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 850,
            color: '#0f172a',
            margin: '0 0 2px',
            letterSpacing: '-0.02em',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}
        >
          {displayName}
        </h2>
        <span
          style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#64748b',
            marginBottom: '14px',
            letterSpacing: '0.01em'
          }}
        >
          {getRoleLabel()}
        </span>

        {/* Main Title & Human-Centric Wording */}
        <div
          style={{
            background: '#f1f5f9',
            borderRadius: '16px',
            padding: '12px 16px',
            marginBottom: '20px',
            width: '100%'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: '#0f172a',
              fontSize: '0.94rem',
              fontWeight: 800,
              marginBottom: '4px'
            }}
          >
            <span>Bildschirm gesperrt</span>
          </div>
          <p
            style={{
              fontSize: '0.82rem',
              color: '#475569',
              lineHeight: 1.45,
              margin: 0
            }}
          >
            Nach 45 Minuten Inaktivität zum Schutz deiner Daten pausiert. Deine offenen Formulare und Eingaben bleiben erhalten.
          </p>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#dc2626',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '14px',
              background: '#fef2f2',
              padding: '8px 12px',
              borderRadius: '12px',
              width: '100%',
              justifyContent: 'center'
            }}
          >
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* UNLOCK MODE: PIN */}
        {unlockMode === 'pin' && (
          <div style={{ width: '100%' }}>
            {/* PIN Slots / Dots */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '16px',
                animation: shake ? 'pinShakeAnim 0.5s ease-in-out' : 'none'
              }}
            >
              {Array.from({ length: slotsCount }).map((_, index) => {
                const isFilled = index < pinInput.length;
                return (
                  <div
                    key={index}
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: isFilled ? '#0284c7' : '#e2e8f0',
                      transform: isFilled ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: isFilled ? '0 0 10px rgba(2, 132, 199, 0.4)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                );
              })}
            </div>

            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginBottom: '14px' }}>
              4-stellige PIN oder 6-stellige Eltern-Master-PIN
            </div>

            {/* Digital Touch Keypad */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                width: '100%',
                marginBottom: '14px'
              }}
            >
              {keypadKeys.map((key) => {
                const isClear = key === 'clear';
                const isBack = key === 'back';
                const isAction = isClear || isBack;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeyClick(key)}
                    disabled={loading}
                    aria-label={isClear ? 'Eingabe löschen' : isBack ? 'Letzte Ziffer löschen' : `Ziffer ${key}`}
                    style={{
                      height: '48px',
                      borderRadius: '16px',
                      border: 'none',
                      background: isAction ? '#f1f5f9' : '#ffffff',
                      color: isAction ? '#64748b' : '#0f172a',
                      fontSize: isAction ? '0.85rem' : '1.25rem',
                      fontWeight: 800,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.1s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 0 2px #0284c7';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.04)';
                    }}
                  >
                    {isBack ? <Delete size={20} /> : isClear ? 'C' : key}
                  </button>
                );
              })}
            </div>

            {/* Biometric Passkey Unlock Button (Touch ID / Face ID) */}
            {webAuthnAvailable && (
              <button
                type="button"
                onClick={handleBiometricUnlock}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '14px',
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                  transition: 'all 0.15s ease'
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={18} />}
                <span>Mit Touch ID / Face ID entsperren</span>
              </button>
            )}

            {/* Toggle to Password for Staff/Admins */}
            {isStaff && (
              <button
                type="button"
                onClick={() => {
                  setUnlockMode('password');
                  setErrorMessage(null);
                  setTimeout(() => passwordInputRef.current?.focus(), 100);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284c7',
                  fontSize: '0.82rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  padding: '6px',
                  marginBottom: '10px',
                  textDecoration: 'underline'
                }}
              >
                Mit Account-Passwort entsperren
              </button>
            )}
          </div>
        )}

        {/* UNLOCK MODE: PASSWORD (For Staff/Admins) */}
        {unlockMode === 'password' && (
          <form onSubmit={verifyPassword} style={{ width: '100%', marginBottom: '14px' }}>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Passwort eingeben"
                disabled={loading}
                aria-label="Account-Passwort"
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 14px',
                  borderRadius: '14px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !passwordInput.trim()}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.94rem',
                fontWeight: 800,
                cursor: loading || !passwordInput.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '10px',
                boxShadow: '0 6px 16px -2px rgba(2, 132, 199, 0.35)'
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
              <span>Entsperren</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUnlockMode('pin');
                setErrorMessage(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.82rem',
                fontWeight: 750,
                cursor: 'pointer',
                padding: '6px',
                textDecoration: 'underline'
              }}
            >
              Zurück zur PIN-Eingabe
            </button>
          </form>
        )}

        {/* Divider */}
        <div style={{ width: '100%', height: '1px', background: '#e2e8f0', margin: '6px 0 14px' }} />

        {/* Secondary Action: Abmelden */}
        <button
          type="button"
          onClick={handleLogoutClick}
          disabled={logoutLoading}
          aria-label="Sitzung beenden und abmelden"
          style={{
            width: '100%',
            padding: '11px 16px',
            borderRadius: '14px',
            background: 'transparent',
            color: '#64748b',
            border: '1px solid #cbd5e1',
            fontSize: '0.88rem',
            fontWeight: 750,
            cursor: logoutLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#0284c7';
            e.currentTarget.style.color = '#0284c7';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          {logoutLoading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
          <span>{logoutLoading ? 'Wird abgemeldet...' : 'Abmelden'}</span>
        </button>
      </div>
    </div>
  );
};
