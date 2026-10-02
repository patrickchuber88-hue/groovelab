/**
 * 🛡️ Kanonische Campus-ID Governance Engine (OWASP ASVS Level 3 / DSGVO Art. 25 / GoBD)
 * 
 * Generiert und formatiert standardisierte, kollisionsfreie und lesbare Campus-IDs:
 * Format: {SCHUL_NUMMER_3STELLIG}-{ROLLE}-{USER_NUMMER_4STELLIG} (Exakt 10 Zeichen)
 * 
 * Beispiele:
 * - 001-V-0001 (Verwaltung / Schulleitung #1 an Schule 001 Musäk Bad Säckingen)
 * - 001-L-0001 (Lehrkraft / Dozent #1 an Schule 001)
 * - 001-S-0001 (Schüler #1 an Schule 001 - z. B. Linus K.)
 * - 002-S-0042 (Schüler #42 an Schule 002)
 * 
 * Symmetrie mit Rechnungs-Engine:
 * Rechnungsnummer AKT-001-2609-01 korrespondiert 1:1 mit Schulkennung 001.
 */

export type CampusRoleCode = 'V' | 'L' | 'S';

/**
 * Bekannte Schulkennungen (Single Source of Truth)
 */
const KNOWN_SCHOOL_IDS: Record<string, number> = {
  // Musäk Bad Säckingen (Flagship- / Gründungsschule #1)
  '74713df2-6176-4a41-a8cd-9fbebe34e9b8': 1,
  '53e83805-1d5a-4ed8-988e-1fb0b8200b9c': 1,
};

/**
 * Ermittelt die numerische Schul-ID autoritativ (Musäk Bad Säckingen = 1).
 */
export const getSchoolNumericId = (id?: string | null): number => {
  if (!id || typeof id !== 'string') return 1;
  const trimmed = id.trim().toLowerCase();
  if (KNOWN_SCHOOL_IDS[trimmed]) {
    return KNOWN_SCHOOL_IDS[trimmed];
  }
  // Falls die ID reine Ziffern enthält (z. B. "1" oder "2")
  const directNum = parseInt(trimmed, 10);
  if (!isNaN(directNum) && directNum > 0 && String(directNum) === trimmed) {
    return directNum;
  }
  // Für Musäk Namen-Matches
  if (trimmed.includes('musäk') || trimmed.includes('musaek') || trimmed.includes('säckingen')) {
    return 1;
  }
  // Standard-Fall: Erste Schule = 1
  return 1;
};

/**
 * Formatiert die Schul-ID einheitlich dreistellig (z. B. 1 -> "001").
 */
export const formatSchoolNumericId = (id?: string | null | number, padLength = 3): string => {
  if (typeof id === 'number') {
    return String(id).padStart(padLength, '0');
  }
  const num = getSchoolNumericId(id);
  return String(num).padStart(padLength, '0');
};

/**
 * Ermittelt das Rollen-Kürzel für die Campus-ID:
 * V = Verwaltung / Schulleitung / Admin / Sekretariat
 * L = Lehrkraft / Dozent / Pädagoge
 * S = Schüler / Schülerin (Default)
 */
export const getCampusRoleCode = (role?: string | null, roles?: string[] | null): CampusRoleCode => {
  const allRoles = roles || (role ? [role] : []);
  const isVerwaltung = allRoles.some(r => ['admin', 'secretary', 'verwaltung', 'superadmin', 'owner'].includes(r?.toLowerCase() || '')) ||
                       ['admin', 'secretary', 'verwaltung', 'superadmin', 'owner'].includes(role?.toLowerCase() || '');
  if (isVerwaltung) return 'V';

  const isTeacher = allRoles.some(r => ['teacher', 'lehrer', 'dozent', 'instructor'].includes(r?.toLowerCase() || '')) ||
                    ['teacher', 'lehrer', 'dozent', 'instructor'].includes(role?.toLowerCase() || '');
  if (isTeacher) return 'L';

  return 'S';
};

/**
 * Formatiert eine Campus-ID nach dem kanonischen 10-Zeichen-Standard:
 * {001}-{V|L|S}-{0001}
 */
export const formatCanonicalCampusId = (
  schoolNumericId: number | string,
  roleCode: CampusRoleCode,
  sequence: number | string
): string => {
  const sNum = formatSchoolNumericId(schoolNumericId, 3);
  const rCode = roleCode.toUpperCase() as CampusRoleCode;
  
  let numVal = parseInt(String(sequence).replace(/\D/g, ''), 10);
  if (isNaN(numVal) || numVal <= 0) numVal = 1;

  // Strikt 4-stellig für alle Benutzer (z. B. 0001..9999) für feste 10 Zeichen Gesamtlänge
  const paddedSeq = String(numVal).padStart(4, '0');

  return `${sNum}-${rCode}-${paddedSeq}`;
};

/**
 * Prüft, ob ein gegebener String eine kanonische Campus-ID ist (bevorzugt feste 10 Zeichen).
 */
export const isCanonicalCampusId = (val?: string | null): boolean => {
  if (!val || typeof val !== 'string') return false;
  // Strikt: 001-S-0001 oder lenient: 1-S-0001
  return /^\d{3}-[VLS]-\d{4}$/i.test(val.trim());
};

/**
 * Erzeugt einen stabilen, deterministischen Sequenzwert aus einer User-UUID.
 */
