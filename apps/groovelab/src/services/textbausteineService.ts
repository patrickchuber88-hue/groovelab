/**
 * 🏛️ Campus-Groovelab Textbausteine Single Source of Truth (SSOT) Service
 * textbausteineService.ts
 * 
 * 0,1% Goldstandard:
 * - Kapselt die 18 kanonischen didaktischen Lehrplan-Bausteine in 3 Kernkategorien:
 *   1. 🥁 Rhythmus & Timing (Bernstein / Gold)
 *   2. 🎹 Technik & Bewegungsökonomie (Smaragd / Grün)
 *   3. 🎭 Ausdruck & Performance (Urtext / Violett)
 * - Garantiert das Unifarben- & Monochrom-Kontur-Axiom (Tone-in-Tone Paletten, Kontrast >= 5:1)
 * - Verwaltet Multi-Tenant Persistenz in LocalStorage mit Fallback-Kette und Auto-Healing
 */

export interface Textbaustein {
  id: string;
  label: string;
  text: string;
  type: 'both' | 'songs' | 'lehrwerke';
  category: 'rhythm' | 'technique' | 'performance' | string;
  active: boolean;
}

export interface TextbausteinCategoryTheme {
  id: 'rhythm' | 'technique' | 'performance' | string;
  label: string;
  shortLabel: string;
  emoji: string;
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  accent: string;
  glow: string;
}

export const TEXTBAUSTEIN_CATEGORY_THEMES: Record<string, TextbausteinCategoryTheme> = {
  rhythm: {
    id: 'rhythm',
    label: 'Rhythmus & Timing',
    shortLabel: 'Rhythmus',
    emoji: '',
    bg: '#fefce8',       // Amber-50
    border: '#fef08a',   // Amber-200 Tone-in-Tone
    text: '#854d0e',     // Amber-800, Kontrast 7,4:1
    badgeBg: '#fef9c3',  // Amber-100
    accent: '#d97706',   // Amber-600
    glow: 'rgba(217, 119, 6, 0.16)'
  },
  technique: {
    id: 'technique',
    label: 'Technik & Bewegungsökonomie',
    shortLabel: 'Technik',
    emoji: '',
    bg: '#f0fdf4',       // Emerald-50
    border: '#bbf7d0',   // Emerald-200 Tone-in-Tone
    text: '#166534',     // Emerald-800, Kontrast 6,8:1
    badgeBg: '#dcfce7',  // Emerald-100
    accent: '#16a34a',   // Emerald-600
    glow: 'rgba(22, 163, 74, 0.16)'
  },
  performance: {
    id: 'performance',
    label: 'Ausdruck & Performance',
    shortLabel: 'Ausdruck',
    emoji: '',
    bg: '#faf5ff',       // Purple-50
    border: '#e9d5ff',   // Purple-200 Tone-in-Tone
    text: '#6b21a8',     // Purple-800, Kontrast 7,1:1
    badgeBg: '#f3e8ff',  // Purple-100
    accent: '#9333ea',   // Purple-600
    glow: 'rgba(147, 51, 234, 0.16)'
  }
};

// Aliases for component backwards-compatibility
export const TEXTBAUSTEINE_THEMES = TEXTBAUSTEIN_CATEGORY_THEMES;
export type DidacticTextbaustein = Textbaustein;

