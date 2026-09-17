import { supabase } from '../lib/supabase';
import { getEffectiveNetworkProfile } from './networkAwarenessService';
import { registerHeartbeatJob } from './heartbeatOrchestrator';
import { 
  getAllPendingAudioRecords, 
  removeOfflineAudioRecord, 
  getPendingAudioCount,
  saveOfflineMutation,
  getAllOfflineMutations,
  removeOfflineMutation,
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

export const notifyOfflineListeners = async (): Promise<void> => {
  await notifyListeners();
};

let proactiveFlushTimeout: ReturnType<typeof setTimeout> | null = null;
export const triggerProactiveAutoFlush = (delayMs: number = 400): void => {
  if (typeof window === 'undefined') return;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline || isCurrentlySyncing) return;
  if (proactiveFlushTimeout) clearTimeout(proactiveFlushTimeout);
  proactiveFlushTimeout = setTimeout(() => {
    if ((typeof navigator === 'undefined' || navigator.onLine) && !isCurrentlySyncing) {
      flushAllOfflineData().catch(err => console.warn('[OfflineSync] Proactive auto-flush notice:', err));
    }
  }, delayMs);
};

let memoryActionsCache: PendingSyncAction[] = [];
let isCacheLoaded = false;

// Preload & migrate from localStorage to IndexedDB
export const loadAndMigrateOfflineMutations = async (): Promise<PendingSyncAction[]> => {
  try {
    const idbMutations = await getAllOfflineMutations();
    const rawLocal = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const localMutations: PendingSyncAction[] = rawLocal ? JSON.parse(rawLocal) : [];

    // If there are legacy local mutations, migrate them into IndexedDB
    if (localMutations.length > 0) {
      for (const item of localMutations) {
        if (!idbMutations.some(m => m.id === item.id)) {
          await saveOfflineMutation(item).catch(() => {});
          idbMutations.push(item);
        }
      }
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }

    memoryActionsCache = idbMutations;
    isCacheLoaded = true;
    return idbMutations;
  } catch (err) {
    console.warn('[OfflineSync] Error loading/migrating offline mutations:', err);
    return getPendingSyncActionsFallback();
  }
};

// Initial auto-migration & eager auto-flush trigger
if (typeof window !== 'undefined') {
  loadAndMigrateOfflineMutations().then(async () => {
    await notifyListeners();
    // ⚡ Eager Auto-Flush on App Mount: If online, immediately flush all pending actions/audio
    if (typeof navigator !== 'undefined' && navigator.onLine && !isCurrentlySyncing) {
      const state = await getOfflineState();
      if (state.totalPending > 0) {
        console.info(`[OfflineSync] Eager auto-flush triggered on mount (${state.totalPending} pending items)...`);
        flushAllOfflineData().catch(err => console.warn('[OfflineSync] Eager mount flush notice:', err));
      }
    }
  }).catch(() => {});
}

const getPendingSyncActionsFallback = (): PendingSyncAction[] => {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const getPendingSyncActions = (): PendingSyncAction[] => {
  if (isCacheLoaded) {
    return memoryActionsCache;
  }
  return getPendingSyncActionsFallback();
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
    memoryActionsCache.push(newAction);
    isCacheLoaded = true;

    // Persist to IndexedDB asynchronously
    saveOfflineMutation(newAction).catch((err) => {
      console.warn('[OfflineSync] Fallback saving mutation to localStorage:', err);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryActionsCache));
      } catch {}
    });

    notifyListeners();
    console.log('[OfflineSync] Action enqueued for offline sync (IndexedDB):', newAction);

    // ⚡ Proactive Zero-Lag Auto-Flush: If currently online, trigger debounced background sync
    triggerProactiveAutoFlush(300);
  } catch (e) {
    console.error('[OfflineSync] Failed to enqueue offline action:', e);
  }
};

/**
 * Flush audio records from IndexedDB Audio Vault to Supabase Storage
 */
