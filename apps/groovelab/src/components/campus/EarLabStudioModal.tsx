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
import { 
  RealtimePitchStream, 
  YinPitchResult, 
  evaluatePitchMatch, 
  midiToNoteName, 
  midiToFreq 
} from '../../services/audio/YinPitchDetectionEngine';
import { EarLeaderboardWidget, EarDiscipline, EarVdmLevel } from './EarLeaderboardWidget';
import { 
  VdmBadgeLevel, 
  VdmMedallionSvg, 
  saveVdmBadge, 
  getVdmPredicate, 
  getVdmBadgeTitle 
} from './VdmBadgeMedallions';
import { supabase } from '../../lib/supabase';

export type TrainingPillar = 'intervals' | 'chords' | 'pitch_match';
export type VdmLevel = 'junior' | 'd1' | 'd2' | 'd3';
export type IntervalPlaySelectionMode = 'ascending' | 'descending' | 'harmonic' | 'vdm_mix';

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
  anchorNotes: (number | AnchorNoteStep)[]; // Halbtöne relativ zum Grundton oder rhythmisierte Steps
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

// 🎼 Didaktisch modernisierte Song-Anker & didaktische Intervalle (0,1% Goldstandard: Rhythmus & Tonsprung-Spotlighting)
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
    vdmLevel: 'junior',
    songAnchor: 'Ton-Wiederholung (Gleicher Ton) / Zwilling',
    anchorNotes: [
      { semitones: 0, duration: 0.45, isTargetInterval: true },
      { semitones: 0, duration: 0.45, isTargetInterval: true },
      { semitones: 0, duration: 0.85, isTargetInterval: false }
    ]
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
    songAnchor: 'Der weiße Hai / Billie Eilish (Bad Guy)',
    anchorNotes: [
      { semitones: 0, duration: 0.55, isTargetInterval: true },
      { semitones: 1, duration: 0.55, isTargetInterval: true },
      { semitones: 0, duration: 0.35, isTargetInterval: false },
      { semitones: 1, duration: 0.50, isTargetInterval: false }
    ]
  },
  {
    id: 'M2',
    semitones: 2,
    name: 'Große Sekunde',
    shortName: 'g2',
    juniorName: 'Schritt',
    visualDots: '● ↗ ●',
    songAnchorShort: 'Alle meine Entchen • 2 HT',
    proShort: 'M2',
    proClassification: 'Ganztonschritt • 2 HT',
    vdmLevel: 'd1',
    songAnchor: 'Alle meine Entchen / Happy Birthday',
    anchorNotes: [
      { semitones: 0, duration: 0.35, isTargetInterval: true },
      { semitones: 2, duration: 0.35, isTargetInterval: true },
      { semitones: 4, duration: 0.30, isTargetInterval: false },
      { semitones: 5, duration: 0.30, isTargetInterval: false },
      { semitones: 7, duration: 0.45, isTargetInterval: false },
      { semitones: 7, duration: 0.55, isTargetInterval: false }
    ]
  },
  {
    id: 'm3',
    semitones: 3,
    name: 'Kleine Terz',
    shortName: 'k3',
    juniorName: 'Kuckuck',
    visualDots: '● ↘ ●',
    songAnchorShort: 'Kuckuck, Kuckuck • 3 HT',
    proShort: 'm3',
    proClassification: 'Moll-Terz • 3 HT',
    vdmLevel: 'junior',
    songAnchor: 'Kuckuck, Kuckuck / Smoke on the Water',
    anchorNotes: [
      { semitones: 3, duration: 0.48, isTargetInterval: true },
      { semitones: 0, duration: 0.65, isTargetInterval: true },
      { semitones: 3, duration: 0.35, isTargetInterval: false },
      { semitones: 0, duration: 0.60, isTargetInterval: false }
    ]
  },
  {
    id: 'M3',
    semitones: 4,
    name: 'Große Terz',
    shortName: 'g3',
    juniorName: 'Morgensonne',
    visualDots: '● ↗ ⬤',
    songAnchorShort: 'Alle Vögel • 4 HT',
    proShort: 'M3',
    proClassification: 'Dur-Terz • 4 HT',
    vdmLevel: 'd1',
    songAnchor: 'Alle Vögel sind schon da / Oh When the Saints',
    anchorNotes: [
      { semitones: 0, duration: 0.42, isTargetInterval: true },
      { semitones: 4, duration: 0.42, isTargetInterval: true },
      { semitones: 7, duration: 0.38, isTargetInterval: false },
      { semitones: 4, duration: 0.38, isTargetInterval: false },
      { semitones: 0, duration: 0.65, isTargetInterval: false }
    ]
  },
  {
    id: 'p4',
    semitones: 5,
    name: 'Reine Quarte',
    shortName: '4',
    juniorName: 'Tatü-Tata',
    visualDots: '● ↗ ⬤',
    songAnchorShort: 'Tatü-Tata • 5 HT',
    proShort: 'P4',
    proClassification: 'Subdominante • 5 HT',
    vdmLevel: 'junior',
    songAnchor: 'Tatü-Tata (Feuerwehr) / O Tannenbaum',
    anchorNotes: [
      { semitones: 0, duration: 0.48, isTargetInterval: true },
      { semitones: 5, duration: 0.65, isTargetInterval: true },
      { semitones: 0, duration: 0.40, isTargetInterval: false },
      { semitones: 5, duration: 0.65, isTargetInterval: false }
    ]
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
    anchorNotes: [
      { semitones: 0, duration: 0.55, isTargetInterval: true },
      { semitones: 6, duration: 0.45, isTargetInterval: true },
      { semitones: 7, duration: 0.85, isTargetInterval: false }
    ]
  },
  {
    id: 'p5',
    semitones: 7,
    name: 'Reine Quinte',
    shortName: '5',
    juniorName: 'Zauberruf',
    visualDots: '● ⤢ ⬤',
    songAnchorShort: 'Weihnachtsmann • 7 HT',
    proShort: 'P5',
    proClassification: 'Dominante • 7 HT',
    vdmLevel: 'junior',
    songAnchor: 'Morgen kommt der Weihnachtsmann / Star Wars',
    anchorNotes: [
      { semitones: 0, duration: 0.45, isTargetInterval: true },
      { semitones: 7, duration: 0.50, isTargetInterval: true },
      { semitones: 7, duration: 0.35, isTargetInterval: false },
      { semitones: 9, duration: 0.35, isTargetInterval: false },
      { semitones: 9, duration: 0.35, isTargetInterval: false },
      { semitones: 7, duration: 0.75, isTargetInterval: false }
    ]
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
    songAnchor: 'Für Elise / Love Story (Schicksalsmelodie)',
    anchorNotes: [
      { semitones: 0, duration: 0.45, isTargetInterval: true },
      { semitones: 8, duration: 0.48, isTargetInterval: true },
      { semitones: 7, duration: 0.85, isTargetInterval: false }
    ]
  },
  {
    id: 'M6',
    semitones: 9,
    name: 'Große Sexte',
    shortName: 'g6',
    juniorName: 'Biene Maja',
    visualDots: '● ⤢ ⬤',
    songAnchorShort: 'Biene Maja • 9 HT',
    proShort: 'M6',
    proClassification: 'gr. Sexte • 9 HT',
    vdmLevel: 'd2',
    songAnchor: 'Die Biene Maja / My Bonnie lies over the ocean',
    anchorNotes: [
      { semitones: 0, duration: 0.48, isTargetInterval: true },
      { semitones: 9, duration: 0.48, isTargetInterval: true },
      { semitones: 7, duration: 0.85, isTargetInterval: false }
    ]
  },
  {
    id: 'm7',
    semitones: 10,
    name: 'Kleine Septime',
    shortName: 'k7',
    juniorName: 'Blues-Sprung',
    visualDots: '● ⤢ ⬤',
    songAnchorShort: 'The Winner • 10 HT',
    proShort: 'm7',
    proClassification: 'kl. Septime • 10 HT',
    vdmLevel: 'd2',
    songAnchor: 'The Winner Takes It All / Star Trek Theme',
    anchorNotes: [
      { semitones: 0, duration: 0.42, isTargetInterval: true },
      { semitones: 10, duration: 0.55, isTargetInterval: true },
      { semitones: 8, duration: 0.85, isTargetInterval: false }
    ]
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
    anchorNotes: [
      { semitones: 0, duration: 0.35, isTargetInterval: true },
      { semitones: 11, duration: 0.65, isTargetInterval: true },
      { semitones: 12, duration: 0.85, isTargetInterval: false }
    ]
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
    vdmLevel: 'junior',
    songAnchor: 'Somewhere Over the Rainbow / Riesensprung',
    anchorNotes: [
      { semitones: 0, duration: 0.62, isTargetInterval: true },
      { semitones: 12, duration: 0.72, isTargetInterval: true },
      { semitones: 11, duration: 0.35, isTargetInterval: false },
      { semitones: 7, duration: 0.35, isTargetInterval: false },
      { semitones: 8, duration: 0.35, isTargetInterval: false },
      { semitones: 9, duration: 0.85, isTargetInterval: false }
    ]
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
    vdmLevel: 'junior',
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
    vdmLevel: 'junior',
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

// 🔄 Dreiklangs-Umkehrungen (D2–D3 Musikschul-Standard)
export interface ChordInversionItem {
  id: string;
  name: string;
  shortName: string;
  juniorName: string;
  visualSymbol: string;
  intervals: number[];
  proClassification: string;
  description: string;
}

const CHORD_INVERSIONS: ChordInversionItem[] = [
  {
    id: 'root_pos',
    name: 'Grundstellung',
    shortName: 'Grundst.',
    juniorName: 'Boden-Klang',
    visualSymbol: '▲ 1-3-5',
    intervals: [0, 4, 7],
    proClassification: 'Grundstellung (1-3-5)',
    description: 'Der Grundton liegt im Bass (stabil & fest)'
  },
  {
    id: 'first_inv',
    name: '1. Umkehrung (Sextakkord)',
    shortName: 'Sextakkord',
    juniorName: 'Schwebeklang',
    visualSymbol: '✦ 3-5-1',
    intervals: [4, 7, 12],
    proClassification: 'Sextakkord (3-5-8)',
    description: 'Die Terz liegt im Bass (leicht schwebend)'
  },
  {
    id: 'second_inv',
    name: '2. Umkehrung (Quartsextakkord)',
    shortName: 'Quartsext',
    juniorName: 'Spannungsklang',
    visualSymbol: '■ 5-1-3',
    intervals: [7, 12, 16],
    proClassification: 'Quartsextakkord (5-8-10)',
    description: 'Die Quinte liegt im Bass (drängend & offen)'
  }
];

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
  const w = 38;
  const h = 22;
  const r = 2.6; // Feiner, pädagogischer Ton-Punkt

  // 1. PRIME (Unisono / Zwilling): 0 Halbtöne
  if (semitones === 0 || id === 'p1') {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} aria-hidden="true">
        {/* Referenz-Horizont */}
        <line x1="4" y1="16.5" x2="34" y2="16.5" stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.22" />
        {/* Gestrichelte Gleichklang-Brücke */}
        <line x1="8" y1="11" x2="30" y2="11" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2 2" />
        <circle cx="8" cy="11" r={r} fill={color} />
        <circle cx="30" cy="11" r={r} fill={color} />
      </svg>
    );
  }

  // Proportionale vertikale Auslenkung (Δy): 1 HT = 1.3px ... 12 HT = 13.5px
  // Sekunde (2 HT): Δy = 2.6px (sanfter Schritt)
  // Kl. Terz (3 HT): Δy = 3.9px
  // Gr. Terz (4 HT): Δy = 5.2px
  // Quarte (5 HT): Δy = 6.6px (deutlicher Sprung)
  // Quinte (7 HT): Δy = 9.2px (weiter Signalruf)
  // Oktave (12 HT): Δy = 13.5px (maximaler Himmelsbogen)
  const dy = Math.min(13.5, Math.max(1.5, semitones * 1.25));

  // 2. MODUS: HARMONISCH (◆ Zusammen / Simultan)
  // Beide Töne erklingen gleichzeitig -> vertikales "Türmchen" wie ein Noten-Zweiklang
  if (mode === 'harmonic') {
    const x = 19;
    const yBase = 17.5;
    const yTarget = Math.max(4, yBase - dy);
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} aria-hidden="true">
        {/* Referenz-Horizont */}
        <line x1="9" y1="19.5" x2="29" y2="19.5" stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.25" />
        {/* Vertikale Zweiklang-Klammer */}
        <line x1={x} y1={yBase} x2={x} y2={yTarget} stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx={x} cy={yBase} r={r} fill={color} />
        <circle cx={x} cy={yTarget} r={r} fill={color} />
      </svg>
    );
  }

  // 3. MODUS: ABSTEIGEND (▼ Ab)
  // Ton 1 beginnt oben links, Ton 2 fällt nach rechts unten
  if (mode === 'descending') {
    const x1 = 8;
    const x2 = 30;
    const y1 = 4.5;
    const y2 = Math.min(18.0, y1 + dy);

    if (id === 'p8' || semitones >= 12) {
      // Oktave abwärts: Schwungvoller Tiefenbogen
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} aria-hidden="true">
          <line x1="4" y1="3" x2="34" y2="3" stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.25" />
          <path d="M 8 4.5 Q 19 20 30 18" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="8" cy="4.5" r={r} fill={color} />
          <circle cx="30" cy="18" r={r} fill={color} />
        </svg>
      );
    }

    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} aria-hidden="true">
        {/* Oberer Referenz-Horizont */}
        <line x1="4" y1="3" x2="34" y2="3" stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.25" />
        {/* Diagonale Gefällslinie */}
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx={x1} cy={y1} r={r} fill={color} />
        <circle cx={x2} cy={y2} r={r} fill={color} />
      </svg>
    );
  }

  // 4. MODUS: AUFSTEIGEND (▲ Auf) - Standard
  // Ton 1 beginnt unten links auf dem Horizont, Ton 2 steigt proportional nach rechts oben
  const x1 = 8;
  const x2 = 30;
  const y1 = 17.5;
  const y2 = Math.max(3.8, y1 - dy);

  if (id === 'p8' || semitones >= 12) {
    // Oktave aufwärts (Riesensprung): Hoher Himmelsbogen von Basis bis Zenit
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} aria-hidden="true">
        <line x1="4" y1="19.5" x2="34" y2="19.5" stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.25" />
        <path d="M 8 17.5 Q 19 2 30 4" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="8" cy="17.5" r={r} fill={color} />
        <circle cx="30" cy="4" r={r} fill={color} />
      </svg>
    );
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} aria-hidden="true">
      {/* Basis-Horizont (Glockenspiel- / Notenlinien-Referenz) */}
      <line x1="4" y1="19.5" x2="34" y2="19.5" stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.25" />
      {/* Proportionale Steigungslinie */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.8" strokeLinecap="round" />
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
  const [soundTimbre, setSoundTimbre] = useState<SoundEngineTimbre>('rhodes');

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

  // Generiere Pitch-Match Frage
  const generateNewPitchQuestion = useCallback(() => {
    const randomNote = availablePitchNotes[Math.floor(Math.random() * availablePitchNotes.length)];
    setCurrentPitchQuestion(randomNote);
    setIsPitchLockedIn(false);
    setLivePitchResult(null);
    setPitchMatchLockCountdown(0);
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
        maxWidth: '840px',
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
            boxShadow: 'none'
          }}>
            <Headphones size={20} strokeWidth={2.4} color="#ffffff" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 950, color: '#0f172a' }}>
              {uiLevel === 'junior' ? 'Klang-Detektiv' : 'Gehörtraining'}
            </h2>
            <span style={{ fontSize: '0.70rem', color: '#7c3aed', fontWeight: 750 }}>
              {uiLevel === 'junior' ? 'Höre genau hin: Welcher Ton-Sprung ist das?' : '0,1% Goldstandard • 3 Tonale Säulen'}
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
              boxShadow: 'none'
            }}
          >
            <Headphones size={15} strokeWidth={2.4} />
            <span>Zurück zum Trainings-Studio</span>
          </button>
        </div>
      ) : (
        /* Ansicht: TRAINING STUDIO */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* 2. Säulen-Leiste (3 didaktische Säulen - 52px Apple HIG Touch-Ergonomie) */}
          <div
            role="tablist"
            aria-label="Didaktische Gehör-Säulen"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              background: '#f8fafc',
              padding: '5px',
              borderRadius: '16px',
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
                gap: '2px',
                minHeight: '52px',
                padding: '6px 4px',
                borderRadius: '12px',
                border: 'none',
                background: activePillar === 'intervals' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'transparent',
                color: activePillar === 'intervals' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                boxShadow: activePillar === 'intervals' ? '0 4px 14px rgba(139, 92, 246, 0.35)' : 'none',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                touchAction: 'manipulation',
                userSelect: 'none'
              }}
              className="hover-scale"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Music size={15} strokeWidth={activePillar === 'intervals' ? 2.6 : 2.2} />
                <span style={{ fontWeight: 950, fontSize: '0.82rem', letterSpacing: '-0.01em' }}>
                  Intervalle
                </span>
              </div>
              <span style={{
                fontSize: '0.64rem',
                fontWeight: 750,
                color: activePillar === 'intervals' ? 'rgba(255, 255, 255, 0.90)' : '#94a3b8',
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
                gap: '2px',
                minHeight: '52px',
                padding: '6px 4px',
                borderRadius: '12px',
                border: 'none',
                background: activePillar === 'chords' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'transparent',
                color: activePillar === 'chords' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                boxShadow: activePillar === 'chords' ? '0 4px 14px rgba(139, 92, 246, 0.35)' : 'none',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                touchAction: 'manipulation',
                userSelect: 'none'
              }}
              className="hover-scale"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sliders size={15} strokeWidth={activePillar === 'chords' ? 2.6 : 2.2} />
                <span style={{ fontWeight: 950, fontSize: '0.82rem', letterSpacing: '-0.01em' }}>
                  Akkordfarben
                </span>
              </div>
              <span style={{
                fontSize: '0.64rem',
                fontWeight: 750,
                color: activePillar === 'chords' ? 'rgba(255, 255, 255, 0.90)' : '#94a3b8',
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
                gap: '2px',
                minHeight: '52px',
                padding: '6px 4px',
                borderRadius: '12px',
                border: 'none',
                background: activePillar === 'pitch_match' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'transparent',
                color: activePillar === 'pitch_match' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                boxShadow: activePillar === 'pitch_match' ? '0 4px 14px rgba(139, 92, 246, 0.35)' : 'none',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                touchAction: 'manipulation',
                userSelect: 'none'
              }}
              className="hover-scale"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Mic size={15} strokeWidth={activePillar === 'pitch_match' ? 2.6 : 2.2} />
                <span style={{ fontWeight: 950, fontSize: '0.82rem', letterSpacing: '-0.01em' }}>
                  Sing-Back
                </span>
              </div>
              <span style={{
                fontSize: '0.64rem',
                fontWeight: 750,
                color: activePillar === 'pitch_match' ? 'rgba(255, 255, 255, 0.90)' : '#94a3b8',
                letterSpacing: '-0.01em'
              }}>
                {uiLevel === 'junior' ? 'Mitsingen' : 'Intonation (YIN)'}
              </span>
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
            {/* Musikschul-D-Stufen & Vorstufe (4 Level) */}
            <div style={{ display: 'flex', gap: '3px', background: '#f1f5f9', padding: '3px', borderRadius: '10px' }}>
              {(['junior', 'd1', 'd2', 'd3'] as VdmLevel[]).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setVdmLevel(lvl);
                    if (lvl === 'junior' || lvl === 'd1') setChordCategory('types');
                  }}
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

              {/* 🎖️ 0,1% Goldstandard: Digitales Leistungsabzeichen & Vitrinen-Integration */}
              {(latestRecordedSession?.accuracy ?? 0) >= 70 && (
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
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
                    color: '#16a34a',
                    background: '#ecfdf5',
                    border: '1px solid #bbf7d0',
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
                        background: isBadgeSaved ? '#16a34a' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        cursor: isBadgeSaved ? 'default' : 'pointer',
                        boxShadow: isBadgeSaved ? 'none' : '0 4px 12px rgba(245, 158, 11, 0.35)',
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
                        boxShadow: !hasListenedToQuestion
                          ? '0 0 22px rgba(139, 92, 246, 0.70), 0 6px 18px rgba(139, 92, 246, 0.40)'
                          : '0 6px 18px rgba(139, 92, 246, 0.40)',
                        transform: !hasListenedToQuestion ? 'scale(1.05)' : 'scale(1)',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                      className={!hasListenedToQuestion ? 'animate-pulse hover-scale' : 'hover-scale'}
                      title="Intervall anhören (Leertaste)"
                    >
                      <Play size={22} fill="#ffffff" strokeWidth={0} />
                    </button>
                    <div>
                      <span style={{ fontSize: '0.90rem', fontWeight: 900, color: '#0f172a', display: 'block' }}>
                        Intervall anhören
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        color: !hasListenedToQuestion ? '#7c3aed' : '#64748b',
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
                        title={mode === 'vdm_mix' ? 'Prüfungs-Mix: Zufälliger Wechsel zwischen Auf-, Abwärts und Harmonisch (wie in der Musikschulprüfung)' : undefined}
                      >
                        {mode === 'ascending' ? '▲ Auf' : mode === 'descending' ? '▼ Ab' : mode === 'harmonic' ? '◆ Zusammen' : '🎲 Mix'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 🌟 0,1% Goldstandard: Echte vertikale Tonstufen-Bühne (Synästhesie Hören & Sehen) */}
                {(() => {
                  const semitones = currentIntervalQuestion?.interval.semitones || 0;
                  const effectiveMode = currentIntervalQuestion?.effectiveMode || (intervalPlayMode === 'vdm_mix' ? 'ascending' : intervalPlayMode);
                  const isDescending = effectiveMode === 'descending';
                  const isHarmonic = effectiveMode === 'harmonic';
                  
                  // Stufenhöhe proportional berechnen: 0 HT = 0px ... 12 HT = 32px
                  const stepOffset = semitones === 0 ? 0 : Math.min(32, Math.max(6, Math.round((semitones / 12) * 32)));

                  // Y-Positionen der Verbindungslinie (Höhe des flexiblen Mittelbereichs = 52px)
                  let lineY1 = 38;
                  let lineY2 = 38;
                  if (isHarmonic) {
                    lineY1 = 38;
                    lineY2 = 38;
                  } else if (isDescending) {
                    lineY1 = 12;
                    lineY2 = 12 + stepOffset;
                  } else {
                    lineY1 = 38;
                    lineY2 = Math.max(8, 38 - stepOffset);
                  }

                  const badgeTop = (lineY1 + lineY2) / 2;

                  const isSubmitted = isIntervalAnswerSubmitted && currentIntervalQuestion;
                  const isCorrect = isSubmitted && selectedIntervalAnswer === currentIntervalQuestion.interval.id;
                  const chosenItem = isSubmitted && !isCorrect ? INTERVAL_CATALOG.find(i => i.id === selectedIntervalAnswer) : null;

                  // Berechne Ghost-Linie für die abweichende Schüler-Auswahl
                  let chosenLineY2 = lineY2;
                  let chosenOffsetDiff = 0;
                  if (chosenItem) {
                    const chosenSemi = chosenItem.semitones;
                    const chosenStepOffset = chosenSemi === 0 ? 0 : Math.min(32, Math.max(6, Math.round((chosenSemi / 12) * 32)));
                    if (isHarmonic) {
                      chosenLineY2 = 38;
                    } else if (isDescending) {
                      chosenLineY2 = 12 + chosenStepOffset;
                    } else {
                      chosenLineY2 = Math.max(8, 38 - chosenStepOffset);
                    }
                    chosenOffsetDiff = semitones - chosenSemi; // positiv = gesucht war höher; negativ = gesucht war tiefer
                  }

                  return (
                    <div style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '12px 18px',
                      minHeight: '78px',
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
                        gap: '8px',
                        zIndex: 2,
                        transform: isDescending ? `translateY(-${stepOffset / 2}px)` : 'none',
                        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: playingToneStep === 1
                            ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
                            : '#f8fafc',
                          color: playingToneStep === 1 ? '#ffffff' : '#334155',
                          border: playingToneStep === 1 ? 'none' : '1.5px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.84rem',
                          fontWeight: 950,
                          boxShadow: playingToneStep === 1
                            ? '0 0 18px rgba(139, 92, 246, 0.70), 0 2px 8px rgba(139, 92, 246, 0.40)'
                            : 'none',
                          transform: playingToneStep === 1 ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}>
                          {isIntervalAnswerSubmitted && currentIntervalQuestion
                            ? midiToNoteName(currentIntervalQuestion.rootMidi)
                            : '1'}
                        </div>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: playingToneStep === 1 ? '#7c3aed' : '#475569',
                          transition: 'color 0.15s ease'
                        }}>
                          {isIntervalAnswerSubmitted && currentIntervalQuestion ? 'Grundton' : 'Ton 1'}
                        </span>
                      </div>

                      {/* Verbindungs-Achse & Distanz-Pill */}
                      <div style={{
                        flex: 1,
                        margin: '0 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        height: '52px'
                      }}>
                        {/* Diagonale Stufen-Vektorlinie */}
                        <svg width="100%" height="100%" style={{ overflow: 'visible', position: 'absolute', inset: 0 }}>
                          {/* Feste Horizontlinie am Boden */}
                          <line
                            x1="0"
                            y1="38"
                            x2="100%"
                            y2="38"
                            stroke="#f1f5f9"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                          />
                          {/* Schüler-Fehler Ghostlinie (A/B-Vergleich) */}
                          {chosenItem && (
                            <line
                              x1="0"
                              y1={lineY1}
                              x2="100%"
                              y2={chosenLineY2}
                              stroke="#f43f5e"
                              strokeWidth="2"
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
                            stroke={isSubmitted ? (isCorrect ? '#10b981' : '#059669') : playingToneStep > 0 ? '#8b5cf6' : '#cbd5e1'}
                            strokeWidth={isSubmitted ? '3' : '2.5'}
                            strokeLinecap="round"
                            strokeDasharray={semitones === 0 ? '4 4' : 'none'}
                            style={{ transition: 'all 0.25s ease' }}
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
                            ? (isCorrect ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#fee2e2')
                            : '#ffffff',
                          border: isSubmitted
                            ? (isCorrect ? 'none' : '1.5px solid #fca5a5')
                            : playingToneStep > 0
                            ? '1.5px solid #8b5cf6'
                            : '1.5px solid #e2e8f0',
                          color: isSubmitted
                            ? (isCorrect ? '#ffffff' : '#991b1b')
                            : playingToneStep > 0
                            ? '#7c3aed'
                            : '#475569',
                          padding: '3px 12px',
                          borderRadius: '99px',
                          fontSize: '0.70rem',
                          fontWeight: 850,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap'
                        }}>
                          {isSubmitted ? (
                            isCorrect ? (
                              <>
                                <CheckCircle2 size={13} strokeWidth={2.4} />
                                <span>{currentIntervalQuestion.interval.name}</span>
                                <span>•</span>
                                <span>{currentIntervalQuestion.interval.semitones} HT</span>
                              </>
                            ) : (
                              <>
                                <XCircle size={13} strokeWidth={2.4} />
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
                          ) : playingToneStep > 0 ? (
                            <>
                              <Volume2 size={12} strokeWidth={2.4} />
                              <span>
                                {effectiveMode === 'harmonic'
                                  ? 'Zusammen'
                                  : effectiveMode === 'descending'
                                  ? 'Abwärts'
                                  : 'Aufwärts'}
                                {intervalPlayMode === 'vdm_mix' ? ' (🎲 Mix)' : ''}
                              </span>
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
                        gap: '8px',
                        zIndex: 2,
                        transform: isHarmonic
                          ? 'none'
                          : isDescending
                          ? `translateY(${stepOffset / 2}px)`
                          : `translateY(-${stepOffset / 2}px)`,
                        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: playingToneStep === 2 ? '#7c3aed' : '#475569',
                          transition: 'color 0.15s ease'
                        }}>
                          {isIntervalAnswerSubmitted && currentIntervalQuestion ? 'Zielton' : 'Ton 2'}
                        </span>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: playingToneStep === 2
                            ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
                            : '#f8fafc',
                          color: playingToneStep === 2 ? '#ffffff' : '#334155',
                          border: playingToneStep === 2 ? 'none' : '1.5px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.84rem',
                          fontWeight: 950,
                          boxShadow: playingToneStep === 2
                            ? '0 0 18px rgba(139, 92, 246, 0.70), 0 2px 8px rgba(139, 92, 246, 0.40)'
                            : 'none',
                          transform: playingToneStep === 2 ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}>
                          {isIntervalAnswerSubmitted && currentIntervalQuestion
                            ? midiToNoteName(currentIntervalQuestion.rootMidi + currentIntervalQuestion.interval.semitones)
                            : '2'}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Intervall-Auswahlkacheln (0,1% Goldstandard: Taktile Bild-First Kacheln im balancierten Responsive-Grid) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: availableIntervals.length <= 5
                  ? 'repeat(auto-fit, minmax(130px, 1fr))'
                  : 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '10px',
                width: '100%',
                justifyContent: 'center'
              }}>
                {availableIntervals.map(item => {
                  const isSubmitted = isIntervalAnswerSubmitted;
                  const isChosen = selectedIntervalAnswer === item.id;
                  const isCorrect = currentIntervalQuestion?.interval.id === item.id;

                  let bg = '#ffffff';
                  let border = '#e2e8f0';
                  let text = '#0f172a';
                  let badgeBg = 'rgba(139, 92, 246, 0.08)';
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
                        padding: '12px 10px',
                        minHeight: '88px',
                        borderRadius: '16px',
                        border: `1.5px solid ${border}`,
                        background: bg,
                        color: text,
                        cursor: isSubmitted ? 'default' : !hasListenedToQuestion ? 'not-allowed' : 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isChosen ? '0 6px 16px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
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
                      {/* Didaktisches Vorhören: Kleiner 🔊 Button oben rechts */}
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
                          width: '26px',
                          height: '26px',
                          borderRadius: '8px',
                          border: '1px solid rgba(148, 163, 184, 0.35)',
                          background: 'rgba(255, 255, 255, 0.90)',
                          backdropFilter: 'blur(4px)',
                          color: isCorrect && isSubmitted ? '#047857' : isChosen && !isCorrect && isSubmitted ? '#be123c' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          zIndex: 3
                        }}
                        className="hover-scale"
                        title={`Diesen Tonsprung vorhören: ${item.name} (${item.semitones} Halbtöne)`}
                        aria-label={`Diesen Tonsprung vorhören: ${item.name}`}
                      >
                        <Volume2 size={13} strokeWidth={2.4} />
                      </button>

                      {/* 1. Bild-First: Prominente Vektor-Geste im Zentrum */}
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '3px 8px',
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
                            currentIntervalQuestion?.effectiveMode || (intervalPlayMode === 'vdm_mix' ? 'ascending' : intervalPlayMode)
                          )
                        ) : (
                          <span style={{ fontSize: '0.74rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
                            {uiLevel === 'pro' ? item.proShort : item.shortName}
                          </span>
                        )}
                      </div>

                      {/* 2. Junior-Name: Groß, fett und sprechend */}
                      <span style={{
                        fontWeight: 950,
                        fontSize: '0.96rem',
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
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: 'rgba(139, 92, 246, 0.08)',
                          color: subColor,
                          fontSize: '0.68rem',
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
                        <Music size={11} strokeWidth={2.4} color="#7c3aed" style={{ flexShrink: 0 }} />
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
                          background: '#fff1f2',
                          border: '1.5px solid #fca5a5',
                          color: '#be123c',
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
                      boxShadow: !hasListenedToChordQuestion
                        ? '0 0 22px rgba(139, 92, 246, 0.70), 0 6px 18px rgba(139, 92, 246, 0.40)'
                        : '0 6px 18px rgba(139, 92, 246, 0.40)',
                      transform: !hasListenedToChordQuestion ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    className={!hasListenedToChordQuestion ? 'animate-pulse hover-scale' : 'hover-scale'}
                    title="Akkord anhören (Leertaste)"
                  >
                    <Play size={22} fill="#ffffff" strokeWidth={0} />
                  </button>
                  <div>
                    <span style={{ fontSize: '0.90rem', fontWeight: 900, color: '#0f172a', display: 'block' }}>
                      Akkord anhören
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      color: !hasListenedToChordQuestion ? '#7c3aed' : '#64748b',
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

              {/* D2 & D3 Musikschul-Spezial: Sub-Switcher zwischen Akkord-Typen und Umkehrungen */}
              {(vdmLevel === 'd2' || vdmLevel === 'd3') && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '4px 6px'
                }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', paddingLeft: '4px' }}>
                    Kategorie:
                  </span>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <button
                      type="button"
                      onClick={() => setChordCategory('types')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: chordCategory === 'types' ? '#ffffff' : 'transparent',
                        color: chordCategory === 'types' ? '#7c3aed' : '#64748b',
                        fontSize: '0.70rem',
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
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: chordCategory === 'inversions' ? '#ffffff' : 'transparent',
                        color: chordCategory === 'inversions' ? '#7c3aed' : '#64748b',
                        fontSize: '0.70rem',
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

              {/* Akkord-Auswahlkacheln (0,1% Goldstandard 3-Ebenen & Einzeilen-Schutz) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                gap: '8px'
              }}>
                {(((vdmLevel === 'd2' || vdmLevel === 'd3') && (currentChordQuestion?.isInversion || chordCategory === 'inversions'))
                  ? CHORD_INVERSIONS
                  : availableChords
                ).map(item => {
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
                        padding: '10px 12px',
                        paddingRight: '36px',
                        minHeight: '62px',
                        borderRadius: '14px',
                        border: `1.5px solid ${border}`,
                        background: bg,
                        color: text,
                        cursor: isSubmitted ? 'default' : !hasListenedToChordQuestion ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '3px',
                        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isChosen ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
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
                      {/* Didaktisches Kachel-Vorhören */}
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
                          width: '24px',
                          height: '24px',
                          borderRadius: '7px',
                          border: '1px solid rgba(148, 163, 184, 0.35)',
                          background: 'rgba(255, 255, 255, 0.90)',
                          backdropFilter: 'blur(4px)',
                          color: isCorrect && isSubmitted ? '#047857' : isChosen && !isCorrect && isSubmitted ? '#be123c' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          zIndex: 3
                        }}
                        className="hover-scale"
                        title={`Diesen Klang vorhören: ${item.name}`}
                        aria-label={`Diesen Klang vorhören: ${item.name}`}
                      >
                        <Volume2 size={12} strokeWidth={2.4} />
                      </button>

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
                            ? String(item.visualSymbol)
                            : uiLevel === 'pro'
                            ? String(('proShort' in item) ? item.proShort : item.shortName)
                            : String(item.shortName)}
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
                          : item.description}
                      </span>
                    </div>
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
                              : `Perfekt! Das war: ${currentChordQuestion.chord.name}`
                            : uiLevel === 'junior'
                              ? `Fast! Richtig war: ${currentChordQuestion.chord.juniorName} (${currentChordQuestion.chord.name})`
                              : `Fast! Es war: ${currentChordQuestion.chord.name}`}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 650 }}>
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
                        gap: '6px',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
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
                        boxShadow: 'none',
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
                                boxShadow: 'none'
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
                                  boxShadow: 'none',
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
