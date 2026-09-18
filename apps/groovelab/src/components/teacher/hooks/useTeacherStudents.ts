import { useState, useEffect, useCallback } from 'react';
import { supabase, queryCache } from '../../../lib/supabase';
import { useRealNamesVisibility, formatTeacherFullName } from '../../../utils/nameHelper';
import { StudentToDelete } from '../../ConfirmDeleteStudentModal';

export interface UseTeacherStudentsProps {
  userId: string;
  teacher: any;
  schoolData: any;
  activePlatform: 'campus' | 'groovelab';
  onRefresh?: () => Promise<void> | void;
}

export function useTeacherStudents({
  userId,
  teacher,
  schoolData,
  activePlatform,
  onRefresh
}: UseTeacherStudentsProps) {
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentLetter, setStudentLetter] = useState('ALL');
  const [studentInstrumentFilter, setStudentInstrumentFilter] = useState('ALL');

  const { visible: showRealNames, toggleVisibility: toggleRealNames } = useRealNamesVisibility();

  useEffect(() => {
    // Always start with Eye ON (privacy mode active: Vorname N.) when opening TeacherDashboard
    toggleRealNames(true);
  }, []);

  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any | null>(null);
  const [deleteStudentModalData, setDeleteStudentModalData] = useState<StudentToDelete | null>(null);
  const [modalDocStudent, setDocStudent] = useState<any | null>(null);

  const [showInviteStudent, setShowInviteStudent] = useState(false);
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteSaving, setInviteSaving] = useState(false);

  const handleUpdateStudent = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const activeSchool = schoolData || (Array.isArray(teacher?.schools) ? teacher?.schools[0] : teacher?.schools);
      const hasCampus = activePlatform === 'campus' && activeSchool?.has_campus_subscription !== false;
      const finalLastName = hasCampus ? (editingStudent.last_name || '') : (editingStudent.last_name?.trim() ? editingStudent.last_name.trim().charAt(0).toUpperCase() + '.' : '');
      const { error } = await supabase.from('users').update({
        first_name: editingStudent.first_name,
        last_name: finalLastName,
        birth_date: null,
        status: editingStudent.status || 'active',
        is_trial: editingStudent.is_trial || false,
        trial_ends_at: editingStudent.is_trial && editingStudent.trial_ends_at ? editingStudent.trial_ends_at : null,
        contract_ends_at: editingStudent.contract_ends_at || null,
        is_external_vocalist: editingStudent.is_external_vocalist || false,
        instrument: editingStudent.is_external_vocalist ? 'Vocals' : (editingStudent.instrument && editingStudent.instrument !== 'Musiker' ? editingStudent.instrument : (teacher?.instrument || 'Gitarre')),
        app_usage_mode: editingStudent.app_usage_mode || 'student_only'
      }).eq('id', editingStudent.id);
      
      if (error) {
        alert('Fehler beim Aktualisieren: ' + error.message);
      } else {
        setAllStudents(prev => prev.map(s => s.id === editingStudent.id ? editingStudent : s));
        setEditingStudent(null);
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      console.error('Failed to update student:', err);
      alert('Fehler beim Aktualisieren: ' + (err?.message || 'Unbekannter Fehler'));
    }
  }, [editingStudent, schoolData, teacher, activePlatform, onRefresh]);

  const handleDeleteStudent = useCallback((id: string) => {
    const studentToDelete = allStudents.find(s => s.id === id);
    if (!studentToDelete) return;

    const teacherName = teacher ? formatTeacherFullName(teacher) : undefined;
    const studentName = `${studentToDelete.first_name || ''} ${studentToDelete.last_name || ''}`.trim() || 'Schüler';

    setDeleteStudentModalData({
      id: studentToDelete.id,
      name: studentName,
      instrument: studentToDelete.instrument,
      teacherName,
      isCampusActive: studentToDelete.is_campus_active,
      isGroovelabActive: studentToDelete.is_groovelab_active
    });
  }, [allStudents, teacher]);

  const handleInviteStudent = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteFirstName.trim()) return;
    setInviteSaving(true);
    try {
      if (teacher?.schools?.limits_enabled) {
        const maxStudents = teacher.schools.max_students ?? 6;
        if (allStudents.length >= maxStudents) {
          alert(`Limit erreicht! Maximal ${maxStudents} Schüler.`);
          return;
        }
      }
      const activeSchool = schoolData || (Array.isArray(teacher?.schools) ? teacher?.schools[0] : teacher?.schools);
      const studentId = crypto.randomUUID();
      const qrToken = crypto.randomUUID();
      const lName = inviteLastName.trim();
      const formattedLast = lName;
      const { data, error } = await supabase.from('users').insert({
        id: studentId,
        school_id: teacher.school_id,
        role: 'student',
        first_name: inviteFirstName.trim(),
        last_name: formattedLast,
        email: `student.${studentId}@campus-groovelab.local`,
        photo_url: '/avatar_ghost.jpg',
        qr_token: qrToken,
        instrument: teacher?.instrument || 'Gitarre',
        status: 'invited',
        is_trial: true,
        is_campus_active: activeSchool?.student_billing_option === 'option3_3' || activeSchool?.student_billing_option === 'all_inclusive',
        is_groovelab_active: activeSchool?.student_billing_option === 'option3_3' || activeSchool?.student_billing_option === 'all_inclusive',
        teacher_id: userId
      }).select().single();
      if (error) {
        alert('Fehler: ' + error.message);
      } else if (data) {
        queryCache.invalidatePrefix('teacher_students_');
        setAllStudents(prev => [...prev, data]);
        if (onRefresh) onRefresh();
        const link = `${window.location.origin}/?invite=${qrToken}`;
        setInviteLink(link);
      }
    } finally {
      setInviteSaving(false);
    }
  }, [inviteFirstName, inviteLastName, teacher, allStudents, schoolData, userId, onRefresh]);

  const teachersManageStudents = schoolData?.teachers_manage_students ?? false;

  return {
    allStudents,
    setAllStudents,
    studentSearch,
    setStudentSearch,
    studentLetter,
    setStudentLetter,
    studentInstrumentFilter,
    setStudentInstrumentFilter,
    showRealNames,
    toggleRealNames,
    editingStudent,
    setEditingStudent,
    selectedStudentProfile,
    setSelectedStudentProfile,
    deleteStudentModalData,
    setDeleteStudentModalData,
    modalDocStudent,
    setDocStudent,
    showInviteStudent,
    setShowInviteStudent,
    inviteFirstName,
    setInviteFirstName,
    inviteLastName,
    setInviteLastName,
    inviteEmail,
    setInviteEmail,
    inviteLink,
    setInviteLink,
    inviteSaving,
    teachersManageStudents,
    handleUpdateStudent,
    handleDeleteStudent,
    handleInviteStudent
  };
}
