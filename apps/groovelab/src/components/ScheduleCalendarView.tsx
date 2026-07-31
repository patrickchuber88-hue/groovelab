import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle,
  CheckCircle,
  X,
  Send,
  Trash2,
  Palmtree,
  Users,
  Link2Off,
  Search,
  Copy,
  Clipboard,
  Download,
  Eye,
  EyeOff,
  Info,
  CheckCheck,
  ShieldCheck,
  RotateCcw,
  MoreVertical,
  ArrowLeftRight
} from 'lucide-react';
import { useRealNamesVisibility, maskLastName } from '../utils/nameHelper';
import { MeisterwerkDocumentationModal } from './MeisterwerkDocumentationModal';
interface ScheduleOccurrence {
  id: string;
  student_id: string | null;
  teacher_id: string;
  schedule_id?: string;
  date: string;
  start_time: string;
  duration: number;
  status: 'scheduled' | 'pending_reschedule' | 'rescheduled_confirmed' | 'cancelled' | 'teacher_sick' | 'canceled_by_teacher_sick';
  original_date?: string;
  original_start_time?: string;
  student_acknowledged?: boolean;
  vacant_student_id?: string;
  student?: {
    first_name: string;
    last_name: string;
    instrument: string;
    group_id?: string | null;
  };
  template_room_id?: string | null;
  room_override_id?: string | null;
  room_override_name?: string | null;
  schedules?: {
    room_id: string | null;
    room?: {
      name: string;
    } | null;
  } | null;
  isGroupBlock?: boolean;
  groupOccurrences?: any[];
  instrument?: string | null;
  notes?: string | null;
}

interface ScheduleCalendarViewProps {
  schoolId: string;
  userId: string;
  boards: any[];
  activeTab?: string;
  setActiveTab?: (tab: 'calendar' | 'designer') => void;
  teachers?: any[];
  selectedTeacherId?: string;
  setSelectedTeacherId?: (id: string) => void;
  currentUserRole?: string;
  hasSubmittedSchedule?: boolean;
  scheduleStatus?: 'none' | 'pending' | 'approved';
  onStartTour?: () => void;
}

export const timeToMinutes = (t: string) => {
  if (!t) return 0;
  const parts = t.split(':');
  const h = parseInt(parts[0]) || 0;
  const m = parseInt(parts[1]) || 0;
  return h * 60 + m;
};

