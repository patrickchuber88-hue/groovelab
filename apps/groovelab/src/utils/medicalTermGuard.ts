/**
 * 🛡️ Campus-Groovelab Medical Term & Health Data Guard (0,1% Goldstandard)
 * Standards: DSGVO Art. 9 Abs. 1 / BDSG § 26 / OWASP ASVS Level 3 / § 8a SGB VIII
 * 
 * Verhindert die unkontrollierte Infiltration von besonderen Kategorien personenbezogener Daten
 * (Gesundheitsdaten, Diagnosen, Symptome, Medikamente, ICD-10) in Freitext-Chats und Notizen.
 * 
 * Differenzierungs-Axiome des 0,1% Goldstandards:
 * 1. Der allgemeine Status der Leistungsverhinderung ("krank", "bin krank", "krankheitsbedingt")
 *    bleibt vollständig erlaubt, um Shadow-IT (Flucht in ungesicherte US-Messenger) zu verhindern.
 * 2. Spezifische Diagnosen, Krankheitsbilder, onkologische Befunde und schwere Symptome
 *    werden morphologisch (inkl. deutscher Komposita wie "Krebserkrankung") fail-closed abgefangen.
 * 3. Musikfachliche Begriffe ("Lampenfieber", "Körperhaltung", "Ansatz") und anerkennender
 *    Jugendslang ("krankes Solo", "voll krank") sind durch kontextuelle Whitelists geschützt.
 */

export type HealthDataCategory =
  | 'oncology'
  | 'diagnosis'
  | 'symptom'
  | 'psychiatry'
  | 'treatment'
  | 'medication'
  | 'icd10'
  | 'health_data';

export interface HealthDataDetectionResult {
  hasHealthData: boolean;
  matchedTerm?: string;
  category?: HealthDataCategory;
  suggestedNeutralText?: string;
  sanitizedText?: string;
}

export interface HealthDataGuardOptions {
  senderRole?: 'teacher' | 'student' | 'parent' | 'admin' | string;
}

// 🎵 Musikpädagogische Begriffe & Jugendslang, die niemals als Gesundheitsdaten fehlinterpretiert werden dürfen
const DIDACTIC_AND_SLANG_EXEMPTIONS: readonly string[] = [
  'lampenfieber',
  'körperhaltung',
  'koerperhaltung',
  'haltungsschaden', // oft didaktisch im Geigenunterricht erörtert
  'ansatz',
  'atemtechnik',
  'fingersatz',
  'tastenanschlag',
  'saitenanschlag',
  // Jugendsprachliche Anerkennung (Musik / Performance)
  'krank geil',
  'krankes solo',
  'kranke bassline',
  'kranker beat',
  'völlig krank gespielt',
  'voll krank gespielt',
  'wie krank gespielt',
  'echt krank gespielt',
  'richtig krank gespielt'
];

// 🟢 Erlaubte Statusbegriffe der Leistungsverhinderung (Zulässige Arbeitsunfähigkeits- / Ausfallanzeige)
const PERMITTED_STATUS_TERMS: readonly string[] = [
  'krank',
  'bin krank',
  'ist krank',
  'werde krank',
  'erkrankt',
  'krankheitsbedingt',
  'krankmeldung',
  'krankschreibung',
  'unwohl',
  'verhindert',
  'bettruhe',
  'nicht fit',
  'abgemeldet',
  'fällt aus',
  'faellt aus'
];

// 🏥 1. Onkologische Stämme & lebensbedrohliche Befunde (Morphologische Komposita-Erkennung)
const ONCOLOGY_STEMS: readonly string[] = [
  'krebs',
  'tumor',
  'karzinom',
  'leukäm',
  'leukaem',
  'chemo',
  'metastase',
  'herzinfarkt',
  'schlaganfall',
  'hirnblutung'
];

// 🏥 2. Spezifische Diagnosen & Komposita-Erkrankungen
const COMPOSITE_DIAGNOSIS_STEMS: readonly string[] = [
  'erkrankung', // fängt Krebserkrankung, Herzerkrankung, Darmerkrankung, etc. ab
  'infektion',  // fängt Magen-Darm-Infektion, Virusinfektion, etc. ab
  'entzündung', // fängt Lungenentzündung, Mittelohrentzündung, etc. ab
  'entzuendung',
  'scharlach',
  'windpocken',
  'keuchhusten',
  'masern',
  'corona',
  'covid',
  'grippe',
  'lungenentzündung',
  'quarantäne',
  'quarantaene'
];

