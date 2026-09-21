/**
 * ==============================================================================
 * 🛡️ FORENSIC DRILL 1: ENDPOINT DATA REMANENCE & SCRUBBER (OWASP ASVS 8.3 / DSGVO Art. 17)
 * ==============================================================================
 * Simulates a shared school tablet / iPad session teardown and verifies:
 * 1. Zero-Residual: No student PII or audio tokens remain in localStorage or sessionStorage.
 * 2. Kiosk Preservation: Station pairing IDs and kiosk hardware flags survive.
 * 3. CacheStorage Sanitization: Audio/media caches purged while shell stays intact.
 * 4. IndexedDB Destruction: Ephemeral audio blobs, notes, and vaults are deleted.
 * 5. Cryptographic Shredding: WebCrypto session keys and encrypted vault caches zeroized.
 */

import { scrubSharedDeviceCache } from '../utils/sharedDeviceScrubber';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    testsFailed++;
  }
}

async function runForensicScrubberDrill() {
  console.log('\n================================================================');
  console.log('🔬 STARTING DRILL 1: ENDPOINT DATA REMANENCE & CLIENT SCRUBBER');
  console.log('================================================================\n');

  // --- Step A: Mock Storage & IndexedDB Environment ---
  const localStorageMock: Record<string, string> = {
    // Kiosk / Hardware configuration (MUST SURVIVE)
    'campus_kiosk_pairing_token': 'hardware-kiosk-992-safe',
    'groovelab_station_id': 'station-room-3b',
    'groovelab_active_platform': 'ipad-station',
    
    // Ephemeral Student Data (MUST BE PURGED)
    'campus_junior_recordings_student_1': 'base64audioblob...',
    'campus_homework_notes_student_1': '{"notes":"Practiced Etude No. 2"}',
    'groovelab_student_active_loop': 'loop-track-4',
    'cg_mediathek_cache_song_45': '{"audio":"cached-bytes"}',
    'campus_schedule_cache_weekly': '{"schedule":"all-lessons"}',
    'cg_shield_usage_dates_student_1': '["2026-09-20"]',
    'campus_family_profiles': '[{"id":"child-1","pin":"verified"}]',
    'campus_student_ui_level_child_1': 'junior',
    'cg_parent_max_screen_minutes_child_1': '45',
    'campus_mastery_complete_badge_7': 'true',
    'groovelab_parent_session_active': 'true',
    'groovelab_cached_user': '{"id":"student-1","email":"student@music.de"}'
  };

  const sessionStorageMock: Record<string, string> = {
    'campus_active_role': 'student',
    'campus_parent_auth_session': 'valid-until-14:30',
    'cg_vault_session_key': 'raw-key-bytes'
  };

  const deletedCaches: string[] = [];
  const cachesMock = {
    keys: async () => ['pwa-shell-v1', 'audio-stream-cache-v2', 'student-recordings-temp', 'vendor-assets-v1'],
    delete: async (key: string) => {
      deletedCaches.push(key);
      return true;
    }
  };

  const deletedDatabases: string[] = [];
  const indexedDbMock = {
    databases: async () => [
      { name: 'CampusGroovelabOfflineAudioVault' },
      { name: 'CampusGroovelabBlobDB' },
      { name: 'groovelab_audio_cache_db' },
      { name: 'CampusGroovelabNotesDB' },
      { name: 'cg_secure_vault_db' }
    ],
    open: () => {
      const req: any = {
        onsuccess: null,
        onerror: null,
        result: {
          transaction: () => ({
            objectStore: () => ({
              clear: () => {
                const clearReq: any = { onsuccess: null, onerror: null };
                setTimeout(() => { if (clearReq.onsuccess) clearReq.onsuccess(); }, 0);
                return clearReq;
              }
            })
          })
        }
      };
      setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 0);
      return req;
    },
    deleteDatabase: (name: string) => {
      deletedDatabases.push(name);
      const req: any = {
        onsuccess: null,
        onerror: null,
        onblocked: null
      };
      setTimeout(() => {
        if (typeof req.onsuccess === 'function') req.onsuccess();
      }, 0);
      return req;
    }
  };

  // Setup Global Mocks
  (global as any).window = {
    localStorage: {
      length: Object.keys(localStorageMock).length,
      key: (i: number) => Object.keys(localStorageMock)[i] || null,
      getItem: (k: string) => localStorageMock[k] || null,
      setItem: (k: string, v: string) => { localStorageMock[k] = v; },
      removeItem: (k: string) => { delete localStorageMock[k]; },
      clear: () => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]); }
    },
    sessionStorage: {
      clear: () => { Object.keys(sessionStorageMock).forEach(k => delete sessionStorageMock[k]); },
      removeItem: (k: string) => { delete sessionStorageMock[k]; }
    },
    caches: cachesMock,
    indexedDB: indexedDbMock
  };
  (global as any).localStorage = (global as any).window.localStorage;
  (global as any).sessionStorage = (global as any).window.sessionStorage;
  (global as any).caches = cachesMock;
  (global as any).indexedDB = indexedDbMock;

  console.log('📋 Pre-Scrub State:');
  console.log(`   - LocalStorage keys: ${Object.keys(localStorageMock).length}`);
  console.log(`   - SessionStorage keys: ${Object.keys(sessionStorageMock).length}`);
  console.log(`   - CacheStorage entries: 4`);
  console.log(`   - IndexedDB stores: 5\n`);

  // --- Step B: Execute Scrubbing Procedure ---
  const result = await scrubSharedDeviceCache();

  console.log('\n📊 Post-Scrub Forensic Telemetry:');
  console.log(`   - Scrubber Success: ${result.success}`);
  console.log(`   - Purged Caches: ${result.purgedCachesCount}`);
  console.log(`   - Purged Storage Keys: ${result.purgedStorageKeysCount}`);
  console.log(`   - Purged IndexedDB Databases: ${result.purgedDatabasesCount}\n`);

  // --- Step C: Assertions ---
  console.log('🔍 Running Forensic Validation Checks:');

  // 1. Scrubber returned true
  assert(result.success === true, 'Scrubber completed with success=true');

  // 2. Kiosk keys were preserved
  assert(
    localStorageMock['campus_kiosk_pairing_token'] === 'hardware-kiosk-992-safe',
    'Kiosk pairing token preserved (Hardware binding intact)'
  );
  assert(
    localStorageMock['groovelab_station_id'] === 'station-room-3b',
    'Groovelab station ID preserved'
  );
  assert(
    localStorageMock['groovelab_active_platform'] === 'ipad-station',
    'Station platform configuration preserved'
  );

  // 3. Ephemeral Student PII keys wiped
  const remainingKeys = Object.keys(localStorageMock);
  const leakedStudentKeys = remainingKeys.filter(
    k => !k.startsWith('groovelab_kiosk_') && !k.startsWith('campus_kiosk_') && k !== 'groovelab_station_id' && k !== 'groovelab_active_platform'
  );
  assert(
    leakedStudentKeys.length === 0,
    `Zero student PII remanence in localStorage (Remaining invalid keys: ${leakedStudentKeys.length})`
  );

  // 4. SessionStorage completely wiped
  assert(
    Object.keys(sessionStorageMock).length === 0,
    'SessionStorage completely sterilized (0 residual keys)'
  );

  // 5. Audio caches purged, shell cache preserved
  assert(
    deletedCaches.includes('audio-stream-cache-v2') && deletedCaches.includes('student-recordings-temp'),
    'Ephemeral audio & student caches deleted from CacheStorage'
  );
  assert(
    !deletedCaches.includes('pwa-shell-v1') && !deletedCaches.includes('vendor-assets-v1'),
    'PWA app shell and vendor assets left intact (offline capability maintained)'
  );

  // 6. IndexedDB deletion
  const requiredDbs = [
    'CampusGroovelabOfflineAudioVault',
    'CampusGroovelabBlobDB',
    'groovelab_audio_cache_db',
    'CampusGroovelabNotesDB',
    'cg_secure_vault_db'
  ];
  const allDbsDeleted = requiredDbs.every(db => deletedDatabases.includes(db));
  assert(
    allDbsDeleted,
    `All 5 ephemeral IndexedDB databases deleted: ${requiredDbs.join(', ')}`
  );

  console.log('\n================================================================');
  console.log(`🏁 DRILL 1 RESULT: ${testsPassed} PASSED / ${testsFailed} FAILED`);
  console.log('================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runForensicScrubberDrill().catch((err) => {
  console.error('Fatal Scrubber Drill Exception:', err);
  process.exit(1);
});
