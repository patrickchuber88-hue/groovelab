/**
 * 🛡️ Campus-Groovelab Safe-Harbor Respect-Guard Engine
 * Revisionssichere Inhalts- und Jugendschutzprüfung für den didaktischen Schul-Chat.
 * 
 * Rechtsgrundlagen:
 * - §§ 832, 823 BGB: Entlastung der schulischen Aufsichtspflicht vor Cybermobbing
 * - §§ 86a, 130 StGB: Schutz vor Extremismus, Verfassungsfeindlichkeit & Volksverhetzung
 * - § 185 StGB: Schutz vor schwerer personaler Schmähkritik & Ehrverletzung
 * - §§ 184 ff. StGB & JuSchG: Schutz von Minderjährigen vor sexueller Belästigung / Grooming
 * - § 241 StGB: Schutz vor Bedrohung und Selbstgefährdung (§ 8a SGB VIII Kindeswohl)
 * - Art. 25 DSGVO: 100 % Client-seitig, null Daten-Tracking, kein Drittanbieter-Leakage
 */

export interface ChatRespectValidationResult {
  isValid: boolean;
  matchedTerm?: string;
  category?: 'extremism' | 'insult' | 'harassment' | 'threat';
  reason?: string;
  isCrisis?: boolean;
}

export interface CrisisSupportInfo {
  isCrisis: boolean;
  title: string;
  helpline: string;
  phone: string;
  url: string;
}

export const CRISIS_HELPLINE_INFO: CrisisSupportInfo = {
  isCrisis: true,
  title: 'Nummer gegen Kummer (Kinder- & Jugendtelefon)',
  helpline: 'Kostenlose, anonyme und vertrauliche Beratung',
  phone: '116 111',
  url: 'https://www.nummergegenkummer.de'
};

// 🎵 Die Musik-Whitelist („Fagott- & Notenständer-Regel“)
// Fachbegriffe aus dem Musikschulunterricht, die niemals fälschlicherweise blockiert werden dürfen
const MUSIC_PEDAGOGY_WHITELIST: readonly string[] = [
  'fagott',
  'fagottist',
  'fagotte',
  'notenständer',
  'notenstaender',
  'mikrofonständer',
  'mikrofonstaender',
  'gitarrenständer',
  'gitarrenstaender',
  'boxenständer',
  'boxenstaender',
  'notenpult',
  'anschlag',
  'tastenanschlag',
  'saitenanschlag',
  'blasinstrument',
  'holzblasinstrument',
  'blechblasinstrument',
  'mundstück',
  'mundstueck',
  'dämpfer',
  'daempfer',
  'pedal',
  'plektrum',
  'plektren',
  'saite',
  'saiten',
  'triole',
  'quartole',
  'quintole',
  'sextole',
  'krawall',
  'wirbel'
];

interface GuardPattern {
  category: 'extremism' | 'insult' | 'harassment' | 'threat';
  reason: string;
  regex: RegExp;
  isCrisis?: boolean;
}

const GUARD_PATTERNS: readonly GuardPattern[] = [
  // 1. Extremismus, Rassismus & Verfassungsfeindlichkeit (§§ 86a, 130 StGB)
  {
    category: 'extremism',
    reason: 'Verfassungsfeindliche oder rassistische Hassrede ist im Schul-Chat streng verboten (§§ 86a, 130 StGB).',
    regex: /\b(sieg\s*heil|heil\s*hitler|hakenkreuz|judensau|kanak[en]*|nigg[aer]*|neger|scheiss\s*(ausl[aä]nder|jude[n]*|t[uü]rk[en]*))\b/i
  },

  // 2. Schwere personale Ehrverletzung & Schmähkritik (§ 185 StGB)
  {
    category: 'insult',
    reason: 'Beleidigungen und herabwürdigende Ausdrücke verletzen die Regeln eines wertschätzenden Unterrichtsumfelds (§ 185 StGB).',
    regex: /\b(arschloch|hurensohn|hur[en]*|fotz[en]*|wichser|wichs|bastard|missgeburt|spast[i]*|behindi|halt\s*die\s*fresse|fick\s*dich|verpiss\s*dich|mistst[uü]ck|scheisskerl|depp[en]*|vollidiot)\b/i
  },

  // 3. Sexuelle Belästigung & Obszönitäten (JuSchG / § 184 StGB)
  {
    category: 'harassment',
    reason: 'Sexuelle Belästigung und vulgäre Obszönitäten sind zum Schutz Minderjähriger untersagt (JuSchG).',
    regex: /\b(schwanzlutscher|pimmel|penis|vagina|titten|nutte[n]*|schlampe[n]*|nacktbild[er]*|zieh\s*dich\s*aus|sex\s*chat|blowjob)\b/i
  },

  // 4. Schwere Gewaltandrohung & Selbstgefährdung (§ 241 StGB / § 8a SGB VIII)
  {
    category: 'threat',
    reason: 'Gewaltdrohungen und Aufforderungen zur Selbstgefährdung sind strafbar (§ 241 StGB).',
    regex: /\b(ich\s*(bring|schlag|stech|knall)\s*dich\s*(um|tot|ab)|bring\s*dich\s*um|krepier[en]*|t[oö]te\s*dich|ich\s*bring\s*mich\s*um|ich\s*will\s*sterben)\b/i,
    isCrisis: true
  }
];

