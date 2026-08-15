import { supabase } from '../lib/supabase';

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
const listeners = new Set<(count: number) => void>();

export const subscribePendingOfflineCount = (cb: (count: number) => void): (() => void) => {
  listeners.add(cb);
  cb(getPendingOfflineActionsCount());
  return () => {
    listeners.delete(cb);
  };
};

const notifyListeners = () => {
  const count = getPendingOfflineActionsCount();
  listeners.forEach(cb => {
    try {
      cb(count);
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
      payload,
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
        // Default: upsert
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

  // Save quarantined actions to quarantine log
  if (quarantinedActions.length > 0) {
    try {
      const rawQuarantine = localStorage.getItem(QUARANTINE_KEY);
      const existingQuarantine = rawQuarantine ? JSON.parse(rawQuarantine) : [];
      localStorage.setItem(QUARANTINE_KEY, JSON.stringify([...existingQuarantine, ...quarantinedActions]));
    } catch {
      // Ignore localStorage quarantine write error
    }
  }

  notifyListeners();
  return { success: successCount, failed: failedCount, quarantined: quarantinedCount };
};

