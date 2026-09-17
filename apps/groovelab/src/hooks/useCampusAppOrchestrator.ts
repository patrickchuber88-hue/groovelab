import React, { useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useWindowSize } from 'react-use';
import { supabase } from '../lib/supabase';

// Sub-hooks
import { useCampusMaintenanceAndBroadcast } from './useCampusMaintenanceAndBroadcast';
import { useCampusCoreSessionState } from './useCampusCoreSessionState';
import { useCampusPwaAndSystemEvents } from './useCampusPwaAndSystemEvents';
import { useCampusAuthUserStorage } from './useCampusAuthUserStorage';
import { useCampusDeviceAndParentControls } from './useCampusDeviceAndParentControls';
import { usePrivacyShield } from './usePrivacyShield';
import { useCampusRepertoireAndSlotStates } from './useCampusRepertoireAndSlotStates';
import { useCampusNavigationAndWorkspaces } from './useCampusNavigationAndWorkspaces';
import { useCampusUserProfile } from './useCampusUserProfile';
import { useCampusGhostAndRoutingSession } from './useCampusGhostAndRoutingSession';
import { useCampusStaffBandSync } from './useCampusStaffBandSync';
import { useCampusBandGatewayNavigation } from './useCampusBandGatewayNavigation';
import { useCampusPracticeSearchAndPdfSuite } from './useCampusPracticeSearchAndPdfSuite';
import { useCampusMessagingState } from './useCampusMessagingState';
import { useCampusProfileInspector } from './useCampusProfileInspector';
import { useBandFormationActions } from './useBandFormationActions';
import { useCampusAnnouncementsAndMail } from './useCampusAnnouncementsAndMail';
import { useCampusPublicViewsAndAvatars } from './useCampusPublicViewsAndAvatars';
import { useCampusMessagingData } from './useCampusMessagingData';
import { useAuthSessionActions } from './useAuthSessionActions';
import { useCampusSessionLifecycle } from './useCampusSessionLifecycle';
import { useCampusDashboardDataLoader } from './useCampusDashboardDataLoader';
import { useCampusRealtimeSync } from './useCampusRealtimeSync';
import { useCampusChatActions } from './useCampusChatActions';
import { useBandRepertoireActions } from './useBandRepertoireActions';
import { useCampusSecurityGuards } from './useCampusSecurityGuards';
import { renderCampusStartupGates } from '../components/layout/CampusStartupGates';
import { useCampusDashboardMetrics } from './useCampusDashboardMetrics';

// Constants
import { BAND_AVATARS, CAMPUS_AVATARS, STUDENT_AVATARS, TEACHER_AVATARS } from '../constants/avatars';
import { APP_INSTRUMENT_ICONS, APP_INSTRUMENT_COLORS, brandColor } from '../constants/instruments';

// Layout & Modal Props
import { CampusSystemBannersOverlayProps } from '../components/layout/CampusSystemBannersOverlay';
import { CampusAppLayoutProps } from '../components/layout/CampusAppLayout';
import { CampusAppModalsHubProps } from '../components/layout/CampusAppModalsHub';

export interface CampusAppOrchestratorResult {
  startupGate: React.ReactElement | null;
  user: any;
  bannersOverlayProps: CampusSystemBannersOverlayProps;
  layoutProps: CampusAppLayoutProps;
  modalsHubProps: CampusAppModalsHubProps;
}

const showMissionsFeature = false;
const showEnsemblesFeature = false;

