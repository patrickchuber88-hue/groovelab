import React, { useState, useEffect, useRef } from 'react';

export interface UseCampusRealtimeSyncParams {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  session: any;
  setSession: React.Dispatch<React.SetStateAction<any>>;
  loggedInUserId: string | null;
  setLoggedInUserId: (id: string | null) => void;
  supabase: any;
  activePlatform: string;
  setActivePlatform: (platform: any) => void;
  activeStudentTab: string;
  setActiveStudentTab: (tab: string) => void;
  isKioskMode: boolean;
  handleLogout: (updateDb?: boolean, askConfirm?: boolean) => Promise<void>;
  fetchDashboardData: (userId: string, isInitial?: boolean) => Promise<void>;
  fetchCampusMessages: () => Promise<void>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface UseCampusRealtimeSyncReturn {
  liveSessionMins: number;
}

export function useCampusRealtimeSync({
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
}: UseCampusRealtimeSyncParams): UseCampusRealtimeSyncReturn {
  const [liveSessionMins, setLiveSessionMins] = useState(0);
  const debounceDashboardTimerRef = useRef<any>(null);

  const debouncedFetchDashboardData = (userId: string, isInitial: boolean = false) => {
    if (debounceDashboardTimerRef.current) clearTimeout(debounceDashboardTimerRef.current);
    debounceDashboardTimerRef.current = setTimeout(() => {
      fetchDashboardData(userId, isInitial);
    }, 300);
  };

  // Tab persistence per platform
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activePlatform === 'campus') {
      sessionStorage.setItem('campus_active_tab', activeStudentTab);
      localStorage.setItem('campus_active_tab', activeStudentTab);
    } else if (activePlatform === 'ensembles') {
      sessionStorage.setItem('ensembles_active_tab', activeStudentTab);
      localStorage.setItem('ensembles_active_tab', activeStudentTab);
    } else {
      sessionStorage.setItem('groovelab_active_tab', activeStudentTab);
      localStorage.setItem('groovelab_active_tab', activeStudentTab);
    }
  }, [activeStudentTab, activePlatform]);

  const previousPlatform = useRef(activePlatform);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('groovelab_active_platform', activePlatform);
      localStorage.setItem('groovelab_active_platform', activePlatform);

      // 📱 Axiom 32: Dynamic Theme-Color Synchronization for Apple Status Bar & PWA Shell
      let targetThemeColor = '#34a853';
      if (user && (user.role === 'admin' || user.role === 'secretary')) {
        targetThemeColor = '#ea4335';
      } else if (activePlatform === 'groovelab') {
        targetThemeColor = '#eab308';
      } else if (activePlatform === 'ensembles') {
        targetThemeColor = '#3b82f6';
      }

      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', targetThemeColor);
      } else {
        const newMeta = document.createElement('meta');
        newMeta.name = 'theme-color';
        newMeta.content = targetThemeColor;
        document.head.appendChild(newMeta);
      }
    }
    if (previousPlatform.current === activePlatform) {
      return;
    }
    previousPlatform.current = activePlatform;
    
    // Load the saved tab for the new platform to guarantee flawless switching
    const storageKey = activePlatform === 'campus' ? 'campus_active_tab' : (activePlatform === 'ensembles' ? 'ensembles_active_tab' : 'groovelab_active_tab');
    const savedTab = typeof window !== 'undefined' ? (sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey)) : null;
    
    let fallbackTab = 'live';
    if (activePlatform === 'campus') {
      fallbackTab = 'briefing';
    } else if (activePlatform === 'ensembles') {
      fallbackTab = 'overview';
    }
    
    setActiveStudentTab(savedTab || fallbackTab);
  }, [activePlatform, user?.role]);

  // Safety Hook: Enforce that students in the Campus module can NEVER see the GrooveLab Live Lab tab.
  useEffect(() => {
    if (activePlatform !== 'campus') return;
    if (user && user.role?.toLowerCase() === 'student') {
      const campusSettings = user?.schools?.opening_hours?.campus_settings || {};
      const showLeaderboard = campusSettings.show_leaderboard !== false;
      const flamesActive = campusSettings.flames_active !== false;
      
      const allowedTabs = ['briefing', 'homework_book', 'mediathek', 'events', 'profile', 'all_appointments', 'messages', 'settings'];
      if (flamesActive) allowedTabs.push('practice_board');
      if (showLeaderboard) allowedTabs.push('campus_cup');

      if (!allowedTabs.includes(activeStudentTab)) {
        console.log('[Safety Hook] Enforcing student Campus Briefing Board redirect from invalid tab:', activeStudentTab);
        setActiveStudentTab('briefing');
        sessionStorage.setItem('campus_active_tab', 'briefing');
      }
    }
  }, [user, activePlatform, activeStudentTab]);

  // Consolidated Realtime App Sync Channel
  useEffect(() => {
    if (!user?.id) return;

    const schoolId = user.school_id;

    const syncChannel = supabase
      .channel(`realtime_app_sync_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users_raw', filter: `id=eq.${user.id}` },
        async (payload: any) => {
          if (payload.new) {
            const remoteVersion = payload.new.token_version;
            const localVersion = Number(sessionStorage.getItem('groovelab_token_version') || 1);
            if (remoteVersion && remoteVersion > localVersion) {
              console.warn('[Security] Remote session revocation triggered for current user!');
              try {
                navigator.mediaDevices?.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
              } catch (e) {}
              sessionStorage.clear();
              localStorage.removeItem('groovelab_user_id');
              localStorage.removeItem('groovelab_cached_user');
              setUser(null);
              setLoggedInUserId(null);
              alert('Sitzung widerrufen: Deine Anmeldung wurde aus Sicherheitsgründen durch die Schulleitung oder Administration zentral beendet.');
              window.location.href = '/';
              return;
            }
          }
          // Ignore pure heartbeat / presence updates to prevent continuous re-render cascades
          if (payload.new && user) {
            const substantiveFields = [
              'role', 'roles', 'school_id', 'is_active', 'is_campus_active', 'is_groovelab_active',
              'token_version', 'is_master_admin', 'first_name', 'last_name',
              'photo_url', 'avatar_url', 'instrument', 'groovelab_instrument', 'nickname',
              'campus_ui_level', 'parent_permissions'
            ];
            const hasSubstantiveChange = substantiveFields.some(
              field => payload.new[field] !== undefined && payload.new[field] !== (user as any)[field]
            );
            if (!hasSubstantiveChange) return;
          }
          console.log('[Realtime] Current user profile update detected, refetching...');
          const { data: updatedUser } = await supabase.from('users').select('*, schools(*)').eq('id', user.id).single();
          if (updatedUser) {
            setUser(updatedUser);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'schools', filter: `id=eq.${schoolId}` },
        (payload: any) => {
          if (payload.new && payload.new.sessions_revoked_at) {
            const schoolRevokedTime = new Date(payload.new.sessions_revoked_at).getTime();
            const sessionStartTime = Number(sessionStorage.getItem('groovelab_session_started_at') || Date.now());
            if (schoolRevokedTime > sessionStartTime) {
              console.warn('[Security] School-wide session revocation triggered!');
              try {
                navigator.mediaDevices?.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
              } catch (e) {}
              sessionStorage.clear();
              localStorage.removeItem('groovelab_user_id');
              localStorage.removeItem('groovelab_cached_user');
              setUser(null);
              setLoggedInUserId(null);
              alert('Sicherheits-Abmeldung: Alle aktiven Sitzungen deiner Musikschule wurden durch die Schulleitung zentral beendet.');
              window.location.href = '/';
              return;
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          console.log('[Realtime] Session change detected:', payload);
          
          const currentStationId = localStorage.getItem('groovelab_station_id');
          const isKiosk = currentStationId && currentStationId !== 'skip';

          if (isKiosk) {
            if (payload.eventType === 'INSERT' && payload.new) {
              const newStationId = payload.new.station_id;
              if (newStationId && newStationId !== currentStationId) {
                console.warn('[Realtime] User checked in at another station. Logging out this station.');
                handleLogout(false);
                return;
              }
            }
            if (payload.eventType === 'UPDATE' && payload.new && payload.new.check_out_time) {
              if (payload.new.station_id === currentStationId) {
                console.warn('[Realtime] Session checked out. Logging out this station.');
                handleLogout(false);
                return;
              }
            }
          }

          debouncedFetchDashboardData(user.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_song_skills', filter: `user_id=eq.${user.id}` },
        () => {
          console.log('[Realtime] user_song_skills update detected, refetching dashboard...');
          debouncedFetchDashboardData(user.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campus_direct_messages' },
        () => {
          console.log('[Realtime] campus_direct_messages update detected');
          fetchCampusMessages();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campus_chat_channel_reads' },
        () => {
          console.log('[Realtime] campus_chat_channel_reads update detected');
          fetchCampusMessages();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campus_chat_group_members' },
        () => {
          console.log('[Realtime] campus_chat_group_members update detected');
          fetchCampusMessages();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'band_members', filter: `user_id=eq.${user.id}` },
        () => {
          console.log('[Realtime] band_members update detected, refetching dashboard...');
          debouncedFetchDashboardData(user.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules', filter: `student_id=eq.${user.id}` },
        () => {
          console.log('[Realtime] schedules update detected, refetching dashboard...');
          debouncedFetchDashboardData(user.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_occurrences', filter: `student_id=eq.${user.id}` },
        () => {
          console.log('[Realtime] schedule_occurrences update detected, refetching dashboard...');
          debouncedFetchDashboardData(user.id);
        }
      );

    if (schoolId) {
      syncChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bands', filter: `school_id=eq.${schoolId}` },
        () => {
          console.log('[Realtime] bands update detected, refetching dashboard...');
          debouncedFetchDashboardData(user.id);
        }
      );
    }

    syncChannel.subscribe();

    return () => {
      supabase.removeChannel(syncChannel);
    };
  }, [user?.id, user?.school_id, user?.role, user?.token_version]);

  // Enterprise Kiosk Inactivity Auto-Reset
  useEffect(() => {
    if (!loggedInUserId || !isKioskMode) return;

    let timeoutId: any;
    const KIOSK_IDLE_LIMIT_MS = 5 * 60 * 1000; // 5 Minuten Inaktivität

    const resetIdleTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log('[Kiosk] Inactivity timeout reached. Resetting session to Kiosk login screen.');
        handleLogout(true, false);
      }, KIOSK_IDLE_LIMIT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(ev => window.removeEventListener(ev, resetIdleTimer));
    };
  }, [loggedInUserId, isKioskMode]);

  // Camera Kill Switch on Login
  useEffect(() => {
    if (loggedInUserId) {
      if (typeof (window as any).stopAllCameras === 'function') {
        (window as any).stopAllCameras();
      }
      const safetyTimer = setTimeout(() => {
        setLoading(prev => {
          if (prev) {
            console.warn('[Dashboard] Safety timeout: loading was stuck for 3.5s. Force-clearing.');
            return false;
          }
          return prev;
        });
      }, 3500);
      
      const needsInitialLoading = !user;
      fetchDashboardData(loggedInUserId, needsInitialLoading).finally(() => clearTimeout(safetyTimer));
    }
  }, [loggedInUserId]);

  // Song catalog updates dispatched from teacher/admin GrooveLab Songs View
  useEffect(() => {
    const handleSongsUpdated = () => {
      const uId = loggedInUserId || (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_user_id') : null);
      if (uId) {
        console.log('[GrooveLab] Songs catalog updated event received, refreshing dashboard data...');
        fetchDashboardData(uId, false);
      }
    };
    window.addEventListener('groovelab_songs_updated', handleSongsUpdated);
    return () => {
      window.removeEventListener('groovelab_songs_updated', handleSongsUpdated);
    };
  }, [loggedInUserId]);

  // When student visits library tab, ensure songs data is fresh
  useEffect(() => {
    if (activeStudentTab === 'library' && loggedInUserId) {
      fetchDashboardData(loggedInUserId, false);
    }
  }, [activeStudentTab, loggedInUserId]);

  // Active Live Session Duration
  useEffect(() => {
    let interval: any;
    if (session && !session.check_out_time) {
      const start = new Date(session.check_in_time).getTime();
      const update = () => {
        const now = new Date().getTime();
        setLiveSessionMins(Math.max(0, Math.floor((now - start) / 60000)));
      };
      update();
      interval = setInterval(update, 60000);
    } else {
      setLiveSessionMins(0);
    }
    return () => clearInterval(interval);
  }, [session]);

  // Sync-on-Focus + Fallback Polling + Session Lease Monitor
  useEffect(() => {
    if (loggedInUserId) {
      const isMasterAdmin = Boolean(
        user?.is_master_admin === true || 
        sessionStorage.getItem('groovelab_is_master_admin') === 'true'
      );

      let lastFocusFetch = Date.now();
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          const now = Date.now();
          if (now - lastFocusFetch > 15000) {
            lastFocusFetch = now;
            fetchDashboardData(loggedInUserId, false);
          }
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      const dashboardInterval = isMasterAdmin ? null : setInterval(() => {
        fetchDashboardData(loggedInUserId, false);
      }, 180000);

      const sessionLeaseInterval = setInterval(async () => {
        if (!user) return;
        if (user.role === 'teacher') return;

        if (session?.id && !session.check_out_time) {
          try {
            await supabase.rpc('report_session_lease', { p_session_id: session.id });
          } catch (e) {}
        }

        const schoolId = user.school_id || (Array.isArray(user.schools) ? user.schools[0]?.id : user.schools?.id);
        if (schoolId) {
          try {
            await supabase.rpc('update_user_presence', {
              p_school_id: schoolId,
              p_station_id: session?.station_id || null
            });
          } catch (e) {}
        }
      }, 300000);

      const handleBeforeUnload = () => {
        if (session?.id && !session.check_out_time && isKioskMode) {
          const payload = JSON.stringify({ p_session_id: session.id });
          const url = `${(supabase as any).supabaseUrl}/rest/v1/rpc/close_kiosk_session`;
          const headers = {
            type: 'application/json',
          };
          const blob = new Blob([payload], headers);
          if (navigator.sendBeacon) {
            navigator.sendBeacon(url, blob);
          }
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (dashboardInterval) clearInterval(dashboardInterval);
        clearInterval(sessionLeaseInterval);
      };
    }
  }, [loggedInUserId, user?.id, user?.school_id, user?.role, user?.is_master_admin, session?.id, session?.check_out_time, isKioskMode]);

  // Realtime Session Monitor (Single Login Rule - Students only)
  useEffect(() => {
    if (!session?.id) return;

    const isStudent = user?.role?.toLowerCase() === 'student';
    if (!isStudent) return;

    const channel = supabase
      .channel(`session_monitor_${session.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'sessions',
        filter: `id=eq.${session.id}`
      }, (payload: any) => {
        if (payload.new.check_out_time && !payload.new.metadata?.is_tab_close && !payload.new.metadata?.is_switching_station) {
          if (isKioskMode) {
            handleLogout(false);
          } else {
            setSession(null);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, user?.role, isKioskMode]);

  return {
    liveSessionMins
  };
}
