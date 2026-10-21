/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: VdM Masterpiece Curriculum Expansion
 * vdmMasterpieceCurriculumExpansion.ts
 * 
 * Schließt autoritativ alle 18 curricularen Lücken zur vollständigen VdM-Zertifizierung:
 * - Klarinette (B♭): Lückenlose 4-Stufen-Progression (Erste Töne, Chalumeau, Überblasen, Mozart KV 622)
 * - Gesang / Vokal (C): 4-Stufen-Progression (Kuckucksruf, Belcanto Vokalise, Soul Pentatonik, Jazz Scat)
 * - Gitarre: Elementarstufe (Saitenreiter Leersaiten) & Oberstufe (Spanische Romanze / Jeux Interdits)
 * - Klavier: Oberstufe (J.S. Bach Präludium C-Dur BWV 846)
 * - Ukulele: Mittelstufe (Folk Fingerpicking) & Oberstufe (Campanella Solo & Rasgueado)
 * - Querflöte: Elementarstufe (Der Schmetterlingsflug H-A-G)
 * - Altsaxophon: Elementarstufe (Der Sax-Ruf H-A-G)
 * - Posaune: Elementarstufe (1. & 3. Zugposition)
 * - Blockflöte: Mittelstufe (F-Dur Gabelgriff & Intonation)
 * 
 * Monolith Ceiling Axiom: Autarker Satellit (< 700 Zeilen)
 */

import { MicroScoreSnippet } from '../components/student/meisterwerk/microscore/microScore.types';

