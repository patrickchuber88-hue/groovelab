import React, { useState } from 'react';
import { Sparkles, Edit3, X, Check, ArrowRightLeft, Plus, Trash2, RotateCcw } from 'lucide-react';
import type { SongMeasure, SongSection } from '../SongStructureBar';
import { getDiatonicChordsForKey, detectKeyAndScale, transposeChords, parseChords, syncMeasures } from '../../utils/musicTheoryEngine';
import { playAlongAudioEngine } from '../../utils/songPlayAlongAudioEngine';

export interface SongChordGridEditorProps {
  section: SongSection;
  allChords?: string[];
  currentPlayAlongBar?: number;
  isPlayingAlong?: boolean;
  readOnly?: boolean;
  hidePresets?: boolean;
  hideTranspose?: boolean;
  onUpdateSection: (updated: SongSection) => void;
}

export const SongChordGridEditor: React.FC<SongChordGridEditorProps> = ({
  section,
  allChords = [],
  currentPlayAlongBar,
  isPlayingAlong = false,
  readOnly = false,
  hidePresets = false,
  hideTranspose = false,
  onUpdateSection
}) => {
  const safeSection: SongSection = section || { id: 'fallback', name: 'Strophe', barsCount: 4, bars: '4 Takte', chords: ['C'] };
  // Derive measure array from section (or synthesize from chords & bars)
  const barsCount = safeSection.barsCount || (safeSection.bars ? parseInt(safeSection.bars, 10) || 4 : 4);
  const safeChords = safeSection.chords && Array.isArray(safeSection.chords) && safeSection.chords.length > 0 ? safeSection.chords : ['C'];

  const measures: SongMeasure[] = React.useMemo(() => {
    return syncMeasures(barsCount, safeChords, safeSection.measures);
  }, [safeSection.measures, safeChords, barsCount]);

  // Detected key for smart chord suggestions
  const theory = React.useMemo(() => {
    return detectKeyAndScale(safeChords.length > 0 ? safeChords : (allChords && allChords.length > 0 ? allChords : ['C']));
  }, [safeChords, allChords]);

  const diatonicChords = React.useMemo(() => {
    return getDiatonicChordsForKey(theory.root, theory.mode);
  }, [theory.root, theory.mode]);

  // Modal / Picker State for a specific measure
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);
  const [customChordInput, setCustomChordInput] = useState<string>('');

  const handleSelectBar = (idx: number) => {
    if (readOnly) return;
    setSelectedBarIdx(idx);
    const m = measures[idx];
    setCustomChordInput(m?.chords?.join(' ') || '');
  };

  const handleApplyChordToBar = (chord: string) => {
    if (selectedBarIdx === null) return;
    try {
      playAlongAudioEngine.playChordPad(chord);
    } catch {}
    const newMeasures = [...measures];
    newMeasures[selectedBarIdx] = {
      ...newMeasures[selectedBarIdx],
      chords: [chord]
    };
    // Extract unique active chords across measures
    const newChordsList = Array.from(new Set(newMeasures.flatMap(m => m.chords)));
    onUpdateSection({
      ...section,
      measures: newMeasures,
      chords: newChordsList.length > 0 ? newChordsList : section.chords
    });
    setSelectedBarIdx(null);
  };

  const handleSaveCustomChords = () => {
    if (selectedBarIdx === null) return;
    const cleanChords = parseChords(customChordInput);
    const finalChords = cleanChords.length > 0 ? cleanChords : ['C'];
    const newMeasures = [...measures];
    newMeasures[selectedBarIdx] = {
      ...newMeasures[selectedBarIdx],
      chords: finalChords
    };
    const newChordsList = Array.from(new Set(newMeasures.flatMap(m => m.chords)));
    onUpdateSection({
      ...section,
      measures: newMeasures,
      chords: newChordsList.length > 0 ? newChordsList : section.chords
    });
    setSelectedBarIdx(null);
  };

  // Quick 4-Chord Fill Progression across the entire section
  const handleApplyProgression = (prog: string[]) => {
    const newMeasures = measures.map((m, idx) => ({
      ...m,
      chords: [prog[idx % prog.length]]
    }));
    onUpdateSection({
      ...section,
      measures: newMeasures,
      chords: prog
    });
  };

  // Transpose this section
  const handleTranspose = (semitones: number) => {
    const transposedChords = transposeChords(section.chords, semitones);
    const newMeasures = measures.map(m => ({
      ...m,
      chords: transposeChords(m.chords, semitones)
    }));
    onUpdateSection({
      ...section,
      measures: newMeasures,
      chords: transposedChords
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top Bar: Grid Header & Quick Progression Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Takt-Matrix ({measures.length} Takte):
          </span>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
            Klick auf einen Takt zum Ändern
          </span>
        </div>

        {/* Transposition & Quick Progressions */}
        {!readOnly && !hideTranspose && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>Transponieren:</span>
            <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: '8px', padding: '1px', border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                onClick={() => handleTranspose(-1)}
                title="1 Halbton tiefer (-1)"
                style={{ border: 'none', background: 'transparent', padding: '3px 7px', fontSize: '0.72rem', fontWeight: 850, cursor: 'pointer', color: '#334155' }}
              >
                ♭ -1
              </button>
              <button
                type="button"
                onClick={() => handleTranspose(1)}
                title="1 Halbton höher (+1)"
                style={{ border: 'none', background: 'transparent', padding: '3px 7px', fontSize: '0.72rem', fontWeight: 850, cursor: 'pointer', color: '#334155' }}
              >
                ♯ +1
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4-Chord Quick Progressions Preset Bar */}
      {!readOnly && !hidePresets && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', flexShrink: 0 }}>
            Presets:
          </span>
          {[
            { label: 'Pop Hit (I-V-vi-IV)', chords: theory.mode === 'minor' ? ['Em', 'C', 'G', 'D'] : ['C', 'G', 'Am', 'F'] },
            { label: 'Epic Minor (i-VI-III-VII)', chords: ['Am', 'F', 'C', 'G'] },
            { label: 'Jazz Turnaround (ii-V-I)', chords: ['Dm7', 'G7', 'Cmaj7', 'A7'] },
            { label: 'Rock Standard (I-IV-V)', chords: ['E', 'A', 'B', 'E'] }
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleApplyProgression(preset.chords)}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '3px 8px',
                fontSize: '0.68rem',
                fontWeight: 750,
                color: '#475569',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.12s ease'
              }}
              className="hover-scale"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* The Responsive 4-Bar Phrasing Measure Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: measures.length % 4 === 0 ? 'repeat(4, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(90px, 1fr))',
        gap: '8px'
      }}>
        {measures.map((m, idx) => {
          const isBarPlaying = isPlayingAlong && currentPlayAlongBar === m.barNumber;
          const isSelected = selectedBarIdx === idx;

          return (
            <div
              key={m.id || idx}
              role="button"
              tabIndex={0}
              onClick={() => handleSelectBar(idx)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectBar(idx);
                }
              }}
              aria-label={`Takt ${m.barNumber}: Akkord ${m.chords.join(' ')}`}
              style={{
                background: isBarPlaying
                  ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
                  : isSelected
                    ? '#eff6ff'
                    : '#f8fafc',
                border: isBarPlaying
                  ? '2px solid #16a34a'
                  : isSelected
                    ? '2px solid #3b82f6'
                    : '1.5px solid #cbd5e1',
                borderRadius: '12px',
                padding: '8px 6px',
                textAlign: 'center',
                cursor: readOnly ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
                transform: isBarPlaying ? 'scale(1.05)' : 'none',
                boxShadow: isBarPlaying
                  ? '0 4px 14px rgba(22, 163, 74, 0.25)'
                  : '0 1px 3px rgba(0,0,0,0.02)',
                position: 'relative'
              }}
            >
              {/* Bar Number Badge */}
              <div style={{
                fontSize: '0.62rem',
                fontWeight: 850,
                color: isBarPlaying ? '#15803d' : '#94a3b8',
                marginBottom: '2px'
              }}>
                Takt {m.barNumber}
              </div>

              {/* Chords in this measure */}
              <div style={{
                fontSize: m.chords.length > 1 ? '0.88rem' : '1.05rem',
                fontWeight: 950,
                color: isBarPlaying ? '#14532d' : '#0f172a',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                letterSpacing: '-0.02em',
                lineHeight: '1.2'
              }}>
                {m.chords.join(' ')}
              </div>

              {/* Active bounce dot during play-along */}
              {isBarPlaying && (
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#16a34a',
                  border: 'none',
                  boxShadow: 'none'
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Smart Chord Picker Popover / Inline Modal */}
      {selectedBarIdx !== null && (
        <div
          role="region"
          aria-label={`Akkordauswahl für Takt ${selectedBarIdx + 1}`}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1.5px solid #93c5fd',
            boxShadow: 'none',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="#2563eb" />
              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>
                Akkord für Takt {selectedBarIdx + 1} wählen:
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedBarIdx(null)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Diatonic Chord Palette */}
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
              Diatonische Stufen für {theory.key}:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {diatonicChords.map((d) => {
                const isTonic = d.functionType === 'tonic';
                const isSub = d.functionType === 'subdominant';
                const bg = isTonic ? '#ecfdf5' : isSub ? '#fefce8' : '#faf5ff';
                const border = isTonic ? '#a7f3d0' : isSub ? '#fde047' : '#e9d5ff';
                const textColor = isTonic ? '#047857' : isSub ? '#854d0e' : '#7e22ce';

                return (
                  <button
                    key={d.chord}
                    type="button"
                    onClick={() => handleApplyChordToBar(d.chord)}
                    style={{
                      background: bg,
                      border: `1.5px solid ${border}`,
                      borderRadius: '10px',
                      padding: '6px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease'
                    }}
                    className="hover-scale"
                    title={d.roleLabel}
                  >
                    <span style={{ fontSize: '0.95rem', fontWeight: 950, color: textColor, fontFamily: 'monospace' }}>
                      {d.chord}
                    </span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: textColor, opacity: 0.85 }}>
                      {d.degree}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Chord Input Field */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={customChordInput}
              onChange={(e) => setCustomChordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveCustomChords();
                }
              }}
              placeholder="Eigener Akkord (z.B. G/B, Dsus4, Am7)"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 800,
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={handleSaveCustomChords}
              style={{
                border: 'none',
                background: '#2563eb',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Übernehmen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
