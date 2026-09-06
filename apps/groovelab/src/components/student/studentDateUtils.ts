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
    date = new Date();
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
    date = new Date();
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
    const parts = item.topic_name.split('Hausaufgabe KW ');
    const kwNum = parts[1]?.trim();
    if (kwNum) {
      const year = item.updated_at ? new Date(item.updated_at).getFullYear() : new Date().getFullYear();
      return `${year}-W${kwNum.padStart(2, '0')}`;
    }
  }
  return item.updated_at ? getISOWeek(item.updated_at) : '';
};

export const getLehrwerkColor = (title: string, customLehrwerkeList?: any[]) => {
  const trimmed = (title || '').trim();
  const list = customLehrwerkeList || [];
  const sorted = [...list].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  const index = sorted.findIndex(b => (b.title || '').trim() === trimmed);
  
  if (index !== -1 && sorted.length > 0) {
    const position = index % 26;
    const hue = Math.round((position / 25) * 360);
    return {
      from: `hsl(${hue}, 85%, 94%)`,
      to: `hsl(${hue}, 80%, 84%)`,
      text: `hsl(${hue}, 90%, 25%)`,
      shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
      shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
    };
  }

  const firstChar = trimmed.charAt(0).toUpperCase();
  const charCode = firstChar.charCodeAt(0) || 65;
  const clampedCode = Math.max(65, Math.min(90, charCode));
  const hue = Math.round(((clampedCode - 65) / 25) * 360);
  return {
    from: `hsl(${hue}, 85%, 94%)`,
    to: `hsl(${hue}, 80%, 84%)`,
    text: `hsl(${hue}, 90%, 25%)`,
    shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
    shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
  };
};

export const getSongColor = (title: string) => {
  const trimmed = (title || '').trim();
  const firstChar = trimmed.charAt(0).toUpperCase();
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
