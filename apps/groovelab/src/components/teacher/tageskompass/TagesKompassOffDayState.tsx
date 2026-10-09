import React from 'react';
import { Compass, Calendar, Clock, SunMedium, ShieldAlert } from 'lucide-react';
import { TagesKompassTeacher, NextTeachingDaySummary } from './types';

export interface TagesKompassOffDayStateProps {
  currentState: 'UNTERRICHTSFREI' | 'WOCHENENDE' | 'ABWESENHEIT';
  teacher: TagesKompassTeacher;
  nextDaySummary?: NextTeachingDaySummary | null;
}

export const TagesKompassOffDayState: React.FC<TagesKompassOffDayStateProps> = ({
  currentState,
  teacher,
  nextDaySummary
}) => {
  const teacherName = teacher?.first_name || teacher?.name || 'Lehrkraft';

  // 0,1% Goldstandard Farbklang (Tone-in-Tone, Zero Color-Clash, De-Blueing)
  let subline = 'Kreative Pause';
  let badgeLabel = 'Unterrichtsfrei';
  let iconBg = '#ecfdf5'; // Campus-Salbei / Smaragd 50
  let iconColor = '#059669'; // Smaragd 600
  let badgeBg = '#ecfdf5';
  let badgeColor = '#065f46'; // Smaragd 800
  let badgeDot = '#10b981'; // Smaragd 500
  let messageTitle = 'Heute ist unterrichtsfrei.';
  let messageBody = 'Schulferien oder Feiertag • Zeit zum Durchatmen & Auftanken.';
  let IconComponent = Compass;

  if (currentState === 'WOCHENENDE') {
    subline = 'Wochenend-Auszeit';
    badgeLabel = 'Wochenende';
    iconBg = '#fef3c7'; // Amber 100
    iconColor = '#d97706'; // Amber 600
    badgeBg = '#fef3c7';
    badgeColor = '#92400e'; // Amber 800
    badgeDot = '#f59e0b'; // Amber 500
    messageTitle = `Schönes Wochenende, ${teacherName}!`;
    messageBody = 'Heute findet kein regulärer Unterricht statt • Erhol dich gut.';
    IconComponent = SunMedium;
  } else if (currentState === 'ABWESENHEIT') {
    subline = 'Abwesenheit hinterlegt';
    badgeLabel = 'Ausfall aktiv';
    iconBg = '#fff1f2'; // Rose 50
    iconColor = '#e11d48'; // Rose 600
    badgeBg = '#fff1f2';
    badgeColor = '#9f1239'; // Rose 800
    badgeDot = '#f43f5e'; // Rose 500
    messageTitle = 'Ausfall im System hinterlegt.';
    messageBody = 'Deine Termine für diesen Tag sind im Stundenplan als Ausfall vermerkt.';
    IconComponent = ShieldAlert;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* 1. Header im konsistenten Tages-Kompass Design (Apple Squircle, Tone-in-Tone) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: iconBg,
              color: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.7)',
              flexShrink: 0
            }}
          >
            <IconComponent size={19} strokeWidth={2.2} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Tages-Kompass
            </h3>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
              {subline}
            </p>
          </div>
        </div>

        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 750,
            color: badgeColor,
            background: badgeBg,
            border: 'none',
            padding: '4px 10px',
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: badgeDot }} />
          <span>{badgeLabel}</span>
        </span>
      </div>

      {/* 2. Aufgeräumte, elegante Botschaft (Zero Redundanz, klare Typografie) */}
      <div style={{ padding: '2px 0 2px 0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
          {messageTitle}
        </div>
        <div style={{ fontSize: '0.80rem', color: '#64748b', lineHeight: 1.45, fontWeight: 500 }}>
          {messageBody}
        </div>
      </div>

      {/* 3. Reales „Next Session Ticket“ (Apple-Style Widget mit SSOT nextDaySummary) */}
      {nextDaySummary ? (
        <div 
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.04)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '9px',
                background: '#f1f5f9',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Calendar size={15} strokeWidth={2.2} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Nächster Unterricht
              </span>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                {nextDaySummary.dateStr || nextDaySummary.dayName || 'Nächster Unterrichtstag'}
              </span>
            </div>
          </div>

          <div 
            style={{ 
              fontSize: '0.74rem', 
              fontWeight: 700, 
              color: '#334155', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              background: '#f8fafc',
              padding: '5px 11px',
              borderRadius: '9px',
              border: '1px solid #e2e8f0'
            }}
          >
            <Clock size={13} color="#64748b" />
            <span>
              {nextDaySummary.totalAppointments} {nextDaySummary.totalAppointments === 1 ? 'Einheit' : 'Einheiten'}
              {nextDaySummary.firstStartTime ? ` • ${nextDaySummary.firstStartTime} Uhr` : ''}
              {nextDaySummary.firstRoom ? ` • ${nextDaySummary.firstRoom}` : ''}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
