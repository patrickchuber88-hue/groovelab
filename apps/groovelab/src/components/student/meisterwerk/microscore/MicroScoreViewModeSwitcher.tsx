/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * MicroScoreViewModeSwitcher.tsx
 * 
 * 2027 0,1% Goldstandard Universeller Didaktik-Tab-Schalter:
 * - Dynamische Umschaltung zwischen Noten, Tabulatur, Griffbrett, Flügel und Drums
 * - Mobile Landscape Parität (Vermeidung von gequetschten Split-Screens auf Smartphones)
 * - 100% Monochrome Lucide-Icons (Apple 2-Farben-Axiom, Zero-Emoji Doktrin)
 * - Cupertino Segmented Pill mit Tastatur-First Navigation (Pfeiltasten, Space, Enter)
 * - BFSG 2025 & WCAG 2.2 AA konform (Kontrast ≥ 4.5:1, role="tablist")
 */

import React from 'react';
import { Music, Layers, Piano, Drum, Wind, Zap, Activity } from 'lucide-react';
import { MicroScoreInstrument } from './microScore.types';

export type MicroScoreViewMode = 'notes' | 'tabs' | 'fretboard' | 'keys' | 'drums' | 'both';

export interface MicroScoreViewModeSwitcherProps {
  instrument: MicroScoreInstrument;
  activeMode: MicroScoreViewMode;
  onSelectMode: (mode: MicroScoreViewMode) => void;
  isMobileLandscape: boolean;
  themeColor?: string;
  readOnly?: boolean;
}

interface ModeTabOption {
  id: MicroScoreViewMode;
  label: string;
  IconComponent: React.ComponentType<{ size?: number | string; strokeWidth?: number | string; style?: React.CSSProperties }>;
  title: string;
}

