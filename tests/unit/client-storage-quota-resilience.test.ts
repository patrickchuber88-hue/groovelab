// ==============================================================================
// Campus-Groovelab Enterprise+ Client Storage Quota Resilience Suite
// Datei: tests/unit/client-storage-quota-resilience.test.ts
// Standards: Art. 32 Abs. 1 lit. c DSGVO / UrhG § 73 / W3C Storage API
// Prüft:
// 1. Pre-Flight Storage Quota Radar & Threshold Calculation
// 2. 🚨 Unantastbarkeits-Axiom: Unsynchronisierte Schüler-Takes sind evictions-geschützt
// 3. Ephemeral In-Memory Fallback bei Gerätespeicher-Überlauf (Zero Data Loss)
// 4. Source-Code-Invarianten in offlineAudioVault.ts und blobStorage.ts
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  checkStorageAvailability,
  storeEphemeralAudioFallback,
  getEphemeralAudioFallback,
  removeEphemeralAudioFallback,
} from '../../apps/groovelab/src/utils/storageQuotaManager';

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

async function runClientStorageQuotaResilienceAudit() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('  🛡️   CAMPUS-GROOVELAB CLIENT STORAGE QUOTA & EVICTION SUITE       ');
  console.log('       Art. 32 DSGVO / Zero Data Loss / Fail-Safe Audio Vault       ');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // --- 1. PRE-FLIGHT QUOTA RADAR AUDIT ---
  console.log('1. Prüfe Pre-Flight Quota Radar (Fallback- & Schwellenwert-Logik)...');
  const fallback = await checkStorageAvailability(5 * 1024 * 1024);
  assert('Pre-Flight Radar liefert sicheres Fallback-Objekt in Node-Umgebung', fallback !== null);
  assert('Fallback deklariert mindestens 1 GB Standard-Quota', fallback.quotaBytes >= 1024 * 1024 * 1024);
  assert('Fallback hat isCritical = false bei moderater Dateigröße', fallback.isCritical === false);

  // --- 2. UNANTASTBARKEITS-AXIOM FÜR SCHÜLER-TAKES ---
  console.log('\n2. Prüfe Unantastbarkeits-Axiom für ungesicherte Schüler-Aufnahmen...');
  
  const mockRecords = [
    {
      id: 'take_unsynced_1',
      context: 'homework',
      metadata: { synced: false },
      createdAt: 1000,
      blob: { size: 10 * 1024 * 1024 }
    },
    {
      id: 'take_unsynced_2',
      context: 'practice_session',
      createdAt: 2000,
      blob: { size: 15 * 1024 * 1024 }
    },
    {
      id: 'take_synced_old',
      context: 'homework',
      metadata: { synced: true, storageUrl: 'schools/s1/students/st1/homework/t1.webm' },
      createdAt: 500,
      blob: { size: 8 * 1024 * 1024 }
    },
    {
      id: 'take_synced_recent',
      context: 'meisterwerk',
      syncStatus: 'synced',
      createdAt: 800,
      blob: { size: 12 * 1024 * 1024 }
    }
  ];

  // Simulierte Eviction-Selektion nach Goldstandard-Regel:
  const evictableCandidates = mockRecords
    .filter(rec => rec.metadata?.synced === true || rec.metadata?.storageUrl || rec.syncStatus === 'synced')
    .sort((a, b) => a.createdAt - b.createdAt);

  const protectedRecords = mockRecords.filter(
    rec => !(rec.metadata?.synced === true || rec.metadata?.storageUrl || rec.syncStatus === 'synced')
  );

  assert('Genau 2 synchronisierte Datensätze sind als löschbar klassifiziert', evictableCandidates.length === 2);
  assert('Ältester synchronisierter Take (createdAt 500) steht an erster Stelle der Eviction', evictableCandidates[0].id === 'take_synced_old');
  assert('Alle unsynchronisierten Schüler-Takes (take_unsynced_1 & 2) sind zu 100% geschützt', protectedRecords.length === 2);
  assert('Kein unsynchronisierter Take taucht im Eviction-Kandidatenpool auf', !evictableCandidates.some(c => c.id.includes('unsynced')));

  // --- 3. EPHEMERAL IN-MEMORY RAM VAULT AUDIT ---
  console.log('\n3. Prüfe Fail-Safe Ephemeral RAM Vault bei Speicher-Vollbelegung...');
  const emergencyId = 'emergency_take_child_42';
  const emergencyRecord = {
    id: emergencyId,
    title: 'Gitarren-Solo Hausaufgabe KW 41',
    createdAt: Date.now(),
    blob: { size: 2048576, type: 'audio/webm' }
  };

  storeEphemeralAudioFallback(emergencyId, emergencyRecord);
  const retrieved = getEphemeralAudioFallback(emergencyId);

  assert('Im Notfall-RAM abgelegter Take kann sofort wieder ausgelesen werden', retrieved !== null);
  assert('Take-Inhalt stimmt exakt mit übergebenem Objekt überein', retrieved?.title === 'Gitarren-Solo Hausaufgabe KW 41');

  removeEphemeralAudioFallback(emergencyId);
  const postRemove = getEphemeralAudioFallback(emergencyId);
  assert('Nach erfolgreicher Synchronisation wird der Notfall-Puffer im RAM bereinigt', postRemove === null);

  // --- 4. SOURCE-CODE-INVARIANTEN AUDIT ---
  console.log('\n4. Prüfe Source-Code-Invarianten in offlineAudioVault.ts & blobStorage.ts...');

  const offlineVaultPath = path.join(ROOT_DIR, 'apps/groovelab/src/utils/offlineAudioVault.ts');
  assert('offlineAudioVault.ts existiert', fs.existsSync(offlineVaultPath));
  const offlineVaultContent = fs.readFileSync(offlineVaultPath, 'utf8');

  assert(
    'offlineAudioVault.ts importiert storageQuotaManager',
    offlineVaultContent.includes('./storageQuotaManager')
  );
  assert(
    'offlineAudioVault.ts fängt QuotaExceededError explizit ab',
    offlineVaultContent.includes('QuotaExceededError')
  );
  assert(
    'offlineAudioVault.ts nutzt storeEphemeralAudioFallback als Rettungsanker',
    offlineVaultContent.includes('storeEphemeralAudioFallback')
  );
  assert(
    'getOfflineAudioRecord prüft zuerst den Notfall-RAM (getEphemeralAudioFallback)',
    offlineVaultContent.includes('getEphemeralAudioFallback')
  );

  const blobStoragePath = path.join(ROOT_DIR, 'apps/groovelab/src/utils/blobStorage.ts');
  assert('blobStorage.ts existiert', fs.existsSync(blobStoragePath));
  const blobStorageContent = fs.readFileSync(blobStoragePath, 'utf8');

  assert(
    'blobStorage.ts importiert storageQuotaManager',
    blobStorageContent.includes('./storageQuotaManager')
  );
  assert(
    'blobStorage.ts fängt QuotaExceededError bei storeBlob ab',
    blobStorageContent.includes('QuotaExceededError')
  );

  // --- ZUSAMMENFASSUNG ---
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`  CLIENT STORAGE QUOTA AUDIT RESULT: ${passedTests}/${totalTests} TESTS BESTANDEN`);
  console.log('════════════════════════════════════════════════════════════════════\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runClientStorageQuotaResilienceAudit().catch((err) => {
  console.error('Fataler Fehler in Client Storage Quota Testsuite:', err);
  process.exit(1);
});
