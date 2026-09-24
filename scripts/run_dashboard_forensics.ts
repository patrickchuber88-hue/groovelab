/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: MASTER-RUNNER 1 — DASHBOARD & ROLE FORENSICS
 * ==============================================================================
 * Standards: DIN EN ISO 9241-110:2020 (Software-Ergonomie & Dialoggestaltung),
 *            DIN EN ISO 9241-210 (Menschzentrierte Gestaltung),
 *            DIN EN 301 549 V3.2.1 / WCAG 2.2 AA (Digitale Barrierefreiheit),
 *            ISO 8601 (Stundenplan- & Kalenderformate),
 *            OWASP ASVS Level 3 & BSI IT-Grundschutz APP.3.1
 * 
 * Aggregates all 10 role- and dashboard-forensic test suites:
 * 1. Student Dashboard Forensic
 * 2. Teacher Dashboard Forensic
 * 3. Secretary Dashboard Forensic
 * 4. Master Admin Dashboard Forensic
 * 5. Parent Portal & Child Protection Forensic
 * 6. Crisis Dashboard Architecture & Integration
 * 7. QR Landingpages & Routing Forensic
 * 8. Multi-Tenant RLS All Dashboards Forensic
 * 9. Contract & Schema Alignment Forensic
 * 10. Smoke & Bootstrapping Health Check Forensic
 * 11. UI Snapshot & Visual Regression Forensic
 * 12. Audio Count-In & Playback Forensic
 * ==============================================================================
 */

import { spawnSync } from 'child_process';
import path from 'path';

interface SuiteResult {
  name: string;
  file: string;
  passed: boolean;
  durationMs: number;
}

const suites = [
  { name: 'Student Dashboard Forensic', file: 'apps/groovelab/src/tests/test_student_dashboard_forensic.ts' },
  { name: 'Teacher Dashboard Forensic', file: 'apps/groovelab/src/tests/test_teacher_dashboard_forensic.ts' },
  { name: 'Secretary Dashboard Forensic', file: 'apps/groovelab/src/tests/test_secretary_dashboard_forensic.ts' },
  { name: 'Master Admin Dashboard Forensic', file: 'apps/groovelab/src/tests/test_master_admin_dashboard_forensic.ts' },
  { name: 'Parent Portal Forensic', file: 'apps/groovelab/src/tests/test_parent_portal_forensic.ts' },
  { name: 'Crisis Dashboard Forensic', file: 'apps/groovelab/src/tests/test_crisis_dashboard.ts' },
  { name: 'QR Landingpages Forensic', file: 'apps/groovelab/src/tests/test_qr_landingpages_forensic.ts' },
  { name: 'Multi-Tenant RLS Dashboards', file: 'apps/groovelab/src/tests/test_multitenant_rls_all_dashboards_forensic.ts' },
  { name: 'Contract Schema Dashboards', file: 'apps/groovelab/src/tests/test_contract_schema_all_dashboards_forensic.ts' },
  { name: 'Smoke & Bootstrapping Health', file: 'apps/groovelab/src/tests/test_smoke_health_bootstrapping_all_dashboards_forensic.ts' },
  { name: 'UI Snapshot & Visual Regression', file: 'apps/groovelab/src/tests/test_ui_snapshot_visual_regression_all_dashboards_forensic.ts' },
  { name: 'Audio Count-In Playback Forensic', file: 'apps/groovelab/src/tests/test_audio_countin_playback_forensic.ts' },
  { name: 'Audio Engine Lifecycle Forensic', file: 'apps/groovelab/src/tests/test_audio_engine_lifecycle_forensic.ts' },
  { name: 'Interactive 4-Role Journeys Forensic', file: 'apps/groovelab/src/tests/test_interactive_journeys_forensic.ts' },
  { name: 'Closed-Loop Schedule Lifecycle Forensic', file: 'apps/groovelab/src/tests/test_closed_loop_schedule_lifecycle_forensic.ts' }
];

console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║   CAMPUS-GROOVELAB: MASTER-RUNNER 1 — DASHBOARD FORENSICS          ║');
console.log('║   Standards: DIN EN ISO 9241-110, DIN EN 301 549, ISO 8601        ║');
console.log('║   15 Specialized Forensic Suites / Tier-1 Enterprise+ Defense     ║');
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
console.log('📊 DASHBOARD FORENSICS AGGREGATED SUMMARY');
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
  console.error(`🚨 MASTER-RUNNER 1 FAILED: ${failedCount} suite(s) failed validation.`);
  process.exit(1);
} else {
  console.log('🏆 100% SUCCESS: All 10 Dashboard Forensic Suites Verified.');
  process.exit(0);
}
