import React, { useState, useMemo } from 'react';
import { Calendar, Plus, Settings, ChevronRight, Eye } from 'lucide-react';
import { CampusEvent } from '../types/campusEvents.types';
import { formatGermanDate } from '../../../../utils/formatters';

interface CampusEventPlanningColumnProps {
  customEvents: CampusEvent[];
  brandColor: string;
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  userId: string;
  isMobilePortrait: boolean;
  onOpenSubmission: (ev: CampusEvent) => void;
  onOpenCoordinator: (ev: CampusEvent) => void;
  onCreateEvent?: () => void;
}

export function CampusEventPlanningColumn({
  customEvents,
  brandColor,
  role,
  userId,
  isMobilePortrait,
  onOpenSubmission,
  onOpenCoordinator,
  onCreateEvent
}: CampusEventPlanningColumnProps) {
  const [planningTab, setPlanningTab] = useState<'upcoming' | 'past'>('upcoming');
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const planningEvents = useMemo(() => {
    return customEvents.filter(ev => {
      if (ev.is_subscribed) return false;
      return ev.is_planning_active;
    }).filter(ev => {
      const end = ev.event_end_date || ev.event_date;
      return planningTab === 'upcoming' ? end >= todayStr : end < todayStr;
    });
  }, [customEvents, planningTab, todayStr]);

  return (
    <div id="tour-planning-column" style={{
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
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color={brandColor} />
            <span>{role === 'secretary' ? 'Event-Übersicht' : 'Event-Planung'}</span>
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.74rem', margin: '2px 0 0 0', fontWeight: 550 }}>
            {role === 'secretary' || role === 'admin' ? 'Event-Koordination & Programmpunkte' : 'Programmanmeldung für Konzerte'}
          </p>
        </div>

        {(role === 'admin' || role === 'secretary') && onCreateEvent && (
          <button
            onClick={onCreateEvent}
            style={{
              background: brandColor,
              border: 'none',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: '12px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <Plus size={14} /> Neu
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        background: '#f1f5f9',
        padding: '4px',
        borderRadius: '12px',
        gap: '4px'
      }}>
        <button
          onClick={() => setPlanningTab('upcoming')}
          style={{
            flex: 1,
            border: 'none',
            background: planningTab === 'upcoming' ? '#ffffff' : 'transparent',
            color: planningTab === 'upcoming' ? '#0f172a' : '#64748b',
            padding: '7px 10px',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '0.75rem',
            cursor: 'pointer',
            boxShadow: planningTab === 'upcoming' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
          }}
        >
          Aktuelle
        </button>
        <button
          onClick={() => setPlanningTab('past')}
          style={{
            flex: 1,
            border: 'none',
            background: planningTab === 'past' ? '#ffffff' : 'transparent',
            color: planningTab === 'past' ? '#0f172a' : '#64748b',
            padding: '7px 10px',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '0.75rem',
            cursor: 'pointer',
            boxShadow: planningTab === 'past' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
          }}
        >
          Vergangene
        </button>
      </div>

      {/* Planning Events List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {planningEvents.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', background: '#f8fafc', borderRadius: '16px', border: '1.5px dashed #e2e8f0' }}>
            Aktuell keine aktiven Planungen vorhanden.
          </div>
        ) : (
          planningEvents.map(ev => {
            return (
              <div
                key={ev.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #f1f5f9',
                  borderRadius: '16px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: brandColor }}>
                      {formatGermanDate(ev.event_date)} &middot; {ev.category}
                    </div>
                    <h4 style={{ margin: '2px 0 0 0', fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.title}
                    </h4>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {/* Button for Teachers: Einreichung */}
                  {role === 'teacher' && (
                    <button
                      onClick={() => onOpenSubmission(ev)}
                      style={{
                        flex: 1,
                        background: brandColor,
                        border: 'none',
                        color: '#ffffff',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>Programmanmeldung</span>
                      <ChevronRight size={13} />
                    </button>
                  )}

                  {/* Button for Admins / Coordinators */}
                  {(role === 'admin' || role === 'secretary') && (
                    <button
                      onClick={() => onOpenCoordinator(ev)}
                      style={{
                        flex: 1,
                        background: brandColor,
                        border: 'none',
                        color: '#ffffff',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Settings size={13} />
                      <span>Planung öffnen</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
