/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: MASTER-RUNNER 3 — SOVEREIGN DEFENSE & ACTIVE PENTESTING
 * ==============================================================================
 * Standards: DIN EN ISO/IEC 27037:2016 (Digitale Beweissicherung & Forensik),
 *            DIN EN ISO/IEC 27001 (Annex A.8.15 Protokollierung, A.8.16 Überwachung),
 *            BSI TR-02102-1 (Kryptographische Verfahren), NIS-2 & § 202a StGB,
 *            OWASP ASVS Level 3 / Multi-Device Killswitch & WORM Audit Trail
 * 
 * Aggregates all 7 Tier-3 sovereign defense, pentesting, and non-repudiation suites:
 * 1. Tier-3 Sovereign Enterprise & Physical Resilience
 * 2. Client-Side Runtime Integrity, Honey-Traps & ISO 27037 Dossier
 * 3. Session Replay Attack, Token Rotation & Multi-Device Killswitch Drill
 * 4. Fuzzing, SQLi, Unicode Homoglyph & Malicious Payload Pentest
 * 5. Automated BOLA/IDOR/RLS Red-Team Pentest
 * 6. WORM Audit Trail, Non-Repudiation & Cryptographic Digest Drill
 * 7. Legal & Regulatory 360° Forensic
 * ==============================================================================
 */

import { spawnSync } from 'child_process';

interface SuiteResult {
  name: string;
  file: string;
  passed: boolean;
  durationMs: number;
}

const suites = [
  { name: 'Tier-3 Sovereign Enterprise', file: 'apps/groovelab/src/tests/test_tier3_sovereign_enterprise_forensic.ts' },
  { name: 'Runtime Integrity & Honey-Traps', file: 'apps/groovelab/src/tests/test_forensic_optimizations_suite.ts' },
  { name: 'Session Replay & Token Rotation', file: 'apps/groovelab/src/tests/test_session_replay_token_rotation_simulation.ts' },
  { name: 'Fuzzing, SQLi & Input Pentest', file: 'apps/groovelab/src/tests/test_fuzzing_injection_defense_simulation.ts' },
  { name: 'Red-Team RLS & BOLA Audit', file: 'apps/groovelab/src/tests/redteam_rls_audit.ts' },
  { name: 'WORM Non-Repudiation Drill', file: 'apps/groovelab/src/tests/test_worm_audit_trail.ts' },
  { name: 'Legal & Regulatory 360° Forensic', file: 'apps/groovelab/src/tests/test_legal_compliance_360_forensic.ts' }
];

console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║   CAMPUS-GROOVELAB: MASTER-RUNNER 3 — SOVEREIGN ACTIVE DEFENSE     ║');
console.log('║   Standards: DIN EN ISO/IEC 27037, ISO 27001 A.8.15 & BSI TR-02102 ║');
console.log('║   7 Specialized Sovereign & Red-Teaming Suites / Top 0.1% Standard ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

const results: SuiteResult[] = [];
const overallStartTime = Date.now();

for (const suite of suites) {
  console.log(`\n▶ Running: ${suite.name} (${suite.file})...`);
  const start = Date.now();
  
  const proc = spawnSync('npx', ['tsx', suite.file], {
    stdio: 'inherit',
    env: process.env,
    cwd: process.cwd()
  });

  const durationMs = Date.now() - start;
  const passed = proc.status === 0;

  results.push({
    name: suite.name,
    file: suite.file,
    passed,
    durationMs
  });

  if (!passed) {
    console.error(`\n❌ [FAIL] Suite failed: ${suite.name} (Exit code: ${proc.status})`);
  }
}

const totalDurationMs = Date.now() - overallStartTime;
const passedCount = results.filter(r => r.passed).length;
const failedCount = results.filter(r => !r.passed).length;

console.log('\n════════════════════════════════════════════════════════════════════');
console.log('📊 SOVEREIGN FORENSICS AGGREGATED SUMMARY');
console.log('════════════════════════════════════════════════════════════════════');

results.forEach(r => {
  const icon = r.passed ? '✅' : '❌';
  const duration = `${(r.durationMs / 1000).toFixed(2)}s`.padStart(7);
  console.log(`  ${icon} [${duration}] ${r.name}`);
});

console.log('────────────────────────────────────────────────────────────────────');
console.log(`Suites Tested : ${results.length}`);
console.log(`Passed        : ${passedCount}`);
console.log(`Failed        : ${failedCount}`);
console.log(`Total Time    : ${(totalDurationMs / 1000).toFixed(2)}s`);
console.log('════════════════════════════════════════════════════════════════════\n');

if (failedCount > 0) {
  console.error(`🚨 MASTER-RUNNER 3 FAILED: ${failedCount} suite(s) failed validation.`);
  process.exit(1);
} else {
  console.log('🏆 100% SUCCESS: All 7 Sovereign Defense & Active Pentest Suites Verified.');
  process.exit(0);
}
