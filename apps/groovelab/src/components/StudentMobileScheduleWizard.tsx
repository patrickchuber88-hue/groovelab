import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Star, 
  Ban, 
  Save, 
  Sparkles, 
  Check,
  RotateCcw
} from 'lucide-react';

interface StudentMobileScheduleWizardProps {
  student: any;
  onClose: () => void;
  onPreferencesSaved?: () => void;
  activePlatform?: string;
}

const DAYS_OF_WEEK = [
  { id: 1, name: 'Mo' },
  { id: 2, name: 'Di' },
  { id: 3, name: 'Mi' },
  { id: 4, name: 'Do' },
  { id: 5, name: 'Fr' },
  { id: 6, name: 'Sa' }
];

const TIME_SLOTS = [
  { start: '10:00', label: '10:00' },
  { start: '10:30', label: '10:30' },
  { start: '11:00', label: '11:00' },
  { start: '11:30', label: '11:30' },
  { start: '12:00', label: '12:00' },
  { start: '12:30', label: '12:30' },
  { start: '13:00', label: '13:00' },
  { start: '13:30', label: '13:30' },
  { start: '14:00', label: '14:00' },
  { start: '14:30', label: '14:30' },
  { start: '15:00', label: '15:00' },
  { start: '15:30', label: '15:30' },
  { start: '16:00', label: '16:00' },
  { start: '16:30', label: '16:30' },
  { start: '17:00', label: '17:00' },
  { start: '17:30', label: '17:30' },
  { start: '18:00', label: '18:00' },
  { start: '18:30', label: '18:30' },
  { start: '19:00', label: '19:00' },
  { start: '19:30', label: '19:30' }
];

