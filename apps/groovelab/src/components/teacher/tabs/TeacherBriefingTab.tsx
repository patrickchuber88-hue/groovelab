import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Palmtree, CalendarX, Users, Check, Sparkles, Activity, AlertTriangle, Zap, Clock, ShieldCheck, HelpCircle, Timer, AlertCircle, Edit3, Sliders, Wrench, Compass } from 'lucide-react';
import { UpdateAnnouncementHero } from '../../common/UpdateAnnouncementHero';
import { TeacherPasskeyNudgeBanner } from '../../auth/TeacherPasskeyNudgeBanner';
import { CampusSponsorIngressBanner } from '../../ui/CampusSponsorIngressBanner';
import { MobileBriefingCarousel } from '../../ui/MobileBriefingCarousel';
import { TourStartButton } from '../../PremiumOnboardingTour';
import { BriefingNotesCard } from '../../notes/BriefingNotesCard';
import { BriefingToolboxCard } from '../../campus/BriefingToolboxCard';
import { TeacherQuickToolboxDrawer } from '../TeacherQuickToolboxDrawer';
import { TeacherMakeupRadarWidget } from '../TeacherMakeupRadarWidget';
import { formatAbsenceEndDate } from '../../../utils/teacherAbsenceHelper';
import { cleanRoomName, getSimulatedNow, resolveStudentInstrument, splitAndNormalizeStudents } from '../utils/teacherDashboardUtils';
import { isInstrumentAvatar, resolveCampusStudentAvatar } from '../../../utils/avatarResolutionEngine';
import { resolveTeacherCurrentRoom } from '../../../utils/teacherRoomResolver';

const TeacherFeedWidget = lazy(() => import('../TeacherFeedWidget').then(m => ({ default: m.TeacherFeedWidget })));
import { TeacherHausaufgabenWidget } from '../TeacherHausaufgabenWidget';
const TeacherTagesplanWidget = lazy(() => import('../TeacherTagesplanWidget').then(m => ({ default: m.TeacherTagesplanWidget })));
const TeacherTourDemoSchedule = lazy(() => import('../TeacherTagesplanWidget').then(m => ({ default: m.TeacherTourDemoSchedule })));
import { getTeacherActiveBoards } from '../hooks/useTeacherTagesplan';

export interface TeacherBriefingTabProps {
  userId: string; teacher: any; schoolData: any; activePlatform: 'campus' | 'groovelab'; isMobileDevice: boolean; windowWidth: number;
  isTeacherBriefingSidebarCollapsed: boolean; handleToggleTeacherBriefingSidebar: (collapsed: boolean) => void;
  hasTeacherAppointmentAlerts: boolean; hasTeacherFeedAlerts: boolean; teacherSidebarTotalAlertsCount: number;
  briefingLoading: boolean; briefingData: any; activePlanningEvents: any[];
  dismissedBanners: Record<string, boolean>; setDismissedBanners: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isTodayHoliday: any; isTeacherCurrentlyAbsent: boolean; bypassAbsenceView: boolean; setBypassAbsenceView: (val: boolean) => void;
  handleEndAbsence: () => Promise<void>; submittingAbsence: boolean; totalAbsenceCancellationsCount: number; unreadCancellationsCount: number;
  setShowAbsenceOverviewModal: (show: boolean) => void; setShowAbsenceModal: (show: boolean) => void;
  resolvedTeacherFullName: string; teacherBriefingAvatarSrc: string; activeMakeupTokens: any[];
  showRealNames: boolean; toggleRealNames: (val?: boolean) => void;
  setSelectedMakeupToken: (token: any) => void; setSelectedMakeupSlot: (slot: any) => void; setMakeupModalMode: (mode: any) => void; setIsMakeupModalOpen: (open: boolean) => void;
  activeChatOcc: any; setActiveChatOcc: (occ: any) => void; activeChatOccIds?: Set<string>; unreadChatOccIds?: Set<string>;
  docStudent: any; setDocStudent: (student: any) => void; allStudents: any[];
  isAbsenceWidgetExpanded: boolean; setIsAbsenceWidgetExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  absenceStartDate: string; setAbsenceStartDate: (date: string) => void; absenceUntilDate: string; setAbsenceUntilDate: React.Dispatch<React.SetStateAction<string>>;
  setQuickAbsencePreset: (preset: any) => void; currentTimeStr: string; quickAudioStudent: any; setQuickAudioStudent: (student: any) => void;
  loadingPrepMirror: boolean; activeTimelineSlotRef: any; relevantRoomIssuesToday: any[]; teacherTodayRooms: string[];
  isFreeDay: boolean; isWeekend: boolean; isTourDemoScheduleActive: boolean; urgentCancellations: any[]; setIsUrgentModalOpen: (open: boolean) => void;
  handleResolveRoomIssueInTagesplan: (issueId: string) => Promise<void>; handleUpdateIssueRoomInTagesplan: (issueId: string, newRoom: string) => Promise<void>;
  leftColumnTab: 'briefing' | 'notes' | 'toolbox'; setLeftColumnTab: (tab: 'briefing' | 'notes' | 'toolbox') => void; onTabChange?: (tab: string) => void;
  activeStudent: any; activeGroupStudents: any[]; selectedGroupStudentId: string | null; setSelectedGroupStudentId: (id: string | null) => void;
  selectedStudentProfile: any; setSelectedStudentProfile: (prof: any) => void; dynamicPrepMirror: any; setDynamicPrepMirror: (val: any) => void;
  setLoadingPrepMirror: React.Dispatch<React.SetStateAction<boolean>>; firstSlotStartStr: string; widgetState: any; startTour: () => void;
  emergencyUnconfirmedAppointments?: any[]; handleSendEmergencyCalloutPush?: (apt: any) => Promise<void>; handleEmergencyShoutbox?: (occ: any) => void;
  rooms: any[]; holidays: any[]; myBookings: any[]; myChangedAppointments: any[];
  showAllChangedAppointments: boolean; setShowAllChangedAppointments: React.Dispatch<React.SetStateAction<boolean>>;
  showAllBookings: boolean; setShowAllBookings: React.Dispatch<React.SetStateAction<boolean>>;
  adminFeedbackRequests: any[]; adminFeedbackResponses: any[]; campusFeedAnnouncements: any[]; feedInteractions: any[];
  teacherFeedTab: 'campus' | 'class'; setTeacherFeedTab: (tab: 'campus' | 'class') => void; classFeedPosts: any[]; classFeedInteractions: any[];
  respondingToRequestId: string | null; setRespondingToRequestId: React.Dispatch<React.SetStateAction<string | null>>;
  questionnaireAnswers: Record<string, string>; setQuestionnaireAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  submittingFeedback: boolean; adminFeedbackTab: 'open' | 'done'; setAdminFeedbackTab: (tab: 'open' | 'done') => void;
  planningEvents: any[]; mySubmittedProgramPoints: any[]; visibleChangedAppointments: any[];
  handleBookingClick: (booking: any) => void; handleDeleteMyBooking: (id: string) => Promise<void>;
  handleMarkRequestAsDone: (id: string) => Promise<void>; handleReactToPost: (id: string, emoji: string, type?: 'campus' | 'class') => Promise<void>;
  handleSubmitFeedbackResponse: (id: string) => Promise<void>; getCountdownString: (date: any) => string; setMyChangedAppointments: (val: any) => void;
  todayTagesplanStudents: any[]; activeTimelineSlot: any; setShowNotesDrawer: (val: boolean) => void;
  checkHasStudentQuestion?: (sId: string) => boolean; checkHasTodayAudio?: (sId: string) => boolean;
  getIssueRoomLabel?: (issue: any) => string; isStudentBirthdayToday?: (student: any) => boolean;
}

