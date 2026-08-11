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
 */
export function formatGroupStudentsAnonymized(
  studentsOrOccurrences: any[],
  privacyMode: boolean = true
): string {
  if (!Array.isArray(studentsOrOccurrences) || studentsOrOccurrences.length === 0) {
    return '';
  }

  const formattedNames: string[] = [];

  studentsOrOccurrences.forEach((item, idx) => {
    if (!item) return;
    const fn = item.first_name || item.student?.first_name || item.student_first_name || item.firstName || item.name || '';
    const ln = item.last_name || item.student?.last_name || item.student_last_name || item.lastName || '';
    const id = item.id || item.student_id || item.student?.id || `idx-${idx}`;

    const formatted = formatSingleStudentAnonymized(fn, ln, id, privacyMode);
    if (formatted && formatted !== 'Schüler' && !formattedNames.includes(formatted)) {
      formattedNames.push(formatted);
    }
  });

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
 * Datenschutz-Standard für Geburtsdaten:
 * Geburtstage von Schülern werden niemals vollständig (Jahr/Monat) gespeichert.
 * Beim Onboarding in der Verwaltung wird lediglich der Tag des Geburtstags (DD)
 * extrahiert und im neutralen Format 2000-01-DD hinterlegt.
 */
export function sanitizeBirthDateToDayOnly(dateStr: string | null | undefined): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const str = dateStr.trim();
  let dayStr = '';
  if (str.includes('.')) {
    // Format DD.MM.YYYY
    const parts = str.split('.');
    dayStr = parts[0];
  } else if (str.includes('-')) {
    // Format YYYY-MM-DD
    const parts = str.split('-');
    dayStr = parts[parts.length - 1];
  } else {
    dayStr = str;
  }
  const dayNum = parseInt(dayStr, 10);
  if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) return null;
  const dayPadded = String(dayNum).padStart(2, '0');
  return `2000-01-${dayPadded}`;
}

