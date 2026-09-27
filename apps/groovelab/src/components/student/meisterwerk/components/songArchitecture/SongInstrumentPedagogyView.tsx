import React, { useState } from 'react';
import { Music, Drum, Sparkles, HelpCircle, Eye, Info, Zap } from 'lucide-react';
import type { SongSection } from '../SongStructureBar';
import { detectKeyAndScale, getChordNotes, PITCH_CLASSES } from '../../utils/musicTheoryEngine';
import { playAlongAudioEngine } from '../../utils/songPlayAlongAudioEngine';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface SongInstrumentPedagogyViewProps {
  section: SongSection;
  studentInstrument?: string;
}

export const SongInstrumentPedagogyView: React.FC<SongInstrumentPedagogyViewProps> = ({
  section,
  studentInstrument = 'Gitarre'
}) => {
  const isDrumsInitial = /schlagzeug|drum|percussion/i.test(studentInstrument);
  const isPianoInitial = /klavier|piano|keyboard/i.test(studentInstrument);
  const isBassInitial = /bass/i.test(studentInstrument);

  const [activeTab, setActiveTab] = useState<'guitar' | 'piano' | 'drums' | 'bass'>(() => {
    if (isDrumsInitial) return 'drums';
    if (isPianoInitial) return 'piano';
    if (isBassInitial) return 'bass';
    return 'guitar';
  });

  const [showPentatonicOverlay, setShowPentatonicOverlay] = useState<boolean>(true);
  const [selectedChordIdx, setSelectedChordIdx] = useState<number>(0);

  const safeSection: SongSection = section || { id: 'fallback', name: 'Strophe', barsCount: 8, bars: '8 Takte', chords: ['Em', 'C', 'G', 'D'] };
  const chords = safeSection.chords && Array.isArray(safeSection.chords) && safeSection.chords.length > 0 ? safeSection.chords : ['Em', 'C', 'G', 'D'];
  const activeChord = chords[selectedChordIdx] || chords[0];
  const chordInfo = getChordNotes(activeChord);
  const theory = detectKeyAndScale(chords);

  // Standard Guitar Tuning (Low E to High E): E2, A2, D3, G3, B3, E4
  const GUITAR_STRINGS = [
    { name: 'e', openPitch: 4 },  // High E (4)
    { name: 'B', openPitch: 11 }, // B (11)
    { name: 'G', openPitch: 7 },  // G (7)
    { name: 'D', openPitch: 2 },  // D (2)
    { name: 'A', openPitch: 9 },  // A (9)
    { name: 'E', openPitch: 4 }   // Low E (4)
  ];

  const FRETS_COUNT = 12; // 0 (open) to 12

  // 2-Octave Piano Keys: C4 (0) to B5 (11)
  const PIANO_OCTAVES = [
    { note: 'C', isBlack: false, pitch: 0 },
    { note: 'C#', isBlack: true, pitch: 1 },
    { note: 'D', isBlack: false, pitch: 2 },
    { note: 'D#', isBlack: true, pitch: 3 },
    { note: 'E', isBlack: false, pitch: 4 },
    { note: 'F', isBlack: false, pitch: 5 },
    { note: 'F#', isBlack: true, pitch: 6 },
    { note: 'G', isBlack: false, pitch: 7 },
    { note: 'G#', isBlack: true, pitch: 8 },
    { note: 'A', isBlack: false, pitch: 9 },
    { note: 'A#', isBlack: true, pitch: 10 },
    { note: 'B', isBlack: false, pitch: 11 },
    // Octave 2
    { note: 'C', isBlack: false, pitch: 0 },
    { note: 'C#', isBlack: true, pitch: 1 },
    { note: 'D', isBlack: false, pitch: 2 },
    { note: 'D#', isBlack: true, pitch: 3 },
    { note: 'E', isBlack: false, pitch: 4 },
    { note: 'F', isBlack: false, pitch: 5 },
    { note: 'F#', isBlack: true, pitch: 6 },
    { note: 'G', isBlack: false, pitch: 7 },
    { note: 'G#', isBlack: true, pitch: 8 },
    { note: 'A', isBlack: false, pitch: 9 },
    { note: 'A#', isBlack: true, pitch: 10 },
    { note: 'B', isBlack: false, pitch: 11 }
  ];

  return (
    <div style={{
      background: '#f8fafc',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }}>
      {/* Tab Switcher & Active Chord Selection */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        {/* Instrument Selector Tabs */}
        <div style={{ display: 'inline-flex', background: '#e2e8f0', padding: '3px', borderRadius: '12px', gap: '2px' }}>
          {[
            { id: 'guitar', label: 'Gitarre', title: 'Griffbrett & Akkorde' },
            { id: 'piano', label: 'Klavier', title: 'Tastatur & Voicings' },
            { id: 'drums', label: 'Schlagzeug', title: 'Groove DNA & Feel' },
            { id: 'bass', label: 'Bass', title: 'Grundton & Linien' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              style={{
                border: 'none',
                background: activeTab === t.id ? '#ffffff' : 'transparent',
                color: activeTab === t.id ? '#0f172a' : '#64748b',
                fontWeight: activeTab === t.id ? 850 : 700,
                fontSize: '0.74rem',
                padding: '5px 12px',
                borderRadius: '9px',
                cursor: 'pointer',
                boxShadow: activeTab === t.id ? '0 2px 5px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.12s ease'
              }}
              title={t.title}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Chord Selector for Fretboard / Keyboard */}
        {(activeTab === 'guitar' || activeTab === 'piano' || activeTab === 'bass') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>Akkord:</span>
            <div style={{ display: 'inline-flex', gap: '4px' }}>
              {chords.map((c, idx) => (
                <button
                  key={`${c}-${idx}`}
                  type="button"
                  onClick={() => {
                    setSelectedChordIdx(idx);
                    try {
                      playAlongAudioEngine.playChordPad(c);
                    } catch {}
                  }}
                  style={{
                    border: selectedChordIdx === idx ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                    background: selectedChordIdx === idx ? '#eff6ff' : '#ffffff',
                    color: selectedChordIdx === idx ? '#1d4ed8' : '#334155',
                    fontWeight: 900,
                    fontSize: '0.76rem',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'monospace'
                  }}
                  className="hover-scale"
                  title={`Akkord ${c} auswählen & anhören`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: 🎸 GUITAR FRETBOARD */}
      {activeTab === 'guitar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>
              Griffbrett für <strong>{activeChord}</strong> ({chordInfo.notes.join(' · ')}):
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 750, color: '#7c3aed', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showPentatonicOverlay}
                onChange={(e) => setShowPentatonicOverlay(e.target.checked)}
              />
              <span>Pentatonik einblenden ({theory.scaleNotes.join(' · ')})</span>
            </label>
          </div>

          {/* Fretboard SVG / HTML Visualization */}
          <div style={{
            background: '#292524',
            borderRadius: '12px',
            padding: '10px 8px',
            overflowX: 'auto',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)'
          }}>
            {/* Frets marker numbers */}
            <div style={{ display: 'flex', paddingLeft: '24px', marginBottom: '4px' }}>
              {Array.from({ length: FRETS_COUNT + 1 }).map((_, f) => (
                <div key={f} style={{ flex: 1, textAlign: 'center', fontSize: '0.62rem', fontWeight: 900, color: (f === 3 || f === 5 || f === 7 || f === 9 || f === 12) ? '#fde047' : '#78716c', minWidth: '32px' }}>
                  {f === 0 ? 'Open' : f}
                </div>
              ))}
            </div>

            {/* 6 Strings */}
            {GUITAR_STRINGS.map((str, sIdx) => (
              <div
                key={sIdx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '24px',
                  position: 'relative',
                  borderBottom: sIdx < 5 ? '1px solid #44403c' : 'none'
                }}
              >
                {/* String Label */}
                <div style={{ width: '24px', fontSize: '0.72rem', fontWeight: 900, color: '#d6d3d1', textAlign: 'center', flexShrink: 0 }}>
                  {str.name}
                </div>

                {/* String wire line */}
                <div style={{
                  position: 'absolute',
                  left: '24px',
                  right: 0,
                  top: '11px',
                  height: `${1 + sIdx * 0.4}px`,
                  background: '#a8a29e',
                  zIndex: 1
                }} />

                {/* Frets for this string */}
                {Array.from({ length: FRETS_COUNT + 1 }).map((_, fret) => {
                  const pitch = (str.openPitch + fret) % 12;
                  const isChordRoot = pitch === chordInfo.rootPitch;
                  const isChordTone = chordInfo.pitchClasses.includes(pitch);
                  const isPentatonic = showPentatonicOverlay && theory.scaleNotes.some(n => PITCH_CLASSES[n.toUpperCase()] === pitch);

                  return (
                    <div
                      key={fret}
                      style={{
                        flex: 1,
                        minWidth: '32px',
                        height: '100%',
                        borderRight: fret === 0 ? '3px solid #e7e5e4' : '1.5px solid #57534e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        zIndex: 2
                      }}
                    >
                      {/* Note Dot Marker */}
                      {isChordRoot ? (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            try {
                              playAlongAudioEngine.playSingleNote(NOTE_NAMES[pitch]);
                            } catch {}
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              try { playAlongAudioEngine.playSingleNote(NOTE_NAMES[pitch]); } catch {}
                            }
                          }}
                          title={`Grundton ${chordInfo.root} (${NOTE_NAMES[pitch]}) auf Bund ${fret} anhören`}
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: '#16a34a',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            boxShadow: '0 0 6px rgba(34, 197, 94, 0.8)',
                            cursor: 'pointer'
                          }}
                          className="hover-scale"
                        >
                          {chordInfo.root}
                        </div>
                      ) : isChordTone ? (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            try {
                              playAlongAudioEngine.playSingleNote(NOTE_NAMES[pitch]);
                            } catch {}
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              try { playAlongAudioEngine.playSingleNote(NOTE_NAMES[pitch]); } catch {}
                            }
                          }}
                          title={`Akkordton ${NOTE_NAMES[pitch]} auf Bund ${fret} anhören`}
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: '#3b82f6',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.58rem',
                            fontWeight: 900,
                            cursor: 'pointer'
                          }}
                          className="hover-scale"
                        >
                          {chordInfo.notes[chordInfo.pitchClasses.indexOf(pitch)] || '•'}
                        </div>
                      ) : isPentatonic ? (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            try {
                              playAlongAudioEngine.playSingleNote(NOTE_NAMES[pitch]);
                            } catch {}
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              try { playAlongAudioEngine.playSingleNote(NOTE_NAMES[pitch]); } catch {}
                            }
                          }}
                          title={`Pentatonik Ton ${NOTE_NAMES[pitch]} auf Bund ${fret} anhören`}
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#a855f7',
                            opacity: 0.8,
                            cursor: 'pointer'
                          }}
                          className="hover-scale"
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a' }} />
              <strong>Grundton</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }} />
              <strong>Akkordtöne (Terz/Quinte)</strong>
            </span>
            {showPentatonicOverlay && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} />
                <strong>Pentatonik Solo-Töne</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: 🎹 PIANO KEYBOARD */}
      {activeTab === 'piano' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>
            Klavier-Voicing für <strong>{activeChord}</strong> (Töne: {chordInfo.notes.join(' · ')}):
          </div>

          <div style={{
            display: 'flex',
            position: 'relative',
            height: '110px',
            background: '#0f172a',
            borderRadius: '12px',
            padding: '4px 6px',
            overflowX: 'auto',
            userSelect: 'none'
          }}>
            {PIANO_OCTAVES.map((k, idx) => {
              const isChordRoot = k.pitch === chordInfo.rootPitch;
              const isChordTone = chordInfo.pitchClasses.includes(k.pitch);

              return (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    try {
                      playAlongAudioEngine.playSingleNote(k.note);
                    } catch {}
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      try { playAlongAudioEngine.playSingleNote(k.note); } catch {}
                    }
                  }}
                  title={`Taste ${k.note} anspielen`}
                  style={{
                    flex: k.isBlack ? 'none' : 1,
                    width: k.isBlack ? '18px' : 'auto',
                    minWidth: k.isBlack ? '18px' : '28px',
                    height: k.isBlack ? '65px' : '100px',
                    background: isChordRoot
                      ? '#16a34a'
                      : isChordTone
                        ? '#3b82f6'
                        : k.isBlack
                          ? '#1e293b'
                          : '#ffffff',
                    border: k.isBlack ? '1px solid #0f172a' : '1px solid #cbd5e1',
                    borderRadius: k.isBlack ? '0 0 4px 4px' : '0 0 6px 6px',
                    marginLeft: k.isBlack ? '-9px' : '0',
                    marginRight: k.isBlack ? '-9px' : '0',
                    zIndex: k.isBlack ? 3 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    paddingBottom: '6px',
                    color: (isChordRoot || isChordTone) ? '#ffffff' : (k.isBlack ? '#cbd5e1' : '#334155'),
                    boxShadow: k.isBlack ? '0 3px 6px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.06)',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '0.58rem', fontWeight: 900 }}>
                    {isChordRoot ? k.note : (isChordTone ? k.note : (!k.isBlack && k.note === 'C' ? 'C' : ''))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DRUMS GROOVE DNA */}
      {activeTab === 'drums' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '8px'
          }}>
            <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '10px 12px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase' }}>Beat & Feel</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#713f12', marginTop: '2px' }}>
                {safeSection.drumFeel || '8tel Rock Beat'}
              </div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', padding: '10px 12px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>Führungshand</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#1e3a8a', marginTop: '2px' }}>
                {safeSection.drumSurface || 'Offene Hi-Hat'}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Backbeat & Dynamik</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                {safeSection.drumBackbeat || 'Snare auf 2 & 4'} {safeSection.drumDynamics ? `• ${safeSection.drumDynamics}` : ''}
              </div>
            </div>
          </div>

          {safeSection.drumFill && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '6px 10px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: 800
            }}>
              <Zap size={13} style={{ color: '#991b1b', flexShrink: 0 }} />
              <span>{safeSection.drumFill}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BASS ROOT & WALKING BASS */}
      {activeTab === 'bass' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>
              Bass-Grundton für <strong>{activeChord}</strong>:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  try {
                    playAlongAudioEngine.playSingleNote(chordInfo.bass || chordInfo.root);
                  } catch {}
                }}
                title={`Grundton ${chordInfo.bass || chordInfo.root} anspielen`}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 950,
                  fontSize: '1.2rem',
                  padding: '6px 16px',
                  borderRadius: '10px',
                  fontFamily: 'monospace',
                  border: 'none',
                  cursor: 'pointer'
                }}
                className="hover-scale"
              >
                {chordInfo.bass || chordInfo.root}
              </button>
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 650 }}>
                Spiele diesen Ton auf der 1 und 3. Diatonische Verbindungstöne: {theory.fullScaleNotes.slice(0, 4).join(' → ')}.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Didactic Scaffolding "AHA!" Explanation Box */}
      <div style={{
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '12px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px'
      }}>
        <Sparkles size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.74rem', color: '#166534', lineHeight: '1.45' }}>
          <strong>Pädagogischer Tipp:</strong> Dieser Abschnitt steht in <strong>{theory.key}</strong> ({theory.characteristic}). Für Soli eignen sich die Töne der {theory.scaleName} ({theory.scaleNotes.join(' · ')}).
        </div>
      </div>
    </div>
  );
};
