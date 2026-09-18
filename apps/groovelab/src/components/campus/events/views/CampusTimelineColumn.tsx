import React from 'react';
import { Calendar, Palmtree, Trash2, CalendarPlus } from 'lucide-react';
import { CampusEvent } from '../types/campusEvents.types';
import { formatGermanDate } from '../../../../utils/formatters';

interface CampusTimelineColumnProps {
  customEvents: CampusEvent[];
  subscribedEvents: any[];
  loadingEvents: boolean;
  brandColor: string;
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  userId: string;
  isMobilePortrait: boolean;
  onSelectEvent: (ev: CampusEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onActivatePlanning?: (ev: CampusEvent) => void;
}

export function CampusTimelineColumn({
  customEvents,
  subscribedEvents,
  loadingEvents,
  brandColor,
  role,
  userId,
  isMobilePortrait,
  onSelectEvent,
  onDeleteEvent,
  onActivatePlanning
}: CampusTimelineColumnProps) {
  const mergedEvents = React.useMemo(() => {
    const list = [...customEvents, ...subscribedEvents];
    return list.sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''));
  }, [customEvents, subscribedEvents]);

  return (
    <div id="tour-timeline-column" style={{
      background: isMobilePortrait ? 'transparent' : '#ffffff',
      border: isMobilePortrait ? 'none' : '1px solid rgba(0, 0, 0, 0.05)',
      borderRadius: isMobilePortrait ? '0' : '24px',
      padding: isMobilePortrait ? '0' : '16px',
      boxShadow: isMobilePortrait ? 'none' : '0 8px 32px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      height: isMobilePortrait ? 'auto' : 'calc(100vh - 120px)',
      overflow: isMobilePortrait ? 'visible' : 'hidden'
    }}>
      {/* Title */}
      <div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} color={brandColor} />
          <span>Campus &amp; Schultermine</span>
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.74rem', margin: '2px 0 0 0', fontWeight: 550 }}>
          Konzerte, Klassenvorspiele &amp; Termine
        </p>
      </div>

      {/* Unified Timeline List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        paddingRight: '2px'
      }}>
        {loadingEvents ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
            Termine werden geladen...
          </div>
        ) : mergedEvents.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '20px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Palmtree size={18} color={brandColor || '#34a853'} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  Unterrichtsfreie Zeiten &amp; Ferien
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 550 }}>
                  Schuljahres-Orientierung
                </p>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: 1.45 }}>
              An gesetzlichen Feiertagen und während der offiziellen Schulferien findet in der Regel kein regulärer Musikschulunterricht statt.
            </p>
          </div>
        ) : (
          mergedEvents.map(ev => {
            const isSubscribed = ev.is_subscribed;
            const isMyEvent = ev.created_by === userId;
            const catColor = ev.color || '#34a853';

            return (
              <div
                key={ev.id}
                onClick={() => onSelectEvent(ev)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '14px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  borderLeft: `4px solid ${catColor}`,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                  gap: '8px'
                }}
                className="hover-scale-subtle"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: catColor,
                      background: `${catColor}14`,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      textTransform: 'uppercase'
                    }}>
                      {ev.category}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 650,
                      color: ev.visibility === 'teachers' ? '#d97706' : ev.visibility === 'students' ? '#2563eb' : '#64748b',
                      background: ev.visibility === 'teachers' ? '#fef3c7' : ev.visibility === 'students' ? '#dbeafe' : '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      {ev.visibility === 'teachers' ? 'Nur Lehrer' : ev.visibility === 'students' ? 'Nur Schüler' : 'Alle'}
                    </span>
                  </div>

                  {!isSubscribed && isMyEvent && onDeleteEvent && (
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteEvent(ev.id); }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Termin löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.title}
                    </h4>
                    {!ev.is_planning_active && (role === 'admin' || role === 'secretary') && onActivatePlanning && (
                      <button
                        onClick={e => { e.stopPropagation(); onActivatePlanning(ev); }}
                        style={{
                          background: `${brandColor}12`,
                          border: `1px solid ${brandColor}30`,
                          color: brandColor,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0
                        }}
                      >
                        <CalendarPlus size={11} /> Planen
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', background: '#f8fafc', padding: '3px 8px', borderRadius: '8px', flexShrink: 0 }}>
                    {formatGermanDate(ev.event_date)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
