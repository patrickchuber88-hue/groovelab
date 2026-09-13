/**
 * Storage Persistence & Quota Utility for Campus-Groovelab PWA
 * 
 * Guarantees tier-1 data durability:
 * - Requests persistent storage via navigator.storage.persist() to protect
 *   offline recordings & homework queues from WebKit ITP 7-day purging.
 * - Monitors available disk space before large audio recording sessions.
 */

export interface StorageQuotaInfo {
  hasEnoughSpace: boolean;
  percentUsed: number;
  freeBytes: number;
  usageBytes: number;
  quotaBytes: number;
}

/**
 * Checks if persistent storage is already granted.
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch (e) {
      console.warn('[Storage] Error checking storage persistence:', e);
      return false;
    }
  }
  return false;
}

/**
 * Requests persistent storage from the browser / operating system.
 * Returns true if persistent storage is granted.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) {
    return false;
  }

  try {
    const alreadyPersisted = await navigator.storage.persisted();
    if (alreadyPersisted) {
      return true;
    }

    const granted = await navigator.storage.persist();
    if (granted) {
      console.log('[Storage] Persistent storage granted by OS/Browser.');
    } else {
      console.info('[Storage] Persistent storage not granted; running in default storage mode.');
    }
    return granted;
  } catch (error) {
    console.warn('[Storage] Could not request persistent storage:', error);
    return false;
  }
}

/**
 * Estimates remaining storage space.
 * Returns whether at least minFreeBytes (default 50 MB) are available.
 */
export async function checkStorageQuota(minFreeBytes: number = 50 * 1024 * 1024): Promise<StorageQuotaInfo> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
    return {
      hasEnoughSpace: true,
      percentUsed: 0,
      freeBytes: Number.MAX_SAFE_INTEGER,
      usageBytes: 0,
      quotaBytes: Number.MAX_SAFE_INTEGER
    };
  }

  try {
    const { quota = 0, usage = 0 } = await navigator.storage.estimate();
    const freeBytes = Math.max(0, quota - usage);
    const percentUsed = quota > 0 ? Math.round((usage / quota) * 100) : 0;

    return {
      hasEnoughSpace: freeBytes >= minFreeBytes,
      percentUsed,
      freeBytes,
      usageBytes: usage,
      quotaBytes: quota
    };
  } catch (err) {
    console.warn('[Storage] Could not estimate storage quota:', err);
    return {
      hasEnoughSpace: true,
      percentUsed: 0,
      freeBytes: Number.MAX_SAFE_INTEGER,
      usageBytes: 0,
      quotaBytes: Number.MAX_SAFE_INTEGER
    };
  }
}
