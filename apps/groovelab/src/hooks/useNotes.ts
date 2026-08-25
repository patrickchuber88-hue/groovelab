import { useState, useEffect, useCallback, useMemo } from 'react';
import { notesService, UserNote, parseSmartTags } from '../services/notesService';

export type NotesFilterType = 'all' | 'pinned' | 'todos' | 'student' | 'archived';

interface UseNotesOptions {
  user: any;
  schoolId?: number | string;
  activeStudent?: any;
}

export const useNotes = ({ user, schoolId, activeStudent }: UseNotesOptions) => {
  const userId = user?.id || 'guest_teacher';
  const effectiveSchoolId = schoolId || user?.school_id || 1;

  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<NotesFilterType>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'synced'>('saved');

  // 1. Initial Load (0ms IndexedDB + Background Remote Sync)
  const refreshNotes = useCallback(async () => {
    if (!userId) return;
    try {
      const fetched = await notesService.fetchNotes(userId, effectiveSchoolId);
      setNotes(fetched);
    } catch (e) {
      console.warn('Error loading notes:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, effectiveSchoolId]);

  useEffect(() => {
    refreshNotes();

    // Listen to multi-tab sync
    const unsubscribe = notesService.onSync(() => {
      notesService.getLocalNotes(userId).then(setNotes);
    });

    return () => unsubscribe();
  }, [refreshNotes, userId]);

  // 2. Filtered & Sorted Notes
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      // Archive filter
      if (filterType === 'archived') {
        if (!note.is_archived) return false;
      } else {
        if (note.is_archived) return false;
      }

      // Type filters
      if (filterType === 'pinned' && !note.is_pinned) return false;
      if (filterType === 'todos' && note.note_type !== 'todo' && !note.tags.includes('todo')) return false;
      if (filterType === 'student') {
        if (!note.student_id && !note.student_name) return false;
        if (activeStudent && note.student_id && note.student_id !== activeStudent.id) return false;
      }

      // Specific Tag filter
      if (selectedTag && !note.tags.includes(selectedTag)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesContent = note.content.toLowerCase().includes(q);
        const matchesTitle = note.title?.toLowerCase().includes(q);
        const matchesStudent = note.student_name?.toLowerCase().includes(q);
        const matchesTags = note.tags.some(t => t.toLowerCase().includes(q));
        const matchesRoom = note.room_id?.toLowerCase().includes(q);
        return matchesContent || matchesTitle || matchesStudent || matchesTags || matchesRoom;
      }

      return true;
    });
  }, [notes, filterType, selectedTag, searchQuery, activeStudent]);

  // All unique active tags for quick filter pills
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => {
      if (!n.is_archived) {
        n.tags.forEach(t => set.add(t));
      }
    });
    return Array.from(set);
  }, [notes]);

  // Quick stats
  const stats = useMemo(() => {
    const active = notes.filter(n => !n.is_archived);
    const pinned = active.filter(n => n.is_pinned).length;
    const todos = active.filter(n => n.note_type === 'todo' || n.tags.includes('todo'));
    const openTodos = todos.filter(t => !t.is_completed).length;
    return { totalActive: active.length, pinned, openTodos };
  }, [notes]);

  // 3. Actions
  const createNote = async (content: string, options: {
    studentId?: string | null;
    studentName?: string | null;
    roomId?: string | null;
    noteType?: 'scratchpad' | 'student_note' | 'todo' | 'audio_memo';
    audioUrl?: string | null;
    audioDurationSeconds?: number | null;
    isPinned?: boolean;
    visibility?: 'private' | 'school_admin' | 'student_shared';
  } = {}) => {
    setSaveStatus('saving');
    const newNote = await notesService.createNote({
      userId,
      schoolId: effectiveSchoolId,
      content,
      studentId: options.studentId || (activeStudent?.id || null),
      studentName: options.studentName || (activeStudent?.first_name ? `${activeStudent.first_name} ${activeStudent.last_name || ''}`.trim() : null),
      roomId: options.roomId,
      noteType: options.noteType,
      audioUrl: options.audioUrl,
      audioDurationSeconds: options.audioDurationSeconds,
      isPinned: options.isPinned,
      visibility: options.visibility
    });

    setNotes(prev => [newNote, ...prev]);
    setTimeout(() => setSaveStatus('saved'), 400);
    return newNote;
  };

  const updateNote = async (noteId: string, updates: Partial<UserNote>) => {
    setSaveStatus('saving');
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...updates, updated_at: new Date().toISOString() } : n));
    await notesService.updateNote(userId, noteId, updates);
    setTimeout(() => setSaveStatus('saved'), 400);
  };

  const togglePin = async (noteId: string) => {
    const existing = notes.find(n => n.id === noteId);
    if (!existing) return;
    await updateNote(noteId, { is_pinned: !existing.is_pinned });
  };

  const toggleCompleteTodo = async (noteId: string) => {
    const existing = notes.find(n => n.id === noteId);
    if (!existing) return;
    await updateNote(noteId, { is_completed: !existing.is_completed });
  };

  const toggleArchive = async (noteId: string) => {
    const existing = notes.find(n => n.id === noteId);
    if (!existing) return;
    await updateNote(noteId, { is_archived: !existing.is_archived });
  };

  const deleteNote = async (noteId: string) => {
    const existing = notes.find(n => n.id === noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
    await notesService.deleteNote(userId, noteId, existing?.audio_url);
  };

  // Sync to Student's Homework Book
  const syncToHomeworkBook = useCallback((note: UserNote, targetStudentId?: string): boolean => {
    const sId = targetStudentId || note.student_id || activeStudent?.id;
    if (!sId) return false;

    try {
      const cleanContent = note.content
        .replace(/#Hausaufgabe/gi, '')
        .replace(/@\S+/g, '')
        .trim();

      const storageKey = `campus_homework_notes_${sId}`;
      const existingRaw = localStorage.getItem(storageKey);
      let existingList: string[] = [];
      try {
        existingList = existingRaw ? JSON.parse(existingRaw) : [];
      } catch (e) {
        existingList = existingRaw ? [existingRaw] : [];
      }

      const formattedEntry = note.audio_url 
        ? `AUDIO:${note.audio_duration_seconds || 60}|${note.audio_url}|${cleanContent || 'Hausaufgaben-Aufnahme'}|teacher`
        : cleanContent;

      if (formattedEntry && !existingList.includes(formattedEntry)) {
        existingList.push(formattedEntry);
        localStorage.setItem(storageKey, JSON.stringify(existingList));
      }

      // Mark note as student_shared
      updateNote(note.id, { visibility: 'student_shared' });
      return true;
    } catch (e) {
      console.error('Failed to sync homework note:', e);
      return false;
    }
  }, [activeStudent]);

  return {
    notes,
    filteredNotes,
    loading,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    selectedTag,
    setSelectedTag,
    availableTags,
    stats,
    saveStatus,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleCompleteTodo,
    toggleArchive,
    syncToHomeworkBook,
    refreshNotes
  };
};
