/**
 * 🏛️ Kanonische Typen und Hilfsfunktionen für das ScheduleBoard (Mobile & Desktop)
 * 
 * Single Source of Truth (SSOT) zur Vermeidung von Typ- und Logik-Diskrepanzen.
 */

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  instrument: string;
  duration: number; // Duration in minutes (e.g. 30, 45, 60)
  assignedDay?: number; // 1 = Mon, 2 = Tue, etc.
  assignedTime?: string; // e.g. "14:30"
  isBreak?: boolean;
  customStartTime?: string;
  isPinned?: boolean;
  preferenceMatch?: 'first' | 'secondary' | 'deviation';
  status?: 'ausstehend' | 'verplant' | 'aktiv' | 'in_bearbeitung';
  isGroup?: boolean;
  groupStudents?: Student[];
  sibling_group_id?: string;
  group_id?: string | null;
  isOnboarded?: boolean;
  hasPreferences?: boolean;
  teacher_id?: string;
  isVacant?: boolean;
}

export interface DayBoard {
  id: string; // unique board id
  dayOfWeek: number; // 1 = Monday, 2 = Tuesday, etc.
  startAnchor: string; // e.g. "14:00"
  endAnchor?: string;
  availabilityEnd?: string; // hard limit for teacher's day
  roomId?: string; // room associated with this board
  students: Student[]; // Ordered list of assigned students
}

export interface ScheduleRoom {
  id: string;
  name: string;
}

export const parseTime = (timeStr: string | null | undefined, fallback = '14:00'): [number, number] => {
  const str = timeStr || fallback || '14:00';
  if (!str || typeof str !== 'string' || !str.includes(':')) return [14, 0];
  const parts = str.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return [14, 0];
  return [parts[0], parts[1]];
};

export const getPrefStartEndMinutes = (pref: any): { startMin: number; endMin: number } => {
  if (!pref) return { startMin: 0, endMin: 0 };
  const [sh, sm] = parseTime(pref.start_time);
  let [eh, em] = parseTime(pref.end_time || pref.start_time);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) {
    endMin = startMin + 120;
  }
  return { startMin, endMin };
};

export const parseDayNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const num = Number(val);
  if (!isNaN(num)) return num;
  const str = String(val).trim().toLowerCase();
  if (str.includes('mon')) return 1;
  if (str.includes('die') || str.includes('tue')) return 2;
  if (str.includes('mit') || str.includes('wed')) return 3;
  if (str.includes('don') || str.includes('thu')) return 4;
  if (str.includes('fre') || str.includes('fri')) return 5;
  if (str.includes('sam') || str.includes('sat')) return 6;
  if (str.includes('son') || str.includes('sun')) return 7;
  return 0;
};

export const resolveFirstName = (s: any): string => {
  if (s && s.first_name && typeof s.first_name === 'string' && s.first_name.trim()) return s.first_name.trim();
  const fullName = s?.full_name || s?.name || s?.display_name || '';
  if (fullName && typeof fullName === 'string' && fullName.trim()) return fullName.trim().split(' ')[0];
  return 'Schüler';
};

export const resolveLastName = (s: any): string => {
  if (s && s.last_name && typeof s.last_name === 'string' && s.last_name.trim()) return s.last_name.trim();
  const fullName = s?.full_name || s?.name || s?.display_name || '';
  if (fullName && typeof fullName === 'string' && fullName.trim().includes(' ')) return fullName.trim().split(' ').slice(1).join(' ');
  return '';
};

export const formatMinutes = (totalMins: number): string => {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
