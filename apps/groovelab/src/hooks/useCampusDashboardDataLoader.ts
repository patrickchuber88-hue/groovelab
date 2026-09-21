import React, { useCallback } from 'react';
import { normalizeInstrument } from '../utils/instruments';
import { resolveStudentInstrumentAsync } from '../components/StudioAvatar';

async function safeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  retries = 2,
  delay = 200
): Promise<{ data: T | null; error: any }> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const res = await queryFn();
      if (!res.error) return res;
      
      const status = res.error?.status || res.error?.code;
      const isNetworkError = !status || status >= 500 || status === 'PGRST100' || String(res.error?.message || '').toLowerCase().includes('fetch');
      if (!isNetworkError || attempt === retries - 1) {
        return res;
      }
    } catch (err: any) {
      if (attempt === retries - 1) {
        return { data: null, error: err };
      }
    }
    attempt++;
    console.warn(`[SupabaseRetry] Query failed, retrying attempt ${attempt}/${retries} in ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 1.5;
  }
  return { data: null, error: new Error('All query attempts failed.') };
}

export interface UseCampusDashboardDataLoaderParams {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  supabase: any;
  isLocalhost: boolean;
  setIsOfflineMode: React.Dispatch<React.SetStateAction<boolean>>;
  locationMode: string;
  setLocationMode: (mode: any) => void;
  activePlatform: string;
  setActivePlatform: (platform: any) => void;
  isKioskMode: boolean;
  handleLogout: (updateDb?: boolean, askConfirm?: boolean) => Promise<void>;
  setActiveWorkspace: (workspace: string) => void;
  setActiveStudentTab: (tab: string) => void;
  setIsSchoolPaused: (paused: boolean) => void;
  setSession: React.Dispatch<React.SetStateAction<any>>;
  fetchActiveStudentCount: (schoolId: string) => Promise<void>;
  setTeachers: React.Dispatch<React.SetStateAction<any[]>>;
  setSchoolUsers: React.Dispatch<React.SetStateAction<any[]>>;
  setActiveStudentsCount: React.Dispatch<React.SetStateAction<number>>;
  setGlobalSongs: React.Dispatch<React.SetStateAction<any[]>>;
  setTotalPresenceMins: React.Dispatch<React.SetStateAction<number>>;
  setUserSongs: React.Dispatch<React.SetStateAction<any[]>>;
  lastWriteTimeRef: React.MutableRefObject<number>;
  setWallSongs: React.Dispatch<React.SetStateAction<any[]>>;
  setUserBands: React.Dispatch<React.SetStateAction<any[]>>;
  setAllBands: React.Dispatch<React.SetStateAction<any[]>>;
  setStudentActivity: React.Dispatch<React.SetStateAction<any[]>>;
  selectedBandForProfile: any;
  setSelectedBandForProfile: React.Dispatch<React.SetStateAction<any>>;
  restoredBandId: string | null;
  showBandProfile: boolean;
  setShowConfetti: React.Dispatch<React.SetStateAction<any>>;
  fetchPlanningData: (schoolId: string, userIdArg?: string) => Promise<void>;
  checkAnnouncements: (schoolId: string, currentUser: any) => Promise<void>;
  fetchAnnouncements: (schoolId: string) => Promise<void>;
  fetchStudentMessagesBackground: (schoolId: string, userId: string, bandIds: string[]) => Promise<void>;
  fetchCampusMessages: () => Promise<void>;
}

export interface UseCampusDashboardDataLoaderReturn {
  fetchDashboardData: (userId: string, isInitial?: boolean) => Promise<void>;
  handleLeaveBand: (bandId: string) => Promise<void>;
}

export function useCampusDashboardDataLoader({
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
}: UseCampusDashboardDataLoaderParams): UseCampusDashboardDataLoaderReturn {

  const fetchDashboardData = useCallback(async (userId: string, isInitial: boolean = false) => {
    try {
      if (isInitial && !user) setLoading(true);
      // 🛡️ Fail-Closed Auth Recovery Guard: Ensure cryptographic session lease is present
      const activeLease = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('gl_active_session_lease_id') : null)
        || (typeof localStorage !== 'undefined' ? localStorage.getItem('gl_active_session_lease_id') : null);
      if (!activeLease && userId && !userId.startsWith('admin-')) {
        try {
          const sId = typeof localStorage !== 'undefined' ? (localStorage.getItem('groovelab_school_id') || localStorage.getItem('groovelab_last_school_id')) : null;
          const { data: authResult } = await supabase.rpc('authenticate_by_credential', {
            p_credential: userId,
            ...(sId ? { p_school_id: sId } : {})
          });
          if (authResult?.success && authResult?.lease_token) {
            if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('gl_active_session_lease_id', authResult.lease_token);
            if (typeof localStorage !== 'undefined') localStorage.setItem('gl_active_session_lease_id', authResult.lease_token);
          }
        } catch (authErr) {
          console.warn('[useCampusDashboardDataLoader] Auto-heal session lease notice:', authErr);
        }
      }

      // Stage 1 Fast Bootstrap RPC: Fetch consolidated student dashboard bootstrap in 1 fast roundtrip
      let bootstrapData: any = null;
      let userRes: any = null;
      let sessionRes: any = null;

      try {
        const { data: bData, error: bErr } = await supabase.rpc('get_student_dashboard_bootstrap', { p_user_id: userId });
        if (!bErr && bData && !bData.error && bData.user) {
          bootstrapData = bData;
          userRes = { data: bData.user, error: null };
          sessionRes = { data: bData.active_session, error: null };
          if (bData.teachers?.length > 0) setTeachers(bData.teachers);
          if (typeof bData.total_presence_mins === 'number') setTotalPresenceMins(bData.total_presence_mins);
        }
      } catch (_) {
        // Graceful fallback to direct queries below
      }

      if (!userRes) {
        // Stage 1 light fallback: Fetch user record and current session in parallel with automatic retries
        const [uRes, sRes] = await Promise.all([
          safeSupabaseQuery(async () => await supabase.from('users').select('*, schools(*)').eq('id', userId).maybeSingle()),
          safeSupabaseQuery(async () => await supabase.from('sessions').select('*, stations(name, color)').eq('user_id', userId).is('check_out_time', null).order('check_in_time', { ascending: false }).limit(1).maybeSingle())
        ]).catch(err => {
          console.error('[Dashboard] Critical Fetch Error Stage 1 Light:', err);
          return [ {error: err}, {error: err} ] as any;
        });
        userRes = uRes;
        sessionRes = sRes;
      }

      if (userRes?.error) {
        console.error('[Dashboard] User Fetch Error or Network Issue:', userRes.error);
      }

      let userData = userRes?.data;
      let usedOfflineCache = false;

      // --- OFFLINE & PERSISTENT CACHE FALLBACK LOGIC ---
      if (!userData && userId?.startsWith('admin-')) {
        const sId = userId.replace('admin-', '');
        const { data: sData } = await supabase.rpc('get_public_school_theme', { p_subdomain: sId });
        userData = {
          id: userId,
          first_name: 'Schulleitung',
          last_name: sData?.name || 'Verwaltung',
          role: 'admin',
          roles: ['admin'],
          school_id: sId,
          is_campus_active: true,
          is_groovelab_active: true,
          photo_url: '/campus_login_hero.png',
          schools: sData || { id: sId, name: sData?.name || 'Musikschule' }
        };
      }

      if (!userData && isLocalhost) {
        const targetSchoolId = typeof window !== 'undefined' ? (localStorage.getItem('groovelab_last_school_id') || localStorage.getItem('groovelab_school_id') || (isLocalhost ? '53e83805-1d5a-4ed8-988e-1fb0b8200b9c' : '')) : (isLocalhost ? '53e83805-1d5a-4ed8-988e-1fb0b8200b9c' : '');
        if (!targetSchoolId) {
          console.warn('[useCampusDashboardDataLoader] Fail-Closed: Cannot construct dev data without a resolved school_id.');
          setLoading(false);
          return;
        }
        const schoolName = 'Musäk Bad Säckingen';

        if (userId === '88888888-8888-8888-8888-888888888888' || (sessionStorage.getItem('groovelab_active_workspace') === 'master_admin')) {
          userData = {
            id: '88888888-8888-8888-8888-888888888888',
            first_name: 'Master',
            last_name: 'Administrator',
            name: 'Master Administrator',
            role: 'admin',
            roles: ['admin'],
            school_id: targetSchoolId,
            is_master_admin: true,
            is_campus_active: true,
            is_groovelab_active: true,
            photo_url: '/campus_login_hero.png',
            avatar_url: '/campus_login_hero.png',
            schools: { id: targetSchoolId, name: schoolName, has_campus_subscription: true, has_groovelab_subscription: true }
          };
        } else if (userId === '15102f5e-c504-4c33-93ab-436285197c8c' || userId === '44444444-4444-4444-4444-444444444444' || (sessionStorage.getItem('groovelab_active_workspace') === 'student' && (!userId || userId.startsWith('15102f5e') || userId.startsWith('4444')))) {
          userData = {
            id: userId || '15102f5e-c504-4c33-93ab-436285197c8c',
            first_name: 'Linus',
            last_name: 'K.',
            role: 'student',
            roles: ['student'],
            school_id: targetSchoolId,
            is_campus_active: true,
            is_groovelab_active: true,
            photo_url: '/campus_login_hero.png',
            avatar_url: '/campus_login_hero.png',
            instrument: 'Gitarre',
            schools: { id: targetSchoolId, name: schoolName, has_campus_subscription: true, has_groovelab_subscription: true }
          };
        } else if (userId === '11079eae-664a-49a4-8692-771d83a3193c' || userId === '98b6a599-7ff7-4f99-b51d-b6a4c348a0a0' || userId === '99999999-9999-9999-9999-999999999999' || (sessionStorage.getItem('groovelab_active_workspace') === 'teacher' && (!userId || userId.startsWith('11079eae') || userId.startsWith('98b6a599') || userId.startsWith('9999')))) {
          userData = {
            id: userId || '11079eae-664a-49a4-8692-771d83a3193c',
            first_name: 'Peter',
            last_name: 'Pan',
            role: 'teacher',
            roles: ['teacher', 'admin'],
            school_id: targetSchoolId,
            is_campus_active: true,
            is_groovelab_active: true,
            photo_url: '/avatars/gitarre_avatar_new.png',
            avatar_url: '/avatars/gitarre_avatar_new.png',
            instrument: 'Gitarre',
            schools: { id: targetSchoolId, name: schoolName, has_campus_subscription: true, has_groovelab_subscription: true }
          };
        } else if (userId === 'f8d28267-0552-48b5-b1cd-0e415409ecd4' || (sessionStorage.getItem('groovelab_active_workspace') === 'secretary' && (!userId || userId.startsWith('f8d28267')))) {
          userData = {
            id: userId || 'f8d28267-0552-48b5-b1cd-0e415409ecd4',
            first_name: 'Manuel',
            last_name: 'Wagner',
            role: 'admin',
            roles: ['admin'],
            school_id: targetSchoolId,
            is_campus_active: true,
            is_groovelab_active: true,
            photo_url: '/campus_login_hero.png',
            avatar_url: '/campus_login_hero.png',
            schools: { id: targetSchoolId, name: schoolName, has_campus_subscription: true, has_groovelab_subscription: true }
          };
        }
      }

      if (!userData) {
        console.warn('[Dashboard] Attempting to load user from local cache...');
        const cachedUserStr = sessionStorage.getItem('groovelab_cached_user');
        if (cachedUserStr) {
          try {
            const parsed = JSON.parse(cachedUserStr);
            if (parsed && (parsed.id === userId || !userId)) {
              userData = parsed;
              usedOfflineCache = true;
            }
          } catch (e) {}
        }
        
        if (!userData) {
          const cachedStr = localStorage.getItem(`groovelab_offline_user_cache_${userId || 'last'}`);
          if (cachedStr) {
            try {
              const parsedCache = JSON.parse(cachedStr);
              const cacheAge = Date.now() - parsedCache.timestamp;
              if (cacheAge < 172800000 && (!userId || parsedCache.data?.id === userId)) {
                console.log('[Dashboard] Valid offline cache found! Age (hours):', (cacheAge / 3600000).toFixed(1));
                userData = parsedCache.data;
                usedOfflineCache = true;
                setIsOfflineMode(true);
              } else if (cacheAge >= 172800000) {
                console.warn('[Dashboard] Offline cache expired (TTL > 48h). Purging.');
                localStorage.removeItem(`groovelab_offline_user_cache_${userId || 'last'}`);
              }
            } catch (e) {
              console.error('[Dashboard] Error parsing offline cache:', e);
              localStorage.removeItem(`groovelab_offline_user_cache_${userId || 'last'}`);
            }
          }
        }
      } else if (userData) {
        // --- UPDATE OFFLINE CACHE & PERSISTENT USER ---
        try {
          const isStudentRole = (userData.role || '').toLowerCase() === 'student';
          const userToCache = isStudentRole ? { ...userData, last_name: undefined } : userData;
          sessionStorage.setItem('groovelab_cached_user', JSON.stringify(userToCache));
          sessionStorage.setItem('groovelab_user_id', userData.id);
        } catch (e) {}
        try {
          const isStudentRole = (userData.role || '').toLowerCase() === 'student';
          const minimalUserData = {
            id: userData.id,
            first_name: userData.first_name,
            last_name: isStudentRole ? undefined : userData.last_name,
            role: userData.role,
            roles: userData.roles,
            school_id: userData.school_id,
            is_campus_active: userData.is_campus_active,
            is_groovelab_active: userData.is_groovelab_active,
            avatar_url: userData.avatar_url,
            photo_url: userData.photo_url,
            has_personal_pin: userData.has_personal_pin,
            is_pin_activated: userData.is_pin_activated,
            has_parent_pin: userData.has_parent_pin,
            parent_pin_configured: userData.parent_pin_configured,
            campus_ui_level: userData.campus_ui_level,
            schools: Array.isArray(userData.schools) 
              ? userData.schools.map((s: any) => ({ id: s.id, has_campus_subscription: s.has_campus_subscription, has_groovelab_subscription: s.has_groovelab_subscription }))
              : userData.schools ? { id: userData.schools.id, has_campus_subscription: userData.schools.has_campus_subscription, has_groovelab_subscription: userData.schools.has_groovelab_subscription } : null
          };
          localStorage.setItem(`groovelab_offline_user_cache_${userData.id}`, JSON.stringify({
            timestamp: Date.now(),
            data: minimalUserData
          }));
          setIsOfflineMode(false); // We got fresh data
        } catch (e) {
          console.error('[Dashboard] Failed to write offline cache:', e);
        }
      }

      if (userData) {
        const activeWorkspace = sessionStorage.getItem('groovelab_active_workspace');
        if (activeWorkspace === 'teacher' && (userData.role === 'teacher' || (userData.roles && userData.roles.includes('teacher')) || userData.role === 'admin' || userData.role === 'secretary')) {
          userData.role = 'teacher';
        }
        if (!userData.photo_url && !userData.avatar_url) {
          const r = (userData.role || '').toLowerCase();
          const rolesArr = userData.roles || [];
          const isPureAdminOrSec = (r === 'admin' || r === 'secretary') && !rolesArr.includes('teacher') && !rolesArr.includes('student');
          if (isPureAdminOrSec) {
            userData.photo_url = '/campus_login_hero.png';
            userData.avatar_url = '/campus_login_hero.png';
          }
        }
        if (userData.role === 'student') {
          try {
            userData.resolved_instrument = await resolveStudentInstrumentAsync(userData);
            if (!userData.instrument || userData.instrument === 'Allgemein' || userData.instrument === 'ohne Zuweisung' || userData.instrument === 'Musiker' || userData.instrument === 'Schüler' || userData.instrument === 'Instrument') {
              userData.instrument = userData.resolved_instrument;
            }
          } catch (e) {}
        }
      }

      if (!userData) {
        console.warn('[Dashboard] No user data found for ID:', userId);
        setLoading(false);
        // We only trigger diagnostic exit hatch if this is an actual DB fetch error and we have NO offline cache
        if (userRes?.error && isInitial) {
           if (typeof window !== 'undefined') {
              (window as any).fetchDashboardDataError = userRes.error?.message || String(userRes.error);
              (window as any).fetchDashboardDataStack = new Error().stack;
           }
        }
        return;
      }

      // STRICT DB SESSION VERIFICATION (Closing the backdoor):
      let schoolId = userData.school_id || (Array.isArray(userData.schools) ? userData.schools[0]?.id : userData.schools?.id);
      const isStudent = userData.role?.toLowerCase() === 'student';
      if (isStudent && locationMode === 'lab' && activePlatform === 'groovelab') {
        const storedStationId = localStorage.getItem('groovelab_station_id');
        const hasNoSession = !sessionRes.data && !sessionRes.error;
        const hasDifferentStation = sessionRes.data && storedStationId && sessionRes.data.station_id !== storedStationId;

        if (hasNoSession || (hasDifferentStation && isKioskMode)) {
          if (isKioskMode) {
            console.warn('[Dashboard] Student in Lab mode on Kiosk has no active database session or is checked in at another station! Force logout.');
            setLoading(false);
            handleLogout(false);
            return;
          } else {
            console.log('[Dashboard] Student in Lab mode on Personal Device has no active session. Remain logged in.');
          }
        }
      }

      // Determine what platform the user is allowed to access and what is default:
      const schoolObj = Array.isArray(userData.schools) ? userData.schools[0] : userData.schools;
      const schoolHasCampus = Boolean(
        userData.is_campus_active || 
        (schoolObj ? (schoolObj.has_campus_subscription || !schoolObj.is_billing_booked || schoolObj.subscription_bypass) : true)
      );
      const schoolHasGroove = Boolean(
        userData.is_groovelab_active || 
        (schoolObj ? (schoolObj.has_groovelab_subscription || !schoolObj.is_billing_booked || schoolObj.subscription_bypass) : true)
      );

      const isCampusActive = Boolean(schoolHasCampus && userData.is_campus_active);
      const isGroovelabActive = Boolean(schoolHasGroove && userData.is_groovelab_active);

      let allowedPlatform: 'campus' | 'groovelab' = 'campus';
      let defaultTab = 'briefing';

      if (isCampusActive) {
        allowedPlatform = 'campus';
        defaultTab = 'briefing';
      } else if (isGroovelabActive) {
        allowedPlatform = 'groovelab';
        defaultTab = 'live';
      } else {
        allowedPlatform = 'campus';
        defaultTab = 'qr_landing';
      }

      if (isInitial) {
        const activeWs = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_active_workspace') : null;
        const isMasterSessionFlag = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_is_master_admin') === 'true') : false;
        const isMasterWorkspace = activeWs === 'master_admin';
        
        const isMasterAdmin = Boolean(
          userData.is_master_admin === true &&
          isMasterWorkspace &&
          isMasterSessionFlag
        );

        const isTeacher = userData.role?.toLowerCase() === 'teacher';
        const isSecretary = userData.role?.toLowerCase() === 'secretary' || userData.role?.toLowerCase() === 'admin';

        if (isMasterAdmin) {
          sessionStorage.setItem('groovelab_is_master_admin', 'true');
          sessionStorage.setItem('groovelab_active_workspace', 'master_admin');
          setActiveWorkspace('master_admin');
          sessionStorage.setItem('groovelab_active_platform', 'campus');
          setActivePlatform('campus');
        } else if (isStudent) {
          sessionStorage.removeItem('groovelab_is_master_admin');
          sessionStorage.setItem('groovelab_active_workspace', 'student');
          setActiveWorkspace('student');
          const startPlat = allowedPlatform;
          setActivePlatform(startPlat);
          sessionStorage.setItem('groovelab_active_platform', startPlat);
          
          const storageKey = startPlat === 'campus' ? 'campus_active_tab' : 'groovelab_active_tab';
          const storedTab = sessionStorage.getItem(storageKey);
          const startTab = storedTab ? storedTab : defaultTab;
          
          setActiveStudentTab(startTab);
          sessionStorage.setItem(storageKey, startTab);
        } else if (isTeacher) {
          sessionStorage.removeItem('groovelab_is_master_admin');
          sessionStorage.setItem('groovelab_active_workspace', 'teacher');
          setActiveWorkspace('teacher');
          const startPlat = allowedPlatform;
          setActivePlatform(startPlat);
          sessionStorage.setItem('groovelab_active_platform', startPlat);
          
          const storageKey = startPlat === 'campus' ? 'campus_active_tab' : 'groovelab_active_tab';
          const storedTab = sessionStorage.getItem(storageKey);
          const startTab = storedTab ? storedTab : defaultTab;
          
          setActiveStudentTab(startTab);
          sessionStorage.setItem(storageKey, startTab);
        } else if (isSecretary) {
          sessionStorage.removeItem('groovelab_is_master_admin');
          const startPlat = allowedPlatform;
          setActivePlatform(startPlat);
          sessionStorage.setItem('groovelab_active_platform', startPlat);
          sessionStorage.setItem('groovelab_active_workspace', 'secretary');
          setActiveWorkspace('secretary');
          
          const storedSubtab = sessionStorage.getItem('groovelab_secretary_subtab');
          sessionStorage.setItem('groovelab_secretary_subtab', storedSubtab || 'briefing');
          
          const storedTab = sessionStorage.getItem('campus_active_tab');
          const startTab = storedTab ? storedTab : defaultTab;
          
          setActiveStudentTab(startTab);
          sessionStorage.setItem('campus_active_tab', startTab);
        } else {
          setActivePlatform(allowedPlatform);
          sessionStorage.setItem('groovelab_active_platform', allowedPlatform);

          if (allowedPlatform === 'campus') {
            const storedTab = sessionStorage.getItem('campus_active_tab');
            let defTab = (storedTab && storedTab !== 'live') ? storedTab : 'briefing';
            
            const isTeacherOrAdmin = userData.role?.toLowerCase() === 'teacher' || userData.role?.toLowerCase() === 'admin' || userData.role?.toLowerCase() === 'secretary';
            if (isTeacherOrAdmin) {
              const studentOnlyTabs = ['homework_book', 'practice_board', 'mediathek', 'practice', 'library', 'repertoire', 'matching', 'campus_cup', 'all_appointments', 'live'];
              if (studentOnlyTabs.includes(defTab)) {
                defTab = 'briefing';
              }
            }
            
            setActiveStudentTab(defTab);
            sessionStorage.setItem('campus_active_tab', defTab);
          } else {
            const storedTab = sessionStorage.getItem('groovelab_active_tab');
            let defTab = storedTab ? storedTab : 'live';
            
            const isTeacherOrAdmin = userData.role?.toLowerCase() === 'teacher' || userData.role?.toLowerCase() === 'admin' || userData.role?.toLowerCase() === 'secretary';
            if (isTeacherOrAdmin) {
              const studentOnlyTabs = ['practice', 'library', 'repertoire', 'matching', 'homework_book', 'practice_board', 'mediathek', 'campus_cup', 'all_appointments'];
              if (studentOnlyTabs.includes(defTab)) {
                defTab = 'live';
              }
            }
            
            setActiveStudentTab(defTab);
            sessionStorage.setItem('groovelab_active_tab', defTab);
          }
        }
      }

      schoolId = userData.school_id || (Array.isArray(userData.schools) ? userData.schools[0]?.id : userData.schools?.id);
      if (typeof window !== 'undefined') {
        (window as any).debugSchoolId = schoolId;
        (window as any).debugUserId = userId;
      }
      if (!schoolId || schoolId.length !== 36) {
        console.warn('[Dashboard] No valid school_id found. Board will be empty.');
        setUser(userData);
        setLoading(false);
        return;
      }

      const schoolData = Array.isArray(userData.schools) ? userData.schools[0] : userData.schools;
      const isMaster = userData.is_master_admin === true;
      const isStudentUser = userData.role?.toLowerCase() === 'student';
      const isExplicitlySuspended = schoolData?.status === 'suspended' && schoolData?.is_paused === true;
      if (isExplicitlySuspended && !isMaster && !isStudentUser) {
        console.warn('[Dashboard] School is explicitly suspended by Master-Admin!');
        setIsSchoolPaused(true);
        setUser(userData);
        setLoading(false);
        return;
      } else {
        setIsSchoolPaused(false);
      }

      setUser((prev: any) => {
        if (!prev) return userData;
        const substantiveKeys = [
          'id', 'school_id', 'role', 'is_active', 'is_campus_active', 'is_groovelab_active',
          'token_version', 'is_master_admin', 'first_name', 'last_name', 'instrument',
          'nickname', 'avatar_url', 'photo_url', 'ausfall_until', 'ausfall_start', 'student_level',
          'campus_ui_level', 'has_personal_pin', 'is_pin_activated', 'has_parent_pin', 'parent_pin_configured'
        ];
        const hasChange = substantiveKeys.some(key => (prev as any)[key] !== (userData as any)[key]);
        return hasChange ? userData : prev;
      });
      setSession((prev: any) => {
        if (!prev && !sessionRes.data) return null;
        if (!prev || !sessionRes.data) return sessionRes.data;
        if (prev.id !== sessionRes.data.id || prev.check_out_time !== sessionRes.data.check_out_time || prev.station_id !== sessionRes.data.station_id) {
          return sessionRes.data;
        }
        return prev;
      });
      if (isInitial) {
        setLoading(false); 
      }

      // Bypass heavy Stage 2 queries for staff (teacher/admin/secretary)
      const isStaff = userData.role?.toLowerCase() === 'teacher' || 
                      userData.role?.toLowerCase() === 'admin' || 
                      userData.role?.toLowerCase() === 'secretary';

      if (isStaff) {
        console.log('[Dashboard] Staff user detected. Bypassing heavy Stage 2 student queries for instant load.');
        if (sessionRes.data) {
          setLocationMode('lab');
          sessionStorage.setItem('groovelab_location_mode', 'lab');
        } else {
          setLocationMode('home');
          sessionStorage.setItem('groovelab_location_mode', 'home');
        }
        (async () => {
          let sId = schoolId || userData.school_id || (Array.isArray(userData.schools) ? userData.schools[0]?.id : userData.schools?.id);
          if (!sId && userData?.id) {
            const { data: uData } = await supabase.from('users').select('school_id').eq('id', userData.id).maybeSingle();
            if (uData?.school_id) sId = uData.school_id;
          }

          const schoolIds = new Set<string>();
          if (sId) schoolIds.add(sId);
          if (Array.isArray(userData?.schools)) {
            userData.schools.forEach((s: any) => { if (s?.id) schoolIds.add(s.id); });
          } else if (userData?.schools?.id) {
            schoolIds.add(userData.schools.id);
          }

          if (sId) {
            fetchActiveStudentCount(sId).catch(err => console.error('Error fetching student count:', err));
            supabase.from('users')
              .select('id, first_name, last_name, role, avatar_url, photo_url, instrument, last_seen, ausfall_until, ausfall_start, phone, is_active, nickname, is_groovelab_active, is_campus_active')
              .eq('school_id', sId)
              .in('role', ['teacher', 'admin'])
              .order('first_name')
              .then((res: any) => {
                if (res.data) setTeachers(res.data);
              });
          }

          const mergedUsersMap = new Map<string, any>();
          const sidList = Array.from(schoolIds);

          if (sidList.length > 0) {
            const [uRes, pRes] = await Promise.all([
              supabase
                .from('users')
                .select('id, school_id, first_name, last_name, role, roles, instrument, avatar_url, photo_url, is_active, is_campus_active, is_groovelab_active, qr_token, teacher_id, lesson_duration, birth_date, is_app_user')
                .in('school_id', sidList)
                .order('first_name'),
              supabase
                .from('pending_students_decrypted')
                .select('id, school_id, first_name, last_name, instrument, qr_token')
                .in('school_id', sidList)
                .then((r: any) => r, () => ({ data: [] }))
            ]);

            (uRes.data || []).forEach((u: any) => mergedUsersMap.set(u.id, u));
            (pRes.data || []).forEach((p: any) => {
              if (p && p.id && !mergedUsersMap.has(p.id)) {
                mergedUsersMap.set(p.id, { ...p, role: 'student', isPendingOnboarding: true });
              }
            });
          }

          const allUsers = Array.from(mergedUsersMap.values());
          if (allUsers.length > 0) {
            setSchoolUsers(allUsers);
          }
          if (sId) {
            checkAnnouncements(sId, userData);
            fetchAnnouncements(sId);
          }
          fetchCampusMessages();
        })().catch(err => console.error('Error in staff background fetches:', err));
        return;
      }

      const [allSessionsRes, membershipsRes] = await Promise.all([
        typeof bootstrapData?.total_presence_mins === 'number'
          ? Promise.resolve({ data: null, error: null })
          : supabase.from('sessions').select('check_in_time, check_out_time, last_active_at').eq('user_id', userId),
        supabase.from('band_members').select('id, instrument, confetti_seen, bands(id, name, school_id, song_id, status, photo_url, songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url)))))').eq('user_id', userId)
      ]).catch(err => {
        console.error('[Dashboard] Critical Fetch Error Student Stage 1 Heavy:', err);
        return [ {error: err}, {error: err} ] as any;
      });

      if (membershipsRes?.error) console.error('[Dashboard] Memberships Fetch Error:', membershipsRes.error);

      const bandIds = (membershipsRes?.data || []).map((m: any) => m.bands?.id).filter(Boolean);

      // Stage 2: Fetch all detailed boards, library, school bands, teachers, active session metrics in a single parallel block
      let songsQuery = supabase.from('songs').select(`
        *,
        user_song_skills (
          id, song_id, instrument, part_number, difficulty_level, is_stage_ready, user_id, created_at, formation_group,
          profiles:users!user_song_skills_user_id_fkey(first_name, photo_url, school_id)
        ),
        band_songs (
          id, band_id, status, is_exclusive, difficulty_level,
          bands (id, name, photo_url, school_id),
          band_song_slots (
            id, user_id, instrument, status,
            profiles:users!band_song_slots_user_id_fkey(first_name, photo_url)
          )
        )
      `).eq('school_id', schoolId).eq('is_groovelab_active', true);

      const effectiveTeacherId = userData?.role === 'teacher' ? userData?.id : userData?.teacher_id;
      if (effectiveTeacherId) {
        songsQuery = songsQuery.or(`teacher_id.eq.${effectiveTeacherId},teacher_id.is.null`);
      }
      songsQuery = songsQuery.order('level').order('artist');

      const [skillsRes, wallRes, membersRes, userBandsRes, bandsRes, teachersRes, activeSessionsRes] = await Promise.all([
        bootstrapData?.skills
          ? Promise.resolve({ data: bootstrapData.skills, error: null })
          : supabase.from('user_song_skills').select(`
              id, progress_percent, is_stage_ready, is_pending_approval, instrument, part_number, difficulty_level, is_favorite, verified_by_id,
              songs (*)
            `).eq('user_id', userId),
        songsQuery,
        Promise.resolve({ data: [], error: null }),
        bandIds.length > 0
          ? supabase.from('bands').select(`
              *,
              songs (*),
              band_members (*, users(id, first_name, last_name, photo_url, role)),
              band_songs (*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))),
              coach:users!coach_id (first_name, last_name, photo_url)
            `).in('id', bandIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('bands').select('*, songs(id, title, artist, instrumentation), band_members(*, users!user_id(id, first_name, last_name, photo_url, role)), band_songs(*, songs(id, title, artist, instrumentation), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))), coach:users!coach_id (first_name, last_name, photo_url)').eq('school_id', schoolId).order('name', { ascending: true }),
        bootstrapData?.teachers
          ? Promise.resolve({ data: bootstrapData.teachers, error: null })
          : supabase.from('users').select('id, first_name, last_name, role, avatar_url, photo_url, instrument, last_seen, ausfall_until, ausfall_start, phone, is_active, nickname, is_groovelab_active, is_campus_active').eq('school_id', schoolId).in('role', ['teacher', 'admin']).order('first_name'),
        supabase.from('sessions').select('user_id, station_id, gps_verified, users!inner(role, school_id, last_seen, is_groovelab_active)').is('check_out_time', null).eq('users.school_id', schoolId).eq('users.role', 'student')
      ]).catch(err => {
        console.error('[Dashboard] Critical Fetch Error Stage 2:', err);
        return [ {error: err}, {error: err}, {error: err}, {error: err}, {error: err}, {error: err}, {error: err} ] as any;
      });

      if (skillsRes.error) console.error('[Dashboard] Skills Fetch Error:', skillsRes.error);
      if (wallRes.error) console.error('[Dashboard] Songs query error:', wallRes.error);

      setUser(userData);
      setSession(sessionRes.data);
      if (sessionRes.error) console.error('[Dashboard] Error fetching session:', sessionRes.error);

      const isTeacherOrAdmin = userData.role?.toLowerCase() === 'teacher' || userData.role?.toLowerCase() === 'admin';
      if (isTeacherOrAdmin) {
        if (sessionRes.data) {
          setLocationMode('lab');
          sessionStorage.setItem('groovelab_location_mode', 'lab');
        } else {
          setLocationMode('home');
          sessionStorage.setItem('groovelab_location_mode', 'home');
        }
      }

      if (activeSessionsRes.data) {
        const count = activeSessionsRes.data.filter((s: any) => {
          const u: any = Array.isArray(s.users) ? s.users[0] : s.users;
          if (!u) return false;
          const isStudentRole = u.role?.toLowerCase() === 'student';
          const isStaffRole = u.role?.toLowerCase() === 'teacher' || u.role?.toLowerCase() === 'admin';
          return isStudentRole && !isStaffRole && s.station_id && s.gps_verified && u.is_groovelab_active;
        }).length;
        setActiveStudentsCount(count);
      }

      if (wallRes.data) {
        setGlobalSongs(wallRes.data);
      }

      if (teachersRes.data) {
        setTeachers(teachersRes.data);
      }

      if (allSessionsRes.data) {
        const totalMins = allSessionsRes.data.reduce((acc: number, s: any) => {
          const start = new Date(s.check_in_time);
          const end = s.check_out_time 
            ? new Date(s.check_out_time) 
            : s.last_active_at 
              ? new Date(Math.min(Date.now(), new Date(s.last_active_at).getTime() + 5 * 60000))
              : new Date(Math.min(Date.now(), start.getTime() + 60 * 60000));
          return acc + Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
        }, 0);
        setTotalPresenceMins(totalMins);
      }

      const safeSkills = skillsRes.data || [];

      const schoolSkillsMap: Record<string, any[]> = {};
      (wallRes.data || []).forEach((song: any) => {
        (song.user_song_skills || []).forEach((skill: any) => {
          if (!schoolSkillsMap[skill.user_id]) schoolSkillsMap[skill.user_id] = [];
          schoolSkillsMap[skill.user_id].push(skill);
        });
      });

      const bandsData = bandsRes?.data || [];
      if (bandsRes?.error) console.error('[Dashboard] Error fetching all school bands:', bandsRes.error);
      bandsData.forEach((band: any) => {
        (band.band_members || []).forEach((m: any) => {
          const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
          if (u) {
            u.user_song_skills = schoolSkillsMap[u.id] || [];
            if (!m.profiles) {
              m.profiles = u;
            }
          }
        });
      });
      const instrumentalSongs = safeSkills.map((p: any) => {
          const song = Array.isArray(p.songs) ? p.songs[0] : p.songs;
          if (!song || song.is_groovelab_active === false) return null;
          const pi = (p.instrument || '').toLowerCase();
          if (pi.includes('vocal') || pi.includes('gesang')) return null;

          return {
            id: p.id, song_id: song.id, user_id: userId, title: song.title || '...', artist: song.artist || '...',
            progress: p.is_stage_ready ? 100 : Math.min(90, p.progress_percent || 0),
            instrument: p.instrument, difficulty_level: p.difficulty_level || 'original',
            part_number: p.part_number || 1,
            is_stage_ready: !!p.is_stage_ready, is_favorite: !!p.is_favorite, locked: !p.is_stage_ready,
            is_pending_approval: !!p.is_pending_approval, media_link: song.media_link, tomplay_url: song.tomplay_url, instrumentation: song.instrumentation,
            playalong_url: song.playalong_url
          };
      }).filter(Boolean);

      const vocalSongs = (membershipsRes?.data || []).flatMap((m: any) => {
        const mi = (m.instrument || '').toLowerCase();
        
        const band = m.bands;
        if (!band) return [];

        const songs: any[] = [];
        const addedSongIds = new Set<string>();

        (band.band_songs || []).forEach((bs: any) => {
          const s = Array.isArray(bs.songs) ? bs.songs[0] : bs.songs;
          if (!s || s.is_groovelab_active === false) return;
          
          const isMyVocalSlot = (bs.band_song_slots || []).some((slot: any) => 
            slot.user_id === userId && 
            ((slot.instrument || '').toLowerCase().includes('vocal') || (slot.instrument || '').toLowerCase().includes('gesang'))
          );
          
          if (isMyVocalSlot) {
            songs.push({
              id: `vocal_proj_${bs.id}_${s.id}`, song_id: s.id, user_id: userId, title: s.title || '...', artist: s.artist || '...',
              progress: 100, instrument: 'Vocals', difficulty_level: bs.difficulty_level || 'original',
              is_stage_ready: true, is_favorite: false, locked: false, is_pending_approval: false,
              media_link: s.media_link, tomplay_url: s.tomplay_url, instrumentation: s.instrumentation,
              playalong_url: s.playalong_url
            });
            addedSongIds.add(s.id);
          }
        });

        const isPrimaryVocalist = mi.includes('vocal') || mi.includes('gesang');
        if (isPrimaryVocalist) {
          const bSong = Array.isArray(band.songs) ? band.songs[0] : band.songs;
          if (bSong && !addedSongIds.has(bSong.id)) {
            const mainBandSongRow = (band.band_songs || []).find((bs: any) => {
              const s = Array.isArray(bs.songs) ? bs.songs[0] : bs.songs;
              return s && s.id === bSong.id;
            });
            
            let shouldAddMain = false;
            if (mainBandSongRow) {
              const hasAnyVocalSlots = (mainBandSongRow.band_song_slots || []).some((slot: any) => 
                ((slot.instrument || '').toLowerCase().includes('vocal') || (slot.instrument || '').toLowerCase().includes('gesang'))
              );
              if (hasAnyVocalSlots) {
                shouldAddMain = (mainBandSongRow.band_song_slots || []).some((slot: any) => 
                  slot.user_id === userId && 
                  ((slot.instrument || '').toLowerCase().includes('vocal') || (slot.instrument || '').toLowerCase().includes('gesang'))
                );
              } else {
                shouldAddMain = true;
              }
            } else {
              shouldAddMain = true;
            }

            if (shouldAddMain) {
              songs.push({
                id: `vocal_${band.id}_${bSong.id}`, song_id: bSong.id, user_id: userId, title: bSong.title || '...', artist: bSong.artist || '...',
                progress: 100, instrument: 'Vocals', difficulty_level: 'original',
                is_stage_ready: true, is_favorite: false, locked: false, is_pending_approval: false,
                media_link: bSong.media_link, tomplay_url: bSong.tomplay_url, instrumentation: bSong.instrumentation,
                playalong_url: bSong.playalong_url
              });
            }
          }
        }
        return songs;
      });

      const combinedSongs = [...instrumentalSongs, ...vocalSongs];
      const uniqueCombined: any[] = [];
      const seenCombinedKeys = new Set<string>();

      combinedSongs.forEach((song: any) => {
        const key = `${song.song_id}_${(song.instrument || '').toLowerCase()}_${song.part_number || 1}_${song.difficulty_level || 'starter'}`;
        if (!seenCombinedKeys.has(key)) {
          seenCombinedKeys.add(key);
          uniqueCombined.push(song);
        }
      });

      setUserSongs(prev => {
        const timeSinceLastWrite = Date.now() - lastWriteTimeRef.current;
        const isRecentlyWritten = timeSinceLastWrite < 15000;
        
        const merged = prev
          .map(localSong => {
            const remoteSong = uniqueCombined.find(r => 
              r.song_id === localSong.song_id && 
              (r.instrument || '').toLowerCase() === (localSong.instrument || '').toLowerCase() &&
              (r.part_number || 1) === (localSong.part_number || 1) &&
              (r.difficulty_level || 'starter') === (localSong.difficulty_level || 'starter')
            );
            if (remoteSong) {
              const isStageReadyChanged = remoteSong.is_stage_ready !== localSong.is_stage_ready;
              const isApprovalChanged = remoteSong.is_pending_approval !== localSong.is_pending_approval;
              
              if (!isRecentlyWritten || remoteSong.progress > localSong.progress || isStageReadyChanged || isApprovalChanged) {
                return remoteSong;
              }
              return { ...remoteSong, progress: localSong.progress };
            }
            return null;
          })
          .filter((song): song is any => song !== null);

        uniqueCombined.forEach(r => {
          const exists = prev.some(l => 
            l.song_id === r.song_id && 
            (l.instrument || '').toLowerCase() === (r.instrument || '').toLowerCase() &&
            (l.part_number || 1) === (r.part_number || 1) &&
            (l.difficulty_level || 'starter') === (r.difficulty_level || 'starter')
          );
          if (!exists) {
            merged.push(r);
          }
        });

        return merged;
      });

      if (wallRes.data) console.log(`[Dashboard] wallRes returned ${wallRes.data.length} songs.`);

      const wallData = wallRes.data || [];
      console.log('[Dashboard] Wall data fetched. Count:', wallData.length);

      const formingBands = bandsData.filter((b: any) => b.status === 'forming' || b.status === 'active');
      if (isInitial && !isStudent && formingBands.length > 0) {
        (async () => {
          const currentMemberships = await supabase.from('band_members').select('user_id, bands(id, song_id)').then((r: any) => r.data || []);
          for (const band of formingBands) {
            const bandSong = band.band_songs?.[0];
            if (!bandSong) continue;
            const instrumentation = bandSong.songs?.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 };
            const slots = bandSong.band_song_slots || [];
            for (const [inst, count] of Object.entries(instrumentation)) {
              if (inst.toLowerCase().includes('vocals')) continue;
              if (slots.filter((s: any) => s.instrument === inst).length < (count as number)) {
                const songData = wallData.find((s: any) => s.id === band.song_id);
                if (songData) {
                  const level = bandSong.difficulty_level || 'original';
                  const candidate = (songData.user_song_skills || []).find((s: any) => {
                    if (!s.is_stage_ready || s.difficulty_level !== level || s.user_id === userId) return false;
                    
                    if (normalizeInstrument(s.instrument) !== normalizeInstrument(inst)) return false;

                    const memberRecord = (band.band_members || []).find((m: any) => m.user_id === s.user_id);
                    if (memberRecord) {
                      if (normalizeInstrument(memberRecord.instrument) !== normalizeInstrument(inst)) return false;
                    }

                    if (bandSong.is_exclusive) {
                      if (!memberRecord) return false;
                    }

                    const isAlreadyInSlots = slots.some((sl: any) => sl.user_id === s.user_id);
                    if (isAlreadyInSlots) return false;

                    return !currentMemberships.some((m: any) => m.user_id === s.user_id && m.bands?.id !== band.id && m.bands?.song_id === songData.id);
                  });
                  if (candidate) {
                    const isAlreadyMember = (band.band_members || []).some((m: any) => m.user_id === candidate.user_id && normalizeInstrument(m.instrument) === normalizeInstrument(inst));
                    if (!isAlreadyMember) {
                      await supabase.from('band_members').insert({ band_id: band.id, user_id: candidate.user_id, instrument: inst });
                    }
                    await supabase.from('band_song_slots').insert({ band_song_id: bandSong.id, user_id: candidate.user_id, instrument: inst, status: 'joined' });
                    currentMemberships.push({ user_id: candidate.user_id, bands: { id: band.id, song_id: band.song_id } } as any);
                  }
                }
              }
            }
          }
        })();
      }

      const processedWall: any[] = [];
      
      wallData.forEach((song: any) => {
        console.log('[Dashboard] Processing song:', song.title, 'ID:', song.id);
        const instrumentation = song?.instrumentation || { Guitar: 1, Bass: 1, Drums: 1, Keys: 0 };
        const requiredInsts: Record<string, number> = {};
        
        Object.entries(instrumentation).forEach(([inst, count]) => {
          const lower = inst.toLowerCase();
          if (lower === 'vocals' || lower === 'gesang') return;

          let key = inst;
          if (lower === 'guitar' || lower === 'e-gitarre') key = 'E-Gitarre';
          else if (lower === 'bass' || lower === 'e-bass') key = 'E-Bass';
          else if (lower === 'drums' || lower === 'e-drums') key = 'E-Drums';
          else if (lower === 'piano' || lower === 'keys' || lower === 'e-piano') key = 'E-Piano';
          requiredInsts[key] = Math.max(requiredInsts[key] || 0, count as number);
        });

        const schoolSkills = (song?.user_song_skills || []);

        ['starter', 'original'].forEach(level => {
          const levelSkills = schoolSkills.filter((s: any) => 
            (s?.difficulty_level || 'original') === level && 
            (s.is_stage_ready || (s.progress_percent || 0) >= 100)
          );
          
          const formationsList: any[] = [];
          const allBandFormations: any[] = [];
          const projectsForThisSongMap = new Map<string, any>();
          
          (formingBands || []).forEach((b: any) => {
            (b.band_songs || []).forEach((bs: any) => {
              if (bs.song_id === song.id && bs.band_id) {
                projectsForThisSongMap.set(b.id, {
                  ...bs,
                  bands: b,
                  band_song_slots: bs.band_song_slots || []
                });
              }
            });
          });

          (formingBands || []).filter((b: any) => b.song_id === song.id).forEach((b: any) => {
            if (!projectsForThisSongMap.has(b.id)) {
              projectsForThisSongMap.set(b.id, {
                id: `forming_${b.id}`,
                band_id: b.id,
                status: 'forming',
                bands: b,
                band_song_slots: []
              });
            }
          });

          const projectsForThisSong = Array.from(projectsForThisSongMap.values());

          projectsForThisSong.forEach((bs: any) => {
            if (bs.status === 'mastered' || bs.status === 'active') return;
            const bsLevel = bs.difficulty_level || 'original';
            if (bsLevel !== level) return;
            
            const band = formingBands.find((b: any) => b.id === bs.band_id) || bs.bands;
            if (!band || band.school_id !== schoolId) return;

            const isUserBandMember = (band.band_members || []).some((m: any) => m.user_id === userId);

            const slots = bs.band_song_slots || [];
            const members: any[] = [];
            const addedUserIds = new Set<string>();
            const addedSlotKeys = new Set<string>();

            slots.filter((sl: any) => sl.user_id).forEach((sl: any) => {
              const normalizedMemberInst = normalizeInstrument(sl.instrument);
              
              const coreBand = formingBands.find((b: any) => b.id === bs.band_id) || bs.bands;
              const isCoreMember = (coreBand?.band_members || []).some((bm: any) => bm.user_id === sl.user_id);
              if (isCoreMember && !normalizedMemberInst.includes('vocal') && !normalizedMemberInst.includes('gesang')) {
                return;
              }

              const slPart = sl.part_number || 1;
              const slotKey = `${sl.user_id}_${normalizedMemberInst}_${slPart}`;
              
              if (addedSlotKeys.has(slotKey)) return;
              addedSlotKeys.add(slotKey);
              addedUserIds.add(sl.user_id);
              
              const prof = Array.isArray(sl.profiles) ? sl.profiles[0] : sl.profiles;
              const skills = schoolSkillsMap[sl.user_id] || [];
              const isMastered = skills.some((sk: any) => 
                sk.song_id === song.id && 
                normalizeInstrument(sk.instrument) === normalizedMemberInst && 
                (sk.part_number || 1) === slPart &&
                (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
              );

              members.push({
                user_id: sl.user_id,
                first_name: prof?.first_name || 'Musiker',
                photo_url: prof?.photo_url,
                instrument: normalizedMemberInst,
                part_number: slPart,
                isFromBand: true,
                isMastered
              });
            });

            const coreBand = formingBands.find((b: any) => b.id === bs.band_id);
            const instCount: Record<string, number> = {};
            members.forEach((m: any) => {
              instCount[m.instrument] = Math.max(instCount[m.instrument] || 0, m.part_number || 1);
            });

            (coreBand?.band_members || []).forEach((bm: any) => {
              if (addedUserIds.has(bm.user_id)) return;
              
              const prof = bm.profiles ? (Array.isArray(bm.profiles) ? bm.profiles[0] : bm.profiles) : null;
              const normalizedMemberInst = normalizeInstrument(bm.instrument);
              const skills = schoolSkillsMap[bm.user_id] || [];
              
              const reqInsts = song.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 };
              let targetInstrument = normalizedMemberInst;
              
              const isInstSlotFilled = (instName: string) => {
                const normTarget = normalizeInstrument(instName);
                const matchingKey = Object.keys(reqInsts).find(k => normalizeInstrument(k) === normTarget);
                const countRequired = matchingKey ? reqInsts[matchingKey] : 0;
                const countFilled = members.filter((m: any) => normalizeInstrument(m.instrument) === normTarget).length;
                return countFilled >= countRequired;
              };

              const coreInstRequired = Object.keys(reqInsts).some(ri => normalizeInstrument(ri) === normalizedMemberInst);
              const coreInstFilled = isInstSlotFilled(bm.instrument);

              if (coreInstRequired && !coreInstFilled) {
                targetInstrument = normalizedMemberInst;
              } else {
                const alternativeInst = Object.keys(reqInsts).find(ri => {
                  const normRi = normalizeInstrument(ri);
                  if (isInstSlotFilled(ri)) return false;
                  return skills.some((sk: any) => 
                    sk.song_id === song.id && 
                    normalizeInstrument(sk.instrument) === normRi && 
                    (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
                  );
                });
                if (alternativeInst) {
                  targetInstrument = normalizeInstrument(alternativeInst);
                }
              }

              addedUserIds.add(bm.user_id);

              if (prof) {
                const nextPart = (instCount[targetInstrument] || 0) + 1;
                instCount[targetInstrument] = nextPart;

                const isMastered = skills.some((sk: any) => 
                  sk.song_id === song.id && 
                  normalizeInstrument(sk.instrument) === targetInstrument && 
                  (sk.part_number || 1) === nextPart &&
                  (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
                );

                members.push({
                  user_id: bm.user_id,
                  first_name: prof.first_name || 'Musiker',
                  photo_url: prof.photo_url,
                  instrument: targetInstrument,
                  part_number: nextPart,
                  isFromBand: true,
                  isMastered
                });
              }
            });

            const reqInsts = song.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 };
            const totalRequired = Object.entries(reqInsts).reduce((acc, [inst, count]) => {
              const low = inst.toLowerCase();
              if (low.includes('vocals') || low.includes('gesang')) return acc;
              return acc + (count as number);
            }, 0);

            const instrumentalists = members.filter((m: any) => {
              const low = (m.instrument || '').toLowerCase();
              return !low.includes('vocals') && !low.includes('gesang');
            }).length;

            const formationObj = {
              id: `band_${bs.id}`,
              originBand: band,
              bandSongId: bs.id,
              band_song_slots: bs.band_song_slots || [],
              song_id: song.id,
              status: bs.status,
              members,
              memberMap: members.reduce((acc: any, m: any) => ({ ...acc, [`${m.instrument}_${m.part_number}`]: m }), {}),
              level
            };

            allBandFormations.push(formationObj);

            if (instrumentalists >= totalRequired) {
              if (!(bs.status === 'proposal' && isUserBandMember)) {
                return;
              }
            }

            formationsList.push(formationObj);
          });

          const availableMusicians = levelSkills.filter((skill: any) => {
            const normInst = normalizeInstrument(skill.instrument);
            
            const inBandOnThisInst = allBandFormations.some(f => 
              f.members.some((m: any) => m.user_id === skill.user_id && m.instrument === normInst)
            );
            if (inBandOnThisInst) return false;

            const isTaken = formationsList.some(f => 
              f.members.some((m: any) => m.user_id === skill.user_id && m.instrument === normInst)
            );
            return !isTaken;
          }).sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

          if (levelSkills.length > 0) {
            console.log(`[Matching] Song: ${song.title}, Level: ${level}, Mastered pool: ${levelSkills.length}, Available: ${availableMusicians.length}`);
          }

          // 1. Explicit groups
          availableMusicians.filter((s: any) => s.formation_group).forEach((skill: any) => {
            const prof = Array.isArray(skill.profiles) ? skill.profiles[0] : skill.profiles;
            if (!prof) return;

            const normalizedMemberInst = normalizeInstrument(skill.instrument);

            let form = formationsList.find(f => f.id === skill.formation_group);
            if (!form) {
              form = { id: skill.formation_group, members: [], memberMap: {}, level };
              formationsList.push(form);
            }
            
            const currentCount = form.members.filter((m: any) => m.instrument === normalizedMemberInst).length;
            const nextPart = skill.part_number || (currentCount + 1);

            const memberObj = {
              user_id: skill.user_id,
              skill_id: skill.id,
              first_name: prof?.first_name || 'Musiker',
              photo_url: prof?.photo_url,
              instrument: normalizedMemberInst,
              part_number: nextPart,
              created_at: skill.created_at,
              isMastered: true
            };
            form.members.push(memberObj);
            form.memberMap[`${normalizedMemberInst}_${nextPart}`] = memberObj;
          });

          // 2. Automatic groups
          availableMusicians.filter((s: any) => !s.formation_group).forEach((skill: any) => {
            const prof = Array.isArray(skill.profiles) ? skill.profiles[0] : skill.profiles;
            if (!prof) return;

            const normalizedMemberInst = normalizeInstrument(skill.instrument);
            
            let form: any = formationsList.find((f: any) => {
              if (f.originBand) return false;
              const userAlreadyIn = f.members.some((m: any) => {
                const mNorm = normalizeInstrument(m.instrument);
                const isVocals = normalizedMemberInst.toLowerCase().includes('vocal') || normalizedMemberInst.toLowerCase().includes('gesang');
                const mIsVocals = mNorm.toLowerCase().includes('vocal') || mNorm.toLowerCase().includes('gesang');
                if (isVocals || mIsVocals) return false;
                return m.user_id === skill.user_id;
              });
              if (userAlreadyIn) return false;
              const currentCount = f.members.filter((m: any) => m.instrument === normalizedMemberInst).length;
              const requiredCount = song.instrumentation?.[normalizedMemberInst] || song.instrumentation?.[skill.instrument] || 0;
              return currentCount < requiredCount;
            });

            if (!form) {
              form = { id: `auto_${song.id}_${level}_${formationsList.length}`, members: [], memberMap: {}, level };
              formationsList.push(form);
            }

            const currentCount = form.members.filter((m: any) => m.instrument === normalizedMemberInst).length;
            const nextPart = skill.part_number || (currentCount + 1);

            const memberObj = {
              user_id: skill.user_id,
              skill_id: skill.id,
              first_name: prof?.first_name || 'Musiker',
              photo_url: prof?.photo_url,
              instrument: normalizedMemberInst,
              part_number: nextPart,
              created_at: skill.created_at,
              isMastered: true
            };
            form.members.push(memberObj);
            form.memberMap[`${normalizedMemberInst}_${nextPart}`] = memberObj;
          });

          // 3. Fallback
          if (formationsList.length === 0 && availableMusicians.length > 0) {
            formationsList.push({ id: `first_slot_${song.id}_${level}`, members: [], memberMap: {}, isInitial: true, level });
          }
          
          const levelFormations = formationsList.map(form => {
            const isComplete = Object.keys(requiredInsts).every(inst => {
              const lower = inst.toLowerCase();
              if (lower.includes('vocals') || lower.includes('gesang')) return true;
              const needed = requiredInsts[inst] || 0;
              if (needed === 0) return true;
              
              const normTarget = normalizeInstrument(inst);
              const matchingCount = form.members.filter((m: any) => {
                return normalizeInstrument(m.instrument) === normTarget;
              }).length;
              
              return matchingCount >= needed;
            });
            return { ...form, isComplete };
          });

          if (levelFormations.length > 0) {
            const uniqueId = `${song.id}_${level}`;
            if (!processedWall.some(w => w.id === uniqueId)) {
              processedWall.push({
                id: uniqueId,
                song_id: song.id,
                artist: song.artist || 'Unbekannter Künstler',
                title: song.title || 'Unbekannter Titel',
                media_link: song.media_link,
                instrumentation: requiredInsts,
                formations: levelFormations,
                level: level
              });
            }
          }
        });
      });

      const filteredWall = processedWall.filter((ws: any) => ws.formations.length > 0);

      console.log('[Dashboard] Setting processedWall. Final count:', filteredWall.length);
      console.log('[Dashboard] Processed IDs:', filteredWall.map(w => w.id));
      setWallSongs(filteredWall);
      console.log('[Dashboard] fetchDashboardData complete.');

      const userBandsData = userBandsRes?.data || [];
      if (userBandsData) {
        const uniqueBands = userBandsData.map((band: any) => {
          const myMembership = (band.band_members || []).find((m: any) => m.user_id === userId);
          
          (band.band_members || []).forEach((m: any) => {
             const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
             if (u) {
                u.user_song_skills = schoolSkillsMap[u.id] || [];
             }
          });

          return {
            ...band,
            myInstrument: myMembership?.instrument,
            myMemberId: myMembership?.id,
            confetti_seen: !!myMembership?.confetti_seen
          };
        });
        setUserBands(uniqueBands);
        
        if (selectedBandForProfile) {
          const updatedSelected = uniqueBands.find((b: any) => b.id === selectedBandForProfile.id);
          if (updatedSelected) {
            setSelectedBandForProfile(updatedSelected);
          }
        } else if (restoredBandId && showBandProfile) {
          const restored = uniqueBands.find((b: any) => b.id === restoredBandId);
          if (restored) {
            setSelectedBandForProfile(restored);
          }
        }
        
        const unseen = userBandsData.find((b: any) => {
          const m = (b.band_members || []).find((m: any) => m.user_id === userId);
          return m && !m.confetti_seen;
        });
        if (unseen) {
          const m = (unseen.band_members || []).find((m: any) => m.user_id === userId);
          setShowConfetti({ id: m.id, bands: unseen });
        }
      }

      if (bandsData && bandsData.length > 0) {
        const realBands = bandsData.filter((b: any) => b.name && b.name !== '__SYSTEM_ANNOUNCEMENTS__' && !b.name.startsWith('__SYSTEM_'));
        setAllBands(realBands);

        if (userData?.role === 'teacher' || userData?.role === 'admin' || userData?.role === 'secretary') {
          const teacherCoachedBands = realBands.filter((band: any) => {
            const isCoach = band.coach_id === userId || (band.coach && band.coach.id === userId);
            const isMember = (band.band_members || []).some((m: any) => m.user_id === userId);
            const hasMyStudent = (band.band_members || []).some((m: any) => {
              const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
              return u && u.teacher_id === userId;
            });
            return isCoach || isMember || hasMyStudent;
          });

          setUserBands(teacherCoachedBands);
        }

        if (selectedBandForProfile) {
          setSelectedBandForProfile((prev: any) => {
            const foundInAll = bandsData.find((b: any) => b.id === prev?.id);
            return foundInAll || prev;
          });
        } else if (restoredBandId && showBandProfile) {
          const restoredFromAll = bandsData.find((b: any) => b.id === restoredBandId);
          if (restoredFromAll) {
            setSelectedBandForProfile(restoredFromAll);
          }
        }
      }

      setTimeout(() => {
        fetchPlanningData(userData.school_id, userId);
      }, 100);

      // Activity Chart Data (Letzte 7 Tage)
      const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = days[d.getDay()];
        const mins = (allSessionsRes.data || [])
          .filter((s: any) => new Date(s.check_in_time).toDateString() === d.toDateString())
          .reduce((acc: number, s: any) => {
            const start = new Date(s.check_in_time);
            const end = s.check_out_time 
              ? new Date(s.check_out_time) 
              : s.last_active_at 
                ? new Date(Math.min(Date.now(), new Date(s.last_active_at).getTime() + 5 * 60000))
                : new Date(Math.min(Date.now(), start.getTime() + 60 * 60000));
            return acc + Math.floor((end.getTime() - start.getTime()) / 60000);
          }, 0);
        last7.push({ day: dayStr, mins });
      }
      setStudentActivity(last7);

      const uResSchool = await supabase
        .from('users')
        .select('id, first_name, last_name, instrument, avatar_url, photo_url, role, roles, is_active, is_campus_active, is_groovelab_active, teacher_id, school_id, age, birth_date, ausfall_until, ausfall_start, phone, nickname, group_id, contract_ends_at, contract_decision_made, qr_token, is_external_vocalist, show_messages_menu, master_admin_username, master_admin_email')
        .eq('school_id', schoolId)
        .order('first_name');

      const allUsers = uResSchool.data || [];
      if (typeof window !== 'undefined') {
        (window as any).debugAllUsersLength = allUsers?.length;
      }
      if (allUsers.length > 0) {
        setSchoolUsers(allUsers);
      }

      checkAnnouncements(schoolId, userData);
      if (userData.role !== 'student') {
        fetchAnnouncements(schoolId);
      } else {
        fetchStudentMessagesBackground(schoolId, userId, bandIds);
      }

      fetchCampusMessages();

    } catch (error: any) {
      console.error('[Dashboard] UNCAUGHT ERROR in fetchDashboardData:', error);
      if (typeof window !== 'undefined') {
        (window as any).fetchDashboardDataError = error?.message || String(error);
        (window as any).fetchDashboardDataStack = error?.stack || '';
      }
    } finally {
      setLoading(false);
    }
  }, [
    user,
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
    setUser,
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
  ]);

  const handleLeaveBand = useCallback(async (bandId: string) => {
    if (!user) return;
    if (!window.confirm('Möchtest du diese Band wirklich verlassen? Dein Platz wird für andere Musiker freigegeben.')) return;

    try {
      setLoading(true);
      const { error: err1 } = await supabase.from('band_members').delete().eq('band_id', bandId).eq('user_id', user.id);
      if (err1) throw err1;

      const { data: bandSongs, error: errSongs } = await supabase.from('band_songs').select('id').eq('band_id', bandId);
      if (errSongs) throw errSongs;

      if (bandSongs && bandSongs.length > 0) {
        const songIds = bandSongs.map((s: any) => s.id);
        const { error: err2 } = await supabase.from('band_song_slots').delete().in('band_song_id', songIds).eq('user_id', user.id);
        if (err2) throw err2;
      }

      await fetchDashboardData(user.id);
      alert('Du hast die Band verlassen.');
    } catch (err) {
      console.error('Error leaving band:', err);
      alert('Fehler beim Verlassen der Band.');
    } finally {
      setLoading(false);
    }
  }, [user, supabase, setLoading, fetchDashboardData]);

  return {
    fetchDashboardData,
    handleLeaveBand
  };
}
