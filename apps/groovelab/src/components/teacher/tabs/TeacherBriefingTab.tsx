import React, { Suspense, lazy, useMemo, useState } from 'react';
import { 
  Calendar, ChevronLeft, ChevronRight, X, Palmtree, CalendarX, 
  Users, Check, Sparkles, Activity, AlertTriangle, Zap,
  Clock, ShieldCheck, HelpCircle, Timer, AlertCircle, Edit3, Sliders, Wrench
} from 'lucide-react';
import { UpdateAnnouncementHero } from '../../common/UpdateAnnouncementHero';
import { MobileBriefingCarousel } from '../../ui/MobileBriefingCarousel';
import { TourStartButton } from '../../PremiumOnboardingTour';
import { BriefingNotesCard } from '../../notes/BriefingNotesCard';
import { BriefingToolboxCard } from '../../campus/BriefingToolboxCard';
import { TeacherQuickToolboxDrawer } from '../TeacherQuickToolboxDrawer';
import { TeacherMakeupRadarWidget } from '../TeacherMakeupRadarWidget';
import { formatAbsenceEndDate } from '../../../utils/teacherAbsenceHelper';
import { 
  cleanRoomName, 
  getSimulatedNow, 
  resolveStudentInstrument, 
  splitAndNormalizeStudents 
} from '../utils/teacherDashboardUtils';

const TeacherFeedWidget = lazy(() => import('../TeacherFeedWidget').then(m => ({ default: m.TeacherFeedWidget })));
import { TeacherHausaufgabenWidget } from '../TeacherHausaufgabenWidget';
const TeacherTagesplanWidget = lazy(() => import('../TeacherTagesplanWidget').then(m => ({ default: m.TeacherTagesplanWidget })));
const TeacherTourDemoSchedule = lazy(() => import('../TeacherTagesplanWidget').then(m => ({ default: m.TeacherTourDemoSchedule })));

export interface TeacherBriefingTabProps {
  userId: string;
  teacher: any;
  schoolData: any;
  activePlatform: 'campus' | 'groovelab';
  isMobileDevice: boolean;
  windowWidth: number;
  isTeacherBriefingSidebarCollapsed: boolean;
  handleToggleTeacherBriefingSidebar: (collapsed: boolean) => void;
  hasTeacherAppointmentAlerts: boolean;
  hasTeacherFeedAlerts: boolean;
  teacherSidebarTotalAlertsCount: number;
  briefingLoading: boolean;
  briefingData: any;
  activePlanningEvents: any[];
  dismissedBanners: Record<string, boolean>;
  setDismissedBanners: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isTodayHoliday: any;
  isTeacherCurrentlyAbsent: boolean;
  bypassAbsenceView: boolean;
  setBypassAbsenceView: (val: boolean) => void;
  handleEndAbsence: () => Promise<void>;
  submittingAbsence: boolean;
  totalAbsenceCancellationsCount: number;
  unreadCancellationsCount: number;
  setShowAbsenceOverviewModal: (show: boolean) => void;
  setShowAbsenceModal: (show: boolean) => void;
  resolvedTeacherFullName: string;
  teacherBriefingAvatarSrc: string;
  activeMakeupTokens: any[];
  showRealNames: boolean;
  toggleRealNames: (val?: boolean) => void;
  setSelectedMakeupToken: (token: any) => void;
  setSelectedMakeupSlot: (slot: any) => void;
  setMakeupModalMode: (mode: any) => void;
  setIsMakeupModalOpen: (open: boolean) => void;
  activeChatOcc: any;
  setActiveChatOcc: (occ: any) => void;
  docStudent: any;
  setDocStudent: (student: any) => void;
  allStudents: any[];
  isAbsenceWidgetExpanded: boolean;
  setIsAbsenceWidgetExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  absenceStartDate: string;
  setAbsenceStartDate: (date: string) => void;
  absenceUntilDate: string;
  setAbsenceUntilDate: React.Dispatch<React.SetStateAction<string>>;
  setQuickAbsencePreset: (preset: any) => void;
  currentTimeStr: string;
  quickAudioStudent: any;
  setQuickAudioStudent: (student: any) => void;
  loadingPrepMirror: boolean;
  activeTimelineSlotRef: any;
  relevantRoomIssuesToday: any[];
  teacherTodayRooms: string[];
  isFreeDay: boolean;
  isWeekend: boolean;
  isTourDemoScheduleActive: boolean;
  urgentCancellations: any[];
  setIsUrgentModalOpen: (open: boolean) => void;
  handleResolveRoomIssueInTagesplan: (issueId: string) => Promise<void>;
  handleUpdateIssueRoomInTagesplan: (issueId: string, newRoom: string) => Promise<void>;
  leftColumnTab: 'briefing' | 'notes' | 'toolbox';
  setLeftColumnTab: (tab: 'briefing' | 'notes' | 'toolbox') => void;
  onTabChange?: (tab: string) => void;
  activeStudent: any;
  activeGroupStudents: any[];
  selectedGroupStudentId: string | null;
  setSelectedGroupStudentId: (id: string | null) => void;
  selectedStudentProfile: any;
  setSelectedStudentProfile: (prof: any) => void;
  dynamicPrepMirror: any;
  setDynamicPrepMirror: (val: any) => void;
  setLoadingPrepMirror: React.Dispatch<React.SetStateAction<boolean>>;
  firstSlotStartStr: string;
  widgetState: any;
  startTour: () => void;
  emergencyUnconfirmedAppointments?: any[];
  handleSendEmergencyCalloutPush?: (apt: any) => Promise<void>;
  handleEmergencyShoutbox?: (occ: any) => void;
  rooms: any[];
  holidays: any[];
  myBookings: any[];
  myChangedAppointments: any[];
  showAllChangedAppointments: boolean;
  setShowAllChangedAppointments: React.Dispatch<React.SetStateAction<boolean>>;
  showAllBookings: boolean;
  setShowAllBookings: React.Dispatch<React.SetStateAction<boolean>>;
  adminFeedbackRequests: any[];
  adminFeedbackResponses: any[];
  campusFeedAnnouncements: any[];
  feedInteractions: any[];
  teacherFeedTab: 'campus' | 'class';
  setTeacherFeedTab: (tab: 'campus' | 'class') => void;
  classFeedPosts: any[];
  classFeedInteractions: any[];
  respondingToRequestId: string | null;
  setRespondingToRequestId: React.Dispatch<React.SetStateAction<string | null>>;
  questionnaireAnswers: Record<string, string>;
  setQuestionnaireAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  submittingFeedback: boolean;
  adminFeedbackTab: 'open' | 'done';
  setAdminFeedbackTab: (tab: 'open' | 'done') => void;
  planningEvents: any[];
  mySubmittedProgramPoints: any[];
  visibleChangedAppointments: any[];
  handleBookingClick: (booking: any) => void;
  handleDeleteMyBooking: (id: string) => Promise<void>;
  handleMarkRequestAsDone: (id: string) => Promise<void>;
  handleReactToPost: (id: string, emoji: string, type?: 'campus' | 'class') => Promise<void>;
  handleSubmitFeedbackResponse: (id: string) => Promise<void>;
  getCountdownString: (date: any) => string;
  setMyChangedAppointments: (val: any) => void;
  todayTagesplanStudents: any[];
  activeTimelineSlot: any;
  setShowNotesDrawer: (val: boolean) => void;
  checkHasStudentQuestion?: (sId: string) => boolean;
  checkHasTodayAudio?: (sId: string) => boolean;
  getIssueRoomLabel?: (issue: any) => string;
  isStudentBirthdayToday?: (student: any) => boolean;
}

