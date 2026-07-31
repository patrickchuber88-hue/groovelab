import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { subscribeUserToPush, unsubscribeUserFromPush } from '../utils/webPush';
import { 
  Clock, 
  Calendar, 
  Users, 
  Settings, 
  AlertTriangle, 
  Search, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  ChevronRight, 
  X, 
  BookOpen,
  Award,
  Zap,
  Box,
  Lock,
  Star,
  Palmtree,
  Eye,
  EyeOff,
  TrendingUp,
  Bell,
  Flame
} from 'lucide-react';
import { useRealNamesVisibility, maskLastName } from '../utils/nameHelper';

const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const getEndTime = (timeSlot: string, durationMin: number = 45): string => {
  if (!timeSlot) return '';
  const totalMin = timeToMinutes(timeSlot) + durationMin;
  return minutesToTime(totalMin);
};

interface CampusTeacherDashboardProps {
  userId: string;
  onLogout?: () => void;
  hideSidebar?: boolean;
  initialBoard?: 'compass' | 'classes' | 'schedule' | 'bypass' | 'setup' | 'rooms';
}

export function CampusTeacherDashboard({ userId, onLogout, hideSidebar = false, initialBoard = 'compass' }: CampusTeacherDashboardProps) {
  const { visible: showRealNames, toggleVisibility: toggleRealNames } = useRealNamesVisibility();

  // Navigation State
  const [activeBoard, setActiveBoard] = useState<'compass' | 'classes' | 'schedule' | 'bypass' | 'setup' | 'rooms'>(initialBoard);

  // Teacher Profile Data
  const [teacher, setTeacher] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  // Board 1: Tageskompass & Meisterwerk
  const [rawTodaySchedules, setRawTodaySchedules] = useState<any[]>([]);
  const [selectedStudentForDoc, setSelectedStudentForDoc] = useState<any>(null);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docHistory, setDocHistory] = useState<any[]>([]);
  const [newDocTopic, setNewDocTopic] = useState('');
  const [newDocStatus, setNewDocStatus] = useState<'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED'>('IN_PROGRESS');
  const [newDocHomework, setNewDocHomework] = useState(false);
  const [newDocNotes, setNewDocNotes] = useState('');
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);

  // Board 2: Meine Klassen
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<any>(null);
  const [cascadeLink, setCascadeLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Board 3: Mein Stundenplan
  const [rawWeekSchedules, setRawWeekSchedules] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [studentAvailabilities, setStudentAvailabilities] = useState<any[]>([]);
  const [draggedScheduleId, setDraggedScheduleId] = useState<string | null>(null);
  const [dragOverSlotKey, setDragOverSlotKey] = useState<string | null>(null);

  // Board 4: Krankheits-Bypass
  const [sickStartDate, setSickStartDate] = useState('');
  const [sickUntilDate, setSickUntilDate] = useState('');
  const [showCustomStart, setShowCustomStart] = useState(false);
  const [reportingSick, setReportingSick] = useState(false);

  // Board 5: Mein Setup
  const [startAnchor, setStartAnchor] = useState('13:00');
  const [breakTimes, setBreakTimes] = useState<Array<{ start: string; end: string; label: string }>>([]);
  const [newBreakStart, setNewBreakStart] = useState('');
  const [newBreakEnd, setNewBreakEnd] = useState('');
  const [newBreakLabel, setNewBreakLabel] = useState('');

  // Board 6: Räume Overview & Bookings
  const [rawAllSchoolSchedules, setRawAllSchoolSchedules] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [favoriteRoomId, setFavoriteRoomId] = useState<string | null>(() => localStorage.getItem(`groovelab_favorite_room_id_${userId}`));
  const [preferredRoomIds, setPreferredRoomIds] = useState<string[]>([]);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingDay, setBookingDay] = useState<number | null>(null);
  const [bookingSlot, setBookingSlot] = useState<string>('');
  const [bookingType, setBookingType] = useState<'solo' | 'lesson'>('solo');
  const [bookingStudentId, setBookingStudentId] = useState<string>('');
  const [selectedLessonInstrument, setSelectedLessonInstrument] = useState<string>('');
  // Campus Event room bookings (from campus_events with room_id)
  const [campusEventBookings, setCampusEventBookings] = useState<any[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);

  // Holidays state
  const [holidays, setHolidays] = useState<{ start: string, end: string, name: string }[]>([]);

  const parseICSDate = (icsDateStr: string): Date => {
    const cleanStr = icsDateStr.includes(':') ? icsDateStr.split(':')[1] : icsDateStr;
    const year = parseInt(cleanStr.substring(0, 4));
    const month = parseInt(cleanStr.substring(4, 6)) - 1;
    const day = parseInt(cleanStr.substring(6, 8));

    if (cleanStr.includes('T')) {
      const hour = parseInt(cleanStr.substring(9, 11));
      const min = parseInt(cleanStr.substring(11, 13));
      const sec = parseInt(cleanStr.substring(13, 15));
      return new Date(Date.UTC(year, month, day, hour, min, sec));
    }
    return new Date(year, month, day);
  };

  const parseICS = (icsText: string): any[] => {
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
            currentEvent.dtstart = parseICSDate(value);
            currentEvent.isAllDay = !value.includes('T');
          } else if (key.startsWith('DTEND')) {
            currentEvent.dtend = parseICSDate(value);
          } else if (key.startsWith('LOCATION')) {
            currentEvent.location = value;
          }
        }
      }
    }
    return events;
  };

  const loadHolidays = async (url: string) => {
    try {
      const urls = (() => {
        try {
          if (url.startsWith('[')) return JSON.parse(url) as string[];
        } catch (e) {}
        if (url.includes(',')) return url.split(',').map(u => u.trim()).filter(Boolean);
        return [url];
      })();

      let combinedEvents: any[] = [];

      for (const singleUrl of urls) {
        try {
          let text = '';
          try {
            const res = await fetch(singleUrl);
            if (!res.ok) throw new Error();
            text = await res.text();
          } catch (corsErr) {
            const proxies = [
              `https://corsproxy.io/?${singleUrl}`,
              `https://api.allorigins.win/get?url=${encodeURIComponent(singleUrl)}`
            ];

            let success = false;
            for (const proxyUrl of proxies) {
              try {
                const res = await fetch(proxyUrl);
                if (!res.ok) continue;
                if (proxyUrl.includes('allorigins')) {
                  const json = await res.json();
                  text = json.contents;
                } else {
                  text = await res.text();
                }
                if (text && text.includes('BEGIN:VCALENDAR')) {
                  success = true;
                  break;
                }
              } catch (e) {
                console.warn(e);
              }
            }
            if (!success) continue;
          }

          if (text) {
            const parsedSingle = parseICS(text);
            combinedEvents = [...combinedEvents, ...parsedSingle];
          }
        } catch (e) {
          console.warn('Error fetching calendar URL:', singleUrl, e);
        }
      }

      if (combinedEvents.length === 0) return;

      const holidayRanges = combinedEvents
        .filter(ev => {
          const summary = (ev.summary || '').toLowerCase();
          return summary.includes('ferien') || summary.includes('feiertag') || summary.includes('schulfrei');
        })
        .map(ev => {
          const toYYYYMMDD = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          };
          
          const end = ev.dtend ? new Date(ev.dtend) : new Date(ev.dtstart);
          if (ev.dtend && ev.isAllDay) {
            end.setDate(end.getDate() - 1);
          }
          
          return {
            start: toYYYYMMDD(ev.dtstart),
            end: toYYYYMMDD(end),
            name: ev.summary || 'Ferien'
          };
        });

      setHolidays(holidayRanges);
    } catch (err) {
      console.error('Error loading holidays in CampusTeacherDashboard:', err);
    }
  };

  useEffect(() => {
    if (school?.calendar_url) {
      loadHolidays(school.calendar_url);
    }
  }, [school?.calendar_url]);

  const currentWeekMonday = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay() || 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  const getSchedDateStr = (dayOfWeek: number) => {
    const d = new Date(currentWeekMonday);
    d.setDate(currentWeekMonday.getDate() + (dayOfWeek - 1));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayVal = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayVal}`;
  };

  const isTodayHoliday = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('sv-SE');
    return holidays.find(h => todayStr >= h.start && todayStr <= h.end);
  }, [holidays]);

  const todaySchedules = useMemo(() => {
    if (isTodayHoliday) return [];
    return rawTodaySchedules;
  }, [rawTodaySchedules, isTodayHoliday]);

  const weekSchedules = useMemo(() => {
    const draftMapStr = typeof window !== 'undefined' && teacher?.school_id ? localStorage.getItem(`groovelab_matrix_allocations_draft_${teacher.school_id}`) : null;
    let draftMap: Record<string, string | null> = {};
    if (draftMapStr) {
      try { draftMap = JSON.parse(draftMapStr); } catch {}
    }

    return rawWeekSchedules
      .filter((s: any) => {
        const dateStr = getSchedDateStr(s.day_of_week);
        const isHoliday = holidays.some(h => dateStr >= h.start && dateStr <= h.end);
        return !isHoliday;
      })
      .map((s: any) => {
        const assignedRoomId = s.room_id || draftMap[`${userId}_${s.day_of_week}`] || draftMap[s.id];
        if (assignedRoomId) {
          const roomObj = rooms.find((r: any) => r.id === assignedRoomId);
          return {
            ...s,
            room_id: assignedRoomId,
            rooms: s.rooms || roomObj || { name: 'Zugewiesen' }
          };
        }
        return s;
      });
  }, [rawWeekSchedules, holidays, currentWeekMonday, teacher?.school_id, userId, rooms]);

  // Derived: teacher schedule is unlocked as long as schedule blocks or room assignments exist
  const hasApprovedSchedules = useMemo(() => {
    return true;
  }, []);

  const allSchoolSchedules = useMemo(() => {
    return rawAllSchoolSchedules.filter((s: any) => {
      const dateStr = getSchedDateStr(s.day_of_week);
      const isHoliday = holidays.some(h => dateStr >= h.start && dateStr <= h.end);
      if (isHoliday) {
        // In the holidays, only show dynamic reschedules (Nachholtermine)
        return !!s.is_dynamic_reschedule;
      }
      return true;
    });
  }, [rawAllSchoolSchedules, holidays, currentWeekMonday]);

  // Clock Ticker for Live Slot Highlight
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async (teacherId: string) => {
    try {
      const { data } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });
      if (data) {
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching teacher alerts:', err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`realtime_teacher_alerts_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_alerts',
          filter: `teacher_id=eq.${userId}`
        },
        () => {
          fetchNotifications(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !teacher) return;

    const channelSchedules = supabase
      .channel(`realtime_teacher_schedules_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules'
        },
        (payload) => {
          const newRec = payload.new as any;
          const oldRec = payload.old as any;
          if (
            (newRec && newRec.teacher_id === userId) ||
            (oldRec && oldRec.teacher_id === userId)
          ) {
            refreshAllData(teacher.school_id, userId);
          }
        }
      )
      .subscribe();

    const channelOccurrences = supabase
      .channel(`realtime_teacher_occurrences_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_occurrences'
        },
        (payload) => {
          const newRec = payload.new as any;
          const oldRec = payload.old as any;
          if (
            (newRec && newRec.teacher_id === userId) ||
            (oldRec && oldRec.teacher_id === userId)
          ) {
            refreshAllData(teacher.school_id, userId);
          }
        }
      )
    const channelStudents = supabase
      .channel(`realtime_teacher_students_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        (payload) => {
          const newRec = payload.new as any;
          const oldRec = payload.old as any;
          if (
            (newRec && (newRec.teacher_id === userId || oldRec?.teacher_id === userId)) ||
            (oldRec && oldRec.teacher_id === userId)
          ) {
            refreshAllData(teacher.school_id, userId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSchedules);
      supabase.removeChannel(channelOccurrences);
      supabase.removeChannel(channelStudents);
    };
  }, [userId, teacher]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(now.toTimeString().substring(0, 5));
    }, 10000);
    const now = new Date();
    setCurrentTimeStr(now.toTimeString().substring(0, 5));
    return () => clearInterval(timer);
  }, []);

  // Fetch Teacher, School, and Basic Data
  useEffect(() => {
    async function loadData() {
      if (!userId) return;
      try {
        setLoading(true);
        // Load Teacher Profile
        const { data: tData, error: tErr } = await supabase
          .from('users')
          .select('*, schools(*)')
          .eq('id', userId)
          .single();

        if (tErr) throw tErr;
        setTeacher(tData);
        setPushEnabled(tData.push_notifications_enabled ?? false);
        setSchool(tData.schools);
        setStartAnchor(tData.start_anchor || '13:00');
        setBreakTimes(tData.break_times || []);
        setPreferredRoomIds(tData.preferred_room_ids || []);
        if (tData.sick_until) {
          setSickUntilDate(tData.sick_until.substring(0, 10));
        } else {
          setSickUntilDate('');
        }
        if (tData.sick_start) {
          setSickStartDate(tData.sick_start.substring(0, 10));
        } else {
          const todayD = new Date();
          const localTodayStr = `${todayD.getFullYear()}-${String(todayD.getMonth() + 1).padStart(2, '0')}-${String(todayD.getDate()).padStart(2, '0')}`;
          setSickStartDate(localTodayStr);
        }

        // Load Setup and dependent lists
        await refreshAllData(tData.school_id, tData.id);
      } catch (err) {
        console.error('Error loading initial teacher data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userId]);

  const refreshAllData = async (schoolId: string, teacherId: string) => {
    // 1. Fetch Students
    const { data: sData } = await supabase
      .from('users')
      .select('*, premium_status(is_premium_active)')
      .eq('school_id', schoolId)
      .eq('role', 'student')
      .eq('teacher_id', teacherId);
    setStudents(sData || []);

    // 2. Fetch Rooms
    const { data: rData } = await supabase
      .from('rooms')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_campus_active', true)
      .order('sort_order', { ascending: true });
    setRooms(rData || []);
    // By default, no room should be visible (selectedRoom starts as null)
    const favoriteRoomId = localStorage.getItem(`groovelab_favorite_room_id_${userId}`);
    if (favoriteRoomId && rData) {
      const favRoom = rData.find((r: any) => r.id === favoriteRoomId);
      if (favRoom) {
        setSelectedRoom(favRoom);
      }
    }

    // 3. Fetch Availabilities
    const { data: aData } = await supabase
      .from('user_availability')
      .select('*');
    setStudentAvailabilities(aData || []);

    // 4. Fetch Schedules
    const { data: schedData } = await supabase
      .from('schedules')
      .select('*, student:users!schedules_student_id_fkey(*), rooms(*), schedule_exceptions(exception_date, status)')
      .eq('teacher_id', teacherId);

    const today = new Date();
    const currentDay = today.getDay() || 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1);

    const mappedSchedData = (schedData || []).map(s => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + s.day_of_week - 1);
      const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
      const exception = (s.schedule_exceptions || []).find((ex: any) => ex.exception_date === targetDateStr);
      return {
        ...s,
        status: exception ? exception.status : s.status
      };
    });

    setRawWeekSchedules(mappedSchedData);

    // Filter today's slots
    const todayWeekday = currentDay;
    const todaySlots = mappedSchedData.filter(s => s.day_of_week === todayWeekday);
    setRawTodaySchedules(todaySlots);

    // 5. Fetch all school schedules for Room Board
    const { data: allSchedData } = await supabase
      .from('schedules')
      .select('*, student:users!schedules_student_id_fkey(*), teacher:users!schedules_teacher_id_fkey(*), rooms(*), schedule_exceptions(exception_date, status)')
      .eq('school_id', schoolId);

    const mappedAllSchedData = (allSchedData || []).map(s => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + s.day_of_week - 1);
      const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
      const exception = (s.schedule_exceptions || []).find((ex: any) => ex.exception_date === targetDateStr);
      return {
        ...s,
        status: exception && exception.status !== 'pending_reschedule' ? exception.status : s.status
      };
    });

    // Check which teachers have approved (freigegeben) schedules
    const approvedTeachers = new Set<string>();
    const teacherGroups = new Map<string, any[]>();
    (allSchedData || []).forEach(s => {
      if (s.teacher_id) {
        if (!teacherGroups.has(s.teacher_id)) {
          teacherGroups.set(s.teacher_id, []);
        }
        teacherGroups.get(s.teacher_id)!.push(s);
      }
    });

    teacherGroups.forEach((schedules, tId) => {
      const nonBreakSchedules = schedules.filter(s => s.student_id !== null);
      if (nonBreakSchedules.length > 0 && nonBreakSchedules.every(s => s.status === 'approved')) {
        approvedTeachers.add(tId);
      }
    });

    // Fetch dynamic schedule occurrences for current week
    const startDateStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const endDateStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    const { data: allOccurs } = await supabase
      .from('schedule_occurrences')
      .select('*, student:users!schedule_occurrences_student_id_fkey(*), teacher:users!schedule_occurrences_teacher_id_fkey(*), schedules!schedule_occurrences_schedule_id_fkey(*)')
      .or(`and(date.gte.${startDateStr},date.lte.${endDateStr}),and(original_date.gte.${startDateStr},date.lte.${endDateStr})`);

    const staticBookings = mappedAllSchedData;

    // Group dynamic bookings by teacher, room, and day of week to filter and merge
    const dynamicGroups: { [key: string]: any[] } = {};
    (allOccurs || []).forEach(occ => {
      if (occ.teacher_id && approvedTeachers.has(occ.teacher_id)) {
        if (occ.status === 'cancelled' || occ.status === 'teacher_sick' || occ.status === 'canceled_by_teacher_sick') {
          return;
        }

        const templateTime = occ.schedules?.time_slot || '';
        const templateDay = occ.schedules?.day_of_week || 0;

        const occDate = new Date(occ.date);
        const rawDay = occDate.getDay();
        const dayOfWeek = rawDay === 0 ? 7 : rawDay;

        const hasTimeMoved = templateTime && occ.start_time.substring(0, 5) !== templateTime.substring(0, 5);
        const hasDayMoved = templateDay && dayOfWeek !== templateDay;
        
        const hasFallbackDateMoved = occ.original_date && occ.date !== occ.original_date;
        const hasFallbackTimeMoved = occ.original_start_time && occ.start_time.substring(0, 5) !== occ.original_start_time.substring(0, 5);

        const hasMoved = occ.schedules 
          ? (hasTimeMoved || hasDayMoved)
          : (hasFallbackDateMoved || hasFallbackTimeMoved);

        if (hasMoved) {
          const roomId = occ.schedules?.room_id || null;
          if (!roomId) return;

          const key = `${occ.teacher_id}-${roomId}-${dayOfWeek}`;
          if (!dynamicGroups[key]) {
            dynamicGroups[key] = [];
          }
          dynamicGroups[key].push({
            ...occ,
            dayOfWeek,
            roomId
          });
        }
      }
    });

    const dynamicBookings: any[] = [];

    for (const key in dynamicGroups) {
      const occs = dynamicGroups[key];
      const firstOcc = occs[0];
      const teacherId = firstOcc.teacher_id;
      const roomId = firstOcc.roomId;
      const dayOfWeek = firstOcc.dayOfWeek;

      // Find regular block for this teacher, room, and day
      const teacherStatic = staticBookings.filter(
        s => s.teacher_id === teacherId && s.room_id === roomId && s.day_of_week === dayOfWeek
      );

      let regMin = Infinity;
      let regMax = -Infinity;
      teacherStatic.forEach(s => {
        const start = timeToMinutes(s.time_slot);
        const duration = s.duration || 45;
        const end = start + duration;
        if (start < regMin) regMin = start;
        if (end > regMax) regMax = end;
      });

      const hasRegularBlock = regMin !== Infinity;

      // Collect outside intervals
      const outsideIntervals: { start: number; end: number; occs: any[] }[] = [];

      occs.forEach(occ => {
        const occStart = timeToMinutes(occ.start_time);
        const occDuration = occ.duration || 45;
        const occEnd = occStart + occDuration;

        if (!hasRegularBlock) {
          outsideIntervals.push({ start: occStart, end: occEnd, occs: [occ] });
        } else {
          // If entirely inside regular hours, skip
          if (occStart >= regMin && occEnd <= regMax) {
            return;
          }
          // Collect portions outside regular hours
          if (occStart < regMin) {
            outsideIntervals.push({
              start: occStart,
              end: Math.min(occEnd, regMin),
              occs: [occ]
            });
          }
          if (occEnd > regMax) {
            outsideIntervals.push({
              start: Math.max(occStart, regMax),
              end: occEnd,
              occs: [occ]
            });
          }
        }
      });

      // Merge outside intervals
      if (outsideIntervals.length > 0) {
        outsideIntervals.sort((a, b) => a.start - b.start);

        const merged: { start: number; end: number; occs: any[] }[] = [];
        let current = { ...outsideIntervals[0] };

        for (let i = 1; i < outsideIntervals.length; i++) {
          const next = outsideIntervals[i];
          if (next.start <= current.end) {
            current.end = Math.max(current.end, next.end);
            current.occs = [...current.occs, ...next.occs];
          } else {
            merged.push(current);
            current = { ...next };
          }
        }
        merged.push(current);

        merged.forEach(interval => {
          const startStr = minutesToTime(interval.start);
          const duration = interval.end - interval.start;

          // Collect unique students
          const uniqueStudentsMap: { [id: string]: any } = {};
          interval.occs.forEach(o => {
            if (o.student) {
              uniqueStudentsMap[o.student.id] = o.student;
            }
          });
          const uniqueStudents = Object.values(uniqueStudentsMap);

          let combinedStudent = null;
          if (uniqueStudents.length > 0) {
            combinedStudent = {
              id: uniqueStudents.map(s => s.id).join(','),
              first_name: uniqueStudents.map(s => s.first_name).join(', '),
              last_name: ''
            };
          }

          dynamicBookings.push({
            id: interval.occs.map(o => o.id).join(','),
            room_id: roomId,
            day_of_week: dayOfWeek,
            time_slot: startStr,
            duration: duration,
            student_id: combinedStudent ? combinedStudent.id : null,
            student: combinedStudent,
            teacher_id: teacherId,
            teacher: firstOcc.teacher,
            status: 'rescheduled_confirmed',
            is_dynamic_reschedule: true
          });
        });
      }
    }

    setRawAllSchoolSchedules([...staticBookings, ...dynamicBookings]);

    // Fetch campus_events with intern room bookings made by this teacher
    try {
      const { data: ceBookings } = await supabase
        .from('campus_events')
        .select('id, title, event_date, start_time, end_time, category, room_id, room:room_id(id, name)')
        .eq('school_id', schoolId)
        .eq('created_by', teacherId)
        .not('room_id', 'is', null)
        .order('event_date', { ascending: true });
      setCampusEventBookings(ceBookings || []);
    } catch (_) {
      // location columns may not exist yet — safe to ignore
      setCampusEventBookings([]);
    }

    await fetchNotifications(teacherId);
  };

  // Onboarding Link Generation
  const handleGenerateOnboardingLink = async () => {
    if (!teacher) return;
    try {
      const resp = await fetch('/api/teacher/generate-student-kaskade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(supabase as any).auth?.session?.()?.access_token || ''}`
        }
      });
      if (resp.ok) {
        const data = await resp.json();
        setCascadeLink(data.registrationLink || `${window.location.origin}/student-signup?cascade=${data.token}`);
      } else {
        // Fallback Client-side generation using local parameters
        const cascadeToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 12);

        await supabase.from('student_cascades').insert({
          teacher_id: teacher.id,
          school_id: teacher.school_id,
          token: cascadeToken,
          expires_at: expiresAt.toISOString()
        });

        setCascadeLink(`${window.location.origin}/student-signup?cascade=${cascadeToken}`);
      }
    } catch (err) {
      console.error(err);
      // Hardcoded fallback using teacher's unique ausweis_id if DB inserts are constrained
      setCascadeLink(`${window.location.origin}/student-signup?teacher_ausweis=${teacher.ausweis_id || teacher.id}`);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cascadeLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Board 1: Live Timeline Slots Info
  const sortedTodaySchedules = useMemo(() => {
    return [...todaySchedules].sort((a, b) => (a.time_slot || '').localeCompare(b.time_slot || ''));
  }, [todaySchedules]);

  // Check if slot is currently active based on current system clock
  const isSlotActive = (timeSlot: string) => {
    if (!timeSlot || !currentTimeStr) return false;
    const [slotH, slotM] = timeSlot.split(':').map(Number);
    const [currH, currM] = currentTimeStr.split(':').map(Number);
    const slotMins = slotH * 60 + slotM;
    const currMins = currH * 60 + currM;
    // Assume 45-minute lesson window
    return currMins >= slotMins && currMins < slotMins + 45;
  };

  // Open Meisterwerk Documentation Modal
  const handleOpenDocModal = async (sched: any) => {
    if (!sched.student) return;
    setSelectedStudentForDoc(sched.student);
    setCurrentSlotId(sched.id);
    setNewDocTopic('');
    setNewDocStatus('IN_PROGRESS');
    setNewDocHomework(false);
    setNewDocNotes('');

    // Load existing history
    const { data: hist } = await supabase
      .from('progress_matrix')
      .select('*')
      .eq('student_id', sched.student.id)
      .order('updated_at', { ascending: false });
    setDocHistory(hist || []);
    setDocModalOpen(true);
  };

  const notifyHomeworkChange = async (studentId: string) => {
    // 1. Dispatch custom DOM event for same-window / local sync
    window.dispatchEvent(new CustomEvent('homework-updated', { detail: { studentId } }));

    // 2. Broadcast on Supabase channel for cross-browser / cross-device real-time websocket sync
    try {
      const channel = supabase.channel(`realtime_student_progress_${studentId}`);
      await channel.send({
        type: 'broadcast',
        event: 'homework-changed',
        payload: { studentId }
      });
    } catch (e) {
      console.warn('Realtime broadcast error:', e);
    }
  };

  // Save Meisterwerk progress bypass logic (teacher always has full write permissions)
  const handleSaveMeisterwerk = async () => {
    if (!selectedStudentForDoc || !newDocTopic) return;
    try {
      const payload = {
        studentId: selectedStudentForDoc.id,
        topicName: newDocTopic,
        status: newDocStatus,
        isCurrentHomework: newDocHomework,
        teacherNotes: newDocNotes
      };

      // Call API
      const resp = await fetch('/api/teacher/save-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(supabase as any).auth?.session?.()?.access_token || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (resp.ok) {
        const result = await resp.json();
        // Refresh local history list
        setDocHistory(prev => [result.progress, ...prev.filter(p => p.topic_name !== newDocTopic)]);
        notifyHomeworkChange(selectedStudentForDoc.id);
      } else {
        // Direct write fallback (Rollen-Asymmetrie: teacher bypasses RLS/restrictions)
        const { data: existing } = await supabase
          .from('progress_matrix')
          .select('id')
          .eq('student_id', selectedStudentForDoc.id)
          .eq('topic_name', newDocTopic)
          .maybeSingle();

        let error = null;
        if (existing) {
          const { error: err } = await supabase
            .from('progress_matrix')
            .update({
              status: newDocStatus,
              is_current_homework: newDocHomework,
              teacher_notes: newDocNotes,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
          error = err;
        } else {
          const { error: err } = await supabase
            .from('progress_matrix')
            .insert({
              student_id: selectedStudentForDoc.id,
              teacher_id: userId,
              topic_name: newDocTopic,
              status: newDocStatus,
              is_current_homework: newDocHomework,
              teacher_notes: newDocNotes
            });
          error = err;
        }
        if (error) throw error;

        // Reload history
        const { data: hist } = await supabase
          .from('progress_matrix')
          .select('*')
          .eq('student_id', selectedStudentForDoc.id)
          .order('updated_at', { ascending: false });
        setDocHistory(hist || []);
        notifyHomeworkChange(selectedStudentForDoc.id);
      }
      setNewDocTopic('');
      setNewDocNotes('');
      setNewDocHomework(false);
      alert('Dokumentation unzensiert gespeichert! ✅');
    } catch (err) {
      console.error(err);
      alert('Speichern fehlgeschlagen.');
    }
  };

  // Board 2: View Student History Card
  const handleViewStudentHistory = async (student: any) => {
    const { data: hist } = await supabase
      .from('progress_matrix')
      .select('*')
      .eq('student_id', student.id)
      .order('updated_at', { ascending: false });
    setSelectedStudentHistory({
      student,
      history: hist || []
    });
  };

  // Board 3: Tausch-Engine & Traffic Light Logic
  const getTrafficLight = (draggedId: string, timeSlot: string, dayOfWeek: number, roomId: string): 'GREEN' | 'YELLOW' | 'RED' => {
    // 1. Find schedule structure
    const sched = weekSchedules.find(s => s.id === draggedId);
    if (!sched || !sched.student) return 'RED';

    // 2. Room checks (instrument matrix)
    const room = rooms.find(r => r.id === roomId);
    if (room && room.allowed_instruments && room.allowed_instruments.length > 0) {
      const allowed = room.allowed_instruments.map((i: string) => i.toLowerCase());
      const studentInst = (sched.student.instrument || '').toLowerCase();
      if (!allowed.includes(studentInst)) {
        return 'RED';
      }
    }

    // 3. Physical Collisions & Swap Check
    const targetConflictSlot = weekSchedules.find(s => 
      s.id !== draggedId &&
      s.day_of_week === dayOfWeek &&
      s.time_slot === timeSlot &&
      s.room_id === roomId &&
      s.status !== 'canceled_by_student' &&
      s.status !== 'teacher_sick'
    );

    if (targetConflictSlot) {
      // It's a 1:1 swap! Verify original room matrix for target student
      const targetStudentInst = (targetConflictSlot.student?.instrument || '').toLowerCase();
      const originalRoomId = sched.room_id;
      const originalRoom = rooms.find(r => r.id === originalRoomId);
      if (originalRoom && originalRoom.allowed_instruments && originalRoom.allowed_instruments.length > 0) {
        const allowedOriginal = originalRoom.allowed_instruments.map((i: string) => i.toLowerCase());
        if (!allowedOriginal.includes(targetStudentInst)) {
          return 'RED'; // Swapped student not allowed in original room
        }
      }

      // Check availability for both students in their new swapped slots
      const userAvails1 = studentAvailabilities.filter(a => a.user_id === sched.student_id);
      const targetAvail1 = userAvails1.find(a => a.day_of_week === dayOfWeek && a.time_slot === timeSlot);

      const userAvails2 = studentAvailabilities.filter(a => a.user_id === targetConflictSlot.student_id);
      const targetAvail2 = userAvails2.find(a => a.day_of_week === sched.day_of_week && a.time_slot === sched.time_slot);

      return (targetAvail1 && targetAvail2) ? 'GREEN' : 'YELLOW';
    }

    // Check teacher pause/break time
    const isTeacherInBreak = breakTimes.some(b => {
      // Basic overlap check
      return timeSlot >= b.start && timeSlot < b.end;
    });
    if (isTeacherInBreak) return 'RED';

    // 4. Availabilities Check (Ampelprinzip)
    const userAvails = studentAvailabilities.filter(a => a.user_id === sched.student_id);
    const targetAvail = userAvails.find(a => a.day_of_week === dayOfWeek && a.time_slot === timeSlot);

    if (targetAvail) {
      if (targetAvail.prio === 'PRIO_HIGH') {
        return 'GREEN';
      }
      return 'GREEN';
    }

    // Default outside of availabilities is GREEN
    return 'GREEN';
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedScheduleId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOverSlot = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    setDragOverSlotKey(key);
  };

  const handleDropSlot = async (timeSlot: string, dayOfWeek: number, roomId: string) => {
    const scheduleId = draggedScheduleId;
    setDraggedScheduleId(null);
    setDragOverSlotKey(null);

    if (!scheduleId) return;

    const color = getTrafficLight(scheduleId, timeSlot, dayOfWeek, roomId);

    if (color === 'RED') {
      alert('Tausch blockiert (ROT): Physische Kollision oder Raum-Instrumenten-Matrix verletzt.');
      return;
    }

    const confirmMsg = color === 'YELLOW'
      ? 'GELB: Slot außerhalb der Standard-Verfügbarkeiten des Schülers. Tausch anfordern und Eltern-Push senden?'
      : 'GRÜN: Wunschzeit matcht perfekt. Sofort speichern?';

    if (!confirm(confirmMsg)) return;

    try {
      const resp = await fetch('/api/schedule/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId,
          targetTimeSlot: timeSlot,
          targetDayOfWeek: dayOfWeek,
          targetRoomId: roomId
        })
      });

      if (resp.ok) {
        await refreshAllData(teacher.school_id, teacher.id);
        return;
      }

      // Fallback update
      const status = color === 'GREEN' ? 'approved' : 'pending_parent_approval';
      const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : 'dein Lehrer';
      const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

      // Direct push triggering helper for fallback
      const triggerFallbackPush = async (studentId: string, title: string, body: string, metadata: any) => {
        try {
          const { data: studentProfile } = await supabase
            .from('users')
            .select('is_campus_active, first_name')
            .eq('id', studentId)
            .single();

          if (studentProfile && studentProfile.is_campus_active) {
            // Log in notifications table
            const { data: notification, error: notifErr } = await supabase
              .from('notifications')
              .insert({
                user_id: studentId,
                title,
                message: body,
                metadata
              })
              .select('id')
              .single();

            if (!notifErr && notification) {
              await supabase.functions.invoke('send-push', {
                body: {
                  userId: studentId,
                  title,
                  body,
                  url: '/',
                  notificationId: notification.id
                }
              });
            }
          }
        } catch (pushErr) {
          console.error('Failed to trigger fallback push notification:', pushErr);
        }
      };

      const targetConflict = weekSchedules.find(s => 
        s.id !== scheduleId &&
        s.day_of_week === dayOfWeek &&
        s.time_slot === timeSlot &&
        s.room_id === roomId &&
        s.status !== 'canceled_by_student' &&
        s.status !== 'teacher_sick'
      );

      if (targetConflict) {
        // Swap both schedules in Supabase
        const sourceSlot = weekSchedules.find(s => s.id === scheduleId);
        if (sourceSlot) {
          const { error: err1 } = await supabase
            .from('schedules')
            .update({
              time_slot: timeSlot,
              day_of_week: dayOfWeek,
              room_id: roomId,
              status: status
            })
            .eq('id', scheduleId);

          const { error: err2 } = await supabase
            .from('schedules')
            .update({
              time_slot: sourceSlot.time_slot,
              day_of_week: sourceSlot.day_of_week,
              room_id: sourceSlot.room_id,
              status: status
            })
            .eq('id', targetConflict.id);

          if (err1 || err2) throw (err1 || err2);

          const targetDayName = dayNames[dayOfWeek - 1] || 'einen anderen Tag';
          const sourceDayName = dayNames[sourceSlot.day_of_week - 1] || 'einen anderen Tag';

          // Send push notifications
          const student1Id = sourceSlot.student_id || sourceSlot.student?.id;
          const student2Id = targetConflict.student_id || targetConflict.student?.id;
          const student1Name = sourceSlot.student?.first_name || 'Schüler';
          const student2Name = targetConflict.student?.first_name || 'Schüler';

          if (status === 'approved') {
            if (student1Id) {
              triggerFallbackPush(
                student1Id,
                'Unterricht verschoben 📅',
                `Hallo ${student1Name}, dein Unterricht bei ${teacherName} wurde verschoben auf ${targetDayName} um ${timeSlot} Uhr.`,
                { schedule_id: scheduleId, type: 'rescheduled' }
              );
            }
            if (student2Id) {
              triggerFallbackPush(
                student2Id,
                'Unterricht verschoben 📅',
                `Hallo ${student2Name}, dein Unterricht bei ${teacherName} wurde verschoben auf ${sourceDayName} um ${sourceSlot.time_slot} Uhr.`,
                { schedule_id: targetConflict.id, type: 'rescheduled' }
              );
            }
          } else {
            if (student1Id) {
              triggerFallbackPush(
                student1Id,
                'Terminänderung freigeben? 📅',
                `Hallo ${student1Name}, dein Lehrer ${teacherName} möchte deinen Unterricht auf ${targetDayName} um ${timeSlot} Uhr verschieben. Bitte stimme dem Termin in der App zu.`,
                { schedule_id: scheduleId, type: 'pending_parent_approval' }
              );
            }
            if (student2Id) {
              triggerFallbackPush(
                student2Id,
                'Terminänderung freigeben? 📅',
                `Hallo ${student2Name}, dein Lehrer ${teacherName} möchte deinen Unterricht auf ${sourceDayName} um ${sourceSlot.time_slot} Uhr verschieben. Bitte stimme dem Termin in der App zu.`,
                { schedule_id: targetConflict.id, type: 'pending_parent_approval' }
              );
            }
          }
        }
      } else {
        // Direct update for single move
        const { error } = await supabase
          .from('schedules')
          .update({
            time_slot: timeSlot,
            day_of_week: dayOfWeek,
            room_id: roomId,
            status: status
          })
          .eq('id', scheduleId);

        if (error) throw error;

        // Send push notification
        const sourceSlot = weekSchedules.find(s => s.id === scheduleId);
        const studentId = sourceSlot?.student_id || sourceSlot?.student?.id;
        const studentName = sourceSlot?.student?.first_name || 'Schüler';
        const targetDayName = dayNames[dayOfWeek - 1] || 'einen anderen Tag';

        if (studentId) {
          if (status === 'approved') {
            triggerFallbackPush(
              studentId,
              'Unterricht verschoben 📅',
              `Hallo ${studentName}, dein Unterricht bei ${teacherName} wurde verschoben auf ${targetDayName} um ${timeSlot} Uhr.`,
              { schedule_id: scheduleId, type: 'rescheduled' }
            );
          } else {
            triggerFallbackPush(
              studentId,
              'Terminänderung freigeben? 📅',
              `Hallo ${studentName}, dein Lehrer ${teacherName} möchte deinen Unterricht auf ${targetDayName} um ${timeSlot} Uhr verschieben. Bitte stimme dem Termin in der App zu.`,
              { schedule_id: scheduleId, type: 'pending_parent_approval' }
            );
          }
        }
      }

      await refreshAllData(teacher.school_id, teacher.id);
      alert('Stundenplan erfolgreich angepasst! ✅');
    } catch (err) {
      console.error(err);
      alert('Tausch-Fehler.');
    }
  };

  const handleTeacherResolveReschedule = async (scheduleId: string, accept: boolean) => {
    if (!confirm(accept ? 'Möchtest du der Verschiebung zustimmen? Der Slot wird freigegeben.' : 'Möchtest du die Verschiebe-Anfrage ablehnen?')) return;
    try {
      const newStatus = accept ? 'canceled_by_student' : 'approved';
      const { error } = await supabase
        .from('schedules')
        .update({ status: newStatus })
        .eq('id', scheduleId);
      
      if (error) throw error;
      await refreshAllData(teacher.school_id, teacher.id);
      alert(accept ? 'Verschiebung zugestimmt. Slot ist nun freigegeben.' : 'Verschiebe-Anfrage abgelehnt.');
    } catch (err) {
      console.error(err);
      alert('Fehler beim Aktualisieren der Verschiebe-Anfrage.');
    }
  };

  // Board 4: Illness Bypass
  const handleReportSick = async () => {
    if (!sickUntilDate) {
      alert('Bitte wähle ein bis-Datum aus.');
      return;
    }
    if (!sickStartDate) {
      alert('Bitte wähle ein von-Datum aus.');
      return;
    }

    const confirmMsg = `Möchtest du dich wirklich vom ${new Date(sickStartDate).toLocaleDateString('de-DE')} bis zum ${new Date(sickUntilDate).toLocaleDateString('de-DE')} krankmelden?`;

    if (!confirm(confirmMsg)) return;

    try {
      setReportingSick(true);

      // Try calling API first
      const resp = await fetch('/api/teacher/report-sick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: userId, sickUntilDate, sickStartDate })
      });

      if (resp.ok) {
        alert('Krankheitsmeldung erfolgreich aktualisiert.');
      } else {
        // Direct Client-Side Supabase fallback
        const { data: profile, error: profileErr } = await supabase
          .from('users')
          .select('school_id, first_name, last_name, sick_start, sick_until')
          .eq('id', userId)
          .single();

        if (profileErr || !profile) {
          throw new Error('Teacher profile not found.');
        }

        const prevSickUntilStr = profile.sick_until;
        const todayD = new Date();
        const localTodayStr = `${todayD.getFullYear()}-${String(todayD.getMonth() + 1).padStart(2, '0')}-${String(todayD.getDate()).padStart(2, '0')}`;
        const sickStartVal = sickStartDate || profile.sick_start || localTodayStr;

        // 1. Update user table
        const { error: userErr } = await supabase
          .from('users')
          .update({ 
            sick_until: sickUntilDate,
            sick_start: sickStartVal
          })
          .eq('id', userId);

        if (userErr) throw userErr;

        // 2. Fetch weekly schedules
        const { data: schedules, error: schedError } = await supabase
          .from('schedules')
          .select('*')
          .eq('teacher_id', userId);

        if (schedError) throw schedError;

        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const sickUntil = new Date(sickUntilDate);
        const maxDate = new Date(now);
        maxDate.setDate(maxDate.getDate() + 30); // 30 days window

        const currentDate = new Date(todayStart);
        const notificationsToInsert: any[] = [];
        const scheduleIdsToCancel = new Set<string>();
        const scheduleIdsToRestore = new Set<string>();
        const datesToDeleteNotifs: string[] = [];

        // Fetch existing crisis notifications
        const { data: existingNotifs } = await supabase
          .from('crisis_notifications')
          .select('slot_start_datetime, student_id')
          .eq('teacher_id', userId);

        const existingNotifsSet = new Set(
          (existingNotifs || []).map(n => `${new Date(n.slot_start_datetime).toISOString()}-${n.student_id}`)
        );

        while (currentDate <= maxDate) {
          const rawDay = currentDate.getDay();
          const currentDayOfWeek = rawDay === 0 ? 7 : rawDay;
          const daySchedules = (schedules || []).filter(s => s.day_of_week === currentDayOfWeek);

          daySchedules.forEach(sched => {
            const [hours, minutes] = (sched.time_slot || '00:00').split(':').map(Number);
            const startDateTime = new Date(currentDate);
            startDateTime.setHours(hours, minutes, 0, 0);

            if (startDateTime >= now) {
              const isCurrentlySick = startDateTime <= new Date(sickUntil.getTime() + 24 * 60 * 60 * 1000 - 1);
              
              if (isCurrentlySick) {
                scheduleIdsToCancel.add(sched.id);
                const notifKey = `${startDateTime.toISOString()}-${sched.student_id}`;
                if (!existingNotifsSet.has(notifKey)) {
                  notificationsToInsert.push({
                    teacher_id: userId,
                    student_id: sched.student_id,
                    slot_start_datetime: startDateTime.toISOString(),
                    status: 'UNREAD'
                  });
                }
              } else {
                scheduleIdsToRestore.add(sched.id);
                datesToDeleteNotifs.push(startDateTime.toISOString());
              }
            }
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Apply schedule cancellations
        if (scheduleIdsToCancel.size > 0) {
          await supabase
            .from('schedules')
            .update({ status: 'canceled_by_teacher_sick' })
            .in('id', Array.from(scheduleIdsToCancel));
        }

        // Restore active schedules
        if (scheduleIdsToRestore.size > 0) {
          await supabase
            .from('schedules')
            .update({ status: 'approved' })
            .in('id', Array.from(scheduleIdsToRestore))
            .eq('status', 'canceled_by_teacher_sick');
        }

        // Insert new crisis notifications
        if (notificationsToInsert.length > 0) {
          await supabase
            .from('crisis_notifications')
            .insert(notificationsToInsert);
        }

        // Delete future crisis notifications
        if (datesToDeleteNotifs.length > 0) {
          await supabase
            .from('crisis_notifications')
            .delete()
            .eq('teacher_id', userId)
            .in('slot_start_datetime', datesToDeleteNotifs);
        }

        // Add Secretary alarm ticket
        const alertMessage = prevSickUntilStr
          ? `🚨 KRANKHEITS-ANPASSUNG: Lehrkraft ${profile.first_name} ${profile.last_name} hat den Krankmeldungszeitraum auf den ${new Date(sickUntilDate).toLocaleDateString('de-DE')} geändert.`
          : `🚨 NEUE KRANKMELDUNG: Lehrkraft ${profile.first_name} ${profile.last_name} hat sich bis zum ${new Date(sickUntilDate).toLocaleDateString('de-DE')} krankgemeldet.`;

        await supabase
          .from('system_alerts')
          .insert({
            school_id: profile.school_id,
            teacher_id: userId,
            type: 'Teacher Illness Alert',
            message: alertMessage,
            resolved: false
          });

        alert('Krankheitsmeldung registriert! Stundenplandaten wurden angepasst und Krisenmodus-Meldung wurde gesendet.');
      }

      // Reload teacher profile and refresh data
      const { data: updatedTeacher } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('id', userId)
        .single();
      setTeacher(updatedTeacher);
      setPushEnabled(updatedTeacher.push_notifications_enabled ?? false);
      await refreshAllData(updatedTeacher.school_id, updatedTeacher.id);
    } catch (err) {
      console.error(err);
      alert('Fehler bei der Krankheitsmeldung.');
    } finally {
      setReportingSick(false);
    }
  };

  const handleEndSick = async () => {
    if (!confirm('Möchtest du dich wirklich wieder gesundmelden? Alle zukünftigen Krankheitsausfälle werden wieder aktiviert.')) return;

    try {
      setReportingSick(true);

      // Try calling API first with empty date to end sickness
      const resp = await fetch('/api/teacher/report-sick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: userId, sickUntilDate: null })
      });

      if (resp.ok) {
        alert('Gesundmeldung erfolgreich registriert.');
      } else {
        // Direct Client-Side Supabase fallback
        const { data: profile, error: profileErr } = await supabase
          .from('users')
          .select('school_id, first_name, last_name, sick_start, sick_until')
          .eq('id', userId)
          .single();

        if (profileErr || !profile) {
          throw new Error('Teacher profile not found.');
        }

        // Compute sickness duration before resetting
        let daysDiff = 0;
        let formattedStartDate = '';
        let formattedEndDate = '';
        if (profile.sick_start) {
          const startD = new Date(profile.sick_start);
          const endD = new Date();
          startD.setHours(0, 0, 0, 0);
          endD.setHours(0, 0, 0, 0);
          daysDiff = Math.round((endD.getTime() - startD.getTime()) / (24 * 3600 * 1000)) + 1;
          if (daysDiff < 1) daysDiff = 1;
          formattedStartDate = startD.toLocaleDateString('de-DE');
          formattedEndDate = endD.toLocaleDateString('de-DE');
        }

        // 1. Reset sick_until and sick_start to null to return to regular mode
        const { error: userErr } = await supabase
          .from('users')
          .update({ 
            sick_until: null,
            sick_start: null
          })
          .eq('id', userId);

        if (userErr) throw userErr;

        // 2. Fetch weekly schedules
        const { data: schedules, error: schedError } = await supabase
          .from('schedules')
          .select('*')
          .eq('teacher_id', userId);

        if (schedError) throw schedError;

        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const maxDate = new Date(now);
        maxDate.setDate(maxDate.getDate() + 30); // 30 days window

        const currentDate = new Date(todayStart);
        const scheduleIdsToRestore = new Set<string>();
        const datesToDeleteNotifs: string[] = [];

        while (currentDate <= maxDate) {
          const rawDay = currentDate.getDay();
          const currentDayOfWeek = rawDay === 0 ? 7 : rawDay;
          const daySchedules = (schedules || []).filter(s => s.day_of_week === currentDayOfWeek);

          daySchedules.forEach(sched => {
            const [hours, minutes] = (sched.time_slot || '00:00').split(':').map(Number);
            const startDateTime = new Date(currentDate);
            startDateTime.setHours(hours, minutes, 0, 0);

            if (startDateTime >= now) {
              scheduleIdsToRestore.add(sched.id);
              datesToDeleteNotifs.push(startDateTime.toISOString());
            }
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Restore active schedules
        if (scheduleIdsToRestore.size > 0) {
          await supabase
            .from('schedules')
            .update({ status: 'approved' })
            .in('id', Array.from(scheduleIdsToRestore))
            .eq('status', 'canceled_by_teacher_sick');
        }

        // Instead of deleting future notifications, mark them as reinstated so students get notified
        if (datesToDeleteNotifs.length > 0) {
          await supabase
            .from('crisis_notifications')
            .update({ is_reinstated: true, status: 'UNREAD' })
            .eq('teacher_id', userId)
            .in('slot_start_datetime', datesToDeleteNotifs);
        }

        // Add Secretary alarm ticket with logged duration
        const durationStr = daysDiff > 0 ? ` (Krankheitsdauer: vom ${formattedStartDate} bis zum ${formattedEndDate}, ${daysDiff} ${daysDiff === 1 ? 'Tag' : 'Tage'})` : '';
        const alertMessage = `🍏 LEHRKRAFT GESUND: Lehrkraft ${profile.first_name} ${profile.last_name} hat sich wieder gesund gemeldet.${durationStr}`;

        await supabase
          .from('system_alerts')
          .insert({
            school_id: profile.school_id,
            teacher_id: userId,
            type: 'Teacher Healthy Alert',
            message: alertMessage,
            resolved: false
          });

        alert('Erfolgreich gesundgemeldet! Zukünftige Stunden wurden wieder aktiviert.');
      }

      setSickUntilDate('');
      const todayD = new Date();
      const localTodayStr = `${todayD.getFullYear()}-${String(todayD.getMonth() + 1).padStart(2, '0')}-${String(todayD.getDate()).padStart(2, '0')}`;
      setSickStartDate(localTodayStr);

      // Reload teacher profile and refresh data
      const { data: updatedTeacher } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('id', userId)
        .single();
      setTeacher(updatedTeacher);
      setPushEnabled(updatedTeacher.push_notifications_enabled ?? false);
      await refreshAllData(updatedTeacher.school_id, updatedTeacher.id);
    } catch (err) {
      console.error(err);
      alert('Fehler bei der Gesundmeldung.');
    } finally {
      setReportingSick(false);
    }
  };


  // Board 5: Save Setup
  const handleSaveSetup = async () => {
    try {
      const resp = await fetch('/api/teacher/save-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: userId,
          startAnchor,
          breakTimes
        })
      });

      if (resp.ok) {
        alert('Setup erfolgreich aktualisiert! ✅');
      } else {
        // Direct write fallback
        const { error } = await supabase
          .from('users')
          .update({
            start_anchor: startAnchor,
            break_times: breakTimes
          })
          .eq('id', userId);

        if (error) throw error;
        alert('Setup lokal aktualisiert! ✅');
      }
    } catch (err) {
      console.error(err);
      alert('Fehler beim Speichern des Setups.');
    }
  };

  const handleAddBreak = () => {
    if (!newBreakStart || !newBreakEnd || !newBreakLabel) {
      alert('Bitte fülle alle Pausen-Felder aus.');
      return;
    }
    setBreakTimes(prev => [
      ...prev,
      { start: newBreakStart, end: newBreakEnd, label: newBreakLabel }
    ]);
    setNewBreakStart('');
    setNewBreakEnd('');
    setNewBreakLabel('');
  };

  const handleRemoveBreak = (idx: number) => {
    setBreakTimes(prev => prev.filter((_, i) => i !== idx));
  };

  // Board 6: Rooms Handlers
  const handleOpenBookingModal = (day: number, slot: string) => {
    setBookingDay(day);
    setBookingSlot(slot);
    setBookingType('solo');
    setBookingStudentId('');
    setBookingModalOpen(true);
  };

  const handleBookRoomSubmit = async () => {
    if (!selectedRoom || !bookingDay || !bookingSlot) return;

    try {
      let chosenInstrument = '';
      if (bookingType === 'lesson' && bookingStudentId) {
        const studentObj = students.find(s => s.id === bookingStudentId);
        const insts = studentObj?.instrument ? studentObj.instrument.split(',').map((i: string) => i.trim()).filter(Boolean) : [];
        if (insts.length > 1) {
          chosenInstrument = selectedLessonInstrument || insts[0];
        } else if (insts.length === 1) {
          chosenInstrument = insts[0];
        } else {
          chosenInstrument = 'Klavier';
        }
      }

      // Before inserting, validate that no other approved schedule exists for this student_id with the same instrument
      if (bookingType === 'lesson' && bookingStudentId && chosenInstrument) {
        const { data: existing, error: checkErr } = await supabase
          .from('schedules')
          .select('id')
          .eq('student_id', bookingStudentId)
          .eq('instrument', chosenInstrument)
          .eq('status', 'approved')
          .limit(1);

        if (checkErr) {
          console.error('Error checking existing schedules:', checkErr);
        } else if (existing && existing.length > 0) {
          alert(`Fehler: Für diesen Schüler existiert bereits ein genehmigter Stundenplan für das Instrument "${chosenInstrument}".`);
          return;
        }
      }

      const payload: any = {
        school_id: teacher.school_id,
        teacher_id: userId,
        day_of_week: bookingDay,
        time_slot: bookingSlot,
        room_id: selectedRoom.id,
        status: 'approved'
      };

      if (bookingType === 'lesson' && bookingStudentId) {
        payload.student_id = bookingStudentId;
        payload.instrument = chosenInstrument;
      }

      const { data, error } = await supabase
        .from('schedules')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      alert('Raum erfolgreich gebucht! ✅');
      setBookingModalOpen(false);
      await refreshAllData(teacher.school_id, userId);
    } catch (err: any) {
      console.error('Error booking room:', err);
      alert('Fehler beim Buchen des Raums: ' + err.message);
    }
  };

  const handleCancelRoomBooking = async (bookingId: string) => {
    if (!window.confirm('Möchtest du diese Raumbuchung wirklich stornieren?')) return;

    try {
      const isDynamic = allSchoolSchedules.find(s => s.id === bookingId)?.is_dynamic_reschedule;

      if (isDynamic) {
        const { data: occ } = await supabase
          .from('schedule_occurrences')
          .select('original_date, original_start_time, date, start_time')
          .eq('id', bookingId)
          .maybeSingle();

        if (occ) {
          // Delete room booking matching rescheduled coordinates to avoid orphans
          const { error: roomBookingDelErr } = await supabase
            .from('room_bookings')
            .delete()
            .eq('booked_by', userId)
            .eq('date', occ.date)
            .eq('start_time', occ.start_time.length === 5 ? `${occ.start_time}:00` : occ.start_time);
          if (roomBookingDelErr) {
            console.warn('Error clearing associated room booking by coordinates:', roomBookingDelErr);
          }

          const { error } = await supabase
            .from('schedule_occurrences')
            .update({
              date: occ.original_date || occ.date,
              start_time: occ.original_start_time || occ.start_time,
              status: 'scheduled',
              student_acknowledged: false,
              original_date: occ.original_date || occ.date
            })
            .eq('id', bookingId);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from('schedules')
          .delete()
          .eq('id', bookingId);

        if (error) throw error;
      }

      alert('Buchung erfolgreich storniert! ✅');
      await refreshAllData(teacher.school_id, userId);
    } catch (err: any) {
      console.error('Error canceling room booking:', err);
      alert('Fehler beim Stornieren der Buchung: ' + err.message);
    }
  };

  // Filter student lists
  const filteredStudents = students.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-emerald-400">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-emerald-500"></div>
          <span className="font-bold text-sm tracking-wider uppercase">Lade [ CAMPUS ] Daten...</span>
        </div>
      </div>
    );
  }

  const daysOfWeekLabels = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const weekDays = [1, 2, 3, 4, 5, 6, 7];
  const timeSlots = ['13:00', '13:45', '14:30', '15:15', '16:00', '16:45', '17:30', '18:15', '19:00'];

  return (
    <div className={`flex ${hideSidebar ? 'h-full min-h-[650px] w-full' : 'h-screen'} bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden`}>
      {/* Sidebar Navigation */}
      {!hideSidebar && (
        <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo & Role Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                <span className="text-emerald-400 font-black text-lg">C</span>
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white">[ CAMPUS ]</h2>
                <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Teacher Cockpit</p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 rounded-md border border-slate-700">
              {teacher?.first_name || 'Coach'}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveBoard('compass')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeBoard === 'compass'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Clock size={18} />
              <span>Tageskompass</span>
              <div className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            </button>

            <button
              onClick={() => setActiveBoard('classes')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeBoard === 'classes'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Users size={18} />
              <span>Meine Klassen</span>
            </button>

            <button
              onClick={() => hasApprovedSchedules && setActiveBoard('schedule')}
              disabled={!hasApprovedSchedules}
              title={hasApprovedSchedules ? 'Mein Stundenplan' : 'Dein Stundenplan wird freigegeben, sobald die Verwaltung ihn bestätigt hat.'}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                !hasApprovedSchedules
                  ? 'text-slate-600 cursor-not-allowed opacity-50'
                  : activeBoard === 'schedule'
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {hasApprovedSchedules ? (
                <Calendar size={18} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              )}
              <span>Mein Stundenplan</span>
              {hasApprovedSchedules ? (
                <span className="ml-auto text-[10px] bg-emerald-950 px-2 py-0.5 rounded text-emerald-400 border border-emerald-800/50">✓ Freigegeben</span>
              ) : (
                <span className="ml-auto text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-600 border border-slate-800">Gesperrt</span>
              )}
            </button>

            <button
              onClick={() => setActiveBoard('rooms')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeBoard === 'rooms'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Box size={18} />
              <span>Räume</span>
            </button>

            <button
              onClick={() => setActiveBoard('bypass')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeBoard === 'bypass'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'text-red-400 hover:text-red-300 hover:bg-red-950/20'
              }`}
            >
              <AlertTriangle size={18} />
              <span>Krankheits-Bypass</span>
            </button>

            <button
              onClick={() => setActiveBoard('setup')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeBoard === 'setup'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Settings size={18} />
              <span>Mein Setup</span>
            </button>
          </nav>
        </div>

        {/* Footer Area */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700">
              <img src={teacher?.photo_url || '/avatar_ghost.jpg'} alt="" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">{teacher?.first_name} {teacher?.last_name}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Studio ID: {teacher?.ausweis_id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleRealNames()}
            className={`w-full mb-2 py-2 px-3 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all border ${
              showRealNames
                ? 'bg-red-950/20 text-red-400 border-red-900/50 hover:bg-red-950/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title={showRealNames ? "Nachnamen ausblenden" : "Nachnamen einblenden (für 10s)"}
          >
            {showRealNames ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{showRealNames ? "Ausblenden" : "Namen zeigen"}</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full py-2 bg-slate-800 hover:bg-red-950/30 hover:text-red-400 text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-700"
          >
            Abmelden
          </button>
        </div>
      </aside>
      )}

      {/* Main Board Viewport */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
        {/* Holiday Banner */}
        {isTodayHoliday && (
          <div className="mx-8 mt-6 p-6 bg-gradient-to-r from-slate-900/95 to-slate-900/85 border border-emerald-500/15 rounded-3xl flex items-center gap-5 shadow-xl backdrop-blur-md relative overflow-hidden animate-fade-in hover:border-emerald-500/25 transition duration-300">
            <div style={{
              position: 'absolute',
              right: '-20px',
              bottom: '-20px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(52, 168, 83, 0.08) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
            <div className="p-3.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 rounded-2xl flex-shrink-0 shadow-lg shadow-emerald-500/5">
              <Palmtree size={22} strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/10">
                  Schulfrei
                </span>
                <h2 className="text-base font-black text-white">{isTodayHoliday.name}</h2>
              </div>
              <p className="text-slate-400 text-xs mt-1.5 font-semibold leading-relaxed">
                Vom <strong className="text-emerald-400 font-extrabold">{new Date(isTodayHoliday.start).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'})}</strong> bis zum <strong className="text-emerald-400 font-extrabold">{new Date(isTodayHoliday.end).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'})}</strong> findet kein regulärer Unterricht statt. Genieße die Ferien!
              </p>
            </div>
          </div>
        )}
        {/* Thin accent line matching the CAMPUS tab label color (#34a853) */}
        <div style={{ height: '3px', background: '#34a853', width: '100%', flexShrink: 0 }} />
        {/* Board 1: TAGESKOMPASS */}
        {activeBoard === 'compass' && (
          <div className="p-8 max-w-5xl w-full mx-auto space-y-6">
            {/* Premium Greeting Banner in Dark Mode */}
            <div className="bg-slate-900/60 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full overflow-hidden bg-slate-800 border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/5 flex-shrink-0">
                  <img src={teacher?.photo_url || '/avatar_ghost.jpg'} alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    Hallo, {teacher?.first_name || 'Coach'}! <span className="inline-block animate-bounce">👋</span>
                  </h1>
                  <p className="text-slate-400 text-sm mt-1 font-semibold">
                    Live-Unterrichts-Cockpit für heute ({daysOfWeekLabels[new Date().getDay() === 0 ? 7 : new Date().getDay()]})
                  </p>
                </div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800/60 rounded-2xl px-4 py-2.5 flex items-center gap-3 self-start md:self-auto shadow-inner">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                <span className="font-mono text-xs font-bold text-emerald-400 tracking-widest uppercase">{currentTimeStr || '13:00'} UHR</span>
              </div>
            </div>

            {/* Gamified KPI Cards row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>

              {/* Card 1: Schüler Heute (Blue) */}
              <div style={{
                position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white',
                borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                padding: '14px 16px', boxSizing: 'border-box',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Schüler Heute</span>
                  <div style={{ background: 'rgba(255,255,255,0.18)', padding: '5px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={14} color="white" />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 950, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{sortedTodaySchedules.length}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.85 }}>UE</span>
                </div>
              </div>

              {/* Card 2: Ø Übe-Streak (Green) */}
              <div style={{
                position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', color: 'white',
                borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(52, 168, 83, 0.4)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                padding: '14px 16px', boxSizing: 'border-box',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ø Übe-Streak</span>
                  <div style={{ background: 'rgba(255,255,255,0.18)', padding: '5px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Flame size={14} color="white" />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 950, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>0.0</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.85 }}>Tage</span>
                </div>
              </div>

              {/* Card 3: Tages-Pensum (Yellow) */}
              <div style={{
                position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)', color: 'white',
                borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(234, 179, 8, 0.4)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                padding: '14px 16px', boxSizing: 'border-box',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tages-Pensum</span>
                  <div style={{ background: 'rgba(255,255,255,0.18)', padding: '5px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={14} color="white" />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 950, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {(() => {
                      const totalMins = sortedTodaySchedules.reduce((acc, s) => acc + (s.duration || 45), 0);
                      const h = Math.floor(totalMins / 60);
                      const m = totalMins % 60;
                      return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}` : `${m}m`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Card 4: Ausfälle (Red) */}
              <div style={{
                position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white',
                borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.4)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                padding: '14px 16px', boxSizing: 'border-box',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ausfälle</span>
                  <div style={{ background: 'rgba(255,255,255,0.18)', padding: '5px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={14} color="white" />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 950, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{sortedTodaySchedules.filter(s => s.status === 'canceled_by_student' || s.status === 'cancelled').length}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.85 }}>Heute</span>
                </div>
              </div>

            </div>

            {/* Terminänderungen & Alerts Widget */}
            {notifications.length > 0 && (
              <div style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} color="#eab308" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: 'white', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>[ Terminänderungen & Alerts ]</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        padding: '10px 14px', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        opacity: n.resolved ? 0.6 : 1
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fbbc05', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          {n.type} • {new Date(n.created_at).toLocaleDateString('de-DE')}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginTop: '3px', lineHeight: 1.3 }}>
                          {n.message}
                        </div>
                      </div>
                      {!n.resolved && (
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('system_alerts')
                                .update({ resolved: true })
                                .eq('id', n.id);
                              if (error) throw error;
                              fetchNotifications(userId);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          style={{
                            background: '#fbbc05',
                            border: 'none',
                            color: '#1f2937',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flexShrink: 0
                          }}
                        >
                          Gelesen markieren
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vertical Timeline */}
            <div className="relative border-l border-slate-800 ml-4 pl-8 space-y-6 py-4">
              {sortedTodaySchedules.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <Clock size={36} className="mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-400 font-bold text-sm">Keine Unterrichtsstunden für heute eingetragen.</p>
                </div>
              ) : (
                sortedTodaySchedules.map((sched) => {
                  const isActive = isSlotActive(sched.time_slot);
                  const isSick = sched.status === 'teacher_sick' || sched.status === 'canceled_by_teacher_sick';
                  return (
                    <div key={sched.id} className="relative group">
                      {/* Pulsing Active Dot Indicator */}
                      <div className={`absolute -left-[41px] top-4 w-6 h-6 rounded-full flex items-center justify-center border-4 ${
                        isSick 
                          ? 'bg-red-500 border-slate-950' 
                          : isActive 
                            ? 'bg-emerald-500 border-slate-950 animate-pulse shadow-lg shadow-emerald-500/50' 
                            : 'bg-slate-800 border-slate-950 group-hover:bg-slate-700'
                      }`}>
                        {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>

                      <div 
                        onClick={() => {
                          if (!isSick && sched.status !== 'pending_reschedule') {
                            handleOpenDocModal(sched);
                          }
                          const clickDate = sched.date || new Date().toLocaleDateString('sv-SE');
                          setSickUntilDate(clickDate);
                        }}
                        style={{
                          borderLeft: sched.status === 'rescheduled_confirmed' ? '5px solid #fbbc05' : undefined
                        }}
                        className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          isSick 
                            ? 'bg-red-950/20 border-red-900/35 hover:bg-red-950/30' 
                            : !sched.student
                              ? 'bg-purple-950/10 border-purple-900/30 hover:bg-purple-950/20 shadow-md shadow-purple-500/5'
                              : sched.status === 'pending_reschedule'
                                ? 'bg-emerald-950/15 border-emerald-500/50 hover:border-emerald-500 shadow-md shadow-emerald-500/5'
                                : isActive 
                                  ? 'bg-emerald-950/10 border-emerald-500/50 shadow-md shadow-emerald-500/5 hover:border-emerald-500' 
                                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="font-mono text-xs font-bold text-emerald-400">{sched.time_slot} Uhr</span>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                              {sched.status === 'pending_reschedule' && <span className="text-yellow-500">🔄</span>}
                              {sched.status === 'rescheduled_confirmed' && (
                                <span 
                                  title="Termin verschoben und bestätigt"
                                  style={{ 
                                    width: '10px', 
                                    height: '10px', 
                                    borderRadius: '50%', 
                                    background: '#34a853', 
                                    boxShadow: '0 0 8px #34a853',
                                    display: 'inline-block' 
                                  }} 
                                />
                              )}
                              {sched.student ? `${sched.student.first_name} ${maskLastName(sched.student.last_name)}` : '☕ Pause (45 Min.)'}
                            </h3>
                            <div className="flex gap-2">
                              {sched.student?.instrument && (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-800 text-slate-400 border border-slate-700">
                                  {sched.student.instrument}
                                </span>
                              )}
                              {sched.rooms?.name && (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-800/80 text-emerald-500/90 border border-slate-800">
                                  Raum: {sched.rooms.name}
                                </span>
                              )}
                            </div>
                          </div>
 
                          <div className="flex flex-col items-end gap-1.5">
                            {isSick ? (
                              <span className="px-2.5 py-1 text-[10px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20 rounded-md">
                                Ausfall (Krankheit)
                              </span>
                            ) : !sched.student ? (
                              <span className="px-2.5 py-1 text-[10px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md">
                                Pause
                              </span>
                            ) : sched.status === 'canceled_by_student' ? (
                              <span className="px-2.5 py-1 text-[10px] font-black uppercase bg-slate-800 text-slate-500 rounded-md border border-slate-700">
                                Abgesagt
                              </span>
                            ) : sched.status === 'pending_reschedule' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                <span className="px-2.5 py-1 text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                                  Verschiebung erbeten
                                </span>
                                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleTeacherResolveReschedule(sched.schedule_id, true)}
                                    className="px-2 py-1 text-[9px] font-bold uppercase rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
                                  >
                                    Annehmen
                                  </button>
                                  <button
                                    onClick={() => handleTeacherResolveReschedule(sched.schedule_id, false)}
                                    className="px-2 py-1 text-[9px] font-bold uppercase rounded bg-slate-850 hover:bg-slate-755 text-slate-300 border border-slate-700 transition"
                                  >
                                    Ablehnen
                                  </button>
                                </div>
                              </div>
                            ) : sched.status === 'rescheduled_confirmed' ? (
                              <span className="px-2.5 py-1 text-[10px] font-black uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-md">
                                Verschoben & Bestätigt
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                                Unterricht aktiv
                              </span>
                            )}
                            {sched.student && sched.status !== 'pending_reschedule' && (
                              <span className="text-[10px] font-bold text-slate-500">
                                {sched.student?.premium_status?.is_premium_active ? '✨ Premium Schüler' : 'Standard Zugang'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Board 2: MEINE KLASSEN */}
        {activeBoard === 'classes' && (
          <div className="p-8 max-w-5xl w-full mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">Meine Klassen</h1>
                <p className="text-slate-400 text-sm mt-1">Schüler-Archiv & Eltern-Onboarding</p>
              </div>

              {/* Cascade Onboarding Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 max-w-md w-full">
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <Zap size={18} />
                  <span className="text-xs uppercase font-black tracking-wider">Kaskaden-Onboarding</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Generiere einen Einladungslink für Eltern, um neue Schüler direkt zuzuordnen.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateOnboardingLink}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition"
                  >
                    Link generieren
                  </button>
                  {cascadeLink && (
                    <button
                      onClick={copyToClipboard}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition flex items-center justify-center"
                    >
                      {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  )}
                </div>
                {cascadeLink && (
                  <p className="text-[10px] font-mono text-emerald-400 break-all select-all p-2 bg-slate-950 rounded-lg border border-slate-800">
                    {cascadeLink}
                  </p>
                )}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-3 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Schüler suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-semibold"
              />
            </div>

            {/* Student Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudents.map(student => (
                <div 
                  key={student.id}
                  onClick={() => handleViewStudentHistory(student)}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl flex items-center gap-4 cursor-pointer transition-all duration-200"
                  style={{ contentVisibility: 'auto', containIntrinsicSize: '0 96px' }}
                >
                  <div className="h-14 w-14 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700">
                    <img src={student.photo_url || '/avatar_ghost.jpg'} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{student.first_name} {maskLastName(student.last_name)}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{student.instrument || 'Instrument unbestimmt'}</p>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">Ausweis-ID: {student.ausweis_id || 'Keine'}</span>
                  </div>
                  <ChevronRight size={20} className="text-slate-600" />
                </div>
              ))}
            </div>

            {/* Detail History Card */}
            {selectedStudentHistory && (
              <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-6 mt-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">Fortschritts-Kartei</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1 text-emerald-400">
                      {selectedStudentHistory.student.first_name} {maskLastName(selectedStudentHistory.student.last_name)}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedStudentHistory(null)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg"
                  >
                    Schließen
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedStudentHistory.history.length === 0 ? (
                    <p className="text-slate-500 font-bold text-xs text-center py-6">Keine historischen Einträge vorhanden.</p>
                  ) : (
                    selectedStudentHistory.history.map((histItem: any) => (
                      <div key={histItem.id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex items-start gap-4">
                        <div className={`mt-1 w-2.5 h-2.5 rounded-full ${
                          histItem.status === 'MASTERED' 
                            ? 'bg-emerald-500' 
                            : histItem.status === 'THEORY_DONE' 
                              ? 'bg-emerald-500' 
                              : 'bg-slate-600'
                        }`}></div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h4 className="font-bold text-sm text-white">{histItem.topic_name}</h4>
                            <span className="text-[10px] font-mono text-slate-500">{new Date(histItem.updated_at).toLocaleDateString()}</span>
                          </div>
                          {histItem.teacher_notes && (
                            <p className="text-xs text-slate-400 mt-1 font-medium">{histItem.teacher_notes}</p>
                          )}
                          {histItem.is_current_homework && (
                            <span className="mt-2 inline-block px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                              Hausaufgabe
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Board 3: MEIN STUNDENPLAN */}
        {activeBoard === 'schedule' && (
          <div className="p-8 max-w-full w-full mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Wochen-Stundenplan</h1>
            </div>

            {/* Empty-state: no approved schedules yet */}
            {!hasApprovedSchedules && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '52px 24px', borderRadius: '20px', border: '1.5px dashed #334155', background: 'rgba(15,23,42,0.6)', textAlign: 'center', gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(52,168,83,0.08)', border: '1.5px solid rgba(52,168,83,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#34a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#e2e8f0' }}>Stundenplan noch nicht freigegeben</p>
                  <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>Die Verwaltung hat deinen Stundenplan noch nicht freigegeben.<br />Sobald er freigegeben wird, erscheinen deine Unterrichtsstunden hier automatisch.</p>
                </div>
              </div>
            )}

            {/* Calendar Table Grid — only shown when schedules are approved */}
            {hasApprovedSchedules && <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-left">
                    <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Uhrzeit</th>
                    {weekDays.map(day => (
                      <th key={day} className="p-4 text-xs font-black uppercase text-slate-300 tracking-wider">
                        {daysOfWeekLabels[day]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map(slot => (
                    <tr key={slot} className="border-b border-slate-850 hover:bg-slate-900/10">
                      <td className="p-4 font-mono text-xs font-bold text-slate-500 bg-slate-950/20">{slot}</td>
                      {weekDays.map(day => {
                        const scheds = weekSchedules.filter(s => s.day_of_week === day && s.time_slot === slot);
                        // Room layout mapping - assuming teacher has slots in rooms
                        const isBreak = breakTimes.some(b => slot >= b.start && slot < b.end);

                        return (
                          <td 
                            key={`${day}-${slot}`} 
                            className="p-2 min-w-[120px] relative transition-colors duration-150"
                            style={{
                              backgroundColor: dragOverSlotKey === `${day}-${slot}` ? 'rgba(52, 168, 83, 0.05)' : undefined
                            }}
                          >
                            {isBreak ? (
                              <div className="py-2.5 px-3 rounded-xl bg-purple-950/10 border border-purple-900/30 text-center flex items-center justify-center">
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1">
                                  ☕ {slot} Pause
                                </span>
                              </div>
                            ) : scheds.length > 0 ? (
                              scheds.map(sched => (
                                <div
                                  key={sched.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, sched.id)}
                                  className={`p-3 rounded-xl border cursor-grab active:cursor-grabbing select-none ${
                                    !sched.student
                                      ? 'bg-purple-950/20 border-purple-800/60 text-purple-300'
                                      : sched.status === 'teacher_sick' || sched.status === 'canceled_by_teacher_sick'
                                        ? 'bg-red-950/30 border-red-900/60 text-red-300'
                                        : sched.status === 'pending_parent_approval'
                                          ? 'bg-emerald-950/20 border-emerald-700/50 text-emerald-300'
                                          : 'bg-slate-900 border-slate-800 text-white'
                                  }`}
                                >
                                  <p className="text-xs font-bold truncate">
                                    {sched.student ? `${sched.student.first_name} ${sched.student.last_name[0]}.` : `☕ ${sched.time_slot} Pause (45 Min.)`}
                                  </p>
                                  <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mt-0.5">
                                    {sched.student ? (sched.student.instrument || 'Inst') : 'Pause (45 Min.)'}
                                  </p>
                                  {sched.rooms?.name && (
                                    <p className="text-[9px] font-bold text-emerald-400 mt-1">
                                      {sched.rooms.name}
                                    </p>
                                  )}
                                </div>
                              ))
                            ) : (
                              // Free slots dropper zones
                              rooms.map(room => {
                                const trafficLightColor = draggedScheduleId ? getTrafficLight(draggedScheduleId, slot, day, room.id) : 'GREEN';
                                
                                return (
                                  <div
                                    key={room.id}
                                    onDragOver={(e) => handleDragOverSlot(e, `${day}-${slot}`)}
                                    onDrop={() => handleDropSlot(slot, day, room.id)}
                                    className={`py-2 px-3 rounded-lg border border-dashed text-center text-[9px] font-bold uppercase transition duration-150 cursor-pointer ${
                                      draggedScheduleId 
                                        ? trafficLightColor === 'RED'
                                          ? 'border-red-900 bg-red-950/15 text-red-500/80 cursor-not-allowed'
                                          : trafficLightColor === 'YELLOW'
                                            ? 'border-yellow-700/40 bg-yellow-950/10 text-yellow-500/80'
                                            : 'border-emerald-500/40 bg-emerald-950/10 text-emerald-400'
                                        : 'border-slate-800 hover:border-slate-700 text-slate-600 hover:text-slate-400'
                                    }`}
                                  >
                                    + {room.name}
                                  </div>
                                );
                              })
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </div>
        )}

        {/* Board 4: KRANKHEITS-BYPASS */}
        {activeBoard === 'bypass' && (
          <div className="p-8 max-w-lg w-full mx-auto space-y-6">
            <div className="bg-red-950/10 border border-red-900/35 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-4 text-red-400">
                <AlertTriangle size={36} className={teacher?.sick_until ? 'animate-pulse' : ''} />
                <div>
                  <h1 className="text-2xl font-black text-white">Krankheits-Bypass</h1>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-400/90 mt-0.5">Notfall-Bypass-Schalter</p>
                </div>
              </div>

              {teacher?.sick_until ? (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1.5px solid #ef4444',
                  borderRadius: '16px',
                  padding: '16px',
                  color: '#fca5a5',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span> status: AKTIV KRANKGEMELDET
                  </div>
                  <div className="text-white text-sm font-semibold mt-1">
                    Krankgemeldet vom {teacher.sick_start ? new Date(teacher.sick_start).toLocaleDateString('de-DE') : 'Sofort'} bis {new Date(teacher.sick_until).toLocaleDateString('de-DE')}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-300 font-medium leading-relaxed">
                  Falls du dich krankmelden musst, wähle bitte das voraussichtliche Start- und Enddatum aus. Alle in diesem Zeitraum betroffenen Stundenplandaten werden automatisch storniert und als Krankheitsausfall rot markiert. Zudem wird ein Alarmticket an das Krisen-Dashboard der Verwaltung gesendet.
                </p>
              )}

              <div className="space-y-4 pt-2">
                {!showCustomStart ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {teacher?.sick_until ? 'Krankmeldung anpassen (bis einschließlich):' : 'Krank bis einschließlich:'}
                    </label>
                    <input
                      type="date"
                      value={sickUntilDate}
                      onChange={(e) => setSickUntilDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 font-semibold"
                      style={{ colorScheme: 'dark' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomStart(true)}
                      className="text-xs text-red-400 hover:text-red-300 font-bold underline transition duration-200 mt-1 flex items-center gap-1.5"
                    >
                      <Calendar size={14} />
                      Anderes Startdatum wählen (Standard: Heute)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Krankmeldungs-Zeitraum:
                    </label>
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-semibold">
                      <span className="text-slate-400 text-xs font-black uppercase tracking-wider">von</span>
                      <input
                        type="date"
                        value={sickStartDate}
                        onChange={(e) => setSickStartDate(e.target.value)}
                        className="bg-transparent border-none text-white focus:outline-none w-full font-semibold"
                        style={{ colorScheme: 'dark' }}
                      />
                      <span className="text-slate-400 text-xs font-black uppercase tracking-wider">- bis</span>
                      <input
                        type="date"
                        value={sickUntilDate}
                        onChange={(e) => setSickUntilDate(e.target.value)}
                        className="bg-transparent border-none text-white focus:outline-none w-full font-semibold"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomStart(false);
                        const todayD = new Date();
                        const localTodayStr = `${todayD.getFullYear()}-${String(todayD.getMonth() + 1).padStart(2, '0')}-${String(todayD.getDate()).padStart(2, '0')}`;
                        setSickStartDate(localTodayStr);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-300 font-bold underline transition duration-200 mt-1 block"
                    >
                      Standard-Startdatum verwenden (Heute)
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleReportSick}
                    disabled={reportingSick}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white font-black text-sm uppercase tracking-widest rounded-xl transition duration-200 shadow-lg shadow-red-900/35"
                  >
                    {reportingSick ? 'Aktualisiere...' : teacher?.sick_until ? 'Krankmeldungszeitraum anpassen' : 'Krankheit offiziell melden'}
                  </button>

                  {teacher?.sick_until && (
                    <button
                      onClick={handleEndSick}
                      disabled={reportingSick}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-black text-sm uppercase tracking-widest rounded-xl transition duration-200 shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                    >
                      <Check size={18} />
                      {reportingSick ? 'Gesundmelden...' : 'Wieder gesund melden'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Board 5: MEIN SETUP */}
        {activeBoard === 'setup' && (
          <div className="p-8 max-w-2xl w-full mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Mein Setup</h1>
              <p className="text-slate-400 text-sm mt-1">Einstellungsanker für die Match-Engine & Pausenregeln</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
              {/* Start Anchor */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Minutengenauer Start-Ankerpunkt</h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">Definiert die exakte Uhrzeit, an der dein erster Schüler-Slot frühestens eingeteilt werden soll.</p>
                <input
                  type="text"
                  placeholder="z.B. 13:05"
                  value={startAnchor}
                  onChange={(e) => setStartAnchor(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500 w-36"
                />
              </div>

              {/* Break times List */}
              <div className="space-y-4 border-t border-slate-800 pt-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Individuelle Pausenzeiten</h3>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">Lege feste, nicht-unterrichtbare Zeiträume fest (z.B. Kaffeepause).</p>
                </div>

                {/* Add new break rule */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-slate-950 p-4 rounded-2xl border border-slate-850">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500">Von</label>
                    <input
                      type="text"
                      placeholder="15:35"
                      value={newBreakStart}
                      onChange={(e) => setNewBreakStart(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500">Bis</label>
                    <input
                      type="text"
                      placeholder="15:50"
                      value={newBreakEnd}
                      onChange={(e) => setNewBreakEnd(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500">Bezeichnung</label>
                    <input
                      type="text"
                      placeholder="Kaffeepause"
                      value={newBreakLabel}
                      onChange={(e) => setNewBreakLabel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold"
                    />
                  </div>
                  <button
                    onClick={handleAddBreak}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Hinzufügen
                  </button>
                </div>

                {/* Breaks Rules List */}
                <div className="space-y-2">
                  {breakTimes.map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-400 text-sm">{b.start} - {b.end}</span>
                        <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">{b.label}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveBreak(idx)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Push Notifications Toggle */}
              <div className="space-y-4 border-t border-slate-800 pt-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">System & Benachrichtigungen</h3>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">Aktiviere Push-Nachrichten für sofortige Benachrichtigungen bei Stundenplan-Änderungen (Verschiebungen, Ausfälle) direkt auf deinem Handy.</p>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-850">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🔔</span>
                    <span className="text-xs font-bold text-slate-300">Push-Benachrichtigungen aktivieren</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pushEnabled}
                      onChange={async (e) => {
                        const checked = e.target.checked;
                        setPushEnabled(checked);
                        if (checked) {
                          const success = await subscribeUserToPush(userId);
                          if (!success) {
                            setPushEnabled(false);
                            alert('Fehler beim Aktivieren der Push-Benachrichtigungen. Bitte überprüfe die Berechtigungen deines Browsers.');
                          } else {
                            alert('Push-Benachrichtigungen erfolgreich aktiviert! 🔔');
                          }
                        } else {
                          const success = await unsubscribeUserFromPush(userId);
                          if (!success) {
                            setPushEnabled(true);
                            alert('Fehler beim Deaktivieren der Push-Benachrichtigungen.');
                          } else {
                            alert('Push-Benachrichtigungen deaktiviert.');
                          }
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950"></div>
                  </label>
                </div>
              </div>

              {/* Save All */}
              <button
                onClick={handleSaveSetup}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm uppercase tracking-wider rounded-xl transition duration-200"
              >
                Setup speichern & Engine anpassen
              </button>
            </div>
          </div>
        )}

        {/* Board 6: RÄUME OVERVIEW & BOOKINGS */}
        {activeBoard === 'rooms' && (
          <div className="p-8 max-w-full w-full mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">Raum-Belegungen & Buchung</h1>
                <p className="text-slate-400 text-sm mt-1">Hier siehst du freie und belegte Räume in Echtzeit und kannst Buchungen vornehmen.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Physical Rooms List */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 bg-slate-905 border border-slate-850 rounded-2xl">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Akademie Räume</h3>
                  <div className="space-y-3">
                    {rooms.map((room) => {
                      const isSelected = selectedRoom?.id === room.id;
                      // Calculate occupancy stats for today
                      const todayWeekday = new Date().getDay() || 7;
                      const todayBookingsCount = allSchoolSchedules.filter(
                        s => s.room_id === room.id && s.day_of_week === todayWeekday
                      ).length;
                      const freeTodayCount = timeSlots.length - todayBookingsCount;

                      return (
                        <div
                          key={room.id}
                          onClick={() => setSelectedRoom(room)}
                          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                <Box size={18} />
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-sm">{room.name}</h4>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                                  {room.allowed_instruments && room.allowed_instruments.length > 0
                                    ? room.allowed_instruments.join(', ')
                                    : 'Alle Instrumente'}
                                </p>
                              </div>
                            </div>
                            
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const isFav = preferredRoomIds.includes(room.id);
                                if (!isFav && preferredRoomIds.length >= 2) {
                                  alert('Du kannst maximal 2 Lieblingsräume festlegen!');
                                  return;
                                }
                                const newFavorites = isFav 
                                  ? preferredRoomIds.filter(id => id !== room.id)
                                  : [...preferredRoomIds, room.id];
                                
                                setPreferredRoomIds(newFavorites);
                                try {
                                  const { error } = await supabase
                                    .from('users')
                                    .update({ preferred_room_ids: newFavorites })
                                    .eq('id', userId);
                                  if (error) throw error;
                                } catch (err: any) {
                                  alert('Fehler beim Speichern der Lieblingsräume: ' + err.message);
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-800 transition duration-150"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title="Als Lieblingsraum markieren (max. 2)"
                            >
                              <Star
                                size={16}
                                fill={preferredRoomIds.includes(room.id) ? "#fbbf24" : "none"}
                                color={preferredRoomIds.includes(room.id) ? "#fbbf24" : "#64748b"}
                              />
                            </button>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-slate-800/40 pt-3 text-[11px] font-semibold text-slate-400">
                            <span>Größe: {room.qm || 'N/A'} qm</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              todayBookingsCount > 4 ? 'bg-red-950/40 text-red-400' : 'bg-emerald-950/40 text-emerald-400'
                            }`}>
                              {todayBookingsCount} Belegt | {freeTodayCount} Frei
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Weekly Grid for Selected Room */}
              <div className="lg:col-span-8 space-y-4">
                {selectedRoom ? (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-black text-white">{selectedRoom.name} - Stundenplan</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                          {selectedRoom.allowed_instruments && selectedRoom.allowed_instruments.length > 0
                            ? `Erlaubt: ${selectedRoom.allowed_instruments.join(', ')}`
                            : 'Keine Instrumenten-Einschränkungen'}
                        </p>
                      </div>
                    </div>

                    {/* Booking Calendar Grid */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-850 bg-slate-950/20">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-slate-850 bg-slate-900/50 text-left">
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Uhrzeit</th>
                            {weekDays.map(day => {
                              const dateStr = getSchedDateStr(day);
                              const dateObj = new Date(dateStr);
                              const formattedDate = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
                              const activeHoliday = holidays.find(h => dateStr >= h.start && dateStr <= h.end);

                              return (
                                <th key={day} className="p-4 text-xs font-black uppercase tracking-wider text-center">
                                  <div className="text-slate-300">{daysOfWeekLabels[day]}</div>
                                  <div className="text-[10px] text-slate-500 font-bold mt-0.5">{formattedDate}</div>
                                  {activeHoliday && (
                                    <div className="text-[9px] font-black text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded mt-1.5 uppercase tracking-wide inline-block">
                                      🌴 {activeHoliday.name}
                                    </div>
                                  )}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {timeSlots.map(slot => (
                            <tr key={slot} className="border-b border-slate-900/40 hover:bg-slate-900/10">
                              <td className="p-4 font-mono text-xs font-bold text-slate-500 bg-slate-950/30">{slot}</td>
                              {weekDays.map(day => {
                                const slotBookings = allSchoolSchedules.filter(s => {
                                  if (s.room_id !== selectedRoom.id || s.day_of_week !== day) return false;
                                  
                                  const slotStart = timeToMinutes(slot);
                                  const slotEnd = slotStart + 45;
                                  
                                  const bookingStart = timeToMinutes(s.time_slot);
                                  const bookingDuration = s.duration || 45;
                                  const bookingEnd = bookingStart + bookingDuration;
                                  
                                  return bookingStart < slotEnd && bookingEnd > slotStart;
                                });

                                // Own teaching block detection: teacher's approved schedule at this time
                                // (regardless of room – to show blocked indicator in all rooms)
                                const ownTeachingAtThisTime = rawWeekSchedules.filter((s: any) => {
                                  if (s.student_id === null) return false; // skip break slots
                                  if (s.status !== 'approved') return false;
                                  if (s.day_of_week !== day) return false;
                                  const slotStart = timeToMinutes(slot);
                                  const slotEnd = slotStart + 45;
                                  const teachStart = timeToMinutes(s.time_slot || '');
                                  const teachEnd = teachStart + (s.duration || 45);
                                  return teachStart < slotEnd && teachEnd > slotStart;
                                });
                                // Only show the blocked indicator if the teacher's own slot isn't already
                                // rendered via slotBookings (i.e. room_id matches → already visible as green card)
                                const isOwnTeachingBlocked =
                                  ownTeachingAtThisTime.length > 0 &&
                                  !slotBookings.some((b: any) => b.teacher_id === userId && !b.is_dynamic_reschedule);
                                const ownTeachingRoomName = ownTeachingAtThisTime[0]?.room_id
                                  ? (rooms.find((r: any) => r.id === ownTeachingAtThisTime[0].room_id)?.name || 'zugewiesen')
                                  : null;

                                return (
                                  <td key={`${day}-${slot}`} className="p-2 min-w-[130px] relative">
                                    {slotBookings.length > 0 ? (
                                      <div className="flex flex-col md:flex-row gap-1.5 items-stretch w-full h-full">
                                        {slotBookings.map(booking => {
                                          const isCurrentTeacherBooking = booking && booking.teacher_id === userId;
                                          const isRescheduled = booking.status === 'pending_reschedule' || booking.status === 'rescheduled_confirmed' || booking.is_dynamic_reschedule;
                                          const hasConflict = isRescheduled && slotBookings.length > 1;
                                          
                                          const bookingDuration = booking.duration || 45;
                                          const endTimeStr = getEndTime(booking.time_slot, bookingDuration);
                                          const bookingTimeDisplay = `${booking.time_slot} - ${endTimeStr}`;
                                          
                                          const studentDisplayName = booking.student 
                                            ? (isCurrentTeacherBooking 
                                                ? `${booking.student.first_name} ${booking.student.last_name[0] ? booking.student.last_name[0] + '.' : ''}` 
                                                : 'Besetzt')
                                            : 'Freie Buchung';

                                          const displayTitle = booking.student 
                                            ? `${booking.status === 'pending_reschedule' ? 'Reservierung' : booking.status === 'rescheduled_confirmed' ? 'Verschoben' : 'Unterricht'}: ${isCurrentTeacherBooking ? `${booking.student.first_name} ${booking.student.last_name[0] ? booking.student.last_name[0] + '.' : ''}` : 'Besetzt'} (${bookingTimeDisplay}) - Coach: ${booking.teacher ? `${booking.teacher.first_name} ${booking.teacher.last_name}` : 'Unbekannt'}`
                                            : `Freie Buchung (${bookingTimeDisplay})`;

                                          return (
                                            <div key={booking.id} title={displayTitle} className={`flex-1 p-2.5 rounded-xl border flex flex-col justify-between h-full min-h-[72px] transition duration-200 relative overflow-hidden ${
                                              isRescheduled && isCurrentTeacherBooking
                                                ? `bg-purple-950/25 ${hasConflict ? 'border-amber-500/80 shadow-md shadow-amber-500/10' : 'border-purple-500/40'} text-purple-200`
                                                : isRescheduled
                                                  ? `bg-amber-950/20 ${hasConflict ? 'border-red-500/60' : 'border-amber-500/30'} text-amber-200`
                                                  : isCurrentTeacherBooking
                                                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                                                    : 'bg-red-950/25 border-red-900/30 text-red-200'
                                            }`}>
                                              {isRescheduled && !isCurrentTeacherBooking && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-3xl font-black opacity-20 select-none pointer-events-none font-sans text-amber-400">
                                                  R
                                                </div>
                                              )}
                                              {!booking.is_dynamic_reschedule && booking.status !== 'pending_reschedule' && booking.status !== 'rescheduled_confirmed' && (
                                                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 opacity-30 select-none pointer-events-none flex items-center justify-center">
                                                  <Lock size={11} />
                                                </div>
                                              )}
                                              <div className="relative z-10 flex flex-col items-start">
                                                {hasConflict && (
                                                  <div className="text-[8px] font-black uppercase text-amber-400 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 rounded-md mb-1.5">
                                                    ⚠️ Doppelbelegung
                                                  </div>
                                                )}
                                                <p className="text-[10px] font-black uppercase tracking-wider opacity-75">
                                                  {bookingTimeDisplay}
                                                </p>
                                                <p className="text-[11px] font-bold truncate mt-0.5 w-full">
                                                  {studentDisplayName}
                                                </p>
                                                <p className="text-[9px] opacity-60 font-semibold mt-1">
                                                  {booking.status === 'pending_reschedule' ? 'Reservierung' : booking.status === 'rescheduled_confirmed' ? 'Verschoben' : (booking.student ? 'Unterricht' : 'Eigennutzung')}
                                                </p>
                                              </div>

                                              {isCurrentTeacherBooking && (
                                                <button
                                                  onClick={() => handleCancelRoomBooking(booking.id)}
                                                  className="mt-2 text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition duration-150 self-start bg-red-950/40 border border-red-900/40 px-2 py-0.5 rounded"
                                                >
                                                  Stornieren
                                                </button>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : isOwnTeachingBlocked ? (
                                      /* ── Eigener Unterrichtsblock (anderer Raum) ── */
                                      <div
                                        className="w-full py-3 px-2.5 rounded-xl border border-emerald-900/40 bg-emerald-950/15 flex flex-col gap-1 cursor-not-allowed select-none"
                                        title={ownTeachingRoomName ? `Du unterrichtest gerade in: ${ownTeachingRoomName}` : 'Du unterrichtest gerade in einem anderen Raum'}
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <Lock size={9} className="text-emerald-600 flex-shrink-0" />
                                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                                            Mein Unterricht
                                          </span>
                                        </div>
                                        {ownTeachingRoomName && (
                                          <span className="text-[8px] font-semibold text-emerald-700/70 truncate">
                                            {ownTeachingRoomName}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleOpenBookingModal(day, slot)}
                                        className="w-full py-4 rounded-xl border border-dashed border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-center text-[10px] font-bold uppercase text-slate-500 hover:text-emerald-400 transition duration-150"
                                      >
                                        + Buchen
                                      </button>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center bg-slate-900/20 border border-slate-850 rounded-3xl">
                    <p className="text-slate-400 font-bold text-sm">Wähle einen Raum aus der Liste, um seinen Plan anzuzeigen.</p>
                  </div>
                )}

                {/* ── Meine Termin-Buchungen (via Campus Events) ── */}
                {campusEventBookings.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                      <Calendar size={13} />
                      Meine Termin-Buchungen
                    </h3>
                    <div className="flex flex-col gap-3">
                      {campusEventBookings.map((bk: any) => {
                        const dateStr = bk.event_date
                          ? new Date(bk.event_date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                          : '—';
                        const timeStr = bk.start_time
                          ? bk.start_time.substring(0, 5) + (bk.end_time ? ` – ${bk.end_time.substring(0, 5)}` : '') + ' Uhr'
                          : '';
                        return (
                          <div key={bk.id} className="flex items-center justify-between gap-4 bg-slate-900/40 border border-slate-800 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                                <Box size={15} className="text-indigo-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-white truncate">{bk.title}</p>
                                <p className="text-[11px] text-slate-400 font-semibold truncate">{bk.room?.name || '—'}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs font-bold text-slate-300">{dateStr}</p>
                              {timeStr && <p className="text-[10px] font-semibold text-slate-500">{timeStr}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Board 6 Overlay: ROOM BOOKING MODAL */}
      {bookingModalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">Raum buchen</h3>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mt-0.5">
                  {selectedRoom.name} - {bookingDay ? daysOfWeekLabels[bookingDay] : ''} um {bookingSlot}
                </p>
              </div>
              <button 
                onClick={() => setBookingModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">Art der Buchung</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBookingType('solo')}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold transition duration-200 ${
                      bookingType === 'solo'
                        ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Eigennutzung
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingType('lesson')}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold transition duration-200 ${
                      bookingType === 'lesson'
                        ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Unterricht
                  </button>
                </div>
              </div>

              {bookingType === 'lesson' && (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">Schüler auswählen</label>
                  <select
                    value={bookingStudentId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBookingStudentId(val);
                      const studentObj = students.find(s => s.id === val);
                      const insts = studentObj?.instrument ? studentObj.instrument.split(',').map((i: string) => i.trim()).filter(Boolean) : [];
                      if (insts.length > 0) {
                        setSelectedLessonInstrument(insts[0]);
                      } else {
                        setSelectedLessonInstrument('');
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="">-- Schüler wählen --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name ? s.last_name.charAt(0) + '.' : ''} ({s.instrument || 'Kein Instrument'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {bookingType === 'lesson' && bookingStudentId && (() => {
                const studentObj = students.find(s => s.id === bookingStudentId);
                const insts = studentObj?.instrument ? studentObj.instrument.split(',').map((i: string) => i.trim()).filter(Boolean) : [];
                if (insts.length > 1) {
                  return (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-400">Instrument für diese Stunde wählen</label>
                      <select
                        value={selectedLessonInstrument}
                        onChange={(e) => setSelectedLessonInstrument(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                      >
                        {insts.map((i: string) => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/20 flex gap-3">
              <button
                type="button"
                onClick={() => setBookingModalOpen(false)}
                className="flex-1 py-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold text-sm uppercase tracking-wider rounded-xl transition duration-150"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleBookRoomSubmit}
                disabled={bookingType === 'lesson' && !bookingStudentId}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800/40 disabled:text-slate-500 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl transition duration-150 shadow-lg shadow-emerald-500/20"
              >
                Buchen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Board 1 Overlay: MEISTERWERK DOCUMENTATION MODAL */}
      {docModalOpen && selectedStudentForDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">Schüler-Aufgabenheft</h3>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mt-0.5">
                  {selectedStudentForDoc.first_name} {selectedStudentForDoc.last_name ? selectedStudentForDoc.last_name.charAt(0) + '.' : ''}
                </p>
              </div>
              <button 
                onClick={() => setDocModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Form Input */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Thema / Song Titel:</label>
                  <input
                    type="text"
                    placeholder="z.B. Stairway to Heaven"
                    value={newDocTopic}
                    onChange={(e) => setNewDocTopic(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                {/* status selectors - 3 Kacheln Grid */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Fortschritts-Status:</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewDocStatus('IN_PROGRESS')}
                      className={`p-3.5 rounded-xl border text-center font-bold text-xs uppercase transition duration-150 ${
                        newDocStatus === 'IN_PROGRESS'
                          ? 'bg-slate-800 border-slate-400 text-white'
                          : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      In Arbeit
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDocStatus('THEORY_DONE')}
                      className={`p-3.5 rounded-xl border text-center font-bold text-xs uppercase transition duration-150 ${
                        newDocStatus === 'THEORY_DONE'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                          : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Theorie ✅
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDocStatus('MASTERED')}
                      className={`p-3.5 rounded-xl border text-center font-bold text-xs uppercase transition duration-150 ${
                        newDocStatus === 'MASTERED'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                          : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Meisterwerk 🏆
                    </button>
                  </div>
                </div>

                {/* Homework assigned toggle */}
                <div className="flex items-center justify-between border-t border-slate-850 pt-4">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-300">Als Hausaufgabe aufgeben</h4>
                    <p className="text-[10px] text-slate-500 font-semibold">Schüler sieht dies als aktuellen Focus im Briefing</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newDocHomework}
                    onChange={(e) => setNewDocHomework(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950 transition"
                  />
                </div>

                {/* Hausaufgaben-Schnellbaukasten Presets */}
                <div className="space-y-2 pt-2.5 border-t border-slate-850">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">⚡ Hausaufgaben-Schnellbaukasten:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const bpm = prompt("Geben Sie die BPM-Zahl ein:", "120");
                        const bpmText = bpm ? `${bpm} BPM` : "X BPM";
                        const text = `Achte diese Woche besonders darauf, das Metronom bei ${bpmText} zu halten.`;
                        setNewDocNotes(prev => prev ? `${prev}\n${text}` : text);
                        setNewDocHomework(true);
                      }}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-850/20 text-left text-xs font-semibold text-slate-300 hover:text-white transition duration-150 flex items-center gap-2"
                    >
                      <span className="text-sm">⏱️</span>
                      <div className="flex flex-col">
                        <span className="font-bold">Tempo halten</span>
                        <span className="text-[9px] text-slate-500 font-medium">Metronom BPM</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const text = "Achte auf eine präzise Ausführung und einen sauberen, klaren Klang.";
                        setNewDocNotes(prev => prev ? `${prev}\n${text}` : text);
                        setNewDocHomework(true);
                      }}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-850/20 text-left text-xs font-semibold text-slate-300 hover:text-white transition duration-150 flex items-center gap-2"
                    >
                      <span className="text-sm">✨</span>
                      <div className="flex flex-col">
                        <span className="font-bold">Sauber spielen</span>
                        <span className="text-[9px] text-slate-500 font-medium">Klarer Klang</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const text = "Achte auf ein stabiles Rhythmus-Metronom und spiele genau auf den Schlag.";
                        setNewDocNotes(prev => prev ? `${prev}\n${text}` : text);
                        setNewDocHomework(true);
                      }}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-850/20 text-left text-xs font-semibold text-slate-300 hover:text-white transition duration-150 flex items-center gap-2"
                    >
                      <span className="text-sm">🥁</span>
                      <div className="flex flex-col">
                        <span className="font-bold">Rhythmus-Metronom</span>
                        <span className="text-[9px] text-slate-500 font-medium">Timing & Takt</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const text = "Achte darauf, den vorgegebenen Fingersatz genau einzuhalten und zu üben.";
                        setNewDocNotes(prev => prev ? `${prev}\n${text}` : text);
                        setNewDocHomework(true);
                      }}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-850/20 text-left text-xs font-semibold text-slate-300 hover:text-white transition duration-150 flex items-center gap-2"
                    >
                      <span className="text-sm">🖖</span>
                      <div className="flex flex-col">
                        <span className="font-bold">Fingersatz üben</span>
                        <span className="text-[9px] text-slate-500 font-medium">Fingersatz einhalten</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 1-Klick-Feedback Schnelltasten */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">🚀 1-Klick-Feedback (Schnelltasten):</label>
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {[
                      { label: '🥁 Rhythmus sitzt', text: 'Der Rhythmus war heute super stabil und präzise!' },
                      { label: '🎵 Melodie gelernt', text: 'Melodie komplett auswendig gelernt, tolle Arbeit!' },
                      { label: '⚡ Konzentration top', text: 'Heute extrem konzentriert gearbeitet und super Fortschritte gemacht.' },
                      { label: '🌟 Hausaufgabe perfekt', text: 'Hausaufgabe fehlerfrei vorbereitet, weiter so!' },
                      { label: '🖐️ Handhaltung', text: 'Achte bei den nächsten Malen noch mehr auf eine entspannte Handhaltung.' }
                    ].map((tag, idx) => (
                       <button
                         key={idx}
                         type="button"
                         onClick={() => {
                           setNewDocNotes(prev => prev ? `${prev}\n${tag.text}` : tag.text);
                         }}
                         className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-[10px] font-bold text-slate-200 border border-slate-700/35 transition"
                       >
                         {tag.label}
                       </button>
                    ))}
                  </div>
                </div>

                {/* Free text notes */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Coach-Notiz (Freitext):</label>
                  <textarea
                    placeholder="Hausaufgaben details, Feedback..."
                    value={newDocNotes}
                    onChange={(e) => setNewDocNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveMeisterwerk}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition duration-150"
                >
                  Unzensiert im Backend speichern
                </button>
              </div>

              {/* History log */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Vergangene Meilensteine:</h4>
                <div className="space-y-2">
                  {docHistory.length === 0 ? (
                    <p className="text-xs font-semibold text-slate-500 text-center py-4">Noch kein Fortschritt dokumentiert.</p>
                  ) : (
                    docHistory.map(hist => (
                      <div key={hist.id} className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-white">{hist.topic_name}</p>
                          {hist.teacher_notes && <p className="text-[11px] text-slate-400 font-semibold">{hist.teacher_notes}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded ${
                            hist.status === 'MASTERED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : hist.status === 'THEORY_DONE'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {hist.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
