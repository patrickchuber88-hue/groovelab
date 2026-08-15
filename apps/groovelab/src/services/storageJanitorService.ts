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
 * Includes complete pagination and defensive safeguards against false-positive deletions.
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

    // 1. Fetch all files in 'audio' folder using paginated loop
    const allFiles: Array<{ name: string; path: string; created_at?: string | null; metadata?: any }> = [];
    let offset = 0;
    const batchSize = 100;
    let hasMoreStorageFiles = true;

    while (hasMoreStorageFiles) {
      const { data: pageFiles, error: listErr } = await supabase.storage.from(bucketName).list('audio', {
        limit: batchSize,
        offset,
        sortBy: { column: 'created_at', order: 'asc' }
      });

      if (listErr) {
        report.errors.push(`Failed to list storage items at offset ${offset}: ${listErr.message}`);
        return report;
      }

      if (!pageFiles || pageFiles.length === 0) {
        hasMoreStorageFiles = false;
      } else {
        pageFiles.forEach(f => {
          if (f.name && f.name !== '.emptyFolderPlaceholder') {
            allFiles.push({ ...f, path: `audio/${f.name}` });
          }
        });
        if (pageFiles.length < batchSize) {
          hasMoreStorageFiles = false;
        } else {
          offset += batchSize;
        }
      }
    }

    if (allFiles.length === 0) {
      console.log('[StorageJanitor] No audio files found in storage bucket.');
      return report;
    }

    report.scannedFiles = allFiles.length;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filesToDelete: string[] = [];

    // 2. Fetch all active audio references across DB tables with chunked pagination (1,000 items/page)
    const activeAudioUrls = new Set<string>();
    let dbFetchErrorOccurred = false;

    // Helper to fetch all rows in batches
    const fetchAllRows = async (table: string, column: string): Promise<any[]> => {
      const rows: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from(table)
          .select(column)
          .not(column, 'is', null)
          .range(from, from + step - 1);

        if (error) {
          console.warn(`[StorageJanitor] Error fetching ${table}.${column} batch (${from}-${from + step}):`, error.message);
          dbFetchErrorOccurred = true;
          report.errors.push(`DB Query error for ${table}.${column}: ${error.message}`);
          break;
        }

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          rows.push(...data);
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        }
      }
      return rows;
    };

    // Table A: student_notes
    const activeNotes = await fetchAllRows('student_notes', 'audio_url');
    activeNotes.forEach(n => {
      if (n.audio_url) activeAudioUrls.add(String(n.audio_url));
    });

    // Table B: progress_matrix (homework_notes with AUDIO: or LOOP: or direct URLs)
    const progressNotes = await fetchAllRows('progress_matrix', 'homework_notes');
    progressNotes.forEach(p => {
      if (p.homework_notes) {
        const notesStr = typeof p.homework_notes === 'string' ? p.homework_notes : JSON.stringify(p.homework_notes);
        activeAudioUrls.add(notesStr);
      }
    });

    // Table C: audio_recordings (if table exists)
    try {
      const audioRecordings = await fetchAllRows('audio_recordings', 'audio_url');
      audioRecordings.forEach(a => {
        if (a.audio_url) activeAudioUrls.add(String(a.audio_url));
      });
    } catch {
      // Ignore if table does not exist
    }

    // Defensive Safety Guard: If database query errors occurred, abort deletion to prevent data loss
    if (dbFetchErrorOccurred) {
      console.warn('[StorageJanitor] Aborting file deletion: DB reference queries reported errors. Safety guard engaged.');
      report.errors.push('Aborted deletion: Database reference verification incomplete.');
      return report;
    }

    // 3. Compare each storage file against active DB references
    for (const file of allFiles) {
      const createdAt = file.created_at ? new Date(file.created_at) : new Date();
      const isOlderThan24h = createdAt < twentyFourHoursAgo;
      const fileName = file.name;
      const filePath = file.path;

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

    // 4. Physically delete unreferenced orphan audio files in batches of 50
    if (filesToDelete.length > 0) {
      console.log(`[StorageJanitor] Removing ${filesToDelete.length} unreferenced orphan audio files from ${bucketName}...`);
      const deleteBatchSize = 50;
      for (let i = 0; i < filesToDelete.length; i += deleteBatchSize) {
        const chunk = filesToDelete.slice(i, i + deleteBatchSize);
        const { error: removeErr } = await supabase.storage.from(bucketName).remove(chunk);
        if (removeErr) {
          report.errors.push(`Failed to remove orphan chunk: ${removeErr.message}`);
        } else {
          report.orphansRemoved += chunk.length;
        }
      }
      console.log(`[StorageJanitor] Successfully physically deleted ${report.orphansRemoved} orphan audio files (${(report.bytesFreed / 1024).toFixed(2)} KB freed).`);
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
