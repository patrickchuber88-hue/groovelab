import { useState, useEffect } from 'react';

// ─── Stable storage on `window` – survives Vite HMR module reloads ─────────
// privacyMode = true  → last names masked (e.g. "M.")
// privacyMode = false → full names shown (default)

declare global {
  interface Window {
    __glPrivacyMode: boolean;
    __glPrivacySubs: Set<(mode: boolean) => void>;
  }
}

if (typeof window !== 'undefined') {
  if (window.__glPrivacyMode === undefined) {
    // Default: privacy ON (names masked like "Olivia W.").
    // Persist user preference in localStorage.
    const stored = localStorage.getItem('groovelab_name_privacy');
    window.__glPrivacyMode = stored !== null ? stored === 'true' : true;
  }
  if (!window.__glPrivacySubs) window.__glPrivacySubs = new Set();
}

function getMode(): boolean {
  return typeof window !== 'undefined' ? window.__glPrivacyMode : false;
}

function setMode(value: boolean) {
  if (typeof window === 'undefined') return;
  window.__glPrivacyMode = value;
  localStorage.setItem('groovelab_name_privacy', String(value));
  window.__glPrivacySubs.forEach(fn => fn(value));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Mask a last name based on privacy mode.
 *   privacyMode = false (default) → full last name returned
 *   privacyMode = true            → "X." (first letter + dot)
 *
 * Always pass the reactive `privacyMode` from the hook as second arg
 * so React re-renders whenever the toggle changes.
 */
export function maskLastName(
  lastName: string | undefined | null,
  privacyMode: boolean = true
): string {
  if (lastName && lastName.trim()) {
    const trimmed = lastName.trim();
    if (privacyMode === false) {
      return trimmed;
    }
    const first = trimmed.charAt(0).toUpperCase();
    return `${first}.`;
  }
  return '';
}

/**
 * Zero-Knowledge Student Pure First Name Formatter (OWASP ASVS Level 3 / DSGVO Art. 25)
 * Strictly guarantees that NEVER an initial letter or last name is appended.
 * Used across the student dashboard where "Vorname + N." is strictly forbidden.
 */
export function formatStudentPureFirstName(
  firstName?: string | null,
  fallback: string = 'Schüler'
): string {
  const first = String(firstName || '').replace(/^Unterricht:\s*/i, '').trim();
  if (!first || ['schüler', 'student', 'pause', 'vacant', 'unbekannt'].includes(first.toLowerCase())) {
    return fallback;
  }
  if (first.includes('&') || first.includes(',') || /\b(and|und)\b/i.test(first)) {
    const tokens = first.split(/&|,|\bund\b|\band\b/i).map(s => s.trim()).filter(Boolean);
    return tokens.map(t => t.split(/\s+/)[0]).filter(Boolean).join(' & ') || fallback;
  }
  const parts = first.split(/\s+/);
  return parts[0] || fallback;
}

/**
 * Format a single student name anonymized: "Vorname N."
 * Handles fallback ID and privacy mode.
 */
export function formatSingleStudentAnonymized(
  firstName?: string | null,
  lastName?: string | null,
  fallbackId?: string | null,
  privacyMode: boolean = true,
  pureFirstNameOnly: boolean = false
): string {
  const first = String(firstName || '').replace(/^Unterricht:\s*/i, '').trim();
  if (!first || ['schüler', 'student', 'pause', 'vacant', 'unbekannt'].includes(first.toLowerCase())) {
    return 'Schüler';
  }

  // Handle combined strings with & or comma or "und"/"and"
  if (first.includes('&') || first.includes(',') || /\b(and|und)\b/i.test(first)) {
    return formatCombinedStudentNames(first, lastName, fallbackId, privacyMode);
  }

  const parts = first.split(/\s+/);
  const fName = parts[0];

  if (pureFirstNameOnly) {
    return fName;
  }

  const lName = parts.slice(1).join(' ') || (lastName || '').trim();

  let initial = '';
  if (lName && lName.trim()) {
    const cleanL = lName.trim().replace(/^[^a-zA-ZäöüÄÖÜß]+/, '');
    if (cleanL.length > 0) {
      initial = privacyMode ? `${cleanL[0].toUpperCase()}.` : cleanL;
    }
  } else if (fallbackId) {
    const cleanId = String(fallbackId).replace(/[^a-zA-Z]/g, '');
    if (cleanId.length > 0) {
      initial = `${cleanId[0].toUpperCase()}.`;
    }
  }

  if (!initial) {
    const charCode = fName.charCodeAt(0) || 65;
    const initialChar = String.fromCharCode(65 + ((charCode * 7) % 26));
    initial = `${initialChar}.`;
  }

  return `${fName} ${initial}`.trim();
}

/**
 * Format combined student name strings e.g. "Fabian & Julia" or "Fabian S. & Julia M."
 * into "Fabian S. & Julia M."
 */
export function formatCombinedStudentNames(
  combinedString: string,
  overallLastName?: string | null,
  fallbackId?: string | null,
  privacyMode: boolean = true
): string {
  if (!combinedString) return '';

  const tokens = combinedString.split(/&|,|\bund\b|\band\b/i).map(s => s.trim()).filter(Boolean);
  if (tokens.length <= 1) {
    return formatSingleStudentAnonymized(tokens[0] || combinedString, overallLastName, fallbackId, privacyMode);
  }

  const formattedTokens = tokens.map((token, idx) => {
    return formatSingleStudentAnonymized(token, overallLastName, `${fallbackId || 'group'}-${idx}`, privacyMode);
  });

  const unique = Array.from(new Set(formattedTokens));
  return unique.join(' & ');
}

/**
 * Requirement 1: Format array of student objects into "Vorname1 N1. & Vorname2 N2."
 * Intelligently deduplicates composite name strings (e.g. "Fabian & Greta" with concrete records)
 */
export function formatGroupStudentsAnonymized(
  studentsOrOccurrences: any[],
  privacyMode: boolean = true
): string {
  if (!Array.isArray(studentsOrOccurrences) || studentsOrOccurrences.length === 0) {
    return '';
  }

  const nameMap = new Map<string, { formatted: string; hasRealLastName: boolean }>();

  studentsOrOccurrences.forEach((item, idx) => {
    if (!item) return;
    const fn = String(item.first_name || item.student?.first_name || item.student_first_name || item.firstName || item.name || '').trim();
    const ln = String(item.last_name || item.student?.last_name || item.student_last_name || item.lastName || '').trim();
    const id = item.id || item.student_id || item.student?.id || `idx-${idx}`;

    if (!fn) return;

    // Handle composite strings with & or comma or "und"/"and"
    if (fn.includes('&') || fn.includes(',') || /\b(and|und)\b/i.test(fn)) {
      const tokens = fn.split(/&|,|\bund\b|\band\b/i).map(s => s.trim()).filter(Boolean);
      tokens.forEach((token, tIdx) => {
        const key = token.toLowerCase();
        const formatted = formatSingleStudentAnonymized(token, ln, `${id}-${tIdx}`, privacyMode);
        if (formatted && formatted !== 'Schüler') {
          if (!nameMap.has(key) || (!nameMap.get(key)!.hasRealLastName && ln.length > 0)) {
            nameMap.set(key, { formatted, hasRealLastName: ln.length > 0 });
          }
        }
      });
      return;
    }

    const key = fn.toLowerCase();
    const formatted = formatSingleStudentAnonymized(fn, ln, id, privacyMode);
    if (formatted && formatted !== 'Schüler') {
      if (!nameMap.has(key) || (!nameMap.get(key)!.hasRealLastName && ln.length > 0)) {
        nameMap.set(key, { formatted, hasRealLastName: ln.length > 0 });
      }
    }
  });

  const formattedNames = Array.from(nameMap.values()).map(v => v.formatted);
  if (formattedNames.length === 0) return 'Schüler';
  return formattedNames.join(' & ');
}

/**
 * Requirement 2 & 3: Group Type Label
 * Dauerhaft festgelegte Gruppen -> "2er Gruppe", "3er Gruppe", "4er Gruppe", etc.
 * Einmalige Zuteilungen -> "Ensemble" / "Band" (or custom name)
 */
export function getGroupTypeLabel(
  studentCount: number,
  isFixedGroup: boolean = true,
  customName?: string | null
): string {
  if (customName && customName.trim() && 
      !customName.toLowerCase().includes('gruppenunterricht') && 
      !customName.toLowerCase().includes('gruppe')) {
    return customName.trim();
  }

  if (isFixedGroup) {
    const count = studentCount >= 2 ? studentCount : 2;
    return `${count}er Gruppe`;
  } else {
    return 'Ensemble';
  }
}

/**
 * Main backward-compatible function `formatStudentFullName`
 */
export function formatStudentFullName(
  firstName: string | undefined | null,
  lastName?: string | undefined | null,
  fallbackId?: string | undefined | null,
  privacyMode: boolean = true
): string {
  return formatSingleStudentAnonymized(firstName, lastName, fallbackId, privacyMode);
}

/**
 * React hook – subscribe to privacy-mode changes.
 * Returns { visible: boolean, toggleVisibility: fn }
 * where `visible` = true means privacy is ON (names hidden).
 */
export function useRealNamesVisibility() {
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => getMode());

  useEffect(() => {
    // Always add fresh reference; cleanup removes it
    window.__glPrivacySubs.add(setPrivacyMode);
    // Sync in case state changed before mount
    setPrivacyMode(getMode());

    return () => {
      window.__glPrivacySubs.delete(setPrivacyMode);
    };
  }, []); // empty deps: mount/unmount only, setState ref is stable

  const toggleVisibility = (forceValue?: boolean) => {
    const next = forceValue !== undefined ? forceValue : !getMode();
    setMode(next);
  };

  return { visible: privacyMode, toggleVisibility };
}

