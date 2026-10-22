/**
 * 🏛️ CAMPUS-GROOVELAB 0,1% GOLDSTANDARD: VDM DIDACTIC SORT ENGINE
 * vdmDidacticSortEngine.ts
 * 
 * Autarker, seiteneffektfreier Berechnungs- und Sortier-Satellit für Notenschnipsel:
 * - Strikte 4-Ebenen VdM-Stufenordnung (Elementar -> Unterstufe -> Mittelstufe -> Oberstufe)
 * - Behebt den getLevelWeight-Bug (mittelstufe kollabierte mit unterstufe)
 * - Fachlehrplan-Subordner-Progression (vom Einfachen zum Komplexen)
 * - Didactic Complexity Score (DCS) zur Beseitigung des verkehrten BPM-Dilemmas
 * - Multi-Mode Sortierung (VdM Didaktisch, Leicht->Schwer, Schwer->Leicht, A-Z, BPM, Neueste)
 * - 100% Strict TypeScript, Monolith Ceiling konform (< 300 Zeilen)
 */

import { MicroScoreSnippet } from '../components/student/meisterwerk/microscore/microScore.types';
import { VDM_CATEGORIES } from './vdmScoreSnippetCatalog';

export type VdmSortMode =
  | 'didactic'     // 0,1% VdM Standard: Stufe -> Sub-Ordner -> Didactic Complexity Score
  | 'level_asc'    // Leicht -> Schwer (Elementar -> Oberstufe)
  | 'level_desc'   // Schwer -> Leicht (Begabtenförderung / Oberstufe -> Elementar)
  | 'title_asc'    // Alphabetisch (A -> Z)
  | 'bpm_asc'      // Tempo (Langsamer Puls -> Schneller Drive)
  | 'recent';      // Zuletzt bearbeitet / hinzugefügt

export interface VdmSortOption {
  id: VdmSortMode;
  label: string;
  shortLabel: string;
  description: string;
}

export const VDM_SORT_OPTIONS: VdmSortOption[] = [
  {
    id: 'didactic',
    label: 'Didaktisch (Stufenplan)',
    shortLabel: 'Didaktisch',
    description: 'Empfohlen: Elementar bis Oberstufe nach didaktischer Komplexität'
  },
  {
    id: 'level_asc',
    label: 'Stufe: Leicht → Schwer',
    shortLabel: 'Stufe ↑',
    description: 'Ausbildungsstufe aufsteigend'
  },
  {
    id: 'level_desc',
    label: 'Stufe: Schwer → Leicht',
    shortLabel: 'Stufe ↓',
    description: 'Begabtenförderung & anspruchsvolle Werke zuerst'
  },
  {
    id: 'title_asc',
    label: 'Alphabetisch (A → Z)',
    shortLabel: 'A → Z',
    description: 'Nach Übungstitel geordnet'
  },
  {
    id: 'bpm_asc',
    label: 'Tempo: Langsam → Schnell',
    shortLabel: 'BPM ↑',
    description: 'Nach Metronom-Geschwindigkeit geordnet'
  },
  {
    id: 'recent',
    label: 'Zuletzt aktualisiert',
    shortLabel: 'Aktuell',
    description: 'Neueste & eigene Übungen zuerst'
  }
];

/**
 * 1. Kanonische 4-Stufen VdM-Hierarchie (0 = Elementar, 1 = Unterstufe, 2 = Mittelstufe, 3 = Oberstufe)
 * Behebt autoritativ den Bug, bei dem 'mittelstufe'.includes('mittel') vor 'mittelstufe' matchte.
 */
export const getVdmLevelWeight = (lvl?: string): number => {
  if (!lvl) return 1;
  const l = lvl.trim().toLowerCase();

  // Stufe 0: Elementarstufe / Grundstufe (EMP, Früherziehung)
  if (
    l.includes('elementar') ||
    l.includes('früherziehung') ||
    l.includes('frueherziehung') ||
    l.includes('emp')
  ) {
    return 0;
  }

  // Stufe 3: Oberstufe & Pro (vor Mittelstufe prüfen gegen false-positives)
  if (
    l.includes('oberstufe') ||
    l.includes('schwer') ||
    l.includes('pro') ||
    l.includes('virtuos') ||
    l.includes('advanced')
  ) {
    return 3;
  }

  // Stufe 2: Mittelstufe (voll ausgeschrieben oder mittel)
  if (
    l.includes('mittelstufe') ||
    l === 'mittel' ||
    l === 'intermediate'
  ) {
    return 2;
  }

  // Stufe 1: Unterstufe & Grundstufe / Leicht
  if (
    l.includes('unterstufe') ||
    l.includes('grundstufe') ||
    l.includes('leicht') ||
    l.includes('beginner') ||
    l.includes('easy')
  ) {
    return 1;
  }

  return 1;
};

