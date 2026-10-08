/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: Notenschnipsel-Service
 * teacherScoreSnippetService.ts
 * 
 * Verwaltet persistente Notenschnipsel (MicroScores, 1–4 Takte) für Lehrkräfte.
 * - PostgreSQL SSOT via Supabase (`public.teacher_score_snippets`)
 * - Automatischer SWR-LocalStorage Fallback für Offline-Überäume
 * - Kuratierte Standard-Notenschnipsel für sofortigen Start
 */

import { supabase } from '../lib/supabase';
import { MicroScoreSnippet } from '../components/student/meisterwerk/microscore/microScore.types';
import { VDM_SCORE_SNIPPETS, VDM_CATEGORIES, isOwnScoreSnippet } from './vdmScoreSnippetCatalog';

export { VDM_SCORE_SNIPPETS, VDM_CATEGORIES, isOwnScoreSnippet };

export const STARTER_SCORE_SNIPPETS: MicroScoreSnippet[] = VDM_SCORE_SNIPPETS;

function getLocalCacheKey(teacherId: string): string {
  return `campus_teacher_score_snippets_${teacherId}`;
}

export async function fetchTeacherScoreSnippets(
  teacherId: string,
  schoolId?: string
): Promise<MicroScoreSnippet[]> {
  const localKey = getLocalCacheKey(teacherId || 'local');
  let cachedSnippets: MicroScoreSnippet[] = [];

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) cachedSnippets = parsed;
      }
    } catch {}
  }

  // Hilfsfunktion: Mergen von Custom Snippets mit VdM-Standard
  const mergeWithVdm = (customList: MicroScoreSnippet[]): MicroScoreSnippet[] => {
    // Nur echte Custom-Snippets behalten (keine VdM-Katalog-Presets als Dubletten)
    const customOnly = customList.filter(s => isOwnScoreSnippet(s));
    const combined = [...customOnly];
    for (const vdm of VDM_SCORE_SNIPPETS) {
      if (!combined.some(s => s.id === vdm.id)) {
        combined.push(vdm);
      }
    }
    return combined;
  };

  try {
    if (teacherId && schoolId) {
      const { data, error } = await supabase
        .from('teacher_score_snippets')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const dbSnippets: MicroScoreSnippet[] = data.map(row => {
          const payload = row.snippet_data || {};
          return {
            id: row.id,
            title: row.title || payload.title || 'Notenschnipsel',
            instrument: row.instrument || payload.instrument || 'piano',
            timeSignature: payload.timeSignature || '4/4',
            tempoBpm: row.tempo_bpm || payload.tempoBpm || 80,
            barsCount: row.bars_count || payload.barsCount || 2,
            displayMode: row.display_mode || payload.displayMode || 'notes',
            notes: Array.isArray(payload.notes) ? payload.notes : [],
            chords: Array.isArray(payload.chords) ? payload.chords : [],
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            authorRole: 'teacher',
            category: row.category || payload.category || 'Eigene',
            vdmFolder: payload.vdmFolder,
            vdmLevel: payload.vdmLevel,
            description: payload.description,
            tags: payload.tags
          };
        });

        const fullList = mergeWithVdm(dbSnippets);

        // Merge mit lokalen Starter-Snippets
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(localKey, JSON.stringify(fullList));
          } catch {}
        }
        return fullList;
      }
    }
  } catch (err) {
    console.warn('[teacherScoreSnippetService] DB fetch failed, using local cache:', err);
  }

  // Fallback auf Local Cache (gemerged mit VdM) oder reinen VdM-Katalog
  if (cachedSnippets.length > 0) {
    return mergeWithVdm(cachedSnippets);
  }

  return VDM_SCORE_SNIPPETS;
}

