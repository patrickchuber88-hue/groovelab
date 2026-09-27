import React, { useState } from 'react';
import { Sparkles, Pin, Music, Drum, Edit2, Check, X, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import type { SongSection } from './SongStructureBar';
import { detectKeyAndScale, syncMeasures } from '../utils/musicTheoryEngine';
import { SongChordGridEditor } from './songArchitecture/SongChordGridEditor';
import { SongInstrumentPedagogyView } from './songArchitecture/SongInstrumentPedagogyView';

export interface SongSectionCardProps {
  section: SongSection;
  allChords?: string[];
  studentInstrument?: string;
  isProLevel?: boolean;
  readOnly?: boolean;
  currentPlayAlongBar?: number;
  isPlayingAlong?: boolean;
  onUpdateSection?: (updated: SongSection) => void;
  onToggleHomeworkFocus?: () => void;
}

export const SongSectionCard: React.FC<SongSectionCardProps> = ({
  section,
  allChords = [],
  studentInstrument = 'Gitarre',
  isProLevel = false,
  readOnly = false,
  currentPlayAlongBar,
  isPlayingAlong = false,
  onUpdateSection,
  onToggleHomeworkFocus
}) => {
  const isDrums = /schlagzeug|drum|percussion/i.test(studentInstrument);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editedName, setEditedName] = useState(section.name);
  const [editedBars, setEditedBars] = useState(section.bars || '8 Takte');
  const [editedRepetitions, setEditedRepetitions] = useState<number>(section.repetitions || 1);
  const [editedDrumFeel, setEditedDrumFeel] = useState(section.drumFeel || '8tel Rock');
  const [editedDrumSurface, setEditedDrumSurface] = useState(section.drumSurface || 'Offene Hi-Hat');
  const [editedDrumFill, setEditedDrumFill] = useState(section.drumFill || '');
  const [showInstrumentsView, setShowInstrumentsView] = useState<boolean>(true);

  // Automatic music theory detection
  const safeChords = section?.chords && Array.isArray(section.chords) && section.chords.length > 0 ? section.chords : (allChords && allChords.length > 0 ? allChords : ['C']);
  const theory = detectKeyAndScale(safeChords);

  const handleSaveMetadata = () => {
    if (!onUpdateSection) return;
    const barsNum = parseInt(editedBars, 10) || 8;
    onUpdateSection({
      ...section,
      name: editedName.trim() || section?.name || 'Formteil',
      bars: `${barsNum} Takte`,
      barsCount: barsNum,
      repetitions: editedRepetitions,
      measures: syncMeasures(barsNum, safeChords, section?.measures),
      drumFeel: editedDrumFeel.trim() || undefined,
      drumSurface: editedDrumSurface.trim() || undefined,
      drumFill: editedDrumFill.trim() || undefined
    });
    setIsEditingMetadata(false);
  };

  const reps = section.repetitions && section.repetitions > 1 ? section.repetitions : 1;
  const displayBars = section.barsCount ? `${section.barsCount} Takte` : (section.bars || '8 Takte');

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '20px 24px',
        border: section.isHomeworkFocus ? '2px solid #86efac' : '1px solid #cbd5e1',
        boxShadow: section.isHomeworkFocus
          ? '0 6px 20px rgba(34, 197, 94, 0.15)'
          : '0 4px 16px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'all 0.25s ease'
      }}
    >
      {/* 1. Header Row: Section Name + Repetitions + Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '1.15rem',
            fontWeight: 950,
            color: '#0f172a'
          }}>
            {isDrums ? <Drum size={20} color="#f59e0b" /> : <Music size={20} color="#6366f1" />}
            <span>{section.name}</span>
          </span>

          <span style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#475569',
            background: '#f1f5f9',
            padding: '3px 10px',
            borderRadius: '10px'
          }}>
            {displayBars}
          </span>

          {reps > 1 && (
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 900,
              background: '#e0e7ff',
              color: '#3730a3',
              padding: '2px 8px',
              borderRadius: '8px',
              border: '1px solid #c7d2fe'
            }}>
              {reps}× Wiederholen
            </span>
          )}

          {section.isHomeworkFocus && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: 850,
              background: '#dcfce7',
              color: '#15803d',
              border: '1px solid #86efac',
              padding: '2px 8px',
              borderRadius: '99px'
            }}>
              <span>📌 Hausaufgaben-Fokus</span>
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!readOnly && onToggleHomeworkFocus && (
            <button
              type="button"
              onClick={onToggleHomeworkFocus}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '10px',
                border: section.isHomeworkFocus ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                background: section.isHomeworkFocus ? '#f0fdf4' : '#ffffff',
                color: section.isHomeworkFocus ? '#16a34a' : '#475569',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Als Hausaufgaben-Fokus für diese Woche markieren"
            >
              <Pin size={13} />
              <span>{section.isHomeworkFocus ? 'Fokus aktiv' : 'Als Fokus setzen'}</span>
            </button>
          )}

          {!readOnly && onUpdateSection && !isEditingMetadata && (
            <button
              type="button"
              onClick={() => {
                setEditedName(section.name);
                setEditedBars(displayBars);
                setEditedRepetitions(section.repetitions || 1);
                setIsEditingMetadata(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#475569',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Edit2 size={13} />
              <span>Details</span>
            </button>
          )}
        </div>
      </div>

      {/* Metadata Inline Edit Drawer */}
      {isEditingMetadata && (
        <div style={{
          background: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '16px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Name des Formteils:
              </label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Taktanzahl:
              </label>
              <input
                type="text"
                value={editedBars}
                onChange={(e) => setEditedBars(e.target.value)}
                placeholder="8 Takte"
                style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Wiederholungen:
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 4].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEditedRepetitions(r)}
                    style={{
                      border: editedRepetitions === r ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                      background: editedRepetitions === r ? '#eff6ff' : '#ffffff',
                      color: editedRepetitions === r ? '#1d4ed8' : '#334155',
                      fontWeight: 900,
                      padding: '5px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    {r}×
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsEditingMetadata(false)}
              style={{ border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', padding: '6px 14px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSaveMetadata}
              style={{ border: 'none', background: '#16a34a', color: '#ffffff', padding: '6px 16px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}
            >
              Speichern
            </button>
          </div>
        </div>
      )}

      {/* 2. Interactive Measure-by-Measure Chord Grid */}
      <SongChordGridEditor
        section={section}
        allChords={allChords}
        currentPlayAlongBar={currentPlayAlongBar}
        isPlayingAlong={isPlayingAlong}
        readOnly={readOnly}
        onUpdateSection={(updated) => {
          if (onUpdateSection) onUpdateSection(updated);
        }}
      />

      {/* 3. Magic Solo, Jamming & Music Theory Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        background: '#faf5ff',
        border: '1.5px solid #f3e8ff',
        padding: '12px 16px',
        borderRadius: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Sparkles size={16} color="#9333ea" />
          <span style={{ fontSize: '0.8rem', fontWeight: 850, color: '#7e22ce' }}>
            Solo & Jammen:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {theory.scaleNotes.map((note, idx) => (
              <span
                key={note}
                style={{
                  background: idx === 0 ? '#9333ea' : '#ffffff',
                  color: idx === 0 ? '#ffffff' : '#581c87',
                  border: '1px solid #d8b4fe',
                  borderRadius: '6px',
                  padding: '2px 7px',
                  fontSize: '0.82rem',
                  fontWeight: 950,
                  fontFamily: 'monospace'
                }}
              >
                {note}
              </span>
            ))}
            <span
              style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px dashed #93c5fd',
                borderRadius: '6px',
                padding: '2px 7px',
                fontSize: '0.82rem',
                fontWeight: 950,
                fontFamily: 'monospace'
              }}
              title="Blue Note (b5 / #4)"
            >
              {theory.blueNote}
            </span>
          </div>

          <span style={{ fontSize: '0.74rem', color: '#9333ea', fontWeight: 750 }}>
            ({theory.scaleName})
          </span>
        </div>

        {/* Degrees & Diatonic Fit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.72rem',
            color: '#6b21a8',
            fontWeight: 850,
            background: '#f3e8ff',
            padding: '3px 8px',
            borderRadius: '8px'
          }}>
            Stufen: {theory.degrees}
          </span>

          <span style={{
            fontSize: '0.72rem',
            color: '#15803d',
            fontWeight: 850,
            background: '#dcfce7',
            padding: '3px 8px',
            borderRadius: '8px'
          }}>
            Tonart: {theory.key} ({theory.diatonicFitScore}% fit)
          </span>

          {/* Toggle Button for Instrument Pedagogy View */}
          <button
            type="button"
            onClick={() => setShowInstrumentsView(!showInstrumentsView)}
            style={{
              border: '1px solid #d8b4fe',
              background: '#ffffff',
              color: '#7e22ce',
              borderRadius: '8px',
              padding: '3px 8px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>{showInstrumentsView ? 'Instrumente verbergen' : 'Instrumente anzeigen'}</span>
            {showInstrumentsView ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* 4. Instrument-Adaptive Views: Guitar Fretboard, Piano Keyboard, Drums DNA, Bass */}
      {showInstrumentsView && (
        <SongInstrumentPedagogyView
          section={section}
          studentInstrument={studentInstrument}
        />
      )}
    </div>
  );
};
