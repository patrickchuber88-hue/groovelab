import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sparkles,
  Check,
  X,
  ChevronRight,
  Award,
  Zap,
  Flame,
  Music,
  Sliders,
  Trophy,
  Target,
  ArrowLeft,
  Radio,
  Clock,
  Lightbulb,
  Headphones,
  HelpCircle,
  Compass,
  ArrowRightLeft
} from 'lucide-react';

export interface EarLabStudioModalProps {
  student?: any;
  onClose?: () => void;
  onRewardXp?: (xp: number, reason: string) => void;
  onSessionComplete?: (summary: { vdmLevel: VdmLevel; pillar: TrainingPillar; accuracy: number; xp: number }) => void;
  uiLevel?: 'junior' | 'teen' | 'pro';
  embedded?: boolean;
  useNotebookLayout?: boolean;
}

type TrainingPillar = 'intervals' | 'chords' | 'rhythm';
type VdmLevel = 'd1' | 'd2' | 'd3';
type SoundEngineTimbre = 'rhodes' | 'grand_piano';
type IntervalPlaybackMode = 'ascending' | 'descending' | 'harmonic';
type ChordPlaybackMode = 'block' | 'arpeggio_up' | 'arpeggio_down';

interface IntervalItem {
  id: string;
  semitones: number;
  name: string;
  shortName: string;
  juniorName: string;
  juniorIcon: string;
  vdmLevel: VdmLevel;
  songAnchor: string;
  anchorNotes: number[]; // semitone offsets from root for song preview
}

interface ChordItem {
  id: string;
  name: string;
  shortName: string;
  intervals: number[];
  vdmLevel: VdmLevel;
  description: string;
  juniorName: string;
  color: string;
}

interface RhythmPattern {
  id: string;
  title: string;
  beats: number;
  notes: { step: number; isHit: boolean }[];
  vdmLevel: VdmLevel;
}

// 🎼 D1–D3 Intervall-Katalog mit Melodie-Ankern
const INTERVAL_CATALOG: IntervalItem[] = [
  {
    id: 'p1',
    semitones: 0,
    name: 'Reine Prime',
    shortName: '1',
    juniorName: 'Gleicher Ton (Zwilling)',
    juniorIcon: '👯',
    vdmLevel: 'd1',
    songAnchor: 'Gleicher Ton / Wiederholung',
    anchorNotes: [0, 0, 0]
  },
  {
    id: 'm2',
    semitones: 1,
    name: 'Kleine Sekunde',
    shortName: 'k2',
    juniorName: 'Schleich-Schritt (Der weiße Hai)',
    juniorIcon: '🦈',
    vdmLevel: 'd2',
    songAnchor: 'Der weiße Hai (Jaws) / Pink Panther',
    anchorNotes: [0, 1, 0, 1]
  },
  {
    id: 'M2',
    semitones: 2,
    name: 'Große Sekunde',
    shortName: 'g2',
    juniorName: 'Enten-Schritt (1 Treppenstufe)',
    juniorIcon: '🦆',
    vdmLevel: 'd1',
    songAnchor: 'Alle meine Entchen / Happy Birthday',
    anchorNotes: [0, 2, 4, 5, 7, 7]
  },
  {
    id: 'm3',
    semitones: 3,
    name: 'Kleine Terz',
    shortName: 'k3',
    juniorName: 'Kuckucks-Ruf (3 Stufen)',
    juniorIcon: '🐦',
    vdmLevel: 'd2',
    songAnchor: 'Kuckuck, Kuckuck / Smoke on the Water',
    anchorNotes: [3, 0]
  },
  {
    id: 'M3',
    semitones: 4,
    name: 'Große Terz',
    shortName: 'g3',
    juniorName: 'Sonnen-Sprung (4 Stufen)',
    juniorIcon: '☀️',
    vdmLevel: 'd1',
    songAnchor: 'Kumbaya / Oh When the Saints / Die Moldau',
    anchorNotes: [0, 4, 7]
  },
  {
    id: 'p4',
    semitones: 5,
    name: 'Reine Quarte',
    shortName: '4',
    juniorName: 'Tatort-Signal / Tannenbaum',
    juniorIcon: '🌲',
    vdmLevel: 'd1',
    songAnchor: 'Tatort-Melodie / Oh Tannenbaum / Amazing Grace',
    anchorNotes: [0, 5, 0, 5]
  },
  {
    id: 'tritone',
    semitones: 6,
    name: 'Tritonus (ü4 / v5)',
    shortName: 'TT',
    juniorName: 'Geister-Intervall (Simpsons)',
    juniorIcon: '👻',
    vdmLevel: 'd3',
    songAnchor: 'The Simpsons / Maria (West Side Story)',
    anchorNotes: [0, 6, 7]
  },
  {
    id: 'p5',
    semitones: 7,
    name: 'Reine Quinte',
    shortName: '5',
    juniorName: 'Star Wars Helden-Ruf',
    juniorIcon: '🚀',
    vdmLevel: 'd1',
    songAnchor: 'Star Wars / Twinkle Twinkle / ABC-Lied',
    anchorNotes: [0, 7, 5, 4, 2, 12]
  },
  {
    id: 'm6',
    semitones: 8,
    name: 'Kleine Sexte',
    shortName: 'k6',
    juniorName: 'Für-Elise Sprung',
    juniorIcon: '🎹',
    vdmLevel: 'd2',
    songAnchor: 'Für Elise (Auftakt) / The Entertainer',
    anchorNotes: [8, 7, 8, 7, 8]
  },
  {
    id: 'M6',
    semitones: 9,
    name: 'Große Sexte',
    shortName: 'g6',
    juniorName: 'Ozean-Ruf (My Bonnie)',
    juniorIcon: '⛵',
    vdmLevel: 'd2',
    songAnchor: 'My Bonnie Lies Over the Ocean / NBC Chime',
    anchorNotes: [0, 9, 7]
  },
  {
    id: 'm7',
    semitones: 10,
    name: 'Kleine Septime',
    shortName: 'k7',
    juniorName: 'Weltraum-Signal (Star Trek)',
    juniorIcon: '🌌',
    vdmLevel: 'd2',
    songAnchor: 'The Winner Takes It All / Star Trek Theme',
    anchorNotes: [0, 10, 8]
  },
  {
    id: 'M7',
    semitones: 11,
    name: 'Große Septime',
    shortName: 'g7',
    juniorName: 'Superman Weitsprung',
    juniorIcon: '🦸',
    vdmLevel: 'd2',
    songAnchor: 'Take On Me / Superman Theme',
    anchorNotes: [0, 11]
  },
  {
    id: 'p8',
    semitones: 12,
    name: 'Reine Oktave',
    shortName: '8',
    juniorName: 'Regenbogen-Himmel (Oktave)',
    juniorIcon: '🌈',
    vdmLevel: 'd1',
    songAnchor: 'Somewhere Over the Rainbow / Singin\' in the Rain',
    anchorNotes: [0, 12, 11, 7, 8, 9]
  }
];

