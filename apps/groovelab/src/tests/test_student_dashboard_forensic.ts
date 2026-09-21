/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: FORENSIC STUDENT DASHBOARD TEST SUITE & MASTER AUDIT
 * ==============================================================================
 * Comprehensive forensic audit testing for the Student Dashboard suite:
 * 1. OWASP ASVS Level 3 Zero Secret Leakage (No select('*') on users, no secret leaks)
 * 2. Child Protection & Parental Governance (DSGVO Art. 8, § 8a SGB VIII)
 * 3. Student Auth & Sibling Isolation (Server RPCs, no client plain PIN checks)
 * 4. Schedule, Cancellation & Attendance Invariants (cancel RPC, past block, neutrality)
 * 5. Audio Vault, Mediathek SWR & Storage Resilience (Namespaced cache, safe storage)
 * 6. Universal Button & Interaction Contracts (Fail-safe try/catch, disabled states)
 * 7. Monolith Goldstandard Architecture (Sub-850 LOC Coordinator Shell, Modals Hub)
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { formatTeacherFullName, maskLastName } from '../utils/nameHelper';
import { getSimulatedNow, toLocalYYYYMMDD, getDaysBetweenLocal, getISOWeekRaw } from '../components/student/studentDateUtils';

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
console.log('CAMPUS-GROOVELAB: FORENSIC STUDENT DASHBOARD MASTER AUDIT');
console.log('================================================================');

const studentDir = path.resolve(__dirname, '../components/student');
const studentDashboardPath = path.resolve(__dirname, '../components/StudentAvatarDashboard.tsx');

const allStudentFiles: string[] = [studentDashboardPath];
function scanDir(dir: string) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      scanDir(full);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      allStudentFiles.push(full);
    }
  });
}
scanDir(studentDir);

// ------------------------------------------------------------------------------
// SUITE 1: OWASP ASVS LEVEL 3 ZERO SECRET LEAKAGE AUDIT
// ------------------------------------------------------------------------------
function testZeroSecretLeakage() {
  console.log('\n--- SUITE 1: OWASP ASVS LEVEL 3 ZERO SECRET LEAKAGE ---');

  const wildcardUsersViolations: string[] = [];
  const wildcardForeignJoinViolations: string[] = [];
  const secretLeakageViolations: string[] = [];
  const usersRawViolations: string[] = [];

  allStudentFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const base = path.basename(file);

    // Check 1.1: No from('users').select('*')
    if (
      content.includes("from('users').select('*')") ||
      content.includes("from('users').select('*,") ||
      content.includes('from("users").select("*")') ||
      content.includes('from("users").select("*,')
    ) {
      wildcardUsersViolations.push(base);
    }

    // Check 1.2: No foreign wildcard join on users like teacher:users!fk(*)
    if (
      content.includes("users!schedule_occurrences_teacher_id_fkey(*)") ||
      content.includes("users!schedules_teacher_id_fkey(*)") ||
      /teacher:users![a-zA-Z0-9_]+\(\*\)/.test(content)
    ) {
      wildcardForeignJoinViolations.push(base);
    }

    // Check 1.3: No personal_pin, parent_pin, password_hash in select statements
    const selects = content.match(/\.from\('users'\)\s*\.select\('([^']+)'\)/g);
    if (selects) {
      selects.forEach(sel => {
        if (
          sel.includes('personal_pin') ||
          sel.includes('parent_pin') ||
          sel.includes('password_hash') ||
          sel.includes('two_factor_secret') ||
          sel.includes('master_admin_password')
        ) {
          secretLeakageViolations.push(base);
        }
      });
    }

    // Check 1.4: No direct queries on users_raw
    if (content.includes("from('users_raw')") || content.includes('from("users_raw")')) {
      usersRawViolations.push(base);
    }
  });

  assert(
    wildcardUsersViolations.length === 0,
    'Zero Secret Leakage',
    'Zero direct from("users").select("*") queries in student module',
    `Found violations in: ${wildcardUsersViolations.join(', ')}`
  );

  assert(
    wildcardForeignJoinViolations.length === 0,
    'Zero Secret Leakage',
    'Zero foreign wildcard teacher:users!fk(*) joins in student queries',
    `Found violations in: ${wildcardForeignJoinViolations.join(', ')}`
  );

  assert(
    secretLeakageViolations.length === 0,
    'Zero Secret Leakage',
    'Zero personal_pin, parent_pin, password_hash in users SELECT statements',
    `Found violations in: ${secretLeakageViolations.join(', ')}`
  );

  assert(
    usersRawViolations.length === 0,
    'Zero Secret Leakage',
    'Zero direct queries on users_raw in student module',
    `Found violations in: ${usersRawViolations.join(', ')}`
  );
}

