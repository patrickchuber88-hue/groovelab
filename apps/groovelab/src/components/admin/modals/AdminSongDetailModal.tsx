import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  Music,
  Pencil,
  Search,
  Users,
  X
} from "lucide-react";
import { getSongColor } from "../AdminSongsView";

export interface AdminSongDetailModalProps {
  song: any;
  onClose: () => void;
  students: any[];
  supabase: any;
  textbausteine?: any[];
  songLessonNotes?: string;
  setSongLessonNotes?: React.Dispatch<React.SetStateAction<string>>;
  onSongUpdated?: (updatedSong: any) => void;
  onOpenTageskompass?: (student: any) => void;
}

export const AdminSongDetailModal: React.FC<AdminSongDetailModalProps> = ({
  song,
  onClose,
  students,
  supabase,
  textbausteine = [],
  songLessonNotes: propSongLessonNotes,
  setSongLessonNotes: propSetSongLessonNotes,
  onSongUpdated,
  onOpenTageskompass
}) => {
  const selectedSongForDetail = song;
  const [assignedSongSkills, setAssignedSongSkills] = useState<any[]>([]);
  const [isEditingSongHeader, setIsEditingSongHeader] = useState(false);
  const [editSongTitle, setEditSongTitle] = useState(song?.title || "");
  const [editSongArtist, setEditSongArtist] = useState(song?.artist || "");
  const [editSongInstrumentation, setEditSongInstrumentation] = useState<Record<string, number>>(song?.instrumentation || {});
  const [selectedSongSkill, setSelectedSongSkill] = useState<any | null>(null);
  const [selectedStudentForProgress, setSelectedStudentForProgress] = useState<any | null>(null);
  const [songRhythmVal, setSongRhythmVal] = useState<number>(25);
  const [songFingerVal, setSongFingerVal] = useState<number>(25);
  const [songDynamicsVal, setSongDynamicsVal] = useState<number>(25);
  const [songTotalProgressVal, setSongTotalProgressVal] = useState<number>(25);
  const [songInternalNotes, setSongInternalNotes] = useState<string>("");
  const [localSongLessonNotes, setLocalSongLessonNotes] = useState<string>("");
  const songLessonNotes = propSongLessonNotes !== undefined ? propSongLessonNotes : localSongLessonNotes;
  const setSongLessonNotes = propSetSongLessonNotes || setLocalSongLessonNotes;
  const [songLessonNotesList, setSongLessonNotesList] = useState<string[]>([]);
  const [songStatus, setSongStatus] = useState<"unbearbeitet" | "in_progress" | "mastered">("unbearbeitet");
  const [showSongProgressDetails, setShowSongProgressDetails] = useState<boolean>(true);
  const [assignStudentSearch, setAssignStudentSearch] = useState<string>("");
  const [isAssignSearchFocused, setIsAssignSearchFocused] = useState<boolean>(false);
  const [studentDetailSearch, setStudentDetailSearch] = useState<string>("");

  useEffect(() => {
    if (song?.id) {
      setEditSongTitle(song.title || "");
      setEditSongArtist(song.artist || "");
      setEditSongInstrumentation(song.instrumentation || {});
      fetchSongAssignments(song.id);
    }
  }, [song?.id]);

    const fetchSongAssignments = async (songId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_song_skills')
        .select('*, student:users!user_song_skills_user_id_fkey(*)')
        .eq('song_id', songId);
      if (error) throw error;
      if (data) {
        setAssignedSongSkills(data);
      }
    } catch (e) {
      console.error('Error fetching song assignments:', e);
    }
  };

  const handleAssignStudentToSong = async (studentId: string, instrument: string = 'ohne Zuweisung') => {
    if (!selectedSongForDetail) return;
    try {
      if (assignedSongSkills.some(s => s.user_id === studentId)) {
        alert('Dieser Schüler ist bereits zugeteilt.');
        return;
      }

      const { data: newSkill, error } = await supabase
        .from('user_song_skills')
        .insert({
          user_id: studentId,
          song_id: selectedSongForDetail.id,
          instrument: instrument,
          progress_percent: 0,
          is_stage_ready: false
        })
        .select('*, student:users!user_song_skills_user_id_fkey(*)')
        .single();

      if (error) throw error;
      if (newSkill) {
        setAssignedSongSkills(prev => [...prev, newSkill]);
      }
    } catch (e: any) {
      console.error('Error assigning student to song:', e);
      alert('Fehler beim Zuweisen: ' + e.message);
    }
  };

  const handleUnassignStudentFromSong = async (skillId: string, studentId: string, songTitle: string, instrument: string) => {
    if (!window.confirm('Bist du sicher, dass du die Zuweisung und somit den Fortschritt für dieses Instrument löschen möchtest?')) return;
    try {
      const { error: skillErr } = await supabase
        .from('user_song_skills')
        .delete()
        .eq('id', skillId);
      if (skillErr) throw skillErr;

      const topicName = `${selectedSongForDetail.artist} - ${songTitle} (${instrument})`;
      await supabase
        .from('progress_matrix')
        .delete()
        .eq('student_id', studentId)
        .eq('topic_name', topicName);

      localStorage.removeItem(`song_skills_detail_${studentId}_${skillId}`);

      setAssignedSongSkills(prev => prev.filter(s => s.id !== skillId));
      if (selectedStudentForProgress?.id === studentId) {
        setSelectedStudentForProgress(null);
      }
    } catch (e: any) {
      console.error('Error unassigning student from song:', e);
      alert('Fehler beim Entfernen: ' + e.message);
    }
  };

  const handleUpdateSongStudentProgress = async (
    skillId: string,
    studentId: string,
    instrument: string,
    rhythm: number,
    finger: number,
    expression: number,
    progress: number,
    isStageReady: boolean, // Kept for signature compatibility
    internalNotes: string,
    lessonNotes: string[]
  ) => {
    try {
      localStorage.setItem(`song_skills_detail_${studentId}_${skillId}`, JSON.stringify({
        rhythm,
        finger,
        expression
      }));

      const isMastered = songStatus === 'mastered';
      const { error: skillErr } = await supabase
        .from('user_song_skills')
        .update({
          progress_percent: progress,
          is_stage_ready: isMastered
        })
        .eq('id', skillId);

      if (skillErr) throw skillErr;

      setAssignedSongSkills(prev => prev.map(s => s.id === skillId ? { ...s, progress_percent: progress, is_stage_ready: isMastered } : s));

      const topicName = `${selectedSongForDetail.artist} - ${selectedSongForDetail.title} (${instrument})`;
      
      let dbStatus = 'IN_PROGRESS';
      if (songStatus === 'mastered') dbStatus = 'MASTERED';
      else if (songStatus === 'unbearbeitet') dbStatus = 'NOT_STARTED';
      
      const { error: matrixErr } = await supabase
        .from('progress_matrix')
        .upsert({
          student_id: studentId,
          topic_name: topicName,
          status: dbStatus,
          is_current_homework: songStatus === 'in_progress',
          teacher_notes: internalNotes,
          homework_notes: JSON.stringify(lessonNotes),
          updated_at: new Date().toISOString()
        });

      if (matrixErr) throw matrixErr;
    } catch (e: any) {
      console.error('Error saving song student progress:', e);
    }
  };

  const triggerAutoSaveSongProgress = async (activeSkill = selectedSongSkill, activeStudent = selectedStudentForProgress) => {
    if (!activeSkill || !activeStudent || !selectedSongForDetail) return;
    await handleUpdateSongStudentProgress(
      activeSkill.id,
      activeStudent.id,
      activeSkill.instrument,
      songRhythmVal,
      songFingerVal,
      songDynamicsVal,
      songTotalProgressVal,
      songStatus === 'mastered',
      songInternalNotes,
      songLessonNotesList
    );
  };

  const handleUpdateSongHeader = async () => {
    if (!selectedSongForDetail) return;
    try {
      const { error } = await supabase
        .from('songs')
        .update({
          title: editSongTitle,
          artist: editSongArtist,
          instrumentation: editSongInstrumentation
        })
        .eq('id', selectedSongForDetail.id);

      if (error) throw error;

      onSongUpdated?.({ ...selectedSongForDetail, title: editSongTitle, artist: editSongArtist, instrumentation: editSongInstrumentation });
      setIsEditingSongHeader(false);
      alert('Song-Details erfolgreich aktualisiert! ✅');
    } catch (e: any) {
      console.error('Error updating song details:', e);
      alert('Fehler beim Speichern: ' + e.message);
    }
  };

  const selectSongSkillForProgress = async (skill: any) => {
    setSelectedStudentForProgress(skill.student);
    setSelectedSongSkill(skill);
    
    const savedValsStr = localStorage.getItem(`song_skills_detail_${skill.user_id}_${skill.id}`);
    let r = skill.progress_percent || 0;
    let f = skill.progress_percent || 0;
    let e = skill.progress_percent || 0;
    if (savedValsStr) {
      try {
        const parsed = JSON.parse(savedValsStr);
        if (typeof parsed.rhythm === 'number') r = parsed.rhythm;
        if (typeof parsed.finger === 'number') f = parsed.finger;
        if (typeof parsed.expression === 'number') e = parsed.expression;
      } catch (err) {
        console.error(err);
      }
    }
    setSongRhythmVal(r);
    setSongFingerVal(f);
    setSongDynamicsVal(e);
    setSongTotalProgressVal(skill.progress_percent || 0);

    const topicName = `${selectedSongForDetail.artist} - ${selectedSongForDetail.title} (${skill.instrument})`;
    try {
      const { data, error } = await supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', skill.user_id)
        .eq('topic_name', topicName)
        .maybeSingle();

      if (data) {
        setSongInternalNotes(data.teacher_notes || '');
        if (data.status === 'MASTERED' || skill.is_stage_ready || skill.progress_percent === 100) {
          setSongStatus('mastered');
        } else if (data.status === 'IN_PROGRESS' || (skill.progress_percent || 0) > 0) {
          setSongStatus('in_progress');
        } else {
          setSongStatus('unbearbeitet');
        }
        if (data.homework_notes) {
          try {
            const parsed = JSON.parse(data.homework_notes);
            if (Array.isArray(parsed)) {
               setSongLessonNotesList(parsed);
            } else {
               setSongLessonNotesList([data.homework_notes]);
            }
          } catch {
            setSongLessonNotesList([data.homework_notes]);
          }
        } else {
          setSongLessonNotesList([]);
        }
      } else {
        setSongInternalNotes('');
        setSongLessonNotesList([]);
        if (skill.is_stage_ready || skill.progress_percent === 100) {
          setSongStatus('mastered');
        } else if ((skill.progress_percent || 0) > 0) {
          setSongStatus('in_progress');
        } else {
          setSongStatus('unbearbeitet');
        }
      }
    } catch (err) {
      console.error('Error fetching progress notes:', err);
    }
    setSongLessonNotes('');
  };


          const gradient = getSongColor(song.title || '');
        
        // Get list of assigned student skills
        const assignedStudents = assignedSongSkills;
        
        // Get list of unassigned students
        const unassignedStudents = students.filter((s: any) => 
          !assignedStudents.some((a: any) => a.user_id === s.id) &&
          (`${s.first_name || ''} ${s.last_name || ''}`).toLowerCase().includes(assignStudentSearch.toLowerCase())
        );

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4000,
            background: 'rgba(9, 9, 11, 0.65)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: '"Inter", sans-serif'
          }}>
            <div style={{
              background: '#f3f3f6',
              borderRadius: '32px',
              width: '100%',
              maxWidth: '1100px',
              height: '80vh',
              boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              position: 'relative'
            }} className="animation-slide-up">
              
              {/* Header - Waldgrün Header */}
              <div style={{
                padding: '16px 24px',
                background: '#456355',
                borderBottom: '1px solid rgba(50, 72, 62, 0.8)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 50,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Music size={20} color="#ffffff" />
                  <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', fontFamily: 'Urbanist' }}>
                    Song-Details: {song.title}
                  </h2>
                </div>
                <button
                  onClick={async () => {
                    await triggerAutoSaveSongProgress();
                    onClose();
                    setSelectedStudentForProgress(null);
                    setSelectedSongSkill(null);
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ffffff',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Inside Pages of the Notebook */}
              <div style={{
                display: 'flex',
                flex: 1,
                overflow: 'hidden',
                position: 'relative'
              }}>
                
                {/* Left Page (Information & Assigned Students) */}
                <div style={{
                  flex: '1 1 50%',
                  minWidth: 0,
                  padding: '32px',
                  overflowY: 'auto',
                  background: '#ffffff',
                  borderRight: '1px solid #cbd5e1',
                  position: 'relative'
                }}>

                  {/* Content Container */}
                  <div style={{ paddingRight: '12px' }}>
                    {/* Song Cover Widget */}
                    <div style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '20px',
                      padding: '20px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03), 0 8px 10px -6px rgba(0,0,0,0.03)',
                      marginBottom: '24px',
                      display: 'flex',
                      gap: '20px',
                      alignItems: 'center'
                    }}>
                      {/* Sleeve + Vinyl */}
                      <div style={{ position: 'relative', width: '80px', height: '65px', flexShrink: 0 }}>
                        <div style={{
                          position: 'absolute',
                          right: '4px',
                          top: '5px',
                          width: '54px',
                          height: '54px',
                          borderRadius: '50%',
                          background: '#090a0f',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1
                        }}>
                          <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: gradient.to, opacity: 0.45 }} />
                        </div>
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: '65px',
                          height: '65px',
                          background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
                          borderRadius: '16px',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 2,
                          border: `1px solid ${gradient.text}18`
                        }}>
                          <span style={{ fontSize: '32px', lineHeight: 1 }}>🎵</span>
                        </div>
                      </div>

                      {isEditingSongHeader ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            type="text"
                            value={editSongTitle}
                            onChange={e => setEditSongTitle(e.target.value)}
                            placeholder="Titel"
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.95rem',
                              fontWeight: 800,
                              outline: 'none',
                              width: '100%',
                              background: '#f8fafc'
                            }}
                          />
                          <input
                            type="text"
                            value={editSongArtist}
                            onChange={e => setEditSongArtist(e.target.value)}
                            placeholder="Künstler"
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              outline: 'none',
                              width: '100%',
                              background: '#f8fafc'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={handleUpdateSongHeader}
                              style={{
                                background: '#fbbc05',
                                color: '#1e293b',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Check size={12} /> Speichern
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingSongHeader(false)}
                              style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <X size={12} /> Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h2 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                              {song.title}
                            </h2>
                            <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                              von {song.artist}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditSongTitle(song.title || '');
                              setEditSongArtist(song.artist || '');
                              setEditSongInstrumentation(song.instrumentation || {});
                              setIsEditingSongHeader(true);
                            }}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              width: '44px',
                              height: '44px',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#64748b',
                              transition: 'all 0.2s',
                              flexShrink: 0
                            }}
                          >
                            <Pencil size={18} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Assigned Students Widget */}
                    <div style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '24px',
                      padding: '24px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03), 0 8px 10px -6px rgba(0,0,0,0.03)',
                      marginTop: '20px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: '6px', margin: '0 0 12px 0' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={18} color="#0f172a" /> {selectedStudentForProgress ? 'Ausgewählter Schüler' : `Zugeordnete Schüler (${assignedStudents.length})`}
                        </h3>
                        {!selectedStudentForProgress && (
                          <div style={{ position: 'relative', width: '226px' }}>
                            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                              type="text"
                              placeholder="Suchen..."
                              value={studentDetailSearch}
                              onChange={e => setStudentDetailSearch(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '5px 10px 5px 30px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.78rem',
                                fontWeight: 650,
                                outline: 'none',
                                background: 'white'
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {assignedStudents.length === 0 ? (
                        <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.85rem', marginTop: '12px' }}>
                          Bisher arbeitet kein Schüler an diesem Song.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {assignedStudents
                            .filter((s: any) => !selectedStudentForProgress || s.user_id === selectedStudentForProgress.id)
                            .filter((s: any) => {
                              if (!studentDetailSearch.trim()) return true;
                              const query = studentDetailSearch.toLowerCase();
                              const name = `${s.student?.first_name || ''} ${s.student?.last_name || ''}`.toLowerCase();
                              return name.includes(query) || (s.instrument || '').toLowerCase().includes(query);
                            })
                            .map((s: any) => {
                              const initials = `${s.student?.first_name?.[0] || ''}${s.student?.last_name?.[0] || ''}`.toUpperCase();
                              const isSelected = selectedSongSkill?.id === s.id;
                              
                              return (
                                <div key={s.id} 
                                  onClick={() => selectSongSkillForProgress(s)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: isSelected ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)',
                                    border: isSelected ? `2px solid ${gradient.text}` : '1px solid #e2e8f0',
                                    padding: '10px 14px',
                                    borderRadius: '14px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      background: gradient.from,
                                      color: gradient.text,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      flexShrink: 0
                                    }}>
                                      {initials}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                                        {s.student?.first_name} {s.student?.last_name}
                                      </span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                        <div style={{ flex: 1, height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                                          <div style={{ width: `${s.progress_percent || 0}%`, height: '100%', background: (s.is_stage_ready || s.progress_percent === 100) ? 'hsl(130, 65%, 82%)' : 'hsl(47, 85%, 84%)', borderRadius: '2px' }} />
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, flexShrink: 0 }}>
                                          {s.progress_percent || 0}% Fortschritt
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {selectedStudentForProgress ? (
                                    <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenTageskompass?.(selectedStudentForProgress);
                                        }}
                                        style={{
                                          background: '#456355',
                                          border: 'none',
                                          borderRadius: '8px',
                                          padding: '6px 12px',
                                          fontSize: '0.78rem',
                                          fontWeight: 800,
                                          color: 'white',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          transition: 'all 0.2s'
                                        }}
                                        className="hover-scale"
                                      >
                                        <BookOpen size={12} /> Protokoll
                                      </button>
                                      <button
                                        onClick={async (e) => { e.stopPropagation(); await triggerAutoSaveSongProgress(); setSelectedStudentForProgress(null); setSelectedSongSkill(null); }}
                                        style={{
                                          background: '#f1f5f9',
                                          border: 'none',
                                          borderRadius: '8px',
                                          padding: '6px 12px',
                                          fontSize: '0.78rem',
                                          fontWeight: 700,
                                          color: '#475569',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          transition: 'all 0.2s'
                                        }}
                                      >
                                        <ChevronLeft size={12} /> Zurück
                                      </button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenTageskompass?.(s.student);
                                        }}
                                        style={{
                                          background: '#456355',
                                          border: 'none',
                                          borderRadius: '8px',
                                          padding: '6px 12px',
                                          fontSize: '0.74rem',
                                          fontWeight: 800,
                                          color: 'white',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          transition: 'all 0.2s'
                                        }}
                                        className="hover-scale"
                                      >
                                        <BookOpen size={12} /> Protokoll
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleUnassignStudentFromSong(s.id, s.user_id, song.title, s.instrument); }}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: '#ef4444',
                                          cursor: 'pointer',
                                          width: '28px',
                                          height: '28px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: '50%',
                                          transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        title="Zuweisung löschen"
                                      >
                                        <X size={16} strokeWidth={2.5} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* Lesson Notes & Internal Notes (when student is selected, placed under selected student) */}
                    {selectedStudentForProgress && selectedSongSkill && (
                      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* 2. Lesson Notes Log */}
                        <div style={{ background: '#fffbeb', border: '1.5px solid #fef08a', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#18181b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            🗓️ Hausaufgaben & Übetipps
                          </span>
                          
                          {songStatus === 'in_progress' && (
                            <div style={{
                              fontSize: '0.88rem',
                              color: '#09090b',
                              fontWeight: 800,
                              letterSpacing: '-0.035em',
                              borderBottom: '1px solid #fde047',
                              paddingBottom: '6px',
                              marginBottom: '4px'
                            }}>
                              🎵 <span>{song.artist} - {song.title}</span>
                            </div>
                          )}
                          
                          {songLessonNotesList.length === 0 ? (
                            <span style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 550, fontStyle: 'italic' }}>
                              Keine Übetipps für diese Woche erfasst.
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {songLessonNotesList.map((note, nIdx) => (
                                <div key={nIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.72rem', color: '#475569', fontWeight: 500, fontStyle: 'italic', gap: '8px' }}>
                                  <span style={{ whiteSpace: 'pre-line', flex: 1 }}>{note}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedList = songLessonNotesList.filter((_, idx) => idx !== nIdx);
                                      setSongLessonNotesList(updatedList);
                                      // Trigger auto-save immediately on notes list modification
                                      handleUpdateSongStudentProgress(
                                        selectedSongSkill.id,
                                        selectedStudentForProgress.id,
                                        selectedSongSkill.instrument,
                                        songRhythmVal,
                                        songFingerVal,
                                        songDynamicsVal,
                                        songTotalProgressVal,
                                        songTotalProgressVal === 100,
                                        songInternalNotes,
                                        updatedList
                                      );
                                    }}
                                    style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800 }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ borderTop: '1px solid #fef08a', paddingTop: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <textarea
                              placeholder="Übetipps für diese Woche hinzufügen..."
                              value={songLessonNotes}
                              onChange={e => setSongLessonNotes(e.target.value)}
                              rows={6}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.82rem',
                                fontWeight: 650,
                                background: 'white',
                                outline: 'none',
                                fontStyle: 'italic',
                                minHeight: '145px',
                                fontFamily: 'inherit',
                                resize: 'vertical'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!songLessonNotes.trim()) return;
                                const updatedList = [...songLessonNotesList, songLessonNotes.trim()];
                                setSongLessonNotesList(updatedList);
                                setSongLessonNotes('');
                                // Trigger auto-save immediately on notes list addition
                                handleUpdateSongStudentProgress(
                                  selectedSongSkill.id,
                                  selectedStudentForProgress.id,
                                  selectedSongSkill.instrument,
                                  songRhythmVal,
                                  songFingerVal,
                                  songDynamicsVal,
                                  songTotalProgressVal,
                                  songTotalProgressVal === 100,
                                  songInternalNotes,
                                  updatedList
                                );
                              }}
                              disabled={!songLessonNotes.trim()}
                              style={{
                                background: songLessonNotes.trim() ? gradient.from : '#f1f5f9',
                                color: songLessonNotes.trim() ? gradient.text : '#94a3b8',
                                border: songLessonNotes.trim() ? `1px solid ${gradient.text}` : '1px solid #cbd5e1',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                alignSelf: 'flex-start',
                                cursor: songLessonNotes.trim() ? 'pointer' : 'not-allowed'
                              }}
                            >
                              ➕ Hinzufügen
                            </button>
                          </div>

                          {/* Templates for songs */}
                          <div style={{ marginTop: '4px' }}>
                            <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>⚡ Schnell-Textbausteine</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {textbausteine
                                  .filter((tb: any) => tb.active && (tb.type === 'both' || tb.type === 'songs'))
                                  .map((tpl: any, i: number) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setSongLessonNotes(prev => prev ? `${prev}\n\n${tpl.text}` : tpl.text)}
                                  style={{ background: 'white', color: '#4b5563', border: '1px solid #e5e7eb', padding: '6px 12px', borderRadius: '9999px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  {tpl.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Page (Assign Students OR Selected Student Progress Editor) */}
                <div style={{
                  flex: '1 1 50%',
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#f8fafc',
                  position: 'relative',
                  height: '100%',
                  overflow: 'hidden'
                }}>

                  {/* Content Container (Scrollable) */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '32px 32px 85px 44px', width: '100%' }}>
                    {selectedStudentForProgress && selectedSongSkill ? (() => {
                      const skill = selectedSongSkill;
                      
                      return (
                        <div>
                          {/* Widget 1: Songstatus */}
                          <div style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            padding: '20px 24px',
                            borderRadius: '24px',
                            marginBottom: '20px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🎵 Songstatus:
                              </span>
                              <div style={{ display: 'flex', gap: '12px' }}>
                                {[
                                  { type: 'unbearbeitet', color: 'hsl(355, 75%, 84%)', label: 'rot = unbearbeitet' },
                                  { type: 'in_progress', color: 'hsl(47, 85%, 84%)', label: 'gelb = hausaufgabe' },
                                  { type: 'mastered', color: 'hsl(130, 65%, 82%)', label: 'grün = gemeistert' }
                                ].map(b => {
                                  const isActive = songStatus === b.type;
                                  return (
                                    <button
                                      key={b.type}
                                      type="button"
                                      onClick={() => {
                                        setSongStatus(b.type as any);
                                        let targetProgress = songTotalProgressVal;
                                        if (b.type === 'unbearbeitet') {
                                          setSongRhythmVal(0);
                                          setSongFingerVal(0);
                                          setSongDynamicsVal(0);
                                          setSongTotalProgressVal(0);
                                          targetProgress = 0;
                                        } else if (b.type === 'in_progress') {
                                          if (songTotalProgressVal === 0 || songTotalProgressVal === 100) {
                                            setSongRhythmVal(25);
                                            setSongFingerVal(25);
                                            setSongDynamicsVal(25);
                                            setSongTotalProgressVal(25);
                                            targetProgress = 25;
                                          }
                                        } else if (b.type === 'mastered') {
                                          setSongRhythmVal(100);
                                          setSongFingerVal(100);
                                          setSongDynamicsVal(100);
                                          setSongTotalProgressVal(100);
                                          targetProgress = 100;
                                        }
                                        if (selectedSongSkill) {
                                          setAssignedSongSkills(prev => prev.map(s => s.id === selectedSongSkill.id ? { ...s, progress_percent: targetProgress, is_stage_ready: b.type === 'mastered' } : s));
                                        }
                                      }}
                                      style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: b.color,
                                        border: isActive ? '3.5px solid #0f172a' : '1.5px solid #cbd5e1',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        transform: isActive ? 'scale(1.1)' : 'none',
                                        boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                                      }}
                                      title={b.label}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                             <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '10px', fontSize: '0.68rem', color: '#64748b', fontWeight: 700, borderTop: '1px solid #f1f5f9', paddingTop: '10px', whiteSpace: 'nowrap', overflowX: 'auto' }}>
                               <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 <span style={{ color: 'hsl(355, 75%, 84%)', fontSize: '0.9rem' }}>●</span> Rot (unbearbeitet)
                               </span>
                               <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 <span style={{ color: 'hsl(47, 85%, 84%)', fontSize: '0.9rem' }}>●</span> Gelb (Hausaufgabe)
                               </span>
                               <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 <span style={{ color: 'hsl(130, 65%, 82%)', fontSize: '0.9rem' }}>●</span> Grün (gemeistert - 100%)
                               </span>
                             </div>
                          </div>

                          {/* Widget 2: Fortschritt */}
                          <div style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            padding: '24px',
                            borderRadius: '24px',
                            marginBottom: '20px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                                Fortschritt: {songTotalProgressVal}%
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowSongProgressDetails(!showSongProgressDetails)}
                                style={{
                                  background: '#f1f5f9',
                                  border: 'none',
                                  borderRadius: '20px',
                                  padding: '6px 14px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  color: '#475569',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                              >
                                {showSongProgressDetails ? 'Details ausblenden ▲' : 'Details anzeigen ▼'}
                              </button>
                            </div>

                            {/* Main Progress Slider with Black Track and White Thumb */}
                            <div style={{ position: 'relative', width: '100%' }}>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={songTotalProgressVal}
                                onChange={e => {
                                  const val = parseInt(e.target.value);
                                  setSongTotalProgressVal(val);
                                  setSongRhythmVal(val);
                                  setSongFingerVal(val);
                                  setSongDynamicsVal(val);
                                  if (val === 100) {
                                    setSongStatus('mastered');
                                  } else if (val === 0) {
                                    setSongStatus('unbearbeitet');
                                  } else {
                                    setSongStatus('in_progress');
                                  }
                                  if (selectedSongSkill) {
                                    localStorage.setItem(`song_skills_detail_${selectedSongSkill.user_id}_${selectedSongSkill.id}`, JSON.stringify({
                                      rhythm: val,
                                      finger: val,
                                      expression: val
                                    }));
                                    setAssignedSongSkills(prev => prev.map(s => s.id === selectedSongSkill.id ? { ...s, progress_percent: val, is_stage_ready: val === 100 } : s));
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  WebkitAppearance: 'none',
                                  height: '8px',
                                  borderRadius: '4px',
                                  background: `linear-gradient(to right, ${songTotalProgressVal === 100 ? 'hsl(130, 65%, 82%)' : 'hsl(47, 85%, 84%)'} 0%, ${songTotalProgressVal === 100 ? 'hsl(130, 65%, 82%)' : 'hsl(47, 85%, 84%)'} ${songTotalProgressVal}%, #e2e8f0 ${songTotalProgressVal}%, #e2e8f0 100%)`,
                                  outline: 'none',
                                  cursor: 'pointer'
                                }}
                                className="custom-slider-input"
                              />
                              <style dangerouslySetInnerHTML={{__html: `
                                .custom-slider-input::-webkit-slider-thumb {
                                  -webkit-appearance: none;
                                  appearance: none;
                                  width: 20px;
                                  height: 20px;
                                  border-radius: 50%;
                                  background: #ffffff;
                                  border: 1px solid #cbd5e1;
                                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                  cursor: pointer;
                                  transition: transform 0.1s;
                                }
                                .custom-slider-input::-webkit-slider-thumb:hover {
                                  transform: scale(1.15);
                                }
                              `}} />
                            </div>

                            {/* 3 Sub-sliders if details are shown */}
                            {showSongProgressDetails && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                {[
                                  { label: 'Rhythmus & Timing', value: songRhythmVal, color: '#000000', type: 'rhythm' },
                                  { label: 'Finger & Technik', value: songFingerVal, color: '#000000', type: 'finger' },
                                  { label: 'Ausdruck & Performance', value: songDynamicsVal, color: '#000000', type: 'dynamics' }
                                ].map(slider => (
                                  <div key={slider.type} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800 }}>
                                      <span style={{ color: '#475569' }}>{slider.label}</span>
                                      <span style={{ color: '#0f172a' }}>{slider.value}%</span>
                                    </div>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                      <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={slider.value}
                                        onChange={e => {
                                          const val = parseInt(e.target.value);
                                          let r = songRhythmVal;
                                          let f = songFingerVal;
                                          let d = songDynamicsVal;
                                          if (slider.type === 'rhythm') { r = val; setSongRhythmVal(val); }
                                          else if (slider.type === 'finger') { f = val; setSongFingerVal(val); }
                                          else if (slider.type === 'dynamics') { d = val; setSongDynamicsVal(val); }
                                          const avg = Math.round((r + f + d) / 3);
                                          setSongTotalProgressVal(avg);
                                          if (avg === 100) {
                                            setSongStatus('mastered');
                                          } else if (avg === 0) {
                                            setSongStatus('unbearbeitet');
                                          } else {
                                            setSongStatus('in_progress');
                                          }
                                          if (selectedSongSkill) {
                                            localStorage.setItem(`song_skills_detail_${selectedSongSkill.user_id}_${selectedSongSkill.id}`, JSON.stringify({
                                              rhythm: r,
                                              finger: f,
                                              expression: d
                                            }));
                                            setAssignedSongSkills(prev => prev.map(s => s.id === selectedSongSkill.id ? { ...s, progress_percent: avg, is_stage_ready: avg === 100 } : s));
                                          }
                                        }}
                                        style={{
                                          width: '100%',
                                          WebkitAppearance: 'none',
                                          height: '8px',
                                          borderRadius: '4px',
                                          background: `linear-gradient(to right, ${slider.color} 0%, ${slider.color} ${slider.value}%, #e2e8f0 ${slider.value}%, #e2e8f0 100%)`,
                                          outline: 'none',
                                          cursor: 'pointer'
                                        }}
                                        className="custom-sub-slider"
                                      />
                                    </div>
                                  </div>
                                ))}
                                <style dangerouslySetInnerHTML={{__html: `
                                  .custom-sub-slider::-webkit-slider-thumb {
                                    -webkit-appearance: none;
                                    appearance: none;
                                    width: 18px;
                                    height: 18px;
                                    border-radius: 50%;
                                    background: #ffffff;
                                    border: 1px solid #cbd5e1;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                    cursor: pointer;
                                    transition: transform 0.1s;
                                  }
                                  .custom-sub-slider::-webkit-slider-thumb:hover {
                                    transform: scale(1.15);
                                  }
                                `}} />
                              </div>
                            )}

                            {/* Mark as Mastered button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSongStatus('mastered');
                                  setSongRhythmVal(100);
                                  setSongFingerVal(100);
                                  setSongDynamicsVal(100);
                                  setSongTotalProgressVal(100);
                                  if (selectedSongSkill) {
                                    setAssignedSongSkills(prev => prev.map(s => s.id === selectedSongSkill.id ? { ...s, progress_percent: 100, is_stage_ready: true } : s));
                                  }
                                }}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '20px',
                                  padding: '8px 16px',
                                  fontSize: '0.82rem',
                                  fontWeight: 800,
                                  color: '#0f172a',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'all 0.15s ease',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = '#f1f5f9';
                                  e.currentTarget.style.borderColor = '#cbd5e1';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = '#f8fafc';
                                  e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                              >
                                Song als gemeistert markieren ⭐
                              </button>
                            </div>
                          </div>

                          {/* Interne Notizen (Lehrer-Sicht) */}
                          <div style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            padding: '20px',
                            borderRadius: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                            marginTop: '20px'
                          }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                              Interne Notizen (Lehrer-Sicht)
                            </label>
                            <textarea
                              placeholder="Notizen zum Schüler, Stärken oder Schwächen..."
                              value={songInternalNotes}
                              onChange={e => setSongInternalNotes(e.target.value)}
                              rows={5}
                              style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '12px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.82rem',
                                fontWeight: 650,
                                outline: 'none',
                                fontFamily: 'inherit',
                                resize: 'vertical'
                              }}
                            />
                          </div>


                        </div>
                      );
                    })() : (
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0', borderBottom: '2px solid #cbd5e1', paddingBottom: '6px' }}>
                          ➕ Schüler zuteilen
                        </h3>

                        <div style={{ position: 'relative', marginBottom: '16px', width: '100%' }}>
                          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                          <input
                            type="text"
                            placeholder="Schüler suchen..."
                            value={assignStudentSearch}
                            onChange={e => setAssignStudentSearch(e.target.value)}
                            onFocus={() => setIsAssignSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsAssignSearchFocused(false), 250)}
                            style={{
                              width: '100%',
                              padding: '10px 12px 10px 36px',
                              borderRadius: '12px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.88rem',
                              fontWeight: 650,
                              outline: 'none',
                              background: 'white'
                            }}
                          />
                        </div>

                        {!(isAssignSearchFocused || assignStudentSearch.trim() !== '') ? (
                          <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', marginTop: '32px' }}>
                            Klicke in das Suchfeld, um Schüler anzuzeigen...
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                            {unassignedStudents.map((s: any) => (
                              <div key={s.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'white',
                                border: '1px solid #cbd5e1',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                              }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                                  {s.first_name} {s.last_name}
                                </span>
                                <button
                                  onClick={() => {
                                    handleAssignStudentToSong(s.id, 'ohne Zuweisung');
                                    setAssignStudentSearch('');
                                  }}
                                  style={{
                                    background: '#fbbc05',
                                    color: '#1e293b',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '5px 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s'
                                  }}
                                  className="hover-scale-mini"
                                >
                                  Hinzufügen
                                </button>
                              </div>
                            ))}
                            {unassignedStudents.length === 0 && (
                              <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', marginTop: '12px' }}>
                                Keine weiteren Schüler zum Zuteilen verfügbar.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div> {/* Close Content Container (Scrollable) */}

                  {/* Fixed Footer for Speichern & Schließen */}
                  {selectedStudentForProgress && selectedSongSkill && (
                    <div style={{
                      position: 'absolute',
                      bottom: '24px',
                      left: 'calc(50% + 6px)', // offset slightly to the right to visually center considering binder spacing on the left
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      justifyContent: 'center',
                      zIndex: 100
                    }}>
                      <button
                        type="button"
                        onClick={async () => {
                          await triggerAutoSaveSongProgress();
                          onClose();
                          setSelectedStudentForProgress(null);
                          setSelectedSongSkill(null);
                        }}
                        style={{
                          background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
                          color: '#000000',
                          border: '1.5px solid #000000',
                          padding: '12px 24px',
                          borderRadius: '16px',
                          fontSize: '0.9rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        }}
                      >
                        <Check size={16} strokeWidth={3} /> Speichern & Schließen
                      </button>
                    </div>
                  )}
                </div>



              </div>
            </div>
          </div>
  );
};

export default AdminSongDetailModal;
