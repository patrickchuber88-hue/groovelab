import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
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
  Zap
} from 'lucide-react';

interface CampusTeacherDashboardProps {
  userId: string;
  onLogout?: () => void;
}

export function CampusTeacherDashboard({ userId, onLogout }: CampusTeacherDashboardProps) {
  // Navigation State
  const [activeBoard, setActiveBoard] = useState<'compass' | 'classes' | 'schedule' | 'bypass' | 'setup'>('compass');

  // Teacher Profile Data
  const [teacher, setTeacher] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  // Board 1: Tageskompass & Meisterwerk
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
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
  const [weekSchedules, setWeekSchedules] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [studentAvailabilities, setStudentAvailabilities] = useState<any[]>([]);
  const [draggedScheduleId, setDraggedScheduleId] = useState<string | null>(null);
  const [dragOverSlotKey, setDragOverSlotKey] = useState<string | null>(null);

  // Board 4: Krankheits-Bypass
  const [sickUntilDate, setSickUntilDate] = useState('');
  const [reportingSick, setReportingSick] = useState(false);

  // Board 5: Mein Setup
  const [startAnchor, setStartAnchor] = useState('13:00');
  const [breakTimes, setBreakTimes] = useState<Array<{ start: string; end: string; label: string }>>([]);
  const [newBreakStart, setNewBreakStart] = useState('');
  const [newBreakEnd, setNewBreakEnd] = useState('');
  const [newBreakLabel, setNewBreakLabel] = useState('');

  // Loading States
  const [loading, setLoading] = useState(true);

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
        setSchool(tData.schools);
        setStartAnchor(tData.start_anchor || '13:00');
        setBreakTimes(tData.break_times || []);

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
      .eq('teacher_id', teacherId)
      .eq('is_campus_active', true);
    setStudents(sData || []);

    // 2. Fetch Rooms
    const { data: rData } = await supabase
      .from('rooms')
      .select('*')
      .eq('school_id', schoolId)
      .order('sort_order', { ascending: true });
    setRooms(rData || []);

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

    setWeekSchedules(mappedSchedData);

    // Filter today's slots
    const todayWeekday = currentDay;
    const todaySlots = mappedSchedData.filter(s => s.day_of_week === todayWeekday);
    setTodaySchedules(todaySlots);

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
        setCascadeLink(data.registrationLink || `http://localhost:5173/student-signup?cascade=${data.token}`);
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

        setCascadeLink(`http://localhost:5173/student-signup?cascade=${cascadeToken}`);
      }
    } catch (err) {
      console.error(err);
      // Hardcoded fallback using teacher's unique ausweis_id if DB inserts are constrained
      setCascadeLink(`http://localhost:5173/student-signup?teacher_ausweis=${teacher.ausweis_id || teacher.id}`);
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
  const getTrafficLight = (draggedId: string, timeSlot: string, dayOfWeek: number, roomId: string) => {
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

    // 3. Physical Collisions Check
    const isOccupied = weekSchedules.some(s => 
      s.id !== draggedId &&
      s.day_of_week === dayOfWeek &&
      s.time_slot === timeSlot &&
      s.room_id === roomId &&
      s.status !== 'canceled_by_student' &&
      s.status !== 'teacher_sick'
    );

    if (isOccupied) return 'RED';

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
      return 'YELLOW';
    }

    // Default outside of availabilities is YELLOW (parent consent flow)
    return 'YELLOW';
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
      alert('Bitte wähle ein Datum aus.');
      return;
    }
    const pin = prompt('Gebe deinen 4-stelligen Lehrer-PIN (ausweis_nummer) ein:');
    if (!pin) return;

    try {
      setReportingSick(true);
      const resp = await fetch('/api/teacher/sick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: userId, pin, sickUntilDate })
      });

      if (resp.ok) {
        alert('Krankheitsmeldung erfolgreich registriert. Verwaltungsalarm wurde ausgelöst.');
        await refreshAllData(teacher.school_id, teacher.id);
      } else {
        // Fallback updates
        const { data: profile } = await supabase
          .from('users')
          .select('ausweis_nummer, school_id')
          .eq('id', userId)
          .single();

        if (!profile || profile.ausweis_nummer !== pin) {
          alert('Ungültiger PIN.');
          return;
        }

        const rawDay = new Date().getDay();
        const todayWeekday = rawDay === 0 ? 7 : rawDay;

        // Set schedules to sick
        await supabase
          .from('schedules')
          .update({ status: 'teacher_sick' })
          .eq('teacher_id', userId)
          .eq('day_of_week', todayWeekday);

        // Notify secretary
        await supabase
          .from('system_alerts')
          .insert({
            school_id: profile.school_id,
            teacher_id: userId,
            type: 'Teacher Illness Alert',
            message: `Krankheitsmeldung: Lehrer Patrick (${teacher.first_name}) hat sich bis zum ${sickUntilDate} krankgemeldet.`
          });

        alert('Krankheitsmeldung registriert! Stunden storniert.');
        await refreshAllData(teacher.school_id, teacher.id);
      }
    } catch (err) {
      console.error(err);
      alert('Fehler bei der Krankheitsmeldung.');
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
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Sidebar Navigation */}
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
              onClick={() => setActiveBoard('schedule')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeBoard === 'schedule'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Calendar size={18} />
              <span>Mein Stundenplan</span>
              <span className="ml-auto text-[10px] bg-slate-800 px-2 py-0.5 rounded text-emerald-400 border border-slate-700">80/20</span>
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
            onClick={onLogout}
            className="w-full py-2 bg-slate-800 hover:bg-red-950/30 hover:text-red-400 text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-700"
          >
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main Board Viewport */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
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

            {/* AdminLTE style KPI Cards row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              {/* Card 1: Blue */}
              <div style={{ background: '#007bff', color: '#ffffff', borderRadius: '14px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '76px' }}>
                <div style={{ padding: '12px 16px', position: 'relative', zIndex: 2 }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>{sortedTodaySchedules.length}</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, marginTop: '4px', opacity: 0.9 }}>Heutige Stunden</div>
                </div>
                <div style={{ position: 'absolute', top: '8px', right: '12px', fontSize: '2.2rem', opacity: 0.2, pointerEvents: 'none', zIndex: 1 }}>📅</div>
              </div>

              {/* Card 2: Green */}
              <div style={{ background: '#28a745', color: '#ffffff', borderRadius: '14px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '76px' }}>
                <div style={{ padding: '12px 16px', position: 'relative', zIndex: 2 }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>{rooms.length ? Math.min(100, Math.round((sortedTodaySchedules.length / 9) * 100)) : 75}%</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, marginTop: '4px', opacity: 0.9 }}>Cockpit Auslastung</div>
                </div>
                <div style={{ position: 'absolute', top: '8px', right: '12px', fontSize: '2.2rem', opacity: 0.2, pointerEvents: 'none', zIndex: 1 }}>📈</div>
              </div>

              {/* Card 3: Yellow */}
              <div style={{ background: '#fbbc05', color: '#1f2937', borderRadius: '14px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '76px' }}>
                <div style={{ padding: '12px 16px', position: 'relative', zIndex: 2 }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>{notifications.filter(n => !n.resolved).length}</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, marginTop: '4px', opacity: 0.9 }}>Ausstehende Alerts</div>
                </div>
                <div style={{ position: 'absolute', top: '8px', right: '12px', fontSize: '2.2rem', opacity: 0.25, pointerEvents: 'none', zIndex: 1 }}>🔔</div>
              </div>

              {/* Card 4: Red */}
              <div style={{ background: '#dc3545', color: '#ffffff', borderRadius: '14px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '76px' }}>
                <div style={{ padding: '12px 16px', position: 'relative', zIndex: 2 }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>{sortedTodaySchedules.filter(s => s.status === 'canceled_by_student').length}</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, marginTop: '4px', opacity: 0.9 }}>Abgesagte Termine</div>
                </div>
                <div style={{ position: 'absolute', top: '8px', right: '12px', fontSize: '2.2rem', opacity: 0.2, pointerEvents: 'none', zIndex: 1 }}>✕</div>
              </div>
            </div>

            {/* Terminänderungen & Alerts Widget */}
            {notifications.length > 0 && (
              <div style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🔔</span>
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
                        onClick={() => !isSick && sched.status !== 'pending_reschedule' && handleOpenDocModal(sched)}
                        className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          isSick 
                            ? 'bg-red-950/20 border-red-900/35 hover:bg-red-950/30' 
                            : sched.status === 'pending_reschedule'
                              ? 'bg-yellow-950/15 border-yellow-500/50 hover:border-yellow-500 shadow-md shadow-yellow-500/5'
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
                              {sched.student ? `${sched.student.first_name} ${sched.student.last_name}` : '☕ Pause'}
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
                            ) : sched.status === 'canceled_by_student' ? (
                              <span className="px-2.5 py-1 text-[10px] font-black uppercase bg-slate-800 text-slate-500 rounded-md border border-slate-700">
                                Abgesagt
                              </span>
                            ) : sched.status === 'pending_reschedule' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                <span className="px-2.5 py-1 text-[10px] font-black uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-md">
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
                >
                  <div className="h-14 w-14 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700">
                    <img src={student.photo_url || '/avatar_ghost.jpg'} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{student.first_name} {student.last_name}</h3>
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
                      {selectedStudentHistory.student.first_name} {selectedStudentHistory.student.last_name}
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
                              ? 'bg-yellow-500' 
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
                            <span className="mt-2 inline-block px-2 py-0.5 text-[9px] font-black uppercase bg-yellow-500/10 text-yellow-400 rounded border border-yellow-500/20">
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
              <p className="text-slate-400 text-sm mt-1">
                Drag-and-Drop 80/20 Tausch-Engine mit Ampel-Kollisions-Schutz.
              </p>
            </div>

            {/* Calendar Table Grid */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
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
                              backgroundColor: dragOverSlotKey === `${day}-${slot}` ? 'rgba(16, 185, 129, 0.05)' : undefined
                            }}
                          >
                            {isBreak ? (
                              <div className="py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-850 text-center flex items-center justify-center">
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
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
                                      ? 'bg-amber-950/20 border-amber-800/60 text-amber-300'
                                      : sched.status === 'teacher_sick' || sched.status === 'canceled_by_teacher_sick'
                                        ? 'bg-red-950/30 border-red-900/60 text-red-300'
                                        : sched.status === 'pending_parent_approval'
                                          ? 'bg-yellow-950/20 border-yellow-700/50 text-yellow-300'
                                          : 'bg-slate-900 border-slate-800 text-white'
                                  }`}
                                >
                                  <p className="text-xs font-bold truncate">
                                    {sched.student ? `${sched.student.first_name} ${sched.student.last_name[0]}.` : `☕ ${sched.time_slot} Pause`}
                                  </p>
                                  <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mt-0.5">
                                    {sched.student ? (sched.student.instrument || 'Inst') : 'Pause'}
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
            </div>
          </div>
        )}

        {/* Board 4: KRANKHEITS-BYPASS */}
        {activeBoard === 'bypass' && (
          <div className="p-8 max-w-lg w-full mx-auto space-y-6">
            <div className="bg-red-950/10 border border-red-900/35 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-4 text-red-400">
                <AlertTriangle size={36} />
                <div>
                  <h1 className="text-2xl font-black text-white">Krankheits-Bypass</h1>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-400/90 mt-0.5">Notfall-Bypass-Schalter</p>
                </div>
              </div>

              <p className="text-sm text-slate-300 font-medium leading-relaxed">
                Falls du dich krankmelden musst, wähle bitte das voraussichtliche Enddatum aus. Alle heute betroffenen Stundenplandaten werden automatisch storniert und als Krankheitsausfall rot markiert. Zudem wird ein Alarmticket an das Krisen-Dashboard der Verwaltung gesendet.
              </p>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Krank bis einschließlich:</label>
                  <input
                    type="date"
                    value={sickUntilDate}
                    onChange={(e) => setSickUntilDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 font-semibold"
                  />
                </div>

                <button
                  onClick={handleReportSick}
                  disabled={reportingSick}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white font-black text-sm uppercase tracking-widest rounded-xl transition duration-200 shadow-lg shadow-red-900/35"
                >
                  {reportingSick ? 'Melde Krank...' : 'Krankheit offiziell melden'}
                </button>
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
      </main>

      {/* Board 1 Overlay: MEISTERWERK DOCUMENTATION MODAL */}
      {docModalOpen && selectedStudentForDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">Meisterwerk-Protokoll</h3>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mt-0.5">
                  {selectedStudentForDoc.first_name} {selectedStudentForDoc.last_name}
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
                          ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400'
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
                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
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
