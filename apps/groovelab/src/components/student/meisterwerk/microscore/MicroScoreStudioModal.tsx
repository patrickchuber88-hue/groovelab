/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * MicroScoreStudioModal.tsx
 * 
 * 2027 0,1% Goldstandard Direct-to-Canvas Architektur:
 * - Direkter Einstieg in die Musik-Leinwand (Kein künstlicher 3-Stufen-Wizard, kein Setup-Zwang)
 * - Farbenfrohe Instrumenten-Akzente (Gitarre/Bass Amber-Gold, Piano/Strings Indigo, Bläser Emerald)
 * - Direkte Taktanzahl-Wahl (1–4 Takte), Taktarten (4/4, 3/4, 2/4, 6/8) & Tempo-Stepper im Header
 * - SMuFL Vektor-Notenwerte, Cupertino Touch Fret-Bar & Melodie-Tastatur
 * - Integrierter Transport-Footer (Play/Stop, Loop, WSOLA Slow-Mo, Klick/Sound, Challenge & Save)
 * - 0% Bürokratie im Schüler-UI (keine §-Hinweise, maximale kognitive Ruhe & Spielfreude)
 * - BFSG 2025 & WCAG 2.2 AA konform (Tastatur-Vollbedienbarkeit, Kontrast ≥ 7:1)
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Square, Save, Music, Sparkles, Check, Minus, Plus, ChevronDown, ChevronLeft, ChevronRight, Headphones, Pencil, BookOpen, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import { MicroScoreDuration, MicroScoreInstrument, MicroScoreNote, MicroScoreSnippet, MicroScoreDisplayMode, MicroScoreTimeSignature } from './microScore.types';
import { MicroScoreAudioSynthesizer, durationToSixteenths } from './microScoreAudioSynthesizer';
import {
  getDidacticNoteDurationSec,
  getSequentialFrontierSlot,
  getBeatLabel,
  getSpokenBeatLabel,
  durationToSixteenthCount
} from './microScoreGridEngine';
import { MicroScoreStaffNotation } from './MicroScoreStaffNotation';
import { pitchToBestFretAndString, getInstrumentChordVoicing } from './guitarFretboardEngine';
import { MicroScoreBaukastenDock } from './MicroScoreBaukastenDock';
import { MicroScorePlayerBar, getInstrumentTheme } from './MicroScorePlayerBar';
import { MicroScoreChallengeEngine } from './MicroScoreChallengeEngine';
import { MicroScoreCelebrationModal } from './MicroScoreCelebrationModal';
import { playTriumphantXpChime } from '../../../../utils/campusXpEffects';
import { normalizeInstrumentToKey, resolveSnippetForInstrument, getSnippetArrangementLabel } from '../../../../services/canonicalScoreEngine';
import { MicroScoreInstrumentVisualizer } from './MicroScoreInstrumentVisualizer';
import { VDM_DRUM_PRESETS, VdmDrumPreset, QUICK_TITLE_CHIPS, INSTRUMENT_OPTIONS } from './vdmDrumPresets';
import { isDrumFootPitch } from './microScoreDrumPolyphonyEngine';
import { calculateActiveMicroScoreNotes } from './microScoreActiveNotesHelper';
import { useMicroScoreViewport } from './useMicroScoreViewport';
import { MicroScoreOrientationLock } from './MicroScoreOrientationLock';
import { MicroScoreViewMode } from './MicroScoreViewModeSwitcher';
import { MicroScoreStudioHeader } from './MicroScoreStudioHeader';

export interface MicroScoreStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSnippet?: MicroScoreSnippet | null;
  snippetList?: MicroScoreSnippet[];
  initialSnippetIndex?: number;
  studentId?: string | null;
  taskId?: string;
  taskTitle?: string;
  defaultInstrument?: string;
  onSaveSnippet?: (snippet: MicroScoreSnippet) => void;
  readOnly?: boolean;
}

