import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Award, Lock, Smartphone, HelpCircle, Trophy, Sparkles, Star, 
  ChevronRight, Coffee, Clock, Flame, BookOpen, Share2, Play, 
  Pause, RotateCcw, Volume2, Moon, QrCode, X, EyeOff, Zap, Music, Library, Calendar, Check, Target, MessageSquare, Send,
  Pencil, User, Mail, Phone, MapPin, Activity, Camera, AlertTriangle
} from 'lucide-react';
import QRCode from 'react-qr-code';

interface Avatar {
  avatar_style: string;
  instrument_type: string;
  evolution_level: number;
  xp: number;
  asset_path: string;
  streak_flame?: number;
}

const getInstrumentAvatarUrl = (instrument: string | null | undefined): string => {
  if (!instrument) return '/avatars/guitar_avatar.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/guitar_avatar.png';
  if (inst.includes('bass')) return '/avatars/bass_avatar.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/drums_avatar.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/piano_avatar.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/vocals_avatar.png';
  if (inst.includes('trompete') || inst.includes('trumpet')) return '/avatars/trumpet_avatar.png';
  if (inst.includes('posaune') || inst.includes('trombone')) return '/avatars/trombone_avatar.png';
  if (inst.includes('horn')) return '/avatars/horn_avatar.png';
  if (inst.includes('cello')) return '/avatars/cello_avatar.png';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return '/avatars/violin_avatar.png';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return '/avatars/clarinet_avatar.png';
  if (inst.includes('querflöte') || inst.includes('flute')) return '/avatars/flute_avatar.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophone_avatar.png';
  return '/avatars/guitar_avatar.png';
};

interface StudentAvatarDashboardProps {
  studentId: string;
  parentActiveTab?: string;
  onTabChange?: (tab: string) => void;
  onProfileUpdate?: (updatedFields: any) => void;
}

const LEVEL_NAMES: Record<string, Record<number, string>> = {
  guitarist: {
    1: 'Garagen-Gitarrist (Lvl 1)',
    2: 'Band-Mitglied (Lvl 2)',
    3: 'Rockstar (Lvl 3)'
  },
  drummer: {
    1: 'Takt-Anfänger (Lvl 1)',
    2: 'Studio-Drummer (Lvl 2)',
    3: 'Rhythmus-Gott (Lvl 3)'
  },
  keyboardist: {
    1: 'Melodien-Sucher (Lvl 1)',
    2: 'Synthie-Pionier (Lvl 2)',
    3: 'Tasten-Virtuose (Lvl 3)'
  },
  vocalist: {
    1: 'Dusch-Sänger (Lvl 1)',
    2: 'Bühnen-Neuling (Lvl 2)',
    3: 'Stimm-König/in (Lvl 3)'
  }
};

const HERO_CLASSES = [
  { id: 'guitarist', name: 'Gitarren-Held', icon: '🎸', desc: 'Melodien und Soli rocken' },
  { id: 'drummer', name: 'Beat-Master', icon: '🥁', desc: 'Den Groove und Takt angeben' },
  { id: 'keyboardist', name: 'Tasten-Magier', icon: '🎹', desc: 'Synthesizer und Klavier beherrschen' },
  { id: 'vocalist', name: 'Vocal-Star', icon: '🎤', desc: 'Die Bühne mit deiner Stimme erobern' }
];

const toLocalYYYYMMDD = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getISOWeekRaw = (dateInput?: string | Date, lessonDay: number = 1): string => {
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

export const formatPageNumbers = (pages: number[]): string => {
  if (pages.length === 0) return '';
  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = start;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      if (start === end) {
        ranges.push(`${start}`);
      } else {
        ranges.push(`${start}–${end}`);
      }
      start = sorted[i];
      end = start;
    }
  }
  if (start === end) {
    ranges.push(`${start}`);
  } else {
    ranges.push(`${start}–${end}`);
  }
  
  if (ranges.length === 1) return `S. ${ranges[0]}`;
  const last = ranges.pop();
  return `S. ${ranges.join(', ')} & ${last}`;
};

