import { supabase } from '../lib/supabase';

export interface PendingSyncAction {
  id: string;
  table: string;
  payload: any;
  timestamp: string;
}

const STORAGE_KEY = 'groovelab_pending_offline_sync';

export const getPendingSyncActions = (): PendingSyncAction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[OfflineSync] Failed to read pending actions:', e);
    return [];
  }
};

export const enqueueOfflineAction = (table: string, payload: any): void => {
  try {
    const actions = getPendingSyncActions();
    const newAction: PendingSyncAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      table,
      payload,
      timestamp: new Date().toISOString()
    };
    actions.push(newAction);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
    console.log('[OfflineSync] Action enqueued for offline sync:', newAction);
  } catch (e) {
    console.error('[OfflineSync] Failed to enqueue offline action:', e);
  }
};

export const flushOfflineSyncQueue = async (): Promise<{ success: number; failed: number }> => {
  const actions = getPendingSyncActions();
  if (actions.length === 0) return { success: 0, failed: 0 };

  console.log(`[OfflineSync] Flushing ${actions.length} pending offline actions...`);
  let successCount = 0;
  let failedCount = 0;
  const remainingActions: PendingSyncAction[] = [];

  for (const action of actions) {
    try {
      const { error } = await supabase.from(action.table).upsert(action.payload);
      if (error) throw error;
      successCount++;
      console.log(`[OfflineSync] Synced action ${action.id} to ${action.table}`);
    } catch (err) {
      console.error(`[OfflineSync] Failed to sync action ${action.id}:`, err);
      failedCount++;
      remainingActions.push(action);
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingActions));
  return { success: successCount, failed: failedCount };
};