export async function saveTeacherScoreSnippet(
  teacherId: string,
  schoolId: string,
  snippet: MicroScoreSnippet
): Promise<{ success: boolean; snippet?: MicroScoreSnippet; error?: string }> {
  if (!snippet.title?.trim()) {
    return { success: false, error: 'Bitte gib dem Notenschnipsel einen Titel.' };
  }

  const normalizedSnippet: MicroScoreSnippet = {
    ...snippet,
    id: snippet.id || `snip-${Date.now()}`,
    title: snippet.title.trim(),
    updatedAt: new Date().toISOString(),
    authorRole: 'teacher',
    category: snippet.category && snippet.category !== 'Alle' ? snippet.category : 'Eigene'
  };

  const localKey = getLocalCacheKey(teacherId || 'local');

  // 1. Zuerst sofort im LocalStorage spiegeln (Optimistic UI)
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(localKey);
      let list: MicroScoreSnippet[] = raw ? JSON.parse(raw) : [];
      const customOnly = list.filter(s => isOwnScoreSnippet(s));
      const idx = customOnly.findIndex(s => s.id === normalizedSnippet.id);
      if (idx >= 0) {
        customOnly[idx] = normalizedSnippet;
      } else {
        customOnly.unshift(normalizedSnippet);
      }
      const fullList = [...customOnly];
      for (const vdm of VDM_SCORE_SNIPPETS) {
        if (!fullList.some(s => s.id === vdm.id)) {
          fullList.push(vdm);
        }
      }
      localStorage.setItem(localKey, JSON.stringify(fullList));
      localStorage.setItem(`campus_microscore_${normalizedSnippet.id}`, JSON.stringify(normalizedSnippet));
    } catch (e) {
      console.warn('[teacherScoreSnippetService] LocalStorage error:', e);
    }
  }

  // 2. Autoritativ in PostgreSQL schreiben (wenn online)
  if (teacherId && schoolId) {
    try {
      const payloadToSave = {
        title: normalizedSnippet.title,
        instrument: normalizedSnippet.instrument || 'piano',
        tempo_bpm: normalizedSnippet.tempoBpm || 80,
        bars_count: normalizedSnippet.barsCount || 2,
        display_mode: normalizedSnippet.displayMode || 'notes',
        category: normalizedSnippet.category || 'Eigene',
        snippet_data: normalizedSnippet,
        school_id: schoolId,
        teacher_id: teacherId,
        updated_at: new Date().toISOString()
      };

      // Prüfen, ob ID eine echte UUID ist
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizedSnippet.id);

      if (isUuid) {
        const { error: updErr } = await supabase
          .from('teacher_score_snippets')
          .update(payloadToSave)
          .eq('id', normalizedSnippet.id);

        if (!updErr) {
          return { success: true, snippet: normalizedSnippet };
        }
      }

      // Neu anlegen
      const { data: insData, error: insErr } = await supabase
        .from('teacher_score_snippets')
        .insert(payloadToSave)
        .select()
        .single();

      if (!insErr && insData) {
        normalizedSnippet.id = insData.id;
        if (typeof window !== 'undefined') {
          localStorage.setItem(`campus_microscore_${insData.id}`, JSON.stringify(normalizedSnippet));
          try {
            const raw = localStorage.getItem(localKey);
            if (raw) {
              let list: MicroScoreSnippet[] = JSON.parse(raw);
              list = list.map(s => s.id === snippet.id ? { ...normalizedSnippet, id: insData.id } : s);
              localStorage.setItem(localKey, JSON.stringify(list));
            }
          } catch {}
        }
        return { success: true, snippet: normalizedSnippet };
      }
    } catch (dbErr) {
      console.warn('[teacherScoreSnippetService] DB write failed, fallback saved locally:', dbErr);
    }
  }

  return { success: true, snippet: normalizedSnippet };
}

export async function deleteTeacherScoreSnippet(
  snippetId: string,
  teacherId: string
): Promise<boolean> {
  const localKey = getLocalCacheKey(teacherId || 'local');

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const list: MicroScoreSnippet[] = JSON.parse(raw);
        const filtered = list.filter(s => s.id !== snippetId);
        localStorage.setItem(localKey, JSON.stringify(filtered));
      }
      localStorage.removeItem(`campus_microscore_${snippetId}`);
    } catch {}
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(snippetId);
    if (isUuid) {
      await supabase
        .from('teacher_score_snippets')
        .delete()
        .eq('id', snippetId);
    }
  } catch (err) {
    console.warn('[teacherScoreSnippetService] Delete warning:', err);
  }

  return true;
}