/**
 * 2. Didaktische Rubriken-Gewichtung nach VdM Fachlehrplan
 */
export const getDidacticCategoryWeight = (category?: string): number => {
  switch (category) {
    case 'Früherziehung': return 0;
    case 'Tonleitern': return 1;
    case 'Rhythmus': return 2;
    case 'Technik': return 3;
    case 'Melodien': return 4;
    case 'Akkorde': return 5;
    case 'Zupfinstrumente': return 6;
    case 'Vokal': return 7;
    case 'BandPacks': return 8;
    case 'Eigene': return 9;
    default: return 10;
  }
};

/**
 * 3. Didaktische Sub-Ordner-Reihenfolge innerhalb einer Fachkategorie
 */
export const getSubFolderWeight = (category?: string, subFolder?: string): number => {
  if (!category || !subFolder || subFolder === 'all') return 0;

  const catMeta = VDM_CATEGORIES.find(c => c.id === category || c.name === category);
  if (!catMeta || !catMeta.subFolders) return 99;

  const idx = catMeta.subFolders.findIndex(sf => sf.id === subFolder);
  return idx >= 0 ? idx : 99;
};

/**
 * 4. Didactic Complexity Score (DCS)
 * Berechnet die inhaltliche Komplexität der Notensubstanz, um das verkehrte BPM-Dilemma aufzulösen.
 * Höherer Score = anspruchsvollere Noten- und Rhythmusstruktur.
 */
export const getDidacticComplexityScore = (snippet: MicroScoreSnippet): number => {
  if (!snippet) return 0;
  let score = 0;

  const notes = snippet.notes || [];

  // A. Rhythmisches Notenwert-Raster
  let hasSixteenth = false;
  let hasTriplet = false;
  let hasDotted = false;
  let hasEighth = false;
  let hasSyncopation = false;

  for (const n of notes) {
    if (n.duration === '16' || String(n.duration) === '32') hasSixteenth = true;
    if (n.duration === '8') hasEighth = true;
    if (n.isTriplet) hasTriplet = true;
    if (n.isDotted) hasDotted = true;
    if (typeof n.beatFraction === 'number' && n.beatFraction % 4 !== 0) {
      hasSyncopation = true;
    }
  }

  if (hasTriplet) score += 5;
  else if (hasSixteenth) score += 3;
  else if (hasSyncopation) score += 2;
  else if (hasDotted) score += 2;
  else if (hasEighth) score += 1;

  // B. Polyphonie & Stimmen-Koordination (z. B. simultane Anschläge)
  const timeBuckets: Record<string, number> = {};
  for (const n of notes) {
    const key = `${n.barIndex}_${n.beatFraction}`;
    timeBuckets[key] = (timeBuckets[key] || 0) + 1;
  }
  const maxPolyphony = Object.values(timeBuckets).reduce((m, count) => Math.max(m, count), 0);
  if (maxPolyphony >= 3) {
    score += 3; // 3-4 Stimmen Unabhängigkeit (Drums: Kick + Snare + Hi-Hat oder Klavier 4-Klang)
  } else if (maxPolyphony === 2) {
    score += 1; // 2-stimmiges Spiel / Zweiklänge
  }

  // C. Tonaler Raum & Vorzeichen
  let accidentalsCount = 0;
  for (const n of notes) {
    if (n.pitch && (n.pitch.includes('#') || n.pitch.includes('b'))) {
      accidentalsCount++;
    }
  }
  if (accidentalsCount >= 4) {
    score += 3; // Erweiterte Tonarten / Chromatik
  } else if (accidentalsCount >= 1) {
    score += 1; // 1-2 Vorzeichen (F#/Bb etc.)
  }

  // D. Taktanzahl (1 Takt Loop ist didaktisch einfacher als 2–4 Takte Formaufbau)
  if ((snippet.barsCount || 1) >= 2) {
    score += 1;
  }

  return score;
};

/**
 * 5. Autoritativer Sortier-Runner (0,1% Goldstandard)
 * Sortiert Notenschnipsel deterministisch, stabil und barrierefrei.
 */
