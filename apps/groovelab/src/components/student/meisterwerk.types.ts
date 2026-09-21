import { isInternalMetadataNote } from '../../domain/stickersAndTresor';

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  school_id?: string;
  schoolId?: string;
  is_campus_active?: boolean;
  [key: string]: any;
}

export interface MeisterwerkDocumentationModalProps {
  student: Student;
  onClose: () => void;
  teacherId?: string;
  teacherName?: string;
  schoolName?: string;
  schoolId?: string;
  initialLehrwerkId?: string;
  initialViewMode?: 'document' | 'recordings' | 'loopstation' | 'practice';
  initialModalTab?: 'document' | 'logbook' | 'stickeralbum' | 'skillradar' | 'audiobiography';
  onProfileClick?: (student: Student) => void;
  readOnly?: boolean;
  isEmbed?: boolean;
  isTeacherTools?: boolean;
  uiLevel?: 'junior' | 'teen' | 'pro';
  initialXp?: number;
  initialStreak?: number;
  initialPracticeMinutes?: number;
  initialMasteredSongsCount?: number;
  hasTresorStorage?: boolean;
  groupStudents?: Student[];
  isParentUnlocked?: boolean;
  parentPermissions?: any;
  onSaveParentOverrides?: (overrides: Record<string, boolean>) => void;
  isSoftLocked?: boolean;
  onTriggerSoftLock?: () => void;
  initialLehrwerke?: any[];
  initialSongs?: any[];
  initialProgressItems?: any[];
  initialLocalProgress?: any[];
  onSongsUpdated?: (updatedSkills: any[]) => void;
  isTeacherSandbox?: boolean;
  onOpenAssignModal?: () => void;
}

export interface ProgressItem {
  id?: string;
  topic_name: string;
  status: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED';
  is_current_homework: boolean;
  teacher_notes: string;
  homework_notes?: string;
  created_at?: string;
  updated_at?: string;
  student_rating?: number | null;
  is_match_mode_enabled?: boolean;
  last_matched_at?: string | null;
  last_matched_teacher_percent?: number | null;
  last_matched_student_percent?: number | null;
  is_match_successful?: boolean | null;
}

export const formatPageNumbers = (pages: number[]): string => {
  if (pages.length === 0) return '';
  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = start;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      if (start === end) {
        ranges.push(`${start}`);
      } else {
        ranges.push(`${start}–${end}`);
      }
      start = sorted[i];
      end = start;
    }
  }
  if (start === end) {
    ranges.push(`${start}`);
  } else {
    ranges.push(`${start}–${end}`);
  }
  
  if (ranges.length === 1) return `S. ${ranges[0]}`;
  const last = ranges.pop();
  return `S. ${ranges.join(', ')} & ${last}`;
};

