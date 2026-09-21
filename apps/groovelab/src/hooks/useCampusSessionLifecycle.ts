import React, { useEffect, useCallback } from 'react';
import { dbCircuitBreaker } from '../utils/circuitBreaker';

export interface UseCampusSessionLifecycleParams {
  user: any;
  session: any;
  setSession?: React.Dispatch<React.SetStateAction<any>>;
  loggedInUserId: string | null;
  activePlatform: string;
  setActivePlatform: (platform: any) => void;
  setActivePlatformRaw: React.Dispatch<React.SetStateAction<any>>;
  activeStudentTab: string;
  setActiveStudentTab: (tab: string) => void;
  setActiveStudentTabRaw: React.Dispatch<React.SetStateAction<string>>;
  locationMode: string;
  showAutoLockWarning: boolean;
  setShowAutoLockWarning: (show: boolean) => void;
  setAutoLockCountdown: React.Dispatch<React.SetStateAction<number>>;
  setActiveStudentsCount: React.Dispatch<React.SetStateAction<number>>;
  handleLogout: (updateDb?: boolean, askConfirm?: boolean) => Promise<void> | void;
  supabase: any;
}

export function useCampusSessionLifecycle({
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
}: UseCampusSessionLifecycleParams) {

  // Fetch active student count with GPS & Station filters
  const fetchActiveStudentCount = useCallback(async (schoolId: string) => {
    // Fetch sessions and join users to filter by school and heartbeat
    const { data: activeSessions } = await supabase
      .from('sessions')
      .select('user_id, station_id, gps_verified, users!inner(role, school_id, last_seen, is_groovelab_active)')
      .is('check_out_time', null)
      .eq('users.school_id', schoolId)
      .eq('users.role', 'student');
    
    // Only count students who have an active session at a station and are gps_verified
    const count = (activeSessions || []).filter((s: any) => {
      const u: any = Array.isArray(s.users) ? s.users[0] : s.users;
      if (!u) return false;
      const isStudent = u.role?.toLowerCase() === 'student';
      const isStaff = u.role?.toLowerCase() === 'teacher' || u.role?.toLowerCase() === 'admin';
      return isStudent && !isStaff && s.station_id && s.gps_verified && u.is_groovelab_active;
    }).length;
    
    setActiveStudentsCount(count);
  }, [supabase, setActiveStudentsCount]);

  // Fetch active session
  const fetchSession = useCallback(async (uid: string) => {
    if (!setSession) return;
    const { data: sData } = await supabase
      .from('sessions')
      .select('*, stations(name)')
      .eq('user_id', uid)
      .is('check_out_time', null)
      .order('check_in_time', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    setSession(sData);
  }, [supabase, setSession]);

  // Dedicated hook for active tab initialization, persistence and role-based correction
  useEffect(() => {
    if (user && user.id) {
      const storageKey = activePlatform === 'campus' ? 'campus_active_tab' : (activePlatform === 'ensembles' ? 'ensembles_active_tab' : 'groovelab_active_tab');
      const storedTab = (typeof window !== 'undefined' ? (sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey)) : null);
      if (!storedTab) {
        const startTab = activePlatform === 'campus' ? 'briefing' : (activePlatform === 'ensembles' ? 'overview' : 'live');
        console.log('[Tab Sync] No tab stored in storage. Fallback to start tab:', startTab);
        setActiveStudentTab(startTab);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(storageKey, startTab);
          localStorage.setItem(storageKey, startTab);
        }
      } else {
        // Auto-correct if teacher/admin/staff on campus somehow has 'live' or invalid tab saved
        const isTeacherOrAdmin = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'secretary';
        if (isTeacherOrAdmin && activePlatform === 'campus') {
          const validCampusTeacherTabs = ['briefing', 'schedule', 'events', 'messages', 'students', 'songs', 'rooms', 'stats', 'setup', 'profile', 'settings'];
          if (!validCampusTeacherTabs.includes(activeStudentTab) || activeStudentTab === 'live') {
            console.log('[Tab Sync] Auto-correcting invalid campus teacher tab to briefing:', activeStudentTab);
            setActiveStudentTab('briefing');
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('campus_active_tab', 'briefing');
              localStorage.setItem('campus_active_tab', 'briefing');
            }
          }
        }
        // Auto-correct if teacher/admin on groovelab has student-only tab active
        if (isTeacherOrAdmin && activePlatform === 'groovelab') {
          const studentTabs = ['practice', 'library', 'repertoire', 'matching'];
          if (studentTabs.includes(activeStudentTab)) {
            const fallbackTab = 'live';
            console.log('[Tab Sync] Auto-correcting student-only tab for teacher/admin to fallback:', fallbackTab);
            setActiveStudentTab(fallbackTab);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem(storageKey, fallbackTab);
              localStorage.setItem(storageKey, fallbackTab);
            }
          }
        }
        // Auto-correct if a student on groovelab has an invalid campus-only tab saved (e.g. 'briefing' from old Safety Hook bug)
        const isStudent = user.role?.toLowerCase() === 'student';
        if (isStudent && activePlatform === 'groovelab') {
          const validGroovelabStudentTabs = ['live', 'practice', 'library', 'repertoire', 'matching', 'bands', 'messages', 'profile', 'settings'];
          if (!validGroovelabStudentTabs.includes(activeStudentTab)) {
            console.log('[Tab Sync] Auto-correcting invalid groovelab student tab to live:', activeStudentTab);
            setActiveStudentTab('live');
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('groovelab_active_tab', 'live');
              localStorage.setItem('groovelab_active_tab', 'live');
            }
          }
        }
        // Auto-correct if a student on campus has an invalid groovelab tab saved (e.g. 'live' or 'bands')
        if (isStudent && activePlatform === 'campus') {
          const validCampusStudentTabs = ['briefing', 'homework_book', 'mediathek', 'practice_board', 'campus_cup', 'events', 'profile', 'all_appointments', 'settings'];
          if (!validCampusStudentTabs.includes(activeStudentTab)) {
            console.log('[Tab Sync] Auto-correcting invalid campus student tab to briefing:', activeStudentTab);
            setActiveStudentTab('briefing');
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('campus_active_tab', 'briefing');
              localStorage.setItem('campus_active_tab', 'briefing');
            }
          }
        }
      }
    }
  }, [user?.id, user?.role, activePlatform]);

  // Lock platform to groovelab on page load/initial mount in lab mode for security
  useEffect(() => {
    if (user && user.role === 'student' && locationMode === 'lab') {
      const activePlat = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_platform') || localStorage.getItem('groovelab_active_platform')) : null;
      if (activePlat !== 'campus' && activePlat !== 'groovelab') {
        console.log('[Lab Lock] Resetting platform to groovelab on page load for student security');
        setActivePlatformRaw('groovelab');
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('groovelab_active_platform', 'groovelab');
          localStorage.setItem('groovelab_active_platform', 'groovelab');
        }
        const savedTab = (typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_tab') || localStorage.getItem('groovelab_active_tab')) : null) || 'live';
        setActiveStudentTabRaw(savedTab);
      }
    }
  }, [user?.id, user?.role, locationMode]);

  // Subscription Hard Lock Enforcement
  useEffect(() => {
    if (user && user.id) {
      const schoolObj = Array.isArray(user.schools) ? user.schools[0] : user.schools;
      if (!schoolObj) return;
      const schoolHasCampus = Boolean(
        user?.is_campus_active || 
        (schoolObj ? (schoolObj.has_campus_subscription || !schoolObj.is_billing_booked || schoolObj.subscription_bypass) : true)
      );
      const schoolHasGroove = Boolean(
        user?.is_groovelab_active || 
        (schoolObj ? (schoolObj.has_groovelab_subscription || !schoolObj.is_billing_booked || schoolObj.subscription_bypass) : true)
      );

      if (activePlatform === 'campus' && !schoolHasCampus) {
        console.log('[Subscription Lock] Campus not active. Redirecting to GrooveLab.');
        setActivePlatform('groovelab');
      } else if (activePlatform === 'groovelab' && !schoolHasGroove) {
        console.log('[Subscription Lock] GrooveLab not active. Redirecting to Campus.');
        setActivePlatform('campus');
      }
    }
  }, [user?.id, user?.schools, activePlatform]);

  // Automatic Inactivity Timeout (Auto-Lock) for shared devices in Lab Mode
  useEffect(() => {
    if (!loggedInUserId || locationMode !== 'lab') {
      setShowAutoLockWarning(false);
      return;
    }

    let mainTimeoutId: any = null;
    
    // 20 minutes = 1,200,000 milliseconds
    const TIMEOUT_DURATION = 1200000; 

    const isMediaActive = () => {
      const mediaElements = Array.from(document.querySelectorAll('audio, video'));
      const html5Active = mediaElements.some((media: any) => !media.paused && !media.ended);
      const sessionActive = !!session;
      return html5Active || sessionActive;
    };

    const handleTimeoutReached = () => {
      if (isMediaActive()) {
        resetTimer();
        return;
      }

      if (document.visibilityState === 'hidden') {
        console.log('[Auto-Lock] User inactive in background, logging out directly...');
        handleLogout(true, false);
      } else {
        setShowAutoLockWarning(true);
        setAutoLockCountdown(30);
      }
    };

    const resetTimer = () => {
      setShowAutoLockWarning(false);
      if (mainTimeoutId) clearTimeout(mainTimeoutId);
      mainTimeoutId = setTimeout(handleTimeoutReached, TIMEOUT_DURATION);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const activityHandler = () => {
      if (!showAutoLockWarning) {
        resetTimer();
      }
    };

    events.forEach(event => {
      window.addEventListener(event, activityHandler);
    });

    resetTimer();

    return () => {
      if (mainTimeoutId) clearTimeout(mainTimeoutId);
      events.forEach(event => {
        window.removeEventListener(event, activityHandler);
      });
    };
  }, [loggedInUserId, locationMode, showAutoLockWarning, session]);

  // Handle countdown ticks for the visual Auto-Lock warning modal
  useEffect(() => {
    if (!showAutoLockWarning) return;

    const intervalId = setInterval(() => {
      setAutoLockCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalId);
          console.log('[Auto-Lock] Warning countdown finished, logging out...');
          setShowAutoLockWarning(false);
          handleLogout(true, false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [showAutoLockWarning]);

  // Activity-driven Heartbeat (90s), session count sync, visibility change & beforeunload Beacon
  useEffect(() => {
    let debounceCountTimer: any = null;
    const debouncedFetchActiveStudentCount = (schoolId: string) => {
      if (debounceCountTimer) clearTimeout(debounceCountTimer);
      debounceCountTimer = setTimeout(() => {
        fetchActiveStudentCount(schoolId);
      }, 500);
    };

    // Realtime subscription for sessions (Active Student Count - Partitioned by school_id)
    const schoolScope = user?.school_id || 'unscoped';
    const sessionsChannel = supabase
      .channel(`realtime_sessions_count_${schoolScope}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        if (user?.school_id) {
          debouncedFetchActiveStudentCount(user.school_id);
        }
      })
      .subscribe();

    // Activity-driven Heartbeat (90s): only writes to DB if user interacted recently
    let lastActivityTime = Date.now();
    const handleUserActivity = () => {
      lastActivityTime = Date.now();
    };
    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });

    const updateHeartbeat = async () => {
      try {
        if (document.hidden) return;
        // If idle for > 5 minutes, skip DB write to protect Postgres WAL and autovacuum
        if (Date.now() - lastActivityTime > 5 * 60 * 1000) return;

        const now = new Date().toISOString();
        if (user?.id && user.role !== 'teacher') {
          await supabase
            .from('users')
            .update({ last_seen: now })
            .eq('id', user.id);
        }
      } catch (err) {
        console.warn('[Heartbeat] background update caught error:', err);
      }
    };

    updateHeartbeat(); // Immediate heartbeat on load/mount
    const heartbeat = setInterval(updateHeartbeat, 90000); // 90 seconds interval

    // Immediate heartbeat, Realtime reconnection, layout reflow, screen blurring protection, and audio suspension when backgrounding tab
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.body.style.filter = 'blur(16px)';
        document.body.style.transition = 'filter 0.15s ease-out';
        try {
          if ((window as any).__groovelabAudioCtx && (window as any).__groovelabAudioCtx.state === 'running') {
            (window as any).__groovelabAudioCtx.suspend().catch(() => {});
          }
        } catch (e) {}
      } else {
        document.body.style.filter = 'none';
        lastActivityTime = Date.now();
        dbCircuitBreaker.recordSuccess();
        try {
          if ((window as any).__groovelabAudioCtx && (window as any).__groovelabAudioCtx.state === 'suspended') {
            (window as any).__groovelabAudioCtx.resume().catch(() => {});
          }
        } catch (e) {}
        try { (supabase.realtime as any)?.connect?.(); } catch (e) {}
        updateHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleOnlineSync = () => {
      console.info('[Network] Device came online. Reconnecting Realtime & refreshing state...');
      lastActivityTime = Date.now();
      dbCircuitBreaker.recordSuccess();
      try { (supabase.realtime as any)?.connect?.(); } catch (e) {}
      updateHeartbeat();
    };
    window.addEventListener('online', handleOnlineSync);

    const handleBeforeUnload = () => {
      if (user?.id && user.role !== 'teacher') {
        const pastDate = new Date(Date.now() - 10 * 60000).toISOString();
        const body = JSON.stringify({ last_seen: pastDate });
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`;
        
        // Use fetch with keepalive for reliable delivery on tab close
        fetch(url, {
          method: 'PATCH',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body,
          keepalive: true
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      supabase.removeChannel(sessionsChannel);
      clearInterval(heartbeat);
      if (debounceCountTimer) clearTimeout(debounceCountTimer);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnlineSync);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id, user?.school_id, session?.id]);

  return {
    fetchActiveStudentCount,
    fetchSession
  };
}
