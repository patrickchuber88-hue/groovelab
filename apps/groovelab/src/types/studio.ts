/**
 * 🎛️ Campus-Groovelab Studio Type Definitions
 * 
 * Strict TypeScript Interfaces for the Standalone Studio Module:
 * - Lead Sheet Data Model (0 Bytes Audio, pure JSONB Chords & Metadata)
 * - YouTube Sync State Machine
 * - Instrument Voicings (Guitar Capo, Piano, Bass, Ukulele)
 * - Didactic Levels (Junior, Teen, Pro)
 */

export interface StudioChordBar {
  bar: number;               // 1-indexed bar number
  beat: number;              // 1-4
  chord: string;             // e.g. "Am", "C", "G7", "F#m7"
  degree?: string;           // Roman numeral: "i", "IV", "V", "vi"
  duration_beats: number;    // Usually 4 in 4/4 time
  start_sec?: number;        // Synchronized YouTube start time in seconds
  end_sec?: number;          // Synchronized YouTube end time in seconds
}

export interface StudioFormSection {
  name: string;              // "Intro" | "Strophe" | "Refrain" | "Bridge" | "Solo" | "Outro"
  start_bar: number;
  end_bar: number;
  color?: string;
}

export interface StudioLeadSheet {
  id: string;
  school_id: string;
  student_id?: string | null;
  teacher_id?: string | null;
  youtube_video_id?: string | null;
  title: string;
  artist: string;
  tonal_center: string;      // e.g. "G major", "A minor"
  time_signature: string;    // "4/4", "3/4", "6/8"
  detected_bpm: number;
  chord_sequence: StudioChordBar[];
  form_sections: StudioFormSection[];
  suggested_scales: string[];
  is_school_shared?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type StudioInstrumentType = 'guitar' | 'piano' | 'bass' | 'ukulele';

export interface StudioGuitarVoicing {
  chord: string;
  frets: (number | 'x')[];   // 6 strings, e.g. ['x', 0, 2, 2, 1, 0] for Am
  fingers?: number[];        // Finger numbers 1-4
  capo_fret?: number;        // Suggested capo position
  display_name: string;
}

export interface StudioPianoVoicing {
  chord: string;
  keys: string[];            // e.g. ["A2", "C3", "E3"]
  hand: 'left' | 'right' | 'both';
  display_name: string;
}

export type PlaybackSpeedOption = 0.6 | 0.75 | 0.85 | 1.0;

export interface StudioPerformanceScore {
  totalBars: number;
  hitBars: number;
  accuracyPercent: number;
  tier: 'courage_bonus' | 'groove_star' | 'chord_master';
  xpAwarded: number;
  stickerEligible: boolean;
}
