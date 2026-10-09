/**
 * ==============================================================================
 * 🏛️ CAMPUS-GROOVELAB 0,1% GOLDSTANDARD CLIENT STORAGE QUOTA & EVICTION MANAGER
 * ==============================================================================
 * Schutz vor Datenverlust durch iOS Safari / WebKit QuotaExceededError (Art. 32 DSGVO).
 * 
 * Kernfunktionen:
 * 1. Pre-Flight Quota Radar: Prüft Speichernutzung via navigator.storage.estimate()
 * 2. Smart 2-Stufen LRU Eviction: Löscht temporäre Blobs und BEREITS SYNCHRONISIERTE Takes
 * 3. 🚨 Unantastbarkeits-Axiom: Unsynchronisierte Schüler-Aufnahmen werden NIEMALS gelöscht!
 * 4. Fail-Safe Ephemeral In-Memory Fallback: Hält Aufnahmen bei vollem Gerätespeicher im RAM
 * ==============================================================================
 */

export interface StorageAvailabilityResult {
  quotaBytes: number;
  usageBytes: number;
  remainingBytes: number;
  pctUsed: number;
  isWarning: boolean;   // >= 75% oder < 100 MB frei
  isCritical: boolean;  // >= 85% oder < 50 MB frei
  estimateAvailable: boolean;
}

export interface PruneExecutionResult {
  freedBytes: number;
  evictedBlobCount: number;
  evictedSyncedRecordCount: number;
  success: boolean;
}

// Flüchiger Notfall-Puffer im Arbeitsspeicher, falls IndexedDB komplett blockiert ist
const ephemeralAudioMap = new Map<string, any>();

/**
 * 1. Pre-Flight Quota Radar
 * Ermittelt den tatsächlichen Füllstand des Browser-Speichers (IndexedDB + CacheStorage).
 */
export async function checkStorageAvailability(requiredIncomingBytes: number = 0): Promise<StorageAvailabilityResult> {
  const fallbackResult: StorageAvailabilityResult = {
    quotaBytes: 1024 * 1024 * 1024, // 1 GB konservativer Default
    usageBytes: 0,
    remainingBytes: 1024 * 1024 * 1024,
    pctUsed: 0,
    isWarning: false,
    isCritical: false,
    estimateAvailable: false
  };

  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
    return fallbackResult;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota || (1024 * 1024 * 1024);
    const usage = estimate.usage || 0;
    const remaining = Math.max(0, quota - usage);
    const pctUsed = Math.min(100, Math.round((usage / quota) * 100));

    // Berücksichtige die ankommende Datei
    const projectedRemaining = Math.max(0, remaining - requiredIncomingBytes);
    const projectedPctUsed = Math.min(100, Math.round(((usage + requiredIncomingBytes) / quota) * 100));

    const isWarning = projectedPctUsed >= 75 || projectedRemaining < (100 * 1024 * 1024);
    const isCritical = projectedPctUsed >= 85 || projectedRemaining < (50 * 1024 * 1024);

    return {
      quotaBytes: quota,
      usageBytes: usage,
      remainingBytes: remaining,
      pctUsed,
      isWarning,
      isCritical,
      estimateAvailable: true
    };
  } catch (err) {
    console.warn('[StorageQuotaManager] navigator.storage.estimate() failed:', err);
    return fallbackResult;
  }
}

/**
 * 2. Smart 2-Stufen LRU Eviction
 * Bereinigt schrittweise unkritische Daten:
 * - Stufe 1: Temporäre Blobs in CampusGroovelabBlobDB (älteste zuerst)
 * - Stufe 2: Bereits erfolgreich zu Hetzner synchronisierte Audio-Takes in CampusGroovelabOfflineAudioVault
 * 
 * 🚨 STRIKTES AXIOM: Unsynchronisierte Audio-Aufnahmen werden NIEMALS gelöscht!
 */
