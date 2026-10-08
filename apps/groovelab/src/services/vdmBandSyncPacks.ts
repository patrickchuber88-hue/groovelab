/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: VdM-Notenschnipsel Band-Sync Packs
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
      // Takt 0: Kick auf 1, Snare auf 2, Kick auf 3+ und 4
      { id: 'bfd1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F4' }, // Kick 1
      { id: 'bfd2', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'G5' }, // Hi-Hat
      { id: 'bfd3', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'G5' },
      { id: 'bfd4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C5' }, // Snare 2
      { id: 'bfd5', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'G5' },
      { id: 'bfd6', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'G5' },
      { id: 'bfd7', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'G5' },
      { id: 'bfd8', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'F4' }, // Kick 3+
      { id: 'bfd9', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5' }, // Snare 4
      { id: 'bfd10', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'G5' },
      // Takt 1: Variation mit Double-Kick
      { id: 'bfd11', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'bfd12', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'G5' },
      { id: 'bfd13', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'bfd14', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'F4' },
      { id: 'bfd15', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'F4' },
      { id: 'bfd16', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C5' }
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
      // Takt 0: D2 Grundton, Oktave D3, C3, A2
      { id: 'bfb1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'D2', fret: 0, stringIndex: 1 },
      { id: 'bfb2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'D3', fret: 7, stringIndex: 0 },
      { id: 'bfb3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C3', fret: 5, stringIndex: 0 },
      { id: 'bfb4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'REST' },
      { id: 'bfb5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'A2', fret: 2, stringIndex: 0 },
      { id: 'bfb6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'C3', fret: 5, stringIndex: 0 },
      { id: 'bfb7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'D2', fret: 0, stringIndex: 1 },
      // Takt 1: Synkopierter Off-Beat Drive
      { id: 'bfb8', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'D2', fret: 0, stringIndex: 1 },
      { id: 'bfb9', barIndex: 1, beatFraction: 3, duration: '8', pitch: 'F2', fret: 3, stringIndex: 1 },
      { id: 'bfb10', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'G2', fret: 5, stringIndex: 1 },
      { id: 'bfb11', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'A2', fret: 2, stringIndex: 0 },
      { id: 'bfb12', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'D2', fret: 0, stringIndex: 1 }
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
      // Takt 0: Dm9 Stabs auf der 2 und 4-und
      { id: 'bfk1', barIndex: 0, beatFraction: 4, duration: '16', pitch: 'F4' },
      { id: 'bfk2', barIndex: 0, beatFraction: 4, duration: '16', pitch: 'A4' },
      { id: 'bfk3', barIndex: 0, beatFraction: 4, duration: '16', pitch: 'C5' },
      { id: 'bfk4', barIndex: 0, beatFraction: 4, duration: '16', pitch: 'E5' },
      { id: 'bfk5', barIndex: 0, beatFraction: 14, duration: '16', pitch: 'F4' },
      { id: 'bfk6', barIndex: 0, beatFraction: 14, duration: '16', pitch: 'A4' },
      { id: 'bfk7', barIndex: 0, beatFraction: 14, duration: '16', pitch: 'C5' },
      // Takt 1: G13 Stabs
      { id: 'bfk8', barIndex: 1, beatFraction: 4, duration: '16', pitch: 'F4' },
      { id: 'bfk9', barIndex: 1, beatFraction: 4, duration: '16', pitch: 'B4' },
      { id: 'bfk10', barIndex: 1, beatFraction: 4, duration: '16', pitch: 'E5' },
      { id: 'bfk11', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'F4' },
      { id: 'bfk12', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'A4' }
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
      { id: 'bpd2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'F4' },
      { id: 'bpd3', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'bpd4', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'bpd5', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'F4' },
      { id: 'bpd6', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5' },
      // Takt 1
      { id: 'bpd7', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'bpd8', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'F4' },
      { id: 'bpd9', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'bpd10', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'bpd11', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'F4' },
      { id: 'bpd12', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C5' }
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
    description: 'Ensemble Pop Anthem (120 BPM) - E-Bass: Geradlinige, energiegeladene Achtelnoten auf dem Grundton C2 und A1.',
    tags: ['BandPack', 'Pop in C', 'E-Bass', 'Puls', 'Achtel', 'Ensemble'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: C2 durchgehende Achtel
      { id: 'bpb1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C2', fret: 3, stringIndex: 2 },
      { id: 'bpb2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'C2', fret: 3, stringIndex: 2 },
      { id: 'bpb3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C2', fret: 3, stringIndex: 2 },
      { id: 'bpb4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'C2', fret: 3, stringIndex: 2 },
      { id: 'bpb5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'C2', fret: 3, stringIndex: 2 },
      { id: 'bpb6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'C2', fret: 3, stringIndex: 2 },
      { id: 'bpb7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'C2', fret: 3, stringIndex: 2 },
      { id: 'bpb8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'C2', fret: 3, stringIndex: 2 },
      // Takt 1: Am (A1) durchgehende Achtel
      { id: 'bpb9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'A1', fret: 0, stringIndex: 2 },
      { id: 'bpb10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'A1', fret: 0, stringIndex: 2 },
      { id: 'bpb11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'A1', fret: 0, stringIndex: 2 },
      { id: 'bpb12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'A1', fret: 0, stringIndex: 2 },
      { id: 'bpb13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'A1', fret: 0, stringIndex: 2 },
      { id: 'bpb14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'A1', fret: 0, stringIndex: 2 },
      { id: 'bpb15', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'A1', fret: 0, stringIndex: 2 },
      { id: 'bpb16', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'A1', fret: 0, stringIndex: 2 }
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
      // Takt 0: C-Dur (C4-E4-G4) auf 1 und antizipierte Synkope auf 2+
      { id: 'bpk1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'bpk2', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'bpk3', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'bpk4', barIndex: 0, beatFraction: 6, duration: '4', pitch: 'C4' },
      { id: 'bpk5', barIndex: 0, beatFraction: 6, duration: '4', pitch: 'E4' },
      { id: 'bpk6', barIndex: 0, beatFraction: 6, duration: '4', pitch: 'G4' },
      { id: 'bpk7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C4' },
      // Takt 1: Am (C4-E4-A4)
      { id: 'bpk8', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'bpk9', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'bpk10', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'A4' },
      { id: 'bpk11', barIndex: 1, beatFraction: 6, duration: '4', pitch: 'C4' },
      { id: 'bpk12', barIndex: 1, beatFraction: 6, duration: '4', pitch: 'E4' },
      { id: 'bpk13', barIndex: 1, beatFraction: 6, duration: '4', pitch: 'A4' },
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
      // Takt 0: Kick 1 & 3, Snare 2 & 4
      { id: 'bbd1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'bbd2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'bbd3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'bbd4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5' },
      // Takt 1
      { id: 'bbd5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'bbd6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'bbd7', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'bbd8', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C5' }
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
      // Takt 0: A7 Walking Line (A1 - C#2 - E2 - F#2)
      { id: 'bbb1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'A1', fret: 0, stringIndex: 2 },
      { id: 'bbb2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C#2', fret: 4, stringIndex: 2 },
      { id: 'bbb3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'E2', fret: 2, stringIndex: 1 },
      { id: 'bbb4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'F#2', fret: 4, stringIndex: 1 },
      // Takt 1: D7 Walking Line (D2 - F#2 - A2 - B2)
      { id: 'bbb5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'D2', fret: 0, stringIndex: 1 },
      { id: 'bbb6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'F#2', fret: 4, stringIndex: 1 },
      { id: 'bbb7', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'A2', fret: 2, stringIndex: 0 },
      { id: 'bbb8', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'A1', fret: 0, stringIndex: 2 }
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
      // Takt 0: A-Blues Lick (C4 -> C#4 Vorschlag, E4, G4, A4)
      { id: 'bbk1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'A3' },
      { id: 'bbk2', barIndex: 0, beatFraction: 3, duration: '8', pitch: 'C4' },
      { id: 'bbk3', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C#4' },
      { id: 'bbk4', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'E4' },
      { id: 'bbk5', barIndex: 0, beatFraction: 11, duration: '8', pitch: 'G4' },
      { id: 'bbk6', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'A4' },
      // Takt 1: Blue Note Eb4 nach D4 und Auflösung
      { id: 'bbk7', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'D#4' },
      { id: 'bbk8', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'D4' },
      { id: 'bbk9', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'C4' },
      { id: 'bbk10', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'A3' }
    ]
  }
];