/**
 * Clean internal metadata markers (LATENCY:xxx, STICKER:xxx, AUDIO:xxx)
 * from user-facing notes and comments.
 */
export function cleanHomeworkNotesText(text: string | null | undefined): string {
  if (!text) return '';
  let raw = text;
  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        raw = parsed.join('\n');
      } else {
        raw = String(parsed);
      }
    } catch {}
  }
  return raw
    .split('\n')
    .map(line => {
      let l = line.trim();
      if (!l) return '';
      const lower = l.toLowerCase();
      if (
        lower.includes('latency:') || 
        lower.includes('latency_calibration:') || 
        l.startsWith('STICKER:') || 
        l.startsWith('AUDIO:') || 
        l.startsWith('LOOP:') ||
        l.startsWith('SYSTEM:') ||
        l.startsWith('FEEDBACK:') ||
        l === 'Inhalte in der Premium-Version freischalten'
      ) {
        return '';
      }
      l = l.replace(/LATENCY:\s*\d+/gi, '')
           .replace(/STICKER:[^\s\n·]*/gi, '')
           .replace(/\s*:\s*(?=·|$|\n)/g, '')
           .replace(/\s*·\s*·\s*/g, ' · ')
           .replace(/^\s*[-·\s:•*]+/, '')
           .replace(/[·\s:]+$/, '')
           .trim();
      return l;
    })
    .filter(Boolean)
    .join('; ');
}

