import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Sparkles, 
  Zap, 
  Activity, 
  Volume2, 
  VolumeX, 
  Award, 
  SlidersHorizontal, 
  Flame, 
  Music, 
  Target, 
  Star, 
  Trophy, 
  Radio, 
  Headphones, 
  Clock, 
  FastForward, 
  Gauge, 
  CircleDot, 
  Check, 
  Sliders, 
  Layers, 
  Compass, 
  ChevronRight, 
  Bluetooth, 
  TrendingUp, 
  Lightbulb, 
  CheckCircle2, 
  Lock,
  Shuffle,
  Dices,
  Sun,
  Settings
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { 
  getAudioDeviceFingerprint, 
  getDeviceLatency, 
  saveDeviceLatency 
} from '../../utils/audioDeviceCalibration';
import { GrooveLeaderboardWidget } from './GrooveLeaderboardWidget';
import { GrooveSessionCelebrationModal } from './GrooveSessionCelebrationModal';
import { getOptimalDeviceLatency, detectDeviceLatencyInfo } from '../../utils/deviceLatencyDetector';

export interface GrooveTrainerProps {
  student?: any;
  onClose?: () => void;
  onRewardXp?: (xp: number, durationSeconds?: number) => void;
  initialBpm?: number;
  uiLevel?: 'junior' | 'teen' | 'pro';
  embedded?: boolean;
  useNotebookLayout?: boolean;
  homeworkNotesList?: string[];
}

export type RhythmLevel = 'viertel' | 'rock_mix' | 'synkopen' | 'galopp' | 'latin_bossa' | 'funk_master' | 'shuffle' | 'random_groove';
type TrainingMode = 'call_response' | 'continuous' | 'disappearing_beat';
type SoundKitType = 'acoustic' | 'body_percussion' | 'urban_808' | 'latin';

interface LevelConfig {
  id: RhythmLevel;
  titleJunior: string;
  titlePro: string;
  subtitleJunior: string;
  subtitlePro: string;
  defaultBpm: number;
  subdivisions: number;
  syllablesJunior: string[];
  syllablesPro: string[];
  targetPattern: boolean[];
  badgeJunior: string;
  badgePro: string;
  multiplier: number;
}

interface HitRecord {
  id: number;
  offsetMs: number;
  rating: 'pocket' | 'good' | 'rush' | 'drag' | 'miss';
  bar: number;
  step: number;
}

const RHYTHM_LEVELS: LevelConfig[] = [
  {
    id: 'viertel',
    titleJunior: '1. Bären-Puls',
    titlePro: '1. Viertel-Puls (4/4)',
    subtitleJunior: 'Der Grund-Puls: Finde den Herzschlag der Musik',
    subtitlePro: 'Metrischer 4/4 Grundpuls und Mikrotiming',
    defaultBpm: 80,
    subdivisions: 4,
    syllablesJunior: ['BUMM', 'BUMM', 'BUMM', 'BUMM'],
    syllablesPro: ['1', '2', '3', '4'],
    targetPattern: [true, true, true, true],
    badgeJunior: 'Herzschlag',
    badgePro: '1/4 Beat',
    multiplier: 1.0
  },
  {
    id: 'rock_mix',
    titleJunior: '2. Rock-Mix',
    titlePro: '2. Rock-Mix (Viertel & 8tel)',
    subtitleJunior: 'Ta - Ti-Ti - Ta - Ti-Ti: Der Rock-Klassiker',
    subtitlePro: 'Viertel-Downbeats kombiniert mit Achtel-Pärchen',
    defaultBpm: 85,
    subdivisions: 8,
    syllablesJunior: ['TA', '·', 'TI', 'TI', 'TA', '·', 'TI', 'TI'],
    syllablesPro: ['1', '·', '2', '+', '3', '·', '4', '+'],
    targetPattern: [true, false, true, true, true, false, true, true],
    badgeJunior: 'Ta · Ti-Ti',
    badgePro: 'Rock-Mix',
    multiplier: 1.2
  },
  {
    id: 'synkopen',
    titleJunior: '3. Off-Beat & Reggae',
    titlePro: '3. Off-Beat Synkopen',
    subtitleJunior: 'Spiele genau zwischen den Schlägen',
    subtitlePro: 'Upbeat-Akzente auf die Und-Zählzeiten (+)',
    defaultBpm: 90,
    subdivisions: 8,
    syllablesJunior: ['·', 'UND', '·', 'UND', '·', 'UND', '·', 'UND'],
    syllablesPro: ['·', '+', '·', '+', '·', '+', '·', '+'],
    targetPattern: [false, true, false, true, false, true, false, true],
    badgeJunior: 'Reggae',
    badgePro: 'Off-Beat',
    multiplier: 1.3
  },
  {
    id: 'galopp',
    titleJunior: '4. Galopp-Mix',
    titlePro: '4. Galopp-Mix (8tel + 16tel)',
    subtitleJunior: 'Ti - Ti-Ri: Das galoppierende Wildpferd',
    subtitlePro: '1 Achtel + 2 16tel Hufschlag-Subdivision',
    defaultBpm: 85,
    subdivisions: 16,
    syllablesJunior: ['TI', '·', 'TI', 'RI', 'TI', '·', 'TI', 'RI', 'TI', '·', 'TI', 'RI', 'TI', '·', 'TI', 'RI'],
    syllablesPro: ['1', '·', 'e', '+', '2', '·', 'e', '+', '3', '·', 'e', '+', '4', '·', 'e', '+'],
    targetPattern: [true, false, true, true, true, false, true, true, true, false, true, true, true, false, true, true],
    badgeJunior: 'Galopp',
    badgePro: 'Galopp-Mix',
    multiplier: 1.4
  },
  {
    id: 'latin_bossa',
    titleJunior: '5. Latin & Bossa',
    titlePro: '5. Latin Bossa & Clave (Salsa)',
    subtitleJunior: 'Samba- & Bossa-Puls aus Südamerika zum Tanzen',
    subtitlePro: 'Bossa-Nova Clave Synkopierung mit 16tel-Verschiebungen',
    defaultBpm: 90,
    subdivisions: 16,
    syllablesJunior: ['BOS', '·', '·', 'SA', '·', '·', 'NO', '·', '·', '·', 'VA', '·', 'GROOVE', '·', '·', '·'],
    syllablesPro: ['1', '·', '·', 'a', '·', '·', '+', '·', '·', '·', 'e', '·', '4', '·', '·', '·'],
    targetPattern: [true, false, false, true, false, false, true, false, false, false, true, false, true, false, false, false],
    badgeJunior: 'Bossa-Salsa',
    badgePro: 'Latin-Clave',
    multiplier: 1.5
  },
  {
    id: 'funk_master',
    titleJunior: '6. Funk-Master',
    titlePro: '6. Funk-Master (16tel-Grid)',
    subtitleJunior: 'Der Daft Punk & Bruno Mars Funk-Groove',
    subtitlePro: 'Lineares 16tel-Groove-Netz mit Synkopen',
    defaultBpm: 95,
    subdivisions: 16,
    syllablesJunior: ['TA', '·', '·', '·', 'TI', '·', 'TI', '·', 'TA', '·', '·', '·', 'TI', 'TI', 'TI', '·'],
    syllablesPro: ['1', 'e', '+', 'a', '2', 'e', '+', 'a', '3', 'e', '+', 'a', '4', 'e', '+', 'a'],
    targetPattern: [true, false, false, false, true, false, true, false, true, false, false, false, true, true, true, false],
    badgeJunior: 'Funk-Puls',
    badgePro: '16tel-Funk',
    multiplier: 1.6
  },
  {
    id: 'shuffle',
    titleJunior: '7. Blues & Swing-Mix',
    titlePro: '7. Shuffle & Swing-Triolen',
    subtitleJunior: 'Ternäres Blues-Feeling zum Mitwippen',
    subtitlePro: '12/8 Phrasierung mit Triolen-Akzenten',
    defaultBpm: 75,
    subdivisions: 12,
    syllablesJunior: ['HOPP', '·', 'e', 'HOPP', '·', 'e', 'HOPP', '·', 'e', 'HOPP', '·', 'e'],
    syllablesPro: ['1', '·', 'a', '2', '·', 'a', '3', '·', 'a', '4', '·', 'a'],
    targetPattern: [true, false, true, true, false, true, true, false, true, true, false, true],
    badgeJunior: 'Blues-Swing',
    badgePro: '12/8 Triolen',
    multiplier: 1.6
  },
  {
    id: 'random_groove',
    titleJunior: '8. Random-Groove',
    titlePro: '8. Random-Groove (Beat-Roulette)',
    subtitleJunior: 'Das System würfelt deinen Überraschungs-Groove!',
    subtitlePro: 'Didaktischer Phrasen-Generator (Musikalische 16tel-Bausteine)',
    defaultBpm: 85,
    subdivisions: 16,
    syllablesJunior: ['1', '·', 'e', '+', '2', '·', 'e', '+', '3', '·', 'e', '+', '4', '·', 'e', '+'],
    syllablesPro: ['1', 'e', '+', 'a', '2', 'e', '+', 'a', '3', 'e', '+', 'a', '4', 'e', '+', 'a'],
    targetPattern: [true, false, true, false, true, true, false, false, true, false, false, true, true, false, true, false],
    badgeJunior: 'Roulette',
    badgePro: 'Zufalls-Mix',
    multiplier: 1.8
  }
];

/**
 * 🎲 Didaktischer Phrasen-Würfel für Beat-Roulette:
 * Setzt musikalisch fundierte 4/4-Takte aus bewährten rhythmischen Motiven zusammen
 * (Viertel, Achtel, Synkopen, Galopp, Funk-Hits) – garantiert musikalisch stimmig und groovend!
 */
export function generateMusicalRandomPattern(): { pattern: boolean[]; syllablesJunior: string[]; syllablesPro: string[] } {
  // 4 Viertel-Blöcke (jeweils 4 Sechzehntel = 1 Beat)
  const BEAT_MOTIFS: { pattern: boolean[]; sylJr: string[]; sylPro: string[] }[] = [
    // 1. Viertel Downbeat [1 · · ·]
    { pattern: [true, false, false, false], sylJr: ['TA', '·', '·', '·'], sylPro: ['1', '·', '·', '·'] },
    // 2. Zwei Achtel [1 · + ·]
    { pattern: [true, false, true, false], sylJr: ['TI', '·', 'TI', '·'], sylPro: ['1', '·', '+', '·'] },
    // 3. Galopp vorwärts [1 · e +]
    { pattern: [true, false, true, true], sylJr: ['TI', '·', 'TI', 'RI'], sylPro: ['1', '·', '+', 'a'] },
    // 4. Galopp rückwärts [1 e + ·]
    { pattern: [true, true, true, false], sylJr: ['TI', 'RI', 'TI', '·'], sylPro: ['1', 'e', '+', '·'] },
    // 5. Offbeat Upbeat [· · + ·]
    { pattern: [false, false, true, false], sylJr: ['·', '·', 'UND', '·'], sylPro: ['·', '·', '+', '·'] },
    // 6. 16tel-Viererpack [1 e + a]
    { pattern: [true, true, true, true], sylJr: ['TI', 'RI', 'TI', 'RI'], sylPro: ['1', 'e', '+', 'a'] }
  ];

  const fullPattern: boolean[] = [];
  const fullSylJr: string[] = [];
  const fullSylPro: string[] = [];

  for (let beat = 1; beat <= 4; beat++) {
    // Beat 1 erhält bevorzugt einen erdenden Downbeat (Viertel oder 2 Achtel)
    let selectedMotif;
    if (beat === 1) {
      selectedMotif = Math.random() < 0.6 ? BEAT_MOTIFS[0] : BEAT_MOTIFS[1];
    } else {
      const idx = Math.floor(Math.random() * BEAT_MOTIFS.length);
      selectedMotif = BEAT_MOTIFS[idx];
    }

    fullPattern.push(...selectedMotif.pattern);
    
    // Zählzeiten für Beat 1, 2, 3, 4 anpassen
    const beatSylPro = selectedMotif.sylPro.map(s => (s === '1' ? String(beat) : s));
    fullSylPro.push(...beatSylPro);
    fullSylJr.push(...selectedMotif.sylJr);
  }

  // Sicherstellen, dass mindestens 4 und maximal 10 Hits im Takt sind
  const hitCount = fullPattern.filter(Boolean).length;
  if (hitCount < 4) {
    fullPattern[0] = true;
    fullPattern[4] = true;
    fullPattern[8] = true;
    fullPattern[12] = true;
  }

  return {
    pattern: fullPattern,
    syllablesJunior: fullSylJr,
    syllablesPro: fullSylPro
  };
}

const SOUND_KITS: { id: SoundKitType; label: string }[] = [
  { id: 'acoustic', label: 'Drums' },
  { id: 'body_percussion', label: 'Body Percussion' },
  { id: 'urban_808', label: 'Urban 808' },
  { id: 'latin', label: 'Latin Congas' }
];

export interface LevelTheme {
  id: RhythmLevel;
  primary: string;
  lightBg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  accent: string;
  gradient: string;
  padGlow: string;
  emoji: string;
  animal: string;
  meter: string;
}

