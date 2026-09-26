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
  ChordPlaybackMode 
} from '../../services/audio/EarSynthEngine';
import { 
  RealtimePitchStream, 
  YinPitchResult, 
  evaluatePitchMatch, 
  midiToNoteName, 
  midiToFreq 
} from '../../services/audio/YinPitchDetectionEngine';
import { EarLeaderboardWidget, EarDiscipline, EarVdmLevel } from './EarLeaderboardWidget';
import { supabase } from '../../lib/supabase';

export type TrainingPillar = 'intervals' | 'chords' | 'pitch_match';
export type VdmLevel = 'd1' | 'd2' | 'd3';

export interface EarLabStudioModalProps {
  student?: any;
  onClose?: () => void;
  onRewardXp?: (xp: number, reason: string) => void;
  onSessionComplete?: (summary: { vdmLevel: VdmLevel; pillar: TrainingPillar; accuracy: number; xp: number }) => void;
  uiLevel?: 'junior' | 'teen' | 'pro';
  embedded?: boolean;
  useNotebookLayout?: boolean;
}

interface IntervalItem {
  id: string;
  semitones: number;
  name: string;
  shortName: string;
  juniorName: string;
  visualDots: string;
  songAnchorShort: string;
  proShort: string;
  proClassification: string;
  vdmLevel: VdmLevel;
  songAnchor: string;
  anchorNotes: number[]; // Halbtöne relativ zum Grundton
}

interface ChordItem {
  id: string;
  name: string;
  shortName: string;
  intervals: number[];
  vdmLevel: VdmLevel;
  description: string;
  juniorName: string;
  visualSymbol: string;
  songAnchorShort: string;
  proShort: string;
  proClassification: string;
}

// 🎼 Didaktisch modernisierte Song-Anker & didaktische Intervalle (D1–D3)
const INTERVAL_CATALOG: IntervalItem[] = [
  {
    id: 'p1',
    semitones: 0,
    name: 'Reine Prime',
    shortName: '1',
    juniorName: 'Zwilling',
    visualDots: '● = ●',
    songAnchorShort: 'Gleicher Ton • 0 HT',
    proShort: 'P1',
    proClassification: 'Einklang • 0 HT',
    vdmLevel: 'd1',
    songAnchor: 'Ton-Wiederholung (Gleicher Ton)',
    anchorNotes: [0, 0, 0]
  },
  {
    id: 'm2',
    semitones: 1,
    name: 'Kleine Sekunde',
    shortName: 'k2',
    juniorName: 'Schleichen',
    visualDots: '● ↗ ●',
    songAnchorShort: 'Der weiße Hai • 1 HT',
    proShort: 'm2',
    proClassification: 'Halbtonschritt • 1 HT',
    vdmLevel: 'd2',
    songAnchor: 'Der weiße Hai / Billie Eilish – Bad Guy',
    anchorNotes: [0, 1, 0, 1]
  },
  {
    id: 'M2',
    semitones: 2,
    name: 'Große Sekunde',
    shortName: 'g2',
    juniorName: 'Schritt',
    visualDots: '● ↗ ●',
    songAnchorShort: 'Happy Birthday • 2 HT',
    proShort: 'M2',
    proClassification: 'Ganztonschritt • 2 HT',
    vdmLevel: 'd1',
    songAnchor: 'Happy Birthday / Alle meine Entchen',
    anchorNotes: [0, 2, 4, 5, 7, 7]
  },
  {
    id: 'm3',
    semitones: 3,
    name: 'Kleine Terz',
    shortName: 'k3',
    juniorName: 'Kuckuck',
    visualDots: '● ↘ ●',
    songAnchorShort: 'Smoke on the Water • 3 HT',
    proShort: 'm3',
    proClassification: 'Moll-Terz • 3 HT',
    vdmLevel: 'd1',
    songAnchor: 'Smoke on the Water / Axel F',
    anchorNotes: [3, 0]
  },
  {
    id: 'M3',
    semitones: 4,
    name: 'Große Terz',
    shortName: 'g3',
    juniorName: 'Sonne',
    visualDots: '● ↗ ⬤',
    songAnchorShort: 'Oh When the Saints • 4 HT',
    proShort: 'M3',
    proClassification: 'Dur-Terz • 4 HT',
    vdmLevel: 'd1',
    songAnchor: 'Oh When the Saints / Kumbaya',
    anchorNotes: [0, 4, 7]
  },
  {
    id: 'p4',
    semitones: 5,
    name: 'Reine Quarte',
    shortName: '4',
    juniorName: 'Tatü-Tata',
    visualDots: '● ↗ ⬤',
    songAnchorShort: 'Feuerwehr (Tatü) • 5 HT',
    proShort: 'P4',
    proClassification: 'Subdominante • 5 HT',
    vdmLevel: 'd1',
    songAnchor: 'Feuerwehr (Tatü-Tata) / Harry Potter / Amazing Grace',
    anchorNotes: [0, 5, 0, 5]
  },
  {
    id: 'tritone',
    semitones: 6,
    name: 'Tritonus',
    shortName: 'TT',
    juniorName: 'Geisterton',
    visualDots: '● ⤢ ⬤',
    songAnchorShort: 'The Simpsons • 6 HT',
    proShort: 'TT',
    proClassification: 'ü4 / v5 • 6 HT',
    vdmLevel: 'd3',
    songAnchor: 'The Simpsons / Maria (West Side Story)',
    anchorNotes: [0, 6, 7]
  },
  {
    id: 'p5',
    semitones: 7,
    name: 'Reine Quinte',
    shortName: '5',
    juniorName: 'Helden-Ruf',
    visualDots: '● ⤢ ⬤',
    songAnchorShort: 'Star Wars • 7 HT',
    proShort: 'P5',
    proClassification: 'Dominante • 7 HT',
    vdmLevel: 'd1',
    songAnchor: 'Star Wars Theme / Twinkle Twinkle',
    anchorNotes: [0, 7, 5, 4, 2, 12]
  },
  {
    id: 'm6',
    semitones: 8,
    name: 'Kleine Sexte',
    shortName: 'k6',
    juniorName: 'Elise-Sprung',
    visualDots: '● ⤢ ⬤',
    songAnchorShort: 'Für Elise • 8 HT',
    proShort: 'm6',
    proClassification: 'kl. Sexte • 8 HT',
    vdmLevel: 'd2',
    songAnchor: 'Für Elise (Auftakt) / The Entertainer',
    anchorNotes: [8, 7, 8, 7, 8]
  },
  {
    id: 'M6',
    semitones: 9,
    name: 'Große Sexte',
    shortName: 'g6',
    juniorName: 'Ozean-Ruf',
    visualDots: '● ⤢ ⬤',
    songAnchorShort: 'My Bonnie • 9 HT',
    proShort: 'M6',
    proClassification: 'gr. Sexte • 9 HT',
    vdmLevel: 'd2',
    songAnchor: 'My Bonnie Lies Over the Ocean / NBC Glockenspiel',
    anchorNotes: [0, 9, 7]
  },
  {
    id: 'm7',
    semitones: 10,
    name: 'Kleine Septime',
    shortName: 'k7',
    juniorName: 'Blues-Sprung',
    visualDots: '● ⤢ ⬤',
    songAnchorShort: 'The Winner Takes It All • 10 HT',
    proShort: 'm7',
    proClassification: 'kl. Septime • 10 HT',
    vdmLevel: 'd2',
    songAnchor: 'The Winner Takes It All / Star Trek Theme',
    anchorNotes: [0, 10, 8]
  },
  {
    id: 'M7',
    semitones: 11,
    name: 'Große Septime',
    shortName: 'g7',
    juniorName: 'Weitsprung',
    visualDots: '● ⤢ ⬤',
    songAnchorShort: 'Take On Me • 11 HT',
    proShort: 'M7',
    proClassification: 'gr. Septime • 11 HT',
    vdmLevel: 'd2',
    songAnchor: 'Take On Me (A-ha) / Superman Theme',
    anchorNotes: [0, 11]
  },
  {
    id: 'p8',
    semitones: 12,
    name: 'Reine Oktave',
    shortName: '8',
    juniorName: 'Riesensprung',
    visualDots: '● ⤢ ⬤',
    songAnchorShort: 'Over the Rainbow • 12 HT',
    proShort: 'P8',
    proClassification: 'Volle Oktave • 12 HT',
    vdmLevel: 'd1',
    songAnchor: 'Somewhere Over the Rainbow / Singin\' in the Rain',
    anchorNotes: [0, 12, 11, 7, 8, 9]
  }
];

