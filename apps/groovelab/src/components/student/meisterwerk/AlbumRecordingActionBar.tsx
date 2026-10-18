import React from 'react';
import { Mic, Square, RotateCcw } from 'lucide-react';

export interface AlbumRecordingActionBarProps {
  albumTitle: string;
  isTeacherMode?: boolean;
  isRecordingAudio: boolean;
  isReleasingAudio?: boolean;
  recordCountInRemaining?: number | null;
  recordCountInMode?: 'get_ready' | 'metronome' | null;
  recordingBpm?: number;
  audioDuration: number;
  formatRecordTime: (seconds: number) => string;
  onStart: () => void;
  onStop: () => void;
  onCancelCountIn?: () => void;
  onRetake?: () => void;
  isMobileOrSim?: boolean;
}

/**
 * 🎙️ AlbumRecordingActionBar
 * 
 * 0,1% Enterprise Goldstandard Satelliten-Komponente für die LP-Hörstation (VIEW B).
 * Gewährleistet nahtlose Parität mit der Studio-Ruheansicht (VIEW A):
 * - Phase 1: Ruhezustand (Button "+ Neuer Take" / "+ Neues Vorbild")
 * - Phase 2: Count-In / Vorlauf (3-2-1 Countdown mit Abbrechen-Option)
 * - Phase 3: Aufnahme aktiv (Pulsierender Indikator, Live-Timer, "Stopp & Sichern", "Nochmal")
 * - Phase 4: Ausklang (750ms Tail Decay ohne abgeschnittene Töne)
 * 
 * Konform mit dem Apple 2-Farben-Axiom & BFSG / WCAG 2.2 AA (>= 44px Touch Targets, >= 4,5:1 Kontrast).
 */
