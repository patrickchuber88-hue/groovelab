import { ProgramPoint } from '../types/campusEvents.types';

export const formatToLocalDatetime = (isoString: string | null | undefined): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

export const parseTimeToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
};

export const formatMinutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const calculateTimelineTimes = (
  points: ProgramPoint[],
  eventStartTimeStr: string = '14:00',
  transitionTime: number = 3
): Record<string, { startMin: number; endMin: number; start: string; end: string }> => {
  const startMin = parseTimeToMinutes(eventStartTimeStr || '14:00');
  const stages: Record<number, ProgramPoint[]> = {};
  
  points.forEach(pp => {
    if (pp.is_scheduled || pp.is_pause) {
      const stage = pp.stage_number || 1;
      if (!stages[stage]) stages[stage] = [];
      stages[stage].push(pp);
    }
  });

  const timeMap: Record<string, { startMin: number; endMin: number; start: string; end: string }> = {};

  Object.keys(stages).forEach(stageStr => {
    const stageNum = parseInt(stageStr, 10);
    const stagePoints = stages[stageNum].sort((a, b) => a.sort_order - b.sort_order);
    let currentMin = startMin;
    stagePoints.forEach((pp, idx) => {
      const duration = pp.duration || 0;
      
      // Add transition buffer between non-pause consecutive program points
      if (idx > 0 && !pp.is_pause && !stagePoints[idx - 1].is_pause) {
        currentMin += transitionTime;
      }

      timeMap[pp.id] = {
        startMin: currentMin,
        endMin: currentMin + duration,
        start: formatMinutesToTime(currentMin),
        end: formatMinutesToTime(currentMin + duration)
      };
      currentMin += duration;
    });
  });

  return timeMap;
};

export const parseTechRequirements = (techStr?: string | null): any[] => {
  if (!techStr) return [];
  const trimmed = techStr.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }
  return [];
};

export const parseICSDate = (icsDateStr: string): Date => {
  const cleanStr = icsDateStr.includes(':') ? icsDateStr.split(':')[1] : icsDateStr;
  const year = parseInt(cleanStr.substring(0, 4), 10);
  const month = parseInt(cleanStr.substring(4, 6), 10) - 1;
  const day = parseInt(cleanStr.substring(6, 8), 10);

  if (cleanStr.includes('T')) {
    const hour = parseInt(cleanStr.substring(9, 11), 10);
    const min = parseInt(cleanStr.substring(11, 13), 10);
    const sec = parseInt(cleanStr.substring(13, 15), 10);
    return new Date(Date.UTC(year, month, day, hour, min, sec));
  }
  return new Date(year, month, day);
};

export const parseICS = (icsText: string): any[] => {
  const events: any[] = [];
  const lines = icsText.split(/\r?\n/);
  let currentEvent: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.summary && currentEvent.dtstart) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.substring(0, colonIdx);
        const value = line.substring(colonIdx + 1);

        if (key.startsWith('SUMMARY')) {
          currentEvent.summary = value;
        } else if (key.startsWith('DESCRIPTION')) {
          currentEvent.description = value.replace(/\\n/g, '\n');
        } else if (key.startsWith('DTSTART')) {
          currentEvent.rawStart = value;
          currentEvent.dtstart = parseICSDate(value);
        } else if (key.startsWith('DTEND')) {
          currentEvent.rawEnd = value;
          currentEvent.dtend = parseICSDate(value);
        } else if (key.startsWith('LOCATION')) {
          currentEvent.location = value;
        }
      }
    }
  }
  return events;
};

export const normalizeTitle = (t: string): string => (t || '').trim().toLowerCase();

export const normalizeTime = (t?: string | null): string => {
  if (!t) return '00:00';
  const match = t.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '00:00';
};

export const getEventColors = (ev: any): { color: string; bg: string } => {
  const COLOR_MAP: Record<string, { color: string; bg: string }> = {
    '#a855f7': { color: '#a855f7', bg: '#f3e8ff' },
    '#f59e0b': { color: '#f59e0b', bg: '#fef3c7' },
    '#3b82f6': { color: '#3b82f6', bg: '#eff6ff' },
    '#ef4444': { color: '#ef4444', bg: '#fee2e2' },
    '#34a853': { color: '#34a853', bg: '#e6f4ea' },
  };

  if (ev?.color && COLOR_MAP[ev.color]) {
    return COLOR_MAP[ev.color];
  }

  const tLower = (ev?.title || '').toLowerCase();
  const cLower = (ev?.category || '').toLowerCase();

  if (cLower.includes('ferien') || cLower.includes('feiertag') || tLower.includes('ferien') || tLower.includes('feiertag') || tLower.includes('schulfrei') || tLower.includes('holiday') || tLower.includes('break')) {
    return { color: '#34a853', bg: '#e6f4ea' };
  }
  if (cLower.includes('vorspiel') || cLower.includes('klassenvorspiel') || tLower.includes('vorspiel') || tLower.includes('klassenvorspiel') || tLower.includes('schülervorspiel') || tLower.includes('recital')) {
    return { color: '#3b82f6', bg: '#eff6ff' };
  }
  if (cLower.includes('fest') || tLower.includes('fest') || tLower.includes('weihnachtsfeier') || tLower.includes('party') || tLower.includes('feier')) {
    return { color: '#34a853', bg: '#e6f4ea' };
  }
  if (cLower.includes('konzert') || cLower.includes('auftritt') || tLower.includes('konzert') || tLower.includes('auftritt') || tLower.includes('show') || tLower.includes('gig')) {
    return { color: '#a855f7', bg: '#f3e8ff' };
  }
  if (cLower.includes('probe') || cLower.includes('ensemble') || cLower.includes('bandprobe') || tLower.includes('probe') || tLower.includes('bandprobe') || tLower.includes('ensemble') || tLower.includes('rehearsal')) {
    return { color: '#f59e0b', bg: '#fef3c7' };
  }
  if (cLower.includes('konferenz') || cLower.includes('sitzung') || cLower.includes('meeting') || tLower.includes('konferenz') || tLower.includes('sitzung') || tLower.includes('meeting') || tLower.includes('besprechung') || tLower.includes('lehrerkonferenz') || tLower.includes('fortbildung')) {
    return { color: '#ef4444', bg: '#fee2e2' };
  }

  if (ev?.is_subscribed) {
    return { color: '#64748b', bg: '#f1f5f9' };
  }
  return { color: '#6366f1', bg: '#e0e7ff' };
};

