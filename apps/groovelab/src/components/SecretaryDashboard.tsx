import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { supabase } from '../lib/supabase';
import { useRealNamesVisibility } from '../utils/nameHelper';
import { useMasterPricing } from '../context/MasterPricingContext';
import { usePremiumOnboardingTour, TourStep } from './PremiumOnboardingTour';

// Core Secretary Domain Hooks
import { useSecretarySettings } from './secretary/hooks/useSecretarySettings';
import { useSecretaryLicenses } from './secretary/hooks/useSecretaryLicenses';
import { useSecretaryBookings } from './secretary/hooks/useSecretaryBookings';
import { useSecretaryLiveLab } from './secretary/hooks/useSecretaryLiveLab';
import { useSecretaryNavigation } from './secretary/hooks/useSecretaryNavigation';
import { useSecretaryDashboardData } from './secretary/hooks/useSecretaryDashboardData';
import { useSecretaryExtendedSettings } from './secretary/hooks/useSecretaryExtendedSettings';
import { useSecretaryStorageQuota } from './secretary/hooks/useSecretaryStorageQuota';
import { useSecretaryOperatorBilling } from './secretary/hooks/useSecretaryOperatorBilling';
import { useSecretarySchedules } from './secretary/hooks/useSecretarySchedules';
import { useSecretaryStaff } from './secretary/hooks/useSecretaryStaff';
import { useSecretaryStudents } from './secretary/hooks/useSecretaryStudents';
import { useSecretaryCrisis } from './secretary/hooks/useSecretaryCrisis';
import { useSecretaryAnnouncements } from './secretary/hooks/useSecretaryAnnouncements';
import { useSecretaryEquipment } from './secretary/hooks/useSecretaryEquipment';
import { useSecretaryAudit } from './secretary/hooks/useSecretaryAudit';

// Refactored Modular Hooks (Coordinator De-cluttering)
import { useSecretaryModalStates } from './secretary/hooks/useSecretaryModalStates';
import { useSecretaryCampusViewStates } from './secretary/hooks/useSecretaryCampusViewStates';
import { useSecretaryTeacherProfiles } from './secretary/hooks/useSecretaryTeacherProfiles';

// Modular UI Components, Navigation Hubs & Styles
import { SecretarySidebar } from './secretary/SecretarySidebar';
import { SecretaryHeader } from './secretary/SecretaryHeader';
import { SecretaryModalsMasterHub } from './secretary/SecretaryModalsMasterHub';
import { SecretaryDashboardStyles } from './secretary/SecretaryDashboardStyles';
import { SecretaryTrialBlockedOverlay } from './secretary/modals/SecretaryTrialBlockedOverlay';
import { SecretaryRealtimeBookingToast } from './secretary/SecretaryRealtimeBookingToast';
import { SecretaryDeveloperResetButton } from './secretary/SecretaryDeveloperResetButton';
import { migrateRoomLocalStorageToSupabase } from './secretary/utils/migrateRoomLocalStorage';
import { generateStarterPin } from './secretary/utils/secretaryAuthUtils';
import { checkTimeOverlap, formatInstrumentName } from './secretary/utils/secretaryFormatters';

// Props Builders
import { buildSecretaryDashboardDataProps } from './secretary/hooks/buildSecretaryDashboardDataProps';
import { buildSecretaryVerwaltungProps } from './secretary/tabs/buildSecretaryVerwaltungProps';
import { buildSecretaryCampusProps } from './secretary/tabs/buildSecretaryCampusProps';
import { buildSecretaryGroovelabProps } from './secretary/tabs/buildSecretaryGroovelabProps';
import { buildSecretaryModalsMasterHubProps } from './secretary/buildSecretaryModalsMasterHubProps';

// Lazy Tabs
const SecretaryMobileNavigation = lazy(() => import('./secretary/SecretaryMobileNavigation').then(m => ({ default: m.SecretaryMobileNavigation })));
const SecretaryGroovelabTab = lazy(() => import('./secretary/tabs/SecretaryGroovelabTab').then(m => ({ default: m.SecretaryGroovelabTab })));
const SecretaryCampusTab = lazy(() => import('./secretary/tabs/SecretaryCampusTab').then(m => ({ default: m.SecretaryCampusTab })));
const SecretaryVerwaltungTab = lazy(() => import('./secretary/tabs/SecretaryVerwaltungTab').then(m => ({ default: m.SecretaryVerwaltungTab })));