export const LEVEL_THEMES: Record<RhythmLevel, LevelTheme> = {
  viertel: {
    id: 'viertel',
    primary: '#f59e0b',
    lightBg: '#fffbeb',
    border: '#fde68a',
    badgeBg: '#fef3c7',
    badgeText: '#b45309',
    accent: '#d97706',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    padGlow: 'rgba(245, 158, 11, 0.35)',
    emoji: '🐻',
    animal: 'Bär',
    meter: 'Viertel'
  },
  rock_mix: {
    id: 'rock_mix',
    primary: '#10b981',
    lightBg: '#ecfdf5',
    border: '#a7f3d0',
    badgeBg: '#d1fae5',
    badgeText: '#065f46',
    accent: '#059669',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    padGlow: 'rgba(16, 185, 129, 0.35)',
    emoji: '🎸',
    animal: 'Rock-Löwe',
    meter: 'Rock-Mix'
  },
  synkopen: {
    id: 'synkopen',
    primary: '#6366f1',
    lightBg: '#eef2ff',
    border: '#c7d2fe',
    badgeBg: '#e0e7ff',
    badgeText: '#3730a3',
    accent: '#4f46e5',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    padGlow: 'rgba(99, 102, 241, 0.35)',
    emoji: '🦘',
    animal: 'Känguru',
    meter: 'Off-Beat'
  },
  galopp: {
    id: 'galopp',
    primary: '#ec4899',
    lightBg: '#fdf2f8',
    border: '#fbcfe8',
    badgeBg: '#fce7f3',
    badgeText: '#9d174d',
    accent: '#db2777',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    padGlow: 'rgba(236, 72, 153, 0.35)',
    emoji: '🐎',
    animal: 'Wildpferd',
    meter: 'Galopp'
  },
  latin_bossa: {
    id: 'latin_bossa',
    primary: '#0ea5e9',
    lightBg: '#f0f9ff',
    border: '#bae6fd',
    badgeBg: '#e0f2fe',
    badgeText: '#0369a1',
    accent: '#0284c7',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    padGlow: 'rgba(14, 165, 233, 0.35)',
    emoji: '☀️',
    animal: 'Salsa-Tukan',
    meter: 'Bossa-Clave'
  },
  funk_master: {
    id: 'funk_master',
    primary: '#8b5cf6',
    lightBg: '#f5f3ff',
    border: '#ddd6fe',
    badgeBg: '#ede9fe',
    badgeText: '#5b21b6',
    accent: '#7c3aed',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    padGlow: 'rgba(139, 92, 246, 0.35)',
    emoji: '⚡',
    animal: 'Funk-Panther',
    meter: '16tel-Grid'
  },
  shuffle: {
    id: 'shuffle',
    primary: '#b45309',
    lightBg: '#fffbeb',
    border: '#fde68a',
    badgeBg: '#fef3c7',
    badgeText: '#78350f',
    accent: '#78350f',
    gradient: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)',
    padGlow: 'rgba(180, 83, 9, 0.35)',
    emoji: '🎷',
    animal: 'Blues-Fuchs',
    meter: 'Swing'
  },
  random_groove: {
    id: 'random_groove',
    primary: '#d97706',
    lightBg: '#fffbeb',
    border: '#fed7aa',
    badgeBg: '#fef3c7',
    badgeText: '#b45309',
    accent: '#b45309',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)',
    padGlow: 'rgba(217, 119, 6, 0.40)',
    emoji: '🎲',
    animal: 'Roulette',
    meter: 'Random'
  }
};

