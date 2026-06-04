import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle,
  CheckCircle,
  X,
  Send,
  Trash2
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
  schedules?: {
    room_id: string | null;
    room?: {
      name: string;
    } | null;
  } | null;
}

interface ScheduleCalendarViewProps {
  schoolId: string;
  userId: string;
  boards: any[];
  activeTab?: string;
  setActiveTab?: (tab: 'calendar' | 'designer') => void;
}

export function ScheduleCalendarView({ schoolId, userId, boards, activeTab, setActiveTab }: ScheduleCalendarViewProps) {
  const toLocalYYYYMMDD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [baseOccurrences, setBaseOccurrences] = useState<ScheduleOccurrence[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Record<string, ScheduleOccurrence>>({});
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editOccState, setEditOccState] = useState<{ id: string, date: string, start_time: string } | null>(null);
  
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

  const [sickUntil, setSickUntil] = useState<string | null>(null);
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
        const hasMoved = change.date !== o.date || change.start_time.substring(0, 5) !== o.start_time.substring(0, 5);
        if (isRealStudent && hasMoved) {
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
      query = query.eq('occurrence_id', occurrenceId);
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
        alert('Dieser Chat ist eingefroren (48 Stunden nach dem Termin) und kann nicht mehr bearbeitet werden.');
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

      const { error } = await supabase.from('campus_direct_messages').insert({
        sender_id: userId,
        recipient_id: studentId,
        content: messageContent,
        occurrence_id: occ.id
      });
      if (error) throw error;
      
      await fetchChat(studentId, occ.id);
    } catch (err) {
      console.error('Error sending quick chat message:', err);
    }
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

  useEffect(() => {
    loadOccurrences();
  }, [weekStart.getTime(), userId, JSON.stringify(boards)]);

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
            loadOccurrences();
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
        .select('sick_until')
        .eq('id', userId)
        .single();
      if (data?.sick_until) {
        setSickUntil(data.sick_until.substring(0, 10));
      } else {
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
            setSickUntil(payload.new.sick_until ? payload.new.sick_until.substring(0, 10) : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadOccurrences = async () => {
    setLoading(true);
    setSwapLinks([]); 
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const startDateStr = toLocalYYYYMMDD(weekStart);
      const endDateStr = toLocalYYYYMMDD(weekEnd);

      let fetchedData: any[] = [];
      try {
        const { data, error } = await supabase
          .from('schedule_occurrences')
          .select('*, student:users!schedule_occurrences_student_id_fkey(first_name, last_name, instrument), schedules!schedule_occurrences_schedule_id_fkey(room_id, room:rooms(name))')
          .eq('teacher_id', userId)
          .or(`and(date.gte.${startDateStr},date.lte.${endDateStr}),and(original_date.gte.${startDateStr},original_date.lte.${endDateStr})`)
          .order('date')
          .order('start_time');

        if (!error && data) {
          fetchedData = data;
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
              // Only project the break if there is no active/non-cancelled appointment occupying this slot
              const isOccupied = fetchedData.some(o => o.date === dateStr && o.start_time.substring(0, 5) === student.assignedTime.substring(0, 5) && o.status !== 'cancelled');
              if (!isOccupied) {
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
              // Check if a saved database record already covers this student in this week range
              const dbRecord = fetchedData.find(o => o.student_id === student.id);
              
              // If there is no DB record, OR if the DB record has been rescheduled/moved away from this template day/time
              const isRescheduledAway = dbRecord && (dbRecord.date !== dateStr || dbRecord.start_time.substring(0, 5) !== formattedTime.substring(0, 5));
              
              if (!dbRecord || isRescheduledAway) {
                // If the student was rescheduled away, project a vacant placeholder to anchor the original time slot
                // only if the slot is not already occupied by another active reschedule/swap record.
                const isSlotOccupied = fetchedData.some(o => o.date === dateStr && o.start_time.substring(0, 5) === formattedTime.substring(0, 5) && o.student_id && o.student_id !== 'vacant');
                
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
                } else if (!dbRecord && !isSlotOccupied) {
                  // Standard projected card for student not in DB yet
                  projectedData.push({
                    id: `mock-${board.id}-${student.id}`,
                    student_id: student.id,
                    teacher_id: userId,
                    date: dateStr,
                    start_time: formattedTime,
                    duration: student.duration,
                    status: 'scheduled',
                    student: { 
                      first_name: student.first_name || 'Pause', 
                      last_name: student.last_name || '', 
                      instrument: student.instrument || 'Allgemein' 
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

      setBaseOccurrences(fetchedData);
    } catch (err) {
      console.error('Error loading occurrences:', err);
    } finally {
      setLoading(false);
    }
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
        (occ.status === 'cancelled' || (occ.original_date && (occ.original_date !== occ.date || occ.original_start_time !== occ.start_time)))
      );

      for (const occ of rescheduledOrCancelled) {
        try {
          const origDateStr = occ.original_date || occ.date;
          const origTimeStr = occ.original_start_time || occ.start_time;
          const origDate = new Date(origDateStr);
          const origDayLabel = DAYS_DE[origDate.getDay()];
          const origDateLabel = origDate.toLocaleDateString('de-DE');
          const origTimeLabel = origTimeStr.substring(0, 5);

          const notificationMessage = `Hallo! Der verschobene oder abgesagte Termin wurde wieder auf deinen ursprünglichen regulären Termin zurückgesetzt: ${origDayLabel}, ${origDateLabel} um ${origTimeLabel} Uhr.`;
          
          await supabase.from('campus_direct_messages').insert({
            sender_id: userId,
            recipient_id: occ.student_id,
            content: notificationMessage
          });
        } catch (err) {
          console.warn('Error sending reset week notification:', err);
        }
      }

      const { error } = await supabase
        .from('schedule_occurrences')
        .delete()
        .eq('teacher_id', userId)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr);
      
      if (error) throw error;

      await loadOccurrences();
    } catch (err) {
      console.error('Error resetting saved occurrences for week:', err);
      alert('Fehler beim Zurücksetzen der gespeicherten Termine');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnDay = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId) return;
    updateOccurrence(sourceId, { date: targetDateStr, status: 'pending_reschedule' });
    setDraggedId(null);
  };

  const handleDropOnOccurrence = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
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
        const confirmMsg = `Möchtest du ${sourceOcc.student?.first_name || 'den Schüler'} auf die Position der Pause (${targetOcc.start_time.substring(0, 5)} Uhr) verschieben? \n\nHinweis: Dadurch werden alle nachfolgenden Unterrichtsstunden dieses Tages automatisch lückenlos nach hinten verschoben (Sliding-Modus).`;
        if (confirm(confirmMsg)) {
          // 1. Move source student to target break position (e.g. 16:00)
          updateOccurrence(sourceId, { 
            date: targetOcc.date, 
            start_time: targetOcc.start_time, 
            status: 'pending_reschedule' 
          });

          const addMins = (t: string, mins: number) => {
            const [h, m] = t.split(':').map(Number);
            const total = h * 60 + m + mins;
            return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
          };

          // 2. Shift the target break/pause directly behind the student (e.g. 16:00 + 30 min = 16:30)
          const breakNewStartTime = addMins(targetOcc.start_time, sourceOcc.duration);
          updateOccurrence(targetOcc.id, {
            start_time: breakNewStartTime,
            status: 'pending_reschedule'
          });

          // 3. Find and shift all subsequent student and break appointments of this day lückenlos
          const sameDayOccs = occurrences.filter(o => 
            o.date === targetOcc.date && 
            o.id !== sourceId && 
            o.id !== targetId &&
            o.student_id !== 'vacant' &&
            o.start_time.localeCompare(targetOcc.start_time) > 0
          ).sort((a, b) => a.start_time.localeCompare(b.start_time));

          // Subsequent slots start after the shifted break ends (e.g. 16:30 + 15 min = 16:45)
          let nextTime = addMins(breakNewStartTime, targetOcc.duration);

          sameDayOccs.forEach(occ => {
            updateOccurrence(occ.id, { 
              start_time: nextTime, 
              status: 'pending_reschedule' 
            });
            nextTime = addMins(nextTime, occ.duration);
          });

          setDraggedId(null);
          return;
        }
      }

      alert('Tausch blockiert: Ein Unterrichtstermin kann nicht mit einer Pause oder einem freien Slot getauscht werden.');
      setDraggedId(null);
      return;
    }

    // Detect if either slot is a cancelled lesson
    const isSourceCancelled = sourceOcc.status === 'cancelled';
    const isTargetCancelled = targetOcc.status === 'cancelled';

    if (isSourceCancelled || isTargetCancelled) {
      const cancelledOcc = isSourceCancelled ? sourceOcc : targetOcc;
      const normalOcc = isSourceCancelled ? targetOcc : sourceOcc;

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

    updateOccurrence(sourceId, { date: targetOcc.date, start_time: targetOcc.start_time, status: 'pending_reschedule' });
    updateOccurrence(targetId, { date: sourceOcc.date, start_time: sourceOcc.start_time, status: 'pending_reschedule' });
    
    setDraggedId(null);
    setSwapLinks(prev => [...prev, { id1: sourceId, id2: targetId }]);
  };

  const handleSaveEdit = () => {
    if (!editOccState) return;
    const occ = occurrences.find(o => o.id === editOccState.id);
    if (occ) {
      const changed = occ.date !== editOccState.date || occ.start_time !== editOccState.start_time;
      if (changed) {
        const formattedTime = editOccState.start_time.length === 5 ? `${editOccState.start_time}:00` : editOccState.start_time;
        updateOccurrence(editOccState.id, { date: editOccState.date, start_time: formattedTime, status: 'pending_reschedule' });
      }
    }
    setEditOccState(null);
  };
  const savePendingChanges = async () => {
    setLoading(true);
    try {
      const changes = Object.values(pendingChanges);
      const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

      for (const change of changes) {
        // Find base occurrence to see old/original details
        const originalOcc = baseOccurrences.find(o => o.id === change.id);

        if (change.id.startsWith('mock-')) {
          if (!change.student_id || change.student_id === 'vacant') {
            continue;
          }
          const { id, student, original_start_time, schedules, ...insertData } = change;
          insertData.original_date = insertData.original_date || change.date;
          
          if (!insertData.student_id) {
            insertData.student_id = null;
          }

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
          
          const origDateStr = change.original_date || (originalOcc ? originalOcc.date : change.date);
          const origTimeStr = change.original_start_time || (originalOcc ? originalOcc.start_time : change.start_time);
          
          let finalStatus = change.status;
          if (change.status !== 'cancelled' && change.date === origDateStr && change.start_time.substring(0, 5) === origTimeStr.substring(0, 5)) {
            finalStatus = 'scheduled';
          }

          insertData.original_date = origDateStr;
          insertData.status = finalStatus;
          
          const { error } = await supabase.from('schedule_occurrences').insert(insertData);
          if (error) throw error;
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
              student_id: change.student_id ? change.student_id : null
            })
            .eq('id', change.id);
          
          if (error) throw error;
        }

        // Automatic Notification logic via Campus Direct Messages
        try {
          if (change.student_id) {
            let notificationMessage = '';
            
            const origDateStr = change.original_date || (originalOcc ? originalOcc.date : change.date);
            const origTimeStr = change.original_start_time || (originalOcc ? originalOcc.start_time : change.start_time);
            
            const origDate = new Date(origDateStr);
            const origDayLabel = DAYS_DE[origDate.getDay()];
            const origDateLabel = origDate.toLocaleDateString('de-DE');
            const origTimeLabel = origTimeStr.substring(0, 5);

            const newDate = new Date(change.date);
            const newDayLabel = DAYS_DE[newDate.getDay()];
            const newDateLabel = newDate.toLocaleDateString('de-DE');
            const newTimeLabel = change.start_time.substring(0, 5);

            // Determine if the time actually changed compared to database/template
            const oldDbDate = originalOcc ? originalOcc.date : origDateStr;
            const oldDbTime = originalOcc ? originalOcc.start_time : origTimeStr;
            const timeActuallyChanged = change.date !== oldDbDate || change.start_time.substring(0, 5) !== oldDbTime.substring(0, 5);

            if (timeActuallyChanged) {
              if (change.status === 'cancelled') {
                notificationMessage = `Hallo! Dein Unterrichtstermin am ${origDayLabel}, ${origDateLabel} um ${origTimeLabel} Uhr wurde abgesagt.`;
              } else {
                const isReset = change.date === origDateStr && change.start_time.substring(0, 5) === origTimeStr.substring(0, 5);
                if (isReset) {
                  notificationMessage = `Hallo! Der verschobene Termin wurde wieder auf deinen ursprünglichen regulären Termin zurückgesetzt: ${newDayLabel}, ${newDateLabel} um ${newTimeLabel} Uhr.`;
                } else {
                  notificationMessage = `Hallo! Dein Unterrichtstermin wurde verschoben von: ${origDayLabel}, ${origDateLabel} ${origTimeLabel} Uhr auf den neuen Termin: ${newDayLabel}, ${newDateLabel} ${newTimeLabel} Uhr. Bitte bestätige den neuen Termin kurz bei mir.`;
                }
              }
            }

            if (notificationMessage) {
              await supabase.from('campus_direct_messages').insert({
                sender_id: userId,
                recipient_id: change.student_id,
                content: notificationMessage
              });
            }
          }
        } catch (notifErr) {
          console.error('Error sending reschedule notification to student:', notifErr);
        }
      }
      setPendingChanges({});
      await loadOccurrences();
    } catch (err) {
      console.error(err);
      alert('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    updateOccurrence(id, { status: 'cancelled' });
  };

  const handleCancelBreak = (e: React.MouseEvent, breakOcc: ScheduleOccurrence) => {
    e.stopPropagation();
    
    const confirmMsg = `Möchtest du diese Pause wirklich löschen? Dadurch werden alle nachfolgenden Termine dieses Tages automatisch lückenlos vorgezogen.`;
    if (!confirm(confirmMsg)) return;

    // 1. Cancel the break occurrence
    updateOccurrence(breakOcc.id, { status: 'cancelled' });

    // Helper to add or subtract minutes
    const addMins = (t: string, mins: number) => {
      const [h, m] = t.split(':').map(Number);
      const total = h * 60 + m + mins;
      return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
    };

    // 2. Find and shift all subsequent student and break appointments of this day lückenlos
    const sameDayOccs = occurrences.filter(o => 
      o.date === breakOcc.date && 
      o.id !== breakOcc.id &&
      o.student_id !== 'vacant' &&
      o.status !== 'cancelled' &&
      o.start_time.localeCompare(breakOcc.start_time) > 0
    ).sort((a, b) => a.start_time.localeCompare(b.start_time));

    // Subsequent slots start exactly where the deleted break started
    let nextTime = breakOcc.start_time;

    sameDayOccs.forEach(occ => {
      updateOccurrence(occ.id, { 
        start_time: nextTime, 
        status: 'pending_reschedule' 
      });
      nextTime = addMins(nextTime, occ.duration);
    });
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.55)', 
        backdropFilter: 'blur(20px) saturate(190%)', 
        borderRadius: '20px', 
        padding: '16px 20px', 
        border: '1px solid rgba(255, 255, 255, 0.5)', 
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.03)', 
        display: 'grid', 
        gridTemplateColumns: '1fr auto 540px', 
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ height: '40px', width: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CalendarIcon size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span>KW {weekNumber}</span>
              <span style={{ color: '#86868b', fontSize: '0.78rem', fontWeight: 500 }}>
                ({weekStart.toLocaleDateString('de-DE')} - {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString('de-DE')})
              </span>
            </h2>
          </div>
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
              style={{ background: '#0071e3', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,113,227,0.3)' }}
              onMouseOver={e => e.currentTarget.style.background = '#0077ED'}
              onMouseOut={e => e.currentTarget.style.background = '#0071e3'}
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

        <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '12px' }}>
        {[0, 1, 2, 3, 4, 5, 6].map(offset => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + offset);
          const dateStr = toLocalYYYYMMDD(dayDate);
          const dayOccurrences = occurrences
            .filter(o => o.date === dateStr)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
          const dayName = dayDate.toLocaleDateString('de-DE', { weekday: 'long' });

          return (
            <div 
              key={offset} 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnDay(e, dateStr)}
              style={{ background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.6)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '400px' }}
            >
              <div style={{ textAlign: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dayName}</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1d1d1f' }}>{dayDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}</div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.75rem' }}>Lade...</div>
              ) : dayOccurrences.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 500 }}>Keine Termine</div>
              ) : (
                dayOccurrences.map(occ => {
                  const isBreak = !occ.student_id;
                  const isVacant = occ.student_id === 'vacant';

                  if ((isBreak && occ.status === 'cancelled')) {
                    return null;
                  }

                  const isSick = !isBreak && !isVacant && (
                    occ.status === 'teacher_sick' || 
                    occ.status === 'canceled_by_teacher_sick' ||
                    (sickUntil && occ.date <= sickUntil)
                  );

                  const colors = isBreak 
                    ? { bg: 'rgba(254, 243, 199, 0.5)', border: '#f59e0b', text: '#b45309' } 
                    : isSick 
                      ? { bg: 'rgba(254, 226, 226, 0.45)', border: '#ef4444', text: '#991b1b' }
                      : isVacant
                        ? { bg: 'rgba(16, 185, 129, 0.02)', border: '#10b981', text: '#047857' }
                        : getStatusColor(occ.status);
                  let finalColors = { ...colors };
                  let cardBackground = '';
 
                  const isRescheduled = !isBreak && !isVacant && !isSick && (
                    occ.status === 'pending_reschedule' || 
                    occ.status === 'rescheduled_confirmed' ||
                    (occ.original_date && occ.original_date !== occ.date)
                  );
 
                  if (isRescheduled) {
                    const isConfirmed = occ.status === 'rescheduled_confirmed' || occ.student_acknowledged;
                    if (isConfirmed) {
                      cardBackground = 'rgba(254, 243, 199, 0.45)';
                      finalColors.border = '#10b981';
                      finalColors.text = '#713f12';
                    } else {
                      cardBackground = 'rgba(254, 243, 199, 0.45)';
                      finalColors.border = '#f59e0b';
                      finalColors.text = '#92400e';
                    }
                  }
 
                  return (
                    <div 
                      key={occ.id} 
                      id={`occ-${occ.id}`}
                      draggable={!isBreak && !isVacant}
                      onDragStart={(e) => handleDragStart(e, occ.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnOccurrence(e, occ.id)}
                      title={isVacant ? `${occ.student?.first_name} ${occ.student?.last_name}` : undefined}
                       onClick={() => {
                        if (!isBreak) {
                          setEditOccState({ id: occ.id, date: occ.date, start_time: occ.start_time });
                        }
                        // Save selected sick date to localStorage for persistence across tab unmounts
                        localStorage.setItem('selected_sick_date', occ.date);
                        localStorage.setItem('expand_sick_widget', 'true');
                        // Dispatch custom event to sync date with sickUntilDate state in TeacherDashboard
                        window.dispatchEvent(new CustomEvent('select-appointment-date', { detail: { date: occ.date } }));
                      }}
                      style={{ 
                        background: cardBackground || finalColors.bg, 
                        border: isRescheduled 
                          ? `1.5px solid ${finalColors.border}` 
                          : isVacant 
                            ? '1px dashed #10b981' 
                            : isBreak 
                              ? '1.5px dashed rgba(245, 158, 11, 0.25)' 
                              : isSick 
                                ? '1px solid rgba(239, 68, 68, 0.15)' 
                                : '1px solid rgba(16, 185, 129, 0.15)',
                        borderLeft: isRescheduled 
                          ? `5px solid ${finalColors.border}` 
                          : isVacant 
                            ? '3px dashed #10b981' 
                            : isBreak 
                              ? '4px solid #f59e0b' 
                              : `3px solid ${finalColors.border}`,
                        borderRadius: '8px', 
                        padding: '8px',
                        cursor: isSick ? 'pointer' : isVacant ? 'pointer' : isBreak ? 'default' : 'grab',
                        opacity: draggedId === occ.id ? 0.5 : 1,
                        position: 'relative',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s',
                        userSelect: 'none',
                        visibility: isVacant ? 'hidden' : 'visible'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: finalColors.text, background: 'rgba(0,0,0,0.04)', padding: '2px 4px', borderRadius: '4px' }}>
                            {occ.start_time.substring(0, 5)}
                            {(() => {
                              const roomId = occ.schedules?.room_id;
                              const rName = roomId ? rooms.find(r => r.id === roomId)?.name : (occ.schedules?.room?.name || '');
                              return rName ? (
                                <span style={{ marginLeft: '4px', fontWeight: 600, opacity: 0.8, fontSize: '0.7rem' }}>
                                  ({rName})
                                </span>
                              ) : null;
                            })()}
                          </span>
                          {isSick && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#991b1b', background: '#fee2e2', padding: '1px 4px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.02em', border: '1px solid #fecaca' }}>
                              Entfällt
                            </span>
                          )}
                          {isRescheduled && (
                            <span 
                              title={occ.status === 'rescheduled_confirmed' || occ.student_acknowledged ? "Termin verschoben und bestätigt" : "Termin verschoben (ausstehend)"}
                              style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                background: (occ.status === 'rescheduled_confirmed' || occ.student_acknowledged) ? '#10b981' : '#f59e0b', 
                                boxShadow: (occ.status === 'rescheduled_confirmed' || occ.student_acknowledged) ? '0 0 6px #10b981' : '0 0 6px #f59e0b',
                                display: 'inline-block' 
                              }} 
                            />
                          )}
                        </div>
                        {((!isBreak && !isVacant && !isSick) || (isBreak && occ.status !== 'cancelled')) && (
                          <button 
                            onClick={(e) => {
                              if (isBreak) {
                                handleCancelBreak(e, occ);
                              } else {
                                handleCancel(e, occ.id);
                              }
                            }}
                            title={isBreak ? "Pause löschen" : "Termin absagen"}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.border, padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', transition: 'all 0.1s' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <X size={14} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: finalColors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{occ.student?.first_name} {occ.student?.last_name}</span>
                        {isBreak && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.7 }}>• {occ.duration || 15} Min</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
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
        
        const isMoved = occ?.original_date && (occ.original_date !== occ.date || occ.original_start_time !== occ.start_time);
        const isCancelled = occ?.status === 'cancelled';
        const canDiscard = isMoved || isCancelled;
        
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ 
              position: 'relative',
              background: '#ffffff', 
              padding: '28px', 
              borderRadius: '24px', 
              boxShadow: '0 20px 50px rgba(0,0,0,0.08)', 
              width: '780px', 
              maxWidth: '95vw', 
              border: '1px solid rgba(0,0,0,0.08)', 
              display: 'flex', 
              gap: '28px', 
              boxSizing: 'border-box' 
            }}>
              
              {/* Close Button Top Right */}
              <button
                onClick={() => setEditOccState(null)}
                title="Schließen"
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(0,0,0,0.04)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#86868b',
                  transition: 'all 0.2s',
                  zIndex: 10
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.08)';
                  e.currentTarget.style.color = '#1d1d1f';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
                  e.currentTarget.style.color = '#86868b';
                }}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
              
              {/* Left Column: Edit Form */}
              <div style={{ width: '320px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize: '1.35rem', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.02em', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>Termin bearbeiten</h3>
                
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
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#86868b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>Uhrzeit</label>
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
                                }
                              } catch (notifErr) {
                                console.warn('Could not send revert notification:', notifErr);
                              }

                              await loadOccurrences();
                            } catch (err) {
                              console.error(err);
                              alert('Fehler beim Zurücksetzen des Termins');
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
                      style={{ padding: '10px 18px', borderRadius: '100px', border: 'none', background: '#0071e3', color: 'white', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                      onMouseOver={e => e.currentTarget.style.background = '#0077ed'}
                      onMouseOut={e => e.currentTarget.style.background = '#0071e3'}
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
                  <div style={{ flex: 1, width: '320px', borderLeft: '1px solid #e5e5ea', paddingLeft: '24px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.25rem', fontWeight: 700, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Shoutbox {isFrozen && <span style={{ fontSize: '0.9rem' }}>🔒</span>}
                    </h3>

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
                      {chatMessages.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868b', fontSize: '0.8rem', textAlign: 'center', padding: '16px' }}>
                          Noch keine Nachrichten. Schreib dem Schüler für eine Terminabsprache.
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => {
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

                          return (
                            <div key={msg.id || idx} style={{ display: 'flex', flexDirection: 'column', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', textAlign: 'left' }}>
                              {prefixText && (
                                <span style={{ fontSize: '0.65rem', color: '#86868b', marginBottom: '2px', alignSelf: isMe ? 'flex-end' : 'flex-start', fontWeight: 600 }}>
                                  📅 {prefixText}
                                </span>
                              )}
                              <div style={{ 
                                background: isMe ? '#0071e3' : '#f5f5f7', 
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
                        })
                      )}
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
                      <button type="submit" disabled={isFrozen} style={{ background: isFrozen ? '#cbd5e1' : '#0071e3', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isFrozen ? 'not-allowed' : 'pointer' }}>
                        <Send size={14} />
                      </button>
                    </form>
                  </div>
                );
              })()}
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
                  updateOccurrence(swapConfirmState.sourceId, { 
                    date: swapConfirmState.targetDate, 
                    start_time: swapConfirmState.targetStartTime, 
                    status: 'pending_reschedule' 
                  });
                  updateOccurrence(swapConfirmState.targetId, { 
                    date: swapConfirmState.sourceDate, 
                    start_time: swapConfirmState.sourceStartTime, 
                    status: 'pending_reschedule' // becomes pending reschedule so target student gets offered the new time slot
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
                  updateOccurrence(swapConfirmState.sourceId, { 
                    date: swapConfirmState.targetDate, 
                    start_time: swapConfirmState.targetStartTime, 
                    status: 'pending_reschedule' 
                  });
                  // Cancelled student stays cancelled, but moves to the old time slot of the active student.
                  updateOccurrence(swapConfirmState.targetId, { 
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
                onClick={() => setPendingChanges({})}
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
                  background: '#0071e3',
                  border: 'none',
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: '100px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 113, 227, 0.3)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = '#0077ed';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 113, 227, 0.45)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = '#0071e3';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 113, 227, 0.3)';
                }}
              >
                Jetzt speichern
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
