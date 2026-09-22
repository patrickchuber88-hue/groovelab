import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export interface UseAdminSongsParams {
  admin: any;
  userId: string;
  activePlatform: string;
  songs: any[];
  setSongs: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useAdminSongs({
  admin,
  userId,
  activePlatform,
  songs,
  setSongs
}: UseAdminSongsParams) {
  const [lehrwerke, setLehrwerke] = useState<any[]>([]);
  const [songSearch, setSongSearch] = useState('');
  const [mediathekTab, setMediathekTab] = useState<'songs' | 'lehrwerke' | 'schnelltext'>('songs');
  const [bulkModeSongs, setBulkModeSongs] = useState(false);
  const [bulkTextSongs, setBulkTextSongs] = useState('');
  const [bulkModeLehrwerke, setBulkModeLehrwerke] = useState(false);
  const [bulkTextLehrwerke, setBulkTextLehrwerke] = useState('');
  const [showAddSong, setShowAddSong] = useState(false);
  const [showAddLehrwerk, setShowAddLehrwerk] = useState(false);
  const [editingSong, setEditingSong] = useState<any | null>(null);
  const [editingLehrwerk, setEditingLehrwerk] = useState<any | null>(null);
  const [newSong, setNewSong] = useState<any>({ 
    artist: '', 
    title: '', 
    level: 1, 
    media_link: '', 
    tomplay_url: '', 
    pdf_folder_url: '', 
    guitar_pro_url: '', 
    pdf_drums_url: '', 
    pdf_guitar_url: '', 
    pdf_bass_url: '', 
    pdf_vocals_url: '', 
    pdf_keys_url: '', 
    playalong_url: '', 
    bypass_wlan_check: false, 
    instrumentation: { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 } 
  });
  const [newLehrwerk, setNewLehrwerk] = useState<any>({
    title: '',
    author: '',
    instrument: '',
    category: 'Instrumental',
    level: 1,
    cover_url: ''
  });
  const [selectedSongForDetail, setSelectedSongForDetail] = useState<any | null>(null);
  const [selectedLehrwerkForDetail, setSelectedLehrwerkForDetail] = useState<any | null>(null);
  const [selectedStudentForProgress, setSelectedStudentForProgress] = useState<any | null>(null);
  const [textbausteine, setTextbausteine] = useState<any[]>([]);
  const [previewingTextbaustein, setPreviewingTextbaustein] = useState<any | null>(null);
  const [copiedTbId, setCopiedTbId] = useState<string | null>(null);
  const [newHomeworkNoteText, setNewHomeworkNoteText] = useState('');
  const [songLessonNotes, setSongLessonNotes] = useState('');
  const [showTextbausteinModal, setShowTextbausteinModal] = useState(false);
  const [showTeacherToolsModal, setShowTeacherToolsModal] = useState(false);

  // Touch handlers for swipe in mediathek
  const touchStartXRef = useRef<number | null>(null);
  const handleMediathekTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };
  const handleMediathekTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartXRef.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0) {
        // Swipe left
        if (mediathekTab === 'songs') setMediathekTab('lehrwerke');
        else if (mediathekTab === 'lehrwerke') setMediathekTab('schnelltext');
      } else {
        // Swipe right
        if (mediathekTab === 'schnelltext') setMediathekTab('lehrwerke');
        else if (mediathekTab === 'lehrwerke') setMediathekTab('songs');
      }
    }
    touchStartXRef.current = null;
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedSchoolId = admin?.school_id || (admin?.schools as any)?.id;
    if (!resolvedSchoolId) {
      alert('Schul-ID nicht gefunden.');
      return;
    }

    const resolvedTeacherId = (admin?.role === 'teacher' ? admin?.id : null) || userId || admin?.id;
    const isCampus = (activePlatform === 'campus');

    if (bulkModeSongs) {
      const lines = bulkTextSongs.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const insertPayloads = lines.map(line => {
        let artist = 'Unbekannt';
        let title = line;
        if (line.includes(' - ')) {
          const parts = line.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }
        return {
          school_id: resolvedSchoolId, 
          artist, 
          title, 
          level: 1, 
          media_link: '',
          tomplay_url: '',
          pdf_folder_url: '',
          guitar_pro_url: '',
          pdf_drums_url: '',
          pdf_guitar_url: '',
          pdf_bass_url: '',
          pdf_vocals_url: '',
          pdf_keys_url: '',
          playalong_url: '',
          bypass_wlan_check: false,
          instrumentation: isCampus ? {} : { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 },
          is_campus_active: isCampus,
          is_groovelab_active: !isCampus,
          teacher_id: resolvedTeacherId
        };
      });

      let { data, error } = await supabase.from('songs').insert(insertPayloads).select();

      if (error && (error.message.includes('playalong_url') || error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('cache'))) {
        console.warn('[AdminSongs] playalong_url column missing, retrying bulk insert without it');
        const strippedPayloads = insertPayloads.map(({ playalong_url, ...stripped }) => stripped);
        const retryResult = await supabase.from('songs').insert(strippedPayloads).select();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) alert('Fehler: ' + error.message);
      else if (data) {
        setSongs(prev => [...prev, ...data]);
        window.dispatchEvent(new CustomEvent('groovelab_songs_updated'));
        setShowAddSong(false);
        setBulkModeSongs(false);
        setBulkTextSongs('');
      }
      return;
    }
    
    const insertPayload: any = {
      school_id: resolvedSchoolId, 
      artist: newSong.artist?.trim() || 'Unbekannt', 
      title: newSong.title?.trim() || 'Unbenannter Song', 
      level: newSong.level || 1, 
      media_link: newSong.media_link || '',
      tomplay_url: newSong.tomplay_url || '',
      pdf_folder_url: '',
      guitar_pro_url: '',
      pdf_drums_url: '',
      pdf_guitar_url: '',
      pdf_bass_url: '',
      pdf_vocals_url: '',
      pdf_keys_url: '',
      playalong_url: '',
      bypass_wlan_check: !!newSong.bypass_wlan_check,
      instrumentation: isCampus ? {} : (newSong.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 }),
      is_campus_active: isCampus,
      is_groovelab_active: !isCampus,
      teacher_id: resolvedTeacherId
    };

    let { data, error } = await supabase.from('songs').insert(insertPayload).select().single();
    
    if (error && (error.message.includes('playalong_url') || error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('cache'))) {
      console.warn('[AdminSongs] playalong_url column missing, retrying insert without it');
      const { playalong_url, ...strippedPayload } = insertPayload;
      const retryResult = await supabase.from('songs').insert(strippedPayload).select().single();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) alert('Fehler: ' + error.message);
    else if (data) { 
      setSongs(prev => [...prev, data]); 
      window.dispatchEvent(new CustomEvent('groovelab_songs_updated'));
      setShowAddSong(false); 
      setNewSong({ artist: '', title: '', level: 1, media_link: '', tomplay_url: '', pdf_folder_url: '', guitar_pro_url: '', pdf_drums_url: '', pdf_guitar_url: '', pdf_bass_url: '', pdf_vocals_url: '', pdf_keys_url: '', playalong_url: '', bypass_wlan_check: false, instrumentation: { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 } }); 
    }
  };

  const handleUpdateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSong) return;

    const updatePayload: any = {
      artist: editingSong.artist,
      title: editingSong.title,
      level: editingSong.level,
      media_link: editingSong.media_link,
      tomplay_url: editingSong.tomplay_url,
      pdf_folder_url: editingSong.pdf_folder_url || '',
      guitar_pro_url: editingSong.guitar_pro_url || '',
      pdf_drums_url: editingSong.pdf_drums_url || '',
      pdf_guitar_url: editingSong.pdf_guitar_url || '',
      pdf_bass_url: editingSong.pdf_bass_url || '',
      pdf_vocals_url: editingSong.pdf_vocals_url || '',
      pdf_keys_url: editingSong.pdf_keys_url || '',
      playalong_url: editingSong.playalong_url || '',
      bypass_wlan_check: !!editingSong.bypass_wlan_check,
      is_groovelab_active: editingSong.is_groovelab_active !== undefined ? !!editingSong.is_groovelab_active : true,
      is_campus_active: editingSong.is_campus_active !== undefined ? !!editingSong.is_campus_active : true,
      instrumentation: editingSong.instrumentation
    };

    let { error } = await supabase.from('songs').update(updatePayload).eq('id', editingSong.id);
    
    if (error && (error.message.includes('playalong_url') || error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('cache'))) {
      console.warn('[AdminSongs] playalong_url column missing, retrying update without it');
      const { playalong_url, ...strippedPayload } = updatePayload;
      const retryResult = await supabase.from('songs').update(strippedPayload).eq('id', editingSong.id);
      error = retryResult.error;
    }

    if (error) alert('Fehler: ' + error.message);
    else {
      setSongs(songs.map(s => s.id === editingSong.id ? editingSong : s));
      window.dispatchEvent(new CustomEvent('groovelab_songs_updated'));
      setEditingSong(null);
      alert('Song erfolgreich aktualisiert! ✅');
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!window.confirm('Song wirklich aus der Bibliothek löschen? Damit wird er auch aus allen Schüler-Boards, der Rejection-History und sämtlichen Bands entfernt.')) return;
    try {
      await supabase.from('rejection_history').delete().eq('song_id', songId);
      
      const { data: bandsToDelete } = await supabase.from('bands').select('id').eq('song_id', songId);
      if (bandsToDelete && bandsToDelete.length > 0) {
        const bandIds = bandsToDelete.map(b => b.id);
        await supabase.from('band_members').delete().in('band_id', bandIds);
        await supabase.from('band_shoutbox').delete().in('band_id', bandIds);
        const { data: bandSongs } = await supabase.from('band_songs').select('id').in('band_id', bandIds);
        if (bandSongs && bandSongs.length > 0) {
          await supabase.from('band_song_slots').delete().in('band_song_id', bandSongs.map(bs => bs.id));
        }
        await supabase.from('bands').delete().in('id', bandIds);
      }

      const { data: allBS } = await supabase.from('band_songs').select('id').eq('song_id', songId);
      if (allBS && allBS.length > 0) {
        await supabase.from('band_song_slots').delete().in('band_song_id', allBS.map(bs => bs.id));
      }

      await supabase.from('user_song_skills').delete().eq('song_id', songId);
      await supabase.from('band_songs').delete().eq('song_id', songId);
      
      const { error } = await supabase.from('songs').delete().eq('id', songId);
      if (error) throw error;
      
      setSongs(prev => prev.filter(s => s.id !== songId));
      window.dispatchEvent(new CustomEvent('groovelab_songs_updated'));
      alert('Song wurde inklusive aller Verknüpfungen erfolgreich gelöscht. 🗑️');
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  return {
    lehrwerke,
    setLehrwerke,
    songSearch,
    setSongSearch,
    mediathekTab,
    setMediathekTab,
    bulkModeSongs,
    setBulkModeSongs,
    bulkTextSongs,
    setBulkTextSongs,
    bulkModeLehrwerke,
    setBulkModeLehrwerke,
    bulkTextLehrwerke,
    setBulkTextLehrwerke,
    showAddSong,
    setShowAddSong,
    showAddLehrwerk,
    setShowAddLehrwerk,
    editingSong,
    setEditingSong,
    editingLehrwerk,
    setEditingLehrwerk,
    newSong,
    setNewSong,
    newLehrwerk,
    setNewLehrwerk,
    selectedSongForDetail,
    setSelectedSongForDetail,
    selectedLehrwerkForDetail,
    setSelectedLehrwerkForDetail,
    selectedStudentForProgress,
    setSelectedStudentForProgress,
    textbausteine,
    setTextbausteine,
    previewingTextbaustein,
    setPreviewingTextbaustein,
    copiedTbId,
    setCopiedTbId,
    newHomeworkNoteText,
    setNewHomeworkNoteText,
    songLessonNotes,
    setSongLessonNotes,
    showTextbausteinModal,
    setShowTextbausteinModal,
    showTeacherToolsModal,
    setShowTeacherToolsModal,
    handleMediathekTouchStart,
    handleMediathekTouchEnd,
    handleAddSong,
    handleUpdateSong,
    handleDeleteSong
  };
}