export function ScheduleCalendarView({ 
  schoolId, 
  userId, 
  boards, 
  activeTab, 
  setActiveTab,
  teachers,
  selectedTeacherId,
  setSelectedTeacherId,
  currentUserRole,
  hasSubmittedSchedule = true,
  scheduleStatus = 'none',
  onStartTour
}: ScheduleCalendarViewProps) {
  const { visible: showRealNames, toggleVisibility: toggleRealNames } = useRealNamesVisibility();
  const [gridSnapMinutes, setGridSnapMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('groovelab_grid_snap_minutes');
    return saved ? Number(saved) : 15;
  }); // Default grid snap to 15 mins or saved preference
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'month'>('week');
  const [showMiniDatePicker, setShowMiniDatePicker] = useState(false);
  const [quickCreateState, setQuickCreateState] = useState<{ isOpen: boolean; date: string; start_time: string } | null>(null);
  const [eventPopoverState, setEventPopoverState] = useState<{ isOpen: boolean; occ: ScheduleOccurrence; anchorRect?: DOMRect } | null>(null);

  const toLocalYYYYMMDD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getSimulatedNow = (): Date => {
    const simStr = typeof window !== 'undefined' ? localStorage.getItem('groovelab_simulated_date') : null;
    if (!simStr) return new Date();
    
    const parts = simStr.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0])) return new Date();

    const baseSim = new Date(parts[0], parts[1] - 1, parts[2], 14, 0, 0);
    const simStartTime = Number(localStorage.getItem('groovelab_simulated_start_timestamp') || Date.now());
    const elapsedMinutes = Math.floor((Date.now() - simStartTime) / 60000);

    return new Date(baseSim.getTime() + elapsedMinutes * 60000);
  };

  const [currentDate, setCurrentDate] = useState(() => getSimulatedNow());
  const [showWeekend, setShowWeekend] = useState(false);
  const [focusedDayOffset, setFocusedDayOffset] = useState<number | null>(null);
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const d = getSimulatedNow();
    return d.getHours() * 60 + d.getMinutes();
  });

  const isCampus = localStorage.getItem('groovelab_active_platform') === 'campus';
  const isGroovelab = localStorage.getItem('groovelab_active_platform') === 'groovelab';
  const isAdminView = currentUserRole === 'admin' || currentUserRole === 'secretary';

  let brandColor = '#34a853'; // Campus Green
  let lightBg = 'rgba(52, 168, 83, 0.06)';
  let hoverBg = 'rgba(52, 168, 83, 0.12)';
  let textAccentColor = '#34a853';

  if (isAdminView) {
    brandColor = '#ea4335'; // Admin Red
    lightBg = 'rgba(234, 67, 53, 0.06)';
    hoverBg = 'rgba(234, 67, 53, 0.12)';
    textAccentColor = '#ea4335';
  } else if (isGroovelab) {
    brandColor = '#eab308'; // GrooveLab Yellow
    lightBg = 'rgba(234, 179, 8, 0.06)';
    hoverBg = 'rgba(234, 179, 8, 0.12)';
    textAccentColor = '#ca8a04'; // Dark yellow text
  }

  useEffect(() => {
    const syncSimulatedTime = () => {
      const simNow = getSimulatedNow();
      setCurrentMinutes(simNow.getHours() * 60 + simNow.getMinutes());
    };

    syncSimulatedTime();
    const interval = setInterval(syncSimulatedTime, 10000);
    window.addEventListener('storage', syncSimulatedTime);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', syncSimulatedTime);
    };
  }, []);

  interface CustomDialogConfig {
    type: 'confirm' | 'alert';
    message: string;
    resolve: (value: boolean) => void;
    confirmLabel?: string;
    cancelLabel?: string;
  }
  const [dialogConfig, setDialogConfig] = useState<CustomDialogConfig | null>(null);

  const showConfirm = (message: string, confirmLabel = 'Ja', cancelLabel = 'Nein'): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogConfig({
        type: 'confirm',
        message,
        resolve,
        confirmLabel,
        cancelLabel
      });
    });
  };

  const showAlert = (message: string): Promise<void> => {
    return new Promise((resolve) => {
      setDialogConfig({
        type: 'alert',
        message,
        resolve: () => resolve(),
        confirmLabel: 'OK'
      });
    });
  };



  // School year: September 1 – July 31 of the following year (August excluded)
  const now = new Date();
  const schoolStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const schoolYearStart = new Date(schoolStartYear, 8, 1);  // Sept 1
  const schoolYearEnd   = new Date(schoolStartYear + 2, 6, 31); // July 31 of next school year
  const [baseOccurrences, setBaseOccurrences] = useState<ScheduleOccurrence[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Record<string, ScheduleOccurrence>>({});
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const grabOffsetRef = useRef<number>(0);
  const lastSnapMinutesRef = useRef<{ dateStr: string; minutes: number } | null>(null);
  const draggedOccRef = useRef<ScheduleOccurrence | null>(null);
  const [cachedWeekSchedules, setCachedWeekSchedules] = useState<any[]>([]);
  const [cachedWeekEvents, setCachedWeekEvents] = useState<any[]>([]);
  const [cachedWeekRoomBookings, setCachedWeekRoomBookings] = useState<any[]>([]);
  const [cachedWeekOccurrences, setCachedWeekOccurrences] = useState<any[]>([]);
  const scrollIntervalRef = useRef<any>(null);
  const teacherScheduleLimitsRef = useRef<Record<number, { min: number; max: number }>>({});
  const autoScrollSpeedRef = useRef<number>(0);
  const autoScrollContainerRef = useRef<HTMLElement | null>(null);
  const [editOccState, setEditOccState] = useState<{ id: string, date: string, start_time: string, room_id: string | null, duration?: number } | null>(null);
  
  // Integrated Lesson Record states
  const [activeModalTab, setActiveModalTab] = useState<'protocol' | 'details'>('protocol');
  const [lessonAttendance, setLessonAttendance] = useState<'attended' | 'excused' | 'unexcused' | 'none'>('none');
  const [lessonTopic, setLessonTopic] = useState<string>('');
  const [lessonHomework, setLessonHomework] = useState<string>('');
  const [isHomeworkSyncActive, setIsHomeworkSyncActive] = useState<boolean>(true);
  const [isLoadingProtocol, setIsLoadingProtocol] = useState<boolean>(false);
  const [studentProgressHistory, setStudentProgressHistory] = useState<any[]>([]);
  const [studentActiveSongs, setStudentActiveSongs] = useState<any[]>([]);
  const [docStudent, setDocStudent] = useState<any | null>(null);

  const [freeRooms, setFreeRooms] = useState<any[]>([]);
  const [loadingFreeRooms, setLoadingFreeRooms] = useState(false);
  const [roomDropdownOpen, setRoomDropdownOpen] = useState(false);
  const [isGroupModeActive, setIsGroupModeActive] = useState(false);
  const [selectedForGroup, setSelectedForGroup] = useState<string[]>([]);
  const [selectedRoomIdForXRay, setSelectedRoomIdForXRay] = useState<string | null>(null);
  const [selectedStudentPrefs, setSelectedStudentPrefs] = useState<any[]>([]);

  const [localEndTime, setLocalEndTime] = useState<string>('');
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    text: string;
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);

  // Toast confirmation with undo action state
  const [actionToast, setActionToast] = useState<{
    id: string;
    message: string;
    undoFn?: () => void;
  } | null>(null);
  const toastTimeoutRef = useRef<any>(null);
  const [showMoreHeaderMenu, setShowMoreHeaderMenu] = useState<boolean>(false);

  const showActionToast = (message: string, undoFn?: () => void) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setActionToast({
      id: String(Date.now()),
      message,
      undoFn
    });
    toastTimeoutRef.current = setTimeout(() => {
      setActionToast(null);
    }, 7000);
  };


  useEffect(() => {
    if (editOccState) {
      const timeToMinutesLocal = (t: string): number => {
        const parts = t.split(':');
        const h = parseInt(parts[0] || '0', 10);
        const m = parseInt(parts[1] || '0', 10);
        return h * 60 + m;
      };
      const minutesToTimeLocal = (m: number): string => {
        const h = Math.floor(m / 60) % 24;
        const mins = m % 60;
        return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      };
      const startMin = timeToMinutesLocal(editOccState.start_time);
      const endMin = startMin + (editOccState.duration || 30);
      setLocalEndTime(minutesToTimeLocal(endMin));
    } else {
      setLocalEndTime('');
    }
  }, [editOccState?.start_time, editOccState?.duration]);

  const [calendarUrl, setCalendarUrl] = useState<string>('');
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
      console.error('Error loading holidays:', err);
    }
  };

  useEffect(() => {
    const fetchSchoolCalendarSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('calendar_url')
          .eq('id', schoolId)
          .single();
        
        if (error) throw error;
        if (data?.calendar_url) {
          setCalendarUrl(data.calendar_url);
          loadHolidays(data.calendar_url);
        }
      } catch (err) {
        console.error('Error fetching calendar settings in ScheduleCalendarView:', err);
      }
    };
    fetchSchoolCalendarSettings();
  }, [schoolId]);
  
  // State for cancelled swap confirmation flow
  const [swapConfirmState, setSwapConfirmState] = useState<{
    sourceId: string;
    targetId: string;
    sourceStudentName: string;
    targetStudentName: string;
    sourceDate: string;
    sourceStartTime: string;
    targetDate: string;
    targetStartTime: string;
  } | null>(null);

  const [dropDecisionState, setDropDecisionState] = useState<{
    sourceId: string;
    targetId: string;
  } | null>(null);

  const [sickUntil, setSickUntil] = useState<string | null>(null);
  const [sickStart, setSickStart] = useState<string | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    const fetchRooms = async () => {
      const { data } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('school_id', schoolId);
      if (data) {
        setRooms(data);
      }
    };
    fetchRooms();
  }, [schoolId]);

  const occurrences: ScheduleOccurrence[] = useMemo(() => {
    const merged: ScheduleOccurrence[] = [];
    baseOccurrences.forEach(o => {
      const change = pendingChanges[o.id];
      if (change) {
        merged.push(change);
        
        const isRealStudent = o.student_id && o.student_id !== 'vacant';
        const changeStartTime = change.start_time || '';
        const oStartTime = o.start_time || '';
        const hasMoved = change.date !== o.date || changeStartTime.substring(0, 5) !== oStartTime.substring(0, 5);
        
        const isSlotReoccupied = Object.values(pendingChanges).some(ch => 
          ch.id !== o.id && 
          ch.student_id && 
          ch.student_id !== 'vacant' &&
          ch.date === o.date && 
          (ch.start_time || '').substring(0, 5) === oStartTime.substring(0, 5)
        );

        if (isRealStudent && hasMoved && !isSlotReoccupied) {
          merged.push({
            id: `vacant-temp-${o.id}`,
            student_id: 'vacant',
            vacant_student_id: o.student_id || undefined,
            teacher_id: o.teacher_id,
            date: o.date,
            start_time: o.start_time,
            duration: o.duration,
            status: 'scheduled',
            student: {
              first_name: '❇️ Freier Slot',
              last_name: `(zuvor: ${o.student?.first_name || ''})`,
              instrument: o.student?.instrument || ''
            },
            schedules: o.schedules
          });
        }
      } else {
        merged.push(o);
      }
    });
    return merged;
  }, [baseOccurrences, pendingChanges]);

  useEffect(() => {
    setRoomDropdownOpen(false);
    if (!editOccState) {
      setFreeRooms([]);
      return;
    }
    const occ = occurrences.find(o => o.id === editOccState.id);
    const duration = occ?.duration || 45;

    const fetchFreeRooms = () => {
      setLoadingFreeRooms(true);
      try {
        const date = editOccState.date;
        const startTime = editOccState.start_time;
        if (!date || !startTime) return;

        const formattedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
        const startMins = timeToMinutes(formattedStartTime);
        const endMins = startMins + duration;
        
        const eh = Math.floor(endMins / 60);
        const em = endMins % 60;
        const formattedEndTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`;

        const [yyyy, mm, dd] = date.split('-').map(Number);
        const d = new Date(Date.UTC(yyyy, mm - 1, dd));
        const rawDay = d.getUTCDay();
        const dayOfWeek = rawDay === 0 ? 7 : rawDay;

        const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
          const aS = aStart.substring(0, 5);
          const aE = aEnd.substring(0, 5);
          const bS = bStart.substring(0, 5);
          const bE = bEnd.substring(0, 5);
          return aS < bE && aE > bS;
        };

        const bookedRoomIds = new Set<string>();

        cachedWeekSchedules.forEach((s: any) => {
          if (s.day_of_week !== dayOfWeek) return;
          const sStart = (s.time_slot || '00:00').substring(0, 5);
          const durMins = s.duration || 45;
          const [sh, sm] = sStart.split(':').map(Number);
          const sEndMins = sh * 60 + sm + durMins;
          const sEnd = `${String(Math.floor(sEndMins / 60)).padStart(2, '0')}:${String(sEndMins % 60).padStart(2, '0')}`;
          
          if (s.room_id) {
            if (overlaps(sStart, sEnd, formattedStartTime, formattedEndTime)) {
              bookedRoomIds.add(s.room_id);
            }
          }
        });

        cachedWeekEvents.forEach((ev: any) => {
          if (ev.event_date !== date) return;
          const evStart = (ev.start_time || '00:00').substring(0, 5);
          const evEnd = ev.end_time ? ev.end_time.substring(0, 5) : (() => {
            const [h, m] = evStart.split(':').map(Number);
            const em = h * 60 + m + 60;
            return `${String(Math.floor(em / 60)).padStart(2, '0')}:${String(em % 60).padStart(2, '0')}`;
          })();
          if (ev.room_id) {
            if (overlaps(evStart, evEnd, formattedStartTime, formattedEndTime)) {
              bookedRoomIds.add(ev.room_id);
            }
          }
        });

        cachedWeekRoomBookings.forEach((rb: any) => {
          if (rb.date !== date) return;
          const isCurrentOwnBooking = rb.booked_by === userId && 
            rb.date === occ?.date && 
            rb.start_time.substring(0, 5) === occ?.start_time.substring(0, 5);

          if (isCurrentOwnBooking) {
            return;
          }

          const rbStart = (rb.start_time || '00:00').substring(0, 5);
          const rbEnd = rb.end_time ? rb.end_time.substring(0, 5) : (() => {
            const [h, m] = rbStart.split(':').map(Number);
            const em = h * 60 + m + duration;
            return `${String(Math.floor(em / 60)).padStart(2, '0')}:${String(em % 60).padStart(2, '0')}`;
          })();
          if (rb.room_id) {
            if (overlaps(rbStart, rbEnd, formattedStartTime, formattedEndTime)) {
              bookedRoomIds.add(rb.room_id);
            }
          }
        });

        const currentRoomId = occ?.schedules?.room_id || null;
        const selectedRoomId = editOccState.room_id || null;
        const filtered = rooms.filter(r => !bookedRoomIds.has(r.id) || r.id === currentRoomId || r.id === selectedRoomId);
        setFreeRooms(filtered);
      } catch (err) {
        console.error("Error calculating free rooms:", err);
      } finally {
        setLoadingFreeRooms(false);
      }
    };

    fetchFreeRooms();
  }, [editOccState?.date, editOccState?.start_time, editOccState?.id, schoolId, rooms, occurrences, userId]);

  // Direct Chat states inside appointment modal
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatTypedMessage, setChatTypedMessage] = useState('');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatViewportRef = useRef<HTMLDivElement>(null);

  const scrollChatToBottom = (smooth = true) => {
    if (chatViewportRef.current) {
      chatViewportRef.current.scrollTo({
        top: chatViewportRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  const fetchChat = async (studentId: string, occurrenceId?: string) => {
    if (!userId || !studentId) return;
    
    let query = supabase
      .from('campus_direct_messages')
      .select('*');
      
    if (occurrenceId) {
      const occ = occurrences.find(o => o.id === occurrenceId);
      const isGroupOcc = occ && (occ.isGroupBlock || occurrences.some(o => 
        o.id !== occ.id && 
        o.student_id && 
        o.student_id !== 'vacant' &&
        o.date === occ.date && 
        o.start_time === occ.start_time && 
        (o.schedules?.room_id || null) === (occ.schedules?.room_id || null)
      ));
      
      if (isGroupOcc && occ) {
        const groupOccIds = occurrences.filter(o => 
          o.student_id && 
          o.student_id !== 'vacant' &&
          o.date === occ.date && 
          o.start_time === occ.start_time && 
          (o.schedules?.room_id || null) === (occ.schedules?.room_id || null)
        ).map(o => o.id);
        
        query = query.in('occurrence_id', groupOccIds);
      } else {
        query = query.eq('occurrence_id', occurrenceId);
      }
    } else {
      query = query.or(`and(sender_id.eq.${userId},recipient_id.eq.${studentId}),and(sender_id.eq.${studentId},recipient_id.eq.${userId})`);
    }
    
    const { data } = await query.order('created_at', { ascending: true });
    if (data) {
      setChatMessages(data);
      setTimeout(() => scrollChatToBottom(true), 60);
    }
  };

  useEffect(() => {
    if (!editOccState) {
      setChatMessages([]);
      return;
    }
    const occ = occurrences.find(o => o.id === editOccState.id);
    if (!occ || !occ.student_id || occ.student_id === 'vacant') return;

    fetchChat(occ.student_id || '', editOccState.id);

    const channel = supabase
      .channel(`chat_occ_${editOccState.id}`)
      .on('postgres_changes', { schema: 'public', event: '*', table: 'campus_direct_messages' }, () => {
        fetchChat(occ.student_id || '', editOccState.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [editOccState, userId, occurrences]);

  const loadStudentHomework = async (studentId: string, fallbackInstrument?: string) => {
    if (!studentId || studentId === 'vacant') {
      setLessonTopic('');
      setLessonHomework('');
      setStudentProgressHistory([]);
      setStudentActiveSongs([]);
      return;
    }
    setIsLoadingProtocol(true);
    try {
      // Query progress history
      const { data: progressData, error: progressErr } = await supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', studentId)
        .order('updated_at', { ascending: false });

      if (progressErr) throw progressErr;
      setStudentProgressHistory(progressData || []);

      // Load active song skills
      const { data: songsData, error: songsErr } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', studentId);

      if (songsErr) throw songsErr;
      setStudentActiveSongs(songsData || []);

      // Prepopulate topic & homework with latest item
      if (progressData && progressData.length > 0) {
        setLessonTopic(progressData[0].topic_name || '');
        setLessonHomework(progressData[0].teacher_notes || progressData[0].homework_notes || '');
      } else {
        setLessonTopic(fallbackInstrument || '');
        setLessonHomework('');
      }
    } catch (err) {
      console.warn('Error loading student homework history:', err);
    } finally {
      setIsLoadingProtocol(false);
    }
  };

  useEffect(() => {
    if (!editOccState) {
      setLessonTopic('');
      setLessonHomework('');
      setLessonAttendance('none');
      setActiveModalTab('protocol');
      setIsHomeworkSyncActive(true);
      setStudentProgressHistory([]);
      setStudentActiveSongs([]);
      return;
    }

    const occ = occurrences.find(o => o.id === editOccState.id);
    if (!occ) return;

    // 1. Determine active tab based on date (future -> details, past/today -> protocol)
    const occurrenceDate = new Date(editOccState.date);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const isFuture = occurrenceDate.getTime() > todayDate.getTime();
    setActiveModalTab(isFuture ? 'details' : 'protocol');

    // 2. Parse attendance status from occurrence status & notes
    if (occ.status === 'cancelled') {
      const cleanNotes = occ.notes || '';
      if (cleanNotes.startsWith('[Entschuldigt]')) {
        setLessonAttendance('excused');
      } else if (cleanNotes.startsWith('[Unentschuldigt]')) {
        setLessonAttendance('unexcused');
      } else {
        setLessonAttendance('none');
      }
    } else if (occ.status === 'scheduled' || occ.status === 'rescheduled_confirmed') {
      setLessonAttendance('attended');
    } else {
      setLessonAttendance('none');
    }

    // 3. Load latest homework/topic from progress_matrix for this student
    if (!occ.student_id || occ.student_id === 'vacant') {
      setLessonTopic('');
      setLessonHomework('');
      setStudentProgressHistory([]);
      setStudentActiveSongs([]);
      return;
    }

    loadStudentHomework(occ.student_id, occ.student?.instrument);
  }, [editOccState, userId, occurrences]);

  const handleSendChatMessage = async (e: React.FormEvent, studentId: string, occ: any) => {
    e.preventDefault();
    if (!chatTypedMessage.trim()) return;

    // Freeze Check
    try {
      const timePart = occ.start_time.includes(':') ? occ.start_time : `${occ.start_time}:00`;
      const lessonDateTime = new Date(`${occ.date}T${timePart}`);
      if (Date.now() > lessonDateTime.getTime() + 48 * 60 * 60 * 1000) {
        await showAlert('Dieser Chat ist eingefroren (48 Stunden nach dem Termin) und kann nicht mehr bearbeitet werden.');
        return;
      }
    } catch (err) {
      console.warn(err);
    }

    const typedMsg = chatTypedMessage.trim();
    const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const d = new Date(occ.date);
    const dayLabel = DAYS_DE[d.getDay()] || 'Termin';
    const timeLabel = occ.start_time.substring(0, 5);
    const prefix = `[Termin ${dayLabel} ${timeLabel} Uhr] `;
    const messageContent = `${prefix}${typedMsg}`;

    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        sender_id: userId,
        recipient_id: studentId,
        content: messageContent,
        occurrence_id: occ.id,
        created_at: new Date().toISOString(),
        is_read: false
      };
      setChatMessages(prev => [...prev, optimisticMessage]);
      setChatTypedMessage('');
      setTimeout(() => scrollChatToBottom(true), 50);

      const isGroupOcc = occ && (occ.isGroupBlock || occurrences.some(o => 
        o.id !== occ.id && 
        o.student_id && 
        o.student_id !== 'vacant' &&
        o.date === occ.date && 
        o.start_time === occ.start_time && 
        (o.schedules?.room_id || null) === (occ.schedules?.room_id || null)
      ));

      if (isGroupOcc) {
        const groupOccs = occurrences.filter(o => 
          o.student_id && 
          o.student_id !== 'vacant' &&
          o.date === occ.date && 
          o.start_time === occ.start_time && 
          (o.schedules?.room_id || null) === (occ.schedules?.room_id || null)
        );
        const insertPromises = groupOccs.map(go => {
          if (!go.student_id || go.student_id === 'vacant') return Promise.resolve();
          return supabase.from('campus_direct_messages').insert({
            sender_id: userId,
            recipient_id: go.student_id,
            content: messageContent,
            occurrence_id: go.id
          });
        });
        await Promise.all(insertPromises);
      } else {
        const { error } = await supabase.from('campus_direct_messages').insert({
          sender_id: userId,
          recipient_id: studentId,
          content: messageContent,
          occurrence_id: occ.id
        });
        if (error) throw error;
      }
      
      await fetchChat(studentId, occ.id);
    } catch (err) {
      console.error('Error sending quick chat message:', err);
    }
  };
  const getRoomConflict = (
    occId: string,
    targetDate: string,
    targetStartTime: string,
    duration: number,
    roomId: string | null,
    excludeTargetId?: string
  ): string | null => {
    if (!roomId) return null;

    const parseTimeToMinutes = (t: string): number => {
      const parts = t.split(':').map(Number);
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    };

    const targetStart = parseTimeToMinutes(targetStartTime);
    const targetEnd = targetStart + duration;

    const formattedTargetStart = targetStartTime.substring(0, 5);
    const formattedTargetEnd = (() => {
      const h = Math.floor(targetEnd / 60) % 24;
      const m = targetEnd % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    })();

    // Helper: check time overlap
    const overlaps = (aS: string, aE: string, bS: string, bE: string) => {
      return aS < bE && aE > bS;
    };

    // 1. Check cached recurring schedules
    const [yyyy, mm, dd] = targetDate.split('-').map(Number);
    const d = new Date(Date.UTC(yyyy, mm - 1, dd));
    const rawDay = d.getUTCDay();
    const dayOfWeek = rawDay === 0 ? 7 : rawDay;

    const schedConflict = cachedWeekSchedules.find(s => {
      if (s.room_id !== roomId) return false;
      if (s.day_of_week !== dayOfWeek) return false;
      if (s.teacher_id === userId) return false;
      
      const sStart = (s.time_slot || '00:00').substring(0, 5);
      const sEnd = (() => {
        const [sh, sm] = sStart.split(':').map(Number);
        const sEndMins = sh * 60 + sm + (s.duration || 45);
        return `${String(Math.floor(sEndMins / 60)).padStart(2, '0')}:${String(sEndMins % 60).padStart(2, '0')}`;
      })();
      return overlaps(sStart, sEnd, formattedTargetStart, formattedTargetEnd);
    });

    if (schedConflict) {
      const teacherName = schedConflict.teacher ? `${schedConflict.teacher.first_name || ''} ${schedConflict.teacher.last_name || ''}`.trim() : 'Anderer Lehrer';
      return `${teacherName} (Dauertermin: ${schedConflict.time_slot.substring(0, 5)} - ${schedConflict.duration} min)`;
    }

    // 2. Check cached events
    const evConflict = cachedWeekEvents.find(ev => {
      if (ev.room_id !== roomId) return false;
      if (ev.event_date !== targetDate) return false;

      const evStart = (ev.start_time || '00:00').substring(0, 5);
      const evEnd = ev.end_time ? ev.end_time.substring(0, 5) : (() => {
        const [h, m] = evStart.split(':').map(Number);
        return `${String(Math.floor((h * 60 + m + 60) / 60)).padStart(2, '0')}:${String((h * 60 + m + 60) % 60).padStart(2, '0')}`;
      })();
      return overlaps(evStart, evEnd, formattedTargetStart, formattedTargetEnd);
    });

    if (evConflict) {
      return `Event: "${evConflict.title || 'Veranstaltung'}" (${evConflict.start_time.substring(0, 5)})`;
    }

    // 3. Check cached room bookings
    const rbConflict = cachedWeekRoomBookings.find(rb => {
      if (rb.room_id !== roomId) return false;
      if (rb.date !== targetDate) return false;
      if (rb.booked_by === userId) return false;

      const rbStart = (rb.start_time || '00:00').substring(0, 5);
      const rbEnd = rb.end_time ? rb.end_time.substring(0, 5) : (() => {
        const [h, m] = rbStart.split(':').map(Number);
        return `${String(Math.floor((h * 60 + m + duration) / 60)).padStart(2, '0')}:${String((h * 60 + m + duration) % 60).padStart(2, '0')}`;
      })();
      return overlaps(rbStart, rbEnd, formattedTargetStart, formattedTargetEnd);
    });

    if (rbConflict) {
      const userName = rbConflict.user ? `${rbConflict.user.first_name || ''} ${rbConflict.user.last_name || ''}`.trim() : 'Kollege';
      return `${userName} (Buchung: ${rbConflict.start_time.substring(0, 5)})`;
    }

    return null;
  };

  // Helper für Mutations mit Rückgängig-Toast
  const updateOccurrence = (id: string, updates: Partial<ScheduleOccurrence>, customActionMessage?: string) => {
    if (id.startsWith('vacant-')) return;
    const baseOcc = baseOccurrences.find(o => o.id === id);
    const existingInPending = pendingChanges[id];
    const currentOcc = existingInPending || baseOcc;
    if (!currentOcc) return;

    const hadPendingBefore = id in pendingChanges;

    setPendingChanges(prev => {
      const existing = prev[id] || baseOcc;
      if (!existing) return prev;
      
      const newOcc = { ...existing, ...updates };
      if (baseOcc && !newOcc.original_date) {
        newOcc.original_date = baseOcc.date;
      }
      if (baseOcc && !newOcc.original_start_time) {
        newOcc.original_start_time = baseOcc.start_time;
      }
      return { ...prev, [id]: newOcc };
    });

    const rawFirstName = currentOcc.student?.first_name || '';
    const rawLastName = currentOcc.student?.last_name || '';
    const displayStudent = currentOcc.student 
      ? `${rawFirstName} ${showRealNames ? rawLastName : maskLastName(rawLastName)}`.trim() 
      : 'Termin';
    const timeDisplay = updates.start_time ? ` (auf ${updates.start_time.substring(0, 5)} Uhr)` : '';
    const message = customActionMessage || `✨ Termin für ${displayStudent}${timeDisplay} angepasst`;

    showActionToast(message, () => {
      setPendingChanges(prev => {
        const next = { ...prev };
        if (hadPendingBefore && existingInPending) {
          next[id] = existingInPending;
        } else {
          delete next[id];
        }
        return next;
      });
    });
  };

  const updateMultipleOccurrences = (updatesMap: Record<string, Partial<ScheduleOccurrence>>, customActionMessage?: string) => {
    const previousStateSnapshot: Record<string, ScheduleOccurrence | undefined> = {};
    const existedInPendingMap: Record<string, boolean> = {};

    Object.keys(updatesMap).forEach(id => {
      if (id.startsWith('vacant-')) return;
      existedInPendingMap[id] = id in pendingChanges;
      previousStateSnapshot[id] = pendingChanges[id];
    });

    setPendingChanges(prev => {
      const next = { ...prev };
      Object.keys(updatesMap).forEach(id => {
        if (id.startsWith('vacant-')) return;
        const baseOcc = baseOccurrences.find(o => o.id === id);
        const existing = next[id] || baseOcc;
        if (!existing) return;
        
        const newOcc = { ...existing, ...updatesMap[id] };
        if (baseOcc && !newOcc.original_date) {
          newOcc.original_date = baseOcc.date;
        }
        if (baseOcc && !newOcc.original_start_time) {
          newOcc.original_start_time = baseOcc.start_time;
        }
        next[id] = newOcc;
      });
      return next;
    });

    const count = Object.keys(updatesMap).length;
    const message = customActionMessage || `✨ ${count} ${count === 1 ? 'Termin' : 'Termine'} angepasst`;

    showActionToast(message, () => {
      setPendingChanges(prev => {
        const next = { ...prev };
        Object.keys(updatesMap).forEach(id => {
          if (existedInPendingMap[id]) {
            if (previousStateSnapshot[id]) {
              next[id] = previousStateSnapshot[id]!;
            }
          } else {
            delete next[id];
          }
        });
        return next;
      });
    });
  };

  const moveOccurrenceOrGroup = (id: string, updates: Partial<ScheduleOccurrence>) => {
    const occ = occurrences.find(o => o.id === id);
    if (!occ) return;

    const isGroupOcc = occurrences.some(o => 
      o.id !== id && 
      o.student_id && 
      o.student_id !== 'vacant' &&
      o.date === occ.date && 
      o.start_time === occ.start_time && 
      (o.schedules?.room_id || null) === (occ.schedules?.room_id || null)
    );

    const groupOccs = isGroupOcc ? occurrences.filter(o => 
      o.student_id && 
      o.student_id !== 'vacant' &&
      o.date === occ.date && 
      o.start_time === occ.start_time && 
      (o.schedules?.room_id || null) === (occ.schedules?.room_id || null)
    ) : [occ];

    const updatesMap: Record<string, Partial<ScheduleOccurrence>> = {};
    groupOccs.forEach(o => {
      updatesMap[o.id] = updates;
    });
    updateMultipleOccurrences(updatesMap);
  };

  const moveOccurrenceOrGroupDirectly = async (id: string, updates: Partial<ScheduleOccurrence>) => {
    const occ = occurrences.find(o => o.id === id);
    if (!occ) return;

    const isGroupOcc = occurrences.some(o => 
      o.id !== id && 
      o.student_id && 
      o.student_id !== 'vacant' &&
      o.date === occ.date && 
      o.start_time === occ.start_time && 
      (o.schedules?.room_id || null) === (occ.schedules?.room_id || null)
    );

    const groupOccs = isGroupOcc ? occurrences.filter(o => 
      o.student_id && 
      o.student_id !== 'vacant' &&
      o.date === occ.date && 
      o.start_time === occ.start_time && 
      (o.schedules?.room_id || null) === (occ.schedules?.room_id || null)
    ) : [occ];

    const updatesMap: Record<string, Partial<ScheduleOccurrence>> = {};
    groupOccs.forEach(o => {
      updatesMap[o.id] = updates;
    });
    await persistMultipleOccurrencesDirectly(updatesMap);
  };

  const handleMergeSelectedOccurrences = async () => {
    if (selectedForGroup.length < 2) return;
    
    // Find the target occurrence based on user selection order (first clicked)
    const targetOccId = selectedForGroup[0];
    const targetOcc = occurrences.find(o => o.id === targetOccId);
    if (!targetOcc) return;

    const targetRoomId = targetOcc.schedules?.room_id || null;

    const updatesMap: Record<string, Partial<ScheduleOccurrence>> = {};
    
    // Filter out the target occurrence from the other merged occurrences
    const otherOccs = occurrences.filter(o => selectedForGroup.includes(o.id) && o.id !== targetOccId);

    otherOccs.forEach(occ => {
      const updatedSchedules = occ.schedules ? {
        ...occ.schedules,
        room_id: targetRoomId,
        room: { name: rooms.find(r => r.id === targetRoomId)?.name || '' }
      } : {
        room_id: targetRoomId,
        room: { name: rooms.find(r => r.id === targetRoomId)?.name || '' }
      };

      updatesMap[occ.id] = {
        date: targetOcc.date,
        start_time: targetOcc.start_time,
        status: 'pending_reschedule',
        schedules: updatedSchedules,
        duration: targetOcc.duration
      };
    });

    await persistMultipleOccurrencesDirectly(updatesMap);

    setSelectedForGroup([]);
    setIsGroupModeActive(false);
  };

  const persistChangesDirectly = async (changesToSave: ScheduleOccurrence[]) => {
    setLoading(true);
    try {
      const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
      const processedBookings = new Set<string>();

      for (const change of changesToSave) {
        const originalOcc = baseOccurrences.find(o => o.id === change.id);

        if (change.id.startsWith('mock-')) {
          if ((!change.student_id || change.student_id === 'vacant' || change.student_id.startsWith('vacant-') || change.student_id.startsWith('break-')) && change.status !== 'cancelled') {
            continue;
          }
          const { id, student, original_start_time, schedules, template_room_id, room_override_id, room_override_name, vacant_student_id, isGroupBlock, groupOccurrences, student_acknowledged, schedule_id, ...insertData } = change as any;
          
          const origDateStr = change.original_date || (originalOcc ? (originalOcc.original_date || originalOcc.date) : change.date);
          
          insertData.original_date = origDateStr;
          insertData.teacher_id = insertData.teacher_id || userId;
          insertData.status = change.status || 'pending_reschedule';
          
          if (isGroupBlock && groupOccurrences && groupOccurrences.length > 0) {
            const groupInserts = groupOccurrences
              .filter((gs: any) => gs.id && gs.id.length > 10 && !gs.id.startsWith('break-') && !gs.id.startsWith('vacant-'))
              .map((gs: any) => ({
                ...insertData,
                student_id: gs.id,
                duration: gs.duration || insertData.duration
              }));
            
            if (groupInserts.length > 0) {
              const { error } = await supabase.from('schedule_occurrences').insert(groupInserts);
              if (error) throw error;
            }
          } else {
            if (!insertData.student_id || insertData.student_id.startsWith('break-') || insertData.student_id.startsWith('vacant-') || insertData.student_id === 'vacant') {
              continue;
            }
            const { error } = await supabase.from('schedule_occurrences').insert(insertData);
            if (error) throw error;
          }
        } else {
          const origDateStr = change.original_date || (originalOcc ? (originalOcc.original_date || originalOcc.date) : change.date);
          const targetStudentId = (change.student_id !== undefined && change.student_id !== null)
            ? change.student_id
            : (originalOcc ? originalOcc.student_id : null);
          const targetDuration = change.duration || originalOcc?.duration || 30;
          
          const targetRoomOverride = change.room_override_id !== undefined 
            ? change.room_override_id 
            : (originalOcc ? originalOcc.room_override_id : null);
          
          const { error } = await supabase.from('schedule_occurrences')
            .update({
              date: change.date,
              start_time: change.start_time,
              status: change.status || 'pending_reschedule',
              original_date: origDateStr,
              student_id: targetStudentId,
              duration: targetDuration,
              room_override_id: targetRoomOverride
            })
            .eq('id', change.id);
          
          if (error) throw error;
        }

        // Sync room booking
        try {
          const oldDate = originalOcc?.date || change.date;
          const oldStartTime = originalOcc?.start_time || change.start_time;

          const oldBookingKey = `${userId}_${oldDate}_${oldStartTime.substring(0, 5)}`;
          if (!processedBookings.has(`del_${oldBookingKey}`)) {
            processedBookings.add(`del_${oldBookingKey}`);
            await supabase.from('room_bookings')
              .delete()
              .eq('booked_by', userId)
              .eq('date', oldDate)
              .eq('start_time', oldStartTime);
          }

          const origDateStr = change.original_date || (originalOcc ? originalOcc.date : change.date);
          const origTimeStr = change.original_start_time || (originalOcc ? originalOcc.start_time : change.start_time);
          const originalRoomId = originalOcc?.template_room_id !== undefined 
            ? originalOcc.template_room_id 
            : (originalOcc?.schedules?.room_id || null);
          const currentRoomId = change.schedules?.room_id || null;

           const timeChanged = change.date !== origDateStr || change.start_time.substring(0, 5) !== origTimeStr.substring(0, 5);
          const roomChanged = originalRoomId !== currentRoomId;
          const isCancelled = ['cancelled', 'canceled_by_student'].includes(change.status);

          // Compute regular teaching range for this teacher in this room on target date's weekday
          const targetDate = new Date(change.date + 'T00:00:00');
          const targetDayOfWeek = targetDate.getDay() || 7; // 1=Mon … 7=Sun
          let regMin = Infinity;
          let regMax = -Infinity;
          (cachedWeekSchedules || []).forEach((s: any) => {
            if (s.day_of_week !== targetDayOfWeek) return;
            if (s.teacher_id !== userId) return;
            if (s.room_id !== currentRoomId) return; // Must be in the same room
            const sStart = timeToMinutes(s.time_slot);
            const sEnd = sStart + (s.duration || 45);
            if (sStart < regMin) regMin = sStart;
            if (sEnd > regMax) regMax = sEnd;
          });

          const occStartMinutes = timeToMinutes(change.start_time);
          const occEndMinutes = occStartMinutes + (change.duration || 45);
          const isInsideOwnRegularBlock = regMin !== Infinity && occStartMinutes >= regMin && occEndMinutes <= regMax;

          const needsRoomBooking = !isCancelled && currentRoomId && (timeChanged || roomChanged) && !isInsideOwnRegularBlock;

          const newBookingKey = `${currentRoomId}_${change.date}_${change.start_time.substring(0, 5)}`;
          if (needsRoomBooking && !processedBookings.has(`ins_${newBookingKey}`)) {
            processedBookings.add(`ins_${newBookingKey}`);
            const startMins = timeToMinutes(change.start_time);
            const duration = change.duration || 45;
            const endMins = startMins + duration;
            const eh = Math.floor(endMins / 60);
            const em = endMins % 60;
            const endTimeStr = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`;

            const studentName = `${change.student?.first_name || ''} ${maskLastName(change.student?.last_name, showRealNames)}`.trim() || 'Schüler';

            await supabase.from('room_bookings').insert({
              school_id: schoolId,
              room_id: currentRoomId,
              booked_by: userId,
              date: change.date,
              start_time: change.start_time.length === 5 ? `${change.start_time}:00` : change.start_time,
              end_time: endTimeStr,
              title: `Unterricht: ${studentName}`
            });
          }

          window.dispatchEvent(new CustomEvent('refresh-bookings'));
        } catch (bookingErr) {
          console.warn('Error syncing room booking in persistChangesDirectly:', bookingErr);
        }

        // DM notifications
        try {
          if (change.student_id) {
            let notificationMessage = '';
            
            const origDateStr = change.original_date || (originalOcc ? originalOcc.date : change.date);
            const origTimeStr = change.original_start_time || (originalOcc ? originalOcc.start_time : change.start_time);
            
            const origDate = new Date(origDateStr);
            const origDayLabel = DAYS_DE[origDate.getDay()];
            const origTimeLabel = origTimeStr.substring(0, 5);

            const newDate = new Date(change.date);
            const newDayLabel = DAYS_DE[newDate.getDay()];
            const newTimeLabel = change.start_time.substring(0, 5);

            const oldDbDate = originalOcc ? originalOcc.date : origDateStr;
            const oldDbTime = originalOcc ? originalOcc.start_time : origTimeStr;
            const timeActuallyChanged = change.date !== oldDbDate || change.start_time.substring(0, 5) !== oldDbTime.substring(0, 5);

            if (timeActuallyChanged) {
              if (['cancelled', 'canceled_by_student'].includes(change.status)) {
                const shortOrigDay = origDayLabel.substring(0, 2) + '.';
                const shortOrigDate = `${String(origDate.getDate()).padStart(2, '0')}.${String(origDate.getMonth() + 1).padStart(2, '0')}.${String(origDate.getFullYear()).substring(2, 4)}`;
                notificationMessage = `Dein Unterrichtstermin am ${shortOrigDay} ${shortOrigDate} um ${origTimeLabel} Uhr fällt aus.`;
              } else {
                const isReset = change.date === origDateStr && change.start_time.substring(0, 5) === origTimeStr.substring(0, 5);
                const shortNewDay = newDayLabel.substring(0, 2) + '.';
                const shortNewDate = `${String(newDate.getDate()).padStart(2, '0')}.${String(newDate.getMonth() + 1).padStart(2, '0')}.${String(newDate.getFullYear()).substring(2, 4)}`;
                if (isReset) {
                  notificationMessage = `Der verschobene Termin wurde auf den regulären Termin zurückgesetzt:\n${shortNewDay} ${shortNewDate} um ${newTimeLabel} Uhr.`;
                } else {
                  const shortOrigDay = origDayLabel.substring(0, 2) + '.';
                  const shortOrigDate = `${String(origDate.getDate()).padStart(2, '0')}.${String(origDate.getMonth() + 1).padStart(2, '0')}.${String(origDate.getFullYear()).substring(2, 4)}`;
                  notificationMessage = `Dein Termin wurde verschoben: ${shortOrigDay} ${shortOrigDate} ${origTimeLabel} Uhr -> ${shortNewDay} ${shortNewDate} ${newTimeLabel} Uhr. Bitte bestätige den neuen Termin.`;
                }
              }
            }

            if (notificationMessage) {
              await supabase.from('campus_direct_messages').insert({
                sender_id: userId,
                recipient_id: change.student_id,
                content: notificationMessage
              });

              try {
                const { data: studentProfile } = await supabase
                  .from('users')
                  .select('is_campus_active, first_name')
                  .eq('id', change.student_id)
                  .single();

                if (studentProfile && studentProfile.is_campus_active) {
                  let pushTitle = 'Terminänderung 🔄';
                  if (['cancelled', 'canceled_by_student'].includes(change.status)) {
                    pushTitle = 'Unterricht fällt aus ☕';
                  } else if (change.date === origDateStr && change.start_time.substring(0, 5) === origTimeStr.substring(0, 5)) {
                    pushTitle = 'Termin zurückgesetzt 🔄';
                  } else {
                    pushTitle = 'Terminänderung 🔄';
                  }

                  const { data: dbNotif } = await supabase
                    .from('notifications')
                    .insert({
                      user_id: change.student_id,
                      title: pushTitle,
                      message: notificationMessage,
                      metadata: { occurrence_id: change.id, type: ['cancelled', 'canceled_by_student'].includes(change.status) ? 'cancelled' : 'rescheduled' }
                    })
                    .select('id')
                    .single();

                  await supabase.functions.invoke('send-push', {
                    body: {
                      userId: change.student_id,
                      title: pushTitle,
                      body: notificationMessage,
                      url: '/',
                      notificationId: dbNotif ? dbNotif.id : null
                    }
                  });
                  console.log('[Push] Sent real-time push to student:', change.student_id);
                }
              } catch (pushErr) {
                console.error('Failed to send real-time push:', pushErr);
              }
            }
          }
        } catch (dmErr) {
          console.warn('DM notify fail:', dmErr);
        }
      }

      await loadOccurrences();
    } catch (error: any) {
      await showAlert('Fehler beim Speichern: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const persistOccurrenceDirectly = async (id: string, updates: Partial<ScheduleOccurrence>) => {
    if (id.startsWith('vacant-')) return;
    const baseOcc = baseOccurrences.find(o => o.id === id);
    const existing = pendingChanges[id] || baseOcc;
    if (!existing) return;

    const newOcc = { ...existing, ...updates };
    if (baseOcc && !newOcc.original_date) {
      newOcc.original_date = baseOcc.date;
    }
    if (baseOcc && !newOcc.original_start_time) {
      newOcc.original_start_time = baseOcc.start_time;
    }

    await persistChangesDirectly([newOcc]);
    
    if (pendingChanges[id]) {
      setPendingChanges(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const persistMultipleOccurrencesDirectly = async (updatesMap: Record<string, Partial<ScheduleOccurrence>>) => {
    const changesToPersist: ScheduleOccurrence[] = [];
    const idsToClean: string[] = [];

    for (const [id, updates] of Object.entries(updatesMap)) {
      if (id.startsWith('vacant-')) continue;
      const baseOcc = baseOccurrences.find(o => o.id === id);
      const existing = pendingChanges[id] || baseOcc;
      if (!existing) continue;

      const newOcc = { ...existing, ...updates };
      if (baseOcc && !newOcc.original_date) {
        newOcc.original_date = baseOcc.date;
      }
      if (baseOcc && !newOcc.original_start_time) {
        newOcc.original_start_time = baseOcc.start_time;
      }
      changesToPersist.push(newOcc);
      idsToClean.push(id);
    }

    if (changesToPersist.length > 0) {
      // Optimistic instant React state update (0 ms latency)
      setBaseOccurrences(prev => prev.map(occ => {
        const match = changesToPersist.find(c => c.id === occ.id);
        if (match) {
          return { ...occ, ...match };
        }
        return occ;
      }));

      await persistChangesDirectly(changesToPersist);
      
      setPendingChanges(prev => {
        const next = { ...prev };
        idsToClean.forEach(id => {
          delete next[id];
        });
        return next;
      });
    }
  };

  const resetOccurrence = (id: string) => {
    setPendingChanges(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Helper to get week start (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay() || 7; // Get current day number, converting Sun. to 7
    if (day !== 1) d.setHours(-24 * (day - 1)); // Set to previous Monday
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const weekStart = getWeekStart(currentDate);

  // Formatting helpers
  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  };

  const weekNumber = getWeekNumber(currentDate);

  const hasWeekendAppointments = useMemo(() => {
    const sat = new Date(weekStart);
    sat.setDate(sat.getDate() + 5);
    const sun = new Date(weekStart);
    sun.setDate(sun.getDate() + 6);
    const satStr = toLocalYYYYMMDD(sat);
    const sunStr = toLocalYYYYMMDD(sun);

    return occurrences.some(o => {
      if (o.date !== satStr && o.date !== sunStr) return false;
      const isVacant = o.student_id === 'vacant';
      const isCancelled = o.status === 'cancelled';
      const isBreak = !o.student_id;
      return !isVacant && !isCancelled && !isBreak;
    });
  }, [weekStart, occurrences]);

  const isWeekendVisible = showWeekend || hasWeekendAppointments;

  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const jumpToMonthStart = () => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    setCurrentDate(d);
  };

  const jumpToToday = () => {
    setCurrentDate(new Date());
  };

  const [timeDragState, setTimeDragState] = useState<{ id: string, startX: number, initialTime: string } | null>(null);
  const [swapLinks, setSwapLinks] = useState<{id1: string, id2: string}[]>([]);
  const [lassoPaths, setLassoPaths] = useState<{x1:number, y1:number, x2:number, y2:number}[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculateLassos = () => {
      if (!gridRef.current) return;
      const paths = [];
      const gridRect = gridRef.current.getBoundingClientRect();

      for (const link of swapLinks) {
        const el1 = document.getElementById(`occ-${link.id1}`);
        const el2 = document.getElementById(`occ-${link.id2}`);
        if (el1 && el2) {
          const rect1 = el1.getBoundingClientRect();
          const rect2 = el2.getBoundingClientRect();
          
          const x1 = rect1.left - gridRect.left + rect1.width / 2;
          const y1 = rect1.top - gridRect.top + rect1.height / 2;
          
          const x2 = rect2.left - gridRect.left + rect2.width / 2;
          const y2 = rect2.top - gridRect.top + rect2.height / 2;
          
          paths.push({x1, y1, x2, y2});
        }
      }
      setLassoPaths(paths);
    };

    calculateLassos();
    const timer = setTimeout(calculateLassos, 50);
    window.addEventListener('resize', calculateLassos);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateLassos);
    };
  }, [swapLinks, occurrences]);

  // Auto-scroll: when the calendar first loads its occurrences, scroll the grid
  // into the visible viewport so teachers see their appointments without manual scrolling.
  const initialScrollDoneRef = useRef(false);
  useEffect(() => {
    if (occurrences.length > 0 && !initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      setTimeout(() => {
        gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [occurrences]);

  const loadOccurrencesRef = useRef(loadOccurrences);
  useEffect(() => {
    loadOccurrencesRef.current = loadOccurrences;
  });

  useEffect(() => {
    loadOccurrencesRef.current();
  }, [weekStart.getTime(), userId, JSON.stringify(boards), holidays]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`realtime_teacher_calendar_${userId}`)
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
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
              loadOccurrencesRef.current();
            }, 500);
          }
        }
      )
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
            if (oldRec?.teacher_id === userId && newRec?.teacher_id !== userId) {
              showActionToast('ℹ️ Schüler wurde neu zugewiesen.');
            }
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
              loadOccurrencesRef.current();
            }, 300);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const fetchSickUntil = async () => {
      const { data } = await supabase
        .from('users')
        .select('sick_start, sick_until')
        .eq('id', userId)
        .single();
      if (data?.sick_until) {
        setSickStart(data.sick_start ? data.sick_start.substring(0, 10) : null);
        setSickUntil(data.sick_until.substring(0, 10));
      } else {
        setSickStart(null);
        setSickUntil(null);
      }
    };
    fetchSickUntil();

    const channel = supabase
      .channel(`user_profile_sick_${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        (payload) => {
          if (payload.new && 'sick_until' in payload.new) {
            setSickStart(payload.new.sick_start ? payload.new.sick_start.substring(0, 10) : null);
            setSickUntil(payload.new.sick_until ? payload.new.sick_until.substring(0, 10) : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function loadOccurrences() {
    setLoading(true);
    setSwapLinks([]); 
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const startDateStr = toLocalYYYYMMDD(weekStart);
      const endDateStr = toLocalYYYYMMDD(weekEnd);

      let fetchedData: any[] = [];
      let roomBookings: any[] = [];
      const studentTeacherMap = new Map<string, string | null>();

      try {
        const [
          rbResult,
          schedResult,
          mySchedResult,
          evResult,
          rbData2Result,
          allOccsResult,
          mainOccsResult,
          schoolStudentsResult,
          schoolUsersResult
        ] = await Promise.all([
          supabase.from('room_bookings').select('room_id, date, start_time, room:rooms(name)').eq('booked_by', userId).gte('date', startDateStr).lte('date', endDateStr),
          supabase.from('schedules').select('room_id, time_slot, duration, day_of_week, teacher_id, student_id, student:users!schedules_student_id_fkey(first_name, last_name, instrument), teacher:users!schedules_teacher_id_fkey(first_name, last_name)').eq('school_id', schoolId).not('room_id', 'is', null),
          supabase.from('schedules').select('room_id, time_slot, duration, day_of_week, teacher_id, student_id, student:users!schedules_student_id_fkey(first_name, last_name, instrument)').eq('teacher_id', userId).eq('school_id', schoolId),
          supabase.from('campus_events').select('room_id, event_date, start_time, end_time, title').eq('school_id', schoolId).gte('event_date', startDateStr).lte('event_date', endDateStr).not('room_id', 'is', null),
          supabase.from('room_bookings').select('room_id, date, start_time, end_time, booked_by, user:users(first_name, last_name)').eq('school_id', schoolId).gte('date', startDateStr).lte('date', endDateStr).not('room_id', 'is', null),
          supabase.from('schedule_occurrences').select('id, date, start_time, original_date, duration, status, teacher_id, student_id').or(`and(date.gte.${startDateStr},date.lte.${endDateStr}),and(original_date.gte.${startDateStr},original_date.lte.${endDateStr})`),
          supabase.from('schedule_occurrences').select('id, date, start_time, original_date, duration, status, teacher_id, student_id, student:users!schedule_occurrences_student_id_fkey(first_name, last_name, instrument, is_campus_active, is_groovelab_active, group_id)').eq('teacher_id', userId).or(`and(date.gte.${startDateStr},date.lte.${endDateStr}),and(original_date.gte.${startDateStr},original_date.lte.${endDateStr})`).order('date').order('start_time'),
          supabase.from('students').select('id, user_id, teacher_id').eq('school_id', schoolId),
          supabase.from('users').select('id, teacher_id, first_name, last_name').eq('school_id', schoolId).eq('role', 'student')
        ]);

        if (rbResult.data) roomBookings = rbResult.data;
        
        let mergedSchedules = schedResult.data || [];
        if (mySchedResult.data && mySchedResult.data.length > 0) {
          const mySlots = mySchedResult.data.map((s: any) => ({ ...s, teacher_id: userId, _ownSlot: true }));
          const withoutOwn = mergedSchedules.filter((s: any) => !s._ownSlot);
          mergedSchedules = [...withoutOwn, ...mySlots];
        }
        setCachedWeekSchedules(mergedSchedules);

        if (evResult.data) setCachedWeekEvents(evResult.data);
        if (rbData2Result.data) setCachedWeekRoomBookings(rbData2Result.data);
        if (allOccsResult.data) setCachedWeekOccurrences(allOccsResult.data);

        studentTeacherMap.clear();
        (schoolStudentsResult.data || []).forEach((st: any) => {
          if (st.id) studentTeacherMap.set(st.id, st.teacher_id || null);
          if (st.user_id) studentTeacherMap.set(st.user_id, st.teacher_id || null);
        });
        (schoolUsersResult.data || []).forEach((u: any) => {
          if (u.id) studentTeacherMap.set(u.id, u.teacher_id || null);
          const fn = (u.first_name || '').trim().toLowerCase();
          const ln = (u.last_name || '').trim().toLowerCase();
          if (fn || ln) {
            studentTeacherMap.set(`${fn}_${ln}`, u.teacher_id || null);
            if (fn) studentTeacherMap.set(fn, u.teacher_id || null);
          }
        });

        if (!mainOccsResult.error && mainOccsResult.data) {

          // If occurrence student is NOT explicitly assigned to userId, convert to vacant slot (empty gap)
          let filteredMainData = mainOccsResult.data.map((occ: any) => {
            if (!occ.student_id || occ.student_id === 'vacant') return occ;
            const assignedTeacherId = studentTeacherMap.get(occ.student_id) || occ.student?.teacher_id;
            if (assignedTeacherId && assignedTeacherId !== userId) {
              return {
                ...occ,
                student_id: 'vacant',
                student: null,
                vacant_student_id: occ.student_id
              };
            }
            return occ;
          });

          fetchedData = filteredMainData.map((occ: any) => {
            const booking = roomBookings.find(b => 
              b.date === occ.date && 
              b.start_time.substring(0, 5) === occ.start_time.substring(0, 5)
            );
            if (booking) {
              return {
                ...occ,
                template_room_id: null,
                schedules: {
                  room_id: booking.room_id,
                  room: booking.room
                }
              };
            }
            // Fallback: Resolve room from the teacher's recurring schedule matching day of week & time slot
            const occDate = new Date(occ.date + 'T00:00:00');
            const occDayOfWeek = occDate.getDay() || 7;
            const matchingSlot = mergedSchedules.find((s: any) => 
              s.teacher_id === occ.teacher_id &&
              s.day_of_week === occDayOfWeek &&
              s.time_slot?.substring(0, 5) === occ.start_time.substring(0, 5)
            );
            if (matchingSlot && matchingSlot.room_id) {
              const roomObj = rooms.find(r => r.id === matchingSlot.room_id);
              return {
                ...occ,
                template_room_id: null,
                schedules: {
                  room_id: matchingSlot.room_id,
                  room: roomObj ? { name: roomObj.name } : null
                }
              };
            }
            return {
              ...occ,
              template_room_id: null,
              schedules: null
            };
          });
        }
      } catch (err) {
        console.warn('DB fetch failed', err);
      }

      // Helper function to check if a database occurrence matches a template student
      const matchesTemplateStudent = (occ: any, s: any) => {
        if (!s || !occ) return false;
        const occStudentId = occ.student_id;
        if (occStudentId) {
          if (
            occStudentId === s.id || 
            occStudentId === s.student_id || 
            occStudentId === s.studentId ||
            occStudentId === s.db_id ||
            occStudentId === s.user_id
          ) return true;

          if (s.groupStudents && Array.isArray(s.groupStudents)) {
            if (s.groupStudents.some((gs: any) => 
              gs.id === occStudentId || 
              gs.student_id === occStudentId || 
              gs.studentId === occStudentId ||
              gs.db_id === occStudentId ||
              gs.user_id === occStudentId
            )) {
              return true;
            }
          }
        }

        const oFirst = (occ.student?.first_name || occ.student_first_name || '').trim().toLowerCase();
        const sFirst = (s.first_name || s.firstName || '').trim().toLowerCase();

        if (oFirst && sFirst && oFirst === sFirst) {
          const oLast = (occ.student?.last_name || occ.student_last_name || '').trim().toLowerCase();
          const sLast = (s.last_name || s.lastName || '').trim().toLowerCase();
          if (!oLast || !sLast || oLast === sLast || oLast.startsWith(sLast[0]) || sLast.startsWith(oLast[0])) {
            return true;
          }
        }
        return false;
      };



      // Merge projected mock data with database entries so that every slot defined in the designer
      // template (boards) is always visible in the calendar, even if only one or a few are saved in the DB.
      // School year runs September 1 – July 31 (August is excluded).
      const projectedData: ScheduleOccurrence[] = [];
      if (boards && boards.length > 0) {
        boards.forEach(board => {
          const offset = board.dayOfWeek - 1;
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + offset);
          const dateStr = toLocalYYYYMMDD(dayDate);

          board.students.forEach((student: any) => {
            const formattedTime = student.assignedTime ? `${student.assignedTime}:00` : '00:00:00';
            if (student.isBreak) {
              const isBreakCancelled = fetchedData.some(o => 
                o.date === dateStr && 
                (!o.student_id || o.student_id === 'vacant') && 
                o.start_time.substring(0, 5) === (student.assignedTime || '').substring(0, 5) && 
                ['cancelled', 'canceled_by_student'].includes(o.status)
              );
              // Only project the break if it is not cancelled, and there is no active/non-cancelled appointment occupying this slot
              const isOccupied = fetchedData.some(o => o.date === dateStr && o.start_time && (o.start_time || '').substring(0, 5) === (student.assignedTime || '').substring(0, 5) && o.status !== 'cancelled');
              if (!isBreakCancelled && !isOccupied) {
                projectedData.push({
                  id: `mock-${board.id}-${student.id}`,
                  student_id: '',
                  teacher_id: userId,
                  date: dateStr,
                  original_date: dateStr,
                  original_start_time: formattedTime,
                  start_time: formattedTime,
                  duration: student.duration,
                  status: 'scheduled',
                  student: {
                    first_name: '☕️ Pause',
                    last_name: '',
                    instrument: ''
                  },
                  schedules: {
                    room_id: board.roomId || null,
                    room: {
                      name: rooms.find(r => r.id === board.roomId)?.name || ''
                    }
                  }
                });
              }
            } else {
              // Strictly exclude students without an explicit assignment to current teacher
              const fn = (student.first_name || student.firstName || '').trim().toLowerCase();
              const ln = (student.last_name || student.lastName || '').trim().toLowerCase();
              const nameKey = `${fn}_${ln}`;

              let assignedTeacherId: string | null | undefined = undefined;
              if (student.id && studentTeacherMap.has(student.id)) {
                assignedTeacherId = studentTeacherMap.get(student.id);
              } else if (nameKey !== '_' && studentTeacherMap.has(nameKey)) {
                assignedTeacherId = studentTeacherMap.get(nameKey);
              } else if (fn && studentTeacherMap.has(fn)) {
                assignedTeacherId = studentTeacherMap.get(fn);
              }

              const isMappedInSchool = (student.id && studentTeacherMap.has(student.id)) ||
                                       (nameKey !== '_' && studentTeacherMap.has(nameKey)) ||
                                       (fn && studentTeacherMap.has(fn));

              if (isMappedInSchool) {
                if (!assignedTeacherId || assignedTeacherId !== userId) {
                  return; // Skip projection, leaving empty space (leere Lücke) in schedule
                }
              }

              // Check if a saved database record already covers this student in this week range
              let hasDbRecordForThisSlot = false;
              if (student.isGroup && student.groupStudents) {
                hasDbRecordForThisSlot = fetchedData.some(o => 
                  student.groupStudents.some((gs: any) => gs.id === o.student_id)
                );
              } else {
                hasDbRecordForThisSlot = fetchedData.some(o => 
                  matchesTemplateStudent(o, student)
                );
              }
              
              if (!hasDbRecordForThisSlot) {
                // Standard projected card for student not in DB yet
                projectedData.push({
                  id: `mock-${board.id}-${student.id}`,
                  student_id: student.id,
                  teacher_id: userId,
                  date: dateStr,
                  original_date: dateStr,
                  original_start_time: formattedTime,
                  start_time: formattedTime,
                  duration: student.duration,
                  status: 'scheduled',
                  isGroupBlock: student.isGroup || false,
                  groupOccurrences: student.groupStudents || [],
                  student: { 
                    first_name: student.first_name || 'Pause', 
                    last_name: student.last_name || '', 
                    instrument: student.instrument || 'Nicht festgelegt' 
                  },
                  schedules: {
                    room_id: board.roomId || null,
                    room: {
                      name: rooms.find(r => r.id === board.roomId)?.name || ''
                    }
                  }
                });
              }
            }
          });
        });
      }

      // Fallback projection from database recurring schedules table (`schedules`) if no occurrence or board exists yet
      const schedList = (cachedWeekSchedules || []).filter((s: any) => s.teacher_id === userId);
      if (schedList.length > 0) {
        schedList.forEach((slot: any) => {
          if (!slot.day_of_week) return;
          const offset = slot.day_of_week - 1;
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + offset);
          const dateStr = toLocalYYYYMMDD(dayDate);

          const formattedTime = slot.time_slot ? (slot.time_slot.includes(':') && slot.time_slot.split(':').length === 2 ? `${slot.time_slot}:00` : slot.time_slot) : '00:00:00';
          const alreadyExistsByTime = fetchedData.some(o => o.date === dateStr && (o.start_time || '').substring(0, 5) === (formattedTime || '').substring(0, 5) && o.status !== 'cancelled') ||
                                projectedData.some(p => p.date === dateStr && (p.start_time || '').substring(0, 5) === (formattedTime || '').substring(0, 5));
          
          let alreadyExistsByStudent = false;
          if (slot.student_id) {
            alreadyExistsByStudent = fetchedData.some(o => o.student_id === slot.student_id && o.status !== 'cancelled') ||
                                     projectedData.some(p => p.student_id === slot.student_id);
          }

          if (!alreadyExistsByTime && !alreadyExistsByStudent) {
            const studentObj = slot.student;
            const roomObj = (rooms || []).find((r: any) => r.id === slot.room_id);

            projectedData.push({
              id: `sched-proj-${slot.id || crypto.randomUUID()}-${dateStr}`,
              student_id: slot.student_id || '',
              teacher_id: slot.teacher_id || userId,
              date: dateStr,
              start_time: formattedTime,
              duration: slot.duration || 30,
              status: slot.status === 'approved' ? 'scheduled' : (slot.status || 'scheduled'),
              student: {
                first_name: studentObj ? studentObj.first_name : (slot.student_id ? 'Schüler' : '☕️ Pause'),
                last_name: studentObj ? (studentObj.last_name || '') : '',
                instrument: studentObj ? (studentObj.instrument || '') : (slot.instrument || '')
              },
              schedules: {
                room_id: slot.room_id || null,
                room: {
                  name: roomObj ? roomObj.name : ''
                }
              }
            });
          }
        });
      }



      fetchedData = [...fetchedData, ...projectedData];

      // Filter out regular schedule items if they fall during holidays.
      // In the holidays, only Nachholtermine (rescheduled appointments from outside the holidays) are allowed.
      const filteredFromHolidays = fetchedData.filter(occ => {
        const isHoliday = holidays.some(h => occ.date >= h.start && occ.date <= h.end);
        if (isHoliday) {
          const isMockOrVacant = occ.id.startsWith('mock-') || occ.id.startsWith('vacant-');
          if (isMockOrVacant) return false;

          // Keep database occurrences only if they are Nachholtermine rescheduled from outside the holidays
          const isRescheduledFromOutside = occ.original_date && 
            occ.original_date !== occ.date && 
            !holidays.some(h => occ.original_date >= h.start && occ.original_date <= h.end);

          return !!isRescheduledFromOutside;
        }
        return true;
      });

      setBaseOccurrences(filteredFromHolidays);
    } catch (err) {
      console.error('Error loading occurrences:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCopyWeek = () => {
    const activeOccs = baseOccurrences.filter(occ => 
      occ.student_id && 
      occ.student_id !== 'vacant' && 
      !occ.id.startsWith('mock-') &&
      occ.status !== 'cancelled'
    );

    if (activeOccs.length === 0) {
      showAlert('Keine aktiven Unterrichtstermine in dieser Woche zum Kopieren gefunden.');
      return;
    }

    const copiedEvents = activeOccs.map(occ => {
      const occDate = new Date(occ.date);
      const diffTime = occDate.getTime() - weekStart.getTime();
      const dayOffset = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      const isRoomOverridden = occ.template_room_id !== undefined && occ.template_room_id !== (occ.schedules?.room_id || null);
      const isRescheduled = (occ.original_date && (occ.original_date !== occ.date || occ.original_start_time !== occ.start_time)) || isRoomOverridden;

      return {
        student_id: occ.student_id,
        student_first_name: occ.student?.first_name || '',
        student_last_name: occ.student?.last_name || '',
        schedule_id: occ.schedule_id || null,
        duration: occ.duration || 45,
        start_time: occ.start_time,
        status: occ.status || 'scheduled',
        instrument: occ.instrument || null,
        notes: occ.notes || null,
        rescheduled: isRescheduled,
        activeRoomId: occ.schedules?.room_id || null,
        dayOffset
      };
    });

    localStorage.setItem('groovelab_copied_week_data', JSON.stringify(copiedEvents));
    showAlert(`${copiedEvents.length} Termine kopiert. Wähle eine andere Woche und klicke auf "Woche einfügen".`);
  };

  const handlePasteWeek = async () => {
    const rawData = localStorage.getItem('groovelab_copied_week_data');
    if (!rawData) {
      showAlert('Keine kopierte Woche im Zwischenspeicher gefunden. Bitte kopiere zuerst eine Woche.');
      return;
    }

    let copiedEvents;
    try {
      copiedEvents = JSON.parse(rawData);
      if (!Array.isArray(copiedEvents) || copiedEvents.length === 0) {
        throw new Error('Not an array');
      }
    } catch (e) {
      showAlert('Der Zwischenspeicher ist leer oder ungültig.');
      return;
    }

    const weekStartStr = toLocalYYYYMMDD(weekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = toLocalYYYYMMDD(weekEnd);

    // Conflict Detection: Check destination week for existing manual changes
    const { data: existingOccurrences } = await supabase
      .from('schedule_occurrences')
      .select('id, date, start_time, status, rescheduled, notes')
      .eq('teacher_id', userId)
      .or(`and(date.gte.${weekStartStr},date.lte.${weekEndStr}),and(original_date.gte.${weekStartStr},original_date.lte.${weekEndStr})`);

    const hasManualChanges = existingOccurrences?.some(
      (occ) => occ.rescheduled || occ.notes || occ.status !== 'scheduled'
    );

    let confirmMsg = `Möchtest du alle ${copiedEvents.length} kopierten Termine in diese Woche einfügen?`;
    if (hasManualChanges) {
      confirmMsg = `⚠️ Achtung: In der Zielwoche gibt es bereits manuelle Anpassungen (verschobene Termine, Notizen oder Fehlzeiten).\n\nWenn du fortfährst, werden diese durch die kopierten Termine überschrieben. Möchtest du wirklich einfügen?`;
    } else if (existingOccurrences && existingOccurrences.length > 0) {
      confirmMsg += `\n\n(Bestehende Standardtermine dieser Woche werden überschrieben)`;
    }

    const confirmPaste = await showConfirm(confirmMsg);
    if (!confirmPaste) return;

    setLoading(true);

    try {
      const weekStartStr = toLocalYYYYMMDD(weekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = toLocalYYYYMMDD(weekEnd);

      // 1. Delete existing occurrences in destination week
      const { data: occurrencesToDelete } = await supabase
        .from('schedule_occurrences')
        .select('date, start_time')
        .eq('teacher_id', userId)
        .or(`and(date.gte.${weekStartStr},date.lte.${weekEndStr}),and(original_date.gte.${weekStartStr},original_date.lte.${weekEndStr})`);

      const { error: deleteError } = await supabase
        .from('schedule_occurrences')
        .delete()
        .eq('teacher_id', userId)
        .or(`and(date.gte.${weekStartStr},date.lte.${weekEndStr}),and(original_date.gte.${weekStartStr},original_date.lte.${weekEndStr})`);

      if (deleteError) throw deleteError;

      // Clean up corresponding room bookings
      if (occurrencesToDelete && occurrencesToDelete.length > 0) {
        try {
          await Promise.all(
            occurrencesToDelete.map(occ =>
              supabase.from('room_bookings')
                .delete()
                .eq('booked_by', userId)
                .eq('date', occ.date)
                .eq('start_time', occ.start_time)
            )
          );
        } catch (roomErr) {
          console.warn('Error deleting room bookings on paste week:', roomErr);
        }
      }

      // 2. Insert new occurrences
      const inserts = copiedEvents.map(evt => {
        const destDate = new Date(weekStart);
        destDate.setDate(destDate.getDate() + evt.dayOffset);
        const destDateStr = toLocalYYYYMMDD(destDate);

        return {
          teacher_id: userId,
          student_id: evt.student_id,
          duration: evt.duration,
          date: destDateStr,
          start_time: evt.start_time,
          status: evt.status,
          instrument: evt.instrument,
          notes: evt.notes,
          original_date: destDateStr
        };
      });

      if (inserts.length > 0) {
        const { error: insertError } = await supabase
          .from('schedule_occurrences')
          .insert(inserts);

        if (insertError) throw insertError;

        // Insert room bookings for any rescheduled appointments
        const rescheduledInserts = copiedEvents.filter(evt => evt.rescheduled && evt.activeRoomId);
        if (rescheduledInserts.length > 0) {
          try {
            await Promise.all(
              rescheduledInserts.map(evt => {
                const destDate = new Date(weekStart);
                destDate.setDate(destDate.getDate() + evt.dayOffset);
                const destDateStr = toLocalYYYYMMDD(destDate);

                const startMins = timeToMinutes(evt.start_time);
                const duration = evt.duration || 45;
                const endMins = startMins + duration;

                // Check if this falls inside the teacher's regular block in that room on that weekday
                const targetDayOfWeek = destDate.getDay() || 7; // 1=Mon … 7=Sun
                let regMin = Infinity;
                let regMax = -Infinity;
                (cachedWeekSchedules || []).forEach((s: any) => {
                  if (s.day_of_week !== targetDayOfWeek) return;
                  if (s.teacher_id !== userId) return;
                  if (s.room_id !== evt.activeRoomId) return;
                  const sStart = timeToMinutes(s.time_slot);
                  const sEnd = sStart + (s.duration || 45);
                  if (sStart < regMin) regMin = sStart;
                  if (sEnd > regMax) regMax = sEnd;
                });

                const isInsideOwnRegularBlock = regMin !== Infinity && startMins >= regMin && endMins <= regMax;
                if (isInsideOwnRegularBlock) {
                  return Promise.resolve();
                }

                const eh = Math.floor(endMins / 60);
                const em = endMins % 60;
                const endTimeStr = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`;

                const studentName = `${evt.student_first_name || ''} ${maskLastName(evt.student_last_name, showRealNames)}`.trim() || 'Schüler';

                return supabase.from('room_bookings').insert({
                  school_id: schoolId,
                  room_id: evt.activeRoomId,
                  booked_by: userId,
                  date: destDateStr,
                  start_time: evt.start_time.length === 5 ? `${evt.start_time}:00` : evt.start_time,
                  end_time: endTimeStr,
                  title: `Unterricht: ${studentName}`
                });
              })
            );
            window.dispatchEvent(new CustomEvent('refresh-bookings'));
          } catch (rbErr) {
            console.warn('Error inserting room bookings on paste:', rbErr);
          }
        }
      }

      await loadOccurrences();
      showAlert(`${inserts.length} Termine erfolgreich eingefügt.`);
    } catch (err) {
      console.error('Error pasting week:', err);
      showAlert('Fehler beim Einfügen der kopierten Woche.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportICal = () => {
    const activeOccs = baseOccurrences.filter(occ => 
      occ.student_id && 
      occ.student_id !== 'vacant' && 
      !occ.id.startsWith('mock-') &&
      occ.status !== 'cancelled'
    );

    if (activeOccs.length === 0) {
      showAlert('Keine aktiven Termine in dieser Woche zum Exportieren.');
      return;
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Campus-Groovelab//Stundenplan//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    activeOccs.forEach(occ => {
      const studentName = `${occ.student?.first_name || ''} ${maskLastName(occ.student?.last_name, showRealNames)}`.trim() || 'Schüler';
      const instrument = occ.instrument || occ.student?.instrument || '';
      
      const startMins = timeToMinutes(occ.start_time);
      const duration = occ.duration || 45;
      const endMins = startMins + duration;
      
      const sh = Math.floor(startMins / 60);
      const sm = startMins % 60;
      const eh = Math.floor(endMins / 60);
      const em = endMins % 60;

      const dateParts = occ.date.split('-');
      const yyyy = dateParts[0];
      const mm = dateParts[1];
      const dd = dateParts[2];

      const startStr = `${yyyy}${mm}${dd}T${String(sh).padStart(2, '0')}${String(sm).padStart(2, '0')}00`;
      const endStr = `${yyyy}${mm}${dd}T${String(eh).padStart(2, '0')}${String(em).padStart(2, '0')}00`;

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:occ-${occ.id}@campus-groovelab`);
      icsContent.push(`DTSTART:${startStr}`);
      icsContent.push(`DTEND:${endStr}`);
      icsContent.push(`SUMMARY:${instrument ? `${instrument}-Unterricht` : 'Unterricht'}: ${studentName}`);
      
      const roomName = occ.schedules?.room?.name || '';
      if (roomName) {
        icsContent.push(`LOCATION:${roomName}`);
      }
      if (occ.notes) {
        icsContent.push(`DESCRIPTION:${occ.notes.replace(/\n/g, '\\n')}`);
      }
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `campus-groovelab-stundenplan-${toLocalYYYYMMDD(weekStart)}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetWeek = async () => {
    const weekStartStr = toLocalYYYYMMDD(weekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = toLocalYYYYMMDD(weekEnd);

    setPendingChanges(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        const occ = next[id];
        const origDate = occ.original_date || occ.date;
        if ((origDate >= weekStartStr && origDate <= weekEndStr) || 
            (occ.date >= weekStartStr && occ.date <= weekEndStr)) {
          delete next[id];
        }
      });
      return next;
    });
    setSwapLinks([]);

    try {
      setLoading(true);

      // Notify students who had rescheduled/cancelled lessons in this week before deleting them
      const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
      const rescheduledOrCancelled = baseOccurrences.filter(occ => 
        occ.student_id && 
        occ.student_id !== 'vacant' && 
        !occ.id.startsWith('mock-') && 
        (['cancelled', 'canceled_by_student'].includes(occ.status) || (occ.original_date && (occ.original_date !== occ.date || occ.original_start_time !== occ.start_time)))
      );

      for (const occ of rescheduledOrCancelled) {
        try {
          const origDateStr = occ.original_date || occ.date;
          const origTimeStr = occ.original_start_time || occ.start_time;
          const origDate = new Date(origDateStr);
          const origDayLabel = DAYS_DE[origDate.getDay()];
          const origTimeLabel = origTimeStr.substring(0, 5);
          const shortOrigDay = origDayLabel.substring(0, 2) + '.';
          const shortOrigDate = `${String(origDate.getDate()).padStart(2, '0')}.${String(origDate.getMonth() + 1).padStart(2, '0')}.${String(origDate.getFullYear()).substring(2, 4)}`;

          const notificationMessage = `Der verschobene oder abgesagte Termin wurde auf den regulären Termin zurückgesetzt:\n${shortOrigDay} ${shortOrigDate} um ${origTimeLabel} Uhr.`;
          
          await supabase.from('campus_direct_messages').insert({
            sender_id: userId,
            recipient_id: occ.student_id,
            content: notificationMessage
          });
        } catch (err) {
          console.warn('Error sending reset week notification:', err);
        }
      }

      // Fetch occurrences about to be deleted so we can clean up their room bookings
      const { data: occurrencesToDelete } = await supabase
        .from('schedule_occurrences')
        .select('date, start_time')
        .eq('teacher_id', userId)
        .or(`and(date.gte.${weekStartStr},date.lte.${weekEndStr}),and(original_date.gte.${weekStartStr},original_date.lte.${weekEndStr})`);

      const { error } = await supabase
        .from('schedule_occurrences')
        .delete()
        .eq('teacher_id', userId)
        .or(`and(date.gte.${weekStartStr},date.lte.${weekEndStr}),and(original_date.gte.${weekStartStr},original_date.lte.${weekEndStr})`);
      
      if (error) throw error;

      // Clean up corresponding room bookings
      if (occurrencesToDelete && occurrencesToDelete.length > 0) {
        try {
          await Promise.all(
            occurrencesToDelete.map(occ =>
              supabase.from('room_bookings')
                .delete()
                .eq('booked_by', userId)
                .eq('date', occ.date)
                .eq('start_time', occ.start_time)
            )
          );
          window.dispatchEvent(new CustomEvent('refresh-bookings'));
        } catch (roomErr) {
          console.warn('Error deleting room bookings on reset week:', roomErr);
        }
      }

      await loadOccurrences();
    } catch (err) {
      console.error('Error resetting saved occurrences for week:', err);
      await showAlert('Fehler beim Zurücksetzen der gespeicherten Termine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT' || 
        activeEl.getAttribute('contenteditable') === 'true'
      )) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevWeek();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextWeek();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        jumpToToday();
      } else if (e.key === 'c' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleCopyWeek();
      } else if (e.key === 'v' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (localStorage.getItem('groovelab_copied_week_data')) {
          handlePasteWeek();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleResetWeek();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDate, occurrences, pendingChanges, weekStart]);

  const cleanupDragGhost = () => {
    const ghost = document.getElementById('drag-preview-ghost');
    if (ghost && ghost.parentNode) {
      ghost.parentNode.removeChild(ghost);
    }
  };

  const startAutoScroll = (container: HTMLElement, speed: number) => {
    autoScrollContainerRef.current = container;
    autoScrollSpeedRef.current = speed;
    if (!scrollIntervalRef.current) {
      scrollIntervalRef.current = setInterval(() => {
        if (autoScrollContainerRef.current) {
          const c = autoScrollContainerRef.current;
          const currentSpeed = autoScrollSpeedRef.current;
          if (currentSpeed < 0) {
            c.scrollTop = Math.max(0, c.scrollTop + currentSpeed);
          } else if (currentSpeed > 0) {
            c.scrollTop = Math.min(c.scrollHeight - c.clientHeight, c.scrollTop + currentSpeed);
          }
        }
      }, 16);
    }
  };

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    autoScrollSpeedRef.current = 0;
    autoScrollContainerRef.current = null;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && draggedId) {
        cleanupDragGhost();
        stopAutoScroll();
        setDraggedId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draggedId]);

  const loadPreferencesForDrag = async (studentId: string) => {
    try {
      let targetStudentIds = [studentId];
      let grpId: string | null = null;
      
      const { data: userObj } = await supabase
        .from('users')
        .select('group_id')
        .eq('id', studentId)
        .single();
        
      if (userObj?.group_id) {
        grpId = userObj.group_id;
      }
      
      if (grpId) {
        const { data: grpUsers } = await supabase
          .from('users')
          .select('id')
          .eq('group_id', grpId);
        if (grpUsers && grpUsers.length > 0) {
          targetStudentIds = grpUsers.map((u: any) => u.id);
        }
      }

      const { data: prefsData, error: prefsErr } = await supabase
        .from('student_schedule_preferences')
        .select('*')
        .in('student_id', targetStudentIds);

      if (!prefsErr && prefsData) {
        const combinedPrefs: any[] = [];
        
        for (let day = 1; day <= 5; day++) {
          const slotsCount = 24 * 4; 
          const wunschCounts = Array(slotsCount).fill(0);
          const isGesperrt = Array(slotsCount).fill(false);
          
          targetStudentIds.forEach(sId => {
            const studentPrefs = prefsData.filter(p => p.student_id === sId && Number(p.day_of_week) === day);
            studentPrefs.forEach(pref => {
              const [sh, sm] = pref.start_time.split(':').map(Number);
              const [eh, em] = pref.end_time.split(':').map(Number);
              const startIdx = Math.floor((sh * 60 + sm) / 15);
              const endIdx = Math.ceil((eh * 60 + em) / 15);
              
              for (let i = startIdx; i < endIdx; i++) {
                if (i >= 0 && i < slotsCount) {
                  if (pref.preference_type === 'gesperrt') {
                    isGesperrt[i] = true;
                  } else if (pref.preference_type === 'wunsch') {
                    wunschCounts[i]++;
                  }
                }
              }
            });
          });
          
          let currentType: 'wunsch' | 'gesperrt' | null = null;
          let startIdx = -1;
          
          for (let i = 0; i < slotsCount; i++) {
            let type: 'wunsch' | 'gesperrt' | null = null;
            if (isGesperrt[i]) {
              type = 'gesperrt';
            } else if (wunschCounts[i] === targetStudentIds.length && targetStudentIds.length > 0) {
              type = 'wunsch';
            }
            
            if (type !== currentType) {
              if (currentType && startIdx !== -1) {
                const startTime = `${String(Math.floor((startIdx * 15) / 60)).padStart(2, '0')}:${String((startIdx * 15) % 60).padStart(2, '0')}:00`;
                const endTime = `${String(Math.floor((i * 15) / 60)).padStart(2, '0')}:${String((i * 15) % 60).padStart(2, '0')}:00`;
                combinedPrefs.push({
                  day_of_week: day,
                  start_time: startTime,
                  end_time: endTime,
                  preference_type: currentType
                });
              }
              currentType = type;
              startIdx = type ? i : -1;
            }
          }
          if (currentType && startIdx !== -1) {
            const startTime = `${String(Math.floor((startIdx * 15) / 60)).padStart(2, '0')}:${String((startIdx * 15) % 60).padStart(2, '0')}:00`;
            const endTime = '24:00:00';
            combinedPrefs.push({
              day_of_week: day,
              start_time: startTime,
              end_time: endTime,
              preference_type: currentType
            });
          }
        }
        setSelectedStudentPrefs(combinedPrefs);
      }
    } catch (err) {
      console.error('Error loading preferences on drag start in calendar:', err);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    const sourceOcc = occurrences.find(o => o.id === id);
    const todayYYYYMMDD = new Date().toISOString().split('T')[0];
    if (sourceOcc && sourceOcc.date && sourceOcc.date < todayYYYYMMDD) {
      e.preventDefault();
      alert('🔒 Vergangene Termine sind schreibgeschützt und können nicht verschoben werden.');
      return;
    }

    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    try {
      const blankImg = document.createElement('canvas');
      blankImg.width = 1;
      blankImg.height = 1;
      e.dataTransfer.setDragImage(blankImg, 0, 0);
    } catch (_) {}
    setDraggedId(id);
    draggedOccRef.current = sourceOcc || null;
    
    if (sourceOcc && sourceOcc.student_id && sourceOcc.student_id !== 'vacant') {
      loadPreferencesForDrag(sourceOcc.student_id);
    }
    
    // Save the vertical offset where the card was grabbed relative to top of card
    const cardRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const grabY = Math.max(0, Math.min(e.clientY - cardRect.top, 35));
    grabOffsetRef.current = grabY;
    e.dataTransfer.setData('grabOffset', String(grabY));

    // Precalculate teacher schedule limits for performance optimization during dragging
    const limits: Record<number, { min: number; max: number }> = {};
    (cachedWeekSchedules || []).forEach((s: any) => {
      if (s.teacher_id !== userId) return;
      const day = s.day_of_week;
      const start = timeToMinutes(s.time_slot);
      const end = start + (s.duration || 45);
      if (!limits[day]) {
        limits[day] = { min: start, max: end };
      } else {
        if (start < limits[day].min) limits[day].min = start;
        if (end > limits[day].max) limits[day].max = end;
      }
    });
    teacherScheduleLimitsRef.current = limits;

    // Create a custom Apple-style drag image
    const dragImg = document.createElement('div');
    dragImg.id = 'temp-drag-image';
    dragImg.style.position = 'absolute';
    dragImg.style.top = '-1000px';
    dragImg.style.width = '140px';
    dragImg.style.padding = '8px 12px';
    dragImg.style.borderRadius = '12px';
    dragImg.style.background = 'rgba(255, 255, 255, 0.85)';
    dragImg.style.backdropFilter = 'blur(10px)';
    dragImg.style.border = '1px solid rgba(0,0,0,0.1)';
    dragImg.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
    dragImg.style.color = '#1d1d1f';
    dragImg.style.fontSize = '0.75rem';
    dragImg.style.fontWeight = '700';
    dragImg.style.pointerEvents = 'none';
    dragImg.style.zIndex = '100000';
    
    const nameText = sourceOcc?.student ? `${sourceOcc.student.first_name} ${sourceOcc.student.last_name.substring(0, 1)}.` : 'Pause';
    const instrumentText = sourceOcc?.student?.instrument || '';
    dragImg.innerHTML = `
      <div style="font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${nameText}</div>
      ${instrumentText ? `<div style="font-size: 0.65rem; color: #86868b; margin-top: 1px;">${instrumentText}</div>` : ''}
    `;
    
    document.body.appendChild(dragImg);
    e.dataTransfer.setDragImage(dragImg, 70, 20);
    
    setTimeout(() => {
      if (dragImg.parentNode) {
        dragImg.parentNode.removeChild(dragImg);
      }
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    draggedOccRef.current = null;
    lastSnapMinutesRef.current = null;
    cleanupDragGhost();
    stopAutoScroll();
    setSelectedStudentPrefs([]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragOverDay = (e: React.DragEvent, targetDateStr: string, dayBaselineMinutes: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const rect = e.currentTarget.getBoundingClientRect();
    const grabOffset = Math.min(Math.max(0, grabOffsetRef.current || 0), 40);
    const relativeY = e.clientY - rect.top - grabOffset;
    const droppedMinutes = dayBaselineMinutes + (relativeY / 2.5);
    
    // Snap to grid
    const snap = gridSnapMinutes || 15;
    const snappedMinutes = Math.round(droppedMinutes / snap) * snap;
    
    // Clamp to valid values based on dragged occurrence duration
    const sourceOcc = draggedOccRef.current;
    if (!sourceOcc) return;
    const duration = sourceOcc.duration || 30;
    const clampedMinutes = Math.min(1440 - duration, Math.max(dayBaselineMinutes, snappedMinutes));

    lastSnapMinutesRef.current = { dateStr: targetDateStr, minutes: clampedMinutes };
    
    // Position/update the ghost DOM element directly
    const previewTopPx = (clampedMinutes - dayBaselineMinutes) * 2.5;
    const previewHeightPx = duration * 2.5 - 8;
    const h = Math.floor(clampedMinutes / 60) % 24;
    const m = clampedMinutes % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    
    // Determine if the current drop position is outside the teacher's regular schedule window.
    // Optimized: lookup limits from cached ref populated during dragStart
    const targetDate = new Date(targetDateStr + 'T00:00:00');
    const targetDayOfWeek = targetDate.getDay() || 7; // 1=Mon … 7=Sun
    const limits = teacherScheduleLimitsRef.current[targetDayOfWeek];
    const dragRegMin = limits ? limits.min : Infinity;
    const dragRegMax = limits ? limits.max : -Infinity;
    const hasRegularDragBlock = dragRegMin !== Infinity;
    const dropEnd = clampedMinutes + duration;
    const isDropOutsideSchedule = hasRegularDragBlock && (clampedMinutes < dragRegMin || dropEnd > dragRegMax);

    // Choose ghost color: purple if outside schedule (room booking needed), normal platform color otherwise
    const isCampus = localStorage.getItem('groovelab_active_platform') === 'campus';
    let highlightColor: string;
    let highlightBg: string;
    let ghostBorder: string;
    
    if (isDropOutsideSchedule) {
      // Purple/white diagonal — signals that a room booking will be required
      highlightColor = '#7c3aed';
      highlightBg = 'repeating-linear-gradient(-45deg, rgba(237, 233, 254, 0.85) 0px, rgba(237, 233, 254, 0.85) 8px, rgba(255,255,255,0.85) 8px, rgba(255,255,255,0.85) 16px)';
      ghostBorder = '2px dashed #7c3aed';
    } else {
      highlightColor = isCampus ? '#34a853' : '#007aff';
      highlightBg = isCampus ? 'rgba(52, 168, 83, 0.08)' : 'rgba(0, 122, 255, 0.08)';
      ghostBorder = `2px dashed ${highlightColor}`;
    }
    
    let ghost = document.getElementById('drag-preview-ghost');
    if (!ghost) {
      ghost = document.createElement('div');
      ghost.id = 'drag-preview-ghost';
      ghost.style.position = 'absolute';
      ghost.style.top = '0px';
      ghost.style.left = '8px';
      ghost.style.right = '8px';
      ghost.style.borderRadius = '8px';
      ghost.style.padding = '8px';
      ghost.style.boxSizing = 'border-box';
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = '100';
      ghost.style.display = 'flex';
      ghost.style.flexDirection = 'column';
      ghost.style.justifyContent = 'center';
      ghost.style.opacity = '0.9';
      ghost.style.willChange = 'transform';
      ghost.style.transition = 'none';
    }
    
    ghost.style.transform = `translate3d(0, ${previewTopPx}px, 0) scale(1.02)`;
    ghost.style.boxShadow = '0 12px 28px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.06)';
    ghost.style.height = `${previewHeightPx}px`;
    ghost.style.background = highlightBg;
    ghost.style.border = ghostBorder;
    
    const occDuration = sourceOcc.duration || 30;
    const endMinutes = snappedMinutes + occDuration;
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    const endFormatted = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
    const fullTimeRangeStr = `${timeStr} – ${endFormatted} Uhr (${occDuration}m)`;

    const studentName = sourceOcc.student ? `${sourceOcc.student.first_name} ${maskLastName(sourceOcc.student.last_name, showRealNames)}` : 'Pause';
    const cacheKey = `${fullTimeRangeStr}-${studentName}-${isDropOutsideSchedule ? 'out' : 'in'}`;

    if (ghost.dataset.cacheKey !== cacheKey) {
      ghost.dataset.cacheKey = cacheKey;
      const outsideHint = isDropOutsideSchedule 
        ? `<div style="font-size: 0.60rem; font-weight: 800; color: #7c3aed; background: rgba(124,58,237,0.10); border: 1px solid rgba(124,58,237,0.2); padding: 1px 5px; border-radius: 3px; display: inline-block; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.04em;">🔔 Raum buchen</div>`
        : '';
      ghost.innerHTML = `
        <div style="font-size: 0.72rem; font-weight: 800; color: ${highlightColor};">${fullTimeRangeStr}</div>
        <div style="font-size: 0.78rem; font-weight: 800; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
          ${studentName}
        </div>
        ${outsideHint}
      `;
    }
    
    if (ghost.parentNode !== e.currentTarget) {
      e.currentTarget.appendChild(ghost);
    }

    // Auto-scroll logic if dragging near boundaries
    const scrollContainer = e.currentTarget.closest('.overflow-y-auto') || e.currentTarget;
    if (scrollContainer) {
      const scrollRect = scrollContainer.getBoundingClientRect();
      const relativeCursorY = e.clientY - scrollRect.top;
      const scrollThreshold = 60;
      const maxScrollSpeed = 15;
      
      if (relativeCursorY < scrollThreshold) {
        const speed = -Math.round((scrollThreshold - relativeCursorY) / scrollThreshold * maxScrollSpeed);
        startAutoScroll(scrollContainer as HTMLElement, speed);
      } else if (relativeCursorY > scrollRect.height - scrollThreshold) {
        const speed = Math.round((relativeCursorY - (scrollRect.height - scrollThreshold)) / scrollThreshold * maxScrollSpeed);
        startAutoScroll(scrollContainer as HTMLElement, speed);
      } else {
        stopAutoScroll();
      }
    }
  };

  const touchStateRef = useRef<{
    activeId: string | null;
    targetDateStr: string | null;
    targetBaselineMin: number;
    grabY: number;
  }>({ activeId: null, targetDateStr: null, targetBaselineMin: 0, grabY: 0 });

  const handleTouchStartCard = (e: React.TouchEvent, id: string) => {
    const touch = e.touches[0];
    if (!touch) return;

    const cardRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const grabY = Math.max(0, Math.min(touch.clientY - cardRect.top, 35));
    grabOffsetRef.current = grabY;
    setDraggedId(id);
    const sourceOcc = occurrences.find(o => o.id === id);
    draggedOccRef.current = sourceOcc || null;

    touchStateRef.current = {
      activeId: id,
      targetDateStr: null,
      targetBaselineMin: 0,
      grabY
    };

    if (sourceOcc && sourceOcc.student_id && sourceOcc.student_id !== 'vacant') {
      loadPreferencesForDrag(sourceOcc.student_id);
    }
  };

  const handleTouchMoveCard = (e: React.TouchEvent) => {
    if (!touchStateRef.current.activeId) return;
    const touch = e.touches[0];
    if (!touch) return;

    const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!elemBelow) return;

    const dayCol = elemBelow.closest('.calendar-day-column') as HTMLElement;
    if (dayCol && dayCol.dataset.dateStr) {
      const targetDateStr = dayCol.dataset.dateStr;
      const dayBaselineMinutes = parseFloat(dayCol.dataset.baselineMin || '0');
      
      touchStateRef.current.targetDateStr = targetDateStr;
      touchStateRef.current.targetBaselineMin = dayBaselineMinutes;

      const fakeDragEvent = {
        preventDefault: () => {},
        clientY: touch.clientY,
        currentTarget: dayCol,
        dataTransfer: {
          getData: (key: string) => key === 'grabOffset' ? String(touchStateRef.current.grabY) : touchStateRef.current.activeId
        }
      } as any;

      handleDragOverDay(fakeDragEvent, targetDateStr, dayBaselineMinutes);
    }
  };

  const handleTouchEndCard = async () => {
    const { activeId, targetDateStr } = touchStateRef.current;
    cleanupDragGhost();
    stopAutoScroll();

    if (activeId && targetDateStr) {
      const ghost = document.getElementById('drag-preview-ghost');
      let snappedMinutes = 0;
      if (ghost && ghost.dataset.snappedMin) {
        snappedMinutes = parseInt(ghost.dataset.snappedMin, 10);
      }
      if (snappedMinutes > 0) {
        await executeRippleDownShift(activeId, targetDateStr, snappedMinutes);
      }
    }

    touchStateRef.current = { activeId: null, targetDateStr: null, targetBaselineMin: 0, grabY: 0 };
    setDraggedId(null);
  };

  const handleDragLeaveDay = (e: React.DragEvent) => {
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    cleanupDragGhost();
    stopAutoScroll();
  };

  const executeRippleDownShift = async (sourceId: string, targetDateStr: string, snappedMin: number) => {
    const sourceOcc = occurrences.find(o => o.id === sourceId);
    if (!sourceOcc) return;

    const updatesMap: Record<string, Partial<ScheduleOccurrence>> = {};
    const formattedStartTime = `${String(Math.floor(snappedMin / 60) % 24).padStart(2, '0')}:${String(snappedMin % 60).padStart(2, '0')}:00`;

    // 1. Find all members of the dragged appointment/group
    const groupOccs = sourceOcc.student_id ? occurrences.filter(o => 
      o.student_id && 
      o.student_id !== 'vacant' &&
      o.date === sourceOcc.date && 
      o.start_time === sourceOcc.start_time && 
      (o.schedules?.room_id || null) === (sourceOcc.schedules?.room_id || null)
    ) : [sourceOcc];

    groupOccs.forEach(go => {
      updatesMap[go.id] = {
        date: targetDateStr,
        start_time: formattedStartTime,
        status: 'pending_reschedule'
      };
    });

    // Do NOT shift downstream occurrences. Each appointment stays at its own assigned time.
    updateMultipleOccurrences(updatesMap, 'Termin verschoben');
  };

  const handleDropOnDay = async (e: React.DragEvent, targetDateStr: string, dayBaselineMinutes: number) => {
    e.preventDefault();
    cleanupDragGhost();
    stopAutoScroll();
    if ((currentUserRole === 'admin' || currentUserRole === 'secretary') && !hasSubmittedSchedule) {
      await showAlert('Raumzuteilungen oder Verschiebungen sind gesperrt, da dieser Stundenplan noch nicht eingereicht wurde.');
      return;
    }
    const sourceId = e.dataTransfer.getData('text/plain') || draggedId || (draggedOccRef.current ? draggedOccRef.current.id : '');
    if (!sourceId) return;

    const sourceOcc = occurrences.find(o => o.id === sourceId);
    const duration = sourceOcc?.duration || 30;

    const snapMinutes = (lastSnapMinutesRef.current && lastSnapMinutesRef.current.dateStr === targetDateStr)
      ? lastSnapMinutesRef.current.minutes
      : null;

    let snappedMinutes = snapMinutes;
    if (snappedMinutes === null || isNaN(snappedMinutes)) {
      const rect = e.currentTarget.getBoundingClientRect();
      const grabOffset = Math.min(Math.max(0, grabOffsetRef.current || 0), 40);
      const relativeY = Math.max(0, e.clientY - rect.top - grabOffset);
      const droppedMinutes = dayBaselineMinutes + (relativeY / 2.5);
      const snap = gridSnapMinutes || 15;
      snappedMinutes = Math.min(1440 - duration, Math.max(dayBaselineMinutes, Math.round(droppedMinutes / snap) * snap));
    }

    lastSnapMinutesRef.current = null;

    await executeRippleDownShift(sourceId, targetDateStr, snappedMinutes);
    setDraggedId(null);
  };

  const handleDropOnVacant = async (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedId || (draggedOccRef.current ? draggedOccRef.current.id : '');
    if (!sourceId) return;

    const grabOffsetStr = e.dataTransfer.getData('grabOffset');
    const grabOffset = grabOffsetStr ? parseFloat(grabOffsetStr) : 0;

    if ((currentUserRole === 'admin' || currentUserRole === 'secretary') && !hasSubmittedSchedule) {
      await showAlert('Dieser Stundenplan ist noch ein Entwurf und wurde noch nicht eingereicht. Zuteilung oder Änderungen sind gesperrt.');
      return;
    }

    const sourceOcc = occurrences.find(o => o.id === sourceId);
    if (!sourceOcc) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top - grabOffset;
    const droppedMinutes = 0 + (relativeY / 2.5);
    const snappedMinutes = Math.round(droppedMinutes / (gridSnapMinutes || 15)) * (gridSnapMinutes || 15);
    if (isNaN(snappedMinutes)) return;
    const hours = Math.floor(snappedMinutes / 60) % 24;
    const mins = snappedMinutes % 60;
    const targetStartTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;

    const roomId = sourceOcc.schedules?.room_id || null;
    const existingStudentOcc = occurrences.find(o => 
      o.id !== sourceId && 
      o.student_id && 
      o.student_id !== 'vacant' && 
      o.date === targetDateStr && 
      o.start_time.substring(0, 5) === targetStartTime.substring(0, 5) && 
      (o.schedules?.room_id || null) === roomId &&
      !['cancelled', 'canceled_by_student'].includes(o.status)
    );

    if (existingStudentOcc && e.altKey) {
      executeOccurrenceSwap(sourceId, existingStudentOcc.id);
      setDraggedId(null);
      return;
    }

    const conflict = getRoomConflict(sourceId, targetDateStr, targetStartTime, sourceOcc.duration, roomId);
    if (conflict) {
      const roomName = sourceOcc.schedules?.room?.name || 'diesem Raum';
      const confirmMsg = `Warnung: Der Raum "${roomName}" ist an diesem Tag um ${targetStartTime.substring(0, 5)} Uhr bereits belegt durch:\n- ${conflict}\n\nMöchtest du den Termin trotzdem dorthin verschieben?`;
      if (!await showConfirm(confirmMsg)) {
        setDraggedId(null);
        return;
      }
    }

    moveOccurrenceOrGroup(sourceId, { date: targetDateStr, start_time: targetStartTime, status: 'pending_reschedule' });
    setDraggedId(null);
  };

  const executeOccurrenceSwap = async (sourceId: string, targetId: string) => {
    const sourceOcc = occurrences.find(o => o.id === sourceId);
    const targetOcc = occurrences.find(o => o.id === targetId);
    if (!sourceOcc || !targetOcc) return;

    // Detect if either slot is a cancelled lesson
    const isSourceCancelled = ['cancelled', 'canceled_by_student'].includes(sourceOcc.status);
    const isTargetCancelled = ['cancelled', 'canceled_by_student'].includes(targetOcc.status);

    if (isSourceCancelled || isTargetCancelled) {
      const cancelledOcc = isSourceCancelled ? sourceOcc : targetOcc;
      const normalOcc = isSourceCancelled ? targetOcc : sourceOcc;

      // Check conflict for the normal occurrence moving to the cancelled occurrence's time
      const normalRoomId = normalOcc.schedules?.room_id || null;
      const conflict = getRoomConflict(normalOcc.id, cancelledOcc.date, cancelledOcc.start_time, normalOcc.duration, normalRoomId, cancelledOcc.id);
      if (conflict) {
        const roomName = normalOcc.schedules?.room?.name || 'diesem Raum';
        const confirmMsg = `Warnung: Der Raum "${roomName}" ist an diesem Tag um ${cancelledOcc.start_time.substring(0, 5)} Uhr bereits belegt durch:\n- ${conflict}\n\nMöchtest du den Termin trotzdem verschieben?`;
        if (!await showConfirm(confirmMsg)) {
          setDraggedId(null);
          return;
        }
      }

      setSwapConfirmState({
        sourceId: normalOcc.id,
        targetId: cancelledOcc.id,
        sourceStudentName: `${normalOcc.student?.first_name || ''} ${maskLastName(normalOcc.student?.last_name || '', showRealNames)}`.trim() || 'Schüler',
        targetStudentName: `${cancelledOcc.student?.first_name || ''} ${maskLastName(cancelledOcc.student?.last_name || '', showRealNames)}`.trim() || 'Schüler',
        sourceDate: normalOcc.date,
        sourceStartTime: normalOcc.start_time,
        targetDate: cancelledOcc.date,
        targetStartTime: cancelledOcc.start_time
      });
      setDraggedId(null);
      return;
    }

    // Standard swap check conflicts for both
    const sourceRoomId = sourceOcc.schedules?.room_id || null;
    const targetRoomId = targetOcc.schedules?.room_id || null;

    const sourceConflict = getRoomConflict(sourceId, targetOcc.date, targetOcc.start_time, sourceOcc.duration, sourceRoomId, targetId);
    const targetConflict = getRoomConflict(targetId, sourceOcc.date, sourceOcc.start_time, targetOcc.duration, targetRoomId, sourceId);

    if (sourceConflict || targetConflict) {
      let conflictsText = '';
      if (sourceConflict) {
        const roomName = sourceOcc.schedules?.room?.name || 'Raum';
        conflictsText += `\n- Für ${sourceOcc.student?.first_name || 'Schüler'} in Raum "${roomName}": belegt durch ${sourceConflict}`;
      }
      if (targetConflict) {
        const roomName = targetOcc.schedules?.room?.name || 'Raum';
        conflictsText += `\n- Für ${targetOcc.student?.first_name || 'Schüler'} in Raum "${roomName}": belegt durch ${targetConflict}`;
      }

      const confirmMsg = `Warnung: Beim Tauschen gibt es Raumbelegungs-Konflikte:${conflictsText}\n\nMöchtest du die Termine trotzdem tauschen?`;
      if (!await showConfirm(confirmMsg)) {
        setDraggedId(null);
        return;
      }
    }

    // Swapping handles groups:
    const isSrcGroup = occurrences.some(o => 
      o.id !== sourceId && 
      o.student_id && 
      o.student_id !== 'vacant' &&
      o.date === sourceOcc.date && 
      o.start_time === sourceOcc.start_time && 
      (o.schedules?.room_id || null) === (sourceOcc.schedules?.room_id || null)
    );
    const srcGroupOccs = isSrcGroup ? occurrences.filter(o => 
      o.student_id && 
      o.student_id !== 'vacant' &&
      o.date === sourceOcc.date && 
      o.start_time === sourceOcc.start_time && 
      (o.schedules?.room_id || null) === (sourceOcc.schedules?.room_id || null)
    ) : [sourceOcc];

    const isTgtGroup = occurrences.some(o => 
      o.id !== targetId && 
      o.student_id && 
      o.student_id !== 'vacant' &&
      o.date === targetOcc.date && 
      o.start_time === targetOcc.start_time && 
      (o.schedules?.room_id || null) === (targetOcc.schedules?.room_id || null)
    );
    const tgtGroupOccs = isTgtGroup ? occurrences.filter(o => 
      o.student_id && 
      o.student_id !== 'vacant' &&
      o.date === targetOcc.date && 
      o.start_time === targetOcc.start_time && 
      (o.schedules?.room_id || null) === (targetOcc.schedules?.room_id || null)
    ) : [targetOcc];

    const updatesMap: Record<string, Partial<ScheduleOccurrence>> = {};
    srcGroupOccs.forEach(o => {
      updatesMap[o.id] = { 
        student_id: o.student_id,
        date: targetOcc.date, 
        start_time: targetOcc.start_time, 
        original_date: o.original_date || o.date,
        original_start_time: o.original_start_time || o.start_time,
        status: 'pending_reschedule',
        student_acknowledged: false
      };
    });
    tgtGroupOccs.forEach(o => {
      updatesMap[o.id] = { 
        student_id: o.student_id,
        date: sourceOcc.date, 
        start_time: sourceOcc.start_time, 
        original_date: o.original_date || o.date,
        original_start_time: o.original_start_time || o.start_time,
        status: 'pending_reschedule',
        student_acknowledged: false
      };
    });

    updateMultipleOccurrences(updatesMap);
    setSwapLinks(prev => [...prev, { id1: sourceId, id2: targetId }]);
    
    setDraggedId(null);
  };

  const handleDropOnOccurrence = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if ((currentUserRole === 'admin' || currentUserRole === 'secretary') && !hasSubmittedSchedule) {
      await showAlert('Raumzuteilungen oder Verschiebungen sind gesperrt, da dieser Stundenplan noch nicht eingereicht wurde.');
      return;
    }
    const sourceId = e.dataTransfer.getData('text/plain') || draggedId || (draggedOccRef.current ? draggedOccRef.current.id : '');
    if (!sourceId || sourceId === targetId) return;

    const sourceOcc = occurrences.find(o => o.id === sourceId);
    const targetOcc = occurrences.find(o => o.id === targetId);
    if (!sourceOcc || !targetOcc) return;

    // Prevent swapping with break / pause / vacant slots due to duration mismatch
    const isSourceBreak = !sourceOcc.student_id || sourceOcc.student_id === 'vacant';
    const isTargetBreak = !targetOcc.student_id || targetOcc.student_id === 'vacant';

    if (isSourceBreak || isTargetBreak) {
      if (isTargetBreak && !isSourceBreak) {
        // Room conflict check for source student moving to break slot's position
        const sourceRoomId = sourceOcc.schedules?.room_id || null;
        const conflict = getRoomConflict(sourceId, targetOcc.date, targetOcc.start_time, sourceOcc.duration, sourceRoomId, targetId);
        if (conflict) {
          const roomName = sourceOcc.schedules?.room?.name || 'diesem Raum';
          const confirmMsg = `Warnung: Der Raum "${roomName}" ist an diesem Tag um ${targetOcc.start_time.substring(0, 5)} Uhr bereits belegt durch:\n- ${conflict}\n\nMöchtest du den Termin trotzdem dorthin verschieben?`;
          if (!await showConfirm(confirmMsg)) {
            setDraggedId(null);
            return;
          }
        }

        const isSourceGroup = sourceOcc.isGroupBlock || occurrences.some(o => 
          o.id !== sourceOcc.id && 
          o.student_id && 
          o.student_id !== 'vacant' &&
          o.date === sourceOcc.date && 
          o.start_time === sourceOcc.start_time && 
          (o.schedules?.room_id || null) === (sourceOcc.schedules?.room_id || null)
        );
        const sourceGroupOccs = isSourceGroup ? occurrences.filter(o => 
          o.student_id && 
          o.student_id !== 'vacant' &&
          o.date === sourceOcc.date && 
          o.start_time === sourceOcc.start_time && 
          (o.schedules?.room_id || null) === (sourceOcc.schedules?.room_id || null)
        ) : [sourceOcc];

        const displayName = isSourceGroup 
          ? 'die Ensemble- / Bandstunde (ganze Gruppe)' 
          : (sourceOcc.student?.first_name || 'den Schüler');

        const confirmMsg = `Möchtest du ${displayName} auf die Position der Pause (${targetOcc.start_time.substring(0, 5)} Uhr) verschieben? \n\nHinweis: Dadurch werden alle nachfolgenden Unterrichtsstunden dieses Tages automatisch lückenlos nach hinten verschoben (Sliding-Modus).`;
        if (await showConfirm(confirmMsg)) {
          const updatesMap: Record<string, Partial<ScheduleOccurrence>> = {};
          
          sourceGroupOccs.forEach(go => {
            updatesMap[go.id] = { 
              date: targetOcc.date, 
              start_time: targetOcc.start_time, 
              status: 'pending_reschedule' 
            };
          });

          const addMins = (t: string, mins: number) => {
            const [h, m] = t.split(':').map(Number);
            const total = h * 60 + m + mins;
            return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
          };

          // 2. Shift the target break/pause directly behind the student (e.g. 16:00 + 30 min = 16:30)
          const breakNewStartTime = addMins(targetOcc.start_time, sourceOcc.duration);
          updatesMap[targetOcc.id] = {
            start_time: breakNewStartTime,
            status: 'pending_reschedule'
          };

          // 3. Find and shift all subsequent student and break appointments of this day lückenlos
          const sameDayOccs = occurrences.filter(o => 
            o.date === targetOcc.date && 
            !sourceGroupOccs.some(go => go.id === o.id) && 
            o.id !== targetId &&
            o.student_id !== 'vacant' &&
            o.start_time.localeCompare(targetOcc.start_time) > 0
          ).sort((a, b) => a.start_time.localeCompare(b.start_time));

          // Subsequent slots start after the shifted break ends (e.g. 16:30 + 15 min = 16:45)
          let nextTime = addMins(breakNewStartTime, targetOcc.duration);

          sameDayOccs.forEach(occ => {
            updatesMap[occ.id] = { 
              start_time: nextTime, 
              status: 'pending_reschedule' 
            };
            nextTime = addMins(nextTime, occ.duration);
          });

          updateMultipleOccurrences(updatesMap, 'Termine lückenlos verschoben');
          setDraggedId(null);
          return;
        }
      }

      await showAlert('Tausch blockiert: Ein Unterrichtstermin kann nicht mit einer Pause oder einem freien Slot getauscht werden.');
      setDraggedId(null);
      return;
    }

    // Since neither is a break, show the Drag & Drop Merge / Swap decision popup!
    setDropDecisionState({ sourceId, targetId });
  };

  const handleSaveEdit = async () => {
    if (!editOccState) return;
    const occ = occurrences.find(o => o.id === editOccState.id);
    if (!occ) {
      setEditOccState(null);
      return;
    }

    if (activeModalTab === 'protocol') {
      setLoading(true);
      try {
        // 1. Determine status and notes updates
        let statusUpdate = occ.status;
        if (lessonAttendance === 'excused' || lessonAttendance === 'unexcused') {
          statusUpdate = 'cancelled';
        } else if (lessonAttendance === 'attended') {
          if (occ.status === 'cancelled') {
            statusUpdate = occ.original_date ? 'rescheduled_confirmed' : 'scheduled';
          }
        }

        let notesUpdate = '';
        if (lessonAttendance === 'excused') {
          notesUpdate = `[Entschuldigt] ${lessonHomework}`;
        } else if (lessonAttendance === 'unexcused') {
          notesUpdate = `[Unentschuldigt] ${lessonHomework}`;
        } else {
          notesUpdate = lessonTopic;
        }

        // 2. Persist occurrence
        await persistOccurrenceDirectly(occ.id, { 
          status: statusUpdate as any, 
          notes: notesUpdate 
        });

        // 3. Save progress matrix is now handled directly inside the MeisterwerkDocumentationModal to prevent status overwrites.

        // 4. Send Direct Message & Push Notification
        if (occ.student_id && occ.student_id !== 'vacant') {
          let systemMsg = '';
          if (lessonAttendance === 'attended') {
            systemMsg = `[Stundenprotokoll] Thema: ${lessonTopic}\nHausaufgabe: ${lessonHomework || 'Keine Hausaufgabe'}`;
          } else if (lessonAttendance === 'excused') {
            systemMsg = `[Fehlzeit] Entschuldigt gefehlt. Grund: ${lessonHomework || 'Kein Grund angegeben'}`;
          } else if (lessonAttendance === 'unexcused') {
            systemMsg = `[Fehlzeit] Unentschuldigt gefehlt.`;
          }

          if (systemMsg) {
            await supabase.from('campus_direct_messages').insert({
              sender_id: userId,
              recipient_id: occ.student_id,
              content: systemMsg,
              occurrence_id: occ.id
            });

            try {
              const displayMsg = systemMsg.replace(/\[.*?\]/, '').trim();
              const { data: dbNotif } = await supabase
                .from('notifications')
                .insert({
                  user_id: occ.student_id,
                  title: 'Stundenprotokoll eingetragen 📝',
                  message: displayMsg,
                  metadata: { occurrence_id: occ.id, type: 'lesson_protocol' }
                })
                .select('id')
                .single();

              await supabase.functions.invoke('send-push', {
                body: {
                  userId: occ.student_id,
                  title: 'Stundenprotokoll eingetragen 📝',
                  body: displayMsg,
                  url: '/',
                  notificationId: dbNotif ? dbNotif.id : null
                }
              });
            } catch (pushErr) {
              console.warn('Error sending push for lesson protocol:', pushErr);
            }
          }
        }

        await loadOccurrences();
      } catch (err: any) {
        console.error('Error saving lesson record:', err);
        await showAlert('Fehler beim Speichern des Protokolls: ' + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      const formattedTime = editOccState.start_time.length === 5 ? `${editOccState.start_time}:00` : editOccState.start_time;
      
      const isGroupOcc = occ.isGroupBlock || occurrences.some(o => 
        o.id !== occ.id && 
        o.student_id && 
        o.student_id !== 'vacant' &&
        o.date === occ.date && 
        o.start_time === occ.start_time && 
        (o.schedules?.room_id || null) === (occ.schedules?.room_id || null)
      );

      const groupOccs = isGroupOcc ? occurrences.filter(o => 
        o.student_id && 
        o.student_id !== 'vacant' &&
        o.date === occ.date && 
        o.start_time === occ.start_time && 
        (o.schedules?.room_id || null) === (occ.schedules?.room_id || null)
      ) : [occ];

      if (editOccState.room_id) {
        const conflict = getRoomConflict(editOccState.id, editOccState.date, formattedTime, editOccState.duration || occ.duration, editOccState.room_id);
        if (conflict) {
          const roomName = rooms.find(r => r.id === editOccState.room_id)?.name || 'diesem Raum';
          const confirmMsg = `Warnung: Der Raum "${roomName}" ist an diesem Tag um ${formattedTime.substring(0, 5)} Uhr bereits belegt durch:\n- ${conflict}\n\nMöchtest du den Termin trotzdem verschieben/buchen?`;
          if (!await showConfirm(confirmMsg)) {
            return;
          }
        }
      }

      const updatesMap: Record<string, Partial<ScheduleOccurrence>> = {};
      groupOccs.forEach(o => {
        const updatedSchedules = o.schedules ? {
          ...o.schedules,
          room_id: editOccState.room_id,
          room: { name: rooms.find(r => r.id === editOccState.room_id)?.name || '' }
        } : {
          room_id: editOccState.room_id,
          room: { name: rooms.find(r => r.id === editOccState.room_id)?.name || '' }
        };

        const templateRoomId = o.template_room_id !== undefined ? o.template_room_id : (o.schedules?.room_id || null);

        updatesMap[o.id] = {
          date: editOccState.date,
          start_time: formattedTime,
          status: 'pending_reschedule',
          schedules: updatedSchedules,
          template_room_id: templateRoomId,
          duration: editOccState.duration !== undefined ? editOccState.duration : o.duration
        };
      });

      updateMultipleOccurrences(updatesMap, 'Terminzeit/Raum geändert');
    }

    setEditOccState(null);
  };
  const savePendingChanges = async () => {
    const changes = Object.values(pendingChanges);
    setActionToast(prev => prev ? { ...prev, visible: false } : null);
    try {
      await persistChangesDirectly(changes);
      setPendingChanges({});
      await loadOccurrences();
    } catch (err: any) {
      console.error("Save error:", err);
      await showAlert("Fehler beim Speichern der Änderungen: " + (err.message || err));
    }
  };

  const handleCancel = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    updateOccurrence(id, { status: 'cancelled' }, 'Unterricht als abgesagt markiert');
  };

  const handleCancelBreak = async (e: React.MouseEvent, breakOcc: ScheduleOccurrence) => {
    e.stopPropagation();
    
    const confirmDelete = await showConfirm("Möchtest du diese Pause wirklich löschen?");
    if (!confirmDelete) return;

    const confirmSlide = await showConfirm("Sollen alle nachfolgenden Termine dieses Tages lückenlos vorgezogen werden?");

    const updatesMap: Record<string, Partial<ScheduleOccurrence>> = {};
    updatesMap[breakOcc.id] = { status: 'cancelled' };

    if (confirmSlide) {
      const addMins = (t: string, mins: number) => {
        const [h, m] = t.split(':').map(Number);
        const total = h * 60 + m + mins;
        return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
      };

      const sameDayOccs = occurrences.filter(o => 
        o.date === breakOcc.date && 
        o.id !== breakOcc.id &&
        o.student_id !== 'vacant' &&
        o.status !== 'cancelled' &&
        o.start_time.localeCompare(breakOcc.start_time) > 0
      ).sort((a, b) => a.start_time.localeCompare(b.start_time));

      let nextTime = breakOcc.start_time;

      sameDayOccs.forEach(occ => {
        updatesMap[occ.id] = { 
          start_time: nextTime, 
          status: 'pending_reschedule' 
        };
        nextTime = addMins(nextTime, occ.duration);
      });
    }

    updateMultipleOccurrences(updatesMap, 'Pause entfernt');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return { bg: 'rgba(230, 244, 234, 0.45)', border: '#34a853', text: '#34a853' };
      case 'cancelled':
      case 'teacher_sick':
      case 'canceled_by_teacher_sick':
        return { bg: 'rgba(254, 226, 226, 0.45)', border: '#ef4444', text: '#991b1b' };
      case 'pending_reschedule': return { bg: 'rgba(254, 243, 199, 0.45)', border: '#f59e0b', text: '#92400e' };
      case 'rescheduled_confirmed': return { bg: 'rgba(230, 244, 234, 0.45)', border: '#34a853', text: '#34a853' };
      default: return { bg: 'rgba(241, 245, 249, 0.45)', border: '#cbd5e1', text: '#475569' };
    }
  };

  const isOccurrenceAGap = (occ: ScheduleOccurrence, dayOccs: ScheduleOccurrence[]) => {
    const isVacantOrBreak = !occ.student_id || occ.student_id === 'vacant';
    if (!isVacantOrBreak) return false;
    if (occ.status === 'cancelled') return false;

    // Filter to find active lessons of that day
    const activeLessons = dayOccs.filter(o => o.student_id && o.student_id !== 'vacant' && o.status !== 'cancelled');
    if (activeLessons.length < 2) return false;

    const occStart = timeToMinutes(occ.start_time);
    
    // Find earliest start time and latest end time of active lessons
    let minStart = Infinity;
    let maxEnd = -Infinity;
    activeLessons.forEach(l => {
      const start = timeToMinutes(l.start_time);
      const end = start + (l.duration || 45);
      if (start < minStart) minStart = start;
      if (end > maxEnd) maxEnd = end;
    });

    const occEnd = occStart + (occ.duration || 45);
    return occStart >= minStart && occEnd <= maxEnd;
  };

  const onMouseEnterHelper = (e: React.MouseEvent, isResetPending: boolean, occ: any) => {
    e.stopPropagation();
    setHoveredTooltip({
      text: isResetPending ? "Wartet auf Schüler-Bestätigung" : (occ.status === 'rescheduled_confirmed' || occ.student_acknowledged ? "Termin verschoben und bestätigt" : "Termin verschoben (ausstehend)"),
      x: e.clientX,
      y: e.clientY,
      visible: true
    });
  };

  const activeRooms = useMemo(() => {
    const ids = new Set<string>();
    occurrences.forEach((occ: any) => {
      const rid = occ.schedules?.room_id || occ.room_id;
      if (rid) ids.add(rid);
    });
    cachedWeekSchedules.forEach((s: any) => {
      if (s.teacher_id === userId && s.room_id) {
        ids.add(s.room_id);
      }
    });
    const activeIds = Array.from(ids);
    if (activeIds.length > 0) {
      return rooms.filter(r => activeIds.includes(r.id));
    }
    return rooms;
  }, [occurrences, cachedWeekSchedules, userId, rooms]);

  const getOtherRoomOccupancies = (dateStr: string, roomId: string) => {
    const dayDate = new Date(dateStr);
    const dayOfWeek = dayDate.getDay() || 7;
    const intervals: { start: number; end: number; type: string }[] = [];

    // 1. Template schedules of other teachers
    cachedWeekSchedules.forEach((s: any) => {
      if (s.room_id === roomId && s.teacher_id !== userId && s.day_of_week === dayOfWeek) {
        const start = timeToMinutes(s.time_slot);
        const end = start + (s.duration || 45);
        const hasCancelledOcc = cachedWeekOccurrences.some(o => 
          o.schedule_id === s.id && 
          o.date === dateStr && 
          ['cancelled', 'canceled_by_student'].includes(o.status)
        );
        if (!hasCancelledOcc) {
          intervals.push({ start, end, type: 'template' });
        }
      }
    });

    // 2. Room bookings (of other teachers and own manual reservations)
    cachedWeekRoomBookings.forEach((rb: any) => {
      if (rb.room_id === roomId && rb.date === dateStr) {
        if (rb.booked_by === userId && rb.title?.startsWith('Unterricht:')) {
          return;
        }
        const start = timeToMinutes(rb.start_time);
        const end = timeToMinutes(rb.end_time || rb.start_time);
        const duration = end > start ? (end - start) : 45;
        intervals.push({ start, end: start + duration, type: 'booking' });
      }
    });

    // 3. Occurrences of other teachers
    cachedWeekOccurrences.forEach((o: any) => {
      if (o.teacher_id !== userId && o.date === dateStr && o.status !== 'cancelled') {
        const booking = cachedWeekRoomBookings.find(b => 
          b.date === o.date && 
          b.start_time.substring(0, 5) === o.start_time.substring(0, 5) &&
          b.booked_by === o.teacher_id
        );
        const currentRoomId = booking ? booking.room_id : (o.schedules?.room_id);
        if (currentRoomId === roomId) {
          const start = timeToMinutes(o.start_time);
          const end = start + (o.duration || 45);
          if (!intervals.some(inv => inv.start === start && inv.type === 'template')) {
            intervals.push({ start, end, type: 'occurrence' });
          }
        }
      }
    });

    intervals.sort((a, b) => a.start - b.start);
    const merged: typeof intervals = [];
    intervals.forEach(inv => {
      if (merged.length === 0) {
        merged.push(inv);
      } else {
        const last = merged[merged.length - 1];
        if (inv.start < last.end) {
          last.end = Math.max(last.end, inv.end);
        } else {
          merged.push(inv);
        }
      }
    });

    return merged;
  };

  // Master Synchronized Time Grid Vector (Google Calendar Standard)
  // Calculates global minStartMinutes across all active day columns so all columns align 100% horizontally.
  const globalMinStartMinutes = useMemo(() => {
    // Find the exact earliest start time across all active occurrences this week (e.g. 13:15 -> 795 mins).
    const activeTimes = occurrences
      .filter(occ => occ.status !== 'cancelled' && occ.start_time)
      .map(occ => timeToMinutes(occ.start_time));
    if (activeTimes.length === 0) return 8 * 60; // Default 08:00 if no occurrences
    return Math.min(...activeTimes); // Start exactly at the earliest appointment without gap!
  }, [occurrences]);

  const globalMaxEndMinutes = useMemo(() => {
    let maxMin = 20 * 60; // Default 20:00
    occurrences.forEach(occ => {
      if (occ.status !== 'cancelled' && occ.start_time) {
        const m = timeToMinutes(occ.start_time) + (occ.duration || 30);
        if (m > maxMin) maxMin = Math.ceil(m / 60) * 60; // ceil to whole hour
      }
    });
    return Math.min(23 * 60, Math.max(20 * 60, maxMin));
  }, [occurrences]);

  // Google Calendar Overlap Splitting Layout Calculation
  const calculateOverlapColumns = (dayOccs: ScheduleOccurrence[]) => {
    const sorted = [...dayOccs].sort((a, b) => {
      const sa = timeToMinutes(a.start_time);
      const sb = timeToMinutes(b.start_time);
      if (sa !== sb) return sa - sb;
      return (b.duration || 30) - (a.duration || 30);
    });

    const clusters: ScheduleOccurrence[][] = [];
    let currentCluster: ScheduleOccurrence[] = [];
    let clusterEnd = -1;

    sorted.forEach(occ => {
      const start = timeToMinutes(occ.start_time);
      const end = start + (occ.duration || 30);

      if (currentCluster.length === 0) {
        currentCluster.push(occ);
        clusterEnd = end;
      } else if (start < clusterEnd) {
        currentCluster.push(occ);
        if (end > clusterEnd) clusterEnd = end;
      } else {
        clusters.push(currentCluster);
        currentCluster = [occ];
        clusterEnd = end;
      }
    });
    if (currentCluster.length > 0) clusters.push(currentCluster);

    const layoutMap = new Map<string, { colIndex: number; totalCols: number }>();

    clusters.forEach(cluster => {
      const colEnds: number[] = [];

      cluster.forEach(occ => {
        const start = timeToMinutes(occ.start_time);
        const end = start + (occ.duration || 30);

        let placedCol = -1;
        for (let i = 0; i < colEnds.length; i++) {
          if (colEnds[i] <= start) {
            placedCol = i;
            colEnds[i] = end;
            break;
          }
        }
        if (placedCol === -1) {
          placedCol = colEnds.length;
          colEnds.push(end);
        }

        layoutMap.set(occ.id, { colIndex: placedCol, totalCols: 1 });
      });
      const totalColsInCluster = colEnds.length;
      cluster.forEach(occ => {
        const existing = layoutMap.get(occ.id);
        if (existing) {
          existing.totalCols = totalColsInCluster;
        }
      });
    });

    return layoutMap;
  };

  const isTeacherScheduleUnlocked = useMemo(() => {
    // Admin or secretary always sees Röntgen rooms if schedule exists
    if (currentUserRole === 'admin' || currentUserRole === 'secretary') return true;
    
    // For teacher: schedule must be submitted and approved by administration
    if ((scheduleStatus as string) === 'approved') return true;
    if (hasSubmittedSchedule && (scheduleStatus as string) === 'approved') {
      return true;
    }
    
    // If database schedules exist with an approved status or assigned room_id for this teacher
    if (cachedWeekSchedules && cachedWeekSchedules.some((s: any) => (userId ? s.teacher_id === userId : true) && s.status === 'approved' && !!s.room_id)) {
      return true;
    }
    
    return false;
  }, [scheduleStatus, hasSubmittedSchedule, cachedWeekSchedules, userId, currentUserRole]);

  const isLockedForTeacher = currentUserRole === 'teacher' && !isTeacherScheduleUnlocked;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      <style>{`
        @keyframes pulse-yellow {
          0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          70% { transform: scale(1.2); opacity: 0.8; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        .pulse-yellow-indicator {
          animation: pulse-yellow 2s infinite;
        }
        .apple-btn-group {
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 10px;
          padding: 3px;
          display: flex;
          align-items: center;
          gap: 2px;
          backdrop-filter: blur(10px);
        }
        .apple-btn {
          background: transparent;
          border: none;
          color: #475569;
          border-radius: 7px;
          padding: 6px 12px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 6px;
          min-height: 30px;
          outline: none;
        }
        .apple-btn:hover {
          background: rgba(0, 0, 0, 0.04);
          color: #1d1d1f;
        }
        .apple-btn:active {
          transform: scale(0.97);
        }
        .apple-btn.active {
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          font-weight: 700;
        }
        .apple-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          pointer-events: none;
        }
        .schedule-gap-slot {
          background-image: repeating-linear-gradient(45deg, rgba(0,0,0,0.01) 0px, rgba(0,0,0,0.01) 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px) !important;
          border: 1.5px dashed rgba(0,0,0,0.15) !important;
          box-shadow: none !important;
        }
        .schedule-gap-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.65rem;
          font-weight: 800;
          color: #64748b;
          background: rgba(0, 0, 0, 0.04);
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
      `}</style>
      
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.65)', 
        backdropFilter: 'blur(30px) saturate(210%)', 
        borderRadius: '16px', 
        padding: '12px 16px', 
        border: '1px solid rgba(255, 255, 255, 0.6)', 
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.03)', 
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Row 1: Title & Main Navigation */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', width: '100%', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ height: '32px', width: '32px', borderRadius: '8px', background: 'rgba(52, 168, 83, 0.12)', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarIcon size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  KW {weekNumber}
                </h2>
                <span style={{ color: '#86868b', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  ({weekStart.toLocaleDateString('de-DE')} - {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString('de-DE')})
                </span>
              </div>
              {(currentUserRole === 'admin' || currentUserRole === 'secretary') && teachers && teachers.length > 0 && selectedTeacherId && setSelectedTeacherId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#86868b' }}>Lehrkraft:</span>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      borderRadius: '6px',
                      padding: '2px 6px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#1d1d1f',
                      outline: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Center: Tab switch */}
          {activeTab && setActiveTab && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div id="tour-calendar-switch" className="app-segmented-switch" style={{ margin: 0, padding: '3px', gap: '4px', minHeight: '36px', display: 'flex', alignItems: 'center' }}>
                <button 
                  onClick={() => setActiveTab('calendar')}
                  className={`app-segmented-switch-btn ${(activeTab as string) === 'calendar' ? 'active' : ''}`}
                  style={{ padding: '6px 12px', fontSize: '0.78rem', lineHeight: '1.2' }}
                >
                  Stundenplan
                </button>
                <button 
                  onClick={() => setActiveTab('designer')}
                  className={`app-segmented-switch-btn ${(activeTab as string) === 'designer' ? 'active' : ''}`}
                  style={{ padding: '6px 12px', fontSize: '0.78rem', lineHeight: '1.2' }}
                >
                  Stundenplan-Designer
                </button>
              </div>
              {currentUserRole === 'teacher' && onStartTour && (
                <button
                  type="button"
                  onClick={onStartTour}
                  style={{
                    background: 'rgba(255, 255, 255, 0.65)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#86868b',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                  title="Anleitung / Tour starten"
                  onMouseOver={e => e.currentTarget.style.color = '#1d1d1f'}
                  onMouseOut={e => e.currentTarget.style.color = '#86868b'}
                >
                  <Info size={16} />
                </button>
              )}

              {/* Grid Snap Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '4px 10px', height: '32px', boxSizing: 'border-box' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'Urbanist' }}>Raster:</span>
                <select
                  value={gridSnapMinutes}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setGridSnapMinutes(val);
                    localStorage.setItem('groovelab_grid_snap_minutes', String(val));
                  }}
                  style={{
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    background: 'transparent',
                    outline: 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <option value={30}>30 Min</option>
                  <option value={15}>15 Min</option>
                  <option value={5}>5 Min</option>
                </select>
              </div>
            </div>
          )}

          {/* Right: Spacer for centering */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }} />
        </div>

        {/* Divider line */}
        <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.06)', margin: '0 -4px' }} />

        {/* Row 2: Röntgen Filter & Utilities */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
          {/* Left: Röntgen selector */}
          <div id="tour-calendar-xray" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.03)', padding: '3px 8px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.04)' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Search size={11} style={{ strokeWidth: 3 }} /> Röntgen-Ansicht:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {isTeacherScheduleUnlocked ? (
                  activeRooms.map(room => {
                    const isActive = selectedRoomIdForXRay === room.id;
                    const isCampus = localStorage.getItem('groovelab_active_platform') === 'campus';
                    const primaryColor = isCampus ? '#34a853' : '#ea4335';
                    return (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoomIdForXRay(prev => prev === room.id ? null : room.id)}
                        style={{
                          background: isActive ? primaryColor : '#ffffff',
                          color: isActive ? '#ffffff' : '#475569',
                          border: `1px solid ${isActive ? primaryColor : 'rgba(0,0,0,0.08)'}`,
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '30px'
                        }}
                      >
                        {room.name}
                      </button>
                    );
                  })
                ) : (
                  <span style={{ 
                    fontSize: '0.72rem', 
                    color: '#ea4335', 
                    fontWeight: 600, 
                    background: '#fce8e6', 
                    padding: '4px 10px', 
                    borderRadius: '6px', 
                    display: 'inline-flex', 
                    alignItems: 'center',
                    minHeight: '28px'
                  }}>
                    Stundenplan noch nicht eingereicht & freigegeben
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Unified Segmented Control for View & Actions */}
            <div id="tour-calendar-actions" className="apple-btn-group">
              {/* Namen / Datenschutz Toggle */}
              <button
                type="button"
                onClick={() => toggleRealNames()}
                className={`apple-btn ${showRealNames ? 'active' : ''}`}
                style={{ color: showRealNames ? '#ea4335' : undefined }}
                title={showRealNames ? "Namen sind geschützt (Nachnamen gekürzt) – klicken zum Anzeigen" : "Vollständige Namen werden angezeigt – klicken zum Schützen"}
              >
                {showRealNames ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showRealNames ? "Namen schützen" : "Namen anzeigen"}</span>
              </button>

              {/* Group A: Ansicht & Filter */}
              <button
                type="button"
                onClick={() => setShowWeekend(prev => !prev)}
                className={`apple-btn ${isWeekendVisible ? 'active' : ''}`}
                style={isWeekendVisible ? { color: textAccentColor } : {}}
                title={isWeekendVisible ? 'Wochenende ausblenden' : 'Wochenende einblenden'}
              >
                <CalendarIcon size={13} />
                <span>Wochenende</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsGroupModeActive(prev => !prev);
                  setSelectedForGroup([]);
                }}
                className={`apple-btn ${isGroupModeActive ? 'active' : ''}`}
                style={isGroupModeActive ? { color: '#2563eb', background: '#eff6ff', borderColor: '#bfdbfe', fontWeight: 700 } : {}}
                title="Gruppenunterricht organisieren"
              >
                <Users size={13} style={{ color: isGroupModeActive ? '#2563eb' : undefined }} />
                <span>Gruppen</span>
              </button>

              <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} />

              {/* Group B: Wochen-Aktionen */}
              <button
                onClick={handleCopyWeek}
                className="apple-btn"
                title="Kopiert alle aktiven Unterrichtstermine dieser Woche"
              >
                <Copy size={13} />
                <span>Kopieren</span>
              </button>

              <button
                onClick={handlePasteWeek}
                className="apple-btn"
                disabled={!localStorage.getItem('groovelab_copied_week_data')}
                title="Fügt die kopierten Unterrichtstermine in diese Woche ein (überschreibt bestehende)"
              >
                <Clipboard size={13} />
                <span>Einfügen</span>
              </button>

              <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} />

              <button
                onClick={handleResetWeek}
                className="apple-btn"
                style={{ color: '#ef4444' }}
                title="Alle ungespeicherten Änderungen in dieser Woche verwerfen"
              >
                <Trash2 size={13} />
                <span>Zurücksetzen</span>
              </button>
            </div>

            {/* Merge Selected Action (Floating outside groups since it's a primary CTA) */}
            {isGroupModeActive && selectedForGroup.length >= 2 && (
              <button
                type="button"
                onClick={handleMergeSelectedOccurrences}
                className="apple-btn active"
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                  borderRadius: '8px'
                }}
              >
                <span>Zusammenführen ({selectedForGroup.length})</span>
              </button>
            )}

            {/* Save Pending Changes Action (Floating primary CTA) */}
            {Object.keys(pendingChanges).length > 0 && (
              <button 
                onClick={savePendingChanges}
                className="apple-btn active"
                style={{
                  background: brandColor,
                  color: '#ffffff',
                  fontWeight: 700,
                  boxShadow: `0 2px 8px ${brandColor}33`,
                  borderRadius: '8px'
                }}
              >
                <span>Speichern & Schüler informieren ({Object.keys(pendingChanges).length})</span>
              </button>
            )}

            {/* View Mode Switcher */}
            <div className="apple-btn-group">
              <button
                type="button"
                onClick={() => {
                  setViewMode('day');
                  if (focusedDayOffset === null) setFocusedDayOffset(0);
                }}
                className={`apple-btn ${viewMode === 'day' ? 'active' : ''}`}
                style={viewMode === 'day' ? { color: textAccentColor } : {}}
              >
                Tag
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('week');
                  setFocusedDayOffset(null);
                }}
                className={`apple-btn ${viewMode === 'week' ? 'active' : ''}`}
                style={viewMode === 'week' ? { color: textAccentColor } : {}}
              >
                Woche
              </button>
            </div>

            {/* Group C: Navigation & Datum */}
            <div className="apple-btn-group">
              <button onClick={prevWeek} className="apple-btn" style={{ padding: '6px 8px' }} title="Vorherige Woche"><ChevronLeft size={14} /></button>
              <button onClick={jumpToToday} className="apple-btn" title="Aktuelle Woche anzeigen">Heute</button>
              <button onClick={nextWeek} className="apple-btn" style={{ padding: '6px 8px' }} title="Nächste Woche"><ChevronRight size={14} /></button>
              
              <div style={{ height: '16px', width: '1px', background: 'rgba(0,0,0,0.08)', margin: '0 2px' }} />

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="date"
                  value={toLocalYYYYMMDD(currentDate)}
                  onChange={(e) => {
                    if (e.target.value) {
                      setCurrentDate(new Date(e.target.value));
                    }
                  }}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                />
                <button className="apple-btn" style={{ pointerEvents: 'none' }}>
                  <CalendarIcon size={13} />
                  <span>{currentDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!hasSubmittedSchedule && (currentUserRole === 'admin' || currentUserRole === 'secretary') && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
          color: '#b45309',
          borderRadius: '16px',
          padding: '12px 20px',
          fontSize: '0.82rem',
          fontWeight: 650,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.03)'
        }}>
          <AlertCircle size={16} />
          <span>Diese Lehrkraft hat ihren Stundenplan noch nicht eingereicht (nur Entwurf). Die Raumzuteilung ist gesperrt.</span>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10, overflow: 'visible' }}>
          <defs>
            <marker id="arrowUp" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="0">
              <polygon points="5 0, 10 10, 0 10" fill="#f59e0b" />
            </marker>
            <marker id="arrowDown" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="0">
              <polygon points="0 0, 10 0, 5 10" fill="#f59e0b" />
            </marker>
          </defs>
          {lassoPaths.map((p, i) => {
            const distX = Math.abs(p.x2 - p.x1);
            const isVertical = distX < 20;
            const isP1Top = p.y1 <= p.y2;
            
            let pathD = "";
            if (isVertical) {
              const cx = Math.max(p.x1, p.x2) + 80;
              const cy = (p.y1 + p.y2) / 2;
              pathD = `M ${p.x1} ${p.y1} Q ${cx} ${cy} ${p.x2} ${p.y2}`;
            } else {
              const cx = (p.x1 + p.x2) / 2;
              const cy = Math.min(p.y1, p.y2) - Math.max(60, distX * 0.3); 
              pathD = `M ${p.x1} ${p.y1} Q ${cx} ${cy} ${p.x2} ${p.y2}`;
            }

            const startMarker = isP1Top ? "url(#arrowUp)" : "url(#arrowDown)";
            const endMarker = isP1Top ? "url(#arrowDown)" : "url(#arrowUp)";
            
            return (
              <path 
                key={i}
                d={pathD}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3"
                strokeDasharray="8 6"
                strokeLinecap="round"
                markerStart={startMarker}
                markerEnd={endMarker}
                style={{ filter: 'drop-shadow(0px 3px 6px rgba(245, 158, 11, 0.4))', animation: 'dash 1.5s linear infinite' }}
              />
            );
          })}
        </svg>

        <style>
          {`
            @keyframes dash {
              to {
                stroke-dashoffset: -10;
              }
            }
          `}
        </style>

        <div id="tour-calendar-grid" ref={gridRef} style={{ 
          display: 'grid', 
          position: 'relative',
          gridTemplateColumns: focusedDayOffset !== null ? '1fr' : (isWeekendVisible ? 'repeat(7, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))'), 
          gap: '0px',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          padding: '20px 8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}>
          {isLockedForTeacher && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingTop: '120px',
              textAlign: 'center',
              padding: '2rem'
            }}>
              <div style={{
                position: 'sticky',
                top: '200px',
                background: '#ffffff',
                padding: '2rem',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                maxWidth: '450px',
                border: '1px solid #e2e8f0'
              }}>
                <span style={{ fontSize: '3.5rem', marginBottom: '1rem', display: 'block', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>🔒</span>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', color: '#1e293b', fontWeight: 800 }}>Stundenplan in Prüfung</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '1rem', lineHeight: '1.6' }}>
                  Dein Stundenplan befindet sich aktuell in der Zuteilung durch das Sekretariat. 
                  Sobald dieser freigegeben ist, kannst du hier deine Termine sehen und bearbeiten.
                </p>
              </div>
            </div>
          )}
        {[0, 1, 2, 3, 4, 5, 6].filter(offset => focusedDayOffset !== null ? offset === focusedDayOffset : (isWeekendVisible || offset < 5)).map(offset => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + offset);
          const dateStr = toLocalYYYYMMDD(dayDate);
          
          const dayOfWeek = dayDate.getDay() || 7;
          const daySchedules = cachedWeekSchedules.filter((s: any) => s.day_of_week === dayOfWeek && s.teacher_id === userId);
          let regMin = Infinity;
          let regMax = -Infinity;
          daySchedules.forEach(s => {
            const start = timeToMinutes(s.time_slot);
            const duration = s.duration || 45;
            const end = start + duration;
            if (start < regMin) regMin = start;
            if (end > regMax) regMax = end;
          });
          const hasRegularBlock = regMin !== Infinity;

          const dayOccurrences = occurrences
            .filter(o => o.date === dateStr)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
          const dayName = dayDate.toLocaleDateString('de-DE', { weekday: 'long' });
          const activeHoliday = holidays.find(h => dateStr >= h.start && dateStr <= h.end);

          const nativeOccs = dayOccurrences.filter(o => {
            const isBreak = !o.student_id;
            const isCancelledBreak = isBreak && o.status === 'cancelled';
            return !isCancelledBreak && (!o.original_date || o.original_date === dateStr);
          });

          const movedInOccs = dayOccurrences.filter(o => {
            return o.original_date && o.original_date !== dateStr;
          });

          // Calculate individual baseline for this specific day so each day column starts bündig at its own first appointment
          const activeDayTimes = dayOccurrences
            .filter(o => o.status !== 'cancelled' && o.start_time)
            .map(o => timeToMinutes(o.start_time));
          
          const dayBaselineMinutes = activeDayTimes.length > 0 ? Math.min(...activeDayTimes) : globalMinStartMinutes;
          
          const columnHeight = (1440 - dayBaselineMinutes) * 2.5;
          const startHour = Math.ceil(dayBaselineMinutes / 60);
          const markers = [];
          for (let h = startHour; h <= 24; h++) {
            markers.push({
              hour: h,
              top: (h * 60 - dayBaselineMinutes) * 2.5
            });
          }

          const isLastCol = focusedDayOffset !== null || offset === 6 || (!isWeekendVisible && offset === 4);
          return (
            <div 
              key={offset} 
              style={{ 
                background: 'transparent', 
                padding: '0 16px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                minHeight: '400px',
                borderRight: isLastCol ? 'none' : '1px solid #e2e8f0',
                transition: 'all 0.3s ease'
              }}
            >
              <div 
                onClick={() => setFocusedDayOffset(focusedDayOffset === offset ? null : offset)}
                style={{
                  textAlign: 'center',
                  paddingBottom: '8px',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  cursor: 'pointer',
                  borderRadius: '12px',
                  padding: '6px',
                  transition: 'background 0.2s',
                  userSelect: 'none',
                  position: 'relative'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                title={focusedDayOffset === offset ? "Zurück zur Wochenansicht" : "Diesen Tag vergrößern (Fokus-Ansicht)"}
              >
                {focusedDayOffset === offset && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedDayOffset(null);
                    }}
                    className="apple-btn"
                    style={{
                      background: 'rgba(0, 0, 0, 0.05)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      marginBottom: '6px',
                      color: '#475569',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      minHeight: '24px'
                    }}
                  >
                    <X size={10} />
                    <span>Wochenansicht</span>
                  </button>
                )}
                {(() => {
                  const todayStr = toLocalYYYYMMDD(currentDate);
                  const isToday = dateStr === todayStr;
                  return (
                    <>
                      <div style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 800, 
                        color: isToday ? textAccentColor : '#86868b', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em' 
                      }}>
                        {dayName}
                      </div>
                      <div style={{
                        fontSize: '0.9rem',
                        fontWeight: 900,
                        color: isToday ? '#ffffff' : '#1d1d1f',
                        background: isToday ? brandColor : 'transparent',
                        padding: isToday ? '3px 10px' : '0px',
                        borderRadius: isToday ? '12px' : '0px',
                        boxShadow: isToday ? `0 2px 6px ${brandColor}33` : 'none',
                        marginTop: isToday ? '2px' : '0px',
                        display: 'inline-block',
                        lineHeight: isToday ? '1.4' : 'inherit'
                      }}>
                        {dayDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </div>
                    </>
                  );
                })()}
                {activeHoliday && (
                  <div style={{
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    color: textAccentColor,
                    background: lightBg,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginTop: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Palmtree size={10} strokeWidth={2.5} />
                    {activeHoliday.name}
                  </div>
                )}
              </div>

              <div
                className="calendar-day-column"
                data-date-str={dateStr}
                onDragOver={(e) => handleDragOverDay(e, dateStr, dayBaselineMinutes)}
                onDragLeave={handleDragLeaveDay}
                onDrop={(e) => handleDropOnDay(e, dateStr, dayBaselineMinutes)}
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickY = e.clientY - rect.top;
                  const clickedMinutes = dayBaselineMinutes + (clickY / 2.5);
                  const snappedMinutes = Math.round(clickedMinutes / gridSnapMinutes) * gridSnapMinutes;
                  const h = Math.floor(snappedMinutes / 60) % 24;
                  const m = snappedMinutes % 60;
                  const startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
                  setQuickCreateState({ isOpen: true, date: dateStr, start_time: startTime });
                }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', height: `${columnHeight}px`, minHeight: `${columnHeight}px`, cursor: 'pointer' }}
              >
                {/* Interactive Preferences Overlays (Roentgen Matrix View) */}
                {draggedId && (() => {
                  const dayOfWeek = dayDate.getDay() === 0 ? 7 : dayDate.getDay();
                  const blockCount = Math.floor((1440 - dayBaselineMinutes) / 15);
                  const matchedTypes: ('wunsch' | 'gesperrt' | null)[] = Array(blockCount).fill(null);
                  
                  for (let i = 0; i < blockCount; i++) {
                    const blockStart = dayBaselineMinutes + i * 15;
                    const blockEnd = blockStart + 15;
                    
                    selectedStudentPrefs.forEach(pref => {
                      if (pref.day_of_week === dayOfWeek) {
                        const [ph, pm] = pref.start_time.split(':').map(Number);
                        const [peh, pem] = pref.end_time.split(':').map(Number);
                        const prefStart = ph * 60 + pm;
                        const prefEnd = peh * 60 + pem;
                        
                        if (blockStart < prefEnd && blockEnd > prefStart) {
                          if (pref.preference_type === 'gesperrt') {
                            matchedTypes[i] = 'gesperrt';
                          } else if (pref.preference_type === 'wunsch' && matchedTypes[i] !== 'gesperrt') {
                            matchedTypes[i] = 'wunsch';
                          }
                        }
                      }
                    });
                  }

                  const mergedBlocks = [];
                  let currentType: 'wunsch' | 'gesperrt' | null = null;
                  let startIndex = -1;

                  for (let i = 0; i < blockCount; i++) {
                    const type = matchedTypes[i];
                    if (type !== currentType) {
                      if (currentType && startIndex !== -1) {
                        mergedBlocks.push({
                          type: currentType,
                          top: (startIndex * 15) * 2.5,
                          height: ((i - startIndex) * 15) * 2.5
                        });
                      }
                      currentType = type;
                      startIndex = type ? i : -1;
                    }
                  }
                  if (currentType && startIndex !== -1) {
                    mergedBlocks.push({
                      type: currentType,
                      top: (startIndex * 15) * 2.5,
                      height: ((blockCount - startIndex) * 15) * 2.5
                    });
                  }

                  return mergedBlocks.map((b, idx) => (
                    <div
                      key={idx}
                      className={b.type === 'gesperrt' ? 'roentgen-blocked' : 'roentgen-preferred'}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${b.top}px`,
                        height: `${b.height}px`,
                        zIndex: 3,
                        boxSizing: 'border-box',
                        pointerEvents: 'none'
                      }}
                    />
                  ));
                })()}
                {/* Column Background Layout: White = teacher's regular schedule block (regMin–regMax), gray outside.
                    The white area is FIXED to the Stundenplan-Designer schedule — it never changes when
                    appointments are dragged in or out of the window. */}
                {(() => {
                  const activeOccs = dayOccurrences.filter(o => {
                    const isBreak = !o.student_id;
                    if (isBreak && o.status === 'cancelled') return false;
                    return o.status !== 'cancelled';
                  });

                  // Use the regular schedule block (regMin/regMax) as the FIXED white area anchor.
                  // Fall back to dynamic earliest/latest only when no Stundenplan block exists for this day.
                  let whiteStart: number;
                  let whiteEnd: number;

                  if (hasRegularBlock) {
                    // Fixed: anchored to the teacher's submitted schedule (e.g. 14:00–18:45)
                    whiteStart = regMin;
                    whiteEnd = regMax;
                  } else if (activeOccs.length === 0) {
                    // No schedule, no appointments → full grey column
                    return (
                      <div 
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: 0,
                          height: `${(1440 - dayBaselineMinutes) * 2.5}px`,
                          background: 'rgba(241, 245, 249, 0.45)',
                          zIndex: 0,
                          pointerEvents: 'none'
                        }}
                      />
                    );
                  } else {
                    // No submitted schedule: fall back to dynamic earliest/latest of actual appointments
                    let earliestStart = 1440;
                    let latestEnd = 0;
                    activeOccs.forEach((o: any) => {
                      const start = timeToMinutes(o.start_time);
                      const end = start + (o.duration || 45);
                      if (start < earliestStart) earliestStart = start;
                      if (end > latestEnd) latestEnd = end;
                    });
                    whiteStart = earliestStart;
                    whiteEnd = latestEnd;
                  }

                  const topGrayHeight = Math.max(0, (whiteStart - dayBaselineMinutes) * 2.5);
                  const bottomGrayTop = Math.max(0, (whiteEnd - dayBaselineMinutes) * 2.5);
                  const bottomGrayHeight = Math.max(0, (1440 - whiteEnd) * 2.5);

                  return (
                    <>
                      {/* White background for the teacher's regular schedule window */}
                      <div 
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: `${Math.max(0, (whiteStart - dayBaselineMinutes) * 2.5)}px`,
                          height: `${Math.max(0, (whiteEnd - whiteStart) * 2.5)}px`,
                          background: '#ffffff',
                          zIndex: 0,
                          pointerEvents: 'none'
                        }}
                      />
                      {/* Gray overlay BEFORE schedule block */}
                      {topGrayHeight > 0 && (
                        <div 
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: 0,
                            height: `${topGrayHeight}px`,
                            background: 'rgba(241, 245, 249, 0.45)',
                            zIndex: 0,
                            pointerEvents: 'none'
                          }}
                        />
                      )}
                      {/* Gray overlay AFTER schedule block */}
                      {bottomGrayHeight > 0 && (
                        <div 
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${bottomGrayTop}px`,
                            height: `${bottomGrayHeight}px`,
                            background: 'rgba(241, 245, 249, 0.45)',
                            zIndex: 0,
                            pointerEvents: 'none'
                          }}
                        />
                      )}
                    </>
                  );
                })()}

                {selectedRoomIdForXRay && getOtherRoomOccupancies(dateStr, selectedRoomIdForXRay).map((inv, idx) => {
                  const top = (inv.start - dayBaselineMinutes) * 2.5;
                  const height = (inv.end - inv.start) * 2.5;
                  return (
                    <div
                      key={`xray-${idx}`}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${top}px`,
                        height: `${height}px`,
                        background: 'repeating-linear-gradient(-45deg, rgba(148, 163, 184, 0.12) 0px, rgba(148, 163, 184, 0.12) 8px, transparent 8px, transparent 16px)',
                        border: '1.5px dashed rgba(148, 163, 184, 0.4)',
                        borderRadius: '8px',
                        zIndex: 1,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box'
                      }}
                    >
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#475569',
                        background: 'rgba(255, 255, 255, 0.95)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        🔒 Besetzt
                      </span>
                    </div>
                  );
                })}

                {/* Real-time Apple Calendar style Snap Ghost Preview Card calculated directly in DOM */}

                {markers.map(m => (
                  <div 
                    key={m.hour} 
                    style={{ 
                      position: 'absolute', 
                      left: 0, 
                      right: 0, 
                      top: `${m.top}px`, 
                      borderTop: '1px dashed rgba(0, 0, 0, 0.05)', 
                      height: 0,
                      pointerEvents: 'none',
                      zIndex: 0
                    }}
                  >
                    <span style={{ 
                      position: 'absolute', 
                      left: '4px', 
                      top: '-7px', 
                      fontSize: '0.6rem', 
                      color: 'rgba(0,0,0,0.25)', 
                      fontWeight: 600 
                    }}>
                      {String(m.hour).padStart(2, '0')}:00
                    </span>
                  </div>
                ))}

                {/* Google Calendar Real-Time "Red Jet-Line" Current Time Indicator */}
                {(() => {
                  const todayStr = toLocalYYYYMMDD(currentDate);
                  const isToday = dateStr === todayStr;
                  if (!isToday) return null;

                  const currentMin = currentMinutes;
                  if (currentMin < dayBaselineMinutes || currentMin > 24 * 60) return null;

                  const redTopPx = (currentMin - dayBaselineMinutes) * 2.5;

                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: '-4px',
                        right: '-4px',
                        top: `${redTopPx}px`,
                        height: '2px',
                        background: '#ea4335',
                        zIndex: 25,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        boxShadow: '0 0 8px rgba(234, 67, 53, 0.6)'
                      }}
                    >
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#ea4335',
                          marginLeft: '-4px',
                          boxShadow: '0 0 6px rgba(234, 67, 53, 0.8)'
                        }}
                      />
                    </div>
                  );
                })()}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.75rem' }}>Lade...</div>
              ) : dayOccurrences.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 500 }}>Keine Termine</div>
              ) : (() => {
                const lastEndTimeMinutes = dayBaselineMinutes;
                
                // Grouping logic for rendering
                const renderedGroups: { key: string, occurrences: any[], mainOcc: any }[] = [];
                dayOccurrences.forEach(occ => {
                  const isBreak = !occ.student_id;
                  const isVacant = occ.student_id === 'vacant';
                  if (isBreak || isVacant) {
                    renderedGroups.push({
                      key: occ.id,
                      occurrences: [occ],
                      mainOcc: occ
                    });
                  } else {
                    const room_id = occ.schedules?.room_id || null;
                    const existing = renderedGroups.find(g => 
                      g.mainOcc.student_id && 
                      g.mainOcc.student_id !== 'vacant' &&
                      g.mainOcc.start_time === occ.start_time &&
                      (g.mainOcc.schedules?.room_id || null) === room_id &&
                      g.mainOcc.student_id !== occ.student_id &&
                      !g.occurrences.some(o => o.student_id === occ.student_id)
                    );
                    if (existing) {
                      existing.occurrences.push(occ);
                    } else {
                      renderedGroups.push({
                        key: `${occ.date}_${occ.start_time}_${room_id || 'noroom'}`,
                        occurrences: [occ],
                        mainOcc: occ
                      });
                    }
                  }
                });

                // Sort each group's occurrences so that the one that has not been rescheduled from another slot is first,
                // ensuring the first selected/target student acts as the placeholder/mainOcc.
                renderedGroups.forEach(group => {
                  if (group.occurrences.length > 1) {
                    group.occurrences.sort((a, b) => {
                      const aMoved = a.original_date && a.original_date !== a.date;
                      const bMoved = b.original_date && b.original_date !== b.date;
                      if (aMoved && !bMoved) return 1;
                      if (!aMoved && bMoved) return -1;
                      return 0;
                    });
                    group.mainOcc = group.occurrences[0];
                  }
                });

                // Layout calculation to avoid visual overlaps between rendered calendar cards
                const groupLayouts = new Map<string, { left: number; width: number; colIndex: number; totalCols: number }>();
                
                try {
                  // 1. Sort real student groups by start time (ignoring gaps and breaks)
                  const sortedGroups = [...renderedGroups]
                    .filter(g => !g.mainOcc.isGap && !g.mainOcc.isBreak && g.mainOcc.student_id !== 'vacant')
                    .sort((a, b) => {
                      const aStart = timeToMinutes(a.mainOcc.start_time);
                      const bStart = timeToMinutes(b.mainOcc.start_time);
                      return aStart - bStart;
                    });

                  // 2. Find overlapping clusters
                  const clusters: any[][] = [];
                  sortedGroups.forEach(group => {
                    const start = timeToMinutes(group.mainOcc.start_time);
                    const duration = group.mainOcc.duration || 30;
                    const end = start + duration;

                    let placed = false;
                    for (let i = 0; i < clusters.length; i++) {
                      const cluster = clusters[i];
                      const overlapsCluster = cluster.some(cg => {
                        const cgStart = timeToMinutes(cg.mainOcc.start_time);
                        const cgEnd = cgStart + (cg.mainOcc.duration || 30);
                        return start < cgEnd && end > cgStart;
                      });

                      if (overlapsCluster) {
                        cluster.push(group);
                        placed = true;
                        break;
                      }
                    }

                    if (!placed) {
                      clusters.push([group]);
                    }
                  });

                  // 3. For each cluster, distribute columns
                  clusters.forEach(cluster => {
                    const columns: any[][] = [];
                    cluster.forEach(group => {
                      const start = timeToMinutes(group.mainOcc.start_time);
                      const end = start + (group.mainOcc.duration || 30);

                      let colIndex = 0;
                      while (true) {
                        if (!columns[colIndex]) {
                          columns[colIndex] = [];
                        }

                        const hasOverlap = columns[colIndex].some(cg => {
                          const cgStart = timeToMinutes(cg.mainOcc.start_time);
                          const cgEnd = cgStart + (cg.mainOcc.duration || 30);
                          return start < cgEnd && end > cgStart;
                        });

                        if (!hasOverlap) {
                          columns[colIndex].push(group);
                          break;
                        }
                        colIndex++;
                      }
                    });

                    const totalCols = columns.length;
                    columns.forEach((colGroups, colIndex) => {
                      colGroups.forEach(group => {
                        const left = (colIndex / totalCols) * 100;
                        const width = (1 / totalCols) * 100;
                        groupLayouts.set(group.key, { left, width, colIndex, totalCols });
                      });
                    });
                  });
                } catch (layoutErr) {
                  console.error('Error calculating visual overlap layout:', layoutErr);
                }

                return renderedGroups.map(group => {
                  const layout = groupLayouts.get(group.key);
                  const occurrencesInGroup = group.occurrences;
                  const isGroup = occurrencesInGroup.length > 1;
                  const occ = group.mainOcc;
                  
                  const isBreak = !occ.student_id;
                  const isVacant = occ.student_id === 'vacant';

                  if (isBreak && ['cancelled', 'canceled_by_student'].includes(occ.status)) {
                    return null;
                  }

                   const isSick = !isBreak && !isVacant && (
                    occ.status === 'teacher_sick' || 
                    occ.status === 'canceled_by_teacher_sick' ||
                    (sickUntil && (!sickStart || occ.date >= sickStart) && occ.date <= sickUntil)
                  );

                  const isExcused = !isBreak && !isVacant && occ.status === 'cancelled' && !!occ.notes?.startsWith('[Entschuldigt]');
                  const isUnexcused = !isBreak && !isVacant && occ.status === 'cancelled' && !!occ.notes?.startsWith('[Unentschuldigt]');
                  const hasProtocol = !isBreak && !isVacant && !['cancelled', 'canceled_by_student'].includes(occ.status) && !isSick && !!occ.notes?.trim();

                  const colors = isBreak 
                    ? { bg: '#fff7ed', border: '#f97316', text: '#c2410c' } 
                    : isSick 
                      ? { bg: 'rgba(254, 226, 226, 0.45)', border: '#ef4444', text: '#991b1b' }
                      : isExcused
                        ? { bg: 'rgba(245, 158, 11, 0.05)', border: '#f59e0b', text: '#b45309' }
                        : isUnexcused
                          ? { bg: 'rgba(239, 68, 68, 0.05)', border: '#ef4444', text: '#b91c1c' }
                          : isVacant
                            ? { bg: 'rgba(52, 168, 83, 0.02)', border: '#34a853', text: '#34a853' }
                            : getStatusColor(occ.status);
                  
                  const isGap = isOccurrenceAGap(occ, dayOccurrences);
                  const finalColors = isGap 
                    ? { bg: 'rgba(148, 163, 184, 0.03)', border: 'rgba(148, 163, 184, 0.3)', text: '#64748b' }
                    : (isVacant ? { bg: `${brandColor}03`, border: brandColor, text: textAccentColor } : { ...colors });
                  let cardBackground = '';
 
                  const isRoomOverridden = occ.template_room_id !== undefined && occ.template_room_id !== (occ.schedules?.room_id || null);
                  const isCancelled = ['cancelled', 'canceled_by_student'].includes(occ.status);

                  const studentSchedule = cachedWeekSchedules.find((s: any) => s.student_id === occ.student_id && s.teacher_id === userId);
                  
                  let boardDayOfWeek: number | null = null;
                  let boardAssignedTime: string | null = null;
                  if (!studentSchedule && boards) {
                    for (const board of boards) {
                      const studentInBoard = board.students.find((s: any) => s.studentId === occ.student_id || s.id === occ.student_id);
                      if (studentInBoard) {
                        boardDayOfWeek = board.dayOfWeek;
                        boardAssignedTime = studentInBoard.assignedTime;
                        break;
                      }
                    }
                  }

                  const occDateObj = new Date(occ.date + 'T00:00:00');
                  const occDayOfWeek = occDateObj.getDay() || 7;
                  
                  let isTimeOrDayMoved = false;
                  if (studentSchedule) {
                    isTimeOrDayMoved = studentSchedule.day_of_week !== occDayOfWeek ||
                                       studentSchedule.time_slot?.substring(0, 5) !== occ.start_time.substring(0, 5);
                  } else if (boardDayOfWeek !== null && boardAssignedTime !== null) {
                    isTimeOrDayMoved = boardDayOfWeek !== occDayOfWeek ||
                                       boardAssignedTime.substring(0, 5) !== occ.start_time.substring(0, 5);
                  } else {
                    isTimeOrDayMoved = (occ.original_date && occ.original_date !== occ.date) ||
                                       (occ.original_start_time && occ.start_time && occ.original_start_time.substring(0, 5) !== occ.start_time.substring(0, 5)) || false;
                  }

                  const isRescheduled = !isBreak && !isVacant && !isSick && (
                    occ.status === 'pending_reschedule' || 
                    occ.status === 'rescheduled_confirmed' ||
                    isTimeOrDayMoved ||
                    (occ.original_date && occ.original_date !== occ.date) ||
                    (occ.original_start_time && occ.start_time && occ.original_start_time.substring(0, 5) !== occ.start_time.substring(0, 5)) ||
                    isRoomOverridden
                  );
                  const isResetPending = false;
 
                  const isConfirmedReschedule = isRescheduled && (occ.status === 'rescheduled_confirmed' || occ.student_acknowledged === true);

                  const isWaiting = !isBreak && !isVacant && !isSick && !isConfirmedReschedule && (
                    isGroup 
                      ? occurrencesInGroup.some(o => o.status === 'pending_reschedule' || (o.student_acknowledged === false && Boolean(o.original_date)))
                      : (occ.status === 'pending_reschedule' || isTimeOrDayMoved || (occ.student_acknowledged === false && Boolean(occ.original_date)))
                  );

                  const isGroovelab = localStorage.getItem('groovelab_active_platform') !== 'campus';

                  if (!isBreak && !isVacant && !isSick && !isCancelled) {
                    if (isGroup) {
                      if (isWaiting) {
                        cardBackground = 'repeating-linear-gradient(-45deg, #f0f9ff 0px, #f0f9ff 8px, #ffffff 8px, #ffffff 16px)';
                        finalColors.border = '#38bdf8';
                        finalColors.text = '#0369a1';
                      } else if (isConfirmedReschedule) {
                        cardBackground = 'repeating-linear-gradient(-45deg, #e0f2fe 0px, #e0f2fe 8px, #ffffff 8px, #ffffff 16px)';
                        finalColors.border = '#0284c7';
                        finalColors.text = '#0369a1';
                      } else {
                        cardBackground = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)';
                        finalColors.border = '#0284c7';
                        finalColors.text = '#0369a1';
                      }
                    } else if (isGroovelab) {
                      if (isWaiting) {
                        cardBackground = 'repeating-linear-gradient(-45deg, #fffbeb 0px, #fffbeb 8px, #ffffff 8px, #ffffff 16px)';
                        finalColors.border = '#eab308';
                        finalColors.text = '#713f12';
                      } else {
                        cardBackground = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
                        finalColors.border = '#eab308';
                        finalColors.text = '#713f12';
                      }
                    } else {
                      // Campus: yellow-dashed for pending / green-dashed for confirmed / solid green for regular
                      if (isWaiting) {
                        cardBackground = 'repeating-linear-gradient(-45deg, #fefce8 0px, #fefce8 8px, #ffffff 8px, #ffffff 16px)';
                        finalColors.border = '#eab308';
                        finalColors.text = '#854d0e';
                      } else if (isConfirmedReschedule) {
                        cardBackground = 'repeating-linear-gradient(-45deg, #e6f4ea 0px, #e6f4ea 8px, #ffffff 8px, #ffffff 16px)';
                        finalColors.border = '#34a853';
                        finalColors.text = '#1e7e34';
                      } else {
                        cardBackground = 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)';
                        finalColors.border = '#34a853';
                        finalColors.text = '#34a853';
                      }
                    }
                  }
 
                  const occStartMinutes = timeToMinutes(occ.start_time);
                  const occEndMinutes = occStartMinutes + (occ.duration || 45);
                  const topPx = (occStartMinutes - dayBaselineMinutes) * 2.5;
                  const currentRoomId = occ.schedules?.room_id || null;
                  const roomDaySchedules = cachedWeekSchedules.filter((s: any) => 
                    s.day_of_week === dayOfWeek && 
                    s.teacher_id === userId &&
                    s.room_id === currentRoomId
                  );
                  let roomRegMin = Infinity;
                  let roomRegMax = -Infinity;
                  roomDaySchedules.forEach(s => {
                    const start = timeToMinutes(s.time_slot);
                    const duration = s.duration || 45;
                    const end = start + duration;
                    if (start < roomRegMin) roomRegMin = start;
                    if (end > roomRegMax) roomRegMax = end;
                  });
                  const hasRoomRegularBlock = roomRegMin !== Infinity;

                  // Determine if this occurrence is outside the teacher's regular schedule window for this room.
                  // If so, it needs a separate room booking → show in purple.
                  const isOutsideSchedule = !isBreak && !isVacant && !isSick && !isCancelled &&
                    hasRoomRegularBlock && (occStartMinutes < roomRegMin || occEndMinutes > roomRegMax);

                  // Room booking approved = occ has a confirmed manual room booking for this slot.
                  // We detect this via occ.room_booking_approved flag (set by backend/AdminDashboard).
                  const roomBookingApproved = isOutsideSchedule && (occ.room_booking_approved === true);

                  // Override card color to purple for outside-schedule occurrences
                  if (isOutsideSchedule) {
                    if (roomBookingApproved) {
                      // Solid purple — room booking confirmed by secretary
                      cardBackground = 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)';
                      finalColors.border = '#7c3aed';
                      finalColors.text = '#5b21b6';
                    } else {
                      // Purple/white diagonal — room booking pending
                      cardBackground = 'repeating-linear-gradient(-45deg, #f5f3ff 0px, #f5f3ff 8px, #ffffff 8px, #ffffff 16px)';
                      finalColors.border = '#7c3aed';
                      finalColors.text = '#5b21b6';
                    }
                  }
                  
                  // Color side-by-side overlapping cards RED (conflict indicator)
                  const isParallelConflict = layout && (layout.totalCols || 1) > 1 && (layout.colIndex || 0) >= 1;
                  if (isParallelConflict && !isBreak && !isVacant) {
                    cardBackground = 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
                    finalColors.border = '#ef4444';
                    finalColors.text = '#b91c1c';
                  }
                  
                  const firstGroupId = occurrencesInGroup[0]?.student?.group_id;
                  const isGruppenunterricht = isGroup && occurrencesInGroup.length >= 2 && !!firstGroupId && occurrencesInGroup.every(o => o.student?.group_id === firstGroupId);
                  const isEnsemble = isGroup && !isGruppenunterricht;
                  const displayNames = isGroup 
                    ? occurrencesInGroup.map(o => o.student?.first_name ? o.student.first_name.trim() : '').filter(Boolean).join(', ')
                    : `${occ.student?.first_name || ''} ${maskLastName(occ.student?.last_name, showRealNames)}`.trim();

                  if (isGap) return null;

                  return (
                    <React.Fragment key={group.key}>
                      <div 
                        id={`occ-${occ.id}`}
                        draggable={!( (currentUserRole === 'admin' || currentUserRole === 'secretary') && !hasSubmittedSchedule ) && !isBreak && !isVacant}
                        onMouseDown={(e) => {
                          const cardRect = e.currentTarget.getBoundingClientRect();
                          grabOffsetRef.current = Math.max(0, Math.min(e.clientY - cardRect.top, 40));
                        }}
                        onDragStart={(e) => handleDragStart(e, occ.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnOccurrence(e, occ.id)}
                        onTouchStart={(e) => handleTouchStartCard(e, occ.id)}
                        onTouchMove={handleTouchMoveCard}
                        onTouchEnd={handleTouchEndCard}
                        onTouchCancel={handleTouchEndCard}
                        onMouseEnter={(e) => {
                          const text = isGroup 
                            ? occurrencesInGroup.map(o => `${o.student?.first_name || ''} ${maskLastName(o.student?.last_name, showRealNames)}`.trim()).join('\n')
                            : (isBreak ? undefined : displayNames);
                          if (text) {
                            setHoveredTooltip({
                              text,
                              x: e.clientX,
                              y: e.clientY,
                              visible: true
                            });
                          }
                        }}
                        onMouseMove={(e) => {
                          const text = isGroup 
                            ? occurrencesInGroup.map(o => `${o.student?.first_name || ''} ${maskLastName(o.student?.last_name, showRealNames)}`.trim()).join('\n')
                            : (isBreak ? undefined : displayNames);
                          if (text) {
                            setHoveredTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredTooltip(null);
                        }}
                        onClick={async () => {
                          if (isGroupModeActive) {
                            if (isBreak || isVacant) return;
                            setSelectedForGroup(prev => {
                              if (prev.includes(occ.id)) {
                                return prev.filter(id => id !== occ.id);
                              } else {
                                return [...prev, occ.id];
                              }
                            });
                            return;
                          }
                          if ((currentUserRole === 'admin' || currentUserRole === 'secretary') && !hasSubmittedSchedule) {
                            await showAlert('Dieser Stundenplan ist noch ein Entwurf und wurde noch nicht eingereicht. Zuteilung oder Änderungen sind gesperrt.');
                            return;
                          }
                          if (!isBreak) {
                            setEditOccState({ 
                              id: occ.id, 
                              date: occ.date, 
                              start_time: occ.start_time,
                              room_id: occ.schedules?.room_id || null,
                              duration: occ.duration
                            });
                          }
                          // Save selected sick date to localStorage for persistence across tab unmounts
                          localStorage.setItem('selected_sick_date', occ.date);
                          localStorage.setItem('expand_sick_widget', 'true');
                          // Dispatch custom event to sync date with sickUntilDate state in TeacherDashboard
                          window.dispatchEvent(new CustomEvent('select-appointment-date', { detail: { date: occ.date } }));
                        }}
                        className={isGap ? 'schedule-gap-slot' : ''}
                        style={{ 
                          background: isGap 
                            ? undefined 
                            : ((isGroupModeActive && selectedForGroup.includes(occ.id))
                              ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                              : (cardBackground || finalColors.bg)), 
                          border: isGap 
                            ? undefined
                            : ((isGroupModeActive && selectedForGroup.includes(occ.id))
                              ? '2px solid #2563eb'
                              : (isRescheduled 
                                ? (isWaiting ? `2px dashed ${finalColors.border}` : `2px dashed ${finalColors.border}`) 
                                : isVacant 
                                  ? `1px dashed ${brandColor}` 
                                  : isBreak 
                                    ? '1px dashed #f97316' 
                                    : (isSick || isCancelled)
                                      ? '2px dashed #ef4444' 
                                      : (isWaiting ? `2px dashed ${finalColors.border}` : `1px solid ${finalColors.border}`))),
                          borderLeft: isGap 
                            ? undefined
                            : ((isGroupModeActive && selectedForGroup.includes(occ.id))
                              ? '4px solid #2563eb'
                              : (isRescheduled 
                                ? `4px solid ${finalColors.border}` 
                                : isVacant 
                                  ? `3px dashed ${brandColor}` 
                                  : isBreak 
                                    ? '4px solid #f97316' 
                                    : (isSick || isCancelled)
                                      ? '3px solid #ef4444'
                                      : `4px solid ${finalColors.border}`)),
                          borderRadius: '8px', 
                          padding: (occ.duration || 30) <= 15 ? '0 6px' : ((occ.duration || 30) <= 30 ? '5px 8px' : '8px 10px'),
                          cursor: (isSick || isCancelled) ? 'pointer' : (isVacant || isBreak) ? 'pointer' : 'grab',
                          opacity: draggedId 
                             ? (draggedId === occ.id ? 0.25 : 0.6) 
                             : (selectedRoomIdForXRay && (occ.schedules?.room_id || occ.room_id) !== selectedRoomIdForXRay ? 0.22 : 1),
                          filter: (selectedRoomIdForXRay && (occ.schedules?.room_id || occ.room_id) !== selectedRoomIdForXRay) ? 'grayscale(40%) contrast(85%)' : 'none',
                          position: 'absolute',
                          top: `${topPx}px`,
                          left: `calc(${layout?.left || 0}% + 8px)`,
                          width: `calc(${layout?.width || 100}% - 16px)`,
                          boxShadow: (isGroupModeActive && selectedForGroup.includes(occ.id))
                            ? '0 0 12px rgba(37, 99, 235, 0.45)'
                            : '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.01)',
                          transition: draggedId ? 'none' : 'all 0.2s',
                          willChange: 'transform, top, left',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          WebkitTouchCallout: 'none',
                          touchAction: 'manipulation',
                          visibility: isVacant ? (isGap ? 'visible' : 'hidden') : 'visible',
                          height: `${(occ.duration || 30) * 2.5 - 8}px`,
                          flexShrink: 0,
                          boxSizing: 'border-box',
                          overflow: 'hidden'
                        }}
                      >
                        {(() => {
                          const duration = occ.duration || 30;

                          // 1. VERY COMPACT HEIGHT (<= 15 Min, height ~29.5px)
                          if (duration <= 15) {
                            if (isGap) {
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '100%', width: '100%', color: '#64748b' }}>
                                  <Clock size={10} style={{ opacity: 0.8, flexShrink: 0 }} />
                                  <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>Lücke • {duration}m</span>
                                </div>
                              );
                            }
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', width: '100%', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', minWidth: 0, flex: 1 }}>
                                  <span style={{ 
                                    fontSize: '0.65rem', 
                                    fontWeight: 800, 
                                    color: finalColors.text, 
                                    background: 'rgba(0,0,0,0.04)', 
                                    padding: '1px 3px', 
                                    borderRadius: '3px',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}>
                                    <input
                                      type="time"
                                      value={occ.start_time.substring(0, 5)}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={async (e) => {
                                        e.stopPropagation();
                                        const newTime = e.target.value;
                                        if (!newTime) return;
                                        const formattedTime = newTime.length === 5 ? `${newTime}:00` : newTime;
                                        const updatesMap: Record<string, Partial<ScheduleOccurrence>> = {
                                          [occ.id]: { start_time: formattedTime }
                                        };
                                        updateMultipleOccurrences(updatesMap, 'Änderung vorgenommen');
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        color: finalColors.text,
                                        outline: 'none',
                                        padding: 0,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        width: '42px'
                                      }}
                                      title="Startzeit manuell anpassen"
                                    />
                                    {(() => {
                                      const roomId = occ.schedules?.room_id || occ.schedule?.room_id || occ.room_id || occ.student?.room_id;
                                      let rName = roomId ? rooms.find(r => String(r.id) === String(roomId))?.name : '';
                                      if (!rName) {
                                        rName = occ.schedules?.room?.name || occ.schedule?.room?.name || occ.room?.name || occ.room_name || occ.raum || (typeof occ.room === 'string' ? occ.room : '');
                                      }
                                      if (!rName && selectedRoomIdForXRay) {
                                        const rObj = rooms.find(r => String(r.id) === String(selectedRoomIdForXRay));
                                        if (rObj) rName = rObj.name;
                                      }
                                      if (!rName && rooms && rooms.length > 0) {
                                        const rObj = rooms.find(r => r.name?.includes('4')) || rooms[0];
                                        if (rObj) rName = rObj.name;
                                      }
                                      return rName ? ` (${rName})` : '';
                                    })()}
                                  </span>
                                  
                                  {isGroup && (
                                    <Users size={10} style={{ color: finalColors.text, opacity: 0.7, flexShrink: 0 }} />
                                  )}
                                  
                                  <span style={{ 
                                    fontSize: '0.7rem', 
                                    fontWeight: 700, 
                                    color: finalColors.text, 
                                    whiteSpace: 'nowrap', 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {isGroup 
                                      ? (isGruppenunterricht
                                          ? occurrencesInGroup.map(o => `${o.student?.first_name || ''} ${maskLastName(o.student?.last_name, showRealNames)}`.trim()).join(' & ')
                                          : (occurrencesInGroup[0]?.student ? `${occurrencesInGroup[0].student.first_name} ${maskLastName(occurrencesInGroup[0].student.last_name, showRealNames)} (${occurrencesInGroup.length})` : `${occurrencesInGroup.length} Schüler`)
                                        ) 
                                      : (isBreak ? 'Pause' : displayNames)
                                    }
                                  </span>

                                  {(isRescheduled || isResetPending) && (
                                    <span 
                                      className={isWaiting ? 'pulse-yellow-indicator' : ''}
                                      onMouseEnter={(e) => {
                                        onMouseEnterHelper(e, isResetPending, occ);
                                      }}
                                      onMouseMove={(e) => {
                                        e.stopPropagation();
                                        setHoveredTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                                      }}
                                      onMouseLeave={(e) => {
                                        e.stopPropagation();
                                        setHoveredTooltip(null);
                                      }}
                                      style={{ 
                                        width: '6px', 
                                        height: '6px', 
                                        borderRadius: '50%', 
                                        background: isResetPending ? '#f59e0b' : ((occ.status === 'rescheduled_confirmed' || occ.student_acknowledged) ? '#34a853' : '#f59e0b'), 
                                        boxShadow: 'none',
                                        display: 'inline-block',
                                        flexShrink: 0
                                      }} 
                                    />
                                  )}
                                </div>

                                {((!isBreak && !isVacant && !isSick && !isCancelled) || (isBreak && occ.status !== 'cancelled')) && (
                                  <button 
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (isBreak) {
                                        handleCancelBreak(e, occ);
                                      } else {
                                        if (isGroup) {
                                          if (await showConfirm('Möchtest du den gesamten Gruppentermin absagen?')) {
                                            const updatesMap: Record<string, Partial<ScheduleOccurrence>> = {};
                                            occurrencesInGroup.forEach(go => {
                                              updatesMap[go.id] = { status: 'cancelled' };
                                            });
                                            updateMultipleOccurrences(updatesMap, 'Änderung vorgenommen');
                                          }
                                        } else {
                                          handleCancel(e, occ.id);
                                        }
                                      }
                                    }}
                                    title={isBreak ? "Pause löschen" : "Termin absagen"}
                                    style={{ 
                                      background: 'transparent', 
                                      border: 'none', 
                                      cursor: 'pointer', 
                                      color: finalColors.text, 
                                      opacity: 0.5, 
                                      padding: '2px', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      borderRadius: '4px',
                                      transition: 'all 0.1s' 
                                    }}
                                    onMouseOver={e => e.currentTarget.style.opacity = '1'}
                                    onMouseOut={e => e.currentTarget.style.opacity = '0.5'}
                                  >
                                    <X size={11} strokeWidth={2.5} />
                                  </button>
                                )}
                              </div>
                            );
                          }

                          // 2. STANDARD HEIGHT (16 - 30 Min, height ~67px)
                          if (duration <= 30) {
                            if (isGap) {
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: '2px', paddingLeft: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={11} style={{ color: '#64748b', flexShrink: 0 }} />
                                    <span className="schedule-gap-badge">Lücke</span>
                                  </div>
                                  <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>
                                    {occ.start_time.substring(0, 5)} ({duration} Min)
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ 
                                      fontSize: '0.7rem', 
                                      fontWeight: 800, 
                                      color: finalColors.text, 
                                      background: 'rgba(0,0,0,0.04)', 
                                      padding: '2px 4px', 
                                      borderRadius: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '2px'
                                    }}>
                                      <input
                                        type="time"
                                        value={occ.start_time.substring(0, 5)}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={async (e) => {
                                          e.stopPropagation();
                                          const newTime = e.target.value;
                                          if (!newTime) return;
                                          const formattedTime = newTime.length === 5 ? `${newTime}:00` : newTime;
                                          const updatesMap: Record<string, Partial<ScheduleOccurrence>> = {
                                            [occ.id]: { start_time: formattedTime }
                                          };
                                          updateMultipleOccurrences(updatesMap, 'Startzeit geändert');
                                        }}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          fontSize: '0.7rem',
                                          fontWeight: 800,
                                          color: finalColors.text,
                                          outline: 'none',
                                          padding: 0,
                                          cursor: 'pointer',
                                          fontFamily: 'inherit',
                                          width: '46px'
                                        }}
                                        title="Startzeit manuell anpassen"
                                      />
                                      {(() => {
                                        const roomId = occ.schedules?.room_id;
                                        const rName = roomId ? rooms.find(r => r.id === roomId)?.name : (occ.schedules?.room?.name || '');
                                        return rName ? (
                                          <span style={{ marginLeft: '3px', fontWeight: 600, opacity: 0.7, fontSize: '0.65rem' }}>
                                            ({rName})
                                          </span>
                                        ) : null;
                                      })()}
                                    </span>
                                    {isGroup && (
                                      <Users size={12} style={{ color: finalColors.text, opacity: 0.7 }} />
                                    )}
                                    {isSick && (
                                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#991b1b', background: '#fee2e2', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '0.02em', border: '1px solid rgba(239,68,68,0.15)' }}>
                                        Entfällt
                                      </span>
                                    )}
                                    {isExcused && (
                                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '0.02em', border: '1px solid rgba(245,158,11,0.15)' }}>
                                        Entschuldigt
                                      </span>
                                    )}
                                    {isUnexcused && (
                                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#b91c1c', background: '#fee2e2', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '0.02em', border: '1px solid rgba(239,68,68,0.15)' }}>
                                        Fehlt
                                      </span>
                                    )}
                                    {isCancelled && !isExcused && !isUnexcused && (
                                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#991b1b', background: '#fee2e2', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '0.02em', border: '1px solid rgba(239,68,68,0.15)' }}>
                                        Abgesagt
                                      </span>
                                    )}
                                    {hasProtocol && (
                                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#1b4332', background: '#d8f3dc', padding: '1px 4px', borderRadius: '3px', display: 'inline-flex', alignItems: 'center', gap: '2px', border: '1px solid rgba(40,167,69,0.15)' }}>
                                        📝 Protokoll
                                      </span>
                                    )}
                                    {(isRescheduled || isResetPending) && (
                                     <span 
                                       className={isWaiting ? 'pulse-yellow-indicator' : ''}
                                       onMouseEnter={(e) => {
                                         onMouseEnterHelper(e, isResetPending, occ);
                                       }}
                                       onMouseMove={(e) => {
                                         e.stopPropagation();
                                         setHoveredTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                                       }}
                                       onMouseLeave={(e) => {
                                         e.stopPropagation();
                                         setHoveredTooltip(null);
                                       }}
                                       style={{ 
                                         display: 'inline-flex',
                                         alignItems: 'center',
                                         gap: '3px',
                                         flexShrink: 0
                                       }} 
                                     >
                                       <ArrowLeftRight 
                                         size={11} 
                                         style={{ 
                                           color: isResetPending ? '#f59e0b' : ((occ.status === 'rescheduled_confirmed' || occ.student_acknowledged) ? '#34a853' : '#f59e0b'),
                                           flexShrink: 0
                                         }} 
                                       />
                                       <span style={{ 
                                         width: '6px', 
                                         height: '6px', 
                                         borderRadius: '50%', 
                                         background: isResetPending ? '#f59e0b' : ((occ.status === 'rescheduled_confirmed' || occ.student_acknowledged) ? '#34a853' : '#f59e0b'), 
                                         boxShadow: 'none',
                                         display: 'inline-block',
                                         flexShrink: 0
                                       }} />
                                     </span>
                                    )}
                                  </div>
                                  
                                  {((!isBreak && !isVacant && !isSick && !isCancelled) || (isBreak && occ.status !== 'cancelled')) && (
                                    <button 
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (isBreak) {
                                          handleCancelBreak(e, occ);
                                        } else {
                                          if (isGroup) {
                                            if (await showConfirm('Möchtest du den gesamten Gruppentermin absagen?')) {
                                              const updatesMap: Record<string, Partial<ScheduleOccurrence>> = {};
                                              occurrencesInGroup.forEach(go => {
                                                updatesMap[go.id] = { status: 'cancelled' };
                                              });
                                              updateMultipleOccurrences(updatesMap, 'Gruppentermin abgesagt');
                                            }
                                          } else {
                                            handleCancel(e, occ.id);
                                          }
                                        }
                                      }}
                                      title={isBreak ? "Pause löschen" : "Termin absagen"}
                                      style={{ 
                                        background: 'transparent', 
                                        border: 'none', 
                                        cursor: 'pointer', 
                                        color: finalColors.text, 
                                        opacity: 0.5, 
                                        padding: '2px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        borderRadius: '4px', 
                                        transition: 'all 0.1s' 
                                      }}
                                      onMouseOver={e => e.currentTarget.style.opacity = '1'}
                                      onMouseOut={e => e.currentTarget.style.opacity = '0.5'}
                                    >
                                      <X size={12} strokeWidth={2.5} />
                                    </button>
                                  )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginBottom: '2px' }}>
                                  {isGroup ? (
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: finalColors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                      {displayNames}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: finalColors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {displayNames}
                                      {isBreak && (
                                        <span style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.6 }}> • {occ.duration || 15} Min</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          // 3. GENEROUS HEIGHT (> 30 Min, height >= 104.5px)
                          if (isGap) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '4px', justifyContent: 'center', paddingLeft: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <Clock size={13} style={{ color: '#64748b', flexShrink: 0 }} />
                                  <span className="schedule-gap-badge" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Lücke / Freistunde</span>
                                </div>
                                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, marginLeft: '18px' }}>
                                  {occ.start_time.substring(0, 5)} Uhr ({duration} Min)
                                </div>
                              </div>
                            );
                          }
return (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ 
                                    fontSize: '0.75rem', 
                                    fontWeight: 800, 
                                    color: finalColors.text, 
                                    background: 'rgba(0,0,0,0.05)', 
                                    padding: '2px 6px', 
                                    borderRadius: '5px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}>
                                    <input
                                      type="time"
                                      value={occ.start_time.substring(0, 5)}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={async (e) => {
                                        e.stopPropagation();
                                        const newTime = e.target.value;
                                        if (!newTime) return;
                                        const formattedTime = newTime.length === 5 ? `${newTime}:00` : newTime;
                                        const updatesMap: Record<string, Partial<ScheduleOccurrence>> = {
                                          [occ.id]: { start_time: formattedTime }
                                        };
                                        updateMultipleOccurrences(updatesMap, 'Änderung vorgenommen');
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        color: finalColors.text,
                                        outline: 'none',
                                        padding: 0,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        width: '50px'
                                      }}
                                      title="Startzeit manuell anpassen"
                                    />
                                    {(() => {
                                      const roomId = occ.schedules?.room_id;
                                      const rName = roomId ? rooms.find(r => r.id === roomId)?.name : (occ.schedules?.room?.name || '');
                                      return rName ? (
                                        <span style={{ marginLeft: '4px', fontWeight: 600, opacity: 0.7, fontSize: '0.68rem' }}>
                                          ({rName})
                                        </span>
                                      ) : null;
                                    })()}
                                  </span>
                                  {isGroup && (
                                    <Users size={13} style={{ color: finalColors.text, opacity: 0.7 }} />
                                  )}
                                  {isSick && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#991b1b', background: '#fee2e2', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.02em', border: '1px solid rgba(239,68,68,0.15)' }}>
                                      Entfällt
                                    </span>
                                  )}
                                  {isExcused && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.02em', border: '1px solid rgba(245,158,11,0.15)' }}>
                                      Entschuldigt
                                    </span>
                                  )}
                                  {isUnexcused && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#b91c1c', background: '#fee2e2', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.02em', border: '1px solid rgba(239,68,68,0.15)' }}>
                                      Fehlt
                                    </span>
                                  )}
                                  {isCancelled && !isExcused && !isUnexcused && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#991b1b', background: '#fee2e2', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.02em', border: '1px solid rgba(239,68,68,0.15)' }}>
                                      Abgesagt
                                    </span>
                                  )}
                                  {hasProtocol && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#1b4332', background: '#d8f3dc', padding: '1px 5px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px', border: '1px solid rgba(40,167,69,0.15)' }}>
                                      📝 Protokoll
                                    </span>
                                  )}
                                  {(isRescheduled || isResetPending) && (
                                    <span 
                                      className={isWaiting ? 'pulse-yellow-indicator' : ''}
                                      onMouseEnter={(e) => {
                                        onMouseEnterHelper(e, isResetPending, occ);
                                      }}
                                      onMouseMove={(e) => {
                                        e.stopPropagation();
                                        setHoveredTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                                      }}
                                      onMouseLeave={(e) => {
                                        e.stopPropagation();
                                        setHoveredTooltip(null);
                                      }}
                                      style={{ 
                                        width: '8px', 
                                        height: '8px', 
                                        borderRadius: '50%', 
                                        background: isResetPending ? '#f59e0b' : ((occ.status === 'rescheduled_confirmed' || occ.student_acknowledged) ? '#34a853' : '#f59e0b'), 
                                        boxShadow: 'none',
                                        display: 'inline-block' 
                                      }} 
                                    />
                                  )}
                                </div>
                                
                                {((!isBreak && !isVacant && !isSick && !isCancelled) || (isBreak && occ.status !== 'cancelled')) && (
                                  <button 
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (isBreak) {
                                        handleCancelBreak(e, occ);
                                      } else {
                                        if (isGroup) {
                                          if (await showConfirm('Möchtest du den gesamten Gruppentermin absagen?')) {
                                            const updatesMap: Record<string, Partial<ScheduleOccurrence>> = {};
                                            occurrencesInGroup.forEach(go => {
                                              updatesMap[go.id] = { status: 'cancelled' };
                                            });
                                            updateMultipleOccurrences(updatesMap, 'Änderung vorgenommen');
                                          }
                                        } else {
                                          handleCancel(e, occ.id);
                                        }
                                      }
                                    }}
                                    title={isBreak ? "Pause löschen" : "Termin absagen"}
                                    style={{ 
                                      background: 'transparent', 
                                      border: 'none', 
                                      cursor: 'pointer', 
                                      color: finalColors.text, 
                                      opacity: 0.5, 
                                      padding: '3px', 
                                      borderRadius: '4px', 
                                      transition: 'all 0.1s' 
                                    }}
                                    onMouseOver={e => e.currentTarget.style.opacity = '1'}
                                    onMouseOut={e => e.currentTarget.style.opacity = '0.5'}
                                  >
                                    <X size={14} strokeWidth={2.5} />
                                  </button>
                                )}
                              </div>

                              {isGroup ? (
                                isGruppenunterricht ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: finalColors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {displayNames}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: finalColors.text, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                      Gruppenunterricht ({occurrencesInGroup.length} Schüler)
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', flex: 1, minHeight: 0 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: finalColors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {displayNames}
                                      </div>
                                      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: finalColors.text, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                        Ensemble- / Bandstunde ({occurrencesInGroup.length} Schüler)
                                      </div>
                                    </div>
                                    
                                    <div style={{ 
                                      display: 'flex', 
                                      flexWrap: 'wrap', 
                                      gap: '4px', 
                                      overflowY: 'auto', 
                                      maxHeight: `${(occ.duration || 30) * 2.5 - 52}px`,
                                      scrollbarWidth: 'none'
                                    }}>
                                      {occurrencesInGroup.map(o => {
                                        const name = `${o.student?.first_name || ''} ${maskLastName(o.student?.last_name, showRealNames)}`.trim();
                                        const acknowledged = o.student_acknowledged;
                                        return (
                                          <span 
                                            key={o.id} 
                                            style={{ 
                                              background: 'rgba(255, 255, 255, 0.65)', 
                                              border: `1px solid ${finalColors.border}22`,
                                              color: finalColors.text, 
                                              fontSize: '0.68rem', 
                                              fontWeight: 700, 
                                              padding: '2px 8px', 
                                              borderRadius: '6px', 
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              whiteSpace: 'nowrap',
                                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                            }}
                                          >
                                            <span>{name}</span>
                                            <span style={{ fontSize: '0.62rem', opacity: 0.8, fontWeight: 800, display: 'inline-flex', alignItems: 'center' }}>
                                              {acknowledged ? '✓' : '🕒'}
                                            </span>
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: finalColors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {displayNames}
                                  </div>
                                  {isBreak ? (
                                    <span style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.6 }}>• {occ.duration || 15} Min</span>
                                  ) : (
                                    occ.student?.instrument && (
                                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: finalColors.text, opacity: 0.7 }}>
                                        {occ.student.instrument}
                                      </span>
                                    )
                                  )}
                                  {isOutsideSchedule && !roomBookingApproved && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(124, 58, 237, 0.10)', border: '1px solid rgba(124, 58, 237, 0.25)', color: '#5b21b6', fontSize: '0.58rem', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px', width: 'fit-content' }}>
                                      🔔 Raumbuchung ausstehend
                                    </span>
                                  )}
                                  {isParallelConflict && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#b91c1c', fontSize: '0.58rem', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px', width: 'fit-content' }}>
                                      ⚠️ Doppelbelegung
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Resize handle intentionally removed – appointment duration is fixed by the schedule. */}
                      </div>
                    </React.Fragment>
                  );
                });
              })()
            }
            {/* Rote Echtzeit-Linie (Current Time Indicator) */}
            {(() => {
              const todayStr = toLocalYYYYMMDD(currentDate);
              if (dateStr === todayStr && currentMinutes >= dayBaselineMinutes) {
                const topPosition = (currentMinutes - dayBaselineMinutes) * 2.5;
                if (topPosition >= 0 && topPosition <= columnHeight) {
                  return (
                    <div 
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${topPosition}px`,
                        borderTop: '2px solid #ef4444',
                        zIndex: 20,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <div 
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          position: 'absolute',
                          left: '-4px',
                          boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)'
                        }} 
                      />
                    </div>
                  );
                }
              }
              return null;
            })()}
              </div>
            </div>
          );
        })}
        </div>
      </div>
      
      {/* Edit Modal */}
      {editOccState && (() => {
        const occ = occurrences.find(o => o.id === editOccState.id);
        
        if (occ?.student_id === 'vacant') {
          const studentName = maskLastName(occ.student?.last_name?.replace(/^\(zuvor: /, '')?.replace(/\)$/, '')) || 'Schüler';
          const rescheduledOcc = occurrences.find(o => o.student_id === occ.vacant_student_id);
          
          let newAppointmentText = '';
          if (rescheduledOcc) {
            const d = new Date(rescheduledOcc.date);
            const weekday = d.toLocaleDateString('de-DE', { weekday: 'long' });
            const dateFormatted = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeFormatted = rescheduledOcc.start_time.substring(0, 5);
            newAppointmentText = `${weekday}, ${dateFormatted} um ${timeFormatted} Uhr`;
          }

          return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ 
                position: 'relative',
                background: '#ffffff', 
                padding: '32px', 
                borderRadius: '24px', 
                boxShadow: '0 20px 50px rgba(0,0,0,0.08)', 
                width: '420px', 
                maxWidth: '90vw', 
                border: '1px solid rgba(0,0,0,0.08)', 
                display: 'flex', 
                flexDirection: 'column',
                gap: '18px', 
                alignItems: 'center',
                textAlign: 'center',
                boxSizing: 'border-box' 
              }}>
                <div style={{ fontSize: '2.5rem' }}>❇️</div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#1d1d1f', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>Freier Slot</h3>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#515154', lineHeight: 1.6, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
                  Dieser Termin war zuvor für <strong>{studentName}</strong> eingeteilt.
                </p>
                {rescheduledOcc ? (
                  <div style={{ 
                    background: '#e6f4ea', 
                    border: '1px solid #34a853', 
                    borderRadius: '16px', 
                    padding: '14px 18px', 
                    width: '100%', 
                    boxSizing: 'border-box',
                    textAlign: 'center'
                  }}>
                    <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Neuer Termin</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#34a853', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>{newAppointmentText}</span>
                  </div>
                ) : (
                  <div style={{ 
                    background: '#fef2f2', 
                    border: '1px solid #ef4444', 
                    borderRadius: '16px', 
                    padding: '14px 18px', 
                    width: '100%', 
                    boxSizing: 'border-box',
                    textAlign: 'center'
                  }}>
                    <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Status</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#991b1b', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>Termin abgesagt / keine Ausweichstunde</span>
                  </div>
                )}
                <button
                  onClick={() => setEditOccState(null)}
                  style={{
                    marginTop: '8px',
                    padding: '12px 28px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#34a853',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(52, 168, 83, 0.2)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#34a853'}
                  onMouseOut={e => e.currentTarget.style.background = '#34a853'}
                >
                  Schließen
                </button>
              </div>
            </div>
          );
        }
        
        const isGroupOcc = (occ && (occ.isGroupBlock || occurrences.some(o => 
          o.id !== occ.id && 
          o.student_id && 
          o.student_id !== 'vacant' &&
          o.date === occ.date && 
          o.start_time === occ.start_time && 
          (o.schedules?.room_id || null) === (occ.schedules?.room_id || null)
        ))) || false;

        const groupOccs = (isGroupOcc && occ) ? occurrences.filter(o => 
          o.student_id && 
          o.student_id !== 'vacant' &&
          o.date === occ.date && 
          o.start_time === occ.start_time && 
          (o.schedules?.room_id || null) === (occ.schedules?.room_id || null)
        ) : [];

        const uniqueGroupOccs: any[] = [];
        const seenStudentIds = new Set();
        groupOccs.forEach(o => {
          if (o.student_id && !seenStudentIds.has(o.student_id)) {
            seenStudentIds.add(o.student_id);
            uniqueGroupOccs.push(o);
          }
        });

        const firstGroupId = groupOccs[0]?.student?.group_id;
        const isDbLinkedGroup = isGroupOcc && !!firstGroupId && groupOccs.every(o => o.student?.group_id === firstGroupId);
        const isGruppenunterrichtOcc = isDbLinkedGroup;
        const isEnsembleOcc = isGroupOcc && !isGruppenunterrichtOcc;

        const isMoved = occ?.original_date && (occ.original_date !== occ.date || occ.original_start_time !== occ.start_time);
        const isCancelled = occ?.status && ['cancelled', 'canceled_by_student'].includes(occ.status);
        const canDiscard = isMoved || isCancelled;
        const studentName = occ ? `${occ.student?.first_name || ''} ${maskLastName(occ.student?.last_name, showRealNames)}`.trim() : 'Schüler';
        
        const modalTitle = occ?.student_id 
          ? (isGruppenunterrichtOcc 
              ? uniqueGroupOccs.map(go => `${go.student?.first_name || ''} ${maskLastName(go.student?.last_name, showRealNames)}`.trim()).join(' & ')
              : isEnsembleOcc 
                ? 'Ensemble/Band Termin' 
                : `Termin bearbeiten: ${studentName}`
            ) 
          : 'Pause bearbeiten';

        const formattedDateLabel = occ ? new Date(editOccState.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
        const formattedTimeLabel = editOccState.start_time.substring(0, 5);

        const timeToMinutes = (t: string): number => {
          const parts = t.split(':');
          const h = parseInt(parts[0] || '0', 10);
          const m = parseInt(parts[1] || '0', 10);
          return h * 60 + m;
        };

        const minutesToTime = (m: number): string => {
          const h = Math.floor(m / 60) % 24;
          const mins = m % 60;
          return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        };

        const startMin = timeToMinutes(editOccState.start_time);
        const endMin = startMin + (editOccState.duration || 30);
        const endTimeStr = minutesToTime(endMin);

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end', alignItems: 'stretch' }}>
            <style>{`
              @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
              .drawer-content-grid {
                display: flex;
                flex-wrap: nowrap;
                gap: 24px;
                padding: 24px;
                box-sizing: border-box;
                flex: 1;
                overflow-y: hidden;
                height: calc(100vh - 84px);
              }
              .drawer-col {
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                height: 100%;
              }
              .drawer-col-1 {
                flex: 0 0 380px;
                max-width: 400px;
                min-width: 320px;
              }
              .drawer-col-2 {
                flex: 1 1 560px;
                min-width: 380px;
                border-left: 1px solid #e5e5ea;
                padding-left: 24px;
                display: flex;
                flex-direction: column;
              }
              .drawer-col-3 {
                display: none;
              }

              @media (max-width: 1023px) {
                .drawer-content-grid {
                  flex-wrap: wrap !important;
                  overflow-y: auto !important;
                }
                .drawer-col {
                  height: auto !important;
                }
                .drawer-col-1 {
                  max-width: none !important;
                  flex: 1 1 100% !important;
                }
                .drawer-col-2 {
                  max-width: none !important;
                  flex: 1 1 100% !important;
                  border-left: none !important;
                  padding-left: 0 !important;
                  border-top: 1px solid #e5e5ea;
                  padding-top: 24px;
                }
              }

              .drawer-container {
                position: relative;
                background: #ffffff; 
                border-radius: 24px 0 0 24px;
                box-shadow: -10px 0 40px rgba(0,0,0,0.12); 
                width: 980px; 
                max-width: 100vw; 
                border-left: 1px solid rgba(0,0,0,0.08); 
                display: flex; 
                flex-direction: column;
                box-sizing: border-box;
                height: 100vh;
                animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                overflow: hidden;
              }
              .drawer-container.ensemble {
                width: 1080px;
              }

              @media (max-width: 1023px) {
                .drawer-container {
                  width: 100vw !important;
                  border-radius: 0 !important;
                }
              }

              @media (max-width: 680px) {
                .drawer-content-grid {
                  flex-direction: column;
                  flex-wrap: nowrap;
                }
                .drawer-col-2 {
                  border-left: none !important;
                  padding-left: 0 !important;
                  border-top: 1px solid #e5e5ea;
                  padding-top: 24px;
                }
              }
            `}</style>
            <div className={`drawer-container ${isEnsembleOcc ? 'ensemble' : ''}`}>
              
              {/* Premium Green Header Banner */}
              <div style={{ 
                background: isEnsembleOcc 
                  ? 'linear-gradient(135deg, #007aff 0%, #0055d4 100%)' 
                  : 'linear-gradient(135deg, #34a853 0%, #2e964b 100%)', 
                padding: '18px 24px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                color: '#ffffff',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                borderTopLeftRadius: '23px',
                borderTopRightRadius: '0px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.5rem' }}>💬</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
                      {modalTitle}
                    </h3>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
                      Termin am {formattedDateLabel} um {formattedTimeLabel} Uhr
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Prominent Header Action: Aufgabenheft & Tools */}
                  {occ && occ.student && (
                    <button
                      type="button"
                      onClick={() => setDocStudent(occ.student)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.22)',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        borderRadius: '12px',
                        padding: '8px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s ease'
                      }}
                      className="hover-scale"
                    >
                      <span>📝</span>
                      <span>Aufgabenheft & Tools</span>
                    </button>
                  )}

                  {/* Close Button Top Right */}
                  <button
                    onClick={() => setEditOccState(null)}
                    title="Schließen"
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '34px',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#ffffff',
                      transition: 'all 0.2s',
                      zIndex: 10
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    }}
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Modal Inner Content Body (2 Columns) */}
              <div className="drawer-content-grid">
                
                {/* Column 1: Termin-Details, Mini-Profil & Pädagogik */}
                <div className="drawer-col drawer-col-1">
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
                    
                    {/* Student Mini Profile Header Card */}
                    {occ && occ.student && !isEnsembleOcc && (
                      <div style={{
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderRadius: '16px',
                        padding: '12px 14px',
                        marginBottom: '16px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '14px',
                            background: '#e6f4ea',
                            color: '#34a853',
                            fontWeight: 800,
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1.5px solid #a7f3d0'
                          }}>
                            {occ.student.first_name ? occ.student.first_name[0] : 'S'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                              {occ.student.first_name} {maskLastName(occ.student.last_name, showRealNames)}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: '#e6f4ea',
                                color: '#166534',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                border: '1px solid #bbf7d0'
                              }}>
                                🎸 {occ.student.instrument || 'Gitarre'}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                                • {editOccState.duration || 45} Min Lektion
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ensemble Students List (for Group/Band Occurrences) */}
                    {isEnsembleOcc && (
                      <div style={{ marginBottom: '18px' }}>
                        <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '0.95rem', fontWeight: 800, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          👥 {uniqueGroupOccs.length} Schüler in der Gruppe
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                          {uniqueGroupOccs.map(go => {
                            const isGoCancelled = ['cancelled', 'canceled_by_student'].includes(go.status);
                            const isGoSick = go.status === 'teacher_sick' || go.status === 'canceled_by_teacher_sick';
                            const isConfirmed = go.student_acknowledged === true;

                            let itemBg = 'rgba(0, 0, 0, 0.02)';
                            let itemBorder = '1px solid rgba(0, 0, 0, 0.05)';
                            let nameColor = '#1d1d1f';

                            if (isGoCancelled || isGoSick) {
                              itemBg = 'rgba(239, 68, 68, 0.05)';
                              itemBorder = '1px solid rgba(239, 68, 68, 0.15)';
                              nameColor = '#ef4444';
                            } else if (isConfirmed) {
                              itemBg = '#e8f0fe';
                              itemBorder = '1px solid #0b57d0';
                              nameColor = '#174ea6';
                            }

                            return (
                              <div key={go.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '10px', background: itemBg, border: itemBorder }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: nameColor, textDecoration: isGoCancelled ? 'line-through' : 'none' }}>
                                  {go.student?.first_name} {maskLastName(go.student?.last_name, showRealNames)}
                                </span>
                                {!isGoCancelled && !isGoSick && (
                                  <button
                                    onClick={async () => {
                                      if (await showConfirm(`Möchtest du ${go.student?.first_name} für diesen Gruppentermin absagen?`)) {
                                        await persistOccurrenceDirectly(go.id, { status: 'cancelled' });
                                        setEditOccState(null);
                                      }
                                    }}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Date Input */}
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 800, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Datum</label>
                      <input 
                        type="date" 
                        value={editOccState.date} 
                        onChange={e => setEditOccState({ ...editOccState, date: e.target.value })} 
                        style={{ 
                          width: '100%', 
                          padding: '10px 12px', 
                          borderRadius: '10px', 
                          border: '1px solid #cbd5e1', 
                          background: '#ffffff',
                          fontSize: '0.9rem', 
                          fontFamily: 'inherit', 
                          outline: 'none', 
                          boxSizing: 'border-box',
                          fontWeight: 600
                        }} 
                      />
                    </div>

                    {/* Start Time & End Time Inputs */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 800, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Beginn</label>
                        <input 
                          type="time" 
                          value={editOccState.start_time.substring(0, 5)} 
                          onChange={e => setEditOccState({ ...editOccState, start_time: e.target.value })} 
                          style={{ 
                            width: '100%', 
                            padding: '10px 12px', 
                            borderRadius: '10px', 
                            border: '1px solid #cbd5e1', 
                            background: '#ffffff',
                            fontSize: '0.9rem', 
                            fontFamily: 'inherit',
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontWeight: 600
                          }} 
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 800, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ende</label>
                        <input 
                          type="time" 
                          value={localEndTime} 
                          onChange={e => {
                            const newTime = e.target.value;
                            setLocalEndTime(newTime);
                            if (newTime) {
                              const newEndMin = timeToMinutes(newTime);
                              const startMin = timeToMinutes(editOccState.start_time);
                              const diff = newEndMin - startMin;
                              if (diff >= 0) {
                                setEditOccState({ ...editOccState, duration: diff });
                              }
                            }
                          }} 
                          style={{ 
                            width: '100%', 
                            padding: '10px 12px', 
                            borderRadius: '10px', 
                            border: '1px solid #cbd5e1', 
                            background: '#ffffff',
                            fontSize: '0.9rem', 
                            fontFamily: 'inherit',
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontWeight: 600
                          }} 
                        />
                      </div>
                    </div>

                    {/* Room Selection Dropdown */}
                    <div style={{ marginBottom: '16px', position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: '0.66rem', fontWeight: 800, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Freie Räume</label>
                      <button
                        type="button"
                        onClick={() => setRoomDropdownOpen(!roomDropdownOpen)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: roomDropdownOpen ? `1px solid ${isEnsembleOcc ? '#007aff' : '#34a853'}` : '1px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '0.88rem',
                          fontFamily: 'inherit',
                          fontWeight: 600,
                          color: '#1d1d1f',
                          outline: 'none',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{editOccState.room_id ? '🏫' : '❌'}</span>
                          <span>
                            {editOccState.room_id 
                              ? (rooms.find(r => r.id === editOccState.room_id)?.name || 'Raum') 
                              : 'Kein Raum'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.5rem', opacity: 0.6, transform: roomDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                      </button>

                      {roomDropdownOpen && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: '6px',
                          background: '#ffffff',
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: '12px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                          padding: '6px',
                          zIndex: 100,
                          maxHeight: '180px',
                          overflowY: 'auto'
                        }}>
                          <div
                            onClick={() => {
                              setEditOccState({ ...editOccState, room_id: null });
                              setRoomDropdownOpen(false);
                            }}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: !editOccState.room_id ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                              color: !editOccState.room_id ? '#1d1d1f' : '#515154',
                              fontWeight: !editOccState.room_id ? 700 : 500,
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <span>❌</span>
                            <span>Kein Raum</span>
                          </div>

                          {freeRooms.map(r => {
                            const isSelected = editOccState.room_id === r.id;
                            return (
                              <div
                                key={r.id}
                                onClick={() => {
                                  setEditOccState({ ...editOccState, room_id: r.id });
                                  setRoomDropdownOpen(false);
                                }}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                  background: isSelected ? (isEnsembleOcc ? 'rgba(0, 122, 255, 0.08)' : 'rgba(19, 115, 51, 0.08)') : 'transparent',
                                  color: isSelected ? (isEnsembleOcc ? '#007aff' : '#34a853') : '#1d1d1f',
                                  fontWeight: isSelected ? 700 : 500,
                                  fontSize: '0.85rem',
                                  marginTop: '2px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span>🏫</span>
                                  <span>{r.name}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Compact Pedagogy Summary Box */}
                    {occ && occ.student && !isEnsembleOcc && (
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '12px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            🎵 Aktuelle Songs & Themen
                          </span>
                        </div>
                        {studentActiveSongs.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {studentActiveSongs.slice(0, 2).map(skill => (
                              <div key={skill.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#1e293b', background: '#ffffff', padding: '6px 8px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                  {skill.songs?.title || 'Song'}
                                </span>
                                <span style={{ fontWeight: 800, color: '#34a853', fontSize: '0.72rem' }}>
                                  {skill.progress_percent || 0}%
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            Keine aktiven Songs eingetragen
                          </span>
                        )}
                      </div>
                    )}

                    {/* Explicit Cancel Lesson Section */}
                    {!isCancelled && (
                      <div style={{ marginBottom: '16px' }}>
                        <button 
                          onClick={(e) => {
                            handleCancel(e as any, editOccState.id);
                            setEditOccState(null);
                          }}
                          style={{ 
                            width: '100%',
                            padding: '10px 12px', 
                            borderRadius: '10px', 
                            border: '1px solid rgba(255, 59, 48, 0.2)', 
                            background: 'rgba(255, 59, 48, 0.05)', 
                            color: '#ff3b30', 
                            fontSize: '0.82rem', 
                            fontWeight: 700, 
                            cursor: 'pointer', 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s' 
                          }}
                          className="hover-scale-mini"
                        >
                          <Trash2 size={15} />
                          Termin absagen
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Left Column Action Footer Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <div>
                      {canDiscard && (
                        <button 
                          onClick={async () => {
                            if (!editOccState.id.startsWith('mock-')) {
                              try {
                                setLoading(true);
                                const partnerOcc = occurrences.find(o => 
                                  o.id !== editOccState.id &&
                                  !o.id.startsWith('mock-') &&
                                  (
                                    (o.date === occ.date && o.original_date === occ.original_date) ||
                                    (o.date === occ.original_date && o.original_date === occ.date)
                                  )
                                );
                                
                                const idsToDelete = [editOccState.id];
                                if (partnerOcc) {
                                  idsToDelete.push(partnerOcc.id);
                                }

                                const { error } = await supabase
                                  .from('schedule_occurrences')
                                  .delete()
                                  .in('id', idsToDelete);
                                if (error) throw error;

                                try {
                                  await supabase.from('room_bookings')
                                    .delete()
                                    .eq('booked_by', userId)
                                    .eq('date', occ.date);
                                  window.dispatchEvent(new CustomEvent('refresh-bookings'));
                                } catch (roomErr) {}

                                await loadOccurrences();
                                await showAlert('Termin(e) erfolgreich auf den Stammtermin zurückgesetzt.');
                              } catch (err) {
                                console.error(err);
                                await showAlert('Fehler beim Zurücksetzen des Termins');
                              } finally {
                                setLoading(false);
                              }
                            } else {
                              resetOccurrence(editOccState.id);
                            }
                            setEditOccState(null);
                          }} 
                          style={{ padding: '8px 12px', borderRadius: '100px', border: '1px solid rgba(0,0,0,0.15)', background: 'transparent', color: '#1d1d1f', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Auf Stammtermin zurücksetzen
                        </button>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => setEditOccState(null)} 
                        style={{ padding: '9px 16px', borderRadius: '100px', border: 'none', background: 'rgba(0,0,0,0.05)', color: '#1d1d1f', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Abbrechen
                      </button>
                      <button 
                        onClick={handleSaveEdit} 
                        style={{ padding: '9px 16px', borderRadius: '100px', border: 'none', background: isEnsembleOcc ? '#007aff' : '#34a853', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                </div>

                {/* Column 2: Termingekoppelte Shoutbox */}
                {occ && occ.student_id && (() => {
                  let isFrozen = false;
                  try {
                    const timePart = occ.start_time.includes(':') ? occ.start_time : `${occ.start_time}:00`;
                    const lessonDateTime = new Date(`${occ.date}T${timePart}`);
                    isFrozen = Date.now() > lessonDateTime.getTime() + 48 * 60 * 60 * 1000;
                  } catch (e) {}

                  return (
                    <div className="drawer-col drawer-col-2">
                      {/* Shoutbox Header Card with Green Gradient & White Text */}
                      <div style={{
                        background: 'linear-gradient(135deg, #34a853 0%, #137333 100%)',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px',
                        boxShadow: '0 4px 14px rgba(52, 168, 83, 0.2)'
                      }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>💬</span>
                            <span>Termin-Shoutbox</span>
                            {isFrozen && <span style={{ fontSize: '0.85rem' }}>🔒</span>}
                          </h4>
                          <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
                            Termingekoppelte Direktnachrichten mit {occ.student?.first_name || 'Schüler'}
                          </p>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '4px 9px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.22)',
                            color: '#ffffff',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            border: '1px solid rgba(255, 255, 255, 0.35)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backdropFilter: 'blur(4px)',
                            whiteSpace: 'nowrap'
                          }}>
                            <CalendarIcon size={11} color="#ffffff" />
                            <span>Termingekoppelt</span>
                          </span>
                          <span style={{
                            padding: '4px 9px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.22)',
                            color: '#ffffff',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            border: '1px solid rgba(255, 255, 255, 0.35)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backdropFilter: 'blur(4px)',
                            whiteSpace: 'nowrap'
                          }}>
                            <ShieldCheck size={12} color="#ffffff" />
                            <span>100% DSGVO-konform</span>
                          </span>
                        </div>
                      </div>

                      {isMoved && (
                        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: '#fffbeb', border: '1px solid #fef3c7', padding: '6px 12px', borderRadius: '100px', alignSelf: 'flex-start' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>Regulär:</span>
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#92400e' }}>
                            {new Date(occ.original_date!).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}, {occ.original_start_time ? occ.original_start_time.substring(0, 5) : ''} Uhr
                          </span>
                        </div>
                      )}

                      {/* Chat Messages Viewport */}
                      <div 
                        ref={chatViewportRef} 
                        style={{ 
                          flex: 1, 
                          overflowY: 'auto', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '10px', 
                          marginBottom: '12px', 
                          padding: '14px', 
                          background: '#f8fafc', 
                          borderRadius: '16px',
                          border: '1px solid #e2e8f0',
                          minHeight: '260px',
                          maxHeight: '440px'
                        }}
                      >
                        {isFrozen && (
                          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'center', justifyContent: 'center' }}>
                            🔒 Shoutbox nach 48h eingefroren (Schreibschutz aktiv)
                          </div>
                        )}
                        {(() => {
                          const deduplicatedMessages: any[] = [];
                          const seenMessages = new Set<string>();
                          chatMessages.forEach(msg => {
                            const timeKey = new Date(msg.created_at).toISOString().substring(0, 16);
                            const key = `${msg.sender_id}_${timeKey}_${msg.content}`;
                            if (!seenMessages.has(key)) {
                              seenMessages.add(key);
                              deduplicatedMessages.push(msg);
                            }
                          });

                          if (deduplicatedMessages.length === 0) {
                            return (
                              <div style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '24px 16px',
                                textAlign: 'center',
                                background: 'linear-gradient(185deg, #ffffff 0%, #f8fafc 100%)',
                                borderRadius: '14px',
                                border: '1px dashed #cbd5e1',
                                margin: 'auto 0'
                              }}>
                                <div style={{
                                  width: '46px',
                                  height: '46px',
                                  borderRadius: '14px',
                                  background: '#e6f4ea',
                                  color: '#34a853',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginBottom: '10px',
                                  boxShadow: '0 4px 12px rgba(52, 168, 83, 0.12)'
                                }}>
                                  <CalendarIcon size={22} />
                                </div>
                                <h5 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                                  Termingekoppelter Schulchat
                                </h5>
                                <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', lineHeight: 1.4, maxWidth: '240px' }}>
                                  Geschützte Direktnachrichten für diesen Unterrichtstermin – 100% DSGVO- & datenschutzkonform.
                                </p>
                              </div>
                            );
                          }

                          return deduplicatedMessages.map((msg, idx) => {
                            const isMe = msg.sender_id === userId;
                            const isTerminMsg = msg.content.startsWith('[Termin');
                            let displayedContent = msg.content;
                            let prefixText = '';
                            if (isTerminMsg) {
                              const closeBracketIdx = msg.content.indexOf(']');
                              if (closeBracketIdx !== -1) {
                                prefixText = msg.content.substring(1, closeBracketIdx);
                                displayedContent = msg.content.substring(closeBracketIdx + 1).trim();
                              }
                            }

                            const senderStudent = uniqueGroupOccs.find(o => o.student_id === msg.sender_id)?.student;
                            const senderName = senderStudent ? `${senderStudent.first_name} ${maskLastName(senderStudent.last_name, showRealNames)}` : (occ.student?.first_name || 'Schüler');

                            return (
                              <div key={msg.id || idx} style={{ display: 'flex', flexDirection: 'column', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '82%', textAlign: 'left' }}>
                                {!isMe && (
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34a853', marginBottom: '2px', marginLeft: '6px' }}>
                                    {senderName}
                                  </span>
                                )}
                                {prefixText && (
                                  <span style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '2px', alignSelf: isMe ? 'flex-end' : 'flex-start', fontWeight: 600 }}>
                                    📅 {prefixText}
                                  </span>
                                )}
                                <div style={{ 
                                  background: isMe ? '#e6f4ea' : '#ffffff', 
                                  color: '#0f172a', 
                                  padding: '9px 13px', 
                                  borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px', 
                                  fontSize: '0.84rem',
                                  lineHeight: 1.4,
                                  wordBreak: 'break-word',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                  border: isMe ? '1px solid #a7f3d0' : '1px solid #e2e8f0'
                                }}>
                                  {displayedContent}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
                                    <span style={{ fontSize: '0.62rem', color: isMe ? '#34a853' : '#64748b', fontWeight: 600 }}>
                                      {new Date(msg.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isMe && <CheckCheck size={14} color="#34a853" style={{ marginLeft: '2px' }} />}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                        <div ref={chatMessagesEndRef} />
                      </div>

                      {/* Music Pedagogical Quick Reply Template Chips */}
                      {!isFrozen && (
                        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '4px' }}>
                          {[
                            '👍 Ja, geht klar!',
                            '❌ Nein, geht leider nicht',
                            '⏳ Bin 5 Min. später',
                            '🎼 Bitte Notenheft mitbringen',
                            '📝 Hausaufgabe im Aufgabenheft',
                            '✅ Termin ist bestätigt'
                          ].map((text, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setChatTypedMessage(text)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '16px',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#334155',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s'
                              }}
                              className="hover-scale-mini"
                            >
                              {text}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Send Input Form */}
                      <form onSubmit={(e) => handleSendChatMessage(e, occ.student_id || '', occ)} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto', paddingTop: '4px' }}>
                        <input 
                          type="text" 
                          placeholder={isFrozen ? "Shoutbox eingefroren..." : "Nachricht schreiben..."}
                          disabled={isFrozen}
                          value={chatTypedMessage}
                          onChange={e => setChatTypedMessage(e.target.value)}
                          style={{ 
                            flex: 1, 
                            padding: '12px 20px', 
                            borderRadius: '100px', 
                            border: '1.5px solid #cbd5e1', 
                            fontSize: '0.88rem', 
                            outline: 'none', 
                            background: isFrozen ? '#f1f5f9' : '#ffffff',
                            color: '#1e293b',
                            boxShadow: 'none',
                            transition: 'all 0.2s'
                          }}
                        />
                        <button 
                          type="submit" 
                          disabled={isFrozen || !chatTypedMessage.trim()} 
                          style={{ 
                            background: isFrozen || !chatTypedMessage.trim() ? '#dbe3ea' : (isEnsembleOcc ? '#007aff' : '#34a853'), 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '50%', 
                            width: '42px', 
                            height: '42px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            cursor: isFrozen || !chatTypedMessage.trim() ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            flexShrink: 0,
                            transition: 'all 0.2s'
                          }}
                          className={!isFrozen && chatTypedMessage.trim() ? 'hover-scale' : ''}
                          title="Nachricht senden"
                        >
                          <Send size={18} color="#ffffff" style={{ marginLeft: '-2px' }} />
                        </button>
                      </form>
                    </div>
                  );
                })()}
              </div>
            </div>
            {docStudent && (
              <MeisterwerkDocumentationModal 
                student={docStudent} 
                onClose={() => {
                  setDocStudent(null);
                  if (occ?.student_id) {
                    loadStudentHomework(occ.student_id, occ.student?.instrument);
                  }
                }} 
                teacherId={userId}
              />
            )}
          </div>
        );
      })()}
      
      {/* Cancelled Lesson Swap Confirmation Dialog */}
      {swapConfirmState && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', width: '480px', maxWidth: '90vw', border: '1px solid rgba(255,255,255,0.5)', boxSizing: 'border-box' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
              Termintausch mit abgesagtem Termin
            </h3>
            
            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, marginBottom: '24px' }}>
              Du tauschst den aktiven Termin von <strong>{swapConfirmState.sourceStudentName}</strong> mit dem abgesagten Termin von <strong>{swapConfirmState.targetStudentName}</strong>. 
              <br/><br/>
              Soll der abgesagte Termin für <strong>{swapConfirmState.targetStudentName}</strong> auf den alten Sendeplatz verschoben werden (somit ein neuer Alternativtermin angeboten werden), oder soll dieser Termin endgültig <strong>abgesagt bleiben</strong>?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={() => {
                  // Perform a complete swap, keeping both active. Proposes target student the old time slot of the source student.
                  moveOccurrenceOrGroup(swapConfirmState.sourceId, { 
                    date: swapConfirmState.targetDate, 
                    start_time: swapConfirmState.targetStartTime, 
                    status: 'pending_reschedule' 
                  });
                  moveOccurrenceOrGroup(swapConfirmState.targetId, { 
                    date: swapConfirmState.sourceDate, 
                    start_time: swapConfirmState.sourceStartTime, 
                    status: 'pending_reschedule' 
                  });
                  setSwapLinks(prev => [...prev, { id1: swapConfirmState.sourceId, id2: swapConfirmState.targetId }]);
                  setSwapConfirmState(null);
                }}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#0071e3', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Neuen Alternativtermin anbieten (Vollständiger Tausch)
              </button>

              <button 
                onClick={() => {
                  // Reschedule the active student, but keep the cancelled student cancelled.
                  // Active student goes to the new slot.
                  moveOccurrenceOrGroup(swapConfirmState.sourceId, { 
                    date: swapConfirmState.targetDate, 
                    start_time: swapConfirmState.targetStartTime, 
                    status: 'pending_reschedule' 
                  });
                  moveOccurrenceOrGroup(swapConfirmState.targetId, { 
                    date: swapConfirmState.sourceDate, 
                    start_time: swapConfirmState.sourceStartTime, 
                    status: 'cancelled' 
                  });
                  setSwapLinks(prev => [...prev, { id1: swapConfirmState.sourceId, id2: swapConfirmState.targetId }]);
                  setSwapConfirmState(null);
                }}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e293b', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Termin abgesagt lassen (Nur aktiven Schüler verschieben)
              </button>

              <button 
                onClick={() => setSwapConfirmState(null)}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: 'none', background: 'transparent', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', marginTop: '4px' }}
              >
                Tausch abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drag & Drop Merge / Swap Decision Dialog */}
      {dropDecisionState && (() => {
        const sourceOcc = occurrences.find(o => o.id === dropDecisionState.sourceId);
        const targetOcc = occurrences.find(o => o.id === dropDecisionState.targetId);
        if (!sourceOcc || !targetOcc) return null;

        const isCampusTheme = localStorage.getItem('groovelab_active_platform') === 'campus';
        const primaryColor = isCampusTheme ? '#34a853' : '#007aff';
        
        const srcName = `${sourceOcc.student?.first_name || ''} ${maskLastName(sourceOcc.student?.last_name, showRealNames)}`.trim() || 'Schüler';
        const tgtName = `${targetOcc.student?.first_name || ''} ${maskLastName(targetOcc.student?.last_name, showRealNames)}`.trim() || 'Schüler';

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ 
              background: '#ffffff', 
              padding: '28px', 
              borderRadius: '24px', 
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)', 
              width: '420px', 
              maxWidth: '90vw', 
              border: '1px solid rgba(0,0,0,0.08)', 
              display: 'flex', 
              flexDirection: 'column',
              gap: '16px', 
              alignItems: 'center',
              textAlign: 'center',
              boxSizing: 'border-box' 
            }}>
              <div style={{ fontSize: '2.5rem' }}>🔀</div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1d1d1f' }}>Termine zusammenführen oder tauschen?</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#515154', lineHeight: 1.5 }}>
                Du hast den Termin von <strong>{srcName}</strong> auf den Termin von <strong>{tgtName}</strong> gezogen. Was möchtest du tun?
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '8px' }}>
                <button
                  onClick={async () => {
                    const { sourceId, targetId } = dropDecisionState;
                    setDropDecisionState(null);
                    executeOccurrenceSwap(sourceId, targetId);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: primaryColor,
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: `0 4px 12px ${primaryColor}33`
                  }}
                  onMouseOver={e => e.currentTarget.style.filter = 'brightness(0.9)'}
                  onMouseOut={e => e.currentTarget.style.filter = 'none'}
                >
                  🔄 Termine tauschen (Empfohlen)
                </button>

                <button
                  onClick={async () => {
                    const targetRoomId = targetOcc.schedules?.room_id || null;
                    const isSourceGroup = occurrences.some(o => 
                      o.id !== sourceOcc.id && 
                      o.student_id && 
                      o.student_id !== 'vacant' &&
                      o.date === sourceOcc.date && 
                      o.start_time === sourceOcc.start_time && 
                      (o.schedules?.room_id || null) === (sourceOcc.schedules?.room_id || null)
                    );
                    const sourceGroupOccs = isSourceGroup ? occurrences.filter(o => 
                      o.student_id && 
                      o.student_id !== 'vacant' &&
                      o.date === sourceOcc.date && 
                      o.start_time === sourceOcc.start_time && 
                      (o.schedules?.room_id || null) === (sourceOcc.schedules?.room_id || null)
                    ) : [sourceOcc];

                    const updatesMap: Record<string, Partial<ScheduleOccurrence>> = {};
                    sourceGroupOccs.forEach(go => {
                      const updatedSchedules = go.schedules ? {
                        ...go.schedules,
                        room_id: targetRoomId,
                        room: { name: rooms.find(r => r.id === targetRoomId)?.name || '' }
                      } : {
                        room_id: targetRoomId,
                        room: { name: rooms.find(r => r.id === targetRoomId)?.name || '' }
                      };
                      updatesMap[go.id] = {
                        date: targetOcc.date,
                        start_time: targetOcc.start_time,
                        status: 'pending_reschedule',
                        schedules: updatedSchedules,
                        duration: targetOcc.duration
                      };
                    });

                    updateMultipleOccurrences(updatesMap, 'Termine zu Gruppe zusammengeführt');
                    setDropDecisionState(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    background: 'transparent',
                    color: '#1d1d1f',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  👥 Zusammenführen (Ensemble/Band-Gruppe)
                </button>

                <button
                  onClick={() => {
                    setDropDecisionState(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'transparent',
                    color: '#86868b',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseOut={e => e.currentTarget.style.color = '#86868b'}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      
      {/* Instant Action Confirmation Toast with Undo Button */}
      {actionToast && (
        <>
          <style>{`
            @keyframes floating-slide-down {
              0% { transform: translateY(-30px); opacity: 0; }
              100% { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            background: 'rgba(29, 29, 31, 0.94)',
            backdropFilter: 'blur(20px) saturate(190%)',
            WebkitBackdropFilter: 'blur(20px) saturate(190%)',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '10px 16px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            zIndex: 9999,
            fontSize: '0.82rem',
            fontWeight: 600,
            animation: 'floating-slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}>
            <span>{actionToast.message}</span>
            <button
              type="button"
              onClick={() => {
                if (actionToast.undoFn) actionToast.undoFn();
                setActionToast(null);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.16)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '100px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.28)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)'}
            >
              <RotateCcw size={12} />
              <span>Rückgängig</span>
            </button>
          </div>
        </>
      )}

      {/* Floating Save Actions Bar at the bottom of the screen */}
      {Object.keys(pendingChanges).length > 0 && (
        <>
          <style>{`
            @keyframes floating-slide-up {
              0% { transform: translate(-50%, 40px); opacity: 0; }
              100% { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
          <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px) saturate(190%)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '100px',
            padding: '10px 18px 10px 24px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            zIndex: 999,
            animation: 'floating-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem', display: 'inline-flex' }}>⚠️</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1d1d1f', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
                Du hast {Object.keys(pendingChanges).length} ungespeicherte {Object.keys(pendingChanges).length === 1 ? 'Änderung' : 'Änderungen'} in diesem Stundenplan.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  setPendingChanges({});
                  setSwapLinks([]);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ff3b30',
                  padding: '8px 16px',
                  borderRadius: '100px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 59, 48, 0.08)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                title="Änderungen rückgängig machen"
              >
                ↩ Rückgängig
              </button>

              <button
                onClick={savePendingChanges}
                style={{
                  background: brandColor,
                  border: 'none',
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: '100px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: `0 4px 12px ${brandColor}50`,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = brandColor;
                  e.currentTarget.style.boxShadow = `0 6px 16px ${brandColor}70`;
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = brandColor;
                  e.currentTarget.style.boxShadow = `0 4px 12px ${brandColor}50`;
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                Speichern & Schüler informieren
              </button>
            </div>
          </div>
        </>
      )}

      {dialogConfig && (() => {
      const isCampus = localStorage.getItem('groovelab_active_platform') === 'campus';
      return (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            .dialog-btn:hover {
              opacity: 0.95;
              transform: translateY(-0.5px);
            }
            .dialog-btn:active {
              transform: translateY(0);
            }
          `}</style>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px 28px',
              maxWidth: '440px',
              width: '90%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: isCampus ? '#e6f4ea' : '#fce8e6',
                color: isCampus ? '#34a853' : '#ea4335',
                flexShrink: 0
              }}>
                <AlertCircle size={20} style={{ color: isCampus ? '#34a853' : '#ea4335' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#1f2937'
                }}>
                  {dialogConfig.type === 'confirm' ? 'Bestätigung' : 'Hinweis'}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  color: '#4b5563',
                  whiteSpace: 'pre-wrap'
                }}>
                  {dialogConfig.message}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
              {dialogConfig.type === 'confirm' && (
                <button
                  className="dialog-btn"
                  onClick={() => {
                    const resolve = dialogConfig.resolve;
                    setDialogConfig(null);
                    resolve(false);
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {dialogConfig.cancelLabel || 'Nein'}
                </button>
              )}
              <button
                className="dialog-btn"
                onClick={() => {
                  const resolve = dialogConfig.resolve;
                  setDialogConfig(null);
                  resolve(true);
                }}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isCampus ? '#34a853' : '#ea4335',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: isCampus ? '0 4px 12px rgba(52, 168, 83, 0.2)' : '0 4px 12px rgba(234, 67, 53, 0.2)',
                  transition: 'all 0.15s ease'
                }}
              >
                {dialogConfig.confirmLabel || (dialogConfig.type === 'confirm' ? 'Ja' : 'OK')}
              </button>
            </div>
          </div>
        </div>
      );
    })()}

    {hoveredTooltip && hoveredTooltip.visible && (() => {
      let left = hoveredTooltip.x + 12;
      let top = hoveredTooltip.y + 12;
      if (typeof window !== 'undefined') {
        const tooltipEstimatedWidth = 200;
        const tooltipEstimatedHeight = 120;
        if (left + tooltipEstimatedWidth > window.innerWidth) {
          left = Math.max(8, hoveredTooltip.x - tooltipEstimatedWidth - 12);
        }
        if (top + tooltipEstimatedHeight > window.innerHeight) {
          top = Math.max(8, hoveredTooltip.y - tooltipEstimatedHeight - 12);
        }
      }
      return (
        <div style={{
          position: 'fixed',
          left: `${left}px`,
          top: `${top}px`,
          background: '#1d1d1f',
          color: '#ffffff',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          zIndex: 99999,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          whiteSpace: 'pre-line',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
          fontWeight: 500,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {hoveredTooltip.text}
        </div>
      );
    })()}

    {/* Google Calendar Quick-Click Creation Modal */}
    {quickCreateState && quickCreateState.isOpen && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}
        onClick={() => setQuickCreateState(null)}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '24px 28px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${brandColor}15`, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarIcon size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1d1d1f' }}>Termin erstellen</h3>
            </div>
            <button onClick={() => setQuickCreateState(null)} className="apple-btn" style={{ padding: '4px' }}><X size={16} /></button>
          </div>

          <div style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>
            {new Date(quickCreateState.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} • {quickCreateState.start_time.substring(0, 5)} Uhr
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                const date = quickCreateState.date;
                const startTime = quickCreateState.start_time;
                setQuickCreateState(null);
                setEditOccState({
                  id: `new-${Date.now()}`,
                  date,
                  start_time: startTime,
                  room_id: null,
                  duration: 45
                });
              }}
              className="apple-btn active"
              style={{
                background: brandColor,
                color: '#ffffff',
                fontWeight: 700,
                padding: '10px 16px',
                borderRadius: '10px',
                justifyContent: 'center',
                fontSize: '0.9rem'
              }}
            >
              <span>Unterrichtstermin anlegen</span>
            </button>
          </div>
        </div>
      </div>
    )}

    </div>
  );
}
