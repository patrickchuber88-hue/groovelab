import React, { useMemo } from 'react';
import { WorldTourScore } from '../../../../types/worldTour';
import { TransposedScoreResult } from '../../../../domain/worldTourTransposer';

interface WorldTourStaffNotationProps {
  score: WorldTourScore;
  transposed: TransposedScoreResult;
  activeNoteIdx: number;
  noteHits?: Record<number, 'pending' | 'hit' | 'near' | 'miss'>;
  studentInstrument?: string | null;
  mode?: 'listen' | 'practice' | 'challenge';
}

// Pitch height mapping for treble clef (y offset relative to top line F5 = 0, line spacing = 10)
// Staff lines: F5 (0), D5 (10), B4 (20), G4 (30), E4 (40)
// Staff spaces: E5 (5), C5 (15), A4 (25), F4 (35)
// Below staff: D4 (45), C4 (50), B3 (55), A3 (60), G3 (65), F3 (70), E3 (75), D3 (80), C3 (85)
// Above staff: G5 (-5), A5 (-10), B5 (-15), C6 (-20)
const PITCH_STAFF_Y: Record<string, number> = {
  'C3': 85, 'D3': 80, 'E3': 75, 'F3': 70, 'F#3': 70, 'G3': 65, 'Ab3': 60, 'A3': 60, 'Bb3': 55, 'B3': 55,
  'C4': 50, 'C#4': 50, 'Db4': 50, 'D4': 45, 'Eb4': 40, 'E4': 40, 'F4': 35, 'F#4': 35, 'Gb4': 35,
  'G4': 30, 'Ab4': 25, 'A4': 25, 'Bb4': 20, 'B4': 20,
  'C5': 15, 'C#5': 15, 'D5': 10, 'Eb5': 5, 'E5': 5,
  'F5': 0, 'F#5': 0, 'G5': -5, 'Ab5': -10, 'A5': -10, 'Bb5': -15, 'B5': -15, 'C6': -20
};

