import React, { useEffect } from 'react';

export interface PwaInstallationModalsProps {
  showInstallBanner: boolean;
  setShowInstallBanner: (show: boolean) => void;
  showInstallGuide: boolean;
  setShowInstallGuide: (show: boolean) => void;
  activePlatform: string;
  deferredPrompt: any;
  handleInstallPWA: () => void;
  handleDismissInstall?: () => void;
}

export const PwaInstallationModals: React.FC<PwaInstallationModalsProps> = ({
  showInstallBanner,
  setShowInstallBanner,
  showInstallGuide,
  setShowInstallGuide,
  activePlatform,
  deferredPrompt,
  handleInstallPWA,
  handleDismissInstall
}) => {
  // Close guide modal on Escape key
  useEffect(() => {
    if (!showInstallGuide) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowInstallGuide(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInstallGuide, setShowInstallGuide]);

  const onDismiss = handleDismissInstall || (() => {
    setShowInstallBanner(false);
    localStorage.setItem('groovelab_install_prompt_dismissed', String(Date.now()));
  });

  const isCampus = activePlatform === 'campus';
  const brandColor = isCampus ? '#34a853' : '#facc15';
  const brandTextColor = isCampus ? '#ffffff' : '#0f172a';
  const brandIcon = isCampus ? '🎓' : '⚡';
  const appDisplayName = isCampus ? 'Campus App' : 'GrooveLab';

  const isApple = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <>
      {showInstallBanner && (
        <div 
          role="region"
          aria-label="App Installation"
          style={{
            position: 'fixed',
            top: '12px',
            left: '16px',
            right: '16px',
            margin: '0 auto',
            maxWidth: '440px',
            background: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '16px',
            padding: '10px 14px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'appleAlertScaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            pointerEvents: 'auto',
            boxSizing: 'border-box'
          }}
        >
          {/* App Icon (Actual App Logo) */}
          <img 
            src="/pwa-icon.png" 
            alt="App Logo" 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              objectFit: 'cover',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              flexShrink: 0
            }}
          />

          {/* 2-line Text content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
              {appDisplayName} installieren
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: 550, color: '#64748b', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {typeof window !== 'undefined' ? window.location.hostname : 'groovelab.app'}
            </span>
          </div>

          {/* Action & Close buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {isApple ? (
              <button 
                type="button"
                onClick={() => setShowInstallGuide(true)}
                style={{
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '100px',
                  padding: '6px 14px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  minHeight: '30px',
                  transition: 'background 0.2s',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
                aria-label="Installationsanleitung öffnen"
              >
                Anleitung
              </button>
            ) : deferredPrompt ? (
              <button 
                type="button"
                onClick={handleInstallPWA}
                style={{
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '100px',
                  padding: '6px 14px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  minHeight: '30px',
                  transition: 'background 0.2s',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
                aria-label="App jetzt installieren"
              >
                Installieren
              </button>
            ) : (
              <button 
                type="button"
                onClick={() => setShowInstallGuide(true)}
                style={{
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '100px',
                  padding: '6px 14px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  minHeight: '30px',
                  transition: 'background 0.2s',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
                aria-label="Installationsanleitung öffnen"
              >
                Anleitung
              </button>
            )}
            <button 
              type="button"
              onClick={onDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 700,
                touchAction: 'manipulation'
              }}
              title="Schließen"
              aria-label="Installations-Banner schließen"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {showInstallGuide && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label={`${appDisplayName} Installationsanleitung`}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={() => setShowInstallGuide(false)}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '380px',
              padding: '24px',
              boxShadow: '0 30px 60px rgba(0, 0, 0, 0.25), 0 0 1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              position: 'relative',
              animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '11px',
                background: isCampus 
                  ? 'linear-gradient(135deg, #34a853 0%, #34a853 100%)'
                  : 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: brandTextColor,
                fontSize: '1.5rem',
                boxShadow: isCampus ? '0 4px 12px rgba(52, 168, 83, 0.2)' : '0 4px 12px rgba(234, 179, 8, 0.25)'
              }}>
                {brandIcon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                  {appDisplayName} installieren
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 550, color: '#64748b' }}>
                  Für den Homescreen auf deinem Smartphone
                </span>
              </div>
            </div>

            {/* Instruction steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '8px 0' }}>
              {isApple ? (
                // iOS Safari Instructions
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isCampus ? 'rgba(52, 168, 83, 0.08)' : 'rgba(234, 179, 8, 0.15)',
                      color: isCampus ? '#34a853' : '#a16207',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      1
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.4, flex: 1 }}>
                      Tippe unten (auf dem iPad oben) im Safari-Browser auf das <strong>Teilen-Symbol</strong>.
                      <div style={{
                        marginTop: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f1f5f9',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        color: '#007aff',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        gap: '6px'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <polyline points="16 6 12 2 8 6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                        Teilen-Symbol
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isCampus ? 'rgba(52, 168, 83, 0.08)' : 'rgba(234, 179, 8, 0.15)',
                      color: isCampus ? '#34a853' : '#a16207',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      2
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.4, flex: 1 }}>
                      Scrolle nach unten und wähle <strong>Zum Home-Bildschirm</strong>.
                      <div style={{
                        marginTop: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f1f5f9',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        color: '#334155',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        gap: '8px'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <line x1="12" y1="8" x2="12" y2="16" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        Zum Home-Bildschirm
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isCampus ? 'rgba(52, 168, 83, 0.08)' : 'rgba(234, 179, 8, 0.15)',
                      color: isCampus ? '#34a853' : '#a16207',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      3
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.4, flex: 1 }}>
                      Tippe oben rechts auf <strong>Hinzufügen</strong>.
                    </div>
                  </div>
                </>
              ) : (
                // Android/Chrome Instructions
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isCampus ? 'rgba(52, 168, 83, 0.08)' : 'rgba(234, 179, 8, 0.15)',
                      color: isCampus ? '#34a853' : '#a16207',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      1
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.4, flex: 1 }}>
                      Tippe oben rechts im Browser auf das <strong>Menü-Symbol (3 Punkte)</strong>.
                      <div style={{
                        marginTop: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f1f5f9',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        color: '#334155',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        gap: '6px'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                        Menü
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isCampus ? 'rgba(52, 168, 83, 0.08)' : 'rgba(234, 179, 8, 0.15)',
                      color: isCampus ? '#34a853' : '#a16207',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      2
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.4, flex: 1 }}>
                      Wähle <strong>App installieren</strong> oder <strong>Zum Startbildschirm hinzufügen</strong>.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isCampus ? 'rgba(52, 168, 83, 0.08)' : 'rgba(234, 179, 8, 0.15)',
                      color: isCampus ? '#34a853' : '#a16207',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      3
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.4, flex: 1 }}>
                      Bestätige die Installation.
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Help / Tip Box */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '12px',
              fontSize: '0.8rem',
              color: '#475569',
              lineHeight: 1.4,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                💡 App nicht auffindbar?
              </span>
              <span>
                {isApple ? (
                  'Unter iOS landen neu hinzugefügte Apps manchmal nur in der App-Mediathek (ganz rechts). Du kannst das Symbol von dort einfach auf deinen Home-Bildschirm ziehen.'
                ) : (
                  `Einige Android-Launcher platzieren Apps direkt in der App-Übersicht (App Drawer). Suche dort nach "${appDisplayName}", halte das Symbol gedrückt und ziehe es auf deinen Startbildschirm.`
                )}
              </span>
            </div>

            {/* Close Button */}
            <button 
              type="button"
              onClick={() => setShowInstallGuide(false)}
              style={{
                background: brandColor,
                color: brandTextColor,
                border: 'none',
                borderRadius: '14px',
                padding: '12px',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: isCampus ? '0 4px 14px rgba(52, 168, 83, 0.2)' : '0 4px 14px rgba(234, 179, 8, 0.25)',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                touchAction: 'manipulation',
                minHeight: '44px'
              }}
              className="hover-scale"
              aria-label="Anleitung schließen"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}
    </>
  );
};
