/**
 * 🎵 GrooveLab Tier-1 Musiker-Nickname Generator & Jugendschutz-Validator
 * 
 * Bietet 1.600+ kinderfreundliche musikalische Namenskombinationen (40 Adjektive × 40 Substantive),
 * automatischen Schutz vor Namensleaks (Vor-/Nachname des Schülers) und integrierten Jugendschutz-
 * Filter mit Leetspeak-Normalisierung gem. JMStV / DSA.
 */

export const GROOVE_ADJECTIVES = [
  'Groovy', 'Funky', 'Sonic', 'Cosmic', 'Turbo', 'Magic', 'Wild', 'Clever',
  'Swift', 'Rocking', 'Chill', 'Bold', 'Epic', 'Happy', 'Golden', 'Electric',
  'Acoustic', 'Sync', 'Mega', 'Sunny', 'Jazzy', 'Vibrant', 'Starlight', 'Hyper',
  'Dynamic', 'Harmony', 'Astro', 'Echo', 'Velvet', 'Breezy', 'Neon', 'Rhythm',
  'Lunar', 'Solar', 'Flash', 'Noble', 'Super', 'Mighty', 'Spark', 'Crystal'
];

export const GROOVE_NOUNS = [
  'Panda', 'Tiger', 'Beat', 'Bass', 'Wizard', 'Fox', 'Loop', 'Note',
  'Falcon', 'Rocket', 'Maestro', 'Drummer', 'Hawk', 'Lynx', 'Otter', 'Star',
  'Comet', 'Hero', 'Captain', 'Rhythm', 'Wolf', 'Koala', 'Panther', 'Chime',
  'Groover', 'Bard', 'Tempo', 'Cadence', 'Melody', 'Octave', 'Lion', 'Bear',
  'Guitarist', 'Pianist', 'Dolphin', 'Eagle', 'Voyager', 'Phoenix', 'Legend', 'Rider'
];

// Sperrliste für Jugendschutz (Fäkalsprache, Beleidigungen, Extremismus, Sexualität)
const FORBIDDEN_WORDS_REGEX = /(arsch|fick|shit|fuck|bitch|hure|nazi|hitler|porn|sex|penis|vagina|schwuchtel|bastard|fotze|idiot|kanake|nigga|nigger|wixxer|wichs|spast|nutte|pedoph|pedo|88|1818)/i;

/**
 * Normalisiert Leetspeak & Zahlen-Substitutionen für den Jugendschutzfilter
 */
export function normalizeLeetspeak(str: string): string {
  return str
    .toLowerCase()
    .replace(/[4@]/g, 'a')
    .replace(/3/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[^a-z0-9äöüß]/g, '');
}

/**
 * Generiert einen kinderfreundlichen, musikalischen Zufalls-Nickname
 */
export function generateRandomNickname(): string {
  const adj = GROOVE_ADJECTIVES[Math.floor(Math.random() * GROOVE_ADJECTIVES.length)];
  const noun = GROOVE_NOUNS[Math.floor(Math.random() * GROOVE_NOUNS.length)];
  return `${adj}${noun}`;
}

/**
 * Validiert einen Nickname nach den Kriterien:
 * 1. Mindestlänge (3) und Maximallänge (24)
 * 2. Erlaubte Zeichen
 * 3. 🛡️ Echtnamen-Schutz (Kein Vorkommen von Vor- oder Nachname des Schülers)
 * 4. 🛡️ Jugendschutzfilter (Keine anstößigen Begriffe, auch nicht in Leetspeak)
 */
export function validateNickname(
  nickname: string,
  firstName?: string,
  lastName?: string,
  teacherNames?: string[]
): { isValid: boolean; error?: string } {
  const clean = nickname.trim();

  if (!clean || clean.length < 3) {
    return { isValid: false, error: 'Der Nickname muss mindestens 3 Zeichen lang sein.' };
  }

  if (clean.length > 24) {
    return { isValid: false, error: 'Der Nickname darf maximal 24 Zeichen lang sein.' };
  }

  // Zeichensatz prüfen: Buchstaben, Zahlen, Bindestrich, Unterstrich, Leerzeichen
  if (!/^[a-zA-Z0-9_\- äöüÄÖÜß]+$/.test(clean)) {
    return { isValid: false, error: 'Der Nickname enthält unzulässige Sonderzeichen.' };
  }

  const cleanLower = clean.toLowerCase();

  // 🛡️ 1. Echtnamen-Schutz: Vorname prüfen
  if (firstName && firstName.trim().length >= 3) {
    const fLower = firstName.trim().toLowerCase();
    if (cleanLower.includes(fLower)) {
      return {
        isValid: false,
        error: 'Zu deinem Schutz: Dein Nickname darf nicht deinen echten Vornamen enthalten.'
      };
    }
  }

  // 🛡️ 2. Echtnamen-Schutz: Nachname prüfen
  if (lastName && lastName.trim().length >= 3) {
    const lLower = lastName.trim().toLowerCase();
    if (cleanLower.includes(lLower)) {
      return {
        isValid: false,
        error: 'Zu deinem Schutz: Dein Nickname darf nicht deinen echten Nachnamen enthalten.'
      };
    }
  }

  // 🛡️ 2b. Schutz der Lehrkräfte & Mitarbeiter der Musikschule
  if (teacherNames && teacherNames.length > 0) {
    for (const tName of teacherNames) {
      if (tName && tName.trim().length >= 3) {
        if (cleanLower.includes(tName.trim().toLowerCase())) {
          return {
            isValid: false,
            error: 'Schutz der Lehrkräfte: Dein Nickname darf keine Namen von Lehrkräften oder Mitarbeitern deiner Musikschule enthalten.'
          };
        }
      }
    }
  }

  // 🛡️ 3. Jugendschutz- & Leetspeak-Filter
  const normalized = normalizeLeetspeak(clean);
  if (FORBIDDEN_WORDS_REGEX.test(normalized)) {
    return {
      isValid: false,
      error: 'Jugendschutz-Richtlinie: Dieser Nickname enthält unzulässige Begriffe. Bitte wähle einen freundlichen, musikalischen Namen!'
    };
  }

  return { isValid: true };
}
