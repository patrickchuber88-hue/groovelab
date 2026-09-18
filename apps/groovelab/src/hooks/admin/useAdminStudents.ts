import { useState } from 'react';
import { supabase, deleteUserStorageAssets } from '../../lib/supabase';
import { getInstrumentAvatarUrl } from '../../components/StudioAvatar';
import { formatTeacherFullName } from '../../utils/nameHelper';

const getInstrumentTypeKey = (instrument: string | null | undefined): string => {
  if (!instrument) return 'guitarist';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('guitar') || inst.includes('gitarre')) return 'guitarist';
  if (inst.includes('bass')) return 'bassist';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return 'drummer';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return 'keyboardist';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return 'vocalist';
  if (inst.includes('trompete') || inst.includes('trumpet')) return 'trumpetist';
  if (inst.includes('posaune') || inst.includes('trombone')) return 'trombonist';
  if (inst.includes('horn')) return 'hornist';
  if (inst.includes('cello')) return 'cellist';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return 'violinist';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return 'clarinetist';
  if (inst.includes('querflöte') || inst.includes('flute')) return 'flutist';
  return 'guitarist';
};

export interface UseAdminStudentsParams {
  admin: any;
  schoolObj: any;
  students: any[];
  setStudents: React.Dispatch<React.SetStateAction<any[]>>;
  teachers: any[];
  setShowAVVModal: (b: boolean) => void;
  fetchData: (force?: boolean) => void;
}

