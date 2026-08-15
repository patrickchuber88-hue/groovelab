import React, { useState, useEffect } from 'react';
import { Megaphone, AlertTriangle, AlertCircle, Info, X, Clock } from 'lucide-react';

export interface BroadcastAnnouncement {
  id?: string;
  isActive: boolean;
  severity: 'info' | 'warning' | 'emergency';
  title: string;
  message: string;
  targetAudience: 'all' | 'teachers' | 'students' | 'admins';
  countdownMinutes?: number;
  scheduledTime?: string;
  dismissible?: boolean;
  createdAt?: string;
}

interface GlobalBroadcastBannerProps {
  announcement: BroadcastAnnouncement | null;
  currentRole?: string;
}

export const GlobalBroadcastBanner: React.FC<GlobalBroadcastBannerProps> = ({
  announcement,
  currentRole
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (!announcement || !announcement.isActive) return;
    
    // Check if dismissed previously in this session
    const dismissKey = `cg_dismissed_banner_${announcement.id || announcement.title}`;
    if (sessionStorage.getItem(dismissKey)) {
      setDismissed(true);
    } else {
      setDismissed(false);
    }

    if (announcement.countdownMinutes && announcement.countdownMinutes > 0) {
      setSecondsRemaining(announcement.countdownMinutes * 60);
    }
  }, [announcement]);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  if (!announcement || !announcement.isActive || dismissed) return null;

  // Check target audience filter
  if (announcement.targetAudience !== 'all') {
    if (announcement.targetAudience === 'teachers' && currentRole !== 'teacher') return null;
    if (announcement.targetAudience === 'students' && currentRole !== 'student') return null;
    if (announcement.targetAudience === 'admins' && currentRole !== 'admin' && currentRole !== 'secretary' && currentRole !== 'master') return null;
  }

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDismiss = () => {
    setDismissed(true);
    const dismissKey = `cg_dismissed_banner_${announcement.id || announcement.title}`;
    sessionStorage.setItem(dismissKey, 'true');
  };

  // Theme styling
  let bg = '#eff6ff';
  let border = '#bfdbfe';
  let textColor = '#1e40af';
  let IconComponent = Info;

  if (announcement.severity === 'warning') {
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
          {announcement.title}
        </span>
        <span style={{ fontWeight: 600, color: textColor, opacity: 0.9 }}>
          {announcement.message}
        </span>

        {secondsRemaining > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(0, 0, 0, 0.07)',
            padding: '2px 8px',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontWeight: 800
          }}>
            <Clock size={12} />
            Countdown: {formatCountdown(secondsRemaining)} min (Bitte Arbeit speichern)
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
