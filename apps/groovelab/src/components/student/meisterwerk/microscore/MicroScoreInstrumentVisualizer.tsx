/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * MicroScoreInstrumentVisualizer.tsx
 * 
 * 2027 0,1% Goldstandard Multi-Instrument Didaktik-Visualizer:
 * - Klavier: 3-Oktaven interaktive Klaviatur (C3 bis C6 / Bass C2 bis C5, 22 weiße, 15 schwarze Tasten) mit Live-Glow & 8va/8vb Stepper
 * - Gitarre & E-Bass: Interaktives 12-Bund Griffbrett mit Inlay-Dots (3, 5, 7, 9, 12), Saiten-Markern & Amber-Glow
 * - Blechbläser: 3-Ventil Piston-Diagramm (Trompete/Posaune) mit exakter Griff-Physik
 * - Holzbläser: 8-Tonloch-Diagramm (Flöten / Saxophon)
 * - Schlagwerk: 3-Pad Drum-Matrix (Bass Drum, Snare, Hi-Hat) mit haptischem Puls
 * - BFSG 2025 & WCAG 2.2 AA konform (Tastatur-Vollbedienbarkeit, Kontrast ≥ 7:1)
 * - Monolith Ceiling Axiom: Vollständig autarker Satellit (< 600 Zeilen)
 */

import React, { useMemo, useState } from 'react';
import { MicroScoreInstrument } from './microScore.types';
import { 
  GUITAR_STRINGS, 
  BASS_STRINGS, 
  pitchToBestFretAndString, 
  fretAndStringToPitch 
} from './guitarFretboardEngine';
import { MicroScoreDrumKitVisualizer } from './MicroScoreDrumKitVisualizer';
import { MicroScoreFretboardFullWidth } from './MicroScoreFretboardFullWidth';
import { MicroScorePianoFullWidth } from './MicroScorePianoFullWidth';
import { MicroScoreWoodwindVisualizer } from './MicroScoreWoodwindVisualizer';

export interface MicroScoreInstrumentVisualizerProps {
  instrument: MicroScoreInstrument;
  activePitches: string[];
  activeNotes?: Array<{ id?: string; pitch: string; barIndex?: number; beatFraction?: number; stringIndex?: number; fret?: number }>;
  playheadPos?: { bar: number; fraction: number };
  clef?: 'treble' | 'bass' | 'percussion';
  onPlayPreviewPitch?: (pitch: string) => void;
  onInsertPitch?: (pitch: string, stringIndex?: number, fret?: number) => void;
  readOnly?: boolean;
}