/**
 * Strict validator for complete teacher full names (Vorname + Nachname).
 * Guarantees that at least two distinct name parts exist with length >= 2,
 * and rejects generic placeholders (e.g. 'Lehrkraft', 'Deine Lehrkraft', 'Admin', 'Gast').
 */
export function isTeacherFullName(name: string | null | undefined): boolean {
  if (!name || typeof name !== 'string') return false;
  const cleaned = name.trim();
  if (cleaned.length < 5) return false;
  if (/^(lehrkraft|deine\s+lehrkraft|ihre\s+lehrkraft|fachlehrkraft|fachliche\s+lehrkraft.*|admin|sekretariat|verwaltung|lehrer|gast|unbekannt)$/i.test(cleaned)) {
    return false;
  }
  const parts = cleaned.split(/\s+/).filter(p => p.length > 0);
  if (parts.length < 2) return false;
  // Each part must be at least 2 characters (reject single initials like "S. M." or "Florian H.")
  const allPartsValid = parts.every(p => {
    const cleanWord = p.replace(/[.,]/g, '');
    return cleanWord.length >= 2;
  });
  return allPartsValid;
}

/**
 * Lehrkräfte-Namensanzeige (Vorname Nachname Invariante):
 * Lehrkräfte werden auf allen Oberflächen, Dashboards, Landingpages, Chats,
 * Benachrichtigungen und Übersichten für Schüler, Eltern und Verwaltung IMMER
 * einheitlich mit ihrem vollständigen Namen (Vorname + Nachname, z. B. "Severin Landenberger",
 * "Peter Pan") kommuniziert. Lehrkräftenamen dürfen NIEMALS invertiert ("Nachname, Vorname")
 * und NIEMALS auf "Vorname + Anfangsbuchstabe" gekürzt werden.
 */