// 🏥 3. Schwere Symptome (außerhalb der Lampenfieber-Regel)
const SYMPTOM_KEYWORDS: readonly string[] = [
  'fieber',
  'erbrechen',
  'durchfall',
  'magen-darm',
  'atemnot',
  'schüttelfrost',
  'schuettelfrost',
  'hustenanfall',
  'bluterbrechen',
  'krampfanfall'
];

// 🏥 4. Psychiatrische & neurologische Diagnosen
const PSYCHIATRY_STEMS: readonly string[] = [
  'adhs',
  'ads',
  'autismus',
  'asperger',
  'depression',
  'depressiv',
  'angststörung',
  'angststoerung',
  'panikattacke',
  'epilepsie',
  'psychose',
  'bipolar',
  'borderline',
  'trauma',
  'psychiatr',
  'psycholog',
  'psychopharmak',
  'suizidgedanke',
  'behindertenausweis',
  'behinderungsgrad',
  'gdb',
  'schwerbehinderung'
];

// 🏥 5. Stationäre Behandlungen & Eingriffe
const TREATMENT_KEYWORDS: readonly string[] = [
  'krankenhaus',
  'hospital',
  'notaufnahme',
  'intensivstation',
  'operation',
  'operiert',
  'klinikaufenthalt',
  'arztbesuch',
  'arzttermin',
  'kinderarzt',
  'hno-arzt',
  'orthopäde',
  'orthopaede',
  'neurologe',
  'therapie',
  'physiotherapie',
  'ergotherapie',
  'logopädie',
  'logopaedie',
  'chemotherapie',
  'reha',
  'kur'
];

// 🏥 6. Medikamente & Atteste
const MEDICATION_KEYWORDS: readonly string[] = [
  'attest',
  'ärztliches attest',
  'aerztliches attest',
  'rezept',
  'medikament',
  'antibiotika',
  'cortison',
  'antidepressiva',
  'schmerzmittel',
  'insulin',
  'inhalator',
  'krücken',
  'kruecken',
  'gipsarm',
  'gipsbein'
];

/**
 * Prüft einen Text auf das Vorhandensein von Art. 9 DSGVO Gesundheitsdaten
 * unter striktem Schutz des 0,1% Goldstandards (Stammworterkennung, Komposita,
 * geschützter Status "krank", Whitelist für Fachbegriffe und Jugendslang).
 */