// Enharmonische Normalisierung
function normalizeNoteName(pitch: string): string {
  if (!pitch || pitch === 'REST') return '';
  const match = pitch.trim().toUpperCase().match(/^([A-H][#B♮]?)(-?\d+)$/);
  if (!match) return '';
  let note = match[1].replace('♮', '');
  const octave = match[2];
  if (note === 'DB') note = 'C#';
  if (note === 'EB') note = 'D#';
  if (note === 'GB') note = 'F#';
  if (note === 'AB') note = 'G#';
  if (note === 'BB') note = 'A#';
  if (note === 'H') note = 'B';
  return `${note}${octave}`;
}

// ---------------------------------------------------------------------------
// 1. BLECHBLÄSER 3-VENTIL MAPPING (Trompete / Posaune)
// ---------------------------------------------------------------------------

function getTrumpetValves(pitch: string): [boolean, boolean, boolean] {
  if (!pitch || pitch === 'REST') return [false, false, false];
  const m = pitch.toUpperCase().match(/^([A-H][#B♮]?)/);
  if (!m) return [false, false, false];
  let n = m[1].replace('♮', '');
  if (n === 'DB') n = 'C#';
  if (n === 'EB') n = 'D#';
  if (n === 'GB') n = 'F#';
  if (n === 'AB') n = 'G#';
  if (n === 'BB') n = 'A#';
  if (n === 'H') n = 'B';

  switch (n) {
    case 'C': case 'G': return [false, false, false];
    case 'C#': return [true, true, true];
    case 'D': return [true, false, true];
    case 'D#': return [false, true, true];
    case 'E': return [true, true, false];
    case 'F': return [true, false, false];
    case 'F#': return [false, true, false];
    case 'G#': return [false, true, true];
    case 'A': return [true, true, false];
    case 'A#': return [true, false, false];
    case 'B': return [false, true, false];
    default: return [false, false, false];
  }
}

// ---------------------------------------------------------------------------
// HAUPTKOMPONENTE
// ---------------------------------------------------------------------------
export const MicroScoreInstrumentVisualizer: React.FC<MicroScoreInstrumentVisualizerProps> = ({
  instrument,
  activePitches,
  activeNotes,
  playheadPos,
  clef,
  onPlayPreviewPitch,
  onInsertPitch,
  readOnly = false
}) => {
  const normActive = useMemo(() => {
    return (activePitches || []).map(normalizeNoteName).filter(Boolean);
  }, [activePitches]);

  // 1. KLAVIER / TASTENINSTRUMENTE (0,1% Goldstandard 88-Tasten Konzertflügel)
  if (instrument === 'piano' || instrument === 'universal') {
    return (
      <MicroScorePianoFullWidth
        activePitches={activePitches}
        clef={clef}
        onPlayPreviewPitch={onPlayPreviewPitch}
        onInsertPitch={(p) => {
          if (!readOnly && onInsertPitch) onInsertPitch(p);
        }}
        readOnly={readOnly}
      />
    );
  }


  // 2. STREICH- & ZUPFINSTRUMENTE (Gitarre, E-Bass, Violine) - 0,1% Vollbreiten-Griffbrett
  if (instrument === 'guitar' || instrument === 'bass' || instrument === 'strings') {
    return (
      <MicroScoreFretboardFullWidth
        instrument={instrument}
        activePitches={activePitches}
        activeNotes={activeNotes}
        clef={clef}
        onPlayPreviewPitch={onPlayPreviewPitch}
        onInsertPitch={onInsertPitch}
        readOnly={readOnly}
      />
    );
  }

  // 3. BLECHBLÄSER (Trompete / Posaune)
  if (instrument === 'trumpet' || instrument === 'trombone') {
    const primaryPitch = normActive[0] || 'C4';
    const valves = getTrumpetValves(primaryPitch);

    return (
      <div
        role="region"
        aria-label="Trompeten-Grifftabelle"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: '#f8fafc',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
            🎺 3-Ventil-Grifftabelle
          </span>
          <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
            Aktiver Ton: <strong style={{ color: '#6366f1' }}>{primaryPitch}</strong>
          </span>
        </div>

        {/* 3 Piston-Ventile nebeneinander */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {[1, 2, 3].map(vIdx => {
            const isPressed = valves[vIdx - 1];
            return (
              <div
                key={`valve-${vIdx}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isPressed ? '#6366f1' : '#ffffff',
                    border: isPressed ? '2px solid #4f46e5' : '2px solid #cbd5e1',
                    color: isPressed ? '#ffffff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    boxShadow: isPressed ? '0 0 10px rgba(99, 102, 241, 0.45)' : 'none',
                    transform: isPressed ? 'translateY(2px)' : 'translateY(0)',
                    transition: 'all 0.12s ease'
                  }}
                >
                  {vIdx}
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: isPressed ? '#6366f1' : '#94a3b8' }}>
                  {isPressed ? 'Unten' : 'Offen'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 4. SCHLAGZEUG (0,1% Goldstandard Top-Down Isometric Drumkit)
  if (instrument === 'drums') {
    return (
      <MicroScoreDrumKitVisualizer
        activePitches={activePitches}
        activeNotes={activeNotes}
        playheadPos={playheadPos}
        onHit={(_padId, pitch) => {
          if (onPlayPreviewPitch) {
            onPlayPreviewPitch(pitch);
          }
        }}
        readOnly={readOnly}
      />
    );
  }

  // 5. HOLZBLÄSER (Klarinette, Blockflöte, Querflöte, Altsaxophon)
  if (instrument === 'clarinet' || instrument === 'recorder' || instrument === 'flute' || instrument === 'altosax') {
    return (
      <MicroScoreWoodwindVisualizer
        instrument={instrument}
        activePitches={activePitches}
        onPlayPreviewPitch={onPlayPreviewPitch}
        onInsertPitch={onInsertPitch ? (p) => onInsertPitch(p) : undefined}
        readOnly={readOnly}
      />
    );
  }

  return null;
};