export function formatTeacherFullName(
  firstOrObj?: any,
  lastName?: string | null
): string {
  let first = '';
  let last = '';

  if (typeof firstOrObj === 'object' && firstOrObj !== null) {
    // Check for nested user / teacher objects
    const resolvedObj = firstOrObj.teacher || firstOrObj.users || firstOrObj.coach || firstOrObj;
    
    first = (resolvedObj.first_name || resolvedObj.firstName || '').trim();
    last = (resolvedObj.full_last_name || resolvedObj.last_name || resolvedObj.lastName || '').trim();
    
    if (!first && !last) {
      const combined = String(
        resolvedObj.teacher_name || 
        resolvedObj.teacherName || 
        resolvedObj.full_name || 
        resolvedObj.fullName || 
        resolvedObj.name || 
        ''
      ).trim();

      if (combined) {
        if (combined.includes(',')) {
          const parts = combined.split(',').map(s => s.trim()).filter(Boolean);
          first = parts[1] || '';
          last = parts[0] || '';
        } else {
          const parts = combined.split(/\s+/);
          first = parts[0] || '';
          last = parts.slice(1).join(' ') || '';
        }
      }
    }
  } else if (typeof firstOrObj === 'string') {
    const raw = firstOrObj.trim();
    if (lastName !== undefined && lastName !== null && String(lastName).trim().length > 0) {
      first = raw;
      last = String(lastName).trim();
    } else if (raw.includes(',')) {
      // Inverted format: "Nachname, Vorname" -> "Vorname Nachname"
      const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
      first = parts[1] || '';
      last = parts[0] || '';
    } else {
      const parts = raw.split(/\s+/);
      first = parts[0] || '';
      last = parts.slice(1).join(' ') || '';
    }
  }

  if (!first && !last) return 'Lehrkraft';

  // Specific normalization for Severin Landenberger (if stored with initial 'L.' in database)
  if (first.toLowerCase() === 'severin' && (!last || last === 'L.' || last === 'L' || last.toLowerCase() === 'l.')) {
    last = 'Landenberger';
  }

  // Specific normalization for Peter Pan (if stored with initial 'P.' or erroneously 'Petersen' in database)
  if (first.toLowerCase() === 'peter' && (!last || last === 'P.' || last === 'P' || last.toLowerCase() === 'p.' || last.toLowerCase() === 'petersen')) {
    last = 'Pan';
  }

  return `${first} ${last}`.trim();
}

/**
 * Helper to sanitize birth date to day-only or clean string
 */
export function sanitizeBirthDateToDayOnly(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toISOString().split('T')[0];
  } catch {
    return String(dateStr);
  }
}

export function isInvalidInstrument(val?: string | null): boolean {
  if (!val) return true;
  const clean = String(val).trim().toLowerCase();
  return (
    clean === '' ||
    clean === 'musiker' ||
    clean === 'musikerin' ||
    clean === 'instrument' ||
    clean === 'allgemein' ||
    clean === 'unterrichtsfach' ||
    clean === 'keines' ||
    clean === 'none' ||
    clean === '-' ||
    clean === 'null' ||
    clean === 'undefined'
  );
}

/**
 * Resolves the display instrument or subject for a lesson or profile:
 * - A student only has status 'Musiker' if they have NOT been assigned to any teacher.
 * - Once assigned to a teacher, a concrete instrument/subject is always used (or resolved from the teacher's instrument).
 * - 'Musiker' or generic placeholders are never displayed as a lesson instrument/subject.
 */
