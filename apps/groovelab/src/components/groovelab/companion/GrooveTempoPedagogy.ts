/**
 * 🎓 GrooveTempoPedagogy.ts
 * Autarke musikpädagogische Tempo- & Didaktik-Engine für das Campus-Groovelab Übe-Metronom.
 * 
 * 0,1% Goldstandard:
 * - Didaktische Smart-Defaults nach Altersstufe (Junior 72, Teen 80, Pro 88 BPM)
 * - Stilprägende Sweet-Spots für alle 11 Begleit-Rhythmen
 * - Handlungsorientierte Tempo-Zonen (Lernen, Üben, Performance)
 * - Taktile Schnellauswahl-Presets
 */

export interface StyleTempoConfig {
  id: string;
  defaultBpm: number;
  minBpm: number;
  maxBpm: number;
  label: string;
  desc: string;
  pedagogicalTip: string;
}

export const STYLE_TEMPO_PRESETS: Record<string, StyleTempoConfig> = {
  metronome: {
    id: 'metronome',
    defaultBpm: 80,
    minBpm: 40,
    maxBpm: 240,
    label: 'Metronom Klick',
    desc: 'Universelles Übetempo',
    pedagogicalTip: 'Ideal für Tonleitern, Etüden und sauberes Timing.'
  },
  rock: {
    id: 'rock',
    defaultBpm: 100,
    minBpm: 60,
    maxBpm: 180,
    label: 'Rock & Pop',
    desc: 'Solider Groove-Einstieg',
    pedagogicalTip: 'Kräftiger Backbeat zum Mitspielen für Band-Songs.'
  },
  hiphop: {
    id: 'hiphop',
    defaultBpm: 84,
    minBpm: 65,
    maxBpm: 110,
    label: 'Hip-Hop Pocket',
    desc: 'Boom-Bap / Lo-Fi Pocket',
    pedagogicalTip: 'Entspannter Beat mit viel Raum für Mikrotiming.'
  },
  singersongwriter: {
    id: 'singersongwriter',
    defaultBpm: 82,
    minBpm: 55,
    maxBpm: 135,
    label: 'Liedermacher',
    desc: 'Akustisches Strumming',
    pedagogicalTip: 'Sanfter Rhythmus für Akustikgitarre und Gesang.'
  },
  swing: {
    id: 'swing',
    defaultBpm: 108,
    minBpm: 70,
    maxBpm: 220,
    label: 'Jazz Swing',
    desc: 'Medium Swing',
    pedagogicalTip: 'Triolisches Feel mit lebendiger Hi-Hat auf 2 und 4.'
  },
  latin: {
    id: 'latin',
    defaultBpm: 120,
    minBpm: 80,
    maxBpm: 200,
    label: 'Latin Bossa',
    desc: 'Fließender Bossa-Nova',
    pedagogicalTip: 'Fließende Synkopen und warme Percussion.'
  },
  funk: {
    id: 'funk',
    defaultBpm: 96,
    minBpm: 75,
    maxBpm: 130,
    label: 'Funk Break',
    desc: 'Synkopierter Pocket',
    pedagogicalTip: 'Präziser Funk-Groove – betone die Eins!'
  },
  reggae: {
    id: 'reggae',
    defaultBpm: 72,
    minBpm: 55,
    maxBpm: 100,
    label: 'Reggae One-Drop',
    desc: 'Laid-Back Offbeat',
    pedagogicalTip: 'Tiefer Bass und betonter Schlag 3 (One-Drop).'
  },
  walzer: {
    id: 'walzer',
    defaultBpm: 96,
    minBpm: 60,
    maxBpm: 180,
    label: 'Walzer (3/4)',
    desc: 'Mäßiger 3/4-Takt',
    pedagogicalTip: 'Klassischer Wiegeschritt mit klarer Eins.'
  },
  ballad68: {
    id: 'ballad68',
    defaultBpm: 64,
    minBpm: 45,
    maxBpm: 105,
    label: '6/8 Ballade',
    desc: 'Sanfter Balladenfluss',
    pedagogicalTip: 'Zähle zwei Dreiergruppen: 1-2-3, 4-5-6.'
  },
  disco: {
    id: 'disco',
    defaultBpm: 120,
    minBpm: 100,
    maxBpm: 140,
    label: 'Disco',
    desc: '4-on-the-Floor Club Beat',
    pedagogicalTip: 'Gerader Viertelpuls zum Tanzen und Durchhalten.'
  }
};

