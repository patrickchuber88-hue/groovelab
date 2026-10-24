import React, { useState, useEffect } from 'react';
import { Fingerprint, X, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import { isWebAuthnSupported, registerBiometrics, saveBiometricProfile, getStoredBiometricProfiles } from '../../utils/webauthn';
import { supabase } from '../../lib/supabase';

export interface PasskeyNudgeBannerProps {
  currentUser: any;
  onPasskeyRegistered?: () => void;
}

const NUDGE_DISMISSED_KEY = 'campus_passkey_nudge_dismissed_until';

export const PasskeyNudgeBanner: React.FC<PasskeyNudgeBannerProps> = ({
  currentUser,
  onPasskeyRegistered
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkVisibility = () => {
      // Only nudge teachers, admins, and secretaries
      if (!currentUser || !['admin', 'secretary', 'teacher'].includes(currentUser.role)) {
        setIsVisible(false);
        return;
      }

      if (!isWebAuthnSupported()) {
        setIsVisible(false);
        return;
      }

      // Check if user dismissed the nudge
      const dismissedUntil = localStorage.getItem(NUDGE_DISMISSED_KEY);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        setIsVisible(false);
        return;
      }

      // Check if biometric profiles already exist for this user in local vault
      try {
        const stored = getStoredBiometricProfiles();
        if (stored.some((p: any) => p.userId === currentUser.id)) {
          setIsVisible(false);
          return; // Already registered on this device!
        }
      } catch (e) {
        console.warn('Error reading biometric profiles:', e);
      }

      setIsVisible(true);
    };

    checkVisibility();
    window.addEventListener('gl-biometric-vault-updated', checkVisibility);
    return () => window.removeEventListener('gl-biometric-vault-updated', checkVisibility);
  }, [currentUser]);

  const handleDismiss = () => {
    // Dismiss for 14 days
    const nextTime = Date.now() + 14 * 24 * 60 * 60 * 1000;
    localStorage.setItem(NUDGE_DISMISSED_KEY, String(nextTime));
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 380);
  };

  const handleRegisterPasskey = async () => {
    if (!currentUser?.id) return;
    setIsRegistering(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Request registration challenge from server
      const { data: chalData, error: chalErr } = await supabase.rpc('generate_webauthn_challenge', {
        p_user_id: currentUser.id,
        p_type: 'register'
      });
      if (chalErr || !chalData?.challenge) {
        throw new Error('Sicherheits-Challenge konnte nicht bezogen werden: ' + (chalErr?.message || 'Serverfehler'));
      }

      const userHandle = `${currentUser.role || 'user'}_${currentUser.id.substring(0, 8)}`;
      const userName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'Mitarbeiter';
      const roleLabel = currentUser.role === 'admin' ? 'Schulleitung' : currentUser.role === 'secretary' ? 'Sekretariat' : 'Lehrkraft';

      const passkeyResult = await registerBiometrics(
        userHandle,
        currentUser.id,
        chalData.challenge,
        `${userName} (${roleLabel})`
      );

      const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
      const deviceName = isIOS ? 'Apple Touch ID / Face ID' : 'Passkey Authenticator';

      // 2. Store & bind credential via server-side RPC (validates challenge & stores credential)
      const { data: regResult, error: regErr } = await supabase.rpc('register_webauthn_credential', {
        p_user_id: currentUser.id,
        p_credential_id: passkeyResult.id,
        p_public_key: passkeyResult.response?.publicKeySpki || JSON.stringify(passkeyResult.response),
        p_device_name: deviceName,
        p_challenge: chalData.challenge
      });

      if (regErr || !regResult?.success) {
        throw new Error(regErr?.message || regResult?.error || 'Registrierung fehlgeschlagen.');
      }

      // 3. Save to local Biometric Device Vault for instant Quick-Login persistence
      saveBiometricProfile({
        userId: currentUser.id,
        firstName: currentUser.first_name || '',
        lastName: currentUser.last_name || '',
        role: currentUser.role || 'teacher',
        schoolName: currentUser.schools?.name || currentUser.school_name || null,
        credentialId: passkeyResult.id,
        sessionToken: '',
        createdAt: new Date().toISOString()
      });

      setSuccessMsg('Passkey erfolgreich registriert! Ab sofort kannst du dich per FaceID / Fingerabdruck anmelden.');
      if (onPasskeyRegistered) onPasskeyRegistered();
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
        }, 380);
      }, 2800);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        // User cancelled TouchID/FaceID
        return;
      }
      setErrorMsg(err?.message || 'Fehler bei der Passkey-Aktivierung.');
    } finally {
      setIsRegistering(false);
    }
  };

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Sicherheitsempfehlung: Passkey aktivieren"
      style={{
        position: 'fixed',
        bottom: isMobile 
          ? 'calc(var(--bottom-bar-height, 68px) + env(safe-area-inset-bottom, 16px) + 16px)' 
          : '24px',
        right: isMobile ? '16px' : '24px',
        left: isMobile ? '16px' : 'auto',
        zIndex: 1050,
        maxWidth: isMobile ? 'calc(100% - 32px)' : '390px',
        width: isMobile ? 'calc(100% - 32px)' : '390px',
        boxSizing: 'border-box',
        margin: '0',
        padding: '16px',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'translateY(16px) scale(0.96)' : 'translateY(0) scale(1)',
        overflow: 'visible',
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        borderRadius: '20px',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(16, 185, 129, 0.35)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(16, 185, 129, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        textAlign: 'left',
        pointerEvents: 'auto'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'none',
            flexShrink: 0
          }}>
            <Fingerprint size={20} strokeWidth={2.3} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span>Passkey aktivieren</span>
              <span style={{ fontSize: '0.64rem', fontWeight: 800, padding: '1px 6px', borderRadius: '6px', background: '#10b981', color: '#ffffff', border: 'none' }}>
                Empfohlen
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Hinweis für 14 Tage ausblenden"
          title="Später erinnern"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#0f172a';
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#64748b';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 550, lineHeight: 1.45 }}>
        {successMsg ? (
          <span style={{ color: '#059669', fontWeight: 750, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={15} /> {successMsg}
          </span>
        ) : errorMsg ? (
          <span style={{ color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={15} /> {errorMsg}
          </span>
        ) : (
          'Schneller & sicherer anmelden per FaceID, TouchID oder Windows Hello – ganz ohne PIN-Eingabe.'
        )}
      </div>

      {!successMsg && (
        <button
          type="button"
          onClick={handleRegisterPasskey}
          disabled={isRegistering}
          style={{
            width: '100%',
            padding: '9px 16px',
            minHeight: '42px',
            borderRadius: '12px',
            background: '#10b981',
            color: '#ffffff',
            fontSize: '0.80rem',
            fontWeight: 800,
            border: 'none',
            cursor: isRegistering ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: 'none',
            transition: 'all 0.15s ease',
            opacity: isRegistering ? 0.75 : 1
          }}
          onMouseOver={(e) => { if (!isRegistering) e.currentTarget.style.background = '#059669'; }}
          onMouseOut={(e) => { if (!isRegistering) e.currentTarget.style.background = '#10b981'; }}
        >
          <ShieldCheck size={15} />
          <span>{isRegistering ? 'Wird aktiviert...' : 'Passkey jetzt aktivieren'}</span>
        </button>
      )}
    </div>
  );
};
