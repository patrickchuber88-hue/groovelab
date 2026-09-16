import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface UseCampusStaffBandSyncParams {
  user: any;
  activePlatform: string;
  activeStudentTab: string;
  setAllBands: React.Dispatch<React.SetStateAction<any[]>>;
  setUserBands: React.Dispatch<React.SetStateAction<any[]>>;
}

export const useCampusStaffBandSync = ({
  user,
  activePlatform,
  activeStudentTab,
  setAllBands,
  setUserBands
}: UseCampusStaffBandSyncParams): void => {
  useEffect(() => {
    if (user?.id && (user.role === 'teacher' || user.role === 'admin' || user.role === 'secretary')) {
      const schoolId = user.school_id || (Array.isArray(user.schools) ? user.schools[0]?.id : user.schools?.id);
      if (!schoolId) return;

      supabase
        .from('bands')
        .select('*, songs(id, title, artist, instrumentation), band_members(*, users!user_id(id, first_name, last_name, photo_url, role, teacher_id)), band_songs(*, songs(id, title, artist, instrumentation), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))), coach:users!coach_id(id, first_name, last_name, photo_url)')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })
        .then(({ data: freshBands, error }) => {
          if (!error && freshBands) {
            const realBands = freshBands.filter((b: any) => b.name && b.name !== '__SYSTEM_ANNOUNCEMENTS__' && !b.name.startsWith('__SYSTEM_'));
            setAllBands(realBands);
            
            const teacherCoachedBands = realBands.filter((band: any) => {
              const isCoach = band.coach_id === user.id || (band.coach && band.coach.id === user.id);
              const isMember = (band.band_members || []).some((m: any) => m.user_id === user.id);
              const hasMyStudent = (band.band_members || []).some((m: any) => {
                const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
                return u && u.teacher_id === user.id;
              });
              return isCoach || isMember || hasMyStudent;
            });

            setUserBands(teacherCoachedBands);
          }
        });
    }
  }, [user?.id, user?.role, user?.school_id, user?.schools, activePlatform, activeStudentTab, setAllBands, setUserBands]);
};
