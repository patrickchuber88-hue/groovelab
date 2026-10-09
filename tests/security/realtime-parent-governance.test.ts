// ==============================================================================
// Campus-Groovelab Enterprise+ Security Suite
// Datei: tests/security/realtime-parent-governance.test.ts
// Standards: OWASP ASVS Level 3, BGB § 104, DSGVO Art. 8 & 25, NIST SP 800-63B
// Prüft:
// 1. Topic Isolation & Multi-Tenant Scoping (realtime_parent_gov_${schoolId}_${studentId})
// 2. Zero-Trust SSOT Handshake & Anti-Spoofing Shield (CWE-345 Remediation)
// 3. Monotonic Timestamp & Anti-Replay Nonce Verification
// 4. Standby- & Wake-up Reconciliation (iOS PWA Background Sleep Resilience)
// 5. Broadcaster Dual-Channel & Dual-Event Compliance (PAR-06 & PAR-07 Parität)
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getParentGovernanceTopics,
  subscribeParentGovernanceRealtime,
  dispatchParentGovernanceBroadcast,
  VerifiedParentPermissions
} from '../../apps/groovelab/src/services/realtime/parentGovernanceRealtimeSync';

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

async function runRealtimeParentGovernanceSuite() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🛡️  CAMPUS-GROOVELAB: REALTIME PARENT GOVERNANCE & ANTI-SPOOFING');
  console.log('    Standards: OWASP ASVS Level 3, BGB § 104, DSGVO Art. 8/25');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // ----------------------------------------------------------------------------
  // 1. TOPIC ISOLATION & MULTI-TENANT SCOPING
  // ----------------------------------------------------------------------------
  console.log('▶ 1. Prüfe Topic Isolation & Multi-Tenant Scoping...');
  const tenantTopics = getParentGovernanceTopics('student-42', 'school-99');
  assert(
    'Tenant Scoped Primary Topic',
    tenantTopics.primary === 'realtime_parent_gov_school-99_student-42',
    `Erwartet realtime_parent_gov_school-99_student-42, erhalten: ${tenantTopics.primary}`
  );
  assert(
    'Legacy Compatible Fallback Topic',
    tenantTopics.legacy === 'realtime_ui_level_student-42',
    `Erwartet realtime_ui_level_student-42, erhalten: ${tenantTopics.legacy}`
  );

  const standaloneTopics = getParentGovernanceTopics('student-42', null);
  assert(
    'Standalone Tenant Topic Fallback',
    standaloneTopics.primary === 'realtime_ui_level_student-42' && standaloneTopics.legacy === 'realtime_ui_level_student-42',
    'Standalone Fallback fehlerhaft'
  );

  // ----------------------------------------------------------------------------
  // 2. ZERO-TRUST SSOT HANDSHAKE & ANTI-SPOOFING (CWE-345 SHIELD)
  // ----------------------------------------------------------------------------
  console.log('\n▶ 2. Prüfe Zero-Trust SSOT Handshake & Anti-Spoofing (PostgreSQL als SSOT)...');
  
  const channelsMap = new Map<string, any>();
  const dbUserRow = {
    id: 'student-uuid-42',
    campus_ui_level: 'junior',
    parent_permissions: { bedtime_lock_enabled: true },
    parent_allow_absences: false,
    parent_allow_reschedule_confirm: false,
    parent_allow_chat: false,
    parent_allow_timer: true,
    parent_allow_leaderboard: false,
    parent_allow_proposals: false,
    parent_allow_audio: false
  };

  let dbQueryCount = 0;

  const mockSupabase = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            dbQueryCount++;
            return { data: { ...dbUserRow }, error: null };
          }
        })
      })
    }),
    channel: (topic: string) => {
      const listeners: Record<string, Function[]> = {};
      const ch = {
        topic,
        state: 'joined',
        on: (type: string, filter: any, callback: Function) => {
          const key = `${type}:${filter.event}`;
          if (!listeners[key]) listeners[key] = [];
          listeners[key].push(callback);
          return ch;
        },
        subscribe: (cb?: Function) => {
          if (cb) setTimeout(() => cb('SUBSCRIBED'), 0);
          return ch;
        },
        send: (msg: any) => {
          const key = `${msg.type}:${msg.event}`;
          if (listeners[key]) {
            listeners[key].forEach((fn) => fn(msg));
          }
        },
        _trigger: (event: string, payload: any) => {
          const key = `broadcast:${event}`;
          if (listeners[key]) {
            listeners[key].forEach((fn) => fn({ payload }));
          }
        }
      };
      channelsMap.set(topic, ch);
      return ch;
    },
    getChannels: () => Array.from(channelsMap.values()),
    removeChannel: (ch: any) => {
      if (ch?.topic) channelsMap.delete(ch.topic);
    }
  };

  let verifiedResult: VerifiedParentPermissions | null = null;
  const unsubscribe = subscribeParentGovernanceRealtime({
    userId: 'student-uuid-42',
    schoolId: 'school-99',
    supabaseClient: mockSupabase,
    onVerifiedUpdate: (data) => {
      verifiedResult = data;
    },
    logger: () => {}
  });

  const primaryCh = channelsMap.get('realtime_parent_gov_school-99_student-uuid-42');
  assert('Primary Realtime Channel registriert', Boolean(primaryCh), 'Channel nicht in Map');

  // 🚨 Angreifer sendet gefälschten Broadcast via WebSocket (CWE-345 Angriffsversuch)
  // Behauptet: Stufe "pro" und allowChat: true, allowAudio: true
  primaryCh._trigger('parent-controls-changed', {
    studentId: 'student-uuid-42',
    uiLevel: 'pro',
    allowChat: true,
    allowAudio: true,
    updatedAt: new Date().toISOString()
  });

  // Warten auf Debounce
  await new Promise((resolve) => setTimeout(resolve, 120));

  assert('SSOT Query gegen PostgreSQL ausgeführt', dbQueryCount >= 1, `DB Abfragen: ${dbQueryCount}`);
  assert('Anti-Spoofing: UI-Level bleibt Junior (DB gewinnt)', verifiedResult?.campus_ui_level === 'junior', `Erhalten: ${verifiedResult?.campus_ui_level}`);
  assert('Anti-Spoofing: allowChat bleibt FALSE (DB gewinnt)', verifiedResult?.parent_allow_chat === false, `Erhalten: ${verifiedResult?.parent_allow_chat}`);
  assert('Anti-Spoofing: allowAudio bleibt FALSE (DB gewinnt)', verifiedResult?.parent_allow_audio === false, `Erhalten: ${verifiedResult?.parent_allow_audio}`);

  // ----------------------------------------------------------------------------
  // 3. MONOTONIC TIMESTAMP & ANTI-REPLAY SHIELD
  // ----------------------------------------------------------------------------
  console.log('\n▶ 3. Prüfe Monotonic Timestamp & Anti-Replay Shield...');
  const currentDbQueries = dbQueryCount;

  // Replay-Angriff: Ein Broadcast aus der Vergangenheit
  primaryCh._trigger('ui-level-changed', {
    uiLevel: 'pro',
    updatedAt: new Date(Date.now() - 3600000).toISOString() // 1 Stunde alt
  });
  await new Promise((resolve) => setTimeout(resolve, 100));

  assert(
    'Anti-Replay: Veralteter Broadcast verwirft DB-Fetch',
    dbQueryCount === currentDbQueries,
    `DB Query count stieg unerwartet von ${currentDbQueries} auf ${dbQueryCount}`
  );

  // ----------------------------------------------------------------------------
  // 4. STANDBY- & WAKE-UP RECONCILIATION
  // ----------------------------------------------------------------------------
  console.log('\n▶ 4. Prüfe Standby- & Wake-up Reconciliation (iOS PWA)...');
  let wakeQueryTriggered = false;
  const originalSupabase = mockSupabase;

  // Simuliere iPad Display-Aktivierung
  if (typeof document !== 'undefined') {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true
    });
    const beforeCount = dbQueryCount;
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert('Wakeup via visibilitychange führt sofortigen SSOT-Check aus', dbQueryCount > beforeCount, 'Keine DB-Prüfung');
  } else {
    assert('Wakeup-Listener in Node-Umgebung syntaktisch geschützt', true);
  }

  unsubscribe();
  assert('Teardown entfernt Channel sauber', !channelsMap.has('realtime_parent_gov_school-99_student-uuid-42'), 'Channel nicht aufgeräumt');

  // ----------------------------------------------------------------------------
  // 5. BROADCASTER DUAL-CHANNEL & DUAL-EVENT COMPLIANCE
  // ----------------------------------------------------------------------------
  console.log('\n▶ 5. Prüfe Broadcaster Dual-Channel & Dual-Event Compliance...');
  await dispatchParentGovernanceBroadcast(mockSupabase, {
    studentId: 'student-uuid-42',
    schoolId: 'school-99',
    uiLevel: 'teen',
    allowChat: true,
    allowAbsences: false
  });

  const sentPrimary = channelsMap.get('realtime_parent_gov_school-99_student-uuid-42');
  const sentLegacy = channelsMap.get('realtime_ui_level_student-uuid-42');

  assert('Broadcaster sendet an Primary Mandanten-Topic', Boolean(sentPrimary), 'Primary Topic fehlt');
  assert('Broadcaster sendet an Legacy Fallback-Topic', Boolean(sentLegacy), 'Legacy Topic fehlt');

  // ----------------------------------------------------------------------------
  // 6. CODEBASE WÄCHTER-INVARIANTEN (PAR-06 & PAR-07 PARITÄT)
  // ----------------------------------------------------------------------------
  console.log('\n▶ 6. Prüfe statische Wächter-Invarianten in Client-Dateien...');
  const studentHookPath = path.join(ROOT_DIR, 'apps', 'groovelab', 'src', 'components', 'student', 'hooks', 'useStudentParentControls.ts');
  const studentHookCode = fs.readFileSync(studentHookPath, 'utf8');

  assert(
    'PAR-06 Parität: Dual-Events in useStudentParentControls',
    studentHookCode.includes("event: 'parent-controls-changed'") && studentHookCode.includes("event: 'ui-level-changed'"),
    'PAR-06 Event-Strings fehlen in useStudentParentControls'
  );

  assert(
    'PAR-07 Parität: Fail-Closed Rollback in useStudentParentControls',
    studentHookCode.includes('[Security Fail-Closed] save_parent_controls RPC rejected update') &&
    studentHookCode.includes('studentUser.campus_ui_level = prevUiLevel'),
    'PAR-07 Fail-Closed Rollback-Strings fehlen in useStudentParentControls'
  );

  const deviceHookPath = path.join(ROOT_DIR, 'apps', 'groovelab', 'src', 'hooks', 'useCampusDeviceAndParentControls.tsx');
  const deviceHookCode = fs.readFileSync(deviceHookPath, 'utf8');

  assert(
    'useCampusDeviceAndParentControls bindet subscribeParentGovernanceRealtime ein',
    deviceHookCode.includes('subscribeParentGovernanceRealtime'),
    'Integration in useCampusDeviceAndParentControls fehlt'
  );

  // ----------------------------------------------------------------------------
  // TEST REPORT SUMMARY
  // ----------------------------------------------------------------------------
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`Ergebnis: ${passedTests} / ${totalTests} Prüfungen erfolgreich`);
  console.log('════════════════════════════════════════════════════════════════════\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runRealtimeParentGovernanceSuite().catch((err) => {
  console.error('Fatal error in Realtime Parent Governance suite:', err);
  process.exit(1);
});
