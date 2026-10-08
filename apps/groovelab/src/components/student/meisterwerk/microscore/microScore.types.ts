/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * microScore.types.ts
 * 
 * Kanonische Typdefinitionen für das professionelle Micro-Score Studio:
 * - Strenges UrhG-Limit: Exakt 1 bis maximal 4 Takte (§§ 2, 51, 60a UrhG)
 * - 6 Bläser-Klangfarben + Standard-Instrumente
 * - Tastatur-First Navigation & Tabulatur/Noten-Datenmodell
 * - 48-Tick-Raster für jitterfreie Triolen und geradlinige Rhythmen
 * - WSOLA Slow-Motion & YIN Pitch-Challenge
 */

export type MicroScoreDuration = '1' | '2' | '4' | '8' | '16';

export type MicroScoreTimeSignature = '4/4' | '3/4' | '2/4' | '6/8';

export type MicroScoreDisplayMode = 'notes' | 'tabs' | 'both';

export type MicroScoreInstrument = 
  | 'universal'      // 🌐 Alle Instrumente (General Score / VdM Basis)
  | 'recorder'       // Blockflöte
  | 'flute'          // Querflöte
  | 'clarinet'       // Klarinette
  | 'altosax'        // Altsaxophon
  | 'trumpet'        // Trompete
  | 'trombone'       // Posaune
  | 'piano'          // Klavier / Keys
  | 'guitar'         // Akustik-Gitarre
  | 'bass'           // E-Bass
  | 'strings'        // Violine / Streicher
  | 'drums';         // Schlagzeug / Percussion

export interface MicroScoreChord {
  id: string;
  barIndex: number;
  tickPosition: number;      // 0..47 (bei 4/4)
  chordName: string;         // z. B. 'G', 'D7', 'Am', 'Em'
}

export interface MicroScoreNote {
  id: string;
  barIndex: number;          // 0 bis 3 (Max. 4 Takte)
  beatFraction: number;      // Position im Takt in 16tel-Einheiten (0 bis 15 bei 4/4)
  tickPosition?: number;     // Präzise Position im 48-Tick-Raster (0 bis 47)
  durationTicks?: number;    // Exakte Tick-Dauer
  duration: MicroScoreDuration;
  pitch: string;             // z. B. 'C4', 'D#4', 'A4', 'REST' (Pause)
  fret?: number;             // Bundnummer (0–24)
  stringIndex?: number;      // Saite (0 bis 5 für 6-saitige Gitarre: 0=e, 1=B, 2=G, 3=D, 4=A, 5=E)
  isDotted?: boolean;
  isTriplet?: boolean;       // Triolen-Modus (Achtel-Triole = 4 Ticks, 16tel-Triole = 2 Ticks)
  tieToNext?: boolean;       // Haltebogen zur nächsten Note
}

export interface MicroScoreInstrumentProjection {
  instrument: MicroScoreInstrument;
  displayMode?: MicroScoreDisplayMode; // 'notes' | 'tabs' | 'both'
  clef?: 'treble' | 'bass' | 'percussion';
  transpositionSemitones?: number; // z.B. +9 für Altsax (Eb), +2 für Trompete (Bb), -12 für 8vb
  notes: MicroScoreNote[];
  chords?: MicroScoreChord[];
  description?: string;
}

export interface MicroScoreSnippet {
  id: string;
  title: string;             // Werk-Benennung (z. B. "Rhythmus-Drill KW 41", "Tonleiter C-Dur")
  instrument: MicroScoreInstrument;
  timeSignature: MicroScoreTimeSignature;
  tempoBpm: number;          // 40 bis 240 BPM
  barsCount: number;         // Hardcoded Ceiling: 1 bis 4 Takte
  notes: MicroScoreNote[];   // Kanonische C-Noten (SSOT)
  displayMode?: MicroScoreDisplayMode; // 'notes' | 'tabs' | 'both'
  clef?: 'treble' | 'bass' | 'percussion';
  chords?: MicroScoreChord[];
  createdAt: string;
  updatedAt: string;
  authorRole?: 'teacher' | 'student';
  taskId?: string;           // Verknüpfte Hausaufgabe (Lehrwerk oder Song)
  studentId?: string;
  category?: 'Tonleitern' | 'Akkorde' | 'Rhythmus' | 'Technik' | 'Früherziehung' | 'Zupfinstrumente' | 'Vokal' | 'BandPacks' | string;
  vdmFolder?: string;        // z. B. 'dur' | 'moll' | 'pentatonik' | 'dreiklaenge' | 'kadenzen' etc.
  vdmLevel?: 'elementar' | 'unterstufe' | 'mittelstufe' | 'oberstufe';
  description?: string;
  tags?: string[];
  isVdmStandard?: boolean;
  isCustom?: boolean;
  projections?: Partial<Record<MicroScoreInstrument, MicroScoreInstrumentProjection>>;
}

export interface MicroScorePlaybackState {
  isPlaying: boolean;
  isLooping: boolean;
  isRecording: boolean;
  currentBar: number;
  currentFraction: number;
  currentTick: number;       // 0 bis 47
  speedRate: number;         // 0.6x, 0.8x, 1.0x, 1.2x (WSOLA Pitch-Neutral)
  soloSample: boolean;       // True: Instrument klingt; False: Nur Metronom
  metronomeActive: boolean;
}

export interface MicroScoreChallengeFeedback {
  detectedPitch: string | null;
  detectedFreq: number | null;
  centsOff: number;
  accuracyScore: number;     // 0 bis 100%
  status: 'perfect' | 'good' | 'sharp' | 'flat' | 'silent';
  hitsCount: number;
  totalNotes: number;
}
