import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Plus, Copy, Check, UserCheck, Smartphone, Globe, Music, Trash2, AlertCircle } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  instrument: string;
  is_app_user: boolean;
  qr_token: string;
  status: string;
  created_at?: string;
  lesson_duration?: number;
}

interface TeacherStudentManagementProps {
  teacherId: string;
  schoolId: string;
  maxStudents: number;
}

export function TeacherStudentManagement({ teacherId, schoolId, maxStudents }: TeacherStudentManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [instrument, setInstrument] = useState('');
  const [lessonDuration, setLessonDuration] = useState(45);
  const [isAppUser, setIsAppUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Copy State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [teacherId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, instrument, is_app_user, qr_token, status, created_at, lesson_duration, contract_ends_at')
        .eq('role', 'student')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      let filteredData = data || [];
      if (new Date().getMonth() === 7) { // 7 is August
        const currentYear = new Date().getFullYear();
        const limitDate = new Date(currentYear, 7, 31, 23, 59, 59).getTime();
        filteredData = filteredData.filter((student: any) => {
          if (!student.contract_ends_at) return true;
          const endDate = new Date(student.contract_ends_at).getTime();
          return endDate > limitDate;
        });
      }
      
      setStudents(filteredData);
    } catch (err: any) {
      console.error('Error fetching students:', err);
      setError('Fehler beim Laden der Schülerliste.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStudentDuration = async (studentId: string, duration: number) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ lesson_duration: duration })
        .eq('id', studentId);
      if (error) throw error;
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, lesson_duration: duration } : s));
    } catch (err) {
      console.error('Error updating student lesson_duration:', err);
    }
  };

  const handleCopyLink = (student: Student) => {
    const parentLink = `${window.location.origin}/parent-input?student_id=${student.id}&token=${student.qr_token}`;
    navigator.clipboard.writeText(parentLink);
    setCopiedId(student.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !instrument.trim()) {
      setError('Bitte alle Felder ausfüllen.');
      return;
    }



    setSubmitting(true);
    setError(null);

    try {
      // Load school subscription details
      const { data: schoolData } = await supabase
        .from('schools')
        .select('has_campus_subscription')
        .eq('id', schoolId)
        .single();
      const hasCampus = schoolData?.has_campus_subscription !== false;
      const finalLastName = hasCampus ? lastName.trim() : (lastName?.trim() ? lastName.trim().charAt(0).toUpperCase() + '.' : '');

      // 1. Try to hit backend endpoint
      const token = sessionStorage.getItem('groovelab_user_id') || localStorage.getItem('groovelab_user_id'); // mock token for auth header or direct
      const response = await fetch('/api/students/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName,
          lastName: finalLastName,
          instrument,
          isAppUser
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Insert in state
        const newStudent: Student = {
          id: result.student.id,
          first_name: result.student.firstName,
          last_name: result.student.lastName,
          instrument: result.student.instrument,
          is_app_user: result.student.isAppUser,
          qr_token: result.student.qrToken || '',
          status: result.student.status
        };
        setStudents(prev => [newStudent, ...prev]);
        resetForm();
        return;
      }

      // Fallback direct Supabase insertion
      console.warn('API onboard failed/offline, running Supabase fallback...');
      const studentQrToken = crypto.randomUUID();
      const defaultAvatarUrl = '/avatars/student_drums_1.png';

      const newStudentData = {
        school_id: schoolId,
        teacher_id: teacherId,
        role: 'student',
        first_name: firstName.trim(),
        last_name: finalLastName,
        instrument: instrument.trim(),
        avatar_url: defaultAvatarUrl,
        is_app_user: isAppUser,
        qr_token: studentQrToken,
        is_campus_active: isAppUser,
        is_groovelab_active: isAppUser,
        status: isAppUser ? 'active' : 'pending',
        lesson_duration: lessonDuration
      };

      const { data: insertedStudent, error: insertError } = await supabase
        .from('users')
        .insert(newStudentData)
        .select('id, first_name, last_name, instrument, is_app_user, qr_token, status, lesson_duration')
        .single();

      if (insertError) throw insertError;

      // Initialize avatar Style
      await supabase.from('avatars').insert({
        user_id: insertedStudent.id,
        avatar_style: 'Standard_Silhouette',
        instrument_type: instrument.trim(),
        evolution_level: 1
      });

      setStudents(prev => [insertedStudent as Student, ...prev]);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Anlegen des Schülers.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setInstrument('');
    setLessonDuration(45);
    setIsAppUser(false);
    setShowAddForm(false);
    setError(null);
  };

  const handleDeleteStudent = async (studentId: string, name: string) => {
    if (!window.confirm(`Möchtest du den Schüler "${name}" wirklich löschen?`)) return;
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', studentId);
      if (error) throw error;
      setStudents(prev => prev.filter(s => s.id !== studentId));
    } catch (err: any) {
      setError('Fehler beim Löschen des Schülers.');
    }
  };

  // Calculate percentage used
  const usedSlots = students.length;
  const percentage = Math.min(100, (usedSlots / maxStudents) * 100);
  const isLimitReached = usedSlots >= maxStudents;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 bg-slate-900/10 rounded-3xl border border-slate-200/50 backdrop-blur-md shadow-sm">
      
      {/* Header for Student Management */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-indigo-600 h-5 w-5" />
            <h3 className="font-extrabold text-slate-800 text-lg">Schüler-Verwaltung</h3>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Erstelle und verwalte die Accounts deiner Schüler für die GrooveLab App.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/15 hover:shadow-indigo-600/25 transition-all text-sm h-fit cursor-pointer"
        >
          <Plus size={18} />
          Schüler hinzufügen
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 px-4 py-3 rounded-xl text-sm font-semibold">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Inline Form Card */}
      {showAddForm && (
        <div className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-xl shadow-indigo-900/5 animate-fadeIn">
          <h4 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2 text-base">
            <UserCheck className="text-indigo-600" size={20} /> Neuer Schüler Account
          </h4>
          <form onSubmit={handleCreateStudent} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vorname</label>
                <input
                  type="text"
                  required
                  placeholder="z. B. Max"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none text-slate-800 font-semibold transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nachname</label>
                <input
                  type="text"
                  required
                  placeholder="z. B. Muster"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none text-slate-800 font-semibold transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Instrument</label>
                <input
                  type="text"
                  required
                  placeholder="z. B. Klavier"
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none text-slate-800 font-semibold transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Unterrichtsform</label>
                <select
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none text-slate-800 font-semibold bg-white transition-all"
                >
                  <option value={30}>30 Min</option>
                  <option value={45}>45 Min</option>
                  <option value={60}>60 Min</option>
                  <option value={90}>90 Min</option>
                </select>
              </div>
            </div>

            {/* Account Type Toggle */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <span className="block text-sm font-bold text-slate-800">Direkter App-Nutzer?</span>
                <span className="block text-xs text-slate-500 font-medium">Falls aktiv, erhält der Schüler einen QR-Code für die App. Andernfalls wird ein Web-Link für die Eltern generiert.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAppUser}
                  onChange={(e) => setIsAppUser(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="py-2.5 px-5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all text-sm cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-2.5 px-6 rounded-xl shadow-md transition-all text-sm flex items-center gap-2 cursor-pointer"
              >
                {submitting && <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>}
                Speichern
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Student List */}
      <div className="space-y-4">
        <h4 className="font-extrabold text-slate-700 text-base flex items-center gap-2">
          <Music size={18} className="text-slate-500" /> Angelegte Schüler ({students.length})
        </h4>

        {loading ? (
          <div className="flex flex-col items-center py-12 gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Lade Schülerliste...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
            <Users className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">Noch keine Schüler angelegt.</p>
            <p className="text-slate-400 text-sm mt-1">Nutze den Button oben, um deinen ersten Schüler-Slot zu belegen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {students.map((student) => {
              const parentLink = `${window.location.origin}/parent-input?student_id=${student.id}&token=${student.qr_token}`;
              return (
                <div 
                  key={student.id} 
                  className="bg-white rounded-2xl p-5 border border-slate-150 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-100 transition-all duration-200"
                >
                  {/* Info Block */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 font-extrabold text-xl shrink-0 border border-slate-100">
                      👨‍🎓
                    </div>
                    <div className="min-w-0">
                      <span className="block font-bold text-slate-800 text-base truncate">
                        {student.first_name} {student.last_name}
                      </span>
                      <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                          🎸 {student.instrument}
                        </span>
                        
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-md px-2 py-0.5 text-xs font-bold text-slate-400">
                          ⏱️ 
                          <select
                            value={student.lesson_duration || 45}
                            onChange={(e) => handleUpdateStudentDuration(student.id, parseInt(e.target.value))}
                            style={{ padding: '0px 4px' }}
                            className="bg-transparent border-none p-0 pr-1 text-xs font-bold text-slate-655 outline-none cursor-pointer"
                          >
                            <option value={30}>30 Min</option>
                            <option value={45}>45 Min</option>
                            <option value={60}>60 Min</option>
                            <option value={90}>90 Min</option>
                          </select>
                        </div>
                        
                        {/* Hybrid Badge */}
                        {student.is_app_user ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                            <Smartphone size={11} /> App-Nutzer
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                            <Globe size={11} /> Eltern Web-Link
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Link Block */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                    {!student.is_app_user && (
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 min-w-[280px]">
                        <input
                          type="text"
                          readOnly
                          value={parentLink}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          className="flex-1 bg-transparent text-[11px] font-mono text-slate-500 border-none outline-none overflow-hidden select-all"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyLink(student)}
                          className="p-2 rounded-lg bg-white border border-slate-200 text-indigo-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm shrink-0"
                          title="Link kopieren"
                        >
                          {copiedId === student.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => handleDeleteStudent(student.id, `${student.first_name} ${student.last_name}`)}
                      className="p-3.5 rounded-xl border border-rose-100 text-rose-500 hover:bg-rose-50 transition-all cursor-pointer flex items-center justify-center shrink-0"
                      title="Schüler löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
    </div>
  );
}
