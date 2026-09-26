import React, { useMemo } from 'react';
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
  'C4': 50, 'C#4': 50, 'Db4': 50, 'D4': 45, 'Eb4': 40, 'E4': 40, 'F4': 35, 'F#4': 35, 'Gb4': 35,
  'G4': 30, 'Ab4': 25, 'A4': 25, 'Bb4': 20, 'B4': 20,
  'C5': 15, 'C#5': 15, 'D5': 10, 'Eb5': 5, 'E5': 5,
  'F5': 0, 'F#5': 0, 'G5': -5, 'Ab5': -10, 'A5': -10, 'Bb5': -15, 'B5': -15, 'C6': -20
};

// 🎼 Bass Clef Y-Mapping (Top line A3 = 0, line spacing = 10)
// Staff lines: A3 (0), F3 (10), D3 (20 - middle), B2 (30), G2 (40 - bottom)
// Staff spaces: G3 (5), E3 (15), C3 (25), A2 (35)
// Above staff: Middle C (C4 = -10, ledger line 1 above), B3 (-5)
// Below staff: F2 (45), E2 (50, ledger line 1 below), D2 (55), C2 (60, ledger line 2 below)
const BASS_PITCH_STAFF_Y: Record<string, number> = {
  'C2': 60, 'D2': 55, 'Eb2': 50, 'E2': 50, 'F2': 45, 'F#2': 45, 'G2': 40, 'Ab2': 35, 'A2': 35, 'Bb2': 30, 'B2': 30,
  'C3': 25, 'C#3': 25, 'Db3': 25, 'D3': 20, 'Eb3': 15, 'E3': 15, 'F3': 10, 'F#3': 10, 'G3': 5, 'Ab3': 0, 'A3': 0, 'Bb3': -5, 'B3': -5,
  'C4': -10, 'C#4': -10, 'D4': -15, 'Eb4': -20, 'E4': -20, 'F4': -25, 'G4': -30
};

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
  const match = pitch.match(/^([A-G])/);
  if (!match) return '#0f172a';
  return BOOMWHACKERS_COLORS[match[1]] || '#0f172a';
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
  const notes = transposed.notes;
  const isBassClef = transposed.clef === 'bass' || studentInstrument?.toLowerCase().includes('bass') || studentInstrument?.toLowerCase().includes('cello');
  const isDrumClef = transposed.clef === 'drums' || studentInstrument?.toLowerCase().includes('drum') || studentInstrument?.toLowerCase().includes('schlagzeug');
  
  // Calculate beats per measure based on time signature
  const beatsPerMeasure = useMemo(() => {
    if (score.timeSignature === '3/4') return 3;
    if (score.timeSignature === '2/4') return 2;
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

  // Break measures into systems (4 measures per system)
  const systems = useMemo(() => {
    const sysList: SystemData[] = [];
    const measuresPerSystem = 4;

    for (let i = 0; i < measures.length; i += measuresPerSystem) {
      const slice = measures.slice(i, i + measuresPerSystem);
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
    }

    return sysList;
  }, [measures]);

  const hasSharpKey = score.tonalCenter.includes('G-Dur') || score.tonalCenter.includes('E-Moll');
  const hasTwoSharps = score.tonalCenter.includes('D-Dur') || score.tonalCenter.includes('B-Moll');
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
      {/* 🎼 Header: Urtext Partitur-Label & Didaktik-Badges */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        paddingBottom: '12px',
        borderBottom: '1.5px solid #e2e8f0',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '0.80rem',
            fontWeight: 850,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#0f172a'
          }}>
            🎼 Urtext Notenausgabe
          </span>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
            ({transposed.clef === 'drums' ? 'Drum Tab' : transposed.clef === 'bass' ? 'Bass-Schlüssel' : 'Violinschlüssel'})
          </span>
        </div>

        {/* 3-Tier Mode Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {uiLevel === 'junior' && (
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '6px',
              background: '#fef3c7',
              color: '#d97706',
              border: '1px solid #fde68a'
            }}>
              🌈 Junior-Farbnoten (Boomwhackers)
            </span>
          )}
          {uiLevel === 'pro' && (
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '6px',
              background: '#e0f2fe',
              color: '#0284c7',
              border: '1px solid #bae6fd'
            }}>
              🎼 Lead-Sheet & Akkorde
            </span>
          )}
          <span style={{
            fontSize: '0.76rem',
            fontWeight: 750,
            padding: '2px 8px',
            borderRadius: '6px',
            background: '#f1f5f9',
            color: '#64748b'
          }}>
            {measures.filter(m => m.measureNum > 0).length} Takte{score.anacrusisBeats ? ' (+ Auftakt)' : ''}
          </span>
        </div>
      </div>

      {/* 🎼 SVG Notation Renderer */}
      <div style={{ minWidth: '760px', width: '100%' }}>
        {systems.map((sys, sysIdx) => {
          const sysHeight = transposed.hasTablature ? 175 : 130;
          const staffTopY = 38;
          const tabTopY = staffTopY + 54;
          const totalWidth = 940;
          const leftMargin = hasTwoSharps ? 132 : (hasSharpKey || hasFlatKey) ? 120 : 104; // Space for Clef, Key, Time
          const usableWidth = totalWidth - leftMargin - 30;
          const measureWidth = usableWidth / sys.measures.length;

          return (
            <div key={sysIdx} style={{ marginBottom: sysIdx === systems.length - 1 ? 0 : '24px' }}>
              <svg
                viewBox={`0 0 ${totalWidth} ${sysHeight}`}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              >
                {/* 🎼 Bärenreiter Urtext Measure Badge über dem ersten Taktstrich (Keine Kollision mit Notenschlüssel!) */}
                <g transform={`translate(${leftMargin}, ${staffTopY - 20})`}>
                  <rect
                    x="0"
                    y="0"
                    width={sys.label.length > 9 ? 74 : 56}
                    height="16"
                    rx="4"
                    fill="#f1f5f9"
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                  <text
                    x={(sys.label.length > 9 ? 74 : 56) / 2}
                    y="11.5"
                    fontSize="9.5"
                    fontWeight="800"
                    fill="#475569"
                    textAnchor="middle"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {sys.label}
                  </text>
                </g>

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
                  const mStartX = leftMargin + mIdx * measureWidth;
                  const mEndX = mStartX + measureWidth;
                  const lastMeasureInScore = measures[measures.length - 1];
                  const isLastMeasureInSong = m.measureNum === (lastMeasureInScore?.measureNum ?? measures.length);
                  const mTargetBeats = m.measureNum === 0 ? (score.anacrusisBeats || 1) : beatsPerMeasure;

                  // 🎼 Anti-Collision Layout: Calculate safe horizontal position for each note in measure
                  const notePositions: number[] = [];
                  let lastSafeX = mStartX;
                  m.notes.forEach((item, nIdx) => {
                    const frac = item.beatInMeasure / mTargetBeats;
                    const idealX = mStartX + 16 + frac * (measureWidth - 32);
                    const prevNote = nIdx > 0 ? m.notes[nIdx - 1].note : null;
                    const prevLyric = prevNote?.lyric || '';
                    const minGap = prevLyric.length > 0 ? Math.max(24, prevLyric.length * 7.5 + 4) : 18;
                    const safeX = Math.max(idealX, lastSafeX + (nIdx === 0 ? 0 : minGap));
                    const finalX = Math.min(mEndX - 14, safeX);
                    notePositions.push(finalX);
                    lastSafeX = finalX;
                  });

                  return (
                    <g key={m.measureNum}>
                      {/* Pro-Tier: Akkordsymbol über dem Takt */}
                      {uiLevel === 'pro' && m.chord && (
                        <text
                          x={mStartX + 12}
                          y={staffTopY - 14}
                          fontSize="13"
                          fontWeight="900"
                          fill="#0284c7"
                          fontFamily="sans-serif"
                        >
                          {m.chord}
                        </text>
                      )}

                      {/* Takt-Trennstrich */}
                      {isLastMeasureInSong ? (
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
                        const pitchClean = note.displayPitch.replace(/[^A-Ga-g#0-9]/g, '');
                        const rawY = isBassClef
                          ? (BASS_PITCH_STAFF_Y[pitchClean] ?? 20)
                          : isDrumClef
                          ? (note.drumType === 'snare' ? 20 : note.drumType === 'hihat' ? -5 : 40)
                          : (TREBLE_PITCH_STAFF_Y[pitchClean] ?? 30);

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
                          ? getNoteColor(note.pitch)
                          : '#0f172a';

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
                                height={transposed.hasTablature ? 120 : 86}
                                rx="8"
                                fill="rgba(2, 132, 199, 0.16)"
                                stroke="#0284c7"
                                strokeWidth="2"
                                strokeDasharray="3 3"
                              />
                            )}

                            {/* Ledger Lines below staff */}
                            {!isRest && rawY >= 50 && (
                              <line
                                x1={noteX - 9}
                                y1={staffTopY + 50}
                                x2={noteX + 9}
                                y2={staffTopY + 50}
                                stroke="#334155"
                                strokeWidth="1.4"
                              />
                            )}
                            {!isRest && rawY >= 60 && (
                              <line
                                x1={noteX - 9}
                                y1={staffTopY + 60}
                                x2={noteX + 9}
                                y2={staffTopY + 60}
                                stroke="#334155"
                                strokeWidth="1.4"
                              />
                            )}

                            {/* Ledger Lines above staff */}
                            {!isRest && rawY <= -10 && (
                              <line
                                x1={noteX - 9}
                                y1={staffTopY - 10}
                                x2={noteX + 9}
                                y2={staffTopY - 10}
                                stroke="#334155"
                                strokeWidth="1.4"
                              />
                            )}

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
                                  {(note.displayPitch || note.pitch).includes('#') && (
                                    <path
                                      d={SMUFL_GLYPHS.accidentalSharp}
                                      transform={`translate(${noteX - (uiLevel === 'junior' ? 16 : 14)}, ${noteY + 3}) scale(0.022, -0.022)`}
                                      fill={noteheadColor}
                                    />
                                  )}
                                  {(note.displayPitch || note.pitch).includes('b') && !(note.displayPitch || note.pitch).startsWith('B') && (
                                    <path
                                      d={SMUFL_GLYPHS.accidentalFlat}
                                      transform={`translate(${noteX - (uiLevel === 'junior' ? 15 : 13)}, ${noteY + 4}) scale(0.022, -0.022)`}
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
                                      {note.pitch.replace(/[0-9#b]/g, '')}
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
                                transform={`translate(${stemX}, ${stemY2}) scale(0.038, ${stemUp ? -0.038 : 0.038})`}
                                fill="#0f172a"
                              />
                            )}

                            {/* 🎼 SMuFL Doppel-Fähnchen für Sechzehntelnoten */}
                            {isSixteenth && !isRest && !isWholeNote && (
                              <path
                                d={stemUp ? SMUFL_GLYPHS.flag16thUp : SMUFL_GLYPHS.flag16thDown}
                                transform={`translate(${stemX}, ${stemY2}) scale(0.038, ${stemUp ? -0.038 : 0.038})`}
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

                            {/* Lyrics / Silben unter Noten - Keine Kollision mit Hilfslinien oder Tabulatur */}
                            {note.lyric && (
                              <text
                                x={noteX}
                                y={transposed.hasTablature ? tabTopY + 44 : staffTopY + 66}
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
