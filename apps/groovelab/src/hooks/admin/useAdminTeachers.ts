import { useState } from 'react';
import { supabase, deleteUserStorageAssets } from '../../lib/supabase';

export interface UseAdminTeachersParams {
  admin: any;
  userId: string;
  schoolObj: any;
  teachers: any[];
  setTeachers: React.Dispatch<React.SetStateAction<any[]>>;
  setShowAVVModal: (b: boolean) => void;
  fetchData: (force?: boolean) => void;
}

export function useAdminTeachers({
  admin,
  userId,
  schoolObj,
  teachers,
  setTeachers,
  setShowAVVModal,
  fetchData
}: UseAdminTeachersParams) {
  const [teacherSearch, setTeacherSearch] = useState('');
  const [newTeacher, setNewTeacher] = useState({ firstName: '', lastName: '', isAdmin: false, instrument: '', photoUrl: '' });
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [selectedTeacherForProfile, setSelectedTeacherForProfile] = useState<any | null>(null);
  const [showObserverToggle, setShowObserverToggle] = useState(false);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.school_id) return;

    // DSGVO Art. 28 Compliance: AVV Contract MUST be signed before inserting teacher data
    const isAvvSigned = Boolean(
      schoolObj?.avv_signed_at || 
      (typeof window !== 'undefined' && localStorage.getItem(`groovelab_avv_signed_${admin?.school_id}`))
    );
    if (!isAvvSigned) {
      alert('DSGVO-Compliance: Vor dem Anlegen von Lehrkräften muss der gesetzliche Auftragsverarbeitungsvertrag (AVV gem. Art. 28 DSGVO) einmalig durch die Schulleitung digital gezeichnet werden.');
      setShowAVVModal(true);
      return;
    }

    // Check limits if enabled
    if (schoolObj?.limits_enabled) {
      const maxTeachers = schoolObj.max_teachers ?? 2;
      if (teachers.length >= maxTeachers) {
        alert(`Limit erreicht! Deine Schule darf maximal ${maxTeachers} Lehrer/Admins registrieren. Kontaktiere deinen Master-Admin.`);
        return;
      }
    }

    const isAdmOrSec = newTeacher.isAdmin;
    const targetRole = newTeacher.isAdmin ? 'admin' : 'teacher';
    const { data, error } = await supabase.from('users').insert({
      school_id: admin.school_id, 
      role: targetRole, 
      roles: [targetRole],
      first_name: newTeacher.firstName, 
      last_name: newTeacher.lastName, 
      instrument: newTeacher.instrument || '',
      photo_url: isAdmOrSec ? '/campus_login_hero.png' : newTeacher.photoUrl,
      qr_token: crypto.randomUUID()
    }).select().single();
    if (error) alert('Fehler: ' + error.message);
    else if (data) { 
      setTeachers([...teachers, data]); 
      setShowAddTeacher(false); 
      setNewTeacher({ firstName: '', lastName: '', isAdmin: false, instrument: '', photoUrl: '' }); 
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (id === userId) return alert('Du kannst dich nicht selbst löschen!');
    if (window.confirm('Möchtest du diesen Lehrer wirklich löschen?')) {
      try {
        await supabase.from('bands').update({ coach_id: null }).eq('coach_id', id);
        await supabase.from('sessions').delete().eq('user_id', id);
        await supabase.from('band_members').delete().eq('user_id', id);
        await supabase.from('user_song_skills').delete().eq('user_id', id);
        await supabase.from('user_song_skills').update({ verified_by_id: null }).eq('verified_by_id', id);
        await supabase.from('band_songs').update({ suggested_by: null }).eq('suggested_by', id);
        await supabase.from('lab_planning').delete().eq('user_id', id);
        await supabase.from('band_shoutbox').delete().eq('user_id', id);
        await supabase.from('band_song_slots').delete().eq('user_id', id);
        await supabase.from('help_requests').delete().eq('user_id', id);
        await deleteUserStorageAssets([id]);
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        
        setTeachers(teachers.filter(t => t.id !== id));
      } catch (err: any) {
        alert('Fehler beim Löschen: ' + err.message);
      }
    }
  };

  const handleToggleObserver = async (t: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = !t.is_observer;
    setTeachers((prev: any[]) => prev.map(x => x.id === t.id ? { ...x, is_observer: newValue } : x));
    const { error } = await supabase.from('users').update({ is_observer: newValue }).eq('id', t.id);
    if (error) {
      setTeachers((prev: any[]) => prev.map(x => x.id === t.id ? { ...x, is_observer: !newValue } : x));
      alert('Fehler beim Speichern: ' + error.message);
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    const isAdmOrSec = editingTeacher.role === 'admin' || editingTeacher.role === 'secretary';
    const { error } = await supabase.from('users').update({
      first_name: editingTeacher.first_name,
      last_name: editingTeacher.last_name,
      groovelab_instrument: editingTeacher.groovelab_instrument,
      photo_url: isAdmOrSec ? '/campus_login_hero.png' : editingTeacher.photo_url,
      bio: editingTeacher.bio,
      expertise: editingTeacher.expertise,
      bands: editingTeacher.bands
    }).eq('id', editingTeacher.id);
    
    if (error) alert('Fehler: ' + error.message);
    else {
      setTeachers(teachers.map(t => t.id === editingTeacher.id ? editingTeacher : t));
      setEditingTeacher(null);
      alert('Lehrer-Profil erfolgreich aktualisiert! ✅');
    }
  };

  return {
    teacherSearch,
    setTeacherSearch,
    newTeacher,
    setNewTeacher,
    showAddTeacher,
    setShowAddTeacher,
    editingTeacher,
    setEditingTeacher,
    selectedTeacherForProfile,
    setSelectedTeacherForProfile,
    showObserverToggle,
    setShowObserverToggle,
    handleAddTeacher,
    handleDeleteTeacher,
    handleToggleObserver,
    handleUpdateTeacher
  };
}