interface MeasureData {
  measureNum: number;
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
  mode = 'listen'
}) => {
  const notes = transposed.notes;
  const isBassClef = studentInstrument?.toLowerCase().includes('bass') || studentInstrument?.toLowerCase().includes('cello');
  const beatsPerMeasure = score.timeSignature === '3/4' ? 3 : score.timeSignature === '2/4' ? 2 : 4;

  // 1. Group notes into measures based on beats
  const measures = useMemo(() => {
    const list: MeasureData[] = [];
    let currentMeasureNum = 1;
    let currentBeatInMeasure = 0;
    let currentMeasureNotes: MeasureData['notes'] = [];

    notes.forEach((note, idx) => {
      // Check if current note exceeds this measure
      if (currentBeatInMeasure >= beatsPerMeasure - 0.01) {
        list.push({
          measureNum: currentMeasureNum,
          notes: currentMeasureNotes
        });
        currentMeasureNum++;
        currentBeatInMeasure = 0;
        currentMeasureNotes = [];
      }

      currentMeasureNotes.push({
        note,
        globalIndex: idx,
        beatInMeasure: currentBeatInMeasure
      });

      currentBeatInMeasure += note.durationBeats;
    });

    if (currentMeasureNotes.length > 0) {
      list.push({
        measureNum: currentMeasureNum,
        notes: currentMeasureNotes
      });
    }

    return list;
  }, [notes, beatsPerMeasure]);

  // 2. Distribute measures cleanly into systems (e.g. 4 measures per line)
  const systems = useMemo(() => {
    const totalMeasures = measures.length;
    let measuresPerSystem = 4;

    if (totalMeasures <= 4) {
      measuresPerSystem = totalMeasures;
    } else if (totalMeasures <= 8) {
      measuresPerSystem = Math.ceil(totalMeasures / 2);
    } else if (totalMeasures <= 12) {
      measuresPerSystem = Math.ceil(totalMeasures / 3);
    } else {
      measuresPerSystem = 4;
    }

    const sysList: SystemData[] = [];
    for (let i = 0; i < measures.length; i += measuresPerSystem) {
      const slice = measures.slice(i, i + measuresPerSystem);
      const startM = slice[0]?.measureNum || 1;
      const endM = slice[slice.length - 1]?.measureNum || startM;
      sysList.push({
        measures: slice,
        startMeasureNum: startM,
        endMeasureNum: endM,
        label: `Takte ${startM}–${endM}`
      });
    }
    return sysList;
  }, [measures]);

  const hasSharpKey = score.tonalCenter.includes('G') || score.tonalCenter.includes('D');
  const hasTwoSharps = score.tonalCenter.includes('D-Dur');
  const hasFlatKey = score.tonalCenter.includes('F-Dur') || score.tonalCenter.includes('Bb');

  const isAccidentalSharpNeeded = (pitch: string): boolean => {
    if (!pitch.includes('#')) return false;
    const noteLetter = pitch.charAt(0).toUpperCase();
    if (hasTwoSharps) {
      if (noteLetter === 'F' || noteLetter === 'C') return false;
      return true;
    }
    if (hasSharpKey) {
      if (noteLetter === 'F') return false;
      return true;
    }
    return true;
  };

  const isAccidentalFlatNeeded = (pitch: string): boolean => {
    if (!pitch.includes('b')) return false;
    const noteLetter = pitch.charAt(0).toUpperCase();
    if (hasFlatKey) {
      if (noteLetter === 'B') return false;
      return true;
    }
    return true;
  };

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px 20px',
      background: '#ffffff',
      borderRadius: '20px',
      border: '1.5px solid #e2e8f0',
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
      overflowX: 'hidden',
      userSelect: 'none'
    }}>
      {systems.map((sys, sysIdx) => {
        const systemWidth = 840;
        const staffTopY = 40;
        const staffHeight = 40;
        const svgHeight = transposed.hasTablature ? 142 : 112;
        const startX = 110;
        const usableWidth = systemWidth - startX - 30;
        const measuresCount = sys.measures.length;
        const measureWidth = usableWidth / Math.max(1, measuresCount);

        return (
          <div
            key={sysIdx}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {/* System Header with Measure numbers and Tonality */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 6px'
            }}>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 850,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}>
                {sys.label}
              </span>
              {sysIdx === 0 && (
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
                  {score.tonalCenter} • {score.timeSignature}
                </span>
              )}
            </div>

            {/* SVG Score System */}
            <div style={{
              width: '100%',
              overflowX: 'auto',
              background: '#fcfcfc',
              borderRadius: '12px',
              border: '1.5px solid #f1f5f9'
            }}>
              <svg
                viewBox={`0 0 ${systemWidth} ${svgHeight}`}
                style={{ width: '100%', height: 'auto', minWidth: '720px', display: 'block' }}
              >
                {/* 5 Classical Staff Lines */}
                {[0, 10, 20, 30, 40].map((offsetY, i) => (
                  <line
                    key={i}
                    x1="20"
                    y1={staffTopY + offsetY}
                    x2={systemWidth - 20}
                    y2={staffTopY + offsetY}
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
                ))}

                {/* Left Bracket Line */}
                <line
                  x1="20"
                  y1={staffTopY}
                  x2="20"
                  y2={staffTopY + staffHeight}
                  stroke="#0f172a"
                  strokeWidth="2.5"
                />

                {/* Clef */}
                {!isBassClef ? (
                  // Treble Clef
                  <g transform={`translate(28, ${staffTopY - 14}) scale(0.72)`}>
                    <path
                      d="M18,52 C16,42 28,30 28,18 C28,8 20,2 14,2 C8,2 2,7 2,14 C2,22 10,26 14,26 C17,26 20,24 20,20 C20,16 16,13 13,13 C12,13 10,14 9,15 C10,9 14,5 17,5 C21,5 23,9 23,17 C23,26 13,36 13,46 C13,56 22,60 22,68 C22,74 18,78 14,78 C10,78 7,75 7,71 C7,67 10,64 13,64 C16,64 18,66 18,69 C18,71 16,73 14,73 C13,73 12,72 12,71 C12,68 15,66 15,62 C15,58 13,55 10,50"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                    <circle cx="14" cy="74" r="2.2" fill="#0f172a" />
                  </g>
                ) : (
                  // Bass Clef
                  <g transform={`translate(28, ${staffTopY + 2}) scale(0.72)`}>
                    <path
                      d="M4,10 C4,4 10,2 16,2 C24,2 30,8 30,16 C30,28 16,36 10,40"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                    <circle cx="9" cy="11" r="3.5" fill="#0f172a" />
                    <circle cx="36" cy="7" r="2.2" fill="#0f172a" />
                    <circle cx="36" cy="17" r="2.2" fill="#0f172a" />
                  </g>
                )}

                {/* Key Signatures (G-Dur Kreuz auf F5, F-Dur Be auf H4) */}
                {hasSharpKey && !isBassClef && (
                  <g transform={`translate(64, ${staffTopY - 4}) scale(0.58)`}>
                    <line x1="8" y1="2" x2="8" y2="22" stroke="#0f172a" strokeWidth="2.2" />
                    <line x1="14" y1="0" x2="14" y2="20" stroke="#0f172a" strokeWidth="2.2" />
                    <line x1="4" y1="8" x2="18" y2="5" stroke="#0f172a" strokeWidth="3" />
                    <line x1="4" y1="16" x2="18" y2="13" stroke="#0f172a" strokeWidth="3" />
                  </g>
                )}
                {hasTwoSharps && !isBassClef && (
                  <g transform={`translate(74, ${staffTopY + 6}) scale(0.58)`}>
                    <line x1="8" y1="2" x2="8" y2="22" stroke="#0f172a" strokeWidth="2.2" />
                    <line x1="14" y1="0" x2="14" y2="20" stroke="#0f172a" strokeWidth="2.2" />
                    <line x1="4" y1="8" x2="18" y2="5" stroke="#0f172a" strokeWidth="3" />
                    <line x1="4" y1="16" x2="18" y2="13" stroke="#0f172a" strokeWidth="3" />
                  </g>
                )}
                {hasFlatKey && !isBassClef && (
                  <g transform={`translate(66, ${staffTopY + 12}) scale(0.62)`}>
                    <line x1="6" y1="0" x2="6" y2="22" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                    <path d="M6,10 C12,8 18,14 14,20 C10,24 6,22 6,20" fill="none" stroke="#0f172a" strokeWidth="2.4" />
                  </g>
                )}

                {/* Time Signature (on first system) */}
                {sysIdx === 0 && (
                  <g transform={`translate(${hasTwoSharps ? 92 : hasSharpKey || hasFlatKey ? 84 : 74}, ${staffTopY + 1})`}>
                    <text x="0" y="16" fontSize="18" fontWeight="900" fontFamily="serif" fill="#0f172a">
                      {score.timeSignature.split('/')[0]}
                    </text>
                    <text x="0" y="36" fontSize="18" fontWeight="900" fontFamily="serif" fill="#0f172a">
                      {score.timeSignature.split('/')[1]}
                    </text>
                  </g>
                )}

                {/* Render Measures, Bar Lines, and Notes */}
                {sys.measures.map((m, mIdx) => {
                  const mStartX = startX + mIdx * measureWidth;
                  const mEndX = mStartX + measureWidth;
                  const isLastMeasureInSystem = mIdx === measuresCount - 1;
                  const isAbsoluteLastMeasure = sysIdx === systems.length - 1 && isLastMeasureInSystem;

                  return (
                    <g key={m.measureNum}>
                      {/* Measure Number Badge */}
                      <text
                        x={mStartX + 4}
                        y={staffTopY - 6}
                        fontSize="9.5"
                        fontWeight="800"
                        fill="#94a3b8"
                      >
                        {m.measureNum}
                      </text>

                      {/* Right Measure Bar Line (Taktstrich) */}
                      {!isLastMeasureInSystem ? (
                        <line
                          x1={mEndX}
                          y1={staffTopY}
                          x2={mEndX}
                          y2={staffTopY + staffHeight}
                          stroke="#64748b"
                          strokeWidth="1.2"
                        />
                      ) : (
                        // End of system bar line
                        <line
                          x1={systemWidth - 24}
                          y1={staffTopY}
                          x2={systemWidth - 24}
                          y2={staffTopY + staffHeight}
                          stroke="#0f172a"
                          strokeWidth="1.6"
                        />
                      )}

                      {/* Double bar line for piece end */}
                      {isAbsoluteLastMeasure && (
                        <line
                          x1={systemWidth - 20}
                          y1={staffTopY}
                          x2={systemWidth - 20}
                          y2={staffTopY + staffHeight}
                          stroke="#0f172a"
                          strokeWidth="3.6"
                        />
                      )}

                      {/* Notes within this measure */}
                      {m.notes.map(({ note, globalIndex, beatInMeasure }) => {
                        const isActive = activeNoteIdx === globalIndex;
                        const hitStatus = noteHits[globalIndex];
                        const isHit = hitStatus === 'hit';
                        const isNear = hitStatus === 'near';
                        const isMiss = hitStatus === 'miss';
                        const isRest = note.pitch === 'REST';

                        // Proportional X position within the measure
                        const beatFrac = beatInMeasure / beatsPerMeasure;
                        const noteX = mStartX + 14 + (beatFrac * (measureWidth - 28));

                        // Pitch height relative to top line F5
                        const pitchClean = note.displayPitch.replace(/[^A-Ga-g#0-9]/g, '');
                        const rawY = PITCH_STAFF_Y[pitchClean] ?? 30;
                        const noteY = staffTopY + rawY;

                        // Stem calculation
                        const stemUp = rawY > 20;
                        const stemHeight = 30;
                        const stemX = stemUp ? noteX + 4.8 : noteX - 4.8;
                        const stemY2 = stemUp ? noteY - stemHeight : noteY + stemHeight;

                        const isHalfOrWhole = note.durationBeats >= 2;
                        const isDotted = note.durationBeats === 1.5 || note.durationBeats === 0.75;
                        const isEighth = note.durationBeats === 0.5;
                        const isSixteenth = note.durationBeats === 0.25;

                        return (
                          <g key={globalIndex}>
                            {/* Active Cursor Glow Box behind the note */}
                            {isActive && (
                              <rect
                                x={noteX - 16}
                                y={staffTopY - 14}
                                width={32}
                                height={transposed.hasTablature ? 96 : 74}
                                rx="8"
                                fill="rgba(56, 189, 248, 0.2)"
                                stroke="#38bdf8"
                                strokeWidth="2"
                                strokeDasharray="3 3"
                              />
                            )}

                            {/* Ledger Lines below staff (C4 at 50, A3 at 60, F3 at 70, etc.) */}
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

                            {/* Ledger Lines above staff (A5 at -10, C6 at -20) */}
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
                            {!isRest && rawY <= -20 && (
                              <line
                                x1={noteX - 9}
                                y1={staffTopY - 20}
                                x2={noteX + 9}
                                y2={staffTopY - 20}
                                stroke="#334155"
                                strokeWidth="1.4"
                              />
                            )}

                            {/* Accidental sharp (#) */}
                            {!isRest && isAccidentalSharpNeeded(pitchClean) && (
                              <g transform={`translate(${noteX - 14}, ${noteY - 8}) scale(0.55)`}>
                                <line x1="6" y1="2" x2="6" y2="20" stroke="#0f172a" strokeWidth="2.2" />
                                <line x1="12" y1="0" x2="12" y2="18" stroke="#0f172a" strokeWidth="2.2" />
                                <line x1="2" y1="7" x2="16" y2="4" stroke="#0f172a" strokeWidth="2.8" />
                                <line x1="2" y1="14" x2="16" y2="11" stroke="#0f172a" strokeWidth="2.8" />
                              </g>
                            )}

                            {/* Accidental flat (b) */}
                            {!isRest && isAccidentalFlatNeeded(pitchClean) && (
                              <g transform={`translate(${noteX - 14}, ${noteY - 8}) scale(0.55)`}>
                                <line x1="6" y1="0" x2="6" y2="22" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                                <path d="M6,10 C12,8 18,14 14,20 C10,24 6,22 6,20" fill="none" stroke="#0f172a" strokeWidth="2.4" />
                              </g>
                            )}

                            {/* Render Notehead or Rest */}
                            {isRest ? (
                              // Quarter Rest symbol
                              <path
                                d={`M${noteX - 3},${staffTopY + 12} L${noteX + 3},${staffTopY + 18} L${noteX - 2},${staffTopY + 24} Q${noteX + 4},${staffTopY + 28} ${noteX},${staffTopY + 34}`}
                                fill="none"
                                stroke={isActive ? '#eab308' : '#334155'}
                                strokeWidth="2.4"
                                strokeLinecap="round"
                              />
                            ) : (
                              // Rotated Musical Notehead
                              <>
                                <ellipse
                                  cx={noteX}
                                  cy={noteY}
                                  rx="5.4"
                                  ry="3.8"
                                  transform={`rotate(-22 ${noteX} ${noteY})`}
                                  fill={
                                    isHit
                                      ? '#22c55e'
                                      : isNear
                                      ? '#f59e0b'
                                      : isMiss
                                      ? '#ef4444'
                                      : isActive
                                      ? '#38bdf8'
                                      : isHalfOrWhole
                                      ? '#ffffff'
                                      : '#0f172a'
                                  }
                                  stroke={
                                    isHit
                                      ? '#16a34a'
                                      : isNear
                                      ? '#d97706'
                                      : isMiss
                                      ? '#dc2626'
                                      : isActive
                                      ? '#0284c7'
                                      : '#0f172a'
                                  }
                                  strokeWidth={isHalfOrWhole ? '2.2' : '1'}
                                />

                                {/* Rhythm Dot */}
                                {isDotted && (
                                  <circle
                                    cx={noteX + 9}
                                    cy={rawY % 10 === 0 ? noteY - 4 : noteY}
                                    r="2.2"
                                    fill={isHit ? '#22c55e' : isNear ? '#f59e0b' : isActive ? '#38bdf8' : '#0f172a'}
                                  />
                                )}

                                {/* Note Stem */}
                                <line
                                  x1={stemX}
                                  y1={noteY}
                                  x2={stemX}
                                  y2={stemY2}
                                  stroke={
                                    isHit
                                      ? '#16a34a'
                                      : isNear
                                      ? '#d97706'
                                      : isMiss
                                      ? '#dc2626'
                                      : isActive
                                      ? '#0284c7'
                                      : '#0f172a'
                                  }
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                />

                                {/* Eighth Note Flag */}
                                {isEighth && (
                                  <path
                                    d={
                                      stemUp
                                        ? `M${stemX},${stemY2} Q${stemX + 10},${stemY2 + 10} ${stemX + 6},${stemY2 + 20}`
                                        : `M${stemX},${stemY2} Q${stemX + 10},${stemY2 - 10} ${stemX + 6},${stemY2 - 20}`
                                    }
                                    fill="none"
                                    stroke={isHit ? '#16a34a' : isNear ? '#d97706' : isActive ? '#0284c7' : '#0f172a'}
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                  />
                                )}

                                {/* Sixteenth Note Flag (Double flag) */}
                                {isSixteenth && (
                                  <>
                                    <path
                                      d={
                                        stemUp
                                          ? `M${stemX},${stemY2} Q${stemX + 10},${stemY2 + 10} ${stemX + 6},${stemY2 + 18}`
                                          : `M${stemX},${stemY2} Q${stemX + 10},${stemY2 - 10} ${stemX + 6},${stemY2 - 18}`
                                      }
                                      fill="none"
                                      stroke={isHit ? '#16a34a' : isNear ? '#d97706' : isActive ? '#0284c7' : '#0f172a'}
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                    />
                                    <path
                                      d={
                                        stemUp
                                          ? `M${stemX},${stemY2 + 6} Q${stemX + 10},${stemY2 + 16} ${stemX + 6},${stemY2 + 24}`
                                          : `M${stemX},${stemY2 - 6} Q${stemX + 10},${stemY2 - 16} ${stemX + 6},${stemY2 - 24}`
                                      }
                                      fill="none"
                                      stroke={isHit ? '#16a34a' : isNear ? '#d97706' : isActive ? '#0284c7' : '#0f172a'}
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                    />
                                  </>
                                )}
                              </>
                            )}

                            {/* Syllable Lyric Text */}
                            {note.lyric && (
                              <text
                                x={noteX}
                                y={staffTopY + staffHeight + 20}
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight={isActive ? '850' : '650'}
                                fill={
                                  isHit
                                    ? '#15803d'
                                    : isNear
                                    ? '#b45309'
                                    : isMiss
                                    ? '#b91c1c'
                                    : isActive
                                    ? '#0284c7'
                                    : '#334155'
                                }
                              >
                                {note.lyric}
                              </text>
                            )}

                            {/* Tablature indicator (Guitar/Bass frets) */}
                            {transposed.hasTablature && note.displayFret !== undefined && !isRest && (
                              <g transform={`translate(${noteX}, ${staffTopY + staffHeight + 36})`}>
                                <rect
                                  x="-11"
                                  y="-9"
                                  width="22"
                                  height="16"
                                  rx="4"
                                  fill="#f1f5f9"
                                  stroke="#cbd5e1"
                                  strokeWidth="1"
                                />
                                <text
                                  x="0"
                                  y="3"
                                  textAnchor="middle"
                                  fontSize="9"
                                  fontWeight="800"
                                  fill="#475569"
                                >
                                  B{note.displayFret}
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
          </div>
        );
      })}
    </div>
  );
};
