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
  Share2
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
  const [activeBrush, setActiveBrush] = useState<'wunsch' | 'moeglich' | 'gesperrt' | 'clear'>('wunsch');
  const [editedMatrix, setEditedMatrix] = useState<Record<string, 'wunsch' | 'moeglich' | 'gesperrt' | 'none'>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentScheduleData();
  }, [student?.id]);

  const fetchStudentScheduleData = async () => {
    if (!student?.id) return;
    setLoading(true);
    try {
      // 1. Fetch preferences from student_schedule_preferences
      const { data: prefData } = await supabase
        .from('student_schedule_preferences')
        .select('*')
        .eq('student_id', student.id);

      // 2. Fetch fixed schedules from schedules table
      const { data: schedData } = await supabase
        .from('schedules')
        .select('*')
        .eq('student_id', student.id);

      // 3. Check timetable_assigned_at in students / users
      const { data: stRow } = await supabase
        .from('students')
        .select('timetable_assigned_at')
        .eq('id', student.id)
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

  const handleCellClick = (dayId: number, startTime: string) => {
    if (!isEditing) return;
    const key = `${dayId}_${startTime}`;
    const current = editedMatrix[key] || 'none';

    let next: 'wunsch' | 'moeglich' | 'gesperrt' | 'none' = 'none';
    if (activeBrush === 'clear') {
      next = 'none';
    } else if (current === activeBrush) {
      next = 'none';
    } else {
      next = activeBrush;
    }

    setEditedMatrix(prev => ({
      ...prev,
      [key]: next
    }));
  };

  const handleSavePreferences = async () => {
    if (!student?.id) return;
    setSaving(true);
    try {
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
            student_id: student.id,
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
        .eq('student_id', student.id);

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
        .eq('id', student.id);

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

  const brandColor = activePlatform === 'groovelab' ? '#eab308' : '#34a853';

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
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div 
        className="glass-panel animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          background: 'white',
          borderRadius: '28px',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              background: isCompleted ? '#e6f4ea' : '#fefce8',
              color: isCompleted ? '#34a853' : '#eab308',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${isCompleted ? '#a7f3d0' : '#fef08a'}`
            }}>
              <Calendar size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Stundenplan-Zeitfenster
                </h3>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: isCompleted ? '#e6f4ea' : '#fefce8',
                  color: isCompleted ? '#34a853' : '#d97706',
                  border: `1px solid ${isCompleted ? '#a7f3d0' : '#fef08a'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  {isCompleted ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  {isCompleted ? 'Onboarding Abgeschlossen' : 'Warte auf Rückmeldung'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                Schüler: <strong style={{ color: '#1e293b' }}>{student?.first_name} {student?.last_name}</strong> ({student?.instrument || 'Gitarre'})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.2s'
            }}
            className="hover-scale-mini"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div style={{
            background: '#0f172a',
            color: 'white',
            padding: '10px 18px',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'center'
          }}>
            <Sparkles size={16} color={brandColor} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Status Alert Banner */}
          <div style={{
            padding: '16px 20px',
            borderRadius: '18px',
            background: isCompleted ? 'rgba(52, 168, 83, 0.08)' : 'rgba(234, 179, 8, 0.12)',
            border: `1px solid ${isCompleted ? '#a7f3d0' : '#fde047'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isCompleted ? (
                <CheckCircle2 size={22} color="#34a853" />
              ) : (
                <Clock size={22} color="#d97706" />
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isCompleted ? '#166534' : '#854d0e' }}>
                  {isCompleted 
                    ? 'Zeitfenster wurden erfolgreich vom Schüler / Lehrer übermittelt.' 
                    : 'Onboarding ausstehend: Schüler hat noch keine Zeiten übermittelt.'}
                </div>
                <div style={{ fontSize: '0.8rem', color: isCompleted ? '#15803d' : '#a16207', marginTop: '2px' }}>
                  {timetableAssignedAt 
                    ? `Abgeschlossen am: ${new Date(timetableAssignedAt).toLocaleDateString('de-DE')} um ${new Date(timetableAssignedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` 
                    : 'Lehrer kann die Daten direkt manuell hier eintragen (z. B. nach E-Mail-Mitteilung).'}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                background: isEditing ? brandColor : 'white',
                color: isEditing ? (activePlatform === 'groovelab' ? '#1e293b' : 'white') : '#334155',
                border: isEditing ? 'none' : '1px solid #cbd5e1',
                padding: '8px 14px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isEditing ? `0 4px 12px ${brandColor}30` : '0 2px 4px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
              className="hover-scale"
            >
              <Edit3 size={15} />
              <span>{isEditing ? 'Fertig mit Bearbeiten' : 'Manuell eintragen / bearbeiten'}</span>
            </button>
          </div>

          {/* Dedicated Onboarding Link Box for Fast Copy & Share */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🔗 Onboarding-Link für Schüler:
              </span>
              <span style={{ 
                fontSize: '0.84rem', 
                fontWeight: 700, 
                color: '#1e293b', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                fontFamily: 'monospace'
              }}>
                {`${window.location.origin}/onboarding/${student?.qr_token || student?.id}?platform=${activePlatform}`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyOnboardingLink}
              style={{
                background: brandColor,
                color: activePlatform === 'groovelab' ? '#1e293b' : 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: `0 2px 8px ${brandColor}30`
              }}
              className="hover-scale"
            >
              <Copy size={14} /> Link kopieren
            </button>
          </div>

          {/* Teacher Brush Selection Toolbar when editing */}
          {isEditing && (
            <div style={{
              background: '#f8fafc',
              padding: '12px 18px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>
                Klick-Werkzeug für Lehrer:
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveBrush('wunsch')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    border: activeBrush === 'wunsch' ? '2px solid #16a34a' : '1px solid #bbf7d0',
                    background: activeBrush === 'wunsch' ? '#dcfce7' : 'white',
                    color: '#15803d',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Star size={13} fill="#22c55e" /> Wunschzeit (Grün)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBrush('moeglich')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    border: activeBrush === 'moeglich' ? '2px solid #64748b' : '1px solid #cbd5e1',
                    background: activeBrush === 'moeglich' ? '#ffffff' : '#f8fafc',
                    color: '#334155',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: activeBrush === 'moeglich' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  <ThumbsUp size={13} color="#64748b" /> Möglich (Frei)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBrush('gesperrt')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    border: activeBrush === 'gesperrt' ? '2px solid #dc2626' : '1px solid #fecaca',
                    background: activeBrush === 'gesperrt' ? '#fee2e2' : 'white',
                    color: '#991b1b',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Ban size={13} color="#ef4444" /> Geblockt (Rot)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBrush('clear')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    border: activeBrush === 'clear' ? '2px solid #475569' : '1px solid #cbd5e1',
                    background: activeBrush === 'clear' ? '#f1f5f9' : 'white',
                    color: '#475569',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  🧹 Löschen
                </button>
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#15803d' }} />
              <span>Fest gebuchte Lektion</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#22c55e' }} />
              <span>Wunschzeit</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#ffffff', border: '1px solid #cbd5e1' }} />
              <span>Mögliche Zeit (Frei)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#ef4444' }} />
              <span>Gesperrt / Geblockt</span>
            </div>
          </div>

          {/* Schedule Grid Matrix */}
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
              Zeitfenster werden geladen...
            </div>
          ) : (
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              overflowX: 'auto',
              maxHeight: '450px',
              overflowY: 'auto',
              background: 'white'
            }}>
              {/* Header Row */}
              <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 5,
                display: 'grid',
                gridTemplateColumns: '110px repeat(6, 1fr)',
                background: '#f1f5f9',
                borderBottom: '1px solid #e2e8f0',
                fontWeight: 800,
                fontSize: '0.82rem',
                color: '#334155',
                textAlign: 'center'
              }}>
                <div style={{ padding: '12px 8px', borderRight: '1px solid #e2e8f0', background: '#f1f5f9' }}>Uhrzeit</div>
                {DAYS_OF_WEEK.map(day => (
                  <div key={day.id} style={{ padding: '12px 8px', borderRight: day.id === 6 ? 'none' : '1px solid #e2e8f0', background: '#f1f5f9' }}>
                    {day.name}
                  </div>
                ))}
              </div>

              {/* Time Slot Rows */}
              {TIME_SLOTS.map(slot => (
                <div key={slot.start} style={{
                  display: 'grid',
                  gridTemplateColumns: '110px repeat(6, 1fr)',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: '0.8rem'
                }}>
                  <div style={{
                    padding: '8px',
                    borderRight: '1px solid #e2e8f0',
                    background: '#fafafa',
                    fontWeight: 700,
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
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
                      icon = <Check size={12} color="white" />;
                    } else if (status === 'wunsch') {
                      bg = '#dcfce7';
                      border = '1px solid #86efac';
                      textColor = '#166534';
                      labelText = 'Wunsch';
                      icon = <Star size={12} fill="#22c55e" color="#16a34a" />;
                    } else if (status === 'moeglich') {
                      bg = '#ffffff';
                      border = '1px solid #e2e8f0';
                      textColor = '#64748b';
                      labelText = 'Möglich';
                      icon = <Check size={11} color="#94a3b8" />;
                    } else if (status === 'gesperrt') {
                      bg = '#fee2e2';
                      border = '1px solid #fca5a5';
                      textColor = '#991b1b';
                      labelText = 'Geblockt';
                      icon = <Ban size={12} color="#dc2626" />;
                    }

                    return (
                      <div
                        key={day.id}
                        onClick={() => handleCellClick(day.id, slot.start)}
                        style={{
                          padding: '6px 2px',
                          borderRight: day.id === 6 ? 'none' : '1px solid #f1f5f9',
                          background: bg,
                          color: textColor,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          cursor: isEditing ? 'pointer' : 'default',
                          transition: 'all 0.15s',
                          minHeight: '46px',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          boxSizing: 'border-box'
                        }}
                        className={isEditing ? 'hover-scale-mini' : ''}
                      >
                        {icon}
                        {labelText && (
                          <span style={{
                            fontSize: status === 'fixed' ? '0.65rem' : '0.7rem',
                            lineHeight: '1.05',
                            textAlign: 'center',
                            wordBreak: 'break-word',
                            whiteSpace: 'normal',
                            padding: '0 2px'
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
          padding: '20px 28px',
          borderTop: '1px solid #f1f5f9',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {onOpenScheduleBoard && (
              <button
                onClick={() => {
                  onClose();
                  onOpenScheduleBoard();
                }}
                style={{
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  padding: '10px 16px',
                  borderRadius: '14px',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                className="hover-scale"
              >
                <ExternalLink size={15} />
                <span>Im Stundenplaner öffnen</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {isEditing && (
              <button
                onClick={handleSavePreferences}
                disabled={saving}
                style={{
                  background: brandColor,
                  color: activePlatform === 'groovelab' ? '#1e293b' : 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '14px',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: `0 4px 14px ${brandColor}35`
                }}
                className="hover-scale"
              >
                <Save size={16} />
                <span>{saving ? 'Wird gespeichert...' : 'Änderungen Speichern'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
