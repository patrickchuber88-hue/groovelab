import React, { useState, useEffect } from 'react';
import { Lock, Sparkles, ArrowRight, AlertCircle, School } from 'lucide-react';
import { CampusGroovelabBrand } from '../CampusGroovelabBrand';
import { supabase } from '../../lib/supabase';

interface PrivateBetaGateProps {
  onUnlock: () => void;
  onGoToLogin: () => void;
  onShowPrivacy: () => void;
  onShowAgb: () => void;
  onShowImpressum: () => void;
  onShowAccessibility: () => void;
}

export const PrivateBetaGate: React.FC<PrivateBetaGateProps> = ({
  onUnlock,
  onGoToLogin,
  onShowPrivacy,
  onShowAgb,
  onShowImpressum,
  onShowAccessibility
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-Unlock via URL query parameter (?code=... oder ?vip=...) via authoritative RPC
  useEffect(() => {
    let isMounted = true;
    const checkUrlCode = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlCode = params.get('code') || params.get('vip') || params.get('invite');
        if (!urlCode || urlCode.trim().length < 3) return;

        const { data, error: rpcError } = await supabase.rpc('verify_vip_invite_code', {
          p_code: urlCode.trim()
        });

        if (!rpcError && data?.success && isMounted) {
          try {
            localStorage.setItem('campus_vip_access', data.token || 'granted');
          } catch (_) {}
          onUnlock();
        }
      } catch (_) {}
    };

    checkUrlCode();
    return () => { isMounted = false; };
  }, [onUnlock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    const cleaned = inviteCode.trim();

    if (!cleaned || cleaned.length < 3) {
      setError('Bitte geben Sie einen gültigen Einladungscode ein.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('verify_vip_invite_code', {
        p_code: cleaned
      });

      if (rpcError || !data?.success) {
        setError(data?.message || 'Ungültiger Zugangscode. Bitte prüfen Sie die Eingabe.');
        setIsSubmitting(false);
        return;
      }

      try {
        localStorage.setItem('campus_vip_access', data.token || 'granted');
      } catch (_) {}
      onUnlock();
    } catch (_) {
      setError('Verbindungsfehler bei der Code-Prüfung. Bitte versuchen Sie es erneut.');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: 'radial-gradient(ellipse at 50% 0%, #172554 0%, #090d16 70%, #030712 100%)',
      color: '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '24px 16px',
      boxSizing: 'border-box'
    }}>
      {/* Top Bar Header */}
      <header style={{
        maxWidth: '1100px',
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CampusGroovelabBrand size={22} withIcon={true} />
        </div>

        <button
          type="button"
          onClick={onGoToLogin}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            color: '#ffffff',
            padding: '9px 18px',
            borderRadius: '12px',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            touchAction: 'manipulation'
          }}
        >
          <School size={15} style={{ color: '#34a853' }} />
          <span>Schul-Login</span>
        </button>
      </header>

      {/* Main Stage Card */}
      <main style={{
        maxWidth: '520px',
        width: '100%',
        margin: '32px auto',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '28px',
        padding: '36px 32px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}>
        {/* Pilot Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(52, 168, 83, 0.12)',
          border: '1px solid rgba(52, 168, 83, 0.35)',
          color: '#4ade80',
          padding: '6px 14px',
          borderRadius: '999px',
          fontSize: '0.78rem',
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: '20px'
        }}>
          <Lock size={12} style={{ strokeWidth: 3 }} />
          <span>Geschlossene Pilotphase • Private Preview</span>
        </div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 12px 0',
          fontSize: '1.75rem',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          lineHeight: 1.25,
          color: '#ffffff'
        }}>
          Vorschau für Musikschulen
        </h1>

        <p style={{
          margin: '0 0 28px 0',
          fontSize: '0.94rem',
          color: '#94a3b8',
          lineHeight: 1.6
        }}>
          Campus-Groovelab befindet sich aktuell im geschlossenen Pilotbetrieb für ausgewählte Partnerschulen. Der Zugang zur vollständigen Plattformvorschau erfordert einen persönlichen Einladungscode.
        </p>

        {/* Code Input Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
          <div>
            <label htmlFor="vip-invite-code" style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Einladungscode
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="vip-invite-code"
                type="password"
                name="vip-code"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Zugangscode eingeben"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(2, 6, 23, 0.7)',
                  border: error ? '1.5px solid #ef4444' : '1.5px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '16px',
                  padding: '14px 18px',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '0.15em',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              <Sparkles size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#eab308', pointerEvents: 'none' }} />
            </div>
          </div>

          {error && (
            <div role="alert" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#f87171',
              fontSize: '0.82rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              padding: '10px 14px',
              borderRadius: '12px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #34a853 0%, #16a34a 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              padding: '15px 22px',
              fontSize: '0.96rem',
              fontWeight: 800,
              cursor: isSubmitting ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 10px 25px -5px rgba(52, 168, 83, 0.4)',
              transition: 'all 0.2s ease',
              touchAction: 'manipulation',
              opacity: isSubmitting ? 0.75 : 1
            }}
          >
            <span>{isSubmitting ? 'Prüfe Code...' : 'Vorschau freischalten'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Existing User Hint */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
            Ihre Musikschule nimmt bereits teil?{' '}
            <span
              role="button"
              tabIndex={0}
              onClick={onGoToLogin}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGoToLogin(); } }}
              style={{ color: '#34a853', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Hier direkt anmelden
            </span>
          </p>
        </div>
      </main>

      {/* Footer with Legal Links & Disclaimer */}
      <footer style={{
        maxWidth: '1100px',
        width: '100%',
        margin: '0 auto',
        textAlign: 'center',
        padding: '16px 8px 8px 8px'
      }}>
        {/* Legal Disclaimer Box */}
        <div style={{
          fontSize: '0.74rem',
          color: '#64748b',
          lineHeight: 1.5,
          maxWidth: '820px',
          margin: '0 auto 14px auto',
          background: 'rgba(15, 23, 42, 0.5)',
          padding: '10px 16px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <strong>Hinweis zur Projekt-Abgrenzung:</strong> Campus-Groovelab ist eine eigenständige Software- und Lernplattform für Musikschulen von Patrick Huber. Es besteht keinerlei gesellschaftsrechtliche oder organisatorische Verbindung zum GrooveLAB-Projekt der Städtischen Musikschule Lahr bzw. des Freundeskreises der Städtischen Musikschule Lahr e.V.
        </div>

        {/* Legal Links */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          fontSize: '0.80rem',
          color: '#94a3b8',
          flexWrap: 'wrap'
        }}>
          <span
            role="button"
            tabIndex={0}
            onClick={onShowImpressum}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onShowImpressum(); } }}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            Impressum
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={onShowPrivacy}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onShowPrivacy(); } }}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            Datenschutz
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={onShowAgb}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onShowAgb(); } }}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            AGB
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={onShowAccessibility}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onShowAccessibility(); } }}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            Barrierefreiheit
          </span>
        </div>
      </footer>
    </div>
  );
};