// 🎹 Akkord- & Kadenzen-Katalog (D1–D3)
const CHORD_CATALOG: ChordItem[] = [
  {
    id: 'major',
    name: 'Dur-Dreiklang',
    shortName: 'Dur',
    juniorName: 'Fröhlich',
    visualSymbol: '▲ Dur',
    songAnchorShort: 'Dur • Hell & Fröhlich',
    proShort: 'Maj',
    proClassification: 'Dur-Dreiklang (1-3-5)',
    intervals: [0, 4, 7],
    vdmLevel: 'd1',
    description: 'Hell, strahlend, fröhlich (Grundton, große Terz, Quinte)'
  },
  {
    id: 'minor',
    name: 'Moll-Dreiklang',
    shortName: 'Moll',
    juniorName: 'Traurig',
    visualSymbol: '▼ Moll',
    songAnchorShort: 'Moll • Sanft & Traurig',
    proShort: 'Min',
    proClassification: 'Moll-Dreiklang (1-b3-5)',
    intervals: [0, 3, 7],
    vdmLevel: 'd1',
    description: 'Melancholisch, getragen, traurig (Grundton, kleine Terz, Quinte)'
  },
  {
    id: 'diminished',
    name: 'Vermindert',
    shortName: 'verm.',
    juniorName: 'Gruselig',
    visualSymbol: '◆ Verm.',
    songAnchorShort: 'Vermindert • Schauder & Spannung',
    proShort: 'dim',
    proClassification: 'Vermindert (1-b3-b5)',
    intervals: [0, 3, 6],
    vdmLevel: 'd2',
    description: 'Schaurig, instabil, drängend (Zwei kleine Terzen)'
  },
  {
    id: 'augmented',
    name: 'Übermäßig',
    shortName: 'überm.',
    juniorName: 'Zauber',
    visualSymbol: '✦ Überm.',
    songAnchorShort: 'Übermäßig • Schwebend & Mystisch',
    proShort: 'aug',
    proClassification: 'Übermäßig (1-3-#5)',
    intervals: [0, 4, 8],
    vdmLevel: 'd2',
    description: 'Schwebend, mystisch, wie verzaubert (Zwei große Terzen)'
  },
  {
    id: 'dom7',
    name: 'Dominantseptakkord (7)',
    shortName: '7',
    juniorName: 'Blues-Klang',
    visualSymbol: '■ 7',
    songAnchorShort: 'Dominant 7 • Bluesig & Drängend',
    proShort: '7',
    proClassification: 'Dominantsept (1-3-5-b7)',
    intervals: [0, 4, 7, 10],
    vdmLevel: 'd3',
    description: 'Bluesig, drängend nach Auflösung (Dur + kleine 7)'
  },
  {
    id: 'maj7',
    name: 'Major 7 (maj7)',
    shortName: 'maj7',
    juniorName: 'Traum-Klang',
    visualSymbol: '✦ maj7',
    songAnchorShort: 'Major 7 • Samtig & Träumerisch',
    proShort: 'maj7',
    proClassification: 'Dur-Sept (1-3-5-7)',
    intervals: [0, 4, 7, 11],
    vdmLevel: 'd3',
    description: 'Jazzig, samtig, träumerisch (Dur + große 7)'
  },
  {
    id: 'min7',
    name: 'Moll-Septakkord (m7)',
    shortName: 'm7',
    juniorName: 'Abend-Klang',
    visualSymbol: '● m7',
    songAnchorShort: 'Moll 7 • Warm & Entspannt',
    proShort: 'm7',
    proClassification: 'Moll-Sept (1-b3-5-b7)',
    intervals: [0, 3, 7, 10],
    vdmLevel: 'd3',
    description: 'Warm, soulig, entspannt (Moll + kleine 7)'
  },
  {
    id: 'm7b5',
    name: 'Halbvermindert (m7b5)',
    shortName: 'ø',
    juniorName: 'Nebel-Klang',
    visualSymbol: '◇ ø',
    songAnchorShort: 'Halbvermindert • Geheimnisvoll',
    proShort: 'm7b5',
    proClassification: 'Halbvermindert (1-b3-b5-b7)',
    intervals: [0, 3, 6, 10],
    vdmLevel: 'd3',
    description: 'Typischer Jazz-Stufen-Akkord, unbestimmt schwebend'
  }
];

