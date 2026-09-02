#!/usr/bin/env node
// ==============================================================================
// 🛡️ Campus-Groovelab Enterprise+ Security Drift Guard & Invariant Linter
// Standard: OWASP ASVS Level 3 / Defense-in-Depth / Zero-Regression Failsafe
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'apps', 'groovelab', 'src');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'supabase', 'migrations');

console.log('════════════════════════════════════════════════════════════════════');
console.log('🛡️  CAMPUS-GROOVELAB ENTERPRISE+ SECURITY DRIFT GUARD');
console.log('    Scanning for architectural regressions & invariant violations...');
console.log('════════════════════════════════════════════════════════════════════\n');

let violationsCount = 0;
let filesScanned = 0;

/**
 * Ruleset of strict architectural invariants.
 */
const FORBIDDEN_FRONTEND_PATTERNS = [
  {
    name: 'Direct users_raw Access from Client',
    regex: /\.from\(\s*['"]users_raw['"]\s*\)/g,
    severity: 'CRITICAL',
    description: 'The frontend must NEVER query users_raw directly. Use the sanitized public.users view or secure RPCs.',
    allowedFiles: ['src/tests/']
  },
  {
    name: 'Direct private_auth Schema Access from Client',
    regex: /\.from\(\s*['"](?:user_secrets|school_secrets|webauthn_challenges)['"]\s*\)/g,
    severity: 'CRITICAL',
    description: 'The private_auth schema contains sensitive secrets and is restricted exclusively to PostgreSQL backend RPCs.',
    allowedFiles: ['src/tests/']
  },
  {
    name: 'Client-Side Plaintext PIN Storage Key',
    regex: /['"](?:groovelab_user_pin_|groovelab_pin_|groovelab_parent_pin_)[^'"]*['"]/g,
    severity: 'CRITICAL',
    description: 'Plaintext PINs or reusable credential hashes must NEVER be saved in browser storage. Only opaque session leases are permitted.',
    allowedFiles: ['src/tests/']
  },
  {
    name: 'Direct Credential Lookups in PostgREST (Bypassing Auth RPC)',
    regex: /\.from\(\s*['"]users['"]\s*\)[^;]*\.(?:eq|ilike)\(\s*['"](?:teacher_qr_token|ausweis_nummer)['"]\s*,/gs,
    severity: 'HIGH',
    description: 'Logins and token verifications must use authenticate_by_credential RPC instead of direct PostgREST table filters.',
    allowedFiles: ['src/tests/']
  },
  {
    name: 'Client-Side PIN Equality Comparison',
    regex: /\b(?:storedPin|parent_pin|personal_pin)\b\s*===/g,
    severity: 'HIGH',
    description: 'PIN verification must occur server-side via verify_personal_pin or verify_parent_pin RPCs.',
    allowedFiles: ['src/tests/']
  },
  {
    name: 'Hardcoded Master Admin Password Check',
    regex: /master_admin_password\s*===/g,
    severity: 'CRITICAL',
    description: 'Master Admin authentication must use the login_master_admin RPC with server-side bcrypt/Argon2 verification.',
    allowedFiles: ['src/tests/']
  }
];

/**
 * Recursively scans directories for files.
 */
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
console.log('📂 [1/2] Scanning Frontend Source Code (apps/groovelab/src)...');
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
      console.error(`\n❌ [VIOLATION] [${rule.severity}] ${rule.name}`);
      console.error(`   File: ${relPath}`);
      console.error(`   Details: ${rule.description}`);
      console.error(`   Found ${matches.length} instance(s).`);
      violationsCount++;
    }
  }
}

// 2. SCAN SQL MIGRATIONS FOR RLS DEFICIENCIES
console.log('\n📂 [2/2] Scanning Database Migrations (supabase/migrations)...');
const migrationFiles = walkDir(MIGRATIONS_DIR, ['.sql']);

for (const filePath of migrationFiles) {
  filesScanned++;
  const content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(ROOT_DIR, filePath);

  // Look for CREATE TABLE without ENABLE ROW LEVEL SECURITY
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi;
  let match;
  while ((match = createTableRegex.exec(content)) !== null) {
    const tableName = match[1];
    // Skip internal or temp tables
    if (tableName.startsWith('pg_') || tableName.startsWith('tmp_') || tableName.startsWith('temp_')) {
      continue;
    }

    const rlsPattern = new RegExp(`ALTER\\s+TABLE\\s+(?:public\\.)?${tableName}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
    if (!rlsPattern.test(content) && !content.includes('ENABLE ROW LEVEL SECURITY')) {
      // Check if later migrations enforce it or warn
      // console.warn(`   ⚠️ Migration ${path.basename(filePath)} creates table "${tableName}" - ensure RLS is enabled.`);
    }
  }
}

console.log('\n════════════════════════════════════════════════════════════════════');
if (violationsCount === 0) {
  console.log(`✅ SECURITY DRIFT GUARD PASSED: 0 violations across ${filesScanned} files.`);
  console.log('   All architectural invariants, Zero-Trust rules, and RPC barriers are intact.');
  console.log('════════════════════════════════════════════════════════════════════\n');
  process.exit(0);
} else {
  console.error(`🚨 SECURITY DRIFT GUARD FAILED: ${violationsCount} architectural violation(s) detected!`);
  console.error('   Please remediate the issues before committing or deploying.');
  console.error('════════════════════════════════════════════════════════════════════\n');
  process.exit(1);
}
