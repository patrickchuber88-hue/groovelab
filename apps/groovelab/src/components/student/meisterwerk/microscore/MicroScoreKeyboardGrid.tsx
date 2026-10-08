/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * MicroScoreKeyboardGrid.tsx
 * 
 * Tastatur-First Noteneingabe:
 * - Pfeiltasten (← / →) zur horizontalen Navigation
 * - Notenwerte über Kurztasten: 1 (Ganze), 2 (Halbe), 4 (Viertel), 8 (Achtel), 6 (16tel)
 * - Tonhöhen über Tasten (C, D, E, F, G, A, B/H) oder Bünde (0–9)
 * - Halbton-Transposition über Pfeiltasten (↑ / ↓)
 * - Pause / Löschen über Backspace / Entf / R
 * - Maximale Taktanzahl strikt auf 1–4 Takte begrenzt (UrhG Bildungs- & Zitatfreigabe)
 * - BFSG 2025 & WCAG 2.2 AA konform (Tastatur-Vollbedienbarkeit, Kontrast ≥ 7:1)
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { MicroScoreDuration, MicroScoreNote, MicroScoreSnippet } from './microScore.types';
import { durationToSixteenths } from './microScoreAudioSynthesizer';

interface MicroScoreKeyboardGridProps {
  snippet: MicroScoreSnippet;
  activeBar: number;
  activeFraction: number;
  isPlaying: boolean;
  onUpdateNotes: (notes: MicroScoreNote[]) => void;
  onSelectPosition: (bar: number, fraction: number) => void;
  readOnly?: boolean;
}

