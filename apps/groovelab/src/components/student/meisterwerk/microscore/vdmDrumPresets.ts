/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (0,1% Goldstandard)
 * vdmDrumPresets.ts
 * 
 * Kanonische VdM Drum-Vorlagen im PAS Percussion Standard (Percussive Arts Society):
 * - Kick: F4 (1. Zwischenraum von unten)
 * - Snare: C5 (3. Zwischenraum von unten)
 * - Hi-Hat geschlossen: G5 (über 5. Linie mit X)
 * - Hi-Hat offen: G#5 (über 5. Linie mit X und Kreis)
 * - Crash-Becken: A5 (1 Hilfslinie oben mit X)
 * - Ride-Becken: F5 (5. Linie mit X)
 * - High Tom: E5 (4. Zwischenraum)
 * - Mid Tom: D5 (4. Linie)
 * - Floor Tom: A4 (2. Zwischenraum)
 */

import { MicroScoreNote, MicroScoreInstrument } from './microScore.types';

export const QUICK_TITLE_CHIPS = ['Rhythmus-Drill', 'Tonleiter C-Dur', 'Melodie-Thema', 'Intonations-Test', 'Solo-Lick', 'Akkord-Arpeggio'];

export const INSTRUMENT_OPTIONS: Array<{ value: MicroScoreInstrument; label: string }> = [
  { value: 'universal', label: '🌐 Alle Instrumente (Universell)' },
  { value: 'drums', label: '🥁 Schlagzeug' },
  { value: 'piano', label: 'Klavier' },
  { value: 'guitar', label: 'Gitarre' },
  { value: 'bass', label: 'E-Bass' },
  { value: 'strings', label: 'Streicher' },
  { value: 'recorder', label: 'Blockflöte (C)' },
  { value: 'flute', label: 'Querflöte (C)' },
  { value: 'clarinet', label: 'Klarinette (B♭)' },
  { value: 'altosax', label: 'Altsaxophon (E♭)' },
  { value: 'trumpet', label: 'Trompete (B♭)' },
  { value: 'trombone', label: 'Posaune (C)' }
];

export interface VdmDrumPreset {
  title: string;
  bpm: number;
  description: string;
  notes: MicroScoreNote[];
}