export function useAdminStudents({
  admin,
  schoolObj,
  students,
  setStudents,
  teachers,
  setShowAVVModal,
  fetchData
}: UseAdminStudentsParams) {
  const [studentSearch, setStudentSearch] = useState('');
  const [listType, setListType] = useState<'active' | 'archive'>('active');
  const [instrumentFilter, setInstrumentFilter] = useState('ALL');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showBulkAddStudents, setShowBulkAddStudents] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [parsedStudents, setParsedStudents] = useState<any[]>([]);
  const [defaultInstrumentForBulk, setDefaultInstrumentForBulk] = useState('Gitarre');
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [newStudent, setNewStudent] = useState({ 
    firstName: '', 
    lastName: '', 
    birthDate: '', 
    photoUrl: '/avatar_ghost.jpg', 
    isExternalVocalist: false, 
    instrument: 'Gitarre', 
    app_usage_mode: 'student_only' 
  });
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [selectedQRUser, setSelectedQRUser] = useState<any | null>(null);
  const [selectedTimetableStudent, setSelectedTimetableStudent] = useState<any | null>(null);
  const [selectedStudentForTageskompass, setSelectedStudentForTageskompass] = useState<any | null>(null);
  const [showTageskompassModal, setShowTageskompassModal] = useState(false);
  const [showParentInfoSheetModal, setShowParentInfoSheetModal] = useState(false);
  const [deleteStudentModalData, setDeleteStudentModalData] = useState<any | null>(null);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.school_id) return;

    const isAvvSigned = Boolean(
      schoolObj?.avv_signed_at || 
      (typeof window !== 'undefined' && localStorage.getItem(`groovelab_avv_signed_${admin?.school_id}`))
    );
    if (!isAvvSigned) {
      alert('DSGVO-Compliance: Vor dem Anlegen von Schülerdaten muss der gesetzliche Auftragsverarbeitungsvertrag (AVV gem. Art. 28 DSGVO) einmalig durch die Schulleitung digital gezeichnet werden.');
      setShowAVVModal(true);
      return;
    }
    
    if (schoolObj?.limits_enabled) {
      const maxStudents = schoolObj.max_students ?? 6;
      if (students.length >= maxStudents) {
        alert(`Limit erreicht! Deine Schule darf maximal ${maxStudents} Schüler registrieren. Kontaktiere deinen Master-Admin.`);
        return;
      }
    }

    const qrToken = crypto.randomUUID();
    const studentInstrument = newStudent.isExternalVocalist ? 'Vocals' : (newStudent.instrument || 'Gitarre');
    const studentAvatarUrl = getInstrumentAvatarUrl(studentInstrument);

    const hasCampus = schoolObj?.has_campus_subscription !== false;
    const finalLastName = hasCampus ? newStudent.lastName : (newStudent.lastName?.trim() ? newStudent.lastName.trim().charAt(0).toUpperCase() + '.' : '');

    const isSchoolAutoActivateAll = schoolObj?.student_billing_option === 'option3_3' || schoolObj?.student_billing_option === 'all_inclusive';

    const { data, error } = await supabase.from('users').insert({
      school_id: admin.school_id, 
      role: 'student',
      roles: ['student'],
      first_name: newStudent.firstName, 
      last_name: finalLastName, 
      birth_date: null,
      photo_url: newStudent.photoUrl || '/avatar_ghost.jpg',
      avatar_url: studentAvatarUrl,
      qr_token: qrToken,
      is_external_vocalist: newStudent.isExternalVocalist,
      instrument: studentInstrument,
      is_campus_active: isSchoolAutoActivateAll,
      is_groovelab_active: isSchoolAutoActivateAll,
      app_usage_mode: newStudent.app_usage_mode || 'student_only'
    }).select().single();
    
    if (error) alert('Fehler: ' + error.message);
    else if (data) { 
      await supabase.from('avatars').upsert({
        user_id: data.id,
        avatar_style: 'Premium_Hero',
        instrument_type: getInstrumentTypeKey(studentInstrument),
        evolution_level: 1,
        xp: 0,
        asset_path: studentAvatarUrl,
        streak_flame: 0
      });

      setStudents([...students, data]); 
      setShowAddStudent(false); 
      setNewStudent({ firstName: '', lastName: '', birthDate: '', photoUrl: '/avatar_ghost.jpg', isExternalVocalist: false, instrument: 'Gitarre', app_usage_mode: 'student_only' }); 
      window.dispatchEvent(new CustomEvent('students_updated'));
      window.dispatchEvent(new CustomEvent('campus_students_updated'));
      window.dispatchEvent(new CustomEvent('groovelab_students_updated'));
    }
  };

  const parseBulkInput = (text: string, currentInstrument: string) => {
    if (!text.trim()) {
      setParsedStudents([]);
      return;
    }
    const lines = text.split('\n');
    const studentsList = lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';
        return {
          firstName,
          lastName,
          instrument: currentInstrument
        };
      });
    setParsedStudents(studentsList);
  };

  const handleBulkAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.school_id || parsedStudents.length === 0) return;
    setIsBulkSaving(true);

    const hasCampus = schoolObj?.has_campus_subscription !== false;
    const isSchoolAutoActivateAll = schoolObj?.student_billing_option === 'option3_3' || schoolObj?.student_billing_option === 'all_inclusive';
    const studentsToInsert = parsedStudents.map(student => {
      const qrToken = crypto.randomUUID();
      const isVocalist = student.instrument === 'Gesang';
      const studentInstrument = isVocalist ? 'Vocals' : student.instrument;
      const studentAvatarUrl = getInstrumentAvatarUrl(studentInstrument);
      const finalLastName = hasCampus ? student.lastName : (student.lastName?.trim() ? student.lastName.trim().charAt(0).toUpperCase() + '.' : '');
      
      return {
        school_id: admin.school_id, 
        role: 'student', 
        roles: ['student'],
        first_name: student.firstName, 
        last_name: finalLastName, 
        birth_date: null,
        photo_url: '/avatar_ghost.jpg',
        avatar_url: studentAvatarUrl,
        qr_token: qrToken,
        is_external_vocalist: isVocalist,
        instrument: studentInstrument,
        is_campus_active: isSchoolAutoActivateAll,
        is_groovelab_active: isSchoolAutoActivateAll,
        app_usage_mode: 'student_only'
      };
    });

    try {
      const { data, error } = await supabase.from('users').insert(studentsToInsert).select();
      
      if (error) {
        alert('Fehler beim Anlegen: ' + error.message);
      } else if (data && data.length > 0) {
        const avatarsToInsert = data.map(dbStudent => {
          const studentInstrument = dbStudent.instrument || 'Gitarre';
          const studentAvatarUrl = getInstrumentAvatarUrl(studentInstrument);
          return {
            user_id: dbStudent.id,
            avatar_style: 'Premium_Hero',
            instrument_type: getInstrumentTypeKey(studentInstrument),
            evolution_level: 1,
            xp: 0,
            asset_path: studentAvatarUrl,
            streak_flame: 0
          };
        });
        
        await supabase.from('avatars').upsert(avatarsToInsert);
        
        setStudents([...students, ...data]);
        setShowBulkAddStudents(false);
        setBulkInput('');
        setParsedStudents([]);
        window.dispatchEvent(new CustomEvent('students_updated'));
        window.dispatchEvent(new CustomEvent('campus_students_updated'));
        window.dispatchEvent(new CustomEvent('groovelab_students_updated'));
      }
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const studentInstrument = editingStudent.instrument || 'Gitarre';
    const studentAvatarUrl = getInstrumentAvatarUrl(studentInstrument);

    const hasCampus = schoolObj?.has_campus_subscription !== false;
    const finalLastName = hasCampus ? editingStudent.last_name : (editingStudent.last_name?.trim() ? editingStudent.last_name.trim().charAt(0).toUpperCase() + '.' : '');

    const { error } = await supabase.from('users').update({
      first_name: editingStudent.first_name,
      last_name: finalLastName,
      birth_date: null,
      status: editingStudent.status || 'active',
      is_trial: editingStudent.is_trial || false,
      trial_ends_at: editingStudent.trial_ends_at || null,
      contract_ends_at: editingStudent.contract_ends_at || null,
      instrument: studentInstrument,
      avatar_url: studentAvatarUrl,
      app_usage_mode: editingStudent.app_usage_mode || 'student_only'
    }).eq('id', editingStudent.id);
    
    if (error) alert('Fehler: ' + error.message);
    else {
      await supabase.from('avatars').upsert({
        user_id: editingStudent.id,
        avatar_style: 'Premium_Hero',
        instrument_type: getInstrumentTypeKey(studentInstrument),
        evolution_level: 1,
        asset_path: studentAvatarUrl
      });

      setStudents(students.map(s => s.id === editingStudent.id ? {
        ...editingStudent,
        avatar_url: studentAvatarUrl
      } : s));
      setEditingStudent(null);
      window.dispatchEvent(new CustomEvent('students_updated'));
      window.dispatchEvent(new CustomEvent('campus_students_updated'));
      window.dispatchEvent(new CustomEvent('groovelab_students_updated'));
    }
  };

  const handleDeleteStudent = (id: string) => {
    const studentToDelete = students.find(s => s.id === id);
    if (!studentToDelete) return;

    const teacher = teachers.find(t => t.id === studentToDelete.teacher_id);
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
  };

  return {
    studentSearch,
    setStudentSearch,
    listType,
    setListType,
    instrumentFilter,
    setInstrumentFilter,
    showAddStudent,
    setShowAddStudent,
    showBulkAddStudents,
    setShowBulkAddStudents,
    bulkInput,
    setBulkInput,
    parsedStudents,
    setParsedStudents,
    defaultInstrumentForBulk,
    setDefaultInstrumentForBulk,
    isBulkSaving,
    setIsBulkSaving,
    newStudent,
    setNewStudent,
    editingStudent,
    setEditingStudent,
    selectedStudent,
    setSelectedStudent,
    selectedQRUser,
    setSelectedQRUser,
    selectedTimetableStudent,
    setSelectedTimetableStudent,
    selectedStudentForTageskompass,
    setSelectedStudentForTageskompass,
    showTageskompassModal,
    setShowTageskompassModal,
    showParentInfoSheetModal,
    setShowParentInfoSheetModal,
    deleteStudentModalData,
    setDeleteStudentModalData,
    handleAddStudent,
    parseBulkInput,
    handleBulkAddSubmit,
    handleUpdateStudent,
    handleDeleteStudent
  };
}
