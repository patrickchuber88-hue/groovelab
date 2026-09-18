import React, { Suspense, lazy } from 'react';
import { 
  Calendar, ChevronLeft, ChevronRight, X, Palmtree, CalendarX, 
  Users, Check, Sparkles, Activity, AlertTriangle, Zap,
  Clock, ShieldCheck, HelpCircle
} from 'lucide-react';
import { UpdateAnnouncementHero } from '../../common/UpdateAnnouncementHero';
import { MobileBriefingCarousel } from '../../ui/MobileBriefingCarousel';
import { TourStartButton } from '../../PremiumOnboardingTour';
import { BriefingNotesCard } from '../../notes/BriefingNotesCard';
import { BriefingToolboxCard } from '../../campus/BriefingToolboxCard';
import { TeacherMakeupRadarWidget } from '../TeacherMakeupRadarWidget';
import { formatAbsenceEndDate } from '../../../utils/teacherAbsenceHelper';
import { 
  cleanRoomName, 
  getSimulatedNow, 
  resolveStudentInstrument, 
  splitAndNormalizeStudents 
} from '../utils/teacherDashboardUtils';

const TeacherFeedWidget = lazy(() => import('../TeacherFeedWidget').then(m => ({ default: m.TeacherFeedWidget })));
const TeacherHausaufgabenWidget = lazy(() => import('../TeacherHausaufgabenWidget').then(m => ({ default: m.TeacherHausaufgabenWidget })));
const TeacherTagesplanWidget = lazy(() => import('../TeacherTagesplanWidget').then(m => ({ default: m.TeacherTagesplanWidget })));
const TeacherTagesplanRoomIssuesBanner = lazy(() => import('../TeacherTagesplanWidget').then(m => ({ default: m.TeacherTagesplanRoomIssuesBanner })));
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
              const today = new Date().toLocaleDateString('sv-SE');
              setAbsenceStartDate(today);
              setAbsenceUntilDate(today);
              setQuickAbsencePreset('today');
              setShowAbsenceModal(true);
            }
          }}
          onClick={() => {
            const today = new Date().toLocaleDateString('sv-SE');
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
              const today = new Date().toLocaleDateString('sv-SE');
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
    <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Hausaufgabenheft wird geladen...</div>}>
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
    </Suspense>
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

  const renderTagesplanRoomIssuesBanner = (isDesktop: boolean = true) => (
    <Suspense fallback={null}>
      <TeacherTagesplanRoomIssuesBanner
        isDesktop={isDesktop}
        relevantRoomIssuesToday={relevantRoomIssuesToday}
        teacherTodayRooms={teacherTodayRooms}
        handleResolveRoomIssueInTagesplan={handleResolveRoomIssueInTagesplan}
        getIssueRoomLabel={getIssueRoomLabel}
        teacher={teacher}
        userId={userId}
        rooms={rooms}
        handleUpdateIssueRoom={handleUpdateIssueRoomInTagesplan}
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
                          Hi, <span style={{ color: '#007aff' }}>{resolvedTeacherFullName}</span>!
                        </h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b', fontWeight: 600 }}>
                          Dein Tagesplan ist bereit.
                        </p>
                      </div>
                      <TourStartButton onClick={startTour} platformTheme={activePlatform === 'campus' ? 'campus' : 'groovelab'} />
                    </div>
                  </div>
                }
                kpisGrid={null}
                tagesplanWidget={isTourDemoScheduleActive ? renderTourDemoScheduleJSX() : renderTagesplanWidget()}
                absenceWidget={renderAbsenceCardWidget()}
                hausaufgabenWidget={renderHausaufgabenWidget()}
                mitteilungenWidget={renderFeedWidget()}
                customTabs={[
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
                        currentRoom={activeTimelineSlot?.room || activeTimelineSlot?.rooms?.name || teacherTodayRooms[0] || 'Raum 4'}
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
                    label: 'Werkzeuge',
                    icon: Zap,
                    content: <BriefingToolboxCard />
                  }
                ]}
              />
            ) : (
              /* Desktop Layout */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                {/* 2-Column Desktop Grid */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', width: '100%' }}>
                  {/* Left Column: Switcher + Content */}
                  <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                    {/* Switcher Bar */}
                    <div style={{
                      display: 'flex',
                      background: '#f1f5f9',
                      padding: '4px',
                      borderRadius: '14px',
                      gap: '4px',
                      width: 'fit-content'
                    }}>
                      <button
                        onClick={() => setLeftColumnTab('briefing')}
                        style={{
                          background: leftColumnTab === 'briefing' ? '#ffffff' : 'transparent',
                          color: leftColumnTab === 'briefing' ? '#0f172a' : '#64748b',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          boxShadow: leftColumnTab === 'briefing' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
                        }}
                      >
                        Hausaufgaben
                      </button>
                      <button
                        onClick={() => setLeftColumnTab('notes')}
                        style={{
                          background: leftColumnTab === 'notes' ? '#ffffff' : 'transparent',
                          color: leftColumnTab === 'notes' ? '#0f172a' : '#64748b',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          boxShadow: leftColumnTab === 'notes' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
                        }}
                      >
                        Notizen
                      </button>
                      <button
                        onClick={() => setLeftColumnTab('toolbox')}
                        style={{
                          background: leftColumnTab === 'toolbox' ? '#ffffff' : 'transparent',
                          color: leftColumnTab === 'toolbox' ? '#0f172a' : '#64748b',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          boxShadow: leftColumnTab === 'toolbox' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
                        }}
                      >
                        Tools
                      </button>
                    </div>

                    {leftColumnTab === 'briefing' ? (
                      renderHausaufgabenWidget()
                    ) : leftColumnTab === 'notes' ? (
                      <BriefingNotesCard
                        user={teacher}
                        schoolId={teacher?.school_id || schoolData?.id}
                        activeStudent={activeStudent}
                        allStudents={allStudents}
                        todayStudents={todayTagesplanStudents}
                        rooms={rooms}
                        currentRoom={activeTimelineSlot?.room || activeTimelineSlot?.rooms?.name || teacherTodayRooms[0] || 'Raum 4'}
                        teacherTodayRooms={teacherTodayRooms}
                        onOpenDrawer={() => setShowNotesDrawer(true)}
                        onOpenHomeworkModal={(stud) => {
                          setDocStudent(stud);
                        }}
                      />
                    ) : (
                      <BriefingToolboxCard />
                    )}
                  </div>

                  {/* Right Column: Tagesplan */}
                  <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                    {isTourDemoScheduleActive ? renderTourDemoScheduleJSX() : renderTagesplanWidget()}
                    {renderTagesplanRoomIssuesBanner(true)}
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
    </div>
  );
};
