/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: Instrumenten-Lehrplan Erweiterung
 * instrumentCurriculumExpansion.ts
 * 
 * 16 hochkarätige, musikpädagogisch fundierte Notenschnipsel für alle 4 Stufen:
 * [Elementar, Leicht, Mittel, Schwer]
 * 
 * Schließt alle Lücken für:
 * - E-Bass: Elementar (Leersaiten-Puls), Leicht (Rock Root-Fifth), Schwer (Slap & Pop Funk)
 * - Blockflöte: Schwer (Barock-Allegro Telemann Sechzehntel)
 * - Querflöte: Leicht (Klangansatz D4-G4-H4), Mittel (Oktavierungs-Bindungen), Schwer (Mozart G-Dur Konzert)
 * - Streicher / Violine: Elementar (Ganzbogen-Strich), Mittel (1. Lage G-Dur), Schwer (Vivaldi Frühling Allegro)
 * - Altsaxophon: Leicht (H-A-G Tonansatz), Mittel (Oktavklappe D4-D5), Schwer (Bebop Blues Lick)
 * - Trompete: Elementar (Naturtöne C4-G4-C5), Mittel (Clarke Geläufigkeit), Schwer (Arban Doppelzunge T-K-T-K)
 * - Posaune: Leicht (Zugpositionen 1 & 4), Mittel (Zug-Legato), Schwer (Fanfaren-Attacke)
 * 
 * 100% verbandsneutral, UrhG-konform (1–2 Takte) & physikalisch exakt im Ambitus!
 */

import { MicroScoreSnippet } from '../components/student/meisterwerk/microscore/microScore.types';

