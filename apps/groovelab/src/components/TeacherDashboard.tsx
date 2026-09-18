import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { 
  Users, Star, TrendingUp, Sparkles, BookOpen, MessageSquare, 
  Settings, LayoutDashboard, Radio, GraduationCap, Eye, EyeOff, Search 
} from 'lucide-react';

import { AvatarImage } from './common/AvatarImage';
import { CampusGroovelabBrand } from './CampusGroovelabBrand';
import { usePremiumOnboardingTour, TourStep } from './PremiumOnboardingTour';
import { formatTeacherFullName } from '../utils/nameHelper';
import { resolveCampusStudentAvatar, resolveGrooveLabTeacherAvatar } from './common/AvatarImage';

// Domain Hooks
import { useTeacherData } from './teacher/hooks/useTeacherData';
import { useTeacherTagesplan } from './teacher/hooks/useTeacherTagesplan';
import { useTeacherAbsence } from './teacher/hooks/useTeacherAbsence';
import { useTeacherStudents } from './teacher/hooks/useTeacherStudents';
import { useTeacherFeed } from './teacher/hooks/useTeacherFeed';
import { useTeacherLiveLab } from './teacher/hooks/useTeacherLiveLab';

// Tabs
import { TeacherBriefingTab } from './teacher/tabs/TeacherBriefingTab';
import { TeacherCoachesTab } from './teacher/tabs/TeacherCoachesTab';

// Modals Hub
import { TeacherModalsHub } from './teacher/modals/TeacherModalsHub';

// Lazy Loaded Tabs
const TeacherLiveView = lazy(() => import('./teacher/TeacherLiveView').then(m => ({ default: m.TeacherLiveView })));
const TeacherBandWorkspace = lazy(() => import('./teacher/TeacherBandWorkspace').then(m => ({ default: m.TeacherBandWorkspace })));
const TeacherStudioBoardView = lazy(() => import('./teacher/TeacherStudioBoardView').then(m => ({ default: m.TeacherStudioBoardView })));
const TeacherStudentsView = lazy(() => import('./teacher/TeacherStudentsView').then(m => ({ default: m.TeacherStudentsView })));
const TeacherSettingsView = lazy(() => import('./teacher/TeacherSettingsView').then(m => ({ default: m.TeacherSettingsView })));

