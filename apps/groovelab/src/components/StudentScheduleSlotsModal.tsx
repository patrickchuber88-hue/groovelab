import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useTeacherAvailability } from '../hooks/useTeacherAvailability';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Star, 
  Ban, 
  Save, 
  Copy, 
  ExternalLink,
  Sparkles,
  Edit3,
  Check,
  Eraser,
  Sliders,
  RotateCcw,
  Trash2,
  Zap,
  GraduationCap,
  ShieldCheck,
  Info
} from 'lucide-react';

interface StudentScheduleSlotsModalProps {
  student: any;
  onClose: () => void;
  onPreferencesSaved?: () => void;
  activePlatform?: string;
  teacherId?: string;
  onOpenScheduleBoard?: () => void;
}

const DAYS_OF_WEEK = [
  { id: 1, name: 'Montag', short: 'Mo' },
  { id: 2, name: 'Dienstag', short: 'Di' },
  { id: 3, name: 'Mittwoch', short: 'Mi' },
  { id: 4, name: 'Donnerstag', short: 'Do' },
  { id: 5, name: 'Freitag', short: 'Fr' },
  { id: 6, name: 'Samstag', short: 'Sa' }
];

const TIME_SLOTS = [
  { start: '13:00', label: '13:00 - 13:30' },
  { start: '13:30', label: '13:30 - 14:00' },
  { start: '14:00', label: '14:00 - 14:30' },
  { start: '14:30', label: '14:30 - 15:00' },
  { start: '15:00', label: '15:00 - 15:30' },
  { start: '15:30', label: '15:30 - 16:00' },
  { start: '16:00', label: '16:00 - 16:30' },
  { start: '16:30', label: '16:30 - 17:00' },
  { start: '17:00', label: '17:00 - 17:30' },
  { start: '17:30', label: '17:30 - 18:00' },
  { start: '18:00', label: '18:00 - 18:30' },
  { start: '18:30', label: '18:30 - 19:00' },
  { start: '19:00', label: '19:00 - 19:30' },
  { start: '19:30', label: '19:30 - 20:00' }
];

