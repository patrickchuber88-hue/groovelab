#!/usr/bin/env node
// =============================================================================
// 🛡️ Campus-Groovelab Parental Governance & Digital Child Protection Guard
// Standard:  0,1% Goldstandard — OWASP ASVS L3 / BGB § 104 / DSGVO Art. 8, 17, 25 /
//            NIST SP 800-63B / ISO/IEC 27001 Annex A.8 / BFSG 2025
// Runtime:   Native Node.js ESM — 100% In-Memory (< 80ms)
// Protocol:  Halts CI / Morning Gate with exit code 1 on ANY child protection violation.
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'apps', 'groovelab', 'src');

let violations = 0;
let passed = 0;

function check(name, condition, errorMsg = '') {
  if (condition) {
    passed++;
    process.stdout.write(`  ✅ [PASS] ${name}\n`);
  } else {
    violations++;
    process.stderr.write(`  ❌ [FAIL] ${name}\n     ↳ REASON: ${errorMsg}\n`);
  }
}

const HR = '═'.repeat(74);
process.stdout.write(`\n${HR}\n`);
process.stdout.write('  🛡️   CAMPUS-GROOVELAB PARENTAL GOVERNANCE & CHILD PROTECTION GUARD\n');
process.stdout.write('       0,1% Goldstandard: OWASP ASVS L3, BGB § 104, DSGVO Art. 8/17/25\n');
process.stdout.write(`${HR}\n\n`);

// -----------------------------------------------------------------------------
// 1. AXIOM: BGB § 104 JUNIOR STANDARDS & PRIVACY-BY-DEFAULT
// -----------------------------------------------------------------------------
const ageStandardsPath = path.join(SRC_DIR, 'components', 'student', 'studentAgeStandards.ts');
if (!fs.existsSync(ageStandardsPath)) {
  check('PAR-01: Age Standards File Exists', false, 'studentAgeStandards.ts not found.');
} else {
  const ageStandardsCode = fs.readFileSync(ageStandardsPath, 'utf8');
  const juniorBlock = ageStandardsCode.match(/junior:\s*\{[\s\S]*?\}/)?.[0] || '';

  check(
    'PAR-01: BGB § 104 Junior Standard (Absenzen & Reschedule = FALSE)',
    juniorBlock.includes('allowAbsences: false') && juniorBlock.includes('allowRescheduleConfirm: false'),
    'Junior Standard in studentAgeStandards.ts erlaubt unzulässige Absenzen oder Reschedule!'
  );

  check(
    'PAR-02: DSGVO Art. 25(2) Junior Privacy-by-Default (Audio, Chat & Cup = FALSE)',
    juniorBlock.includes('allowAudio: false') && 
    juniorBlock.includes('allowChat: false') && 
    juniorBlock.includes('allowLeaderboard: false') &&
    juniorBlock.includes('campus_cup: false'),
    'Junior Standard verletzt Privacy-by-Default (Audio, Chat, Leaderboard oder Campus Cup aktiv)!'
  );
}

// -----------------------------------------------------------------------------
// 2. AXIOM: POSTGRESQL DATABASE FAIL-CLOSED ENFORCEMENT (MIGRATION 508 SSOT)
// -----------------------------------------------------------------------------
const mig508Path = path.join(ROOT_DIR, 'supabase', 'migrations', '508_enterprise_save_parent_controls_reschedule_parity.sql');
if (!fs.existsSync(mig508Path)) {
  check('PAR-03: Migration 508 Exists', false, 'Migration 508 file not found.');
} else {
  const mig508Code = fs.readFileSync(mig508Path, 'utf8');
  const hasHardCap = mig508Code.includes("IF v_ui_level = 'junior' THEN") &&
                     mig508Code.includes("v_allow_absences := false;") &&
                     mig508Code.includes("v_allow_reschedule := false;");

  check(
    'PAR-03: PostgreSQL Database Hard-Cap (Junior zwingt Absenzen/Reschedule auf false)',
    hasHardCap,
    'Migration 508 fehlt die unumstößliche serverseitige Überschreibung bei Junior-Level!'
  );
}

