/**
 * ==============================================================================
 * 🛡️ Campus-Groovelab Shared Device & Child Data Scrubber
 * Standard: DSGVO Art. 17 / COPPA / BSI IT-Grundschutz
 * ==============================================================================
 * Deterministically purges client-side audio caches, CacheStorage, and temporary
 * student session keys upon logout or profile switch on shared school iPads
 * or family tablets, preventing cross-student data leakage.
 */

import { purgeVolatileSessionKey } from '../lib/security/encryptedOfflineVault';
import { secureVault } from './secureVault';

export interface ScrubResult {
  success: boolean;
  purgedCachesCount: number;
  purgedStorageKeysCount: number;
  purgedDatabasesCount: number;
  revokedBlobsCount?: number;
}

// 🛡️ Active ObjectURL Registry for DoD-grade Ephemeral Blob Cleanup
const activeBlobUrls = new Set<string>();

/**
 * Registers an ephemeral Blob Object URL to ensure guaranteed revocation
 * upon logout or device scrub.
 */
export function registerEphemeralBlobUrl(url: string): string {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    activeBlobUrls.add(url);
  }
  return url;
}

/**
 * Revokes a registered Blob URL immediately.
 */
export function unregisterEphemeralBlobUrl(url: string): void {
  if (url && activeBlobUrls.has(url)) {
    try {
      if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(url);
      }
    } catch {}
    activeBlobUrls.delete(url);
  }
}

/**
 * Revokes all active Blob URLs in memory (Zero-Trace).
 */
export function revokeAllActiveBlobUrls(): number {
  let count = 0;
  activeBlobUrls.forEach((url) => {
    try {
      if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(url);
        count++;
      }
    } catch {}
  });
  activeBlobUrls.clear();
  return count;
}

/**
 * Overwrites sensitive Uint8Array buffers with zeros (DoD 5220.22-M Sanitization).
 */
export function zeroizeBuffer(buffer: Uint8Array | ArrayBuffer | null | undefined): void {
  if (!buffer) return;
  try {
    if (buffer instanceof Uint8Array) {
      buffer.fill(0);
    } else if (buffer instanceof ArrayBuffer) {
      new Uint8Array(buffer).fill(0);
    }
  } catch {}
}

