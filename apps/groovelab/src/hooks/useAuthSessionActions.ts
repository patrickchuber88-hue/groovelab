import React, { useCallback } from 'react';
import { scrubSharedDeviceCache } from '../utils/sharedDeviceScrubber';

export interface UseAuthSessionActionsParams {
  user: any;
  setUser: (user: any) => void;
  setUserRaw?: React.Dispatch<React.SetStateAction<any>>;
  session: any;
  setSession: React.Dispatch<React.SetStateAction<any>>;
  loggedInUserId: string | null;
  setLoggedInUserId: (id: string | null) => void;
  setLoggedInUserIdRaw: React.Dispatch<React.SetStateAction<string | null>>;
  supabase: any;
  activePlatform: string;
  setActivePlatform: (platform: any) => void;
  setActiveWorkspace: (workspace: string | null) => void;
  setActiveStudentTab: (tab: string) => void;
  stationIdFromStorage: string | null;
  setStationIdFromStorage: React.Dispatch<React.SetStateAction<string | null>>;
  setIsCampusUnlocked: (unlocked: boolean) => void;
  setShowDeletionPrompt: (show: boolean) => void;
  setDeletionPromptUserId: (id: string | null) => void;
  setDeletionPromptIsHome: (isHome: boolean | undefined) => void;
  isLocalhost?: boolean;
}

