import { supabase } from '../../lib/supabase';
import { formatSingleStudentAnonymized } from '../../utils/nameHelper';
import { isTeacherCurrentlyAbsent } from '../../utils/teacherAbsenceHelper';
import React from 'react';
import {
  AlertCircle, AlertTriangle, Bell, Building2, Calendar,
  Check, CheckCircle, ChevronDown, ChevronUp, Download,
  Edit3, Heart, Hourglass, MessageSquare, Plus, Sparkles,
  ThumbsUp, Trash2, Users, X
} from 'lucide-react';

export interface TeacherFeedWidgetProps {
  teacher: any;
  activeChatOcc: any;
  setActiveChatOcc: (occ: any) => void;
  rooms: any[];
  holidays: any[];
  myBookings: any[];
  myChangedAppointments: any[];
  showAllChangedAppointments: boolean;
  setShowAllChangedAppointments: React.Dispatch<React.SetStateAction<boolean>>;
  showAllBookings: boolean;
  setShowAllBookings: React.Dispatch<React.SetStateAction<boolean>>;
  bypassAbsenceView?: boolean;
  bypassAusfallView?: boolean;
  adminFeedbackRequests: any[];
  adminFeedbackResponses: any[];
  campusFeedAnnouncements: any[];
  feedInteractions: any[];
  teacherFeedTab: string;
  setTeacherFeedTab: (tab: any) => void;
  classFeedPosts: any[];
  classFeedInteractions: any[];
  respondingToRequestId: string | null;
  setRespondingToRequestId: React.Dispatch<React.SetStateAction<string | null>>;
  questionnaireAnswers: Record<string, any>;
  setQuestionnaireAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  submittingFeedback: boolean;
  adminFeedbackTab: string;
  setAdminFeedbackTab: (tab: any) => void;
  planningEvents: any[];
  mySubmittedProgramPoints: any[];
  visibleChangedAppointments: any[];
  activePlanningEvents: any[];
  activePlatform: string;
  handleBookingClick: (booking: any) => void;
  handleDeleteMyBooking: (bookingId: string) => Promise<void> | void;
  handleMarkRequestAsDone: (requestId: string) => Promise<void> | void;
  userId?: string;
  showRealNames: boolean;
  onTabChange?: (tab: string) => void;
  setMyChangedAppointments: React.Dispatch<React.SetStateAction<any[]>>;
  handleReactToPost: (postId: string, emoji: string, feedType?: any) => Promise<void> | void;
  handleSubmitFeedbackResponse: (requestId: string) => Promise<void> | void;
  getCountdownString: (dateStr: string) => string;
}

