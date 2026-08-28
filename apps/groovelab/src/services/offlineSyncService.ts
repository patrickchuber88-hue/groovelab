import { supabase } from '../lib/supabase';
import { 
  getAllPendingAudioRecords, 
  removeOfflineAudioRecord, 
  getPendingAudioCount,
  OfflineAudioRecord 
} from '../utils/offlineAudioVault';

export type OfflineOperationType = 'upsert' | 'delete' | 'insert';

export interface PendingSyncAction {
  id: string;
  table: string;
  payload: any;
  timestamp: string;
  actionType?: OfflineOperationType;
  matchCriteria?: Record<string, any>; // Used for delete operations e.g. { id: '...' }
  attempts?: number;
  lastError?: string;
}

const STORAGE_KEY = 'groovelab_pending_offline_sync';
const QUARANTINE_KEY = 'groovelab_quarantined_offline_sync';
const MAX_RETRY_ATTEMPTS = 5;

// Subscribers for UI reactive updates
export interface OfflineQueueState {
  pendingActionsCount: number;
  pendingAudioCount: number;
  totalPending: number;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncTime: number | null;
}

const listeners = new Set<(state: OfflineQueueState) => void>();
let isCurrentlySyncing = false;
let lastSuccessfulSyncTime: number | null = null;

export const getOfflineState = async (): Promise<OfflineQueueState> => {
  const actionsCount = getPendingSyncActions().length;
  const audioCount = await getPendingAudioCount();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return {
    pendingActionsCount: actionsCount,
    pendingAudioCount: audioCount,
    totalPending: actionsCount + audioCount,
    isSyncing: isCurrentlySyncing,
    isOnline,
    lastSyncTime: lastSuccessfulSyncTime
  };
};

export const subscribeOfflineState = (cb: (state: OfflineQueueState) => void): (() => void) => {
  listeners.add(cb);
  getOfflineState().then(st => cb(st));
  return () => {
    listeners.delete(cb);
  };
};

export const subscribePendingOfflineCount = (cb: (count: number) => void): (() => void) => {
  return subscribeOfflineState((state) => {
    cb(state.totalPending);
  });
};

const notifyListeners = async () => {
  const state = await getOfflineState();
  listeners.forEach(cb => {
    try {
      cb(state);
    } catch {
      // Ignore subscriber errors
    }
  });
};

export const getPendingSyncActions = (): PendingSyncAction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[OfflineSync] Failed to read pending actions:', e);
    return [];
  }
};

export const getPendingOfflineActionsCount = (): number => {
  return getPendingSyncActions().length;
};

export const enqueueOfflineAction = (
  table: string,
  payload: any,
  options?: {
    actionType?: OfflineOperationType;
    matchCriteria?: Record<string, any>;
  }
): void => {
  try {
    const actions = getPendingSyncActions();
    const newAction: PendingSyncAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      table,
      payload: {
        ...payload,
        updated_at: payload.updated_at || new Date().toISOString()
      },
      actionType: options?.actionType || 'upsert',
      matchCriteria: options?.matchCriteria,
      timestamp: new Date().toISOString(),
      attempts: 0
    };
    actions.push(newAction);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
    notifyListeners();
    console.log('[OfflineSync] Action enqueued for offline sync:', newAction);
  } catch (e) {
    console.error('[OfflineSync] Failed to enqueue offline action:', e);
  }
};

/**
 * Flush audio records from IndexedDB Audio Vault to Supabase Storage
 */
export const flushOfflineAudioQueue = async (): Promise<{ success: number; failed: number }> => {
  let successCount = 0;
  let failedCount = 0;

  try {
    const records = await getAllPendingAudioRecords();
    if (records.length === 0) return { success: 0, failed: 0 };

    console.log(`[OfflineSync] Flushing ${records.length} pending lossless audio records from IndexedDB...`);

    for (const record of records) {
      try {
        const fileExt = record.mimeType?.includes('wav') ? 'wav' : (record.mimeType?.includes('ogg') ? 'ogg' : 'webm');
        const filename = `offline_${record.context}_${record.studentId || 'unknown'}_${record.id}.${fileExt}`;
        const filePath = `recordings/${filename}`;

        // 1. Upload lossless Blob to Supabase Storage bucket 'student-recordings' or 'audio'
        const { error: uploadError } = await supabase.storage
          .from('student-recordings')
          .upload(filePath, record.blob, {
            contentType: record.mimeType || 'audio/webm',
            upsert: true
          });

        if (uploadError) {
          console.warn('[OfflineSync] Upload to student-recordings failed, trying fallback bucket:', uploadError);
          const { error: fallbackErr } = await supabase.storage
            .from('audio')
            .upload(filePath, record.blob, {
              contentType: record.mimeType || 'audio/webm',
              upsert: true
            });
          if (fallbackErr) throw fallbackErr;
        }

        const { data: publicUrlData } = supabase.storage
          .from('student-recordings')
          .getPublicUrl(filePath);

        const finalAudioUrl = publicUrlData?.publicUrl || filePath;

        // 2. If metadata indicates linked database table (e.g. campus_homework_notes or student_progress)
        if (record.metadata?.syncTable && record.metadata?.syncPayload) {
          const syncPayload = {
            ...record.metadata.syncPayload,
            audio_url: finalAudioUrl,
            updated_at: new Date().toISOString()
          };
          const { error: dbErr } = await supabase
            .from(record.metadata.syncTable)
            .upsert(syncPayload);
          if (dbErr) throw dbErr;
        }

        // 3. Remove from IndexedDB
        await removeOfflineAudioRecord(record.id);
        successCount++;
        console.log('[OfflineSync] Successfully synced offline audio record:', record.id);
      } catch (err: any) {
        console.error(`[OfflineSync] Error syncing audio record ${record.id}:`, err);
        failedCount++;
      }
    }
  } catch (err) {
    console.error('[OfflineSync] Error in flushOfflineAudioQueue:', err);
  }

  return { success: successCount, failed: failedCount };
};

