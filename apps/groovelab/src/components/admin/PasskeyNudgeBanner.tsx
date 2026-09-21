import React, { useState, useEffect } from 'react';
import { Fingerprint, X, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import { isWebAuthnSupported, registerBiometrics, saveBiometricProfile } from '../../utils/webauthn';
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
    // Only nudge teachers, admins, and secretaries
    if (!currentUser || !['admin', 'secretary', 'teacher'].includes(currentUser.role)) {
      return;
    }

    if (!isWebAuthnSupported()) {
      return;
    }

    // Check if user dismissed the nudge
    const dismissedUntil = localStorage.getItem(NUDGE_DISMISSED_KEY);
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // Check if biometric profiles already exist for this user
    try {
      const stored = localStorage.getItem('gl_biometric_profiles');
      if (stored) {
        const profiles = JSON.parse(stored);
        if (Array.isArray(profiles) && profiles.some((p: any) => p.userId === currentUser.id)) {
          return; // Already registered on this device!
        }
      }
    } catch (e) {
      console.warn('Error reading biometric profiles:', e);
    }

    setIsVisible(true);
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

      const email = currentUser.email || `${currentUser.role || 'user'}.${currentUser.id.substring(0, 8)}@campus-groovelab.local`;
      const userName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'Mitarbeiter';
      const roleLabel = currentUser.role === 'admin' ? 'Schulleitung' : currentUser.role === 'secretary' ? 'Sekretariat' : 'Lehrkraft';

      const passkeyResult = await registerBiometrics(
        email,
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
        p_public_key: JSON.stringify(passkeyResult.response),
        p_device_name: deviceName,
        p_challenge: chalData.challenge
      });

      if (regErr || !regResult?.success) {
        throw new Error(regErr?.message || regResult?.error || 'Registrierung fehlgeschlagen.');
      }

      // 3. Save to local Biometric Device Vault for instant Quick-Login persistence
      saveBiometricProfile({
        userId: currentUser.id,
        email,
        firstName: currentUser.first_name || '',
        lastName: currentUser.last_name || '',
        role: currentUser.role || 'teacher',
        credentialId: passkeyResult.id,
        sessionToken: currentUser.id,
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
          ? 'calc(var(--bottom-bar-height, 68px) + env(safe-area-inset-bottom) + 16px)' 
          : '24px',
        right: isMobile ? '16px' : '24px',
        left: isMobile ? '16px' : 'auto',
        zIndex: 1050,
        maxWidth: isMobile ? 'calc(100% - 32px)' : '460px',
        width: isMobile ? 'calc(100% - 32px)' : 'auto',
        boxSizing: 'border-box',
        margin: '0',
        padding: '14px 18px',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'translateY(16px) scale(0.96)' : 'translateY(0) scale(1)',
        overflow: 'hidden',
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        borderRadius: '18px',
        background: 'rgba(240, 253, 244, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1.5px solid #86efac',
        boxShadow: '0 16px 36px rgba(22, 101, 52, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        textAlign: 'left',
        pointerEvents: 'auto'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '12px',
          background: '#ffffff',
          color: '#15803d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(21, 128, 61, 0.15)',
          flexShrink: 0
        }}>
          <Fingerprint size={22} strokeWidth={2.3} />
        </div>

        <div>
          <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Schneller &amp; sicherer anmelden mit Passkey</span>
            <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '1px 6px', borderRadius: '6px', background: '#16a34a', color: '#ffffff' }}>
              Empfohlen
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
            {successMsg ? (
              <span style={{ color: '#15803d', fontWeight: 750, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} /> {successMsg}
              </span>
            ) : errorMsg ? (
              <span style={{ color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={14} /> {errorMsg}
              </span>
            ) : (
              'Nutze künftig FaceID, TouchID oder deinen Windows Hello Fingerabdruck – ganz ohne PIN-Eingabe.'
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {!successMsg && (
          <button
            type="button"
            onClick={handleRegisterPasskey}
            disabled={isRegistering}
            style={{
              padding: '7px 14px',
              borderRadius: '10px',
              background: '#15803d',
              color: '#ffffff',
              fontSize: '0.76rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#166534'}
            onMouseOut={(e) => e.currentTarget.style.background = '#15803d'}
          >
            <ShieldCheck size={14} />
            <span>{isRegistering ? 'Wird aktiviert...' : 'Passkey jetzt aktivieren'}</span>
          </button>
        )}

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
            justifyContent: 'center'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#0f172a'}
          onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
