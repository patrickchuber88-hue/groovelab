import { useState, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { sanitizeBirthDateToDayOnly, formatTeacherFullName } from '../../../utils/nameHelper';
import { StudentToDelete } from '../../ConfirmDeleteStudentModal';
import { isTeacherInstrumentCompatible, isGenericInstrument } from '../../../services/studentRosterService';

export interface UseSecretaryStudentsOptions {
  schoolId: string;
  allTeachers?: any[];
  campusTeachers?: any[];
  bypassTeachers?: any[];
  coaches?: any[];
  hasCampusSub?: boolean;
  hasGroovelabSub?: boolean;
  isBillingBooked?: boolean;
  studentBillingOption?: string;
  billingPayer?: string;
  fetchDashboardData: () => Promise<void> | void;
  assertSecretaryWriteAccess: (actionLabel?: string) => boolean;
}

export function useSecretaryStudents({
  schoolId,
  allTeachers = [],
  campusTeachers = [],
  bypassTeachers = [],
  coaches = [],
  hasCampusSub = false,
  hasGroovelabSub = false,
  isBillingBooked = false,
  studentBillingOption = 'option1',
  billingPayer = 'school',
  fetchDashboardData,
  assertSecretaryWriteAccess
}: UseSecretaryStudentsOptions) {
  // Students and Link States
  const [students, setStudents] = useState<any[]>([]);
  const [frozenStudents, setFrozenStudents] = useState<any[]>([]);

  // Compact Schülerboard States
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [studentFilterInstrument, setStudentFilterInstrument] = useState<string>('All');
  const [studentFilterTeacher, setStudentFilterTeacher] = useState<string>('All');
  const [studentFilterStatus, setStudentFilterStatus] = useState<'all' | 'campus' | 'groovelab' | 'inactive'>('all');
  const [isStudentCsvExpanded, setIsStudentCsvExpanded] = useState<boolean>(false);
  const [studentCsvText, setStudentCsvText] = useState<string>('');
  const [bulkImportDuration, setBulkImportDuration] = useState<number>(30);
  const [isAnonymizedImport, setIsAnonymizedImport] = useState<boolean>(true);
  const [studentCurrentPage, setStudentCurrentPage] = useState<number>(1);
  const [studentPageSize, setStudentPageSize] = useState<number>(12);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<any>(null);
  const [deleteStudentModalData, setDeleteStudentModalData] = useState<StudentToDelete | null>(null);
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  // Bulk Modals
  const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);
  const [showAddGroovelabStudentModal, setShowAddGroovelabStudentModal] = useState<boolean>(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState<boolean>(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState<boolean>(false);
  const [bulkDeletePin, setBulkDeletePin] = useState<string>('');
  const [bulkDeleteStep, setBulkDeleteStep] = useState<1 | 2>(1);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [isImportingStudentsBatch, setIsImportingStudentsBatch] = useState<boolean>(false);

  // Manual Student Creation Form States
  const [newStudentFirstName, setNewStudentFirstName] = useState<string>('');
  const [newStudentLastName, setNewStudentLastName] = useState<string>('');
  const [newStudentBirthDate, setNewStudentBirthDate] = useState<string>('');
  const [newStudentNickname, setNewStudentNickname] = useState<string>('');
  const [newStudentInstrument, setNewStudentInstrument] = useState<string>('');
  const [newStudentDuration, setNewStudentDuration] = useState<number>(30);
  const [newStudentTeacherId, setNewStudentTeacherId] = useState<string>('');
  const [newStudentIsAppUser, setNewStudentIsAppUser] = useState<boolean>(false);
  const [newStudentIsCampusActive, setNewStudentIsCampusActive] = useState<boolean>(true);
  const [newStudentIsGroovelabActive, setNewStudentIsGroovelabActive] = useState<boolean>(false);

  // ── Memoized Pre-sorted Students & Instant Filtering ──
  const sortedStudents = useMemo(() => {
    return [...students].sort((a: any, b: any) => {
      const nameA = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase().trim();
      const nameB = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase().trim();
      return nameA.localeCompare(nameB, 'de');
    });
  }, [students]);

  const filteredStudents = useMemo(() => {
    const query = studentSearchQuery.toLowerCase().trim();
    return sortedStudents.filter((s: any) => {
      const firstName = (s.first_name || '').toLowerCase();
      const lastName = (s.last_name || '').toLowerCase();
      const nickname = (s.nickname || '').toLowerCase();
      
      const matchesSearch = !query || firstName.includes(query) || lastName.includes(query) || nickname.includes(query);
      const matchesInstrument = studentFilterInstrument === 'All' || (s.instrument || 'Nicht festgelegt') === studentFilterInstrument;
      const matchesTeacher = studentFilterTeacher === 'All' || 
        (studentFilterTeacher === 'none' ? !s.teacher_id : s.teacher_id === studentFilterTeacher);
      
      let matchesStatus = true;
      if (studentFilterStatus === 'campus') matchesStatus = s.is_campus_active;
      else if (studentFilterStatus === 'groovelab') matchesStatus = s.is_groovelab_active;
      else if (studentFilterStatus === 'inactive') matchesStatus = !s.is_campus_active && !s.is_groovelab_active;

      return matchesSearch && matchesInstrument && matchesTeacher && matchesStatus;
    });
  }, [sortedStudents, studentSearchQuery, studentFilterInstrument, studentFilterTeacher, studentFilterStatus]);

  const handleCreateStudentCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assertSecretaryWriteAccess('Schüler anlegen')) return;
    if (!newStudentFirstName || !newStudentLastName) {
      alert('Bitte Vorname und Nachname ausfüllen.');
      return;
    }

    try {
      const teacherId = newStudentTeacherId || null;
      const finalLastName = hasCampusSub ? newStudentLastName : (newStudentLastName?.trim() ? newStudentLastName.trim().charAt(0).toUpperCase() + '.' : '');
      const finalBirthDate = null;

      // 1. Call import_student RPC (5-Tabellen anonymisiertes Onboarding)
      const { error: insertError } = await supabase.rpc('import_student', {
        first_name: newStudentFirstName,
        last_name: finalLastName,
        birth_date: finalBirthDate,
        instrument: newStudentInstrument || 'Nicht festgelegt',
        school_id: schoolId,
        teacher_id: teacherId,
        lesson_duration: newStudentDuration || 30
      });

      if (insertError) throw insertError;

      alert(`Schüler ${newStudentFirstName} ${newStudentLastName} wurde erfolgreich angelegt (Onboarding ausstehend).`);
      
      // Reset form
      setNewStudentFirstName('');
      setNewStudentLastName('');
      setNewStudentBirthDate('');
      setNewStudentNickname('');
      setNewStudentInstrument('');
      setNewStudentDuration(30);
      setNewStudentTeacherId('');
      setShowAddStudentModal(false);
      window.dispatchEvent(new CustomEvent('students_updated'));
      window.dispatchEvent(new CustomEvent('campus_students_updated'));
      window.dispatchEvent(new CustomEvent('groovelab_students_updated'));
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Erstellen des Schülers: ' + err.message);
    }
  };

  const handleCreateStudentGroovelab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assertSecretaryWriteAccess('Schüler anlegen')) return;
    if (!newStudentFirstName || !newStudentLastName) {
      alert('Bitte Vorname und Nachname ausfüllen.');
      return;
    }

    try {
      const teacherId = newStudentTeacherId || null;
      const finalLastName = hasCampusSub ? newStudentLastName : (newStudentLastName?.trim() ? newStudentLastName.trim().charAt(0).toUpperCase() + '.' : '');
      const finalBirthDate = null;

      // 1. Call import_student RPC
      const { data: newStudentId, error: insertError } = await supabase.rpc('import_student', {
        first_name: newStudentFirstName,
        last_name: finalLastName,
        birth_date: finalBirthDate,
        instrument: newStudentInstrument || 'Nicht festgelegt',
        school_id: schoolId,
        teacher_id: teacherId,
        lesson_duration: newStudentDuration || 30
      });

      if (insertError) throw insertError;

      // 2. Set is_groovelab_active = true for the newly created student profile
      if (newStudentId) {
        await supabase
          .from('users')
          .update({ is_groovelab_active: true, is_campus_active: false })
          .eq('id', newStudentId);
      }

      alert(`Schüler ${newStudentFirstName} ${newStudentLastName} wurde erfolgreich für GrooveLab angelegt.`);
      
      // Reset form
      setNewStudentFirstName('');
      setNewStudentLastName('');
      setNewStudentBirthDate('');
      setNewStudentNickname('');
      setNewStudentInstrument('');
      setNewStudentDuration(30);
      setNewStudentTeacherId('');
      setShowAddGroovelabStudentModal(false);
      window.dispatchEvent(new CustomEvent('students_updated'));
      window.dispatchEvent(new CustomEvent('campus_students_updated'));
      window.dispatchEvent(new CustomEvent('groovelab_students_updated'));
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Erstellen des Schülers: ' + err.message);
    }
  };

  const handleDeleteStudentCampus = (
    studentId: string, 
    name: string, 
    instrument?: string, 
    teacherId?: string, 
    isCampusActive?: boolean, 
    isGroovelabActive?: boolean
  ) => {
    const teacher = allTeachers.find((t: any) => t.id === teacherId);
    const teacherName = teacher ? formatTeacherFullName(teacher) : undefined;
    setDeleteStudentModalData({
      id: studentId,
      name,
      instrument,
      teacherName,
      isCampusActive,
      isGroovelabActive
    });
  };

  const handleBulkStudentImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCsvText.trim()) {
      alert('Bitte geben Sie Schülerdaten ein.');
      return;
    }

    const lines = studentCsvText.split('\n');
    let successCount = 0;
    let failCount = 0;

    const allUniqueTeachers = [...(campusTeachers || []), ...(bypassTeachers || []), ...(coaches || [])].reduce((acc: any[], t: any) => {
      if (!acc.some(existing => existing.id === t.id)) {
        acc.push(t);
      }
      return acc;
    }, []);

    const errors: string[] = [];

    if (isAnonymizedImport) {
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        let parts = trimmed.split(';');
        if (parts.length < 2) {
          parts = trimmed.split(',');
        }

        let firstName = '';
        let lastName = '';
        let birthDate: string | null = null;
        let instrument = 'Nicht festgelegt';
        let teacherNamePart = '';

        const isSmartActive = studentFilterTeacher && studentFilterTeacher !== 'All';

        if (parts.length === 1) {
          const nameParts = trimmed.split(/\s+/);
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        } else if (parts.length === 2 && isSmartActive) {
          const p1 = parts[1]?.trim() || '';
          if (p1.includes('.')) {
            const nameParts = parts[0].trim().split(/\s+/);
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
            birthDate = p1;
          } else {
            firstName = parts[0]?.trim();
            lastName = parts[1]?.trim();
          }
        } else {
          firstName = parts[0]?.trim();
          lastName = parts[1]?.trim();
          
          const p2 = parts[2]?.trim() || '';
          if (p2.includes('.')) {
            birthDate = p2;
            instrument = parts[3]?.trim() || 'Nicht festgelegt';
            teacherNamePart = parts[4]?.trim()?.toLowerCase() || '';
          } else {
            instrument = p2 || 'Nicht festgelegt';
            teacherNamePart = parts[3]?.trim()?.toLowerCase() || '';
          }
        }

        if (!firstName) {
          failCount++;
          errors.push(`Zeile "${line}": Vorname fehlt.`);
          continue;
        }

        // Match teacher
        let teacherId: string | null = null;
        if (studentFilterTeacher && studentFilterTeacher !== 'All') {
          const foundSelected = allUniqueTeachers.find(t => t.id === studentFilterTeacher);
          if (foundSelected) {
            teacherId = foundSelected.id;
            instrument = foundSelected.instrument || 'Nicht festgelegt';
          }
        }

        if (!teacherId && teacherNamePart) {
          const found = allUniqueTeachers.find(t => {
            const fName = (t.firstName || t.first_name || '').toLowerCase();
            const lName = (t.lastName || t.last_name || '').toLowerCase();
            return `${fName} ${lName}`.includes(teacherNamePart) || lName.includes(teacherNamePart);
          });
          if (found) {
            teacherId = found.id;
          }
        }

        try {
          const finalLastName = hasCampusSub ? lastName : (lastName?.trim() ? lastName.trim().charAt(0).toUpperCase() + '.' : '');
          const finalBirthDate = hasCampusSub ? sanitizeBirthDateToDayOnly(birthDate) : null;

          const { error: rpcError } = await supabase.rpc('import_student', {
            first_name: firstName,
            last_name: finalLastName,
            birth_date: finalBirthDate,
            instrument: instrument,
            school_id: schoolId,
            teacher_id: teacherId || null,
            lesson_duration: bulkImportDuration || 30
          });

          if (rpcError) throw rpcError;
          successCount++;
        } catch (err: any) {
          console.error('Import error for line:', line, err);
          errors.push(`Zeile "${line}": ${err.message || err}`);
          failCount++;
        }
      }

      if (errors.length > 0) {
        alert(`Anonymisierter Bulk-Import abgeschlossen: ${successCount} Schüler erfolgreich angelegt, ${failCount} Fehler.\n\nFehlerdetails:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...weitere Fehler in der Browser-Konsole.' : ''}`);
      } else {
        alert(`Anonymisierter Bulk-Import abgeschlossen: ${successCount} Schüler erfolgreich angelegt.`);
      }

      setStudentCsvText('');
      setIsStudentCsvExpanded(false);
      setIsAnonymizedImport(true);
      window.dispatchEvent(new CustomEvent('students_updated'));
      window.dispatchEvent(new CustomEvent('campus_students_updated'));
      window.dispatchEvent(new CustomEvent('groovelab_students_updated'));
      fetchDashboardData();
      return;
    }

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let parts = trimmed.split(';');
      if (parts.length < 2) {
        parts = trimmed.split(',');
      }

      let namePart = '';
      let instrument = 'ohne Zuweisung';
      let email = '';
      let teacherNamePart = '';

      if (parts.length >= 2) {
        namePart = parts[0].trim();
        instrument = parts[1].trim() || 'Nicht festgelegt';
        email = parts[2]?.trim() || '';
        teacherNamePart = parts[3]?.trim()?.toLowerCase() || '';
      } else {
        namePart = trimmed;
      }

      const nameParts = namePart.split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      if (!firstName) {
        failCount++;
        errors.push(`Zeile "${line}": Kein Vorname gefunden.`);
        continue;
      }

      let teacherId: string | null = null;
      let finalInstrument = instrument;

      if (studentFilterTeacher && studentFilterTeacher !== 'All') {
        const foundSelected = allUniqueTeachers.find(t => t.id === studentFilterTeacher);
        if (foundSelected) {
          teacherId = foundSelected.id;
          if (!parts[1]?.trim()) {
            finalInstrument = foundSelected.instrument || 'Nicht festgelegt';
          }
        }
      }

      if (!teacherId && teacherNamePart) {
        const found = allUniqueTeachers.find(t => {
          const fName = (t.firstName || t.first_name || '').toLowerCase();
          const lName = (t.lastName || t.last_name || '').toLowerCase();
          return `${fName} ${lName}`.includes(teacherNamePart) || lName.includes(teacherNamePart);
        });
        if (found) {
          teacherId = found.id;
        }
      }

      try {
        const pin = 'GL-' + Math.floor(1000 + Math.random() * 9000);
        const studentId = crypto.randomUUID();
        const qrToken = crypto.randomUUID();
        const defaultAvatarUrl = '/avatars/student_eguitar_1.png';
        const finalEmail = `student.${studentId}@campus-groovelab.local`;

        const finalLastName = hasCampusSub ? lastName : (lastName?.trim() ? lastName.trim().charAt(0).toUpperCase() + '.' : '');

        const { data: insertedStudent, error: insertError } = await supabase
          .from('users')
          .insert({
            id: studentId,
            school_id: schoolId,
            teacher_id: teacherId,
            role: 'student',
            first_name: firstName,
            last_name: finalLastName,
            email: finalEmail,
            instrument: finalInstrument || 'Nicht festgelegt',
            avatar_url: defaultAvatarUrl,
            is_active: true,
            is_campus_active: !(billingPayer === 'student' || studentBillingOption === 'student_full' || studentBillingOption === 'student_partial' || studentBillingOption === 'option1'),
            is_groovelab_active: false,
            status: (billingPayer === 'student' || studentBillingOption === 'student_full' || studentBillingOption === 'student_partial' || studentBillingOption === 'option1') ? 'passive' : 'active',
            ausweis_nummer: pin,
            qr_token: qrToken,
            lesson_duration: bulkImportDuration || 30
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        if (!insertedStudent) throw new Error("Keine ID vom Server zurückgegeben.");

        await supabase.from('avatars').insert({
          user_id: insertedStudent.id,
          avatar_style: 'Standard_Silhouette',
          instrument_type: instrument || 'Nicht festgelegt',
          evolution_level: 1
        });

        successCount++;
      } catch (err: any) {
        console.error('Import error for line:', line, err);
        errors.push(`Zeile "${line}": ${err.message || err}`);
        failCount++;
      }
    }

    if (errors.length > 0) {
      alert(`Bulk-Import abgeschlossen: ${successCount} Schüler erfolgreich angelegt, ${failCount} Fehler.\n\nFehlerdetails:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...weitere Fehler in der Browser-Konsole.' : ''}`);
    } else {
      alert(`Bulk-Import abgeschlossen: ${successCount} Schüler erfolgreich angelegt.`);
    }

    setStudentCsvText('');
    setIsStudentCsvExpanded(false);
    window.dispatchEvent(new CustomEvent('students_updated'));
    window.dispatchEvent(new CustomEvent('campus_students_updated'));
    window.dispatchEvent(new CustomEvent('groovelab_students_updated'));
    fetchDashboardData();
  };

  const handleBatchImportStudents = async () => {
    if (!studentCsvText.trim()) return;
    setIsImportingStudentsBatch(true);
    try {
      const lines = studentCsvText.split('\n');
      let successCount = 0;
      let skippedCount = 0;

      const assignedTeacherId = (studentFilterTeacher && studentFilterTeacher !== 'All' && studentFilterTeacher !== 'none')
        ? studentFilterTeacher
        : null;

      for (let line of lines) {
        line = line.trim();
        if (!line || line.toLowerCase().startsWith('vorname') || line.toLowerCase().startsWith('name')) continue;

        let firstName = '';
        let lastName = '';
        let duration = 30;
        let birthDate: string | null = null;

        const parts = line.split(/[;,\t]/).map(p => p.trim());
        let instrument = 'Nicht festgelegt';

        if (parts.length >= 2) {
          firstName = parts[0];
          lastName = parts[1];
          if (parts[2]) {
            if (/^\d+$/.test(parts[2])) {
              duration = parseInt(parts[2], 10);
            } else {
              instrument = parts[2];
            }
          }
          if (parts[3]) {
            if (/^\d+$/.test(parts[3])) {
              duration = parseInt(parts[3], 10);
            } else if (parts[3].includes('.') || parts[3].includes('-')) {
              birthDate = parts[3];
            }
          }
        } else if (parts.length === 1 && parts[0].includes(' ')) {
          const words = parts[0].split(/\s+/);
          firstName = words[0];
          lastName = words[1];
          if (words.length > 2) {
            instrument = words.slice(2).join(' ');
          }
        } else if (parts.length === 1 && parts[0]) {
          firstName = parts[0];
          lastName = '';
        }

        if (!firstName) {
          skippedCount++;
          continue;
        }

        const finalLastName = hasCampusSub ? lastName : (lastName?.trim() ? lastName.trim().charAt(0).toUpperCase() + '.' : '');
        const finalBirthDate = hasCampusSub && birthDate ? sanitizeBirthDateToDayOnly(birthDate) : null;

        try {
          const { error: insertError } = await supabase.rpc('import_student', {
            first_name: firstName,
            last_name: finalLastName,
            birth_date: finalBirthDate,
            instrument: instrument || 'Nicht festgelegt',
            school_id: schoolId,
            teacher_id: assignedTeacherId,
            lesson_duration: duration || 30
          });

          if (insertError) {
            console.error('[StudentBatchImport] RPC error for line:', line, insertError);
            skippedCount++;
          } else {
            successCount++;
          }
        } catch (rpcErr) {
          console.error('[StudentBatchImport] Failed to import student:', rpcErr);
          skippedCount++;
        }
      }

      setStudentCsvText('');
      setIsStudentCsvExpanded(false);
      window.dispatchEvent(new CustomEvent('students_updated'));
      window.dispatchEvent(new CustomEvent('campus_students_updated'));
      window.dispatchEvent(new CustomEvent('groovelab_students_updated'));
      await fetchDashboardData();
      alert(`Sammel-Onboarding abgeschlossen: ${successCount} Schüler erfolgreich angelegt! ${skippedCount > 0 ? `(${skippedCount} Zeilen übersprungen)` : ''}`);
    } catch (err: any) {
      alert('Fehler beim Sammel-Import: ' + err.message);
    } finally {
      setIsImportingStudentsBatch(false);
    }
  };

  const handleToggleStudentModule = async (student: any, moduleType: 'campus' | 'groovelab') => {
    const isCampus = !!(student.is_campus_active || student.isCampusActive);
    const isGroove = !!(student.is_groovelab_active || student.isGroovelabActive);
    
    const newCampusValue = moduleType === 'campus' ? !isCampus : isCampus;
    const newGrooveValue = moduleType === 'groovelab' ? !isGroove : isGroove;

    const isDeactivatingCampus = moduleType === 'campus' && isCampus;
    const isDeactivatingGroove = moduleType === 'groovelab' && isGroove;
    const hasAnnualBilling = studentBillingOption === 'option3_2' || studentBillingOption === 'option3_3';

    if ((isDeactivatingCampus || isDeactivatingGroove) && hasAnnualBilling) {
      alert("Da für diesen Schüler der Jahresbeitrag bereits vorab entrichtet wurde, bleiben das Profil und alle Funktionen des Schülers bis zum Ende des Schuljahres aktiv. Die Deaktivierung wird zum Schuljahreswechsel wirksam.");
      return;
    }

    if (moduleType === 'campus' && isBillingBooked && !hasCampusSub) {
      alert("Das Campus-Modul ist für deine Musikschule aktuell nicht gebucht.");
      return;
    }
    if (moduleType === 'groovelab' && isBillingBooked && !hasGroovelabSub) {
      alert("Das GrooveLab-Modul ist für deine Musikschule aktuell nicht gebucht.");
      return;
    }

    setStudents(prev => prev.map(s => {
      if (s.id === student.id) {
        return {
          ...s,
          is_campus_active: newCampusValue,
          isCampusActive: newCampusValue,
          is_groovelab_active: newGrooveValue,
          isGroovelabActive: newGrooveValue,
          ...(newGrooveValue ? {
            is_active: true,
            is_app_user: true,
            status: 'aktiv',
            isPendingOnboarding: false
          } : {})
        };
      }
      return s;
    }));

    try {
      const moduleUpdates: any = {
        is_campus_active: newCampusValue,
        is_groovelab_active: newGrooveValue,
      };
      if (newGrooveValue) {
        moduleUpdates.is_active = true;
        moduleUpdates.is_app_user = true;
        moduleUpdates.status = 'aktiv';
      }

      const { data: existingUser } = await supabase.from('users').select('id').eq('id', student.id).maybeSingle();
      if (!existingUser) {
        const { error: insertErr } = await supabase.from('users').insert({
          id: student.id,
          school_id: student.school_id || schoolId,
          role: 'student',
          first_name: student.first_name || 'Schüler',
          last_name: student.last_name || '',
          instrument: student.instrument || 'Musiker',
          teacher_id: student.teacher_id || null,
          lesson_duration: student.lesson_duration || 30,
          is_campus_active: newCampusValue,
          is_groovelab_active: newGrooveValue,
          is_active: newGrooveValue ? true : false,
          is_app_user: newGrooveValue ? true : false,
          status: newGrooveValue ? 'aktiv' : 'offen'
        });
        if (insertErr) throw insertErr;
      } else {
        const { error: rawErr } = await supabase
          .from('users')
          .update(moduleUpdates)
          .eq('id', student.id);
        if (rawErr) throw rawErr;
      }

      fetchDashboardData();
    } catch (err: any) {
      setStudents(prev => prev.map(s => {
        if (s.id === student.id) {
          return {
            ...s,
            is_campus_active: isCampus,
            isCampusActive: isCampus,
            is_groovelab_active: isGroove,
            isGroovelabActive: isGroove
          };
        }
        return s;
      }));
      alert('Fehler beim Umschalten: ' + err.message);
    }
  };

  const handleUpdateStudentTeacher = async (studentId: string, teacherId: string | null) => {
    try {
      let teacherInstrument: string | null = null;
      let teacherName = 'Lehrkraft';
      if (teacherId) {
        const { data: teacherUser } = await supabase
          .from('users')
          .select('instrument, first_name, last_name')
          .eq('id', teacherId)
          .maybeSingle();
        if (teacherUser) {
          teacherInstrument = teacherUser.instrument || null;
          teacherName = `${teacherUser.first_name || ''} ${teacherUser.last_name || ''}`.trim() || 'Lehrkraft';
        }
      }

      // 1. Identify target student and verify instrument compatibility
      const targetStudent = students.find((s: any) => s.id === studentId);
      const studentCurrentInst = targetStudent?.instrument;

      if (teacherId && !isTeacherInstrumentCompatible(teacherInstrument, studentCurrentInst)) {
        alert(
          `⚠️ Fachfremde Zuweisung unzulässig!\n\n` +
          `Die Lehrkraft ${teacherName} unterrichtet [${teacherInstrument || 'Nicht definiert'}], ` +
          `der Schüler spielt jedoch [${studentCurrentInst || 'Nicht definiert'}].\n\n` +
          `Eine fachfremde Zuweisung ist durch die 1% Goldstandard System-Invarianten streng untersagt.`
        );
        return;
      }

      const resolvedInstrument = (studentCurrentInst && !isGenericInstrument(studentCurrentInst))
        ? studentCurrentInst
        : (teacherId ? (teacherInstrument || 'Musiker') : 'Musiker');

      const updatePayload: any = { 
        teacher_id: teacherId, 
        instrument: resolvedInstrument 
      };

      let sFirstName = '';
      let sLastName = '';
      const { data: uStudent } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', studentId)
        .maybeSingle();

      if (uStudent) {
        sFirstName = uStudent.first_name || '';
        sLastName = uStudent.last_name || '';
      } else {
        const { data: pStudent } = await supabase
          .from('pending_students_decrypted')
          .select('first_name, last_name')
          .eq('id', studentId)
          .maybeSingle();
        if (pStudent) {
          sFirstName = pStudent.first_name || '';
          sLastName = pStudent.last_name || '';
        }
      }

      setStudents((prevStudents: any[]) =>
        prevStudents.map((s: any) => {
          const isTarget = s.id === studentId || (sFirstName && sLastName && s.first_name === sFirstName && s.last_name === sLastName);
          if (isTarget) {
            return {
              ...s,
              teacher_id: teacherId,
              instrument: resolvedInstrument
            };
          }
          return s;
        })
      );

      if (studentFilterTeacher !== 'All') {
        setStudentFilterTeacher('All');
      }

      try {
        const { data: existingUser } = await supabase.from('users').select('id').eq('id', studentId).maybeSingle();
        if (!existingUser) {
          const stObj = students.find((s: any) => s.id === studentId);
          await supabase.from('users').insert({
            id: studentId,
            school_id: stObj?.school_id || schoolId,
            role: 'student',
            first_name: sFirstName || stObj?.first_name || 'Schüler',
            last_name: sLastName || stObj?.last_name || '',
            instrument: updatePayload.instrument,
            teacher_id: teacherId,
            lesson_duration: stObj?.lesson_duration || 30,
            is_campus_active: !!stObj?.is_campus_active,
            is_groovelab_active: !!stObj?.is_groovelab_active,
            is_active: false
          });
        } else {
          await supabase.from('users').update(updatePayload).eq('id', studentId);
        }
      } catch (e) {
        console.warn('users_raw teacher update warning:', e);
      }

      try {
        await supabase.from('students').update({
          teacher_id: teacherId,
          instrument: updatePayload.instrument
        }).eq('id', studentId);
      } catch (e) {
        console.warn('students teacher update warning:', e);
      }

      await fetchDashboardData();
    } catch (err: any) {
      alert("Fehler beim Zuweisen der Lehrkraft: " + err.message);
    }
  };

  const handleDeleteExpiredStudents = async (silent = false, customStudentsList?: any[]) => {
    const listToFilter = customStudentsList || students;
    const expired = listToFilter.filter((s: any) => s.contractEndsAt && new Date(s.contractEndsAt).getTime() < Date.now());
    if (expired.length === 0) {
      if (!silent) {
        alert("Keine abgelaufenen Schülerkonten zum Löschen vorhanden.");
      }
      return;
    }

    if (!silent) {
      const confirmMsg = `Möchtest du wirklich ${expired.length} Schülerkonto/Schülerkonten mit abgelaufenen Verträgen unwiderruflich löschen? Alle zugehörigen Fortschritte und Audio-Dateien im Cloud-Speicher (Supabase Storage) werden physisch und datenschutzkonform entfernt.`;
      if (!window.confirm(confirmMsg)) return;
    }

    try {
      let deletedAudioCount = 0;
      let deletedDbCount = 0;

      for (const student of expired) {
        try {
          const { data: files, error: listError } = await supabase.storage
            .from('campus-assets')
            .list('avatars');
          
          if (!listError && files) {
            const filesToDelete = files
              .filter(f => f.name.includes(`${student.id}_loopmix_`))
              .map(f => `avatars/${f.name}`);
            
            if (filesToDelete.length > 0) {
              const { error: removeError } = await supabase.storage
                .from('campus-assets')
                .remove(filesToDelete);
              if (!removeError) {
                deletedAudioCount += filesToDelete.length;
              }
            }
          }
        } catch (storageErr) {
          console.error(`[GDPR Cleanup] Error clearing storage for ${student.id}:`, storageErr);
        }

        const { error: dbError } = await supabase
          .from('users')
          .delete()
          .eq('id', student.id);
        
        if (!dbError) {
          deletedDbCount++;
        } else {
          console.error(`[GDPR Cleanup] Error deleting student ${student.id} from DB:`, dbError);
        }
      }

      if (!silent) {
        alert(`Datenschutzkonforme Löschung erfolgreich durchgeführt!\n- ${deletedDbCount} Schülerprofile gelöscht\n- ${deletedAudioCount} Audio-Dateien physisch aus dem Cloud-Speicher entfernt`);
      } else {
        console.log(`[GDPR Auto-Cleanup] Auto-deleted ${deletedDbCount} expired students and cleared ${deletedAudioCount} storage files.`);
      }
      fetchDashboardData();
    } catch (err: any) {
      if (!silent) {
        alert("Fehler bei der datenschutzkonformen Löschung: " + err.message);
      } else {
        console.error("[GDPR Auto-Cleanup] Deletion failed:", err);
      }
    }
  };

  return {
    students,
    setStudents,
    frozenStudents,
    setFrozenStudents,
    studentSearchQuery,
    setStudentSearchQuery,
    studentFilterInstrument,
    setStudentFilterInstrument,
    studentFilterTeacher,
    setStudentFilterTeacher,
    studentFilterStatus,
    setStudentFilterStatus,
    filteredStudents,
    studentCurrentPage,
    setStudentCurrentPage,
    studentPageSize,
    setStudentPageSize,
    selectedStudentIds,
    setSelectedStudentIds,
    selectedStudentForDetail,
    setSelectedStudentForDetail,
    deleteStudentModalData,
    setDeleteStudentModalData,
    copiedStudentId,
    setCopiedStudentId,
    showAddStudentModal,
    setShowAddStudentModal,
    showAddGroovelabStudentModal,
    setShowAddGroovelabStudentModal,
    showBulkImportModal,
    setShowBulkImportModal,
    showBulkDeleteModal,
    setShowBulkDeleteModal,
    bulkDeletePin,
    setBulkDeletePin,
    bulkDeleteStep,
    setBulkDeleteStep,
    isBulkDeleting,
    setIsBulkDeleting,
    isStudentCsvExpanded,
    setIsStudentCsvExpanded,
    studentCsvText,
    setStudentCsvText,
    bulkImportDuration,
    setBulkImportDuration,
    isAnonymizedImport,
    setIsAnonymizedImport,
    isImportingStudentsBatch,
    setIsImportingStudentsBatch,
    newStudentFirstName,
    setNewStudentFirstName,
    newStudentLastName,
    setNewStudentLastName,
    newStudentBirthDate,
    setNewStudentBirthDate,
    newStudentNickname,
    setNewStudentNickname,
    newStudentInstrument,
    setNewStudentInstrument,
    newStudentDuration,
    setNewStudentDuration,
    newStudentTeacherId,
    setNewStudentTeacherId,
    newStudentIsAppUser,
    setNewStudentIsAppUser,
    newStudentIsCampusActive,
    setNewStudentIsCampusActive,
    newStudentIsGroovelabActive,
    setNewStudentIsGroovelabActive,
    handleCreateStudentCampus,
    handleCreateStudentGroovelab,
    handleDeleteStudentCampus,
    handleBulkStudentImport,
    handleBatchImportStudents,
    handleToggleStudentModule,
    handleUpdateStudentTeacher,
    handleDeleteExpiredStudents
  };
}
