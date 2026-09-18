import React from 'react';
import { renderInstrumentIcon } from '../../../utils/instruments';

export const cleanRoomName = (name: string | null | undefined): string => {
  if (!name) return 'Unbenannter Raum';
  return name.replace(/^#\d+\s*[-:]*\s*/, '').trim();
};

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

export const parseDayNumber = (dayInput: any): number => {
  if (typeof dayInput === 'number') return dayInput;
  if (!dayInput) return 1;
  const map: Record<string, number> = {
    'Montag': 1, 'Dienstag': 2, 'Mittwoch': 3, 'Donnerstag': 4, 'Freitag': 5, 'Samstag': 6, 'Sonntag': 7,
    'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7,
    'Mo': 1, 'Di': 2, 'Mi': 3, 'Do': 4, 'Fr': 5, 'Sa': 6, 'So': 7,
    'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7
  };
  return map[String(dayInput).trim()] || parseInt(String(dayInput), 10) || 1;
};

export const splitAndNormalizeStudents = (studentsList: any[], allStudentsList: any[] = []): any[] => {
  if (!studentsList || studentsList.length === 0) return [];
  const result: any[] = [];
  
  studentsList.forEach((stud: any) => {
    if (!stud) return;
    const rawName = String(stud.name || stud.first_name || '').trim();
    if (rawName.includes('&') || rawName.includes(',') || /\bund\b/i.test(rawName)) {
      const parts = rawName.split(/&|,|\bund\b/i).map((p: string) => p.trim().replace(/\.+$/, '')).filter(Boolean);
      parts.forEach((partName: string, pIdx: number) => {
        const pFn = partName.split(' ')[0];
        const pLn = partName.split(' ').slice(1).join(' ');
        const found = allStudentsList.find((s: any) => 
          (s.first_name && s.first_name.toLowerCase() === pFn.toLowerCase()) ||
          (s.name && s.name.toLowerCase().startsWith(pFn.toLowerCase()))
        );
        const resolvedStudent = {
          ...stud,
          id: found?.id || `${stud.id || 'group'}-part-${pIdx}`,
          name: found ? `${found.first_name} ${found.last_name || ''}`.trim() : partName,
          first_name: found?.first_name || pFn,
          last_name: found?.last_name || pLn
        };
        
        const fnLower = (resolvedStudent.first_name || pFn).toLowerCase();
        const existingIdx = result.findIndex((r: any) => {
          if (r.id && resolvedStudent.id && r.id === resolvedStudent.id) return true;
          const rFn = (r.first_name || r.name?.split(' ')[0] || '').toLowerCase().trim();
          return rFn && fnLower && rFn === fnLower;
        });
        if (existingIdx === -1) {
          result.push(resolvedStudent);
        } else if (!result[existingIdx].last_name && resolvedStudent.last_name) {
          result[existingIdx] = { ...result[existingIdx], ...resolvedStudent };
        }
      });
    } else {
      const found = allStudentsList.find((s: any) => 
        (s.id && stud.id && s.id === stud.id) ||
        (stud.first_name && s.first_name && s.first_name.toLowerCase() === stud.first_name.toLowerCase()) ||
        (stud.name && s.name && s.name.toLowerCase() === stud.name.toLowerCase())
      );
      const fn = stud.first_name || found?.first_name || (stud.name ? stud.name.split(' ')[0] : '');
      const ln = stud.last_name || found?.last_name || (stud.name ? stud.name.split(' ').slice(1).join(' ') : '');
      const resolvedStudent = {
        ...stud,
        id: found?.id || stud.id,
        first_name: fn,
        last_name: ln,
        name: (fn || ln) ? `${fn} ${ln}`.trim() : stud.name
      };

      const fnLower = fn.toLowerCase().trim();
      const existingIdx = result.findIndex((r: any) => {
        if (r.id && resolvedStudent.id && r.id === resolvedStudent.id) return true;
        const rFn = (r.first_name || r.name?.split(' ')[0] || '').toLowerCase().trim();
        return rFn && fnLower && rFn === fnLower;
      });
      if (existingIdx === -1) {
        result.push(resolvedStudent);
      } else {
        result[existingIdx] = { ...result[existingIdx], ...resolvedStudent };
      }
    }
  });

  return result;
};

export const TEACHER_INSTRUMENT_ICONS: Record<string, any> = new Proxy({}, {
  get: (_, prop: string) => renderInstrumentIcon(prop)
});

export const INSTRUMENT_COLORS: Record<string, string> = { 
  Guitar: '#ef4444', 
  Bass: '#eab308', 
  Drums: '#3b82f6', 
  Keys: '#a855f7',
  Vocals: '#34a853'
};

export const normalizeInstrument = (name: string) => {
  const n = (name || '').toLowerCase().trim();
  if (n.includes('gitarre') || n.includes('guitar')) return 'Guitar';
  if (n.includes('bass')) return 'Bass';
  if (n.includes('drums') || n.includes('schlagzeug')) return 'Drums';
  if (n.includes('piano') || n.includes('keys') || n.includes('klavier')) return 'Keys';
  if (n.includes('vocals') || n.includes('gesang')) return 'Vocals';
  return name;
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

export const getItemWeek = (item: { topic_name: string; updated_at?: string }): string => {
  if (item.topic_name?.startsWith('Hausaufgabe KW ')) {
    const parts = item.topic_name.split('Hausaufgabe KW ');
    const kwNum = parts[1]?.trim();
    if (kwNum) {
      const year = item.updated_at ? new Date(item.updated_at).getFullYear() : new Date().getFullYear();
      return `${year}-W${kwNum.padStart(2, '0')}`;
    }
  }
  return item.updated_at ? getISOWeekRaw(item.updated_at, 1) : '';
};

export const getNormalizedRequiredInsts = (insts: Record<string, number> | null | undefined) => {
  const normalized: Record<string, number> = {};
  if (!insts) return normalized;
  Object.entries(insts).forEach(([key, val]) => {
    normalized[normalizeInstrument(key)] = val;
  });
  return normalized;
};

export const renderBandAvatar = (name: string, photoUrl?: string | null, size: string = '64px', borderRadius: string = '18px') => {
  if (photoUrl) {
    return (
      <div style={{ width: size, height: size, borderRadius, overflow: 'hidden', flexShrink: 0 }}>
        <img src={photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={name} />
      </div>
    );
  }
  
  const gradients = [
    'linear-gradient(135deg, #6366f1, #a855f7)', // Indigo to Purple
    'linear-gradient(135deg, #ec4899, #f43f5e)', // Pink to Rose
    'linear-gradient(135deg, #3b82f6, #06b6d4)', // Blue to Cyan
    'linear-gradient(135deg, #34a853, #3b82f6)', // Emerald to Blue
    'linear-gradient(135deg, #f59e0b, #e11d48)'  // Amber to Rose
  ];
  
  let hash = 0;
  const str = name || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradient = gradients[Math.abs(hash) % gradients.length];
  const firstLetter = (name || 'B').substring(0, 1).toUpperCase();
  
  return (
    <div style={{ 
      width: size, height: size, borderRadius, 
      background: gradient, 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      color: 'white', fontWeight: 950, fontSize: `calc(${size} * 0.4)`,
      textShadow: '0 2px 4px rgba(0,0,0,0.15)',
      flexShrink: 0,
      userSelect: 'none'
    }}>
      {firstLetter}
    </div>
  );
};

export const resolveStudentInstrument = (slotInst?: string | null, studentInst?: string | null, teacherInst?: string | null): string => {
  const isInvalid = (val?: string | null) => !val || val.trim() === '' || val.trim().toLowerCase() === 'musiker' || val.trim().toLowerCase() === 'allgemein';
  if (!isInvalid(slotInst)) return slotInst!.trim();
  if (!isInvalid(studentInst)) return studentInst!.trim();
  if (!isInvalid(teacherInst)) return teacherInst!.trim();
  return 'Gitarre';
};
