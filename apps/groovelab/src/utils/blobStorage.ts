// IndexedDB Binary & Audio Blob Storage Manager for Campus-Groovelab
// Prevents LocalStorage QuotaExceededError when storing loopstation audio or heavy images
// 🛡️ Hardened with Pre-Flight Quota-Radar & Smart LRU Eviction (Art. 32 DSGVO)

import { checkStorageAvailability, pruneStorageIfNecessary } from './storageQuotaManager';

const DB_NAME = 'CampusGroovelabBlobDB';
const STORE_NAME = 'binaryBlobs';
const DB_VERSION = 1;

function openBlobDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Stores a Blob or ArrayBuffer in IndexedDB by key.
 * 🛡️ Hardened with Pre-Flight Quota Radar and Emergency LRU Pruning
 */
export async function storeBlob(key: string, blob: Blob | ArrayBuffer): Promise<void> {
  const sizeBytes = blob instanceof Blob ? blob.size : (blob?.byteLength || 0);

  // 1. Proaktive Quota-Prüfung
  try {
    const quotaInfo = await checkStorageAvailability(sizeBytes);
    if (quotaInfo.isCritical) {
      console.warn('[BlobStorage] Storage critical before writing blob. Pruning LRU cache...');
      await pruneStorageIfNecessary(50 * 1024 * 1024);
    }
  } catch (qErr) {
    console.warn('[BlobStorage] Quota pre-flight check bypassed:', qErr);
  }

  // 2. Primärer Schreibversuch mit Notfall-Retry
  try {
    const db = await openBlobDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(blob, key);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    console.log(`[BlobStorage] Stored binary blob for key: ${key}`);
  } catch (err: any) {
    const isQuotaErr =
      err?.name === 'QuotaExceededError' ||
      String(err?.message || '').toLowerCase().includes('quota');

    if (isQuotaErr) {
      console.warn(`[BlobStorage] Quota exceeded on key ${key}. Triggering emergency prune & retry...`);
      try {
        await pruneStorageIfNecessary(100 * 1024 * 1024);
        const retryDb = await openBlobDB();
        const retryTx = retryDb.transaction(STORE_NAME, 'readwrite');
        const retryStore = retryTx.objectStore(STORE_NAME);
        retryStore.put(blob, key);
        await new Promise((resolve, reject) => {
          retryTx.oncomplete = resolve;
          retryTx.onerror = () => reject(retryTx.error);
        });
        console.log(`[BlobStorage] Successfully stored blob after emergency prune for key: ${key}`);
        return;
      } catch (retryErr) {
        console.error(`[BlobStorage] Device storage full; unable to persist blob ${key}:`, retryErr);
        return;
      }
    }

    console.error(`[BlobStorage] Failed to store blob for key ${key}:`, err);
  }
}

/**
 * Retrieves a Blob or ArrayBuffer from IndexedDB by key.
 */
export async function getBlob(key: string): Promise<Blob | ArrayBuffer | null> {
  try {
    const db = await openBlobDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`[BlobStorage] Failed to read blob for key ${key}:`, err);
    return null;
  }
}

/**
 * Removes a Blob from IndexedDB by key.
 */
export async function deleteBlob(key: string): Promise<void> {
  try {
    const db = await openBlobDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error(`[BlobStorage] Failed to delete blob for key ${key}:`, err);
  }
}