export const StudentScheduleSlotsModal: React.FC<StudentScheduleSlotsModalProps> = ({
  student,
  onClose,
  onPreferencesSaved,
  activePlatform = 'campus',
  teacherId,
  onOpenScheduleBoard
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<any[]>([]);
  const [fixedSchedules, setFixedSchedules] = useState<any[]>([]);
  const [timetableAssignedAt, setTimetableAssignedAt] = useState<string | null>(student?.timetable_assigned_at || null);
  const [timetableSource, setTimetableSource] = useState<'student' | 'teacher' | null>(student?.timetable_source || null);
  
  // Teacher Manual Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [activeBrush, setActiveBrush] = useState<'wunsch' | 'gesperrt' | 'clear'>('wunsch');
  const [editedMatrix, setEditedMatrix] = useState<Record<string, 'wunsch' | 'moeglich' | 'gesperrt' | 'none'>>({});
  const [initialMatrix, setInitialMatrix] = useState<Record<string, 'wunsch' | 'moeglich' | 'gesperrt' | 'none'>>({});
  
  // Drag-to-Paint & Selection State
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [paintAction, setPaintAction] = useState<'wunsch' | 'gesperrt' | 'none'>('wunsch');
  const [lastClickedSlot, setLastClickedSlot] = useState<{ dayId: number; startTime: string } | null>(null);
  const [enforceTeacherAvailability, setEnforceTeacherAvailability] = useState(true);
  
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Hook for teacher availability
  const { availability: teacherAvailability, teacherName } = useTeacherAvailability(student);

  useEffect(() => {
    fetchStudentScheduleData();
  }, [student?.id]);

  // Global mouseup listener for seamless Drag-to-Paint
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsMouseDown(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const fetchStudentScheduleData = async () => {
    if (!student?.id) return;
    setLoading(true);
    try {
      let targetId = student.id;
      const { data: directStudent } = await supabase
        .from('students')
        .select('id')
        .eq('id', student.id)
        .maybeSingle();
      if (directStudent?.id) {
        targetId = directStudent.id;
      } else {
        const { data: userStudent } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', student.id)
          .maybeSingle();
        if (userStudent?.id) targetId = userStudent.id;
      }

      // 1. Fetch preferences from student_schedule_preferences
      const { data: prefData } = await supabase
        .from('student_schedule_preferences')
        .select('*')
        .eq('student_id', targetId);

      // 2. Fetch fixed schedules from schedules table
      const { data: schedData } = await supabase
        .from('schedules')
        .select('*')
        .eq('student_id', targetId);

      // 3. Check timetable_assigned_at & timetable_source in students table
      const { data: stRow } = await supabase
        .from('students')
        .select('timetable_assigned_at, timetable_source')
        .eq('id', targetId)
        .maybeSingle();

      if (stRow?.timetable_assigned_at) {
        setTimetableAssignedAt(stRow.timetable_assigned_at);
        setTimetableSource(stRow.timetable_source || 'student');
      }

      setPreferences(prefData || []);
      setFixedSchedules(schedData || []);

      // Build initial matrix with time string normalization ("16:00:00" -> "16:00")
      const matrix: Record<string, 'wunsch' | 'moeglich' | 'gesperrt' | 'none'> = {};
      (prefData || []).forEach((p: any) => {
        const cleanTime = (p.start_time || '').slice(0, 5);
        const key = `${p.day_of_week}_${cleanTime}`;
        matrix[key] = p.preference_type || 'wunsch';
      });
      setEditedMatrix(matrix);
      setInitialMatrix(matrix);

    } catch (err) {
      console.error('Error fetching student schedule slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const isCompleted = Boolean(
    timetableAssignedAt || 
    preferences.length > 0 || 
    fixedSchedules.length > 0
  );

  // Calculate unsaved dirty changes count
  const dirtyCount = Object.keys({ ...initialMatrix, ...editedMatrix }).filter(key => {
    const initVal = initialMatrix[key] || 'none';
    const currVal = editedMatrix[key] || 'none';
    return initVal !== currVal;
  }).length;
  const isDirty = dirtyCount > 0;

  // Teacher working hours verification per slot
  const isTeacherAvailableSlot = (dayId: number, slotStart: string) => {
    if (!teacherAvailability || Object.keys(teacherAvailability).length === 0) {
      // Default: Mo-Fr available 12:00-20:00
      return dayId >= 1 && dayId <= 5;
    }

    const dayConfig = teacherAvailability[dayId] || teacherAvailability[String(dayId)];
    if (!dayConfig) return false;

    let start = dayConfig.start || dayConfig.start_time;
    let end = dayConfig.end || dayConfig.end_time;

    if (!start && Array.isArray(dayConfig) && dayConfig.length > 0) {
      start = dayConfig[0].start || dayConfig[0].start_time;
      end = dayConfig[dayConfig.length - 1].end || dayConfig[dayConfig.length - 1].end_time;
    }

    if (!start || !end) return false;

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const [th, tm] = slotStart.split(':').map(Number);

    const startMins = sh * 60 + (sm || 0);
    const endMins = eh * 60 + (em || 0);
    const slotMins = th * 60 + (tm || 0);

    return slotMins >= startMins && slotMins < endMins;
  };

  const getSlotDetails = (dayId: number, startTime: string) => {
    const key = `${dayId}_${startTime}`;
    
    // Check fixed schedule with duration overlap
    const matchingFixed = fixedSchedules.find(s => {
      if (s.day_of_week !== dayId) return false;
      const slotStart = (s.time_slot || '').slice(0, 5);
      const [sHour, sMin] = slotStart.split(':').map(Number);
      const [cHour, cMin] = startTime.split(':').map(Number);
      if (isNaN(sHour) || isNaN(cHour)) return false;

      const sTimeVal = sHour * 60 + (sMin || 0);
      const cTimeVal = cHour * 60 + cMin;
      const sEndVal = sTimeVal + (s.duration || 30);

      return cTimeVal >= sTimeVal && cTimeVal < sEndVal;
    });

    if (matchingFixed) {
      const startStr = (matchingFixed.time_slot || '').slice(0, 5);
      const [sH, sM] = startStr.split(':').map(Number);
      const duration = matchingFixed.duration || 30;
      const endTotal = sH * 60 + sM + duration;
      const eH = Math.floor(endTotal / 60);
      const eM = endTotal % 60;
      const exactTimeStr = `${startStr}-${eH.toString().padStart(2, '0')}:${eM.toString().padStart(2, '0')}`;

      return {
        status: 'fixed',
        exactTime: exactTimeStr
      };
    }

    return {
      status: editedMatrix[key] || 'none',
      exactTime: null
    };
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  // --- INTERACTION HANDLERS: DRAG-TO-PAINT & TOGGLE ---
  const handleCellMouseDown = (e: React.MouseEvent, dayId: number, startTime: string) => {
    if (!isEditing) return;
    if (e.button !== 0) return; // Only primary click

    const key = `${dayId}_${startTime}`;
    const current = editedMatrix[key] || 'none';

    // Shift + Click: Range Fill within the same day
    if (e.shiftKey && lastClickedSlot && lastClickedSlot.dayId === dayId) {
      const startIdx = TIME_SLOTS.findIndex(s => s.start === lastClickedSlot.startTime);
      const endIdx = TIME_SLOTS.findIndex(s => s.start === startTime);
      if (startIdx !== -1 && endIdx !== -1) {
        const minI = Math.min(startIdx, endIdx);
        const maxI = Math.max(startIdx, endIdx);
        const targetBrush = activeBrush === 'clear' ? 'none' : activeBrush;
        setEditedMatrix(prev => {
          const next = { ...prev };
          for (let i = minI; i <= maxI; i++) {
            const sKey = `${dayId}_${TIME_SLOTS[i].start}`;
            next[sKey] = targetBrush;
          }
          return next;
        });
        showToast(`Bereich (${TIME_SLOTS[minI].start} - ${TIME_SLOTS[maxI].start}) ausgefüllt! ✨`);
        return;
      }
    }

    // Normal Single-Click / Start Drag
    let nextStatus: 'wunsch' | 'gesperrt' | 'none' = 'none';
    if (activeBrush === 'clear') {
      nextStatus = 'none';
    } else if (current === activeBrush) {
      nextStatus = 'none';
    } else {
      nextStatus = activeBrush;
    }

    setIsMouseDown(true);
    setPaintAction(nextStatus);
    setLastClickedSlot({ dayId, startTime });
    setEditedMatrix(prev => ({
      ...prev,
      [key]: nextStatus
    }));
  };

  const handleCellMouseEnter = (dayId: number, startTime: string) => {
    if (!isEditing || !isMouseDown) return;
    const key = `${dayId}_${startTime}`;
    setEditedMatrix(prev => ({
      ...prev,
      [key]: paintAction
    }));
  };

  const handleCellRightClick = (e: React.MouseEvent, dayId: number, startTime: string) => {
    e.preventDefault();
    if (!isEditing) return;
    const key = `${dayId}_${startTime}`;
    setEditedMatrix(prev => ({
      ...prev,
      [key]: 'none'
    }));
    showToast('Slot freigegeben');
  };

  const handleColumnHeaderClick = (dayId: number) => {
    if (!isEditing) return;

    const allMatchBrush = TIME_SLOTS.every(slot => {
      const key = `${dayId}_${slot.start}`;
      return (editedMatrix[key] || 'none') === (activeBrush === 'clear' ? 'none' : activeBrush);
    });

    const targetStatus = allMatchBrush ? 'none' : (activeBrush === 'clear' ? 'none' : activeBrush);
    const dayName = DAYS_OF_WEEK.find(d => d.id === dayId)?.name || 'Tag';

    setEditedMatrix(prev => {
      const updated = { ...prev };
      TIME_SLOTS.forEach(slot => {
        const key = `${dayId}_${slot.start}`;
        updated[key] = targetStatus;
      });
      return updated;
    });

    showToast(targetStatus === 'none' 
      ? `${dayName} zurückgesetzt (alle Slots frei)` 
      : `${dayName} vollständig ${targetStatus === 'gesperrt' ? 'geblockt' : 'als Wunschzeit markiert'}! ⚡`
    );
  };

  // --- SMART PRESETS FOR RAPID TELEPHONE / INTAKE ---
  const applyPresetAfternoon14 = () => {
    setEditedMatrix(prev => {
      const next = { ...prev };
      DAYS_OF_WEEK.filter(d => d.id <= 5).forEach(day => {
        TIME_SLOTS.forEach(slot => {
          const [h, m] = slot.start.split(':').map(Number);
          const slotMins = h * 60 + m;
          if (slotMins >= 14 * 60) {
            const isAvailable = !enforceTeacherAvailability || isTeacherAvailableSlot(day.id, slot.start);
            if (isAvailable) {
              next[`${day.id}_${slot.start}`] = 'wunsch';
            }
          }
        });
      });
      return next;
    });
    showToast("⚡ Mo–Fr ab 14:00 Uhr als Wunschzeit gesetzt!");
  };

  const applyPresetAfternoon16 = () => {
    setEditedMatrix(prev => {
      const next = { ...prev };
      DAYS_OF_WEEK.filter(d => d.id <= 5).forEach(day => {
        TIME_SLOTS.forEach(slot => {
          const [h, m] = slot.start.split(':').map(Number);
          const slotMins = h * 60 + m;
          if (slotMins >= 16 * 60) {
            const isAvailable = !enforceTeacherAvailability || isTeacherAvailableSlot(day.id, slot.start);
            if (isAvailable) {
              next[`${day.id}_${slot.start}`] = 'wunsch';
            }
          }
        });
      });
      return next;
    });
    showToast("⚡ Mo–Fr ab 16:00 Uhr als Wunschzeit gesetzt!");
  };

  const applyReset = () => {
    setEditedMatrix({ ...initialMatrix });
    showToast("Änderungen verworfen ↺");
  };

  const applyClearAll = () => {
    setEditedMatrix({});
    showToast("Alle Zeitfenster geleert 🗑️");
  };

  const getValidStudentId = async (): Promise<string> => {
    if (!student?.id) throw new Error("Kein Schüler-Objekt vorhanden.");

    const { data: directStudent } = await supabase
      .from('students')
      .select('id')
      .eq('id', student.id)
      .maybeSingle();
    if (directStudent?.id) return directStudent.id;

    const { data: userStudent } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', student.id)
      .maybeSingle();
    if (userStudent?.id) return userStudent.id;

    const { data: createdStudent, error: createErr } = await supabase
      .from('students')
      .insert({
        id: student.id,
        school_id: student.school_id || null,
        teacher_id: student.teacher_id || teacherId || null,
        instrument: student.instrument || 'Musiker',
        status: 'ausstehend'
      })
      .select('id')
      .maybeSingle();

    if (createdStudent?.id) return createdStudent.id;
    if (createErr) throw createErr;

    return student.id;
  };

  const handleSavePreferences = async () => {
    if (!student?.id) return;
    setSaving(true);
    try {
      const validStudentId = await getValidStudentId();

      const slotsToInsert: any[] = [];
      Object.entries(editedMatrix).forEach(([key, val]) => {
        if (val !== 'none') {
          const [dayStr, startTime] = key.split('_');
          const day = parseInt(dayStr);
          const [h, m] = startTime.split(':').map(Number);
          let endH = h;
          let endM = (m || 0) + 30;
          if (endM >= 60) {
            endH += 1;
            endM -= 60;
          }
          const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00`;
          const formattedStartTime = `${startTime.slice(0, 5)}:00`;

          slotsToInsert.push({
            student_id: validStudentId,
            day_of_week: day,
            start_time: formattedStartTime,
            end_time: endTime,
            preference_type: val
          });
        }
      });

      // 1. Delete existing preferences
      await supabase
        .from('student_schedule_preferences')
        .delete()
        .eq('student_id', validStudentId);

      // 2. Insert new preferences if any
      if (slotsToInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from('student_schedule_preferences')
          .insert(slotsToInsert);
        if (insertErr) throw insertErr;
      }

      // 3. Mark timetable_assigned_at & set timetable_source to 'teacher'
      const nowIso = new Date().toISOString();
      await supabase
        .from('students')
        .update({ 
          timetable_assigned_at: nowIso,
          timetable_source: 'teacher'
        })
        .eq('id', validStudentId);

      setTimetableAssignedAt(nowIso);
      setTimetableSource('teacher');
      setPreferences(slotsToInsert);
      setInitialMatrix({ ...editedMatrix });
      setIsEditing(false);

      showToast("Stundenplan-Präferenzen erfolgreich gespeichert! (Quelle: Lehrkraft)");

      if (onPreferencesSaved) {
        onPreferencesSaved();
      }
    } catch (err: any) {
      console.error('Failed to save schedule preferences:', err);
      showToast("Fehler beim Speichern: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyOnboardingLink = () => {
    const token = student?.qr_token || student?.id;
    const onboardingUrl = `${window.location.origin}/onboarding/${token}?platform=${activePlatform}`;
    navigator.clipboard.writeText(onboardingUrl);
    showToast("Onboarding-Link in Zwischenablage kopiert!");
  };

  const handleSafeClose = () => {
    if (isEditing && isDirty) {
      if (window.confirm("Du hast ungespeicherte Änderungen. Möchtest du wirklich schließen?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const isGroove = activePlatform === 'groovelab';
  const isAdminOrSec = activePlatform === 'admin' || activePlatform === 'secretariat';

  const brandColor = isGroove ? '#eab308' : (isAdminOrSec ? '#ea4335' : '#34a853');
  const brandBgLight = isGroove ? '#fefce8' : (isAdminOrSec ? '#fff1f2' : '#f0fdf4');
  const brandBorder = isGroove ? '#fef08a' : (isAdminOrSec ? '#fecaca' : '#bbf7d0');
  const brandText = isGroove ? '#854d0e' : (isAdminOrSec ? '#991b1b' : '#166534');
  const brandButtonTextColor = isGroove ? '#1e293b' : '#ffffff';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div 
        className="glass-panel animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '94vh',
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 70px -15px rgba(15, 23, 42, 0.18), 0 0 1px rgba(15, 23, 42, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: isCompleted ? brandBgLight : '#fefce8',
              color: isCompleted ? brandColor : '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${isCompleted ? brandBorder : '#fef08a'}`
            }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                  Stundenplan-Zeitfenster
                </h3>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: isCompleted ? brandBgLight : '#fefce8',
                  color: isCompleted ? brandText : '#b45309',
                  border: `1px solid ${isCompleted ? brandBorder : '#fef08a'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {isCompleted ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                  {isCompleted ? 'Onboarding Abgeschlossen' : 'Warte auf Rückmeldung'}
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                Schüler: <strong style={{ color: '#0f172a', fontWeight: 700 }}>{student?.first_name} {student?.last_name ? (student.last_name.length === 1 ? `${student.last_name}.` : student.last_name) : ''}</strong> ({student?.instrument || 'Gitarre'})
                {teacherName && (
                  <span style={{ marginLeft: '6px', color: '#94a3b8' }}>• Lehrkraft: <strong style={{ color: '#475569' }}>{teacherName}</strong></span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={handleSafeClose}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s'
            }}
            className="hover-scale-mini"
            title="Schließen"
          >
            <X size={16} />
          </button>
        </div>

        {/* Toast Notification Banner */}
        {toastMsg && (
          <div style={{
            background: '#0f172a',
            color: 'white',
            padding: '8px 16px',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-in-out'
          }}>
            <Sparkles size={15} color={brandColor} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '16px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', background: '#ffffff' }}>
          
          {/* Integrated Control & Provenance Bar */}
          <div style={{
            padding: '12px 16px',
            borderRadius: '14px',
            background: isEditing ? '#f8fafc' : '#f8fafc',
            border: isEditing ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: isEditing ? '12px' : '0'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {/* Provenance Status Indicator: Student vs. Teacher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '240px', flex: 1 }}>
                {isCompleted ? (
                  timetableSource === 'teacher' ? (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1e40af',
                      fontSize: '0.78rem',
                      fontWeight: 700
                    }}>
                      <Edit3 size={13} color="#2563eb" />
                      <span>Manuell angepasst durch Lehrkraft</span>
                      {timetableAssignedAt && (
                        <span style={{ color: '#60a5fa', fontWeight: 600 }}>
                          ({new Date(timetableAssignedAt).toLocaleDateString('de-DE')})
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      color: '#166534',
                      fontSize: '0.78rem',
                      fontWeight: 700
                    }}>
                      <GraduationCap size={14} color="#16a34a" />
                      <span>Übermittelt von Schüler / Eltern</span>
                      {timetableAssignedAt && (
                        <span style={{ color: '#4ade80', fontWeight: 600 }}>
                          ({new Date(timetableAssignedAt).toLocaleDateString('de-DE')})
                        </span>
                      )}
                    </div>
                  )
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontSize: '0.8rem', fontWeight: 600 }}>
                    <Clock size={15} color="#d97706" />
                    <span>Noch keine Zeiten übermittelt</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Copy Link & Edit Mode Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleCopyOnboardingLink}
                  style={{
                    background: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '6px 12px',
                    borderRadius: '9px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s'
                  }}
                  className="hover-scale-mini"
                  title="Onboarding-Link in Zwischenablage kopieren"
                >
                  <Copy size={13} color="#64748b" /> Onboarding-Link kopieren
                </button>

                <button
                  onClick={() => {
                    if (isEditing && isDirty) {
                      if (window.confirm("Modus beenden und ungespeicherte Änderungen verwerfen?")) {
                        applyReset();
                        setIsEditing(false);
                      }
                    } else {
                      setIsEditing(!isEditing);
                    }
                  }}
                  style={{
                    background: isEditing ? '#f1f5f9' : brandColor,
                    color: isEditing ? '#334155' : brandButtonTextColor,
                    border: isEditing ? '1px solid #cbd5e1' : 'none',
                    padding: '6px 14px',
                    borderRadius: '9px',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: !isEditing ? `0 2px 8px ${brandColor}35` : 'none',
                    transition: 'all 0.15s'
                  }}
                  className="hover-scale-mini"
                >
                  {isEditing ? <Check size={14} /> : <Edit3 size={13} color={brandButtonTextColor} />}
                  <span>{isEditing ? 'Modus beenden' : 'Manuell eintragen'}</span>
                </button>
              </div>
            </div>

            {/* Smart Presets & Brush Selection Toolbar when editing */}
            {isEditing && (
              <div style={{
                background: '#ffffff',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {/* Upper Row: Brushes & Quick Painting Tool */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.76rem', fontWeight: 800 }}>
                      Werkzeug:
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setActiveBrush('wunsch')}
                        style={{
                          padding: '5px 11px',
                          borderRadius: '8px',
                          border: activeBrush === 'wunsch' ? '1.5px solid #16a34a' : '1px solid #bbf7d0',
                          background: activeBrush === 'wunsch' ? '#dcfce7' : '#ffffff',
                          color: '#15803d',
                          fontWeight: 800,
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: activeBrush === 'wunsch' ? '0 1px 4px rgba(22, 163, 74, 0.15)' : 'none'
                        }}
                      >
                        <Star size={12} fill="#22c55e" color="#16a34a" /> Wunschzeit
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveBrush('gesperrt')}
                        style={{
                          padding: '5px 11px',
                          borderRadius: '8px',
                          border: activeBrush === 'gesperrt' ? '1.5px solid #dc2626' : '1px solid #fecaca',
                          background: activeBrush === 'gesperrt' ? '#fee2e2' : '#ffffff',
                          color: '#991b1b',
                          fontWeight: 800,
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: activeBrush === 'gesperrt' ? '0 1px 4px rgba(220, 38, 38, 0.15)' : 'none'
                        }}
                      >
                        <Ban size={12} color="#ef4444" /> Geblockt
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveBrush('clear')}
                        style={{
                          padding: '5px 11px',
                          borderRadius: '8px',
                          border: activeBrush === 'clear' ? '1.5px solid #475569' : '1px solid #cbd5e1',
                          background: activeBrush === 'clear' ? '#f1f5f9' : '#ffffff',
                          color: '#475569',
                          fontWeight: 800,
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Eraser size={12} color="#64748b" /> Frei (Löschen)
                      </button>
                    </div>
                  </div>

                  {/* Teacher Corridor Filter Toggle */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 650, color: '#475569' }}>
                    <input 
                      type="checkbox"
                      checked={enforceTeacherAvailability}
                      onChange={(e) => setEnforceTeacherAvailability(e.target.checked)}
                      style={{ accentColor: brandColor, cursor: 'pointer' }}
                    />
                    <span>Lehrer-Präsenz beachten</span>
                  </label>
                </div>

                {/* Lower Row: Smart Presets Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  paddingTop: '6px',
                  borderTop: '1px solid #f1f5f9',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Zap size={11} color="#eab308" /> Schnellauswahl:
                    </span>
                    <button
                      type="button"
                      onClick={applyPresetAfternoon14}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      className="hover-scale-mini"
                      title="Setzt Mo–Fr ab 14:00 Uhr alle verfügbaren Slots auf Wunschzeit"
                    >
                      ⚡ Mo–Fr ab 14:00
                    </button>
                    <button
                      type="button"
                      onClick={applyPresetAfternoon16}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      className="hover-scale-mini"
                      title="Setzt Mo–Fr ab 16:00 Uhr alle verfügbaren Slots auf Wunschzeit"
                    >
                      ⚡ Mo–Fr ab 16:00
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isDirty && (
                      <button
                        type="button"
                        onClick={applyReset}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#64748b',
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        className="hover-scale-mini"
                        title="Verwirft ungespeicherte Änderungen dieser Sitzung"
                      >
                        <RotateCcw size={11} /> Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={applyClearAll}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        background: '#fff1f2',
                        color: '#b91c1c',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      className="hover-scale-mini"
                      title="Alle Slots zurücksetzen"
                    >
                      <Trash2 size={11} /> Alles leeren
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Legend Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', letterSpacing: '-0.01em' }}>
              Wochenraster {isEditing && <span style={{ color: brandColor, fontWeight: 700 }}>• Klicken & Ziehen zum Markieren</span>}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.74rem', fontWeight: 600, color: '#64748b', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#15803d' }} />
                <span>Gebucht</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                <span>Wunsch</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff', border: '1px solid #cbd5e1' }} />
                <span>Frei</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                <span>Geblockt</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'repeating-linear-gradient(135deg, #e2e8f0, #e2e8f0 2px, #ffffff 2px, #ffffff 4px)' }} />
                <span>Lehrer frei</span>
              </div>
            </div>
          </div>

          {/* Schedule Grid Matrix */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>
              Zeitfenster werden geladen...
            </div>
          ) : (
            <div 
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                overflowX: 'auto',
                maxHeight: '480px',
                overflowY: 'auto',
                background: '#ffffff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                userSelect: isEditing ? 'none' : 'auto',
                WebkitUserSelect: isEditing ? 'none' : 'auto'
              }}
            >
              {/* Header Row */}
              <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 5,
                display: 'grid',
                gridTemplateColumns: '95px repeat(6, 1fr)',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                fontWeight: 800,
                fontSize: '0.78rem',
                color: '#334155',
                textAlign: 'center'
              }}>
                <div style={{ padding: '10px 4px', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>Zeit</div>
                {DAYS_OF_WEEK.map(day => (
                  <div 
                    key={day.id} 
                    onClick={() => handleColumnHeaderClick(day.id)}
                    role={isEditing ? 'button' : undefined}
                    tabIndex={isEditing ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (isEditing && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleColumnHeaderClick(day.id);
                      }
                    }}
                    style={{ 
                      padding: '10px 4px', 
                      borderRight: day.id === 6 ? 'none' : '1px solid #e2e8f0', 
                      background: isEditing ? '#f1f5f9' : '#f8fafc',
                      cursor: isEditing ? 'pointer' : 'default',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      transition: 'all 0.15s'
                    }}
                    className={isEditing ? 'hover-scale-mini' : ''}
                    title={isEditing ? `Klick auf ${day.name}: Gesamte Spalte umschalten` : day.name}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <span>{day.name}</span>
                      {isEditing && (
                        <Sliders size={9} color="#64748b" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Slot Rows */}
              {TIME_SLOTS.map(slot => (
                <div key={slot.start} style={{
                  display: 'grid',
                  gridTemplateColumns: '95px repeat(6, 1fr)',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: '0.76rem'
                }}>
                  <div style={{
                    padding: '4px',
                    borderRight: '1px solid #f1f5f9',
                    background: '#fafafa',
                    fontWeight: 700,
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem'
                  }}>
                    {slot.label}
                  </div>

                  {DAYS_OF_WEEK.map(day => {
                    const { status, exactTime } = getSlotDetails(day.id, slot.start);
                    const isTeacherAvailable = isTeacherAvailableSlot(day.id, slot.start);
                    
                    let bg = '#ffffff';
                    let border = '1px solid transparent';
                    let textColor = '#64748b';
                    let icon = null;
                    let labelText = '';

                    if (status === 'fixed') {
                      bg = '#15803d';
                      textColor = '#ffffff';
                      labelText = exactTime || 'Gebucht';
                      icon = <Check size={11} color="white" />;
                    } else if (status === 'wunsch') {
                      bg = '#f0fdf4';
                      border = '1px solid #bbf7d0';
                      textColor = '#166534';
                      labelText = 'Wunsch';
                      icon = <Star size={11} fill="#22c55e" color="#16a34a" />;
                    } else if (status === 'moeglich') {
                      bg = '#ffffff';
                      border = '1px solid #f1f5f9';
                      textColor = '#64748b';
                      labelText = 'Möglich';
                      icon = <Check size={10} color="#94a3b8" />;
                    } else if (status === 'gesperrt') {
                      bg = '#fef2f2';
                      border = '1px solid #fecaca';
                      textColor = '#991b1b';
                      labelText = 'Geblockt';
                      icon = <Ban size={11} color="#dc2626" />;
                    } else if (!isTeacherAvailable && enforceTeacherAvailability) {
                      // Hatched pattern when teacher is not available during this slot
                      bg = 'repeating-linear-gradient(135deg, #f8fafc, #f8fafc 4px, #f1f5f9 4px, #f1f5f9 8px)';
                    }

                    return (
                      <div
                        key={day.id}
                        role="gridcell"
                        tabIndex={isEditing && status !== 'fixed' ? 0 : -1}
                        aria-label={`${day.name} ${slot.label}: ${labelText || (isTeacherAvailable ? 'Frei' : 'Lehrer abwesend')}`}
                        onMouseDown={(e) => status !== 'fixed' && handleCellMouseDown(e, day.id, slot.start)}
                        onMouseEnter={() => status !== 'fixed' && handleCellMouseEnter(day.id, slot.start)}
                        onContextMenu={(e) => status !== 'fixed' && handleCellRightClick(e, day.id, slot.start)}
                        onKeyDown={(e) => {
                          if (isEditing && status !== 'fixed' && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            handleCellMouseDown(e as any, day.id, slot.start);
                          }
                        }}
                        style={{
                          padding: '4px 2px',
                          borderRight: day.id === 6 ? 'none' : '1px solid #f8fafc',
                          background: bg,
                          color: textColor,
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                          cursor: isEditing ? (status === 'fixed' ? 'not-allowed' : 'pointer') : 'default',
                          transition: 'background 0.1s ease',
                          minHeight: '36px',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          boxSizing: 'border-box',
                          outline: border !== '1px solid transparent' ? border : 'none',
                          outlineOffset: '-2px'
                        }}
                        className={isEditing && status !== 'fixed' ? 'hover-scale-mini' : ''}
                        title={
                          status === 'fixed' 
                            ? `Bereits gebuchter Unterricht (${exactTime || slot.label})` 
                            : (!isTeacherAvailable && enforceTeacherAvailability 
                                ? `${teacherName || 'Lehrkraft'} unterrichtet zu dieser Zeit regulär nicht.` 
                                : `${day.name} ${slot.label}`)
                        }
                      >
                        {icon}
                        {labelText && (
                          <span style={{
                            fontSize: status === 'fixed' ? '0.64rem' : '0.68rem',
                            lineHeight: '1.05',
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                          }}>
                            {labelText}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Actions & Sticky Dirty State Bar */}
        <div style={{
          padding: '12px 22px',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div>
            {onOpenScheduleBoard && (
              <button
                onClick={() => {
                  onClose();
                  onOpenScheduleBoard();
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
                className="hover-scale-mini"
              >
                <ExternalLink size={13} color="#475569" />
                <span>Im Stundenplaner öffnen</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Dirty Changes Badge */}
            {isEditing && isDirty && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '8px',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                color: '#92400e',
                fontSize: '0.74rem',
                fontWeight: 750
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }} />
                {dirtyCount} {dirtyCount === 1 ? 'Änderung ungespeichert' : 'Änderungen ungespeichert'}
              </span>
            )}

            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={applyReset}
                  disabled={saving || !isDirty}
                  style={{
                    background: '#ffffff',
                    color: isDirty ? '#475569' : '#94a3b8',
                    border: '1px solid #cbd5e1',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: isDirty ? 'pointer' : 'not-allowed',
                    opacity: isDirty ? 1 : 0.6,
                    transition: 'all 0.15s'
                  }}
                  className={isDirty ? 'hover-scale-mini' : ''}
                >
                  Verwerfen
                </button>

                <button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={saving || !isDirty}
                  style={{
                    background: brandColor,
                    color: brandButtonTextColor,
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: isDirty ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isDirty ? `0 2px 10px ${brandColor}40` : 'none',
                    opacity: isDirty ? 1 : 0.6,
                    transition: 'all 0.15s'
                  }}
                  className={isDirty ? 'hover-scale-mini' : ''}
                >
                  <Save size={14} />
                  <span>{saving ? 'Speichert...' : 'Änderungen speichern'}</span>
                </button>
              </>
            )}

            {!isEditing && (
              <button
                onClick={handleSafeClose}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                className="hover-scale-mini"
              >
                Schließen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
