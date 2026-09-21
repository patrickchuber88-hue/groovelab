import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { BypassTeacher, GrooveLabCoach } from '../types/secretaryCommonTypes';

export interface UseSecretaryTeacherProfilesOptions {
  userId?: string;
}

export interface UseSecretaryTeacherProfilesReturn {
  currentUserProfile: any;
  setCurrentUserProfile: React.Dispatch<React.SetStateAction<any>>;
  bypassTeachers: BypassTeacher[];
  setBypassTeachers: React.Dispatch<React.SetStateAction<BypassTeacher[]>>;
  coaches: GrooveLabCoach[];
  setCoaches: React.Dispatch<React.SetStateAction<GrooveLabCoach[]>>;
  campusTeachers: any[];
  setCampusTeachers: React.Dispatch<React.SetStateAction<any[]>>;
  allTeachers: any[];
  setAllTeachers: React.Dispatch<React.SetStateAction<any[]>>;
  allTeachersRef: React.MutableRefObject<any[]>;
  allUniqueTeacherProfiles: any[];
}

export function useSecretaryTeacherProfiles({ userId }: UseSecretaryTeacherProfilesOptions): UseSecretaryTeacherProfilesReturn {
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(() => {
    try {
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
    } catch {
      // Fallback in restricted storage environments
    }
    return null;
  });

  // Sofortiges Laden des eigenen Profils – unabhängig vom langen fetchDashboardData
  useEffect(() => {
    if (!userId) return;
    const loadOwnProfile = async () => {
      try {
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
      } catch (err) {
        console.error('[useSecretaryTeacherProfiles] Error loading profile:', err);
      }
    };
    loadOwnProfile();
  }, [userId]);

  const [bypassTeachers, setBypassTeachers] = useState<BypassTeacher[]>([]);
  const [coaches, setCoaches] = useState<GrooveLabCoach[]>([]);
  const [campusTeachers, setCampusTeachers] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const allTeachersRef = useRef<any[]>([]);

  useEffect(() => {
    allTeachersRef.current = allTeachers;
  }, [allTeachers]);

  // Unified teacher profiles list for bulk operations & modals
  const allUniqueTeacherProfiles = useMemo(() => {
    return [...(campusTeachers || []), ...(bypassTeachers || []), ...(coaches || []), ...(allTeachers || [])].reduce((acc: any[], t: any) => {
      if (t?.id && !acc.some((x: any) => x.id === t.id)) {
        acc.push(t);
      }
      return acc;
    }, []);
  }, [campusTeachers, bypassTeachers, coaches, allTeachers]);

  return {
    currentUserProfile,
    setCurrentUserProfile,
    bypassTeachers,
    setBypassTeachers,
    coaches,
    setCoaches,
    campusTeachers,
    setCampusTeachers,
    allTeachers,
    setAllTeachers,
    allTeachersRef,
    allUniqueTeacherProfiles
  };
}
