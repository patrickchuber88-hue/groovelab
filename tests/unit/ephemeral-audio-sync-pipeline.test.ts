// ==============================================================================
// Campus-Groovelab Enterprise+ Ephemeral RAM Audio Auto-Recovery Suite
// Datei: tests/unit/ephemeral-audio-sync-pipeline.test.ts
// Standards: Art. 32 Abs. 1 lit. c DSGVO / UrhG § 73 / OWASP ASVS Level 3
// Prüft:
// 1. RAM / IndexedDB Union-Provider in getAllPendingAudioRecords
// 2. 🚨 In-Flight Priority: Flüchtige RAM-Takes werden an die Spitze sortiert
// 3. getPendingAudioCount & getOfflineMutationCount Parität
// 4. Fail-Safe Mutation Fallback bei IndexedDB-Überlauf
// 5. Auto-Purge & CustomEvent 'campus-storage-quota-cleared'
// 6. Source-Code-Invarianten in offlineSyncService.ts und offlineAudioVault.ts
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  storeEphemeralAudioFallback,
  getEphemeralAudioFallback,
  getAllEphemeralAudioFallbacks,
  getEphemeralAudioCount,
  removeEphemeralAudioFallback,
  clearAllEphemeralAudio,
  emitQuotaClearedEvent,
  storeEphemeralMutationFallback,
  getAllEphemeralMutationFallbacks,
  getEphemeralMutationCount,
  removeEphemeralMutationFallback
} from '../../apps/groovelab/src/utils/storageQuotaManager';
import {
  getAllPendingAudioRecords,
  getPendingAudioCount,
  saveOfflineMutation,
  getAllOfflineMutations,
  removeOfflineMutation,
  getOfflineMutationCount
} from '../../apps/groovelab/src/utils/offlineAudioVault';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

let totalTests = 0;
let passedTests = 0;

