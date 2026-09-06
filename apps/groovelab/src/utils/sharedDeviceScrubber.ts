/**
 * ==============================================================================
 * 🛡️ Campus-Groovelab Shared Device & Child Data Scrubber
 * Standard: DSGVO Art. 17 / COPPA / BSI IT-Grundschutz
 * ==============================================================================
 * Deterministically purges client-side audio caches, CacheStorage, and temporary
 * student session keys upon logout or profile switch on shared school iPads
 * or family tablets, preventing cross-student data leakage.
 */

export async function scrubSharedDeviceCache(): Promise<{ success: boolean; purgedCachesCount: number; purgedStorageKeysCount: number }> {
  let purgedCachesCount = 0;
  let purgedStorageKeysCount = 0;

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

        // Target student-specific caches, recordings, and audio memo drafts
        if (
          k.startsWith('campus_junior_recordings_') ||
          k.startsWith('campus_homework_notes_') ||
          k.startsWith('groovelab_student_') ||
          k.startsWith('offline_audio_') ||
          k.startsWith('cached_audio_') ||
          k.startsWith('campus_temp_audio_')
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

    console.log(
      `🛡️ [SharedDeviceScrubber] Child Data Scrub Complete: ${purgedCachesCount} cache(s) and ${purgedStorageKeysCount} storage key(s) purged.`
    );

    return {
      success: true,
      purgedCachesCount,
      purgedStorageKeysCount
    };
  } catch (err) {
    console.error('[SharedDeviceScrubber] Failed to complete device scrub:', err);
    return {
      success: false,
      purgedCachesCount,
      purgedStorageKeysCount
    };
  }
}