export const TeacherBriefingTab: React.FC<TeacherBriefingTabProps> = (props) => {
  const {
    userId, teacher, schoolData, activePlatform, isMobileDevice: rawIsMobileDevice, windowWidth: rawWindowWidth,
    isTeacherBriefingSidebarCollapsed, handleToggleTeacherBriefingSidebar, hasTeacherAppointmentAlerts, hasTeacherFeedAlerts,
    teacherSidebarTotalAlertsCount, briefingLoading, briefingData, activePlanningEvents, dismissedBanners, setDismissedBanners,
    isTodayHoliday, isTeacherCurrentlyAbsent, bypassAbsenceView, setBypassAbsenceView, handleEndAbsence, submittingAbsence,
    totalAbsenceCancellationsCount, unreadCancellationsCount, setShowAbsenceOverviewModal, setShowAbsenceModal,
    resolvedTeacherFullName, teacherBriefingAvatarSrc, activeMakeupTokens, showRealNames, toggleRealNames,
    setSelectedMakeupToken, setSelectedMakeupSlot, setMakeupModalMode, setIsMakeupModalOpen, activeChatOcc, setActiveChatOcc,
    activeChatOccIds, unreadChatOccIds, docStudent, setDocStudent, allStudents, isAbsenceWidgetExpanded, setIsAbsenceWidgetExpanded,
    absenceStartDate, setAbsenceStartDate, absenceUntilDate, setAbsenceUntilDate, setQuickAbsencePreset, currentTimeStr,
    quickAudioStudent, setQuickAudioStudent, loadingPrepMirror, activeTimelineSlotRef, relevantRoomIssuesToday, teacherTodayRooms,
    isFreeDay, isWeekend, isTourDemoScheduleActive, urgentCancellations, setIsUrgentModalOpen,
    handleResolveRoomIssueInTagesplan, handleUpdateIssueRoomInTagesplan, leftColumnTab, setLeftColumnTab, onTabChange,
    activeStudent, activeGroupStudents, selectedGroupStudentId, setSelectedGroupStudentId, selectedStudentProfile,
    setSelectedStudentProfile, dynamicPrepMirror, setDynamicPrepMirror, setLoadingPrepMirror, firstSlotStartStr, widgetState,
    startTour, emergencyUnconfirmedAppointments = [], rooms, holidays, myBookings, myChangedAppointments,
    showAllChangedAppointments, setShowAllChangedAppointments, showAllBookings, setShowAllBookings,
    adminFeedbackRequests, adminFeedbackResponses, campusFeedAnnouncements, feedInteractions, teacherFeedTab, setTeacherFeedTab,
    classFeedPosts, classFeedInteractions, respondingToRequestId, setRespondingToRequestId, questionnaireAnswers,
    setQuestionnaireAnswers, submittingFeedback, adminFeedbackTab, setAdminFeedbackTab, planningEvents, mySubmittedProgramPoints,
    visibleChangedAppointments, handleBookingClick, handleDeleteMyBooking, handleMarkRequestAsDone, handleReactToPost,
    handleSubmitFeedbackResponse, getCountdownString, setMyChangedAppointments, todayTagesplanStudents, activeTimelineSlot,
    setShowNotesDrawer, checkHasStudentQuestion = () => false, checkHasTodayAudio = () => false,
    getIssueRoomLabel = () => 'Raum', isStudentBirthdayToday = () => false
  } = props;

  const simWidth = typeof document !== 'undefined' ? Number(document.documentElement.getAttribute('data-sim-width')) : 0;
  const windowWidth = simWidth > 0 ? simWidth : rawWindowWidth;
  const isMobileDevice = rawIsMobileDevice || windowWidth <= 768 || (typeof document !== 'undefined' && Boolean(document.querySelector('.sim-viewport-mobile')));
  const [isQuickToolboxOpen, setIsQuickToolboxOpen] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const isRestDay = isWeekend || isFreeDay;
  const effectiveLeftColumnTab = leftColumnTab;

  const resolvedAvatarSrc = useMemo(() => {
    if (avatarLoadError || !teacherBriefingAvatarSrc || !isInstrumentAvatar(teacherBriefingAvatarSrc)) {
      return resolveCampusStudentAvatar({
        ...(teacher || {}),
        role: 'teacher',
        isTeacherContext: true,
        instrument: teacher?.instrument || 'Gitarre'
      });
    }
    return teacherBriefingAvatarSrc;
  }, [avatarLoadError, teacherBriefingAvatarSrc, teacher]);

  const effectiveTeacherRoom = useMemo(() => {
    return resolveTeacherCurrentRoom({
      activeTimelineSlot,
      teacherTodayRooms,
      teacher,
      rooms
    });
  }, [activeTimelineSlot, teacherTodayRooms, teacher, rooms]);

  const { activeLessonsCount, totalActiveStudentsToday } = useMemo(() => {
    if (!briefingData?.timeline) return { activeLessonsCount: 0, totalActiveStudentsToday: 0 };
    const uniqueSlotsMap = new Map<string, any[]>();
    briefingData.timeline.forEach((s: any) => {
      if ((s.student || (s.students && s.students.length > 0) || s.isGroup) && !s.isBreak && !s.is_room_booking && !s.isRoomBooking && !['canceled_by_student', 'teacher_ausfall', 'cancelled', 'canceled_by_teacher_ausfall', 'rescheduled_away'].includes(s.status)) {
        const timeKey = s.timeSlot || s.id;
        if (!uniqueSlotsMap.has(timeKey)) uniqueSlotsMap.set(timeKey, []);
        uniqueSlotsMap.get(timeKey)!.push(s);
      }
    });
    const ueCount = uniqueSlotsMap.size;
    let studentsCount = 0;
    uniqueSlotsMap.forEach((slots) => {
      const studentIds = new Set<string>();
      slots.forEach((slot: any) => {
        if (slot.students && Array.isArray(slot.students)) {
          slot.students.forEach((st: any) => { if (st.id) studentIds.add(st.id); else if (st.name) studentIds.add(st.name); });
        } else if (slot.student?.id) studentIds.add(slot.student.id);
        else if (slot.student?.name) studentIds.add(slot.student.name);
      });
      studentsCount += Math.max(1, studentIds.size);
    });
    return { activeLessonsCount: ueCount, totalActiveStudentsToday: studentsCount };
  }, [briefingData?.timeline]);

  const teacherStudents = useMemo(() => {
    const tid = teacher?.id;
    if (!tid) return [];
    const directMatches = (allStudents || []).filter((s: any) => s.teacher_id === tid || (Array.isArray(s.teacher_ids) && s.teacher_ids.includes(tid)) || s.primary_teacher_id === tid);
    if (directMatches.length > 0) return directMatches;
    const boards = getTeacherActiveBoards(tid, teacher);
    const boardStudentNames = new Set<string>();
    const boardStudentIds = new Set<string>();
    boards.forEach((b: any) => {
      (b.students || []).forEach((slot: any) => {
        if (slot.isBreak) return;
        if (slot.student?.id) boardStudentIds.add(slot.student.id);
        else if (slot.student_id) boardStudentIds.add(slot.student_id);
        else if (slot.id && !slot.id.startsWith('slot_')) boardStudentIds.add(slot.id);
        if (slot.student?.name) boardStudentNames.add(slot.student.name);
        else if (slot.name) boardStudentNames.add(slot.name);
        else if (slot.first_name) {
          const fullName = `${slot.first_name || ''} ${slot.last_name || ''}`.trim();
          if (fullName) boardStudentNames.add(fullName);
        }
      });
    });
    const matchedFromAll = (allStudents || []).filter((s: any) => {
      const sFullName = `${s.first_name || ''} ${s.last_name || ''}`.trim();
      return (s.id && boardStudentIds.has(s.id)) || (s.name && boardStudentNames.has(s.name)) || (sFullName && boardStudentNames.has(sFullName));
    });
    return matchedFromAll.length > 0 ? matchedFromAll : (allStudents || []);
  }, [allStudents, teacher]);

  const totalTeacherStudentsCount = useMemo(() => {
    if (teacherStudents.length > 0) return teacherStudents.length;
    const boards = getTeacherActiveBoards(teacher?.id, teacher);
    const uniqueNames = new Set<string>();
    boards.forEach((b: any) => {
      (b.students || []).forEach((slot: any) => {
        if (slot.isBreak) return;
        const name = slot.name || slot.student?.name || slot.student_name || `${slot.first_name || ''} ${slot.last_name || ''}`.trim() || (slot.id && !slot.id.startsWith('slot_') ? slot.id : '');
        if (name) uniqueNames.add(name);
      });
    });
    return uniqueNames.size > 0 ? uniqueNames.size : (allStudents?.length || 0);
  }, [teacherStudents, teacher, allStudents]);

  const avgPracticeTime = useMemo(() => {
    const weeklyFocusMap: Record<string, number> = briefingData?.weeklyFocusMap || {};
    const focusMinutesList: number[] = [];
    const countedStudentIds = new Set<string>();
    if (!isRestDay && briefingData?.timeline) {
      const activeTimelineStudents = briefingData.timeline.filter((s: any) => (s.student || (s.students && s.students.length > 0) || s.isGroup) && !s.isBreak && !s.is_room_booking && !s.isRoomBooking && !['canceled_by_student', 'teacher_ausfall', 'cancelled', 'canceled_by_teacher_ausfall', 'rescheduled_away'].includes(s.status));
      activeTimelineStudents.forEach((slot: any) => {
        const studentList = slot.students && slot.students.length > 0 ? slot.students : (slot.student ? [slot.student] : []);
        studentList.forEach((st: any) => {
          const sId = st?.id || st?.student_id;
          if (sId && !countedStudentIds.has(String(sId))) { countedStudentIds.add(String(sId)); focusMinutesList.push(weeklyFocusMap[String(sId)] || 0); }
        });
      });
    }
    if (focusMinutesList.length === 0 && teacherStudents.length > 0) {
      teacherStudents.forEach((st: any) => {
        const sId = st?.id || st?.student_id;
        if (sId && !countedStudentIds.has(String(sId))) { countedStudentIds.add(String(sId)); focusMinutesList.push(weeklyFocusMap[String(sId)] || 0); }
      });
    }
    const avgMins = focusMinutesList.length > 0 ? Math.round(focusMinutesList.reduce((a, b) => a + b, 0) / focusMinutesList.length) : 0;
    return avgMins >= 60 ? { value: (avgMins / 60).toFixed(1), unit: 'Std', rawMins: avgMins } : { value: String(avgMins), unit: 'Min', rawMins: avgMins };
  }, [isRestDay, briefingData?.timeline, briefingData?.weeklyFocusMap, teacherStudents]);

  const workloadMinutes = useMemo(() => {
    if (!briefingData?.timeline) return 0;
    const countedTimeSlots = new Set<string>();
    let totalMins = 0;
    briefingData.timeline.forEach((s: any) => {
      if ((s.student || (s.students && s.students.length > 0) || s.isGroup) && !s.isBreak && !s.is_room_booking && !s.isRoomBooking && !['canceled_by_student', 'teacher_ausfall', 'cancelled', 'canceled_by_teacher_ausfall', 'rescheduled_away'].includes(s.status)) {
        const timeKey = s.timeSlot || s.id;
        if (!countedTimeSlots.has(timeKey)) { countedTimeSlots.add(timeKey); totalMins += (s.duration || 30); }
      }
    });
    return totalMins;
  }, [briefingData?.timeline]);

  const workloadHours = Math.floor(workloadMinutes / 60);
  const workloadRemainingMinutes = workloadMinutes % 60;
  const workloadHoursStr = workloadRemainingMinutes > 0 ? `${workloadHours}h ${workloadRemainingMinutes}m` : `${workloadHours}h`;

  const regularWeeklyPensum = useMemo(() => {
    const boards = getTeacherActiveBoards(teacher?.id, teacher);
    let totalMinutes = 0;
    if (boards && boards.length > 0) {
      boards.forEach((b: any) => {
        (b.students || []).forEach((slot: any) => {
          if (!slot.isBreak && (slot.id || slot.name || slot.studentId || slot.first_name || slot.student_id)) totalMinutes += (slot.duration || 30);
        });
      });
    }
    if (totalMinutes === 0) {
      totalMinutes = workloadMinutes > 0 ? workloadMinutes * 5 : (totalTeacherStudentsCount > 0 ? totalTeacherStudentsCount * 30 : 0);
    }
    const hours = Math.floor(totalMinutes / 60);
    const remMins = totalMinutes % 60;
    return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  }, [teacher, workloadMinutes, totalTeacherStudentsCount]);

  const cancellationsCount = useMemo(() => {
    if (!briefingData?.timeline) return 0;
    return briefingData.timeline.filter((s: any) => !s.isBreak && !s.is_room_booking && !s.isRoomBooking && (s.student || (s.students && s.students.length > 0) || s.isGroup) && (s.isRescheduledPending || ['canceled_by_student', 'teacher_ausfall', 'cancelled', 'canceled_by_teacher_ausfall', 'rescheduled_away'].includes(s.status))).length;
  }, [briefingData?.timeline]);

  const dynamicGreeting = useMemo(() => {
    const hours = parseInt((currentTimeStr || '13:00').split(':')[0], 10);
    const greeting = hours >= 5 && hours < 11.5 ? 'Guten Morgen' : hours >= 17.5 && hours < 23 ? 'Guten Abend' : 'Guten Tag';
    return { greeting, subtitle: 'Hier ist deine Übersicht für einen produktiven Tag.' };
  }, [currentTimeStr]);

  const renderMobileKpis = () => {
    if (isTeacherCurrentlyAbsent && !bypassAbsenceView) return null;

    return (
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', 
          gap: '10px', 
          width: '100%', 
          minWidth: 0,
          boxSizing: 'border-box' 
        }}
      >
        {/* KPI 1: Schüler Heute / Gesamtschüler */}
        <div style={{
          flex: '1 1 0px',
          minWidth: 0,
          position: 'relative', overflow: 'hidden',
          background: '#6366f1',
          color: 'white',
          borderRadius: '20px',
          boxShadow: 'none',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          minHeight: '72px',
          padding: '14px 16px',
          boxSizing: 'border-box',
          border: 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 900, opacity: 0.95, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'white' }}>
              {isRestDay ? 'Schüler' : 'Schüler Heute'}
            </span>
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '6px', borderRadius: '10px', flexShrink: 0 }}>
              <Users size={17} color="white" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', color: 'white' }}>
              {isRestDay ? totalTeacherStudentsCount : activeLessonsCount}
            </span>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, opacity: 0.9, color: 'white' }}>
              {isRestDay ? 'aktiv' : 'UE'}
            </span>
            {!isRestDay && totalActiveStudentsToday > 0 && (
              <span style={{ fontSize: '0.76rem', fontWeight: 750, opacity: 0.85, color: 'white' }}>
                ({totalActiveStudentsToday} Sch.)
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Ø Übe-Zeit / Ø Klassen-Fokus */}
        <div style={{
          flex: '1 1 0px',
          minWidth: 0,
          position: 'relative', overflow: 'hidden',
          background: '#34a853',
          color: 'white',
          borderRadius: '20px',
          boxShadow: 'none',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          minHeight: '72px',
          padding: '14px 16px',
          boxSizing: 'border-box',
          border: 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 900, opacity: 0.95, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'white' }}>
              {isRestDay ? 'Ø Fokus' : 'Ø Übe-Zeit'}
            </span>
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '6px', borderRadius: '10px', flexShrink: 0 }}>
              <Timer size={17} color="white" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', color: 'white' }}>
              {avgPracticeTime.value}
            </span>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, opacity: 0.9, color: 'white' }}>
              {avgPracticeTime.unit}
            </span>
          </div>
        </div>

        {/* KPI 3: Tages-Pensum / Wochen-Pensum */}
        <div 
          onClick={() => onTabChange?.('live')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onTabChange?.('live');
            }
          }}
          role={onTabChange ? 'button' : undefined}
          tabIndex={onTabChange ? 0 : undefined}
          aria-label={isRestDay ? `Wochen-Pensum: ${regularWeeklyPensum}. Zum Stundenplan wechseln.` : `Tages-Pensum: ${workloadHoursStr}. Zum Stundenplan wechseln.`}
          style={{
            flex: '1 1 0px',
            minWidth: 0,
            position: 'relative', overflow: 'hidden',
            background: '#facc15',
            color: '#0f172a',
            borderRadius: '20px',
            boxShadow: 'none',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            minHeight: '72px',
            padding: '14px 16px',
            boxSizing: 'border-box',
            border: 'none',
            cursor: onTabChange ? 'pointer' : 'default',
            outline: 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0f172a' }}>
              {isRestDay ? 'Wochen-Pensum' : 'Tages-Pensum'}
            </span>
            <div style={{ background: 'rgba(15, 23, 42, 0.12)', padding: '6px', borderRadius: '10px', flexShrink: 0 }}>
              <Clock size={17} color="#0f172a" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', color: '#0f172a' }}>
              {isRestDay ? regularWeeklyPensum : workloadHoursStr}
            </span>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
              {isRestDay ? (regularWeeklyPensum === '0h' ? 'Noch offen' : 'Regulär') : 'Heute'}
            </span>
          </div>
        </div>

        {/* KPI 4: Ausfälle / Status */}
        <div style={{
          flex: '1 1 0px',
          minWidth: 0,
          position: 'relative', overflow: 'hidden',
          background: '#ef4444',
          color: 'white',
          borderRadius: '20px',
          boxShadow: 'none',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          minHeight: '72px',
          padding: '14px 16px',
          boxSizing: 'border-box',
          border: 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 900, opacity: 0.95, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'white' }}>
              {isRestDay ? 'Status' : 'Ausfälle'}
            </span>
            <div style={{ background: 'rgba(255, 255, 255, 0.25)', padding: '6px', borderRadius: '10px', flexShrink: 0 }}>
              {isRestDay || cancellationsCount === 0 ? (
                <ShieldCheck size={17} color="white" />
              ) : (
                <AlertCircle size={17} color="white" />
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
            <span style={{ fontSize: isRestDay ? '1.35rem' : '1.75rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', color: 'white' }}>
              {isRestDay ? 'Frei' : cancellationsCount}
            </span>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, opacity: 0.95, color: 'white' }}>
              {isRestDay ? 'Erholung' : (cancellationsCount === 0 ? 'Planmäßig' : 'Heute')}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderAbsenceCardWidget = () => {
    const isAbsent = isTeacherCurrentlyAbsent;
    const absenceUntilFormatted = isAbsent ? formatAbsenceEndDate(teacher?.ausfall_until ?? (teacher as any)?.ausfallUntil) : '';

    if (!isAbsent) {
      return (
        <div 
          className="absence-card-container hover-scale"
          role="button"
          tabIndex={0}
          aria-label="Abwesenheit erfassen"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              const today = getSimulatedNow().toLocaleDateString('sv-SE');
              setAbsenceStartDate(today);
              setAbsenceUntilDate(today);
              setQuickAbsencePreset('today');
              setShowAbsenceModal(true);
            }
          }}
          onClick={() => {
            const today = getSimulatedNow().toLocaleDateString('sv-SE');
            setAbsenceStartDate(today);
            setAbsenceUntilDate(today);
            setQuickAbsencePreset('today');
            setShowAbsenceModal(true);
          }}
          style={{ 
            padding: '12px 16px', 
            borderRadius: '22px',
            background: '#ffffff',
            boxShadow: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            width: '100%',
            boxSizing: 'border-box',
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Activity size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <h3 style={{ 
                fontSize: '0.88rem', 
                fontWeight: 900, 
                margin: 0,
                color: '#7f1d1d',
                letterSpacing: '-0.01em',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                whiteSpace: 'nowrap'
              }}>
                Ausfall melden
              </h3>
              <p style={{ 
                margin: '1px 0 0 0', 
                fontSize: '0.73rem', 
                color: '#94a3b8', 
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}>
                Termine absagen &amp; verwalten
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const today = getSimulatedNow().toLocaleDateString('sv-SE');
              setAbsenceStartDate(today);
              setAbsenceUntilDate(today);
              setQuickAbsencePreset('today');
              setShowAbsenceModal(true);
            }}
            style={{
              height: '36px',
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '0 16px',
              borderRadius: '100px',
              fontWeight: 800,
              fontSize: '0.76rem',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
              boxShadow: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Melden</span>
          </button>
        </div>
      );
    }

    return (
      <div style={{
        background: '#fee2e2',
        border: 'none',
        borderRadius: '22px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CalendarX size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#991b1b' }}>
                Abwesenheit aktiv
              </div>
              <div style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600 }}>
                bis {absenceUntilFormatted}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAbsenceOverviewModal(true)}
            style={{
              background: '#ffffff',
              color: '#991b1b',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Users size={12} />
            <span>Ausfälle ({totalAbsenceCancellationsCount})</span>
          </button>
        </div>

        <button
          onClick={handleEndAbsence}
          disabled={submittingAbsence}
          style={{
            width: '100%',
            background: '#34a853',
            color: 'white',
            border: 'none',
            padding: '10px',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.8rem',
            cursor: submittingAbsence ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Check size={14} />
          <span>Wieder verfügbar melden</span>
        </button>
      </div>
    );
  };

  const renderEmergencyCallout = (compact = false) => {
    if (emergencyUnconfirmedAppointments.length === 0) return null;

    return (
      <div style={{
        background: '#ffedd5',
        border: 'none',
        borderRadius: compact ? '20px' : '28px',
        padding: compact ? '16px' : '22px 24px',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxSizing: 'border-box',
        marginBottom: '16px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#ea580c',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'none',
              flexShrink: 0
            }}>
              <AlertTriangle size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  color: '#ea580c',
                  background: '#ffedd5',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Zap size={11} strokeWidth={2.4} />
                  <span>2h-Frühwarnung · Unbestätigte Verschiebung</span>
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#9a3412' }}>
                  {emergencyUnconfirmedAppointments.length === 1 ? '1 unbestätigter Termin' : `${emergencyUnconfirmedAppointments.length} unbestätigte Termine`}
                </span>
              </div>
              <h3 style={{ margin: '2px 0 0 0', fontSize: compact ? '0.98rem' : '1.12rem', fontWeight: 900, color: '#7c2d12', letterSpacing: '-0.02em' }}>
                Terminverschiebung noch unbestätigt
              </h3>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHausaufgabenWidget = () => (
    <TeacherHausaufgabenWidget
      teacher={teacher}
      activeStudent={activeStudent}
      activeTimelineSlot={activeTimelineSlot}
      currentTimeStr={currentTimeStr}
      activeGroupStudents={activeGroupStudents}
      selectedGroupStudentId={selectedGroupStudentId}
      setSelectedGroupStudentId={setSelectedGroupStudentId}
      allStudents={allStudents}
      bypassAbsenceView={bypassAbsenceView}
      selectedStudentProfile={selectedStudentProfile}
      setSelectedStudentProfile={setSelectedStudentProfile}
      docStudent={docStudent}
      setDocStudent={setDocStudent}
      dynamicPrepMirror={dynamicPrepMirror}
      setDynamicPrepMirror={setDynamicPrepMirror}
      loadingPrepMirror={loadingPrepMirror}
      setLoadingPrepMirror={setLoadingPrepMirror}
      briefingData={briefingData}
      isFreeDay={isFreeDay}
      isWeekend={isWeekend}
      isTourDemoScheduleActive={isTourDemoScheduleActive}
      firstSlotStartStr={firstSlotStartStr}
      getSimulatedNow={getSimulatedNow}
      showRealNames={showRealNames}
      widgetState={widgetState}
      relevantRoomIssuesToday={relevantRoomIssuesToday}
      checkHasStudentQuestion={checkHasStudentQuestion}
      quickAudioStudent={quickAudioStudent}
      setQuickAudioStudent={setQuickAudioStudent}
      onOpenStudio={() => {
        if (onTabChange) onTabChange('studio');
      }}
      onOpenNotes={() => setShowNotesDrawer(true)}
      onOpenToolbox={() => setIsQuickToolboxOpen(true)}
    />
  );

  const renderTourDemoScheduleJSX = () => (
    <Suspense fallback={<div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>Tagesplan wird geladen...</div>}>
      <TeacherTourDemoSchedule
        isFreeDay={isFreeDay}
        getSimulatedNow={getSimulatedNow}
        windowWidth={windowWidth}
        showRealNames={showRealNames}
        toggleRealNames={toggleRealNames}
      />
    </Suspense>
  );

  const renderTagesplanWidget = () => (
    <Suspense fallback={<div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>Tagesplan wird geladen...</div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', flex: 1 }}>
        {activeMakeupTokens.length > 0 && (!isTeacherCurrentlyAbsent || bypassAbsenceView) && (
          <TeacherMakeupRadarWidget
            tokens={activeMakeupTokens}
            showRealNames={showRealNames}
            onOpenRedeemModal={(token) => {
              setSelectedMakeupToken(token);
              setSelectedMakeupSlot(null);
              setMakeupModalMode('redeem');
              setIsMakeupModalOpen(true);
            }}
            onOpenCancelModal={(token) => {
              setSelectedMakeupToken(token);
              setSelectedMakeupSlot(null);
              setMakeupModalMode('cancel');
              setIsMakeupModalOpen(true);
            }}
          />
        )}
        <TeacherTagesplanWidget
          teacher={teacher}
          onTabChange={onTabChange}
          onNavigateSchedule={() => onTabChange?.('live')}
          activeChatOcc={activeChatOcc}
          setActiveChatOcc={setActiveChatOcc}
          activeChatOccIds={activeChatOccIds}
          unreadChatOccIds={unreadChatOccIds}
          docStudent={docStudent}
          setDocStudent={setDocStudent}
          allStudents={allStudents}
          isAbsenceWidgetExpanded={isAbsenceWidgetExpanded}
          setIsAbsenceWidgetExpanded={setIsAbsenceWidgetExpanded}
          absenceUntilDate={absenceUntilDate}
          setAbsenceUntilDate={setAbsenceUntilDate}
          bypassAbsenceView={bypassAbsenceView}
          currentTimeStr={currentTimeStr}
          quickAudioStudent={quickAudioStudent}
          setQuickAudioStudent={setQuickAudioStudent}
          loadingPrepMirror={loadingPrepMirror}
          windowWidth={windowWidth}
          isMobileDevice={isMobileDevice}
          activeTimelineSlotRef={activeTimelineSlotRef}
          briefingData={briefingData}
          checkHasStudentQuestion={checkHasStudentQuestion}
          checkHasTodayAudio={checkHasTodayAudio}
          cleanRoomName={cleanRoomName}
          getIssueRoomLabel={getIssueRoomLabel}
          handleResolveRoomIssueInTagesplan={handleResolveRoomIssueInTagesplan}
          isStudentBirthdayToday={isStudentBirthdayToday}
          resolveStudentInstrument={resolveStudentInstrument}
          splitAndNormalizeStudents={splitAndNormalizeStudents}
          getSimulatedNow={getSimulatedNow}
          relevantRoomIssuesToday={relevantRoomIssuesToday}
          teacherTodayRooms={teacherTodayRooms}
          isFreeDay={isFreeDay}
          isWeekend={isWeekend}
          isTourDemoScheduleActive={isTourDemoScheduleActive}
          showRealNames={showRealNames}
          toggleRealNames={toggleRealNames}
          rooms={rooms}
          handleUpdateIssueRoom={handleUpdateIssueRoomInTagesplan}
          userId={userId}
          urgentCancellations={urgentCancellations}
          onOpenUrgentModal={() => setIsUrgentModalOpen(true)}
          onOpenMakeupModal={({ mode, slot }) => {
            setSelectedMakeupSlot(slot);
            if (slot.makeup_token_id) {
              const matchingToken = activeMakeupTokens.find(t => t.token_id === slot.makeup_token_id);
              setSelectedMakeupToken(matchingToken || { id: slot.makeup_token_id, student_id: slot.student?.id, total_minutes: slot.duration, remaining_minutes: slot.duration });
            } else {
              setSelectedMakeupToken(null);
            }
            setMakeupModalMode(mode);
            setIsMakeupModalOpen(true);
          }}
        />
      </div>
    </Suspense>
  );

  const renderFeedWidget = () => (
    <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Mitteilungen werden geladen...</div>}>
      <TeacherFeedWidget
        teacher={teacher}
        activeChatOcc={activeChatOcc}
        setActiveChatOcc={setActiveChatOcc}
        rooms={rooms}
        holidays={holidays}
        myBookings={myBookings}
        myChangedAppointments={myChangedAppointments}
        showAllChangedAppointments={showAllChangedAppointments}
        setShowAllChangedAppointments={setShowAllChangedAppointments}
        showAllBookings={showAllBookings}
        setShowAllBookings={setShowAllBookings}
        bypassAbsenceView={bypassAbsenceView}
        adminFeedbackRequests={adminFeedbackRequests}
        adminFeedbackResponses={adminFeedbackResponses}
        campusFeedAnnouncements={campusFeedAnnouncements}
        feedInteractions={feedInteractions}
        teacherFeedTab={teacherFeedTab}
        setTeacherFeedTab={setTeacherFeedTab}
        classFeedPosts={classFeedPosts}
        classFeedInteractions={classFeedInteractions}
        respondingToRequestId={respondingToRequestId}
        setRespondingToRequestId={setRespondingToRequestId}
        questionnaireAnswers={questionnaireAnswers}
        setQuestionnaireAnswers={setQuestionnaireAnswers}
        submittingFeedback={submittingFeedback}
        adminFeedbackTab={adminFeedbackTab}
        setAdminFeedbackTab={setAdminFeedbackTab}
        planningEvents={planningEvents}
        mySubmittedProgramPoints={mySubmittedProgramPoints}
        visibleChangedAppointments={visibleChangedAppointments}
        activePlanningEvents={activePlanningEvents}
        activePlatform={activePlatform}
        handleBookingClick={handleBookingClick}
        handleDeleteMyBooking={handleDeleteMyBooking}
        handleMarkRequestAsDone={handleMarkRequestAsDone}
        handleReactToPost={handleReactToPost}
        handleSubmitFeedbackResponse={handleSubmitFeedbackResponse}
        getCountdownString={getCountdownString}
        userId={userId}
        allStudents={allStudents}
        showRealNames={showRealNames}
        onTabChange={onTabChange}
        setMyChangedAppointments={setMyChangedAppointments}
      />
    </Suspense>
  );

  const isTabletPortrait = !isMobileDevice && windowWidth >= 768 && windowWidth <= 1024;
  const isTabletViewport = !isMobileDevice && windowWidth >= 768 && windowWidth <= 1280;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'row', 
      flexWrap: 'wrap', 
      gap: (isTeacherBriefingSidebarCollapsed || isTabletViewport) ? '0px' : '10px', 
      alignItems: 'start', 
      width: '100%',
      position: (windowWidth < 768 || isMobileDevice) ? 'static' : 'relative'
    }} className="dashboard-main-grid">

      {/* Floating Right-Edge Toggle Button when Collapsed (Wide Desktop > 1280px only; on iPad it sits cleanly in the Hero Header) */}
      {isTeacherBriefingSidebarCollapsed && !isMobileDevice && !isTabletViewport && (() => {
        const isCampus = activePlatform === 'campus';
        const btnBg = isCampus ? '#34a853' : '#facc15';
        const btnColor = isCampus ? '#ffffff' : '#0f172a';
        const btnShadow = 'none';
        const badgeBg = hasTeacherAppointmentAlerts ? '#f97316' : (isCampus ? '#ffffff' : '#0f172a');
        const badgeTextColor = hasTeacherAppointmentAlerts ? '#ffffff' : (isCampus ? '#34a853' : '#ffffff');

        return (
          <button
            onClick={() => handleToggleTeacherBriefingSidebar(false)}
            aria-expanded={false}
            aria-label="Termine & Mitteilungen ausklappen"
            style={{
              position: 'fixed', right: '0px', top: '50%', transform: 'translateY(-50%)', zIndex: 99,
              background: btnBg, border: 'none', borderRight: 'none', borderRadius: '16px 0 0 16px',
              padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '10px', cursor: 'pointer', boxShadow: btnShadow, color: btnColor,
              fontWeight: 900, fontSize: '0.7rem', transition: 'all 0.2s ease-in-out'
            }}
            className="sidebar-edge-toggle"
            title="Termine & Mitteilungen ausklappen"
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={18} color={btnColor} />
              {(hasTeacherAppointmentAlerts || hasTeacherFeedAlerts) && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px', width: '10px', height: '10px',
                  borderRadius: '50%', background: '#f59e0b', border: `2px solid ${btnBg}`,
                  boxShadow: 'none', animation: 'pulse 1.5s infinite'
                }} />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: isCampus ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.08)',
                backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}>
                <Calendar size={15} color={btnColor} />
              </div>
              
              {teacherSidebarTotalAlertsCount > 0 && (
                <span style={{
                  background: badgeBg, color: badgeTextColor, fontSize: '0.65rem',
                  fontWeight: 950, padding: '2px 6px', borderRadius: '100px',
                  minWidth: '16px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}>
                  {teacherSidebarTotalAlertsCount}
                </span>
              )}
            </div>

            <span style={{ 
              writingMode: 'vertical-rl', textTransform: 'uppercase', letterSpacing: '0.08em', 
              fontSize: '0.68rem', fontWeight: 900, color: btnColor, marginTop: '2px',
              textShadow: isCampus ? '0 1px 2px rgba(0,0,0,0.15)' : 'none'
            }}>
              Termine &amp; Mitteilungen
            </span>
          </button>
        );
      })()}
      
      <div style={{ 
        flex: (isTeacherBriefingSidebarCollapsed || isTabletViewport) ? '1 1 100%' : '1 1 600px',
        minWidth: (windowWidth < 768 || isMobileDevice) ? '0px' : '320px',
        maxWidth: '100%',
        width: '100%',
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px',
        maxHeight: (windowWidth < 768 || isMobileDevice) ? 'none' : 'calc(100vh - 60px)',
        overflowY: (windowWidth < 768 || isMobileDevice) ? 'visible' : 'auto',
        paddingRight: (isTeacherBriefingSidebarCollapsed && !isMobileDevice && !isTabletViewport) ? '56px' : ((windowWidth < 768 || isMobileDevice || isTabletViewport) ? '0px' : '10px'),
        paddingBottom: (windowWidth < 768 || isMobileDevice) ? '20px' : '80px',
        boxSizing: 'border-box',
        transition: 'padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1), flex 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {briefingLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Briefing wird geladen...</div>
        ) : briefingData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {renderEmergencyCallout(false)}
            <CampusSponsorIngressBanner schoolId={schoolData?.id || teacher?.school_id} sponsorSettings={schoolData?.sponsor_settings} isReady={!briefingLoading} />
            <UpdateAnnouncementHero userId={userId} activePlatform={activePlatform} />
            <TeacherPasskeyNudgeBanner 
              user={teacher} 
              schoolData={schoolData} 
              onPasskeyRegistered={() => {
                // Biometrischer Passkey erfolgreich aktiviert
              }}
            />

            {/* Planning Active Banners */}
            {activePlanningEvents.map(ev => {
              if (dismissedBanners[ev.id]) return null;
              return (
                <div
                  key={`planning-banner-${ev.id}`}
                  style={{
                    background: '#ffedd5',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '12px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem' }}>📢</span>
                    <div>
                      <strong style={{ fontSize: '0.86rem', color: '#7c2d12' }}>Planung aktiv: {ev.title}</strong>
                      <span style={{ fontSize: '0.78rem', color: '#9a3412', marginLeft: '12px' }}>
                        {ev.submission_deadline
                          ? `Frist endet am ${new Date(ev.submission_deadline).toLocaleString('de-DE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} Uhr`
                          : 'Reiche jetzt deine Beiträge ein!'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('groovelab_auto_submit_event_id', ev.id);
                        onTabChange?.('events');
                      }}
                      style={{
                        background: '#ea580c',
                        color: '#ffffff',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        boxShadow: 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Jetzt Einreichen
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissedBanners(prev => ({ ...prev, [ev.id]: true }))}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#9a3412',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.7
                      }}
                      title="Schließen"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Holiday Banner */}
            {isTodayHoliday && (
              <div style={{
                background: 'rgba(52, 168, 83, 0.10)',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                border: 'none',
                padding: '18px 24px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: 'none',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: '#ffffff',
                  border: 'none',
                  color: '#34a853',
                  padding: '10px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Palmtree size={20} strokeWidth={2.2} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>
                    {isTodayHoliday.name}
                  </h4>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                    Vom <strong style={{ color: '#34a853' }}>{new Date(isTodayHoliday.start).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'})}</strong> bis zum <strong style={{ color: '#34a853' }}>{new Date(isTodayHoliday.end).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'})}</strong> findet kein regulärer Unterricht statt.
                  </p>
                </div>
              </div>
            )}

            {/* Absence View or Normal Briefing */}
            {isTeacherCurrentlyAbsent && !bypassAbsenceView ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                background: '#ffffff',
                backdropFilter: 'none',
                borderRadius: '24px',
                padding: '32px',
                boxSizing: 'border-box'
              }}>
                <div style={{
                  background: '#f1f5f9',
                  borderRadius: '20px',
                  padding: '32px',
                  textAlign: 'center'
                }}>
                  <CalendarX size={44} color="#dc2626" style={{ margin: '0 auto 12px auto' }} />
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>
                    Abwesenheits-Modus aktiv
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#475569', fontWeight: 600, maxWidth: '540px', marginLeft: 'auto', marginRight: 'auto' }}>
                    Deine Unterrichtsausfälle sind im System registriert. Betroffene Schüler wurden automatisch informiert.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setShowAbsenceOverviewModal(true)}
                    style={{
                      background: '#ffffff',
                      color: '#991b1b',
                      border: 'none',
                      padding: '12px 22px',
                      minHeight: '44px',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Users size={18} color="#dc2626" />
                    <span>Ausfälle anzeigen ({totalAbsenceCancellationsCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBypassAbsenceView(true)}
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      border: 'none',
                      padding: '12px 20px',
                      minHeight: '44px',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Briefing Board ansehen
                  </button>

                  <button
                    type="button"
                    onClick={handleEndAbsence}
                    disabled={submittingAbsence}
                    style={{
                      background: '#34a853',
                      color: 'white',
                      border: 'none',
                      padding: '12px 28px',
                      minHeight: '44px',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      cursor: submittingAbsence ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Check size={18} strokeWidth={3} />
                    <span>Wieder verfügbar melden</span>
                  </button>
                </div>
              </div>
            ) : isMobileDevice ? (
              <MobileBriefingCarousel
                themeColor={activePlatform === 'campus' ? '#34a853' : '#facc15'}
                heroBanner={
                  <div style={{
                    background: '#ffffff',
                    backdropFilter: 'none',
                    WebkitBackdropFilter: 'none',
                    border: 'none',
                    borderRadius: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    boxShadow: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {/* Top Avatar Stage (StudentBriefingTab Parity) */}
                    <div style={{
                      width: '100%',
                      height: '150px',
                      background: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                      position: 'relative',
                      overflow: 'hidden',
                      borderBottom: 'none'
                    }}>
                      <img
                        src={resolvedAvatarSrc}
                        alt={resolvedTeacherFullName ? `${resolvedTeacherFullName} Avatar` : 'Lehrkraft Avatar'}
                        width={190}
                        height={150}
                        loading="eager"
                        decoding="async"
                        onError={() => setAvatarLoadError(true)}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          zIndex: 2,
                          transform: 'scale(1.03)',
                          transition: 'transform 0.5s ease'
                        }}
                      />
                      <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 5 }}>
                        <TourStartButton onClick={startTour} platformTheme={activePlatform === 'campus' ? 'campus' : 'groovelab'} />
                      </div>
                    </div>

                    {/* Content & Action Stack (StudentBriefingTab Parity) */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flex: 1, zIndex: 2, padding: '20px 20px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <div style={{
                          background: '#e0e7ff',
                          color: '#4f46e5',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          borderRadius: '100px',
                          padding: '4px 12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          border: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853', display: 'inline-block' }} />
                          <span>🎓 CAMPUS LEHRKRAFT • {currentTimeStr || '13:00'} UHR</span>
                        </div>
                      </div>

                      <h3 style={{
                        margin: 0,
                        fontSize: '26px',
                        fontWeight: 950,
                        color: '#0f172a',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        lineHeight: 1.15,
                        letterSpacing: '-0.02em'
                      }}>
                        Hi {resolvedTeacherFullName}!
                      </h3>

                      <p style={{
                        margin: '8px 0 0 0',
                        fontSize: '0.92rem',
                        color: '#475569',
                        fontWeight: 650,
                        lineHeight: 1.45
                      }}>
                        {isWeekend
                          ? 'Schönes Wochenende! Keine Termine heute – Zeit zum Durchatmen.'
                          : ((isFreeDay && !isTourDemoScheduleActive)
                              ? 'Heute unterrichtsfrei • Alle Systeme synchronisiert.'
                              : 'Bereit für deine Unterrichtssession? Dein Tagesplan und Kompass stehen bereit.')}
                      </p>

                      {/* Quick-Action Buttons (StudentBriefingActionButtons 1:1 Pattern) */}
                      <div style={{
                        marginTop: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        gap: '10px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        {/* 1. Primary Status / Tagesplan Button */}
                        <button
                          type="button"
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('campus_mobile_briefing_switch_tab', { detail: { tabId: 'tagesplan' } }));
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: 'rgba(52, 168, 83, 0.10)',
                            color: '#34a853',
                            padding: '10px 16px',
                            minHeight: '44px',
                            boxSizing: 'border-box',
                            borderRadius: '14px',
                            fontSize: '0.82rem',
                            fontWeight: 850,
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: 'none',
                            width: '100%',
                            touchAction: 'manipulation'
                          }}
                          className="hover-scale"
                          aria-label="Zum Tagesplan wechseln"
                        >
                          <Calendar size={15} color="currentColor" />
                          <span>
                            {isRestDay
                              ? 'Tagesplan: Heute unterrichtsfrei'
                              : `Heutiger Tagesplan: ${activeLessonsCount} UE (${totalActiveStudentsToday} Schüler)`}
                          </span>
                        </button>

                        {/* 2. Quick-Action Duo: Ausfall melden & Praxis-Tools (50/50 Grid) */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}>
                          <button
                            type="button"
                            onClick={() => {
                              const today = getSimulatedNow().toLocaleDateString('sv-SE');
                              setAbsenceStartDate(today);
                              setAbsenceUntilDate(today);
                              setQuickAbsencePreset('today');
                              setShowAbsenceModal(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              background: '#fee2e2',
                              color: '#991b1b',
                              padding: '10px 14px',
                              minHeight: '44px',
                              boxSizing: 'border-box',
                              borderRadius: '14px',
                              fontSize: '0.82rem',
                              fontWeight: 850,
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: 'none',
                              width: '100%',
                              touchAction: 'manipulation'
                            }}
                            className="hover-scale"
                            aria-label="Ausfall melden"
                          >
                            <CalendarX size={15} color="#dc2626" />
                            <span>Ausfall melden</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsQuickToolboxOpen(true)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              background: '#f1f5f9',
                              color: '#0f172a',
                              padding: '10px 14px',
                              minHeight: '44px',
                              boxSizing: 'border-box',
                              borderRadius: '14px',
                              fontSize: '0.82rem',
                              fontWeight: 850,
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: 'none',
                              width: '100%',
                              touchAction: 'manipulation'
                            }}
                            className="hover-scale"
                            aria-label="Praxis-Tools öffnen"
                          >
                            <Sliders size={15} color="#34a853" />
                            <span>Praxis-Tools</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                }
                kpisGrid={renderMobileKpis()}
                tagesplanWidget={isTourDemoScheduleActive ? renderTourDemoScheduleJSX() : renderTagesplanWidget()}
                absenceWidget={isTeacherCurrentlyAbsent ? renderAbsenceCardWidget() : null}
                hausaufgabenWidget={renderHausaufgabenWidget()}
                mitteilungenWidget={renderFeedWidget()}
                additionalTabs={[
                  {
                    id: 'notes',
                    label: 'Notizen',
                    icon: Edit3,
                    content: (
                      <BriefingNotesCard
                        user={teacher}
                        schoolId={teacher?.school_id || schoolData?.id}
                        activeStudent={activeStudent}
                        allStudents={allStudents}
                        todayStudents={todayTagesplanStudents}
                        rooms={rooms}
                        currentRoom={effectiveTeacherRoom}
                        teacherTodayRooms={teacherTodayRooms}
                        activeTimelineSlot={activeTimelineSlot}
                        onOpenDrawer={() => setShowNotesDrawer(true)}
                        onOpenHomeworkModal={(stud) => {
                          setDocStudent(stud);
                        }}
                        widgetState={widgetState}
                      />
                    )
                  }
                ]}
              />
            ) : (
              /* Desktop Layout (1:1 Goldstandard Parity) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                {/* Gamified KPI Cards row (Adaptive 2x2 on iPad Portrait, 4x1 on iPad Landscape & Desktop) */}
                {(!isTeacherCurrentlyAbsent || bypassAbsenceView) && (
                  <div id="tour-teacher-kpis" style={{ display: 'grid', gridTemplateColumns: isTabletPortrait ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>

                    {/* Card 1: Heutige Schüler / Gesamtschüler */}
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      background: '#6366f1', color: 'white',
                      borderRadius: '22px', 
                      boxShadow: 'none',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '74px',
                      padding: '16px 18px', boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: 'none'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {isRestDay ? 'Gesamtschüler' : 'Schüler Heute'}
                        </span>
                        <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '6px', borderRadius: '10px' }}>
                          <Users size={14} color="white" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.75rem', fontWeight: 950, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {isRestDay ? totalTeacherStudentsCount : activeLessonsCount}
                        </span>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, opacity: 0.9 }}>
                          {isRestDay ? 'Schüler' : 'UE'}
                        </span>
                        {isRestDay ? (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, opacity: 0.85, marginLeft: '2px' }}>
                            aktiv
                          </span>
                        ) : (
                          totalActiveStudentsToday > activeLessonsCount && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, opacity: 0.85, marginLeft: '2px' }}>
                              ({totalActiveStudentsToday} Sch.)
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    {/* Card 2: Ø Übe-Zeit / Ø Klassen-Fokus */}
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      background: '#34a853', color: 'white',
                      borderRadius: '22px', 
                      boxShadow: 'none',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '74px',
                      padding: '16px 18px', boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: 'none'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {isRestDay ? 'Ø Klassen-Fokus' : 'Ø Übe-Zeit'}
                        </span>
                        <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '6px', borderRadius: '10px' }}>
                          <Timer size={14} color="white" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                        <span style={{ fontSize: '1.75rem', fontWeight: 950, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{avgPracticeTime.value}</span>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, opacity: 0.9 }}>{avgPracticeTime.unit}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.8, marginLeft: '2px' }}>/ Woche</span>
                      </div>
                    </div>

                    {/* Card 3: Tages-Pensum / Wochen-Pensum */}
                    <div 
                      onClick={() => onTabChange?.('live')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onTabChange?.('live');
                        }
                      }}
                      role={onTabChange ? 'button' : undefined}
                      tabIndex={onTabChange ? 0 : undefined}
                      aria-label={isRestDay ? `Wochen-Pensum: ${regularWeeklyPensum}. Zum Stundenplan wechseln.` : `Tages-Pensum: ${workloadHoursStr}. Zum Stundenplan wechseln.`}
                      style={{
                        position: 'relative', overflow: 'hidden',
                        background: '#facc15', color: '#0f172a',
                        borderRadius: '22px', 
                        boxShadow: 'none',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '74px',
                        padding: '16px 18px', boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: 'none',
                        cursor: onTabChange ? 'pointer' : 'default',
                        outline: 'none'
                      }} 
                      className="hover-scale focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 850, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {isRestDay ? 'Wochen-Pensum' : 'Tages-Pensum'}
                        </span>
                        <div style={{ background: 'rgba(15, 23, 42, 0.12)', padding: '6px', borderRadius: '10px' }}>
                          <Clock size={14} color="#0f172a" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                        <span style={{ fontSize: '1.75rem', fontWeight: 950, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0f172a' }}>
                          {isRestDay ? regularWeeklyPensum : workloadHoursStr}
                        </span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, opacity: 0.85, marginLeft: '2px', color: '#0f172a' }}>
                          {isRestDay ? (regularWeeklyPensum === '0h' ? 'Noch offen' : '/ Woche') : 'Heute'}
                        </span>
                      </div>
                    </div>

                    {/* Card 4: Ausfälle / Dienst-Status */}
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      background: '#ef4444', color: 'white',
                      borderRadius: '22px', 
                      boxShadow: 'none',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '74px',
                      padding: '16px 18px', boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: 'none'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {isRestDay ? 'Dienst-Status' : 'Ausfälle'}
                        </span>
                        <div style={{ background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(8px)', padding: '6px', borderRadius: '10px' }}>
                          {isRestDay || cancellationsCount === 0 ? (
                            <ShieldCheck size={14} color="white" />
                          ) : (
                            <AlertCircle size={14} color="white" />
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {isRestDay ? (
                          <>
                            <span style={{ fontSize: '1.25rem', fontWeight: 950, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Dienst-Ruhe aktiv</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, opacity: 0.9 }}>Erholungsphase</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '1.75rem', fontWeight: 950, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{cancellationsCount}</span>
                            <span style={{ fontSize: '0.74rem', fontWeight: 800, opacity: 0.9 }}>
                              {cancellationsCount === 1 ? 'Ausfall' : 'Ausfälle'}
                            </span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, opacity: 0.85, marginLeft: '2px' }}>
                              {cancellationsCount === 0 ? 'Planmäßig' : 'Heute'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2-Column Adaptive Grid (Stacks vertically on iPad Portrait 768-1024px; 45/55 Split on iPad Landscape; 50/50 on Desktop) */}
                <div style={{ display: 'flex', flexDirection: isTabletPortrait ? 'column' : 'row', gap: '16px', alignItems: 'stretch', width: '100%' }}>
                  {/* Left Column: Hero Card + Switcher + Content */}
                  <div style={{ flex: isTabletPortrait ? '1 1 100%' : (isTabletViewport ? '0 0 45%' : '1 1 50%'), display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0, minHeight: (!isTabletPortrait && windowWidth >= 768) ? '520px' : undefined }}>
                    {/* Hero Card Banner (StudentBriefingTab Split Hero Deck Parity) */}
                    <div style={{
                      background: '#ffffff',
                      backdropFilter: 'none',
                      WebkitBackdropFilter: 'none',
                      border: 'none',
                      borderRadius: '24px',
                      display: 'flex',
                      alignItems: 'stretch',
                      justifyContent: 'space-between',
                      boxShadow: 'none',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      width: '100%',
                      minHeight: '185px',
                      flex: '0 1 auto',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: isTabletViewport && !isTabletPortrait ? '145px' : '175px',
                        background: '#0f172a',
                        flexShrink: 0,
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRight: 'none'
                      }} className="hover-scale hero-avatar-container">
                        <img 
                          src={resolvedAvatarSrc} 
                          alt={resolvedTeacherFullName ? `${resolvedTeacherFullName} Avatar` : 'Lehrkraft Avatar'} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.03)' }} 
                          onError={() => setAvatarLoadError(true)}
                        />
                      </div>
                      <div style={{ padding: isTabletViewport && !isTabletPortrait ? '18px 20px' : '22px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          marginBottom: '10px',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{
                            background: '#e0e7ff',
                            color: '#4f46e5',
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            borderRadius: '100px',
                            padding: '4px 12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853', display: 'inline-block' }} />
                            <span>🎓 CAMPUS LEHRKRAFT • {currentTimeStr || '13:00'} UHR</span>
                          </div>

                          {/* iPad Slide-Over Trigger for Termine & Mitteilungen */}
                          {isTabletViewport && (
                            <button
                              type="button"
                              onClick={() => handleToggleTeacherBriefingSidebar(!isTeacherBriefingSidebarCollapsed)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#f1f5f9',
                                color: '#0f172a',
                                padding: '6px 12px',
                                minHeight: '36px',
                                borderRadius: '10px',
                                fontSize: '0.78rem',
                                fontWeight: 850,
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: 'none',
                                transition: 'all 0.15s ease'
                              }}
                              className="hover-scale"
                              title="Termine & Mitteilungen ein-/ausblenden"
                              aria-label="Termine & Mitteilungen ein-/ausblenden"
                            >
                              <Calendar size={14} color={activePlatform === 'campus' ? '#34a853' : '#ca8a04'} />
                              <span>Termine &amp; News</span>
                              {teacherSidebarTotalAlertsCount > 0 && (
                                <span style={{
                                  background: hasTeacherAppointmentAlerts ? '#f59e0b' : '#ef4444',
                                  color: '#ffffff',
                                  fontSize: '0.66rem',
                                  fontWeight: 950,
                                  padding: '1px 6px',
                                  borderRadius: '100px'
                                }}>
                                  {teacherSidebarTotalAlertsCount}
                                </span>
                              )}
                            </button>
                          )}
                        </div>

                        <h3 style={{ margin: 0, fontSize: '26px', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                          Hi {resolvedTeacherFullName}!
                        </h3>
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.90rem', color: '#475569', fontWeight: 650, lineHeight: 1.4, maxWidth: '460px' }}>
                          {isWeekend
                            ? 'Keine Termine heute – Zeit zum Durchatmen und Erholen.'
                            : ((isFreeDay && !isTourDemoScheduleActive) ? 'Heute unterrichtsfrei • Alle Systeme synchronisiert.' : (isTourDemoScheduleActive ? 'Bereit für einen produktiven Tag? Hier ist deine Übersicht.' : dynamicGreeting.subtitle))
                          }
                        </p>
                      </div>
                    </div>

                    {/* Switcher Bar: Tages-Kompass | Notizen | Tools (Direkt über dem Widget) */}
                    <div
                      role="tablist"
                      aria-label="Hauptansichten linke Spalte"
                      style={{
                        display: 'flex',
                        background: '#e2e8f0',
                        padding: '4px',
                        borderRadius: '14px',
                        border: 'none',
                        gap: '4px',
                        backdropFilter: 'none',
                        flexShrink: 0
                      }}
                    >
                      {/* 1. Tages-Kompass */}
                      <button
                        type="button"
                        role="tab"
                        id="tab-briefing"
                        aria-selected={effectiveLeftColumnTab === 'briefing'}
                        aria-controls="tabpanel-briefing"
                        onClick={() => setLeftColumnTab('briefing')}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: 'none',
                          background: effectiveLeftColumnTab === 'briefing' ? '#ffffff' : 'transparent',
                          color: effectiveLeftColumnTab === 'briefing' ? '#0f172a' : '#475569',
                          fontWeight: effectiveLeftColumnTab === 'briefing' ? 850 : 600,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          boxShadow: 'none',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Compass size={14} color={effectiveLeftColumnTab === 'briefing' ? '#0f172a' : '#475569'} />
                        <span>Tages-Kompass</span>
                      </button>

                      {/* 2. Notizen */}
                      <button
                        type="button"
                        role="tab"
                        id="tab-notes"
                        aria-selected={effectiveLeftColumnTab === 'notes'}
                        aria-controls="tabpanel-notes"
                        onClick={() => setLeftColumnTab('notes')}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: 'none',
                          background: effectiveLeftColumnTab === 'notes' ? '#ffffff' : 'transparent',
                          color: effectiveLeftColumnTab === 'notes' ? '#0f172a' : '#475569',
                          fontWeight: effectiveLeftColumnTab === 'notes' ? 850 : 600,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          boxShadow: 'none',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Edit3 size={14} color={effectiveLeftColumnTab === 'notes' ? '#0f172a' : '#475569'} />
                        <span>Notizen</span>
                      </button>

                      {/* 3. Tools */}
                      <button
                        type="button"
                        role="tab"
                        id="tab-toolbox"
                        aria-selected={effectiveLeftColumnTab === 'toolbox'}
                        aria-controls="tabpanel-toolbox"
                        onClick={() => setLeftColumnTab('toolbox')}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: 'none',
                          background: effectiveLeftColumnTab === 'toolbox' ? '#ffffff' : 'transparent',
                          color: effectiveLeftColumnTab === 'toolbox' ? '#0f172a' : '#475569',
                          fontWeight: effectiveLeftColumnTab === 'toolbox' ? 850 : 600,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          boxShadow: 'none',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Sliders size={14} color={effectiveLeftColumnTab === 'toolbox' ? '#0f172a' : '#475569'} />
                        <span>Tools</span>
                      </button>
                    </div>

                    {/* 0,1% Goldstandard Tages-Kompass 2027 (Klarheit, Ruhe & Fokus) */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      {effectiveLeftColumnTab === 'notes' ? (
                        <div role="tabpanel" id="tabpanel-notes" aria-labelledby="tab-notes" tabIndex={0} style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <BriefingNotesCard
                            user={teacher}
                            schoolId={teacher?.school_id || schoolData?.id}
                            activeStudent={activeStudent}
                            allStudents={allStudents}
                            todayStudents={todayTagesplanStudents}
                            rooms={rooms}
                            currentRoom={effectiveTeacherRoom}
                            teacherTodayRooms={teacherTodayRooms}
                            activeTimelineSlot={activeTimelineSlot}
                            onOpenDrawer={() => setShowNotesDrawer(true)}
                            onOpenHomeworkModal={(stud) => {
                              setDocStudent(stud);
                            }}
                            widgetState={widgetState}
                          />
                        </div>
                      ) : effectiveLeftColumnTab === 'toolbox' ? (
                        <div role="tabpanel" id="tabpanel-toolbox" aria-labelledby="tab-toolbox" tabIndex={0} style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <BriefingToolboxCard />
                        </div>
                      ) : (
                        <div role="tabpanel" id="tabpanel-briefing" aria-labelledby="tab-briefing" tabIndex={0} style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                          {renderHausaufgabenWidget()}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Right Column: Tagesplan */}
                  <div style={{ flex: isTabletPortrait ? '1 1 100%' : (isTabletViewport ? '1 1 55%' : '1 1 50%'), display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0, minHeight: (!isTabletPortrait && windowWidth >= 768) ? '520px' : undefined }}>
                    {isTourDemoScheduleActive ? renderTourDemoScheduleJSX() : renderTagesplanWidget()}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>Fehler beim Laden des Briefings.</div>
        )}
      </div>

      {/* iPad Slide-Over Backdrop when Right Sidebar is open */}
      {isTabletViewport && !isTeacherBriefingSidebarCollapsed && (
        <div
          onClick={() => handleToggleTeacherBriefingSidebar(true)}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.35)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 1099
          }}
        />
      )}

      {/* Right Desktop / iPad Slide-Over Sidebar */}
      {!isMobileDevice && (
        <aside style={{
          position: isTabletViewport ? 'fixed' : 'static',
          top: isTabletViewport ? 0 : undefined,
          right: isTabletViewport ? 0 : undefined,
          bottom: isTabletViewport ? 0 : undefined,
          zIndex: isTabletViewport ? 1100 : undefined,
          background: isTabletViewport ? 'rgba(255, 255, 255, 0.98)' : undefined,
          backdropFilter: isTabletViewport ? 'blur(24px)' : undefined,
          WebkitBackdropFilter: isTabletViewport ? 'blur(24px)' : undefined,
          boxShadow: (isTabletViewport && !isTeacherBriefingSidebarCollapsed) ? '-12px 0 40px rgba(15, 23, 42, 0.18)' : undefined,
          borderLeft: (isTabletViewport && !isTeacherBriefingSidebarCollapsed) ? '1px solid #e2e8f0' : undefined,
          maxWidth: isTeacherBriefingSidebarCollapsed ? '0px' : (isTabletViewport ? '360px' : (windowWidth < 768 ? '100%' : '320px')),
          minWidth: isTeacherBriefingSidebarCollapsed ? '0px' : (isTabletViewport ? '360px' : (windowWidth < 768 ? '0px' : '320px')),
          width: isTeacherBriefingSidebarCollapsed ? '0px' : (isTabletViewport ? '360px' : '100%'),
          opacity: isTeacherBriefingSidebarCollapsed ? 0 : 1,
          transform: isTeacherBriefingSidebarCollapsed ? 'translateX(100%)' : 'translateX(0)',
          pointerEvents: isTeacherBriefingSidebarCollapsed ? 'none' : 'auto',
          overflowY: isTeacherBriefingSidebarCollapsed ? 'hidden' : (windowWidth < 768 ? 'visible' : 'auto'),
          overflowX: 'hidden',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px',
          maxHeight: isTabletViewport ? '100dvh' : (windowWidth < 768 ? 'none' : 'calc(100vh - 80px)'),
          padding: isTabletViewport ? (isTeacherBriefingSidebarCollapsed ? '0px' : '20px 18px 40px 18px') : undefined,
          paddingRight: !isTabletViewport ? (isTeacherBriefingSidebarCollapsed ? '0px' : (windowWidth < 768 ? '0' : '6px')) : undefined,
          paddingBottom: !isTabletViewport ? (isTeacherBriefingSidebarCollapsed ? '0px' : (windowWidth < 768 ? '20px' : '80px')) : undefined,
          boxSizing: 'border-box',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }} className="briefing-right-sidebar">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 2px',
            gap: '8px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1, overflow: 'hidden' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: activePlatform === 'campus' ? 'rgba(52, 168, 83, 0.10)' : '#fef9c3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Calendar size={15} color={activePlatform === 'campus' ? '#34a853' : '#ca8a04'} />
              </div>
              <span style={{ 
                fontWeight: 950, 
                fontSize: '0.82rem', 
                color: '#1e293b', 
                letterSpacing: '-0.02em', 
                textTransform: 'uppercase', 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                Termine &amp; Mitteilungen
              </span>
              {teacherSidebarTotalAlertsCount > 0 && (
                <span style={{
                  background: hasTeacherAppointmentAlerts ? '#f59e0b' : (activePlatform === 'campus' ? '#34a853' : '#facc15'),
                  color: activePlatform === 'campus' || hasTeacherAppointmentAlerts ? '#ffffff' : '#000000',
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  padding: '2px 7px',
                  borderRadius: '100px',
                  flexShrink: 0
                }}>
                  {teacherSidebarTotalAlertsCount}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleToggleTeacherBriefingSidebar(true)}
              aria-label="Sidebar schließen"
              title="Sidebar schließen"
              style={{
                width: isTabletViewport ? '44px' : '32px',
                height: isTabletViewport ? '44px' : '32px',
                minWidth: isTabletViewport ? '44px' : '32px',
                minHeight: isTabletViewport ? '44px' : '32px',
                background: activePlatform === 'campus' ? 'rgba(52, 168, 83, 0.10)' : 'rgba(234, 179, 8, 0.12)',
                border: 'none',
                borderRadius: isTabletViewport ? '12px' : '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: activePlatform === 'campus' ? '#34a853' : '#ca8a04',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                touchAction: 'manipulation'
              }}
              className="hover-scale"
            >
              <ChevronRight size={18} color={activePlatform === 'campus' ? '#34a853' : '#ca8a04'} />
            </button>
          </div>
          
          {renderAbsenceCardWidget()}
          {renderEmergencyCallout(true)}
          {renderFeedWidget()}
        </aside>
      )}

      {/* Floating Quick Toolbox Drawer */}
      <TeacherQuickToolboxDrawer
        isOpen={isQuickToolboxOpen}
        onClose={() => setIsQuickToolboxOpen(false)}
        activePlatform={activePlatform}
      />
    </div>
  );
};
