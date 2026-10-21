import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Volume2,
  Play,
  Sparkles,
  X,
  Trophy,
  Radio,
  Lightbulb,
  Headphones,
  Sliders,
  Music,
  Mic,
  Flame,
  Activity,
  Check,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { 
  earSynth, 
  SoundEngineTimbre, 
  IntervalPlaybackMode, 
  ChordPlaybackMode,
  AnchorNoteStep
} from '../../services/audio/EarSynthEngine';
import { midiToNoteName } from '../../services/audio/YinPitchDetectionEngine';
import { EarLabSingBackStage } from './EarLabSingBackStage';
import { EarLeaderboardWidget, EarDiscipline, EarVdmLevel } from './EarLeaderboardWidget';
import { 
  VdmBadgeLevel, 
  VdmMedallionSvg, 
  saveVdmBadge, 
  getVdmPredicate, 
  getVdmBadgeTitle 
} from './VdmBadgeMedallions';
import { supabase } from '../../lib/supabase';
import { getEffectiveInstrument } from '../../utils/avatarResolutionEngine';
import { normalizeInstrumentToKey } from '../../services/canonicalScoreEngine';
import { MicroScoreInstrument } from '../student/meisterwerk/microscore/microScore.types';

import {
  INSTRUMENT_META,
  type TrainingPillar,
  type VdmLevel,
  type IntervalPlaySelectionMode,
  type IntervalItem,
  type ChordItem,
  type ChordInversionItem,
  INTERVAL_CATALOG,
  CHORD_CATALOG,
  CHORD_INVERSIONS
} from './earLabCatalogData';
export type { TrainingPillar, VdmLevel, IntervalPlaySelectionMode, ChordInversionItem };

export interface EarLabStudioModalProps {
  student?: any;
  onClose?: () => void;
  onRewardXp?: (xp: number, reason: string) => void;
  onSessionComplete?: (summary: { vdmLevel: VdmLevel; pillar: TrainingPillar; accuracy: number; xp: number }) => void;
  uiLevel?: 'junior' | 'teen' | 'pro';
  embedded?: boolean;
  useNotebookLayout?: boolean;
}

// 🎤 Sing-Back Ton-Pool (Junior & D1–D3)
const PITCH_MATCH_NOTES: { midi: number; label: string; vdmLevel: VdmLevel }[] = [
  { midi: 60, label: 'C4', vdmLevel: 'junior' },
  { midi: 64, label: 'E4', vdmLevel: 'junior' },
  { midi: 67, label: 'G4', vdmLevel: 'junior' },
  { midi: 62, label: 'D4', vdmLevel: 'd1' },
  { midi: 65, label: 'F4', vdmLevel: 'd1' },
  { midi: 69, label: 'A4', vdmLevel: 'd1' },
  { midi: 71, label: 'B4', vdmLevel: 'd2' },
  { midi: 72, label: 'C5', vdmLevel: 'd2' },
  { midi: 61, label: 'C#4', vdmLevel: 'd3' },
  { midi: 63, label: 'D#4', vdmLevel: 'd3' },
  { midi: 66, label: 'F#4', vdmLevel: 'd3' },
  { midi: 68, label: 'G#4', vdmLevel: 'd3' },
  { midi: 70, label: 'A#4', vdmLevel: 'd3' }
];

// 🎨 0,1% Musikpädagogischer Goldstandard: Didaktische Vektor-Geste für Intervalle
// Mathematisch proportionale Steigung (Δy) mit reaktiver Richtungs-Kohärenz & Referenz-Horizont
const renderIntervalGesture = (
  id: string,
  semitones: number,
  color: string = '#7c3aed',
  mode: IntervalPlaybackMode = 'ascending'
) => {
  const w = 48;
  const h = 28;
  const r = 3.2; // Großzügiger, klar lesbarer Ton-Punkt für Weitsicht

  // 1. PRIME (Unisono / Zwilling): 0 Halbtöne
  if (semitones === 0 || id === 'p1') {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} aria-hidden="true">
        {/* Referenz-Horizont */}
        <line x1="4" y1="20" x2="44" y2="20" stroke={color} strokeWidth="1.2" strokeDasharray="2.5 2.5" opacity="0.25" />
        {/* Gestrichelte Gleichklang-Brücke */}
        <line x1="9" y1="14" x2="39" y2="14" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="3 3" />
        <circle cx="9" cy="14" r={r} fill={color} />
        <circle cx="39" cy="14" r={r} fill={color} />
      </svg>
    );
  }

  // Proportionale vertikale Auslenkung (Δy): 1 HT = 1.5px ... 12 HT = 17px
  const dy = Math.min(17, Math.max(2, semitones * 1.45));

  // 2. MODUS: HARMONISCH (◆ Zusammen / Simultan)
  // Beide Töne erklingen gleichzeitig -> vertikales "Türmchen" wie ein Noten-Zweiklang
  if (mode === 'harmonic') {
    const x = 24;
    const yBase = 22;
    const yTarget = Math.max(5, yBase - dy);
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} aria-hidden="true">
        {/* Referenz-Horizont */}
        <line x1="10" y1="24.5" x2="38" y2="24.5" stroke={color} strokeWidth="1.2" strokeDasharray="2.5 2.5" opacity="0.25" />
        {/* Vertikale Zweiklang-Klammer */}
        <line x1={x} y1={yBase} x2={x} y2={yTarget} stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx={x} cy={yBase} r={r} fill={color} />
        <circle cx={x} cy={yTarget} r={r} fill={color} />
      </svg>
    );
  }

  // 3. MODUS: ABSTEIGEND (▼ Ab)
  // Ton 1 beginnt oben links, Ton 2 fällt nach rechts unten
  if (mode === 'descending') {
    const x1 = 9;
    const x2 = 39;
    const y1 = 6;
    const y2 = Math.min(22, y1 + dy);

    if (id === 'p8' || semitones >= 12) {
      // Oktave abwärts: Schwungvoller Tiefenbogen
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} aria-hidden="true">
          <line x1="4" y1="4" x2="44" y2="4" stroke={color} strokeWidth="1.2" strokeDasharray="2.5 2.5" opacity="0.25" />
          <path d="M 9 6 Q 24 25 39 22" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="9" cy="6" r={r} fill={color} />
          <circle cx="39" cy="22" r={r} fill={color} />
        </svg>
      );
    }

    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} aria-hidden="true">
        {/* Oberer Referenz-Horizont */}
        <line x1="4" y1="4" x2="44" y2="4" stroke={color} strokeWidth="1.2" strokeDasharray="2.5 2.5" opacity="0.25" />
        {/* Diagonale Gefällslinie */}
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx={x1} cy={y1} r={r} fill={color} />
        <circle cx={x2} cy={y2} r={r} fill={color} />
      </svg>
    );
  }

  // 4. MODUS: AUFSTEIGEND (▲ Auf) - Standard
  // Ton 1 beginnt unten links auf dem Horizont, Ton 2 steigt proportional nach rechts oben
  const x1 = 9;
  const x2 = 39;
  const y1 = 22;
  const y2 = Math.max(5, y1 - dy);

  if (id === 'p8' || semitones >= 12) {
    // Oktave aufwärts (Riesensprung): Hoher Himmelsbogen von Basis bis Zenit
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} aria-hidden="true">
        <line x1="4" y1="24.5" x2="44" y2="24.5" stroke={color} strokeWidth="1.2" strokeDasharray="2.5 2.5" opacity="0.25" />
        <path d="M 9 22 Q 24 3 39 5" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="9" cy="22" r={r} fill={color} />
        <circle cx="39" cy="5" r={r} fill={color} />
      </svg>
    );
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} aria-hidden="true">
      {/* Basis-Horizont (Glockenspiel- / Notenlinien-Referenz) */}
      <line x1="4" y1="24.5" x2="44" y2="24.5" stroke={color} strokeWidth="1.2" strokeDasharray="2.5 2.5" opacity="0.25" />
      {/* Proportionale Steigungslinie */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx={x1} cy={y1} r={r} fill={color} />
      <circle cx={x2} cy={y2} r={r} fill={color} />
    </svg>
  );
};