export async function pruneStorageIfNecessary(targetFreeBytes: number = 50 * 1024 * 1024): Promise<PruneExecutionResult> {
  const result: PruneExecutionResult = {
    freedBytes: 0,
    evictedBlobCount: 0,
    evictedSyncedRecordCount: 0,
    success: true
  };

  if (typeof window === 'undefined' || !window.indexedDB) {
    return result;
  }

  try {
    // --- STUFE 1: Bereinigung temporärer Blobs in CampusGroovelabBlobDB ---
    const blobDbRequest = window.indexedDB.open('CampusGroovelabBlobDB', 1);
    await new Promise<void>((resolve) => {
      blobDbRequest.onsuccess = async () => {
        const db = blobDbRequest.result;
        if (!db.objectStoreNames.contains('binaryBlobs')) {
          db.close();
          return resolve();
        }

        try {
          const tx = db.transaction('binaryBlobs', 'readwrite');
          const store = tx.objectStore('binaryBlobs');
          const keysRequest = store.getAllKeys();

          keysRequest.onsuccess = () => {
            const keys = (keysRequest.result || []) as string[];
            // Bereinige temporäre und alte Preview-Keys
            const candidateKeys = keys.filter(k => 
              k.startsWith('temp_') || 
              k.startsWith('preview_') || 
              k.startsWith('cache_')
            );

            for (const key of candidateKeys) {
              store.delete(key);
              result.evictedBlobCount++;
            }
          };

          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        } catch {
          db.close();
          resolve();
        }
      };
      blobDbRequest.onerror = () => resolve();
    });

    // Prüfe, ob Stufe 1 bereits genügend Speicher freigegeben hat
    const postStage1 = await checkStorageAvailability();
    if (!postStage1.isCritical) {
      return result;
    }

    // --- STUFE 2: Bereinigung BEREITS SYNCHRONISIERTER Audio-Takes in CampusGroovelabOfflineAudioVault ---
    const audioDbRequest = window.indexedDB.open('CampusGroovelabOfflineAudioVault', 2);
    await new Promise<void>((resolve) => {
      audioDbRequest.onsuccess = async () => {
        const db = audioDbRequest.result;
        if (!db.objectStoreNames.contains('offlineAudioBlobs')) {
          db.close();
          return resolve();
        }

        try {
          const tx = db.transaction('offlineAudioBlobs', 'readwrite');
          const store = tx.objectStore('offlineAudioBlobs');
          const allRecordsRequest = store.getAll();

          allRecordsRequest.onsuccess = () => {
            const records = (allRecordsRequest.result || []) as any[];

            // Filtere STRENG auf bereits synchronisierte Datensätze
            // Unsynchronisierte Datensätze werden NIEMALS gelöscht!
            const syncedCandidates = records
              .filter(rec => rec.metadata?.synced === true || rec.metadata?.storageUrl || rec.syncStatus === 'synced')
              .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); // Älteste zuerst

            for (const candidate of syncedCandidates) {
              store.delete(candidate.id);
              result.evictedSyncedRecordCount++;
              if (candidate.blob && candidate.blob.size) {
                result.freedBytes += candidate.blob.size;
              }
              // Sobald wir mindestens targetFreeBytes freigegeben haben, stoppen
              if (result.freedBytes >= targetFreeBytes) {
                break;
              }
            }
          };

          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        } catch {
          db.close();
          resolve();
        }
      };
      audioDbRequest.onerror = () => resolve();
    });

  } catch (err) {
    console.error('[StorageQuotaManager] Error during storage pruning:', err);
    result.success = false;
  }

  return result;
}

/**
 * 3. Fail-Safe Ephemeral In-Memory Fallback
 * Hält Audio-Takes bei absolutem Speicherüberlauf im RAM und feuert visuellen Alarm.
 */
export function storeEphemeralAudioFallback(id: string, record: any): void {
  ephemeralAudioMap.set(id, record);
  console.warn(`[StorageQuotaManager] Audio take ${id} buffered in RAM due to device storage exhaustion.`);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('campus-storage-quota-warning', {
        detail: {
          recordId: id,
          title: record.title || 'Aufnahme',
          timestamp: Date.now(),
          message: 'Gerätespeicher voll! Aufnahme wird im Arbeitsspeicher gehalten. Bitte mit WLAN verbinden, um sie in die Cloud zu sichern.'
        }
      })
    );
  }
}

/**
 * Ruft einen im RAM gepufferten Notfall-Take ab
 */
export function getEphemeralAudioFallback(id: string): any | null {
  return ephemeralAudioMap.get(id) || null;
}

/**
 * Entfernt einen Take aus dem RAM-Notfall-Puffer, sobald er synchronisiert wurde
 */
export function removeEphemeralAudioFallback(id: string): void {
  ephemeralAudioMap.delete(id);
}