// 🎤 Sing-Back Ton-Pool (D1–D3)
const PITCH_MATCH_NOTES: { midi: number; label: string; vdmLevel: VdmLevel }[] = [
  { midi: 60, label: 'C4', vdmLevel: 'd1' },
  { midi: 62, label: 'D4', vdmLevel: 'd1' },
  { midi: 64, label: 'E4', vdmLevel: 'd1' },
  { midi: 65, label: 'F4', vdmLevel: 'd1' },
  { midi: 67, label: 'G4', vdmLevel: 'd1' },
  { midi: 69, label: 'A4', vdmLevel: 'd1' },
  { midi: 71, label: 'B4', vdmLevel: 'd2' },
  { midi: 72, label: 'C5', vdmLevel: 'd2' },
  { midi: 61, label: 'C#4', vdmLevel: 'd3' },
  { midi: 63, label: 'D#4', vdmLevel: 'd3' },
  { midi: 66, label: 'F#4', vdmLevel: 'd3' },
  { midi: 68, label: 'G#4', vdmLevel: 'd3' },
  { midi: 70, label: 'A#4', vdmLevel: 'd3' }
];

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
  const [vdmLevel, setVdmLevel] = useState<VdmLevel>('d1');
  const [soundTimbre, setSoundTimbre] = useState<SoundEngineTimbre>('rhodes');

  // Key Center Drone (Tonika-Bordun)
  const [isDroneEnabled, setIsDroneEnabled] = useState<boolean>(false);
  const [droneRootMidi, setDroneRootMidi] = useState<number>(48); // C3

  // 1. Intervall-Labor State
  const [intervalPlayMode, setIntervalPlayMode] = useState<IntervalPlaybackMode>('ascending');
  const [currentIntervalQuestion, setCurrentIntervalQuestion] = useState<{ rootMidi: number; interval: IntervalItem } | null>(null);
  const [selectedIntervalAnswer, setSelectedIntervalAnswer] = useState<string | null>(null);
  const [isIntervalAnswerSubmitted, setIsIntervalAnswerSubmitted] = useState<boolean>(false);
  const [lastChosenInterval, setLastChosenInterval] = useState<IntervalItem | null>(null);

  // 2. Akkord-Labor State
  const [chordPlayMode, setChordPlayMode] = useState<ChordPlaybackMode>('block');
  const [currentChordQuestion, setCurrentChordQuestion] = useState<{ rootMidi: number; chord: ChordItem } | null>(null);
  const [selectedChordAnswer, setSelectedChordAnswer] = useState<string | null>(null);
  const [isChordAnswerSubmitted, setIsChordAnswerSubmitted] = useState<boolean>(false);
  const [lastChosenChord, setLastChosenChord] = useState<ChordItem | null>(null);

  // 3. Sing-Back / Pitch-Match State (YIN)
  const [currentPitchQuestion, setCurrentPitchQuestion] = useState<{ midi: number; label: string } | null>(null);
  const [isPitchListening, setIsPitchListening] = useState<boolean>(false);
  const [livePitchResult, setLivePitchResult] = useState<YinPitchResult | null>(null);
  const [pitchMatchLockCountdown, setPitchMatchLockCountdown] = useState<number>(0);
  const [isPitchLockedIn, setIsPitchLockedIn] = useState<boolean>(false);
  const pitchStreamRef = useRef<RealtimePitchStream | null>(null);
  const pitchHoldTimerRef = useRef<any>(null);

  // Gamification & Session Metrics
  const [challengeProgress, setChallengeProgress] = useState({ current: 1, total: 10, correctCount: 0 });
  const [streak, setStreak] = useState<number>(0);
  const [maxSessionStreak, setMaxSessionStreak] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [isCompletedCelebration, setIsCompletedCelebration] = useState<boolean>(false);
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

  // Filterung nach VdM-Stufe
  const availableIntervals = useMemo(() => {
    return INTERVAL_CATALOG.filter(item => {
      if (vdmLevel === 'd1') return item.vdmLevel === 'd1';
      if (vdmLevel === 'd2') return item.vdmLevel === 'd1' || item.vdmLevel === 'd2';
      return true;
    });
  }, [vdmLevel]);

  const availableChords = useMemo(() => {
    return CHORD_CATALOG.filter(item => {
      if (vdmLevel === 'd1') return item.vdmLevel === 'd1';
      if (vdmLevel === 'd2') return item.vdmLevel === 'd1' || item.vdmLevel === 'd2';
      return true;
    });
  }, [vdmLevel]);

  const availablePitchNotes = useMemo(() => {
    return PITCH_MATCH_NOTES.filter(item => {
      if (vdmLevel === 'd1') return item.vdmLevel === 'd1';
      if (vdmLevel === 'd2') return item.vdmLevel === 'd1' || item.vdmLevel === 'd2';
      return true;
    });
  }, [vdmLevel]);

  // Generiere Intervall-Frage
  const generateNewIntervalQuestion = useCallback(() => {
    const randomInterval = availableIntervals[Math.floor(Math.random() * availableIntervals.length)];
    const rootMidi = 48 + Math.floor(Math.random() * 14); // C3 bis D4
    setCurrentIntervalQuestion({ rootMidi, interval: randomInterval });
    setSelectedIntervalAnswer(null);
    setLastChosenInterval(null);
    setIsIntervalAnswerSubmitted(false);
    setQuestionStartTime(Date.now());
  }, [availableIntervals]);

  // Generiere Akkord-Frage
  const generateNewChordQuestion = useCallback(() => {
    const randomChord = availableChords[Math.floor(Math.random() * availableChords.length)];
    const rootMidi = 48 + Math.floor(Math.random() * 12);
    setCurrentChordQuestion({ rootMidi, chord: randomChord });
    setSelectedChordAnswer(null);
    setLastChosenChord(null);
    setIsChordAnswerSubmitted(false);
    setQuestionStartTime(Date.now());
  }, [availableChords]);

  // Generiere Pitch-Match Frage
  const generateNewPitchQuestion = useCallback(() => {
    const randomNote = availablePitchNotes[Math.floor(Math.random() * availablePitchNotes.length)];
    setCurrentPitchQuestion(randomNote);
    setIsPitchLockedIn(false);
    setLivePitchResult(null);
    setPitchMatchLockCountdown(0);
    setQuestionStartTime(Date.now());
  }, [availablePitchNotes]);

  // Initialisiere erste Frage bei Pillar- oder Stufenwechsel
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
  }, [activePillar, vdmLevel, generateNewIntervalQuestion, generateNewChordQuestion, generateNewPitchQuestion]);

  // Intervall abspielen
  const handlePlayCurrentInterval = useCallback(() => {
    if (!currentIntervalQuestion) return;
    earSynth.playInterval(
      currentIntervalQuestion.rootMidi,
      currentIntervalQuestion.interval.semitones,
      intervalPlayMode,
      0.8,
      soundTimbre
    );
  }, [currentIntervalQuestion, intervalPlayMode, soundTimbre]);

  // Akkord abspielen
  const handlePlayCurrentChord = useCallback(() => {
    if (!currentChordQuestion) return;
    earSynth.playChord(
      currentChordQuestion.rootMidi,
      currentChordQuestion.chord.intervals,
      chordPlayMode,
      2.0,
      soundTimbre
    );
  }, [currentChordQuestion, chordPlayMode, soundTimbre]);

  // Pitch-Match Referenzton abspielen
  const handlePlayTargetPitch = useCallback(() => {
    if (!currentPitchQuestion) return;
    earSynth.playNote(currentPitchQuestion.midi, 1.8, 0.4, 0, soundTimbre);
  }, [currentPitchQuestion, soundTimbre]);

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
    const levelMult = vdmLevel === 'd3' ? 1.5 : vdmLevel === 'd2' ? 1.25 : 1.0;
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
    if (isIntervalAnswerSubmitted || !currentIntervalQuestion) return;
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

  // Akkord-Antwort prüfen mit didaktischer Feedback-Kassette
  const handleSelectChordAnswer = (chordId: string) => {
    if (isChordAnswerSubmitted || !currentChordQuestion) return;
    const chosen = availableChords.find(c => c.id === chordId) || null;
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
      intervalPlayMode,
      0.8,
      soundTimbre
    );
  };

  const handlePlayChosenInterval = () => {
    if (!currentIntervalQuestion || !lastChosenInterval) return;
    earSynth.playInterval(
      currentIntervalQuestion.rootMidi,
      lastChosenInterval.semitones,
      intervalPlayMode,
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

  // Sing-Back / Pitch-Match Mikrofon Steuerung
  const togglePitchListening = async () => {
    if (isPitchListening) {
      pitchStreamRef.current?.stop();
      setIsPitchListening(false);
      setLivePitchResult(null);
    } else {
      if (!pitchStreamRef.current) {
        pitchStreamRef.current = new RealtimePitchStream();
      }
      const ok = await pitchStreamRef.current.start((result) => {
        setLivePitchResult(result);

        // Prüfe ob Ton im Zielfenster liegt
        if (currentPitchQuestion && result.pitch && result.isAudible) {
          const targetFreq = midiToFreq(currentPitchQuestion.midi);
          const score = evaluatePitchMatch(result.pitch, targetFreq, 30);

          if (score.isMatched) {
            setPitchMatchLockCountdown(prev => {
              if (prev >= 100) {
                // Ton erfolgreich gehalten!
                if (!isPitchLockedIn) {
                  setIsPitchLockedIn(true);
                  pitchStreamRef.current?.stop();
                  setIsPitchListening(false);
                  setTimeout(() => {
                    advanceToNextStep(true);
                  }, 900);
                }
                return 100;
              }
              return Math.min(100, prev + 25);
            });
          } else {
            setPitchMatchLockCountdown(prev => Math.max(0, prev - 15));
          }
        }
      });
      setIsPitchListening(ok);
    }
  };

  // Unmount Cleanup
  useEffect(() => {
    return () => {
      pitchStreamRef.current?.stop();
      clearTimeout(pitchHoldTimerRef.current);
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
        maxWidth: '720px',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '24px',
        border: '1.5px solid rgba(139, 92, 246, 0.25)',
        padding: embedded ? '16px' : '22px',
        boxShadow: embedded ? 'none' : '0 12px 36px -4px rgba(139, 92, 246, 0.14), 0 2px 8px rgba(0, 0, 0, 0.02)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        color: '#0f172a'
      }}
    >
      {/* 1. Header: Titel, Ansichten-Switch (Studio vs. Hall of Ear) & Schließen */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '8px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px -2px rgba(139, 92, 246, 0.45)'
          }}>
            <Headphones size={20} strokeWidth={2.4} color="#ffffff" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 950, color: '#0f172a' }}>
              {uiLevel === 'junior' ? 'Klang-Detektiv' : 'Gehörtraining'}
            </h2>
            <span style={{ fontSize: '0.70rem', color: '#7c3aed', fontWeight: 750 }}>
              0,1% Goldstandard • 3 Tonale Säulen
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Hall of Ear Toggle */}
          <button
            type="button"
            onClick={() => setActiveView(prev => prev === 'studio' ? 'hall_of_ear' : 'studio')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '10px',
              border: activeView === 'hall_of_ear' ? '1px solid #7c3aed' : '1.5px solid #e2e8f0',
              background: activeView === 'hall_of_ear' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : '#f8fafc',
              color: activeView === 'hall_of_ear' ? '#ffffff' : '#6d28d9',
              fontSize: '0.74rem',
              fontWeight: 850,
              cursor: 'pointer',
              boxShadow: activeView === 'hall_of_ear' ? '0 4px 12px rgba(139, 92, 246, 0.35)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Trophy size={14} strokeWidth={2.4} />
            <span>Hall of Ear</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} strokeWidth={2.4} />
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
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              color: '#ffffff',
              fontSize: '0.80rem',
              fontWeight: 850,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)'
            }}
          >
            <Headphones size={15} strokeWidth={2.4} />
            <span>Zurück zum Trainings-Studio</span>
          </button>
        </div>
      ) : (
        /* Ansicht: TRAINING STUDIO */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* 2. Säulen-Leiste (3 didaktische Säulen) */}
          <div
            role="tablist"
            aria-label="Didaktische Gehör-Säulen"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              background: '#f8fafc',
              padding: '4px',
              borderRadius: '14px',
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
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 6px',
                borderRadius: '10px',
                border: 'none',
                background: activePillar === 'intervals' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'transparent',
                color: activePillar === 'intervals' ? '#ffffff' : '#64748b',
                fontWeight: activePillar === 'intervals' ? 900 : 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: activePillar === 'intervals' ? '0 4px 12px rgba(139, 92, 246, 0.30)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Music size={14} strokeWidth={2.4} />
              <span>Intervalle</span>
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
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 6px',
                borderRadius: '10px',
                border: 'none',
                background: activePillar === 'chords' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'transparent',
                color: activePillar === 'chords' ? '#ffffff' : '#64748b',
                fontWeight: activePillar === 'chords' ? 900 : 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: activePillar === 'chords' ? '0 4px 12px rgba(139, 92, 246, 0.30)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Sliders size={14} strokeWidth={2.4} />
              <span>Akkordfarben</span>
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
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 6px',
                borderRadius: '10px',
                border: 'none',
                background: activePillar === 'pitch_match' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'transparent',
                color: activePillar === 'pitch_match' ? '#ffffff' : '#64748b',
                fontWeight: activePillar === 'pitch_match' ? 900 : 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: activePillar === 'pitch_match' ? '0 4px 12px rgba(139, 92, 246, 0.30)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Mic size={14} strokeWidth={2.4} />
              <span>Sing-Back</span>
            </button>
          </div>

          {/* 3. Utility-Leiste: VdM-Level, Timbre & Key Center Drone */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '6px',
            fontSize: '0.72rem'
          }}>
            {/* VdM Level Stufen */}
            <div style={{ display: 'flex', gap: '3px', background: '#f1f5f9', padding: '3px', borderRadius: '10px' }}>
              {(['d1', 'd2', 'd3'] as VdmLevel[]).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setVdmLevel(lvl)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: vdmLevel === lvl ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'transparent',
                    color: vdmLevel === lvl ? '#ffffff' : '#64748b',
                    fontWeight: vdmLevel === lvl ? 900 : 650,
                    fontSize: '0.70rem',
                    cursor: 'pointer',
                    boxShadow: vdmLevel === lvl ? '0 2px 8px rgba(139, 92, 246, 0.25)' : 'none'
                  }}
                >
                  {lvl.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Timbre & Key Center Drone Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Klangfarbe */}
              <div style={{ display: 'flex', gap: '2px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSoundTimbre('rhodes')}
                  style={{
                    padding: '3px 7px',
                    borderRadius: '6px',
                    border: 'none',
                    background: soundTimbre === 'rhodes' ? '#ffffff' : 'transparent',
                    color: soundTimbre === 'rhodes' ? '#0f172a' : '#64748b',
                    fontSize: '0.65rem',
                    fontWeight: 750,
                    cursor: 'pointer'
                  }}
                >
                  Rhodes
                </button>
                <button
                  type="button"
                  onClick={() => setSoundTimbre('grand_piano')}
                  style={{
                    padding: '3px 7px',
                    borderRadius: '6px',
                    border: 'none',
                    background: soundTimbre === 'grand_piano' ? '#ffffff' : 'transparent',
                    color: soundTimbre === 'grand_piano' ? '#0f172a' : '#64748b',
                    fontSize: '0.65rem',
                    fontWeight: 750,
                    cursor: 'pointer'
                  }}
                >
                  Flügel
                </button>
                <button
                  type="button"
                  onClick={() => setSoundTimbre('strings')}
                  style={{
                    padding: '3px 7px',
                    borderRadius: '6px',
                    border: 'none',
                    background: soundTimbre === 'strings' ? '#ffffff' : 'transparent',
                    color: soundTimbre === 'strings' ? '#0f172a' : '#64748b',
                    fontSize: '0.65rem',
                    fontWeight: 750,
                    cursor: 'pointer'
                  }}
                >
                  Streicher
                </button>
              </div>

              {/* Tonika Bordun Drone */}
              <button
                type="button"
                onClick={() => setIsDroneEnabled(!isDroneEnabled)}
                title="Tonika-Bordun (C): Fördert das Hören nach Skalenstufen"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: isDroneEnabled ? '#0f172a' : '#ffffff',
                  color: isDroneEnabled ? '#ffffff' : '#475569',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
              >
                <Radio size={11} strokeWidth={2.4} />
                <span>Bordun {isDroneEnabled ? 'AN' : 'AUS'}</span>
              </button>
            </div>
          </div>

          {/* 4. Challenge-Fortschritt & Streak */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '6px 12px',
            fontSize: '0.72rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>
                Runde {challengeProgress.current} von {challengeProgress.total}
              </span>
              <span style={{ color: '#94a3b8' }}>•</span>
              <span style={{ color: '#64748b', fontWeight: 600 }}>
                {challengeProgress.correctCount} Richtig
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {streak > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#0f172a', fontWeight: 850 }}>
                  <Flame size={13} strokeWidth={2.4} />
                  <span>{streak}x Streak</span>
                </div>
              )}
              <button
                type="button"
                onClick={handlePlayCadence}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: '#475569',
                  fontWeight: 750,
                  cursor: 'pointer',
                  fontSize: '0.68rem'
                }}
              >
                <Sparkles size={11} strokeWidth={2.2} />
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

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCompletedCelebration(false);
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
              {/* Play & Anchor Controls */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={handlePlayCurrentInterval}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 6px 18px rgba(139, 92, 246, 0.40)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                    title="Intervall anhören (Leertaste)"
                  >
                    <Play size={22} fill="#ffffff" strokeWidth={0} />
                  </button>
                  <div>
                    <span style={{ fontSize: '0.90rem', fontWeight: 900, color: '#0f172a', display: 'block' }}>
                      Intervall anhören
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Klicke zum Abspielen • Höre die Ton-Distanz
                    </span>
                  </div>
                </div>

                {/* Abspielmodus: Aufsteigend, Absteigend, Harmonisch */}
                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                  {(['ascending', 'descending', 'harmonic'] as IntervalPlaybackMode[]).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setIntervalPlayMode(mode)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: intervalPlayMode === mode ? '#ffffff' : 'transparent',
                        color: intervalPlayMode === mode ? '#7c3aed' : '#64748b',
                        fontSize: '0.70rem',
                        fontWeight: intervalPlayMode === mode ? 900 : 700,
                        cursor: 'pointer',
                        boxShadow: intervalPlayMode === mode ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      {mode === 'ascending' ? '▲ Auf' : mode === 'descending' ? '▼ Ab' : '◆ Zusammen'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intervall-Auswahlkacheln (0,1% Goldstandard 3-Ebenen & Einzeilen-Schutz) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                gap: '8px'
              }}>
                {availableIntervals.map(item => {
                  const isSubmitted = isIntervalAnswerSubmitted;
                  const isChosen = selectedIntervalAnswer === item.id;
                  const isCorrect = currentIntervalQuestion?.interval.id === item.id;

                  let bg = '#ffffff';
                  let border = '#e2e8f0';
                  let text = '#0f172a';
                  let badgeBg = 'rgba(139, 92, 246, 0.10)';
                  let badgeColor = '#7c3aed';
                  let subColor = '#64748b';

                  if (isSubmitted) {
                    if (isCorrect) {
                      bg = '#ecfdf5';
                      border = '#10b981';
                      text = '#065f46';
                      badgeBg = '#10b981';
                      badgeColor = '#ffffff';
                      subColor = '#047857';
                    } else if (isChosen && !isCorrect) {
                      bg = '#fff1f2';
                      border = '#f43f5e';
                      text = '#9f1239';
                      badgeBg = '#f43f5e';
                      badgeColor = '#ffffff';
                      subColor = '#be123c';
                    } else {
                      bg = '#f8fafc';
                      border = '#e2e8f0';
                      text = '#94a3b8';
                      badgeBg = '#f1f5f9';
                      badgeColor = '#94a3b8';
                      subColor = '#cbd5e1';
                    }
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => handleSelectIntervalAnswer(item.id)}
                      style={{
                        padding: '10px 12px',
                        minHeight: '60px',
                        borderRadius: '14px',
                        border: `1.5px solid ${border}`,
                        background: bg,
                        color: text,
                        cursor: isSubmitted ? 'default' : 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '3px',
                        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isChosen ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                        overflow: 'hidden'
                      }}
                      className={!isSubmitted ? 'hover-scale' : ''}
                      title={`${item.name} (${item.semitones} Halbtöne)`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '4px' }}>
                        <span style={{
                          fontWeight: 900,
                          fontSize: 'clamp(0.78rem, 1.1vw, 0.88rem)',
                          letterSpacing: '-0.01em',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 'calc(100% - 38px)'
                        }}>
                          {uiLevel === 'junior' ? item.juniorName : item.name}
                        </span>
                        <span style={{
                          fontSize: uiLevel === 'junior' ? '0.64rem' : '0.70rem',
                          fontWeight: 850,
                          padding: '2px 6px',
                          borderRadius: '6px',
                          background: badgeBg,
                          color: badgeColor,
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                          letterSpacing: uiLevel === 'junior' ? '0.04em' : 'normal'
                        }}>
                          {uiLevel === 'junior'
                            ? item.visualDots
                            : uiLevel === 'pro'
                            ? item.proShort
                            : item.shortName}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.68rem',
                        color: subColor,
                        fontWeight: 650,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {uiLevel === 'junior'
                          ? item.name
                          : uiLevel === 'pro'
                          ? item.proClassification
                          : item.songAnchorShort}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Didaktische Feedback-Kassette & A/B-Hörvergleich */}
              {isIntervalAnswerSubmitted && currentIntervalQuestion && (
                <div style={{
                  background: selectedIntervalAnswer === currentIntervalQuestion.interval.id ? '#ecfdf5' : '#fff1f2',
                  border: `1.5px solid ${selectedIntervalAnswer === currentIntervalQuestion.interval.id ? '#10b981' : '#f43f5e'}`,
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
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
                          background: '#f43f5e',
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
                          color: selectedIntervalAnswer === currentIntervalQuestion.interval.id ? '#065f46' : '#9f1239',
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
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '9px 18px',
                        fontSize: '0.80rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 3px 12px rgba(139, 92, 246, 0.40)'
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
                        border: '1.5px solid #10b981',
                        color: '#065f46',
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
                          border: '1.5px solid #f43f5e',
                          color: '#9f1239',
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

                    {/* Taste 3: Song-Anker Melodie */}
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
                        background: 'rgba(139, 92, 246, 0.12)',
                        border: '1.5px solid rgba(139, 92, 246, 0.35)',
                        color: '#7c3aed',
                        borderRadius: '8px',
                        padding: '5px 11px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                      className="hover-scale"
                      title="Melodie des Song-Ankers abspielen"
                    >
                      <Sparkles size={13} strokeWidth={2.4} />
                      <span>Song-Anker hören</span>
                    </button>
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
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={handlePlayCurrentChord}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 6px 18px rgba(139, 92, 246, 0.40)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                    title="Akkord anhören (Leertaste)"
                  >
                    <Play size={22} fill="#ffffff" strokeWidth={0} />
                  </button>
                  <div>
                    <span style={{ fontSize: '0.90rem', fontWeight: 900, color: '#0f172a', display: 'block' }}>
                      Akkord anhören
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Höre die Klangfarbe (Dur, Moll, Jazz...)
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
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: chordPlayMode === mode ? '#ffffff' : 'transparent',
                        color: chordPlayMode === mode ? '#7c3aed' : '#64748b',
                        fontSize: '0.70rem',
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

              {/* Akkord-Auswahlkacheln (0,1% Goldstandard 3-Ebenen & Einzeilen-Schutz) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                gap: '8px'
              }}>
                {availableChords.map(item => {
                  const isSubmitted = isChordAnswerSubmitted;
                  const isChosen = selectedChordAnswer === item.id;
                  const isCorrect = currentChordQuestion?.chord.id === item.id;

                  let bg = '#ffffff';
                  let border = '#e2e8f0';
                  let text = '#0f172a';
                  let badgeBg = 'rgba(139, 92, 246, 0.10)';
                  let badgeColor = '#7c3aed';
                  let subColor = '#64748b';

                  if (isSubmitted) {
                    if (isCorrect) {
                      bg = '#ecfdf5';
                      border = '#10b981';
                      text = '#065f46';
                      badgeBg = '#10b981';
                      badgeColor = '#ffffff';
                      subColor = '#047857';
                    } else if (isChosen && !isCorrect) {
                      bg = '#fff1f2';
                      border = '#f43f5e';
                      text = '#9f1239';
                      badgeBg = '#f43f5e';
                      badgeColor = '#ffffff';
                      subColor = '#be123c';
                    } else {
                      bg = '#f8fafc';
                      border = '#e2e8f0';
                      text = '#94a3b8';
                      badgeBg = '#f1f5f9';
                      badgeColor = '#94a3b8';
                      subColor = '#cbd5e1';
                    }
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => handleSelectChordAnswer(item.id)}
                      style={{
                        padding: '10px 12px',
                        minHeight: '60px',
                        borderRadius: '14px',
                        border: `1.5px solid ${border}`,
                        background: bg,
                        color: text,
                        cursor: isSubmitted ? 'default' : 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '3px',
                        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isChosen ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                        overflow: 'hidden'
                      }}
                      className={!isSubmitted ? 'hover-scale' : ''}
                      title={`${item.name}: ${item.description}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '4px' }}>
                        <span style={{
                          fontWeight: 900,
                          fontSize: 'clamp(0.78rem, 1.1vw, 0.88rem)',
                          letterSpacing: '-0.01em',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 'calc(100% - 38px)'
                        }}>
                          {uiLevel === 'junior' ? item.juniorName : item.name}
                        </span>
                        <span style={{
                          fontSize: uiLevel === 'junior' ? '0.64rem' : '0.70rem',
                          fontWeight: 850,
                          padding: '2px 6px',
                          borderRadius: '6px',
                          background: badgeBg,
                          color: badgeColor,
                          flexShrink: 0,
                          whiteSpace: 'nowrap'
                        }}>
                          {uiLevel === 'junior'
                            ? item.visualSymbol
                            : uiLevel === 'pro'
                            ? item.proShort
                            : item.shortName}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.68rem',
                        color: subColor,
                        fontWeight: 650,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {uiLevel === 'junior'
                          ? item.name
                          : uiLevel === 'pro'
                          ? item.proClassification
                          : item.songAnchorShort}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Didaktische Feedback-Kassette & A/B-Hörvergleich für Akkorde */}
              {isChordAnswerSubmitted && currentChordQuestion && (
                <div style={{
                  background: selectedChordAnswer === currentChordQuestion.chord.id ? '#ecfdf5' : '#fff1f2',
                  border: `1.5px solid ${selectedChordAnswer === currentChordQuestion.chord.id ? '#10b981' : '#f43f5e'}`,
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {selectedChordAnswer === currentChordQuestion.chord.id ? (
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
                          background: '#f43f5e',
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
                          color: selectedChordAnswer === currentChordQuestion.chord.id ? '#065f46' : '#9f1239',
                          display: 'block'
                        }}>
                          {selectedChordAnswer === currentChordQuestion.chord.id
                            ? uiLevel === 'junior'
                              ? `Super gehört! Richtig: ${currentChordQuestion.chord.juniorName} (${currentChordQuestion.chord.name})`
                              : `Perfekt! Das war ein ${currentChordQuestion.chord.name}`
                            : uiLevel === 'junior'
                              ? `Fast! Richtig war: ${currentChordQuestion.chord.juniorName} (${currentChordQuestion.chord.name})`
                              : `Fast! Es war ein ${currentChordQuestion.chord.name}`}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 650 }}>
                          Klangfarbe: {currentChordQuestion.chord.description}
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
                        gap: '6px',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '9px 18px',
                        fontSize: '0.80rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 3px 12px rgba(139, 92, 246, 0.40)'
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

                    {/* Taste 1: Gehörter Akkord */}
                    <button
                      type="button"
                      onClick={handlePlayHeardChord}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#ffffff',
                        border: '1.5px solid #10b981',
                        color: '#065f46',
                        borderRadius: '8px',
                        padding: '5px 11px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                      className="hover-scale"
                      title="Gehörten Akkord erneut abspielen"
                    >
                      <Volume2 size={13} strokeWidth={2.5} />
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
                          gap: '5px',
                          background: '#ffffff',
                          border: '1.5px solid #f43f5e',
                          color: '#9f1239',
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
            <div
              role="tabpanel"
              id="panel-ear-pitch-match"
              aria-labelledby="tab-ear-pitch-match"
              tabIndex={0}
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={handlePlayTargetPitch}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 6px 18px rgba(139, 92, 246, 0.40)',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                      title="Zielton vorhören"
                    >
                      <Volume2 size={22} strokeWidth={2.4} />
                    </button>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 950, color: '#0f172a' }}>
                          Zielton: {currentPitchQuestion?.label}
                        </span>
                        <span style={{
                          fontSize: '0.70rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(139, 92, 246, 0.12)',
                          color: '#7c3aed'
                        }}>
                          {Math.round(midiToFreq(currentPitchQuestion?.midi || 60))} Hz
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Höre den Ton und singe ihn präzise nach (Oktav-tolerant)
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={togglePitchListening}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 18px',
                      borderRadius: '12px',
                      border: 'none',
                      background: isPitchListening
                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      fontSize: '0.80rem',
                      fontWeight: 850,
                      cursor: 'pointer',
                      boxShadow: isPitchListening
                        ? '0 4px 14px rgba(239, 68, 68, 0.35)'
                        : '0 4px 14px rgba(16, 185, 129, 0.35)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                  >
                    <Mic size={16} strokeWidth={2.4} />
                    <span>{isPitchListening ? 'Mikrofon aktiv' : 'Mikrofon starten'}</span>
                  </button>
                </div>

                {/* 2027 Vocal Pitch Highway Visualizer */}
                <div style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  {livePitchResult && livePitchResult.isAudible && livePitchResult.pitch ? (
                    (() => {
                      const targetFreq = midiToFreq(currentPitchQuestion?.midi || 60);
                      const evalScore = evaluatePitchMatch(livePitchResult.pitch, targetFreq, 28);
                      const isMatched = evalScore.isMatched;
                      const cents = evalScore.cents;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
                          {/* Gesungene Note vs. Zielton */}
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{
                              fontSize: '2.2rem',
                              fontWeight: 950,
                              color: isMatched ? '#10b981' : '#0f172a',
                              letterSpacing: '-0.02em',
                              transition: 'color 0.15s ease'
                            }}>
                              {livePitchResult.noteName || '–'}
                            </span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>
                              ({Math.round(livePitchResult.pitch)} Hz)
                            </span>
                          </div>

                          {/* Vocal Highway Pitch Track */}
                          <div style={{
                            width: '100%',
                            maxWidth: '380px',
                            height: '24px',
                            background: '#f1f5f9',
                            borderRadius: '100px',
                            position: 'relative',
                            overflow: 'hidden',
                            border: '1px solid #e2e8f0'
                          }}>
                            {/* Mittlerer Ziel-Korridor (Sweet Spot) */}
                            <div style={{
                              position: 'absolute',
                              left: '42%',
                              width: '16%',
                              height: '100%',
                              background: isMatched ? 'rgba(16, 185, 129, 0.25)' : '#e2e8f0',
                              borderLeft: '1.5px dashed #cbd5e1',
                              borderRight: '1.5px dashed #cbd5e1',
                              transition: 'background 0.15s ease'
                            }} />

                            {/* Dynamischer Voice Orb / Stimm-Cursor */}
                            <div style={{
                              position: 'absolute',
                              left: `${Math.max(5, Math.min(95, 50 + (cents)))}%`,
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: isMatched
                                ? '#10b981'
                                : cents < -15
                                ? '#3b82f6'
                                : '#f97316',
                              boxShadow: isMatched
                                ? '0 0 14px rgba(16, 185, 129, 0.85)'
                                : '0 2px 6px rgba(0,0,0,0.2)',
                              transition: 'left 0.08s cubic-bezier(0.16, 1, 0.3, 1), background 0.15s ease'
                            }} />
                          </div>

                          {/* Didaktische Richtungs-Führung */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isMatched ? (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#ecfdf5',
                                border: '1px solid #10b981',
                                color: '#065f46',
                                padding: '4px 14px',
                                borderRadius: '99px',
                                fontSize: '0.78rem',
                                fontWeight: 900,
                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                              }}>
                                <Check size={14} strokeWidth={3} />
                                <span>{uiLevel === 'junior' ? 'Super getroffen! Halte den Ton...' : 'Perfekt getroffen! Ton halten...'}</span>
                              </div>
                            ) : cents < -15 ? (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#eff6ff',
                                border: '1px solid #93c5fd',
                                color: '#1e40af',
                                padding: '4px 12px',
                                borderRadius: '99px',
                                fontSize: '0.76rem',
                                fontWeight: 850
                              }}>
                                <ArrowUp size={13} strokeWidth={2.8} />
                                <span>
                                  {uiLevel === 'junior'
                                    ? 'Höher singen'
                                    : uiLevel === 'pro'
                                    ? `Höher singen (Δ -${Math.abs(Math.round(cents))} ct)`
                                    : `Höher singen (${Math.abs(Math.round(cents))}ct zu tief)`}
                                </span>
                              </div>
                            ) : (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#fff7ed',
                                border: '1px solid #fed7aa',
                                color: '#c2410c',
                                padding: '4px 12px',
                                borderRadius: '99px',
                                fontSize: '0.76rem',
                                fontWeight: 850
                              }}>
                                <ArrowDown size={13} strokeWidth={2.8} />
                                <span>
                                  {uiLevel === 'junior'
                                    ? 'Tiefer singen'
                                    : uiLevel === 'pro'
                                    ? `Tiefer singen (Δ +${Math.round(cents)} ct)`
                                    : `Tiefer singen (${Math.round(cents)}ct zu hoch)`}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* 1,2s Lock-In Ladebalken */}
                          {pitchMatchLockCountdown > 0 && (
                            <div style={{
                              width: '100%',
                              maxWidth: '240px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '4px',
                              marginTop: '2px'
                            }}>
                              <div style={{
                                width: '100%',
                                height: '8px',
                                background: '#f1f5f9',
                                borderRadius: '100px',
                                overflow: 'hidden',
                                border: '1px solid #e2e8f0'
                              }}>
                                <div style={{
                                  width: `${pitchMatchLockCountdown}%`,
                                  height: '100%',
                                  background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)',
                                  transition: 'width 0.08s linear'
                                }} />
                              </div>
                              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#059669' }}>
                                Intonation einrasten: {pitchMatchLockCountdown}%
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ padding: '16px 0', textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
                      <Activity size={24} strokeWidth={2.0} color="#8b5cf6" style={{ marginBottom: '6px' }} />
                      <p style={{ margin: 0, fontWeight: 750, color: '#0f172a' }}>
                        {isPitchListening ? 'Höre zu... Singe jetzt den Zielton!' : 'Mikrofon starten & Zielton nachsingen'}
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.70rem', color: '#94a3b8' }}>
                        Tipp: Du kannst den Ton in deiner bequemen Stimmlage singen (auch eine Oktave tiefer oder höher).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
