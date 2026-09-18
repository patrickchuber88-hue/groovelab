import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { supabase } from '../lib/supabase';
import { useRealNamesVisibility } from '../utils/nameHelper';
import { useMasterPricing } from '../context/MasterPricingContext';
import { useSecretarySettings } from './secretary/hooks/useSecretarySettings';
import { useSecretaryLicenses } from './secretary/hooks/useSecretaryLicenses';
import { useSecretaryBookings } from './secretary/hooks/useSecretaryBookings';
import { useSecretaryLiveLab } from './secretary/hooks/useSecretaryLiveLab';
import { useSecretaryNavigation } from './secretary/hooks/useSecretaryNavigation';
import { useSecretaryDashboardData } from './secretary/hooks/useSecretaryDashboardData';
import { usePremiumOnboardingTour, TourStep } from './PremiumOnboardingTour';

// Modular Bounded Context components, navigation hubs, styles and tabs
import { SecretarySidebar } from './secretary/SecretarySidebar';
import { SecretaryHeader } from './secretary/SecretaryHeader';
import { SecretaryModalsMasterHub } from './secretary/SecretaryModalsMasterHub';
import { SecretaryDashboardStyles } from './secretary/SecretaryDashboardStyles';
import { SecretaryTrialBlockedOverlay } from './secretary/modals/SecretaryTrialBlockedOverlay';
import { SecretaryRealtimeBookingToast } from './secretary/SecretaryRealtimeBookingToast';
import { SecretaryDeveloperResetButton } from './secretary/SecretaryDeveloperResetButton';
import { useSecretaryExtendedSettings } from './secretary/hooks/useSecretaryExtendedSettings';
import { useSecretaryStorageQuota } from './secretary/hooks/useSecretaryStorageQuota';
import { useSecretaryOperatorBilling } from './secretary/hooks/useSecretaryOperatorBilling';
import { buildSecretaryDashboardDataProps } from './secretary/hooks/buildSecretaryDashboardDataProps';
import { migrateRoomLocalStorageToSupabase } from './secretary/utils/migrateRoomLocalStorage';
const SecretaryMobileNavigation = lazy(() => import('./secretary/SecretaryMobileNavigation').then(m => ({ default: m.SecretaryMobileNavigation })));
const SecretaryGroovelabTab = lazy(() => import('./secretary/tabs/SecretaryGroovelabTab').then(m => ({ default: m.SecretaryGroovelabTab })));
const SecretaryCampusTab = lazy(() => import('./secretary/tabs/SecretaryCampusTab').then(m => ({ default: m.SecretaryCampusTab })));
const SecretaryVerwaltungTab = lazy(() => import('./secretary/tabs/SecretaryVerwaltungTab').then(m => ({ default: m.SecretaryVerwaltungTab })));
import { buildSecretaryVerwaltungProps } from './secretary/tabs/buildSecretaryVerwaltungProps';
import { buildSecretaryCampusProps } from './secretary/tabs/buildSecretaryCampusProps';
import { buildSecretaryGroovelabProps } from './secretary/tabs/buildSecretaryGroovelabProps';
import { buildSecretaryModalsMasterHubProps } from './secretary/buildSecretaryModalsMasterHubProps';
import { useSecretarySchedules } from './secretary/hooks/useSecretarySchedules';
import { generateStarterPin } from './secretary/utils/secretaryAuthUtils';
import { useSecretaryStaff } from './secretary/hooks/useSecretaryStaff';
import { useSecretaryStudents } from './secretary/hooks/useSecretaryStudents';
import { useSecretaryCrisis } from './secretary/hooks/useSecretaryCrisis';
import { useSecretaryAnnouncements } from './secretary/hooks/useSecretaryAnnouncements';
import { useSecretaryEquipment } from './secretary/hooks/useSecretaryEquipment';
import { useSecretaryAudit } from './secretary/hooks/useSecretaryAudit';

