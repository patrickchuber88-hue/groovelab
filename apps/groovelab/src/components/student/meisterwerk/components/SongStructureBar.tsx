import React, { useState } from 'react';
import { Plus, Pin, Trash2, Sparkles, Check } from 'lucide-react';

export interface SongSection {
  id: string;
  name: string;           // e.g. "Intro", "Strophe", "Refrain", "Bridge", "Solo", "Outro"
  bars?: string;          // e.g. "Takt 1–8" or "8 Takte"
  isHomeworkFocus?: boolean; // 📌 Focus of current week
  chords: string[];       // e.g. ["Em", "C", "G", "D"]
  drumFeel?: string;      // e.g. "8tel Rock"
  drumSurface?: string;   // e.g. "Offene Hi-Hat"
  drumBackbeat?: string;  // e.g. "Snare auf 2 & 4, Kick auf 1 & 3+"
  drumDynamics?: string;  // e.g. "f (Laut)"
  drumFill?: string;      // e.g. "⚡ 2-Takt Roll in Takt 8"
}

export interface SongStructureBarProps {
  sections: SongSection[];
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  onAddSection: (name: string) => void;
  onToggleFocus: (id: string) => void;
  onDeleteSection?: (id: string) => void;
  readOnly?: boolean;
}

export const SECTION_COLOR_MAP: Record<string, { bg: string; border: string; text: string; activeBg: string }> = {
  'Intro': { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', activeBg: '#e2e8f0' },
  'Strophe': { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', activeBg: '#dbeafe' },
  'Verse': { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', activeBg: '#dbeafe' },
  'Refrain': { bg: '#fefce8', border: '#fde047', text: '#854d0e', activeBg: '#fef08a' },
  'Chorus': { bg: '#fefce8', border: '#fde047', text: '#854d0e', activeBg: '#fef08a' },
  'Bridge': { bg: '#faf5ff', border: '#e9d5ff', text: '#7e22ce', activeBg: '#f3e8ff' },
  'Solo': { bg: '#fff1f2', border: '#fecdd3', text: '#be123c', activeBg: '#ffe4e6' },
  'Outro': { bg: '#f8fafc', border: '#cbd5e1', text: '#334155', activeBg: '#e2e8f0' }
};

export const getSectionColors = (name: string) => {
  for (const key of Object.keys(SECTION_COLOR_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return SECTION_COLOR_MAP[key];
    }
  }
  return { bg: '#f8fafc', border: '#e2e8f0', text: '#334155', activeBg: '#f1f5f9' };
};

export const SongStructureBar: React.FC<SongStructureBarProps> = ({
  sections,
  activeSectionId,
  onSelectSection,
  onAddSection,
  onToggleFocus,
  onDeleteSection,
  readOnly = false
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const QUICK_TEMPLATES = ['Intro', 'Strophe', 'Refrain', 'Bridge', 'Solo', 'Outro'];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      overflowX: 'auto',
      padding: '4px 2px',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      {/* Label: Song-Architektur */}
      <span style={{
        fontSize: '0.74rem',
        fontWeight: 900,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        flexShrink: 0,
        marginRight: '2px'
      }}>
        Ablauf:
      </span>

      {/* Sections Pills */}
      {sections.map((sec) => {
        const isActive = sec.id === activeSectionId;
        const colors = getSectionColors(sec.name);

        return (
          <div
            key={sec.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectSection(sec.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectSection(sec.id);
              }
            }}
            aria-pressed={isActive}
            aria-label={`Abschnitt ${sec.name}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '12px',
              background: isActive ? colors.activeBg : colors.bg,
              border: isActive ? `2px solid ${colors.text}` : `1.5px solid ${colors.border}`,
              color: colors.text,
              fontSize: '0.82rem',
              fontWeight: isActive ? 900 : 750,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isActive ? 'scale(1.02)' : 'none',
              boxShadow: isActive ? '0 3px 8px rgba(0,0,0,0.06)' : 'none',
              position: 'relative'
            }}
          >
            <span>{sec.name}</span>
            {sec.bars && (
              <span style={{ fontSize: '0.68rem', opacity: 0.75, fontWeight: 700 }}>
                ({sec.bars})
              </span>
            )}

            {/* Focus Pin Badge */}
            {sec.isHomeworkFocus && (
              <span
                title="Aktueller Hausaufgaben-Fokus"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#16a34a',
                  color: '#ffffff',
                  borderRadius: '10px',
                  padding: '1px 5px',
                  fontSize: '0.64rem',
                  fontWeight: 900,
                  marginLeft: '2px'
                }}
              >
                <span>📌 Fokus</span>
              </span>
            )}

            {/* Quick delete for custom sections if active & not readOnly */}
            {!readOnly && isActive && sections.length > 1 && onDeleteSection && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSection(sec.id);
                }}
                title="Abschnitt entfernen"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: '2px'
                }}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        );
      })}

      {/* Add Section Button */}
      {!readOnly && (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '12px',
              border: '1.5px dashed #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Neuen Song-Abschnitt anfügen"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Teil</span>
          </button>

          {/* Quick Dropdown Menu */}
          {showAddMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                zIndex: 30,
                minWidth: '130px'
              }}
            >
              {QUICK_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl}
                  type="button"
                  onClick={() => {
                    onAddSection(tmpl);
                    setShowAddMenu(false);
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 750,
                    color: '#1e293b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  className="hover-bg-slate"
                >
                  <span>+ {tmpl}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
