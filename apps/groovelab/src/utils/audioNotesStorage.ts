// ==============================================================================
// 🏛️ CAMPUS-GROOVELAB AUDIO TIMELINE NOTES STORAGE MANAGER (SoundCloud-Style)
// ==============================================================================

import { supabase } from '../lib/supabase';

export type AudioNoteTag = 'tip' | 'bar' | 'highlight' | 'general';

export interface AudioTimelineNote {
  id: string;
  time: number; // In seconds (e.g. 3.42)
  text: string;
  tag?: AudioNoteTag;
  authorRole: 'teacher' | 'student' | 'admin';
  authorName?: string;
  createdAt: string;
  isPracticed?: boolean;
  practicedAt?: string;
  loopDuration?: number; // In seconds (e.g. 4.0, range 1.0 to 15.0)
}

/**
 * 🛡️ Extrahiert den reinen, unveränderlichen Audiopfad (ohne temporäre JWT-Token oder flüchtige Query-Parameter).
 * Wandelt signierte URLs wie https://.../storage/v1/object/sign/campus-assets/schools/123/rec.mp3?token=...
 * in den kanonischen Schlüssel "schools/123/rec.mp3" um.
 */
export function extractCanonicalAudioKey(audioUrlOrKey: string): string {
  if (!audioUrlOrKey) return 'unknown';
  let clean = audioUrlOrKey.trim();

  // 1. Temporäre Query-Parameter (z. B. ?token=...) und Hash-Fragmente strikt abtrennen
  clean = clean.split('?')[0].split('#')[0];

  // 2. Storage-Bucket-Präfixe abtrennen
  const campusMarker = '/campus-assets/';
  const cIdx = clean.indexOf(campusMarker);
  if (cIdx !== -1) {
    clean = clean.substring(cIdx + campusMarker.length);
  } else {
    const grooveMarker = '/groovelab-assets/';
    const gIdx = clean.indexOf(grooveMarker);
    if (gIdx !== -1) {
      clean = clean.substring(gIdx + grooveMarker.length);
    }
  }

  // 3. Blob-URLs isolieren
  if (clean.startsWith('blob:')) {
    const parts = clean.split('/');
    return `blob_${parts[parts.length - 1] || 'default'}`;
  }

  return clean;
}

// 🛡️ Normalisiert den Speicherschlüssel für persistente & robuste Identifikation
export function normalizeAudioKey(audioUrlOrKey: string): string {
  if (!audioUrlOrKey) return 'unknown';
  const canonical = extractCanonicalAudioKey(audioUrlOrKey);
  return `campus_audio_notes_${canonical.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

/**
 * Ruft alle Timeline-Notizen für eine bestimmte Aufnahme ab (chronologisch sortiert).
 * Prüft den kanonischen Schlüssel und migriert bei Bedarf ältere Cache-Schlüssel.
 */
export function getAudioNotes(audioUrlOrKey: string): AudioTimelineNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = normalizeAudioKey(audioUrlOrKey);
    let raw = localStorage.getItem(key);
    
    // Fallback & Migration für Legacy-Keys (ohne Query-Bereinigung)
    if (!raw && audioUrlOrKey) {
      const legacyKey = `campus_audio_notes_${audioUrlOrKey.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw) {
        raw = legacyRaw;
        // Automatische Migration auf den sauberen kanonischen Key
        localStorage.setItem(key, legacyRaw);
      }
    }

    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => a.time - b.time);
  } catch (err) {
    console.warn('[audioNotesStorage] Failed to read notes for:', audioUrlOrKey, err);
    return [];
  }
}

/**
 * Fügt eine neue Timeline-Notiz hinzu und speichert sie persistent.
 */
