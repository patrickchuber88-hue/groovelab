import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, ArrowRight, X, AlertCircle, CheckCircle2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { verifyRegistrationPassword } from '../utils/cryptoAuth';

interface RegistrationAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email?: string) => void;
  initialEmail?: string;
}

export const RegistrationAccessModal: React.FC<RegistrationAccessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialEmail
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      return parseInt(sessionStorage.getItem('cg_reg_failed_count') || '0', 10) || 0;
    } catch {
      return 0;
    }
  });
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const lock = parseInt(sessionStorage.getItem('cg_reg_lockout_until') || '0', 10);
      return lock > Date.now() ? lock : null;
    } catch {
      return null;
    }
  });
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live countdown timer for progressive rate-limiting
  useEffect(() => {
    if (!lockoutUntil) {
      setCooldownRemaining(0);
      return;
    }

    const updateCooldown = () => {
      const now = Date.now();
      const diffMs = lockoutUntil - now;
      if (diffMs <= 0) {
        setLockoutUntil(null);
        setCooldownRemaining(0);
        try {
          sessionStorage.removeItem('cg_reg_lockout_until');
        } catch {}
      } else {
        setCooldownRemaining(Math.ceil(diffMs / 1000));
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 500);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setIsSuccess(false);
      if (!lockoutUntil || Date.now() >= lockoutUntil) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  }, [isOpen, lockoutUntil]);

  if (!isOpen) return null;

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLockedOut) return;

    if (!password.trim()) {
      setError('Bitte geben Sie das Zugangspasswort ein.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isValid = await verifyRegistrationPassword(password);
      if (isValid) {
        setIsSuccess(true);
        // Reset failed counters on success
        setFailedAttempts(0);
        setLockoutUntil(null);
        try {
          sessionStorage.removeItem('cg_reg_failed_count');
          sessionStorage.removeItem('cg_reg_lockout_until');
        } catch {}

        setTimeout(() => {
          onSuccess(initialEmail);
        }, 350);
      } else {
        const nextCount = failedAttempts + 1;
        setFailedAttempts(nextCount);
        try {
          sessionStorage.setItem('cg_reg_failed_count', nextCount.toString());
        } catch {}

        // Progressive exponential lockout thresholds (3 strikes free)
        if (nextCount >= 3) {
          let penaltySeconds = 10;
          if (nextCount === 4) penaltySeconds = 30;
          if (nextCount >= 5) penaltySeconds = 120;

          const lockTime = Date.now() + (penaltySeconds * 1000);
          setLockoutUntil(lockTime);
          try {
            sessionStorage.setItem('cg_reg_lockout_until', lockTime.toString());
          } catch {}

          setError(`Sicherheitssperre: Zu viele Fehleingaben. Bitte warten Sie ${penaltySeconds} Sekunden.`);
        } else {
          setError(`Ungültiges Zugangspasswort (Versuch ${nextCount} von 3 vor Cooldown).`);
        }

        setLoading(false);
        inputRef.current?.select();
      }
    } catch (err) {
      console.error('[RegistrationAccessModal] Verification error:', err);
      setError('Verifizierungsfehler. Bitte versuchen Sie es erneut.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="reg-gate-title"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Schließen"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
            e.currentTarget.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <X size={16} />
        </button>

        {/* Icon & Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '18px',
            background: isSuccess ? '#dcfce7' : '#e6f4ea',
            color: isSuccess ? '#16a34a' : '#34a853',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px -4px rgba(52, 168, 83, 0.2)'
          }}>
            {isSuccess ? <CheckCircle2 size={30} /> : <ShieldCheck size={30} />}
          </div>

          <div>
            <h3 id="reg-gate-title" style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 850,
              color: '#0f172a',
              letterSpacing: '-0.02em'
            }}>
              Geschützter Registrierungszugang
            </h3>
            <p style={{
              margin: '6px 0 0',
              fontSize: '0.84rem',
              color: '#64748b',
              lineHeight: 1.5
            }}>
              Die Schulanmeldung für <strong>Campus-Groovelab</strong> ist passwortgeschützt. Bitte geben Sie das Zugangspasswort ein, um fortzufahren.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label 
              htmlFor="reg-gate-input" 
              style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}
            >
              Zugangspasswort
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Lock size={18} />
              </div>
              <input
                id="reg-gate-input"
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                placeholder={isLockedOut ? `Gesperrt für noch ${cooldownRemaining}s...` : 'Passwort eingeben...'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading || isSuccess || isLockedOut}
                style={{
                  width: '100%',
                  padding: '13px 44px 13px 42px',
                  borderRadius: '14px',
                  border: isLockedOut 
                    ? '1.5px solid #f97316' 
                    : (error ? '1.5px solid #ef4444' : (isSuccess ? '1.5px solid #22c55e' : '1.5px solid #cbd5e1')),
                  background: isLockedOut ? '#fff7ed' : '#f8fafc',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: isLockedOut ? '#9a3412' : '#0f172a',
                  outline: 'none',
                  boxShadow: error ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : (isLockedOut ? '0 0 0 3px rgba(249, 115, 22, 0.15)' : 'none'),
                  transition: 'all 0.15s'
                }}
                onFocus={(e) => {
                  if (!error && !isLockedOut) {
                    e.currentTarget.style.borderColor = '#34a853';
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(52, 168, 83, 0.15)';
                  }
                }}
                onBlur={(e) => {
                  if (!error && !isLockedOut) {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLockedOut}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: isLockedOut ? 'not-allowed' : 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {isLockedOut ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#c2410c',
                background: '#ffedd5',
                border: '1px solid #fed7aa',
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginTop: '8px'
              }}>
                <Lock size={15} style={{ flexShrink: 0 }} />
                <span>Sicherheitssperre aktiv: Bitte warten Sie <strong>{cooldownRemaining}s</strong></span>
              </div>
            ) : error ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#dc2626',
                fontSize: '0.78rem',
                fontWeight: 600,
                marginTop: '8px',
                animation: 'shake 0.3s ease-in-out'
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '13px',
                borderRadius: '100px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.90rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || isSuccess || isLockedOut}
              style={{
                flex: 1.4,
                padding: '13px',
                borderRadius: '100px',
                border: 'none',
                background: isLockedOut ? '#94a3b8' : (isSuccess ? '#16a34a' : '#34a853'),
                color: '#ffffff',
                fontSize: '0.90rem',
                fontWeight: 800,
                cursor: (loading || isLockedOut) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isLockedOut ? 'none' : '0 4px 14px rgba(52, 168, 83, 0.25)',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                if (!loading && !isSuccess && !isLockedOut) {
                  e.currentTarget.style.background = '#2e944b';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && !isSuccess && !isLockedOut) {
                  e.currentTarget.style.background = '#34a853';
                  e.currentTarget.style.transform = 'none';
                }
              }}
            >
              {loading ? (
                <span>Wird geprüft...</span>
              ) : isLockedOut ? (
                <span>Gesperrt ({cooldownRemaining}s)</span>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>Freigeschaltet!</span>
                </>
              ) : (
                <>
                  <span>Freischalten</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security badge footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '0.70rem',
          color: '#64748b',
          fontWeight: 600,
          borderTop: '1px solid #f1f5f9',
          paddingTop: '12px'
        }}>
          <Sparkles size={13} color="#34a853" />
          <span>PBKDF2-HMAC-SHA-512 (100.000 Runden) • BSI TR-02102-1 Schutz</span>
        </div>
      </div>
    </div>
  );
};