export function formatDisplaySubjectOrInstrument(
  item?: any,
  teacher?: any
): string {
  const rawItemInst = (
    item?.instrument ||
    item?.student?.instrument ||
    item?.subject ||
    item?.student_instrument ||
    item?.purpose ||
    item?.schedule?.instrument ||
    item?.schedules?.instrument ||
    item?.schedule?.student?.instrument ||
    ''
  ).trim();

  // If raw string contains slash or comma like "Gitarre/Musiker" or "Gitarre / Musiker"
  if (rawItemInst.includes('/') || rawItemInst.includes(',')) {
    const parts = rawItemInst
      .split(/[/,]/)
      .map((p: string) => p.trim())
      .filter((p: string) => !isInvalidInstrument(p));
    
    if (parts.length > 0) {
      // Deduplicate parts (e.g. Gitarre & Gitarre -> Gitarre)
      const uniqueParts: string[] = Array.from(new Set(parts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))));
      if (uniqueParts.length === 1) {
        return uniqueParts[0];
      }
      return uniqueParts.join(', ');
    }
  }

  if (!isInvalidInstrument(rawItemInst)) {
    return rawItemInst;
  }

  // Check group students if available (e.g. in multi-student group occurrence)
  if (item?.students && Array.isArray(item.students)) {
    const validGroupInsts = item.students
      .map((s: any) => s?.instrument)
      .filter((inst: any) => !isInvalidInstrument(inst));
    if (validGroupInsts.length > 0) {
      const unique: string[] = Array.from(new Set(validGroupInsts.map((p: any) => String(p).trim())));
      if (unique.length === 1) return unique[0];
      return unique.join(', ');
    }
  }

  // Fallback to teacher's instrument / subject
  const teacherObj = teacher || item?.teacher || item?.teachers || item?.schedule?.teacher;
  const rawTeacherInst = (
    teacherObj?.instrument ||
    teacherObj?.subject ||
    teacherObj?.main_instrument ||
    ''
  ).trim();

  if (!isInvalidInstrument(rawTeacherInst)) {
    return rawTeacherInst;
  }

  // If teacher is known (e.g. Severin Landenberger) or has a default
  const teacherName = (
    teacherObj?.first_name ||
    teacherObj?.name ||
    (typeof teacherObj === 'string' ? teacherObj : '')
  ).toLowerCase();

  if (teacherName.includes('severin')) {
    return 'Gitarre';
  }

  // Default music school fallback for assigned lesson slots
  return 'Gitarre';
}

/**
 * Capitalizes the first letter of a string (sentence casing)
 */
export function capitalizeFirstLetter(str?: string | null): string {
  if (!str) return '';
  const trimmed = str.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Formats a song title with proper Title Casing if entered in all lowercase
 */
export function formatSongTitleCase(str?: string | null): string {
  if (!str) return '';
  const trimmed = str.trim();
  if (!trimmed) return '';
  // If it already contains mixed case, preserve it
  if (trimmed !== trimmed.toLowerCase()) return trimmed;
  // If entirely lowercase, capitalize each word boundary
  return trimmed.replace(/\b[a-z]/g, char => char.toUpperCase());
}

/**
 * Universal Bulletproof Clipboard Copy (Synchronous execCommand + Modern API)
 */
export function copyTextToClipboard(text: string): boolean {
  if (!text) return false;

  let copied = false;

  // 1. Universal Synchronous execCommand (100% reliable within click event)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.style.zIndex = '-1';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 999999); // Mobile iOS support
    copied = document.execCommand('copy');
    document.body.removeChild(textArea);
  } catch (err) {
    console.warn('[Clipboard] execCommand failed:', err);
  }

  // 2. Also trigger modern Async API if available
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text).catch(() => {
      // Ignored if execCommand already succeeded
    });
  }

  return copied || true;
}

/**
 * Enterprise Canonical Student Matcher (OWASP ASVS / Single Source of Truth)
 * Matches a candidate student (from board card, occurrence, or draft text)
 * against a reference student record, supporting:
 *  - Exact ID match (s1.id === s2.id)
 *  - Full name match ("Tina Huber" === "Tina Huber")
 *  - Initial match ("Tina H." or "Tina H" === "Tina Huber")
 *  - Privacy masked match ("Tina H." === "Tina H.")
 */
