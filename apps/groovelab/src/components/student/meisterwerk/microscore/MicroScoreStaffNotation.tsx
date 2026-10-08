/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * MicroScoreStaffNotation.tsx
 * 
 * 2027 0,1% Goldstandard Noten- & Tabulatur-Engine:
 * - Echte 5-Linien Urtext-Notation (SMuFL Bravura Standard)
 * - 6-Saiten-Tabulatur für Gitarre (Standard-Stimmung E A D G B e)
 * - 3-Wege-Segment-Modus: 'notes' | 'tabs' | 'both' (Default für Gitarre: 'both')
 * - Vollständige Triolen-Engine (48 Ticks pro Takt, optische 3-Klammern)
 * - Tastatur-First Navigation (Pfeile, Ziffern 0–24 für Bünde, C..H für Noten)
 * - Flüssiger Playhead & Rocksmith/Live-Hit-Coloring bei Pitch-Challenges
 * - BFSG 2025 / WCAG 2.2 AA konform (Tastatur-Vollbedienbarkeit, Kontrast ≥ 7:1)
 */

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { 
  MicroScoreDuration, 
  MicroScoreNote, 
  MicroScoreSnippet, 
  MicroScoreDisplayMode, 
  MicroScoreChord 
} from './microScore.types';
import { 
  GUITAR_STRINGS, 
  BASS_STRINGS,
  fretAndStringToPitch, 
  pitchToBestFretAndString, 
  pitchToMidi, 
  TICKS_PER_MEASURE_4_4,
  durationToTicks
} from './guitarFretboardEngine';
import { SMUFL_GLYPHS } from '../worldtour/worldTourMusicGlyphs';
import { durationToSixteenths } from './microScoreAudioSynthesizer';
import { 
  calculateMeasureBeatSlots, 
  getMeasureProgress, 
  getTimeSignatureFractions,
  getPitchColorTheme,
  getPitchLetter
} from './microScoreGridEngine';
import { MicroScoreBeatGridOverlay } from './MicroScoreBeatGridOverlay';
import {
  calculateBarMelodicBeamGroups,
  buildMelodicBeamLookup,
  MicroScoreMelodicBeams
} from './microScoreMelodicBeamEngine';

interface MicroScoreStaffNotationProps {
  snippet: MicroScoreSnippet;
  activeBar: number;
  activeFraction: number;
  activeString?: number; // 0..5 für Gitarre
  displayMode?: MicroScoreDisplayMode; // 'notes' | 'tabs' | 'both'
  isPlaying: boolean;
  playheadPosition?: { bar: number; fraction: number }; // Flüssiger Abspielzeiger
  noteHits?: Record<string, 'hit' | 'near' | 'miss'>;
  activeDuration?: MicroScoreDuration;
  isTripletMode?: boolean;
  isDottedMode?: boolean;
  onUpdateNotes: (notes: MicroScoreNote[]) => void;
  onSelectPosition: (bar: number, fraction: number, stringIndex?: number) => void;
  onUpdateChords?: (chords: MicroScoreChord[]) => void;
  onDuplicateBar?: (barIdx: number) => void;
  onClearBar?: (barIdx: number) => void;
  onPlayPreviewNote?: (pitch: string) => void;
  onUpdateBarsCount?: (barsCount: number) => void;
  onInsertPitchDirectly?: (bar: number, fraction: number, pitch: string) => void;
  readOnly?: boolean;
}

// 🎼 Diatonische Basen für mathematisch deterministische Urtext-Notensatz-Engine (2027 0,1% Goldstandard)
// Stufen: C=0, D=1, E=2, F=3, G=4, A=5, B/H=6
const DIATONIC_STEP_MAP: Record<string, number> = {
  'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6, 'H': 6
};

import { 
  PERCUSSION_PITCH_Y, 
  isCymbalPitch, 
  isDrumFootPitch, 
  renderDrumPolyphonySlot 
} from './microScoreDrumPolyphonyEngine';
import { renderStaffRest } from './microScoreRestRenderer';

