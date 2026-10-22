import React, { useState, useRef, useCallback } from 'react';
import { Sliders, Plus, Minus, Activity, Radio } from 'lucide-react';

export interface GrooveBpmControlDeckProps {
  bpm: number;
  onBpmChange: (newBpm: number) => void;
  disabled?: boolean;
  isNotebook?: boolean;
}

/**
 * Musikalische Tempo-Klassifizierung nach klassisch-didaktischem VdM-Standard
 */
export const getTempoItalianLabel = (bpm: number): { term: string; german: string } => {
  if (bpm < 60) return { term: 'Largo', german: 'Breit & getragen' };
  if (bpm < 76) return { term: 'Adagio', german: 'Ruhig & entspannt' };
  if (bpm < 108) return { term: 'Andante', german: 'Gehend & fließend' };
  if (bpm < 120) return { term: 'Moderato', german: 'Mäßig bewegt' };
  if (bpm < 168) return { term: 'Allegro', german: 'Munter & schnell' };
  return { term: 'Presto', german: 'Sehr rasch & feurig' };
};

export const GrooveBpmControlDeck: React.FC<GrooveBpmControlDeckProps> = ({
  bpm,
  onBpmChange,
  disabled = false,
  isNotebook = false
}) => {
  const tapTimesRef = useRef<number[]>([]);
  const [tapActive, setTapActive] = useState(false);
  const tempoInfo = getTempoItalianLabel(bpm);

  // 🎯 Musikalische Tap-Tempo Engine (Errechnet exakten Durchschnitt der letzten 4 Taps)
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
        borderRadius: isNotebook ? '20px' : '16px',
        border: '1.5px solid #e2e8f0',
        padding: isNotebook ? '16px 18px' : '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        boxSizing: 'border-box'
      }}
      aria-label="Metronom Tempo Steuerung"
    >
      {/* 1. Header: Titel & Italienische Tempobezeichnung */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={14} color="#ea580c" />
          <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Tempo & Puls
          </span>
        </div>
        <div style={{
          background: '#fff7ed',
          border: '1px solid #ffedd5',
          borderRadius: '100px',
          padding: '2px 9px',
          fontSize: '0.68rem',
          fontWeight: 900,
          color: '#c2410c'
        }}>
          {tempoInfo.term} • {tempoInfo.german}
        </div>
      </div>

      {/* 2. Großes Hero-BPM-Display & Schnelltasten */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        {/* Minus-Tasten */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            disabled={disabled || bpm <= 40}
            onClick={() => adjustBpm(-5)}
            style={{
              width: '32px',
              height: '36px',
              borderRadius: '9px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '0.74rem',
              fontWeight: 900,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.1s ease'
            }}
            title="Tempo um 5 BPM verlangsamen"
            aria-label="-5 BPM"
          >
            -5
          </button>
          <button
            type="button"
            disabled={disabled || bpm <= 40}
            onClick={() => adjustBpm(-1)}
            style={{
              width: '32px',
              height: '36px',
              borderRadius: '9px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '0.74rem',
              fontWeight: 900,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.1s ease'
            }}
            title="Tempo um 1 BPM verlangsamen"
            aria-label="-1 BPM"
          >
            <Minus size={13} strokeWidth={2.6} />
          </button>
        </div>

        {/* Hero-BPM Ziffer */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', textAlign: 'center' }}>
          <span style={{
            fontSize: '2.1rem',
            fontWeight: 950,
            fontFamily: "'Plus Jakarta Sans', monospace",
            color: '#0f172a',
            letterSpacing: '-0.03em',
            lineHeight: 1
          }}>
            {bpm}
          </span>
          <span style={{ fontSize: '0.78rem', fontWeight: 850, color: '#64748b' }}>
            BPM
          </span>
        </div>

        {/* Plus-Tasten */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            disabled={disabled || bpm >= 200}
            onClick={() => adjustBpm(+1)}
            style={{
              width: '32px',
              height: '36px',
              borderRadius: '9px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '0.74rem',
              fontWeight: 900,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.1s ease'
            }}
            title="Tempo um 1 BPM beschleunigen"
            aria-label="+1 BPM"
          >
            <Plus size={13} strokeWidth={2.6} />
          </button>
          <button
            type="button"
            disabled={disabled || bpm >= 200}
            onClick={() => adjustBpm(+5)}
            style={{
              width: '32px',
              height: '36px',
              borderRadius: '9px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '0.74rem',
              fontWeight: 900,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.1s ease'
            }}
            title="Tempo um 5 BPM beschleunigen"
            aria-label="+5 BPM"
          >
            +5
          </button>
        </div>
      </div>

      {/* 3. Stufenloser Schieberegler (Slider für iPads & Notenständer) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <input
          type="range"
          min={40}
          max={200}
          step={1}
          value={bpm}
          disabled={disabled}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#ea580c',
            cursor: disabled ? 'not-allowed' : 'pointer',
            height: '6px'
          }}
          aria-label="Tempo-Schieberegler"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8' }}>
          <span>40 Largo</span>
          <span>100 Andante</span>
          <span>160 Presto</span>
          <span>200</span>
        </div>
      </div>

      {/* 4. Tap-Tempo Button (Interaktiv für Schüler & Lehrkraft) */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleTapTempo}
        style={{
          width: '100%',
          background: tapActive ? '#ea580c' : '#f8fafc',
          border: tapActive ? '1.5px solid #c2410c' : '1.5px dashed #cbd5e1',
          color: tapActive ? '#ffffff' : '#334155',
          borderRadius: '12px',
          padding: '8px 12px',
          fontSize: '0.76rem',
          fontWeight: 950,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: tapActive ? '0 0 12px rgba(234, 88, 12, 0.3)' : 'none',
          transform: tapActive ? 'scale(0.98)' : 'scale(1)',
          transition: 'all 0.08s ease'
        }}
        title="Tippe 3x im Rhythmus deines Liedes für automatisches Tempo"
        aria-label="Tap-Tempo"
      >
        <Radio size={14} strokeWidth={2.4} />
        <span>TAP TEMPO (Im Puls mittippen)</span>
      </button>
    </div>
  );
};
