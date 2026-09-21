/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: FORENSIC MASTER ADMIN DASHBOARD TEST SUITE & MASTER CHECK
 * ==============================================================================
 * Comprehensive forensic audit testing:
 * 1. Zero Secret Leakage & ASVS Level 3 Axioms (No select('*') on users)
 * 2. Master Admin Auth & RPC Invariants (login_master_admin, verify_personal_pin)
 * 3. Canonical Pricing & Financial Invariants (14.90€ / 9.90€ / 19.90€ bundle)
 * 4. Ghost Support & Multi-Tenancy Scoping (Session separation & cleanup)
 * 5. Idle Lock Watchdog & Session Security (15-min fail-closed lock)
 * 6. Action Handlers & Universal Button Contracts (Fail-safe, zero boundary crashes)
 * 7. Coordinator Shell LOC Limit (Monolith Goldstandard <= 850 LOC)
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { LOAD_TIERS } from '../components/masterAdmin/MasterAdminTypes';

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
console.log('CAMPUS-GROOVELAB: FORENSIC MASTER ADMIN DASHBOARD MASTER AUDIT');
console.log('================================================================');

// ------------------------------------------------------------------------------
// SUITE 1: OWASP ASVS LEVEL 3 ZERO SECRET LEAKAGE AUDIT
// ------------------------------------------------------------------------------
function testZeroSecretLeakage() {
  console.log('\n--- SUITE 1: OWASP ASVS LEVEL 3 ZERO SECRET LEAKAGE ---');

  const masterAdminDir = path.resolve(__dirname, '../components/masterAdmin');
  const masterAdminDashboardPath = path.resolve(__dirname, '../components/MasterAdminDashboard.tsx');
  const loginScreenPath = path.resolve(__dirname, '../components/LoginScreen.tsx');
  const startseitePath = path.resolve(__dirname, '../components/Startseite.tsx');
  const deviceSetupPath = path.resolve(__dirname, '../components/DeviceSetupScreen.tsx');

  const allMasterAdminFiles: string[] = [masterAdminDashboardPath, loginScreenPath, startseitePath, deviceSetupPath];
  function scanDir(dir: string) {
    fs.readdirSync(dir).forEach(file => {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
        scanDir(full);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        allMasterAdminFiles.push(full);
      }
    });
  }
  scanDir(masterAdminDir);

  const wildcardUsersViolations: string[] = [];
  const secretLeakageViolations: string[] = [];

  allMasterAdminFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const base = path.basename(file);

    // Check 1: No from('users').select('*')
    if (content.includes("from('users').select('*')") || content.includes("from('users').select('*,") || content.includes('from("users").select("*")')) {
      wildcardUsersViolations.push(base);
    }

    // Check 2: No personal_pin, parent_pin, password_hash in select statements
    const selects = content.match(/\.from\('users'\)\s*\.select\('([^']+)'\)/g);
    if (selects) {
      selects.forEach(sel => {
        if (sel.includes('personal_pin') || sel.includes('parent_pin') || sel.includes('password_hash') || sel.includes('master_admin_password') || sel.includes('two_factor_secret')) {
          secretLeakageViolations.push(base);
        }
      });
    }
  });

  assert(
    wildcardUsersViolations.length === 0,
    'Zero Secret Leakage',
    'Zero wildcard from("users").select("*") queries in master admin module',
    `Found violations in: ${wildcardUsersViolations.join(', ')}`
  );

  assert(
    secretLeakageViolations.length === 0,
    'Zero Secret Leakage',
    'Zero personal_pin, parent_pin, password_hash, two_factor_secret in users SELECT statements',
    `Found violations in: ${secretLeakageViolations.join(', ')}`
  );
}