// -----------------------------------------------------------------------------
// 3. AXIOM: SERVER-SIDE PIN VERIFICATION & ZERO CLIENT EQUALITY (OWASP ASVS L3)
// -----------------------------------------------------------------------------
const parentHookPath = path.join(SRC_DIR, 'components', 'student', 'hooks', 'useStudentParentControls.ts');
if (!fs.existsSync(parentHookPath)) {
  check('PAR-04: Parent Hook Exists', false, 'useStudentParentControls.ts not found.');
} else {
  const hookCode = fs.readFileSync(parentHookPath, 'utf8');

  const hasServerRpc = hookCode.includes("rpc('verify_parent_pin_with_lease'") || 
                       hookCode.includes("rpc('verify_parent_pin'");
  const hasNoClientPinComparison = !/([a-zA-Z0-9_]+Pin)\s*===+\s*([a-zA-Z0-9_]+Pin)/.test(hookCode);

  check(
    'PAR-04: OWASP ASVS L3 Server-Side PIN Verifikation (verify_parent_pin_with_lease)',
    hasServerRpc && hasNoClientPinComparison,
    'useStudentParentControls nutzt clientseitige PIN-Vergleiche oder umgeht verify_parent_pin_with_lease!'
  );

  // ---------------------------------------------------------------------------
  // 4. AXIOM: NIST SP 800-63B ANTI-BRUTE-FORCE & COOLDOWN SHIELD
  // ---------------------------------------------------------------------------
  const hasAntiBruteForce = (hookCode.includes('parentGateFailedCount >= 5') || hookCode.includes('nextFailCount >= 5')) &&
                            hookCode.includes('setParentGateCooldownSeconds(30)');

  check(
    'PAR-05: NIST SP 800-63B Anti-Brute-Force Shield (5 Versuche / 30s Cooldown)',
    hasAntiBruteForce,
    'Anti-Brute-Force Mechanismus im Elternbereich unvollständig oder gelockert!'
  );

  // ---------------------------------------------------------------------------
  // 5. AXIOM: DUAL-EVENT REALTIME SYNCHRONIZATION AXIOM
  // ---------------------------------------------------------------------------
  const hasDualEvent = hookCode.includes("event: 'parent-controls-changed'") && 
                       hookCode.includes("event: 'ui-level-changed'");

  check(
    'PAR-06: Dual-Event Cross-Device Realtime Broadcast (parent-controls-changed & ui-level-changed)',
    hasDualEvent,
    'Cross-Device Echtzeitsynchronisation fehlt das Dual-Event für Schülertablets!'
  );

  // ---------------------------------------------------------------------------
  // 6. AXIOM: ZERO-TRUST FAIL-CLOSED ROLLBACK
  // ---------------------------------------------------------------------------
  const hasFailClosedRollback = hookCode.includes('[Security Fail-Closed] save_parent_controls RPC rejected update') &&
                                hookCode.includes('studentUser.campus_ui_level = prevUiLevel');

  check(
    'PAR-07: Zero-Trust Fail-Closed Rollback bei save_parent_controls Ablehnung',
    hasFailClosedRollback,
    'useStudentParentControls fehlt der Fail-Closed State-Rollback bei abgewiesener Servermutation!'
  );
}

// -----------------------------------------------------------------------------
// 7. AXIOM: DSGVO ART. 17 AUTONOME NOTFALL-LÖSCHUNG DURCH ERZIEHUNGSBERECHTIGTE
// -----------------------------------------------------------------------------
const parentConsentPath = path.join(SRC_DIR, 'components', 'student', 'settings', 'ParentConsentSettingsView.tsx');
if (!fs.existsSync(parentConsentPath)) {
  check('PAR-08: Parent Consent Settings Exists', false, 'ParentConsentSettingsView.tsx not found.');
} else {
  const consentCode = fs.readFileSync(parentConsentPath, 'utf8');
  const hasPurgeAudio = consentCode.includes('purge_student_recordings_by_parent');

  check(
    'PAR-08: DSGVO Art. 17 Autonome Notfall-Löschung von Audio-Aufnahmen durch Eltern',
    hasPurgeAudio,
    'ParentConsentSettingsView fehlt die Notfall-Löschfunktion (purge_student_recordings_by_parent) für Kindertonspuren!'
  );
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
process.stdout.write('\n' + '─'.repeat(74) + '\n');
process.stdout.write(`  ERGEBNIS: ${passed} / ${passed + violations} Prüfungen bestanden (${violations} Verstöße)\n`);
process.stdout.write('─'.repeat(74) + '\n\n');

if (violations > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
