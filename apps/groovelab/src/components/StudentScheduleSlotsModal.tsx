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

  const brandColor = activePlatform === 'groovelab' 
    ? '#eab308' 
    : (activePlatform === 'admin' || activePlatform === 'secretariat' ? '#ea4335' : '#34a853');

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
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div 
        className="glass-panel animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '92vh',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 70px -15px rgba(15, 23, 42, 0.18), 0 0 1px rgba(15, 23, 42, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '22px 28px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: isCompleted ? '#e6f4ea' : '#fefce8',
              color: isCompleted ? '#34a853' : '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${isCompleted ? '#bbf7d0' : '#fef08a'}`
            }}>
              <Calendar size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  Stundenplan-Zeitfenster
                </h3>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background: isCompleted ? '#f0fdf4' : '#fefce8',
                  color: isCompleted ? '#16a34a' : '#d97706',
                  border: `1px solid ${isCompleted ? '#bbf7d0' : '#fef08a'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  {isCompleted ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  {isCompleted ? 'Onboarding Abgeschlossen' : 'Warte auf Rückmeldung'}
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.84rem', color: '#64748b', fontWeight: 500 }}>
                Schüler: <strong style={{ color: '#0f172a', fontWeight: 700 }}>{student?.first_name} {student?.last_name}</strong> ({student?.instrument || 'Gitarre'})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: '34px',
              height: '34px',
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
            <X size={18} />
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
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', background: '#ffffff' }}>
          
          {/* Status & Manual Edit Control Card */}
          <div style={{
            padding: '20px 24px',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: isCompleted ? '#f0fdf4' : '#fefce8',
                  border: `1px solid ${isCompleted ? '#bbf7d0' : '#fef08a'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isCompleted ? (
                    <CheckCircle2 size={22} color="#16a34a" />
                  ) : (
                    <Clock size={22} color="#d97706" />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
                    {isCompleted 
                      ? 'Zeitfenster wurden erfolgreich vom Schüler / Lehrer übermittelt.' 
                      : 'Onboarding ausstehend: Schüler hat noch keine Zeiten übermittelt.'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                    {timetableAssignedAt 
                      ? `Abgeschlossen am: ${new Date(timetableAssignedAt).toLocaleDateString('de-DE')} um ${new Date(timetableAssignedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` 
                      : 'Lehrer kann die Daten direkt manuell hier eintragen (z. B. nach E-Mail-Mitteilung).'}
                  </div>
                </div>
              </div>

              {/* Apple-style Manual Edit Action Button */}
              <button
                onClick={() => setIsEditing(!isEditing)}
                style={{
                  background: isEditing ? brandColor : '#ffffff',
                  color: isEditing ? (activePlatform === 'groovelab' ? '#1e293b' : '#ffffff') : '#0f172a',
                  border: isEditing ? 'none' : '1.5px solid #cbd5e1',
                  padding: '10px 18px',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isEditing 
                    ? `0 4px 16px ${brandColor}40` 
                    : '0 2px 8px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  flexShrink: 0
                }}
                className="hover-scale"
              >
                {isEditing ? <Check size={16} /> : <Edit3 size={16} color={brandColor} />}
                <span>{isEditing ? 'Fertig mit Bearbeiten' : 'Manuell eintragen / bearbeiten'}</span>
              </button>
            </div>

            {/* Teacher Brush Selection Toolbar when editing */}
            {isEditing && (
              <div style={{
                background: '#f8fafc',
                padding: '14px 18px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.82rem', fontWeight: 700 }}>
                  <Sliders size={15} style={{ color: '#64748b' }} />
                  <span>Klick-Werkzeug für Lehrer:</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveBrush('wunsch')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '10px',
                      border: activeBrush === 'wunsch' ? '2px solid #16a34a' : '1px solid #bbf7d0',
                      background: activeBrush === 'wunsch' ? '#dcfce7' : '#ffffff',
                      color: '#15803d',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Star size={13} fill="#22c55e" color="#16a34a" /> Wunschzeit (Grün)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveBrush('gesperrt')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '10px',
                      border: activeBrush === 'gesperrt' ? '2px solid #dc2626' : '1px solid #fecaca',
                      background: activeBrush === 'gesperrt' ? '#fee2e2' : '#ffffff',
                      color: '#991b1b',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Ban size={13} color="#ef4444" /> Geblockt (Rot)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveBrush('clear')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '10px',
                      border: activeBrush === 'clear' ? '2px solid #475569' : '1px solid #cbd5e1',
                      background: activeBrush === 'clear' ? '#f1f5f9' : '#ffffff',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Eraser size={13} color="#64748b" /> Zurücksetzen (Frei)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dedicated Onboarding Link Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            boxShadow: '0 2px 10px -2px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                <LinkIcon size={14} style={{ color: '#64748b' }} />
                <span>Onboarding-Link für Schüler:</span>
              </div>
              <div style={{ 
                fontSize: '0.84rem', 
                fontWeight: 600, 
                color: '#0f172a', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '6px 12px',
                borderRadius: '8px'
              }}>
                {`${window.location.origin}/onboarding/${student?.qr_token || student?.id}?platform=${activePlatform}`}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyOnboardingLink}
              style={{
                background: brandColor,
                color: activePlatform === 'groovelab' ? '#1e293b' : 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: `0 2px 10px ${brandColor}35`,
                flexShrink: 0
              }}
              className="hover-scale"
            >
              <Copy size={14} /> Link kopieren
            </button>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#15803d' }} />
              <span>Fest gebuchte Lektion</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
              <span>Wunschzeit</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffffff', border: '1.5px solid #cbd5e1' }} />
              <span>Mögliche Zeit (Frei)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <span>Gesperrt / Geblockt</span>
            </div>
          </div>

          {/* Schedule Grid Matrix */}
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
              Zeitfenster werden geladen...
            </div>
          ) : (
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              overflowX: 'auto',
              maxHeight: '440px',
              overflowY: 'auto',
              background: '#ffffff',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
            }}>
              {/* Header Row */}
              <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 5,
                display: 'grid',
                gridTemplateColumns: '110px repeat(6, 1fr)',
                background: '#ffffff',
                borderBottom: '2px solid #f1f5f9',
                fontWeight: 800,
                fontSize: '0.82rem',
                color: '#334155',
                textAlign: 'center'
              }}>
                <div style={{ padding: '14px 8px', borderRight: '1px solid #f1f5f9', background: '#ffffff' }}>Uhrzeit</div>
                {DAYS_OF_WEEK.map(day => (
                  <div key={day.id} style={{ padding: '14px 8px', borderRight: day.id === 6 ? 'none' : '1px solid #f1f5f9', background: '#ffffff' }}>
                    {day.name}
                  </div>
                ))}
              </div>

              {/* Time Slot Rows */}
              {TIME_SLOTS.map(slot => (
                <div key={slot.start} style={{
                  display: 'grid',
                  gridTemplateColumns: '110px repeat(6, 1fr)',
                  borderBottom: '1px solid #f8fafc',
                  fontSize: '0.8rem'
                }}>
                  <div style={{
                    padding: '8px',
                    borderRight: '1px solid #f1f5f9',
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
                      bg = '#f0fdf4';
                      border = '1px solid #bbf7d0';
                      textColor = '#166534';
                      labelText = 'Wunsch';
                      icon = <Star size={12} fill="#22c55e" color="#16a34a" />;
                    } else if (status === 'moeglich') {
                      bg = '#ffffff';
                      border = '1px solid #f1f5f9';
                      textColor = '#64748b';
                      labelText = 'Möglich';
                      icon = <Check size={11} color="#94a3b8" />;
                    } else if (status === 'gesperrt') {
                      bg = '#fef2f2';
                      border = '1px solid #fecaca';
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
                          borderRight: day.id === 6 ? 'none' : '1px solid #f8fafc',
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
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
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
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  padding: '10px 18px',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
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
                  padding: '11px 22px',
                  borderRadius: '14px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: `0 4px 16px ${brandColor}40`
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
                padding: '11px 20px',
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
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


