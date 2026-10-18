import React from 'react';
import { Lock, AlertCircle, Music, QrCode, ArrowRight } from 'lucide-react';

export interface LiveLabLockOverlayProps {
  isTeacherRole: boolean;
  isCoupledSchoolIpad: boolean;
  canCheckIn: boolean;
  checkingInStatus: 'idle' | 'locating' | 'verifying' | 'success' | 'error';
  effectiveCheckInHandler?: () => void;
  shakeLock?: boolean;
  effectiveErrorMsg?: string | null;
  onLogout?: () => void;
  viewMode?: string;
  onTabChange?: (tab: string) => void;
  onOpenQrScanner?: () => void;
  variant?: 'blueprint' | 'card' | 'mobile';
}

export const LiveLabLockOverlay: React.FC<LiveLabLockOverlayProps> = ({
  isTeacherRole,
  isCoupledSchoolIpad,
  canCheckIn,
  checkingInStatus,
  effectiveCheckInHandler,
  shakeLock = false,
  effectiveErrorMsg,
  onLogout,
  viewMode,
  onTabChange,
  onOpenQrScanner,
  variant = 'card'
}) => {
  const isMobile = variant === 'mobile';

  // 0,1% Goldstandard: Rollen- und kontextsichere Copywriting-Engine
  const title = isTeacherRole 
    ? 'Live Lab Dozenten-Board' 
    : isCoupledSchoolIpad 
      ? 'Station bereit' 
      : 'GrooveLab Live Lab';

  const subtitle = isTeacherRole
    ? 'Melde dich als Dozent an, um die Band-Stationen in diesem Raum freizuschalten und die Session zu leiten.'
    : isCoupledSchoolIpad
      ? 'Diese iPad-Station ist gekoppelt. Klicke auf „Wieder einchecken“, um deine Band-Session zu starten.'
      : 'Das interaktive Live Lab Board ist vor Ort an den Musikschul-Stationen aktiv. Im Home-Modus kannst du dein Song-Repertoire und Übematerial nutzen.';

  const handleNavigateRepertoire = () => {
    if (onTabChange) {
      onTabChange('repertoire');
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('campus_navigate_tab', { detail: { tab: 'repertoire' } }));
    }
  };

  const handleOpenQr = () => {
    if (onOpenQrScanner) {
      onOpenQrScanner();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('campus_open_qr_scanner'));
    }
  };

  return (
    <div
      role="region"
      aria-label="Live Lab Status und Autorisierung"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(251, 188, 5, 0.25)',
        boxShadow: '0 20px 48px rgba(15, 23, 42, 0.12)',
        borderRadius: isMobile ? '20px' : '24px',
        padding: isMobile ? '24px 20px' : '36px 32px',
        maxWidth: isMobile ? '100%' : '440px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10,
        boxSizing: 'border-box'
      }}
    >
      {/* Soft-Tinted Apple Lock Icon (Zero Color-Clash, border: none) */}
      <div 
        className={shakeLock ? 'shake-lock-active' : ''}
        style={{
          width: isMobile ? '52px' : '64px',
          height: isMobile ? '52px' : '64px',
          borderRadius: '50%',
          background: 'rgba(251, 188, 5, 0.12)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d97706',
          marginBottom: isMobile ? '12px' : '16px'
        }}
      >
        <Lock size={isMobile ? 22 : 28} />
      </div>
      
      {/* Header & Subtitle */}
      <h4 style={{ 
        fontSize: isMobile ? '18px' : '20px', 
        fontWeight: 900, 
        color: '#0f172a', 
        margin: '0 0 8px 0', 
        letterSpacing: '-0.02em' 
      }}>
        {title}
      </h4>
      <p style={{ 
        fontSize: isMobile ? '13px' : '14px', 
        color: '#475569', 
        maxWidth: '360px', 
        margin: '0 0 24px 0', 
        lineHeight: 1.5, 
        fontWeight: 500 
      }}>
        {subtitle}
      </p>

      {/* Action Zone (0,1% Goldstandard: Zero Dead-End) */}
      {checkingInStatus === 'locating' || checkingInStatus === 'verifying' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div 
            className="spin-checkin" 
            style={{ 
              width: '24px', 
              height: '24px', 
              border: '3px solid #fbbc05', 
              borderTopColor: 'transparent', 
              borderRadius: '50%' 
            }} 
          />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#d97706' }}>
            Verbinde mit Live Lab...
          </span>
        </div>
      ) : canCheckIn ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
          <button
            type="button"
            onClick={effectiveCheckInHandler}
            className="pulse-btn-checkin"
            aria-label={isTeacherRole ? "Am Live Lab Board als Dozent anmelden" : "Wieder an iPad-Station einchecken"}
            style={{
              padding: isMobile ? '12px 24px' : '14px 28px',
              borderRadius: '16px',
              background: '#fbbc05',
              border: 'none',
              color: '#0f172a',
              fontSize: isMobile ? '14px' : '15px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: 'none',
              touchAction: 'manipulation',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            {isTeacherRole ? 'Als Dozent anmelden' : 'Wieder einchecken'}
          </button>

          {isCoupledSchoolIpad && !isTeacherRole && (
            <button
              type="button"
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('campus_app_logout'));
                }
              }}
              aria-label="Schüler wechseln und abmelden"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '8px',
                textDecoration: 'underline',
                touchAction: 'manipulation'
              }}
            >
              Schüler wechseln / Abmelden
            </button>
          )}
        </div>
      ) : (
        /* Fallback wenn !canCheckIn: Verhindert leere Fläche / Dead-End */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
          <button
            type="button"
            onClick={handleNavigateRepertoire}
            aria-label="Zum Song-Repertoire wechseln"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: isMobile ? '12px 24px' : '14px 28px',
              borderRadius: '16px',
              background: '#fbbc05',
              border: 'none',
              color: '#0f172a',
              fontSize: isMobile ? '14px' : '15px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: 'none',
              touchAction: 'manipulation',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            <Music size={17} style={{ flexShrink: 0 }} />
            <span>Zum Song-Repertoire</span>
            <ArrowRight size={16} style={{ flexShrink: 0 }} />
          </button>

          <button
            type="button"
            onClick={handleOpenQr}
            aria-label="iPad-Station vor Ort per QR-Code koppeln"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '8px',
              textDecoration: 'underline',
              touchAction: 'manipulation'
            }}
          >
            <QrCode size={15} style={{ flexShrink: 0 }} />
            <span>Vor Ort: Station per QR koppeln</span>
          </button>
        </div>
      )}

      {/* Error Feedback */}
      {checkingInStatus === 'error' && effectiveErrorMsg && (
        <div 
          role="alert"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginTop: '16px', 
            padding: '10px 16px', 
            background: '#fef2f2', 
            border: 'none', 
            borderRadius: '12px', 
            color: '#ef4444', 
            fontSize: '13px', 
            maxWidth: '360px' 
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600, textAlign: 'left' }}>{effectiveErrorMsg}</span>
        </div>
      )}
    </div>
  );
};

export default LiveLabLockOverlay;
