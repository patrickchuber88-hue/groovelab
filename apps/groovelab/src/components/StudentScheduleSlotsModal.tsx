import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Star, 
  ThumbsUp, 
  Ban, 
  Save, 
  Copy, 
  ExternalLink,
  Sparkles,
  Edit3,
  Check,
  Share2,
  Link as LinkIcon,
  Eraser,
  Sliders
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
  
  // Teacher Manual Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [activeBrush, setActiveBrush] = useState<'wunsch' | 'gesperrt' | 'clear'>('wunsch');
  const [editedMatrix, setEditedMatrix] = useState<Record<string, 'wunsch' | 'moeglich' | 'gesperrt' | 'none'>>({});
  const [rangeStart, setRangeStart] = useState<{ dayId: number; startTime: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentScheduleData();
  }, [student?.id]);

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

      // 3. Check timetable_assigned_at in students / users
      const { data: stRow } = await supabase
        .from('students')
        .select('timetable_assigned_at')
        .eq('id', targetId)
        .maybeSingle();

      if (stRow?.timetable_assigned_at) {
        setTimetableAssignedAt(stRow.timetable_assigned_at);
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

  const getSlotStatus = (dayId: number, startTime: string) => {
    const key = `${dayId}_${startTime}`;
    
    // Check fixed schedule with duration overlap
    const isFixed = fixedSchedules.some(s => {
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

    if (isFixed) return 'fixed';

    return editedMatrix[key] || 'none';
  };

  const handleColumnHeaderClick = (dayId: number) => {
    if (!isEditing) return;

    // Check if all slots in this day column already have activeBrush status
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

    setRangeStart(null);
    setToastMsg(targetStatus === 'none' 
      ? `${dayName} zurückgesetzt (alle Slots frei)` 
      : `${dayName} vollständig ${targetStatus === 'gesperrt' ? 'geblockt' : 'als Wunschzeit markiert'}! ⚡`
    );
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCellClick = (dayId: number, startTime: string) => {
    if (!isEditing) return;
    const key = `${dayId}_${startTime}`;
    const current = editedMatrix[key] || 'none';

    let nextStatus: 'wunsch' | 'moeglich' | 'gesperrt' | 'none' = 'none';
    if (activeBrush === 'clear') {
      nextStatus = 'none';
    } else if (current === activeBrush && !rangeStart) {
      nextStatus = 'none';
    } else {
      nextStatus = activeBrush;
    }

    if (!rangeStart) {
      // 1. First click: set range start marker
      setRangeStart({ dayId, startTime });
      setEditedMatrix(prev => ({
        ...prev,
        [key]: nextStatus
      }));
      setToastMsg(`Start-Slot (${startTime}) gewählt. Klicke auf den Ziel-Slot, um den Bereich auszufüllen.`);
      setTimeout(() => setToastMsg(null), 4000);
    } else {
      // 2. Second click: fill range from rangeStart to current slot
      const startDay = rangeStart.dayId;
      const endDay = dayId;
      const minDay = Math.min(startDay, endDay);
      const maxDay = Math.max(startDay, endDay);

      const startSlotIdx = TIME_SLOTS.findIndex(s => s.start === rangeStart.startTime);
      const endSlotIdx = TIME_SLOTS.findIndex(s => s.start === startTime);
      const minSlotIdx = Math.min(startSlotIdx, endSlotIdx);
      const maxSlotIdx = Math.max(startSlotIdx, endSlotIdx);

      setEditedMatrix(prev => {
        const updated = { ...prev };
        for (let d = minDay; d <= maxDay; d++) {
          for (let s = minSlotIdx; s <= maxSlotIdx; s++) {
            const slotKey = `${d}_${TIME_SLOTS[s].start}`;
            updated[slotKey] = nextStatus;
          }
        }
        return updated;
      });

      setRangeStart(null);
      setToastMsg(`Bereich (${TIME_SLOTS[minSlotIdx].start} - ${TIME_SLOTS[maxSlotIdx].start}) ausgefüllt! ✨`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const handleCellRightClick = (e: React.MouseEvent, dayId: number, startTime: string) => {
    e.preventDefault();
    if (!isEditing) return;
    const key = `${dayId}_${startTime}`;
    setEditedMatrix(prev => ({
      ...prev,
      [key]: 'none'
    }));
    setRangeStart(null);
    setToastMsg('Slot zurückgesetzt (Frei)');
    setTimeout(() => setToastMsg(null), 2000);
  };

  const getValidStudentId = async (): Promise<string> => {
    if (!student?.id) throw new Error("Kein Schüler-Objekt vorhanden.");

    // 1. Direct ID match in students table
    const { data: directStudent } = await supabase
      .from('students')
      .select('id')
      .eq('id', student.id)
      .maybeSingle();
    if (directStudent?.id) return directStudent.id;

    // 2. User ID match in students table
    const { data: userStudent } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', student.id)
      .maybeSingle();
    if (userStudent?.id) return userStudent.id;

    // 3. Auto-create student row if missing in students table
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

    // 4. Fallback if explicit ID insert fails
    const { data: autoStudent, error: autoErr } = await supabase
      .from('students')
      .insert({
        school_id: student.school_id || null,
        teacher_id: student.teacher_id || teacherId || null,
        instrument: student.instrument || 'Musiker',
        status: 'ausstehend'
      })
      .select('id')
      .maybeSingle();

    if (autoStudent?.id) return autoStudent.id;
    if (autoErr) throw autoErr;
    if (createErr) throw createErr;

    return student.id;
  };

  const handleSavePreferences = async () => {
    if (!student?.id) return;
    setSaving(true);
    try {
      const validStudentId = await getValidStudentId();

      // Build slots array for insertion
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

      // 3. Mark timetable_assigned_at timestamp
      const nowIso = new Date().toISOString();
      await supabase
        .from('students')
        .update({ timetable_assigned_at: nowIso })
        .eq('id', validStudentId);

      setTimetableAssignedAt(nowIso);
      setPreferences(slotsToInsert);
      setIsEditing(false);

      showToast("Stundenplan-Präferenzen erfolgreich gespeichert!");

      if (onPreferencesSaved) {
        onPreferencesSaved();
      }
    } catch (err: any) {
      console.error('Failed to save schedule preferences:', err);
      showToast("Fehler beim Speichern der Präferenzen: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCopyOnboardingLink = () => {
    const token = student?.qr_token || student?.id;
    const onboardingUrl = `${window.location.origin}/onboarding/${token}?platform=${activePlatform}`;
    navigator.clipboard.writeText(onboardingUrl);
    showToast("Onboarding-Link in Zwischenablage kopiert!");
  };

  const isGroove = activePlatform === 'groovelab';
  const isAdminOrSec = activePlatform === 'admin' || activePlatform === 'secretariat';

  const brandColor = isGroove ? '#eab308' : (isAdminOrSec ? '#ea4335' : '#34a853');
  const brandBgLight = isGroove ? '#fefce8' : (isAdminOrSec ? '#fff1f2' : '#f0fdf4');
  const brandBorder = isGroove ? '#fef08a' : (isAdminOrSec ? '#fecaca' : '#bbf7d0');
  const brandText = isGroove ? '#854d0e' : (isAdminOrSec ? '#991b1b' : '#166534');
  const brandButtonTextColor = isGroove ? '#1e293b' : '#ffffff';

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
          maxWidth: '800px',
          maxHeight: '92vh',
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
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: isCompleted ? brandBgLight : '#fefce8',
              color: isCompleted ? brandColor : '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${isCompleted ? brandBorder : '#fef08a'}`
            }}>
              <Calendar size={19} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
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

        {/* Toast Notification */}
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
            justifyContent: 'center'
          }}>
            <Sparkles size={15} color={brandColor} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '16px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', background: '#ffffff' }}>
          
          {/* Integrated Compact Control & Action Bar */}
          <div style={{
            padding: '12px 16px',
            borderRadius: '14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: isEditing ? '10px' : '0'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {/* Status Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px', flex: 1 }}>
                {isCompleted ? (
                  <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                ) : (
                  <Clock size={16} color="#d97706" style={{ flexShrink: 0 }} />
                )}
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                  {isCompleted ? (
                    <span>
                      Zeitfenster übermittelt
                      {timetableAssignedAt && (
                        <span style={{ color: '#64748b', fontWeight: 500, marginLeft: '4px' }}>
                          ({new Date(timetableAssignedAt).toLocaleDateString('de-DE')})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span style={{ color: '#b45309' }}>Noch keine Zeiten übermittelt</span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Copy Link & Edit */}
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
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    background: isEditing ? brandColor : '#ffffff',
                    color: isEditing ? brandButtonTextColor : '#0f172a',
                    border: isEditing ? 'none' : '1px solid #cbd5e1',
                    padding: '6px 12px',
                    borderRadius: '9px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: isEditing ? `0 2px 8px ${brandColor}35` : 'none',
                    transition: 'all 0.15s'
                  }}
                  className="hover-scale-mini"
                >
                  {isEditing ? <Check size={14} /> : <Edit3 size={13} color={brandColor} />}
                  <span>{isEditing ? 'Fertig' : 'Manuell eintragen'}</span>
                </button>
              </div>
            </div>

            {/* Brush Selection Toolbar when editing */}
            {isEditing && (
              <div style={{
                background: '#ffffff',
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginTop: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.76rem', fontWeight: 700 }}>
                  <Sliders size={13} />
                  <span>Werkzeug:</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {rangeStart && (
                    <button
                      type="button"
                      onClick={() => { setRangeStart(null); setToastMsg('Bereichsauswahl abgebrochen'); setTimeout(() => setToastMsg(null), 2000); }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#64748b',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Start-Marker zurücksetzen"
                    >
                      Reset Range
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setActiveBrush('wunsch'); setRangeStart(null); }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: activeBrush === 'wunsch' ? '1.5px solid #16a34a' : '1px solid #bbf7d0',
                      background: activeBrush === 'wunsch' ? '#dcfce7' : '#ffffff',
                      color: '#15803d',
                      fontWeight: 700,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Star size={11} fill="#22c55e" color="#16a34a" /> Wunschzeit
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveBrush('gesperrt'); setRangeStart(null); }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: activeBrush === 'gesperrt' ? '1.5px solid #dc2626' : '1px solid #fecaca',
                      background: activeBrush === 'gesperrt' ? '#fee2e2' : '#ffffff',
                      color: '#991b1b',
                      fontWeight: 700,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Ban size={11} color="#ef4444" /> Geblockt
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveBrush('clear'); setRangeStart(null); }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: activeBrush === 'clear' ? '1.5px solid #475569' : '1px solid #cbd5e1',
                      background: activeBrush === 'clear' ? '#f1f5f9' : '#ffffff',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Eraser size={11} color="#64748b" /> Frei
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Legend Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', letterSpacing: '-0.01em' }}>
              Wochenraster
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }}>
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
            </div>
          </div>

          {/* Schedule Grid Matrix */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>
              Zeitfenster werden geladen...
            </div>
          ) : (
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              overflowX: 'auto',
              maxHeight: '480px',
              overflowY: 'auto',
              background: '#ffffff',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
            }}>
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
                    title={isEditing ? `Klick auf ${day.name}: Gesamte Spalte ${activeBrush === 'clear' ? 'leeren' : (activeBrush === 'gesperrt' ? 'blockieren' : 'als Wunschzeit setzen')}` : day.name}
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
                    }

                    const isRangeStartMarker = rangeStart && rangeStart.dayId === day.id && rangeStart.startTime === slot.start;

                    return (
                      <div
                        key={day.id}
                        onClick={() => handleCellClick(day.id, slot.start)}
                        onContextMenu={(e) => handleCellRightClick(e, day.id, slot.start)}
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
                          cursor: isEditing ? 'pointer' : 'default',
                          transition: 'all 0.15s',
                          minHeight: '36px',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          boxSizing: 'border-box',
                          outline: isRangeStartMarker ? '2px solid #2563eb' : (border !== '1px solid transparent' ? border : 'none'),
                          outlineOffset: '-2px',
                          boxShadow: isRangeStartMarker ? '0 0 10px rgba(37, 99, 235, 0.4)' : 'none'
                        }}
                        className={isEditing ? 'hover-scale-mini' : ''}
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

        {/* Modal Footer Actions */}
        <div style={{
          padding: '12px 22px',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
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

          <div style={{ display: 'flex', gap: '8px' }}>
            {isEditing && (
              <button
                onClick={handleSavePreferences}
                disabled={saving}
                style={{
                  background: brandColor,
                  color: brandButtonTextColor,
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: `0 2px 10px ${brandColor}35`,
                  transition: 'all 0.15s'
                }}
                className="hover-scale-mini"
              >
                <Save size={14} />
                <span>{saving ? 'Speichert...' : 'Speichern'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                padding: '8px 16px',
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
          </div>
        </div>
      </div>
    </div>
  );
};


