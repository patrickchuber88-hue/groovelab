import React, { useState } from 'react';
import { Plus, Pin, Trash2, Copy, ChevronLeft, ChevronRight, Wand2 } from 'lucide-react';

export interface SongMeasure {
  id: string;
  barNumber: number;          // 1, 2, 3, 4...
  chords: string[];           // e.g. ["Em"] or ["Em", "C"]
  rhythmFeel?: string;        // e.g. "Straight", "Syncopated"
  isAccent?: boolean;
}

export interface SongSection {
  id: string;
  name: string;               // e.g. "Intro", "Strophe", "Refrain", "Bridge", "Solo", "Outro"
  bars?: string;              // e.g. "8 Takte"
  barsCount?: number;         // e.g. 4, 8, 12, 16
  repetitions?: number;       // e.g. 1, 2, 3, 4
  measures?: SongMeasure[];   // Explicit measure-by-measure grid
  isHomeworkFocus?: boolean;  // 📌 Focus of current week
  chords: string[];           // e.g. ["Em", "C", "G", "D"]
  drumFeel?: string;          // e.g. "8tel Rock"
  drumSurface?: string;       // e.g. "Offene Hi-Hat"
  drumBackbeat?: string;      // e.g. "Snare auf 2 & 4"
  drumDynamics?: string;      // e.g. "f (Laut)"
  drumFill?: string;          // e.g. "⚡ 2-Takt Roll in Takt 8"
  notes?: string;             // Didactic teacher/student note
}

export interface SongStructureBarProps {
  sections: SongSection[];
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  onAddSection: (name: string) => void;
  onToggleFocus: (id: string) => void;
  onDeleteSection?: (id: string) => void;
  onDuplicateSection?: (id: string) => void;
  onMoveSection?: (id: string, direction: 'left' | 'right') => void;
  onOpenWizard?: () => void;
  readOnly?: boolean;
}