export const TeacherFeedWidget: React.FC<TeacherFeedWidgetProps> = ({
  teacher,
  activeChatOcc,
  setActiveChatOcc,
  rooms,
  holidays,
  myBookings,
  myChangedAppointments,
  showAllChangedAppointments,
  setShowAllChangedAppointments,
  showAllBookings,
  setShowAllBookings,
  bypassAbsenceView,
  bypassAusfallView,
  adminFeedbackRequests,
  adminFeedbackResponses,
  campusFeedAnnouncements,
  feedInteractions,
  teacherFeedTab,
  setTeacherFeedTab,
  classFeedPosts,
  classFeedInteractions,
  respondingToRequestId,
  setRespondingToRequestId,
  questionnaireAnswers,
  setQuestionnaireAnswers,
  submittingFeedback,
  adminFeedbackTab,
  setAdminFeedbackTab,
  planningEvents,
  mySubmittedProgramPoints,
  visibleChangedAppointments,
  activePlanningEvents,
  activePlatform,
  handleBookingClick,
  handleDeleteMyBooking,
  handleMarkRequestAsDone,
  userId,
  showRealNames,
  onTabChange,
  setMyChangedAppointments,
  handleReactToPost,
  handleSubmitFeedbackResponse,
  getCountdownString,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* 1. TERMINÄNDERUNGEN (Nächste 7 Tage) */}
      {visibleChangedAppointments.length > 0 && (
        <div style={{ 
          background: '#ffffff', 
          borderRadius: '24px', 
          padding: '20px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          marginBottom: '20px'
        }}>
        {/* Header with Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} color="#475569" />
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Terminänderungen
            </h3>
          </div>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 750,
            color: '#64748b',
            background: '#f1f5f9',
            padding: '2px 8px',
            borderRadius: '100px'
          }}>
            Nächste 7 Tage
          </span>
        </div>

        {/* List of Compact Item Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(showAllChangedAppointments ? visibleChangedAppointments : visibleChangedAppointments.slice(0, 3)).map((b: any) => {
              const dateObj = new Date(b.date);
              const isCancelled = ['cancelled', 'canceled_by_student', 'teacher_ausfall', 'canceled_by_teacher_ausfall'].includes(b.status);
              const isCancelledByStudent = b.status === 'canceled_by_student' || b.canceled_by_role === 'student';
              const isReactivated = Boolean(b.status === 'scheduled' && b.original_date && b.original_date === b.date);
              const isRescheduled = ['pending_reschedule', 'rescheduled_confirmed', 'rescheduled', 'open_reschedule', 'changed', 'pending', 'draft'].includes(b.status) || 
                Boolean(b.original_date && b.original_date !== b.date) ||
                Boolean(b.original_start_time && b.startTime && b.original_start_time !== b.startTime);
              const isConfirmed = b.status === 'rescheduled_confirmed' || b.student_acknowledged === true || b.studentAcknowledged === true;
              const isPending = b.status === 'pending' && !isRescheduled && !isReactivated;

              const isGroup = Boolean(b.isGroup || (b.studentName && b.studentName.includes('&')));

              let cardBg = '#f8fafc';
              let cardBorder = '1px solid #e2e8f0';
              let dateHeaderBg = '#34a853';
              let iconComponent: React.ReactNode = <Check size={11} strokeWidth={2.5} />;
              let iconBg = '#dcfce7';
              let iconColor = '#166534';
              let iconBorder = '1px solid #86efac';
              let textColor = '#0f172a';
              let subTextColor = '#64748b';
              let commentButtonBg = '#ffffff';
              let commentButtonColor = '#34a853';

              const rName = b.room_override_name || b.roomOverrideName || ((b.roomName && b.roomName !== 'Raum') ? b.roomName : (b.rooms?.name && b.rooms?.name !== 'Raum' ? b.rooms?.name : (b.room || b.raum || '')));
              const defaultRoomName = b.schedules?.rooms?.name || b.schedules?.room?.name || b.original_room_name || b.originalRoomName || b.template_room_name;
              const isRoomChanged = Boolean(
                b.room_override_id || 
                b.roomOverrideId || 
                b.room_override_name || 
                b.roomOverrideName || 
                b.is_room_changed || 
                b.isRoomChanged || 
                b.is_room_booking || 
                b.isRoomBooking || 
                (defaultRoomName && rName && defaultRoomName !== rName) || 
                (b.original_room_id && b.roomId && String(b.original_room_id) !== String(b.roomId)) ||
                (b.original_room_id && b.room_id && String(b.original_room_id) !== String(b.room_id))
              );

              if (isCancelled) {
                dateHeaderBg = '#ef4444';
                iconComponent = <X size={11} strokeWidth={2.5} />;
                iconBg = '#fee2e2';
                iconColor = '#991b1b';
                iconBorder = '1px solid #fca5a5';
                textColor = '#991b1b';
                subTextColor = '#b91c1c';
                commentButtonBg = '#ffffff';
                commentButtonColor = '#ef4444';

                cardBg = 'repeating-linear-gradient(-45deg, #fef2f2 0px, #fef2f2 8px, #ffffff 8px, #ffffff 16px)';
                cardBorder = '1px solid #fca5a5';
              } else if (isRoomChanged) {
                dateHeaderBg = '#7c3aed';
                textColor = '#6b21a8';
                subTextColor = '#7c3aed';
                commentButtonBg = '#ffffff';
                commentButtonColor = '#7c3aed';

                if (isConfirmed) {
                  cardBg = '#faf5ff';
                  cardBorder = '1.5px solid #7c3aed';
                  iconComponent = <Check size={11} strokeWidth={2.5} />;
                  iconBg = '#f3e8ff';
                  iconColor = '#6b21a8';
                  iconBorder = '1px solid #ddd6fe';
                } else {
                  cardBg = 'repeating-linear-gradient(-45deg, #faf5ff 0px, #faf5ff 8px, #ffffff 8px, #ffffff 16px)';
                  cardBorder = '1.5px dashed #7c3aed';
                  iconComponent = <Hourglass size={10} />;
                  iconBg = '#f3e8ff';
                  iconColor = '#7c3aed';
                  iconBorder = '1px solid #ddd6fe';
                }
              } else if (isReactivated) {
                dateHeaderBg = '#34a853';
                iconComponent = <Check size={11} strokeWidth={2.5} />;
                iconBg = '#dcfce7';
                iconColor = '#166534';
                iconBorder = '1px solid #86efac';
                textColor = '#166534';
                subTextColor = '#15803d';
                commentButtonBg = '#ffffff';
                commentButtonColor = '#34a853';
                cardBg = '#f0fdf4';
                cardBorder = '1.5px solid #86efac';
              } else if (isRescheduled) {
                if (isGroup) {
                  dateHeaderBg = '#0284c7';
                  textColor = '#0369a1';
                  subTextColor = '#0284c7';
                  commentButtonBg = '#ffffff';
                  commentButtonColor = '#0284c7';

                  if (isConfirmed) {
                    cardBg = '#f0f9ff';
                    cardBorder = '1.5px solid #0284c7';
                    iconComponent = <Check size={11} strokeWidth={2.5} />;
                    iconBg = '#dcfce7';
                    iconColor = '#15803d';
                    iconBorder = '1px solid #86efac';
                  } else {
                    cardBg = 'repeating-linear-gradient(-45deg, #f0f9ff 0px, #f0f9ff 8px, #ffffff 8px, #ffffff 16px)';
                    cardBorder = '1.5px dashed #0284c7';
                    iconComponent = <Hourglass size={10} />;
                    iconBg = '#e0f2fe';
                    iconColor = '#0284c7';
                    iconBorder = '1px solid #bae6fd';
                  }
                } else {
                  dateHeaderBg = '#eab308';
                  textColor = '#854d0e';
                  subTextColor = '#a16207';
                  commentButtonBg = '#ffffff';
                  commentButtonColor = '#ca8a04';

                  if (isConfirmed) {
                    cardBg = '#fffbeb';
                    cardBorder = '1.5px solid #eab308';
                    iconComponent = <Check size={11} strokeWidth={2.5} />;
                    iconBg = '#dcfce7';
                    iconColor = '#15803d';
                    iconBorder = '1px solid #86efac';
                  } else {
                    cardBg = 'repeating-linear-gradient(-45deg, #fefce8 0px, #fefce8 8px, #ffffff 8px, #ffffff 16px)';
                    cardBorder = '1.5px dashed #eab308';
                    iconComponent = <Hourglass size={10} />;
                    iconBg = '#fef3c7';
                    iconColor = '#b45309';
                    iconBorder = '1px solid #fde68a';
                  }
                }
              } else if (isPending) {
                cardBg = '#f5f3ff';
                cardBorder = '1px solid #ddd6fe';
                dateHeaderBg = '#8b5cf6';
                iconComponent = <Hourglass size={10} />;
                iconBg = '#ede9fe';
                iconColor = '#6d28d9';
                iconBorder = '1px solid #c4b5fd';
                textColor = '#5b21b6';
                subTextColor = '#6d28d9';
                commentButtonBg = '#ffffff';
                commentButtonColor = '#7c3aed';
              }

              const displayStudentName = (() => {
                if (!b.studentName) return null;
                if (b.studentName.includes('&')) {
                  const parts = b.studentName.split('&');
                  const firstNames = parts.map((part: string) => part.trim().split(' ')[0]);
                  return firstNames.join(', ');
                }
                return b.studentName;
              })();

              return (
                <div 
                  key={b.id} 
                  onClick={() => handleBookingClick(b)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    background: cardBg, 
                    borderRadius: '12px', 
                    padding: '8px 12px', 
                    cursor: 'pointer',
                    border: cardBorder,
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                  className="hover-scale"
                >
                  <div style={{ 
                    width: '44px', 
                    height: '44px',
                    borderRadius: '10px', 
                    overflow: 'hidden', 
                    border: '1px solid rgba(0,0,0,0.08)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    textAlign: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: 'white',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ background: dateHeaderBg, color: '#ffffff', fontSize: '9.5px', fontWeight: 900, padding: '2px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {dateObj.toLocaleDateString('de-DE', { month: 'short' })}
                    </div>
                    <div style={{ color: '#1e293b', fontSize: '15px', fontWeight: 900, padding: '2px 0 3px 0', lineHeight: 1 }}>
                      {dateObj.toLocaleDateString('de-DE', { day: '2-digit' })}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', width: '100%' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: textColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {dateObj.toLocaleDateString('de-DE', { weekday: 'short' })} {b.startTime} Uhr
                      </div>

                      <span 
                        title={isCancelled ? 'Dieser Unterrichtstermin entfällt' : (isReactivated ? 'Reaktiviert' : (isConfirmed ? 'Bestätigt' : 'Unbestätigt'))}
                        style={{ 
                          fontSize: '10px', 
                          fontWeight: 800, 
                          background: iconBg, 
                          color: iconColor, 
                          border: iconBorder, 
                          padding: '2.5px 7px', 
                          borderRadius: '6px', 
                          lineHeight: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          flexShrink: 0,
                          fontFamily: "'Plus Jakarta Sans', sans-serif"
                        }}
                      >
                        {isCancelled ? (
                          <>
                            <X size={10} strokeWidth={3} />
                            <span>Entfällt</span>
                          </>
                        ) : iconComponent}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.80rem', color: subTextColor, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isGroup && <Users size={12} style={{ color: subTextColor, flexShrink: 0 }} />}
                      <span>{displayStudentName ? displayStudentName : ''}</span>
                    </div>
                  </div>

                  {/* Rechte Aktionsspalte (36×36px Squircle Buttons, kein Textüberdecken) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {isCancelledByStudent && !b.teacher_acknowledged && b.teacherAcknowledged !== true && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const occId = b.id || b.occurrence_id || b.ids?.[0];
                            if (occId) {
                              await supabase
                                .from('schedule_occurrences')
                                .update({ teacher_acknowledged: true })
                                .eq('id', occId);
                            }
                            setMyChangedAppointments((prev: any[]) => prev.map((a: any) => (a.id === b.id || a.id === occId) ? { ...a, teacher_acknowledged: true, teacherAcknowledged: true } : a));
                          } catch(err) {
                            console.error(err);
                          }
                        }}
                        title="Terminabsage des Schülers als gesehen markieren"
                        aria-label="Terminabsage des Schülers als gesehen markieren"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(220, 38, 38, 0.06)'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#fecaca';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = '#fee2e2';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Check size={16} strokeWidth={2.8} />
                      </button>
                    )}

                    {b.isSchedule && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveChatOcc({
                            ...b,
                            id: b.id || b.ids?.[0],
                            date: b.date,
                            start_time: b.startTime || b.start_time,
                            student_id: b.student_id || b.studentId || b.id,
                            student: {
                              first_name: displayStudentName || b.studentName || 'Schüler'
                            }
                          });
                        }}
                        title="Termingekoppelte Shoutbox öffnen"
                        aria-label="Termingekoppelte Shoutbox öffnen"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: commentButtonBg,
                          color: commentButtonColor,
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          border: '1px solid rgba(0,0,0,0.06)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          flexShrink: 0,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <MessageSquare size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {visibleChangedAppointments.length > 3 && (
            <button
              onClick={() => setShowAllChangedAppointments(!showAllChangedAppointments)}
              style={{
                width: '100%',
                marginTop: '10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              {showAllChangedAppointments ? (
                <>
                  <span>Weniger anzeigen</span>
                  <ChevronUp size={14} />
                </>
              ) : (
                <>
                  <span>Alle {visibleChangedAppointments.length} Terminänderungen anzeigen</span>
                  <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* 2. MEINE BUCHUNGEN */}
      {myBookings.length > 0 && (
        <div style={{ 
          background: '#ffffff', 
          borderRadius: '24px', 
          padding: '20px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Calendar size={18} color="#475569" />
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Meine Buchungen</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(showAllBookings ? myBookings : myBookings.slice(0, 3)).map((b: any) => {
              const dateObj = new Date(b.date);
              const isCancelled = b.status === 'cancelled';
              const isRescheduled = b.status === 'pending_reschedule' || b.status === 'rescheduled_confirmed';
              const isPending = b.status === 'pending';

              let cardBg = '#f8fafc';
              let dateHeaderBg = '#8b5cf6';
              let label = 'Gebucht';
              let labelBg = 'rgba(139, 92, 246, 0.12)';
              let labelTextColor = '#7c3aed';
              let textColor = '#0f172a';
              let subTextColor = '#64748b';

              if (isCancelled) {
                cardBg = '#fef2f2';
                dateHeaderBg = '#ef4444';
                label = 'Ausfall';
                labelBg = '#ef4444';
                labelTextColor = '#ffffff';
                textColor = '#991b1b';
                subTextColor = '#b91c1c';
              } else if (isRescheduled) {
                cardBg = '#fefce8';
                dateHeaderBg = '#eab308';
                label = 'Verschoben';
                labelBg = '#eab308';
                labelTextColor = '#ffffff';
                textColor = '#854d0e';
                subTextColor = '#a16207';
              } else if (isPending) {
                cardBg = '#f5f3ff';
                dateHeaderBg = '#8b5cf6';
                label = 'Reserviert';
                labelBg = '#8b5cf6';
                labelTextColor = '#ffffff';
                textColor = '#5b21b6';
                subTextColor = '#6d28d9';
              }

              const rName = (b.roomName && b.roomName !== 'Raum') ? b.roomName : (b.rooms?.name && b.rooms?.name !== 'Raum' ? b.rooms?.name : '');
              const isGroup = Boolean(b.isGroup || (b.studentName && b.studentName.includes('&')));
              const displayStudentName = b.studentName ? formatSingleStudentAnonymized(b.studentName, null, b.id, showRealNames) : null;

              return (
                <div 
                  key={b.id} 
                  onClick={() => handleBookingClick(b)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    background: cardBg, 
                    borderRadius: '12px', 
                    padding: '8px 12px', 
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                  className="hover-scale"
                >
                  <div style={{ 
                    width: '38px', 
                    borderRadius: '8px', 
                    overflow: 'hidden', 
                    border: '1px solid rgba(0,0,0,0.08)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    textAlign: 'center', 
                    flexShrink: 0,
                    background: 'white'
                  }}>
                    <div style={{ background: dateHeaderBg, color: '#ffffff', fontSize: '0.55rem', fontWeight: 800, padding: '2px 0', textTransform: 'uppercase' }}>
                      {dateObj.toLocaleDateString('de-DE', { month: 'short' })}
                    </div>
                    <div style={{ color: '#1e293b', fontSize: '0.95rem', fontWeight: 900, padding: '2px 0', lineHeight: 1 }}>
                      {dateObj.toLocaleDateString('de-DE', { day: '2-digit' })}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', width: '100%' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: textColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {dateObj.toLocaleDateString('de-DE', { weekday: 'short' })} {b.startTime} Uhr
                      </div>

                      <span style={{ 
                        fontSize: '0.55rem', 
                        fontWeight: 900, 
                        background: labelBg, 
                        color: labelTextColor, 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}>
                        {label}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isGroup && <Users size={12} style={{ color: subTextColor, flexShrink: 0 }} />}
                      <span>
                        {displayStudentName ? displayStudentName : ''}
                        {displayStudentName && rName ? ` • ${rName}` : rName}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteMyBooking(b); }}
                    style={{
                      background: '#ff453a15',
                      color: '#ff453a',
                      border: 'none',
                      borderRadius: '8px',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                    title="Buchung stornieren"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {myBookings.length > 3 && (
            <button
              onClick={() => setShowAllBookings(!showAllBookings)}
              style={{
                width: '100%',
                marginTop: '10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              {showAllBookings ? (
                <>
                  <span>Weniger anzeigen</span>
                  <ChevronUp size={14} />
                </>
              ) : (
                <>
                  <span>Alle {myBookings.length} Buchungen anzeigen</span>
                  <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* 3. INFOS DER VERWALTUNG & MITTEILUNGEN */}
      {(!isTeacherCurrentlyAbsent(teacher) || bypassAbsenceView || bypassAusfallView) && (
        <>
          {/* INFOS DER VERWALTUNG */}
          <div style={{ 
            background: '#ffffff', 
            borderRadius: '16px', 
            padding: '16px', 
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
            border: '1px solid #e2e8f0'
          }}>
            {(() => {
              const feedbackCount = adminFeedbackRequests.filter(r => !adminFeedbackResponses.find(res => res.request_id === r.id)).length;
              const pendingFeedbackPoints = mySubmittedProgramPoints.filter(pp => 
                pp.additional_feedback_responses?.questions?.some((_: any, idx: number) => !pp.additional_feedback_responses.answers?.[idx])
              );
              const totalOpenCount = feedbackCount + activePlanningEvents.length + pendingFeedbackPoints.length;
              
              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bell size={16} color={totalOpenCount > 0 ? "#ea580c" : "#34a853"} style={{ strokeWidth: 2.2 }} />
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.01em' }}>Infos der Verwaltung</h3>
                  </div>
                  {totalOpenCount > 0 && (
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      color: '#ffffff',
                      background: '#ea580c',
                      padding: '2px 8px',
                      borderRadius: '100px',
                      boxShadow: '0 2px 6px rgba(234, 88, 12, 0.3)'
                    }}>
                      {totalOpenCount} offen
                    </span>
                  )}
                </div>
              );
            })()}

            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              borderRadius: '8px',
              padding: '3px',
              marginBottom: '14px',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {(['open', 'done'] as const).map(tab => {
                const isActive = adminFeedbackTab === tab;
                const feedbackCount = adminFeedbackRequests.filter(r => !adminFeedbackResponses.find(res => res.request_id === r.id)).length;
                const pendingFeedbackPoints = mySubmittedProgramPoints.filter(pp => 
                  pp.additional_feedback_responses?.questions?.some((_: any, idx: number) => !pp.additional_feedback_responses.answers?.[idx])
                );
                const openCount = feedbackCount + activePlanningEvents.length + pendingFeedbackPoints.length;
                const label = tab === 'open' ? `Offen${openCount > 0 ? ` (${openCount})` : ''}` : 'Erledigt';
                return (
                  <button
                    key={tab}
                    onClick={() => setAdminFeedbackTab(tab)}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: '6px',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      background: isActive ? '#ffffff' : 'transparent',
                      color: isActive ? '#0f172a' : '#64748b',
                      boxShadow: isActive ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const pendingFeedbackPoints = mySubmittedProgramPoints.filter(pp => 
                  pp.additional_feedback_responses?.questions?.some((_: any, idx: number) => !pp.additional_feedback_responses.answers?.[idx])
                );

                if (adminFeedbackRequests.length === 0 && activePlanningEvents.length === 0 && pendingFeedbackPoints.length === 0) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '16px 0', textAlign: 'center', opacity: 0.6 }}>
                      <Bell size={20} color="#94a3b8" style={{ strokeWidth: 1.5 }} />
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                        Keine neuen Mitteilungen oder Anfragen vorhanden.
                      </span>
                    </div>
                  );
                }

                if (adminFeedbackTab === 'open') {
                  const openItems = adminFeedbackRequests.filter(r => !adminFeedbackResponses.find(res => res.request_id === r.id));
                  if (openItems.length === 0 && activePlanningEvents.length === 0 && pendingFeedbackPoints.length === 0) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '16px 0', textAlign: 'center' }}>
                        <CheckCircle size={20} color="#34a853" style={{ strokeWidth: 1.5 }} />
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Alle Anfragen beantwortet!</span>
                      </div>
                    );
                  }
                  return (
                    <>
                      {pendingFeedbackPoints.map(pp => {
                        const ev = planningEvents.find(e => e.id === pp.event_id);
                        const evTitle = ev ? ev.title : 'Event';
                        return (
                          <div
                            key={`feedback-card-${pp.id}`}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #f1f5f9',
                              borderLeft: '4px solid #f59e0b',
                              borderRadius: '12px',
                              padding: '12px 14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                                  {pp.name} ({evTitle})
                                </h4>
                                <p style={{ margin: 0, fontSize: '0.76rem', color: '#475569', lineHeight: 1.4, fontWeight: 500 }}>
                                  Die Verwaltung hat eine Rückfrage zu deiner Einreichung gestellt.
                                </p>
                              </div>
                              <span style={{ fontSize: '9px', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <AlertTriangle size={11} /> Offene Rückfrage
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                              <button
                                onClick={() => {
                                  localStorage.setItem('groovelab_auto_submit_event_id', pp.event_id);
                                  localStorage.setItem('groovelab_auto_submit_tab', 'feedback');
                                  onTabChange?.('events');
                                }}
                                style={{
                                  background: '#d97706',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '5px 12px',
                                  borderRadius: '8px',
                                  fontWeight: 600,
                                  fontSize: '0.74rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <MessageSquare size={12} /> Jetzt beantworten
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {activePlanningEvents.map(ev => (
                        <div
                          key={`planning-card-${ev.id}`}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #f1f5f9',
                            borderLeft: '4px solid #f97316',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                                {ev.title}
                              </h4>
                              <p style={{ margin: 0, fontSize: '0.76rem', color: '#475569', lineHeight: 1.4, fontWeight: 500 }}>
                                Bitte reiche dein Programm für diese Veranstaltung ein.
                              </p>
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#ea580c', background: '#ffedd5', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Calendar size={11} /> Programmeinreichung
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                            <span style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 600 }}>
                              {ev.submission_deadline ? getCountdownString(ev.submission_deadline) : ''}
                            </span>
                            <button
                              onClick={() => {
                                localStorage.setItem('groovelab_auto_submit_event_id', ev.id);
                                onTabChange?.('events');
                              }}
                              style={{
                                background: '#ea580c',
                                color: '#ffffff',
                                border: 'none',
                                padding: '5px 12px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '0.74rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Plus size={12} /> Jetzt Einreichen
                            </button>
                          </div>
                        </div>
                      ))}

                      {openItems.map(item => {
                        const isResponding = respondingToRequestId === item.id;
                        const isQuestionnaire = item.questions && item.questions.length > 0;

                        return (
                          <div 
                            key={item.id} 
                            style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '10px',
                              border: '1px solid #f1f5f9',
                              borderLeft: `4px solid ${item.priority === 'critical' ? '#ef4444' : '#34a853'}`,
                              background: item.priority === 'critical' ? '#fff5f5' : '#ffffff',
                              borderRadius: '12px',
                              padding: '14px',
                              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{item.title}</h4>
                                {item.description && (
                                  <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#475569', lineHeight: 1.4, fontWeight: 500 }}>
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <span style={{ fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: item.priority === 'critical' ? '#fee2e2' : '#e6f4ea', color: item.priority === 'critical' ? '#ef4444' : '#34a853', display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                <AlertCircle size={11} /> {item.priority === 'critical' ? 'Kritisch' : 'Aktion erforderlich'}
                              </span>
                            </div>

                            {/* Attachment Link if present */}
                            {item.attachment_url && (
                              <a
                                href={item.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#2563eb',
                                  textDecoration: 'none'
                                }}
                              >
                                <Download size={12} /> Anhang öffnen
                              </a>
                            )}

                            {/* Questionnaire Expansion / Form */}
                            {isQuestionnaire ? (
                              isResponding ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                                  {item.questions.map((qItem: any, qIdx: number) => {
                                    const qKey = typeof qItem === 'string' ? qItem : qItem.text;
                                    const qType = typeof qItem === 'string' ? 'text' : (qItem.type || 'text');
                                    const qOptions: string[] = typeof qItem === 'object' && qItem.options ? qItem.options : (qType === 'boolean' ? ['Ja', 'Nein'] : []);
                                    const currentAns = questionnaireAnswers[qKey] || '';

                                    return (
                                      <div key={qIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '0.76rem', fontWeight: 750, color: '#334155' }}>
                                          {qIdx + 1}. {qKey}
                                        </label>
                                        {qType === 'choice' || qType === 'boolean' ? (
                                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {qOptions.map((opt: string) => {
                                              const isSelected = currentAns === opt;
                                              return (
                                                <button
                                                  key={opt}
                                                  type="button"
                                                  onClick={() => setQuestionnaireAnswers(prev => ({ ...prev, [qKey]: opt }))}
                                                  style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    border: isSelected ? '1.5px solid #34a853' : '1px solid #cbd5e1',
                                                    background: isSelected ? '#34a853' : '#ffffff',
                                                    color: isSelected ? '#ffffff' : '#475569',
                                                    fontWeight: isSelected ? 800 : 600,
                                                    fontSize: '0.74rem',
                                                    cursor: 'pointer'
                                                  }}
                                                >
                                                  {opt}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <textarea
                                            value={currentAns}
                                            onChange={(e) => setQuestionnaireAnswers(prev => ({ ...prev, [qKey]: e.target.value }))}
                                            placeholder="Antwort eingeben..."
                                            rows={2}
                                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none' }}
                                          />
                                        )}
                                      </div>
                                    );
                                  })}

                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                                    <button
                                      type="button"
                                      onClick={() => setRespondingToRequestId(null)}
                                      style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 650, cursor: 'pointer' }}
                                    >
                                      Abbrechen
                                    </button>
                                    <button
                                      type="button"
                                      disabled={submittingFeedback}
                                      onClick={() => handleSubmitFeedbackResponse(item.id)}
                                      style={{ background: '#34a853', color: '#ffffff', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 750, cursor: 'pointer' }}
                                    >
                                      {submittingFeedback ? 'Senden...' : 'Absenden'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                                  <button
                                    onClick={() => setRespondingToRequestId(item.id)}
                                    style={{
                                      background: '#3b82f6',
                                      color: '#ffffff',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      fontWeight: 700,
                                      fontSize: '0.74rem',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <Edit3 size={12} /> Fragebogen ausfüllen
                                  </button>
                                </div>
                              )
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '2px' }}>
                                <button
                                  onClick={() => handleMarkRequestAsDone(item.id)}
                                  disabled={submittingFeedback}
                                  style={{ 
                                    background: '#34a853', 
                                    color: '#ffffff', 
                                    border: 'none', 
                                    padding: '6px 12px', 
                                    borderRadius: '8px', 
                                    fontWeight: 700, 
                                    fontSize: '0.74rem', 
                                    cursor: 'pointer', 
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px' 
                                  }}
                                >
                                  <CheckCircle size={12} /> Erledigt
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  );
                }

                const doneItems = adminFeedbackRequests
                  .filter(r => adminFeedbackResponses.find(res => res.request_id === r.id))
                  .slice(0, 5);
                if (doneItems.length === 0) {
                  return (
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', padding: '12px 0', textAlign: 'center', display: 'block' }}>
                      Noch keine erledigten Rückmeldungen.
                    </span>
                  );
                }
                return doneItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{item.title}</div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* LIVE CAMPUS FEED */}
          <div style={{ 
            background: '#ffffff', 
            borderRadius: '24px', 
            padding: '24px', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sparkles size={18} color={activePlatform === 'campus' ? '#34a853' : '#eab308'} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mitteilungen</h3>
            </div>

            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              borderRadius: '8px',
              padding: '3px',
              marginBottom: '16px',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {([
                { id: 'campus', label: 'Campus', icon: <Building2 size={13} style={{ marginRight: '4px' }} /> },
                { id: 'class', label: 'Klassen-Feed', icon: <Users size={13} style={{ marginRight: '4px' }} /> }
              ] as const).map(t => {
                const isActive = teacherFeedTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTeacherFeedTab(t.id)}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: '6px',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      background: isActive ? '#ffffff' : 'transparent',
                      color: isActive ? '#0f172a' : '#64748b',
                      boxShadow: isActive ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {teacherFeedTab === 'campus' ? (
                campusFeedAnnouncements.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0', textAlign: 'center', opacity: 0.6 }}>
                    <Sparkles size={24} color="#94a3b8" style={{ strokeWidth: 1.5 }} />
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                      Keine aktuellen Campus-Mitteilungen vorhanden.
                    </span>
                  </div>
                ) : (
                  campusFeedAnnouncements.slice(0, 5).map((item, idx, arr) => {
                    const postReactions = feedInteractions.filter(i => i.post_id === item.id);
                    const thumbsUpCount = postReactions.filter(i => i.emoji_unicode === '👍').length;
                    const heartCount = postReactions.filter(i => i.emoji_unicode === '❤️').length;
                    const userHasThumbsUp = postReactions.some(i => i.emoji_unicode === '👍' && i.user_id === userId);
                    const userHasHeart = postReactions.some(i => i.emoji_unicode === '❤️' && i.user_id === userId);

                    let categoryLabel = 'Info';
                    let categoryBg = '#f1f5f9';
                    let categoryColor = '#475569';
                    if (item.category === 'announcement') {
                      categoryLabel = 'Ankündigung';
                    } else if (item.category === 'event') {
                      categoryLabel = 'Event';
                    } else if (item.category === 'holidays') {
                      categoryLabel = 'Ferien';
                    }

                    if (item.is_emergency) {
                      categoryColor = '#b91c1c';
                      categoryBg = '#fce8e6';
                    }

                    return (
                      <div key={item.id} style={{
                        paddingBottom: idx === arr.length - 1 ? '0' : '16px',
                        borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '9px', fontWeight: 800, color: categoryColor, background: categoryBg, padding: '2px 8px', borderRadius: '100px', textTransform: 'uppercase' }}>
                            {categoryLabel}
                          </span>
                          <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 650 }}>
                            {new Date(item.created_at).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                        
                        <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                          {item.title}
                        </h5>
                        
                        <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                          {item.content}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <button 
                            onClick={() => handleReactToPost(item.id, '👍', 'campus')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: userHasThumbsUp ? '#e6f4ea' : 'transparent',
                              border: '1px solid',
                              borderColor: userHasThumbsUp ? '#34a853' : '#e2e8f0',
                              color: userHasThumbsUp ? '#34a853' : '#64748b',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <ThumbsUp size={11} color={userHasThumbsUp ? '#34a853' : '#64748b'} />
                            <span>{thumbsUpCount}</span>
                          </button>
                          <button 
                            onClick={() => handleReactToPost(item.id, '❤️', 'campus')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: userHasHeart ? '#fce8e6' : 'transparent',
                              border: '1px solid',
                              borderColor: userHasHeart ? '#ea4335' : '#e2e8f0',
                              color: userHasHeart ? '#ea4335' : '#64748b',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Heart size={11} color={userHasHeart ? '#ea4335' : '#64748b'} fill={userHasHeart ? '#ea4335' : 'transparent'} />
                            <span>{heartCount}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                classFeedPosts.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0', textAlign: 'center', opacity: 0.6 }}>
                    <Users size={24} color="#94a3b8" style={{ strokeWidth: 1.5 }} />
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                      Keine Beiträge im Klassen-Feed vorhanden.
                    </span>
                  </div>
                ) : (
                  classFeedPosts.slice(0, 5).map((item, idx, arr) => {
                    const postReactions = classFeedInteractions.filter(i => i.post_id === item.id);
                    const thumbsUpCount = postReactions.filter(i => i.emoji_unicode === '👍').length;
                    const heartCount = postReactions.filter(i => i.emoji_unicode === '❤️').length;
                    const userHasThumbsUp = postReactions.some(i => i.emoji_unicode === '👍' && i.user_id === userId);
                    const userHasHeart = postReactions.some(i => i.emoji_unicode === '❤️' && i.user_id === userId);

                    return (
                      <div key={item.id} style={{
                        paddingBottom: idx === arr.length - 1 ? '0' : '16px',
                        borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                          {item.title}
                        </h5>
                        <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                          {item.content}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <button 
                            onClick={() => handleReactToPost(item.id, '👍', 'class')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: userHasThumbsUp ? '#e6f4ea' : 'transparent',
                              border: '1px solid',
                              borderColor: userHasThumbsUp ? '#34a853' : '#e2e8f0',
                              color: userHasThumbsUp ? '#34a853' : '#64748b',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <ThumbsUp size={11} color={userHasThumbsUp ? '#34a853' : '#64748b'} />
                            <span>{thumbsUpCount}</span>
                          </button>
                          <button 
                            onClick={() => handleReactToPost(item.id, '❤️', 'class')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: userHasHeart ? '#fce8e6' : 'transparent',
                              border: '1px solid',
                              borderColor: userHasHeart ? '#ea4335' : '#e2e8f0',
                              color: userHasHeart ? '#ea4335' : '#64748b',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Heart size={11} color={userHasHeart ? '#ea4335' : '#64748b'} fill={userHasHeart ? '#ea4335' : 'transparent'} />
                            <span>{heartCount}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

};