export function StudentAvatarDashboard({ studentId, parentActiveTab, onTabChange, onProfileUpdate }: StudentAvatarDashboardProps) {
  const [studentUser, setStudentUser] = useState<any>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [studentSchedules, setStudentSchedules] = useState<any[]>([]);
  const [lessonDay, setLessonDay] = useState<number>(1); // Default to Monday = 1

  const getISOWeek = (dateInput?: string | Date): string => {
    return getISOWeekRaw(dateInput, lessonDay);
  };

  const [isAppUser, setIsAppUser] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selection Screen State
  const [showSelector, setShowSelector] = useState(false);
  const [submittingSelection, setSubmittingSelection] = useState(false);

  // Daily Briefing State
  const [briefingData, setBriefingData] = useState<any>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [scheduleOccurrences, setScheduleOccurrences] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [schoolYearOccurrences, setSchoolYearOccurrences] = useState<any[]>([]);
  const [loadingSchoolYearSchedule, setLoadingSchoolYearSchedule] = useState(false);
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [crisisAlerts, setCrisisAlerts] = useState<any[]>([]);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  // Direct Chat states inside appointment popup (Shoutbox)
  const [showAppointmentChat, setShowAppointmentChat] = useState(false);
  const [appointmentChatData, setAppointmentChatData] = useState<{ teacherId: string; date: string; start_time: string; label: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatTypedMessage, setChatTypedMessage] = useState('');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChat = async (teacherId: string) => {
    if (!studentId || !teacherId) return;
    const { data } = await supabase
      .from('campus_direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${studentId},recipient_id.eq.${teacherId}),and(sender_id.eq.${teacherId},recipient_id.eq.${studentId})`)
      .order('created_at', { ascending: true });
    if (data) {
      setChatMessages(data);
      setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
  };

  useEffect(() => {
    if (!appointmentChatData || !showAppointmentChat) {
      setChatMessages([]);
      return;
    }

    fetchChat(appointmentChatData.teacherId);

    const channel = supabase
      .channel(`chat_student_occ_${appointmentChatData.teacherId}`)
      .on('postgres_changes', { schema: 'public', event: '*', table: 'campus_direct_messages' }, () => {
        fetchChat(appointmentChatData.teacherId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appointmentChatData, showAppointmentChat, studentId]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatTypedMessage.trim() || !appointmentChatData) return;

    const messageContent = `[Termin ${appointmentChatData.label}] ${chatTypedMessage.trim()}`;

    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        sender_id: studentId,
        recipient_id: appointmentChatData.teacherId,
        content: messageContent,
        created_at: new Date().toISOString(),
        is_read: false
      };
      setChatMessages(prev => [...prev, optimisticMessage]);
      setChatTypedMessage('');
      setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

      const { error } = await supabase.from('campus_direct_messages').insert({
        sender_id: studentId,
        recipient_id: appointmentChatData.teacherId,
        content: messageContent
      });
      if (error) throw error;
      
      await fetchChat(appointmentChatData.teacherId);
    } catch (err) {
      console.error('Error sending quick chat message:', err);
    }
  };

  const fetchSchedule = async () => {
    if (!studentId) return;
    setLoadingSchedule(true);
    try {
      const { data, error } = await supabase
        .from('schedule_occurrences')
        .select('*, schedule:schedule_id(*), teacher:users!schedule_occurrences_teacher_id_fkey(first_name, last_name)')
        .eq('student_id', studentId)
        .gte('date', toLocalYYYYMMDD(new Date()))
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (!error && data) {
        setScheduleOccurrences(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const fetchSchoolYearSchedule = async () => {
    if (!studentId) return;
    setLoadingSchoolYearSchedule(true);
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      let schoolYearStart = new Date(currentYear - 1, 8, 1);
      let schoolYearEnd = new Date(currentYear, 6, 31);

      if (currentMonth >= 7) {
        schoolYearStart = new Date(currentYear, 8, 1);
        schoolYearEnd = new Date(currentYear + 1, 6, 31);
      }

      const startStr = toLocalYYYYMMDD(schoolYearStart);
      const endStr = toLocalYYYYMMDD(schoolYearEnd);

      const { data: occurrences, error: occErr } = await supabase
        .from('schedule_occurrences')
        .select('*, schedule:schedule_id(*), teacher:users!schedule_occurrences_teacher_id_fkey(first_name, last_name)')
        .eq('student_id', studentId)
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      const { data: schedules, error: schErr } = await supabase
        .from('schedules')
        .select('*, teacher:users!schedules_teacher_id_fkey(first_name, last_name)')
        .eq('student_id', studentId);

      if (occErr) throw occErr;
      if (schErr) throw schErr;

      if (schedules && schedules.length > 0 && schedules[0].day_of_week !== undefined) {
        setLessonDay(schedules[0].day_of_week);
      }

      const allMergedOccurrences: any[] = [];
      const usedActualIds = new Set<string>();

      if (schedules) {
        schedules.forEach(sch => {
          let current = new Date(schoolYearStart);
          while (current <= schoolYearEnd) {
            const currentDay = current.getDay() || 7;
            const diff = sch.day_of_week - currentDay;
            const targetDate = new Date(current);
            targetDate.setDate(current.getDate() + diff);

            if (targetDate >= schoolYearStart && targetDate <= schoolYearEnd) {
              const yyyy = targetDate.getFullYear();
              const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
              const dd = String(targetDate.getDate()).padStart(2, '0');
              const dateStr = `${yyyy}-${mm}-${dd}`;

              const actual = occurrences?.find(occ => 
                (occ.schedule_id === sch.id || occ.student_id === studentId) && 
                (occ.original_date === dateStr || (!occ.original_date && occ.date === dateStr))
              );

              if (actual) {
                allMergedOccurrences.push(actual);
                usedActualIds.add(actual.id);
              } else {
                allMergedOccurrences.push({
                  id: `virtual-${sch.id}-${dateStr}`,
                  schedule_id: sch.id,
                  student_id: studentId,
                  teacher_id: sch.teacher_id,
                  date: dateStr,
                  start_time: sch.time_slot + (sch.time_slot.split(':').length === 2 ? ':00' : ''),
                  duration: sch.duration || 45,
                  status: 'scheduled',
                  is_virtual: true,
                  teacher: sch.teacher,
                  schedule: sch
                });
              }
            }
            current.setDate(current.getDate() + 7);
          }
        });
      }

      if (occurrences) {
        occurrences.forEach(occ => {
          if (!usedActualIds.has(occ.id)) {
            allMergedOccurrences.push(occ);
          }
        });
      }

      allMergedOccurrences.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      setSchoolYearOccurrences(allMergedOccurrences);
    } catch (err) {
      console.error('Error fetching school year schedule:', err);
    } finally {
      setLoadingSchoolYearSchedule(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    fetchSchoolYearSchedule();

    if (!studentId) return;

    const channel = supabase
      .channel(`realtime_student_schedule_${studentId}`)
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
            (newRec && newRec.student_id === studentId) ||
            (oldRec && oldRec.student_id === studentId)
          ) {
            fetchSchedule();
            fetchSchoolYearSchedule();
            fetchStudentAndAvatar();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId]);

  const fetchCrisisAlerts = async () => {
    if (!studentId) return;
    try {
      const { data, error } = await supabase
        .from('crisis_notifications')
        .select('*, teacher:users!crisis_notifications_teacher_id_fkey(first_name, last_name)')
        .eq('student_id', studentId)
        .eq('status', 'UNREAD')
        .order('slot_start_datetime', { ascending: true });
      if (!error && data) {
        setCrisisAlerts(data);
      }
    } catch (err) {
      console.error('Error fetching crisis alerts:', err);
    }
  };

  const formatRelativeDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (d.toDateString() === now.toDateString()) {
      return 'Heute';
    }
    if (diffDays === 1) {
      return 'Gestern';
    }
    return `Vor ${diffDays} Tagen`;
  };

  const getBadgeStyles = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('wichtig') || cat.includes('alert') || cat.includes('kris')) {
      return { bg: '#fee2e2', color: '#b91c1c', text: 'WICHTIG' };
    }
    if (cat.includes('erfolg') || cat.includes('success')) {
      return { bg: '#dcfce7', color: '#15803d', text: 'ERFOLG' };
    }
    if (cat.includes('aktion') || cat.includes('action') || cat.includes('event')) {
      return { bg: '#fef08a', color: '#854d0e', text: 'AKTION' };
    }
    return { bg: '#dbeafe', color: '#1e40af', text: 'INFO' };
  };

  const fetchCampusFeed = async (schoolId: string) => {
    if (!schoolId) return;
    setFeedLoading(true);
    try {
      const { data: annData, error: annErr } = await supabase
        .from('campus_announcements')
        .select('*, users(first_name, last_name, photo_url)')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (!annErr && annData) {
        const parsed = annData
          .filter(ann => ann.target_type === 'all' || ann.target_type === 'students')
          .map(ann => ({
            id: ann.id,
            title: ann.title,
            content: ann.message,
            date: ann.created_at,
            category: ann.target_type?.toUpperCase() || 'INFO'
          }));
        setFeedItems(parsed);
      } else {
        setFeedItems([]);
      }
    } catch (err) {
      console.error('Error fetching campus feed:', err);
    } finally {
      setFeedLoading(false);
    }
  };

  const handleConfirmCrisis = async (notifId: string) => {
    try {
      const { error } = await supabase
        .from('crisis_notifications')
        .update({ status: 'READ' })
        .eq('id', notifId);
      if (error) throw error;
      setCrisisAlerts(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      console.error('Error confirming crisis alert:', err);
      alert('Fehler beim Bestätigen der Nachricht.');
    }
  };

  useEffect(() => {
    fetchCrisisAlerts();

    if (!studentId) return;

    const channel = supabase
       .channel(`realtime_student_crisis_${studentId}`)
       .on(
         'postgres_changes',
         {
           event: '*',
           schema: 'public',
           table: 'crisis_notifications'
         },
         (payload) => {
           const newRec = payload.new as any;
           const oldRec = payload.old as any;
           if (
             (newRec && newRec.student_id === studentId) ||
             (oldRec && oldRec.student_id === studentId)
           ) {
             fetchCrisisAlerts();
           }
         }
       )
       .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId]);

  const handleConfirmReschedule = async (occId: string) => {
    try {
      // 1. Get the occurrence details first
      const { data: occ, error: getErr } = await supabase
        .from('schedule_occurrences')
        .select('*, schedule:schedule_id(*)')
        .eq('id', occId)
        .single();
      
      if (getErr || !occ) throw getErr || new Error('Occurrence not found');

      // 2. Update status to rescheduled_confirmed
      const { error } = await supabase
        .from('schedule_occurrences')
        .update({ status: 'rescheduled_confirmed', student_acknowledged: true })
        .eq('id', occId);
      if (error) throw error;

      // 3. Get student name
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', studentId)
        .single();
      const studentName = userData ? `${userData.first_name} ${userData.last_name}` : 'Ein Schüler';
      const formattedDate = new Date(occ.date).toLocaleDateString('de-DE');

      // 4. Insert alert for teacher
      await supabase.from('system_alerts').insert({
        school_id: occ.schedule?.school_id || null,
        teacher_id: occ.teacher_id,
        type: 'Verschiebung bestätigt',
        message: `✅ Bestätigt: ${studentName} hat den Verschiebungstermin am ${formattedDate} um ${occ.start_time?.substring(0,5)} Uhr bestätigt.`
      });

      fetchSchedule();
    } catch (err) {
      console.error('Error confirming reschedule:', err);
    }
  };

  const handleAcknowledgeCancellation = async (occId: string) => {
    try {
      const { error } = await supabase
        .from('schedule_occurrences')
        .update({ student_acknowledged: true })
        .eq('id', occId);
      if (error) throw error;
      fetchSchedule();
    } catch (err) {
      console.error('Error acknowledging cancellation:', err);
    }
  };

  const handleCancelOccurrence = async (occ: any) => {
    const d = new Date(occ.date);
    const formattedDate = d.toLocaleDateString('de-DE');
    if (!confirm(`Möchtest du deinen Termin am ${formattedDate} um ${occ.start_time?.substring(0,5)} Uhr wirklich absagen?`)) return;

    try {
      if (occ.is_virtual) {
        const { error: insertErr } = await supabase
          .from('schedule_occurrences')
          .insert({
            schedule_id: occ.schedule_id,
            student_id: studentId,
            teacher_id: occ.teacher_id,
            date: occ.date,
            start_time: occ.start_time,
            duration: occ.duration || 45,
            status: 'canceled_by_student',
            student_acknowledged: true
          });
        if (insertErr) throw insertErr;
      } else {
        const { error: updateErr } = await supabase
          .from('schedule_occurrences')
          .update({ status: 'canceled_by_student', student_acknowledged: true })
          .eq('id', occ.id);
        if (updateErr) throw updateErr;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', studentId)
        .single();
      const studentName = userData ? `${userData.first_name} ${userData.last_name}` : 'Ein Schüler';

      await supabase.from('system_alerts').insert({
        school_id: occ.schedule?.school_id || null,
        teacher_id: occ.teacher_id,
        type: 'Termin abgesagt',
        message: `❌ Absage: ${studentName} hat den Termin am ${formattedDate} um ${occ.start_time?.substring(0,5)} Uhr abgesagt.`
      });

      fetchSchedule();
      fetchSchoolYearSchedule();
      alert('Der Termin wurde erfolgreich abgesagt.');
    } catch (err) {
      console.error('Error canceling occurrence:', err);
      alert('Fehler beim Absagen des Termins.');
    }
  };

  const handleRejectReschedule = async (occ: any) => {
    try {
      const originalDate = occ.original_date || occ.date;
      const originalStartTime = occ.original_start_time || occ.start_time;

      // 1. Reset occurrence back to original date/time and set status to cancelled
      const { error: updateErr } = await supabase
        .from('schedule_occurrences')
        .update({
          date: originalDate,
          start_time: originalStartTime,
          status: 'cancelled',
          student_acknowledged: false // Student will see it as cancelled in their dashboard
        })
        .eq('id', occ.id);

      if (updateErr) throw updateErr;

      // 2. Alert the teacher
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', studentId)
        .single();
      const studentName = userData ? `${userData.first_name} ${userData.last_name}` : 'Ein Schüler';
      const formattedDate = new Date(occ.date).toLocaleDateString('de-DE');

      await supabase.from('system_alerts').insert({
        school_id: occ.schedule?.school_id || null,
        teacher_id: occ.teacher_id,
        type: 'Verschiebung abgelehnt',
        message: `❌ ${studentName} hat den Verschiebungstermin am ${formattedDate} abgelehnt. Der Termin wurde auf den Originaltermin zurückgesetzt und für diese Woche abgesagt.`
      });

      fetchSchedule();
    } catch (err) {
      console.error('Error rejecting reschedule:', err);
    }
  };
  
  const [activeTab, setActiveTab] = useState<string>(() => {
    let initial = parentActiveTab;
    if (initial === 'mediathek') initial = 'songs';
    if (initial === 'termine' || initial === 'all_appointments') initial = 'events';
    return (initial as any) || 'briefing';
  });

  useEffect(() => {
    if (parentActiveTab) {
      let mapped = parentActiveTab;
      if (mapped === 'mediathek') mapped = 'songs';
      if (mapped === 'termine' || mapped === 'all_appointments') mapped = 'events';
      if (['briefing', 'hero', 'songs', 'practice_board', 'campus_cup', 'events', 'profile'].includes(mapped)) {
        setActiveTab(mapped as any);
      }
    }
  }, [parentActiveTab]);

  useEffect(() => {
    if (activeTab === 'events') {
      fetchSchoolYearSchedule();
    }
  }, [activeTab, studentId]);

  const handleTabChangeLocal = (tab: string) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const [studentSongSearch, setStudentSongSearch] = useState('');
  const [studentSongFilter, setStudentSongFilter] = useState<'all' | 'homework' | 'in_progress' | 'theory' | 'mastered'>('all');

  // Übe-Board / Gyro-Detox Engine state
  const [sessionActive, setSessionActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState('Fokus-Session');
  const [isPhoneFlat, setIsPhoneFlat] = useState(false);

  // Campus Cup States
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [monthlyFocusMinutes, setMonthlyFocusMinutes] = useState(0);

  // DIGITAL DETOX TIMER STATE
  const [showDetox, setShowDetox] = useState(false);
  const [detoxMinutes, setDetoxMinutes] = useState(15);
  const [detoxSecondsLeft, setDetoxSecondsLeft] = useState(15 * 60);
  const [isDetoxActive, setIsDetoxActive] = useState(false);
  const [isFaceDown, setIsFaceDown] = useState(false);
  const [detoxCompleted, setDetoxCompleted] = useState(false);
  
  // WRAPPED STORY STATE
  const [showWrapped, setShowWrapped] = useState(false);
  const [wrappedData, setWrappedData] = useState<any>(null);
  const [storySlide, setStorySlide] = useState(0);
  const [wrappedLoading, setWrappedLoading] = useState(false);

  // PRACTICE LOG BOOK STATE
  const [focusLogs, setFocusLogs] = useState<any[]>([]);
  const [focusLogsLoading, setFocusLogsLoading] = useState(false);
  const [practiceSubTab, setPracticeSubTab] = useState<'üben' | 'logbuch'>('üben');
  const [showPrideCard, setShowPrideCard] = useState(false);

  const fetchFocusLogs = async () => {
    if (!studentId) return;
    setFocusLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('fokus_logs')
        .select('*')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setFocusLogs(data);
      }
    } catch (e) {
      console.error('Error fetching focus logs:', e);
    } finally {
      setFocusLogsLoading(false);
    }
  };

  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    fetchStudentAndAvatar();
    fetchFocusLogs();
  }, [studentId]);

  useEffect(() => {
    if (activeTab === 'profile' && studentId) {
      const fetchStudentSchedules = async () => {
        try {
          const { data } = await supabase
            .from('schedules')
            .select('*, teacher:users!schedules_teacher_id_fkey(first_name, last_name), rooms(name)')
            .eq('student_id', studentId);
          if (data) setStudentSchedules(data);
        } catch (err) {
          console.error('Error fetching student schedules:', err);
        }
      };
      fetchStudentSchedules();
    }
  }, [activeTab, studentId]);

  // progress matrix state
  const [progressItems, setProgressItems] = useState<any[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

  // Lehrwerke assigned to student states
  const [globalLehrwerke, setGlobalLehrwerke] = useState<any[]>([]);
  const [assignedLehrwerke, setAssignedLehrwerke] = useState<any[]>([]);
  const [activeLehrwerkId, setActiveLehrwerkId] = useState<string | null>(null);
  const [activePageNumber, setActivePageNumber] = useState<number | null>(null);

  useEffect(() => {
    if (!studentId) return;
    // Load global Lehrwerke
    try {
      const stored = localStorage.getItem('campus_lehrwerke');
      if (stored) {
        setGlobalLehrwerke(JSON.parse(stored));
      } else {
        // Default library
        const defaults = [
          { id: '1', title: 'GrooveLab Guitar Vol. 1', instrument: 'Guitar', type: 'Standardwerk für E-Gitarre', progress: 60, emoji: '🎸', color: '#34a853', totalPages: 50 },
          { id: '2', title: 'GrooveLab Drums Vol. 1', instrument: 'Drums', type: 'Standardwerk für Schlagzeug', progress: 45, emoji: '🥁', color: '#4f46e5', totalPages: 50 },
          { id: '3', title: 'GrooveLab Bass Vol. 1', instrument: 'Bass', type: 'Standardwerk für E-Bass', progress: 30, emoji: '🎸', color: '#f59e0b', totalPages: 50 },
          { id: '4', title: 'GrooveLab Keys Vol. 1', instrument: 'Keys', type: 'Standardwerk für Keyboard', progress: 80, emoji: '🎹', color: '#ec4899', totalPages: 50 },
          { id: '5', title: 'GrooveLab Vocals Vol. 1', instrument: 'Vocals', type: 'Standardwerk für Gesang', progress: 50, emoji: '🎤', color: '#3b82f6', totalPages: 50 }
        ];
        setGlobalLehrwerke(defaults);
      }
    } catch (e) {}
  }, [studentId]);

  // Synchronize assigned textbooks and page states dynamically from database progressItems in real-time
  useEffect(() => {
    if (!studentId || globalLehrwerke.length === 0) return;

    const builtAssigned: any[] = [];
    const studentInst = studentUser?.instrument || avatar?.instrument_type || '';

    globalLehrwerke.forEach(book => {
      // Find all progress items matching this book's title
      const bookItems = (progressItems || []).filter(item => 
        item.topic_name && item.topic_name.startsWith(`${book.title} - Seite `)
      );

      const isInstrumentMatch = studentInst && 
        book.instrument && 
        studentInst.toLowerCase().trim().includes(book.instrument.toLowerCase().trim());

      if (bookItems.length > 0 || isInstrumentMatch) {
        const pageStates: Record<number, any> = {};

        // Populate page states from progressItems
        bookItems.forEach(item => {
          const pageNumStr = item.topic_name.replace(`${book.title} - Seite `, '').trim();
          const pageNum = parseInt(pageNumStr, 10);
          if (!isNaN(pageNum)) {
            let status: 'locked' | 'homework' | 'mastered' | 'purple' = 'locked';
            if (item.status === 'MASTERED') {
              status = 'mastered';
            } else if (item.status === 'THEORY_DONE') {
              status = 'purple';
            } else if (item.is_current_homework) {
              status = 'homework';
            }

            pageStates[pageNum] = {
              status,
              notes: item.homework_notes || item.teacher_notes || '',
              updatedAt: item.updated_at
            };
          }
        });

        builtAssigned.push({
          studentId,
          lehrwerkId: book.id,
          pageStates
        });
      }
    });

    setAssignedLehrwerke(builtAssigned);

    // Auto-select first assigned textbook if none selected
    if (builtAssigned.length > 0 && !activeLehrwerkId) {
      setActiveLehrwerkId(builtAssigned[0].lehrwerkId);
    }
  }, [progressItems, globalLehrwerke, studentId, studentUser, avatar, activeLehrwerkId]);

  const fetchStudentProgress = async () => {
    setProgressLoading(true);
    try {
      // Try to call backend API
      const resp = await fetch(`/api/student/get-progress?studentId=${studentId}`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('sb-access-token') || ''}`
        }
      });
      if (resp.ok && resp.headers.get('content-type')?.includes('application/json')) {
        const data = await resp.json();
        
        setProgressItems(data.progress || []);
        setProgressLoading(false);
        return;
      }

      // Direct Supabase query fallback
      const { data: premiumInfo } = await supabase
        .from('premium_status')
        .select('is_premium_active')
        .eq('student_id', studentId)
        .maybeSingle();

      const premium = premiumInfo?.is_premium_active ?? false;
      

      const { data: matrixItems } = await supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', studentId)
        .order('updated_at', { ascending: false });

      // Apply asymmetric logic locally as fallback
      const sanitized = (matrixItems || []).map((item: any) => {
        if (premium) {
          return item;
        } else {
          return {
            ...item,
            status: undefined,
            teacher_notes: 'Inhalte in der Premium-Version freischalten'
          };
        }
      });

      setProgressItems(sanitized);
    } catch (err) {
      console.error('Error fetching progress matrix:', err);
    } finally {
      setProgressLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const resp = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: studentId })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
      }
      
      // Fallback Mock Upgrade
      alert("Stripe Checkout wird geladen... (Simulation: Upgrade auf Premium erfolgt jetzt)");
      const { error } = await supabase
        .from('premium_status')
        .upsert({ student_id: studentId, is_premium_active: true });
      if (error) throw error;
      
      // Also update users.is_premium_user
      await supabase
        .from('users')
        .update({ is_premium_user: true })
        .eq('id', studentId);
        
      fetchStudentAndAvatar();
      fetchStudentProgress();
    } catch (err) {
      console.error(err);
      alert("Fehler beim Checkout-Prozess.");
    }
  };

  useEffect(() => {
    fetchStudentProgress();
    if (activeTab === 'practice_board') {
      fetchFocusLogs();
    }
  }, [studentId, activeTab]);

  useEffect(() => {
    if (!studentId) return;

    // Listen to domestic custom events (for same-window / instant kiosk local sync)
    const handleLocalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.studentId === studentId) {
        fetchStudentProgress();
      }
    };
    window.addEventListener('homework-updated', handleLocalUpdate);

    // Listen to Supabase websocket broadcast & postgres changes
    const channel = supabase
      .channel(`realtime_student_progress_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'progress_matrix'
        },
        (payload) => {
          const newRec = payload.new as any;
          const oldRec = payload.old as any;
          if (
            (newRec && newRec.student_id === studentId) ||
            (oldRec && oldRec.student_id === studentId)
          ) {
            fetchStudentProgress();
          }
        }
      )
      .on(
        'broadcast',
        { event: 'homework-changed' },
        () => {
          fetchStudentProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('homework-updated', handleLocalUpdate);
    };
  }, [studentId]);

  const fetchRanking = async () => {
    setRankingLoading(true);
    setRankingError(null);
    try {
      const resp = await fetch(`/api/ranking/global?userId=${studentId}`);
      if (resp.ok) {
        const data = await resp.json();
        setRankingData(data.ranking || []);
      } else {
        const errData = await resp.json().catch(() => ({ error: 'Ranking konnte nicht geladen werden.' }));
        setRankingError(errData.error || 'Fehler beim Laden des Rankings.');
      }
    } catch (err: any) {
      // Offline / direct Supabase fallback simulation for Campus Cup:
      try {
        const { data: user } = await supabase
          .from('users')
          .select('school_id, schools(name, allow_global_ranking)')
          .eq('id', studentId)
          .maybeSingle();

        const userSchoolName = (user?.schools as any)?.name || 'Meine Musikschule';
        // allowGlobal is bypassed - all schools can view global ranking!

        // Generate mock data representing fair Relative-Focus-Index (RFI)
        const mockSchools = [
          { name: 'Popakademie Berlin', rfi: 45.2, isOwnSchool: false },
          { name: 'Rock- & Jazzschule Freiburg', rfi: 38.5, isOwnSchool: false },
          { name: 'Musikschule Hamburg Nord', rfi: 32.1, isOwnSchool: false },
          { name: 'Tonkunst Stuttgart', rfi: 28.4, isOwnSchool: false },
          { name: 'Groove Academy Köln', rfi: 25.9, isOwnSchool: false },
          { name: userSchoolName, rfi: 18.4, isOwnSchool: true },
          { name: 'Klangwelt Dresden', rfi: 14.2, isOwnSchool: false },
          { name: 'School of Rock Leipzig', rfi: 9.8, isOwnSchool: false }
        ];

        mockSchools.sort((a, b) => b.rfi - a.rfi);
        const ranked = mockSchools.map((s, idx) => ({
          rank: idx + 1,
          name: s.name,
          rfi: s.rfi,
          isOwnSchool: s.isOwnSchool
        }));

        setRankingData(ranked);
      } catch (fallbackErr) {
        setRankingError('Fehler beim Laden des Rankings.');
      }
    } finally {
      setRankingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'campus_cup') {
      fetchRanking();
    }
  }, [activeTab, studentId]);

  // Topic pre-selection removed per user request

  // Gyro Detox Engine Effect
  useEffect(() => {
    if (!sessionActive) {
      setIsPhoneFlat(false);
      return;
    }

    // Timer interval
    const interval = setInterval(() => {
      if (isPhoneFlat) {
        setSecondsElapsed(prev => {
          const next = prev + 1;
          if (next === 180) {
            // Flow Zone successfully entered!
            // Double positive chime beep:
            playBeep(660, 150);
            setTimeout(() => playBeep(880, 250), 180);
            if (navigator.vibrate) {
              navigator.vibrate([150, 100, 250]);
            }
          }
          return next;
        });
      }
    }, 1000);

    // Orientation event handler
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta || 0;
      const gamma = e.gamma || 0;

      // Phone is flat if beta and gamma are near 0 or 180 (within 15 deg threshold)
      const flat = (Math.abs(beta) < 15 && Math.abs(gamma) < 15) || 
                   (Math.abs(Math.abs(beta) - 180) < 15 && Math.abs(gamma) < 15);

      if (flat) {
        if (!isPhoneFlat) {
          setIsPhoneFlat(true);
        }
      } else {
        if (isPhoneFlat) {
          setIsPhoneFlat(false);
          
          // Enforce 3-minute Digital Detox Ignition Phase
          setSecondsElapsed(current => {
            if (current < 180) {
              // Beep/warning for resetting ignition
              playBeep(440, 400); // lower tone warning beep
              return 0;
            }
            return current;
          });

          // High-pitched warning beep
          playBeep(880, 200);
          setTimeout(() => playBeep(880, 200), 250);
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }
        }
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      clearInterval(interval);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [sessionActive, isPhoneFlat]);

  const finishPracticeSession = async () => {
    if (secondsElapsed < 180) {
      const remaining = 180 - secondsElapsed;
      alert(`Der Fokus-Funke glimmt noch! 🔥\nHalte noch ${remaining} Sekunden durch, um die 3-minütige Fokus-Zündung erfolgreich abzuschließen und deinen Streak zu sichern!`);
      return;
    }

    setSessionActive(false);
    const durationMinutes = Math.max(1, Math.round(secondsElapsed / 60));

    try {
      // 1. Post to API endpoint
      const response = await fetch('/api/student/finish-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('sb-access-token') || ''}`
        },
        body: JSON.stringify({
          studentId,
          topicName: selectedTopic,
          durationMinutes
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Klasse geübt! Du hast +${data.stats.xpAdded} XP erhalten und dein Streak ist bei ${data.stats.streakFlame} Flammen! 🔥`);
        fetchStudentAndAvatar();
        fetchStudentProgress();
        fetchFocusLogs();
        return;
      }

      // 2. Direct Supabase fallback
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Fetch current stats
      const { data: stats } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      let totalFocus = durationMinutes;
      let monthlyFocus = durationMinutes;
      let currentXp = durationMinutes * 10;
      let streakFlame = 1;
      let lastPracticeDate = null;

      if (stats) {
        totalFocus = (stats.total_focus_minutes || 0) + durationMinutes;
        monthlyFocus = (stats.monthly_focus_minutes || 0) + durationMinutes;
        currentXp = (stats.current_xp || 0) + (durationMinutes * 10);
        streakFlame = stats.streak_flame || 0;
        lastPracticeDate = stats.last_practice_date ? String(stats.last_practice_date) : null;
      }

      if (lastPracticeDate === yesterdayStr) {
        streakFlame += 1;
      } else if (lastPracticeDate === todayStr) {
        // Keep same streak
      } else {
        streakFlame = 1;
      }

      // Upsert stats
      await supabase.from('student_stats').upsert({
        student_id: studentId,
        total_focus_minutes: totalFocus,
        monthly_focus_minutes: monthlyFocus,
        streak_flame: streakFlame,
        last_practice_date: todayStr,
        current_xp: currentXp,
        updated_at: new Date().toISOString()
      });

      // Log to focus log
      await supabase.from('fokus_logs').insert({
        user_id: studentId,
        duration_minutes: durationMinutes,
        created_at: new Date().toISOString()
      });

      // Update avatar
      const { data: avatar } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', studentId)
        .maybeSingle();

      if (avatar) {
        await supabase.from('avatars').update({
          xp: currentXp,
          streak_flame: streakFlame,
          last_focus_date: todayStr
        }).eq('id', avatar.id);
      }

      alert(`Klasse geübt! Du hast +${durationMinutes * 10} XP erhalten und dein Streak ist bei ${streakFlame} Flammen! 🔥`);
      fetchStudentAndAvatar();
      fetchStudentProgress();
      fetchFocusLogs();

    } catch (err: any) {
      console.error('Error finishing session:', err);
      alert('Fehler beim Beenden der Session.');
    }
  };

  const simulatePracticeSession = async (minutes: number) => {
    try {
      // 1. Post to API endpoint
      const response = await fetch('/api/student/finish-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('sb-access-token') || ''}`
        },
        body: JSON.stringify({
          studentId,
          topicName: selectedTopic || 'Allgemeines Üben',
          durationMinutes: minutes
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Entwickler-Simulation: ${minutes} Min. Fokus gebucht! 🔥 +${data.stats.xpAdded} XP erhalten und Streak bei ${data.stats.streakFlame} Flammen!`);
        fetchStudentAndAvatar();
        fetchStudentProgress();
        fetchFocusLogs();
        return;
      }

      // 2. Direct Supabase fallback
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Fetch current stats
      const { data: stats } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      let totalFocus = minutes;
      let monthlyFocus = minutes;
      let currentXp = minutes * 10;
      let streakFlame = 1;
      let lastPracticeDate = null;

      if (stats) {
        totalFocus = (stats.total_focus_minutes || 0) + minutes;
        monthlyFocus = (stats.monthly_focus_minutes || 0) + minutes;
        currentXp = (stats.current_xp || 0) + (minutes * 10);
        streakFlame = stats.streak_flame || 0;
        lastPracticeDate = stats.last_practice_date ? String(stats.last_practice_date) : null;
      }

      if (lastPracticeDate === yesterdayStr) {
        streakFlame += 1;
      } else if (lastPracticeDate === todayStr) {
        // Keep same streak
      } else {
        streakFlame = 1;
      }

      // Upsert stats
      await supabase.from('student_stats').upsert({
        student_id: studentId,
        total_focus_minutes: totalFocus,
        monthly_focus_minutes: monthlyFocus,
        streak_flame: streakFlame,
        last_practice_date: todayStr,
        current_xp: currentXp,
        updated_at: new Date().toISOString()
      });

      // Log to focus log
      await supabase.from('fokus_logs').insert({
        user_id: studentId,
        duration_minutes: minutes,
        created_at: new Date().toISOString()
      });

      // Update avatar
      const { data: avatar } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', studentId)
        .maybeSingle();

      if (avatar) {
        await supabase.from('avatars').update({
          xp: currentXp,
          streak_flame: streakFlame,
          last_focus_date: todayStr
        }).eq('id', avatar.id);
      }

      alert(`Entwickler-Simulation: ${minutes} Min. Fokus gebucht! 🔥 +${minutes * 10} XP erhalten und Streak bei ${streakFlame} Flammen!`);
      fetchStudentAndAvatar();
      fetchStudentProgress();
      fetchFocusLogs();

    } catch (err: any) {
      console.error('Error simulating session:', err);
      alert('Fehler beim Simulieren der Session.');
    }
  };


  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: editingProfile.first_name,
          last_name: editingProfile.last_name,
          email: editingProfile.email,
          phone: editingProfile.phone,
          instrument: editingProfile.instrument
        })
        .eq('id', studentId);
      
      if (error) throw error;
      
      // Update local state
      setStudentUser((prev: any) => prev ? { ...prev, ...editingProfile } : null);
      
      // Call parent update if exists
      if (onProfileUpdate) {
        onProfileUpdate({
          first_name: editingProfile.first_name,
          last_name: editingProfile.last_name,
          email: editingProfile.email,
          phone: editingProfile.phone,
          instrument: editingProfile.instrument
        });
      }
      
      setShowEditProfile(false);
      alert('Profil erfolgreich gespeichert!');
    } catch (err: any) {
      console.error('Error updating student profile:', err);
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Gyroscope API Hook for Digital Detox (beta angle)
  useEffect(() => {
    if (!isDetoxActive || detoxCompleted) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta; // In degree [-180, 180]
      const gamma = event.gamma; // In degree [-90, 90]
      
      if (beta === null) return;
      
      // Placed flat on display (face down): beta is close to 180 or -180, or gamma is tilted.
      // A robust face down detection is Math.abs(beta) > 165 or (Math.abs(beta) < 15 and screen orientation flipped).
      // Let's use Math.abs(beta) > 160 or Math.abs(beta) < -160 or (Math.abs(gamma) > 75 and Math.abs(beta) > 150)
      const faceDown = Math.abs(beta) > 160 || Math.abs(beta) < -160;
      
      if (faceDown && !isFaceDown) {
        setIsFaceDown(true);
        // Play subtle confirmation beep
        playBeep(440, 100);
      } else if (!faceDown && isFaceDown) {
        setIsFaceDown(false);
        // Freeze timer and trigger haptic warning
        triggerWarning();
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isDetoxActive, isFaceDown, detoxCompleted]);

  // Timer Tick Hook
  useEffect(() => {
    if (isDetoxActive && isFaceDown && detoxSecondsLeft > 0 && !detoxCompleted) {
      timerRef.current = setInterval(() => {
        setDetoxSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleDetoxSuccess();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isDetoxActive, isFaceDown, detoxSecondsLeft, detoxCompleted]);

  const triggerWarning = () => {
    // Haptic Vibrate Warning
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
    // High-pitched warning beep
    playBeep(880, 400);
  };

  const playBeep = (freq: number, duration: number) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (duration / 1000));
    } catch (e) {
      console.warn("AudioContext warning beep failed:", e);
    }
  };

  const fetchStudentAndAvatar = async () => {
    try {
      setLoading(true);
      setBriefingLoading(true);
      setError(null);

      // 1. Fetch student user profile with premium state
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('id', studentId)
        .single();

      if (userErr) throw userErr;
      if (!user) return;

      setStudentUser(user);
      setIsAppUser(user.is_app_user ?? false);
      setIsPremiumUser(user.is_premium_user ?? false);

      if (user.school_id) {
        fetchCampusFeed(user.school_id);
      }

      // 2. Fetch avatar records
      const { data: avatarRecord, error: avatarErr } = await supabase
        .from('avatars')
        .select('avatar_style, instrument_type, evolution_level, xp, asset_path, streak_flame')
        .eq('user_id', studentId)
        .maybeSingle();

      if (avatarErr) throw avatarErr;

      if (!avatarRecord && user.is_app_user) {
        setShowSelector(true);
      } else {
        setAvatar(avatarRecord);
      }

      // Fetch student stats for Campus Cup
      const { data: statsData } = await supabase
        .from('student_stats')
        .select('monthly_focus_minutes')
        .eq('student_id', studentId)
        .maybeSingle();
      setMonthlyFocusMinutes(statsData?.monthly_focus_minutes || 0);

      // 3. Fetch daily briefing
      try {
        const resp = await fetch(`/api/briefing/student?userId=${studentId}`);
        if (resp.ok) {
          const bd = await resp.json();
          if (bd && bd.success) {
            setBriefingData(bd);
          }
        } else {
          throw new Error('API offline');
        }
      } catch (e) {
        // Fallback local query
        try {
          const schoolId = user.school_id || (user as any).school_id;
          let currentSchoolId = schoolId;

          if (!currentSchoolId) {
            const { data: userWithSchool } = await supabase
              .from('users')
              .select('school_id')
              .eq('id', studentId)
              .single();
            currentSchoolId = userWithSchool?.school_id;
          }

          if (currentSchoolId) {
            const { data: schoolData } = await supabase
              .from('schools')
              .select('allow_messages_global')
              .eq('id', currentSchoolId)
              .single();
            const allowMessages = schoolData?.allow_messages_global ?? true;

            const rawDay = new Date().getDay();
            const todayWeekday = rawDay === 0 ? 7 : rawDay;

            const { data: todaySchedules } = await supabase
              .from('schedules')
              .select(`
                id,
                time_slot,
                status,
                teacher_id,
                rooms (name),
                teacher:users!schedules_teacher_id_fkey (first_name, last_name)
              `)
              .eq('student_id', studentId)
              .eq('day_of_week', todayWeekday)
              .maybeSingle();

            let todayLesson = null;
            if (todaySchedules) {
              const teacherName = todaySchedules.teacher 
                ? `Herr/Frau ${(todaySchedules.teacher as any).last_name}` 
                : 'Lehrkraft';
              todayLesson = {
                id: todaySchedules.id,
                time: todaySchedules.time_slot,
                room: (todaySchedules.rooms as any)?.name || 'Unterrichtsraum',
                teacher: teacherName,
                teacher_id: todaySchedules.teacher_id,
                status: todaySchedules.status,
                displayString: `Heute ${todaySchedules.time_slot} Uhr, ${(todaySchedules.rooms as any)?.name || 'Raum'} bei ${teacherName}`
              };
            }

            const currentXp = avatarRecord?.xp || 0;
            const currentLevel = avatarRecord?.evolution_level || 1;
            const milestoneTarget = 50;
            const remainingXp = milestoneTarget - (currentXp % milestoneTarget);

            setBriefingData({
              success: true,
              allowMessagesGlobal: allowMessages,
              todayLesson,
              gamification: {
                streakFlame: avatarRecord?.streak_flame || 0,
                evolutionLevel: currentLevel,
                currentXp,
                remainingXp,
                xpTargetMessage: `Noch ${remainingXp} XP bis zum heutigen Meilenstein!`,
                avatarStyle: avatarRecord?.avatar_style || 'Standard_Silhouette',
                instrumentType: avatarRecord?.instrument_type || 'Unknown'
              }
            });
          }
        } catch (err) {
          console.error('Error in student briefing fallback:', err);
        }
      } finally {
        setBriefingLoading(false);
      }

    } catch (err: any) {
      console.error('Error loading student avatar:', err);
      setError('Fehler beim Laden des Profils.');
      setBriefingLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDetox = () => {
    setDetoxSecondsLeft(detoxMinutes * 60);
    setIsDetoxActive(true);
    setIsFaceDown(false);
    setDetoxCompleted(false);
    setShowDetox(true);
  };

  const handleDetoxSuccess = async () => {
    setDetoxCompleted(true);
    setIsDetoxActive(false);
    playBeep(523.25, 600); // Success musical tone

    try {
      const resp = await fetch('/api/complete-detox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: studentId,
          durationMinutes: detoxMinutes
        })
      });

      if (!resp.ok) {
        // Fallback local update if server completed offline
        const newXp = (avatar?.xp || 0) + 100;
        const currentStreak = (avatar?.streak_flame || 0) + 1;
        await supabase.from('avatars').update({
          xp: newXp,
          streak_flame: currentStreak,
          last_focus_date: new Date().toISOString().split('T')[0]
        }).eq('user_id', studentId);
      }

      fetchStudentAndAvatar();
    } catch (err) {
      console.error("Error finalizing focus session:", err);
    }
  };

  const loadWrappedStory = async () => {
    setWrappedLoading(true);
    try {
      const resp = await fetch(`/api/wrapped?userId=${studentId}`);
      if (resp.ok) {
        const data = await resp.json();
        setWrappedData(data);
      } else {
        // Fallback local mock data
        setWrappedData({
          success: true,
          isPremium: isPremiumUser,
          avatarStyle: isPremiumUser ? 'Premium_Hero' : 'Standard_Silhouette',
          avatarUrl: isPremiumUser ? (avatar?.asset_path || '/avatars/hero_guitarist_lvl1.png') : '/avatars/silhouette_grey.png',
          monthlyFlashback: {
            focusMinutes: isPremiumUser ? 280 : null,
            masteredSongsCount: isPremiumUser ? 4 : null,
            badgeName: isPremiumUser ? 'Mai-Fokus-Badge 🏆' : 'Gesperrt 🔒',
            badgeCode: 'Badge_Mai_2026'
          },
          campusWrapped: {
            focusMinutes: isPremiumUser ? 1420 : null,
            masteredSongsCount: isPremiumUser ? 18 : null
          }
        });
      }
      setStorySlide(0);
      setShowWrapped(true);
    } catch (e) {
      console.error(e);
    } finally {
      setWrappedLoading(false);
    }
  };

  const handleCancelLesson = async (scheduleId: string) => {
    if (!confirm('Möchtest du den heutigen Unterricht wirklich absagen? Der Slot wird für andere freigegeben.')) return;
    try {
      const resp = await fetch('/api/schedule/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, studentId })
      });
      if (resp.ok) {
        fetchStudentAndAvatar();
        return;
      }
      const { error } = await supabase
        .from('schedules')
        .update({ status: 'canceled_by_student' })
        .eq('id', scheduleId);
      if (error) throw error;
      fetchStudentAndAvatar();
    } catch (err) {
      console.error(err);
      alert('Fehler beim Absagen des Unterrichts.');
    }
  };

  const handleParentApproval = async (scheduleId: string, approve: boolean) => {
    try {
      const nextStatus = approve ? 'approved' : 'canceled_by_student';
      const resp = await fetch('/api/schedule/approve-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, approve })
      });
      if (resp.ok) {
        fetchStudentAndAvatar();
        return;
      }
      const { error } = await supabase
        .from('schedules')
        .update({ status: nextStatus })
        .eq('id', scheduleId);
      if (error) throw error;
      fetchStudentAndAvatar();
    } catch (err) {
      console.error(err);
      alert('Fehler bei der Bestätigung.');
    }
  };

  const handleSelectHero = async (heroClassId: string) => {
    setSubmittingSelection(true);
    try {
      const response = await fetch('/api/select-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentId}`
        },
        body: JSON.stringify({ heroClassId })
      });

      if (response.ok) {
        const result = await response.json();
        setAvatar(result.avatar);
        setShowSelector(false);
        return;
      }

      const assetPaths: Record<string, string> = {
        guitarist: '/avatars/hero_guitarist_lvl1.png',
        drummer: '/avatars/hero_drummer_lvl1.png',
        keyboardist: '/avatars/hero_keys_lvl1.png',
        vocalist: '/avatars/hero_vocals_lvl1.png'
      };

      const fallbackAvatar = {
        user_id: studentId,
        avatar_style: 'Premium_Hero',
        instrument_type: heroClassId,
        evolution_level: 1,
        xp: 0,
        asset_path: assetPaths[heroClassId] || '/avatars/silhouette_standard.png',
        streak_flame: 0
      };

      const { data, error } = await supabase
        .from('avatars')
        .upsert(fallbackAvatar)
        .select('*')
        .single();

      if (error) throw error;
      await supabase.from('users').update({ avatar_url: fallbackAvatar.asset_path }).eq('id', studentId);

      setAvatar(data as Avatar);
      setShowSelector(false);
    } catch (err: any) {
      setError('Auswahl fehlgeschlagen.');
    } finally {
      setSubmittingSelection(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Lade Helden-Profil...</p>
      </div>
    );
  }



  // WENN IS_APP_USER = TRUE (Selector Screen if no avatar chosen yet)
  if (showSelector) {
    return (
      <div className="max-w-xl mx-auto bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl animate-fadeIn">
        <div className="text-center mb-6">
          <Sparkles className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
          <h3 className="text-2xl font-black text-white tracking-tight">Wähle deinen Helden!</h3>
          <p className="text-sm text-slate-400 mt-1">Welche Musiker-Klasse passt zu dir? Du kannst sofort XP sammeln.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {HERO_CLASSES.map(hc => (
            <button
              key={hc.id}
              onClick={() => handleSelectHero(hc.id)}
              disabled={submittingSelection}
              className="p-5 bg-slate-950/60 hover:bg-indigo-950/30 border border-slate-800 hover:border-indigo-500 rounded-2xl text-left transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl bg-slate-900 p-2.5 rounded-xl group-hover:scale-110 transition-transform">{hc.icon}</span>
                <div>
                  <span className="block font-extrabold text-white text-base group-hover:text-indigo-400 transition-all">{hc.name}</span>
                  <span className="block text-xs text-slate-400 font-semibold mt-1 leading-relaxed">{hc.desc}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!avatar) return null;

  const currentLevel = avatar.evolution_level || 1;
  const currentXp = avatar.xp || 0;
  const levelTitle = LEVEL_NAMES[avatar.instrument_type]?.[currentLevel] || `Stufe ${currentLevel}`;

  // XP calculation
  let nextThreshold = 100;
  let prevThreshold = 0;
  if (currentLevel === 2) {
    prevThreshold = 100;
    nextThreshold = 300;
  } else if (currentLevel === 3) {
    prevThreshold = 300;
    nextThreshold = 9999;
  }

  const xpInCurrentLevel = Math.max(0, currentXp - prevThreshold);
  const totalXpInLevel = nextThreshold - prevThreshold;
  const xpPercentage = currentLevel === 3 ? 100 : Math.min(100, (xpInCurrentLevel / totalXpInLevel) * 100);

  // Circular progress calculations for fit style ring
  const circleRadius = 70;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (xpPercentage / 100) * circleCircumference;

  const renderFlameTiersWidget = () => {
    const streakDays = avatar?.streak_flame || 0;
    const isJokerUsed = studentUser?.joker_used ?? false;

    const isLvl1Active = streakDays >= 3;
    const isLvl2Active = streakDays >= 6;
    const isLvl3Active = streakDays >= 9;

    return (
      <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Outfit', sans-serif" }}>
            🔥 Übe-Serie & Flammen
          </h3>
          <div style={{ background: '#fff7ed', color: '#ea580c', fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px', borderRadius: '100px', border: '1px solid #fed7aa' }}>
            {streakDays} { (streakDays === 1) ? 'Tag' : 'Tage' }
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
          {/* Card 1: Kleine Flamme */}
          <div style={{ 
            background: isLvl1Active ? 'rgba(254, 240, 138, 0.3)' : 'rgba(248, 250, 252, 0.5)', 
            border: isLvl1Active ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(226, 232, 240, 0.8)',
            borderRadius: '16px', 
            padding: '14px 8px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '6px', 
            minHeight: '90px',
            boxShadow: isLvl1Active ? '0 4px 12px rgba(234, 179, 8, 0.08)' : 'none',
            transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
          }}>
            <div style={{ color: isLvl1Active ? '#eab308' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '38px' }}>
              <Flame size={18} fill={isLvl1Active ? '#eab308' : 'none'} style={{ transition: 'all 0.2s' }} />
            </div>
            <strong style={{ fontSize: '0.8rem', fontWeight: 800, color: isLvl1Active ? '#854d0e' : '#64748b' }}>3 Tage</strong>
            <span style={{ fontSize: '0.62rem', color: isLvl1Active ? '#a16207' : '#94a3b8', fontWeight: 600 }}>3 Min.</span>
          </div>

          {/* Card 2: Mittlere Flamme */}
          <div style={{ 
            background: isLvl2Active ? 'rgba(255, 237, 213, 0.4)' : 'rgba(248, 250, 252, 0.5)', 
            border: isLvl2Active ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid rgba(226, 232, 240, 0.8)',
            borderRadius: '16px', 
            padding: '14px 8px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '6px', 
            minHeight: '90px',
            boxShadow: isLvl2Active ? '0 4px 12px rgba(249, 115, 22, 0.08)' : 'none',
            transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
          }}>
            <div style={{ color: isLvl2Active ? '#f97316' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '38px' }}>
              <Flame size={28} fill={isLvl2Active ? '#f97316' : 'none'} style={{ transition: 'all 0.2s' }} />
            </div>
            <strong style={{ fontSize: '0.8rem', fontWeight: 800, color: isLvl2Active ? '#9a3412' : '#64748b' }}>6 Tage</strong>
            <span style={{ fontSize: '0.62rem', color: isLvl2Active ? '#c2410c' : '#94a3b8', fontWeight: 600 }}>5 Min.</span>
          </div>

          {/* Card 3: Helden-Feuer */}
          <div style={{ 
            background: isLvl3Active ? 'rgba(254, 226, 226, 0.4)' : 'rgba(248, 250, 252, 0.5)', 
            border: isLvl3Active ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(226, 232, 240, 0.8)',
            borderRadius: '16px', 
            padding: '14px 8px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '6px', 
            minHeight: '90px',
            boxShadow: isLvl3Active ? '0 4px 12px rgba(239, 68, 68, 0.08)' : 'none',
            transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
          }}>
            <div style={{ color: isLvl3Active ? '#ef4444' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '38px' }}>
              <Flame size={38} fill={isLvl3Active ? '#ef4444' : 'none'} style={{ transition: 'all 0.2s' }} />
            </div>
            <strong style={{ fontSize: '0.8rem', fontWeight: 800, color: isLvl3Active ? '#991b1b' : '#64748b' }}>9 Tage</strong>
            <span style={{ fontSize: '0.62rem', color: isLvl3Active ? '#b91c1c' : '#94a3b8', fontWeight: 600 }}>10 Min.</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
          {isJokerUsed ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef2f2', color: '#ef4444', padding: '4px 10px', borderRadius: '8px', fontWeight: 800, border: '1px solid #fca5a5' }}>
              ❌ Joker verbraucht
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '8px', fontWeight: 800, border: '1px solid #a7f3d0' }}>
              👍 Joker bereit
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: '"Outfit", "Inter", sans-serif', maxWidth: '100%', margin: '0 auto', width: '100%' }}>
      {/* Visual Enhancements: High-Fidelity CSS Animations & Interactive Classes */}
      <style>{`
        @keyframes floatShield {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1.5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes pulseGlow {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.15; }
          50% { transform: translate(-50%, -50%) scale(1.18); opacity: 0.28; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0.15; }
        }
        @keyframes pulseButton {
          0% { transform: scale(1); box-shadow: 0 8px 24px -6px rgba(16, 185, 129, 0.4); }
          50% { transform: scale(1.035); box-shadow: 0 16px 32px -4px rgba(16, 185, 129, 0.6); }
          100% { transform: scale(1); box-shadow: 0 8px 24px -6px rgba(16, 185, 129, 0.4); }
        }
        @keyframes pulseCertButton {
          0% { transform: scale(1); box-shadow: 0 8px 20px -6px rgba(15, 23, 42, 0.3); }
          50% { transform: scale(1.025); box-shadow: 0 14px 28px -4px rgba(15, 23, 42, 0.45); }
          100% { transform: scale(1); box-shadow: 0 8px 20px -6px rgba(15, 23, 42, 0.3); }
        }
        @keyframes sparkleStar {
          0% { opacity: 0.4; transform: scale(0.8) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.25) rotate(180deg); }
          100% { opacity: 0.4; transform: scale(0.8) rotate(360deg); }
        }
        @keyframes lockWobble {
          0% { transform: rotate(0deg); }
          20% { transform: rotate(-8deg); }
          40% { transform: rotate(6deg); }
          60% { transform: rotate(-4deg); }
          80% { transform: rotate(2deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes backdropFadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(16px); }
        }
        @keyframes modalScaleUp {
          from { transform: scale(0.92) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes shimmerLine {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }
        .float-shield-anim {
          animation: floatShield 4s ease-in-out infinite;
        }
        .pulse-glow-backdrop {
          animation: pulseGlow 5s ease-in-out infinite;
        }
        .pulse-btn-anim {
          animation: pulseButton 2.5s ease-in-out infinite;
        }
        .pulse-cert-btn-anim {
          animation: pulseCertButton 3s ease-in-out infinite;
        }
        .sparkle-star-1 {
          animation: sparkleStar 2.8s ease-in-out infinite;
        }
        .sparkle-star-2 {
          animation: sparkleStar 3.5s ease-in-out infinite;
        }
        .lock-hover:hover .lock-icon-container {
          animation: lockWobble 0.6s ease-in-out;
        }
        .glow-active-border {
          background: linear-gradient(#ffffff, #ffffff) padding-box,
                      linear-gradient(135deg, rgba(16, 185, 129, 0.4), rgba(5, 150, 105, 0.15)) border-box;
          border: 2px solid transparent !important;
        }
        .glow-inactive-border {
          background: linear-gradient(#ffffff, #ffffff) padding-box,
                      linear-gradient(135deg, rgba(226, 232, 240, 0.8), rgba(203, 213, 225, 0.5)) border-box;
          border: 1.5px solid transparent !important;
        }
        .shimmering-border {
          position: relative;
          overflow: hidden;
        }
        .shimmering-border::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          border-radius: inherit;
          padding: 2px;
          background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.5), transparent);
          background-size: 200px 100%;
          animation: shimmerLine 3s infinite linear;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
      `}</style>
      
      {/* Top Tab Switcher - Removed per user request */}
      <div style={{ display: 'none', gap: '8px', background: '#f1f3f4', padding: '6px', borderRadius: '100px', marginBottom: '24px' }}>
        <button
          onClick={() => handleTabChangeLocal('briefing')}
          style={{
            flex: 1,
            border: 'none',
            background: activeTab === 'briefing' ? '#ffffff' : 'transparent',
            color: activeTab === 'briefing' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'briefing' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Coffee size={15} />
          <span>Briefing</span>
        </button>
        
        <button
          onClick={() => handleTabChangeLocal('songs')}
          style={{
            flex: 1.2,
            border: 'none',
            background: activeTab === 'songs' ? '#ffffff' : 'transparent',
            color: activeTab === 'songs' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'songs' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Music size={15} />
          <span>Songs & Material</span>
        </button>

        <button
          onClick={() => handleTabChangeLocal('practice_board')}
          style={{
            flex: 1.2,
            border: 'none',
            background: activeTab === 'practice_board' ? '#ffffff' : 'transparent',
            color: activeTab === 'practice_board' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'practice_board' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Clock size={15} />
          <span>Übe-Board</span>
        </button>

        <button
          onClick={() => handleTabChangeLocal('campus_cup')}
          style={{
            flex: 1.2,
            border: 'none',
            background: activeTab === 'campus_cup' ? '#ffffff' : 'transparent',
            color: activeTab === 'campus_cup' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'campus_cup' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Trophy size={15} />
          <span>Campus-Cup</span>
        </button>

        <button
          onClick={() => handleTabChangeLocal('hero')}
          style={{
            flex: 1,
            border: 'none',
            background: activeTab === 'hero' ? '#ffffff' : 'transparent',
            color: activeTab === 'hero' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'hero' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Star size={15} />
          <span>Mein Held</span>
        </button>
      </div>

      {activeTab === 'practice_board' && (
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '24px', alignItems: 'stretch', width: '100%', position: 'relative' }}>
          <div style={{
              flex: '1 1 600px',
              background: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.01)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              position: 'relative'
            }} className="animation-slide-up">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0, 0, 0, 0.06)', paddingBottom: '18px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ 
                    background: '#f5f5f7', 
                    color: '#1d1d1f', 
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(0, 0, 0, 0.04)'
                  }}>
                    <Clock size={18} style={{ color: '#10b981' }} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>Übe-Board</h4>
                    <p style={{ fontSize: '0.8rem', color: '#86868b', margin: '2px 0 0 0', fontWeight: 500 }}>
                      {practiceSubTab === 'üben' ? 'Fokus-Timer & Detox' : 'Dein persönliches Übe-Logbuch'}
                    </p>
                  </div>
                </div>

                {/* Subtab Switch */}
                {!sessionActive && (
                  <div style={{
                    position: 'relative',
                    display: 'flex',
                    background: 'rgba(120, 120, 128, 0.08)',
                    padding: '2px',
                    borderRadius: '9px',
                    width: 'fit-content',
                  }}>
                    <button
                      onClick={() => setPracticeSubTab('üben')}
                      style={{
                        border: 'none',
                        background: practiceSubTab === 'üben' ? '#ffffff' : 'transparent',
                        color: '#1d1d1f',
                        padding: '6px 18px',
                        fontWeight: practiceSubTab === 'üben' ? '600' : '500',
                        fontSize: '0.78rem',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        boxShadow: practiceSubTab === 'üben' ? '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 0px rgba(0, 0, 0, 0.04)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        zIndex: 2,
                        textAlign: 'center'
                      }}
                    >
                      Üben
                    </button>
                    <button
                      onClick={() => setPracticeSubTab('logbuch')}
                      style={{
                        border: 'none',
                        background: practiceSubTab === 'logbuch' ? '#ffffff' : 'transparent',
                        color: '#1d1d1f',
                        padding: '6px 18px',
                        fontWeight: practiceSubTab === 'logbuch' ? '600' : '500',
                        fontSize: '0.78rem',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        boxShadow: practiceSubTab === 'logbuch' ? '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 0px rgba(0, 0, 0, 0.04)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        zIndex: 2,
                        textAlign: 'center'
                      }}
                    >
                      Logbuch
                    </button>
                  </div>
                )}
              </div>

              {/* TAB 1: ÜBEN (TIMER) */}
              {practiceSubTab === 'üben' && (
                <div>
                  {!sessionActive ? (
                    (() => {
                      const todayStr = new Date().toDateString();
                      const hasPracticedToday = focusLogs.some(log => {
                        return new Date(log.created_at).toDateString() === todayStr && (log.duration_minutes || 0) >= 3;
                      });
                      
                      return (
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
                          gap: '24px', 
                          width: '100%',
                          alignItems: 'start'
                        }}>
                          {/* Left Column: Fokus-Session Central Controller Card */}
                          <div style={{
                            background: '#ffffff',
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                            borderRadius: '24px',
                            padding: '32px',
                            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.005)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '24px',
                            boxSizing: 'border-box',
                            width: '100%'
                          }} className="hover-scale">
                            <h4 style={{ margin: 0, fontWeight: 900, fontSize: '1.15rem', color: '#1e293b', letterSpacing: '-0.02em', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '14px' }}>
                              ⚡ Fokus-Session starten
                            </h4>

                            {/* Streak Level Target Indicator */}
                            {(() => {
                              const strLvl = studentUser?.streak_level ?? 1;
                              const targetMins = strLvl === 3 ? (studentUser?.streak_flame3_mins ?? 10) : (strLvl === 2 ? (studentUser?.streak_flame2_mins ?? 5) : (studentUser?.streak_flame1_mins ?? 3));
                              const flameLabel = strLvl === 3 ? 'Große Flamme 🔥🔥🔥' : (strLvl === 2 ? 'Mittlere Flamme 🔥🔥' : 'Kleine Flamme 🔥');

                              return (
                                <div style={{
                                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                                  border: '1.5px solid #fde68a',
                                  borderRadius: '16px',
                                  padding: '14px 18px',
                                  textAlign: 'center',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                  boxShadow: '0 4px 15px rgba(251, 191, 36, 0.05)'
                                }}>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Dein Übeziel heute
                                  </span>
                                  <strong style={{ fontSize: '1.5rem', fontWeight: 950, color: '#92400e' }}>
                                    {flameLabel} ({targetMins} Min.)
                                  </strong>
                                  <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600 }}>
                                    Erreiche dieses Ziel, um deine Tagesserie fortzusetzen!
                                  </span>
                                </div>
                              );
                            })()}

                            {/* Circular visual timer representation (static state) */}
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                              <div style={{ position: 'relative', width: '190px', height: '190px' }}>
                                <svg width="190" height="190" viewBox="0 0 190 190">
                                  <circle cx="95" cy="95" r="80" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                                  <circle 
                                    cx="95" 
                                    cy="95" 
                                    r="80" 
                                    fill="none" 
                                    stroke="#10b981" 
                                    strokeWidth="10" 
                                    strokeDasharray={2 * Math.PI * 80}
                                    strokeDashoffset={2 * Math.PI * 80}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <div style={{
                                  position: 'absolute',
                                  inset: 0,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.02em' }}>00:00</span>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Detox-Timer</span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={async () => {
                                if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                                  try {
                                    const permission = await (DeviceOrientationEvent as any).requestPermission();
                                    if (permission !== 'granted') {
                                      alert('Sensor-Rechte werden für den Detox-Modus benötigt.');
                                      return;
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                                
                                setSecondsElapsed(0);
                                setSessionActive(true);
                                setIsPhoneFlat(false);
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '16px',
                                borderRadius: '16px',
                                fontWeight: 950,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                boxShadow: '0 8px 20px rgba(16,185,129,0.2)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                width: '100%'
                              }}
                              className="hover-scale"
                            >
                              🚀 Fokus-Session starten
                            </button>

                            {/* DEVELOPER SIMULATION TOOLBAR */}
                            <div style={{
                              marginTop: '8px',
                              paddingTop: '16px',
                              borderTop: '1px dashed rgba(0, 0, 0, 0.08)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              width: '100%'
                            }}>
                              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                                🛠️ Entwickler-Simulation (Dummys)
                              </span>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                <button
                                  onClick={() => simulatePracticeSession(3)}
                                  style={{
                                    background: '#f5f5f7',
                                    border: '1px solid rgba(0,0,0,0.06)',
                                    borderRadius: '10px',
                                    padding: '8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    color: '#1d1d1f',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  className="hover-scale"
                                >
                                  🔥 3 Min.
                                </button>
                                <button
                                  onClick={() => simulatePracticeSession(6)}
                                  style={{
                                    background: '#f5f5f7',
                                    border: '1px solid rgba(0,0,0,0.06)',
                                    borderRadius: '10px',
                                    padding: '8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    color: '#1d1d1f',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  className="hover-scale"
                                >
                                  ⚡ 6 Min.
                                </button>
                                <button
                                  onClick={() => simulatePracticeSession(9)}
                                  style={{
                                    background: '#f5f5f7',
                                    border: '1px solid rgba(0,0,0,0.06)',
                                    borderRadius: '10px',
                                    padding: '8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    color: '#1d1d1f',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  className="hover-scale"
                                >
                                  🏆 9 Min.
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Fokus-Schild Status & Streaks Stack */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
                            {/* SPECTACULAR STANDALONE FOKUS-SCHILD WIDGET */}
                            <div style={{
                              background: hasPracticedToday 
                                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 253, 244, 0.9) 100%)' 
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                              backdropFilter: 'blur(20px)',
                              WebkitBackdropFilter: 'blur(20px)',
                              borderRadius: '24px',
                              padding: '36px 32px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textAlign: 'center',
                              boxShadow: hasPracticedToday 
                                ? '0 20px 48px -12px rgba(16, 185, 129, 0.15), 0 4px 12px -2px rgba(16, 185, 129, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.8)' 
                                : '0 10px 30px -10px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
                              position: 'relative',
                              overflow: 'hidden',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              width: '100%',
                              boxSizing: 'border-box'
                            }} className={`lock-hover ${hasPracticedToday ? 'glow-active-border' : 'glow-inactive-border'}`}>
                              
                              {/* Visual glowing backplates */}
                              {hasPracticedToday ? (
                                <div 
                                  className="pulse-glow-backdrop"
                                  style={{
                                    position: 'absolute',
                                    width: '280px',
                                    height: '280px',
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.05) 50%, transparent 70%)',
                                    top: '50%',
                                    left: '50%',
                                    zIndex: 0,
                                    pointerEvents: 'none'
                                  }} 
                                />
                              ) : (
                                <div 
                                  style={{
                                    position: 'absolute',
                                    width: '200px',
                                    height: '200px',
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(148, 163, 184, 0.08) 0%, transparent 70%)',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 0,
                                    pointerEvents: 'none'
                                  }} 
                                />
                              )}

                              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px', width: '100%' }}>
                                {/* Glowing Shield Representation */}
                                <div 
                                  className={`lock-icon-container ${hasPracticedToday ? 'float-shield-anim' : ''}`}
                                  style={{
                                    position: 'relative',
                                    width: '135px',
                                    height: '135px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                  }}
                                >
                                  <img 
                                    src="/fokus_schild_glowing.png" 
                                    alt="Fokus-Schutzschild" 
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'contain',
                                      mixBlendMode: 'multiply',
                                      filter: hasPracticedToday 
                                        ? 'drop-shadow(0 14px 28px rgba(16, 185, 129, 0.4)) drop-shadow(0 2px 6px rgba(16, 185, 129, 0.15))' 
                                        : 'grayscale(92%) opacity(0.32) contrast(90%)',
                                      transition: 'all 0.4s ease'
                                    }}
                                  />
                                  
                                  {hasPracticedToday ? (
                                    <>
                                      <span className="sparkle-star-1" style={{ position: 'absolute', top: '-6px', right: '-12px', fontSize: '1.6rem', filter: 'drop-shadow(0 2px 4px rgba(251,191,36,0.3))' }}>✨</span>
                                      <span className="sparkle-star-2" style={{ position: 'absolute', bottom: '-4px', left: '-14px', fontSize: '1.3rem', filter: 'drop-shadow(0 2px 4px rgba(251,191,36,0.3))' }}>⭐</span>
                                    </>
                                  ) : (
                                    <div style={{
                                      position: 'absolute',
                                      background: 'rgba(15, 23, 42, 0.75)',
                                      color: 'white',
                                      borderRadius: '50%',
                                      width: '38px',
                                      height: '38px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '1.05rem',
                                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                      backdropFilter: 'blur(4px)',
                                      border: '1.5px solid rgba(255, 255, 255, 0.2)'
                                    }}>
                                      🔒
                                    </div>
                                  )}
                                </div>

                                <div style={{ maxWidth: '440px' }}>
                                  <h4 style={{ 
                                    margin: 0, 
                                    fontWeight: 900, 
                                    fontSize: '1.28rem', 
                                    color: hasPracticedToday ? '#065f46' : '#1e293b',
                                    letterSpacing: '-0.02em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                  }}>
                                    {hasPracticedToday ? (
                                      <>
                                        <span style={{ animation: 'pulse 2s infinite' }}>🛡️</span> Fokus-Schild aktiv
                                      </>
                                    ) : (
                                      <>
                                        <span>🔒</span> Fokus-Schild inaktiv
                                      </>
                                    )}
                                  </h4>
                                  <p style={{ 
                                    margin: '8px 0 0 0', 
                                    fontSize: '0.84rem', 
                                    color: hasPracticedToday ? '#047857' : '#64748b', 
                                    fontWeight: 500, 
                                    lineHeight: 1.55 
                                  }}>
                                    {hasPracticedToday 
                                      ? 'Dein Schutzschild schützt deine Serie. Zeige diesen Erfolg jetzt deinen Eltern.' 
                                      : 'Lege eine 3-minütige Handy-Auszeit ein, um deinen Schutzschild für heute zu aktivieren.'}
                                  </p>
                                </div>

                                {hasPracticedToday ? (
                                  <button
                                    onClick={() => setShowPrideCard(true)}
                                    className="pulse-btn-anim"
                                    style={{
                                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                      color: 'white',
                                      border: 'none',
                                      padding: '13px 32px',
                                      borderRadius: '16px',
                                      fontWeight: 800,
                                      fontSize: '0.84rem',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      boxSizing: 'border-box'
                                    }}
                                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
                                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                  >
                                    <span style={{ fontSize: '1rem' }}>🛡️</span> Eltern zeigen
                                  </button>
                                ) : (
                                  <div style={{ 
                                    fontSize: '0.74rem', 
                                    fontWeight: 800, 
                                    color: '#475569', 
                                    background: 'rgba(241, 245, 249, 0.8)', 
                                    padding: '7px 16px', 
                                    borderRadius: '12px',
                                    border: '1.5px solid rgba(226, 232, 240, 0.6)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}>
                                    <span style={{ fontSize: '0.85rem' }}>⚡</span> Benötigt 3 Min. Fokus-Session
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Übe-Serie & Flammen Tracker */}
                            <div style={{
                              background: '#ffffff',
                              border: '1px solid rgba(0, 0, 0, 0.08)',
                              borderRadius: '24px',
                              padding: '24px 32px',
                              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.02)',
                              width: '100%',
                              boxSizing: 'border-box'
                            }} className="hover-scale">
                              {renderFlameTiersWidget()}
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    /* Timer running / Gyro orientation dashboard */
                    (() => {
                      const isIgnition = secondsElapsed < 180;
                      const displayMinutes = Math.floor(secondsElapsed / 60);
                      const displaySeconds = secondsElapsed % 60;
                      
                      // Progress SVG Ring properties
                      const radius = 85;
                      const strokeWidth = 12;
                      const circumference = 2 * Math.PI * radius;
                      
                      // If ignition: progress is secondsElapsed / 180.
                      // If flow: progress is (displaySeconds / 60) to animate every minute.
                      const progress = isIgnition ? (secondsElapsed / 180) : (displaySeconds / 60);
                      const strokeDashoffset = circumference - (circumference * progress);
                      
                      // Tone colors matching our conceptual design
                      const ringColor = isIgnition 
                        ? (isPhoneFlat ? '#f59e0b' : '#ef4444') 
                        : (isPhoneFlat ? '#10b981' : '#a855f7');
                        
                      const statusLabel = isIgnition
                        ? (isPhoneFlat ? 'Zündung aktiv' : '🚨 Erloschen')
                        : (isPhoneFlat ? 'Flow-Zone aktiv' : '⏸️ Flow pausiert');
                        
                      return (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'row', 
                          flexWrap: 'wrap', 
                          gap: '32px', 
                          justifyContent: 'center', 
                          alignItems: 'start', 
                          width: '100%', 
                          margin: '0 auto' 
                        }}>
                          {/* Left Column: Active Session Visuals */}
                          <div style={{ 
                            flex: '1 1 300px', 
                            maxWidth: '400px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '24px', 
                            width: '100%' 
                          }}>
                            {/* Circular animated SVG progress ring */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                                <svg width="200" height="200" viewBox="0 0 200 200">
                                  <circle cx="100" cy="100" r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
                                  <circle 
                                    cx="100" 
                                    cy="100" 
                                    r={radius} 
                                    fill="none" 
                                    stroke={ringColor} 
                                    strokeWidth={strokeWidth} 
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    transform="rotate(-90 100 100)"
                                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                                  />
                                </svg>
                                <div style={{
                                  position: 'absolute',
                                  inset: 0,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <span style={{ fontSize: '2.5rem', fontWeight: 950, color: '#1d1d1f', fontFamily: 'monospace', letterSpacing: '-0.04em' }}>
                                    {String(displayMinutes).padStart(2, '0')}:
                                    {String(displaySeconds).padStart(2, '0')}
                                  </span>
                                  <span style={{ 
                                    fontSize: '0.68rem', 
                                    fontWeight: 900, 
                                    color: ringColor, 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.08em', 
                                    marginTop: '4px' 
                                  }}>
                                    {statusLabel}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Gyro Sensor feedback */}
                            <div style={{
                              padding: '16px 20px',
                              borderRadius: '16px',
                              background: isIgnition 
                                ? (isPhoneFlat ? '#fffbeb' : '#fef2f2') 
                                : (isPhoneFlat ? '#ecfdf5' : '#faf5ff'),
                              border: isIgnition 
                                ? (isPhoneFlat ? '1.5px solid #fde68a' : '1.5px solid #fca5a5') 
                                : (isPhoneFlat ? '1.5px solid #a7f3d0' : '1.5px solid #e9d5ff'),
                              color: isIgnition 
                                ? (isPhoneFlat ? '#b45309' : '#991b1b') 
                                : (isPhoneFlat ? '#065f46' : '#6b21a8'),
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              textAlign: 'center',
                              lineHeight: 1.4
                            }}>
                              {isIgnition ? (
                                isPhoneFlat ? (
                                  <div>
                                    <strong>Fokus-Zündung aktiv! 🕯️</strong>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>Lass das Handy absolut flach liegen. Jede Bewegung wirft den Zünder zurück auf 0!</p>
                                  </div>
                                ) : (
                                  <div className="animate-pulse">
                                    <strong>🚨 Fokus-Zündung erloschen!</strong>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>Handy wurde angehoben. Der Timer startet bei Flachlage neu ab 0 Min.</p>
                                  </div>
                                )
                              ) : (
                                isPhoneFlat ? (
                                  <div>
                                    <strong>Tiefer Flow aktiv! 🚀</strong>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>Das Feuer brennt! Jede zusätzliche Sekunde wird als Zusatz-Übezeit registriert.</p>
                                  </div>
                                ) : (
                                  <div>
                                    <strong>⏸️ Flow pausiert</strong>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>Lege das Handy flach, um deinen Übe-Flow nahtlos fortzusetzen.</p>
                                  </div>
                                )
                              )}
                            </div>

                            {/* Display Down Fullscreen Blackout Overlay */}
                            {sessionActive && isPhoneFlat && (
                              <div 
                                style={{
                                  position: 'fixed',
                                  inset: 0,
                                  zIndex: 9999,
                                  background: '#000000',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                  userSelect: 'none'
                                }}
                              >
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isIgnition ? '#f59e0b' : '#10b981', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                                    {isIgnition ? 'Fokus-Zündung active...' : 'Flow-Zone active...'}
                                  </div>
                                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', marginTop: '12px', fontFamily: 'monospace' }}>
                                    {String(displayMinutes).padStart(2, '0')}:{String(displaySeconds).padStart(2, '0')}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px' }}>
                              <button
                                onClick={finishPracticeSession}
                                style={{
                                  flex: 1,
                                  background: isIgnition
                                    ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '14px',
                                  borderRadius: '14px',
                                  fontWeight: 900,
                                  cursor: isIgnition ? 'not-allowed' : 'pointer',
                                  fontSize: '0.85rem',
                                  boxShadow: isIgnition ? 'none' : '0 4px 12px rgba(16,185,129,0.15)',
                                  textTransform: 'uppercase',
                                  opacity: isIgnition ? 0.65 : 1
                                }}
                              >
                                {isIgnition ? '🔒 Zündung abwarten' : '🏁 Session Beenden'}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Möchtest du diese Session wirklich abbrechen? Der Fortschritt geht verloren.')) {
                                    setSessionActive(false);
                                  }
                                }}
                                style={{
                                  padding: '14px',
                                  borderRadius: '14px',
                                  border: '1.5px solid #fca5a5',
                                  background: '#fef2f2',
                                  color: '#ef4444',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  fontSize: '0.85rem'
                                }}
                              >
                                Abbrechen
                              </button>
                            </div>
                          </div>

                          {/* Right Column: Flame Widget (Desktop optimized side-by-side) */}
                          <div style={{ flex: '1 1 320px', maxWidth: '500px', width: '100%' }}>
                            {renderFlameTiersWidget()}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
              {/* TAB 2: LOGBUCH */}
              {practiceSubTab === 'logbuch' && !sessionActive && (() => {
                const totalFocusMin = focusLogs.reduce((acc, log) => acc + Math.min(3, log.duration_minutes || 0), 0);
                const totalFlowMin = focusLogs.reduce((acc, log) => acc + Math.max(0, (log.duration_minutes || 0) - 3), 0);
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* KPI Overview Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ 
                        background: '#e8f0fe', 
                        border: '1px solid #d2e3fc', 
                        borderRadius: '16px', 
                        padding: '16px', 
                        textAlign: 'left',
                        boxShadow: 'none',
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'default'
                      }} className="hover-scale">
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1a73e8', textTransform: 'uppercase', display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>Gesamt Fokus-Zündung</span>
                        <strong style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1967d2', letterSpacing: '-0.02em' }}>
                          {totalFocusMin} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1a73e8' }}>Min.</span>
                        </strong>
                      </div>
                      
                      <div style={{ 
                        background: '#e6f4ea', 
                        border: '1px solid #ceead6', 
                        borderRadius: '16px', 
                        padding: '16px', 
                        textAlign: 'left',
                        boxShadow: 'none',
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'default'
                      }} className="hover-scale">
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#137333', textTransform: 'uppercase', display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>Gesamt Zusatzzeit</span>
                        <strong style={{ fontSize: '1.4rem', fontWeight: 700, color: '#137333', letterSpacing: '-0.02em' }}>
                          +{totalFlowMin} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#137333' }}>Min.</span>
                        </strong>
                      </div>
                    </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                    {focusLogsLoading ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#86868b', fontSize: '0.8rem', fontWeight: 500 }}>Logbuch wird geladen...</div>
                    ) : focusLogs.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: '#86868b', fontSize: '0.8rem', fontStyle: 'italic', fontWeight: 500, lineHeight: 1.6 }}>
                        Noch keine Übungseinheiten erfasst.<br />Starte deine erste Session oben! 🚀
                      </div>
                    ) : (
                      focusLogs.map((log) => {
                        const dateObj = new Date(log.created_at);
                        const formattedDate = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        const formattedTime = dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

                        const totalMinutes = log.duration_minutes || 0;
                        const hasFlow = totalMinutes >= 3;
                        const flowMinutes = totalMinutes - 3;

                        return (
                          <div key={log.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#ffffff',
                            border: '1px solid rgba(0, 0, 0, 0.06)',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.01)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                          }} className="hover-scale">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '50%', 
                                background: '#f5f5f7', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: '#1d1d1f',
                                border: '1px solid rgba(0, 0, 0, 0.03)'
                              }}>
                                <Clock size={13} style={{ color: '#86868b' }} />
                              </div>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                 <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1d1d1f' }}>
                                   {formattedDate}
                                 </span>
                                 <span style={{ fontSize: '0.75rem', color: '#86868b', fontWeight: 500 }}>
                                   um {formattedTime} Uhr
                                 </span>
                               </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {/* 3 Min Fokus-Zündung tag */}
                              <div style={{ 
                                fontSize: '0.72rem', 
                                fontWeight: 700, 
                                color: '#b45309', 
                                background: '#fffbeb', 
                                padding: '4px 8px', 
                                borderRadius: '8px', 
                                border: '1px solid rgba(180, 83, 9, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <span>🔥</span> 3 Min Fokus
                              </div>

                              {/* Flow-Zone tag if any extra minutes */}
                              {hasFlow && flowMinutes > 0 && (
                                <div style={{ 
                                  fontSize: '0.72rem', 
                                  fontWeight: 700, 
                                  color: '#6b21a8', 
                                  background: '#faf5ff', 
                                  padding: '4px 8px', 
                                  borderRadius: '8px', 
                                  gap: '3px'
                                }}>
                                  <span>⚡</span> +{flowMinutes} Min Flow
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Hausaufgaben Logbuch Sidebar */}
          <div style={{
            flex: '0 0 350px',
            minWidth: '320px',
            maxWidth: '380px',
            background: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '24px',
            padding: '28px 24px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.01)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            alignSelf: 'stretch'
          }} className="animation-slide-up">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)', paddingBottom: '16px' }}>
              <div style={{ 
                background: 'rgba(6, 182, 212, 0.08)', 
                color: '#0891b2', 
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(6, 182, 212, 0.15)'
              }}>
                <Target size={18} />
              </div>
              <div>
                <h4 style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1f2937', margin: 0, letterSpacing: '-0.02em', fontFamily: "'Outfit', sans-serif" }}>Hausaufgaben</h4>
                <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '2px 0 0 0', fontWeight: 600 }}>Dein persönliches Logbuch</p>
              </div>
            </div>

            {/* Homework Entries */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, maxHeight: '680px', paddingRight: '4px' }}>
              {(() => {
                const currentWeek = getISOWeek();
                const homeworkLog = [...(progressItems || [])].filter(item => item.is_current_homework || item.homework_notes);
                
                if (homeworkLog.length === 0) {
                  return (
                    <div style={{ padding: '40px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem', fontStyle: 'italic', fontWeight: 500, lineHeight: 1.5 }}>
                      Keine Hausaufgaben im Logbuch eingetragen. Zeit für freies Üben! 🎸
                    </div>
                  );
                }

                // Pinned active homeworks first, then sorted by date descending
                const sortedHomeworkLog = homeworkLog.sort((a, b) => {
                  const isACurrent = a.is_current_homework && a.updated_at && getISOWeek(a.updated_at) === currentWeek;
                  const isBCurrent = b.is_current_homework && b.updated_at && getISOWeek(b.updated_at) === currentWeek;
                  if (isACurrent && !isBCurrent) return -1;
                  if (!isACurrent && isBCurrent) return 1;
                  const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                  const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                  return dateB - dateA;
                });

                return sortedHomeworkLog.map((item, idx) => {
                  const dateObj = item.updated_at ? new Date(item.updated_at) : null;
                  const formattedDate = dateObj 
                    ? dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : 'Unbekannt';

                  const isItemCurrentWeek = item.updated_at ? getISOWeek(item.updated_at) === currentWeek : false;
                  const isItemCurrentHomework = item.is_current_homework && isItemCurrentWeek;

                  return (
                    <div 
                      key={item.id || idx}
                      style={{
                        background: isItemCurrentHomework ? 'rgba(6, 182, 212, 0.02)' : '#f9fafb',
                        border: isItemCurrentHomework ? '1.5px solid rgba(6, 182, 212, 0.25)' : '1px solid rgba(0, 0, 0, 0.05)',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        boxShadow: isItemCurrentHomework ? '0 4px 15px rgba(6, 182, 212, 0.04)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                      className="hover-scale"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 700 }}>
                          📅 {formattedDate}
                        </span>
                        
                        {isItemCurrentHomework ? (
                          <span style={{
                            background: '#ecfeff',
                            color: '#0891b2',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '8px',
                            border: '1px solid rgba(6, 182, 212, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            Aktuell 🔥
                          </span>
                        ) : item.status === 'MASTERED' ? (
                          <span style={{
                            background: '#ecfdf5',
                            color: '#10b981',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '8px',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                          }}>
                            Gemeistert 🏆
                          </span>
                        ) : (
                          <span style={{
                            background: '#f3f4f6',
                            color: '#6b7280',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '8px',
                            border: '1px solid rgba(0, 0, 0, 0.05)'
                          }}>
                            Erledigt 📖
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h5 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1f2937', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                          📖 {item.topic_name}
                        </h5>
                        {item.homework_notes ? (
                          <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: 0, lineHeight: 1.45, fontWeight: 500 }}>
                            {item.homework_notes}
                          </p>
                        ) : (
                          <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0, fontStyle: 'italic', fontWeight: 500 }}>
                            Keine Übe-Details hinterlegt.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'songs' && (() => {
        const masteredSongs = progressItems.filter(item => item.status === 'MASTERED');
        
        const masteredPages: any[] = [];
        assignedLehrwerke.forEach(assigned => {
          const book = globalLehrwerke.find(g => g.id === assigned.lehrwerkId);
          if (book) {
            Object.entries(assigned.pageStates || {}).forEach(([pageNum, state]: any) => {
              if (state?.status === 'mastered') {
                masteredPages.push({
                  type: 'page',
                  title: `${book.title}`,
                  subtitle: `Seite ${pageNum}`,
                  desc: state.notes || 'Buchseite gemeistert!',
                  icon: book.emoji || '📚',
                  color: book.color || '#10b981'
                });
              }
            });
          }
        });

        const playlist = [
          ...masteredSongs.map(item => ({
            type: 'song',
            title: item.topic_name,
            subtitle: 'Song',
            desc: item.teacher_notes || 'Song gemeistert!',
            icon: '🎵',
            color: '#10b981'
          })),
          ...masteredPages
        ];

        const totalMastered = playlist.length;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <style>{`
              @keyframes eq-bounce {
                0% { height: 15%; }
                50% { height: 100%; }
                100% { height: 35%; }
              }
              .eq-bar-1 { animation: eq-bounce 0.8s ease-in-out infinite alternate; }
              .eq-bar-2 { animation: eq-bounce 1.2s ease-in-out infinite alternate; }
              .eq-bar-3 { animation: eq-bounce 1.0s ease-in-out infinite alternate; }
              
              .playlist-track:hover .playlist-play-btn {
                opacity: 1 !important;
                transform: scale(1.1);
              }
              .playlist-track:hover {
                background: rgba(255, 255, 255, 0.08) !important;
              }
            `}</style>
            {progressLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                Songs & Material werden geladen...
              </div>
            ) : (
              <div style={{
                background: 'rgba(255, 255, 255, 0.45)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '28px',
                padding: '28px',
                boxShadow: '0 30px 60px -15px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '18px' }}>
                  <div style={{ 
                    background: 'linear-gradient(135deg, #0b57d0 0%, #0071e3 100%)', 
                    color: 'white', 
                    padding: '10px', 
                    borderRadius: '16px',
                    boxShadow: '0 8px 20px -4px rgba(11, 87, 208, 0.3)'
                  }}>
                    <Music size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 950, fontSize: '1.25rem', color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Mediathek & Übungen
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: '#86868b', margin: '3px 0 0 0', fontWeight: 600 }}>Deine persönlichen Meilensteine, Hausaufgaben & Notizen</p>
                  </div>
                </div>

                {/* Real-time Search & Filter Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ position: 'relative' }}>
                    <Zap size={18} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#0b57d0' }} />
                    <input 
                      type="text" 
                      placeholder="Meilensteine oder Notizen durchsuchen..." 
                      value={studentSongSearch}
                      onChange={e => setStudentSongSearch(e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '16px 20px 16px 56px', 
                        borderRadius: '20px', 
                        border: '1px solid rgba(226, 232, 240, 0.8)', 
                        background: 'rgba(255, 255, 255, 0.75)', 
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        fontWeight: 600, 
                        fontSize: '0.95rem', 
                        outline: 'none', 
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)', 
                        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.01)' 
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.border = '1px solid #0b57d0';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(11, 87, 208, 0.1), 0 4px 20px -2px rgba(0,0,0,0.03)';
                        e.currentTarget.style.background = 'white';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.border = '1px solid rgba(226, 232, 240, 0.8)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.75)';
                      }}
                    />
                  </div>

                  {/* Unified Liquid Glass Segmented Switch */}
                  <div style={{
                    display: 'flex',
                    background: 'rgba(0, 0, 0, 0.04)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(0, 0, 0, 0.02)',
                    padding: '4px',
                    borderRadius: '20px',
                    width: 'fit-content',
                    gap: '4px',
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
                    flexWrap: 'wrap'
                  }}>
                    {[
                      { id: 'all', label: 'Alle' },
                      { id: 'homework', label: '🎯 Hausaufgaben' },
                      { id: 'in_progress', label: '🔥 In Arbeit' },
                      { id: 'theory', label: '📚 Theorie' },
                      { id: 'mastered', label: '👑 Meisterwerk' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStudentSongFilter(tab.id as any)}
                        style={{
                          padding: '10px 22px',
                          borderRadius: '16px',
                          border: 'none',
                          background: studentSongFilter === tab.id ? '#ffffff' : 'transparent',
                          color: studentSongFilter === tab.id ? '#0f172a' : '#64748b',
                          fontWeight: 900,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          boxShadow: studentSongFilter === tab.id 
                            ? '0 4px 14px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)' 
                            : 'none',
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                          transform: studentSongFilter === tab.id ? 'scale(1.02)' : 'none'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Three-Column Redesigned Layout */}
                <div style={{
                  display: 'flex',
                  gap: '28px',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'stretch',
                  marginTop: '12px'
                }}>
                  {/* Columns 1 & 2 Wrapper (Main dual-column grid) */}
                  <div style={{
                    flex: '1 1 650px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '24px'
                  }}>
                    {/* COLUMN 1: SONGS */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      padding: '20px',
                      borderRadius: '24px',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }}>
                      <h5 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🎵 Songs
                      </h5>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(() => {
                          const filteredProgressItems = progressItems.filter(item => {
                            const matchesSearch = item.topic_name.toLowerCase().includes(studentSongSearch.toLowerCase()) || 
                              (item.teacher_notes && item.teacher_notes.toLowerCase().includes(studentSongSearch.toLowerCase()));
                            
                            let matchesFilter = true;
                            if (studentSongFilter === 'homework') matchesFilter = !!item.is_current_homework && (item.updated_at ? getISOWeek(item.updated_at) === getISOWeek() : false);
                            else if (studentSongFilter === 'in_progress') matchesFilter = item.status === 'IN_PROGRESS';
                            else if (studentSongFilter === 'theory') matchesFilter = item.status === 'THEORY_DONE';
                            else if (studentSongFilter === 'mastered') matchesFilter = item.status === 'MASTERED';
                            
                            return matchesSearch && matchesFilter;
                          });

                          if (filteredProgressItems.length === 0) {
                            return (
                              <div style={{ padding: '36px 16px', textAlign: 'center', background: 'rgba(255,255,255,0.4)', borderRadius: '20px', border: '1px dashed rgba(0,0,0,0.06)' }}>
                                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }}>🎵</span>
                                <div style={{ color: '#86868b', fontSize: '0.8rem', fontWeight: 600 }}>Keine passenden Songs gefunden.</div>
                              </div>
                            );
                          }

                          return filteredProgressItems.map(item => {
                            let accentColor = '#64748b';
                            let accentGradient = 'linear-gradient(180deg, #94a3b8 0%, #64748b 100%)';
                            let glowColor = 'rgba(100, 116, 139, 0.15)';
                            let badgeBg = '#f1f5f9';
                            let badgeText = 'In Arbeit';
                            let badgeIcon = <Activity size={12} />;

                            if (item.is_current_homework) {
                              accentColor = '#06b6d4';
                              accentGradient = 'linear-gradient(180deg, #22d3ee 0%, #0891b2 100%)';
                              glowColor = 'rgba(6, 182, 212, 0.25)';
                              badgeBg = '#ecfeff';
                              badgeText = 'Hausaufgabe';
                              badgeIcon = <Target size={12} />;
                            } else if (item.status === 'THEORY_DONE') {
                              accentColor = '#a855f7';
                              accentGradient = 'linear-gradient(180deg, #c084fc 0%, #7e22ce 100%)';
                              glowColor = 'rgba(168, 85, 247, 0.25)';
                              badgeBg = '#faf5ff';
                              badgeText = 'Theorie';
                              badgeIcon = <BookOpen size={12} />;
                            } else if (item.status === 'MASTERED') {
                              accentColor = '#10b981';
                              accentGradient = 'linear-gradient(180deg, #34d399 0%, #047857 100%)';
                              glowColor = 'rgba(16, 185, 129, 0.25)';
                              badgeBg = '#ecfdf5';
                              badgeText = 'Meisterwerk!';
                              badgeIcon = <Check size={12} />;
                            } else if (item.status === 'IN_PROGRESS') {
                              accentColor = '#f59e0b';
                              accentGradient = 'linear-gradient(180deg, #fbbf24 0%, #b45309 100%)';
                              glowColor = 'rgba(245, 158, 11, 0.2)';
                              badgeBg = '#fffbeb';
                              badgeIcon = <Zap size={12} />;
                            }

                            return (
                              <div 
                                key={item.id} 
                                style={{
                                  background: 'rgba(255, 255, 255, 0.85)',
                                  border: item.is_current_homework ? '1.5px solid rgba(6, 182, 212, 0.4)' : '1px solid rgba(0,0,0,0.04)',
                                  borderRadius: '20px',
                                  padding: '16px 20px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '10px',
                                  boxShadow: item.is_current_homework 
                                    ? `0 8px 20px -6px ${glowColor}` 
                                    : '0 4px 12px rgba(0,0,0,0.01)',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  transition: 'all 0.2s ease-in-out'
                                }}
                              >
                                {/* Left Accent Bar */}
                                <div style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: '5px',
                                  background: accentGradient
                                }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1d1d1f', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                                    {item.topic_name}
                                  </span>
                                  <span style={{
                                    background: badgeBg,
                                    color: accentColor,
                                    padding: '4px 8px',
                                    borderRadius: '100px',
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    {badgeIcon}
                                    {badgeText}
                                  </span>
                                </div>

                                {item.teacher_notes ? (
                                  <div style={{ 
                                    background: 'rgba(0, 0, 0, 0.02)', 
                                    borderLeft: `2.5px solid ${accentColor}aa`,
                                    padding: '8px 12px', 
                                    borderRadius: '0 12px 12px 12px', 
                                    fontSize: '0.78rem', 
                                    color: '#2c2c2e', 
                                    fontWeight: 600, 
                                    fontStyle: 'italic',
                                    lineHeight: 1.35
                                  }}>
                                    "{item.teacher_notes}"
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '0.72rem', color: '#86868b', fontStyle: 'italic', fontWeight: 550 }}>
                                    Noch kein Feedback hinterlegt.
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* COLUMN 2: LEHRWERKE */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      padding: '20px',
                      borderRadius: '24px',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }}>
                      <h5 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📚 Lehrwerke
                      </h5>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {assignedLehrwerke.map(assigned => {
                          const book = globalLehrwerke.find(g => g.id === assigned.lehrwerkId) || {
                            title: 'Lehrbuch',
                            emoji: '📚',
                            color: '#0b57d0',
                            totalPages: 50
                          };
                          const isExpanded = activeLehrwerkId === assigned.lehrwerkId;
                          const pages = Array.from({ length: book.totalPages || 50 }, (_, i) => i + 1);

                          return (
                            <div key={assigned.lehrwerkId} style={{ border: '1px solid rgba(0,0,0,0.05)', borderRadius: '18px', overflow: 'hidden', background: '#ffffff' }}>
                              {/* Header of textbook */}
                              <div 
                                onClick={() => {
                                  setActiveLehrwerkId(isExpanded ? null : assigned.lehrwerkId);
                                  setActivePageNumber(null);
                                }}
                                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: isExpanded ? `${book.color}05` : '#fafafa', cursor: 'pointer', transition: 'all 0.2s' }}
                              >
                                <div style={{ width: '30px', height: '40px', background: book.color, borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 900, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                  <span>{book.emoji || '📚'}</span>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <h6 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{book.title}</h6>
                                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{book.totalPages || 50} Seiten</p>
                                </div>
                              </div>

                              {/* Learning path grid */}
                              {isExpanded && (
                                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {pages.map(num => {
                                      const pageState = assigned.pageStates[num] || { status: 'locked' };
                                      const isPurple = book.globalPageStates?.[num] === 'purple';
                                      const status = isPurple ? 'purple' : (pageState.status || 'locked');
                                      
                                      let borderColor = '#ef4444'; // locked = rot
                                      let bg = '#fef2f2';
                                      let textColor = '#991b1b';
                                      
                                      if (status === 'homework') {
                                        borderColor = '#f59e0b';
                                        bg = '#fffbeb';
                                        textColor = '#92400e';
                                      } else if (status === 'mastered') {
                                        borderColor = '#10b981';
                                        bg = '#f0fdf4';
                                        textColor = '#166534';
                                      } else if (status === 'purple') {
                                        borderColor = '#af52de';
                                        bg = '#f5f3ff';
                                        textColor = '#6d28d9';
                                      }

                                      const isSelected = activePageNumber === num;

                                      return (
                                        <button
                                          key={num}
                                          onClick={() => {
                                            setActivePageNumber(isSelected ? null : num);
                                          }}
                                          style={{
                                            width: '30px',
                                            height: '30px',
                                            borderRadius: '50%',
                                            border: `1.5px solid ${borderColor}`,
                                            background: isSelected ? borderColor : bg,
                                            color: isSelected ? 'white' : textColor,
                                            fontWeight: 800,
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.15s'
                                          }}
                                          title={pageState.notes ? `Notiz: ${pageState.notes}` : `Seite ${num}`}
                                        >
                                          {num}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Clicked page notes overlay */}
                                  {activePageNumber !== null && (() => {
                                    const pageState = assigned.pageStates[activePageNumber] || { status: 'locked' };
                                    const isPurple = book.globalPageStates?.[activePageNumber] === 'purple';
                                    const status = isPurple ? 'purple' : (pageState.status || 'locked');

                                    return (
                                      <div style={{ 
                                        background: '#f8fafc', 
                                        padding: '12px', 
                                        borderRadius: '12px', 
                                        border: '1px solid rgba(0, 0, 0, 0.06)', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '8px'
                                      }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>
                                            Seite {activePageNumber} Info:
                                          </span>
                                          <button 
                                            onClick={() => setActivePageNumber(null)}
                                            style={{ background: 'none', border: 'none', color: '#0b57d0', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}
                                          >
                                            Schließen
                                          </button>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: status === 'mastered' ? '#10b981' : (status === 'homework' ? '#f59e0b' : (status === 'purple' ? '#af52de' : '#ef4444'))
                                          }} />
                                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'capitalize' }}>
                                            Status: {status === 'mastered' ? 'Gemeistert' : (status === 'homework' ? 'Hausaufgabe' : (status === 'purple' ? 'Inhalt / Info' : 'Offen'))}
                                          </span>
                                        </div>

                                        <div style={{ fontSize: '0.75rem', color: '#334155', fontStyle: pageState.notes ? 'normal' : 'italic', fontWeight: 550, background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)' }}>
                                          {pageState.notes ? `Coach Feedback: "${pageState.notes}"` : 'Keine Feedbacknotiz für diese Seite vorhanden.'}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {assignedLehrwerke.length === 0 && (
                          <div style={{ background: 'rgba(255,255,255,0.4)', padding: '24px', borderRadius: '20px', border: '1px dashed rgba(0,0,0,0.08)', color: '#86868b', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600 }}>
                            Noch keine Lehrwerke zugewiesen.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SIDEBAR: MEISTERWERKE PLAYLIST */}
                  <aside style={{
                    width: '320px',
                    flexShrink: 0,
                    background: 'linear-gradient(135deg, #1e1e24 0%, #121216 100%)',
                    borderRadius: '24px',
                    padding: '24px',
                    color: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    height: 'fit-content',
                    minHeight: '450px'
                  }}>
                    {/* Playlist Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#10b981', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                          Playlist
                        </span>
                        <h4 style={{ margin: '2px 0 0 0', fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                          Meisterwerke 👑
                        </h4>
                      </div>

                      {/* Equalizer micro-animation */}
                      {totalMastered > 0 && (
                        <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '14px' }}>
                          <div className="eq-bar-1" style={{ width: '3px', height: '100%', background: '#10b981', borderRadius: '100px' }} />
                          <div className="eq-bar-2" style={{ width: '3px', height: '60%', background: '#10b981', borderRadius: '100px' }} />
                          <div className="eq-bar-3" style={{ width: '3px', height: '80%', background: '#10b981', borderRadius: '100px' }} />
                        </div>
                      )}
                    </div>

                    {/* Tracks Playlist list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                      {playlist.length === 0 ? (
                        <div style={{ padding: '40px 16px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.06)' }}>
                          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '8px' }}>💿</span>
                          <p style={{ color: '#a1a1aa', fontSize: '0.75rem', fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
                            Noch keine Meisterwerke vorhanden.<br/>
                            Schließe Songs oder Seiten ab, um deine Playlist zu befüllen!
                          </p>
                        </div>
                      ) : (
                        playlist.map((track, index) => {
                          const trackNum = String(index + 1).padStart(2, '0');
                          return (
                            <div 
                              key={index}
                              className="playlist-track"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                borderRadius: '12px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                transition: 'all 0.2s ease-in-out',
                                cursor: 'default',
                                border: '1px solid rgba(255, 255, 255, 0.02)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                {/* Track number */}
                                <div style={{ position: 'relative', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <span className="playlist-track-num" style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 700 }}>
                                    {trackNum}
                                  </span>
                                </div>

                                {/* Album cover / Emoji icon */}
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '6px',
                                  background: track.type === 'song' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : track.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '14px',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                  flexShrink: 0
                                }}>
                                  <span>{track.icon}</span>
                                </div>

                                {/* Titles */}
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={track.title}>
                                    {track.title}
                                  </span>
                                  <span style={{ fontSize: '0.68rem', color: '#a1a1aa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ color: '#10b981', fontWeight: 800 }}>{track.subtitle}</span> • {track.desc}
                                  </span>
                                </div>
                              </div>

                              {/* Small decorative play arrow */}
                              <div className="playlist-play-btn" style={{
                                opacity: 0.2,
                                transition: 'all 0.2s',
                                color: '#10b981',
                                fontSize: '0.75rem',
                                marginLeft: '6px'
                              }}>
                                ▶
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </aside>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {activeTab === 'campus_cup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <style>{`
            @keyframes pulse-green {
              0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); border-color: rgba(34, 197, 94, 0.8); }
              70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); border-color: rgba(34, 197, 94, 0.8); }
              100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); border-color: rgba(34, 197, 94, 0.8); }
            }
            .pulsing-own-school {
              animation: pulse-green 2s infinite;
              background-color: #f0fdf4 !important;
              border: 2px solid #22c55e !important;
            }
          `}</style>

          {rankingLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
              Campus-Cup wird geladen...
            </div>
          ) : rankingError ? (
            <div style={{
              background: '#fef2f2',
              border: '1.5px solid #fca5a5',
              padding: '24px',
              borderRadius: '24px',
              textAlign: 'center',
              color: '#991b1b',
              fontWeight: 700
            }}>
              {rankingError}
            </div>
          ) : (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }} className="animation-slide-up">
              
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div style={{ background: '#fef3c7', color: '#d97706', padding: '8px', borderRadius: '12px' }}>
                  <Trophy size={18} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', margin: 0 }}>[ CAMPUS-CUP ] Leaderboard</h4>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 600 }}>Globales Ranking aller Musikschulen (RFI Index)</p>
                </div>
              </div>

              {/* Leaderboard Table List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                
                {/* Render Top 3 */}
                {rankingData.slice(0, 3).map((item) => {
                  const medal = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`;
                  return (
                    <div
                      key={item.name}
                      className={item.isOwnSchool ? 'pulsing-own-school' : ''}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: item.isOwnSchool ? '#f0fdf4' : '#f8fafc',
                        border: item.isOwnSchool ? '2px solid #22c55e' : '1px solid #e2e8f0',
                        padding: '14px 18px',
                        borderRadius: '16px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 900, fontSize: '1.2rem', color: '#64748b', width: '32px', textAlign: 'center' }}>{medal}</span>
                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>
                          {item.name} {item.isOwnSchool && <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '100px', marginLeft: '6px', fontWeight: 900 }}>EIGENE SCHULE</span>}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>{item.rfi}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Min/Schüler</span>
                      </div>
                    </div>
                  );
                })}

                {/* Sandwich Window rendering */}
                {(() => {
                  const ownIndex = rankingData.findIndex(item => item.isOwnSchool);
                  if (ownIndex === -1 || ownIndex < 3) return null;

                  const predecessor = rankingData[ownIndex - 1];
                  const ownSchool = rankingData[ownIndex];
                  const successor = rankingData[ownIndex + 1];
                  const diff = predecessor ? (predecessor.rfi - ownSchool.rfi).toFixed(1) : '0.0';

                  return (
                    <>
                      {/* Divider */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        fontWeight: 900,
                        fontSize: '1.1rem',
                        letterSpacing: '0.15em',
                        padding: '4px 0'
                      }}>
                        •••
                      </div>

                      {/* Predecessor */}
                      {predecessor && (
                        <div
                          key={predecessor.name}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            padding: '14px 18px',
                            borderRadius: '16px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#64748b', width: '32px', textAlign: 'center' }}>#{predecessor.rank}</span>
                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>{predecessor.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>{predecessor.rfi}</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Min/Schüler</span>
                          </div>
                        </div>
                      )}

                      {/* Own School (Pulsing Green) */}
                      <div
                        key={ownSchool.name}
                        className="pulsing-own-school"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '14px 18px',
                          borderRadius: '16px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#15803d', width: '32px', textAlign: 'center' }}>#{ownSchool.rank}</span>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#166534' }}>
                            {ownSchool.name} <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '100px', marginLeft: '6px', fontWeight: 900 }}>EIGENE SCHULE</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#15803d' }}>{ownSchool.rfi}</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', opacity: 0.7, textTransform: 'uppercase' }}>Min/Schüler</span>
                        </div>
                      </div>

                      {/* Successor */}
                      {successor && (
                        <div
                          key={successor.name}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            padding: '14px 18px',
                            borderRadius: '16px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#64748b', width: '32px', textAlign: 'center' }}>#{successor.rank}</span>
                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>{successor.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>{successor.rfi}</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Min/Schüler</span>
                          </div>
                        </div>
                      )}

                      {/* Live Difference Calculator */}
                      {predecessor && (
                        <div style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          padding: '12px 16px',
                          borderRadius: '16px',
                          color: '#1e40af',
                          fontSize: '0.78rem',
                          fontWeight: 750,
                          textAlign: 'center',
                          marginTop: '4px'
                        }}>
                          🚀 Noch <strong>+{diff} Minuten</strong> im Schnitt pro Schüler bis Platz {predecessor.rank}!
                        </div>
                      )}
                    </>
                  );
                })()}

              </div>

                <div style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  padding: '14px 18px',
                  borderRadius: '20px',
                  color: '#15803d',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.05)',
                  marginTop: '10px'
                }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>✓</span>
                  <span>Du hast diesen Monat bereits <strong>{monthlyFocusMinutes}</strong> Minuten zum Erfolg deiner Schule beigetragen! Weiter so!</span>
                </div>

            </div>
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
          {(() => {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            let startYear = currentYear;
            let endYear = currentYear + 1;
            if (currentMonth < 7) {
              startYear = currentYear - 1;
              endYear = currentYear;
            }
            const schoolYearText = `Schuljahr ${startYear}/${endYear}`;

            return (
              <div style={{
                background: 'rgba(255, 255, 255, 0.65)',
                backdropFilter: 'blur(25px) saturate(190%)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                position: 'relative'
              }} className="animation-slide-up">
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '16px' }}>
                  <div style={{ background: 'rgba(0, 113, 227, 0.1)', color: '#0071e3', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '1rem', color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>{schoolYearText}</h4>
                    <p style={{ fontSize: '0.72rem', color: '#86868b', margin: '2px 0 0 0', fontWeight: 500, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>Deine geplanten Unterrichtsstunden & Konzerte des laufenden Schuljahres</p>
                  </div>
                </div>

                {/* Filter Toggle Switch */}
                <div className="app-segmented-switch" style={{ margin: '0 0 12px 0' }}>
                  <button
                    onClick={() => setAppointmentFilter('upcoming')}
                    className={`app-segmented-switch-btn ${appointmentFilter === 'upcoming' ? 'active' : ''}`}
                    style={{ fontSize: '0.78rem', padding: '6px 16px' }}
                  >
                    Kommende
                  </button>
                  <button
                    onClick={() => setAppointmentFilter('past')}
                    className={`app-segmented-switch-btn ${appointmentFilter === 'past' ? 'active' : ''}`}
                    style={{ fontSize: '0.78rem', padding: '6px 16px' }}
                  >
                    Vergangene
                  </button>
                  <button
                    onClick={() => setAppointmentFilter('all')}
                    className={`app-segmented-switch-btn ${appointmentFilter === 'all' ? 'active' : ''}`}
                    style={{ fontSize: '0.78rem', padding: '6px 16px' }}
                  >
                    Alle
                  </button>
                </div>

                {/* List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', maxWidth: '100%', margin: '0 auto', width: '100%' }}>
                  {loadingSchoolYearSchedule ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#86868b', fontWeight: 500, fontSize: '0.8rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
                      Termine werden geladen...
                    </div>
                  ) : schoolYearOccurrences && schoolYearOccurrences.length > 0 ? (
                (() => {
                  const filteredOccurrences = schoolYearOccurrences.filter(occ => {
                    const isPast = (() => {
                      const todayStr = toLocalYYYYMMDD(new Date());
                      if (occ.date < todayStr) return true;
                      if (occ.date > todayStr) return false;
                      const nowTimeStr = new Date().toTimeString().substring(0, 8);
                      const startTime = occ.start_time || '00:00:00';
                      return startTime < nowTimeStr;
                    })();

                    if (appointmentFilter === 'upcoming') return !isPast;
                    if (appointmentFilter === 'past') return isPast;
                    return true;
                  });

                  if (filteredOccurrences.length === 0) {
                    return (
                      <div style={{ 
                        gridColumn: '1 / -1',
                        background: '#f8fafc', 
                        border: '1.5px dashed #e2e8f0', 
                        borderRadius: '16px', 
                        padding: '40px 24px', 
                        textAlign: 'center', 
                        color: '#64748b', 
                        fontWeight: 700,
                        fontSize: '0.9rem'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📅</div>
                        {appointmentFilter === 'upcoming' 
                          ? 'Keine kommenden Termine eingetragen.' 
                          : appointmentFilter === 'past' 
                            ? 'Keine vergangenen Termine eingetragen.' 
                            : 'Keine Termine eingetragen.'}
                      </div>
                    );
                  }

                  const groups: Record<string, any[]> = {};
                  filteredOccurrences.forEach(occ => {
                    const monthKey = occ.date.substring(0, 7);
                    if (!groups[monthKey]) {
                      groups[monthKey] = [];
                    }
                    groups[monthKey].push(occ);
                  });

                  const sortedMonthKeys = Object.keys(groups).sort();

                  return sortedMonthKeys.map(monthKey => {
                    const monthDate = new Date(monthKey + '-02');
                    const monthName = monthDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

                    return (
                      <div key={monthKey} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h3 style={{ 
                          fontSize: '0.8rem', 
                          fontWeight: 800, 
                          color: '#1d1d1f', 
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          margin: '20px 0 6px 0', 
                          borderBottom: '1px solid rgba(0, 0, 0, 0.08)', 
                          paddingBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0071e3', display: 'inline-block' }} />
                          {monthName}
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {groups[monthKey].map(occ => {
                            const d = new Date(occ.date);
                            const isCanceled = occ.status === 'canceled_by_student' || occ.status === 'teacher_sick' || occ.status === 'cancelled';
                            const isPast = (() => {
                              const todayStr = toLocalYYYYMMDD(new Date());
                              if (occ.date < todayStr) return true;
                              if (occ.date > todayStr) return false;
                              const nowTimeStr = new Date().toTimeString().substring(0, 8);
                              const startTime = occ.start_time || '00:00:00';
                              return startTime < nowTimeStr;
                            })();
                            
                            let statusBadgeText = 'Regulär';
                            let statusBadgeColor = '#22c55e';
                            let statusBadgeBg = '#dcfce7';
                            
                            if (occ.status === 'canceled_by_student' || occ.status === 'cancelled' || occ.status === 'teacher_sick') {
                              statusBadgeText = 'Abgesagt';
                              statusBadgeColor = '#ef4444';
                              statusBadgeBg = '#fee2e2';
                            } else if (occ.status === 'pending_reschedule' || occ.status === 'rescheduled_confirmed') {
                              statusBadgeText = 'Verschoben';
                              statusBadgeColor = '#f59e0b';
                              statusBadgeBg = '#fef3c7';
                            }

                             return (
                              <div 
                                key={occ.id} 
                                style={{ 
                                  display: 'flex', 
                                  gap: '12px', 
                                  alignItems: 'center', 
                                  padding: '10px 14px', 
                                  borderRadius: '12px', 
                                  border: '1px solid #e2e8f0', 
                                  background: '#f8fafc',
                                  opacity: isPast ? 0.45 : isCanceled ? 0.6 : 1,
                                  transition: 'transform 0.2s',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
                                }}
                                className="hover-scale-subtle"
                              >
                                <div style={{ 
                                  width: '46px', 
                                  borderRadius: '10px', 
                                  overflow: 'hidden', 
                                  border: '1.5px solid #e2e8f0', 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  textAlign: 'center',
                                  flexShrink: 0
                                }}>
                                  <div style={{ background: isPast || isCanceled ? '#94a3b8' : '#ef4444', color: 'white', fontSize: '0.55rem', fontWeight: 900, padding: '2px 0', textTransform: 'uppercase' }}>
                                    {d.toLocaleDateString('de-DE', {month: 'short'})}
                                  </div>
                                  <div style={{ background: 'white', color: '#1e293b', fontSize: '1.1rem', fontWeight: 900, padding: '3px 0', lineHeight: 1.1 }}>
                                    {d.toLocaleDateString('de-DE', {day: '2-digit'})}
                                  </div>
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                                    {!occ.is_virtual && (
                                      <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>
                                        • Spezifisch
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                    <span>⏱️ {occ.start_time?.substring(0,5)} Uhr</span>
                                    <span>• {occ.duration || 45} Min</span>
                                    {occ.schedule?.room && (
                                      <span style={{ color: '#0b57d0' }}>• Raum: {occ.schedule.room}</span>
                                    )}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                  <div style={{ 
                                    background: statusBadgeBg, 
                                    color: statusBadgeColor, 
                                    fontSize: '0.62rem', 
                                    fontWeight: 900, 
                                    padding: '4px 8px', 
                                    borderRadius: '100px', 
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.02em'
                                  }}>
                                    {statusBadgeText}
                                  </div>
                                  {!isCanceled && !isPast && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelOccurrence(occ);
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: '1px solid #fee2e2',
                                        color: '#ef4444',
                                        fontSize: '0.62rem',
                                        fontWeight: 800,
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                      }}
                                      onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                                      onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                      Absagen
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div style={{ 
                  background: '#f8fafc', 
                  border: '1.5px dashed #e2e8f0', 
                  borderRadius: '16px', 
                  padding: '40px 24px', 
                  textAlign: 'center', 
                  color: '#64748b', 
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📅</div>
                  Keine Termine für das laufende Schuljahr eingetragen.
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  )}

      {activeTab === 'briefing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* CRISIS ALERT BANNERS */}
          {crisisAlerts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {crisisAlerts.map(alert => {
                const teacherName = alert.teacher ? `${alert.teacher.first_name} ${alert.teacher.last_name}` : 'Deine Lehrkraft';
                const slotDate = new Date(alert.slot_start_datetime);
                const formattedDate = slotDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
                const formattedTime = slotDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={alert.id} style={{
                    background: 'rgba(239, 68, 68, 0.04)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderLeft: '4px solid #ef4444',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.04)',
                    transition: 'all 0.3s ease'
                  }} className="hover-scale">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ background: '#ef4444', color: '#ffffff', borderRadius: '12px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AlertTriangle size={20} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔴 Wichtige Mitteilung</span>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e293b', fontWeight: 650, lineHeight: 1.3 }}>
                          Dein Unterricht bei <strong style={{ color: '#0b57d0' }}>{teacherName}</strong> am {formattedDate} um {formattedTime} Uhr fällt krankheitsbedingt aus.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConfirmCrisis(alert.id)}
                      style={{
                        background: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        fontWeight: 800,
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      className="hover-scale"
                    >
                      <Check size={14} strokeWidth={3} />
                      Gelesen & Bestätigen
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* TOP 4 KPIs ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
            
            {/* KPI 1: XP */}
            <div style={{ 
              background: 'linear-gradient(135deg, #0b57d0 0%, #3b82f6 100%)', 
              borderRadius: '16px', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px 16px', 
              position: 'relative', 
              overflow: 'hidden', 
              boxShadow: '0 4px 15px rgba(11, 87, 208, 0.1)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.18)', borderRadius: '10px', width: '32px', height: '32px', flexShrink: 0 }}>
                <Star size={16} fill="currentColor" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Urbanist', sans-serif" }}>{currentXp || 0} XP</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 750, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>XP gesammelt</span>
              </div>
            </div>

            {/* KPI 2: Songs */}
            <div style={{ 
              background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', 
              borderRadius: '16px', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px 16px', 
              position: 'relative', 
              overflow: 'hidden', 
              boxShadow: '0 4px 15px rgba(22, 163, 74, 0.1)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.18)', borderRadius: '10px', width: '32px', height: '32px', flexShrink: 0 }}>
                <Award size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Urbanist', sans-serif" }}>{wrappedData?.monthlyFlashback?.masteredSongsCount || 0} / 3</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 750, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>Songs verifiziert</span>
              </div>
            </div>

            {/* KPI 3: Fokus */}
            <div style={{ 
              background: 'linear-gradient(135deg, #eab308 0%, #facc15 100%)', 
              borderRadius: '16px', 
              color: '#1f2937', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px 16px', 
              position: 'relative', 
              overflow: 'hidden', 
              boxShadow: '0 4px 15px rgba(234, 179, 8, 0.1)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.06)', borderRadius: '10px', width: '32px', height: '32px', flexShrink: 0 }}>
                <Clock size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Urbanist', sans-serif" }}>{wrappedData?.monthlyFlashback?.focusMinutes || 0} Min</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 750, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>Fokus-Übezeit</span>
              </div>
            </div>

            {/* KPI 4: Streak */}
            <div style={{ 
              background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', 
              borderRadius: '16px', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px 16px', 
              position: 'relative', 
              overflow: 'hidden', 
              boxShadow: '0 4px 15px rgba(234, 88, 12, 0.1)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.18)', borderRadius: '10px', width: '32px', height: '32px', flexShrink: 0 }}>
                <Flame size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Urbanist', sans-serif" }}>{avatar?.streak_flame || 0} Tage</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 750, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>Serie am Laufen</span>
              </div>
            </div>

          </div>

          {/* MAIN 2-COLUMN LAYOUT */}
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '24px', alignItems: 'start', width: '100%' }}>
            
            {/* LEFT COLUMN */}
            <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '24px', minWidth: '280px' }}>
              
              {/* Welcome Block */}
              <div style={{ background: '#ffffff', borderRadius: '24px', padding: '18px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 10px 0', color: '#1e293b', fontFamily: "'Urbanist', sans-serif" }}>
                  Hallo. <span style={{ color: '#0b57d0' }}>{studentUser?.first_name || 'Schüler'} 👋</span>
                </h2>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, margin: 0, flex: 1, fontWeight: 500 }}>
                    Ein neuer Moment für Musik. Nimm dir heute ein paar Minuten für deine Übungsziele und sichere dir deine tägliche Serie!
                  </p>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Music size={30} color="#0b57d0" strokeWidth={1.5} />
                  </div>
                </div>
                
                {briefingData?.todayLesson || scheduleOccurrences?.length > 0 ? (() => {
                  const nextOcc = scheduleOccurrences[0];
                  const hasToday = !!briefingData?.todayLesson;
                  
                  const teacherId = hasToday ? briefingData.todayLesson.teacher_id : nextOcc?.teacher_id;
                  const teacherName = hasToday ? briefingData.todayLesson.teacher : (nextOcc?.teacher ? `Herr/Frau ${nextOcc.teacher.last_name}` : 'Lehrkraft');
                  const timeLabel = hasToday ? briefingData.todayLesson.time : nextOcc?.start_time?.substring(0, 5);
                  
                  const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                  const dayLabel = hasToday ? 'Heute' : (nextOcc ? DAYS_DE[new Date(nextOcc.date).getDay()] : 'Termin');
                  const label = `${dayLabel} ${timeLabel} Uhr`;

                  return (
                    <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f5f3ff', color: '#7c3aed', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
                        <Calendar size={13} />
                        <span>Nächster Unterricht: {hasToday ? `Heute, ${briefingData.todayLesson.time} Uhr` : (() => {
                          if(!nextOcc) return 'Demnächst';
                          const d = new Date(nextOcc.date);
                          return `${d.toLocaleDateString('de-DE', {weekday: 'long', day: '2-digit', month: '2-digit'})} - ${nextOcc.start_time?.substring(0,5)} Uhr`;
                        })()}</span>
                      </div>

                      {teacherId && (
                        <button 
                          onClick={() => {
                            setAppointmentChatData({
                              teacherId,
                              date: hasToday ? new Date().toISOString().split('T')[0] : nextOcc.date,
                              start_time: timeLabel,
                              label
                            });
                            setShowAppointmentChat(true);
                          }}
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            background: '#dbeafe', 
                            color: '#1e40af', 
                            padding: '6px 12px', 
                            borderRadius: '10px', 
                            fontSize: '0.75rem', 
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={e => e.currentTarget.style.background = '#bfdbfe'}
                          onMouseOut={e => e.currentTarget.style.background = '#dbeafe'}
                        >
                          <MessageSquare size={13} />
                          <span>Absprache (Shoutbox)</span>
                        </button>
                      )}
                    </div>
                  );
                })() : (
                  <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f5f3ff', color: '#7c3aed', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
                    <Calendar size={13} />
                    <span>Nächster Unterricht: Demnächst</span>
                  </div>
                )}
              </div>

              {/* Hausaufgaben & Übesoll Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                {/* Hausaufgaben */}
                <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderLeft: '6px solid #22c55e' }}>
                  {(() => {
                    const currentWeek = getISOWeek();
                    
                    // 1. Get active homework items (filter out default title placeholder "Hausaufgabe KW ")
                    const activeHWs = (progressItems || []).filter(item => item.is_current_homework && !item.topic_name.startsWith('Hausaufgabe KW '));
                    
                    // 2. Get active theories
                    const activeTheories = (progressItems || []).filter(item => 
                      item.status === 'THEORY_DONE' && 
                      item.updated_at && 
                      getISOWeek(item.updated_at) === currentWeek &&
                      !item.topic_name.startsWith('Hausaufgabe KW ')
                    );
                    
                    // 3. Get the homework notes (shared across items) exactly once
                    const latestNotesItem = (progressItems || []).find(item => 
                      item.homework_notes && item.homework_notes.trim().length > 0
                    );
                    const notes = latestNotesItem ? latestNotesItem.homework_notes : '';
                    
                    const hasActive = activeHWs.length > 0 || activeTheories.length > 0;
                    const hasNotes = notes.trim().length > 0;
                    
                    if (!hasActive && !hasNotes) {
                      return (
                        <>
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#16a34a', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>
                            AKTUELLE HAUSAUFGABEN (0):
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '20px 0', fontWeight: 600 }}>
                            Keine Hausaufgaben aktiv. Zeit für freies Üben! 🎸
                          </div>
                        </>
                      );
                    }
                    
                    // Group page numbers by book title
                    const groupedLehrwerke: Record<string, { pages: number[] }> = {};
                    const otherHWs: any[] = [];
                    
                    const allActive = [...activeHWs, ...activeTheories];
                    
                    allActive.forEach(item => {
                      if (item.topic_name.includes(' - Seite ')) {
                        const parts = item.topic_name.split(' - Seite ');
                        const bookTitle = parts[0].trim();
                        const pageNum = parseInt(parts[1], 10);
                        
                        if (!groupedLehrwerke[bookTitle]) {
                          groupedLehrwerke[bookTitle] = { pages: [] };
                        }
                        if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.includes(pageNum)) {
                          groupedLehrwerke[bookTitle].pages.push(pageNum);
                        }
                      } else {
                        otherHWs.push(item);
                      }
                    });
                    
                    // Convert to list
                    const lehrwerkeList = Object.entries(groupedLehrwerke).map(([title, info]) => {
                      info.pages.sort((a, b) => a - b);
                      return { title, pages: info.pages };
                    });
                    
                    return (
                      <>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#16a34a', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>
                          AKTUELLE HAUSAUFGABEN ({activeHWs.length + activeTheories.length}):
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {lehrwerkeList.map((item, idx) => (
                            <div key={`lw-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {/* Grouped line */}
                              <div style={{
                                fontSize: '0.96rem',
                                color: '#1e293b',
                                fontWeight: 900,
                                letterSpacing: '-0.035em',
                                fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif'
                              }}>
                                📖 <span>{item.title}</span> <span style={{ color: '#4b5563', fontWeight: 700, marginLeft: '4px', letterSpacing: '-0.02em' }}>· {formatPageNumbers(item.pages)}</span>
                              </div>
                              {/* Sub-listed pages as premium horizontal badges */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '2px' }}>
                                {item.pages.map(p => (
                                  <div key={`p-${p}`} style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    background: '#ffffff',
                                    color: '#475569',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: 900,
                                    border: '1px solid #e2e8f0',
                                    fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif',
                                    letterSpacing: '-0.02em',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                  }}>
                                    📄 Seite {p}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {otherHWs.map((item, idx) => (
                            <div key={`oth-${idx}`} style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 750, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              {item.status === 'THEORY_DONE' ? '🧠' : '🎵'} <span>{item.topic_name}</span>
                            </div>
                          ))}
                          
                          {/* Display the notes text beautifully directly under the pages! */}
                          {(() => {
                            if (!hasNotes) return null;
                            let notesArray: string[] = [];
                            try {
                              if (notes.startsWith('[') && notes.endsWith(']')) {
                                notesArray = JSON.parse(notes);
                              } else {
                                const cleanNotes = notes
                                  .split('\n')
                                  .filter((line: string) => !line.trim().startsWith('• 📖') && !line.trim().startsWith('• 🎵') && !line.trim().startsWith('• 🗑️'))
                                  .join('\n')
                                  .trim();
                                if (cleanNotes) {
                                  notesArray = cleanNotes.split('\n\n').filter(Boolean);
                                }
                              }
                            } catch (e) {
                              notesArray = [notes];
                            }

                            if (notesArray.length === 0) return null;

                            return (
                              <div style={{ 
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                fontSize: '0.8rem', 
                                color: '#475569', 
                                fontWeight: 550, 
                                fontStyle: 'italic',
                                lineHeight: '1.45',
                                marginTop: '6px',
                                borderTop: '1px solid #f1f5f9',
                                paddingTop: '10px'
                              }}>
                                {notesArray.map((note, nIdx) => (
                                  <div key={`n-${nIdx}`} style={{ whiteSpace: 'pre-line' }}>
                                    {note}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Übesoll */}
                {(() => {
                  const todayStr = new Date().toDateString();
                  const hasPracticedToday = focusLogs.some(log => {
                    return new Date(log.created_at).toDateString() === todayStr && (log.duration_minutes || 0) >= 3;
                  });

                  return (
                    <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '12px',
                          background: hasPracticedToday ? 'rgba(34, 197, 94, 0.1)' : 'rgba(249, 115, 22, 0.1)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          flexShrink: 0 
                        }}>
                          <Flame size={20} color={hasPracticedToday ? '#16a34a' : '#ea580c'} fill={hasPracticedToday ? '#16a34a' : 'none'} />
                        </div>
                        <div style={{ textAlign: 'left', flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%', 
                              background: hasPracticedToday ? '#16a34a' : '#ea580c'
                            }} />
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: hasPracticedToday ? '#16a34a' : '#ea580c', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                              {hasPracticedToday ? 'Übeziel erreicht' : 'Tägliche Übezeit'}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 850, color: '#0f172a', margin: '0 0 4px 0', fontFamily: 'Urbanist' }}>
                            {hasPracticedToday ? 'Heutige Übung abgeschlossen' : 'Tagesserie aufrechterhalten'}
                          </h3>
                          <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, margin: 0, fontWeight: 550 }}>
                            {hasPracticedToday 
                              ? 'Hervorragend! Du hast deine tägliche Übeeinheit absolviert und deine Serie fortgesetzt.' 
                              : 'Absolviere eine 3-minütige Fokus-Sitzung, um deinen heutigen Fortschritt festzuhalten.'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('practice_board')}
                        style={{ 
                          background: hasPracticedToday ? '#f1f5f9' : '#0f172a', 
                          color: hasPracticedToday ? '#475569' : '#ffffff', 
                          border: hasPracticedToday ? '1px solid #cbd5e1' : 'none', 
                          borderRadius: '12px', 
                          padding: '10px 16px', 
                          fontWeight: 800, 
                          fontSize: '0.82rem', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center', 
                          gap: '6px', 
                          transition: 'all 0.15s ease',
                          fontFamily: 'Urbanist'
                        }}
                      >
                        {hasPracticedToday ? 'Übersicht anzeigen' : 'Fokus-Session starten'}
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Flame Tiers */}
              {renderFlameTiersWidget()}

            </div>

            {/* RIGHT COLUMN */}
            <div style={{ flex: '1 1 320px', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
              
              {/* Nächste Termine */}
              <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="#ef4444" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Nächste Termine</h3>
                  </div>
                  <button onClick={() => handleTabChangeLocal('events')} style={{ background: 'transparent', border: 'none', color: '#0b57d0', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Alle anzeigen</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(() => {
                    const upcomingConfirmed = (scheduleOccurrences || []).filter(occ => 
                      occ.status === 'scheduled' || occ.status === 'rescheduled_confirmed'
                    );
                    if (upcomingConfirmed.length > 0) {
                      return upcomingConfirmed.slice(0, 3).map(occ => {
                        const d = new Date(occ.date);
                        return (
                          <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                            <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
                              <div style={{ background: '#ef4444', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                              <div style={{ background: 'white', color: '#1e293b', fontSize: '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{occ.start_time?.substring(0,5)} <span style={{ color: '#22c55e' }}>Groovelab</span></div>
                            </div>
                          </div>
                        );
                      });
                    } else {
                      return <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Keine Termine verfügbar.</div>;
                    }
                  })()}
                </div>
              </div>

              {/* Terminänderungen */}
              {(() => {
                const appointmentChanges = (scheduleOccurrences || []).filter(occ => 
                  !occ.student_acknowledged && (
                    occ.status === 'pending_reschedule' || 
                    occ.status === 'cancelled' || 
                    (occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date)
                  )
                );
                if (appointmentChanges.length === 0) return null;
                
                return (
                  <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '2px dashed #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                      <Calendar size={18} color="#f59e0b" />
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Terminänderungen</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {appointmentChanges.map(occ => {
                        const d = new Date(occ.date);
                        const isReschedule = occ.status === 'pending_reschedule';
                        const isCancelled = occ.status === 'cancelled';
                        const isRegularReset = occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date;
                        
                        let cardBg = '#fef2f2';
                        let cardBorder = '#fecaca';
                        let badgeText = '❌ Termin abgesagt';
                        let badgeColor = '#991b1b';
                        
                        if (isReschedule) {
                          cardBg = '#fffbeb';
                          cardBorder = '#fef08a';
                          badgeText = '🔄 Neuer Termin vorgeschlagen';
                          badgeColor = '#854d0e';
                        } else if (isRegularReset) {
                          cardBg = '#ecfdf5';
                          cardBorder = '#a7f3d0';
                          badgeText = '❇️ Termin wieder regulär';
                          badgeColor = '#065f46';
                        }
                        
                        return (
                          <div key={occ.id} style={{ 
                            padding: '16px', 
                            borderRadius: '16px', 
                            background: cardBg, 
                            border: `1.5px solid ${cardBorder}`, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '12px' 
                          }}>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                {badgeText}
                              </div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                                {d.toLocaleDateString('de-DE', {weekday: 'long', day: '2-digit', month: '2-digit'})}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                                {occ.start_time?.substring(0,5)} Uhr
                              </div>
                              {isRegularReset && (
                                <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 500, marginTop: '4px' }}>
                                  Dieser Termin findet nun wieder wie ursprünglich geplant statt.
                                </div>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              {isReschedule ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    onClick={() => handleRejectReschedule(occ)}
                                    style={{ 
                                      background: '#ef4444', 
                                      color: 'white', 
                                      border: 'none', 
                                      padding: '6px 12px', 
                                      borderRadius: '8px', 
                                      fontSize: '0.75rem', 
                                      fontWeight: 700, 
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    Ablehnen
                                  </button>
                                  <button 
                                    onClick={() => handleConfirmReschedule(occ.id)}
                                    style={{ 
                                      background: '#eab308', 
                                      color: 'white', 
                                      border: 'none', 
                                      padding: '6px 12px', 
                                      borderRadius: '8px', 
                                      fontSize: '0.75rem', 
                                      fontWeight: 700, 
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 4px rgba(234, 179, 8, 0.2)',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    Bestätigen
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => handleAcknowledgeCancellation(occ.id)}
                                  style={{ 
                                    background: isRegularReset ? '#10b981' : '#ef4444', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '6px 12px', 
                                    borderRadius: '8px', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 700, 
                                    cursor: 'pointer',
                                    boxShadow: `0 2px 4px ${isRegularReset ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  Gelesen abhaken
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* LIVE CAMPUS FEED */}
              <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                  <Sparkles size={18} color="#eab308" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Campus Feed</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {feedLoading ? (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '16px 0' }}>
                      Feed wird geladen...
                    </div>
                  ) : feedItems.length > 0 ? (
                    feedItems.slice(0, 5).map(item => {
                      const badge = getBadgeStyles(item.category || item.title);
                      return (
                        <div key={item.id} style={{ position: 'relative', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ background: badge.bg, color: badge.color, fontSize: '0.65rem', fontWeight: 800, padding: '4px 8px', borderRadius: '100px' }}>
                              {badge.text}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {formatRelativeDate(item.date)}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                            {item.content}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '16px 0', fontWeight: 600 }}>
                      Keine aktuellen Mitteilungen im Feed. 🎉
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
      
      {activeTab === 'hero' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* Evolution Badge Top Right */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#e0f2fe',
            border: '1px solid #bae6fd',
            color: '#0369a1',
            fontWeight: 800,
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            padding: '4px 12px',
            borderRadius: '100px'
          }}>
            <Trophy size={11} /> {avatar.instrument_type}
          </div>

          {/* Avatar Showcase */}
          <div style={{ textAlign: 'center', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto' }}>
              {/* Avatar frame */}
              <div style={{
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                background: '#f8fafc',
                border: '3px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.02)',
                transition: 'all 0.3s'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '5rem' }}>
                    {avatar.instrument_type === 'guitarist' ? '🎸' : avatar.instrument_type === 'drummer' ? '🥁' : avatar.instrument_type === 'keyboardist' ? '🎹' : '🎤'}
                  </span>
                </div>
              </div>
              
              <div style={{
                position: 'absolute',
                bottom: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#0b57d0',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.68rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                padding: '4px 14px',
                borderRadius: '100px',
                boxShadow: '0 4px 12px rgba(11, 87, 208, 0.25)',
                border: '2px solid #ffffff',
                whiteSpace: 'nowrap'
              }}>
                Evolution {currentLevel}
              </div>
            </div>

            {/* Info Block */}
            <div style={{ marginTop: '8px' }}>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                {levelTitle.split(' (')[0]}
              </h3>
              <span style={{ color: '#0b57d0', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <Award size={13} /> {levelTitle}
              </span>
            </div>

            {/* XP Progress Bar */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                <span>Erfahrungspunkte (XP)</span>
                <span style={{ color: '#0b57d0', fontFamily: 'monospace', fontWeight: 900 }}>
                  {currentLevel === 3 ? `${currentXp} XP (MAX)` : `${currentXp} / ${nextThreshold} XP`}
                </span>
              </div>

              <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
                <div
                  style={{ width: `${xpPercentage}%`, height: '100%', borderRadius: '100px', background: '#0b57d0', transition: 'all 1s' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                {currentLevel === 3 ? (
                  <span>Glückwunsch! Höchste Stufe erreicht!</span>
                ) : (
                  <>
                    <span>Noch {nextThreshold - currentXp} XP bis Evolution {currentLevel + 1}</span>
                    <span>{Math.round(xpPercentage)}%</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && studentUser && (
        <div className="animation-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          {/* Header Card with Premium Glassmorphism */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.45) 100%)',
            backdropFilter: 'blur(24px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '32px',
            boxShadow: '0 12px 40px rgba(52, 168, 83, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            display: 'flex',
            overflow: 'visible',
            position: 'relative',
            minHeight: '240px',
            alignItems: 'center',
            padding: '32px 48px',
            gap: '32px',
            flexWrap: 'wrap'
          }}>
            {/* Floating Shielded Avatar Frame */}
            <div style={{
              width: '128px',
              height: '128px',
              borderRadius: '50%',
              border: '5px solid #ffffff',
              boxShadow: '0 12px 32px rgba(52, 168, 83, 0.12)',
              background: '#ffffff',
              flexShrink: 0,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 2,
              transform: 'translateY(-10px)'
            }}>
              <img 
                src={getInstrumentAvatarUrl(studentUser.instrument)} 
                alt="" 
                style={{ width: '95%', height: '95%', objectFit: 'contain' }} 
              />
            </div>

            {/* Profile Identity Details */}
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'linear-gradient(135deg, #34a853 0%, #1b8035 100%)',
                  color: 'white', 
                  padding: '4px 14px', 
                  borderRadius: '10px',
                  fontSize: '0.7rem', 
                  fontWeight: 900, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.08em',
                  boxShadow: '0 4px 10px rgba(52, 168, 83, 0.2)'
                }}>
                  Campus Schüler
                </span>
                <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 750 }}>
                  🏢 {studentUser.schools?.name || 'Groovelab Campus'}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>
                  • Mitglied seit {new Date(studentUser.created_at).toLocaleDateString('de-DE')}
                </span>
              </div>

              <h1 style={{ fontSize: '2.8rem', fontWeight: 950, color: '#0f172a', margin: '0 0 12px 0', letterSpacing: '-0.03em', fontFamily: "'Urbanist', sans-serif" }}>
                {studentUser.first_name} {studentUser.last_name || ''}
              </h1>

              {/* Active Instruments Badge List */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(studentUser.instrument || '').split(',').map((inst: string) => inst.trim()).filter(Boolean).map((inst: string) => (
                  <div key={inst} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(52, 168, 83, 0.05)',
                    border: '1px solid rgba(52, 168, 83, 0.12)',
                    color: '#34a853',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 800
                  }}>
                    <span>🎸</span>
                    <span>{inst}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Edit Action Button */}
            <button 
              onClick={() => {
                setEditingProfile({ ...studentUser });
                setShowEditProfile(true);
              }} 
              style={{ 
                background: '#ffffff', 
                border: '1px solid rgba(0,0,0,0.06)', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                color: '#0f172a', 
                fontSize: '0.85rem', 
                fontWeight: 800, 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '12px 20px',
                borderRadius: '16px',
                transition: 'all 0.2s',
                marginLeft: 'auto'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = '#f8fafc'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#ffffff'; }}
            >
              <span>Profil bearbeiten</span>
              <Pencil size={15} />
            </button>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {/* Metric 1: XP */}
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
              <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(52, 168, 83, 0.08)', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Star size={22} fill="#34a853" />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Erfahrung (XP)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                  {avatar?.xp || 0} XP
                </div>
              </div>
            </div>

            {/* Metric 2: Übe-Streak */}
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
              <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Flame size={22} fill="#ef4444" color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Übe-Streak</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                  {avatar?.streak_flame || 0} Tage
                </div>
              </div>
            </div>

            {/* Metric 3: Focus Month */}
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
              <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Fokus Diesen Monat</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                  {monthlyFocusMinutes} Min.
                </div>
              </div>
            </div>

            {/* Metric 4: Weekly Lessons */}
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
              <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Wochenstunden</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                  {studentSchedules.length} {studentSchedules.length === 1 ? 'Fach' : 'Fächer'}
                </div>
              </div>
            </div>
          </div>

          {/* Split layout: schedules list & contact info card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
            {/* Weekly recurring schedules */}
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.01)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 20px 0', fontFamily: "'Urbanist', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} style={{ color: '#34a853' }} />
                Wöchentlicher Unterrichtsplan
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {studentSchedules.length > 0 ? (
                  studentSchedules.map((sch) => {
                    const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                    return (
                      <div key={sch.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '16px 20px', 
                        background: '#f8fafc', 
                        borderRadius: '16px', 
                        border: '1px solid #f1f5f9' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ height: '42px', width: '42px', borderRadius: '12px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.04)', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                            {getInstrumentAvatarUrl(sch.instrument).includes('piano') ? '🎹' : getInstrumentAvatarUrl(sch.instrument).includes('drums') ? '🥁' : getInstrumentAvatarUrl(sch.instrument).includes('vocals') ? '🎤' : '🎸'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 850, color: '#0f172a', fontSize: '0.9rem' }}>
                              {DAYS_DE[sch.day_of_week]}s, {sch.time_slot} Uhr
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                              {sch.teacher ? `Coach: ${sch.teacher.first_name} ${sch.teacher.last_name}` : 'Patrick Huber'} • {sch.rooms?.name || 'Raum 1'} ({sch.duration || 45} Min)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '2px dashed #cbd5e1', borderRadius: '24px' }}>
                    Keine wöchentlichen Termine hinterlegt.
                  </div>
                )}
              </div>
            </div>

            {/* General details and contacts */}
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', fontFamily: "'Urbanist', sans-serif" }}>
                Kontaktdaten & Adresse
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Mail size={16} color="#64748b" />
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>E-Mail-Adresse</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>{studentUser.email || 'Nicht hinterlegt'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Phone size={16} color="#64748b" />
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Telefonnummer</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>{studentUser.phone || 'Nicht hinterlegt'}</div>
                  </div>
                </div>

                {studentUser.parent_email && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <User size={16} color="#64748b" />
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Eltern E-Mail</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>{studentUser.parent_email}</div>
                    </div>
                  </div>
                )}

                {(studentUser.street || studentUser.city) && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <MapPin size={16} color="#64748b" />
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Adresse</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                        {studentUser.street ? `${studentUser.street}, ` : ''}{studentUser.zip_code || ''} {studentUser.city || ''}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Edit Overlay Modal */}
          {showEditProfile && editingProfile && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.3)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              zIndex: 11000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <form onSubmit={handleSaveProfile} style={{
                background: 'white',
                border: '1px solid rgba(255,255,255,0.8)',
                borderRadius: '32px',
                boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
                width: '100%',
                maxWidth: '540px',
                padding: '36px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                position: 'relative'
              }}>
                <button 
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  style={{ position: 'absolute', top: '24px', right: '24px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={16} />
                </button>

                <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                  Profil bearbeiten
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Vorname</label>
                      <input 
                        type="text" 
                        required
                        value={editingProfile.first_name || ''} 
                        onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, first_name: e.target.value }))}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Nachname</label>
                      <input 
                        type="text" 
                        required
                        value={editingProfile.last_name || ''} 
                        onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, last_name: e.target.value }))}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>E-Mail-Adresse</label>
                    <input 
                      type="email" 
                      required
                      value={editingProfile.email || ''} 
                      onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, email: e.target.value }))}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Telefonnummer</label>
                    <input 
                      type="text" 
                      value={editingProfile.phone || ''} 
                      onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, phone: e.target.value }))}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Instrumente (durch Komma getrennt)</label>
                    <input 
                      type="text" 
                      value={editingProfile.instrument || ''} 
                      onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, instrument: e.target.value }))}
                      placeholder="z.B. Gitarre, Schlagzeug"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowEditProfile(false)}
                    style={{ flex: 1, padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', color: '#0f172a', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Abbrechen
                  </button>
                  <button 
                    type="submit" 
                    disabled={savingProfile}
                    style={{ flex: 2, padding: '14px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #34a853 0%, #1b8035 100%)', color: 'white', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 8px 24px rgba(52, 168, 83, 0.15)' }}
                  >
                    {savingProfile ? 'Wird gespeichert...' : 'Änderungen speichern'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 9:16 MOBILE STORY GENERATOR MODAL (Wrapped & Flashback) */}
      {/* ======================================================== */}
      {showWrapped && wrappedData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#09090b',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Outfit", sans-serif'
        }}>
          {/* 9:16 Aspect Ratio Container */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '430px',
            height: '100%',
            maxHeight: '860px',
            background: '#000000',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #18181b',
            boxSizing: 'border-box'
          }}>
            {/* Top Indicator Bars */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              right: '16px',
              zIndex: 10000,
              display: 'flex',
              gap: '4px'
            }}>
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} style={{
                  flex: 1,
                  height: '4px',
                  background: idx < storySlide ? '#eab308' : idx === storySlide ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                  borderRadius: '100px',
                  overflow: 'hidden'
                }}>
                  {idx === storySlide && (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: '#eab308',
                      animation: 'storyProgress 5s linear forwards'
                    }} />
                  )}
                </div>
              ))}
            </div>

            {/* Header: Title and Close button */}
            <div style={{
              position: 'absolute',
              top: '32px',
              left: '16px',
              right: '16px',
              zIndex: 10000,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                GrooveLab Wrapped
              </span>
              <button 
                onClick={() => setShowWrapped(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* STORY SLIDES */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px', boxSizing: 'border-box', color: 'white' }}>
              
              {/* SLIDE 0: INTRO */}
              {storySlide === 0 && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                  <div style={{ fontSize: '6rem', animation: 'bounce 2s infinite' }}>🎬</div>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                    Dein musikalischer Flashback!
                  </h2>
                  <p style={{ color: '#a1a1aa', fontSize: '1rem', fontWeight: 500 }}>
                    Schauen wir uns an, was du diesen Monat im GrooveLab geleistet hast! Bist du bereit für deine Story?
                  </p>
                </div>
              )}

              {/* SLIDE 1: STATISTICS (Censored for Free, Uncensored for Premium) */}
              {storySlide === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ background: '#eab308', color: '#09090b', fontSize: '0.7rem', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fokus &amp; Übung</span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginTop: '12px' }}>Deine Meilensteine</h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Focus Minutes Card */}
                    <div style={{ background: '#09090b', border: '1px solid #27272a', padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <Clock size={36} color="#eab308" />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800 }}>Fokus-Zeit</div>
                        <div 
                          className={!wrappedData.isPremium ? 'blur-md text-2xl font-black text-white select-none' : 'text-2xl font-black text-white'}
                        >
                          {wrappedData.isPremium ? `${wrappedData.monthlyFlashback.focusMinutes} Minuten` : '9999 Minuten'}
                        </div>
                      </div>
                    </div>

                    {/* Mastered Songs Card */}
                    <div style={{ background: '#09090b', border: '1px solid #27272a', padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <BookOpen size={36} color="#10b981" />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800 }}>Gemeisterte Songs</div>
                        <div 
                          className={!wrappedData.isPremium ? 'blur-md text-2xl font-black text-white select-none' : 'text-2xl font-black text-white'}
                        >
                          {wrappedData.isPremium ? `${wrappedData.monthlyFlashback.masteredSongsCount} Songs` : '88 Songs'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!wrappedData.isPremium && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '12px', borderRadius: '16px', color: '#ef4444', fontSize: '0.78rem' }}>
                      <EyeOff size={16} />
                      <span>Statistiken ausgeblendet. Upgrade auf Premium erforderlich!</span>
                    </div>
                  )}
                </div>
              )}

              {/* SLIDE 2: AVATAR SHOWCASE (Grayscale for Free, 3D/Color for Premium) */}
              {storySlide === 2 && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                  <div>
                    <span style={{ background: '#10b981', color: 'white', fontSize: '0.7rem', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Charakter Evolution</span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginTop: '12px' }}>Dein Avatar-Status</h2>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <div 
                      className={!wrappedData.isPremium ? 'grayscale w-40 h-40 rounded-full bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center overflow-hidden' : 'w-40 h-40 rounded-full bg-indigo-950/40 border-4 border-indigo-500 flex items-center justify-center overflow-hidden animate-pulse'}
                    >
                      <span style={{ fontSize: '5.5rem' }}>
                        {avatar.instrument_type === 'guitarist' ? '🎸' : avatar.instrument_type === 'drummer' ? '🥁' : avatar.instrument_type === 'keyboardist' ? '🎹' : '🎤'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                      {wrappedData.isPremium ? levelTitle.split(' (')[0] : 'Analoger Schüler (Silhouette)'}
                    </h3>
                    <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '6px' }}>
                      {wrappedData.isPremium 
                        ? `Evolution Level ${currentLevel} erreicht!`
                        : 'Kostenlose Avatare bleiben grau und leblos. Upgrade, um deinen 3D-Helden zu erwecken!'
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* SLIDE 3: BADGES & VIRAL QR SHARE */}
              {storySlide === 3 && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>
                      {wrappedData.isPremium ? 'Sammle dein Badge!' : 'Hol dir die Vollversion'}
                    </h2>
                    <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '6px' }}>
                      {wrappedData.isPremium ? 'Hier ist dein exklusives Monats-Badge:' : 'Upgrade für nur 0,49 € / Monat!'}
                    </p>
                  </div>

                  {wrappedData.isPremium ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                      <div style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)' }}>
                        <Trophy size={36} color="white" />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fbbf24' }}>
                        {wrappedData.monthlyFlashback.badgeName}
                      </span>

                      {/* Viral QR Code Generator */}
                      <div style={{ background: 'white', padding: '10px', borderRadius: '16px', marginTop: '8px', boxShadow: '0 10px 30px rgba(255,255,255,0.05)' }}>
                        <QRCode value={`https://groovelab.app/join?ref=${studentId}`} size={100} />
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#71717a' }}>Virale Partner-ID: ref={studentId}</span>

                      {/* One click WhatsApp Status Share */}
                      <a 
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Schau mal! Mein GrooveLab Rückblick diesen Monat: Ich war ${wrappedData.monthlyFlashback.focusMinutes} Minuten fokussiert und habe mein ${wrappedData.monthlyFlashback.badgeName} freigeschaltet! Musik machen ist genial! Werde auch Mitglied: https://groovelab.app/join?ref=${studentId}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ background: '#25d366', color: 'white', textDecoration: 'none', padding: '14px 28px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)' }}
                      >
                        <Share2 size={16} /> Auf WhatsApp teilen
                      </a>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#27272a', border: '2px dashed #3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={32} color="#71717a" />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#a1a1aa' }}>Badge gesperrt</span>

                      {/* Redirect to WhatsApp upgrade trigger */}
                      <a 
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Hallo Musikschule! Ich möchte mein GrooveLab-Konto auf Premium upgraden, um Avatare, Streaks und monatliche Stories freizuschalten. Bitte sendet mir den Upgrade-Link für 0,49€.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ background: '#fbbf24', color: '#09090b', textDecoration: 'none', padding: '14px 28px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}
                      >
                        <Zap size={16} /> Jetzt Upgrade anfordern (0,49 €)
                      </a>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Story Navigation Tabs Bottom */}
            <div style={{
              display: 'flex',
              padding: '16px',
              borderTop: '1px solid #18181b',
              background: '#09090b',
              gap: '8px'
            }}>
              <button 
                onClick={() => setStorySlide(prev => Math.max(0, prev - 1))}
                disabled={storySlide === 0}
                style={{ flex: 1, background: '#18181b', border: '1px solid #27272a', color: 'white', padding: '12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', opacity: storySlide === 0 ? 0.5 : 1 }}
              >
                Zurück
              </button>
              
              <button 
                onClick={() => {
                  if (storySlide === 3) {
                    setShowWrapped(false);
                  } else {
                    setStorySlide(prev => Math.min(3, prev + 1));
                  }
                }}
                style={{ flex: 2, background: '#eab308', border: 'none', color: '#09090b', padding: '12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer' }}
              >
                {storySlide === 3 ? 'Schließen' : 'Weiter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIGITAL DETOX ACTIVE TIMER OVERLAY (AMOLED Black Screen)  */}
      {/* ======================================================== */}
      {showDetox && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#000000', // AMOLED Black
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontFamily: '"Outfit", sans-serif',
          padding: '24px'
        }}>
          {isFaceDown ? (
            // Full AMOLED-Black with minimal reizarm layout
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Moon size={24} color="#52525b" className="animate-pulse" />
              </div>
              <h1 style={{ fontSize: '4rem', fontWeight: 100, fontFamily: 'monospace', letterSpacing: '-0.02em', color: '#27272a', margin: 0 }}>
                {Math.floor(detoxSecondsLeft / 60)}:{String(detoxSecondsLeft % 60).padStart(2, '0')}
              </h1>
              <p style={{ color: '#27272a', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Digital Detox Aktiv
              </p>
            </div>
          ) : (
            // Warning/Flat check mode when flipped face up
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', maxWidth: '320px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={40} color="#ef4444" className="animate-bounce" />
              </div>
              
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ef4444', letterSpacing: '-0.03em' }}>
                Handy umdrehen!
              </h2>
              
              <p style={{ color: '#a1a1aa', fontSize: '0.9rem', lineHeight: '1.5', fontWeight: 500 }}>
                Der Timer ist eingefroren. Lege das Smartphone flach auf das Display, um den Fokusmodus fortzusetzen.
              </p>
              
              <div style={{ fontSize: '3rem', fontWeight: 900, color: 'white', fontFamily: 'monospace', margin: '8px 0' }}>
                {Math.floor(detoxSecondsLeft / 60)}:{String(detoxSecondsLeft % 60).padStart(2, '0')}
              </div>

              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button 
                  onClick={() => {
                    setIsDetoxActive(false);
                    setShowDetox(false);
                  }}
                  style={{ flex: 1, padding: '14px', background: '#27272a', border: '1px solid #3f3f46', color: 'white', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {detoxCompleted && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: '#09090b',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Award size={48} color="white" />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white' }}>Fokus abgeschlossen!</h2>
              <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginTop: '8px', maxWidth: '280px' }}>
                Sehr gut! Du warst {detoxMinutes} Minuten voll konzentriert. Dir wurden +100 XP auf deinen Avatar gebucht.
              </p>
              
              <button 
                onClick={() => {
                  setShowDetox(false);
                  setDetoxCompleted(false);
                }}
                style={{ marginTop: '24px', background: '#10b981', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Zurück zum Dashboard
              </button>
            </div>
          )}
        </div>
      )}

      {/* Appointment Quick Chat (Shoutbox) Modal */}
      {showAppointmentChat && appointmentChatData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', width: '420px', maxWidth: '90vw', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', height: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>Shoutbox – Terminabsprache</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>1:1 Absprache mit deiner Lehrkraft</p>
              </div>
              <button 
                onClick={() => setShowAppointmentChat(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat messages viewport */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', paddingRight: '4px' }}>
              {chatMessages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem', textAlign: 'center', padding: '16px' }}>
                  Noch keine Nachrichten. Schreib deiner Lehrkraft für eine schnelle Absprache.
                </div>
              ) : (
                chatMessages.map((msg, idx) => {
                  const isMe = msg.sender_id === studentId;
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
                        <span style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '2px', alignSelf: isMe ? 'flex-end' : 'flex-start', fontWeight: 600 }}>
                          📅 {prefixText}
                        </span>
                      )}
                      <div style={{ 
                        background: isMe ? '#4f46e5' : '#f1f5f9', 
                        color: isMe ? 'white' : '#1e293b', 
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
                      <span style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '2px', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                        {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            {/* Send Input Form */}
            <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <input 
                type="text" 
                placeholder="Nachricht senden..." 
                value={chatTypedMessage}
                onChange={e => setChatTypedMessage(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
              <button type="submit" style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)' }}>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pride Card certificate modal */}
      {showPrideCard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'backdropFadeIn 0.35s ease-out forwards'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(251, 251, 253, 0.98) 100%)',
            padding: '42px 36px',
            borderRadius: '28px',
            boxShadow: '0 32px 80px -16px rgba(15, 23, 42, 0.18), 0 4px 20px rgba(0, 0, 0, 0.04)',
            width: '490px',
            maxWidth: '100%',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            boxSizing: 'border-box',
            animation: 'modalScaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }} className="shimmering-border">
            {/* Spectacular glowing 3D shield visual */}
            <div style={{
              position: 'relative',
              width: '135px',
              height: '135px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '26px',
            }} className="float-shield-anim">
              <img 
                src="/fokus_schild_glowing.png" 
                alt="Fokus-Schutzschild" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  mixBlendMode: 'multiply',
                  filter: 'drop-shadow(0 16px 32px rgba(16, 185, 129, 0.4))'
                }}
              />
              <span className="sparkle-star-1" style={{ position: 'absolute', top: '-8px', right: '-8px', fontSize: '1.7rem' }}>✨</span>
              <span className="sparkle-star-2" style={{ position: 'absolute', bottom: '-4px', left: '-12px', fontSize: '1.3rem' }}>⭐</span>
            </div>

            {/* Decorative certificate header */}
            <div style={{ 
              fontSize: '0.72rem', 
              fontWeight: 900, 
              color: '#059669', 
              textTransform: 'uppercase', 
              letterSpacing: '0.14em', 
              marginBottom: '6px',
              background: '#ecfdf5',
              padding: '4px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.12)'
            }}>
              Offizieller Übe-Nachweis
            </div>
            
            <h3 style={{ margin: '8px 0 16px 0', fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Fokus-Meister Urkunde
            </h3>
            
            <div style={{
              width: '80%',
              height: '1.5px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.15) 50%, transparent 100%)',
              marginBottom: '24px'
            }} />

            <p style={{
              fontSize: '0.94rem',
              lineHeight: 1.65,
              color: '#475569',
              margin: '0 0 26px 0',
              fontWeight: 500
            }}>
              Hiermit wird offiziell bestätigt, dass <span style={{ 
                color: '#047857', 
                fontWeight: 800,
                background: '#ecfdf5',
                padding: '3px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                margin: '0 2px'
              }}>{studentUser?.first_name || 'dein Kind'}</span> heute eine hochkonzentrierte Fokus-Session am Instrument erfolgreich gemeistert hat. 
            </p>

            {/* Stats container */}
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              borderRadius: '16px',
              width: '100%',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '32px',
              boxSizing: 'border-box',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#334155', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🛡️ <span style={{ fontWeight: 600, color: '#64748b' }}>Schutzschild:</span></span>
                <span style={{ color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', fontSize: '0.76rem', border: '1px solid rgba(16, 185, 129, 0.15)' }}>Aktiv (3 Min.)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#334155', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📅 <span style={{ fontWeight: 600, color: '#64748b' }}>Datum:</span></span>
                <span style={{ color: '#334155' }}>{new Date().toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Signature & Seal representation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'center', marginBottom: '32px' }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#ecfdf5" stroke="#10b981" strokeWidth="2"/>
                <path d="M20 7L23.5 14H31L25 19L27.5 26.5L20 22L12.5 26.5L15 19L9 14H16.5L20 7Z" fill="#fbbf24"/>
                <circle cx="20" cy="20" r="12" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3"/>
              </svg>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>Campus verifiziert</div>
                <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500 }}>Offizieller Campus-Nachweis</div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowPrideCard(false)}
              className="pulse-cert-btn-anim"
              style={{
                background: '#0f172a',
                color: 'white',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '16px',
                fontWeight: 800,
                fontSize: '0.86rem',
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxSizing: 'border-box'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Bereich für Eltern schließen
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}