interface SecretaryDashboardProps {
  schoolId: string;
  userId?: string;
  userRole?: string;
  userRoles?: string[];
  onLogout?: () => void;
  onRoleSwitched?: (newRole: string) => void;
  activePlatform?: string;
}

export function SecretaryDashboard({
  schoolId,
  userId,
  userRole,
  userRoles,
  onLogout,
  onRoleSwitched,
  activePlatform
}: SecretaryDashboardProps) {
  const { visible: showRealNames } = useRealNamesVisibility();

  // 1. Premium Tour & Numeric School ID
  const tourSteps: TourStep[] = useMemo(() => [
    {
      selector: 'tour-secretary-briefing',
      title: 'Willkommen in der Verwaltung',
      description: 'Dies ist die zentrale Übersicht für das Sekretariat. Hier laufen alle wichtigen Informationen aus dem Campus zusammen.'
    },
    {
      selector: 'tour-secretary-kpis',
      title: 'Tägliche KPIs',
      description: 'Auf einen Blick siehst du die aktuelle Raumauslastung, wie viele Schüler ihre Accounts aktiviert haben, ob es Terminkonflikte gibt und wie viele Lehrkräfte abwesend gemeldet sind.'
    },
    {
      selector: 'tour-secretary-bookings',
      title: 'Raumbuchungen Bestätigen',
      description: 'Lehrkräfte können vorläufige Raumbuchungen vornehmen. Diese landen hier in deiner Warteschlange (Queue) zur finalen Prüfung und Freigabe durch die Verwaltung.'
    }
  ], []);

  const { TourComponent, startTour } = usePremiumOnboardingTour({
    tourKey: `campus_secretary_tour_${userId}`,
    steps: tourSteps,
    platformTheme: 'admin'
  });

  const schoolNumericId = useMemo(() => {
    if (!schoolId || typeof schoolId !== 'string') return 1;
    if (schoolId === '74713df2-6176-4a41-a8cd-9fbebe34e9b8') return 1;
    let hash = 0;
    for (let i = 0; i < schoolId.length; i++) {
      hash = schoolId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 98) + 2;
  }, [schoolId]);

  // 2. Modals, Views, Permissions & Teacher Profiles (Modular Hooks)
  const modalStates = useSecretaryModalStates({ schoolId });
  const campusViewStates = useSecretaryCampusViewStates();
  const teacherProfiles = useSecretaryTeacherProfiles({ userId });

  const {
    showAgb, setShowAgb, showPrivacy, setShowPrivacy,
    showDpoIdCardModal, setShowDpoIdCardModal, showDpoPortalModal, setShowDpoPortalModal,
    showOwnQrModal, setShowOwnQrModal, qrModalUser, setQrModalUser,
    showGuidanceModal, setShowGuidanceModal, showParentInfoSheetModal, setShowParentInfoSheetModal,
    guidanceInitialTab, setGuidanceInitialTab, showDualRoleNotice, setShowDualRoleNotice,
    isAvvSigned, setIsAvvSigned, showAvvModal, setShowAvvModal,
    isFeedbackModalOpen, setIsFeedbackModalOpen, dismissedInvoiceAlert, setDismissedInvoiceAlert
  } = modalStates;

  const {
    enabledCampusSubjects, setEnabledCampusSubjects, enabledCampusRooms, setEnabledCampusRooms,
    enabledCampusEvents, setEnabledCampusEvents, enabledCampusSchedules, setEnabledCampusSchedules,
    enabledCalendarWidget, setEnabledCalendarWidget, enabledQrLogin, setEnabledQrLogin,
    teachersManageStudents, setTeachersManageStudents, teachersManageTeachers, setTeachersManageTeachers,
    campusTeachersManageStudents, setCampusTeachersManageStudents, campusTeachersManageTeachers, setCampusTeachersManageTeachers,
    schedulesRoomsViewMode, setSchedulesRoomsViewMode, roomsSubView, setRoomsSubView,
    liveViewDay, setLiveViewDay, showAdHocBooking, setShowAdHocBooking,
    adHocRoomId, setAdHocRoomId, adHocTeacherId, setAdHocTeacherId,
    adHocStudentName, setAdHocStudentName, adHocStartTime, setAdHocStartTime,
    adHocDuration, setAdHocDuration
  } = campusViewStates;

  const {
    currentUserProfile, setCurrentUserProfile, bypassTeachers, setBypassTeachers,
    coaches, setCoaches, campusTeachers, setCampusTeachers,
    allTeachers, setAllTeachers, allUniqueTeacherProfiles
  } = teacherProfiles;

  // 3. Billing & Navigation Engines
  const masterPricing = useMasterPricing();
  const {
    operatorCompany, operatorContact, operatorStreet, operatorZip, operatorCity,
    operatorIban, operatorBic, currentSchoolProfile, setCurrentSchoolProfile,
    effectiveSchoolRates, masterRates, setMasterRates
  } = useSecretaryOperatorBilling(masterPricing);

  const navigation = useSecretaryNavigation({ onLogout });
  const {
    activeTab, setActiveTab, secretarySubTab, setSecretarySubTab,
    campusSubTab, setCampusSubTab, groovelabSubTab, setGroovelabSubTab,
    mobileSecretaryDrawerOpen, setMobileSecretaryDrawerOpen,
    windowWidth, getTabTitle, handleSecretaryLogout
  } = navigation;

  const { getEffectiveStorageUsedBytes } = useSecretaryStorageQuota({
    currentSchoolProfile,
    setCurrentSchoolProfile,
    supabase
  });

  // 4. Core Domain Engines (Settings, Bookings, LiveLab)
  const settings = useSecretarySettings({
    schoolId: schoolId || '',
    userId: userId || '',
    currentUserProfile,
    currentSchoolProfile,
    setCurrentSchoolProfile,
    fetchDashboardData: () => fetchDashboardData()
  });
  const { schoolName, openingHours, schoolYearStartMonth, schoolYearStartDay } = settings;

  const bookings = useSecretaryBookings({ schoolId: schoolId || '', supabase });
  const { pendingBookings, showFacilityLogModal, setShowFacilityLogModal, handleResolveRoomIssue, handleReopenRoomIssue } = bookings;

  const liveLab = useSecretaryLiveLab({ schoolId: schoolId || '', userId, supabase });
  const { realtimeToast, setRealtimeToast } = liveLab;

  // 5. Shared Local Data States
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  const INSTRUMENT_TAGS = ['Schlagzeug', 'Piano', 'Gitarre', 'Gesang', 'Geige', 'Querflöte', 'Saxophon', 'Bass', 'Keyboard', 'Trompete'];
  const activeSubjectsList = useMemo(() => {
    const placeholders = new Set(['ohne zuweisung', 'ohnezuweisung', 'allgemein', 'nicht festgelegt', 'nichtfestgelegt', 'nicht zugeordnet', 'nichtzugeordnet', 'none', 'null', '']);
    const activeSubs = Array.from(new Set(
      subjects.filter((s: any) => s.is_active && s.name).map((s: any) => s.name.trim())
    )).filter(name => !placeholders.has(name.toLowerCase()));
    return activeSubs.length > 0 ? activeSubs : INSTRUMENT_TAGS;
  }, [subjects]);

  // 6. Licenses, Simulation Date & Extended Settings
  const licenses = useSecretaryLicenses({
    schoolId: schoolId || '',
    schoolNumericId: schoolNumericId || '',
    schoolName,
    currentSchoolProfile,
    setCurrentSchoolProfile,
    currentUserProfile,
    supabase,
    fetchDashboardData: () => fetchDashboardData(),
    masterPricing,
    effectiveSchoolRates,
    subjects,
    openingHours,
    schoolYearStartMonth,
    schoolYearStartDay
  });
  const {
    isSchoolTrial, schoolTrialEndsAt, subscriptionBypass, isTrialExpired,
    handleDeveloperReset, hasCampusSub, hasGroovelabSub, isBillingBooked,
    studentBillingOption, billingPayer, schoolStatus, trialDaysRemaining
  } = licenses;

  const [simulatedToday, setSimulatedToday] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('groovelab_simulated_date') || (schoolId ? localStorage.getItem(`simulatedToday_${schoolId}`) : '') || '';
      }
    } catch {}
    return '';
  });

  useEffect(() => {
    const handleSimDateSync = () => {
      try {
        const sim = localStorage.getItem('groovelab_simulated_date') || (schoolId ? localStorage.getItem(`simulatedToday_${schoolId}`) : '') || '';
        setSimulatedToday(sim);
      } catch {}
    };
    window.addEventListener('storage', handleSimDateSync);
    window.addEventListener('groovelab_simulated_date_changed', handleSimDateSync);
    return () => {
      window.removeEventListener('storage', handleSimDateSync);
      window.removeEventListener('groovelab_simulated_date_changed', handleSimDateSync);
    };
  }, [schoolId]);

  const staffRef = useRef<any>(null);
  const extendedSettings = useSecretaryExtendedSettings({
    schoolId: schoolId || '',
    currentSchoolProfile,
    isSchoolTrial,
    schoolTrialEndsAt,
    subscriptionBypass,
    simulatedToday,
    fetchDashboardData: () => fetchDashboardData(),
    setManageTeacher: (teacher: any) => staffRef.current?.setManageTeacher(teacher)
  });
  const { dunningStatus, showDateSimulation, assertSecretaryWriteAccess, setShowDunningPayModal } = extendedSettings;

  // 7. Staff, Students, Schedules, Equipment, Crisis, Announcements & Audit
  const staff = useSecretaryStaff({
    schoolId,
    userId: userId || '',
    schoolName,
    currentSchoolProfile,
    currentUserProfile,
    setCurrentUserProfile,
    userRoles,
    isAvvSigned,
    setShowAvvModal,
    activeSubjectsList,
    fetchDashboardData: () => fetchDashboardData(),
    assertSecretaryWriteAccess
  });
  staffRef.current = staff;
  const { isCurrentUserTeacher } = staff;

  const studentsHook = useSecretaryStudents({
    schoolId,
    allTeachers,
    campusTeachers,
    bypassTeachers,
    coaches,
    hasCampusSub,
    hasGroovelabSub,
    isBillingBooked,
    studentBillingOption,
    billingPayer,
    fetchDashboardData: () => fetchDashboardData(),
    assertSecretaryWriteAccess
  });

  const schedules = useSecretarySchedules({
    schoolId,
    userId,
    rooms,
    setRooms,
    openingHours,
    campusTeachers,
    bypassTeachers,
    coaches,
    fetchDashboardData: () => fetchDashboardData()
  });
  const { pendingSchedules, matrixAllocations, approvalToast, showUnassignedWarning, setShowUnassignedWarning } = schedules;

  const equipment = useSecretaryEquipment({ schoolId, rooms, setRooms });
  const audit = useSecretaryAudit({ schoolId, activeTab, secretarySubTab, userMap });
  const crisis = useSecretaryCrisis({ schoolId, onRefreshDashboard: () => fetchDashboardData() });
  const { crisisNotifications } = crisis;

  const announcements = useSecretaryAnnouncements({
    schoolId,
    currentUserProfile,
    campusTeachers,
    bypassTeachers,
    coaches,
    setApprovalToast: schedules.setApprovalToast
  });

  // 8. Master Dashboard Data Orchestration Engine
  const dashboardData = useSecretaryDashboardData(buildSecretaryDashboardDataProps({
    schoolId: schoolId || '',
    userId: userId || '',
    userRole,
    userRoles,
    currentUserProfile,
    setCurrentUserProfile,
    currentSchoolProfile,
    setCurrentSchoolProfile,
    settings,
    extendedSettings,
    licenses,
    staff,
    studentsHook,
    bookings,
    schedules,
    equipment,
    announcements,
    liveLab,
    rooms,
    setRooms,
    subjects,
    setSubjects,
    userMap,
    setUserMap,
    setCoaches,
    setCampusTeachers,
    setAllTeachers,
    setBypassTeachers,
    setIsAvvSigned,
    setEnabledCampusSubjects,
    setEnabledCampusRooms,
    setEnabledCampusEvents,
    setEnabledCampusSchedules,
    setEnabledCalendarWidget,
    setEnabledQrLogin,
    setTeachersManageStudents,
    setTeachersManageTeachers,
    setCampusTeachersManageStudents,
    setCampusTeachersManageTeachers
  }));
  const { fetchDashboardData } = dashboardData;

  // 9. Lifecycle Syncs & Fallbacks
  useEffect(() => {
    if (schoolId) migrateRoomLocalStorageToSupabase(schoolId, supabase);
  }, [schoolId]);

  useEffect(() => {
    if (schoolId && matrixAllocations.length > 0) {
      try {
        const draftMap: Record<string, string | null> = {};
        matrixAllocations.forEach(p => { draftMap[p.id] = p.roomId; });
        localStorage.setItem(`groovelab_matrix_allocations_draft_${schoolId}`, JSON.stringify(draftMap));
      } catch {}
    }
  }, [matrixAllocations, schoolId]);

  useEffect(() => {
    const handleSchoolUpdated = (e?: Event) => {
      if (e && 'key' in e) {
        const se = e as StorageEvent;
        if (!se.key || !['groovelab_school_overrides', 'groovelab_school_settings_sync'].includes(se.key)) return;
      }
      fetchDashboardData();
    };
    window.addEventListener('groovelab_school_updated', handleSchoolUpdated);
    window.addEventListener('storage', handleSchoolUpdated);
    return () => {
      window.removeEventListener('groovelab_school_updated', handleSchoolUpdated);
      window.removeEventListener('storage', handleSchoolUpdated);
    };
  }, [schoolId, fetchDashboardData]);

  // 10. Memoized Props Builders (Prevents Re-Render Spikes on Keypress)
  const verwaltungTabProps = useMemo(() => buildSecretaryVerwaltungProps({
    schoolId: schoolId || '',
    schoolNumericId,
    userId,
    supabase,
    currentSchoolProfile,
    setCurrentSchoolProfile,
    currentUserProfile,
    showRealNames,
    masterPricing,
    effectiveSchoolRates,
    masterRates,
    navigation,
    settings,
    extendedSettings,
    licenses,
    campusTeachers,
    bypassTeachers,
    coaches,
    allTeachers,
    staff,
    studentsHook,
    bookings,
    schedules,
    equipment,
    announcements,
    audit,
    crisis,
    dashboardData,
    rooms,
    setRooms,
    roomSearchQuery,
    setRoomSearchQuery,
    userMap,
    isAvvSigned,
    setShowAvvModal,
    simulatedToday,
    setSimulatedToday,
    dismissedInvoiceAlert,
    setDismissedInvoiceAlert,
    roomsSubView,
    setRoomsSubView,
    schedulesRoomsViewMode,
    setSchedulesRoomsViewMode,
    onOpenFacilityLogModal: () => setShowFacilityLogModal(true),
    setIsFeedbackModalOpen,
    setShowDpoIdCardModal,
    setShowDpoPortalModal,
    setQrModalUser,
    getEffectiveStorageUsedBytes,
    formatInstrumentName,
    checkTimeOverlap
  }), [
    schoolId, schoolNumericId, userId, currentSchoolProfile, currentUserProfile, showRealNames,
    effectiveSchoolRates, masterRates, navigation, settings, extendedSettings, licenses,
    campusTeachers, bypassTeachers, coaches, allTeachers, staff, studentsHook, bookings, schedules,
    equipment, announcements, audit, crisis, dashboardData, rooms, roomSearchQuery, userMap,
    isAvvSigned, simulatedToday, dismissedInvoiceAlert, roomsSubView, schedulesRoomsViewMode,
    getEffectiveStorageUsedBytes, setIsFeedbackModalOpen, setShowAvvModal, setShowDpoIdCardModal,
    setShowDpoPortalModal, setShowFacilityLogModal, setQrModalUser
  ]);

  const campusTabProps = useMemo(() => buildSecretaryCampusProps({
    schoolId: schoolId || '',
    userId,
    userRole,
    userRoles,
    activePlatform,
    showRealNames,
    onLogout,
    currentSchoolProfile,
    navigation,
    settings,
    extendedSettings,
    licenses,
    campusTeachers,
    bypassTeachers,
    coaches,
    allTeachers,
    staff,
    studentsHook,
    schedules,
    dashboardData,
    bookings,
    rooms,
    setRooms,
    subjects,
    setSubjects,
    fetchDashboardData,
    showGuidanceModal,
    setShowGuidanceModal,
    guidanceInitialTab,
    setGuidanceInitialTab,
    showParentInfoSheetModal,
    setShowParentInfoSheetModal,
    setIsFeedbackModalOpen,
    setApprovalToast: schedules.setApprovalToast,
    enabledCampusSubjects,
    setEnabledCampusSubjects,
    enabledCampusRooms,
    setEnabledCampusRooms,
    enabledCampusEvents,
    setEnabledCampusEvents,
    enabledCampusSchedules,
    setEnabledCampusSchedules,
    enabledCalendarWidget,
    setEnabledCalendarWidget,
    enabledQrLogin,
    setEnabledQrLogin,
    campusTeachersManageStudents,
    setCampusTeachersManageStudents,
    campusTeachersManageTeachers,
    setCampusTeachersManageTeachers,
    teachersManageTeachers,
    setTeachersManageTeachers,
    schedulesRoomsViewMode,
    setSchedulesRoomsViewMode,
    liveViewDay,
    setLiveViewDay,
    showAdHocBooking,
    setShowAdHocBooking,
    adHocRoomId,
    setAdHocRoomId,
    adHocStartTime,
    setAdHocStartTime,
    adHocDuration,
    setAdHocDuration,
    adHocTeacherId,
    setAdHocTeacherId,
    adHocStudentName,
    setAdHocStudentName
  }), [
    schoolId, userId, userRole, userRoles, activePlatform, showRealNames, onLogout,
    currentSchoolProfile, navigation, settings, extendedSettings, licenses, campusTeachers,
    bypassTeachers, coaches, allTeachers, staff, studentsHook, schedules, dashboardData, bookings,
    rooms, subjects, fetchDashboardData, showGuidanceModal, guidanceInitialTab, showParentInfoSheetModal,
    enabledCampusSubjects, enabledCampusRooms, enabledCampusEvents, enabledCampusSchedules,
    enabledCalendarWidget, enabledQrLogin, campusTeachersManageStudents, campusTeachersManageTeachers,
    teachersManageTeachers, schedulesRoomsViewMode, liveViewDay, showAdHocBooking, adHocRoomId,
    adHocStartTime, adHocDuration, adHocTeacherId, adHocStudentName, setIsFeedbackModalOpen,
    setGuidanceInitialTab, setShowGuidanceModal, setShowParentInfoSheetModal
  ]);

  const groovelabTabProps = useMemo(() => buildSecretaryGroovelabProps({
    schoolId: schoolId || '',
    userId,
    showRealNames,
    activePlatform,
    navigation,
    settings,
    extendedSettings,
    campusTeachers,
    bypassTeachers,
    coaches,
    allTeachers,
    staff,
    studentsHook,
    liveLab,
    dashboardData,
    rooms,
    setRooms,
    teachersManageStudents,
    setTeachersManageStudents,
    teachersManageTeachers,
    setTeachersManageTeachers,
    setIsFeedbackModalOpen
  }), [
    schoolId, userId, showRealNames, activePlatform, navigation, settings, extendedSettings,
    campusTeachers, bypassTeachers, coaches, allTeachers, staff, studentsHook, liveLab,
    dashboardData, rooms, teachersManageStudents, teachersManageTeachers, setIsFeedbackModalOpen
  ]);

  const modalsHubProps = useMemo(() => buildSecretaryModalsMasterHubProps({
    schoolId: schoolId || '',
    schoolNumericId,
    userId,
    supabase,
    currentSchoolProfile,
    setCurrentSchoolProfile,
    currentUserProfile,
    activePlatform,
    showRealNames,
    masterPricing,
    operatorCompany,
    operatorContact,
    operatorStreet,
    operatorZip,
    operatorCity,
    operatorIban,
    operatorBic,
    navigation,
    settings,
    extendedSettings,
    licenses,
    staff,
    studentsHook,
    bookings,
    schedules,
    dashboardData,
    rooms,
    userMap,
    isAvvSigned,
    showAvvModal,
    setShowAvvModal,
    showAgb,
    setShowAgb,
    showPrivacy,
    setShowPrivacy,
    showDpoIdCardModal,
    setShowDpoIdCardModal,
    showDpoPortalModal,
    setShowDpoPortalModal,
    showParentInfoSheetModal,
    setShowParentInfoSheetModal,
    showGuidanceModal,
    setShowGuidanceModal,
    guidanceInitialTab,
    isFeedbackModalOpen,
    setIsFeedbackModalOpen,
    showFacilityLogModal,
    setShowFacilityLogModal,
    handleResolveRoomIssue,
    handleReopenRoomIssue,
    showUnassignedWarning,
    setShowUnassignedWarning,
    allUniqueTeacherProfiles,
    getEffectiveStorageUsedBytes,
    generateStarterPin
  }), [
    schoolId, schoolNumericId, userId, currentSchoolProfile, currentUserProfile, activePlatform,
    showRealNames, masterPricing, operatorCompany, operatorContact, operatorStreet, operatorZip,
    operatorCity, operatorIban, operatorBic, navigation, settings, extendedSettings, licenses,
    staff, studentsHook, bookings, schedules, dashboardData, rooms, userMap, isAvvSigned,
    showAvvModal, showAgb, showPrivacy, showDpoIdCardModal, showDpoPortalModal, showParentInfoSheetModal,
    showGuidanceModal, guidanceInitialTab, isFeedbackModalOpen, showFacilityLogModal,
    handleResolveRoomIssue, handleReopenRoomIssue, showUnassignedWarning, allUniqueTeacherProfiles,
    getEffectiveStorageUsedBytes, setIsFeedbackModalOpen, setShowAgb, setShowAvvModal,
    setShowDpoIdCardModal, setShowDpoPortalModal, setShowFacilityLogModal, setShowGuidanceModal,
    setShowParentInfoSheetModal, setShowPrivacy, setShowUnassignedWarning
  ]);

  const showBlockedOverlay = Boolean(isTrialExpired && !(activeTab === 'secretary' && secretarySubTab === 'licenses'));

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f8fafc',
      color: '#1d1d1f',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif',
      overflow: 'hidden'
    }}>
      <SecretaryTrialBlockedOverlay
        show={showBlockedOverlay}
        schoolName={schoolName}
        onNavigateToLicenses={() => {
          setActiveTab('secretary');
          setSecretarySubTab('licenses');
        }}
      />

      {/* Global CSS injections matching the screenshot design (ADM-32) */}
      <SecretaryDashboardStyles />

      {/* Real-time pending booking push toast notification (ADM-33) */}
      <SecretaryRealtimeBookingToast
        toast={realtimeToast}
        onClose={() => setRealtimeToast(prev => ({ ...prev, visible: false }))}
      />

      {/* LEFT SIDEBAR PANEL - GLASS WITH BLUR */}
      <SecretarySidebar
        activeTab={activeTab}
        secretarySubTab={secretarySubTab}
        setSecretarySubTab={setSecretarySubTab}
        campusSubTab={campusSubTab}
        setCampusSubTab={setCampusSubTab}
        groovelabSubTab={groovelabSubTab}
        setGroovelabSubTab={setGroovelabSubTab}
        hasCampusSub={hasCampusSub}
        enabledCampusSubjects={enabledCampusSubjects}
        enabledCampusRooms={enabledCampusRooms}
        enabledCampusEvents={enabledCampusEvents}
        enabledCampusSchedules={enabledCampusSchedules}
        crisisNotifications={crisisNotifications}
        pendingSchedules={pendingSchedules}
        startTour={startTour}
        currentUserProfile={currentUserProfile}
        setShowOwnQrModal={setShowOwnQrModal}
        onLogout={onLogout}
        handleSecretaryLogout={handleSecretaryLogout}
      />

      {/* RIGHT CONTENT PANE */}
      <div style={{
        flex: 1,
        height: '100vh',
        boxSizing: 'border-box',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
        color: '#1d1d1f',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        paddingBottom: windowWidth < 1024 ? '90px' : '0px'
      }}>
        {/* Top Header & Banners */}
        <SecretaryHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isBillingBooked={isBillingBooked}
          hasCampusSub={hasCampusSub}
          hasGroovelabSub={hasGroovelabSub}
          schoolName={schoolName}
          schoolId={schoolId}
          currentUserProfile={currentUserProfile}
          windowWidth={windowWidth}
          showDateSimulation={showDateSimulation}
          simulatedToday={simulatedToday}
          setSimulatedToday={setSimulatedToday}
          isCurrentUserTeacher={isCurrentUserTeacher}
          onRoleSwitched={onRoleSwitched}
          showDualRoleNotice={showDualRoleNotice}
          setShowDualRoleNotice={setShowDualRoleNotice}
          isSchoolTrial={isSchoolTrial}
          schoolTrialEndsAt={schoolTrialEndsAt}
          schoolStatus={schoolStatus}
          trialDaysRemaining={trialDaysRemaining}
          subscriptionBypass={subscriptionBypass}
          dunningStatus={dunningStatus}
          setShowDunningPayModal={setShowDunningPayModal}
          secretarySubTab={secretarySubTab}
          setSecretarySubTab={setSecretarySubTab}
        />

        {/* Main scrollable body content */}
        <div id="secretary-main-scroll-container" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflowY: 'scroll', scrollbarGutter: 'stable' }}>
          {/* Active Tab Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {activeTab !== 'groovelab' && !((activeTab as any) === 'campus') && !((activeTab as any) === 'campus' && (campusSubTab === 'onboarding' || campusSubTab === 'schedules')) && !(activeTab === 'secretary' && (secretarySubTab === 'crisis' || secretarySubTab === 'rooms' || secretarySubTab === 'briefing' || secretarySubTab === 'duties' || secretarySubTab === 'announcements' || secretarySubTab === 'audit' || secretarySubTab === 'equipment' || secretarySubTab === 'employees' || secretarySubTab === 'licenses' || secretarySubTab === 'setup')) && (
                <>
                  <h2 className="swiss-h1" style={{ margin: 0, color: (activeTab as any) === 'campus' ? '#34a853' : '#f59e0b' }}>
                    {getTabTitle()}
                  </h2>
                  <p style={{ color: (activeTab as any) === 'campus' ? '#64748b' : '#a1a1aa', fontWeight: 500, fontSize: '0.85rem', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {currentUserProfile 
                      ? `${currentUserProfile.first_name} ${currentUserProfile.last_name || ''} • Schulsekretariat` 
                      : 'Schulsekretariat'
                    }
                  </p>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }} />
          </div>

          {/* TAB 1: SECRETARY - VERWALTUNG & GOVERNANCE */}
          {activeTab === 'secretary' && (
            <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Verwaltung...</div>}>
              <SecretaryVerwaltungTab {...verwaltungTabProps} />
            </Suspense>
          )}

          {/* TAB 2: CAMPUS */}
          {activeTab === 'campus' && (
            <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Campus...</div>}>
              <SecretaryCampusTab {...campusTabProps} />
            </Suspense>
          )}

          {/* TAB 3: GROOVELAB */}
          {activeTab === 'groovelab' && (
            <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade GrooveLab...</div>}>
              <SecretaryGroovelabTab {...groovelabTabProps} />
            </Suspense>
          )}
        </div>

        {/* Master Modals Hub */}
        <SecretaryModalsMasterHub {...modalsHubProps} />

        {/* Floating Developer Reset Button (Dev Mode Only - ADM-33) */}
        <SecretaryDeveloperResetButton
          activeTab={activeTab}
          secretarySubTab={secretarySubTab}
          onReset={handleDeveloperReset}
        />

        {/* Apple Glass Mobile Bottom Navigation */}
        <Suspense fallback={null}>
          <SecretaryMobileNavigation
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            secretarySubTab={secretarySubTab}
            setSecretarySubTab={setSecretarySubTab}
            campusSubTab={campusSubTab}
            setCampusSubTab={setCampusSubTab}
            groovelabSubTab={groovelabSubTab}
            setGroovelabSubTab={setGroovelabSubTab}
            hasCampusSub={hasCampusSub}
            crisisNotifications={crisisNotifications}
            enabledCampusSubjects={enabledCampusSubjects}
            enabledCampusRooms={enabledCampusRooms}
            enabledCampusEvents={enabledCampusEvents}
            enabledCampusSchedules={enabledCampusSchedules}
            pendingSchedules={pendingSchedules}
            mobileSecretaryDrawerOpen={mobileSecretaryDrawerOpen}
            setMobileSecretaryDrawerOpen={setMobileSecretaryDrawerOpen}
            setShowOwnQrModal={setShowOwnQrModal}
            setIsFeedbackModalOpen={setIsFeedbackModalOpen}
            onLogout={onLogout}
            handleSecretaryLogout={handleSecretaryLogout}
          />
        </Suspense>

        {/* Approval Toast Notification */}
        {approvalToast && (
          <div style={{
            position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999,
            background: approvalToast.type === 'success' ? 'linear-gradient(135deg, #34a853, #22c55e)' : 'linear-gradient(135deg, #ea4335, #ef4444)',
            color: 'white', borderRadius: '16px', padding: '14px 24px', fontWeight: 700,
            fontSize: '0.9rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex',
            alignItems: 'center', gap: 10, maxWidth: '90vw', whiteSpace: 'nowrap', animation: 'slideInUp 0.3s ease'
          }}>
            {approvalToast.message}
          </div>
        )}

        <TourComponent />
      </div>
    </div>
  );
}