export const GrooveTrainerStudioView: React.FC<GrooveTrainerProps> = ({
  student,
  onClose,
  onRewardXp,
  initialBpm = 85,
  uiLevel = 'teen',
  embedded = false,
  useNotebookLayout = false,
  homeworkNotesList
}) => {
  const [selectedLevel, setSelectedLevel] = useState<RhythmLevel>('viertel');
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('call_response');
  const [soundKit, setSoundKit] = useState<SoundKitType>('acoustic');
  const [bpm, setBpm] = useState<number>(initialBpm);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBassEnabled, setIsBassEnabled] = useState<boolean>(true);
  const [isProMode, setIsProMode] = useState<boolean>(false);
  const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState<boolean>(false);

  // Persistent Student XP & Session Vault Accumulator (Synchronized with Ground Truth)
  const [studentBaseXp, setStudentBaseXp] = useState<number>(() => {
    // 1. Primär: Autoritative Server-Werte des Schülers
    const dbXp = student?.campus_xp ?? student?.xp;
    if (typeof dbXp === 'number' && dbXp > 0) return dbXp;

    if (typeof window !== 'undefined' && student?.id) {
      try {
        const off = JSON.parse(localStorage.getItem(`cg_offline_stats_${student.id}`) || 'null');
        if (typeof off?.current_xp === 'number') return off.current_xp;
        const offPractice = JSON.parse(localStorage.getItem(`cg_offline_practice_${student.id}`) || 'null');
        if (typeof offPractice?.xp === 'number') return offPractice.xp;
      } catch (_) {}
    }
    return typeof dbXp === 'number' ? dbXp : 0;
  });
  const [sessionAccumulatedXp, setSessionAccumulatedXp] = useState<number>(0);

  // Sync studentBaseXp when student profile or avatar updates
  useEffect(() => {
    if (!student?.id) return;
    const fetchLatestXp = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('campus_xp, xp')
          .eq('id', student.id)
          .single();
        if (data) {
          const actualXp = data.campus_xp ?? data.xp ?? 0;
          setStudentBaseXp(actualXp);
          localStorage.setItem(`campus_bonus_xp_${student.id}`, String(actualXp));
        }
      } catch (_) {}
    };
    fetchLatestXp();
  }, [student?.id, student?.campus_xp, student?.xp]);

  // 🛡️ Forensic Session Stopwatch & Commit State Tracking
  const sessionActiveSecondsRef = useRef<number>(0);
  const sessionAccumulatedXpRef = useRef<number>(0);
  const hasCommittedRef = useRef<boolean>(false);

  // Keep ref synchronized with state for leak-free unmount flush
  useEffect(() => {
    sessionAccumulatedXpRef.current = sessionAccumulatedXp;
  }, [sessionAccumulatedXp]);

  // Active playing stopwatch: increments each second audio playback is active
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        sessionActiveSecondsRef.current += 1;
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying]);

  // Source of calibration detection
  const [calibrationSource, setCalibrationSource] = useState<'trainer' | 'loopstation' | 'bluetooth' | 'default'>('default');

  // Hardware Latency Calibration state (in milliseconds) with Loopstation Sync Cascade
  const [latencyOffsetMs, setLatencyOffsetMs] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const trainerStored = localStorage.getItem('campus_timing_latency_offset');
      if (trainerStored !== null) {
        const val = Number(trainerStored);
        if (!isNaN(val) && val >= -100 && val <= 250) return val;
      }

      const loopstationStored = localStorage.getItem('groovelab_latency_offset');
      if (loopstationStored !== null) {
        const val = Number(loopstationStored);
        if (!isNaN(val) && val >= -100 && val <= 250) return val;
      }

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('groovelab_latency_dev_')) {
          const val = Number(localStorage.getItem(k));
          if (!isNaN(val) && val >= -100 && val <= 250) return val;
        }
      }
    }
    // 🎧 Zero-Touch Endgeräte-Erkennung: macOS (70ms), iOS (60ms), Android (105ms), Windows (95ms)
    return getOptimalDeviceLatency(null);
  });

  const [isBluetoothDetected, setIsBluetoothDetected] = useState<boolean>(false);
  const [showCalibrationModal, setShowCalibrationModal] = useState<boolean>(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState<boolean>(false);

  // 4-Tap Quick Calibration Wizard State
  const [is4TapWizardActive, setIs4TapWizardActive] = useState<boolean>(false);
  const [wizardTapCount, setWizardTapCount] = useState<number>(0);
  const [wizardMeasuredOffsets, setWizardMeasuredOffsets] = useState<number[]>([]);
  const [wizardSuccessMessage, setWizardSuccessMessage] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const playbackStartTimeRef = useRef<number>(0);
  const nextBeatTimeRef = useRef<number>(0);
  const currentStepRef = useRef<number>(0);
  const barCountRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const completionCooldownRef = useRef<number>(0);
  const autoOffsetBufferRef = useRef<number[]>([]);

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [anticipatingStep, setAnticipatingStep] = useState<number | null>(null);
  const [currentBar, setCurrentBar] = useState<number>(0);
  const [isCallPhase, setIsCallPhase] = useState<boolean>(true);
  const [isDisappeared, setIsDisappeared] = useState<boolean>(false);
  
  const [timingOffsetMs, setTimingOffsetMs] = useState<number | null>(null);
  const [isCenterAuraPulse, setIsCenterAuraPulse] = useState<boolean>(false);
  const [lastRating, setLastRating] = useState<'pocket' | 'good' | 'rush' | 'drag' | 'miss' | null>(null);
  const [pocketStreak, setPocketStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [totalHits, setTotalHits] = useState<number>(0);
  const [scoreSum, setScoreSum] = useState<number>(0);
  const [perfectHits, setPerfectHits] = useState<number>(0);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [awardedRoundXp, setAwardedRoundXp] = useState<number>(0);
  const [isPadPressed, setIsPadPressed] = useState<boolean>(false);

  // Hit History Record for Post-Session Scatter Density Plot
  const [sessionHits, setSessionHits] = useState<HitRecord[]>([]);

  const [isCountingIn, setIsCountingIn] = useState<boolean>(false);
  const [countInBeat, setCountInBeat] = useState<number>(0);
  const countInTimerRef = useRef<any>(null);
  const [latestFinishedScore, setLatestFinishedScore] = useState<{ level: RhythmLevel; accuracy: number; streak: number; bpm: number; score?: number } | null>(null);
  const [mobileActivePane, setMobileActivePane] = useState<'trainer' | 'leaderboard'>('trainer');

  // 🎲 Dynamischer Beat-Roulette State für 'random_groove'
  const [dynamicRandomData, setDynamicRandomData] = useState(() => generateMusicalRandomPattern());
  const [radarLevelUpCelebration, setRadarLevelUpCelebration] = useState<{ newLevel: number; title: string } | null>(null);

  const rollNewRandomGroove = useCallback(() => {
    setDynamicRandomData(generateMusicalRandomPattern());
  }, []);

  const activeLevelConfig = RHYTHM_LEVELS.find(l => l.id === selectedLevel) || RHYTHM_LEVELS[0];
  const currentTheme = LEVEL_THEMES[selectedLevel] || LEVEL_THEMES.viertel;

  const isJunior = uiLevel === 'junior';
  const activeTitle = isJunior ? activeLevelConfig.titleJunior : activeLevelConfig.titlePro;
  const activeSubtitle = isJunior ? activeLevelConfig.subtitleJunior : activeLevelConfig.subtitlePro;
  
  const activeSyllables = selectedLevel === 'random_groove' 
    ? (isJunior ? dynamicRandomData.syllablesJunior : dynamicRandomData.syllablesPro)
    : (isJunior ? activeLevelConfig.syllablesJunior : activeLevelConfig.syllablesPro);

  const activeTargetPattern = selectedLevel === 'random_groove'
    ? dynamicRandomData.pattern
    : activeLevelConfig.targetPattern;

  const activeBadge = isJunior ? activeLevelConfig.badgeJunior : activeLevelConfig.badgePro;

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Hardware Latency Auto-Detection & Loopstation/Platform Sync
  useEffect(() => {
    let isMounted = true;
    const initHardwareLatency = async () => {
      try {
        const ctx = getAudioContext();
        const detectedInfo = detectDeviceLatencyInfo(ctx);
        if (detectedInfo.isBluetoothSuspected && isMounted) {
          setIsBluetoothDetected(true);
        }

        const { hash } = await getAudioDeviceFingerprint(ctx?.sampleRate || 44100);
        const savedDeviceOffset = getDeviceLatency(hash);

        if (savedDeviceOffset !== null && isMounted) {
          setLatencyOffsetMs(savedDeviceOffset);
          setCalibrationSource('loopstation');
        } else if (isMounted) {
          setLatencyOffsetMs(detectedInfo.baselineLatencyMs);
          setCalibrationSource(detectedInfo.isBluetoothSuspected ? 'bluetooth' : 'trainer');
        }
      } catch (_) {}
    };
    initHardwareLatency();
    return () => { isMounted = false; };
  }, [getAudioContext]);

  // Multi-Kit Sound Synthesizer
  const playDrumSound = useCallback((type: 'kick' | 'snare' | 'hihat' | 'click', time: number, accent: boolean = false) => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      if (soundKit === 'acoustic') {
        if (type === 'kick') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(accent ? 150 : 120, time);
          osc.frequency.exponentialRampToValueAtTime(36, time + 0.13);
          gain.gain.setValueAtTime(0.95, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.16);
        } else if (type === 'snare') {
          const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * 0.13));
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 900;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(accent ? 0.78 : 0.55, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(time);
          noise.stop(time + 0.13);
        } else if (type === 'hihat') {
          const osc = ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.setValueAtTime(8400, time);
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 7600;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(accent ? 0.38 : 0.20, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.05);
        } else {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(accent ? 1760 : 880, time);
          gain.gain.setValueAtTime(accent ? 0.65 : 0.4, time);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.035);
        }
      } else if (soundKit === 'body_percussion') {
        if (type === 'kick') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(95, time);
          osc.frequency.exponentialRampToValueAtTime(28, time + 0.14);
          gain.gain.setValueAtTime(0.9, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.16);
        } else if (type === 'snare') {
          const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * 0.09));
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 1400;
          filter.Q.value = 2.5;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(accent ? 0.85 : 0.6, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(time);
          noise.stop(time + 0.09);
        } else if (type === 'hihat') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(2500, time);
          gain.gain.setValueAtTime(0.35, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.03);
        } else {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, time);
          gain.gain.setValueAtTime(0.5, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.035);
        }
      } else if (soundKit === 'urban_808') {
        if (type === 'kick') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(accent ? 130 : 100, time);
          osc.frequency.exponentialRampToValueAtTime(38, time + 0.24);
          gain.gain.setValueAtTime(1.0, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.26);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.28);
        } else if (type === 'snare') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(280, time);
          gain.gain.setValueAtTime(0.7, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.09);
        } else if (type === 'hihat') {
          const osc = ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.setValueAtTime(9500, time);
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 8500;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.3, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.03);
        } else {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, time);
          gain.gain.setValueAtTime(0.5, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.035);
        }
      } else {
        if (type === 'kick') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(180, time);
          osc.frequency.exponentialRampToValueAtTime(90, time + 0.16);
          gain.gain.setValueAtTime(0.85, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.2);
        } else if (type === 'snare') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(460, time);
          osc.frequency.exponentialRampToValueAtTime(210, time + 0.09);
          gain.gain.setValueAtTime(0.8, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.11);
        } else if (type === 'hihat') {
          const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * 0.05));
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 5200;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.3, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(time);
          noise.stop(time + 0.05);
        } else {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, time);
          gain.gain.setValueAtTime(0.5, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.035);
        }
      }
    } catch (_) {}
  }, [getAudioContext, isMuted, soundKit]);

  // Groovy Synthesized Bassline (Play-Along Companion)
  const playBassNote = useCallback((pitchHz: number, time: number, duration: number = 0.2) => {
    if (isMuted || !isBassEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(pitchHz, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, time);
      filter.frequency.exponentialRampToValueAtTime(220, time + duration);
      filter.Q.value = 4.0;

      gain.gain.setValueAtTime(0.32, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + duration + 0.05);
    } catch (_) {}
  }, [getAudioContext, isBassEnabled, isMuted]);

  // Round completion: Accumulate into Session Vault & engage 1.2s restart protection cooldown
  const handleFinishSession = useCallback(() => {
    isRunningRef.current = false;
    setIsPlaying(false);
    setIsCountingIn(false);
    setSessionCompleted(true);
    completionCooldownRef.current = Date.now() + 1200; // 🛡️ 1.2s Cooldown-Schutz vor Reflex-Taps
    
    const accuracy = totalHits > 0 ? Math.round(scoreSum / totalHits) : 0;
    
    // 1. Stufen-Basis nach Genauigkeit
    let baseRoundXp = accuracy >= 90 ? 50 : (accuracy >= 75 ? 35 : (accuracy >= 50 ? 20 : 5));

    // 2. Makelloser Pocket-Streak Bonus (+10 XP bei hoher Trefferserie)
    const streakBonus = (bestStreak >= 10 && totalHits >= 10) ? 10 : 0;

    // 3. Gestaffelter Schwierigkeits-Multiplikator
    const multiplier = activeLevelConfig.multiplier || 1.0;
    const rawEarned = Math.round((baseRoundXp + streakBonus) * multiplier);

    // 4. Fresh Energy Soft-Cap (max 200 XP/Tag voll, danach degressiv 20% Ausdauer-XP)
    let finalEarned = rawEarned;
    if (typeof localStorage !== 'undefined') {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const studentKey = student?.id ? student.id : 'anon';
        const dailyKey = `campus_gt_daily_xp_${studentKey}_${todayStr}`;
        const currentDaily = Number(localStorage.getItem(dailyKey) || 0);

        if (currentDaily >= 200) {
          finalEarned = Math.max(5, Math.round(rawEarned * 0.20));
        } else if (currentDaily + rawEarned > 200) {
          const fullPart = 200 - currentDaily;
          const degressedPart = Math.round((rawEarned - fullPart) * 0.20);
          finalEarned = fullPart + Math.max(2, degressedPart);
        }
        localStorage.setItem(dailyKey, String(currentDaily + finalEarned));
      } catch (_) {}
    }

    setAwardedRoundXp(finalEarned);
    setSessionAccumulatedXp(prev => prev + finalEarned);

    // 5. Sekundengenaue Übezeit (mindestens die tatsächliche Songlänge in Sekunden)
    const expectedSongDurationSec = Math.round((16 * 4 * 60) / bpm);
    sessionActiveSecondsRef.current = Math.max(sessionActiveSecondsRef.current, expectedSongDurationSec);

    // 6. Speed-Weighted Groove-Score (Goldstandard Tempo-Einberechnung)
    const baseBpm = activeLevelConfig.defaultBpm || 85;
    const speedWeightedScore = Math.round(accuracy * (bpm / baseBpm) * multiplier);

    // 7. Leaderboard PR Synchronisation & Backend-Persistenz
    setLatestFinishedScore({
      level: selectedLevel,
      score: speedWeightedScore,
      accuracy,
      streak: bestStreak,
      bpm
    });

    // 8. 🎯 Pädagogischer Goldstandard: Autonomer Radar-Aufstieg (Säule Rhythmus)
    if (student?.id && accuracy >= 75) {
      (async () => {
        try {
          // Lade aktuelle Radar-Stufen des Schülers
          const currentRadar = (student?.skill_radar_levels && typeof student.skill_radar_levels === 'object')
            ? student.skill_radar_levels
            : JSON.parse(localStorage.getItem(`groovelab_skill_overrides_${student.id}`) || '{}');

          const currentRhythmusLevel = Number(currentRadar.rhythmus || 1);

          // Lade alle bisherigen Scores des Schülers
          const { data: userScores } = await supabase
            .from('student_groove_scores')
            .select('level, accuracy, max_streak')
            .eq('user_id', student.id);

          const scoresList = Array.isArray(userScores) ? userScores : [];
          // Aktuellen Score mit einbeziehen
          const existingScoreIdx = scoresList.findIndex(s => s.level === selectedLevel);
          if (existingScoreIdx >= 0) {
            scoresList[existingScoreIdx].accuracy = Math.max(scoresList[existingScoreIdx].accuracy, accuracy);
            scoresList[existingScoreIdx].max_streak = Math.max(scoresList[existingScoreIdx].max_streak, bestStreak);
          } else {
            scoresList.push({ level: selectedLevel, accuracy, max_streak: bestStreak });
          }

          // Kumulierte Übezeit (inklusive aktueller Session)
          const totalGrooveSecs = Number(localStorage.getItem(`cg_total_groove_seconds_${student.id}`) || 0) + expectedSongDurationSec;
          localStorage.setItem(`cg_total_groove_seconds_${student.id}`, String(totalGrooveSecs));
          const totalGrooveMins = Math.round(totalGrooveSecs / 60);

          const highAccuracyLevels = scoresList.filter(s => s.accuracy >= 80);
          const topAccuracyLevels = scoresList.filter(s => s.accuracy >= 85);
          const maxAnyStreak = Math.max(...scoresList.map(s => s.max_streak || 0), bestStreak);

          let targetPromotionLevel = currentRhythmusLevel;

          // Kriterien Stufe 3 (Puls-Entdecker): >=60 Min Übezeit, >=6 Stufen >=85%, Streak >=12
          if (currentRhythmusLevel < 3 && totalGrooveMins >= 60 && topAccuracyLevels.length >= 6 && maxAnyStreak >= 12) {
            targetPromotionLevel = 3;
          }
          // Kriterien Stufe 2 (Rhythmus-Aufbau): >=20 Min Übezeit, >=3 Stufen >=80%, Streak >=8
          else if (currentRhythmusLevel < 2 && totalGrooveMins >= 20 && highAccuracyLevels.length >= 3 && maxAnyStreak >= 8) {
            targetPromotionLevel = 2;
          }

          if (targetPromotionLevel > currentRhythmusLevel) {
            const levelTitles: Record<number, string> = {
              2: 'Rhythmus-Aufbau',
              3: 'Puls-Entdecker'
            };
            const promotionTitle = levelTitles[targetPromotionLevel] || 'Puls-Entdecker';

            const updatedRadar = {
              ...currentRadar,
              rhythmus: targetPromotionLevel
            };

            // 1. Lokale Speicherung
            localStorage.setItem(`groovelab_skill_overrides_${student.id}`, JSON.stringify(updatedRadar));

            // 2. Datenbank Update
            await supabase.from('users').update({
              skill_radar_levels: updatedRadar
            }).eq('id', student.id);

            // 3. Event an die Plattform feuern (Briefing-Board, Meisterwerk-Dokumentation)
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('skill_radar_levels_changed', {
                detail: { studentId: student.id, skillKey: 'rhythmus', newLevel: targetPromotionLevel }
              }));
            }

            // 4. Feier-Modal mit goldenem Banner aktivieren
            setRadarLevelUpCelebration({
              newLevel: targetPromotionLevel,
              title: promotionTitle
            });
          }
        } catch (err) {
          console.warn('[GrooveTrainer] Skill radar evaluation error:', err);
        }
      })();
    }

    // ⚡ Revisionssichere Sofort-Synchronisation: Jede erfolgreich abgeschlossene Runde sofort persistent committen
    if (student?.id && finalEarned > 0) {
      const nowIso = new Date().toISOString();
      const minutesToAdd = Math.max(1, Math.round(expectedSongDurationSec / 60));
      (async () => {
        try {
          // 1. Lokaler Fokus-Log Cache
          const localFokusKey = `cg_local_fokus_logs_${student.id}`;
          const existingLocalLogs = JSON.parse(localStorage.getItem(localFokusKey) || '[]');
          const newFokusLog = {
            id: 'groove_' + Date.now(),
            user_id: student.id,
            student_id: student.id,
            duration_minutes: minutesToAdd,
            duration_seconds: expectedSongDurationSec,
            xp_earned: finalEarned,
            is_extra: false,
            created_at: nowIso
          };
          localStorage.setItem(localFokusKey, JSON.stringify([newFokusLog, ...existingLocalLogs]));

          // 2. Insert in public.fokus_logs
          await supabase.from('fokus_logs').insert({
            user_id: student.id,
            student_id: student.id,
            duration_minutes: minutesToAdd,
            duration_seconds: expectedSongDurationSec,
            xp_earned: finalEarned,
            is_extra: false,
            created_at: nowIso
          });

          // 3. Update users table (campus_xp & xp)
          const { data: userProfile } = await supabase
            .from('users')
            .select('campus_xp, xp')
            .eq('id', student.id)
            .single();
          const currentCampusXp = (userProfile?.campus_xp || userProfile?.xp || 0) + finalEarned;
          await supabase
            .from('users')
            .update({
              campus_xp: currentCampusXp,
              xp: currentCampusXp,
              updated_at: nowIso
            })
            .eq('id', student.id);

          // 4. Update avatars table
          try {
            await supabase
              .from('avatars')
              .update({
                xp: currentCampusXp,
                updated_at: nowIso
              })
              .or(`user_id.eq.${student.id},student_id.eq.${student.id}`);
          } catch (_) {}

          // 5. Update student_stats table
          try {
            const { data: statsRecord } = await supabase
              .from('student_stats')
              .select('current_xp, total_focus_minutes')
              .eq('student_id', student.id)
              .maybeSingle();
            const currentStatsXp = (statsRecord?.current_xp || 0) + finalEarned;
            const currentFocusMins = (statsRecord?.total_focus_minutes || 0) + minutesToAdd;
            await supabase
              .from('student_stats')
              .upsert({
                student_id: student.id,
                current_xp: currentStatsXp,
                total_focus_minutes: currentFocusMins,
                updated_at: nowIso
              }, { onConflict: 'student_id' });
          } catch (_) {}

          // 6. Update students practice_minutes_today
          const { data } = await supabase
            .from('students')
            .select('practice_minutes_today')
            .eq('id', student.id)
            .single();
          const currentMins = data?.practice_minutes_today || 0;
          await supabase
            .from('students')
            .update({
              practice_minutes_today: currentMins + minutesToAdd,
              last_practice_date: nowIso
            })
            .eq('id', student.id);

          // Local storage Key synchronisieren
          localStorage.setItem(`campus_bonus_xp_${student.id}`, String(currentCampusXp));
        } catch (err) {
          console.warn('[GrooveTrainer] Instant round commit note:', err);
        }
      })();

      if (onRewardXp) {
        onRewardXp(finalEarned, expectedSongDurationSec);
      }

      // Event für Briefing-Board & Header
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus-xp-awarded', {
          detail: { studentId: student.id, amount: finalEarned, reason: 'Groove-Trainer gemeistert' }
        }));
        window.dispatchEvent(new CustomEvent('campus-fokus-log-saved', {
          detail: { studentId: student.id, minutes: minutesToAdd, seconds: expectedSongDurationSec }
        }));
      }
    }
  }, [activeLevelConfig.defaultBpm, activeLevelConfig.multiplier, bestStreak, bpm, onRewardXp, scoreSum, selectedLevel, student?.id, student?.instrument, totalHits]);

  // Centralized Atomic Session Commit: Syncs XP and Practice Time to DB and Parent Callbacks
  const commitSessionData = useCallback(() => {
    if (hasCommittedRef.current) return;
    const xpToCommit = sessionAccumulatedXpRef.current;
    const secondsToCommit = sessionActiveSecondsRef.current;

    // Only commit if at least some XP or practice seconds were accumulated
    if (xpToCommit <= 0 && secondsToCommit < 5) return;
    hasCommittedRef.current = true;

    if (student?.id) {
      const key = `campus_bonus_xp_${student.id}`;
      const current = Number(localStorage.getItem(key) || 0);
      const updated = current + xpToCommit;
      localStorage.setItem(key, String(updated));
      setStudentBaseXp(prev => prev + xpToCommit);

      // Persist practice minutes to Supabase & Briefing Board KPIs
      const minutesToAdd = Math.max(1, Math.round(secondsToCommit / 60));
      (async () => {
        try {
          const nowIso = new Date().toISOString();

          // 1. Lokaler Fokus-Log Cache für sofortiges Reaktiv-Update im Briefing-Dashboard
          const localFokusKey = `cg_local_fokus_logs_${student.id}`;
          const existingLocalLogs = JSON.parse(localStorage.getItem(localFokusKey) || '[]');
          const newFokusLog = {
            id: 'groove_' + Date.now(),
            user_id: student.id,
            student_id: student.id,
            duration_minutes: minutesToAdd,
            duration_seconds: secondsToCommit,
            xp_earned: xpToCommit,
            is_extra: false,
            created_at: nowIso
          };
          localStorage.setItem(localFokusKey, JSON.stringify([newFokusLog, ...existingLocalLogs]));

          // 2. Insert in public.fokus_logs für persistente Archivierung (mit explizitem xp_earned)
          await supabase.from('fokus_logs').insert({
            user_id: student.id,
            student_id: student.id,
            duration_minutes: minutesToAdd,
            duration_seconds: secondsToCommit,
            xp_earned: xpToCommit,
            is_extra: false,
            created_at: nowIso
          });

          // 3. Update users table (campus_xp & xp)
          const { data: userProfile } = await supabase
            .from('users')
            .select('campus_xp, xp')
            .eq('id', student.id)
            .single();
          const currentCampusXp = (userProfile?.campus_xp || userProfile?.xp || 0) + xpToCommit;
          await supabase
            .from('users')
            .update({
              campus_xp: currentCampusXp,
              xp: currentCampusXp,
              updated_at: nowIso
            })
            .eq('id', student.id);

          // 4. Update avatars table
          try {
            await supabase
              .from('avatars')
              .update({
                xp: currentCampusXp,
                updated_at: nowIso
              })
              .or(`user_id.eq.${student.id},student_id.eq.${student.id}`);
          } catch (_) {}

          // 5. Update student_stats table
          try {
            const { data: statsRecord } = await supabase
              .from('student_stats')
              .select('current_xp, total_focus_minutes')
              .eq('student_id', student.id)
              .maybeSingle();
            const currentStatsXp = (statsRecord?.current_xp || 0) + xpToCommit;
            const currentFocusMins = (statsRecord?.total_focus_minutes || 0) + minutesToAdd;
            await supabase
              .from('student_stats')
              .upsert({
                student_id: student.id,
                current_xp: currentStatsXp,
                total_focus_minutes: currentFocusMins,
                updated_at: nowIso
              }, { onConflict: 'student_id' });
          } catch (_) {}

          // 6. Update students practice_minutes_today
          const { data } = await supabase
            .from('students')
            .select('practice_minutes_today')
            .eq('id', student.id)
            .single();
          const currentMins = data?.practice_minutes_today || 0;
          await supabase
            .from('students')
            .update({
              practice_minutes_today: currentMins + minutesToAdd,
              last_practice_date: nowIso
            })
            .eq('id', student.id);
        } catch (err) {
          console.warn('[GrooveTrainer] Practice minutes & XP sync note:', err);
        }
      })();
    }

    if (onRewardXp) {
      onRewardXp(xpToCommit, secondsToCommit);
    }

    // Broadcast standardized events across the entire platform for Briefing Board KPI live sync
    if (typeof window !== 'undefined' && student?.id) {
      window.dispatchEvent(new CustomEvent('campus-xp-awarded', {
        detail: { studentId: student.id, amount: xpToCommit, reason: 'Groove-Trainer gemeistert' }
      }));
      window.dispatchEvent(new CustomEvent('campus-fokus-log-saved', {
        detail: { studentId: student.id, minutes: Math.max(1, Math.round(secondsToCommit / 60)), seconds: secondsToCommit }
      }));
    }
  }, [onRewardXp, student?.id]);

  // Safe Exit with Atomic Batch Commit to persistent storage
  const handleSafeClose = useCallback(() => {
    commitSessionData();
    if (onClose) {
      onClose();
    }
  }, [commitSessionData, onClose]);

  // 🛡️ Fail-Safe Auto-Commit on Unmount (e.g. modal closed via outer button or tab switch)
  useEffect(() => {
    return () => {
      commitSessionData();
    };
  }, [commitSessionData]);

  // Audio Scheduler Loop
  const scheduleAudioEvents = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx || !isRunningRef.current) return;

    const scheduleAheadTime = 0.15;
    const subCount = activeLevelConfig.subdivisions;
    const secondsPerSub = (60 / bpm) / (subCount / 4);

    while (nextBeatTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      const scheduledTime = nextBeatTimeRef.current;
      const stepIdx = currentStepRef.current;
      const barIdx = barCountRef.current;

      let isCall = false;
      let shouldMuteLeadDrums = false;
      let shouldMuteAllAudio = false;

      if (trainingMode === 'call_response') {
        isCall = (barIdx % 4) < 2;
        shouldMuteLeadDrums = !isCall;
      } else if (trainingMode === 'disappearing_beat') {
        const barInCycle = barIdx % 4;
        shouldMuteAllAudio = barInCycle === 2 || barInCycle === 3;
      }

      if (!shouldMuteAllAudio) {
        const isAccent = stepIdx === 0;

        const isTarget = activeTargetPattern[stepIdx];
        if (isTarget) {
          if (!shouldMuteLeadDrums) {
            // Downbeat on 1 is kick, other targets use snare / high accent
            const isDownbeatOne = stepIdx === 0;
            const isBackbeat = (activeLevelConfig.subdivisions === 4 && stepIdx === 2) ||
                               (activeLevelConfig.subdivisions === 8 && (stepIdx === 2 || stepIdx === 4 || stepIdx === 6)) ||
                               (activeLevelConfig.subdivisions === 16 && (stepIdx === 4 || stepIdx === 8 || stepIdx === 12)) ||
                               (activeLevelConfig.subdivisions === 12 && (stepIdx === 3 || stepIdx === 6 || stepIdx === 9));
            playDrumSound(isDownbeatOne ? 'kick' : (isBackbeat ? 'snare' : 'kick'), scheduledTime, isAccent);
          } else {
            playDrumSound('hihat', scheduledTime, false);
          }
        } else {
          // Offbeat / subdivision filler pulse
          playDrumSound('hihat', scheduledTime, false);
        }

        if (isBassEnabled && stepIdx === 0) {
          const rootFreq = (barIdx % 2 === 0) ? 65.41 : 77.78;
          playBassNote(rootFreq, scheduledTime, 0.28);
        }
      }

      // Visual Anticipation Pulse: 120ms before actual beat
      const anticipationDelayMs = Math.max(0, (scheduledTime - ctx.currentTime - 0.12) * 1000);
      setTimeout(() => {
        if (!isRunningRef.current) return;
        setAnticipatingStep(stepIdx);
      }, anticipationDelayMs);

      // Main Step State Synchronizer
      const delayMs = Math.max(0, (scheduledTime - ctx.currentTime) * 1000);
      setTimeout(() => {
        if (!isRunningRef.current) return;
        setCurrentStep(stepIdx);
        setAnticipatingStep(null);
        setCurrentBar(barIdx);
        setIsCallPhase(isCall);
        setIsDisappeared(shouldMuteAllAudio);
      }, delayMs);

      nextBeatTimeRef.current += secondsPerSub;
      currentStepRef.current = (stepIdx + 1) % subCount;
      if (currentStepRef.current === 0) {
        barCountRef.current += 1;
        // 🎲 Im Random-Modus alle 4 Takte einen neuen Überraschungs-Groove anwürfeln
        if (selectedLevel === 'random_groove' && barCountRef.current % 4 === 0 && barCountRef.current < 16) {
          rollNewRandomGroove();
        }
        if (barCountRef.current >= 16) {
          setTimeout(() => handleFinishSession(), 600);
        }
      }
    }
  }, [activeLevelConfig, activeTargetPattern, bpm, getAudioContext, handleFinishSession, isBassEnabled, playBassNote, playDrumSound, rollNewRandomGroove, selectedLevel, trainingMode]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(scheduleAudioEvents, 25);
    timerIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [isPlaying, scheduleAudioEvents]);

  const startActualPlayback = useCallback((anchorTime?: number) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    isRunningRef.current = true;
    // 🛡️ PWA / Mobile Fix: Verhindere Vergangenheits-Anchors durch setTimeout-Jitter auf Mobilgeräten!
    // Liegt anchorTime hinter ctx.currentTime, schützt safeAnchor vor einem 16-Takt-Instant-Flush.
    const safeAnchor = Math.max(ctx.currentTime + 0.05, anchorTime || (ctx.currentTime + 0.08));
    playbackStartTimeRef.current = safeAnchor;
    nextBeatTimeRef.current = safeAnchor;
    currentStepRef.current = 0;
    barCountRef.current = 0;
    setPocketStreak(0);
    setTotalHits(0);
    setScoreSum(0);
    setPerfectHits(0);
    setSessionHits([]);
    autoOffsetBufferRef.current = [];
    setSessionCompleted(false);
    setTimingOffsetMs(null);
    setLastRating(null);
    setIsCountingIn(false);
    setIsPlaying(true);
  }, [getAudioContext]);

  const startCountIn = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    isRunningRef.current = true;
    setIsCountingIn(true);
    setCountInBeat(1);
    setSessionCompleted(false);
    setTimingOffsetMs(null);
    setLastRating(null);

    const secPerBeat = 60 / bpm;
    const startTime = ctx.currentTime + 0.05;

    // Schedule 4 count-in clicks
    for (let b = 0; b < 4; b++) {
      const beatTime = startTime + b * secPerBeat;
      playDrumSound('click', beatTime, b === 0);
      setTimeout(() => {
        if (!isRunningRef.current) return;
        setCountInBeat(b + 1);
      }, Math.max(0, (beatTime - ctx.currentTime) * 1000));
    }

    countInTimerRef.current = setTimeout(() => {
      if (!isRunningRef.current) return;
      startActualPlayback(startTime + 4 * secPerBeat);
    }, 4 * secPerBeat * 1000);
  }, [bpm, getAudioContext, playDrumSound, startActualPlayback]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying || isCountingIn) {
      isRunningRef.current = false;
      if (countInTimerRef.current) {
        clearTimeout(countInTimerRef.current);
        countInTimerRef.current = null;
      }
      setIsCountingIn(false);
      setIsPlaying(false);
      setCurrentStep(0);
      setAnticipatingStep(null);
      setTimingOffsetMs(null);
      setLastRating(null);
    } else {
      startCountIn();
    }
  }, [isCountingIn, isPlaying, startCountIn]);

  /**
   * High-Precision Musician Quantization Tap Handler
   */
  const handleUserTap = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // 🛡️ PWA / Mobile Fix: Wenn der Einzähler läuft, darf ein Tap den Trainer NIEMALS abbrechen!
    // Schüler tippen im Vorzähler oft mit oder antizipieren Schlag 1. Wir geben taktiles & auditives
    // Feedback, brechen den Einzähler aber keinesfalls ab!
    if (isCountingIn) {
      playDrumSound('snare', ctx.currentTime, false);
      setIsPadPressed(true);
      setTimeout(() => setIsPadPressed(false), 80);
      return;
    }

    // 🎯 Unblocked Start: Wenn das Spiel nicht läuft (z.B. nach Rundenende),
    // startet ein Tap SOFORT eine neue Runde mit Einzähler 1-2-3-4!
    if (!isPlaying) {
      setSessionCompleted(false);
      setShowCelebrationModal(false);
      handleTogglePlay();
      return;
    }

    // 🛡️ Wenn während des Spiels der 1.2s Cooldown aktiv ist -> ignorieren
    if (Date.now() < completionCooldownRef.current) {
      return;
    }

    const now = ctx.currentTime;

    // 🛡️ Guard 3: Im Call-&-Response-Modus in der Vorspiel-Phase („HÖR GUT ZU!“) keine Fehlschläge werten
    if (trainingMode === 'call_response' && isCallPhase) {
      // Nur akustischen Feedback-Sound spielen, aber keine Wertung oder Streak-Zerstörung!
      playDrumSound('snare', now, false);
      setIsPadPressed(true);
      setTimeout(() => setIsPadPressed(false), 100);
      return;
    }

    const subCount = activeLevelConfig.subdivisions;
    const secondsPerSub = (60 / bpm) / (subCount / 4);
    
    // Latency compensated tap timestamp
    const latencySec = latencyOffsetMs / 1000;
    const effectiveTapTime = now - latencySec;
    const elapsedSinceStart = effectiveTapTime - playbackStartTimeRef.current;

    if (elapsedSinceStart < -0.1) return;

    // Mathematical Quantizer
    const nearestStepIndex = Math.max(0, Math.round(elapsedSinceStart / secondsPerSub));
    const targetTime = playbackStartTimeRef.current + (nearestStepIndex * secondsPerSub);
    const rawDiffSec = effectiveTapTime - targetTime;
    const rawDiffMs = Math.round(rawDiffSec * 1000);

    // 🎯 Tier-1 SaaS Enterprise+ Auto-Centering Engine (Rolling Hardware Offset)
    // Wenn der Nutzer sehr gleichmäßig spielt, aber ein konstanter Hardware-Versatz vorliegt,
    // ermitteln die ersten 3-5 Schläge den konstanten Versatz und kompensieren ihn unbemerkt.
    if (autoOffsetBufferRef.current.length < 5 && Math.abs(rawDiffMs) < 180) {
      autoOffsetBufferRef.current.push(rawDiffMs);
      if (autoOffsetBufferRef.current.length >= 3) {
        const sorted = [...autoOffsetBufferRef.current].sort((a, b) => a - b);
        const medianOffset = sorted[Math.floor(sorted.length / 2)];
        // Wenn ein signifikanter Hardware-Trend (> 12ms) vorliegt, adaptieren:
        if (Math.abs(medianOffset) >= 12) {
          const adaptiveCorrection = Math.round(medianOffset * 0.75);
          const newOffset = Math.max(0, Math.min(250, latencyOffsetMs + adaptiveCorrection));
          setLatencyOffsetMs(newOffset);
          try {
            localStorage.setItem('campus_timing_latency_offset', String(newOffset));
          } catch (_) {}
        }
      }
    }

    const diffMs = rawDiffMs;
    setTimingOffsetMs(diffMs);
    setTotalHits(prev => prev + 1);

    // Smart Adaptive Instrument Mapping on Tap
    const stepInPattern = nearestStepIndex % subCount;
    let hitSoundType: 'kick' | 'snare' | 'hihat' | 'click' = 'snare';
    let isHitAccent = false;

    const isTarget = activeTargetPattern[stepInPattern];
    if (isTarget) {
      if (stepInPattern === 0) {
        hitSoundType = 'kick';
        isHitAccent = true;
      } else {
        hitSoundType = 'snare';
      }
    } else {
      hitSoundType = 'hihat';
    }

    playDrumSound(hitSoundType, now, isHitAccent);

    // Sub-20ms Perfect Aura Glow Trigger
    if (Math.abs(diffMs) <= 20) {
      setIsCenterAuraPulse(true);
      setTimeout(() => setIsCenterAuraPulse(false), 240);
    }

    // Mobile Haptic Vibration
    if (typeof navigator !== 'undefined' && (navigator as any).vibrate) {
      try { (navigator as any).vibrate(14); } catch (_) {}
    }

    // Visual press ripple
    setIsPadPressed(true);
    setTimeout(() => setIsPadPressed(false), 120);

    // Multi-Tier Musician Grading Scale (Goldstandard: Musikalisch fair & touch-kalibriert)
    const absDiff = Math.abs(diffMs);
    let currentRating: 'pocket' | 'good' | 'rush' | 'drag' | 'miss' = 'miss';

    if (absDiff <= 38) {
      // 🌟 In the Pocket (Volle Punktzahl)
      currentRating = 'pocket';
      setLastRating('pocket');
      setPerfectHits(prev => prev + 1);
      setScoreSum(prev => prev + 100);
      setPocketStreak(prev => {
        const next = prev + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
    } else if (absDiff <= 72) {
      // 🌟 Gut im Puls (Sehr solides Timing)
      currentRating = 'good';
      setLastRating('good');
      setScoreSum(prev => prev + 85);
      setPocketStreak(prev => {
        const next = prev + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
    } else if (diffMs < -72 && diffMs >= -135) {
      // ⏩ Leicht vor dem Schlag (Rush)
      currentRating = 'rush';
      setLastRating('rush');
      setScoreSum(prev => prev + 55);
      setPocketStreak(0);
    } else if (diffMs > 72 && diffMs <= 135) {
      // ⏪ Leicht nach dem Schlag (Drag)
      currentRating = 'drag';
      setLastRating('drag');
      setScoreSum(prev => prev + 55);
      setPocketStreak(0);
    } else {
      // 💨 Daneben
      currentRating = 'miss';
      setLastRating('miss');
      setScoreSum(prev => prev + 0);
      setPocketStreak(0);
    }

    // Append to Scatter History
    setSessionHits(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        offsetMs: diffMs,
        rating: currentRating,
        bar: barCountRef.current,
        step: stepInPattern
      }
    ]);

  }, [activeLevelConfig, activeTargetPattern, bpm, getAudioContext, isCallPhase, isPlaying, latencyOffsetMs, playDrumSound, trainingMode]);

  // Spacebar Keyboard Listener (mit Isolation für Texteingaben wie z.B. Nickname-Modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !showCalibrationModal) {
        // 🛡️ Guard 1: Wenn der Benutzer in einem Eingabefeld (z.B. Nickname-Modal, Suche, Notizen) tippt,
        // darf die Leertaste NIEMALS den Groove-Trainer auslösen oder das Tippen blockieren!
        const activeEl = document.activeElement;
        const isTyping = activeEl && (
          activeEl.tagName === 'INPUT' || 
          activeEl.tagName === 'TEXTAREA' || 
          (activeEl as HTMLElement).isContentEditable
        );
        if (isTyping) {
          return;
        }

        e.preventDefault();
        // 🛡️ Wenn das Erfolgs-Modal offen ist oder der 1.2s Cooldown aktiv ist, Leertaste ignorieren
        if (sessionCompleted || Date.now() < completionCooldownRef.current) {
          return;
        }
        handleUserTap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUserTap, sessionCompleted, showCalibrationModal]);

  // 4-Tap Wizard Runner with Real Mathematical Time Difference Measurement
  const wizardClicksRef = useRef<number[]>([]);
  const start4TapWizard = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    setIs4TapWizardActive(true);
    setWizardTapCount(0);
    setWizardMeasuredOffsets([]);
    setWizardSuccessMessage(null);
    wizardClicksRef.current = [];

    const wizardBpm = 60;
    const intervalSec = 60 / wizardBpm;
    const startTime = ctx.currentTime + 0.12;

    for (let i = 0; i < 4; i++) {
      const clickTime = startTime + (i * intervalSec);
      wizardClicksRef.current.push(clickTime);
      playDrumSound('click', clickTime, i === 0);
    }
  }, [getAudioContext, playDrumSound]);

  const handleWizardTap = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx || !is4TapWizardActive) return;

    const now = ctx.currentTime;
    playDrumSound('snare', now, true);

    const currentTapIndex = wizardTapCount;
    const targetClickTime = wizardClicksRef.current[currentTapIndex] || now;
    const measuredRawDeltaMs = Math.round((now - targetClickTime) * 1000);

    const nextOffsets = [...wizardMeasuredOffsets, measuredRawDeltaMs];
    setWizardMeasuredOffsets(nextOffsets);

    const nextCount = currentTapIndex + 1;
    setWizardTapCount(nextCount);

    if (nextCount >= 4) {
      setIs4TapWizardActive(false);
      // Echter Median-Filter über die 4 Messungen:
      const sorted = [...nextOffsets].sort((a, b) => a - b);
      const medianOffset = Math.round((sorted[1] + sorted[2]) / 2);
      // Sicherheits-Clamp für Web-Audio (0ms bis 220ms)
      const finalOffset = Math.max(0, Math.min(220, medianOffset));
      
      setLatencyOffsetMs(finalOffset);
      try {
        localStorage.setItem('campus_timing_latency_offset', String(finalOffset));
      } catch (_) {}
      setCalibrationSource('trainer');
      setWizardSuccessMessage(`Perfekt eingemessen! Dein realer Hardware-Offset beträgt ${finalOffset}ms.`);
    }
  }, [getAudioContext, is4TapWizardActive, playDrumSound, wizardMeasuredOffsets, wizardTapCount]);

  const accuracyPercent = totalHits > 0 ? Math.round(scoreSum / totalHits) : 0;
  const starsEarned = accuracyPercent >= 90 ? 3 : (accuracyPercent >= 75 ? 2 : (accuracyPercent >= 50 ? 1 : 0));
  const comboMultiplier = pocketStreak >= 12 ? '4x' : (pocketStreak >= 8 ? '3x' : (pocketStreak >= 4 ? '2x' : '1x'));

  // Live Spring-Dampened Gauge needle position
  const gaugeNeedlePercent = timingOffsetMs === null 
    ? 50 
    : Math.max(4, Math.min(96, 50 + (timingOffsetMs / 100) * 45));

  // Didactic Analysis Metrics
  const meanOffset = sessionHits.length > 0 
    ? Math.round(sessionHits.reduce((acc, h) => acc + h.offsetMs, 0) / sessionHits.length)
    : 0;

  const stdDev = sessionHits.length > 1
    ? Math.round(Math.sqrt(sessionHits.reduce((acc, h) => acc + Math.pow(h.offsetMs - meanOffset, 2), 0) / sessionHits.length))
    : 0;

  const pedagogicalCoachingTip = accuracyPercent >= 85
    ? "Hervorragende rhythmische Stabilität! Dein Puls ist extrem zentriert und gleichmäßig im goldenen Kernbereich."
    : (meanOffset < -20
      ? `Du bist musikalisch sehr aufmerksam, neigst aber zu einer leichten Eile (${meanOffset}ms). Atme vor dem Schlag tief durch und vertraue auf den Grund-Puls!`
      : (meanOffset > 20
        ? `Sehr entspannter Groove! Versuche, etwas direkter auf die Zählzeit zu landen (+${meanOffset}ms).`
        : "Solider Beat! Der Großteil deiner Schläge liegt sauber im Zielbereich. Weiter so!"));

  const isNotebook = Boolean(useNotebookLayout || embedded);

  const studioCard = (
    <div style={{
      width: '100%',
      maxWidth: isNotebook ? '860px' : '490px',
      margin: '0 auto',
      background: '#ffffff',
      borderRadius: isNotebook ? '24px' : '32px',
      border: '1.5px solid #e2e8f0',
      boxShadow: isNotebook ? '0 10px 30px -5px rgba(0, 0, 0, 0.05)' : '0 24px 48px -12px rgba(217, 119, 6, 0.12), 0 2px 8px rgba(0,0,0,0.02)',
      padding: isNotebook ? '20px 22px 28px 22px' : (embedded ? '14px' : '18px 20px'),
      display: 'flex',
      flexDirection: 'column',
      gap: isNotebook ? '18px' : '14px',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative',
      userSelect: 'none',
      WebkitUserSelect: 'none'
    }} className="animate-fade-in">
      
      {/* 1. Header: Nahtlos in das Hausaufgabenheft integriert */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        padding: isNotebook ? '2px 4px 6px 4px' : '0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isNotebook ? '14px' : '10px' }}>
          <div style={{
            width: isNotebook ? '46px' : '36px',
            height: isNotebook ? '46px' : '36px',
            borderRadius: isNotebook ? '14px' : '11px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(217, 119, 6, 0.28)',
            flexShrink: 0
          }}>
            <Radio size={isNotebook ? 22 : 18} color="#ffffff" strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{
                margin: 0,
                fontSize: isNotebook ? '1.24rem' : '1.10rem',
                fontWeight: 950,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}>
                Groove-Trainer
              </h3>
              {isNotebook && (
                <span style={{
                  fontSize: '0.70rem',
                  fontWeight: 900,
                  color: '#92400e',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  padding: '2px 8px',
                  borderRadius: '100px'
                }}>
                  Studio Modus
                </span>
              )}
            </div>
            {isNotebook && (
              <p style={{ margin: '2px 0 0 0', fontSize: '0.80rem', color: '#64748b', fontWeight: 650 }}>
                16 Takte Rhythmus-Puls, Call &amp; Response und Mikro-Timing trainieren
              </p>
            )}
          </div>
        </div>

        {/* Header Right: Glänzendes XP-Pill & Micro-Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* ⚡ XP-Anzeige */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1.5px solid #fde68a',
            padding: isNotebook ? '6px 12px' : '4px 9px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.12)'
          }} title="Gesammelte XP">
            <Zap size={isNotebook ? 15 : 13} fill="#d97706" color="#d97706" />
            <span style={{ fontSize: isNotebook ? '0.84rem' : '0.76rem', fontWeight: 950, color: '#92400e' }}>
              {studentBaseXp + sessionAccumulatedXp} XP
            </span>
            {sessionAccumulatedXp > 0 && (
              <span style={{
                fontSize: isNotebook ? '0.68rem' : '0.62rem',
                fontWeight: 900,
                color: '#15803d',
                background: '#dcfce7',
                padding: '1px 6px',
                borderRadius: '6px'
              }}>
                +{sessionAccumulatedXp}
              </span>
            )}
          </div>

          {/* Klangkiste (Tools) */}
          <button
            type="button"
            onClick={() => setIsSoundSettingsOpen(!isSoundSettingsOpen)}
            style={{
              background: isSoundSettingsOpen ? '#fffbeb' : '#f8fafc',
              border: isSoundSettingsOpen ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
              color: isSoundSettingsOpen ? '#b45309' : '#64748b',
              borderRadius: isNotebook ? '12px' : '10px',
              padding: isNotebook ? '6px 12px' : '0',
              width: isNotebook ? 'auto' : '32px',
              height: isNotebook ? '36px' : '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
            title="Klangkiste (Tools für Sound, Tempo, Spielmodi & Latenz)"
          >
            <SlidersHorizontal size={14} color={isSoundSettingsOpen ? '#b45309' : '#64748b'} />
            {isNotebook && (
              <span style={{ fontSize: '0.76rem', fontWeight: 900, color: isSoundSettingsOpen ? '#b45309' : '#475569' }}>
                Klang &amp; Tempo
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 🎛️ Collapsible Klangkiste (Floating Tools Shelf) */}
      {isSoundSettingsOpen && (
        <div style={{
          background: '#ffffff',
          borderRadius: isNotebook ? '24px' : '20px',
          border: '1.5px solid #fed7aa',
          padding: isNotebook ? '18px 22px' : '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: isNotebook ? '0 10px 25px -5px rgba(217, 119, 6, 0.08)' : '0 4px 14px rgba(15, 23, 42, 0.04)'
        }} className="animate-fade-in">
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            {/* Sound-Kits */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
                Sound:
              </span>
              <div style={{ display: 'flex', gap: '3px', background: '#ffffff', padding: '3px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                {SOUND_KITS.map(kit => {
                  const isSel = soundKit === kit.id;
                  return (
                    <button
                      key={kit.id}
                      type="button"
                      onClick={() => setSoundKit(kit.id)}
                      style={{
                        border: 'none',
                        background: isSel ? '#fffbeb' : 'transparent',
                        color: isSel ? '#92400e' : '#64748b',
                        borderRadius: '8px',
                        padding: '5px 10px',
                        fontSize: '0.72rem',
                        fontWeight: isSel ? 950 : 700,
                        cursor: 'pointer',
                        boxShadow: isSel ? '0 1px 4px rgba(217, 119, 6, 0.15)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Layers size={11} color={isSel ? '#d97706' : '#94a3b8'} />
                      <span>{kit.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bass Play-Along Toggle */}
            <button
              type="button"
              onClick={() => setIsBassEnabled(!isBassEnabled)}
              style={{
                background: isBassEnabled ? '#fffbeb' : '#ffffff',
                border: isBassEnabled ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                color: isBassEnabled ? '#92400e' : '#64748b',
                borderRadius: '10px',
                padding: '5px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                fontWeight: 900,
                transition: 'all 0.15s ease'
              }}
              title="Groovige Bassline zu- oder abschalten"
            >
              <Music size={12} color={isBassEnabled ? '#d97706' : '#64748b'} />
              <span>Bass {isBassEnabled ? 'AN' : 'AUS'}</span>
            </button>
          </div>

          {/* Spielmodi / Challenge-Auswahl in der Klangkiste */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
              Modus:
            </span>
            <div style={{ display: 'flex', gap: '3px', background: '#ffffff', padding: '3px', borderRadius: '10px', border: '1px solid #e2e8f0', flex: 1 }}>
              <button
                type="button"
                onClick={() => setTrainingMode('call_response')}
                style={{
                  flex: 1,
                  border: 'none',
                  background: trainingMode === 'call_response' ? '#fffbeb' : 'transparent',
                  color: trainingMode === 'call_response' ? '#92400e' : '#64748b',
                  borderRadius: '7px',
                  padding: '5px 6px',
                  fontSize: '0.68rem',
                  fontWeight: trainingMode === 'call_response' ? 950 : 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Headphones size={11} color={trainingMode === 'call_response' ? '#d97706' : '#64748b'} />
                <span>Echo (Standard)</span>
              </button>
              <button
                type="button"
                onClick={() => setTrainingMode('continuous')}
                style={{
                  flex: 1,
                  border: 'none',
                  background: trainingMode === 'continuous' ? '#fffbeb' : 'transparent',
                  color: trainingMode === 'continuous' ? '#92400e' : '#64748b',
                  borderRadius: '7px',
                  padding: '5px 6px',
                  fontSize: '0.68rem',
                  fontWeight: trainingMode === 'continuous' ? 950 : 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Activity size={11} color={trainingMode === 'continuous' ? '#d97706' : '#64748b'} />
                <span>Dauer-Groove</span>
              </button>
              <button
                type="button"
                onClick={() => setTrainingMode('disappearing_beat')}
                style={{
                  flex: 1,
                  border: 'none',
                  background: trainingMode === 'disappearing_beat' ? '#fffbeb' : 'transparent',
                  color: trainingMode === 'disappearing_beat' ? '#92400e' : '#64748b',
                  borderRadius: '7px',
                  padding: '5px 6px',
                  fontSize: '0.68rem',
                  fontWeight: trainingMode === 'disappearing_beat' ? 950 : 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Clock size={11} color={trainingMode === 'disappearing_beat' ? '#d97706' : '#64748b'} />
                <span>Geister-Beat</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
            {/* BPM Feineinstellung */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
                Tempo:
              </span>
              <button
                type="button"
                onClick={() => setBpm(b => Math.max(40, b - 5))}
                style={{ width: '26px', height: '26px', borderRadius: '7px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 900, cursor: 'pointer' }}
              >
                -
              </button>
              <span style={{ fontSize: '0.84rem', fontWeight: 950, color: '#0f172a', minWidth: '60px', textAlign: 'center' }}>
                {bpm} BPM
              </span>
              <button
                type="button"
                onClick={() => setBpm(b => Math.min(180, b + 5))}
                style={{ width: '26px', height: '26px', borderRadius: '7px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 900, cursor: 'pointer' }}
              >
                +
              </button>
            </div>

            {/* Hardware-Kalibrierung (Zahnrad) & Profi-Modus (Kompakter Switch) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setIsProMode(!isProMode)}
                style={{
                  background: isProMode ? '#0f172a' : '#ffffff',
                  border: isProMode ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                  color: isProMode ? '#ffffff' : '#64748b',
                  borderRadius: '9px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.72rem',
                  fontWeight: 850
                }}
                title="Zwischen kindgerechter Symbolik und genauer Millisekunden-Anzeige wechseln"
              >
                <Gauge size={13} color={isProMode ? '#ffffff' : '#64748b'} />
                <span>{isProMode ? 'ms-Skala AN' : 'Profi-Modus'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCalibrationModal(true)}
                style={{
                  background: isBluetoothDetected ? '#eff6ff' : '#ffffff',
                  border: isBluetoothDetected ? '1.5px solid #93c5fd' : '1px solid #cbd5e1',
                  borderRadius: '9px',
                  padding: '5px 8px',
                  cursor: 'pointer',
                  color: isBluetoothDetected ? '#1d4ed8' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}
                title={`Hardware-Latenz & Kalibrierung (${latencyOffsetMs}ms)`}
                aria-label="Audio-Latenz & Kalibrierung öffnen"
              >
                {isBluetoothDetected ? (
                  <Bluetooth size={13} color="#1d4ed8" />
                ) : (
                  <Settings size={13} color="#64748b" />
                )}
                <span>{latencyOffsetMs}ms</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 FOKUS-ZONE 1: DIE 8 RHYTHMUS-WELTEN (4x4 RASTER: DIDAKTISCHES STUFEN-CURRICULUM) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: isNotebook ? '8px' : '6px',
        background: '#f8fafc',
        padding: isNotebook ? '8px' : '6px',
        borderRadius: isNotebook ? '20px' : '16px',
        border: '1px solid #e2e8f0'
      }}>
        {RHYTHM_LEVELS.map(lvl => {
          const isSel = selectedLevel === lvl.id;
          return (
            <button
              key={lvl.id}
              type="button"
              onClick={() => {
                if (isPlaying) handleTogglePlay();
                setSelectedLevel(lvl.id);
                setBpm(lvl.defaultBpm);
              }}
              style={{
                border: isSel ? '2px solid #f59e0b' : '2px solid transparent',
                background: isSel ? '#ffffff' : 'transparent',
                color: isSel ? '#92400e' : '#475569',
                borderRadius: isNotebook ? '14px' : '11px',
                padding: isNotebook ? '10px 4px' : '7px 2px',
                cursor: 'pointer',
                boxShadow: isSel ? '0 4px 14px rgba(217, 119, 6, 0.16), 0 1px 3px rgba(0,0,0,0.04)' : 'none',
                transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isNotebook ? '3px' : '2px',
                transform: isSel ? 'scale(1.02)' : 'scale(1)',
                minWidth: '0'
              }}
              className="hover-scale-mini"
            >
              <div style={{
                color: isSel ? '#d97706' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {lvl.id === 'viertel' && <CircleDot size={isNotebook ? 18 : 14} strokeWidth={2.6} />}
                {lvl.id === 'rock_mix' && <Music size={isNotebook ? 18 : 14} strokeWidth={2.6} />}
                {lvl.id === 'synkopen' && <Activity size={isNotebook ? 18 : 14} strokeWidth={2.6} />}
                {lvl.id === 'galopp' && <Zap size={isNotebook ? 18 : 14} strokeWidth={2.6} />}
                {lvl.id === 'latin_bossa' && <Sun size={isNotebook ? 18 : 14} strokeWidth={2.6} />}
                {lvl.id === 'funk_master' && <Sparkles size={isNotebook ? 18 : 14} strokeWidth={2.6} />}
                {lvl.id === 'shuffle' && <Shuffle size={isNotebook ? 18 : 14} strokeWidth={2.6} />}
                {lvl.id === 'random_groove' && <Dices size={isNotebook ? 18 : 14} strokeWidth={2.6} />}
              </div>
              <div style={{
                fontSize: isNotebook ? '0.84rem' : '0.74rem',
                fontWeight: 950,
                color: isSel ? '#92400e' : '#0f172a',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }}>
                {lvl.id === 'viertel' ? '1. Viertel' : 
                 lvl.id === 'rock_mix' ? '2. Rock-Mix' : 
                 lvl.id === 'synkopen' ? '3. Off-Beat' : 
                 lvl.id === 'galopp' ? '4. Galopp' : 
                 lvl.id === 'latin_bossa' ? '5. Bossa' : 
                 lvl.id === 'funk_master' ? '6. Funk' : 
                 lvl.id === 'shuffle' ? '7. Blues' : '8. Random'}
              </div>
              <div style={{
                fontSize: isNotebook ? '0.68rem' : '0.58rem',
                fontWeight: 850,
                color: isSel ? '#d97706' : '#94a3b8',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }}>
                {isJunior ? lvl.badgeJunior : lvl.badgePro}
              </div>
            </button>
          );
        })}
      </div>

      {/* 🌟 FOKUS-ZONE 2: 16-TAKTE-PULSBALKEN & VISUELLE BEAT-BÜHNE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isNotebook ? '10px' : '8px' }}>
        {/* Nahtlose Takt-Fortschrittszeile */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          padding: '0 2px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: isNotebook ? '0.82rem' : '0.74rem',
            fontWeight: 950
          }}>
            <span style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={isNotebook ? 15 : 13} color="#d97706" />
              <span>Takt {Math.min(16, currentBar + 1)} von 16</span>
            </span>
            <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: isNotebook ? '0.76rem' : '0.70rem', fontWeight: 800 }}>
              <Target size={12} color="#64748b" />
              <span>{16 - Math.min(16, currentBar + 1) <= 0 ? 'Ziel erreicht!' : `noch ${16 - Math.min(16, currentBar + 1)} Takte`}</span>
            </span>
          </div>

          <div style={{
            position: 'relative',
            width: '100%',
            height: isNotebook ? '8px' : '6px',
            background: '#f1f5f9',
            borderRadius: '100px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, ((currentBar * activeLevelConfig.subdivisions + currentStep) / (16 * activeLevelConfig.subdivisions)) * 100))}%`,
              height: '100%',
              borderRadius: '100px',
              background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 60%, #16a34a 100%)',
              transition: 'width 0.10s linear',
              boxShadow: '0 0 10px rgba(217, 119, 6, 0.40)'
            }} />
          </div>
        </div>

        {/* Die Magische Beat-Bühne (Visual Metronome Pulse) */}
        <div style={{
          background: isNotebook 
            ? 'linear-gradient(180deg, #ffffff 0%, #fdfbf7 100%)'
            : 'linear-gradient(180deg, #fafaf9 0%, #fff7ed 100%)',
          borderRadius: isNotebook ? '26px' : '24px',
          padding: isNotebook ? '18px 22px' : '14px 16px',
          boxShadow: isNotebook 
            ? '0 10px 30px -6px rgba(217, 119, 6, 0.08), 0 2px 6px rgba(0,0,0,0.02)'
            : 'inset 0 1px 3px rgba(255, 255, 255, 0.9), 0 8px 20px -6px rgba(234, 88, 12, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: isNotebook ? '14px' : '12px',
          border: '1.5px solid #fed7aa',
          position: 'relative'
        }}>
          
          {/* Signal-Pill & Streak */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '34px', gap: '8px' }}>
            <span style={{
              background: isCallPhase ? '#fef3c7' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: isCallPhase ? '#92400e' : '#ffffff',
              border: isCallPhase ? '1.5px solid #fde68a' : 'none',
              fontSize: isNotebook ? '0.84rem' : '0.78rem',
              fontWeight: 950,
              padding: isNotebook ? '6px 16px' : '5px 13px',
              borderRadius: '100px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: isCallPhase ? '0 2px 8px rgba(217, 119, 6, 0.15)' : '0 2px 10px rgba(22, 163, 74, 0.30)',
              transition: 'all 0.15s ease'
            }}>
              {trainingMode === 'call_response' 
                ? (isCallPhase 
                  ? <><Headphones size={14} color="#92400e" strokeWidth={2.5} /> HÖR GUT ZU! (Noch {2 - (currentBar % 4)} {2 - (currentBar % 4) === 1 ? 'Takt' : 'Takte'})</> 
                  : <><Target size={14} color="#ffffff" strokeWidth={2.4} /> JETZT DU! (Spiele im Beat)</>)
                : (trainingMode === 'continuous'
                  ? <><Activity size={14} color="#ffffff" /> Dauer-Groove (16 Takte Flow)</>
                  : (isDisappeared 
                    ? <><Clock size={14} color="#64748b" /> Geister-Beat – Zähle innerlich!</> 
                    : <><Activity size={14} color="#ffffff" /> Der Beat groovt</>))}
            </span>

            {/* Streak & Combo Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {pocketStreak >= 4 && (
                <span style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#b45309',
                  fontSize: isNotebook ? '0.74rem' : '0.66rem',
                  fontWeight: 950,
                  padding: '3px 10px',
                  borderRadius: '100px'
                }}>
                  COMBO x{comboMultiplier}
                </span>
              )}
              <span style={{
                fontSize: isNotebook ? '0.82rem' : '0.74rem',
                fontWeight: 950,
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#ffffff',
                padding: isNotebook ? '4px 10px' : '3px 8px',
                borderRadius: '10px',
                border: '1px solid #fed7aa'
              }}>
                <Flame size={14} color="#d97706" /> Streak: {pocketStreak}
              </span>
            </div>
          </div>

          {/* Call-Phase visueller Takt-Fortschrittsbalken */}
          {trainingMode === 'call_response' && isCallPhase && isPlaying && (
            <div style={{
              width: '100%',
              height: '4px',
              background: '#fef3c7',
              borderRadius: '100px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min(100, Math.max(5, (((currentBar % 4) * activeLevelConfig.subdivisions + currentStep + 1) / (2 * activeLevelConfig.subdivisions)) * 100))}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #f59e0b 0%, #16a34a 100%)',
                transition: 'width 0.08s linear'
              }} />
            </div>
          )}

          {/* Konzentrische Beat-Trigger-Pads (Zero-Layout-Shift mit festen Containern & 2-Reihen-Mobile-View) */}
          <div 
            className={`groove-beat-pads-grid ${activeSyllables.length >= 12 ? 'groove-subdivisions-dense' : ''}`}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${activeSyllables.length}, 1fr)`,
              gap: isNotebook ? '10px' : '4px',
              padding: '2px 0',
              minHeight: isNotebook ? '104px' : '88px',
              alignItems: 'center',
              contain: 'layout style',
              boxSizing: 'border-box'
            }}
          >
            {activeSyllables.map((syl, sIdx) => {
              const isCurrent = isPlaying && currentStep === sIdx;
              const isAnticipating = isPlaying && anticipatingStep === sIdx;
              const isTarget = activeTargetPattern[sIdx];

              return (
                <div
                  key={sIdx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: isNotebook ? '6px' : '4px',
                    height: '100%',
                    justifyContent: 'center',
                    minWidth: 0
                  }}
                >
                  <span style={{
                    fontSize: activeSyllables.length > 8 
                      ? (isNotebook ? '0.78rem' : '0.66rem') 
                      : (isNotebook ? '0.94rem' : '0.84rem'),
                    fontWeight: 950,
                    color: isCurrent ? '#d97706' : (isTarget ? '#0f172a' : '#94a3b8'),
                    letterSpacing: '0.01em',
                    transition: 'all 0.08s ease',
                    height: '18px',
                    minHeight: '18px',
                    maxHeight: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                  }}>
                    {syl}
                  </span>

                  <div style={{
                    width: '100%',
                    height: isNotebook ? '68px' : '56px',
                    minHeight: isNotebook ? '68px' : '56px',
                    maxHeight: isNotebook ? '68px' : '56px',
                    borderRadius: isNotebook ? '20px' : '14px',
                    background: isCurrent 
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      : (isAnticipating ? '#fffbeb' : (isTarget ? '#ffffff' : '#f8fafc')),
                    border: isCurrent 
                      ? '2.5px solid #ffffff' 
                      : (isAnticipating ? '2px solid #f59e0b' : (isTarget ? '1.5px solid #fed7aa' : '1px dashed #cbd5e1')),
                    boxShadow: isCurrent 
                      ? '0 8px 20px rgba(217, 119, 6, 0.42), inset 0 1.5px 0 rgba(255, 255, 255, 0.7)' 
                      : (isAnticipating 
                        ? '0 0 14px rgba(245, 158, 11, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.8)' 
                        : (isTarget 
                          ? '0 2px 6px rgba(0,0,0,0.03), inset 0 1.5px 0 rgba(255, 255, 255, 0.95), inset 0 -2px 4px rgba(0,0,0,0.02)' 
                          : 'none')),
                    transform: isCurrent ? 'scale(1.06)' : (isAnticipating ? 'scale(1.03)' : 'scale(1)'),
                    transformOrigin: 'center center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.08s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxSizing: 'border-box'
                  }}>
                    {isTarget && (
                      <div style={{
                        width: isCurrent ? (isNotebook ? '16px' : '12px') : (isNotebook ? '11px' : '8px'),
                        height: isCurrent ? (isNotebook ? '16px' : '12px') : (isNotebook ? '11px' : '8px'),
                        borderRadius: '50%',
                        background: isCurrent ? '#ffffff' : (isAnticipating ? '#d97706' : '#f59e0b'),
                        transition: 'all 0.08s ease',
                        boxShadow: isCurrent 
                          ? '0 0 12px rgba(255,255,255,0.95)' 
                          : (isAnticipating ? '0 0 8px rgba(217, 119, 6, 0.6)' : 'none')
                      }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Profi-Modus: Millisekunden-Gauge (nur wenn aktiv) */}
          {isProMode && (
            <div style={{
              position: 'relative',
              width: '100%',
              height: '10px',
              background: '#f1f5f9',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ position: 'absolute', left: '15%', width: '22%', top: 0, bottom: 0, background: '#dbeafe' }} />
              <div style={{ position: 'absolute', left: '37%', width: '26%', top: 0, bottom: 0, background: '#dcfce7' }} />
              <div style={{ position: 'absolute', left: '63%', width: '22%', top: 0, bottom: 0, background: '#fef3c7' }} />
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: '#f59e0b', transform: 'translateX(-50%)' }} />
              {timingOffsetMs !== null && (
                <div style={{
                  position: 'absolute',
                  left: `${gaugeNeedlePercent}%`,
                  top: '1px',
                  bottom: '1px',
                  width: '6px',
                  borderRadius: '3px',
                  background: lastRating === 'pocket' ? '#d97706' : (lastRating === 'good' ? '#16a34a' : (lastRating === 'rush' ? '#2563eb' : (lastRating === 'drag' ? '#b45309' : '#dc2626'))),
                  transform: 'translateX(-50%)',
                  transition: 'left 0.12s ease'
                }} />
              )}
            </div>
          )}

        </div>
      </div>

      {/* 🌟 FOKUS-ZONE 3: DAS HERO 3D MPC DRUM-PAD (ALL-IN-ONE TRIGGER) */}
      <button
        type="button"
        aria-label={!isPlaying && !isCountingIn ? "Groove-Trainer starten" : (isCountingIn ? "Einzähler läuft" : "Im Rhythmus tippen")}
        onPointerDown={(e) => {
          e.preventDefault();
          handleUserTap();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleUserTap();
          }
        }}
        style={{
          width: '100%',
          height: isNotebook ? '124px' : '112px',
          minHeight: isNotebook ? '124px' : '112px',
          maxHeight: isNotebook ? '124px' : '112px',
          boxSizing: 'border-box',
          borderRadius: isNotebook ? '28px' : '24px',
          border: 'none',
          background: !isPlaying && !isCountingIn
            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)'
            : (isCountingIn 
              ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' 
              : (isCallPhase && trainingMode === 'call_response'
                ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                : (isPadPressed 
                  ? '#14532d' 
                  : 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)'))),
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isNotebook ? '6px' : '4px',
          cursor: 'pointer',
          boxShadow: isPadPressed 
            ? '0 2px 0 #0f172a, inset 0 3px 8px rgba(0, 0, 0, 0.25)' 
            : (isNotebook 
              ? '0 6px 0 #92400e, 0 18px 36px -6px rgba(217, 119, 6, 0.38), inset 0 1.5px 0 rgba(255, 255, 255, 0.45)'
              : '0 6px 0 #92400e, 0 16px 32px -6px rgba(217, 119, 6, 0.42), inset 0 1.5px 0 rgba(255, 255, 255, 0.42)'),
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'manipulation',
          transform: isPadPressed ? 'translateY(3px)' : 'translateY(0)',
          transition: 'transform 0.05s ease, background 0.15s ease',
          outline: 'none'
        }}
        className="hover-scale-mini"
      >
        {isCountingIn ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: isNotebook ? '12px' : '9px' }}>
              <Activity size={isNotebook ? 28 : 24} color="#ffffff" className="animate-pulse" />
              <span style={{
                fontSize: isNotebook ? '1.42rem' : '1.24rem',
                fontWeight: 950,
                letterSpacing: '-0.01em',
                color: '#ffffff'
              }}>
                BEREIT MACHEN... {countInBeat > 0 ? countInBeat : '1'}
              </span>
            </div>
            <div style={{
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isNotebook ? '0.84rem' : '0.76rem',
              color: 'rgba(255, 255, 255, 0.94)',
              fontWeight: 800
            }}>
              Vorzähler läuft • Lausche auf den Puls 1 · 2 · 3 · 4
            </div>
          </>
        ) : !isPlaying ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: isNotebook ? '12px' : '9px' }}>
              <Play size={isNotebook ? 28 : 24} fill="#ffffff" color="#ffffff" strokeWidth={2.4} />
              <span style={{
                fontSize: isNotebook ? '1.42rem' : '1.24rem',
                fontWeight: 950,
                letterSpacing: '-0.01em',
                color: '#ffffff'
              }}>
                TIPPEN ZUM STARTEN
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '24px',
              fontSize: isNotebook ? '0.84rem' : '0.76rem',
              color: 'rgba(255, 255, 255, 0.94)',
              fontWeight: 750
            }}>
              <span>Tippe hier oder drücke</span>
              <span style={{
                background: 'rgba(0, 0, 0, 0.24)',
                border: '1px solid rgba(255, 255, 255, 0.40)',
                padding: '2px 8px',
                borderRadius: '7px',
                fontSize: isNotebook ? '0.74rem' : '0.68rem',
                fontWeight: 900,
                letterSpacing: '0.04em'
              }}>
                LEERTASTE
              </span>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: isNotebook ? '10px' : '8px' }}>
              <Target size={isNotebook ? 26 : 22} color="#ffffff" strokeWidth={2.8} />
              <span style={{
                fontSize: isNotebook ? '1.34rem' : '1.18rem',
                fontWeight: 950,
                letterSpacing: '-0.01em',
                color: '#ffffff'
              }}>
                {trainingMode === 'call_response' && isCallPhase ? 'NUR ZUHÖREN...' : 'HIER IM TAKT TROMMELN'}
              </span>
            </div>

            {/* Live-Feedback direkt im Hero-Pad (Fixed Height Slot gegen Layout-Shift) */}
            <div style={{
              height: '24px',
              minHeight: '24px',
              maxHeight: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis'
            }}>
              {lastRating === 'pocket' && (
                <span style={{ fontSize: isNotebook ? '0.90rem' : '0.82rem', fontWeight: 950, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Sparkles size={16} color="#ffffff" /> GENAU! VOLL IM POCKET!
                </span>
              )}
              {lastRating === 'good' && (
                <span style={{ fontSize: isNotebook ? '0.90rem' : '0.82rem', fontWeight: 950, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Check size={16} color="#ffffff" /> GUT IM PULS!
                </span>
              )}
              {lastRating === 'rush' && (
                <span style={{ fontSize: isNotebook ? '0.86rem' : '0.78rem', fontWeight: 900, color: '#fee2e2', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={15} color="#fee2e2" /> ETWAS FRÜH • Nicht hetzen!
                </span>
              )}
              {lastRating === 'drag' && (
                <span style={{ fontSize: isNotebook ? '0.86rem' : '0.78rem', fontWeight: 900, color: '#fef3c7', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={15} color="#fef3c7" /> ETWAS SPÄT • Ganz entspannt mit dem Beat!
                </span>
              )}
              {lastRating === 'miss' && (
                <span style={{ fontSize: isNotebook ? '0.86rem' : '0.78rem', fontWeight: 900, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <RotateCcw size={15} color="#f1f5f9" /> DANEBEN • Lausche auf den Beat!
                </span>
              )}
              {!lastRating && (
                <span style={{ fontSize: isNotebook ? '0.82rem' : '0.74rem', color: 'rgba(255, 255, 255, 0.88)', fontWeight: 750 }}>
                  {trainingMode === 'call_response' && isCallPhase ? 'Präge dir den Rhythmus ein' : 'Tippe im Rhythmus der Beats'}
                </span>
              )}
            </div>
          </>
        )}
      </button>

      {/* 4. Minimaler Fußbereich: 3 Sterne & dezenter Stop-Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 4px',
        minHeight: isNotebook ? '40px' : '34px'
      }}>
        {/* 3 Goldsterne */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isNotebook ? '8px' : '6px',
          background: '#f8fafc',
          border: '1px solid #f1f5f9',
          padding: isNotebook ? '6px 12px' : '4px 9px',
          borderRadius: isNotebook ? '12px' : '10px'
        }}>
          <div style={{ display: 'flex', gap: '3px' }}>
            <Star size={isNotebook ? 18 : 15} color={starsEarned >= 1 ? '#f59e0b' : '#cbd5e1'} fill={starsEarned >= 1 ? '#f59e0b' : 'none'} />
            <Star size={isNotebook ? 18 : 15} color={starsEarned >= 2 ? '#f59e0b' : '#cbd5e1'} fill={starsEarned >= 2 ? '#f59e0b' : 'none'} />
            <Star size={isNotebook ? 18 : 15} color={starsEarned >= 3 ? '#f59e0b' : '#cbd5e1'} fill={starsEarned >= 3 ? '#f59e0b' : 'none'} />
          </div>
          {totalHits > 0 && (
            <span style={{
              fontSize: isNotebook ? '0.80rem' : '0.74rem',
              fontWeight: 950,
              color: '#854d0e',
              background: '#fef9c3',
              padding: '2px 7px',
              borderRadius: '6px'
            }}>
              {accuracyPercent}%
            </span>
          )}
        </div>

        {/* Rechter Status / Stop Button */}
        <div>
          {isPlaying ? (
            <button
              type="button"
              onClick={handleTogglePlay}
              style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: isNotebook ? '12px' : '10px',
                padding: isNotebook ? '7px 16px' : '5px 12px',
                fontSize: isNotebook ? '0.82rem' : '0.76rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
              title="Übung stoppen"
            >
              <Square size={12} fill="#dc2626" color="#dc2626" />
              <span>Stop</span>
            </button>
          ) : (
            <span style={{
              fontSize: isNotebook ? '0.80rem' : '0.74rem',
              color: '#64748b',
              fontWeight: 900,
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              padding: isNotebook ? '6px 12px' : '4px 9px',
              borderRadius: isNotebook ? '12px' : '10px',
              letterSpacing: '0.02em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              ♩ = {bpm} BPM
            </span>
          )}
        </div>
      </div>

      {/* 5. Apple Arcade Session Success Modal Overlay with Scatter Density & Didactic Coaching */}
      {sessionCompleted && (
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #bbf7d0',
          borderRadius: isNotebook ? '28px' : '24px',
          padding: isNotebook ? '26px 30px' : '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: isNotebook ? '22px' : '20px',
          boxShadow: isNotebook ? '0 20px 48px -12px rgba(21, 128, 61, 0.20)' : '0 20px 40px -8px rgba(21, 128, 61, 0.15)',
          position: 'relative'
        }} className="animate-fade-in">
          
          {/* Header Trophy & Stars */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #34a853 0%, #15803d 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(21, 128, 61, 0.3)'
              }}>
                <Trophy size={28} color="#ffffff" strokeWidth={2.4} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.10rem', fontWeight: 950, color: '#0f172a' }}>
                    {starsEarned === 3 ? 'Groove-Meisterleistung! (3 Sterne)' : (starsEarned === 2 ? 'Klasse Rhythmus! (2 Sterne)' : 'Guter Anfang! (1 Stern)')}
                  </h4>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    fontSize: '0.78rem',
                    fontWeight: 900,
                    padding: '3px 10px',
                    borderRadius: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Sparkles size={12} /> +{awardedRoundXp} XP gesichert!
                  </span>
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 650 }}>
                  16 Takte meisterhaft abgeschlossen! • {accuracyPercent}% Trefferquote • Heute gesammelt: <strong style={{ color: '#15803d' }}>+{sessionAccumulatedXp} XP für dein Profil</strong>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setSessionCompleted(false);
                  handleTogglePlay();
                }}
                style={{
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '0.84rem',
                  fontWeight: 850,
                  cursor: 'pointer'
                }}
                className="hover-scale"
              >
                Nochmal spielen ➔
              </button>

              <button
                type="button"
                onClick={() => {
                  commitSessionData();
                  setShowCelebrationModal(true);
                }}
                style={{
                  background: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontSize: '0.86rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(21, 128, 61, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                className="hover-scale"
              >
                <span>Abschließen &amp; XP sichern</span>
                <Sparkles size={14} />
              </button>
            </div>
          </div>

          {/* Didactic Scatter Density Graph */}
          {sessionHits.length > 0 && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 900, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={14} color="#15803d" /> Deine Schlag-Streuung ({sessionHits.length} Schläge):
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                  Mittlere Abweichung: {meanOffset > 0 ? `+${meanOffset}` : meanOffset}ms • Streuung: ±{stdDev}ms
                </span>
              </div>

              {/* Scatter Track */}
              <div style={{ position: 'relative', width: '100%', height: '32px', background: '#ffffff', borderRadius: '10px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: '15%', width: '22%', top: 0, bottom: 0, background: '#eff6ff', borderRight: '1px dashed #bfdbfe' }} />
                <div style={{ position: 'absolute', left: '37%', width: '26%', top: 0, bottom: 0, background: '#f0fdf4', borderLeft: '1px solid #bbf7d0', borderRight: '1px solid #bbf7d0' }} />
                <div style={{ position: 'absolute', left: '63%', width: '22%', top: 0, bottom: 0, background: '#fffbeb', borderLeft: '1px dashed #fde68a' }} />
                
                {/* Center Zero Goal Line */}
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: '#15803d', transform: 'translateX(-50%)' }} />

                {/* Plotted Scatter Dots */}
                {sessionHits.map((h, i) => {
                  const xPct = Math.max(3, Math.min(97, 50 + (h.offsetMs / 100) * 45));
                  const dotColor = h.rating === 'pocket' ? '#15803d' : (h.rating === 'good' ? '#16a34a' : (h.rating === 'rush' ? '#2563eb' : (h.rating === 'drag' ? '#d97706' : '#dc2626')));
                  return (
                    <div
                      key={h.id || i}
                      style={{
                        position: 'absolute',
                        left: `${xPct}%`,
                        top: '50%',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: dotColor,
                        border: '1.5px solid #ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        transform: 'translate(-50%, -50%)'
                      }}
                      title={`${h.offsetMs > 0 ? `+${h.offsetMs}` : h.offsetMs}ms (${h.rating})`}
                    />
                  );
                })}
              </div>

              {/* Coaching Tip */}
              <div style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '10px 14px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <Lightbulb size={16} color="#eab308" style={{ marginTop: '2px', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#334155', lineHeight: 1.45 }}>
                  <strong style={{ color: '#0f172a' }}>Pädagogischer Timing-Tipp:</strong> {pedagogicalCoachingTip}
                </p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 6. Hardware Latency Calibration Modal with 4-Tap Wizard */}
      {showCalibrationModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            maxWidth: '460px',
            width: '100%',
            padding: '26px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={20} color="#15803d" />
                <h4 style={{ margin: 0, fontSize: '1.10rem', fontWeight: 900, color: '#0f172a' }}>
                  Hardware-Latenz Kalibrierung
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCalibrationModal(false);
                  setIs4TapWizardActive(false);
                }}
                style={{ background: 'transparent', border: 'none', fontSize: '1rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
              Jedes Gerät (AirPods, Lautsprecher, Mac-Klinke) hat messbare Audio-Verzögerungen.
              {isBluetoothDetected && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px', color: '#2563eb', fontWeight: 700 }}>
                  <Bluetooth size={13} color="#2563eb" />
                  <span>Bluetooth-Verbindung erkannt: Latenzausgleich aktiv.</span>
                </span>
              )}
            </p>

            {/* Loopstation Sync Notification */}
            {calibrationSource === 'loopstation' && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.76rem',
                color: '#166534',
                fontWeight: 700
              }}>
                <CheckCircle2 size={16} color="#166534" />
                <span>Automatisch mit deiner GrooveLoopstation synchronisiert!</span>
              </div>
            )}

            {/* Current Offset Display */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Aktueller Offset
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 950, color: '#15803d' }}>
                  {latencyOffsetMs} ms
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(-50, latencyOffsetMs - 5);
                    setLatencyOffsetMs(next);
                    localStorage.setItem('campus_timing_latency_offset', String(next));
                    setCalibrationSource('trainer');
                  }}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}
                >
                  - 5ms
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(220, latencyOffsetMs + 5);
                    setLatencyOffsetMs(next);
                    localStorage.setItem('campus_timing_latency_offset', String(next));
                    setCalibrationSource('trainer');
                  }}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}
                >
                  + 5ms
                </button>
              </div>
            </div>

            {/* 4-Tap Quick Calibration Wizard Button */}
            <div style={{
              background: '#ffffff',
              border: '1.5px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              {!is4TapWizardActive ? (
                <>
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Target size={14} color="#0f172a" />
                    <span>4-Tap Schnell-Einmessung</span>
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    Spielt 4 Klicks ab – tippe 4x im Takt mit, um dein Gerät auf 0ms zu eichen.
                  </span>
                  <button
                    type="button"
                    onClick={start4TapWizard}
                    style={{
                      background: '#15803d',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px 16px',
                      fontSize: '0.80rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    Einmessung starten
                  </button>
                </>
              ) : (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#15803d' }}>
                    Höre die Klicks &amp; tippe 4x: ({wizardTapCount} von 4)
                  </span>
                  <button
                    type="button"
                    onPointerDown={handleWizardTap}
                    style={{
                      width: '100%',
                      height: '60px',
                      borderRadius: '12px',
                      background: '#e6f4ea',
                      border: '2px solid #34a853',
                      color: '#15803d',
                      fontSize: '0.94rem',
                      fontWeight: 950,
                      cursor: 'pointer'
                    }}
                  >
                    JETZT TIPPEN ({wizardTapCount + 1}. Schlag)
                  </button>
                </div>
              )}

              {wizardSuccessMessage && (
                <span style={{ fontSize: '0.76rem', color: '#15803d', fontWeight: 800 }}>
                  {wizardSuccessMessage}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setLatencyOffsetMs(25);
                  localStorage.setItem('campus_timing_latency_offset', '25');
                  setCalibrationSource('trainer');
                }}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                Standard zurücksetzen (25 ms)
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCalibrationModal(false);
                  setIs4TapWizardActive(false);
                }}
                style={{
                  background: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                Speichern &amp; Schließen
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  return (
    <div style={{ width: '100%', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Mobile / Tablet Portrait Segmented Tab Switch */}
      <div 
        className="groove-mobile-pane-switch"
        style={{
          display: 'none',
          marginBottom: '16px',
          background: '#ffffff',
          padding: '4px',
          borderRadius: '16px',
          border: '1.5px solid #fed7aa',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        <button
          type="button"
          onClick={() => setMobileActivePane('trainer')}
          style={{
            flex: 1,
            border: 'none',
            background: mobileActivePane === 'trainer' ? '#f59e0b' : 'transparent',
            color: mobileActivePane === 'trainer' ? '#ffffff' : '#64748b',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '0.88rem',
            fontWeight: 950,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Target size={16} />
          <span>Rhythmus-Trainer</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileActivePane('leaderboard')}
          style={{
            flex: 1,
            border: 'none',
            background: mobileActivePane === 'leaderboard' ? '#f59e0b' : 'transparent',
            color: mobileActivePane === 'leaderboard' ? '#ffffff' : '#64748b',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '0.88rem',
            fontWeight: 950,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Trophy size={16} />
          <span>Bestenliste</span>
        </button>
      </div>

      {/* 2-Spalten Doppelseite (Aufgeschlagenes Aufgabenheft) */}
      <div className="groove-dual-book-grid">
        <div className={`groove-pane-trainer ${mobileActivePane !== 'trainer' ? 'hide-mobile' : ''}`}>
          {studioCard}
        </div>

        <div className={`groove-pane-leaderboard ${mobileActivePane !== 'leaderboard' ? 'hide-mobile' : ''}`}>
          <GrooveLeaderboardWidget
            selectedLevel={selectedLevel}
            onSelectLevel={(lvl) => {
              if (!isPlaying && !isCountingIn) {
                setSelectedLevel(lvl);
              }
            }}
            student={student}
            onPlayLevel={(lvl) => {
              if (!isPlaying && !isCountingIn) {
                setSelectedLevel(lvl);
                setMobileActivePane('trainer');
                setTimeout(() => handleTogglePlay(), 60);
              }
            }}
            latestScore={latestFinishedScore}
            useNotebookLayout={isNotebook}
          />
        </div>
      </div>

      <style>{`
        .groove-dual-book-grid {
          display: grid;
          grid-template-columns: minmax(460px, 1.16fr) minmax(360px, 0.84fr);
          gap: 24px;
          align-items: stretch;
          width: 100%;
        }
        @media (max-width: 1023px) {
          .groove-dual-book-grid {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .groove-mobile-pane-switch {
            display: flex !important;
          }
          .groove-pane-trainer.hide-mobile,
          .groove-pane-leaderboard.hide-mobile {
            display: none !important;
          }
        }
        @media (min-width: 1024px) {
          .groove-pane-trainer,
          .groove-pane-leaderboard {
            display: block !important;
          }
        @media (max-width: 640px) {
          .groove-beat-pads-grid.groove-subdivisions-dense {
            grid-template-columns: repeat(8, 1fr) !important;
            grid-template-rows: repeat(2, auto) !important;
            gap: 6px 4px !important;
            min-height: 148px !important;
          }
        }
      `}</style>

      {/* 🌟 7. Feierliche Erfolgs-Maske (XP & Übeminuten synchron mit Briefing Board KPIs) */}
      <GrooveSessionCelebrationModal
        isOpen={showCelebrationModal}
        xpEarned={sessionAccumulatedXp > 0 ? sessionAccumulatedXp : awardedRoundXp}
        practiceSeconds={sessionActiveSecondsRef.current > 0 ? sessionActiveSecondsRef.current : 60}
        accuracy={totalHits > 0 ? Math.round(scoreSum / totalHits) : 0}
        maxStreak={bestStreak}
        bpm={bpm}
        levelName={activeTitle}
        studentName={student?.name || student?.first_name || 'Musiker'}
        radarLevelUp={radarLevelUpCelebration}
        onPlayAgain={() => {
          setShowCelebrationModal(false);
          setRadarLevelUpCelebration(null);
          setSessionCompleted(false);
          setTimeout(() => handleTogglePlay(), 100);
        }}
        onClose={() => {
          setShowCelebrationModal(false);
          setRadarLevelUpCelebration(null);
        }}
      />
    </div>
  );
};