/**
 * Ermittelt das didaktisch ideale Einstiegstempo.
 * Priorität:
 * 1. Expliziter Aufgabenkontext der Lehrkraft (SSOT)
 * 2. Spezifischer Stil-Sweet-Spot (wenn nicht Standard-Metronom)
 * 3. Alters- und Kompetenzstufe (Junior 72, Teen 80, Pro 88)
 */
export function getDidacticInitialBpm(
  uiLevel?: 'junior' | 'teen' | 'pro' | null,
  activeSongContextBpm?: number | null,
  propTargetBpm?: number | null,
  selectedStyle?: string
): number {
  if (activeSongContextBpm && activeSongContextBpm >= 40 && activeSongContextBpm <= 240) {
    return activeSongContextBpm;
  }
  if (propTargetBpm && propTargetBpm >= 40 && propTargetBpm <= 240) {
    return propTargetBpm;
  }
  if (selectedStyle && selectedStyle !== 'metronome' && STYLE_TEMPO_PRESETS[selectedStyle]) {
    return STYLE_TEMPO_PRESETS[selectedStyle].defaultBpm;
  }

  switch (uiLevel) {
    case 'junior':
      return 72; // Entspanntes Lerntempo für Kinder/Anfänger
    case 'pro':
      return 88; // Zügiges Fokus-Übetempo für Fortgeschrittene
    case 'teen':
    default:
      return 80; // Das goldene universelle Übetempo
  }
}

export interface DidacticTempoZone {
  name: string;
  subTitle: string;
  icon: string;
  color: string;
}

/**
 * Liefert handlungsleitende musikpädagogische Erklärungen passend zum BPM-Bereich.
 */
export function getDidacticTempoZone(bpm: number): DidacticTempoZone {
  if (bpm < 60) {
    return {
      name: 'Largo',
      subTitle: 'Sehr langsam • Für schwierige Stellen & Fingerübungen',
      icon: '🐢',
      color: '#0284c7'
    };
  }
  if (bpm < 76) {
    return {
      name: 'Adagio',
      subTitle: 'Ruhig • Gründliches Einüben neuer Songs',
      icon: '🐢',
      color: '#0d9488'
    };
  }
  if (bpm < 96) {
    return {
      name: 'Andante',
      subTitle: 'Gehend • Goldenes Übetempo für Timing & Flow',
      icon: '🚶',
      color: '#16a34a'
    };
  }
  if (bpm < 116) {
    return {
      name: 'Moderato',
      subTitle: 'Mäßig flott • Fester Band-Groove',
      icon: '🥁',
      color: '#d97706'
    };
  }
  if (bpm < 136) {
    return {
      name: 'Allegro',
      subTitle: 'Munter & Schnell • Zieltempo & Live-Performance',
      icon: '⚡',
      color: '#ea580c'
    };
  }
  return {
    name: 'Presto',
    subTitle: 'Sehr schnell • Virtuose Challenge',
    icon: '🔥',
    color: '#dc2626'
  };
}

/**
 * Didaktische 3-Stufen Schnellauswahl-Presets
 */
export const DIDACTIC_QUICK_PRESETS = [
  { bpm: 60, label: '60 Lernen', tag: 'Gründlich' },
  { bpm: 80, label: '80 Üben', tag: 'Goldener Standard' },
  { bpm: 110, label: '110 Ziel', tag: 'Original-Groove' }
] as const;
