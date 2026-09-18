import { useState, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { notesService, UserNote } from '../../../services/notesService';
import { formatTeacherFullName } from '../../../utils/nameHelper';

export interface UseTeacherTagesplanProps {
  userId: string;
  teacher: any;
  schoolData: any;
  rooms: any[];
  allStudents: any[];
  onRefresh?: () => Promise<void> | void;
  onToast?: (msg: string) => void;
}

export function useTeacherTagesplan({
  userId,
  teacher,
  schoolData,
  rooms,
  allStudents,
  onRefresh,
  onToast
}: UseTeacherTagesplanProps) {
  const [briefingData, setBriefingData] = useState<any>({ timeline: [] });
  const [activeTimelineSlot, setActiveTimelineSlot] = useState<any | null>(null);
  const [quickAudioStudent, setQuickAudioStudent] = useState<any | null>(null);

  // Zoom
  const [zoomFactor, setZoomFactor] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`groovelab_zoom_${userId}`);
      if (saved) return parseFloat(saved);
    }
    return 1;
  });

  const handleZoomChange = useCallback((value: number) => {
    setZoomFactor(value);
    if (userId) {
      localStorage.setItem(`groovelab_zoom_${userId}`, value.toString());
    }
  }, [userId]);

  // Double confirm slot cancel
  const [confirmCancelSlotId, setConfirmCancelSlotId] = useState<string | null>(null);
  const [activeChatOccIds, setActiveChatOccIds] = useState<Set<string>>(new Set());
  const [activeChatOcc, setActiveChatOcc] = useState<any | null>(null);

  const handleCancelSlotWithDoubleConfirm = useCallback(async (slot: any) => {
    try {
      const targetSlot = slot.isGroup ? slot.slots[0] : slot;
      const slotId = targetSlot?.id;
      const scheduleId = targetSlot?.schedule_id || targetSlot?.scheduleId;
      const studentId = slot.isGroup ? slot.students[0]?.id : slot.student?.id;
      const dateStr = slot.date || (briefingData?.timeline?.[0]?.date);
      const startTime = slot.startTime || slot.timeSlot || slot.start_time || '14:00';
      const duration = slot.duration || 45;
      
      if (!dateStr) return;

      const isVirtual = Boolean(
        targetSlot?.is_virtual ||
        (slotId && (String(slotId).startsWith('virt_') || String(slotId).startsWith('virtual-')))
      );

      if (isVirtual) {
        let existingId: string | null = null;
        if (scheduleId && dateStr) {
          const { data: existingOcc } = await supabase
            .from('schedule_occurrences')
            .select('id')
            .eq('schedule_id', scheduleId)
            .eq('date', dateStr)
            .maybeSingle();
          if (existingOcc?.id) {
            existingId = existingOcc.id;
          }
        }

        let opError = null;
        if (existingId) {
          const { error } = await supabase
            .from('schedule_occurrences')
            .update({
              status: 'cancelled',
              student_acknowledged: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingId);
          opError = error;
        } else {
          const { error } = await supabase
            .from('schedule_occurrences')
            .insert({
              schedule_id: scheduleId || null,
              student_id: studentId || null,
              teacher_id: userId,
              date: dateStr,
              start_time: startTime,
              duration: duration,
              status: 'cancelled',
              student_acknowledged: true
            });
          opError = error;
        }

        if (opError) {
          console.error('Error inserting/updating cancellation:', opError);
          alert('Fehler beim Absagen des Termins: ' + opError.message);
        } else {
          if (onToast) onToast('Termin erfolgreich abgesagt.');
          try {
            if (studentId && userId && dateStr) {
              const [y, m, d] = String(dateStr).split('-').map(Number);
              const occDate = (y && m && d) ? new Date(y, m - 1, d) : new Date();
              const shortDay = occDate.toLocaleDateString('de-DE', { weekday: 'short' });
              const shortDate = occDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
              const timeLabel = startTime.substring(0, 5);
              const targetOccId = existingId || (scheduleId ? `virtual-${scheduleId}-${dateStr}` : null);

              const now = new Date();
              const execDateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const execTimeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
              const execTimestampStr = `${execDateStr} um ${execTimeStr} Uhr`;
              const teacherDisplayName = formatTeacherFullName(teacher) || 'Lehrkraft';

              await supabase.from('campus_direct_messages').insert({
                sender_id: userId,
                recipient_id: studentId,
                content: `❌ Terminabsage: Dein Unterrichtstermin am ${shortDay} ${shortDate} um ${timeLabel} Uhr fällt aus.\n🕒 Abgesagt am: ${execTimestampStr} durch Lehrkraft (${teacherDisplayName}).`,
                occurrence_id: targetOccId,
                is_system: true,
                message_type: 'reschedule_notification'
              });
            }
          } catch (dmErr) {
            console.warn('Could not insert cancellation system message in TeacherDashboard:', dmErr);
          }
          if (onRefresh) onRefresh();
        }
      } else if (slotId) {
        const { error } = await supabase
          .from('schedule_occurrences')
          .update({
            status: 'cancelled',
            student_acknowledged: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', slotId);

        if (error) {
          console.error('Error updating cancellation:', error);
          alert('Fehler beim Absagen des Termins: ' + error.message);
        } else {
          if (onToast) onToast('Termin erfolgreich abgesagt.');
          try {
            if (studentId && userId && dateStr) {
              const [y, m, d] = String(dateStr).split('-').map(Number);
              const occDate = (y && m && d) ? new Date(y, m - 1, d) : new Date();
              const shortDay = occDate.toLocaleDateString('de-DE', { weekday: 'short' });
              const shortDate = occDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
              const timeLabel = startTime.substring(0, 5);

              const now = new Date();
              const execDateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const execTimeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
              const execTimestampStr = `${execDateStr} um ${execTimeStr} Uhr`;
              const teacherDisplayName = formatTeacherFullName(teacher) || 'Lehrkraft';

              await supabase.from('campus_direct_messages').insert({
                sender_id: userId,
                recipient_id: studentId,
                content: `❌ Terminabsage: Dein Unterrichtstermin am ${shortDay} ${shortDate} um ${timeLabel} Uhr fällt aus.\n🕒 Abgesagt am: ${execTimestampStr} durch Lehrkraft (${teacherDisplayName}).`,
                occurrence_id: slotId,
                is_system: true,
                message_type: 'reschedule_notification'
              });
            }
          } catch (dmErr) {
            console.warn('Could not insert cancellation system message in TeacherDashboard:', dmErr);
          }
          if (onRefresh) onRefresh();
        }
      }
    } catch (err: any) {
      console.error('Error in handleCancelSlotWithDoubleConfirm:', err);
    } finally {
      setConfirmCancelSlotId(null);
    }
  }, [briefingData, userId, teacher, onRefresh, onToast]);

  const handleTeacherReactivateOccurrence = useCallback(async (occ: any) => {
    if (!confirm('Möchtest du diesen Unterrichtstermin wieder reaktivieren? Der Termin findet dann wieder regulär statt.')) return;
    try {
      const occId = occ.id;
      const scheduleId = occ.schedule_id || occ.scheduleId;
      const studentId = occ.student_id || occ.student?.id;
      const dateStr = occ.date;

      const isVirtual = Boolean(occ.is_virtual || (occId && (String(occId).startsWith('virt_') || String(occId).startsWith('virtual-'))));

      if (isVirtual && scheduleId && dateStr) {
        await supabase
          .from('schedule_occurrences')
          .delete()
          .eq('schedule_id', scheduleId)
          .eq('date', dateStr);
      } else if (occId) {
        await supabase
          .from('schedule_occurrences')
          .update({ status: 'rescheduled_confirmed', student_acknowledged: false })
          .eq('id', occId);
      }

      if (studentId && userId) {
        const teacherDisplayName = formatTeacherFullName(teacher) || 'Lehrkraft';
        await supabase.from('campus_direct_messages').insert({
          sender_id: userId,
          recipient_id: studentId,
          content: `🔄 Termin reaktiviert: Dein Unterrichtstermin findet wieder regulär statt.`,
          is_system: true,
          message_type: 'cancellation_reset'
        });
      }

      if (onToast) onToast('Unterrichtstermin erfolgreich reaktiviert.');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error reactivating occurrence:', err);
    }
  }, [teacher, userId, onToast, onRefresh]);

  // Room issues
  const [schoolRoomIssues, setSchoolRoomIssues] = useState<UserNote[]>([]);

  const teacherTodayRooms = useMemo(() => {
    const set = new Set<string>();
    (briefingData?.timeline || []).forEach((slot: any) => {
      const rName = slot.room || slot.rooms?.name;
      if (rName) set.add(rName);
    });
    return Array.from(set);
  }, [briefingData?.timeline]);

  const todayTagesplanStudents = useMemo(() => {
    const set = new Map<string, any>();
    (briefingData?.timeline || []).forEach((slot: any) => {
      if (slot.isGroup && slot.students) {
        slot.students.forEach((s: any) => {
          if (s && s.id) set.set(s.id, s);
        });
      } else if (slot.student && slot.student.id) {
        set.set(slot.student.id, slot.student);
      }
    });
    return Array.from(set.values());
  }, [briefingData?.timeline]);

  const tagesplanRoomIssues = useMemo(() => {
    if (teacherTodayRooms.length === 0) return [];
    return schoolRoomIssues.filter(issue => {
      const contentLower = (issue.content || '').toLowerCase();
      const roomIdLower = (issue.room_id || '').toLowerCase();
      const tagsLower = (issue.tags || []).map(t => t.toLowerCase());

      return teacherTodayRooms.some(todayRoom => {
        if (!todayRoom) return false;
        const roomNorm = todayRoom.toLowerCase().trim();
        if (roomIdLower && (roomIdLower === roomNorm || roomIdLower.includes(roomNorm) || roomNorm.includes(roomIdLower))) return true;
        if (tagsLower.some(t => t.includes(roomNorm) || (roomNorm.includes('raum') && t.includes(roomNorm.replace('raum', '').trim())))) return true;
        if (contentLower.includes(roomNorm)) return true;
        const numMatch = roomNorm.match(/\d+/);
        if (numMatch) {
          const num = numMatch[0];
          const regex = new RegExp(`\\braum\\s*#?${num}\\b|!raum\\s*#?${num}\\b|\\[raum\\s*#?${num}\\]`, 'i');
          if (regex.test(contentLower) || tagsLower.some(t => regex.test(t)) || regex.test(roomIdLower)) return true;
        }
        return false;
      });
    });
  }, [teacherTodayRooms, schoolRoomIssues]);

  const handleResolveRoomIssueInTagesplan = useCallback(async (issueId: string) => {
    try {
      const effectiveSchoolId = teacher?.school_id || 1;
      await notesService.resolveRoomIssue(issueId, 'teacher', effectiveSchoolId);
      setSchoolRoomIssues(prev => prev.filter(i => i.id !== issueId));
      if (onToast) onToast('✅ Raummangel als behoben gemeldet');
    } catch (err) {
      console.error('[TeacherDashboard] Error resolving room issue:', err);
    }
  }, [teacher?.school_id, onToast]);

  const handleUpdateIssueRoomInTagesplan = useCallback(async (issueId: string, newRoom: string) => {
    try {
      const effectiveSchoolId = teacher?.school_id || 1;
      await notesService.updateNoteRoom(issueId, newRoom, effectiveSchoolId);
      setSchoolRoomIssues(prev => prev.map(i => i.id === issueId ? { ...i, room_id: newRoom } : i));
      if (onToast) onToast(`📍 Mangel erfolgreich ${newRoom} zugeordnet`);
    } catch (err) {
      console.error('[TeacherDashboard] Error updating room issue room:', err);
    }
  }, [teacher?.school_id, onToast]);

  return {
    briefingData,
    setBriefingData,
    activeTimelineSlot,
    setActiveTimelineSlot,
    quickAudioStudent,
    setQuickAudioStudent,
    zoomFactor,
    setZoomFactor,
    handleZoomChange,
    confirmCancelSlotId,
    setConfirmCancelSlotId,
    activeChatOccIds,
    setActiveChatOccIds,
    activeChatOcc,
    setActiveChatOcc,
    handleCancelSlotWithDoubleConfirm,
    handleTeacherReactivateOccurrence,
    schoolRoomIssues,
    setSchoolRoomIssues,
    teacherTodayRooms,
    todayTagesplanStudents,
    tagesplanRoomIssues,
    handleResolveRoomIssueInTagesplan,
    handleUpdateIssueRoomInTagesplan
  };
}
