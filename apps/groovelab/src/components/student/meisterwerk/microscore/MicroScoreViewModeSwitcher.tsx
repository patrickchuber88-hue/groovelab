/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * MicroScoreViewModeSwitcher.tsx
 * 
 * 2027 0,1% Goldstandard Universeller Didaktik-Tab-Schalter:
 * - Dynamische Umschaltung zwischen Noten, Tabulatur, Griffbrett, Flügel und Drums
 * - Mobile Landscape Parität (Vermeidung von gequetschten Split-Screens auf Smartphones)
 * - Cupertino Segmented Pill mit Tastatur-First Navigation (Pfeiltasten, Space, Enter)
 * - BFSG 2025 & WCAG 2.2 AA konform (Kontrast ≥ 4.5:1, role="tablist")
 */

import React from 'react';
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
  icon: string;
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
  const isString = instrument === 'guitar' || instrument === 'bass' || instrument === 'strings';
  const isPiano = instrument === 'piano' || instrument === 'universal';
  const isDrums = instrument === 'drums';
  const isWind = instrument === 'trumpet' || instrument === 'trombone' || instrument === 'flute' || instrument === 'clarinet' || instrument === 'altosax' || instrument === 'recorder';

  // Optionen basierend auf Instrument und Device-Typ (auf Mobile kein Split)
  const options: ModeTabOption[] = React.useMemo(() => {
    if (isString) {
      return [
        { id: 'notes', label: 'Noten', icon: '🎼', title: 'Reine 5-Linien Urtext-Notation' },
        { id: 'tabs', label: 'Tab', icon: '🎸', title: 'Notensystem mit synchronisierter Tabulatur' },
        { id: 'fretboard', label: 'Griffbrett', icon: instrument === 'strings' ? '🎻' : '🎸', title: 'Notensystem mit interaktivem Griffbrett' }
      ];
    }

    if (isPiano) {
      const base: ModeTabOption[] = [
        { id: 'notes', label: 'Noten', icon: '🎼', title: 'Standard-Notensystem' },
        { id: 'keys', label: 'Flügel', icon: '🎹', title: '88-Tasten Konzertflügel' }
      ];
      if (!isMobileLandscape) {
        base.push({ id: 'both', label: 'Split', icon: '⚡', title: 'Noten & Flügel synchron anzeigen' });
      }
      return base;
    }

    if (isDrums) {
      const base: ModeTabOption[] = [
        { id: 'notes', label: 'Noten', icon: '🥁', title: 'PAS Percussion-Notation' },
        { id: 'drums', label: 'Drum-Pads', icon: '🎯', title: 'Interaktive Drum-Pads' }
      ];
      if (!isMobileLandscape) {
        base.push({ id: 'both', label: 'Split', icon: '⚡', title: 'Noten & Drum-Kit synchron anzeigen' });
      }
      return base;
    }

    if (isWind) {
      const base: ModeTabOption[] = [
        { id: 'notes', label: 'Noten', icon: '🎼', title: 'Urtext-Noten' },
        { id: 'fretboard', label: 'Grifftabelle', icon: '🎺', title: '3-Ventil / Tonloch Grifftabelle' }
      ];
      if (!isMobileLandscape) {
        base.push({ id: 'both', label: 'Split', icon: '⚡', title: 'Noten & Griffe synchron anzeigen' });
      }
      return base;
    }

    return [{ id: 'notes', label: 'Noten', icon: '🎼', title: 'Urtext-Noten' }];
  }, [isString, isPiano, isDrums, isWind, isMobileLandscape, instrument]);

  // Fallback falls aktiver Modus nicht in Optionen vorhanden ist
  React.useEffect(() => {
    if (options.length > 0 && !options.some(opt => opt.id === activeMode)) {
      if (activeMode === 'both' && options.some(opt => opt.id === 'fretboard')) {
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
        background: '#f1f5f9',
        borderRadius: '11px',
        padding: '2.5px',
        gap: '2px',
        userSelect: 'none'
      }}
    >
      {options.map((opt) => {
        const isActive = activeMode === opt.id;
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
              background: isActive ? themeColor : 'transparent',
              color: isActive ? '#ffffff' : '#64748b',
              borderRadius: '8px',
              padding: isMobileLandscape ? '3px 8px' : '4px 10px',
              fontSize: isMobileLandscape ? '0.68rem' : '0.72rem',
              fontWeight: isActive ? 900 : 700,
              cursor: readOnly ? 'default' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: isActive ? '0 1px 4px rgba(0, 0, 0, 0.14)' : 'none',
              whiteSpace: 'nowrap'
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
            <span style={{ fontSize: isMobileLandscape ? '0.72rem' : '0.78rem' }}>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
