/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: Notenschnipsel Zupfinstrumente
 * vdmGuitarUkuleleSnippets.ts
 * 
 * Kanonischer Lehrplan-Katalog für Gitarre, E-Gitarre, Ukulele & E-Bass:
 * - Ukulele Calypso-Strumming & "Magic 4 Chords"
 * - Klassische Gitarre: Carcassi PIMA-Arpeggio & Lagenwechsel
 * - E-Gitarre: Rock Powerchords mit Palm-Mute & Blues Shuffle
 * - Akustik-Gitarre: F-Dur Mini-Barré Vorbereitung
 * - E-Bass: Jazz Walking Bass (II-V-I) & Slap-Bass Thumb/Pop
 * - 100% präzise Tabulatur-Metadaten (fret, stringIndex) für synchrone Noten/Tab-Darstellung
 */

import { MicroScoreSnippet } from '../components/student/meisterwerk/microscore/microScore.types';

export const VDM_GUITAR_UKE_SNIPPETS: MicroScoreSnippet[] = [
  {
    id: 'vdm-uke-calypso-strum',
    title: 'Ukulele Calypso-Strumming (C & F-Dur)',
    category: 'Zupfinstrumente',
    vdmFolder: 'ukulele-basics',
    vdmLevel: 'elementar',
    instrument: 'ukulele',
    timeSignature: '4/4',
    tempoBpm: 88,
    barsCount: 2,
    displayMode: 'both',
    description: 'Grundstufe: Der weltberühmte Calypso-Schlag (↓ ↓↑ ↑↓↑) mit Leerschlägen und akzentuiertem Insel-Groove.',
    tags: ['Ukulele', 'Calypso', 'Strumming', 'C-Dur', 'F-Dur', 'Schlagmuster'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'ucs_c', barIndex: 0, tickPosition: 0, chordName: 'C' },
      { id: 'ucs_f', barIndex: 1, tickPosition: 0, chordName: 'F' }
    ],
    notes: [
      // Takt 0: C-Dur Strumming (↓ auf 1, ↓↑ auf 2, Pause auf 3, ↑ auf 3+, ↓↑ auf 4)
      { id: 'ucs1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C5', fret: 3, stringIndex: 0 },
      { id: 'ucs2', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C5', fret: 3, stringIndex: 0 },
      { id: 'ucs3', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'C5', fret: 3, stringIndex: 0 },
      { id: 'ucs3_rest', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'REST' },
      { id: 'ucs4', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'C5', fret: 3, stringIndex: 0 },
      { id: 'ucs5', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'C5', fret: 3, stringIndex: 0 },
      { id: 'ucs6', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'C5', fret: 3, stringIndex: 0 },
      // Takt 1: F-Dur Strumming
      { id: 'ucs7', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'ucs8', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'ucs9', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'ucs9_rest', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'REST' },
      { id: 'ucs10', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'ucs11', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'ucs12', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'F4', fret: 1, stringIndex: 1 }
    ]
  },
  {
    id: 'vdm-uke-magic-4-chords',
    title: '"Magic 4 Chords" Pop-Kadenz (C - G - Am - F)',
    category: 'Zupfinstrumente',
    vdmFolder: 'ukulele-basics',
    vdmLevel: 'unterstufe',
    instrument: 'ukulele',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 4,
    displayMode: 'both',
    description: 'Unterstufe: Die universelle 4-Akkord-Reihenfolge (I - V - vi - IV) mit vollen 4/4 Anschlägen für Ukulele, Gitarre und Tasten.',
    tags: ['Ukulele', 'Gitarre', '4 Chords', 'Pop-Kadenz', 'Akkordwechsel', 'C-G-Am-F'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'um1', barIndex: 0, tickPosition: 0, chordName: 'C' },
      { id: 'um2', barIndex: 1, tickPosition: 0, chordName: 'G' },
      { id: 'um3', barIndex: 2, tickPosition: 0, chordName: 'Am' },
      { id: 'um4', barIndex: 3, tickPosition: 0, chordName: 'F' }
    ],
    notes: [
      // Takt 0: C-Dur (G4-C4-E4-C5, TAB: 0-0-0-3) auf 1, 2, 3, 4
      { id: 'um_c0_0', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G4', fret: 0, stringIndex: 3 },
      { id: 'um_c0_1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'um_c0_2', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'um_c0_3', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C5', fret: 3, stringIndex: 0 },
      { id: 'um_c4_0', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'G4', fret: 0, stringIndex: 3 },
      { id: 'um_c4_1', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'um_c4_2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'um_c4_3', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C5', fret: 3, stringIndex: 0 },
      { id: 'um_c8_0', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'G4', fret: 0, stringIndex: 3 },
      { id: 'um_c8_1', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'um_c8_2', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'um_c8_3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'C5', fret: 3, stringIndex: 0 },
      { id: 'um_c12_0', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'G4', fret: 0, stringIndex: 3 },
      { id: 'um_c12_1', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'um_c12_2', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'um_c12_3', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5', fret: 3, stringIndex: 0 },

      // Takt 1: G-Dur (G4-D4-G4-B4, TAB: 0-2-3-2)
      { id: 'um_g0_0', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G4', fret: 0, stringIndex: 3 },
      { id: 'um_g0_1', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'D4', fret: 2, stringIndex: 2 },
      { id: 'um_g0_2', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G4', fret: 3, stringIndex: 1 },
      { id: 'um_g0_3', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'B4', fret: 2, stringIndex: 0 },
      { id: 'um_g4_0', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G4', fret: 0, stringIndex: 3 },
      { id: 'um_g4_1', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'D4', fret: 2, stringIndex: 2 },
      { id: 'um_g4_2', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G4', fret: 3, stringIndex: 1 },
      { id: 'um_g4_3', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'B4', fret: 2, stringIndex: 0 },
      { id: 'um_g8_0', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'G4', fret: 0, stringIndex: 3 },
      { id: 'um_g8_1', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'D4', fret: 2, stringIndex: 2 },
      { id: 'um_g8_2', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'G4', fret: 3, stringIndex: 1 },
      { id: 'um_g8_3', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'B4', fret: 2, stringIndex: 0 },
      { id: 'um_g12_0', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'G4', fret: 0, stringIndex: 3 },
      { id: 'um_g12_1', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'D4', fret: 2, stringIndex: 2 },
      { id: 'um_g12_2', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'G4', fret: 3, stringIndex: 1 },
      { id: 'um_g12_3', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'B4', fret: 2, stringIndex: 0 },

      // Takt 2: A-Moll (A4-C4-E4-A4, TAB: 2-0-0-0)
      { id: 'um_a0_0', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'A4', fret: 2, stringIndex: 3 },
      { id: 'um_a0_1', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'um_a0_2', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'um_a0_3', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'A4', fret: 0, stringIndex: 0 },
      { id: 'um_a4_0', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'A4', fret: 2, stringIndex: 3 },
      { id: 'um_a4_1', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'um_a4_2', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'um_a4_3', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'A4', fret: 0, stringIndex: 0 },
      { id: 'um_a8_0', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'A4', fret: 2, stringIndex: 3 },
      { id: 'um_a8_1', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'um_a8_2', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'um_a8_3', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'A4', fret: 0, stringIndex: 0 },
      { id: 'um_a12_0', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'A4', fret: 2, stringIndex: 3 },
      { id: 'um_a12_1', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'um_a12_2', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'um_a12_3', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'A4', fret: 0, stringIndex: 0 },

      // Takt 3: F-Dur (A4-C4-F4-A4, TAB: 2-0-1-0)
      { id: 'um_f0_0', barIndex: 3, beatFraction: 0, duration: '4', pitch: 'A4', fret: 2, stringIndex: 3 },
      { id: 'um_f0_1', barIndex: 3, beatFraction: 0, duration: '4', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'um_f0_2', barIndex: 3, beatFraction: 0, duration: '4', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'um_f0_3', barIndex: 3, beatFraction: 0, duration: '4', pitch: 'A4', fret: 0, stringIndex: 0 },
      { id: 'um_f4_0', barIndex: 3, beatFraction: 4, duration: '4', pitch: 'A4', fret: 2, stringIndex: 3 },
      { id: 'um_f4_1', barIndex: 3, beatFraction: 4, duration: '4', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'um_f4_2', barIndex: 3, beatFraction: 4, duration: '4', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'um_f4_3', barIndex: 3, beatFraction: 4, duration: '4', pitch: 'A4', fret: 0, stringIndex: 0 },
      { id: 'um_f8_0', barIndex: 3, beatFraction: 8, duration: '4', pitch: 'A4', fret: 2, stringIndex: 3 },
      { id: 'um_f8_1', barIndex: 3, beatFraction: 8, duration: '4', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'um_f8_2', barIndex: 3, beatFraction: 8, duration: '4', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'um_f8_3', barIndex: 3, beatFraction: 8, duration: '4', pitch: 'A4', fret: 0, stringIndex: 0 },
      { id: 'um_f12_0', barIndex: 3, beatFraction: 12, duration: '4', pitch: 'A4', fret: 2, stringIndex: 3 },
      { id: 'um_f12_1', barIndex: 3, beatFraction: 12, duration: '4', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'um_f12_2', barIndex: 3, beatFraction: 12, duration: '4', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'um_f12_3', barIndex: 3, beatFraction: 12, duration: '4', pitch: 'A4', fret: 0, stringIndex: 0 }
    ],
    projections: {
      guitar: {
        instrument: 'guitar',
        displayMode: 'both',
        clef: 'treble',
        notes: [
          // Takt 0: C-Dur (x-3-2-0-1-0)
          { id: 'mg_c0_0', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4', fret: 3, stringIndex: 4 },
          { id: 'mg_c0_1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E4', fret: 2, stringIndex: 3 },
          { id: 'mg_c0_2', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G4', fret: 0, stringIndex: 2 },
          { id: 'mg_c0_3', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C5', fret: 1, stringIndex: 1 },
          { id: 'mg_c0_4', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E5', fret: 0, stringIndex: 0 },
          { id: 'mg_c4_0', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C4', fret: 3, stringIndex: 4 },
          { id: 'mg_c4_1', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E4', fret: 2, stringIndex: 3 },
          { id: 'mg_c4_2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'G4', fret: 0, stringIndex: 2 },
          { id: 'mg_c4_3', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C5', fret: 1, stringIndex: 1 },
          { id: 'mg_c4_4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E5', fret: 0, stringIndex: 0 },
          { id: 'mg_c8_0', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'C4', fret: 3, stringIndex: 4 },
          { id: 'mg_c8_1', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'E4', fret: 2, stringIndex: 3 },
          { id: 'mg_c8_2', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'G4', fret: 0, stringIndex: 2 },
          { id: 'mg_c8_3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'C5', fret: 1, stringIndex: 1 },
          { id: 'mg_c8_4', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'E5', fret: 0, stringIndex: 0 },
          { id: 'mg_c12_0', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C4', fret: 3, stringIndex: 4 },
          { id: 'mg_c12_1', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'E4', fret: 2, stringIndex: 3 },
          { id: 'mg_c12_2', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'G4', fret: 0, stringIndex: 2 },
          { id: 'mg_c12_3', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5', fret: 1, stringIndex: 1 },
          { id: 'mg_c12_4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'E5', fret: 0, stringIndex: 0 },

          // Takt 1: G-Dur (3-2-0-0-0-3)
          { id: 'mg_g0_0', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G3', fret: 3, stringIndex: 5 },
          { id: 'mg_g0_1', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'B3', fret: 2, stringIndex: 4 },
          { id: 'mg_g0_2', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'D4', fret: 0, stringIndex: 3 },
          { id: 'mg_g0_3', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G4', fret: 0, stringIndex: 2 },
          { id: 'mg_g0_4', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'B4', fret: 0, stringIndex: 1 },
          { id: 'mg_g0_5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G5', fret: 3, stringIndex: 0 },
          { id: 'mg_g4_0', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G3', fret: 3, stringIndex: 5 },
          { id: 'mg_g4_1', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'B3', fret: 2, stringIndex: 4 },
          { id: 'mg_g4_2', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'D4', fret: 0, stringIndex: 3 },
          { id: 'mg_g4_3', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G4', fret: 0, stringIndex: 2 },
          { id: 'mg_g4_4', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'B4', fret: 0, stringIndex: 1 },
          { id: 'mg_g4_5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G5', fret: 3, stringIndex: 0 },
          { id: 'mg_g8_0', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'G3', fret: 3, stringIndex: 5 },
          { id: 'mg_g8_1', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'B3', fret: 2, stringIndex: 4 },
          { id: 'mg_g8_2', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'D4', fret: 0, stringIndex: 3 },
          { id: 'mg_g8_3', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'G4', fret: 0, stringIndex: 2 },
          { id: 'mg_g8_4', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'B4', fret: 0, stringIndex: 1 },
          { id: 'mg_g8_5', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'G5', fret: 3, stringIndex: 0 },
          { id: 'mg_g12_0', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'G3', fret: 3, stringIndex: 5 },
          { id: 'mg_g12_1', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'B3', fret: 2, stringIndex: 4 },
          { id: 'mg_g12_2', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'D4', fret: 0, stringIndex: 3 },
          { id: 'mg_g12_3', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'G4', fret: 0, stringIndex: 2 },
          { id: 'mg_g12_4', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'B4', fret: 0, stringIndex: 1 },
          { id: 'mg_g12_5', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'G5', fret: 3, stringIndex: 0 },

          // Takt 2: A-Moll (x-0-2-2-1-0)
          { id: 'mg_a0_0', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'A3', fret: 0, stringIndex: 4 },
          { id: 'mg_a0_1', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'E4', fret: 2, stringIndex: 3 },
          { id: 'mg_a0_2', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'A4', fret: 2, stringIndex: 2 },
          { id: 'mg_a0_3', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'C5', fret: 1, stringIndex: 1 },
          { id: 'mg_a0_4', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'E5', fret: 0, stringIndex: 0 },
          { id: 'mg_a4_0', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'A3', fret: 0, stringIndex: 4 },
          { id: 'mg_a4_1', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'E4', fret: 2, stringIndex: 3 },
          { id: 'mg_a4_2', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'A4', fret: 2, stringIndex: 2 },
          { id: 'mg_a4_3', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'C5', fret: 1, stringIndex: 1 },
          { id: 'mg_a4_4', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'E5', fret: 0, stringIndex: 0 },
          { id: 'mg_a8_0', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'A3', fret: 0, stringIndex: 4 },
          { id: 'mg_a8_1', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'E4', fret: 2, stringIndex: 3 },
          { id: 'mg_a8_2', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'A4', fret: 2, stringIndex: 2 },
          { id: 'mg_a8_3', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'C5', fret: 1, stringIndex: 1 },
          { id: 'mg_a8_4', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'E5', fret: 0, stringIndex: 0 },
          { id: 'mg_a12_0', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'A3', fret: 0, stringIndex: 4 },
          { id: 'mg_a12_1', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'E4', fret: 2, stringIndex: 3 },
          { id: 'mg_a12_2', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'A4', fret: 2, stringIndex: 2 },
          { id: 'mg_a12_3', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'C5', fret: 1, stringIndex: 1 },
          { id: 'mg_a12_4', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'E5', fret: 0, stringIndex: 0 },

          // Takt 3: F-Dur (1-3-3-2-1-1 bzw. x-x-3-2-1-1)
          { id: 'mg_f0_0', barIndex: 3, beatFraction: 0, duration: '4', pitch: 'F4', fret: 3, stringIndex: 3 },
          { id: 'mg_f0_1', barIndex: 3, beatFraction: 0, duration: '4', pitch: 'A4', fret: 2, stringIndex: 2 },
          { id: 'mg_f0_2', barIndex: 3, beatFraction: 0, duration: '4', pitch: 'C5', fret: 1, stringIndex: 1 },
          { id: 'mg_f0_3', barIndex: 3, beatFraction: 0, duration: '4', pitch: 'F5', fret: 1, stringIndex: 0 },
          { id: 'mg_f4_0', barIndex: 3, beatFraction: 4, duration: '4', pitch: 'F4', fret: 3, stringIndex: 3 },
          { id: 'mg_f4_1', barIndex: 3, beatFraction: 4, duration: '4', pitch: 'A4', fret: 2, stringIndex: 2 },
          { id: 'mg_f4_2', barIndex: 3, beatFraction: 4, duration: '4', pitch: 'C5', fret: 1, stringIndex: 1 },
          { id: 'mg_f4_3', barIndex: 3, beatFraction: 4, duration: '4', pitch: 'F5', fret: 1, stringIndex: 0 },
          { id: 'mg_f8_0', barIndex: 3, beatFraction: 8, duration: '4', pitch: 'F4', fret: 3, stringIndex: 3 },
          { id: 'mg_f8_1', barIndex: 3, beatFraction: 8, duration: '4', pitch: 'A4', fret: 2, stringIndex: 2 },
          { id: 'mg_f8_2', barIndex: 3, beatFraction: 8, duration: '4', pitch: 'C5', fret: 1, stringIndex: 1 },
          { id: 'mg_f8_3', barIndex: 3, beatFraction: 8, duration: '4', pitch: 'F5', fret: 1, stringIndex: 0 },
          { id: 'mg_f12_0', barIndex: 3, beatFraction: 12, duration: '4', pitch: 'F4', fret: 3, stringIndex: 3 },
          { id: 'mg_f12_1', barIndex: 3, beatFraction: 12, duration: '4', pitch: 'A4', fret: 2, stringIndex: 2 },
          { id: 'mg_f12_2', barIndex: 3, beatFraction: 12, duration: '4', pitch: 'C5', fret: 1, stringIndex: 1 },
          { id: 'mg_f12_3', barIndex: 3, beatFraction: 12, duration: '4', pitch: 'F5', fret: 1, stringIndex: 0 }
        ]
      },
      piano: {
        instrument: 'piano',
        displayMode: 'notes',
        clef: 'treble',
        notes: [
          // Takt 0: C-Dur
          { id: 'mp_c0_0', barIndex: 0, beatFraction: 0, duration: '1', pitch: 'C4' },
          { id: 'mp_c0_1', barIndex: 0, beatFraction: 0, duration: '1', pitch: 'E4' },
          { id: 'mp_c0_2', barIndex: 0, beatFraction: 0, duration: '1', pitch: 'G4' },
          { id: 'mp_c0_3', barIndex: 0, beatFraction: 0, duration: '1', pitch: 'C5' },
          // Takt 1: G-Dur
          { id: 'mp_g0_0', barIndex: 1, beatFraction: 0, duration: '1', pitch: 'B3' },
          { id: 'mp_g0_1', barIndex: 1, beatFraction: 0, duration: '1', pitch: 'D4' },
          { id: 'mp_g0_2', barIndex: 1, beatFraction: 0, duration: '1', pitch: 'G4' },
          { id: 'mp_g0_3', barIndex: 1, beatFraction: 0, duration: '1', pitch: 'D5' },
          // Takt 2: Am
          { id: 'mp_a0_0', barIndex: 2, beatFraction: 0, duration: '1', pitch: 'A3' },
          { id: 'mp_a0_1', barIndex: 2, beatFraction: 0, duration: '1', pitch: 'C4' },
          { id: 'mp_a0_2', barIndex: 2, beatFraction: 0, duration: '1', pitch: 'E4' },
          { id: 'mp_a0_3', barIndex: 2, beatFraction: 0, duration: '1', pitch: 'A4' },
          // Takt 3: F-Dur
          { id: 'mp_f0_0', barIndex: 3, beatFraction: 0, duration: '1', pitch: 'A3' },
          { id: 'mp_f0_1', barIndex: 3, beatFraction: 0, duration: '1', pitch: 'C4' },
          { id: 'mp_f0_2', barIndex: 3, beatFraction: 0, duration: '1', pitch: 'F4' },
          { id: 'mp_f0_3', barIndex: 3, beatFraction: 0, duration: '1', pitch: 'C5' }
        ]
      },
      bass: {
        instrument: 'bass',
        displayMode: 'both',
        clef: 'bass',
        notes: [
          // Takt 0: C3 Grundtöne
          { id: 'mb_c0', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'C3', fret: 3, stringIndex: 2 },
          { id: 'mb_c8', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'C3', fret: 3, stringIndex: 2 },
          // Takt 1: G2 Grundtöne
          { id: 'mb_g0', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'G2', fret: 3, stringIndex: 3 },
          { id: 'mb_g8', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'G2', fret: 3, stringIndex: 3 },
          // Takt 2: A2 Grundtöne
          { id: 'mb_a0', barIndex: 2, beatFraction: 0, duration: '2', pitch: 'A2', fret: 0, stringIndex: 2 },
          { id: 'mb_a8', barIndex: 2, beatFraction: 8, duration: '2', pitch: 'A2', fret: 0, stringIndex: 2 },
          // Takt 3: F2 Grundtöne
          { id: 'mb_f0', barIndex: 3, beatFraction: 0, duration: '2', pitch: 'F2', fret: 1, stringIndex: 3 },
          { id: 'mb_f8', barIndex: 3, beatFraction: 8, duration: '2', pitch: 'F2', fret: 1, stringIndex: 3 }
        ]
      }
    }
  },
  {
    id: 'vdm-git-carcassi-pima',
    title: 'Carcassi PIMA-Arpeggio (Klassische Gitarre)',
    category: 'Zupfinstrumente',
    vdmFolder: 'gitarre-arpeggio',
    vdmLevel: 'unterstufe',
    instrument: 'guitar',
    timeSignature: '4/4',
    tempoBpm: 75,
    barsCount: 2,
    displayMode: 'both',
    description: 'Unterstufe: Fundamentales Zupfmuster nach Matteo Carcassi: Daumen (p), Zeigefinger (i), Mittelfinger (m), Ringfinger (a).',
    tags: ['Klassische Gitarre', 'Carcassi', 'PIMA', 'Arpeggio', 'Zupfmuster'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'cp1', barIndex: 0, tickPosition: 0, chordName: 'C' },
      { id: 'cp2', barIndex: 1, tickPosition: 0, chordName: 'G7' }
    ],
    notes: [
      // Takt 0: C-Dur PIMA (notiert 8vb: p: C4, i: G4, m: C5, a: E5)
      { id: 'cp_p1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C4', fret: 3, stringIndex: 4 },
      { id: 'cp_i1', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'G4', fret: 0, stringIndex: 2 },
      { id: 'cp_m1', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C5', fret: 1, stringIndex: 1 },
      { id: 'cp_a1', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'E5', fret: 0, stringIndex: 0 },
      { id: 'cp_p2', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'C4', fret: 3, stringIndex: 4 },
      { id: 'cp_i2', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'G4', fret: 0, stringIndex: 2 },
      { id: 'cp_m2', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'C5', fret: 1, stringIndex: 1 },
      { id: 'cp_a2', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'E5', fret: 0, stringIndex: 0 },
      // Takt 1: G7 PIMA (notiert 8vb: p: G3, i: G4, m: B4, a: F5)
      { id: 'cp_p3', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'G3', fret: 3, stringIndex: 5 },
      { id: 'cp_i3', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'G4', fret: 0, stringIndex: 2 },
      { id: 'cp_m3', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'B4', fret: 0, stringIndex: 1 },
      { id: 'cp_a3', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'F5', fret: 1, stringIndex: 0 },
      { id: 'cp_p4', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'G3', fret: 3, stringIndex: 5 },
      { id: 'cp_i4', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'G4', fret: 0, stringIndex: 2 },
      { id: 'cp_m4', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'B4', fret: 0, stringIndex: 1 },
      { id: 'cp_a4', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'F5', fret: 1, stringIndex: 0 }
    ]
  },
  {
    id: 'vdm-git-rock-powerchords',
    title: 'Rock Powerchords (E5 - G5 - A5 mit Palm-Mute)',
    category: 'Zupfinstrumente',
    vdmFolder: 'rock-powerchords',
    vdmLevel: 'unterstufe',
    instrument: 'guitar',
    timeSignature: '4/4',
    tempoBpm: 100,
    barsCount: 2,
    displayMode: 'both',
    description: 'Unterstufe E-Gitarre: Straffe Achtel-Powerchords mit abgedämpfter Handkante (P.M.) und offenen Akzenten.',
    tags: ['E-Gitarre', 'Rock', 'Powerchords', 'Palm Mute', 'E5-G5-A5'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'pc1', barIndex: 0, tickPosition: 0, chordName: 'E5' },
      { id: 'pc2', barIndex: 0, tickPosition: 36, chordName: 'G5' },
      { id: 'pc3', barIndex: 1, tickPosition: 0, chordName: 'A5' }
    ],
    notes: [
      // Takt 0: E5 P.M. Achtel gefolgt von G5 Akzent (notiert 8vb: E3 = leere E-Saite)
      { id: 'rp1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'E3', fret: 0, stringIndex: 5 },
      { id: 'rp2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'E3', fret: 0, stringIndex: 5 },
      { id: 'rp3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'E3', fret: 0, stringIndex: 5 },
      { id: 'rp4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'E3', fret: 0, stringIndex: 5 },
      { id: 'rp5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'E3', fret: 0, stringIndex: 5 },
      { id: 'rp6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'E3', fret: 0, stringIndex: 5 },
      { id: 'rp7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'G3', fret: 3, stringIndex: 5 },
      // Takt 1: A5 Akzent und Rückkehr
      { id: 'rp8', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'A3', fret: 0, stringIndex: 4 },
      { id: 'rp9', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G3', fret: 3, stringIndex: 5 },
      { id: 'rp10', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'E3', fret: 0, stringIndex: 5 }
    ]
  },
  {
    id: 'vdm-git-barre-prep',
    title: 'F-Dur Barré Vorbereitung (Mini-Barré)',
    category: 'Zupfinstrumente',
    vdmFolder: 'gitarre-barre',
    vdmLevel: 'mittelstufe',
    instrument: 'guitar',
    timeSignature: '4/4',
    tempoBpm: 72,
    barsCount: 2,
    displayMode: 'both',
    description: 'Mittelstufe: Kraftaufbau für den F-Barré über die oberen 4 Saiten ohne Verkrampfung der Greifhand.',
    tags: ['Gitarre', 'Barré', 'F-Dur', 'Greifhand', 'Mittelstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'bp1', barIndex: 0, tickPosition: 0, chordName: 'F' },
      { id: 'bp2', barIndex: 1, tickPosition: 0, chordName: 'C' }
    ],
    notes: [
      // Takt 0: F-Mini-Barré (notiert 8vb: F4 auf D-Saite 3, A4 auf G-Saite 2, C5 auf B-Saite 1, F5 auf e-Saite 1)
      { id: 'bp_f1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F4', fret: 3, stringIndex: 3 },
      { id: 'bp_f2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'A4', fret: 2, stringIndex: 2 },
      { id: 'bp_f3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'C5', fret: 1, stringIndex: 1 },
      { id: 'bp_f4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'F5', fret: 1, stringIndex: 0 },
      // Takt 1: Auflösung nach C-Dur
      { id: 'bp_c1', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'C4', fret: 3, stringIndex: 4 },
      { id: 'bp_c2', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'E5', fret: 0, stringIndex: 0 }
    ]
  },
  {
    id: 'vdm-git-blues-shuffle-riff',
    title: 'Blues Shuffle Riff auf E & A (12-Bar Style)',
    category: 'Zupfinstrumente',
    vdmFolder: 'gitarre-openchords',
    vdmLevel: 'unterstufe',
    instrument: 'guitar',
    timeSignature: '4/4',
    tempoBpm: 92,
    barsCount: 2,
    displayMode: 'both',
    description: 'Unterstufe: Klassischer 12-Bar Shuffle-Lauf mit Grundton + Quinte / Sexte (E5 -> E6).',
    tags: ['Blues', 'Shuffle', 'Gitarre', 'Quinte Sexte', 'Riff'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'bsr1', barIndex: 0, tickPosition: 0, chordName: 'E5' },
      { id: 'bsr2', barIndex: 1, tickPosition: 0, chordName: 'A5' }
    ],
    notes: [
      // Takt 0: E5 / E6 Shuffle (notiert 8vb: B3 / C#4 auf A-Saite mit punktierten Achteln)
      { id: 'bs1', barIndex: 0, beatFraction: 0, duration: '8', isDotted: true, pitch: 'B3', fret: 2, stringIndex: 4 },
      { id: 'bs2', barIndex: 0, beatFraction: 3, duration: '16', pitch: 'B3', fret: 2, stringIndex: 4 },
      { id: 'bs3', barIndex: 0, beatFraction: 4, duration: '8', isDotted: true, pitch: 'C#4', fret: 4, stringIndex: 4 },
      { id: 'bs4', barIndex: 0, beatFraction: 7, duration: '16', pitch: 'C#4', fret: 4, stringIndex: 4 },
      { id: 'bs5', barIndex: 0, beatFraction: 8, duration: '8', isDotted: true, pitch: 'B3', fret: 2, stringIndex: 4 },
      { id: 'bs6', barIndex: 0, beatFraction: 11, duration: '16', pitch: 'B3', fret: 2, stringIndex: 4 },
      { id: 'bs7', barIndex: 0, beatFraction: 12, duration: '8', isDotted: true, pitch: 'C#4', fret: 4, stringIndex: 4 },
      { id: 'bs8', barIndex: 0, beatFraction: 15, duration: '16', pitch: 'C#4', fret: 4, stringIndex: 4 },
      // Takt 1: A5 / A6 Shuffle (notiert 8vb: E4 / F#4 auf D-Saite)
      { id: 'bs9', barIndex: 1, beatFraction: 0, duration: '8', isDotted: true, pitch: 'E4', fret: 2, stringIndex: 3 },
      { id: 'bs10', barIndex: 1, beatFraction: 3, duration: '16', pitch: 'E4', fret: 2, stringIndex: 3 },
      { id: 'bs11', barIndex: 1, beatFraction: 4, duration: '8', isDotted: true, pitch: 'F#4', fret: 4, stringIndex: 3 },
      { id: 'bs12', barIndex: 1, beatFraction: 7, duration: '16', pitch: 'F#4', fret: 4, stringIndex: 3 },
      { id: 'bs13', barIndex: 1, beatFraction: 8, duration: '8', isDotted: true, pitch: 'E4', fret: 2, stringIndex: 3 },
      { id: 'bs14', barIndex: 1, beatFraction: 11, duration: '16', pitch: 'E4', fret: 2, stringIndex: 3 },
      { id: 'bs15', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'E3', fret: 0, stringIndex: 5 }
    ]
  },
  {
    id: 'vdm-bass-walking-jazz',
    title: 'Jazz Walking Bass (Dm7 - G7 - Cmaj7 Drive)',
    category: 'Zupfinstrumente',
    vdmFolder: 'bass-grooves',
    vdmLevel: 'mittelstufe',
    instrument: 'bass',
    clef: 'bass',
    timeSignature: '4/4',
    tempoBpm: 108,
    barsCount: 2,
    displayMode: 'both',
    description: 'Mittelstufe E-Bass & Kontrabass: Flüssige 4/4 Walking-Bass-Linie mit chromatischen Leittönen zum nächsten Grundton.',
    tags: ['E-Bass', 'Kontrabass', 'Walking Bass', 'Jazz', 'II-V-I'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'wb1', barIndex: 0, tickPosition: 0, chordName: 'Dm7' },
      { id: 'wb2', barIndex: 0, tickPosition: 24, chordName: 'G7' },
      { id: 'wb3', barIndex: 1, tickPosition: 0, chordName: 'Cmaj7' }
    ],
    notes: [
      // Takt 0: Dm7 (notiert 8vb: D3, F3) -> G7 (G2, B2)
      { id: 'wb_n1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'D3', fret: 0, stringIndex: 1 },
      { id: 'wb_n2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'F3', fret: 3, stringIndex: 1 },
      { id: 'wb_n3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'G2', fret: 3, stringIndex: 3 },
      { id: 'wb_n4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'B2', fret: 2, stringIndex: 2 },
      // Takt 1: Cmaj7 (C3, B2, A2, G2)
      { id: 'wb_n5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'C3', fret: 3, stringIndex: 2 },
      { id: 'wb_n6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'B2', fret: 2, stringIndex: 2 },
      { id: 'wb_n7', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'A2', fret: 0, stringIndex: 2 },
      { id: 'wb_n8', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'G2', fret: 3, stringIndex: 3 }
    ]
  },
  {
    id: 'vdm-bass-slap-intro',
    title: 'Slap-Bass Workout (Thumb & Pop Basics)',
    category: 'Zupfinstrumente',
    vdmFolder: 'bass-grooves',
    vdmLevel: 'mittelstufe',
    instrument: 'bass',
    clef: 'bass',
    timeSignature: '4/4',
    tempoBpm: 94,
    barsCount: 2,
    displayMode: 'both',
    description: 'Mittelstufe: Perkussiver Daumenanschlag (Thumb) auf der E-Saite kombiniert mit angerissenem Zeigefinger (Pop) auf der D/G-Saite.',
    tags: ['E-Bass', 'Slap Bass', 'Thumb Pop', 'Funk', 'Groove'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: Thumb E2 (notiert 8vb = E1 klingend), Pop E3, Thumb E2
      { id: 'sb1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'E2', fret: 0, stringIndex: 3 },
      { id: 'sb2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'G2', fret: 3, stringIndex: 3 },
      { id: 'sb3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'E3', fret: 2, stringIndex: 1 },
      { id: 'sb4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'D3', fret: 0, stringIndex: 1 },
      { id: 'sb5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'E2', fret: 0, stringIndex: 3 },
      { id: 'sb6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'G2', fret: 3, stringIndex: 3 },
      { id: 'sb7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'A2', fret: 0, stringIndex: 2 },
      // Takt 1: Groove-Abschluss mit Double-Thumb
      { id: 'sb8', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'E2', fret: 0, stringIndex: 3 },
      { id: 'sb9', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'E2', fret: 0, stringIndex: 3 },
      { id: 'sb10', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'E3', fret: 2, stringIndex: 1 },
      { id: 'sb11', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'REST' },
      { id: 'sb12', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'E2', fret: 0, stringIndex: 3 }
    ]
  }
];