/**
 * Normalisiert Text, um gängige Umgehungsversuche (Leetspeak, unnatürliche Leerzeichen) aufzudecken
 */
function normalizeForGuard(text: string): string {
  return text
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/0/g, 'o')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i');
}

/**
 * Validiert eine Chat-Nachricht gegen die 4 No-Bullying-Kategorien
 * unter absolutem Schutz der musikpädagogischen Whitelist.
 */
export function validateChatMessageContent(content: string | null | undefined): ChatRespectValidationResult {
  if (!content) {
    return { isValid: true };
  }

  const rawTrimmed = content.trim();
  if (!rawTrimmed) {
    return { isValid: true };
  }

  const normalized = normalizeForGuard(rawTrimmed);

  // 1. Prüfen, ob die Nachricht ausschließlich aus Whitelist-Begriffen im Fachkontext besteht
  for (const pattern of GUARD_PATTERNS) {
    const match = normalized.match(pattern.regex);
    if (match && match[0]) {
      const detectedTerm = match[0].trim();

      // Schutzprüfung gegen Whitelist: Prüfen, ob der Treffer Teil eines erlaubten Fachbegriffs ist
      const isWhitelisted = MUSIC_PEDAGOGY_WHITELIST.some(allowed => {
        return normalized.includes(allowed) && allowed.includes(detectedTerm);
      });

      if (!isWhitelisted) {
        const isCrisis = pattern.isCrisis || detectedTerm.includes('bring mich um') || detectedTerm.includes('will sterben');
        return {
          isValid: false,
          matchedTerm: detectedTerm,
          category: pattern.category,
          reason: pattern.reason,
          isCrisis
        };
      }
    }
  }

  return { isValid: true };
}

export interface QuietHoursConfig {
  enabled?: boolean;
  start_time?: string; // Format: "HH:mm" e.g. "19:00"
  end_time?: string;   // Format: "HH:mm" e.g. "07:30"
  weekend_all_day?: boolean;
}

export const DEFAULT_QUIET_HOURS_CONFIG: Required<QuietHoursConfig> = {
  enabled: true,
  start_time: '19:00',
  end_time: '07:30',
  weekend_all_day: true
};

function parseTimeToDecimal(timeStr: string | undefined, fallback: number): number {
  if (!timeStr) return fallback;
  const parts = timeStr.split(':').map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] + parts[1] / 60;
  }
  return fallback;
}

/**
 * Feierabend- & Ruhezeiten-Prüfung (Schutz der Lehrkräfte-Freiwilligkeit & Subsidiarität)
 * Unterstützt Standard-Werte sowie individuelle Lehrkräfte-Konfigurationen.
 */
export function isQuietHoursActive(
  config?: QuietHoursConfig | null,
  date: Date = new Date()
): boolean {
  if (config && config.enabled === false) {
    return false;
  }

  const startDecimal = parseTimeToDecimal(config?.start_time, 19.0); // 19:00
  const endDecimal = parseTimeToDecimal(config?.end_time, 7.5);     // 07:30
  const weekendAllDay = config?.weekend_all_day !== false;

  const day = date.getDay(); // 0 = Sonntag, 6 = Samstag
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentTimeDecimal = hours + minutes / 60;

  // Wochenende ganztägig prüfen
  if (weekendAllDay && (day === 0 || day === 6)) {
    return true;
  }

  // Übernacht-Intervall (z. B. 19:00 bis 07:30)
  if (startDecimal > endDecimal) {
    if (currentTimeDecimal >= startDecimal || currentTimeDecimal < endDecimal) {
      return true;
    }
  } else {
    // Normales Tagesintervall (z. B. 12:00 bis 14:00)
    if (currentTimeDecimal >= startDecimal && currentTimeDecimal < endDecimal) {
      return true;
    }
  }

  return false;
}
