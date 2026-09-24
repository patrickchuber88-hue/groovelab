import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, queryCache } from '../../../lib/supabase';
import { areObjectsEqualFast, areArraysEqualFast } from '../../../utils/fastCompare';
import { 
  fetchRoomsBySchool, 
  fetchStationsBySchool, 
  fetchCrisisNotifications, 
  fetchActiveSessions, 
  fetchSchoolStaff, 
  fetchUserBandIds, 
  fetchUnreadShouts,
  getCachedRoomsSync,
  getCachedStationsSync,
  getCachedActiveSessionsSync,
  invalidateActiveSessionsCache,
  optimisticallyInjectActiveSession
} from '../../../repositories';
import {
  CANONICAL_GROOVELAB_STUDIO_ROOM,
  CANONICAL_GROOVELAB_STUDIO_STATIONS
} from '../../../constants/groovelabLayoutDefaults';
import { computeSchoolDunningStatus, SchoolDunningStatus } from '../../../domain/schoolDunningEngine';
import { getSimulatedNow } from '../utils/teacherDashboardUtils';

// 🛡️ OWASP ASVS Level 3: Strict explicit column whitelists for teacher profiles (Zero Wildcards & Zero Secret Leakage)
export const TEACHER_SELECT_COLUMNS = 'id, school_id, first_name, last_name, nickname, role, roles, email, photo_url, avatar_url, instrument, is_active, ausweis_nummer, teacher_qr_token, qr_token, is_campus_active, is_groovelab_active, is_premium_user, contract_ends_at, lesson_duration, is_pin_activated, ausfall_until, ausfall_start, created_at, preferred_room_ids, planned_boards, student_billing_payment_method, activated_at, student_billing_cash_paid, is_trial, trial_ends_at, exempt_from_direct_billing';

export const TEACHER_WITH_SCHOOL_SELECT = `${TEACHER_SELECT_COLUMNS}, schools(id, name, subdomain, logo_url, primary_color, calendar_url, status, opening_hours, is_trial, trial_ends_at, subscription_bypass, has_campus_subscription, has_groovelab_subscription, allow_messages_global)`;

export interface UseTeacherDataProps {
  userId: string;
  initialTeacher?: any;
  session?: any;
  activePlatform: 'campus' | 'groovelab';
  viewMode?: 'admin' | 'student';
  activeTab?: string;
  hideHeader?: boolean;
}

