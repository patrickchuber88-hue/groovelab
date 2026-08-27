import React from 'react';
import {
  Zap,
  Activity,
  Volume2,
  Sparkles,
  Music,
  BookOpen,
  CheckSquare,
  Building2,
  DoorOpen,
  GraduationCap,
  Lightbulb,
  Pin,
  Hash
} from 'lucide-react';

export interface TagDefinition {
  key: string;
  tag: string;
  label: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
  iconName: string;
}

export const STUDENT_SKILL_TAGS: TagDefinition[] = [
  { key: 'technik', tag: '#Technik', label: 'Technik', desc: 'Motorik & Handhaltung', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', iconName: 'zap' },
  { key: 'rhythmus', tag: '#Rhythmus', label: 'Rhythmus', desc: 'Timing & Metronom', color: '#4338ca', bg: '#e0e7ff', border: '#c7d2fe', iconName: 'activity' },
  { key: 'klang', tag: '#Klang', label: 'Klang', desc: 'Intonation & Tonkultur', color: '#166534', bg: '#e6f4ea', border: '#bbf7d0', iconName: 'volume' },
  { key: 'ausdruck', tag: '#Ausdruck', label: 'Ausdruck', desc: 'Dynamik & Phrasierung', color: '#6b21a8', bg: '#f3e8ff', border: '#e9d5ff', iconName: 'sparkles' },
  { key: 'repertoire', tag: '#Repertoire', label: 'Repertoire', desc: 'Songs & Stücke', color: '#854d0e', bg: '#fef9c3', border: '#fef08a', iconName: 'music' },
  { key: 'hausaufgabe', tag: '#Hausaufgabe', label: 'Hausaufgabe', desc: 'Wochenauftrag', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', iconName: 'book' },
];

export const TEACHER_ORGANIZATION_TAGS: TagDefinition[] = [
  { key: 'todo', tag: '#To-Do', label: 'To-Do', desc: 'Aufgabe & Erledigung', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', iconName: 'check-square' },
  { key: 'verwaltung', tag: '#Verwaltung', label: 'Verwaltung', desc: 'Sekretariat & Orga', color: '#b45309', bg: '#fef3c7', border: '#fde68a', iconName: 'building' },
  { key: 'raum', tag: '#Raum', label: 'Raum', desc: 'Equipment & Defekte', color: '#dc2626', bg: '#fee2e2', border: '#fecaca', iconName: 'door' },
  { key: 'konzert', tag: '#Konzert', label: 'Konzert', desc: 'Vorspiel & Bühne', color: '#9a3412', bg: '#ffedd5', border: '#fed7aa', iconName: 'graduation' },
  { key: 'idee', tag: '#Idee', label: 'Idee', desc: 'Methode & Material', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', iconName: 'lightbulb' },
  { key: 'wichtig', tag: '#Wichtig', label: 'Wichtig', desc: 'Dringender Hinweis', color: '#9f1239', bg: '#ffe4e6', border: '#fecdd3', iconName: 'pin' },
];

export const COMMON_TAGS = ['Hausaufgabe', 'Technik', 'Repertoire', 'Theorie', 'Konzert', 'Wichtig', 'Audio'];

export const QUICK_SNIPPETS = [
  { id: 'takt', label: 'Takt & BPM', icon: Zap, snippet: 'Takt 1-8 bei 80 BPM üben', desc: 'Übe-Auftrag mit Metronom' },
  { id: 'tonleiter', label: 'Tonleiter', icon: Music, snippet: 'Tonleiter G-Dur flüssig mit Metronom wiederholen', desc: 'Technik & Gehörbildung' },
  { id: 'playalong', label: 'Play-Along', icon: Sparkles, snippet: 'Play-Along Track anhören und mitspielen', desc: 'Song-Begleitung' },
  { id: 'buch', label: 'Notenbuch', icon: BookOpen, snippet: 'Bitte Notenheft zur nächsten Stunde mitbringen', desc: 'Material-Erinnerung' },
  { id: 'todo', label: 'To-Do', icon: CheckSquare, snippet: '- Noten kopieren für nächste Stunde', desc: 'Persönliche Aufgabe' },
  { id: 'raum', label: 'Raum-Mangel', icon: DoorOpen, snippet: '!Raum 4: Mangel melden: ', desc: 'Meldung an Sekretariat' }
];

export const renderMonochromeTagIcon = (iconName: string, size = 11, color = 'currentColor') => {
  switch (iconName) {
    case 'zap': return <Zap size={size} color={color} />;
    case 'activity': return <Activity size={size} color={color} />;
    case 'volume': return <Volume2 size={size} color={color} />;
    case 'sparkles': return <Sparkles size={size} color={color} />;
    case 'music': return <Music size={size} color={color} />;
    case 'book': return <BookOpen size={size} color={color} />;
    case 'check-square': return <CheckSquare size={size} color={color} />;
    case 'building': return <Building2 size={size} color={color} />;
    case 'door': return <DoorOpen size={size} color={color} />;
    case 'graduation': return <GraduationCap size={size} color={color} />;
    case 'lightbulb': return <Lightbulb size={size} color={color} />;
    case 'pin': return <Pin size={size} color={color} />;
    default: return <Hash size={size} color={color} />;
  }
};

export const getAllTagStyle = (tagStr: string) => {
  const clean = tagStr.replace(/^#/, '').toLowerCase();
  const all = [...STUDENT_SKILL_TAGS, ...TEACHER_ORGANIZATION_TAGS];
  const found = all.find(t => t.key === clean || t.tag.toLowerCase() === `#${clean}` || t.label.toLowerCase() === clean);
  if (found) return found;
  return { key: clean, tag: `#${clean}`, label: clean, color: '#475569', bg: '#f1f5f9', border: '#e2e8f0', iconName: 'hash' };
};

// Clean Natural Language Note Content for Typography (Strips redundant @Name, - , !Room)
export const formatCleanNoteContent = (content: string, studentName?: string | null): string => {
  if (!content) return '';
  let cleaned = content.trim();

  // Strip leading @Student or @Name
  if (studentName) {
    const fName = studentName.split(/\s+/)[0];
    const regexExact = new RegExp(`^@${fName}\\s*`, 'i');
    cleaned = cleaned.replace(regexExact, '');
  }
  cleaned = cleaned.replace(/^@[A-Za-z0-9äöüÄÖÜß\.\s]+?(?=[\s,;!#]|$)\s*/i, '');

  // Strip leading - or // or [ ] or todo:
  if (cleaned.startsWith('- ')) {
    cleaned = cleaned.slice(2).trim();
  } else if (cleaned.startsWith('// ')) {
    cleaned = cleaned.slice(3).trim();
  } else if (cleaned.startsWith('[ ] ')) {
    cleaned = cleaned.slice(4).trim();
  } else if (/^todo:\s*/i.test(cleaned)) {
    cleaned = cleaned.replace(/^todo:\s*/i, '');
  }

  // Strip leading !Room (e.g. !Raum 4, !Raum 4:, !Konzertsaal, !Groovelab Nebenraum)
  cleaned = cleaned.replace(/^![A-Za-z0-9äöüÄÖÜß_-]+(?:\s+(?:\d+|Nebenraum|Studio|Saal))?(?=[\s,;!#:]|$)\s*:?\s*/i, '');
  // Strip leading Mangel-Phrases if user used snippet
  cleaned = cleaned.replace(/^(?:Mangel melden|Mangel|Defekt|Reparatur)\s*:?\s*/i, '');

  if (!cleaned) return content;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export const formatDueDateBadge = (dateStr?: string | null): { label: string; isOverdue: boolean; isToday: boolean } => {
  if (!dateStr) return { label: '', isOverdue: false, isToday: false };
  const todayStr = new Date().toISOString().split('T')[0];
  if (dateStr < todayStr) {
    const diffDays = Math.max(1, Math.round((new Date(todayStr).getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)));
    return { label: `Überfällig (${diffDays}T)`, isOverdue: true, isToday: false };
  }
  if (dateStr === todayStr) {
    return { label: 'Heute fällig', isOverdue: false, isToday: true };
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return { label: `Bis ${parts[2]}.${parts[1]}.`, isOverdue: false, isToday: false };
  }
  return { label: dateStr, isOverdue: false, isToday: false };
};

// Helper to strictly ensure "Musiker" is NEVER displayed as an instrument
export const resolveCleanInstrument = (s: any, teacherInst?: string | null): string => {
  const raw = (s?.instrument || s?.subject || '').trim();
  const isInvalid = !raw || raw.toLowerCase() === 'musiker' || raw.toLowerCase() === 'allgemein' || raw.toLowerCase() === 'student';
  if (!isInvalid) return raw;
  if (teacherInst && teacherInst.toLowerCase() !== 'musiker' && teacherInst.toLowerCase() !== 'allgemein') {
    return teacherInst.trim();
  }
  return 'Gitarre';
};

// Date calculation helpers for quick Due Date presets
export const getQuickDate = (type: 'today' | 'tomorrow' | 'friday' | 'next_week'): string => {
  const d = new Date();
  if (type === 'tomorrow') d.setDate(d.getDate() + 1);
  if (type === 'friday') {
    const day = d.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
  }
  if (type === 'next_week') d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
};
