import React, { useState, useEffect } from 'react';
import { Megaphone, AlertTriangle, AlertCircle, Info, X, Clock, ShieldCheck, Wrench } from 'lucide-react';

export interface BroadcastAnnouncement {
  id?: string;
  isActive: boolean;
  severity: 'info' | 'warning' | 'emergency';
  title: string;
  message: string;
  targetAudience: 'all' | 'teachers' | 'students' | 'admins';
  targetScope?: 'all' | 'campus_only' | 'groovelab_only' | 'schools_only';
  targetSchoolId?: string;
  countdownMinutes?: number;
  targetEndTime?: number;
  scheduledTime?: string;
  dismissible?: boolean;
  createdAt?: string;
  type?: string;
}

interface GlobalBroadcastBannerProps {
  announcement: BroadcastAnnouncement | null;
  currentRole?: string;
  activePlatform?: string;
  currentSchoolId?: string;
}

export const GlobalBroadcastBanner: React.FC<GlobalBroadcastBannerProps> = ({
  announcement,
  currentRole,
  activePlatform,
  currentSchoolId
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(() => {
    if (announcement?.targetEndTime) {
      return Math.max(0, Math.ceil((announcement.targetEndTime - Date.now()) / 60000));
    }
    return announcement?.countdownMinutes || null;
  });

  useEffect(() => {
    if (!announcement || !announcement.isActive) return;
    
    // Check if dismissed previously in this session
    const dismissKey = `cg_dismissed_banner_${announcement.id || announcement.title}`;
    if (sessionStorage.getItem(dismissKey)) {
      setDismissed(true);
    } else {
      setDismissed(false);
    }
  }, [announcement]);

  // Debounced 15-second countdown timer for smooth, non-flickering ETA
  useEffect(() => {
    if (!announcement?.targetEndTime) {
      if (announcement?.countdownMinutes) {
        setMinutesRemaining(announcement.countdownMinutes);
      } else {
        setMinutesRemaining(null);
      }
      return;
    }

    const calcMinutes = () => {
      const remaining = Math.max(0, Math.ceil((announcement.targetEndTime! - Date.now()) / 60000));
      setMinutesRemaining(remaining);
    };

    calcMinutes();
    const interval = setInterval(calcMinutes, 15000); // 15s entprellt
    return () => clearInterval(interval);
  }, [announcement?.targetEndTime, announcement?.countdownMinutes]);

  if (!announcement || !announcement.isActive || dismissed) return null;

  // Check target audience filter
  if (announcement.targetAudience !== 'all') {
    if (announcement.targetAudience === 'teachers' && currentRole !== 'teacher') return null;
    if (announcement.targetAudience === 'students' && currentRole !== 'student') return null;
    if (announcement.targetAudience === 'admins' && currentRole !== 'admin' && currentRole !== 'secretary' && currentRole !== 'master') return null;
  }

  // Check target scope filter (Campus only vs GrooveLab only vs Single school)
  if (announcement.targetScope && announcement.targetScope !== 'all') {
    if (announcement.targetScope === 'campus_only' && activePlatform === 'groovelab') return null;
    if (announcement.targetScope === 'groovelab_only' && activePlatform === 'campus') return null;
    if (announcement.targetScope === 'schools_only' && announcement.targetSchoolId && currentSchoolId && announcement.targetSchoolId !== currentSchoolId) return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    const dismissKey = `cg_dismissed_banner_${announcement.id || announcement.title}`;
    sessionStorage.setItem(dismissKey, 'true');
  };

  const isMaintenance = 
    announcement.severity === 'emergency' || 
    announcement.type === 'maintenance' ||
    announcement.title?.toLowerCase().includes('wartung');

  // Dynamic ETA wording
  const etaText = minutesRemaining !== null
    ? minutesRemaining > 0
      ? `Voraussichtliche Restdauer: Noch ca. ${minutesRemaining} Min.`
      : 'Abschlussarbeiten laufen… Gleich wieder online.'
    : null;

  // Role-specific Apple HIG Styling & Text Logic (No panic, calm reassurance)
  let bg = '#eff6ff';
  let border = '#bfdbfe';
  let textColor = '#1e40af';
  let IconComponent: any = Info;
  let displayTitle = announcement.title;
  let displayMessage = announcement.message;

  if (isMaintenance) {
    if (currentRole === 'student' || currentRole === 'parent') {
      // Students/Parents: Calm Amber/Slate (#fffbeb, #fde68a, #92400e) - ZERO PANIC
      bg = '#fffbeb';
      border = '#fde68a';
      textColor = '#92400e';
      IconComponent = ShieldCheck;
      displayTitle = 'Wartungsarbeiten: Server-Optimierung';
      displayMessage = etaText 
        ? `Unser Cloud-Team optimiert derzeit die Server. Alle deine Übe-Erfolge, Notizen und Meisterwerke sind 100% sicher gesichert. ${etaText} Die App synchronisiert sich automatisch.`
        : 'Unser Cloud-Team optimiert derzeit die Server-Infrastruktur. Alle deine Übe-Erfolge, Notizen und Meisterwerke sind 100% sicher gesichert. Die App synchronisiert sich automatisch.';
    } else if (currentRole === 'teacher') {
      // Teachers: Calm Amber with local session-queue notice
      bg = '#fffbeb';
      border = '#fde68a';
      textColor = '#92400e';
      IconComponent = Wrench;
      displayTitle = 'Wartungsfenster aktiv';
      displayMessage = etaText
        ? `Unterrichtsnotizen und Einträge werden lokal auf deinem Gerät geschützt zwischengespeichert. ${etaText}`
        : 'Unterrichtsnotizen und Einträge werden lokal auf deinem Gerät geschützt zwischengespeichert und bei Wiederverbindung atomar mit der Schuldatenbank synchronisiert.';
    } else if (currentRole === 'admin' || currentRole === 'secretary') {
      // Admins/Secretariat: Calm neutral governance
      bg = '#f8fafc';
      border = '#cbd5e1';
      textColor = '#0f172a';
      IconComponent = Wrench;
      displayTitle = 'Plattform-Wartungsmodus aktiv';
      const reasonDetail = announcement.message || 'Server-Optimierung im Rechenzentrum (Hetzner Falkenstein / Nürnberg)';
      displayMessage = etaText
        ? `Schulbetrieb im geschützten Read-Only-Modus (${reasonDetail}). ${etaText} Uptime-SLA wird überwacht.`
        : `Schulbetrieb im geschützten Read-Only-Modus (${reasonDetail}). Uptime-SLA wird überwacht.`;
    } else {
      // Master or default
      bg = '#fffbeb';
      border = '#fde68a';
      textColor = '#92400e';
      IconComponent = Wrench;
      displayTitle = announcement.title;
      displayMessage = etaText ? `${announcement.message} (${etaText})` : announcement.message;
    }
  } else if (announcement.severity === 'warning') {
    bg = '#fffbeb';
    border = '#fde68a';
    textColor = '#92400e';
    IconComponent = AlertTriangle;
  } else if (announcement.severity === 'emergency') {
    bg = '#fef2f2';
    border = '#fecaca';
    textColor = '#991b1b';
    IconComponent = AlertCircle;
  }

  return (
    <div style={{
      width: '100%',
      background: bg,
      borderBottom: `1px solid ${border}`,
      color: textColor,
      padding: '8px 16px',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '0.82rem',
      fontWeight: 700,
      zIndex: 999999,
      position: 'relative',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      transition: 'all 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
        <IconComponent size={16} />
        <span style={{ fontWeight: 850 }}>
          {displayTitle}
        </span>
        <span style={{ fontWeight: 600, color: textColor, opacity: 0.9 }}>
          {displayMessage}
        </span>

        {etaText && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: isMaintenance ? 'rgba(146, 64, 14, 0.08)' : 'rgba(0, 0, 0, 0.07)',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '0.74rem',
            fontFamily: 'monospace',
            fontWeight: 800
          }}>
            <Clock size={12} />
            {etaText}
          </span>
        )}
      </div>

      {announcement.dismissible !== false && (
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: textColor,
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.7
          }}
          title="Schließen"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};
