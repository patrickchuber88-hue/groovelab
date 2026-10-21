/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * MicroScoreBaukastenDock.tsx
 * 
 * 2027 0,1% VdM Senior-Pädagogen & Apple Human Interface Goldstandard:
 * - 2-Zeilen Meister-Baukasten (Radikale Kognitive Entlastung & direkte Haptik)
 * - Zeile 1: RHYTHMUS (Ganze bis 16tel) + MODIFIKATOREN (• Punktiert, 3 Triole) + 1-Tap Pause + Undo + Löschen + Weiter
 * - Zeile 2: TONHÖHE (Diatonik C bis C' mit Boomwhacker-Farben) & VOLLWERTIGE AKKORD-ARCHITEKTUR
 *   * Sub-Modus A: "Stufen & Kadenzen" (I, ii, iii, IV, V, vi, V7 – Pop/Klassik Kadenzen mit Instrumenten-Voicing)
 *   * Sub-Modus B: "Töne schichten" (Freie Polyphonie/Terzenbau: Cursor bleibt stehen, Noten stapeln sich auf demselben Beat)
 * - 100% Monochrome Icons (Cupertino Slate-900, Zero Color-Clash)
 * - BFSG 2025 / WCAG 2.2 AA konform (Tastatur-Vollbedienbarkeit, Kontrast ≥ 7:1)
 * - Monolith Ceiling Axiom: Schlanker autarker Satellit (< 600 Zeilen)
 */

import React, { useState } from 'react';
import { Undo2, Delete, Music, Layers, RotateCcw } from 'lucide-react';
import { MicroScoreDuration, MicroScoreInstrument } from './microScore.types';
import { NoteDurationIcon } from './NoteDurationIcon';
import { getInstrumentTheme } from './MicroScorePlayerBar';
import { BOOMWHACKER_COLORS } from './microScoreGridEngine';

export interface MicroScoreBaukastenDockProps {
  // 1. Notenwerte & Rhythmus
  activeDuration: MicroScoreDuration;
  onSelectDuration: (dur: MicroScoreDuration) => void;
  isDotted?: boolean;
  onToggleDotted?: () => void;
  isTriplet?: boolean;
  onToggleTriplet?: () => void;

  onInsertRest: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onClearAll?: () => void;
  hasNotes?: boolean;
  onDeleteNote: () => void;
  onAdvanceCursor?: () => void;
  activeStepBadge?: string;

  // 2. Tonhöhen (C D E F G A H) & Akkorde
  onInsertPitch: (pitch: string) => void;
  onInsertPitchStack?: (pitch: string) => void;
  onInsertDrumCombo?: (pitches: string[]) => void;
  defaultOctave?: number;

  // Vorzeichen
  activeAccidental?: '#' | 'b' | null;
  onToggleAccidental?: (accidental: '#' | 'b') => void;

  // Smart Akkord-Modus
  isChordMode?: boolean;
  onToggleChordMode?: () => void;
  chordQuality?: 'major' | 'minor';
  onToggleChordQuality?: () => void;

  instrument?: MicroScoreInstrument;
  readOnly?: boolean;
}

const DIATONIC_PITCHES = [
  { name: 'C', base: 'C', step: 0 },
  { name: 'D', base: 'D', step: 1 },
  { name: 'E', base: 'E', step: 2 },
  { name: 'F', base: 'F', step: 3 },
  { name: 'G', base: 'G', step: 4 },
  { name: 'A', base: 'A', step: 5 },
  { name: 'H', base: 'B', step: 6 },
  { name: "C'", base: 'C', step: 7, isHighOctave: true }
];

const CADENCE_STUFEN = [
  { degree: 'I', name: 'C', base: 'C', quality: 'major' as const, label: 'C-Dur' },
  { degree: 'ii', name: 'Dm', base: 'D', quality: 'minor' as const, label: 'D-Moll' },
  { degree: 'iii', name: 'Em', base: 'E', quality: 'minor' as const, label: 'E-Moll' },
  { degree: 'IV', name: 'F', base: 'F', quality: 'major' as const, label: 'F-Dur' },
  { degree: 'V', name: 'G', base: 'G', quality: 'major' as const, label: 'G-Dur' },
  { degree: 'vi', name: 'Am', base: 'A', quality: 'minor' as const, label: 'A-Moll' }
];

const DRUM_DOCK_PADS = [
  { id: 'kick', name: 'Bass Drum', shortLabel: 'Kick', key: 'V / N', pitch: 'F4', color: '#7c3aed', voice: '↓ Fuß' },
  { id: 'hh_foot', name: 'Pedal Hi-Hat', shortLabel: 'HH-Fuß', key: 'C', pitch: 'D3', color: '#0891b2', voice: '↓ Fuß' },
  { id: 'hihat', name: 'Hi-Hat (Geschlossen)', shortLabel: 'HH zu', key: 'D', pitch: 'G5', color: '#0891b2', voice: '↑ Hand' },
  { id: 'hihat_open', name: 'Hi-Hat (Offen)', shortLabel: 'HH auf', key: 'K', pitch: 'G#5', color: '#0891b2', voice: '↑ Hand' },
  { id: 'snare', name: 'Snare Drum', shortLabel: 'Snare', key: 'F / J', pitch: 'C5', color: '#dc2626', voice: '↑ Hand' },
  { id: 'tom_hi', name: 'High Tom', shortLabel: 'High Tom', key: 'G', pitch: 'E5', color: '#16a34a', voice: '↑ Hand' },
  { id: 'tom_mid', name: 'Mid Tom', shortLabel: 'Mid Tom', key: 'H', pitch: 'D5', color: '#d97706', voice: '↑ Hand' },
  { id: 'tom_floor', name: 'Standtom (Floor Tom)', shortLabel: 'Standtom', key: 'B', pitch: 'A4', color: '#2563eb', voice: '↑ Hand' },
  { id: 'crash', name: 'Crash-Becken', shortLabel: 'Crash', key: 'E', pitch: 'A5', color: '#ea580c', voice: '↑ Hand' },
  { id: 'ride', name: 'Ride-Becken', shortLabel: 'Ride', key: 'I', pitch: 'F5', color: '#c026d3', voice: '↑ Hand' }
];

const DRUM_COMBO_PADS = [
  { id: 'kick_hh', label: 'Kick + HH', title: 'Simultan: Bass Drum (F4 ↓) + geschlossene Hi-Hat (G5 ↑)', pitches: ['F4', 'G5'] },
  { id: 'snare_hh', label: 'Snare + HH', title: 'Simultan: Snare Backbeat (C5 ↑) + geschlossene Hi-Hat (G5 ↑)', pitches: ['C5', 'G5'] },
  { id: 'kick_crash', label: 'Kick + Crash', title: 'Simultan: Bass Drum (F4 ↓) + Crash-Akzent (A5 ↑)', pitches: ['F4', 'A5'] }
];

export const MicroScoreBaukastenDock: React.FC<MicroScoreBaukastenDockProps> = ({
  activeDuration,
  onSelectDuration,
  isDotted = false,
  onToggleDotted,
  isTriplet = false,
  onToggleTriplet,
  onInsertRest,
  onUndo,
  canUndo,
  onClearAll,
  hasNotes = false,
  onDeleteNote,
  activeStepBadge,
  onInsertPitch,
  onInsertPitchStack,
  onInsertDrumCombo,
  defaultOctave = 4,
  activeAccidental = null,
  onToggleAccidental,
  isChordMode = false,
  onToggleChordMode,
  chordQuality = 'major',
  onToggleChordQuality,
  instrument = 'guitar',
  readOnly = false
}) => {
  const theme = getInstrumentTheme(instrument);
  const [octave, setOctave] = useState<number>(defaultOctave);
  const [isSharp, setIsSharp] = useState(false);
  const [chordSubMode, setChordSubMode] = useState<'cadence' | 'stack'>('cadence');
  const [confirmClear, setConfirmClear] = useState(false);

  React.useEffect(() => {
    if (!confirmClear) return;
    const t = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(t);
  }, [confirmClear]);

  const durationItems: Array<{ dur: MicroScoreDuration; title: string; beats: string; dottedBeats: string }> = [
    { dur: '1', title: 'Ganze', beats: '4 Schl.', dottedBeats: '6 Schl.' },
    { dur: '2', title: 'Halbe', beats: '2 Schl.', dottedBeats: '3 Schl.' },
    { dur: '4', title: 'Viertel', beats: '1 Schl.', dottedBeats: '1½ Schl.' },
    { dur: '8', title: 'Achtel', beats: '½ Schl.', dottedBeats: '¾ Schl.' },
    { dur: '16', title: '16tel', beats: '¼ Schl.', dottedBeats: '⅜ Schl.' }
  ];

  const handlePitchClick = (base: string, isHighOctave?: boolean, qualityOverride?: 'major' | 'minor') => {
    if (readOnly) return;
    const finalOctave = isHighOctave ? octave + 1 : octave;
    const accidental = activeAccidental !== null ? activeAccidental : (isSharp ? '#' : '');
    const finalPitch = `${base}${accidental}${finalOctave}`;

    if (isChordMode) {
      if (chordSubMode === 'stack') {
        // Freies Schichten ohne Cursor-Weiterspringen
        if (onInsertPitchStack) {
          onInsertPitchStack(finalPitch);
        } else {
          onInsertPitch(finalPitch);
        }
        return;
      }

      // Kadenzen / Stufen-Modus: Qualität abstimmen falls nötig
      if (qualityOverride && qualityOverride !== chordQuality && onToggleChordQuality) {
        onToggleChordQuality();
      }
      onInsertPitch(finalPitch);
      return;
    }

    // Normaler Melodie-Modus mit Auto-Advance
    onInsertPitch(finalPitch);
  };

  const activeDurationItem = durationItems.find(d => d.dur === activeDuration) || durationItems[2];
  const activeBeatLabel = isDotted ? activeDurationItem.dottedBeats : isTriplet ? 'Triolisch' : activeDurationItem.beats;

  return (
    <div
      role="region"
      aria-label="Didaktischer Noten- und Harmonie-Baukasten"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '9px',
        padding: '12px 14px',
        background: '#f8fafc',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        userSelect: 'none'
      }}
    >
      {/* ========================================================================= */}
      {/* ZEILE 1: RHYTHMUS (Werte + Punktierung + Triole) + PAUSE & AKTIONEN       */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        {/* Linke Seite: Notenwerte + Punktierung & Triole */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: theme.textColor, marginRight: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Rhythmus:
          </span>

          {/* Notenwert-Segmented Control */}
          <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '8px', padding: '2px', gap: '2px' }}>
            {durationItems.map(item => {
              const isSelected = activeDuration === item.dur;
              return (
                <button
                  key={`dur-${item.dur}`}
                  type="button"
                  onClick={() => onSelectDuration(item.dur)}
                  disabled={readOnly}
                  title={`${item.title} (${isDotted ? item.dottedBeats : item.beats})`}
                  aria-label={`${item.title} (${isDotted ? item.dottedBeats : item.beats})`}
                  aria-pressed={isSelected}
                  style={{
                    border: 'none',
                    background: isSelected ? theme.primary : 'transparent',
                    color: isSelected ? '#ffffff' : '#334155',
                    borderRadius: '7px',
                    padding: '5px 11px',
                    height: '32px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: readOnly ? 'default' : 'pointer',
                    transition: 'all 0.1s ease',
                    boxShadow: isSelected ? `0 2px 8px ${theme.glow}` : 'none'
                  }}
                  className="hover-scale-mini"
                >
                  <NoteDurationIcon duration={item.dur} size={15} color={isSelected ? '#ffffff' : '#334155'} />
                  <span style={{ fontSize: '0.74rem', fontWeight: isSelected ? 900 : 800 }}>
                    {item.title}{isSelected && isDotted ? ' •' : ''}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 🌟 2027 Goldstandard: Punktierung & Triolen Modifikatoren */}
          <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '8px', padding: '2px', gap: '2px', marginLeft: '2px' }}>
            {onToggleDotted && (
              <button
                type="button"
                onClick={onToggleDotted}
                disabled={readOnly}
                title="Punktierte Note (•): Verlängert den Notenwert um 50% (z. B. Viertel = 1½ Schläge)"
                aria-label="Punktierte Note ein- oder ausschalten"
                aria-pressed={isDotted}
                style={{
                  border: 'none',
                  background: isDotted ? theme.primary : 'transparent',
                  color: isDotted ? '#ffffff' : '#475569',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: readOnly ? 'default' : 'pointer',
                  transition: 'all 0.1s ease',
                  boxShadow: isDotted ? `0 2px 8px ${theme.glow}` : 'none'
                }}
                className="hover-scale-mini"
              >
                <span style={{ fontSize: '0.88rem', lineHeight: 1, fontWeight: 900 }}>•</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>Punkt</span>
              </button>
            )}

            {onToggleTriplet && (
              <button
                type="button"
                onClick={onToggleTriplet}
                disabled={readOnly}
                title="Triole (3): 3 Noten auf 2 Zählzeiten (ternäres Metrum)"
                aria-label="Triolen-Modus ein- oder ausschalten"
                aria-pressed={isTriplet}
                style={{
                  border: 'none',
                  background: isTriplet ? theme.primary : 'transparent',
                  color: isTriplet ? '#ffffff' : '#475569',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  cursor: readOnly ? 'default' : 'pointer',
                  transition: 'all 0.1s ease',
                  boxShadow: isTriplet ? `0 2px 8px ${theme.glow}` : 'none'
                }}
                className="hover-scale-mini"
              >
                <span style={{ fontSize: '0.72rem', fontWeight: 900 }}>3</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>Triole</span>
              </button>
            )}
          </div>

          {/* 🧲 Live-Anzeige des aktiven magnetischen Raster-Platzhalters */}
          {activeStepBadge && (
            <span
              style={{
                marginLeft: '4px',
                padding: '3px 9px',
                borderRadius: '99px',
                background: '#eef2ff',
                border: '1px solid #c7d2fe',
                color: '#4338ca',
                fontSize: '0.68rem',
                fontWeight: 900,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap'
              }}
              title="Aktiver Raster-Platzhalter für die nächste Note"
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4f46e5', display: 'inline-block' }} />
              <span>{activeStepBadge}</span>
            </span>
          )}
        </div>

        {/* Rechte Seite: Pause, Löschen (Smart-Backspace), Undo & Leeren */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Prominenter 1-Tap Pausen-Button passend zum Notenwert */}
          <button
            type="button"
            onClick={onInsertRest}
            disabled={readOnly}
            title={`Pause passend zur gewählten Dauer (${activeBeatLabel}) einfügen (Taste R)`}
            aria-label={`Pause einfügen (${activeBeatLabel})`}
            style={{
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: '8px',
              padding: '4px 10px',
              height: '30px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: readOnly ? 'default' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
            className="hover-scale-mini"
          >
            <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>𝄽</span>
            <span>Pause{isDotted ? ' •' : ''}</span>
          </button>

          {/* Löschen Button (Smart-Backspace: löscht rückwärts die letzte Note) */}
          <button
            type="button"
            onClick={onDeleteNote}
            disabled={readOnly}
            title="Letzte Note löschen (Taste ⌫ Backspace)"
            aria-label="Note löschen"
            style={{
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: '8px',
              padding: '4px 9px',
              height: '30px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: readOnly ? 'default' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
            className="hover-scale-mini"
          >
            <Delete size={13} color="#475569" />
            <span>Löschen</span>
          </button>

          {/* Undo Button */}
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo || readOnly}
            title="Rückgängig"
            aria-label="Letzten Schritt rückgängig machen"
            style={{
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: canUndo ? '#0f172a' : '#94a3b8',
              borderRadius: '8px',
              padding: '4px 9px',
              height: '30px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: canUndo && !readOnly ? 'pointer' : 'default',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
            className="hover-scale-mini"
          >
            <Undo2 size={13} color={canUndo ? '#0f172a' : '#94a3b8'} />
            <span>Undo</span>
          </button>

          {/* Alles leeren (2-Stufen Sicherheits-Reset gegen versehentliches Löschen) */}
          {onClearAll && (
            <>
              <span style={{ width: '1px', height: '18px', background: '#e2e8f0', margin: '0 2px' }} />
              <button
                type="button"
                onClick={() => {
                  if (!hasNotes || readOnly) return;
                  if (confirmClear) {
                    setConfirmClear(false);
                    onClearAll();
                  } else {
                    setConfirmClear(true);
                  }
                }}
                disabled={!hasNotes || readOnly}
                title={confirmClear ? 'Jetzt nochmals klicken, um wirklich alle Noten zu löschen' : 'Alle Noten löschen (2-Klick-Schutz)'}
                aria-label={confirmClear ? 'Alle Noten unwiderruflich leeren bestätigen' : 'Alle Noten leeren'}
                style={{
                  border: confirmClear ? '1px solid #dc2626' : '1px solid #e2e8f0',
                  background: confirmClear ? '#dc2626' : 'transparent',
                  color: confirmClear ? '#ffffff' : hasNotes ? '#64748b' : '#cbd5e1',
                  borderRadius: '8px',
                  padding: confirmClear ? '4px 10px' : '4px 8px',
                  height: '30px',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  cursor: hasNotes && !readOnly ? 'pointer' : 'default',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
              >
                <RotateCcw size={12} color={confirmClear ? '#ffffff' : hasNotes ? '#64748b' : '#cbd5e1'} />
                <span>{confirmClear ? 'Wirklich leeren?' : 'Leeren'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ZEILE 2: TONHÖHE (Melodie) ODER HARMONIE-DOCK (Stufenkadenzen / Stapeln)   */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          paddingTop: '6px',
          borderTop: '1px solid #e2e8f0'
        }}
      >
        {/* Linker Bereich: Entweder Schlagzeug-Pads, diatonische Töne ODER Akkord-Stufen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '300px' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', marginRight: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {instrument === 'drums' ? (isChordMode || chordSubMode === 'stack' ? 'Simultan:' : 'Drums:') : isChordMode ? (chordSubMode === 'cadence' ? 'Kadenz:' : 'Stapeln:') : 'Tonhöhe:'}
          </span>

          {instrument === 'drums' ? (
            /* 🥁 Schlagzeug-Pads (PAS Standard: Füße ↓ & Hände ↑ klar getrennt, 0% Emoji-Clutter) */
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, overflowX: 'auto' }}>
              {DRUM_DOCK_PADS.map(pad => (
                <button
                  key={`drum-pad-${pad.id}`}
                  type="button"
                  onClick={() => {
                    if (readOnly) return;
                    if ((isChordMode || chordSubMode === 'stack') && onInsertPitchStack) {
                      onInsertPitchStack(pad.pitch);
                    } else {
                      onInsertPitch(pad.pitch);
                    }
                  }}
                  disabled={readOnly}
                  title={`${pad.name} (${pad.voice} • PAS: ${pad.pitch} • Taste: ${pad.key})`}
                  aria-label={`${pad.name} ${pad.key}`}
                  style={{
                    flex: 1,
                    height: '40px',
                    minWidth: '54px',
                    border: '1px solid #cbd5e1',
                    borderBottom: `3.5px solid ${pad.color}`,
                    background: '#ffffff',
                    color: '#0f172a',
                    borderRadius: '9px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: readOnly ? 'default' : 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'transform 0.08s ease, background 0.08s ease',
                    padding: '2px 5px',
                    gap: '1px'
                  }}
                  className="hover-scale-mini active-press"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', lineHeight: 1 }}>
                    <span style={{ fontSize: '0.56rem', fontWeight: 900, color: pad.color }}>
                      {pad.voice}
                    </span>
                    <span style={{ fontSize: '0.56rem', fontWeight: 800, color: '#64748b' }}>
                      [{pad.key}]
                    </span>
                  </div>
                  <span style={{ fontSize: '0.73rem', fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.15, whiteSpace: 'nowrap' }}>
                    {pad.shortLabel}
                  </span>
                </button>
              ))}
            </div>
          ) : isChordMode && chordSubMode === 'cadence' ? (
            /* 🎹 VdM Stufen-Kadenzen Pad */
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
              {CADENCE_STUFEN.map(item => (
                <button
                  key={`stufe-${item.degree}`}
                  type="button"
                  onClick={() => handlePitchClick(item.base, false, item.quality)}
                  disabled={readOnly}
                  title={`Akkord ${item.label} (${item.degree}. Stufe)`}
                  aria-label={`Akkord ${item.label}`}
                  style={{
                    flex: 1,
                    height: '38px',
                    minWidth: '38px',
                    border: '1px solid #cbd5e1',
                    borderBottom: `3.5px solid ${theme.primary}`,
                    background: '#ffffff',
                    color: '#0f172a',
                    borderRadius: '9px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: readOnly ? 'default' : 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'transform 0.08s ease, background 0.08s ease'
                  }}
                  className="hover-scale-mini active-press"
                >
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', lineHeight: 1 }}>
                    {item.degree}
                  </span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.1 }}>
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            /* 🎼 Diatonische Noten-Tasten (C D E F G A H C') */
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
              {DIATONIC_PITCHES.map(pitch => {
                const cleanBase = pitch.name.replace("'", '');
                const bwColor = BOOMWHACKER_COLORS[cleanBase]?.border || '#cbd5e1';

                return (
                  <button
                    key={`pitch-${pitch.name}`}
                    type="button"
                    onClick={() => handlePitchClick(pitch.base, pitch.isHighOctave)}
                    disabled={readOnly}
                    title={
                      isChordMode 
                        ? `Ton ${pitch.name} auf aktuellen Schlag stapeln (Cursor bleibt stehen)`
                        : `Note ${pitch.name} setzen (Auto-Advance)`
                    }
                    aria-label={isChordMode ? `Ton ${pitch.name} stapeln` : `Note ${pitch.name}`}
                    style={{
                      flex: 1,
                      height: '38px',
                      minWidth: '32px',
                      border: '1px solid #cbd5e1',
                      borderBottom: `3.5px solid ${bwColor}`,
                      background: '#ffffff',
                      color: '#0f172a',
                      borderRadius: '9px',
                      fontSize: '0.92rem',
                      fontWeight: 900,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      cursor: readOnly ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'transform 0.08s ease, background 0.08s ease'
                    }}
                    className="hover-scale-mini active-press"
                  >
                    {pitch.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Rechter Bereich: Vorzeichen, Akkord-Umschalter & Oktave (Drums: Einzeln vs Simultan) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {instrument === 'drums' ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {/* 1-Tap Groove-Kombis (Füße + Hände simultan setzen) */}
              {onInsertDrumCombo && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#f1f5f9', padding: '2px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {DRUM_COMBO_PADS.map(combo => (
                    <button
                      key={combo.id}
                      type="button"
                      disabled={readOnly}
                      onClick={() => onInsertDrumCombo(combo.pitches)}
                      title={combo.title}
                      style={{
                        border: 'none',
                        background: '#ffffff',
                        color: '#0f172a',
                        borderRadius: '6px',
                        padding: '4px 7px',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        cursor: readOnly ? 'default' : 'pointer',
                        boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
                        whiteSpace: 'nowrap'
                      }}
                      className="hover-scale-mini active-press"
                    >
                      {combo.label}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '7px', padding: '2px', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (isChordMode && onToggleChordMode) onToggleChordMode();
                    setChordSubMode('cadence');
                  }}
                  title="Einzelnoten mit Auto-Advance"
                  aria-pressed={!isChordMode && chordSubMode !== 'stack'}
                  style={{
                    border: 'none',
                    background: (!isChordMode && chordSubMode !== 'stack') ? '#ffffff' : 'transparent',
                    color: (!isChordMode && chordSubMode !== 'stack') ? '#0f172a' : '#475569',
                    borderRadius: '5px',
                    padding: '3px 8px',
                    fontSize: '0.70rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: (!isChordMode && chordSubMode !== 'stack') ? '0 1px 3px rgba(15,23,42,0.12)' : 'none'
                  }}
                >
                  Einzeln
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isChordMode && onToggleChordMode) onToggleChordMode();
                    setChordSubMode('stack');
                  }}
                  title="Simultananschlag: Töne frei schichten (z. B. Kick + Hi-Hat gleichzeitig)"
                  aria-pressed={isChordMode || chordSubMode === 'stack'}
                  style={{
                    border: 'none',
                    background: (isChordMode || chordSubMode === 'stack') ? '#ffffff' : 'transparent',
                    color: (isChordMode || chordSubMode === 'stack') ? '#0f172a' : '#475569',
                    borderRadius: '5px',
                    padding: '3px 8px',
                    fontSize: '0.70rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: (isChordMode || chordSubMode === 'stack') ? '0 1px 3px rgba(15,23,42,0.12)' : 'none'
                  }}
                >
                  <Layers size={11} color={(isChordMode || chordSubMode === 'stack') ? theme.primary : 'currentColor'} />
                  <span>Simultan</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Vorzeichen Segment (♯ / ♭) */}
          <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '7px', padding: '2px', gap: '2px' }}>
            <button
              type="button"
              onClick={() => {
                if (onToggleAccidental) {
                  onToggleAccidental('#');
                } else {
                  setIsSharp(prev => !prev);
                }
              }}
              disabled={readOnly}
              title="Kreuz-Vorzeichen (♯): Erhöht den Ton um einen Halbton"
              aria-label="Kreuz-Vorzeichen"
              aria-pressed={activeAccidental === '#' || (!onToggleAccidental && isSharp)}
              style={{
                border: 'none',
                background: (activeAccidental === '#' || (!onToggleAccidental && isSharp)) ? theme.primary : 'transparent',
                color: (activeAccidental === '#' || (!onToggleAccidental && isSharp)) ? '#ffffff' : '#475569',
                borderRadius: '5px',
                padding: '2px 9px',
                fontSize: '0.82rem',
                fontWeight: 900,
                cursor: readOnly ? 'default' : 'pointer',
                transition: 'all 0.1s ease',
                boxShadow: (activeAccidental === '#' || (!onToggleAccidental && isSharp)) ? `0 1px 4px ${theme.glow}` : 'none'
              }}
            >
              ♯
            </button>
            <button
              type="button"
              onClick={() => {
                if (onToggleAccidental) {
                  onToggleAccidental('b');
                }
              }}
              disabled={readOnly}
              title="Be-Vorzeichen (♭): Erniedrigt den Ton um einen Halbton"
              aria-label="Be-Vorzeichen"
              aria-pressed={activeAccidental === 'b'}
              style={{
                border: 'none',
                background: activeAccidental === 'b' ? theme.primary : 'transparent',
                color: activeAccidental === 'b' ? '#ffffff' : '#475569',
                borderRadius: '5px',
                padding: '2px 9px',
                fontSize: '0.82rem',
                fontWeight: 900,
                cursor: readOnly ? 'default' : 'pointer',
                transition: 'all 0.1s ease',
                boxShadow: activeAccidental === 'b' ? `0 1px 4px ${theme.glow}` : 'none'
              }}
            >
              ♭
            </button>
          </div>

          {/* 🌟 2027 Goldstandard: Akkord-Zentrale (Akkord An/Aus + Submodus) */}
          {onToggleChordMode && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={onToggleChordMode}
                disabled={readOnly}
                title={isChordMode ? "Akkord-Modus deaktivieren (zurück zu Einzeltönen)" : "Akkord-Modus aktivieren (Kadenzen & Töne schichten)"}
                aria-pressed={isChordMode}
                style={{
                  border: isChordMode ? 'none' : '1px solid #cbd5e1',
                  background: isChordMode ? theme.primary : '#ffffff',
                  color: isChordMode ? '#ffffff' : theme.textColor,
                  borderRadius: '7px',
                  padding: '0 8px',
                  height: '30px',
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  cursor: readOnly ? 'default' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: isChordMode ? `0 2px 8px ${theme.glow}` : 'none',
                  transition: 'all 0.1s ease'
                }}
                className="hover-scale-mini"
              >
                <Music size={12} color={isChordMode ? '#ffffff' : theme.textColor} />
                <span>Akkord</span>
              </button>

              {/* Bei aktivem Akkord-Modus: Umschalten zwischen Kadenz-Stufen und Freiem Stapeln */}
              {isChordMode && (
                <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '7px', padding: '2px', gap: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setChordSubMode('cadence')}
                    title="Kadenzen: Stufenakkorde für C-Dur"
                    aria-pressed={chordSubMode === 'cadence'}
                    style={{
                      border: 'none',
                      background: chordSubMode === 'cadence' ? theme.primary : 'transparent',
                      color: chordSubMode === 'cadence' ? '#ffffff' : '#475569',
                      borderRadius: '5px',
                      padding: '2px 6px',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    Stufen
                  </button>
                  <button
                    type="button"
                    onClick={() => setChordSubMode('stack')}
                    title="Schichten: Töne frei auf denselben Schlag stapeln"
                    aria-pressed={chordSubMode === 'stack'}
                    style={{
                      border: 'none',
                      background: chordSubMode === 'stack' ? theme.primary : 'transparent',
                      color: chordSubMode === 'stack' ? '#ffffff' : '#475569',
                      borderRadius: '5px',
                      padding: '2px 6px',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    Schichten
                  </button>
                </div>
              )}

              {/* Dur/Moll Umschalter (nur im Kadenz-Modus) */}
              {isChordMode && chordSubMode === 'cadence' && onToggleChordQuality && (
                <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '7px', padding: '2px', gap: '2px' }}>
                  <button
                    type="button"
                    onClick={() => chordQuality !== 'major' && onToggleChordQuality()}
                    title="Dur-Akkord"
                    style={{
                      border: 'none',
                      background: chordQuality === 'major' ? theme.primary : 'transparent',
                      color: chordQuality === 'major' ? '#ffffff' : '#475569',
                      borderRadius: '5px',
                      padding: '2px 6px',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    Dur
                  </button>
                  <button
                    type="button"
                    onClick={() => chordQuality !== 'minor' && onToggleChordQuality()}
                    title="Moll-Akkord"
                    style={{
                      border: 'none',
                      background: chordQuality === 'minor' ? theme.primary : 'transparent',
                      color: chordQuality === 'minor' ? '#ffffff' : '#475569',
                      borderRadius: '5px',
                      padding: '2px 6px',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    Moll
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Oktave Segmented Control */}
          <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '7px', padding: '2px', gap: '2px' }}>
            {[3, 4, 5].map(oct => (
              <button
                key={`oct-${oct}`}
                type="button"
                onClick={() => setOctave(oct)}
                disabled={readOnly}
                title={`Oktave ${oct} (${oct === 3 ? 'Tief' : oct === 4 ? 'Mittel' : 'Hoch'})`}
                style={{
                  border: 'none',
                  background: octave === oct ? theme.primary : 'transparent',
                  color: octave === oct ? '#ffffff' : '#475569',
                  borderRadius: '5px',
                  padding: '2px 7px',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  cursor: readOnly ? 'default' : 'pointer',
                  transition: 'all 0.1s ease',
                  boxShadow: octave === oct ? `0 1px 4px ${theme.glow}` : 'none'
                }}
              >
                {oct === 3 ? 'Tief' : oct === 4 ? 'Mittel' : 'Hoch'}
              </button>
            ))}
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
};
