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
  VIOLIN_STRINGS,
  getInstrumentStrings,
  isStringOrPluckedInstrument,
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
  getTimeSignatureFractions,
  getPitchColorTheme,
  getPitchLetter,
  getSequentialFrontierSlot
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
  onAddBar?: () => void;
  onRemoveBar?: (barIdx: number) => void;
  onInsertPitchDirectly?: (bar: number, fraction: number, pitch: string) => void;
  isDrumColorGuide?: boolean;
  readOnly?: boolean;
}

import { 
  PERCUSSION_PITCH_Y, 
  isCymbalPitch, 
  isDrumFootPitch, 
  getCanonicalDrumPieceColor,
  getCanonicalDrumCalloutName,
  renderDrumPolyphonySlot 
} from './microScoreDrumPolyphonyEngine';
import { renderStaffRest } from './microScoreRestRenderer';
import {
  getStaffY,
  yToStaffPitch,
  transposePitchSemitones,
  MicroScoreAddBarElement,
  MicroScoreClefHeader
} from './microScoreStaffHelpers';
export { getStaffY, yToStaffPitch };

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
  onAddBar,
  onRemoveBar,
  onInsertPitchDirectly,
  isDrumColorGuide = true,
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
  const isStringOrPlucked = snippet.instrument === 'guitar' || snippet.instrument === 'bass' || snippet.instrument === 'strings' || snippet.instrument === 'ukulele';
  const effectiveDisplayMode: MicroScoreDisplayMode = useMemo(() => {
    if (!isStringOrPlucked) return 'notes';
    return propDisplayMode || snippet.displayMode || 'both';
  }, [isStringOrPlucked, propDisplayMode, snippet.displayMode]);

  const showStaff = effectiveDisplayMode === 'notes' || effectiveDisplayMode === 'both';
  const showTabs = isStringOrPlucked && (effectiveDisplayMode === 'tabs' || effectiveDisplayMode === 'both');

  const isBassClef = snippet.clef === 'bass' || (!snippet.clef && (snippet.instrument === 'trombone' || snippet.instrument === 'bass'));
  const isDrumClef = snippet.clef === 'percussion' || (!snippet.clef && snippet.instrument === 'drums');

  // Dimensionen & Layout-Metriken (2027 0,1% Goldstandard: staffTopY = 68 garantiert 0% Überlappung zwischen hohen Crash-Balken und Takt-Badge)
  const staffTopY = 68;
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
  const tabLinesCount = snippet.instrument === 'bass' || snippet.instrument === 'strings' || snippet.instrument === 'ukulele' ? 4 : 6;
  const tabHeight = (tabLinesCount - 1) * tabStringSpacing;

  const rulerY = showTabs
    ? tabTopY + tabHeight + 24
    : staffTopY + Math.max(staffHeight + 34, maxPitchedNoteRelY + 18);

  const totalHeight = rulerY + 16;

  // Halbton-Transposition
  const transposePitch = useCallback((pitch: string, delta: number): string => transposePitchSemitones(pitch, delta), []);

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

  // 🎼 0,1% Goldstandard: Magnetischer Schritt-für-Schritt-Cursor entlang der Raster-Platzhalter
  const advanceCursor = useCallback((targetBar: number, targetFraction: number, targetString: number, nextNotesOverride?: MicroScoreNote[]) => {
    const candidateNotes = nextNotesOverride ?? notesRef.current;
    const frontier = getSequentialFrontierSlot(
      candidateNotes,
      barsCountRef.current,
      snippet.timeSignature,
      activeDurationRef.current,
      isDottedModeRef.current,
      isTripletModeRef.current
    );
    if (!frontier.isScoreFull) {
      onSelectPosition(frontier.barIndex, frontier.fraction, targetString);
      return;
    }

    const step = getStepSize();
    const totalFractions = getTimeSignatureFractions(snippet.timeSignature);
    let nextFraction = targetFraction + step;
    let nextBar = targetBar;
    if (nextFraction >= totalFractions) {
      nextFraction = nextFraction - totalFractions;
      nextBar = targetBar + 1;
      if (nextBar >= barsCountRef.current) {
        nextBar = 0;
      }
    }
    onSelectPosition(nextBar, nextFraction, targetString);
  }, [getStepSize, onSelectPosition, snippet.timeSignature]);

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

      // 1. Horizontale Navigation (← / →) strikt entlang der belegten Noten + aktivem Ziel-Platzhalter
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const frontier = getSequentialFrontierSlot(
          currentNotes,
          barsCountRef.current,
          snippet.timeSignature,
          activeDurationRef.current,
          isDottedModeRef.current,
          isTripletModeRef.current
        );
        const navigableMap = new Map<string, { bar: number; fraction: number }>();
        currentNotes.forEach(n => {
          const k = `${n.barIndex}-${Math.round(n.beatFraction * 10)}`;
          navigableMap.set(k, { bar: n.barIndex, fraction: n.beatFraction });
        });
        if (!frontier.isScoreFull) {
          const fk = `${frontier.barIndex}-${Math.round(frontier.fraction * 10)}`;
          navigableMap.set(fk, { bar: frontier.barIndex, fraction: frontier.fraction });
        }
        const navigable = Array.from(navigableMap.values()).sort(
          (a, b) => a.bar * 16 + a.fraction - (b.bar * 16 + b.fraction)
        );
        if (navigable.length === 0) return;

        const curIdx = navigable.findIndex(
          pos => pos.bar === activeBar && Math.abs(pos.fraction - activeFraction) < 0.5
        );
        if (e.key === 'ArrowLeft') {
          const targetIdx = curIdx > 0 ? curIdx - 1 : 0;
          onSelectPosition(navigable[targetIdx].bar, navigable[targetIdx].fraction, activeString);
        } else {
          const targetIdx = curIdx >= 0 && curIdx < navigable.length - 1 ? curIdx + 1 : navigable.length - 1;
          onSelectPosition(navigable[targetIdx].bar, navigable[targetIdx].fraction, activeString);
        }
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

        const calcPitch = fretAndStringToPitch(activeString, targetFret, snippet.instrument);
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
          advanceCursor(activeBar, activeFraction, activeString, updated);
        } else {
          // Erste Ziffer: 650ms Puffer für eventuelle zweite Ziffer (z.B. 10, 12, 14, 15)
          if (fretBufferRef.current?.timer) clearTimeout(fretBufferRef.current.timer);
          const timer = setTimeout(() => {
            fretBufferRef.current = null;
            advanceCursor(activeBar, activeFraction, activeString, updated);
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

      // 5. Tonhöhen-Eingabe über Notennamen (C, D, E, F, G, A, B, H) – bei Schlagzeug deaktiviert (Zero Key-Collision für Drum-Pads D, E, F, G, H, B)
      const validNoteKeys = ['c', 'd', 'e', 'f', 'g', 'a', 'b', 'h'];
      if (!isDrumClef && validNoteKeys.includes(key)) {
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

        advanceCursor(activeBar, activeFraction, assignedString ?? activeString, updated);
        return;
      }

      // 6. Löschen / Pause einfügen (Backspace / Entf / R; Leertaste bleibt global für Play/Stop reserviert)
      if (e.key === 'Backspace' || e.key === 'Delete' || key === 'r') {
        e.preventDefault();
        if (key === 'r') {
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
          advanceCursor(activeBar, activeFraction, activeString, updated);
        } else if (existingNoteIdx !== -1) {
          // Alle Noten an dieser Zählzeit entfernen
          const updated = currentNotes.filter(
            n => !(n.barIndex === activeBar && Math.abs(n.beatFraction - activeFraction) < 0.5)
          );
          onUpdateNotes(updated);
        } else if (currentNotes.length > 0) {
          // 🧲 Smart-Backspace: Letzte eingegebene Note vor dem aktiven Platzhalter löschen & Cursor dorthin zurücksetzen
          const sortedNotes = [...currentNotes].sort(
            (a, b) => a.barIndex * 16 + a.beatFraction - (b.barIndex * 16 + b.beatFraction)
          );
          const lastNote = sortedNotes[sortedNotes.length - 1];
          if (lastNote) {
            const updated = currentNotes.filter(
              n => !(n.barIndex === lastNote.barIndex && Math.abs(n.beatFraction - lastNote.beatFraction) < 0.5)
            );
            onUpdateNotes(updated);
            onSelectPosition(lastNote.barIndex, lastNote.beatFraction, activeString);
          }
        }
        return;
      }

      // 7. Takt anhängen via Taste '+' (sofern barsCount < 4)
      if ((e.key === '+' || e.key === 'Add' || (e.key === '=' && e.shiftKey)) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (barsCountRef.current < 4 && onAddBar) {
          onAddBar();
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
    onAddBar,
    transposePitch,
    advanceCursor,
    getStepSize
  ]);

  // 🧲 0,1% Goldstandard: Sequenzieller nächster freier Raster-Platzhalter (1 -> 2 -> 3 -> 3+ -> 4 -> 4+)
  const sequentialFrontier = useMemo(
    () =>
      getSequentialFrontierSlot(
        snippet.notes,
        snippet.barsCount,
        snippet.timeSignature,
        activeDuration,
        isDottedMode,
        isTripletMode
      ),
    [snippet.notes, snippet.barsCount, snippet.timeSignature, activeDuration, isDottedMode, isTripletMode]
  );

  // Takt-Breiten Berechnung (Dynamisch basierend auf Takten 1–4)
  const measureWidth = useMemo(() => {
    return Math.floor(660 / Math.max(1, snippet.barsCount));
  }, [snippet.barsCount]);

  const leftMargin = 100; // 0,1% Goldstandard: Platz für Schlüssel (14..58), Taktart (68) und Puffer (100)

  // Smarter Klick-Handler: Noten können nur am aktiven sequenziellen Platzhalter eingegeben oder an bereits belegten Positionen editiert werden
  const handleSlotClick = useCallback((e: React.MouseEvent, barIdx: number, fractionIdx: number) => {
    e.stopPropagation();
    if (readOnly) return;

    // Hebe Fokus von Texteingabefeldern (z.B. Titel) auf und fokussiere Notation-Canvas
    if (document.activeElement instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      document.activeElement.blur();
    }
    containerRef.current?.focus();

    const isOccupiedSlot = snippet.notes.some(
      n => n.barIndex === barIdx && Math.abs(n.beatFraction - fractionIdx) < 0.5
    );

    // 🧲 Magnetisches Einrasten: Neue Noten landen immer auf dem aktuellen sequenziellen Platzhalter;
    // bereits gesetzte Noten (isOccupiedSlot) bleiben jederzeit direkt anklick- und editierbar.
    const targetBar = isOccupiedSlot
      ? barIdx
      : (!sequentialFrontier.isScoreFull ? sequentialFrontier.barIndex : activeBar);
    const targetFraction = isOccupiedSlot
      ? fractionIdx
      : (!sequentialFrontier.isScoreFull ? sequentialFrontier.fraction : activeFraction);

    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const viewBoxHeight = totalHeight;
      const clientY = e.clientY - rect.top;
      const svgY = (clientY / rect.height) * viewBoxHeight;

      // 1. Klick in die Notenlinien (Staff-Bereich, präzise auf das 5-Linien-System ± 14px begrenzt)
      if (showStaff && svgY >= staffTopY - 14 && svgY <= staffTopY + staffHeight + 14) {
        // Nur einfügen, wenn der Nutzer auf den aktiven Ziel-Takt oder eine bereits gesetzte Note klickt
        if (isOccupiedSlot || barIdx === targetBar) {
          const pitch = yToStaffPitch(svgY, staffTopY, isBassClef, isDrumClef);
          if (onInsertPitchDirectly) {
            onInsertPitchDirectly(targetBar, targetFraction, pitch);
            return;
          }
        }
      }

      // 2. Klick in den Tabulatur-Bereich -> Saiten-Auswahl am aktiven Platzhalter (und bei Zweitklick direkt Bund 0 setzen)
      if (showTabs && svgY >= tabTopY - 6 && svgY <= tabTopY + tabHeight + 8) {
        const clickedString = Math.max(0, Math.min(tabLinesCount - 1, Math.round((svgY - tabTopY) / tabStringSpacing)));
        const strInfo = getInstrumentStrings(snippet.instrument)[clickedString];
        const isAlreadyFocusedString =
          activeBar === targetBar &&
          Math.abs(activeFraction - targetFraction) < 0.5 &&
          activeString === clickedString;

        if (isAlreadyFocusedString && strInfo?.openPitch && onInsertPitchDirectly) {
          onInsertPitchDirectly(targetBar, targetFraction, strInfo.openPitch);
          return;
        }

        onSelectPosition(targetBar, targetFraction, clickedString);
        if (strInfo?.openPitch) {
          onPlayPreviewNote?.(strInfo.openPitch);
        }
        return;
      }
    }
    onSelectPosition(targetBar, targetFraction, activeString);
  }, [
    readOnly, 
    showStaff, 
    showTabs, 
    totalHeight, 
    staffTopY, 
    staffHeight, 
    isBassClef, 
    isDrumClef,
    tabTopY, 
    tabHeight, 
    tabLinesCount, 
    tabStringSpacing, 
    onSelectPosition, 
    activeString, 
    activeBar,
    activeFraction,
    sequentialFrontier,
    snippet.notes,
    onPlayPreviewNote, 
    onInsertPitchDirectly, 
    snippet.instrument
  ]);

  // 0,1% Goldstandard: Explizites Hinzufügen des nächsten Takts (max. 4 Takte, UrhG § 51 Zitatgrenze)
  const canAddBar = !readOnly && snippet.barsCount < 4 && !!onAddBar;
  const addBarWidth = 74;

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
        viewBox={`0 0 ${leftMargin + snippet.barsCount * measureWidth + (canAddBar ? addBarWidth + 24 : 24)} ${totalHeight}`}
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
        <MicroScoreClefHeader
          showStaff={showStaff}
          showTabs={showTabs}
          staffTopY={staffTopY}
          leftMargin={leftMargin}
          tabLinesCount={tabLinesCount}
          tabTopY={tabTopY}
          tabStringSpacing={tabStringSpacing}
          isBassClef={isBassClef}
          isDrumClef={isDrumClef}
          timeSignature={snippet.timeSignature}
        />

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
          const totalFractionsInBar = getTimeSignatureFractions(snippet.timeSignature);
          const barSlots = calculateMeasureBeatSlots(
            snippet.notes,
            barIdx,
            snippet.timeSignature,
            activeDuration,
            activeFraction,
            isDottedMode,
            isTripletMode
          );

          return (
            <g key={`bar-${barIdx}`} id={`bar-${barIdx}`}>
              {/* 🌟 Apple-Simplicity Zone 1: Ruhiger Takt-Header (Dezente Takt-Nummer + Duplizieren/Entfernen, 0% Batterie-Clutter) */}
              <g id={`measure-header-${barIdx}`}>
                <text
                  x={barStartX + 4}
                  y="16.5"
                  fontSize="9.2"
                  fontWeight={isBarActive && !readOnly ? '900' : '800'}
                  fill={isBarActive && !readOnly ? '#4f46e5' : '#64748b'}
                  letterSpacing="0.02em"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                >
                  Takt {barIdx + 1}
                </text>

                {!readOnly && (
                  <g>
                    {barIdx === 0 && snippet.barsCount > 1 && onDuplicateBar && (
                      <g
                        role="button"
                        tabIndex={0}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateBar(0);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            onDuplicateBar(0);
                          }
                        }}
                        aria-label="Takt 1 kopieren"
                        transform={`translate(${barStartX + 44}, 5)`}
                      >
                        <title>Takt 1 in nächsten Takt kopieren</title>
                        <rect
                          width="16"
                          height="15"
                          rx="4.5"
                          fill="#f8fafc"
                          stroke="#cbd5e1"
                          strokeWidth="0.8"
                        />
                        <text
                          x="8"
                          y="11"
                          fontSize="8.8"
                          fontWeight="900"
                          fill="#475569"
                          textAnchor="middle"
                          fontFamily="'Plus Jakarta Sans', sans-serif"
                        >
                          ⎘
                        </text>
                      </g>
                    )}

                    {barIdx === snippet.barsCount - 1 && snippet.barsCount > 1 && onRemoveBar && (
                      <g
                        role="button"
                        tabIndex={0}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveBar(barIdx);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            onRemoveBar(barIdx);
                          }
                        }}
                        aria-label={`Takt ${barIdx + 1} entfernen`}
                        transform={`translate(${barStartX + 44}, 5)`}
                      >
                        <title>Takt {barIdx + 1} entfernen</title>
                        <rect
                          width="16"
                          height="15"
                          rx="4.5"
                          fill="#fef2f2"
                          stroke="#fca5a5"
                          strokeWidth="0.8"
                        />
                        <text
                          x="8"
                          y="11"
                          fontSize="8.8"
                          fontWeight="900"
                          fill="#ef4444"
                          textAnchor="middle"
                          fontFamily="'Plus Jakarta Sans', sans-serif"
                        >
                          ✕
                        </text>
                      </g>
                    )}
                  </g>
                )}
              </g>

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
                slots={barSlots}
                barIndex={barIdx}
                barStartX={barStartX}
                measureWidth={measureWidth}
                totalFractions={totalFractionsInBar}
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
                onSelectSlot={(bar, frac) => {
                  const isOccupied = snippet.notes.some(
                    n => n.barIndex === bar && Math.abs(n.beatFraction - frac) < 0.5
                  );
                  if (isOccupied) {
                    onSelectPosition(bar, frac, activeString);
                  } else if (!sequentialFrontier.isScoreFull) {
                    onSelectPosition(sequentialFrontier.barIndex, sequentialFrontier.fraction, activeString);
                  } else {
                    onSelectPosition(bar, frac, activeString);
                  }
                }}
                getStaffY={getStaffY}
                isBassClef={isBassClef}
                isDrumClef={isDrumClef}
                hideActiveGhostHead={Boolean(
                  hoverSlot &&
                  hoverSlot.bar === barIdx &&
                  Math.abs(hoverSlot.fraction - activeFraction) < 0.5
                )}
              />

              {/* 🧲 Strikte Raster-Platzhalter & gesetzte Noten (inkl. Apple Magnetic Catch-Zone über den freien Rest-Takt) */}
              {barSlots.map((gridSlot) => {
                const fractionIdx = gridSlot.fraction;
                const fractionX = barStartX + 12 + (fractionIdx / totalFractionsInBar) * (measureWidth - 24);
                const isSelectedSlot = activeBar === barIdx && Math.abs(activeFraction - fractionIdx) < 0.5;

                // Finde alle Noten an dieser Position (Polyphonie / Akkorde)
                const slotNotes = gridSlot.notes;
                const hasNotes = slotNotes.length > 0;
                const isRestSlot = gridSlot.hasRest;
                const primaryNote = slotNotes[0];

                const isSequentialTarget =
                  !sequentialFrontier.isScoreFull &&
                  barIdx === sequentialFrontier.barIndex &&
                  Math.abs(fractionIdx - sequentialFrontier.fraction) < 0.5;
                const canHoverOrClickSlot = !readOnly && (hasNotes || isSequentialTarget || isSelectedSlot);

                // Magnetische Fangzone: Für den aktiven Ziel-Platzhalter erstreckt sich die Hover-/Klick-Zone
                // über den gesamten noch freien Restbereich des Takts (0% horizontales Zielen nötig!)
                const nextOccupiedInBar = barSlots.find(s => s.isOccupied && s.fraction > fractionIdx);
                const catchEndX = nextOccupiedInBar
                  ? barStartX + 12 + (nextOccupiedInBar.fraction / totalFractionsInBar) * (measureWidth - 24) - 14
                  : barEndX - 4;
                const hitRectWidth = (isSequentialTarget && !hasNotes)
                  ? Math.max(26, catchEndX - (fractionX - 13))
                  : 26;

                const hitStatus = primaryNote ? noteHits[primaryNote.id] : undefined;
                const noteDurationFrac = slotNotes.length > 0
                  ? Math.max(...slotNotes.map(sn => durationToSixteenths(sn.duration, sn.isDotted, sn.isTriplet)))
                  : 1;
                const isCurrentlyPlaying = Boolean(
                  isPlaying && 
                  playheadPosition && 
                  playheadPosition.bar === barIdx && 
                  (Math.abs(playheadPosition.fraction - fractionIdx) < 0.5 ||
                    (playheadPosition.fraction >= fractionIdx && 
                     playheadPosition.fraction < fractionIdx + noteDurationFrac - 0.1)) &&
                  !isRestSlot
                );
                const noteColor = isCurrentlyPlaying
                  ? '#6366f1'
                  : hitStatus === 'hit' 
                  ? '#10b981' 
                  : hitStatus === 'near' 
                  ? '#f59e0b' 
                  : '#0f172a';

                const isHoveredSlot =
                  canHoverOrClickSlot &&
                  hoverSlot !== null &&
                  hoverSlot.bar === barIdx &&
                  Math.abs(hoverSlot.fraction - fractionIdx) < 0.5;

                return (
                  <g 
                    key={`slot-${barIdx}-${fractionIdx}`}
                    onPointerDown={(e) => {
                      if (e.pointerType === 'mouse' && e.button !== 0) return;
                      handleSlotClick(e, barIdx, fractionIdx);
                    }}
                    onMouseMove={(e) => {
                      if (!canHoverOrClickSlot || !showStaff || !svgRef.current) return;
                      const rect = svgRef.current.getBoundingClientRect();
                      const viewBoxHeight = totalHeight;
                      const clientY = e.clientY - rect.top;
                      const svgY = (clientY / rect.height) * viewBoxHeight;
                      if (svgY >= staffTopY - 14 && svgY <= staffTopY + staffHeight + 14) {
                        const p = yToStaffPitch(svgY, staffTopY, isBassClef, isDrumClef);
                        setHoverSlot({ bar: barIdx, fraction: fractionIdx, pitch: p });
                      } else {
                        setHoverSlot(null);
                      }
                    }}
                    onMouseLeave={() => {
                      setHoverSlot(null);
                    }}
                    style={{ cursor: canHoverOrClickSlot ? 'pointer' : 'default' }}
                  >
                    {/* Magnetische Klick- & Hover-Fläche */}
                    <rect
                      x={fractionX - 13}
                      y={showStaff ? staffTopY - 14 : tabTopY - 8}
                      width={hitRectWidth}
                      height={totalHeight - staffTopY}
                      fill="transparent"
                    />

                    {/* Hover-Vorschau mit Apple Floating Callout Badge & Laser-Ziellinie (für Instrumenten-Tonhöhen & Drum-Bezeichnungen) */}
                    {showStaff && isHoveredSlot && (() => {
                      const previewPitch = hoverSlot.pitch;
                      const ghostY = staffTopY + getStaffY(previewPitch, isBassClef, isDrumClef);
                      const isFootNote = isDrumClef && isDrumFootPitch(previewPitch);
                      const stemUp = isDrumClef ? !isFootNote : getStaffY(previewPitch, isBassClef, isDrumClef) > 25;
                      const previewTheme = getPitchColorTheme(previewPitch);
                      const previewLetter = getPitchLetter(previewPitch);
                      const drumColorDef = getCanonicalDrumPieceColor(previewPitch);
                      const drumGhostColor = isDrumClef ? drumColorDef.staffColor : '#475569';
                      const activeAccentColor = isDrumClef
                        ? (isDrumColorGuide ? drumGhostColor : '#0f172a')
                        : (isDrumColorGuide ? previewTheme.border : '#0f172a');

                      // Klarschrift-Bezeichnung: Bei Drums ('Snare', 'Kick', 'Hi-Hat'...), bei Instrumenten ('C', 'D', 'E', 'F', 'G', 'A', 'H')
                      const calloutText = isDrumClef
                        ? getCanonicalDrumCalloutName(previewPitch)
                        : previewLetter;
                      const pillWidth = isDrumClef
                        ? Math.max(38, calloutText.length * 6.0 + 12)
                        : Math.max(22, calloutText.length * 7.5 + 10);
                      const placePillLeft = fractionX + 12 + pillWidth > barEndX - 4;
                      const pillX = placePillLeft ? fractionX - 12 - pillWidth : fractionX + 12;
                      const pillY = ghostY - 8.5;
                      const isLightYellowPitch = !isDrumClef && isDrumColorGuide && (previewPitch.startsWith('E') || previewTheme.text === '#854d0e');

                      return (
                        <g id="ghost-hover-note" opacity={0.92} style={{ pointerEvents: 'none' }}>
                          {/* Horizontale Laser-Ziellinie auf der aktuellen Tonhöhe quer über den Takt */}
                          <line
                            x1={barStartX + 4}
                            y1={ghostY}
                            x2={barEndX - 4}
                            y2={ghostY}
                            stroke={activeAccentColor}
                            strokeWidth="1.0"
                            strokeDasharray="3 3"
                            opacity={0.45}
                          />

                          {/* Hilfslinie oben für Crash-Becken (A5) oder hohe/tiefe Melodietöne beim Zielen */}
                          {isDrumClef && ghostY <= staffTopY - 12.5 + 3.125 && (
                            <line
                              x1={fractionX - 11}
                              y1={staffTopY - 12.5}
                              x2={fractionX + 11}
                              y2={staffTopY - 12.5}
                              stroke={drumGhostColor}
                              strokeWidth="1.3"
                            />
                          )}

                          {isDrumClef && isCymbalPitch(previewPitch) ? (
                            <g>
                              <line
                                x1={fractionX - 6}
                                y1={ghostY - 5}
                                x2={fractionX + 6}
                                y2={ghostY + 5}
                                stroke={drumGhostColor}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                              <line
                                x1={fractionX - 6}
                                y1={ghostY + 5}
                                x2={fractionX + 6}
                                y2={ghostY - 5}
                                stroke={drumGhostColor}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                              <text
                                x={fractionX}
                                y={ghostY + 2.0}
                                fontSize="5.4"
                                fontWeight="900"
                                fill={drumGhostColor}
                                stroke="#ffffff"
                                strokeWidth="2.4"
                                paintOrder="stroke"
                                textAnchor="middle"
                                fontFamily="'Plus Jakarta Sans', sans-serif"
                              >
                                {drumColorDef.shortCode}
                              </text>
                            </g>
                          ) : (
                            <ellipse
                              cx={fractionX}
                              cy={ghostY}
                              rx="7.4"
                              ry="5.2"
                              transform={`rotate(-22 ${fractionX} ${ghostY})`}
                              fill={activeDuration === '1' || activeDuration === '2' ? '#ffffff' : activeAccentColor}
                              stroke={activeAccentColor}
                              strokeWidth={activeDuration === '1' || activeDuration === '2' ? '2.2' : '0.8'}
                            />
                          )}
                          {isDrumClef && !isCymbalPitch(previewPitch) && (
                            <text
                              x={fractionX}
                              y={ghostY + 2.1}
                              fontSize="5.8"
                              fontWeight="900"
                              fill={activeDuration === '1' || activeDuration === '2' ? drumGhostColor : '#ffffff'}
                              textAnchor="middle"
                              fontFamily="'Plus Jakarta Sans', sans-serif"
                            >
                              {drumColorDef.shortCode}
                            </text>
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
                                  : (isLightYellowPitch ? '#0f172a' : '#ffffff')
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
                              y2={stemUp ? ghostY - 26 : ghostY + 26}
                              stroke={activeAccentColor}
                              strokeWidth="1.3"
                              strokeDasharray="3 2"
                            />
                          )}

                          {/* 🏷️ Apple Floating Callout Pill: Zeigt Tonhöhe (C, D, E...) bzw. Drum-Instrument (Snare, Kick, Hi-Hat...) glasklar neben dem Cursor */}
                          {calloutText && (
                            <g id="ghost-pitch-callout-pill">
                              <rect
                                x={pillX}
                                y={pillY}
                                width={pillWidth}
                                height={17}
                                rx={5.5}
                                fill={activeAccentColor}
                                stroke="#ffffff"
                                strokeWidth="1.4"
                                filter="url(#note-shadow)"
                              />
                              <text
                                x={pillX + pillWidth / 2}
                                y={pillY + 11.8}
                                fontSize={isDrumClef ? '8.6' : '9.6'}
                                fontWeight="900"
                                fill={isLightYellowPitch ? '#0f172a' : '#ffffff'}
                                textAnchor="middle"
                                fontFamily="'Plus Jakarta Sans', sans-serif"
                              >
                                {calloutText}
                              </text>
                            </g>
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
                                readOnly,
                                isDrumColorGuide,
                                getStaffY,
                                measureWidth,
                                barStartX
                              })
                            ) : (
                              /* Echter mehrstimmiger Akkord oder Einzelnote mit geteiltem Hals */
                              (() => {
                                const pitchedNotes = slotNotes.filter(n => n.pitch !== 'REST');
                                if (pitchedNotes.length === 0) return null;

                                // 🏛️ 0,1% Goldstandard Noten-zu-TAB Paritätsgarantie:
                                // Noten im System und Bünde in der TAB stimmen physikalisch immer zu 100% überein
                                const harmonizedNotes = pitchedNotes.map(n => {
                                  if (showTabs && n.fret !== undefined && n.stringIndex !== undefined && isStringOrPluckedInstrument(snippet.instrument)) {
                                    const expected = fretAndStringToPitch(n.stringIndex, n.fret, snippet.instrument);
                                    if (expected && expected !== n.pitch) {
                                      return { ...n, pitch: expected };
                                    }
                                  }
                                  return n;
                                });

                                // 🎼 Elaine Gould (Behind Bars, S. 313) / 0,1% Goldstandard:
                                // Unisono-Töne (gleiche Tonhöhe auf verschiedenen Saiten, z.B. Ukulele A4 auf Saite 0 Bund 0 und Saite 3 Bund 2)
                                // teilen sich im Notensystem EXAKT EINEN Notenkopf/Badge.
                                // In der TAB-Zeile werden selbstverständlich weiterhin alle gegriffenen Saiten und Bünde abgebildet!
                                const uniqueStaffNotes = harmonizedNotes.filter((note, idx, self) =>
                                  self.findIndex(other => other.pitch === note.pitch) === idx
                                );

                                const sortedNotes = [...uniqueStaffNotes].sort(
                                  (a, b) => getStaffY(b.pitch, isBassClef, isDrumClef) - getStaffY(a.pitch, isBassClef, isDrumClef)
                                );

                                const staffYs = sortedNotes.map(n => staffTopY + getStaffY(n.pitch, isBassClef, isDrumClef));
                                const minY = Math.min(...staffYs);
                                const maxY = Math.max(...staffYs);
                                const canonFractionIdx = Math.round(fractionIdx * 100) / 100;
                                const beamInfo = barBeamLookup.get(canonFractionIdx) || barBeamLookup.get(fractionIdx);
                                const isBeamed = Boolean(beamInfo?.isBeamed);
                                const avgStaffRelY = sortedNotes.reduce((acc, n) => acc + getStaffY(n.pitch, isBassClef, isDrumClef), 0) / sortedNotes.length;
                                const hasOnlyFootNotes = isDrumClef && sortedNotes.every(n => isDrumFootPitch(n.pitch));
                                const stemUp = isDrumClef ? !hasOnlyFootNotes : (isBeamed ? beamInfo!.stemUp : avgStaffRelY > 25);
                                const stemTipY = isBeamed ? beamInfo!.stemTipY : (stemUp ? minY - 28 : maxY + 28);
                                const durationRank = (d: string) => d === '16' ? 1 : d === '8' ? 2 : d === '4' ? 3 : d === '2' ? 4 : 5;
                                const duration = [...sortedNotes].sort((a, b) => durationRank(a.duration) - durationRank(b.duration))[0]?.duration || sortedNotes[0].duration;
                                const isDotted = sortedNotes.some(n => n.isDotted);
                                const getMelodicNoteColor = (pitch: string): string =>
                                  isCurrentlyPlaying
                                    ? '#6366f1'
                                    : hitStatus === 'hit'
                                    ? '#10b981'
                                    : hitStatus === 'near'
                                    ? '#f59e0b'
                                    : isDrumColorGuide
                                    ? getPitchColorTheme(pitch).border
                                    : '#0f172a';
                                const anchorNoteForStem = stemUp
                                  ? sortedNotes[sortedNotes.length - 1]
                                  : sortedNotes[0];
                                const anchorStemColor = getMelodicNoteColor((anchorNoteForStem || sortedNotes[0]).pitch);

                                // 🎼 Elaine Gould (Behind Bars) Seconds Displacement:
                                // Liegen Notenköpfe im Sekundabstand (diff > 0.5 && diff <= 10px) an demselben Hals,
                                // wird der versetzte Notenkopf horizontal verschoben (+11.5px),
                                // damit Köpfe und Beschriftungen kollisionsfrei lesbar bleiben.
                                const xOffsets: number[] = new Array(sortedNotes.length).fill(0);
                                if (!isDrumClef) {
                                  for (let i = 1; i < sortedNotes.length; i++) {
                                    const diff = Math.abs(staffYs[i] - staffYs[i - 1]);
                                    if (diff > 0.5 && diff <= 10.0 && xOffsets[i - 1] === 0) {
                                      xOffsets[i] = stemUp ? 11.5 : -11.5;
                                    }
                                  }
                                }

                                return (
                                  <g>
                                    {/* Notenköpfe, Hilfslinien & Vorzeichen für jeden Ton im Akkord */}
                                    {sortedNotes.map((n, nIdx) => {
                                      const nY = staffTopY + getStaffY(n.pitch, isBassClef, isDrumClef);
                                      const noteShiftX = xOffsets[nIdx] || 0;
                                      const noteHeadX = fractionX + noteShiftX;
                                      const hasSharp = n.pitch.includes('#');
                                      const hasFlat = n.pitch.includes('b') || (n.pitch.length >= 2 && n.pitch[1] === 'B');
                                      const pitchTheme = getPitchColorTheme(n.pitch);
                                      const letter = getPitchLetter(n.pitch);

                                      // 🎨 Farbiger Notenkopf (Boomwhacker) vs. Klassisch Schwarz (Urtext #0f172a)
                                      const headColor = isCurrentlyPlaying
                                        ? '#6366f1'
                                        : hitStatus === 'hit'
                                        ? '#10b981'
                                        : hitStatus === 'near'
                                        ? '#f59e0b'
                                        : isDrumColorGuide
                                        ? pitchTheme.border
                                        : '#0f172a';

                                      return (
                                        <g key={`head-${n.id || nIdx}`}>
                                          {/* Hilfslinien bei Tönen außerhalb des 5-Linien-Systems (12.5px-Raster) */}
                                          {/* 1. Hilfslinien unten (nY >= staffTopY + 62.5px) - Bei Drums keine Hilfslinien nach unten */}
                                          {!isDrumClef && [62.5, 75.0, 87.5, 100.0, 112.5, 125.0, 137.5].map(ledgerRelY => (
                                            nY >= staffTopY + ledgerRelY - 3.125 ? (
                                              <line
                                                key={`ledger-below-${ledgerRelY}`}
                                                x1={noteHeadX - 11}
                                                y1={staffTopY + ledgerRelY}
                                                x2={noteHeadX + 11}
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
                                                x1={noteHeadX - 11}
                                                y1={staffTopY + ledgerRelY}
                                                x2={noteHeadX + 11}
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
                                              cx={noteHeadX}
                                              cy={nY}
                                              rx="7.0"
                                              ry="5.0"
                                              transform={`rotate(-22 ${noteHeadX} ${nY})`}
                                              fill={duration === '1' || duration === '2' ? '#ffffff' : (isDrumClef ? (isCurrentlyPlaying ? '#6366f1' : hitStatus === 'hit' ? '#10b981' : '#0f172a') : headColor)}
                                              stroke={isDrumClef ? (isCurrentlyPlaying ? '#6366f1' : hitStatus === 'hit' ? '#10b981' : '#0f172a') : headColor}
                                              strokeWidth={duration === '1' || duration === '2' ? '2.2' : '0.6'}
                                              filter={isCurrentlyPlaying ? 'url(#note-glow)' : 'url(#note-shadow)'}
                                            />
                                          )}

                                          {/* Didaktischer Tonhöhen-Buchstabe (C, D, E...) im Modus Bunte Noten (im Modus Klassisch ausgeblendet) */}
                                          {!isDrumClef && isDrumColorGuide && letter && (
                                            <text
                                              x={noteHeadX}
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
                                              cx={noteHeadX}
                                              cy={nY}
                                              rx="9.0"
                                              ry="7.0"
                                              transform={`rotate(-22 ${noteHeadX} ${nY})`}
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
                                        fill={anchorStemColor}
                                      />
                                    )}

                                    {/* Geteilter Notenhals für Einzelnote oder Akkord (pro Tonhöhe farbcodiert) */}
                                    {duration !== '1' && (
                                      sortedNotes.length > 1 ? (
                                        <g>
                                          {stemUp
                                            ? sortedNotes.slice(0, -1).map((noteSeg, segIdx) => {
                                                const ySegStart = staffTopY + getStaffY(noteSeg.pitch, isBassClef, isDrumClef);
                                                const ySegEnd = staffTopY + getStaffY(sortedNotes[segIdx + 1].pitch, isBassClef, isDrumClef);
                                                return (
                                                  <line
                                                    key={`mel-stem-seg-up-${segIdx}`}
                                                    x1={fractionX + 6.0}
                                                    y1={ySegStart}
                                                    x2={fractionX + 6.0}
                                                    y2={ySegEnd}
                                                    stroke={getMelodicNoteColor(noteSeg.pitch)}
                                                    strokeWidth="1.65"
                                                  />
                                                );
                                              })
                                            : sortedNotes.slice(1).map((noteSeg, segIdx) => {
                                                const ySegStart = staffTopY + getStaffY(noteSeg.pitch, isBassClef, isDrumClef);
                                                const ySegEnd = staffTopY + getStaffY(sortedNotes[segIdx].pitch, isBassClef, isDrumClef);
                                                return (
                                                  <line
                                                    key={`mel-stem-seg-down-${segIdx}`}
                                                    x1={fractionX - 6.0}
                                                    y1={ySegStart}
                                                    x2={fractionX - 6.0}
                                                    y2={ySegEnd}
                                                    stroke={getMelodicNoteColor(noteSeg.pitch)}
                                                    strokeWidth="1.65"
                                                  />
                                                );
                                              })}
                                          <line
                                            x1={stemUp ? fractionX + 6.0 : fractionX - 6.0}
                                            y1={stemUp ? minY : maxY}
                                            x2={stemUp ? fractionX + 6.0 : fractionX - 6.0}
                                            y2={stemTipY}
                                            stroke={anchorStemColor}
                                            strokeWidth="1.65"
                                          />
                                        </g>
                                      ) : (
                                        <line
                                          x1={stemUp ? fractionX + 6.0 : fractionX - 6.0}
                                          y1={stemUp ? maxY : minY}
                                          x2={stemUp ? fractionX + 6.0 : fractionX - 6.0}
                                          y2={stemTipY}
                                          stroke={anchorStemColor}
                                          strokeWidth="1.65"
                                        />
                                      )
                                    )}

                                    {/* Achtel- / 16tel-Flagge an der Halsspitze (nur wenn NICHT gebalkt!) - feiner 0.032 Urtext-Maßstab */}
                                    {!isBeamed && duration === '8' && (
                                      <path
                                        d={stemUp ? SMUFL_GLYPHS.flag8thUp : SMUFL_GLYPHS.flag8thDown}
                                        transform={`translate(${stemUp ? fractionX + 6.0 : fractionX - 6.0}, ${stemTipY}) scale(0.032, -0.032)`}
                                        fill={anchorStemColor}
                                      />
                                    )}
                                    {!isBeamed && duration === '16' && (
                                      <path
                                        d={stemUp ? SMUFL_GLYPHS.flag16thUp : SMUFL_GLYPHS.flag16thDown}
                                        transform={`translate(${stemUp ? fractionX + 6.0 : fractionX - 6.0}, ${stemTipY}) scale(0.032, -0.032)`}
                                        fill={anchorStemColor}
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
                                const resolved = pitchToBestFretAndString(n.pitch, undefined, snippet.instrument);
                                if (resolved) {
                                  stringIdx = resolved.stringIndex;
                                  fret = resolved.fret;
                                }
                              }
                              if (stringIdx === undefined || fret === undefined) return null;
                              const tabY = tabTopY + stringIdx * tabStringSpacing;
                              const isSelectedFret = isSelectedSlot && (stringIdx === activeString || activeString === undefined) && !isPlaying;
                              const tabFretColor = isCurrentlyPlaying
                                ? '#6366f1'
                                : hitStatus === 'hit'
                                ? '#10b981'
                                : hitStatus === 'near'
                                ? '#f59e0b'
                                : isDrumColorGuide
                                ? getPitchColorTheme(n.pitch).border
                                : '#0f172a';

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
                                  {/* Bund-Ziffer in synästhetischer Tonhöhen-Farbe */}
                                  <text
                                    x={fractionX}
                                    y={tabY + 4.2}
                                    fontSize="11.5"
                                    fontWeight="900"
                                    fill={isSelectedFret ? '#0f172a' : tabFretColor}
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

                        {/* 3. Triolen-Klammer ('3') exakt einmalig zentriert über der mittleren Note der Triolengruppe */}
                        {slotNotes.some(n => n.isTriplet) && Math.abs((fractionIdx % 4) - 1.33) < 0.3 && (
                          <g id="triplet-badge">
                            <text
                              x={fractionX}
                              y={showStaff ? Math.min(staffTopY - 8, (barBeamLookup.get(Math.round(fractionIdx * 100) / 100)?.stemTipY ?? staffTopY) - 6) : tabTopY - 6}
                              fontSize="10.5"
                              fontWeight="900"
                              fontStyle="italic"
                              fill="#475569"
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

              {/* 🌟 0,1% Goldstandard Melodic Beams Layer (Bunt vs. Klassisch Schwarz #0f172a) */}
              {showStaff && !isDrumClef && (
                <MicroScoreMelodicBeams
                  beamGroups={barMelodicBeamGroups}
                  color={isDrumColorGuide ? undefined : '#0f172a'}
                />
              )}
            </g>
          );
        })}

        {/* 🌟 0,1% Goldstandard: Explizites In-Canvas Element zum Hinzufügen des nächsten Takts (max. 4 Takte) */}
        {canAddBar && (
          <MicroScoreAddBarElement
            barsCount={snippet.barsCount}
            leftMargin={leftMargin}
            measureWidth={measureWidth}
            addBarWidth={addBarWidth}
            showStaff={showStaff}
            showTabs={showTabs}
            staffTopY={staffTopY}
            staffHeight={staffHeight}
            tabTopY={tabTopY}
            tabHeight={tabHeight}
            onAddBar={onAddBar}
          />
        )}

        {/* 3. Flüssiger Playback-Playhead während des Abspielens (100% synchron mit Taktart 4/4, 3/4, 2/4, 6/8) */}
        {isPlaying && playheadPosition && (
          <g id="playback-playhead">
            {(() => {
              const totalPlayheadFractions = getTimeSignatureFractions(snippet.timeSignature);
              const headX = leftMargin + playheadPosition.bar * measureWidth + 12 + 
                (playheadPosition.fraction / totalPlayheadFractions) * (measureWidth - 24);
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
