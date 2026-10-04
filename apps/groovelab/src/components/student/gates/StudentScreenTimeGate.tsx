import React, { useMemo } from 'react';
import { Moon, School, Clock, Key } from 'lucide-react';

export type ScreenTimeLockType = 'bedtime' | 'daytime' | 'instant';

export interface ScreenTimeLockState {
  lockType: ScreenTimeLockType;
  untilStr: string;
}

interface UseStudentScreenTimeLockProps {
  isAdultStudent: boolean;
  isParentUnlocked: boolean;
  parentControls: {
    isCurrentlyInInstantLock?: boolean;
    instantLockUntil?: number | null;
    bedtimeModeEnabled?: boolean;
    bedtimeStart?: string;
    bedtimeEnd?: string;
    daytimeLockEnabled?: boolean;
    daytimeLockStart?: string;
    daytimeLockEnd?: string;
    daytimeLockDays?: 'school_days' | 'everyday';
  };
}

/**
 * 🛡️ useStudentScreenTimeLock (DSGVO Art. 8 / BGB Jugend- & Zeit-Governance)
 * Berechnet deterministisch, ob aktuell eine Nachtruhe-, Schulzeit- oder Sofortsperre aktiv ist.
 */
export function useStudentScreenTimeLock({
  isAdultStudent,
  isParentUnlocked,
  parentControls
}: UseStudentScreenTimeLockProps): ScreenTimeLockState | null {
  return useMemo(() => {
    if (isAdultStudent || isParentUnlocked) return null;

    // 1. Sofort-Sperre (Instant Lock)
    if (parentControls.isCurrentlyInInstantLock && parentControls.instantLockUntil) {
      const untilDate = new Date(parentControls.instantLockUntil);
      const timeStr = `${String(untilDate.getHours()).padStart(2, '0')}:${String(untilDate.getMinutes()).padStart(2, '0')} Uhr`;
      return { lockType: 'instant', untilStr: timeStr };
    }

    const now = new Date();
    const currentDecimal = now.getHours() + now.getMinutes() / 60;
    const parseTime = (t?: string, def = 0) => {
      if (!t) return def;
      const parts = t.split(':').map(Number);
      return parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1]) ? parts[0] + parts[1] / 60 : def;
    };

    // 2. Nachtruhe (Bedtime Mode)
    if (parentControls.bedtimeModeEnabled) {
      const bStart = parseTime(parentControls.bedtimeStart, 21.0);
      const bEnd = parseTime(parentControls.bedtimeEnd, 6.5);
      const isNight = bStart > bEnd
        ? (currentDecimal >= bStart || currentDecimal < bEnd)
        : (currentDecimal >= bStart && currentDecimal < bEnd);
      if (isNight) {
        return { lockType: 'bedtime', untilStr: `${parentControls.bedtimeEnd || '06:30'} Uhr` };
      }
    }

    // 3. Schulzeit-Sperre (Daytime Lock)
    if (parentControls.daytimeLockEnabled) {
      const day = now.getDay(); // 0 = Sonntag, 6 = Samstag
      const isDayActive = parentControls.daytimeLockDays === 'everyday' || (day >= 1 && day <= 5);
      if (isDayActive) {
        const dStart = parseTime(parentControls.daytimeLockStart, 8.0);
        const dEnd = parseTime(parentControls.daytimeLockEnd, 14.0);
        if (currentDecimal >= dStart && currentDecimal < dEnd) {
          return { lockType: 'daytime', untilStr: `${parentControls.daytimeLockEnd || '14:00'} Uhr` };
        }
      }
    }

    return null;
  }, [
    isAdultStudent,
    isParentUnlocked,
    parentControls.isCurrentlyInInstantLock,
    parentControls.instantLockUntil,
    parentControls.bedtimeModeEnabled,
    parentControls.bedtimeStart,
    parentControls.bedtimeEnd,
    parentControls.daytimeLockEnabled,
    parentControls.daytimeLockStart,
    parentControls.daytimeLockEnd,
    parentControls.daytimeLockDays
  ]);
}

