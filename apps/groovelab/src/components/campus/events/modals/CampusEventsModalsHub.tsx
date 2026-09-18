import React, { useState } from 'react';
import { 
  X, Calendar, Clock, Lock, Globe, Building2, MapPin, 
  Eye, Check, CalendarPlus, Settings, Trash2, Fingerprint, 
  AlertTriangle, Send, CheckCircle2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CampusCalendarSyncHubModal } from '../../../CampusCalendarSyncHubModal';
import { CampusAppointmentShoutboxModal } from '../../../CampusAppointmentShoutboxModal';
import { 
  CampusEvent, 
  ProgramPoint, 
  CollisionConflictData, 
  LessonOccurrence 
} from '../types/campusEvents.types';
import { 
  getEventColors, 
  normalizeTitle, 
  normalizeTime, 
  calculateTimelineTimes 
} from '../utils/campusEventsUtils';

interface CampusEventsModalsHubProps {
  userId: string;
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  schoolId?: string;
  brandColor?: string;
  isMobilePortrait?: boolean;
  studentUser?: any;
  lessons?: any[];
  fetchLessons?: () => void;

  // Selected event (School/Admin/Teacher detail modal)
  selectedEvent: CampusEvent | null;
  onCloseSelectedEvent: () => void;
  subscribedEvents: CampusEvent[];
  onActivatePlanning: (event: CampusEvent) => Promise<void>;
  onOpenPlanningModule: (event: CampusEvent) => void;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onSaveVisibilitySuccess?: () => void;

  // Selected student event (Student program point details modal)
  selectedStudentEvent: CampusEvent | null;
  onCloseSelectedStudentEvent: () => void;
  studentProgramPoints: ProgramPoint[];
  selectedEventAllPoints: ProgramPoint[];
  loadingSelectedStudentEventPoints?: boolean;

  // iCal Hub Modal
  showIcalModal: boolean;
  onCloseIcalModal: () => void;
  calendarToken: string;
  generatingToken: boolean;
  onRotateToken: () => Promise<void>;

  // Shoutbox Modal
  activeChatOcc: LessonOccurrence | null;
  onCloseChatOcc: () => void;
  onChatOccStatusChange?: (newStatus: string, updatedOcc?: any) => void;

  // Parent PIN Gate Modal
  showPinGateModal: boolean;
  onClosePinGateModal: () => void;
  pinGateInput: string;
  setPinGateInput: React.Dispatch<React.SetStateAction<string>>;
  pinGateError: string;
  setPinGateError: (err: string) => void;
  isVerifyingPin: boolean;
  handleVerifyParentPin: (pin: string) => Promise<void>;
  handleBiometricUnlock: () => Promise<void>;
  isWebAuthnSupported: () => boolean;
  isParentUnlocked: boolean;
  onOpenPinGate: (action: () => void) => void;

  // Collision Conflict Modal
  collisionConflictData: CollisionConflictData | null;
  onCloseCollisionModal: () => void;
  onOpenShoutboxFromConflict: (occ: LessonOccurrence) => void;
}

