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
  Send
} from 'lucide-react';

interface ScheduleOccurrence {
  id: string;
  student_id: string;
  teacher_id: string;
  schedule_id?: string;
  date: string;
  start_time: string;
  duration: number;
  status: 'scheduled' | 'pending_reschedule' | 'rescheduled_confirmed' | 'cancelled';
  original_date?: string;
  original_start_time?: string;
  student_acknowledged?: boolean;
  student?: {
    first_name: string;
    last_name: string;
    instrument: string;
  };
}

interface ScheduleCalendarViewProps {
  schoolId: string;
  userId: string;
  boards: any[];
}

export function ScheduleCalendarView({ schoolId, userId, boards }: ScheduleCalendarViewProps) {
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

  const occurrences: ScheduleOccurrence[] = useMemo(() => {
    const merged = baseOccurrences.filter(o => !pendingChanges[o.id]);
    Object.values(pendingChanges).forEach(p => merged.push(p));
    return merged;
  }, [baseOccurrences, pendingChanges]);

  // Direct Chat states inside appointment modal
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatTypedMessage, setChatTypedMessage] = useState('');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChat = async (studentId: string) => {
    if (!userId || !studentId) return;
    const { data } = await supabase
      .from('campus_direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${studentId}),and(sender_id.eq.${studentId},recipient_id.eq.${userId})`)
      .order('created_at', { ascending: true });
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
    if (!occ || !occ.student_id) return;

    fetchChat(occ.student_id);

    const channel = supabase
      .channel(`chat_occ_${editOccState.id}`)
      .on('postgres_changes', { schema: 'public', event: '*', table: 'campus_direct_messages' }, () => {
        fetchChat(occ.student_id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [editOccState, userId, occurrences]);

  const handleSendChatMessage = async (e: React.FormEvent, studentId: string, occ: any) => {
    e.preventDefault();
    if (!chatTypedMessage.trim()) return;

    const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const d = new Date(occ.date);
    const dayLabel = DAYS_DE[d.getDay()] || 'Termin';
    const timeLabel = occ.start_time.substring(0, 5);
    const prefix = `[Termin ${dayLabel} ${timeLabel} Uhr] `;
    const messageContent = `${prefix}${chatTypedMessage.trim()}`;

    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        sender_id: userId,
        recipient_id: studentId,
        content: messageContent,
        created_at: new Date().toISOString(),
        is_read: false
      };
      setChatMessages(prev => [...prev, optimisticMessage]);
      setChatTypedMessage('');
      setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

      const { error } = await supabase.from('campus_direct_messages').insert({
        sender_id: userId,
        recipient_id: studentId,
        content: messageContent
      });
      if (error) throw error;
      
      await fetchChat(studentId);
    } catch (err) {
      console.error('Error sending quick chat message:', err);
    }
  };

  // Helper für Mutations
  const updateOccurrence = (id: string, updates: Partial<ScheduleOccurrence>) => {
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
          .select('*, student:users!schedule_occurrences_student_id_fkey(first_name, last_name, instrument)')
          .eq('teacher_id', userId)
          .gte('date', startDateStr)
          .lte('date', endDateStr)
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
              // Add projected break/pause card if not already in fetchedData
              const exists = fetchedData.some(o => o.start_time.substring(0, 5) === student.assignedTime.substring(0, 5) && o.date === dateStr && !o.student_id);
              if (!exists) {
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
                  }
                });
              }
            } else {
              // Check if a saved database record already covers this student in this week range
              const exists = fetchedData.some(o => o.student_id === student.id);
              if (!exists) {
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
                  }
                });
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
          const { id, student, original_start_time, ...insertData } = change;
          insertData.original_date = insertData.original_date || change.date;
          
          try {
            const { data: schData } = await supabase
              .from('schedules')
              .select('id')
              .eq('student_id', change.student_id)
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
          if (change.date === origDateStr && change.start_time.substring(0, 5) === origTimeStr.substring(0, 5)) {
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
          if (change.date === origDateStr && change.start_time.substring(0, 5) === origTimeStr.substring(0, 5)) {
            finalStatus = 'scheduled';
          }

          const { error } = await supabase.from('schedule_occurrences')
            .update({
              date: change.date,
              start_time: change.start_time,
              status: finalStatus,
              original_date: origDateStr,
              student_acknowledged: false
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return { bg: '#dcfce7', border: '#10b981', text: '#065f46' };
      case 'cancelled': return { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' };
      case 'pending_reschedule': return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' };
      case 'rescheduled_confirmed': return { bg: '#dcfce7', border: '#10b981', text: '#065f46' };
      default: return { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' };
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
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ height: '40px', width: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>
              KW {weekNumber}
            </h2>
            <p style={{ color: '#86868b', fontSize: '0.78rem', fontWeight: 500, marginTop: '1px' }}>
              {weekStart.toLocaleDateString('de-DE')} - {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString('de-DE')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

        <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
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
                  const colors = isBreak ? { bg: '#fffbeb', border: '#f59e0b', text: '#b45309' } : getStatusColor(occ.status);
                  let finalColors = { ...colors };
                  let cardBackground = '';

                  const isRescheduled = !isBreak && (
                    occ.status === 'pending_reschedule' || 
                    occ.status === 'rescheduled_confirmed' ||
                    (occ.original_date && occ.original_date !== occ.date)
                  );

                  if (isRescheduled) {
                    const isConfirmed = occ.status === 'rescheduled_confirmed' || occ.student_acknowledged;
                    if (isConfirmed) {
                      cardBackground = 'linear-gradient(135deg, #fef3c7 0%, #dcfce7 100%)';
                      finalColors.border = '#10b981';
                      finalColors.text = '#065f46';
                    } else {
                      finalColors.bg = '#fef3c7';
                      finalColors.border = '#f59e0b';
                      finalColors.text = '#92400e';
                    }
                  }

                  return (
                    <div 
                      key={occ.id} 
                      id={`occ-${occ.id}`}
                      draggable={!isBreak}
                      onDragStart={(e) => handleDragStart(e, occ.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnOccurrence(e, occ.id)}
                      onClick={() => !isBreak && setEditOccState({ id: occ.id, date: occ.date, start_time: occ.start_time })}
                      style={{ 
                        background: cardBackground || finalColors.bg, 
                        borderLeft: `3px solid ${finalColors.border}`,
                        borderTop: '1px solid rgba(255,255,255,0.4)',
                        borderRight: '1px solid rgba(255,255,255,0.4)',
                        borderBottom: '1px solid rgba(255,255,255,0.4)',
                        borderRadius: '8px', 
                        padding: '8px',
                        cursor: isBreak ? 'default' : 'grab',
                        opacity: draggedId === occ.id ? 0.5 : 1,
                        position: 'relative',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: finalColors.text, background: 'rgba(0,0,0,0.04)', padding: '2px 4px', borderRadius: '4px' }}>
                            {occ.start_time.substring(0, 5)}
                          </span>
                          {occ.status === 'rescheduled_confirmed' && (
                            <span 
                              title="Termin verschoben und bestätigt"
                              style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                background: '#f59e0b', 
                                boxShadow: '0 0 6px #f59e0b',
                                display: 'inline-block' 
                              }} 
                            />
                          )}
                        </div>
                        {!isBreak && (
                          <button 
                            onClick={(e) => handleCancel(e, occ.id)}
                            title="Termin absagen"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.border, padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', transition: 'all 0.1s' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <X size={14} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: finalColors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {occ.student?.first_name} {occ.student?.last_name}
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
        const isMoved = occ?.original_date && (occ.original_date !== occ.date || occ.original_start_time !== occ.start_time);
        const isCancelled = occ?.status === 'cancelled';
        const canDiscard = isMoved || isCancelled;
        
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', width: '740px', maxWidth: '95vw', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', gap: '24px', boxSizing: 'border-box' }}>
              
              {/* Left Column: Edit Form */}
              <div style={{ width: '320px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.25rem', fontWeight: 700, color: '#1d1d1f' }}>Termin bearbeiten</h3>
                
                {isMoved && (
                  <div style={{ marginBottom: '16px', padding: '10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px dashed #f59e0b' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', marginBottom: '2px' }}>Ursprungstermin</div>
                    <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
                      {new Date(occ.original_date!).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}, {occ.original_start_time?.substring(0, 5)} Uhr
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#86868b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datum</label>
                  <input 
                    type="date" 
                    value={editOccState.date} 
                    onChange={e => setEditOccState({ ...editOccState, date: e.target.value })} 
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} 
                  />
                </div>
                
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#86868b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uhrzeit</label>
                  <input 
                    type="time" 
                    value={editOccState.start_time.substring(0, 5)} 
                    onChange={e => setEditOccState({ ...editOccState, start_time: e.target.value })} 
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} 
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <div>
                    {canDiscard && (
                      <button 
                        onClick={async () => {
                          if (!editOccState.id.startsWith('mock-')) {
                            try {
                              setLoading(true);
                              const { error } = await supabase
                                .from('schedule_occurrences')
                                .update({
                                  date: occ.original_date || occ.date,
                                  start_time: occ.original_start_time || occ.start_time,
                                  status: 'scheduled',
                                  student_acknowledged: false
                                })
                                .eq('id', editOccState.id);
                              if (error) throw error;
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
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'transparent', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Änderung verwerfen
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setEditOccState(null)} 
                      style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#f5f5f7', color: '#1d1d1f', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#e5e5ea'}
                      onMouseOut={e => e.currentTarget.style.background = '#f5f5f7'}
                    >
                      Abbrechen
                    </button>
                    <button 
                      onClick={handleSaveEdit} 
                      style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#0071e3', color: 'white', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#0077ED'}
                      onMouseOut={e => e.currentTarget.style.background = '#0071e3'}
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: QuickChat Shoutbox */}
              {occ && occ.student_id && (
                <div style={{ flex: 1, borderLeft: '1px solid #e5e5ea', paddingLeft: '24px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '380px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1d1d1f' }}>
                      Shoutbox – {occ.student?.first_name} {occ.student?.last_name}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#86868b', background: '#f5f5f7', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>1:1 Chat</span>
                  </div>

                  {/* Chat messages viewport */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', paddingRight: '4px', maxHeight: '280px', minHeight: '200px' }}>
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
                          <div key={msg.id || idx} style={{ display: 'flex', flexDirection: 'column', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
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
                  <form onSubmit={(e) => handleSendChatMessage(e, occ.student_id, occ)} style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <input 
                      type="text" 
                      placeholder="Nachricht senden..." 
                      value={chatTypedMessage}
                      onChange={e => setChatTypedMessage(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '0.85rem', outline: 'none' }}
                    />
                    <button type="submit" style={{ background: '#0071e3', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>
        );
      })()}
    </div>
  );
}