export const DEFAULT_TEXTBAUSTEINE: Textbaustein[] = [
  // Rhythmus & Timing (Puls & Grooves)
  { id: 'r1', label: 'Puls-Master', text: 'Klopfe den Puls mit dem Fuß und klatsche den Rhythmus im Vorfeld. Spreche die Notenwerte laut mit – dein innerer Puls ist das Fundament jedes Grooves!', type: 'both', category: 'rhythm', active: true },
  { id: 'r2', label: 'Metronom-Buddy', text: 'Starte mit dem Metronom bei einem entspannten Entschleunigungs-Tempo. Erhöhe das Tempo erst in 5er-Schritten, wenn die Passage 3-mal in Folge makellos im Takt lag.', type: 'both', category: 'rhythm', active: true },
  { id: 'r3', label: 'Schnecken-Tempo', text: 'Zerlege die schwierige Stelle in echtes Lupen-Tempo. Wenn du jede Bewegung extrem langsam und präzise ausführst, schaltet dein Gehirn automatisch in den Turbo-Modus!', type: 'both', category: 'rhythm', active: true },
  { id: 'r4', label: 'Puzzle-Taktik', text: 'Verbinde Mikromodule: Übe nicht das ganze Stück auf einmal, sondern isoliere genau einen Takt. Erst wenn dieses Puzzleteil perfekt sitzt, baust du die Brücke zum nächsten Takt.', type: 'both', category: 'rhythm', active: true },
  { id: 'r5', label: 'Klatsch-Gehen', text: 'Bewege deinen Körper im gleichmäßigen Gehtakt durch den Raum und klatsche die Melodie synchron dazu. So verankerst du das Rhythmusgefühl im ganzen Körper!', type: 'both', category: 'rhythm', active: true },
  { id: 'r6', label: 'Dehnungs-Übung', text: 'Spiele den Bewegungsablauf in doppelter Notenlänge vollkommen gedehnt durch. Spüre genau, wie deine Finger oder Hände den nächsten Ton vorausschauend vorbereiten.', type: 'both', category: 'rhythm', active: true },

  // Technik & Bewegungsökonomie
  { id: 't1', label: 'Ritter-Dreierspiel', text: 'Mastery-Regel: Wiederhole den kniffligen Übergang exakt dreimal hintereinander ohne den kleinsten Fehler. Das brennt die Bewegung direkt ins Muskelgedächtnis ein!', type: 'both', category: 'technique', active: true },
  { id: 't2', label: 'Blind-Flug', text: 'Schließe beim Spielen bewusst die Augen und aktiviere deine innere Klangvorstellung. Vertraue deinem Tastsinn und dem Raumgefühl deiner Hände!', type: 'both', category: 'technique', active: true },
  { id: 't3', label: 'Fokus-Gym', text: 'Führe die Bewegungsabläufe in Zeitlupe bei minimalem Kraftaufwand aus. Achte auf maximale Lockerheit in Schultern, Handgelenken und Fingern.', type: 'both', category: 'technique', active: true },
  { id: 't4', label: 'Detail-Detektiv', text: 'Verfolge das Notenbild mit geschärftem Blick: Prüfe Vorzeichen, Artikulation (Staccato/Legato) und Fingersätze haargenau. Kein akustisches Detail bleibt unentdeckt!', type: 'lehrwerke', category: 'technique', active: true },
  { id: 't5', label: 'Hürden-Sprung', text: 'Isoliere die kritische Bewegungsschnittstelle: Übe gezielt nur den Zielwechsel vom letzten Ton des alten Taktes auf den ersten Ton des neuen Taktes.', type: 'both', category: 'technique', active: true },
  { id: 't6', label: 'Relax-Übung', text: 'Scanne deinen Körper während des Spiels auf unnötige Spannung. Lass alle Muskeln, die gerade nicht aktiv gebraucht werden, völlig entspannt und gelöst.', type: 'both', category: 'technique', active: true },

  // Ausdruck, Klangkultur & Performance
  { id: 'p1', label: 'Laut-Leise-Zauber', text: 'Erschaffe dramaturgische Kontraste! Gestalte den dynamischen Bogen spürbar zwischen zartem Pianissimo und kraftvollem Forte – gib den Tönen Raum zum Atmen.', type: 'both', category: 'performance', active: true },
  { id: 'p2', label: 'Eigener Remix', text: 'Kreativitäts-Challenge: Überlege dir eine eigene stilistische Variation, ein cooles Lick oder eine kleine Verzierung für diesen Abschnitt. Bring deine eigene musikalische Handschrift ein!', type: 'songs', category: 'performance', active: true },
  { id: 'p3', label: 'Storyteller', text: 'Welche Emotion oder Geschichte steckt in diesen Takten? Forme jeden Ton so, als würdest du einer Zuhörerschaft ein spannendes oder berührendes Abenteuer erzählen.', type: 'both', category: 'performance', active: true },
  { id: 'p4', label: 'Atem-Fluss', text: 'Forme Phrasen wie ein erfahrener Sänger: Atme vor dem Phrasenbeginn ein und führe den Bogen organisch bis zum Entspannungspunkt der Phrase.', type: 'both', category: 'performance', active: true },
  { id: 'p5', label: 'Echo-Spiel', text: 'Spiel mit Klangschattierungen: Gestalte die Phrasenwiederholung als zartes, fernes Echo aus den Bergen mit reduzierter Anschlagsintensität.', type: 'both', category: 'performance', active: true },
  { id: 'p6', label: 'Scheinwerfer-An', text: 'Bühnen-Simulation: Spiele das Stück ohne Unterbrechung von Anfang bis Ende durch. Wenn ein kleiner Wackler passiert, spiele unbeeindruckt im Puls weiter – wie ein echter Profi auf der Bühne!', type: 'both', category: 'performance', active: true }
];

