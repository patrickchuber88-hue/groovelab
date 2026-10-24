/**
 * 🏛️ Campus-Groovelab MicroScore Snapshot Sync Satellite (0,1% Goldstandard)
 * apps/groovelab/src/components/student/meisterwerk/microscore/microScoreSyncSatellite.ts
 *
 * Monolith Ceiling Conformance: Autarker Satellit für die Persistierung von Notenschnipseln
 * in public.progress_matrix Wochen-Container (SSOT).
 */

import { supabase } from '../../../../lib/supabase';

export async function syncMicroScoreSnippetToProgressMatrix(
  studentId: string | undefined | null,
  snippet: any
): Promise<void> {
  if (!studentId || !snippet) return;

  try {
    const { data: matrixRow } = await supabase
      .from('progress_matrix')
      .select('id, homework_notes')
      .eq('student_id', studentId)
      .ilike('topic_name', 'Hausaufgabe KW %')
      .order('is_current_homework', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (matrixRow?.id) {
      let notesList: any[] = [];
      if (matrixRow.homework_notes) {
        try {
          notesList = JSON.parse(matrixRow.homework_notes);
          if (!Array.isArray(notesList)) notesList = [matrixRow.homework_notes];
        } catch {
          notesList = [matrixRow.homework_notes];
        }
      }

      const tokenPrefix = 'MICROSCORE:';
      const snippetToken = `${tokenPrefix}${JSON.stringify(snippet)}`;

      const existingIdx = notesList.findIndex((n: any) => {
        if (typeof n !== 'string' || !n.startsWith(tokenPrefix)) return false;
        try {
          const parsed = JSON.parse(n.slice(tokenPrefix.length));
          return parsed?.id === snippet.id;
        } catch {
          return false;
        }
      });

      if (existingIdx !== -1) {
        notesList[existingIdx] = snippetToken;
      } else {
        notesList.push(snippetToken);
      }

      await supabase
        .from('progress_matrix')
        .update({
          homework_notes: JSON.stringify(notesList),
          is_current_homework: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', matrixRow.id);
    }
  } catch (dbErr) {
    console.warn('[microScoreSyncSatellite] DB sync notice:', dbErr);
  }
}
