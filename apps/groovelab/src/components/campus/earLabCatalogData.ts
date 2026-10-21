import { AnchorNoteStep } from '../../services/audio/EarSynthEngine';
import { MicroScoreInstrument } from '../student/meisterwerk/microscore/microScore.types';

// 🏛️ 0,1% Goldstandard Instrumenten-Metadaten für didaktische Klangfarben-Wahl
export const INSTRUMENT_META: Record<MicroScoreInstrument, { label: string; icon: string }> = {
  guitar: { label: 'Gitarre', icon: '🎸' },
  ukulele: { label: 'Ukulele', icon: '🪕' },
  bass: { label: 'E-Bass', icon: '🎸' },
  piano: { label: 'Flügel', icon: '🎹' },
  recorder: { label: 'Blockflöte', icon: '🪵' },
  flute: { label: 'Querflöte', icon: '🪈' },
  clarinet: { label: 'Klarinette', icon: '🎵' },
  altosax: { label: 'Altsaxophon', icon: '🎷' },
  trumpet: { label: 'Trompete', icon: '🎺' },
  trombone: { label: 'Posaune', icon: '🎺' },
  strings: { label: 'Streicher', icon: '🎻' },
  vocals: { label: 'Gesang', icon: '🎤' },
  drums: { label: 'Schlagzeug', icon: '🥁' },
  universal: { label: 'Flügel', icon: '🎹' }
};

export type TrainingPillar = 'intervals' | 'chords' | 'pitch_match';
export type VdmLevel = 'junior' | 'd1' | 'd2' | 'd3';
export type IntervalPlaySelectionMode = 'ascending' | 'descending' | 'harmonic' | 'vdm_mix';

export interface IntervalItem {
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
  anchorNotes: (number | AnchorNoteStep)[];
}

export interface ChordItem {
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

export const INTERVAL_CATALOG: IntervalItem[] = [
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

export const CHORD_CATALOG: ChordItem[] = [
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

export const CHORD_INVERSIONS: ChordInversionItem[] = [
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
