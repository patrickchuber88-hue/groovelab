import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface UseCampusProfileInspectorReturn {
  selectedTeacher: any;
  setSelectedTeacher: React.Dispatch<React.SetStateAction<any>>;
  selectedStudentProfile: any;
  setSelectedStudentProfile: React.Dispatch<React.SetStateAction<any>>;
  openUserProfile: (userIdOrUser: any) => Promise<void>;
}

export const useCampusProfileInspector = (): UseCampusProfileInspectorReturn => {
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any>(null);

  const openUserProfile = useCallback(async (userIdOrUser: any) => {
    if (!userIdOrUser) return;
    
    if (typeof userIdOrUser === 'object') {
      if (userIdOrUser.role === 'teacher' || userIdOrUser.role === 'admin') {
        setSelectedTeacher(userIdOrUser);
      } else {
        setSelectedStudentProfile(userIdOrUser);
      }
      return;
    }
    
    if (typeof userIdOrUser === 'string') {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userIdOrUser)
          .single();
          
        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }
        
        if (data) {
          if (data.role === 'teacher' || data.role === 'admin') {
            setSelectedTeacher(data);
          } else {
            setSelectedStudentProfile(data);
          }
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedTeacher?.id) {
      sessionStorage.setItem('groovelab_selected_teacher_id', selectedTeacher.id);
    } else {
      sessionStorage.removeItem('groovelab_selected_teacher_id');
    }
  }, [selectedTeacher]);

  useEffect(() => {
    if (selectedStudentProfile?.id) {
      sessionStorage.setItem('groovelab_selected_student_id', selectedStudentProfile.id);
    } else {
      sessionStorage.removeItem('groovelab_selected_student_id');
    }
  }, [selectedStudentProfile]);

  useEffect(() => {
    const savedTeacherId = sessionStorage.getItem('groovelab_selected_teacher_id');
    if (savedTeacherId && !selectedTeacher) {
      openUserProfile(savedTeacherId);
    }
    const savedStudentId = sessionStorage.getItem('groovelab_selected_student_id');
    if (savedStudentId && !selectedStudentProfile) {
      openUserProfile(savedStudentId);
    }
  }, [openUserProfile]);

  useEffect(() => {
    (window as any).openUserProfile = openUserProfile;
    return () => {
      delete (window as any).openUserProfile;
    };
  }, [openUserProfile]);

  return {
    selectedTeacher,
    setSelectedTeacher,
    selectedStudentProfile,
    setSelectedStudentProfile,
    openUserProfile,
  };
};