export const SECTION_COLOR_MAP: Record<string, { bg: string; border: string; text: string; activeBg: string; badgeBg: string }> = {
  'Intro': { bg: '#f1f5f9', border: '#cbd5e1', text: '#334155', activeBg: '#e2e8f0', badgeBg: '#94a3b8' },
  'Strophe': { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', activeBg: '#dbeafe', badgeBg: '#3b82f6' },
  'Verse': { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', activeBg: '#dbeafe', badgeBg: '#3b82f6' },
  'Pre-Chorus': { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', activeBg: '#ffedd5', badgeBg: '#f97316' },
  'Refrain': { bg: '#fefce8', border: '#fde047', text: '#854d0e', activeBg: '#fef08a', badgeBg: '#eab308' },
  'Chorus': { bg: '#fefce8', border: '#fde047', text: '#854d0e', activeBg: '#fef08a', badgeBg: '#eab308' },
  'Bridge': { bg: '#faf5ff', border: '#e9d5ff', text: '#7e22ce', activeBg: '#f3e8ff', badgeBg: '#a855f7' },
  'Solo': { bg: '#fff1f2', border: '#fecdd3', text: '#be123c', activeBg: '#ffe4e6', badgeBg: '#f43f5e' },
  'Outro': { bg: '#f8fafc', border: '#cbd5e1', text: '#334155', activeBg: '#e2e8f0', badgeBg: '#64748b' },
  'Interlude': { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', activeBg: '#dcfce7', badgeBg: '#22c55e' }
};

export const getSectionColors = (name?: string | null) => {
  const safeName = typeof name === 'string' ? name.toLowerCase() : '';
  for (const key of Object.keys(SECTION_COLOR_MAP)) {
    if (safeName.includes(key.toLowerCase())) {
      return SECTION_COLOR_MAP[key];
    }
  }
  return { bg: '#f8fafc', border: '#e2e8f0', text: '#334155', activeBg: '#f1f5f9', badgeBg: '#64748b' };
};

export const SongStructureBar: React.FC<SongStructureBarProps> = ({
  sections,
  activeSectionId,
  onSelectSection,
  onAddSection,
  onToggleFocus,
  onDeleteSection,
  onDuplicateSection,
  onMoveSection,
  onOpenWizard,
  readOnly = false
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const QUICK_TEMPLATES = ['Intro', 'Strophe', 'Pre-Chorus', 'Refrain', 'Bridge', 'Solo', 'Outro'];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      flexWrap: 'wrap'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        padding: '4px 2px',
        maxWidth: '100%',
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
        {sections.map((sec, idx) => {
          const isActive = sec.id === activeSectionId;
          const colors = getSectionColors(sec.name);
          const reps = sec.repetitions && sec.repetitions > 1 ? sec.repetitions : 1;
          const displayBars = sec.barsCount ? `${sec.barsCount} Takte` : (sec.bars || '4 Takte');

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
              aria-label={`Abschnitt ${sec.name} (${displayBars}${reps > 1 ? `, ${reps} Mal wiederholt` : ''})`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '14px',
                background: isActive ? colors.activeBg : colors.bg,
                border: isActive ? `2px solid ${colors.text}` : `1.5px solid ${colors.border}`,
                color: colors.text,
                fontSize: '0.82rem',
                fontWeight: isActive ? 900 : 750,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isActive ? 'scale(1.02)' : 'none',
                boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                position: 'relative'
              }}
            >
              <span>{sec.name}</span>

              {/* Bars Count Badge */}
              <span style={{ fontSize: '0.68rem', opacity: 0.8, fontWeight: 700 }}>
                ({displayBars})
              </span>

              {/* Repetition Multiplier Badge (e.g. 2x, 3x) */}
              {reps > 1 && (
                <span
                  title={`${reps}-mal wiederholen`}
                  style={{
                    background: colors.badgeBg,
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '1px 5px',
                    fontSize: '0.64rem',
                    fontWeight: 900,
                    letterSpacing: '0.02em'
                  }}
                >
                  {reps}×
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

              {/* Active controls: Move left/right, Duplicate, Delete */}
              {!readOnly && isActive && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '4px' }}>
                  {onMoveSection && idx > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSection(sec.id, 'left');
                      }}
                      title="Nach links verschieben"
                      style={{
                        background: 'rgba(255,255,255,0.7)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        padding: '2px',
                        color: colors.text,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <ChevronLeft size={11} />
                    </button>
                  )}

                  {onMoveSection && idx < sections.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSection(sec.id, 'right');
                      }}
                      title="Nach rechts verschieben"
                      style={{
                        background: 'rgba(255,255,255,0.7)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        padding: '2px',
                        color: colors.text,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <ChevronRight size={11} />
                    </button>
                  )}

                  {onDuplicateSection && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateSection(sec.id);
                      }}
                      title="Formteil duplizieren"
                      style={{
                        background: 'rgba(255,255,255,0.7)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        padding: '2px',
                        color: colors.text,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Copy size={11} />
                    </button>
                  )}

                  {sections.length > 1 && onDeleteSection && (
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
                        alignItems: 'center'
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add Section Button & Dropdown */}
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
                  minWidth: '140px'
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

      {/* Right side: 2027 Song-Baukasten (Wizard) Launcher Button */}
      {!readOnly && onOpenWizard && (
        <button
          type="button"
          onClick={onOpenWizard}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '12px',
            border: '1.5px solid #6366f1',
            background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
            color: '#4338ca',
            fontSize: '0.78rem',
            fontWeight: 850,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 6px rgba(99, 102, 241, 0.15)',
            flexShrink: 0
          }}
          className="hover-scale"
          title="Schritt-für-Schritt Song-Architektur Baukasten öffnen"
        >
          <Wand2 size={13} strokeWidth={2.5} />
          <span>✨ Baukasten-Wizard</span>
        </button>
      )}
    </div>
  );
};
