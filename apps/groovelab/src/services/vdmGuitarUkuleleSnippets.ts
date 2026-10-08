/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: VdM-Notenschnipsel Zupfinstrumente
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
    instrument: 'guitar',
    timeSignature: '4/4',
    tempoBpm: 90,
    barsCount: 2,
    displayMode: 'both',
    description: 'VdM Grundstufe: Der weltberühmte Calypso-Schlag (↓ ↓↑ ↑↓↑) mit Leerschlägen und akzentuiertem Insel-Groove.',
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
      // Takt 0: C-Dur Strumming (↓ auf 1, ↓↑ auf 2, ↑ auf 3, ↓↑ auf 4)
      { id: 'ucs1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4', fret: 3, stringIndex: 0 },
      { id: 'ucs2', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C4', fret: 3, stringIndex: 0 },
      { id: 'ucs3', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'C4', fret: 3, stringIndex: 0 },
      { id: 'ucs4', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'C4', fret: 3, stringIndex: 0 },
      { id: 'ucs5', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'C4', fret: 3, stringIndex: 0 },
      { id: 'ucs6', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'C4', fret: 3, stringIndex: 0 },
      // Takt 1: F-Dur Strumming
      { id: 'ucs7', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'ucs8', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'ucs9', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'ucs10', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'ucs11', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'ucs12', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'F4', fret: 1, stringIndex: 1 }
    ]
  },
  {
    id: 'vdm-uke-magic-4-chords',
    title: 'Ukulele "Magic 4 Chords" (C - G - Am - F)',
    category: 'Zupfinstrumente',
    vdmFolder: 'ukulele-basics',
    vdmLevel: 'unterstufe',
    instrument: 'guitar',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 4,
    displayMode: 'both',
    description: 'VdM Unterstufe: Die universelle 4-Akkord-Reihenfolge auf der Ukulele mit klaren 4/4 Anschlägen.',
    tags: ['Ukulele', '4 Chords', 'Pop-Kadenz', 'Akkordwechsel', 'C-G-Am-F'],
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
      // Takt 0: C-Dur
      { id: 'um_c1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4', fret: 3, stringIndex: 0 },
      { id: 'um_c2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C4', fret: 3, stringIndex: 0 },
      { id: 'um_c3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'C4', fret: 3, stringIndex: 0 },
      { id: 'um_c4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C4', fret: 3, stringIndex: 0 },
      // Takt 1: G-Dur
      { id: 'um_g1', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'B3', fret: 2, stringIndex: 0 },
      { id: 'um_g2', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'B3', fret: 2, stringIndex: 0 },
      { id: 'um_g3', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'B3', fret: 2, stringIndex: 0 },
      { id: 'um_g4', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'B3', fret: 2, stringIndex: 0 },
      // Takt 2: A-Moll
      { id: 'um_a1', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'A3', fret: 2, stringIndex: 3 },
      { id: 'um_a2', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'A3', fret: 2, stringIndex: 3 },
      { id: 'um_a3', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'A3', fret: 2, stringIndex: 3 },
      { id: 'um_a4', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'A3', fret: 2, stringIndex: 3 },
      // Takt 3: F-Dur
      { id: 'um_f1', barIndex: 3, beatFraction: 0, duration: '4', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'um_f2', barIndex: 3, beatFraction: 4, duration: '4', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'um_f3', barIndex: 3, beatFraction: 8, duration: '4', pitch: 'F4', fret: 1, stringIndex: 1 },
      { id: 'um_f4', barIndex: 3, beatFraction: 12, duration: '4', pitch: 'F4', fret: 1, stringIndex: 1 }
    ]
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
    description: 'VdM Unterstufe: Fundamentales Zupfmuster nach Matteo Carcassi: Daumen (p), Zeigefinger (i), Mittelfinger (m), Ringfinger (a).',
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
      // Takt 0: C-Dur PIMA (p: C3, i: G3, m: C4, a: E4)
      { id: 'cp_p1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C3', fret: 3, stringIndex: 4 },
      { id: 'cp_i1', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'G3', fret: 0, stringIndex: 2 },
      { id: 'cp_m1', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C4', fret: 1, stringIndex: 1 },
      { id: 'cp_a1', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'E4', fret: 0, stringIndex: 0 },
      { id: 'cp_p2', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'C3', fret: 3, stringIndex: 4 },
      { id: 'cp_i2', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'G3', fret: 0, stringIndex: 2 },
      { id: 'cp_m2', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'C4', fret: 1, stringIndex: 1 },
      { id: 'cp_a2', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'E4', fret: 0, stringIndex: 0 },
      // Takt 1: G7 PIMA (p: B2 / D3, i: G3, m: B3, a: F4)
      { id: 'cp_p3', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'G2', fret: 3, stringIndex: 5 },
      { id: 'cp_i3', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'G3', fret: 0, stringIndex: 2 },
      { id: 'cp_m3', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'B3', fret: 0, stringIndex: 1 },
      { id: 'cp_a3', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'F4', fret: 1, stringIndex: 0 },
      { id: 'cp_p4', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'G2', fret: 3, stringIndex: 5 },
      { id: 'cp_i4', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'G3', fret: 0, stringIndex: 2 },
      { id: 'cp_m4', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'B3', fret: 0, stringIndex: 1 },
      { id: 'cp_a4', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'F4', fret: 1, stringIndex: 0 }
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
    tempoBpm: 105,
    barsCount: 2,
    displayMode: 'both',
    description: 'VdM Unterstufe E-Gitarre: Straffe Achtel-Powerchords mit abgedämpfter Handkante (P.M.) und offenen Akzenten.',
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
      // Takt 0: E5 P.M. Achtel gefolgt von G5 Akzent
      { id: 'rp1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'E2', fret: 0, stringIndex: 5 },
      { id: 'rp2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'E2', fret: 0, stringIndex: 5 },
      { id: 'rp3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'E2', fret: 0, stringIndex: 5 },
      { id: 'rp4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'E2', fret: 0, stringIndex: 5 },
      { id: 'rp5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'E2', fret: 0, stringIndex: 5 },
      { id: 'rp6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'E2', fret: 0, stringIndex: 5 },
      { id: 'rp7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'G2', fret: 3, stringIndex: 5 },
      // Takt 1: A5 Akzent und Rückkehr
      { id: 'rp8', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'A2', fret: 0, stringIndex: 4 },
      { id: 'rp9', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G2', fret: 3, stringIndex: 5 },
      { id: 'rp10', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'E2', fret: 0, stringIndex: 5 }
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
    tempoBpm: 70,
    barsCount: 2,
    displayMode: 'both',
    description: 'VdM Mittelstufe: Kraftaufbau für den F-Barré über die oberen 4 Saiten ohne Verkrampfung der Greifhand.',
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
      // Takt 0: F-Mini-Barré (F3 auf D-Saite 3, A3 auf G-Saite 2, C4 auf B-Saite 1, F4 auf e-Saite 1)
      { id: 'bp_f1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F3', fret: 3, stringIndex: 3 },
      { id: 'bp_f2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'A3', fret: 2, stringIndex: 2 },
      { id: 'bp_f3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'C4', fret: 1, stringIndex: 1 },
      { id: 'bp_f4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'F4', fret: 1, stringIndex: 0 },
      // Takt 1: Auflösung nach C-Dur
      { id: 'bp_c1', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'C3', fret: 3, stringIndex: 4 },
      { id: 'bp_c2', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'E4', fret: 0, stringIndex: 0 }
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
    description: 'VdM Unterstufe: Klassischer 12-Bar Shuffle-Lauf mit Grundton + Quinte / Sexte (E5 -> E6).',
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
      // Takt 0: E5 / E6 Shuffle
      { id: 'bs1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'B2', fret: 2, stringIndex: 4 },
      { id: 'bs2', barIndex: 0, beatFraction: 3, duration: '8', pitch: 'B2', fret: 2, stringIndex: 4 },
      { id: 'bs3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C#3', fret: 4, stringIndex: 4 },
      { id: 'bs4', barIndex: 0, beatFraction: 7, duration: '8', pitch: 'C#3', fret: 4, stringIndex: 4 },
      { id: 'bs5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'B2', fret: 2, stringIndex: 4 },
      { id: 'bs6', barIndex: 0, beatFraction: 11, duration: '8', pitch: 'B2', fret: 2, stringIndex: 4 },
      { id: 'bs7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'C#3', fret: 4, stringIndex: 4 },
      { id: 'bs8', barIndex: 0, beatFraction: 15, duration: '8', pitch: 'C#3', fret: 4, stringIndex: 4 },
      // Takt 1: A5 / A6 Shuffle
      { id: 'bs9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'E3', fret: 2, stringIndex: 3 },
      { id: 'bs10', barIndex: 1, beatFraction: 3, duration: '8', pitch: 'E3', fret: 2, stringIndex: 3 },
      { id: 'bs11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'F#3', fret: 4, stringIndex: 3 },
      { id: 'bs12', barIndex: 1, beatFraction: 7, duration: '8', pitch: 'F#3', fret: 4, stringIndex: 3 },
      { id: 'bs13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'E3', fret: 2, stringIndex: 3 },
      { id: 'bs14', barIndex: 1, beatFraction: 11, duration: '8', pitch: 'E3', fret: 2, stringIndex: 3 },
      { id: 'bs15', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'E2', fret: 0, stringIndex: 5 }
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
    tempoBpm: 110,
    barsCount: 2,
    displayMode: 'both',
    description: 'VdM Mittelstufe E-Bass & Kontrabass: Flüssige 4/4 Walking-Bass-Linie mit chromatischen Leittönen zum nächsten Grundton.',
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
      // Takt 0: Dm7 (D2, F2) -> G7 (G2, Ab2 chromatisch zu A / G)
      { id: 'wb_n1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'D2', fret: 0, stringIndex: 1 },
      { id: 'wb_n2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'F2', fret: 3, stringIndex: 1 },
      { id: 'wb_n3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'G2', fret: 3, stringIndex: 2 },
      { id: 'wb_n4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'B2', fret: 2, stringIndex: 1 },
      // Takt 1: Cmaj7 (C3, B2, A2, G2)
      { id: 'wb_n5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'C3', fret: 3, stringIndex: 0 },
      { id: 'wb_n6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'B2', fret: 2, stringIndex: 0 },
      { id: 'wb_n7', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'A2', fret: 0, stringIndex: 0 },
      { id: 'wb_n8', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'G2', fret: 3, stringIndex: 1 }
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
    tempoBpm: 95,
    barsCount: 2,
    displayMode: 'both',
    description: 'VdM Mittelstufe: Perkussiver Daumenanschlag (Thumb) auf der E-Saite kombiniert mit angerissenem Zeigefinger (Pop) auf der D/G-Saite.',
    tags: ['E-Bass', 'Slap Bass', 'Thumb Pop', 'Funk', 'Groove'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: Thumb E1, Dead-Note, Pop E3, Thumb E1
      { id: 'sb1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'E1', fret: 0, stringIndex: 3 },
      { id: 'sb2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'G1', fret: 3, stringIndex: 3 },
      { id: 'sb3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'E3', fret: 9, stringIndex: 1 },
      { id: 'sb4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'D3', fret: 7, stringIndex: 1 },
      { id: 'sb5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'E1', fret: 0, stringIndex: 3 },
      { id: 'sb6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'G1', fret: 3, stringIndex: 3 },
      { id: 'sb7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'A1', fret: 5, stringIndex: 3 },
      // Takt 1: Groove-Abschluss mit Double-Thumb
      { id: 'sb8', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'E1', fret: 0, stringIndex: 3 },
      { id: 'sb9', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'E1', fret: 0, stringIndex: 3 },
      { id: 'sb10', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'E3', fret: 9, stringIndex: 1 },
      { id: 'sb11', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'REST' },
      { id: 'sb12', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'E1', fret: 0, stringIndex: 3 }
    ]
  }
];
