import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Key, ShieldCheck, Sparkles, X, Check, AlertCircle } from 'lucide-react';
import { validateNewPassword, PasswordValidationResult } from '../../utils/passwordValidation';

export interface TeacherPasswordAuthModalProps {
  isOpen: boolean;
  mode: 'verify' | 'setup';
  user: {
    id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
    role?: string;
    avatar_url?: string;
  } | null;
  schoolData?: {
    id?: string;
    name?: string;
    primary_color?: string;
    logo_url?: string;
  } | null;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
  onSwitchToPasskey?: () => void;
  canUsePasskey?: boolean;
  loading?: boolean;
  errorMessage?: string | null;
}

export function TeacherPasswordAuthModal({
  isOpen,
  mode,
  user,
  schoolData,
  onClose,
  onSubmit,
  onSwitchToPasskey,
  canUsePasskey = false,
  loading = false,
  errorMessage = null
}: TeacherPasswordAuthModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset inputs on modal open
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setLocalError(null);
    }
  }, [isOpen, mode]);

  if (!isOpen || !user) return null;

  const isSetup = mode === 'setup';
  const brandColor = schoolData?.primary_color || '#16a34a';
  const displayName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Lehrkraft';

  // Live validation for setup mode
  const validation: PasswordValidationResult = validateNewPassword(password, {
    schoolName: schoolData?.name,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email
  });

  const canSubmit = isSetup
    ? validation.isValid && password === confirmPassword && !loading
    : password.trim().length > 0 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (isSetup) {
      if (!validation.isValid) {
        setLocalError(validation.error || 'Ungültiges Passwort.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Die beiden Passwörter stimmen nicht überein.');
        return;
      }
    }

    try {
      await onSubmit(password);
    } catch (err: any) {
      setLocalError(err?.message || 'Authentifizierungsfehler');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10050,
        padding: '20px',
        fontFamily: "'Plus Jakarta Sans', Inter, -apple-system, BlinkMacSystemFont, sans-serif"
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="teacher-pwd-modal-title"
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '32px',
          padding: '32px 28px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.22)',
          border: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Schließen"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f8fafc',
            border: 'none',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: '#64748b',
            transition: 'all 0.15s ease'
          }}
        >
          <X size={18} />
        </button>

        {/* Header Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '20px',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: brandColor
            }}
          >
            {isSetup ? <Sparkles size={26} strokeWidth={2.3} /> : <Lock size={26} strokeWidth={2.3} />}
          </div>
        </div>

        {/* Title & Subtitle */}
        <h2
          id="teacher-pwd-modal-title"
          style={{
            margin: 0,
            fontSize: '1.28rem',
            fontWeight: 800,
            color: '#0f172a',
            textAlign: 'center',
            letterSpacing: '-0.02em'
          }}
        >
          {isSetup ? 'Sicheres Passwort festlegen' : 'Passwort eingeben'}
        </h2>

        <p
          style={{
            margin: '8px 0 20px 0',
            fontSize: '0.85rem',
            color: '#64748b',
            fontWeight: 600,
            textAlign: 'center',
            lineHeight: 1.45
          }}
        >
          {isSetup ? (
            <>
              Lehrkraft-Konto für <strong>{displayName}</strong>.<br />
              Schütze deinen Zugang mit mindestens 12 Zeichen.
            </>
          ) : (
            <>
              Anmeldung für <strong>{displayName}</strong>.<br />
              Bitte gib dein Master-Passwort ein.
            </>
          )}
        </p>

        {/* Global / Server Error Message */}
        {(errorMessage || localError) && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: '#fef2f2',
              border: 'none',
              borderRadius: '16px',
              padding: '12px 14px',
              marginBottom: '16px',
              color: '#991b1b',
              fontSize: '0.82rem',
              fontWeight: 600,
              lineHeight: 1.4
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{errorMessage || localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Main Password Input */}
          <div>
            <label
              htmlFor="teacher-auth-password"
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: 750,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px'
              }}
            >
              {isSetup ? 'Neues Passwort oder Passphrase' : 'Passwort'}
            </label>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="teacher-auth-password"
                name="teacherPassword"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
                disabled={loading}
                placeholder={isSetup ? 'z. B. blauer wald gitarre fluss' : 'Dein Passwort'}
                style={{
                  width: '100%',
                  padding: '14px 44px 14px 16px',
                  borderRadius: '16px',
                  border: isSetup && password.length > 0
                    ? validation.isValid ? '1.5px solid #34a853' : '1.5px solid #f59e0b'
                    : '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = brandColor;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  if (!isSetup) e.currentTarget.style.borderColor = '#cbd5e1';
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Setup Mode: Confirm Password */}
          {isSetup && (
            <div>
              <label
                htmlFor="teacher-auth-confirm-password"
                style={{
                  display: 'block',
                  fontSize: '11.5px',
                  fontWeight: 750,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '6px'
                }}
              >
                Passwort wiederholen
              </label>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="teacher-auth-confirm-password"
                  name="teacherConfirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  disabled={loading}
                  placeholder="Passwort erneut eingeben"
                  style={{
                    width: '100%',
                    padding: '14px 44px 14px 16px',
                    borderRadius: '16px',
                    border: confirmPassword.length > 0
                      ? confirmPassword === password ? '1.5px solid #34a853' : '1.5px solid #ef4444'
                      : '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = brandColor;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  aria-label={showConfirmPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* Setup Mode: Live Strength & Guidance */}
          {isSetup && password.length > 0 && (
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '16px',
                padding: '12px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {/* Length & Passphrase Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>
                  Länge: <strong>{password.length} Zeichen</strong> {password.length >= 12 ? '✓' : '(mind. 12)'}
                </span>
                {validation.isPassphrase && (
                  <span
                    style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Check size={12} strokeWidth={3} /> Wortfolge aktiv
                  </span>
                )}
              </div>

              {/* Strength Progress Bar */}
              <div
                style={{
                  height: '4px',
                  width: '100%',
                  background: '#e2e8f0',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: !validation.isValid ? '30%' : validation.strength === 'excellent' ? '100%' : '70%',
                    background: !validation.isValid ? '#f59e0b' : validation.strength === 'excellent' ? '#16a34a' : '#3b82f6',
                    transition: 'all 0.25s ease'
                  }}
                />
              </div>

              {/* Status or Error Text */}
              {!validation.isValid ? (
                <div style={{ fontSize: '11.5px', color: '#d97706', fontWeight: 600, lineHeight: 1.35 }}>
                  {validation.error}
                </div>
              ) : (
                <div style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: 700 }}>
                  ✓ Hervorragendes Passwort {validation.isPassphrase ? '(Hohe Entropie durch Wortfolge)' : ''}
                </div>
              )}
            </div>
          )}

          {/* Educational 4-Word Tip in Setup Mode */}
          {isSetup && password.length === 0 && (
            <div
              style={{
                background: '#f0fdf4',
                border: 'none',
                borderRadius: '16px',
                padding: '10px 14px',
                fontSize: '11.5px',
                color: '#166534',
                fontWeight: 600,
                lineHeight: 1.45
              }}
            >
              💡 <strong>Tipp für maximale Sicherheit:</strong> Wähle 3–4 zufällige Wörter mit Leerzeichen (z. B.{' '}
              <em>blauer wald gitarre fluss</em>). Das ist sicherer als Sonderzeichen und kinderleicht zu merken.
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '16px',
              background: canSubmit ? brandColor : '#cbd5e1',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '14.5px',
              border: 'none',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              marginTop: '8px',
              transition: 'all 0.15s ease',
              boxShadow: canSubmit ? `0 4px 14px ${brandColor}40` : 'none'
            }}
          >
            {loading ? 'Wird überprüft...' : isSetup ? 'Passwort speichern & Einloggen' : 'Anmelden'}
          </button>
        </form>

        {/* Switch to Passkey Quick Action (if available) */}
        {!isSetup && canUsePasskey && onSwitchToPasskey && (
          <button
            type="button"
            onClick={onSwitchToPasskey}
            disabled={loading}
            style={{
              marginTop: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '12px',
              color: '#0f172a',
              fontSize: '12.5px',
              fontWeight: 750,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
          >
            <ShieldCheck size={16} color={brandColor} />
            Stattdessen mit Touch ID / Face ID anmelden
          </button>
        )}
      </div>
    </div>
  );
}