export const MicroScoreStudioModal: React.FC<MicroScoreStudioModalProps> = ({
  isOpen,
  onClose,
  initialSnippet,
  snippetList,
  initialSnippetIndex,
  studentId,
  taskId,
  taskTitle,
  defaultInstrument,
  onSaveSnippet,
  readOnly = false
}) => {
  // 📱 0,1% Responsive Viewport & Orientation Engine
  const {
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    isPortrait,
    isLandscape,
    isMobilePortrait,
    isMobileLandscape,
    isFullscreen: isNativeFullscreen,
    toggleFullscreen
  } = useMicroScoreViewport();
  const [isStudioFullscreen, setIsStudioFullscreen] = useState(false);
  const isStudioMaximized = isMobile || isTablet || isNativeFullscreen || isStudioFullscreen;

  const handleToggleFullscreen = useCallback(async () => {
    setIsStudioFullscreen(prev => !prev);
    await toggleFullscreen();
  }, [toggleFullscreen]);

  // 🎨 0,1% Goldstandard Apple Studio States (Farb-Guide beim Drumkit standardmäßig aktiviert!)
  const [showTemplates, setShowTemplates] = useState(false);
  const [isDrumColorGuide, setIsDrumColorGuide] = useState(true);
  // 🏛️ Kanonisches Original-Schnipsel (C-Score SSOT) bewahren, damit mehrfacher Instrumentenwechsel (z. B. Piano -> Drums -> Gitarre) 100% verlustfrei bleibt!
  const canonicalSourceRef = useRef<MicroScoreSnippet | null>(initialSnippet || null);

  const [snippet, setSnippet] = useState<MicroScoreSnippet>(() => {
    const userInst = normalizeInstrumentToKey(defaultInstrument);
    if (initialSnippet) {
      const isInitialDrum = initialSnippet.instrument === 'drums' || initialSnippet.clef === 'percussion';
      // Autoritativer Instrumenten-Autoload: Wenn das Benutzerfach ein spezifisches Instrument ist (z. B. Gitarre, Bass etc.),
      // adaptiere jedes Schnipsel (egal ob universal oder Klavier-Übung wie Hanon No. 1) verlustfrei auf das Benutzerfach!
      if (!isInitialDrum && userInst !== 'universal' && initialSnippet.instrument !== userInst) {
        return resolveSnippetForInstrument(initialSnippet, userInst);
      }
      return initialSnippet;
    }
    const inst = userInst !== 'universal' ? userInst : 'piano';
    const defaultTitle = taskTitle ? taskTitle : 'Neuer Noten-Schnipsel';
    return {
      id: `snippet-${Date.now()}`,
      title: defaultTitle,
      instrument: inst,
      timeSignature: '4/4',
      tempoBpm: 80,
      barsCount: 2,
      displayMode: (inst === 'guitar' || inst === 'bass') ? 'both' : 'notes',
      clef: (inst === 'bass' || inst === 'trombone') ? 'bass' : (inst === 'drums' ? 'percussion' : 'treble'),
      notes: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      taskId: taskId || undefined, studentId: studentId || undefined
    };
  });

  // 🏛️ Synchronisiere Zustand, wenn initialSnippet sich von außen ändert oder "Notenschnipsel erstellen" (initialSnippet == null) geöffnet wird
  useEffect(() => {
    if (!isOpen) return;
    if (initialSnippet) {
      canonicalSourceRef.current = initialSnippet;
      const userInst = normalizeInstrumentToKey(defaultInstrument);
      const isInitialDrum = initialSnippet.instrument === 'drums' || initialSnippet.clef === 'percussion';
      if (!isInitialDrum && userInst !== 'universal' && initialSnippet.instrument !== userInst) {
        setSnippet(resolveSnippetForInstrument(initialSnippet, userInst));
      } else {
        setSnippet(initialSnippet);
      }
      if (initialSnippet.displayMode) {
        setDisplayMode(initialSnippet.displayMode);
      }
      setActiveTab((initialSnippet.notes && initialSnippet.notes.length > 0) ? 'practice' : 'write');
      setActiveBar(0);
      setActiveFraction(0);
      setUndoHistory([]);
    } else {
      // 🛡️ Strict Blank-Canvas Axiom: "Notenschnipsel erstellen" öffnet IMMER im 100% leeren Zustand!
      canonicalSourceRef.current = null;
      const userInst = normalizeInstrumentToKey(defaultInstrument);
      const inst = userInst !== 'universal' ? userInst : 'piano';
      const defaultTitle = taskTitle ? taskTitle : 'Neuer Noten-Schnipsel';
      setSnippet({
        id: `snippet-${Date.now()}`,
        title: defaultTitle,
        instrument: inst,
        timeSignature: '4/4',
        tempoBpm: 80,
        barsCount: 2,
        displayMode: (inst === 'guitar' || inst === 'bass') ? 'both' : 'notes',
        clef: (inst === 'bass' || inst === 'trombone') ? 'bass' : (inst === 'drums' ? 'percussion' : 'treble'),
        notes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        taskId: taskId || undefined,
        studentId: studentId || undefined
      });
      setActiveTab('write');
      setActiveBar(0);
      setActiveFraction(0);
      setUndoHistory([]);
    }
  }, [isOpen, initialSnippet, defaultInstrument, taskTitle, taskId, studentId]);

  // 🌟 Harmonische Übungs-Erkennung (Dreiklänge, Kadenzen, Akkorde, Dur/Moll)
  const isHarmonicExercise = useMemo(() => {
    if (snippet.category && (snippet.category === 'Akkorde' || snippet.category === 'Tonleitern')) return true;
    if (snippet.vdmFolder && ['dreiklaenge', 'kadenzen', 'dur', 'moll', 'pentatonik', 'akkorde'].includes(snippet.vdmFolder.toLowerCase())) return true;
    if (snippet.chords && snippet.chords.length > 0) return true;
    const titleLower = (snippet.title || '').toLowerCase();
    const harmonicKeywords = ['dreiklang', 'dreiklänge', 'akkord', 'kadenz', 'arpeggio', 'dur', 'moll', 'major', 'minor', 'terz', 'quinte', 'septakkord'];
    if (harmonicKeywords.some(kw => titleLower.includes(kw))) return true;
    return false;
  }, [snippet.category, snippet.vdmFolder, snippet.chords, snippet.title]);
  // 🌟 0,1% Goldstandard: Für jeden Notenschnipsel sind ausnahmslos alle Instrumente anwählbar
  const availableInstrumentOptions = INSTRUMENT_OPTIONS;
  const applyDrumPreset = (preset: VdmDrumPreset) => {
    setSnippet(prev => ({
      ...prev,
      title: preset.title,
      instrument: 'drums',
      clef: 'percussion',
      tempoBpm: preset.bpm,
      barsCount: 2,
      timeSignature: '4/4',
      category: 'Rhythmus',
      vdmFolder: 'grooves',
      description: preset.description,
      notes: preset.notes
    }));
    setShowTemplates(false);
  };

  // Undo-Historie
  const [undoHistory, setUndoHistory] = useState<MicroScoreNote[][]>([]);

  // Editor-States
  const [activeBar, setActiveBar] = useState(0);
  const [activeFraction, setActiveFraction] = useState(0);
  const [activeString, setActiveString] = useState(1); // Default B-Saite
  const [activeDuration, setActiveDuration] = useState<MicroScoreDuration>('4');
  const [isTripletMode, setIsTripletMode] = useState(false);
  const [isDottedMode, setIsDottedMode] = useState(false);
  const [viewMode, setViewMode] = useState<MicroScoreViewMode>(() => {
    const isStr = snippet.instrument === 'guitar' || snippet.instrument === 'bass' || snippet.instrument === 'strings';
    return isStr ? (snippet.displayMode === 'notes' ? 'notes' : 'tabs') : 'both';
  });
  const [displayMode, setDisplayMode] = useState<MicroScoreDisplayMode>(() => {
    if (initialSnippet?.displayMode) return initialSnippet.displayMode;
    return (snippet.instrument === 'guitar' || snippet.instrument === 'bass') ? 'both' : 'notes';
  });

  // ♬ 0,1% Smart-Akkord & Vorzeichen States
  const [isChordMode, setIsChordMode] = useState(false);
  const [chordQuality, setChordQuality] = useState<'major' | 'minor'>('major');
  const [activeAccidental, setActiveAccidental] = useState<'#' | 'b' | null>(null);

  // Playback-States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [speedRate, setSpeedRate] = useState<number>(1.0);
  const [soloSample, setSoloSample] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [playheadPos, setPlayheadPos] = useState<{ bar: number; fraction: number } | undefined>(undefined);

  // 🎹 0,1% Goldstandard: Lückenloser Visual Sustain & Legato-Engine (Halten bis zum nächsten Ton)
  const currentActiveNotes = useMemo(() => {
    return calculateActiveMicroScoreNotes(snippet, isPlaying, playheadPos, activeBar, activeFraction);
  }, [snippet, isPlaying, playheadPos, activeBar, activeFraction]);

  const currentActivePitches = useMemo(() => {
    return currentActiveNotes.map(n => n.pitch);
  }, [currentActiveNotes]);

  // 🌟 2027 0,1% Goldstandard 2-Tab Navigation (Üben vs. Schreiben) & YouTube/Instagram States
  const [activeTab, setActiveTab] = useState<'practice' | 'write'>(() => {
    return (initialSnippet?.notes && initialSnippet.notes.length > 0) ? 'practice' : 'write';
  });
  const [isChallengeOpen, setIsChallengeOpen] = useState(false);
  const [isMetronomeActive, setIsMetronomeActive] = useState(true);

  // 🌟 100% Musik-Weltreise Parität: Challenge & Gamification State
  const [challengeHits, setChallengeHits] = useState<Record<string, 'hit' | 'near' | 'miss'>>({});
  const [countInInfo, setCountInInfo] = useState<{ currentBeat: number; totalBeats: number } | null>(null);
  const [celebrationData, setCelebrationData] = useState<{
    stars: number; scorePercent: number; xpAwarded: number; hitCount: number; nearCount: number; missCount: number;
  } | null>(null);
  const [isAbortedNotice, setIsAbortedNotice] = useState(false);
  const theme = getInstrumentTheme(snippet.instrument);
  const synthRef = useRef<MicroScoreAudioSynthesizer | null>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const visualTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const snippetRef = useRef<MicroScoreSnippet>(snippet);
  snippetRef.current = snippet;
  const isMetronomeActiveRef = useRef<boolean>(isMetronomeActive);
  isMetronomeActiveRef.current = isMetronomeActive;
  const isLoopingRef = useRef<boolean>(isLooping);
  isLoopingRef.current = isLooping;
  const isChallengeOpenRef = useRef<boolean>(isChallengeOpen);
  isChallengeOpenRef.current = isChallengeOpen;

  // Initialisiere Audio-Synthesizer & Preload der Studio-Drum-Samples
  useEffect(() => {
    const s = new MicroScoreAudioSynthesizer();
    synthRef.current = s;
    try {
      s.init();
    } catch {}
    return () => {
      s.stopAll();
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      visualTimeoutsRef.current.forEach(clearTimeout);
      visualTimeoutsRef.current = [];
    };
  }, []);
  // Mute-Zustand des Instruments synchronisieren
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.setInstrumentMuted(!soloSample);
    }
  }, [soloSample]);

  // Noten-Update mit Undo-Verlauf
  const handleUpdateNotes = (newNotes: MicroScoreNote[]) => {
    setUndoHistory(prev => [...prev.slice(-15), snippet.notes]);
    setSnippet(prev => ({ ...prev, notes: newNotes }));
  };

  // Undo Rückgängig
  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    const lastState = undoHistory[undoHistory.length - 1];
    setUndoHistory(prev => prev.slice(0, -1));
    setSnippet(prev => ({ ...prev, notes: lastState }));
  };

  // Takt 1 kopieren
  const handleDuplicateBar1 = () => {
    const bar0Notes = snippet.notes.filter(n => n.barIndex === 0);
    if (bar0Notes.length === 0) return;
    setUndoHistory(prev => [...prev.slice(-15), snippet.notes]);
    const targetBar = activeBar > 0 ? activeBar : 1;
    if (targetBar >= snippet.barsCount) return;

    const duplicatedNotes = bar0Notes.map(n => ({
      ...n,
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      barIndex: targetBar
    }));

    // Ersetze existierende Noten in Ziel-Takt
    const filtered = snippet.notes.filter(n => n.barIndex !== targetBar);
    setSnippet(prev => ({ ...prev, notes: [...filtered, ...duplicatedNotes] }));
  };

  // Aktiven Takt leeren
  const handleClearActiveBar = () => {
    setUndoHistory(prev => [...prev.slice(-15), snippet.notes]);
    const filtered = snippet.notes.filter(n => n.barIndex !== activeBar);
    setSnippet(prev => ({ ...prev, notes: filtered }));
  };

  // Kompletten Schnipsel leeren (1-Klick Blank-Canvas Reset)
  const handleClearAllNotes = () => {
    if (readOnly || snippet.notes.length === 0) return;
    setUndoHistory(prev => [...prev.slice(-15), snippet.notes]);
    setSnippet(prev => ({ ...prev, notes: [], description: '' }));
    setActiveBar(0);
    setActiveFraction(0);
  };

  // 🥁 1-Tap Groove-Kombi (setzt Fuß- und Handstimme gleichzeitig auf den aktiven Schlag und rückt weiter)
  const handleInsertDrumCombo = (pitches: string[]) => {
    if (readOnly || pitches.length === 0) return;
    const didDuration = getDidacticNoteDurationSec(activeDuration, snippet.tempoBpm, isDottedMode, isTripletMode);
    const filtered = snippet.notes.filter(
      n => !(n.barIndex === activeBar && Math.abs(n.beatFraction - activeFraction) < 0.5)
    );
    const comboNotes: MicroScoreNote[] = pitches.map((p, idx) => ({
      id: `note-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      barIndex: activeBar,
      beatFraction: activeFraction,
      duration: activeDuration,
      pitch: p,
      isTriplet: isTripletMode,
      isDotted: isDottedMode
    }));
    const nextNotes = [...filtered, ...comboNotes];
    handleUpdateNotes(nextNotes);
    synthRef.current?.playChordNow(snippet.instrument, pitches, didDuration, 0.72);
    advanceCursor(activeBar, activeFraction, nextNotes);
  };

  // 🧲 0,1% Goldstandard: Magnetischer Schritt-für-Schritt-Cursor entlang der aktiven Raster-Platzhalter
  const advanceCursor = useCallback((fromBar = activeBar, fromFraction = activeFraction, nextNotesOverride?: MicroScoreNote[]) => {
    const candidateNotes = nextNotesOverride ?? snippet.notes;
    const frontier = getSequentialFrontierSlot(
      candidateNotes,
      snippet.barsCount,
      snippet.timeSignature,
      activeDuration,
      isDottedMode,
      isTripletMode
    );
    if (!frontier.isScoreFull) {
      setActiveBar(frontier.barIndex);
      setActiveFraction(frontier.fraction);
      return;
    }

    const step = durationToSixteenthCount(activeDuration, isDottedMode, isTripletMode);
    const fractionsPerBar = snippet.timeSignature === '3/4' || snippet.timeSignature === '6/8' ? 12 : snippet.timeSignature === '2/4' ? 8 : 16;

    let nextFraction = fromFraction + step;
    let nextBar = fromBar;
    if (nextFraction >= fractionsPerBar) {
      nextFraction = nextFraction - fractionsPerBar;
      nextBar = fromBar + 1;
      if (nextBar >= snippet.barsCount) {
        nextBar = 0;
      }
    }
    setActiveFraction(nextFraction);
    setActiveBar(nextBar);
  }, [activeBar, activeFraction, activeDuration, isTripletMode, isDottedMode, snippet.barsCount, snippet.timeSignature, snippet.notes]);

  // 🎼 0,1% Goldstandard: Explizites Hinzufügen des nächsten Takts (max. 4 Takte)
  const handleAddBar = useCallback(() => {
    if (readOnly || snippet.barsCount >= 4) return;
    const newCount = snippet.barsCount + 1;
    setSnippet(prev => ({ ...prev, barsCount: newCount }));
    setActiveBar(snippet.barsCount); // Fokus direkt auf Zählzeit 1 des neuen Takts
    setActiveFraction(0);
  }, [readOnly, snippet.barsCount]);

  // 🎼 Takt entfernen (mindestens 1 Takt bleibt erhalten)
  const handleRemoveBar = useCallback((barIdx?: number) => {
    if (readOnly || snippet.barsCount <= 1) return;
    const targetBar = barIdx !== undefined ? barIdx : snippet.barsCount - 1;
    setUndoHistory(prev => [...prev.slice(-15), snippet.notes]);
    setSnippet(prev => ({
      ...prev,
      barsCount: Math.max(1, prev.barsCount - 1),
      notes: prev.notes.filter(n => n.barIndex !== targetBar).map(n => {
        if (n.barIndex > targetBar) return { ...n, barIndex: n.barIndex - 1 };
        return n;
      })
    }));
    setActiveBar(prev => (prev >= snippet.barsCount - 1 ? Math.max(0, snippet.barsCount - 2) : prev));
    setActiveFraction(0);
  }, [readOnly, snippet.barsCount, snippet.notes]);

  const handleAdvanceCursor = useCallback(() => advanceCursor(), [advanceCursor]);
  const handleToggleChordMode = () => setIsChordMode(prev => !prev);
  const handleToggleChordQuality = () => setChordQuality(prev => prev === 'major' ? 'minor' : 'major');

  const handleToggleAccidental = (acc: '#' | 'b') => {
    if (readOnly) return;
    setActiveAccidental(prev => prev === acc ? null : acc);

    // Falls auf der aktuellen Zählzeit bereits Noten liegen, passe diese direkt an
    const current = [...snippet.notes];
    const notesAtSlot = current.filter(n => n.barIndex === activeBar && Math.abs(n.beatFraction - activeFraction) < 0.5);
    if (notesAtSlot.length > 0 && !notesAtSlot.some(n => n.pitch === 'REST')) {
      const updatedNotes = current.map(n => {
        if (n.barIndex === activeBar && Math.abs(n.beatFraction - activeFraction) < 0.5) {
          const match = n.pitch.match(/^([A-Ga-gHh])([#bB♮]?)(-?\d+)$/);
          if (!match) return n;
          const letter = match[1].toUpperCase();
          const currAcc = match[2];
          const oct = match[3];

          let newAcc = '';
          if (acc === '#') {
            newAcc = currAcc === '#' ? '' : '#';
          } else if (acc === 'b') {
            newAcc = currAcc.toLowerCase() === 'b' ? '' : 'b';
          }

          const newPitch = `${letter}${newAcc}${oct}`;
          let newFret = n.fret;
          let newStringIndex = n.stringIndex;
          if (snippet.instrument === 'guitar' || snippet.instrument === 'bass' || snippet.instrument === 'strings') {
            const best = pitchToBestFretAndString(newPitch, n.stringIndex, snippet.instrument);
            if (best) {
              newFret = best.fret;
              newStringIndex = best.stringIndex;
            }
          }
          return {
            ...n,
            pitch: newPitch,
            fret: newFret,
            stringIndex: newStringIndex
          };
        }
        return n;
      });
      handleUpdateNotes(updatedNotes);

      const changed = updatedNotes.filter(n => n.barIndex === activeBar && Math.abs(n.beatFraction - activeFraction) < 0.5);
      const noteDur = changed[0] ? getDidacticNoteDurationSec(changed[0].duration, snippet.tempoBpm, changed[0].isDotted, changed[0].isTriplet) : 0.4;
      if (changed.length === 1) {
        synthRef.current?.playToneNow(snippet.instrument, changed[0].pitch, noteDur, 0.7);
      } else if (changed.length > 1) {
        synthRef.current?.playChordNow(snippet.instrument, changed.map(c => c.pitch), noteDur, 0.7);
      }
    }
  };

  const handleInsertTouchRest = () => {
    if (readOnly) return;
    const restNote: MicroScoreNote = {
      id: `rest-${Date.now()}`,
      barIndex: activeBar,
      beatFraction: activeFraction,
      duration: activeDuration,
      pitch: 'REST',
      isTriplet: isTripletMode,
      isDotted: isDottedMode
    };
    const current = snippet.notes.filter(
      n => !(n.barIndex === activeBar && Math.abs(n.beatFraction - activeFraction) < 0.5)
    );
    current.push(restNote);
    handleUpdateNotes(current);
    if (!isChordMode) {
      advanceCursor(activeBar, activeFraction, current);
    }
  };

  // 🎼 0,1% Goldstandard Direkte & Touch-Noteneingabe mit Zählzeit-Dauer & Auto-Advance
  const handleInsertDirectStaffNote = useCallback((
    barIdx: number, 
    fractionIdx: number, 
    pitch: string,
    advanceOverride?: boolean,
    forceSinglePitch = false,
    explicitStringIndex?: number,
    explicitFret?: number
  ) => {
    if (readOnly) return;

    const didDuration = getDidacticNoteDurationSec(activeDuration, snippet.tempoBpm, isDottedMode, isTripletMode);

    if (isChordMode && !forceSinglePitch) {
      // Smart Akkord-Modus: Generiere fertigen Akkord für das Instrument
      const voicingNotes = getInstrumentChordVoicing(pitch, chordQuality, snippet.instrument);
      if (voicingNotes.length > 0) {
        // ⚡ 0,1% Audio-First: Zuerst den Akkord bei t = 0.0 ms abfeuern!
        synthRef.current?.playChordNow(snippet.instrument, voicingNotes.map(v => v.pitch), didDuration, 0.75);

        const newNotes: MicroScoreNote[] = voicingNotes.map(v => ({
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          barIndex: barIdx,
          beatFraction: fractionIdx,
          duration: activeDuration,
          pitch: v.pitch,
          fret: v.fret,
          stringIndex: v.stringIndex,
          isTriplet: isTripletMode,
          isDotted: isDottedMode
        }));

        const filtered = snippet.notes.filter(
          n => !(n.barIndex === barIdx && Math.abs(n.beatFraction - fractionIdx) < 0.5)
        );
        const nextChordNotes = [...filtered, ...newNotes];
        React.startTransition(() => {
          setActiveBar(barIdx);
          setActiveFraction(fractionIdx);
          handleUpdateNotes(nextChordNotes);
          if (advanceOverride === true) {
            advanceCursor(barIdx, fractionIdx, nextChordNotes);
          }
        });
        return;
      }
    }

    const currentSlotNotes = snippet.notes.filter(
      n => n.barIndex === barIdx && Math.abs(n.beatFraction - fractionIdx) < 0.5
    );

    const existingSamePitch = currentSlotNotes.find(n => n.pitch === pitch);
    if (existingSamePitch) {
      const filtered = snippet.notes.filter(n => n.id !== existingSamePitch.id);
      React.startTransition(() => {
        setActiveBar(barIdx);
        setActiveFraction(fractionIdx);
        handleUpdateNotes(filtered);
      });
      return;
    }

    // ⚡ 0,1% Audio-First Doktrin: Sofortiger WebAudio-Start bei t = 0.0 ms VOR jedem React-State-Update!
    synthRef.current?.playToneNow(snippet.instrument, pitch, didDuration, 0.72);

    // Normaler Modus oder Manuelles Schichten / Polyphonie (SSOT: Explizite Saite/Bund priorisieren)
    let fret: number | undefined = explicitFret;
    let stringIndex: number | undefined = explicitStringIndex;
    if ((snippet.instrument === 'guitar' || snippet.instrument === 'bass' || snippet.instrument === 'strings') && (fret === undefined || stringIndex === undefined)) {
      const usedStrings = currentSlotNotes
        .filter(n => n.stringIndex !== undefined)
        .map(n => n.stringIndex!);
      const best = pitchToBestFretAndString(pitch, activeString, snippet.instrument, usedStrings);
      if (best) {
        fret = best.fret;
        stringIndex = best.stringIndex;
      }
    }

    const shouldStackOnSlot = isChordMode || forceSinglePitch || snippet.instrument === 'drums';
    const existingPrimary =
      snippet.instrument === 'drums'
        ? currentSlotNotes.find(
            n => n.pitch !== 'REST' && isDrumFootPitch(n.pitch) === isDrumFootPitch(pitch)
          )
        : currentSlotNotes.find(n => n.pitch !== 'REST') || currentSlotNotes[0];

    const newNote: MicroScoreNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      barIndex: barIdx,
      beatFraction: fractionIdx,
      duration: existingPrimary ? existingPrimary.duration : activeDuration,
      pitch,
      fret,
      stringIndex,
      isTriplet: existingPrimary ? existingPrimary.isTriplet : isTripletMode,
      isDotted: existingPrimary ? existingPrimary.isDotted : isDottedMode
    };

    const baseNotes = shouldStackOnSlot
      ? snippet.notes.filter(
          n => !(n.barIndex === barIdx && Math.abs(n.beatFraction - fractionIdx) < 0.5 && n.pitch === 'REST')
        )
      : snippet.notes.filter(
          n => !(n.barIndex === barIdx && Math.abs(n.beatFraction - fractionIdx) < 0.5)
        );
    const updatedNotes = [...baseNotes, newNote];

    // Melodischer Auto-Advance: Bei normaler Melodie-Eingabe gleitet der Cursor zum nächsten Slot
    const shouldAdvance = advanceOverride !== undefined ? advanceOverride : !isChordMode;
    React.startTransition(() => {
      setActiveBar(barIdx);
      setActiveFraction(fractionIdx);
      if (stringIndex !== undefined) {
        setActiveString(stringIndex);
      }
      handleUpdateNotes(updatedNotes);
      if (shouldAdvance) {
        advanceCursor(barIdx, fractionIdx, updatedNotes);
      }
    });
  }, [
    readOnly, 
    isChordMode,
    chordQuality,
    snippet.instrument, 
    snippet.notes, 
    snippet.tempoBpm,
    activeString, 
    activeDuration, 
    isTripletMode, 
    isDottedMode, 
    handleUpdateNotes,
    advanceCursor
  ]);

  // Touch-Noteneingabe delegiert direkt an handleInsertDirectStaffNote
  const handleInsertTouchPitch = (pitch: string) => {
    handleInsertDirectStaffNote(activeBar, activeFraction, pitch);
  };

  // 0,1% Polyphonie: Note auf denselben Beat schichten ohne Cursor-Weiterspringen
  const handleInsertTouchPitchStack = (pitch: string) => {
    handleInsertDirectStaffNote(activeBar, activeFraction, pitch, false, true);
  };

  // 0,1% Smart Backspace: Aktuelle Note löschen oder unabhängig vom gewählten Raster die zuletzt eingegebene Note löschen
  const handleDeleteTouchNote = () => {
    if (readOnly) return;
    const currentSlotNotes = snippet.notes.filter(
      n => n.barIndex === activeBar && Math.abs(n.beatFraction - activeFraction) < 0.5
    );
    if (currentSlotNotes.length > 0) {
      const filtered = snippet.notes.filter(
        n => !(n.barIndex === activeBar && Math.abs(n.beatFraction - activeFraction) < 0.5)
      );
      handleUpdateNotes(filtered);
    } else if (snippet.notes.length > 0) {
      const sortedNotes = [...snippet.notes].sort(
        (a, b) => a.barIndex * 16 + a.beatFraction - (b.barIndex * 16 + b.beatFraction)
      );
      const lastNote = sortedNotes[sortedNotes.length - 1];
      if (lastNote) {
        const filtered = snippet.notes.filter(
          n => !(n.barIndex === lastNote.barIndex && Math.abs(n.beatFraction - lastNote.beatFraction) < 0.5)
        );
        handleUpdateNotes(filtered);
        setActiveBar(lastNote.barIndex);
        setActiveFraction(lastNote.beatFraction);
      }
    }
  };

  // Instrumenten-Wechsel mit kanonischer Projektion (Tabs, Bünde, Schlüssel) & Realtime-Audio
  // Nutzt canonicalSourceRef (sofern die Noten nicht manuell editiert wurden), damit Piano <-> Drums <-> Gitarre 100% reversibel bleibt!
  const handleInstrumentChange = (newInst: MicroScoreInstrument) => {
    const baseSource = (undoHistory.length === 0 && canonicalSourceRef.current && canonicalSourceRef.current.id === snippet.id)
      ? canonicalSourceRef.current
      : snippet;
    const resolved = resolveSnippetForInstrument(baseSource, newInst);
    snippetRef.current = resolved;
    setSnippet(resolved);
    setDisplayMode(resolved.displayMode || (newInst === 'guitar' || newInst === 'bass' ? 'both' : 'notes'));
  };

  const handleNoteHit = useCallback((noteId: string, status: 'hit' | 'near' | 'miss') => {
    setChallengeHits(prev => {
      if (prev[noteId] === 'hit') return prev;
      return { ...prev, [noteId]: status };
    });
  }, []);

  const evaluateChallengeCompletion = useCallback(() => {
    const pitchedNotes = snippet.notes.filter(n => n.pitch !== 'REST');
    const total = pitchedNotes.length;
    const hits = Object.values(challengeHits).filter(h => h === 'hit').length;
    const near = Object.values(challengeHits).filter(h => h === 'near').length;
    const miss = Math.max(0, total - hits - near);
    const scorePercent = total > 0 ? Math.min(100, Math.round(((hits * 1.0 + near * 0.6) / total) * 100)) : 0;
    const stars = scorePercent >= 90 ? 3 : scorePercent >= 75 ? 2 : scorePercent >= 60 ? 1 : 0;
    const xpAwarded = stars === 3 ? 150 : stars === 2 ? 100 : stars === 1 ? 50 : 0;

    if (stars >= 1) {
      playTriumphantXpChime();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('campus-xp-awarded', {
            detail: {
              studentId: studentId || 'current',
              amount: xpAwarded,
              reason: `Noten-Schnipsel Challenge: ${snippet.title}`
            }
          })
        );
      }
    }

    setCelebrationData({
      stars,
      scorePercent,
      xpAwarded,
      hitCount: hits,
      nearCount: near,
      missCount: miss
    });
  }, [snippet.notes, snippet.title, challengeHits, studentId]);

  // Sequencer-Wiedergabelogik mit 100% Weltreise Count-In & VdM Auto-Complete
  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    setPlayheadPos(undefined);
    setCountInInfo(null);
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    if (visualTimeoutsRef.current.length > 0) {
      visualTimeoutsRef.current.forEach(clearTimeout);
      visualTimeoutsRef.current = [];
    }
    if (synthRef.current) {
      synthRef.current.stopAll();
    }
  }, []);

  // 🏛️ 0,1% Goldstandard: Vorherige / Nächste Übung Navigation State & Handlers
  const [currentListIndex, setCurrentListIndex] = useState<number>(() => {
    if (initialSnippetIndex !== undefined && initialSnippetIndex >= 0) return initialSnippetIndex;
    if (snippetList && initialSnippet) {
      const idx = snippetList.findIndex(s => s.id === initialSnippet.id);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  useEffect(() => {
    if (initialSnippetIndex !== undefined && initialSnippetIndex >= 0) {
      setCurrentListIndex(initialSnippetIndex);
    } else if (snippetList && initialSnippet) {
      const idx = snippetList.findIndex(s => s.id === initialSnippet.id);
      if (idx >= 0) setCurrentListIndex(idx);
    }
  }, [initialSnippetIndex, snippetList, initialSnippet]);

  const hasMultipleSnippets = Boolean(snippetList && snippetList.length > 1);
  const canGoPrev = hasMultipleSnippets && currentListIndex > 0;
  const canGoNext = hasMultipleSnippets && snippetList ? currentListIndex < (snippetList.length - 1) : false;

  const handleNavigateSnippet = useCallback((newIndex: number) => {
    if (!snippetList || newIndex < 0 || newIndex >= snippetList.length) return;
    setCurrentListIndex(newIndex);
    const targetSnippet = snippetList[newIndex];
    canonicalSourceRef.current = targetSnippet;
    setUndoHistory([]);
    const userInst = normalizeInstrumentToKey(defaultInstrument);
    const isTargetDrum = targetSnippet.instrument === 'drums' || targetSnippet.clef === 'percussion';
    const nextSnippet = (!isTargetDrum && userInst !== 'universal' && targetSnippet.instrument !== userInst)
      ? resolveSnippetForInstrument(targetSnippet, userInst)
      : targetSnippet;

    setSnippet(nextSnippet);
    if (nextSnippet.displayMode) {
      setDisplayMode(nextSnippet.displayMode);
    }
    setActiveBar(0);
    setActiveFraction(0);
    stopPlayback();
  }, [snippetList, defaultInstrument, stopPlayback]);

  const handleManualStop = useCallback(() => {
    const wasChallenge = isChallengeOpen && isPlaying;
    stopPlayback();
    setCountInInfo(null);
    if (wasChallenge) {
      setIsAbortedNotice(true);
      setTimeout(() => setIsAbortedNotice(false), 3200);
    }
  }, [isChallengeOpen, isPlaying, stopPlayback]);

  const startPlayback = useCallback(() => {
    if (!synthRef.current) return;
    const synth = synthRef.current;

    // 🛡️ Verhindert parallele Doppel-Timer bei schnellem Re-Trigger (Leertaste / Speed-Wechsel)
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    if (visualTimeoutsRef.current.length > 0) {
      visualTimeoutsRef.current.forEach(clearTimeout);
      visualTimeoutsRef.current = [];
    }
    synth.stopAll();

    const ctx = synth.init();

    setIsPlaying(true);
    setIsAbortedNotice(false);

    let curBar = 0;
    let curFraction = 0;
    let isStopped = false;
    setActiveBar(0);
    setActiveFraction(0);
    setPlayheadPos({ bar: 0, fraction: 0 });

    const effectiveBpm = snippet.tempoBpm * speedRate;
    const beatSec = 60 / effectiveBpm;
    const exactSixteenthSec = beatSec / 4;

    const fractionsPerBar = snippet.timeSignature === '3/4' || snippet.timeSignature === '6/8' ? 12 : snippet.timeSignature === '2/4' ? 8 : 16;
    const beatsPerBar = snippet.timeSignature === '3/4' ? 3 : snippet.timeSignature === '2/4' ? 2 : snippet.timeSignature === '6/8' ? 6 : 4;

    const fractionsPerBeat = fractionsPerBar / beatsPerBar;
    let isPreRollActive = isChallengeOpenRef.current;
    let preRollFraction = 0;

    // 🏛️ 0,1% Goldstandard W3C Two-Clock Lookahead Scheduler (Chris Wilson Pattern):
    // 20ms High-Frequency Polling mit 90ms Audio-Lookahead-Fenster -> 0,00ms Jitter & 100% Gleichlauf von Klick & Beat
    const LOOKAHEAD_WINDOW_SEC = 0.090;
    const SCHEDULER_INTERVAL_MS = 20;
    let nextStepAudioTime = ctx.currentTime + 0.024;

    const scheduleSingleStep = (scheduleBaseTime: number) => {
      const nowAudioTime = synth.init().currentTime;
      const visualDelayMs = Math.max(0, Math.round((scheduleBaseTime - nowAudioTime) * 1000));

      // 🌟 0,1% Goldstandard Vorzähler: Exakt 1 voller Takt Vorlauf auf demselben Hardware-Clock-Raster
      if (isPreRollActive) {
        if (preRollFraction < fractionsPerBar) {
          if (preRollFraction % fractionsPerBeat === 0) {
            const beatNum = Math.floor(preRollFraction / fractionsPerBeat) + 1;
            synth.scheduleMetronomeClick(scheduleBaseTime, beatNum === 1);
            if (visualDelayMs <= 8) {
              setCountInInfo({ currentBeat: beatNum, totalBeats: beatsPerBar });
            } else {
              const tId = setTimeout(() => {
                if (!isStopped) setCountInInfo({ currentBeat: beatNum, totalBeats: beatsPerBar });
              }, visualDelayMs);
              visualTimeoutsRef.current.push(tId);
            }
          }
          preRollFraction += 1;
          return;
        }
        isPreRollActive = false;
        if (visualDelayMs <= 8) {
          setCountInInfo(null);
        } else {
          const tId = setTimeout(() => {
            if (!isStopped) setCountInInfo(null);
          }, visualDelayMs);
          visualTimeoutsRef.current.push(tId);
        }
        curBar = 0;
        curFraction = 0;
      }

      const stepBar = curBar;
      const stepFraction = curFraction;
      const activeSnippet = snippetRef.current;
      const activeInst = activeSnippet.instrument;
      let isBeatClick = false;
      let isAccent = false;
      if (activeSnippet.timeSignature === '6/8') {
        isBeatClick = stepFraction === 0 || stepFraction === 6;
        isAccent = stepFraction === 0;
      } else {
        isBeatClick = stepFraction % 4 === 0;
        isAccent = stepFraction === 0;
      }

      if (isBeatClick && isMetronomeActiveRef.current) {
        synth.scheduleMetronomeClick(scheduleBaseTime, isAccent);
      }

      try {
        const notesAtPos = activeSnippet.notes.filter(
          n => n.barIndex === stepBar && Math.abs(n.beatFraction - stepFraction) < 0.5
        );
        const pitchedNotes = notesAtPos.filter(n => n.pitch !== 'REST');

        if (pitchedNotes.length > 0) {
          const polyVolume = 0.65 / Math.sqrt(Math.max(1, pitchedNotes.length));
          pitchedNotes.forEach((n, idx) => {
            const sixteenthCount = durationToSixteenths(n.duration, n.isDotted, n.isTriplet);
            const noteDurationSec = (sixteenthCount * exactSixteenthSec) * 0.92;
            const delay = activeInst === 'guitar' ? idx * 0.012 : 0;
            synth.scheduleToneAtTime(
              activeInst,
              n.pitch,
              scheduleBaseTime + delay,
              noteDurationSec,
              polyVolume
            );
          });
        }
      } catch (err) {
        console.warn('[MicroScoreStudioModal] Audio Scheduling Fail-Closed Intercepted:', err);
      } finally {
        // Visuellen Playhead & Stick-Impact exakt auf den Audio-Zeitstempel synchronisieren
        if (visualDelayMs <= 8) {
          setActiveBar(stepBar);
          setActiveFraction(stepFraction);
          setPlayheadPos({ bar: stepBar, fraction: stepFraction });
        } else {
          const tId = setTimeout(() => {
            if (!isStopped) {
              setActiveBar(stepBar);
              setActiveFraction(stepFraction);
              setPlayheadPos({ bar: stepBar, fraction: stepFraction });
            }
          }, visualDelayMs);
          visualTimeoutsRef.current.push(tId);
        }

        curFraction += 1;
        if (curFraction >= fractionsPerBar) {
          curFraction = 0;
          curBar += 1;
          if (curBar >= activeSnippet.barsCount) {
            if (isLoopingRef.current && !isChallengeOpenRef.current) {
              curBar = 0;
            } else {
              isStopped = true;
              const endDelayMs = Math.max(20, Math.round((scheduleBaseTime + exactSixteenthSec - nowAudioTime) * 1000));
              const stopTId = setTimeout(() => {
                stopPlayback();
                if (isChallengeOpenRef.current) {
                  evaluateChallengeCompletion();
                }
              }, endDelayMs);
              visualTimeoutsRef.current.push(stopTId);
            }
          }
        }
      }
    };

    const lookaheadTick = () => {
      if (isStopped) return;
      const nowAudioTime = synth.init().currentTime;
      // Falls Tab im Hintergrund war (> 350ms Rückstand), sanft auf aktuelle Audio-Zeit synchronisieren
      if (nextStepAudioTime < nowAudioTime - 0.050) {
        nextStepAudioTime = nowAudioTime + 0.020;
      }
      while (!isStopped && nextStepAudioTime < nowAudioTime + LOOKAHEAD_WINDOW_SEC) {
        const scheduleTime = Math.max(nowAudioTime + 0.004, nextStepAudioTime);
        scheduleSingleStep(scheduleTime);
        nextStepAudioTime += exactSixteenthSec;
      }
    };

    lookaheadTick();
    playTimerRef.current = setInterval(lookaheadTick, SCHEDULER_INTERVAL_MS);
  }, [snippet, speedRate, stopPlayback, evaluateChallengeCompletion]);

  // Zurück zum Taktanfang
  const handleRewind = useCallback(() => {
    setActiveBar(0);
    setActiveFraction(0);
    setPlayheadPos({ bar: 0, fraction: 0 });
    setCountInInfo(null);
    if (isPlaying) {
      stopPlayback();
      setTimeout(() => startPlayback(), 50);
    }
  }, [isPlaying, stopPlayback, startPlayback]);

  // Speichern in LocalStorage und optional DB-Callback
  const handleSave = () => {
    try {
      const updatedSnippet = { 
        ...snippet, 
        displayMode,
        updatedAt: new Date().toISOString() 
      };
      localStorage.setItem(`campus_microscore_${updatedSnippet.id}`, JSON.stringify(updatedSnippet));
      if (taskId) {
        localStorage.setItem(`campus_task_microscore_${taskId}`, JSON.stringify(updatedSnippet));
      }
      if (onSaveSnippet) {
        onSaveSnippet(updatedSnippet);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      console.warn('Speichern fehlgeschlagen:', e);
    }
  };

  // 🎹 0,1% Goldstandard: DAW- & Studio-Shortcuts (Space, Metronom, Loop, Blättern, Speed, Save, Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;

      // 1. Space: Play / Stopp Toggle (DAW Standard — Capture-Phase schützt gegen Button-/Pad-/Select-Fokus-Kollisionen)
      if (e.code === 'Space' || e.key === ' ') {
        // Text-Eingabefelder (Titel, Notizen) haben absoluten Vorrang für reguläre Leerzeichen
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            (target as any).isContentEditable)
        ) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        if (target && (target.tagName === 'BUTTON' || target.tagName === 'SELECT' || target.getAttribute('role') === 'button' || target.getAttribute('role') === 'tab')) {
          target.blur();
        }
        if (isPlaying) {
          handleManualStop();
        } else {
          startPlayback();
        }
        return;
      }

      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          (target as any).isContentEditable)
      ) {
        return;
      }

      // 2. Pfeiltasten links / rechts: Vorherige / Nächste Übung
      if (e.key === 'ArrowLeft' && canGoPrev) {
        e.preventDefault();
        handleNavigateSnippet(currentListIndex - 1);
        return;
      } else if (e.key === 'ArrowRight' && canGoNext) {
        e.preventDefault();
        handleNavigateSnippet(currentListIndex + 1);
        return;
      }

      // 3. M: Metronom Klick an / aus
      if ((e.key === 'm' || e.key === 'M') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsMetronomeActive(prev => !prev);
        return;
      }

      // 4. L: Loop Modus an / aus
      if ((e.key === 'l' || e.key === 'L') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsLooping(prev => !prev);
        return;
      }

      // 5. 1 / 2 / 3: Übegeschwindigkeit (0.8x, 1.0x, 1.2x)
      if (!e.metaKey && !e.ctrlKey) {
        if (e.key === '1') {
          e.preventDefault();
          setSpeedRate(0.8);
          return;
        } else if (e.key === '2') {
          e.preventDefault();
          setSpeedRate(1.0);
          return;
        } else if (e.key === '3') {
          e.preventDefault();
          setSpeedRate(1.2);
          return;
        }
      }

      // 6. Cmd + S / Ctrl + S: Speichern
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSave();
        return;
      }

      // 7. Escape: Bei Playback -> Stopp, sonst Modal schließen
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isPlaying) {
          handleManualStop();
        } else {
          onClose();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [
    isOpen,
    isPlaying,
    canGoPrev,
    canGoNext,
    currentListIndex,
    startPlayback,
    handleManualStop,
    handleNavigateSnippet,
    handleSave,
    onClose
  ]);

  if (!isOpen) return null;

  const isStringOrPlucked = snippet.instrument === 'guitar' || snippet.instrument === 'bass' || snippet.instrument === 'strings' || snippet.instrument === 'ukulele';
  const isGuitar = isStringOrPlucked;

  // 0,1% Duales Fokus-Modell: Noten + maximal 1 visuelle Übersetzungshilfe (entweder Tabulatur ODER Griffbrett/Visualizer)
  const showInstrumentVisualizer = isMobileLandscape
    ? (viewMode === 'fretboard' || viewMode === 'keys' || viewMode === 'drums')
    : (viewMode === 'both' || viewMode === 'fretboard' || viewMode === 'keys' || viewMode === 'drums');

  const showStaffNotation = isMobileLandscape
    ? (viewMode === 'notes' || viewMode === 'tabs')
    : (viewMode === 'notes' || viewMode === 'tabs' || viewMode === 'fretboard' || viewMode === 'both');

  const effectiveDisplayMode: MicroScoreDisplayMode = useMemo(() => {
    // 🛡️ Fail-Closed Dual-Focus: Wenn 'fretboard' gewählt ist -> Noten + Griffbrett (ohne Tabulatur-Zwischenzeile).
    // Wenn 'tabs' gewählt ist -> Noten + Tabulatur (ohne Griffbrett).
    if (isStringOrPlucked && viewMode === 'fretboard') return 'notes';
    if (viewMode === 'tabs' || viewMode === 'both') return 'both';
    return 'notes';
  }, [viewMode, isStringOrPlucked]);

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Micro-Score Studio: ${snippet.title}`}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          stopPlayback();
          onClose();
        }
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: isStudioMaximized ? '#0f172a' : 'rgba(15, 23, 42, 0.75)',
        backdropFilter: isStudioMaximized ? 'none' : 'blur(10px)',
        WebkitBackdropFilter: isStudioMaximized ? 'none' : 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isStudioMaximized ? '0' : '12px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: isStudioMaximized ? '0' : '24px',
          width: '100%',
          maxWidth: isStudioMaximized ? '100%' : 'min(1560px, 96vw)',
          height: isStudioMaximized ? '100%' : 'auto',
          maxHeight: isStudioMaximized ? '100dvh' : '96vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isStudioMaximized ? 'none' : '0 25px 60px -15px rgba(0, 0, 0, 0.28), 0 0 1px rgba(0, 0, 0, 0.1)',
          border: isStudioMaximized ? 'none' : '1px solid #e2e8f0',
          overflow: 'hidden',
          paddingTop: isMobileLandscape ? 'env(safe-area-inset-top, 0px)' : '0',
          paddingBottom: isMobileLandscape ? 'env(safe-area-inset-bottom, 0px)' : '0',
          paddingLeft: isMobileLandscape ? 'env(safe-area-inset-left, 0px)' : '0',
          paddingRight: isMobileLandscape ? 'env(safe-area-inset-right, 0px)' : '0'
        }}
      >
        {/* ========================================================================= */}
        {/* 1. HEADER: Cupertino Squircle, Titel & Direkte Apple Transport-Controls    */}
        {/* ========================================================================= */}
        <MicroScoreStudioHeader
          snippet={snippet}
          setSnippet={setSnippet}
          theme={theme}
          taskId={taskId}
          taskTitle={taskTitle}
          readOnly={readOnly}
          showTemplates={showTemplates}
          setShowTemplates={setShowTemplates}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isPlaying={isPlaying}
          stopPlayback={stopPlayback}
          startPlayback={startPlayback}
          handleManualStop={handleManualStop}
          handleRewind={handleRewind}
          handleSave={handleSave}
          savedSuccess={savedSuccess}
          hasMultipleSnippets={hasMultipleSnippets}
          snippetList={snippetList}
          currentListIndex={currentListIndex}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          handleNavigateSnippet={handleNavigateSnippet}
          isStudioMaximized={isStudioMaximized}
          handleToggleFullscreen={handleToggleFullscreen}
          onClose={onClose}
          activeBar={activeBar}
          setActiveBar={setActiveBar}
          availableInstrumentOptions={availableInstrumentOptions}
          handleInstrumentChange={handleInstrumentChange}
          viewMode={viewMode}
          setViewMode={setViewMode}
          isMobileLandscape={isMobileLandscape}
          isLooping={isLooping}
          setIsLooping={setIsLooping}
          speedRate={speedRate}
          setSpeedRate={setSpeedRate}
          isMetronomeActive={isMetronomeActive}
          setIsMetronomeActive={setIsMetronomeActive}
          soloSample={soloSample}
          setSoloSample={setSoloSample}
          isChallengeOpen={isChallengeOpen}
          setIsChallengeOpen={setIsChallengeOpen}
          setChallengeHits={setChallengeHits}
          setCountInInfo={setCountInInfo}
          applyDrumPreset={applyDrumPreset}
          isColorGuide={isDrumColorGuide}
          onToggleColorGuide={(val) => setIsDrumColorGuide(prev => typeof val === 'boolean' ? val : !prev)}
        />

        {/* ========================================================================= */}
        {/* 2. LEINWAND (CANVAS): Urtext Notensatz & 2-Zeilen Apple Baukasten-Dock     */}
        {/* ========================================================================= */}
        <div style={{
          padding: isMobileLandscape ? '8px 16px' : (isMobile || isTablet || isStudioMaximized) ? '12px 20px' : '16px 20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobileLandscape ? '8px' : '14px',
          flex: 1
        }}>
          {/* 🎯 Challenge Heads-Up Display (im Üben-Modus bei geöffneter Challenge) */}
          {activeTab === 'practice' && isChallengeOpen && (
            <div style={{ animation: 'fadeIn 0.2s ease', width: '100%' }}>
              <MicroScoreChallengeEngine
                snippet={snippet}
                activeBar={activeBar}
                activeFraction={activeFraction}
                isPlaying={isPlaying}
                autoStartMic={true}
                onNoteHit={handleNoteHit}
              />
            </div>
          )}

          {/* 🎼 2027 0,1% Goldstandard Noten- & Tabulatur-Engine mit Live Treffer-Coloring */}
          {showStaffNotation && (
            <div style={{ position: 'relative' }}>
              <MicroScoreStaffNotation
                snippet={snippet}
                activeBar={activeBar}
                activeFraction={activeFraction}
                activeString={activeString}
                displayMode={effectiveDisplayMode}
                isPlaying={isPlaying}
                playheadPosition={playheadPos}
                noteHits={challengeHits}
                activeDuration={activeDuration}
                isTripletMode={isTripletMode}
                isDottedMode={isDottedMode}
                onUpdateNotes={handleUpdateNotes}
                onSelectPosition={(bar, frac, str) => {
                  setActiveBar(bar);
                  setActiveFraction(frac);
                  if (str !== undefined) setActiveString(str);
                }}
                onDuplicateBar={handleDuplicateBar1}
                onClearBar={handleClearActiveBar}
                onPlayPreviewNote={(pitch) => {
                  synthRef.current?.playToneNow(snippet.instrument, pitch, getDidacticNoteDurationSec(activeDuration, snippet.tempoBpm, isDottedMode, isTripletMode), 0.7);
                }}
                onUpdateBarsCount={(newCount) => {
                  setSnippet(prev => ({ ...prev, barsCount: Math.min(4, newCount) }));
                }}
                onAddBar={handleAddBar}
                onRemoveBar={handleRemoveBar}
                onInsertPitchDirectly={handleInsertDirectStaffNote}
                isDrumColorGuide={isDrumColorGuide}
                readOnly={readOnly || activeTab === 'practice'}
              />

              {/* 🌟 Prominente Floating Edge-Paddles für 1-Klick-Navigation (nur im Übe-Modus, kein versehentliches Wegblättern beim Editieren) */}
              {activeTab === 'practice' && hasMultipleSnippets && canGoPrev && snippetList && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigateSnippet(currentListIndex - 1);
                  }}
                  aria-label="Vorherige Übung"
                  title={`Vorherige Übung: ${snippetList[currentListIndex - 1]?.title || ''}`}
                  style={{
                    position: 'absolute',
                    left: isMobile ? '2px' : '-16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 30,
                    width: isMobile ? '32px' : '42px',
                    height: isMobile ? '44px' : '58px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.10)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#0f172a',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                    e.currentTarget.style.boxShadow = '0 6px 22px rgba(0, 0, 0, 0.16)';
                    e.currentTarget.style.borderColor = '#94a3b8';
                    e.currentTarget.style.background = '#ffffff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.10)';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                  }}
                >
                  <ChevronLeft size={isMobile ? 18 : 22} strokeWidth={2.8} />
                </button>
              )}

              {activeTab === 'practice' && hasMultipleSnippets && canGoNext && snippetList && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigateSnippet(currentListIndex + 1);
                  }}
                  aria-label="Nächste Übung"
                  title={`Nächste Übung: ${snippetList[currentListIndex + 1]?.title || ''}`}
                  style={{
                    position: 'absolute',
                    right: isMobile ? '2px' : '-16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 30,
                    width: isMobile ? '32px' : '42px',
                    height: isMobile ? '44px' : '58px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.10)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#0f172a',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                    e.currentTarget.style.boxShadow = '0 6px 22px rgba(0, 0, 0, 0.16)';
                    e.currentTarget.style.borderColor = '#94a3b8';
                    e.currentTarget.style.background = '#ffffff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                  }}
                >
                  <ChevronRight size={isMobile ? 18 : 22} strokeWidth={2.8} />
                </button>
              )}

              {/* 🌟 100% Weltreise Einzähler (Count-In) Overlay */}
              {countInInfo && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(15, 23, 42, 0.94)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    color: '#ffffff',
                    borderRadius: '20px',
                    padding: '16px 36px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 40,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                    pointerEvents: 'none'
                  }}
                >
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                    Bereit machen
                  </span>
                  <span style={{ fontSize: '3.4rem', fontWeight: 900, lineHeight: 1, color: '#38bdf8', fontVariantNumeric: 'tabular-nums' }}>
                    {countInInfo.currentBeat}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                    Schlag {countInInfo.currentBeat} von {countInInfo.totalBeats}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 🎹/🎸/🎻 2027 0,1% Goldstandard Instrumenten-Visualizer (Piano-Tastatur, Vollbreiten-Griffbrett, Bläser-Grifftabelle, Drum-Pads) */}
          {showInstrumentVisualizer && (
            <div style={{ width: '100%', animation: 'fadeIn 0.18s ease' }}>
              <MicroScoreInstrumentVisualizer
                instrument={snippet.instrument}
                activePitches={currentActivePitches}
                activeNotes={currentActiveNotes}
                playheadPos={playheadPos}
                clef={snippet.clef}
                isDrumColorGuide={isDrumColorGuide}
                onToggleDrumColorGuide={() => setIsDrumColorGuide(prev => !prev)}
                isSoloStage={!showStaffNotation}
                onPlayPreviewPitch={(p) => synthRef.current?.playToneNow(snippet.instrument, p, getDidacticNoteDurationSec(activeDuration, snippet.tempoBpm, isDottedMode, isTripletMode), 0.7)}
                onInsertPitch={activeTab === 'write' ? (p, sIdx, f) => handleInsertDirectStaffNote(activeBar, activeFraction, p, undefined, false, sIdx, f) : undefined}
                readOnly={readOnly}
              />
            </div>
          )}

          {/* 🛑 Challenge Abgebrochen Banner */}
          {isAbortedNotice && (
            <div
              style={{
                background: '#fffbeb',
                border: 'none',
                color: '#92400e',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={16} color="#d97706" />
              <span>Challenge abgebrochen — Es wurden keine Sterne oder Punkte gespeichert.</span>
            </div>
          )}

          {/* 🌟 2027 0,1% Goldstandard Baukasten Dock (nur im Noten-Bearbeiten-Modus) */}
          {activeTab === 'write' && (() => {
            const activeStepLen = durationToSixteenthCount(activeDuration, isDottedMode, isTripletMode);
            const currentBeatLabel = getBeatLabel(activeFraction, snippet.timeSignature, activeStepLen);
            const spokenBeat = getSpokenBeatLabel(currentBeatLabel);
            const activeStepBadge = `Takt ${activeBar + 1} · ${spokenBeat}`;

            return (
              <MicroScoreBaukastenDock
                activeDuration={activeDuration}
                onSelectDuration={(newDur) => {
                  setActiveDuration(newDur);
                  const isCurrentOccupied = snippet.notes.some(
                    n => n.barIndex === activeBar && Math.abs(n.beatFraction - activeFraction) < 0.5
                  );
                  if (!isCurrentOccupied) {
                    const frontier = getSequentialFrontierSlot(
                      snippet.notes,
                      snippet.barsCount,
                      snippet.timeSignature,
                      newDur,
                      isDottedMode,
                      isTripletMode
                    );
                    if (!frontier.isScoreFull) {
                      setActiveBar(frontier.barIndex);
                      setActiveFraction(frontier.fraction);
                    }
                  }
                }}
                isDotted={isDottedMode}
                onToggleDotted={() => {
                  const nextDotted = !isDottedMode;
                  const nextTriplet = nextDotted ? false : isTripletMode;
                  setIsDottedMode(nextDotted);
                  if (nextDotted) setIsTripletMode(false);
                  const isCurrentOccupied = snippet.notes.some(
                    n => n.barIndex === activeBar && Math.abs(n.beatFraction - activeFraction) < 0.5
                  );
                  if (!isCurrentOccupied) {
                    const frontier = getSequentialFrontierSlot(
                      snippet.notes,
                      snippet.barsCount,
                      snippet.timeSignature,
                      activeDuration,
                      nextDotted,
                      nextTriplet
                    );
                    if (!frontier.isScoreFull) {
                      setActiveBar(frontier.barIndex);
                      setActiveFraction(frontier.fraction);
                    }
                  }
                }}
                isTriplet={isTripletMode}
                onToggleTriplet={() => {
                  const nextTriplet = !isTripletMode;
                  const nextDotted = nextTriplet ? false : isDottedMode;
                  setIsTripletMode(nextTriplet);
                  if (nextTriplet) setIsDottedMode(false);
                  const isCurrentOccupied = snippet.notes.some(
                    n => n.barIndex === activeBar && Math.abs(n.beatFraction - activeFraction) < 0.5
                  );
                  if (!isCurrentOccupied) {
                    const frontier = getSequentialFrontierSlot(
                      snippet.notes,
                      snippet.barsCount,
                      snippet.timeSignature,
                      activeDuration,
                      nextDotted,
                      nextTriplet
                    );
                    if (!frontier.isScoreFull) {
                      setActiveBar(frontier.barIndex);
                      setActiveFraction(frontier.fraction);
                    }
                  }
                }}
                onInsertRest={handleInsertTouchRest}
                onUndo={handleUndo}
                canUndo={undoHistory.length > 0}
                onClearAll={handleClearAllNotes}
                hasNotes={snippet.notes.length > 0}
                onDeleteNote={handleDeleteTouchNote}
                activeStepBadge={activeStepBadge}
                onInsertPitch={handleInsertTouchPitch}
                onInsertPitchStack={handleInsertTouchPitchStack}
                onInsertDrumCombo={handleInsertDrumCombo}
                defaultOctave={snippet.instrument === 'bass' ? 2 : 4}
                activeAccidental={activeAccidental}
                onToggleAccidental={handleToggleAccidental}
                isChordMode={isChordMode}
                onToggleChordMode={handleToggleChordMode}
                chordQuality={chordQuality}
                onToggleChordQuality={handleToggleChordQuality}
                instrument={snippet.instrument}
                readOnly={readOnly}
              />
            );
          })()}
        </div>
      </div>

      {/* 🏆 0,1% Goldstandard Celebration Modal nach Challenge-Abschluss */}
      {celebrationData && (
        <MicroScoreCelebrationModal
          isOpen={true}
          onClose={() => setCelebrationData(null)}
          onRetry={() => {
            setCelebrationData(null);
            setChallengeHits({});
            setTimeout(() => {
              startPlayback();
            }, 100);
          }}
          stars={celebrationData.stars}
          scorePercent={celebrationData.scorePercent}
          hitCount={celebrationData.hitCount}
          nearCount={celebrationData.nearCount}
          missCount={celebrationData.missCount}
          xpAwarded={celebrationData.xpAwarded}
          snippetTitle={snippet.title}
        />
      )}

      {/* 🔒 0,1% Goldstandard Orientation Lock für Smartphones im Hochformat */}
      <MicroScoreOrientationLock
        isOpen={isMobilePortrait}
        onCancel={() => {
          stopPlayback();
          onClose();
        }}
      />
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