export const flushOfflineAudioQueue = async (forceUpload: boolean = false): Promise<{ success: number; failed: number; postponed?: number }> => {
  let successCount = 0;
  let failedCount = 0;

  try {
    const records = await getAllPendingAudioRecords();
    if (records.length === 0) return { success: 0, failed: 0 };

    const netProfile = getEffectiveNetworkProfile();
    if (!forceUpload && !netProfile.shouldAutoUploadMedia) {
      console.log(`[OfflineSync] Mobile/constrained network active (${netProfile.tier}). Postponing ${records.length} heavy audio uploads until WiFi or manual override.`);
      return { success: 0, failed: 0, postponed: records.length };
    }

    console.log(`[OfflineSync] Flushing ${records.length} pending lossless audio records from IndexedDB...`);

    for (const record of records) {
      try {
        if (!record.blob || (record.blob instanceof Blob && record.blob.size === 0)) {
          console.warn(`[OfflineSync] Audio record ${record.id} has empty blob. Pruning from queue.`);
          await removeOfflineAudioRecord(record.id);
          successCount++;
          continue;
        }

        const fileExt = record.mimeType?.includes('wav') ? 'wav' : (record.mimeType?.includes('ogg') ? 'ogg' : 'webm');
        const defaultFilename = `offline_${record.context}_${record.studentId || 'unknown'}_${record.id}.${fileExt}`;
        const filePath = record.metadata?.storagePath || `recordings/${defaultFilename}`;

        // 1. Upload lossless Blob to Supabase Storage (check 'recordings', then 'student-recordings', then 'audio')
        let uploadSuccess = false;
        let publicUrl = '';

        for (const bucket of ['campus-assets', 'recordings', 'student-recordings', 'audio']) {
          try {
            const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(filePath, record.blob, {
                contentType: record.mimeType || 'audio/webm',
                upsert: true
              });
            if (!uploadError) {
              const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
              publicUrl = urlData?.publicUrl || '';
              uploadSuccess = true;

              // Update school storage quota if schoolId is attached
              const targetSchoolId = record.schoolId || (record.metadata as any)?.schoolId;
              if (targetSchoolId && record.blob?.size) {
                try {
                  const { data: schoolData } = await supabase
                    .from('schools')
                    .select('storage_used_bytes')
                    .eq('id', targetSchoolId)
                    .maybeSingle();
                  if (schoolData) {
                    const currentBytes = Number(schoolData.storage_used_bytes || 0);
                    await supabase
                      .from('schools')
                      .update({ storage_used_bytes: currentBytes + record.blob.size })
                      .eq('id', targetSchoolId);
                  }
                } catch {}
              }
              break;
            }
          } catch {
            // Try next bucket
          }
        }

        if (!uploadSuccess) {
          throw new Error('All storage bucket uploads failed');
        }

        const finalAudioUrl = publicUrl || filePath;

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

        // 4. Trigger cross-tab/cross-view update
        if (record.studentId && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('homework-updated', { detail: { studentId: record.studentId } }));
          window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: record.studentId } }));
        }
      } catch (err: any) {
        console.error(`[OfflineSync] Error syncing audio record ${record.id}:`, err);
        failedCount++;
        const currentAttempts = (record.syncAttempts || 0) + 1;
        if (currentAttempts >= MAX_RETRY_ATTEMPTS) {
          console.warn(`[OfflineSync] Audio record ${record.id} exceeded max retries (${MAX_RETRY_ATTEMPTS}). Pruning from active queue.`);
          await removeOfflineAudioRecord(record.id).catch(() => {});
        }
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
  const actions = await loadAndMigrateOfflineMutations();
  if (actions.length === 0) return { success: 0, failed: 0, quarantined: 0 };

  console.log(`[OfflineSync] Flushing ${actions.length} pending offline actions from IndexedDB...`);
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
        // Smart Conflict Resolution: Compare timestamps before upserting
        if (action.payload?.id && action.payload?.updated_at) {
          const { data: remoteRecord } = await supabase
            .from(action.table)
            .select('updated_at')
            .eq('id', action.payload.id)
            .maybeSingle();

          if (remoteRecord?.updated_at && new Date(remoteRecord.updated_at) > new Date(action.payload.updated_at)) {
            console.log(`[OfflineSync] Remote version is newer for ${action.id}. Skipping stale offline write.`);
            await removeOfflineMutation(action.id);
            successCount++;
            continue;
          }
        }

        const { error } = await supabase.from(action.table).upsert(action.payload);
        if (error) throw error;
      }

      await removeOfflineMutation(action.id);
      successCount++;
      console.log(`[OfflineSync] Synced action ${action.id} to ${action.table}`);
    } catch (err: any) {
      console.error(`[OfflineSync] Failed to sync action ${action.id} (attempt ${currentAttempts}/${MAX_RETRY_ATTEMPTS}):`, err);
      failedCount++;

      action.attempts = currentAttempts;
      action.lastError = err?.message || String(err);

      if (currentAttempts >= MAX_RETRY_ATTEMPTS) {
        console.warn(`[OfflineSync] Action ${action.id} exceeded max retries. Moving to quarantine.`);
        await removeOfflineMutation(action.id);
        quarantinedActions.push(action);
        quarantinedCount++;
      } else {
        await saveOfflineMutation(action).catch(() => {});
        remainingActions.push(action);
      }
    }
  }

  // Update memory cache and notify listeners
  memoryActionsCache = remainingActions;
  notifyListeners();

  // Save quarantined actions
  if (quarantinedActions.length > 0) {
    try {
      const rawQuarantine = typeof localStorage !== 'undefined' ? localStorage.getItem(QUARANTINE_KEY) : null;
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
export const flushAllOfflineData = async (forceAudioUpload: boolean = false): Promise<{ mutationsSynced: number; audioSynced: number }> => {
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
      flushOfflineAudioQueue(forceAudioUpload)
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

  // 1% Goldstandard: Register visibility-aware heartbeat (auto-pauses when tab is hidden)
  registerHeartbeatJob({
    id: 'offline-sync-flush',
    intervalMs: 60000,
    runImmediatelyOnWakeup: true,
    onTick: () => {
      if (typeof navigator !== 'undefined' && navigator.onLine && !isCurrentlySyncing) {
        flushAllOfflineData();
      }
    }
  });
}