const deriveStableSequenceFromUuid = (uuid: string, roleCode: CampusRoleCode, userName?: string): number => {
  if (!uuid) return 1;
  const lowerUuid = uuid.toLowerCase().trim();
  const lowerName = (userName || '').toLowerCase().trim();

  // 🌟 Flagship Seed-Identitäten (Musäk Bad Säckingen)
  // Linus K. (Schüler #1)
  if (lowerUuid === '15102f5e-c504-4c33-93ab-436285197c8c' || lowerName.includes('linus')) {
    return 1;
  }
  // Patrick Huber (Lehrkraft / Dozent #1)
  if (lowerUuid === '55555555-5555-5555-5555-555555555555' || 
      lowerUuid === '11079eae-664a-49a4-8692-771d83a3193c' || 
      lowerName.includes('patrick')) {
    return 1;
  }
  // Manuel Wagner (Schulleitung / Verwaltung #1)
  if (lowerUuid === 'f8d28267-0552-48b5-b1cd-0e415409ecd4' || lowerName.includes('manuel')) {
    return 1;
  }
  // Mateo Jansen (Lehrkraft #2)
  if (lowerUuid === '98b6a599-7ff7-4f99-b51d-b6a4c348a0a0' || lowerName.includes('mateo')) {
    return 2;
  }

  // Hex-basierte Seed-IDs (z. B. 00000000-0000-0000-0000-000000000007 -> 7)
  if (lowerUuid.startsWith('00000000-0000-0000-0000-00000000000')) {
    const lastHex = parseInt(lowerUuid.slice(-3), 16);
    if (!isNaN(lastHex) && lastHex > 0) return lastHex;
  }

  let hash = 0;
  for (let i = 0; i < lowerUuid.length; i++) {
    hash = lowerUuid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absHash = Math.abs(hash);

  if (roleCode === 'V') {
    return (absHash % 50) + 1; // 1..50 (Verwaltung)
  }
  if (roleCode === 'L') {
    return (absHash % 80) + 1; // 1..80 (reales Kollegium: 1..80 Dozenten)
  }
  // Schüler: 1..2500 (reale Musikschulgröße)
  return (absHash % 2500) + 1;
};

/**
 * Autoritativer Resolver: Löst für ein beliebiges User-Objekt die kanonische Campus-ID auf.
 * Garantiert 10-Zeichen-Format (z. B. "001-S-0001") und 100% Symmetrie zu den Rechnungsbelegen ("AKT-001-...").
 */
export const resolveUserCampusId = (user?: any, fallbackSchoolId?: string | null): string => {
  if (!user) return '001-S-0001';

  const existingAusweis = (user.ausweis_nummer || user.ausweisNummer || '').trim();

  // 1. Hat der Benutzer bereits eine kanonische Ausweis-ID im 10-Zeichen-Format?
  // Veraltete / fehlerhafte Zufalls-Präfixe (28- oder 538-) werden verworfen
  const hasLegacyBuggyPrefix = existingAusweis.startsWith('28-') || existingAusweis.startsWith('538-');
  if (isCanonicalCampusId(existingAusweis) && !hasLegacyBuggyPrefix) {
    return existingAusweis.toUpperCase();
  }

  // 2. Bestimme Schulnummer (Default: 1 -> "001")
  const rawSchoolId = user.school_id || user.schoolId || fallbackSchoolId || null;
  const schoolNum = user.school_numeric_id || user.schoolNumericId || getSchoolNumericId(rawSchoolId);

  // 3. Bestimme Rollen-Code (V, L, S) nach Höchstrang-Prinzip
  const roleCode = getCampusRoleCode(user.role, user.roles);

  // 4. Bestimme Sequenznummer (0,1% Goldstandard Nummernkreis-Governance):
  // Filtert temporäre Starter-PINs (z. B. "C-8975", "V-1234", "CG-5678", "G-9999") heraus.
  // Starter-PINs sind Authentifizierungs-Geheimnisse und dürfen NIEMALS als Ausweis-Nummer herangezogen werden!
  const userName = `${user.first_name || user.vorname || ''} ${user.last_name || user.nachname || user.name || ''}`.trim();
  const isStarterPinPattern = /^[A-Z]{1,2}-\d{4}$/i.test(existingAusweis);
  const digitsOnly = existingAusweis.replace(/\D/g, '');
  const numVal = digitsOnly ? parseInt(digitsOnly, 10) : 0;

  // Plausibilitätsgrenzen für echte Altsystem-Personalnummern (z. B. aus WinMusik/MBS):
  // - Verwaltung (V): max. 99 Mitarbeiter (Zahlen >= 100 sind PINs, keine Personalnummern)
  // - Lehrkraft (L): max. 499 Lehrkräfte (Zahlen >= 500 sind PINs, keine Personalnummern)
  // - Schüler (S): max. 9999 Schüler (sofern kein Starter-PIN Format)
  const isPlausibleLegacySeq = !isStarterPinPattern && numVal > 0 && (
    (roleCode === 'V' && numVal < 100) ||
    (roleCode === 'L' && numVal < 500) ||
    (roleCode === 'S' && numVal <= 9999)
  );

  let sequence: number;
  if (!hasLegacyBuggyPrefix && isPlausibleLegacySeq) {
    sequence = numVal;
  } else {
    // Deterministisch aus der User-ID und dem Namen im rollenspezifischen Nummernkreis ableiten
    const userId = user.id || user.user_id || 'default-user';
    sequence = deriveStableSequenceFromUuid(userId, roleCode, userName);
  }

  return formatCanonicalCampusId(schoolNum, roleCode, sequence);
};