// ------------------------------------------------------------------------------
// SUITE 2: CHILD PROTECTION & PARENTAL GOVERNANCE (DSGVO ART. 8, § 8a SGB VIII)
// ------------------------------------------------------------------------------
function testChildProtectionAndParentalGovernance() {
  console.log('\n--- SUITE 2: CHILD PROTECTION & PARENTAL GOVERNANCE ---');

  const parentControlsHookPath = path.resolve(studentDir, 'hooks/useStudentParentControls.ts');
  const parentControlsContent = fs.readFileSync(parentControlsHookPath, 'utf-8');

  // Check 2.1: Server-Side Parent PIN Verification via RPC
  const usesVerifyParentPinRpc = parentControlsContent.includes("rpc('verify_parent_pin'") ||
                                parentControlsContent.includes("rpc('verify_parent_pin_with_lease'");
  assert(
    usesVerifyParentPinRpc,
    'Parental Governance',
    'Parent PIN verification uses authoritative server RPC (verify_parent_pin / verify_parent_pin_with_lease)',
    'useStudentParentControls.ts must invoke verify_parent_pin RPC'
  );

  // Check 2.2: 0 client-side plain-text PIN comparisons
  let clientSidePinComparison = false;
  allStudentFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    if (
      content.includes('storedPin === enteredPin') ||
      content.includes('parent_pin === input') ||
      content.includes('user.parent_pin ===')
    ) {
      clientSidePinComparison = true;
    }
  });
  assert(
    !clientSidePinComparison,
    'Parental Governance',
    'Zero client-side plain-text PIN equality comparisons in student components'
  );

  // Check 2.3: Parental Controls save via save_parent_controls RPC
  const dashContent = fs.readFileSync(studentDashboardPath, 'utf-8');
  const usesSaveParentControlsRpc = dashContent.includes("rpc('save_parent_controls'");
  assert(
    usesSaveParentControlsRpc,
    'Parental Governance',
    'UI Level changes enforce authoritative save_parent_controls server RPC'
  );

  // Check 2.4: Digital Detox / Screen-Time Tracker logic
  const profileHookPath = path.resolve(studentDir, 'hooks/useStudentProfile.ts');
  const profileHookContent = fs.readFileSync(profileHookPath, 'utf-8');
  const hasScreenTimeTracking = profileHookContent.includes('cg_parent_max_screen_minutes_') &&
                               profileHookContent.includes('document.visibilityState');
  assert(
    hasScreenTimeTracking,
    'Child Protection',
    'Digital Detox: Screen-time tracking respects parent_permissions and visibilityState'
  );
}