export function useCampusAppOrchestrator(): CampusAppOrchestratorResult {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 1. Maintenance & View Resolution
  const {
    maintenanceBypass,
    setMaintenanceBypass,
    maintenanceState,
    broadcastAnnouncement,
    currentView
  } = useCampusMaintenanceAndBroadcast({
    locationPathname: location.pathname,
    searchParams
  });

  // 2. Core Session & Identity
  const {
    isLocalhost,
    loggedInUserId,
    setLoggedInUserId,
    setLoggedInUserIdRaw,
    locationMode,
    setLocationMode,
    setLocationModeRaw,
    showDeletionPrompt,
    setShowDeletionPrompt,
    deletionPromptUserId,
    setDeletionPromptUserId,
    deletionPromptIsHome,
    setDeletionPromptIsHome,
    showAutoLockWarning,
    setShowAutoLockWarning,
    autoLockCountdown,
    setAutoLockCountdown,
    loading,
    setLoading,
    isOfflineMode,
    setIsOfflineMode,
    isSchoolPaused,
    setIsSchoolPaused,
    showSchoolOnboardingModal,
    setShowSchoolOnboardingModal,
    showAdminSecuritySuiteModal,
    setShowAdminSecuritySuiteModal,
    showQuarterlyAccessReportModal,
    setShowQuarterlyAccessReportModal,
    qrPathMatch
  } = useCampusCoreSessionState({
    locationSearch: location.search,
    locationPathname: location.pathname
  });

  // 3. PWA Lifecycle & System Events
  const {
    windowWidth,
    setWindowWidth,
    deferredPrompt,
    setDeferredPrompt,
    showInstallBanner,
    setShowInstallBanner,
    showInstallGuide,
    setShowInstallGuide,
    showPwaUpdateToast,
    setShowPwaUpdateToast
  } = useCampusPwaAndSystemEvents({
    isLocalhost,
    loggedInUserId
  });

  // 4. Authoritative User Storage
  const { user, setUser, setUserRaw } = useCampusAuthUserStorage();

  // 5. Device, Kiosk, Date Simulation & Parent Controls
  const {
    kioskDetails,
    setKioskDetails,
    loadingKiosk,
    setLoadingKiosk,
    kioskRoomIdParam,
    kioskSetupParam,
    kioskBootstrapping,
    setKioskBootstrapping,
    stationIdFromStorage,
    setStationIdFromStorage,
    simulatedDate,
    setSimulatedDate,
    showDateSimulation,
    setShowDateSimulation,
    campusStudentUiLevel,
    setCampusStudentUiLevel,
    parentUnlocked,
    setParentUnlocked,
    parentPermissionsVersion,
    setParentPermissionsVersion,
    isCampusUnlocked,
    setIsCampusUnlocked,
    showCampusPinPrompt,
    setShowCampusPinPrompt,
    showPrivacy,
    setShowPrivacy,
    showAgb,
    setShowAgb,
    showImpressum,
    setShowImpressum,
    showCancellation,
    setShowCancellation,
    showAccessibility,
    setShowAccessibility,
    showTrialInfoModal,
    setShowTrialInfoModal,
    isGlobalHelpCenterOpen,
    setIsGlobalHelpCenterOpen,
    renderLegalModals,
    isScreenLockedByInactivity,
    setIsScreenLockedByInactivity,
    effectiveInactivityTimeoutMs
  } = useCampusDeviceAndParentControls({
    searchParams,
    currentView,
    user,
    setUser,
    setLoggedInUserId
  });

  const { isShielded, dismissShield } = usePrivacyShield(false);

  // 6. Repertoire & Slot States
  const {
    userSongs,
    setUserSongs,
    userBands,
    setUserBands,
    allBands,
    setAllBands,
    wallSongs,
    setWallSongs,
    globalSongs,
    setGlobalSongs,
    plannedSlots,
    setPlannedSlots,
    globalPlannedSlots,
    setGlobalPlannedSlots,
    showMobileInfo,
    setShowMobileInfo
  } = useCampusRepertoireAndSlotStates();

  // 7. Navigation & Workspaces
  const {
    activePlatform,
    setActivePlatform,
    setActivePlatformRaw,
    activeWorkspace,
    setActiveWorkspace,
    activeStudentTab,
    setActiveStudentTab,
    setActiveStudentTabRaw,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    sidebarNotificationsCount,
    setSidebarNotificationsCount,
    isMusicStandMode,
    setIsMusicStandMode,
    toggleMusicStandMode,
    activeBandSubTab,
    setActiveBandSubTab
  } = useCampusNavigationAndWorkspaces({
    user,
    locationMode,
    onResetRecipient: () => setSelectedCampusRecipient?.(null)
  });

  // 8. User Profile & Teacher Stats
  const {
    session,
    setSession,
    setSessionRaw,
    totalPresenceMins,
    setTotalPresenceMins,
    showEditProfile,
    setShowEditProfile,
    editingProfile,
    setEditingProfile,
    handleUpdateProfile,
    campusTeacherStats,
    setCampusTeacherStats
  } = useCampusUserProfile({
    user,
    setUser,
    activeStudentTab,
    activePlatform
  });

  // 9. Ghost Support & Route Protection
  useCampusGhostAndRoutingSession({
    loading,
    loggedInUserId,
    location,
    navigate,
    setUserRaw,
    setLoggedInUserId,
    setActivePlatform,
    setActiveStudentTab
  });

  // 10. Staff Band Sync
  useCampusStaffBandSync({
    user,
    activePlatform,
    activeStudentTab,
    setAllBands,
    setUserBands
  });

  // 11. Band Gateway & Navigation
  const {
    selectedMatchingInsts,
    setSelectedMatchingInsts,
    selectedBandForProfile,
    setSelectedBandForProfile,
    selectedBandForGateway,
    setSelectedBandForGateway,
    expandedSongId,
    setExpandedSongId,
    showBandProfile,
    setShowBandProfile,
    bandProfileView,
    setBandProfileView
  } = useCampusBandGatewayNavigation();

  // 12. Practice Search & PDF Suite
  const {
    bandSearchText,
    setBandSearchText,
    bandSearchLetter,
    setBandSearchLetter,
    expandedMatchingSong,
    setExpandedMatchingSong,
    showQR,
    setShowQR,
    toastMessage,
    setToastMessage,
    activePdfFolderUrl,
    setActivePdfFolderUrl,
    activePdfSong,
    setActivePdfSong,
    showConfetti,
    setShowConfetti,
    selectedEqCat,
    setSelectedEqCat,
    practiceSearchQuery,
    setPracticeSearchQuery,
    practiceAlphaFilter,
    setPracticeAlphaFilter,
    practiceSearchType,
    setPracticeSearchType,
    activeStudentsCount,
    setActiveStudentsCount,
    personalRejections,
    teachers,
    setTeachers
  } = useCampusPracticeSearchAndPdfSuite();

  // 13. Messaging State
  const {
    studentMessages,
    setStudentMessages,
    studentMessagesLoading,
    setStudentMessagesLoading,
    selectedStudentMessage,
    setSelectedStudentMessage,
    studentMessagesFilter,
    setStudentMessagesFilter,
    deletedMessageIds,
    setDeletedMessageIds,
    campusMessages,
    setCampusMessages,
    campusMessagesLoading,
    setCampusMessagesLoading,
    campusUnreadCount,
    setCampusUnreadCount,
    selectedCampusRecipient,
    setSelectedCampusRecipient
  } = useCampusMessagingState({
    userId: user?.id
  });

  // 14. Profile Inspector
  const {
    selectedTeacher,
    setSelectedTeacher,
    selectedStudentProfile,
    setSelectedStudentProfile,
    openUserProfile
  } = useCampusProfileInspector();

  const fetchDashboardDataRef = useRef<(userId: string, isInitial?: boolean) => Promise<void> | void>(() => {});

  // 15. Band Formation Actions
  const {
    studentActivity,
    setStudentActivity,
    showBandNaming,
    setShowBandNaming,
    namingTarget,
    setNamingTarget,
    showBandConsent,
    setShowBandConsent,
    consentTarget,
    setConsentTarget,
    showEditBand,
    setShowEditBand,
    isJoiningVocal,
    setIsJoiningVocal,
    isJoiningGuest,
    setIsJoiningGuest,
    showTeacherVocalPicker,
    setShowTeacherVocalPicker,
    externalVocalists,
    setExternalVocalists,
    editingBand,
    setEditingBand,
    restoredBandId,
    suggestingSkill,
    setSuggestingSkill,
    exclusiveProposal,
    setExclusiveProposal,
    matchingLevelFilter,
    setMatchingLevelFilter,
    pendingFounding,
    setPendingFounding,
    showFoundingModal,
    setShowFoundingModal,
    foundingName,
    setFoundingName,
    foundingLanguage,
    setFoundingLanguage,
    selectedCoachId,
    setSelectedCoachId,
    lastAutoTriggeredFormId,
    setLastAutoTriggeredFormId,
    updateAutoTriggerId,
    ignoredFoundingIds,
    gatewayJustClosed,
    lastWriteTimeRef,
    dismissSuggestion
  } = useBandFormationActions({
    user,
    loading,
    userBands,
    userSongs,
    wallSongs,
    activeStudentTab,
    selectedBandForGateway,
    showBandProfile,
    fetchDashboardData: (uid, init) => fetchDashboardDataRef.current(uid, init)
  });

  // 16. Announcements & Mail
  const {
    annBandId,
    setAnnBandId,
    announcements,
    setAnnouncements,
    announcementTitle,
    setAnnouncementTitle,
    announcementMessage,
    setAnnouncementMessage,
    announcementTarget,
    setAnnouncementTarget,
    selectedTargetUserIds,
    setSelectedTargetUserIds,
    recipientSearchText,
    setRecipientSearchText,
    activeAnnouncement,
    setActiveAnnouncement,
    schoolUsers,
    setSchoolUsers,
    selectedMailMessage,
    setSelectedMailMessage,
    isMailComposing,
    setIsMailComposing
  } = useCampusAnnouncementsAndMail();

  // 17. Public Views & Avatar Suite
  const {
    selectedStudentForPreview,
    setSelectedStudentForPreview,
    customBandName,
    setCustomBandName,
    showAvatarPicker,
    setShowAvatarPicker,
    failedAvatarUrls,
    setFailedAvatarUrls,
    avatarPickerType,
    setAvatarPickerType,
    avatarInstrumentFilter,
    setAvatarInstrumentFilter,
    bandAvatarSizeFilter,
    setBandAvatarSizeFilter,
    isSharedView,
    setIsSharedView,
    publicPassUser,
    setPublicPassUser,
    loadingPublicPass,
    setLoadingPublicPass
  } = useCampusPublicViewsAndAvatars({
    searchParams,
    showBandProfile,
    bandProfileView,
    selectedBandForProfile,
    setSelectedBandForProfile,
    setShowBandProfile
  });

  const { width, height } = useWindowSize();
  const isMobile = width < 768;
  const isKioskMode = (stationIdFromStorage && stationIdFromStorage !== "skip") || (typeof window !== "undefined" ? !!localStorage.getItem("groovelab_kiosk_token") : false);

  // 18. Messaging Data Loader
  const {
    fetchPlanningData,
    toggleSlot,
    checkAnnouncements,
    fetchAnnouncements,
    fetchStudentMessagesBackground,
    fetchStudentMessages,
    fetchCampusMessages,
    debouncedFetchCampusMessages
  } = useCampusMessagingData({
    user,
    loggedInUserId,
    supabase,
    activeStudentTab,
    plannedSlots,
    setPlannedSlots,
    setGlobalPlannedSlots,
    setActiveAnnouncement,
    setAnnouncements,
    annBandId,
    setAnnBandId,
    userBands,
    setStudentMessages,
    setStudentMessagesLoading,
    setCampusMessages,
    setCampusUnreadCount,
    setCampusMessagesLoading
  });

  // Load student messages when viewing tab
  useEffect(() => {
    if (activeStudentTab === 'messages' && user?.role?.toLowerCase() === 'student') {
      fetchStudentMessages();
    }
  }, [activeStudentTab, userBands, user?.id]);

  // 19. Auth Session Actions
  const {
    handleLogout,
    handleLogin
  } = useAuthSessionActions({
    user,
    setUser,
    setUserRaw,
    session,
    setSession,
    loggedInUserId,
    setLoggedInUserId,
    setLoggedInUserIdRaw,
    supabase,
    activePlatform,
    setActivePlatform,
    setActiveWorkspace,
    setActiveStudentTab,
    stationIdFromStorage,
    setStationIdFromStorage,
    setIsCampusUnlocked,
    setShowDeletionPrompt,
    setDeletionPromptUserId,
    setDeletionPromptIsHome,
    isLocalhost
  });

  // 20. Session Lifecycle & Inactivity Auto-Lock
  const {
    fetchActiveStudentCount,
    fetchSession
  } = useCampusSessionLifecycle({
    user,
    session,
    setSession,
    loggedInUserId,
    activePlatform,
    setActivePlatform,
    setActivePlatformRaw,
    activeStudentTab,
    setActiveStudentTab,
    setActiveStudentTabRaw,
    locationMode,
    showAutoLockWarning,
    setShowAutoLockWarning,
    setAutoLockCountdown,
    setActiveStudentsCount,
    handleLogout,
    supabase
  });

  // 21. Main Dashboard Data Loader
  const {
    fetchDashboardData,
    handleLeaveBand
  } = useCampusDashboardDataLoader({
    user,
    setUser,
    setLoading,
    supabase,
    isLocalhost,
    setIsOfflineMode,
    locationMode,
    setLocationMode,
    activePlatform,
    setActivePlatform,
    isKioskMode,
    handleLogout,
    setActiveWorkspace,
    setActiveStudentTab,
    setIsSchoolPaused,
    setSession,
    fetchActiveStudentCount,
    setTeachers,
    setSchoolUsers,
    setActiveStudentsCount,
    setGlobalSongs,
    setTotalPresenceMins,
    setUserSongs,
    lastWriteTimeRef,
    setWallSongs,
    setUserBands,
    setAllBands,
    setStudentActivity,
    selectedBandForProfile,
    setSelectedBandForProfile,
    restoredBandId,
    showBandProfile,
    setShowConfetti,
    fetchPlanningData,
    checkAnnouncements,
    fetchAnnouncements,
    fetchStudentMessagesBackground,
    fetchCampusMessages
  });
  fetchDashboardDataRef.current = fetchDashboardData;

  // 22. Realtime Sync
  const { liveSessionMins } = useCampusRealtimeSync({
    user,
    setUser,
    session,
    setSession,
    loggedInUserId,
    setLoggedInUserId,
    supabase,
    activePlatform,
    setActivePlatform,
    activeStudentTab,
    setActiveStudentTab,
    isKioskMode,
    handleLogout,
    fetchDashboardData,
    fetchCampusMessages,
    setLoading
  });

  // 23. Chat Actions
  const {
    handleSendCampusMessage,
    handleMarkCampusMessagesAsRead,
    handleMarkCampusGroupAsRead,
    handleMarkCampusChannelAsRead,
    handleAcknowledgeStudentMessage,
    handleDeleteMessageForSelf,
    handleAcknowledgeAnnouncement,
    handlePostAnnouncement,
    handleDeleteAnnouncement,
    handleHelpRequest
  } = useCampusChatActions({
    user,
    session,
    loggedInUserId,
    supabase,
    setCampusMessages,
    setCampusUnreadCount,
    fetchCampusMessages,
    debouncedFetchCampusMessages,
    studentMessages,
    setStudentMessages,
    announcements,
    setAnnouncements,
    selectedStudentMessage,
    setSelectedStudentMessage,
    deletedMessageIds,
    setDeletedMessageIds,
    studentMessagesFilter,
    setActiveAnnouncement,
    announcementTitle,
    setAnnouncementTitle,
    announcementMessage,
    setAnnouncementMessage,
    announcementTarget,
    setAnnouncementTarget,
    selectedTargetUserIds,
    setSelectedTargetUserIds,
    setRecipientSearchText,
    annBandId,
    setAnnBandId,
    fetchAnnouncements,
    setLoading,
    setToastMessage
  });

  // 24. Band & Repertoire Actions
  const {
    updateProgress,
    handleFinalizeBandName,
    handleFoundBand,
    handleAcceptBand,
    handleCloseAnnouncement,
    handleRejectFounding,
    handleFinalizeFounding,
    handleDeleteSong,
    handleAddSongToRepertoire,
    handleSubmitForApproval,
    handleSuggestToBand,
    clearConfetti
  } = useBandRepertoireActions({
    user,
    loggedInUserId,
    supabase,
    globalSongs,
    userSongs,
    setUserSongs,
    pendingFounding,
    setPendingFounding,
    foundingName,
    setFoundingName,
    loading,
    setLoading,
    selectedCoachId,
    setSelectedCoachId,
    selectedBandForGateway,
    setSelectedBandForGateway,
    fetchDashboardData,
    setActiveStudentTab,
    setShowFoundingModal,
    setSuggestingSkill,
    ignoredFoundingIds,
    lastWriteTimeRef,
    exclusiveProposal,
    dismissSuggestion,
    showConfetti,
    setShowConfetti
  });

  // 25. Security Guards
  const {
    isGhostParam,
    ghostSchoolId,
    isMasterAdminSession,
    isMaintenanceLockoutActive,
    handleSwitchActiveRole
  } = useCampusSecurityGuards({
    user,
    setUser,
    activePlatform,
    setActivePlatform,
    setActiveWorkspace,
    setActiveStudentTab,
    maintenanceState,
    maintenanceBypass,
    isLocalhost,
    supabase
  });

  // 26. Startup Gates (Onboarding, Kiosk, Shared Views, Deletion Prompts)
  const startupGate = renderCampusStartupGates({
    location,
    searchParams,
    selectedBandForProfile,
    showBandProfile,
    user,
    bandProfileView,
    setBandProfileView,
    brandColor,
    width,
    APP_INSTRUMENT_COLORS,
    APP_INSTRUMENT_ICONS,
    setShowBandProfile,
    setEditingBand,
    setShowEditBand,
    setShowAvatarPicker,
    setAvatarPickerType,
    isSharedView,
    publicPassUser,
    loadingKiosk,
    kioskRoomIdParam,
    kioskSetupParam,
    kioskBootstrapping,
    qrPathMatch,
    navigate,
    handleLogin,
    loggedInUserId,
    isKioskMode,
    stationIdFromStorage,
    setShowPrivacy,
    setShowAgb,
    setShowImpressum,
    setShowAccessibility,
    renderLegalModals,
    showSchoolOnboardingModal,
    setShowSchoolOnboardingModal,
    showDeletionPrompt,
    deletionPromptUserId,
    deletionPromptIsHome,
    setShowDeletionPrompt,
    setDeletionPromptUserId,
    isMasterAdminSession,
    handleLogout,
    loading,
    supabase,
    setLoggedInUserId,
    setUser,
    setLoading,
    activeWorkspace,
    isGhostParam,
    handleSwitchActiveRole,
    activePlatform,
    isSchoolPaused,
  });

  // 27. Dashboard Metrics
  const {
    practiceSongs,
    groupedPracticeSongs,
    groupedRepertoireSongs,
    school,
    trialDaysLeft,
    handleInstallPWA,
    handleDismissInstall
  } = useCampusDashboardMetrics({
    user,
    loggedInUserId,
    userSongs,
    wallSongs,
    userBands,
    totalPresenceMins,
    liveSessionMins,
    practiceSearchQuery,
    practiceSearchType,
    practiceAlphaFilter,
    globalPlannedSlots,
    deferredPrompt,
    setDeferredPrompt,
    setShowInstallBanner
  });

  // Prop Assemblies - Stabilized via useMemo (Pareto 80/20 Re-Render Protection)
  const bannersOverlayProps: CampusSystemBannersOverlayProps = useMemo(() => ({
    isGhostParam,
    user,
    handleSwitchActiveRole,
    isMaintenanceLockoutActive,
    maintenanceState,
    setMaintenanceBypass,
    school,
    activePlatform,
    broadcastAnnouncement,
    isShielded,
    dismissShield,
    trialDaysLeft,
    setShowTrialInfoModal,
    showPwaUpdateToast,
    setShowPwaUpdateToast
  }), [
    isGhostParam,
    user,
    handleSwitchActiveRole,
    isMaintenanceLockoutActive,
    maintenanceState,
    setMaintenanceBypass,
    school,
    activePlatform,
    broadcastAnnouncement,
    isShielded,
    dismissShield,
    trialDaysLeft,
    setShowTrialInfoModal,
    showPwaUpdateToast,
    setShowPwaUpdateToast
  ]);

  const layoutProps: CampusAppLayoutProps = useMemo(() => ({
    toastMessage,
    setToastMessage,
    showInstallBanner,
    setShowInstallBanner,
    showInstallGuide,
    setShowInstallGuide,
    deferredPrompt,
    handleInstallPWA,
    handleDismissInstall,
    user,
    setUser,
    school,
    activePlatform,
    setActivePlatform,
    activeStudentTab,
    setActiveStudentTab,
    activeWorkspace,
    teachers,
    session,
    setSession,
    windowWidth,
    campusStudentUiLevel,
    parentUnlocked,
    setParentUnlocked,
    campusUnreadCount,
    studentMessages,
    showMissionsFeature,
    isMusicStandMode,
    toggleMusicStandMode,
    handleLogout,
    supabase,
    setParentPermissionsVersion,
    locationMode,
    setLocationMode,
    isKioskMode,
    isCampusUnlocked,
    setShowCampusPinPrompt,
    showEnsemblesFeature,
    setShowMobileInfo,
    isOfflineMode,
    trialDaysLeft,
    setShowTrialInfoModal,
    activeStudentsCount,
    showDateSimulation,
    simulatedDate,
    setSimulatedDate,
    handleSwitchActiveRole,
    handleHelpRequest,
    setShowQR,
    setShowPrivacy,
    setShowAgb,
    setShowCancellation,
    setShowImpressum,
    setShowAccessibility,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setSidebarNotificationsCount,
    setSuggestingSkill,
    foundingName,
    setFoundingName,
    foundingLanguage,
    campusTeacherStats,
    userSongs,
    userBands,
    allBands,
    brandColor,
    fetchPlanningData,
    setAvatarPickerType,
    setShowAvatarPicker,
    setSelectedBandForProfile,
    setShowBandProfile,
    globalPlannedSlots,
    plannedSlots,
    toggleSlot,
    loggedInUserId: loggedInUserId || '',
    schoolUsers,
    campusMessages,
    announcements,
    selectedCampusRecipient,
    setSelectedCampusRecipient,
    handleSendCampusMessage,
    handleMarkCampusMessagesAsRead,
    handleMarkCampusGroupAsRead,
    handleMarkCampusChannelAsRead,
    setAnnouncementTitle,
    setAnnouncementMessage,
    setAnnouncementTarget,
    setSelectedTargetUserIds,
    handlePostAnnouncement,
    handleDeleteAnnouncement,
    handleAcknowledgeStudentMessage,
    practiceSongs,
    groupedPracticeSongs,
    groupedRepertoireSongs,
    practiceSearchQuery,
    setPracticeSearchQuery,
    practiceSearchType,
    setPracticeSearchType,
    practiceAlphaFilter,
    setPracticeAlphaFilter,
    expandedSongId,
    setExpandedSongId,
    updateProgress,
    handleSubmitForApproval,
    handleDeleteSong,
    setActivePdfSong,
    setActivePdfFolderUrl,
    isMobile,
    wallSongs,
    matchingLevelFilter,
    setMatchingLevelFilter,
    activeBandSubTab,
    setActiveBandSubTab,
    bandSearchText,
    setBandSearchText,
    bandSearchLetter,
    setBandSearchLetter,
    setSelectedStudentForPreview,
    fetchDashboardData,
    width,
    globalSongs,
    handleAddSongToRepertoire,
    setSelectedTeacher
  }), [
    toastMessage,
    setToastMessage,
    showInstallBanner,
    setShowInstallBanner,
    showInstallGuide,
    setShowInstallGuide,
    deferredPrompt,
    handleInstallPWA,
    handleDismissInstall,
    user,
    setUser,
    school,
    activePlatform,
    setActivePlatform,
    activeStudentTab,
    setActiveStudentTab,
    activeWorkspace,
    teachers,
    session,
    setSession,
    windowWidth,
    campusStudentUiLevel,
    parentUnlocked,
    setParentUnlocked,
    campusUnreadCount,
    studentMessages,
    isMusicStandMode,
    toggleMusicStandMode,
    handleLogout,
    supabase,
    setParentPermissionsVersion,
    locationMode,
    setLocationMode,
    isKioskMode,
    isCampusUnlocked,
    setShowCampusPinPrompt,
    setShowMobileInfo,
    isOfflineMode,
    trialDaysLeft,
    setShowTrialInfoModal,
    activeStudentsCount,
    showDateSimulation,
    simulatedDate,
    setSimulatedDate,
    handleSwitchActiveRole,
    handleHelpRequest,
    setShowQR,
    setShowPrivacy,
    setShowAgb,
    setShowCancellation,
    setShowImpressum,
    setShowAccessibility,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setSidebarNotificationsCount,
    setSuggestingSkill,
    foundingName,
    setFoundingName,
    foundingLanguage,
    campusTeacherStats,
    userSongs,
    userBands,
    allBands,
    brandColor,
    fetchPlanningData,
    setAvatarPickerType,
    setShowAvatarPicker,
    setSelectedBandForProfile,
    setShowBandProfile,
    globalPlannedSlots,
    plannedSlots,
    toggleSlot,
    loggedInUserId,
    schoolUsers,
    campusMessages,
    announcements,
    selectedCampusRecipient,
    setSelectedCampusRecipient,
    handleSendCampusMessage,
    handleMarkCampusMessagesAsRead,
    handleMarkCampusGroupAsRead,
    handleMarkCampusChannelAsRead,
    setAnnouncementTitle,
    setAnnouncementMessage,
    setAnnouncementTarget,
    setSelectedTargetUserIds,
    handlePostAnnouncement,
    handleDeleteAnnouncement,
    handleAcknowledgeStudentMessage,
    practiceSongs,
    groupedPracticeSongs,
    groupedRepertoireSongs,
    practiceSearchQuery,
    setPracticeSearchQuery,
    practiceSearchType,
    setPracticeSearchType,
    practiceAlphaFilter,
    setPracticeAlphaFilter,
    expandedSongId,
    setExpandedSongId,
    updateProgress,
    handleSubmitForApproval,
    handleDeleteSong,
    setActivePdfSong,
    setActivePdfFolderUrl,
    isMobile,
    wallSongs,
    matchingLevelFilter,
    setMatchingLevelFilter,
    activeBandSubTab,
    setActiveBandSubTab,
    bandSearchText,
    setBandSearchText,
    bandSearchLetter,
    setBandSearchLetter,
    setSelectedStudentForPreview,
    fetchDashboardData,
    width,
    globalSongs,
    handleAddSongToRepertoire,
    setSelectedTeacher
  ]);

  const modalsHubProps: CampusAppModalsHubProps = useMemo(() => ({
    user,
    setUser,
    school,
    schoolUsers,
    teachers,
    userBands,
    globalSongs,
    activePlatform,
    activeWorkspace,
    activeStudentTab,
    brandColor,
    width,
    height,
    supabase,
    locationMode,
    session,
    suggestingSkill,
    setSuggestingSkill,
    foundingName,
    setFoundingName,
    foundingLanguage,
    setFoundingLanguage,
    selectedCoachId,
    setSelectedCoachId,
    handleFoundBand,
    dismissSuggestion,
    handleSuggestToBand,
    fetchDashboardData,
    setActiveStudentTab,
    showQR,
    setShowQR,
    isGlobalHelpCenterOpen,
    setIsGlobalHelpCenterOpen,
    showTrialInfoModal,
    setShowTrialInfoModal,
    trialDaysLeft,
    handleSwitchActiveRole,
    showMobileInfo,
    setShowMobileInfo,
    showSchoolOnboardingModal,
    setShowSchoolOnboardingModal,
    renderLegalModals,
    selectedTeacher,
    setSelectedTeacher,
    selectedStudentProfile,
    setSelectedStudentProfile,
    showConfetti,
    clearConfetti,
    setActivePlatform,
    APP_INSTRUMENT_ICONS,
    APP_INSTRUMENT_COLORS,
    activeAnnouncement,
    handleAcknowledgeAnnouncement,
    showEditProfile,
    setShowEditProfile,
    editingProfile,
    setEditingProfile,
    handleUpdateProfile,
    selectedStudentForPreview,
    setSelectedStudentForPreview,
    showBandProfile,
    setShowBandProfile,
    selectedBandForProfile,
    setSelectedBandForProfile,
    bandProfileView,
    setBandProfileView,
    isSharedView,
    showEditBand,
    setShowEditBand,
    editingBand,
    setEditingBand,
    showAvatarPicker,
    setShowAvatarPicker,
    avatarPickerType,
    setAvatarPickerType,
    bandAvatarSizeFilter,
    setBandAvatarSizeFilter,
    avatarInstrumentFilter,
    setAvatarInstrumentFilter,
    BAND_AVATARS,
    STUDENT_AVATARS,
    TEACHER_AVATARS,
    CAMPUS_AVATARS,
    failedAvatarUrls,
    selectedBandForGateway,
    setSelectedBandForGateway,
    pendingFounding,
    setPendingFounding,
    gatewayJustClosed,
    showAdminSecuritySuiteModal,
    setShowAdminSecuritySuiteModal,
    showQuarterlyAccessReportModal,
    setShowQuarterlyAccessReportModal,
    isScreenLockedByInactivity,
    setIsScreenLockedByInactivity,
    setIsCampusUnlocked,
    handleLogout,
    showAutoLockWarning,
    setShowAutoLockWarning,
    autoLockCountdown,
    showCampusPinPrompt,
    setShowCampusPinPrompt
  }), [
    user,
    setUser,
    school,
    schoolUsers,
    teachers,
    userBands,
    globalSongs,
    activePlatform,
    activeWorkspace,
    activeStudentTab,
    brandColor,
    width,
    height,
    supabase,
    locationMode,
    session,
    suggestingSkill,
    setSuggestingSkill,
    foundingName,
    setFoundingName,
    foundingLanguage,
    setFoundingLanguage,
    selectedCoachId,
    setSelectedCoachId,
    handleFoundBand,
    dismissSuggestion,
    handleSuggestToBand,
    fetchDashboardData,
    setActiveStudentTab,
    showQR,
    setShowQR,
    isGlobalHelpCenterOpen,
    setIsGlobalHelpCenterOpen,
    showTrialInfoModal,
    setShowTrialInfoModal,
    trialDaysLeft,
    handleSwitchActiveRole,
    showMobileInfo,
    setShowMobileInfo,
    showSchoolOnboardingModal,
    setShowSchoolOnboardingModal,
    renderLegalModals,
    selectedTeacher,
    setSelectedTeacher,
    selectedStudentProfile,
    setSelectedStudentProfile,
    showConfetti,
    clearConfetti,
    setActivePlatform,
    activeAnnouncement,
    handleAcknowledgeAnnouncement,
    showEditProfile,
    setShowEditProfile,
    editingProfile,
    setEditingProfile,
    handleUpdateProfile,
    selectedStudentForPreview,
    setSelectedStudentForPreview,
    showBandProfile,
    setShowBandProfile,
    selectedBandForProfile,
    setSelectedBandForProfile,
    bandProfileView,
    setBandProfileView,
    isSharedView,
    showEditBand,
    setShowEditBand,
    editingBand,
    setEditingBand,
    showAvatarPicker,
    setShowAvatarPicker,
    avatarPickerType,
    setAvatarPickerType,
    bandAvatarSizeFilter,
    setBandAvatarSizeFilter,
    avatarInstrumentFilter,
    setAvatarInstrumentFilter,
    failedAvatarUrls,
    selectedBandForGateway,
    setSelectedBandForGateway,
    pendingFounding,
    setPendingFounding,
    gatewayJustClosed,
    showAdminSecuritySuiteModal,
    setShowAdminSecuritySuiteModal,
    showQuarterlyAccessReportModal,
    setShowQuarterlyAccessReportModal,
    isScreenLockedByInactivity,
    setIsScreenLockedByInactivity,
    setIsCampusUnlocked,
    handleLogout,
    showAutoLockWarning,
    setShowAutoLockWarning,
    autoLockCountdown,
    showCampusPinPrompt,
    setShowCampusPinPrompt
  ]);

  return {
    startupGate,
    user,
    bannersOverlayProps,
    layoutProps,
    modalsHubProps
  };
}