import { checkTimeOverlap, formatInstrumentName } from './secretary/utils/secretaryFormatters';
import { BypassTeacher, GrooveLabCoach } from './secretary/types/secretaryCommonTypes';

interface SecretaryDashboardProps {
  schoolId: string;
  userId?: string;
  userRole?: string;
  userRoles?: string[];
  onLogout?: () => void;
  onRoleSwitched?: (newRole: string) => void;
  activePlatform?: string;
}

export function SecretaryDashboard({ schoolId, userId, userRole, userRoles, onLogout, onRoleSwitched, activePlatform }: SecretaryDashboardProps) {
  const { visible: showRealNames, toggleVisibility: toggleRealNames } = useRealNamesVisibility();

  const tourSteps: TourStep[] = useMemo(() => {
    return [
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
    ];
  }, []);

  const { TourComponent, startTour } = usePremiumOnboardingTour({
    tourKey: `campus_secretary_tour_${userId}`,
    steps: tourSteps,
    platformTheme: 'admin'
  });
  const getSchoolNumericId = (id?: string | null): number => {
    if (!id || typeof id !== 'string') return 1;
    if (id === '74713df2-6176-4a41-a8cd-9fbebe34e9b8') return 1;
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 98) + 2;
  };
  const schoolNumericId = getSchoolNumericId(schoolId);

  const [showAgb, setShowAgb] = useState<boolean>(false);
  const [showPrivacy, setShowPrivacy] = useState<boolean>(false);
  const [showDpoIdCardModal, setShowDpoIdCardModal] = useState<boolean>(false);
  const [showDpoPortalModal, setShowDpoPortalModal] = useState<boolean>(false);

  // Master pricing context & operator billing engine (ADM-32)
  const masterPricing = useMasterPricing();
  const {
    operatorCompany,
    operatorContact,
    operatorStreet,
    operatorZip,
    operatorCity,
    operatorIban,
    operatorBic,
    currentSchoolProfile,
    setCurrentSchoolProfile,
    effectiveSchoolRates,
    masterRates,
    setMasterRates
  } = useSecretaryOperatorBilling(masterPricing);

  // 🧭 Step 3.20: Modular Secretary Navigation, Responsive Viewport & Shell Engine
  const navigation = useSecretaryNavigation({
    onLogout
  });
  const {
    activeTab,
    setActiveTab,
    secretarySubTab,
    setSecretarySubTab,
    campusSubTab,
    setCampusSubTab,
    groovelabSubTab,
    setGroovelabSubTab,
    mobileSecretaryDrawerOpen,
    setMobileSecretaryDrawerOpen,
    windowWidth,
    windowHeight,
    containerWidth,
    setContainerWidth,
    containerRef,
    getTabTitle,
    handleSecretaryLogout
  } = navigation;

  // 🎙️ Step 3.23: Modular Storage Quota & Multi-Tenant Scanner Engine
  const { getEffectiveStorageUsedBytes, refreshStorageQuota } = useSecretaryStorageQuota({
    currentSchoolProfile,
    setCurrentSchoolProfile,
    supabase
  });
  // [EXTRACTED to useSecretaryNavigation: campusSubTab]
  const [enabledCampusSubjects, setEnabledCampusSubjects] = useState<boolean>(true);
  const [enabledCampusRooms, setEnabledCampusRooms] = useState<boolean>(true);
  const [enabledCampusEvents, setEnabledCampusEvents] = useState<boolean>(true);
  const [enabledCampusSchedules, setEnabledCampusSchedules] = useState<boolean>(true);
  const [enabledCalendarWidget, setEnabledCalendarWidget] = useState<boolean>(true);
  // [EXTRACTED to useSecretarySettings: handleToggleSetting, handleSaveSettingValue, handleToggleAutoClean, handleUpdateSchoolYear]
  const [schedulesRoomsViewMode, setSchedulesRoomsViewMode] = useState<'designer' | 'live'>('designer');
  const [roomsSubView, setRoomsSubView] = useState<'overview' | 'plan' | 'settings'>('overview');
  const [liveViewDay, setLiveViewDay] = useState<number>(1);
  const [showAdHocBooking, setShowAdHocBooking] = useState<boolean>(false);
  const [adHocRoomId, setAdHocRoomId] = useState<string | null>(null);
  const [adHocTeacherId, setAdHocTeacherId] = useState<string>('');
  const [adHocStudentName, setAdHocStudentName] = useState<string>('');
  const [adHocStartTime, setAdHocStartTime] = useState<string>('14:00');
  const [adHocDuration, setAdHocDuration] = useState<number>(45);
  // [EXTRACTED to useSecretaryNavigation: groovelabSubTab]
  const [teachersManageStudents, setTeachersManageStudents] = useState<boolean>(false);
  const [teachersManageTeachers, setTeachersManageTeachers] = useState<boolean>(false);
  const [campusTeachersManageStudents, setCampusTeachersManageStudents] = useState<boolean>(false);
  const [campusTeachersManageTeachers, setCampusTeachersManageTeachers] = useState<boolean>(false);
  // [EXTRACTED to useSecretaryBookings: pendingBookings]
  // [EXTRACTED to useSecretaryLiveLab: realtimeToast, activeSessions, liveSearchQuery]
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const isGhost = userId === 'master-support-id' || sessionStorage.getItem('groovelab_support_ghost') === 'true';
      if (isGhost) {
        const ghostSchoolName = sessionStorage.getItem('groovelab_ghost_school_name') || 'Musikschule';
        return {
          id: 'master-support-id',
          first_name: `${ghostSchoolName} Support`,
          last_name: '',
          role: 'admin',
          photo_url: '/campus_login_hero.png',
          is_ghost_mode: true
        };
      }
    }
    return null;
  });

  // Secretary Settings, Master Data, Biometrics & Disaster Recovery Engine
  const settings = useSecretarySettings({
    schoolId: schoolId || '',
    userId: userId || '',
    currentUserProfile,
    currentSchoolProfile,
    setCurrentSchoolProfile,
    fetchDashboardData: () => fetchDashboardData()
  });
  const {
    schoolName,
    logoUrl,
    openingHours,
    schoolYearStartMonth,
    schoolYearStartDay
  } = settings;

  // 🏢 Step 3.18: Modular Secretary Room Bookings, Logbook & Facility Issues Engine
  const bookings = useSecretaryBookings({
    schoolId: schoolId || '',
    supabase
  });
  const {
    pendingBookings,
    showFacilityLogModal,
    setShowFacilityLogModal,
    handleResolveRoomIssue,
    handleReopenRoomIssue
  } = bookings;

  const [showOwnQrModal, setShowOwnQrModal] = useState<boolean>(false);
  const [qrModalUser, setQrModalUser] = useState<any | null>(null);

  // 🎸 Step 3.19: Modular GrooveLab Live Lab, Sessions & Realtime Notifications Engine
  const liveLab = useSecretaryLiveLab({
    schoolId: schoolId || '',
    userId,
    supabase
  });
  const {
    realtimeToast,
    setRealtimeToast
  } = liveLab;

  // Sofortiges Laden des eigenen Profils – unabhängig vom langen fetchDashboardData
  useEffect(() => {
    if (!userId) return;
    const loadOwnProfile = async () => {
      if (userId === 'master-support-id' || (typeof window !== 'undefined' && sessionStorage.getItem('groovelab_support_ghost') === 'true')) {
        const ghostSchoolName = sessionStorage.getItem('groovelab_ghost_school_name') || 'Musikschule';
        setCurrentUserProfile({
          id: 'master-support-id',
          first_name: `${ghostSchoolName} Support`,
          last_name: '',
          role: 'admin',
          photo_url: '/campus_login_hero.png',
          is_ghost_mode: true
        });
        return;
      }
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, nickname, photo_url, role, roles, email, instrument, qr_token, teacher_qr_token')
        .eq('id', userId)
        .single();
      if (data) setCurrentUserProfile(data);
    };
    loadOwnProfile();
  }, [userId]);

  // [EXTRACTED to useSecretaryNavigation: activeTab and subtab persistence]

  useEffect(() => {
    if (schoolId) {
      migrateRoomLocalStorageToSupabase(schoolId, supabase);
    }
  }, [schoolId]);

  // [EXTRACTED to useSecretaryExtendedSettings: handleResetTeacherPin, handleUpdateTeacher]

  // Rooms States for Live Lab & Schedules
  const [rooms, setRooms] = useState<any[]>([]);

  // Guidance Modals
  const [showGuidanceModal, setShowGuidanceModal] = useState<boolean>(false);
  const [showParentInfoSheetModal, setShowParentInfoSheetModal] = useState<boolean>(false);
  const [guidanceInitialTab, setGuidanceInitialTab] = useState<'teacher' | 'parent'>('teacher');

  const [showDualRoleNotice, setShowDualRoleNotice] = useState<boolean>(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('groovelab_dual_role_switched_notice') === 'true';
  });

  // School Data & Subscription
  const [isAvvSigned, setIsAvvSigned] = useState<boolean>(true);
  const [showAvvModal, setShowAvvModal] = useState<boolean>(false);
  const [enabledQrLogin, setEnabledQrLogin] = useState<boolean>(true);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);

  const INSTRUMENT_TAGS = ['Schlagzeug', 'Piano', 'Gitarre', 'Gesang', 'Geige', 'Querflöte', 'Saxophon', 'Bass', 'Keyboard', 'Trompete'];
  const [subjects, setSubjects] = useState<any[]>([]);
  const activeSubjectsList = useMemo(() => {
    const placeholders = new Set([
      'ohne zuweisung', 'ohnezuweisung', 'allgemein', 
      'nicht festgelegt', 'nichtfestgelegt', 'nicht zugeordnet', 
      'nichtzugeordnet', 'none', 'null', ''
    ]);
    const activeSubs = Array.from(new Set(
      subjects
        .filter((s: any) => s.is_active && s.name)
        .map((s: any) => s.name.trim())
    )).filter(name => !placeholders.has(name.toLowerCase()));
    
    return activeSubs.length > 0 ? activeSubs : INSTRUMENT_TAGS;
  }, [subjects]);

  // 💳 Bounded Context: Licenses, Subscriptions, User Quota & B2B Billing Hook
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
    isSchoolTrial,
    schoolTrialEndsAt,
    subscriptionBypass,
    isTrialExpired,
    handleDeveloperReset,
    hasCampusSub,
    hasGroovelabSub,
    isBillingBooked,
    studentBillingOption,
    billingPayer,
    schoolStatus,
    trialDaysRemaining
  } = licenses;
  const [simulatedToday, setSimulatedToday] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('groovelab_simulated_date') || (schoolId ? localStorage.getItem(`simulatedToday_${schoolId}`) : '') || '';
    }
    return '';
  });

  // Real-time synchronization of simulated date with TeacherDashboard and all other views
  useEffect(() => {
    const handleSimDateSync = () => {
      const sim = localStorage.getItem('groovelab_simulated_date') || (schoolId ? localStorage.getItem(`simulatedToday_${schoolId}`) : '') || '';
      setSimulatedToday(sim);
    };
    window.addEventListener('storage', handleSimDateSync);
    window.addEventListener('groovelab_simulated_date_changed', handleSimDateSync);
    return () => {
      window.removeEventListener('storage', handleSimDateSync);
      window.removeEventListener('groovelab_simulated_date_changed', handleSimDateSync);
    };
  }, [schoolId]);

  const staffRef = useRef<any>(null);

  // 🛠️ Step 3.22: Modular Extended Settings, Delinquency & Operational Governance
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
  const {
    dunningStatus,
    showDateSimulation,
    assertSecretaryWriteAccess,
    setShowDunningPayModal
  } = extendedSettings;

  // [EXTRACTED to useSecretaryLicenses: getSchoolYearEndInfo, downloadCancellationReceiptPdf, downloadUpgradeConfirmationPdf, getDynamicAnnualPrice, handleDeveloperReset]
  
  // Apple-style settings panel states
  // [EXTRACTED to useSecretarySettings: settingsTab, activeSecretarySettingsModal]
  // [EXTRACTED to useSecretaryExtendedSettings: activeCampusSettingsModal, activeGroovelabSettingsModal, campus & groovelab extended settings, kiosk & campus tokens]
  
  // [EXTRACTED to useSecretaryDashboardData: alerts]
  const [bypassTeachers, setBypassTeachers] = useState<BypassTeacher[]>([]);
  const [coaches, setCoaches] = useState<GrooveLabCoach[]>([]);
  const [campusTeachers, setCampusTeachers] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const allTeachersRef = useRef<any[]>([]);

  // Unified teacher profiles list for bulk operations & modals
  const allUniqueTeacherProfiles = useMemo(() => {
    return [...(campusTeachers || []), ...(bypassTeachers || []), ...(coaches || []), ...(allTeachers || [])].reduce((acc: any[], t: any) => {
      if (t?.id && !acc.some((x: any) => x.id === t.id)) {
        acc.push(t);
      }
      return acc;
    }, []);
  }, [campusTeachers, bypassTeachers, coaches, allTeachers]);

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
  const {
    isCurrentUserTeacher,
    manageTeacher,
    setManageTeacher,
    setEmployees
  } = staff;

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
  const {
    students,
    setStudents
  } = studentsHook;

  const studentsRef = useRef<any[]>([]);

  useEffect(() => {
    allTeachersRef.current = allTeachers;
  }, [allTeachers]);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);


  // [EXTRACTED to useSecretarySettings: daysSinceLastBackup, showBackupAlert, isSettingsDirty]

  const schedules = useSecretarySchedules({
    schoolId,
    rooms,
    setRooms,
    openingHours,
    campusTeachers,
    bypassTeachers,
    coaches,
    fetchDashboardData: () => fetchDashboardData()
  });
  const {
    pendingSchedules,
    setPendingSchedules,
    matrixAllocations,
    setMatrixAllocations,
    unsubmittedTeachers,
    setUnsubmittedTeachers,
    approvalToast,
    setApprovalToast,
    showUnassignedWarning,
    setShowUnassignedWarning
  } = schedules;

  const equipment = useSecretaryEquipment({
    schoolId,
    rooms,
    setRooms
  });
  const {
    schoolEquipment
  } = equipment;

  // Helpers
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  // [EXTRACTED to useSecretaryDashboardData: roomMap]

  // 🛡️ Step 3.15: Modular Audit Log Governance Hook
  const audit = useSecretaryAudit({
    schoolId,
    activeTab,
    secretarySubTab,
    userMap
  });
  // Cleanup any legacy rental instruments local storage keys
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('groovelab_rental_instruments');
      if (schoolId) {
        localStorage.removeItem(`groovelab_rental_instruments_${schoolId}`);
      }
    } catch (e) {}
  }, [schoolId]);

  // UI states (EXTRACTED to useSecretaryDashboardData: loading, briefingData)
  const crisis = useSecretaryCrisis({
    schoolId,
    onRefreshDashboard: () => fetchDashboardData()
  });
  const {
    crisisNotifications
  } = crisis;

  const announcements = useSecretaryAnnouncements({
    schoolId,
    currentUserProfile,
    campusTeachers,
    bypassTeachers,
    coaches,
    setApprovalToast
  });

  // [EXTRACTED to useSecretaryDashboardData: realtime subscription and initial fetch on school change]

  useEffect(() => {
    if (schoolId && matrixAllocations.length > 0) {
      const draftMap: Record<string, string | null> = {};
      matrixAllocations.forEach(p => {
        draftMap[p.id] = p.roomId;
      });
      localStorage.setItem(`groovelab_matrix_allocations_draft_${schoolId}`, JSON.stringify(draftMap));
    }
  }, [matrixAllocations, schoolId]);

  // 📊 Step 3.21: Modular Secretary Dashboard Data Orchestration & Realtime Engine (ADM-33 Builder)
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
  const {
    loading,
    setLoading,
    buildings,
    setBuildings,
    stations,
    setStations,
    bands,
    setBands,
    alerts,
    setAlerts,
    briefingData,
    setBriefingData,
    schoolEvents,
    setSchoolEvents,
    roomMap,
    setRoomMap,
    fetchDashboardData
  } = dashboardData;

  useEffect(() => {
    const handleSchoolUpdated = (e?: Event) => {
      if (e && 'key' in e) {
        const se = e as StorageEvent;
        // Ignore internal dashboard caches to prevent infinite inter-tab ping-pong loop
        if (!se.key || !['groovelab_school_overrides', 'groovelab_school_settings_sync'].includes(se.key)) {
          return;
        }
      }
      fetchDashboardData();
    };
    window.addEventListener('groovelab_school_updated', handleSchoolUpdated);
    window.addEventListener('storage', handleSchoolUpdated);
    return () => {
      window.removeEventListener('groovelab_school_updated', handleSchoolUpdated);
      window.removeEventListener('storage', handleSchoolUpdated);
    };
  }, [schoolId]);

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

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            </div>
          </div>

        {/* TAB 1: SECRETARY - VERWALTUNG & GOVERNANCE (EXTRACTED TO SecretaryVerwaltungTab) */}
        {activeTab === 'secretary' && (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Verwaltung...</div>}>
            <SecretaryVerwaltungTab
              {...buildSecretaryVerwaltungProps({
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
              })}
            />
          </Suspense>
        )}





        {/* TAB 2: CAMPUS (EXTRACTED TO SecretaryCampusTab) */}
        {activeTab === 'campus' && (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Campus...</div>}>
            <SecretaryCampusTab
              {...buildSecretaryCampusProps({
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
                showGuidanceModal,
                setShowGuidanceModal,
                guidanceInitialTab,
                setGuidanceInitialTab,
                showParentInfoSheetModal,
                setShowParentInfoSheetModal,
                setIsFeedbackModalOpen,
                setApprovalToast,
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
              })}
            />
          </Suspense>
        )}

        {/* TAB 3: GROOVELAB (EXTRACTED TO SecretaryGroovelabTab) */}
        {activeTab === 'groovelab' && (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade GrooveLab...</div>}>
            <SecretaryGroovelabTab
              {...buildSecretaryGroovelabProps({
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
                teachersManageStudents,
                setTeachersManageStudents,
                teachersManageTeachers,
                setTeachersManageTeachers,
                setIsFeedbackModalOpen
              })}
            />
          </Suspense>
        )}



      </div>
      <SecretaryModalsMasterHub
        {...buildSecretaryModalsMasterHubProps({
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
        })}
      />
      {/* Floating Developer Reset Button (Dev Mode Only - ADM-33) */}
      <SecretaryDeveloperResetButton
        activeTab={activeTab}
        secretarySubTab={secretarySubTab}
        onReset={handleDeveloperReset}
      />



      {/* ─── Apple Glass Mobile Bottom Navigation for Administration & Secretariat ─── */}
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

      {/* ─── Approval Toast Notification ─── */}
      {approvalToast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: approvalToast.type === 'success' ? 'linear-gradient(135deg, #34a853, #22c55e)' : 'linear-gradient(135deg, #ea4335, #ef4444)', color: 'white', borderRadius: '16px', padding: '14px 24px', fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 10, maxWidth: '90vw', whiteSpace: 'nowrap', animation: 'slideInUp 0.3s ease' }}>
          {approvalToast.message}
        </div>
      )}

      <TourComponent />
    </div>
  </div>
);
}