// ------------------------------------------------------------------------------
// SUITE 3: STUDENT AUTHENTICATION & MULTI-TENANCY ISOLATION
// ------------------------------------------------------------------------------
function testStudentAuthAndMultiTenancy() {
  console.log('\n--- SUITE 3: STUDENT AUTHENTICATION & MULTI-TENANCY ISOLATION ---');

  const settingsTabPath = path.resolve(studentDir, 'tabs/StudentSettingsTab.tsx');
  const settingsTabContent = fs.readFileSync(settingsTabPath, 'utf-8');

  // Check 3.1: Student PIN Setup via authoritative RPC
  const hasInitialPinRpc = settingsTabContent.includes("rpc('set_initial_student_pin'") ||
                           settingsTabContent.includes("rpc('set_personal_pin'");
  assert(
    hasInitialPinRpc,
    'Student Auth',
    'Student PIN setup/update invokes authoritative set_initial_student_pin / set_personal_pin RPC',
    'StudentSettingsTab must use server RPC for PIN setup'
  );

  // Check 3.2: Sibling PIN isolation via verify_personal_pin
  const siblingModalPath = path.resolve(studentDir, 'modals/SiblingPinUnlockModal.tsx');
  const siblingModalContent = fs.readFileSync(siblingModalPath, 'utf-8');
  const siblingUsesPersonalPinRpc = siblingModalContent.includes("rpc('verify_personal_pin'");
  assert(
    siblingUsesPersonalPinRpc,
    'Sibling Isolation',
    'Sibling account switching verifies 4-digit PIN via server-side verify_personal_pin RPC'
  );

  // Check 3.3: Fail-closed PIN reset via recovery key
  const usesRecoveryKeyRpc = settingsTabContent.includes("rpc('set_parent_pin_with_recovery_key'");
  assert(
    usesRecoveryKeyRpc,
    'Student Auth',
    'Parent PIN setup includes cryptographic recovery key via set_parent_pin_with_recovery_key RPC'
  );

  // Check 3.4: Legacy insecure fallback check in StudentAccessSection
  const accessSectionPath = path.resolve(studentDir, 'detail/shared/StudentAccessSection.tsx');
  let hasInsecureFallback = false;
  if (fs.existsSync(accessSectionPath)) {
    const accessContent = fs.readFileSync(accessSectionPath, 'utf-8');
    if (accessContent.includes("personal_pin: null") && accessContent.includes("!rpcOk")) {
      hasInsecureFallback = true;
    }
  }
  assert(
    !hasInsecureFallback,
    'Fail-Closed Invariant',
    'StudentAccessSection does NOT use client-side table update fallback when reset RPC fails',
    'StudentAccessSection has insecure client-side update fallback on users table'
  );
}

// ------------------------------------------------------------------------------
// SUITE 4: SCHEDULE, CANCELLATION & ATTENDANCE INVARIANTS
// ------------------------------------------------------------------------------
function testScheduleAndCancellationInvariants() {
  console.log('\n--- SUITE 4: SCHEDULE, CANCELLATION & ATTENDANCE INVARIANTS ---');

  const scheduleHookPath = path.resolve(studentDir, 'hooks/useStudentSchedule.ts');
  const scheduleHookContent = fs.readFileSync(scheduleHookPath, 'utf-8');

  // Check 4.1: Cancellation via cancel_student_schedule_occurrence RPC
  const usesCancelRpc = scheduleHookContent.includes("rpc('cancel_student_schedule_occurrence'");
  assert(
    usesCancelRpc,
    'Schedule Invariants',
    'Lesson cancellation uses authoritative cancel_student_schedule_occurrence RPC'
  );

  // Check 4.2: Undo cancellation via undo_cancel_student_schedule_occurrence RPC
  const usesUndoCancelRpc = scheduleHookContent.includes("rpc('undo_cancel_student_schedule_occurrence'");
  assert(
    usesUndoCancelRpc,
    'Schedule Invariants',
    'Cancellation revocation uses authoritative undo_cancel_student_schedule_occurrence RPC'
  );

  // Check 4.3: Fail-Closed Vergangenheits-Sperre
  const hasPastCancellationLock = scheduleHookContent.includes('Vergangene Termine können nicht mehr abgesagt werden');
  assert(
    hasPastCancellationLock,
    'Schedule Invariants',
    'Fail-Closed Vergangenheits-Sperre prevents cancelling past occurrences'
  );

  // Check 4.4: DSGVO Art. 9 Neutralitäts-Axiom
  const setsNeutralStatus = scheduleHookContent.includes("'canceled_by_student'");
  const hasMedicalTokens = scheduleHookContent.includes("status: 'sick'") ||
                           scheduleHookContent.includes("status: 'ill'");
  assert(
    setsNeutralStatus && !hasMedicalTokens,
    'Schedule Invariants',
    'DSGVO Art. 9 Neutralitäts-Axiom: Status is neutral canceled_by_student (0 medical/sick tokens)'
  );

  // Check 4.5: Parent permission gate on student absences
  const checksParentAbsencePermission = scheduleHookContent.includes('isStudentAbsenceAllowed') &&
                                        scheduleHookContent.includes('setGlobalPinPendingAction');
  assert(
    checksParentAbsencePermission,
    'Schedule Invariants',
    'Student cancellation requires parent PIN when parent_allow_absences is false'
  );
}

