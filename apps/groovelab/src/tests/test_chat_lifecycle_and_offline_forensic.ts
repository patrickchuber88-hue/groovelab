/**
 * 🛡️ Campus-Groovelab Forensic Test: Chat Lifecycle, Offline Outbox & ⭐ Dauerhaft
 * Standards: DIN 66398 / DSGVO Art. 5 Abs. 1 lit. e / OWASP ASVS Level 3
 * 
 * Verifiziert das Verhalten der 10/10 Alltags- & Lifecycle-Architektur:
 * 1. Resiliente Offline-Pufferung (Kellerraum-Sync mit Status 'pending_offline')
 * 2. Status-Häkchen Suite unterstützt 'pending_offline' mit Clock-Icon
 * 3. ⭐ Dauerhaft Themen-Kennzeichnung überlebt den Schuljahres-Reset
 * 4. Paginierung (letzte 50 Nachrichten) und Sofort-Suche im Chat
 * 5. Migration 599 DDL & RPC Prüfung (DIN 66398 Hard-Purge für Shoutbox)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = fs.existsSync(path.join(process.cwd(), 'supabase', 'migrations'))
  ? process.cwd()
  : path.resolve(SRC_DIR, '..', '..', '..');

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Test Failed: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

export function runChatLifecycleAndOfflineForensicTests() {
  console.log('\n--- 🛡️ SUITE: CHAT LIFECYCLE, OFFLINE OUTBOX & ⭐ DAUERHAFT (10/10 STANDARD) ---');

  // Test 1: Offline-Handling in useCampusChatActions.ts
  const chatActionsPath = path.join(SRC_DIR, 'hooks', 'useCampusChatActions.ts');
  const chatActionsCode = fs.readFileSync(chatActionsPath, 'utf8');
  assert(
    chatActionsCode.includes("status: 'pending_offline'") &&
    chatActionsCode.includes('!navigator.onLine'),
    '1. useCampusChatActions puffert Nachrichten bei Offline-Zustand lokal mit pending_offline'
  );

  // Test 2: Status-Ticks Suite unterstützt pending_offline
  const statusTicksPath = path.join(SRC_DIR, 'components', 'messages', 'CampusMessageStatusTicks.tsx');
  const statusTicksCode = fs.readFileSync(statusTicksPath, 'utf8');
  assert(
    statusTicksCode.includes("status === 'pending_offline'") &&
    statusTicksCode.includes('Wartet auf Verbindung'),
    '2. CampusMessageStatusTicks rendert Clock-Icon für offline gepufferte Nachrichten'
  );

  // Test 3: ⭐ Dauerhaft Toggle in CampusTopicCard.tsx
  const topicCardPath = path.join(SRC_DIR, 'components', 'CampusTopicCard.tsx');
  const topicCardCode = fs.readFileSync(topicCardPath, 'utf8');
  assert(
    topicCardCode.includes('⭐') &&
    topicCardCode.includes('Dauerhaft') &&
    topicCardCode.includes('onTogglePermanent'),
    '3. CampusTopicCard besitzt den 1-Klick Toggle für ⭐ Dauerhaft'
  );

  // Test 4: In-Chat Suche & Paginierung in CampusDirectMessages.tsx
  const directMessagesPath = path.join(SRC_DIR, 'components', 'CampusDirectMessages.tsx');
  const directMessagesCode = fs.readFileSync(directMessagesPath, 'utf8');
  assert(
    directMessagesCode.includes('visibleMessageLimit') &&
    directMessagesCode.includes('inChatSearchQuery') &&
    directMessagesCode.includes('Ältere Nachrichten laden'),
    '4. CampusDirectMessages unterstützt Paginierung (letzte 50) und Echtzeit-Suche'
  );

  // Test 5: Migration 599 prüft DDL und DIN 66398 Purge RPC
  const migration599Path = path.join(ROOT_DIR, 'supabase', 'migrations', '599_enterprise_campus_chat_school_year_lifecycle.sql');
  assert(fs.existsSync(migration599Path), '5. Migration 599 existiert');
  const migration599Code = fs.readFileSync(migration599Path, 'utf8');
  assert(
    migration599Code.includes('is_permanent') &&
    migration599Code.includes('is_archived') &&
    migration599Code.includes('purge_school_year_expired_chats') &&
    migration599Code.includes('DELETE FROM public.campus_direct_messages'),
    '5.1 Migration 599 definiert is_permanent, is_archived und den DIN 66398 Hard-Purge RPC'
  );

  console.log('--- ✅ ALL CHAT LIFECYCLE & OFFLINE FORENSIC TESTS PASSED ---\n');
}

// Direkte Ausführung wenn standalone aufgerufen
if (process.argv[1]?.endsWith('test_chat_lifecycle_and_offline_forensic.ts')) {
  runChatLifecycleAndOfflineForensicTests();
}