export const CampusEventsModalsHub: React.FC<CampusEventsModalsHubProps> = ({
  userId,
  role,
  brandColor = '#34a853',
  isMobilePortrait = false,
  studentUser,
  lessons = [],
  fetchLessons,

  selectedEvent,
  onCloseSelectedEvent,
  subscribedEvents,
  onActivatePlanning,
  onOpenPlanningModule,
  onDeleteEvent,
  onSaveVisibilitySuccess,

  selectedStudentEvent,
  onCloseSelectedStudentEvent,
  studentProgramPoints,
  selectedEventAllPoints,
  loadingSelectedStudentEventPoints,

  showIcalModal,
  onCloseIcalModal,
  calendarToken,
  generatingToken,
  onRotateToken,

  activeChatOcc,
  onCloseChatOcc,
  onChatOccStatusChange,

  showPinGateModal,
  onClosePinGateModal,
  pinGateInput,
  setPinGateInput,
  pinGateError,
  setPinGateError,
  isVerifyingPin,
  handleVerifyParentPin,
  handleBiometricUnlock,
  isWebAuthnSupported,
  isParentUnlocked,
  onOpenPinGate,

  collisionConflictData,
  onCloseCollisionModal,
  onOpenShoutboxFromConflict
}) => {
  // Visibility editing state in EventDetailModal
  const [editVisibility, setEditVisibility] = useState<'all' | 'teachers' | 'students'>('all');
  const [savingVisibility, setSavingVisibility] = useState(false);

  // Sync editVisibility whenever selectedEvent changes
  React.useEffect(() => {
    if (selectedEvent) {
      setEditVisibility((selectedEvent.visibility as any) || 'all');
    }
  }, [selectedEvent]);

  // Collision Request State
  const [collisionRequestLoading, setCollisionRequestLoading] = useState(false);
  const [collisionRequestSent, setCollisionRequestSent] = useState(false);

  React.useEffect(() => {
    if (collisionConflictData) {
      setCollisionRequestSent(false);
    }
  }, [collisionConflictData]);

  // Save visibility handler
  const handleSaveVisibility = async () => {
    if (!selectedEvent) return;
    setSavingVisibility(true);
    try {
      const isSubscribed = selectedEvent.is_subscribed;
      if (isSubscribed) {
        // Find override or create one
        const { error } = await supabase
          .from('campus_events')
          .insert({
            title: selectedEvent.title,
            event_date: selectedEvent.event_date,
            start_time: selectedEvent.start_time,
            end_time: selectedEvent.end_time,
            category: selectedEvent.category,
            visibility: editVisibility,
            is_override: true,
            school_id: selectedEvent.school_id
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('campus_events')
          .update({ visibility: editVisibility })
          .eq('id', selectedEvent.id);
        if (error) throw error;
      }
      onSaveVisibilitySuccess?.();
      onCloseSelectedEvent();
    } catch (err) {
      console.error('Error saving visibility:', err);
    } finally {
      setSavingVisibility(false);
    }
  };

  const visibilityLabel: Record<string, string> = {
    all: 'Alle (Schüler & Lehrer)',
    teachers: 'Nur Lehrer',
    students: 'Nur Schüler'
  };

  return (
    <>
      {/* ── 1. Event Detail Modal (Teacher / Admin / General) ── */}
      {selectedEvent && (() => {
        const ev = selectedEvent;
        const colors = getEventColors(ev);
        const hasFestInTitle = (ev.title || '').toLowerCase().includes('fest');
        const catColor = colors.color;
        const isSubscribed = ev.is_subscribed;
        const isOverride = !isSubscribed && subscribedEvents.some(sub => 
          normalizeTitle(sub.title) === normalizeTitle(ev.title) && 
          sub.event_date === ev.event_date && 
          normalizeTime(sub.start_time) === normalizeTime(ev.start_time)
        );
        const canEditVisibility = (role === 'admin' || role === 'secretary');
        const currentVisibility = ev.visibility || 'all';

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Event Details"
            onClick={onCloseSelectedEvent}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15,23,42,0.55)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '460px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
                overflow: 'hidden',
                fontFamily: 'Urbanist, sans-serif',
                border: '1px solid rgba(0, 0, 0, 0.08)'
              }}
            >
              <div style={{ height: '5px', background: catColor, width: '100%' }} />

              {/* Header */}
              <div style={{ padding: '22px 22px 0 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 900, color: catColor,
                    background: colors.bg, padding: '4px 10px', borderRadius: '8px',
                    textTransform: 'uppercase', letterSpacing: '0.04em'
                  }}>
                    {ev.category}
                  </span>
                  
                  {hasFestInTitle && (
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 650,
                      color: '#ff5e3a', background: '#ff5e3a14',
                      padding: '4px 10px', borderRadius: '8px',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      display: 'inline-flex', alignItems: 'center', gap: '2px'
                    }}>
                      Fest / Event
                    </span>
                  )}

                  <span style={{
                    fontSize: '0.62rem', fontWeight: 800,
                    color: (isSubscribed || isOverride) ? '#475569' : '#0369a1',
                    background: (isSubscribed || isOverride) ? '#f1f5f9' : '#e0f2fe',
                    padding: '4px 10px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    {(isSubscribed || isOverride) ? <Globe size={10} /> : <Lock size={10} />}
                    {isSubscribed ? 'iCal Kalender' : isOverride ? 'iCal Kalender (Sichtbarkeit angepasst)' : 'Eigener Termin'}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Schließen"
                  onClick={onCloseSelectedEvent}
                  style={{
                    background: '#f1f5f9', border: 'none', borderRadius: '50%',
                    width: '34px', height: '34px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <X size={16} color="#64748b" />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '16px 22px 24px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: hasFestInTitle ? '#c2410c' : '#0f172a', lineHeight: 1.25 }}>
                  {hasFestInTitle && <span style={{ marginRight: '6px' }}>🎉</span>}
                  {ev.title}
                </h2>

                {/* Date / Time */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px' }}>
                    <Calendar size={14} color="#64748b" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                      {ev.event_end_date && ev.event_end_date !== ev.event_date
                        ? `${new Date(ev.event_date + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })} – ${new Date(ev.event_end_date + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : new Date(ev.event_date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
                      }
                    </span>
                  </div>
                  {(ev.event_start_time || ev.start_time) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px' }}>
                      <Clock size={14} color="#64748b" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                        {(ev.event_start_time || ev.start_time).substring(0, 5)}{ev.end_time ? ` – ${ev.end_time.substring(0, 5)}` : ''} Uhr
                      </span>
                    </div>
                  )}
                </div>

                {/* Location */}
                {ev.location_type === 'intern' && ev.room && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f0f1ff', padding: '10px 14px', borderRadius: '12px' }}>
                    <Building2 size={16} color="#6366f1" />
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Raum (intern)</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e1b4b' }}>{ev.room.name}</div>
                    </div>
                  </div>
                )}
                {ev.location_type === 'extern' && ev.location_extern && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fffbeb', padding: '10px 14px', borderRadius: '12px' }}>
                    <MapPin size={16} color="#d97706" />
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Externer Ort</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#78350f' }}>{ev.location_extern}</div>
                    </div>
                  </div>
                )}

                {/* Description */}
                {ev.description && (
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', fontSize: '0.85rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                    {ev.description}
                  </div>
                )}

                {/* Current visibility badge */}
                {(role === 'admin' || role === 'secretary') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Eye size={14} color="#64748b" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                      Sichtbar für: {visibilityLabel[currentVisibility] || 'Alle'}
                    </span>
                  </div>
                )}

                {/* Visibility editor */}
                {canEditVisibility && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '2px' }}>
                    <label style={{ fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Sichtbarkeit ändern
                    </label>
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px', border: '1px solid #e2e8f0' }}>
                      {([
                        { value: 'all', label: 'Alle' },
                        { value: 'teachers', label: 'Nur Lehrer' },
                        { value: 'students', label: 'Nur Schüler' }
                      ] as const).map(opt => {
                        const isSel = editVisibility === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setEditVisibility(opt.value)}
                            style={{
                              flex: 1,
                              border: 'none',
                              background: isSel ? '#ffffff' : 'transparent',
                              color: isSel ? '#0f172a' : '#64748b',
                              padding: '8px 4px',
                              borderRadius: '8px',
                              fontWeight: 800,
                              fontSize: '0.68rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              boxShadow: isSel ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveVisibility}
                      disabled={savingVisibility || editVisibility === (ev.visibility || 'all')}
                      style={{
                        background: editVisibility === (ev.visibility || 'all') ? '#e2e8f0' : brandColor,
                        color: editVisibility === (ev.visibility || 'all') ? '#94a3b8' : '#ffffff',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: editVisibility === (ev.visibility || 'all') ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: editVisibility === (ev.visibility || 'all') ? 'none' : '0 4px 12px rgba(0,0,0,0.08)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Check size={14} /> {savingVisibility ? 'Wird gespeichert...' : 'Sichtbarkeit speichern'}
                    </button>
                  </div>
                )}

                {/* Activate for Event Planning button */}
                {!ev.is_planning_active && (role === 'admin' || role === 'secretary') && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onActivatePlanning(ev);
                      onCloseSelectedEvent();
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      background: '#e6f4ea', border: '1.5px solid #e6f4ea', color: '#34a853',
                      padding: '10px', borderRadius: '12px', cursor: 'pointer',
                      fontWeight: 800, fontSize: '0.82rem',
                      transition: 'all 0.15s',
                      marginTop: '6px'
                    }}
                  >
                    <CalendarPlus size={14} />
                    Für Event-Planung aktivieren
                  </button>
                )}

                {/* Planungs-Modul öffnen button */}
                {ev.is_planning_active && (role === 'admin' || role === 'secretary') && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenPlanningModule(ev);
                      onCloseSelectedEvent();
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      background: brandColor, color: '#ffffff',
                      border: 'none',
                      padding: '10px', borderRadius: '12px', cursor: 'pointer',
                      fontWeight: 800, fontSize: '0.82rem',
                      transition: 'opacity 0.15s',
                      marginTop: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                  >
                    <Settings size={14} />
                    Planungs-Modul öffnen
                  </button>
                )}

                {/* Delete button */}
                {!isSubscribed && ev.isMyEvent && (role === 'admin' || role === 'secretary') && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteEvent(ev.id);
                      onCloseSelectedEvent();
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      background: '#fef2f2', border: '1.5px solid #fee2e2', color: '#ef4444',
                      padding: '10px', borderRadius: '12px', cursor: 'pointer',
                      fontWeight: 800, fontSize: '0.82rem',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Trash2 size={14} />
                    {isOverride ? 'Sichtbarkeit zurücksetzen' : 'Termin löschen'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 2. Student Event Detail Modal ── */}
      {selectedStudentEvent && (() => {
        const ev = selectedStudentEvent;
        const colors = getEventColors(ev);
        const studentPps = studentProgramPoints.filter(pp => pp.event_id === ev.id);
        const eventStartTimeVal = ev.event_start_time || ev.start_time || '18:00';
        const timeMap = calculateTimelineTimes(selectedEventAllPoints, eventStartTimeVal);

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Meine Event-Details"
            onClick={onCloseSelectedStudentEvent}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15,23,42,0.55)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '500px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
                overflow: 'hidden',
                fontFamily: 'Urbanist, sans-serif',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '85vh'
              }}
            >
              <div style={{ height: '5px', background: colors.color, width: '100%' }} />

              {/* Header */}
              <div style={{ padding: '22px 22px 0 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 900, color: colors.color,
                    background: colors.bg, padding: '4px 10px', borderRadius: '8px',
                    textTransform: 'uppercase', letterSpacing: '0.04em'
                  }}>
                    {ev.category}
                  </span>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 800,
                    color: '#0369a1',
                    background: '#e0f2fe',
                    padding: '4px 10px', borderRadius: '8px'
                  }}>
                    Mein Event
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Schließen"
                  onClick={onCloseSelectedStudentEvent}
                  style={{
                    background: '#f1f5f9', border: 'none', borderRadius: '50%',
                    width: '34px', height: '34px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <X size={16} color="#64748b" />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '16px 22px 24px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.25 }}>
                  {ev.title}
                </h2>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px' }}>
                    <Calendar size={13} color="#64748b" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                      {new Date(ev.event_date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  {(ev.event_start_time || ev.start_time) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px' }}>
                      <Clock size={13} color="#64748b" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                        {(ev.event_start_time || ev.start_time).substring(0, 5)}{ev.end_time ? ` – ${ev.end_time.substring(0, 5)}` : ''} Uhr
                      </span>
                    </div>
                  )}
                </div>

                {(ev.location_extern || (ev.location_type === 'intern' && ev.room)) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Ort</span>
                    <div style={{ fontSize: '0.84rem', fontWeight: 650, color: '#1e293b' }}>
                      {ev.location_type === 'intern' && ev.room ? `Raum: ${ev.room.name}` : ev.location_extern}
                      {ev.location_address && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{ev.location_address}</div>}
                    </div>
                  </div>
                )}

                {ev.event_description && (
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
                    {ev.event_description}
                  </div>
                )}

                <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />

                {/* Student's contributions */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Deine Auftrittsdetails
                  </h4>
                  
                  {loadingSelectedStudentEventPoints ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '0.8rem' }}>
                      Details laden...
                    </div>
                  ) : studentPps.length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic' }}>
                      Keine direkt zugewiesenen Beiträge gefunden. (Du bist dem Event zugeteilt)
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {studentPps.map(pp => {
                        const scheduledTimes = timeMap[pp.id];
                        return (
                          <div 
                            key={pp.id} 
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '16px',
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Beitrag
                                </span>
                                <div style={{ fontSize: '0.94rem', fontWeight: 850, color: '#0f172a' }}>
                                  {pp.name}
                                </div>
                              </div>
                              
                              {scheduledTimes && (
                                <div style={{ background: `${colors.color}15`, padding: '6px 12px', borderRadius: '10px', textAlign: 'right' }}>
                                  <span style={{ fontSize: '0.6rem', fontWeight: 800, color: colors.color, textTransform: 'uppercase', display: 'block' }}>
                                    Uhrzeit
                                  </span>
                                  <strong style={{ fontSize: '0.88rem', fontWeight: 900, color: colors.color }}>
                                    {scheduledTimes.start} - {scheduledTimes.end} Uhr
                                  </strong>
                                </div>
                              )}
                            </div>

                            {(pp.title || pp.artist) && (
                              <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                                {pp.title && (
                                  <div>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Titel</span>
                                    <span style={{ fontWeight: 650, color: '#334155' }}>"{pp.title}"</span>
                                  </div>
                                )}
                                {pp.artist && (
                                  <div>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Interpret</span>
                                    <span style={{ fontWeight: 650, color: '#334155' }}>{pp.artist}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                              <div>
                                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Bühne</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#334155' }}>Bühne {pp.stage_number || 1}</span>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Instrument</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#334155' }}>{pp.instrument || 'Keines'}</span>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Dauer</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#334155' }}>{pp.duration} Min</span>
                              </div>
                            </div>

                            {pp.remarks && (
                              <div>
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Hinweise / Kommentare</span>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#475569', fontStyle: 'italic' }}>
                                  {pp.remarks}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 3. CampusCalendarSyncHubModal ── */}
      <CampusCalendarSyncHubModal
        isOpen={showIcalModal}
        onClose={onCloseIcalModal}
        calendarToken={calendarToken}
        generatingToken={generatingToken}
        onRotateToken={onRotateToken}
        brandColor={brandColor}
        userId={userId}
        role={role}
        studentUser={studentUser}
        lessons={lessons}
        isMobilePortrait={isMobilePortrait}
        onOpenPinGate={onOpenPinGate}
        isParentUnlocked={isParentUnlocked}
      />

      {/* ── 4. CampusAppointmentShoutboxModal ── */}
      {activeChatOcc && (
        <CampusAppointmentShoutboxModal
          isOpen={Boolean(activeChatOcc)}
          onClose={onCloseChatOcc}
          occurrence={activeChatOcc}
          currentUserId={userId}
          currentUserRole={role as 'student' | 'teacher' | 'admin' | 'secretary'}
          currentUserProfile={studentUser || { id: userId, role }}
          isParentUnlocked={isParentUnlocked}
          onRequestPinGate={onOpenPinGate}
          onStatusChange={(newStatus, updatedOcc) => {
            onChatOccStatusChange?.(newStatus, updatedOcc);
            fetchLessons?.();
          }}
        />
      )}

      {/* ── 5. Master PIN Gate Modal ── */}
      {showPinGateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Eltern Master-PIN"
          onClick={onClosePinGateModal}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '28px',
              maxWidth: '380px',
              width: '100%',
              padding: '30px 24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '20px',
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Lock size={28} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                Eltern Master-PIN
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, fontWeight: 500 }}>
                Diese Funktion ist durch den Elternbereich geschützt. Bitte gib deine 6-stellige Eltern-Master-PIN ein.
              </p>
            </div>

            {pinGateError && (
              <div style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                background: '#fee2e2',
                color: '#dc2626',
                fontSize: '0.78rem',
                fontWeight: 700
              }}>
                {pinGateError}
              </div>
            )}

            {/* PIN Display Dots (6-stellig) */}
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              margin: '8px 0'
            }}>
              {[0, 1, 2, 3, 4, 5].map(idx => {
                const isFilled = pinGateInput.length > idx;
                return (
                  <div
                    key={idx}
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: isFilled ? '#0284c7' : '#e2e8f0',
                      border: isFilled ? '2px solid #0284c7' : '2px solid #cbd5e1',
                      transition: 'all 0.15s ease',
                      transform: isFilled ? 'scale(1.15)' : 'scale(1)'
                    }}
                  />
                );
              })}
            </div>

            {/* Touch Keypad */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              width: '100%',
              marginTop: '6px'
            }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => {
                const isClear = key === 'C';
                const isBack = key === '⌫';
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setPinGateError('');
                      if (isClear) {
                        setPinGateInput('');
                      } else if (isBack) {
                        setPinGateInput(prev => prev.slice(0, -1));
                      } else if (pinGateInput.length < 6) {
                        const nextVal = pinGateInput + key;
                        setPinGateInput(nextVal);
                        if (nextVal.length === 6) {
                          handleVerifyParentPin(nextVal);
                        }
                      }
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '16px',
                      border: '1.5px solid #f1f5f9',
                      background: isClear || isBack ? '#f8fafc' : '#ffffff',
                      color: isClear ? '#ef4444' : isBack ? '#64748b' : '#0f172a',
                      fontSize: isBack ? '1.1rem' : '1.25rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                      transition: 'all 0.12s ease'
                    }}
                  >
                    {key}
                  </button>
                );
              })}
            </div>

            {/* Biometric Passkey Unlock (Face ID / Touch ID) */}
            {isWebAuthnSupported() && (
              <button
                type="button"
                disabled={isVerifyingPin}
                onClick={handleBiometricUnlock}
                style={{
                  marginTop: '6px',
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  border: '1px solid #bae6fd',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  color: '#0284c7',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: isVerifyingPin ? 'not-allowed' : 'pointer',
                  opacity: isVerifyingPin ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Fingerprint size={20} />
                <span>{isVerifyingPin ? 'Wird geprüft...' : 'Mit Face ID / Touch ID entsperren'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClosePinGateModal}
              style={{
                marginTop: '6px',
                padding: '10px 18px',
                borderRadius: '100px',
                background: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ── 6. Collision Conflict Modal ── */}
      {collisionConflictData && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Terminplatz belegt"
          onClick={onCloseCollisionModal}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '28px',
              maxWidth: '440px',
              width: '100%',
              padding: '30px 24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '20px',
              background: '#fffbeb',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #fde68a'
            }}>
              <AlertTriangle size={28} color="#d97706" />
            </div>

            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                Terminplatz inzwischen belegt
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, fontWeight: 500 }}>
                Dein regulärer Termin ({new Date(collisionConflictData.occ.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} um {collisionConflictData.occ.start_time?.slice(0, 5)} Uhr) wurde nach deiner Absage von deiner Lehrkraft bereits anderweitig verplant.
              </p>
              {collisionConflictData.conflictingDetails && (
                <div style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: '#64748b'
                }}>
                  {collisionConflictData.conflictingDetails}
                </div>
              )}
            </div>

            {collisionRequestSent ? (
              <div style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: '#e6f4ea',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}>
                <CheckCircle2 size={24} color="#15803d" />
                <span>Anfrage erfolgreich gesendet!</span>
                <span style={{ fontSize: '0.74rem', fontWeight: 500, color: '#166534' }}>
                  Deine Lehrkraft wurde benachrichtigt und wird sich bei dir melden.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '4px' }}>
                <button
                  type="button"
                  disabled={collisionRequestLoading}
                  onClick={async () => {
                    try {
                      setCollisionRequestLoading(true);
                      const occ = collisionConflictData.occ;
                      const teacherId = occ.teacher_id || (occ.teacher as any)?.id;
                      const [y, m, d] = String(occ.date).split('-').map(Number);
                      const occDate = (y && m && d) ? new Date(y, m - 1, d) : new Date();
                      const shortDay = occDate.toLocaleDateString('de-DE', { weekday: 'short' });
                      const shortDate = occDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
                      const timeLabel = (occ.start_time || '16:30').slice(0, 5);
                      const targetOccId = occ.schedule_id ? `virtual-${occ.schedule_id}-${occ.date}` : occ.id;

                      const msgContent = `Reaktivierungs-Anfrage: Ich würde den abgesagten Termin am ${shortDay} ${shortDate} um ${timeLabel} Uhr gerne doch wahrnehmen. Finden wir eine gemeinsame Lösung?`;

                      await supabase.from('campus_direct_messages').insert({
                        sender_id: userId,
                        recipient_id: teacherId,
                        content: msgContent,
                        occurrence_id: targetOccId,
                        is_system: true,
                        message_type: 'reactivation_request'
                      });

                      setCollisionRequestSent(true);
                    } catch (err) {
                      console.error('Error sending reactivation request:', err);
                      alert('Fehler beim Senden der Anfrage.');
                    } finally {
                      setCollisionRequestLoading(false);
                    }
                  }}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '14px',
                    border: 'none',
                    background: '#34a853',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(52, 168, 83, 0.25)'
                  }}
                >
                  <Send size={15} color="#ffffff" />
                  <span>{collisionRequestLoading ? 'Sende Anfrage...' : 'Anfrage an Lehrkraft senden'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const occ = collisionConflictData.occ;
                    onCloseCollisionModal();
                    onOpenShoutboxFromConflict(occ);
                  }}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#334155',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Calendar size={15} color="#64748b" />
                  <span>Ausweichtermin in Shoutbox anfragen</span>
                </button>

                <button
                  type="button"
                  onClick={onCloseCollisionModal}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Abbrechen (Absage belassen)
                </button>
              </div>
            )}

            {collisionRequestSent && (
              <button
                type="button"
                onClick={onCloseCollisionModal}
                style={{
                  marginTop: '8px',
                  padding: '10px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Schließen
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
