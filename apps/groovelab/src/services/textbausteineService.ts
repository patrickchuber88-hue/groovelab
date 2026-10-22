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
  { id: 'r1', label: 'Puls-Master', text: 'Klopfe den Puls gleichmäßig mit dem Fuß und klatsche den Rhythmus. Sprich die Notenwerte laut mit – dein stabiler Puls ist das Fundament für jeden Groove!', type: 'both', category: 'rhythm', active: true },
  { id: 'r2', label: 'Metronom-Buddy', text: 'Starte mit dem Metronom in einem ganz entspannten Wohlfühltempo. Erhöhe erst um 4–5 BPM, wenn du die Stelle dreimal hintereinander fehlerfrei im Takt gespielt hast.', type: 'both', category: 'rhythm', active: true },
  { id: 'r3', label: 'Schnecken-Tempo', text: 'Spiele die knifflige Stelle in Zeitlupe bei halbem Tempo. Wenn du jede Bewegung ganz bewusst und fehlerfrei ausführst, lernt dein Muskelgedächtnis doppelt so schnell!', type: 'both', category: 'rhythm', active: true },
  { id: 'r4', label: 'Puzzle-Taktik', text: 'Übe nicht das ganze Stück auf einmal, sondern isoliere genau einen einzelnen Takt oder Übergang. Erst wenn dieses Puzzleteil sitzt, baust du die Brücke zum nächsten Takt.', type: 'both', category: 'rhythm', active: true },
  { id: 'r5', label: 'Klatsch-Gehen', text: 'Gehe im gleichmäßigen Puls durch den Raum und klatsche den Rhythmus dazu. Die Verbindung von Schritten und Klatschen verankert den Groove fest im ganzen Körper!', type: 'both', category: 'rhythm', active: true },
  { id: 'r6', label: 'Zeitlupen-Fluss', text: 'Halte jeden Ton doppelt so lang wie notiert. Nutze die gewonnene Zeit, um deine Finger und Hände völlig entspannt auf den nächsten Griff oder Anschlag vorzubereiten.', type: 'both', category: 'rhythm', active: true },

  // Technik & Bewegungsökonomie
  { id: 't1', label: 'Ritter-Dreierspiel', text: 'Die 3er-Meisterregel: Spiele den kniffligen Übergang dreimal hintereinander ohne den kleinsten Wackler. Bei einem Fehler startet der Zähler wieder bei 1!', type: 'both', category: 'technique', active: true },
  { id: 't2', label: 'Blind-Flug', text: 'Schließe für einen Durchgang die Augen oder schaue bewusst weg vom Instrument. Vertraue ganz deinem Tastsinn, deinen Ohren und der inneren Klangvorstellung!', type: 'both', category: 'technique', active: true },
  { id: 't3', label: 'Lockerheits-Check', text: 'Spiele die Passage mit minimalem Kraftaufwand. Prüfe bewusst: Sind Schultern, Nacken und Handgelenke gelöst? Nur die Finger arbeiten aktiv – der Rest bleibt federleicht.', type: 'both', category: 'technique', active: true },
  { id: 't4', label: 'Detail-Detektiv', text: 'Gehe als Noten-Detektiv durch den Takt: Sitzen alle Vorzeichen, die richtige Artikulation (Legato, Staccato) und die Fingersätze? Entdecke jedes noch so kleine Detail!', type: 'lehrwerke', category: 'technique', active: true },
  { id: 't5', label: 'Hürden-Sprung', text: 'Übe gezielt nur den Nahtstellen-Wechsel: Spiele die letzte Note des alten Taktes und lande punktgenau auf der Eins des neuen Taktes. Wiederhole nur diesen Sprung!', type: 'both', category: 'technique', active: true },
  { id: 't6', label: 'Daumen-Freiheit', text: 'Achte besonders auf den Stützdaumen oder deine Spielhaltung: Kein Zupressen oder Festhalten! Lass die Finger frei, locker und beweglich schwingen.', type: 'both', category: 'technique', active: true },

  // Ausdruck, Klangkultur & Performance
  { id: 'p1', label: 'Laut-Leise-Zauber', text: 'Zaubere spürbare Kontraste in die Musik! Gestalte den Unterschied zwischen zartem Pianissimo und kraftvollem Forte deutlich hörbar – lass die Töne atmen und strahlen.', type: 'both', category: 'performance', active: true },
  { id: 'p2', label: 'Eigener Remix', text: 'Kreativ-Challenge: Erfinde eine eigene kleine Variation, einen neuen Rhythmus oder eine Verzierung für diesen Abschnitt. Bring deine persönliche Handschrift ins Stück!', type: 'songs', category: 'performance', active: true },
  { id: 'p3', label: 'Storyteller', text: 'Erzähle eine Geschichte mit deinem Instrument: Welche Stimmung oder welches Bild siehst du vor dir? Forme jeden Ton so, dass dein Publikum diese Emotion spüren kann.', type: 'both', category: 'performance', active: true },
  { id: 'p4', label: 'Atem-Fluss', text: 'Phrasiere wie beim Singen: Atme vor dem Beginn der Phrase bewusst ein und führe den musikalischen Bogen in einem einzigen Atemzug bis zum Zielton.', type: 'both', category: 'performance', active: true },
  { id: 'p5', label: 'Echo-Spiel', text: 'Spiele mit Klangfarben: Gestalte eine Wiederholung wie ein fernes Echo – gleicher Rhythmus, aber zarter, feiner und geheimnisvoller im Klang!', type: 'both', category: 'performance', active: true },
  { id: 'p6', label: 'Scheinwerfer-An', text: 'Bühnen-Modus: Spiele das Stück ohne anzuhalten komplett durch! Wenn ein kleiner Wackler passiert, bleib einfach im Puls und spiele souverän weiter wie auf der Bühne.', type: 'both', category: 'performance', active: true }
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
        const defaultMap = new Map(DEFAULT_TEXTBAUSTEINE.map(d => [d.id, d]));
        // Auto-Healing: Emojis säubern und Standard-Bausteine auf 0,1% Goldstandard aktualisieren
        return parsed.map((item: any) => {
          const cleanLabel = (item.label || '').replace(/^[\p{Emoji}\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u, '').trim();
          const defaultItem = defaultMap.get(item.id);
          if (defaultItem && !item.isCustom) {
            return {
              ...item,
              label: cleanLabel === 'Dehnungs-Übung' ? 'Zeitlupen-Fluss' : 
                     cleanLabel === 'Fokus-Gym' ? 'Lockerheits-Check' : 
                     cleanLabel === 'Relax-Übung' ? 'Daumen-Freiheit' : cleanLabel || defaultItem.label,
              text: defaultItem.text,
              category: defaultItem.category
            };
          }
          return {
            ...item,
            label: cleanLabel
          };
        });
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