export const VDM_DRUM_PRESETS: VdmDrumPreset[] = [
  {
    title: 'Rock-Beat 4/4 (Standard 8th Groove)',
    bpm: 90,
    description: 'VdM Unterstufe: Der grundlegende 8tel Rock-Beat mit Hi-Hat-Puls, Kick auf 1 & 3 und Snare-Backbeat auf 2 & 4.',
    notes: [
      { id: 'dr0_hh0', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'G5' },
      { id: 'dr0_bd0', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'dr0_hh2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'G5' },
      { id: 'dr0_hh4', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'G5' },
      { id: 'dr0_sd4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'dr0_hh6', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'G5' },
      { id: 'dr0_hh8', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'G5' },
      { id: 'dr0_bd8', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'dr0_hh10', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'G5' },
      { id: 'dr0_hh12', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'G5' },
      { id: 'dr0_sd12', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'dr0_hh14', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'G5' },
      { id: 'dr1_hh0', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'G5' },
      { id: 'dr1_bd0', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'dr1_hh2', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'G5' },
      { id: 'dr1_hh4', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'G5' },
      { id: 'dr1_sd4', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'dr1_hh6', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'G5' },
      { id: 'dr1_hh8', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'G5' },
      { id: 'dr1_bd8', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'dr1_hh10', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'G5' },
      { id: 'dr1_hh12', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'G5' },
      { id: 'dr1_sd12', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'dr1_hh14', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'G5' }
    ]
  },
  {
    title: 'Four-on-the-Floor (Disco-Pulse)',
    bpm: 116,
    description: 'VdM Unterstufe 2: Durchgehende Bass Drum auf jedem Viertelschlag mit Backbeat und Offbeat Hi-Hat Akzenten.',
    notes: [
      { id: 'df0_bd0', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'df0_hh0', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'G5' },
      { id: 'df0_hh2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'G#5' },
      { id: 'df0_bd4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'F4' },
      { id: 'df0_sd4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'df0_hh4', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'G5' },
      { id: 'df0_hh6', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'G#5' },
      { id: 'df0_bd8', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'df0_hh8', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'G5' },
      { id: 'df0_hh10', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'G#5' },
      { id: 'df0_bd12', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'F4' },
      { id: 'df0_sd12', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'df0_hh12', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'G5' },
      { id: 'df0_hh14', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'G#5' },
      { id: 'df1_bd0', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'df1_hh0', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'G5' },
      { id: 'df1_hh2', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'G#5' },
      { id: 'df1_bd4', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'F4' },
      { id: 'df1_sd4', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'df1_hh4', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'G5' },
      { id: 'df1_hh6', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'G#5' },
      { id: 'df1_bd8', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'df1_hh8', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'G5' },
      { id: 'df1_hh10', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'G#5' },
      { id: 'df1_bd12', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'F4' },
      { id: 'df1_sd12', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'df1_hh12', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'G5' },
      { id: 'df1_hh14', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'G#5' }
    ]
  },
  {
    title: 'Tom-Fill-In & Crash-Auflösung',
    bpm: 85,
    description: 'VdM Mittelstufe 1: Takt 1 Groove, Takt 2 Fill-In über Snare, High Tom, Mid Tom und Floor Tom mit Crash-Akzent.',
    notes: [
      { id: 'tfi0_bd0', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'tfi0_hh0', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'G5' },
      { id: 'tfi0_hh2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'G5' },
      { id: 'tfi0_sd4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'tfi0_hh4', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'G5' },
      { id: 'tfi0_hh6', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'G5' },
      { id: 'tfi0_bd8', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'tfi0_hh8', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'G5' },
      { id: 'tfi0_hh10', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'G5' },
      { id: 'tfi0_sd12', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'tfi0_hh12', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'G5' },
      { id: 'tfi0_hh14', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'G5' },
      { id: 'tfi1_sd0', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'C5' },
      { id: 'tfi1_sd2', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'C5' },
      { id: 'tfi1_th4', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'E5' },
      { id: 'tfi1_th6', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'E5' },
      { id: 'tfi1_tm8', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'D5' },
      { id: 'tfi1_tm10', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'D5' },
      { id: 'tfi1_tf12', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'A4' },
      { id: 'tfi1_tf14', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'A4' }
    ]
  },
  {
    title: 'Offbeat Hi-Hat Groove',
    bpm: 100,
    description: 'VdM Unterstufe 2: Offene Hi-Hat auf den Und-Zählzeiten (1+, 2+, 3+, 4+) für Reggae, Ska & Funk.',
    notes: [
      { id: 'ob0_bd0', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'ob0_hh2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'G#5' },
      { id: 'ob0_sd4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'ob0_hh6', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'G#5' },
      { id: 'ob0_bd8', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'ob0_hh10', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'G#5' },
      { id: 'ob0_sd12', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'ob0_hh14', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'G#5' },
      { id: 'ob1_bd0', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'ob1_hh2', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'G#5' },
      { id: 'ob1_sd4', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'ob1_hh6', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'G#5' },
      { id: 'ob1_bd8', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'ob1_hh10', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'G#5' },
      { id: 'ob1_sd12', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'ob1_hh14', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'G#5' }
    ]
  },
  {
    title: '16tel Funk Pocket & Synkopen',
    bpm: 78,
    description: 'VdM Mittelstufe 2: Durchgehende 16tel Hi-Hat mit synkopierter Kick auf den 16tel-Offbeats.',
    notes: [
      { id: 'fk0_bd0', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'F4' },
      { id: 'fk0_hh0', barIndex: 0, beatFraction: 0, duration: '16', pitch: 'G5' },
      { id: 'fk0_hh1', barIndex: 0, beatFraction: 1, duration: '16', pitch: 'G5' },
      { id: 'fk0_hh2', barIndex: 0, beatFraction: 2, duration: '16', pitch: 'G5' },
      { id: 'fk0_hh3', barIndex: 0, beatFraction: 3, duration: '16', pitch: 'G5' },
      { id: 'fk0_sd4', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C5' },
      { id: 'fk0_hh4', barIndex: 0, beatFraction: 4, duration: '16', pitch: 'G5' },
      { id: 'fk0_hh5', barIndex: 0, beatFraction: 5, duration: '16', pitch: 'G5' },
      { id: 'fk0_bd6', barIndex: 0, beatFraction: 6, duration: '16', pitch: 'F4' },
      { id: 'fk0_hh6', barIndex: 0, beatFraction: 6, duration: '16', pitch: 'G5' },
      { id: 'fk0_hh7', barIndex: 0, beatFraction: 7, duration: '16', pitch: 'G5' },
      { id: 'fk0_hh8', barIndex: 0, beatFraction: 8, duration: '16', pitch: 'G5' },
      { id: 'fk0_hh9', barIndex: 0, beatFraction: 9, duration: '16', pitch: 'G5' },
      { id: 'fk0_bd10', barIndex: 0, beatFraction: 10, duration: '16', pitch: 'F4' },
      { id: 'fk0_hh10', barIndex: 0, beatFraction: 10, duration: '16', pitch: 'G5' },
      { id: 'fk0_hh11', barIndex: 0, beatFraction: 11, duration: '16', pitch: 'G5' },
      { id: 'fk0_sd12', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'C5' },
      { id: 'fk0_hh12', barIndex: 0, beatFraction: 12, duration: '16', pitch: 'G5' },
      { id: 'fk0_hh13', barIndex: 0, beatFraction: 13, duration: '16', pitch: 'G5' },
      { id: 'fk0_hh14', barIndex: 0, beatFraction: 14, duration: '16', pitch: 'G5' },
      { id: 'fk0_hh15', barIndex: 0, beatFraction: 15, duration: '16', pitch: 'G5' },
      { id: 'fk1_bd0', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'F4' },
      { id: 'fk1_hh0', barIndex: 1, beatFraction: 0, duration: '16', pitch: 'G5' },
      { id: 'fk1_hh1', barIndex: 1, beatFraction: 1, duration: '16', pitch: 'G5' },
      { id: 'fk1_hh2', barIndex: 1, beatFraction: 2, duration: '16', pitch: 'G5' },
      { id: 'fk1_hh3', barIndex: 1, beatFraction: 3, duration: '16', pitch: 'G5' },
      { id: 'fk1_sd4', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'C5' },
      { id: 'fk1_hh4', barIndex: 1, beatFraction: 4, duration: '16', pitch: 'G5' },
      { id: 'fk1_hh5', barIndex: 1, beatFraction: 5, duration: '16', pitch: 'G5' },
      { id: 'fk1_bd6', barIndex: 1, beatFraction: 6, duration: '16', pitch: 'F4' },
      { id: 'fk1_hh6', barIndex: 1, beatFraction: 6, duration: '16', pitch: 'G5' },
      { id: 'fk1_hh7', barIndex: 1, beatFraction: 7, duration: '16', pitch: 'G5' },
      { id: 'fk1_hh8', barIndex: 1, beatFraction: 8, duration: '16', pitch: 'G5' },
      { id: 'fk1_hh9', barIndex: 1, beatFraction: 9, duration: '16', pitch: 'G5' },
      { id: 'fk1_bd10', barIndex: 1, beatFraction: 10, duration: '16', pitch: 'F4' },
      { id: 'fk1_hh10', barIndex: 1, beatFraction: 10, duration: '16', pitch: 'G5' },
      { id: 'fk1_hh11', barIndex: 1, beatFraction: 11, duration: '16', pitch: 'G5' },
      { id: 'fk1_sd12', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'C5' },
      { id: 'fk1_hh12', barIndex: 1, beatFraction: 12, duration: '16', pitch: 'G5' },
      { id: 'fk1_hh13', barIndex: 1, beatFraction: 13, duration: '16', pitch: 'G5' },
      { id: 'fk1_hh14', barIndex: 1, beatFraction: 14, duration: '16', pitch: 'G5' },
      { id: 'fk1_hh15', barIndex: 1, beatFraction: 15, duration: '16', pitch: 'G5' }
    ]
  },
  {
    title: 'Halftime Heavy Rock / Ballade',
    bpm: 72,
    description: 'VdM Unterstufe 2: Ride-Becken 8tel-Puls, Kick auf 1 und 3+, und Snare nur auf Schlag 3 (Halftime Feel).',
    notes: [
      { id: 'ht0_bd0', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'ht0_rd0', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'F5' },
      { id: 'ht0_rd2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'F5' },
      { id: 'ht0_rd4', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'F5' },
      { id: 'ht0_rd6', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'F5' },
      { id: 'ht0_sd8', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'C5' },
      { id: 'ht0_rd8', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'F5' },
      { id: 'ht0_bd10', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'F4' },
      { id: 'ht0_rd10', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'F5' },
      { id: 'ht0_rd12', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'F5' },
      { id: 'ht0_rd14', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'F5' },
      { id: 'ht1_bd0', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'ht1_rd0', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'F5' },
      { id: 'ht1_rd2', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'F5' },
      { id: 'ht1_rd4', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'F5' },
      { id: 'ht1_rd6', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'F5' },
      { id: 'ht1_sd8', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'C5' },
      { id: 'ht1_rd8', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'F5' },
      { id: 'ht1_bd10', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'F4' },
      { id: 'ht1_rd10', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'F5' },
      { id: 'ht1_rd12', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'F5' },
      { id: 'ht1_rd14', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'F5' }
    ]
  }
];
