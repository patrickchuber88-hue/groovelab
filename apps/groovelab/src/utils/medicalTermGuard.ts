/**
 * 🛡️ Campus-Groovelab Medical Term & Health Data Guard
 * Standard: DSGVO Art. 9 Abs. 1 / BDSG § 26 / OWASP ASVS Level 3
 * 
 * Verhindert die unkontrollierte Infiltration von besonderen Kategorien personenbezogener Daten
 * (Gesundheitsdaten, Diagnosen, Symptome, Medikamente, ICD-10) in Freitext-Chats und Notizen.
 */

// 🏥 Sensible medizinische Signalwörter (deutschsprachiger Raum)
const MEDICAL_HEALTH_KEYWORDS: readonly string[] = [
  // Allgemeine Symptome & Krankheitsbegriffe
  'krankheit', 'krankmeldung', 'krankgeschrieben', 'krankschreibung', 'erkrankung',
  'fieber', 'erbrechen', 'durchfall', 'magen-darm', 'grippe', 'infektion', 'quarantäne',
  'corona', 'covid', 'hustenanfall', 'lungenentzündung', 'scharlach', 'windpocken',
  // Chronische, psychische & neurologische Begriffe
  'adhs', 'ads', 'autismus', 'asperger', 'depression', 'depressiv', 'angststörung',
  'panikattacke', 'epilepsie', 'krampfanfall', 'trauma', 'psychotherapie', 'psychiater',
  'psychologe', 'behindertenausweis', 'behinderungsgrad', 'gdb', 'schwerbehinderung',
  // Behandlung, Kliniken & Medizinisches Personal
  'krankenhaus', 'klinik', 'notaufnahme', 'operation', 'operiert', 'arztbesuch',
  'arzttermin', 'kinderarzt', 'hno-arzt', 'orthopäde', 'neurologe', 'therapie',
  'physiotherapie', 'ergotherapie', 'logopädie', 'chemotherapie', 'reha', 'kur',
  // Medikamente & Atteste
  'attest', 'ärztliches attest', 'rezept', 'medikament', 'antibiotika', 'cortison',
  'antidepressiva', 'schmerzmittel', 'insulin', 'inhalator', 'krücken', 'gipsarm'
];

export interface HealthDataDetectionResult {
  hasHealthData: boolean;
  matchedTerm?: string;
  sanitizedText?: string;
}

/**
 * Prüft einen Freitext auf das Vorhandensein von Art. 9 DSGVO Gesundheitsdaten.
 * Nutzt Wortgrenzen (\b), um Fehlalarme bei harmlosen Silben zu verhindern.
 */
export function detectHealthDataTerms(text: string): HealthDataDetectionResult {
  if (!text || typeof text !== 'string') {
    return { hasHealthData: false };
  }

  const normalized = text.toLowerCase();

  for (const term of MEDICAL_HEALTH_KEYWORDS) {
    // Wortgrenzen-Regex mit Unicode-Unterstützung
    const regex = new RegExp(`(^|[^a-zäöüß])${term}([^a-zäöüß]|$)`, 'i');
    if (regex.test(normalized)) {
      return {
        hasHealthData: true,
        matchedTerm: term,
        sanitizedText: sanitizeHealthDataTerms(text)
      };
    }
  }

  return { hasHealthData: false };
}

/**
 * Ersetzt medizinische Signalwörter deterministisch durch eine neutrale Formulierung.
 */
export function sanitizeHealthDataTerms(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let result = text;
  for (const term of MEDICAL_HEALTH_KEYWORDS) {
    const regex = new RegExp(`(^|[^a-zäöüß])${term}([^a-zäöüß]|$)`, 'gi');
    result = result.replace(regex, (match, prefix, suffix) => {
      return `${prefix}[gesundheitliche Angabe neutralisiert]${suffix}`;
    });
  }
  return result;
}
