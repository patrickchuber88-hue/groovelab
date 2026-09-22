/**
 * 🌍 Campus-Groovelab World Tour & Anthem Explorer Type Definitions
 * 
 * Strict TypeScript Interfaces for the World Tour Studio Module:
 * - Country metadata, public domain anthem DNA
 * - Master note scores & instrument projections
 * - Student progress & continent mastery
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

export interface WorldTourNote {
  pitch: string;          // e.g. 'G4', 'A4', 'B4', 'C5', 'REST'
  durationBeats: number;  // 1 = quarter, 0.5 = eighth, 2 = half, etc.
  lyric?: string;         // e.g. 'Ein-', 'ig-', 'keit'
  fingering?: number;     // 1-5 for piano / strings
  fret?: number;          // Guitar fret (0-12)
  stringIndex?: number;   // Guitar string (0-5, 0 = high E)
}

export interface WorldTourMasterScore {
  timeSignature: '4/4' | '3/4' | '2/4';
  tonalCenter: string;      // e.g. 'G-Dur', 'F-Dur', 'C-Dur'
  defaultBpm: number;
  barsCount: number;
  notes: WorldTourNote[];
}

export type WorldTourScore = WorldTourMasterScore;

export interface WorldTourCountry {
  code: string;             // ISO-2, e.g. 'DE', 'FR', 'IT'
  name: string;             // 'Deutschland'
  anthemTitle: string;      // 'Lied der Deutschen'
  composer: string;         // 'Joseph Haydn'
  composerDates: string;    // '1732–1809'
  composedYear: string;     // '1797'
  era: string;              // 'Klassik'
  continent: ContinentId;
  flagEmoji: string;        // '🇩🇪'
  funFact: string;
  didacticTip: string;
  story15s: string;
  mapCoordinates: {
    x: number;              // Percentage 0-100 on map canvas
    y: number;              // Percentage 0-100 on map canvas
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
}
