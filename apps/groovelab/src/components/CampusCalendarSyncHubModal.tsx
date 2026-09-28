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
  Laptop
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

  const [activePlatform, setActivePlatform] = useState<Platform>(detectedDevice.platform);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

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

  const filterParts: string[] = [];
  if (includeLessons) filterParts.push('lessons');
  if (includeBands) filterParts.push('campus_events');
  if (filterParts.length > 0 && filterParts.length < 2) {
    queryParams.set('filter', filterParts.join(','));
  }
  if (includeHolidays) queryParams.set('holidays', '1');
  if (alarmOption !== '30m_morning') queryParams.set('alarm', alarmOption);

  const queryString = queryParams.toString();
  const httpsUrl = `${supabaseUrlStr}/functions/v1/ical-feed?${queryString}`;
  const webcalUrl = `webcal://${cleanSupabaseUrl}/functions/v1/ical-feed?${queryString}`;
  const googleCalendarUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpsUrl)}`;
  const outlookWebUrl = `https://outlook.live.com/calendar/0/addcalendar?url=${encodeURIComponent(httpsUrl)}&name=Campus-Groovelab`;

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

  const handleDirectIcsDownload = () => {
    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Campus-Groovelab//Stundenplan Export//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Campus-Groovelab Stundenplan'
    ];

    const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const targetList = (lessons && lessons.length > 0) ? lessons : [];

    targetList.forEach((occ: any, idx: number) => {
      const occDate = occ.date || occ.start_date;
      if (!occDate) return;
      const datePart = String(occDate).split('T')[0].replace(/-/g, '');
      const startTimeStr = (occ.start_time || '14:00').replace(':', '') + '00';
      const endTimeStr = (occ.end_time || '14:45').replace(':', '') + '00';
      const uid = `cgl-${occ.id || idx}-${datePart}@campus-groovelab.de`;
      const studentName = studentUser?.first_name || 'Schüler';
      const instrument = occ.instrument || studentUser?.instrument || '';
      const summary = `${instrument ? `${instrument}-Unterricht` : 'Musikunterricht'}${role !== 'student' ? `: ${studentName}` : ''}`;
      const location = occ.room_name || occ.room?.name || 'Musikschule';

      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`UID:${uid}`);
      icsLines.push(`DTSTAMP:${nowStr}`);
      icsLines.push(`DTSTART:${datePart}T${startTimeStr}`);
      icsLines.push(`DTEND:${datePart}T${endTimeStr}`);
      icsLines.push(`SUMMARY:${summary}`);
      if (location) icsLines.push(`LOCATION:${location}`);
      icsLines.push('DESCRIPTION:Unterrichtstermin über Campus-Groovelab');
      icsLines.push('STATUS:CONFIRMED');
      icsLines.push('END:VEVENT');
    });

    icsLines.push('END:VCALENDAR');

    const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `campus-groovelab-stundenplan-${new Date().toISOString().slice(0, 10)}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
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
        label: 'In Outlook Kalender öffnen',
        icon: <Laptop size={18} strokeWidth={2.2} />,
        href: outlookWebUrl,
        bg: '#0078d4',
        shadow: '0 4px 14px rgba(0, 120, 212, 0.28)'
      };
    }
    return {
      label: detectedDevice.isMobileOrTablet
        ? `1-Tap in ${detectedDevice.deviceName}-Kalender`
        : 'Zu Apple Kalender hinzufügen',
      icon: <CalendarPlus size={18} strokeWidth={2.2} />,
      href: webcalUrl,
      bg: brandColor,
      shadow: '0 4px 14px rgba(52, 168, 83, 0.25)'
    };
  }, [activePlatform, detectedDevice, googleCalendarUrl, outlookWebUrl, webcalUrl, brandColor]);

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
            boxShadow: '0 4px 12px rgba(52, 168, 83, 0.14)',
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
              {/* Kompakte Plattform-Auswahl (Apple / Google / Outlook) */}
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

              {/* Desktop/Tablet: QR-Code Block für schnellen Handy-Scan (für Schüler & Eltern) */}
              {!detectedDevice.isMobileOrTablet ? (
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
              ) : (
                /* Mobile: Direkter Teilen-Button an Eltern */
                <button
                  onClick={handleShareWithFamily}
                  style={{
                    width: '100%',
                    border: copiedStatus === 'share' ? '1px solid #86efac' : '1px solid #e2e8f0',
                    background: copiedStatus === 'share' ? '#f0fdf4' : '#f8fafc',
                    color: copiedStatus === 'share' ? '#16a34a' : '#1e293b',
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
                  <span>{copiedStatus === 'share' ? 'Familien-Link kopiert!' : 'Mit Eltern / Familie teilen'}</span>
                </button>
              )}

              {/* Link kopieren (Sekundäre Aktion) */}
              <button
                onClick={() => handleCopyLink('feed', activePlatform === 'apple' ? webcalUrl : httpsUrl)}
                style={{
                  width: '100%',
                  border: copiedStatus === 'feed' ? '1px solid #86efac' : '1px solid #e2e8f0',
                  background: copiedStatus === 'feed' ? '#f0fdf4' : '#ffffff',
                  color: copiedStatus === 'feed' ? '#16a34a' : '#334155',
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
                <span>{copiedStatus === 'feed' ? 'Link kopiert!' : 'Kalender-Link manuell kopieren'}</span>
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
                        <option value="30m_morning">30 Min. vorher & morgens 08:00 Uhr</option>
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

              {/* Subtiler Vertrauens-Hinweis */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.70rem',
                color: '#64748b',
                marginTop: '4px'
              }}>
                <ShieldCheck size={13} color={brandColor} style={{ flexShrink: 0 }} />
                <span>Automatisch synchronisiert · Keine Noten oder Chats</span>
              </div>

              {/* Diskreter Schlüssel-Reset */}
              <button
                onClick={handleRotateKey}
                disabled={generatingToken}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.69rem',
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
                onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
              >
                <RefreshCw size={10} style={{ animation: generatingToken ? 'spin 1s linear infinite' : 'none' }} />
                <span>Abonnement widerrufen / Schlüssel neu erstellen</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
