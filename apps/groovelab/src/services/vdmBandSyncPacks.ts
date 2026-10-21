/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: Notenschnipsel Band-Sync Packs
 * vdmBandSyncPacks.ts
 * 
 * Kanonischer Katalog für Band- & Ensemble-Synchronisation im GrooveLab Studio:
 * - 3 vollständige synchrone Instrumenten-Trios (Schlagzeug + Bass + Tasten/Akkorde)
 * - Identisches BPM-, Takt- und Harmonie-Gerüst zur gleichzeitigen oder getrennten Erarbeitung
 * 
 * Pack 1: "Funk Drive in D-Moll" (96 BPM)
 * Pack 2: "Modern Pop Anthem in C-Dur" (120 BPM)
 * Pack 3: "Chicago Blues Shuffle in A" (80 BPM)
 */

import { MicroScoreSnippet } from '../components/student/meisterwerk/microscore/microScore.types';

export const VDM_BAND_SYNC_PACKS: MicroScoreSnippet[] = [
  // =========================================================================
  // ENSEMBLE PACK 1: FUNK DRIVE IN D-MOLL (96 BPM)
  // =========================================================================
  {
    id: 'vdm-band-funk-drums',
    title: 'Funk Drive: Drums (16tel Hi-Hat & Ghost Snare)',
    category: 'BandPacks',
    vdmFolder: 'band-funk',
    vdmLevel: 'mittelstufe',
    instrument: 'drums',
    clef: 'percussion',
    timeSignature: '4/4',
    tempoBpm: 96,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Ensemble Funk (96 BPM) - Schlagzeug: Knackiger Funk-Beat mit akzentuierter Snare auf 2 und 4 sowie synkopischer Kick.',
    tags: ['BandPack', 'Funk in Dm', 'Drums', 'Ghost Notes', 'Ensemble'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: Kick auf 1, Snare auf 2, Kick auf 3 & 3+, Snare auf 4 + durchgehende 8tel Hi-Hat
      { id: 'bfd1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'bfd2', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'G5' },
      { id: 'bfd3', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'G5' },
      { id: 'bfd4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'bfd5', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'G5' },
      { id: 'bfd6', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'G5' },
      { id: 'bfd7_bd', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'F4' },
      { id: 'bfd7', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'G5' },
      { id: 'bfd8', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'F4' },
      { id: 'bfd8_hh', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'G5' },
      { id: 'bfd9', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'bfd9_hh', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'G5' },
      { id: 'bfd10', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'G5' },
      // Takt 1: Variation mit Double-Kick & durchgehender 8tel Hi-Hat
      { id: 'bfd11', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'bfd12', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'G5' },
      { id: 'bfd12_hh2', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'G5' },
      { id: 'bfd13', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'bfd13_hh4', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'G5' },
      { id: 'bfd13_hh6', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'G5' },
      { id: 'bfd14', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'F4' },
      { id: 'bfd14_hh8', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'G5' },
      { id: 'bfd15', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'F4' },
      { id: 'bfd15_hh10', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'G5' },
      { id: 'bfd16', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'bfd16_hh12', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'G5' },
      { id: 'bfd16_hh14', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'G5' }
    ]
  },
  {
    id: 'vdm-band-funk-bass',
    title: 'Funk Drive: E-Bass (D-Moll Pentatonik Groove)',
    category: 'BandPacks',
    vdmFolder: 'band-funk',
    vdmLevel: 'mittelstufe',
    instrument: 'bass',
    clef: 'bass',
    timeSignature: '4/4',
    tempoBpm: 96,
    barsCount: 2,
    displayMode: 'both',
    description: 'Ensemble Funk (96 BPM) - E-Bass: Synkopischer Slap-/Fingerstyle-Groove passgenau auf die Bassdrum verlinkt.',
    tags: ['BandPack', 'Funk in Dm', 'E-Bass', 'Pentatonik', 'Ensemble'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: D3 Grundton (notiert 8vb = D2 klingend), Oktave D4, C4, A3
      { id: 'bfb1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'D3', fret: 0, stringIndex: 1 },
      { id: 'bfb2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'D4', fret: 7, stringIndex: 0 },
      { id: 'bfb3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C4', fret: 5, stringIndex: 0 },
      { id: 'bfb4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'REST' },
      { id: 'bfb5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'A3', fret: 2, stringIndex: 0 },
      { id: 'bfb6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'C4', fret: 5, stringIndex: 0 },
      { id: 'bfb7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'D3', fret: 0, stringIndex: 1 },
      // Takt 1: Synkopierter Off-Beat Drive
      { id: 'bfb8', barIndex: 1, beatFraction: 0, duration: '8', isDotted: true, pitch: 'D3', fret: 0, stringIndex: 1 },
      { id: 'bfb9', barIndex: 1, beatFraction: 3, duration: '16', pitch: 'F3', fret: 3, stringIndex: 1 },
      { id: 'bfb9_rest', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'REST' },
      { id: 'bfb10', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'G3', fret: 0, stringIndex: 0 },
      { id: 'bfb10_rest', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'REST' },
      { id: 'bfb11', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'A3', fret: 2, stringIndex: 0 },
      { id: 'bfb12', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'D3', fret: 0, stringIndex: 1 }
    ]
  },
  {
    id: 'vdm-band-funk-keys',
    title: 'Funk Drive: Keys & Clavinet (Dm9 Staccato Stabs)',
    category: 'BandPacks',
    vdmFolder: 'band-funk',
    vdmLevel: 'mittelstufe',
    instrument: 'piano',
    timeSignature: '4/4',
    tempoBpm: 96,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Ensemble Funk (96 BPM) - Keys: Scharfe Staccato-Einwürfe auf den Und-Zählzeiten (Dm9 und G13 Akkorde).',
    tags: ['BandPack', 'Funk in Dm', 'Keys', 'Akkorde', 'Stabs', 'Ensemble'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'bfk_c1', barIndex: 0, tickPosition: 6, chordName: 'Dm9' },
      { id: 'bfk_c2', barIndex: 1, tickPosition: 6, chordName: 'G13' }
    ],
    notes: [
      // Takt 0: Dm9 Stabs auf der 2 und 4-und (mit Viertel- und Achtelpausen)
      { id: 'bfk_r0', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'REST' },
      { id: 'bfk1', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'F4' },
      { id: 'bfk2', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'A4' },
      { id: 'bfk3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C5' },
      { id: 'bfk4', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'E5' },
      { id: 'bfk_r1', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'REST' },
      { id: 'bfk_r2', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'REST' },
      { id: 'bfk_r3', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'REST' },
      { id: 'bfk5', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'F4' },
      { id: 'bfk6', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'A4' },
      { id: 'bfk7', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'C5' },
      // Takt 1: G13 Stabs (mit Viertel- und Achtelpausen)
      { id: 'bfk_r4', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'REST' },
      { id: 'bfk8', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'F4' },
      { id: 'bfk9', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'B4' },
      { id: 'bfk10', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'E5' },
      { id: 'bfk_r5', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'REST' },
      { id: 'bfk_r6', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'REST' },
      { id: 'bfk11', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'F4' },
      { id: 'bfk12', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'A4' },
      { id: 'bfk_r7', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'REST' }
    ]
  },

  // =========================================================================
  // ENSEMBLE PACK 2: MODERN POP ANTHEM IN C-DUR (120 BPM)
  // =========================================================================
  {
    id: 'vdm-band-pop-drums',
    title: 'Pop Anthem: Drums (Four-on-the-Floor Pulse)',
    category: 'BandPacks',
    vdmFolder: 'band-pop',
    vdmLevel: 'unterstufe',
    instrument: 'drums',
    clef: 'percussion',
    timeSignature: '4/4',
    tempoBpm: 120,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Ensemble Pop Anthem (120 BPM) - Drums: Treibender Four-on-the-Floor Disco-Beat mit Clap auf 2 und 4.',
    tags: ['BandPack', 'Pop in C', 'Drums', 'Four on the Floor', 'Ensemble'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: Kick auf 1, 2, 3, 4; Snare/Clap auf 2 & 4; Hi-Hat durchgehende Achtel
      { id: 'bpd1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'bpd_hh0', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'G5' },
      { id: 'bpd_hh2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'G5' },
      { id: 'bpd2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'F4' },
      { id: 'bpd3', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'bpd_hh4', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'G5' },
      { id: 'bpd_hh6', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'G5' },
      { id: 'bpd4', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'bpd_hh8', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'G5' },
      { id: 'bpd_hh10', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'G5' },
      { id: 'bpd5', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'F4' },
      { id: 'bpd6', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'bpd_hh12', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'G5' },
      { id: 'bpd_hh14', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'G5' },
      // Takt 1
      { id: 'bpd7', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'bpd1_hh0', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'G5' },
      { id: 'bpd1_hh2', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'G5' },
      { id: 'bpd8', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'F4' },
      { id: 'bpd9', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'bpd1_hh4', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'G5' },
      { id: 'bpd1_hh6', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'G5' },
      { id: 'bpd10', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'bpd1_hh8', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'G5' },
      { id: 'bpd1_hh10', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'G5' },
      { id: 'bpd11', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'F4' },
      { id: 'bpd12', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'bpd1_hh12', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'G5' },
      { id: 'bpd1_hh14', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'G5' }
    ]
  },
  {
    id: 'vdm-band-pop-bass',
    title: 'Pop Anthem: E-Bass (Pulsierende 8tel Oktaven)',
    category: 'BandPacks',
    vdmFolder: 'band-pop',
    vdmLevel: 'unterstufe',
    instrument: 'bass',
    clef: 'bass',
    timeSignature: '4/4',
    tempoBpm: 120,
    barsCount: 2,
    displayMode: 'both',
    description: 'Ensemble Pop Anthem (120 BPM) - E-Bass: Geradlinige, energiegeladene Achtelnoten auf dem Grundton C3 und A2.',
    tags: ['BandPack', 'Pop in C', 'E-Bass', 'Puls', 'Achtel', 'Ensemble'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: C3 (notiert 8vb = C2 klingend) durchgehende Achtel
      { id: 'bpb1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C3', fret: 3, stringIndex: 2 },
      { id: 'bpb2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'C3', fret: 3, stringIndex: 2 },
      { id: 'bpb3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C3', fret: 3, stringIndex: 2 },
      { id: 'bpb4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'C3', fret: 3, stringIndex: 2 },
      { id: 'bpb5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'C3', fret: 3, stringIndex: 2 },
      { id: 'bpb6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'C3', fret: 3, stringIndex: 2 },
      { id: 'bpb7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'C3', fret: 3, stringIndex: 2 },
      { id: 'bpb8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'C3', fret: 3, stringIndex: 2 },
      // Takt 1: Am (notiert 8vb: A2 = A1 klingend) durchgehende Achtel
      { id: 'bpb9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'A2', fret: 0, stringIndex: 2 },
      { id: 'bpb10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'A2', fret: 0, stringIndex: 2 },
      { id: 'bpb11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'A2', fret: 0, stringIndex: 2 },
      { id: 'bpb12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'A2', fret: 0, stringIndex: 2 },
      { id: 'bpb13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'A2', fret: 0, stringIndex: 2 },
      { id: 'bpb14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'A2', fret: 0, stringIndex: 2 },
      { id: 'bpb15', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'A2', fret: 0, stringIndex: 2 },
      { id: 'bpb16', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'A2', fret: 0, stringIndex: 2 }
    ]
  },
  {
    id: 'vdm-band-pop-keys',
    title: 'Pop Anthem: Keys (Synkopierte Pop-Chords C - Am)',
    category: 'BandPacks',
    vdmFolder: 'band-pop',
    vdmLevel: 'unterstufe',
    instrument: 'piano',
    timeSignature: '4/4',
    tempoBpm: 120,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Ensemble Pop Anthem (120 BPM) - Keys: Radiotauglicher Klavier-Hook mit antizipierten Akkordschlägen auf C-Dur und A-Moll.',
    tags: ['BandPack', 'Pop in C', 'Piano', 'Hook', 'Akkorde', 'Ensemble'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'bpk_c1', barIndex: 0, tickPosition: 0, chordName: 'C' },
      { id: 'bpk_c2', barIndex: 1, tickPosition: 0, chordName: 'Am' }
    ],
    notes: [
      // Takt 0: C-Dur (C4-E4-G4) auf 1 und antizipierte Synkope auf 2+ (mit Achtelpausen)
      { id: 'bpk1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'bpk2', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'bpk3', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'bpk_r1', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'REST' },
      { id: 'bpk4', barIndex: 0, beatFraction: 6, duration: '4', pitch: 'C4' },
      { id: 'bpk5', barIndex: 0, beatFraction: 6, duration: '4', pitch: 'E4' },
      { id: 'bpk6', barIndex: 0, beatFraction: 6, duration: '4', pitch: 'G4' },
      { id: 'bpk_r2', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'REST' },
      { id: 'bpk7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C4' },
      // Takt 1: Am (C4-E4-A4) mit Achtelpausen
      { id: 'bpk8', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'bpk9', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'bpk10', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'A4' },
      { id: 'bpk_r3', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'REST' },
      { id: 'bpk11', barIndex: 1, beatFraction: 6, duration: '4', pitch: 'C4' },
      { id: 'bpk12', barIndex: 1, beatFraction: 6, duration: '4', pitch: 'E4' },
      { id: 'bpk13', barIndex: 1, beatFraction: 6, duration: '4', pitch: 'A4' },
      { id: 'bpk_r4', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'REST' },
      { id: 'bpk14', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'A4' }
    ]
  },

  // =========================================================================
  // ENSEMBLE PACK 3: CHICAGO BLUES SHUFFLE IN A (80 BPM)
  // =========================================================================
  {
    id: 'vdm-band-blues-drums',
    title: 'Blues Shuffle: Drums (Triplet Ride & Backbeat)',
    category: 'BandPacks',
    vdmFolder: 'band-blues',
    vdmLevel: 'unterstufe',
    instrument: 'drums',
    clef: 'percussion',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Ensemble Blues (80 BPM) - Drums: Wiegender Triolen-Shuffle auf dem Becken mit warmem Snare-Backbeat.',
    tags: ['BandPack', 'Blues in A', 'Drums', 'Shuffle', 'Triolen', 'Ensemble'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: Kick 1 & 3, Snare 2 & 4 + Shuffle-Ride (F5)
      { id: 'bbd1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'bbd0_rd0', barIndex: 0, beatFraction: 0, duration: '8', isDotted: true, pitch: 'F5' },
      { id: 'bbd0_rd3', barIndex: 0, beatFraction: 3, duration: '16', pitch: 'F5' },
      { id: 'bbd2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'bbd0_rd4', barIndex: 0, beatFraction: 4, duration: '8', isDotted: true, pitch: 'F5' },
      { id: 'bbd0_rd7', barIndex: 0, beatFraction: 7, duration: '16', pitch: 'F5' },
      { id: 'bbd3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'bbd0_rd8', barIndex: 0, beatFraction: 8, duration: '8', isDotted: true, pitch: 'F5' },
      { id: 'bbd0_rd11', barIndex: 0, beatFraction: 11, duration: '16', pitch: 'F5' },
      { id: 'bbd4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'bbd0_rd12', barIndex: 0, beatFraction: 12, duration: '8', isDotted: true, pitch: 'F5' },
      { id: 'bbd0_rd15', barIndex: 0, beatFraction: 15, duration: '16', pitch: 'F5' },
      // Takt 1
      { id: 'bbd5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'bbd1_rd0', barIndex: 1, beatFraction: 0, duration: '8', isDotted: true, pitch: 'F5' },
      { id: 'bbd1_rd3', barIndex: 1, beatFraction: 3, duration: '16', pitch: 'F5' },
      { id: 'bbd6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'bbd1_rd4', barIndex: 1, beatFraction: 4, duration: '8', isDotted: true, pitch: 'F5' },
      { id: 'bbd1_rd7', barIndex: 1, beatFraction: 7, duration: '16', pitch: 'F5' },
      { id: 'bbd7', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'bbd1_rd8', barIndex: 1, beatFraction: 8, duration: '8', isDotted: true, pitch: 'F5' },
      { id: 'bbd1_rd11', barIndex: 1, beatFraction: 11, duration: '16', pitch: 'F5' },
      { id: 'bbd8', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'bbd1_rd12', barIndex: 1, beatFraction: 12, duration: '8', isDotted: true, pitch: 'F5' },
      { id: 'bbd1_rd15', barIndex: 1, beatFraction: 15, duration: '16', pitch: 'F5' }
    ]
  },
  {
    id: 'vdm-band-blues-bass',
    title: 'Blues Shuffle: E-Bass (Walking Line A7 - D7)',
    category: 'BandPacks',
    vdmFolder: 'band-blues',
    vdmLevel: 'unterstufe',
    instrument: 'bass',
    clef: 'bass',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'both',
    description: 'Ensemble Blues (80 BPM) - E-Bass: Traditionelle Walking-Bass-Linie über die Dur-Terz, Quinte und Sexte (A - C# - E - F#).',
    tags: ['BandPack', 'Blues in A', 'E-Bass', 'Walking Bass', 'Shuffle', 'Ensemble'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: A7 Walking Line (notiert 8vb: A2 - C#3 - E3 - F#3)
      { id: 'bbb1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'A2', fret: 0, stringIndex: 2 },
      { id: 'bbb2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C#3', fret: 4, stringIndex: 2 },
      { id: 'bbb3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'E3', fret: 2, stringIndex: 1 },
      { id: 'bbb4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'F#3', fret: 4, stringIndex: 1 },
      // Takt 1: D7 Walking Line (notiert 8vb: D3 - F#3 - A3 - A2)
      { id: 'bbb5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'D3', fret: 0, stringIndex: 1 },
      { id: 'bbb6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'F#3', fret: 4, stringIndex: 1 },
      { id: 'bbb7', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'A3', fret: 2, stringIndex: 0 },
      { id: 'bbb8', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'A2', fret: 0, stringIndex: 2 }
    ]
  },
  {
    id: 'vdm-band-blues-keys',
    title: 'Blues Shuffle: Keys & Lead (Blues-Scale Licks)',
    category: 'BandPacks',
    vdmFolder: 'band-blues',
    vdmLevel: 'mittelstufe',
    instrument: 'piano',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Ensemble Blues (80 BPM) - Keys: Ausdrucksstarkes Blues-Lick mit Blue-Notes (Eb4) und rollendem Shuffle-Groove.',
    tags: ['BandPack', 'Blues in A', 'Piano', 'Licks', 'Blues Skala', 'Ensemble'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'bbk_a', barIndex: 0, tickPosition: 0, chordName: 'A7' },
      { id: 'bbk_d', barIndex: 1, tickPosition: 0, chordName: 'D7' }
    ],
    notes: [
      // Takt 0: A-Blues Lick (C4 -> C#4 Vorschlag, E4, G4, A4) mit punktierten Achteln
      { id: 'bbk1', barIndex: 0, beatFraction: 0, duration: '8', isDotted: true, pitch: 'A3' },
      { id: 'bbk2', barIndex: 0, beatFraction: 3, duration: '16', pitch: 'C4' },
      { id: 'bbk3', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C#4' },
      { id: 'bbk4', barIndex: 0, beatFraction: 8, duration: '8', isDotted: true, pitch: 'E4' },
      { id: 'bbk5', barIndex: 0, beatFraction: 11, duration: '16', pitch: 'G4' },
      { id: 'bbk6', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'A4' },
      // Takt 1: Blue Note Eb4 nach D4 und Auflösung
      { id: 'bbk7', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'D#4' },
      { id: 'bbk8', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'D4' },
      { id: 'bbk9', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'C4' },
      { id: 'bbk10', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'A3' }
    ]
  }
];