export function useAuthSessionActions({
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
  isLocalhost: propIsLocalhost
}: UseAuthSessionActionsParams) {
  const isLocalhost = propIsLocalhost ?? (
    typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.localhost')
    )
  );

  const updateUserRaw = setUserRaw || setUser;

  const handleLogout = useCallback(async (updateDb = true, askConfirm = false) => {
    if (askConfirm === true) {
      if (!window.confirm('Möchtest du dich wirklich abmelden?')) {
        return;
      }
    }
    const currentUser = user;
    const currentSession = session;

    // Resolve school token and subdomain before clearing any states
    const schoolId = currentUser?.school_id || (currentUser?.schools ? (Array.isArray(currentUser.schools) ? currentUser.schools[0]?.id : currentUser.schools?.id) : null);
    let schoolToken = localStorage.getItem('groovelab_kiosk_token');
    let schoolSubdomain = null;
    let resolvedSchoolName = null;
    let hasCampusSubscription = true;
    let hasGroovelabSubscription = false;
    if (schoolId) {
      try {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('groovelab_kiosk_token, campus_login_token, subdomain, name, has_campus_subscription, has_groovelab_subscription')
          .eq('id', schoolId)
          .single();
        schoolToken = schoolData?.groovelab_kiosk_token || schoolData?.campus_login_token || null;
        schoolSubdomain = schoolData?.subdomain || null;
        resolvedSchoolName = schoolData?.name || null;
        if (schoolData) {
          hasCampusSubscription = schoolData.has_campus_subscription !== false;
          hasGroovelabSubscription = schoolData.has_groovelab_subscription === true;
        }
      } catch (err) {
        console.error('[Logout] Error fetching school data:', err);
      }
    }

    try {
      if (loggedInUserId && user?.role !== 'teacher') {
        // Mark user as offline
        const pastDate = new Date(Date.now() - 10 * 60000).toISOString();
        const { error } = await supabase.from('users').update({ last_seen: pastDate }).eq('id', loggedInUserId);
        if (error) console.error('Error updating last_seen on logout:', error);
      }

      if (updateDb && currentSession?.id) {
        // Session beenden
        const { error } = await supabase
          .from('sessions')
          .update({ check_out_time: new Date().toISOString() })
          .eq('id', currentSession.id);
        if (error) console.error('Error ending session on logout:', error);
      }
    } catch (err) {
      console.error('Logout error:', err);
    }

    // Detect if device is a kiosk
    const storedKioskRoomId = localStorage.getItem('groovelab_kiosk_room_id');
    const storedKioskToken = localStorage.getItem('groovelab_kiosk_token');
    const isDeviceKiosk = !!(storedKioskRoomId || storedKioskToken);

    let roomId = null;

    if (isDeviceKiosk) {
      roomId = storedKioskRoomId;
      const storedStationId = localStorage.getItem('groovelab_station_id');

      // Fallback 1: Lookup room ID from active station ID in stations table
      if (!roomId) {
        const activeStationId = currentSession?.station_id || storedStationId;
        if (activeStationId && activeStationId !== 'skip') {
          try {
            const { data: stationData } = await supabase
              .from('stations')
              .select('room_id')
              .eq('id', activeStationId)
              .single();
            if (stationData?.room_id) {
              roomId = stationData.room_id;
            }
          } catch (err) {
            console.error('[Logout] Error resolving room from station:', err);
          }
        }
      }

      // Fallback 2: Lookup first room for user's school ID
      if (!roomId && schoolId) {
        try {
          let roomsQuery = supabase
            .from('rooms')
            .select('id')
            .eq('school_id', schoolId);
          if (activePlatform === 'campus') {
            roomsQuery = roomsQuery.eq('is_campus_active', true);
          } else {
            roomsQuery = roomsQuery.eq('is_groovelab_active', true);
          }
          const { data: roomData } = await roomsQuery
            .order('sort_order', { ascending: true })
            .limit(1);
          if (roomData && roomData.length > 0) {
            roomId = roomData[0].id;
          }
        } catch (err) {
          console.error('[Logout] Error resolving room from school:', err);
        }
      }
    }

    const finalSub = schoolSubdomain || (resolvedSchoolName
      ? resolvedSchoolName
          .toLowerCase()
          .trim()
          .replace(/[äöüß]/g, (match: string) => {
            const mapping: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
            return mapping[match] || match;
          })
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '')
      : '');

    let currentPlatform = activePlatform || localStorage.getItem('groovelab_active_platform') || 'campus';
    if (hasGroovelabSubscription && !hasCampusSubscription) {
      currentPlatform = 'groovelab';
    }

    const getRedirectUrl = (params: string = '') => {
      let baseUrl = `${window.location.origin}/login`;
      if (finalSub) {
        const host = window.location.hostname;
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
          baseUrl = `${window.location.origin}/login`;
          params = params ? `${params}&subdomain=${finalSub}` : `subdomain=${finalSub}`;
        } else if (host.startsWith(`${finalSub}.`)) {
          // If already on the correct subdomain, stay on it
          baseUrl = `${window.location.origin}/login`;
        } else {
          // Stay on the current working domain and pass the school/subdomain parameter to avoid DNS/proxy failures
          baseUrl = `${window.location.origin}/login`;
          params = params ? `${params}&school=${finalSub}` : `school=${finalSub}`;
        }
      }
      const platformParam = `platform=${currentPlatform}`;
      const finalParams = params ? `${params}&${platformParam}` : platformParam;
      return `${baseUrl}?${finalParams}`;
    };

    const storedStationIdForCheck = localStorage.getItem('groovelab_station_id');
    const isGeneralKiosk = !storedStationIdForCheck || storedStationIdForCheck === 'skip';

    if (isDeviceKiosk && isGeneralKiosk) {
      console.log('[Logout] Redirecting general kiosk to clean login page.');
      localStorage.setItem('groovelab_station_id', 'skip');
      localStorage.removeItem('groovelab_kiosk_room_id');

      // Clear local credentials/states
      localStorage.removeItem('isBillingBooked');
      localStorage.removeItem('isCancelled');
      localStorage.removeItem('contractStartDate');
      localStorage.removeItem('bookedExtraUsers');
      localStorage.removeItem('nextBillingOption');
      localStorage.removeItem('nextBillingOptionEffectiveAt');
      localStorage.removeItem('unbooked_52_temp');
      setLoggedInUserId(null);
      setUser(null);
      setSession(null);
      setIsCampusUnlocked(false);
      sessionStorage.removeItem('groovelab_user_id');
      sessionStorage.removeItem('groovelab_location_mode');
      sessionStorage.removeItem('gl_active_session_lease_id');
      localStorage.removeItem('gl_active_session_lease_id');
      sessionStorage.removeItem('gl_global_device_key');
      localStorage.removeItem('gl_global_device_key');
      localStorage.removeItem('groovelab_user_id');
      localStorage.removeItem('groovelab_location_mode');
      localStorage.removeItem('groovelab_active_tab');

      await scrubSharedDeviceCache();
      window.location.replace(getRedirectUrl());
      return;
    }

    if (isDeviceKiosk && roomId) {
      console.log('[Logout] Redirecting Kiosk device to school room:', roomId);
      // Keep groovelab_station_id so the kiosk device remains configured for that station!
      localStorage.setItem('groovelab_kiosk_room_id', roomId);

      // Clear local credentials/states
      localStorage.removeItem('isBillingBooked');
      localStorage.removeItem('isCancelled');
      localStorage.removeItem('contractStartDate');
      localStorage.removeItem('bookedExtraUsers');
      localStorage.removeItem('nextBillingOption');
      localStorage.removeItem('nextBillingOptionEffectiveAt');
      localStorage.removeItem('unbooked_52_temp');
      setLoggedInUserId(null);
      setUser(null);
      setSession(null);
      setIsCampusUnlocked(false);
      sessionStorage.removeItem('groovelab_user_id');
      sessionStorage.removeItem('groovelab_location_mode');
      sessionStorage.removeItem('groovelab_cached_user');
      sessionStorage.removeItem('groovelab_active_tab');
      sessionStorage.removeItem('campus_active_tab');
      sessionStorage.removeItem('groovelab_active_platform');
      sessionStorage.removeItem('groovelab_active_workspace');
      localStorage.removeItem('groovelab_active_workspace');
      sessionStorage.removeItem('groovelab_is_master_admin');
      localStorage.removeItem('groovelab_is_master_admin');
      sessionStorage.removeItem('groovelab_secretary_subtab');
      sessionStorage.removeItem('gl_active_session_lease_id');
      localStorage.removeItem('gl_active_session_lease_id');
      sessionStorage.removeItem('gl_global_device_key');
      localStorage.removeItem('gl_global_device_key');

      // If the device has a coupled station (not general uncoupled kiosk), do not pass kiosk_room_id
      // to avoid triggering auto-bootstrap on load which would overwrite the coupled station.
      if (!isGeneralKiosk) {
        window.location.replace(getRedirectUrl());
      } else {
        window.location.replace(getRedirectUrl(`kiosk_room_id=${roomId}`));
      }
      return;
    }

    console.log('[Logout] Logging out personal device.');
    localStorage.removeItem('groovelab_station_id');
    localStorage.removeItem('groovelab_kiosk_token');
    localStorage.removeItem('groovelab_kiosk_room_id');
    localStorage.removeItem('isBillingBooked');
    localStorage.removeItem('isCancelled');
    localStorage.removeItem('contractStartDate');
    localStorage.removeItem('bookedExtraUsers');
    localStorage.removeItem('nextBillingOption');
    localStorage.removeItem('nextBillingOptionEffectiveAt');
    localStorage.removeItem('unbooked_52_temp');
    setLoggedInUserId(null);
    setUser(null);
    setSession(null);
    setIsCampusUnlocked(false);
    sessionStorage.removeItem('groovelab_user_id');
    sessionStorage.removeItem('groovelab_location_mode');
    sessionStorage.removeItem('groovelab_cached_user');
    sessionStorage.removeItem('groovelab_active_platform');
    sessionStorage.removeItem('groovelab_active_tab');
    sessionStorage.removeItem('campus_active_tab');
    sessionStorage.removeItem('groovelab_active_workspace');
    localStorage.removeItem('groovelab_active_workspace');
    sessionStorage.removeItem('groovelab_is_master_admin');
    localStorage.removeItem('groovelab_is_master_admin');
    sessionStorage.removeItem('groovelab_secretary_subtab');
    sessionStorage.removeItem('gl_active_session_lease_id');
    localStorage.removeItem('gl_active_session_lease_id');
    sessionStorage.removeItem('gl_global_device_key');
    localStorage.removeItem('gl_global_device_key');

    await scrubSharedDeviceCache();
    window.location.replace(getRedirectUrl());
  }, [
    user,
    session,
    supabase,
    loggedInUserId,
    activePlatform,
    setLoggedInUserId,
    setUser,
    setSession,
    setIsCampusUnlocked
  ]);

  const handleLogin = useCallback(async (userId: string, isHome?: boolean, stationId?: string | null) => {
    if (stationId !== undefined) {
      setStationIdFromStorage(stationId);
    }
    const currentStationId = stationId !== undefined ? stationId : stationIdFromStorage;
    const localIsKioskMode = (currentStationId && currentStationId !== 'skip') || (typeof window !== 'undefined' ? !!localStorage.getItem('groovelab_kiosk_token') : false);

    // Prime sessionStorage immediately so customFetch interceptor injects user_id into x-client-info
    if (typeof window !== 'undefined' && userId) {
      sessionStorage.setItem('groovelab_user_id', userId);
    }
    setLoggedInUserIdRaw(userId);

    let { data: userToLogin } = await supabase.from('users').select('*, schools(*)').eq('id', userId).single();

    if (!userToLogin && typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('groovelab_cached_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.id === userId) {
            userToLogin = parsed;
          }
        }
      } catch (e) {}
    }

    const existingWorkspace = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_active_workspace') : null;

    let effectiveUser = userToLogin;
    if (!effectiveUser && isLocalhost) {
      const targetSchoolId = typeof window !== 'undefined' ? (localStorage.getItem('groovelab_last_school_id') || localStorage.getItem('groovelab_school_id') || (isLocalhost ? '53e83805-1d5a-4ed8-988e-1fb0b8200b9c' : '')) : (isLocalhost ? '53e83805-1d5a-4ed8-988e-1fb0b8200b9c' : '');
      if (!targetSchoolId) {
        console.warn('[useAuthSessionActions] Fail-Closed: Cannot construct session without a resolved school_id.');
        return;
      }
      const isStudent = existingWorkspace === 'student' || userId === '15102f5e-c504-4c33-93ab-436285197c8c';
      const isTeacher = existingWorkspace === 'teacher' || userId === '98b6a599-7ff7-4f99-b51d-b6a4c348a0a0' || userId === '11079eae-664a-49a4-8692-771d83a3193c';
      const isMaster = existingWorkspace === 'master_admin' || userId === '88888888-8888-8888-8888-888888888888';
      effectiveUser = {
        id: userId,
        first_name: isStudent ? 'Linus' : (isTeacher ? 'Peter' : (isMaster ? 'Master' : 'Manuel')),
        last_name: isStudent ? 'K.' : (isTeacher ? 'Pan' : (isMaster ? 'Admin' : 'Wagner')),
        name: isStudent ? 'Linus K.' : (isTeacher ? 'Peter Pan' : (isMaster ? 'Master Admin' : 'Manuel Wagner')),
        role: isMaster ? 'admin' : (isStudent ? 'student' : (isTeacher ? 'teacher' : 'admin')),
        roles: isTeacher ? ['teacher', 'admin'] : [isMaster ? 'admin' : (isStudent ? 'student' : 'admin')],
        contract_ends_at: null,
        contract_decision_made: true,
        is_external_vocalist: false,
        is_campus_active: true,
        is_groovelab_active: true,
        is_master_admin: isMaster,
        schools: {
          id: targetSchoolId,
          name: 'Musäk Bad Säckingen',
          has_campus_subscription: true,
          has_groovelab_subscription: true,
          is_billing_booked: true,
          subscription_bypass: true
        }
      } as any;
    }

    if (effectiveUser?.role === 'student' && effectiveUser.contract_ends_at) {
      const endsAt = new Date(effectiveUser.contract_ends_at).getTime();
      if (Date.now() > endsAt) {
        alert("Dein Vertrag ist abgelaufen. Bitte wende dich an die Verwaltung.");
        return;
      }
      
      if (effectiveUser.contract_decision_made === false || effectiveUser.contract_decision_made === null) {
        setDeletionPromptUserId(userId);
        setDeletionPromptIsHome(isHome);
        setShowDeletionPrompt(true);
        return; // Pause login until decision is made
      }
    }

    const currentRole = effectiveUser?.role?.toLowerCase() || (existingWorkspace === 'student' ? 'student' : (existingWorkspace === 'secretary' ? 'admin' : 'teacher'));
    const isMasterAdmin = Boolean(
      ((effectiveUser?.is_master_admin === true) || (isLocalhost && (userId === '88888888-8888-8888-8888-888888888888' || effectiveUser?.is_master_admin))) &&
      (sessionStorage.getItem('groovelab_is_master_admin') === 'true') &&
      (existingWorkspace === 'master_admin')
    );

    if (isMasterAdmin) {
      sessionStorage.setItem('groovelab_active_workspace', 'master_admin');
      setActiveWorkspace('master_admin');
      sessionStorage.setItem('groovelab_is_master_admin', 'true');
    } else {
      sessionStorage.removeItem('groovelab_is_master_admin');
      if (currentRole === 'admin' || currentRole === 'secretary') {
        sessionStorage.setItem('groovelab_active_workspace', 'secretary');
        setActiveWorkspace('secretary');
        sessionStorage.setItem('groovelab_secretary_subtab', 'briefing');
      } else if (currentRole === 'student') {
        sessionStorage.setItem('groovelab_active_workspace', 'student');
        setActiveWorkspace('student');
      } else {
        sessionStorage.setItem('groovelab_active_workspace', 'teacher');
        setActiveWorkspace('teacher');
      }
    }

    // Determine module availability for user & school
    const schoolObj: any = Array.isArray(effectiveUser?.schools) ? effectiveUser.schools[0] : effectiveUser?.schools;
    const schoolHasCampus = Boolean(
      effectiveUser?.is_campus_active || 
      (schoolObj ? (schoolObj.has_campus_subscription || !schoolObj.is_billing_booked || schoolObj.subscription_bypass) : true)
    );
    const schoolHasGroove = Boolean(
      effectiveUser?.is_groovelab_active || 
      (schoolObj ? (schoolObj.has_groovelab_subscription || !schoolObj.is_billing_booked || schoolObj.subscription_bypass) : true)
    );

    const isCampusActive = Boolean(schoolHasCampus && effectiveUser?.is_campus_active);
    const isGroovelabActive = Boolean(schoolHasGroove && effectiveUser?.is_groovelab_active);

    if (isMasterAdmin) {
      sessionStorage.setItem('groovelab_active_workspace', 'master_admin');
      sessionStorage.setItem('groovelab_active_platform', 'campus');
      setActivePlatform('campus');
    } else if (currentRole === 'admin' || currentRole === 'secretary') {
      // Admins & Secretaries always land in Campus Briefing
      sessionStorage.setItem('groovelab_active_workspace', 'secretary');
      sessionStorage.setItem('groovelab_active_platform', 'campus');
      sessionStorage.setItem('campus_active_tab', 'briefing');
      sessionStorage.setItem('groovelab_secretary_subtab', 'briefing');
      setActivePlatform('campus');
      setActiveStudentTab('briefing');
    } else if (isCampusActive || currentRole === 'student' || currentRole === 'teacher') {
      // 1. Campus -> Briefing Board is ALWAYS the default start page upon login for all users (teachers, students, admins, secretaries)
      sessionStorage.setItem('groovelab_active_platform', 'campus');
      const startCampusTab = 'briefing';
      sessionStorage.setItem('campus_active_tab', startCampusTab);
      sessionStorage.setItem('groovelab_active_tab', startCampusTab);
      setActivePlatform('campus');
      setActiveStudentTab(startCampusTab);
    } else if (isGroovelabActive) {
      // 2. GrooveLab -> Live Lab Board
      sessionStorage.setItem('groovelab_active_platform', 'groovelab');
      sessionStorage.setItem('groovelab_active_tab', 'live');
      setActivePlatform('groovelab');
      setActiveStudentTab('live');
    } else {
      // 3. Fallback: QR Landingpage
      sessionStorage.setItem('groovelab_active_platform', 'campus');
      sessionStorage.setItem('campus_active_tab', 'qr_landing');
      setActivePlatform('campus');
      setActiveStudentTab('qr_landing');
    }

    // Force checkout from active sessions for Campus logins / Admins / Secretaries to prevent automatic check-in visibility (non-blocking)
    const isCampus = activePlatform === 'campus' || currentRole === 'admin' || currentRole === 'secretary';
    if (isCampus) {
      supabase
        .from('sessions')
        .update({ check_out_time: new Date().toISOString() })
        .eq('user_id', userId)
        .is('check_out_time', null)
        .then(() => {})
        .catch(() => {});
    }

    const resolvedRole = (effectiveUser?.role || currentRole || '').toLowerCase();
    const isStaff = resolvedRole === 'teacher' || resolvedRole === 'admin' || resolvedRole === 'secretary';
    const mode = (isStaff && activePlatform === 'groovelab') ? 'lab' : (isHome ? 'home' : 'lab');
    
    // If we are switching profiles, mark the OLD one as offline first (excluding teachers, non-blocking)
    if (loggedInUserId && loggedInUserId !== userId && user?.role !== 'teacher') {
      const pastDate = new Date(Date.now() - 10 * 60000).toISOString();
      supabase.from('users').update({ last_seen: pastDate }).eq('id', loggedInUserId).then(() => {}).catch(() => {});
    }

    // Store in sessionStorage per-tab so each browser tab is 100% isolated
    sessionStorage.setItem('groovelab_user_id', userId);
    sessionStorage.setItem('groovelab_location_mode', mode);
    if (effectiveUser) {
      try {
        const isStudentRole = resolvedRole === 'student';
        const userToCache = isStudentRole ? { ...effectiveUser, last_name: undefined } : effectiveUser;
        sessionStorage.setItem('groovelab_cached_user', JSON.stringify(userToCache));
        updateUserRaw(effectiveUser);
      } catch (e) {}
    }

    // Default start tab: Always open the briefing board for all users in Campus, and for staff/teachers in GrooveLab.
    // GrooveLab students start on the 'live' tab.
    
    // Check if the user selected 'groovelab' on the login screen
    let selectedPlat = sessionStorage.getItem('groovelab_active_platform') || 'campus';
    if (!localIsKioskMode && (resolvedRole === 'student' || resolvedRole === 'teacher')) {
      selectedPlat = 'campus';
      sessionStorage.setItem('groovelab_active_platform', 'campus');
    } else if (localIsKioskMode) {
      selectedPlat = 'groovelab';
      sessionStorage.setItem('groovelab_active_platform', 'groovelab');
    }
    
    if (isMasterAdmin) {
      sessionStorage.setItem('groovelab_active_workspace', 'master_admin');
      sessionStorage.setItem('groovelab_is_master_admin', 'true');
      sessionStorage.setItem('campus_active_tab', 'briefing');
    } else if (resolvedRole === 'student') {
      sessionStorage.setItem('groovelab_active_workspace', 'student');
      if (selectedPlat === 'groovelab') {
        sessionStorage.setItem('groovelab_active_tab', 'live');
      } else {
        sessionStorage.setItem('campus_active_tab', 'briefing');
        sessionStorage.setItem('groovelab_active_tab', 'briefing');
      }
    } else if (resolvedRole === 'teacher') {
      sessionStorage.setItem('groovelab_active_workspace', 'teacher');
      if (selectedPlat === 'groovelab') {
        sessionStorage.setItem('groovelab_active_tab', 'live');
      } else {
        sessionStorage.setItem('campus_active_tab', 'briefing');
        sessionStorage.setItem('groovelab_active_tab', 'briefing');
      }
    } else if (resolvedRole === 'secretary' || resolvedRole === 'admin') {
      sessionStorage.setItem('groovelab_active_workspace', 'secretary');
      sessionStorage.setItem('groovelab_secretary_subtab', 'briefing');
      sessionStorage.setItem('campus_active_tab', 'briefing');
    } else {
      if (selectedPlat === 'campus') {
        sessionStorage.setItem('campus_active_tab', 'briefing');
      } else {
        sessionStorage.setItem('groovelab_active_tab', 'live');
      }
    }
    
    const resolvedPlatform = selectedPlat;
    const startTab = (resolvedPlatform === 'groovelab') ? 'live' : 'briefing';
    setActiveStudentTab(startTab);

    // Immediate Heartbeat on Login (non-blocking for instantaneous login transition! Excludes teachers under TVöD § 26 BDSG)
    if (resolvedRole !== 'teacher') {
      supabase
        .from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId)
        .then(() => {})
        .catch(() => {});
    }
      
    // 🛡️ Forensische URL-Sanitization: Bereinigt Query-Params und leitet autoritativ auf /dashboard
    setTimeout(() => {
      if (window.location.pathname !== '/dashboard') {
        window.location.replace(window.location.origin + '/dashboard');
      } else {
        window.location.reload();
      }
    }, 10);
  }, [
    supabase,
    stationIdFromStorage,
    setStationIdFromStorage,
    setLoggedInUserIdRaw,
    isLocalhost,
    setDeletionPromptUserId,
    setDeletionPromptIsHome,
    setShowDeletionPrompt,
    setActiveWorkspace,
    setActivePlatform,
    setActiveStudentTab,
    activePlatform,
    loggedInUserId,
    user?.role,
    updateUserRaw
  ]);

  return {
    handleLogout,
    handleLogin
  };
}
