import React, { useMemo } from 'react';
import { 
  CalendarDays, 
  CalendarPlus, 
  Calendar, 
  CheckCheck, 
  CalendarX, 
  Clock, 
  MapPin, 
  Users, 
  MessageSquare, 
  Lock, 
  X,
  RotateCcw
} from 'lucide-react';
import { LessonOccurrence } from '../types/campusEvents.types';
import { formatGermanDate, formatGermanWeekday } from '../../../../utils/formatters';
import { formatCombinedStudentNames, formatTeacherFullName } from '../../../../utils/nameHelper';

interface CampusLessonsColumnProps {
  lessons: LessonOccurrence[];
  loadingLessons: boolean;
  lessonTab: 'upcoming' | 'past' | 'cancelled';
  setLessonTab: (tab: 'upcoming' | 'past' | 'cancelled') => void;
  brandColor: string;
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  userId: string;
  studentUser?: any;
  isMobilePortrait: boolean;
  icalActive: boolean;
  calendarToken: string;
  generatingToken: boolean;
  fetchOrCreateCalendarToken: (forceRotate?: boolean) => Promise<void>;
  setShowIcalModal: (show: boolean) => void;
  activeChatOccIds: Set<string>;
  onOpenChat: (occ: LessonOccurrence) => void;
  onCancelOcc: (occ: LessonOccurrence) => void;
  isAbsenceAllowed: boolean;
  isChatAllowed: boolean;
  onRequestPinGate: (action: () => void) => void;
  checkIsParentUnlocked: () => boolean;
}

