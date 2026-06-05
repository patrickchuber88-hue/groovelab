import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Trash2, Music, UserPlus, Info, CheckCircle, Disc, ArrowLeft, MessageSquare, Send, Calendar, CheckSquare, Search, Edit2, Check, Sparkles } from 'lucide-react';
import { normalizeInstrument, renderInstrumentIcon } from '../utils/instruments';

interface EnsembleDashboardProps {
  user: any;
  schoolId: string;
  supabase: any;
}

export function EnsembleDashboard({ user, schoolId, supabase }: EnsembleDashboardProps) {
  const { width } = useWindowSize();
  const [ensembles, setEnsembles] = useState<any[]>([]);
  const [schoolStudents, setSchoolStudents] = useState<any[]>([]);
  const [schoolSongs, setSchoolSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Ensemble View State
  const [selectedEnsembleId, setSelectedEnsembleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'messages' | 'repertoire'>('members');

  // Keyboard Smart Input Schnellzuweisung
  const [smartSearchText, setSmartSearchText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const smartInputRef = useRef<HTMLInputElement>(null);

  // Inline Editing for Member Instruments
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingInstrumentValue, setEditingInstrumentValue] = useState('');

  // Chat/Messages State
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'band' | 'ensemble'>('band');
  const [firstStudentId, setFirstStudentId] = useState('');
  const [firstInstrument, setFirstInstrument] = useState('');

  // Assignment states for manual add form
  const [addingMemberTo, setAddingMemberTo] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedInstrument, setSelectedInstrument] = useState('');

  const [addingSongTo, setAddingSongTo] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState('');
  const [songNotes, setSongNotes] = useState('');

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  useEffect(() => {
    if (selectedEnsembleId && activeTab === 'messages') {
      fetchMessages(selectedEnsembleId);
    }
  }, [selectedEnsembleId, activeTab]);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // 1. Fetch Ensembles
      let ensemblesQuery = supabase.from('ensembles').select('*').eq('school_id', schoolId);
      
      const { data: ensembleData, error: ensembleErr } = await ensemblesQuery;
      if (ensembleErr) throw ensembleErr;

      const ensemblesList = ensembleData || [];

      // 2. Fetch Members and Songs for each ensemble
      const fullEnsembles = await Promise.all(
        ensemblesList.map(async (ens: any) => {
          // Fetch members (with user profiles)
          const { data: members, error: memErr } = await supabase
            .from('ensemble_members')
            .select('*, profiles:users(*)')
            .eq('ensemble_id', ens.id);
          
          // Fetch songs
          const { data: songs, error: songErr } = await supabase
            .from('ensemble_songs')
            .select('*, songs(*)')
            .eq('ensemble_id', ens.id);

          return {
            ...ens,
            members: members || [],
            songs: songs || []
          };
        })
      );

      // Filter for students: they only see ensembles they are members of
      if (!isTeacher) {
        const studentEnsembles = fullEnsembles.filter((ens: any) =>
          ens.members.some((m: any) => m.student_id === user.id)
        );
        setEnsembles(studentEnsembles);
      } else {
        setEnsembles(fullEnsembles);
      }

      // If teacher/admin, fetch pool of students and songs for assignments
      if (isTeacher) {
        const { data: students, error: studErr } = await supabase
          .from('users')
          .select('*')
          .eq('school_id', schoolId)
          .eq('role', 'student')
          .order('first_name');
        
        const { data: songs, error: songsErr } = await supabase
          .from('songs')
          .select('*')
          .eq('school_id', schoolId)
          .order('title');

        if (!studErr) setSchoolStudents(students || []);
        if (!songsErr) setSchoolSongs(songs || []);
      }
    } catch (err) {
      console.error('[EnsembleDashboard] Error loading data:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchMessages = async (ensembleId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('ensemble_messages')
        .select('*, profiles:users(*)')
        .eq('ensemble_id', ensembleId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateEnsemble = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      // 1. Create Ensemble
      const { data, error } = await supabase
        .from('ensembles')
        .insert({
          name: newName.trim(),
          school_id: schoolId,
          type: newType
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Add first member if selected (Schnellzuweisung)
      if (firstStudentId && firstInstrument.trim()) {
        const { error: memberErr } = await supabase
          .from('ensemble_members')
          .insert({
            ensemble_id: data.id,
            student_id: firstStudentId,
            instrument: firstInstrument.trim()
          });
        if (memberErr) throw memberErr;
      }

      setShowCreateModal(false);
      setNewName('');
      setFirstStudentId('');
      setFirstInstrument('');
      fetchData();
    } catch (err: any) {
      alert('Fehler beim Erstellen: ' + err.message);
    }
  };

  const handleDeleteEnsemble = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Möchtest du dieses Ensemble wirklich löschen?')) return;

    try {
      const { error } = await supabase.from('ensembles').delete().eq('id', id);
      if (error) throw error;
      if (selectedEnsembleId === id) setSelectedEnsembleId(null);
      fetchData();
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  const handleAddMember = async (ensembleId: string) => {
    if (!selectedStudentId || !selectedInstrument.trim()) return;

    try {
      const { error } = await supabase
        .from('ensemble_members')
        .insert({
          ensemble_id: ensembleId,
          student_id: selectedStudentId,
          instrument: selectedInstrument.trim()
        });

      if (error) throw error;

      setAddingMemberTo(null);
      setSelectedStudentId('');
      setSelectedInstrument('');
      fetchData(true); // Silent reload
    } catch (err: any) {
      alert('Fehler beim Hinzufügen des Mitglieds: ' + err.message);
    }
  };

  const handleQuickAssign = async (studentId: string, defaultInst: string) => {
    if (!selectedEnsembleId) return;
    const inst = defaultInst ? defaultInst.split(',')[0].trim() : 'Instrument';
    
    try {
      const { error } = await supabase
        .from('ensemble_members')
        .insert({
          ensemble_id: selectedEnsembleId,
          student_id: studentId,
          instrument: inst
        });

      if (error) throw error;
      
      // Silent reload so the DOM is never unmounted, preserving focus
      await fetchData(true);
      
      // Guarantee focus is restored instantly
      smartInputRef.current?.focus();
    } catch (err: any) {
      alert('Fehler bei der Schnellzuweisung: ' + err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Mitglied wirklich entfernen?')) return;

    try {
      const { error } = await supabase.from('ensemble_members').delete().eq('id', memberId);
      if (error) throw error;
      fetchData(true); // Silent reload
    } catch (err: any) {
      alert('Fehler beim Entfernen des Mitglieds: ' + err.message);
    }
  };

  const handleUpdateMemberInstrument = async (memberId: string) => {
    if (!editingInstrumentValue.trim()) return;
    try {
      const { error } = await supabase
        .from('ensemble_members')
        .update({ instrument: editingInstrumentValue.trim() })
        .eq('id', memberId);

      if (error) throw error;
      setEditingMemberId(null);
      fetchData(true); // Silent reload
    } catch (err: any) {
      alert('Fehler beim Ändern des Instruments: ' + err.message);
    }
  };

  const handleAddSong = async (ensembleId: string) => {
    if (!selectedSongId) return;

    try {
      const { error } = await supabase
        .from('ensemble_songs')
        .insert({
          ensemble_id: ensembleId,
          song_id: selectedSongId,
          status: 'aktiv',
          notes: songNotes.trim()
        });

      if (error) throw error;

      setAddingSongTo(null);
      setSelectedSongId('');
      setSongNotes('');
      fetchData(true); // Silent reload
    } catch (err: any) {
      alert('Fehler beim Hinzufügen des Songs: ' + err.message);
    }
  };

  const handleRemoveSong = async (ensembleSongId: string) => {
    if (!window.confirm('Song wirklich entfernen?')) return;

    try {
      const { error } = await supabase.from('ensemble_songs').delete().eq('id', ensembleSongId);
      if (error) throw error;
      fetchData(true); // Silent reload
    } catch (err: any) {
      alert('Fehler beim Entfernen des Songs: ' + err.message);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedEnsembleId) return;

    try {
      const { error } = await supabase
        .from('ensemble_messages')
        .insert({
          ensemble_id: selectedEnsembleId,
          user_id: user.id,
          message: newMessageText.trim()
        });

      if (error) throw error;
      setNewMessageText('');
      fetchMessages(selectedEnsembleId);
    } catch (err: any) {
      alert('Fehler beim Senden: ' + err.message);
    }
  };

  const handleStudentSelectChange = (studentId: string) => {
    setSelectedStudentId(studentId);
    const selected = schoolStudents.find(s => s.id === studentId);
    if (selected && selected.instrument) {
      setSelectedInstrument(selected.instrument.split(',')[0].trim());
    } else {
      setSelectedInstrument('');
    }
  };

  const handleFirstStudentSelectChange = (studentId: string) => {
    setFirstStudentId(studentId);
    const selected = schoolStudents.find(s => s.id === studentId);
    if (selected && selected.instrument) {
      setFirstInstrument(selected.instrument.split(',')[0].trim());
    } else {
      setFirstInstrument('');
    }
  };

  // Keyboard Smart Input Handlers
  const handleSmartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSmartSearchText(val);
    setHighlightedIndex(0);
    setIsDropdownOpen(val.trim().length > 0);
  };

  const handleSmartKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || smartFilteredStudents.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % smartFilteredStudents.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + smartFilteredStudents.length) % smartFilteredStudents.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetStudent = smartFilteredStudents[highlightedIndex];
      if (targetStudent) {
        setSmartSearchText('');
        setIsDropdownOpen(false);
        setHighlightedIndex(0);
        await handleQuickAssign(targetStudent.id, targetStudent.instrument);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', animation: 'spin 1s linear infinite' }} className="animate-spin" />
        <span style={{ fontWeight: 800, color: '#64748b' }}>Wird geladen...</span>
      </div>
    );
  }

  // Filter students based on teacher role (teachers only manage/assign their own students)
  const assignableStudents = schoolStudents.filter(
    (s: any) => user?.role !== 'teacher' || s.teacher_id === user.id
  );

  const selectedEnsemble = ensembles.find(ens => ens.id === selectedEnsembleId);

  // Filter candidates for the Smart keyboard text input
  const smartFilteredStudents = assignableStudents.filter(
    s => selectedEnsemble && !selectedEnsemble.members.some((m: any) => m.student_id === s.id)
  ).filter(
    s => {
      const fullName = `${s.first_name} ${s.last_name || ''}`.toLowerCase();
      return fullName.includes(smartSearchText.toLowerCase());
    }
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      
      {/* CSS Styles for Interactive Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        .member-instrument-badge {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .member-instrument-badge:hover {
          background: #eff6ff !important;
          color: #2563eb !important;
          border-color: #bfdbfe !important;
        }
        .smart-dropdown-item {
          padding: 10px 14px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.88rem;
          transition: background 0.15s ease;
        }
        .smart-dropdown-item:hover {
          background: #f1f5f9;
        }
      `}} />

      {/* Header and CTA */}
      {!selectedEnsembleId ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 950, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ display: 'inline-flex', padding: '10px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  <Users size={32} />
                </span>
                Ensembles & Bands
              </h1>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontWeight: 600 }}>
                {isTeacher ? 'Verwalte Ensembles, Bands, deren Mitglieder und Repertoire.' : 'Deine Ensembles, Bandmitglieder und Repertoire.'}
              </p>
            </div>

            {isTeacher && (
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: '16px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(59, 130, 246, 0.25)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                <Plus size={20} /> Ensemble / Band gründen
              </button>
            )}
          </div>

          {/* Ensembles List */}
          {ensembles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 32px', background: 'white', borderRadius: '32px', border: '2px dashed #e2e8f0', marginTop: '16px' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '24px' }}>👥</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0' }}>Keine Ensembles vorhanden</h3>
              <p style={{ color: '#64748b', margin: 0 }}>
                {isTeacher ? 'Erstelle dein erstes Ensemble oder eine neue Band mit dem Button oben.' : 'Du bist aktuell in keinem Ensemble eingetragen.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
              {ensembles.map((ens) => (
                <div
                  key={ens.id}
                  onClick={() => {
                    setSelectedEnsembleId(ens.id);
                    setActiveTab('members');
                  }}
                  style={{
                    background: 'white',
                    borderRadius: '24px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
                    padding: '28px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  className="hover-scale"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: ens.type === 'band' ? '#eff6ff' : '#faf5ff',
                        color: ens.type === 'band' ? '#3b82f6' : '#a855f7',
                        border: `1px solid ${ens.type === 'band' ? '#dbeafe' : '#f3e8ff'}`
                      }}>
                        {ens.type === 'band' ? '🎸 Band' : '🎻 Ensemble'}
                      </span>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1e293b', margin: '10px 0 4px 0' }}>{ens.name}</h2>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                        {ens.members.length} {ens.members.length === 1 ? 'Mitglied' : 'Mitglieder'} • {ens.songs.length} Repertoire
                      </span>
                    </div>

                    {isTeacher && (
                      <button
                        onClick={(e) => handleDeleteEnsemble(ens.id, e)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.05)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.1)',
                          padding: '8px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', height: '32px' }}>
                    {ens.members.slice(0, 5).map((m: any, idx: number) => (
                      <div 
                        key={m.id} 
                        title={`${m.profiles?.first_name || 'Mitglied'} (${m.instrument})`}
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '10px', 
                          background: '#cbd5e1', 
                          border: '2px solid white', 
                          boxShadow: '0 2px 6px rgba(0,0,0,0.05)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          marginLeft: idx > 0 ? '-10px' : '0',
                          zIndex: 5 - idx
                        }}
                      >
                        {m.profiles?.photo_url ? (
                          <img src={m.profiles.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} alt="" />
                        ) : (
                          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#475569' }}>{m.profiles?.first_name?.[0] || 'S'}</span>
                        )}
                      </div>
                    ))}
                    {ens.members.length > 5 && (
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', marginLeft: '6px' }}>+{ens.members.length - 5}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Workspace Detail View for Selected Ensemble */
        <div>
          {/* Back button and title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <button 
              onClick={() => setSelectedEnsembleId(null)}
              style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b'
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  background: selectedEnsemble?.type === 'band' ? '#eff6ff' : '#faf5ff',
                  color: selectedEnsemble?.type === 'band' ? '#3b82f6' : '#a855f7',
                  border: `1px solid ${selectedEnsemble?.type === 'band' ? '#dbeafe' : '#f3e8ff'}`
                }}>
                  {selectedEnsemble?.type === 'band' ? '🎸 Band' : '🎻 Ensemble'}
                </span>
              </div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 950, color: '#1e293b', margin: '4px 0 0 0' }}>{selectedEnsemble?.name}</h1>
            </div>
          </div>

          {/* Premium Tab Selection */}
          <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '16px', marginBottom: '28px', maxWidth: '480px' }}>
            <button
              onClick={() => setActiveTab('members')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'members' ? 'white' : 'transparent',
                color: activeTab === 'members' ? '#1e293b' : '#64748b',
                fontWeight: 800,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: activeTab === 'members' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <Users size={16} /> Besetzung
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'messages' ? 'white' : 'transparent',
                color: activeTab === 'messages' ? '#1e293b' : '#64748b',
                fontWeight: 800,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: activeTab === 'messages' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <MessageSquare size={16} /> Nachrichten
            </button>
            <button
              onClick={() => setActiveTab('repertoire')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'repertoire' ? 'white' : 'transparent',
                color: activeTab === 'repertoire' ? '#1e293b' : '#64748b',
                fontWeight: 800,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: activeTab === 'repertoire' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <Music size={16} /> Repertoire
            </button>
          </div>

          {/* TAB 1: MEMBERS */}
          {activeTab === 'members' && selectedEnsemble && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Apple Spotlight-Style Prominent Schnellzuweisung */}
              {isTeacher && (
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.8)', 
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(226, 232, 240, 0.8)', 
                  borderRadius: '24px', 
                  padding: '32px', 
                  boxShadow: '0 20px 40px rgba(15, 23, 42, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Sparkles size={20} color="#3b82f6" className="animate-pulse" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Smarte Schnellzuweisung
                    </span>
                  </div>
                  
                  <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      background: '#3b82f6', 
                      padding: '16px 24px', 
                      borderRadius: '20px', 
                      boxShadow: '0 10px 25px rgba(59, 130, 246, 0.25)',
                      transition: 'all 0.2s ease-in-out'
                    }}>
                      <Search size={22} color="white" />
                      <input 
                        ref={smartInputRef}
                        type="text" 
                        placeholder="Schüler schnell per Eingabe zuweisen (z. B. Patrick... + Enter)" 
                        value={smartSearchText}
                        onChange={handleSmartInputChange}
                        onKeyDown={handleSmartKeyDown}
                        style={{ 
                          border: 'none', 
                          background: 'transparent', 
                          outline: 'none', 
                          fontSize: '1.1rem', 
                          fontWeight: 750, 
                          color: 'white', 
                          width: '100%' 
                        }}
                      />
                    </div>

                    {/* Autocomplete Dropdown List */}
                    {isDropdownOpen && smartFilteredStudents.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '20px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
                        zIndex: 9999,
                        maxHeight: '260px',
                        overflowY: 'auto',
                        padding: '8px 0'
                      }}>
                        {smartFilteredStudents.map((student, idx) => (
                          <div
                            key={student.id}
                            className="smart-dropdown-item"
                            onClick={() => {
                              handleQuickAssign(student.id, student.instrument);
                              setSmartSearchText('');
                              setIsDropdownOpen(false);
                              setHighlightedIndex(0);
                              smartInputRef.current?.focus();
                            }}
                            style={{
                              padding: '14px 20px',
                              background: highlightedIndex === idx ? '#3b82f6' : 'transparent',
                              color: highlightedIndex === idx ? 'white' : '#1e293b',
                              fontWeight: 750,
                              fontSize: '0.95rem',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <span>{student.first_name} {student.last_name || ''}</span>
                            <span style={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 800, 
                              color: highlightedIndex === idx ? 'white' : '#3b82f6',
                              background: highlightedIndex === idx ? 'rgba(255,255,255,0.2)' : 'rgba(59, 130, 246, 0.08)',
                              padding: '4px 10px',
                              borderRadius: '8px'
                            }}>
                              {student.instrument ? student.instrument.split(',')[0].trim() : 'Instrument'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Members Grid view */}
              <div style={{ background: 'white', borderRadius: '24px', padding: '32px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Mitglieder & Besetzung</h3>
                  {isTeacher && (
                    <button
                      onClick={() => setAddingMemberTo(addingMemberTo === selectedEnsemble.id ? null : selectedEnsemble.id)}
                      style={{
                        background: 'rgba(59, 130, 246, 0.08)',
                        color: '#3b82f6',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <UserPlus size={16} /> Manuell hinzufügen
                    </button>
                  )}
                </div>

                {/* Add Member inline form */}
                {addingMemberTo === selectedEnsemble.id && (
                  <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#334155' }}>
                      Schüler manuell zuweisen
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Schüler</label>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => handleStudentSelectChange(e.target.value)}
                        style={{ padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 600 }}
                      >
                        <option value="">-- Schüler wählen --</option>
                        {assignableStudents
                          .filter(s => !selectedEnsemble.members.some((m: any) => m.student_id === s.id))
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.first_name} {s.last_name || ''} ({s.instrument || 'Kein Hauptinstrument'})</option>
                          ))
                        }
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Instrument / Rolle (auto-filled)</label>
                      <input
                        type="text"
                        value={selectedInstrument}
                        onChange={(e) => setSelectedInstrument(e.target.value)}
                        placeholder="z.B. E-Gitarre, Gesang, Schlagzeug..."
                        style={{ padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 600 }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                      <button
                        onClick={() => setAddingMemberTo(null)}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'transparent', color: '#64748b', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={() => handleAddMember(selectedEnsemble.id)}
                        disabled={!selectedStudentId || !selectedInstrument.trim()}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 800, cursor: 'pointer', opacity: (!selectedStudentId || !selectedInstrument.trim()) ? 0.5 : 1 }}
                      >
                        Zuweisen
                      </button>
                    </div>
                  </div>
                )}

                {selectedEnsemble.members.length === 0 ? (
                  <div style={{ background: '#f8fafc', padding: '32px', borderRadius: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.95rem', border: '1px dashed #cbd5e1' }}>
                    Keine Mitglieder zugewiesen. Verwende das Schnellzuweisungs-Panel oben!
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {selectedEnsemble.members.map((mem: any) => {
                      const prof = mem.profiles || {};
                      const isEditing = editingMemberId === mem.id;
                      return (
                        <div
                          key={mem.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#f8fafc',
                            padding: '16px 20px',
                            borderRadius: '20px',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '14px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {prof.photo_url ? (
                                <img src={prof.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                              ) : (
                                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#475569' }}>{prof.first_name?.[0] || 'S'}</span>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prof.first_name} {prof.last_name || ''}</div>
                              
                              {/* Edit instrument role inline */}
                              {isEditing ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                  <input
                                    type="text"
                                    value={editingInstrumentValue}
                                    onChange={(e) => setEditingInstrumentValue(e.target.value)}
                                    style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 600, width: '110px' }}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleUpdateMemberInstrument(mem.id);
                                      if (e.key === 'Escape') setEditingMemberId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleUpdateMemberInstrument(mem.id)}
                                    style={{ border: 'none', background: '#3b82f6', color: 'white', borderRadius: '6px', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <Check size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  className="member-instrument-badge"
                                  onClick={() => {
                                    if (isTeacher) {
                                      setEditingMemberId(mem.id);
                                      setEditingInstrumentValue(mem.instrument);
                                    }
                                  }}
                                  style={{ 
                                    fontSize: '0.8rem', 
                                    color: '#3b82f6', 
                                    fontWeight: 800, 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    marginTop: '2px',
                                    padding: '2px 8px',
                                    borderRadius: '8px',
                                    border: '1px solid transparent',
                                    marginLeft: '-6px'
                                  }}
                                  title={isTeacher ? 'Tippen zum Bearbeiten' : ''}
                                >
                                  <span style={{ display: 'inline-flex' }}>{renderInstrumentIcon(mem.instrument, '#3b82f6', 14)}</span>
                                  <span>{mem.instrument}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {isTeacher && (
                            <button
                              onClick={() => handleRemoveMember(mem.id)}
                              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '6px', transition: 'color 0.2s', flexShrink: 0 }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MESSAGES & CHAT */}
          {activeTab === 'messages' && selectedEnsemble && (
            <div style={{ background: 'white', borderRadius: '24px', padding: '32px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', height: '550px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: '0 0 20px 0' }}>Nachrichtenboard ({selectedEnsemble.name})</h3>
              
              {/* Message scroll container */}
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {loadingMessages ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b', fontWeight: 700 }}>
                    Lade Nachrichten...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8', gap: '8px' }}>
                    <span style={{ fontSize: '2.5rem' }}>💬</span>
                    <span style={{ fontWeight: 800 }}>Bisher keine Nachrichten.</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Schreibe die erste Nachricht an die gesamte Band!</span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const prof = msg.profiles || {};
                    const isOwnMsg = msg.user_id === user.id;
                    return (
                      <div 
                        key={msg.id} 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          alignItems: isOwnMsg ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          alignSelf: isOwnMsg ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
                          <span>{prof.first_name} {prof.last_name || ''}</span>
                          <span>•</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div 
                          style={{ 
                            background: isOwnMsg ? '#3b82f6' : '#f1f5f9',
                            color: isOwnMsg ? 'white' : '#1e293b',
                            padding: '12px 18px',
                            borderRadius: '18px',
                            borderTopRightRadius: isOwnMsg ? '4px' : '18px',
                            borderTopLeftRadius: isOwnMsg ? '18px' : '4px',
                            fontWeight: 600,
                            lineHeight: 1.4,
                            wordBreak: 'break-word',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                          }}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Nachricht an alle Band-Mitglieder senden..."
                  style={{ flex: 1, padding: '14px 18px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 600 }}
                  required
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim()}
                  style={{ 
                    background: '#3b82f6', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '14px', 
                    padding: '0 20px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    opacity: !newMessageText.trim() ? 0.5 : 1,
                    transition: 'opacity 0.2s'
                  }}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: REPERTOIRE */}
          {activeTab === 'repertoire' && selectedEnsemble && (
            <div style={{ background: 'white', borderRadius: '24px', padding: '32px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Band Repertoire & Songs</h3>
                {isTeacher && (
                  <button
                    onClick={() => setAddingSongTo(addingSongTo === selectedEnsemble.id ? null : selectedEnsemble.id)}
                    style={{
                      background: 'rgba(59, 130, 246, 0.08)',
                      color: '#3b82f6',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Plus size={16} /> Song hinzufügen
                  </button>
                )}
              </div>

              {/* Add Song Form inline */}
              {addingSongTo === selectedEnsemble.id && (
                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#334155' }}>Repertoire Song hinzufügen</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Song</label>
                    <select
                      value={selectedSongId}
                      onChange={(e) => setSelectedSongId(e.target.value)}
                      style={{ padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 600 }}
                    >
                      <option value="">-- Song wählen --</option>
                      {schoolSongs
                        .filter(song => !selectedEnsemble.songs.some((s: any) => s.song_id === song.id))
                        .map(song => (
                          <option key={song.id} value={song.id}>{song.title} - {song.artist}</option>
                        ))
                      }
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Übe-Notiz / Tempo (Metronom BPM)</label>
                    <input
                      type="text"
                      value={songNotes}
                      onChange={(e) => setSongNotes(e.target.value)}
                      placeholder="z.B. Intro & Strophe proben, Tempo 120..."
                      style={{ padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 600 }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <button
                      onClick={() => setAddingSongTo(null)}
                      style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'transparent', color: '#64748b', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={() => handleAddSong(selectedEnsemble.id)}
                      disabled={!selectedSongId}
                      style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 800, cursor: 'pointer', opacity: !selectedSongId ? 0.5 : 1 }}
                    >
                      Hinzufügen
                    </button>
                  </div>
                </div>
              )}

              {selectedEnsemble.songs.length === 0 ? (
                <div style={{ background: '#f8fafc', padding: '32px', borderRadius: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.95rem', border: '1px dashed #cbd5e1' }}>
                  Keine Songs im Repertoire.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedEnsemble.songs.map((ensSong: any) => {
                    const s = ensSong.songs || {};
                    return (
                      <div
                        key={ensSong.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#f8fafc',
                          padding: '16px 20px',
                          borderRadius: '20px',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Disc size={22} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{s.artist}</div>
                            {ensSong.notes && (
                              <div style={{ fontSize: '0.78rem', color: '#0284c7', background: 'rgba(14, 165, 233, 0.05)', padding: '5px 10px', borderRadius: '8px', marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                                <Info size={14} /> {ensSong.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          {isTeacher && (
                            <button
                              onClick={() => handleRemoveSong(ensSong.id)}
                              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '6px', transition: 'color 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Creation Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <form onSubmit={handleCreateEnsemble} className="glass-panel" style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '480px', boxSizing: 'border-box', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', margin: '0 0 24px 0' }}>Neues Projekt gründen</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="z.B. Rock Band 1, Big Band..."
                required
                style={{ padding: '14px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600, width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Typ</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setNewType('band')}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '14px',
                    border: '2px solid',
                    borderColor: newType === 'band' ? '#3b82f6' : '#e2e8f0',
                    background: newType === 'band' ? 'rgba(59, 130, 246, 0.05)' : 'white',
                    color: newType === 'band' ? '#3b82f6' : '#64748b',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  🎸 Band
                </button>
                <button
                  type="button"
                  onClick={() => setNewType('ensemble')}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '14px',
                    border: '2px solid',
                    borderColor: newType === 'ensemble' ? '#3b82f6' : '#e2e8f0',
                    background: newType === 'ensemble' ? 'rgba(59, 130, 246, 0.05)' : 'white',
                    color: newType === 'ensemble' ? '#3b82f6' : '#64748b',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  🎻 Ensemble
                </button>
              </div>
            </div>

            {/* Quick assignment (Schnellzuweisung) inside creation modal */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  👥 Erstes Mitglied zuweisen
                </span>
                {user?.role === 'teacher' && (
                  <span style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 800 }}>Erforderlich (Eigene Schüler)</span>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Schüler auswählen</label>
                  <select
                    value={firstStudentId}
                    onChange={(e) => handleFirstStudentSelectChange(e.target.value)}
                    required={user?.role === 'teacher'}
                    style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600 }}
                  >
                    <option value="">-- Schüler wählen --</option>
                    {assignableStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.first_name} {s.last_name || ''} ({s.instrument || 'Kein Hauptinstrument'})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Instrument / Rolle (auto-filled)</label>
                  <input
                    type="text"
                    value={firstInstrument}
                    onChange={(e) => setFirstInstrument(e.target.value)}
                    required={!!firstStudentId || user?.role === 'teacher'}
                    placeholder="z.B. E-Gitarre, Schlagzeug..."
                    style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600 }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setFirstStudentId('');
                  setFirstInstrument('');
                }}
                style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontWeight: 800, cursor: 'pointer' }}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 800, cursor: 'pointer' }}
              >
                Gründen
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

// Simple window size hook for responsive designs
function useWindowSize() {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