export const AlbumRecordingActionBar: React.FC<AlbumRecordingActionBarProps> = ({
  albumTitle,
  isTeacherMode = false,
  isRecordingAudio,
  isReleasingAudio = false,
  recordCountInRemaining = null,
  recordCountInMode = null,
  recordingBpm = 100,
  audioDuration,
  formatRecordTime,
  onStart,
  onStop,
  onCancelCountIn,
  onRetake,
  isMobileOrSim = false
}) => {
  const isCountInActive = recordCountInRemaining !== null && recordCountInRemaining !== undefined;

  // 1. PHASE 2: COUNT-IN VORLAUF (3, 2, 1)
  if (isCountInActive) {
    const isMetronome = recordCountInMode === 'metronome';
    const bgBadge = isMetronome ? '#ef4444' : '#7c3aed';
    const bgContainer = isMetronome ? '#fef2f2' : '#f5f3ff';
    const textColor = isMetronome ? '#991b1b' : '#5b21b6';
    const subColor = isMetronome ? '#b91c1c' : '#7c3aed';

    return (
      <div
        role="region"
        aria-label="Aufnahme-Countdown"
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '48px',
          minHeight: '44px',
          background: bgContainer,
          border: 'none',
          borderRadius: '100px',
          padding: '0 8px 0 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxSizing: 'border-box',
          marginTop: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: bgBadge,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 950,
              fontSize: '1.05rem',
              flexShrink: 0
            }}
          >
            {recordCountInRemaining}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.80rem',
                fontWeight: 950,
                color: textColor,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {isMetronome ? `Einzählen (${recordingBpm} BPM)` : 'Bereit machen...'}
            </div>
            <div
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                color: subColor,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {isMetronome ? 'Klick aktiv • Startet gleich' : 'Aufnahme startet gleich'}
            </div>
          </div>
        </div>

        {onCancelCountIn && (
          <button
            type="button"
            onClick={onCancelCountIn}
            aria-label="Countdown abbrechen"
            style={{
              background: '#ffffff',
              border: 'none',
              borderRadius: '100px',
              color: textColor,
              padding: '6px 14px',
              fontSize: '0.74rem',
              fontWeight: 850,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              minHeight: '36px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}
            className="hover-scale-mini"
          >
            Abbrechen
          </button>
        )}
      </div>
    );
  }

  // 2. PHASE 3 & 4: AUFNAHME LÄUFT ODER KLINGT AUS
  if (isRecordingAudio) {
    const isAmber = Boolean(isReleasingAudio);
    const accentColor = isAmber ? '#d97706' : (isTeacherMode ? '#16a34a' : '#ef4444');
    const headerBg = isAmber ? '#fffbeb' : (isTeacherMode ? '#f0fdf4' : '#fef2f2');
    const headerText = isAmber ? '#92400e' : (isTeacherMode ? '#166534' : '#991b1b');
    const statusLabel = isAmber ? 'KLINGT AUS...' : 'AUFNAHME LÄUFT';

    return (
      <div
        role="region"
        aria-label="Aktive Tonaufnahme"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
          maxWidth: '540px',
          padding: '10px 14px',
          borderRadius: '16px',
          background: headerBg,
          border: 'none',
          boxSizing: 'border-box',
          marginTop: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: accentColor,
                display: 'inline-block',
                boxShadow: `0 0 0 3px ${isAmber ? 'rgba(217, 119, 6, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
              }}
            />
            <span style={{ fontSize: '0.80rem', fontWeight: 950, color: headerText }}>
              {statusLabel}
            </span>
          </div>

          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 950,
              color: headerText,
              background: '#ffffff',
              padding: '3px 9px',
              borderRadius: '100px',
              border: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            {formatRecordTime(audioDuration)}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          <button
            type="button"
            disabled={isReleasingAudio}
            onClick={onStop}
            aria-label={isReleasingAudio ? 'Aufnahme klingt aus' : (isTeacherMode ? 'Vorbild aufnehmen stoppen und sichern' : 'Take stoppen und sichern')}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: '44px',
              height: '44px',
              background: isAmber
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : (isTeacherMode
                  ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'),
              color: '#ffffff',
              border: 'none',
              borderRadius: '100px',
              fontSize: isMobileOrSim ? '0.82rem' : '0.86rem',
              fontWeight: 950,
              cursor: isReleasingAudio ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
              padding: isMobileOrSim ? '0 12px' : '0 18px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: isAmber
                ? '0 4px 14px rgba(217, 119, 6, 0.24)'
                : (isTeacherMode
                  ? '0 4px 14px rgba(22, 163, 74, 0.24)'
                  : '0 4px 14px rgba(239, 68, 68, 0.24)'),
              transition: 'all 0.15s ease'
            }}
            className={isReleasingAudio ? undefined : 'hover-scale'}
          >
            <Square size={13} fill="#ffffff" stroke="none" />
            <span>
              {isReleasingAudio
                ? 'Klingt aus...'
                : (isTeacherMode
                  ? (isMobileOrSim ? 'Stopp & Vorbild sichern' : 'Stopp & Vorbild sichern')
                  : (isMobileOrSim ? 'Stopp & Sichern' : 'Stopp & Take sichern'))}
            </span>
          </button>

          {onRetake && !isReleasingAudio && (
            <button
              type="button"
              onClick={onRetake}
              aria-label="Aufnahme verwerfen und neu starten"
              style={{
                height: '44px',
                minHeight: '44px',
                background: '#ffffff',
                border: 'none',
                color: headerText,
                borderRadius: '100px',
                padding: isMobileOrSim ? '0 10px' : '0 14px',
                fontSize: '0.78rem',
                fontWeight: 850,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}
              className="hover-scale-mini"
              title="Neu aufnehmen"
            >
              <RotateCcw size={13} strokeWidth={2.4} />
              <span>Nochmal</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. PHASE 1: RUHEZUSTAND (IDLE BUTTON "+ Neuer Take" / "+ Neues Vorbild")
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #f1f5f9'
      }}
    >
      <button
        type="button"
        onClick={onStart}
        aria-label={isTeacherMode ? `Neues Vorbild für ${albumTitle} aufnehmen` : `Neuen Take für ${albumTitle} aufnehmen`}
        style={{
          background: isTeacherMode
            ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '100px',
          padding: '11px 20px',
          minHeight: '44px',
          fontSize: '0.84rem',
          fontWeight: 850,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          boxShadow: isTeacherMode
            ? '0 4px 16px rgba(22, 163, 74, 0.28)'
            : '0 4px 16px rgba(239, 68, 68, 0.28)',
          transition: 'all 0.15s ease'
        }}
        className="hover-scale"
      >
        <Mic size={15} strokeWidth={2.4} />
        <span>{isTeacherMode ? '+ Neues Vorbild' : '+ Neuer Take'}</span>
      </button>
    </div>
  );
};