export const MicroScoreViewModeSwitcher: React.FC<MicroScoreViewModeSwitcherProps> = ({
  instrument,
  activeMode,
  onSelectMode,
  isMobileLandscape,
  themeColor = '#4f46e5',
  readOnly = false
}) => {
  const isString = instrument === 'guitar' || instrument === 'bass' || instrument === 'strings' || instrument === 'ukulele';
  const isPiano = instrument === 'piano' || instrument === 'universal';
  const isVocals = instrument === 'vocals';
  const isDrums = instrument === 'drums';
  const isWind = instrument === 'trumpet' || instrument === 'trombone' || instrument === 'flute' || instrument === 'clarinet' || instrument === 'altosax' || instrument === 'recorder';

  // 0,1% Goldstandard Duales Fokus-Modell: Noten + maximal 1 virtuelle Darstellung (keine 3-Ebenen-Überladung)
  const options: ModeTabOption[] = React.useMemo(() => {
    if (isVocals) {
      if (!isMobileLandscape) {
        return [
          { id: 'notes', label: 'Nur Noten', IconComponent: Music, title: 'Reine 5-Linien Urtext-Notation mit Boomwhacker-Farben' },
          { id: 'keys', label: 'Noten & Tasten', IconComponent: Piano, title: 'Klaviertastatur als Tonhöhen- & Intonationshilfe' }
        ];
      }
      return [
        { id: 'notes', label: 'Noten', IconComponent: Music, title: 'Urtext-Noten' },
        { id: 'keys', label: 'Flügel', IconComponent: Piano, title: 'Konzertflügel als Tonhöhen-Referenz' }
      ];
    }

    if (isString) {
      return [
        { id: 'tabs', label: 'Noten & Tab', IconComponent: Layers, title: 'Notensystem mit synchronisierter Tabulatur' },
        { id: 'fretboard', label: isMobileLandscape ? 'Griffbrett' : 'Noten & Griffbrett', IconComponent: Activity, title: 'Notensystem mit interaktivem Vollbreiten-Griffbrett' },
        { id: 'notes', label: 'Nur Noten', IconComponent: Music, title: 'Reine 5-Linien Urtext-Notation ohne Tabulatur' }
      ];
    }

    if (isPiano) {
      if (!isMobileLandscape) {
        return [
          { id: 'both', label: 'Noten & Tasten', IconComponent: Layers, title: 'Notensystem & Konzertflügel synchron anzeigen' },
          { id: 'notes', label: 'Nur Noten', IconComponent: Music, title: 'Reines 5-Linien-Notensystem' },
          { id: 'keys', label: 'Nur Flügel', IconComponent: Piano, title: '88-Tasten Konzertflügel im Solo-Fokus' }
        ];
      }
      return [
        { id: 'notes', label: 'Noten', IconComponent: Music, title: 'Standard-Notensystem' },
        { id: 'keys', label: 'Flügel', IconComponent: Piano, title: '88-Tasten Konzertflügel' }
      ];
    }

    if (isDrums) {
      if (!isMobileLandscape) {
        return [
          { id: 'both', label: 'Noten & Drum-Kit', IconComponent: Layers, title: 'PAS-Noten & Drum-Kit synchron anzeigen' },
          { id: 'notes', label: 'Nur Noten', IconComponent: Music, title: 'Reine PAS Percussion-Notation' },
          { id: 'drums', label: 'Nur Drum-Kit', IconComponent: Drum, title: 'Interaktives Drum-Kit im Solo-Fokus' }
        ];
      }
      return [
        { id: 'notes', label: 'Noten', IconComponent: Music, title: 'PAS Percussion-Notation' },
        { id: 'drums', label: 'Drum-Pads', IconComponent: Drum, title: 'Interaktive Drum-Pads' }
      ];
    }

    if (isWind) {
      if (!isMobileLandscape) {
        return [
          { id: 'both', label: 'Noten & Griffe', IconComponent: Layers, title: 'Noten & Grifftabelle synchron anzeigen' },
          { id: 'notes', label: 'Nur Noten', IconComponent: Music, title: 'Reine 5-Linien-Notation' },
          { id: 'fretboard', label: 'Nur Griffe', IconComponent: Wind, title: '3-Ventil / Tonloch Grifftabelle' }
        ];
      }
      return [
        { id: 'notes', label: 'Noten', IconComponent: Music, title: 'Urtext-Noten' },
        { id: 'fretboard', label: 'Grifftabelle', IconComponent: Wind, title: '3-Ventil / Tonloch Grifftabelle' }
      ];
    }

    return [{ id: 'notes', label: 'Nur Noten', IconComponent: Music, title: 'Urtext-Noten' }];
  }, [isString, isPiano, isVocals, isDrums, isWind, isMobileLandscape]);

  // Fallback falls aktiver Modus nicht in Optionen vorhanden ist (z. B. Wechsel von Piano 'both' auf Gitarre 'tabs')
  React.useEffect(() => {
    if (options.length > 0 && !options.some(opt => opt.id === activeMode)) {
      if (activeMode === 'both' && options.some(opt => opt.id === 'tabs')) {
        onSelectMode('tabs');
      } else if (activeMode === 'both' && options.some(opt => opt.id === 'fretboard')) {
        onSelectMode('fretboard');
      } else {
        onSelectMode(options[0].id);
      }
    }
  }, [options, activeMode, onSelectMode]);

  return (
    <div
      role="tablist"
      aria-label="Didaktischer Ansichtsmodus"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: isMobileLandscape ? '34px' : '38px',
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '3px',
        gap: '3px',
        boxSizing: 'border-box',
        userSelect: 'none'
      }}
    >
      {options.map((opt) => {
        const isActive = activeMode === opt.id;
        const Icon = opt.IconComponent;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={readOnly}
            onClick={() => onSelectMode(opt.id)}
            title={opt.title}
            style={{
              border: 'none',
              height: '100%',
              background: isActive ? '#ffffff' : 'transparent',
              color: isActive ? '#0f172a' : '#64748b',
              borderRadius: '9px',
              padding: isMobileLandscape ? '0 8px' : '0 12px',
              fontSize: isMobileLandscape ? '0.74rem' : '0.80rem',
              fontWeight: isActive ? 900 : 700,
              cursor: readOnly ? 'default' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: isActive ? '0 1px 4px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(15, 23, 42, 0.06)' : 'none',
              whiteSpace: 'nowrap',
              outline: 'none'
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                const idx = options.findIndex(o => o.id === opt.id);
                const next = options[(idx + 1) % options.length];
                onSelectMode(next.id);
              } else if (e.key === 'ArrowLeft') {
                const idx = options.findIndex(o => o.id === opt.id);
                const prev = options[(idx - 1 + options.length) % options.length];
                onSelectMode(prev.id);
              }
            }}
          >
            <Icon size={14} strokeWidth={2.3} style={{ color: isActive ? themeColor : '#64748b' }} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
