import React from 'react';
import { Building, QrCode, Users, Clock, Calendar, MapPin } from 'lucide-react';
import { StudioAvatar } from '../StudioAvatar';
import { CampusGroovelabText } from '../CampusGroovelabBrand';

export interface CampusStaffProfileViewProps {
  user: any;
  teachers?: any[];
  campusTeacherStats?: {
    studentCount?: number;
    totalMinutes?: number;
    teachingDays?: any[];
    primaryRoom?: string;
    schedules?: any[];
  } | null;
  activeWorkspace?: string | null;
  activePlatform?: string | null;
  onShowQr: () => void;
  onOpenPrivacy: () => void;
  onOpenAgb: () => void;
  onOpenCancellation: () => void;
  onOpenImpressum: () => void;
  onOpenAccessibility: () => void;
}

export const CampusStaffProfileView: React.FC<CampusStaffProfileViewProps> = ({
  user,
  teachers = [],
  campusTeacherStats,
  activeWorkspace,
  activePlatform = 'campus',
  onShowQr,
  onOpenPrivacy,
  onOpenAgb,
  onOpenCancellation,
  onOpenImpressum,
  onOpenAccessibility,
}) => {
  return (
    <div
      className="animation-slide-up"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        maxWidth: '100%',
        margin: '0 auto',
        width: '100%',
        paddingTop: '24px',
      }}
    >
      {/* Hero Header Card — Briefing-style: image left panel, content right */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
          border: '1px solid rgba(52, 168, 83, 0.2)',
          borderRadius: '32px',
          display: 'flex',
          alignItems: 'stretch',
          boxShadow: '0 8px 32px rgba(52, 168, 83, 0.08)',
          overflow: 'hidden',
          minHeight: '222px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* LEFT: Instrument image — full height, flush edges */}
        <div
          style={{
            width: '200px',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
            borderRight: '1px solid rgba(52, 168, 83, 0.15)',
          }}
        >
          <StudioAvatar
            src={user?.photo_url}
            user={{
              ...user,
              role: (activeWorkspace === 'teacher' || user?.role === 'teacher') ? 'teacher' : user?.role,
              isTeacherContext: (activeWorkspace === 'teacher' || user?.role === 'teacher'),
              resolved_instrument:
                user?.resolved_instrument ||
                user?.instrument ||
                teachers.find((t) => t.id === user?.teacher_id)?.instrument ||
                teachers[0]?.instrument ||
                'Gitarre',
            }}
            activePlatform={activePlatform ?? undefined}
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </div>

        {/* RIGHT: Identity content */}
        <div
          style={{
            flex: 1,
            padding: '28px 36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 0,
          }}
        >
          {/* Badges row */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                background: 'linear-gradient(135deg, #34a853, #34a853)',
                color: 'white',
                padding: '4px 14px',
                borderRadius: '10px',
                fontSize: '0.68rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                boxShadow: '0 4px 10px rgba(52, 168, 83, 0.25)',
              }}
            >
              Campus Lehrkraft
            </span>
            <span style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Building size={14} color="#475569" /> {user?.schools?.name || 'Campus-Groovelab'}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 500 }}>
              • Mitglied seit{' '}
              {user?.created_at && !isNaN(new Date(user.created_at).getTime())
                ? new Date(user.created_at).toLocaleDateString()
                : 'unbekannt'}
            </span>
          </div>

          {/* Name */}
          <h1
            style={{
              fontSize: '2.6rem',
              fontWeight: 950,
              color: '#0f172a',
              margin: '0 0 14px 0',
              letterSpacing: '-0.03em',
              fontFamily: "'Urbanist', sans-serif",
              lineHeight: 1.1,
            }}
          >
            {user?.first_name} {user?.last_name}
          </h1>

          {/* Instrument pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {(user?.instrument || '')
              .split(',')
              .map((inst: string) => inst.trim())
              .filter(Boolean)
              .map((inst: string) => (
                <div
                  key={inst}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(52, 168, 83, 0.07)',
                    border: '1px solid rgba(52, 168, 83, 0.18)',
                    color: '#34a853',
                    padding: '5px 14px',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                  }}
                >
                  <span>🎵</span>
                  <span>{inst}</span>
                </div>
              ))}

            {/* Campus-Ausweis Button */}
            {(user?.qr_token || user?.teacher_qr_token) && (
              <button
                type="button"
                onClick={onShowQr}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #34a853, #34a853)',
                  color: 'white',
                  padding: '6px 14px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(52, 168, 83, 0.15)',
                  transition: 'all 0.2s',
                  touchAction: 'manipulation',
                  minHeight: '44px',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.03)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                aria-label="Campus-Ausweis anzeigen"
              >
                <QrCode size={15} />
                <span>Campus-Ausweis</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Professional Teaching Metrics Grid (4 columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {/* Metric 1: Schüler gesamt */}
        <div
          style={{
            background: 'white',
            border: '1px solid rgba(0,0,0,0.04)',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.01)',
          }}
        >
          <div
            style={{
              height: '48px',
              width: '48px',
              borderRadius: '14px',
              background: 'rgba(0, 122, 255, 0.08)',
              color: '#007aff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '2px',
              }}
            >
              Schüler gesamt
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
              {campusTeacherStats ? `${campusTeacherStats.studentCount} Schüler` : '0 Schüler'}
            </div>
          </div>
        </div>

        {/* Metric 2: Unterrichtszeit */}
        <div
          style={{
            background: 'white',
            border: '1px solid rgba(0,0,0,0.04)',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.01)',
          }}
        >
          <div
            style={{
              height: '48px',
              width: '48px',
              borderRadius: '14px',
              background: 'rgba(52, 168, 83, 0.08)',
              color: '#34a853',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '2px',
              }}
            >
              Wochen-Unterricht
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
              {campusTeacherStats ? `${(Number(campusTeacherStats.totalMinutes || 0) / 60).toFixed(1)} Std.` : '0.0 Std.'}
            </div>
          </div>
        </div>

        {/* Metric 3: Unterrichtstage */}
        <div
          style={{
            background: 'white',
            border: '1px solid rgba(0,0,0,0.04)',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.01)',
          }}
        >
          <div
            style={{
              height: '48px',
              width: '48px',
              borderRadius: '14px',
              background: 'rgba(245, 158, 11, 0.08)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Calendar size={22} />
          </div>
          <div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '2px',
              }}
            >
              Präsenztage
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
              {campusTeacherStats && campusTeacherStats.teachingDays && campusTeacherStats.teachingDays.length > 0
                ? `${campusTeacherStats.teachingDays.length} ${campusTeacherStats.teachingDays.length === 1 ? 'Tag' : 'Tage'}`
                : '0 Tage'}
            </div>
          </div>
        </div>

        {/* Metric 4: Haupt-Raum */}
        <div
          style={{
            background: 'white',
            border: '1px solid rgba(0,0,0,0.04)',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.01)',
          }}
        >
          <div
            style={{
              height: '48px',
              width: '48px',
              borderRadius: '14px',
              background: 'rgba(139, 92, 246, 0.08)',
              color: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MapPin size={22} />
          </div>
          <div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '2px',
              }}
            >
              Stamm-Raum
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
              {campusTeacherStats ? campusTeacherStats.primaryRoom : 'Kein Raum'}
            </div>
          </div>
        </div>
      </div>

      {/* Teaching Days Calendar Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' }}>
        {/* Day Availability Calendar Planner */}
        <div
          style={{
            background: 'white',
            border: '1px solid rgba(0,0,0,0.04)',
            borderRadius: '32px',
            padding: '32px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.01)',
          }}
        >
          <h3
            style={{
              fontSize: '1.2rem',
              fontWeight: 900,
              color: '#0f172a',
              margin: '0 0 20px 0',
              fontFamily: "'Urbanist', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Calendar size={20} style={{ color: '#007aff' }} />
            Unterrichtstage & Startzeiten
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(() => {
              const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

              const timeToMinutes = (timeStr: string) => {
                const [h, m] = timeStr.split(':').map(Number);
                return h * 60 + m;
              };
              const minutesToTime = (mins: number) => {
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              };

              const schedulesByDay = (campusTeacherStats?.schedules || []).reduce(
                (acc: Record<number, any[]>, curr: any) => {
                  if (curr.day_of_week !== undefined && curr.day_of_week !== null) {
                    if (!acc[curr.day_of_week]) {
                      acc[curr.day_of_week] = [];
                    }
                    acc[curr.day_of_week].push(curr);
                  }
                  return acc;
                },
                {}
              );

              const activeDays = Object.keys(schedulesByDay)
                .map(Number)
                .sort((a, b) => a - b);

              return activeDays.length > 0 ? (
                activeDays.map((dayOfWeek) => {
                  const daySchedules = schedulesByDay[dayOfWeek] || [];
                  let minStart = Infinity;
                  let maxEnd = -Infinity;

                  daySchedules.forEach((s) => {
                    if (s.time_slot) {
                      const startMins = timeToMinutes(s.time_slot);
                      const endMins = startMins + (s.duration || 30);
                      if (startMins < minStart) minStart = startMins;
                      if (endMins > maxEnd) maxEnd = endMins;
                    }
                  });

                  const startStr = minStart !== Infinity ? minutesToTime(minStart) : '--:--';
                  const endStr = maxEnd !== -Infinity ? minutesToTime(maxEnd) : '--:--';

                  return (
                    <div
                      key={dayOfWeek}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        background: '#f8fafc',
                        borderRadius: '16px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            height: '36px',
                            width: '36px',
                            borderRadius: '10px',
                            background: '#ffffff',
                            border: '1px solid rgba(0,0,0,0.04)',
                            color: '#0f172a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                            fontWeight: 900,
                          }}
                        >
                          🗓️
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                            {DAYS_DE[dayOfWeek]}s
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                            Geplanter Unterricht: {startStr} bis {endStr} Uhr
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            background: 'rgba(0, 122, 255, 0.08)',
                            color: '#007aff',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                          }}
                        >
                          Aktiv
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    border: '2.5px dashed #cbd5e1',
                    borderRadius: '20px',
                  }}
                >
                  Bisher keine Unterrichtstage im Stundenplaner angelegt.
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Mobile / Profile Page Legal Footer */}
      <div
        style={{
          padding: '24px 0',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '20px',
            fontSize: '0.85rem',
            fontWeight: 800,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <span
            role="button"
            tabIndex={0}
            onClick={onOpenPrivacy}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenPrivacy();
              }
            }}
            style={{ cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '2px 4px' }}
            onFocus={(e) => {
              e.currentTarget.style.color = '#334155';
            }}
            onBlur={(e) => {
              e.currentTarget.style.color = '#94a3b8';
            }}
            aria-label="Datenschutzerklärung öffnen"
          >
            Datenschutz
          </span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span
            role="button"
            tabIndex={0}
            onClick={onOpenAgb}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenAgb();
              }
            }}
            style={{ cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '2px 4px' }}
            onFocus={(e) => {
              e.currentTarget.style.color = '#334155';
            }}
            onBlur={(e) => {
              e.currentTarget.style.color = '#94a3b8';
            }}
            aria-label="Allgemeine Geschäftsbedingungen öffnen"
          >
            AGB
          </span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span
            role="button"
            tabIndex={0}
            onClick={onOpenCancellation}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenCancellation();
              }
            }}
            style={{ cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '2px 4px' }}
            onFocus={(e) => {
              e.currentTarget.style.color = '#334155';
            }}
            onBlur={(e) => {
              e.currentTarget.style.color = '#94a3b8';
            }}
            aria-label="Widerrufsbelehrung öffnen"
          >
            Widerruf
          </span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span
            role="button"
            tabIndex={0}
            onClick={onOpenImpressum}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenImpressum();
              }
            }}
            style={{ cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '2px 4px' }}
            onFocus={(e) => {
              e.currentTarget.style.color = '#334155';
            }}
            onBlur={(e) => {
              e.currentTarget.style.color = '#94a3b8';
            }}
            aria-label="Impressum öffnen"
          >
            Impressum
          </span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span
            role="button"
            tabIndex={0}
            onClick={onOpenAccessibility}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenAccessibility();
              }
            }}
            style={{ cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '2px 4px' }}
            onFocus={(e) => {
              e.currentTarget.style.color = '#334155';
            }}
            onBlur={(e) => {
              e.currentTarget.style.color = '#94a3b8';
            }}
            aria-label="Erklärung zur digitalen Barrierefreiheit öffnen"
          >
            Barrierefreiheit
          </span>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
          <CampusGroovelabText fontSize="0.7rem" fontWeight={600} /> © {new Date().getFullYear()}
        </span>
      </div>
    </div>
  );
};
export default CampusStaffProfileView;