export const TeacherBriefingTab: React.FC<TeacherBriefingTabProps> = (props) => {
  const {
    userId,
    teacher,
    schoolData,
    activePlatform,
    isMobileDevice,
    windowWidth,
    isTeacherBriefingSidebarCollapsed,
    handleToggleTeacherBriefingSidebar,
    hasTeacherAppointmentAlerts,
    hasTeacherFeedAlerts,
    teacherSidebarTotalAlertsCount,
    briefingLoading,
    briefingData,
    activePlanningEvents,
    dismissedBanners,
    setDismissedBanners,
    isTodayHoliday,
    isTeacherCurrentlyAbsent,
    bypassAbsenceView,
    setBypassAbsenceView,
    handleEndAbsence,
    submittingAbsence,
    totalAbsenceCancellationsCount,
    unreadCancellationsCount,
    setShowAbsenceOverviewModal,
    setShowAbsenceModal,
    resolvedTeacherFullName,
    teacherBriefingAvatarSrc,
    activeMakeupTokens,
    showRealNames,
    toggleRealNames,
    setSelectedMakeupToken,
    setSelectedMakeupSlot,
    setMakeupModalMode,
    setIsMakeupModalOpen,
    activeChatOcc,
    setActiveChatOcc,
    docStudent,
    setDocStudent,
    allStudents,
    isAbsenceWidgetExpanded,
    setIsAbsenceWidgetExpanded,
    absenceStartDate,
    setAbsenceStartDate,
    absenceUntilDate,
    setAbsenceUntilDate,
    setQuickAbsencePreset,
    currentTimeStr,
    quickAudioStudent,
    setQuickAudioStudent,
    loadingPrepMirror,
    activeTimelineSlotRef,
    relevantRoomIssuesToday,
    teacherTodayRooms,
    isFreeDay,
    isWeekend,
    isTourDemoScheduleActive,
    urgentCancellations,
    setIsUrgentModalOpen,
    handleResolveRoomIssueInTagesplan,
    handleUpdateIssueRoomInTagesplan,
    leftColumnTab,
    setLeftColumnTab,
    onTabChange,
    activeStudent,
    activeGroupStudents,
    selectedGroupStudentId,
    setSelectedGroupStudentId,
    selectedStudentProfile,
    setSelectedStudentProfile,
    dynamicPrepMirror,
    setDynamicPrepMirror,
    setLoadingPrepMirror,
    firstSlotStartStr,
    widgetState,
    startTour,
    emergencyUnconfirmedAppointments = [],
    rooms,
    holidays,
    myBookings,
    myChangedAppointments,
    showAllChangedAppointments,
    setShowAllChangedAppointments,
    showAllBookings,
    setShowAllBookings,
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
    handleBookingClick,
    handleDeleteMyBooking,
    handleMarkRequestAsDone,
    handleReactToPost,
    handleSubmitFeedbackResponse,
    getCountdownString,
    setMyChangedAppointments,
    todayTagesplanStudents,
    activeTimelineSlot,
    setShowNotesDrawer,
    checkHasStudentQuestion = () => false,
    checkHasTodayAudio = () => false,
    getIssueRoomLabel = () => 'Raum',
    isStudentBirthdayToday = () => false
  } = props;

  const [isQuickToolboxOpen, setIsQuickToolboxOpen] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const isRestDay = isWeekend || isFreeDay;
  const effectiveLeftColumnTab = leftColumnTab;

  const resolvedAvatarSrc = useMemo(() => {
    if (avatarLoadError || !teacherBriefingAvatarSrc) {
      return activePlatform === 'groovelab' 
        ? '/avatar_ghost.jpg' 
        : '/avatars/gitarre_avatar_new.png';
    }
    return teacherBriefingAvatarSrc;
  }, [avatarLoadError, teacherBriefingAvatarSrc, activePlatform]);

  const { activeLessonsCount, totalActiveStudentsToday } = useMemo(() => {
    if (!briefingData?.timeline) return { activeLessonsCount: 0, totalActiveStudentsToday: 0 };
    
    // Group timeline items by timeSlot to get distinct teaching units (UE)
    const uniqueSlotsMap = new Map<string, any[]>();
    briefingData.timeline.forEach((s: any) => {
      if (
        (s.student || (s.students && s.students.length > 0) || s.isGroup) &&
        !s.is_room_booking &&
        !s.isRoomBooking &&
        s.status !== 'canceled_by_student' &&
        s.status !== 'teacher_ausfall' &&
        s.status !== 'cancelled' &&
        s.status !== 'canceled_by_teacher_ausfall' &&
        s.status !== 'rescheduled_away'
      ) {
        const timeKey = s.timeSlot || s.id;
        if (!uniqueSlotsMap.has(timeKey)) {
          uniqueSlotsMap.set(timeKey, []);
        }
        uniqueSlotsMap.get(timeKey)!.push(s);
      }
    });

    const ueCount = uniqueSlotsMap.size;
    let studentsCount = 0;
    uniqueSlotsMap.forEach((slots) => {
      const studentIds = new Set<string>();
      slots.forEach((slot: any) => {
        if (slot.students && Array.isArray(slot.students)) {
          slot.students.forEach((st: any) => {
            if (st.id) studentIds.add(st.id);
            else if (st.name) studentIds.add(st.name);
          });
        } else if (slot.student?.id) {
          studentIds.add(slot.student.id);
        } else if (slot.student?.name) {
          studentIds.add(slot.student.name);
        }
      });
      studentsCount += Math.max(1, studentIds.size);
    });

    return { activeLessonsCount: ueCount, totalActiveStudentsToday: studentsCount };
  }, [briefingData?.timeline]);

  const avgPracticeTime = useMemo(() => {
    if (!briefingData?.timeline) return { value: '0', unit: 'Min' };
    const activeTimelineStudents = briefingData.timeline.filter((s: any) => 
      (s.student || (s.students && s.students.length > 0) || s.isGroup) && 
      !s.is_room_booking &&
      !s.isRoomBooking &&
      s.status !== 'canceled_by_student' && 
      s.status !== 'teacher_ausfall' && 
      s.status !== 'cancelled' && 
      s.status !== 'canceled_by_teacher_ausfall' && 
      s.status !== 'rescheduled_away'
    );
    if (activeTimelineStudents.length === 0) return { value: '0', unit: 'Min' };
    const totalMins = activeTimelineStudents.reduce((acc: number, s: any) => {
      const studentObj = s.student || (s.students?.[0]);
      const focusMins = studentObj?.weekly_focus_minutes || studentObj?.total_focus_minutes || (studentObj?.streakFlame ? studentObj.streakFlame * 15 : 0);
      return acc + focusMins;
    }, 0);
    const avgMins = Math.round(totalMins / activeTimelineStudents.length);
    if (avgMins >= 60) {
      return { value: (avgMins / 60).toFixed(1), unit: 'Std' };
    }
    return { value: String(avgMins), unit: 'Min' };
  }, [briefingData?.timeline]);

  const workloadMinutes = useMemo(() => {
    if (!briefingData?.timeline) return 0;
    const countedTimeSlots = new Set<string>();
    let totalMins = 0;
    briefingData.timeline.forEach((s: any) => {
      if (
        (s.student || (s.students && s.students.length > 0) || s.isGroup) &&
        !s.is_room_booking &&
        !s.isRoomBooking &&
        s.status !== 'canceled_by_student' &&
        s.status !== 'teacher_ausfall' &&
        s.status !== 'cancelled' &&
        s.status !== 'canceled_by_teacher_ausfall' &&
        s.status !== 'rescheduled_away'
      ) {
        const timeKey = s.timeSlot || s.id;
        if (!countedTimeSlots.has(timeKey)) {
          countedTimeSlots.add(timeKey);
          totalMins += (s.duration || 30);
        }
      }
    });
    return totalMins;
  }, [briefingData?.timeline]);

  const workloadHours = Math.floor(workloadMinutes / 60);
  const workloadRemainingMinutes = workloadMinutes % 60;
  const workloadHoursStr = workloadRemainingMinutes > 0 
    ? `${workloadHours}h ${workloadRemainingMinutes}m` 
    : `${workloadHours}h`;

  const cancellationsCount = useMemo(() => {
    if (!briefingData?.timeline) return 0;
    return briefingData.timeline.filter((s: any) => 
      s.status === 'canceled_by_student' || 
      s.status === 'teacher_ausfall' || 
      s.status === 'cancelled' || 
      s.status === 'canceled_by_teacher_ausfall' ||
      s.status === 'rescheduled_away' ||
      s.isRescheduledPending
    ).length;
  }, [briefingData?.timeline]);

  const dynamicGreeting = useMemo(() => {
    const hours = parseInt((currentTimeStr || '13:00').split(':')[0], 10);
    let greeting = 'Guten Tag';
    if (hours >= 5 && hours < 11.5) {
      greeting = 'Guten Morgen';
    } else if (hours >= 11.5 && hours < 17.5) {
      greeting = 'Guten Tag';
    } else if (hours >= 17.5 && hours < 23) {
      greeting = 'Guten Abend';
    }
    return {
      greeting,
      subtitle: 'Hier ist deine Übersicht für einen produktiven Tag.'
    };
  }, [currentTimeStr]);

  const renderMobileKpis = () => {
    if (isTeacherCurrentlyAbsent && !bypassAbsenceView) return null;

    return (
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '8px', 
          width: '100%', 
          boxSizing: 'border-box' 
        }}
      >
        {/* KPI 1: UE heute */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          borderRadius: '16px',
          padding: '10px 8px',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
          minWidth: 0
        }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>UE</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{activeLessonsCount}</span>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {totalActiveStudentsToday} Sch.
          </span>
        </div>

        {/* KPI 2: Ø Übe-Zeit */}
        <div style={{
          background: 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
          borderRadius: '16px',
          padding: '10px 8px',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)',
          minWidth: 0
        }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ø Üben</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{avgPracticeTime.value}</span>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, opacity: 0.8 }}>{avgPracticeTime.unit}</span>
        </div>

        {/* KPI 3: Tages-Pensum */}
        <div style={{
          background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
          borderRadius: '16px',
          padding: '10px 8px',
          color: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(234, 179, 8, 0.25)',
          minWidth: 0
        }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pensum</span>
          <span style={{ fontSize: '1.15rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#0f172a' }}>{workloadHoursStr}</span>
          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0f172a', opacity: 0.85 }}>Heute</span>
        </div>

        {/* KPI 4: Ausfälle */}
        <div style={{
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          borderRadius: '16px',
          padding: '10px 8px',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
          minWidth: 0
        }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ausfälle</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{cancellationsCount}</span>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, opacity: 0.8 }}>Heute</span>
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
            background: 'linear-gradient(135deg, #ffffff 0%, #fff5f5 100%)',
            boxShadow: '0 4px 16px -2px rgba(239, 68, 68, 0.08)',
            border: '1.5px solid #fecaca',
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
              background: 'rgba(239, 68, 68, 0.1)',
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
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                Ausfall / Abwesenheit melden
              </h3>
              <p style={{ 
                margin: '1px 0 0 0', 
                fontSize: '0.73rem', 
                color: '#94a3b8', 
                fontWeight: 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                Termine absagen &amp; Verwaltung informieren
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
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
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
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
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
        background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)',
        border: '1.5px solid #fca5a5',
        borderRadius: '22px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 4px 20px rgba(239, 68, 68, 0.08)'
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
              border: '1px solid #fca5a5',
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
        background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
        border: '1.5px solid #fed7aa',
        borderRadius: compact ? '20px' : '28px',
        padding: compact ? '16px' : '22px 24px',
        boxShadow: '0 8px 30px -4px rgba(234, 88, 12, 0.12)',
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
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
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
                  border: '1px solid #fdba74',
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
      onOpenStudio={() => {
        if (onTabChange) onTabChange('studio');
      }}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
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
          activeChatOcc={activeChatOcc}
          setActiveChatOcc={setActiveChatOcc}
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
        showRealNames={showRealNames}
        onTabChange={onTabChange}
        setMyChangedAppointments={setMyChangedAppointments}
      />
    </Suspense>
  );

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'row', 
      flexWrap: 'wrap', 
      gap: isTeacherBriefingSidebarCollapsed ? '0px' : '10px', 
      alignItems: 'start', 
      width: '100%',
      position: 'relative'
    }} className="dashboard-main-grid">

      {/* Floating Right-Edge Toggle Button when Collapsed (Desktop only) */}
      {isTeacherBriefingSidebarCollapsed && !isMobileDevice && (() => {
        const isCampus = activePlatform === 'campus';
        const btnBg = isCampus ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)';
        const btnBorder = isCampus ? '1.5px solid #bbf7d0' : '1.5px solid #fde047';
        const btnColor = isCampus ? '#15803d' : '#854d0e';
        const btnShadow = isCampus ? '-4px 0 20px rgba(52, 168, 83, 0.2)' : '-4px 0 20px rgba(234, 179, 8, 0.25)';
        const badgeColor = hasTeacherAppointmentAlerts ? '#f59e0b' : (isCampus ? '#34a853' : '#eab308');

        return (
          <button
            onClick={() => handleToggleTeacherBriefingSidebar(false)}
            style={{
              position: 'fixed',
              right: '0px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 99,
              background: btnBg,
              border: btnBorder,
              borderRight: 'none',
              borderRadius: '16px 0 0 16px',
              padding: '14px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              boxShadow: btnShadow,
              color: btnColor,
              fontWeight: 900,
              fontSize: '0.7rem',
              transition: 'all 0.2s ease-in-out'
            }}
            className="hover-scale"
            title="Termine & Mitteilungen ausklappen"
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={18} color={btnColor} />
              {(hasTeacherAppointmentAlerts || hasTeacherFeedAlerts) && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: badgeColor,
                  border: '2px solid #ffffff',
                  boxShadow: `0 0 8px ${badgeColor}`,
                  animation: 'pulse 1.5s infinite'
                }} />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
              }}>
                <Calendar size={15} color={btnColor} />
              </div>
              
              {teacherSidebarTotalAlertsCount > 0 && (
                <span style={{
                  background: badgeColor,
                  color: isCampus || hasTeacherAppointmentAlerts ? '#ffffff' : '#000000',
                  fontSize: '0.65rem',
                  fontWeight: 950,
                  padding: '2px 6px',
                  borderRadius: '100px',
                  minWidth: '16px',
                  textAlign: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}>
                  {teacherSidebarTotalAlertsCount}
                </span>
              )}
            </div>

            <span style={{ 
              writingMode: 'vertical-rl', 
              textTransform: 'uppercase', 
              letterSpacing: '0.08em', 
              fontSize: '0.68rem',
              fontWeight: 900,
              color: btnColor,
              marginTop: '2px'
            }}>
              Termine &amp; Mitteilungen
            </span>
          </button>
        );
      })()}
      
      <div style={{ 
        flex: isTeacherBriefingSidebarCollapsed ? '1 1 100%' : '1 1 600px',
        minWidth: (windowWidth < 768 || isMobileDevice) ? '0px' : '320px',
        maxWidth: '100%',
        width: '100%',
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px',
        maxHeight: (windowWidth < 768 || isMobileDevice) ? 'none' : 'calc(100vh - 60px)',
        overflowY: (windowWidth < 768 || isMobileDevice) ? 'visible' : 'auto',
        paddingRight: (isTeacherBriefingSidebarCollapsed && !isMobileDevice) ? '56px' : ((windowWidth < 768 || isMobileDevice) ? '0px' : '10px'),
        paddingBottom: (windowWidth < 768 || isMobileDevice) ? '20px' : '80px',
        boxSizing: 'border-box',
        transition: 'padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1), flex 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {briefingLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Briefing wird geladen...</div>
        ) : briefingData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {renderEmergencyCallout(false)}
            <UpdateAnnouncementHero userId={userId} activePlatform={activePlatform} />

            {/* Planning Active Banners */}
            {activePlanningEvents.map(ev => {
              if (dismissedBanners[ev.id]) return null;
              return (
                <div
                  key={`planning-banner-${ev.id}`}
                  style={{
                    background: 'linear-gradient(to right, #ffedd5, #fffbeb)',
                    border: '1.5px solid #ffedd5',
                    borderRadius: '16px',
                    padding: '12px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 4px 20px rgba(234, 88, 12, 0.06)'
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
                        boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)',
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
                background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.1) 0%, rgba(255, 255, 255, 0.98) 100%)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(52, 168, 83, 0.18)',
                padding: '18px 24px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 8px 30px rgba(52, 168, 83, 0.04)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: 'rgba(52, 168, 83, 0.08)',
                  border: '1.5px solid rgba(52, 168, 83, 0.12)',
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
                background: 'rgba(255, 255, 255, 0.45)',
                backdropFilter: 'blur(24px)',
                borderRadius: '24px',
                padding: '32px',
                boxSizing: 'border-box'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
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
                      border: '1.5px solid #fca5a5',
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
                      background: 'transparent',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
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
                themeColor={activePlatform === 'campus' ? '#34a853' : '#eab308'}
                heroBanner={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%)',
                      backdropFilter: 'blur(24px)',
                      borderRadius: '24px',
                      padding: '18px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)'
                    }}>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                          Hi, <span style={{ color: '#2563eb' }}>{resolvedTeacherFullName}</span>!
                        </h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b', fontWeight: 600 }}>
                          {isWeekend ? 'Schönes Wochenende!' : ((isFreeDay && !isTourDemoScheduleActive) ? 'Heute hast du frei!' : 'Dein Tagesplan ist bereit.')}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          role="button"
                          aria-label="Toolbox öffnen"
                          tabIndex={0}
                          onClick={() => setIsQuickToolboxOpen(true)}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            border: activePlatform === 'campus' ? '1.5px solid #bbf7d0' : '1.5px solid #fef08a',
                            background: activePlatform === 'campus' ? '#f0fdf4' : '#fefce8',
                            color: activePlatform === 'campus' ? '#16a34a' : '#ca8a04',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                          }}
                          className="hover-scale"
                          title="Stimmgerät &amp; Metronom"
                        >
                          <Wrench size={18} />
                        </button>
                        <TourStartButton onClick={startTour} platformTheme={activePlatform === 'campus' ? 'campus' : 'groovelab'} />
                      </div>
                    </div>
                  </div>
                }
                kpisGrid={renderMobileKpis()}
                tagesplanWidget={isTourDemoScheduleActive ? renderTourDemoScheduleJSX() : renderTagesplanWidget()}
                absenceWidget={renderAbsenceCardWidget()}
                hausaufgabenWidget={renderHausaufgabenWidget()}
                mitteilungenWidget={renderFeedWidget()}
                additionalTabs={[
                  {
                    id: 'notes',
                    label: 'Notizen',
                    icon: Calendar,
                    content: (
                      <BriefingNotesCard
                        user={teacher}
                        schoolId={teacher?.school_id || schoolData?.id}
                        activeStudent={activeStudent}
                        allStudents={allStudents}
                        todayStudents={todayTagesplanStudents}
                        rooms={rooms}
                        currentRoom={activeTimelineSlot?.room || activeTimelineSlot?.rooms?.name || teacherTodayRooms[0] || ''}
                        teacherTodayRooms={teacherTodayRooms}
                        onOpenDrawer={() => setShowNotesDrawer(true)}
                        onOpenHomeworkModal={(stud) => {
                          setDocStudent(stud);
                        }}
                      />
                    )
                  },
                  {
                    id: 'toolbox',
                    label: 'Toolbox',
                    icon: Sliders,
                    content: <BriefingToolboxCard />
                  }
                ]}
              />
            ) : (
              /* Desktop Layout (1:1 Goldstandard Parity) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                {/* Gamified KPI Cards row (Desktop 1:1 Server Parity) */}
                {(!isTeacherCurrentlyAbsent || bypassAbsenceView) && (
                  <div id="tour-teacher-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>

                    {/* Card 1: Heutige Schüler */}
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white',
                      borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                      padding: '16px', boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Schüler Heute</span>
                        <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '10px' }}>
                          <Users size={14} color="white" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.6rem', fontWeight: 950, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{activeLessonsCount}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.9 }}>UE</span>
                        {totalActiveStudentsToday > activeLessonsCount && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, opacity: 0.85, marginLeft: '2px' }}>
                            ({totalActiveStudentsToday} Schüler)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card 2: Ø Übe-Zeit */}
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', color: 'white',
                      borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(52, 168, 83, 0.3)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                      padding: '16px', boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ø Übe-Zeit</span>
                        <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '10px' }}>
                          <Timer size={14} color="white" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                        <span style={{ fontSize: '1.6rem', fontWeight: 950, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{avgPracticeTime.value}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.9 }}>{avgPracticeTime.unit}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.75, marginLeft: '2px' }}>/ Woche</span>
                      </div>
                    </div>

                    {/* Card 3: Tages-Pensum */}
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)', color: '#0f172a',
                      borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(234, 179, 8, 0.35)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                      padding: '16px', boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 850, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tages-Pensum</span>
                        <div style={{ background: 'rgba(15, 23, 42, 0.12)', padding: '6px', borderRadius: '10px' }}>
                          <Clock size={14} color="#0f172a" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                        <span style={{ fontSize: '1.6rem', fontWeight: 950, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0f172a' }}>{workloadHoursStr}</span>
                      </div>
                    </div>

                    {/* Card 4: Ausfälle */}
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white',
                      borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.3)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                      padding: '16px', boxSizing: 'border-box',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }} className="hover-scale">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ausfälle</span>
                        <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '10px' }}>
                          <AlertCircle size={14} color="white" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                        <span style={{ fontSize: '1.6rem', fontWeight: 950, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{cancellationsCount}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.9 }}>Heute</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2-Column Desktop Grid */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', width: '100%' }}>
                  {/* Left Column: Hero Card + Switcher + Content */}
                  <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                    {/* Hero Card Banner */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%)',
                      backdropFilter: 'blur(24px) saturate(1.8)',
                      WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      borderRadius: '24px',
                      display: 'flex',
                      alignItems: 'stretch',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      width: '100%',
                      minHeight: '200px',
                      flex: '0 1 auto',
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: '190px',
                          height: '100%',
                          flexShrink: 0,
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          borderRight: '1px solid rgba(0, 0, 0, 0.05)'
                        }} className="hover-scale hero-avatar-container">
                          <img 
                            src={resolvedAvatarSrc} 
                            alt="" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={() => setAvatarLoadError(true)}
                          />
                        </div>
                        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flex: 1 }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#ffffff',
                            border: '1px solid rgba(0, 0, 0, 0.06)',
                            borderRadius: '100px',
                            padding: '4px 10px',
                            alignSelf: 'flex-start',
                            marginBottom: '6px',
                            flexShrink: 0
                          }}>
                            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34a853', animation: 'pulse 2s infinite' }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                              {currentTimeStr || '13:00'} UHR
                            </span>
                          </div>

                          <h3 style={{ margin: 0, fontSize: '28px', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.2 }}>
                            {isWeekend ? 'Schönes Wochenende,' : `${dynamicGreeting.greeting},`}{' '}
                            <span style={{ color: '#2563eb', fontWeight: 900, letterSpacing: '-0.01em', display: 'inline' }}>
                              {resolvedTeacherFullName}
                            </span>!
                          </h3>
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, lineHeight: 1.35, maxWidth: '420px' }}>
                            {isWeekend
                              ? 'Keine Termine heute – Zeit zum Durchatmen und Erholen.'
                              : ((isFreeDay && !isTourDemoScheduleActive) ? 'Heute hast du frei! Genieße deinen freien Tag.' : (isTourDemoScheduleActive ? 'Bereit für einen produktiven Tag? Hier ist deine Übersicht.' : dynamicGreeting.subtitle))
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Segmented Switcher for Left Column: Tages-Kompass, Notizen & Toolbox */}
                    <div 
                      role="tablist"
                      aria-label="Bereichsauswahl linke Spalte"
                      style={{
                        display: 'flex',
                        background: '#f1f5f9',
                        padding: '4px',
                        borderRadius: '14px',
                        gap: '4px',
                        width: '100%',
                        boxSizing: 'border-box'
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
                          padding: '7px 8px',
                          borderRadius: '10px',
                          border: effectiveLeftColumnTab === 'briefing' ? '1px solid #cbd5e1' : 'none',
                          background: effectiveLeftColumnTab === 'briefing' ? '#ffffff' : 'transparent',
                          color: effectiveLeftColumnTab === 'briefing' ? '#0f172a' : '#64748b',
                          fontWeight: effectiveLeftColumnTab === 'briefing' ? 850 : 600,
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          boxShadow: effectiveLeftColumnTab === 'briefing' ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px'
                        }}
                      >
                        <Sparkles size={13} color={effectiveLeftColumnTab === 'briefing' ? '#0f172a' : '#64748b'} />
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
                          padding: '7px 8px',
                          borderRadius: '10px',
                          border: effectiveLeftColumnTab === 'notes' ? '1px solid #cbd5e1' : 'none',
                          background: effectiveLeftColumnTab === 'notes' ? '#ffffff' : 'transparent',
                          color: effectiveLeftColumnTab === 'notes' ? '#0f172a' : '#64748b',
                          fontWeight: effectiveLeftColumnTab === 'notes' ? 850 : 600,
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          boxShadow: effectiveLeftColumnTab === 'notes' ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px'
                        }}
                      >
                        <Edit3 size={13} color={effectiveLeftColumnTab === 'notes' ? '#0f172a' : '#64748b'} />
                        <span>Notizen</span>
                      </button>

                      {/* 3. Toolbox */}
                      <button
                        type="button"
                        role="tab"
                        id="tab-toolbox"
                        aria-selected={effectiveLeftColumnTab === 'toolbox'}
                        aria-controls="tabpanel-toolbox"
                        onClick={() => setLeftColumnTab('toolbox')}
                        style={{
                          flex: 1,
                          padding: '7px 8px',
                          borderRadius: '10px',
                          border: effectiveLeftColumnTab === 'toolbox' ? '1px solid #cbd5e1' : 'none',
                          background: effectiveLeftColumnTab === 'toolbox' ? '#ffffff' : 'transparent',
                          color: effectiveLeftColumnTab === 'toolbox' ? '#0f172a' : '#64748b',
                          fontWeight: effectiveLeftColumnTab === 'toolbox' ? 850 : 600,
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          boxShadow: effectiveLeftColumnTab === 'toolbox' ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px'
                        }}
                      >
                        <Sliders size={13} color={effectiveLeftColumnTab === 'toolbox' ? '#0f172a' : '#64748b'} />
                        <span>Toolbox</span>
                      </button>
                    </div>

                    {effectiveLeftColumnTab === 'notes' ? (
                      <div role="tabpanel" id="tabpanel-notes" aria-labelledby="tab-notes" tabIndex={0} style={{ width: '100%' }}>
                        <BriefingNotesCard
                          user={teacher}
                          schoolId={teacher?.school_id || schoolData?.id}
                          activeStudent={activeStudent}
                          allStudents={allStudents}
                          todayStudents={todayTagesplanStudents}
                          rooms={rooms}
                          currentRoom={activeTimelineSlot?.room || activeTimelineSlot?.rooms?.name || teacherTodayRooms[0] || ''}
                          teacherTodayRooms={teacherTodayRooms}
                          onOpenDrawer={() => setShowNotesDrawer(true)}
                          onOpenHomeworkModal={(stud) => {
                            setDocStudent(stud);
                          }}
                        />
                      </div>
                    ) : effectiveLeftColumnTab === 'toolbox' ? (
                      <div role="tabpanel" id="tabpanel-toolbox" aria-labelledby="tab-toolbox" tabIndex={0} style={{ width: '100%' }}>
                        <BriefingToolboxCard />
                      </div>
                    ) : (
                      <div role="tabpanel" id="tabpanel-briefing" aria-labelledby="tab-briefing" tabIndex={0} style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        {renderHausaufgabenWidget()}
                      </div>
                    )}

                  </div>

                  {/* Right Column: Tagesplan */}
                  <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
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

      {/* Right Desktop Sidebar */}
      {!isMobileDevice && (
        <aside style={{
          maxWidth: isTeacherBriefingSidebarCollapsed ? '0px' : (windowWidth < 768 ? '100%' : '320px'),
          minWidth: isTeacherBriefingSidebarCollapsed ? '0px' : (windowWidth < 768 ? '0px' : '320px'),
          width: isTeacherBriefingSidebarCollapsed ? '0px' : '100%',
          opacity: isTeacherBriefingSidebarCollapsed ? 0 : 1,
          transform: isTeacherBriefingSidebarCollapsed ? 'translateX(20px)' : 'translateX(0)',
          pointerEvents: isTeacherBriefingSidebarCollapsed ? 'none' : 'auto',
          overflowY: isTeacherBriefingSidebarCollapsed ? 'hidden' : (windowWidth < 768 ? 'visible' : 'auto'),
          overflowX: 'hidden',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px',
          maxHeight: windowWidth < 768 ? 'none' : 'calc(100vh - 80px)',
          paddingRight: isTeacherBriefingSidebarCollapsed ? '0px' : (windowWidth < 768 ? '0' : '6px'),
          paddingBottom: isTeacherBriefingSidebarCollapsed ? '0px' : (windowWidth < 768 ? '20px' : '80px'),
          boxSizing: 'border-box',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }} className="briefing-right-sidebar">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: activePlatform === 'campus' ? '#e6f4ea' : '#fef9c3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={15} color={activePlatform === 'campus' ? '#34a853' : '#ca8a04'} />
              </div>
              <span style={{ fontWeight: 950, fontSize: '0.88rem', color: '#1e293b', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                Termine &amp; Mitteilungen
              </span>
              {teacherSidebarTotalAlertsCount > 0 && (
                <span style={{
                  background: hasTeacherAppointmentAlerts ? '#f59e0b' : (activePlatform === 'campus' ? '#34a853' : '#eab308'),
                  color: activePlatform === 'campus' || hasTeacherAppointmentAlerts ? '#ffffff' : '#000000',
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  padding: '2px 7px',
                  borderRadius: '100px'
                }}>
                  {teacherSidebarTotalAlertsCount}
                </span>
              )}
            </div>

            <button
              onClick={() => handleToggleTeacherBriefingSidebar(true)}
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
