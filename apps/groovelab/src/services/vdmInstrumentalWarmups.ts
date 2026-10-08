/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: VdM-Notenschnipsel Instrumental- & Vokal-Warm-ups
 * vdmInstrumentalWarmups.ts
 * 
 * Kanonischer Lehrplan-Katalog für instrumentale & vokalpädagogische Einspielübungen:
 * - Tasten: Daumenuntersatz (1-2-3-1), Alberti-Bass Begleitung
 * - Streicher: Bogeneinteilung auf Leersaiten (Ganzbogen/Frosch/Spitze), 1. Lage Dur/Moll
 * - Bläser: Lippenbindungen & Naturtöne (Quint-Sprünge), Doppelzunge Artikulation
 * - Vokal & Gehörbildung: Stimm-Sirene (Registerausgleich), Belcanto-Arpeggio ("Ma-Me-Mi"),
 *   Zwerchfell-Staccato ("Ha-Ha-Ha"), Relative Solmisation (Do-Re-Mi-Fa-So)
 */

import { MicroScoreSnippet } from '../components/student/meisterwerk/microscore/microScore.types';

export const VDM_INSTRUMENTAL_WARMUPS: MicroScoreSnippet[] = [
  // =========================================================================
  // 1. TASTEN / KLAVIER WARM-UPS
  // =========================================================================
  {
    id: 'vdm-warmup-piano-thumb',
    title: 'Daumenuntersatz C-Dur (1-2-3-1-2-3-4-5)',
    category: 'Technik',
    vdmFolder: 'klavier-daumen',
    vdmLevel: 'unterstufe',
    instrument: 'piano',
    timeSignature: '4/4',
    tempoBpm: 76,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Unterstufe 1: Flüssiger Daumenuntersatz unter Finger 3 (E4 -> F4) für ein nahtloses Legatospiel über die Oktave.',
    tags: ['Klavier', 'Daumenuntersatz', 'Tonleitertechnik', 'Legato', 'Unterstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: Aufwärts mit Daumenuntersatz bei F4 (bf 6)
      { id: 'wpt1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C4' },
      { id: 'wpt2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'D4' },
      { id: 'wpt3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'E4' },
      { id: 'wpt4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'F4' }, // Daumen!
      { id: 'wpt5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'G4' },
      { id: 'wpt6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'A4' },
      { id: 'wpt7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'B4' },
      { id: 'wpt8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'C5' },
      // Takt 1: Abwärts mit Mittelfinger-Übersatz über den Daumen (G4 -> E4)
      { id: 'wpt9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'B4' },
      { id: 'wpt10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'A4' },
      { id: 'wpt11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'G4' },
      { id: 'wpt12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'F4' },
      { id: 'wpt13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'E4' }, // Übersatz Finger 3!
      { id: 'wpt14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'D4' },
      { id: 'wpt15', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C4' }
    ]
  },
  {
    id: 'vdm-warmup-piano-alberti',
    title: 'Alberti-Bass Begleitfigur (C-E-G-E)',
    category: 'Technik',
    vdmFolder: 'klavier-alberti',
    vdmLevel: 'unterstufe',
    instrument: 'piano',
    clef: 'bass',
    timeSignature: '4/4',
    tempoBpm: 88,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Unterstufe 2: Klassische Begleitfigur (Tief-Hoch-Mittel-Hoch) zur Entlastung der linken Hand in C-Dur und G7.',
    tags: ['Klavier', 'Alberti-Bass', 'Klassik', 'Begleitung', 'Linke Hand'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'wpa_c', barIndex: 0, tickPosition: 0, chordName: 'C' },
      { id: 'wpa_g', barIndex: 1, tickPosition: 0, chordName: 'G7' }
    ],
    notes: [
      // Takt 0: C-Dur Alberti-Bass (C3 - G3 - E3 - G3)
      { id: 'wpa1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C3' },
      { id: 'wpa2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'G3' },
      { id: 'wpa3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'E3' },
      { id: 'wpa4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'G3' },
      { id: 'wpa5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'C3' },
      { id: 'wpa6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'G3' },
      { id: 'wpa7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'E3' },
      { id: 'wpa8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'G3' },
      // Takt 1: G7 Alberti-Bass (B2 - G3 - D3 - G3)
      { id: 'wpa9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'B2' },
      { id: 'wpa10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'G3' },
      { id: 'wpa11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'D3' },
      { id: 'wpa12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'G3' },
      { id: 'wpa13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'B2' },
      { id: 'wpa14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'G3' },
      { id: 'wpa15', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C3' }
    ]
  },

  // =========================================================================
  // 2. STREICHER WARM-UPS
  // =========================================================================
  {
    id: 'vdm-warmup-strings-open-bow',
    title: 'Streicher: Bogeneinteilung auf Leersaiten',
    category: 'Technik',
    vdmFolder: 'streicher-bogen',
    vdmLevel: 'elementar',
    instrument: 'strings',
    timeSignature: '4/4',
    tempoBpm: 60,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Grundstufe: Gleichmäßiger Strich von Frosch bis Spitze auf D- und A-Saite (Abstrich / Aufstrich).',
    tags: ['Streicher', 'Violine', 'Bogeneinteilung', 'Leersaiten', 'Grundstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: D-Saite Ganzbogen Halbe
      { id: 'wso1', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'D4' },
      { id: 'wso2', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'D4' },
      // Takt 1: A-Saite Ganzbogen Halbe
      { id: 'wso3', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'A4' },
      { id: 'wso4', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'A4' }
    ]
  },
  {
    id: 'vdm-warmup-strings-finger-pattern',
    title: 'Streicher: 1. Lage Dur/Moll-Griffmuster',
    category: 'Technik',
    vdmFolder: 'streicher-lagen',
    vdmLevel: 'unterstufe',
    instrument: 'strings',
    timeSignature: '4/4',
    tempoBpm: 75,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Unterstufe 1: Enger Halbtonschritt zwischen 2. und 3. Finger (Dur) auf der D-Saite.',
    tags: ['Streicher', 'Violine', 'Intonation', '1. Lage', 'Griffmuster'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: Aufwärts D4, E4, F#4 (hoch), G4 (eng am 2. Finger)
      { id: 'wsf1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'D4' },
      { id: 'wsf2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'wsf3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'F#4' },
      { id: 'wsf4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'G4' },
      // Takt 1: A-Saite und Rückkehr
      { id: 'wsf5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'A4' },
      { id: 'wsf6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G4' },
      { id: 'wsf7', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'F#4' },
      { id: 'wsf8', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'D4' }
    ]
  },

  // =========================================================================
  // 3. BLÄSER WARM-UPS
  // =========================================================================
  {
    id: 'vdm-warmup-winds-lip-flexibility',
    title: 'Bläser: Lippenbindungen & Naturtöne',
    category: 'Technik',
    vdmFolder: 'blaeser-flexibility',
    vdmLevel: 'unterstufe',
    instrument: 'trumpet',
    timeSignature: '4/4',
    tempoBpm: 70,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Unterstufe: Reine Luft- und Ansatzkontrolle ohne Ventilveränderung (C4 -> G4 -> C5 und zurück).',
    tags: ['Bläser', 'Trompete', 'Blechbläser', 'Lippenbindung', 'Ansatz'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: C4 bis C5 legato
      { id: 'wwl1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'wwl2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'G4' },
      { id: 'wwl3', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'C5' },
      // Takt 1: Zurück zum Grundton
      { id: 'wwl4', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'wwl5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'wwl6', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'C4' }
    ]
  },
  {
    id: 'vdm-warmup-winds-double-tongue',
    title: 'Bläser: Doppelzunge Artikulation (T-K-T-K)',
    category: 'Technik',
    vdmFolder: 'blaeser-flexibility',
    vdmLevel: 'mittelstufe',
    instrument: 'flute',
    timeSignature: '4/4',
    tempoBpm: 100,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Mittelstufe: Schnelle Sechzehntel-Artikulation durch Wechsel zwischen Zungenspitze (Ta) und Gaumen (Ka).',
    tags: ['Bläser', 'Querflöte', 'Doppelzunge', 'Artikulation', 'Mittelstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: T-K-T-K auf G4
      { id: 'wwd1', barIndex: 0, beatFraction: 0, duration: '16', pitch: 'G4' },
      { id: 'wwd2', barIndex: 0, beatFraction: 1, duration: '16', pitch: 'G4' },
      { id: 'wwd3', barIndex: 0, beatFraction: 2, duration: '16', pitch: 'G4' },
      { id: 'wwd4', barIndex: 0, beatFraction: 3, duration: '16', pitch: 'G4' },
      { id: 'wwd5', barIndex: 0, beatFraction: 4, duration: '16', pitch: 'G4' },
      { id: 'wwd6', barIndex: 0, beatFraction: 5, duration: '16', pitch: 'G4' },
      { id: 'wwd7', barIndex: 0, beatFraction: 6, duration: '16', pitch: 'G4' },
      { id: 'wwd8', barIndex: 0, beatFraction: 7, duration: '16', pitch: 'G4' },
      { id: 'wwd9', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'G4' },
      { id: 'wwd10', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'REST' },
      // Takt 1: Auf A4 und Auflösung
      { id: 'wwd11', barIndex: 1, beatFraction: 0, duration: '16', pitch: 'A4' },
      { id: 'wwd12', barIndex: 1, beatFraction: 1, duration: '16', pitch: 'A4' },
      { id: 'wwd13', barIndex: 1, beatFraction: 2, duration: '16', pitch: 'A4' },
      { id: 'wwd14', barIndex: 1, beatFraction: 3, duration: '16', pitch: 'A4' },
      { id: 'wwd15', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'B4' },
      { id: 'wwd16', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'C5' }
    ]
  },

  // =========================================================================
  // 4. VOKAL & GEHÖRBILDUNG WARM-UPS
  // =========================================================================
  {
    id: 'vdm-warmup-vocal-sirene',
    title: 'Vokal-Sirene: Registerausgleich (Brust zu Kopf)',
    category: 'Vokal',
    vdmFolder: 'vokal-sirene',
    vdmLevel: 'elementar',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 60,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Gesang Grundstufe: Sanftes Glissando auf "U" oder "Ng" über die Passaggio-Bruchkante ohne Kehlkopfdruck.',
    tags: ['Gesang', 'Vokal', 'Sirene', 'Einsingen', 'Register'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'vvs1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'vvs2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'vvs3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'G4' },
      { id: 'vvs4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'vvs5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'vvs6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'vvs7', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'C4' }
    ]
  },
  {
    id: 'vdm-warmup-vocal-arpeggio-mame',
    title: 'Belcanto Dreiklangs-Arpeggio ("Ma-Me-Mi")',
    category: 'Vokal',
    vdmFolder: 'vokal-arpeggio',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Gesang Unterstufe: Vokalmodulation auf Dreiklangstönen (C-E-G-C5-G-E-C) für resonanzreichen Vordersitz.',
    tags: ['Gesang', 'Belcanto', 'Vokale', 'Dreiklang', 'Legato'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'vva1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C4' },
      { id: 'vva2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'E4' },
      { id: 'vva3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'G4' },
      { id: 'vva4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'C5' },
      { id: 'vva5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'G4' },
      { id: 'vva6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'E4' },
      { id: 'vva7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C4' },
      { id: 'vva8', barIndex: 1, beatFraction: 0, duration: '1', pitch: 'C4' }
    ]
  },
  {
    id: 'vdm-warmup-vocal-staccato-haha',
    title: 'Zwerchfell-Staccato ("Ha-Ha-Ha" Impulse)',
    category: 'Vokal',
    vdmFolder: 'vokal-staccato',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 92,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Gesang: Kurze, elastische Zwerchfell-Aktivierung auf den Silben "Ha" für präzisen Toneinsatz.',
    tags: ['Gesang', 'Staccato', 'Zwerchfell', 'Stütze', 'Atemtechnik'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'vvs_h1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C4' },
      { id: 'vvs_h2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'C4' },
      { id: 'vvs_h3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C4' },
      { id: 'vvs_h4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'REST' },
      { id: 'vvs_h5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'E4' },
      { id: 'vvs_h6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'E4' },
      { id: 'vvs_h7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'E4' },
      { id: 'vvs_h8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'REST' },
      { id: 'vvs_h9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'G4' },
      { id: 'vvs_h10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'G4' },
      { id: 'vvs_h11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'G4' },
      { id: 'vvs_h12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'REST' },
      { id: 'vvs_h13', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'C4' }
    ]
  },
  {
    id: 'vdm-warmup-vocal-solmisation',
    title: 'Relative Solmisation (Do-Re-Mi-Fa-So)',
    category: 'Vokal',
    vdmFolder: 'vokal-solmisation',
    vdmLevel: 'elementar',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 75,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Grundstufe & Gehörbildung: Kodály-Silben (Do, Re, Mi, Fa, So) zur Schulung des tonalen Vorstellungsvermögens.',
    tags: ['Solmisation', 'Gehörbildung', 'Kodaly', 'Do-Re-Mi', 'Intonation'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'sol1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4' }, // Do
      { id: 'sol2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'D4' }, // Re
      { id: 'sol3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'E4' }, // Mi
      { id: 'sol4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'F4' }, // Fa
      { id: 'sol5', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'G4' }, // So
      { id: 'sol6', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'E4' }, // Mi
      { id: 'sol7', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C4' }  // Do
    ]
  }
];
