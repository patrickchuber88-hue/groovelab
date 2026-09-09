import React from 'react';
import { Calendar, MapPin, User, Clock } from 'lucide-react';
import { formatTeacherFullName } from '../../../../utils/nameHelper';

export const getFormattedScheduleDayTime = (day: any, timeSlot?: string) => {
  if (day === undefined || day === null || day === '') {
    return timeSlot ? `Unterricht: ${timeSlot}` : 'Unterrichtszeit';
  }

  const str = String(day).trim();
  const num = parseInt(str, 10);
  let dayName = '';

  if (!isNaN(num)) {
    const dayMap: Record<number, string> = {
      1: 'Montag',
      2: 'Dienstag',
      3: 'Mittwoch',
      4: 'Donnerstag',
      5: 'Freitag',
      6: 'Samstag',
      7: 'Sonntag',
      0: 'Sonntag'
    };
    dayName = dayMap[num] || `Tag ${num}`;
  } else {
    const lower = str.toLowerCase();
    if (lower.includes('mon') || lower === '1') dayName = 'Montag';
    else if (lower.includes('die') || lower.includes('tue') || lower === '2') dayName = 'Dienstag';
    else if (lower.includes('mit') || lower.includes('wed') || lower === '3') dayName = 'Mittwoch';
    else if (lower.includes('don') || lower.includes('thu') || lower === '4') dayName = 'Donnerstag';
    else if (lower.includes('fre') || lower.includes('fri') || lower === '5') dayName = 'Freitag';
    else if (lower.includes('sam') || lower.includes('sat') || lower === '6') dayName = 'Samstag';
    else if (lower.includes('son') || lower.includes('sun') || lower === '7' || lower === '0') dayName = 'Sonntag';
    else dayName = str.replace(/s$/i, '');
  }

  const formattedDay = `Jeden ${dayName}`;
  const formattedTime = timeSlot 
    ? (timeSlot.includes('Uhr') ? timeSlot : `${timeSlot} Uhr`) 
    : '';

  return formattedTime ? `${formattedDay} um ${formattedTime}` : formattedDay;
};

export interface StudentScheduleCardProps {
  schedulesList: any[];
  lessonDuration?: number;
  student?: any;
  mode?: 'admin' | 'teacher';
  activeColor?: string;
  onOpenScheduleDesigner?: () => void;
}

export const StudentScheduleCard: React.FC<StudentScheduleCardProps> = ({
  schedulesList,
  lessonDuration = 30,
  student,
  mode = 'teacher',
  activeColor = '#34a853',
  onOpenScheduleDesigner
}) => {
  const primarySchedule = schedulesList.length > 0 ? schedulesList[0] : null;

  return (
    <section
      style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '20px 24px',
        border: '1.5px solid #f1f5f9',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4
          style={{
            fontSize: '0.86rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: '#64748b',
            letterSpacing: '0.08em',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Calendar size={16} style={{ color: activeColor }} />
          Aktueller Unterricht
        </h4>

        <span
          style={{
            background: '#f1f5f9',
            color: '#1e293b',
            padding: '3px 10px',
            borderRadius: '10px',
            fontSize: '0.74rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Clock size={13} style={{ color: '#64748b' }} />
          {lessonDuration} Min.
        </span>
      </div>

      {primarySchedule ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '18px',
            padding: '16px 18px',
            border: '1.5px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                background: '#e6f4ea',
                color: '#137333',
                padding: '10px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#1e293b' }}>
                {getFormattedScheduleDayTime(primarySchedule.day_of_week, primarySchedule.time_slot)}
              </div>
              <div
                style={{
                  fontSize: '0.76rem',
                  color: '#64748b',
                  fontWeight: 650,
                  marginTop: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} style={{ color: '#3b82f6' }} />
                  {primarySchedule.rooms?.name || 'Raum zugewiesen'}
                </span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <User size={13} style={{ color: '#64748b' }} />
                  {formatTeacherFullName(primarySchedule.teacher || student?.teachers?.full_name || student?.teacher_name || 'Fachlehrkraft')}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '14px 16px',
            background: '#f8fafc',
            borderRadius: '16px',
            border: '1px dashed #cbd5e1',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.82rem',
            fontWeight: 600
          }}
        >
          Kein regelmäßiger Unterrichts-Slot im Stundenplan hinterlegt.
        </div>
      )}

      {/* Multiple schedules if applicable */}
      {schedulesList.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
            Weitere Termine ({schedulesList.length - 1}):
          </span>
          {schedulesList.slice(1).map((s: any) => (
            <div
              key={s.id}
              style={{
                fontSize: '0.76rem',
                color: '#475569',
                fontWeight: 600,
                background: '#f8fafc',
                padding: '6px 12px',
                borderRadius: '10px',
                border: '1px solid #f1f5f9'
              }}
            >
              {getFormattedScheduleDayTime(s.day_of_week, s.time_slot)} • {s.rooms?.name || 'Raum'}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