export const VDM_MASTERPIECE_CURRICULUM_EXPANSION: MicroScoreSnippet[] = [
  // =========================================================================
  // 1. KLARINETTE (B♭) — 4-STUFEN VOLL-PROGRESSION
  // =========================================================================
  {
    id: 'vdm-cl-first-notes',
    title: 'Klarinette Einstieg: Die ersten 3 Töne (E4 - D4 - C4)',
    category: 'Technik',
    vdmFolder: 'blaeser-longtones',
    vdmLevel: 'elementar',
    instrument: 'clarinet',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 76,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Grundstufe Klarinette: Die ersten Greiffinger der linken Hand. Ruhiger, gleichmäßiger Blasdruck mit warmem Tonansatz.',
    tags: ['Klarinette', 'Holzbläser', 'Erste Töne', 'Ansatz', 'Grundstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'cl_fn1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'cl_fn2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'D4' },
      { id: 'cl_fn3', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'C4' },
      { id: 'cl_fn4', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'D4' },
      { id: 'cl_fn5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'cl_fn6', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'C4' }
    ]
  },
  {
    id: 'vdm-cl-chalumeau-register',
    title: 'Klarinette Unterstufe: Das warme Chalumeau-Register (E3 - G4)',
    category: 'Tonleitern',
    vdmFolder: 'dur',
    vdmLevel: 'unterstufe',
    instrument: 'clarinet',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 88,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Unterstufe Klarinette: Das sonore Tiefregister (Chalumeau). Fließender 8tel-Lauf über alle Tonlöcher beider Hände.',
    tags: ['Klarinette', 'Chalumeau', 'Tiefregister', 'Unterstufe', 'Geläufigkeit'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'cl_ch1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'E3' },
      { id: 'cl_ch2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'G3' },
      { id: 'cl_ch3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'A3' },
      { id: 'cl_ch4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'B3' },
      { id: 'cl_ch5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'C4' },
      { id: 'cl_ch6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'D4' },
      { id: 'cl_ch7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'E4' },
      { id: 'cl_ch8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'G4' },
      { id: 'cl_ch9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'E4' },
      { id: 'cl_ch10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'D4' },
      { id: 'cl_ch11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'C4' },
      { id: 'cl_ch12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'B3' },
      { id: 'cl_ch13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'A3' },
      { id: 'cl_ch14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'G3' },
      { id: 'cl_ch15', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'E3' }
    ]
  },
  {
    id: 'vdm-cl-register-shift',
    title: 'Klarinette Mittelstufe: Der Registerwechsel (A4 -> H4)',
    category: 'Technik',
    vdmFolder: 'blaeser-flexibility',
    vdmLevel: 'mittelstufe',
    instrument: 'clarinet',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 92,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Mittelstufe Klarinette: Die Duodezim-Hürde. Sauberer Übergang von A4 (Halslage) nach H4 (Clarino-Register mit Überblasklappe) ohne Unterbrechung.',
    tags: ['Klarinette', 'Registerwechsel', 'Clarino', 'Überblasklappe', 'Mittelstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'cl_rs1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'cl_rs2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'A4' },
      { id: 'cl_rs3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'B4' },
      { id: 'cl_rs4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'cl_rs5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'D5' },
      { id: 'cl_rs6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'B4' },
      { id: 'cl_rs7', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'A4' },
      { id: 'cl_rs8', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'G4' }
    ]
  },
  {
    id: 'vdm-cl-mozart-concerto',
    title: 'Klarinette Oberstufe: W.A. Mozart Klarinettenkonzert KV 622 (Adagio)',
    category: 'Melodien',
    vdmFolder: 'klassik',
    vdmLevel: 'oberstufe',
    instrument: 'clarinet',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 66,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Oberstufe: Das weltberühmte Adagio-Hauptthema aus Mozarts Klarinettenkonzert KV 622. Höchste Kantabilität, Phrasierungskunst und edle Dynamik.',
    tags: ['Klarinette', 'Mozart', 'KV 622', 'Adagio', 'Meisterwerk', 'Oberstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'cl_mz1', barIndex: 0, beatFraction: 0, duration: '4', isDotted: true, pitch: 'E4' },
      { id: 'cl_mz2', barIndex: 0, beatFraction: 6, duration: '16', pitch: 'F4' },
      { id: 'cl_mz3', barIndex: 0, beatFraction: 7, duration: '16', pitch: 'G4' },
      { id: 'cl_mz4', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'C4' },
      { id: 'cl_mz5', barIndex: 1, beatFraction: 0, duration: '4', isDotted: true, pitch: 'D4' },
      { id: 'cl_mz6', barIndex: 1, beatFraction: 6, duration: '16', pitch: 'E4' },
      { id: 'cl_mz7', barIndex: 1, beatFraction: 7, duration: '16', pitch: 'F4' },
      { id: 'cl_mz8', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'E4' },
      { id: 'cl_mz9', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'D4' }
    ]
  },

  // =========================================================================
  // 2. GESANG / VOKAL (C) — 4-STUFEN VOLL-PROGRESSION
  // =========================================================================
  {
    id: 'vdm-voc-cuckoo-call',
    title: 'Vokal Grundstufe: Kuckucksruf & Terzensprung (G4 - E4)',
    category: 'Vokal',
    vdmFolder: 'stimmbildung',
    vdmLevel: 'elementar',
    instrument: 'vocals',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Grundstufe Gesang: Der natürliche Rufterz-Reflex (Kuckucksruf). Schulung von Bauchatmung, Kehlkopffreiheit und sauberer Vokalbildung auf "Lu-Lu".',
    tags: ['Gesang', 'Vokal', 'Stimmbildung', 'Kuckucksruf', 'Terz', 'Grundstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'voc_ck1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'voc_ck2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'voc_ck3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'REST' },
      { id: 'voc_ck4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'G4' },
      { id: 'voc_ck5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'voc_ck6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'REST' },
      { id: 'voc_ck7', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'G4' },
      { id: 'voc_ck8', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'E4' }
    ]
  },
  {
    id: 'vdm-voc-belcanto-triad',
    title: 'Vokal Unterstufe: Belcanto-Dreiklang & Vokalausgleich (A-E-I-O-U)',
    category: 'Vokal',
    vdmFolder: 'stimmbildung',
    vdmLevel: 'unterstufe',
    instrument: 'vocals',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 84,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Unterstufe: Klassische Belcanto-Vokalise über den Dur-Dreiklang (C4-E4-G4-E4-C4). Gleichmäßiger Vokalsitz und schlanker Tonansatz.',
    tags: ['Gesang', 'Belcanto', 'Dreiklang', 'Vokalausgleich', 'Unterstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'voc_bc1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C4' },
      { id: 'voc_bc2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'E4' },
      { id: 'voc_bc3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'G4' },
      { id: 'voc_bc4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'E4' },
      { id: 'voc_bc5', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'C4' },
      { id: 'voc_bc6', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'D4' },
      { id: 'voc_bc7', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'F4' },
      { id: 'voc_bc8', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'A4' },
      { id: 'voc_bc9', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'F4' },
      { id: 'voc_bc10', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'D4' }
    ]
  },
  {
    id: 'vdm-voc-soul-pentatonic',
    title: 'Vokal Mittelstufe: Soul/Pop Melisma-Run (D-Moll Pentatonik)',
    category: 'Vokal',
    vdmFolder: 'stimmbildung',
    vdmLevel: 'mittelstufe',
    instrument: 'vocals',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 90,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Mittelstufe: Moderner Pop- und Soul-Verzierungs-Lauf (Melisma/Riff). Weicher Registerwechsel zwischen Brust- und Kopfstimme mit Vibrato.',
    tags: ['Gesang', 'Soul', 'Pop', 'Melisma', 'Pentatonik', 'Mittelstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'voc_sl1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'D4' },
      { id: 'voc_sl2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'F4' },
      { id: 'voc_sl3', barIndex: 0, beatFraction: 4, duration: '8', isDotted: true, pitch: 'G4' },
      { id: 'voc_sl4', barIndex: 0, beatFraction: 7, duration: '16', pitch: 'A4' },
      { id: 'voc_sl5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'C5' },
      { id: 'voc_sl6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'D5' },
      { id: 'voc_sl7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'A4' },
      { id: 'voc_sl8', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'G4' },
      { id: 'voc_sl9', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'F4' },
      { id: 'voc_sl10', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'D4' },
      { id: 'voc_sl11', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'C4' },
      { id: 'voc_sl12', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'D4' }
    ]
  },
  {
    id: 'vdm-voc-jazz-scat',
    title: 'Vokal Oberstufe: Jazz Scat Phrasing & Blue Notes',
    category: 'Vokal',
    vdmFolder: 'stimmbildung',
    vdmLevel: 'oberstufe',
    instrument: 'vocals',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 124,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Oberstufe: Virtuoses Scat-Gesangsthema (Doo-Bah-Doo-Wee) mit Blue Notes (Eb4, Gb4), synkopierter Phrasierung und Swing-Artikulation.',
    tags: ['Gesang', 'Jazz', 'Scat', 'Blue Notes', 'Swing', 'Oberstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'voc_sc1', barIndex: 0, beatFraction: 0, duration: '8', isDotted: true, pitch: 'C4' },
      { id: 'voc_sc2', barIndex: 0, beatFraction: 3, duration: '16', pitch: 'Eb4' },
      { id: 'voc_sc3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'E4' },
      { id: 'voc_sc4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'G4' },
      { id: 'voc_sc5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'Bb4' },
      { id: 'voc_sc6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'B4' },
      { id: 'voc_sc7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'voc_sc8', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'G4' },
      { id: 'voc_sc9', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'F#4' },
      { id: 'voc_sc10', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'F4' },
      { id: 'voc_sc11', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'D4' },
      { id: 'voc_sc12', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'C4' }
    ]
  },

  // =========================================================================
  // 3. GITARRE — ELEMENTAR & OBERSTUFE
  // =========================================================================
  {
    id: 'vdm-git-open-strings-riders',
    title: 'Konzertgitarre Grundstufe: Die Saitenreiter (E5 - H4 - G4)',
    category: 'Zupfinstrumente',
    vdmFolder: 'gitarre-openchords',
    vdmLevel: 'elementar',
    instrument: 'guitar',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'both',
    description: 'Grundstufe Gitarre: Das Entdecken der leeren Diskantsaiten (e, h, g). Gleichmäßiger Daumen- und Wechselschlag (Apoyando) ohne Verkrampfung.',
    tags: ['Gitarre', 'Grundstufe', 'Leersaiten', 'Diskant', 'Wechselschlag'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'gt_sr1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E5', fret: 0, stringIndex: 0 },
      { id: 'gt_sr2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'B4', fret: 0, stringIndex: 1 },
      { id: 'gt_sr3', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'G4', fret: 0, stringIndex: 2 },
      { id: 'gt_sr4', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'B4', fret: 0, stringIndex: 1 },
      { id: 'gt_sr5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'E5', fret: 0, stringIndex: 0 },
      { id: 'gt_sr6', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'B4', fret: 0, stringIndex: 1 },
      { id: 'gt_sr7', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'G4', fret: 0, stringIndex: 2 }
    ]
  },
  {
    id: 'vdm-git-romance-jeux-interdits',
    title: 'Klassische Gitarre Oberstufe: Spanische Romanze (Jeux Interdits)',
    category: 'Zupfinstrumente',
    vdmFolder: 'gitarre-openchords',
    vdmLevel: 'oberstufe',
    instrument: 'guitar',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 84,
    barsCount: 2,
    displayMode: 'both',
    description: 'Oberstufe: Die weltberühmte "Romanza Anonima" in E-Moll. Durchgehendes P-I-M-A Arpeggio mit getragener Kantilene auf der hohen e-Saite.',
    tags: ['Gitarre', 'Spanische Romanze', 'Jeux Interdits', 'Arpeggio', 'Klassik', 'Oberstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'rom_em', barIndex: 0, tickPosition: 0, chordName: 'Em' },
      { id: 'rom_em2', barIndex: 1, tickPosition: 0, chordName: 'Em' }
    ],
    notes: [
      // Takt 0: Bass E3 + Melodie E5 -> H4 -> G4
      { id: 'rm0_b', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E3', fret: 0, stringIndex: 5 },
      { id: 'rm0_1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'E5', fret: 0, stringIndex: 0 },
      { id: 'rm0_2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'B4', fret: 0, stringIndex: 1 },
      { id: 'rm0_3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'G4', fret: 0, stringIndex: 2 },
      { id: 'rm0_4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'E5', fret: 0, stringIndex: 0 },
      { id: 'rm0_5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'E5', fret: 0, stringIndex: 0 },
      { id: 'rm0_6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'G4', fret: 0, stringIndex: 2 },
      { id: 'rm0_7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'F#5', fret: 2, stringIndex: 0 },
      { id: 'rm0_8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'E5', fret: 0, stringIndex: 0 },
      // Takt 1: G5 -> H4 -> G4
      { id: 'rm1_b', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'E3', fret: 0, stringIndex: 5 },
      { id: 'rm1_1', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'G5', fret: 3, stringIndex: 0 },
      { id: 'rm1_2', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'B4', fret: 0, stringIndex: 1 },
      { id: 'rm1_3', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'G4', fret: 0, stringIndex: 2 },
      { id: 'rm1_4', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'G5', fret: 3, stringIndex: 0 },
      { id: 'rm1_5', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'F#5', fret: 2, stringIndex: 0 },
      { id: 'rm1_6', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'B4', fret: 0, stringIndex: 1 },
      { id: 'rm1_7', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'E5', fret: 0, stringIndex: 0 }
    ]
  },

  // =========================================================================
  // 4. KLAVIER — OBERSTUFE (J.S. BACH)
  // =========================================================================
  {
    id: 'vdm-pno-bach-prelude-c',
    title: 'Klavier Oberstufe: J.S. Bach Präludium C-Dur BWV 846',
    category: 'Melodien',
    vdmFolder: 'klassik',
    vdmLevel: 'oberstufe',
    instrument: 'piano',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 88,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Oberstufe Klavier: Das Eröffnungsstück des Wohltemperierten Klaviers I. Vollendete Zweihand-Harmoniearchitektur in 16tel-Kaskaden.',
    tags: ['Klavier', 'Bach', 'Präludium', 'BWV 846', 'Arpeggio', 'Oberstufe', 'Meisterwerk'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'bch_c', barIndex: 0, tickPosition: 0, chordName: 'C' },
      { id: 'bch_dm', barIndex: 1, tickPosition: 0, chordName: 'Dm7' }
    ],
    notes: [
      // Takt 0: C-Dur Arpeggio (C4-E4-G4-C5-E5 zweimal)
      { id: 'bp0_1', barIndex: 0, beatFraction: 0, duration: '16', pitch: 'C4' },
      { id: 'bp0_2', barIndex: 0, beatFraction: 1, duration: '16', pitch: 'E4' },
      { id: 'bp0_3', barIndex: 0, beatFraction: 2, duration: '16', pitch: 'G4' },
      { id: 'bp0_4', barIndex: 0, beatFraction: 3, duration: '16', pitch: 'C5' },
      { id: 'bp0_5', barIndex: 0, beatFraction: 4, duration: '16', pitch: 'E5' },
      { id: 'bp0_6', barIndex: 0, beatFraction: 5, duration: '16', pitch: 'G4' },
      { id: 'bp0_7', barIndex: 0, beatFraction: 6, duration: '16', pitch: 'C5' },
      { id: 'bp0_8', barIndex: 0, beatFraction: 7, duration: '16', pitch: 'E5' },
      { id: 'bp0_9', barIndex: 0, beatFraction: 8, duration: '16', pitch: 'C4' },
      { id: 'bp0_10', barIndex: 0, beatFraction: 9, duration: '16', pitch: 'E4' },
      { id: 'bp0_11', barIndex: 0, beatFraction: 10, duration: '16', pitch: 'G4' },
      { id: 'bp0_12', barIndex: 0, beatFraction: 11, duration: '16', pitch: 'C5' },
      { id: 'bp0_13', barIndex: 0, beatFraction: 12, duration: '16', pitch: 'E5' },
      { id: 'bp0_14', barIndex: 0, beatFraction: 13, duration: '16', pitch: 'G4' },
      { id: 'bp0_15', barIndex: 0, beatFraction: 14, duration: '16', pitch: 'C5' },
      { id: 'bp0_16', barIndex: 0, beatFraction: 15, duration: '16', pitch: 'E5' },
      // Takt 1: Dm7 Arpeggio (C4-D4-A4-D5-F5 zweimal)
      { id: 'bp1_1', barIndex: 1, beatFraction: 0, duration: '16', pitch: 'C4' },
      { id: 'bp1_2', barIndex: 1, beatFraction: 1, duration: '16', pitch: 'D4' },
      { id: 'bp1_3', barIndex: 1, beatFraction: 2, duration: '16', pitch: 'A4' },
      { id: 'bp1_4', barIndex: 1, beatFraction: 3, duration: '16', pitch: 'D5' },
      { id: 'bp1_5', barIndex: 1, beatFraction: 4, duration: '16', pitch: 'F5' },
      { id: 'bp1_6', barIndex: 1, beatFraction: 5, duration: '16', pitch: 'A4' },
      { id: 'bp1_7', barIndex: 1, beatFraction: 6, duration: '16', pitch: 'D5' },
      { id: 'bp1_8', barIndex: 1, beatFraction: 7, duration: '16', pitch: 'F5' },
      { id: 'bp1_9', barIndex: 1, beatFraction: 8, duration: '16', pitch: 'C4' },
      { id: 'bp1_10', barIndex: 1, beatFraction: 9, duration: '16', pitch: 'D4' },
      { id: 'bp1_11', barIndex: 1, beatFraction: 10, duration: '16', pitch: 'A4' },
      { id: 'bp1_12', barIndex: 1, beatFraction: 11, duration: '16', pitch: 'D5' },
      { id: 'bp1_13', barIndex: 1, beatFraction: 12, duration: '16', pitch: 'F5' },
      { id: 'bp1_14', barIndex: 1, beatFraction: 13, duration: '16', pitch: 'A4' },
      { id: 'bp1_15', barIndex: 1, beatFraction: 14, duration: '16', pitch: 'D5' },
      { id: 'bp1_16', barIndex: 1, beatFraction: 15, duration: '16', pitch: 'F5' }
    ]
  },

  // =========================================================================
  // 5. UKULELE — MITTELSTUFE & OBERSTUFE
  // =========================================================================
  {
    id: 'vdm-uke-folk-fingerpicking',
    title: 'Ukulele Mittelstufe: Folk Fingerpicking Ballade (C - Am)',
    category: 'Zupfinstrumente',
    vdmFolder: 'ukulele-basics',
    vdmLevel: 'mittelstufe',
    instrument: 'ukulele',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 84,
    barsCount: 2,
    displayMode: 'both',
    description: 'Mittelstufe: Klassisches 4-Saiten Fingerpicking (P-I-M-A). Flüssiger Akkordwechsel zwischen C-Dur und A-Moll mit gezupften Einzelsaiten.',
    tags: ['Ukulele', 'Fingerpicking', 'Folk', 'Ballade', 'Mittelstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'ufp_c', barIndex: 0, tickPosition: 0, chordName: 'C' },
      { id: 'ufp_am', barIndex: 1, tickPosition: 0, chordName: 'Am' }
    ],
    notes: [
      // Takt 0: C-Dur Zupfmuster (G4 -> C4 -> E4 -> C5)
      { id: 'uf0_1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'G4', fret: 0, stringIndex: 3 },
      { id: 'uf0_2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'uf0_3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'uf0_4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'C5', fret: 3, stringIndex: 0 },
      { id: 'uf0_5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'G4', fret: 0, stringIndex: 3 },
      { id: 'uf0_6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'uf0_7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'uf0_8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'C5', fret: 3, stringIndex: 0 },
      // Takt 1: Am Zupfmuster (A4 -> C4 -> E4 -> A4)
      { id: 'uf1_1', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'A4', fret: 2, stringIndex: 3 },
      { id: 'uf1_2', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'uf1_3', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'uf1_4', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'A4', fret: 0, stringIndex: 0 },
      { id: 'uf1_5', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'A4', fret: 2, stringIndex: 3 },
      { id: 'uf1_6', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'uf1_7', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'uf1_8', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'A4', fret: 0, stringIndex: 0 }
    ]
  },
  {
    id: 'vdm-uke-campanella-solo',
    title: 'Ukulele Oberstufe: Campanella Solo & Glöckchen-Lauf',
    category: 'Zupfinstrumente',
    vdmFolder: 'ukulele-basics',
    vdmLevel: 'oberstufe',
    instrument: 'ukulele',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 108,
    barsCount: 2,
    displayMode: 'both',
    description: 'Oberstufe: Virtuose Campanella-Technik. Nutzung der Re-Entrant High-G-Saite für ineinanderklingende Tonleiterstufen wie Glockenklang.',
    tags: ['Ukulele', 'Campanella', 'Virtuos', 'High-G', 'Oberstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'uc0_1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'G4', fret: 0, stringIndex: 3 },
      { id: 'uc0_2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'uc0_3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'uc0_4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'A4', fret: 0, stringIndex: 0 },
      { id: 'uc0_5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'C5', fret: 3, stringIndex: 0 },
      { id: 'uc0_6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'uc0_7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'G4', fret: 0, stringIndex: 3 },
      { id: 'uc1_1', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'A4', fret: 2, stringIndex: 3 },
      { id: 'uc1_2', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'C4', fret: 0, stringIndex: 2 },
      { id: 'uc1_3', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'uc1_4', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'A4', fret: 0, stringIndex: 0 },
      { id: 'uc1_5', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'C5', fret: 3, stringIndex: 0 },
      { id: 'uc1_6', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'E4', fret: 0, stringIndex: 1 },
      { id: 'uc1_7', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C4', fret: 0, stringIndex: 2 }
    ]
  },

  // =========================================================================
  // 6. QUERFLÖTE — ELEMENTARSTUFE
  // =========================================================================
  {
    id: 'vdm-flt-tone-first-flight',
    title: 'Querflöte Grundstufe: Der Schmetterlingsflug (H4 - A4 - G4)',
    category: 'Technik',
    vdmFolder: 'blaeser-longtones',
    vdmLevel: 'elementar',
    instrument: 'flute',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 76,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Grundstufe Querflöte: Die ersten 3 Töne mit der linken Hand. Sauberer Mundloch-Ansatz, stabiler Luftstrom ohne Rauschen.',
    tags: ['Querflöte', 'Grundstufe', 'Ansatz', 'Erste Töne', 'Luftstrom'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'fl_ff1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'B4' },
      { id: 'fl_ff2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'A4' },
      { id: 'fl_ff3', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'G4' },
      { id: 'fl_ff4', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'A4' },
      { id: 'fl_ff5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'B4' },
      { id: 'fl_ff6', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'A4' },
      { id: 'fl_ff7', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'G4' }
    ]
  },

  // =========================================================================
  // 7. ALTSAXOPHON — ELEMENTARSTUFE
  // =========================================================================
  {
    id: 'vdm-sax-first-call',
    title: 'Altsaxophon Grundstufe: Der Sax-Ruf (H4 - A4 - G4)',
    category: 'Technik',
    vdmFolder: 'blaeser-longtones',
    vdmLevel: 'elementar',
    instrument: 'altosax',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Grundstufe Altsaxophon: Erste Töne mit der linken Hand. Entspannter Ansatz, voller warmer Ton und weicher Zungenstoß.',
    tags: ['Altsaxophon', 'Grundstufe', 'Ansatz', 'Zungenstoß', 'Sax-Ruf'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'sx_fc1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'B4' },
      { id: 'sx_fc2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'A4' },
      { id: 'sx_fc3', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'G4' },
      { id: 'sx_fc4', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'B4' },
      { id: 'sx_fc5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'B4' },
      { id: 'sx_fc6', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'A4' },
      { id: 'sx_fc7', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'G4' }
    ]
  },

  // =========================================================================
  // 8. POSAUNE — ELEMENTARSTUFE
  // =========================================================================
  {
    id: 'vdm-trb-positions-one-three',
    title: 'Posaune Grundstufe: 1. und 3. Zugposition (B2 - F3 & C3 - G3)',
    category: 'Technik',
    vdmFolder: 'blaeser-flexibility',
    vdmLevel: 'elementar',
    instrument: 'trombone',
    clef: 'bass',
    timeSignature: '4/4',
    tempoBpm: 76,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Grundstufe Posaune: Die elementare Zugführung. 1. Zugposition (B-Naturtonreihe) und 3. Zugposition (C-Naturtonreihe) mit vollem, geradem Luftstrom.',
    tags: ['Posaune', 'Zugpositionen', 'Naturtöne', 'Bassschlüssel', 'Grundstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: 1. Position (B2 -> F3)
      { id: 'tr_p1', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'Bb2' },
      { id: 'tr_p2', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'F3' },
      // Takt 1: 3. Position (C3 -> G3)
      { id: 'tr_p3', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'C3' },
      { id: 'tr_p4', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'G3' }
    ]
  },

  // =========================================================================
  // 9. BLOCKFLÖTE — MITTELSTUFE
  // =========================================================================
  {
    id: 'vdm-rec-fork-grip-f',
    title: 'Blockflöte Mittelstufe: F-Dur Gabelgriff & Intonation (F4 - G4 - A4)',
    category: 'Technik',
    vdmFolder: 'blockfloete-holz',
    vdmLevel: 'mittelstufe',
    instrument: 'recorder',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 84,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Mittelstufe Blockflöte: Beherrschung des barocken F-Gabelgriffs. Saubere Intonation, exakte Fingerkoordination und melodische Geschmeidigkeit.',
    tags: ['Blockflöte', 'Gabelgriff', 'F-Dur', 'Intonation', 'Mittelstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'rc_fg1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'rc_fg2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'G4' },
      { id: 'rc_fg3', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'A4' },
      { id: 'rc_fg4', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'rc_fg5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'F4' },
      { id: 'rc_fg6', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'G4' },
      { id: 'rc_fg7', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'F4' }
    ]
  }
];