/**
 * Löst das Farbthema für eine Kategorie oder ID deterministisch auf.
 */
export function getTextbausteinCategoryTheme(categoryOrId?: string): TextbausteinCategoryTheme {
  const norm = (categoryOrId || '').toLowerCase().trim();
  if (norm.includes('rhythm') || norm.includes('rhythmus') || norm.includes('timing')) {
    return TEXTBAUSTEIN_CATEGORY_THEMES.rhythm;
  }
  if (norm.includes('techni') || norm.includes('motorik') || norm.includes('haltung')) {
    return TEXTBAUSTEIN_CATEGORY_THEMES.technique;
  }
  if (norm.includes('perform') || norm.includes('ausdruck') || norm.includes('klang')) {
    return TEXTBAUSTEIN_CATEGORY_THEMES.performance;
  }
  // Fallback zu Technik (Campus-Grün)
  return TEXTBAUSTEIN_CATEGORY_THEMES.technique;
}

/**
 * Liest die Textbausteine für eine Schule mit kaskadierendem Fallback und Auto-Healing ein.
 */
export function fetchSchoolTextbausteine(schoolId?: string | number): Textbaustein[] {
  if (typeof window === 'undefined') return DEFAULT_TEXTBAUSTEINE;

  try {
    let stored: string | null = null;
    if (schoolId) {
      stored = localStorage.getItem(`campus_textbausteine_${schoolId}`) ||
               localStorage.getItem(`groovelab_textbausteine_${schoolId}`);
    }
    if (!stored) {
      stored = localStorage.getItem('campus_textbausteine') || localStorage.getItem('groovelab_textbausteine');
    }

    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length >= 10) {
        // Auto-Healing: Emojis aus bestehenden Cache-Einträgen säubern
        return parsed.map((item: any) => ({
          ...item,
          label: (item.label || '').replace(/^[\p{Emoji}\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u, '').trim()
        }));
      }
    }
  } catch (e) {
    console.warn('[textbausteineService] Error loading stored textbausteine:', e);
  }

  return DEFAULT_TEXTBAUSTEINE;
}

/**
 * Speichert Textbausteine atomar für eine Schule.
 */
export function saveSchoolTextbausteine(schoolId: string | number, items: Textbaustein[]): void {
  if (typeof window === 'undefined' || !schoolId || !Array.isArray(items)) return;

  try {
    const serialized = JSON.stringify(items);
    localStorage.setItem(`campus_textbausteine_${schoolId}`, serialized);
    // Cross-Tab Broadcast Event
    window.dispatchEvent(new CustomEvent('campus_textbausteine_updated', { detail: { schoolId, count: items.length } }));
  } catch (e) {
    console.warn('[textbausteineService] Error saving textbausteine:', e);
  }
}
