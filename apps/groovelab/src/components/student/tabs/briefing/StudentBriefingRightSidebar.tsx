import React from 'react';
import {
  Calendar,
  CalendarX,
  Sparkles,
  ChevronRight,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  RotateCcw,
  Check,
  Music,
  School,
  Target,
  Users,
  Lock,
  X
} from 'lucide-react';
import { getSimulatedNow } from '../../studentDateUtils';

export interface StudentBriefingRightSidebarProps {
  isRightSidebarCollapsed: boolean;
  handleToggleRightSidebar: (collapse: boolean) => void;
  sidebarTotalAlertsCount: number;
  hasSidebarAppointmentAlerts: boolean;
  handleTabChangeLocal: (tab: string) => void;
  scheduleOccurrences: any[];
  schoolYearOccurrences: any[];
  isMusicStandMode: boolean;
  getOccRoomName: (occ: any) => string;
  checkOccurrenceHasMessages: (occ: any, dateStr?: string) => boolean;
  getOccurrenceUnreadCount: (occ: any) => number;
  setAppointmentChatData: (data: any) => void;
  setShowAppointmentChat: (show: boolean) => void;
  handleTriggerConfirmReschedule: (occ: any) => void;
  handleRejectReschedule: (occ: any) => void;
  handleAcknowledgeCancellation: (occ: any) => void;
  onOpenRescheduleBottomSheet?: (occ: any) => void;
  studentFeedTab: string;
  setStudentFeedTab: (tab: string) => void;
  campusFeedAnnouncements: any[];
  classFeedPosts: any[];
  classFeedInteractions: any[];
  unreadClassFeedCount: number;
  studentId: string;
  handleReactToPost: (postId: string, type: string) => void;
  handleSubmitClassFeedInteraction: (postId: string, type: string, optionIdx?: any, isCorrect?: any) => void;
  handleOpenContributions?: (title?: string, minutes?: number) => void;
  isStudentRescheduleAllowed?: boolean;
  classGoals?: any[];
  classWeeklyMins?: number;
  feedInteractions?: any[];
  effectiveLevel?: number | string;
}

