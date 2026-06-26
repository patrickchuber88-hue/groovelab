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
  Link2Off
} from 'lucide-react';

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
}

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
  hasSubmittedSchedule = true
}: ScheduleCalendarViewProps) {
  const toLocalYYYYMMDD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [currentDate, setCurrentDate] = useState(new Date());

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
  const schoolYearEnd   = new Date(schoolStartYear + 1, 6, 31); // July 31
  const [baseOccurrences, setBaseOccurrences] = useState<ScheduleOccurrence[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Record<string, ScheduleOccurrence>>({});
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const grabOffsetRef = useRef<number>(0);
  const draggedOccRef = useRef<ScheduleOccurrence | null>(null);
  const [cachedWeekSchedules, setCachedWeekSchedules] = useState<any[]>([]);
  const [cachedWeekEvents, setCachedWeekEvents] = useState<any[]>([]);
  const [cachedWeekRoomBookings, setCachedWeekRoomBookings] = useState<any[]>([]);
  const scrollIntervalRef = useRef<any>(null);
  const [editOccState, setEditOccState] = useState<{ id: string, date: string, start_time: string, room_id: string | null, duration?: number } | null>(null);
  const [freeRooms, setFreeRooms] = useState<any[]>([]);
  const [loadingFreeRooms, setLoadingFreeRooms] = useState(false);
  const [roomDropdownOpen, setRoomDropdownOpen] = useState(false);
  const [isGroupModeActive, setIsGroupModeActive] = useState(false);
  const [selectedForGroup, setSelectedForGroup] = useState<string[]>([]);

  const [localEndTime, setLocalEndTime] = useState<string>('');
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    text: string;
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);


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
      let text = '';
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        text = await res.text();
      } catch (corsErr) {
        const proxies = [
          `https://corsproxy.io/?${url}`,
          `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
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
        if (!success) return;
      }

      if (!text) return;

      const events = parseICS(text);
      const holidayRanges = events
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
          
          let end = ev.dtend ? new Date(ev.dtend) : new Date(ev.dtstart);
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
      setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
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
      setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

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

      const isCurrentOwnBooking = rb.booked_by === userId && 
        rb.date === targetDate && 
        rb.start_time.substring(0, 5) === formattedTargetStart;
      if (isCurrentOwnBooking) return false;

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

  // Helper für Mutations
  const updateOccurrence = (id: string, updates: Partial<ScheduleOccurrence>) => {
    if (id.startsWith('vacant-')) return;
    setPendingChanges(prev => {
      const baseOcc = baseOccurrences.find(o => o.id === id);
      const existing = prev[id] || baseOcc;
      if (!existing) return prev;
      
      const newOcc = { ...existing, ...updates };
      // Tracking der Ursprungsdaten – immer auf Basis der originalen DB-Werte (baseOcc)
      if (baseOcc && !newOcc.original_date) {
        newOcc.original_date = baseOcc.date;
      }
      if (baseOcc && !newOcc.original_start_time) {
        newOcc.original_start_time = baseOcc.start_time;
      }
      return { ...prev, [id]: newOcc };
    });
  };

  const updateMultipleOccurrences = (updatesMap: Record<string, Partial<ScheduleOccurrence>>) => {
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

      for (const change of changesToSave) {
        const originalOcc = baseOccurrences.find(o => o.id === change.id);

        if (change.id.startsWith('mock-')) {
          if ((!change.student_id || change.student_id === 'vacant') && change.status !== 'cancelled') {
            continue;
          }
          const { id, student, original_start_time, schedules, template_room_id, room_override_id, room_override_name, vacant_student_id, isGroupBlock, groupOccurrences, ...insertData } = change;
          insertData.original_date = insertData.original_date || change.date;
          
          if (!insertData.student_id) {
            insertData.student_id = null;
          }

          const origDateStr = change.original_date || (originalOcc ? originalOcc.date : change.date);
          const origTimeStr = change.original_start_time || (originalOcc ? originalOcc.start_time : change.start_time);
          
          let finalStatus = change.status;
          if (change.status !== 'cancelled' && change.date === origDateStr && change.start_time.substring(0, 5) === origTimeStr.substring(0, 5)) {
            finalStatus = 'scheduled';
          }

          insertData.original_date = origDateStr;
          insertData.status = finalStatus;
          
          if (isGroupBlock && groupOccurrences && groupOccurrences.length > 0) {
            const groupInserts = [];
            for (const gs of groupOccurrences) {
              let scheduleId = undefined;
              try {
                const { data: schData } = await supabase
                  .from('schedules')
                  .select('id')
                  .eq('student_id', gs.id)
                  .eq('teacher_id', userId)
                  .limit(1);
                if (schData && schData.length > 0) {
                  scheduleId = schData[0].id;
                }
              } catch (e) {}
              
              groupInserts.push({
                ...insertData,
                student_id: gs.id,
                schedule_id: scheduleId,
                duration: gs.duration || insertData.duration
              });
            }
            
            const { error } = await supabase.from('schedule_occurrences').insert(groupInserts);
            if (error) throw error;
          } else {
            try {
              const { data: schData } = await supabase
                .from('schedules')
                .select('id')
                .eq('student_id', change.student_id || null)
                .eq('teacher_id', userId)
                .limit(1);
              
              if (schData && schData.length > 0) {
                insertData.schedule_id = schData[0].id;
              } else {
                insertData.schedule_id = undefined;
              }
            } catch (schErr) {
              console.warn('Error fetching schedule_id for mock insert:', schErr);
              insertData.schedule_id = undefined;
            }
            
            const { error } = await supabase.from('schedule_occurrences').insert(insertData);
            if (error) throw error;
          }
        } else {
          const origDateStr = change.original_date || (originalOcc ? originalOcc.date : change.date);
          const origTimeStr = change.original_start_time || (originalOcc ? originalOcc.start_time : change.start_time);
          
          let finalStatus = change.status;
          if (change.status !== 'cancelled' && change.date === origDateStr && change.start_time.substring(0, 5) === origTimeStr.substring(0, 5)) {
            finalStatus = 'scheduled';
          }

          const { error } = await supabase.from('schedule_occurrences')
            .update({
              date: change.date,
              start_time: change.start_time,
              status: finalStatus,
              original_date: origDateStr,
              student_acknowledged: false,
              student_id: change.student_id ? change.student_id : null,
              duration: change.duration
            })
            .eq('id', change.id);
          
          if (error) throw error;
        }

        // Sync room booking
        try {
          const oldDate = originalOcc?.date || change.date;
          const oldStartTime = originalOcc?.start_time || change.start_time;

          await supabase.from('room_bookings')
            .delete()
            .eq('booked_by', userId)
            .eq('date', oldDate)
            .eq('start_time', oldStartTime);

          const origDateStr = change.original_date || (originalOcc ? originalOcc.date : change.date);
          const origTimeStr = change.original_start_time || (originalOcc ? originalOcc.start_time : change.start_time);
          const originalRoomId = originalOcc?.template_room_id !== undefined 
            ? originalOcc.template_room_id 
            : (originalOcc?.schedules?.room_id || null);
          const currentRoomId = change.schedules?.room_id || null;

          const timeChanged = change.date !== origDateStr || change.start_time.substring(0, 5) !== origTimeStr.substring(0, 5);
          const roomChanged = originalRoomId !== currentRoomId;
          const isCancelled = change.status === 'cancelled';

          const needsRoomBooking = !isCancelled && currentRoomId && (timeChanged || roomChanged);

          if (needsRoomBooking) {
            const startMins = timeToMinutes(change.start_time);
            const duration = change.duration || 45;
            const endMins = startMins + duration;
            const eh = Math.floor(endMins / 60);
            const em = endMins % 60;
            const endTimeStr = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`;

            const studentName = `${change.student?.first_name || ''} ${change.student?.last_name || ''}`.trim() || 'Schüler';

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
              if (change.status === 'cancelled') {
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
                  if (change.status === 'cancelled') {
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
                      metadata: { occurrence_id: change.id, type: change.status === 'cancelled' ? 'cancelled' : 'rescheduled' }
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

  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    // Skip August entirely: jump back to July 31 if we'd land in August
    if (d.getMonth() === 7) d.setMonth(6, 31);
    if (d < schoolYearStart) return; // don't navigate before school year start
    setCurrentDate(d);
  };

  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    // Skip August entirely: jump forward to September 1 if we'd land in August
    if (d.getMonth() === 7) d.setMonth(8, 1);
    if (d > schoolYearEnd) return; // don't navigate past school year end
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

  const loadOccurrencesRef = useRef(loadOccurrences);
  useEffect(() => {
    loadOccurrencesRef.current = loadOccurrences;
  });

  useEffect(() => {
    loadOccurrencesRef.current();
  }, [weekStart.getTime(), userId, JSON.stringify(boards), holidays]);

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
            loadOccurrencesRef.current();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      try {
        const { data: rbData } = await supabase
          .from('room_bookings')
          .select('room_id, date, start_time, room:rooms(name)')
          .eq('booked_by', userId)
          .gte('date', startDateStr)
          .lte('date', endDateStr);
        if (rbData) {
          roomBookings = rbData;
        }
      } catch (err) {
        console.warn('Error fetching room bookings:', err);
      }

      // Pre-load and cache school-wide week details for instant conflict evaluation
      try {
        const { data: schedData } = await supabase
          .from('schedules')
          .select('room_id, time_slot, duration, day_of_week, teacher:users(first_name, last_name)')
          .eq('school_id', schoolId)
          .not('room_id', 'is', null);
        if (schedData) setCachedWeekSchedules(schedData);

        const { data: evData } = await supabase
          .from('campus_events')
          .select('room_id, event_date, start_time, end_time, title')
          .eq('school_id', schoolId)
          .gte('event_date', startDateStr)
          .lte('event_date', endDateStr)
          .not('room_id', 'is', null);
        if (evData) setCachedWeekEvents(evData);

        const { data: rbData } = await supabase
          .from('room_bookings')
          .select('room_id, date, start_time, end_time, booked_by, user:users(first_name, last_name)')
          .eq('school_id', schoolId)
          .gte('date', startDateStr)
          .lte('date', endDateStr)
          .not('room_id', 'is', null);
        if (rbData) setCachedWeekRoomBookings(rbData);
      } catch (cacheErr) {
        console.warn('Error pre-loading week bookings cache:', cacheErr);
      }

      try {
        const { data, error } = await supabase
          .from('schedule_occurrences')
          .select('*, student:users!schedule_occurrences_student_id_fkey(first_name, last_name, instrument, is_campus_active, is_groovelab_active), schedules!schedule_occurrences_schedule_id_fkey(room_id, room:rooms(name))')
          .eq('teacher_id', userId)
          .or(`and(date.gte.${startDateStr},date.lte.${endDateStr}),and(original_date.gte.${startDateStr},original_date.lte.${endDateStr})`)
          .order('date')
          .order('start_time');

        if (!error && data) {
          fetchedData = data.map((occ: any) => {
            const booking = roomBookings.find(b => 
              b.date === occ.date && 
              b.start_time.substring(0, 5) === occ.start_time.substring(0, 5)
            );
            if (booking) {
              return {
                ...occ,
                template_room_id: occ.schedules?.room_id || null,
                schedules: occ.schedules ? {
                  ...occ.schedules,
                  room_id: booking.room_id,
                  room: booking.room
                } : {
                  room_id: booking.room_id,
                  room: booking.room
                }
              };
            }
            return occ;
          });
        }
      } catch (err) {
        console.warn('DB fetch failed', err);
      }

      // Dynamically detect rescheduling by comparing database records with template boards
      if (boards && boards.length > 0) {
        fetchedData = fetchedData.map(occ => {
          if (!occ.student_id) return occ;
          
          let templateDayOfWeek: number | null = null;
          let templateTime = '';
          
          boards.forEach(board => {
            const found = board.students?.find((s: any) => s.id === occ.student_id);
            if (found) {
              templateDayOfWeek = board.dayOfWeek;
              templateTime = found.assignedTime || '';
            }
          });
          
          if (templateDayOfWeek !== null) {
            const offset = templateDayOfWeek - 1;
            const origDayDate = new Date(weekStart);
            origDayDate.setDate(origDayDate.getDate() + offset);
            const origDateStr = toLocalYYYYMMDD(origDayDate);
            const formattedTemplateTime = templateTime.includes(':') && templateTime.split(':').length === 2 ? `${templateTime}:00` : (templateTime || '00:00:00');
            
            const hasDateDiff = occ.date !== origDateStr;
            const hasTimeDiff = occ.start_time.substring(0, 5) !== formattedTemplateTime.substring(0, 5);
            
            if (hasDateDiff || hasTimeDiff) {
              return {
                ...occ,
                original_date: occ.original_date || origDateStr,
                original_start_time: occ.original_start_time || formattedTemplateTime,
                status: occ.status === 'scheduled' ? 'pending_reschedule' : occ.status
              };
            }
          }
          return occ;
        });
      }

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

          // Skip projections for August (month 7) — it's outside the school year
          if (dayDate.getMonth() === 7) return;

          board.students.forEach((student: any) => {
            const formattedTime = student.assignedTime ? `${student.assignedTime}:00` : '00:00:00';
            if (student.isBreak) {
              const isBreakCancelled = fetchedData.some(o => 
                o.date === dateStr && 
                (!o.student_id || o.student_id === 'vacant') && 
                o.start_time.substring(0, 5) === (student.assignedTime || '').substring(0, 5) && 
                o.status === 'cancelled'
              );
              // Only project the break if it is not cancelled, and there is no active/non-cancelled appointment occupying this slot
              const isOccupied = fetchedData.some(o => o.date === dateStr && o.start_time && (o.start_time || '').substring(0, 5) === (student.assignedTime || '').substring(0, 5) && o.status !== 'cancelled');
              if (!isBreakCancelled && !isOccupied) {
                projectedData.push({
                  id: `mock-${board.id}-${student.id}`,
                  student_id: '',
                  teacher_id: userId,
                  date: dateStr,
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
              // Check if a saved database record already covers this student (or any of the group students) in this week range
              let dbRecord;
              if (student.isGroup && student.groupStudents) {
                dbRecord = fetchedData.find(o => 
                  student.groupStudents.some((gs: any) => gs.id === o.student_id) &&
                  o.date === dateStr &&
                  o.start_time.substring(0, 5) === (student.assignedTime || '').substring(0, 5)
                );
              } else {
                dbRecord = fetchedData.find(o => o.student_id === student.id);
              }
              
              // If there is no DB record, OR if the DB record has been rescheduled/moved away from this template day/time
              const isRescheduledAway = dbRecord && (dbRecord.date !== dateStr || (dbRecord.start_time || '').substring(0, 5) !== (formattedTime || '').substring(0, 5));
              
              if (!dbRecord || isRescheduledAway) {
                // If the student was rescheduled away, project a vacant placeholder to anchor the original time slot
                // only if the slot is not already occupied by another active reschedule/swap record.
                const isSlotOccupied = fetchedData.some(o => o.date === dateStr && (o.start_time || '').substring(0, 5) === (formattedTime || '').substring(0, 5) && o.student_id && o.student_id !== 'vacant');
                
                if (isRescheduledAway && !isSlotOccupied) {
                  projectedData.push({
                    id: `vacant-${board.id}-${student.id}`,
                    student_id: 'vacant', // special marker for vacant placeholder
                    vacant_student_id: student.id,
                    teacher_id: userId,
                    date: dateStr,
                    start_time: formattedTime,
                    duration: student.duration,
                    status: 'scheduled',
                    student: { 
                      first_name: '❇️ Freier Slot', 
                      last_name: `(zuvor: ${student.first_name})`, 
                      instrument: student.instrument || ''
                    },
                    schedules: {
                      room_id: board.roomId || null,
                      room: {
                        name: rooms.find(r => r.id === board.roomId)?.name || ''
                      }
                    }
                  });
                } else if (!dbRecord) {
                  // Standard projected card for student not in DB yet
                  projectedData.push({
                    id: `mock-${board.id}-${student.id}`,
                    student_id: student.id,
                    teacher_id: userId,
                    date: dateStr,
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
            }
          });
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
        (occ.status === 'cancelled' || (occ.original_date && (occ.original_date !== occ.date || occ.original_start_time !== occ.start_time)))
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

  const cleanupDragGhost = () => {
    const ghost = document.getElementById('drag-preview-ghost');
    if (ghost && ghost.parentNode) {
      ghost.parentNode.removeChild(ghost);
    }
  };

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
    const sourceOcc = occurrences.find(o => o.id === id);
    draggedOccRef.current = sourceOcc || null;
    
    // Save the vertical offset where the card was grabbed
    const rect = e.currentTarget.getBoundingClientRect();
    const grabOffset = e.clientY - rect.top;
    grabOffsetRef.current = grabOffset;
    e.dataTransfer.setData('grabOffset', String(grabOffset));

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
    cleanupDragGhost();
    stopAutoScroll();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragOverDay = (e: React.DragEvent, targetDateStr: string, dayBaselineMinutes: number) => {
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const grabOffset = grabOffsetRef.current || 15;
    const relativeY = e.clientY - rect.top - grabOffset;
    const droppedMinutes = dayBaselineMinutes + (relativeY / 2.5);
    
    // Snap to 15 mins
    const snappedMinutes = Math.round(droppedMinutes / 15) * 15;
    
    // Clamp to valid values based on dragged occurrence duration
    const sourceOcc = draggedOccRef.current;
    if (!sourceOcc) return;
    const duration = sourceOcc.duration || 30;
    const clampedMinutes = Math.min(1440 - duration, Math.max(dayBaselineMinutes, snappedMinutes));
    
    // Position/update the ghost DOM element directly
    const previewTopPx = (clampedMinutes - dayBaselineMinutes) * 2.5;
    const previewHeightPx = duration * 2.5 - 8;
    const h = Math.floor(clampedMinutes / 60) % 24;
    const m = clampedMinutes % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    
    const isCampus = localStorage.getItem('groovelab_active_platform') === 'campus';
    const highlightColor = isCampus ? '#137333' : '#007aff';
    const highlightBg = isCampus ? 'rgba(19, 115, 51, 0.08)' : 'rgba(0, 122, 255, 0.08)';
    
    let ghost = document.getElementById('drag-preview-ghost');
    if (!ghost) {
      ghost = document.createElement('div');
      ghost.id = 'drag-preview-ghost';
      ghost.style.position = 'absolute';
      ghost.style.left = '8px';
      ghost.style.right = '8px';
      ghost.style.borderRadius = '8px';
      ghost.style.padding = '8px';
      ghost.style.boxSizing = 'border-box';
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = '10';
      ghost.style.display = 'flex';
      ghost.style.flexDirection = 'column';
      ghost.style.justifyContent = 'center';
      ghost.style.opacity = '0.85';
      ghost.style.transition = 'top 0.12s cubic-bezier(0.16, 1, 0.3, 1), height 0.12s, transform 0.12s';
    }
    
    ghost.style.top = `${previewTopPx}px`;
    ghost.style.height = `${previewHeightPx}px`;
    ghost.style.background = highlightBg;
    ghost.style.border = `2px dashed ${highlightColor}`;
    ghost.style.transform = 'scale(0.97)';
    
    const studentName = sourceOcc.student ? `${sourceOcc.student.first_name} ${sourceOcc.student.last_name}` : 'Pause';
    ghost.innerHTML = `
      <div style="font-size: 0.72rem; font-weight: 800; color: ${highlightColor};">${timeStr} Uhr</div>
      <div style="font-size: 0.78rem; font-weight: 800; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
        ${studentName}
      </div>
    `;
    
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
      
      stopAutoScroll();
      
      if (relativeCursorY < scrollThreshold) {
        const speed = Math.round((scrollThreshold - relativeCursorY) / scrollThreshold * maxScrollSpeed);
        scrollIntervalRef.current = setInterval(() => {
          scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - speed);
        }, 16);
      } else if (relativeCursorY > scrollRect.height - scrollThreshold) {
        const speed = Math.round((relativeCursorY - (scrollRect.height - scrollThreshold)) / scrollThreshold * maxScrollSpeed);
        scrollIntervalRef.current = setInterval(() => {
          scrollContainer.scrollTop = Math.min(scrollContainer.scrollHeight - scrollRect.height, scrollContainer.scrollTop + speed);
        }, 16);
      }
    }
  };

  const handleDragLeaveDay = () => {
    cleanupDragGhost();
    stopAutoScroll();
  };

  const handleDropOnDay = async (e: React.DragEvent, targetDateStr: string, dayBaselineMinutes: number) => {
    e.preventDefault();
    cleanupDragGhost();
    stopAutoScroll();
    if ((currentUserRole === 'admin' || currentUserRole === 'secretary') && !hasSubmittedSchedule) {
      await showAlert('Raumzuteilungen oder Verschiebungen sind gesperrt, da dieser Stundenplan noch nicht eingereicht wurde.');
      return;
    }
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId) return;

    const grabOffset = grabOffsetRef.current || 0;

    const sourceOcc = occurrences.find(o => o.id === sourceId);
    const duration = sourceOcc?.duration || 30;

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top - grabOffset;
    const droppedMinutes = dayBaselineMinutes + (relativeY / 2.5);
    const snappedMinutes = Math.min(1440 - duration, Math.max(dayBaselineMinutes, Math.round(droppedMinutes / 15) * 15));
    const hours = Math.floor(snappedMinutes / 60) % 24;
    const mins = snappedMinutes % 60;
    const targetStartTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;

    if (sourceOcc) {
      const roomId = sourceOcc.schedules?.room_id || null;
      const conflict = getRoomConflict(sourceId, targetDateStr, targetStartTime, sourceOcc.duration, roomId);
      if (conflict) {
        const roomName = sourceOcc.schedules?.room?.name || 'diesem Raum';
        const confirmMsg = `Warnung: Der Raum "${roomName}" ist an diesem Tag um ${targetStartTime.substring(0, 5)} Uhr bereits belegt durch:\n- ${conflict}\n\nMöchtest du den Termin trotzdem dorthin verschieben?`;
        if (!await showConfirm(confirmMsg)) {
          setDraggedId(null);
          return;
        }
      }
    }

    moveOccurrenceOrGroup(sourceId, { date: targetDateStr, start_time: targetStartTime, status: 'pending_reschedule' });
    setDraggedId(null);
  };

  const handleDropOnVacant = async (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId) return;

    const grabOffsetStr = e.dataTransfer.getData('grabOffset');
    const grabOffset = grabOffsetStr ? parseFloat(grabOffsetStr) : 0;

    const sourceOcc = occurrences.find(o => o.id === sourceId);
    if (!sourceOcc) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top - grabOffset;
    const droppedMinutes = 0 + (relativeY / 2.5);
    const snappedMinutes = Math.round(droppedMinutes / 15) * 15;
    const hours = Math.floor(snappedMinutes / 60) % 24;
    const mins = snappedMinutes % 60;
    const targetStartTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;

    const roomId = sourceOcc.schedules?.room_id || null;
    const conflict = getRoomConflict(sourceId, targetDateStr, targetStartTime, sourceOcc.duration, roomId);
    if (conflict) {
      const roomName = sourceOcc.schedules?.room?.name || 'diesem Raum';
      const confirmMsg = `Warnung: Der Raum "${roomName}" ist an diesem Tag um ${targetStartTime.substring(0, 5)} Uhr bereits belegt durch:\n- ${conflict}\n\nMöchtest du den Termin trotzdem dorthin verschieben?`;
      if (!await showConfirm(confirmMsg)) {
        setDraggedId(null);
        return;
      }
    }

    await moveOccurrenceOrGroupDirectly(sourceId, { date: targetDateStr, start_time: targetStartTime, status: 'pending_reschedule' });
    setDraggedId(null);
  };

  const executeOccurrenceSwap = async (sourceId: string, targetId: string) => {
    const sourceOcc = occurrences.find(o => o.id === sourceId);
    const targetOcc = occurrences.find(o => o.id === targetId);
    if (!sourceOcc || !targetOcc) return;

    // Detect if either slot is a cancelled lesson
    const isSourceCancelled = sourceOcc.status === 'cancelled';
    const isTargetCancelled = targetOcc.status === 'cancelled';

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
        sourceStudentName: `${normalOcc.student?.first_name || ''} ${normalOcc.student?.last_name || ''}`.trim() || 'Schüler',
        targetStudentName: `${cancelledOcc.student?.first_name || ''} ${cancelledOcc.student?.last_name || ''}`.trim() || 'Schüler',
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
      updatesMap[o.id] = { date: targetOcc.date, start_time: targetOcc.start_time, status: 'pending_reschedule' };
    });
    tgtGroupOccs.forEach(o => {
      updatesMap[o.id] = { date: sourceOcc.date, start_time: sourceOcc.start_time, status: 'pending_reschedule' };
    });

    updateMultipleOccurrences(updatesMap);
    
    setDraggedId(null);
    setSwapLinks(prev => [...prev, { id1: sourceId, id2: targetId }]);
  };

  const handleDropOnOccurrence = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if ((currentUserRole === 'admin' || currentUserRole === 'secretary') && !hasSubmittedSchedule) {
      await showAlert('Raumzuteilungen oder Verschiebungen sind gesperrt, da dieser Stundenplan noch nicht eingereicht wurde.');
      return;
    }
    const sourceId = e.dataTransfer.getData('text/plain');
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

          await persistMultipleOccurrencesDirectly(updatesMap);
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
    if (occ) {
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

      await persistMultipleOccurrencesDirectly(updatesMap);
    }
    setEditOccState(null);
  };
  const savePendingChanges = async () => {
    await persistChangesDirectly(Object.values(pendingChanges));
    setPendingChanges({});
  };

  const handleCancel = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await persistOccurrenceDirectly(id, { status: 'cancelled' });
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

    await persistMultipleOccurrencesDirectly(updatesMap);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return { bg: 'rgba(220, 252, 231, 0.45)', border: '#10b981', text: '#065f46' };
      case 'cancelled':
      case 'teacher_sick':
      case 'canceled_by_teacher_sick':
        return { bg: 'rgba(254, 226, 226, 0.45)', border: '#ef4444', text: '#991b1b' };
      case 'pending_reschedule': return { bg: 'rgba(254, 243, 199, 0.45)', border: '#f59e0b', text: '#92400e' };
      case 'rescheduled_confirmed': return { bg: 'rgba(220, 252, 231, 0.45)', border: '#10b981', text: '#065f46' };
      default: return { bg: 'rgba(241, 245, 249, 0.45)', border: '#cbd5e1', text: '#475569' };
    }
  };

  const timeToMinutes = (t: string) => {
    if (!t) return 0;
    const parts = t.split(':');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    return h * 60 + m;
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

  const nonCancelledOccurrences = occurrences.filter(o => o.status !== 'cancelled');
  const weekMinMinutes = nonCancelledOccurrences.length > 0
    ? nonCancelledOccurrences.reduce((min, o) => {
        const mins = timeToMinutes(o.start_time);
        return mins < min ? mins : min;
      }, 24 * 60)
    : 13 * 60;

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
      `}</style>
      
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.55)', 
        backdropFilter: 'blur(20px) saturate(190%)', 
        borderRadius: '20px', 
        padding: '16px 20px', 
        border: '1px solid rgba(255, 255, 255, 0.5)', 
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.03)', 
        display: 'grid', 
        gridTemplateColumns: 'auto 1fr auto auto', 
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ height: '40px', width: '40px', borderRadius: '12px', background: 'rgba(22, 163, 74, 0.15)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CalendarIcon size={20} />
          </div>
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              KW {weekNumber}
            </h2>
            {(currentUserRole === 'admin' || currentUserRole === 'secretary') && teachers && teachers.length > 0 && selectedTeacherId && setSelectedTeacherId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#86868b' }}>Lehrkraft:</span>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.75)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#1d1d1f',
                    outline: 'none',
                    cursor: 'pointer'
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

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <span style={{ color: '#86868b', fontSize: '0.94rem', fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            ({weekStart.toLocaleDateString('de-DE')} - {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString('de-DE')})
          </span>
        </div>

        {activeTab && setActiveTab && (
          <div className="app-segmented-switch" style={{ margin: 0 }}>
            <button 
              onClick={() => setActiveTab('calendar')}
              className={`app-segmented-switch-btn ${(activeTab as string) === 'calendar' ? 'active' : ''}`}
            >
              Stundenplan
            </button>
            <button 
              onClick={() => setActiveTab('designer')}
              className={`app-segmented-switch-btn ${(activeTab as string) === 'designer' ? 'active' : ''}`}
            >
              Stundenplan-Designer
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => {
              setIsGroupModeActive(prev => !prev);
              setSelectedForGroup([]);
            }}
            style={{
              background: isGroupModeActive 
                ? (localStorage.getItem('groovelab_active_platform') === 'campus' ? '#137333' : '#ea4335') 
                : 'transparent',
              color: isGroupModeActive ? 'white' : '#64748b',
              border: `1px solid ${isGroupModeActive 
                ? (localStorage.getItem('groovelab_active_platform') === 'campus' ? '#137333' : '#ea4335') 
                : '#cbd5e1'}`,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s'
            }}
          >
            <Users size={13} />
            {isGroupModeActive ? 'Gruppen-Modus aktiv' : 'Gruppentermine'}
          </button>
          {isGroupModeActive && selectedForGroup.length >= 2 && (
            <button
              type="button"
              onClick={handleMergeSelectedOccurrences}
              style={{
                background: localStorage.getItem('groovelab_active_platform') === 'campus' ? '#137333' : '#ea4335',
                color: 'white',
                border: 'none',
                fontWeight: 650,
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s',
                boxShadow: `0 2px 4px ${localStorage.getItem('groovelab_active_platform') === 'campus' ? 'rgba(19, 115, 51, 0.3)' : 'rgba(234, 67, 53, 0.3)'}`
              }}
            >
              Zusammenführen ({selectedForGroup.length})
            </button>
          )}

          <button 
            onClick={handleResetWeek}
            style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            title="Alle ungespeicherten Änderungen in dieser Woche verwerfen"
          >
            Woche zurücksetzen
          </button>
          

          {Object.keys(pendingChanges).length > 0 && (
            <button 
              onClick={savePendingChanges}
              style={{ background: '#16a34a', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(22, 163, 74, 0.3)' }}
              onMouseOver={e => e.currentTarget.style.background = '#15803d'}
              onMouseOut={e => e.currentTarget.style.background = '#16a34a'}
            >
              Änderungen speichern ({Object.keys(pendingChanges).length})
            </button>
          )}
          <button 
            onClick={jumpToToday}
            style={{ background: 'transparent', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            Heute
          </button>
          
          <button 
            onClick={jumpToMonthStart}
            style={{ background: 'transparent', color: '#2563eb', border: '1px solid rgba(37, 99, 235, 0.2)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            Zum Monatsanfang
          </button>
          
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.7)', borderRadius: '10px', padding: '4px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <button onClick={prevWeek} style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: '6px', color: '#1d1d1f' }}><ChevronLeft size={18} /></button>
            <button onClick={nextWeek} style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: '6px', color: '#1d1d1f' }}><ChevronRight size={18} /></button>
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

        <div ref={gridRef} style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', 
          gap: '0px',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          padding: '20px 8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          overflow: 'hidden'
        }}>
        {[0, 1, 2, 3, 4, 5, 6].map(offset => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + offset);
          const dateStr = toLocalYYYYMMDD(dayDate);
          
          const dayOfWeek = dayDate.getDay() || 7;
          const daySchedules = cachedWeekSchedules.filter((s: any) => s.day_of_week === dayOfWeek);
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

          let dayBaselineMinutes = 13 * 60;
          if (nativeOccs.length > 0) {
            dayBaselineMinutes = timeToMinutes(nativeOccs[0].start_time);
          } else if (movedInOccs.length > 0) {
            const origStarts = movedInOccs.map(occ => {
              const origDate = occ.original_date;
              if (origDate) {
                const parts = origDate.split('-');
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                const origDateObj = new Date(y, m, d);
                const origDayOfWeek = origDateObj.getDay() || 7;
                
                const board = boards.find(b => b.dayOfWeek === origDayOfWeek);
                if (board && board.students && board.students.length > 0) {
                  const times = board.students
                    .map((s: any) => s.assignedTime)
                    .filter(Boolean);
                  if (times.length > 0) {
                    times.sort();
                    return timeToMinutes(times[0]);
                  }
                }

                // Fallback to occurrences list
                const origDayOccs = occurrences.filter(o => o.date === origDate && (!o.original_date || o.original_date === origDate));
                const firstOrig = origDayOccs.sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
                if (firstOrig) {
                  return timeToMinutes(firstOrig.start_time);
                }
              }
              return timeToMinutes(occ.start_time);
            });
            dayBaselineMinutes = Math.min(...origStarts);
          }

          // Ensure baseline is not after the earliest actual occurrence start time of the day
          const actualStarts = dayOccurrences.map(o => timeToMinutes(o.start_time));
          if (actualStarts.length > 0) {
            const minActualStart = Math.min(...actualStarts);
            if (dayBaselineMinutes > minActualStart) {
              dayBaselineMinutes = minActualStart;
            }
          }
          
          const columnHeight = (1440 - dayBaselineMinutes) * 2.5;
          const startHour = Math.ceil(dayBaselineMinutes / 60);
          const markers = [];
          for (let h = startHour; h <= 24; h++) {
            markers.push({
              hour: h,
              top: (h * 60 - dayBaselineMinutes) * 2.5
            });
          }

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
                borderRight: offset < 6 ? '1px solid #e2e8f0' : 'none'
              }}
            >
              <div style={{
                textAlign: 'center',
                paddingBottom: '8px',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dayName}</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1d1d1f' }}>{dayDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}</div>
                {activeHoliday && (
                  <div style={{
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    color: '#047857',
                    background: 'rgba(16, 185, 129, 0.08)',
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
                onDragOver={(e) => handleDragOverDay(e, dateStr, dayBaselineMinutes)}
                onDragLeave={handleDragLeaveDay}
                onDrop={(e) => handleDropOnDay(e, dateStr, dayBaselineMinutes)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', height: `${columnHeight}px`, minHeight: `${columnHeight}px` }}
              >
                {/* Column Background Layout: White inside terminblock, gray outside */}
                {(() => {
                  if (daySchedules.length === 0) {
                    // No teaching schedule: entire day is outside terminblock (gray)
                    return (
                      <div 
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: 0,
                          height: `${(1440 - dayBaselineMinutes) * 2.5}px`,
                          background: 'rgba(241, 245, 249, 0.35)',
                          zIndex: 0,
                          pointerEvents: 'none'
                        }}
                      />
                    );
                  }

                  // Find earliest start and latest end minutes
                  let earliestStart = 1440;
                  let latestEnd = 0;
                  daySchedules.forEach((s: any) => {
                    const start = timeToMinutes(s.time_slot);
                    const end = start + (s.duration || 45);
                    if (start < earliestStart) earliestStart = start;
                    if (end > latestEnd) latestEnd = end;
                  });

                  const topGrayHeight = Math.max(0, (earliestStart - dayBaselineMinutes) * 2.5);
                  const bottomGrayTop = Math.max(0, (latestEnd - dayBaselineMinutes) * 2.5);
                  const bottomGrayHeight = Math.max(0, (1440 - latestEnd) * 2.5);

                  return (
                    <>
                      {/* White background for the entire terminblock area */}
                      <div 
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: `${Math.max(0, (earliestStart - dayBaselineMinutes) * 2.5)}px`,
                          height: `${Math.max(0, (latestEnd - earliestStart) * 2.5)}px`,
                          background: '#ffffff',
                          zIndex: 0,
                          pointerEvents: 'none'
                        }}
                      />
                      {/* Gray overlay BEFORE the terminblock */}
                      {topGrayHeight > 0 && (
                        <div 
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: 0,
                            height: `${topGrayHeight}px`,
                            background: 'rgba(241, 245, 249, 0.35)',
                            zIndex: 0,
                            pointerEvents: 'none'
                          }}
                        />
                      )}
                      {/* Gray overlay AFTER the terminblock */}
                      {bottomGrayHeight > 0 && (
                        <div 
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${bottomGrayTop}px`,
                            height: `${bottomGrayHeight}px`,
                            background: 'rgba(241, 245, 249, 0.35)',
                            zIndex: 0,
                            pointerEvents: 'none'
                          }}
                        />
                      )}
                    </>
                  );
                })()}

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
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.75rem' }}>Lade...</div>
              ) : dayOccurrences.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 500 }}>Keine Termine</div>
              ) : (() => {
                let lastEndTimeMinutes = dayBaselineMinutes;
                
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
                      (g.mainOcc.schedules?.room_id || null) === room_id
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

                return renderedGroups.map(group => {
                  const occurrencesInGroup = group.occurrences;
                  const isGroup = occurrencesInGroup.length > 1;
                  const occ = group.mainOcc;
                  
                  const isBreak = !occ.student_id;
                  const isVacant = occ.student_id === 'vacant';

                  if (isBreak && occ.status === 'cancelled') {
                    return null;
                  }

                  const isSick = !isBreak && !isVacant && (
                    occ.status === 'teacher_sick' || 
                    occ.status === 'canceled_by_teacher_sick' ||
                    (sickUntil && (!sickStart || occ.date >= sickStart) && occ.date <= sickUntil)
                  );

                  const colors = isBreak 
                    ? { bg: '#fff7ed', border: '#f97316', text: '#c2410c' } 
                    : isSick 
                      ? { bg: 'rgba(254, 226, 226, 0.45)', border: '#ef4444', text: '#991b1b' }
                      : isVacant
                        ? { bg: 'rgba(16, 185, 129, 0.02)', border: '#10b981', text: '#047857' }
                        : getStatusColor(occ.status);
                  let finalColors = { ...colors };
                  let cardBackground = '';
 
                  const isRoomOverridden = occ.template_room_id !== undefined && occ.template_room_id !== (occ.schedules?.room_id || null);
                  const isCancelled = occ.status === 'cancelled';
                  const isRescheduled = !isBreak && !isVacant && !isSick && (
                    occ.status === 'pending_reschedule' || 
                    occ.status === 'rescheduled_confirmed' ||
                    (occ.original_date && occ.original_date !== occ.date) ||
                    isRoomOverridden
                  );
                  const isResetPending = !isBreak && !isVacant && !isSick &&
                    occ.status === 'scheduled' &&
                    occ.original_date &&
                    occ.date === occ.original_date &&
                    occ.student_acknowledged === false;
 
                  const isWaiting = !isBreak && !isVacant && !isSick && (
                    isGroup 
                      ? occurrencesInGroup.some(o => o.student_acknowledged === false)
                      : (isResetPending || (isRescheduled && !(occ.status === 'rescheduled_confirmed' || occ.student_acknowledged)))
                  );

                  const isGroovelab = localStorage.getItem('groovelab_active_platform') !== 'campus';

                  if (!isBreak && !isVacant && !isSick && !isCancelled) {
                    if (isGroup) {
                      if (isWaiting) {
                        cardBackground = 'repeating-linear-gradient(-45deg, #e8f0fe 0px, #e8f0fe 8px, #ffffff 8px, #ffffff 16px)';
                        finalColors.border = '#0b57d0';
                        finalColors.text = '#174ea6';
                      } else {
                        cardBackground = 'linear-gradient(135deg, #f4f8ff 0%, #e8f0fe 100%)';
                        finalColors.border = '#0b57d0';
                        finalColors.text = '#174ea6';
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
                      // Campus: green confirmed / green-white diagonal unconfirmed
                      if (isWaiting) {
                        cardBackground = 'repeating-linear-gradient(-45deg, #e6f4ea 0px, #e6f4ea 8px, #ffffff 8px, #ffffff 16px)';
                        finalColors.border = '#10b981';
                        finalColors.text = '#137333';
                      } else {
                        cardBackground = 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)';
                        finalColors.border = '#10b981';
                        finalColors.text = '#137333';
                      }
                    }
                  }
 
                  const occStartMinutes = timeToMinutes(occ.start_time);
                  const topPx = (occStartMinutes - dayBaselineMinutes) * 2.5;
                  
                  const displayNames = isGroup 
                    ? occurrencesInGroup.map(o => `${o.student?.first_name || ''} ${o.student?.last_name || ''}`.trim()).join(', ')
                    : `${occ.student?.first_name || ''} ${occ.student?.last_name || ''}`.trim();

                  return (
                    <React.Fragment key={group.key}>
                      <div 
                        id={`occ-${occ.id}`}
                        draggable={!( (currentUserRole === 'admin' || currentUserRole === 'secretary') && !hasSubmittedSchedule ) && !isBreak && !isVacant}
                        onDragStart={(e) => handleDragStart(e, occ.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnOccurrence(e, occ.id)}
                        onMouseEnter={(e) => {
                          const text = isGroup 
                            ? occurrencesInGroup.map(o => `${o.student?.first_name || ''} ${o.student?.last_name || ''}`.trim()).join('\n')
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
                            ? occurrencesInGroup.map(o => `${o.student?.first_name || ''} ${o.student?.last_name || ''}`.trim()).join('\n')
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
                        style={{ 
                          background: cardBackground || finalColors.bg, 
                          border: (isGroupModeActive && selectedForGroup.includes(occ.id))
                            ? `2px solid ${localStorage.getItem('groovelab_active_platform') === 'campus' ? '#137333' : '#007aff'}`
                            : (isRescheduled 
                              ? (isWaiting ? `1px dashed ${finalColors.border}` : `1px solid ${finalColors.border}`) 
                              : isVacant 
                                ? '1px dashed #10b981' 
                                : isBreak 
                                  ? '1px dashed #f97316' 
                                  : (isSick || isCancelled)
                                    ? '1px solid rgba(239, 68, 68, 0.15)' 
                                    : (isWaiting ? `1px dashed ${finalColors.border}` : `1px solid ${finalColors.border}`)),
                          borderLeft: (isGroupModeActive && selectedForGroup.includes(occ.id))
                            ? `4px solid ${localStorage.getItem('groovelab_active_platform') === 'campus' ? '#137333' : '#007aff'}`
                            : (isRescheduled 
                              ? `4px solid ${finalColors.border}` 
                              : isVacant 
                                ? '3px dashed #10b981' 
                                : isBreak 
                                  ? '4px solid #f97316' 
                                  : (isSick || isCancelled)
                                    ? '3px solid #ef4444'
                                    : `4px solid ${finalColors.border}`),
                          borderRadius: '8px', 
                          padding: (occ.duration || 30) <= 15 ? '0 6px' : ((occ.duration || 30) <= 30 ? '5px 8px' : '8px 10px'),
                          cursor: (isSick || isCancelled) ? 'pointer' : isVacant ? 'pointer' : isBreak ? 'default' : 'grab',
                          opacity: draggedId === occ.id ? 0.5 : 1,
                          position: 'absolute',
                          top: `${topPx}px`,
                          left: '8px',
                          right: '8px',
                          boxShadow: (isGroupModeActive && selectedForGroup.includes(occ.id))
                            ? `0 0 10px ${localStorage.getItem('groovelab_active_platform') === 'campus' ? '#137333' : '#007aff'}`
                            : '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.01)',
                          transition: 'all 0.2s',
                          userSelect: 'none',
                          visibility: isVacant ? 'hidden' : 'visible',
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
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {occ.start_time.substring(0, 5)}
                                    {(() => {
                                      const roomId = occ.schedules?.room_id;
                                      const rName = roomId ? rooms.find(r => r.id === roomId)?.name : (occ.schedules?.room?.name || '');
                                      return rName ? ` (${rName.length > 4 ? rName.substring(0, 3) + '..' : rName})` : '';
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
                                      ? (occurrencesInGroup[0]?.student ? `${occurrencesInGroup[0].student.first_name} ${occurrencesInGroup[0].student.last_name[0]}. (${occurrencesInGroup.length})` : `${occurrencesInGroup.length} Schüler`) 
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
                                        background: isResetPending ? '#f59e0b' : ((occ.status === 'rescheduled_confirmed' || occ.student_acknowledged) ? '#10b981' : '#f59e0b'), 
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
                                            await persistMultipleOccurrencesDirectly(updatesMap);
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
                                      alignItems: 'center'
                                    }}>
                                      {occ.start_time.substring(0, 5)}
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
                                    {(isSick || isCancelled) && (
                                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#991b1b', background: '#fee2e2', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '0.02em', border: '1px solid rgba(239,68,68,0.15)' }}>
                                        {isSick ? 'Entfällt' : 'Abgesagt'}
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
                                         background: isResetPending ? '#f59e0b' : ((occ.status === 'rescheduled_confirmed' || occ.student_acknowledged) ? '#10b981' : '#f59e0b'), 
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
                                              await persistMultipleOccurrencesDirectly(updatesMap);
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
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', width: '100%' }}>
                                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: finalColors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {occurrencesInGroup[0]?.student ? `${occurrencesInGroup[0].student.first_name} ${occurrencesInGroup[0].student.last_name}` : 'Ensemble'}
                                      </span>
                                      <span style={{ 
                                        background: 'rgba(0, 0, 0, 0.05)', 
                                        color: finalColors.text, 
                                        padding: '1px 4px', 
                                        borderRadius: '4px', 
                                        fontSize: '0.58rem', 
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {occurrencesInGroup.length} Sch.
                                      </span>
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
                                    alignItems: 'center'
                                  }}>
                                    {occ.start_time.substring(0, 5)}
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
                                  {(isSick || isCancelled) && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#991b1b', background: '#fee2e2', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.02em', border: '1px solid rgba(239,68,68,0.15)' }}>
                                      {isSick ? 'Entfällt' : 'Abgesagt'}
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
                                        background: isResetPending ? '#f59e0b' : ((occ.status === 'rescheduled_confirmed' || occ.student_acknowledged) ? '#10b981' : '#f59e0b'), 
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
                                            await persistMultipleOccurrencesDirectly(updatesMap);
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
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', flex: 1, minHeight: 0 }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: finalColors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {occurrencesInGroup[0]?.student ? `${occurrencesInGroup[0].student.first_name} ${occurrencesInGroup[0].student.last_name}` : 'Ensemble'}
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
                                      const name = `${o.student?.first_name || ''} ${o.student?.last_name || ''}`.trim();
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
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </React.Fragment>
                  );
                });
              })()
            }
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
          const studentName = occ.student?.last_name.replace(/^\(zuvor: /, '').replace(/\)$/, '') || 'Schüler';
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
                    background: '#f0fdf4', 
                    border: '1px solid #10b981', 
                    borderRadius: '16px', 
                    padding: '14px 18px', 
                    width: '100%', 
                    boxSizing: 'border-box',
                    textAlign: 'center'
                  }}>
                    <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Neuer Termin</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#065f46', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>{newAppointmentText}</span>
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
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#059669'}
                  onMouseOut={e => e.currentTarget.style.background = '#10b981'}
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

        const isMoved = occ?.original_date && (occ.original_date !== occ.date || occ.original_start_time !== occ.start_time);
        const isCancelled = occ?.status === 'cancelled';
        const canDiscard = isMoved || isCancelled;
        const studentName = occ ? `${occ.student?.first_name || ''} ${occ.student?.last_name || ''}`.trim() : 'Schüler';
        const modalTitle = occ?.student_id ? (isGroupOcc ? `Gruppentermin bearbeiten` : `Termin bearbeiten: ${studentName}`) : 'Pause bearbeiten';
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
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ 
              position: 'relative',
              background: '#ffffff', 
              borderRadius: '24px', 
              boxShadow: '0 20px 50px rgba(0,0,0,0.12)', 
              width: isGroupOcc ? '1120px' : '780px', 
              maxWidth: '95vw', 
              border: '1px solid rgba(0,0,0,0.08)', 
              display: 'flex', 
              flexDirection: 'column',
              boxSizing: 'border-box' 
            }}>
              
              {/* Premium Green Header Banner */}
              <div style={{ 
                background: isGroupOcc 
                  ? 'linear-gradient(135deg, #007aff 0%, #0055d4 100%)' 
                  : 'linear-gradient(135deg, #118a44 0%, #15803d 100%)', 
                padding: '20px 28px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                color: '#ffffff',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                borderTopLeftRadius: '23px',
                borderTopRightRadius: '23px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.5rem' }}>💬</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
                      {modalTitle}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 550, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
                      Termin am {formattedDateLabel} um {formattedTimeLabel} Uhr
                    </p>
                  </div>
                </div>

                {/* Close Button Top Right (semi-transparent) */}
                <button
                  onClick={() => setEditOccState(null)}
                  title="Schließen"
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ffffff',
                    transition: 'all 0.2s',
                    zIndex: 10
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }}
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>

              {/* Modal Inner Content Body */}
              <div style={{ display: 'flex', gap: '28px', padding: '28px', boxSizing: 'border-box' }}>
                
                {/* Left Column: Edit Form */}
                <div style={{ width: '320px', display: 'flex', flexDirection: 'column' }}>
                  
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#86868b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>Datum</label>
                    <input 
                      type="date" 
                      value={editOccState.date} 
                      onChange={e => setEditOccState({ ...editOccState, date: e.target.value })} 
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: '10px', 
                        border: '1px solid rgba(0, 0, 0, 0.15)', 
                        background: 'rgba(255,255,255,0.8)',
                        fontSize: '0.92rem', 
                        fontFamily: 'inherit', 
                        outline: 'none', 
                        boxSizing: 'border-box',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                        transition: 'border-color 0.2s'
                      }} 
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '18px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#86868b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>Beginn</label>
                      <input 
                        type="time" 
                        value={editOccState.start_time.substring(0, 5)} 
                        onChange={e => setEditOccState({ ...editOccState, start_time: e.target.value })} 
                        style={{ 
                          width: '100%', 
                          padding: '11px 14px', 
                          borderRadius: '10px', 
                          border: '1px solid rgba(0, 0, 0, 0.15)', 
                          background: 'rgba(255,255,255,0.8)',
                          fontSize: '0.92rem', 
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                          transition: 'border-color 0.2s'
                        }} 
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#86868b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>Ende</label>
                      <input 
                        type="time" 
                        value={localEndTime} 
                        onChange={e => {
                          const newTime = e.target.value;
                          setLocalEndTime(newTime);
                          if (newTime) {
                            const newEndMin = timeToMinutes(newTime);
                            const startMin = timeToMinutes(editOccState.start_time);
                            let diff = newEndMin - startMin;
                            if (diff >= 0) {
                              setEditOccState({ ...editOccState, duration: diff });
                            }
                          }
                        }} 
                        style={{ 
                          width: '100%', 
                          padding: '11px 14px', 
                          borderRadius: '10px', 
                          border: '1px solid rgba(0, 0, 0, 0.15)', 
                          background: 'rgba(255,255,255,0.8)',
                          fontSize: '0.92rem', 
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                          transition: 'border-color 0.2s'
                        }} 
                      />
                    </div>
                  </div>

                  {/* Room Selection Dropdown */}
                  <div style={{ marginBottom: '20px', position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#86868b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>Freie Räume</label>
                    
                    {/* Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setRoomDropdownOpen(!roomDropdownOpen)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '12px',
                        border: roomDropdownOpen ? `1px solid ${isGroupOcc ? '#007aff' : '#118a44'}` : '1px solid rgba(0, 0, 0, 0.15)',
                        background: '#ffffff',
                        fontSize: '0.92rem',
                        fontFamily: 'inherit',
                        fontWeight: 600,
                        color: '#1d1d1f',
                        outline: 'none',
                        boxSizing: 'border-box',
                        boxShadow: roomDropdownOpen ? `0 0 0 3px ${isGroupOcc ? 'rgba(0, 122, 255, 0.15)' : 'rgba(17, 138, 68, 0.12)'}` : '0 2px 4px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s ease',
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
                        borderRadius: '14px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        padding: '6px',
                        zIndex: 100,
                        maxHeight: '200px',
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
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => {
                            if (editOccState.room_id) {
                              e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (editOccState.room_id) {
                              e.currentTarget.style.background = 'transparent';
                            }
                          }}
                        >
                          <span>❌</span>
                          <span>Kein Raum</span>
                          {!editOccState.room_id && (
                            <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>✓</span>
                          )}
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
                                background: isSelected ? (isGroupOcc ? 'rgba(0, 122, 255, 0.08)' : 'rgba(17, 138, 68, 0.08)') : 'transparent',
                                color: isSelected ? (isGroupOcc ? '#007aff' : '#118a44') : '#1d1d1f',
                                fontWeight: isSelected ? 700 : 500,
                                fontSize: '0.9rem',
                                marginTop: '2px',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={e => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = isGroupOcc ? 'rgba(0, 122, 255, 0.04)' : 'rgba(17, 138, 68, 0.04)';
                                }
                              }}
                              onMouseLeave={e => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'transparent';
                                }
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>🏫</span>
                                <span>{r.name}</span>
                              </div>
                              {isSelected && (
                                <span style={{ color: isGroupOcc ? '#007aff' : '#118a44', fontWeight: 'bold' }}>✓</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
  
                  {/* Explicit Cancel Lesson Section */}
                  {!isCancelled && (
                    <div style={{ marginBottom: '24px' }}>
                      <button 
                        onClick={(e) => {
                          handleCancel(e as any, editOccState.id);
                          setEditOccState(null);
                        }}
                        style={{ 
                          width: '100%',
                          padding: '12px', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(255, 59, 48, 0.15)', 
                          background: 'rgba(255, 59, 48, 0.04)', 
                          color: '#ff3b30', 
                          fontSize: '0.85rem', 
                          fontWeight: 600, 
                          cursor: 'pointer', 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.2s' 
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = 'rgba(255, 59, 48, 0.08)';
                          e.currentTarget.style.borderColor = 'rgba(255, 59, 48, 0.25)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = 'rgba(255, 59, 48, 0.04)';
                          e.currentTarget.style.borderColor = 'rgba(255, 59, 48, 0.15)';
                        }}
                      >
                        <Trash2 size={16} />
                        Termin absagen
                      </button>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <div>
                      {/* Discard changes / Reset button */}
                      {canDiscard && (
                        <button 
                          onClick={async () => {
                            if (!editOccState.id.startsWith('mock-')) {
                              try {
                                setLoading(true);
                                const targetDate = occ.original_date || occ.date;
                                const targetStartTime = occ.original_start_time || occ.start_time;
  
                                const { error } = await supabase
                                  .from('schedule_occurrences')
                                  .update({
                                    date: targetDate,
                                    start_time: targetStartTime,
                                    status: 'scheduled',
                                    student_acknowledged: false
                                  })
                                  .eq('id', editOccState.id);
                                if (error) throw error;
  
                                // Clean up any override room bookings for this occurrence
                                try {
                                  await supabase.from('room_bookings')
                                    .delete()
                                    .eq('booked_by', userId)
                                    .eq('date', occ.date)
                                    .eq('start_time', occ.start_time);
                                  window.dispatchEvent(new CustomEvent('refresh-bookings'));
                                } catch (roomErr) {
                                  console.warn('Error deleting room booking on revert:', roomErr);
                                }

                                // Automatic Notification to Student about Reverting to Regular Time
                                try {
                                  if (occ.student_id) {
                                    const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                                    const newDate = new Date(targetDate);
                                    const newDayLabel = DAYS_DE[newDate.getDay()];
                                    const newDateLabel = newDate.toLocaleDateString('de-DE');
                                    const newTimeLabel = targetStartTime.substring(0, 5);
  
                                    const notificationMessage = `Hallo! Der verschobene Termin wurde wieder auf deinen ursprünglichen regulären Termin zurückgesetzt: ${newDayLabel}, ${newDateLabel} um ${newTimeLabel} Uhr.`;
                                    
                                    await supabase.from('campus_direct_messages').insert({
                                      sender_id: userId,
                                      recipient_id: occ.student_id,
                                      content: notificationMessage
                                    });

                                    // Create a notification record in the DB for push tracking
                                    const { data: dbNotif } = await supabase
                                      .from('notifications')
                                      .insert({
                                        user_id: occ.student_id,
                                        title: 'Termin-Update 📅',
                                        message: notificationMessage,
                                        metadata: { occurrence_id: editOccState.id, type: 'reschedule_reset' }
                                      })
                                      .select('id')
                                      .single();

                                    // Invoke send-push Edge Function
                                    await supabase.functions.invoke('send-push', {
                                      body: {
                                        userId: occ.student_id,
                                        title: 'Termin-Update 📅',
                                        body: notificationMessage,
                                        url: '/',
                                        notificationId: dbNotif ? dbNotif.id : null
                                      }
                                    });
                                    console.log('[Push] Sent real-time revert push to student:', occ.student_id);
                                  }
                                } catch (notifErr) {
                                  console.warn('Could not send revert notification:', notifErr);
                                }
  
                                await loadOccurrences();
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
                          style={{ padding: '8px 14px', borderRadius: '100px', border: '1px solid rgba(0,0,0,0.15)', background: 'transparent', color: '#1d1d1f', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          Zurücksetzen
                        </button>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => setEditOccState(null)} 
                        style={{ padding: '10px 18px', borderRadius: '100px', border: 'none', background: 'rgba(0,0,0,0.05)', color: '#1d1d1f', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.09)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                      >
                        Abbrechen
                      </button>
                      <button 
                        onClick={handleSaveEdit} 
                        style={{ padding: '10px 18px', borderRadius: '100px', border: 'none', background: isGroupOcc ? '#007aff' : '#118a44', color: 'white', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                        onMouseOver={e => e.currentTarget.style.background = isGroupOcc ? '#0055d4' : '#15803d'}
                        onMouseOut={e => e.currentTarget.style.background = isGroupOcc ? '#007aff' : '#118a44'}
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                </div>
  
                {occ && occ.student_id && (() => {
                  let isFrozen = false;
                  try {
                    const timePart = occ.start_time.includes(':') ? occ.start_time : `${occ.start_time}:00`;
                    const lessonDateTime = new Date(`${occ.date}T${timePart}`);
                    isFrozen = Date.now() > lessonDateTime.getTime() + 48 * 60 * 60 * 1000;
                  } catch (e) {}
  
                  return (
                    <>
                      {/* Third Column: Schülerliste (only for groups) */}
                      {isGroupOcc && (
                        <div style={{ width: '280px', borderLeft: '1px solid #e5e5ea', paddingLeft: '24px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                          <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            👥 {groupOccs.length} Schüler in dieser Gruppe
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '340px', paddingRight: '4px' }}>
                            {groupOccs.map(go => {
                              const isGoCancelled = go.status === 'cancelled';
                              const isGoSick = go.status === 'teacher_sick' || go.status === 'canceled_by_teacher_sick';
                              const isConfirmed = go.student_acknowledged === true;

                              let itemBg = 'rgba(0, 0, 0, 0.02)';
                              let itemBorder = '1px solid rgba(0, 0, 0, 0.05)';
                              let nameColor = '#1d1d1f';
                              let subtextColor = '#86868b';

                              if (isGoCancelled || isGoSick) {
                                itemBg = 'rgba(239, 68, 68, 0.05)';
                                itemBorder = '1px solid rgba(239, 68, 68, 0.15)';
                                nameColor = '#ef4444';
                              } else if (isConfirmed) {
                                itemBg = '#e8f0fe';
                                itemBorder = '1px solid #0b57d0';
                                nameColor = '#174ea6';
                                subtextColor = '#174ea6cc';
                              } else {
                                itemBg = 'repeating-linear-gradient(-45deg, #e8f0fe 0px, #e8f0fe 8px, #ffffff 8px, #ffffff 16px)';
                                itemBorder = '1px solid #0b57d0';
                                nameColor = '#174ea6';
                                subtextColor = '#174ea6cc';
                              }

                              return (
                                <div key={go.id} style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center', 
                                  padding: '10px 14px', 
                                  borderRadius: '10px', 
                                  background: itemBg,
                                  border: itemBorder
                                }}>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ 
                                      fontSize: '0.88rem', 
                                      fontWeight: 700, 
                                      color: nameColor,
                                      textDecoration: isGoCancelled ? 'line-through' : 'none' 
                                    }}>
                                      {go.student?.first_name} {go.student?.last_name}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', color: subtextColor, marginTop: '2px' }}>
                                      {go.student?.instrument || 'Kein Instrument'} • {go.duration || 30} Min
                                    </span>
                                  </div>
                                  
                                  {!isGoCancelled && !isGoSick && (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      {/* Absagen (Cancel) Button */}
                                      <button
                                        onClick={async () => {
                                          if (await showConfirm(`Möchtest du ${go.student?.first_name} ${go.student?.last_name} für diesen Gruppentermin absagen?`)) {
                                            await persistOccurrenceDirectly(go.id, { status: 'cancelled' });
                                            setEditOccState(null);
                                          }
                                        }}
                                        onMouseEnter={(e) => {
                                          setHoveredTooltip({
                                            text: "Termin absagen (Schüler fehlt)",
                                            x: e.clientX,
                                            y: e.clientY,
                                            visible: true
                                          });
                                        }}
                                        onMouseMove={(e) => {
                                          setHoveredTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                                        }}
                                        onMouseLeave={() => {
                                          setHoveredTooltip(null);
                                        }}
                                        style={{ 
                                          background: 'transparent', 
                                          border: 'none', 
                                          cursor: 'pointer', 
                                          color: '#ef4444', 
                                          padding: '6px', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'center', 
                                          borderRadius: '8px',
                                          transition: 'background 0.2s'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <X size={14} strokeWidth={2.5} />
                                      </button>

                                      {/* Entkoppeln (Decouple) Button */}
                                      <button
                                        onClick={async () => {
                                          if (await showConfirm(`Möchtest du ${go.student?.first_name} ${go.student?.last_name} wirklich aus dieser Gruppe entkoppeln?`)) {
                                            const { error } = await supabase.from('schedule_occurrences').delete().eq('id', go.id);
                                            if (error) {
                                              await showAlert('Fehler beim Entkoppeln des Schülers: ' + error.message);
                                            } else {
                                              if (groupOccs.length === 1) {
                                                try {
                                                  await supabase.from('room_bookings')
                                                    .delete()
                                                    .eq('booked_by', userId)
                                                    .eq('date', go.date)
                                                    .eq('start_time', go.start_time);
                                                } catch (e) {}
                                              }
                                              await loadOccurrences();
                                              setEditOccState(null);
                                            }
                                          }
                                        }}
                                        onMouseEnter={(e) => {
                                          setHoveredTooltip({
                                            text: "Schüler entkoppeln (aus Gruppe entfernen)",
                                            x: e.clientX,
                                            y: e.clientY,
                                            visible: true
                                          });
                                        }}
                                        onMouseMove={(e) => {
                                          setHoveredTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                                        }}
                                        onMouseLeave={() => {
                                          setHoveredTooltip(null);
                                        }}
                                        style={{ 
                                          background: 'transparent', 
                                          border: 'none', 
                                          cursor: 'pointer', 
                                          color: '#86868b', 
                                          padding: '6px', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'center', 
                                          borderRadius: '8px',
                                          transition: 'background 0.2s'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <Link2Off size={14} strokeWidth={2.2} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div style={{ flex: 1, width: '320px', borderLeft: '1px solid #e5e5ea', paddingLeft: '24px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                        <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          Shoutbox {isFrozen && <span style={{ fontSize: '0.9rem' }}>🔒</span>}
                        </h4>
    
                        {isMoved && (
                          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', background: '#fffbeb', border: '1px solid #fef3c7', padding: '6px 12px', borderRadius: '100px', alignSelf: 'flex-start' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Regulär:</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>
                              {new Date(occ.original_date!).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}, {occ.original_start_time ? occ.original_start_time.substring(0, 5) : ''} Uhr
                            </span>
                          </div>
                        )}
    
                        {/* Chat messages viewport */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', paddingRight: '4px', maxHeight: '280px', minHeight: '200px' }}>
                          {isFrozen && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', textAlign: 'center', justifyContent: 'center' }}>
                              🔒 Shoutbox eingefroren (Schreibschutz aktiv)
                            </div>
                          )}
                          {(() => {
                            const deduplicatedMessages: any[] = [];
                            const seenMessages = new Set<string>();
                            chatMessages.forEach(msg => {
                              const timeKey = new Date(msg.created_at).toISOString().substring(0, 16); // group by minute
                              const key = `${msg.sender_id}_${timeKey}_${msg.content}`;
                              if (!seenMessages.has(key)) {
                                seenMessages.add(key);
                                deduplicatedMessages.push(msg);
                              }
                            });

                            if (deduplicatedMessages.length === 0) {
                              return (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868b', fontSize: '0.8rem', textAlign: 'center', padding: '16px' }}>
                                  Noch keine Nachrichten. Schreib dem Schüler für eine Terminabsprache.
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

                              const senderStudent = groupOccs.find(o => o.student_id === msg.sender_id)?.student;
                              const senderName = senderStudent ? `${senderStudent.first_name} ${senderStudent.last_name}` : 'Schüler';
    
                              return (
                                <div key={msg.id || idx} style={{ display: 'flex', flexDirection: 'column', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', textAlign: 'left' }}>
                                  {isGroupOcc && !isMe && (
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#86868b', marginBottom: '2px', marginLeft: '4px' }}>
                                      {senderName}
                                    </span>
                                  )}
                                  {prefixText && (
                                    <span style={{ fontSize: '0.65rem', color: '#86868b', marginBottom: '2px', alignSelf: isMe ? 'flex-end' : 'flex-start', fontWeight: 600 }}>
                                      📅 {prefixText}
                                    </span>
                                  )}
                                  <div style={{ 
                                    background: isMe ? (isGroupOcc ? '#007aff' : '#118a44') : '#f5f5f7', 
                                    color: isMe ? 'white' : '#1d1d1f', 
                                    padding: '8px 12px', 
                                    borderRadius: '12px', 
                                    borderBottomRightRadius: isMe ? '2px' : '12px',
                                    borderBottomLeftRadius: isMe ? '12px' : '2px',
                                    fontSize: '0.82rem',
                                    lineHeight: 1.4,
                                    wordBreak: 'break-word'
                                  }}>
                                    {displayedContent}
                                  </div>
                                  <span style={{ fontSize: '0.6rem', color: '#86868b', marginTop: '2px', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                                    {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              );
                            });
                          })()}
                          <div ref={chatMessagesEndRef} />
                        </div>
    
                        {/* Send Input Form */}
                        <form onSubmit={(e) => handleSendChatMessage(e, occ.student_id || '', occ)} style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                          <input 
                            type="text" 
                            placeholder={isFrozen ? "Shoutbox nach 48h eingefroren..." : "Nachricht senden..."}
                            disabled={isFrozen}
                            value={chatTypedMessage}
                            onChange={e => setChatTypedMessage(e.target.value)}
                            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '0.85rem', outline: 'none', background: isFrozen ? '#f5f5f7' : '#ffffff' }}
                          />
                          <button type="submit" disabled={isFrozen} style={{ background: isFrozen ? '#cbd5e1' : (isGroupOcc ? '#007aff' : '#118a44'), color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isFrozen ? 'not-allowed' : 'pointer' }}>
                            <Send size={14} />
                          </button>
                        </form>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
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
        const primaryColor = isCampusTheme ? '#137333' : '#007aff';
        
        const srcName = `${sourceOcc.student?.first_name || ''} ${sourceOcc.student?.last_name || ''}`.trim() || 'Schüler';
        const tgtName = `${targetOcc.student?.first_name || ''} ${targetOcc.student?.last_name || ''}`.trim() || 'Schüler';

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

                    await persistMultipleOccurrencesDirectly(updatesMap);
                    setDropDecisionState(null);
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
                    boxShadow: `0 4px 12px ${isCampusTheme ? 'rgba(19, 115, 51, 0.2)' : 'rgba(0, 122, 255, 0.2)'}`
                  }}
                  onMouseOver={e => e.currentTarget.style.filter = 'brightness(0.9)'}
                  onMouseOut={e => e.currentTarget.style.filter = 'none'}
                >
                  👥 Zusammenführen (Gruppenunterricht)
                </button>

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
                  🔄 Tauschen / Platzieren
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
                title="Alle Änderungen verwerfen"
              >
                Verwerfen
              </button>

              <button
                onClick={savePendingChanges}
                style={{
                  background: '#16a34a',
                  border: 'none',
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: '100px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = '#15803d';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(22, 163, 74, 0.45)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = '#16a34a';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.3)';
                }}
              >
                Jetzt speichern
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
                color: isCampus ? '#137333' : '#ea4335',
                flexShrink: 0
              }}>
                <AlertCircle size={20} style={{ color: isCampus ? '#137333' : '#ea4335' }} />
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
                  backgroundColor: isCampus ? '#137333' : '#ea4335',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: isCampus ? '0 4px 12px rgba(19, 115, 51, 0.2)' : '0 4px 12px rgba(234, 67, 53, 0.2)',
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

    </div>
  );
}
