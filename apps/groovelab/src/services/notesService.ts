import { supabase } from '../lib/supabase';
import { isUUID } from '../utils/uuidValidator';

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
  teacher_dismissed?: boolean;
  resolved_by?: 'teacher' | 'secretary' | 'admin' | null;
  visibility: 'private' | 'school_admin' | 'student_shared';
  color_accent?: string;
  created_at: string;
  updated_at: string;
  // 🏛️ Tier-1 Enterprise+ Extensions:
  source_origin?: 'user_notes' | 'homework_book';
  homework_content?: string | null;
  is_homework_synced?: boolean;
  homework_status?: 'pending' | 'viewed' | 'practiced';
  room_issue_status?: 'reported' | 'in_progress' | 'resolved';
  checklist_items?: Array<{ id: string; text: string; completed: boolean }>;
  lehrwerk_id?: string | null;
  lehrwerk_title?: string | null;
  lehrwerk_pages?: number[] | null;
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

  // Extract !Rooms (e.g. !Raum 4, !Raum4, !Konzertsaal, !Groovelab Nebenraum) or generic room patterns
  const roomMatches = text.match(/!([A-Za-z0-9äöüÄÖÜß_-]+(?:\s+(?:\d+|Nebenraum|Studio|Saal))?)/gi);
  if (roomMatches) {
    roomMatches.forEach(r => {
      const room = r.substring(1).trim();
      if (room) rooms.push(room);
    });
  } else {
    const genericRoomMatch = text.match(/\b(Raum\s*\d+|Saal\s*\d*|Studio\s*\d*|Konzertsaal|Bandraum|Keller|EG|OG\s*\d*)\b/i);
    if (genericRoomMatch) {
      rooms.push(genericRoomMatch[1].trim());
    }
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

// Intelligente Mängel-Erkennung (konsistent über alle Module & Boards)
export const isRoomIssueNote = (note: { content?: string; tags?: string[]; room_id?: string | null; note_type?: string; visibility?: string }): boolean => {
  if (note.note_type === 'room_issue' || note.visibility === 'school_admin') return true;

  const content = (note.content || '').toLowerCase();
  const tags = (note.tags || []).map(t => t.toLowerCase());

  const hasRoom = Boolean(
    note.room_id || 
    /raum|saal|studio|keller|bühne|eg|og/i.test(content) || 
    tags.some(t => /!raum|#raum/i.test(t))
  );

  const isDefectTag = tags.some(t => 
    t === '#mangel' || t === '#defekt' || t === 'mangel' || t === 'defekt'
  );

  const isDefectText = /mangel|defekt|kaputt|reparatur|stimmen|saite|notenständer|wackelt|fehlt|abgebrochen|beschädigt|problem/i.test(content);

  return Boolean(hasRoom && (isDefectTag || isDefectText));
};

// 🛡️ Enterprise+ Revisionssicheres Audit-Logging für Notizen (OWASP ASVS Level 3)
export const logNoteAudit = async (
  action: 'USER_NOTE_CREATED' | 'USER_NOTE_UPDATED' | 'USER_NOTE_CHECKLIST_TOGGLED' | 'USER_NOTE_DELETED' | 'USER_NOTE_RESTORED',
  schoolId: number | string,
  userId: string,
  noteId: string,
  details: Record<string, any>
) => {
  try {
    const sId = isUUID(schoolId) ? schoolId : undefined;
    const uId = isUUID(userId) ? userId : undefined;
    if (sId && uId) {
      await supabase.from('audit_logs').insert({
        action,
        school_id: sId,
        user_id: uId,
        entity_type: 'user_note',
        entity_id: noteId,
        details: {
          ...details,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (err) {
    // Fail-safe silent catch: local offline caching stays robust even if network/audit table is unavailable
    console.warn('Silent note audit log notice:', err);
  }
};

// 🏛️ Checkliste Parser (Mehrzeilig, Semikolon-getrennt oder Inline mit Bindestrich)
export const parseChecklistText = (text: string): { isChecklist: boolean; items: Array<{ id: string; text: string; completed: boolean }> } => {
  if (!text) return { isChecklist: false, items: [] };

  const trimmed = text.trim();
  const items: Array<{ id: string; text: string; completed: boolean }> = [];

  // Fall 1: Mehrzeiliger Text (\n getrennt)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    lines.forEach((line, idx) => {
      const completed = line.includes('[x]') || line.includes('[X]');
      const cleanText = line
        .replace(/^-\s*\[[ xX]\]\s*/, '')
        .replace(/^-\s*/, '')
        .replace(/^\[[ xX]\]\s*/, '')
        .trim();
      if (cleanText) {
        items.push({ id: `chk_${idx}_${Date.now()}`, text: cleanText, completed });
      }
    });
    return { isChecklist: items.length > 0, items };
  }

  // Fall 2: Einzeiliger Text mit Semikolon-Aufzählung
  if (text.includes(';')) {
    const rawParts = text.replace(/^-\s*/, '').split(';').map(p => p.trim()).filter(Boolean);
    if (rawParts.length > 1) {
      rawParts.forEach((part, idx) => {
        const completed = part.startsWith('[x]') || part.startsWith('[X]');
        const cleanText = part.replace(/^\[[ xX]\]\s*/, '').replace(/^-\s*/, '').trim();
        if (cleanText) {
          items.push({ id: `chk_${idx}_${Date.now()}`, text: cleanText, completed });
        }
      });
      return { isChecklist: items.length > 0, items };
    }
  }

  // Fall 3: Einzeiliger Text mit inline "-" getrennten Items (z.B. "- hallo- wie gehts- was machst du" oder "- item1 - item2")
  if (trimmed.startsWith('-') || trimmed.includes(' - ') || /-\s+[^\s]/.test(trimmed)) {
    // Teile an jedem Bindestrich auf, der am Zeilenanfang steht oder dem Leerzeichen folgen oder dem ein Buchstabe folgt
    const inlineParts = trimmed.split(/(?:^|\s+)-\s*|-(?=[a-zA-Z0-9äöüÄÖÜß])/).map(p => p.trim()).filter(Boolean);
    if (inlineParts.length > 1) {
      inlineParts.forEach((part, idx) => {
        const completed = part.startsWith('[x]') || part.startsWith('[X]');
        const cleanText = part.replace(/^\[[ xX]\]\s*/, '').replace(/^-\s*/, '').trim();
        if (cleanText) {
          items.push({ id: `chk_${idx}_${Date.now()}`, text: cleanText, completed });
        }
      });
      if (items.length > 1) {
        return { isChecklist: true, items };
      }
    }
  }

  // Fall 4: Einzelnes Checkbox-Item (z.B. "- Aufwärmen" oder "[ ] Üben")
  if (trimmed.startsWith('- ') || trimmed.startsWith('[ ]') || trimmed.startsWith('[x]')) {
    const completed = trimmed.includes('[x]') || trimmed.includes('[X]');
    const cleanText = trimmed
      .replace(/^-\s*\[[ xX]\]\s*/, '')
      .replace(/^-\s*/, '')
      .replace(/^\[[ xX]\]\s*/, '')
      .trim();
    if (cleanText) {
      items.push({ id: `chk_0_${Date.now()}`, text: cleanText, completed });
      return { isChecklist: true, items };
    }
  }

  return { isChecklist: false, items: [] };
};

// 🏛️ Lehrwerk & Seitenzahlen-Erkennung
export const parseLehrwerkAndPages = (text: string, studentLehrwerke: any[] = []): {
  detectedLehrwerk: any | null;
  pages: number[];
  cleanNotes: string;
} => {
  const pages: number[] = [];
  let detectedLehrwerk: any | null = null;
  const cleanNotes = text;

  // 1. Seitenzahlen-Muster erkennen (z.B. "Seite 14", "S. 14", "S. 14-16", "S. 14–16", "Seite 14 bis 16")
  const pageRangeRegex = /(?:seite|s\.)\s*(\d+)(?:\s*(?:-|–|bis)\s*(\d+))?/gi;
  let match;
  while ((match = pageRangeRegex.exec(text)) !== null) {
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;
    if (!isNaN(start)) {
      const minP = Math.min(start, end);
      const maxP = Math.max(start, end);
      for (let p = minP; p <= maxP; p++) {
        if (!pages.includes(p)) pages.push(p);
      }
    }
  }

  // 2. Lehrwerk-Zuordnung prüfen
  if (studentLehrwerke && studentLehrwerke.length > 0) {
    const lowerText = text.toLowerCase();
    for (const lw of studentLehrwerke) {
      const titleLower = (lw.title || '').toLowerCase();
      if (titleLower && lowerText.includes(titleLower)) {
        detectedLehrwerk = lw;
        break;
      }
    }
    // Falls kein Titel direkt im Text, aber nur 1 aktives Lehrwerk existiert und #noten vorhanden ist
    if (!detectedLehrwerk && /#noten/i.test(text) && studentLehrwerke.length === 1) {
      detectedLehrwerk = studentLehrwerke[0];
    }
  }

  return { detectedLehrwerk, pages, cleanNotes };
};

// 🏛️ Protokoll-Modul-Brücke: Atomarer Sync in progress_matrix
export const syncNotePageToProtocolMatrix = async (params: {
  schoolId: number | string;
  studentId: string;
  teacherId: string;
  lehrwerkTitle: string;
  pages: number[];
  noteText?: string;
  isRepeat?: boolean;
}): Promise<void> => {
  const { schoolId, studentId, teacherId, lehrwerkTitle, pages, noteText = '', isRepeat = false } = params;
  if (!schoolId || !studentId || !lehrwerkTitle || !pages || pages.length === 0) return;

  const nowIso = new Date().toISOString();
  const effectiveStatus = 'IN_PROGRESS';
  const effectiveNote = isRepeat ? `[Wiederholung] ${noteText}`.trim() : noteText.trim();

  for (const pageNum of pages) {
    const topicName = `${lehrwerkTitle} - Seite ${pageNum}`;
    try {
      if (isUUID(studentId) && isUUID(teacherId) && isUUID(String(schoolId))) {
        await supabase
          .from('progress_matrix')
          .upsert({
            school_id: schoolId,
            student_id: studentId,
            teacher_id: teacherId,
            topic_name: topicName,
            status: effectiveStatus,
            teacher_notes: effectiveNote,
            homework_notes: JSON.stringify([effectiveNote]),
            updated_at: nowIso
          }, {
            onConflict: 'school_id,student_id,topic_name'
          });
      }
    } catch (err) {
      console.warn('Protocol matrix sync notice:', err);
    }
  }
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

    if (!userId || !isUUID(userId)) {
      return localNotes;
    }

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

    const lower = params.content.toLowerCase();
    const isDefectKeyword = lower.includes('mangel') || lower.includes('defekt') || lower.includes('kaputt') || lower.includes('reparatur') || lower.includes('stimmen') || lower.includes('saite') || lower.includes('notenständer') || lower.includes('wackelt') || lower.includes('fehlt') || lower.includes('problem');
    const isRoomRelated = rooms.length > 0 || !!params.roomId || lower.includes('raum');

    const detectedType = params.noteType || 
      (params.audioUrl ? 'audio_memo' : isTodo ? 'todo' : (isRoomRelated && isDefectKeyword) ? 'room_issue' : params.studentId ? 'student_note' : (rooms.length > 0 && params.visibility === 'school_admin') ? 'room_issue' : 'scratchpad');

    const detectedVisibility = (detectedType === 'room_issue') ? 'school_admin' : (params.visibility || 'private');

    const roomTag = rooms.length > 0 ? `#${rooms[0]}` : null;
    const initialTags = (params.tags || []).filter(t => roomTag ? t.toLowerCase() !== '#raum' : true);

    const combinedTags = Array.from(new Set([
      ...tags,
      ...initialTags,
      ...(roomTag ? [roomTag] : []),
      ...(isTodo ? ['todo'] : []),
      ...(detectedType === 'room_issue' && !tags.some(t => t.toLowerCase() === '#mangel') ? ['#Mangel'] : [])
    ]));

    const checklist = parseChecklistText(params.content);
    const isChecklist = checklist.isChecklist && checklist.items.length > 0;

    let cleanContent = params.content;
    let homeworkContent: string | null = null;
    let isHomeworkSynced = false;

    if (params.content.includes('//')) {
      const parts = params.content.split('//');
      cleanContent = parts[0].trim();
      homeworkContent = parts.slice(1).join('//').trim();
      isHomeworkSynced = Boolean(homeworkContent);
    }

    const newNote: UserNote = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      user_id: params.userId,
      author_name: params.authorName || null,
      school_id: params.schoolId,
      student_id: params.studentId || null,
      student_name: params.studentName ? maskStudentName(params.studentName) : (studentMentions.length > 0 ? maskStudentName(studentMentions[0]) : null),
      room_id: params.roomId || (rooms.length > 0 ? rooms[0] : null),
      title: params.title || undefined,
      content: cleanContent,
      tags: combinedTags,
      note_type: isChecklist ? 'todo' : detectedType,
      audio_url: params.audioUrl || null,
      audio_duration_seconds: params.audioDurationSeconds || null,
      due_date: params.dueDate || null,
      is_acknowledged: false,
      is_pinned: params.isPinned || false,
      is_archived: false,
      is_completed: false,
      visibility: detectedVisibility,
      source_origin: 'user_notes',
      homework_content: homeworkContent,
      is_homework_synced: isHomeworkSynced,
      room_issue_status: detectedType === 'room_issue' ? 'reported' : undefined,
      checklist_items: isChecklist ? checklist.items : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 1. Save immediately in IndexedDB (0ms Fast Local-First)
    await this.saveLocalNote(newNote);

    // 2. Optimistically push to Supabase in background (non-blocking)
    if (params.userId && isUUID(params.userId) && params.schoolId && isUUID(params.schoolId)) {
      Promise.resolve(supabase.from('user_notes').insert([newNote])).catch((e: any) => {
        // Graceful fallback for offline / unmigrated DB
        console.warn('Background sync notice for user_notes:', e);
      });
    }

    // 🛡️ 3. Revisionssicheres Audit-Logging (OWASP ASVS Level 3, non-blocking)
    logNoteAudit(
      'USER_NOTE_CREATED',
      params.schoolId,
      params.userId,
      newNote.id,
      {
        note_type: newNote.note_type,
        student_name: newNote.student_name,
        has_checklist: Boolean(newNote.checklist_items && newNote.checklist_items.length > 0),
        checklist_count: newNote.checklist_items?.length || 0,
        tags: newNote.tags
      }
    ).catch(() => {});

    return newNote;
  },

  // Fetch all room issues for the school (for Secretariat, Admin & Tagesplan)
  async fetchSchoolRoomIssues(schoolId?: number | string): Promise<UserNote[]> {
    const effectiveSchoolId = schoolId || 1;

    // 1. Get list of persistently resolved note IDs
    let persistentResolvedIds = new Set<string>();
    try {
      const raw = localStorage.getItem('campus_resolved_room_issues');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          persistentResolvedIds = new Set(arr);
        }
      }
    } catch (e) {}

    const issueMap = new Map<string, UserNote>();

    // 2. Scan all local storage note caches (zero-latency offline & active session store)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('campus_groovelab_notes_')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                for (const note of parsed) {
                  if (isRoomIssueNote(note)) {
                    if (persistentResolvedIds.has(note.id)) {
                      note.is_completed = true;
                      note.is_acknowledged = true;
                    }
                    issueMap.set(note.id, note);
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {}

    // 3. Scan IndexedDB
    try {
      const db = await openNotesDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const allLocal = await new Promise<UserNote[]>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      for (const note of allLocal) {
        if (isRoomIssueNote(note)) {
          if (persistentResolvedIds.has(note.id)) {
            note.is_completed = true;
            note.is_acknowledged = true;
          }
          issueMap.set(note.id, note);
        }
      }
    } catch (e) {
      // ignore
    }

    // 4. Scan Supabase user_notes
    if (effectiveSchoolId && isUUID(effectiveSchoolId)) {
      try {
        const { data, error } = await supabase
          .from('user_notes')
          .select('*')
          .eq('school_id', effectiveSchoolId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          for (const item of (data as UserNote[])) {
            if (isRoomIssueNote(item)) {
              if (persistentResolvedIds.has(item.id)) {
                item.is_completed = true;
                item.is_acknowledged = true;
              }
              issueMap.set(item.id, item);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch school room issues from DB:', err);
      }
    }

    return Array.from(issueMap.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  // Resolve / Mark room issue as completed permanently across Supabase, IndexedDB & LocalStorage
  async resolveRoomIssue(noteId: string, resolvedBy: 'teacher' | 'secretary' | 'admin' = 'secretary'): Promise<void> {
    const nowIso = new Date().toISOString();
    const patch = {
      is_completed: true,
      is_acknowledged: true,
      acknowledged_at: nowIso,
      updated_at: nowIso,
      resolved_by: resolvedBy
    };

    // 1. Permanent Registry in LocalStorage
    try {
      const raw = localStorage.getItem('campus_resolved_room_issues');
      const resolved: string[] = raw ? JSON.parse(raw) : [];
      if (!resolved.includes(noteId)) {
        resolved.push(noteId);
        localStorage.setItem('campus_resolved_room_issues', JSON.stringify(resolved));
      }
    } catch (e) {}

    // 2. Update Supabase Database
    try {
      await supabase
        .from('user_notes')
        .update(patch)
        .eq('id', noteId);
    } catch (e) {
      console.warn('Supabase resolve update notice:', e);
    }

    // 3. Update IndexedDB
    try {
      const db = await openNotesDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(noteId);
      req.onsuccess = () => {
        if (req.result) {
          store.put({ ...req.result, ...patch });
        }
      };
    } catch (e) {}

    // 4. Update all local note caches in LocalStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('campus_groovelab_notes_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const notes: UserNote[] = JSON.parse(raw);
            let changed = false;
            const updated = notes.map(n => {
              if (n.id === noteId) {
                changed = true;
                return { ...n, ...patch };
              }
              return n;
            });
            if (changed) {
              localStorage.setItem(key, JSON.stringify(updated));
            }
          }
        }
      }
    } catch (e) {}

    this.notifySync('NOTE_UPSERTED', noteId);
  },

  // Dismiss room issue ONLY from teacher's personal focus list without closing the ticket in secretariat
  async dismissRoomIssueForTeacher(userId: string, noteId: string): Promise<void> {
    const nowIso = new Date().toISOString();
    const patch = {
      teacher_dismissed: true,
      updated_at: nowIso
    };

    // 1. Update in IndexedDB
    try {
      const db = await openNotesDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(noteId);
      req.onsuccess = () => {
        if (req.result) {
          store.put({ ...req.result, ...patch });
        }
      };
    } catch (e) {}

    // 2. Update local note caches in LocalStorage
    try {
      const key = getLocalNotesKey(userId);
      const raw = localStorage.getItem(key);
      if (raw) {
        const notes: UserNote[] = JSON.parse(raw);
        const updated = notes.map(n => n.id === noteId ? { ...n, ...patch } : n);
        localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (e) {}

    // 3. Update Supabase if available
    try {
      await supabase
        .from('user_notes')
        .update(patch)
        .eq('id', noteId);
    } catch (e) {}

    this.notifySync('NOTE_UPSERTED', noteId);
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
      const { studentMentions, tags, rooms, isTodo } = parseSmartTags(updates.content);
      const roomTag = rooms.length > 0 ? `#${rooms[0]}` : null;
      const preservedTags = (existing.tags || []).filter(t => roomTag ? t.toLowerCase() !== '#raum' : true);

      updatedNote.tags = Array.from(new Set([
        ...preservedTags,
        ...tags,
        ...(roomTag ? [roomTag] : []),
        ...(isTodo ? ['todo'] : [])
      ]));

      if (rooms.length > 0) {
        updatedNote.room_id = rooms[0];
        if (updatedNote.note_type === 'scratchpad') {
          updatedNote.note_type = 'room_issue';
        }
      }

      if (studentMentions.length > 0 && !updatedNote.student_name) {
        updatedNote.student_name = maskStudentName(studentMentions[0]);
        if (updatedNote.note_type === 'scratchpad') {
          updatedNote.note_type = 'student_note';
        }
      }

      if (isTodo && updatedNote.note_type === 'scratchpad') {
        updatedNote.note_type = 'todo';
      }
    }

    // 1. Update local
    await this.saveLocalNote(updatedNote);

    // 2. Push to Supabase in background (non-blocking)
    Promise.resolve(
      supabase.from('user_notes').update({
        ...updates,
        room_id: updatedNote.room_id,
        student_name: updatedNote.student_name,
        note_type: updatedNote.note_type,
        tags: updatedNote.tags,
        updated_at: updatedNote.updated_at
      }).eq('id', noteId)
    ).catch(() => {});

    // 🛡️ 3. Revisionssicheres Audit-Logging (OWASP ASVS Level 3, non-blocking)
    const isChecklistToggle = updates.checklist_items !== undefined;
    logNoteAudit(
      isChecklistToggle ? 'USER_NOTE_CHECKLIST_TOGGLED' : 'USER_NOTE_UPDATED',
      existing.school_id,
      userId,
      noteId,
      {
        action_detail: isChecklistToggle ? 'checklist_items_updated' : 'note_updated',
        updated_keys: Object.keys(updates),
        is_completed: updatedNote.is_completed
      }
    ).catch(() => {});
  },

  // Delete note (Physical hard delete from local + DB + Storage)
  async deleteNote(userId: string, noteId: string, audioUrl?: string | null): Promise<void> {
    const localNotes = await this.getLocalNotes(userId);
    const existing = localNotes.find(n => n.id === noteId);

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

    // 🛡️ 4. Revisionssicheres Audit-Logging (OWASP ASVS Level 3)
    if (existing) {
      await logNoteAudit(
        'USER_NOTE_DELETED',
        existing.school_id,
        userId,
        noteId,
        {
          note_type: existing.note_type,
          student_name: existing.student_name,
          had_checklist: Boolean(existing.checklist_items && existing.checklist_items.length > 0)
        }
      );
    }
  }
};
