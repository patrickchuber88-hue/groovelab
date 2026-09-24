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
  Settings,
  Mic,
  MicOff
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
import { UniversalLatencyEngine } from '../../utils/universalLatencyEngine';
import { AcousticOnsetEngine } from '../../services/audio/AcousticOnsetEngine';
import { WebMidiEngine } from '../../services/audio/WebMidiEngine';
import { AudioSettingsSheet } from '../student/meisterwerk/AudioSettingsSheet';

export interface GrooveTrainerProps {
  student?: any;
  onClose?: () => void;
  onExitToBriefing?: () => void;
  onRewardXp?: (xp: number, durationSeconds?: number) => void;
  initialBpm?: number;
  uiLevel?: 'junior' | 'teen' | 'pro';
  embedded?: boolean;
  useNotebookLayout?: boolean;
  homeworkNotesList?: string[];
}

export type RhythmLevel = 'viertel' | 'rock_mix' | 'synkopen' | 'galopp' | 'latin_bossa' | 'funk_master' | 'shuffle' | 'random_groove';
type TrainingMode = 'echo' | 'ghost';
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
  onExitToBriefing,
  onRewardXp,
  initialBpm = 85,
  uiLevel = 'teen',
  embedded = false,
  useNotebookLayout = false,
  homeworkNotesList
}) => {
  const [selectedLevel, setSelectedLevel] = useState<RhythmLevel>('viertel');
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('echo');
  const [soundKit, setSoundKit] = useState<SoundKitType>('acoustic');
  const [bpm, setBpm] = useState<number>(initialBpm);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBassEnabled, setIsBassEnabled] = useState<boolean>(true);
  const [isProMode, setIsProMode] = useState<boolean>(false);
  const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState<boolean>(false);

  // 🌟 1% Goldstandard 2026: Multi-Modal Input Engine (Hands-free Klatschen / Touch / MIDI)
  const [inputMode, setInputMode] = useState<'acoustic' | 'touch' | 'midi'>('acoustic');
  const [micLevel, setMicLevel] = useState<number>(0);
  const [isMicListening, setIsMicListening] = useState<boolean>(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState<boolean>(false);
  const [micShockwave, setMicShockwave] = useState<boolean>(false);
  // 1% Best Practice: Standardmäßig STUMM bei Klatschen, da Hände bereits die reale Schallquelle sind (verhindert Puffer-Latenz-Echo)
  const [playDrumSoundOnClap, setPlayDrumSoundOnClap] = useState<boolean>(false);
  const [isMidiConnected, setIsMidiConnected] = useState<boolean>(false);
  const [midiDevices, setMidiDevices] = useState<string[]>([]);

  // Persistent Student XP & Session Vault Accumulator (Synchronized with Ground Truth)
  const [studentBaseXp, setStudentBaseXp] = useState<number>(() => {
    if (typeof window !== 'undefined' && student?.id) {
      try {
        const cachedBonus = localStorage.getItem(`campus_bonus_xp_${student.id}`);
        if (cachedBonus !== null) {
          const parsed = parseInt(cachedBonus, 10);
          if (!isNaN(parsed) && parsed >= 0) return parsed;
        }
        const off = JSON.parse(localStorage.getItem(`cg_offline_stats_${student.id}`) || 'null');
        if (typeof off?.current_xp === 'number') return off.current_xp;
        const offPractice = JSON.parse(localStorage.getItem(`cg_offline_practice_${student.id}`) || 'null');
        if (typeof offPractice?.xp === 'number') return offPractice.xp;
      } catch (_) {}
    }
    const dbXp = student?.campus_xp ?? student?.xp;
    return typeof dbXp === 'number' ? dbXp : 0;
  });
  const [sessionAccumulatedXp, setSessionAccumulatedXp] = useState<number>(0);

  // Sync studentBaseXp authoritatively from avatars & student_stats
  useEffect(() => {
    if (!student?.id) return;
    let isMounted = true;
    const fetchLatestXp = async () => {
      try {
        const [{ data: avData }, { data: statsData }] = await Promise.all([
          supabase
            .from('avatars')
            .select('xp')
            .or(`user_id.eq.${student.id},student_id.eq.${student.id}`)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('student_stats')
            .select('current_xp')
            .eq('student_id', student.id)
            .maybeSingle()
        ]);
        if (!isMounted) return;
        const actualXp = Math.max(
          avData?.xp || 0,
          statsData?.current_xp || 0,
          student?.campus_xp || 0,
          student?.xp || 0
        );
        setStudentBaseXp(actualXp);
        localStorage.setItem(`campus_bonus_xp_${student.id}`, String(actualXp));
      } catch (_) {}
    };
    fetchLatestXp();
    return () => {
      isMounted = false;
    };
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

  // Hardware Latency Calibration state (in milliseconds) with Universal Platform SSOT
  const [latencyOffsetMs, setLatencyOffsetMs] = useState<number>(() => {
    return UniversalLatencyEngine.getLatencyMs();
  });

  // 🔄 Cross-Module Realtime Latency Sync
  useEffect(() => {
    return UniversalLatencyEngine.subscribe((newMs) => {
      setLatencyOffsetMs(newMs);
      // Synchronize acoustic onset offset proportionally with calibrated hardware latency
      setAcousticLatencyOffsetMs(Math.max(10, Math.min(60, Math.round(newMs * 0.4))));
    });
  }, []);

  // 🎙️ 1% Goldstandard 2026: Dedicated Hardware Microphone Capture Latency (SSOT)
  // Reale WebAudio Buffer-Laufzeit (512 Samples @ 48kHz = 10.67ms) + OS CoreAudio/WASAPI Driver (~3.33ms) = 14ms
  const [acousticLatencyOffsetMs, setAcousticLatencyOffsetMs] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('campus_acoustic_latency_offset');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 80) return parsed;
      }
    } catch (_) {}
    return 14;
  });

  const [isBluetoothDetected, setIsBluetoothDetected] = useState<boolean>(false);
  const [showAudioSettingsSheet, setShowAudioSettingsSheet] = useState<boolean>(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const trainerStateRef = useRef<'idle' | 'counting_in' | 'playing' | 'finishing'>('idle');
  const playbackStartTimeRef = useRef<number>(0);
  const nextBeatTimeRef = useRef<number>(0);
  const currentStepRef = useRef<number>(0);
  const barCountRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const completionCooldownRef = useRef<number>(0);
  const stopCooldownRef = useRef<number>(0);
  const lastScoredStepRef = useRef<number>(-1);
  const autoOffsetBufferRef = useRef<number[]>([]);

  // 🛡️ Stabile Refs für Score & Stats, damit der Audio-Scheduler niemals mitten in der Session neu instanziiert wird
  const totalHitsRef = useRef<number>(0);
  const scoreSumRef = useRef<number>(0);
  const bestStreakRef = useRef<number>(0);
  const currentStreakRef = useRef<number>(0);

  // 🛡️ Stabile Refs für Callbacks, um unnötige Neuinstanziierungen und Lifecycle-Cleanups abzuwehren
  const onRewardXpRef = useRef(onRewardXp);
  useEffect(() => {
    onRewardXpRef.current = onRewardXp;
  }, [onRewardXp]);

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
  const countInStartTimeRef = useRef<number>(0);
  const countInSecPerBeatRef = useRef<number>(0);
  const countInOffsetsRef = useRef<number[]>([]);
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

  // Hardware Latency Auto-Detection & Platform SSOT Sync
  useEffect(() => {
    let isMounted = true;
    const initHardwareLatency = async () => {
      try {
        const ctx = getAudioContext();
        const detectedInfo = UniversalLatencyEngine.getDeviceInfo(ctx);
        if (detectedInfo.isBluetoothSuspected && isMounted) {
          setIsBluetoothDetected(true);
        }
        if (isMounted) {
          const lat = UniversalLatencyEngine.getLatencyMs(ctx);
          setLatencyOffsetMs(lat);
          setCalibrationSource(detectedInfo.isBluetoothSuspected ? 'bluetooth' : 'loopstation');
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

    // 🛡️ Safari WebKit Hardening: AudioParam Zeitstempel dürfen niemals in der Vergangenheit liegen
    const safeTime = Math.max(ctx.currentTime + 0.005, time);

    const soundDuration = type === 'kick' ? 0.18 : (type === 'snare' ? 0.14 : (type === 'hihat' ? 0.05 : 0.04));

    // 🛡️ Anti-Bleed Metronom Click-Masking für Mikrofon/Klatschen mit voller Sound-Dauer
    try {
      AcousticOnsetEngine.getInstance().registerScheduledClick(safeTime, soundDuration);
    } catch (_) {}

    // 🎙️ 1% Goldstandard: Backing-Track Gain-Scaling im Akustik-Modus
    // Lautsprecher-Bleed am Mikrofon wird unter 0.08 gedrückt, während Klatschen bei 0.40–0.85 liegt (16 dB SNR-Abstand!)
    const volumeScale = inputMode === 'acoustic' ? 0.40 : 1.0;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volumeScale, safeTime);
    masterGain.connect(ctx.destination);

    try {
      if (soundKit === 'acoustic') {
        if (type === 'kick') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(accent ? 150 : 120, safeTime);
          osc.frequency.exponentialRampToValueAtTime(36, safeTime + 0.13);
          gain.gain.setValueAtTime(0.95, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.15);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(safeTime);
          osc.stop(safeTime + 0.16);
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
          gain.gain.setValueAtTime(accent ? 0.78 : 0.55, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.12);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          noise.start(safeTime);
          noise.stop(safeTime + 0.13);
        } else if (type === 'hihat') {
          const osc = ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.setValueAtTime(8400, safeTime);
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 7600;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(accent ? 0.38 : 0.20, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.045);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          osc.start(safeTime);
          osc.stop(safeTime + 0.05);
        } else {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(accent ? 1760 : 880, safeTime);
          gain.gain.setValueAtTime(accent ? 0.65 : 0.4, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, safeTime + 0.03);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(safeTime);
          osc.stop(safeTime + 0.035);
        }
      } else if (soundKit === 'body_percussion') {
        if (type === 'kick') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(95, safeTime);
          osc.frequency.exponentialRampToValueAtTime(28, safeTime + 0.14);
          gain.gain.setValueAtTime(0.9, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.15);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(safeTime);
          osc.stop(safeTime + 0.16);
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
          gain.gain.setValueAtTime(accent ? 0.85 : 0.6, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.08);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          noise.start(safeTime);
          noise.stop(safeTime + 0.09);
        } else if (type === 'hihat') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(2500, safeTime);
          gain.gain.setValueAtTime(0.35, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.025);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(safeTime);
          osc.stop(safeTime + 0.03);
        } else {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, safeTime);
          gain.gain.setValueAtTime(0.5, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.03);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(safeTime);
          osc.stop(safeTime + 0.035);
        }
      } else if (soundKit === 'urban_808') {
        if (type === 'kick') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(accent ? 130 : 100, safeTime);
          osc.frequency.exponentialRampToValueAtTime(38, safeTime + 0.24);
          gain.gain.setValueAtTime(1.0, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.26);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(safeTime);
          osc.stop(safeTime + 0.28);
        } else if (type === 'snare') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(280, safeTime);
          gain.gain.setValueAtTime(0.7, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.08);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(safeTime);
          osc.stop(safeTime + 0.09);
        } else if (type === 'hihat') {
          const osc = ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.setValueAtTime(9500, safeTime);
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 8500;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.3, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.025);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          osc.start(safeTime);
          osc.stop(safeTime + 0.03);
        } else {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, safeTime);
          gain.gain.setValueAtTime(0.5, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.03);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(safeTime);
          osc.stop(safeTime + 0.035);
        }
      } else {
        if (type === 'kick') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(180, safeTime);
          osc.frequency.exponentialRampToValueAtTime(90, safeTime + 0.16);
          gain.gain.setValueAtTime(0.85, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.18);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(safeTime);
          osc.stop(safeTime + 0.2);
        } else if (type === 'snare') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(460, safeTime);
          osc.frequency.exponentialRampToValueAtTime(210, safeTime + 0.09);
          gain.gain.setValueAtTime(0.8, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.1);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(safeTime);
          osc.stop(safeTime + 0.11);
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
          gain.gain.setValueAtTime(0.3, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.045);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          noise.start(safeTime);
          noise.stop(safeTime + 0.05);
        } else {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, safeTime);
          gain.gain.setValueAtTime(0.5, safeTime);
          gain.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.03);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(safeTime);
          osc.stop(safeTime + 0.035);
        }
      }
    } catch (_) {}
  }, [getAudioContext, inputMode, isMuted, soundKit]);

  // Groovy Synthesized Bassline (Play-Along Companion)
  const playBassNote = useCallback((pitchHz: number, time: number, duration: number = 0.2) => {
    if (isMuted || !isBassEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const safeTime = Math.max(ctx.currentTime + 0.005, time);

    // 🛡️ Anti-Bleed Click-Masking für Bassnote
    try {
      AcousticOnsetEngine.getInstance().registerScheduledClick(safeTime, duration);
    } catch (_) {}

    const bassScale = inputMode === 'acoustic' ? 0.35 : 1.0;

    try {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(pitchHz, safeTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, safeTime);
      filter.frequency.exponentialRampToValueAtTime(220, safeTime + duration);
      filter.Q.value = 4.0;

      gain.gain.setValueAtTime(0.32 * bassScale, safeTime);
      gain.gain.exponentialRampToValueAtTime(0.001, safeTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(safeTime);
      osc.stop(safeTime + duration + 0.05);
    } catch (_) {}
  }, [getAudioContext, inputMode, isBassEnabled, isMuted]);

  // Round completion: Accumulate into Session Vault & engage 1.2s restart protection cooldown
  const handleFinishSession = useCallback(() => {
    isRunningRef.current = false;
    trainerStateRef.current = 'finishing';
    setIsPlaying(false);
    setIsCountingIn(false);
    setSessionCompleted(true);
    setShowCelebrationModal(true); // 🌟 1% Goldstandard 2026: Automatisches Popup der Meisterleistung bei Taktende
    completionCooldownRef.current = Date.now() + 1200; // 🛡️ 1.2s Cooldown-Schutz vor Reflex-Taps
    setTimeout(() => {
      if (trainerStateRef.current === 'finishing') {
        trainerStateRef.current = 'idle';
      }
    }, 1200);
    
    const hitsCount = totalHitsRef.current;
    const sum = scoreSumRef.current;
    const streak = bestStreakRef.current;
    const accuracy = hitsCount > 0 ? Math.round(sum / hitsCount) : 0;
    
    // 1. Stufen-Basis nach Genauigkeit
    let baseRoundXp = accuracy >= 90 ? 50 : (accuracy >= 75 ? 35 : (accuracy >= 50 ? 20 : 5));

    // 2. Makelloser Pocket-Streak Bonus (+10 XP bei hoher Trefferserie)
    const streakBonus = (streak >= 10 && hitsCount >= 10) ? 10 : 0;

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
      streak,
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
          const maxAnyStreak = Math.max(...scoresList.map(s => s.max_streak || 0), streak);

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
  }, [activeLevelConfig.defaultBpm, activeLevelConfig.multiplier, bpm, selectedLevel, student?.id, student?.instrument]);

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

          // 3. Update avatars table (authoritative SSOT for XP)
          let nextAvXp = updated;
          try {
            const { data: avData } = await supabase
              .from('avatars')
              .select('xp')
              .or(`user_id.eq.${student.id},student_id.eq.${student.id}`)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            const currentAvXp = avData?.xp || 0;
            nextAvXp = currentAvXp + xpToCommit;
            await supabase
              .from('avatars')
              .update({
                xp: nextAvXp,
                updated_at: nowIso
              })
              .or(`user_id.eq.${student.id},student_id.eq.${student.id}`);
          } catch (_) {}

          // 4. Update student_stats table
          let nextStatsXp = updated;
          try {
            const { data: statsRecord } = await supabase
              .from('student_stats')
              .select('current_xp, total_focus_minutes')
              .eq('student_id', student.id)
              .maybeSingle();
            nextStatsXp = (statsRecord?.current_xp || 0) + xpToCommit;
            const currentFocusMins = (statsRecord?.total_focus_minutes || 0) + minutesToAdd;
            await supabase
              .from('student_stats')
              .upsert({
                student_id: student.id,
                current_xp: nextStatsXp,
                total_focus_minutes: currentFocusMins,
                updated_at: nowIso
              }, { onConflict: 'student_id' });
          } catch (_) {}

          // 5. Update students practice_minutes_today
          try {
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
          } catch (_) {}

          // 6. Reconcile authoritative total XP to localStorage & local state
          const authoritativeTotalXp = Math.max(nextAvXp, nextStatsXp);
          localStorage.setItem(`campus_bonus_xp_${student.id}`, String(authoritativeTotalXp));
          setStudentBaseXp(authoritativeTotalXp);
        } catch (err) {
          console.warn('[GrooveTrainer] Practice minutes & XP sync note:', err);
        }
      })();
    }

    if (onRewardXpRef.current) {
      onRewardXpRef.current(xpToCommit, secondsToCommit);
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
  }, [student?.id]);

  // 🛡️ Stabile Ref für commitSessionData, damit der Unmount-Hook niemals während Re-Rendern feuert
  const commitSessionDataRef = useRef(commitSessionData);
  useEffect(() => {
    commitSessionDataRef.current = commitSessionData;
  }, [commitSessionData]);

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
      isRunningRef.current = false;
      trainerStateRef.current = 'idle';
      if (countInTimerRef.current) {
        clearTimeout(countInTimerRef.current);
        countInTimerRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      commitSessionDataRef.current?.();
    };
  }, []); // 🛡️ CRITICAL: Leeres Dependency-Array garantiert Ausführung NUR beim echten Unmounten!

  // Audio Scheduler Loop
  const scheduleAudioEvents = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx || !isRunningRef.current || trainerStateRef.current !== 'playing') return;

    const scheduleAheadTime = 0.15;
    const subCount = activeLevelConfig.subdivisions;
    const secondsPerSub = (60 / bpm) / (subCount / 4);

    // 🛡️ Anti-Instant-Flush Guard: Verhindere 16-Takt-Schleifendurchlauf bei Tab-Wechsel oder CPU-Jitter
    if (nextBeatTimeRef.current < ctx.currentTime - 0.4) {
      nextBeatTimeRef.current = ctx.currentTime + 0.02;
    }

    let loopGuard = 0;
    while (nextBeatTimeRef.current < ctx.currentTime + scheduleAheadTime && loopGuard < subCount * 2) {
      loopGuard++;
      const scheduledTime = nextBeatTimeRef.current;
      const stepIdx = currentStepRef.current;
      const barIdx = barCountRef.current;

      let isCall = false;
      let shouldMuteLeadDrums = false;
      let shouldMuteAllAudio = false;

      if (trainingMode === 'echo') {
        // 🎧 Echo-Modus (Standard): Takt 1 (barIdx % 2 === 0) ist die hörbare Groove-Phase.
        // Takt 2 (barIdx % 2 === 1) ist die stumme Echo-Phase (100% stumm, rein visuelle Führung).
        isCall = (barIdx % 2 === 0);
        shouldMuteAllAudio = !isCall;
      } else if (trainingMode === 'ghost') {
        // 👻 Geister-Beat (Alternativ): Nach dem 4-Beat-Vorzähler macht der Trainer KEINE Geräusche mehr!
        isCall = false;
        shouldMuteAllAudio = true;
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
          break;
        }
      }
    }
  }, [activeLevelConfig, activeTargetPattern, bpm, getAudioContext, handleFinishSession, isBassEnabled, playBassNote, playDrumSound, rollNewRandomGroove, selectedLevel, trainingMode]);

  // 🎯 Stabile Ref für scheduleAudioEvents, damit der Scheduler ohne Drift und ohne Re-Creation der Intervalle läuft
  const scheduleAudioEventsRef = useRef(scheduleAudioEvents);
  useEffect(() => {
    scheduleAudioEventsRef.current = scheduleAudioEvents;
  }, [scheduleAudioEvents]);

  const startActualPlayback = useCallback((anchorTime?: number) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    isRunningRef.current = true;
    trainerStateRef.current = 'playing';
    // 🛡️ PWA / Mobile Fix: Verhindere Vergangenheits-Anchors durch setTimeout-Jitter auf Mobilgeräten!
    const safeAnchor = Math.max(ctx.currentTime + 0.02, anchorTime || (ctx.currentTime + 0.03));
    playbackStartTimeRef.current = safeAnchor;
    nextBeatTimeRef.current = safeAnchor;
    currentStepRef.current = 0;
    barCountRef.current = 0;
    totalHitsRef.current = 0;
    scoreSumRef.current = 0;
    bestStreakRef.current = 0;
    currentStreakRef.current = 0;
    lastScoredStepRef.current = -1;
    setPocketStreak(0);
    setTotalHits(0);
    setScoreSum(0);
    setPerfectHits(0);
    setSessionHits([]);
    autoOffsetBufferRef.current = [];

    // 🎙️ 1% Goldstandard: Pre-Roll Auto-Kalibrierung auswerten
    if (countInOffsetsRef.current.length >= 2) {
      const sortedOffsets = [...countInOffsetsRef.current].sort((a, b) => a - b);
      const medianPreRollOffset = sortedOffsets[Math.floor(sortedOffsets.length / 2)];
      if (medianPreRollOffset > 0 && medianPreRollOffset <= 30) {
        setAcousticLatencyOffsetMs(prev => Math.min(32, Math.max(8, prev + Math.round(medianPreRollOffset * 0.4))));
      }
    }
    countInOffsetsRef.current = [];

    setSessionCompleted(false);
    setTimingOffsetMs(null);
    setLastRating(null);
    setIsCountingIn(false);
    setIsPlaying(true);

    // 🚀 Direct Synchronous Engine Kickoff: Sofort die ersten Audio-Events in den Web Audio Graph einphasen!
    if (scheduleAudioEventsRef.current) {
      scheduleAudioEventsRef.current();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerIntervalRef.current = window.setInterval(() => {
      if (scheduleAudioEventsRef.current) {
        scheduleAudioEventsRef.current();
      }
    }, 25);
  }, [getAudioContext]);

  useEffect(() => {
    if (!isPlaying) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }
    // Fallback: If not already active, ensure interval is running
    if (!timerIntervalRef.current) {
      timerIntervalRef.current = window.setInterval(() => {
        if (scheduleAudioEventsRef.current) {
          scheduleAudioEventsRef.current();
        }
      }, 25);
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isPlaying]);

  const startCountIn = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (countInTimerRef.current) {
      clearTimeout(countInTimerRef.current);
      countInTimerRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    isRunningRef.current = true;
    trainerStateRef.current = 'counting_in';
    setIsCountingIn(true);
    setCountInBeat(1);
    setSessionCompleted(false);
    setTimingOffsetMs(null);
    setLastRating(null);

    const secPerBeat = 60 / bpm;
    const startTime = ctx.currentTime + 0.05;
    countInStartTimeRef.current = startTime;
    countInSecPerBeatRef.current = secPerBeat;
    countInOffsetsRef.current = [];

    // Schedule 4 count-in clicks
    for (let b = 0; b < 4; b++) {
      const beatTime = startTime + b * secPerBeat;
      playDrumSound('click', beatTime, b === 0);
      setTimeout(() => {
        if (!isRunningRef.current || trainerStateRef.current !== 'counting_in') return;
        setCountInBeat(b + 1);
      }, Math.max(0, (beatTime - ctx.currentTime) * 1000));
    }

    // Audio-Clock-synchroner Übergang: Starte exakt 30ms vor Schlag 1 von Takt 1
    const targetTransitionTime = startTime + 4 * secPerBeat;
    const transitionDelayMs = Math.max(20, (targetTransitionTime - ctx.currentTime - 0.03) * 1000);

    countInTimerRef.current = setTimeout(() => {
      countInTimerRef.current = null;
      if (!isRunningRef.current || trainerStateRef.current !== 'counting_in') return;
      startActualPlayback(targetTransitionTime);
    }, transitionDelayMs);
  }, [bpm, getAudioContext, playDrumSound, startActualPlayback]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying || isCountingIn || trainerStateRef.current === 'playing' || trainerStateRef.current === 'counting_in') {
      stopCooldownRef.current = Date.now() + 1000; // 🛡️ 1.000ms absolute Ignorier-Sperre nach Stop
      isRunningRef.current = false;
      trainerStateRef.current = 'idle';
      lastScoredStepRef.current = -1;
      if (countInTimerRef.current) {
        clearTimeout(countInTimerRef.current);
        countInTimerRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
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
   * 1% Goldstandard: Akzeptiert Mikrofon-Transienten, MIDI & Touch Timestamps
   */
  const handleUserTap = useCallback((customTimestampSec?: number, isIntentionalClapStart: boolean = false) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // 🛡️ 1. Absolute Stop-Cooldown Sperre: Nach Klick auf Stop alle Events verwerfen
    if (Date.now() < stopCooldownRef.current) {
      return;
    }

    // 🎯 2. Unblocked Start: Wenn der Trainer noch idle ist, startet ein MANUELLER Tap sofort den Einzähler
    // ODER ein bewusster Handklatsch (isIntentionalClapStart === true)!
    if (trainerStateRef.current === 'idle' && !isPlaying && !isCountingIn) {
      if (customTimestampSec !== undefined && !isIntentionalClapStart) {
        return;
      }
      setSessionCompleted(false);
      setShowCelebrationModal(false);
      startCountIn();
      return;
    }

    // 🛡️ 3. Wenn der Trainer nicht aktiv ist (weder counting_in noch playing), sofort abbrechen
    if (trainerStateRef.current !== 'playing' && trainerStateRef.current !== 'counting_in') {
      return;
    }

    // 🛡️ 4. PWA / Mobile Fix: Wenn der Einzähler läuft, darf ein Tap den Trainer NIEMALS abbrechen!
    // Schüler tippen im Vorzähler oft mit oder antizipieren Schlag 1. Wir geben taktiles & auditives Feedback!
    if (trainerStateRef.current === 'counting_in' || isCountingIn) {
      if (playDrumSoundOnClap || inputMode !== 'acoustic') {
        playDrumSound('snare', ctx.currentTime, false);
      }
      setIsPadPressed(true);
      setTimeout(() => setIsPadPressed(false), 80);

      // 🎙️ 1% Goldstandard: Pre-Roll Auto-Kalibrierung bei Vorzähler-Schlägen
      if (inputMode === 'acoustic' && countInStartTimeRef.current > 0 && countInSecPerBeatRef.current > 0) {
        const tapTime = customTimestampSec !== undefined ? customTimestampSec : ctx.currentTime;
        const elapsedSinceCountIn = tapTime - countInStartTimeRef.current;
        const nearestBeatIdx = Math.round(elapsedSinceCountIn / countInSecPerBeatRef.current);
        if (nearestBeatIdx >= 0 && nearestBeatIdx <= 3) {
          const expectedBeatTime = countInStartTimeRef.current + (nearestBeatIdx * countInSecPerBeatRef.current);
          const offsetMs = Math.round((tapTime - expectedBeatTime) * 1000);
          if (Math.abs(offsetMs) < 140) {
            countInOffsetsRef.current.push(offsetMs);
          }
        }
      }
      return;
    }

    // 🛡️ 5. Wenn während des Spiels der 1.2s Cooldown aktiv ist -> ignorieren
    if (Date.now() < completionCooldownRef.current) {
      return;
    }

    const now = customTimestampSec !== undefined ? customTimestampSec : ctx.currentTime;

    // 🛡️ Guard im Echo-Modus: Im Groove-Takt (Takt 1, 3, 5... bzw. isCallPhase) keine Fehlschläge oder Punkte werten!
    if (trainingMode === 'echo' && isCallPhase) {
      // Nur akustischen/visuellen Feedback-Sound spielen, aber keine Wertung oder Streak-Zerstörung!
      if (playDrumSoundOnClap || inputMode !== 'acoustic') {
        playDrumSound('snare', now, false);
      }
      setIsPadPressed(true);
      setTimeout(() => setIsPadPressed(false), 100);
      return;
    }

    const subCount = activeLevelConfig.subdivisions;
    const secondsPerSub = (60 / bpm) / (subCount / 4);
    
    // Latency compensated tap timestamp:
    // 1% Goldstandard: Im Akustik-Modus wird die reale Mikrofon-Puffer-Latenz (~14ms)
    // anstelle der 70ms Touchscreen/Tastatur-Verzögerung verwendet!
    const effectiveLatencyMs = inputMode === 'acoustic' ? acousticLatencyOffsetMs : latencyOffsetMs;
    const latencySec = effectiveLatencyMs / 1000;
    const effectiveTapTime = now - latencySec;
    const elapsedSinceStart = effectiveTapTime - playbackStartTimeRef.current;

    // Musikalische Vorwegnahme von Schlag 1 tolerant zulassen (bis zu einer halben Subdivision vor Taktbeginn)
    if (elapsedSinceStart < -secondsPerSub * 0.6) return;

    // Mathematical Quantizer
    const nearestStepIndex = Math.max(0, Math.round(elapsedSinceStart / secondsPerSub));

    // 🛡️ Anti-Double-Trigger & Echo-Schutz: Jeder Takt-Schritt kann pro Durchlauf nur EINMAL gewertet werden!
    if (lastScoredStepRef.current === nearestStepIndex) {
      return;
    }
    lastScoredStepRef.current = nearestStepIndex;

    const targetTime = playbackStartTimeRef.current + (nearestStepIndex * secondsPerSub);
    const rawDiffSec = effectiveTapTime - targetTime;
    const rawDiffMs = Math.round(rawDiffSec * 1000);

    // 🎯 Tier-1 SaaS Enterprise+ Auto-Centering Engine (Rolling Hardware Offset)
    // Wenn der Nutzer sehr gleichmäßig spielt, aber ein konstanter Hardware-Versatz vorliegt,
    // ermitteln die ersten 3-5 Schläge den konstanten Versatz und kompensieren ihn unbemerkt.
    if (autoOffsetBufferRef.current.length < 5 && Math.abs(rawDiffMs) < 160) {
      autoOffsetBufferRef.current.push(rawDiffMs);
      if (autoOffsetBufferRef.current.length >= 3) {
        const sorted = [...autoOffsetBufferRef.current].sort((a, b) => a - b);
        const medianOffset = sorted[Math.floor(sorted.length / 2)];
        // Wenn ein signifikanter Hardware-Trend (> 10ms) vorliegt, adaptieren:
        if (Math.abs(medianOffset) >= 10) {
          const adaptiveCorrection = Math.round(medianOffset * 0.70);
          if (inputMode === 'acoustic') {
            const newOffset = Math.max(0, Math.min(60, acousticLatencyOffsetMs + adaptiveCorrection));
            setAcousticLatencyOffsetMs(newOffset);
            try {
              localStorage.setItem('campus_acoustic_latency_offset', String(newOffset));
            } catch (_) {}
          } else {
            const newOffset = Math.max(0, Math.min(250, latencyOffsetMs + adaptiveCorrection));
            setLatencyOffsetMs(newOffset);
            try {
              localStorage.setItem('campus_timing_latency_offset', String(newOffset));
            } catch (_) {}
          }
        }
      }
    }

    const diffMs = rawDiffMs;
    setTimingOffsetMs(diffMs);
    
    // 🛡️ Stat-Refs synchron halten
    totalHitsRef.current += 1;
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

    if (playDrumSoundOnClap || inputMode !== 'acoustic') {
      playDrumSound(hitSoundType, now, isHitAccent);
    }

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

    // Multi-Tier Musician Grading Scale (1% Goldstandard: Musikalisch fair & touch/akustik-kalibriert)
    const absDiff = Math.abs(diffMs);
    let currentRating: 'pocket' | 'good' | 'rush' | 'drag' | 'miss' = 'miss';

    if (absDiff <= 44) {
      // 🌟 In the Pocket (Volle Punktzahl: 100)
      currentRating = 'pocket';
      setLastRating('pocket');
      setPerfectHits(prev => prev + 1);
      scoreSumRef.current += 100;
      setScoreSum(prev => prev + 100);
      currentStreakRef.current += 1;
      if (currentStreakRef.current > bestStreakRef.current) {
        bestStreakRef.current = currentStreakRef.current;
      }
      setPocketStreak(prev => {
        const next = prev + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
    } else if (absDiff <= 84) {
      // 🌟 Gut im Puls (Sehr solides Timing: 85)
      currentRating = 'good';
      setLastRating('good');
      scoreSumRef.current += 85;
      setScoreSum(prev => prev + 85);
      currentStreakRef.current += 1;
      if (currentStreakRef.current > bestStreakRef.current) {
        bestStreakRef.current = currentStreakRef.current;
      }
      setPocketStreak(prev => {
        const next = prev + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
    } else if (diffMs < -84 && diffMs >= -160) {
      // ⏩ Leicht vor dem Schlag (Rush: 55)
      currentRating = 'rush';
      setLastRating('rush');
      scoreSumRef.current += 55;
      setScoreSum(prev => prev + 55);
      currentStreakRef.current = 0;
      setPocketStreak(0);
    } else if (diffMs > 84 && diffMs <= 160) {
      // ⏪ Leicht nach dem Schlag (Drag: 55)
      currentRating = 'drag';
      setLastRating('drag');
      scoreSumRef.current += 55;
      setScoreSum(prev => prev + 55);
      currentStreakRef.current = 0;
      setPocketStreak(0);
    } else {
      // 💨 Daneben (Miss: 0)
      currentRating = 'miss';
      setLastRating('miss');
      scoreSumRef.current += 0;
      setScoreSum(prev => prev + 0);
      currentStreakRef.current = 0;
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

  }, [acousticLatencyOffsetMs, activeLevelConfig.subdivisions, activeTargetPattern, bpm, getAudioContext, inputMode, isCallPhase, isCountingIn, isPlaying, latencyOffsetMs, playDrumSound, playDrumSoundOnClap, startCountIn, trainingMode]);

  // 🎙️ 1% Goldstandard 2026: Acoustic Onset Lifecycle Controller (Klatschen / Instrument)
  useEffect(() => {
    if (inputMode !== 'acoustic') {
      AcousticOnsetEngine.getInstance().stop();
      setIsMicListening(false);
      setMicLevel(0);
      return;
    }

    const engine = AcousticOnsetEngine.getInstance();
    const ctx = getAudioContext();

    let isMounted = true;
    const startMic = async () => {
      try {
        const ok = await engine.start(ctx || undefined);
        if (isMounted) {
          if (ok) {
            setIsMicListening(true);
            setMicPermissionDenied(false);
          } else {
            setIsMicListening(false);
            setMicPermissionDenied(true);
          }
        }
      } catch (_) {
        if (isMounted) {
          setIsMicListening(false);
          setMicPermissionDenied(true);
        }
      }
    };

    startMic();

    const unsubOnset = engine.subscribeOnset((hit) => {
      if (sessionCompleted || Date.now() < completionCooldownRef.current || Date.now() < stopCooldownRef.current) return;

      // 👏 1% Goldstandard: Hands-Free Clap-to-Start im Ruhezustand (Idle)
      // Ein bewusster, energischer Handklatsch (hit.energy >= 0.42) startet den Trainer.
      // Leise Geräusche wie Mausklick, Tastatur oder Sprechen (< 0.30) werden zuverlässig ignoriert.
      if (trainerStateRef.current === 'idle') {
        const startClapThreshold = 0.42;
        if (hit.energy >= startClapThreshold) {
          setMicShockwave(true);
          setTimeout(() => setMicShockwave(false), 240);
          handleUserTap(hit.timestampSec, true);
        }
        return;
      }

      if (trainerStateRef.current !== 'playing' && trainerStateRef.current !== 'counting_in') return;
      setMicShockwave(true);
      setTimeout(() => setMicShockwave(false), 160);
      handleUserTap(hit.timestampSec, false);
    });

    const unsubLevel = engine.subscribeLevel((lvl) => {
      if (isMounted) {
        setMicLevel(lvl);
      }
    });

    return () => {
      isMounted = false;
      unsubOnset();
      unsubLevel();
      engine.stop();
      setIsMicListening(false);
      setMicLevel(0);
    };
  }, [inputMode, getAudioContext, handleUserTap, sessionCompleted]);

  // 🥁 1% Goldstandard 2026: Web-MIDI Lifecycle Controller (E-Drums & Masterkeyboards)
  useEffect(() => {
    if (inputMode !== 'midi') {
      WebMidiEngine.getInstance().stop();
      setIsMidiConnected(false);
      return;
    }

    const midiEngine = WebMidiEngine.getInstance();
    let isMounted = true;

    midiEngine.start().then(connected => {
      if (isMounted) {
        setIsMidiConnected(connected);
        setMidiDevices(midiEngine.getDeviceNames());
      }
    });

    const unsubMidi = midiEngine.subscribeHit((hit) => {
      if (sessionCompleted || Date.now() < completionCooldownRef.current || Date.now() < stopCooldownRef.current) return;
      if (trainerStateRef.current !== 'playing' && trainerStateRef.current !== 'counting_in') return;
      setMicShockwave(true);
      setTimeout(() => setMicShockwave(false), 140);
      handleUserTap(hit.timestampSec);
    });

    return () => {
      isMounted = false;
      unsubMidi();
      midiEngine.stop();
      setIsMidiConnected(false);
    };
  }, [inputMode, handleUserTap, sessionCompleted]);

  // Spacebar Keyboard Listener (mit Isolation für Texteingaben wie z.B. Nickname-Modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !showAudioSettingsSheet) {
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
        // 🛡️ Wenn das Erfolgs-Modal offen ist oder ein Cooldown aktiv ist, Leertaste ignorieren
        if (sessionCompleted || Date.now() < completionCooldownRef.current || Date.now() < stopCooldownRef.current) {
          return;
        }
        handleUserTap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUserTap, sessionCompleted, showAudioSettingsSheet]);

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
      height: '100%',
      maxHeight: '100%',
      margin: '0 auto',
      background: '#ffffff',
      borderRadius: isNotebook ? '24px' : '20px',
      border: '1.5px solid #e2e8f0',
      boxShadow: isNotebook ? '0 10px 30px -5px rgba(0, 0, 0, 0.05)' : '0 10px 25px rgba(0,0,0,0.04)',
      padding: isNotebook ? '12px 18px 12px 18px' : (embedded ? '10px 12px' : '12px 14px'),
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: isNotebook ? '8px' : '6px',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }} className="animate-fade-in">
      
      {/* 1. Header: Nahtlos in das Hausaufgabenheft integriert & Multi-Modal Switch */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
        padding: '0 2px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isNotebook ? '10px' : '8px' }}>
          <div style={{
            width: isNotebook ? '38px' : '32px',
            height: isNotebook ? '38px' : '32px',
            borderRadius: isNotebook ? '12px' : '10px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.28)',
            flexShrink: 0
          }}>
            <Radio size={isNotebook ? 19 : 16} color="#ffffff" strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{
                margin: 0,
                fontSize: isNotebook ? '1.14rem' : '1.02rem',
                fontWeight: 950,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                lineHeight: 1.15
              }}>
                Groove-Trainer
              </h3>
              {isNotebook && (
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: 900,
                  color: '#15803d',
                  background: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  padding: '2px 7px',
                  borderRadius: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <Sparkles size={10} color="#15803d" />
                  2026 Pro
                </span>
              )}
            </div>
            {isNotebook && (
              <p style={{ margin: '1px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 650 }}>
                16 Takte Rhythmus-Puls &amp; Mikro-Timing
              </p>
            )}
          </div>
        </div>

        {/* Multi-Modal Input Selector (Goldstandard 2026) */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          borderRadius: '12px',
          padding: '2px',
          gap: '2px',
          border: '1px solid #e2e8f0'
        }}>
          <button
            type="button"
            onClick={() => setInputMode('acoustic')}
            style={{
              border: 'none',
              borderRadius: '9px',
              padding: isNotebook ? '5px 10px' : '4px 8px',
              fontSize: isNotebook ? '0.74rem' : '0.68rem',
              fontWeight: inputMode === 'acoustic' ? 950 : 750,
              background: inputMode === 'acoustic' ? '#ffffff' : 'transparent',
              color: inputMode === 'acoustic' ? '#c2410c' : '#64748b',
              boxShadow: inputMode === 'acoustic' ? '0 1px 6px rgba(249, 115, 22, 0.25)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.12s ease'
            }}
            title="Klatschen, Schnipsen oder Instrument spielen (Hands-Free!)"
          >
            <Mic size={13} color={inputMode === 'acoustic' ? (isMicListening ? '#16a34a' : '#ea580c') : '#64748b'} strokeWidth={2.4} />
            <span>Klatschen</span>
            {inputMode === 'acoustic' && isMicListening && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#16a34a',
                boxShadow: '0 0 6px #16a34a'
              }} />
            )}
          </button>

          <button
            type="button"
            onClick={() => setInputMode('touch')}
            style={{
              border: 'none',
              borderRadius: '9px',
              padding: isNotebook ? '5px 10px' : '4px 8px',
              fontSize: isNotebook ? '0.74rem' : '0.68rem',
              fontWeight: inputMode === 'touch' ? 950 : 750,
              background: inputMode === 'touch' ? '#ffffff' : 'transparent',
              color: inputMode === 'touch' ? '#c2410c' : '#64748b',
              boxShadow: inputMode === 'touch' ? '0 1px 6px rgba(249, 115, 22, 0.25)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.12s ease'
            }}
            title="Touch auf Display oder Tastatur (Leertaste)"
          >
            <Target size={13} color={inputMode === 'touch' ? '#ea580c' : '#64748b'} strokeWidth={2.4} />
            <span>Touch / Taste</span>
          </button>

          {typeof navigator !== 'undefined' && Boolean((navigator as any).requestMIDIAccess) && (
            <button
              type="button"
              onClick={() => setInputMode('midi')}
              style={{
                border: 'none',
                borderRadius: '9px',
                padding: isNotebook ? '5px 10px' : '4px 8px',
                fontSize: isNotebook ? '0.74rem' : '0.68rem',
                fontWeight: inputMode === 'midi' ? 950 : 750,
                background: inputMode === 'midi' ? '#ffffff' : 'transparent',
                color: inputMode === 'midi' ? '#c2410c' : '#64748b',
                boxShadow: inputMode === 'midi' ? '0 1px 6px rgba(249, 115, 22, 0.25)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.12s ease'
              }}
              title="E-Drums oder MIDI-Keyboard anschließen (0ms Latenz)"
            >
              <Music size={13} color={inputMode === 'midi' ? '#ea580c' : '#64748b'} strokeWidth={2.4} />
              <span>MIDI</span>
            </button>
          )}
        </div>

        {/* Header Right: Glänzendes XP-Pill & Micro-Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* ⚡ XP-Anzeige */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1.5px solid #fde68a',
            padding: isNotebook ? '4px 9px' : '3px 7px',
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.10)'
          }} title="Gesammelte XP">
            <Zap size={isNotebook ? 13 : 12} fill="#d97706" color="#d97706" />
            <span style={{ fontSize: isNotebook ? '0.78rem' : '0.72rem', fontWeight: 950, color: '#92400e' }}>
              {studentBaseXp + sessionAccumulatedXp} XP
            </span>
          </div>

          {/* Klangkiste (Tools) */}
          <button
            type="button"
            onClick={() => setIsSoundSettingsOpen(!isSoundSettingsOpen)}
            style={{
              background: isSoundSettingsOpen ? '#fffbeb' : '#f8fafc',
              border: isSoundSettingsOpen ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
              color: isSoundSettingsOpen ? '#b45309' : '#64748b',
              borderRadius: isNotebook ? '10px' : '8px',
              padding: isNotebook ? '4px 9px' : '0',
              width: isNotebook ? 'auto' : '30px',
              height: isNotebook ? '32px' : '30px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
            title="Klangkiste (Tools für Sound, Tempo, Spielmodi & Latenz)"
          >
            <SlidersHorizontal size={13} color={isSoundSettingsOpen ? '#b45309' : '#64748b'} />
            {isNotebook && (
              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: isSoundSettingsOpen ? '#b45309' : '#475569' }}>
                Tools
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
                onClick={() => setTrainingMode('echo')}
                style={{
                  flex: 1,
                  border: 'none',
                  background: trainingMode === 'echo' ? '#fffbeb' : 'transparent',
                  color: trainingMode === 'echo' ? '#92400e' : '#64748b',
                  borderRadius: '7px',
                  padding: '5px 8px',
                  fontSize: '0.68rem',
                  fontWeight: trainingMode === 'echo' ? 950 : 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Headphones size={11} color={trainingMode === 'echo' ? '#d97706' : '#64748b'} />
                <span>Echo (Standard)</span>
              </button>
              <button
                type="button"
                onClick={() => setTrainingMode('ghost')}
                style={{
                  flex: 1,
                  border: 'none',
                  background: trainingMode === 'ghost' ? '#ede9fe' : 'transparent',
                  color: trainingMode === 'ghost' ? '#6d28d9' : '#64748b',
                  borderRadius: '7px',
                  padding: '5px 8px',
                  fontSize: '0.68rem',
                  fontWeight: trainingMode === 'ghost' ? 950 : 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Clock size={11} color={trainingMode === 'ghost' ? '#6d28d9' : '#64748b'} />
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
                onClick={() => setShowAudioSettingsSheet(true)}
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
                title={`Hardware-Latenz & Kalibrierung (${inputMode === 'acoustic' ? acousticLatencyOffsetMs : latencyOffsetMs}ms)`}
                aria-label="Audio-Latenz & Kalibrierung öffnen"
              >
                {isBluetoothDetected ? (
                  <Bluetooth size={13} color="#1d4ed8" />
                ) : (
                  <Settings size={13} color="#64748b" />
                )}
                <span>{inputMode === 'acoustic' ? acousticLatencyOffsetMs : latencyOffsetMs}ms</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 FOKUS-ZONE 1: DIE 8 RHYTHMUS-WELTEN (KOMPAKTES 8er-RIBBON) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isNotebook ? 'repeat(8, 1fr)' : 'repeat(4, 1fr)',
        gap: '4px',
        background: '#f8fafc',
        padding: isNotebook ? '4px' : '6px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        flexShrink: 0
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
                borderRadius: '10px',
                padding: isNotebook ? '5px 2px' : '6px 2px',
                cursor: 'pointer',
                boxShadow: isSel ? '0 2px 8px rgba(217, 119, 6, 0.16)' : 'none',
                transition: 'all 0.12s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
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
                {lvl.id === 'viertel' && <CircleDot size={14} strokeWidth={2.6} />}
                {lvl.id === 'rock_mix' && <Music size={14} strokeWidth={2.6} />}
                {lvl.id === 'synkopen' && <Activity size={14} strokeWidth={2.6} />}
                {lvl.id === 'galopp' && <Zap size={14} strokeWidth={2.6} />}
                {lvl.id === 'latin_bossa' && <Sun size={14} strokeWidth={2.6} />}
                {lvl.id === 'funk_master' && <Sparkles size={14} strokeWidth={2.6} />}
                {lvl.id === 'shuffle' && <Shuffle size={14} strokeWidth={2.6} />}
                {lvl.id === 'random_groove' && <Dices size={14} strokeWidth={2.6} />}
              </div>
              <div style={{
                fontSize: isNotebook ? '0.72rem' : '0.70rem',
                fontWeight: 950,
                color: isSel ? '#92400e' : '#0f172a',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }}>
                {lvl.id === 'viertel' ? '1. Viertel' : 
                 lvl.id === 'rock_mix' ? '2. Rock' : 
                 lvl.id === 'synkopen' ? '3. Off-Beat' : 
                 lvl.id === 'galopp' ? '4. Galopp' : 
                 lvl.id === 'latin_bossa' ? '5. Bossa' : 
                 lvl.id === 'funk_master' ? '6. Funk' : 
                 lvl.id === 'shuffle' ? '7. Blues' : '8. Mix'}
              </div>
              <div style={{
                fontSize: '0.58rem',
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

      {/* 🌟 FOKUS-ZONE 2: KOMPAKTE TAKT-ZEILE & MODUS-SCHNELLWAHL */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        padding: '0 2px',
        flexShrink: 0
      }}>
        {/* Takt-Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 200px' }}>
          <span style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 950, whiteSpace: 'nowrap' }}>
            <Activity size={13} color="#d97706" />
            <span>Takt {Math.min(16, currentBar + 1)}/16</span>
          </span>
          <div style={{
            position: 'relative',
            flex: 1,
            maxWidth: '140px',
            height: '6px',
            background: '#f1f5f9',
            borderRadius: '100px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, ((currentBar * activeLevelConfig.subdivisions + currentStep) / (16 * activeLevelConfig.subdivisions)) * 100))}%`,
              height: '100%',
              borderRadius: '100px',
              background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 60%, #16a34a 100%)',
              transition: 'width 0.10s linear'
            }} />
          </div>
          <span style={{ color: '#64748b', fontSize: '0.70rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
            {16 - Math.min(16, currentBar + 1) <= 0 ? 'Ziel!' : `noch ${16 - Math.min(16, currentBar + 1)} T.`}
          </span>
        </div>

        {/* 2 Modus-Tabs */}
        <div style={{
          display: 'flex',
          background: '#f8fafc',
          borderRadius: '10px',
          padding: '2px',
          gap: '2px',
          border: '1px solid #e2e8f0'
        }}>
          <button
            type="button"
            onClick={() => { if (!isPlaying && !isCountingIn) setTrainingMode('echo'); }}
            disabled={isPlaying || isCountingIn}
            style={{
              border: 'none',
              borderRadius: '8px',
              padding: '4px 10px',
              background: trainingMode === 'echo' ? '#fef3c7' : 'transparent',
              color: trainingMode === 'echo' ? '#92400e' : '#64748b',
              fontSize: '0.72rem',
              fontWeight: trainingMode === 'echo' ? 950 : 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: isPlaying || isCountingIn ? 'default' : 'pointer'
            }}
            title="Echo (Standard): 1 Takt Groove hören · 1 Takt stumm klatschen"
          >
            <Headphones size={12} color={trainingMode === 'echo' ? '#92400e' : '#64748b'} />
            <span>Echo (Standard)</span>
          </button>
          <button
            type="button"
            onClick={() => { if (!isPlaying && !isCountingIn) setTrainingMode('ghost'); }}
            disabled={isPlaying || isCountingIn}
            style={{
              border: 'none',
              borderRadius: '8px',
              padding: '4px 10px',
              background: trainingMode === 'ghost' ? '#ede9fe' : 'transparent',
              color: trainingMode === 'ghost' ? '#6d28d9' : '#64748b',
              fontSize: '0.72rem',
              fontWeight: trainingMode === 'ghost' ? 950 : 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: isPlaying || isCountingIn ? 'default' : 'pointer'
            }}
            title="Geister-Beat (Alternativ): 1 Takt Einzähler · danach 100% stumm nach Sicht klatschen"
          >
            <Clock size={12} color={trainingMode === 'ghost' ? '#6d28d9' : '#64748b'} />
            <span>Geister-Beat</span>
          </button>
        </div>
      </div>

      {/* Die Magische Beat-Bühne (Visual Metronome Pulse & Step Sequencer) */}
      <div style={{
        background: isNotebook 
          ? 'linear-gradient(180deg, #ffffff 0%, #fdfbf7 100%)'
          : 'linear-gradient(180deg, #fafaf9 0%, #fff7ed 100%)',
        borderRadius: isNotebook ? '20px' : '18px',
        padding: isNotebook ? '10px 14px' : '8px 12px',
        boxShadow: isNotebook 
          ? '0 6px 20px -4px rgba(217, 119, 6, 0.06)'
          : '0 4px 14px -3px rgba(234, 88, 12, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        border: '1.5px solid #fed7aa',
        position: 'relative',
        flexShrink: 0
      }}>
        {/* Signal-Pill & Streak */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '26px', gap: '8px' }}>
          <span style={{
            background: isCountingIn
              ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
              : (!isPlaying
                ? '#f8fafc'
                : (trainingMode === 'echo'
                  ? (isCallPhase ? '#fef3c7' : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)')
                  : 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)')),
            color: isCountingIn
              ? '#ffffff'
              : (!isPlaying
                ? '#64748b'
                : (trainingMode === 'echo' && isCallPhase ? '#92400e' : '#ffffff')),
            border: isCountingIn
              ? 'none'
              : (!isPlaying
                ? '1px solid #e2e8f0'
                : (trainingMode === 'echo' && isCallPhase ? '1.5px solid #fde68a' : 'none')),
            fontSize: '0.74rem',
            fontWeight: 950,
            padding: '3px 12px',
            borderRadius: '100px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}>
            {isCountingIn ? (
              <><Activity size={12} color="#ffffff" className="animate-pulse" /> Einzähler läuft • Schlag {countInBeat > 0 ? countInBeat : 1} von 4</>
            ) : !isPlaying ? (
              trainingMode === 'echo'
                ? <><Headphones size={12} color="#d97706" strokeWidth={2.5} /> Echo-Modus bereit (1 Takt Groove · 1 Takt Echo)</>
                : <><Clock size={12} color="#6d28d9" strokeWidth={2.5} /> Geister-Beat bereit (100% stumm nach Einzähler)</>
            ) : trainingMode === 'echo' ? (
              isCallPhase 
                ? <><Headphones size={12} color="#92400e" strokeWidth={2.5} /> Takt {currentBar + 1}: HÖR GUT ZU! (Audio an · Eingrooven)</> 
                : <><Target size={12} color="#ffffff" strokeWidth={2.4} /> Takt {currentBar + 1}: JETZT KLATSCHEN! (Stumm · Wertung aktiv)</>
            ) : (
              <><Clock size={12} color="#ffffff" strokeWidth={2.5} /> Takt {currentBar + 1}: GEISTER-BEAT (Stumm · Halte das Tempo!)</>
            )}
          </span>

          {/* Streak & Combo Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {pocketStreak >= 4 && (
              <span style={{
                background: '#fef3c7',
                border: '1px solid #fde68a',
                color: '#b45309',
                fontSize: '0.66rem',
                fontWeight: 950,
                padding: '2px 8px',
                borderRadius: '100px'
              }}>
                COMBO x{comboMultiplier}
              </span>
            )}
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 950,
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#ffffff',
              padding: '2px 8px',
              borderRadius: '8px',
              border: '1px solid #fed7aa'
            }}>
              <Flame size={12} color="#d97706" /> Streak: {pocketStreak}
            </span>
          </div>
        </div>

        {/* Call-Phase visueller Takt-Fortschrittsbalken */}
        {trainingMode === 'echo' && isCallPhase && isPlaying && (
          <div style={{
            width: '100%',
            height: '3px',
            background: '#fef3c7',
            borderRadius: '100px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${((currentStep + 1) / activeLevelConfig.subdivisions) * 100}%`,
              height: '100%',
              background: '#d97706',
              transition: 'width 0.08s linear'
            }} />
          </div>
        )}

        {/* Die dynamischen Beat-Pads (Subdivision Visualizer) */}
        <div 
          className={`groove-beat-pads-grid ${activeSyllables.length >= 12 ? 'groove-subdivisions-dense' : ''}`}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${activeSyllables.length}, 1fr)`,
            gap: isNotebook ? '8px' : '4px',
            padding: '2px 0',
            minHeight: isNotebook ? '74px' : '64px',
            alignItems: 'center',
            contain: 'layout style',
            boxSizing: 'border-box'
          }}
        >
          {activeSyllables.map((syl, sIdx) => {
            const isCountInStep = isCountingIn && (
              activeLevelConfig.subdivisions === 4 
                ? sIdx === (countInBeat - 1)
                : Math.floor(sIdx / (activeLevelConfig.subdivisions / 4)) === (countInBeat - 1)
            );
            const isCurrent = (isPlaying && currentStep === sIdx) || isCountInStep;
            const isAnticipating = isPlaying && anticipatingStep === sIdx;
            const isTarget = activeTargetPattern[sIdx];

            return (
              <div
                key={sIdx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  height: '100%',
                  justifyContent: 'center',
                  minWidth: 0
                }}
              >
                <span style={{
                  fontSize: activeSyllables.length > 8 ? '0.70rem' : '0.84rem',
                  fontWeight: 950,
                  color: isCurrent ? '#d97706' : (isTarget ? '#0f172a' : '#94a3b8'),
                  letterSpacing: '0.01em',
                  transition: 'all 0.08s ease',
                  height: '16px',
                  minHeight: '16px',
                  maxHeight: '16px',
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
                  height: isNotebook ? '48px' : '42px',
                  minHeight: isNotebook ? '48px' : '42px',
                  maxHeight: isNotebook ? '48px' : '42px',
                  borderRadius: isNotebook ? '14px' : '10px',
                  background: isCurrent 
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : (isAnticipating ? '#fffbeb' : (isTarget ? '#ffffff' : '#f8fafc')),
                  border: isCurrent 
                    ? '2px solid #ffffff' 
                    : (isAnticipating ? '1.5px solid #f59e0b' : (isTarget ? '1.5px solid #fed7aa' : '1px dashed #cbd5e1')),
                  boxShadow: isCurrent 
                    ? '0 6px 16px rgba(217, 119, 6, 0.40), inset 0 1.5px 0 rgba(255, 255, 255, 0.7)' 
                    : (isAnticipating 
                      ? '0 0 12px rgba(245, 158, 11, 0.35)' 
                      : (isTarget 
                        ? '0 2px 5px rgba(0,0,0,0.03)' 
                        : 'none')),
                  transform: isCurrent ? 'scale(1.05)' : (isAnticipating ? 'scale(1.02)' : 'scale(1)'),
                  transformOrigin: 'center center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.08s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxSizing: 'border-box'
                }}>
                  {isTarget && (
                    <div style={{
                      width: isCurrent ? '12px' : '9px',
                      height: isCurrent ? '12px' : '9px',
                      borderRadius: '50%',
                      background: isCurrent ? '#ffffff' : (isAnticipating ? '#d97706' : '#f59e0b'),
                      transition: 'all 0.08s ease',
                      boxShadow: isCurrent ? '0 0 10px rgba(255,255,255,0.9)' : 'none'
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
            height: '8px',
            background: '#f1f5f9',
            borderRadius: '5px',
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

      {/* 🌟 FOKUS-ZONE 3: DIE MULTI-MODALE TRIGGER-BÜHNE (AKUSTISCH / TOUCH / MIDI) */}
      <button
        type="button"
        aria-label={!isPlaying && !isCountingIn ? "Groove-Trainer starten" : (isCountingIn ? "Einzähler läuft" : "Im Rhythmus mitmachen")}
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
          height: isNotebook ? '92px' : '84px',
          minHeight: isNotebook ? '92px' : '84px',
          maxHeight: isNotebook ? '92px' : '84px',
          boxSizing: 'border-box',
          borderRadius: isNotebook ? '22px' : '18px',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          background: isCountingIn || (isCallPhase && trainingMode === 'echo')
            ? 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)'
            : (micShockwave || isPadPressed
              ? 'linear-gradient(135deg, #ea580c 0%, #9a3412 100%)'
              : 'linear-gradient(135deg, #f97316 0%, #ea580c 60%, #c2410c 100%)'),
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          cursor: 'pointer',
          boxShadow: micShockwave || isPadPressed
            ? '0 0 32px rgba(249, 115, 22, 0.75), inset 0 2px 4px rgba(0, 0, 0, 0.25)' 
            : (inputMode === 'acoustic' && isMicListening && micLevel > 0.08
              ? '0 0 20px rgba(249, 115, 22, 0.45), 0 6px 16px -2px rgba(249, 115, 22, 0.40)'
              : '0 8px 18px -2px rgba(249, 115, 22, 0.40), 0 2px 6px rgba(0, 0, 0, 0.08)'),
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'manipulation',
          transform: micShockwave || isPadPressed ? 'scale(0.985)' : 'scale(1)',
          transition: 'transform 0.06s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.12s ease, box-shadow 0.12s ease',
          outline: 'none',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0
        }}
        className="hover-scale-mini"
      >
        {isCountingIn ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={isNotebook ? 22 : 18} color="#ffffff" className="animate-pulse" />
              <span style={{
                fontSize: isNotebook ? '1.24rem' : '1.10rem',
                fontWeight: 950,
                letterSpacing: '-0.01em',
                color: '#ffffff'
              }}>
                EINZÄHLER: SCHLAG {countInBeat > 0 ? countInBeat : 1} VON 4
              </span>
            </div>
            <div style={{
              height: '20px',
              minHeight: '20px',
              maxHeight: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}>
              {countInOffsetsRef.current.length > 0 ? (
                <span style={{ fontSize: '0.80rem', color: '#fef3c7', fontWeight: 900 }}>
                  🎙️ Pre-Roll kalibriert: {countInOffsetsRef.current[countInOffsetsRef.current.length - 1]} ms
                </span>
              ) : (
                <span style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.88)', fontWeight: 750 }}>
                  Im Takt mitklatschen zur Fein-Kalibrierung
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {inputMode === 'acoustic' ? (
                <Mic size={isNotebook ? 20 : 18} color="#ffffff" strokeWidth={2.8} className={micLevel > 0.12 ? 'animate-pulse' : ''} />
              ) : (
                <Target size={isNotebook ? 20 : 18} color="#ffffff" strokeWidth={2.8} />
              )}
              <span style={{
                fontSize: isNotebook ? '1.18rem' : '1.04rem',
                fontWeight: 950,
                letterSpacing: '-0.01em',
                color: '#ffffff'
              }}>
                {!isPlaying && !isCountingIn ? (
                  inputMode === 'acoustic' ? '🎙️ JETZT STARTEN (KLATSCHE ODER TASTE)' : 'STARTEN (PAD TIPPEN)'
                ) : (
                  trainingMode === 'echo' && isCallPhase 
                    ? '🎧 NUR ZUHÖREN & GROOVEN...' 
                    : (inputMode === 'acoustic' ? '🎙️ JETZT IM TAKT KLATSCHEN' : (inputMode === 'midi' ? '🥁 E-DRUM / TASTE ANSCHLAGEN' : 'HIER IM TAKT TROMMELN'))
                )}
              </span>
            </div>

            {/* Live-Feedback Slot */}
            <div style={{
              height: '20px',
              minHeight: '20px',
              maxHeight: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}>
              {lastRating === 'pocket' && (
                <span style={{ fontSize: '0.84rem', fontWeight: 950, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Sparkles size={14} color="#ffffff" /> GENAU! VOLL IM POCKET!
                </span>
              )}
              {lastRating === 'good' && (
                <span style={{ fontSize: '0.84rem', fontWeight: 950, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Check size={14} color="#ffffff" /> GUT IM PULS!
                </span>
              )}
              {lastRating === 'rush' && (
                <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#fee2e2', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={13} color="#fee2e2" /> ETWAS FRÜH • Nicht hetzen!
                </span>
              )}
              {lastRating === 'drag' && (
                <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#fef3c7', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={13} color="#fef3c7" /> ETWAS SPÄT • Entspannt mit dem Beat!
                </span>
              )}
              {lastRating === 'miss' && (
                <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <RotateCcw size={13} color="#f1f5f9" /> DANEBEN • Lausche auf den Beat!
                </span>
              )}
              {!lastRating && (
                <span style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.88)', fontWeight: 750 }}>
                  {!isPlaying && !isCountingIn ? (
                    inputMode === 'acoustic' ? '👏 Klatsche energisch in die Hände zum Starten' : 'Tippe auf das Pad oder drücke die Leertaste'
                  ) : (
                    trainingMode === 'echo' && isCallPhase 
                      ? 'Groove hören • Freies Mitgrooven ohne Wertung' 
                      : (trainingMode === 'ghost' 
                        ? 'Geister-Beat: Halte das Tempo nach Sicht!' 
                        : (inputMode === 'acoustic' ? 'Klatsche synchron mit den Beat-Punkten' : 'Tippe im Rhythmus der Beats'))
                  )}
                </span>
              )}
            </div>
          </>
        )}

        {/* 🎙️ Live-Akustik VU-Pegelbalken & Sound-Toggle */}
        {inputMode === 'acoustic' && (
          <div style={{
            position: 'absolute',
            bottom: '3px',
            left: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div style={{
              flex: 1,
              height: '3px',
              background: 'rgba(255, 255, 255, 0.25)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min(100, Math.round(micLevel * 100))}%`,
                height: '100%',
                background: micShockwave ? '#f59e0b' : '#4ade80',
                transition: 'width 0.05s linear'
              }} />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPlayDrumSoundOnClap(!playDrumSoundOnClap);
              }}
              style={{
                background: playDrumSoundOnClap ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                color: '#ffffff',
                borderRadius: '6px',
                padding: '1px 7px',
                fontSize: '0.62rem',
                fontWeight: 850,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.12s ease'
              }}
              title={playDrumSoundOnClap 
                ? "Lautsprecher-Sound ist AN (Achtung: Nur mit Kopfhörern empfohlen, da sonst ein Latenz-Echo entsteht)" 
                : "Lautsprecher-Sound ist STUMM (Empfohlen: Dein reales Klatschen ist die natürliche Klangquelle, kein Latenz-Versatz)"}
            >
              {playDrumSoundOnClap ? <Volume2 size={11} /> : <VolumeX size={11} />}
              <span>{playDrumSoundOnClap ? 'Sound An (Kopfhörer)' : 'Stumm (Echtes Klatschen)'}</span>
            </button>
          </div>
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
          {(isPlaying || isCountingIn) ? (
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

      {/* 🎧 2027er Universal Audio- & Hardware-Latenz Sheet */}
      <AudioSettingsSheet
        isOpen={showAudioSettingsSheet}
        onClose={() => setShowAudioSettingsSheet(false)}
      />

    </div>
  );

  return (
    <div style={{
      width: '100%',
      maxWidth: '1240px',
      height: '100%',
      maxHeight: '100%',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      overflow: 'hidden'
    }}>
      {/* Mobile / Tablet Portrait Segmented Tab Switch */}
      <div 
        className="groove-mobile-pane-switch"
        style={{
          display: 'none',
          marginBottom: '12px',
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
          grid-template-columns: minmax(440px, 1.25fr) minmax(320px, 0.75fr);
          gap: 16px;
          align-items: stretch;
          width: 100%;
          height: 100%;
          max-height: 100%;
          overflow: hidden;
          min-height: 0;
        }
        @media (max-width: 1023px) {
          .groove-dual-book-grid {
            display: flex;
            flex-direction: column;
            gap: 16px;
            overflow-y: auto;
            height: auto;
            max-height: none;
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
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
            max-height: 100% !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
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
        onCompleteAndExit={() => {
          commitSessionData();
          setShowCelebrationModal(false);
          setRadarLevelUpCelebration(null);
          if (onExitToBriefing) {
            onExitToBriefing();
          } else if (onClose) {
            onClose();
          }
        }}
        onClose={() => {
          setShowCelebrationModal(false);
          setRadarLevelUpCelebration(null);
        }}
      />
    </div>
  );
};
