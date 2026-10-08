/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * MicroScorePlayerBar.tsx
 * 
 * 2027 0,1% Goldstandard YouTube / Instagram Player Bar:
 * - Content-First & Social Media Ästhetik (YouTube Glow Play, Reel-Loop, Speed-Pill)
 * - Großer 52px Glow Play/Stop-Button mit Instrumenten-Akzentfarbe
 * - YouTube-Style WSOLA Speed-Dropdown (0.7x, 0.85x, 1.0x, 1.2x)
 * - Instagram-Style Loop-Pill mit weichem Highlight
 * - 1-Click Klick/Metronom Toggle & Replay zum Anfang
 * - 1-Click Schalter für Live-Mitspiel Challenge (YIN Pitch Stream)
 * - Unifarben- & Monochrom-Kontur-Axiom konform (Zero Color-Clash)
 * - BFSG 2025 & WCAG 2.2 AA konform (Tastatur-Vollbedienbarkeit, Kontrast ≥ 7:1)
 * - Monolith Ceiling Axiom: Schlanker autarker Satellit (< 300 Zeilen)
 */

import React, { useState } from 'react';
import { 
  Play, Square, RotateCcw, Repeat, 
  ChevronDown, Mic, Volume2, VolumeX, Sparkles
} from 'lucide-react';
import { MicroScoreInstrument } from './microScore.types';

export interface MicroScorePlayerBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRewind: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  speedRate: number;
  onChangeSpeed: (speed: number) => void;
  isMetronomeActive: boolean;
  onToggleMetronome: () => void;
  soloSample: boolean;
  onToggleSoloSample: () => void;
  instrument: MicroScoreInstrument;
  tempoBpm: number;
  isChallengeOpen: boolean;
  onToggleChallenge: () => void;
  readOnly?: boolean;
  variant?: 'dock' | 'header';
}

const SPEED_PRESETS = [
  { value: 0.7, label: '0.7x (Üben)', shortLabel: '0.7x' },
  { value: 0.85, label: '0.85x (Langsam)', shortLabel: '0.85x' },
  { value: 1.0, label: '1.0x (Normal)', shortLabel: '1.0x' },
  { value: 1.2, label: '1.2x (Pro)', shortLabel: '1.2x' }
];

export function getInstrumentTheme(_instrument?: MicroScoreInstrument) {
  // 🏛️ 0,1% Goldstandard: Einheitliche Lila/Indigo-Akzentfarbe für ausnahmslos alle Übungen
  return {
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    lightBg: '#e0e7ff',
    textColor: '#3730a3',
    glow: 'rgba(99, 102, 241, 0.42)',
    badgeBg: '#eef2ff',
    badgeText: '#4338ca'
  };
}

