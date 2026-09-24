export const getSimulatedNow = (): Date => {
  const simStr = typeof window !== 'undefined' ? localStorage.getItem('groovelab_simulated_date') : null;
  if (!simStr) return new Date();
  const parts = simStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0])) return new Date();
  const baseSim = new Date(parts[0], parts[1] - 1, parts[2], 14, 0, 0);
  const simStartTime = Number(localStorage.getItem('groovelab_simulated_start_timestamp') || Date.now());
  const elapsedMinutes = Math.floor((Date.now() - simStartTime) / 60000);
  return new Date(baseSim.getTime() + elapsedMinutes * 60000);
};

export const toLocalYYYYMMDD = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const getDaysBetweenLocal = (dateStr1: string, dateStr2: string) => {
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);
  const dt1 = new Date(y1, m1 - 1, d1, 12, 0, 0);
  const dt2 = new Date(y2, m2 - 1, d2, 12, 0, 0);
  const diffTime = dt2.getTime() - dt1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

export const getISOWeekRaw = (dateInput?: string | Date, lessonDay: number = 1): string => {
  let date: Date;
  if (!dateInput) {
    date = getSimulatedNow();
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    const match = String(dateInput).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed
      const day = parseInt(match[3], 10);
      date = new Date(year, month, day);
    } else {
      date = new Date(dateInput);
    }
  }
  
  if (isNaN(date.getTime())) {
    date = getSimulatedNow();
  }

  // Adjust the date back to the most recent lesson day
  const currentDay = date.getDay(); // 0 (Sun) to 6 (Sat)
  let diff = currentDay - lessonDay;
  if (diff < 0) {
    diff += 7;
  }
  
  const lessonStart = new Date(date);
  lessonStart.setDate(date.getDate() - diff);

  const d = new Date(Date.UTC(lessonStart.getFullYear(), lessonStart.getMonth(), lessonStart.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

export const getISOWeek = (dateInput?: string | Date): string => {
  return getISOWeekRaw(dateInput, 1);
};

export const getItemWeek = (item: { topic_name: string; updated_at?: string }): string => {
  if (item.topic_name.startsWith('Hausaufgabe KW ')) {
    const match = item.topic_name.match(/Hausaufgabe KW\s*(\d+)/i);
    if (match && match[1]) {
      const year = item.updated_at ? new Date(item.updated_at).getFullYear() : getSimulatedNow().getFullYear();
      return `${year}-W${match[1].padStart(2, '0')}`;
    }
  }
  return item.updated_at ? getISOWeek(item.updated_at) : '';
};

export const CANONICAL_LEHRWERK_COLOR = {
  from: '#ffe4e6',
  to: '#fecdd3',
  text: '#e11d48',
  accent: '#e11d48',
  border: '#fecdd3',
  badgeBg: '#fff1f2',
  badgeText: '#e11d48',
  shadowFrom: 'rgba(225, 29, 72, 0.18)',
  shadowTo: 'rgba(225, 29, 72, 0.12)'
};

export const getLehrwerkColor = (_title?: string, _customLehrwerkeList?: any[]) => {
  return CANONICAL_LEHRWERK_COLOR;
};

export const CURATED_ALPHABETICAL_SONG_PALETTE: Record<string, { from: string; to: string; text: string; shadowFrom?: string; shadowTo?: string }> = {
  A: { from: '#ffe4e6', to: '#fecdd3', text: '#be123c', shadowFrom: 'rgba(190, 18, 60, 0.2)', shadowTo: 'rgba(190, 18, 60, 0.12)' },
  B: { from: '#ffedd5', to: '#fed7aa', text: '#c2410c', shadowFrom: 'rgba(194, 65, 12, 0.2)', shadowTo: 'rgba(194, 65, 12, 0.12)' },
  C: { from: '#fef3c7', to: '#fde68a', text: '#b45309', shadowFrom: 'rgba(180, 83, 9, 0.2)', shadowTo: 'rgba(180, 83, 9, 0.12)' },
  D: { from: '#fef9c3', to: '#fef08a', text: '#854d0e', shadowFrom: 'rgba(133, 77, 14, 0.2)', shadowTo: 'rgba(133, 77, 14, 0.12)' },
  E: { from: '#ecfccb', to: '#d9f99d', text: '#4d7c0f', shadowFrom: 'rgba(77, 124, 15, 0.2)', shadowTo: 'rgba(77, 124, 15, 0.12)' },
  F: { from: '#d1fae5', to: '#a7f3d0', text: '#047857', shadowFrom: 'rgba(4, 120, 87, 0.2)', shadowTo: 'rgba(4, 120, 87, 0.12)' },
  G: { from: '#ccfbf1', to: '#99f6e4', text: '#0f766e', shadowFrom: 'rgba(15, 118, 110, 0.2)', shadowTo: 'rgba(15, 118, 110, 0.12)' },
  H: { from: '#e0f2fe', to: '#bae6fd', text: '#0369a1', shadowFrom: 'rgba(3, 105, 161, 0.2)', shadowTo: 'rgba(3, 105, 161, 0.12)' },
  I: { from: '#dbeafe', to: '#bfdbfe', text: '#1d4ed8', shadowFrom: 'rgba(29, 78, 216, 0.2)', shadowTo: 'rgba(29, 78, 216, 0.12)' },
  J: { from: '#e0e7ff', to: '#c7d2fe', text: '#4338ca', shadowFrom: 'rgba(67, 56, 202, 0.2)', shadowTo: 'rgba(67, 56, 202, 0.12)' },
  K: { from: '#ede9fe', to: '#ddd6fe', text: '#6d28d9', shadowFrom: 'rgba(109, 40, 217, 0.2)', shadowTo: 'rgba(109, 40, 217, 0.12)' },
  L: { from: '#f3e8ff', to: '#e9d5ff', text: '#7e22ce', shadowFrom: 'rgba(126, 34, 206, 0.2)', shadowTo: 'rgba(126, 34, 206, 0.12)' },
  M: { from: '#fae8ff', to: '#f5d0fe', text: '#a21caf', shadowFrom: 'rgba(162, 28, 175, 0.2)', shadowTo: 'rgba(162, 28, 175, 0.12)' },
  N: { from: '#fce7f3', to: '#fbcfe8', text: '#be185d', shadowFrom: 'rgba(190, 24, 93, 0.2)', shadowTo: 'rgba(190, 24, 93, 0.12)' },
  O: { from: '#f5f3ff', to: '#ede9fe', text: '#5b21b6', shadowFrom: 'rgba(91, 33, 182, 0.2)', shadowTo: 'rgba(91, 33, 182, 0.12)' },
  P: { from: '#fff1f2', to: '#ffe4e6', text: '#9f1239', shadowFrom: 'rgba(159, 18, 57, 0.2)', shadowTo: 'rgba(159, 18, 57, 0.12)' },
  Q: { from: '#ffedd5', to: '#fed7aa', text: '#9a3412', shadowFrom: 'rgba(154, 52, 18, 0.2)', shadowTo: 'rgba(154, 52, 18, 0.12)' },
  R: { from: '#ffe4e6', to: '#fecdd3', text: '#881337', shadowFrom: 'rgba(136, 19, 55, 0.2)', shadowTo: 'rgba(136, 19, 55, 0.12)' },
  S: { from: '#dcfce7', to: '#bbf7d0', text: '#15803d', shadowFrom: 'rgba(21, 128, 61, 0.2)', shadowTo: 'rgba(21, 128, 61, 0.12)' },
  T: { from: '#cffafe', to: '#a5f3fc', text: '#0e7490', shadowFrom: 'rgba(14, 116, 144, 0.2)', shadowTo: 'rgba(14, 116, 144, 0.12)' },
  U: { from: '#e0f2fe', to: '#bae6fd', text: '#0284c7', shadowFrom: 'rgba(2, 132, 199, 0.2)', shadowTo: 'rgba(2, 132, 199, 0.12)' },
  V: { from: '#ede9fe', to: '#ddd6fe', text: '#5b21b6', shadowFrom: 'rgba(91, 33, 182, 0.2)', shadowTo: 'rgba(91, 33, 182, 0.12)' },
  W: { from: '#ccfbf1', to: '#99f6e4', text: '#115e59', shadowFrom: 'rgba(17, 94, 89, 0.2)', shadowTo: 'rgba(17, 94, 89, 0.12)' },
  X: { from: '#f1f5f9', to: '#e2e8f0', text: '#334155', shadowFrom: 'rgba(51, 65, 85, 0.2)', shadowTo: 'rgba(51, 65, 85, 0.12)' },
  Y: { from: '#f8fafc', to: '#f1f5f9', text: '#1e293b', shadowFrom: 'rgba(30, 41, 59, 0.2)', shadowTo: 'rgba(30, 41, 59, 0.12)' },
  Z: { from: '#e2e8f0', to: '#cbd5e1', text: '#0f172a', shadowFrom: 'rgba(15, 23, 42, 0.2)', shadowTo: 'rgba(15, 23, 42, 0.12)' }
};

export const getSongColor = (title: string) => {
  let clean = (title || '').trim();
  // If formatted as "Artist - SongTitle", extract the actual song title so color is 100% harmonized across all views
  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    if (parts.length >= 2 && parts[1]?.trim()) {
      clean = parts.slice(1).join(' - ').trim();
    }
  }
  // Strip trailing parens like (Akustik)
  clean = clean.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const firstChar = clean.charAt(0).toUpperCase();
  if (CURATED_ALPHABETICAL_SONG_PALETTE[firstChar]) {
    return CURATED_ALPHABETICAL_SONG_PALETTE[firstChar];
  }
  const charCode = firstChar.charCodeAt(0) || 65;
  const clampedCode = Math.max(65, Math.min(90, charCode));
  const hue = Math.round(((clampedCode - 65) / 25) * 360);
  return {
    from: `hsl(${hue}, 85%, 92%)`,
    to: `hsl(${hue}, 80%, 82%)`,
    text: `hsl(${hue}, 90%, 25%)`,
    shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
    shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
  };
};

export const getSchoolYearString = (dateInput?: string | Date): string => {
  let d = new Date();
  if (dateInput) {
    const parsed = new Date(dateInput);
    if (!isNaN(parsed.getTime())) {
      d = parsed;
    }
  }
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed (0 = Jan, 8 = Sept)
  if (month >= 8) {
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
};

export const getExactLogSeconds = (log: any): number => {
  if (!log) return 0;
  if (typeof log.duration_seconds === 'number' && log.duration_seconds > 0) {
    return log.duration_seconds;
  }
  if (typeof log.duration_minutes === 'number' && log.duration_minutes > 0) {
    return log.duration_minutes * 60;
  }
  return 0;
};

export const secondsToDisplayMinutes = (totalSeconds: number): number => {
  if (!totalSeconds || totalSeconds <= 0) return 0;
  return Math.round(totalSeconds / 60);
};

export const getFlameCategory = (streak: number): 'kleine' | 'mittlere' | 'helden' => {
  if (streak >= 9) return 'helden';
  if (streak >= 4) return 'mittlere';
  return 'kleine';
};

export const formatMins = (mins: number) => {
  if (mins < 60) return `${Math.round(mins)} Min.`;
  const hrs = Math.floor(mins / 60);
  const rem = Math.round(mins % 60);
  return rem > 0 ? `${hrs} Std. ${rem} Min.` : `${hrs} Std.`;
};

export const getWeekDateRange = (weekIso: string): string => {
  if (!weekIso || !weekIso.includes('-W')) return '';
  const [yearStr, wStr] = weekIso.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);
  if (isNaN(year) || isNaN(week)) return '';

  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const mondayWeek1 = new Date(year, 0, 4 - dayOfWeek + 1);
  const targetMonday = new Date(mondayWeek1.getTime() + (week - 1) * 7 * 86400000);
  const targetSunday = new Date(targetMonday.getTime() + 6 * 86400000);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(targetMonday.getDate())}.${pad(targetMonday.getMonth() + 1)}. – ${pad(targetSunday.getDate())}.${pad(targetSunday.getMonth() + 1)}.`;
};