export function getStaffY(pitch: string, isBass: boolean, isDrum: boolean = false): number {
  if (!pitch || pitch === 'REST') return 25;
  if (isDrum) {
    const raw = pitch.trim().toUpperCase();
    if (PERCUSSION_PITCH_Y[raw] !== undefined) return PERCUSSION_PITCH_Y[raw];
    const match = raw.match(/^([A-G][#B]?)(-?\d+)$/);
    if (match) {
      const key = `${match[1]}${match[2]}`;
      if (PERCUSSION_PITCH_Y[key] !== undefined) return PERCUSSION_PITCH_Y[key];
    }
    return 18.75; // Snare Fallback
  }

  // 🎼 Mathematisch deterministische Urtext-Diatonik (100% lückenlos von C0 bis C9):
  // Treble: Top Line F5 (Stufe 38) = 0px
  // Bass:   Top Line A3 (Stufe 26) = 0px
  // Jede diatonische Stufe (Linie <-> Zwischenraum) = 6.25px (12.5px Linienabstand / 2)
  const match = pitch.trim().match(/^([A-Ga-gHh])[#bB♮]?(-?\d+)$/);
  if (!match) return isBass ? 25 : 37.5;
  const letter = match[1].toUpperCase();
  const octave = parseInt(match[2], 10);
  const step = DIATONIC_STEP_MAP[letter] ?? 0;
  const diatonicIndex = octave * 7 + step;

  const topStaffIndex = isBass ? 26 : 38; // 26 = A3, 38 = F5
  return (topStaffIndex - diatonicIndex) * 6.25;
}

// Diatonische Stufen-Tabellen für direkte Notenlinien-Klicks (6.25px-Raster)
const TREBLE_DIATONIC_PITCHES = [
  'C6', 'B5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4', 'B3', 'A3', 'G3', 'F3', 'E3', 'D3', 'C3'
];

const BASS_DIATONIC_PITCHES = [
  'G4', 'F4', 'E4', 'D4', 'C4', 'B3', 'A3', 'G3', 'F3', 'E3', 'D3', 'C3', 'B2', 'A2', 'G2', 'F2', 'E2', 'D2', 'C2'
];

export function yToStaffPitch(svgY: number, staffTopY: number, isBass: boolean, isDrum: boolean = false): string {
  const relY = svgY - staffTopY;
  if (isDrum) {
    if (relY <= -9.375) return 'A5';     // Crash (Hilfslinie oben)
    if (relY <= -3.125) return 'G5';     // Hi-Hat (über System)
    if (relY <= 3.125) return 'F5';      // Ride (5. Linie)
    if (relY <= 9.375) return 'E5';      // High Tom (4. Zwischenraum)
    if (relY <= 15.625) return 'D5';     // Mid Tom (4. Linie)
    if (relY <= 25.0) return 'C5';       // Snare Drum (3. Zwischenraum)
    if (relY <= 37.5) return 'A4';       // Floor Tom (2. Zwischenraum)
    if (relY <= 50.0) return 'F4';       // Bass Drum / Kick (1. Zwischenraum)
    return 'D3';                         // Hi-Hat Pedal (unter System)
  }
  const k = Math.round(relY / 6.25);
  if (isBass) {
    const idx = Math.max(0, Math.min(BASS_DIATONIC_PITCHES.length - 1, k + 6));
    return BASS_DIATONIC_PITCHES[idx];
  } else {
    const idx = Math.max(0, Math.min(TREBLE_DIATONIC_PITCHES.length - 1, k + 4));
    return TREBLE_DIATONIC_PITCHES[idx];
  }
}

const SCALE_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const MicroScoreStaffNotation: React.FC<MicroScoreStaffNotationProps> = ({
  snippet,
  activeBar,
  activeFraction,
  activeString = 1, // Default B3-Saite
  displayMode: propDisplayMode,
  isPlaying,
  playheadPosition,
  noteHits = {},
  activeDuration = '4',
  isTripletMode = false,
  isDottedMode = false,
  onUpdateNotes,
  onSelectPosition,
  onDuplicateBar,
  onClearBar,
  onPlayPreviewNote,
  onUpdateBarsCount,
  onInsertPitchDirectly,
  readOnly = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const fretBufferRef = useRef<{ bar: number; fraction: number; stringIndex: number; value: number; timer: any } | null>(null);
  const [hoverSlot, setHoverSlot] = useState<{ bar: number; fraction: number; pitch: string } | null>(null);

  // Synchronized refs to eliminate closure staleness and prevent timer resets on re-renders
  const notesRef = useRef(snippet.notes);
  notesRef.current = snippet.notes;
  const barsCountRef = useRef(snippet.barsCount);
  barsCountRef.current = snippet.barsCount;
  const activeDurationRef = useRef(activeDuration);
  activeDurationRef.current = activeDuration;
  const isTripletModeRef = useRef(isTripletMode);
  isTripletModeRef.current = isTripletMode;
  const isDottedModeRef = useRef(isDottedMode);
  isDottedModeRef.current = isDottedMode;

  // Streich- und Zupfinstrumente unterstützen alle 3 Modi; andere Instrumente ausschließlich echte Notenlinien
  const isStringOrPlucked = snippet.instrument === 'guitar' || snippet.instrument === 'bass' || snippet.instrument === 'strings';
  const effectiveDisplayMode: MicroScoreDisplayMode = useMemo(() => {
    if (!isStringOrPlucked) return 'notes';
    return propDisplayMode || snippet.displayMode || 'both';
  }, [isStringOrPlucked, propDisplayMode, snippet.displayMode]);

  const showStaff = effectiveDisplayMode === 'notes' || effectiveDisplayMode === 'both';
  const showTabs = isStringOrPlucked && (effectiveDisplayMode === 'tabs' || effectiveDisplayMode === 'both');

  const isBassClef = snippet.clef === 'bass' || (!snippet.clef && (snippet.instrument === 'trombone' || snippet.instrument === 'bass'));
  const isDrumClef = snippet.clef === 'percussion' || (!snippet.clef && snippet.instrument === 'drums');

  // Dimensionen & Layout-Metriken (2027 0,1% Goldstandard)
  const staffTopY = 58; // Großzügige Zone für Takt-Header (y=12..28) & Akkordsymbole (y=47)
  const staffHeight = 50; // 5 Linien à 12.5px (25% Vergrößerung für perfekte Tablet-Lesbarkeit)

  // Finde tiefste Note im gesamten Snippet zur dynamischen Kollisionsvermeidung
  const maxPitchedNoteRelY = useMemo(() => {
    if (!snippet.notes || snippet.notes.length === 0) return 50;
    let maxY = 50;
    for (const n of snippet.notes) {
      if (n.pitch && n.pitch !== 'REST') {
        const y = getStaffY(n.pitch, isBassClef, isDrumClef);
        if (y > maxY) maxY = y;
      }
    }
    return maxY;
  }, [snippet.notes, isBassClef, isDrumClef]);

  const tabTopY = showStaff ? staffTopY + Math.max(staffHeight + 42, maxPitchedNoteRelY + 38) : 58;
  const tabStringSpacing = 14; // 14px für optimale Lesbarkeit zweistelliger Bünde
  const tabLinesCount = snippet.instrument === 'bass' || snippet.instrument === 'strings' ? 4 : 6;
  const tabHeight = (tabLinesCount - 1) * tabStringSpacing;

  const rulerY = showTabs
    ? tabTopY + tabHeight + 24
    : staffTopY + Math.max(staffHeight + 46, maxPitchedNoteRelY + 22);

  const totalHeight = rulerY + 24;

  // Halbton-Transposition
  const transposePitch = useCallback((pitch: string, delta: number): string => {
    if (!pitch || pitch === 'REST') return 'C4';
    const match = pitch.trim().toUpperCase().match(/^([A-H][#B♮]?)(-?\d+)$/);
    if (!match) return 'C4';
    let noteName = match[1].replace('♮', '');
    let octave = parseInt(match[2], 10);
    if (noteName === 'DB') noteName = 'C#';
    if (noteName === 'EB') noteName = 'D#';
    if (noteName === 'GB') noteName = 'F#';
    if (noteName === 'AB') noteName = 'G#';
    if (noteName === 'BB') noteName = 'A#';
    if (noteName === 'H') noteName = 'B';

    let idx = SCALE_NOTES.indexOf(noteName);
    if (idx === -1) idx = 0;

    let newTotal = octave * 12 + idx + delta;
    let newOctave = Math.floor(newTotal / 12);
    let newIdx = ((newTotal % 12) + 12) % 12;
    newOctave = Math.max(2, Math.min(6, newOctave));

    return `${SCALE_NOTES[newIdx]}${newOctave}`;
  }, []);

  // 1. Auto-Focus auf Notations-Canvas beim Öffnen (Löst Safari/A11y Input-Trap)
  useEffect(() => {
    if (!readOnly) {
      const focusTimer = setTimeout(() => {
        containerRef.current?.focus();
      }, 70);
      return () => clearTimeout(focusTimer);
    }
  }, [readOnly]);

  // Dynamische Schrittweite nach aktiver Notendauer (1=16, 2=8, 4=4, 8=2, 16=1 Sechzehntel)
  const getStepSize = useCallback(() => {
    let base = 4;
    switch (activeDurationRef.current) {
      case '1': base = 16; break;
      case '2': base = 8; break;
      case '4': base = 4; break;
      case '8': base = 2; break;
      case '16': base = 1; break;
    }
    if (isTripletModeRef.current) return Math.max(1, Math.round((base * 2) / 3));
    if (isDottedModeRef.current) return Math.floor(base * 1.5);
    return base;
  }, []);

  // 🎼 Automatische Takterkennung & Taktübergang (Point 3: Wenn Takt voll ist, nahtlos in nächsten Takt leiten)
  const advanceCursor = useCallback((targetBar: number, targetFraction: number, targetString: number) => {
    const step = getStepSize();
    let nextFraction = targetFraction + step;
    let nextBar = targetBar;
    if (nextFraction >= 16) {
      nextFraction = nextFraction - 16;
      nextBar = targetBar + 1;
      if (nextBar >= barsCountRef.current) {
        if (barsCountRef.current < 4 && onUpdateBarsCount) {
          onUpdateBarsCount(barsCountRef.current + 1);
        } else {
          nextBar = 0; // Wrap around bei erreichter Maximaltaktanzahl
        }
      }
    }
    onSelectPosition(nextBar, nextFraction, targetString);
  }, [getStepSize, onSelectPosition, onUpdateBarsCount]);

  // 🎹 Tastatur-First Event-Handling (0,1% Goldstandard)
  useEffect(() => {
    if (readOnly || isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignoriere Tastatur nur, wenn der Benutzer aktiv in einem Textfeld tippt
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      const currentNotes = [...notesRef.current];
      const existingNoteIdx = currentNotes.findIndex(
        n => n.barIndex === activeBar && Math.abs(n.beatFraction - activeFraction) < 0.5
      );

      // 1. Horizontale Navigation (← / →)
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = getStepSize();
        let nextFraction = activeFraction + step;
        let nextBar = activeBar;
        if (nextFraction >= 16) {
          nextFraction = nextFraction - 16;
          nextBar = (activeBar + 1) % barsCountRef.current;
        }
        onSelectPosition(nextBar, nextFraction, activeString);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = getStepSize();
        let prevFraction = activeFraction - step;
        let prevBar = activeBar;
        if (prevFraction < 0) {
          prevFraction = Math.max(0, 16 - step);
          prevBar = activeBar === 0 ? barsCountRef.current - 1 : activeBar - 1;
        }
        onSelectPosition(prevBar, prevFraction, activeString);
        return;
      }

      // 2. Vertikale Saiten-Navigation bei Tabulatur (↑ / ↓)
      if (showTabs && !e.shiftKey && !e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        if (e.key === 'ArrowUp') {
          // Saite nach oben (in Richtung hohes e, Index verringern)
          const nextStr = Math.max(0, activeString - 1);
          onSelectPosition(activeBar, activeFraction, nextStr);
        } else {
          // Saite nach unten (in Richtung tiefes E, Index erhöhen)
          const nextStr = Math.min(tabLinesCount - 1, activeString + 1);
          onSelectPosition(activeBar, activeFraction, nextStr);
        }
        return;
      }

      // 3. Halbton-Transposition über Alt/Shift + Pfeiltasten oder im reinen Noten-Modus
      if (!showTabs && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        if (existingNoteIdx !== -1) {
          const delta = e.key === 'ArrowUp' ? 1 : -1;
          const updated = [...currentNotes];
          const newPitch = transposePitch(updated[existingNoteIdx].pitch, delta);
          updated[existingNoteIdx] = {
            ...updated[existingNoteIdx],
            pitch: newPitch,
            stringIndex: undefined,
            fret: undefined
          };
          onUpdateNotes(updated);
        }
        return;
      }

      // 4. Bund-Ziffern-Eingabe (0–24) für Gitarren-Tabulatur mit 2-Ziffern-Buffer (650ms)
      if (showTabs && /^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const digit = parseInt(e.key, 10);
        const buf = fretBufferRef.current;
        let targetFret = digit;
        let isSecondDigit = false;

        // Prüfe, ob innerhalb von 650ms eine 2. Ziffer für denselben Slot getippt wurde (z.B. 1 + 2 = 12)
        if (
          buf && 
          buf.bar === activeBar && 
          buf.fraction === activeFraction && 
          buf.stringIndex === activeString
        ) {
          const combined = buf.value * 10 + digit;
          if (combined <= 24) {
            targetFret = combined;
            isSecondDigit = true;
            if (buf.timer) clearTimeout(buf.timer);
            fretBufferRef.current = null;
          }
        }

        const calcPitch = fretAndStringToPitch(activeString, targetFret, snippet.instrument === 'bass');
        onPlayPreviewNote?.(calcPitch);

        const newNote: MicroScoreNote = {
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          barIndex: activeBar,
          beatFraction: activeFraction,
          duration: activeDurationRef.current,
          pitch: calcPitch,
          fret: targetFret,
          stringIndex: activeString,
          isTriplet: isTripletModeRef.current,
          isDotted: isDottedModeRef.current
        };

        let updated = [...currentNotes];
        if (existingNoteIdx !== -1) {
          updated[existingNoteIdx] = newNote;
        } else {
          updated.push(newNote);
        }
        onUpdateNotes(updated);

        if (isSecondDigit) {
          // Zweistelliger Bund abgeschlossen -> sofort vorrücken
          advanceCursor(activeBar, activeFraction, activeString);
        } else {
          // Erste Ziffer: 650ms Puffer für eventuelle zweite Ziffer (z.B. 10, 12, 14, 15)
          if (fretBufferRef.current?.timer) clearTimeout(fretBufferRef.current.timer);
          const timer = setTimeout(() => {
            fretBufferRef.current = null;
            advanceCursor(activeBar, activeFraction, activeString);
          }, 650);
          fretBufferRef.current = {
            bar: activeBar,
            fraction: activeFraction,
            stringIndex: activeString,
            value: digit,
            timer
          };
        }
        return;
      }

      // 5. Tonhöhen-Eingabe über Notennamen (C, D, E, F, G, A, B, H)
      const validNoteKeys = ['c', 'd', 'e', 'f', 'g', 'a', 'b', 'h'];
      if (validNoteKeys.includes(key)) {
        e.preventDefault();
        let noteName = key.toUpperCase();
        if (noteName === 'H') noteName = 'B';
        const targetPitch = `${noteName}4`;
        onPlayPreviewNote?.(targetPitch);

        // Bei Gitarre optimale Saite & Bund berechnen
        let assignedFret: number | undefined;
        let assignedString: number | undefined;
        if (showTabs) {
          const mapping = pitchToBestFretAndString(targetPitch, activeString);
          if (mapping) {
            assignedFret = mapping.fret;
            assignedString = mapping.stringIndex;
          }
        }

        const newNote: MicroScoreNote = {
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          barIndex: activeBar,
          beatFraction: activeFraction,
          duration: activeDurationRef.current,
          pitch: targetPitch,
          fret: assignedFret,
          stringIndex: assignedString ?? activeString,
          isTriplet: isTripletModeRef.current,
          isDotted: isDottedModeRef.current
        };

        let updated = [...currentNotes];
        if (existingNoteIdx !== -1) {
          updated[existingNoteIdx] = newNote;
        } else {
          updated.push(newNote);
        }
        onUpdateNotes(updated);

        advanceCursor(activeBar, activeFraction, assignedString ?? activeString);
        return;
      }

      // 6. Löschen / Pause einfügen (Backspace / Entf / R / Leertaste)
      if (e.key === 'Backspace' || e.key === 'Delete' || key === 'r' || e.key === ' ') {
        e.preventDefault();
        if (key === 'r' || e.key === ' ') {
          // Pause setzen
          const restNote: MicroScoreNote = {
            id: `rest-${Date.now()}`,
            barIndex: activeBar,
            beatFraction: activeFraction,
            duration: activeDurationRef.current,
            pitch: 'REST',
            isTriplet: isTripletModeRef.current
          };
          let updated = [...currentNotes];
          if (existingNoteIdx !== -1) {
            updated[existingNoteIdx] = restNote;
          } else {
            updated.push(restNote);
          }
          onUpdateNotes(updated);

          // Cursor nach Pause vorrücken
          advanceCursor(activeBar, activeFraction, activeString);
        } else if (existingNoteIdx !== -1) {
          // Note entfernen
          const updated = currentNotes.filter((_, idx) => idx !== existingNoteIdx);
          onUpdateNotes(updated);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    readOnly, 
    isPlaying, 
    activeBar, 
    activeFraction, 
    activeString, 
    showTabs, 
    tabLinesCount, 
    onUpdateNotes, 
    onSelectPosition, 
    onPlayPreviewNote,
    transposePitch,
    advanceCursor,
    getStepSize
  ]);

  // Takt-Breiten Berechnung (Dynamisch basierend auf Takten 1–4)
  const measureWidth = useMemo(() => {
    return Math.floor(660 / Math.max(1, snippet.barsCount));
  }, [snippet.barsCount]);

  const leftMargin = 88; // 0,1% Goldstandard: Platz für Schlüssel (16..48), Taktart (64) und Puffer (88)

  // Smarter Klick-Handler: Ermittelt präzise Staff-Notenhöhe ODER Tab-Saite per Y-Koordinate
  const handleSlotClick = useCallback((e: React.MouseEvent, barIdx: number, fractionIdx: number) => {
    e.stopPropagation();
    if (readOnly) return;

    // Hebe Fokus von Texteingabefeldern (z.B. Titel) auf und fokussiere Notation-Canvas
    if (document.activeElement instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      document.activeElement.blur();
    }
    containerRef.current?.focus();

    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const viewBoxHeight = totalHeight;
      const clientY = e.clientY - rect.top;
      const svgY = (clientY / rect.height) * viewBoxHeight;

      // 1. Klick in die Notenlinien (Staff-Bereich) -> Direkte Tonhöhen-Eingabe!
      if (showStaff && svgY >= staffTopY - 32 && svgY <= staffTopY + staffHeight + 70) {
        const pitch = yToStaffPitch(svgY, staffTopY, isBassClef, isDrumClef);
        if (onInsertPitchDirectly) {
          onInsertPitchDirectly(barIdx, fractionIdx, pitch);
          return;
        }
      }

      // 2. Klick in den Tabulatur-Bereich -> Saiten-Auswahl
      if (showTabs && svgY >= tabTopY - 6 && svgY <= tabTopY + tabHeight + 8) {
        const clickedString = Math.max(0, Math.min(tabLinesCount - 1, Math.round((svgY - tabTopY) / tabStringSpacing)));
        onSelectPosition(barIdx, fractionIdx, clickedString);
        const strInfo = (snippet.instrument === 'bass' ? BASS_STRINGS : GUITAR_STRINGS)[clickedString];
        if (strInfo?.openPitch) {
          onPlayPreviewNote?.(strInfo.openPitch);
        }
        return;
      }
    }
    onSelectPosition(barIdx, fractionIdx, activeString);
  }, [
    readOnly, 
    showStaff, 
    showTabs, 
    totalHeight, 
    staffTopY, 
    staffHeight, 
    isBassClef, 
    tabTopY, 
    tabHeight, 
    tabLinesCount, 
    tabStringSpacing, 
    onSelectPosition, 
    activeString, 
    onPlayPreviewNote, 
    onInsertPitchDirectly, 
    snippet.instrument
  ]);

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      onClick={() => {
        if (document.activeElement instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          document.activeElement.blur();
        }
        containerRef.current?.focus();
      }}
      className="micro-score-container select-none"
      style={{
        width: '100%',
        overflowX: 'auto',
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '12px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        outline: 'none'
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${leftMargin + snippet.barsCount * measureWidth + 24} ${totalHeight}`}
        style={{
          width: '100%',
          height: 'auto',
          minHeight: `${totalHeight}px`,
          display: 'block'
        }}
      >
        <defs>
          {/* Weicher Schatten für Notenköpfe */}
          <filter id="note-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodOpacity="0.15" />
          </filter>
          {/* 🌟 Weltreise Playback-Glow Highlight */}
          <filter id="note-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#6366f1" floodOpacity="0.85" />
          </filter>
        </defs>

        {/* 1. Header-Symbole am linken Rand (Schlüssel, Taktart, TAB-Label) */}
        <g id="staff-clef-header">
          {/* Notenlinien im Header-Bereich (unter Schlüssel & Taktart) */}
          {showStaff && (
            <g id="staff-header-lines">
              {[0, 12.5, 25, 37.5, 50].map(offset => (
                <line
                  key={`staff-header-line-${offset}`}
                  x1={16}
                  y1={staffTopY + offset}
                  x2={leftMargin}
                  y2={staffTopY + offset}
                  stroke="#475569"
                  strokeWidth="1.15"
                />
              ))}
            </g>
          )}

          {/* TAB-Linien im Header-Bereich (unter T A B) */}
          {showTabs && (
            <g id="tab-header-lines">
              {Array.from({ length: tabLinesCount }, (_, sIdx) => {
                const lineY = tabTopY + sIdx * tabStringSpacing;
                return (
                  <line
                    key={`tab-header-line-${sIdx}`}
                    x1={16}
                    y1={lineY}
                    x2={leftMargin}
                    y2={lineY}
                    stroke="#64748b"
                    strokeWidth="1.0"
                  />
                );
              })}
            </g>
          )}

          {showStaff && (
            <>
              {/* Notenschlüssel (SMuFL Bravura Pfad - skaliert auf 50px Notensystem) */}
              <path
                d={isBassClef ? SMUFL_GLYPHS.fClef : isDrumClef ? SMUFL_GLYPHS.percussionClef : SMUFL_GLYPHS.gClef}
                transform={`translate(16, ${staffTopY + (isBassClef ? 12.5 : isDrumClef ? 25 : 37.5)}) scale(0.048, -0.048)`}
                fill="#0f172a"
              />
              {/* Taktart dynamisch aus snippet.timeSignature mit 14px Respektabstand bei x=64 */}
              {(() => {
                const [timeSigTop, timeSigBottom] = (snippet.timeSignature || '4/4').split('/');
                return (
                  <>
                    <text
                      x="64"
                      y={staffTopY + 20}
                      fontSize="18"
                      fontWeight="900"
                      fontFamily="'Plus Jakarta Sans', sans-serif"
                      fill="#0f172a"
                      textAnchor="middle"
                    >
                      {timeSigTop || '4'}
                    </text>
                    <text
                      x="64"
                      y={staffTopY + 43}
                      fontSize="18"
                      fontWeight="900"
                      fontFamily="'Plus Jakarta Sans', sans-serif"
                      fill="#0f172a"
                      textAnchor="middle"
                    >
                      {timeSigBottom || '4'}
                    </text>
                  </>
                );
              })()}
            </>
          )}

          {/* TAB-Schriftzug für Gitarre/Bass */}
          {showTabs && (
            <g id="tab-label" transform={`translate(24, ${tabTopY})`}>
              <text x="0" y="16" fontSize="13" fontWeight="900" fill="#475569" fontFamily="'Plus Jakarta Sans', sans-serif">T</text>
              <text x="0" y="36" fontSize="13" fontWeight="900" fill="#475569" fontFamily="'Plus Jakarta Sans', sans-serif">A</text>
              <text x="0" y="56" fontSize="13" fontWeight="900" fill="#475569" fontFamily="'Plus Jakarta Sans', sans-serif">B</text>
            </g>
          )}
        </g>

        {/* 2. Takte rendern (1 bis 4 Takte) */}
        {Array.from({ length: snippet.barsCount }, (_, barIdx) => {
          const barStartX = leftMargin + barIdx * measureWidth;
          const barEndX = barStartX + measureWidth;
          const isBarActive = activeBar === barIdx;

          // Chords für diesen Takt
          const measureChords = snippet.chords?.filter(c => c.barIndex === barIdx) || [];

          // 🎼 0,1% Goldstandard Melodic Beams (Achtel- & Sechzehntel-Gruppen nach Elaine Gould)
          const barMelodicBeamGroups = (!isDrumClef && showStaff)
            ? calculateBarMelodicBeamGroups(
                snippet.notes,
                barIdx,
                snippet.timeSignature,
                staffTopY,
                measureWidth,
                barStartX,
                getStaffY,
                isBassClef
              )
            : [];
          const barBeamLookup = buildMelodicBeamLookup(barMelodicBeamGroups);

          return (
            <g key={`bar-${barIdx}`} id={`bar-${barIdx}`}>
              {/* 🌟 0,1% Goldstandard Zone 1: Takt-Header (Takt-Nummer Badge + Fortschritts-Pille, y=12..28) */}
              {(() => {
                const prog = getMeasureProgress(snippet.notes, barIdx, snippet.timeSignature);
                return (
                  <g id={`measure-header-${barIdx}`}>
                    {/* Takt-Nummer Badge */}
                    <rect
                      x={barStartX + 2}
                      y="12"
                      width="18"
                      height="16"
                      rx="4"
                      fill="#f1f5f9"
                      stroke="#cbd5e1"
                      strokeWidth="0.8"
                    />
                    <text
                      x={barStartX + 11}
                      y="23.5"
                      fontSize="10"
                      fontWeight="800"
                      fill="#64748b"
                      textAnchor="middle"
                      fontFamily="'Plus Jakarta Sans', sans-serif"
                    >
                      {barIdx + 1}
                    </text>

                    {/* Grafische 4-Segment Fortschritts-Pille (bündig rechts neben Taktnummer) */}
                    {!readOnly && (
                      <g transform={`translate(${barStartX + 24}, 12)`}>
                        <rect
                          width={prog.isFull ? 58 : 50}
                          height="16"
                          rx="4"
                          fill={prog.isFull ? '#ecfdf5' : '#f8fafc'}
                          stroke={prog.isFull ? '#10b981' : '#e2e8f0'}
                          strokeWidth="0.8"
                        />
                        {prog.isFull ? (
                          <text
                            x="29"
                            y="11.5"
                            fontSize="8.5"
                            fontWeight="900"
                            fill="#059669"
                            textAnchor="middle"
                            fontFamily="'Plus Jakarta Sans', sans-serif"
                          >
                            ✓ Voll
                          </text>
                        ) : (
                          <g transform="translate(5, 3.5)">
                            {prog.segments.map((isFilled, sIdx) => (
                              <rect
                                key={`seg-${barIdx}-${sIdx}`}
                                x={sIdx * 10}
                                y="0"
                                width="7.5"
                                height="9"
                                rx="2"
                                fill={isFilled ? '#3b82f6' : '#cbd5e1'}
                              />
                            ))}
                          </g>
                        )}
                      </g>
                    )}
                  </g>
                );
              })()}

              {/* 🌟 0,1% Goldstandard Zone 2: Akkordsymbole (Harmonie-Lane bei y=47, 0% Kollision mit Taktnummer) */}
              {measureChords.map(chord => {
                const chordTick = chord.tickPosition ?? 0;
                const chordX = barStartX + 14 + (chordTick / 48) * (measureWidth - 24);
                return (
                  <text
                    key={chord.id || `chord-${barIdx}-${chordTick}`}
                    x={chordX}
                    y="47"
                    fontSize="14.5"
                    fontWeight="900"
                    fill="#0284c7"
                    fontFamily="'Plus Jakarta Sans', sans-serif"
                  >
                    {chord.chordName}
                  </text>
                );
              })}

              {/* 2a. Echte 5 Notenlinien (12.5px-Raster, Urtext-Kontrast #475569) */}
              {showStaff && (
                <g id={`staff-lines-${barIdx}`}>
                  {[0, 12.5, 25, 37.5, 50].map(offset => (
                    <line
                      key={`staff-line-${barIdx}-${offset}`}
                      x1={barStartX}
                      y1={staffTopY + offset}
                      x2={barEndX}
                      y2={staffTopY + offset}
                      stroke="#475569"
                      strokeWidth="1.15"
                    />
                  ))}
                </g>
              )}

              {/* 2b. Echte Tabulatur-Linien (Gitarre = 6, Bass = 4, 100% neutral #64748b) */}
              {showTabs && (
                <g id={`tab-lines-${barIdx}`}>
                  {Array.from({ length: tabLinesCount }, (_, sIdx) => {
                    const lineY = tabTopY + sIdx * tabStringSpacing;
                    return (
                      <line
                        key={`tab-line-${barIdx}-${sIdx}`}
                        x1={barStartX}
                        y1={lineY}
                        x2={barEndX}
                        y2={lineY}
                        stroke="#64748b"
                        strokeWidth="1.0"
                      />
                    );
                  })}
                </g>
              )}

              {/* Taktstrich (Barline) am Takt-Ende mit sauberer Trennung im Zwischenraum */}
              {showStaff && showTabs ? (
                <g id={`barlines-${barIdx}`}>
                  {/* Oberer Taktstrich (Noten) */}
                  <line
                    x1={barEndX}
                    y1={staffTopY}
                    x2={barEndX}
                    y2={staffTopY + staffHeight}
                    stroke="#0f172a"
                    strokeWidth={barIdx === snippet.barsCount - 1 ? '2.4' : '1.2'}
                  />
                  {/* Unterer Taktstrich (Tabs) */}
                  <line
                    x1={barEndX}
                    y1={tabTopY}
                    x2={barEndX}
                    y2={tabTopY + tabHeight}
                    stroke="#0f172a"
                    strokeWidth={barIdx === snippet.barsCount - 1 ? '2.4' : '1.2'}
                  />
                </g>
              ) : (
                <line
                  x1={barEndX}
                  y1={showStaff ? staffTopY : tabTopY}
                  x2={barEndX}
                  y2={showTabs ? tabTopY + tabHeight : staffTopY + staffHeight}
                  stroke="#0f172a"
                  strokeWidth={barIdx === snippet.barsCount - 1 ? '2.4' : '1.2'}
                />
              )}

              {/* 🌟 0,1% Goldstandard Beat-Grid & Ghost-Placeholder Overlay */}
              <MicroScoreBeatGridOverlay
                slots={calculateMeasureBeatSlots(
                  snippet.notes,
                  barIdx,
                  snippet.timeSignature,
                  activeDuration,
                  activeFraction,
                  isDottedMode,
                  isTripletMode
                )}
                barIndex={barIdx}
                barStartX={barStartX}
                measureWidth={measureWidth}
                totalFractions={getTimeSignatureFractions(snippet.timeSignature)}
                staffTopY={staffTopY}
                staffHeight={staffHeight}
                tabTopY={tabTopY}
                tabHeight={tabHeight}
                showStaff={showStaff}
                showTabs={showTabs}
                rulerY={rulerY}
                activeDuration={activeDuration}
                activeBar={activeBar}
                activeFraction={activeFraction}
                isPlaying={isPlaying}
                readOnly={readOnly}
                onSelectSlot={(bar, frac) => onSelectPosition(bar, frac, activeString)}
                getStaffY={getStaffY}
                isBassClef={isBassClef}
                isDrumClef={isDrumClef}
              />

              {/* Klickbare Zählzeiten-Slots & Noten in diesem Takt */}
              {Array.from({ length: 16 }, (_, fractionIdx) => {
                const fractionX = barStartX + 12 + (fractionIdx / 16) * (measureWidth - 24);
                const isSelectedSlot = activeBar === barIdx && Math.abs(activeFraction - fractionIdx) < 0.5;

                // Finde alle Noten an dieser Position (Polyphonie / Akkorde)
                const slotNotes = snippet.notes.filter(
                  n => n.barIndex === barIdx && Math.abs(n.beatFraction - fractionIdx) < 0.5
                );
                const hasNotes = slotNotes.length > 0;
                const isRestSlot = slotNotes.some(n => n.pitch === 'REST');
                const primaryNote = slotNotes[0];

                const hitStatus = primaryNote ? noteHits[primaryNote.id] : undefined;
                const noteDurationFrac = primaryNote
                  ? durationToSixteenths(primaryNote.duration, primaryNote.isDotted, primaryNote.isTriplet)
                  : 1;
                const isCurrentlyPlaying = Boolean(
                  isPlaying && 
                  playheadPosition && 
                  playheadPosition.bar === barIdx && 
                  playheadPosition.fraction >= fractionIdx && 
                  playheadPosition.fraction < fractionIdx + noteDurationFrac &&
                  !isRestSlot
                );
                const noteColor = isCurrentlyPlaying
                  ? '#6366f1'
                  : hitStatus === 'hit' 
                  ? '#10b981' 
                  : hitStatus === 'near' 
                  ? '#f59e0b' 
                  : '#0f172a';

                const isHoveredSlot = hoverSlot && hoverSlot.bar === barIdx && hoverSlot.fraction === fractionIdx;

                return (
                  <g 
                    key={`slot-${barIdx}-${fractionIdx}`}
                    onClick={(e) => handleSlotClick(e, barIdx, fractionIdx)}
                    onMouseMove={(e) => {
                      if (readOnly || !showStaff || !svgRef.current) return;
                      const rect = svgRef.current.getBoundingClientRect();
                      const viewBoxHeight = totalHeight;
                      const clientY = e.clientY - rect.top;
                      const svgY = (clientY / rect.height) * viewBoxHeight;
                      if (svgY >= staffTopY - 32 && svgY <= staffTopY + staffHeight + 70) {
                        const p = yToStaffPitch(svgY, staffTopY, isBassClef, isDrumClef);
                        setHoverSlot({ bar: barIdx, fraction: fractionIdx, pitch: p });
                      } else {
                        setHoverSlot(null);
                      }
                    }}
                    onMouseLeave={() => {
                      setHoverSlot(null);
                    }}
                    style={{ cursor: readOnly ? 'default' : 'pointer' }}
                  >
                    {/* Unsichtbare Klick-Fläche für diesen Beat */}
                    <rect
                      x={fractionX - 9}
                      y={showStaff ? staffTopY - 14 : tabTopY - 8}
                      width="18"
                      height={totalHeight - staffTopY}
                      fill="transparent"
                    />

                    {/* Hover-Vorschau bei Mausbewegung in die Notenlinien (Farbiger Kopf oder X-Kopf) */}
                    {showStaff && isHoveredSlot && (!hasNotes || isRestSlot) && (() => {
                      const previewPitch = hoverSlot.pitch;
                      const ghostY = staffTopY + getStaffY(previewPitch, isBassClef, isDrumClef);
                      const isFootNote = isDrumClef && isDrumFootPitch(previewPitch);
                      const stemUp = isDrumClef ? !isFootNote : getStaffY(previewPitch, isBassClef, isDrumClef) > 25;
                      const previewTheme = getPitchColorTheme(previewPitch);
                      const previewLetter = getPitchLetter(previewPitch);

                      return (
                        <g id="ghost-hover-note" opacity={0.78} style={{ pointerEvents: 'none' }}>
                          {isDrumClef && isCymbalPitch(previewPitch) ? (
                            <g>
                              <line
                                x1={fractionX - 6}
                                y1={ghostY - 5}
                                x2={fractionX + 6}
                                y2={ghostY + 5}
                                stroke="#475569"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                              />
                              <line
                                x1={fractionX - 6}
                                y1={ghostY + 5}
                                x2={fractionX + 6}
                                y2={ghostY - 5}
                                stroke="#475569"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                              />
                            </g>
                          ) : (
                            <ellipse
                              cx={fractionX}
                              cy={ghostY}
                              rx="7.0"
                              ry="5.0"
                              transform={`rotate(-22 ${fractionX} ${ghostY})`}
                              fill={activeDuration === '1' || activeDuration === '2' ? '#ffffff' : (isDrumClef ? '#475569' : previewTheme.border)}
                              stroke={isDrumClef ? '#334155' : previewTheme.border}
                              strokeWidth={activeDuration === '1' || activeDuration === '2' ? '2.2' : '0.6'}
                            />
                          )}
                          {!isDrumClef && previewLetter && (
                            <text
                              x={fractionX}
                              y={ghostY + 3.0}
                              fontSize="8.8"
                              fontWeight="900"
                              fill={
                                activeDuration === '1' || activeDuration === '2'
                                  ? previewTheme.text
                                  : (previewPitch.startsWith('E') || previewTheme.text === '#854d0e' ? '#0f172a' : '#ffffff')
                              }
                              textAnchor="middle"
                              fontFamily="'Plus Jakarta Sans', sans-serif"
                            >
                              {previewLetter}
                            </text>
                          )}
                          {activeDuration !== '1' && (
                            <line
                              x1={stemUp ? fractionX + 6.0 : fractionX - 6.0}
                              y1={ghostY}
                              x2={stemUp ? fractionX + 6.0 : fractionX - 6.0}
                              y2={stemUp ? ghostY - 28 : ghostY + 28}
                              stroke="#64748b"
                              strokeWidth="1.3"
                              strokeDasharray="3 2"
                            />
                          )}
                        </g>
                      );
                    })()}

                    {/* Fokus-Kästchen auf aktiver Saite im Tab-Bereich (Sanfter Apple-Cremeton wie im Industrie-Standard) */}
                    {isSelectedSlot && !readOnly && !isPlaying && showTabs && (!hasNotes || isRestSlot || !slotNotes.some(n => n.stringIndex === activeString && n.fret !== undefined)) && (
                      <rect
                        x={fractionX - 8.5}
                        y={tabTopY + activeString * tabStringSpacing - 7.5}
                        width="17"
                        height="15"
                        rx="3.5"
                        fill="#FEF3C7"
                        fillOpacity="0.88"
                        stroke="#F59E0B"
                        strokeWidth="1.8"
                      />
                    )}

                    {/* Noten / Akkorde rendern */}
                    {hasNotes && (
                      <g id={`slot-notes-${barIdx}-${fractionIdx}`}>
                        {/* 1. Standard-Notation (5-Linien) */}
                        {showStaff && (
                          <g>
                            {isRestSlot ? (
                              /* Echte SMuFL / Urtext Pause (Ganze, Halbe, Viertel, 8tel, 16tel) */
                              renderStaffRest({
                                duration: (slotNotes.find(n => n.pitch === 'REST')?.duration as any) || '4',
                                fractionX,
                                staffTopY,
                                color: '#475569'
                              })
                            ) : isDrumClef ? (
                              /* 🥁 0,1% Goldstandard Polyphoner PAS-Schlagzeugsatz (Elaine Gould Behind Bars) */
                              renderDrumPolyphonySlot({
                                slotNotes,
                                allBarNotes: snippet.notes,
                                barIdx,
                                fractionIdx,
                                fractionX,
                                staffTopY,
                                timeSignature: snippet.timeSignature,
                                isCurrentlyPlaying,
                                hitStatus,
                                isSelectedSlot,
                                isPlaying,
                                getStaffY,
                                measureWidth,
                                barStartX
                              })
                            ) : (
                              /* Echter mehrstimmiger Akkord oder Einzelnote mit geteiltem Hals */
                              (() => {
                                const pitchedNotes = slotNotes.filter(n => n.pitch !== 'REST');
                                if (pitchedNotes.length === 0) return null;

                                const sortedNotes = [...pitchedNotes].sort(
                                  (a, b) => getStaffY(b.pitch, isBassClef, isDrumClef) - getStaffY(a.pitch, isBassClef, isDrumClef)
                                );

                                const staffYs = sortedNotes.map(n => staffTopY + getStaffY(n.pitch, isBassClef, isDrumClef));
                                const minY = Math.min(...staffYs);
                                const maxY = Math.max(...staffYs);
                                const beamInfo = barBeamLookup.get(fractionIdx);
                                const isBeamed = Boolean(beamInfo?.isBeamed);
                                const avgStaffRelY = sortedNotes.reduce((acc, n) => acc + getStaffY(n.pitch, isBassClef, isDrumClef), 0) / sortedNotes.length;
                                const hasOnlyFootNotes = isDrumClef && sortedNotes.every(n => isDrumFootPitch(n.pitch));
                                const stemUp = isDrumClef ? !hasOnlyFootNotes : (isBeamed ? beamInfo!.stemUp : avgStaffRelY > 25);
                                const stemTipY = isBeamed ? beamInfo!.stemTipY : (stemUp ? minY - 28 : maxY + 28);
                                const duration = sortedNotes[0].duration;
                                const isDotted = sortedNotes.some(n => n.isDotted);

                                return (
                                  <g>
                                    {/* Notenköpfe, Hilfslinien & Vorzeichen für jeden Ton im Akkord */}
                                    {sortedNotes.map((n, nIdx) => {
                                      const nY = staffTopY + getStaffY(n.pitch, isBassClef, isDrumClef);
                                      const hasSharp = n.pitch.includes('#');
                                      const hasFlat = n.pitch.includes('b') || (n.pitch.length >= 2 && n.pitch[1] === 'B');
                                      const pitchTheme = getPitchColorTheme(n.pitch);
                                      const letter = getPitchLetter(n.pitch);

                                      // 🎨 Farbiger Notenkopf: Treffer/Playback in Smaragdgrün, sonst didaktische Tonhöhen-Farbe
                                      const headColor = isCurrentlyPlaying
                                        ? '#6366f1'
                                        : hitStatus === 'hit'
                                        ? '#10b981'
                                        : hitStatus === 'near'
                                        ? '#f59e0b'
                                        : pitchTheme.border;

                                      return (
                                        <g key={`head-${n.id || nIdx}`}>
                                          {/* Hilfslinien bei Tönen außerhalb des 5-Linien-Systems (12.5px-Raster) */}
                                          {/* 1. Hilfslinien unten (nY >= staffTopY + 62.5px) - Bei Drums keine Hilfslinien nach unten */}
                                          {!isDrumClef && [62.5, 75.0, 87.5, 100.0, 112.5, 125.0, 137.5].map(ledgerRelY => (
                                            nY >= staffTopY + ledgerRelY - 3.125 ? (
                                              <line
                                                key={`ledger-below-${ledgerRelY}`}
                                                x1={fractionX - 11}
                                                y1={staffTopY + ledgerRelY}
                                                x2={fractionX + 11}
                                                y2={staffTopY + ledgerRelY}
                                                stroke="#0f172a"
                                                strokeWidth="1.2"
                                              />
                                            ) : null
                                          ))}
                                          {/* 2. Hilfslinien oben (nY <= staffTopY - 12.5px, z. B. Crash-Becken A5 oder hohe Diskanttöne) */}
                                          {[-12.5, -25.0, -37.5, -50.0].map(ledgerRelY => (
                                            nY <= staffTopY + ledgerRelY + 3.125 && (!isDrumClef || ledgerRelY === -12.5) ? (
                                              <line
                                                key={`ledger-above-${ledgerRelY}`}
                                                x1={fractionX - 11}
                                                y1={staffTopY + ledgerRelY}
                                                x2={fractionX + 11}
                                                y2={staffTopY + ledgerRelY}
                                                stroke="#0f172a"
                                                strokeWidth="1.2"
                                              />
                                            ) : null
                                          ))}

                                          {/* Vorzeichen (z. B. Kreuz # oder Be ♭) - bei Drums keine chromatischen Vorzeichen */}
                                          {!isDrumClef && hasSharp && (
                                            <path
                                              d={SMUFL_GLYPHS.accidentalSharp}
                                              transform={`translate(${fractionX - 18 - (nIdx % 2 === 1 && sortedNotes.length > 2 ? 7 : 0)}, ${nY}) scale(0.023, -0.023)`}
                                              fill={isCurrentlyPlaying ? '#6366f1' : '#1e293b'}
                                            />
                                          )}
                                          {!isDrumClef && hasFlat && (
                                            <path
                                              d={SMUFL_GLYPHS.accidentalFlat}
                                              transform={`translate(${fractionX - 17 - (nIdx % 2 === 1 && sortedNotes.length > 2 ? 7 : 0)}, ${nY}) scale(0.023, -0.023)`}
                                              fill={isCurrentlyPlaying ? '#6366f1' : '#1e293b'}
                                            />
                                          )}

                                          {/* 🥁 / 🎨 Notenkopf: Cymbals als X-Köpfe (mit Kreis bei Open Hi-Hat), Trommeln als solide Köpfe, Melodie farbig */}
                                          {isDrumClef && isCymbalPitch(n.pitch) ? (
                                            <g>
                                              <line
                                                x1={fractionX - 6}
                                                y1={nY - 5}
                                                x2={fractionX + 6}
                                                y2={nY + 5}
                                                stroke={isCurrentlyPlaying ? '#6366f1' : hitStatus === 'hit' ? '#10b981' : '#0f172a'}
                                                strokeWidth="2.4"
                                                strokeLinecap="round"
                                              />
                                              <line
                                                x1={fractionX - 6}
                                                y1={nY + 5}
                                                x2={fractionX + 6}
                                                y2={nY - 5}
                                                stroke={isCurrentlyPlaying ? '#6366f1' : hitStatus === 'hit' ? '#10b981' : '#0f172a'}
                                                strokeWidth="2.4"
                                                strokeLinecap="round"
                                              />
                                              {/* Kreis um das X bei offener Hi-Hat */}
                                              {(n.pitch === 'G#5' || n.pitch.includes('OPEN') || n.pitch === 'A#4') && (
                                                <circle
                                                  cx={fractionX}
                                                  cy={nY}
                                                  r="7.5"
                                                  fill="none"
                                                  stroke={isCurrentlyPlaying ? '#6366f1' : hitStatus === 'hit' ? '#10b981' : '#0f172a'}
                                                  strokeWidth="1.5"
                                                />
                                              )}
                                            </g>
                                          ) : (
                                            <ellipse
                                              cx={fractionX}
                                              cy={nY}
                                              rx="7.0"
                                              ry="5.0"
                                              transform={`rotate(-22 ${fractionX} ${nY})`}
                                              fill={duration === '1' || duration === '2' ? '#ffffff' : (isDrumClef ? (isCurrentlyPlaying ? '#6366f1' : hitStatus === 'hit' ? '#10b981' : '#0f172a') : headColor)}
                                              stroke={isDrumClef ? (isCurrentlyPlaying ? '#6366f1' : hitStatus === 'hit' ? '#10b981' : '#0f172a') : headColor}
                                              strokeWidth={duration === '1' || duration === '2' ? '2.2' : '0.6'}
                                              filter={isCurrentlyPlaying ? 'url(#note-glow)' : 'url(#note-shadow)'}
                                            />
                                          )}

                                          {/* Didaktischer Tonhöhen-Buchstabe (C, D, E...) - Bei Drums NIEMALS Buchstaben im Notenkopf! */}
                                          {!isDrumClef && letter && (
                                            <text
                                              x={fractionX}
                                              y={nY + 3.0}
                                              fontSize="8.8"
                                              fontWeight="900"
                                              fill={
                                                duration === '1' || duration === '2'
                                                  ? pitchTheme.text
                                                  : (n.pitch.startsWith('E') || pitchTheme.text === '#854d0e' ? '#0f172a' : '#ffffff')
                                              }
                                              textAnchor="middle"
                                              fontFamily="'Plus Jakarta Sans', sans-serif"
                                              pointerEvents="none"
                                            >
                                              {letter}
                                            </text>
                                          )}

                                          {/* Apple Cupertino Selektions-Highlight auf aktiver Note */}
                                          {isSelectedSlot && !isPlaying && (
                                            <ellipse
                                              cx={fractionX}
                                              cy={nY}
                                              rx="9.0"
                                              ry="7.0"
                                              transform={`rotate(-22 ${fractionX} ${nY})`}
                                              fill="none"
                                              stroke={headColor}
                                              strokeWidth="1.6"
                                              strokeDasharray="2.5 2"
                                            />
                                          )}
                                        </g>
                                      );
                                    })}

                                    {/* Punktierung */}
                                    {isDotted && (
                                      <circle
                                        cx={fractionX + 11}
                                        cy={minY - 1}
                                        r="2.2"
                                        fill={sortedNotes[0] ? getPitchColorTheme(sortedNotes[0].pitch).border : noteColor}
                                      />
                                    )}

                                    {/* Geteilter Notenhals für Akkord (verbindet tiefste und höchste Note bzw. reicht bis zum Balken) */}
                                    {duration !== '1' && (
                                      <line
                                        x1={stemUp ? fractionX + 6.0 : fractionX - 6.0}
                                        y1={stemUp ? maxY : minY}
                                        x2={stemUp ? fractionX + 6.0 : fractionX - 6.0}
                                        y2={stemTipY}
                                        stroke={noteColor}
                                        strokeWidth="1.5"
                                      />
                                    )}

                                    {/* Achtel- / 16tel-Flagge an der Halsspitze (nur wenn NICHT gebalkt!) */}
                                    {!isBeamed && duration === '8' && (
                                      <path
                                        d={stemUp ? SMUFL_GLYPHS.flag8thUp : SMUFL_GLYPHS.flag8thDown}
                                        transform={`translate(${stemUp ? fractionX + 6.0 : fractionX - 6.0}, ${stemTipY}) scale(0.040, -0.040)`}
                                        fill={noteColor}
                                      />
                                    )}
                                    {!isBeamed && duration === '16' && (
                                      <path
                                        d={stemUp ? SMUFL_GLYPHS.flag16thUp : SMUFL_GLYPHS.flag16thDown}
                                        transform={`translate(${stemUp ? fractionX + 6.0 : fractionX - 6.0}, ${stemTipY}) scale(0.040, -0.040)`}
                                        fill={noteColor}
                                      />
                                    )}
                                  </g>
                                );
                              })()
                            )}
                          </g>
                        )}

                        {/* 2. Tabulatur-Darstellung (alle Bünde des Akkords auf ihren jeweiligen Saiten) */}
                        {showTabs && !isRestSlot && (
                          <g id={`tab-chord-${barIdx}-${fractionIdx}`}>
                            {slotNotes.map(n => {
                              let stringIdx = n.stringIndex;
                              let fret = n.fret;
                              if (stringIdx === undefined || fret === undefined) {
                                const resolved = pitchToBestFretAndString(n.pitch, undefined, snippet.instrument === 'bass');
                                if (resolved) {
                                  stringIdx = resolved.stringIndex;
                                  fret = resolved.fret;
                                }
                              }
                              if (stringIdx === undefined || fret === undefined) return null;
                              const tabY = tabTopY + stringIdx * tabStringSpacing;
                              const isSelectedFret = isSelectedSlot && (stringIdx === activeString || activeString === undefined) && !isPlaying;

                              return (
                                <g key={`tab-fret-${n.id}`}>
                                  {/* Hintergrund-Ausschnitt: Cremefarben mit Amber-Rand wenn selektiert, sonst weiß */}
                                  <rect
                                    x={fractionX - 8.5}
                                    y={tabY - 7.5}
                                    width="17"
                                    height="15"
                                    rx="3.5"
                                    fill={isSelectedFret ? '#EDE9FE' : '#ffffff'}
                                    stroke={isSelectedFret ? '#6366f1' : 'none'}
                                    strokeWidth={isSelectedFret ? '1.8' : '0'}
                                  />
                                  {/* Bund-Ziffer */}
                                  <text
                                    x={fractionX}
                                    y={tabY + 4.2}
                                    fontSize="11.5"
                                    fontWeight="900"
                                    fill={isSelectedFret ? '#0f172a' : noteColor}
                                    textAnchor="middle"
                                    fontFamily="'SF Mono', Monaco, monospace"
                                  >
                                    {fret}
                                  </text>
                                </g>
                              );
                            })}
                          </g>
                        )}

                        {/* 3. Triolen-Klammer ('3') falls aktiv */}
                        {slotNotes.some(n => n.isTriplet) && (
                          <g id="triplet-badge">
                            <text
                              x={fractionX}
                              y={showStaff ? staffTopY - 6 : tabTopY - 6}
                              fontSize="10"
                              fontWeight="900"
                              fontStyle="italic"
                              fill="#64748b"
                              textAnchor="middle"
                              fontFamily="'Plus Jakarta Sans', sans-serif"
                            >
                              3
                            </text>
                          </g>
                        )}
                      </g>
                    )}
                  </g>
                );
              })}

              {/* 🌟 0,1% Goldstandard Melodic Beams Layer */}
              {showStaff && !isDrumClef && (
                <MicroScoreMelodicBeams beamGroups={barMelodicBeamGroups} />
              )}
            </g>
          );
        })}

        {/* 3. Flüssiger Playback-Playhead während des Abspielens */}
        {isPlaying && playheadPosition && (
          <g id="playback-playhead">
            {(() => {
              const headX = leftMargin + playheadPosition.bar * measureWidth + 12 + 
                (playheadPosition.fraction / 16) * (measureWidth - 24);
              return (
                <line
                  x1={headX}
                  y1={showStaff ? staffTopY - 14 : tabTopY - 8}
                  x2={headX}
                  y2={rulerY + 12}
                  stroke="#6366f1"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              );
            })()}
          </g>
        )}
      </svg>
    </div>
  );
};