export const INSTRUMENT_CURRICULUM_EXPANSION: MicroScoreSnippet[] = [
  // =========================================================================
  // 1. E-BASS (BASS-SCHLÜSSEL & 4-SAITEN TAB)
  // =========================================================================
  {
    id: 'vdm-bass-elem-open-pulse',
    title: 'E-Bass: 4-Saiten Leersaiten-Puls (E - A - D - G)',
    category: 'Technik',
    vdmFolder: 'bass-leersaiten',
    vdmLevel: 'elementar',
    instrument: 'bass',
    clef: 'bass',
    timeSignature: '4/4',
    tempoBpm: 68,
    barsCount: 2,
    displayMode: 'both',
    description: 'Elementar: Fundamentales Kennenlernen aller 4 Leersaiten des E-Basses (E1, A1, D2, G2) mit Daumenstütze und Zeige-/Mittelfinger-Wechselschlag.',
    tags: ['E-Bass', 'Leersaiten', 'Wechselschlag', 'Puls', 'Elementar'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: Aufsteigend E - A - D - G (Viertel)
      { id: 'bep1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E2', fret: 0, stringIndex: 3 },
      { id: 'bep2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'A2', fret: 0, stringIndex: 2 },
      { id: 'bep3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'D3', fret: 0, stringIndex: 1 },
      { id: 'bep4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'G3', fret: 0, stringIndex: 0 },
      // Takt 1: Absteigend G - D - A - E (Viertel)
      { id: 'bep5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G3', fret: 0, stringIndex: 0 },
      { id: 'bep6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'D3', fret: 0, stringIndex: 1 },
      { id: 'bep7', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'A2', fret: 0, stringIndex: 2 },
      { id: 'bep8', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'E2', fret: 0, stringIndex: 3 }
    ]
  },
  {
    id: 'vdm-bass-rock-root-fifth',
    title: 'E-Bass: Grundton & Quinte Rock-Groove (C & G)',
    category: 'Rhythmus',
    vdmFolder: 'bass-rock',
    vdmLevel: 'leicht',
    instrument: 'bass',
    clef: 'bass',
    timeSignature: '4/4',
    tempoBpm: 84,
    barsCount: 2,
    displayMode: 'both',
    description: 'Leicht / Grundstufe: Der universelle Rock-Bass-Puls. Grundton C auf der A-Saite (Bund 3) und Quinte G auf der D-Saite (Bund 5).',
    tags: ['E-Bass', 'Rock', 'Grundton', 'Quinte', 'Groove', 'Leicht'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: C - C - G - G (Achtel-Puls)
      { id: 'brf1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C3', fret: 3, stringIndex: 2 },
      { id: 'brf2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'C3', fret: 3, stringIndex: 2 },
      { id: 'brf3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C3', fret: 3, stringIndex: 2 },
      { id: 'brf4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'C3', fret: 3, stringIndex: 2 },
      { id: 'brf5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'G3', fret: 5, stringIndex: 1 },
      { id: 'brf6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'G3', fret: 5, stringIndex: 1 },
      { id: 'brf7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C3', fret: 3, stringIndex: 2 },
      // Takt 1: Variation C - E - G - C
      { id: 'brf8', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'C3', fret: 3, stringIndex: 2 },
      { id: 'brf9', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'E3', fret: 2, stringIndex: 1 },
      { id: 'brf10', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'G3', fret: 5, stringIndex: 1 },
      { id: 'brf11', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C3', fret: 3, stringIndex: 2 }
    ]
  },
  {
    id: 'vdm-bass-slap-pop-funk',
    title: 'E-Bass: Slap & Pop Funk-Groove (Thumb & Index)',
    category: 'Technik',
    vdmFolder: 'bass-slap',
    vdmLevel: 'schwer',
    instrument: 'bass',
    clef: 'bass',
    timeSignature: '4/4',
    tempoBpm: 104,
    barsCount: 2,
    displayMode: 'both',
    description: 'Schwer / Mittelstufe: Funk-Groove mit Daumenanschlag (Slap Thump) auf D2 und Zeigefinger-Anreißer (Pop) auf D3 und F3 inklusive Synkopen.',
    tags: ['E-Bass', 'Slap', 'Pop', 'Funk', 'Synkopen', 'Schwer'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: Slap D2 auf 1, Pop D3 auf 2-und, Slap F2 auf 3, Pop F3 auf 4
      { id: 'bsp1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'D3', fret: 0, stringIndex: 1 },
      { id: 'bsp2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'REST' },
      { id: 'bsp3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'D4', fret: 7, stringIndex: 0 },
      { id: 'bsp4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'REST' },
      { id: 'bsp5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'F3', fret: 3, stringIndex: 1 },
      { id: 'bsp6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'REST' },
      { id: 'bsp7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'C4', fret: 5, stringIndex: 0 },
      { id: 'bsp8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'D3', fret: 0, stringIndex: 1 },
      // Takt 1: 16tel Funk Syncopation (mit Achtelpausen)
      { id: 'bsp9', barIndex: 1, beatFraction: 0, duration: '16', pitch: 'D3', fret: 0, stringIndex: 1 },
      { id: 'bsp10', barIndex: 1, beatFraction: 1, duration: '16', pitch: 'D3', fret: 0, stringIndex: 1 },
      { id: 'bsp10_rest', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'REST' },
      { id: 'bsp11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'C4', fret: 5, stringIndex: 0 },
      { id: 'bsp11_rest', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'REST' },
      { id: 'bsp12', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'D4', fret: 7, stringIndex: 0 },
      { id: 'bsp12_rest', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'REST' },
      { id: 'bsp13', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'D3', fret: 0, stringIndex: 1 }
    ]
  },

  // =========================================================================
  // 2. BLOCKFLÖTE (SOPRAN C)
  // =========================================================================
  {
    id: 'vdm-rec-baroque-allegro',
    title: 'Blockflöte: Barock-Allegro Telemann (Sechzehntel-Lauf)',
    category: 'Melodien',
    vdmFolder: 'recorder-baroque',
    vdmLevel: 'schwer',
    instrument: 'recorder',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 96,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Schwer / Mittelstufe: Virtuoser Barock-Lauf im Ambitus D5–A5 mit Doppelzunge (ti-ki-ti-ki) und sauberer Daumenloch-Deckung.',
    tags: ['Blockflöte', 'Barock', 'Telemann', 'Geläufigkeit', 'Sechzehntel', 'Schwer'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: D5 - E5 - F#5 - G5 - A5 - G5 - F#5 - E5 (16tel)
      { id: 'rba1', barIndex: 0, beatFraction: 0, duration: '16', pitch: 'D5' },
      { id: 'rba2', barIndex: 0, beatFraction: 1, duration: '16', pitch: 'E5' },
      { id: 'rba3', barIndex: 0, beatFraction: 2, duration: '16', pitch: 'F#5' },
      { id: 'rba4', barIndex: 0, beatFraction: 3, duration: '16', pitch: 'G5' },
      { id: 'rba5', barIndex: 0, beatFraction: 4, duration: '16', pitch: 'A5' },
      { id: 'rba6', barIndex: 0, beatFraction: 5, duration: '16', pitch: 'G5' },
      { id: 'rba7', barIndex: 0, beatFraction: 6, duration: '16', pitch: 'F#5' },
      { id: 'rba8', barIndex: 0, beatFraction: 7, duration: '16', pitch: 'E5' },
      { id: 'rba9', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'F#5' },
      { id: 'rba10', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'D5' },
      { id: 'rba11', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'A5' },
      // Takt 1: Kadenz D5
      { id: 'rba12', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'G5' },
      { id: 'rba13', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'F#5' },
      { id: 'rba14', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'E5' },
      { id: 'rba15', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'C#5' },
      { id: 'rba16', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'D5' }
    ]
  },

  // =========================================================================
  // 3. QUERFLÖTE (C-KONZERTFLÖTE)
  // =========================================================================
  {
    id: 'vdm-flute-intro-sound',
    title: 'Querflöte: Klangansatz & Stütze (D4 - G4 - H4)',
    category: 'Technik',
    vdmFolder: 'flute-ansatz',
    vdmLevel: 'leicht',
    instrument: 'flute',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 68,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Leicht / Grundstufe: Ruhiger Ansatz-Einstieg für einen fokussierten Klangstrahl und zentrierte Intonation im 1. Register.',
    tags: ['Querflöte', 'Klangansatz', 'Stütze', 'Tonbildung', 'Leicht'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'fis1', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'G4' },
      { id: 'fis2', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'B4' },
      { id: 'fis3', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'D4' },
      { id: 'fis4', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'G4' }
    ]
  },
  {
    id: 'vdm-flute-octave-slurs',
    title: 'Querflöte: Oktavierungs-Bindungen (D4-D5 & G4-G5)',
    category: 'Technik',
    vdmFolder: 'flute-bindungen',
    vdmLevel: 'mittel',
    instrument: 'flute',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 76,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Mittel / Unterstufe: Lippenöffnungs- und Blasdruck-Wechsel zur sicheren Ansprache der 2. Oktave ohne Fingerwechsel.',
    tags: ['Querflöte', 'Bindung', 'Oktaven', 'Registerwechsel', 'Mittel'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'fos1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'D4' },
      { id: 'fos2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'D5' },
      { id: 'fos3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'E4' },
      { id: 'fos4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'E5' },
      { id: 'fos5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'fos6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G5' },
      { id: 'fos7', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'D5' }
    ]
  },
  {
    id: 'vdm-flute-mozart-allegro',
    title: 'Querflöte: Mozart Konzert-Thema G-Dur (Allegro)',
    category: 'Melodien',
    vdmFolder: 'flute-mozart',
    vdmLevel: 'schwer',
    instrument: 'flute',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 104,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Schwer / Mittelstufe: Edles Allegro-Thema aus KV 313 im brillanten 2. Register (D5 bis D6) mit perlenden Sechzehnteln.',
    tags: ['Querflöte', 'Klassik', 'Mozart', 'Konzert', 'Allegro', 'Schwer'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'fma1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'D5' },
      { id: 'fma2', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'G5' },
      { id: 'fma3', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'B5' },
      { id: 'fma4', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'D6' },
      { id: 'fma5', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'B5' },
      { id: 'fma6', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'C6' },
      { id: 'fma7', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'A5' },
      { id: 'fma8', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'F#5' },
      { id: 'fma9', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'D5' },
      { id: 'fma10', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'G5' }
    ]
  },

  // =========================================================================
  // 4. STREICHER / VIOLINE (NOTENSYSTEM PUR)
  // =========================================================================
  {
    id: 'vdm-strings-elem-bow-stroke',
    title: 'Streicher: Ganzbogen-Strich (A4 & E5 Leersaiten)',
    category: 'Technik',
    vdmFolder: 'strings-bogen',
    vdmLevel: 'elementar',
    instrument: 'strings',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 64,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Elementar: Gleichmäßiger Ganzbogenstrich vom Frosch zur Spitze auf den oberen Leersaiten A4 und E5 für sauberen Klang ohne Rutschen.',
    tags: ['Streicher', 'Violine', 'Bogenstrich', 'Leersaiten', 'Elementar'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'seb1', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'A4' },
      { id: 'seb2', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'E5' },
      { id: 'seb3', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'A4' },
      { id: 'seb4', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'E5' }
    ]
  },
  {
    id: 'vdm-strings-first-position-g',
    title: 'Violine: 1. Lage G-Dur Lauf (Enger 2./3. Finger)',
    category: 'Tonleitern',
    vdmFolder: 'strings-lage1',
    vdmLevel: 'mittel',
    instrument: 'strings',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Mittel / Unterstufe: Intonations-Drill in der 1. Lage über die G- und D-Saite mit engem Halbtonschritt zwischen 2. und 3. Finger.',
    tags: ['Violine', 'Streicher', '1. Lage', 'Intonation', 'Tonleiter', 'Mittel'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'sfp1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G3' },
      { id: 'sfp2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'A3' },
      { id: 'sfp3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'B3' },
      { id: 'sfp4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C4' },
      { id: 'sfp5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'D4' },
      { id: 'sfp6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'sfp7', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'F#4' },
      { id: 'sfp8', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'G4' }
    ]
  },
  {
    id: 'vdm-strings-vivaldi-spring',
    title: 'Violine: Vivaldi Der Frühling (Allegro Barock-Lauf)',
    category: 'Melodien',
    vdmFolder: 'strings-vivaldi',
    vdmLevel: 'schwer',
    instrument: 'strings',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 104,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Schwer / Mittelstufe: Das berühmte Thema aus op. 8 No. 1 mit energischem Punktierungs-Rhythmus und Saitensprüngen.',
    tags: ['Violine', 'Vivaldi', 'Barock', 'Klassik', 'Frühling', 'Schwer'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // E5 - G#5 - G#5 - G#5 - F#5 - E5 - B4
      { id: 'svs1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E5' },
      { id: 'svs2', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'G#5' },
      { id: 'svs3', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'G#5' },
      { id: 'svs4', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'G#5' },
      { id: 'svs5', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'F#5' },
      { id: 'svs6', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'E5' },
      { id: 'svs7', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'B5' },
      { id: 'svs8', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'E5' }
    ]
  },

  // =========================================================================
  // 5. ALTSAXOPHON (IN EB)
  // =========================================================================
  {
    id: 'vdm-sax-elem-bag-groove',
    title: 'Altsaxophon: H - A - G Tonansatz & Zungenstoß',
    category: 'Technik',
    vdmFolder: 'sax-ansatz',
    vdmLevel: 'leicht',
    instrument: 'altosax',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 72,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Leicht / Grundstufe: Die drei grundlegenden Griffe der linken Hand (H, A, G) mit definiertem Zungen-Release ("Ta-Ta").',
    tags: ['Altsaxophon', 'Bläser', 'Ansatz', 'Zungenstoß', 'Leicht'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'sag1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'B4' },
      { id: 'sag2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'B4' },
      { id: 'sag3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'A4' },
      { id: 'sag4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'A4' },
      { id: 'sag5', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'G4' },
      { id: 'sag6', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'G4' }
    ]
  },
  {
    id: 'vdm-sax-octave-key-drive',
    title: 'Altsaxophon: Oktavklappen-Wechsel (D4 <-> D5)',
    category: 'Technik',
    vdmFolder: 'sax-oktavklappe',
    vdmLevel: 'mittel',
    instrument: 'altosax',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 84,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Mittel / Unterstufe: Koordination des linken Daumens beim Übergang zwischen tiefem und mittlerem Register ohne Tonabriss.',
    tags: ['Altsaxophon', 'Oktavklappe', 'Registerwechsel', 'Mittel'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'sok1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'D4' },
      { id: 'sok2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'D5' },
      { id: 'sok3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'E4' },
      { id: 'sok4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'E5' },
      { id: 'sok5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'sok6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G5' },
      { id: 'sok7', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'D5' }
    ]
  },
  {
    id: 'vdm-sax-bebop-blues-riff',
    title: 'Altsaxophon: Bebop Blues-Lick (Charlie Parker Style)',
    category: 'Melodien',
    vdmFolder: 'sax-bebop',
    vdmLevel: 'schwer',
    instrument: 'altosax',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 108,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Schwer / Mittelstufe: Klassische Bebop-Phrasierung mit chromatischer Blues-Note und Synkopen-Drive im Jazz-Kontext.',
    tags: ['Altsaxophon', 'Jazz', 'Bebop', 'Blues', 'Parker', 'Schwer'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'sbb1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'F4' },
      { id: 'sbb2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'Ab4' },
      { id: 'sbb3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'Bb4' },
      { id: 'sbb4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'B4' },
      { id: 'sbb5', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'C5' },
      { id: 'sbb6', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'Ab4' },
      { id: 'sbb7', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'Bb4' },
      { id: 'sbb8', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'G4' },
      { id: 'sbb9', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'F4' },
      { id: 'sbb10', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'Eb4' },
      { id: 'sbb11', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'F4' }
    ]
  },

  // =========================================================================
  // 6. TROMPETE (IN BB)
  // =========================================================================
  {
    id: 'vdm-trp-elem-nature-tones',
    title: 'Trompete: Naturtöne & Lippen-Flexibilität (C4 - G4 - C5)',
    category: 'Technik',
    vdmFolder: 'trumpet-naturtoene',
    vdmLevel: 'elementar',
    instrument: 'trumpet',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 66,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Elementar: Lippenstimmungs-Übung ohne Ventile (offen gegriffen) zur Festigung der Grundtöne und Lippenspannung.',
    tags: ['Trompete', 'Naturtöne', 'Lippenöffnung', 'Ansatz', 'Elementar'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'tnt1', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'C4' },
      { id: 'tnt2', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'G4' },
      { id: 'tnt3', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'C5' },
      { id: 'tnt4', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'G4' }
    ]
  },
  {
    id: 'vdm-trp-clarke-technical',
    title: 'Trompete: Clarke Technical Study (Geläufigkeit C-Dur)',
    category: 'Tonleitern',
    vdmFolder: 'trumpet-clarke',
    vdmLevel: 'mittel',
    instrument: 'trumpet',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 88,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Mittel / Unterstufe: Der Goldstandard für gleichmäßigen Atemfluss und flüssige Finger-Koordination auf den Perinet-Ventilen.',
    tags: ['Trompete', 'Clarke', 'Geläufigkeit', 'Ventile', 'Mittel'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'tcl1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C4' },
      { id: 'tcl2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'D4' },
      { id: 'tcl3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'E4' },
      { id: 'tcl4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'D4' },
      { id: 'tcl5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'C4' },
      { id: 'tcl6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'D4' },
      { id: 'tcl7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'E4' },
      { id: 'tcl8', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'F4' },
      { id: 'tcl9', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'G4' },
      { id: 'tcl10', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'E4' },
      { id: 'tcl11', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'D4' },
      { id: 'tcl12', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'C4' }
    ]
  },
  {
    id: 'vdm-trp-arban-double-tongue',
    title: 'Trompete: Arban Doppelzunge-Drill (T-K-T-K)',
    category: 'Technik',
    vdmFolder: 'trumpet-arban',
    vdmLevel: 'schwer',
    instrument: 'trumpet',
    clef: 'treble',
    timeSignature: '4/4',
    tempoBpm: 112,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Schwer / Mittelstufe: Virtuoser Doppelzungen-Stoß nach Arban für blitzschnelle Staccato-Kaskaden auf G4 und C5.',
    tags: ['Trompete', 'Arban', 'Doppelzunge', 'Staccato', 'Schwer'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'tad1', barIndex: 0, beatFraction: 0, duration: '16', pitch: 'G4' },
      { id: 'tad2', barIndex: 0, beatFraction: 1, duration: '16', pitch: 'G4' },
      { id: 'tad3', barIndex: 0, beatFraction: 2, duration: '16', pitch: 'G4' },
      { id: 'tad4', barIndex: 0, beatFraction: 3, duration: '16', pitch: 'G4' },
      { id: 'tad5', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C5' },
      { id: 'tad6', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'G4' },
      { id: 'tad7', barIndex: 0, beatFraction: 8, duration: '16', pitch: 'C5' },
      { id: 'tad8', barIndex: 0, beatFraction: 9, duration: '16', pitch: 'C5' },
      { id: 'tad9', barIndex: 0, beatFraction: 10, duration: '16', pitch: 'C5' },
      { id: 'tad10', barIndex: 0, beatFraction: 11, duration: '16', pitch: 'C5' },
      { id: 'tad11', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'E5' },
      { id: 'tad12', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'D5' },
      { id: 'tad13', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'B4' },
      { id: 'tad14', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'tad15', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'C5' }
    ]
  },

  // =========================================================================
  // 7. POSAUNE (BASS-SCHLÜSSEL IN C)
  // =========================================================================
  {
    id: 'vdm-tbn-elem-slide-positions',
    title: 'Posaune: Zugpositionen 1 & 4 (Bb2 - F2 - D3)',
    category: 'Technik',
    vdmFolder: 'trombone-positionen',
    vdmLevel: 'leicht',
    instrument: 'trombone',
    clef: 'bass',
    timeSignature: '4/4',
    tempoBpm: 66,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Leicht / Grundstufe: Der Einstieg in die Posaunen-Zugtechnik. 1. Position (Bb2, D3) im Wechsel mit der 4. Position (F2).',
    tags: ['Posaune', 'Zugposition', 'Bassschlüssel', 'Bläser', 'Leicht'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'tbp1', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'Bb2' },
      { id: 'tbp2', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'F2' },
      { id: 'tbp3', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'D3' },
      { id: 'tbp4', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'Bb2' }
    ]
  },
  {
    id: 'vdm-tbn-slide-legato',
    title: 'Posaune: Zug-Legato & Luftstrom (F2 - Bb2 - D3 - F3)',
    category: 'Tonleitern',
    vdmFolder: 'trombone-legato',
    vdmLevel: 'mittel',
    instrument: 'trombone',
    clef: 'bass',
    timeSignature: '4/4',
    tempoBpm: 76,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Mittel / Unterstufe: Schnelle, geräuschlose Zugbewegung bei ununterbrochenem Legato-Luftstrom (Naturtöne & Lippenbindung).',
    tags: ['Posaune', 'Legato', 'Luftstrom', 'Arpeggio', 'Mittel'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'tbl1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'Bb2' },
      { id: 'tbl2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'D3' },
      { id: 'tbl3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'F3' },
      { id: 'tbl4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'D3' },
      { id: 'tbl5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'Eb3' },
      { id: 'tbl6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C3' },
      { id: 'tbl7', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'Bb2' }
    ]
  },
  {
    id: 'vdm-tbn-fanfare-attack',
    title: 'Posaune: Fanfaren-Staccato & Quint-Sprünge',
    category: 'Melodien',
    vdmFolder: 'trombone-fanfare',
    vdmLevel: 'schwer',
    instrument: 'trombone',
    clef: 'bass',
    timeSignature: '4/4',
    tempoBpm: 100,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Schwer / Mittelstufe: Kraftvolle Fanfaren-Attitüde mit punktiertem Rhythmus und akzentuierten Quint- und Oktavsprüngen im Bassschlüssel.',
    tags: ['Posaune', 'Fanfare', 'Staccato', 'Akzente', 'Schwer'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'tbf1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'Bb2' },
      { id: 'tbf2', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'F3' },
      { id: 'tbf3', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'F3' },
      { id: 'tbf4', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'Bb3' },
      { id: 'tbf5', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'F3' },
      { id: 'tbf6', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'D3' },
      { id: 'tbf7', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'F3' },
      { id: 'tbf8', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'Bb2' },
      { id: 'tbf9', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'Bb2' }
    ]
  }
];
