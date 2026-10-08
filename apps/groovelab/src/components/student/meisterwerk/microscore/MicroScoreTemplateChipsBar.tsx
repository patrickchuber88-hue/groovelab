/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * MicroScoreTemplateChipsBar.tsx
 * 
 * 2027 0,1% Goldstandard Schnellvorlagen- & VdM-Presets-Leiste:
 * - Horizontale Quick-Title Chips (Rhythmus-Drill, Tonleiter C-Dur, etc.)
 * - Kanonische VdM Drum Vorlagen (Rock-Beat, Disco-Funk, etc.)
 * - Autarker Satellit zur Wahrung des Monolith Ceiling Axioms (< 150 Zeilen)
 * - BFSG 2025 & WCAG 2.2 AA konform
 */

import React from 'react';
import { MicroScoreInstrument } from './microScore.types';
import { VDM_DRUM_PRESETS, VdmDrumPreset, QUICK_TITLE_CHIPS } from './vdmDrumPresets';

export interface MicroScoreTemplateChipsBarProps {
  instrument: MicroScoreInstrument;
  currentTitle: string;
  onSelectDrumPreset: (preset: VdmDrumPreset) => void;
  onSelectTitleChip: (title: string) => void;
  readOnly?: boolean;
}

export const MicroScoreTemplateChipsBar: React.FC<MicroScoreTemplateChipsBarProps> = ({
  instrument,
  currentTitle,
  onSelectDrumPreset,
  onSelectTitleChip,
  readOnly = false
}) => {
  if (readOnly) return null;

  const isDrums = instrument === 'drums';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        paddingTop: '4px',
        animation: 'fadeIn 0.2s ease'
      }}
      className="hide-scrollbar"
    >
      <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {isDrums ? '🥁 VdM Drum Vorlagen:' : 'Vorlagen:'}
      </span>
      {isDrums ? (
        VDM_DRUM_PRESETS.map(preset => {
          const isSelected = currentTitle === preset.title;
          return (
            <button
              key={preset.title}
              type="button"
              onClick={() => onSelectDrumPreset(preset)}
              title={preset.description}
              style={{
                border: '1px solid #cbd5e1',
                background: isSelected ? '#0f172a' : '#ffffff',
                color: isSelected ? '#ffffff' : '#475569',
                borderRadius: '99px',
                padding: '3px 12px',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>🥁</span>
              <span>{preset.title.split(' (')[0]}</span>
              <span style={{ opacity: 0.65, fontSize: '0.60rem' }}>{preset.bpm} BPM</span>
            </button>
          );
        })
      ) : (
        QUICK_TITLE_CHIPS.map(chip => {
          const isSelected = currentTitle === chip;
          return (
            <button
              key={chip}
              type="button"
              onClick={() => onSelectTitleChip(chip)}
              style={{
                border: '1px solid #cbd5e1',
                background: isSelected ? '#0f172a' : '#ffffff',
                color: isSelected ? '#ffffff' : '#475569',
                borderRadius: '99px',
                padding: '2px 10px',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {chip}
            </button>
          );
        })
      )}
    </div>
  );
};
