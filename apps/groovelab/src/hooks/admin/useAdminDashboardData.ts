import { useState, useEffect, useRef } from 'react';
import { supabase, deleteUserStorageAssets } from '../../lib/supabase';
import { areArraysEqualFast, areObjectsEqualFast } from '../../utils/fastCompare';
import { fetchSchoolRoster, getTeacherRoster } from '../../services/studentRosterService';

const isUUID = (str: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

export interface UseAdminDashboardDataParams {
  userId: string;
  activePlatform?: string;
  activeTab?: string;
  bookingDate?: string;
  missionFilter?: string;
  forceTab?: string;
  activeWorkspace?: string | null;
  userRole?: string;
}

export function useAdminDashboardData({
  userId,
  activePlatform = 'groovelab',
  activeTab: propActiveTab = 'live',
  bookingDate,
  missionFilter = 'all',
  forceTab,
  activeWorkspace,
  userRole: propUserRole
}: UseAdminDashboardDataParams) {
  const hasFetchedCoreRef = useRef<string>('');
  const hasFetchedSubViewsRef = useRef<{ bands: boolean; songs: boolean; sessions: boolean; submissions: boolean }>({
    bands: false,
    songs: false,
    sessions: false,
    submissions: false
  });
  const rawTeachersRef = useRef<any[] | null>(null);
  const rawRoomsRef = useRef<any[] | null>(null);
  const rawStudentsRef = useRef<any[] | null>(null);
  const rawSchoolRosterRef = useRef<any[] | null>(null);
  const rawTeacherStudentsRef = useRef<any[] | null>(null);
  const prevPlatformRef = useRef<string>(activePlatform);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (forceTab) return forceTab;
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('groovelab_admin_active_tab');
      if (savedTab) return savedTab;
    }
    return propActiveTab;
  });

  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<any | null>(null);
  const [schoolObj, setSchoolObj] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [setupRooms, setSetupRooms] = useState<any[]>([]);
  const [setupStations, setSetupStations] = useState<any[]>([]);
  const [allBands, setAllBands] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [kiosks, setKiosks] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total_practice_minutes: 0, active_streaks: 0, unlocked_songs: 0, active_stations_count: 0 });
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [studentsXP, setStudentsXP] = useState<Record<string, number>>({});

  // Ghost Mode
  const isGhostActive = typeof window !== 'undefined' && sessionStorage.getItem('groovelab_support_ghost') === 'true';
  const ghostTargetRole = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_ghost_active_role') || 'admin') : 'admin';

  const handleToggleGhostMode = (role: 'admin' | 'teacher') => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('groovelab_ghost_active_role', role);
      window.location.reload();
    }
  };

  const handleGhostImpersonate = (teacherId: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('groovelab_ghost_active_role', 'teacher');
      sessionStorage.setItem('groovelab_ghost_shadowed_teacher_id', teacherId);
      window.location.reload();
    }
  };

  const fetchTeacherStudentsHelper = async (
    teacherId: string,
    schoolId: string,
    platform: string,
    teacherProfile?: any,
    cachedSchoolRoster?: any[]
  ) => {
    let assignedStudentIds: string[] = [];
    if (!teacherId || !isUUID(teacherId)) return assignedStudentIds;

    const [{ data: schedData }, { data: groupData }] = await Promise.all([
      supabase.from('schedules').select('student_id').eq('teacher_id', teacherId),
      supabase.from('bands').select('id').eq('coach_id', teacherId)
    ]);

    const schedStudentIds = (schedData || []).map((s: any) => s.student_id).filter(Boolean);

    let groupStudentIds: string[] = [];
    if (groupData && groupData.length > 0) {
      const groupIds = groupData.map((g: any) => g.id);
      const { data: gsData } = await supabase.from('band_members').select('user_id').in('band_id', groupIds);
      groupStudentIds = (gsData || []).map((gs: any) => gs.user_id).filter(Boolean);
    }

    assignedStudentIds = Array.from(new Set([...schedStudentIds, ...groupStudentIds]));

    const schoolRoster = (cachedSchoolRoster && cachedSchoolRoster.length > 0)
      ? cachedSchoolRoster
      : await fetchSchoolRoster(schoolId, supabase);
    const rawTeacherInst = teacherProfile?.instrument || '';
    const teacherInstruments = (platform === 'groovelab' || !rawTeacherInst)
      ? []
      : rawTeacherInst.split(',').map((i: string) => i.trim().toLowerCase()).filter(Boolean);
    const teacherStudents = getTeacherRoster(teacherId, schoolRoster, assignedStudentIds, teacherInstruments);
    return teacherStudents;
  };

  // 🚀 0ms In-Memory Platform Projection when switching between Campus and GrooveLab
  useEffect(() => {
    if (prevPlatformRef.current === activePlatform) return;
    prevPlatformRef.current = activePlatform;

    if (rawTeachersRef.current) {
      const platformTeachers = activePlatform === 'groovelab'
        ? rawTeachersRef.current.filter((t: any) => Boolean(t.is_groovelab_active || t.isGroovelabActive))
        : rawTeachersRef.current.filter((t: any) => t.is_campus_active !== false && t.isCampusActive !== false);
      setTeachers(platformTeachers);
    }
    if (rawRoomsRef.current) {
      const platformRooms = activePlatform === 'groovelab'
        ? rawRoomsRef.current.filter((r: any) => Boolean(r.is_groovelab_active))
        : rawRoomsRef.current.filter((r: any) => r.is_campus_active !== false);
      setRooms(platformRooms);
      setSetupRooms(platformRooms);
    }
    if (rawSchoolRosterRef.current) {
      if (activePlatform === 'groovelab') {
        const platformStudents = rawSchoolRosterRef.current.filter((s: any) => Boolean(s.is_groovelab_active || s.isGroovelabActive));
        setStudents(platformStudents);
      } else {
        const isTeacher = propUserRole?.toLowerCase() === 'teacher' || (admin && admin.role?.toLowerCase() === 'teacher');
        const platformStudents = isTeacher && rawTeacherStudentsRef.current
          ? rawTeacherStudentsRef.current
          : rawSchoolRosterRef.current;
        setStudents(platformStudents);
      }
    } else if (rawStudentsRef.current) {
      const platformStudents = activePlatform === 'groovelab'
        ? rawStudentsRef.current.filter((s: any) => Boolean(s.is_groovelab_active))
        : rawStudentsRef.current;
      setStudents(platformStudents);
    }
  }, [activePlatform, propUserRole, admin]);

  const fetchData = async (force = false) => {
    let currentAdmin = admin;
    let adminData: any = (!force && currentAdmin && currentAdmin.id === userId && currentAdmin.school_id) ? currentAdmin : null;
    let fetchError = null;
    if (!adminData) {
      try {
      if (userId === 'master-support-id' || (typeof window !== 'undefined' && sessionStorage.getItem('groovelab_support_ghost') === 'true')) {
        const ghostSchoolId = sessionStorage.getItem('groovelab_ghost_school_id') || '';
        const ghostSchoolName = sessionStorage.getItem('groovelab_ghost_school_name') || 'Musikschule';
        const ghostRole = sessionStorage.getItem('groovelab_ghost_active_role') || 'admin';
        adminData = {
          id: 'master-support-id',
          school_id: ghostSchoolId,
          role: ghostRole,
          first_name: `${ghostSchoolName} Support`,
          last_name: '',
          photo_url: '/campus_login_hero.png',
          avatar_url: '/campus_login_hero.png',
          is_campus_active: true,
          is_groovelab_active: true,
          is_ghost_mode: true,
          schools: {
            id: ghostSchoolId,
            name: ghostSchoolName,
            status: 'active'
          }
        };
      } else {
        const { data, error } = await supabase
          .from('users')
          .select('*, schools(*)')
          .eq('id', userId)
          .maybeSingle();
        if (error) {
          fetchError = error;
        } else {
          adminData = data;
        }

        if (!adminData) {
          try {
            const { data: shallowData } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            if (shallowData) adminData = shallowData;
          } catch (e) {}
        }
      }
      } catch (e: any) {
        fetchError = e;
      }
    }

    if (!adminData) {
      const cached = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_cached_user') || localStorage.getItem('groovelab_cached_user') || sessionStorage.getItem('campus_user') || localStorage.getItem('campus_user')) : null;
      if (cached) {
        try { adminData = JSON.parse(cached); } catch (e) {}
      }
    }

    if (!adminData && currentAdmin) adminData = currentAdmin;
    if (!adminData) {
      adminData = {
        id: userId,
        first_name: 'Lehrer',
        last_name: 'GrooveLab',
        role: 'teacher',
        school_id: null
      };
    }

    setAdmin((prev: any) => {
      if (prev && areObjectsEqualFast(prev, adminData)) return prev;
      return adminData;
    });
    currentAdmin = adminData;

    const storedWorkspace = typeof window !== 'undefined'
      ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace'))
      : null;
    const effectiveWorkspace = activeWorkspace || storedWorkspace;
    const effectiveRole = (
      propUserRole?.toLowerCase() === 'teacher' ||
      effectiveWorkspace === 'teacher' ||
      adminData.role?.toLowerCase() === 'teacher'
    ) ? 'teacher' : (adminData.role?.toLowerCase() || 'student');

    if (effectiveRole !== 'admin' && effectiveRole !== 'teacher' && effectiveRole !== 'secretary') {
      return;
    }

    try {
      if (adminData.schools) {
        const sObj = Array.isArray(adminData.schools) ? adminData.schools[0] : adminData.schools;
        setSchoolObj(sObj);
      }

      if (adminData.school_id) {
        const effectiveTab = forceTab || activeTab;
        const isRoomsOnly = effectiveTab === 'rooms';
        const cacheKey = `${adminData.school_id}_${effectiveRole}`;
        const shouldFetchCore = force || hasFetchedCoreRef.current !== cacheKey;
        if (force) {
          hasFetchedSubViewsRef.current = { bands: false, songs: false, sessions: false, submissions: false };
        }

        const needBands = !isRoomsOnly && (effectiveTab === 'bands' || effectiveTab === 'live') && !hasFetchedSubViewsRef.current.bands;
        const needSongs = !isRoomsOnly && (effectiveTab === 'songs' || effectiveTab === 'live') && !hasFetchedSubViewsRef.current.songs;
        const needSessions = !isRoomsOnly && activePlatform === 'groovelab' && (effectiveTab === 'live' || effectiveTab === 'setup') && !hasFetchedSubViewsRef.current.sessions;
        const needSubmissions = !isRoomsOnly && activePlatform === 'groovelab' && (effectiveTab === 'missions' || effectiveTab === 'live') && !hasFetchedSubViewsRef.current.submissions;
        const needAnySubView = needBands || needSongs || needSessions || needSubmissions;

        if (!shouldFetchCore && !needAnySubView) {
          setLoading(false);
          return;
        }

        const corePromise = shouldFetchCore
          ? Promise.all([
              supabase
                .from('users')
                .select('*')
                .eq('school_id', adminData.school_id)
                .in('role', ['teacher', 'admin', 'secretary'])
                .order('first_name'),
              supabase.from('rooms').select('*').eq('school_id', adminData.school_id).order('sort_order', { ascending: true }),
              supabase.from('stations').select('*, rooms!stations_room_id_fkey(*)').eq('school_id', adminData.school_id).order('name'),
              fetchSchoolRoster(adminData.school_id, supabase, force, { includePending: effectiveRole !== 'teacher' }),
              supabase.from('schedules').select('*, rooms(*)').eq('school_id', adminData.school_id)
            ])
          : Promise.resolve(null);

        const subViewPromise = needAnySubView
          ? Promise.all([
              needBands
                ? supabase
                    .from('bands')
                    .select('*, songs(id, title, artist, instrumentation), coach:users!coach_id(id, first_name, last_name, photo_url), band_members(*, users!user_id(id, first_name, last_name, photo_url, role)), band_songs(*, songs(id, title, artist, instrumentation), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url)))')
                    .eq('school_id', adminData.school_id)
                    .order('name')
                : Promise.resolve({ data: null }),
              needSongs
                ? supabase.from('songs').select('*').or(`school_id.eq.${adminData.school_id},school_id.is.null`).order('title')
                : Promise.resolve({ data: null }),
              needSessions
                ? supabase.from('sessions').select('*, profiles:users!inner(*), stations(*)').eq('profiles.school_id', adminData.school_id).is('check_out_time', null)
                : Promise.resolve({ data: null }),
              needSubmissions
                ? supabase.from('user_song_skills').select('*, users!user_song_skills_user_id_fkey!inner(*), songs!inner(*)').eq('is_pending_approval', true)
                : Promise.resolve({ data: null })
            ])
          : Promise.resolve(null);

        const [coreResults, subViewResults] = await Promise.all([corePromise, subViewPromise]);

        if (coreResults) {
          const [tRes, rRes, stRes, schoolRoster, schedRes] = coreResults;
          if (tRes.data) {
            rawTeachersRef.current = tRes.data;
            const platformTeachers = activePlatform === 'groovelab'
              ? tRes.data.filter((t: any) => Boolean(t.is_groovelab_active || t.isGroovelabActive))
              : tRes.data.filter((t: any) => t.is_campus_active !== false && t.isCampusActive !== false);
            setTeachers(platformTeachers);
          }
          if (rRes.data) {
            rawRoomsRef.current = rRes.data;
            const platformRooms = activePlatform === 'groovelab'
              ? rRes.data.filter((r: any) => Boolean(r.is_groovelab_active))
              : rRes.data.filter((r: any) => r.is_campus_active !== false);
            setRooms(platformRooms);
            setSetupRooms(platformRooms);
          }
          if (stRes.data) {
            setStations(stRes.data);
            setSetupStations(stRes.data);
          }
          if (schoolRoster) {
            rawSchoolRosterRef.current = schoolRoster;
            if (effectiveRole === 'teacher') {
              const teacherStudents = await fetchTeacherStudentsHelper(adminData.id, adminData.school_id, activePlatform, adminData, schoolRoster);
              rawTeacherStudentsRef.current = teacherStudents;
              rawStudentsRef.current = teacherStudents;
              if (activePlatform === 'groovelab') {
                // 🎸 0,1% Goldstandard: Im GrooveLab-Bandlabor sieht jede Lehrkraft alle aktiven GrooveLab-Schüler der Schule (Parität mit Sekretariat)
                const activeStudents = schoolRoster.filter((s: any) => Boolean(s.is_groovelab_active || s.isGroovelabActive));
                setStudents(activeStudents);
              } else {
                setStudents(teacherStudents);
              }
            } else {
              rawStudentsRef.current = schoolRoster;
              const activeStudents = activePlatform === 'groovelab' 
                ? schoolRoster.filter((s: any) => Boolean(s.is_groovelab_active || s.isGroovelabActive)) 
                : schoolRoster;
              setStudents(activeStudents);
            }
          }
          if (schedRes.data) setSchedules(schedRes.data);
          hasFetchedCoreRef.current = cacheKey;
        }

        if (subViewResults) {
          const [bRes, sngRes, sessRes, subRes] = subViewResults;
          if (bRes.data) {
            hasFetchedSubViewsRef.current.bands = true;
            const realBands = bRes.data.filter((b: any) => b.name && b.name !== '__SYSTEM_ANNOUNCEMENTS__' && !b.name.startsWith('__SYSTEM_'));
            setAllBands(realBands);
          }
          if (sngRes.data) {
            hasFetchedSubViewsRef.current.songs = true;
            setSongs(sngRes.data);
          }
          if (sessRes.data) {
            hasFetchedSubViewsRef.current.sessions = true;
            setActiveSessions(sessRes.data);
          }
          if (subRes.data) {
            hasFetchedSubViewsRef.current.submissions = true;
            const mapped = subRes.data.map((s: any) => ({
              ...s,
              users: Array.isArray(s.users) ? s.users[0] : s.users,
              songs: Array.isArray(s.songs) ? s.songs[0] : s.songs
            }));
            setSubmissions(mapped);
          }
        }
      }
    } catch (e) {
      console.error('[AdminDashboardData] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, activePlatform, bookingDate, missionFilter]);

  useEffect(() => {
    if (forceTab && forceTab !== activeTab) {
      setActiveTab(forceTab);
    }
  }, [forceTab]);

  return {
    activeTab,
    setActiveTab,
    loading,
    setLoading,
    admin,
    setAdmin,
    schoolObj,
    setSchoolObj,
    students,
    setStudents,
    teachers,
    setTeachers,
    rooms,
    setRooms,
    stations,
    setStations,
    setupRooms,
    setSetupRooms,
    setupStations,
    setSetupStations,
    allBands,
    setAllBands,
    songs,
    setSongs,
    kiosks,
    setKiosks,
    schedules,
    setSchedules,
    stats,
    setStats,
    submissions,
    setSubmissions,
    activeSessions,
    setActiveSessions,
    studentsXP,
    setStudentsXP,
    isGhostActive,
    ghostTargetRole,
    handleToggleGhostMode,
    handleGhostImpersonate,
    fetchData
  };
}
