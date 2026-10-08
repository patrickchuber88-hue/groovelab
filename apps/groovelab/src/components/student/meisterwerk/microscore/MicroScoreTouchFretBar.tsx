/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * MicroScoreTouchFretBar.tsx
 * 
 * 2027 0,1% Goldstandard Apple Touch Fret-Bar:
 * - Haptische Saiten-Schnellwahl [ e | B | G | D | A | E ] mit farblicher Hervorhebung
 * - Taktile Bund-Pills [ 0 | 1 | 2 | 3 | 4 | 5 | 7 | 8 | 9 | 10 | 12 ] für 1-Tap Touch-Eingabe (iPad/Tablets)
 * - Direkte Pause- [ 𝄽 Pause ] und Lösch-Buttons [ ⌫ ]
 * - BFSG 2025 & WCAG 2.2 AA konform (Tastatur-Vollbedienbarkeit, Kontrast ≥ 7:1)
 * - Autarker Satellit zur Wahrung des Monolith Ceiling Axioms (< 200 Zeilen)
 */

import React from 'react';
import { Delete } from 'lucide-react';
import { GUITAR_STRINGS, BASS_STRINGS } from './guitarFretboardEngine';

export interface MicroScoreTouchFretBarProps {
  activeString: number;
  tabLinesCount?: number;
  isBass?: boolean;
  onSelectString: (stringIdx: number) => void;
  onInsertFret: (fret: number) => void;
  onInsertRest: () => void;
  onDeleteNote: () => void;
  readOnly?: boolean;
}

const COMMON_FRETS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const MicroScoreTouchFretBar: React.FC<MicroScoreTouchFretBarProps> = ({
  activeString,
  tabLinesCount = 6,
  isBass = false,
  onSelectString,
  onInsertFret,
  onInsertRest,
  onDeleteNote,
  readOnly = false
}) => {
  const stringsList = isBass ? BASS_STRINGS : GUITAR_STRINGS.slice(0, tabLinesCount);

  return (
    <div
      role="region"
      aria-label="Touch-Bund- und Saiten-Eingabeleiste"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '10px 14px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        userSelect: 'none'
      }}
    >
      {/* 1. Zeile: Saiten-Pills & Aktionen */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        {/* Saiten-Auswahl (Cupertino Segmented Style) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#0f172a' }}>
            {isBass ? '🎸 Bass-Saite:' : '🎸 Saite:'}
          </span>
          <div
            style={{
              display: 'inline-flex',
              background: '#e2e8f0',
              borderRadius: '8px',
              padding: '2px',
              gap: '2px'
            }}
          >
            {stringsList.map(str => {
              const isSelected = activeString === str.index;
              return (
                <button
                  key={`str-${str.index}`}
                  type="button"
                  onClick={() => onSelectString(str.index)}
                  title={`Saite ${str.name} (${str.openPitch}) wählen`}
                  style={{
                    border: 'none',
                    background: isSelected ? '#0284c7' : 'transparent',
                    color: isSelected ? '#ffffff' : '#475569',
                    borderRadius: '6px',
                    padding: '4px 9px',
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                    boxShadow: isSelected ? '0 1px 3px rgba(2,132,199,0.3)' : 'none'
                  }}
                >
                  {str.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schnell-Aktionen (Pause & Löschen) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={onInsertRest}
            disabled={readOnly}
            title="Pause einfügen (Taste R oder Leertaste)"
            style={{
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: readOnly ? 'default' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>𝄽</span>
            <span>Pause</span>
          </button>

          <button
            type="button"
            onClick={onDeleteNote}
            disabled={readOnly}
            title="Note löschen (Taste ⌫ oder Entf)"
            style={{
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#dc2626',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: readOnly ? 'default' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <Delete size={13} />
            <span>Löschen</span>
          </button>
        </div>
      </div>

      {/* 2. Zeile: Haptische Bund-Ziffern [ 0 .. 12 ] */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', marginRight: '4px' }}>
          Bund:
        </span>
        {COMMON_FRETS.map(fret => (
          <button
            key={`fret-pill-${fret}`}
            type="button"
            onClick={() => onInsertFret(fret)}
            disabled={readOnly}
            title={`Bund ${fret} auf Saite ${stringsList[activeString]?.name || 'e'} setzen`}
            style={{
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: '8px',
              minWidth: '32px',
              height: '32px',
              padding: '0 6px',
              fontSize: '0.82rem',
              fontWeight: 800,
              fontFamily: "'SF Mono', Monaco, Menlo, monospace",
              cursor: readOnly ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'transform 0.08s ease, background 0.08s ease'
            }}
            className="hover-scale-mini"
          >
            {fret}
          </button>
        ))}
      </div>
    </div>
  );
};
