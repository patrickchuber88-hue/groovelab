import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';

import { AvatarImage, resolveCampusStudentAvatar, resolveGrooveLabTeacherAvatar } from './common/AvatarImage';
import { usePremiumOnboardingTour, TourStep } from './PremiumOnboardingTour';
import { formatTeacherFullName } from '../utils/nameHelper';

// Header
import { TeacherDashboardHeader } from './teacher/TeacherDashboardHeader';

// Domain Hooks
import { useTeacherData } from './teacher/hooks/useTeacherData';
import { useTeacherTagesplan } from './teacher/hooks/useTeacherTagesplan';
import { useTeacherAbsence } from './teacher/hooks/useTeacherAbsence';
import { useTeacherStudents } from './teacher/hooks/useTeacherStudents';
import { useTeacherFeed } from './teacher/hooks/useTeacherFeed';
import { useTeacherLiveLab } from './teacher/hooks/useTeacherLiveLab';
import { useTeacherBookings } from './teacher/hooks/useTeacherBookings';
import { useTeacherStudentPrep } from './teacher/hooks/useTeacherStudentPrep';
import { useTeacherModalStates } from './teacher/hooks/useTeacherModalStates';

// Tabs & Modals
import { TeacherBriefingTab } from './teacher/tabs/TeacherBriefingTab';
import { TeacherCoachesTab } from './teacher/tabs/TeacherCoachesTab';
import { TeacherModalsHub } from './teacher/modals/TeacherModalsHub';

// Lazy Loaded Tabs
const TeacherLiveView = lazy(() => import('./teacher/TeacherLiveView').then(m => ({ default: m.TeacherLiveView })));
const TeacherBandWorkspace = lazy(() => import('./teacher/TeacherBandWorkspace').then(m => ({ default: m.TeacherBandWorkspace })));
const TeacherStudioBoardView = lazy(() => import('./teacher/TeacherStudioBoardView').then(m => ({ default: m.TeacherStudioBoardView })));
const TeacherStudentsView = lazy(() => import('./teacher/TeacherStudentsView').then(m => ({ default: m.TeacherStudentsView })));
const TeacherSettingsView = lazy(() => import('./teacher/TeacherSettingsView').then(m => ({ default: m.TeacherSettingsView })));
const AdminDashboard = lazy(() => import('./AdminDashboard').then(m => ({ default: m.AdminDashboard })));
// Pure utilities re-export for backwards compatibility
export * from './teacher/utils/teacherDashboardUtils';
import { cleanRoomName } from './teacher/utils/teacherDashboardUtils';
import { useSimulatedTime } from '../hooks/useSimulatedTime';
export interface TeacherDashboardProps {
  userId: string;
  initialTeacher?: any;
  onLogout?: () => void;
  locationMode?: 'lab' | 'home';
  onLocationModeChange?: (mode: 'lab' | 'home') => void;
  session?: any;
  onSessionChange?: (sess: any) => void;
  hideHeader?: boolean;
  hideSidebar?: boolean;
  viewMode?: 'admin' | 'student';
  initialTab?: 'briefing' | 'live' | 'bands' | 'students' | 'proposals' | 'coaches';
  onTabChange?: (tab: string) => void;
  onOpenBandProfile?: (band: any) => void;
  onFoundBand?: (form: any, mySlot: any) => void;
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
  onSidebarNotificationsChange?: (count: number) => void;
  activePlatform?: 'campus' | 'groovelab';
  onSwitchPlatform?: (newPlatform: 'campus' | 'groovelab') => void;
  wallSongs?: any[];
  rehearsalSuggestions?: any[];
}

