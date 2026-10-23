import React, { useState, useRef, useCallback } from 'react';
import { Activity, Plus, Minus, SlidersHorizontal, Flame, Drum, Hand, Sparkles, Layers, Radio } from 'lucide-react';
import { SoundKitType, StudioSoundEngine } from '../../../utils/StudioSoundEngine';
import { getTempoItalianLabel } from './GrooveBpmControlDeck';

export interface GrooveCalmStudioDockProps {
  bpm: number;
  onBpmChange: (newBpm: number) => void;
  soundKit: SoundKitType;
  onSoundKitChange: (kit: SoundKitType) => void;
  isBassEnabled?: boolean;
  onToggleBass?: () => void;
  onOpenAudioSettings: () => void;
  pocketStreak: number;
  comboMultiplier: string;
  timingOffsetMs: number | null;
  lastRating: 'pocket' | 'good' | 'rush' | 'drag' | 'miss' | null;
  pedagogicalCoachingTip: string;
  gaugeNeedlePercent: number;
  disabled?: boolean;
  isNotebook?: boolean;
}

const SOUND_KITS: { id: SoundKitType; label: string; icon: React.ReactNode }[] = [
  { id: 'acoustic', label: 'Drums', icon: <Drum size={15} strokeWidth={2.2} /> },
  { id: 'body_percussion', label: 'Body Perc', icon: <Hand size={15} strokeWidth={2.2} /> },
  { id: 'classic_wood', label: 'Klassik', icon: <Sparkles size={15} strokeWidth={2.2} /> },
  { id: 'cajon_latin', label: 'Cajón', icon: <Layers size={15} strokeWidth={2.2} /> }
];

/**
 * 🌟 0,1% Goldstandard: Calm Studio-Dock
 * Monolithisches, reduziertes Begleit- und Steuerdeck ohne optische Überladung
 */