export const getCleanPageNotes = (notes: any): string => {
  if (!notes) return '';
  let text = '';
  if (typeof notes === 'string') {
    if (notes.startsWith('[') || notes.startsWith('{')) {
      try {
        const parsed = JSON.parse(notes);
        if (Array.isArray(parsed)) {
          text = parsed.join('\n');
        } else {
          text = String(parsed);
        }
      } catch {
        text = notes;
      }
    } else {
      text = notes;
    }
  } else if (Array.isArray(notes)) {
    text = notes.join('\n');
  } else {
    text = String(notes);
  }
  return text
    .split('\n')
    .filter((line: string) => !isInternalMetadataNote(line))
    .map((line: string) => line.replace(/^[•\-\*\s]+/, '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
};

export const getCleanTeacherHomeworkText = (notes: any): string => {
  if (!notes) return '';
  let text = '';
  if (typeof notes === 'string') {
    if (notes.startsWith('[') || notes.startsWith('{')) {
      try {
        const parsed = JSON.parse(notes);
        if (Array.isArray(parsed)) {
          text = parsed.join('\n');
        } else {
          text = String(parsed);
        }
      } catch {
        text = notes;
      }
    } else {
      text = notes;
    }
  } else if (Array.isArray(notes)) {
    text = notes.join('\n');
  } else {
    text = String(notes);
  }
  return text
    .split('\n')
    .filter((line: string) => !isInternalMetadataNote(line))
    .map((line: string) => line.replace(/^[•\-\*\s]+/, '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
};

export const formatStudentNoteDisplay = (note: string): { isStudentNote: boolean; isPrivate: boolean; text: string } => {
  if (!note) return { isStudentNote: false, isPrivate: false, text: '' };
  
  if (note.startsWith('STUDENT_NOTE_PUBLIC:')) {
    const raw = note.replace(/^STUDENT_NOTE_PUBLIC:[^|]*\|/, '').trim();
    const clean = raw.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
    return { isStudentNote: true, isPrivate: false, text: clean || raw };
  }
  
  if (note.startsWith('STUDENT_NOTE_PRIVATE:')) {
    const raw = note.replace(/^STUDENT_NOTE_PRIVATE:[^|]*\|/, '').trim();
    const clean = raw.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
    return { isStudentNote: true, isPrivate: true, text: clean || raw };
  }
  
  return { isStudentNote: false, isPrivate: false, text: note };
};

export interface ParsedStudentQuestion {
  hasQuestion: boolean;
  rawEntry: string | null;
  text: string;
  timestamp: string | null;
}

export const parseStudentQuestionFromNotes = (notesList: any[]): ParsedStudentQuestion => {
  if (!Array.isArray(notesList)) {
    return { hasQuestion: false, rawEntry: null, text: '', timestamp: null };
  }
  const qEntry = notesList.find(
    n => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:'))
  );
  if (!qEntry) {
    return { hasQuestion: false, rawEntry: null, text: '', timestamp: null };
  }
  if (qEntry.startsWith('STUDENT_QUESTION:')) {
    const withoutPrefix = qEntry.replace(/^STUDENT_QUESTION:/, '');
    const pipeIdx = withoutPrefix.indexOf('|');
    if (pipeIdx !== -1) {
      const ts = withoutPrefix.slice(0, pipeIdx);
      const txt = withoutPrefix.slice(pipeIdx + 1).trim();
      return { hasQuestion: true, rawEntry: qEntry, text: txt, timestamp: ts };
    }
    return { hasQuestion: true, rawEntry: qEntry, text: withoutPrefix.trim(), timestamp: null };
  }
  if (qEntry.startsWith('❓ Frage für den Unterricht:')) {
    const txt = qEntry.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
    return { hasQuestion: true, rawEntry: qEntry, text: txt, timestamp: null };
  }
  return { hasQuestion: false, rawEntry: null, text: '', timestamp: null };
};

export interface ParsedStudentAnnotation {
  targetStudentName: string | null;
  isSpecificToAnother: boolean;
  isSpecificToCurrent: boolean;
  isGeneralOrAll: boolean;
  cleanText: string;
  rawText: string;
}

export const parseStudentAnnotation = (
  line: string, 
  currentStudentFirstName: string, 
  isTeacherMode: boolean = false
): ParsedStudentAnnotation => {
  if (!line || typeof line !== 'string') {
    return { targetStudentName: null, isSpecificToAnother: false, isSpecificToCurrent: false, isGeneralOrAll: true, cleanText: '', rawText: '' };
  }
  
  const trimmed = line.trim();
  const match = trimmed.match(/^@([a-zA-ZäöüÄÖÜß0-9_-]+)(?::|\s)\s*(.*)$/i);
  
  if (!match) {
    return {
      targetStudentName: null,
      isSpecificToAnother: false,
      isSpecificToCurrent: false,
      isGeneralOrAll: true,
      cleanText: trimmed,
      rawText: trimmed
    };
  }

  const target = match[1].trim();
  const rest = match[2].trim();
  const targetLower = target.toLowerCase();
  const currentLower = (currentStudentFirstName || '').toLowerCase().trim();

  const isAll = targetLower === 'alle' || targetLower === 'all' || targetLower === 'gruppe' || targetLower === 'group' || targetLower === 'duo' || targetLower === 'band';
  
  if (isAll) {
    return {
      targetStudentName: 'Alle',
      isSpecificToAnother: false,
      isSpecificToCurrent: false,
      isGeneralOrAll: true,
      cleanText: rest || trimmed,
      rawText: trimmed
    };
  }

  const isCurrent = currentLower.length > 0 && (targetLower === currentLower || targetLower.startsWith(currentLower) || currentLower.startsWith(targetLower));

  return {
    targetStudentName: target,
    isSpecificToAnother: !isTeacherMode && !isCurrent,
    isSpecificToCurrent: isCurrent,
    isGeneralOrAll: false,
    cleanText: rest || trimmed,
    rawText: trimmed
  };
};

export const SKILL_TAGS = [
  { key: 'rhythmus', label: 'Rhythmus & Timing', shortLabel: 'Rhythmus', icon: '🥁', color: '#4338ca', bg: '#e0e7ff', lightBg: '#eef2ff', border: '#c7d2fe', dotColor: '#4338ca', category: 'musical', description: 'Metronom-Präzision & Groove-Verständnis' },
  { key: 'technik', label: 'Technik & Motorik', shortLabel: 'Technik', icon: '⚡', color: '#1e40af', bg: '#eff6ff', lightBg: '#eff6ff', border: '#bfdbfe', dotColor: '#2563eb', category: 'musical', description: 'Fingerfertigkeit, Haltung & Geschmeidigkeit' },
  { key: 'klang', label: 'Klang & Tonkultur', shortLabel: 'Klang', icon: '🎵', color: '#166534', bg: '#e6f4ea', lightBg: '#f0fdf4', border: '#bbf7d0', dotColor: '#16a34a', category: 'musical', legacyKey: 'intonation', description: 'Tonreinheit, Phrasierung & Sound' },
  { key: 'ausdruck', label: 'Ausdruck & Dynamik', shortLabel: 'Ausdruck', icon: '🎭', color: '#6b21a8', bg: '#f3e8ff', lightBg: '#faf5ff', border: '#e9d5ff', dotColor: '#9333ea', category: 'musical', description: 'Musikalische Emotion & dynamische Nuancen' },
  { key: 'repertoire', label: 'Repertoire & Performance', shortLabel: 'Repertoire', icon: '🌟', color: '#854d0e', bg: '#fef9c3', lightBg: '#fefce8', border: '#fef08a', dotColor: '#d97706', category: 'musical', description: 'Bühnenpräsenz, Song-Reife & Souveränität' },
];

export const parseSongArtistAndTitle = (raw: string | undefined): { title: string; artist?: string } => {
  if (!raw || !raw.trim()) return { title: 'Song' };
  const trimmed = raw.trim();
  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ');
    const artist = parts[0].trim();
    const title = parts.slice(1).join(' - ').trim();
    return { title: title || trimmed, artist: artist || undefined };
  }
  return { title: trimmed };
};

export const DIDACTIC_QUICK_TAGS = [
  { tag: '#Technik', desc: 'Motorik & Handhaltung', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', skillKey: 'technik' },
  { tag: '#Rhythmus', desc: 'Metronom & Timing', color: '#4338ca', bg: '#e0e7ff', border: '#c7d2fe', skillKey: 'rhythmus' },
  { tag: '#Klang', desc: 'Tonkultur & Sauberkeit', color: '#166534', bg: '#e6f4ea', border: '#bbf7d0', skillKey: 'intonation' },
  { tag: '#Ausdruck', desc: 'Dynamik & Phrasierung', color: '#6b21a8', bg: '#f3e8ff', border: '#e9d5ff', skillKey: 'ausdruck' },
  { tag: '#Repertoire', desc: 'Songs & Stücke', color: '#854d0e', bg: '#fef9c3', border: '#fef08a', skillKey: 'repertoire' },
  { tag: '#Theorie', desc: 'Noten & Harmonielehre', color: '#b45309', bg: '#fef3c7', border: '#fde68a', skillKey: 'theorie' },
  { tag: '#Wichtig', desc: 'Wichtiger Hinweis', color: '#9f1239', bg: '#ffe4e6', border: '#fecdd3' },
  { tag: '#Konzert', desc: 'Vorspiel & Bühne', color: '#9a3412', bg: '#ffedd5', border: '#fed7aa' }
];

export const PRESET_CHIPS: { label: string; text: string; isBpm?: boolean }[] = [
  { label: 'Tempo halten', text: 'Achte auf ein gleichmäßiges Tempo und übe gezielt mit dem Metronom.', isBpm: false },
  { label: 'Sauber spielen', text: 'Spiele diese Stelle besonders sauber, achte auf saubere Töne und klaren Klang.', isBpm: false },
  { label: 'Rhythmus (60 BPM)', text: 'Übe diesen Rhythmus präzise auf den Klick (60 BPM).', isBpm: true },
  { label: 'Fingersatz üben', text: 'Halte dich exakt an den notierten Fingersatz und achte auf eine entspannte Handhaltung.', isBpm: false },
  { label: 'Ausdruck & Dynamik', text: 'Gestalte die Dynamik bewusst (p/f) und bringe Emotion und Gefühl in deinen Ausdruck.', isBpm: false },
  { label: 'Auswendig spielen', text: 'Präge dir diesen Abschnitt auswendig ein und spiele frei ohne Notenblatt.', isBpm: false },
  { label: 'Kontinuität üben', text: 'Übe diese Stelle täglich 10 Minuten für eine hohe Kontinuität und Sicherheit.', isBpm: false },
  { label: 'Selbstständig üben', text: 'Erarbeite dir die nächsten Takte selbstständig und achte auf eigene Fehlerkorrektur.', isBpm: false }
];

export const getHomeworkNoteItems = (notesText: string): string[] => {
  if (!notesText || !notesText.trim()) return [];
  return notesText
    .split('\n')
    .map(s => s.replace(/^[•\-\*\s]+/, '').trim())
    .filter(s => s.length > 0 && !isInternalMetadataNote(s));
};