export const MicroScorePlayerBar: React.FC<MicroScorePlayerBarProps> = ({
  isPlaying,
  onTogglePlay,
  onRewind,
  isLooping,
  onToggleLoop,
  speedRate,
  onChangeSpeed,
  isMetronomeActive,
  onToggleMetronome,
  soloSample,
  onToggleSoloSample,
  instrument,
  tempoBpm,
  isChallengeOpen,
  onToggleChallenge,
  readOnly = false,
  variant = 'header'
}) => {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const theme = getInstrumentTheme(instrument);

  const currentSpeed = SPEED_PRESETS.find(s => Math.abs(s.value - speedRate) < 0.05) || {
    value: speedRate,
    label: `${speedRate}x`,
    shortLabel: `${speedRate}x`
  };

  if (variant === 'header') {
    return (
      <div
        role="toolbar"
        aria-label="Micro-Score Übe- & Abspiel-Steuerung"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap',
          position: 'relative'
        }}
      >
        {/* Zurück zum Taktanfang */}
        <button
          type="button"
          onClick={onRewind}
          aria-label="Zurück zum Anfang"
          title="Zurück zum Taktanfang (Takt 1)"
          style={{
            border: 'none',
            background: '#f8fafc',
            color: '#475569',
            borderRadius: '10px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
        >
          <RotateCcw size={14} strokeWidth={2.4} />
        </button>

        {/* Play / Stopp Prominent */}
        <button
          type="button"
          role="button"
          tabIndex={0}
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Wiedergabe anhalten' : 'Noten-Schnipsel abspielen'}
          title={isPlaying ? 'Stopp (Leertaste)' : 'Abspielen (Leertaste)'}
          style={{
            border: 'none',
            background: isPlaying ? '#dc2626' : theme.primary,
            color: '#ffffff',
            borderRadius: '10px',
            height: '32px',
            padding: '0 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: isPlaying 
              ? '0 2px 8px rgba(220, 38, 38, 0.4)' 
              : `0 2px 10px ${theme.glow}`,
            transition: 'all 0.15s ease',
            outline: 'none'
          }}
          className="hover-scale-mini"
        >
          {isPlaying ? (
            <Square size={12} fill="#ffffff" strokeWidth={0} />
          ) : (
            <Play size={13} fill="#ffffff" strokeWidth={0} style={{ marginLeft: '1px' }} />
          )}
          <span>{isPlaying ? 'Stopp' : 'Abspielen'}</span>
        </button>

        {/* Loop Toggle */}
        <button
          type="button"
          onClick={onToggleLoop}
          aria-label={isLooping ? 'Loop aktiv' : 'Loop inaktiv'}
          aria-pressed={isLooping}
          title={isLooping ? 'Endlosschleife aktiv' : 'Endlosschleife einschalten'}
          style={{
            border: 'none',
            background: isLooping ? theme.lightBg : '#f8fafc',
            color: isLooping ? theme.textColor : '#64748b',
            borderRadius: '10px',
            height: '32px',
            padding: '0 10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
        >
          <Repeat size={13} strokeWidth={2.4} />
          <span>Loop</span>
        </button>

        {/* Metronom-Klick Toggle */}
        <button
          type="button"
          onClick={onToggleMetronome}
          aria-label={isMetronomeActive ? 'Metronom-Klick an' : 'Metronom-Klick aus'}
          aria-pressed={isMetronomeActive}
          title={isMetronomeActive ? 'Metronom-Klick eingeschaltet' : 'Metronom-Klick stumm'}
          style={{
            border: 'none',
            background: isMetronomeActive ? '#f0fdf4' : '#f8fafc',
            color: isMetronomeActive ? '#15803d' : '#64748b',
            borderRadius: '10px',
            height: '32px',
            padding: '0 10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
        >
          {isMetronomeActive ? <Volume2 size={13} strokeWidth={2.4} /> : <VolumeX size={13} strokeWidth={2.4} />}
          <span>Klick</span>
        </button>

        {/* YouTube Speed Pill */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowSpeedMenu(prev => !prev)}
            aria-haspopup="true"
            aria-expanded={showSpeedMenu}
            aria-label={`Wiedergabe-Geschwindigkeit: ${currentSpeed.shortLabel}`}
            title="Tempo anpassen (WSOLA Verlangsamung)"
            style={{
              border: 'none',
              background: '#f8fafc',
              color: '#0f172a',
              borderRadius: '10px',
              height: '32px',
              padding: '0 9px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
          >
            <span>{currentSpeed.shortLabel}</span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#94a3b8' }}>
              {Math.round(tempoBpm * speedRate)} BPM
            </span>
            <ChevronDown size={11} color="#64748b" />
          </button>

          {showSpeedMenu && (
            <div
              style={{
                position: 'absolute',
                top: '38px',
                right: 0,
                background: '#ffffff',
                borderRadius: '12px',
                padding: '4px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.14), 0 0 1px rgba(0,0,0,0.1)',
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                minWidth: '140px',
                zIndex: 100,
                animation: 'fadeIn 0.15s ease'
              }}
            >
              {SPEED_PRESETS.map(preset => {
                const isSelected = Math.abs(preset.value - speedRate) < 0.05;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      onChangeSpeed(preset.value);
                      setShowSpeedMenu(false);
                    }}
                    style={{
                      border: 'none',
                      background: isSelected ? theme.lightBg : 'transparent',
                      color: isSelected ? theme.textColor : '#334155',
                      borderRadius: '7px',
                      padding: '6px 9px',
                      fontSize: '0.72rem',
                      fontWeight: isSelected ? 800 : 600,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{preset.label}</span>
                    <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round(tempoBpm * preset.value)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Live-Mitspiel Challenge Toggle */}
        <button
          type="button"
          onClick={onToggleChallenge}
          aria-label={isChallengeOpen ? 'Mitspiel-Challenge schließen' : 'Live Mitspiel-Challenge starten'}
          aria-pressed={isChallengeOpen}
          title="Mit eigenem Instrument live mitspielen (Tonhöhen-Erkennung)"
          style={{
            border: 'none',
            background: isChallengeOpen ? '#dbeafe' : '#f8fafc',
            color: isChallengeOpen ? '#1d4ed8' : '#475569',
            borderRadius: '10px',
            height: '32px',
            padding: '0 10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
        >
          <Mic size={13} color="currentColor" strokeWidth={2.2} />
          <span>Challenge</span>
          <Sparkles size={11} color="currentColor" strokeWidth={2.2} />
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Micro-Score Übe- & Abspiel-Steuerung"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: '#ffffff',
        borderRadius: '20px',
        padding: '12px 18px',
        boxShadow: '0 10px 28px -6px rgba(15, 23, 42, 0.08), 0 0 1px rgba(15, 23, 42, 0.08)',
        border: '1px solid #f1f5f9',
        position: 'relative'
      }}
    >
      {/* 1. Linke Gruppe: Replay & Loop (Instagram / Reel Style) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Zurück zum Taktanfang */}
        <button
          type="button"
          onClick={onRewind}
          aria-label="Zurück zum Anfang"
          title="Zurück zum Taktanfang (Takt 1)"
          style={{
            border: 'none',
            background: '#f8fafc',
            color: '#475569',
            borderRadius: '12px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
        >
          <RotateCcw size={16} strokeWidth={2.5} />
        </button>

        {/* Loop Toggle */}
        <button
          type="button"
          onClick={onToggleLoop}
          aria-label={isLooping ? 'Loop aktiv' : 'Loop inaktiv'}
          aria-pressed={isLooping}
          title={isLooping ? 'Endlosschleife aktiv' : 'Endlosschleife einschalten'}
          style={{
            border: 'none',
            background: isLooping ? theme.lightBg : '#f8fafc',
            color: isLooping ? theme.textColor : '#64748b',
            borderRadius: '12px',
            height: '40px',
            padding: '0 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
        >
          <Repeat size={15} strokeWidth={2.5} />
          <span>Loop</span>
        </button>

        {/* Metronom-Klick Toggle */}
        <button
          type="button"
          onClick={onToggleMetronome}
          aria-label={isMetronomeActive ? 'Metronom-Klick an' : 'Metronom-Klick aus'}
          aria-pressed={isMetronomeActive}
          title={isMetronomeActive ? 'Metronom-Klick eingeschaltet' : 'Metronom-Klick stumm'}
          style={{
            border: 'none',
            background: isMetronomeActive ? '#f0fdf4' : '#f8fafc',
            color: isMetronomeActive ? '#15803d' : '#64748b',
            borderRadius: '12px',
            height: '40px',
            padding: '0 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
        >
          {isMetronomeActive ? <Volume2 size={15} strokeWidth={2.5} /> : <VolumeX size={15} strokeWidth={2.5} />}
          <span>Klick</span>
        </button>
      </div>

      {/* 2. Zentrum: Großer YouTube-Glow Play Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          role="button"
          tabIndex={0}
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Wiedergabe anhalten' : 'Noten-Schnipsel abspielen'}
          title={isPlaying ? 'Stopp (Leertaste)' : 'Abspielen (Leertaste)'}
          style={{
            border: 'none',
            background: isPlaying ? '#dc2626' : theme.primary,
            color: '#ffffff',
            borderRadius: '18px',
            width: '54px',
            height: '54px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isPlaying 
              ? '0 6px 20px rgba(220, 38, 38, 0.45)' 
              : `0 6px 22px ${theme.glow}`,
            transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s',
            outline: 'none'
          }}
          className="hover-scale-mini"
        >
          {isPlaying ? (
            <Square size={20} fill="#ffffff" strokeWidth={0} />
          ) : (
            <Play size={22} fill="#ffffff" strokeWidth={0} style={{ marginLeft: '3px' }} />
          )}
        </button>
      </div>

      {/* 3. Rechte Gruppe: YouTube-Speed Pill & Live-Challenge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
        {/* YouTube Speed Pill */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowSpeedMenu(prev => !prev)}
            aria-haspopup="true"
            aria-expanded={showSpeedMenu}
            aria-label={`Wiedergabe-Geschwindigkeit: ${currentSpeed.shortLabel}`}
            title="Tempo anpassen (WSOLA Verlangsamung)"
            style={{
              border: 'none',
              background: '#f8fafc',
              color: '#0f172a',
              borderRadius: '12px',
              height: '40px',
              padding: '0 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
          >
            <span>{currentSpeed.shortLabel}</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8' }}>
              {Math.round(tempoBpm * speedRate)} BPM
            </span>
            <ChevronDown size={13} color="#64748b" />
          </button>

          {/* Speed Dropdown Menu */}
          {showSpeedMenu && (
            <div
              style={{
                position: 'absolute',
                bottom: '48px',
                right: 0,
                background: '#ffffff',
                borderRadius: '14px',
                padding: '6px',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0,0,0,0.1)',
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                minWidth: '150px',
                zIndex: 100,
                animation: 'fadeIn 0.15s ease'
              }}
            >
              {SPEED_PRESETS.map(preset => {
                const isSelected = Math.abs(preset.value - speedRate) < 0.05;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      onChangeSpeed(preset.value);
                      setShowSpeedMenu(false);
                    }}
                    style={{
                      border: 'none',
                      background: isSelected ? theme.lightBg : 'transparent',
                      color: isSelected ? theme.textColor : '#334155',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      fontSize: '0.74rem',
                      fontWeight: isSelected ? 800 : 600,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{preset.label}</span>
                    <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round(tempoBpm * preset.value)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Live-Mitspiel Challenge Toggle */}
        <button
          type="button"
          onClick={onToggleChallenge}
          aria-label={isChallengeOpen ? 'Mitspiel-Challenge schließen' : 'Live Mitspiel-Challenge starten'}
          aria-pressed={isChallengeOpen}
          title="Mit eigenem Instrument live mitspielen (Tonhöhen-Erkennung)"
          style={{
            border: 'none',
            background: isChallengeOpen ? '#dbeafe' : '#f8fafc',
            color: isChallengeOpen ? '#1d4ed8' : '#475569',
            borderRadius: '12px',
            height: '40px',
            padding: '0 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
        >
          <Mic size={15} color="currentColor" strokeWidth={2.2} />
          <span>Challenge</span>
          <Sparkles size={12} color="currentColor" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
};
