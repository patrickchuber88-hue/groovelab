import React from 'react';
import { Play, Square, Mic, Activity, Volume2, VolumeX, Sparkles, Clock, Check, RotateCcw } from 'lucide-react';
import { linearToDawMeterPercent } from '../../../utils/audioVuMeterHelper';

export interface GroovePerformancePadProps {
  isPlaying: boolean;
  isCountingIn: boolean;
  countInBeat: number;
  inputMode: 'acoustic' | 'touch' | 'midi';
  micLevel: number;
  micShockwave: boolean;
  isPadPressed: boolean;
  lastRating: 'pocket' | 'good' | 'rush' | 'drag' | 'miss' | null;
  playDrumSoundOnClap: boolean;
  onTogglePlayDrumSound: () => void;
  onTogglePlay: () => void;
  onUserTap: () => void;
  currentBar: number;
  totalBars: number;
  trainingMode: 'echo' | 'ghost';
  isCallPhase: boolean;
  isNotebook?: boolean;
}

export const GroovePerformancePad: React.FC<GroovePerformancePadProps> = ({
  isPlaying,
  isCountingIn,
  countInBeat,
  inputMode,
  micLevel,
  micShockwave,
  isPadPressed,
  lastRating,
  playDrumSoundOnClap,
  onTogglePlayDrumSound,
  onTogglePlay,
  onUserTap,
  currentBar,
  totalBars,
  trainingMode,
  isCallPhase,
  isNotebook = false
}) => {
  const isTriggerActive = micShockwave || isPadPressed;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. Schlanke Transport- & Taktleiste */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '6px 12px',
          gap: '8px'
        }}
      >
        {/* Play / Stop Button */}
        <button
          type="button"
          onClick={onTogglePlay}
          style={{
            background: isPlaying || isCountingIn ? '#fee2e2' : '#ea580c',
            border: 'none',
            color: isPlaying || isCountingIn ? '#dc2626' : '#ffffff',
            borderRadius: '10px',
            padding: '6px 14px',
            fontSize: '0.78rem',
            fontWeight: 950,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: isPlaying || isCountingIn ? 'none' : '0 2px 8px rgba(234, 88, 12, 0.25)',
            transition: 'all 0.12s ease'
          }}
          title={isPlaying || isCountingIn ? "Übung anhalten" : "Groove-Trainer starten"}
        >
          {isPlaying || isCountingIn ? (
            <><Square size={13} fill="#dc2626" /> <span>Stopp</span></>
          ) : (
            <><Play size={13} fill="#ffffff" /> <span>STARTEN</span></>
          )}
        </button>

        {/* Takt-Fortschritt */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#334155' }}>
            Takt {isPlaying ? currentBar + 1 : 1} von {totalBars}
          </span>
          <div
            style={{
              width: '80px',
              height: '5px',
              background: '#e2e8f0',
              borderRadius: '100px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: isPlaying ? `${((currentBar + 1) / totalBars) * 100}%` : '0%',
                height: '100%',
                background: '#ea580c',
                transition: 'width 0.2s ease'
              }}
            />
          </div>
        </div>

        {/* Klatschen Lautsprecher-Mute Toggle */}
        {inputMode === 'acoustic' && (
          <button
            type="button"
            onClick={onTogglePlayDrumSound}
            style={{
              background: playDrumSoundOnClap ? '#e0f2fe' : '#ffffff',
              border: '1px solid #cbd5e1',
              color: playDrumSoundOnClap ? '#0369a1' : '#64748b',
              borderRadius: '8px',
              padding: '4px 8px',
              fontSize: '0.66rem',
              fontWeight: 850,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title={playDrumSoundOnClap ? "Lautsprecher-Sound AN (Kopfhörer)" : "Lautsprecher-Sound STUMM (Reales Klatschen)"}
          >
            {playDrumSoundOnClap ? <Volume2 size={12} /> : <VolumeX size={12} />}
            <span>{playDrumSoundOnClap ? 'Sound AN' : 'Stumm (Klatschen)'}</span>
          </button>
        )}
      </div>

      {/* 2. Haptisches MPC-Style Trigger-Pad (Expressive Musiker-Bühne) */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          onUserTap();
        }}
        style={{
          width: '100%',
          minHeight: isNotebook ? '90px' : '82px',
          height: isNotebook ? '90px' : '82px',
          borderRadius: isNotebook ? '20px' : '16px',
          border: isTriggerActive ? '2px solid #ea580c' : '1.5px solid #cbd5e1',
          background: isTriggerActive
            ? 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)'
            : (isPlaying && !isCallPhase
                ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'),
          color: isTriggerActive ? '#ffffff' : '#0f172a',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: isTriggerActive
            ? '0 0 24px rgba(234, 88, 12, 0.4), inset 0 2px 6px rgba(0,0,0,0.2)'
            : '0 4px 14px rgba(15, 23, 42, 0.05)',
          transform: isTriggerActive ? 'scale(0.985)' : 'scale(1)',
          transition: 'transform 0.06s ease, border 0.1s ease',
          outline: 'none',
          userSelect: 'none'
        }}
        title="Klicke, tippe oder drücke die Leertaste zum Mitmachen"
        aria-label="Rhythmus Trigger Pad"
      >
        {/* Konzentrische Schallwelle bei Klatschen */}
        {micShockwave && (
          <div
            style={{
              position: 'absolute',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.35)',
              animation: 'ping 0.4s cubic-bezier(0, 0, 0.2, 1) forwards'
            }}
          />
        )}

        {/* Live-Feedback Text */}
        {isCountingIn ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="#ea580c" className="animate-pulse" />
            <span style={{ fontSize: isNotebook ? '1.14rem' : '1.02rem', fontWeight: 950, color: '#ea580c' }}>
              EINZÄHLER: SCHLAG {countInBeat > 0 ? countInBeat : 1} VON 4
            </span>
          </div>
        ) : !isPlaying ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: isNotebook ? '0.98rem' : '0.90rem', fontWeight: 950, color: '#334155' }}>
              {inputMode === 'acoustic' ? 'In die Hände klatschen oder Leertaste drücken' : 'Pad antippen oder Leertaste drücken'}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
              Hands-Free Erkennung aktiv • Starte oben mit START
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            {lastRating === 'pocket' && (
              <span style={{ fontSize: '1.05rem', fontWeight: 950, color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={18} color="#d97706" /> IN THE POCKET! (Perfekt im Kern)
              </span>
            )}
            {lastRating === 'good' && (
              <span style={{ fontSize: '1.05rem', fontWeight: 950, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={18} color="#16a34a" /> IM GROOVE! (Sauber im Beat)
              </span>
            )}
            {lastRating === 'rush' && (
              <span style={{ fontSize: '0.96rem', fontWeight: 900, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} /> ETWAS VOR DEM SCHLAG • Lass dir Zeit!
              </span>
            )}
            {lastRating === 'drag' && (
              <span style={{ fontSize: '0.96rem', fontWeight: 900, color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} /> ETWAS SPÄT • Entspannt mit dem Puls mitgehen!
              </span>
            )}
            {lastRating === 'miss' && (
              <span style={{ fontSize: '0.96rem', fontWeight: 900, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RotateCcw size={16} /> DANEBEN • Lausche auf den Grund-Beat!
              </span>
            )}
            {!lastRating && (
              <span style={{ fontSize: '0.86rem', fontWeight: 850, color: isCallPhase ? '#0369a1' : '#ea580c' }}>
                {isCallPhase ? 'HÖR GUT ZU • Der Groove wird vorgeführt' : 'JETZT MITMACHEN • Klatsche synchron im Beat!'}
              </span>
            )}
          </div>
        )}

        {/* Live VU-Pegelbalken am unteren Rand des Pads */}
        {inputMode === 'acoustic' && (
          <div
            style={{
              position: 'absolute',
              bottom: '4px',
              left: '12px',
              right: '12px',
              height: '3px',
              background: 'rgba(0, 0, 0, 0.08)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${linearToDawMeterPercent(micLevel)}%`,
                height: '100%',
                background: '#ea580c',
                transition: 'width 0.04s linear'
              }}
            />
          </div>
        )}
      </button>
    </div>
  );
};
