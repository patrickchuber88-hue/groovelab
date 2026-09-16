import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface CampusTeacherStats {
  studentCount: number;
  totalMinutes: number;
  teachingDays: string[];
  primaryRoom: string;
  schedules: any[];
}

export interface UseCampusUserProfileParams {
  user: any;
  setUser: (val: any) => void;
  activeStudentTab: string;
  activePlatform: string;
}

export interface UseCampusUserProfileReturn {
  session: any;
  setSession: (val: any) => void;
  setSessionRaw: React.Dispatch<React.SetStateAction<any>>;
  totalPresenceMins: number;
  setTotalPresenceMins: React.Dispatch<React.SetStateAction<number>>;
  showEditProfile: boolean;
  setShowEditProfile: React.Dispatch<React.SetStateAction<boolean>>;
  editingProfile: any;
  setEditingProfile: React.Dispatch<React.SetStateAction<any>>;
  handleUpdateProfile: (e: React.FormEvent) => Promise<void>;
  campusTeacherStats: CampusTeacherStats | null;
  setCampusTeacherStats: React.Dispatch<React.SetStateAction<CampusTeacherStats | null>>;
}

/**
 * 🏛️ useCampusUserProfile (Monolith Goldstandard Hook)
 * Kapselt Benutzer-Session (mit Deep-Equality-Schutz gegen unnötige Re-renders),
 * Profilbearbeitung (handleUpdateProfile mit autoritativem Supabase-Update und Schutz
 * von Verwaltungs-Avataren nach Goldstandard) sowie Lehrer-Statistiken (campusTeacherStats).
 */
export function useCampusUserProfile({
  user,
  setUser,
  activeStudentTab,
  activePlatform
}: UseCampusUserProfileParams): UseCampusUserProfileReturn {
  // 1. Session-Zustand mit Deep-Equality-Schutz
  const [session, setSessionRaw] = useState<any>(null);
  const setSession = useCallback((val: any) => {
    setSessionRaw((prev: any) => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      if (prev && nextVal && typeof prev === 'object' && typeof nextVal === 'object') {
        try {
          if (JSON.stringify(prev) === JSON.stringify(nextVal)) {
            return prev;
          }
        } catch {}
      }
      return nextVal;
    });
  }, []);

  // 2. Präsenz-Minuten
  const [totalPresenceMins, setTotalPresenceMins] = useState<number>(0);

  // 3. Profil-Bearbeitung
  const [showEditProfile, setShowEditProfile] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);

  const handleUpdateProfile = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !user) return;
    
    const updateData: any = {
      first_name: editingProfile.first_name,
      last_name: editingProfile.last_name,
      photo_url: (user.role === 'admin' || user.role === 'secretary') ? '/campus_login_hero.png' : editingProfile.photo_url
    };

    if (user.role === 'student') {
      updateData.age = editingProfile.age;
    } else {
      updateData.groovelab_instrument = editingProfile.groovelab_instrument;
      updateData.bio = editingProfile.bio;
      updateData.expertise = editingProfile.expertise;
      updateData.bands = editingProfile.bands;
    }

    const { error } = await supabase.from('users').update(updateData).eq('id', user.id);
    
    if (error) {
      alert('Fehler beim Aktualisieren: ' + error.message);
    } else {
      const { data: updatedUser, error: userErr } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('id', user.id)
        .single();
        
      if (userErr || !updatedUser) {
        console.error('[Dashboard] User data fetch error:', userErr);
        return;
      }
      console.log('[Dashboard] User data updated:', updatedUser.first_name, 'School:', updatedUser.school_id);
      if (updatedUser) setUser(updatedUser);
      setShowEditProfile(false);
    }
  }, [editingProfile, user, setUser]);

  // 4. Lehrer-Statistiken
  const [campusTeacherStats, setCampusTeacherStats] = useState<CampusTeacherStats | null>(null);

  useEffect(() => {
    if (activeStudentTab === 'profile' && activePlatform === 'campus' && user && (user.role === 'teacher' || user.role === 'admin')) {
      const fetchStats = async () => {
        try {
          const { data: scheds } = await supabase
            .from('schedules')
            .select('*, rooms(name)')
            .eq('teacher_id', user.id);
          
          if (scheds) {
            const uniqueStudents = new Set(scheds.filter((s: any) => s.student_id).map((s: any) => s.student_id));
            const totalMins = scheds.filter((s: any) => s.student_id).reduce((acc: number, curr: any) => acc + (curr.duration || 30), 0);
            
            const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
            const uniqueDays = Array.from(new Set(scheds.map((s: any) => s.day_of_week)))
              .sort((a: any, b: any) => a - b)
              .map((d: any) => DAYS_DE[d]);

            // Primary room calculation
            const roomCounts: Record<string, number> = {};
            scheds.forEach((s: any) => {
              const rName = s.rooms?.name;
              if (rName) {
                roomCounts[rName] = (roomCounts[rName] || 0) + 1;
              }
            });
            let primary = 'Kein Raum';
            let maxCount = 0;
            Object.entries(roomCounts).forEach(([rName, count]) => {
              if (count > maxCount) {
                maxCount = count;
                primary = rName;
              }
            });

            setCampusTeacherStats({
              studentCount: uniqueStudents.size,
              totalMinutes: totalMins,
              teachingDays: uniqueDays,
              primaryRoom: primary,
              schedules: scheds
            });
          }
        } catch (err) {
          console.error('Error fetching teacher stats:', err);
        }
      };
      fetchStats();
    }
  }, [activeStudentTab, activePlatform, user?.id]);

  return {
    session,
    setSession,
    setSessionRaw,
    totalPresenceMins,
    setTotalPresenceMins,
    showEditProfile,
    setShowEditProfile,
    editingProfile,
    setEditingProfile,
    handleUpdateProfile,
    campusTeacherStats,
    setCampusTeacherStats
  };
}