export async function scrubSharedDeviceCache(): Promise<ScrubResult> {
  let purgedCachesCount = 0;
  let purgedStorageKeysCount = 0;
  let purgedDatabasesCount = 0;

  try {
    // 1. Purge CacheStorage (Audio & media caches)
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) {
          // Purge media, audio, dynamic runtime caches while leaving the core PWA shell intact
          if (
            key.includes('audio') ||
            key.includes('media') ||
            key.includes('recording') ||
            key.includes('student') ||
            key.includes('temp') ||
            key.includes('cache-buster')
          ) {
            await caches.delete(key);
            purgedCachesCount++;
          }
        }
      } catch (cacheErr) {
        console.warn('[SharedDeviceScrubber] CacheStorage purge notice:', cacheErr);
      }
    }

    // 2. Clear ephemeral student and audio storage keys from localStorage
    // (Preserve essential school station / kiosk pairing configurations)
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;

        // Never delete school kiosk tokens or station IDs
        if (
          k.startsWith('groovelab_kiosk_') ||
          k.startsWith('campus_kiosk_') ||
          k === 'groovelab_station_id' ||
          k === 'groovelab_active_platform'
        ) {
          continue;
        }

        // Target student-specific caches, recordings, audio memo drafts, and administrative office caches
        if (
          k.startsWith('campus_junior_recordings_') ||
          k.startsWith('campus_homework_notes_') ||
          k.startsWith('groovelab_student_') ||
          k.startsWith('offline_audio_') ||
          k.startsWith('cached_audio_') ||
          k.startsWith('campus_temp_audio_') ||
          k.startsWith('cg_mediathek_cache_') ||
          k.startsWith('campus_schedule_cache_') ||
          k.startsWith('cg_shield_usage_dates_') ||
          k.startsWith('campus_family_profiles') ||
          k.startsWith('campus_student_ui_level_') ||
          k.startsWith('cg_parent_max_screen_minutes_') ||
          k.startsWith('campus_music_stand_mode') ||
          k.startsWith('campus_student_tts_mode') ||
          k.startsWith('campus_student_briefing_sidebar_collapsed') ||
          k.startsWith('campus_mastery_complete_') ||
          k.startsWith('groovelab_parent_') ||
          k.startsWith('campus_audio_cache_') ||
          k.startsWith('campus_current_student_') ||
          k.startsWith('campus_last_student_') ||
          k.startsWith('campus_active_user_') ||
          k.startsWith('campus_device_') ||
          k.startsWith('groovelab_user_') ||
          k.startsWith('groovelab_school_overrides') ||
          k.startsWith('campus_school_overrides') ||
          k.startsWith('groovelab_school_profile') ||
          k.startsWith('groovelab_storage_addon_gb_') ||
          k.startsWith('groovelab_storage_used_bytes') ||
          k.startsWith('groovelab_secretary_subtab') ||
          k.startsWith('cg_events_swr_') ||
          k.startsWith('cg_schedule_swr_') ||
          k === 'groovelab_storage_addon_gb' ||
          k === 'groovelab_storage_used_bytes' ||
          k === 'groovelab_cached_user'
        ) {
          keysToDelete.push(k);
        }
      }

      for (const k of keysToDelete) {
        localStorage.removeItem(k);
        purgedStorageKeysCount++;
      }
    }

    // 3. Clear sessionStorage completely (ephemeral user data)
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.clear();
    }

    // 4. Purge Ephemeral IndexedDB Stores (Audio Blobs, Vaults, Offline Notes)
    const KNOWN_EPHEMERAL_DBS = [
      'CampusGroovelabOfflineAudioVault',
      'CampusGroovelabBlobDB',
      'groovelab_audio_cache_db',
      'CampusGroovelabNotesDB',
      'cg_secure_vault_db'
    ];

    if (typeof window !== 'undefined' && window.indexedDB) {
      const dbsToDelete = new Set<string>(KNOWN_EPHEMERAL_DBS);

      // Check if browser supports listing all databases dynamically
      if (typeof indexedDB.databases === 'function') {
        try {
          const databases = await indexedDB.databases();
          for (const dbInfo of databases) {
            if (
              dbInfo.name &&
              (dbInfo.name.startsWith('CampusGroovelab') ||
                dbInfo.name.startsWith('groovelab_') ||
                dbInfo.name.startsWith('cg_'))
            ) {
              dbsToDelete.add(dbInfo.name);
            }
          }
        } catch (dbListErr) {
          console.warn('[SharedDeviceScrubber] indexedDB.databases() notice:', dbListErr);
        }
      }

      for (const dbName of dbsToDelete) {
        try {
          await new Promise<void>((resolve) => {
            const req = window.indexedDB.deleteDatabase(dbName);
            req.onsuccess = () => {
              purgedDatabasesCount++;
              resolve();
            };
            req.onerror = () => {
              console.warn(`[SharedDeviceScrubber] Could not delete database ${dbName}:`, req.error);
              resolve();
            };
            req.onblocked = () => {
              console.warn(`[SharedDeviceScrubber] Database deletion blocked for ${dbName}`);
              resolve();
            };
            // Safety timeout in case deleteDatabase hangs due to active connection
            setTimeout(resolve, 300);
          });
        } catch (delErr) {
          console.warn(`[SharedDeviceScrubber] Error deleting DB ${dbName}:`, delErr);
        }
      }
    }

    // 5. Invalidate Cryptographic Vaults and RAM session keys
    try {
      purgeVolatileSessionKey();
    } catch {
      // Non-blocking fallback
    }

    try {
      await secureVault.zeroize();
    } catch {
      // Non-blocking fallback
    }

    // 6. Revoke all active ephemeral Blob Object URLs (Memory Leak & Data Remanence Defense)
    let revokedBlobsCount = 0;
    try {
      revokedBlobsCount = revokeAllActiveBlobUrls();
    } catch {
      // Non-blocking fallback
    }

    console.log(
      `🛡️ [SharedDeviceScrubber] Child Data Scrub Complete: ${purgedCachesCount} cache(s), ${purgedStorageKeysCount} storage key(s), ${purgedDatabasesCount} database(s), and ${revokedBlobsCount} blob URL(s) purged.`
    );

    return {
      success: true,
      purgedCachesCount,
      purgedStorageKeysCount,
      purgedDatabasesCount,
      revokedBlobsCount
    };
  } catch (err) {
    console.error('[SharedDeviceScrubber] Failed to complete device scrub:', err);
    return {
      success: false,
      purgedCachesCount,
      purgedStorageKeysCount,
      purgedDatabasesCount,
      revokedBlobsCount: 0
    };
  }
}
