import { supabase } from '../lib/supabase';

export interface JanitorReport {
  scannedFiles: number;
  orphansRemoved: number;
  bytesFreed: number;
  errors: string[];
}

export const runStorageJanitor = async (bucketName = 'campus-assets'): Promise<JanitorReport> => {
  const report: JanitorReport = {
    scannedFiles: 0,
    orphansRemoved: 0,
    bytesFreed: 0,
    errors: []
  };

  try {
    console.log(`[StorageJanitor] Starting audit for bucket: ${bucketName}...`);
    const { data: files, error: listErr } = await supabase.storage.from(bucketName).list('audio', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'asc' }
    });

    if (listErr) {
      report.errors.push(`Failed to list storage items: ${listErr.message}`);
      return report;
    }

    if (!files || files.length === 0) {
      console.log('[StorageJanitor] No audio files found in storage.');
      return report;
    }

    report.scannedFiles = files.length;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const filesToDelete: string[] = [];

    // Fetch active audio references from database to ensure no active files are deleted
    const { data: activeNotes, error: notesErr } = await supabase
      .from('student_notes')
      .select('audio_url')
      .not('audio_url', 'is', null);

    if (notesErr) {
      console.warn('[StorageJanitor] Could not fetch student_notes audio references:', notesErr.message);
    }

    const activeAudioUrls = new Set((activeNotes || []).map(n => n.audio_url).filter(Boolean));

    for (const file of files) {
      const createdAt = file.created_at ? new Date(file.created_at) : new Date();
      const isOlderThan7Days = createdAt < sevenDaysAgo;
      const filePath = `audio/${file.name}`;
      const isReferenced = Array.from(activeAudioUrls).some(url => url && typeof url === 'string' && url.includes(file.name));

      if (isOlderThan7Days && !isReferenced) {
        filesToDelete.push(filePath);
        report.bytesFreed += (file.metadata?.size || 0);
      }
    }

    if (filesToDelete.length > 0) {
      console.log(`[StorageJanitor] Removing ${filesToDelete.length} unreferenced orphan audio files...`);
      const { error: removeErr } = await supabase.storage.from(bucketName).remove(filesToDelete);
      if (removeErr) {
        report.errors.push(`Failed to remove orphan files: ${removeErr.message}`);
      } else {
        report.orphansRemoved = filesToDelete.length;
        console.log(`[StorageJanitor] Successfully deleted ${filesToDelete.length} orphan files (${(report.bytesFreed / 1024).toFixed(2)} KB freed).`);
      }
    } else {
      console.log('[StorageJanitor] No orphan files eligible for deletion.');
    }
  } catch (e: any) {
    console.error('[StorageJanitor] Error running storage janitor:', e);
    report.errors.push(e.message || String(e));
  }

  return report;
};
