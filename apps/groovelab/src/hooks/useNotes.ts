import { useState, useEffect, useCallback, useMemo } from 'react';
import { notesService, UserNote, parseSmartTags } from '../services/notesService';
import { supabase } from '../lib/supabase';

export type NotesFilterType = 'all' | 'pinned' | 'todos' | 'student' | 'homework' | 'archived';

interface UseNotesOptions {
  user: any;
  schoolId?: number | string;
  activeStudent?: any;
}

// GDPR-compliant student name masking (Vorname + N.)
const maskStudentName = (rawName: string | null | undefined): string | null => {
  if (!rawName) return null;
  const parts = String(rawName).trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || null;
  const fName = parts[0];
  const lName = parts.slice(1).join(' ');
  const maskedL = lName ? `${lName[0]}.` : '';
  return `${fName} ${maskedL}`.trim();
};

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

  // Active Today String (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 2. Filtered & Sorted Notes with 3-Ebenen Lifecycle
  const filteredNotes = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const twoDaysMs = 48 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    return notes.filter(note => {
      const createdAtMs = new Date(note.created_at).getTime();
      const updatedAtMs = new Date(note.updated_at || note.created_at).getTime();

      // Explicit Archive View
      if (filterType === 'archived') {
        return note.is_archived || 
               (note.is_completed && now - updatedAtMs > twoDaysMs) ||
               (note.visibility === 'student_shared' && now - createdAtMs > oneDayMs && !note.is_pinned);
      }

      // If user explicitly marked as archived, hide from normal views
      if (note.is_archived) return false;

      // ── Auto-Sunset Lifecycle Rules for Focus Stream ──
      // If we are in 'all' view (and not searching), apply auto-sunset to keep the focus stream fresh (< 12 items)
      if (filterType === 'all' && !searchQuery.trim()) {
        // Pinned notes and unacknowledged due alerts are ALWAYS visible
        const isUrgentDue = note.due_date && note.due_date <= todayStr && !note.is_acknowledged && !note.is_completed;
        if (!note.is_pinned && !isUrgentDue) {
          // Completed todos older than 48h slide into archive
          if (note.is_completed && now - updatedAtMs > twoDaysMs) {
            return false;
          }
          // Transferred homework immediately exits the main focus stage [ Alle ] (Inbox Zero) since it's safely in the student homework book.
          // It remains visible in the dedicated [ Aufgaben ] tab, [ Archiv ] and via search.
          if (note.visibility === 'student_shared') {
            return false;
          }
          // Neutral scratchpad notes older than 7 days slide into archive
          if (note.note_type === 'scratchpad' && now - createdAtMs > sevenDaysMs) {
            return false;
          }
        }
      }

      // Type filters
      if (filterType === 'pinned' && !note.is_pinned) return false;
      if (filterType === 'todos' && note.note_type !== 'todo' && !note.tags.includes('todo') && !note.content.startsWith('- ')) return false;
      if (filterType === 'homework' && note.note_type !== 'student_note' && note.visibility !== 'student_shared' && !note.tags.includes('Hausaufgabe')) return false;
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
  }, [notes, filterType, selectedTag, searchQuery, activeStudent, todayStr]);

  // Urgent Sticky Alerts (Overdue or Due Today & unacknowledged)
  const dueAlerts = useMemo(() => {
    return notes.filter(n => {
      if (n.is_archived || n.is_completed || n.is_acknowledged) return false;
      if (!n.due_date) return false;
      return n.due_date <= todayStr;
    });
  }, [notes, todayStr]);

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
    const overdue = dueAlerts.length;
    return { totalActive: active.length, pinned, openTodos, overdue };
  }, [notes, dueAlerts]);

  // 3. Actions
  const createNote = async (content: string, options: {
    studentId?: string | null;
    studentName?: string | null;
    roomId?: string | null;
    noteType?: 'scratchpad' | 'student_note' | 'todo' | 'audio_memo' | 'room_issue';
    authorName?: string | null;
    audioUrl?: string | null;
    audioDurationSeconds?: number | null;
    dueDate?: string | null;
    isPinned?: boolean;
    visibility?: 'private' | 'school_admin' | 'student_shared';
  } = {}) => {
    setSaveStatus('saving');
    const authorName = options.authorName || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Lehrkraft';
    const newNote = await notesService.createNote({
      userId,
      schoolId: effectiveSchoolId,
      content,
      authorName,
      studentId: options.studentId !== undefined ? options.studentId : null,
      studentName: options.studentName !== undefined ? maskStudentName(options.studentName) : null,
      roomId: options.roomId,
      noteType: options.noteType,
      audioUrl: options.audioUrl,
      audioDurationSeconds: options.audioDurationSeconds,
      dueDate: options.dueDate || null,
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

  const acknowledgeNote = async (noteId: string) => {
    await updateNote(noteId, { is_acknowledged: true, acknowledged_at: new Date().toISOString(), is_completed: true });
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

  // Sync to Student's Homework Book (Tier-1 Canonical Protocol Integration)
  const syncToHomeworkBook = useCallback(async (note: UserNote, targetStudentId?: string, targetStudentName?: string): Promise<boolean> => {
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
        if (!Array.isArray(existingList)) existingList = existingRaw ? [existingRaw] : [];
      } catch (e) {
        existingList = existingRaw ? [existingRaw] : [];
      }

      const formattedEntry = note.audio_url 
        ? `AUDIO:${note.audio_url}|${note.audio_duration_seconds || 1}|${new Date().toISOString()}|${cleanContent || 'Unterrichts-Audio'}|teacher|shared_with_teacher`
        : cleanContent;

      if (formattedEntry && !existingList.includes(formattedEntry)) {
        existingList.push(formattedEntry);
        localStorage.setItem(storageKey, JSON.stringify(existingList));
      }

      // Update in Supabase progress_matrix if online
      try {
        const d = new Date();
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDays = (d.getTime() - startOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        const topicName = `Hausaufgabe KW ${String(weekNum).padStart(2, '0')}`;

        const { data: existingMatrix } = await supabase
          .from('progress_matrix')
          .select('id, homework_notes')
          .eq('student_id', sId)
          .eq('topic_name', topicName)
          .maybeSingle();

        if (existingMatrix) {
          await supabase
            .from('progress_matrix')
            .update({
              homework_notes: JSON.stringify(existingList),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingMatrix.id);
        } else {
          await supabase
            .from('progress_matrix')
            .insert({
              student_id: sId,
              teacher_id: userId,
              topic_name: topicName,
              status: 'IN_PROGRESS',
              is_current_homework: true,
              homework_notes: JSON.stringify(existingList),
              updated_at: new Date().toISOString()
            });
        }
      } catch (dbErr) {
        console.warn('[syncToHomeworkBook] DB sync notice:', dbErr);
      }

      // Dispatch global event for same-window / modal live sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('homework-updated', { detail: { studentId: sId } }));
      }

      // Mark note as student_shared
      await updateNote(note.id, { 
        visibility: 'student_shared',
        student_id: sId,
        student_name: targetStudentName || note.student_name || activeStudent?.first_name || 'Schüler'
      });
      return true;
    } catch (e) {
      console.error('Failed to sync homework note:', e);
      return false;
    }
  }, [activeStudent, userId]);

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
    dueAlerts,
    saveStatus,
    createNote,
    updateNote,
    acknowledgeNote,
    deleteNote,
    togglePin,
    toggleCompleteTodo,
    toggleArchive,
    syncToHomeworkBook,
    refreshNotes
  };
};
