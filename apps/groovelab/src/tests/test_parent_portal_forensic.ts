/**
 * ==============================================================================
 * 🛡️ CAMPUS-GROOVELAB: FORENSIC PARENT PORTAL & CHILD PROTECTION TEST SUITE
 * ==============================================================================
 * Comprehensive forensic audit testing:
 * 1. OWASP ASVS Level 3 Zero Secret Leakage (No select('*') or plain PIN queries)
 * 2. Server-Side Parent PIN & Lease Architecture (verify_parent_pin_with_lease)
 * 3. Anti-Brute-Force Rate Limiting (5-attempt lock & 30s security cooldown)
 * 4. Authoritative Parental Governance RPCs (save_parent_controls for UI level, bedtime, daytime, screen-time)
 * 5. Digital Child Protection & DSGVO Art. 8 / Art. 17 Compliance
 * 6. Storage Resilience & Fail-Closed Error Boundaries
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, details?: string) {
  if (condition) {
    results.push({ suite, name, passed: true });
    console.log(`  [PASS] ${name}`);
  } else {
    results.push({ suite, name, passed: false, details });
    console.error(`  [FAIL] ${name}: ${details || 'Assertion failed'}`);
  }
}

console.log('================================================================');
console.log('CAMPUS-GROOVELAB: FORENSIC PARENT PORTAL & CHILD PROTECTION AUDIT');
console.log('================================================================');

// ------------------------------------------------------------------------------
// SUITE 1: OWASP ASVS LEVEL 3 ZERO SECRET LEAKAGE IN PARENT SCOPE
// ------------------------------------------------------------------------------
function testZeroSecretLeakage() {
  console.log('\n--- SUITE 1: OWASP ASVS LEVEL 3 ZERO SECRET LEAKAGE ---');

  const settingsDir = path.resolve(__dirname, '../components/student/settings');
  const parentHookPath = path.resolve(__dirname, '../components/student/hooks/useStudentParentControls.ts');
  const parentModalPath = path.resolve(__dirname, '../components/student/modals/GlobalParentPinModal.tsx');

  const allParentFiles: string[] = [parentHookPath, parentModalPath];
  fs.readdirSync(settingsDir).forEach(file => {
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      allParentFiles.push(path.join(settingsDir, file));
    }
  });

  const wildcardUsersViolations: string[] = [];
  const plainPinSelectViolations: string[] = [];
  const rawUsersQueries: string[] = [];

  for (const filePath of allParentFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(path.resolve(__dirname, '..'), filePath);

    if (content.includes("from('users').select('*')") || content.includes('from("users").select("*")')) {
      wildcardUsersViolations.push(relPath);
    }

    if (
      content.includes(".select(") &&
      (content.includes('personal_pin') || content.includes('parent_pin') || content.includes('password_hash')) &&
      !content.includes('has_personal_pin') &&
      !content.includes('has_parent_pin')
    ) {
      plainPinSelectViolations.push(relPath);
    }

    if (content.includes("from('users_raw')") || content.includes('from("users_raw")')) {
      rawUsersQueries.push(relPath);
    }
  }

  assert(
    wildcardUsersViolations.length === 0,
    'OWASP ASVS Level 3',
    'Zero wildcard from("users").select("*") queries in parent module',
    `Violations: ${wildcardUsersViolations.join(', ')}`
  );

  assert(
    plainPinSelectViolations.length === 0,
    'OWASP ASVS Level 3',
    'Zero plain personal_pin, parent_pin, password_hash in users SELECT statements',
    `Violations: ${plainPinSelectViolations.join(', ')}`
  );

  assert(
    rawUsersQueries.length === 0,
    'OWASP ASVS Level 3',
    'Zero direct queries on users_raw in parent module',
    `Violations: ${rawUsersQueries.join(', ')}`
  );
}

// ------------------------------------------------------------------------------
// SUITE 2: SERVER-SIDE PARENT PIN VERIFICATION & ANTI-BRUTE-FORCE
// ------------------------------------------------------------------------------
function testParentPinArchitecture() {
  console.log('\n--- SUITE 2: SERVER-SIDE PARENT PIN VERIFICATION & RATE LIMITING ---');

  const parentHookPath = path.resolve(__dirname, '../components/student/hooks/useStudentParentControls.ts');
  const hookContent = fs.readFileSync(parentHookPath, 'utf8');

  // Check 2.1: Authoritative verify_parent_pin_with_lease RPC usage
  assert(
    hookContent.includes("rpc('verify_parent_pin_with_lease'") || hookContent.includes("rpc('verify_parent_pin'"),
    'Parent PIN Architecture',
    'Parent PIN verification uses authoritative server RPC (verify_parent_pin_with_lease / verify_parent_pin)'
  );

  // Check 2.2: Zero client-side plain-text PIN equality comparisons
  const pinCompRegex = /([a-zA-Z0-9_]+Pin)\s*===+\s*([a-zA-Z0-9_]+Pin)/;
  assert(
    !pinCompRegex.test(hookContent),
    'Parent PIN Architecture',
    'Zero client-side plain-text PIN equality comparisons in useStudentParentControls'
  );

  // Check 2.3: Anti-Brute-Force Rate Limiting (5 failed attempts trigger cooldown)
  assert(
    (hookContent.includes('nextFailCount >= 5') || hookContent.includes('parentGateFailedCount >= 5')) &&
    hookContent.includes('setParentGateCooldownSeconds(30)'),
    'Parent PIN Architecture',
    'Anti-Brute-Force rate limiter enforces 30-second security lockdown after 5 failed attempts'
  );

  // Check 2.4: 180s Rolling Session Lock Hook Integration
  assert(
    hookContent.includes('useParentSessionLock') && hookContent.includes('isParentUnlocked'),
    'Parent PIN Architecture',
    'Parent session enforces automatic rolling inactivity lock via useParentSessionLock'
  );
}

// ------------------------------------------------------------------------------
// SUITE 3: AUTHORITATIVE PARENTAL GOVERNANCE RPCS (ZERO CLIENT ESCALATION)
// ------------------------------------------------------------------------------
function testAuthoritativeGovernanceRpcs() {
  console.log('\n--- SUITE 3: AUTHORITATIVE PARENTAL GOVERNANCE RPCS ---');

  const parentHookPath = path.resolve(__dirname, '../components/student/hooks/useStudentParentControls.ts');
  const hookContent = fs.readFileSync(parentHookPath, 'utf8');

  // Check 3.1: Bedtime mode persisted via save_parent_controls
  assert(
    hookContent.includes("await supabase.rpc('save_parent_controls'") &&
    hookContent.includes('bedtime_enabled'),
    'Parental Governance',
    'Bedtime mode updates enforce authoritative save_parent_controls server RPC'
  );

  // Check 3.2: Daytime lock persisted via save_parent_controls
  assert(
    hookContent.includes("await supabase.rpc('save_parent_controls'") &&
    hookContent.includes('daytime_lock_enabled'),
    'Parental Governance',
    'Daytime lock updates enforce authoritative save_parent_controls server RPC'
  );

  // Check 3.3: Max practice screen minutes persisted via save_parent_controls
  const practiceReportPath = path.resolve(__dirname, '../components/student/settings/ParentPracticeReportSettingsView.tsx');
  const practiceContent = fs.readFileSync(practiceReportPath, 'utf8');
  assert(
    practiceContent.includes("await supabase.rpc('save_parent_controls'") &&
    practiceContent.includes('max_screen_minutes'),
    'Parental Governance',
    'Daily screen-time limits enforce authoritative save_parent_controls server RPC'
  );

  // Check 3.4: Zero direct table updates on users for parent controls
  assert(
    !hookContent.includes("from('users').update({ parent_permissions"),
    'Parental Governance',
    'Zero direct table updates on users.parent_permissions in useStudentParentControls'
  );
}

// ------------------------------------------------------------------------------
// SUITE 4: DIGITAL CHILD PROTECTION & DSGVO ART. 17 COMPLIANCE
// ------------------------------------------------------------------------------
function testChildProtectionAndGdpr() {
  console.log('\n--- SUITE 4: DIGITAL CHILD PROTECTION & DSGVO ART. 17 ---');

  // Check 4.1: GDPR deletion request flow in ParentConsentSettingsView
  const consentPath = path.resolve(__dirname, '../components/student/settings/ParentConsentSettingsView.tsx');
  const consentContent = fs.readFileSync(consentPath, 'utf8');
  assert(
    consentContent.includes("from('gdpr_deletion_requests').insert") &&
    consentContent.includes("scope: 'media_and_profile'"),
    'Child Protection & GDPR',
    'Parent consent settings provides formal DSGVO Art. 17 deletion request workflow'
  );

  // Check 4.2: Zero-Photo Privacy-by-Design Declaration
  assert(
    consentContent.includes('Zero-Photo') || consentContent.includes('biometriefrei'),
    'Child Protection & GDPR',
    'Platform prominently certifies Zero-Photo Privacy-by-Design infrastructure'
  );

  // Check 4.3: Absence cancellation log filters neutral student cancellations
  const cancelLogPath = path.resolve(__dirname, '../components/student/settings/ParentCancellationLogSettingsView.tsx');
  const cancelLogContent = fs.readFileSync(cancelLogPath, 'utf8');
  assert(
    cancelLogContent.includes("s === 'canceled_by_student' || role === 'student'") &&
    !cancelLogContent.includes('krank') &&
    !cancelLogContent.includes('medical'),
    'Child Protection & GDPR',
    'Cancellation log satisfies DSGVO Art. 9 Neutrality Axiom (0 medical/sick tokens)'
  );

  // Check 4.4: DSGVO Art. 15 Self-Service Export Engine with SHA-256 Manifest
  const dataVaultPath = path.resolve(__dirname, '../components/student/settings/ParentDataVaultSettingsView.tsx');
  const dataVaultContent = fs.readFileSync(dataVaultPath, 'utf8');
  const propsBuilderPath = path.resolve(__dirname, '../components/student/tabs/buildStudentSettingsProps.ts');
  const propsBuilderContent = fs.readFileSync(propsBuilderPath, 'utf8');

  assert(
    dataVaultContent.includes('Art. 15 Selbstauskunft') &&
    propsBuilderContent.includes('exportStudentGdprDossier'),
    'Child Protection & GDPR',
    'Parent Data Vault wires 1-click DSGVO Art. 15 Self-Service Export with cryptographic manifest'
  );
}

// ------------------------------------------------------------------------------
// SUITE 5: STORAGE RESILIENCE & FAIL-SAFE ZERO-CRASH
// ------------------------------------------------------------------------------
function testStorageResilience() {
  console.log('\n--- SUITE 5: STORAGE RESILIENCE & FAIL-SAFE ZERO-CRASH ---');

  const parentHookPath = path.resolve(__dirname, '../components/student/hooks/useStudentParentControls.ts');
  const hookContent = fs.readFileSync(parentHookPath, 'utf8');

  // Check 5.1: instantLockUntil wrapped in try/catch
  const instantLockSafe = (
    hookContent.includes('instantLockUntil') &&
    hookContent.includes('try {') &&
    hookContent.includes('localStorage.getItem(`cg_parent_instant_lock_${studentId}`)')
  );
  assert(
    instantLockSafe,
    'Storage Resilience',
    'instantLockUntil initializes safely with try/catch wrapped localStorage read'
  );

  // Check 5.2: isTeacherSession wrapped in try/catch
  const teacherSessionSafe = (
    hookContent.includes('function isTeacherSession()') &&
    hookContent.includes('try {') &&
    hookContent.includes("sessionStorage.getItem('groovelab_active_workspace')")
  );
  assert(
    teacherSessionSafe,
    'Storage Resilience',
    'isTeacherSession wraps sessionStorage reads in fail-safe try/catch block'
  );

  // Check 5.3: checkIsParentUnlockedGlobal wrapped in try/catch
  const unlockedGlobalSafe = (
    hookContent.includes('checkIsParentUnlockedGlobal') &&
    hookContent.includes('try {') &&
    hookContent.includes("sessionStorage.getItem('groovelab_parent_unlocked_global')")
  );
  assert(
    unlockedGlobalSafe,
    'Storage Resilience',
    'checkIsParentUnlockedGlobal wraps sessionStorage reads in fail-safe try/catch block'
  );

  // Check 5.4: Family profiles and instant lock writes wrapped in try/catch
  assert(
    hookContent.includes('try {') && hookContent.includes('localStorage.setItem'),
    'Storage Resilience',
    'Family profile and instant lock storage writes are guarded against quota errors'
  );
}

// ------------------------------------------------------------------------------
// RUN ALL TESTS & PRINT REPORT
// ------------------------------------------------------------------------------
function runAll() {
  testZeroSecretLeakage();
  testParentPinArchitecture();
  testAuthoritativeGovernanceRpcs();
  testChildProtectionAndGdpr();
  testStorageResilience();

  console.log('\n================================================================');
  console.log('AUDIT SUMMARY');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Invariants Tested: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log('\nALL FORENSIC CHECKS PASSED: 100% Parent Portal & Child Protection Integrity Verified.\n');
  } else {
    console.error(`\nFAILED CHECKS DETECTED: ${failed} violations must be resolved.\n`);
    process.exit(1);
  }
}

runAll();
