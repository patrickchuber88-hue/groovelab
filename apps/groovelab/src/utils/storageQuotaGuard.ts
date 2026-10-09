/**
 * ==============================================================================
 * 🛡️ Campus-Groovelab PWA Storage Quota Guard
 * Standard: OWASP ASVS Level 3 / W3C StorageManager API / DIN 66398
 * ==============================================================================
 * Proactively inspects browser storage quotas (IndexedDB, CacheStorage, localStorage)
 * on mobile devices (iPads, Android tablets, iPhones). If available storage drops
 * below safe limits (< 50 MB or > 80% capacity), it automatically triggers selective
 * eviction of transient, non-essential audio caches to prevent browser crashes.
 */

export interface StorageQuotaMetrics {
  usage: number;
  quota: number;
  percentUsed: number;
  freeBytes: number;
  isStorageManagerSupported: boolean;
}

export interface StorageQuotaCheckResult {
  status: 'ok' | 'warning' | 'purged';
  metrics: StorageQuotaMetrics | null;
  purgedItemsCount: number;
  message: string;
}

/**
 * Queries the browser's StorageManager API for current storage consumption.
 */
export async function getStorageQuotaEstimate(): Promise<StorageQuotaMetrics | null> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    const freeBytes = Math.max(0, quota - usage);
    const percentUsed = quota > 0 ? Math.round((usage / quota) * 100) : 0;

    return {
      usage,
      quota,
      percentUsed,
      freeBytes,
      isStorageManagerSupported: true
    };
  } catch (err) {
    console.warn('[StorageQuotaGuard] Storage estimate lookup failed:', err);
    return null;
  }
}

/**
 * Checks available storage quota and enforces cleanup if capacity reaches critical thresholds:
 * Threshold 1: Storage >= 80% used
 * Threshold 2: Free space < 50 Megabytes
 */
export async function checkAndEnforceStorageQuota(): Promise<StorageQuotaCheckResult> {
  const metrics = await getStorageQuotaEstimate();

  if (!metrics) {
    return {
      status: 'ok',
      metrics: null,
      purgedItemsCount: 0,
      message: 'StorageManager API nicht verfügbar (Standard-Speicherzugriff).'
    };
  }

  const CRITICAL_PERCENT_THRESHOLD = 80;
  const MINIMUM_SAFE_FREE_BYTES = 50 * 1024 * 1024; // 50 MB

  const isExceedingPercent = metrics.percentUsed >= CRITICAL_PERCENT_THRESHOLD;
  const isExceedingBytes = metrics.freeBytes < MINIMUM_SAFE_FREE_BYTES && metrics.quota > 0;

  if (!isExceedingPercent && !isExceedingBytes) {
    return {
      status: 'ok',
      metrics,
      purgedItemsCount: 0,
      message: `Speicherplatz ausreichend (${metrics.percentUsed}% belegt, ${(metrics.freeBytes / 1024 / 1024).toFixed(1)} MB frei).`
    };
  }

  // Enforce eviction of transient / non-essential caches
  let purgedCount = 0;

  // 1. Evict ephemeral CacheStorage entries (excluding core app shell)
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await caches.keys();
      for (const k of keys) {
        if (k.includes('temp') || k.includes('cache-buster') || k.includes('transient')) {
          const wasDeleted = await caches.delete(k);
          if (wasDeleted) purgedCount++;
        }
      }
    } catch (cacheErr) {
      console.warn('[StorageQuotaGuard] Transient cache eviction notice:', cacheErr);
    }
  }

  // 2. Prune orphaned audio drafts in localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('campus_audio_draft_') || key.startsWith('groovelab_temp_take_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => {
        localStorage.removeItem(k);
        purgedCount++;
      });
    } catch (lsErr) {
      console.warn('[StorageQuotaGuard] localStorage draft purge notice:', lsErr);
    }
  }

  return {
    status: purgedCount > 0 ? 'purged' : 'warning',
    metrics,
    purgedItemsCount: purgedCount,
    message: purgedCount > 0
      ? `Speicherbereinigung durchgeführt: ${purgedCount} temporäre Audio-Caches freigegeben (${metrics.percentUsed}% Belegung).`
      : `Warnung: Gerätespeicher knapp (${metrics.percentUsed}% belegt), keine flüchtigen Caches zur automatischen Bereinigung gefunden.`
  };
}

/**
 * Canonical SSOT list of volatile / transient localStorage key prefixes that can be safely
 * evicted when storage quotas are constrained or during automated janitor runs.
 */
export const VOLATILE_STORAGE_PREFIXES = [
  'campus_peaks_',
  'temp_audio_',
  'cached_blob_',
  'cg_draft_',
  'groovelab_deleted_messages_',
  'cgl_channel_reads_',
  'groovelab_founding_ignored_',
  'groovelab_cached_events_',
  'campus_feed_cache_',
  'groovelab_quarantined_offline_sync',
  'groovelab_pending_schedule_changes',
  'groovelab_copied_week_data',
  'groovelab_calendar_active_occurrences_'
] as const;

/**
 * Safely writes to window.localStorage with automatic quota eviction and zero-crash guarantee.
 * If QuotaExceededError is encountered:
 * 1. Prunes volatile / transient caches (old teacher boards, temporary audio blobs, peaks, cached events).
 * 2. Retries writing the key.
 * 3. If still failing, logs a warning and fails gracefully without throwing an uncaught exception.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: unknown) {
    const errObj = (err && typeof err === 'object' ? err : {}) as { name?: string; code?: number; message?: string };
    const isQuotaError = 
      errObj.name === 'QuotaExceededError' || 
      errObj.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      errObj.code === 22 || 
      errObj.code === 1014 ||
      String(errObj.message || '').toLowerCase().includes('quota');

    if (!isQuotaError) {
      console.warn(`[safeLocalStorageSet] Storage write error for key "${key}":`, err);
      return false;
    }

    console.warn(`[safeLocalStorageSet] LocalStorage quota exceeded when writing "${key}". Initiating emergency purge...`);

    // Emergency Eviction of transient & redundant items
    try {
      // Step 1: Remove all volatile and transient keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && VOLATILE_STORAGE_PREFIXES.some(prefix => k.startsWith(prefix))) {
          localStorage.removeItem(k);
        }
      }

      // Step 2: If key is teacher draft/board, remove other teachers' legacy board states
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('groovelab_teacher_boards_') && !k.endsWith(key.split('_').pop() || '')) {
          localStorage.removeItem(k);
        }
      }

      // Step 3: Retry write
      localStorage.setItem(key, value);
      console.info(`[safeLocalStorageSet] Successfully wrote "${key}" after emergency purge.`);
      return true;
    } catch (retryErr) {
      console.error(`[safeLocalStorageSet] Quota still exceeded after purge for key "${key}". Write skipped safely.`, retryErr);
      return false;
    }
  }
}

/**
 * Safely removes a key from window.localStorage without throwing.
 */
export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[safeLocalStorageRemove] Error removing key "${key}":`, err);
  }
}

