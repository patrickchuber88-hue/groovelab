/**
 * Offline Audio Vault (IndexedDB) for Campus-Groovelab
 * Guarantees 100% lossless, Bit-perfect storage of audio recordings
 * even in un-networked music school cellars, bunkers, and practice rooms.
 */

export interface OfflineAudioRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  durationSeconds?: number;
  studentId?: string;
  teacherId?: string;
  schoolId?: string;
  context: 'homework' | 'meisterwerk' | 'practice_session' | 'lesson_note' | 'voice_memo';
  title?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  syncAttempts?: number;
  lastError?: string;
}

const DB_NAME = 'CampusGroovelabOfflineAudioVault';
const STORE_NAME = 'offlineAudioBlobs';
const DB_VERSION = 1;

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[OfflineAudioVault] Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('context', 'context', { unique: false });
        store.createIndex('studentId', 'studentId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Save an uncompressed/studio-quality audio Blob into IndexedDB
 */
export async function saveOfflineAudioRecord(record: Omit<OfflineAudioRecord, 'id' | 'createdAt'> & { id?: string }): Promise<OfflineAudioRecord> {
  const finalRecord: OfflineAudioRecord = {
    ...record,
    id: record.id || `audio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: Date.now(),
    syncAttempts: 0
  };

  try {
    const db = await openAudioDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(finalRecord);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    console.log('[OfflineAudioVault] Audio record saved locally in lossless format:', finalRecord.id);
  } catch (err) {
    console.error('[OfflineAudioVault] Error saving audio record:', err);
    throw err;
  }

  return finalRecord;
}

/**
 * Retrieve a specific offline audio record by ID
 */
export async function getOfflineAudioRecord(id: string): Promise<OfflineAudioRecord | null> {
  try {
    const db = await openAudioDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[OfflineAudioVault] Failed to retrieve audio record:', err);
    return null;
  }
}

/**
 * Retrieve all pending offline audio records
 */
export async function getAllPendingAudioRecords(): Promise<OfflineAudioRecord[]> {
  try {
    const db = await openAudioDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[OfflineAudioVault] Failed to retrieve all pending records:', err);
    return [];
  }
}

/**
 * Get count of pending offline audio records
 */
export async function getPendingAudioCount(): Promise<number> {
  try {
    const records = await getAllPendingAudioRecords();
    return records.length;
  } catch {
    return 0;
  }
}

/**
 * Remove an audio record from IndexedDB once uploaded
 */
export async function removeOfflineAudioRecord(id: string): Promise<void> {
  try {
    const db = await openAudioDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    console.log('[OfflineAudioVault] Removed synced audio record:', id);
  } catch (err) {
    console.error('[OfflineAudioVault] Error removing audio record:', err);
  }
}
