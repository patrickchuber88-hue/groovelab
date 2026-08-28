import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Share, PlusSquare, X, Check, Download, ArrowRight, Sparkles, ShieldCheck
} from 'lucide-react';

interface SmartAppInstallPromptProps {
  appName?: string;
  themeColor?: string;
  isCampus?: boolean;
  onDismiss?: () => void;
}

export const SmartAppInstallPrompt: React.FC<SmartAppInstallPromptProps> = ({
  appName = 'Campus-Groovelab',
  themeColor = '#34a853',
  isCampus = true,
  onDismiss
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Detect Standalone Mode
    const standaloneCheck = 
      (window.navigator as any).standalone === true || 
      window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standaloneCheck);

    // 2. Detect iOS / iPadOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // 3. Android / Chrome beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 4. App Installed Event
    const handleAppInstalled = () => {
      setInstalled(true);
      setShowModal(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isStandalone || installed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('[SmartAppInstall] Error invoking prompt:', err);
      }
    } else if (isIOS) {
      setShowModal(true);
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      {/* ─── COMPACT INLINE / ONBOARDING TRIGGER CARD ─── */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(0,0,0,0.02)',
          padding: 'clamp(14px, 3.5vw, 18px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          boxSizing: 'border-box',
          width: '100%'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: isCampus ? '#f0fdf4' : '#fefce8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isCampus ? '#16a34a' : '#ca8a04',
            flexShrink: 0
          }}>
            <Smartphone size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
              Als App auf Startbildschirm legen
            </span>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 550, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isIOS ? 'Schnellzugriff & Vollbild ohne Safari-Leiste' : '1-Klick App-Installation mit Offline-Modus'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInstallClick}
          style={{
            background: isCampus ? '#16a34a' : '#ca8a04',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '9px 16px',
            fontSize: '0.80rem',
            fontWeight: 800,
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: `0 4px 12px ${isCampus ? 'rgba(22, 163, 74, 0.3)' : 'rgba(202, 138, 4, 0.3)'}`,
            transition: 'all 0.12s ease'
          }}
        >
          <span>{isIOS ? 'Anleitung' : 'Installieren'}</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* ─── VISUAL STEP-BY-STEP MODAL (FOR IOS & GENERAL GUIDANCE) ─── */}
      {showModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(14px, 4vw, 24px)'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25)',
              maxWidth: '440px',
              width: '100%',
              padding: 'clamp(20px, 5vw, 28px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              position: 'relative',
              animation: 'scaleUp 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  background: isCampus ? '#f0fdf4' : '#fefce8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isCampus ? '#16a34a' : '#ca8a04',
                  flexShrink: 0
                }}>
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    {appName} als App nutzen
                  </h3>
                  <p style={{ margin: '1px 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                    In 2 einfachen Schritten auf deinem Home-Bildschirm
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Step 1 & 2 Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Step 1 */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0f172a',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                }}>
                  <Share size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: isCampus ? '#16a34a' : '#ca8a04', textTransform: 'uppercase' }}>
                    Schritt 1
                  </span>
                  <div style={{ fontSize: '0.84rem', fontWeight: 750, color: '#0f172a' }}>
                    Tippe in Safari auf das <strong>Teilen-Symbol</strong>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    (Unten in der Menüleiste deines iPhones/iPads)
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0f172a',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                }}>
                  <PlusSquare size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: isCampus ? '#16a34a' : '#ca8a04', textTransform: 'uppercase' }}>
                    Schritt 2
                  </span>
                  <div style={{ fontSize: '0.84rem', fontWeight: 750, color: '#0f172a' }}>
                    Wähle <strong>„Zum Home-Bildschirm“</strong>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Scrolle etwas nach unten und tippe auf „Hinzufügen“
                  </span>
                </div>
              </div>
            </div>

            {/* Benefit Badge */}
            <div style={{
              background: '#f0fdf4',
              borderRadius: '14px',
              border: '1px solid #bbf7d0',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <ShieldCheck size={18} color="#16a34a" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 650 }}>
                Startet anschließend blitzschnell im echten App-Vollbildmodus ohne störende Browserleisten.
              </span>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '14px',
                border: 'none',
                background: isCampus ? '#16a34a' : '#ca8a04',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: `0 4px 14px ${isCampus ? 'rgba(22, 163, 74, 0.3)' : 'rgba(202, 138, 4, 0.3)'}`
              }}
            >
              Verstanden &amp; Schließen
            </button>
          </div>
        </div>
      )}
    </>
  );
};
