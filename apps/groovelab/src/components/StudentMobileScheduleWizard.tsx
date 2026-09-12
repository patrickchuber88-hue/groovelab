import React, { useState, useEffect, useRef } from 'react';
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
  RotateCcw,
  UserCheck
} from 'lucide-react';
import { useTeacherAvailability } from '../hooks/useTeacherAvailability';

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
  { start: '10:15', label: '10:15' },
  { start: '10:30', label: '10:30' },
  { start: '10:45', label: '10:45' },
  { start: '11:00', label: '11:00' },
  { start: '11:15', label: '11:15' },
  { start: '11:30', label: '11:30' },
  { start: '11:45', label: '11:45' },
  { start: '12:00', label: '12:00' },
  { start: '12:15', label: '12:15' },
  { start: '12:30', label: '12:30' },
  { start: '12:45', label: '12:45' },
  { start: '13:00', label: '13:00' },
  { start: '13:15', label: '13:15' },
  { start: '13:30', label: '13:30' },
  { start: '13:45', label: '13:45' },
  { start: '14:00', label: '14:00' },
  { start: '14:15', label: '14:15' },
  { start: '14:30', label: '14:30' },
  { start: '14:45', label: '14:45' },
  { start: '15:00', label: '15:00' },
  { start: '15:15', label: '15:15' },
  { start: '15:30', label: '15:30' },
  { start: '15:45', label: '15:45' },
  { start: '16:00', label: '16:00' },
  { start: '16:15', label: '16:15' },
  { start: '16:30', label: '16:30' },
  { start: '16:45', label: '16:45' },
  { start: '17:00', label: '17:00' },
  { start: '17:15', label: '17:15' },
  { start: '17:30', label: '17:30' },
  { start: '17:45', label: '17:45' },
  { start: '18:00', label: '18:00' },
  { start: '18:15', label: '18:15' },
  { start: '18:30', label: '18:30' },
  { start: '18:45', label: '18:45' },
  { start: '19:00', label: '19:00' },
  { start: '19:15', label: '19:15' },
  { start: '19:30', label: '19:30' },
  { start: '19:45', label: '19:45' }
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
  const [hoveredDayId, setHoveredDayId] = useState<number | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const slot13Ref = useRef<HTMLDivElement>(null);

  const { availability: teacherAvailability, teacherName } = useTeacherAvailability(student);

  useEffect(() => {
    if (student?.id) {
      fetchStudentPreferences();
    }
  }, [student?.id]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (slot13Ref.current) {
          slot13Ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const getTeacherDayTimeWindow = (dayId: number): string | null => {
    const activeAvail = (teacherAvailability && Object.keys(teacherAvailability).length > 0) ? teacherAvailability : {
      "1": { start: "12:00", end: "20:00" },
      "2": { start: "12:00", end: "20:00" },
      "3": { start: "12:00", end: "20:00" },
      "4": { start: "12:00", end: "20:00" },
      "5": { start: "12:00", end: "20:00" }
    };
    
    const dayConfig = activeAvail[dayId] || activeAvail[String(dayId)];
    if (!dayConfig) return null;

    let start = dayConfig.start || dayConfig.start_time;
    let end = dayConfig.end || dayConfig.end_time;

    if (!start && Array.isArray(dayConfig) && dayConfig.length > 0) {
      start = dayConfig[0].start || dayConfig[0].start_time;
      end = dayConfig[dayConfig.length - 1].end || dayConfig[dayConfig.length - 1].end_time;
    }

    if (start && end) {
      return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
    }
    return null;
  };

  const isTeacherAvailableSlot = (dayId: number, slotStart: string) => {
    const activeAvail = (teacherAvailability && Object.keys(teacherAvailability).length > 0) ? teacherAvailability : {
      "1": { start: "12:00", end: "20:00" },
      "2": { start: "12:00", end: "20:00" },
      "3": { start: "12:00", end: "20:00" },
      "4": { start: "12:00", end: "20:00" },
      "5": { start: "12:00", end: "20:00" }
    };

    const dayConfig = activeAvail[dayId] || activeAvail[String(dayId)];
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
        // Ignore legacy ankunft entries
        if (p.preference_type === 'ankunft') return;

        const startStr = (p.start_time || '').slice(0, 5);
        const endStr = (p.end_time || '').slice(0, 5);
        const prefType: 'wunsch' | 'gesperrt' = p.preference_type === 'gesperrt' ? 'gesperrt' : 'wunsch';

        if (p.day_of_week === 6) {
          hasSaturdaySlot = true;
        }

        if (startStr && endStr) {
          const [sH, sM] = startStr.split(':').map(Number);
          const [eH, eM] = endStr.split(':').map(Number);
          const startMins = sH * 60 + (sM || 0);
          const endMins = eH * 60 + (eM || 0);
          for (let m = startMins; m < endMins; m += 15) {
            const curH = Math.floor(m / 60);
            const curM = m % 60;
            const timeKey = `${curH.toString().padStart(2, '0')}:${curM.toString().padStart(2, '0')}`;
            matrix[`${p.day_of_week}_${timeKey}`] = prefType;
          }
        } else if (startStr) {
          matrix[`${p.day_of_week}_${startStr}`] = prefType;
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
    const isTeacherTime = isTeacherAvailableSlot(dayId, startTime);
    if (!isTeacherTime) {
      showToast(`Kein Unterricht: ${teacherName || 'Der Lehrer'} ist um ${startTime} Uhr nicht im Haus.`);
      return;
    }

    const key = `${dayId}_${startTime}`;
    const current = editedMatrix[key] || 'none';

    let next: 'wunsch' | 'gesperrt' | 'none' = 'none';
    if (current === preferenceMode) {
      next = 'none';
    } else {
      next = preferenceMode;
    }

    setEditedMatrix(prev => ({ ...prev, [key]: next }));

    if (next === 'wunsch') {
      showToast(`Wunschzeit um ${startTime} Uhr markiert (grün)`);
    } else if (next === 'gesperrt') {
      showToast(`Zeit um ${startTime} Uhr gesperrt (rot)`);
    } else {
      showToast(`Markierung für ${startTime} Uhr aufgehoben`);
    }
  };

  const activeDays = showSaturday ? DAYS_OF_WEEK : DAYS_OF_WEEK.filter(d => d.id <= 5);

  // Filter TIME_SLOTS to only show slots where at least one day is available for the teacher
  // or has an existing user preference (or fallback to 12:00 onwards if no teacher data is available)
  const visibleTimeSlots = TIME_SLOTS.filter(slot => {
    const isTeacherAvailAnyDay = activeDays.some(day => isTeacherAvailableSlot(day.id, slot.start));
    const hasPreferenceAnyDay = activeDays.some(day => editedMatrix[`${day.id}_${slot.start}`] && editedMatrix[`${day.id}_${slot.start}`] !== 'none');
    return isTeacherAvailAnyDay || hasPreferenceAnyDay;
  });

  const displayTimeSlots = visibleTimeSlots.length > 0 ? visibleTimeSlots : TIME_SLOTS.filter(slot => {
    const [sh, sm] = slot.start.split(':').map(Number);
    return (sh * 60 + sm) >= 12 * 60;
  });

  const handleToggleWholeDay = (dayId: number, dayName: string) => {
    const allLocked = displayTimeSlots.every(slot => 
      editedMatrix[`${dayId}_${slot.start}`] === 'gesperrt'
    );

    setEditedMatrix(prev => {
      const nextMatrix = { ...prev };
      displayTimeSlots.forEach(slot => {
        const slotKey = `${dayId}_${slot.start}`;
        if (allLocked) {
          nextMatrix[slotKey] = 'none';
        } else {
          nextMatrix[slotKey] = 'gesperrt';
        }
      });
      return nextMatrix;
    });

    showToast(allLocked ? `${dayName} wieder freigegeben ⚪` : `${dayName} komplett gesperrt 🔴`);
  };

  // Calculate selected wunsch hours (each 15-min slot is 0.25 hours)
  const totalWunschSlots = Object.values(editedMatrix).filter(val => val === 'wunsch').length;
  const selectedHours = totalWunschSlots * 0.25;

  // Calculate locked sperr hours
  const totalSperrSlots = Object.values(editedMatrix).filter(val => val === 'gesperrt').length;
  const lockedHours = totalSperrSlots * 0.25;

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
          let endM = (m || 0) + 15;
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

      // 3. Mark timetable_assigned_at timestamp and provenance source
      const nowIso = new Date().toISOString();
      await supabase
        .from('students')
        .update({ 
          timetable_assigned_at: nowIso,
          timetable_source: 'student'
        })
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

  return (
    <div 
      className="cg-bottom-sheet-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'radial-gradient(circle at center, #052e16 0%, #022c22 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        className="glass-panel cg-mobile-bottom-sheet animate-scale-up"
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
        {/* Native Pull / Drag Indicator for Mobile */}
        <div className="cg-sheet-drag-handle" />

        {/* Header */}
        <div style={{
          padding: '14px 20px 12px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Terminwünsche & Sperrzeiten
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
              {student?.first_name || 'Schüler'}{student?.instrument ? ` • ${student.instrument}` : ''}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Schließen"
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

        {/* STICKY MODE TOOLBAR (Always Visible!) */}
        <div style={{
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '10px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.04)',
          zIndex: 10
        }}>
          {/* Apple style 44px High Accessible Segmented Control */}
          <div 
            role="tablist"
            aria-label="Klickmodus für Kalenderzeiten"
            style={{
              display: 'flex',
              background: '#e2e8f0',
              padding: '4px',
              borderRadius: '14px',
              gap: '6px'
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={preferenceMode === 'wunsch'}
              onClick={() => setPreferenceMode('wunsch')}
              style={{
                flex: 1,
                minHeight: '44px',
                padding: '8px 12px',
                borderRadius: '10px',
                border: 'none',
                background: preferenceMode === 'wunsch' ? '#16a34a' : 'transparent',
                color: preferenceMode === 'wunsch' ? '#ffffff' : '#475569',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: preferenceMode === 'wunsch' ? '0 2px 8px rgba(22, 163, 74, 0.35)' : 'none'
              }}
            >
              <Star size={16} fill={preferenceMode === 'wunsch' ? '#ffffff' : '#16a34a'} color={preferenceMode === 'wunsch' ? '#ffffff' : '#16a34a'} />
              <span>Wunschzeit 🟢</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={preferenceMode === 'gesperrt'}
              onClick={() => setPreferenceMode('gesperrt')}
              style={{
                flex: 1,
                minHeight: '44px',
                padding: '8px 12px',
                borderRadius: '10px',
                border: 'none',
                background: preferenceMode === 'gesperrt' ? '#dc2626' : 'transparent',
                color: preferenceMode === 'gesperrt' ? '#ffffff' : '#475569',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: preferenceMode === 'gesperrt' ? '0 2px 8px rgba(220, 38, 38, 0.35)' : 'none'
              }}
            >
              <Ban size={16} color={preferenceMode === 'gesperrt' ? '#ffffff' : '#dc2626'} strokeWidth={2.5} />
              <span>Sperrzeit 🔴</span>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>
              Klick markiert: <strong style={{ color: preferenceMode === 'wunsch' ? '#16a34a' : '#dc2626' }}>
                {preferenceMode === 'wunsch' ? '⭐ Wunschzeiten (bevorzugt)' : '🚫 Sperrzeiten (unmöglich)'}
              </strong>
            </span>

            <button
              type="button"
              onClick={() => setShowSaturday(!showSaturday)}
              style={{
                background: showSaturday ? '#f0fdf4' : '#ffffff',
                border: `1px solid ${showSaturday ? '#86efac' : '#cbd5e1'}`,
                padding: '3px 8px',
                borderRadius: '6px',
                color: showSaturday ? '#166534' : '#475569',
                fontWeight: 750,
                fontSize: '0.70rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>Sa: {showSaturday ? 'Aktiv' : 'Aus'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '12px 14px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', background: '#ffffff' }}>
          {/* Time Slot Grid */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600, fontSize: '0.84rem' }}>
              Wunschzeiten werden geladen...
            </div>
          ) : (
            <div 
              ref={gridContainerRef}
              style={{
                background: '#f8fafc',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              {/* Sticky Days Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `45px repeat(${activeDays.length}, 1fr)`,
                gap: '3px',
                textAlign: 'center',
                fontWeight: 800,
                fontSize: '0.75rem',
                color: '#64748b',
                paddingBottom: '8px',
                borderBottom: '1px solid #e2e8f0',
                position: 'sticky',
                top: 0,
                background: '#f8fafc',
                zIndex: 5
              }}>
                <div>Zeit</div>
                {activeDays.map(day => {
                  const hasConfig = teacherAvailability && (teacherAvailability[day.id] || teacherAvailability[String(day.id)]);
                  const isTeacherDay = Boolean(hasConfig && (hasConfig.start || (Array.isArray(hasConfig) && hasConfig.length > 0)));
                  const windowStr = getTeacherDayTimeWindow(day.id);
                  const isHovered = hoveredDayId === day.id;
                  const isWholeDayLocked = displayTimeSlots.every(slot => editedMatrix[`${day.id}_${slot.start}`] === 'gesperrt');

                  return (
                    <div 
                      key={day.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${day.name} ${isWholeDayLocked ? 'wieder freigeben' : 'komplett sperren'}`}
                      onMouseEnter={() => setHoveredDayId(day.id)}
                      onMouseLeave={() => setHoveredDayId(null)}
                      onClick={() => handleToggleWholeDay(day.id, day.name)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleToggleWholeDay(day.id, day.name);
                        }
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        color: isWholeDayLocked ? '#ef4444' : (isTeacherDay ? '#16a34a' : '#64748b'),
                        cursor: 'pointer',
                        padding: '4px 1px',
                        borderRadius: '6px',
                        background: isHovered ? (isWholeDayLocked ? '#fee2e2' : '#e2e8f0') : 'transparent',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale-mini"
                      title={`${day.name} komplett sperren / freigeben`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <span>{day.name}</span>
                        {(isHovered || isWholeDayLocked) && (
                          <Ban size={10} color={isWholeDayLocked ? '#dc2626' : '#64748b'} />
                        )}
                      </div>

                      {isHovered ? (
                        <span style={{ 
                          fontSize: '6.5px', 
                          background: isWholeDayLocked ? '#16a34a' : '#dc2626', 
                          color: '#ffffff', 
                          padding: '1px 3px', 
                          borderRadius: '4px',
                          fontWeight: 800,
                          whiteSpace: 'nowrap'
                        }}>
                          {isWholeDayLocked ? 'Freigeben' : 'Sperren 🔴'}
                        </span>
                      ) : (
                        windowStr ? (
                          <span style={{ 
                            fontSize: '6.5px', 
                            background: '#e6f4ea', 
                            color: '#166534', 
                            padding: '1px 3px', 
                            borderRadius: '4px',
                            fontWeight: 700,
                            border: '1px solid rgba(52, 168, 83, 0.3)',
                            whiteSpace: 'nowrap'
                          }}>
                            {windowStr}
                          </span>
                        ) : isTeacherDay ? (
                          <span style={{ 
                            fontSize: '7px', 
                            background: '#e6f4ea', 
                            color: '#16a34a', 
                            padding: '1px 3px', 
                            borderRadius: '4px',
                            fontWeight: 800,
                            border: '1px solid rgba(52, 168, 83, 0.2)'
                          }}>
                            Unterricht
                          </span>
                        ) : (
                          <span style={{ 
                            fontSize: '6.5px', 
                            background: '#f1f5f9', 
                            color: '#94a3b8', 
                            padding: '1px 3px', 
                            borderRadius: '4px',
                            fontWeight: 500,
                            whiteSpace: 'nowrap'
                          }}>
                            Frei
                          </span>
                        )
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Slots Rows */}
              {displayTimeSlots.map(slot => (
                <div 
                  key={slot.start} 
                  ref={slot.start === '13:00' ? slot13Ref : undefined}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `45px repeat(${activeDays.length}, 1fr)`,
                    gap: '3px',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ 
                    fontSize: (slot.start.endsWith(':15') || slot.start.endsWith(':45')) ? '0.62rem' : '0.70rem', 
                    fontWeight: (slot.start.endsWith(':15') || slot.start.endsWith(':45')) ? 600 : 800, 
                    color: (slot.start.endsWith(':15') || slot.start.endsWith(':45')) ? '#94a3b8' : '#334155', 
                    textAlign: 'center' 
                  }}>
                    {slot.start}
                  </div>

                  {activeDays.map(day => {
                    const key = `${day.id}_${slot.start}`;
                    const status = editedMatrix[key] || 'none';

                    const isTeacherTime = isTeacherAvailableSlot(day.id, slot.start);

                    let bg = '#ffffff';
                    let border = '1px solid #cbd5e1';
                    let icon = null;

                    if (status === 'wunsch') {
                      bg = '#f0fdf4';
                      border = '2px solid #16a34a';
                      icon = <Star size={14} fill="#16a34a" color="#16a34a" />;
                    } else if (status === 'gesperrt') {
                      bg = '#fef2f2';
                      border = '2px solid #dc2626';
                      icon = <Ban size={14} color="#dc2626" strokeWidth={2.5} />;
                    } else if (isTeacherTime) {
                      bg = '#f8fafc';
                      border = '1px solid #cbd5e1';
                      icon = null;
                    } else {
                      bg = 'repeating-linear-gradient(135deg, #f8fafc, #f8fafc 4px, #f1f5f9 4px, #f1f5f9 8px)';
                      border = '1px solid #e2e8f0';
                      icon = null;
                    }

                    const ariaStatus = status === 'wunsch' 
                      ? 'Wunschzeit ausgewählt' 
                      : status === 'gesperrt' 
                        ? 'Sperrzeit ausgewählt' 
                        : isTeacherTime 
                          ? 'Verfügbar, nicht ausgewählt' 
                          : 'Kein Unterricht';

                    return (
                      <div
                        key={day.id}
                        role="button"
                        tabIndex={isTeacherTime ? 0 : -1}
                        aria-label={`${day.name} ${slot.start} Uhr: ${ariaStatus}`}
                        aria-pressed={status !== 'none'}
                        onClick={() => handleCellClick(day.id, slot.start)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCellClick(day.id, slot.start);
                          }
                        }}
                        style={{
                          height: '38px',
                          minHeight: '38px',
                          background: bg,
                          border: border,
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: isTeacherTime ? 'pointer' : 'not-allowed',
                          opacity: isTeacherTime || status !== 'none' ? 1 : 0.45,
                          transition: 'all 0.12s ease',
                          boxSizing: 'border-box',
                          touchAction: 'manipulation',
                          outline: 'none'
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

          {/* Dual Live Hours Counter Badge */}
          <div style={{
            background: selectedHours >= 2.0 ? '#f0fdf4' : '#fefce8',
            border: `1px solid ${selectedHours >= 2.0 ? '#bbf7d0' : '#fef08a'}`,
            borderRadius: '14px',
            padding: '10px 14px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color={selectedHours >= 2.0 ? '#16a34a' : '#d97706'} />
              <div>
                <span>
                  🟢 Wunsch: <strong style={{ color: '#166534' }}>{selectedHours.toFixed(1)} Std.</strong>
                </span>
                {lockedHours > 0 && (
                  <span style={{ marginLeft: '10px' }}>
                    🔴 Sperrzeit: <strong style={{ color: '#dc2626' }}>{lockedHours.toFixed(1)} Std.</strong>
                  </span>
                )}
              </div>
            </div>
            {selectedHours < 2.0 && (
              <span style={{ fontSize: '0.70rem', color: '#854d0e', fontWeight: 650 }}>
                (mind. 2.0 Std. empfohlen)
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px calc(14px + env(safe-area-inset-bottom, 12px)) 20px',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%',
              background: activeColor,
              color: activePlatform === 'groovelab' ? '#1e293b' : '#ffffff',
              border: 'none',
              minHeight: '48px',
              padding: '12px',
              borderRadius: '16px',
              fontWeight: 800,
              fontSize: '0.90rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              touchAction: 'manipulation',
              boxShadow: `0 4px 14px ${activeColor}40`
            }}
            className="hover-scale"
          >
            <Save size={18} />
            <span>{saving ? 'Wird gespeichert...' : 'Terminwünsche & Sperrzeiten speichern'}</span>
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              padding: '6px',
              fontWeight: 700,
              fontSize: '0.76rem',
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