// Pure utilities re-export for backwards compatibility
export * from './teacher/utils/teacherDashboardUtils';
import { cleanRoomName, getSimulatedNow } from './teacher/utils/teacherDashboardUtils';

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
  activePlatform: propsActivePlatform
}: TeacherDashboardProps) {
  const activePlatform: 'campus' | 'groovelab' = (propsActivePlatform === 'groovelab' || (typeof window !== 'undefined' && localStorage.getItem('groovelab_active_platform') === 'groovelab')) ? 'groovelab' : 'campus';
  
  // Layout & Viewport state
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isMobileDevice = windowWidth <= 768;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (onTabChange) onTabChange(tab);
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
    onRefresh: data.fetchData
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
    onSessionChange,
    onLocationModeChange,
    fetchData: data.fetchData
  });

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

  // Auxiliary UI states
  const [showStageToolbox, setShowStageToolbox] = useState<any>(null);
  const [editingBand, setEditingBand] = useState<any>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [activeTeacherSettingsModal, setActiveTeacherSettingsModal] = useState<any>(null);
  const [leftColumnTab, setLeftColumnTab] = useState<'briefing' | 'notes' | 'toolbox'>('briefing');
  const [bypassAbsenceView, setBypassAbsenceView] = useState(false);
  const [dismissedBanners, setDismissedBanners] = useState<Record<string, boolean>>({});
  const [selectedGroupStudentId, setSelectedGroupStudentId] = useState<string | null>(null);
  const [dynamicPrepMirror, setDynamicPrepMirror] = useState<any>(null);
  const [loadingPrepMirror, setLoadingPrepMirror] = useState(false);

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
        <header style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '12px 24px'
        }}>
          <div style={{
            maxWidth: '1600px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            {/* Logo & Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <CampusGroovelabBrand />
              <div style={{
                height: '24px',
                width: '1px',
                background: '#cbd5e1'
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: activePlatform === 'campus' ? '#e6f4ea' : '#fef9c3',
                  color: activePlatform === 'campus' ? '#34a853' : '#854d0e'
                }}>
                  {activePlatform === 'campus' ? 'Campus Lehrkraft' : 'GrooveLab Studio'}
                </span>
                {data.schoolData?.name && (
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                    {data.schoolData.name}
                  </span>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '16px',
              gap: '4px'
            }}>
              {[
                { id: 'briefing', label: 'Briefing', icon: LayoutDashboard },
                { id: 'live', label: 'Live Lab', icon: Radio },
                { id: 'students', label: 'Schüler', icon: Users },
                { id: 'bands', label: 'Bands', icon: Sparkles },
                { id: 'coaches', label: 'Kollegium', icon: GraduationCap },
                { id: 'settings', label: 'Einstellungen', icon: Settings }
              ].map(tab => {
                const isSelected = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      background: isSelected ? '#ffffff' : 'transparent',
                      color: isSelected ? '#0f172a' : '#64748b',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      fontWeight: isSelected ? 900 : 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={16} color={isSelected ? (activePlatform === 'campus' ? '#34a853' : '#ca8a04') : '#64748b'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Quick Actions & Privacy Eye */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => students.toggleRealNames()}
                title={students.showRealNames ? 'Datenschutz-Modus aktivieren (Vorname N.)' : 'Vollständige Schülernamen anzeigen'}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 800
                }}
              >
                {students.showRealNames ? <Eye size={16} color="#34a853" /> : <EyeOff size={16} color="#64748b" />}
                <span>{students.showRealNames ? 'Klartext' : 'Anonym'}</span>
              </button>

              <button
                onClick={() => setShowCommandPalette(true)}
                title="Spotlight Suche (⌘K)"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                <Search size={14} />
                <span>Suche...</span>
                <kbd style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '6px', fontSize: '0.7rem' }}>⌘K</kbd>
              </button>

              {data.teacher && (
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  border: '2px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <AvatarImage src={data.teacher.photo_url} user={{ ...data.teacher, isTeacherContext: true }} activePlatform={activePlatform} />
                </div>
              )}
            </div>
          </div>
        </header>
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
            hasTeacherAppointmentAlerts={false}
            hasTeacherFeedAlerts={false}
            teacherSidebarTotalAlertsCount={0}
            briefingLoading={false}
            briefingData={tagesplan.briefingData}
            activePlanningEvents={[]}
            dismissedBanners={dismissedBanners}
            setDismissedBanners={setDismissedBanners}
            isTodayHoliday={null}
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
            currentTimeStr={new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            quickAudioStudent={tagesplan.quickAudioStudent}
            setQuickAudioStudent={tagesplan.setQuickAudioStudent}
            loadingPrepMirror={loadingPrepMirror}
            activeTimelineSlotRef={{ current: null }}
            relevantRoomIssuesToday={tagesplan.tagesplanRoomIssues}
            teacherTodayRooms={tagesplan.teacherTodayRooms}
            isFreeDay={false}
            isWeekend={false}
            isTourDemoScheduleActive={false}
            urgentCancellations={absence.urgentCancellations}
            setIsUrgentModalOpen={absence.setIsUrgentModalOpen}
            handleResolveRoomIssueInTagesplan={tagesplan.handleResolveRoomIssueInTagesplan}
            handleUpdateIssueRoomInTagesplan={tagesplan.handleUpdateIssueRoomInTagesplan}
            leftColumnTab={leftColumnTab}
            setLeftColumnTab={setLeftColumnTab}
            onTabChange={onTabChange}
            activeStudent={null}
            activeGroupStudents={[]}
            selectedGroupStudentId={selectedGroupStudentId}
            setSelectedGroupStudentId={setSelectedGroupStudentId}
            selectedStudentProfile={students.selectedStudentProfile}
            setSelectedStudentProfile={students.setSelectedStudentProfile}
            dynamicPrepMirror={dynamicPrepMirror}
            setDynamicPrepMirror={setDynamicPrepMirror}
            setLoadingPrepMirror={setLoadingPrepMirror}
            firstSlotStartStr="14:00"
            widgetState={{}}
            startTour={startTour}
            rooms={data.rooms}
            holidays={[]}
            myBookings={[]}
            myChangedAppointments={[]}
            showAllChangedAppointments={false}
            setShowAllChangedAppointments={() => {}}
            showAllBookings={false}
            setShowAllBookings={() => {}}
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
            visibleChangedAppointments={[]}
            handleBookingClick={() => {}}
            handleDeleteMyBooking={async () => {}}
            handleMarkRequestAsDone={feed.handleMarkRequestAsDone}
            handleReactToPost={feed.handleReactToPost}
            handleSubmitFeedbackResponse={feed.handleSubmitFeedbackResponse}
            getCountdownString={() => ''}
            setMyChangedAppointments={() => {}}
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
              windowHeight={800}
              containerWidth={1200}
              containerRef={() => {}}
              showRealNames={students.showRealNames}
              rooms={data.rooms}
              selectedRoomId={data.selectedRoomId}
              setSelectedRoomId={data.setSelectedRoomId}
              stations={data.stations}
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
              wallSongs={livelab.wallSongs}
              rehearsalSuggestions={livelab.rehearsalSuggestions}
              openProposals={data.openProposals}
              zoomFactor={tagesplan.zoomFactor}
              handleZoomChange={tagesplan.handleZoomChange}
              isSidebarCollapsed={false}
              setIsSidebarCollapsed={() => {}}
              sidebarNotificationsCount={0}
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
              handleResolveHelp={() => {}}
              handleMarkAsRead={() => {}}
              handleMarkAllAsRead={() => {}}
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