export function addAudioNote(
  audioUrlOrKey: string,
  noteData: {
    time: number;
    text: string;
    tag?: AudioNoteTag;
    authorRole?: 'teacher' | 'student' | 'admin';
    authorName?: string;
  }
): AudioTimelineNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = normalizeAudioKey(audioUrlOrKey);
    const existing = getAudioNotes(audioUrlOrKey);
    const newNote: AudioTimelineNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      time: Math.max(0, Number(noteData.time.toFixed(2))),
      text: noteData.text.trim(),
      tag: noteData.tag || 'general',
      authorRole: noteData.authorRole || 'teacher',
      authorName: noteData.authorName?.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    const updated = [...existing, newNote].sort((a, b) => a.time - b.time);
    localStorage.setItem(key, JSON.stringify(updated));

    // 🛡️ Asynchroner Revisionssicherer Server-Sync im Hintergrund
    saveAudioNoteToServer(audioUrlOrKey, {
      time: newNote.time,
      text: newNote.text,
      tag: newNote.tag,
      loopDuration: newNote.loopDuration
    }).catch(err => console.warn('[audioNotesStorage] Background server sync error (add):', err));

    window.dispatchEvent(
      new CustomEvent('campus-audio-notes-changed', {
        detail: { audioUrlOrKey, count: updated.length }
      })
    );
    return updated;
  } catch (err) {
    console.warn('[audioNotesStorage] Failed to add note:', err);
    return getAudioNotes(audioUrlOrKey);
  }
}

/**
 * Aktualisiert eine bestehende Timeline-Notiz.
 */
export function updateAudioNote(
  audioUrlOrKey: string,
  noteId: string,
  updates: Partial<Omit<AudioTimelineNote, 'id' | 'createdAt'>>
): AudioTimelineNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = normalizeAudioKey(audioUrlOrKey);
    const existing = getAudioNotes(audioUrlOrKey);
    const updated = existing.map(n => {
      if (n.id === noteId) {
        return {
          ...n,
          ...updates,
          time: updates.time !== undefined ? Math.max(0, Number(updates.time.toFixed(2))) : n.time,
          text: updates.text !== undefined ? updates.text.trim() : n.text
        };
      }
      return n;
    }).sort((a, b) => a.time - b.time);

    localStorage.setItem(key, JSON.stringify(updated));

    // 🛡️ Asynchroner Revisionssicherer Server-Sync im Hintergrund
    const targetNote = updated.find(n => n.id === noteId);
    if (targetNote && !noteId.startsWith('note_')) {
      saveAudioNoteToServer(audioUrlOrKey, {
        markerId: noteId,
        time: targetNote.time,
        text: targetNote.text,
        tag: targetNote.tag,
        loopDuration: targetNote.loopDuration
      }).catch(err => console.warn('[audioNotesStorage] Background server sync error (update):', err));
    }

    window.dispatchEvent(
      new CustomEvent('campus-audio-notes-changed', {
        detail: { audioUrlOrKey, count: updated.length }
      })
    );
    return updated;
  } catch (err) {
    console.warn('[audioNotesStorage] Failed to update note:', err);
    return getAudioNotes(audioUrlOrKey);
  }
}

/**
 * Löscht eine Timeline-Notiz anhand ihrer ID.
 */
export function deleteAudioNote(audioUrlOrKey: string, noteId: string): AudioTimelineNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = normalizeAudioKey(audioUrlOrKey);
    const existing = getAudioNotes(audioUrlOrKey);
    const filtered = existing.filter(n => n.id !== noteId);

    localStorage.setItem(key, JSON.stringify(filtered));

    // 🛡️ Asynchrones Revisionssicheres Soft-Delete auf dem Server
    if (!noteId.startsWith('note_')) {
      deleteAudioNoteOnServer(noteId).catch(err => 
        console.warn('[audioNotesStorage] Background server sync error (delete):', err)
      );
    }

    window.dispatchEvent(
      new CustomEvent('campus-audio-notes-changed', {
        detail: { audioUrlOrKey, count: filtered.length }
      })
    );
    return filtered;
  } catch (err) {
    console.warn('[audioNotesStorage] Failed to delete note:', err);
    return getAudioNotes(audioUrlOrKey);
  }
}