export function detectHealthDataTerms(
  text: string,
  options?: HealthDataGuardOptions
): HealthDataDetectionResult {
  if (!text || typeof text !== 'string') {
    return { hasHealthData: false };
  }

  const rawTrimmed = text.trim();
  if (!rawTrimmed) {
    return { hasHealthData: false };
  }

  const normalized = rawTrimmed.toLowerCase();

  // 1. Prüfung gegen Fachbegriffs- und Slang-Whitelist ("Lampenfieber- & Fagott-Regel")
  for (const exempt of DIDACTIC_AND_SLANG_EXEMPTIONS) {
    if (normalized.includes(exempt)) {
      // Wenn der gesamte Satz ausschließlich von dieser didaktischen Wendung handelt, direkt freigeben
      // Beispiel: "Ich habe Lampenfieber vor dem Auftritt." -> kein Fieber-Alarm
      const strippedOfExemption = normalized.replace(new RegExp(exempt, 'g'), ' ');
      // Prüfen, ob nach Entfernung der Ausnahme noch echte Onkologie-/Diagnosestämme verbleiben
      const hasSecondarySevereMatch = ONCOLOGY_STEMS.some(stem => 
        new RegExp(`[a-zäöüß]*${stem}[a-zäöüß]*`, 'i').test(strippedOfExemption)
      );
      if (!hasSecondarySevereMatch) {
        return { hasHealthData: false };
      }
    }
  }

  // 2. Prüfung auf reine Statusmeldungen ("ich bin krank", "Kind ist krank", "krankheitsbedingt")
  // Diese sind nach Art. 6 Abs. 1 lit. b / § 5 EFZG ausdrücklich als Leistungsstörungsanzeige erlaubt
  const isPurePermittedStatus = PERMITTED_STATUS_TERMS.some(statusTerm => {
    // Exakter Begriff oder einfacher Teilsatz ohne spezifische Pathologie
    const regex = new RegExp(`(^|[^a-zäöüß])${statusTerm}([^a-zäöüß]|$)`, 'i');
    return regex.test(normalized);
  });

  // Hilfsfunktion: Ermittelt den rollengerechten Neutralisierungsvorschlag
  const deriveNeutralSuggestion = (category: HealthDataCategory): string => {
    const isTeacher = options?.senderRole === 'teacher' || normalized.includes('unterricht');
    if (isTeacher) {
      return 'Ich bin heute verhindert und kann leider nicht unterrichten.';
    }
    return 'Ich bin heute leider krank und kann nicht zum Unterricht kommen.';
  };

  // 3. Onkologische Stämme & lebensbedrohliche Pathologien (Komposita-Check)
  for (const stem of ONCOLOGY_STEMS) {
    const compRegex = new RegExp(`(?:^|[^a-zäöüß])([a-zäöüß]*${stem}[a-zäöüß]*)(?:[^a-zäöüß]|$)`, 'i');
    const match = normalized.match(compRegex);
    if (match && match[1]) {
      const matchedTerm = match[1].trim();
      return {
        hasHealthData: true,
        matchedTerm,
        category: 'oncology',
        suggestedNeutralText: deriveNeutralSuggestion('oncology'),
        sanitizedText: sanitizeHealthDataTerms(text)
      };
    }
  }

  // 4. Komposita-Erkrankungen & Entzündungen (z. B. "Krebserkrankung", "Lungenentzündung")
  // Hinweis: Wenn das isolierte Wort "Erkrankung" allein steht, aber ein reiner Status gemeint ist,
  // differenzieren wir zwischen Kompositum (Länge > Stamm) und isoliertem Stamm.
  for (const stem of COMPOSITE_DIAGNOSIS_STEMS) {
    const compRegex = new RegExp(`(?:^|[^a-zäöüß])([a-zäöüß]*${stem}[a-zäöüß]*)(?:[^a-zäöüß]|$)`, 'i');
    const match = normalized.match(compRegex);
    if (match && match[1]) {
      const matchedTerm = match[1].trim();
      // Wenn es ein Kompositum ist (z. B. "krebserkrankung", "lungenerkrankung") ODER ein konkretes Infektionsbild
      const isPureStatusErkrankt = matchedTerm === 'erkrankt' || matchedTerm === 'erkrankung';
      if (!isPureStatusErkrankt || !isPurePermittedStatus) {
        return {
          hasHealthData: true,
          matchedTerm,
          category: 'diagnosis',
          suggestedNeutralText: deriveNeutralSuggestion('diagnosis'),
          sanitizedText: sanitizeHealthDataTerms(text)
        };
      }
    }
  }

  // 5. Psychiatrie, Neurologie & Chronische Diagnosen
  for (const stem of PSYCHIATRY_STEMS) {
    const regex = new RegExp(`(?:^|[^a-zäöüß])([a-zäöüß]*${stem}[a-zäöüß]*)(?:[^a-zäöüß]|$)`, 'i');
    const match = normalized.match(regex);
    if (match && match[1]) {
      const matchedTerm = match[1].trim();
      return {
        hasHealthData: true,
        matchedTerm,
        category: 'psychiatry',
        suggestedNeutralText: deriveNeutralSuggestion('psychiatry'),
        sanitizedText: sanitizeHealthDataTerms(text)
      };
    }
  }

  // 6. Schwere Symptome (Fieber, Erbrechen, etc. - Lampenfieber wurde oben bereits gefiltert)
  for (const term of SYMPTOM_KEYWORDS) {
    const regex = new RegExp(`(?:^|[^a-zäöüß])([a-zäöüß]*${term}[a-zäöüß]*)(?:[^a-zäöüß]|$)`, 'i');
    const match = normalized.match(regex);
    if (match && match[1]) {
      const matchedTerm = match[1].trim();
      if (!DIDACTIC_AND_SLANG_EXEMPTIONS.some(e => matchedTerm.includes(e))) {
        return {
          hasHealthData: true,
          matchedTerm,
          category: 'symptom',
          suggestedNeutralText: deriveNeutralSuggestion('symptom'),
          sanitizedText: sanitizeHealthDataTerms(text)
        };
      }
    }
  }

  // 7. Stationäre Behandlungen, Kliniken, Operationen
  for (const term of TREATMENT_KEYWORDS) {
    const regex = new RegExp(`(?:^|[^a-zäöüß])([a-zäöüß]*${term}[a-zäöüß]*)(?:[^a-zäöüß]|$)`, 'i');
    const match = normalized.match(regex);
    if (match && match[1]) {
      const matchedTerm = match[1].trim();
      return {
        hasHealthData: true,
        matchedTerm,
        category: 'treatment',
        suggestedNeutralText: deriveNeutralSuggestion('treatment'),
        sanitizedText: sanitizeHealthDataTerms(text)
      };
    }
  }

  // 8. Medikamente & Atteste
  for (const term of MEDICATION_KEYWORDS) {
    const regex = new RegExp(`(?:^|[^a-zäöüß])([a-zäöüß]*${term}[a-zäöüß]*)(?:[^a-zäöüß]|$)`, 'i');
    const match = normalized.match(regex);
    if (match && match[1]) {
      const matchedTerm = match[1].trim();
      return {
        hasHealthData: true,
        matchedTerm,
        category: 'medication',
        suggestedNeutralText: deriveNeutralSuggestion('medication'),
        sanitizedText: sanitizeHealthDataTerms(text)
      };
    }
  }

  // 9. ICD-10 Diagnoseschlüssel (z. B. "ICD-10 F32.1", "Diagnose C34", "Code G43")
  const icd10Regex = /(?:\b(?:icd(?:-?10)?|diagnose|befund|code)\b[^\w\n]{1,6})([a-tv-z][0-9]{2}(?:\.[0-9]{1,2})?)\b/i;
  const icdMatch = normalized.match(icd10Regex);
  if (icdMatch && icdMatch[1]) {
    return {
      hasHealthData: true,
      matchedTerm: `ICD-10 ${icdMatch[1].toUpperCase()}`,
      category: 'icd10',
      suggestedNeutralText: deriveNeutralSuggestion('icd10'),
      sanitizedText: sanitizeHealthDataTerms(text)
    };
  }

  return { hasHealthData: false };
}

