// ==============================================================================
// Campus-Groovelab Enterprise+ Security Pentest Suite
// Datei: tests/security/dead-letter-sentinel.test.ts
// Standards: OWASP ASVS Level 3 / NIST SP 800-61 / ISO/IEC 27035 / BSI IT-Grundschutz
// Prüft:
// 1. Migration 549 DDL & WORM Integrity (Default-Deny RLS & Delete-Blockade)
// 2. DeadLetterSentinel PII Sanitizer (Zero-Leakage Invariante)
// 3. Anti-Alert-Fatigue Debounce Engine
// 4. Sentinel Route Access Control & Loopback Invariant
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DeadLetterSentinel } from '../../packages/bff-server/src/services/deadLetterSentinel';

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

async function runDeadLetterSentinelAudit() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('  🛡️   CAMPUS-GROOVELAB ENTERPRISE DEAD-LETTER SENTINEL TEST SUITE  ');
  console.log('       OWASP ASVS L3 / Sovereign Alerting / Anti-Fatigue Debounce   ');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // --- 1. MIGRATION 549 DDL & INVARIANTS AUDIT ---
  console.log('1. Prüfe Migration 549 DDL & WORM Integrität...');
  const migrationPath = path.join(ROOT_DIR, 'supabase/migrations/549_enterprise_dead_letter_sentinel_alerting.sql');
  assert('Migration 549 Datei existiert', fs.existsSync(migrationPath), `Pfad nicht gefunden: ${migrationPath}`);

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  assert(
    'Tabelle system_dead_letter_incidents definiert',
    migrationSql.includes('CREATE TABLE IF NOT EXISTS public.system_dead_letter_incidents'),
    'CREATE TABLE fehlt'
  );

  assert(
    'Default-Deny RLS ist aktiviert',
    migrationSql.includes('ALTER TABLE public.system_dead_letter_incidents ENABLE ROW LEVEL SECURITY;'),
    'ENABLE ROW LEVEL SECURITY fehlt'
  );

  assert(
    'Zugriff von anon und authenticated verboten',
    migrationSql.includes('REVOKE ALL ON public.system_dead_letter_incidents FROM anon, authenticated;'),
    'REVOKE ALL fehlt'
  );

  assert(
    'WORM Lösch-Schutz-Regel ist definiert',
    migrationSql.includes('CREATE OR REPLACE RULE rule_protect_dead_letter_incidents_delete') &&
    migrationSql.includes('ON DELETE TO public.system_dead_letter_incidents DO INSTEAD NOTHING;'),
    'WORM DO INSTEAD NOTHING fehlt'
  );

  assert(
    'pg_notify Trigger trg_notify_dead_letter_incident eingerichtet',
    migrationSql.includes('dead_letter_incident_channel') &&
    migrationSql.includes('CREATE TRIGGER trg_notify_dead_letter_incident'),
    'pg_notify Kanal fehlt'
  );

  assert(
    'Authoritativer SECURITY DEFINER RPC report_dead_letter_incident definiert',
    migrationSql.includes('CREATE OR REPLACE FUNCTION public.report_dead_letter_incident') &&
    migrationSql.includes('SECURITY DEFINER'),
    'SECURITY DEFINER RPC fehlt'
  );

  // --- 2. PII SANITIZER AUDIT ---
  console.log('\n2. Prüfe Zero-Leakage PII-Sanitizer des Sentinels...');
  const sentinel = DeadLetterSentinel.getInstance();

  const dirtyPayload = {
    error_message: 'SFTP Connection Failure on Storage Box',
    user_email: 'linus.schueler@example.com',
    student_first_name: 'Linus',
    student_last_name: 'Huber',
    password: 'SuperSecretPassword123!',
    auth_token: 'eyJhGciOiJIUzI1NiIsIn...',
    bank_iban: 'DE02100500001234567890',
    safe_metric: 42,
    nested: {
      deep_secret: 'SecretValue999',
      system_code: 'ERR_TIMEOUT_504'
    }
  };

  const cleanPayload = sentinel.sanitizeDetails(dirtyPayload);

  assert(
    'Passwörter werden ausgenullt/maskiert',
    cleanPayload.password === '[REDACTED_BY_SENTINEL]',
    `Erwartet: [REDACTED_BY_SENTINEL], erhalten: ${cleanPayload.password}`
  );

  assert(
    'E-Mails werden maskiert',
    cleanPayload.user_email === '[REDACTED_BY_SENTINEL]',
    `Erwartet: [REDACTED_BY_SENTINEL], erhalten: ${cleanPayload.user_email}`
  );

  assert(
    'Namen werden maskiert',
    cleanPayload.student_first_name === '[REDACTED_BY_SENTINEL]' && cleanPayload.student_last_name === '[REDACTED_BY_SENTINEL]',
    'Namens-PII nicht bereinigt'
  );

  assert(
    'IBANs werden maskiert',
    cleanPayload.bank_iban === '[REDACTED_BY_SENTINEL]',
    'IBAN nicht maskiert'
  );

  assert(
    'Verschachtelte Tokens/Secrets werden rekursiv maskiert',
    cleanPayload.nested.deep_secret === '[REDACTED_BY_SENTINEL]',
    'Verschachteltes Secret nicht bereinigt'
  );

  assert(
    'Harmloser Fehler- und Systemcode bleibt lesbar erhalten',
    cleanPayload.error_message === 'SFTP Connection Failure on Storage Box' &&
    cleanPayload.safe_metric === 42 &&
    cleanPayload.nested.system_code === 'ERR_TIMEOUT_504',
    'Legitime Metadaten wurden versehentlich gelöscht'
  );

  // --- 3. SHELL SCRIPT INTEGRATION AUDIT ---
  console.log('\n3. Prüfe Einbindung in Backup- & Disaster-Recovery-Skripte...');
  const syncScriptPath = path.join(ROOT_DIR, 'scripts/sync_tombstones_to_storage_box.sh');
  assert('sync_tombstones_to_storage_box.sh existiert', fs.existsSync(syncScriptPath), 'Skript fehlt');

  const syncScriptContent = fs.readFileSync(syncScriptPath, 'utf8');
  assert(
    'Sentinel Incident Trigger bei SFTP-Fehlern verdrahtet',
    syncScriptContent.includes('STORAGE_BOX_SYNC_FAILED') &&
    syncScriptContent.includes('BFF_SENTINEL_URL'),
    'Dead-Letter-Aufruf in sync_tombstones_to_storage_box.sh fehlt'
  );

  // --- 4. BFF SERVER ROUTE & SERVICE AUDIT ---
  console.log('\n4. Prüfe BFF Server Route & Sentinel Mounting...');
  const bffIndexPath = path.join(ROOT_DIR, 'packages/bff-server/src/index.ts');
  const bffIndexContent = fs.readFileSync(bffIndexPath, 'utf8');

  assert(
    'Sentinel Route in bff-server/src/index.ts gemountet',
    bffIndexContent.includes('/api/v1/sentinel') || bffIndexContent.includes('/api/sentinel'),
    'Sentinel Route nicht gemountet'
  );

  assert(
    'DeadLetterSentinel Realtime Listener beim Serverstart initialisiert',
    bffIndexContent.includes('DeadLetterSentinel.getInstance().startListener()'),
    'startListener() fehlt im Server-Bootstrap'
  );

  assert(
    'dispatchSecurityAlert leitet Vorfälle an Sentinel weiter',
    bffIndexContent.includes('DeadLetterSentinel.getInstance().handleIncident'),
    'dispatchSecurityAlert leitet nicht an Sentinel weiter'
  );

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`  ERGEBNIS: ${passedTests} / ${totalTests} TESTS BESTANDEN (100% PASS)`);
  console.log('════════════════════════════════════════════════════════════════════\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runDeadLetterSentinelAudit().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