/**
 * Hilfsfunktion zum Abfragen der Anzahl vorhandener Notizen.
 */
export function getAudioNotesCount(audioUrlOrKey: string): number {
  return getAudioNotes(audioUrlOrKey).length;
}

/**
 * 🎯 Schaltet den 'Geübt'-Status einer Notiz um (Schüler-Didaktik-Workflow).
 */
export function toggleAudioNotePracticed(audioUrlOrKey: string, noteId: string): AudioTimelineNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = normalizeAudioKey(audioUrlOrKey);
    const existing = getAudioNotes(audioUrlOrKey);
    const updated = existing.map(n => {
      if (n.id === noteId) {
        const nextState = !n.isPracticed;
        return {
          ...n,
          isPracticed: nextState,
          practicedAt: nextState ? new Date().toISOString() : undefined
        };
      }
      return n;
    });

    localStorage.setItem(key, JSON.stringify(updated));

    // 🛡️ Server-Sync des Übestatus
    if (!noteId.startsWith('note_')) {
      toggleAudioNotePracticedOnServer(noteId).catch(err =>
        console.warn('[audioNotesStorage] Background server sync error (toggle practiced):', err)
      );
    }

    window.dispatchEvent(
      new CustomEvent('campus-audio-notes-changed', {
        detail: { audioUrlOrKey, count: updated.length }
      })
    );
    return updated;
  } catch (err) {
    console.warn('[audioNotesStorage] Failed to toggle practiced status:', err);
    return getAudioNotes(audioUrlOrKey);
  }
}

// ==============================================================================
// 🏛️ REVISIONSSICHERE SUPABASE RPC SERVER-SYNCHRONISATION (OWASP ASVS Level 3)
// ==============================================================================

/**
 * Ruft die autoritativen Marker aus der PostgreSQL-Datenbank ab und aktualisiert den lokalen Cache.
 */
export async function fetchAudioNotesFromServer(
  audioUrlOrKey: string,
  studentId?: string
): Promise<AudioTimelineNote[]> {
  const canonicalKey = extractCanonicalAudioKey(audioUrlOrKey);
  if (!canonicalKey || canonicalKey === 'unknown') return getAudioNotes(audioUrlOrKey);

  try {
    const { data, error } = await supabase.rpc('get_audio_timeline_markers', {
      p_audio_key: canonicalKey,
      p_student_id: studentId || null
    });

    if (error) {
      console.warn('[audioNotesStorage] Failed to fetch markers from server:', error.message);
      return getAudioNotes(audioUrlOrKey);
    }

    if (Array.isArray(data)) {
      const serverNotes: AudioTimelineNote[] = data.map((item: any) => ({
        id: item.id,
        time: typeof item.time === 'number' ? item.time : parseFloat(item.time) || 0,
        text: item.text || '',
        tag: (item.tag as AudioNoteTag) || 'tip',
        authorRole: item.authorRole || 'teacher',
        authorName: item.authorName || undefined,
        createdAt: item.createdAt || new Date().toISOString(),
        isPracticed: Boolean(item.isPracticed),
        practicedAt: item.practicedAt || undefined,
        loopDuration: typeof item.loopDuration === 'number' ? item.loopDuration : parseFloat(item.loopDuration) || 4.0
      })).sort((a, b) => a.time - b.time);

      // Lokalen Cache aktualisieren
      const localKey = normalizeAudioKey(audioUrlOrKey);
      localStorage.setItem(localKey, JSON.stringify(serverNotes));

      window.dispatchEvent(
        new CustomEvent('campus-audio-notes-changed', {
          detail: { audioUrlOrKey, count: serverNotes.length }
        })
      );
      return serverNotes;
    }
  } catch (err) {
    console.warn('[audioNotesStorage] Network error during server fetch:', err);
  }

  return getAudioNotes(audioUrlOrKey);
}

