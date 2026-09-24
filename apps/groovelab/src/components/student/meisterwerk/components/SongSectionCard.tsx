import React, { useState } from 'react';
import { Sparkles, Pin, Music, Drum, Edit2, Check, X } from 'lucide-react';
import type { SongSection } from './SongStructureBar';
import { detectKeyAndScale } from '../utils/musicTheoryEngine';

export interface SongSectionCardProps {
  section: SongSection;
  studentInstrument?: string;
  isProLevel?: boolean;
  readOnly?: boolean;
  onUpdateSection?: (updated: SongSection) => void;
  onToggleHomeworkFocus?: () => void;
}

export const SongSectionCard: React.FC<SongSectionCardProps> = ({
  section,
  studentInstrument = 'Gitarre',
  isProLevel = false,
  readOnly = false,
  onUpdateSection,
  onToggleHomeworkFocus
}) => {
  const isDrums = /schlagzeug|drum|percussion/i.test(studentInstrument);
  const [isEditing, setIsEditing] = useState(false);
  const [editedChords, setEditedChords] = useState(section.chords.join(' '));
  const [editedBars, setEditedBars] = useState(section.bars || '');
  const [editedDrumFeel, setEditedDrumFeel] = useState(section.drumFeel || '8tel Rock');
  const [editedDrumSurface, setEditedDrumSurface] = useState(section.drumSurface || 'Offene Hi-Hat');
  const [editedDrumFill, setEditedDrumFill] = useState(section.drumFill || '');

  // Calculate Key and Scale automatically
  const theoryInfo = detectKeyAndScale(section.chords);

  const handleSaveEdit = () => {
    if (!onUpdateSection) return;
    const cleanChords = editedChords
      .replace(/[,\-/|]/g, ' ')
      .split(/\s+/)
      .map(c => c.trim())
      .filter(Boolean)
      .map(c => c.charAt(0).toUpperCase() + c.slice(1));

    onUpdateSection({
      ...section,
      chords: cleanChords.length > 0 ? cleanChords : section.chords,
      bars: editedBars.trim() || undefined,
      drumFeel: editedDrumFeel.trim() || undefined,
      drumSurface: editedDrumSurface.trim() || undefined,
      drumFill: editedDrumFill.trim() || undefined
    });
    setIsEditing(false);
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '16px 20px',
        border: section.isHomeworkFocus ? '2px solid #86efac' : '1px solid #e2e8f0',
        boxShadow: section.isHomeworkFocus
          ? '0 4px 18px rgba(34, 197, 94, 0.12)'
          : '0 2px 10px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.25s ease'
      }}
    >
      {/* Header Row: Section Name + Measures + Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '1rem',
            fontWeight: 900,
            color: '#0f172a'
          }}>
            {isDrums ? <Drum size={18} color="#f59e0b" /> : <Music size={18} color="#6366f1" />}
            <span>{section.name}</span>
          </span>

          {section.bars && (
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 750,
              color: '#64748b',
              background: '#f1f5f9',
              padding: '2px 8px',
              borderRadius: '8px'
            }}>
              {section.bars}
            </span>
          )}

          {section.isHomeworkFocus && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.68rem',
              fontWeight: 850,
              background: '#dcfce7',
              color: '#15803d',
              border: '1px solid #86efac',
              padding: '2px 7px',
              borderRadius: '99px'
            }}>
              <span>📌 Hausaufgaben-Fokus</span>
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!readOnly && onToggleHomeworkFocus && (
            <button
              type="button"
              onClick={onToggleHomeworkFocus}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '10px',
                border: section.isHomeworkFocus ? '1px solid #86efac' : '1px solid #cbd5e1',
                background: section.isHomeworkFocus ? '#f0fdf4' : '#ffffff',
                color: section.isHomeworkFocus ? '#16a34a' : '#475569',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Als Hausaufgaben-Fokus für diese Woche markieren"
            >
              <Pin size={12} />
              <span>{section.isHomeworkFocus ? 'Fokus aktiv' : 'Als Fokus setzen'}</span>
            </button>
          )}

          {!readOnly && onUpdateSection && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#475569',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Edit2 size={12} />
              <span>Bearbeiten</span>
            </button>
          )}
        </div>
      </div>

      {/* EDIT MODE (Quick, simple, no clutter) */}
      {isEditing ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: '#f8fafc',
          padding: '12px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: '160px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '3px' }}>
                Akkorde (z. B. Em C G D):
              </label>
              <input
                type="text"
                value={editedChords}
                onChange={(e) => setEditedChords(e.target.value)}
                placeholder="Em C G D"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '100px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '3px' }}>
                Takte (z. B. Takt 1–8):
              </label>
              <input
                type="text"
                value={editedBars}
                onChange={(e) => setEditedBars(e.target.value)}
                placeholder="8 Takte"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {isDrums && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '3px' }}>
                  Drum-Groove & Feel:
                </label>
                <input
                  type="text"
                  value={editedDrumFeel}
                  onChange={(e) => setEditedDrumFeel(e.target.value)}
                  placeholder="8tel Rock"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '3px' }}>
                  Führungshand / Becken:
                </label>
                <input
                  type="text"
                  value={editedDrumSurface}
                  onChange={(e) => setEditedDrumSurface(e.target.value)}
                  placeholder="Offene Hi-Hat"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.76rem',
                fontWeight: 750,
                cursor: 'pointer'
              }}
            >
              <X size={12} />
              <span>Abbrechen</span>
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 14px',
                borderRadius: '8px',
                border: 'none',
                background: '#16a34a',
                color: '#ffffff',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Check size={12} />
              <span>Speichern</span>
            </button>
          </div>
        </div>
      ) : isDrums ? (
        /* ========================================================================= */
        /* 🥁 0.1% GOLDSTANDARD FOR DRUM STUDENTS (Clean, clear 3-fact formula)     */
        /* ========================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '8px'
          }}>
            {/* Fact 1: Groove & Feel */}
            <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '8px 12px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase' }}>Beat & Feel</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#713f12', marginTop: '2px' }}>
                {section.drumFeel || '8tel Rock Beat'}
              </div>
            </div>

            {/* Fact 2: Führungshand / Becken */}
            <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', padding: '8px 12px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>Führungshand</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#1e3a8a', marginTop: '2px' }}>
                {section.drumSurface || 'Offene Hi-Hat'}
              </div>
            </div>

            {/* Fact 3: Backbeat & Dynamik */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Backbeat & Dynamik</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                {section.drumBackbeat || 'Snare auf 2 & 4'} {section.drumDynamics ? `• ${section.drumDynamics}` : ''}
              </div>
            </div>
          </div>

          {/* Optional Drum Fill Alert */}
          {section.drumFill && (
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
              <span>⚡</span>
              <span>{section.drumFill}</span>
            </div>
          )}

          {/* Subtle Band Chord Context */}
          {section.chords && section.chords.length > 0 && (
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
              <span>Band-Harmonie zur Orientierung: </span>
              <span style={{ fontWeight: 850, color: '#334155' }}>{section.chords.join(' · ')}</span>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* 🎸 0.1% GOLDSTANDARD FOR GUITAR, PIANO, BASS & VOCALS                     */
        /* ========================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Large, Beautiful Chord Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {section.chords.map((chord, idx) => (
              <div
                key={`${chord}-${idx}`}
                style={{
                  minWidth: '54px',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.03)',
                  textAlign: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 950,
                  color: '#0f172a',
                  letterSpacing: '-0.01em',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
                }}
              >
                {chord}
              </div>
            ))}
          </div>

          {/* Magic Solo & Jamming Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            background: '#faf5ff',
            border: '1px solid #f3e8ff',
            padding: '8px 12px',
            borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="#9333ea" />
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#7e22ce' }}>
                Solo & Jammen:
              </span>
              <span style={{
                fontSize: '0.84rem',
                fontWeight: 900,
                color: '#581c87',
                letterSpacing: '0.02em'
              }}>
                {theoryInfo.scaleNotes.join(' · ')}
              </span>
              <span style={{ fontSize: '0.74rem', color: '#9333ea', fontWeight: 700 }}>
                ({theoryInfo.scaleName})
              </span>
            </div>

            {/* Pro Level Degree Notation */}
            {isProLevel && (
              <span style={{ fontSize: '0.72rem', color: '#6b21a8', fontWeight: 800, background: '#f3e8ff', padding: '2px 7px', borderRadius: '6px' }}>
                Stufen: {theoryInfo.degrees} • Tonart: {theoryInfo.key}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
