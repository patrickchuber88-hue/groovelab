import React from 'react';
import { Headphones, Target, Clock, Activity } from 'lucide-react';
import { GrooveVdmNoteVisualizer } from './GrooveVdmNoteVisualizer';

export interface GrooveDualBarRadarProps {
  subdivisions: number;
  currentStep: number;
  isPlaying: boolean;
  isCountingIn: boolean;
  countInBeat: number;
  trainingMode: 'echo' | 'ghost';
  isCallPhase: boolean;
  currentBar: number;
  activeSyllables: string[];
  activeTargetPattern: boolean[];
  anticipatingStep: number | null;
  isNotebook?: boolean;
}

export const GrooveDualBarRadar: React.FC<GrooveDualBarRadarProps> = ({
  subdivisions,
  currentStep,
  isPlaying,
  isCountingIn,
  countInBeat,
  trainingMode,
  isCallPhase,
  currentBar,
  activeSyllables,
  activeTargetPattern,
  anticipatingStep,
  isNotebook = false
}) => {
  const subsPerBeat = Math.max(1, Math.round(subdivisions / 4));

  // Phasen-Indikator
  const getPhaseBadge = () => {
    if (isCountingIn) {
      return {
        label: `Einzähler • Schlag ${countInBeat > 0 ? countInBeat : 1} von 4`,
        icon: <Activity size={13} className="animate-pulse" />,
        bg: '#0f172a',
        color: '#ffffff',
        border: '1px solid #0f172a'
      };
    }
    if (!isPlaying) {
      return {
        label: trainingMode === 'echo' ? 'Echo-Modus (1 Takt Hören → 1 Takt Mitmachen)' : 'Geister-Beat (Stumm nach Einzähler)',
        icon: trainingMode === 'echo' ? <Headphones size={13} /> : <Clock size={13} />,
        bg: '#ffffff',
        color: '#475569',
        border: '1px solid #cbd5e1'
      };
    }
    if (trainingMode === 'echo') {
      if (isCallPhase) {
        return {
          label: `Takt ${currentBar + 1}: HÖR GUT ZU! 🎧 (Vorspiel-Phase)`,
          icon: <Headphones size={13} />,
          bg: '#0284c7',
          color: '#ffffff',
          border: '1px solid #0284c7'
        };
      }
      return {
        label: `Takt ${currentBar + 1}: JETZT BIST DU DRAN! (Wertung aktiv)`,
        icon: <Target size={13} />,
        bg: '#ea580c',
        color: '#ffffff',
        border: '1px solid #ea580c'
      };
    }
    return {
      label: `Takt ${currentBar + 1}: GEISTER-BEAT (Halte den Puls nach Sicht!)`,
      icon: <Clock size={13} />,
      bg: '#7c3aed',
      color: '#ffffff',
      border: '1px solid #7c3aed'
    };
  };

  const badge = getPhaseBadge();

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: isNotebook ? '22px' : '18px',
        border: '1.5px solid #e2e8f0',
        padding: isNotebook ? '14px 18px' : '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)',
        boxSizing: 'border-box'
      }}
      aria-label="Rhythmus-Bühne und Beat-Radar"
    >
      {/* 1. Phasen-Kopfzeile mit Call & Response Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div
          style={{
            background: badge.bg,
            color: badge.color,
            border: badge.border,
            borderRadius: '100px',
            padding: '3px 12px',
            fontSize: '0.74rem',
            fontWeight: 950,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </div>

        {/* 2-Takt Phasen-Pill (Zeigt an: Takt A Hören vs Takt B Machen) */}
        {trainingMode === 'echo' && isPlaying && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: '6px',
                background: isCallPhase ? '#0284c7' : '#f1f5f9',
                color: isCallPhase ? '#ffffff' : '#64748b'
              }}
            >
              1. Call (Hören)
            </span>
            <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>→</span>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: '6px',
                background: !isCallPhase ? '#ea580c' : '#f1f5f9',
                color: !isCallPhase ? '#ffffff' : '#64748b'
              }}
            >
              2. Response (Echo)
            </span>
          </div>
        )}
      </div>

      {/* 2. Die 4 Viertel-Beats mit VdM-Notenglyphen */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: isNotebook ? '10px' : '6px',
          boxSizing: 'border-box'
        }}
      >
        {[0, 1, 2, 3].map(quarterIdx => {
          const startIdx = quarterIdx * subsPerBeat;
          const isQuarterActiveInPlayback = isPlaying && Math.floor(currentStep / subsPerBeat) === quarterIdx;
          const isQuarterCountInActive = isCountingIn && (countInBeat === (quarterIdx + 1));

          return (
            <div
              key={quarterIdx}
              style={{
                background: isQuarterCountInActive
                  ? '#fff7ed'
                  : (isQuarterActiveInPlayback ? (isCallPhase ? '#f0f9ff' : '#fff7ed') : '#f8fafc'),
                border: isQuarterCountInActive
                  ? '1.5px solid #ea580c'
                  : (isQuarterActiveInPlayback 
                      ? (isCallPhase ? '1.5px solid #0284c7' : '1.5px solid #ea580c')
                      : '1px solid #e2e8f0'),
                borderRadius: isNotebook ? '16px' : '12px',
                padding: isNotebook ? '8px 8px' : '6px 6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                boxShadow: (isQuarterCountInActive || isQuarterActiveInPlayback)
                  ? '0 4px 12px rgba(234, 88, 12, 0.12)'
                  : 'none',
                transition: 'all 0.08s ease'
              }}
            >
              {/* Notenständer-Ziffer: Groß & weithin sichtbar (1, 2, 3, 4) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
                <span
                  style={{
                    fontSize: isNotebook ? '0.88rem' : '0.80rem',
                    fontWeight: 950,
                    fontFamily: "'Plus Jakarta Sans', monospace",
                    color: (isQuarterCountInActive || isQuarterActiveInPlayback)
                      ? (isCallPhase ? '#0284c7' : '#ea580c')
                      : '#64748b'
                  }}
                >
                  Beat {quarterIdx + 1}
                </span>
                {isQuarterActiveInPlayback && (
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: isCallPhase ? '#0284c7' : '#ea580c',
                      boxShadow: isCallPhase ? '0 0 6px #0284c7' : '0 0 6px #ea580c'
                    }}
                  />
                )}
              </div>

              {/* Subdivisions innerhalb des Viertels */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${subsPerBeat}, 1fr)`,
                  gap: '4px',
                  alignItems: 'center',
                  minHeight: isNotebook ? '56px' : '48px'
                }}
              >
                {Array.from({ length: subsPerBeat }).map((_, localIdx) => {
                  const sIdx = startIdx + localIdx;
                  const isQuarterDownbeat = localIdx === 0;
                  const isCountInStep = isCountingIn && isQuarterDownbeat && (quarterIdx === (countInBeat - 1));
                  const isCurrent = (isPlaying && currentStep === sIdx) || isCountInStep;
                  const isAnticipating = isPlaying && anticipatingStep === sIdx;
                  const isTarget = activeTargetPattern[sIdx] ?? false;
                  const syllable = activeSyllables[sIdx] || '';

                  return (
                    <div
                      key={sIdx}
                      style={{
                        height: '100%',
                        borderRadius: '9px',
                        background: isCurrent
                          ? (isCallPhase ? '#0284c7' : '#ea580c')
                          : (isAnticipating ? '#fff7ed' : '#ffffff'),
                        border: isCurrent
                          ? (isCallPhase ? '1.5px solid #0284c7' : '1.5px solid #ea580c')
                          : (isAnticipating ? '1.5px solid #ea580c' : '1px solid #e2e8f0'),
                        padding: '4px 2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: isCurrent ? 'scale(1.04)' : 'scale(1)',
                        boxShadow: isCurrent ? '0 4px 10px rgba(234, 88, 12, 0.3)' : 'none',
                        transition: 'all 0.08s ease'
                      }}
                    >
                      <GrooveVdmNoteVisualizer
                        subdivisionCount={subdivisions}
                        stepIndex={sIdx}
                        isTarget={isTarget}
                        isActive={isCurrent}
                        isAnticipating={isAnticipating}
                        syllable={syllable}
                        isNotebook={isNotebook}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
