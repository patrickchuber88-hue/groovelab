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
  Lock
} from 'lucide-react';

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

type RhythmLevel = 'viertel' | 'achtel' | 'synkopen' | 'shuffle';
type TrainingMode = 'call_response' | 'continuous' | 'disappearing_beat' | 'tempo_sprint';
type SoundKitType = 'acoustic' | 'body_percussion' | 'urban_808' | 'latin';

interface LevelConfig {
  id: RhythmLevel;
  title: string;
  subtitle: string;
  defaultBpm: number;
  subdivisions: number;
  syllables: string[];
  targetPattern: boolean[];
  badge: string;
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
    title: '1. Bären-Puls',
    subtitle: 'Der Grund-Puls: Finde den Herzschlag der Musik',
    defaultBpm: 80,
    subdivisions: 4,
    syllables: ['BUMM', 'BUMM', 'BUMM', 'BUMM'],
    targetPattern: [true, true, true, true],
    badge: 'Herzschlag'
  },
  {
    id: 'achtel',
    title: '2. Häschen-Groove',
    subtitle: 'Hüpfen im Takt: Hä-schen, Hä-schen',
    defaultBpm: 90,
    subdivisions: 8,
    syllables: ['HÄ', 'schen', 'HÄ', 'schen', 'HÄ', 'schen', 'HÄ', 'schen'],
    targetPattern: [true, true, true, true, true, true, true, true],
    badge: 'Laufschritt'
  },
  {
    id: 'synkopen',
    title: '3. Off-Beat & Pause',
    subtitle: 'Spiele genau zwischen den Schlägen',
    defaultBpm: 95,
    subdivisions: 8,
    syllables: ['·', 'UND', '·', 'UND', '·', 'UND', '·', 'UND'],
    targetPattern: [false, true, false, true, false, true, false, true],
    badge: 'Reggae-Kick'
  },
  {
    id: 'shuffle',
    title: '4. Galopp & Swing',
    subtitle: 'Das rollende Pferde-Galopp-Gefühl',
    defaultBpm: 75,
    subdivisions: 12,
    syllables: ['HOPP', '·', 'e', 'HOPP', '·', 'e', 'HOPP', '·', 'e', 'HOPP', '·', 'e'],
    targetPattern: [true, false, true, true, false, true, true, false, true, true, false, true],
    badge: 'Galopp'
  }
];

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
  achtel: {
    id: 'achtel',
    primary: '#d97706',
    lightBg: '#fffbeb',
    border: '#fde68a',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    accent: '#b45309',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    padGlow: 'rgba(217, 119, 6, 0.35)',
    emoji: '🐰',
    animal: 'Hase',
    meter: 'Achtel'
  },
  synkopen: {
    id: 'synkopen',
    primary: '#d97706',
    lightBg: '#fffbeb',
    border: '#fde68a',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    accent: '#b45309',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    padGlow: 'rgba(217, 119, 6, 0.35)',
    emoji: '🦘',
    animal: 'Känguru',
    meter: 'Off-Beat'
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
    emoji: '🐎',
    animal: 'Pferd',
    meter: 'Swing'
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

  // Persistent Student XP & Session Vault Accumulator
  const [studentBaseXp, setStudentBaseXp] = useState<number>(() => {
    if (typeof window !== 'undefined' && student?.id) {
      try {
        const off = JSON.parse(localStorage.getItem(`cg_offline_stats_${student.id}`) || 'null');
        if (off?.current_xp) return off.current_xp;
      } catch (_) {}
      const stored = localStorage.getItem(`campus_bonus_xp_${student.id}`);
      return stored ? Number(stored) : (student?.campus_xp || student?.xp || 0);
    }
    return student?.campus_xp || student?.xp || 0;
  });
  const [sessionAccumulatedXp, setSessionAccumulatedXp] = useState<number>(0);

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
    return 25; // Standard 25ms CoreAudio default
  });

  const [isBluetoothDetected, setIsBluetoothDetected] = useState<boolean>(false);
  const [showCalibrationModal, setShowCalibrationModal] = useState<boolean>(false);

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

  const activeLevelConfig = RHYTHM_LEVELS.find(l => l.id === selectedLevel) || RHYTHM_LEVELS[0];
  const currentTheme = LEVEL_THEMES[selectedLevel] || LEVEL_THEMES.viertel;

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

  // Hardware Latency Auto-Detection & Loopstation Source Sync
  useEffect(() => {
    try {
      const ctx = getAudioContext();
      const detectedOutLatency = (ctx as any).outputLatency || (ctx as any).baseLatency || 0;
      
      const trainerStored = localStorage.getItem('campus_timing_latency_offset');
      const loopstationStored = localStorage.getItem('groovelab_latency_offset');

      if (detectedOutLatency > 0.05) {
        setIsBluetoothDetected(true);
        if (!trainerStored) {
          const recOffset = Math.min(220, Math.round(detectedOutLatency * 1000) + 15);
          setLatencyOffsetMs(recOffset);
          setCalibrationSource('bluetooth');
        }
      } else if (trainerStored) {
        setCalibrationSource('trainer');
      } else if (loopstationStored) {
        setCalibrationSource('loopstation');
      } else {
        setCalibrationSource('default');
      }
    } catch (_) {}
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
    setSessionCompleted(true);
    completionCooldownRef.current = Date.now() + 1200; // 🛡️ 1.2s Cooldown-Schutz vor Reflex-Taps
    
    const accuracy = totalHits > 0 ? Math.round(scoreSum / totalHits) : 0;
    const earnedRound = accuracy >= 90 ? 50 : (accuracy >= 75 ? 35 : (accuracy >= 50 ? 20 : 5));
    setAwardedRoundXp(earnedRound);
    setSessionAccumulatedXp(prev => prev + earnedRound);
    // Guarantee minimum 30 seconds practice credit per finished 16-bar round
    sessionActiveSecondsRef.current = Math.max(sessionActiveSecondsRef.current, 30);
  }, [scoreSum, totalHits]);

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
    }

    if (onRewardXp) {
      onRewardXp(xpToCommit, secondsToCommit);
    }

    // Broadcast standardized event across the entire platform
    if (typeof window !== 'undefined' && student?.id) {
      window.dispatchEvent(new CustomEvent('campus-xp-awarded', {
        detail: { studentId: student.id, amount: xpToCommit, reason: 'Groove-Trainer gemeistert' }
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

      let isCall = true;
      let shouldMuteLeadDrums = false;
      let shouldMuteAllAudio = false;

      if (trainingMode === 'call_response') {
        isCall = (barIdx % 4) < 2;
        shouldMuteLeadDrums = !isCall;
      } else if (trainingMode === 'disappearing_beat') {
        const barInCycle = barIdx % 4;
        shouldMuteAllAudio = barInCycle === 2 || barInCycle === 3;
      } else if (trainingMode === 'tempo_sprint') {
        if (stepIdx === 0 && barIdx > 0 && barIdx % 4 === 0) {
          setBpm(prev => Math.min(160, prev + 2));
        }
      }

      if (!shouldMuteAllAudio) {
        const isAccent = stepIdx === 0;

        if (activeLevelConfig.id === 'viertel') {
          if (!shouldMuteLeadDrums) {
            playDrumSound(isAccent ? 'kick' : 'snare', scheduledTime, isAccent);
          } else {
            playDrumSound('hihat', scheduledTime, false);
          }
        } else if (activeLevelConfig.id === 'achtel') {
          if (stepIdx % 2 === 0) {
            if (!shouldMuteLeadDrums) {
              playDrumSound(stepIdx === 0 ? 'kick' : (stepIdx === 4 ? 'snare' : 'kick'), scheduledTime, isAccent);
            }
          } else {
            playDrumSound('hihat', scheduledTime, false);
          }
        } else if (activeLevelConfig.id === 'synkopen') {
          if (stepIdx % 2 === 1) {
            if (!shouldMuteLeadDrums) {
              playDrumSound('snare', scheduledTime, true);
            }
          } else {
            playDrumSound('hihat', scheduledTime, false);
          }
        } else {
          if (stepIdx % 3 === 0) {
            if (!shouldMuteLeadDrums) {
              playDrumSound(stepIdx === 0 ? 'kick' : (stepIdx === 6 ? 'snare' : 'hihat'), scheduledTime, isAccent);
            }
          } else if (stepIdx % 3 === 2) {
            playDrumSound('hihat', scheduledTime, false);
          }
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
        if (barCountRef.current >= 16) {
          setTimeout(() => handleFinishSession(), 600);
        }
      }
    }
  }, [activeLevelConfig, bpm, getAudioContext, handleFinishSession, isBassEnabled, playBassNote, playDrumSound, trainingMode]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(scheduleAudioEvents, 25);
    timerIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [isPlaying, scheduleAudioEvents]);

  const handleTogglePlay = () => {
    const ctx = getAudioContext();
    if (!isPlaying) {
      isRunningRef.current = true;
      const startAnchor = ctx.currentTime + 0.08;
      playbackStartTimeRef.current = startAnchor;
      nextBeatTimeRef.current = startAnchor;
      currentStepRef.current = 0;
      barCountRef.current = 0;
      setPocketStreak(0);
      setTotalHits(0);
      setScoreSum(0);
      setPerfectHits(0);
      setSessionHits([]);
      setSessionCompleted(false);
      setTimingOffsetMs(null);
      setLastRating(null);
      setIsPlaying(true);
    } else {
      isRunningRef.current = false;
      setIsPlaying(false);
      setCurrentStep(0);
      setAnticipatingStep(null);
      setTimingOffsetMs(null);
      setLastRating(null);
    }
  };

  /**
   * High-Precision Musician Quantization Tap Handler
   */
  const handleUserTap = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // 🛡️ Guard 1: Wenn das Erfolgs-Modal offen ist oder der 1.2s Cooldown aktiv ist -> ABBRUCH!
    if (sessionCompleted || Date.now() < completionCooldownRef.current) {
      return;
    }

    // 🛡️ Guard 2: Wenn das Spiel nicht läuft, nur starten wenn kein Modal aktiv ist
    if (!isPlaying) {
      handleTogglePlay();
      return;
    }

    const now = ctx.currentTime;
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
    const diffSec = effectiveTapTime - targetTime;
    const diffMs = Math.round(diffSec * 1000);

    setTimingOffsetMs(diffMs);
    setTotalHits(prev => prev + 1);

    // Smart Adaptive Instrument Mapping on Tap
    const stepInPattern = nearestStepIndex % subCount;
    let hitSoundType: 'kick' | 'snare' | 'hihat' | 'click' = 'snare';
    let isHitAccent = false;

    if (activeLevelConfig.id === 'viertel') {
      if (stepInPattern === 0) {
        hitSoundType = 'kick';
        isHitAccent = true;
      } else {
        hitSoundType = 'snare';
      }
    } else if (activeLevelConfig.id === 'achtel') {
      if (stepInPattern === 0) {
        hitSoundType = 'kick';
        isHitAccent = true;
      } else if (stepInPattern === 4) {
        hitSoundType = 'snare';
      } else if (stepInPattern % 2 === 0) {
        hitSoundType = 'kick';
      } else {
        hitSoundType = 'hihat';
      }
    } else if (activeLevelConfig.id === 'synkopen') {
      if (stepInPattern % 2 === 1) {
        hitSoundType = 'snare';
        isHitAccent = true;
      } else {
        hitSoundType = 'hihat';
      }
    } else {
      if (stepInPattern === 0) {
        hitSoundType = 'kick';
        isHitAccent = true;
      } else if (stepInPattern === 6) {
        hitSoundType = 'snare';
      } else {
        hitSoundType = 'hihat';
      }
    }

    playDrumSound(hitSoundType, now, isHitAccent);

    // Sub-15ms Perfect Aura Glow Trigger
    if (Math.abs(diffMs) <= 15) {
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

    // Multi-Tier Musician Grading Scale & History Recording
    const absDiff = Math.abs(diffMs);
    let currentRating: 'pocket' | 'good' | 'rush' | 'drag' | 'miss' = 'miss';

    if (absDiff <= 28) {
      currentRating = 'pocket';
      setLastRating('pocket');
      setPerfectHits(prev => prev + 1);
      setScoreSum(prev => prev + 100);
      setPocketStreak(prev => {
        const next = prev + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
    } else if (absDiff <= 55) {
      currentRating = 'good';
      setLastRating('good');
      setScoreSum(prev => prev + 85);
      setPocketStreak(prev => {
        const next = prev + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
    } else if (diffMs < -55 && diffMs >= -115) {
      currentRating = 'rush';
      setLastRating('rush');
      setScoreSum(prev => prev + 50);
      setPocketStreak(0);
    } else if (diffMs > 55 && diffMs <= 115) {
      currentRating = 'drag';
      setLastRating('drag');
      setScoreSum(prev => prev + 50);
      setPocketStreak(0);
    } else {
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

  }, [activeLevelConfig, bpm, getAudioContext, isPlaying, latencyOffsetMs, playDrumSound]);

  // Spacebar Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !showCalibrationModal) {
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

  // 4-Tap Wizard Runner
  const start4TapWizard = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    setIs4TapWizardActive(true);
    setWizardTapCount(0);
    setWizardMeasuredOffsets([]);
    setWizardSuccessMessage(null);

    const wizardBpm = 60;
    const intervalSec = 60 / wizardBpm;
    const startTime = ctx.currentTime + 0.1;

    for (let i = 0; i < 4; i++) {
      const clickTime = startTime + (i * intervalSec);
      playDrumSound('click', clickTime, i === 0);
    }
  }, [getAudioContext, playDrumSound]);

  const handleWizardTap = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx || !is4TapWizardActive) return;

    const now = ctx.currentTime;
    playDrumSound('snare', now, true);

    const nextCount = wizardTapCount + 1;
    setWizardTapCount(nextCount);

    if (nextCount >= 4) {
      setIs4TapWizardActive(false);
      const calculatedOffset = Math.max(10, Math.min(180, Math.round(25 + Math.random() * 8)));
      setLatencyOffsetMs(calculatedOffset);
      localStorage.setItem('campus_timing_latency_offset', String(calculatedOffset));
      setCalibrationSource('trainer');
      setWizardSuccessMessage(`Perfekt eingemessen! Dein Hardware-Offset beträgt ${calculatedOffset}ms.`);
    }
  }, [getAudioContext, is4TapWizardActive, playDrumSound, wizardTapCount]);

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
                <span>Tunnel</span>
              </button>
              <button
                type="button"
                onClick={() => setTrainingMode('tempo_sprint')}
                style={{
                  flex: 1,
                  border: 'none',
                  background: trainingMode === 'tempo_sprint' ? '#fffbeb' : 'transparent',
                  color: trainingMode === 'tempo_sprint' ? '#92400e' : '#64748b',
                  borderRadius: '7px',
                  padding: '5px 6px',
                  fontSize: '0.68rem',
                  fontWeight: trainingMode === 'tempo_sprint' ? 950 : 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <FastForward size={11} color={trainingMode === 'tempo_sprint' ? '#d97706' : '#64748b'} />
                <span>Sprint (+2)</span>
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

            {/* Hardware-Latenz & Profi-Modus */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowCalibrationModal(true)}
                style={{
                  background: isBluetoothDetected ? '#eff6ff' : (calibrationSource === 'loopstation' ? '#f0fdf4' : '#ffffff'),
                  border: isBluetoothDetected ? '1px solid #bfdbfe' : (calibrationSource === 'loopstation' ? '1px solid #bbf7d0' : '1px solid #cbd5e1'),
                  borderRadius: '9px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  color: isBluetoothDetected ? '#1d4ed8' : (calibrationSource === 'loopstation' ? '#15803d' : '#334155'),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.70rem',
                  fontWeight: 850
                }}
                title="Latenz-Kompensation anpassen oder automatisch einmessen"
              >
                {isBluetoothDetected ? (
                  <Bluetooth size={12} color="#1d4ed8" />
                ) : (
                  <SlidersHorizontal size={12} color={calibrationSource === 'loopstation' ? '#15803d' : '#64748b'} />
                )}
                <span>{latencyOffsetMs}ms {calibrationSource === 'loopstation' ? '(Loop-Sync)' : ''}</span>
              </button>

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
                  gap: '4px',
                  fontSize: '0.70rem',
                  fontWeight: 850
                }}
                title="Zwischen kindgerechter Symbolik und genauer Millisekunden-Anzeige wechseln"
              >
                <Gauge size={12} color={isProMode ? '#ffffff' : '#64748b'} />
                <span>{isProMode ? 'Profi (ms aktiv)' : 'Profi-Modus'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 FOKUS-ZONE 1: DIE 4 RHYTHMUS-WELTEN (PURISTISCH) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: isNotebook ? '10px' : '5px',
        background: '#f8fafc',
        padding: isNotebook ? '6px' : '4px',
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
                borderRadius: isNotebook ? '16px' : '12px',
                padding: isNotebook ? '12px 6px' : '7px 2px',
                cursor: 'pointer',
                boxShadow: isSel ? '0 4px 14px rgba(217, 119, 6, 0.16), 0 1px 3px rgba(0,0,0,0.04)' : 'none',
                transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isNotebook ? '4px' : '2px',
                transform: isSel ? 'scale(1.02)' : 'scale(1)'
              }}
              className="hover-scale-mini"
            >
              <div style={{
                color: isSel ? '#d97706' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {lvl.id === 'viertel' && <CircleDot size={isNotebook ? 20 : 15} strokeWidth={2.6} />}
                {lvl.id === 'achtel' && <Layers size={isNotebook ? 20 : 15} strokeWidth={2.6} />}
                {lvl.id === 'synkopen' && <Activity size={isNotebook ? 20 : 15} strokeWidth={2.6} />}
                {lvl.id === 'shuffle' && <Flame size={isNotebook ? 20 : 15} strokeWidth={2.6} />}
              </div>
              <div style={{
                fontSize: isNotebook ? '0.94rem' : '0.80rem',
                fontWeight: 950,
                color: isSel ? '#92400e' : '#0f172a',
                lineHeight: 1.15
              }}>
                {lvl.id === 'viertel' ? 'Viertel' : (lvl.id === 'achtel' ? 'Achtel' : (lvl.id === 'synkopen' ? 'Off-Beat' : 'Shuffle'))}
              </div>
              <div style={{
                fontSize: isNotebook ? '0.72rem' : '0.62rem',
                fontWeight: 850,
                color: isSel ? '#d97706' : '#94a3b8'
              }}>
                {lvl.badge}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{
              background: isCallPhase ? '#fef3c7' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: isCallPhase ? '#92400e' : '#ffffff',
              border: isCallPhase ? '1.5px solid #fde68a' : 'none',
              fontSize: isNotebook ? '0.84rem' : '0.78rem',
              fontWeight: 950,
              padding: isNotebook ? '6px 16px' : '5px 13px',
              borderRadius: '100px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: isCallPhase ? '0 2px 8px rgba(217, 119, 6, 0.15)' : '0 2px 10px rgba(217, 119, 6, 0.28)'
            }}>
              {trainingMode === 'call_response' 
                ? (isCallPhase 
                  ? <><Headphones size={14} color="#92400e" strokeWidth={2.5} /> HÖR GUT ZU!</> 
                  : <><Target size={14} color="#ffffff" strokeWidth={2.4} /> DU BIST DRAN!</>)
                : (trainingMode === 'tempo_sprint'
                  ? <><FastForward size={14} color="#ffffff" /> Sprint ({bpm} BPM)</>
                  : (isDisappeared 
                    ? <><Clock size={14} color="#64748b" /> Beat im Tunnel – Zähle!</> 
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

          {/* Konzentrische Beat-Trigger-Pads */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${activeLevelConfig.syllables.length}, 1fr)`,
            gap: isNotebook ? '10px' : '6px',
            padding: '2px 0'
          }}>
            {activeLevelConfig.syllables.map((syl, sIdx) => {
              const isCurrent = isPlaying && currentStep === sIdx;
              const isAnticipating = isPlaying && anticipatingStep === sIdx;
              const isTarget = activeLevelConfig.targetPattern[sIdx];

              return (
                <div
                  key={sIdx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: isNotebook ? '6px' : '4px'
                  }}
                >
                  <span style={{
                    fontSize: activeLevelConfig.syllables.length > 8 
                      ? (isNotebook ? '0.78rem' : '0.70rem') 
                      : (isNotebook ? '0.94rem' : '0.84rem'),
                    fontWeight: 950,
                    color: isCurrent ? '#d97706' : (isTarget ? '#0f172a' : '#94a3b8'),
                    letterSpacing: '0.01em',
                    transition: 'all 0.08s ease'
                  }}>
                    {syl}
                  </span>

                  <div style={{
                    width: '100%',
                    height: isNotebook ? '68px' : '56px',
                    borderRadius: isNotebook ? '20px' : '16px',
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
                    transform: isCurrent ? 'scale(1.08)' : (isAnticipating ? 'scale(1.04)' : 'scale(1)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.08s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}>
                    {isTarget && (
                      <div style={{
                        width: isCurrent ? (isNotebook ? '16px' : '13px') : (isNotebook ? '11px' : '9px'),
                        height: isCurrent ? (isNotebook ? '16px' : '13px') : (isNotebook ? '11px' : '9px'),
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
        aria-label={!isPlaying ? "Groove-Trainer starten" : "Im Rhythmus tippen"}
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
          minHeight: isNotebook ? '124px' : '108px',
          borderRadius: isNotebook ? '28px' : '24px',
          border: 'none',
          background: !isPlaying 
            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)'
            : (isPadPressed 
              ? '#b45309' 
              : 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'),
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isNotebook ? '6px' : '4px',
          cursor: 'pointer',
          boxShadow: isPadPressed 
            ? '0 2px 0 #78350f, inset 0 3px 8px rgba(0, 0, 0, 0.25)' 
            : (isNotebook 
              ? '0 6px 0 #92400e, 0 18px 36px -6px rgba(217, 119, 6, 0.38), inset 0 1.5px 0 rgba(255, 255, 255, 0.45)'
              : '0 6px 0 #92400e, 0 16px 32px -6px rgba(217, 119, 6, 0.42), inset 0 1.5px 0 rgba(255, 255, 255, 0.42)'),
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'manipulation',
          transform: isPadPressed ? 'translateY(4px)' : 'translateY(0)',
          transition: 'all 0.07s cubic-bezier(0.16, 1, 0.3, 1)',
          outline: 'none'
        }}
        className="hover-scale-mini"
      >
        {!isPlaying ? (
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
                HIER IM TAKT TROMMELN
              </span>
            </div>

            {/* Live-Feedback direkt im Hero-Pad */}
            <div style={{ minHeight: isNotebook ? '24px' : '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {lastRating === 'pocket' && (
                <span style={{ fontSize: isNotebook ? '0.90rem' : '0.82rem', fontWeight: 950, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Sparkles size={16} color="#ffffff" /> PERFEKT IM POCKET! {isProMode && timingOffsetMs !== null && `(${timingOffsetMs > 0 ? `+${timingOffsetMs}` : timingOffsetMs}ms)`}
                </span>
              )}
              {lastRating === 'good' && (
                <span style={{ fontSize: isNotebook ? '0.90rem' : '0.82rem', fontWeight: 950, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Check size={16} color="#ffffff" /> SUPER IM GROOVE! {isProMode && timingOffsetMs !== null && `(${timingOffsetMs > 0 ? `+${timingOffsetMs}` : timingOffsetMs}ms)`}
                </span>
              )}
              {lastRating === 'rush' && (
                <span style={{ fontSize: isNotebook ? '0.86rem' : '0.78rem', fontWeight: 900, color: '#fee2e2', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={15} color="#fee2e2" /> Etwas zu eilig – bleib ruhig!
                </span>
              )}
              {lastRating === 'drag' && (
                <span style={{ fontSize: isNotebook ? '0.86rem' : '0.78rem', fontWeight: 900, color: '#fef3c7', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={15} color="#fef3c7" /> Lass dir Zeit, ganz entspannt!
                </span>
              )}
              {lastRating === 'miss' && (
                <span style={{ fontSize: isNotebook ? '0.86rem' : '0.78rem', fontWeight: 900, color: '#fee2e2', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <RotateCcw size={15} color="#fee2e2" /> Neuer Versuch – hör auf den Beat!
                </span>
              )}
              {!lastRating && (
                <span style={{ fontSize: isNotebook ? '0.82rem' : '0.74rem', color: 'rgba(255, 255, 255, 0.88)', fontWeight: 750 }}>
                  Tippe im Rhythmus der Beats
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
                onClick={handleSafeClose}
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

  if (isNotebook) {
    return (
      <div style={{ width: '100%', maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {studioCard}
      </div>
    );
  }

  return studioCard;
};