// 🎹 D1–D3 Akkord- & Kadenzen-Katalog
const CHORD_CATALOG: ChordItem[] = [
  { id: 'major', name: 'Dur-Dreiklang', shortName: 'Dur', juniorName: 'Fröhlicher Sonnen-Akkord', intervals: [0, 4, 7], vdmLevel: 'd1', description: 'Hell, strahlend, konsonant (Grundton, große Terz, Quinte)', color: '#16a34a' },
  { id: 'minor', name: 'Moll-Dreiklang', shortName: 'Moll', juniorName: 'Gemütlicher Kuschel-Akkord', intervals: [0, 3, 7], vdmLevel: 'd1', description: 'Melancholisch, getragen (Grundton, kleine Terz, Quinte)', color: '#2563eb' },
  { id: 'diminished', name: 'Vermindert', shortName: 'verm.', juniorName: 'Spannungs-Akkord', intervals: [0, 3, 6], vdmLevel: 'd2', description: 'Spannungsgeladen, eng, instabil (Zwei kleine Terzen)', color: '#d97706' },
  { id: 'augmented', name: 'Übermäßig', shortName: 'überm.', juniorName: 'Geheimnis-Akkord', intervals: [0, 4, 8], vdmLevel: 'd2', description: 'Schwebend, mystisch, offen (Zwei große Terzen)', color: '#7c3aed' },
  { id: 'dom7', name: 'Dominantseptakkord (7)', shortName: '7', juniorName: 'Blues-Akkord', intervals: [0, 4, 7, 10], vdmLevel: 'd3', description: 'Bluesig, drängend nach Auflösung (Dur + kleine 7)', color: '#db2777' },
  { id: 'maj7', name: 'Major 7 (maj7)', shortName: 'maj7', juniorName: 'Jazz-Samt-Akkord', intervals: [0, 4, 7, 11], vdmLevel: 'd3', description: 'Jazzig, samtig, träumerisch (Dur + große 7)', color: '#0891b2' },
  { id: 'min7', name: 'Moll-Septakkord (m7)', shortName: 'm7', juniorName: 'Soul-Akkord', intervals: [0, 3, 7, 10], vdmLevel: 'd3', description: 'Warm, soulig, entspannt (Moll + kleine 7)', color: '#059669' },
  { id: 'm7b5', name: 'Halbvermindert (m7b5)', shortName: 'ø', juniorName: 'Moll-Jazz-Akkord', intervals: [0, 3, 6, 10], vdmLevel: 'd3', description: 'Typischer Jazz-II-Akkord in Moll', color: '#ea580c' }
];