export function StudentBriefingRightSidebar({
  effectiveLevel,
  isRightSidebarCollapsed,
  handleToggleRightSidebar,
  sidebarTotalAlertsCount,
  hasSidebarAppointmentAlerts,
  handleTabChangeLocal,
  scheduleOccurrences,
  schoolYearOccurrences,
  isMusicStandMode,
  getOccRoomName,
  checkOccurrenceHasMessages,
  getOccurrenceUnreadCount,
  setAppointmentChatData,
  setShowAppointmentChat,
  handleTriggerConfirmReschedule,
  handleRejectReschedule,
  handleAcknowledgeCancellation,
  onOpenRescheduleBottomSheet,
  studentFeedTab,
  setStudentFeedTab,
  campusFeedAnnouncements,
  classFeedPosts,
  classFeedInteractions,
  unreadClassFeedCount,
  studentId,
  handleReactToPost,
  handleSubmitClassFeedInteraction,
  handleOpenContributions,
  isStudentRescheduleAllowed = true,
  classGoals = [],
  classWeeklyMins = 0,
  feedInteractions = []
}: StudentBriefingRightSidebarProps) {
  return (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px',
              width: isRightSidebarCollapsed ? '0px' : '340px',
              minWidth: isRightSidebarCollapsed ? '0px' : '340px',
              maxWidth: isRightSidebarCollapsed ? '0px' : '340px',
              opacity: isRightSidebarCollapsed ? 0 : 1,
              transform: isRightSidebarCollapsed ? 'translateX(20px)' : 'translateX(0)',
              pointerEvents: isRightSidebarCollapsed ? 'none' : 'auto',
              overflowY: isRightSidebarCollapsed ? 'hidden' : 'visible',
              overflowX: 'hidden',
              boxSizing: 'border-box',
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              {/* Sidebar Header with Collapse Button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 2px 4px 2px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: '#e6f4ea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Calendar size={15} color="#34a853" />
                  </div>
                  <span style={{ fontWeight: 950, fontSize: '0.88rem', color: '#1e293b', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                    Termine &amp; Mitteilungen
                  </span>
                  {sidebarTotalAlertsCount > 0 && (
                    <span style={{
                      background: hasSidebarAppointmentAlerts ? '#f59e0b' : '#34a853',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 900,
                      padding: '2px 7px',
                      borderRadius: '100px'
                    }}>
                      {sidebarTotalAlertsCount}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleToggleRightSidebar(true)}
                  style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    color: '#64748b',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                  title="Sidebar einklappen"
                >
                  <span>Einklappen</span>
                  <ChevronRight size={14} color="#64748b" />
                </button>
              </div>

              {/* Nächste Termine */}
              <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="#34a853" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Nächste Termine</h3>
                  </div>
                  <button onClick={() => handleTabChangeLocal('events')} style={{ background: 'transparent', border: 'none', color: '#34a853', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Alle anzeigen</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(() => {
                    const todayStr = new Date().toLocaleDateString('sv-SE');
                    const combinedList = [...(scheduleOccurrences || []), ...(schoolYearOccurrences || [])];
                    const seenKeys = new Set<string>();
                    const upcomingConfirmed = combinedList.filter(occ => {
                      if (!occ || !occ.date) return false;
                      if (occ.date < todayStr) return false;
                      if (occ.status === 'rescheduled_away' || occ.status === 'canceled_by_student') return false;
                      const key = `${occ.date}_${(occ.start_time || '').substring(0, 5)}`;
                      if (seenKeys.has(key)) return false;
                      seenKeys.add(key);
                      return true;
                    });
                    if (upcomingConfirmed.length > 0) {
                      return upcomingConfirmed.slice(0, 4).map(occ => {
                        const d = new Date(occ.date);
                        const isCancelled = occ.status === 'cancelled';
                        
                        if (isCancelled) {
                          return (
                            <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                              <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center', flexShrink: 0 }}>
                                 <div style={{ background: '#ef4444', color: 'white', fontSize: isMusicStandMode ? '0.80rem' : '0.72rem', fontWeight: 900, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                                 <div style={{ background: 'white', color: '#1e293b', fontSize: isMusicStandMode ? '1.35rem' : '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                              </div>
                              
                              <div style={{ 
                                flex: 1, 
                                background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                                boxShadow: '0 4px 10px rgba(239, 68, 68, 0.1)',
                                borderRadius: '14px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', fontWeight: 850, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                                    <span style={{ fontSize: isMusicStandMode ? '0.76rem' : '0.68rem', fontWeight: 950, background: '#000000', color: '#ffffff', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>Ausfall</span>
                                  </div>
                                  <div style={{ fontSize: isMusicStandMode ? '0.88rem' : '0.80rem', color: 'rgba(255, 255, 255, 0.95)', fontWeight: 650, marginTop: '3px' }}>
                                    {occ.start_time?.substring(0,5)} Uhr <span style={{ color: '#fee2e2' }}>{getOccRoomName(occ)}</span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                                    const dayLabel = DAYS_DE[new Date(occ.date).getDay()];
                                    const formattedDate = new Date(occ.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                                    const label = `${dayLabel} (${formattedDate}), ${occ.start_time?.substring(0, 5)} Uhr (Ausfall)`;
                                    setAppointmentChatData({
                                      teacherId: occ.teacher_id,
                                      date: occ.date,
                                      start_time: occ.start_time?.substring(0, 5),
                                      label,
                                      occurrenceId: occ.id,
                                      status: 'cancelled',
                                      isCancelled: true
                                    });
                                    setShowAppointmentChat(true);
                                  }}
                                  title="Shoutbox zum Ausfall-Termin öffnen"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: getOccurrenceUnreadCount(occ) > 0 ? '#fef3c7' : (checkOccurrenceHasMessages(occ) ? '#fef3c7' : 'rgba(255, 255, 255, 0.2)'),
                                    color: (getOccurrenceUnreadCount(occ) > 0 || checkOccurrenceHasMessages(occ)) ? '#d97706' : '#ffffff',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                  }}
                                  onMouseOver={e => { e.currentTarget.style.background = checkOccurrenceHasMessages(occ) ? '#fde68a' : 'rgba(255, 255, 255, 0.3)'; }}
                                  onMouseOut={e => { e.currentTarget.style.background = checkOccurrenceHasMessages(occ) ? '#fef3c7' : 'rgba(255, 255, 255, 0.2)'; }}
                                >
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MessageSquare size={14} fill={checkOccurrenceHasMessages(occ) ? 'currentColor' : 'none'} />
                                    {getOccurrenceUnreadCount(occ) > 0 && (
                                      <span style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        width: '7px',
                                        height: '7px',
                                        borderRadius: '50%',
                                        background: '#ea4335',
                                        border: '1.5px solid #ffffff',
                                        boxShadow: '0 0 4px rgba(234, 67, 53, 0.7)'
                                      }} />
                                    )}
                                  </div>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        const isRescheduled = occ.status === 'rescheduled_confirmed';
                        if (isRescheduled) {
                          return (
                            <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                              <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center', flexShrink: 0 }}>
                                 <div style={{ background: '#eab308', color: 'white', fontSize: isMusicStandMode ? '0.80rem' : '0.72rem', fontWeight: 900, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                                 <div style={{ background: 'white', color: '#1e293b', fontSize: isMusicStandMode ? '1.35rem' : '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                              </div>
                              
                              <div style={{ 
                                flex: 1, 
                                background: 'linear-gradient(135deg, #fef08a 0%, #eab308 100%)',
                                boxShadow: '0 4px 10px rgba(234, 179, 8, 0.1)',
                                borderRadius: '14px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', fontWeight: 850, color: '#78350f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                                    <span style={{ fontSize: isMusicStandMode ? '0.76rem' : '0.68rem', fontWeight: 950, background: '#000000', color: '#ffffff', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>Verschoben</span>
                                  </div>
                                  <div style={{ fontSize: isMusicStandMode ? '0.88rem' : '0.80rem', color: 'rgba(120, 53, 15, 0.95)', fontWeight: 650, marginTop: '3px' }}>
                                    {occ.start_time?.substring(0,5)} Uhr <span style={{ color: '#b45309' }}>{getOccRoomName(occ)}</span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                                    const dayLabel = DAYS_DE[new Date(occ.date).getDay()];
                                    const formattedDate = new Date(occ.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                                    const label = `${dayLabel} (${formattedDate}), ${occ.start_time?.substring(0, 5)} Uhr (Verschoben)`;
                                    setAppointmentChatData({
                                      teacherId: occ.teacher_id,
                                      date: occ.date,
                                      start_time: occ.start_time?.substring(0, 5),
                                      label,
                                      occurrenceId: occ.id,
                                      status: 'rescheduled_confirmed',
                                      isCancelled: false
                                    });
                                    setShowAppointmentChat(true);
                                  }}
                                  title="Shoutbox zum verschobenen Termin öffnen"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: getOccurrenceUnreadCount(occ) > 0 ? '#fef3c7' : (checkOccurrenceHasMessages(occ) ? '#f59e0b' : 'rgba(120, 53, 15, 0.12)'),
                                    color: checkOccurrenceHasMessages(occ) ? '#ffffff' : '#78350f',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                  }}
                                  onMouseOver={e => { e.currentTarget.style.background = checkOccurrenceHasMessages(occ) ? '#d97706' : 'rgba(120, 53, 15, 0.22)'; }}
                                  onMouseOut={e => { e.currentTarget.style.background = checkOccurrenceHasMessages(occ) ? '#f59e0b' : 'rgba(120, 53, 15, 0.12)'; }}
                                >
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MessageSquare size={14} fill={checkOccurrenceHasMessages(occ) ? 'currentColor' : 'none'} />
                                    {getOccurrenceUnreadCount(occ) > 0 && (
                                      <span style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        width: '7px',
                                        height: '7px',
                                        borderRadius: '50%',
                                        background: '#ea4335',
                                        border: '1.5px solid #ffffff',
                                        boxShadow: '0 0 4px rgba(234, 67, 53, 0.7)'
                                      }} />
                                    )}
                                  </div>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                            <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
                              <div style={{ background: '#34a853', color: 'white', fontSize: isMusicStandMode ? '0.80rem' : '0.72rem', fontWeight: 900, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                              <div style={{ background: 'white', color: '#1e293b', fontSize: isMusicStandMode ? '1.35rem' : '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', fontWeight: 850, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                              </div>
                              <div style={{ fontSize: isMusicStandMode ? '0.88rem' : '0.80rem', color: '#475569', fontWeight: 650 }}>{occ.start_time?.substring(0,5)} <span style={{ color: '#15803d', fontWeight: 800 }}>{getOccRoomName(occ)}</span></div>
                            </div>
                            <button
                              onClick={() => {
                                const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                                const dayLabel = DAYS_DE[new Date(occ.date).getDay()];
                                const formattedDate = new Date(occ.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                                const label = `${dayLabel} (${formattedDate}), ${occ.start_time?.substring(0, 5)} Uhr`;
                                setAppointmentChatData({
                                  teacherId: occ.teacher_id,
                                  date: occ.date,
                                  start_time: occ.start_time?.substring(0, 5),
                                  label,
                                  occurrenceId: occ.id,
                                  status: occ.status || 'scheduled',
                                  isCancelled: false
                                });
                                setShowAppointmentChat(true);
                              }}
                              title="Shoutbox öffnen"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: getOccurrenceUnreadCount(occ) > 0 ? '#fef3c7' : (checkOccurrenceHasMessages(occ) ? '#fef3c7' : '#f8fafc'),
                                color: (getOccurrenceUnreadCount(occ) > 0 || checkOccurrenceHasMessages(occ)) ? '#d97706' : '#475569',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginLeft: 'auto',
                                flexShrink: 0
                              }}
                              onMouseOver={e => {
                                e.currentTarget.style.background = checkOccurrenceHasMessages(occ) ? '#fde68a' : '#f1f5f9';
                                e.currentTarget.style.color = checkOccurrenceHasMessages(occ) ? '#d97706' : '#1e293b';
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.background = checkOccurrenceHasMessages(occ) ? '#fef3c7' : '#ffffff';
                                e.currentTarget.style.color = checkOccurrenceHasMessages(occ) ? '#d97706' : '#475569';
                              }}
                            >
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MessageSquare size={14} fill={checkOccurrenceHasMessages(occ) ? 'currentColor' : 'none'} />
                                {getOccurrenceUnreadCount(occ) > 0 && (
                                  <span style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    width: '7px',
                                    height: '7px',
                                    borderRadius: '50%',
                                    background: '#ea4335',
                                    border: '1.5px solid #ffffff',
                                    boxShadow: '0 0 4px rgba(234, 67, 53, 0.7)'
                                  }} />
                                )}
                              </div>
                            </button>
                          </div>
                        );
                      });
                    } else {
                      const simNow = typeof getSimulatedNow === 'function' ? getSimulatedNow() : new Date();
                      const dayOfWeek = simNow.getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                      if (isWeekend) {
                        if (effectiveLevel === 'junior') {
                          return (
                            <div style={{
                              background: 'linear-gradient(135deg, #fffbeb 0%, #f0fdf4 50%, #eff6ff 100%)',
                              border: '1.5px solid #bbf7d0',
                              borderRadius: '20px',
                              padding: '20px 16px',
                              textAlign: 'center',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '10px',
                              boxShadow: '0 4px 16px rgba(34, 197, 94, 0.06)',
                              margin: '6px 0'
                            }}>
                              <div style={{
                                width: '46px',
                                height: '46px',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, #facc15 0%, #eab308 50%, #ca8a04 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)',
                                fontSize: '1.3rem'
                              }}>
                                🎶
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  Wochenend-Pause!
                                </h4>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#475569', fontWeight: 600, lineHeight: 1.4 }}>
                                  Heute ist kein Unterricht. Zeit für deine Lieblings-Songs &amp; neue Grooves!
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleTabChangeLocal && handleTabChangeLocal('practice_board')}
                                  style={{
                                    background: '#16a34a',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '6px 14px',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                                  }}
                                >
                                  <span>🎧</span>
                                  <span>Übe-Studio</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTabChangeLocal && handleTabChangeLocal('homework_book')}
                                  style={{
                                    background: '#ffffff',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '10px',
                                    padding: '6px 12px',
                                    fontSize: '0.78rem',
                                    fontWeight: 750,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                  }}
                                >
                                  <span>📖</span>
                                  <span>Hausaufgaben</span>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // Teen & Pro Level: Clean, high-end, calm
                        return (
                          <div style={{
                            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '18px',
                            padding: '18px 16px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                            margin: '6px 0'
                          }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#ede9fe',
                              color: '#6d28d9',
                              padding: '3px 10px',
                              borderRadius: '100px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase'
                            }}>
                              <Sparkles size={11} color="#6d28d9" />
                              <span>Unterrichtsfreies Wochenende</span>
                            </div>
                            <div style={{ fontSize: '0.84rem', color: '#334155', fontWeight: 650, marginTop: '2px' }}>
                              Deine nächsten Stunden starten ab Montag.
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                              Nutze das freie Wochenende für deine Songs, Improvisation und Jam-Sessions.
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleTabChangeLocal && handleTabChangeLocal('practice_board')}
                                style={{
                                  background: '#ffffff',
                                  color: '#0f172a',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '10px',
                                  padding: '5px 12px',
                                  fontSize: '0.76rem',
                                  fontWeight: 750,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                }}
                              >
                                <Music size={13} color="#6d28d9" />
                                <span>Zum Übe-Studio</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
                          Heute keine Termine im Stundenplan.
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>

              {/* Terminänderungen */}
              {(() => {
                const appointmentChanges = (scheduleOccurrences || []).filter(occ => 
                  !occ.student_acknowledged && (
                    occ.status === 'pending_reschedule' || 
                    occ.status === 'cancelled' || 
                    (occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date)
                  )
                );
                if (appointmentChanges.length === 0) return null;
                return (
                  <div style={{ background: '#ffffff', borderRadius: '24px', padding: '16px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: appointmentChanges.length > 0 ? '1.5px dashed #f59e0b' : '1px solid #e2e8f0', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <Calendar size={16} color={appointmentChanges.length > 0 ? '#f59e0b' : '#475569'} />
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Terminänderungen</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {appointmentChanges.map(occ => {
                        const d = new Date(occ.date);
                        const isReschedule = occ.status === 'pending_reschedule';
                        const isCancelled = occ.status === 'cancelled';
                        const isRegularReset = occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date;
                        
                        let cardBg = '#fef2f2';
                        let cardBorder = '#fecaca';
                        let badgeNode: React.ReactNode = (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CalendarX size={12} color="#991b1b" /> Termin abgesagt
                          </span>
                        );
                        let badgeColor = '#991b1b';
                        
                        if (isReschedule) {
                          cardBg = '#fffbeb';
                          cardBorder = '#fef08a';
                          badgeNode = (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <RotateCcw size={12} color="#854d0e" /> Verschiebung vorgeschlagen
                            </span>
                          );
                          badgeColor = '#854d0e';
                        } else if (isRegularReset) {
                          cardBg = '#e6f4ea';
                          cardBorder = '#e6f4ea';
                          badgeNode = (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={12} color="#34a853" /> Findet wieder regulär statt
                            </span>
                          );
                          badgeColor = '#34a853';
                        }
                        
                        return (
                          <div key={occ.id} style={{ 
                            padding: '12px', 
                            borderRadius: '12px', 
                            background: cardBg, 
                            border: `1px solid ${cardBorder}`, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '8px',
                            position: 'relative',
                            zIndex: 5
                          }}>
                            <div>
                              <div style={{ fontSize: '9px', fontWeight: 800, color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                                {badgeNode}
                              </div>
                              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e293b' }}>
                                {d.toLocaleDateString('de-DE', {weekday: 'long', day: '2-digit', month: '2-digit'})}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', gap: '8px' }}>
                                <div style={{ fontSize: '0.80rem', color: '#475569', fontWeight: 700 }}>
                                  {occ.start_time?.substring(0,5)} Uhr
                                </div>
                                {!isReschedule && (
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleAcknowledgeCancellation(occ.id);
                                    }}
                                    style={{ 
                                      background: (occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date) ? '#34a853' : '#ef4444', 
                                      color: 'white', 
                                      border: 'none', 
                                      minHeight: '40px',
                                      padding: '8px 14px', 
                                      borderRadius: '12px', 
                                      fontSize: '0.82rem', 
                                      fontWeight: 800, 
                                      cursor: 'pointer',
                                      boxShadow: `0 2px 6px ${(occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date) ? 'rgba(52, 168, 83, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                      transition: 'all 0.2s',
                                      flexShrink: 0,
                                      position: 'relative',
                                      zIndex: 10,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <Check size={13} strokeWidth={2.5} />
                                    <span>Gelesen abhaken</span>
                                  </button>
                                )}
                              </div>
                              {(occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date) && (
                                <div style={{ fontSize: '0.74rem', color: '#34a853', fontWeight: 600, marginTop: '4px', lineHeight: '1.3' }}>
                                  Findet wieder regulär statt.
                                </div>
                              )}
                            </div>
                            
                            {isReschedule && (
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  {onOpenRescheduleBottomSheet && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onOpenRescheduleBottomSheet(occ);
                                      }}
                                      style={{
                                        background: '#fef3c7',
                                        color: '#b45309',
                                        border: '1px solid #fde68a',
                                        minHeight: '40px',
                                        padding: '8px 14px',
                                        borderRadius: '12px',
                                        fontSize: '0.82rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(217, 119, 6, 0.15)',
                                        transition: 'all 0.2s',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                      }}
                                    >
                                      <Calendar size={14} strokeWidth={2.4} />
                                      <span>Termin prüfen</span>
                                    </button>
                                  )}
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleRejectReschedule(occ);
                                    }}
                                    style={{ 
                                      background: '#ef4444', 
                                      color: 'white', 
                                      border: 'none', 
                                      minHeight: '40px',
                                      padding: '8px 14px', 
                                      borderRadius: '12px', 
                                      fontSize: '0.82rem', 
                                      fontWeight: 800, 
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)',
                                      transition: 'all 0.2s',
                                      position: 'relative',
                                      zIndex: 10,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <X size={14} strokeWidth={2.5} />
                                    <span>Ablehnen</span>
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleTriggerConfirmReschedule(occ.id);
                                    }}
                                    style={{ 
                                      background: '#34a853', 
                                      color: 'white', 
                                      border: 'none', 
                                      minHeight: '40px',
                                      padding: '8px 14px', 
                                      borderRadius: '12px', 
                                      fontSize: '0.82rem', 
                                      fontWeight: 800, 
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(52, 168, 83, 0.2)',
                                      transition: 'all 0.2s',
                                      position: 'relative',
                                      zIndex: 10,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    {!isStudentRescheduleAllowed ? <Lock size={14} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
                                    <span>{!isStudentRescheduleAllowed ? 'Bestätigen (Eltern-PIN)' : 'Bestätigen'}</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ÜBE-ZIEL WIDGET (Crowdfunding-Stil) */}
              {classGoals.length > 0 && (
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '18px 20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, sans-serif"
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '10px',
                      background: '#e6f4ea',
                      border: '1px solid #e6f4ea',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Target size={18} color="#34a853" />
                    </div>
                    <h3 style={{
                      fontSize: '0.92rem',
                      fontWeight: 750,
                      color: '#1c1c1e',
                      margin: 0,
                      letterSpacing: '-0.02em',
                      lineHeight: '1.2'
                    }}>
                      Klassen-Übe-Ziel
                    </h3>
                  </div>

                  {/* Goals */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {classGoals.map((goal: any) => {
                      const pct = goal.minutes > 0 ? Math.round((classWeeklyMins / goal.minutes) * 100) : 0;
                      const isDeadlinePassed = goal.deadline ? new Date(goal.deadline) < new Date() : false;
                      const maxPercentOnBar = 133;
                      const visualWidth = Math.min(100, (pct / maxPercentOnBar) * 100);
                      const isAchieved = pct >= 100;

                      return (
                        <div 
                          key={goal.id} 
                          onClick={() => handleOpenContributions && handleOpenContributions(goal.title || 'Klassen-Übe-Ziel', goal.minutes)}
                          onMouseOver={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(52, 168, 83, 0.22)';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(52, 168, 83, 0.12)';
                          }}
                          style={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            background: '#34a853',
                            boxShadow: '0 6px 20px rgba(52, 168, 83, 0.12)',
                            borderRadius: '16px',
                            padding: '12px 14px',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        >
                          {/* Row 1: Title, Deadline on left & Percentage on right */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                              <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: '#ffffff',
                                letterSpacing: '-0.01em',
                                lineHeight: '1.25',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word'
                              }}>
                                {goal.title || 'Challenge'}
                              </span>
                              {goal.deadline && (
                                <span style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 500,
                                  color: isDeadlinePassed ? '#ff8780' : 'rgba(255, 255, 255, 0.75)',
                                  lineHeight: '1.2',
                                  whiteSpace: 'normal'
                                }}>
                                  bis {new Date(goal.deadline).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                  {isDeadlinePassed && ' (abgelaufen)'}
                                </span>
                              )}
                            </div>
                            <span style={{
                              fontSize: '1.1rem',
                              fontWeight: 800,
                              color: '#ffffff',
                              letterSpacing: '-0.02em',
                              fontFeatureSettings: '"tnum"',
                              flexShrink: 0,
                              alignSelf: 'flex-start'
                            }}>
                              {pct}%
                            </span>
                          </div>

                          {/* Progress bar container */}
                          <div style={{ position: 'relative', height: '6px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '99px' }}>
                            {/* Target marker (100% line) at 75% width */}
                            <div style={{
                              position: 'absolute',
                              left: '75%',
                              top: '-2px',
                              height: '10px',
                              width: '2px',
                              background: '#ffffff',
                              zIndex: 3,
                              borderRadius: '99px'
                            }} />

                            {/* Bar fill */}
                            <div style={{
                              width: `${visualWidth}%`,
                              height: '100%',
                              background: '#ffffff',
                              borderRadius: '99px',
                              transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: '0 0 6px rgba(255, 255, 255, 0.25)'
                            }} />
                          </div>

                          {/* Row 3: Current / Target & Status label */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', gap: '10px' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontFeatureSettings: '"tnum"', fontWeight: 500, whiteSpace: 'normal' }}>
                              <span style={{ fontWeight: 700, color: '#ffffff' }}>{classWeeklyMins}</span> / {goal.minutes} Min.
                            </span>
                            <span style={{
                              fontWeight: 700,
                              color: isAchieved ? '#e6f4ea' : 'rgba(255, 255, 255, 0.8)',
                              whiteSpace: 'normal',
                              textAlign: 'right'
                            }}>
                              {isAchieved ? 'Erreicht 🎉' : `Noch ${Math.max(0, goal.minutes - classWeeklyMins)} Min.`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LIVE CAMPUS FEED (DESKTOP) */}
              <div style={{ 
                background: '#ffffff', 
                borderRadius: '24px', 
                padding: '24px', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Sparkles size={18} color="#34a853" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mitteilungen</h3>
                </div>

                {/* Tab switcher */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                  <button
                    onClick={() => setStudentFeedTab('campus')}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: studentFeedTab === 'campus' ? '#ffffff' : 'transparent',
                      color: studentFeedTab === 'campus' ? '#34a853' : '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: studentFeedTab === 'campus' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <School size={16} />
                      <span>Campus</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setStudentFeedTab('class')}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: studentFeedTab === 'class' ? '#ffffff' : 'transparent',
                      color: studentFeedTab === 'class' ? '#34a853' : '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: studentFeedTab === 'class' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', position: 'relative' }}>
                      <Users size={16} />
                      <span>Klassen-Feed</span>
                      {unreadClassFeedCount > 0 && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#ea4335',
                          color: '#ffffff',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          borderRadius: '10px',
                          minWidth: '15px',
                          height: '15px',
                          padding: '0 3px',
                          marginLeft: '4px'
                        }}>
                          {unreadClassFeedCount}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {studentFeedTab === 'class' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {classFeedPosts.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0', textAlign: 'center', opacity: 0.6 }}>
                          <Sparkles size={24} color="#94a3b8" style={{ strokeWidth: 1.5 }} />
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                            Keine Beiträge in deinem Klassen-Feed.
                          </span>
                        </div>
                      ) : (
                        classFeedPosts.map((post) => {
                          const myInteraction = classFeedInteractions.find(i => i.post_id === post.id && i.user_id === studentId);
                          const isAnswered = !!myInteraction;

                          let typeLabel = 'Mitteilung';
                          let typeBg = '#e6f4ea';
                          let typeColor = '#34a853';
                          if (post.post_type === 'homework') {
                            typeLabel = 'Hausaufgabe';
                            typeBg = '#fef3c7';
                            typeColor = '#b45309';
                          } else if (post.post_type === 'poll') {
                            typeLabel = 'Umfrage';
                            typeBg = '#e0f2fe';
                            typeColor = '#0369a1';
                          } else if (post.post_type === 'quiz') {
                            typeLabel = 'Quiz';
                            typeBg = '#f3e8ff';
                            typeColor = '#6b21a8';
                          }

                          return (
                            <div key={post.id} style={{
                              paddingBottom: '16px',
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '9px', fontWeight: 800, color: typeColor, background: typeBg, padding: '2px 8px', borderRadius: '100px', textTransform: 'uppercase' }}>
                                  {typeLabel}
                                </span>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 650 }}>
                                  {new Date(post.created_at).toLocaleDateString('de-DE')}
                                </span>
                              </div>

                              <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                                {post.title}
                              </h5>
                              <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                                {post.content}
                              </p>

                              {post.attachment_url && (
                                <div style={{ marginTop: '4px' }}>
                                  {post.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                    <a href={post.attachment_url} target="_blank" rel="noopener noreferrer">
                                      <img src={post.attachment_url} alt="Anhang" style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                    </a>
                                  ) : (
                                    <a href={post.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#34a853', textDecoration: 'none', fontWeight: 650 }}>
                                      📄 Dokument öffnen
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Interactive Poll / Quiz options */}
                              {(post.post_type === 'quiz' || post.post_type === 'poll') && post.quiz_data && (
                                <div style={{ marginTop: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                                    {post.quiz_data.question}
                                  </span>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {Array.isArray(post.quiz_data.options) && post.quiz_data.options.map((opt: string, oIdx: number) => {
                                      const isSelectedByMe = myInteraction?.selected_option === oIdx;
                                      const isCorrectOption = post.post_type === 'quiz' && post.quiz_data.correctAnswer === oIdx;

                                      let btnBg = 'white';
                                      let btnBorder = '#cbd5e1';
                                      let btnColor = '#1e293b';

                                      if (isAnswered) {
                                        if (post.post_type === 'quiz') {
                                          if (isCorrectOption) {
                                            btnBg = '#e6f4ea';
                                            btnBorder = '#34a853';
                                            btnColor = '#34a853';
                                          } else if (isSelectedByMe) {
                                            btnBg = '#fce8e6';
                                            btnBorder = '#ea4335';
                                            btnColor = '#ea4335';
                                          }
                                        } else {
                                          if (isSelectedByMe) {
                                            btnBg = '#e0f2fe';
                                            btnBorder = '#0369a1';
                                            btnColor = '#0369a1';
                                          }
                                        }
                                      }

                                      return (
                                        <button
                                          key={oIdx}
                                          disabled={isAnswered}
                                          onClick={() => {
                                            if (post.post_type === 'quiz') {
                                              handleSubmitClassFeedInteraction(post.id, 'quiz_answer', oIdx, oIdx === post.quiz_data.correctAnswer);
                                            } else {
                                              handleSubmitClassFeedInteraction(post.id, 'poll_vote', oIdx);
                                            }
                                          }}
                                          style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            background: btnBg,
                                            border: `1.5px solid ${btnBorder}`,
                                            color: btnColor,
                                            fontSize: '0.78rem',
                                            fontWeight: isSelectedByMe || isCorrectOption ? 700 : 500,
                                            textAlign: 'left',
                                            cursor: isAnswered ? 'default' : 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                          }}
                                        >
                                          <span>{opt}</span>
                                          {isAnswered && (
                                            <span>
                                              {post.post_type === 'quiz' ? (
                                                isCorrectOption ? '✓ Richtig' : (isSelectedByMe ? '✗ Falsch' : '')
                                              ) : (
                                                isSelectedByMe ? '✓ Gewählt' : ''
                                              )}
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
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
                        const userHasThumbsUp = postReactions.some(i => i.emoji_unicode === '👍' && i.user_id === studentId);
                        const userHasHeart = postReactions.some(i => i.emoji_unicode === '❤️' && i.user_id === studentId);

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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  color: '#475569',
                                  background: '#f1f5f9',
                                  padding: '2px 8px',
                                  borderRadius: '100px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em'
                                }}>
                                  {item.target_type === 'all' ? 'Alle' : item.target_type === 'teachers' ? 'Lehrer' : item.target_type === 'students' ? 'Schüler' : 'Mitteilung'}
                                </span>
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  color: categoryColor,
                                  background: categoryBg,
                                  padding: '2px 8px',
                                  borderRadius: '100px',
                                  textTransform: 'uppercase',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}>
                                  {item.is_emergency && <AlertTriangle size={9} color="#b91c1c" />}
                                  {categoryLabel}
                                </span>
                              </div>
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

                            {item.attachment_url && (
                              <div style={{ marginTop: '4px' }}>
                                {item.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                  <a href={item.attachment_url} target="_blank" rel="noopener noreferrer">
                                    <img 
                                      src={item.attachment_url} 
                                      alt="Anhang" 
                                      style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                  </a>
                                ) : (
                                  <a 
                                    href={item.attachment_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#34a853', textDecoration: 'none', fontWeight: 650 }}
                                  >
                                    📄 Dokument öffnen
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Monochrome Emoji Reactions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                              <button 
                                onClick={() => handleReactToPost(item.id, '👍')}
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
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <ThumbsUp size={11} color={userHasThumbsUp ? '#34a853' : '#64748b'} />
                                <span>{thumbsUpCount}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              </div>
            </div>

  );
}