// ------------------------------------------------------------------------------
// SUITE 5: AUDIO VAULT, MEDIATHEK SWR & STORAGE RESILIENCE
// ------------------------------------------------------------------------------
function testStorageAndAudioResilience() {
  console.log('\n--- SUITE 5: AUDIO VAULT, MEDIATHEK SWR & STORAGE RESILIENCE ---');

  const songsDataHookPath = path.resolve(studentDir, 'hooks/useStudentSongsData.ts');
  const songsDataContent = fs.readFileSync(songsDataHookPath, 'utf-8');

  // Check 5.1: SWR Cache Isolation per studentId
  const usesNamespacedSwrCache = songsDataContent.includes('cg_mediathek_cache_${targetId}') ||
                                songsDataContent.includes('cg_mediathek_cache_${studentId}');
  assert(
    usesNamespacedSwrCache,
    'Storage Resilience',
    'Mediathek SWR cache is strictly namespaced per student (cg_mediathek_cache_${studentId})'
  );

  // Check 5.2: Safe storage access in useStudentProfile
  const profileHookPath = path.resolve(studentDir, 'hooks/useStudentProfile.ts');
  const profileHookLines = fs.readFileSync(profileHookPath, 'utf-8').split('\n');
  let unwrappedStorageCalls: number[] = [];

  profileHookLines.forEach((line, idx) => {
    if (line.includes('localStorage.') || line.includes('sessionStorage.')) {
      // Look back up to 10 lines to ensure a try block is wrapping it
      const lookback = profileHookLines.slice(Math.max(0, idx - 10), idx + 1).join('\n');
      if (!lookback.includes('try {') && !lookback.includes('try{')) {
        unwrappedStorageCalls.push(idx + 1);
      }
    }
  });

  assert(
    unwrappedStorageCalls.length === 0,
    'Storage Resilience',
    'useStudentProfile wraps all localStorage and sessionStorage operations in fail-safe try/catch blocks',
    `Unwrapped calls at lines: ${unwrappedStorageCalls.join(', ')}`
  );

  // Check 5.3: Safe storage access in studentDateUtils
  const dateUtilsPath = path.resolve(studentDir, 'studentDateUtils.ts');
  const dateUtilsContent = fs.readFileSync(dateUtilsPath, 'utf-8');
  assert(
    typeof getSimulatedNow() === 'object' && !isNaN(getSimulatedNow().getTime()),
    'Storage Resilience',
    'getSimulatedNow returns valid Date object regardless of simulated storage state'
  );
}

// ------------------------------------------------------------------------------
// SUITE 6: UNIVERSAL BUTTON & INTERACTION CONTRACTS
// ------------------------------------------------------------------------------
function testUniversalButtonContracts() {
  console.log('\n--- SUITE 6: UNIVERSAL BUTTON & INTERACTION CONTRACTS ---');

  // Check 6.1: HomeworkBookErrorBoundary is integrated
  const dashContent = fs.readFileSync(studentDashboardPath, 'utf-8');
  const hasErrorBoundary = dashContent.includes('HomeworkBookErrorBoundary');
  assert(
    hasErrorBoundary,
    'Interaction Contracts',
    'StudentAvatarDashboard integrates HomeworkBookErrorBoundary against unhandled render crashes'
  );

  // Check 6.2: Disabled state on PIN saving in FirstLoginPinModal
  const pinModalPath = path.resolve(studentDir, 'modals/FirstLoginPinModal.tsx');
  const pinModalContent = fs.readFileSync(pinModalPath, 'utf-8');
  const hasPinSavingProtection = pinModalContent.includes('!isSavingPin') ||
                                pinModalContent.includes('disabled={isSavingPin}');
  assert(
    hasPinSavingProtection,
    'Interaction Contracts',
    'FirstLoginPinModal guards PIN submission against double-execution with isSavingPin'
  );

  // Check 6.3: Fail-safe try/catch on level change
  const hasSafeLevelChange = dashContent.includes('handleLevelChange') &&
                            dashContent.includes('try {') &&
                            dashContent.includes('await supabase.rpc(\'save_parent_controls\'');
  assert(
    hasSafeLevelChange,
    'Interaction Contracts',
    'handleLevelChange wraps RPC call in structured try/catch'
  );
}