// 🥁 Rhythmus-Motive
const RHYTHM_CATALOG: RhythmPattern[] = [
  {
    id: 'rhy_1',
    title: 'Viertel & Halbe',
    beats: 8,
    vdmLevel: 'd1',
    notes: [
      { step: 0, isHit: true },
      { step: 2, isHit: true },
      { step: 4, isHit: true },
      { step: 6, isHit: true }
    ]
  },
  {
    id: 'rhy_2',
    title: 'Achtel-Puls & Pause',
    beats: 8,
    vdmLevel: 'd1',
    notes: [
      { step: 0, isHit: true },
      { step: 1, isHit: true },
      { step: 2, isHit: true },
      { step: 4, isHit: true },
      { step: 6, isHit: true }
    ]
  },
  {
    id: 'rhy_3',
    title: 'Synkope / Off-Beat',
    beats: 8,
    vdmLevel: 'd2',
    notes: [
      { step: 0, isHit: true },
      { step: 1, isHit: false },
      { step: 2, isHit: true },
      { step: 3, isHit: true },
      { step: 5, isHit: true },
      { step: 6, isHit: true }
    ]
  },
  {
    id: 'rhy_4',
    title: 'Funk & Clave Vorhalt',
    beats: 8,
    vdmLevel: 'd3',
    notes: [
      { step: 0, isHit: true },
      { step: 3, isHit: true },
      { step: 4, isHit: false },
      { step: 6, isHit: true },
      { step: 7, isHit: true }
    ]
  }
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
  const isNotebook = Boolean(useNotebookLayout || embedded);
  // Navigation & Ausbildungs-Stufen
  const [activePillar, setActivePillar] = useState<TrainingPillar>('intervals');
  const [vdmLevel, setVdmLevel] = useState<VdmLevel>('d1');
  const [soundTimbre, setSoundTimbre] = useState<SoundEngineTimbre>('rhodes');

  // Audio Context & Busy State
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isAudioBusy, setIsAudioBusy] = useState(false);

  // 1. Intervall-Labor State
  const [intervalPlayMode, setIntervalPlayMode] = useState<IntervalPlaybackMode>('ascending');
  const [currentIntervalQuestion, setCurrentIntervalQuestion] = useState<{ rootMidi: number; interval: IntervalItem } | null>(null);
  const [selectedIntervalAnswer, setSelectedIntervalAnswer] = useState<string | null>(null);
  const [isIntervalAnswerSubmitted, setIsIntervalAnswerSubmitted] = useState(false);

  // 2. Akkord-Labor State
  const [chordPlayMode, setChordPlayMode] = useState<ChordPlaybackMode>('block');
  const [currentChordQuestion, setCurrentChordQuestion] = useState<{ rootMidi: number; chord: ChordItem } | null>(null);
  const [selectedChordAnswer, setSelectedChordAnswer] = useState<string | null>(null);
  const [isChordAnswerSubmitted, setIsChordAnswerSubmitted] = useState(false);

  // 3. Rhythmus-Labor State
  const [currentRhythmQuestion, setCurrentRhythmQuestion] = useState<RhythmPattern>(RHYTHM_CATALOG[0]);
  const [isRhythmPlaying, setIsRhythmPlaying] = useState(false);
  const [userRhythmHits, setUserRhythmHits] = useState<number[]>([]);
  const [rhythmEvaluationScore, setRhythmEvaluationScore] = useState<number | null>(null);
  const rhythmStartTimeRef = useRef<number>(0);

  // Gamification, Spaced Repetition & Streak
  const [challengeProgress, setChallengeProgress] = useState({ current: 1, total: 10, correctCount: 0 });
  const [streak, setStreak] = useState(0);
  const [sessionXpEarned, setSessionXpEarned] = useState(0);
  const [isCompletedCelebration, setIsCompletedCelebration] = useState(false);
  const spacedRepetitionQueueRef = useRef<Array<{ rootMidi: number; interval: IntervalItem }>>([]);
  const hasCompletedDailyChallengeTodayRef = useRef<boolean>(false);

  // Initialisiere AudioContext bei erstem Klick
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Frequenzformel: A4 = 440 Hz
  const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

  // 🎵 Synthesizer Note Player: Dual-Engine (Rhodes vs. Flügel)
  const playTone = useCallback((freq: number, startTime: number, duration: number, velocity: number = 0.3) => {
    const ctx = getAudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    if (soundTimbre === 'rhodes') {
      // Warmes Rhodes: Sinus + Dreieck + weicher Anschlag
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq, startTime);

      const attackTime = 0.03;
      const decayTime = duration * 0.45;
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(velocity, startTime + attackTime);
      gainNode.gain.exponentialRampToValueAtTime(velocity * 0.6, startTime + attackTime + decayTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    } else {
      // Flügel: Perkussiver Hammer-Anschlag (Dreieck + Sinus mit schnellem Attack)
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, startTime);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, startTime); // Oktave-Oberton

      const attackTime = 0.01;
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(velocity * 1.1, startTime + attackTime);
      gainNode.gain.exponentialRampToValueAtTime(velocity * 0.4, startTime + attackTime + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    }

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
  }, [getAudioContext, soundTimbre]);

  // 🔔 Stimmgabel-Referenzton (A4 = 440 Hz oder C4 = 261.63 Hz)
  const playReferencePitch = (type: 'A4' | 'C4') => {
    const ctx = getAudioContext();
    const freq = type === 'A4' ? 440.0 : 261.63;
    playTone(freq, ctx.currentTime, 2.0, 0.35);
  };

  // 🥁 Klick-Synthesizer für Rhythmus & Vorzähler
  const playClick = useCallback((time: number, isAccent: boolean = false) => {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 1200 : 800, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.04);

    gain.gain.setValueAtTime(isAccent ? 0.4 : 0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.06);
  }, [getAudioContext]);

  // Filterung nach Ausbildungs-Stufe
  const availableIntervals = INTERVAL_CATALOG.filter(item => {
    if (vdmLevel === 'd1') return item.vdmLevel === 'd1';
    if (vdmLevel === 'd2') return item.vdmLevel === 'd1' || item.vdmLevel === 'd2';
    return true;
  });

  const availableChords = CHORD_CATALOG.filter(item => {
    if (vdmLevel === 'd1') return item.vdmLevel === 'd1';
    if (vdmLevel === 'd2') return item.vdmLevel === 'd1' || item.vdmLevel === 'd2';
    return true;
  });

  // Generiere neue Intervall-Aufgabe (unter Einbeziehung der Spaced-Repetition-Queue)
  const generateNewIntervalQuestion = useCallback(() => {
    let nextQuestion: { rootMidi: number; interval: IntervalItem };

    // Wenn etwas in der Wiederholungs-Queue liegt und wir bei Frage > 4 sind:
    if (spacedRepetitionQueueRef.current.length > 0 && Math.random() > 0.4) {
      nextQuestion = spacedRepetitionQueueRef.current.shift()!;
    } else {
      const randomInterval = availableIntervals[Math.floor(Math.random() * availableIntervals.length)];
      const rootMidi = 48 + Math.floor(Math.random() * 16); // C3 bis G4
      nextQuestion = { rootMidi, interval: randomInterval };
    }

    setCurrentIntervalQuestion(nextQuestion);
    setSelectedIntervalAnswer(null);
    setIsIntervalAnswerSubmitted(false);
  }, [availableIntervals]);

  // Generiere neue Akkord-Aufgabe
  const generateNewChordQuestion = useCallback(() => {
    const randomChord = availableChords[Math.floor(Math.random() * availableChords.length)];
    const rootMidi = 48 + Math.floor(Math.random() * 12);
    setCurrentChordQuestion({ rootMidi, chord: randomChord });
    setSelectedChordAnswer(null);
    setIsChordAnswerSubmitted(false);
  }, [availableChords]);

  // Audio-Wiedergabe: Intervall
  const playCurrentInterval = useCallback(() => {
    if (!currentIntervalQuestion) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime + 0.05;
    const rootFreq = midiToFreq(currentIntervalQuestion.rootMidi);
    const targetFreq = midiToFreq(currentIntervalQuestion.rootMidi + currentIntervalQuestion.interval.semitones);

    setIsAudioBusy(true);

    if (intervalPlayMode === 'ascending') {
      playTone(rootFreq, now, 0.7);
      playTone(targetFreq, now + 0.65, 0.9);
      setTimeout(() => setIsAudioBusy(false), 1600);
    } else if (intervalPlayMode === 'descending') {
      playTone(targetFreq, now, 0.7);
      playTone(rootFreq, now + 0.65, 0.9);
      setTimeout(() => setIsAudioBusy(false), 1600);
    } else {
      // Harmonisch (simultan)
      playTone(rootFreq, now, 1.3, 0.25);
      playTone(targetFreq, now, 1.3, 0.25);
      setTimeout(() => setIsAudioBusy(false), 1400);
    }
  }, [currentIntervalQuestion, intervalPlayMode, getAudioContext, playTone]);

  // Didaktischer A/B-Hörvergleich bei Fehlern (Spielt Falsch vs. Richtig)
  const playABComparison = useCallback(() => {
    if (!currentIntervalQuestion || !selectedIntervalAnswer) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime + 0.05;
    const rootFreq = midiToFreq(currentIntervalQuestion.rootMidi);

    const wrongIntervalItem = INTERVAL_CATALOG.find(i => i.id === selectedIntervalAnswer);
    const correctIntervalItem = currentIntervalQuestion.interval;

    if (!wrongIntervalItem) return;

    setIsAudioBusy(true);
    const wrongTargetFreq = midiToFreq(currentIntervalQuestion.rootMidi + wrongIntervalItem.semitones);
    const correctTargetFreq = midiToFreq(currentIntervalQuestion.rootMidi + correctIntervalItem.semitones);

    // 1. Dein Tipp (falsch)
    playTone(rootFreq, now, 0.5);
    playTone(wrongTargetFreq, now + 0.45, 0.65);

    // Pause (450ms)

    // 2. Das gesuchte Intervall (richtig)
    const secondNow = now + 1.25;
    playTone(rootFreq, secondNow, 0.6);
    playTone(correctTargetFreq, secondNow + 0.55, 0.85);

    setTimeout(() => setIsAudioBusy(false), 2400);
  }, [currentIntervalQuestion, selectedIntervalAnswer, getAudioContext, playTone]);

  // Song-Anker Melodie vorspielen
  const playSongAnchorMelody = useCallback(() => {
    if (!currentIntervalQuestion) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime + 0.05;
    const rootMidi = currentIntervalQuestion.rootMidi;
    const { anchorNotes } = currentIntervalQuestion.interval;

    setIsAudioBusy(true);
    anchorNotes.forEach((offset, idx) => {
      playTone(midiToFreq(rootMidi + offset), now + idx * 0.32, 0.38, 0.28);
    });

    setTimeout(() => setIsAudioBusy(false), (anchorNotes.length * 0.32 + 0.5) * 1000);
  }, [currentIntervalQuestion, getAudioContext, playTone]);

  // Audio-Wiedergabe: Akkord
  const playCurrentChord = useCallback(() => {
    if (!currentChordQuestion) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime + 0.05;
    const { rootMidi, chord } = currentChordQuestion;

    setIsAudioBusy(true);

    if (chordPlayMode === 'block') {
      chord.intervals.forEach(offset => {
        playTone(midiToFreq(rootMidi + offset), now, 1.6, 0.22);
      });
      setTimeout(() => setIsAudioBusy(false), 1700);
    } else if (chordPlayMode === 'arpeggio_up') {
      chord.intervals.forEach((offset, idx) => {
        playTone(midiToFreq(rootMidi + offset), now + idx * 0.25, 0.8, 0.25);
      });
      setTimeout(() => setIsAudioBusy(false), (chord.intervals.length * 0.25 + 0.9) * 1000);
    } else {
      const reversed = [...chord.intervals].reverse();
      reversed.forEach((offset, idx) => {
        playTone(midiToFreq(rootMidi + offset), now + idx * 0.25, 0.8, 0.25);
      });
      setTimeout(() => setIsAudioBusy(false), (reversed.length * 0.25 + 0.9) * 1000);
    }
  }, [currentChordQuestion, chordPlayMode, getAudioContext, playTone]);

  // Audio-Wiedergabe: Rhythmus-Motiv
  const playCurrentRhythm = useCallback(() => {
    if (isRhythmPlaying) return;
    const ctx = getAudioContext();
    const bpm = 90;
    const stepDuration = 60 / bpm / 2;
    const now = ctx.currentTime + 0.05;

    setIsRhythmPlaying(true);
    setUserRhythmHits([]);
    setRhythmEvaluationScore(null);

    // 4 Klicks Vorzähler
    for (let c = 0; c < 4; c++) {
      playClick(now + c * (stepDuration * 2), c === 0);
    }

    const rhythmStartTime = now + 4 * (stepDuration * 2);
    rhythmStartTimeRef.current = rhythmStartTime;

    currentRhythmQuestion.notes.forEach(note => {
      if (note.isHit) {
        playTone(440, rhythmStartTime + note.step * stepDuration, 0.15, 0.35);
      }
    });

    const totalDuration = (4 * (stepDuration * 2) + currentRhythmQuestion.beats * stepDuration + 0.5) * 1000;
    setTimeout(() => {
      setIsRhythmPlaying(false);
    }, totalDuration);
  }, [isRhythmPlaying, currentRhythmQuestion, getAudioContext, playClick, playTone]);

  const handleRhythmTap = () => {
    const ctx = getAudioContext();
    playClick(ctx.currentTime, true);

    const hitTime = ctx.currentTime;
    const relativeTime = hitTime - rhythmStartTimeRef.current;
    if (relativeTime > 0) {
      setUserRhythmHits(prev => [...prev, relativeTime]);
    }
  };

  const evaluateRhythm = () => {
    const stepDuration = 60 / 90 / 2;
    const targetHitTimes = currentRhythmQuestion.notes
      .filter(n => n.isHit)
      .map(n => n.step * stepDuration);

    if (userRhythmHits.length === 0) {
      setRhythmEvaluationScore(0);
      return;
    }

    let hitMatches = 0;
    targetHitTimes.forEach(targetTime => {
      const matched = userRhythmHits.some(userTime => Math.abs(userTime - targetTime) <= 0.12);
      if (matched) hitMatches++;
    });

    const score = Math.round((hitMatches / targetHitTimes.length) * 100);
    setRhythmEvaluationScore(score);

    if (score >= 75) {
      handleCorrectAnswer(score >= 90 ? 25 : 15, 'Rhythmus-Treffer gemeistert');
    }
  };

  // Initialisiere erste Fragen bei Mount oder Level-Wechsel
  useEffect(() => {
    generateNewIntervalQuestion();
    generateNewChordQuestion();
  }, [vdmLevel, generateNewIntervalQuestion, generateNewChordQuestion]);

  // ESC-Key & Spacebar Audio-Trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
      if (e.code === 'Space' && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
        if (!isAudioBusy) {
          e.preventDefault();
          if (activePillar === 'intervals') playCurrentInterval();
          else if (activePillar === 'chords') playCurrentChord();
          else if (activePillar === 'rhythm') playCurrentRhythm();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isAudioBusy, activePillar, playCurrentInterval, playCurrentChord, playCurrentRhythm]);

  // Antwort-Logik mit XP-Ökonomie & Daily-Cap
  const handleCorrectAnswer = (baseXp: number, reason: string) => {
    const isFreeMode = hasCompletedDailyChallengeTodayRef.current;
    const awardedXp = isFreeMode ? 2 : baseXp;

    setStreak(prev => prev + 1);
    setSessionXpEarned(prev => prev + awardedXp);
    setChallengeProgress(prev => ({
      ...prev,
      correctCount: prev.correctCount + 1
    }));

    if (onRewardXp) {
      onRewardXp(awardedXp, reason);
    }
  };

  const handleWrongAnswer = (questionItem: { rootMidi: number; interval: IntervalItem }) => {
    setStreak(0);
    // Spaced-Repetition: In die Wiederholungs-Queue für diesen Durchgang legen
    spacedRepetitionQueueRef.current.push(questionItem);
  };

  const submitIntervalAnswer = (intervalId: string) => {
    if (isIntervalAnswerSubmitted || !currentIntervalQuestion) return;
    setSelectedIntervalAnswer(intervalId);
    setIsIntervalAnswerSubmitted(true);

    const isCorrect = intervalId === currentIntervalQuestion.interval.id;
    if (isCorrect) {
      handleCorrectAnswer(10, `Intervall erkannt: ${currentIntervalQuestion.interval.name}`);
    } else {
      handleWrongAnswer(currentIntervalQuestion);
    }
  };

  const submitChordAnswer = (chordId: string) => {
    if (isChordAnswerSubmitted || !currentChordQuestion) return;
    setSelectedChordAnswer(chordId);
    setIsChordAnswerSubmitted(true);

    const isCorrect = chordId === currentChordQuestion.chord.id;
    if (isCorrect) {
      handleCorrectAnswer(10, `Akkord erkannt: ${currentChordQuestion.chord.name}`);
    } else {
      setStreak(0);
    }
  };

  const nextChallengeQuestion = () => {
    if (challengeProgress.current < challengeProgress.total) {
      setChallengeProgress(prev => ({ ...prev, current: prev.current + 1 }));
      if (activePillar === 'intervals') {
        generateNewIntervalQuestion();
      } else if (activePillar === 'chords') {
        generateNewChordQuestion();
      }
    } else {
      // 10 Fragen abgeschlossen -> Schülernahe Erfolgsfeier & Auszeichnung!
      finishDailyChallenge();
    }
  };

  const finishDailyChallenge = () => {
    setIsCompletedCelebration(true);
    hasCompletedDailyChallengeTodayRef.current = true;

    // Bonus-Kalkulation: +50 XP Challenge-Bonus, +25 XP bei 100% Streak
    let bonusXp = 50;
    if (challengeProgress.correctCount === challengeProgress.total) {
      bonusXp += 25;
    }

    const totalSessionXp = sessionXpEarned + bonusXp;
    setSessionXpEarned(prev => prev + bonusXp);
    if (onRewardXp) {
      onRewardXp(bonusXp, `Tages-Challenge ${vdmLevel.toUpperCase()} gemeistert (${challengeProgress.correctCount}/${challengeProgress.total})`);
    }

    if (onSessionComplete) {
      onSessionComplete({
        vdmLevel,
        pillar: activePillar,
        accuracy: Math.round((challengeProgress.correctCount / challengeProgress.total) * 100),
        xp: totalSessionXp
      });
    }
  };

  const restartNewSession = () => {
    setIsCompletedCelebration(false);
    setChallengeProgress({ current: 1, total: 10, correctCount: 0 });
    setStreak(0);
    spacedRepetitionQueueRef.current = [];
    generateNewIntervalQuestion();
    generateNewChordQuestion();
  };

  const modalContent = (
    <div
      style={{
        background: isNotebook ? 'transparent' : '#ffffff',
        borderRadius: isNotebook ? '0px' : '24px',
        border: isNotebook ? 'none' : '1.5px solid #e2e8f0',
        boxShadow: isNotebook ? 'none' : (embedded ? '0 8px 24px -4px rgba(0, 0, 0, 0.06)' : '0 25px 50px -12px rgba(0, 0, 0, 0.35)'),
        maxWidth: isNotebook ? '860px' : (embedded ? '100%' : '780px'),
        width: '100%',
        maxHeight: isNotebook || embedded ? 'none' : '94vh',
        display: 'flex',
        flexDirection: 'column',
        gap: isNotebook ? '14px' : '0px',
        overflow: isNotebook || embedded ? 'visible' : 'hidden',
        animation: embedded ? undefined : 'scaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <style>{`
        @keyframes earLabWavePulse {
          0% { transform: scaleY(0.35); }
          50% { transform: scaleY(1.0); }
          100% { transform: scaleY(0.45); }
        }
      `}</style>
        {/* 1. Header mit Status, Referenzton, XP & Close */}
        <div
          style={{
            padding: isNotebook ? '2px 4px 6px 4px' : '16px 20px',
            borderBottom: isNotebook ? 'none' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isNotebook ? 'transparent' : 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isNotebook ? '14px' : '12px' }}>
            <div
              style={{
                width: isNotebook ? '46px' : '42px',
                height: isNotebook ? '46px' : '42px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.28)',
                flexShrink: 0
              }}
            >
              <Headphones size={isNotebook ? 24 : 22} color="#ffffff" strokeWidth={2.3} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: isNotebook ? '1.24rem' : '1.15rem',
                    fontWeight: 950,
                    color: '#0f172a',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2
                  }}
                >
                  {uiLevel === 'junior' ? 'Klang-Detektiv 🎧' : 'EarLab & Harmony'}
                </h2>
                <span
                  style={{
                    fontSize: '0.70rem',
                    fontWeight: 900,
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    padding: '2px 8px',
                    borderRadius: '100px',
                    letterSpacing: '0.02em'
                  }}
                >
                  {uiLevel === 'junior' ? 'Zauber-Gehör' : `Stufe ${vdmLevel.toUpperCase()}`}
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.80rem', color: '#64748b', fontWeight: 650 }}>
                {uiLevel === 'junior' ? 'Finde die magischen Töne & Kuckucks-Rufe!' : 'Gehörbildungs- & Theorie-Studio'}
              </p>
            </div>
          </div>

          {/* Quick-Controls: Referenzton, Streak, XP, Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* 🔔 Stimmgabel-Referenzton A4 */}
            <button
              type="button"
              onClick={() => playReferencePitch('A4')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                padding: isNotebook ? '6px 12px' : '5px 9px',
                fontSize: isNotebook ? '0.78rem' : '0.74rem',
                fontWeight: 850,
                color: '#334155',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
              title="Kammerton A4 (440 Hz) als Orientierungshilfe anspielen"
            >
              <Radio size={14} color="#16a34a" />
              <span>A4 (440Hz)</span>
            </button>

            {/* Streak */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#fffbeb',
                color: '#92400e',
                border: '1.5px solid #fde68a',
                padding: isNotebook ? '6px 12px' : '5px 9px',
                borderRadius: '12px',
                fontSize: isNotebook ? '0.80rem' : '0.76rem',
                fontWeight: 950
              }}
              title="Aktuelle fehlerfreie Trefferserie"
            >
              <Flame size={14} color="#d97706" />
              <span>{streak}</span>
            </div>

            {/* XP */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                color: '#15803d',
                border: '1.5px solid #86efac',
                padding: isNotebook ? '6px 12px' : '5px 9px',
                borderRadius: '12px',
                fontSize: isNotebook ? '0.80rem' : '0.76rem',
                fontWeight: 950,
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.10)'
              }}
              title="In dieser Session verdiente Campus-XP"
            >
              <Zap size={14} color="#16a34a" fill="#16a34a" />
              <span>+{sessionXpEarned} XP</span>
            </div>

            {onClose && !isNotebook && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Schließen"
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={17} />
              </button>
            )}
          </div>
        </div>

        {/* 2. Sub-Header: Säulen-Umschalter, Klangfarbe & D-Stufen */}
        <div
          style={{
            padding: isNotebook ? '6px' : '10px 20px',
            background: '#f8fafc',
            borderRadius: isNotebook ? '20px' : '0px',
            border: isNotebook ? '1px solid #e2e8f0' : 'none',
            borderBottom: isNotebook ? '1px solid #e2e8f0' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          {/* Säulen-Auswahl */}
          <div
            style={{
              display: 'flex',
              background: '#e2e8f0',
              borderRadius: '14px',
              padding: '3px',
              gap: '3px'
            }}
          >
            <button
              type="button"
              onClick={() => setActivePillar('intervals')}
              style={{
                background: activePillar === 'intervals' ? '#ffffff' : 'transparent',
                color: activePillar === 'intervals' ? '#0f172a' : '#64748b',
                fontWeight: activePillar === 'intervals' ? 950 : 700,
                fontSize: isNotebook ? '0.82rem' : '0.78rem',
                border: 'none',
                borderRadius: '11px',
                padding: isNotebook ? '8px 14px' : '6px 12px',
                cursor: 'pointer',
                boxShadow: activePillar === 'intervals' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              1. Intervall-Labor
            </button>
            <button
              type="button"
              onClick={() => setActivePillar('chords')}
              style={{
                background: activePillar === 'chords' ? '#ffffff' : 'transparent',
                color: activePillar === 'chords' ? '#0f172a' : '#64748b',
                fontWeight: activePillar === 'chords' ? 950 : 700,
                fontSize: isNotebook ? '0.82rem' : '0.78rem',
                border: 'none',
                borderRadius: '11px',
                padding: isNotebook ? '8px 14px' : '6px 12px',
                cursor: 'pointer',
                boxShadow: activePillar === 'chords' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              2. Akkord-Labor
            </button>
            <button
              type="button"
              onClick={() => setActivePillar('rhythm')}
              style={{
                background: activePillar === 'rhythm' ? '#ffffff' : 'transparent',
                color: activePillar === 'rhythm' ? '#0f172a' : '#64748b',
                fontWeight: activePillar === 'rhythm' ? 950 : 700,
                fontSize: isNotebook ? '0.82rem' : '0.78rem',
                border: 'none',
                borderRadius: '11px',
                padding: isNotebook ? '8px 14px' : '6px 12px',
                cursor: 'pointer',
                boxShadow: activePillar === 'rhythm' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              3. Rhythmus-Diktat
            </button>
          </div>

          {/* Sound-Klangfarbe & Stufe */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Dual Sound Timbre Toggle */}
            <div
              style={{
                display: 'flex',
                background: '#e2e8f0',
                borderRadius: '10px',
                padding: '3px',
                gap: '3px'
              }}
            >
              <button
                type="button"
                onClick={() => setSoundTimbre('rhodes')}
                style={{
                  background: soundTimbre === 'rhodes' ? '#ffffff' : 'transparent',
                  color: soundTimbre === 'rhodes' ? '#0f172a' : '#64748b',
                  fontSize: '0.74rem',
                  fontWeight: 850,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  boxShadow: soundTimbre === 'rhodes' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                }}
                title="Studio-Rhodes: Warm, weich, obertongestützt"
              >
                Rhodes
              </button>
              <button
                type="button"
                onClick={() => setSoundTimbre('grand_piano')}
                style={{
                  background: soundTimbre === 'grand_piano' ? '#ffffff' : 'transparent',
                  color: soundTimbre === 'grand_piano' ? '#0f172a' : '#64748b',
                  fontSize: '0.74rem',
                  fontWeight: 850,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  boxShadow: soundTimbre === 'grand_piano' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                }}
                title="Konzertflügel: Perkussiver, akustischer Klavierklang"
              >
                Flügel
              </button>
            </div>

            {/* D-Stufen Toggles */}
            {uiLevel !== 'junior' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {(['d1', 'd2', 'd3'] as VdmLevel[]).map(lvl => {
                  const isActive = vdmLevel === lvl;
                  const label = lvl === 'd1' ? 'D1' : lvl === 'd2' ? 'D2' : 'D3';
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setVdmLevel(lvl)}
                      style={{
                        border: isActive ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                        background: isActive ? '#dcfce7' : '#ffffff',
                        color: isActive ? '#15803d' : '#475569',
                        fontSize: '0.74rem',
                        fontWeight: 900,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: isActive ? '0 1px 4px rgba(22, 163, 74, 0.15)' : 'none'
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 3. Modal Body */}
        <div
          style={{
            flex: 1,
            overflowY: isNotebook ? 'visible' : 'auto',
            padding: isNotebook ? '8px 0' : '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: isNotebook ? '18px' : '16px',
            boxSizing: 'border-box'
          }}
        >
          {/* FEIERLICHE ABSCHLUSSKARTE (Nach 10 Fragen) */}
          {isCompletedCelebration ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '16px',
                padding: '24px 16px',
                animation: 'scaleUp 0.2s ease'
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 12px 24px -4px rgba(245, 158, 11, 0.4)'
                }}
              >
                <Trophy size={44} color="#ffffff" strokeWidth={2.3} />
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 950, color: '#0f172a' }}>
                  {uiLevel === 'junior' ? '🎉 Zauber-Ohr Urkunde!' : `🎯 Stufe ${vdmLevel.toUpperCase()} gemeistert!`}
                </h3>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#64748b', fontWeight: 650 }}>
                  Du hast {challengeProgress.correctCount} von {challengeProgress.total} Hörübungen richtig erkannt ({Math.round((challengeProgress.correctCount / challengeProgress.total) * 100)}% Trefferquote).
                </p>
              </div>

              {/* Auszeichnung Badge */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '16px',
                  padding: '12px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <Award size={22} color="#16a34a" />
                <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#15803d' }}>
                  +{sessionXpEarned} Campus-XP gutgeschrieben & im Profil verewigt!
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={restartNewSession}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '12px 24px',
                    fontSize: '0.92rem',
                    fontWeight: 950,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                  }}
                >
                  <RotateCcw size={16} />
                  <span>Weiter trainieren (Freier Modus)</span>
                </button>

                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '14px',
                      padding: '12px 20px',
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Zum Hausaufgabenheft
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* SÄULE 1: INTERVALL-LABOR */}
              {activePillar === 'intervals' && currentIntervalQuestion && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Playback Controls & Mode Toggle */}
                  {/* Elevated Tactile Playback Stage */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '24px',
                      padding: '22px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '18px',
                      boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    {/* Top row: Mode selector + Progress pill */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '4px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 850, color: '#64748b', padding: '0 8px' }}>Richtung:</span>
                        {[
                          { id: 'ascending', label: '▲ Aufsteigend' },
                          { id: 'descending', label: '▼ Absteigend' },
                          { id: 'harmonic', label: '◆ Harmonisch' }
                        ].map(mode => {
                          const isSel = intervalPlayMode === mode.id;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setIntervalPlayMode(mode.id as IntervalPlaybackMode)}
                              style={{
                                padding: '5px 11px',
                                borderRadius: '10px',
                                border: isSel ? '1.5px solid #16a34a' : '1px solid transparent',
                                background: isSel ? '#ffffff' : 'transparent',
                                color: isSel ? '#15803d' : '#475569',
                                fontSize: '0.74rem',
                                fontWeight: isSel ? 950 : 800,
                                cursor: 'pointer',
                                boxShadow: isSel ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {mode.label}
                            </button>
                          );
                        })}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          padding: '5px 14px',
                          borderRadius: '100px'
                        }}
                      >
                        <Volume2 size={13} color="#16a34a" />
                        <span style={{ fontSize: '0.76rem', fontWeight: 950, color: '#15803d' }}>
                          Frage {challengeProgress.current} von {challengeProgress.total}
                        </span>
                      </div>
                    </div>

                    {/* Großer Taktiler Play-Button mit Leertasten-Hinweis */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={playCurrentInterval}
                        disabled={isAudioBusy}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '12px',
                          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '24px',
                          padding: '16px 36px',
                          fontSize: '1.04rem',
                          fontWeight: 950,
                          cursor: isAudioBusy ? 'wait' : 'pointer',
                          boxShadow: '0 8px 24px -4px rgba(22, 163, 74, 0.45)',
                          transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                          minHeight: '56px'
                        }}
                        className="hover-scale"
                      >
                        {isAudioBusy ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '24px' }}>
                            {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7, 0.3].map((h, i) => (
                              <div
                                key={i}
                                style={{
                                  width: '4px',
                                  height: `${h * 20}px`,
                                  background: '#ffffff',
                                  borderRadius: '2px',
                                  transformOrigin: 'bottom',
                                  animation: `earLabWavePulse 0.5s ease-in-out infinite alternate ${i * 0.07}s`
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <Volume2 size={24} color="#ffffff" strokeWidth={2.3} />
                        )}
                        <span>{isAudioBusy ? 'Spielt Intervall...' : 'Intervall anhören'}</span>
                      </button>

                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.02em' }}>
                        Tipp: Drücke <kbd style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 5px', fontSize: '0.70rem', color: '#475569', fontWeight: 800 }}>Leertaste ␣</kbd> zum Abspielen
                      </span>
                    </div>
                  </div>

                  {/* Intervall-Antwort-Pads: Junior (große Klangtreppen) vs. Pro (Matrix) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 950, color: '#0f172a' }}>
                        {uiLevel === 'junior' ? 'Welchen Klang hast du gehört?' : 'Welches Intervall hast du gehört?'}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                        {availableIntervals.length} Intervalle zur Auswahl
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: uiLevel === 'junior' ? 'repeat(auto-fill, minmax(170px, 1fr))' : 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: '10px'
                      }}
                    >
                      {availableIntervals.map(inv => {
                        const isSelected = selectedIntervalAnswer === inv.id;
                        const isCorrect = isIntervalAnswerSubmitted && inv.id === currentIntervalQuestion.interval.id;
                        const isWrongSelection = isIntervalAnswerSubmitted && isSelected && !isCorrect;

                        let bg = '#ffffff';
                        let border = '1.5px solid #e2e8f0';
                        let color = '#0f172a';
                        let shadow = '0 2px 8px rgba(0,0,0,0.03)';

                        if (isCorrect) {
                          bg = '#dcfce7';
                          border = '2px solid #16a34a';
                          color = '#15803d';
                          shadow = '0 4px 14px rgba(22, 163, 74, 0.25)';
                        } else if (isWrongSelection) {
                          bg = '#fee2e2';
                          border = '2px solid #dc2626';
                          color = '#b91c1c';
                          shadow = '0 4px 14px rgba(220, 38, 38, 0.20)';
                        } else if (isSelected) {
                          bg = '#f1f5f9';
                          border = '2px solid #475569';
                        }

                        return (
                          <button
                            key={inv.id}
                            type="button"
                            disabled={isIntervalAnswerSubmitted}
                            onClick={() => submitIntervalAnswer(inv.id)}
                            style={{
                              background: bg,
                              border: border,
                              color: color,
                              borderRadius: '20px',
                              padding: uiLevel === 'junior' ? '16px 12px' : '14px 10px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              cursor: isIntervalAnswerSubmitted ? 'default' : 'pointer',
                              boxShadow: shadow,
                              transition: 'all 0.15s ease',
                              minHeight: '74px',
                              position: 'relative'
                            }}
                            className={isIntervalAnswerSubmitted ? '' : 'hover-scale-mini'}
                          >
                            {uiLevel === 'junior' ? (
                              <>
                                <span style={{ fontSize: '1.6rem' }}>{inv.juniorIcon}</span>
                                <span style={{ fontSize: '0.86rem', fontWeight: 950 }}>{inv.juniorName}</span>
                              </>
                            ) : (
                              <>
                                <span style={{ fontSize: '1.15rem', fontWeight: 950, letterSpacing: '-0.02em' }}>{inv.shortName}</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, opacity: 0.9 }}>{inv.name}</span>
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                                  {inv.semitones} HT
                                </span>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feedback, A/B Vergleich & Interaktiver Song-Anker */}
                  {isIntervalAnswerSubmitted && (
                    <div
                      style={{
                        background: selectedIntervalAnswer === currentIntervalQuestion.interval.id ? '#f0fdf4' : '#fef2f2',
                        border: selectedIntervalAnswer === currentIntervalQuestion.interval.id ? '1.5px solid #86efac' : '1.5px solid #fca5a5',
                        borderRadius: '20px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.04)',
                        animation: 'fadeIn 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {selectedIntervalAnswer === currentIntervalQuestion.interval.id ? (
                            <div style={{ background: '#16a34a', color: '#ffffff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Check size={18} strokeWidth={3} />
                            </div>
                          ) : (
                            <div style={{ background: '#dc2626', color: '#ffffff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <X size={18} strokeWidth={3} />
                            </div>
                          )}
                          <div>
                            <span style={{ fontSize: '0.96rem', fontWeight: 950, color: '#0f172a', display: 'block' }}>
                              {selectedIntervalAnswer === currentIntervalQuestion.interval.id
                                ? `Perfekt gelöst! Das war die ${currentIntervalQuestion.interval.name}.`
                                : `Fast! Das war die ${currentIntervalQuestion.interval.name} (${currentIntervalQuestion.interval.semitones} Halbtöne).`}
                            </span>
                          </div>
                        </div>

                        {/* Nächste Frage Button */}
                        <button
                          type="button"
                          onClick={nextChallengeQuestion}
                          style={{
                            background: '#0f172a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '14px',
                            padding: '11px 22px',
                            fontSize: '0.88rem',
                            fontWeight: 950,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                        >
                          <span>{challengeProgress.current < challengeProgress.total ? 'Nächste Frage' : 'Zur Auswertung'}</span>
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      {/* A/B Hörvergleich Button (nur bei Fehlern!) */}
                      {selectedIntervalAnswer !== currentIntervalQuestion.interval.id && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={playABComparison}
                            disabled={isAudioBusy}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: '#ffffff',
                              border: '1.5px solid #dc2626',
                              color: '#b91c1c',
                              padding: '8px 14px',
                              borderRadius: '12px',
                              fontSize: '0.80rem',
                              fontWeight: 900,
                              cursor: isAudioBusy ? 'wait' : 'pointer',
                              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.10)'
                            }}
                          >
                            <ArrowRightLeft size={15} />
                            <span>Didaktischer A/B-Vergleich (Tipp vs. Richtig anhören)</span>
                          </button>
                        </div>
                      )}

                      {/* Interaktive Audio-Brücke: Song-Anker zum Vorhören */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#ffffff',
                          borderRadius: '14px',
                          padding: '10px 16px',
                          border: '1px solid #e2e8f0',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Lightbulb size={18} color="#d97706" />
                          <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 700 }}>
                            <strong>Melodie-Anker:</strong> „{currentIntervalQuestion.interval.songAnchor}“
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={playSongAnchorMelody}
                          disabled={isAudioBusy}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '10px',
                            padding: '6px 12px',
                            fontSize: '0.76rem',
                            fontWeight: 850,
                            color: '#0f172a',
                            cursor: isAudioBusy ? 'wait' : 'pointer'
                          }}
                          className="hover-scale-mini"
                          title="Motiv-Melodie anhören"
                        >
                          <Play size={13} color="#16a34a" fill="#16a34a" />
                          <span>Motiv anhören</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SÄULE 2: AKKORD- & KADENZEN-LABOR */}
              {activePillar === 'chords' && currentChordQuestion && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Elevated Tactile Playback Stage */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '24px',
                      padding: '22px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '18px',
                      boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    {/* Top row: Mode selector + Progress pill */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '4px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 850, color: '#64748b', padding: '0 8px' }}>Spielweise:</span>
                        {[
                          { id: 'block', label: '◆ Block' },
                          { id: 'arpeggio_up', label: '▲ Arpeggio auf' },
                          { id: 'arpeggio_down', label: '▼ Arpeggio ab' }
                        ].map(mode => {
                          const isSel = chordPlayMode === mode.id;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setChordPlayMode(mode.id as ChordPlaybackMode)}
                              style={{
                                padding: '5px 11px',
                                borderRadius: '10px',
                                border: isSel ? '1.5px solid #2563eb' : '1px solid transparent',
                                background: isSel ? '#ffffff' : 'transparent',
                                color: isSel ? '#1d4ed8' : '#475569',
                                fontSize: '0.74rem',
                                fontWeight: isSel ? 950 : 800,
                                cursor: 'pointer',
                                boxShadow: isSel ? '0 2px 6px rgba(37,99,235,0.08)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {mode.label}
                            </button>
                          );
                        })}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          padding: '5px 14px',
                          borderRadius: '100px'
                        }}
                      >
                        <Volume2 size={13} color="#2563eb" />
                        <span style={{ fontSize: '0.76rem', fontWeight: 950, color: '#2563eb' }}>
                          Frage {challengeProgress.current} von {challengeProgress.total}
                        </span>
                      </div>
                    </div>

                    {/* Großer Taktiler Play-Button */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={playCurrentChord}
                        disabled={isAudioBusy}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '12px',
                          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '24px',
                          padding: '16px 36px',
                          fontSize: '1.04rem',
                          fontWeight: 950,
                          cursor: isAudioBusy ? 'wait' : 'pointer',
                          boxShadow: '0 8px 24px -4px rgba(37, 99, 235, 0.45)',
                          transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                          minHeight: '56px'
                        }}
                        className="hover-scale"
                      >
                        {isAudioBusy ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '24px' }}>
                            {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7, 0.3].map((h, i) => (
                              <div
                                key={i}
                                style={{
                                  width: '4px',
                                  height: `${h * 20}px`,
                                  background: '#ffffff',
                                  borderRadius: '2px',
                                  transformOrigin: 'bottom',
                                  animation: `earLabWavePulse 0.5s ease-in-out infinite alternate ${i * 0.07}s`
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <Volume2 size={24} color="#ffffff" strokeWidth={2.3} />
                        )}
                        <span>{isAudioBusy ? 'Spielt Akkord...' : 'Akkord anhören'}</span>
                      </button>

                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.02em' }}>
                        Tipp: Drücke <kbd style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 5px', fontSize: '0.70rem', color: '#475569', fontWeight: 800 }}>Leertaste ␣</kbd> zum Abspielen
                      </span>
                    </div>
                  </div>

                  {/* Akkord-Pads */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 950, color: '#0f172a' }}>
                        {uiLevel === 'junior' ? 'Welcher Klang-Freund ist das?' : 'Welchen Akkord-Typ hast du gehört?'}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                        {availableChords.length} Akkorde zur Auswahl
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: '10px'
                      }}
                    >
                      {availableChords.map(ch => {
                        const isSelected = selectedChordAnswer === ch.id;
                        const isCorrect = isChordAnswerSubmitted && ch.id === currentChordQuestion.chord.id;
                        const isWrongSelection = isChordAnswerSubmitted && isSelected && !isCorrect;

                        let bg = '#ffffff';
                        let border = '1.5px solid #e2e8f0';
                        let color = '#0f172a';
                        let shadow = '0 2px 8px rgba(0,0,0,0.03)';

                        if (isCorrect) {
                          bg = '#dcfce7';
                          border = '2px solid #16a34a';
                          color = '#15803d';
                          shadow = '0 4px 14px rgba(22, 163, 74, 0.25)';
                        } else if (isWrongSelection) {
                          bg = '#fee2e2';
                          border = '2px solid #dc2626';
                          color = '#b91c1c';
                          shadow = '0 4px 14px rgba(220, 38, 38, 0.20)';
                        } else if (isSelected) {
                          bg = '#f1f5f9';
                          border = '2px solid #475569';
                        }

                        return (
                          <button
                            key={ch.id}
                            type="button"
                            disabled={isChordAnswerSubmitted}
                            onClick={() => submitChordAnswer(ch.id)}
                            style={{
                              background: bg,
                              border: border,
                              color: color,
                              borderRadius: '20px',
                              padding: '14px 10px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              cursor: isChordAnswerSubmitted ? 'default' : 'pointer',
                              boxShadow: shadow,
                              transition: 'all 0.15s ease',
                              minHeight: '74px'
                            }}
                            className={isChordAnswerSubmitted ? '' : 'hover-scale-mini'}
                          >
                            <span style={{ fontSize: '1.15rem', fontWeight: 950, letterSpacing: '-0.02em' }}>{ch.shortName}</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, opacity: 0.9 }}>
                              {uiLevel === 'junior' ? ch.juniorName : ch.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feedback & Theorie */}
                  {isChordAnswerSubmitted && (
                    <div
                      style={{
                        background: selectedChordAnswer === currentChordQuestion.chord.id ? '#f0fdf4' : '#fef2f2',
                        border: selectedChordAnswer === currentChordQuestion.chord.id ? '1.5px solid #86efac' : '1.5px solid #fca5a5',
                        borderRadius: '20px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.04)',
                        animation: 'fadeIn 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {selectedChordAnswer === currentChordQuestion.chord.id ? (
                            <div style={{ background: '#16a34a', color: '#ffffff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Check size={18} strokeWidth={3} />
                            </div>
                          ) : (
                            <div style={{ background: '#dc2626', color: '#ffffff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <X size={18} strokeWidth={3} />
                            </div>
                          )}
                          <div>
                            <span style={{ fontSize: '0.96rem', fontWeight: 950, color: '#0f172a', display: 'block' }}>
                              {selectedChordAnswer === currentChordQuestion.chord.id
                                ? `Hervorragend erkannt! Das war ein ${currentChordQuestion.chord.name}.`
                                : `Auflösung: Es war ein ${currentChordQuestion.chord.name}.`}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={nextChallengeQuestion}
                          style={{
                            background: '#0f172a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '14px',
                            padding: '11px 22px',
                            fontSize: '0.88rem',
                            fontWeight: 950,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                        >
                          <span>{challengeProgress.current < challengeProgress.total ? 'Nächste Frage' : 'Zur Auswertung'}</span>
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: '#ffffff',
                          borderRadius: '14px',
                          padding: '10px 16px',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        <Lightbulb size={18} color="#d97706" />
                        <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 700 }}>
                          <strong>Klang-Charakter:</strong> {currentChordQuestion.chord.description}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SÄULE 3: RHYTHMUS-DIKTAT & TIME-MATCHER */}
              {activePillar === 'rhythm' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {RHYTHM_CATALOG.map(rhy => (
                      <button
                        key={rhy.id}
                        type="button"
                        onClick={() => {
                          setCurrentRhythmQuestion(rhy);
                          setUserRhythmHits([]);
                          setRhythmEvaluationScore(null);
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '12px',
                          border: currentRhythmQuestion.id === rhy.id ? '2px solid #ea580c' : '1px solid #cbd5e1',
                          background: currentRhythmQuestion.id === rhy.id ? '#fff7ed' : '#ffffff',
                          color: currentRhythmQuestion.id === rhy.id ? '#c2410c' : '#475569',
                          fontSize: '0.78rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {rhy.title} ({rhy.vdmLevel.toUpperCase()})
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '24px',
                      padding: '24px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '18px',
                      boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <button
                      type="button"
                      onClick={playCurrentRhythm}
                      disabled={isRhythmPlaying}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '12px 24px',
                        fontSize: '0.94rem',
                        fontWeight: 950,
                        cursor: isRhythmPlaying ? 'wait' : 'pointer',
                        boxShadow: '0 6px 16px -2px rgba(249, 115, 22, 0.35)'
                      }}
                    >
                      <Play size={20} color="#ffffff" />
                      <span>{isRhythmPlaying ? 'Spiele Motiv vor...' : 'Motiv anhören & vorbereiten'}</span>
                    </button>

                    {/* Haptisches Tap-Pad */}
                    <button
                      type="button"
                      onClick={handleRhythmTap}
                      style={{
                        width: '100%',
                        maxWidth: '380px',
                        minHeight: '140px',
                        borderRadius: '24px',
                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        border: '3px solid #334155',
                        color: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 12px 30px -6px rgba(15, 23, 42, 0.3)',
                        transition: 'all 0.1s ease',
                        userSelect: 'none',
                        WebkitUserSelect: 'none'
                      }}
                      className="hover-scale-mini"
                    >
                      <Target size={36} color="#f97316" />
                      <span style={{ fontSize: '1.05rem', fontWeight: 950 }}>HIER TIPPEN</span>
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        {userRhythmHits.length} Schläge erfasst
                      </span>
                    </button>

                    <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '380px' }}>
                      <button
                        type="button"
                        onClick={evaluateRhythm}
                        disabled={userRhythmHits.length === 0}
                        style={{
                          flex: 2,
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '14px',
                          padding: '12px',
                          fontSize: '0.86rem',
                          fontWeight: 950,
                          cursor: userRhythmHits.length === 0 ? 'not-allowed' : 'pointer',
                          opacity: userRhythmHits.length === 0 ? 0.6 : 1
                        }}
                      >
                        Timing auswerten
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUserRhythmHits([]);
                          setRhythmEvaluationScore(null);
                        }}
                        style={{
                          flex: 1,
                          background: '#e2e8f0',
                          color: '#475569',
                          border: 'none',
                          borderRadius: '14px',
                          padding: '12px',
                          fontSize: '0.86rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        Reset
                      </button>
                    </div>

                    {rhythmEvaluationScore !== null && (
                      <div
                        style={{
                          background: rhythmEvaluationScore >= 75 ? '#f0fdf4' : '#fffbeb',
                          border: rhythmEvaluationScore >= 75 ? '1.5px solid #86efac' : '1.5px solid #fde68a',
                          borderRadius: '16px',
                          padding: '14px 20px',
                          width: '100%',
                          maxWidth: '380px',
                          textAlign: 'center',
                          boxSizing: 'border-box'
                        }}
                      >
                        <div style={{ fontSize: '1.35rem', fontWeight: 950, color: rhythmEvaluationScore >= 75 ? '#15803d' : '#b45309' }}>
                          {rhythmEvaluationScore}% Timing-Präzision!
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                          {rhythmEvaluationScore >= 90
                            ? '🎯 Goldstandard! In the Pocket!'
                            : rhythmEvaluationScore >= 75
                            ? '⭐ Sehr gutes Timing! Stufe gemeistert!'
                            : 'Übe das Motiv noch einmal langsam mit Metronom.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 4. Footer: Status & Fortschritt */}
        <div
          style={{
            padding: isNotebook ? '14px 18px' : '12px 20px',
            borderTop: isNotebook ? 'none' : '1px solid #e2e8f0',
            borderRadius: isNotebook ? '20px' : '0px',
            background: isNotebook ? '#f8fafc' : '#ffffff',
            border: isNotebook ? '1.5px solid #e2e8f0' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={16} color="#d97706" />
            <span style={{ fontSize: '0.78rem', fontWeight: 850, color: '#334155' }}>
              Tages-Challenge: {challengeProgress.correctCount} von {challengeProgress.total} gelöst
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 900,
                color: '#15803d',
                background: '#dcfce7',
                border: '1px solid #bbf7d0',
                padding: '3px 10px',
                borderRadius: '100px'
              }}
            >
              Gehörbildungs-Studio • Campus-Groovelab
            </span>
          </div>
        </div>
      </div>
  );

  if (embedded) {
    return (
      <div style={{ width: '100%', maxWidth: isNotebook ? '860px' : '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {onClose && !isNotebook && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                padding: '8px 16px',
                fontSize: '0.84rem',
                fontWeight: 800,
                color: '#334155',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
            >
              <ArrowLeft size={16} color="#16a34a" />
              <span>← Zurück zu den Modulen</span>
            </button>
          </div>
        )}
        {modalContent}
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="EarLab & Harmony-Studio"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '12px',
        boxSizing: 'border-box'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      {modalContent}
    </div>
  );
};