export const GrooveCalmStudioDock: React.FC<GrooveCalmStudioDockProps> = ({
  bpm,
  onBpmChange,
  soundKit,
  onSoundKitChange,
  onOpenAudioSettings,
  pocketStreak,
  comboMultiplier,
  timingOffsetMs,
  lastRating,
  pedagogicalCoachingTip,
  gaugeNeedlePercent,
  disabled = false,
  isNotebook = false
}) => {
  const tapTimesRef = useRef<number[]>([]);
  const [tapActive, setTapActive] = useState(false);
  const tempoInfo = getTempoItalianLabel(bpm);

  // Musikalische Tap-Tempo Engine
  const handleTapTempo = useCallback(() => {
    if (disabled) return;
    const now = Date.now();
    setTapActive(true);
    setTimeout(() => setTapActive(false), 120);

    const history = tapTimesRef.current;
    if (history.length > 0 && (now - history[history.length - 1] > 2000)) {
      tapTimesRef.current = [now];
      return;
    }

    history.push(now);
    if (history.length > 5) history.shift();

    if (history.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < history.length; i++) {
        intervals.push(history[i] - history[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval > 0) {
        const calculatedBpm = Math.round(60000 / avgInterval);
        const clampedBpm = Math.max(40, Math.min(200, calculatedBpm));
        onBpmChange(clampedBpm);
      }
    }
  }, [disabled, onBpmChange]);

  const adjustBpm = (delta: number) => {
    if (disabled) return;
    onBpmChange(Math.max(40, Math.min(200, bpm + delta)));
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: isNotebook ? '22px' : '18px',
        border: '1.5px solid #e2e8f0',
        padding: isNotebook ? '16px 18px' : '14px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
        boxSizing: 'border-box',
        width: '100%'
      }}
      aria-label="Studio Kontroll-Dock"
    >
      {/* ─────────────────────────────────────────────────────────────
          BEREICH 1: TEMPO & PULS (Hero-Zentrum)
      ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={13} color="#ea580c" />
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tempo & Puls
            </span>
          </div>
          <div style={{
            background: '#fff7ed',
            borderRadius: '100px',
            padding: '2px 8px',
            fontSize: '0.66rem',
            fontWeight: 900,
            color: '#c2410c'
          }}>
            {tempoInfo.term} • {bpm} BPM
          </div>
        </div>

        {/* Hero-BPM Ziffer & Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <div style={{ display: 'flex', gap: '3px' }}>
            <button
              type="button"
              disabled={disabled || bpm <= 40}
              onClick={() => adjustBpm(-5)}
              style={{
                width: '30px',
                height: '32px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: '0.72rem',
                fontWeight: 900,
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
              title="-5 BPM"
            >
              -5
            </button>
            <button
              type="button"
              disabled={disabled || bpm <= 40}
              onClick={() => adjustBpm(-1)}
              style={{
                width: '30px',
                height: '32px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
              title="-1 BPM"
            >
              <Minus size={12} strokeWidth={2.6} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
            <span style={{
              fontSize: '1.9rem',
              fontWeight: 950,
              fontFamily: "'Plus Jakarta Sans', monospace",
              color: '#0f172a',
              letterSpacing: '-0.03em',
              lineHeight: 1
            }}>
              {bpm}
            </span>
            <span style={{ fontSize: '0.74rem', fontWeight: 850, color: '#94a3b8' }}>BPM</span>
          </div>

          <div style={{ display: 'flex', gap: '3px' }}>
            <button
              type="button"
              disabled={disabled || bpm >= 200}
              onClick={() => adjustBpm(+1)}
              style={{
                width: '30px',
                height: '32px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
              title="+1 BPM"
            >
              <Plus size={12} strokeWidth={2.6} />
            </button>
            <button
              type="button"
              disabled={disabled || bpm >= 200}
              onClick={() => adjustBpm(+5)}
              style={{
                width: '30px',
                height: '32px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: '0.72rem',
                fontWeight: 900,
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
              title="+5 BPM"
            >
              +5
            </button>
          </div>
        </div>

        {/* Schieberegler & Tap-Tempo Button in einer Zeile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          <input
            type="range"
            min={40}
            max={200}
            step={1}
            value={bpm}
            disabled={disabled}
            onChange={(e) => onBpmChange(Number(e.target.value))}
            style={{
              flex: 1,
              accentColor: '#ea580c',
              cursor: disabled ? 'not-allowed' : 'pointer',
              height: '5px'
            }}
            aria-label="Tempo-Schieberegler"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={handleTapTempo}
            style={{
              background: tapActive ? '#ea580c' : '#f8fafc',
              border: tapActive ? '1px solid #c2410c' : '1px solid #cbd5e1',
              color: tapActive ? '#ffffff' : '#334155',
              borderRadius: '8px',
              padding: '4px 8px',
              fontSize: '0.68rem',
              fontWeight: 900,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              transition: 'all 0.08s ease'
            }}
            title="Im Rhythmus mittippen für automatisches Tempo"
          >
            <Radio size={12} strokeWidth={2.4} color={tapActive ? '#ffffff' : '#475569'} />
            <span>Tap-Tempo</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BEREICH 2: KLANG & BEGLEITUNG (Kompakt & nahtlos)
      ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.70rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Sound-Kit
          </span>
          <button
            type="button"
            onClick={onOpenAudioSettings}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0',
              fontSize: '0.66rem',
              fontWeight: 850,
              color: '#0284c7',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
            title="Audio-Latenz & Kalibrierung öffnen"
          >
            <SlidersHorizontal size={10} />
            <span>Latenz-Setup</span>
          </button>
        </div>

        {/* Kompaktes horizontales 4er Segment mit monochromen Icons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
          {SOUND_KITS.map(kit => {
            const isSelected = StudioSoundEngine.normalizeKit(soundKit) === kit.id || soundKit === kit.id;
            return (
              <button
                key={kit.id}
                type="button"
                disabled={disabled}
                onClick={() => onSoundKitChange(kit.id)}
                style={{
                  border: isSelected ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                  background: isSelected ? '#f0f9ff' : '#f8fafc',
                  color: isSelected ? '#0369a1' : '#64748b',
                  borderRadius: '8px',
                  padding: '6px 2px',
                  fontSize: '0.66rem',
                  fontWeight: isSelected ? 950 : 750,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.1s ease'
                }}
                title={kit.label}
              >
                <div style={{ color: isSelected ? '#0284c7' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {kit.icon}
                </div>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                  {kit.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BEREICH 3: POCKET & LIVE-FEEDBACK (Das Wesentliche)
      ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.70rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pocket & Timing
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {pocketStreak >= 4 && (
              <span style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                color: '#c2410c',
                fontSize: '0.64rem',
                fontWeight: 950,
                padding: '1px 5px',
                borderRadius: '100px'
              }}>
                x{comboMultiplier}
              </span>
            )}
            <span style={{ fontSize: '0.72rem', fontWeight: 950, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Flame size={12} color="#ea580c" /> Streak: {pocketStreak}
            </span>
          </div>
        </div>

        {/* Millisekunden-Gauge */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '7px',
          background: '#f1f5f9',
          borderRadius: '5px',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ position: 'absolute', left: '15%', width: '22%', top: 0, bottom: 0, background: '#dbeafe' }} />
          <div style={{ position: 'absolute', left: '37%', width: '26%', top: 0, bottom: 0, background: '#dcfce7' }} />
          <div style={{ position: 'absolute', left: '63%', width: '22%', top: 0, bottom: 0, background: '#fef3c7' }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: '#f59e0b', transform: 'translateX(-50%)' }} />
          {timingOffsetMs !== null && (
            <div style={{
              position: 'absolute',
              left: `${gaugeNeedlePercent}%`,
              top: '1px',
              bottom: '1px',
              width: '5px',
              borderRadius: '3px',
              background: lastRating === 'pocket' ? '#d97706' : (lastRating === 'good' ? '#16a34a' : (lastRating === 'rush' ? '#2563eb' : (lastRating === 'drag' ? '#b45309' : '#dc2626'))),
              transform: 'translateX(-50%)',
              transition: 'left 0.12s ease'
            }} />
          )}
        </div>

        <p style={{ margin: 0, fontSize: '0.66rem', color: '#64748b', lineHeight: 1.35, fontWeight: 650 }}>
          {pedagogicalCoachingTip}
        </p>
      </div>
    </div>
  );
};
