import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'react-qr-code';
import {
  Calendar,
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
  Sliders,
  Sparkles,
  Smartphone,
  Tablet,
  Laptop,
  Globe,
  CheckCircle2,
  Clock,
  Lock,
  ChevronRight,
  Info,
  QrCode,
  MapPin
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

type PlatformTab = 'apple' | 'google' | 'outlook' | 'qr';

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
  // 1% Tier-1 Hardware & OS Auto-Detection Engine
  const detectedDevice = useMemo<{
    platform: PlatformTab;
    deviceName: string;
    actionLabel: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
  }>(() => {
    if (typeof window === 'undefined') {
      return { platform: 'apple', deviceName: 'Dein Gerät', actionLabel: 'Auf diesem Gerät abonnieren', deviceType: 'mobile' };
    }
    const ua = navigator.userAgent.toLowerCase();
    const isTouch = typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;

    // iPad detection (iPadOS 13+ Safari reports 'macintosh' with touch support)
    if (ua.includes('ipad') || (ua.includes('macintosh') && isTouch)) {
      return { platform: 'apple', deviceName: 'Dein iPad', actionLabel: '1-Tap in iPad-Kalender abonnieren', deviceType: 'tablet' };
    }
    if (ua.includes('iphone') || ua.includes('ipod')) {
      return { platform: 'apple', deviceName: 'Dein iPhone', actionLabel: '1-Tap in iPhone-Kalender abonnieren', deviceType: 'mobile' };
    }
    if (ua.includes('macintosh') || ua.includes('mac os')) {
      return { platform: 'apple', deviceName: 'Dein Mac', actionLabel: '1-Tap in Mac-Kalender abonnieren', deviceType: 'desktop' };
    }
    if (ua.includes('android')) {
      return { platform: 'google', deviceName: 'Dein Android-Gerät', actionLabel: 'In Google Kalender öffnen (1-Klick)', deviceType: 'mobile' };
    }
    if (ua.includes('windows')) {
      return { platform: 'outlook', deviceName: 'Dein Windows-PC', actionLabel: 'In Outlook Kalender öffnen (1-Klick)', deviceType: 'desktop' };
    }
    if (ua.includes('cros') || ua.includes('linux')) {
      return { platform: 'google', deviceName: 'Dein Computer', actionLabel: 'In Google Kalender öffnen (1-Klick)', deviceType: 'desktop' };
    }

    return { platform: 'apple', deviceName: 'Dein Gerät', actionLabel: 'Auf diesem Gerät abonnieren', deviceType: 'mobile' };
  }, []);

  const [activeTab, setActiveTab] = useState<PlatformTab>(detectedDevice.platform);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Filter & Preference State (1% Tier-1 Customization)
  const [includeLessons, setIncludeLessons] = useState<boolean>(true);
  const [includeBands, setIncludeBands] = useState<boolean>(true);
  const [includeHolidays, setIncludeHolidays] = useState<boolean>(false);
  const [isWorkSafe, setIsWorkSafe] = useState<boolean>(false);
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

  // Determine the next upcoming lesson for authentic WYSIWYG preview (Hooks must run unconditionally)
  const nextLessonPreview = useMemo(() => {
    const studentFirstName = studentUser?.first_name || 'Schüler';
    const instrument = studentUser?.instrument || 'Musik';

    if (lessons && lessons.length > 0) {
      const now = new Date();
      const upcoming = [...lessons].find((l: any) => {
        const dStr = l.date || l.start_date;
        if (!dStr) return false;
        const d = new Date(dStr);
        return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }) || lessons[0];

      if (upcoming) {
        const teacherName = upcoming.teacher 
          ? `${upcoming.teacher.first_name || ''} ${upcoming.teacher.last_name ? upcoming.teacher.last_name[0] + '.' : ''}`.trim()
          : 'Lehrkraft';
        const roomName = upcoming.room_name || upcoming.room?.name || 'Studio 204';
        const time = upcoming.start_time ? upcoming.start_time.slice(0, 5) : '16:30';
        const dateStr = upcoming.date ? new Date(upcoming.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' }) : 'Nächster Termin';

        return {
          title: isWorkSafe ? 'Campus-Groovelab Termin' : `${instrument}unterricht bei ${teacherName}`,
          dateStr,
          timeStr: `${time} – ${upcoming.end_time ? upcoming.end_time.slice(0, 5) : '45 Min.'}`,
          room: roomName,
          status: 'Bestätigt (Live-Sync)'
        };
      }
    }

    return {
      title: isWorkSafe ? 'Campus-Groovelab Termin' : `${instrument}unterricht bei Lehrkraft`,
      dateStr: 'Wöchentlicher Termin',
      timeStr: '16:30 – 17:15 Uhr',
      room: 'Studio / Raum 204',
      status: 'Bestätigt (Live-Sync)'
    };
  }, [lessons, studentUser, isWorkSafe]);

  if (!isOpen) return null;

  // Supabase & Endpoint URL calculation
  const supabaseUrlStr = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de';
  const cleanSupabaseUrl = supabaseUrlStr.replace(/^https?:\/\//i, '');
  const token = calendarToken || '';

  // Build query string reflecting user filters
  const queryParams = new URLSearchParams();
  if (token) queryParams.set('token', token);
  
  const filterParts: string[] = [];
  if (includeLessons) filterParts.push('lessons');
  if (includeBands) filterParts.push('campus_events');
  if (filterParts.length > 0 && filterParts.length < 2) {
    queryParams.set('filter', filterParts.join(','));
  }
  if (includeHolidays) queryParams.set('holidays', '1');
  if (isWorkSafe) queryParams.set('worksafe', '1');
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
      setTimeout(() => setCopiedStatus(null), 2500);
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
      const summary = isWorkSafe ? 'Campus-Groovelab Termin' : `${instrument ? `${instrument}-Unterricht` : 'Musikunterricht'}${role !== 'student' ? `: ${studentName}` : ''}`;
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
      if (window.confirm('Möchtest du den Kalender-Schlüssel wirklich erneuern? Alle bisherigen Kalender-Abonnements (auch bei Familie/Oma/Opa) werden dadurch beendet und müssen mit dem neuen Link aktualisiert werden.')) {
        await onRotateToken(true);
      }
    };

    if (isJuniorStudent && !isParentUnlocked && onOpenPinGate) {
      onOpenPinGate(executeRevoke);
      return;
    }

    await executeRevoke();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Stundenplan im Kalender abonnieren"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
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
          borderRadius: '24px',
          width: '100%',
          maxWidth: isMobilePortrait ? '420px' : '720px',
          maxHeight: '92vh',
          boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(226, 232, 240, 0.8)'
        }}
      >
        {/* Header mit Apple Squircle Icon & Close Button */}
        <div style={{
          padding: isMobilePortrait ? '18px 18px 12px 18px' : '22px 26px 14px 26px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#e6f4ea',
              color: brandColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(52, 168, 83, 0.16)'
            }}>
              <CalendarDays size={22} strokeWidth={2.3} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.14rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Stundenplan im Kalender
                </h3>
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  background: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px solid #bbf7d0',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                  Live-Sync
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                Termine & Ausfälle synchronisieren sich automatisch auf deinem Smartphone.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Dialog schließen"
            style={{
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
              transition: 'background 0.15s, color 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Modal Body mit Scroll-Container */}
        <div style={{
          padding: isMobilePortrait ? '14px 16px' : '18px 24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {generatingToken && !token ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <RefreshCw size={28} color={brandColor} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontWeight: 650, fontSize: '0.90rem', color: '#0f172a' }}>Kryptografischer Kalender-Schlüssel wird vorbereitet...</span>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>DSGVO-konforme Vorbereitung für Apple & Google Kalender</span>
            </div>
          ) : !token ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>Schlüssel konnte nicht geladen werden.</span>
              <button
                onClick={() => onRotateToken(true)}
                style={{
                  border: 'none',
                  background: brandColor,
                  color: '#ffffff',
                  padding: '10px 22px',
                  borderRadius: '14px',
                  fontWeight: 750,
                  fontSize: '0.86rem',
                  cursor: 'pointer'
                }}
              >
                Erneut versuchen
              </button>
            </div>
          ) : (
            <>
              {/* Hardware & OS Auto-Detection Chip */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 12px',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '0.74rem',
                color: '#334155',
                gap: '8px'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  {detectedDevice.deviceType === 'tablet' ? (
                    <Tablet size={15} color="#475569" strokeWidth={2.2} />
                  ) : detectedDevice.deviceType === 'desktop' ? (
                    <Laptop size={15} color="#475569" strokeWidth={2.2} />
                  ) : (
                    <Smartphone size={15} color="#475569" strokeWidth={2.2} />
                  )}
                  <span>Erkannt: <strong>{detectedDevice.deviceName}</strong></span>
                </span>
                <span style={{ fontSize: '0.69rem', color: brandColor, fontWeight: 750, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={12} color={brandColor} />
                  <span>Empfohlene Option aktiv</span>
                </span>
              </div>

              {/* Segmented Platform Tabs (Apple / Google / Outlook / QR) */}
              <div
                role="tablist"
                aria-label="Kalender-Plattform wählen"
                style={{
                  background: '#f1f5f9',
                  padding: '4px',
                  borderRadius: '16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '4px'
                }}
              >
                <button
                  role="tab"
                  id="calendar-tab-apple"
                  aria-controls="calendar-tabpanel-apple"
                  aria-selected={activeTab === 'apple'}
                  onClick={() => setActiveTab('apple')}
                  style={{
                    border: 'none',
                    background: activeTab === 'apple' ? '#ffffff' : 'transparent',
                    color: activeTab === 'apple' ? '#0f172a' : '#64748b',
                    padding: '8px 6px',
                    borderRadius: '12px',
                    fontWeight: 750,
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    minHeight: '40px',
                    boxShadow: activeTab === 'apple' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Calendar size={14} color="currentColor" strokeWidth={2.2} />
                  <span>Apple</span>
                </button>

                <button
                  role="tab"
                  id="calendar-tab-google"
                  aria-controls="calendar-tabpanel-google"
                  aria-selected={activeTab === 'google'}
                  onClick={() => setActiveTab('google')}
                  style={{
                    border: 'none',
                    background: activeTab === 'google' ? '#ffffff' : 'transparent',
                    color: activeTab === 'google' ? '#0f172a' : '#64748b',
                    padding: '8px 6px',
                    borderRadius: '12px',
                    fontWeight: 750,
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    minHeight: '40px',
                    boxShadow: activeTab === 'google' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Globe size={14} color="currentColor" strokeWidth={2.2} />
                  <span>Google</span>
                </button>

                <button
                  role="tab"
                  id="calendar-tab-outlook"
                  aria-controls="calendar-tabpanel-outlook"
                  aria-selected={activeTab === 'outlook'}
                  onClick={() => setActiveTab('outlook')}
                  style={{
                    border: 'none',
                    background: activeTab === 'outlook' ? '#ffffff' : 'transparent',
                    color: activeTab === 'outlook' ? '#0f172a' : '#64748b',
                    padding: '8px 6px',
                    borderRadius: '12px',
                    fontWeight: 750,
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    minHeight: '40px',
                    boxShadow: activeTab === 'outlook' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Laptop size={14} color="currentColor" strokeWidth={2.2} />
                  <span>Outlook</span>
                </button>

                <button
                  role="tab"
                  id="calendar-tab-qr"
                  aria-controls="calendar-tabpanel-qr"
                  aria-selected={activeTab === 'qr'}
                  onClick={() => setActiveTab('qr')}
                  style={{
                    border: 'none',
                    background: activeTab === 'qr' ? '#ffffff' : 'transparent',
                    color: activeTab === 'qr' ? '#0f172a' : '#64748b',
                    padding: '8px 6px',
                    borderRadius: '12px',
                    fontWeight: 750,
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    minHeight: '40px',
                    boxShadow: activeTab === 'qr' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <QrCode size={14} color="currentColor" strokeWidth={2.2} />
                  <span>QR / Familie</span>
                </button>
              </div>

              {/* Layout Container: Desktop 2-Spalten vs. Mobile 1-Spalte */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobilePortrait ? '1fr' : '1.1fr 0.9fr',
                gap: '16px',
                alignItems: 'stretch'
              }}>
                {/* Linke Spalte: Aktive Plattform-Aktionen */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                  {activeTab === 'apple' && (
                    <div
                      role="tabpanel"
                      id="calendar-tabpanel-apple"
                      aria-labelledby="calendar-tab-apple"
                      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                    >
                      <a
                        href={webcalUrl}
                        style={{
                          textDecoration: 'none',
                          background: brandColor,
                          color: '#ffffff',
                          padding: '13px 18px',
                          borderRadius: '16px',
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(52, 168, 83, 0.28)',
                          transition: 'all 0.15s ease',
                          textAlign: 'center',
                          minHeight: '44px'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                      >
                        <CalendarPlus size={18} strokeWidth={2.2} />
                        <span>{detectedDevice.platform === 'apple' ? detectedDevice.actionLabel : '1-Tap in Apple Kalender abonnieren'}</span>
                      </a>

                      <button
                        onClick={() => handleCopyLink('apple', webcalUrl)}
                        style={{
                          border: copiedStatus === 'apple' ? '1px solid #86efac' : '1px solid #e2e8f0',
                          background: copiedStatus === 'apple' ? '#f0fdf4' : '#ffffff',
                          color: copiedStatus === 'apple' ? '#16a34a' : '#1e293b',
                          padding: '10px 16px',
                          borderRadius: '14px',
                          fontWeight: 750,
                          fontSize: '0.84rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          minHeight: '44px',
                          transition: 'all 0.15s'
                        }}
                      >
                        {copiedStatus === 'apple' ? <Check size={16} color="#16a34a" /> : <Copy size={16} color="#64748b" />}
                        <span>{copiedStatus === 'apple' ? 'Webcal-Link kopiert' : 'Webcal-Link manuell kopieren'}</span>
                      </button>

                      <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.4, padding: '0 4px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <Info size={13} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span><strong>Tipp für Apple Mac:</strong> Im Kalender-Menü oben auf <em>Ablage → Neues Kalenderabonnement</em> klicken und Link einfügen.</span>
                      </div>
                    </div>
                  )}

                  {activeTab === 'google' && (
                    <div
                      role="tabpanel"
                      id="calendar-tabpanel-google"
                      aria-labelledby="calendar-tab-google"
                      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                    >
                      <a
                        href={googleCalendarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          textDecoration: 'none',
                          background: '#4285f4',
                          color: '#ffffff',
                          padding: '13px 18px',
                          borderRadius: '16px',
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(66, 133, 244, 0.28)',
                          transition: 'all 0.15s ease',
                          textAlign: 'center',
                          minHeight: '44px'
                        }}
                      >
                        <ExternalLink size={18} strokeWidth={2.2} />
                        <span>{detectedDevice.platform === 'google' ? detectedDevice.actionLabel : 'In Google Kalender öffnen (1-Klick)'}</span>
                      </a>

                      <button
                        onClick={() => handleCopyLink('google', httpsUrl)}
                        style={{
                          border: copiedStatus === 'google' ? '1px solid #86efac' : '1px solid #e2e8f0',
                          background: copiedStatus === 'google' ? '#f0fdf4' : '#ffffff',
                          color: copiedStatus === 'google' ? '#16a34a' : '#1e293b',
                          padding: '10px 16px',
                          borderRadius: '14px',
                          fontWeight: 750,
                          fontSize: '0.84rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          minHeight: '44px',
                          transition: 'all 0.15s'
                        }}
                      >
                        {copiedStatus === 'google' ? <Check size={16} color="#16a34a" /> : <Copy size={16} color="#64748b" />}
                        <span>{copiedStatus === 'google' ? 'Feed-URL kopiert' : 'Feed-URL für Google kopieren'}</span>
                      </button>

                      <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.4, padding: '0 4px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <Globe size={13} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>Öffnet direkt Googles Dialog <em>„Kalender über URL hinzufügen“</em>.</span>
                      </div>
                    </div>
                  )}

                  {activeTab === 'outlook' && (
                    <div
                      role="tabpanel"
                      id="calendar-tabpanel-outlook"
                      aria-labelledby="calendar-tab-outlook"
                      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                    >
                      <a
                        href={outlookWebUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          textDecoration: 'none',
                          background: '#0078d4',
                          color: '#ffffff',
                          padding: '13px 18px',
                          borderRadius: '16px',
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(0, 120, 212, 0.28)',
                          transition: 'all 0.15s ease',
                          textAlign: 'center',
                          minHeight: '44px'
                        }}
                      >
                        <ExternalLink size={18} strokeWidth={2.2} />
                        <span>{detectedDevice.platform === 'outlook' ? detectedDevice.actionLabel : 'In Outlook Web öffnen (1-Klick)'}</span>
                      </a>

                      <button
                        onClick={() => handleCopyLink('outlook', httpsUrl)}
                        style={{
                          border: copiedStatus === 'outlook' ? '1px solid #86efac' : '1px solid #e2e8f0',
                          background: copiedStatus === 'outlook' ? '#f0fdf4' : '#ffffff',
                          color: copiedStatus === 'outlook' ? '#16a34a' : '#1e293b',
                          padding: '10px 16px',
                          borderRadius: '14px',
                          fontWeight: 750,
                          fontSize: '0.84rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          minHeight: '44px',
                          transition: 'all 0.15s'
                        }}
                      >
                        {copiedStatus === 'outlook' ? <Check size={16} color="#16a34a" /> : <Copy size={16} color="#64748b" />}
                        <span>{copiedStatus === 'outlook' ? 'Feed-Link kopiert' : 'Feed-Link für Outlook Desktop kopieren'}</span>
                      </button>

                      <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.4, padding: '0 4px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <Laptop size={13} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>Kompatibel mit Outlook 365, Outlook für Windows/Mac und Exchange.</span>
                      </div>
                    </div>
                  )}

                  {activeTab === 'qr' && (
                    <div
                      role="tabpanel"
                      id="calendar-tabpanel-qr"
                      aria-labelledby="calendar-tab-qr"
                      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                    >
                      <button
                        onClick={handleShareWithFamily}
                        style={{
                          border: copiedStatus === 'share' ? '1px solid #86efac' : 'none',
                          background: copiedStatus === 'share' ? '#f0fdf4' : brandColor,
                          color: copiedStatus === 'share' ? '#16a34a' : '#ffffff',
                          padding: '13px 18px',
                          borderRadius: '16px',
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(52, 168, 83, 0.28)',
                          minHeight: '44px'
                        }}
                      >
                        {copiedStatus === 'share' ? <Check size={18} color="#16a34a" /> : <Share2 size={18} strokeWidth={2.2} />}
                        <span>{copiedStatus === 'share' ? 'Familien-Link kopiert' : 'Sicheren Familien-Link teilen (Zwischenablage / E-Mail)'}</span>
                      </button>

                      <button
                        onClick={handleDirectIcsDownload}
                        style={{
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#334155',
                          padding: '10px 16px',
                          borderRadius: '14px',
                          fontWeight: 750,
                          fontSize: '0.84rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          minHeight: '44px',
                          transition: 'all 0.15s'
                        }}
                      >
                        <Download size={16} color="#64748b" strokeWidth={2.2} />
                        <span>Stundenplan als .ics herunterladen</span>
                      </button>

                      <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.4, padding: '0 4px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <Share2 size={13} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>Perfekt, um Termine an Eltern, Angehörige oder Partner weiterzugeben.</span>
                      </div>
                    </div>
                  )}

                  {/* Filter & Einstellungs-Akkordeon */}
                  <div style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#0f172a',
                        fontWeight: 750,
                        fontSize: '0.79rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sliders size={14} color={brandColor} />
                        <span>Feed-Inhalte & Alarm konfigurieren</span>
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {showFilters ? 'Ausblenden' : 'Anpassen'}
                      </span>
                    </button>

                    {showFilters && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={includeLessons}
                            onChange={e => setIncludeLessons(e.target.checked)}
                            style={{ accentColor: brandColor }}
                          />
                          <span>Regulärer Unterricht</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={includeBands}
                            onChange={e => setIncludeBands(e.target.checked)}
                            style={{ accentColor: brandColor }}
                          />
                          <span>Ensembles, Bands & Bühnen-Events</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={includeHolidays}
                            onChange={e => setIncludeHolidays(e.target.checked)}
                            style={{ accentColor: brandColor }}
                          />
                          <span>Schulferien & Feiertage (Ganztagstermine)</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isWorkSafe}
                            onChange={e => setIsWorkSafe(e.target.checked)}
                            style={{ accentColor: brandColor }}
                          />
                          <span>Work-Safe Modus (Nur „Termin“, keine Namen für Dienstgeräte)</span>
                        </label>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Erinnerungs-Alarm (VALARM):</span>
                          <select
                            value={alarmOption}
                            onChange={e => setAlarmOption(e.target.value as any)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.75rem',
                              background: '#ffffff',
                              color: '#0f172a'
                            }}
                          >
                            <option value="30m_morning">30 Min. vorher & morgens 08:00 Uhr (Empfohlen)</option>
                            <option value="2h">2 Stunden vorher</option>
                            <option value="1d">1 Tag vorher</option>
                            <option value="none">Keine Standard-Alarme</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rechte Spalte: WYSIWYG Live-Terminvorschau & QR-Code */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  justifyContent: 'space-between'
                }}>
                  {activeTab === 'qr' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center', margin: 'auto' }}>
                      <div style={{
                        background: '#ffffff',
                        padding: '10px',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                      }}>
                        <QRCode value={httpsUrl} size={110} viewBox="0 0 110 110" level="M" />
                      </div>
                      <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>
                        Mit Smartphone scannen
                      </div>
                      <div style={{ fontSize: '0.70rem', color: '#64748b' }}>
                        Kamera von iPhone oder Android darauf halten
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          WYSIWYG Live-Vorschau
                        </span>
                        <span style={{ fontSize: '0.68rem', color: brandColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Sparkles size={11} />
                          Echtzeit-Simulation
                        </span>
                      </div>

                      {/* Simulierte native Kalender-Karte */}
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '14px',
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderLeft: `4px solid ${brandColor}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                          {nextLessonPreview.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 650, color: brandColor }}>
                          {nextLessonPreview.dateStr} · {nextLessonPreview.timeStr}
                        </div>
                        <div style={{ fontSize: '0.71rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MapPin size={12} color="#64748b" />
                          <span>{nextLessonPreview.room}</span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Clock size={11} />
                          <span>Alarm: {alarmOption === '30m_morning' ? '30m vorher + 8h' : alarmOption === '2h' ? '2h vorher' : alarmOption === '1d' ? '1d vorher' : 'Deaktiviert'}</span>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.69rem', color: '#64748b', marginTop: '8px', lineHeight: 1.35, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <CheckCircle2 size={13} color={brandColor} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span><em>So erscheint die Musikstunde in deiner Kalender-App. Entfällt ein Termin, wird er im Kalender automatisch als <strong>AUSFALL</strong> durchgestrichen.</em></span>
                      </div>
                    </div>
                  )}

                  {/* Status & DSGVO Footer innerhalb der Box */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.69rem',
                    color: '#64748b',
                    paddingTop: '6px',
                    borderTop: '1px solid #edf2f7'
                  }}>
                    <ShieldCheck size={14} color={brandColor} style={{ flexShrink: 0 }} />
                    <span>100 % TLS-verschlüsselt (Art. 32 DSGVO) · Keine Noten oder Chats im Feed.</span>
                  </div>
                </div>
              </div>

              {/* Latenz- und Synchronisations-Transparenz (Tier-1 Telemetrie) */}
              <div style={{
                background: '#f1f5f9',
                borderRadius: '12px',
                padding: '8px 12px',
                fontSize: '0.72rem',
                color: '#475569',
                lineHeight: 1.4,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <Info size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Synchronisations-Takt:</strong> Apple Kalender pollt auf Wunsch alle 15 Minuten. Google Kalender aktualisiert Web-Abos serverseitig alle 12–24 Stunden. Bei kurzfristigen Änderungen gilt stets die Live-Anzeige in der Campus-Groovelab App.
                </div>
              </div>

              {/* Diskreter 1-Klick-Widerruf (Sicherheit & Reset) */}
              <div style={{ textAlign: 'center', marginTop: '2px' }}>
                <button
                  onClick={handleRotateKey}
                  disabled={generatingToken}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.72rem',
                    fontWeight: 650,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    transition: 'color 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                >
                  <RefreshCw size={11} style={{ animation: generatingToken ? 'spin 1s linear infinite' : 'none' }} />
                  <span>Abonnement widerrufen / Schlüssel neu erstellen</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