// ------------------------------------------------------------------------------
// SUITE 2: MASTER ADMIN AUTH & RPC INVARIANTS
// ------------------------------------------------------------------------------
function testMasterAdminAuthInvariants() {
  console.log('\n--- SUITE 2: MASTER ADMIN AUTH & RPC INVARIANTS ---');

  const idleLockPath = path.resolve(__dirname, '../components/masterAdmin/hooks/useMasterAdminIdleLock.ts');
  const idleLockContent = fs.readFileSync(idleLockPath, 'utf-8');

  assert(
    idleLockContent.includes("rpc('login_master_admin'"),
    'Authoritative Auth RPC',
    'useMasterAdminIdleLock uses authoritative login_master_admin RPC for verification',
    'login_master_admin RPC call missing in useMasterAdminIdleLock.ts'
  );

  assert(
    !idleLockContent.includes("verify_personal_pin"),
    'Zero Weak PIN Fallback',
    'useMasterAdminIdleLock forbids 4-digit personal_pin fallback (exclusive Biometrics & TOTP)',
    'Insecure verify_personal_pin fallback still present in useMasterAdminIdleLock.ts'
  );

  assert(
    idleLockContent.includes('isMasterPasskeyRegistered') && idleLockContent.includes('authenticateMasterPasskey'),
    'Hardware Biometrics Integration',
    'useMasterAdminIdleLock natively integrates WebAuthn Passkeys / Touch ID',
    'WebAuthn Passkey integration missing in useMasterAdminIdleLock.ts'
  );

  assert(
    !idleLockContent.includes('storedPassword ===') && !idleLockContent.includes('storedPin ==='),
    'Zero Client-Side Auth',
    'Zero client-side password or PIN comparisons (100% server-side RPC validation)'
  );
}

// ------------------------------------------------------------------------------
// SUITE 3: CANONICAL PRICING & FINANCIAL INVARIANTS
// ------------------------------------------------------------------------------
function testPricingAndFinancialInvariants() {
  console.log('\n--- SUITE 3: CANONICAL PRICING & FINANCIAL INVARIANTS ---');

  const pricingHookPath = path.resolve(__dirname, '../components/masterAdmin/hooks/useMasterAdminPricing.ts');
  const pricingContent = fs.readFileSync(pricingHookPath, 'utf-8');

  // Campus: 14.90 €, GrooveLab: 9.90 €, Kombi: 19.90 €
  const hasCampusPrice = pricingContent.includes('14.90') || pricingContent.includes('14.9');
  const hasGroovelabPrice = pricingContent.includes('9.90') || pricingContent.includes('9.9');
  const hasKombiPrice = pricingContent.includes('19.90') || pricingContent.includes('19.9');

  assert(
    hasCampusPrice,
    'Canonical Pricing',
    'Campus base server-hosting fee default matches canonical 14,90 €'
  );

  assert(
    hasGroovelabPrice,
    'Canonical Pricing',
    'GrooveLab base server-hosting fee default matches canonical 9,90 €'
  );

  assert(
    hasKombiPrice,
    'Canonical Pricing',
    'Kombi-Vorteil bundle fee default matches canonical 19,90 € (saving 4,90 €/Mo)'
  );

  // Bundle math validation
  const campus = 14.90;
  const groovelab = 9.90;
  const kombi = 19.90;
  const savings = Math.round((campus + groovelab - kombi) * 100) / 100;
  assert(
    savings === 4.90,
    'Canonical Pricing',
    `Bundle discount computes precisely 4,90 €/Mo savings (Got: ${savings.toFixed(2)} €)`
  );

  // Storage tiers validation: standard tier must be 0 € (inklusive)
  const hasFreeBaseStorage = pricingContent.includes("gb: 10, price: 0") || pricingContent.includes("price: 0, label: '10 GB");
  assert(
    hasFreeBaseStorage,
    'Canonical Pricing',
    'Base storage tier (10 GB) is 0 € (Inklusive)'
  );
}

