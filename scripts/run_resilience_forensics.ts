/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: MASTER-RUNNER 2 — RESILIENCE & OFFLINE AUTARKY FORENSICS
 * ==============================================================================
 * Standards: DIN EN ISO/IEC 25010 (Zuverlässigkeit, Fehlertoleranz & Wiederherstellbarkeit),
 *            DIN EN ISO 22301:2020 (Business Continuity Management & Ausfallsicherheit),
 *            DIN EN ISO/IEC 27001 (Annex A.8.14 Redundanz & Verfügbarkeit),
 *            W3C Trace Context (Distributed Tracing), RFC 7807, OWASP ASVS Level 3
 * 
 * Aggregates all 8 resilience, fault-isolation and offline autarky test suites:
 * 1. Resilience & Fault Isolation All Dashboards
 * 2. Bunker Offline & Zero-Loss Resync Simulation
 * 3. Cold-Cache & Hydration Invariants
 * 4. Isolated Unit Business Logic (Pure Math)
 * 5. Idempotency & Transactional Integrity
 * 6. Endpoint Data Remanence & Device Scrubber
 * 7. Instant Tenant Quarantine & Containment
 * 8. W3C Trace Context & GDPR Art. 15 Engine
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
  { name: 'Resilience & Fault Isolation', file: 'apps/groovelab/src/tests/test_resilience_fault_isolation_all_dashboards_forensic.ts' },
  { name: 'Bunker Offline Resync Drill', file: 'apps/groovelab/src/tests/test_bunker_offline_resync_simulation.ts' },
  { name: 'Cold-Cache Hydration Drill', file: 'apps/groovelab/src/tests/test_cold_cache_hydration.ts' },
  { name: 'Pure Business Logic Units', file: 'apps/groovelab/src/tests/test_isolated_unit_business_logic_all_dashboards_forensic.ts' },
  { name: 'Idempotency & Concurrency Drill', file: 'apps/groovelab/src/tests/test_idempotency_transaction_all_dashboards_forensic.ts' },
  { name: 'Endpoint Data Remanence', file: 'apps/groovelab/src/tests/test_endpoint_data_remanence.ts' },
  { name: 'Instant Tenant Quarantine', file: 'apps/groovelab/src/tests/test_tenant_quarantine.ts' },
  { name: 'W3C Trace & GDPR Art. 15', file: 'apps/groovelab/src/tests/test_w3c_trace_context_forensic.ts' }
];

console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║   CAMPUS-GROOVELAB: MASTER-RUNNER 2 — RESILIENCE FORENSICS         ║');
console.log('║   Standards: DIN EN ISO/IEC 25010 & DIN EN ISO 22301 BCMS          ║');
console.log('║   8 Specialized Resilience & Autarky Suites / Zero-Crash Doctrine  ║');
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
console.log('📊 RESILIENCE FORENSICS AGGREGATED SUMMARY');
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
  console.error(`🚨 MASTER-RUNNER 2 FAILED: ${failedCount} suite(s) failed validation.`);
  process.exit(1);
} else {
  console.log('🏆 100% SUCCESS: All 8 Resilience & Autarky Forensic Suites Verified.');
  process.exit(0);
}