export function TeacherDashboard({ 
  userId, 
  initialTeacher,
  onLogout, 
  locationMode = 'lab', 
  onLocationModeChange,
  session,
  onSessionChange,
  hideHeader = false,
  hideSidebar = false,
  viewMode = 'admin', 
  initialTab,
  onTabChange, 
  onOpenBandProfile, 
  onFoundBand,
  isSidebarCollapsed: propsIsSidebarCollapsed,
  setIsSidebarCollapsed: propsSetIsSidebarCollapsed,
  onSidebarNotificationsChange,
  activePlatform: propsActivePlatform,
  onSwitchPlatform,
  wallSongs: propsWallSongs,
  rehearsalSuggestions: propsRehearsalSuggestions
}: TeacherDashboardProps) {
  const activePlatform: 'campus' | 'groovelab' = (propsActivePlatform === 'groovelab' || (typeof window !== 'undefined' && localStorage.getItem('groovelab_active_platform') === 'groovelab')) ? 'groovelab' : 'campus';
  
  // Layout & Viewport state
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [containerWidth, setContainerWidth] = useState(1000);
  const isMobileDevice = windowWidth <= 768;

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
      const containerElem = document.querySelector('.live-lab-grid') || document.querySelector('.blueprint-viewport');
      if (containerElem) {
        setContainerWidth((containerElem as HTMLDivElement).offsetWidth || 1000);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const observerRef = useRef<ResizeObserver | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width || 1000);
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  const [localLastSeenCounts, setLocalLastSeenCounts] = useState<{ help: number; rehearsal: number; matching: number }>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('groovelab_last_seen_sidebar') : null;
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { help: 0, rehearsal: 0, matching: 0 };
  });

  const [localIsSidebarCollapsed, setLocalIsSidebarCollapsed] = useState(true);
  const isSidebarCollapsed = propsIsSidebarCollapsed !== undefined ? propsIsSidebarCollapsed : localIsSidebarCollapsed;
  const setIsSidebarCollapsed = propsSetIsSidebarCollapsed !== undefined ? propsSetIsSidebarCollapsed : setLocalIsSidebarCollapsed;

  const [activeTab, setActiveTabRaw] = useState<string>(() => {
    if (initialTab) return initialTab;
    const valid = ['briefing', 'live', 'bands', 'students', 'proposals', 'settings', 'coaches', 'studio'];
    const saved = typeof window !== 'undefined' ? (sessionStorage.getItem('campus_teacher_active_tab') || localStorage.getItem('campus_teacher_active_tab')) : null;
    if (saved && valid.includes(saved)) {
      if (saved === 'live' && !hideHeader && activePlatform === 'campus') return 'briefing';
      return saved;
    }
    return hideHeader ? 'live' : 'briefing';
  });

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabRaw(tab);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('campus_teacher_active_tab', tab);
      localStorage.setItem('campus_teacher_active_tab', tab);
    }
    // Only forward tab to outer parent router if it's not internal studio sub-view
    if (tab !== 'studio' && onTabChange) {
      onTabChange(tab);
    }
  }, [onTabChange]);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTabRaw(initialTab);
    }
  }, [initialTab]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // 1. Data Domain Hook
  const data = useTeacherData({
    userId,
    initialTeacher,
    session,
    activePlatform,
    viewMode,
    activeTab,
    hideHeader
  });

  // 2. Students Domain Hook
  const students = useTeacherStudents({
    userId,
    teacher: data.teacher,
    schoolData: data.schoolData,
    activePlatform,
    onRefresh: data.fetchData
  });

  // 3. Tagesplan Domain Hook
  const tagesplan = useTeacherTagesplan({
    userId,
    teacher: data.teacher,
    schoolData: data.schoolData,
    rooms: data.rooms,
    allStudents: students.allStudents,
    onRefresh: data.fetchData,
    onToast: showToast
  });

  // Global unified refresh handler (declared after students & tagesplan to prevent TDZ error)
  const handleTeacherRefresh = useCallback(async () => {
    await data.fetchData();
    if (students?.loadStudents) await students.loadStudents();
    if (tagesplan?.loadBriefingTimeline) await tagesplan.loadBriefingTimeline();
  }, [data.fetchData, students.loadStudents, tagesplan.loadBriefingTimeline]);

  // 🛡️ Realtime & Cross-Component Sync: Refresh briefing when bookings/schedules change
  useEffect(() => {
    const handleRefreshBookings = () => {
      handleTeacherRefresh();
    };
    window.addEventListener('refresh-bookings', handleRefreshBookings);
    return () => window.removeEventListener('refresh-bookings', handleRefreshBookings);
  }, [handleTeacherRefresh]);

  // 4. Absence Domain Hook
  const absence = useTeacherAbsence({
    userId,
    teacher: data.teacher,
    setTeacher: data.setTeacher,
    schoolData: data.schoolData,
    allStudents: students.allStudents,
    briefingData: tagesplan.briefingData,
    crisisNotifications: data.crisisNotifications,
    showRealNames: students.showRealNames,
    onRefresh: handleTeacherRefresh
  });

  // 5. Feed Domain Hook
  const feed = useTeacherFeed({
    userId,
    teacher: data.teacher,
    onRefresh: data.fetchData
  });

  // 6. LiveLab Domain Hook
  const livelab = useTeacherLiveLab({
    userId,
    teacher: data.teacher,
    selectedRoomId: data.selectedRoomId,
    stations: data.stations,
    setCoaches: data.setCoaches,
    setActiveSessions: data.setActiveSessions,
    session,
    activeSessions: data.activeSessions,
    onSessionChange,
    onLocationModeChange,
    fetchData: data.fetchData,
    unreadShouts: data.unreadShouts,
    setUnreadShouts: data.setUnreadShouts,
    setHelpRequests: data.setHelpRequests
  });

  // 7. Bookings & Schedule Changes Domain Hook
  const bookings = useTeacherBookings({
    userId,
    teacher: data.teacher,
    activePlatform,
    rooms: data.rooms,
    showRealNames: students.showRealNames,
    adminFeedbackRequests: feed.adminFeedbackRequests,
    adminFeedbackResponses: feed.adminFeedbackResponses,
    campusFeedAnnouncements: feed.campusFeedAnnouncements,
    classFeedPosts: feed.classFeedPosts,
    feedInteractions: feed.feedInteractions,
    activePlanningEvents: [],
    mySubmittedProgramPoints: [],
    isTeacherBriefingSidebarCollapsed: data.isTeacherBriefingSidebarCollapsed,
    onTabChange
  });

  const unreadHelpCount = Math.max(0, (data.helpRequests || []).length - localLastSeenCounts.help);
  const effectiveRehearsal = propsRehearsalSuggestions !== undefined ? propsRehearsalSuggestions : (livelab.rehearsalSuggestions || []);
  const effectiveWallSongs = propsWallSongs !== undefined ? propsWallSongs : (livelab.wallSongs || []);
  const unreadRehearsalCount = Math.max(0, effectiveRehearsal.length - localLastSeenCounts.rehearsal);
  const unreadMatchingCount = Math.max(0, effectiveWallSongs.length - localLastSeenCounts.matching);
  const sidebarNotificationsCount = unreadHelpCount + unreadRehearsalCount + unreadMatchingCount;

  useEffect(() => {
    if (!isSidebarCollapsed) {
      const currentCounts = {
        help: (data.helpRequests || []).length,
        rehearsal: effectiveRehearsal.length,
        matching: effectiveWallSongs.length
      };
      setLocalLastSeenCounts(currentCounts);
      if (typeof window !== 'undefined') {
        localStorage.setItem('groovelab_last_seen_sidebar', JSON.stringify(currentCounts));
      }
    }
  }, [isSidebarCollapsed, (data.helpRequests || []).length, effectiveRehearsal.length, effectiveWallSongs.length]);

  useEffect(() => {
    if (onSidebarNotificationsChange) {
      onSidebarNotificationsChange(sidebarNotificationsCount);
    }
  }, [sidebarNotificationsCount, onSidebarNotificationsChange]);

  // Guided Tour
  const tourSteps = useMemo<TourStep[]>(() => {
    switch(activeTab) {
      case 'briefing':
        return [
          { title: "Dein Briefing", description: "Hier findest du eine Übersicht über deinen Tag und alle wichtigen Kennzahlen.", selector: "tour-teacher-briefing" },
          { title: "Dein Tagesplan", description: "Hier siehst du deine anstehenden Unterrichtstermine für heute.", selector: "tour-teacher-schedule" }
        ];
      case 'live':
        return [
          { title: "Das Live Lab", description: "Hier siehst du den visuellen Raum und die Belegung der Stationen durch die Schüler.", selector: "tour-teacher-livelab" }
        ];
      case 'bands':
        return [
          { title: "Band-Verwaltung", description: "Hier kannst du neue Bands gründen, Mitglieder verwalten und euren Fortschritt verfolgen.", selector: "tour-teacher-bands" }
        ];
      default:
        return [];
    }
  }, [activeTab]);

  const { TourComponent, startTour } = usePremiumOnboardingTour({
    tourKey: `campus_groovelab_tour_completed_${activeTab}_${userId}`,
    steps: tourSteps,
    platformTheme: activePlatform === 'campus' ? 'campus' : 'groovelab'
  });

  // Auxiliary UI & Modal States Hook
  const modalStates = useTeacherModalStates();
  const {
    showStageToolbox,
    setShowStageToolbox,
    editingBand,
    setEditingBand,
    showCommandPalette,
    setShowCommandPalette,
    showNotesDrawer,
    setShowNotesDrawer,
    isFeedbackModalOpen,
    setIsFeedbackModalOpen,
    isHelpCenterOpen,
    setIsHelpCenterOpen,
    activeTeacherSettingsModal,
    setActiveTeacherSettingsModal,
    leftColumnTab,
    setLeftColumnTab,
    bypassAbsenceView,
    setBypassAbsenceView,
    dismissedBanners,
    setDismissedBanners
  } = modalStates;

  // 🏛️ Dynamic Date & Schedule Invariants
  const { now } = useSimulatedTime();

  // 🏛️ Student Prep & Lesson Compass Engine Hook
  const prep = useTeacherStudentPrep({
    activeTimelineSlot: tagesplan.activeTimelineSlot,
    timeline: tagesplan.briefingData?.timeline,
    isTodayHoliday: Boolean(bookings.isTodayHoliday),
    showRealNames: students.showRealNames,
    now
  });
  const {
    widgetState,
    currentTimeStr,
    isFreeDay,
    isWeekend,
    firstSlotStartStr,
    activeGroupStudents,
    activeStudent,
    dynamicPrepMirror,
    setDynamicPrepMirror,
    loadingPrepMirror,
    setLoadingPrepMirror,
    selectedGroupStudentId,
    setSelectedGroupStudentId
  } = prep;

  const resolvedTeacherFullName = useMemo(() => {
    if (!data.teacher) return 'Lehrkraft';
    return formatTeacherFullName(data.teacher) || 'Lehrkraft';
  }, [data.teacher]);

  const teacherBriefingAvatarSrc = useMemo(() => {
    if (activePlatform === 'groovelab') {
      return resolveGrooveLabTeacherAvatar(data.teacher);
    }
    return resolveCampusStudentAvatar({ 
      ...(data.teacher || {}), 
      role: 'teacher', 
      isTeacherContext: true,
      instrument: data.teacher?.instrument || 'Gitarre'
    });
  }, [activePlatform, data.teacher]);

  const handleToggleTeacherBriefingSidebar = useCallback((collapsed: boolean) => {
    data.setIsTeacherBriefingSidebarCollapsed(collapsed);
    localStorage.setItem('campus_teacher_briefing_sidebar_collapsed', String(collapsed));
  }, [data]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: hideHeader ? 'transparent' : '#f8fafc',
      color: '#0f172a',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      {/* Dashboard Top Header Navigation */}
      {!hideHeader && (
        <TeacherDashboardHeader
          activePlatform={activePlatform}
          schoolName={data.schoolData?.name}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showRealNames={students.showRealNames}
          toggleRealNames={students.toggleRealNames}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          teacher={data.teacher}
        />
      )}

      {/* Main Content Viewport */}
      <main style={{
        flex: 1,
        maxWidth: '1600px',
        width: '100%',
        margin: '0 auto',
        padding: '24px 24px 80px 24px',
        boxSizing: 'border-box'
      }}>
        {activeTab === 'briefing' ? (
          <TeacherBriefingTab
            userId={userId}
            teacher={data.teacher}
            schoolData={data.schoolData}
            activePlatform={activePlatform}
            isMobileDevice={isMobileDevice}
            windowWidth={windowWidth}
            isTeacherBriefingSidebarCollapsed={data.isTeacherBriefingSidebarCollapsed}
            handleToggleTeacherBriefingSidebar={handleToggleTeacherBriefingSidebar}
            hasTeacherAppointmentAlerts={bookings.hasTeacherAppointmentAlerts}
            hasTeacherFeedAlerts={bookings.hasTeacherFeedAlerts}
            teacherSidebarTotalAlertsCount={bookings.teacherSidebarTotalAlertsCount}
            briefingLoading={false}
            briefingData={tagesplan.briefingData}
            activePlanningEvents={[]}
            dismissedBanners={dismissedBanners}
            setDismissedBanners={setDismissedBanners}
            isTodayHoliday={bookings.isTodayHoliday}
            isTeacherCurrentlyAbsent={absence.activeAbsenceCancellations.length > 0}
            bypassAbsenceView={bypassAbsenceView}
            setBypassAbsenceView={setBypassAbsenceView}
            handleEndAbsence={absence.handleEndAbsence}
            submittingAbsence={absence.submittingAbsence}
            totalAbsenceCancellationsCount={absence.totalAbsenceCancellationsCount}
            unreadCancellationsCount={absence.unreadCancellationsCount}
            setShowAbsenceOverviewModal={absence.setShowAbsenceOverviewModal}
            setShowAbsenceModal={absence.setShowAbsenceModal}
            resolvedTeacherFullName={resolvedTeacherFullName}
            teacherBriefingAvatarSrc={teacherBriefingAvatarSrc}
            activeMakeupTokens={absence.activeMakeupTokens}
            showRealNames={students.showRealNames}
            toggleRealNames={students.toggleRealNames}
            setSelectedMakeupToken={absence.setSelectedMakeupToken}
            setSelectedMakeupSlot={absence.setSelectedMakeupSlot}
            setMakeupModalMode={absence.setMakeupModalMode}
            setIsMakeupModalOpen={absence.setIsMakeupModalOpen}
            activeChatOcc={tagesplan.activeChatOcc}
            setActiveChatOcc={tagesplan.setActiveChatOcc}
            docStudent={students.modalDocStudent}
            setDocStudent={students.setDocStudent}
            allStudents={students.allStudents}
            isAbsenceWidgetExpanded={false}
            setIsAbsenceWidgetExpanded={() => {}}
            absenceStartDate={absence.absenceStartDate}
            setAbsenceStartDate={absence.setAbsenceStartDate}
            absenceUntilDate={absence.absenceUntilDate}
            setAbsenceUntilDate={absence.setAbsenceUntilDate}
            setQuickAbsencePreset={absence.setQuickAbsencePreset}
            currentTimeStr={currentTimeStr}
            quickAudioStudent={tagesplan.quickAudioStudent}
            setQuickAudioStudent={tagesplan.setQuickAudioStudent}
            loadingPrepMirror={loadingPrepMirror}
            activeTimelineSlotRef={{ current: null }}
            relevantRoomIssuesToday={tagesplan.tagesplanRoomIssues}
            teacherTodayRooms={tagesplan.teacherTodayRooms}
            isFreeDay={isFreeDay}
            isWeekend={isWeekend}
            isTourDemoScheduleActive={false}
            urgentCancellations={absence.urgentCancellations}
            setIsUrgentModalOpen={absence.setIsUrgentModalOpen}
            handleResolveRoomIssueInTagesplan={tagesplan.handleResolveRoomIssueInTagesplan}
            handleUpdateIssueRoomInTagesplan={tagesplan.handleUpdateIssueRoomInTagesplan}
            leftColumnTab={leftColumnTab}
            setLeftColumnTab={setLeftColumnTab}
            onTabChange={setActiveTab}
            activeStudent={activeStudent}
            activeGroupStudents={activeGroupStudents}
            selectedGroupStudentId={selectedGroupStudentId}
            setSelectedGroupStudentId={setSelectedGroupStudentId}
            selectedStudentProfile={students.selectedStudentProfile}
            setSelectedStudentProfile={students.setSelectedStudentProfile}
            dynamicPrepMirror={dynamicPrepMirror}
            setDynamicPrepMirror={setDynamicPrepMirror}
            setLoadingPrepMirror={setLoadingPrepMirror}
            firstSlotStartStr={firstSlotStartStr}
            widgetState={widgetState}
            startTour={startTour}
            rooms={data.rooms}
            holidays={bookings.holidays}
            myBookings={bookings.myBookings}
            myChangedAppointments={bookings.myChangedAppointments}
            showAllChangedAppointments={bookings.showAllChangedAppointments}
            setShowAllChangedAppointments={bookings.setShowAllChangedAppointments}
            showAllBookings={bookings.showAllBookings}
            setShowAllBookings={bookings.setShowAllBookings}
            adminFeedbackRequests={feed.adminFeedbackRequests}
            adminFeedbackResponses={feed.adminFeedbackResponses}
            campusFeedAnnouncements={feed.campusFeedAnnouncements}
            feedInteractions={feed.feedInteractions}
            teacherFeedTab={feed.teacherFeedTab}
            setTeacherFeedTab={feed.setTeacherFeedTab}
            classFeedPosts={feed.classFeedPosts}
            classFeedInteractions={feed.classFeedInteractions}
            respondingToRequestId={feed.respondingToRequestId}
            setRespondingToRequestId={feed.setRespondingToRequestId}
            questionnaireAnswers={feed.questionnaireAnswers}
            setQuestionnaireAnswers={feed.setQuestionnaireAnswers}
            submittingFeedback={feed.submittingFeedback}
            adminFeedbackTab={feed.adminFeedbackTab}
            setAdminFeedbackTab={feed.setAdminFeedbackTab}
            planningEvents={[]}
            mySubmittedProgramPoints={[]}
            visibleChangedAppointments={bookings.visibleChangedAppointments}
            handleBookingClick={bookings.handleBookingClick}
            handleDeleteMyBooking={bookings.handleDeleteMyBooking}
            handleMarkRequestAsDone={feed.handleMarkRequestAsDone}
            handleReactToPost={feed.handleReactToPost}
            handleSubmitFeedbackResponse={feed.handleSubmitFeedbackResponse}
            getCountdownString={bookings.getCountdownString}
            setMyChangedAppointments={bookings.setMyChangedAppointments}
            todayTagesplanStudents={tagesplan.todayTagesplanStudents}
            activeTimelineSlot={tagesplan.activeTimelineSlot}
            setShowNotesDrawer={setShowNotesDrawer}
          />
        ) : activeTab === 'live' ? (
          <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Live Lab wird geladen...</div>}>
            <TeacherLiveView
              teacher={data.teacher}
              userId={userId}
              viewMode={viewMode}
              activePlatform={activePlatform}
              hideHeader={hideHeader}
              windowWidth={windowWidth}
              windowHeight={windowHeight}
              containerWidth={containerWidth}
              containerRef={containerRef}
              showRealNames={students.showRealNames}
              rooms={data.rooms}
              selectedRoomId={data.selectedRoomId}
              setSelectedRoomId={data.setSelectedRoomId}
              stations={data.stations} isSyncing={data.isSyncing}
              activeSessions={data.activeSessions}
              setActiveSessions={data.setActiveSessions}
              coaches={data.coaches}
              setSelectedCoachProfile={data.setSelectedCoachProfile}
              setSelectedStudentProfile={students.setSelectedStudentProfile}
              helpRequests={data.helpRequests}
              unreadShouts={data.unreadShouts}
              submissions={feed.submissions}
              allSubmissions={feed.allSubmissions}
              setShowAllSubmissions={feed.setShowAllSubmissions}
              wallSongs={propsWallSongs !== undefined ? propsWallSongs : livelab.wallSongs}
              rehearsalSuggestions={propsRehearsalSuggestions !== undefined ? propsRehearsalSuggestions : livelab.rehearsalSuggestions}
              openProposals={data.openProposals}
              zoomFactor={tagesplan.zoomFactor}
              handleZoomChange={tagesplan.handleZoomChange}
              isSidebarCollapsed={isSidebarCollapsed}
              setIsSidebarCollapsed={setIsSidebarCollapsed}
              sidebarNotificationsCount={sidebarNotificationsCount}
              setActiveTab={setActiveTab}
              onTabChange={onTabChange}
              onFoundBand={onFoundBand}
              showKioskView={livelab.showKioskView}
              setShowKioskView={livelab.setShowKioskView}
              showKioskPinSetup={livelab.showKioskPinSetup}
              setShowKioskPinSetup={livelab.setShowKioskPinSetup}
              kioskPinInput={livelab.kioskPinInput}
              setKioskPinInput={livelab.setKioskPinInput}
              targetKioskStation={livelab.targetKioskStation}
              setTargetKioskStation={livelab.setTargetKioskStation}
              checkingInStatus={livelab.checkingInStatus}
              setCheckingInStatus={livelab.setCheckingInStatus}
              geoErrorMsg={livelab.checkInErrorMsg}
              checkInErrorMsg={livelab.checkInErrorMsg}
              shakeLock={livelab.shakeLock}
              isUserCheckedIn={livelab.isUserCheckedIn}
              handleGeofenceCheck={livelab.handleLiveLabCheckIn}
              handleLiveLabCheckIn={livelab.handleLiveLabCheckIn}
              handleKioskStationSelect={livelab.handleKioskStationSelect}
              handleTeacherSelfCheckout={livelab.handleTeacherSelfCheckout}
              handleTeacherCheckout={livelab.handleTeacherCheckout}
              handleLogoutStudent={livelab.handleLogoutStudent}
              handleResolveHelp={livelab.handleResolveHelp}
              handleMarkAsRead={livelab.handleMarkAsRead}
              handleMarkAllAsRead={livelab.handleMarkAllAsRead}
              handleApproveSubmission={feed.handleApproveSubmission}
              handleRejectSubmission={feed.handleRejectSubmission}
              fetchData={data.fetchData}
              cleanRoomName={cleanRoomName}
              setToastMessage={setToastMessage}
            />
          </Suspense>
        ) : activeTab === 'proposals' ? (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Band-Projekte werden geladen...</div>}>
            <TeacherBandWorkspace
              allBands={data.allBands}
              openProposals={data.openProposals}
              windowWidth={windowWidth}
              isMobileDevice={isMobileDevice}
              userId={userId}
              onOpenBandProfile={onOpenBandProfile}
              setSelectedStudentProfile={students.setSelectedStudentProfile}
              setActiveTab={setActiveTab}
              activePlatform={activePlatform}
              isProposalsView={true}
            />
          </Suspense>
        ) : activeTab === 'studio' ? (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Aufgaben-Studio wird geladen...</div>}>
            <TeacherStudioBoardView
              teacher={data.teacher}
              allStudents={students.allStudents}
              todayStudents={tagesplan.todayTagesplanStudents}
              schoolData={data.schoolData}
              activePlatform={activePlatform}
              onClose={() => setActiveTab('briefing')}
            />
          </Suspense>
        ) : activeTab === 'students' ? (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Schülerverwaltung wird geladen...</div>}>
            <TeacherStudentsView
              allStudents={students.allStudents}
              teacher={data.teacher}
              activePlatform={activePlatform}
              windowWidth={windowWidth}
              activeSessions={data.activeSessions}
              studentSearch={students.studentSearch}
              setStudentSearch={students.setStudentSearch}
              studentLetter={students.studentLetter}
              setStudentLetter={(l) => students.setStudentLetter(l || 'ALL')}
              studentInstrumentFilter={students.studentInstrumentFilter}
              setStudentInstrumentFilter={students.setStudentInstrumentFilter}
              showRealNames={students.showRealNames}
              toggleRealNames={students.toggleRealNames}
              setShowInviteStudent={students.setShowInviteStudent}
              setEditingStudent={students.setEditingStudent}
              setSelectedStudentProfile={students.setSelectedStudentProfile}
              handleDeleteStudent={students.handleDeleteStudent}
              teachersManageStudents={students.teachersManageStudents}
              onOpenBandProfile={onOpenBandProfile}
              AvatarImage={AvatarImage}
            />
          </Suspense>
        ) : activeTab === 'coaches' ? (
          <TeacherCoachesTab coaches={data.coaches} activePlatform={activePlatform} />
        ) : activeTab === 'rooms' ? (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Räume werden geladen...</div>}>
            <AdminDashboard
              userId={userId}
              onLogout={onLogout || (() => {})}
              forceTab="rooms"
              activePlatform={activePlatform}
              hideHeader={true}
              onSwitchPlatform={onSwitchPlatform}
            />
          </Suspense>
        ) : activeTab === 'settings' ? (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Einstellungen werden geladen...</div>}>
            <TeacherSettingsView
              teacher={data.teacher}
              setTeacher={data.setTeacher}
              schoolData={data.schoolData}
              setSchoolData={data.setSchoolData}
              rooms={data.rooms}
              selectedRoomId={data.selectedRoomId}
              setSelectedRoomId={data.setSelectedRoomId}
              activeTeacherSettingsModal={activeTeacherSettingsModal}
              setActiveTeacherSettingsModal={setActiveTeacherSettingsModal}
              setIsFeedbackModalOpen={setIsFeedbackModalOpen}
              setIsHelpCenterOpen={setIsHelpCenterOpen}
              windowWidth={windowWidth}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Bands werden geladen...</div>}>
            <TeacherBandWorkspace
              allBands={data.allBands}
              openProposals={data.openProposals}
              windowWidth={windowWidth}
              isMobileDevice={isMobileDevice}
              userId={userId}
              onOpenBandProfile={onOpenBandProfile}
              setSelectedStudentProfile={students.setSelectedStudentProfile}
              setActiveTab={setActiveTab}
              activePlatform={activePlatform}
              isProposalsView={false}
            />
          </Suspense>
        )}
      </main>

      {/* Declarative Modals Hub */}
      <TeacherModalsHub
        userId={userId}
        teacher={data.teacher}
        schoolData={data.schoolData}
        activePlatform={activePlatform}
        isMobileDevice={isMobileDevice}
        windowWidth={windowWidth}
        teacherDunningStatus={data.teacherDunningStatus}
        rooms={data.rooms}
        allStudents={students.allStudents}
        setAllStudents={students.setAllStudents}
        todayTagesplanStudents={tagesplan.todayTagesplanStudents}
        activeSessions={data.activeSessions}
        teacherTodayRooms={tagesplan.teacherTodayRooms}
        activeTimelineSlot={tagesplan.activeTimelineSlot}
        fetchData={data.fetchData}
        onToast={showToast}
        toastMessage={toastMessage}
        setToastMessage={setToastMessage}
        showStageToolbox={showStageToolbox}
        setShowStageToolbox={setShowStageToolbox}
        selectedCoachProfile={data.selectedCoachProfile}
        setSelectedCoachProfile={data.setSelectedCoachProfile}
        selectedStudentProfile={students.selectedStudentProfile}
        setSelectedStudentProfile={students.setSelectedStudentProfile}
        deleteStudentModalData={students.deleteStudentModalData}
        setDeleteStudentModalData={students.setDeleteStudentModalData}
        modalDocStudent={students.modalDocStudent}
        setDocStudent={students.setDocStudent}
        setEditingBand={setEditingBand}
        quickAudioStudent={tagesplan.quickAudioStudent}
        setQuickAudioStudent={tagesplan.setQuickAudioStudent}
        showCommandPalette={showCommandPalette}
        setShowCommandPalette={setShowCommandPalette}
        showNotesDrawer={showNotesDrawer}
        setShowNotesDrawer={setShowNotesDrawer}
        isFeedbackModalOpen={isFeedbackModalOpen}
        setIsFeedbackModalOpen={setIsFeedbackModalOpen}
        isHelpCenterOpen={isHelpCenterOpen}
        setIsHelpCenterOpen={setIsHelpCenterOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTabChange={onTabChange}
        onLocationModeChange={onLocationModeChange}
        showInviteStudent={students.showInviteStudent}
        setShowInviteStudent={students.setShowInviteStudent}
        inviteFirstName={students.inviteFirstName}
        setInviteFirstName={students.setInviteFirstName}
        inviteLastName={students.inviteLastName}
        setInviteLastName={students.setInviteLastName}
        inviteEmail={students.inviteEmail}
        setInviteEmail={students.setInviteEmail}
        inviteLink={students.inviteLink}
        setInviteLink={students.setInviteLink}
        inviteSaving={students.inviteSaving}
        handleInviteStudent={students.handleInviteStudent}
        editingStudent={students.editingStudent}
        setEditingStudent={students.setEditingStudent}
        handleUpdateStudent={students.handleUpdateStudent}
        showAbsenceModal={absence.showAbsenceModal}
        setShowAbsenceModal={absence.setShowAbsenceModal}
        isTeacherCurrentlyAbsent={absence.activeAbsenceCancellations.length > 0}
        quickAbsencePreset={absence.quickAbsencePreset}
        setQuickAbsencePreset={absence.setQuickAbsencePreset}
        absenceStartDate={absence.absenceStartDate}
        setAbsenceStartDate={absence.setAbsenceStartDate}
        absenceUntilDate={absence.absenceUntilDate}
        setAbsenceUntilDate={absence.setAbsenceUntilDate}
        showCustomStart={absence.showCustomStart}
        setShowCustomStart={absence.setShowCustomStart}
        absenceHandlingOwner={absence.absenceHandlingOwner}
        setAbsenceHandlingOwner={absence.setAbsenceHandlingOwner}
        absenceOfficialNote={absence.absenceOfficialNote}
        setAbsenceOfficialNote={absence.setAbsenceOfficialNote}
        cancellationsCount={absence.cancellationsCount}
        submittingAbsence={absence.submittingAbsence}
        handleReportAbsence={absence.handleReportAbsence}
        handleEndAbsence={absence.handleEndAbsence}
        absenceNotifModal={absence.absenceNotifModal}
        setAbsenceNotifModal={absence.setAbsenceNotifModal}
        showRealNames={students.showRealNames}
        showAbsenceEndedModal={absence.showAbsenceEndedModal}
        setShowAbsenceEndedModal={absence.setShowAbsenceEndedModal}
        showAbsenceOverviewModal={absence.showAbsenceOverviewModal}
        setShowAbsenceOverviewModal={absence.setShowAbsenceOverviewModal}
        totalAbsenceCancellationsCount={absence.totalAbsenceCancellationsCount}
        readCancellationsCount={absence.readCancellationsCount}
        unreadCancellationsCount={absence.unreadCancellationsCount}
        groupedAbsenceCancellations={absence.groupedAbsenceCancellations}
        collapsedAbsenceDates={absence.collapsedAbsenceDates}
        toggleAbsenceDateCollapse={absence.toggleAbsenceDateCollapse}
        toggleAllAbsenceDates={absence.toggleAllAbsenceDates}
        areAllAbsenceDatesCollapsed={absence.areAllAbsenceDatesCollapsed}
        handleEmergencyShoutbox={() => {}}
        handleMarkStudentContacted={absence.handleMarkStudentContacted}
        isUrgentModalOpen={absence.isUrgentModalOpen}
        urgentCancellations={absence.urgentCancellations}
        setIsUrgentModalOpen={absence.setIsUrgentModalOpen}
        fetchUrgentCancellations={absence.fetchUrgentCancellations}
        handleUrgentSnooze={absence.handleUrgentSnooze}
        isMakeupModalOpen={absence.isMakeupModalOpen}
        makeupModalMode={absence.makeupModalMode}
        selectedMakeupSlot={absence.selectedMakeupSlot}
        selectedMakeupToken={absence.selectedMakeupToken}
        setIsMakeupModalOpen={absence.setIsMakeupModalOpen}
        setSelectedMakeupSlot={absence.setSelectedMakeupSlot}
        setSelectedMakeupToken={absence.setSelectedMakeupToken}
        fetchActiveMakeupTokens={absence.fetchActiveMakeupTokens}
        showAllSubmissions={feed.showAllSubmissions}
        setShowAllSubmissions={feed.setShowAllSubmissions}
        allSubmissions={feed.allSubmissions}
        handleApproveSubmission={feed.handleApproveSubmission}
        handleRejectSubmission={feed.handleRejectSubmission}
        activeChatOcc={tagesplan.activeChatOcc}
        setActiveChatOcc={tagesplan.setActiveChatOcc}
        openAnnouncementDetailModal={feed.openAnnouncementDetailModal}
        setOpenAnnouncementDetailModal={feed.setOpenAnnouncementDetailModal}
        questionnaireAnswers={feed.questionnaireAnswers}
        setQuestionnaireAnswers={feed.setQuestionnaireAnswers}
        submittingFeedback={feed.submittingFeedback}
        handleSubmitFeedbackResponse={feed.handleSubmitFeedbackResponse}
        handleMarkRequestAsDone={feed.handleMarkRequestAsDone}
        startTour={startTour}
        TourComponent={TourComponent}
      />
    </div>
  );
}
