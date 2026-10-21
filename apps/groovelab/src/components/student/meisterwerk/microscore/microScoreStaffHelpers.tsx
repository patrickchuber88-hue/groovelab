import React from 'react';
import { PERCUSSION_PITCH_Y } from './microScoreDrumPolyphonyEngine';
import { SMUFL_GLYPHS } from '../worldtour/worldTourMusicGlyphs';

// 🎼 Diatonische Basen für mathematisch deterministische Urtext-Notensatz-Engine (2027 0,1% Goldstandard)
// Stufen: C=0, D=1, E=2, F=3, G=4, A=5, B/H=6
export const DIATONIC_STEP_MAP: Record<string, number> = {
  'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6, 'H': 6
};

export function getStaffY(pitch: string, isBass: boolean, isDrum: boolean = false): number {
  if (!pitch || pitch === 'REST') return 25;
  if (isDrum) {
    const raw = pitch.trim().toUpperCase();
    if (PERCUSSION_PITCH_Y[raw] !== undefined) return PERCUSSION_PITCH_Y[raw];
    const match = raw.match(/^([A-G][#B]?)(-?\d+)$/);
    if (match) {
      const key = `${match[1]}${match[2]}`;
      if (PERCUSSION_PITCH_Y[key] !== undefined) return PERCUSSION_PITCH_Y[key];
    }
    return 18.75; // Snare Fallback
  }

  // 🎼 Mathematisch deterministische Urtext-Diatonik (100% lückenlos von C0 bis C9):
  // Treble: Top Line F5 (Stufe 38) = 0px
  // Bass:   Top Line A3 (Stufe 26) = 0px
  // Jede diatonische Stufe (Linie <-> Zwischenraum) = 6.25px (12.5px Linienabstand / 2)
  const match = pitch.trim().match(/^([A-Ga-gHh])[#bB♮]?(-?\d+)$/);
  if (!match) return isBass ? 25 : 37.5;
  const letter = match[1].toUpperCase();
  const octave = parseInt(match[2], 10);
  const step = DIATONIC_STEP_MAP[letter] ?? 0;
  const diatonicIndex = octave * 7 + step;

  const topStaffIndex = isBass ? 26 : 38; // 26 = A3, 38 = F5
  return (topStaffIndex - diatonicIndex) * 6.25;
}

// Diatonische Stufen-Tabellen für direkte Notenlinien-Klicks (6.25px-Raster)
export const TREBLE_DIATONIC_PITCHES = [
  'C6', 'B5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4', 'B3', 'A3', 'G3', 'F3', 'E3', 'D3', 'C3'
];

export const BASS_DIATONIC_PITCHES = [
  'G4', 'F4', 'E4', 'D4', 'C4', 'B3', 'A3', 'G3', 'F3', 'E3', 'D3', 'C3', 'B2', 'A2', 'G2', 'F2', 'E2', 'D2', 'C2'
];

export function yToStaffPitch(svgY: number, staffTopY: number, isBass: boolean, isDrum: boolean = false): string {
  const relY = svgY - staffTopY;
  if (isDrum) {
    if (relY <= -9.375) return 'A5';     // Crash (Hilfslinie oben)
    if (relY <= -3.125) return 'G5';     // Hi-Hat (über System)
    if (relY <= 3.125) return 'F5';      // Ride (5. Linie)
    if (relY <= 9.375) return 'E5';      // High Tom (4. Zwischenraum)
    if (relY <= 15.625) return 'D5';     // Mid Tom (4. Linie)
    if (relY <= 25.0) return 'C5';       // Snare Drum (3. Zwischenraum)
    if (relY <= 37.5) return 'A4';       // Floor Tom (2. Zwischenraum)
    if (relY <= 50.0) return 'F4';       // Bass Drum / Kick (1. Zwischenraum)
    return 'D3';                         // Hi-Hat Pedal (unter System)
  }
  const k = Math.round(relY / 6.25);
  if (isBass) {
    const idx = Math.max(0, Math.min(BASS_DIATONIC_PITCHES.length - 1, k + 6));
    return BASS_DIATONIC_PITCHES[idx];
  } else {
    const idx = Math.max(0, Math.min(TREBLE_DIATONIC_PITCHES.length - 1, k + 4));
    return TREBLE_DIATONIC_PITCHES[idx];
  }
}

export const SCALE_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function transposePitchSemitones(pitch: string, delta: number): string {
  if (!pitch || pitch === 'REST') return 'C4';
  const match = pitch.trim().toUpperCase().match(/^([A-H][#B♮]?)(-?\d+)$/);
  if (!match) return 'C4';
  let noteName = match[1].replace('♮', '');
  const octave = parseInt(match[2], 10);
  if (noteName === 'DB') noteName = 'C#';
  if (noteName === 'EB') noteName = 'D#';
  if (noteName === 'GB') noteName = 'F#';
  if (noteName === 'AB') noteName = 'G#';
  if (noteName === 'BB') noteName = 'A#';
  if (noteName === 'H') noteName = 'B';

  let idx = SCALE_NOTES.indexOf(noteName);
  if (idx === -1) idx = 0;

  const newTotal = octave * 12 + idx + delta;
  let newOctave = Math.floor(newTotal / 12);
  const newIdx = ((newTotal % 12) + 12) % 12;
  newOctave = Math.max(2, Math.min(6, newOctave));

  return `${SCALE_NOTES[newIdx]}${newOctave}`;
}

export interface MicroScoreAddBarElementProps {
  barsCount: number;
  leftMargin: number;
  measureWidth: number;
  addBarWidth: number;
  showStaff: boolean;
  showTabs: boolean;
  staffTopY: number;
  staffHeight: number;
  tabTopY: number;
  tabHeight: number;
  onAddBar?: () => void;
}

export const MicroScoreAddBarElement: React.FC<MicroScoreAddBarElementProps> = ({
  barsCount,
  leftMargin,
  measureWidth,
  addBarWidth,
  showStaff,
  showTabs,
  staffTopY,
  staffHeight,
  tabTopY,
  tabHeight,
  onAddBar
}) => {
  const lastBarEndX = leftMargin + barsCount * measureWidth;
  const addBarX = lastBarEndX + 14;
  const addBarW = addBarWidth - 6;
  const topY = showStaff ? staffTopY : tabTopY;
  const botY = showTabs ? (tabTopY + tabHeight) : (staffTopY + staffHeight);
  const blockH = Math.max(staffHeight, botY - topY);
  const centerY = topY + blockH / 2;
  const nextBarNum = barsCount + 1;

  return (
    <g
      id="microscore-add-bar-element"
      role="button"
      tabIndex={0}
      aria-label={`Takt ${nextBarNum} hinzufügen`}
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        onAddBar?.();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onAddBar?.();
        }
      }}
    >
      <title>{`Takt ${nextBarNum} hinzufügen (Taste: +)`}</title>
      <rect
        x={addBarX}
        y={topY}
        width={addBarW}
        height={blockH}
        rx="10"
        fill="rgba(248, 250, 252, 0.85)"
        stroke="#cbd5e1"
        strokeWidth="1.2"
        strokeDasharray="4 4"
      />
      <circle
        cx={addBarX + addBarW / 2}
        cy={centerY - 8}
        r="12"
        fill="#ffffff"
        stroke="#94a3b8"
        strokeWidth="1.4"
        filter="url(#note-shadow)"
      />
      <line
        x1={addBarX + addBarW / 2 - 4.5}
        y1={centerY - 8}
        x2={addBarX + addBarW / 2 + 4.5}
        y2={centerY - 8}
        stroke="#475569"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1={addBarX + addBarW / 2}
        y1={centerY - 12.5}
        x2={addBarX + addBarW / 2}
        y2={centerY - 3.5}
        stroke="#475569"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text
        x={addBarX + addBarW / 2}
        y={centerY + 15}
        fontSize="8.8"
        fontWeight="800"
        fill="#475569"
        textAnchor="middle"
        fontFamily="'Plus Jakarta Sans', sans-serif"
      >
        {`+ Takt ${nextBarNum}`}
      </text>
    </g>
  );
};

export interface MicroScoreClefHeaderProps {
  showStaff: boolean;
  showTabs: boolean;
  staffTopY: number;
  leftMargin: number;
  tabLinesCount: number;
  tabTopY: number;
  tabStringSpacing: number;
  isBassClef: boolean;
  isDrumClef: boolean;
  timeSignature?: string;
}

export const MicroScoreClefHeader: React.FC<MicroScoreClefHeaderProps> = ({
  showStaff,
  showTabs,
  staffTopY,
  leftMargin,
  tabLinesCount,
  tabTopY,
  tabStringSpacing,
  isBassClef,
  isDrumClef,
  timeSignature
}) => {
  const [timeSigTop, timeSigBottom] = (timeSignature || '4/4').split('/');
  return (
    <g id="staff-clef-header">
      {showStaff && (
        <g id="staff-header-lines">
          {[0, 12.5, 25, 37.5, 50].map(offset => (
            <line
              key={`staff-header-line-${offset}`}
              x1={16}
              y1={staffTopY + offset}
              x2={leftMargin}
              y2={staffTopY + offset}
              stroke="#475569"
              strokeWidth="1.15"
            />
          ))}
        </g>
      )}
      {showTabs && (
        <g id="tab-header-lines">
          {Array.from({ length: tabLinesCount }, (_, sIdx) => {
            const lineY = tabTopY + sIdx * tabStringSpacing;
            return (
              <line
                key={`tab-header-line-${sIdx}`}
                x1={16}
                y1={lineY}
                x2={leftMargin}
                y2={lineY}
                stroke="#64748b"
                strokeWidth="1.0"
              />
            );
          })}
        </g>
      )}
      {showStaff && (
        <>
          <path
            d={isBassClef ? SMUFL_GLYPHS.fClef : isDrumClef ? SMUFL_GLYPHS.percussionClef : SMUFL_GLYPHS.gClef}
            transform={`translate(14, ${staffTopY + (isBassClef ? 12.5 : isDrumClef ? 25 : 37.5)}) scale(0.045, -0.045)`}
            fill="#0f172a"
          />
          <text
            x="68"
            y={staffTopY + 20}
            fontSize="18"
            fontWeight="900"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fill="#0f172a"
            textAnchor="middle"
          >
            {timeSigTop || '4'}
          </text>
          <text
            x="68"
            y={staffTopY + 43}
            fontSize="18"
            fontWeight="900"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fill="#0f172a"
            textAnchor="middle"
          >
            {timeSigBottom || '4'}
          </text>
        </>
      )}
      {showTabs && (
        <g id="tab-label" transform={`translate(24, ${tabTopY})`}>
          <text x="0" y="16" fontSize="13" fontWeight="900" fill="#475569" fontFamily="'Plus Jakarta Sans', sans-serif">T</text>
          <text x="0" y="36" fontSize="13" fontWeight="900" fill="#475569" fontFamily="'Plus Jakarta Sans', sans-serif">A</text>
          <text x="0" y="56" fontSize="13" fontWeight="900" fill="#475569" fontFamily="'Plus Jakarta Sans', sans-serif">B</text>
        </g>
      )}
    </g>
  );
};