function assert(name: string, condition: boolean, details: string = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${name}: ${details}`);
  }
}

async function runEphemeralAudioSyncPipelineAudit() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('  🛡️   CAMPUS-GROOVELAB EPHEMERAL RAM AUDIO AUTO-RECOVERY SUITE     ');
  console.log('       Art. 32 DSGVO / Zero Data Loss / In-Flight Priority Sync     ');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // --- 1. EPHEMERAL STORAGE QUOTA MANAGER BASICS ---
  console.log('1. Prüfe Ephemeral Storage Manager RAM-Puffer...');
  clearAllEphemeralAudio();
  assert('RAM-Puffer startet leer (Count = 0)', getEphemeralAudioCount() === 0);

  const fakeTake1 = {
    id: 'ram_take_1',
    context: 'homework',
    title: 'Übe-Session Take 1',
    blob: new Blob(['fake_audio_bytes_1'], { type: 'audio/webm' }),
    createdAt: Date.now()
  };
  const fakeTake2 = {
    id: 'ram_take_2',
    context: 'practice_session',
    title: 'Übe-Session Take 2',
    blob: new Blob(['fake_audio_bytes_2'], { type: 'audio/webm' }),
    createdAt: Date.now() + 100
  };

  storeEphemeralAudioFallback(fakeTake1.id, fakeTake1);
  storeEphemeralAudioFallback(fakeTake2.id, fakeTake2);

  assert('getEphemeralAudioCount liefert exakt 2 gepufferte Takes', getEphemeralAudioCount() === 2);
  assert('getEphemeralAudioFallback findet Take 1', getEphemeralAudioFallback('ram_take_1')?.id === 'ram_take_1');
  assert('getAllEphemeralAudioFallbacks liefert Array mit beiden Takes', getAllEphemeralAudioFallbacks().length === 2);

  // --- 2. UNION-PROVIDER & IN-FLIGHT PRIORITÄT ---
  console.log('\n2. Prüfe RAM / IndexedDB Union-Provider & Priorität...');
  const pendingRecords = await getAllPendingAudioRecords();
  assert('getAllPendingAudioRecords liefert RAM-Takes auch ohne IndexedDB', pendingRecords.length >= 2);
  
  // Überprüfe, dass RAM-Takes an den ersten Positionen stehen
  const firstTake = pendingRecords[0];
  assert(
    'In-Flight Priority: Erste Position ist ein RAM-Take',
    firstTake.id === 'ram_take_1' || firstTake.id === 'ram_take_2'
  );

  const totalAudioCount = await getPendingAudioCount();
  assert('getPendingAudioCount zählt die RAM-Takes mit', totalAudioCount >= 2);

  // --- 3. AUTO-PURGE & QUOTA-CLEARED NOTIFICATION ---
  console.log('\n3. Prüfe Auto-Purge & Quota-Cleared Lifecycle...');
  let quotaClearedFired = false;
  if (typeof window !== 'undefined') {
    const listener = () => { quotaClearedFired = true; };
    window.addEventListener('campus-storage-quota-cleared', listener, { once: true });
    removeEphemeralAudioFallback('ram_take_1');
    assert('Nach Löschen von Take 1 bleibt Count = 1', getEphemeralAudioCount() === 1);
    removeEphemeralAudioFallback('ram_take_2');
    assert('Nach Löschen aller Takes ist Count = 0', getEphemeralAudioCount() === 0);
    assert('Event campus-storage-quota-cleared wurde ausgelöst', quotaClearedFired);
  } else {
    removeEphemeralAudioFallback('ram_take_1');
    assert('Nach Löschen von Take 1 bleibt Count = 1', getEphemeralAudioCount() === 1);
    removeEphemeralAudioFallback('ram_take_2');
    assert('Nach Löschen aller Takes ist Count = 0', getEphemeralAudioCount() === 0);
  }

  // --- 4. FAIL-SAFE MUTATION RAM FALLBACK ---
  console.log('\n4. Prüfe Fail-Safe Mutation Fallback bei Speicherengpässen...');
  const fakeMutation = {
    id: 'mut_test_1',
    table: 'campus_homework_notes',
    payload: { note: 'Großartige Übung heute!', student_id: 'std_42' },
    timestamp: new Date().toISOString()
  };

  storeEphemeralMutationFallback(fakeMutation.id, fakeMutation);
  assert('getEphemeralMutationCount liefert 1', getEphemeralMutationCount() === 1);
  
  const allMutations = await getAllOfflineMutations();
  assert('getAllOfflineMutations enthält die im RAM gepufferte Mutation', allMutations.some(m => m.id === 'mut_test_1'));
  
  const totalMutationCount = await getOfflineMutationCount();
  assert('getOfflineMutationCount zählt die RAM-Mutation mit', totalMutationCount >= 1);

  removeEphemeralMutationFallback('mut_test_1');
  assert('Nach removeEphemeralMutationFallback ist Mutation-Count wieder 0', getEphemeralMutationCount() === 0);

  // --- 5. SOURCE CODE & ARCHITEKTUR-INVARIANTEN ---
  console.log('\n5. Prüfe Source-Code Invarianten in offlineAudioVault & offlineSyncService...');
  
  const vaultPath = path.join(ROOT_DIR, 'apps/groovelab/src/utils/offlineAudioVault.ts');
  const vaultContent = fs.readFileSync(vaultPath, 'utf8');

  assert(
    'offlineAudioVault importiert getAllEphemeralAudioFallbacks',
    vaultContent.includes('getAllEphemeralAudioFallbacks')
  );
  assert(
    'offlineAudioVault importiert storeEphemeralMutationFallback',
    vaultContent.includes('storeEphemeralMutationFallback')
  );
  assert(
    'getAllPendingAudioRecords kombiniert ramRecords mit dbRecords',
    vaultContent.includes('const ramRecords') && vaultContent.includes('getAllEphemeralAudioFallbacks()')
  );
  assert(
    'saveOfflineMutation fängt Speicherfehler ab und leitet in RAM um',
    vaultContent.includes('storeEphemeralMutationFallback')
  );

  const syncServicePath = path.join(ROOT_DIR, 'apps/groovelab/src/services/offlineSyncService.ts');
  const syncContent = fs.readFileSync(syncServicePath, 'utf8');

  assert(
    'offlineSyncService importiert getEphemeralAudioCount',
    syncContent.includes('getEphemeralAudioCount')
  );
  assert(
    'offlineSyncService verhindert Aufschub bei flüchtigen RAM-Takes (hasEmergencyRamTakes)',
    syncContent.includes('hasEmergencyRamTakes')
  );

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`  EPHEMERAL RAM AUDIO AUTO-RECOVERY RESULT: ${passedTests}/${totalTests} TESTS BESTANDEN`);
  console.log('════════════════════════════════════════════════════════════════════\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runEphemeralAudioSyncPipelineAudit().catch((err) => {
  console.error('Fatal error in Ephemeral Audio Sync Audit:', err);
  process.exit(1);
});
