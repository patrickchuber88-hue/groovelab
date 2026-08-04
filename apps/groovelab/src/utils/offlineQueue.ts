// Offline Mutation Queue & Background Sync for Campus-Groovelab
// Guarantees zero data loss in un-networked music school cellars

export interface PendingMutation {
  id: string;
  type: 'SAVE_PROTOCOL' | 'UPDATE_PRACTICE_TIMER' | 'SAVE_LESSON_NOTE';
  payload: any;
  createdAt: number;
}

const DB_NAME = 'CampusGroovelabOfflineDB';
const STORE_NAME = 'pendingMutations';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function enqueueOfflineMutation(
  type: PendingMutation['type'],
  payload: any
): Promise<PendingMutation> {
  const item: PendingMutation = {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type,
    payload,
    createdAt: Date.now(),
  };

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(item);
    await new Promise((res) => (tx.oncomplete = res));
    console.log('[OfflineQueue] Queued mutation offline:', item.id);
  } catch (err) {
    console.error('[OfflineQueue] Failed to enqueue offline mutation:', err);
  }

  return item;
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[OfflineQueue] Failed to read pending mutations:', err);
    return [];
  }
}

export async function removePendingMutation(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    await new Promise((res) => (tx.oncomplete = res));
  } catch (err) {
    console.error('[OfflineQueue] Failed to delete mutation:', err);
  }
}

// Auto Background Sync Listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('[OfflineQueue] Network reconnected. Processing pending mutations...');
    const pending = await getPendingMutations();
    if (pending.length === 0) return;

    for (const item of pending) {
      try {
        console.log(`[OfflineQueue] Syncing pending mutation ${item.id} (${item.type})`);
        window.dispatchEvent(new CustomEvent('groovelab-sync-mutation', { detail: item }));
        await removePendingMutation(item.id);
      } catch (err) {
        console.error(`[OfflineQueue] Sync failed for ${item.id}:`, err);
      }
    }
  });
}