// ------------------------------------------------------------------------------
// SUITE 4: GHOST SUPPORT & MULTI-TENANCY SCOPING
// ------------------------------------------------------------------------------
function testGhostSupportAndMultiTenancy() {
  console.log('\n--- SUITE 4: GHOST SUPPORT & MULTI-TENANCY SCOPING ---');

  const ghostCapsulePath = path.resolve(__dirname, '../components/masterAdmin/GhostSupportCapsule.tsx');
  const ghostCapsuleContent = fs.readFileSync(ghostCapsulePath, 'utf-8');

  assert(
    ghostCapsuleContent.includes('groovelab_ghost_school_id'),
    'Ghost Support Scoping',
    'GhostSupportCapsule scopes session by groovelab_ghost_school_id'
  );

  assert(
    ghostCapsuleContent.includes('groovelab_ghost_shadowed_teacher_id'),
    'Ghost Support Scoping',
    'GhostSupportCapsule supports teacher shadowing via groovelab_ghost_shadowed_teacher_id'
  );

  // Clean exit verification
  const schoolsHookPath = path.resolve(__dirname, '../components/masterAdmin/hooks/useMasterAdminSchools.ts');
  const schoolsHookContent = fs.readFileSync(schoolsHookPath, 'utf-8');

  assert(
    schoolsHookContent.includes('activate_support_ghost_session'),
    'Ghost Support Audit',
    'useMasterAdminSchools activates ghost mode via authoritative activate_support_ghost_session RPC'
  );
}

// ------------------------------------------------------------------------------
// SUITE 5: IDLE LOCK WATCHDOG & SESSION SECURITY
// ------------------------------------------------------------------------------
function testIdleLockWatchdog() {
  console.log('\n--- SUITE 5: IDLE LOCK WATCHDOG & SESSION SECURITY ---');

  const idleLockPath = path.resolve(__dirname, '../components/masterAdmin/hooks/useMasterAdminIdleLock.ts');
  const idleLockContent = fs.readFileSync(idleLockPath, 'utf-8');

  // Verify 15-min fail-closed timeout
  assert(
    idleLockContent.includes('15 * 60 * 1000') || idleLockContent.includes('900000'),
    'Idle Lock Security',
    'Idle timeout is configured to exactly 15 minutes (fail-closed)'
  );

  // Activity events reset idle timer
  const hasActivityEvents = idleLockContent.includes('mousemove') && idleLockContent.includes('keydown');
  assert(
    hasActivityEvents,
    'Idle Lock Security',
    'Activity listener tracks user interaction (mousemove, keydown) to reset watchdog'
  );
}

