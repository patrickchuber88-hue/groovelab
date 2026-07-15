import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Sliders, Smartphone, Copy, Check, ArrowRight, X } from 'lucide-react';
import QRCode from 'react-qr-code';

interface StudentOnboardingPageProps {
  token: string;
}

export const StudentOnboardingPage: React.FC<StudentOnboardingPageProps> = ({ token }) => {
  const [student, setStudent] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showNotification, setShowNotification] = useState(false);
  const passCardRef = useRef<HTMLDivElement>(null);
  const [walletGuide, setWalletGuide] = useState<'apple' | 'google' | null>(null);

  useEffect(() => {
    const fetchOnboardingDetails = async () => {
      try {
        setLoading(true);
        // Find user by qr_token first, then try id as fallback
        let { data: userData, error: userErr } = await supabase
          .from('users')
          .select('*, schools(*)')
          .eq('qr_token', token)
          .maybeSingle();

        if (!userData && !userErr && token && token.length === 36) {
          const { data: fallbackData, error: fallbackErr } = await supabase
            .from('users')
            .select('*, schools(*)')
            .eq('id', token)
            .maybeSingle();
          if (fallbackData) {
            userData = fallbackData;
            userErr = null;
          } else if (fallbackErr) {
            userErr = fallbackErr;
          }
        }

        if (userErr) throw userErr;
        if (!userData) {
          throw new Error('Ungültiger Onboarding-Link oder Code nicht gefunden.');
        }

        setStudent(userData);
        const schoolObj = Array.isArray(userData.schools) ? userData.schools[0] : userData.schools;
        setSchool(schoolObj);

        // Auto-save this profile to local profiles registry
        if (typeof window !== 'undefined') {
          const registry = JSON.parse(localStorage.getItem('groovelab_local_profiles') || '[]');
          if (!registry.some((p: any) => p.id === userData.id)) {
            registry.push({
              id: userData.id,
              first_name: userData.first_name,
              last_name: userData.last_name,
              photo_url: userData.photo_url,
              role: userData.role,
              school_id: userData.school_id,
              qr_token: userData.qr_token
            });
            localStorage.setItem('groovelab_local_profiles', JSON.stringify(registry));
            console.log('[Onboarding] Profile registered locally:', userData.first_name);
          }
        }
      } catch (err: any) {
        console.error('[Onboarding] Error:', err);
        setError(err.message || 'Verbindungsfehler beim Laden des Profils.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchOnboardingDetails();
    }
  }, [token]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowNotification(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    let timer: any;
    if (!isStandalone) {
      timer = setTimeout(() => {
        setShowNotification(true);
      }, 3500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install: ${outcome}`);
      setDeferredPrompt(null);
      setShowNotification(false);
    } else {
      const guideSection = document.getElementById('pwa-install-section');
      if (guideSection) {
        guideSection.scrollIntoView({ behavior: 'smooth' });
        guideSection.style.transform = 'scale(1.02)';
        setTimeout(() => {
          guideSection.style.transform = 'scale(1)';
        }, 300);
      }
      setShowNotification(false);
    }
  };

  const handleDownloadJPEG = () => {
    if (!student) return;

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isCampus = student.is_campus_active && !student.is_groovelab_active;
    const themeColor = isCampus ? '#137333' : '#eab308';
    const displayAvatar = student.photo_url || '/avatar_ghost.jpg';

    const avatarImg = new Image();
    avatarImg.crossOrigin = 'anonymous';
    
    const qrImage = new Image();
    
    let avatarLoaded = false;
    let qrLoaded = false;
    
    const tryRender = () => {
      if (avatarLoaded && qrLoaded) {
        // Draw card background (White, like the ID Gallery)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 600);

        // Draw Lanyard hole
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 400, 40);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(170, 12, 60, 16, 8);
        ctx.fill();

        // Draw Status Header
        ctx.fillStyle = themeColor;
        ctx.fillRect(0, 40, 400, 25);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(student.role === 'student' ? 'MEMBER ACCESS' : 'STAFF / COACH', 200, 57);

        // Draw Portrait circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(200, 185, 65, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        try {
          ctx.drawImage(avatarImg, 135, 120, 130, 130);
        } catch (e) {
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(135, 120, 130, 130);
        }
        ctx.restore();

        // Draw border around portrait
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(200, 185, 65, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Identity Names
        ctx.fillStyle = '#1e293b';
        ctx.font = '900 28px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(student.first_name, 200, 295);

        ctx.fillStyle = '#64748b';
        ctx.font = '700 16px system-ui, -apple-system, sans-serif';
        ctx.fillText(student.last_name || 'Member', 200, 320);

        // Draw QR Container
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(140, 360, 120, 120, 16);
        ctx.fill();
        ctx.stroke();

        // Draw QR Code image
        ctx.drawImage(qrImage, 145, 365, 110, 110);

        // Draw Bottom Brand Stripe
        const grad = ctx.createLinearGradient(0, 0, 400, 0);
        grad.addColorStop(0, themeColor);
        grad.addColorStop(0.5, '#1e293b');
        grad.addColorStop(1, themeColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 590, 400, 10);

        // Trigger Download
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.download = `MemberPass_${student.first_name}.jpg`;
        link.href = dataUrl;
        link.click();
      }
    };

    avatarImg.onload = () => {
      avatarLoaded = true;
      tryRender();
    };
    avatarImg.onerror = () => {
      avatarLoaded = true;
      tryRender();
    };

    qrImage.onload = () => {
      qrLoaded = true;
      tryRender();
    };
    qrImage.onerror = () => {
      qrLoaded = true;
      tryRender();
    };

    // Load sources
    avatarImg.src = displayAvatar;
    
    const qrSvgElement = document.querySelector('.onboarding-qr-container svg');
    if (qrSvgElement) {
      const svgString = new XMLSerializer().serializeToString(qrSvgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      qrImage.src = URL.createObjectURL(svgBlob);
    } else {
      qrLoaded = true;
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/onboarding/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#09090b', color: '#64748b', fontFamily: 'system-ui' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#eab308', borderRadius: '50%', marginBottom: '16px' }}></div>
        <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>Dein Ausweis wird generiert...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#09090b', color: '#ef4444', padding: '24px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '50%', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '8px', color: '#fca5a5' }}>Fehler beim Laden</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '320px', marginBottom: '24px', lineHeight: 1.5 }}>{error || 'Profil konnte nicht gefunden werden.'}</p>
        <button onClick={() => window.location.replace('/')} style={{ background: '#1e293b', border: 'none', color: '#ffffff', padding: '12px 24px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}>Zur Startseite</button>
      </div>
    );
  }

  const isCampus = student.is_campus_active && !student.is_groovelab_active;
  const activeColor = isCampus ? '#137333' : '#eab308';
  const displayAvatar = student.photo_url || '/avatar_ghost.jpg';

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#1e293b', padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '6px', color: '#1e293b' }}>Willkommen bei GrooveLab</h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Dein persönlicher Onboarding-Bereich</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '32px', maxWidth: '850px', width: '100%', alignItems: 'center', justifyContent: 'center' }} className="onboarding-container">
        
        {/* Pass Card Component Preview */}
        <div ref={passCardRef} style={{
          width: '280px',
          height: '450px',
          background: '#ffffff',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.05)',
          boxSizing: 'border-box',
          flexShrink: 0
        }}>
          {/* Lanyard Hole Mockup */}
          <div style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
            <div style={{ width: '28px', height: '6px', borderRadius: '3px', background: '#0f172a' }}></div>
          </div>

          {/* Status Header */}
          <div style={{ 
            background: activeColor, 
            padding: '6px', 
            textAlign: 'center',
            textTransform: 'uppercase'
          }}>
            <div style={{ color: 'white', fontSize: '0.6rem', fontWeight: 1000, letterSpacing: '0.2em' }}>
              {student.role === 'student' ? 'Member Access' : 'Staff / Coach'}
            </div>
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 32px 20px', gap: '20px' }}>
            {/* Portrait */}
            <div style={{ 
              width: '110px', 
              height: '110px', 
              borderRadius: '50%', 
              border: `3px solid ${activeColor}`,
              padding: '4px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <img 
                src={displayAvatar} 
                alt="Profile"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  borderRadius: '50%'
                }} 
              />
            </div>

            {/* Identity */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 1000, color: '#1e293b', lineHeight: 1.1 }}>
                {student.first_name}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', fontWeight: 700 }}>
                {student.last_name || 'Member'}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="onboarding-qr-container" style={{ 
              background: '#f8fafc', 
              padding: '10px', 
              borderRadius: '16px',
              border: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box'
            }}>
              <QRCode value={`${window.location.origin}/qr/${student.qr_token || student.id}`} size={110} style={{ width: '110px', height: '110px' }} />
            </div>

            <p style={{ 
              fontSize: '0.7rem', 
              color: '#94a3b8', 
              textAlign: 'center', 
              margin: '0', 
              fontWeight: 600, 
              lineHeight: 1.3,
              maxWidth: '220px'
            }}>
              Halte diesen Code vor die Kamera des iPads,<br/>um dich am Platz anzumelden.
            </p>
        </div>
      </div>

      {/* Action Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '380px', width: '100%' }}>
          
          {/* Card Download & Save */}
          <div style={{ background: '#fafafa', border: '1px solid #e4e4e7', borderRadius: '24px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px 0' }}>
              <Download size={18} color={activeColor} /> Member Pass sichern
            </h3>
            
            <button onClick={handleDownloadJPEG} style={{ width: '100%', background: activeColor, color: isCampus ? '#ffffff' : '#0f172a', border: 'none', borderRadius: '14px', padding: '12px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'transform 0.1s' }} className="hover-scale">
              <Download size={16} /> Als JPEG auf Handy speichern
            </button>
            
            <button onClick={handleCopyLink} style={{ width: '100%', background: '#f4f4f5', color: '#18181b', border: '1px solid #d4d4d8', borderRadius: '14px', padding: '12px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {copied ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
              {copied ? 'Link kopiert!' : 'Onboarding-Link kopieren'}
            </button>

            {/* Apple & Google Wallet Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button 
                onClick={() => setWalletGuide(walletGuide === 'apple' ? null : 'apple')}
                style={{ 
                  flex: 1, 
                  background: '#000000', 
                  color: '#ffffff', 
                  border: '1px solid #27272a', 
                  borderRadius: '12px', 
                  padding: '10px', 
                  fontSize: '0.75rem', 
                  fontWeight: 900, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '6px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}
              >
                <span style={{ fontSize: '0.9rem' }}></span> Apple Wallet
              </button>

              <button 
                onClick={() => setWalletGuide(walletGuide === 'google' ? null : 'google')}
                style={{ 
                  flex: 1, 
                  background: '#0f172a', 
                  color: '#ffffff', 
                  border: '1px solid #1e293b', 
                  borderRadius: '12px', 
                  padding: '10px', 
                  fontSize: '0.75rem', 
                  fontWeight: 900, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '6px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}
              >
                Google Wallet
              </button>
            </div>

            {walletGuide && (
              <div style={{ 
                background: '#f4f4f5', 
                border: '1px solid #e4e4e7', 
                borderRadius: '16px', 
                padding: '16px', 
                marginTop: '4px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <button 
                  onClick={() => setWalletGuide(null)} 
                  style={{ 
                    position: 'absolute', 
                    top: '12px', 
                    right: '12px', 
                    background: 'none', 
                    border: 'none', 
                    color: '#71717a', 
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <X size={14} />
                </button>
                <h4 style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0f172a', margin: '0 16px 0 0' }}>
                  {walletGuide === 'apple' ? ' Zu Apple Wallet hinzufügen' : 'Zu Google Wallet hinzufügen'}
                </h4>
                <ol style={{ fontSize: '0.7rem', color: '#52525b', paddingLeft: '16px', margin: '4px 0 0 0', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Tippe oben auf <strong>"Als JPEG auf Handy speichern"</strong>.</li>
                  {walletGuide === 'apple' ? (
                    <>
                      <li>Öffne die <strong>Apple Wallet</strong> App auf deinem iPhone.</li>
                      <li>Tippe oben rechts auf das <strong>(+)-Symbol</strong>.</li>
                      <li>Wähle <strong>"Bordkarte oder Ticket"</strong> und scanne den QR-Code deines Ausweises, oder importiere dein JPEG als Kundenkarte.</li>
                    </>
                  ) : (
                    <>
                      <li>Öffne deine <strong>Google Wallet</strong> App.</li>
                      <li>Tippe unten rechts auf <strong>"Zu Wallet hinzufügen"</strong>.</li>
                      <li>Wähle <strong>"Kundenkarte"</strong>, scanne den QR-Code oder wähle dein gespeichertes Ausweis-JPEG aus.</li>
                    </>
                  )}
                </ol>
              </div>
            )}

            <div style={{ marginTop: '8px', borderTop: '1px solid #e4e4e7', paddingTop: '12px' }}>
              <p style={{ fontSize: '0.72rem', color: '#52525b', margin: '0 0 6px 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Google / Apple Wallet Info:</p>
              <p style={{ fontSize: '0.72rem', color: '#71717a', margin: '0', lineHeight: 1.4 }}>
                Um den Pass in Apple Wallet oder Google Wallet zu nutzen, lade das JPEG herunter und füge es als Bildkarte hinzu, oder scanne den obigen QR-Code direkt in deiner Wallet-App.
              </p>
            </div>
          </div>

          {/* PWA / App Installation Guidance */}
          <div id="pwa-install-section" style={{ background: '#fafafa', border: '1px solid #e4e4e7', borderRadius: '24px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px 0' }}>
              <Smartphone size={18} color={activeColor} /> App auf Handy installieren (WAP)
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#52525b', margin: '0', lineHeight: 1.4 }}>
              Installiere GrooveLab als App auf deinem Startbildschirm für schnellen QR-Login:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', marginTop: '4px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', color: '#52525b' }}>
                <span style={{ background: '#e4e4e7', color: activeColor, borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>1</span>
                <div>
                  <span style={{ fontWeight: 800, color: '#18181b' }}>iOS (Safari):</span> Tippe auf das Teilen-Symbol <span style={{ fontSize: '0.85rem' }}>📤</span> und wähle <span style={{ fontWeight: 800, color: '#18181b' }}>"Zum Home-Bildschirm"</span>.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', color: '#52525b' }}>
                <span style={{ background: '#e4e4e7', color: activeColor, borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>2</span>
                <div>
                  <span style={{ fontWeight: 800, color: '#18181b' }}>Android (Chrome):</span> Tippe auf die drei Punkte oben rechts und wähle <span style={{ fontWeight: 800, color: '#18181b' }}>"App installieren"</span>.
                </div>
              </div>
            </div>

            <button onClick={() => window.location.replace('/login')} style={{ width: '100%', background: '#ffffff', color: '#18181b', border: '1px solid #d4d4d8', borderRadius: '14px', padding: '12px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
              Direkt zum Login <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Apple-style Push Notification for PWA Installation */}
      {showNotification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '400px',
          background: 'rgba(21, 21, 28, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '22px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          zIndex: 9999,
          animation: 'slideDownNotification 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <style>{`
            @keyframes slideDownNotification {
              0% { transform: translate(-50%, -100px); opacity: 0; }
              100% { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
          
          {/* App Icon */}
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '11px',
            background: activeColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            flexShrink: 0
          }}>
            <Smartphone size={20} style={{ color: isCampus ? '#ffffff' : '#0f172a' }} />
          </div>
          
          {/* Text Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>GrooveLab</span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>JETZT</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: 1.3, fontWeight: 500 }}>
              App auf dem Home-Bildschirm speichern für schnellen QR-Login!
            </div>
          </div>
          
          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={handleInstallClick}
              style={{
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '0.7rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Laden
            </button>
            <button
              onClick={() => setShowNotification(false)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#94a3b8',
                border: 'none',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Später
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
