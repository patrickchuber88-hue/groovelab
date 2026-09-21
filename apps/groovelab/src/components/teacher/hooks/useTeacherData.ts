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
  fetchUnreadShouts 
} from '../../../repositories';
import { computeSchoolDunningStatus, SchoolDunningStatus } from '../../../domain/schoolDunningEngine';
import { getSimulatedNow } from '../utils/teacherDashboardUtils';

// 🛡️ OWASP ASVS Level 3: Strict explicit column whitelists for teacher profiles (Zero Wildcards & Zero Secret Leakage)
export const TEACHER_SELECT_COLUMNS = 'id, school_id, first_name, last_name, nickname, role, roles, email, photo_url, avatar_url, instrument, is_active, ausweis_nummer, teacher_qr_token, qr_token, is_campus_active, is_groovelab_active, is_premium_user, contract_ends_at, lesson_duration, is_pin_activated, ausfall_until, ausfall_start, created_at, preferred_room_ids, planned_boards, student_billing_payment_method, activated_at, student_billing_cash_paid, is_trial, trial_ends_at, exempt_from_direct_billing, quiet_hours';

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
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('groovelab_teacher_selected_room_id') || '';
    }
    return '';
  });

  useEffect(() => {
    if (selectedRoomId) {
      localStorage.setItem('groovelab_teacher_selected_room_id', selectedRoomId);
    }
  }, [selectedRoomId]);

  const [stations, setStations] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [selectedCoachProfile, setSelectedCoachProfile] = useState<any | null>(null);
  const [allBands, setAllBands] = useState<any[]>([]);
  const [openProposals, setOpenProposals] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
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

        const applySchoolAndDunning = (sd: any) => {
          if (!sd) return;
          setSchoolData(sd);
          setInitialSchoolData(JSON.parse(JSON.stringify(sd)));

          supabase
            .from('invoices')
            .select('id, type, amount, status, billing_date, due_date, items')
            .eq('school_id', tData.school_id)
            .then(({ data: invData }) => {
              const status = computeSchoolDunningStatus(sd, invData || [], getSimulatedNow());
              setTeacherDunningStatus(status);
            });
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

          const [
            rRes,
            sessRes,
            coachesRes,
            crisisRes,
            stationsRes
          ] = await Promise.all([
            fetchRoomsBySchool(tData.school_id, false, activePlatform).then(d => ({ data: d, error: null })).catch(e => ({ data: [], error: e })),
            fetchActiveSessions(tData.school_id).then(d => ({ data: d, error: null })).catch(e => ({ data: [], error: e })),
            fetchSchoolStaff(tData.school_id).then(d => ({ data: d, error: null })).catch(e => ({ data: [], error: e })),
            fetchCrisisNotifications(tData.is_ghost_mode ? tData.school_id : userId, tData.is_ghost_mode).then(d => ({ data: d, error: null })).catch(e => ({ data: [], error: e })),
            fetchStationsBySchool(tData.school_id).then(d => ({ data: d, error: null })).catch(e => ({ data: [], error: e }))
          ]);

          setCrisisNotifications(prev => areArraysEqualFast(prev, crisisRes.data || []) ? prev : (crisisRes.data || []));

          let effectiveRooms = (rRes.data || []).filter((r: any) => {
            if (activePlatform === 'groovelab') return r.is_groovelab_active !== false;
            if (activePlatform === 'campus') return r.is_campus_active !== false;
            return true;
          });
          if (effectiveRooms.length === 0 && (rRes.data || []).length > 0) {
            effectiveRooms = rRes.data || [];
          }

          setRooms(prev => areArraysEqualFast(prev, effectiveRooms) ? prev : effectiveRooms);
          if (effectiveRooms.length > 0 && !selectedRoomId) {
            setSelectedRoomId(effectiveRooms[0].id);
          }

          if (stationsRes.data) {
            setStations(prev => areArraysEqualFast(prev, stationsRes.data) ? prev : stationsRes.data);
          }

          if (sessRes.data) {
            setActiveSessions(prev => areArraysEqualFast(prev, sessRes.data) ? prev : sessRes.data);
          }

          if (coachesRes.data) {
            setCoaches(prev => areArraysEqualFast(prev, coachesRes.data) ? prev : coachesRes.data);
          }
        }
      } catch (err: any) {
        console.error('[TeacherData] Error running fetchData:', err);
        setFetchError(err?.message || 'Fehler beim Laden der Daten');
      } finally {
        isFetchingRef.current = null;
      }
    };

    isFetchingRef.current = runFetch();
    return isFetchingRef.current;
  }, [userId, initialTeacher, activePlatform, selectedRoomId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    isTeacherBriefingSidebarCollapsed,
    setIsTeacherBriefingSidebarCollapsed
  };
}
