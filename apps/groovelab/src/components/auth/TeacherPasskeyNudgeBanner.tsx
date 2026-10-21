import React, { useState, useEffect } from 'react';
import { ShieldCheck, Fingerprint, Sparkles, X, Check, AlertCircle } from 'lucide-react';
import { isWebAuthnSupported, registerBiometrics } from '../../utils/webauthn';
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

  const brandColor = schoolData?.primary_color || '#16a34a';

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
      const result = await registerBiometrics(
        userHandle,
        user.id,
        chalData.challenge
      );

      // 2. Store & bind credential via server-side RPC
      const { data: regResult, error: regErr } = await supabase.rpc('register_webauthn_credential', {
        p_user_id: user.id,
        p_credential_id: result.id,
        p_public_key: JSON.stringify(result.response),
        p_device_name: 'Lehrkraft Passkey',
        p_challenge: chalData.challenge
      });

      if (regErr || !regResult?.success) {
        throw new Error(regErr?.message || regResult?.error || 'Registrierung des Passkeys fehlgeschlagen.');
      }

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
        style={{
          margin: '16px auto',
          maxWidth: '860px',
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
            background: '#34a853',
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
            Touch ID / Face ID erfolgreich aktiviert!
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
      style={{
        margin: '16px auto',
        maxWidth: '860px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            background: '#ecfdf5',
            color: brandColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Fingerprint size={26} strokeWidth={2.2} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a' }}>
              Schneller &amp; sicherer einloggen mit Touch ID / Face ID
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
              0,1% GOLDSTANDARD
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => handleDismiss(7)}
          disabled={loading}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: '12px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#475569'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
        >
          Später
        </button>

        <button
          type="button"
          onClick={handleRegisterPasskey}
          disabled={loading}
          style={{
            background: brandColor,
            color: '#ffffff',
            border: 'none',
            borderRadius: '14px',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: `0 3px 10px ${brandColor}35`,
            transition: 'all 0.15s ease'
          }}
        >
          <Sparkles size={15} />
          {loading ? 'Wird aktiviert...' : 'In 5 Sek. aktivieren'}
        </button>
      </div>
    </div>
  );
}