export function CampusLessonsColumn({
  lessons,
  loadingLessons,
  lessonTab,
  setLessonTab,
  brandColor,
  role,
  userId,
  studentUser,
  isMobilePortrait,
  icalActive,
  calendarToken,
  generatingToken,
  fetchOrCreateCalendarToken,
  setShowIcalModal,
  activeChatOccIds,
  onOpenChat,
  onCancelOcc,
  isAbsenceAllowed,
  isChatAllowed,
  onRequestPinGate,
  checkIsParentUnlocked
}: CampusLessonsColumnProps) {
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const filteredLessons = useMemo(() => {
    return lessons.filter(occ => {
      const isCancelled = ['cancelled', 'canceled_by_student', 'teacher_ausfall', 'canceled_by_teacher_ausfall'].includes(occ.status);
      if (lessonTab === 'cancelled') return isCancelled;
      if (isCancelled) return false;
      if (lessonTab === 'past') return occ.date < todayStr;
      return occ.date >= todayStr;
    });
  }, [lessons, lessonTab, todayStr]);

  return (
    <div id="tour-lessons-column" style={{
      background: isMobilePortrait ? 'transparent' : '#ffffff',
      border: isMobilePortrait ? 'none' : '1px solid rgba(0, 0, 0, 0.05)',
      borderRadius: isMobilePortrait ? '0' : '24px',
      padding: isMobilePortrait ? '0' : '16px',
      boxShadow: isMobilePortrait ? 'none' : '0 8px 32px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
      maxWidth: isMobilePortrait ? '820px' : '100%',
      minWidth: 0,
      margin: isMobilePortrait ? '0 auto' : '0',
      boxSizing: 'border-box',
      height: isMobilePortrait ? 'auto' : 'calc(100vh - 120px)',
      overflow: isMobilePortrait ? 'visible' : 'hidden'
    }}>
      {/* Header with Title & Subscribe Button */}
      <div style={{
        display: 'flex',
        flexDirection: isMobilePortrait ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobilePortrait ? 'stretch' : 'center',
        gap: '8px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarDays size={18} color={brandColor} style={{ flexShrink: 0 }} />
            <span>Unterrichtstermine</span>
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.74rem', margin: '2px 0 0 0', fontWeight: 550 }}>
            Deine persönlichen Stundenplandaten
          </p>
        </div>

        {icalActive && (
          <button
            onClick={() => {
              const isJuniorStudent = role === 'student' && ((studentUser as any)?.campus_ui_level === 'junior');
              const isAlreadyUnlocked = checkIsParentUnlocked();

              if (isJuniorStudent && !isAlreadyUnlocked) {
                onRequestPinGate(() => {
                  setShowIcalModal(true);
                  if (!calendarToken && !generatingToken) {
                    fetchOrCreateCalendarToken(false);
                  }
                });
                return;
              }

              setShowIcalModal(true);
              if (!calendarToken && !generatingToken) {
                fetchOrCreateCalendarToken(false);
              }
            }}
            className="hover-scale"
            title="Unterrichtstermine abonnieren (iCal)"
            style={{
              border: 'none',
              background: brandColor,
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)'
            }}
          >
            <CalendarPlus size={15} style={{ flexShrink: 0 }} />
            <span>{isMobilePortrait ? 'Unterrichtstermine abonnieren' : 'Abonnieren'}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        background: '#f1f5f9',
        padding: '4px',
        borderRadius: '14px',
        gap: '4px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {[
          { id: 'upcoming', label: 'Kommende', icon: Calendar },
          { id: 'past', label: 'Vergangene', icon: CheckCheck },
          { id: 'cancelled', label: 'Abgesagt', icon: CalendarX }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setLessonTab(t.id as any)}
            style={{
              flex: 1,
              border: 'none',
              background: lessonTab === t.id ? '#ffffff' : 'transparent',
              color: lessonTab === t.id ? brandColor : '#64748b',
              padding: '8px 10px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.80rem',
              cursor: 'pointer',
              boxShadow: lessonTab === t.id ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Occurrences List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        paddingRight: '2px'
      }}>
        {loadingLessons ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
            Lade Unterrichtstermine...
          </div>
        ) : filteredLessons.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '0.84rem',
            background: '#f8fafc',
            borderRadius: '16px',
            border: '1.5px dashed #e2e8f0'
          }}>
            Keine Termine in dieser Ansicht vorhanden.
          </div>
        ) : (
          filteredLessons.map(occ => {
            const isCancelled = ['cancelled', 'canceled_by_student', 'teacher_ausfall', 'canceled_by_teacher_ausfall'].includes(occ.status);
            const isRescheduled = ['pending_reschedule', 'rescheduled_confirmed'].includes(occ.status);
            const studentName = occ.student ? formatCombinedStudentNames(occ.student.first_name, occ.student.last_name, occ.student.id, true) : 'Schüler';
            const teacherName = occ.teacher ? formatTeacherFullName(occ.teacher) : 'Lehrkraft';
            const hasChat = activeChatOccIds.has(String(occ.id)) || (occ.schedule_id && activeChatOccIds.has(`virtual-${occ.schedule_id}-${occ.date}`));

            return (
              <div
                key={occ.id}
                style={{
                  background: isCancelled ? '#fff1f2' : '#ffffff',
                  border: isCancelled ? '1.5px dashed #fecdd3' : (isRescheduled ? '1.5px dashed #fef08a' : '1px solid #f1f5f9'),
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: brandColor }}>
                      {formatGermanWeekday(occ.date)}, {formatGermanDate(occ.date)}
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: isCancelled ? '#e11d48' : '#0f172a', marginTop: '2px' }}>
                      {role === 'student' ? teacherName : studentName}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#475569',
                      background: '#f1f5f9',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Clock size={12} />
                      {(occ.start_time || '14:00').slice(0, 5)} Uhr ({occ.duration || 45} min)
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} /> {occ.room_name || 'Musikraum'}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {/* Chat Trigger */}
                    <button
                      onClick={() => {
                        if (!isChatAllowed) {
                          onRequestPinGate(() => onOpenChat(occ));
                          return;
                        }
                        onOpenChat(occ);
                      }}
                      style={{
                        background: hasChat ? '#eff6ff' : '#f8fafc',
                        border: hasChat ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                        color: hasChat ? '#2563eb' : '#64748b',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <MessageSquare size={13} />
                      <span>Chat</span>
                    </button>

                    {/* Storno Trigger for upcoming */}
                    {!isCancelled && lessonTab === 'upcoming' && (
                      <button
                        onClick={() => {
                          if (role === 'student' && !isAbsenceAllowed && !checkIsParentUnlocked()) {
                            onRequestPinGate(() => onCancelOcc(occ));
                            return;
                          }
                          onCancelOcc(occ);
                        }}
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fee2e2',
                          color: '#ef4444',
                          padding: '6px 10px',
                          borderRadius: '10px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <X size={13} />
                        <span>Absagen</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