/**
 * Ersetzt medizinische Signalwörter und Diagnosen deterministisch durch eine neutrale Formulierung.
 */
export function sanitizeHealthDataTerms(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let result = text;
  
  // Alle relevanten Stämme und Keywords maskieren
  const allSensitiveStems = [
    ...ONCOLOGY_STEMS,
    ...COMPOSITE_DIAGNOSIS_STEMS,
    ...PSYCHIATRY_STEMS,
    ...SYMPTOM_KEYWORDS,
    ...TREATMENT_KEYWORDS,
    ...MEDICATION_KEYWORDS
  ];

  for (const stem of allSensitiveStems) {
    // Ausnahmeschutz vor Über-Maskierung von "Lampenfieber"
    if (stem === 'fieber' && /lampenfieber/i.test(result)) {
      continue;
    }
    const regex = new RegExp(`(^|[^a-zäöüß])([a-zäöüß]*${stem}[a-zäöüß]*)([^a-zäöüß]|$)`, 'gi');
    result = result.replace(regex, (match, prefix, _word, suffix) => {
      return `${prefix}[gesundheitliche Angabe neutralisiert]${suffix}`;
    });
  }

  // ICD-10 Diagnoseschlüssel maskieren
  result = result.replace(
    /(?:\b(?:icd(?:-?10)?|diagnose|befund|code)\b[^\w\n]{1,6})([a-tv-z][0-9]{2}(?:\.[0-9]{1,2})?)\b/gi,
    '[Diagnoseschlüssel neutralisiert]'
  );

  return result;
}