export const StudentMobileScheduleWizard: React.FC<StudentMobileScheduleWizardProps> = ({
  student,
  onClose,
  onPreferencesSaved,
  activePlatform = 'campus'
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferenceMode, setPreferenceMode] = useState<'wunsch' | 'gesperrt'>('wunsch');
  const [showSaturday, setShowSaturday] = useState(false);
  const [editedMatrix, setEditedMatrix] = useState<Record<string, 'wunsch' | 'gesperrt' | 'none'>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [teacherAvailability, setTeacherAvailability] = useState<any>(null);
  const [teacherName, setTeacherName] = useState<string>('');

  useEffect(() => {
    if (student?.id) {
      fetchStudentPreferences();
      fetchTeacherAvailability();
    }
  }, [student?.id]);

  const fetchTeacherAvailability = async () => {
    try {
      let teacherId = student?.teacher_id;
      if (!teacherId) {
        const { data: stRow } = await supabase
          .from('students')
          .select('teacher_id')
          .eq('id', student.id)
          .maybeSingle();
        if (stRow?.teacher_id) {
          teacherId = stRow.teacher_id;
        }
      }

      if (teacherId) {
        const { data: teacherUser } = await supabase
          .from('users')
          .select('first_name, last_name, teacher_availability')
          .eq('id', teacherId)
          .maybeSingle();

        if (teacherUser) {
          if (teacherUser.first_name || teacherUser.last_name) {
            setTeacherName(`${teacherUser.first_name || ''} ${teacherUser.last_name || ''}`.trim());
          }
          let avail = teacherUser.teacher_availability;
          if (typeof avail === 'string') {
            try { avail = JSON.parse(avail); } catch (e) {}
          }
          setTeacherAvailability(avail || null);
        }
      }
    } catch (err) {
      console.error('Error fetching teacher availability:', err);
    }
  };

  const isTeacherAvailableSlot = (dayId: number, slotStart: string) => {
    if (!teacherAvailability || Object.keys(teacherAvailability).length === 0) return true;
    const dayConfig = teacherAvailability[dayId] || teacherAvailability[String(dayId)];
    if (!dayConfig || !dayConfig.start || !dayConfig.end) return false;

    const [sh, sm] = dayConfig.start.split(':').map(Number);
    const [eh, em] = dayConfig.end.split(':').map(Number);
    const [th, tm] = slotStart.split(':').map(Number);

    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const slotMins = th * 60 + tm;

    return slotMins >= startMins && slotMins < endMins;
  };

  const fetchStudentPreferences = async () => {
    if (!student?.id) return;
    setLoading(true);
    try {
      const { data: prefData } = await supabase
        .from('student_schedule_preferences')
        .select('*')
        .eq('student_id', student.id);

      const matrix: Record<string, 'wunsch' | 'gesperrt' | 'none'> = {};
      let hasSaturdaySlot = false;

      (prefData || []).forEach((p: any) => {
        const cleanTime = (p.start_time || '').slice(0, 5);
        const key = `${p.day_of_week}_${cleanTime}`;
        matrix[key] = p.preference_type === 'gesperrt' ? 'gesperrt' : 'wunsch';
        if (p.day_of_week === 6) {
          hasSaturdaySlot = true;
        }
      });

      if (hasSaturdaySlot) {
        setShowSaturday(true);
      }

      setEditedMatrix(matrix);
    } catch (err) {
      console.error('Error fetching student schedule preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (dayId: number, startTime: string) => {
    const key = `${dayId}_${startTime}`;
    const current = editedMatrix[key] || 'none';

    let next: 'wunsch' | 'gesperrt' | 'none' = 'none';
    if (current === preferenceMode) {
      next = 'none';
    } else {
      next = preferenceMode;
    }

    setEditedMatrix(prev => ({
      ...prev,
      [key]: next
    }));
  };

  // Calculate selected wunsch hours (each 30-min slot is 0.5 hours)
  const totalWunschSlots = Object.values(editedMatrix).filter(val => val === 'wunsch').length;
  const selectedHours = totalWunschSlots * 0.5;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSave = async () => {
    if (!student?.id) return;
    setSaving(true);
    try {
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

      showToast("Wunschzeiten erfolgreich gespeichert!");

      if (onPreferencesSaved) {
        onPreferencesSaved();
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to save schedule preferences:', err);
      showToast("Fehler beim Speichern: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const activeColor = activePlatform === 'groovelab' ? '#eab308' : '#34a853';
  const activeDays = showSaturday ? DAYS_OF_WEEK : DAYS_OF_WEEK.filter(d => d.id <= 5);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'radial-gradient(circle at center, #052e16 0%, #022c22 100%)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div 
        className="glass-panel animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '440px',
          maxHeight: '94vh',
          background: '#ffffff',
          borderRadius: '28px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Inter, -apple-system, sans-serif'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 22px 16px 22px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          background: '#ffffff'
        }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Terminwünsche für {student?.first_name || 'Schüler'}{student?.instrument ? ` (${student.instrument})` : ''}
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35 }}>
              Wähle bevorzugte Unterrichtszeiten und sperre Zeiten, die absolut unmöglich sind.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              flexShrink: 0
            }}
            className="hover-scale-mini"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div style={{
            background: '#0f172a',
            color: 'white',
            padding: '8px 16px',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'center'
          }}>
            <Sparkles size={15} color={activeColor} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', background: '#ffffff' }}>
          
          {/* Controls Box */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: '#f8fafc',
            padding: '12px 14px',
            borderRadius: '18px',
            border: '1px solid #e2e8f0',
            fontSize: '0.8rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#475569' }}>Klick-Modus wählen:</span>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>({showSaturday ? 'Mit Samstag' : 'Nur Mo-Fr'})</span>
            </div>

            {/* Apple style segmented control */}
            <div style={{
              display: 'flex',
              background: '#e2e8f0',
              padding: '3px',
              borderRadius: '12px',
              gap: '4px'
            }}>
              <button
                type="button"
                onClick={() => setPreferenceMode('wunsch')}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '9px',
                  border: 'none',
                  background: preferenceMode === 'wunsch' ? '#34a853' : 'transparent',
                  color: preferenceMode === 'wunsch' ? '#ffffff' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Star size={13} fill={preferenceMode === 'wunsch' ? '#ffffff' : '#22c55e'} color={preferenceMode === 'wunsch' ? '#ffffff' : '#16a34a'} />
                <span>Wunschzeit 🟢</span>
              </button>
              <button
                type="button"
                onClick={() => setPreferenceMode('gesperrt')}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '9px',
                  border: 'none',
                  background: preferenceMode === 'gesperrt' ? '#ef4444' : 'transparent',
                  color: preferenceMode === 'gesperrt' ? '#ffffff' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Ban size={13} color={preferenceMode === 'gesperrt' ? '#ffffff' : '#dc2626'} />
                <span>Sperrzeit 🔴</span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
              <span style={{ color: '#475569', fontWeight: 600, fontSize: '0.78rem' }}>Samstag als Option anzeigen?</span>
              <button
                type="button"
                onClick={() => setShowSaturday(!showSaturday)}
                style={{
                  background: showSaturday ? '#34a853' : '#cbd5e1',
                  border: 'none',
                  padding: '4px 12px',
                  borderRadius: '100px',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {showSaturday ? 'Ja' : 'Nein'}
              </button>
            </div>
          </div>

          {/* Legend Banner */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            background: '#ffffff',
            border: '1.5px dashed #cbd5e1',
            padding: '8px 12px',
            borderRadius: '14px',
            fontSize: '0.72rem',
            color: '#475569',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
              <div style={{ width: '10px', height: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', flexShrink: 0 }} />
              <span style={{ fontWeight: 700, color: '#166534' }}>Regulärer Unterricht</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
              <div style={{ width: '10px', height: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', flexShrink: 0 }} />
              <span style={{ fontWeight: 700, color: '#64748b' }}>Ausweichzeit (Verlegung)</span>
            </div>
          </div>

          {/* Time Slot Grid */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600, fontSize: '0.84rem' }}>
              Wunschzeiten werden geladen...
            </div>
          ) : (
            <div style={{
              background: '#f8fafc',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              maxHeight: '340px',
              overflowY: 'auto'
            }}>
              {/* Header Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `45px repeat(${activeDays.length}, 1fr)`,
                gap: '3px',
                textAlign: 'center',
                fontWeight: 800,
                fontSize: '0.75rem',
                color: '#64748b',
                paddingBottom: '6px',
                borderBottom: '1px solid #e2e8f0',
                position: 'sticky',
                top: 0,
                background: '#f8fafc',
                zIndex: 2
              }}>
                <div>Zeit</div>
                {activeDays.map(day => {
                  const hasConfig = teacherAvailability && (teacherAvailability[day.id] || teacherAvailability[String(day.id)]);
                  const isTeacherDay = Boolean(hasConfig && hasConfig.start && hasConfig.end);
                  return (
                    <div 
                      key={day.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        color: isTeacherDay ? '#34a853' : '#64748b'
                      }}
                    >
                      <span>{day.name}</span>
                      {isTeacherDay && (
                        <span style={{ 
                          fontSize: '7px', 
                          background: '#e6f4ea', 
                          color: '#34a853', 
                          padding: '1px 3px', 
                          borderRadius: '4px',
                          fontWeight: 800,
                          border: '1px solid rgba(52, 168, 83, 0.2)'
                        }}>
                          Unterricht
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Slots Rows */}
              {TIME_SLOTS.map(slot => (
                <div key={slot.start} style={{
                  display: 'grid',
                  gridTemplateColumns: `45px repeat(${activeDays.length}, 1fr)`,
                  gap: '3px',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textAlign: 'center' }}>
                    {slot.start}
                  </div>

                  {activeDays.map(day => {
                    const key = `${day.id}_${slot.start}`;
                    const status = editedMatrix[key] || 'none';

                    const isTeacherTime = isTeacherAvailableSlot(day.id, slot.start);

                    let bg = '#ffffff';
                    let border = '1px solid #e2e8f0';
                    let icon = null;

                    if (status === 'wunsch') {
                      bg = '#f0fdf4';
                      border = '1.5px solid #86efac';
                      icon = <Star size={10} fill="#22c55e" color="#16a34a" />;
                    } else if (status === 'gesperrt') {
                      bg = '#fef2f2';
                      border = '1.5px solid #fca5a5';
                      icon = <Ban size={10} color="#dc2626" />;
                    } else if (isTeacherTime && teacherAvailability) {
                      bg = '#f4fbf7';
                      border = '1px solid #a7f3d0';
                      icon = null; // Clean slot without any icon in the center!
                    }

                    return (
                      <div
                        key={day.id}
                        onClick={() => handleCellClick(day.id, slot.start)}
                        style={{
                          height: '28px',
                          background: bg,
                          border: border,
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.1s ease',
                          boxSizing: 'border-box'
                        }}
                        className="hover-scale-mini"
                      >
                        {icon}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Live Hours Counter Badge */}
          <div style={{
            background: selectedHours >= 2.0 ? '#f0fdf4' : '#fefce8',
            border: `1px solid ${selectedHours >= 2.0 ? '#bbf7d0' : '#fef08a'}`,
            borderRadius: '14px',
            padding: '10px 14px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: selectedHours >= 2.0 ? '#166534' : '#854d0e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Clock size={16} color={selectedHours >= 2.0 ? '#16a34a' : '#d97706'} />
            <span>
              Ausgewählte Wunschzeit: <strong>{selectedHours.toFixed(1)} Std.</strong> {selectedHours < 2.0 && '(mind. 2.0 Std. empfohlen)'}
            </span>
          </div>

        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 22px',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%',
              background: activeColor,
              color: activePlatform === 'groovelab' ? '#1e293b' : '#ffffff',
              border: 'none',
              padding: '12px',
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: `0 4px 14px ${activeColor}40`
            }}
            className="hover-scale"
          >
            <Save size={16} />
            <span>{saving ? 'Wird gespeichert...' : 'Wunschtermine speichern'}</span>
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              padding: '8px',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            ZURÜCK
          </button>
        </div>

      </div>
    </div>
  );
};
