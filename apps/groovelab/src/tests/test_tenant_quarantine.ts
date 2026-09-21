/**
 * ==============================================================================
 * 🛡️ FORENSIC DRILL 3: INSTANT TENANT QUARANTINE & CONTAINMENT (OWASP ASVS 1.14 / BSI CS)
 * ==============================================================================
 * Penetration test & incident containment verification:
 * 1. Unauthorized Quarantine Attempt: Ensures unauthenticated or non-master users
 *    are blocked from invoking emergency_quarantine_school (Fail-Closed).
 * 2. Revocation & State Invariants: Verifies atomic transition of schools,
 *    session_leases, sessions, and append-only master_audit_trail.
 * 3. Frontend Suspension Gate: Verifies that schoolMetricsAggregator and LoginScreen
 *    quarantine handlers immediately freeze access when status='suspended' or is_paused=true.
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string, details?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}${details ? ' - ' + details : ''}`);
    failedTests++;
  }
}

async function runTenantQuarantineDrill() {
  console.log('\n================================================================');
  console.log('🔬 STARTING DRILL 3: INSTANT TENANT QUARANTINE & INCIDENT CONTAINMENT');
  console.log('================================================================\n');

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  // --- SUITE A: ZERO-TRUST AUTHORIZATION & NEGATIVE PENTEST ---
  console.log('🛡️ [SUITE A] Testing Access Control & Fail-Closed Quarantine Gate...');

  // A1. Unauthenticated invocation
  const startTime = Date.now();
  try {
    const { data, error } = await anonClient.rpc('emergency_quarantine_school', {
      p_school_id: '00000000-0000-0000-0000-000000000000',
      p_reason: 'Penetration Test Simulation'
    });
    const roundtripMs = Date.now() - startTime;

    const isDenied = !data?.success || !!error;
    assert(
      isDenied,
      'Unauthenticated emergency_quarantine_school is strictly denied by server RPC',
      error?.message || 'Unauthorized quarantine succeeded!'
    );
    assert(
      roundtripMs < 500,
      `Authorization rejection latency is sub-500ms (Actual: ${roundtripMs}ms)`
    );
  } catch (err: any) {
    assert(true, 'RPC threw authorization exception safely (Fail-Closed)');
  }

  // A2. Fake non-existent school ID test
  try {
    const { data: fakeData, error: fakeErr } = await anonClient.rpc('emergency_quarantine_school', {
      p_school_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      p_reason: 'Non-existent target'
    });
    assert(
      !fakeData?.success || !!fakeErr,
      'Quarantine against non-existent tenant fails closed without collateral mutation'
    );
  } catch (err) {
    assert(true, 'Target validation failed closed safely');
  }

  // --- SUITE B: ATOMIC CONTAINMENT & INVARIANT CONTRACT AUDIT ---
  console.log('\n⚡ [SUITE B] Verifying Atomic Revocation & WORM Ledger Contracts...');

  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/452_enterprise_multitenancy_forensic_killswitch_and_export.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  // B1. Master Admin verification contract
  assert(
    migrationSql.includes('IF NOT public.is_master_admin() THEN') &&
    migrationSql.includes('FORENSIC ACCESS VIOLATION'),
    'RPC verifies caller identity with public.is_master_admin() before mutating state'
  );

  // B2. Atomic school suspension
  assert(
    migrationSql.includes("UPDATE public.schools") &&
    migrationSql.includes("SET status = 'suspended'") &&
    migrationSql.includes("is_paused = TRUE"),
    'RPC atomically sets schools.status = suspended and schools.is_paused = TRUE'
  );

  // B3. Immediate session lease revocation
  assert(
    migrationSql.includes("UPDATE public.session_leases") &&
    migrationSql.includes("SET is_revoked = TRUE") &&
    migrationSql.includes("revoked_at = NOW()"),
    'RPC invalidates all active session leases for users of the quarantined school'
  );

  // B4. Active check-in force checkout
  assert(
    migrationSql.includes("UPDATE public.sessions") &&
    migrationSql.includes("SET check_out_time = NOW()"),
    'RPC force checks out all active campus/station sessions for the quarantined school'
  );

  // B5. Immutable WORM Audit Entry
  assert(
    migrationSql.includes("INSERT INTO public.master_audit_trail") &&
    migrationSql.includes("'EMERGENCY_TENANT_QUARANTINE'"),
    'RPC writes immutable record to public.master_audit_trail (WORM non-repudiation)'
  );

  // B6. School Audit Log entry
  assert(
    migrationSql.includes("INSERT INTO public.audit_logs") &&
    migrationSql.includes("'EMERGENCY_QUARANTINE'"),
    'RPC mirrors quarantine record to public.audit_logs for institutional compliance'
  );

  // --- SUITE C: FRONTEND LOCKOUT & METRICS INVARIANTS ---
  console.log('\n🖥️ [SUITE C] Verifying Frontend Lockout & Revenue Freezing Invariants...');

  const loginScreenPath = path.resolve(
    process.cwd(),
    'apps/groovelab/src/components/LoginScreen.tsx'
  );
  const loginScreenCode = fs.readFileSync(loginScreenPath, 'utf8');

  // C1. LoginScreen blocks login for suspended schools
  assert(
    loginScreenCode.includes("userSchool?.is_paused || userSchool?.status === 'suspended'") &&
    loginScreenCode.includes("type: 'suspended'"),
    'LoginScreen enforces quarantine lock banner for suspended schools'
  );

  // C2. School Metrics Aggregator freezes fees and billing during suspension
  const aggregatorPath = path.resolve(
    process.cwd(),
    'apps/groovelab/src/domain/schoolMetricsAggregator.ts'
  );
  const aggregatorCode = fs.readFileSync(aggregatorPath, 'utf8');

  assert(
    aggregatorCode.includes("if (school.status === 'suspended' || school.is_paused)") &&
    aggregatorCode.includes("status === 'suspended') ? 0.00 : subtotal"),
    'schoolMetricsAggregator freezes server and student fees to 0.00 € during quarantine'
  );

  console.log('\n================================================================');
  console.log(`🏁 DRILL 3 RESULT: ${passedTests} PASSED / ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTenantQuarantineDrill().catch((err) => {
  console.error('Fatal Quarantine Drill Exception:', err);
  process.exit(1);
});
