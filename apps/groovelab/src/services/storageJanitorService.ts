import { supabase } from '../lib/supabase';

export interface JanitorReport {
  scannedFiles: number;
  orphansRemoved: number;
  bytesFreed: number;
  errors: string[];
  lastRunTimestamp: string;
}

/**
 * Robust Storage Janitor Service
 * Automatically scans Supabase Storage for unreferenced orphan audio files
 * that have been deleted in the database or UI and are older than 24 hours.
 */
export const runStorageJanitor = async (bucketName = 'campus-assets'): Promise<JanitorReport> => {
  const report: JanitorReport = {
    scannedFiles: 0,
    orphansRemoved: 0,
    bytesFreed: 0,
    errors: [],
    lastRunTimestamp: new Date().toISOString()
  };

  try {
    console.log(`[StorageJanitor] Starting automated audio storage audit for bucket: ${bucketName}...`);

    // 1. Fetch files in 'audio' folder
    const { data: audioFolderFiles, error: listErr } = await supabase.storage.from(bucketName).list('audio', {
      limit: 500,
      sortBy: { column: 'created_at', order: 'asc' }
    });

    if (listErr) {
      report.errors.push(`Failed to list storage items: ${listErr.message}`);
      return report;
    }

    const allFiles = (audioFolderFiles || []).map(f => ({ ...f, path: `audio/${f.name}` }));

    if (allFiles.length === 0) {
      console.log('[StorageJanitor] No audio files found in storage bucket.');
      return report;
    }

    report.scannedFiles = allFiles.length;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filesToDelete: string[] = [];

    // 2. Fetch all active audio references across DB tables
    const activeAudioUrls = new Set<string>();

    // Table A: student_notes
    const { data: activeNotes, error: notesErr } = await supabase
      .from('student_notes')
      .select('audio_url')
      .not('audio_url', 'is', null);

    if (notesErr) {
      console.warn('[StorageJanitor] Could not fetch student_notes audio references:', notesErr.message);
    } else if (activeNotes) {
      activeNotes.forEach(n => {
        if (n.audio_url) activeAudioUrls.add(String(n.audio_url));
      });
    }

    // Table B: progress_matrix (homework_notes with AUDIO: or LOOP: or direct URLs)
    const { data: progressNotes, error: progressErr } = await supabase
      .from('progress_matrix')
      .select('homework_notes')
      .not('homework_notes', 'is', null);

    if (progressErr) {
      console.warn('[StorageJanitor] Could not fetch progress_matrix audio references:', progressErr.message);
    } else if (progressNotes) {
      progressNotes.forEach(p => {
        if (p.homework_notes) {
          const notesStr = typeof p.homework_notes === 'string' ? p.homework_notes : JSON.stringify(p.homework_notes);
          // Match any file names or URLs
          activeAudioUrls.add(notesStr);
        }
      });
    }

    // 3. Compare each storage file against active DB references
    for (const file of allFiles) {
      const createdAt = file.created_at ? new Date(file.created_at) : new Date();
      const isOlderThan24h = createdAt < twentyFourHoursAgo;
      const fileName = file.name;
      const filePath = file.path;

      // Check if file.name or filePath is referenced in activeAudioUrls
      let isReferenced = false;
      for (const ref of activeAudioUrls) {
        if (ref.includes(fileName) || ref.includes(filePath)) {
          isReferenced = true;
          break;
        }
      }

      if (isOlderThan24h && !isReferenced) {
        filesToDelete.push(filePath);
        report.bytesFreed += (file.metadata?.size || 0);
      }
    }

    // 4. Physically delete unreferenced orphan audio files
    if (filesToDelete.length > 0) {
      console.log(`[StorageJanitor] Removing ${filesToDelete.length} unreferenced orphan audio files from ${bucketName}...`);
      const { error: removeErr } = await supabase.storage.from(bucketName).remove(filesToDelete);
      if (removeErr) {
        report.errors.push(`Failed to remove orphan files: ${removeErr.message}`);
      } else {
        report.orphansRemoved = filesToDelete.length;
        console.log(`[StorageJanitor] Successfully physically deleted ${filesToDelete.length} orphan audio files (${(report.bytesFreed / 1024).toFixed(2)} KB freed).`);
      }
    } else {
      console.log('[StorageJanitor] Storage audit complete: 0 orphan audio files eligible for deletion.');
    }
  } catch (e: any) {
    console.error('[StorageJanitor] Unexpected error running storage janitor:', e);
    report.errors.push(e.message || String(e));
  }

  // Save last run report in localStorage for audit transparency
  try {
    localStorage.setItem('groovelab_storage_janitor_last_report', JSON.stringify(report));
    localStorage.setItem('groovelab_storage_janitor_last_run', Date.now().toString());
  } catch (err) {
    // Ignore localStorage errors
  }

  return report;
};
