import { useState, useMemo } from 'react';
import { supabase, deleteUserStorageAssets } from '../../../lib/supabase';
import { getParentOnboardingUrl } from '../../../utils/tenantUrlHelper';
import { generateStarterPin, generateSecureQrToken } from '../utils/secretaryAuthUtils';

export interface UseSecretaryStaffOptions {
  schoolId: string;
  userId: string;
  schoolName?: string;
  currentSchoolProfile?: any;
  currentUserProfile?: any;
  setCurrentUserProfile?: React.Dispatch<React.SetStateAction<any>>;
  userRoles?: string[];
  isAvvSigned: boolean;
  setShowAvvModal: (show: boolean) => void;
  activeSubjectsList?: string[];
  fetchDashboardData: () => Promise<void> | void;
  assertSecretaryWriteAccess: (actionLabel?: string) => boolean;
}

export function useSecretaryStaff({
  schoolId,
  userId,
  schoolName,
  currentSchoolProfile,
  currentUserProfile,
  setCurrentUserProfile,
  userRoles = [],
  isAvvSigned,
  setShowAvvModal,
  activeSubjectsList = [],
  fetchDashboardData,
  assertSecretaryWriteAccess
}: UseSecretaryStaffOptions) {
  // Administrative employees list
  const [employees, setEmployees] = useState<any[]>([]);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // RBAC Master-Standard: Check if the logged-in user possesses an active teacher role (Dual Role)
  const isCurrentUserTeacher = useMemo(() => {
    const currentEmp = employees.find(e => e.id === userId);
    const roles = Array.isArray(currentEmp?.roles) 
      ? currentEmp.roles 
      : Array.isArray(currentUserProfile?.roles) 
        ? currentUserProfile.roles 
        : Array.isArray(userRoles) 
          ? userRoles 
          : [];
    return roles.includes('teacher') || currentEmp?.role === 'teacher' || currentUserProfile?.role === 'teacher';
  }, [employees, userId, currentUserProfile, userRoles]);

  // Employee Form States
  const [employeeFirstName, setEmployeeFirstName] = useState<string>('');
  const [employeeLastName, setEmployeeLastName] = useState<string>('');
  const [employeeNickname, setEmployeeNickname] = useState<string>('');
  const [employeeEmail, setEmployeeEmail] = useState<string>('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState<string>('');
  const [employeeStatusTab, setEmployeeStatusTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [employeeFilterRole, setEmployeeFilterRole] = useState<string>('All');
  const [isEmployeeCsvExpanded, setIsEmployeeCsvExpanded] = useState<boolean>(false);
  const [employeeCsvText, setEmployeeCsvText] = useState<string>('');
  const [employeeImportStatus, setEmployeeImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState<boolean>(false);
  const [dragHoveredEmployeeRole, setDragHoveredEmployeeRole] = useState<string | null>(null);
  const [employeeFilterRoleFocused, setEmployeeFilterRoleFocused] = useState<boolean>(false);
  const [employeeStatusTabFocused, setEmployeeStatusTabFocused] = useState<boolean>(false);
  const [employeeSearchFocused, setEmployeeSearchFocused] = useState<boolean>(false);

  // Teacher Form & View States
  const [teacherSearchQuery, setTeacherSearchQuery] = useState<string>('');
  const [teacherFilterInstrument, setTeacherFilterInstrument] = useState<string>('All');
  const [teacherStatusTab, setTeacherStatusTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [newTeacherFirstName, setNewTeacherFirstName] = useState<string>('');
  const [newTeacherLastName, setNewTeacherLastName] = useState<string>('');
  const [newTeacherEmail, setNewTeacherEmail] = useState<string>('');
  const [newTeacherInstrument, setNewTeacherInstrument] = useState<string>('');
  const [newTeacherLimit, setNewTeacherLimit] = useState<number>(10);
  const [newTeacherContractEndsAt, setNewTeacherContractEndsAt] = useState<string>('');
  const [showAddTeacherModal, setShowAddTeacherModal] = useState<boolean>(false);
  const [showAddCoachModal, setShowAddCoachModal] = useState<boolean>(false);
  const [coachFirstName, setCoachFirstName] = useState<string>('');
  const [coachLastName, setCoachLastName] = useState<string>('');
  const [coachEmail, setCoachEmail] = useState<string>('');
  const [coachInstrument, setCoachInstrument] = useState<string>('');
  const [coachRole, setCoachRole] = useState<string>('coach');
  const [manageTeacher, setManageTeacher] = useState<any>(null);
  const [isCsvExpanded, setIsCsvExpanded] = useState<boolean>(false);
  const [csvText, setCsvText] = useState<string>('');
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assertSecretaryWriteAccess('Lehrkraft anlegen')) return;
    if (!newTeacherFirstName.trim() || !newTeacherLastName.trim()) return;

    if (!isAvvSigned) {
      alert('DSGVO-Compliance: Vor dem Anlegen von Lehrkräften muss der gesetzliche Auftragsverarbeitungsvertrag (AVV gem. Art. 28 DSGVO) einmalig durch die Schulleitung digital gezeichnet werden.');
      setShowAvvModal(true);
      return;
    }

    try {
      const pin = generateStarterPin('teacher', false, false);
      const qrToken = generateSecureQrToken();

      const { error } = await supabase
        .from('users')
        .insert({
          school_id: schoolId,
          role: 'teacher',
          roles: ['teacher'],
          first_name: newTeacherFirstName.trim(),
          last_name: newTeacherLastName.trim(),
          email: newTeacherEmail.trim() || null,
          instrument: newTeacherInstrument.trim() || activeSubjectsList[0] || 'Nicht festgelegt',
          max_students: newTeacherLimit,
          ausweis_nummer: pin,
          teacher_qr_token: qrToken,
          is_active: true,
          is_app_user: true,
          is_campus_active: true,
          is_groovelab_active: true,
          contract_ends_at: newTeacherContractEndsAt || null
        });

      if (error) throw error;

      setNewTeacherFirstName('');
      setNewTeacherLastName('');
      setNewTeacherEmail('');
      setNewTeacherInstrument('');
      setNewTeacherLimit(10);
      setNewTeacherContractEndsAt('');
      setShowAddTeacherModal(false);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Anlegen der Lehrkraft: ' + err.message);
    }
  };

  const handleCreateCoachForGroovelab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherFirstName.trim() || !newTeacherLastName.trim()) return;

    if (!isAvvSigned) {
      alert('DSGVO-Compliance: Vor dem Anlegen von Lehrkräften muss der gesetzliche Auftragsverarbeitungsvertrag (AVV gem. Art. 28 DSGVO) einmalig durch die Schulleitung digital gezeichnet werden.');
      setShowAvvModal(true);
      return;
    }

    try {
      const pin = generateStarterPin('teacher', false, false);
      const qrToken = generateSecureQrToken();

      const { error } = await supabase
        .from('users')
        .insert({
          school_id: schoolId,
          role: 'teacher',
          roles: ['teacher'],
          first_name: newTeacherFirstName.trim(),
          last_name: newTeacherLastName.trim(),
          email: newTeacherEmail.trim() || null,
          instrument: newTeacherInstrument.trim() || activeSubjectsList[0] || 'Nicht festgelegt',
          max_students: newTeacherLimit,
          ausweis_nummer: pin,
          teacher_qr_token: qrToken,
          is_active: true,
          is_app_user: true,
          is_campus_active: false,
          is_groovelab_active: true,
          contract_ends_at: newTeacherContractEndsAt || null
        });

      if (error) throw error;

      setNewTeacherFirstName('');
      setNewTeacherLastName('');
      setNewTeacherEmail('');
      setNewTeacherInstrument('');
      setNewTeacherLimit(10);
      setNewTeacherContractEndsAt('');
      setShowAddCoachModal(false);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Anlegen der Lehrkraft: ' + err.message);
    }
  };

  const handleCreateCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachFirstName || !coachLastName || !coachEmail) return;

    if (!isAvvSigned) {
      alert('DSGVO-Compliance: Vor dem Anlegen von Lehrkräften muss der gesetzliche Auftragsverarbeitungsvertrag (AVV gem. Art. 28 DSGVO) einmalig durch die Schulleitung digital gezeichnet werden.');
      setShowAvvModal(true);
      return;
    }

    try {
      const pin = generateStarterPin(coachRole, false, true);
      const qrToken = generateSecureQrToken();

      const { error } = await supabase
        .from('users')
        .insert({
          school_id: schoolId,
          role: coachRole,
          roles: [coachRole],
          first_name: coachFirstName,
          last_name: coachLastName,
          email: coachEmail,
          instrument: coachInstrument || 'Nicht festgelegt',
          is_active: true,
          is_app_user: true,
          ausweis_nummer: pin,
          teacher_qr_token: qrToken,
          is_campus_active: false,
          is_groovelab_active: true
        });

      if (error) throw error;

      alert(`Coach ${coachFirstName} ${coachLastName} wurde erfolgreich angelegt.`);
      setCoachFirstName('');
      setCoachLastName('');
      setCoachEmail('');
      setCoachInstrument('');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeFirstName || !employeeLastName) return;

    try {
      const selectedRole = (e.currentTarget as any).elements.employeeRoleSelect?.value || 'admin';
      const pin = generateStarterPin(selectedRole, false, false);
      const qrToken = generateSecureQrToken();

      const { error } = await supabase
        .from('users')
        .insert({
          school_id: schoolId,
          role: selectedRole,
          roles: [selectedRole],
          first_name: employeeFirstName,
          last_name: employeeLastName,
          nickname: null,
          email: null,
          photo_url: '/campus_login_hero.png',
          is_active: true,
          is_app_user: true,
          ausweis_nummer: pin,
          teacher_qr_token: qrToken,
          is_campus_active: false,
          is_groovelab_active: false
        });

      if (error) throw error;

      alert(`Mitarbeiter ${employeeFirstName} ${employeeLastName} wurde erfolgreich angelegt.`);
      setEmployeeFirstName('');
      setEmployeeLastName('');
      setEmployeeNickname('');
      setEmployeeEmail('');
      setShowAddEmployeeModal(false);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleImportEmployees = async () => {
    if (!employeeCsvText.trim()) return;
    try {
      setEmployeeImportStatus(null);
      const lines = employeeCsvText.split('\n');
      let successCount = 0;
      let skippedCount = 0;

      for (let line of lines) {
        line = line.trim();
        if (!line || line.toLowerCase().includes('vorname')) continue;

        const parts = line.split(/[;,]/);
        if (parts.length < 3) {
          skippedCount++;
          continue;
        }

        const firstName = parts[0]?.trim();
        const lastName = parts[1]?.trim();
        const email = parts[2]?.trim();
        const nickname = parts[3]?.trim() || null;
        const role = parts[4]?.trim()?.toLowerCase() === 'admin' ? 'admin' : 'secretary';
        const pin = generateStarterPin(role, false, false);
        const qrToken = generateSecureQrToken();

        const { error } = await supabase
          .from('users')
          .insert({
            school_id: schoolId,
            role: role,
            roles: [role],
            first_name: firstName,
            last_name: lastName,
            email: email,
            nickname: nickname,
            photo_url: '/campus_login_hero.png',
            ausweis_nummer: pin,
            teacher_qr_token: qrToken,
            is_active: true,
            is_app_user: true,
            is_campus_active: false,
            is_groovelab_active: false
          });

        if (error) {
          console.error("Error inserting employee during import:", error);
          skippedCount++;
        } else {
          successCount++;
        }
      }

      setEmployeeImportStatus({
        success: true,
        message: `Import abgeschlossen: ${successCount} Mitarbeiterprofile angelegt. PINs bereit zur Verteilung.`
      });
      setEmployeeCsvText('');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleUpdateEmployeeRole = async (employeeId: string, newRole: string) => {
    try {
      const emp = employees.find(e => e.id === employeeId);
      const currentRoles: string[] = Array.isArray(emp?.roles) && emp.roles.length > 0 
        ? [...emp.roles] 
        : (emp?.role ? [emp.role] : ['secretary']);
      
      if (!currentRoles.includes(newRole)) {
        currentRoles.push(newRole);
      }
      
      let primaryRole = emp?.role || newRole;
      if (!currentRoles.includes(primaryRole)) {
        primaryRole = currentRoles[0] || newRole;
      }

      const updateFields: any = {};
      if (currentRoles.includes('teacher')) {
        updateFields.is_campus_active = true;
        updateFields.is_groovelab_active = true;
      }

      // Optimistically update local state immediately
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employeeId ? { ...e, roles: currentRoles, role: primaryRole, ...updateFields } : e
        )
      );
      if (employeeId === userId && setCurrentUserProfile) {
        setCurrentUserProfile((prev: any) =>
          prev ? { ...prev, roles: currentRoles, role: primaryRole, ...updateFields } : prev
        );
      }

      // 1. Authoritative RPC call (Fail-Closed, Security Definer)
      const { data: rpcData, error: rpcErr } = await supabase.rpc('update_employee_roles', {
        p_target_user_id: employeeId,
        p_roles: currentRoles,
        p_primary_role: primaryRole
      });
      if (rpcErr) throw rpcErr;
      if (!rpcData?.success) throw new Error(rpcData?.error || 'Rollen-Update fehlgeschlagen');

      // 2. Optional non-role module flags update
      if (Object.keys(updateFields).length > 0) {
        await supabase.from('users').update(updateFields).eq('id', employeeId);
      }

      alert(`Mitarbeiter-Rolle erfolgreich aktualisiert.`);
      await fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Aktualisieren der Rolle: ' + err.message);
    }
  };

  const handleToggleRole = async (emp: any, roleToToggle: 'admin' | 'secretary' | 'teacher') => {
    try {
      const currentRoles: string[] = Array.isArray(emp.roles) && emp.roles.length > 0 
        ? [...emp.roles] 
        : (emp.role ? [emp.role] : ['secretary']);
      
      const hasRole = currentRoles.includes(roleToToggle);
      let newRoles: string[] = [];

      if (hasRole) {
        // Attempting to remove role
        newRoles = currentRoles.filter(r => r !== roleToToggle);
        if (newRoles.length === 0) {
          alert('Ein Mitarbeiter muss mindestens eine aktive Rolle besitzen (Admin, Verwaltung oder Lehrer).');
          return;
        }
      } else {
        // Adding role
        newRoles = [...currentRoles, roleToToggle];
      }

      // Determine primary role
      let primaryRole = emp.role;
      if (!newRoles.includes(primaryRole)) {
        if (newRoles.includes('admin')) primaryRole = 'admin';
        else if (newRoles.includes('secretary')) primaryRole = 'secretary';
        else primaryRole = 'teacher';
      }

      const updateFields: any = {};
      if (newRoles.includes('teacher')) {
        updateFields.is_campus_active = true;
        updateFields.is_groovelab_active = true;
      }

      // Optimistically update local state immediately
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === emp.id ? { ...e, roles: newRoles, role: primaryRole, ...updateFields } : e
        )
      );
      if (emp.id === userId && setCurrentUserProfile) {
        setCurrentUserProfile((prev: any) =>
          prev ? { ...prev, roles: newRoles, role: primaryRole, ...updateFields } : prev
        );
      }

      // 1. Authoritative RPC call (Fail-Closed, Security Definer)
      const { data: rpcData, error: rpcErr } = await supabase.rpc('update_employee_roles', {
        p_target_user_id: emp.id,
        p_roles: newRoles,
        p_primary_role: primaryRole
      });
      if (rpcErr) throw rpcErr;
      if (!rpcData?.success) throw new Error(rpcData?.error || 'Rollen-Update fehlgeschlagen');

      // 2. Optional non-role module flags update
      if (Object.keys(updateFields).length > 0) {
        await supabase.from('users').update(updateFields).eq('id', emp.id);
      }

      await fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Aktualisieren der Rolle: ' + err.message);
    }
  };

  const handleImportTeachers = async () => {
    if (!csvText.trim()) return;
    try {
      setImportStatus(null);
      const lines = csvText.split('\n');
      let successCount = 0;
      let skippedCount = 0;

      for (let line of lines) {
        line = line.trim();
        if (!line || line.toLowerCase().includes('vorname')) continue;

        const parts = line.split(/[;,]/);
        if (parts.length < 2) {
          skippedCount++;
          continue;
        }

        const firstName = parts[0]?.trim();
        const lastName = parts[1]?.trim();
        const instrument = parts[2]?.trim() || (teacherFilterInstrument !== 'All' ? teacherFilterInstrument : 'ohne Zuweisung');
        const maxStudents = parseInt(parts[3]?.trim()) || 10;
        const pin = generateStarterPin('teacher', false, false);
        const qrToken = generateSecureQrToken();

        const { error } = await supabase
          .from('users')
          .insert({
            school_id: schoolId,
            role: 'teacher',
            first_name: firstName,
            last_name: lastName,
            email: null,
            instrument: instrument,
            max_students: maxStudents,
            ausweis_nummer: pin,
            teacher_qr_token: qrToken,
            is_active: false,
            is_app_user: false,
            is_campus_active: false,
            is_groovelab_active: false
          });

        if (error) {
          console.error("Error inserting user during import:", error);
          skippedCount++;
        } else {
          successCount++;
        }
      }

      setImportStatus({
        success: true,
        message: `Import abgeschlossen: ${successCount} Lehrerprofile angelegt (inaktiv). PINs bereit zur Verteilung.`
      });
      setCsvText('');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleToggleTeacherModule = async (teacher: any, moduleType: 'campus' | 'groovelab') => {
    try {
      const isCampus = teacher.isCampusActive || teacher.is_campus_active;
      const isGroove = teacher.isGroovelabActive || teacher.is_groovelab_active;
      
      const newCampusValue = moduleType === 'campus' ? !isCampus : isCampus;
      const newGrooveValue = moduleType === 'groovelab' ? !isGroove : isGroove;

      const moduleUpdates = {
        is_campus_active: newCampusValue,
        is_groovelab_active: newGrooveValue,
      };

      const { error: rawErr } = await supabase
        .from('users')
        .update(moduleUpdates)
        .eq('id', teacher.id);

      try {
        await supabase.from('users').update(moduleUpdates).eq('id', teacher.id);
      } catch (e) {}

      if (rawErr) throw rawErr;
      
      if (manageTeacher && manageTeacher.id === teacher.id) {
        setManageTeacher({
          ...manageTeacher,
          isCampusActive: newCampusValue,
          is_campus_active: newCampusValue,
          isGroovelabActive: newGrooveValue,
          is_groovelab_active: newGrooveValue,
        });
      }
      
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Umschalten: ' + err.message);
    }
  };

  const handleUpdateTeacherInstrument = async (teacherId: string, newInstrument: string) => {
    try {
      const { error: rawErr } = await supabase
        .from('users')
        .update({ instrument: newInstrument })
        .eq('id', teacherId);
      try {
        await supabase.from('users').update({ instrument: newInstrument }).eq('id', teacherId);
      } catch (e) {}
      if (rawErr) throw rawErr;
      fetchDashboardData();
    } catch (err: any) {
      alert("Fehler beim Zuweisen des Unterrichtsfachs: " + err.message);
    }
  };

  const handleGenerateInviteToken = async (studentId: string, studentName: string) => {
    try {
      const { data, error } = await supabase
        .from('student_onboarding_tokens')
        .insert({ student_id: studentId })
        .select('token')
        .single();

      if (error) throw error;
      
      const inviteUrl = getParentOnboardingUrl(
        schoolName || currentSchoolProfile?.name || 'Stadtmusikschule',
        currentSchoolProfile?.subdomain,
        data.token
      );
      await navigator.clipboard.writeText(inviteUrl);
      alert(`Personalisierter Onboarding-Link für ${studentName} wurde in die Zwischenablage kopiert!\n\nLink: ${inviteUrl}`);
    } catch (err: any) {
      console.error('Error generating invite token:', err);
      alert('Der Einladungs-Link konnte nicht generiert werden: ' + err.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Diesen Account wirklich entfernen?')) return;
    try {
      // Physically purge assets from Supabase Storage
      await deleteUserStorageAssets([id]);

      try {
        await supabase.rpc('delete_user_fully', {
          p_user_id: id,
          p_school_id: schoolId || null
        });
      } catch (e) {}

      try { await supabase.from('user_email_prefixes').delete().eq('user_id', id); } catch (e) {}
      try { await supabase.from('user_email_suffixes').delete().eq('user_id', id); } catch (e) {}
      try { await supabase.from('activation_days').delete().eq('student_id', id); } catch (e) {}
      try { await supabase.from('student_first_names').delete().eq('student_id', id); } catch (e) {}
      try { await supabase.from('student_last_names').delete().eq('student_id', id); } catch (e) {}
      try { await supabase.from('schedules').delete().or(`teacher_id.eq.${id},student_id.eq.${id}`); } catch (e) {}
      try { await supabase.from('schedule_occurrences').delete().or(`teacher_id.eq.${id},student_id.eq.${id}`); } catch (e) {}
      try { await supabase.from('bands').update({ coach_id: null }).eq('coach_id', id); } catch (e) {}
      try { await supabase.from('band_members').delete().eq('user_id', id); } catch (e) {}
      try { await supabase.from('chat_messages').delete().or(`sender_id.eq.${id},recipient_id.eq.${id}`); } catch (e) {}
      try { await supabase.from('direct_messages').delete().or(`sender_id.eq.${id},recipient_id.eq.${id}`); } catch (e) {}
      try { await supabase.from('campus_feedback_responses').delete().eq('teacher_id', id); } catch (e) {}
      try { await supabase.from('pending_students').delete().eq('id', id); } catch (e) {}

      const { error: rawErr } = await supabase.from('users').delete().eq('id', id);
      try { await supabase.from('students').delete().eq('id', id); } catch (e) {}
      try { await supabase.from('users').delete().eq('id', id); } catch (e) {}

      if (rawErr && rawErr.code !== 'PGRST116') {
        console.warn('Users raw delete notice:', rawErr);
      }
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  return {
    // Employees
    employees,
    setEmployees,
    revealedPins,
    setRevealedPins,
    isCurrentUserTeacher,
    employeeFirstName,
    setEmployeeFirstName,
    employeeLastName,
    setEmployeeLastName,
    employeeNickname,
    setEmployeeNickname,
    employeeEmail,
    setEmployeeEmail,
    employeeSearchQuery,
    setEmployeeSearchQuery,
    employeeStatusTab,
    setEmployeeStatusTab,
    employeeFilterRole,
    setEmployeeFilterRole,
    isEmployeeCsvExpanded,
    setIsEmployeeCsvExpanded,
    employeeCsvText,
    setEmployeeCsvText,
    employeeImportStatus,
    setEmployeeImportStatus,
    showAddEmployeeModal,
    setShowAddEmployeeModal,
    dragHoveredEmployeeRole,
    setDragHoveredEmployeeRole,
    employeeFilterRoleFocused,
    setEmployeeFilterRoleFocused,
    employeeStatusTabFocused,
    setEmployeeStatusTabFocused,
    employeeSearchFocused,
    setEmployeeSearchFocused,
    handleCreateEmployee,
    handleImportEmployees,
    handleUpdateEmployeeRole,
    handleToggleRole,

    // Teachers
    teacherSearchQuery,
    setTeacherSearchQuery,
    teacherFilterInstrument,
    setTeacherFilterInstrument,
    teacherStatusTab,
    setTeacherStatusTab,
    newTeacherFirstName,
    setNewTeacherFirstName,
    newTeacherLastName,
    setNewTeacherLastName,
    newTeacherEmail,
    setNewTeacherEmail,
    newTeacherInstrument,
    setNewTeacherInstrument,
    newTeacherLimit,
    setNewTeacherLimit,
    newTeacherContractEndsAt,
    setNewTeacherContractEndsAt,
    showAddTeacherModal,
    setShowAddTeacherModal,
    showAddCoachModal,
    setShowAddCoachModal,
    coachFirstName,
    setCoachFirstName,
    coachLastName,
    setCoachLastName,
    coachEmail,
    setCoachEmail,
    coachInstrument,
    setCoachInstrument,
    coachRole,
    setCoachRole,
    manageTeacher,
    setManageTeacher,
    isCsvExpanded,
    setIsCsvExpanded,
    csvText,
    setCsvText,
    importStatus,
    setImportStatus,
    handleCreateTeacher,
    handleCreateCoachForGroovelab,
    handleCreateCoach,
    handleImportTeachers,
    handleToggleTeacherModule,
    handleUpdateTeacherInstrument,
    handleGenerateInviteToken,
    handleDeleteUser
  };
}
