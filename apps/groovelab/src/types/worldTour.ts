/**
 * 🌍 Campus-Groovelab World Tour & Cultural Music Odyssey Type Definitions
 * 
 * Strict TypeScript Interfaces for the World Tour Studio Module:
 * - Living world music culture metadata (Africa, Latin America, Orient/Balkan, Asia, Oceania, Europe)
 * - Master note scores & instrument projections (Piano, Guitar, Bass, Ukulele, Drums, Brass, Strings)
 * - 3-Tier Age Differentiation (Junior, Teen, Pro)
 * - Student progress, continent mastery & digital passport stamps
 */

export type ContinentId = 'europe' | 'americas' | 'asia' | 'oceania' | 'africa';

export interface ContinentDefinition {
  id: ContinentId;
  label: string;
  emoji: string;
  badgeId: string;
  color: string;
  countriesCount: number;
}

export interface TraditionalInstrumentInfo {
  name: string;
  nativeName?: string;
  family: 'percussion' | 'strings' | 'wind' | 'brass' | 'keyboard' | 'idiophone';
  material: string;
  description: string;
}

export interface WorldTourNote {
  pitch: string;          // e.g. 'G4', 'A4', 'B4', 'C5', 'REST'
  durationBeats: number;  // 1 = quarter, 0.5 = eighth, 2 = half, 0.75 = dotted eighth, etc.
  lyric?: string;         // e.g. 'Ku-', 'ku' or traditional syllables
  fingering?: number;     // 1-5 for piano / strings
  fret?: number;          // Guitar fret (0-12)
  stringIndex?: number;   // Guitar string (0-5, 0 = high E)
  chordSymbol?: string;   // e.g. 'Gm', 'C7', 'D'
  color?: string;         // Boomwhackers color code for Junior mode
  drumType?: 'kick' | 'snare' | 'hihat' | 'tom' | 'clap' | 'rest';
  isAnacrusis?: boolean;  // True if note belongs to pickup bar (Takt 0)
}

export interface WorldTourMasterScore {
  timeSignature: '4/4' | '3/4' | '2/4' | '7/8' | '9/8' | '12/8' | '6/8';
  subdivisions?: number[];  // e.g. [2, 2, 3] for 7/8 or [3, 3, 3] for 9/8
  tonalCenter: string;      // e.g. 'G-Dur', 'D-Moll', 'Insen-Pentatonik', 'A-Dorisch'
  defaultBpm: number;
  barsCount: number;
  anacrusisBeats?: number;  // Pickup measure duration in beats (e.g. 1 for 3/4 or 4/4)
  chords?: string[];        // Chord progression per bar for Pro Lead-Sheet view
  improvisationScale?: string[]; // Recommended scale pitches for free jamming
  notes: WorldTourNote[];
}

export type WorldTourScore = WorldTourMasterScore;

export interface WorldTourCountry {
  code: string;             // ISO-2 or Culture-Code, e.g. 'DE', 'FR', 'WA_KUKU', 'CU_SON'
  name: string;             // 'Westafrika (Guinea/Mali)', 'Deutschland'
  pieceTitle: string;       // 'Kuku (Traditioneller Festtanz)', 'Lied der Deutschen'
  anthemTitle?: string;     // Backward compatibility alias for pieceTitle
  composer: string;         // 'Manding-Tradition (Überliefert)', 'Joseph Haydn'
  composerDates: string;    // 'Überliefert seit dem 13. Jh.', '1732–1809'
  composedYear: string;     // 'Tradition', '1797'
  era: string;              // 'Manding-Kulturerbe', 'Wiener Klassik'
  continent: ContinentId;
  flagEmoji: string;        // '🇬🇳', '🇩🇪'
  regionTitle?: string;     // e.g. 'Westafrikanische Savanne', 'Karibik & Kuba'
  funFact: string;
  didacticTip: string;
  story15s: string;
  instruments?: TraditionalInstrumentInfo[];
  mapCoordinates: {
    x: number;              // Percentage 0-100 on flat map canvas
    y: number;              // Percentage 0-100 on flat map canvas
  };
  geoCoordinates?: {
    lat: number;
    lon: number;
  };
  score: WorldTourMasterScore;
}

export interface WorldTourStudentProgress {
  countryCode: string;
  stars: number;            // 0-3
  bestScorePercent: number; // 0-100
  bestTempoBpm: number;
  instrument?: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  badgeUnlocked?: boolean;
}

export type WorldTourPlayMode = 'listen' | 'practice' | 'challenge';

export interface WorldTourAudioState {
  isPlaying: boolean;
  mode: WorldTourPlayMode;
  currentBeat: number;
  activeNoteIndex: number;
  tempoBpm: number;
  isMetronomeActive: boolean;
  volumeLead: number;       // 0 - 1
  volumeBacking: number;    // 0 - 1
  audioStyle: 'traditional' | 'groove';
  isDroneActive?: boolean;  // Traditional tonic drone
}
