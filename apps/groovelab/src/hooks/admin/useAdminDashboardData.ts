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

  const fetchTeacherStudentsHelper = async (teacherId: string, schoolId: string, platform: string, teacherProfile?: any) => {
    let assignedStudentIds: string[] = [];
    if (!teacherId || !isUUID(teacherId)) return assignedStudentIds;

    const [{ data: schedData }, { data: occData }, { data: groupData }, stRes] = await Promise.all([
      supabase.from('schedules').select('student_id').eq('teacher_id', teacherId),
      supabase.from('schedule_occurrences').select('student_id').eq('teacher_id', teacherId),
      supabase.from('bands').select('id').eq('coach_id', teacherId),
      supabase.from('student_teachers').select('student_id').eq('teacher_id', teacherId)
    ]);

    const schedStudentIds = (schedData || []).map((s: any) => s.student_id).filter(Boolean);
    const occStudentIds = (occData || []).map((s: any) => s.student_id).filter(Boolean);
    const stStudentIds = (stRes?.data || []).map((s: any) => s.student_id).filter(Boolean);

    let groupStudentIds: string[] = [];
    if (groupData && groupData.length > 0) {
      const groupIds = groupData.map((g: any) => g.id);
      const { data: gsData } = await supabase.from('band_members').select('user_id').in('band_id', groupIds);
      groupStudentIds = (gsData || []).map((gs: any) => gs.user_id).filter(Boolean);
    }

    assignedStudentIds = Array.from(new Set([...schedStudentIds, ...occStudentIds, ...groupStudentIds, ...stStudentIds]));

    const schoolRoster = await fetchSchoolRoster(schoolId, supabase);
    const rawTeacherInst = teacherProfile?.instrument || '';
    const teacherInstruments = rawTeacherInst
      ? rawTeacherInst.split(',').map((i: string) => i.trim().toLowerCase()).filter(Boolean)
      : [];
    let teacherStudents = getTeacherRoster(teacherId, schoolRoster, assignedStudentIds, teacherInstruments);

    if (platform !== 'campus') {
      teacherStudents = teacherStudents.filter(s => s.is_groovelab_active);
    }

    if (teacherStudents.length > 0 && platform === 'campus') {
      const unlinkedStudents = teacherStudents.filter((s: any) => !s.teacher_id && !s.isPendingOnboarding).map((s: any) => s.id);
      if (unlinkedStudents.length > 0) {
        supabase.from('users').update({ teacher_id: teacherId }).in('id', unlinkedStudents).then(() => {
          console.log(`[Teacher Board] Auto-synced teacher_id for ${unlinkedStudents.length} students.`);
        });
      }
    }

    return teacherStudents;
  };

  const fetchData = async (force = false) => {
    let currentAdmin = admin;
    let adminData: any = null;
    let fetchError = null;
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
        const cacheKey = `${adminData.school_id}_${activePlatform}_${effectiveRole}`;
        const shouldFetchCore = force || hasFetchedCoreRef.current !== cacheKey;

        if (shouldFetchCore) {
          // Parallel fetch core data: teachers, rooms, stations, schoolRoster, schedules
          const [tRes, rRes, stRes, schoolRoster, schedRes] = await Promise.all([
            supabase
              .from('users')
              .select('*')
              .eq('school_id', adminData.school_id)
              .in('role', ['teacher', 'admin', 'secretary'])
              .order('first_name'),
            supabase.from('rooms').select('*').eq('school_id', adminData.school_id).order('sort_order', { ascending: true }),
            supabase.from('stations').select('*, rooms!stations_room_id_fkey(*)').eq('school_id', adminData.school_id).order('name'),
            fetchSchoolRoster(adminData.school_id, supabase, force),
            supabase.from('schedules').select('*, rooms(*)').eq('school_id', adminData.school_id)
          ]);

          if (tRes.data) {
            const platformTeachers = activePlatform === 'groovelab'
              ? tRes.data.filter((t: any) => Boolean(t.is_groovelab_active || t.isGroovelabActive))
              : tRes.data.filter((t: any) => t.is_campus_active !== false && t.isCampusActive !== false);
            setTeachers(platformTeachers);
          }
          if (rRes.data) {
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
            if (effectiveRole === 'teacher') {
              const teacherStudents = await fetchTeacherStudentsHelper(adminData.id, adminData.school_id, activePlatform, adminData);
              setStudents(teacherStudents);
            } else {
              const activeStudents = activePlatform === 'groovelab' 
                ? schoolRoster.filter(s => s.is_groovelab_active) 
                : schoolRoster;
              setStudents(activeStudents);
            }
          }
          if (schedRes.data) setSchedules(schedRes.data);
          hasFetchedCoreRef.current = cacheKey;
        }

        // Fetch heavy sub-view data only when needed (skip completely if rooms-only view)
        if (!isRoomsOnly) {
          const [bRes, sngRes, sessRes, subRes] = await Promise.all([
            effectiveTab === 'bands' || effectiveTab === 'live'
              ? supabase
                  .from('bands')
                  .select('*, songs(id, title, artist, instrumentation), coach:users!coach_id(id, first_name, last_name, photo_url), band_members(*, users!user_id(id, first_name, last_name, photo_url, role)), band_songs(*, songs(id, title, artist, instrumentation), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url)))')
                  .eq('school_id', adminData.school_id)
                  .order('name')
              : Promise.resolve({ data: null }),
            effectiveTab === 'songs' || effectiveTab === 'live'
              ? supabase.from('songs').select('*').or(`school_id.eq.${adminData.school_id},school_id.is.null`).order('title')
              : Promise.resolve({ data: null }),
            activePlatform === 'groovelab' && (effectiveTab === 'live' || effectiveTab === 'setup')
              ? supabase.from('sessions').select('*, profiles:users!inner(*), stations(*)').eq('profiles.school_id', adminData.school_id).is('check_out_time', null)
              : Promise.resolve({ data: null }),
            activePlatform === 'groovelab' && (effectiveTab === 'missions' || effectiveTab === 'live')
              ? supabase.from('user_song_skills').select('*, users!user_song_skills_user_id_fkey!inner(*), songs!inner(*)').eq('is_pending_approval', true)
              : Promise.resolve({ data: null })
          ]);

          if (bRes.data) {
            const realBands = bRes.data.filter((b: any) => b.name && b.name !== '__SYSTEM_ANNOUNCEMENTS__' && !b.name.startsWith('__SYSTEM_'));
            setAllBands(realBands);
          }
          if (sngRes.data) setSongs(sngRes.data);
          if (sessRes.data) setActiveSessions(sessRes.data);
          if (subRes.data) {
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
