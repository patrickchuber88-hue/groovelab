import React from 'react';
import { DidacticFocusItem, DIDACTIC_FOCUS_LIST } from './wochenfahrplanTypes';

export interface WochenFahrplanDidaktikChipsProps {
  mode?: 'badge' | 'interactive';
  activeItems?: DidacticFocusItem[];
  dictatedText?: string;
  onToggleFocus?: (focus: DidacticFocusItem) => void;
  style?: React.CSSProperties;
}

export const WochenFahrplanDidaktikChips: React.FC<WochenFahrplanDidaktikChipsProps> = ({
  mode = 'badge',
  activeItems = [],
  dictatedText = '',
  onToggleFocus,
  style
}) => {
  // Wenn im Readonly-Badge-Modus: zeige nur die aktiven Items kompakt
  if (mode === 'badge') {
    if (activeItems.length === 0) return null;

    return (
      <div
        role="group"
        aria-label="Didaktische Schwerpunkte"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '5px',
          ...style
        }}
      >
        {activeItems.map((item) => (
          <span
            key={item.id}
            title={`${item.label}: ${item.subtitle}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '8px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              lineHeight: 1.3
            }}
          >
            <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{item.icon}</span>
            <span>{item.label}</span>
          </span>
        ))}
      </div>
    );
  }

  // Interaktiver Modus (für Schnellmodal & Editor)
  const isFocusActive = (focus: DidacticFocusItem): boolean => {
    if (activeItems.some(i => i.id === focus.id)) return true;
    const lower = dictatedText.toLowerCase();
    return (
      lower.includes(focus.phrase.toLowerCase()) ||
      lower.includes(`fokus: ${focus.label.toLowerCase()}`) ||
      lower.includes(focus.label.toLowerCase()) ||
      focus.keywords.some(kw => lower.includes(kw.toLowerCase()))
    );
  };

  return (
    <div
      role="group"
      aria-label="Didaktische Schwerpunkte auswählen"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '6px',
        width: '100%',
        ...style
      }}
    >
      {DIDACTIC_FOCUS_LIST.map((focus) => {
        const active = isFocusActive(focus);
        return (
          <button
            key={focus.id}
            type="button"
            onClick={() => onToggleFocus && onToggleFocus(focus)}
            title={`${focus.label}: ${focus.subtitle}`}
            aria-label={`${focus.label}: ${focus.subtitle}`}
            aria-pressed={active}
            style={{
              padding: '8px 4px',
              borderRadius: '12px',
              border: active ? '1.5px solid #10b981' : '1px solid #e2e8f0',
              background: active ? '#ecfdf5' : '#ffffff',
              color: active ? '#059669' : '#334155',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              minHeight: '48px',
              boxShadow: active ? '0 2px 6px rgba(16, 185, 129, 0.14)' : '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.12s ease'
            }}
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{focus.icon}</span>
            <span style={{ fontSize: '0.68rem', fontWeight: active ? 850 : 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              {focus.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
