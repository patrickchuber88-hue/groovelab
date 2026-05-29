import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Award, Flame, AlertCircle, BookOpen, Music, History, Plus, ChevronRight } from 'lucide-react';
import Confetti from 'react-confetti';
import { supabase } from '../lib/supabase';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
}

interface MeisterwerkDocumentationModalProps {
  student: Student;
  onClose: () => void;
}

interface ProgressItem {
  id?: string;
  topic_name: string;
  status: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED';
  is_current_homework: boolean;
  teacher_notes: string;
  updated_at?: string;
}

export const MeisterwerkDocumentationModal: React.FC<MeisterwerkDocumentationModalProps> = ({ student, onClose }) => {
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Left column navigation tab
  const [leftTab, setLeftTab] = useState<'lehrwerke' | 'songs' | 'history'>('lehrwerke');

  // Form State for editing / adding
  const [activeItem, setActiveItem] = useState<ProgressItem | null>(null);
  const [topicName, setTopicName] = useState('');
  const [status, setStatus] = useState<'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED'>('IN_PROGRESS');
  const [isCurrentHomework, setIsCurrentHomework] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState('');

  // Song catalog integration
  const [activeInputTab, setActiveInputTab] = useState<'free' | 'catalog' | 'lehrwerk_page' | 'active_song'>('free');
  const [songs, setSongs] = useState<any[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [selectedSongId, setSelectedSongId] = useState<string>('');
  const [songPart, setSongPart] = useState('');

  // Lehrwerke assigned to student states
  const [globalLehrwerke, setGlobalLehrwerke] = useState<any[]>([]);
  const [assignedLehrwerke, setAssignedLehrwerke] = useState<any[]>([]);
  const [activeLehrwerkId, setActiveLehrwerkId] = useState<string | null>(null);
  const [activePageNumber, setActivePageNumber] = useState<number | null>(null);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // Active Songs
  const [activeSongSkills, setActiveSongSkills] = useState<any[]>([]);
  const [selectedActiveSongId, setSelectedActiveSongId] = useState<string>('');

  // Confetti State
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch student's school's songs catalog
  useEffect(() => {
    async function loadSongs() {
      setSongsLoading(true);
      try {
        const { data: studentUser, error: studentError } = await supabase
          .from('users')
          .select('school_id')
          .eq('id', student.id)
          .single();

        if (studentError) throw studentError;

        if (studentUser?.school_id) {
          const { data: songsData, error: songsError } = await supabase
            .from('songs')
            .select('*')
            .eq('school_id', studentUser.school_id)
            .order('title', { ascending: true });

          if (songsError) throw songsError;
          setSongs(songsData || []);
        }
      } catch (err) {
        console.error('Error loading catalog songs:', err);
      } finally {
        setSongsLoading(false);
      }
    }
    if (student.id) {
      loadSongs();
    }
  }, [student.id]);

  // Load Lehrwerke data from localStorage
  const loadLehrwerke = () => {
    try {
      const storedGlobal = localStorage.getItem('campus_lehrwerke');
      const storedAssigned = localStorage.getItem('student_lehrwerke_progress');
      
      const defaults = [
        { id: '1', title: 'GrooveLab Guitar Vol. 1', instrument: 'Guitar', type: 'Standardwerk für E-Gitarre', progress: 60, emoji: '🎸', color: '#34a853', totalPages: 50 },
        { id: '2', title: 'GrooveLab Drums Vol. 1', instrument: 'Drums', type: 'Standardwerk für Schlagzeug', progress: 45, emoji: '🥁', color: '#4f46e5', totalPages: 50 },
        { id: '3', title: 'GrooveLab Bass Vol. 1', instrument: 'Bass', type: 'Standardwerk für E-Bass', progress: 30, emoji: '🎸', color: '#f59e0b', totalPages: 50 },
        { id: '4', title: 'GrooveLab Keys Vol. 1', instrument: 'Keys', type: 'Standardwerk für Keyboard', progress: 80, emoji: '🎹', color: '#ec4899', totalPages: 50 },
        { id: '5', title: 'GrooveLab Vocals Vol. 1', instrument: 'Vocals', type: 'Standardwerk für Gesang', progress: 50, emoji: '🎤', color: '#3b82f6', totalPages: 50 }
      ];
      
      setGlobalLehrwerke(storedGlobal ? JSON.parse(storedGlobal) : defaults);

      if (storedAssigned) {
        const parsedAssigned = JSON.parse(storedAssigned);
        const filtered = parsedAssigned.filter((item: any) => item.studentId === student.id);
        setAssignedLehrwerke(filtered);
        
        // Auto-select first assigned textbook if none selected
        if (filtered.length > 0 && !activeLehrwerkId) {
          setActiveLehrwerkId(filtered[0].lehrwerkId);
        }
      } else {
        setAssignedLehrwerke([]);
      }
    } catch (e) {
      console.error('Error loading Lehrwerke in modal:', e);
    }
  };

  // Load Student's active song skills
  const loadActiveSongSkills = async () => {
    try {
      const { data: skillsData, error } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', student.id);
      
      if (error) throw error;
      setActiveSongSkills(skillsData || []);
    } catch (e) {
      console.error('Error loading active songs in modal:', e);
    }
  };

  // Fetch student's progress matrix history
  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', student.id)
        .order('updated_at', { ascending: false });

      if (dbError) throw dbError;
      setProgressItems(data || []);
    } catch (err: any) {
      console.error('Error fetching progress:', err);
      setError('Fehler beim Laden des Lernfortschritts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (student.id) {
      fetchProgress();
      loadLehrwerke();
      loadActiveSongSkills();
    }
  }, [student.id]);

  const selectItemForEditing = (item: ProgressItem) => {
    setActiveItem(item);
    setTopicName(item.topic_name);
    setStatus(item.status);
    setIsCurrentHomework(item.is_current_homework);
    setTeacherNotes(item.teacher_notes || '');
    setActiveInputTab('free');
  };

  const handleCreateNew = () => {
    setActiveItem(null);
    setTopicName('');
    setStatus('IN_PROGRESS');
    setIsCurrentHomework(false);
    setTeacherNotes('');
    setActiveInputTab('free');
    setSelectedSongId('');
    setSongPart('');
    setActivePageNumber(null);
    setSelectedActiveSongId('');
  };

  const handleStatusChange = (newStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED') => {
    setStatus(newStatus);
    if (newStatus === 'MASTERED') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  // Assign textbook to student inside the modal
  const handleAssignLehrwerk = (lehrwerkId: string) => {
    if (!lehrwerkId) return;
    const book = globalLehrwerke.find(b => b.id === lehrwerkId);
    if (!book) return;

    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      
      if (parsed.some((item: any) => item.studentId === student.id && item.lehrwerkId === lehrwerkId)) {
        return;
      }

      const newAssignment = {
        studentId: student.id,
        lehrwerkId: lehrwerkId,
        assignedAt: new Date().toISOString(),
        pageStates: {}
      };

      const updated = [...parsed, newAssignment];
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      loadLehrwerke();
      setActiveLehrwerkId(lehrwerkId);
      setShowAssignDropdown(false);
    } catch (e) {
      console.error(e);
    }
  };

  const selectTextbookPage = (lehrwerkId: string, pageNum: number) => {
    const book = globalLehrwerke.find(b => b.id === lehrwerkId);
    if (!book) return;

    setActiveLehrwerkId(lehrwerkId);
    setActivePageNumber(pageNum);
    setActiveInputTab('lehrwerk_page');
    
    const assignedBook = assignedLehrwerke.find(a => a.lehrwerkId === lehrwerkId);
    const pageState = assignedBook?.pageStates?.[pageNum] || { status: 'locked', notes: '' };
    
    // Auto-populate form
    setTopicName(`${book.title} - Seite ${pageNum}`);
    setTeacherNotes(pageState.notes || '');

    // Map textbook page statuses to Supabase/form states
    const bookPageStatus = pageState.status || 'locked';
    if (bookPageStatus === 'mastered') {
      setStatus('MASTERED');
      setIsCurrentHomework(false);
    } else if (bookPageStatus === 'purple') {
      setStatus('THEORY_DONE');
      setIsCurrentHomework(false);
    } else if (bookPageStatus === 'homework') {
      setStatus('IN_PROGRESS');
      setIsCurrentHomework(true);
    } else {
      setStatus('IN_PROGRESS');
      setIsCurrentHomework(false);
    }
  };

  const selectActiveSong = (skill: any) => {
    setSelectedActiveSongId(skill.id);
    setActiveInputTab('active_song');
    
    const fullTitle = `${skill.songs?.artist} - ${skill.songs?.title} (${skill.instrument})`;
    setTopicName(fullTitle);
    
    // Check if there's a note in user_song_skills
    setTeacherNotes('');
    
    if (skill.is_stage_ready) {
      setStatus('MASTERED');
      setIsCurrentHomework(false);
    } else if (skill.progress_percent >= 50) {
      setStatus('THEORY_DONE');
      setIsCurrentHomework(false);
    } else {
      setStatus('IN_PROGRESS');
      setIsCurrentHomework(skill.is_current_homework || false);
    }
  };

  // Find former notes matching the current topic Name automatically!
  const formerNotes = useMemo(() => {
    if (!topicName.trim()) return [];
    return progressItems.filter(item => item.topic_name.toLowerCase().trim() === topicName.toLowerCase().trim());
  }, [topicName, progressItems]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName.trim()) {
      alert('Bitte wählen Sie ein Thema, Song oder Buchseite aus.');
      return;
    }

    setSaving(true);
    setError(null);

    // Save page status to local textbooks structure if page active
    if (activeInputTab === 'lehrwerk_page' && activeLehrwerkId && activePageNumber !== null) {
      try {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];

        // Map status/homework form values back to local textbook format
        let pageStatus: 'locked' | 'homework' | 'mastered' | 'purple' = 'locked';
        if (status === 'MASTERED') {
          pageStatus = 'mastered';
        } else if (status === 'THEORY_DONE') {
          pageStatus = 'purple';
        } else if (isCurrentHomework) {
          pageStatus = 'homework';
        }

        // Manage global page status (purple / info)
        const globalStored = localStorage.getItem('campus_lehrwerke');
        if (globalStored) {
          const books = JSON.parse(globalStored);
          const updatedBooks = books.map((b: any) => {
            if (b.id === activeLehrwerkId) {
              const globalPageStates = b.globalPageStates || {};
              if (pageStatus === 'purple') {
                globalPageStates[activePageNumber] = 'purple';
              } else {
                delete globalPageStates[activePageNumber];
              }
              return { ...b, globalPageStates };
            }
            return b;
          });
          localStorage.setItem('campus_lehrwerke', JSON.stringify(updatedBooks));
        }

        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === activeLehrwerkId) {
            return {
              ...item,
              pageStates: {
                ...item.pageStates,
                [activePageNumber]: {
                  status: pageStatus,
                  notes: teacherNotes.trim(),
                  updatedAt: new Date().toISOString()
                }
              }
            };
          }
          return item;
        });

        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        loadLehrwerke();
      } catch (err) {
        console.error('Error saving textbook local progress:', err);
      }
    }

    // Save to active song skills if active song selected
    if (activeInputTab === 'active_song' && selectedActiveSongId) {
      try {
        let skillPercent = 25;
        if (status === 'MASTERED') {
          skillPercent = 100;
        } else if (status === 'THEORY_DONE') {
          skillPercent = 60;
        }
        
        await supabase
          .from('user_song_skills')
          .update({
            is_stage_ready: status === 'MASTERED',
            progress_percent: skillPercent,
            is_current_homework: isCurrentHomework,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedActiveSongId);
        
        loadActiveSongSkills();
      } catch (err) {
        console.error('Error updating song skill:', err);
      }
    }

    const payload = {
      id: activeItem?.id,
      studentId: student.id,
      topicName: topicName.trim(),
      status,
      isCurrentHomework,
      teacherNotes: teacherNotes.trim()
    };

    try {
      // 1. Post to API endpoint
      const response = await fetch('/api/teacher/save-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('sb-access-token') || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchProgress();
        // If textbook or song was edited, don't completely reset topicName so they can view updated page note history, 
        // but let's refresh general list and reset activeItem
        setActiveItem(null);
        return;
      }

      // 2. Direct Supabase update/insert fallback
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert.');

      const row = {
        student_id: student.id,
        teacher_id: user.id,
        topic_name: topicName.trim(),
        status,
        is_current_homework: isCurrentHomework,
        teacher_notes: teacherNotes.trim(),
        updated_at: new Date().toISOString()
      };

      let dbError;
      if (activeItem?.id) {
        const { error } = await supabase
          .from('progress_matrix')
          .update(row)
          .eq('id', activeItem.id);
        dbError = error;
      } else {
        // Check if combination already exists
        const { data: existing } = await supabase
          .from('progress_matrix')
          .select('id')
          .eq('student_id', student.id)
          .eq('topic_name', topicName.trim())
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('progress_matrix')
            .update(row)
            .eq('id', existing.id);
          dbError = error;
        } else {
          const { error } = await supabase
            .from('progress_matrix')
            .insert(row);
          dbError = error;
        }
      }

      if (dbError) throw dbError;

      await fetchProgress();
      setActiveItem(null);
    } catch (err: any) {
      console.error('Error saving progress:', err);
      setError('Fehler beim Speichern des Fortschritts.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 4000,
      background: 'rgba(9, 9, 11, 0.75)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: '"Outfit", sans-serif'
    }}>
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={false}
          numberOfPieces={400}
          gravity={0.15}
        />
      )}

      <div style={{
        background: 'white',
        borderRadius: '32px',
        width: '100%',
        maxWidth: '1080px',
        maxHeight: '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(226, 232, 240, 0.8)'
      }} className="animation-slide-up">
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
              border: '2px solid white'
            }}>
              <img
                src={student.photo_url || '/avatar_ghost.jpg'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt=""
              />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                [ TAGESKOMPASS ] Meisterwerk-Protokoll
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: 700 }}>
                Fortschritt dokumentieren für: {student.first_name} {student.last_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.2s'
            }}
            className="hover-scale"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content - Split layout */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }} className="flex-col md:flex-row">
          
          {/* Left Column: Interactive tabs (Lehrwerke, Songs, Verlauf) */}
          <div style={{
            flex: '1.4 1 0%',
            borderRight: '1px solid #f1f5f9',
            padding: '24px 32px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            background: '#fafbfd'
          }}>
            {/* Left Segmented Control Tabs */}
            <div style={{
              display: 'flex',
              background: 'rgba(120, 120, 128, 0.08)',
              padding: '3px',
              borderRadius: '14px',
              gap: '2px'
            }}>
              {[
                { id: 'lehrwerke', label: '📚 Lehrwerke', icon: BookOpen },
                { id: 'songs', label: '🎵 Aktive Songs', icon: Music },
                { id: 'history', label: '🕰️ Verlauf', icon: History }
              ].map(tab => {
                const isActive = leftTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setLeftTab(tab.id as any)}
                    style={{
                      flex: 1,
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '11px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: isActive ? 'white' : 'transparent',
                      color: isActive ? '#0f172a' : '#64748b',
                      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT: LEHRWERKE */}
            {leftTab === 'lehrwerke' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Zugewiesene Lehrwerke
                  </span>
                  
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                      style={{
                        background: '#e0e7ff',
                        color: '#4f46e5',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={12} /> Hinzufügen
                    </button>
                    
                    {showAssignDropdown && (
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        top: '32px',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        zIndex: 10,
                        minWidth: '220px',
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}>
                        {globalLehrwerke
                          .filter(g => !assignedLehrwerke.some(a => a.lehrwerkId === g.id))
                          .map(g => (
                            <button
                              key={g.id}
                              onClick={() => handleAssignLehrwerk(g.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                textAlign: 'left',
                                cursor: 'pointer',
                                color: '#334155',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                              className="hover-bg"
                            >
                              <span>{g.emoji}</span>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</span>
                            </button>
                          ))
                        }
                        {globalLehrwerke.filter(g => !assignedLehrwerke.some(a => a.lehrwerkId === g.id)).length === 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '8px', textAlign: 'center', fontStyle: 'italic' }}>
                            Alle Lehrwerke zugewiesen
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {assignedLehrwerke.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', border: '1.5px dashed #e2e8f0', borderRadius: '20px', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                    Noch kein Lehrwerk zugewiesen.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {assignedLehrwerke.map(assigned => {
                      const book = globalLehrwerke.find(g => g.id === assigned.lehrwerkId) || {
                        title: 'Unbekanntes Buch',
                        emoji: '📚',
                        color: '#64748b',
                        totalPages: 50
                      };
                      const isSelected = activeLehrwerkId === assigned.lehrwerkId;
                      const pages = Array.from({ length: book.totalPages || 50 }, (_, i) => i + 1);

                      return (
                        <div key={assigned.lehrwerkId} style={{
                          border: isSelected ? `1.5px solid ${book.color}60` : '1px solid #e2e8f0',
                          borderRadius: '24px',
                          background: 'white',
                          overflow: 'hidden',
                          boxShadow: isSelected ? '0 4px 15px rgba(0,0,0,0.02)' : 'none'
                        }}>
                          {/* Textbook Title Bar */}
                          <div 
                            onClick={() => {
                              setActiveLehrwerkId(assigned.lehrwerkId);
                              setActivePageNumber(null);
                            }}
                            style={{
                              padding: '12px 16px',
                              background: isSelected ? `${book.color}08` : '#f8fafc',
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{
                              width: '30px', height: '38px',
                              background: book.color,
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: 900
                            }}>
                              {book.emoji}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {book.title}
                              </h4>
                              <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                                {book.totalPages} Seiten • {Object.keys(assigned.pageStates || {}).length} bearbeitet
                              </p>
                            </div>
                          </div>

                          {/* Pages Grid */}
                          {isSelected && (
                            <div style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {pages.map(num => {
                                const pageState = assigned.pageStates[num] || { status: 'locked' };
                                const globalPage = book.globalPageStates?.[num] === 'purple';
                                const status = globalPage ? 'purple' : (pageState.status || 'locked');

                                let borderColor = '#ef4444'; // locked = rot
                                let bg = '#fef2f2';
                                let textColor = '#991b1b';

                                if (status === 'homework') {
                                  borderColor = '#f59e0b'; // homework = gelb
                                  bg = '#fffbeb';
                                  textColor = '#92400e';
                                } else if (status === 'mastered') {
                                  borderColor = '#10b981'; // mastered = grün
                                  bg = '#f0fdf4';
                                  textColor = '#166534';
                                } else if (status === 'purple') {
                                  borderColor = '#af52de'; // purple = lila
                                  bg = '#f5f3ff';
                                  textColor = '#6d28d9';
                                }

                                const isPageActive = activePageNumber === num && activeLehrwerkId === assigned.lehrwerkId;

                                return (
                                  <button
                                    key={num}
                                    onClick={() => selectTextbookPage(assigned.lehrwerkId, num)}
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      border: `2px solid ${borderColor}`,
                                      background: isPageActive ? borderColor : bg,
                                      color: isPageActive ? 'white' : textColor,
                                      fontWeight: 900,
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'all 0.15s',
                                      boxShadow: isPageActive ? `0 4px 8px ${borderColor}40` : 'none',
                                      transform: isPageActive ? 'scale(1.08)' : 'none'
                                    }}
                                  >
                                    {num}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: SONGS */}
            {leftTab === 'songs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Laufende Song-Projekte
                </span>
                
                {activeSongSkills.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', border: '1.5px dashed #e2e8f0', borderRadius: '20px', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                    Derzeit keine aktiven Songs eingetragen.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeSongSkills.map(skill => {
                      const isSelected = selectedActiveSongId === skill.id;
                      const progress = skill.is_stage_ready ? 100 : (skill.progress_percent || 0);

                      return (
                        <div
                          key={skill.id}
                          onClick={() => selectActiveSong(skill)}
                          style={{
                            padding: '14px 18px',
                            background: 'white',
                            borderRadius: '20px',
                            border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: isSelected ? '0 4px 15px rgba(79,70,229,0.05)' : 'none'
                          }}
                          className="hover-scale"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: '#1e293b' }}>
                                {skill.songs?.title}
                              </h4>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                {skill.songs?.artist} • <span style={{ color: '#4f46e5' }}>{skill.instrument}</span>
                              </p>
                            </div>
                            
                            <span style={{
                              background: skill.is_stage_ready ? '#d1fae5' : '#f1f5f9',
                              color: skill.is_stage_ready ? '#065f46' : '#475569',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.65rem',
                              fontWeight: 900,
                              textTransform: 'uppercase'
                            }}>
                              {skill.is_stage_ready ? 'Bühnenreif' : `${progress}%`}
                            </span>
                          </div>

                          {/* Small Progress bar */}
                          <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${progress}%`,
                              height: '100%',
                              background: skill.is_stage_ready ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #4f46e5, #3b82f6)',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: HISTORY / MATRIX LOGS */}
            {leftTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Dokumentations-Verlauf
                  </span>
                  <button
                    onClick={handleCreateNew}
                    style={{
                      background: '#e0e7ff',
                      color: '#4f46e5',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    + Neu anlegen
                  </button>
                </div>

                {loading ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    Dokumentation wird geladen...
                  </div>
                ) : progressItems.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Noch kein Fortschritt dokumentiert.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {progressItems.map((item) => {
                      const isEditing = activeItem?.id === item.id;
                      
                      let statusBg = '#f1f5f9';
                      let statusColor = '#475569';
                      let statusText = 'In Arbeit';

                      if (item.status === 'THEORY_DONE') {
                        statusBg = '#f3e8ff';
                        statusColor = '#6b21a8';
                        statusText = 'Theorie';
                      } else if (item.status === 'MASTERED') {
                        statusBg = '#d1fae5';
                        statusColor = '#065f46';
                        statusText = 'Meister';
                      }

                      return (
                        <div
                          key={item.id}
                          onClick={() => selectItemForEditing(item)}
                          style={{
                            padding: '16px',
                            background: 'white',
                            borderRadius: '20px',
                            border: isEditing ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isEditing ? '0 4px 15px rgba(79, 70, 229, 0.08)' : '0 2px 5px rgba(0,0,0,0.01)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          className="hover-scale"
                        >
                          {item.is_current_homework && (
                            <div
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: '4px',
                                background: '#06b6d4',
                                boxShadow: '0 0 10px #06b6d4'
                              }}
                              className="animate-pulse"
                            />
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>
                              {item.topic_name}
                            </span>
                            <span style={{
                              background: statusBg,
                              color: statusColor,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              textTransform: 'uppercase'
                            }}>
                              {statusText}
                            </span>
                          </div>
                          
                          {item.teacher_notes && (
                            <p style={{
                              fontSize: '0.78rem',
                              color: '#64748b',
                              margin: 0,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontWeight: 500
                            }}>
                              {item.teacher_notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Form Editor */}
          <div style={{
            flex: '1.2 1 0%',
            padding: '24px 32px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {activeItem ? 'Dokumentation bearbeiten' : 'Neue Dokumentation'}
            </span>

            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                padding: '12px 16px',
                borderRadius: '16px',
                color: '#991b1b',
                fontSize: '0.8rem',
                fontWeight: 750,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Tab Switcher for free / catalog (Only if not editing a textbook page or active song) */}
              {activeInputTab !== 'lehrwerk_page' && activeInputTab !== 'active_song' && (
                <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', marginBottom: '-4px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveInputTab('free')}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: activeInputTab === 'free' ? 'white' : 'transparent',
                      color: activeInputTab === 'free' ? '#0f172a' : '#64748b',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: activeInputTab === 'free' ? 800 : 600,
                      cursor: 'pointer',
                      boxShadow: activeInputTab === 'free' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    📝 Freies Thema
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInputTab('catalog')}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: activeInputTab === 'catalog' ? 'white' : 'transparent',
                      color: activeInputTab === 'catalog' ? '#0f172a' : '#64748b',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: activeInputTab === 'catalog' ? 800 : 600,
                      cursor: 'pointer',
                      boxShadow: activeInputTab === 'catalog' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    🎵 Song-Katalog
                  </button>
                </div>
              )}

              {/* Topic header if page or song active */}
              {(activeInputTab === 'lehrwerk_page' || activeInputTab === 'active_song') && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{ fontSize: '1.25rem' }}>{activeInputTab === 'lehrwerk_page' ? '📚' : '🎵'}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Auswahl
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {topicName}
                    </div>
                  </div>
                  <button
                    onClick={handleCreateNew}
                    style={{
                      marginLeft: 'auto',
                      border: 'none',
                      background: 'rgba(0,0,0,0.05)',
                      color: '#64748b',
                      width: '24px', height: '24px',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Tab Content: Free text topic input */}
              {activeInputTab === 'free' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>
                    Songtitel / Thema (Freitext)
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. Stand by Me - Strophe"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      border: '1.5px solid #e2e8f0',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                    required={activeInputTab === 'free'}
                  />
                </div>
              )}

              {/* Tab Content: Song Catalog Selector */}
              {activeInputTab === 'catalog' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Search input for songs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>
                      Song aus Katalog suchen & auswählen
                    </label>
                    <input
                      type="text"
                      placeholder="Titel oder Künstler durchsuchen..."
                      value={songSearch}
                      onChange={(e) => setSongSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Songs list */}
                  <div style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '8px',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    {songsLoading ? (
                      <div style={{ padding: '20px', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textAlign: 'center' }}>
                        Lade Songs...
                      </div>
                    ) : songs.length === 0 ? (
                      <div style={{ padding: '20px', fontSize: '0.8rem', color: '#64748b', textAlign: 'center', fontStyle: 'italic' }}>
                        Keine Songs im Katalog gefunden.
                      </div>
                    ) : (() => {
                      const filtered = songs.filter(s => 
                        s.title?.toLowerCase().includes(songSearch.toLowerCase()) || 
                        s.artist?.toLowerCase().includes(songSearch.toLowerCase())
                      );
                      
                      if (filtered.length === 0) {
                        return (
                          <div style={{ padding: '20px', fontSize: '0.8rem', color: '#64748b', textAlign: 'center', fontStyle: 'italic' }}>
                            Keine Übereinstimmung.
                          </div>
                        );
                      }

                      return filtered.map((song) => {
                        const isSelected = selectedSongId === song.id;
                        return (
                          <button
                            key={song.id}
                            type="button"
                            onClick={() => {
                              setSelectedSongId(song.id);
                              // Auto-populate topicName
                              const baseTitle = `${song.artist} - ${song.title}`;
                              const fullTitle = songPart ? `${baseTitle} (${songPart})` : baseTitle;
                              setTopicName(fullTitle);
                            }}
                            style={{
                              textAlign: 'left',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              border: isSelected ? '1.5px solid #4f46e5' : '1px solid transparent',
                              background: isSelected ? '#e0e7ff' : 'white',
                              color: '#0f172a',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.15s'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{song.title}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{song.artist}</div>
                            </div>
                            {isSelected && <span style={{ fontSize: '1rem' }}>✓</span>}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  {/* Suffix / Part selection */}
                  {selectedSongId && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>
                        Songteil / Fokus (optional)
                      </label>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {['Strophe', 'Refrain', 'Intro', 'Solo', 'Ganzes Lied'].map((part) => {
                          const isPartSelected = songPart === part;
                          return (
                            <button
                              key={part}
                              type="button"
                              onClick={() => {
                                const newPart = isPartSelected ? '' : part;
                                setSongPart(newPart);
                                // Update topicName
                                const songObj = songs.find(s => s.id === selectedSongId);
                                if (songObj) {
                                  const baseTitle = `${songObj.artist} - ${songObj.title}`;
                                  const fullTitle = newPart ? `${baseTitle} (${newPart})` : baseTitle;
                                  setTopicName(fullTitle);
                                }
                              }}
                              style={{
                                border: '1px solid #cbd5e1',
                                background: isPartSelected ? '#4f46e5' : 'white',
                                color: isPartSelected ? 'white' : '#475569',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              {part}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status selector grids (3 colors) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>
                  Fortschritts-Status
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {/* IN PROGRESS (Yellow) */}
                  <button
                    type="button"
                    onClick={() => handleStatusChange('IN_PROGRESS')}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '14px',
                      border: status === 'IN_PROGRESS' ? '2.5px solid #eab308' : '1px solid #cbd5e1',
                      background: status === 'IN_PROGRESS' ? '#fef9c3' : 'white',
                      color: status === 'IN_PROGRESS' ? '#854d0e' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                      boxShadow: status === 'IN_PROGRESS' ? '0 4px 12px rgba(234,179,8,0.15)' : 'none'
                    }}
                    className="hover-scale"
                  >
                    <span style={{ fontSize: '1.25rem' }}>🟡</span>
                    <span>In Arbeit</span>
                  </button>

                  {/* THEORY DONE (Purple) */}
                  <button
                    type="button"
                    onClick={() => handleStatusChange('THEORY_DONE')}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '14px',
                      border: status === 'THEORY_DONE' ? '2.5px solid #a855f7' : '1px solid #cbd5e1',
                      background: status === 'THEORY_DONE' ? '#f3e8ff' : 'white',
                      color: status === 'THEORY_DONE' ? '#6b21a8' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                      boxShadow: status === 'THEORY_DONE' ? '0 4px 12px rgba(168,85,247,0.15)' : 'none'
                    }}
                    className="hover-scale"
                  >
                    <span style={{ fontSize: '1.25rem' }}>🟣</span>
                    <span>Theorie</span>
                  </button>

                  {/* MASTERED (Green) */}
                  <button
                    type="button"
                    onClick={() => handleStatusChange('MASTERED')}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '14px',
                      border: status === 'MASTERED' ? '2.5px solid #10b981' : '1px solid #cbd5e1',
                      background: status === 'MASTERED' ? '#d1fae5' : 'white',
                      color: status === 'MASTERED' ? '#065f46' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                      boxShadow: status === 'MASTERED' ? '0 4px 12px rgba(16,185,129,0.15)' : 'none'
                    }}
                    className="hover-scale"
                  >
                    <span style={{ fontSize: '1.25rem' }}>💚</span>
                    <span>Meisterwerk!</span>
                  </button>
                </div>
              </div>

              {/* Homework toggle */}
              <div style={{
                background: '#fafbfd',
                padding: '16px',
                borderRadius: '20px',
                border: isCurrentHomework ? '2px solid #06b6d4' : '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s',
                boxShadow: isCurrentHomework ? '0 0 15px rgba(6, 182, 212, 0.15)' : 'none'
              }} className={isCurrentHomework ? 'animate-pulse' : ''}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                    Hausaufgabe festlegen
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                    Cyan-pulsierender Rahmen beim Schüler
                  </span>
                </div>
                <label style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '46px',
                  height: '24px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={isCurrentHomework}
                    onChange={(e) => setIsCurrentHomework(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    inset: 0,
                    backgroundColor: isCurrentHomework ? '#06b6d4' : '#cbd5e1',
                    transition: '.3s',
                    borderRadius: '24px'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: isCurrentHomework ? '24px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '.3s',
                      borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* Daily Briefing textarea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>
                  Tägliche Notizen (Lehrer-Notiz)
                </label>
                <textarea
                  placeholder="z.B. Akkordwechsel flüssig, Tempo auf 80 BPM steigern."
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  style={{
                    width: '100%',
                    height: '100px',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* EHEMALIGE NOTIZEN LOOKUP */}
              {formerNotes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📜 Bisherige Notizen & Verlauf
                  </label>
                  <div style={{
                    maxHeight: '130px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    paddingRight: '4px'
                  }}>
                    {formerNotes.map((note, index) => {
                      let statusText = 'Arbeit';
                      let statusColor = '#eab308';
                      if (note.status === 'THEORY_DONE') {
                        statusText = 'Theorie';
                        statusColor = '#a855f7';
                      } else if (note.status === 'MASTERED') {
                        statusText = 'Meister';
                        statusColor = '#10b981';
                      }

                      return (
                        <div key={index} style={{
                          padding: '10px 14px',
                          background: '#f8fafc',
                          borderRadius: '12px',
                          border: '1px solid #f1f5f9',
                          fontSize: '0.8rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                            <span>
                              {new Date(note.updated_at || '').toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span style={{ color: statusColor, fontWeight: 900, textTransform: 'uppercase' }}>
                              {statusText} {note.is_current_homework && '• 🏠 HW'}
                            </span>
                          </div>
                          <div style={{ color: '#334155', fontWeight: 500, fontStyle: 'italic', wordBreak: 'break-word' }}>
                            "{note.teacher_notes || 'Keine Notiz'}"
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                {(activeItem || activePageNumber !== null || selectedActiveSongId) && (
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '14px',
                      border: '1.5px solid #cbd5e1',
                      background: 'white',
                      color: '#475569',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Abbrechen
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 2,
                    padding: '14px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                    color: 'white',
                    fontWeight: 900,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    boxShadow: '0 4px 15px rgba(79, 70, 229, 0.2)'
                  }}
                >
                  {saving ? 'Wird gespeichert...' : 'Eintrag speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