interface StudentScreenTimeGateProps {
  lockType: ScreenTimeLockType;
  unlockTimeStr?: string;
  onOpenParentGate: () => void;
}

/**
 * 🛡️ StudentScreenTimeGate (Tier-2 Parental Governance / DSGVO Art. 8)
 * Barrierefreier, kindgerechter Sperrbildschirm bei aktiver Nachtruhe,
 * Schulzeit-Sperre oder Sofort-Pause mit PIN-Bypass für Eltern.
 */
export const StudentScreenTimeGate: React.FC<StudentScreenTimeGateProps> = ({
  lockType,
  unlockTimeStr,
  onOpenParentGate
}) => {
  const isBedtime = lockType === 'bedtime';
  const isDaytime = lockType === 'daytime';

  const config = isBedtime
    ? {
        title: 'Gute Nacht! Zeit zum Schlafen',
        subtitle: `Deine Musik-App schläft jetzt bis ${unlockTimeStr || 'morgen früh'}. Ruh dich gut aus, um morgen wieder voller Energie zu musizieren!`,
        gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        cardBg: '#0f172a',
        textColor: '#f8fafc',
        subTextColor: '#cbd5e1',
        icon: <Moon size={48} color="#facc15" strokeWidth={2.2} />,
        badgeText: '🌙 Nachtruhe aktiv'
      }
    : isDaytime
    ? {
        title: 'Schulzeit! Die App pausiert',
        subtitle: `Konzentriere dich auf die Schule! Deine Musik-App ist ab ${unlockTimeStr || 'Schulschluss'} wieder für dich da.`,
        gradient: 'linear-gradient(135deg, #0f766e 0%, #042f2e 100%)',
        cardBg: '#134e4a',
        textColor: '#f8fafc',
        subTextColor: '#ccfbf1',
        icon: <School size={48} color="#5eead4" strokeWidth={2.2} />,
        badgeText: '🎒 Schulzeit-Sperre'
      }
    : {
        title: 'Übe-Pause eingelegt',
        subtitle: `Deine Eltern haben eine Bildschirm-Pause bis ${unlockTimeStr || 'später'} aktiviert.`,
        gradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        cardBg: '#1e293b',
        textColor: '#f8fafc',
        subTextColor: '#cbd5e1',
        icon: <Clock size={48} color="#38bdf8" strokeWidth={2.2} />,
        badgeText: '⏳ Sofort-Pause aktiv'
      };

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '24px 16px',
        textAlign: 'center',
        fontFamily: '"Outfit", "Inter", sans-serif'
      }}
    >
      <div
        style={{
          maxWidth: '440px',
          width: '100%',
          background: config.gradient,
          borderRadius: '28px',
          padding: '36px 24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          color: config.textColor,
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        {/* Ambient Icon Circle */}
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid rgba(255, 255, 255, 0.18)'
          }}
        >
          {config.icon}
        </div>

        {/* Status Badge */}
        <span
          style={{
            fontSize: '0.74rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '5px 14px',
            borderRadius: '100px',
            background: 'rgba(255, 255, 255, 0.15)',
            color: '#ffffff'
          }}
        >
          {config.badgeText}
        </span>

        {/* Title & Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2
            style={{
              margin: 0,
              fontSize: '1.45rem',
              fontWeight: 900,
              lineHeight: 1.25,
              color: '#ffffff'
            }}
          >
            {config.title}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: '0.86rem',
              color: config.subTextColor,
              lineHeight: 1.45,
              fontWeight: 500
            }}
          >
            {config.subtitle}
          </p>
        </div>

        {/* Parent PIN Bypass Button */}
        <div style={{ marginTop: '12px', width: '100%' }}>
          <button
            type="button"
            onClick={onOpenParentGate}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.95)',
              color: '#0f172a',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'transform 0.15s ease, background 0.15s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
            aria-label="Eltern-PIN eingeben zum Entsperren der App"
          >
            <Key size={16} color="#0f172a" />
            <span>Eltern-PIN zum Entsperren</span>
          </button>
        </div>
      </div>
    </div>
  );
};
