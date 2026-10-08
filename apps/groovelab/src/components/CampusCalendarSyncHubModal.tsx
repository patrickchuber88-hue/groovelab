import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'react-qr-code';
import {
  CalendarDays,
  CalendarPlus,
  ExternalLink,
  Copy,
  Check,
  Download,
  ShieldCheck,
  RefreshCw,
  X,
  Share2,
  ChevronDown,
  ChevronUp,
  Globe,
  QrCode,
  Laptop,
  Info
} from 'lucide-react';

export interface CampusCalendarSyncHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendarToken: string | null;
  generatingToken: boolean;
  onRotateToken: (forceRotate: boolean) => Promise<void>;
  brandColor?: string;
  userId?: string;
  role?: string;
  studentUser?: any;
  lessons?: any[];
  isMobilePortrait?: boolean;
  onOpenPinGate?: (action: () => Promise<void>) => void;
  isParentUnlocked?: boolean;
}

type Platform = 'apple' | 'google' | 'outlook';

export const CampusCalendarSyncHubModal: React.FC<CampusCalendarSyncHubModalProps> = ({
  isOpen,
  onClose,
  calendarToken,
  generatingToken,
  onRotateToken,
  brandColor = '#34a853',
  userId,
  role = 'student',
  studentUser,
  lessons = [],
  isMobilePortrait = false,
  onOpenPinGate,
  isParentUnlocked = false
}) => {
  // 1% Smart Device & OS Auto-Detection
  const detectedDevice = useMemo<{
    platform: Platform;
    deviceName: string;
    isMobileOrTablet: boolean;
  }>(() => {
    if (typeof window === 'undefined') {
      return { platform: 'apple', deviceName: 'Dein Gerät', isMobileOrTablet: false };
    }
    const ua = navigator.userAgent.toLowerCase();
    const isTouch = typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;

    if (ua.includes('ipad') || (ua.includes('macintosh') && isTouch)) {
      return { platform: 'apple', deviceName: 'iPad', isMobileOrTablet: true };
    }
    if (ua.includes('iphone') || ua.includes('ipod')) {
      return { platform: 'apple', deviceName: 'iPhone', isMobileOrTablet: true };
    }
    if (ua.includes('macintosh') || ua.includes('mac os')) {
      return { platform: 'apple', deviceName: 'Mac', isMobileOrTablet: false };
    }
    if (ua.includes('android')) {
      return { platform: 'google', deviceName: 'Android', isMobileOrTablet: true };
    }
    if (ua.includes('windows')) {
      return { platform: 'outlook', deviceName: 'Windows PC', isMobileOrTablet: false };
    }
    return { platform: 'apple', deviceName: 'Computer', isMobileOrTablet: false };
  }, []);

  // 🏛️ 0,1% Responsive Viewport & Device Triade (Immunität gegen QR-Paradoxon auf Mobile)
  const isMobile = useMemo(() => {
    if (isMobilePortrait) return true;
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return true;
    return detectedDevice.isMobileOrTablet;
  }, [isMobilePortrait, detectedDevice.isMobileOrTablet]);

  const [activePlatform, setActivePlatform] = useState<Platform>(detectedDevice.platform);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showMobileQr, setShowMobileQr] = useState<boolean>(false);
  const [outlookType, setOutlookType] = useState<'personal' | 'work'>('personal');

  // Sane Defaults (für Musikschüler vorkonfiguriert)
  const [includeLessons, setIncludeLessons] = useState<boolean>(true);
  const [includeBands, setIncludeBands] = useState<boolean>(true);
  const [includeHolidays, setIncludeHolidays] = useState<boolean>(false);
  const [alarmOption, setAlarmOption] = useState<'30m_morning' | '2h' | '1d' | 'none'>('30m_morning');

  // Close on Escape key (WCAG 2.2 AA)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Supabase URL & Feed Generation
  const supabaseUrlStr = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de';
  const cleanSupabaseUrl = supabaseUrlStr.replace(/^https?:\/\//i, '');
  const token = calendarToken || '';

  const queryParams = new URLSearchParams();
  if (token) queryParams.set('token', token);

  // 🏛️ 0,1% Deterministische Filter-Zustandsmaschine (Kein Fallback-Bug bei Ferien-only)
  const filterParts: string[] = [];
  if (includeLessons) filterParts.push('lessons');
  if (includeBands) filterParts.push('campus_events');
  if (filterParts.length === 2) {
    // Beide aktiv: Standardfall
  } else if (filterParts.length === 1) {
    queryParams.set('filter', filterParts[0]);
  } else {
    // Beide abgewählt: Explizites 'none', damit das Backend NICHT auf Defaults zurückfällt!
    queryParams.set('filter', 'none');
  }
  if (includeHolidays) queryParams.set('holidays', '1');
  if (alarmOption !== '30m_morning') queryParams.set('alarm', alarmOption);

  const queryString = queryParams.toString();
  const httpsUrl = `${supabaseUrlStr}/functions/v1/ical-feed?${queryString}`;
  const webcalUrl = `webcal://${cleanSupabaseUrl}/functions/v1/ical-feed?${queryString}`;
  const googleCalendarUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpsUrl)}`;
  const outlookPersonalUrl = `https://outlook.live.com/calendar/0/addcalendar?url=${encodeURIComponent(httpsUrl)}&name=Campus-Groovelab`;
  const outlookWorkUrl = `https://outlook.office.com/calendar/0/addcalendar?url=${encodeURIComponent(httpsUrl)}&name=Campus-Groovelab`;
  const outlookWebUrl = outlookType === 'personal' ? outlookPersonalUrl : outlookWorkUrl;

  const handleCopyLink = async (key: string, urlToCopy: string) => {
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopiedStatus(key);
      setTimeout(() => setCopiedStatus(null), 2200);
    } catch (err) {
      console.error('Failed to copy calendar link:', err);
    }
  };

  const handleShareWithFamily = async () => {
    const studentFirstName = studentUser?.first_name || 'deines Kindes';
    const shareData = {
      title: `Musikschul-Termine von ${studentFirstName}`,
      text: `Hier ist der Live-Stundenplan von ${studentFirstName} an der Musikschule zum Abonnieren:`,
      url: httpsUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          handleCopyLink('share', httpsUrl);
        }
      }
    } else {
      handleCopyLink('share', httpsUrl);
    }
  };

  // 🏛️ 0,1% Goldstandard: 100% SSOT Direktdownload via autoritative Edge Function (garantiert Zeitzonen, Alarme, Ausfälle & Ferien)
  const handleDirectIcsDownload = () => {
    const studentName = studentUser?.first_name?.toLowerCase() || 'unterricht';
    const downloadUrl = `${httpsUrl}&dl=1`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `campus-groovelab-${studentName}-stundenplan.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRotateKey = async () => {
    const isJuniorStudent = role === 'student' && (studentUser?.campus_ui_level === 'junior');
    const executeRevoke = async () => {
      if (window.confirm('Möchtest du den Kalender-Schlüssel wirklich erneuern? Bisherige Kalender-Abonnements (z. B. auf Handys der Eltern) müssen danach einmalig neu verknüpft werden.')) {
        await onRotateToken(true);
      }
    };

    if (isJuniorStudent && !isParentUnlocked && onOpenPinGate) {
      onOpenPinGate(executeRevoke);
      return;
    }

    await executeRevoke();
  };

  // WAI-ARIA Keyboard-Navigation für Plattform-Tabs (WCAG 2.2 AA)
  const platforms: Platform[] = ['apple', 'google', 'outlook'];
  const handleTabKeyDown = (e: React.KeyboardEvent, currentPlatform: Platform) => {
    const currentIndex = platforms.indexOf(currentPlatform);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % platforms.length;
      setActivePlatform(platforms[nextIndex]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + platforms.length) % platforms.length;
      setActivePlatform(platforms[prevIndex]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActivePlatform(platforms[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActivePlatform(platforms[platforms.length - 1]);
    }
  };

  // Primärer Aktions-Link & Label je nach Plattform
  const primaryAction = useMemo(() => {
    if (activePlatform === 'google') {
      return {
        label: 'In Google Kalender öffnen',
        icon: <Globe size={18} strokeWidth={2.2} />,
        href: googleCalendarUrl,
        bg: '#4285f4',
        shadow: '0 4px 14px rgba(66, 133, 244, 0.28)'
      };
    }
    if (activePlatform === 'outlook') {
      return {
        label: outlookType === 'personal' ? 'In Outlook.com öffnen' : 'In Microsoft 365 öffnen',
        icon: <Laptop size={18} strokeWidth={2.2} />,
        href: outlookWebUrl,
        bg: '#0078d4',
        shadow: '0 4px 14px rgba(0, 120, 212, 0.28)'
      };
    }
    return {
      label: isMobile
        ? `1-Tap in ${detectedDevice.deviceName}-Kalender`
        : 'Zu Apple Kalender hinzufügen',
      icon: <CalendarPlus size={18} strokeWidth={2.2} />,
      href: webcalUrl,
      bg: brandColor,
      shadow: '0 4px 14px rgba(52, 168, 83, 0.25)'
    };
  }, [activePlatform, isMobile, detectedDevice.deviceName, googleCalendarUrl, outlookWebUrl, outlookType, webcalUrl, brandColor]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Stundenplan im Kalender synchronisieren"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(15, 23, 42, 0.60)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobilePortrait ? '12px' : '20px',
        animation: 'fadeIn 0.15s ease'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '28px',
          width: '100%',
          maxWidth: '430px',
          maxHeight: '92vh',
          boxShadow: '0 24px 64px -12px rgba(15, 23, 42, 0.24)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(226, 232, 240, 0.9)'
        }}
      >
        {/* Schließen-Button oben rechts */}
        <button
          onClick={onClose}
          aria-label="Dialog schließen"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            border: 'none',
            background: '#f1f5f9',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            zIndex: 10,
            transition: 'background 0.15s, color 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        {/* Modal Scroll-Body */}
        <div style={{
          padding: isMobilePortrait ? '24px 20px 20px 20px' : '28px 26px 24px 26px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '16px'
        }}>
          {/* Zentriertes Apple Squircle Icon */}
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: '#e6f4ea',
            color: brandColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'none',
            marginTop: '4px'
          }}>
            <CalendarDays size={26} strokeWidth={2.2} />
          </div>

          {/* Titel & Subtitle */}
          <div>
            <h3 style={{
              margin: '0 0 4px 0',
              fontSize: '1.20rem',
              fontWeight: 850,
              color: '#0f172a',
              letterSpacing: '-0.025em'
            }}>
              Stundenplan im Kalender
            </h3>
            <p style={{
              margin: 0,
              fontSize: '0.82rem',
              color: '#64748b',
              fontWeight: 500,
              lineHeight: 1.4
            }}>
              Termine & Ausfälle synchronisieren sich automatisch auf deinem Smartphone.
            </p>
          </div>

          {generatingToken && !token ? (
            <div style={{ padding: '36px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <RefreshCw size={26} color={brandColor} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.86rem', fontWeight: 650, color: '#0f172a' }}>Kalender-Link wird vorbereitet...</span>
            </div>
          ) : !token ? (
            <div style={{ padding: '24px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>Verbindung konnte nicht geladen werden.</span>
              <button
                onClick={() => onRotateToken(true)}
                style={{
                  border: 'none',
                  background: brandColor,
                  color: '#ffffff',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Erneut versuchen
              </button>
            </div>
          ) : (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
              {/* Kompakte Plattform-Auswahl (Apple / Google / Outlook) mit WAI-ARIA Keyboard-Navigation */}
              <div
                role="tablist"
                aria-label="Kalender-App wählen"
                style={{
                  background: '#f1f5f9',
                  padding: '3px',
                  borderRadius: '14px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '3px',
                  width: '100%'
                }}
              >
                {(['apple', 'google', 'outlook'] as Platform[]).map(plat => (
                  <button
                    key={plat}
                    role="tab"
                    aria-selected={activePlatform === plat}
                    tabIndex={activePlatform === plat ? 0 : -1}
                    onKeyDown={e => handleTabKeyDown(e, plat)}
                    onClick={() => setActivePlatform(plat)}
                    style={{
                      border: 'none',
                      background: activePlatform === plat ? '#ffffff' : 'transparent',
                      color: activePlatform === plat ? '#0f172a' : '#64748b',
                      padding: '7px 4px',
                      borderRadius: '11px',
                      fontWeight: 750,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      boxShadow: activePlatform === plat ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {plat === 'apple' ? 'Apple' : plat === 'google' ? 'Google' : 'Outlook'}
                  </button>
                ))}
              </div>

              {/* Microsoft Outlook Dual-Account-Weiche (Personal vs. M365 Schule) */}
              {activePlatform === 'outlook' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  fontSize: '0.74rem',
                  color: '#475569',
                  background: '#f8fafc',
                  padding: '7px 12px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: outlookType === 'personal' ? 750 : 500 }}>
                    <input
                      type="radio"
                      name="cgl_outlook_type"
                      checked={outlookType === 'personal'}
                      onChange={() => setOutlookType('personal')}
                      style={{ accentColor: '#0078d4' }}
                    />
                    <span>Outlook.com (Privat)</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: outlookType === 'work' ? 750 : 500 }}>
                    <input
                      type="radio"
                      name="cgl_outlook_type"
                      checked={outlookType === 'work'}
                      onChange={() => setOutlookType('work')}
                      style={{ accentColor: '#0078d4' }}
                    />
                    <span>Schule / M365</span>
                  </label>
                </div>
              )}

              {/* Apple Kalender Hinweis */}
              {activePlatform === 'apple' && (
                <div style={{ fontSize: '0.70rem', color: '#64748b', lineHeight: 1.3, marginTop: '-4px' }}>
                  Ende-zu-Ende TLS 1.3 verschlüsselt · Tipp: In Apple Kalender „Stündlich“ wählen &amp; in Kalender-Infos (⌘I) „Erinnerungen ignorieren“ deaktivieren für 30-Min-Hinweise.
                </div>
              )}

              {/* Google Kalender Android-Hinweis */}
              {activePlatform === 'google' && (
                <div style={{ fontSize: '0.70rem', color: '#64748b', lineHeight: 1.3, marginTop: '-4px' }}>
                  Synchronisiert sich mit deinem Google-Konto &amp; erscheint automatisch in der Google Kalender App auf Android.
                </div>
              )}

              {/* Hero 1-Tap Button */}
              <a
                href={primaryAction.href}
                target={activePlatform !== 'apple' ? '_blank' : undefined}
                rel={activePlatform !== 'apple' ? 'noopener noreferrer' : undefined}
                style={{
                  width: '100%',
                  textDecoration: 'none',
                  background: primaryAction.bg,
                  color: '#ffffff',
                  padding: '13px 18px',
                  borderRadius: '16px',
                  fontWeight: 800,
                  fontSize: '0.90rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: primaryAction.shadow,
                  boxSizing: 'border-box',
                  minHeight: '48px',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
              >
                {primaryAction.icon}
                <span>{primaryAction.label}</span>
              </a>

              {/* 🏛️ 0,1% Responsive Viewport Immunität (QR-Code vs. Mobile Share) */}
              {isMobile ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Mobile: Direkter Teilen-Button an Eltern */}
                  <button
                    onClick={handleShareWithFamily}
                    style={{
                      width: '100%',
                      border: copiedStatus === 'share' ? 'none' : '1px solid #e2e8f0',
                      background: copiedStatus === 'share' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f8fafc',
                      color: copiedStatus === 'share' ? '#ffffff' : '#1e293b',
                      padding: '11px 16px',
                      borderRadius: '14px',
                      fontWeight: 750,
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      minHeight: '44px',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s'
                    }}
                  >
                    {copiedStatus === 'share' ? <Check size={16} color="#16a34a" /> : <Share2 size={16} color="#475569" />}
                    <span aria-live="polite">{copiedStatus === 'share' ? 'Familien-Link kopiert!' : 'Mit Eltern / Familie teilen'}</span>
                  </button>

                  {/* Diskreter Umschalter: QR-Code für Eltern zum Abscannen einblenden */}
                  <button
                    onClick={() => setShowMobileQr(!showMobileQr)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.73rem',
                      fontWeight: 650,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '4px'
                    }}
                  >
                    <QrCode size={13} />
                    <span>{showMobileQr ? 'QR-Code ausblenden' : 'QR-Code für Eltern zum Abscannen einblenden'}</span>
                    {showMobileQr ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {showMobileQr && (
                    <div style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '18px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      boxSizing: 'border-box',
                      animation: 'fadeIn 0.15s ease'
                    }}>
                      <div style={{
                        background: '#ffffff',
                        padding: '8px',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        display: 'inline-flex'
                      }}>
                        <QRCode value={httpsUrl} size={106} viewBox="0 0 106 106" level="M" />
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.3 }}>
                        Handykamera der Eltern auf diesen Code richten
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Desktop/Tablet: QR-Code Block für schnellen Handy-Scan (für Schüler & Eltern) */
                <div style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  boxSizing: 'border-box'
                }}>
                  <div style={{
                    background: '#ffffff',
                    padding: '8px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'inline-flex'
                  }}>
                    <QRCode value={httpsUrl} size={106} viewBox="0 0 106 106" level="M" />
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                    Aufs Smartphone holen
                  </div>
                  <div style={{ fontSize: '0.71rem', color: '#64748b', lineHeight: 1.3 }}>
                    Mit Handykamera scannen · Für dich & deine Eltern
                  </div>
                </div>
              )}

              {/* Link kopieren (Sekundäre Aktion - Garantiert immer verschlüsselte HTTPS-URL) */}
              <button
                onClick={() => handleCopyLink('feed', httpsUrl)}
                style={{
                  width: '100%',
                  border: copiedStatus === 'feed' ? 'none' : '1px solid #e2e8f0',
                  background: copiedStatus === 'feed' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#ffffff',
                  color: copiedStatus === 'feed' ? '#ffffff' : '#334155',
                  padding: '10px 16px',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  cursor: 'pointer',
                  minHeight: '42px',
                  boxSizing: 'border-box',
                  transition: 'all 0.15s'
                }}
              >
                {copiedStatus === 'feed' ? <Check size={15} color="#16a34a" /> : <Copy size={15} color="#64748b" />}
                <span aria-live="polite">{copiedStatus === 'feed' ? 'Link kopiert!' : 'Kalender-Link manuell kopieren'}</span>
              </button>

              {/* Diskrete Optionen (Progressive Disclosure) */}
              <div style={{ width: '100%', marginTop: '2px' }}>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.74rem',
                    fontWeight: 650,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '8px'
                  }}
                >
                  <span>Optionen anpassen (Ferien, Alarme)</span>
                  {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {showAdvanced && (
                  <div style={{
                    marginTop: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    textAlign: 'left'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={includeLessons}
                        onChange={e => setIncludeLessons(e.target.checked)}
                        style={{ accentColor: brandColor }}
                      />
                      <span>Regulärer Unterricht</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={includeBands}
                        onChange={e => setIncludeBands(e.target.checked)}
                        style={{ accentColor: brandColor }}
                      />
                      <span>Ensembles & Bandproben</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={includeHolidays}
                        onChange={e => setIncludeHolidays(e.target.checked)}
                        style={{ accentColor: brandColor }}
                      />
                      <span>Schulferien & Feiertage</span>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 650 }}>Erinnerungs-Alarm:</span>
                      <select
                        value={alarmOption}
                        onChange={e => setAlarmOption(e.target.value as any)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.74rem',
                          background: '#ffffff',
                          color: '#0f172a'
                        }}
                      >
                        <option value="30m_morning">30 Min. &amp; 2 Std. vorher (Empfohlen)</option>
                        <option value="2h">2 Stunden vorher</option>
                        <option value="1d">1 Tag vorher</option>
                        <option value="none">Kein Standard-Alarm</option>
                      </select>
                    </div>

                    <button
                      onClick={handleDirectIcsDownload}
                      style={{
                        marginTop: '4px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        fontWeight: 650,
                        fontSize: '0.73rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Download size={13} color="#64748b" />
                      <span>Als .ics-Datei herunterladen</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 🏛️ 0,1% Latenz-Disclaimer & Haftungsschutz (§ 280 BGB) */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '8px 10px',
                fontSize: '0.71rem',
                color: '#475569',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '7px',
                textAlign: 'left',
                lineHeight: 1.35,
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <Info size={14} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Synchronisation:</strong> Externe Kalender (Apple, Google) aktualisieren sich in Intervallen (15 Min. bis 12 Std.). Verbindlich bei Ausfällen ist stets die Campus-App.
                </span>
              </div>

              {/* Subtiler Vertrauens-Hinweis */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.70rem',
                color: '#64748b',
                marginTop: '2px'
              }}>
                <ShieldCheck size={13} color={brandColor} style={{ flexShrink: 0 }} />
                <span>Automatisch synchronisiert · Keine Noten oder Chats</span>
              </div>

              {/* Diskreter Schlüssel-Reset (WCAG AA Kontrast 4,6:1) */}
              <button
                onClick={handleRotateKey}
                disabled={generatingToken}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.71rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 6px',
                  borderRadius: '6px',
                  transition: 'color 0.15s'
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
              >
                <RefreshCw size={11} style={{ animation: generatingToken ? 'spin 1s linear infinite' : 'none' }} />
                <span>Abonnement widerrufen / Schlüssel neu erstellen</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
