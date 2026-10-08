/**
 * 🏛️ Campus-Groovelab Didaktik-Textbausteine Dock (Aufgabenheft / Meisterwerk)
 * DidacticTextbausteineDock.tsx
 * 
 * 0,1% Goldstandard Autarker Satellit:
 * - Kapselt die dynamische Einbindung der 18 didaktischen Lehrplan-Bausteine der Schule
 * - Beseitigt die statischen 8 PRESET_CHIPS zugunsten der echten SSOT (campus_textbausteine_${schoolId})
 * - Bietet 4 Kategorie-Filter-Pills: Alle, 🥁 Rhythmus, 🎹 Technik, 🎭 Ausdruck
 * - 1-Tap Toggle mit aktiver Häkchen-Indikation und Tone-in-Tone Design
 * - Monolith Ceiling Schutz: Entlastet MeisterwerkDocumentTab.tsx durch Netto-Schrumpfung
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sparkles, Check, Clock, Zap } from 'lucide-react';
import {
  fetchSchoolTextbausteine,
  getTextbausteinCategoryTheme,
  TEXTBAUSTEIN_CATEGORY_THEMES,
  Textbaustein
} from '../../../../services/textbausteineService';

export interface DidacticTextbausteineDockProps {
  schoolId?: string | number;
  activeViewingStudentNotes: string;
  onTogglePresetChip: (chip: { label: string; text: string; isBpm?: boolean }, e?: React.MouseEvent) => void;
  fallbackChips?: { label: string; text: string; isBpm?: boolean }[];
}

export const DidacticTextbausteineDock: React.FC<DidacticTextbausteineDockProps> = ({
  schoolId,
  activeViewingStudentNotes = '',
  onTogglePresetChip,
  fallbackChips = []
}) => {
  const [selectedCat, setSelectedCat] = useState<'all' | 'rhythm' | 'technique' | 'performance'>('all');
  const [bausteine, setBausteine] = useState<Textbaustein[]>(() => fetchSchoolTextbausteine(schoolId));

  const reloadBausteine = useCallback(() => {
    setBausteine(fetchSchoolTextbausteine(schoolId));
  }, [schoolId]);

  useEffect(() => {
    reloadBausteine();
  }, [reloadBausteine]);

  // Cross-Tab & Storage Event Listener für Live-Synchronisation
  useEffect(() => {
    const handleUpdate = () => reloadBausteine();
    window.addEventListener('campus_textbausteine_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('campus_textbausteine_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [reloadBausteine]);

  const activeBausteine = useMemo(() => {
    return bausteine.filter(tb => tb.active !== false);
  }, [bausteine]);

  const counts = useMemo(() => {
    return {
      all: activeBausteine.length,
      rhythm: activeBausteine.filter(tb => tb.category === 'rhythm').length,
      technique: activeBausteine.filter(tb => tb.category === 'technique').length,
      performance: activeBausteine.filter(tb => tb.category === 'performance').length
    };
  }, [activeBausteine]);

  const displayedBausteine = useMemo(() => {
    if (selectedCat === 'all') return activeBausteine;
    return activeBausteine.filter(tb => tb.category === selectedCat);
  }, [activeBausteine, selectedCat]);

  return (
    <div 
      style={{
        padding: '10px 16px',
        background: '#f8fafc',
        borderTop: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Oberzeile: Label & Kategorie-Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }} className="hide-scrollbar">
        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={11} color="#64748b" />
          <span>Vorlagen ({counts.all}):</span>
        </span>

        <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
          {[
            { id: 'all', label: `Alle (${counts.all})`, icon: null },
            { id: 'rhythm', label: `Rhythmus (${counts.rhythm})`, icon: Clock },
            { id: 'technique', label: `Technik (${counts.technique})`, icon: Zap },
            { id: 'performance', label: `Ausdruck (${counts.performance})`, icon: Sparkles }
          ].map(cat => {
            const isSel = selectedCat === cat.id;
            const theme = cat.id !== 'all' ? TEXTBAUSTEIN_CATEGORY_THEMES[cat.id] : null;
            const CatIcon = cat.icon;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id as any)}
                style={{
                  padding: '3px 9px',
                  borderRadius: '100px',
                  border: isSel && theme ? `1px solid ${theme.border}` : '1px solid #e2e8f0',
                  background: isSel ? (theme ? theme.badgeBg : '#0f172a') : '#ffffff',
                  color: isSel ? (theme ? theme.text : '#ffffff') : '#64748b',
                  fontSize: '0.68rem',
                  fontWeight: isSel ? 800 : 650,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                {CatIcon && <CatIcon size={11} strokeWidth={2.2} />}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Unterzeile: Schnell-Bausteine Chips */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)',
          maskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)'
        }} 
        className="hide-scrollbar"
      >
        {displayedBausteine.map((tb) => {
          const theme = getTextbausteinCategoryTheme(tb.category);
          const isBpm = tb.id === 'r2' || (tb.text || '').toLowerCase().includes('bpm');
          const isActive = isBpm
            ? (activeViewingStudentNotes || '').toLowerCase().includes('bpm')
            : (activeViewingStudentNotes || '').includes(tb.text);

          const cleanLabel = (tb.label || '').replace(/^[\p{Emoji}\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u, '').trim();

          return (
            <button
              key={tb.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => onTogglePresetChip({ label: cleanLabel, text: tb.text, isBpm }, e)}
              style={{
                flexShrink: 0,
                background: isActive ? theme.badgeBg : theme.bg,
                color: theme.text,
                border: isActive ? `1.5px solid ${theme.accent}` : `1px solid ${theme.border}`,
                padding: '4px 11px',
                borderRadius: '100px',
                fontSize: '0.73rem',
                fontWeight: isActive ? 800 : 650,
                cursor: 'pointer',
                boxShadow: isActive ? `0 1px 4px ${theme.glow}` : '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              className="hover-scale-mini"
              title={tb.text}
            >
              {isActive ? (
                <Check size={11} color={theme.accent} strokeWidth={3} />
              ) : null}
              <span>{cleanLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DidacticTextbausteineDock;
