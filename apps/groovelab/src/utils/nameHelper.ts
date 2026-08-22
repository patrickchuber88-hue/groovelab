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
 * Format a single student name anonymized: "Vorname N."
 * Handles fallback ID and privacy mode.
 */
export function formatSingleStudentAnonymized(
  firstName?: string | null,
  lastName?: string | null,
  fallbackId?: string | null,
  privacyMode: boolean = true
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
  return text
    .split('\n')
    .map(line => {
      let l = line.trim();
      if (!l) return '';
      if (l.startsWith('LATENCY:') || l.startsWith('STICKER:') || l.startsWith('AUDIO:') || l === 'Inhalte in der Premium-Version freischalten') {
        return '';
      }
      l = l.replace(/LATENCY:\s*\d+/gi, '')
           .replace(/STICKER:[^\s\n·]*/gi, '')
           .replace(/\s*:\s*(?=·|$|\n)/g, '')
           .replace(/\s*·\s*·\s*/g, ' · ')
           .replace(/^\s*[·\s:]+/, '')
           .replace(/[·\s:]+$/, '')
           .trim();
      return l;
    })
    .filter(Boolean)
    .join('; ');
}

/**
 * Lehrkräfte-Namensanzeige (Vollständiger Name):
 * Lehrkräfte werden auf allen Oberflächen, Dashboards, Landingpages und Übersichten
 * für Schüler und Eltern immer einheitlich mit ihrem vollständigen Namen (Vorname + Nachname,
 * z. B. "Severin Landenberger") angezeigt. Lehrkräftenamen dürfen NIEMALS auf
 * "Vorname + Anfangsbuchstabe" gekürzt werden.
 */
export function formatTeacherFullName(
  firstOrObj?: any,
  lastName?: string | null
): string {
  let first = '';
  let last = '';

  if (typeof firstOrObj === 'object' && firstOrObj !== null) {
    first = (firstOrObj.first_name || firstOrObj.firstName || '').trim();
    last = (firstOrObj.last_name || firstOrObj.lastName || '').trim();
  } else if (typeof firstOrObj === 'string') {
    const raw = firstOrObj.trim();
    if (lastName !== undefined && lastName !== null) {
      first = raw;
      last = lastName.trim();
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
  let rawItemInst = (
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



