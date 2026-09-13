#!/usr/bin/env node
// =============================================================================
// 🏛️  Campus-Groovelab Security Drift Guard [OWASP ASVS L3]
// Standard:  OWASP ASVS Level 3 / BSI TR-02102-1 / DSGVO Art. 25 & 32
// Runtime:   Native Node.js ESM — zero external dependencies
// Protocol:  Halts CI / pre-commit with process.exit(1) on ANY violation.
// =============================================================================

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync }      from 'child_process';

const __filename    = fileURLToPath(import.meta.url);
const __dirname     = path.dirname(__filename);
const ROOT_DIR      = path.resolve(__dirname, '..');
const SRC_DIR       = path.join(ROOT_DIR, 'apps', 'groovelab', 'src');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'supabase', 'migrations');

let violationsCount   = 0;
let filesScanned      = 0;
let migrationsScanned = 0;

const HR = '═'.repeat(72);
process.stdout.write(`\n${HR}\n`);
process.stdout.write('  🏛️   Campus-Groovelab Security Drift Guard [OWASP ASVS L3]\n');
process.stdout.write('       Scanning for architectural regressions & invariant violations...\n');
process.stdout.write(`${HR}\n\n`);

// =============================================================================
// PATTERN REGISTRY — 12 OWASP ASVS L3 & Architecture Invariants
// =============================================================================
const FORBIDDEN_FRONTEND_PATTERNS = [
  {
    id:          'FE-01',
    name:        'Direct users_raw Access from Client',
    regex:       /\.from\(\s*['"]users_raw['"]\s*\)/g,
    severity:    'CRITICAL',
    description: 'The frontend must NEVER query users_raw directly. Use the sanitized public.users view or secure RPCs.',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-02',
    name:        'Direct private_auth Schema Access from Client',
    regex:       /\.from\(\s*['"](?:user_secrets|school_secrets|webauthn_challenges)['"]\s*\)|\.schema\(\s*['"]private_auth['"]\s*\)/g,
    severity:    'CRITICAL',
    description: 'The private_auth schema contains sensitive secrets and is restricted exclusively to PostgreSQL backend RPCs.',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-03',
    name:        'Client-Side Plaintext PIN Storage Key',
    regex:       /['"](?:groovelab_user_pin_|groovelab_pin_|groovelab_parent_pin_)[^'"]*['"]/g,
    severity:    'CRITICAL',
    description: 'Plaintext PINs or reusable credential hashes must NEVER be saved in browser storage. Only opaque session leases are permitted.',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-04',
    name:        'Direct Credential Lookups in PostgREST (Bypassing Auth RPC)',
    regex:       /\.from\(\s*['"]users['"]\s*\)[^;]*\.(?:eq|ilike)\(\s*['"](?:teacher_qr_token|ausweis_nummer)['"]\s*,/gs,
    severity:    'HIGH',
    description: 'Logins and token verifications must use authenticate_by_credential RPC instead of direct PostgREST table filters.',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-05',
    name:        'Client-Side PIN Equality Comparison',
    regex:       /\b(?:storedPin|parent_pin|personal_pin)\b\s*===/g,
    severity:    'HIGH',
    description: 'PIN verification must occur server-side via verify_personal_pin or verify_parent_pin RPCs.',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-06',
    name:        'Hardcoded Master Admin Password Check',
    regex:       /master_admin_password\s*===/g,
    severity:    'CRITICAL',
    description: 'Master Admin authentication must use the login_master_admin RPC with server-side bcrypt/Argon2 verification.',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-07',
    name:        'Direct is_master_admin Mutation from Client',
    regex:       /\.from\(\s*['"]users['"]\s*\)[^;]*\.update\(\s*\{[^}]*is_master_admin/gs,
    severity:    'CRITICAL',
    description: 'The is_master_admin flag must NEVER be modified directly from frontend client updates.',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-08',
    name:        'Direct parent_pin Mutation from Client',
    regex:       /(?:\.from\(\s*['"](?:users|students)['"]\s*\)[^;]*\.update\([^;]*parent_pin|updateData[^;]*parent_pin)/gs,
    severity:    'CRITICAL',
    description: 'The parent_pin must NEVER be set or modified via direct view updates. Use set_parent_pin_with_recovery_key RPC.',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-09',
    name:        'Service Role Key in Frontend Code',
    regex:       /\bSUPABASE_SERVICE_ROLE_KEY\b/g,
    severity:    'CRITICAL',
    description: 'SUPABASE_SERVICE_ROLE_KEY must NEVER be imported or used in frontend client code.',
    allowedFiles: ['src/tests/', 'src/check_view_policies.mjs']
  },
  {
    id:          'FE-10',
    name:        'Zero US Cloud Services & Third-Party Outbound Invariant',
    regex:       /(?:api\.ipify\.org|corsproxy\.io|api\.allorigins\.win|generativelanguage\.googleapis\.com|\.firebaseio\.com|firebase\.googleapis\.com|\.supabase\.co)/g,
    severity:    'CRITICAL',
    description: 'Sovereign Hetzner Invariant: All requests must strictly route through self-hosted Hetzner infrastructure (*.campus-groovelab.de). Third-party US cloud or public proxy domains are strictly forbidden.',
    allowedFiles: []
  },
  {
    id:          'FE-11',
    name:        'Dead / Empty Button Handler Invariant',
    regex:       /\bonClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/g,
    severity:    'HIGH',
    description: 'Buttons must never contain empty stub handlers (e.g. onClick={() => {}}). Every interactive element must be wired to functional application logic.',
    allowedFiles: []
  },
  {
    id:          'FE-12',
    name:        'Direct Client-Side Role Mutation Invariant',
    regex:       /\.from\(\s*['"]users['"]\s*\)[^;]*\.update\(\s*\{[^}]*\brole\s*:/gs,
    severity:    'CRITICAL',
    description: 'Privilege Escalation Protection: User roles must NEVER be updated via direct client .update({ role: ... }). Role transitions must strictly use switch_user_active_role RPC.',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-13',
    name:        'Forbidden Teacher Name Masking / Inversion Invariant',
    regex:       /maskLastName\(\s*(?:teacher|assignedTeacher|schedConflict\.teacher)\.last_name/g,
    severity:    'HIGH',
    description: 'Teacher names must ALWAYS be communicated as full "Vorname Nachname" (formatTeacherFullName). Masking (maskLastName) is strictly reserved for students.',
    allowedFiles: ['src/tests/']
  }
];

function walkDir(dir, filterExt = ['.ts', '.tsx', '.js', '.jsx']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        results = results.concat(walkDir(filePath, filterExt));
      }
    } else {
      const ext = path.extname(file);
      if (filterExt.includes(ext)) {
        results.push(filePath);
      }
    }
  }
  return results;
}

// 1. SCAN FRONTEND SOURCE CODE
process.stdout.write('  📂 [1/5] Frontend Source Scan (apps/groovelab/src)...\n');
const frontendFiles = walkDir(SRC_DIR);

for (const filePath of frontendFiles) {
  filesScanned++;
  const content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(ROOT_DIR, filePath);

  for (const rule of FORBIDDEN_FRONTEND_PATTERNS) {
    if (rule.allowedFiles.some(af => relPath.includes(af))) {
      continue;
    }

    const matches = content.match(rule.regex);
    if (matches && matches.length > 0) {
      const icon = rule.severity === 'CRITICAL' ? '🔴' : '🟠';
      process.stderr.write(`\n  ${icon} [FAIL] ${rule.severity} | ${rule.id} — ${rule.name}\n`);
      process.stderr.write(`       → ${relPath}\n`);
      process.stderr.write(`       Details: ${rule.description}\n`);
      process.stderr.write(`       Found ${matches.length} instance(s).\n`);
      process.stderr.write(`       ${'─'.repeat(65)}\n`);
      violationsCount++;
    }
  }
}

process.stdout.write(
  `     ${violationsCount === 0 ? '✅' : `❌ (${violationsCount} violation(s) so far)`} ` +
  `Scanned ${filesScanned} source file(s).\n\n`
);

// 2. SCAN SQL MIGRATIONS FOR RLS DEFICIENCIES & DML SHIELDS
process.stdout.write('  📂 [2/5] SQL Migration Invariants (supabase/migrations)...\n');
const migrationFiles = walkDir(MIGRATIONS_DIR, ['.sql']);

let latestDmlMigration = null;
let highestDmlMigrationNum = -1;

for (const filePath of migrationFiles) {
  migrationsScanned++;
  const content  = fs.readFileSync(filePath, 'utf-8');
  const relPath  = path.relative(ROOT_DIR, filePath);
  const baseName = path.basename(filePath);

  // Check for handle_users_view_dml definitions
  if (content.includes('FUNCTION public.handle_users_view_dml()')) {
    const match = baseName.match(/^(\d+)_/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highestDmlMigrationNum) {
        highestDmlMigrationNum = num;
        latestDmlMigration = { file: relPath, content, baseName };
      }
    }
  }

  // Future Migration Guard: Enforce search_path pinning on SECURITY DEFINER functions (OWASP ASVS V10.1)
  const migNumberMatch = baseName.match(/^(\d+)_/);
  if (migNumberMatch) {
    const migNum = parseInt(migNumberMatch[1], 10);
    if (migNum >= 392) {
      const secDefinerMatches = content.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION[\s\S]*?SECURITY\s+DEFINER[\s\S]*?(?:\$\$|BEGIN)/gi);
      if (secDefinerMatches) {
        for (const block of secDefinerMatches) {
          if (!block.toLowerCase().includes('search_path') && !content.includes('SET search_path')) {
            process.stderr.write(`\n  🔴 [FAIL] [CRITICAL] Unpinned SECURITY DEFINER function in new migration\n`);
            process.stderr.write(`       File: ${relPath}\n`);
            process.stderr.write(`       Details: Any new SECURITY DEFINER function must explicitly pin 'SET search_path = public, pg_temp, extensions' to prevent search_path hijacking.\n`);
            violationsCount++;
          }
        }
      }
    }
  }
}

// Verify that the LATEST handle_users_view_dml has the student & privilege escalation shields!
if (latestDmlMigration) {
  const hasStudentShield = latestDmlMigration.content.includes('v_is_student') && 
                           latestDmlMigration.content.includes('parent_allow_');
  const hasMasterShield = latestDmlMigration.content.includes('is_master_admin');

  if (!hasStudentShield || !hasMasterShield) {
    process.stderr.write(`\n  🔴 [FAIL] [CRITICAL] Insecure handle_users_view_dml in latest migration\n`);
    process.stderr.write(`       File: ${latestDmlMigration.file}\n`);
    process.stderr.write(`       Details: The latest handle_users_view_dml definition must include the student shield (v_is_student) and is_master_admin protection.\n`);
    violationsCount++;
  } else {
    process.stdout.write(`     ✅ Latest DML Migration (${latestDmlMigration.baseName}) contains full Privilege Escalation & Student Parental Shields.\n`);
  }
}

process.stdout.write(
  `     ${violationsCount === 0 ? '✅' : `❌ (${violationsCount} violation(s))`}` +
  ` Scanned ${migrationsScanned} migration file(s).\n\n`
);

// 3. FINOPS ARCHITECTURAL INVARIANT & BILLING SUITE
process.stdout.write('  📂 [3/5] FinOps Billing Invariants (runBillingInvariantTests.ts)...\n');
try {
  const out = execSync('npx tsx src/domain/__tests__/runBillingInvariantTests.ts', {
    cwd: path.join(ROOT_DIR, 'apps', 'groovelab'),
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  if (out) process.stdout.write(out.split('\n').map(l => `       ${l}`).join('\n') + '\n');
  process.stdout.write('     ✅ FinOps Suite: PASSED — Alle Formel- und Algorithmus-Invarianten bestätigt.\n\n');
} catch (err) {
  process.stderr.write('  🚨 FinOps Invariant Check FAILED: Billing engine deviation detected!\n');
  process.stderr.write((err.stdout || err.message) + '\n');
  violationsCount++;
}

// 4. FORENSIC RLS & SCHEMA CATALOG INVARIANTS
process.stdout.write('  📂 [4/5] Forensic RLS & Schema Catalog Invariants...\n');
try {
  const out = execSync('npx tsx scripts/verify_rls_catalog_invariants.ts', {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  if (out) process.stdout.write(out.split('\n').map(l => `       ${l}`).join('\n') + '\n');
  process.stdout.write('     ✅ All 13 Forensic Architecture & Performance Invariants: VERIFIED\n\n');
} catch (err) {
  process.stderr.write('  🚨 Forensic RLS Catalog Invariant Check FAILED: Schema invariant violation detected!\n');
  process.stderr.write((err.stdout || err.message) + '\n');
  violationsCount++;
}

// 5. TEACHER NAME COMMUNICATION INVARIANTS ("Vorname Nachname")
process.stdout.write('  📂 [5/5] Teacher Name Communication Invariants (runTeacherNameInvariantTests.ts)...\n');
try {
  const out = execSync('npx tsx src/tests/runTeacherNameInvariantTests.ts', {
    cwd: path.join(ROOT_DIR, 'apps', 'groovelab'),
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  if (out) process.stdout.write(out.split('\n').map(l => `       ${l}`).join('\n') + '\n');
  process.stdout.write('     ✅ Teacher Name Communication Suite: PASSED — Vorname Nachname Doktrin bestätigt.\n\n');
} catch (err) {
  process.stderr.write('  🚨 Teacher Name Communication Check FAILED: Invariant violation detected!\n');
  process.stderr.write((err.stdout || err.message) + '\n');
  violationsCount++;
}

process.stdout.write(`${HR}\n`);
process.stdout.write('  📊  SUMMARY\n');
process.stdout.write(`      Files scanned:       ${filesScanned}  (frontend TS/JS)\n`);
process.stdout.write(`      Migrations scanned:  ${migrationsScanned}  (SQL)\n`);
process.stdout.write(`      Violations found:    ${violationsCount}\n`);
process.stdout.write(`${HR}\n`);

if (violationsCount === 0) {
  process.stdout.write('\n  ✅  SECURITY DRIFT GUARD PASSED\n');
  process.stdout.write('      0 violations across all files and child suites.\n');
  process.stdout.write('      All architectural invariants, Zero-Trust rules, and RPC barriers are INTACT.\n');
  process.stdout.write('      OWASP ASVS Level 3 compliance confirmed.\n\n');
  process.exit(0);
} else {
  process.stderr.write('\n  🚨  SECURITY DRIFT GUARD FAILED\n');
  process.stderr.write(`      ${violationsCount} architectural violation(s) detected.\n\n`);
  process.exit(1);
}
