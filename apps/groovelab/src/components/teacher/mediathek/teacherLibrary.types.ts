/**
 * 🏛️ Campus-Groovelab 3-Säulen-Bibliothek / Mediathek
 * teacherLibrary.types.ts
 * 
 * 0,1% Goldstandard Typisierungen für:
 * 1. Didaktik-Snippet-Archiv (Reusable Assignment Snippets / Rhythmus & Micro-Scores)
 * 2. Lehrwerk-Index (Methoden & Schulwerke gem. § 1 Abs. 2 UrhDaG / Zero-PDF)
 * 3. Song- & Playalong-Studio (Stems, Repertoire & Audio-Demos)
 */

export type LibraryPillar = 'notenschnipsel' | 'snippets' | 'lehrwerke' | 'songs';

export interface LibrarySnippetItem {
  id: string;
  title: string;
  category: 'Warm-up' | 'Tonleiter' | 'Rhythmus' | 'Etüde' | 'Technik' | 'Gehörbildung' | 'Akkorde';
  instrumentTag?: string; // z. B. 'Gitarre', 'Klavier', 'Schlagzeug', 'Bläser', 'Allgemein'
  bpm?: number;
  speedLadder?: number[];
  notes: string;
  tags: string[];
  spotlightBars?: string;
  parentNotice?: string;
  isCustom?: boolean;
}

export interface LibraryLehrwerkItem {
  id: string;
  title: string;
  author?: string;
  instrument?: string;
  totalPages?: number;
  recommendedPages?: string; // z. B. "S. 14-16"
  exercises?: string; // z. B. "Üb. 1-4"
  notes?: string;
  bookColor?: { from: string; to: string; text: string };
  isCustom?: boolean;
}

export interface LibrarySongItem {
  id: string;
  title: string;
  artist: string;
  instrument?: string;
  tempo_bpm?: number;
  key?: string;
  audio_url?: string | null;
  hasStems?: boolean;
  notes?: string;
  duration?: number;
}

/**
 * Kuratierte, didaktisch erprobte Standard-Snippets für Musiklehrkräfte
 */
export const DEFAULT_DIDACTIC_SNIPPETS: LibrarySnippetItem[] = [
  {
    id: 'snip-c-dur-scale',
    title: 'Tonleiter C-Dur legato mit Metronom',
    category: 'Tonleiter',
    instrumentTag: 'Allgemein',
    bpm: 72,
    speedLadder: [60, 72, 84],
    notes: 'Tonleiter über 2 Oktaven aufwärts und abwärts. Gleichmäßiger Tonansatz und ruhiges Tempo halten.',
    tags: ['Tonleiter', 'Intonation', 'Metronom'],
    spotlightBars: 'Takt 1-4 (Spitzen-Oktave)',
    parentNotice: 'Liebe Eltern: Der Schüler sollte die Töne laut mitzählen.'
  },
  {
    id: 'snip-blues-shuffle-pentatonic',
    title: 'Blues-Shuffle & A-Moll Pentatonik',
    category: 'Technik',
    instrumentTag: 'Gitarre',
    bpm: 80,
    speedLadder: [60, 80, 100],
    notes: 'Takt 1-8 im Wechselschlag. Achte auf lockeres Handgelenk und sauberen Saitenübergang.',
    tags: ['Wechselschlag', 'Timing', 'Pentatonik'],
    spotlightBars: 'Takt 5-8 (Wechsel zur IV. Stufe)',
    parentNotice: 'Der Rhythmus darf rollen wie ein Zug.'
  },
  {
    id: 'snip-triplet-groove-80bpm',
    title: 'Triolen-Warmup & Akzent-Verschiebung',
    category: 'Rhythmus',
    instrumentTag: 'Schlagzeug',
    bpm: 85,
    speedLadder: [70, 85, 105],
    notes: 'Achtel-Triolen abwechselnd R-L-R-L spielen. Akzente jeweils auf Zählzeit 1 und 3 betonen.',
    tags: ['Rhythmus', 'Koordination', 'Akzente'],
    spotlightBars: 'Takt 2 & 4 (Paradiddle-Einstieg)'
  },
  {
    id: 'snip-finger-independence-hanon',
    title: 'Fingerunabhängigkeit (Hanon-Muster No. 1)',
    category: 'Warm-up',
    instrumentTag: 'Klavier',
    bpm: 68,
    speedLadder: [56, 68, 80],
    notes: 'Beide Hände parallel in Oktaven. Finger 4 und 5 bewusst aufstellen und nicht einknicken.',
    tags: ['Haltung', 'Fingerkraft', 'Legato'],
    spotlightBars: 'Wendepunkt im 5. Takt'
  },
  {
    id: 'snip-breath-support-long-tones',
    title: 'Lange Töne & Stütze (Long Tones)',
    category: 'Warm-up',
    instrumentTag: 'Bläser',
    bpm: 60,
    speedLadder: [50, 60, 70],
    notes: 'Jeden Ton 8 Schläge aushalten (Crescendo bis f, Decrescendo bis p). Auf stabile Luftsäule achten.',
    tags: ['Atmung', 'Intonation', 'Dynamik'],
    spotlightBars: 'G2 bis C3 Tonraum'
  },
  {
    id: 'snip-first-open-chords',
    title: 'Flüssiger Akkordwechsel: G-Dur, C-Dur, D-Dur',
    category: 'Akkorde',
    instrumentTag: 'Gitarre',
    bpm: 70,
    speedLadder: [50, 70, 90],
    notes: 'Akkorde ohne Pause im 4/4-Takt durchwechseln. Greiffinger gleichzeitig aufsetzen.',
    tags: ['Akkorde', 'Koordination', 'Liedbegleitung'],
    spotlightBars: 'Wechsel von C nach D'
  },
  {
    id: 'snip-ear-training-intervals',
    title: 'Gehörbildung: Quinte & Quarte im Wechsel',
    category: 'Gehörbildung',
    instrumentTag: 'Allgemein',
    bpm: 65,
    speedLadder: [55, 65, 75],
    notes: 'Den Grundton hören, die Quinte und Quarte zuerst singen, dann auf dem Instrument nachspielen.',
    tags: ['Gehörbildung', 'EarLab', 'Intonation'],
    parentNotice: 'Kleine Übung fürs musikalische Gehör.'
  }
];