export function useTeacherData({
  userId,
  initialTeacher,
  session,
  activePlatform,
  viewMode = 'admin',
  activeTab = 'briefing',
  hideHeader = false
}: UseTeacherDataProps) {
  const [teacher, setTeacher] = useState<any>(() => {
    if (initialTeacher) return initialTeacher;
    if (session?.users) return session.users;
    if (typeof window !== 'undefined') {
      const isGhost = userId === 'master-support-id' || sessionStorage.getItem('groovelab_support_ghost') === 'true';
      if (isGhost) {
        const ghostSchoolId = sessionStorage.getItem('groovelab_ghost_school_id') || '';
        const ghostSchoolName = sessionStorage.getItem('groovelab_ghost_school_name') || 'Musikschule';
        return {
          id: 'master-support-id',
          school_id: ghostSchoolId,
          role: 'teacher',
          first_name: `${ghostSchoolName} Support`,
          last_name: '',
          photo_url: '/campus_login_hero.png',
          avatar_url: '/campus_login_hero.png',
          instrument: 'Support-Lehrkraft',
          is_campus_active: true,
          is_groovelab_active: true,
          is_ghost_mode: true,
          schools: {
            id: ghostSchoolId,
            name: ghostSchoolName,
            status: 'active'
          }
        };
      }

      const cached = sessionStorage.getItem('groovelab_cached_user') || localStorage.getItem('groovelab_cached_user') || sessionStorage.getItem('campus_user') || localStorage.getItem('campus_user');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && (!userId || parsed.id === userId)) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return null;
  });

  useEffect(() => {
    if (initialTeacher) {
      setTeacher((prev: any) => {
        if (prev && areObjectsEqualFast(prev, initialTeacher)) return prev;
        return prev ? { ...prev, ...initialTeacher } : initialTeacher;
      });
    }
  }, [initialTeacher]);

  const [schoolData, setSchoolData] = useState<any>(null);
  const [initialSchoolData, setInitialSchoolData] = useState<any>(null);
  const [teacherDunningStatus, setTeacherDunningStatus] = useState<SchoolDunningStatus | null>(null);
  const initialSchoolId = teacher?.school_id || 
    (typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_ghost_school_id') || '') : '');

  const [rooms, setRooms] = useState<any[]>(() => {
    if (initialSchoolId) {
      const cached = getCachedRoomsSync(initialSchoolId, activePlatform);
      if (cached && cached.length > 0) return cached;
    }
    return [CANONICAL_GROOVELAB_STUDIO_ROOM];
  });

  const [selectedRoomId, setSelectedRoomId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`groovelab_teacher_selected_room_id_${activePlatform}`) || localStorage.getItem('groovelab_teacher_selected_room_id');
      if (saved) return saved;
    }
    if (initialSchoolId) {
      const cached = getCachedRoomsSync(initialSchoolId, activePlatform);
      if (cached && cached.length > 0) return cached[0].id;
    }
    return CANONICAL_GROOVELAB_STUDIO_ROOM.id;
  });

  useEffect(() => {
    if (selectedRoomId) {
      localStorage.setItem('groovelab_teacher_selected_room_id', selectedRoomId);
      localStorage.setItem(`groovelab_teacher_selected_room_id_${activePlatform}`, selectedRoomId);
    }
  }, [selectedRoomId, activePlatform]);

  const [stations, setStations] = useState<any[]>(() => {
    if (initialSchoolId) {
      const cached = getCachedStationsSync(initialSchoolId);
      if (cached && cached.length > 0) return cached;
    }
    return CANONICAL_GROOVELAB_STUDIO_STATIONS;
  });
  const [coaches, setCoaches] = useState<any[]>([]);
  const [selectedCoachProfile, setSelectedCoachProfile] = useState<any | null>(null);
  const [allBands, setAllBands] = useState<any[]>([]);
  const [openProposals, setOpenProposals] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>(() => {
    let initialList: any[] = [];
    if (initialSchoolId) {
      const cached = getCachedActiveSessionsSync(initialSchoolId);
      if (cached && cached.length > 0) initialList = [...cached];
    }
    // ⚡ 0ms Instant Hydration: Inject session prop immediately if provided
    if (session && session.user_id) {
      const exists = initialList.some(s => s && (s.id === session.id || (s.station_id && s.station_id === session.station_id)));
      if (!exists) {
        initialList = [session, ...initialList];
      }
    }
    return initialList;
  });

  // Synchronize when session prop changes (e.g. fresh student check-in)
  useEffect(() => {
    if (session && session.user_id) {
      setActiveSessions(prev => {
        const idx = prev.findIndex(s => s && (s.id === session.id || (s.station_id && s.station_id === session.station_id)));
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...session };
          return next;
        }
        return [session, ...prev];
      });
      if (initialSchoolId) {
        optimisticallyInjectActiveSession(session, initialSchoolId);
      }
    }
  }, [session, initialSchoolId]);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [unreadShouts, setUnreadShouts] = useState<any[]>([]);
  const [crisisNotifications, setCrisisNotifications] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isTeacherBriefingSidebarCollapsed, setIsTeacherBriefingSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('campus_teacher_briefing_sidebar_collapsed');
      if (saved !== null) return saved === 'true';
    }
    return false;
  });

  const isFetchingRef = useRef<Promise<void> | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    if (isFetchingRef.current) {
      return isFetchingRef.current;
    }

    const runFetch = async () => {
      setFetchError(null);
      setIsSyncing(true);

      const isGhostMode = userId === 'master-support-id' || (typeof window !== 'undefined' && sessionStorage.getItem('groovelab_support_ghost') === 'true');
      const ghostSchoolId = isGhostMode ? (sessionStorage.getItem('groovelab_ghost_school_id') || '') : '';
      const ghostSchoolName = isGhostMode ? (sessionStorage.getItem('groovelab_ghost_school_name') || 'Musikschule') : 'Musikschule';

      try {
        let bIds: string[] = [];
        let tData: any = null;

        if (isGhostMode && ghostSchoolId) {
          let effectiveTeacherId = sessionStorage.getItem('groovelab_ghost_shadowed_teacher_id');
          let realTeacher: any = null;
          if (effectiveTeacherId) {
            const { data: tp } = await supabase.from('users').select(TEACHER_WITH_SCHOOL_SELECT).eq('id', effectiveTeacherId).maybeSingle();
            realTeacher = tp;
          }
          if (!realTeacher) {
            const { data: tp } = await supabase.from('users').select(TEACHER_WITH_SCHOOL_SELECT).eq('school_id', ghostSchoolId).eq('role', 'teacher').limit(1).maybeSingle();
            realTeacher = tp;
            if (realTeacher?.id) {
              sessionStorage.setItem('groovelab_ghost_shadowed_teacher_id', realTeacher.id);
            }
          }

          const { data: sd } = await supabase.from('schools').select('*').eq('id', ghostSchoolId).maybeSingle();

          tData = realTeacher ? {
            ...realTeacher,
            is_ghost_mode: true,
            schools: sd || realTeacher.schools || { id: ghostSchoolId, name: ghostSchoolName, status: 'active' }
          } : {
            id: 'master-support-id',
            school_id: ghostSchoolId,
            role: 'teacher',
            first_name: `${ghostSchoolName} Support`,
            last_name: '',
            photo_url: '/campus_login_hero.png',
            avatar_url: '/campus_login_hero.png',
            instrument: 'Support-Lehrkraft',
            is_campus_active: true,
            is_groovelab_active: true,
            is_ghost_mode: true,
            schools: sd || {
              id: ghostSchoolId,
              name: ghostSchoolName,
              status: 'active'
            }
          };

          if (sd) {
            setSchoolData(sd);
            setInitialSchoolData(JSON.parse(JSON.stringify(sd)));
          }
        } else {
          const [fetchedBandIds, tDataRes] = await Promise.all([
            fetchUserBandIds(userId),
            supabase.from('users').select(TEACHER_WITH_SCHOOL_SELECT).eq('id', userId).maybeSingle()
          ]);
          bIds = fetchedBandIds;
          tData = tDataRes.data;

          if (!tData && userId) {
            const { data: fallbackUser } = await supabase.from('users').select(TEACHER_SELECT_COLUMNS).eq('id', userId).maybeSingle();
            if (fallbackUser) {
              tData = fallbackUser;
            }
          }

          if (!tData) {
            if (initialTeacher && (!userId || initialTeacher.id === userId)) {
              tData = initialTeacher;
            } else if (typeof window !== 'undefined') {
              const cached = sessionStorage.getItem('groovelab_cached_user') || localStorage.getItem('groovelab_cached_user') || sessionStorage.getItem('campus_user') || localStorage.getItem('campus_user');
              if (cached) {
                try {
                  const parsed = JSON.parse(cached);
                  if (parsed && (!userId || parsed.id === userId)) {
                    tData = parsed;
                  }
                } catch (e) {}
              }
            }
          }

          if (bIds.length > 0) {
            const unread = await fetchUnreadShouts(bIds, userId);
            setUnreadShouts(unread);
          }
        }

        setTeacher((prev: any) => {
          if (prev && areObjectsEqualFast(prev, tData)) return prev;
          return tData;
        });
        if (tData?.briefing_sidebar_collapsed !== undefined && tData?.briefing_sidebar_collapsed !== null) {
          setIsTeacherBriefingSidebarCollapsed(Boolean(tData.briefing_sidebar_collapsed));
          localStorage.setItem('campus_teacher_briefing_sidebar_collapsed', String(tData.briefing_sidebar_collapsed));
        }

        const isStudent = viewMode === 'student' || tData?.role?.toLowerCase() === 'student';
        const applySchoolAndDunning = (sd: any) => {
          if (!sd) return;
          setSchoolData(sd);
          setInitialSchoolData(JSON.parse(JSON.stringify(sd)));

          if (!isStudent) {
            supabase
              .from('invoices')
              .select('id, type, amount, status, billing_date, due_date, items')
              .eq('school_id', tData.school_id)
              .then(({ data: invData }) => {
                const status = computeSchoolDunningStatus(sd, invData || [], getSimulatedNow());
                setTeacherDunningStatus(status);
              });
          }
        };

        if (tData?.school_id) {
          const joinedSchool = Array.isArray(tData.schools) ? tData.schools[0] : tData.schools;
          if (joinedSchool && joinedSchool.id === tData.school_id) {
            applySchoolAndDunning(joinedSchool);
          } else {
            supabase.from('schools').select('*').eq('id', tData.school_id).single().then(({ data: sd }) => {
              if (sd) {
                applySchoolAndDunning(sd);
              }
            });
          }

          // 🚀 Stage 1 (Fast Path ~50ms): Core Layout, Stations, Sessions & Staff (Unblocks Live Lab immediately)
          const [
            rRes,
            sessRes,
            coachesRes,
            stationsRes,
            helpRes
          ] = await Promise.all([
            fetchRoomsBySchool(tData.school_id, false, activePlatform).then(d => ({ data: d, error: null })).catch(e => ({ data: [], error: e })),
            fetchActiveSessions(tData.school_id, true).then(d => ({ data: d, error: null })).catch(e => ({ data: [], error: e })),
            fetchSchoolStaff(tData.school_id).then(d => ({ data: d, error: null })).catch(e => ({ data: [], error: e })),
            fetchStationsBySchool(tData.school_id).then(d => ({ data: d, error: null })).catch(e => ({ data: [], error: e })),
            supabase
              .from('help_requests')
              .select('*, users(*)')
              .eq('school_id', tData.school_id)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .then(d => ({ data: d.data || [], error: d.error }), (e: any) => ({ data: [], error: e }))
          ]);

          // 🚀 Stage 2 (Background Path): Heavy relational band query & crisis notifications (Non-blocking, skipped for students)
          Promise.all([
            !isStudent
              ? supabase
                  .from('bands')
                  .select('*, band_members(*, users(*)), coach:users!coach_id(id, first_name, last_name, photo_url), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, last_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready))))')
                  .eq('school_id', tData.school_id)
                  .neq('name', '__SYSTEM_ANNOUNCEMENTS__')
                  .order('name')
                  .then(d => ({ data: d.data || [], error: d.error }), (e: any) => ({ data: [], error: e }))
              : Promise.resolve({ data: [], error: null }),
            !isStudent
              ? fetchCrisisNotifications(tData.is_ghost_mode ? tData.school_id : userId, tData.is_ghost_mode).then(d => ({ data: d, error: null })).catch(e => ({ data: [], error: e }))
              : Promise.resolve({ data: [], error: null })
          ]).then(([bandsRes, crisisRes]) => {
            if (bandsRes?.data) {
              setAllBands(prev => areArraysEqualFast(prev, bandsRes.data) ? prev : bandsRes.data);
            }
            if (crisisRes?.data) {
              setCrisisNotifications(prev => areArraysEqualFast(prev, crisisRes.data || []) ? prev : (crisisRes.data || []));
            }
          }).catch(err => {
            console.warn('[TeacherData] Background data load warning:', err);
          });

          let effectiveRooms = (rRes.data || []).filter((r: any) => {
            if (activePlatform === 'groovelab') return r.is_groovelab_active !== false;
            if (activePlatform === 'campus') return r.is_campus_active !== false;
            return true;
          });

          if (effectiveRooms.length === 0 && (rRes.data || []).length > 0) {
            effectiveRooms = rRes.data || [];
          }

          setRooms(prev => areArraysEqualFast(prev, effectiveRooms) ? prev : effectiveRooms);

          const stationsList: any[] = stationsRes.data || [];
          if (stationsRes.data) {
            setStations(prev => areArraysEqualFast(prev, stationsRes.data) ? prev : stationsRes.data);
          }

          if (effectiveRooms.length > 0) {
            let chosenRoomId = selectedRoomId;
            const currentHasStations = chosenRoomId && stationsList.some((s: any) => s.room_id === chosenRoomId);

            if (!chosenRoomId || !effectiveRooms.some((r: any) => r.id === chosenRoomId) || (!currentHasStations && stationsList.length > 0)) {
              const roomWithStations = effectiveRooms.find((r: any) => stationsList.some((s: any) => s.room_id === r.id));
              if (roomWithStations) {
                chosenRoomId = roomWithStations.id;
              } else {
                const savedRoomId = typeof window !== 'undefined' ? (localStorage.getItem(`groovelab_teacher_selected_room_id_${activePlatform}`) || localStorage.getItem('groovelab_teacher_selected_room_id')) : null;
                if (savedRoomId && effectiveRooms.some((r: any) => r.id === savedRoomId)) {
                  chosenRoomId = savedRoomId;
                } else {
                  chosenRoomId = effectiveRooms[0].id;
                }
              }
            }
            if (chosenRoomId && chosenRoomId !== selectedRoomId) {
              setSelectedRoomId(chosenRoomId);
            }
          }

          const activeSessionsList: any[] = sessRes.data || [];
          if (sessRes.data) {
            setActiveSessions(prev => areArraysEqualFast(prev, activeSessionsList) ? prev : activeSessionsList);
          }

          if (coachesRes.data) {
            const trulyActive = activeSessionsList.filter((s: any) => s && !s.check_out_time);
            const isSelfCheckedIn = trulyActive.some((s: any) => s && s.user_id === userId);
            const isCurrentTeacher = tData?.role?.toLowerCase() === 'teacher' ||
                                     tData?.role?.toLowerCase() === 'admin' ||
                                     tData?.role?.toLowerCase() === 'secretary';

            const activeCoaches = (coachesRes.data || []).filter((c: any) => {
              if (!c) return false;
              if (c.is_observer) return false;
              if (c.id === userId) {
                return isCurrentTeacher && isSelfCheckedIn;
              }
              return trulyActive.some((s: any) => s && s.user_id === c.id);
            });

            const mappedCoaches = activeCoaches
              .filter(Boolean)
              .map((c: any) => ({
                id: c.id,
                users: c,
                session: trulyActive.find((s: any) => s && s.user_id === c.id)
              }));

            const seenNames = new Set();
            const uniqueMapped: any[] = [];
            for (const coach of mappedCoaches) {
              if (coach && coach.users) {
                const fullName = `${coach.users.first_name || ''} ${coach.users.last_name || ''}`.trim().toLowerCase();
                if (!seenNames.has(fullName)) {
                  seenNames.add(fullName);
                  uniqueMapped.push(coach);
                }
              }
            }

            setCoaches(prev => areArraysEqualFast(prev, uniqueMapped) ? prev : uniqueMapped);
          }

          if (helpRes?.data) {
            setHelpRequests(prev => areArraysEqualFast(prev, helpRes.data) ? prev : helpRes.data);
          }
          setIsSyncing(false);
        }
      } catch (err: any) {
        console.error('[TeacherData] Error running fetchData:', err);
        setFetchError(err?.message || 'Fehler beim Laden der Daten');
      } finally {
        isFetchingRef.current = null;
        setIsSyncing(false);
      }
    };

    isFetchingRef.current = runFetch();
    return isFetchingRef.current;
  }, [userId, initialTeacher, activePlatform, selectedRoomId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 📡 Supabase Realtime Sessions Listener: Synchronize all room check-ins & check-outs live (< 50ms)
  useEffect(() => {
    const effectiveSchoolId = schoolData?.id || teacher?.school_id || initialSchoolId;
    if (!effectiveSchoolId) return;

    const channelName = `realtime_sessions_school_${effectiveSchoolId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        async () => {
          // Immediately invalidate the SWR cache so stale data is never served
          invalidateActiveSessionsCache(effectiveSchoolId);
          try {
            const freshSessions = await fetchActiveSessions(effectiveSchoolId, true);
            if (Array.isArray(freshSessions)) {
              setActiveSessions(prev => areArraysEqualFast(prev, freshSessions) ? prev : freshSessions);
            }
          } catch (err) {
            console.warn('[TeacherData] Realtime active sessions sync notice:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolData?.id, teacher?.school_id, initialSchoolId]);

  return {
    teacher,
    setTeacher,
    schoolData,
    setSchoolData,
    initialSchoolData,
    teacherDunningStatus,
    rooms,
    setRooms,
    selectedRoomId,
    setSelectedRoomId,
    stations,
    setStations,
    coaches,
    setCoaches,
    selectedCoachProfile,
    setSelectedCoachProfile,
    allBands,
    setAllBands,
    openProposals,
    setOpenProposals,
    activeSessions,
    setActiveSessions,
    helpRequests,
    setHelpRequests,
    unreadShouts,
    setUnreadShouts,
    crisisNotifications,
    setCrisisNotifications,
    fetchError,
    fetchData,
    isSyncing,
    isTeacherBriefingSidebarCollapsed,
    setIsTeacherBriefingSidebarCollapsed
  };
}
