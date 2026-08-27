import { supabase } from '../lib/supabase';

export interface UserNote {
  id: string;
  user_id: string;
  author_name?: string | null;
  school_id: number | string;
  student_id?: string | null;
  student_name?: string | null;
  room_id?: string | null;
  title?: string;
  content: string;
  tags: string[];
  note_type: 'scratchpad' | 'student_note' | 'todo' | 'audio_memo' | 'room_issue';
  audio_url?: string | null;
  audio_duration_seconds?: number | null;
  due_date?: string | null;
  is_acknowledged?: boolean;
  acknowledged_at?: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  is_completed?: boolean;
  visibility: 'private' | 'school_admin' | 'student_shared';
  color_accent?: string;
  created_at: string;
  updated_at: string;
}

const DB_NAME = 'CampusGroovelabNotesDB';
const DB_VERSION = 1;
const STORE_NAME = 'user_notes';
const BROADCAST_CHANNEL_NAME = 'campus_notes_sync_channel';

// Multi-Tab Sync Broadcast Channel
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not supported in this environment');
  }
}

// IndexedDB Helper
const openNotesDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('user_id', 'user_id', { unique: false });
        store.createIndex('updated_at', 'updated_at', { unique: false });
        store.createIndex('student_id', 'student_id', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Fallback LocalStorage Key
const getLocalNotesKey = (userId: string) => `campus_groovelab_notes_${userId}`;

// Parse Smart Tags from content (@Student, #Tag, !Room, //Todo)
export const parseSmartTags = (text: string) => {
  const studentMentions: string[] = [];
  const tags: string[] = [];
  const rooms: string[] = [];
  let isTodo = false;

  // Check if starts with //
  if (text.trim().startsWith('//') || text.includes(' [ ] ') || text.includes('[x]')) {
    isTodo = true;
  }

  // Extract @Mentions (e.g. @Benedikt L. or @Finja)
  const mentionMatches = text.match(/@([A-Za-z0-9äöüÄÖÜß.\s]+?)(?=[\s,;!#]|$)/g);
  if (mentionMatches) {
    mentionMatches.forEach(m => {
      const name = m.substring(1).trim();
      if (name) studentMentions.push(name);
    });
  }

  // Extract #Tags (e.g. #Hausaufgabe, #Wichtig, #Technik)
  const tagMatches = text.match(/#([A-Za-z0-9äöüÄÖÜß_-]+)/g);
  if (tagMatches) {
    tagMatches.forEach(t => {
      const tag = t.substring(1).trim();
      if (tag) tags.push(tag);
    });
  }

  // Extract !Rooms (e.g. !Raum 4, !Raum4, !Konzertsaal, !Groovelab Nebenraum)
  const roomMatches = text.match(/!([A-Za-z0-9äöüÄÖÜß_-]+(?:\s+(?:\d+|Nebenraum|Studio|Saal))?)/gi);
  if (roomMatches) {
    roomMatches.forEach(r => {
      const room = r.substring(1).trim();
      if (room) rooms.push(room);
    });
  }

  return { studentMentions, tags, rooms, isTodo };
};

// GDPR-compliant student name masking (Vorname + N.)
export const maskStudentName = (rawName: string | null | undefined): string | null => {
  if (!rawName) return null;
  const parts = String(rawName).trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || null;
  const fName = parts[0];
  const lName = parts.slice(1).join(' ');
  const maskedL = lName ? `${lName[0]}.` : '';
  return `${fName} ${maskedL}`.trim();
};

export const notesService = {
  // Subscribe to multi-tab note updates
  onSync(callback: (event: { type: string; noteId?: string; timestamp: number }) => void) {
    if (!broadcastChannel) return () => {};
    const handler = (event: MessageEvent) => {
      if (event.data) callback(event.data);
    };
    broadcastChannel.addEventListener('message', handler);
    return () => broadcastChannel?.removeEventListener('message', handler);
  },

  // Notify other tabs
  notifySync(type: string, noteId?: string) {
    try {
      broadcastChannel?.postMessage({ type, noteId, timestamp: Date.now() });
    } catch (e) {}
  },

  // Get notes from IndexedDB (0ms Fast Cache)
  async getLocalNotes(userId: string): Promise<UserNote[]> {
    try {
      const db = await openNotesDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('user_id');
        const req = index.getAll(userId);
        req.onsuccess = () => {
          const notes: UserNote[] = req.result || [];
          notes.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          });
          resolve(notes);
        };
        req.onerror = () => {
          // Fallback to localStorage
          const raw = localStorage.getItem(getLocalNotesKey(userId));
          resolve(raw ? JSON.parse(raw) : []);
        };
      });
    } catch (e) {
      const raw = localStorage.getItem(getLocalNotesKey(userId));
      return raw ? JSON.parse(raw) : [];
    }
  },

  // Save / Upsert locally (IndexedDB + localStorage backup)
  async saveLocalNote(note: UserNote): Promise<void> {
    try {
      const db = await openNotesDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(note);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      // Fallback update in localStorage
      const notes = await this.getLocalNotes(note.user_id);
      const idx = notes.findIndex(n => n.id === note.id);
      if (idx >= 0) {
        notes[idx] = note;
      } else {
        notes.unshift(note);
      }
      localStorage.setItem(getLocalNotesKey(note.user_id), JSON.stringify(notes));
    }
    this.notifySync('NOTE_UPSERTED', note.id);
  },

  // Delete locally
  async deleteLocalNote(userId: string, noteId: string): Promise<void> {
    try {
      const db = await openNotesDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(noteId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      const notes = await this.getLocalNotes(userId);
      const filtered = notes.filter(n => n.id !== noteId);
      localStorage.setItem(getLocalNotesKey(userId), JSON.stringify(filtered));
    }
    this.notifySync('NOTE_DELETED', noteId);
  },

  // Fetch all notes (Local-first + Background Supabase Sync)
  async fetchNotes(userId: string, schoolId: number | string): Promise<UserNote[]> {
    // 1. Immediately return local cached notes (0ms Latenz)
    const localNotes = await this.getLocalNotes(userId);

    // 2. Asynchronously sync with Supabase in background
    try {
      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!error && data && data.length >= 0) {
        // Cache fetched notes to IndexedDB
        for (const remoteNote of data) {
          await this.saveLocalNote(remoteNote as UserNote);
        }
        return data as UserNote[];
      }
    } catch (err) {
      // Table might not exist yet or offline, continue with local notes smoothly
    }

    return localNotes;
  },

  // Create a new note
  async createNote(params: {
    userId: string;
    schoolId: number | string;
    content: string;
    authorName?: string | null;
    title?: string;
    studentId?: string | null;
    studentName?: string | null;
    roomId?: string | null;
    noteType?: 'scratchpad' | 'student_note' | 'todo' | 'audio_memo' | 'room_issue';
    audioUrl?: string | null;
    audioDurationSeconds?: number | null;
    dueDate?: string | null;
    isPinned?: boolean;
    visibility?: 'private' | 'school_admin' | 'student_shared';
    tags?: string[];
  }): Promise<UserNote> {
    const { studentMentions, tags, rooms, isTodo } = parseSmartTags(params.content);

    const detectedType = params.noteType || 
      (params.audioUrl ? 'audio_memo' : isTodo ? 'todo' : params.studentId ? 'student_note' : (rooms.length > 0 && params.visibility === 'school_admin') ? 'room_issue' : 'scratchpad');

    const combinedTags = Array.from(new Set([
      ...tags,
      ...(params.tags || []),
      ...(isTodo ? ['todo'] : []),
      ...(detectedType === 'room_issue' ? ['#Mangel'] : [])
    ]));

    const newNote: UserNote = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      user_id: params.userId,
      author_name: params.authorName || null,
      school_id: params.schoolId,
      student_id: params.studentId || null,
      student_name: params.studentName ? maskStudentName(params.studentName) : (studentMentions.length > 0 ? maskStudentName(studentMentions[0]) : null),
      room_id: params.roomId || (rooms.length > 0 ? rooms[0] : null),
      title: params.title || undefined,
      content: params.content,
      tags: combinedTags,
      note_type: detectedType,
      audio_url: params.audioUrl || null,
      audio_duration_seconds: params.audioDurationSeconds || null,
      due_date: params.dueDate || null,
      is_acknowledged: false,
      is_pinned: params.isPinned || false,
      is_archived: false,
      is_completed: false,
      visibility: params.visibility || 'private',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 1. Save immediately in IndexedDB (0ms)
    await this.saveLocalNote(newNote);

    // 2. Optimistically push to Supabase in background
    try {
      await supabase.from('user_notes').insert([newNote]);
    } catch (e) {
      // Graceful fallback for offline / unmigrated DB
    }

    return newNote;
  },

  // Fetch all room issues for the school (for Secretariat & Admin dashboards)
  async fetchSchoolRoomIssues(schoolId: number | string): Promise<UserNote[]> {
    if (!schoolId) return [];
    try {
      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('school_id', schoolId)
        .or('note_type.eq.room_issue,visibility.eq.school_admin')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as UserNote[];
      }
    } catch (err) {
      console.warn('Could not fetch school room issues:', err);
    }
    return [];
  },

  // Resolve / Mark room issue as completed (by Secretariat)
  async resolveRoomIssue(noteId: string): Promise<void> {
    const patch = {
      is_completed: true,
      is_acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    try {
      await supabase
        .from('user_notes')
        .update(patch)
        .eq('id', noteId);
    } catch (e) {}
    this.notifySync('NOTE_RESOLVED', noteId);
  },

  // Update existing note
  async updateNote(userId: string, noteId: string, updates: Partial<UserNote>): Promise<void> {
    const localNotes = await this.getLocalNotes(userId);
    const existing = localNotes.find(n => n.id === noteId);
    if (!existing) return;

    const updatedNote: UserNote = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    // If content changed, re-parse smart tags
    if (updates.content !== undefined) {
      const { tags, isTodo } = parseSmartTags(updates.content);
      updatedNote.tags = Array.from(new Set([...tags, ...(isTodo ? ['todo'] : [])]));
      if (isTodo && updatedNote.note_type === 'scratchpad') {
        updatedNote.note_type = 'todo';
      }
    }

    // 1. Update local
    await this.saveLocalNote(updatedNote);

    // 2. Push to Supabase
    try {
      await supabase.from('user_notes').update({
        ...updates,
        tags: updatedNote.tags,
        updated_at: updatedNote.updated_at
      }).eq('id', noteId);
    } catch (e) {}
  },

  // Delete note (Physical hard delete from local + DB + Storage)
  async deleteNote(userId: string, noteId: string, audioUrl?: string | null): Promise<void> {
    // 1. Delete local
    await this.deleteLocalNote(userId, noteId);

    // 2. Delete from Supabase
    try {
      await supabase.from('user_notes').delete().eq('id', noteId);
    } catch (e) {}

    // 3. Delete audio blob if present
    if (audioUrl) {
      try {
        const path = audioUrl.split('/').pop();
        if (path) {
          await supabase.storage.from('user-recordings').remove([path]);
        }
      } catch (e) {}
    }
  }
};
