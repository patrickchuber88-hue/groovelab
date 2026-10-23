import React, { useState, useEffect } from 'react';
import { ShieldCheck, Fingerprint, Sparkles, X, Check, AlertCircle } from 'lucide-react';
import { isWebAuthnSupported, registerBiometrics, saveBiometricProfile, getStoredBiometricProfiles } from '../../utils/webauthn';
import { supabase } from '../../lib/supabase';

export interface TeacherPasskeyNudgeBannerProps {
  user: {
    id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
    role?: string;
    has_passkey?: boolean;
  } | null;
  schoolData?: {
    id?: string;
    name?: string;
    primary_color?: string;
  } | null;
  onPasskeyRegistered?: () => void;
}

export function TeacherPasskeyNudgeBanner({
  user,
  schoolData,
  onPasskeyRegistered
}: TeacherPasskeyNudgeBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  const isMac = typeof navigator !== 'undefined' && /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent) && !isIOS;
  const isApple = isIOS || isMac;
  const platformName = isApple ? 'Touch ID / Face ID' : 'Passkey';

  useEffect(() => {
    if (!user || user.has_passkey) {
      setIsVisible(false);
      return;
    }

    // Only show if browser/OS supports WebAuthn
    if (!isWebAuthnSupported()) {
      setIsVisible(false);
      return;
    }

    // Check if passkey is already active on this device
    try {
      const storedProfiles = getStoredBiometricProfiles();
      if (storedProfiles.some((p) => p.userId === user.id)) {
        setIsVisible(false);
        return;
      }
    } catch (e) {
      console.warn('[Passkey Nudge] Error checking stored biometric profiles:', e);
    }

    // Check local dismissal preference
    const dismissKey = `campus_passkey_nudge_dismissed_${user.id}`;
    const dismissedUntil = localStorage.getItem(dismissKey);
    if (dismissedUntil) {
      const expiry = parseInt(dismissedUntil, 10);
      if (Date.now() < expiry) {
        setIsVisible(false);
        return;
      }
    }

    setIsVisible(true);
  }, [user]);

  if (!isVisible || !user) return null;

  const brandColor = schoolData?.primary_color || '#15803d';

  const handleDismiss = (days: number = 7) => {
    const dismissKey = `campus_passkey_nudge_dismissed_${user.id}`;
    const expiry = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(dismissKey, String(expiry));
    setIsVisible(false);
  };

  const handleRegisterPasskey = async () => {
    setLoading(true);
    setStatus('idle');
    setErrorMessage(null);

    try {
      // 1. Fetch authoritative cryptographic challenge from server
      const { data: chalData, error: chalErr } = await supabase.rpc('generate_webauthn_challenge', {
        p_user_id: user.id,
        p_type: 'register'
      });

      if (chalErr || !chalData?.challenge) {
        throw new Error('Sicherheits-Challenge konnte nicht vom Server bezogen werden.');
      }

      const userHandle = `teacher_${user.id.substring(0, 8)}`;
      const teacherName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Lehrkraft';
      const result = await registerBiometrics(
        userHandle,
        user.id,
        chalData.challenge,
        `${teacherName} (Lehrkraft)`
      );

      const deviceName = isApple ? 'Apple Touch ID / Face ID' : 'Passkey Authenticator';

      // 2. Store & bind credential via server-side RPC
      const { data: regResult, error: regErr } = await supabase.rpc('register_webauthn_credential', {
        p_user_id: user.id,
        p_credential_id: result.id,
        p_public_key: JSON.stringify(result.response),
        p_device_name: deviceName,
        p_challenge: chalData.challenge
      });

      if (regErr || !regResult?.success) {
        throw new Error(regErr?.message || regResult?.error || 'Registrierung des Passkeys fehlgeschlagen.');
      }

      // 3. 🛡️ Save to local Biometric Device Vault for instant Quick-Login persistence
      saveBiometricProfile({
        userId: user.id,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        role: user.role || 'teacher',
        credentialId: result.id,
        sessionToken: user.id,
        createdAt: new Date().toISOString()
      });

      setStatus('success');
      if (onPasskeyRegistered) {
        onPasskeyRegistered();
      }

      // Auto-hide after celebration
      setTimeout(() => {
        handleDismiss(365); // Permanently hide since passkey is now registered
      }, 3500);

    } catch (err: any) {
      console.warn('[Passkey Nudge] Registration error or cancelled:', err);
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        setStatus('error');
        setErrorMessage(err?.message || 'Einrichtung fehlgeschlagen.');
      } else {
        setStatus('idle');
      }
    } finally {
      setLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          width: '100%',
          maxWidth: '100%',
          margin: '0 0 16px 0',
          boxSizing: 'border-box',
          background: '#f0fdf4',
          border: 'none',
          borderRadius: '24px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          color: '#166534',
          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.08)'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#15803d',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Check size={22} strokeWidth={3} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '14px' }}>
            {platformName} erfolgreich aktiviert!
          </div>
          <div style={{ fontSize: '12.5px', color: '#15803d', marginTop: '2px' }}>
            Ab dem nächsten Login genügt ein Fingertipp. Deine Unterrichts-Sitzungen sind optimal geschützt.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Sicherheitsempfehlung: Passkey aktivieren"
      style={{
        width: '100%',
        maxWidth: '100%',
        margin: '0 0 16px 0',
        boxSizing: 'border-box',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        padding: isMobile ? '16px' : '18px 24px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: isMobile ? '14px' : '20px',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: '16px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            background: '#ecfdf5',
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Fingerprint size={26} strokeWidth={2.2} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a' }}>
              Schneller &amp; sicherer einloggen mit {platformName}
            </span>
            <span
              style={{
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '10.5px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '8px',
                letterSpacing: '0.04em'
              }}
            >
              EMPFOHLEN
            </span>
          </div>

          <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b', fontWeight: 550, lineHeight: 1.4 }}>
            Überspringe künftig Passwörter im Unterricht. Dein biometrischer Schlüssel schützt Schülerdaten vor neugierigen Blicken am Klavier oder Notenpult.
          </p>

          {status === 'error' && errorMessage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontSize: '11.5px', fontWeight: 700, marginTop: '6px' }}>
              <AlertCircle size={14} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column-reverse' : 'row',
        alignItems: 'center', 
        gap: '10px', 
        flexShrink: 0,
        width: isMobile ? '100%' : 'auto'
      }}>
        <button
          type="button"
          onClick={() => handleDismiss(7)}
          disabled={loading}
          aria-label="Passkey-Einrichtung später erinnern"
          style={{
            background: 'none',
            border: 'none',
            color: '#475569',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '10px 16px',
            borderRadius: '12px',
            transition: 'all 0.15s ease',
            minHeight: '44px',
            minWidth: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isMobile ? '100%' : 'auto'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#f1f5f9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'none'; }}
        >
          Später
        </button>

        <button
          type="button"
          onClick={handleRegisterPasskey}
          disabled={loading}
          style={{
            background: '#15803d',
            color: '#ffffff',
            border: 'none',
            borderRadius: '14px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 3px 10px rgba(21, 128, 61, 0.25)',
            transition: 'all 0.15s ease',
            minHeight: '44px',
            width: isMobile ? '100%' : 'auto'
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#166534'; }}
          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#15803d'; }}
        >
          <Sparkles size={15} />
          {loading ? 'Wird aktiviert...' : 'In 5 Sek. aktivieren'}
        </button>
      </div>
    </div>
  );
}