export const sortScoreSnippets = (
  snippets: MicroScoreSnippet[],
  mode: VdmSortMode = 'didactic'
): MicroScoreSnippet[] => {
  if (!Array.isArray(snippets) || snippets.length <= 1) {
    return snippets || [];
  }

  const list = [...snippets];

  return list.sort((a, b) => {
    switch (mode) {
      case 'level_asc': {
        const lvlDiff = getVdmLevelWeight(a.vdmLevel) - getVdmLevelWeight(b.vdmLevel);
        if (lvlDiff !== 0) return lvlDiff;
        const dcsDiff = getDidacticComplexityScore(a) - getDidacticComplexityScore(b);
        if (dcsDiff !== 0) return dcsDiff;
        return a.title.localeCompare(b.title, 'de');
      }

      case 'level_desc': {
        const lvlDiff = getVdmLevelWeight(b.vdmLevel) - getVdmLevelWeight(a.vdmLevel);
        if (lvlDiff !== 0) return lvlDiff;
        const dcsDiff = getDidacticComplexityScore(b) - getDidacticComplexityScore(a);
        if (dcsDiff !== 0) return dcsDiff;
        return a.title.localeCompare(b.title, 'de');
      }

      case 'title_asc': {
        const titleDiff = a.title.localeCompare(b.title, 'de');
        if (titleDiff !== 0) return titleDiff;
        return getVdmLevelWeight(a.vdmLevel) - getVdmLevelWeight(b.vdmLevel);
      }

      case 'bpm_asc': {
        const bpmDiff = (a.tempoBpm || 80) - (b.tempoBpm || 80);
        if (bpmDiff !== 0) return bpmDiff;
        return a.title.localeCompare(b.title, 'de');
      }

      case 'recent': {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        const dateDiff = dateB - dateA;
        if (dateDiff !== 0) return dateDiff;
        return a.title.localeCompare(b.title, 'de');
      }

      case 'didactic':
      default: {
        // 1. Primär: VdM-Ausbildungsstufe (Elementar [0] -> Unterstufe [1] -> Mittelstufe [2] -> Oberstufe [3])
        const lvlDiff = getVdmLevelWeight(a.vdmLevel) - getVdmLevelWeight(b.vdmLevel);
        if (lvlDiff !== 0) return lvlDiff;

        // 2. Sekundär: VdM-Kategorie (Früherziehung -> Tonleitern -> Rhythmus -> Technik -> Melodien -> Akkorde -> Zupf -> Vokal -> BandPacks)
        const catDiff = getDidacticCategoryWeight(a.category) - getDidacticCategoryWeight(b.category);
        if (catDiff !== 0) return catDiff;

        // 3. Tertiär: Didaktischer Sub-Ordner (fuenfton -> dur -> moll -> pentatonik -> modal etc.)
        const subFolderDiff = getSubFolderWeight(a.category, a.vdmFolder) - getSubFolderWeight(b.category, b.vdmFolder);
        if (subFolderDiff !== 0) return subFolderDiff;

        // 4. Quartär: Didactic Complexity Score (DCS: Rhythmus-Raster, Polyphonie, Vorzeichen)
        const dcsDiff = getDidacticComplexityScore(a) - getDidacticComplexityScore(b);
        if (dcsDiff !== 0) return dcsDiff;

        // 5. Quintär: Moderates Tempo aufsteigend (didaktisch ruhiger Einstieg)
        const bpmDiff = (a.tempoBpm || 80) - (b.tempoBpm || 80);
        if (bpmDiff !== 0) return bpmDiff;

        // 6. Deterministischer Tie-Breaker: Alphabetisch nach Titel
        return a.title.localeCompare(b.title, 'de');
      }
    }
  });
};

/**
 * 6. VdM 4-Stufen Farb-Harmonie (Apple 2-Farben-Doktrin, border: none)
 * Liefert für jede Ausbildungsstufe exakt abgestimmte, barrierefreie Soft-Tints.
 */
export interface VdmLevelColorMeta {
  levelWeight: number;
  label: string;
  shortLabel: string;
  bg: string;
  text: string;
  badgeBg: string;
  badgeText: string;
  accent: string;
}

export const VDM_LEVEL_COLORS: Record<number, VdmLevelColorMeta> = {
  0: {
    levelWeight: 0,
    label: 'Elementarstufe',
    shortLabel: 'Elementar',
    bg: '#d1fae5',
    text: '#047857',
    badgeBg: '#d1fae5',
    badgeText: '#047857',
    accent: '#10b981'
  },
  1: {
    levelWeight: 1,
    label: 'Unterstufe',
    shortLabel: 'Leicht',
    bg: '#dbeafe',
    text: '#1d4ed8',
    badgeBg: '#dbeafe',
    badgeText: '#1d4ed8',
    accent: '#3b82f6'
  },
  2: {
    levelWeight: 2,
    label: 'Mittelstufe',
    shortLabel: 'Mittel',
    bg: '#fef9c3',
    text: '#854d0e',
    badgeBg: '#fef9c3',
    badgeText: '#854d0e',
    accent: '#facc15'
  },
  3: {
    levelWeight: 3,
    label: 'Oberstufe',
    shortLabel: 'Schwer',
    bg: '#f3e8ff',
    text: '#7e22ce',
    badgeBg: '#f3e8ff',
    badgeText: '#7e22ce',
    accent: '#a855f7'
  }
};

export const getVdmLevelColor = (level?: string): VdmLevelColorMeta => {
  const w = getVdmLevelWeight(level);
  return VDM_LEVEL_COLORS[w] || VDM_LEVEL_COLORS[1];
};