/**
 * Flush pending database mutations with Smart Conflict Resolution (Last-Write-Wins)
 */
export const flushOfflineSyncQueue = async (): Promise<{ success: number; failed: number; quarantined: number }> => {
  const actions = getPendingSyncActions();
  if (actions.length === 0) return { success: 0, failed: 0, quarantined: 0 };

  console.log(`[OfflineSync] Flushing ${actions.length} pending offline actions...`);
  let successCount = 0;
  let failedCount = 0;
  let quarantinedCount = 0;
  const remainingActions: PendingSyncAction[] = [];
  const quarantinedActions: PendingSyncAction[] = [];

  for (const action of actions) {
    const currentAttempts = (action.attempts || 0) + 1;
    try {
      if (action.actionType === 'delete' && action.matchCriteria) {
        let query = supabase.from(action.table).delete();
        Object.entries(action.matchCriteria).forEach(([key, val]) => {
          query = (query as any).eq(key, val);
        });
        const { error } = await query;
        if (error) throw error;
      } else if (action.actionType === 'insert') {
        const { error } = await supabase.from(action.table).insert(action.payload);
        if (error) throw error;
      } else {
        // Smart Conflict Resolution (Opt 6): Last-Write-Wins with Timestamp Comparison
        if (action.payload?.id && action.payload?.updated_at) {
          const { data: remoteRecord } = await supabase
            .from(action.table)
            .select('updated_at')
            .eq('id', action.payload.id)
            .maybeSingle();

          if (remoteRecord?.updated_at && new Date(remoteRecord.updated_at) > new Date(action.payload.updated_at)) {
            console.log(`[OfflineSync] Remote version is newer for ${action.id}. Skipping stale offline write.`);
            successCount++;
            continue;
          }
        }

        const { error } = await supabase.from(action.table).upsert(action.payload);
        if (error) throw error;
      }

      successCount++;
      console.log(`[OfflineSync] Synced action ${action.id} to ${action.table}`);
    } catch (err: any) {
      console.error(`[OfflineSync] Failed to sync action ${action.id} (attempt ${currentAttempts}/${MAX_RETRY_ATTEMPTS}):`, err);
      failedCount++;

      action.attempts = currentAttempts;
      action.lastError = err?.message || String(err);

      if (currentAttempts >= MAX_RETRY_ATTEMPTS) {
        console.warn(`[OfflineSync] Action ${action.id} exceeded max retries. Moving to quarantine.`);
        quarantinedActions.push(action);
        quarantinedCount++;
      } else {
        remainingActions.push(action);
      }
    }
  }

  // Save remaining retryable actions
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingActions));

  // Save quarantined actions
  if (quarantinedActions.length > 0) {
    try {
      const rawQuarantine = localStorage.getItem(QUARANTINE_KEY);
      const existingQuarantine = rawQuarantine ? JSON.parse(rawQuarantine) : [];
      localStorage.setItem(QUARANTINE_KEY, JSON.stringify([...existingQuarantine, ...quarantinedActions]));
    } catch {
      // Ignore localStorage quarantine write error
    }
  }

  return { success: successCount, failed: failedCount, quarantined: quarantinedCount };
};

/**
 * Flush all offline data (mutations + audio recordings)
 */
export const flushAllOfflineData = async (): Promise<{ mutationsSynced: number; audioSynced: number }> => {
  if (isCurrentlySyncing) return { mutationsSynced: 0, audioSynced: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[OfflineSync] Device is currently offline. Postponing sync.');
    return { mutationsSynced: 0, audioSynced: 0 };
  }

  isCurrentlySyncing = true;
  notifyListeners();

  try {
    const [mutationsResult, audioResult] = await Promise.all([
      flushOfflineSyncQueue(),
      flushOfflineAudioQueue()
    ]);

    lastSuccessfulSyncTime = Date.now();
    return {
      mutationsSynced: mutationsResult.success,
      audioSynced: audioResult.success
    };
  } finally {
    isCurrentlySyncing = false;
    notifyListeners();
  }
};

// Automatic Online Auto-Flush Listener for Tier-1 Offline Resilience
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.info('[OfflineSync] Network connectivity restored. Triggering automatic queue flush...');
    notifyListeners();
    flushAllOfflineData();
  });

  window.addEventListener('offline', () => {
    console.info('[OfflineSync] Device went offline. Activating offline mode...');
    notifyListeners();
  });

  // Background Heartbeat every 60 seconds to retry pending syncs if connected
  setInterval(() => {
    if (navigator.onLine && !isCurrentlySyncing) {
      flushAllOfflineData();
    }
  }, 60000);
}