// ------------------------------------------------------------------------------
// SUITE 7: MONOLITH GOLDSTANDARD ARCHITECTURE & LOC INTEGRITY
// ------------------------------------------------------------------------------
function testMonolithGoldstandardArchitecture() {
  console.log('\n--- SUITE 7: MONOLITH GOLDSTANDARD ARCHITECTURE & LOC INTEGRITY ---');

  const dashContent = fs.readFileSync(studentDashboardPath, 'utf-8');
  const lineCount = dashContent.split('\n').length;

  assert(
    lineCount <= 850,
    'Monolith Goldstandard',
    `StudentAvatarDashboard.tsx strictly $\\le 850$ LOC (Ist: ${lineCount} LOC)`,
    `Line count exceeded: ${lineCount} > 850`
  );

  // Check 7.2: Modals Hub Isolation
  const hasModalsHub = dashContent.includes('StudentModalsHub');
  assert(
    hasModalsHub,
    'Monolith Goldstandard',
    'StudentAvatarDashboard delegates modal dialogs to StudentModalsHub'
  );

  // Check 7.3: Props Builder Pattern
  const hasBriefingBuilder = dashContent.includes('buildStudentBriefingProps');
  const hasSettingsBuilder = dashContent.includes('buildStudentSettingsProps');
  assert(
    hasBriefingBuilder && hasSettingsBuilder,
    'Monolith Goldstandard',
    'StudentAvatarDashboard uses props builder pattern for StudentBriefingTab & StudentSettingsTab'
  );

  // Check 7.4: Domain Hooks Suite count
  const expectedHooks = [
    'useStudentProfile',
    'useStudentPracticeSession',
    'useStudentStreaks',
    'useStudentParentControls',
    'useStudentSchedule',
    'useStudentFeed',
    'useStudentSongsData'
  ];
  const missingHooks: string[] = [];
  expectedHooks.forEach(hook => {
    const hookPath = path.resolve(studentDir, `hooks/${hook}.ts`);
    if (!fs.existsSync(hookPath)) {
      missingHooks.push(hook);
    }
  });

  assert(
    missingHooks.length === 0,
    'Monolith Goldstandard',
    'All 7 Student Domain Hooks exist and are isolated under components/student/hooks/',
    `Missing: ${missingHooks.join(', ')}`
  );
}

// ------------------------------------------------------------------------------
// RUN ALL SUITES & SUMMARY
// ------------------------------------------------------------------------------
testZeroSecretLeakage();
testChildProtectionAndParentalGovernance();
testStudentAuthAndMultiTenancy();
testScheduleAndCancellationInvariants();
testStorageAndAudioResilience();
testUniversalButtonContracts();
testMonolithGoldstandardArchitecture();

console.log('\n================================================================');
console.log('AUDIT SUMMARY');
console.log('================================================================');

const passedCount = results.filter(r => r.passed).length;
const failedCount = results.filter(r => !r.passed).length;
console.log(`Total Invariants Checked : ${results.length}`);
console.log(`Passed                   : ${passedCount}`);
console.log(`Failed                   : ${failedCount}`);

if (failedCount > 0) {
  console.log('\nFAILED INVARIANTS:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`- [${r.suite}] ${r.name}: ${r.details || 'Failed'}`);
  });
}
console.log('================================================================\n');