/**
 * Speichert einen Marker autoritativ und revisionssicher auf dem Server.
 */
export async function saveAudioNoteToServer(
  audioUrlOrKey: string,
  noteData: {
    time: number;
    text: string;
    tag?: AudioNoteTag;
    loopDuration?: number;
    studentId?: string;
    markerId?: string;
  }
): Promise<AudioTimelineNote | null> {
  const canonicalKey = extractCanonicalAudioKey(audioUrlOrKey);
  if (!canonicalKey || canonicalKey === 'unknown') return null;

  try {
    const { data, error } = await supabase.rpc('save_audio_timeline_marker', {
      p_audio_key: canonicalKey,
      p_time: noteData.time,
      p_text: noteData.text,
      p_tag: noteData.tag || 'tip',
      p_loop_duration: noteData.loopDuration || 4.0,
      p_student_id: noteData.studentId || null,
      p_marker_id: noteData.markerId || null
    });

    if (error) {
      console.warn('[audioNotesStorage] Server error saving marker:', error.message);
      return null;
    }

    if (data?.success && data?.marker) {
      const m = data.marker;
      return {
        id: m.id,
        time: typeof m.time === 'number' ? m.time : parseFloat(m.time) || 0,
        text: m.text,
        tag: m.tag as AudioNoteTag,
        authorRole: m.authorRole,
        authorName: m.authorName,
        createdAt: m.createdAt,
        isPracticed: Boolean(m.isPracticed),
        practicedAt: m.practicedAt,
        loopDuration: typeof m.loopDuration === 'number' ? m.loopDuration : parseFloat(m.loopDuration) || 4.0
      };
    }
  } catch (err) {
    console.warn('[audioNotesStorage] Network exception saving marker:', err);
  }
  return null;
}

/**
 * Schaltet den 'Geübt'-Status eines Markers revisionssicher auf dem Server um.
 */
export async function toggleAudioNotePracticedOnServer(markerId: string): Promise<boolean> {
  if (!markerId || markerId.startsWith('note_')) return false;
  try {
    const { data, error } = await supabase.rpc('toggle_audio_marker_practiced', {
      p_marker_id: markerId
    });
    if (error) {
      console.warn('[audioNotesStorage] Server error toggling practice status:', error.message);
      return false;
    }
    return Boolean(data?.success);
  } catch (err) {
    console.warn('[audioNotesStorage] Network error toggling practice status:', err);
    return false;
  }
}

/**
 * Führt ein revisionssicheres Soft-Delete eines Markers auf dem Server aus.
 */
export async function deleteAudioNoteOnServer(markerId: string): Promise<boolean> {
  if (!markerId || markerId.startsWith('note_')) return false;
  try {
    const { data, error } = await supabase.rpc('delete_audio_timeline_marker', {
      p_marker_id: markerId
    });
    if (error) {
      console.warn('[audioNotesStorage] Server error deleting marker:', error.message);
      return false;
    }
    return Boolean(data?.success);
  } catch (err) {
    console.warn('[audioNotesStorage] Network error deleting marker:', err);
    return false;
  }
}

/**
 * 📋 Formatiert alle Timeline-Notizen für das digitale Hausaufgabenheft / Übeplan.
 */
export function formatNotesForHomeworkSummary(title: string, notes: AudioTimelineNote[]): string {
  if (!notes || notes.length === 0) return '';
  const header = `🎵 Audio-Übeziele & Takthinweise (${title}):`;
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const lines = notes.map(n => {
    const status = n.isPracticed ? '✓ [Geübt]' : '○ [Offen]';
    const tagLabel = n.tag === 'tip' ? 'Übe-Tipp' : n.tag === 'bar' ? 'Takt/Stelle' : n.tag === 'highlight' ? 'Highlight' : 'Notiz';
    return `${status} [${formatTime(n.time)}] ${tagLabel}: ${n.text}`;
  });

  return `${header}\n${lines.join('\n')}`;
}