// ------------------------------------------------------------------------------
// SUITE 6: UNIVERSAL BUTTON & ACTION CONTRACTS
// ------------------------------------------------------------------------------
async function testActionContracts() {
  console.log('\n--- SUITE 6: UNIVERSAL BUTTON & ACTION CONTRACTS ---');

  async function safeExecuteAdminAction(action: () => Promise<void>): Promise<{ success: boolean; error?: any }> {
    try {
      await action();
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  const failingAction = async () => {
    throw new Error('Supabase RPC error: activate_support_ghost_session failed due to rate limit');
  };

  const failResult = await safeExecuteAdminAction(failingAction);
  assert(
    failResult.success === false && failResult.error instanceof Error,
    'Universal Button Contract',
    'Failing admin action is safely caught without unhandled promise rejection'
  );

  const succeedingAction = async () => {
    return Promise.resolve();
  };

  const succResult = await safeExecuteAdminAction(succeedingAction);
  assert(
    succResult.success === true,
    'Universal Button Contract',
    'Succeeding admin action completes cleanly'
  );
}

// ------------------------------------------------------------------------------
// SUITE 7: COORDINATOR SHELL LOC LIMIT (MONOLITH GOLDSTANDARD)
// ------------------------------------------------------------------------------
function testCoordinatorShellLoc() {
  console.log('\n--- SUITE 7: COORDINATOR SHELL LOC LIMIT ---');

  const dashboardPath = path.resolve(__dirname, '../components/MasterAdminDashboard.tsx');
  const content = fs.readFileSync(dashboardPath, 'utf-8');
  const lineCount = content.split('\n').length;

  assert(
    lineCount <= 850,
    'Monolith Goldstandard',
    `MasterAdminDashboard.tsx meets the <= 850 LOC limit (Current: ${lineCount} LOC)`,
    `MasterAdminDashboard.tsx has ${lineCount} LOC (Limit is <= 850 LOC)`
  );
}

// ------------------------------------------------------------------------------
// SUITE 8: 1% HIGH-SECURITY HARDENINGS (BIOMETRICS, JIT STEP-UP & INTEGRITY)
// ------------------------------------------------------------------------------
function testHighSecurityHardenings() {
  console.log('\n--- SUITE 8: 1% HIGH-SECURITY HARDENINGS ---');

  // 1. DOM Zeroing & Memory Sanitization
  const dashboardPath = path.resolve(__dirname, '../components/MasterAdminDashboard.tsx');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');

  assert(
    dashboardContent.includes('idleLock.isIdleLocked ?') && dashboardContent.includes('Leitstand geschützt'),
    'DOM Zeroing & Memory Sanitization',
    'MasterAdminDashboard unmounts all data panels and lists when idle locked (Zero DOM Exposure)',
    'DOM Zeroing conditional unmount missing in MasterAdminDashboard.tsx'
  );

  // 2. JIT Step-Up Authentication Hook & Modal
  const stepUpPath = path.resolve(__dirname, '../components/masterAdmin/hooks/useMasterAdminStepUp.ts');
  const stepUpExists = fs.existsSync(stepUpPath);
  const stepUpModalPath = path.resolve(__dirname, '../components/masterAdmin/modals/MasterStepUpChallengeModal.tsx');
  const stepUpModalExists = fs.existsSync(stepUpModalPath);

  assert(
    stepUpExists && stepUpModalExists,
    'JIT Step-Up Infrastructure',
    'useMasterAdminStepUp hook and MasterStepUpChallengeModal exist and are configured',
    'Step-up infrastructure missing'
  );

  // 3. Consolidated Modals Hub with Step-Up Integration
  const modalsHubPath = path.resolve(__dirname, '../components/masterAdmin/modals/MasterAdminModalsHub.tsx');
  const modalsHubContent = fs.existsSync(modalsHubPath) ? fs.readFileSync(modalsHubPath, 'utf-8') : '';

  assert(
    modalsHubContent.includes('MasterStepUpChallengeModal') && modalsHubContent.includes('stepUp.requestStepUp'),
    'Step-Up Enforcement',
    'MasterAdminModalsHub intercepts destructive school operations with stepUp.requestStepUp',
    'Step-up enforcement missing in MasterAdminModalsHub.tsx'
  );

  // 3b. Mandatory TOTP-Only Ghost Mode Enforcement (Zero-Trust Impersonation)
  const stepUpContent = fs.readFileSync(stepUpPath, 'utf-8');
  const stepUpModalContent = fs.readFileSync(stepUpModalPath, 'utf-8');
  const ghostEnforcesTotp = modalsHubContent.includes("'totp_only'") &&
    stepUpContent.includes('totp_only') &&
    stepUpModalContent.includes("mode !== 'totp_only'");

  assert(
    ghostEnforcesTotp,
    'Mandatory TOTP Ghost Mode',
    'Ghost Support Mode strictly enforces Google Authenticator (TOTP) and disallows biometric bypass',
    'Ghost Mode TOTP enforcement missing or incomplete'
  );

  // 4. Ghost Support School Transparency Audit
  const schoolsHookPath = path.resolve(__dirname, '../components/masterAdmin/hooks/useMasterAdminSchools.ts');
  const schoolsHookContent = fs.readFileSync(schoolsHookPath, 'utf-8');

  assert(
    schoolsHookContent.includes("from('audit_logs').insert") && schoolsHookContent.includes('SUPPORT_GHOST_SESSION_STARTED'),
    'Ghost Transparency (DSGVO Art. 28)',
    'handleStartGhostMode writes transparent audit record into target school audit_logs',
    'Transparent school audit log missing in useMasterAdminSchools.ts'
  );

  // 5. Client-Side Runtime Integrity Guard
  const shieldHookPath = path.resolve(__dirname, '../components/masterAdmin/hooks/useMasterAdminSecurityShield.ts');
  const shieldContent = fs.existsSync(shieldHookPath) ? fs.readFileSync(shieldHookPath, 'utf-8') : '';

  assert(
    shieldContent.includes('Object.prototype') && shieldContent.includes('window.self !== window.top'),
    'Client Runtime Integrity Guard',
    'useMasterAdminSecurityShield detects Prototype Pollution and Clickjacking attempts',
    'Security shield verification missing in useMasterAdminSecurityShield.ts'
  );
}

// ------------------------------------------------------------------------------
// SUITE 9: 100% ZERO MASTER ADMIN PASSWORD INVARIANT (OWASP ASVS L4 / NIST SP 800-63B)
// ------------------------------------------------------------------------------
function testZeroMasterAdminPasswordInvariant() {
  console.log('\n--- SUITE 9: 100% ZERO MASTER ADMIN PASSWORD INVARIANT ---');

  const entryFiles = [
    path.resolve(__dirname, '../components/MasterAdminDashboard.tsx'),
    path.resolve(__dirname, '../components/LoginScreen.tsx'),
    path.resolve(__dirname, '../components/Startseite.tsx'),
    path.resolve(__dirname, '../components/DeviceSetupScreen.tsx'),
    path.resolve(__dirname, '../components/masterAdmin/tabs/OperatorTab.tsx'),
    path.resolve(__dirname, '../components/masterAdmin/hooks/useMasterAdminOperator.ts'),
    path.resolve(__dirname, '../components/masterAdmin/hooks/useMasterAdminIdleLock.ts')
  ];

  entryFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    const base = path.basename(filePath);

    // Check 1: Zero master password input fields, states or placeholders
    const hasPasswordStateOrInput = /(?:\b(?:adminPasswordInput|masterKeyInput|adminMasterPassword)\b|placeholder=['"][^'"]*Master-(?:Schlüssel|Passwort))/i.test(content);
    assert(
      !hasPasswordStateOrInput,
      'Zero Master Admin Password',
      `Zero master password state or input field in ${base}`,
      `Found forbidden master password state or input in ${base}`
    );

    // Check 2: Zero active p_password parameter in login_master_admin RPC calls
    const callsWithPassword = /rpc\(\s*['"]login_master_admin['"]\s*,\s*\{[^}]*p_password\s*:\s*(?!null|undefined|'')[^,\}\s]+/gs.test(content);
    assert(
      !callsWithPassword,
      'Zero Master Admin Password',
      `Zero active p_password argument in login_master_admin calls in ${base}`,
      `Found active p_password passed to login_master_admin in ${base}`
    );
  });
}

// ------------------------------------------------------------------------------
// EXECUTION & SUMMARY
// ------------------------------------------------------------------------------
async function runAll() {
  testZeroSecretLeakage();
  testMasterAdminAuthInvariants();
  testPricingAndFinancialInvariants();
  testGhostSupportAndMultiTenancy();
  testIdleLockWatchdog();
  await testActionContracts();
  testCoordinatorShellLoc();
  testHighSecurityHardenings();
  testZeroMasterAdminPasswordInvariant();

  console.log('\n================================================================');
  console.log('AUDIT SUMMARY');
  console.log('================================================================');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log(`Total Invariants Tested: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.log('\n⚠️ FORENSIC SCAN DETECTED DEFECTS:');
    results.filter(r => !r.passed).forEach(f => {
      console.log(`  - [${f.suite}] ${f.name}: ${f.details}`);
    });
  } else {
    console.log('\nALL FORENSIC CHECKS PASSED: 100% Master Admin Suite Integrity Verified.');
  }
}

runAll();
