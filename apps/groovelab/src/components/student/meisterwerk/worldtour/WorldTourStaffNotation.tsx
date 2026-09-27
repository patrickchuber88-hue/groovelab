import React, { useMemo, useEffect, useRef } from 'react';
import { WorldTourScore } from '../../../../types/worldTour';
import { TransposedScoreResult } from '../../../../domain/worldTourTransposer';
import { SMUFL_GLYPHS } from './worldTourMusicGlyphs';

interface WorldTourStaffNotationProps {
  score: WorldTourScore;
  transposed: TransposedScoreResult;
  activeNoteIdx: number;
  noteHits?: Record<number, 'pending' | 'hit' | 'near' | 'miss'>;
  studentInstrument?: string | null;
  mode?: 'listen' | 'practice' | 'challenge';
  uiLevel?: 'junior' | 'teen' | 'pro';
  onNoteTap?: (noteIndex: number) => void;
}

// 🎼 Treble Clef Y-Mapping (Top line F5 = 0, line spacing = 10)
const TREBLE_PITCH_STAFF_Y: Record<string, number> = {
  'C3': 85, 'D3': 80, 'E3': 75, 'F3': 70, 'F#3': 70, 'G3': 65, 'Ab3': 60, 'A3': 60, 'Bb3': 55, 'B3': 55,
  'C4': 50, 'C#4': 50, 'Db4': 45, 'D4': 45, 'D#4': 45, 'Eb4': 40, 'E4': 40, 'F4': 35, 'F#4': 35, 'Gb4': 30,
  'G4': 30, 'G#4': 30, 'Ab4': 25, 'A4': 25, 'A#4': 25, 'Bb4': 20, 'B4': 20,
  'C5': 15, 'C#5': 15, 'Db5': 10, 'D5': 10, 'D#5': 10, 'Eb5': 5, 'E5': 5,
  'F5': 0, 'F#5': 0, 'Gb5': -5, 'G5': -5, 'G#5': -5, 'Ab5': -10, 'A5': -10, 'Bb5': -15, 'B5': -15, 'C6': -20
};

// 🎼 Bass Clef Y-Mapping (Top line A3 = 0, line spacing = 10)
// Staff lines: A3 (0), F3 (10), D3 (20 - middle), B2 (30), G2 (40 - bottom)
// Staff spaces: G3 (5), E3 (15), C3 (25), A2 (35)
// Above staff: Middle C (C4 = -10, ledger line 1 above), B3 (-5)
// Below staff: F2 (45), E2 (50, ledger line 1 below), D2 (55), C2 (60, ledger line 2 below)
const BASS_PITCH_STAFF_Y: Record<string, number> = {
  'C2': 60, 'D2': 55, 'Eb2': 50, 'E2': 50, 'F2': 45, 'F#2': 45, 'G2': 40, 'Ab2': 35, 'A2': 35, 'Bb2': 30, 'B2': 30,
  'C3': 25, 'C#3': 25, 'Db3': 20, 'D3': 20, 'D#3': 20, 'Eb3': 15, 'E3': 15, 'F3': 10, 'F#3': 10, 'G3': 5, 'Ab3': 0, 'A3': 0, 'Bb3': -5, 'B3': -5,
  'C4': -10, 'C#4': -10, 'D4': -15, 'Eb4': -20, 'E4': -20, 'F4': -25, 'G4': -30
};

/**
 * Resolves the staff Y offset for any note pitch respecting clef and base diatonic letter.
 */
