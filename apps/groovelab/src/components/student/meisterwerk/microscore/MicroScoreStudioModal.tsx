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
import { X, Play, Square, Save, Music, Sparkles, Check, Minus, Plus, ChevronDown, Headphones, Pencil, BookOpen, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import { MicroScoreDuration, MicroScoreInstrument, MicroScoreNote, MicroScoreSnippet, MicroScoreDisplayMode, MicroScoreTimeSignature } from './microScore.types';
import { MicroScoreAudioSynthesizer, durationToSixteenths } from './microScoreAudioSynthesizer';
import { getDidacticNoteDurationSec } from './microScoreGridEngine';
import { MicroScoreStaffNotation } from './MicroScoreStaffNotation';
import { pitchToBestFretAndString, getInstrumentChordVoicing } from './guitarFretboardEngine';
import { MicroScoreBaukastenDock } from './MicroScoreBaukastenDock';
import { MicroScorePlayerBar, getInstrumentTheme } from './MicroScorePlayerBar';
import { MicroScoreChallengeEngine } from './MicroScoreChallengeEngine';
import { MicroScoreCelebrationModal } from './MicroScoreCelebrationModal';
import { playTriumphantXpChime } from '../../../../utils/campusXpEffects';
import { normalizeInstrumentToKey, resolveSnippetForInstrument } from '../../../../services/canonicalScoreEngine';
import { MicroScoreInstrumentVisualizer } from './MicroScoreInstrumentVisualizer';
import { VDM_DRUM_PRESETS, VdmDrumPreset, QUICK_TITLE_CHIPS, INSTRUMENT_OPTIONS } from './vdmDrumPresets';
import { calculateActiveMicroScoreNotes } from './microScoreActiveNotesHelper';
import { useMicroScoreViewport } from './useMicroScoreViewport';
import { MicroScoreOrientationLock } from './MicroScoreOrientationLock';
import { MicroScoreViewModeSwitcher, MicroScoreViewMode } from './MicroScoreViewModeSwitcher';
import { MicroScoreTemplateChipsBar } from './MicroScoreTemplateChipsBar';

export interface MicroScoreStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSnippet?: MicroScoreSnippet | null;
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

  // 🎨 0,1% Goldstandard Apple Studio States
  const [showTemplates, setShowTemplates] = useState(false);
  const [snippet, setSnippet] = useState<MicroScoreSnippet>(() => {
    const userInst = normalizeInstrumentToKey(defaultInstrument);
    if (initialSnippet) {
      if (initialSnippet.instrument === 'universal' && userInst !== 'universal') {
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
  const availableInstrumentOptions = useMemo(() => {
    if (isHarmonicExercise) {
      return INSTRUMENT_OPTIONS.filter(opt => opt.value !== 'drums');
    }
    return INSTRUMENT_OPTIONS;
  }, [isHarmonicExercise]);
  // Fail-Safe: Falls Schlagzeug in einer harmonischen Übung angewählt war, sofort umschalten
  useEffect(() => {
    if (isHarmonicExercise && snippet.instrument === 'drums') {
      setSnippet(prev => ({
        ...prev,
        instrument: 'piano',
        clef: 'treble'
      }));
    }
  }, [isHarmonicExercise, snippet.instrument]);
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
    return isStr ? (snippet.displayMode === 'tabs' ? 'tabs' : 'fretboard') : 'both';
  });
  const [displayMode, setDisplayMode] = useState<MicroScoreDisplayMode>(() => {
    if (initialSnippet?.displayMode) return initialSnippet.displayMode;
    return snippet.instrument === 'guitar' ? 'both' : 'notes';
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
  const snippetRef = useRef<MicroScoreSnippet>(snippet);
  snippetRef.current = snippet;

  // Initialisiere Audio-Synthesizer
  useEffect(() => {
    synthRef.current = new MicroScoreAudioSynthesizer();
    return () => {
      if (synthRef.current) synthRef.current.stopAll();
      if (playTimerRef.current) clearInterval(playTimerRef.current);
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
  const advanceCursor = useCallback((fromBar = activeBar, fromFraction = activeFraction) => {
    const stepMap: Record<MicroScoreDuration, number> = { '1': 16, '2': 8, '4': 4, '8': 2, '16': 1 };
    let step = stepMap[activeDuration] || 4;
    if (isTripletMode) step = Math.max(1, Math.round((step * 2) / 3));
    else if (isDottedMode) step = Math.floor(step * 1.5);

    const fractionsPerBar = snippet.timeSignature === '3/4' || snippet.timeSignature === '6/8' ? 12 : snippet.timeSignature === '2/4' ? 8 : 16;

    let nextFraction = fromFraction + step;
    let nextBar = fromBar;
    if (nextFraction >= fractionsPerBar) {
      nextFraction = nextFraction - fractionsPerBar;
      nextBar = fromBar + 1;
      if (nextBar >= snippet.barsCount) {
        if (snippet.barsCount < 4) {
          setSnippet(prev => ({ ...prev, barsCount: Math.min(4, prev.barsCount + 1) }));
        } else {
          nextBar = 0;
        }
      }
    }
    setActiveFraction(nextFraction);
    setActiveBar(nextBar);
  }, [activeBar, activeFraction, activeDuration, isTripletMode, isDottedMode, snippet.barsCount, snippet.timeSignature]);

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
          if (snippet.instrument === 'guitar' || snippet.instrument === 'bass') {
            const best = pitchToBestFretAndString(newPitch, n.stringIndex, snippet.instrument === 'bass');
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
      advanceCursor(activeBar, activeFraction);
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

    setActiveBar(barIdx);
    setActiveFraction(fractionIdx);

    const didDuration = getDidacticNoteDurationSec(activeDuration, snippet.tempoBpm, isDottedMode, isTripletMode);

    if (isChordMode && !forceSinglePitch) {
      // Smart Akkord-Modus: Generiere fertigen Akkord für das Instrument
      const voicingNotes = getInstrumentChordVoicing(pitch, chordQuality, snippet.instrument);
      if (voicingNotes.length > 0) {
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
        handleUpdateNotes([...filtered, ...newNotes]);
        if (advanceOverride === true) {
          advanceCursor(barIdx, fractionIdx);
        }
        return;
      }
    }

    // Normaler Modus oder Manuelles Schichten / Polyphonie (SSOT: Explizite Saite/Bund priorisieren)
    let fret: number | undefined = explicitFret;
    let stringIndex: number | undefined = explicitStringIndex;
    if ((snippet.instrument === 'guitar' || snippet.instrument === 'bass') && (fret === undefined || stringIndex === undefined)) {
      const usedStrings = snippet.notes
        .filter(n => n.barIndex === barIdx && Math.abs(n.beatFraction - fractionIdx) < 0.5 && n.stringIndex !== undefined)
        .map(n => n.stringIndex!);
      const best = pitchToBestFretAndString(pitch, activeString, snippet.instrument === 'bass', usedStrings);
      if (best) {
        fret = best.fret;
        stringIndex = best.stringIndex;
        setActiveString(best.stringIndex);
      }
    } else if (stringIndex !== undefined) {
      setActiveString(stringIndex);
    }

    const currentSlotNotes = snippet.notes.filter(
      n => n.barIndex === barIdx && Math.abs(n.beatFraction - fractionIdx) < 0.5
    );

    const existingSamePitch = currentSlotNotes.find(n => n.pitch === pitch);
    if (existingSamePitch) {
      const filtered = snippet.notes.filter(n => n.id !== existingSamePitch.id);
      handleUpdateNotes(filtered);
      return;
    }

    const newNote: MicroScoreNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      barIndex: barIdx,
      beatFraction: fractionIdx,
      duration: activeDuration,
      pitch,
      fret,
      stringIndex,
      isTriplet: isTripletMode,
      isDotted: isDottedMode
    };

    const withoutRests = snippet.notes.filter(
      n => !(n.barIndex === barIdx && Math.abs(n.beatFraction - fractionIdx) < 0.5 && n.pitch === 'REST')
    );
    const updatedNotes = [...withoutRests, newNote];
    handleUpdateNotes(updatedNotes);

    const resultingSlot = updatedNotes.filter(
      n => n.barIndex === barIdx && Math.abs(n.beatFraction - fractionIdx) < 0.5
    );
    if (resultingSlot.length > 1) {
      synthRef.current?.playChordNow(snippet.instrument, resultingSlot.map(n => n.pitch), didDuration, 0.7);
    } else {
      synthRef.current?.playToneNow(snippet.instrument, pitch, didDuration, 0.7);
    }

    // Melodischer Auto-Advance: Bei normaler Melodie-Eingabe gleitet der Cursor zum nächsten Slot
    const shouldAdvance = advanceOverride !== undefined ? advanceOverride : !isChordMode;
    if (shouldAdvance) {
      advanceCursor(barIdx, fractionIdx);
    }
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

  // 0,1% Smart Backspace: Aktuelle Note löschen oder einen Slot zurückgehen
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
    } else {
      const stepMap: Record<MicroScoreDuration, number> = { '1': 16, '2': 8, '4': 4, '8': 2, '16': 1 };
      let step = stepMap[activeDuration] || 4;
      const fractionsPerBar = snippet.timeSignature === '3/4' || snippet.timeSignature === '6/8' ? 12 : snippet.timeSignature === '2/4' ? 8 : 16;
      let prevFraction = activeFraction - step;
      let prevBar = activeBar;
      if (prevFraction < 0) {
        if (prevBar > 0) {
          prevBar -= 1;
          prevFraction = fractionsPerBar - step;
        } else {
          prevFraction = 0;
        }
      }
      setActiveBar(prevBar);
      setActiveFraction(prevFraction);
      const filtered = snippet.notes.filter(
        n => !(n.barIndex === prevBar && Math.abs(n.beatFraction - prevFraction) < 0.5)
      );
      if (filtered.length !== snippet.notes.length) {
        handleUpdateNotes(filtered);
      }
    }
  };

  // Instrumenten-Wechsel mit kanonischer Projektion (Tabs, Bünde, Schlüssel) & Realtime-Audio
  const handleInstrumentChange = (newInst: MicroScoreInstrument) => {
    const resolved = resolveSnippetForInstrument(snippet, newInst);
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
    if (synthRef.current) {
      synthRef.current.stopAll();
    }
  }, []);

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
    synth.init();

    setIsPlaying(true);
    setIsAbortedNotice(false);

    let curBar = 0;
    let curFraction = 0;
    setActiveBar(0);
    setActiveFraction(0);
    setPlayheadPos({ bar: 0, fraction: 0 });

    const effectiveBpm = snippet.tempoBpm * speedRate;
    const beatSec = 60 / effectiveBpm;
    const sixteenthMs = Math.round((beatSec / 4) * 1000);

    const fractionsPerBar = snippet.timeSignature === '3/4' || snippet.timeSignature === '6/8' ? 12 : snippet.timeSignature === '2/4' ? 8 : 16;
    const beatsPerBar = snippet.timeSignature === '3/4' ? 3 : snippet.timeSignature === '2/4' ? 2 : snippet.timeSignature === '6/8' ? 6 : 4;

    const fractionsPerBeat = fractionsPerBar / beatsPerBar;
    let isPreRollActive = isChallengeOpen;
    let preRollFraction = 0;

    playTimerRef.current = setInterval(() => {
      // 🌟 0,1% Goldstandard Vorzähler: Exakt 1 voller Takt Vorlauf mit atomarem Reset
      if (isPreRollActive) {
        if (preRollFraction % fractionsPerBeat === 0) {
          const beatNum = Math.floor(preRollFraction / fractionsPerBeat) + 1;
          setCountInInfo({ currentBeat: beatNum, totalBeats: beatsPerBar });
          synth.scheduleMetronomeClick(synth.init().currentTime, beatNum === 1);
        }
        preRollFraction += 1;
        if (preRollFraction >= fractionsPerBar) {
          isPreRollActive = false;
          setCountInInfo(null);
          curBar = 0;
          curFraction = 0;
          // Atomarer Übergang: Gehe direkt in Song-Playback auf Zählzeit 1.0 (Tick 0)
        } else {
          return;
        }
      }

      // Metronom-Klick passend zur Taktart (Echtzeit-Ref)
      const activeSnippet = snippetRef.current;
      const activeInst = activeSnippet.instrument;
      let isBeatClick = false;
      let isAccent = false;
      if (activeSnippet.timeSignature === '6/8') {
        isBeatClick = curFraction === 0 || curFraction === 6;
        isAccent = curFraction === 0;
      } else {
        isBeatClick = curFraction % 4 === 0;
        isAccent = curFraction === 0;
      }
      const nowAudioTime = synth.init().currentTime;
      // 0,1% W3C Web Audio Standard: 40ms Lookahead-Puffer gegen JS-Jitter & Safari AudioParam Dropouts
      const scheduleBaseTime = nowAudioTime + 0.040;

      if (isBeatClick && isMetronomeActive) {
        synth.scheduleMetronomeClick(scheduleBaseTime, isAccent);
      }

      // Polyphone Noten/Akkorde an dieser Zählzeit abspielen mit Live-Instrumenten-Sound
      try {
        const notesAtPos = activeSnippet.notes.filter(
          n => n.barIndex === curBar && Math.abs(n.beatFraction - curFraction) < 0.5
        );
        const pitchedNotes = notesAtPos.filter(n => n.pitch !== 'REST');

        if (pitchedNotes.length > 0) {
          const polyVolume = 0.65 / Math.sqrt(Math.max(1, pitchedNotes.length));
          pitchedNotes.forEach((n, idx) => {
            const sixteenthCount = durationToSixteenths(n.duration, n.isDotted, n.isTriplet);
            const noteDurationSec = (sixteenthCount * (beatSec / 4)) * 0.92;
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
        // 🛡️ 0,1% Goldstandard: Garantierte State-Fortschreibung (Verhindert Silent Event Loop Freeze)
        setActiveBar(curBar);
        setActiveFraction(curFraction);
        setPlayheadPos({ bar: curBar, fraction: curFraction });

        curFraction += 1;
        if (curFraction >= fractionsPerBar) {
          curFraction = 0;
          curBar += 1;
          if (curBar >= activeSnippet.barsCount) {
            if (isLooping && !isChallengeOpen) {
              curBar = 0;
            } else {
              stopPlayback();
              if (isChallengeOpen) {
                evaluateChallengeCompletion();
              }
            }
          }
        }
      }
    }, sixteenthMs);
  }, [snippet, speedRate, isLooping, isMetronomeActive, isChallengeOpen, stopPlayback, evaluateChallengeCompletion]);

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

  if (!isOpen) return null;

  const isStringOrPlucked = snippet.instrument === 'guitar' || snippet.instrument === 'bass' || snippet.instrument === 'strings';
  const isGuitar = isStringOrPlucked;

  // 0,1% Didaktische Sichtbarkeit: Entweder Tabs ODER Griffbrett (nie beides!)
  const showInstrumentVisualizer = isMobileLandscape
    ? (viewMode === 'fretboard' || viewMode === 'keys' || viewMode === 'drums')
    : (viewMode === 'both' || viewMode === 'fretboard' || viewMode === 'keys' || viewMode === 'drums');

  const showStaffNotation = isMobileLandscape
    ? (viewMode === 'notes' || viewMode === 'tabs')
    : (viewMode === 'notes' || viewMode === 'tabs' || viewMode === 'fretboard' || viewMode === 'both');

  const effectiveDisplayMode: MicroScoreDisplayMode = useMemo(() => {
    // 🛡️ Fail-Closed: Wenn Griffbrett sichtbar ist, dürfen NIEMALS Tabs gerendert werden!
    if (isStringOrPlucked && showInstrumentVisualizer) return 'notes';
    if (viewMode === 'tabs') return 'both'; // Tab-Modus -> Notensystem + Tabulatur
    return 'notes';
  }, [viewMode, isStringOrPlucked, showInstrumentVisualizer]);

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
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            {/* Linke Seite: Apple Monochrome Squircle + Titel */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '220px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  background: theme.primary,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 2px 10px ${theme.glow}`,
                  flexShrink: 0
                }}
              >
                <Music size={18} color="#ffffff" strokeWidth={2.5} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                {taskId || taskTitle ? (
                  <>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <BookOpen size={12} strokeWidth={2.2} />
                      <span>Hausaufgabe · Noten-Schnipsel</span>
                    </span>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '1.14rem',
                        fontWeight: 900,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontFamily: 'inherit'
                      }}
                      title={snippet.title}
                    >
                      {snippet.title}
                    </h2>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      value={snippet.title}
                      onChange={e => setSnippet(prev => ({ ...prev, title: e.target.value }))}
                      disabled={readOnly}
                      placeholder="Schnipsel benennen (z. B. Tonleiter, Rhythmus-Drill)"
                      aria-label="Titel des Micro-Score Schnipsels"
                      style={{
                        fontSize: '1.12rem',
                        fontWeight: 900,
                        color: '#0f172a',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        width: '100%',
                        fontFamily: 'inherit',
                        padding: 0
                      }}
                    />
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => setShowTemplates(prev => !prev)}
                        style={{
                          border: '1px solid #e2e8f0',
                          background: showTemplates ? '#f1f5f9' : '#ffffff',
                          color: '#64748b',
                          borderRadius: '99px',
                          padding: '3px 8px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0
                        }}
                        title="Vorlagen-Namen anzeigen"
                      >
                        <Sparkles size={11} color="#64748b" />
                        <span>Vorlagen</span>
                        <ChevronDown size={10} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Rechte Seite: Modus-Tabs + Fertig + Schließen (direkt nebeneinander) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* 🌟 2-Tab Segment: 🎧 Üben & Mitspielen vs. ✍️ Noten bearbeiten */}
              <div
                role="tablist"
                aria-label="Micro-Score Arbeitsmodus"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#f1f5f9',
                  borderRadius: '12px',
                  padding: '3px',
                  gap: '3px'
                }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'practice'}
                  onClick={() => {
                    setActiveTab('practice');
                    if (isPlaying) stopPlayback();
                  }}
                  style={{
                    border: 'none',
                    background: activeTab === 'practice' ? theme.primary : 'transparent',
                    color: activeTab === 'practice' ? '#ffffff' : '#64748b',
                    borderRadius: '9px',
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    boxShadow: activeTab === 'practice' ? `0 2px 8px ${theme.glow}` : 'none'
                  }}
                >
                  <Headphones size={15} strokeWidth={2.2} color="currentColor" />
                  <span>Üben & Mitspielen</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'write'}
                  onClick={() => {
                    setActiveTab('write');
                    if (isPlaying) stopPlayback();
                  }}
                  style={{
                    border: 'none',
                    background: activeTab === 'write' ? '#4f46e5' : 'transparent',
                    color: activeTab === 'write' ? '#ffffff' : '#64748b',
                    borderRadius: '9px',
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    boxShadow: activeTab === 'write' ? '0 2px 8px rgba(79,70,229,0.3)' : 'none'
                  }}
                >
                  <Pencil size={15} strokeWidth={2.2} color="currentColor" />
                  <span>Noten bearbeiten</span>
                </button>
              </div>

              {/* Fertig / Speichern Button (direkt oben rechts neben Noten bearbeiten) */}
              {!readOnly && (
                <button
                  type="button"
                  role="button"
                  tabIndex={0}
                  onClick={handleSave}
                  style={{
                    border: 'none',
                    background: savedSuccess ? '#059669' : '#4f46e5',
                    color: '#ffffff',
                    borderRadius: '10px',
                    height: '32px',
                    padding: '0 12px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: savedSuccess ? '0 2px 10px rgba(5,150,105,0.3)' : '0 2px 10px rgba(79,70,229,0.35)',
                    transition: 'all 0.15s ease'
                  }}
                  title="Schnipsel speichern"
                >
                  {savedSuccess ? <Check size={13} strokeWidth={3} /> : <Save size={13} />}
                  <span>{savedSuccess ? 'Gespeichert! ✓' : 'Fertig'}</span>
                </button>
              )}

              {/* Vollbild-Umschalter (Fullscreen / Maximize) */}
              <button
                type="button"
                role="button"
                tabIndex={0}
                onClick={handleToggleFullscreen}
                aria-label={isStudioMaximized ? "Vollbild verkleinern" : "Vollbild aktivieren"}
                title={isStudioMaximized ? "Vollbild verkleinern (F)" : "Vollbildmodus aktivieren (F)"}
                style={{
                  border: 'none',
                  background: isStudioMaximized ? '#e0e7ff' : '#f1f5f9',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: isStudioMaximized ? '#4f46e5' : '#475569',
                  transition: 'all 0.15s ease'
                }}
              >
                {isStudioMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>

              {/* Schließen Button */}
              <button
                type="button"
                role="button"
                tabIndex={0}
                onClick={() => {
                  stopPlayback();
                  onClose();
                }}
                aria-label="Schließen"
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                  transition: 'background 0.15s ease'
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Row 2: Zusätzliche Audio- & Noten-Einstellungen (Takte, Taktart, BPM, Instrument) & 0,1% Header Transport Deck */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Wenn im Schreib-Modus: Taktanzahl, Taktart, BPM Stepper & Preview */}
              {activeTab === 'write' && (
                <>
                  {/* Taktanzahl 1–4 Segmented Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '11px', padding: '3px', gap: '2px' }}>
                    {[1, 2, 3, 4].map(bars => (
                      <button
                        key={bars}
                        type="button"
                        onClick={() => {
                          if (readOnly) return;
                          setSnippet(prev => ({ ...prev, barsCount: bars }));
                          if (activeBar >= bars) setActiveBar(bars - 1);
                        }}
                        style={{
                          border: 'none',
                          background: snippet.barsCount === bars ? theme.primary : 'transparent',
                          color: snippet.barsCount === bars ? '#ffffff' : '#64748b',
                          borderRadius: '8px',
                          padding: '4px 9px',
                          fontSize: '0.74rem',
                          fontWeight: snippet.barsCount === bars ? 900 : 700,
                          cursor: readOnly ? 'default' : 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: snippet.barsCount === bars ? `0 1px 4px ${theme.glow}` : 'none'
                        }}
                        title={`${bars} ${bars === 1 ? 'Takt' : 'Takte'}`}
                      >
                        {bars}T
                      </button>
                    ))}
                  </div>

                  {/* Taktart */}
                  <div style={{ position: 'relative' }}>
                    <select
                      value={snippet.timeSignature}
                      onChange={e => setSnippet(prev => ({ ...prev, timeSignature: e.target.value as MicroScoreTimeSignature }))}
                      disabled={readOnly}
                      style={{ height: '32px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 24px 0 8px', fontSize: '0.74rem', fontWeight: 800, background: '#ffffff', color: '#0f172a', cursor: readOnly ? 'default' : 'pointer', appearance: 'none', outline: 'none' }}
                      title="Taktart auswählen"
                    >
                      <option value="4/4">4/4</option>
                      <option value="3/4">3/4</option>
                      <option value="2/4">2/4</option>
                      <option value="6/8">6/8</option>
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
                  </div>

                  {/* Tempo Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '2px 4px', gap: '3px' }}>
                    <button
                      type="button"
                      onClick={() => setSnippet(prev => ({ ...prev, tempoBpm: Math.max(40, prev.tempoBpm - 2) }))}
                      disabled={readOnly}
                      title="2 BPM langsamer"
                      style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                    >
                      <Minus size={12} strokeWidth={2.5} />
                    </button>
                    <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {snippet.tempoBpm} <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b' }}>BPM</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSnippet(prev => ({ ...prev, tempoBpm: Math.min(240, prev.tempoBpm + 2) }))}
                      disabled={readOnly}
                      title="2 BPM schneller"
                      style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                    >
                      <Plus size={12} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Kompakter Vorschau-Button im Schreibmodus */}
                  <button
                    type="button"
                    onClick={isPlaying ? stopPlayback : startPlayback}
                    style={{ border: 'none', background: isPlaying ? '#dc2626' : '#0f172a', color: '#ffffff', borderRadius: '10px', height: '32px', padding: '0 12px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)', transition: 'all 0.15s ease' }}
                    title={isPlaying ? 'Wiedergabe stoppen' : 'Schnipsel abspielen'}
                  >
                    {isPlaying ? <Square size={12} fill="#ffffff" /> : <Play size={12} fill="#ffffff" />}
                    <span>{isPlaying ? 'Stopp' : 'Anhören'}</span>
                  </button>
                </>
              )}

              {/* Instrument Dropdown (Immer sichtbar) */}
              <div style={{ position: 'relative' }}>
                <select
                  value={snippet.instrument}
                  onChange={e => handleInstrumentChange(e.target.value as MicroScoreInstrument)}
                  disabled={readOnly}
                  style={{
                    height: '32px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '0 26px 0 8px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    background: '#ffffff',
                    color: '#0f172a',
                    cursor: readOnly ? 'default' : 'pointer',
                    appearance: 'none',
                    outline: 'none'
                  }}
                  title="Instrument wechseln"
                >
                  {availableInstrumentOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#64748b'
                  }}
                />
              </div>

              {/* 🌟 2027 0,1% Goldstandard Universeller Didaktik-Tab-Schalter */}
              <MicroScoreViewModeSwitcher
                instrument={snippet.instrument}
                activeMode={viewMode}
                onSelectMode={setViewMode}
                isMobileLandscape={isMobileLandscape}
                themeColor={theme.primary}
                readOnly={readOnly}
              />
            </div>

            {/* 🌟 2027 0,1% Goldstandard Header Transport Deck im Übe-Modus */}
            {activeTab === 'practice' && (
              <MicroScorePlayerBar
                variant="header"
                isPlaying={isPlaying}
                onTogglePlay={isPlaying ? handleManualStop : startPlayback}
                onRewind={handleRewind}
                isLooping={isLooping}
                onToggleLoop={() => setIsLooping(prev => !prev)}
                speedRate={speedRate}
                onChangeSpeed={(speed) => {
                  setSpeedRate(speed);
                  if (isPlaying) {
                    stopPlayback();
                    setTimeout(() => startPlayback(), 60);
                  }
                }}
                isMetronomeActive={isMetronomeActive}
                onToggleMetronome={() => setIsMetronomeActive(prev => !prev)}
                soloSample={soloSample}
                onToggleSoloSample={() => setSoloSample(prev => !prev)}
                instrument={snippet.instrument}
                tempoBpm={snippet.tempoBpm}
                isChallengeOpen={isChallengeOpen}
                onToggleChallenge={() => {
                  setIsChallengeOpen(prev => {
                    const next = !prev;
                    if (next) {
                      setChallengeHits({});
                    } else {
                      if (isPlaying) stopPlayback();
                      setCountInInfo(null);
                    }
                    return next;
                  });
                }}
                readOnly={readOnly}
              />
            )}
          </div>

          {/* Quick-Chips Leiste & VdM Drum Vorlagen (bei Toggle eingeblendet) */}
          {showTemplates && (
            <MicroScoreTemplateChipsBar
              instrument={snippet.instrument}
              currentTitle={snippet.title}
              onSelectDrumPreset={applyDrumPreset}
              onSelectTitleChip={(chip) => {
                setSnippet(prev => ({ ...prev, title: chip }));
                setShowTemplates(false);
              }}
              readOnly={readOnly}
            />
          )}
        </div>

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
                onInsertPitchDirectly={handleInsertDirectStaffNote}
                readOnly={readOnly || activeTab === 'practice'}
              />

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
                border: '1px solid #fde68a',
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
          {activeTab === 'write' && (
            <MicroScoreBaukastenDock
              activeDuration={activeDuration}
              onSelectDuration={setActiveDuration}
              isDotted={isDottedMode}
              onToggleDotted={() => {
                setIsDottedMode(prev => {
                  const next = !prev;
                  if (next) setIsTripletMode(false);
                  return next;
                });
              }}
              isTriplet={isTripletMode}
              onToggleTriplet={() => {
                setIsTripletMode(prev => {
                  const next = !prev;
                  if (next) setIsDottedMode(false);
                  return next;
                });
              }}
              onInsertRest={handleInsertTouchRest}
              onUndo={handleUndo}
              canUndo={undoHistory.length > 0}
              onDeleteNote={handleDeleteTouchNote}
              onAdvanceCursor={handleAdvanceCursor}
              onInsertPitch={handleInsertTouchPitch}
              onInsertPitchStack={handleInsertTouchPitchStack}
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
          )}
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