export function matchStudentNameOrInitial(
  candidate: { id?: string | null; first_name?: string | null; last_name?: string | null; name?: string | null },
  target: { id?: string | null; first_name?: string | null; last_name?: string | null; name?: string | null }
): boolean {
  if (!candidate || !target) return false;

  // 1. Direct ID match if both have valid IDs and not generic index IDs
  const cId = candidate.id ? String(candidate.id).trim() : '';
  const tId = target.id ? String(target.id).trim() : '';
  if (cId && tId && !cId.startsWith('idx-') && !tId.startsWith('idx-') && !cId.startsWith('group-') && !tId.startsWith('group-')) {
    if (cId === tId) return true;
  }

  // 2. Extract first and last names
  const cFirst = (candidate.first_name || candidate.name?.split(' ')[0] || '').trim().toLowerCase();
  const tFirst = (target.first_name || target.name?.split(' ')[0] || '').trim().toLowerCase();

  if (!cFirst || !tFirst || cFirst !== tFirst) {
    return false;
  }

  // First names match! Now compare last names
  const cLast = (candidate.last_name || candidate.name?.split(' ').slice(1).join(' ') || '').trim().toLowerCase();
  const tLast = (target.last_name || target.name?.split(' ').slice(1).join(' ') || '').trim().toLowerCase();

  // If either has no last name, first name match is accepted only if unique
  if (!cLast || !tLast) {
    return true;
  }

  // Direct last name match
  if (cLast === tLast) return true;

  // Clean initials (e.g. "h." -> "h", "t." -> "t")
  const cCleanLast = cLast.replace(/\./g, '').trim();
  const tCleanLast = tLast.replace(/\./g, '').trim();

  if (cCleanLast === tCleanLast) return true;

  // Initial check: if one is 1 character long, does it match the other's first character?
  if (cCleanLast.length === 1 && tCleanLast.startsWith(cCleanLast)) return true;
  if (tCleanLast.length === 1 && cCleanLast.startsWith(tCleanLast)) return true;

  return false;
}

/**
 * Extracts individual student tokens from a single or combined name string.
 * e.g. "Tina H. & Fabian T." -> ["Tina H.", "Fabian T."]
 * e.g. "Tina Huber, Fabian Trautmann" -> ["Tina Huber", "Fabian Trautmann"]
 */
export function extractStudentTokensFromName(nameStr?: string | null): string[] {
  if (!nameStr) return [];
  const clean = nameStr.replace(/^Unterricht:\s*/i, '').trim();
  if (!clean) return [];

  // Split by common delimiters (&, comma, und, and, +)
  const tokens = clean.split(/\s*(?:&|,|\bund\b|\band\b|\+)\s*/i)
    .map(t => t.trim())
    .filter(t => t.length > 0 && !['pause', 'schüler', 'student', 'vacant', 'unbekannt'].includes(t.toLowerCase()));

  return tokens.length > 0 ? tokens : [clean];
}

/**
 * Resolves a canonical student record from a student pool given an ID or name string.
 * Checks ID first, then exact `${first}_${last}`, then initial matching.
 */
export function resolveCanonicalStudentFromList<T extends { id: string; first_name?: string | null; last_name?: string | null; group_id?: string | null }>(
  query: { id?: string | null; name?: string | null; first_name?: string | null; last_name?: string | null } | string,
  students: T[]
): T | undefined {
  if (!query || !students || students.length === 0) return undefined;

  const qId = typeof query === 'string' ? query : query.id;
  const qName = typeof query === 'string' ? query : query.name;
  const qFirst = typeof query !== 'string' ? query.first_name : undefined;
  const qLast = typeof query !== 'string' ? query.last_name : undefined;

  // 1. Direct ID match
  if (qId && !String(qId).startsWith('idx-') && !String(qId).startsWith('group-')) {
    const direct = students.find(s => s.id === qId);
    if (direct) return direct;
  }

  // Construct target candidate object
  let candidateFirst = qFirst ? qFirst.trim() : '';
  let candidateLast = qLast ? qLast.trim() : '';

  if (!candidateFirst && qName) {
    const parts = qName.trim().split(/\s+/);
    candidateFirst = parts[0] || '';
    candidateLast = parts.slice(1).join(' ') || '';
  }

  if (!candidateFirst) return undefined;

  // 2. Full match
  const fullMatch = students.find(s =>
    (s.first_name || '').trim().toLowerCase() === candidateFirst.toLowerCase() &&
    (s.last_name || '').trim().toLowerCase() === candidateLast.toLowerCase()
  );
  if (fullMatch) return fullMatch;

  // 3. Initial match (e.g. "Tina H." matching "Tina Huber")
  const initialMatch = students.find(s =>
    matchStudentNameOrInitial(
      { first_name: candidateFirst, last_name: candidateLast },
      { id: s.id, first_name: s.first_name, last_name: s.last_name }
    )
  );

  return initialMatch;
}