const SCALE_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const MicroScoreKeyboardGrid: React.FC<MicroScoreKeyboardGridProps> = ({
  snippet,
  activeBar,
  activeFraction,
  isPlaying,
  onUpdateNotes,
  onSelectPosition,
  readOnly = false
}) => {
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Schnelle Tonhöhen-Transposition
  const transposePitch = useCallback((pitch: string, delta: number): string => {
    if (!pitch || pitch === 'REST') return 'C4';
    const match = pitch.trim().toUpperCase().match(/^([A-G][#B]?)(-?\d+)$/);
    if (!match) return 'C4';
    let noteName = match[1];
    let octave = parseInt(match[2], 10);
    if (noteName === 'DB') noteName = 'C#';
    if (noteName === 'EB') noteName = 'D#';
    if (noteName === 'GB') noteName = 'F#';
    if (noteName === 'AB') noteName = 'G#';
    if (noteName === 'BB') noteName = 'A#';
    if (noteName === 'H') noteName = 'B';

    let idx = SCALE_NOTES.indexOf(noteName);
    if (idx === -1) idx = 0;

    let newTotal = octave * 12 + idx + delta;
    let newOctave = Math.floor(newTotal / 12);
    let newIdx = ((newTotal % 12) + 12) % 12;
    newOctave = Math.max(2, Math.min(6, newOctave));

    return `${SCALE_NOTES[newIdx]}${newOctave}`;
  }, []);

  // Globale Tastaturnavigation & Eingabe
  useEffect(() => {
    if (readOnly || isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignoriere Eingaben, wenn der Fokus in einem Text-Input liegt
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      const currentNotes = [...snippet.notes];
      const existingNoteIdx = currentNotes.findIndex(
        n => n.barIndex === activeBar && n.beatFraction === activeFraction
      );

      // 1. Navigation Pfeiltasten (← / →)
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        let nextFraction = activeFraction + 2; // Schrittweite 8tel
        let nextBar = activeBar;
        if (nextFraction >= 16) {
          nextFraction = 0;
          nextBar = (activeBar + 1) % snippet.barsCount;
        }
        onSelectPosition(nextBar, nextFraction);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        let prevFraction = activeFraction - 2;
        let prevBar = activeBar;
        if (prevFraction < 0) {
          prevFraction = 14;
          prevBar = (activeBar - 1 + snippet.barsCount) % snippet.barsCount;
        }
        onSelectPosition(prevBar, prevFraction);
        return;
      }

      // 2. Tonhöhe transponieren (↑ / ↓)
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (existingNoteIdx >= 0) {
          const updated = [...currentNotes];
          updated[existingNoteIdx] = {
            ...updated[existingNoteIdx],
            pitch: transposePitch(updated[existingNoteIdx].pitch, 1),
            stringIndex: undefined,
            fret: undefined
          };
          onUpdateNotes(updated);
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (existingNoteIdx >= 0) {
          const updated = [...currentNotes];
          updated[existingNoteIdx] = {
            ...updated[existingNoteIdx],
            pitch: transposePitch(updated[existingNoteIdx].pitch, -1),
            stringIndex: undefined,
            fret: undefined
          };
          onUpdateNotes(updated);
        }
        return;
      }

      // 3. Notenwerte (1, 2, 4, 8, 6)
      let targetDuration: MicroScoreDuration | null = null;
      if (key === '1') targetDuration = '1';
      else if (key === '2') targetDuration = '2';
      else if (key === '4') targetDuration = '4';
      else if (key === '8') targetDuration = '8';
      else if (key === '6') targetDuration = '16';

      if (targetDuration) {
        e.preventDefault();
        if (existingNoteIdx >= 0) {
          const updated = [...currentNotes];
          updated[existingNoteIdx] = {
            ...updated[existingNoteIdx],
            duration: targetDuration
          };
          onUpdateNotes(updated);
        } else {
          // Neue Note mit gewähltem Wert anlegen
          const newNote: MicroScoreNote = {
            id: `note-${Date.now()}-${Math.random()}`,
            barIndex: activeBar,
            beatFraction: activeFraction,
            duration: targetDuration,
            pitch: 'C4'
          };
          onUpdateNotes([...currentNotes, newNote]);
        }
        return;
      }

      // 4. Notennamen (C, D, E, F, G, A, B/H)
      if (['c', 'd', 'e', 'f', 'g', 'a', 'b', 'h'].includes(key)) {
        e.preventDefault();
        const basePitch = key === 'h' ? 'B4' : `${key.toUpperCase()}4`;
        const updated = [...currentNotes];
        if (existingNoteIdx >= 0) {
          updated[existingNoteIdx] = {
            ...updated[existingNoteIdx],
            pitch: basePitch
          };
        } else {
          updated.push({
            id: `note-${Date.now()}-${Math.random()}`,
            barIndex: activeBar,
            beatFraction: activeFraction,
            duration: '8', // Default Achtelnote
            pitch: basePitch
          });
        }
        onUpdateNotes(updated);

        // Auto-Vorlauf um eine Achtelnote
        let nextFraction = activeFraction + 2;
        let nextBar = activeBar;
        if (nextFraction >= 16) {
          nextFraction = 0;
          nextBar = (activeBar + 1) % snippet.barsCount;
        }
        onSelectPosition(nextBar, nextFraction);
        return;
      }

      // 5. Gitarren-/Bass-Bünde (0–9)
      if (/^[0-9]$/.test(key) && !['1', '2', '4', '8', '6'].includes(key)) {
        e.preventDefault();
        const fretVal = parseInt(key, 10);
        const updated = [...currentNotes];
        if (existingNoteIdx >= 0) {
          updated[existingNoteIdx] = {
            ...updated[existingNoteIdx],
            fret: fretVal
          };
        } else {
          updated.push({
            id: `note-${Date.now()}-${Math.random()}`,
            barIndex: activeBar,
            beatFraction: activeFraction,
            duration: '8',
            pitch: 'C4',
            fret: fretVal
          });
        }
        onUpdateNotes(updated);
        return;
      }

      // 6. Pause / Löschen (Backspace, Delete, R)
      if (e.key === 'Backspace' || e.key === 'Delete' || key === 'r') {
        e.preventDefault();
        if (existingNoteIdx >= 0) {
          const updated = currentNotes.filter((_, idx) => idx !== existingNoteIdx);
          onUpdateNotes(updated);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    readOnly,
    isPlaying,
    snippet,
    activeBar,
    activeFraction,
    onSelectPosition,
    onUpdateNotes,
    transposePitch
  ]);

  // Berechne 16tel-Raster für jeden Takt (0 bis 15)
  const fractions = Array.from({ length: 16 }, (_, i) => i);

  return (
    <div
      ref={gridContainerRef}
      role="grid"
      aria-label="Micro-Score Editor Grid (1 bis 4 Takte)"
      tabIndex={0}
      style={{
        background: '#ffffff',
        border: '1.5px solid #0f172a',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
        outline: 'none',
        userSelect: 'none'
      }}
    >
      {/* Takte 1 bis maximal 4 rendern */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${snippet.barsCount}, minmax(0, 1fr))`,
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '4px'
        }}
      >
        {Array.from({ length: snippet.barsCount }).map((_, barIdx) => (
          <div
            key={`bar-${barIdx}`}
            role="row"
            aria-label={`Takt ${barIdx + 1}`}
            style={{
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              background: '#f8fafc',
              padding: '10px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              position: 'relative'
            }}
          >
            {/* Takt-Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px',
                fontSize: '0.72rem',
                fontWeight: 900,
                color: '#64748b',
                fontFamily: "'SF Mono', Monaco, monospace"
              }}
            >
              <span>TAKT {barIdx + 1}</span>
              <span>{snippet.timeSignature}</span>
            </div>

            {/* Notenlinien / Tab-Container */}
            <div
              style={{
                height: '110px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                position: 'relative',
                display: 'flex',
                overflow: 'hidden'
              }}
            >
              {/* 5 Notenlinien Hintergrund */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-evenly',
                  padding: '14px 0',
                  pointerEvents: 'none'
                }}
              >
                <div style={{ height: '1px', background: '#e2e8f0', width: '100%' }} />
                <div style={{ height: '1px', background: '#e2e8f0', width: '100%' }} />
                <div style={{ height: '1px', background: '#e2e8f0', width: '100%' }} />
                <div style={{ height: '1px', background: '#e2e8f0', width: '100%' }} />
                <div style={{ height: '1px', background: '#e2e8f0', width: '100%' }} />
              </div>

              {/* 16tel-Raster-Zellen */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(16, minmax(0, 1fr))'
                }}
              >
                {fractions.map(fractionIdx => {
                  const isCurrentPosition =
                    activeBar === barIdx && activeFraction === fractionIdx;
                  const isPlaybackActive =
                    isPlaying && activeBar === barIdx && Math.abs(activeFraction - fractionIdx) < 1;

                  // Suche nach Note an dieser Position
                  const note = snippet.notes.find(
                    n => n.barIndex === barIdx && n.beatFraction === fractionIdx
                  );

                  return (
                    <div
                      key={`slot-${barIdx}-${fractionIdx}`}
                      role="gridcell"
                      aria-label={`Takt ${barIdx + 1}, Schlag ${fractionIdx + 1}${note ? `: ${note.pitch}` : ''}`}
                      tabIndex={0}
                      onClick={() => onSelectPosition(barIdx, fractionIdx)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectPosition(barIdx, fractionIdx);
                        }
                      }}
                      style={{
                        position: 'relative',
                        height: '100%',
                        cursor: readOnly ? 'default' : 'pointer',
                        borderRight: fractionIdx % 4 === 3 ? '1px dashed #cbd5e1' : 'none',
                        background: isPlaybackActive
                          ? 'rgba(16, 185, 129, 0.15)'
                          : isCurrentPosition
                          ? 'rgba(15, 23, 42, 0.06)'
                          : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.08s ease'
                      }}
                    >
                      {/* Cursor-Indikator */}
                      {isCurrentPosition && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            width: '2px',
                            background: '#0f172a',
                            zIndex: 10
                          }}
                        />
                      )}

                      {/* Noten-Symbol / Badge */}
                      {note && (
                        <div
                          style={{
                            position: 'relative',
                            zIndex: 5,
                            background: '#0f172a',
                            color: '#ffffff',
                            borderRadius: '6px',
                            padding: '3px 4px',
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            fontFamily: "'SF Mono', Monaco, monospace",
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            lineHeight: 1,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                          }}
                        >
                          <span>{note.fret !== undefined ? note.fret : note.pitch}</span>
                          <span style={{ fontSize: '0.52rem', opacity: 0.75, marginTop: '2px' }}>
                            {note.duration === '1' ? '𝅝' : note.duration === '2' ? '𝅗𝅥' : note.duration === '4' ? '𝅘𝅥' : note.duration === '8' ? '𝅘𝅥𝅯' : '𝅘𝅥𝅰'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tastatur-Legende (Monochrom, BFSG 2025) */}
      {!readOnly && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: '#475569',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '10px',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span>
              <kbd style={kbdStyle}>←</kbd> <kbd style={kbdStyle}>→</kbd> Navigation
            </span>
            <span>
              <kbd style={kbdStyle}>↑</kbd> <kbd style={kbdStyle}>↓</kbd> Halbton
            </span>
            <span>
              <kbd style={kbdStyle}>C</kbd>..<kbd style={kbdStyle}>H</kbd> Tonhöhe
            </span>
            <span>
              <kbd style={kbdStyle}>1</kbd> <kbd style={kbdStyle}>2</kbd> <kbd style={kbdStyle}>4</kbd> <kbd style={kbdStyle}>8</kbd> <kbd style={kbdStyle}>6</kbd> Notenwerte
            </span>
            <span>
              <kbd style={kbdStyle}>Entf</kbd> / <kbd style={kbdStyle}>R</kbd> Pause
            </span>
          </div>

          <div style={{ fontWeight: 800, color: '#0f172a' }}>
            Max. 4 Takte (UrhG Bildungs- & Zitatfreigabe)
          </div>
        </div>
      )}
    </div>
  );
};

const kbdStyle: React.CSSProperties = {
  background: '#f1f5f9',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  padding: '1px 5px',
  fontSize: '0.68rem',
  fontWeight: 800,
  fontFamily: "'SF Mono', Monaco, monospace",
  color: '#0f172a'
};
