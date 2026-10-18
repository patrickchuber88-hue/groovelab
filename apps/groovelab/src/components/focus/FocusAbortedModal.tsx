import React, { useEffect } from 'react';
import { TimerOff, AlertOctagon, RotateCcw, Smartphone, HandMetal, Sparkles } from 'lucide-react';
import { FocusAbortReason } from '../../hooks/useFocusInterruptionGuard';
import { DeviceAntiCheatAbortReason } from '../../hooks/useDeviceAntiCheatGuard';

export type AnyFocusAbortReason = FocusAbortReason | DeviceAntiCheatAbortReason | string;

export interface FocusAbortedModalProps {
  isOpen: boolean;
  reason: AnyFocusAbortReason | null;
  toolName?: string;
  uiLevel?: 'junior' | 'teen' | 'pro' | string;
  onClose: () => void;
}

export const FocusAbortedModal: React.FC<FocusAbortedModalProps> = ({
  isOpen,
  reason,
  toolName = 'Fokus-Timer',
  uiLevel = 'teen',
  onClose
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isJunior = uiLevel === 'junior';
  const isPro = uiLevel === 'pro';

  // Wording & Details Resolution
  const getReasonDetails = (): { title: string; subtitle: string; icon: React.ReactNode } => {
    switch (reason) {
      case 'device_lifted_timeout':
        return {
          title: 'Gerät vom Tisch angehoben',
          subtitle: `Das Gerät wurde während des Übens angehoben und nicht innerhalb von 10 Sekunden wieder ruhig auf den Tisch gelegt.`,
          icon: <Smartphone size={36} />
        };
      case 'device_motion_strike':
        return {
          title: 'Handheld-Nutzung registriert',
          subtitle: `Die Bewegungssensoren haben aktive Hände am Gerät registriert. Beim Instrumenten-Üben bleibt das Smartphone unbewegt auf dem Tisch.`,
          icon: <Smartphone size={36} />
        };
      case 'touch_interaction_strike':
        return {
          title: 'Display-Bedienung erkannt',
          subtitle: `Der Bildschirm wurde während der Fokus-Session berührt. Wer Instrument übt, bedient kein Smartphone.`,
          icon: <AlertOctagon size={36} />
        };
      case 'desktop_input_strike':
        return {
          title: 'Aktive Computernutzung erkannt',
          subtitle: `Anhaltende Tastatur- oder Mauseingaben registriert. Die volle Aufmerksamkeit gehört dem Instrument.`,
          icon: <AlertOctagon size={36} />
        };
      case 'app_switch_timeout':
        return {
          title: 'Tab- oder App-Wechsel',
          subtitle: `Du hast die App verlassen oder den Tab gewechselt. Der Fokus-Timer bleibt während des Übens im Vordergrund.`,
          icon: <TimerOff size={36} />
        };
      case 'strike_limit_exceeded':
        return {
          title: 'Kulanz-Limit erreicht (2. Unterbrechung)',
          subtitle: `Du hast das ${toolName} während einer laufenden Session ein zweites Mal unterbrochen. Die 10s-Kulanz gilt nur 1× pro Session.`,
          icon: <AlertOctagon size={36} />
        };
      case 'permission_denied':
        return {
          title: 'Sensor-Berechtigung erforderlich',
          subtitle: `Für die Anti-Schummel-Prüfung benötigt der Fokus-Timer Zugriff auf die Lagesensoren. Bitte in den Einstellungen erlauben!`,
          icon: <AlertOctagon size={36} />
        };
      case 'sensor_probe_failed':
        return {
          title: 'Keine Sensor-Signale empfangen',
          subtitle: `Das Mobilgerät liefert keine Lagesensordaten. Bitte Sensoren im Browser aktivieren.`,
          icon: <AlertOctagon size={36} />
        };
      case 'timeout':
      default:
        return {
          title: '10-Sekunden-Zeitlimit überschritten',
          subtitle: `Du hast das ${toolName} unterbrochen und bist nicht innerhalb von 10 Sekunden zurückgekehrt.`,
          icon: <TimerOff size={36} />
        };
    }
  };

  const { title: reasonTitle, subtitle: reasonSubtitle, icon: reasonIcon } = getReasonDetails();

  // Pedagogical Motivation Text
  const getPedagogicalNote = () => {
    if (isJunior) {
      return 'Hoppla! Dein Zauber-Fokus braucht absolute Ruhe auf dem Tisch, damit deine magische Übe-Flamme brennt. Schnapp dir dein Instrument und starte gleich eine neue Zauber-Runde! 🪄';
    }
    if (isPro) {
      return 'Disziplin-Abbruch: Die Session wurde verworfen (0 Minuten gewertet). Konzentriertes Üben am Instrument erfordert physische Trennung von störenden Bildschirmen.';
    }
    return 'Die angebrochene Übezeit und XP dieser Session wurden nach den Anti-Ablenkungs-Regeln verworfen. Starte jetzt einen neuen Versuch und bleibe mit vollem Fokus am Instrument!';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-abort-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeInFocusGuard 0.2s ease-out'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '32px 24px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          border: '1px solid #fee2e2'
        }}
      >
        {/* Icon Circle */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: isJunior ? '#fef3c7' : '#fee2e2',
            color: isJunior ? '#d97706' : '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}
        >
          {isJunior ? <Sparkles size={36} /> : reasonIcon}
        </div>

        {/* Title */}
        <h2
          id="focus-abort-title"
          style={{
            margin: '0 0 12px 0',
            fontSize: '22px',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.02em'
          }}
        >
          {isJunior ? 'Zauber-Fokus erloschen 🪄' : 'Übe-Session abgebrochen'}
        </h2>

        {/* Reason Box */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '14px 16px',
            marginBottom: '20px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <p
            style={{
              margin: '0 0 6px 0',
              fontSize: '14px',
              fontWeight: 700,
              color: isJunior ? '#b45309' : '#dc2626'
            }}
          >
            {reasonTitle}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#475569',
              lineHeight: 1.4
            }}
          >
            {reasonSubtitle}
          </p>
        </div>

        {/* Pedagogical Note */}
        <p
          style={{
            margin: '0 0 24px 0',
            fontSize: '13px',
            color: '#64748b',
            lineHeight: 1.5
          }}
        >
          {getPedagogicalNote()}
        </p>

        {/* Action Button */}
        <button
          type="button"
          autoFocus
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClose();
            }
          }}
          style={{
            width: '100%',
            minHeight: '48px',
            padding: '12px 24px',
            background: '#0f172a',
            color: isJunior ? '#fef08a' : '#facc15',
            border: 'none',
            borderRadius: '14px',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            touchAction: 'manipulation',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
            outline: 'none'
          }}
          aria-label="Abbruch-Hinweis bestätigen und schließen"
        >
          {isJunior ? <Sparkles size={18} /> : <RotateCcw size={18} />}
          <span>{isJunior ? 'Neue Zauber-Runde starten! 🚀' : 'Verstanden & Neue Session starten'}</span>
        </button>
      </div>

      <style>{`
        @keyframes fadeInFocusGuard {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