export function getPitchStaffY(
  pitch: string,
  isBassClef: boolean,
  isDrumClef: boolean,
  drumType?: string
): number {
  if (isDrumClef) {
    return drumType === 'snare' ? 20 : drumType === 'hihat' ? -5 : 40;
  }
  const clean = (pitch || '').replace(/[^A-Ga-g#0-9]/g, '');
  const match = clean.match(/^([A-Ga-g])[#b♮]?([0-9])$/);
  if (!match) return isBassClef ? 20 : 30;
  const diatonicKey = `${match[1].toUpperCase()}${match[2]}`;
  const table = isBassClef ? BASS_PITCH_STAFF_Y : TREBLE_PITCH_STAFF_Y;
  return table[diatonicKey] ?? (isBassClef ? 20 : 30);
}

// Boomwhackers Color System for Junior Mode
const BOOMWHACKERS_COLORS: Record<string, string> = {
  'C': '#ef4444', // Red
  'D': '#f97316', // Orange
  'E': '#eab308', // Yellow
  'F': '#84cc16', // Light Green
  'G': '#22c55e', // Dark Green
  'A': '#3b82f6', // Blue
  'B': '#a855f7'  // Purple
};

function getNoteColor(pitch: string): string {
  const match = pitch.match(/^([A-G])/i);
  if (!match) return '#0f172a';
  return BOOMWHACKERS_COLORS[match[1].toUpperCase()] || '#0f172a';
}

/**
 * Checks whether an accidental is already present in the staff key signature.
 * Prevents drawing redundant in-measure sharps/flats (e.g. F# in G-Dur, Bb in F-Dur).
 */
export function isKeyAccidental(pitch: string, tonalCenter?: string): boolean {
  if (!pitch || pitch === 'REST' || !tonalCenter) return false;
  const isGOrEm = tonalCenter.includes('G-Dur') || tonalCenter.includes('E-Moll');
  const isDOrBm = tonalCenter.includes('D-Dur') || tonalCenter.includes('B-Moll') || tonalCenter.includes('H-Moll');
  const isFOrDm = tonalCenter.includes('F-Dur') || tonalCenter.includes('D-Moll');

  const upper = pitch.toUpperCase();
  if (isGOrEm && upper.startsWith('F#')) return true;
  if (isDOrBm && (upper.startsWith('F#') || upper.startsWith('C#'))) return true;
  if (isFOrDm && (upper.startsWith('BB') || pitch.startsWith('Bb'))) return true;

  return false;
}

interface MeasureData {
  measureNum: number;
  chord?: string;
  notes: Array<{
    note: TransposedScoreResult['notes'][0];
    globalIndex: number;
    beatInMeasure: number;
  }>;
}

interface SystemData {
  measures: MeasureData[];
  startMeasureNum: number;
  endMeasureNum: number;
  label: string;
}

export const WorldTourStaffNotation: React.FC<WorldTourStaffNotationProps> = ({
  score,
  transposed,
  activeNoteIdx,
  noteHits = {},
  studentInstrument = 'Klavier',
  mode = 'listen',
  uiLevel = 'teen',
  onNoteTap
}) => {
  const activeSystemRef = useRef<HTMLDivElement>(null);

  const notes = transposed.notes;
  const isBassClef = Boolean(transposed.clef === 'bass' || studentInstrument?.toLowerCase().includes('bass') || studentInstrument?.toLowerCase().includes('cello'));
  const isDrumClef = Boolean(transposed.clef === 'drums' || studentInstrument?.toLowerCase().includes('drum') || studentInstrument?.toLowerCase().includes('schlagzeug'));
  
  // Calculate beats per measure based on time signature
  const beatsPerMeasure = useMemo(() => {
    if (score.timeSignature === '3/4') return 3;
    if (score.timeSignature === '2/4') return 2;
    if (score.timeSignature === '6/8') return 3;
    if (score.timeSignature === '7/8') return 3.5;
    if (score.timeSignature === '9/8') return 4.5;
    if (score.timeSignature === '12/8') return 6;
    return 4;
  }, [score.timeSignature]);

  // Group notes into measures based on beats, supporting Auftakte (Anacrusis)
  const measures = useMemo(() => {
    const list: MeasureData[] = [];
    const anacrusisBeats = score.anacrusisBeats || 0;
    let isBuildingAnacrusis = anacrusisBeats > 0;
    let currentMeasureNum = isBuildingAnacrusis ? 0 : 1;
    let currentBeatInMeasure = 0;
    let currentMeasureNotes: MeasureData['notes'] = [];

    notes.forEach((note, idx) => {
      const targetMeasureBeats = isBuildingAnacrusis ? anacrusisBeats : beatsPerMeasure;

      if (currentBeatInMeasure >= targetMeasureBeats - 0.01) {
        list.push({
          measureNum: currentMeasureNum,
          chord: currentMeasureNum > 0 ? score.chords?.[currentMeasureNum - 1] : undefined,
          notes: currentMeasureNotes
        });
        if (isBuildingAnacrusis) {
          isBuildingAnacrusis = false;
          currentMeasureNum = 1;
        } else {
          currentMeasureNum++;
        }
        currentBeatInMeasure = 0;
        currentMeasureNotes = [];
      }

      currentMeasureNotes.push({
        note,
        globalIndex: idx,
        beatInMeasure: currentBeatInMeasure
      });

      currentBeatInMeasure += note.durationBeats || 1;
    });

    if (currentMeasureNotes.length > 0) {
      list.push({
        measureNum: currentMeasureNum,
        chord: currentMeasureNum > 0 ? score.chords?.[currentMeasureNum - 1] : undefined,
        notes: currentMeasureNotes
      });
    }

    return list;
  }, [notes, beatsPerMeasure, score.anacrusisBeats, score.chords]);

  // Break measures into balanced systems:
  // - If song has an anacrusis (measure 0), group Auftakt + measures 1-4 on system 0
  // - If measures are dense (e.g. >= 5 notes per bar or >= 18 notes in 4 bars), dynamically partition into 2 or 3 measures per system so notes and lyrics have ample breathing room
  // - If song has 6 measures (GB), partition into two balanced 3-measure systems
  const systems = useMemo(() => {
    const sysList: SystemData[] = [];
    const hasAnacrusis = measures.length > 0 && measures[0].measureNum === 0;
    let i = 0;

    while (i < measures.length) {
      const isFirstSystemWithAnacrusis = i === 0 && hasAnacrusis;
      
      let count = isFirstSystemWithAnacrusis ? 5 : 4;
      
      if (!isFirstSystemWithAnacrusis) {
        if (measures.length === 6) {
          count = 3;
        } else {
          // Look ahead to check note density in candidate 4 measures
          const candidate = measures.slice(i, i + 4);
          const totalNotes = candidate.reduce((sum, m) => sum + m.notes.length, 0);
          const denseBars = candidate.filter(m => m.notes.length >= 5).length;

          if (denseBars >= 3 || totalNotes >= 22) {
            // Very dense: use 2 measures per system for maximum clarity (e.g. 7-note measures in anthems)
            count = 2;
          } else if (denseBars >= 2 || totalNotes >= 17) {
            // Moderately dense: use 3 measures per system
            count = 3;
          } else {
            count = 4;
          }
        }
      }

      // Avoid leaving an awkward single isolated measure on the last system
      const remainingAfter = measures.length - (i + count);
      if (remainingAfter === 1 && count > 2) {
        count -= 1;
      }

      const slice = measures.slice(i, i + count);
      const firstM = slice[0].measureNum;
      const lastM = slice[slice.length - 1].measureNum;
      const label = firstM === 0
        ? `Auftakt – Takt ${lastM}`
        : firstM === lastM
        ? `Takt ${firstM}`
        : `Takt ${firstM} – ${lastM}`;

      sysList.push({
        measures: slice,
        startMeasureNum: firstM,
        endMeasureNum: lastM,
        label
      });

      i += count;
    }

    return sysList;
  }, [measures]);

  // Calculate active system for auto-scroll by finding which system contains the active note
  const activeSysIdx = useMemo(() => {
    if (activeNoteIdx < 0) return -1;
    return systems.findIndex(sys =>
      sys.measures.some(m => m.notes.some(n => n.globalIndex === activeNoteIdx))
    );
  }, [activeNoteIdx, systems]);

  useEffect(() => {
    if (activeSysIdx >= 0 && activeSystemRef.current) {
      activeSystemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeSysIdx]);

  const hasSharpKey = score.tonalCenter.includes('G-Dur') || score.tonalCenter.includes('E-Moll');
  const hasTwoSharps = score.tonalCenter.includes('D-Dur') || score.tonalCenter.includes('B-Moll') || score.tonalCenter.includes('H-Moll');
  const hasFlatKey = score.tonalCenter.includes('F-Dur') || score.tonalCenter.includes('D-Moll');

  return (
    <div style={{
      width: '100%',
      background: '#fcfaf7',
      borderRadius: '20px',
      padding: '20px 24px',
      boxSizing: 'border-box',
      border: '1.5px solid #e2e8f0',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
      overflowX: 'auto',
      userSelect: 'none'
    }}>
      {/* 🎼 SVG Notation Renderer */}
      <div style={{ minWidth: '760px', width: '100%' }}>
        {systems.map((sys, sysIdx) => {
          const staffTopY = 40;
          const tabTopY = staffTopY + 54;
          const totalWidth = 960;
          const leftMargin = hasTwoSharps ? 132 : (hasSharpKey || hasFlatKey) ? 120 : 108; // Space for Clef, Key, Time
          const usableWidth = totalWidth - leftMargin - 24;

          // 🎼 Proportional Measure Spacing: Weight measures by meter and note density
          const measureWeights = sys.measures.map(m => {
            if (m.measureNum === 0) {
              return Math.max(1.2, (score.anacrusisBeats || 1) * 0.85);
            }
            const beatsW = beatsPerMeasure;
            const extraNotesW = m.notes.length > 3 ? (m.notes.length - 3) * 1.1 : 0;
            return beatsW + extraNotesW;
          });
          const totalWeight = measureWeights.reduce((sum, w) => sum + w, 0);
          const measureWidths = measureWeights.map(w => (w / totalWeight) * usableWidth);
          const measureXOffsets: number[] = [];
          let currentOffset = 0;
          for (let idx = 0; idx < measureWidths.length; idx++) {
            measureXOffsets.push(currentOffset);
            currentOffset += measureWidths[idx];
          }

          // Compute max note Y in system to ensure SVG viewBox has enough headroom for lower ledger lines & lyrics
          let maxSysNoteY = staffTopY + 40;
          sys.measures.forEach(m => {
            m.notes.forEach(({ note }) => {
              if (note.pitch !== 'REST') {
                const rawY = getPitchStaffY(
                  note.displayPitch || note.pitch,
                  isBassClef,
                  isDrumClef,
                  note.drumType
                );
                if (staffTopY + rawY > maxSysNoteY) {
                  maxSysNoteY = staffTopY + rawY;
                }
              }
            });
          });
          const sysHeight = transposed.hasTablature ? 175 : Math.max(132, maxSysNoteY + 36);

          return (
            <div 
              key={sysIdx} 
              style={{ marginBottom: sysIdx === systems.length - 1 ? 0 : '24px' }}
              ref={sysIdx === activeSysIdx ? activeSystemRef : null}
            >
              <svg
                viewBox={`0 0 ${totalWidth} ${sysHeight}`}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              >
                {/* 🎼 Bärenreiter Urtext Taktnummerierung (Urtext-Standard: System 1 ohne Ziffer, ab System 2 dezent vor dem 1. Taktstrich) */}
                {sysIdx > 0 && (
                  <g transform={`translate(${leftMargin - 12}, ${staffTopY - 18})`}>
                    <rect
                      x="-10"
                      y="-8"
                      width={String(sys.startMeasureNum).length > 1 ? 20 : 16}
                      height="15"
                      rx="3"
                      fill="#f8fafc"
                      stroke="#94a3b8"
                      strokeWidth="0.9"
                    />
                    <text
                      x="0"
                      y="3.5"
                      fontSize="9"
                      fontWeight="800"
                      fill="#475569"
                      textAnchor="middle"
                      fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
                    >
                      {sys.startMeasureNum}
                    </text>
                  </g>
                )}

                {/* 5 Notenlinien (Abstand 10px) */}
                {[0, 10, 20, 30, 40].map(yOffset => (
                  <line
                    key={`staff-${yOffset}`}
                    x1="24"
                    y1={staffTopY + yOffset}
                    x2={totalWidth - 10}
                    y2={staffTopY + yOffset}
                    stroke="#94a3b8"
                    strokeWidth="1.2"
                  />
                ))}

                {/* Tabulatur-Linien (falls Instrument Tab hat) */}
                {transposed.hasTablature && (
                  <g>
                    {/* TAB Label */}
                    <text x="24" y={tabTopY + 12} fontSize="11" fontWeight="900" fill="#64748b" fontFamily="sans-serif">T</text>
                    <text x="24" y={tabTopY + 24} fontSize="11" fontWeight="900" fill="#64748b" fontFamily="sans-serif">A</text>
                    <text x="24" y={tabTopY + 36} fontSize="11" fontWeight="900" fill="#64748b" fontFamily="sans-serif">B</text>

                    {/* Tab Strings (Gitarre = 6 Linien, Bass/Ukulele = 4 Linien) */}
                    {Array.from({ length: transposed.stringsCount || 6 }).map((_, sIdx) => (
                      <line
                        key={`tab-${sIdx}`}
                        x1="38"
                        y1={tabTopY + sIdx * 8}
                        x2={totalWidth - 10}
                        y2={tabTopY + sIdx * 8}
                        stroke="#cbd5e1"
                        strokeWidth="1"
                        strokeDasharray={sIdx === 0 || sIdx === (transposed.stringsCount || 6) - 1 ? 'none' : 'none'}
                      />
                    ))}
                  </g>
                )}

                {/* Anfangs-Taktstrich */}
                <line x1="24" y1={staffTopY} x2="24" y2={staffTopY + 40} stroke="#475569" strokeWidth="2.5" />

                {/* 🎼 SMuFL Vector Clefs (Henle / Bärenreiter Kupferstich-Standard) */}
                {isDrumClef ? (
                  // Neutraler Percussion-Clef (SMuFL unpitchedPercussionClef1)
                  <path
                    d={SMUFL_GLYPHS.percussionClef}
                    transform={`translate(30, ${staffTopY + 20}) scale(0.04, -0.04)`}
                    fill="#0f172a"
                  />
                ) : isBassClef ? (
                  // Bass-Notenschlüssel (SMuFL F-Clef, zentriert auf F3-Linie)
                  <path
                    d={SMUFL_GLYPHS.fClef}
                    transform={`translate(30, ${staffTopY + 10}) scale(0.04, -0.04)`}
                    fill="#0f172a"
                  />
                ) : (
                  // Violinschlüssel (SMuFL G-Clef, G4-Schleife umschließt Linie 2, edler Tropfenabschluss)
                  <path
                    d={SMUFL_GLYPHS.gClef}
                    transform={`translate(30, ${staffTopY + 30}) scale(0.04, -0.04)`}
                    fill="#0f172a"
                  />
                )}

                {/* 🎼 SMuFL Key Signatures (Vorzeichen mit echten Urtext-Höhen) */}
                {!isDrumClef && (
                  <g>
                    {hasSharpKey && (
                      <path
                        d={SMUFL_GLYPHS.accidentalSharp}
                        transform={`translate(74, ${isBassClef ? staffTopY + 10 : staffTopY}) scale(0.038, -0.038)`}
                        fill="#0f172a"
                      />
                    )}
                    {hasTwoSharps && (
                      <>
                        <path
                          d={SMUFL_GLYPHS.accidentalSharp}
                          transform={`translate(74, ${isBassClef ? staffTopY + 10 : staffTopY}) scale(0.038, -0.038)`}
                          fill="#0f172a"
                        />
                        <path
                          d={SMUFL_GLYPHS.accidentalSharp}
                          transform={`translate(87, ${isBassClef ? staffTopY + 25 : staffTopY + 15}) scale(0.038, -0.038)`}
                          fill="#0f172a"
                        />
                      </>
                    )}
                    {hasFlatKey && (
                      <path
                        d={SMUFL_GLYPHS.accidentalFlat}
                        transform={`translate(74, ${isBassClef ? staffTopY + 30 : staffTopY + 20}) scale(0.038, -0.038)`}
                        fill="#0f172a"
                      />
                    )}
                  </g>
                )}

                {/* 🎼 Taktart auf erstem System */}
                {sysIdx === 0 && (
                  <g transform={`translate(${hasTwoSharps ? 104 : (hasSharpKey || hasFlatKey) ? 94 : 76}, 0)`}>
                    <text
                      x="0"
                      y={staffTopY + 17}
                      fontSize="19"
                      fontWeight="900"
                      fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
                      fill="#0f172a"
                      letterSpacing="-0.02em"
                    >
                      {score.timeSignature.split('/')[0]}
                    </text>
                    <text
                      x="0"
                      y={staffTopY + 37}
                      fontSize="19"
                      fontWeight="900"
                      fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
                      fill="#0f172a"
                      letterSpacing="-0.02em"
                    >
                      {score.timeSignature.split('/')[1]}
                    </text>
                  </g>
                )}

                {/* Measures and Notes */}
                {sys.measures.map((m, mIdx) => {
                  const mStartX = leftMargin + (measureXOffsets[mIdx] ?? (mIdx * (usableWidth / sys.measures.length)));
                  const measureWidth = measureWidths[mIdx] ?? (usableWidth / sys.measures.length);
                  const mEndX = mStartX + measureWidth;
                  const lastMeasureInScore = measures[measures.length - 1];
                  const isLastMeasureInSong = m.measureNum === (lastMeasureInScore?.measureNum ?? measures.length);
                  const mTargetBeats = m.measureNum === 0 ? (score.anacrusisBeats || 1) : beatsPerMeasure;

                  // 🎼 SMuFL Repeat Signs Detection
                  const hasRepeatLeft = Boolean(score.repeatSections?.some(s => s.startBar === m.measureNum));
                  const hasRepeatRight = Boolean(score.repeatSections?.some(s => s.endBar === m.measureNum));

                  // 🎼 Anti-Collision Layout: Calculate safe horizontal position for each note in measure
                  // 🎼 Anti-Collision Layout: Calculate safe horizontal position for each note in measure
                  const leftIndent = hasRepeatLeft ? 36 : 18;
                  const rightMargin = hasRepeatRight ? 30 : 18;
                  const availWidth = Math.max(30, measureWidth - leftIndent - rightMargin);
                  const numNotes = m.notes.length;
                  const notePositions: number[] = [];

                  if (numNotes === 1) {
                    const frac = m.notes[0].beatInMeasure / mTargetBeats;
                    notePositions.push(mStartX + leftIndent + frac * availWidth);
                  } else if (numNotes > 1) {
                    // Pass 1: Forward calculation with bidirectional syllable-width clearance & Accidental Kerning
                    const rawPositions: number[] = [];
                    let lastX = mStartX + leftIndent;
                    m.notes.forEach((item, nIdx) => {
                      const frac = item.beatInMeasure / mTargetBeats;
                      const idealX = mStartX + leftIndent + frac * availWidth;
                      if (nIdx === 0) {
                        lastX = idealX;
                      } else {
                        const prevNote = m.notes[nIdx - 1].note;
                        const prevLyric = (prevNote?.lyric || '').trim();
                        const currLyric = (item.note?.lyric || '').trim();
                        const prevWidth = prevLyric.length > 0 ? prevLyric.length * 7.2 + 4 : 0;
                        const currWidth = currLyric.length > 0 ? currLyric.length * 7.2 + 4 : 0;
                        const isHyphenated = prevLyric.endsWith('-') || prevLyric.endsWith('–');
                        const minSyllableGap = (prevWidth > 0 && currWidth > 0)
                          ? (prevWidth / 2) + (currWidth / 2) + (isHyphenated ? 8 : 16)
                          : 20;

                        // 🎼 Accidental Kerning: Notes with #, b, or ♮ require dedicated left clearance
                        const currPitch = (item.note?.displayPitch || item.note?.pitch || '').trim();
                        const currHasAccidental = (!isKeyAccidental(currPitch, score.tonalCenter) && (currPitch.includes('#') || /^[A-G]b[0-9]/i.test(currPitch))) || currPitch.includes('♮');
                        const minAccidentalGap = currHasAccidental ? 26 : 18;
                        const minRequiredGap = Math.max(minSyllableGap, minAccidentalGap);

                        lastX = Math.max(idealX, lastX + minRequiredGap);
                      }
                      rawPositions.push(lastX);
                    });

                    // Pass 2: Elastic Proportional Spring Compression with Barline Clamp
                    const lastPos = rawPositions[numNotes - 1];
                    const maxAllowedRightX = mEndX - rightMargin;
                    const overflow = lastPos - maxAllowedRightX;
                    const firstX = rawPositions[0];
                    const totalSpan = lastPos - firstX;

                    if (overflow > 0 && totalSpan > 0) {
                      const maxAllowedSpan = maxAllowedRightX - firstX;
                      if (maxAllowedSpan > 0) {
                        const ratio = maxAllowedSpan / totalSpan;
                        let prevCompressedX = firstX;
                        notePositions.push(firstX);
                        for (let nIdx = 1; nIdx < numNotes; nIdx++) {
                          const item = m.notes[nIdx];
                          const prevNote = m.notes[nIdx - 1].note;
                          const prevLyric = (prevNote?.lyric || '').trim();
                          const currLyric = (item.note?.lyric || '').trim();
                          const prevWidth = prevLyric.length > 0 ? prevLyric.length * 7.2 + 4 : 0;
                          const currWidth = currLyric.length > 0 ? currLyric.length * 7.2 + 4 : 0;
                          const isHyphenated = prevLyric.endsWith('-') || prevLyric.endsWith('–');
                          const currPitch = (item.note?.displayPitch || item.note?.pitch || '').trim();
                          const currHasAccidental = (!isKeyAccidental(currPitch, score.tonalCenter) && (currPitch.includes('#') || /^[A-G]b[0-9]/i.test(currPitch))) || currPitch.includes('♮');
                          const minFloor = Math.max(
                            currHasAccidental ? 22 : 16,
                            (prevWidth > 0 && currWidth > 0)
                              ? (prevWidth / 2) + (currWidth / 2) + (isHyphenated ? 6 : 12)
                              : 16
                          );
                          const scaledX = firstX + (rawPositions[nIdx] - firstX) * ratio;
                          const remainingNotes = numNotes - 1 - nIdx;
                          const maxForThisNote = maxAllowedRightX - (remainingNotes * 16);
                          const safeX = Math.min(maxForThisNote, Math.max(prevCompressedX + minFloor, scaledX));
                          notePositions.push(safeX);
                          prevCompressedX = safeX;
                        }
                      } else {
                        m.notes.forEach((_, nIdx) => {
                          notePositions.push(mStartX + leftIndent + (nIdx / (numNotes - 1)) * Math.max(10, availWidth));
                        });
                      }
                    } else {
                      rawPositions.forEach(x => notePositions.push(Math.min(maxAllowedRightX, x)));
                    }
                  }

                  // 🎼 Accidental Deduplication per measure
                  const measureSharpsSeen = new Set<string>();
                  const measureFlatsSeen = new Set<string>();
                  const measureNaturalsSeen = new Set<string>();

                  // 🎼 Dynamic Lyric Baseline: Safe distance from lower ledger lines (E3, G3)
                  let maxNoteYInMeasure = staffTopY + 40;
                  m.notes.forEach(({ note }) => {
                    if (note.pitch !== 'REST') {
                      const rawY = getPitchStaffY(
                        note.displayPitch || note.pitch,
                        isBassClef,
                        isDrumClef,
                        note.drumType
                      );
                      if (staffTopY + rawY > maxNoteYInMeasure) {
                        maxNoteYInMeasure = staffTopY + rawY;
                      }
                    }
                  });
                  const lyricY = transposed.hasTablature
                    ? tabTopY + 44
                    : Math.max(staffTopY + 66, maxNoteYInMeasure + 18);

                  return (
                    <g key={m.measureNum}>
                      {/* Pro-Tier: Akkordsymbol über dem Takt */}
                      {uiLevel === 'pro' && m.chord && (
                        <text
                          x={mStartX + (hasRepeatLeft ? 20 : 12)}
                          y={staffTopY - 14}
                          fontSize="13"
                          fontWeight="900"
                          fill="#0284c7"
                          fontFamily="sans-serif"
                        >
                          {m.chord}
                        </text>
                      )}

                      {/* 🎼 SMuFL Wiederholungszeichen links (|:) */}
                      {hasRepeatLeft && (
                        <g>
                          <line x1={mStartX} y1={staffTopY} x2={mStartX} y2={staffTopY + 40} stroke="#0f172a" strokeWidth="3.5" />
                          <line x1={mStartX + 4.5} y1={staffTopY} x2={mStartX + 4.5} y2={staffTopY + 40} stroke="#334155" strokeWidth="1.2" />
                          <circle cx={mStartX + 9} cy={staffTopY + 15} r="2.2" fill="#0f172a" />
                          <circle cx={mStartX + 9} cy={staffTopY + 25} r="2.2" fill="#0f172a" />
                        </g>
                      )}

                      {/* 🎼 SMuFL Wiederholungszeichen rechts (:|) oder Doppel-/Takt-Trennstrich */}
                      {hasRepeatRight ? (
                        <g>
                          <circle cx={mEndX - 9} cy={staffTopY + 15} r="2.2" fill="#0f172a" />
                          <circle cx={mEndX - 9} cy={staffTopY + 25} r="2.2" fill="#0f172a" />
                          <line x1={mEndX - 4.5} y1={staffTopY} x2={mEndX - 4.5} y2={staffTopY + 40} stroke="#334155" strokeWidth="1.2" />
                          <line x1={mEndX} y1={staffTopY} x2={mEndX} y2={staffTopY + 40} stroke="#0f172a" strokeWidth="3.5" />
                        </g>
                      ) : isLastMeasureInSong ? (
                        // Doppel-Schlussstrich
                        <g>
                          <line x1={mEndX - 4} y1={staffTopY} x2={mEndX - 4} y2={staffTopY + 40} stroke="#334155" strokeWidth="1.5" />
                          <line x1={mEndX} y1={staffTopY} x2={mEndX} y2={staffTopY + 40} stroke="#0f172a" strokeWidth="4" />
                        </g>
                      ) : (
                        <line x1={mEndX} y1={staffTopY} x2={mEndX} y2={staffTopY + 40} stroke="#94a3b8" strokeWidth="1.2" />
                      )}

                      {/* Notes within Measure */}
                      {m.notes.map(({ note, globalIndex, beatInMeasure }, noteIdx) => {
                        const isActive = activeNoteIdx === globalIndex;
                        const hitStatus = noteHits[globalIndex];
                        const isHit = hitStatus === 'hit';
                        const isNear = hitStatus === 'near';
                        const isMiss = hitStatus === 'miss';
                        const isRest = note.pitch === 'REST';

                        const noteX = notePositions[noteIdx] ?? (mStartX + 16);

                        // Pitch height relative to clef
                        const rawY = getPitchStaffY(
                          note.displayPitch || note.pitch,
                          isBassClef,
                          isDrumClef,
                          note.drumType
                        );

                        const noteY = staffTopY + rawY;

                        // Stem & Duration calculation
                        const stemUp = rawY > 20;
                        const duration = note.durationBeats || 1;
                        const isWholeNote = duration >= 4;
                        const isHalfNote = duration >= 2 && duration < 4;
                        const isHollow = isWholeNote || isHalfNote;
                        const isDotted = Math.abs(duration - 0.75) < 0.02 || Math.abs(duration - 1.5) < 0.02 || Math.abs(duration - 3) < 0.02;
                        const isSixteenth = Math.abs(duration - 0.25) < 0.02;
                        const isEighth = Math.abs(duration - 0.5) < 0.02 || Math.abs(duration - 0.75) < 0.02;

                        const stemHeight = 32;
                        const stemX = stemUp
                          ? noteX + (uiLevel === 'junior' ? 5.8 : 5.2)
                          : noteX - (uiLevel === 'junior' ? 5.8 : 5.2);
                        const stemY2 = stemUp ? noteY - stemHeight : noteY + stemHeight;

                        // Dynamic Color by Tier and Hit Status
                        const noteheadColor = isHit
                          ? '#22c55e'
                          : isNear
                          ? '#eab308'
                          : isMiss
                          ? '#ef4444'
                          : uiLevel === 'junior'
                          ? getNoteColor(note.displayPitch || note.pitch)
                          : '#0f172a';

                        // 🎼 In-measure accidental deduplication
                        const pitchStr = (note.displayPitch || note.pitch).trim();
                        const hasSharp = !isKeyAccidental(pitchStr, score.tonalCenter) && pitchStr.includes('#');
                        const hasFlat = !isKeyAccidental(pitchStr, score.tonalCenter) && /^[A-G]b[0-9]/i.test(pitchStr);
                        const hasNatural = pitchStr.includes('♮');

                        let showSharp = false;
                        let showFlat = false;
                        let showNatural = false;

                        if (hasSharp) {
                          if (!measureSharpsSeen.has(pitchStr)) {
                            measureSharpsSeen.add(pitchStr);
                            showSharp = true;
                          }
                        }
                        if (hasFlat) {
                          if (!measureFlatsSeen.has(pitchStr)) {
                            measureFlatsSeen.add(pitchStr);
                            showFlat = true;
                          }
                        }
                        if (hasNatural) {
                          if (!measureNaturalsSeen.has(pitchStr)) {
                            measureNaturalsSeen.add(pitchStr);
                            showNatural = true;
                          }
                        }

                        return (
                          <g
                            key={globalIndex}
                            onClick={() => onNoteTap?.(globalIndex)}
                            style={{ cursor: mode === 'challenge' ? 'pointer' : 'default' }}
                          >
                            {/* Cursor Highlight Box */}
                            {isActive && (
                              <rect
                                x={noteX - 16}
                                y={staffTopY - 14}
                                width={32}
                                height={transposed.hasTablature ? 120 : Math.max(86, (lyricY - staffTopY) + 20)}
                                rx="8"
                                fill="rgba(2, 132, 199, 0.16)"
                                stroke="#0284c7"
                                strokeWidth="2"
                                strokeDasharray="3 3"
                              />
                            )}

                            {/* Ledger Lines below staff */}
                            {!isRest && [50, 60, 70, 80].map(ledgerY => (
                              rawY >= ledgerY ? (
                                <line
                                  key={`ledger-below-${ledgerY}`}
                                  x1={noteX - 9}
                                  y1={staffTopY + ledgerY}
                                  x2={noteX + 9}
                                  y2={staffTopY + ledgerY}
                                  stroke="#334155"
                                  strokeWidth="1.4"
                                />
                              ) : null
                            ))}

                            {/* Ledger Lines above staff */}
                            {!isRest && [-10, -20, -30].map(ledgerY => (
                              rawY <= ledgerY ? (
                                <line
                                  key={`ledger-above-${ledgerY}`}
                                  x1={noteX - 9}
                                  y1={staffTopY + ledgerY}
                                  x2={noteX + 9}
                                  y2={staffTopY + ledgerY}
                                  stroke="#334155"
                                  strokeWidth="1.4"
                                />
                              ) : null
                            ))}

                            {/* Noteheads */}
                            {!isRest && (
                              isDrumClef && note.drumType === 'hihat' ? (
                                // X-Notehead für Hi-Hat / Becken
                                <g transform={`translate(${noteX}, ${noteY})`}>
                                  <line x1="-5" y1="-5" x2="5" y2="5" stroke={noteheadColor} strokeWidth="2.4" />
                                  <line x1="-5" y1="5" x2="5" y2="-5" stroke={noteheadColor} strokeWidth="2.4" />
                                </g>
                              ) : (
                                <g>
                                  {/* In-measure accidental (# or b) before notehead */}
                                  {showSharp && (
                                    <path
                                      d={SMUFL_GLYPHS.accidentalSharp}
                                      transform={`translate(${noteX - (uiLevel === 'junior' ? 16 : 14)}, ${noteY + 3}) scale(0.022, -0.022)`}
                                      fill={noteheadColor}
                                    />
                                  )}
                                  {showFlat && (
                                    <path
                                      d={SMUFL_GLYPHS.accidentalFlat}
                                      transform={`translate(${noteX - (uiLevel === 'junior' ? 15 : 13)}, ${noteY + 4}) scale(0.022, -0.022)`}
                                      fill={noteheadColor}
                                    />
                                  )}
                                  {showNatural && (
                                    <path
                                      d={SMUFL_GLYPHS.accidentalNatural}
                                      transform={`translate(${noteX - (uiLevel === 'junior' ? 15 : 13)}, ${noteY + 3}) scale(0.022, -0.022)`}
                                      fill={noteheadColor}
                                    />
                                  )}
                                  {/* Standard Oval Notehead */}
                                  <ellipse
                                    cx={noteX}
                                    cy={noteY}
                                    rx={uiLevel === 'junior' ? 6.5 : 5.8}
                                    ry={uiLevel === 'junior' ? 4.8 : 4.2}
                                    transform={`rotate(-24 ${noteX} ${noteY})`}
                                    fill={isHollow ? '#fcfaf7' : noteheadColor}
                                    stroke={isHollow ? (uiLevel === 'junior' ? noteheadColor : '#0f172a') : noteheadColor}
                                    strokeWidth={isHollow ? '2.4' : '1.4'}
                                  />

                                  {/* Junior Mode: Buchstaben-Name auf Notenkopf */}
                                  {uiLevel === 'junior' && (
                                    <text
                                      x={noteX}
                                      y={noteY + 3.2}
                                      fontSize="8.5"
                                      fontWeight="900"
                                      textAnchor="middle"
                                      fill={isHollow ? noteheadColor : '#ffffff'}
                                      fontFamily="sans-serif"
                                    >
                                      {(note.displayPitch || note.pitch).replace(/[0-9#b♮]/g, '')}
                                    </text>
                                  )}
                                </g>
                              )
                            )}

                            {/* Dotted Point */}
                            {isDotted && !isRest && (
                              <circle
                                cx={noteX + 8.5}
                                cy={rawY % 10 === 0 ? noteY - 4 : noteY}
                                r="2"
                                fill={noteheadColor}
                              />
                            )}

                            {/* Notenhals (Stem) - Ganze Noten besitzen keinen Hals */}
                            {!isRest && !isWholeNote && (
                              <line
                                x1={stemX}
                                y1={noteY}
                                x2={stemX}
                                y2={stemY2}
                                stroke="#0f172a"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                              />
                            )}

                            {/* 🎼 SMuFL Fähnchen für Achtelnoten (einfach) */}
                            {isEighth && !isSixteenth && !isRest && !isWholeNote && (
                              <path
                                d={stemUp ? SMUFL_GLYPHS.flag8thUp : SMUFL_GLYPHS.flag8thDown}
                                transform={`translate(${stemX}, ${stemY2}) scale(0.038, -0.038)`}
                                fill="#0f172a"
                              />
                            )}

                            {/* 🎼 SMuFL Doppel-Fähnchen für Sechzehntelnoten */}
                            {isSixteenth && !isRest && !isWholeNote && (
                              <path
                                d={stemUp ? SMUFL_GLYPHS.flag16thUp : SMUFL_GLYPHS.flag16thDown}
                                transform={`translate(${stemX}, ${stemY2}) scale(0.038, -0.038)`}
                                fill="#0f172a"
                              />
                            )}

                            {/* 🎼 SMuFL Pausenzeichen (Rests) */}
                            {isRest && (
                              duration >= 2 ? (
                                // Halbe / Ganze Pause (Balken auf Linie 3 bzw. hängend von Linie 4)
                                <rect
                                  x={noteX - 7}
                                  y={duration >= 4 ? staffTopY + 10 : staffTopY + 16}
                                  width="14"
                                  height="4.5"
                                  fill="#475569"
                                  rx="1"
                                />
                              ) : (
                                // Viertelpause (Quarter Rest)
                                <path
                                  d={SMUFL_GLYPHS.restQuarter}
                                  transform={`translate(${noteX - 7}, ${staffTopY + 20}) scale(0.036, -0.036)`}
                                  fill="#64748b"
                                />
                              )
                            )}

                            {/* Lyrics / Silben unter Noten - Niemals unter Pausen, keine Kollision mit Hilfslinien oder Tabulatur */}
                            {!isRest && note.lyric && (
                              <text
                                x={noteX}
                                y={lyricY}
                                fontSize={uiLevel === 'junior' ? 12 : 11}
                                fontWeight={isActive ? 900 : 700}
                                textAnchor="middle"
                                fill={isActive ? '#0284c7' : '#475569'}
                                fontFamily="sans-serif"
                              >
                                {note.lyric}
                              </text>
                            )}

                            {/* Tabulatur Fret-Zahl */}
                            {transposed.hasTablature && note.displayFret !== undefined && (
                              <g>
                                <text
                                  x={noteX}
                                  y={tabTopY + (note.displayString ?? 0) * 8 + 4}
                                  fontSize="10"
                                  fontWeight="900"
                                  textAnchor="middle"
                                  fill={isActive ? '#0284c7' : '#1e293b'}
                                  fontFamily="monospace"
                                >
                                  {note.displayFret}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
};