export const EarLabStudioModal: React.FC<EarLabStudioModalProps> = ({
  student,
  onClose,
  onRewardXp,
  onSessionComplete,
  uiLevel = 'teen',
  embedded = false,
  useNotebookLayout = false
}) => {
  // Navigation: Studio vs. Hall of Ear
  const [activeView, setActiveView] = useState<'studio' | 'hall_of_ear'>('studio');

  // 3 Tonale Säulen (Rhythmus obsolet)
  const [activePillar, setActivePillar] = useState<TrainingPillar>('intervals');
  const [vdmLevel, setVdmLevel] = useState<VdmLevel>(uiLevel === 'junior' ? 'junior' : 'd1');

  // 🏛️ 0,1% Goldstandard: Instrumenten-Erkennung des Schülers & Schlagzeug-Sonderfall
  const rawStudentInst = useMemo(() => {
    return (
      student?.instrument ||
      student?.main_instrument ||
      student?.resolved_instrument ||
      student?.groovelab_instrument ||
      student?.subject ||
      (student ? getEffectiveInstrument(student) : null)
    );
  }, [student]);

  const resolvedStudentInst: MicroScoreInstrument = useMemo(() => {
    return normalizeInstrumentToKey(rawStudentInst);
  }, [rawStudentInst]);

  const isPercussion = resolvedStudentInst === 'drums';
  const effectiveUserInst: MicroScoreInstrument = isPercussion ? 'piano' : resolvedStudentInst;
  const userInstMeta = INSTRUMENT_META[resolvedStudentInst] || { label: 'Instrument', icon: '🎵' };

  // 2-Wege-Wahlfreiheit: 'instrument' vs. 'piano' mit Persistenz
  const [soundSelectionMode, setSoundSelectionMode] = useState<'instrument' | 'piano'>(() => {
    try {
      const saved = localStorage.getItem(`ear_lab_sound_mode_${student?.id || 'guest'}`);
      if (saved === 'piano' || saved === 'instrument') return saved;
      return isPercussion ? 'piano' : 'instrument';
    } catch {
      return isPercussion ? 'piano' : 'instrument';
    }
  });

  const handleSoundSelectionModeChange = (mode: 'instrument' | 'piano') => {
    setSoundSelectionMode(mode);
    try {
      localStorage.setItem(`ear_lab_sound_mode_${student?.id || 'guest'}`, mode);
    } catch {}
  };

  const [soundTimbre, setSoundTimbre] = useState<SoundEngineTimbre>(() => {
    if (isPercussion || soundSelectionMode === 'piano') return 'grand_piano';
    return effectiveUserInst as SoundEngineTimbre;
  });

  // Synchronisation des aktiven Timbres für EarSynthEngine
  useEffect(() => {
    if (soundSelectionMode === 'piano' || isPercussion) {
      setSoundTimbre('grand_piano');
    } else {
      setSoundTimbre(effectiveUserInst as SoundEngineTimbre);
    }
  }, [soundSelectionMode, effectiveUserInst, isPercussion]);

  // Key Center Drone (Tonika-Bordun)
  const [isDroneEnabled, setIsDroneEnabled] = useState<boolean>(false);
  const [droneRootMidi, setDroneRootMidi] = useState<number>(48); // C3

  // 1. Intervall-Labor State & Synästhetische Tonstufen-Brücke
  const [intervalPlayMode, setIntervalPlayMode] = useState<IntervalPlaySelectionMode>('ascending');
  const [currentIntervalQuestion, setCurrentIntervalQuestion] = useState<{
    rootMidi: number;
    interval: IntervalItem;
    effectiveMode: 'ascending' | 'descending' | 'harmonic';
  } | null>(null);
  const [selectedIntervalAnswer, setSelectedIntervalAnswer] = useState<string | null>(null);
  const [isIntervalAnswerSubmitted, setIsIntervalAnswerSubmitted] = useState<boolean>(false);
  const [hasListenedToQuestion, setHasListenedToQuestion] = useState<boolean>(false);
  const [lastChosenInterval, setLastChosenInterval] = useState<IntervalItem | null>(null);
  const [playingToneStep, setPlayingToneStep] = useState<0 | 1 | 2>(0);
  const toneAnimationTimersRef = useRef<NodeJS.Timeout[]>([]);

  // 2. Akkord-Labor State & Umkehrungen
  const [chordPlayMode, setChordPlayMode] = useState<ChordPlaybackMode>('block');
  const [chordCategory, setChordCategory] = useState<'types' | 'inversions'>('types');
  const [currentChordQuestion, setCurrentChordQuestion] = useState<{
    rootMidi: number;
    chord: ChordItem | ChordInversionItem;
    isInversion: boolean;
  } | null>(null);
  const [selectedChordAnswer, setSelectedChordAnswer] = useState<string | null>(null);
  const [isChordAnswerSubmitted, setIsChordAnswerSubmitted] = useState<boolean>(false);
  const [hasListenedToChordQuestion, setHasListenedToChordQuestion] = useState<boolean>(false);
  const [lastChosenChord, setLastChosenChord] = useState<ChordItem | ChordInversionItem | null>(null);

  // 3. Sing-Back / Pitch-Match State (YIN)
  const [currentPitchQuestion, setCurrentPitchQuestion] = useState<{ midi: number; label: string } | null>(null);

  // Gamification & Session Metrics
  const [challengeProgress, setChallengeProgress] = useState({ current: 1, total: 10, correctCount: 0 });
  const [streak, setStreak] = useState<number>(0);
  const [maxSessionStreak, setMaxSessionStreak] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [isCompletedCelebration, setIsCompletedCelebration] = useState<boolean>(false);
  const [isBadgeSaved, setIsBadgeSaved] = useState<boolean>(false);
  const [latestRecordedSession, setLatestRecordedSession] = useState<{
    discipline: EarDiscipline;
    vdmLevel: EarVdmLevel;
    score: number;
    accuracy: number;
    streak: number;
    avgResponseTimeMs: number;
  } | null>(null);

  // Timbre an Synth übergeben
  useEffect(() => {
    earSynth.setTimbre(soundTimbre);
  }, [soundTimbre]);

  // Key Center Drone Lifecycle
  useEffect(() => {
    if (isDroneEnabled) {
      earSynth.startKeyCenterDrone(droneRootMidi);
    } else {
      earSynth.stopKeyCenterDrone();
    }
    return () => {
      earSynth.stopKeyCenterDrone();
    };
  }, [isDroneEnabled, droneRootMidi]);

  // Filterung nach VdM-Stufe (Junior, D1, D2, D3)
  const availableIntervals = useMemo(() => {
    return INTERVAL_CATALOG.filter(item => {
      if (vdmLevel === 'junior') return item.vdmLevel === 'junior';
      if (vdmLevel === 'd1') return item.vdmLevel === 'junior' || item.vdmLevel === 'd1';
      if (vdmLevel === 'd2') return item.vdmLevel === 'junior' || item.vdmLevel === 'd1' || item.vdmLevel === 'd2';
      return true; // D3 enthält alle 12 chromatischen Intervalle
    });
  }, [vdmLevel]);

  const availableChords = useMemo(() => {
    return CHORD_CATALOG.filter(item => {
      if (vdmLevel === 'junior') return item.vdmLevel === 'junior';
      if (vdmLevel === 'd1') return item.vdmLevel === 'junior' || item.vdmLevel === 'd1';
      if (vdmLevel === 'd2') return item.vdmLevel === 'junior' || item.vdmLevel === 'd1' || item.vdmLevel === 'd2';
      return true;
    });
  }, [vdmLevel]);

  const availablePitchNotes = useMemo(() => {
    return PITCH_MATCH_NOTES.filter(item => {
      if (vdmLevel === 'junior') return item.vdmLevel === 'junior';
      if (vdmLevel === 'd1') return item.vdmLevel === 'junior' || item.vdmLevel === 'd1';
      if (vdmLevel === 'd2') return item.vdmLevel === 'junior' || item.vdmLevel === 'd1' || item.vdmLevel === 'd2';
      return true;
    });
  }, [vdmLevel]);

  // Generiere Intervall-Frage (inkl. Prüfungs-Mix Auflösung)
  const generateNewIntervalQuestion = useCallback(() => {
    const randomInterval = availableIntervals[Math.floor(Math.random() * availableIntervals.length)];
    const rootMidi = 60 + Math.floor(Math.random() * 12); // C4 bis B4 (Eingestrichene Oktave)
    const effectiveMode: 'ascending' | 'descending' | 'harmonic' = intervalPlayMode === 'vdm_mix'
      ? (['ascending', 'descending', 'harmonic'] as const)[Math.floor(Math.random() * 3)]
      : intervalPlayMode;
    setCurrentIntervalQuestion({ rootMidi, interval: randomInterval, effectiveMode });
    setSelectedIntervalAnswer(null);
    setLastChosenInterval(null);
    setIsIntervalAnswerSubmitted(false);
    setHasListenedToQuestion(false);
    setPlayingToneStep(0);
    toneAnimationTimersRef.current.forEach(clearTimeout);
    toneAnimationTimersRef.current = [];
    setQuestionStartTime(Date.now());
  }, [availableIntervals, intervalPlayMode]);

  // Generiere Akkord-Frage (Dreiklänge vs. Umkehrungen für D2/D3)
  const generateNewChordQuestion = useCallback(() => {
    const isInversion = (vdmLevel === 'd2' || vdmLevel === 'd3') && chordCategory === 'inversions';
    if (isInversion) {
      const randomInv = CHORD_INVERSIONS[Math.floor(Math.random() * CHORD_INVERSIONS.length)];
      const rootMidi = 60 + Math.floor(Math.random() * 8); // C4 bis G4 (Akkord-Umkehrungen)
      setCurrentChordQuestion({ rootMidi, chord: randomInv, isInversion: true });
    } else {
      const randomChord = availableChords[Math.floor(Math.random() * availableChords.length)];
      const rootMidi = 60 + Math.floor(Math.random() * 8); // C4 bis G4 (Dreiklänge)
      setCurrentChordQuestion({ rootMidi, chord: randomChord, isInversion: false });
    }
    setSelectedChordAnswer(null);
    setLastChosenChord(null);
    setIsChordAnswerSubmitted(false);
    setHasListenedToChordQuestion(false);
    setQuestionStartTime(Date.now());
  }, [availableChords, chordCategory, vdmLevel]);

  // Generiere Pitch-Match Frage (vermeidet unmittelbare Wiederholung desselben Tons)
  const generateNewPitchQuestion = useCallback(() => {
    setCurrentPitchQuestion(prev => {
      const pool = availablePitchNotes.length > 1
        ? availablePitchNotes.filter(n => n.midi !== prev?.midi)
        : availablePitchNotes;
      return pool[Math.floor(Math.random() * pool.length)];
    });
    setQuestionStartTime(Date.now());
  }, [availablePitchNotes]);

  // Initialisiere erste Frage bei Pillar-, Stufen- oder Kategorie-Wechsel
  useEffect(() => {
    setChallengeProgress({ current: 1, total: 10, correctCount: 0 });
    setStreak(0);
    setMaxSessionStreak(0);
    setResponseTimes([]);
    setIsCompletedCelebration(false);
    setSessionStartTime(Date.now());

    if (activePillar === 'intervals') {
      generateNewIntervalQuestion();
    } else if (activePillar === 'chords') {
      generateNewChordQuestion();
    } else if (activePillar === 'pitch_match') {
      generateNewPitchQuestion();
    }
  }, [activePillar, vdmLevel, chordCategory, generateNewIntervalQuestion, generateNewChordQuestion, generateNewPitchQuestion]);

  // Intervall abspielen mit synchroner visueller Tonstufen-Animation
  const handlePlayCurrentInterval = useCallback(() => {
    if (!currentIntervalQuestion) return;

    // Vorherige Animations-Timer aufräumen
    toneAnimationTimersRef.current.forEach(clearTimeout);
    toneAnimationTimersRef.current = [];

    // Hör-Gatekeeper entsperren: Frage wurde gehört
    setHasListenedToQuestion(true);

    const mode = currentIntervalQuestion.effectiveMode;

    earSynth.playInterval(
      currentIntervalQuestion.rootMidi,
      currentIntervalQuestion.interval.semitones,
      mode,
      0.8,
      soundTimbre
    );

    if (mode === 'harmonic') {
      setPlayingToneStep(1);
      const t1 = setTimeout(() => setPlayingToneStep(2), 150);
      const tEnd = setTimeout(() => setPlayingToneStep(0), 1600);
      toneAnimationTimersRef.current.push(t1, tEnd);
    } else if (mode === 'descending') {
      setPlayingToneStep(2);
      const t2 = setTimeout(() => setPlayingToneStep(1), 740);
      const tEnd = setTimeout(() => setPlayingToneStep(0), 1600);
      toneAnimationTimersRef.current.push(t2, tEnd);
    } else {
      setPlayingToneStep(1);
      const t2 = setTimeout(() => setPlayingToneStep(2), 740);
      const tEnd = setTimeout(() => setPlayingToneStep(0), 1600);
      toneAnimationTimersRef.current.push(t2, tEnd);
    }
  }, [currentIntervalQuestion, soundTimbre]);

  // Didaktisches Kachel-Vorhören (A/B-Vergleich ohne Einreichen)
  const handlePreviewInterval = useCallback((e: React.MouseEvent, item: IntervalItem) => {
    e.stopPropagation();
    const root = currentIntervalQuestion?.rootMidi ?? 60;
    const mode = currentIntervalQuestion?.effectiveMode ?? 'ascending';
    earSynth.playInterval(
      root,
      item.semitones,
      mode,
      0.8,
      soundTimbre
    );
  }, [currentIntervalQuestion, soundTimbre]);

  // Didaktisches Song-Anker Melodie-Abspielen direkt von der Kachel
  const handlePlaySongAnchorMelody = useCallback((e: React.MouseEvent, item: IntervalItem) => {
    e.stopPropagation();
    const root = currentIntervalQuestion?.rootMidi ?? 60;
    earSynth.playSongAnchor(
      root,
      item.anchorNotes,
      0.35,
      soundTimbre
    );
  }, [currentIntervalQuestion, soundTimbre]);

  // Akkord abspielen
  const handlePlayCurrentChord = useCallback(() => {
    if (!currentChordQuestion) return;
    setHasListenedToChordQuestion(true);
    earSynth.playChord(
      currentChordQuestion.rootMidi,
      currentChordQuestion.chord.intervals,
      chordPlayMode,
      2.0,
      soundTimbre
    );
  }, [currentChordQuestion, chordPlayMode, soundTimbre]);

  // Didaktisches Kachel-Vorhören für Akkorde (A/B-Vergleich ohne Einreichen)
  const handlePreviewChord = useCallback((e: React.MouseEvent, item: ChordItem | ChordInversionItem) => {
    e.stopPropagation();
    if (!currentChordQuestion) return;
    earSynth.playChord(
      currentChordQuestion.rootMidi,
      item.intervals,
      chordPlayMode,
      2.0,
      soundTimbre
    );
  }, [currentChordQuestion, chordPlayMode, soundTimbre]);

  // Kadenz zur Einstimmung abspielen
  const handlePlayCadence = () => {
    earSynth.playCadence(60, soundTimbre);
  };

  // Session abschließen und autoritativ in DB persistieren
  const handleCompleteSession = useCallback(async (finalCorrectCount: number, finalStreak: number, finalTimes: number[]) => {
    const accuracy = Math.round((finalCorrectCount / challengeProgress.total) * 100);
    const avgResponseTimeMs = finalTimes.length > 0 
      ? Math.round(finalTimes.reduce((a, b) => a + b, 0) / finalTimes.length) 
      : 2000;

    // Speed-Weighted Score
    const speedFactor = Math.max(0.5, Math.min(2.0, 3000 / Math.max(600, avgResponseTimeMs)));
    const levelMult = vdmLevel === 'd3' ? 1.5 : vdmLevel === 'd2' ? 1.25 : vdmLevel === 'd1' ? 1.0 : 0.85;
    const calculatedScore = Math.round((accuracy * speedFactor * levelMult) + (finalStreak * 5));

    // XP Formel (mindestens 15 XP, bis zu 75 XP bei Meisterschaft)
    const earnedXp = Math.max(15, Math.round((accuracy * 0.5) + (finalStreak * 3)));

    const discipline = activePillar as EarDiscipline;
    const sessionPayload = {
      discipline,
      vdmLevel,
      score: calculatedScore,
      accuracy,
      streak: finalStreak,
      avgResponseTimeMs
    };

    setLatestRecordedSession(sessionPayload);
    setIsCompletedCelebration(true);

    // 1. Speichere autoritativ in Supabase
    try {
      if (student?.id) {
        await supabase.rpc('record_ear_training_session', {
          p_discipline: discipline,
          p_vdm_level: vdmLevel,
          p_accuracy: accuracy,
          p_streak: finalStreak,
          p_avg_response_time_ms: avgResponseTimeMs,
          p_instrument: student?.instrument || null,
          p_score: calculatedScore,
          p_xp: onRewardXp ? 0 : earnedXp,
          p_student_id: student?.id || null
        });
        window.dispatchEvent(new CustomEvent('cg_ear_score_recorded'));
      }
    } catch (err) {
      console.warn('[EarLab] Could not persist ear training score to Supabase:', err);
    }

    // 2. Rufe Parent-Callbacks auf (für XP-Animation und Klang-Skill-Radar)
    if (onRewardXp) {
      onRewardXp(earnedXp, `Gehörtraining (${discipline.toUpperCase()} • ${vdmLevel.toUpperCase()})`);
    }
    if (onSessionComplete) {
      onSessionComplete({
        vdmLevel,
        pillar: activePillar,
        accuracy,
        xp: earnedXp
      });
    }
  }, [challengeProgress.total, vdmLevel, activePillar, student?.id, student?.instrument, onRewardXp, onSessionComplete]);

  // Nächste Frage oder Session-Abschluss
  const advanceToNextStep = useCallback((isCorrect: boolean) => {
    const elapsed = Date.now() - questionStartTime;
    const updatedTimes = [...responseTimes, elapsed];
    setResponseTimes(updatedTimes);

    const newCorrect = isCorrect ? challengeProgress.correctCount + 1 : challengeProgress.correctCount;
    const newStreak = isCorrect ? streak + 1 : 0;
    const newMaxStreak = Math.max(maxSessionStreak, newStreak);
    setStreak(newStreak);
    setMaxSessionStreak(newMaxStreak);

    if (challengeProgress.current >= challengeProgress.total) {
      handleCompleteSession(newCorrect, newMaxStreak, updatedTimes);
    } else {
      setChallengeProgress(prev => ({
        ...prev,
        current: prev.current + 1,
        correctCount: newCorrect
      }));

      if (activePillar === 'intervals') {
        generateNewIntervalQuestion();
      } else if (activePillar === 'chords') {
        generateNewChordQuestion();
      } else if (activePillar === 'pitch_match') {
        generateNewPitchQuestion();
      }
    }
  }, [challengeProgress, questionStartTime, responseTimes, streak, maxSessionStreak, handleCompleteSession, activePillar, generateNewIntervalQuestion, generateNewChordQuestion, generateNewPitchQuestion]);

  // Intervall-Antwort prüfen mit didaktischer Feedback-Kassette
  const handleSelectIntervalAnswer = (intervalId: string) => {
    if (isIntervalAnswerSubmitted || !currentIntervalQuestion || !hasListenedToQuestion) return;
    const chosen = availableIntervals.find(i => i.id === intervalId) || null;
    setSelectedIntervalAnswer(intervalId);
    setLastChosenInterval(chosen);
    setIsIntervalAnswerSubmitted(true);
    const isCorrect = intervalId === currentIntervalQuestion.interval.id;
    // Wenn richtig: Kurze Genuss-Pause (1.6s) mit automatischem Übergang
    // Wenn falsch: Bleibt stehen, damit der Schüler den A/B Vergleich und Song-Anker anhören kann
    if (isCorrect) {
      setTimeout(() => {
        advanceToNextStep(true);
      }, 1600);
    }
  };

  // Akkord-Antwort prüfen mit didaktischer Feedback-Kassette (Dreiklang oder Umkehrung)
  const handleSelectChordAnswer = (chordId: string) => {
    if (isChordAnswerSubmitted || !currentChordQuestion || !hasListenedToChordQuestion) return;
    const isInversion = currentChordQuestion.isInversion;
    const chosen = isInversion
      ? (CHORD_INVERSIONS.find(c => c.id === chordId) || null)
      : (availableChords.find(c => c.id === chordId) || null);
    setSelectedChordAnswer(chordId);
    setLastChosenChord(chosen);
    setIsChordAnswerSubmitted(true);
    const isCorrect = chordId === currentChordQuestion.chord.id;
    if (isCorrect) {
      setTimeout(() => {
        advanceToNextStep(true);
      }, 1600);
    }
  };

  // A/B Vergleich Audio-Player
  const handlePlayHeardInterval = () => {
    if (!currentIntervalQuestion) return;
    earSynth.playInterval(
      currentIntervalQuestion.rootMidi,
      currentIntervalQuestion.interval.semitones,
      currentIntervalQuestion.effectiveMode,
      0.8,
      soundTimbre
    );
  };

  const handlePlayChosenInterval = () => {
    if (!currentIntervalQuestion || !lastChosenInterval) return;
    earSynth.playInterval(
      currentIntervalQuestion.rootMidi,
      lastChosenInterval.semitones,
      currentIntervalQuestion.effectiveMode,
      0.8,
      soundTimbre
    );
  };

  const handlePlayHeardChord = () => {
    if (!currentChordQuestion) return;
    earSynth.playChord(
      currentChordQuestion.rootMidi,
      currentChordQuestion.chord.intervals,
      chordPlayMode,
      2.0,
      soundTimbre
    );
  };

  const handlePlayChosenChord = () => {
    if (!currentChordQuestion || !lastChosenChord) return;
    earSynth.playChord(
      currentChordQuestion.rootMidi,
      lastChosenChord.intervals,
      chordPlayMode,
      2.0,
      soundTimbre
    );
  };

  const handleManualAdvanceInterval = () => {
    if (!currentIntervalQuestion || !selectedIntervalAnswer) return;
    const isCorrect = selectedIntervalAnswer === currentIntervalQuestion.interval.id;
    advanceToNextStep(isCorrect);
  };

  const handleManualAdvanceChord = () => {
    if (!currentChordQuestion || !selectedChordAnswer) return;
    const isCorrect = selectedChordAnswer === currentChordQuestion.chord.id;
    advanceToNextStep(isCorrect);
  };

  // Unmount Cleanup
  useEffect(() => {
    return () => {
      toneAnimationTimersRef.current.forEach(clearTimeout);
      earSynth.stopAll();
    };
  }, []);

  // Escape-Taste schließt den Dialog barrierefrei (BFSG / WCAG 2.2 AA)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const activeInterval = currentIntervalQuestion?.interval;
  const activeChord = currentChordQuestion?.chord;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={uiLevel === 'junior' ? 'Klang-Detektiv Studio' : 'Gehörtraining Studio'}
      style={{
        width: '100%',
        maxWidth: embedded ? '100%' : '1040px',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '24px',
        border: '1.5px solid #e2e8f0',
        padding: embedded ? '18px 22px' : '24px 28px',
        paddingBottom: embedded ? '18px 22px' : 'calc(24px + env(safe-area-inset-bottom, 0px))',
        boxShadow: 'none',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        color: '#0f172a'
      }}
    >
      {/* BFSG 2025 / WCAG 2.2 AA: Screenreader Live-Region für Gehörbildung */}
      <div role="status" aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
        {isIntervalAnswerSubmitted ? (selectedIntervalAnswer === currentIntervalQuestion?.interval.id ? 'Richtig beantwortet!' : `Leider nicht richtig. Die richtige Antwort war ${currentIntervalQuestion?.interval.name}.`) : isChordAnswerSubmitted ? (selectedChordAnswer === currentChordQuestion?.chord.id ? 'Akkord richtig erkannt!' : `Leider nicht richtig. Die richtige Antwort war ${currentChordQuestion?.chord.name}.`) : ''}
      </div>

      {/* 1. Header: Titel, Ansichten-Switch (Studio vs. Hall of Ear) & Schließen */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '8px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: '#a855f7',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'none'
          }}>
            <Headphones size={23} strokeWidth={2.4} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {uiLevel === 'junior' ? 'Klang-Detektiv' : 'Gehörtraining'}
            </h2>
            <span style={{ fontSize: '0.80rem', color: '#7e22ce', fontWeight: 750 }}>
              {uiLevel === 'junior' ? 'Höre genau hin: Welcher Ton-Sprung ist das?' : '0,1% Goldstandard • 3 Tonale Säulen'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Hall of Ear Toggle */}
          <button
            type="button"
            onClick={() => setActiveView(prev => prev === 'studio' ? 'hall_of_ear' : 'studio')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 14px',
              borderRadius: '12px',
              border: activeView === 'hall_of_ear' ? 'none' : '1.5px solid #e2e8f0',
              background: activeView === 'hall_of_ear' ? '#a855f7' : '#f8fafc',
              color: activeView === 'hall_of_ear' ? '#ffffff' : '#7e22ce',
              fontSize: '0.82rem',
              fontWeight: 850,
              cursor: 'pointer',
              boxShadow: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Trophy size={16} strokeWidth={2.4} />
            <span>Hall of Ear</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>

      {/* Ansicht: HALL OF EAR */}
      {activeView === 'hall_of_ear' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <EarLeaderboardWidget
            selectedDiscipline={activePillar as EarDiscipline}
            selectedLevel={vdmLevel}
            student={student}
            latestSession={latestRecordedSession}
            showHeader={false}
          />
          <button
            type="button"
            onClick={() => setActiveView('studio')}
            style={{
              padding: '12px 20px',
              borderRadius: '14px',
              border: 'none',
              background: '#a855f7',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 850,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: 'none'
            }}
          >
            <Headphones size={17} strokeWidth={2.4} />
            <span>Zurück zum Trainings-Studio</span>
          </button>
        </div>
      ) : (
        /* Ansicht: TRAINING STUDIO */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* 2. Säulen-Leiste (3 didaktische Säulen - 60px Großformat Apple Touch-Ergonomie) */}
          <div
            role="tablist"
            aria-label="Didaktische Gehör-Säulen"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              background: '#f8fafc',
              padding: '6px',
              borderRadius: '18px',
              border: '1.5px solid #e2e8f0'
            }}
          >
            <button
              id="tab-ear-intervals"
              role="tab"
              aria-selected={activePillar === 'intervals'}
              aria-controls="panel-ear-intervals"
              type="button"
              onClick={() => setActivePillar('intervals')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                minHeight: '60px',
                padding: '8px 6px',
                borderRadius: '14px',
                border: 'none',
                background: activePillar === 'intervals' ? '#a855f7' : 'transparent',
                color: activePillar === 'intervals' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                boxShadow: 'none',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                touchAction: 'manipulation',
                userSelect: 'none'
              }}
              className="hover-scale"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Music size={17} strokeWidth={activePillar === 'intervals' ? 2.6 : 2.2} />
                <span style={{ fontWeight: 950, fontSize: '0.96rem', letterSpacing: '-0.01em' }}>
                  Intervalle
                </span>
              </div>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 750,
                color: activePillar === 'intervals' ? 'rgba(255, 255, 255, 0.92)' : '#94a3b8',
                letterSpacing: '-0.01em'
              }}>
                {uiLevel === 'junior' ? 'Tonsprünge' : 'Melodie (D1–D3)'}
              </span>
            </button>

            <button
              id="tab-ear-chords"
              role="tab"
              aria-selected={activePillar === 'chords'}
              aria-controls="panel-ear-chords"
              type="button"
              onClick={() => setActivePillar('chords')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                minHeight: '60px',
                padding: '8px 6px',
                borderRadius: '14px',
                border: 'none',
                background: activePillar === 'chords' ? '#a855f7' : 'transparent',
                color: activePillar === 'chords' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                boxShadow: 'none',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                touchAction: 'manipulation',
                userSelect: 'none'
              }}
              className="hover-scale"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={17} strokeWidth={activePillar === 'chords' ? 2.6 : 2.2} />
                <span style={{ fontWeight: 950, fontSize: '0.96rem', letterSpacing: '-0.01em' }}>
                  Akkordfarben
                </span>
              </div>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 750,
                color: activePillar === 'chords' ? 'rgba(255, 255, 255, 0.92)' : '#94a3b8',
                letterSpacing: '-0.01em'
              }}>
                {uiLevel === 'junior' ? 'Klangfarben' : 'Harmonie (Dur/Moll)'}
              </span>
            </button>

            <button
              id="tab-ear-pitch-match"
              role="tab"
              aria-selected={activePillar === 'pitch_match'}
              aria-controls="panel-ear-pitch-match"
              type="button"
              onClick={() => setActivePillar('pitch_match')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                minHeight: '60px',
                padding: '8px 6px',
                borderRadius: '14px',
                border: 'none',
                background: activePillar === 'pitch_match' ? '#a855f7' : 'transparent',
                color: activePillar === 'pitch_match' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                boxShadow: 'none',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                touchAction: 'manipulation',
                userSelect: 'none'
              }}
              className="hover-scale"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mic size={17} strokeWidth={activePillar === 'pitch_match' ? 2.6 : 2.2} />
                <span style={{ fontWeight: 950, fontSize: '0.96rem', letterSpacing: '-0.01em' }}>
                  Sing-Back
                </span>
              </div>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 750,
                color: activePillar === 'pitch_match' ? 'rgba(255, 255, 255, 0.92)' : '#94a3b8',
                letterSpacing: '-0.01em'
              }}>
                {uiLevel === 'junior' ? 'Mitsingen' : 'Intonation (YIN)'}
              </span>
            </button>
          </div>

          {/* 3. Vereinigte Studio-Toolbar (0,1% Viewport-Kompaktheit & Großformat-Ergonomie) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            padding: '8px 12px',
            fontSize: '0.78rem'
          }}>
            {/* Linke Flanke: Level-Wahl & Instrumenten-Klangfarbe */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              {/* Musikschul-D-Stufen & Vorstufe (4 Level) */}
              <div style={{ display: 'flex', gap: '3px', background: '#ffffff', padding: '3px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                {(['junior', 'd1', 'd2', 'd3'] as VdmLevel[]).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setVdmLevel(lvl);
                      if (lvl === 'junior' || lvl === 'd1') setChordCategory('types');
                    }}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '7px',
                      border: 'none',
                      background: vdmLevel === lvl ? '#a855f7' : 'transparent',
                      color: vdmLevel === lvl ? '#ffffff' : '#64748b',
                      fontWeight: vdmLevel === lvl ? 900 : 700,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease'
                    }}
                    title={
                      uiLevel === 'junior'
                        ? (lvl === 'junior' ? 'Junior (Vorstufe / 5 Ur-Signale)' : lvl === 'd1' ? 'Stufe 1 (D1 Bronze)' : lvl === 'd2' ? 'Stufe 2 (D2 Silber)' : 'Stufe 3 (D3 Gold)')
                        : (lvl === 'junior' ? 'Vorstufe / Junior (5 Grundintervalle & Dur/Moll)' : lvl === 'd1' ? 'D1 Bronze (7 Intervalle)' : lvl === 'd2' ? 'D2 Silber (11 Intervalle & Umkehrungen)' : 'D3 Gold (Volles Tonspektrum & Septakkorde)')
                    }
                  >
                    {uiLevel === 'junior'
                      ? (lvl === 'junior' ? '🐣 Vorstufe' : lvl === 'd1' ? '🥉 Bronze' : lvl === 'd2' ? '🥈 Silber' : '🥇 Gold')
                      : (lvl === 'junior' ? 'Vorstufe' : lvl === 'd1' ? 'D1 Bronze' : lvl === 'd2' ? 'D2 Silber' : 'D3 Gold')}
                  </button>
                ))}
              </div>

              {/* Klangfarbe: 2-Wege-Wahl (Mein Instrument vs. Neutraler Flügel) */}
              <div 
                role="radiogroup" 
                aria-label="Klangfarbe für Gehörtraining"
                style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#ffffff', padding: '3px', borderRadius: '10px', border: '1px solid #e2e8f0' }}
              >
                {!isPercussion ? (
                  <>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={soundSelectionMode === 'instrument'}
                      tabIndex={0}
                      onClick={() => handleSoundSelectionModeChange('instrument')}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSoundSelectionModeChange('instrument');
                        }
                      }}
                      title={`Gehörtraining im vertrauten Klang deines Instruments (${userInstMeta.label})`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 11px',
                        borderRadius: '7px',
                        border: 'none',
                        background: soundSelectionMode === 'instrument' ? '#0f172a' : 'transparent',
                        color: soundSelectionMode === 'instrument' ? '#ffffff' : '#64748b',
                        fontSize: '0.75rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      <span aria-hidden="true">{userInstMeta.icon}</span>
                      <span>{userInstMeta.label}</span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={soundSelectionMode === 'piano'}
                      tabIndex={0}
                      onClick={() => handleSoundSelectionModeChange('piano')}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSoundSelectionModeChange('piano');
                        }
                      }}
                      title="Neutraler Konzertflügel für objektives tonales Gehörtraining"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 11px',
                        borderRadius: '7px',
                        border: 'none',
                        background: soundSelectionMode === 'piano' ? '#0f172a' : 'transparent',
                        color: soundSelectionMode === 'piano' ? '#ffffff' : '#64748b',
                        fontSize: '0.75rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      <span aria-hidden="true">🎹</span>
                      <span>Flügel</span>
                    </button>
                  </>
                ) : (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      borderRadius: '7px',
                      background: '#0f172a',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 750
                    }}
                    title="Schlagzeuge besitzen keine melodische Tonhöhe – neutraler Flügel ist als Referenz aktiv"
                  >
                    <span aria-hidden="true">🎹</span>
                    <span>Flügel (Neutral)</span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginLeft: '3px' }}>• 🥁 Schlagzeug</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rechte Flanke: Challenge-Fortschritt, Streak & Audiowerkzeuge */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.80rem' }}>
                <span style={{ fontWeight: 850, color: '#0f172a' }}>
                  Runde {challengeProgress.current}/{challengeProgress.total}
                </span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ color: '#059669', fontWeight: 800 }}>
                  {challengeProgress.correctCount} Richtig
                </span>
              </div>

              {streak > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706', fontWeight: 850, fontSize: '0.80rem' }}>
                  <Flame size={15} strokeWidth={2.4} />
                  <span>{streak}x</span>
                </div>
              )}

              {/* Tonika Bordun Drone */}
              <button
                type="button"
                onClick={() => setIsDroneEnabled(!isDroneEnabled)}
                title="Tonika-Bordun (C): Fördert das Hören nach Skalenstufen"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: isDroneEnabled ? '#0f172a' : '#ffffff',
                  color: isDroneEnabled ? '#ffffff' : '#475569',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
              >
                <Radio size={13} strokeWidth={2.4} />
                <span>Bordun {isDroneEnabled ? 'AN' : 'AUS'}</span>
              </button>

              {/* Kadenz */}
              <button
                type="button"
                onClick={handlePlayCadence}
                title="Harmonische I-IV-V-I Kadenz zur Verankerung des Grundtons abspielen"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
              >
                <Sparkles size={13} strokeWidth={2.2} />
                <span>Kadenz</span>
              </button>
            </div>
          </div>

          {/* 5. Kern-Bereich je nach Pillar */}
          {isCompletedCelebration ? (
            /* Celebration Screen */
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Trophy size={22} strokeWidth={2.4} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 950, color: '#0f172a' }}>
                Challenge Gemeistert!
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', maxWidth: '380px' }}>
                Du hast {challengeProgress.correctCount} von {challengeProgress.total} Aufgaben richtig gelöst.
                Dein Ergebnis wurde in der Hall of Ear verankert!
              </p>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: '8px 0'
              }}>
                <div style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 950, color: '#0f172a' }}>
                    {latestRecordedSession?.score || 0}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>PUNKTE</span>
                </div>
                <div style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 950, color: '#0f172a' }}>
                    {latestRecordedSession?.accuracy || 0}%
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>GENAUIGKEIT</span>
                </div>
                <div style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 950, color: '#0f172a' }}>
                    {latestRecordedSession?.streak || 0}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>MAX STREAK</span>
                </div>
              </div>

              {/* 🎖️ 0,1% Goldstandard: Digitales Leistungsabzeichen & Vitrinen-Integration */}
              {(latestRecordedSession?.accuracy ?? 0) >= 70 && (
                <div style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: 'none',
                  width: '100%',
                  maxWidth: '420px',
                  boxSizing: 'border-box'
                }}>
                  <VdmMedallionSvg level={vdmLevel} size={72} />
                  <div style={{ fontSize: '0.96rem', fontWeight: 950, color: '#0f172a', textAlign: 'center' }}>
                    {getVdmBadgeTitle(vdmLevel, uiLevel)}
                  </div>
                  <div style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: '#047857',
                    background: '#d1fae5',
                    border: 'none',
                    padding: '2px 10px',
                    borderRadius: '99px'
                  }}>
                    Prädikat: {getVdmPredicate(latestRecordedSession?.accuracy ?? 0)} ({latestRecordedSession?.accuracy}%)
                  </div>

                  {student?.id && (
                    <button
                      type="button"
                      disabled={isBadgeSaved}
                      onClick={() => {
                        saveVdmBadge(student.id, {
                          level: vdmLevel,
                          timestamp: Date.now(),
                          accuracy: latestRecordedSession?.accuracy || 0,
                          predicate: getVdmPredicate(latestRecordedSession?.accuracy || 0),
                          discipline: activePillar,
                          score: latestRecordedSession?.score || 0
                        });
                        setIsBadgeSaved(true);
                      }}
                      style={{
                        marginTop: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isBadgeSaved ? '#34a853' : '#f97316',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        cursor: isBadgeSaved ? 'default' : 'pointer',
                        boxShadow: 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isBadgeSaved ? (
                        <>
                          <Check size={15} strokeWidth={2.6} />
                          <span>In Meine Meisterwerke hinterlegt!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} strokeWidth={2.4} />
                          <span>In Meine Meisterwerke einfügen</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Didaktischer Session-Recap */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '8px 14px',
                fontSize: '0.74rem',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 650
              }}>
                <Sparkles size={13} color="#7c3aed" strokeWidth={2.4} />
                <span>
                  Disziplin: <strong style={{ color: '#0f172a' }}>{activePillar === 'intervals' ? 'Intervalle' : activePillar === 'chords' ? 'Akkordfarben' : 'Sing-Back'}</strong>
                  {' • '}Stufe: <strong style={{ color: '#0f172a' }}>{vdmLevel.toUpperCase()}</strong>
                  {' • '}{(latestRecordedSession?.accuracy ?? 0) >= 80 ? '🎯 Exzellentes Gehör!' : (latestRecordedSession?.accuracy ?? 0) >= 60 ? '👍 Schöner Fortschritt!' : '💪 Weiter so! Übung macht den Meister!'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCompletedCelebration(false);
                    setIsBadgeSaved(false);
                    setChallengeProgress({ current: 1, total: 10, correctCount: 0 });
                    setStreak(0);
                    if (activePillar === 'intervals') generateNewIntervalQuestion();
                    else if (activePillar === 'chords') generateNewChordQuestion();
                    else generateNewPitchQuestion();
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Erneut spielen
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('hall_of_ear')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Hall of Ear ansehen
                </button>
              </div>
            </div>
          ) : activePillar === 'intervals' ? (
            /* ========================================================
               SÄULE 1: INTERVALLE & MELODIEN
               ======================================================== */
            <div
              role="tabpanel"
              id="panel-ear-intervals"
              aria-labelledby="tab-ear-intervals"
              tabIndex={0}
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              {/* Play & Anchor Controls mit synchroner Tonstufen-Brücke */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {/* Obere Steuerzeile: Play Button, Titel & Modi */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button
                      type="button"
                      onClick={handlePlayCurrentInterval}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '18px',
                        border: 'none',
                        background: '#a855f7',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: 'none',
                        transform: !hasListenedToQuestion ? 'scale(1.05)' : 'scale(1)',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                      className={!hasListenedToQuestion ? 'animate-pulse hover-scale' : 'hover-scale'}
                      title="Intervall anhören (Leertaste)"
                    >
                      <Play size={26} fill="#ffffff" strokeWidth={0} />
                    </button>
                    <div>
                      <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', display: 'block', letterSpacing: '-0.01em' }}>
                        Intervall anhören
                      </span>
                      <span style={{
                        fontSize: '0.80rem',
                        color: !hasListenedToQuestion ? '#7e22ce' : '#64748b',
                        fontWeight: !hasListenedToQuestion ? 800 : 500,
                        transition: 'color 0.2s ease'
                      }}>
                        {!hasListenedToQuestion
                          ? '▶ Klicke zuerst hier, um die Frage anzuhören!'
                          : 'Klicke zum erneuten Abspielen • Höre die Ton-Distanz'}
                      </span>
                    </div>
                  </div>

                  {/* Abspielmodus: Aufsteigend, Absteigend, Harmonisch, Prüfungs-Mix */}
                  <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                    {(['ascending', 'descending', 'harmonic', 'vdm_mix'] as IntervalPlaySelectionMode[]).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setIntervalPlayMode(mode)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: intervalPlayMode === mode ? '#ffffff' : 'transparent',
                          color: intervalPlayMode === mode ? '#7e22ce' : '#64748b',
                          fontSize: '0.76rem',
                          fontWeight: intervalPlayMode === mode ? 900 : 700,
                          cursor: 'pointer',
                          boxShadow: intervalPlayMode === mode ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                        }}
                        title={mode === 'vdm_mix' ? 'Prüfungs-Mix: Zufälliger Wechsel zwischen Auf-, Abwärts und Harmonisch (wie in der Musikschulprüfung)' : undefined}
                      >
                        {mode === 'ascending' ? '▲ Auf' : mode === 'descending' ? '▼ Ab' : mode === 'harmonic' ? '◆ Zusammen' : '🎲 Mix'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 🌟 0,1% Goldstandard: Echte vertikale Tonstufen-Bühne (2-Phasen-Entkopplung: Hören & Sehen) */}
                {(() => {
                  const isSubmitted = isIntervalAnswerSubmitted && !!currentIntervalQuestion;
                  const semitones = currentIntervalQuestion?.interval.semitones || 0;
                  const effectiveMode = currentIntervalQuestion?.effectiveMode || (intervalPlayMode === 'vdm_mix' ? 'ascending' : intervalPlayMode);
                  const isDescending = effectiveMode === 'descending';
                  const isHarmonic = effectiveMode === 'harmonic';
                  
                  // 🏛️ 0,1% Goldstandard Pädagogische Immunität:
                  // VOR Abgabe der Antwort (Ratephase) ist der Offset zwingend 0px (vollkommen neutrale horizontale Ebene).
                  // ERST NACH Abgabe der Antwort (Synästhesie-Feedback) fährt Ton 2 reaktiv auf die reale Stufenhöhe (0..36px).
                  const stepOffset = isSubmitted
                    ? (semitones === 0 ? 0 : Math.min(36, Math.max(6, Math.round((semitones / 12) * 36))))
                    : 0;

                  // Y-Positionen der Verbindungslinie (Höhe des flexiblen Mittelbereichs = 64px, Neutralhöhe = 32px)
                  let lineY1 = 32;
                  let lineY2 = 32;
                  if (isSubmitted) {
                    if (isHarmonic) {
                      lineY1 = 44;
                      lineY2 = 44;
                    } else if (isDescending) {
                      lineY1 = 14;
                      lineY2 = 14 + stepOffset;
                    } else {
                      lineY1 = 48;
                      lineY2 = Math.max(12, 48 - stepOffset);
                    }
                  }

                  const badgeTop = (lineY1 + lineY2) / 2;

                  const isCorrect = isSubmitted && selectedIntervalAnswer === currentIntervalQuestion?.interval.id;
                  const chosenItem = isSubmitted && !isCorrect ? INTERVAL_CATALOG.find(i => i.id === selectedIntervalAnswer) : null;

                  // Berechne Ghost-Linie für die abweichende Schüler-Auswahl
                  let chosenLineY2 = lineY2;
                  let chosenOffsetDiff = 0;
                  if (chosenItem && isSubmitted) {
                    const chosenSemi = chosenItem.semitones;
                    const chosenStepOffset = chosenSemi === 0 ? 0 : Math.min(36, Math.max(6, Math.round((chosenSemi / 12) * 36)));
                    if (isHarmonic) {
                      chosenLineY2 = 44;
                    } else if (isDescending) {
                      chosenLineY2 = 14 + chosenStepOffset;
                    } else {
                      chosenLineY2 = Math.max(12, 48 - chosenStepOffset);
                    }
                    chosenOffsetDiff = semitones - chosenSemi; // positiv = gesucht war höher; negativ = gesucht war tiefer
                  }

                  return (
                    <div style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '18px',
                      padding: '16px 22px',
                      minHeight: '94px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* Ton 1: Grundton */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        zIndex: 2,
                        transform: isSubmitted && isDescending ? `translateY(-${stepOffset / 2}px)` : 'none',
                        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: playingToneStep === 1 ? '#a855f7' : '#f8fafc',
                          color: playingToneStep === 1 ? '#ffffff' : '#334155',
                          border: playingToneStep === 1 ? 'none' : '1.5px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.02rem',
                          fontWeight: 950,
                          boxShadow: 'none',
                          transform: playingToneStep === 1 ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}>
                          {isSubmitted && currentIntervalQuestion
                            ? midiToNoteName(currentIntervalQuestion.rootMidi)
                            : '1'}
                        </div>
                        <span style={{
                          fontSize: '0.84rem',
                          fontWeight: 800,
                          color: playingToneStep === 1 ? '#7e22ce' : '#475569',
                          transition: 'color 0.15s ease'
                        }}>
                          {isSubmitted && currentIntervalQuestion ? 'Grundton' : 'Ton 1'}
                        </span>
                      </div>

                      {/* Verbindungs-Achse & Distanz-Pill */}
                      <div style={{
                        flex: 1,
                        margin: '0 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        height: '64px'
                      }}>
                        {/* Diagonale Stufen-Vektorlinie */}
                        <svg width="100%" height="100%" style={{ overflow: 'visible', position: 'absolute', inset: 0 }}>
                          {/* Feste Referenzlinie auf Nulllinie (32px) */}
                          <line
                            x1="0"
                            y1="32"
                            x2="100%"
                            y2="32"
                            stroke="#f1f5f9"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                          />
                          {/* Schüler-Fehler Ghostlinie (A/B-Vergleich nur nach Abgabe) */}
                          {chosenItem && isSubmitted && (
                            <line
                              x1="0"
                              y1={lineY1}
                              x2="100%"
                              y2={chosenLineY2}
                              stroke="#ef4444"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeDasharray="4 4"
                              opacity="0.85"
                            />
                          )}
                          {/* Dynamische Stufenlinie zwischen den Tönen */}
                          <line
                            x1="0"
                            y1={lineY1}
                            x2="100%"
                            y2={lineY2}
                            stroke={isSubmitted ? '#10b981' : playingToneStep > 0 ? '#a855f7' : '#cbd5e1'}
                            strokeWidth={isSubmitted ? '3.5' : '3'}
                            strokeLinecap="round"
                            strokeDasharray={isSubmitted && semitones === 0 ? '4 4' : 'none'}
                            style={{ transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
                          />
                        </svg>

                        {/* Zentrierte Distanz-Pille auf der Stufe */}
                        <div style={{
                          position: 'absolute',
                          left: '50%',
                          top: `${badgeTop}px`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 2,
                          background: isSubmitted
                            ? (isCorrect ? '#10b981' : '#fee2e2')
                            : '#ffffff',
                          border: isSubmitted ? 'none' : '1.5px solid #e2e8f0',
                          color: isSubmitted
                            ? (isCorrect ? '#ffffff' : '#b91c1c')
                            : playingToneStep > 0
                            ? '#7e22ce'
                            : '#475569',
                          padding: '5px 14px',
                          borderRadius: '99px',
                          fontSize: '0.82rem',
                          fontWeight: 850,
                          boxShadow: 'none',
                          transition: 'all 0.25s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          whiteSpace: 'nowrap'
                        }}>
                          {isSubmitted && currentIntervalQuestion ? (
                            isCorrect ? (
                              <>
                                <CheckCircle2 size={15} strokeWidth={2.4} />
                                <span>{currentIntervalQuestion.interval.name}</span>
                                <span>•</span>
                                <span>{currentIntervalQuestion.interval.semitones} HT</span>
                              </>
                            ) : (
                              <>
                                <XCircle size={15} strokeWidth={2.4} />
                                <span>Gesucht: {currentIntervalQuestion.interval.name} ({currentIntervalQuestion.interval.semitones} HT)</span>
                                {chosenItem && (
                                  <>
                                    <span>•</span>
                                    <span style={{ color: '#b91c1c' }}>
                                      Deine Wahl: {chosenItem.name} ({chosenItem.semitones} HT)
                                      {chosenOffsetDiff !== 0 && ` (${chosenOffsetDiff > 0 ? `▲ +${chosenOffsetDiff} HT höher` : `▼ ${chosenOffsetDiff} HT tiefer`})`}
                                    </span>
                                  </>
                                )}
                              </>
                            )
                          ) : playingToneStep === 1 ? (
                            <>
                              <Volume2 size={14} strokeWidth={2.4} />
                              <span>Ton 1 (Startton)</span>
                            </>
                          ) : playingToneStep === 2 ? (
                            <>
                              <Volume2 size={14} strokeWidth={2.4} />
                              <span>Ton 2 (Zielton)</span>
                            </>
                          ) : (
                            <span>Höre die Schrittweite</span>
                          )}
                        </div>
                      </div>

                      {/* Ton 2: Zielton auf erhöhter / gesenkter Stufe */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        zIndex: 2,
                        transform: !isSubmitted || isHarmonic
                          ? 'none'
                          : isDescending
                          ? `translateY(${stepOffset / 2}px)`
                          : `translateY(-${stepOffset / 2}px)`,
                        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}>
                        <span style={{
                          fontSize: '0.84rem',
                          fontWeight: 800,
                          color: playingToneStep === 2 ? '#7e22ce' : '#475569',
                          transition: 'color 0.15s ease'
                        }}>
                          {isSubmitted && currentIntervalQuestion ? 'Zielton' : 'Ton 2'}
                        </span>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: playingToneStep === 2 ? '#a855f7' : '#f8fafc',
                          color: playingToneStep === 2 ? '#ffffff' : '#334155',
                          border: playingToneStep === 2 ? 'none' : '1.5px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.02rem',
                          fontWeight: 950,
                          boxShadow: 'none',
                          transform: playingToneStep === 2 ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}>
                          {isSubmitted && currentIntervalQuestion
                            ? midiToNoteName(currentIntervalQuestion.rootMidi + currentIntervalQuestion.interval.semitones)
                            : '2'}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Intervall-Auswahlkacheln (0,1% Goldstandard: Taktile Bild-First Kacheln im balancierten Großformat Responsive-Grid) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: availableIntervals.length <= 5
                  ? 'repeat(auto-fit, minmax(145px, 1fr))'
                  : 'repeat(auto-fit, minmax(155px, 1fr))',
                gap: '12px',
                width: '100%',
                justifyContent: 'center'
              }}>
                {availableIntervals.map(item => {
                  const isSubmitted = isIntervalAnswerSubmitted;
                  const isChosen = selectedIntervalAnswer === item.id;
                  const isCorrect = currentIntervalQuestion?.interval.id === item.id;

                  let bg = '#ffffff';
                  let border = '1.5px solid #e2e8f0';
                  let text = '#0f172a';
                  let badgeBg = '#f3e8ff';
                  let badgeColor = '#7e22ce';
                  let subColor = '#64748b';

                  if (isSubmitted) {
                    if (isCorrect) {
                      bg = '#d1fae5';
                      border = 'none';
                      text = '#047857';
                      badgeBg = '#10b981';
                      badgeColor = '#ffffff';
                      subColor = '#047857';
                    } else if (isChosen && !isCorrect) {
                      bg = '#fee2e2';
                      border = 'none';
                      text = '#b91c1c';
                      badgeBg = '#ef4444';
                      badgeColor = '#ffffff';
                      subColor = '#b91c1c';
                    } else {
                      bg = '#f8fafc';
                      border = '1.5px solid #e2e8f0';
                      text = '#94a3b8';
                      badgeBg = '#f1f5f9';
                      badgeColor = '#94a3b8';
                      subColor = '#cbd5e1';
                    }
                  }

                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={isSubmitted || !hasListenedToQuestion ? -1 : 0}
                      aria-disabled={isSubmitted || !hasListenedToQuestion}
                      onClick={() => {
                        if (!isSubmitted && hasListenedToQuestion) {
                          handleSelectIntervalAnswer(item.id);
                        }
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !isSubmitted && hasListenedToQuestion) {
                          e.preventDefault();
                          handleSelectIntervalAnswer(item.id);
                        }
                      }}
                      style={{
                        position: 'relative',
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '14px 12px',
                        minHeight: '104px',
                        borderRadius: '18px',
                        border,
                        background: bg,
                        color: text,
                        cursor: isSubmitted ? 'default' : !hasListenedToQuestion ? 'not-allowed' : 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: 'none',
                        overflow: 'hidden',
                        opacity: !hasListenedToQuestion && !isSubmitted ? 0.68 : 1,
                        userSelect: 'none',
                        touchAction: 'manipulation'
                      }}
                      className={!isSubmitted && hasListenedToQuestion ? 'hover-scale' : ''}
                      title={
                        !hasListenedToQuestion
                          ? '▶ Höre dir zuerst das gesuchte Intervall an (Klick auf den lilafarbenen Play-Button oben)!'
                          : `${item.name} (${item.semitones} Halbtöne)`
                      }
                    >
                      {/* Didaktisches Vorhören: Ergonomischer 🔊 Button oben rechts (Apple HIG Touch-Target) */}
                      <button
                        type="button"
                        tabIndex={0}
                        onClick={(e) => handlePreviewInterval(e, item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          width: '32px',
                          height: '32px',
                          minWidth: '32px',
                          minHeight: '32px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: isCorrect && isSubmitted ? '#047857' : isChosen && !isCorrect && isSubmitted ? '#b91c1c' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: 'none',
                          touchAction: 'manipulation',
                          zIndex: 3
                        }}
                        className="hover-scale"
                        title={`Diesen Tonsprung vorhören: ${item.name} (${item.semitones} Halbtöne)`}
                        aria-label={`Diesen Tonsprung vorhören: ${item.name}`}
                      >
                        <Volume2 size={15} strokeWidth={2.4} />
                      </button>

                      {/* 1. Bild-First: Prominente Vektor-Geste im Zentrum */}
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px 10px',
                        borderRadius: '10px',
                        background: badgeBg,
                        color: badgeColor,
                        transition: 'all 0.15s ease'
                      }}>
                        {uiLevel === 'junior' ? (
                          renderIntervalGesture(
                            item.id,
                            item.semitones,
                            badgeColor,
                            isSubmitted
                              ? (currentIntervalQuestion?.effectiveMode || 'ascending')
                              : (intervalPlayMode === 'vdm_mix' ? 'ascending' : intervalPlayMode)
                          )
                        ) : (
                          <span style={{ fontSize: '0.82rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
                            {uiLevel === 'pro' ? item.proShort : item.shortName}
                          </span>
                        )}
                      </div>

                      {/* 2. Junior-Name: Groß, fett und sprechend */}
                      <span style={{
                        fontWeight: 950,
                        fontSize: '1.08rem',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.15,
                        color: text,
                        whiteSpace: 'nowrap'
                      }}>
                        {uiLevel === 'junior' ? item.juniorName : item.name}
                      </span>

                      {/* 3. Didaktische Musiktheorie & Interaktive Song-Anker Melodie (Doppelte Audio-Brücke) */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handlePlaySongAnchorMelody(e, item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            handlePlaySongAnchorMelody(e as any, item);
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: '#f3e8ff',
                          color: '#7e22ce',
                          fontSize: '0.76rem',
                          fontWeight: 750,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          zIndex: 3
                        }}
                        className="hover-scale"
                        title={`Melodie anspielen: ${item.songAnchor}`}
                        aria-label={`Melodie anspielen für ${item.name}: ${item.songAnchor}`}
                      >
                        <Music size={13} strokeWidth={2.4} color="#7e22ce" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {uiLevel === 'junior'
                            ? item.name
                            : uiLevel === 'pro'
                            ? item.proClassification
                            : item.songAnchorShort}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Didaktische Feedback-Kassette & A/B-Hörvergleich */}
              {isIntervalAnswerSubmitted && currentIntervalQuestion && (
                <div style={{
                  background: selectedIntervalAnswer === currentIntervalQuestion.interval.id ? '#d1fae5' : '#fee2e2',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {selectedIntervalAnswer === currentIntervalQuestion.interval.id ? (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#10b981',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Check size={18} strokeWidth={3} />
                        </div>
                      ) : (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <X size={18} strokeWidth={3} />
                        </div>
                      )}
                      <div>
                        <span style={{
                          fontSize: '0.88rem',
                          fontWeight: 900,
                          color: selectedIntervalAnswer === currentIntervalQuestion.interval.id ? '#047857' : '#b91c1c',
                          display: 'block'
                        }}>
                          {selectedIntervalAnswer === currentIntervalQuestion.interval.id
                            ? uiLevel === 'junior'
                              ? `Super gehört! Richtig: ${currentIntervalQuestion.interval.juniorName}`
                              : `Perfekt! Das war eine ${currentIntervalQuestion.interval.name} (${currentIntervalQuestion.interval.semitones} Halbtöne)`
                            : uiLevel === 'junior'
                              ? `Fast! Richtig war: ${currentIntervalQuestion.interval.juniorName} (${currentIntervalQuestion.interval.name})`
                              : `Fast! Es war eine ${currentIntervalQuestion.interval.name} (${currentIntervalQuestion.interval.semitones} Halbtöne)`}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 650 }}>
                          {uiLevel === 'junior'
                            ? `Tipp: ${currentIntervalQuestion.interval.songAnchor}`
                            : `Song-Anker: ${currentIntervalQuestion.interval.songAnchor}`}
                        </span>
                      </div>
                    </div>

                    {/* Nächste Frage Button */}
                    <button
                      type="button"
                      onClick={handleManualAdvanceInterval}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#a855f7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '9px 18px',
                        fontSize: '0.80rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: 'none'
                      }}
                      className="hover-scale"
                    >
                      <span>Nächste Frage</span>
                      <ArrowRight size={15} strokeWidth={2.6} />
                    </button>
                  </div>

                  {/* A/B Hörvergleich Kontrast-Leiste */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 850, color: '#475569' }}>
                      A/B Hörvergleich:
                    </span>

                    {/* Taste 1: Gehörtes Intervall */}
                    <button
                      type="button"
                      onClick={handlePlayHeardInterval}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#ffffff',
                        border: '1.5px solid #e2e8f0',
                        color: '#047857',
                        borderRadius: '8px',
                        padding: '5px 11px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                      className="hover-scale"
                      title="Gehörtes Intervall erneut abspielen"
                    >
                      <Volume2 size={13} strokeWidth={2.5} />
                      <span>▶ Gehört ({uiLevel === 'junior' ? currentIntervalQuestion.interval.juniorName : currentIntervalQuestion.interval.name})</span>
                    </button>

                    {/* Taste 2: Deine Wahl (falls abweichend) */}
                    {lastChosenInterval && lastChosenInterval.id !== currentIntervalQuestion.interval.id && (
                      <button
                        type="button"
                        onClick={handlePlayChosenInterval}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          color: '#b91c1c',
                          borderRadius: '8px',
                          padding: '5px 11px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                        className="hover-scale"
                        title="Deine gewählte Antwort zum Vergleich anhören"
                      >
                        <Volume2 size={13} strokeWidth={2.5} />
                        <span>▶ Deine Wahl ({uiLevel === 'junior' ? lastChosenInterval.juniorName : lastChosenInterval.name})</span>
                      </button>
                    )}

                    {/* Taste 3: Gesuchte Song-Anker Melodie mit Spotlighting */}
                    <button
                      type="button"
                      onClick={() => {
                        earSynth.playSongAnchor(
                          currentIntervalQuestion.rootMidi,
                          currentIntervalQuestion.interval.anchorNotes,
                          0.35,
                          soundTimbre
                        );
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#f3e8ff',
                        border: 'none',
                        color: '#7e22ce',
                        borderRadius: '8px',
                        padding: '5px 11px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                      className="hover-scale"
                      title="Vergleichsmelodie des gesuchten Intervalls mit hervorgehobenem Tonsprung anhören"
                    >
                      <Sparkles size={13} strokeWidth={2.4} />
                      <span>♫ Merkmelodie ({currentIntervalQuestion.interval.songAnchorShort})</span>
                    </button>

                    {/* Taste 4: Merkmelodie der gewählten Antwort (falls falsch) */}
                    {lastChosenInterval && lastChosenInterval.id !== currentIntervalQuestion.interval.id && (
                      <button
                        type="button"
                        onClick={() => {
                          earSynth.playSongAnchor(
                            currentIntervalQuestion.rootMidi,
                            lastChosenInterval.anchorNotes,
                            0.35,
                            soundTimbre
                          );
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#ffffff',
                          border: 'none',
                          color: '#b91c1c',
                          borderRadius: '8px',
                          padding: '5px 11px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                        className="hover-scale"
                        title={`Merkmelodie deiner Wahl anspielen: ${lastChosenInterval.songAnchor}`}
                      >
                        <Music size={13} strokeWidth={2.4} />
                        <span>♫ Melodie deiner Wahl ({lastChosenInterval.songAnchorShort})</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : activePillar === 'chords' ? (
            /* ========================================================
               SÄULE 2: AKKORDFARBEN & KADENZEN
               ======================================================== */
            <div
              role="tabpanel"
              id="panel-ear-chords"
              aria-labelledby="tab-ear-chords"
              tabIndex={0}
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <button
                    type="button"
                    onClick={handlePlayCurrentChord}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '18px',
                      border: 'none',
                      background: '#a855f7',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: 'none',
                      transform: !hasListenedToChordQuestion ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    className={!hasListenedToChordQuestion ? 'animate-pulse hover-scale' : 'hover-scale'}
                    title="Akkord anhören (Leertaste)"
                  >
                    <Play size={26} fill="#ffffff" strokeWidth={0} />
                  </button>
                  <div>
                    <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', display: 'block', letterSpacing: '-0.01em' }}>
                      Akkord anhören
                    </span>
                    <span style={{
                      fontSize: '0.80rem',
                      color: !hasListenedToChordQuestion ? '#7e22ce' : '#64748b',
                      fontWeight: !hasListenedToChordQuestion ? 800 : 500,
                      transition: 'color 0.2s ease'
                    }}>
                      {!hasListenedToChordQuestion
                        ? '▶ Klicke zuerst hier, um den Akkord anzuhören!'
                        : 'Klicke zum erneuten Abspielen • Höre die Klangfarbe'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                  {(['block', 'arpeggio_up', 'arpeggio_down'] as ChordPlaybackMode[]).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setChordPlayMode(mode)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: chordPlayMode === mode ? '#ffffff' : 'transparent',
                        color: chordPlayMode === mode ? '#7e22ce' : '#64748b',
                        fontSize: '0.76rem',
                        fontWeight: chordPlayMode === mode ? 900 : 700,
                        cursor: 'pointer',
                        boxShadow: chordPlayMode === mode ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      {mode === 'block' ? '◆ Block' : mode === 'arpeggio_up' ? '▲ Arpeggio' : '▼ Arp Ab'}
                    </button>
                  ))}
                </div>
              </div>

              {/* D2 & D3 Musikschul-Spezial: Sub-Switcher zwischen Akkord-Typen und Umkehrungen */}
              {(vdmLevel === 'd2' || vdmLevel === 'd3') && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '6px 8px'
                }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', paddingLeft: '4px' }}>
                    Kategorie:
                  </span>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <button
                      type="button"
                      onClick={() => setChordCategory('types')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: chordCategory === 'types' ? '#ffffff' : 'transparent',
                        color: chordCategory === 'types' ? '#7e22ce' : '#64748b',
                        fontSize: '0.76rem',
                        fontWeight: chordCategory === 'types' ? 900 : 700,
                        cursor: 'pointer',
                        boxShadow: chordCategory === 'types' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      Akkord-Typen
                    </button>
                    <button
                      type="button"
                      onClick={() => setChordCategory('inversions')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: chordCategory === 'inversions' ? '#ffffff' : 'transparent',
                        color: chordCategory === 'inversions' ? '#7e22ce' : '#64748b',
                        fontSize: '0.76rem',
                        fontWeight: chordCategory === 'inversions' ? 900 : 700,
                        cursor: 'pointer',
                        boxShadow: chordCategory === 'inversions' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      Umkehrungen (Sext / Quartsext)
                    </button>
                  </div>
                </div>
              )}

              {/* Akkord-Auswahlkacheln (0,1% Goldstandard 3-Ebenen & Großformat-Touch-Zonen) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
                gap: '10px'
              }}>
                {(((vdmLevel === 'd2' || vdmLevel === 'd3') && (currentChordQuestion?.isInversion || chordCategory === 'inversions'))
                  ? CHORD_INVERSIONS
                  : availableChords
                ).map(item => {
                  const isSubmitted = isChordAnswerSubmitted;
                  const isChosen = selectedChordAnswer === item.id;
                  const isCorrect = currentChordQuestion?.chord.id === item.id;

                  let bg = '#ffffff';
                  let border = '1.5px solid #e2e8f0';
                  let text = '#0f172a';
                  let badgeBg = '#f3e8ff';
                  let badgeColor = '#7e22ce';
                  let subColor = '#64748b';

                  if (isSubmitted) {
                    if (isCorrect) {
                      bg = '#d1fae5';
                      border = 'none';
                      text = '#047857';
                      badgeBg = '#10b981';
                      badgeColor = '#ffffff';
                      subColor = '#047857';
                    } else if (isChosen && !isCorrect) {
                      bg = '#fee2e2';
                      border = 'none';
                      text = '#b91c1c';
                      badgeBg = '#ef4444';
                      badgeColor = '#ffffff';
                      subColor = '#b91c1c';
                    } else {
                      bg = '#f8fafc';
                      border = '1.5px solid #e2e8f0';
                      text = '#94a3b8';
                      badgeBg = '#f1f5f9';
                      badgeColor = '#94a3b8';
                      subColor = '#cbd5e1';
                    }
                  }

                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={isSubmitted || !hasListenedToChordQuestion ? -1 : 0}
                      aria-disabled={isSubmitted || !hasListenedToChordQuestion}
                      onClick={() => {
                        if (!isSubmitted && hasListenedToChordQuestion) {
                          handleSelectChordAnswer(item.id);
                        }
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !isSubmitted && hasListenedToChordQuestion) {
                          e.preventDefault();
                          handleSelectChordAnswer(item.id);
                        }
                      }}
                      style={{
                        position: 'relative',
                        padding: '12px 14px',
                        paddingRight: '40px',
                        minHeight: '74px',
                        borderRadius: '16px',
                        border,
                        background: bg,
                        color: text,
                        cursor: isSubmitted ? 'default' : !hasListenedToChordQuestion ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: 'none',
                        overflow: 'hidden',
                        opacity: !hasListenedToChordQuestion && !isSubmitted ? 0.68 : 1,
                        userSelect: 'none',
                        touchAction: 'manipulation'
                      }}
                      className={!isSubmitted && hasListenedToChordQuestion ? 'hover-scale' : ''}
                      title={
                        !hasListenedToChordQuestion
                          ? '▶ Höre dir zuerst den gesuchten Klang an!'
                          : `${item.name}: ${item.description}`
                      }
                    >
                      {/* Didaktisches Kachel-Vorhören (Apple HIG Touch-Target) */}
                      <button
                        type="button"
                        tabIndex={0}
                        onClick={(e) => handlePreviewChord(e, item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          width: '32px',
                          height: '32px',
                          minWidth: '32px',
                          minHeight: '32px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: isCorrect && isSubmitted ? '#047857' : isChosen && !isCorrect && isSubmitted ? '#b91c1c' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: 'none',
                          touchAction: 'manipulation',
                          zIndex: 3
                        }}
                        className="hover-scale"
                        title={`Diesen Klang vorhören: ${item.name}`}
                        aria-label={`Diesen Klang vorhören: ${item.name}`}
                      >
                        <Volume2 size={15} strokeWidth={2.4} />
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '4px' }}>
                        <span style={{
                          fontWeight: 900,
                          fontSize: 'clamp(0.88rem, 1.2vw, 1.02rem)',
                          letterSpacing: '-0.01em',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 'calc(100% - 40px)'
                        }}>
                          {uiLevel === 'junior' ? item.juniorName : item.name}
                        </span>
                        <span style={{
                          fontSize: uiLevel === 'junior' ? '0.72rem' : '0.78rem',
                          fontWeight: 850,
                          padding: '3px 8px',
                          borderRadius: '7px',
                          background: badgeBg,
                          color: badgeColor,
                          flexShrink: 0,
                          whiteSpace: 'nowrap'
                        }}>
                          {uiLevel === 'junior'
                            ? String(item.visualSymbol)
                            : uiLevel === 'pro'
                            ? String(('proShort' in item) ? item.proShort : item.shortName)
                            : String(item.shortName)}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.76rem',
                        color: subColor,
                        fontWeight: 650,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {uiLevel === 'junior'
                          ? item.name
                          : item.description}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Didaktische Feedback-Kassette & A/B-Hörvergleich für Akkorde */}
              {isChordAnswerSubmitted && currentChordQuestion && (
                <div style={{
                  background: selectedChordAnswer === currentChordQuestion.chord.id ? '#d1fae5' : '#fee2e2',
                  border: 'none',
                  borderRadius: '18px',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {selectedChordAnswer === currentChordQuestion.chord.id ? (
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: '#10b981',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Check size={20} strokeWidth={3} />
                        </div>
                      ) : (
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <X size={20} strokeWidth={3} />
                        </div>
                      )}
                      <div>
                        <span style={{
                          fontSize: '0.98rem',
                          fontWeight: 900,
                          color: selectedChordAnswer === currentChordQuestion.chord.id ? '#047857' : '#b91c1c',
                          display: 'block'
                        }}>
                          {selectedChordAnswer === currentChordQuestion.chord.id
                            ? uiLevel === 'junior'
                              ? `Super gehört! Richtig: ${currentChordQuestion.chord.juniorName} (${currentChordQuestion.chord.name})`
                              : `Perfekt! Das war: ${currentChordQuestion.chord.name}`
                            : uiLevel === 'junior'
                              ? `Fast! Richtig war: ${currentChordQuestion.chord.juniorName} (${currentChordQuestion.chord.name})`
                              : `Fast! Es war: ${currentChordQuestion.chord.name}`}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 650 }}>
                          {currentChordQuestion.isInversion
                            ? `Aufbau: ${currentChordQuestion.chord.proClassification} • ${currentChordQuestion.chord.description}`
                            : `Klangfarbe: ${currentChordQuestion.chord.description}`}
                        </span>
                      </div>
                    </div>

                    {/* Nächste Frage Button */}
                    <button
                      type="button"
                      onClick={handleManualAdvanceChord}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#a855f7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '14px',
                        padding: '11px 22px',
                        fontSize: '0.86rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: 'none'
                      }}
                      className="hover-scale"
                    >
                      <span>Nächste Frage</span>
                      <ArrowRight size={17} strokeWidth={2.6} />
                    </button>
                  </div>

                  {/* A/B Hörvergleich Kontrast-Leiste */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 850, color: '#475569' }}>
                      A/B Hörvergleich:
                    </span>

                    {/* Taste 1: Gehörter Akkord */}
                    <button
                      type="button"
                      onClick={handlePlayHeardChord}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#ffffff',
                        border: '1.5px solid #e2e8f0',
                        color: '#047857',
                        borderRadius: '10px',
                        padding: '6px 13px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                      className="hover-scale"
                      title="Gehörten Akkord erneut abspielen"
                    >
                      <Volume2 size={15} strokeWidth={2.5} />
                      <span>▶ Gehört ({uiLevel === 'junior' ? currentChordQuestion.chord.juniorName : currentChordQuestion.chord.name})</span>
                    </button>

                    {/* Taste 2: Deine Wahl (falls abweichend) */}
                    {lastChosenChord && lastChosenChord.id !== currentChordQuestion.chord.id && (
                      <button
                        type="button"
                        onClick={handlePlayChosenChord}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          color: '#b91c1c',
                          borderRadius: '10px',
                          padding: '6px 13px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                        className="hover-scale"
                        title="Deine gewählte Antwort zum Vergleich anhören"
                      >
                        <Volume2 size={15} strokeWidth={2.5} />
                        <span>▶ Deine Wahl ({uiLevel === 'junior' ? lastChosenChord.juniorName : lastChosenChord.name})</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================
               SÄULE 3: SING-BACK & PITCH-MATCH (YIN)
               ======================================================== */
            <EarLabSingBackStage
              currentPitchQuestion={currentPitchQuestion}
              vdmLevel={vdmLevel}
              uiLevel={uiLevel}
              soundTimbre={soundTimbre}
              onPitchMatched={() => advanceToNextStep(true)}
              onSkipPitchQuestion={generateNewPitchQuestion}
            />
          )}
        </div>
      )}
    </div>
  );
};
