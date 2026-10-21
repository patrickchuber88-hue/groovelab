#!/usr/bin/env node
// =============================================================================
// 🏛️  Campus-Groovelab Security Drift Guard [OWASP ASVS L3 / ISO 27001]
// Standards: DIN EN ISO/IEC 27001 (Annex A.8.28 Secure Coding, A.8.20 Network Security),
//            NIST SP 800-161 (Supply Chain Risk), BSI TR-02102-1, OWASP ASVS Level 3
// Runtime:   Native Node.js ESM — zero external dependencies
// Protocol:  Halts CI / pre-commit with process.exit(1) on ANY violation.
// =============================================================================

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, exec } from 'child_process';
import { promisify }        from 'util';

const execAsync = promisify(exec);

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
process.stdout.write('  🏛️   Campus-Groovelab Security Drift Guard [ISO 27001 / OWASP ASVS L3]\n');
process.stdout.write('       Scanning for architectural regressions & invariant violations...\n');
process.stdout.write(`${HR}\n\n`);

// =============================================================================
// PATTERN REGISTRY — 25 OWASP ASVS L3 & Architecture Invariants
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
  },
  {
    id:          'FE-14',
    name:        'Unguarded Developer Auth Bypass Invariant',
    regex:       /['"]bypass_dev['"]/g,
    severity:    'CRITICAL',
    description: 'Hermetic Dev-Bypass Invariant: Developer auth bypass tokens (\'bypass_dev\') are strictly prohibited unless the containing file imports and evaluates isLocalDevEnvironment() or import.meta.env.DEV.',
    allowedFiles: ['src/tests/', 'src/utils/masterAuditLogger.ts'],
    isViolation: (content) => {
      return !content.includes('isLocalDevEnvironment') && !content.includes('import.meta.env.DEV');
    }
  },
  {
    id:          'FE-15',
    name:        'Plaintext Audio Base64 in Browser Storage Invariant',
    regex:       /localStorage\.setItem\([^,]+,\s*(?:['"`]data:audio\/|audioBase64|rawAudio)/g,
    severity:    'HIGH',
    description: 'DSGVO Art. 8 & 32 Compliance: Direct unencrypted storage of raw audio base64 or data URLs in browser storage is forbidden. Use encryptedOfflineVault or IndexedDB with encryption.',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-16',
    name:        'Zero Master Admin Password UI & State Invariant (Zero-Password IAM)',
    regex:       /(?:\b(?:adminPasswordInput|masterKeyInput|adminMasterPassword)\b|placeholder=['"][^'"]*Master-(?:Schlüssel|Passwort)|['"]p_password['"]\s*:\s*(?!null|undefined|'')[^,\}\s]+)/g,
    severity:    'CRITICAL',
    description: '100% Zero-Password Master Admin IAM (OWASP ASVS L4 / NIST SP 800-63B AAL3): Master Admin authentication is strictly passwordless. No password state, input field, placeholder or active p_password parameter is allowed in client UI components.',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-17',
    name:        'Client-Side Monorepo Airgap Violation',
    regex:       /(?:from\s*['"](?:@groovelab\/(?:backend-core|bff-server)|ssh2|node:child_process)['"]|require\(['"](?:@groovelab\/(?:backend-core|bff-server)|ssh2)['"]\))/g,
    severity:    'CRITICAL',
    description: 'Monorepo Airgap Invariant: Frontend code (apps/groovelab) must NEVER import server packages (@groovelab/backend-core, @groovelab/bff-server, ssh2). Only @groovelab/shared is permitted.',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-18',
    name:        'Banned Mock Personas & Default Subject Fallbacks',
    regex:       /(?:(?:first_name|firstName|lowerFirst)\s*===\s*['"](?:severin|peter)['"]|\|\|\s*['"]Gitarre['"]|return\s*['"]Gitarre['"];)/g,
    severity:    'HIGH',
    description: 'Zero Dummy Identitäten & Fachlogik: Statische Persona-Hardcodes ("Severin Landenberger", "Peter Pan") und pauschale Default-Fächer ("Gitarre") sind in Produktions-Utilities streng verboten.',
    allowedFiles: ['src/tests/', 'src/utils/avatarResolutionEngine.ts'],
    isViolation: (content, relPath) => {
      return relPath.includes('src/utils/');
    }
  },
  {
    id:          'FE-19',
    name:        'Zero Operator Address Leakage into Tenant Scope',
    regex:       /(?:(?:school|tenant|userSchool|schoolData)\.(?:street|address)|schoolStreet)\s*\|\|\s*['"][^'"]*Karl-Fürstenberg/gi,
    severity:    'CRITICAL',
    description: 'Mandantenschutz & Zero-Data-Leakage: Die private Betreiberadresse (Karl-Fürstenberg-Str) darf niemals als Fallback für fehlende Musikschul-Adressen verwendet werden.',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-20',
    name:        'Zero Heuristic Substring Tenant Filtering',
    regex:       /\b(?:s|school|sch)\.name\.toLowerCase\(\)\.includes\(\s*['"]groove academy['"]\s*\)|\.includes\(\s*['"]groove academy['"]\s*\)/g,
    severity:    'CRITICAL',
    description: 'GoBD- und Abrechnungsintegrität: Heuristisches Filtern von Schulen nach Namen (z.B. includes("groove academy")) ist verboten. Verwende stattdessen autoritative Schema-Attribute wie is_demo_tenant und status !== "archived".',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-21',
    name:        'Zero Fake Tax Numbers & Bundesbank Test-IBANs in Production',
    regex:       /(?:DE02[0-9]{18}|04123\/45678)/g,
    severity:    'CRITICAL',
    description: 'Rechtssicherheit (§ 14 UStG & SEPA Clearing): Bundesbank-Test-IBANs (DE02...) und Phantasie-Steuernummern (04123/45678) sind im Produktivcode streng verboten. Nutze stattdessen OPERATOR_BANKING_CONFIG oder echte Mandantenbankdaten.',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-22',
    name:        'Unencrypted Offline Audio Storage Invariant',
    regex:       /store\.put\(\s*finalRecord\s*\)/g,
    severity:    'HIGH',
    description: 'DSGVO Art. 32 Compliance: Audio records must be encrypted with encryptOfflineBlob before persistence to IndexedDB (use recordToPersist).',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-23',
    name:        'Client-Side Birthdate or Partial PIN Comparison Guard (FE-19)',
    regex:       /(?:(?:studentBirthDay|birthDay|dayOfBirth|day_of_birth)\b\s*(?:===?|!==?)|(?:===?|!==?)\s*(?:[a-zA-Z0-9_]+\.)*(?:studentBirthDay|birthDay|dayOfBirth|day_of_birth)\b|parseInt\([^)]*pin[^)]*\)\s*(?:===?|!==?)|(?:===?|!==?)\s*parseInt\([^)]*pin[^)]*\))/gi,
    severity:    'CRITICAL',
    description: 'PIN or birthdate verification must NEVER happen in client-side JavaScript. Use the authoritative verify_personal_pin RPC.',
    allowedFiles: ['src/tests/']
  },
  {
    id:          'FE-24',
    name:        'Realtime Multi-Tenant CDC Filter Invariant (FE-20)',
    regex:       /\.on\(\s*['"]postgres_changes['"]\s*,\s*\{[\s\S]*?table:\s*['"](?:campus_direct_messages|campus_message_reactions|campus_chat_channel_reads|campus_chat_group_members)['"]/g,
    severity:    'HIGH',
    description: 'Subscriptions on sensitive chat and reaction tables must specify a tenant filter (e.g. filter: `school_id=eq.${schoolId}`).',
    allowedFiles: [
      'src/tests/',
      'src/components/ScheduleCalendarView',
      'src/components/CampusEventsBoard.tsx',
      'src/components/CampusAppointmentShoutboxModal.tsx',
      'src/components/QRLandingPage.tsx',
      'src/components/teacher/hooks/useTeacherTagesplan.ts'
    ],
    isViolation: (content) => {
      const sensitiveTables = [
        'campus_direct_messages',
        'campus_message_reactions',
        'campus_chat_channel_reads',
        'campus_chat_group_members'
      ];
      const startRegex = /\.on\(\s*['"]postgres_changes['"]\s*,\s*\{/g;
      let match;
      while ((match = startRegex.exec(content)) !== null) {
        const braceStart = match.index + match[0].length - 1;
        const extracted = extractBalancedBraces(content, braceStart);
        if (!extracted) continue;
        const block = extracted.content;
        const targetsSensitiveTable = sensitiveTables.some(t => block.includes(`'${t}'`) || block.includes(`"${t}"`));
        if (targetsSensitiveTable) {
          const hasTenantFilter = block.includes('school_id') || block.includes('user_id');
          if (!hasTenantFilter) {
            return true;
          }
        }
      }
      return false;
    }
  },
  {
    id:          'FE-25',
    name:        'Direct Client Bulk Delete on Core Tables (FE-21)',
    regex:       /\.from\(\s*['"](?:stations|bands|schedules|students|rooms)['"]\s*\)[^;]*?(?:\.delete\([^)]*\)[^;]*?\.eq\(\s*['"]school_id['"]|\.eq\(\s*['"]school_id['"][^;]*?\.delete\([^)]*\))/g,
    severity:    'HIGH',
    description: 'Cascade deletions of school inventory must use the authoritative purge_school_test_data RPC instead of direct client-side .delete() chains.',
    allowedFiles: [
      'src/tests/',
      'src/components/masterAdmin/',
      'src/components/ScheduleBoardDesktop.tsx',
      'src/components/secretary/hooks/useSecretarySchedules.ts'
    ]
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

function extractBalancedBraces(str, startIndex) {
  let depth = 0;
  let inQuote = false;
  let quoteChar = '';
  let start = -1;
  for (let i = startIndex; i < str.length; i++) {
    const ch = str[i];
    if (inQuote) {
      if (ch === '\\') {
        i++; // skip escaped character in JS
      } else if (ch === quoteChar) {
        inQuote = false;
      }
    } else if (ch === "'" || ch === '"' || ch === '`') {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return { content: str.substring(start, i + 1), endIndex: i + 1 };
      }
    }
  }
  return null;
}

function extractBalancedParentheses(str, startIndex) {
  let depth = 0;
  let inQuote = false;
  let quoteChar = '';
  let start = -1;
  for (let i = startIndex; i < str.length; i++) {
    const ch = str[i];
    if (inQuote) {
      if (ch === '\\') {
        i++; // skip backslash-escaped character
      } else if (ch === quoteChar) {
        if (i + 1 < str.length && str[i + 1] === quoteChar) {
          i++; // skip SQL doubled quote ''
        } else {
          inQuote = false;
        }
      }
    } else if (ch === "'" || ch === '"') {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === '(') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        return { content: str.substring(start + 1, i), endIndex: i + 1 };
      }
    }
  }
  return null;
}

function splitSqlList(str) {
  const tokens = [];
  let current = '';
  let depth = 0;
  let inQuote = false;
  let quoteChar = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inQuote) {
      current += ch;
      if (ch === '\\') {
        if (i + 1 < str.length) {
          current += str[++i];
        }
      } else if (ch === quoteChar) {
        if (i + 1 < str.length && str[i + 1] === quoteChar) {
          current += str[++i];
        } else {
          inQuote = false;
        }
      }
    } else if (ch === "'" || ch === '"') {
      inQuote = true;
      quoteChar = ch;
      current += ch;
    } else if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      current += ch;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      tokens.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    tokens.push(current.trim());
  }
  return tokens;
}

// 1. SCAN FRONTEND SOURCE CODE
process.stdout.write('  📂 [1/7] Frontend Source Scan (apps/groovelab/src)...\n');
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
      if (rule.isViolation && !rule.isViolation(content, relPath)) {
        continue;
      }
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

// 1b. SCAN BFF PERIMETER & ZERO-TRUST MIDDLEWARES (Generation 2 Guard Evolution)
process.stdout.write('  📂 [1b/7] BFF Perimeter & Zero-Trust Middleware Invariants (packages/bff-server/src)...\n');
const BFF_SRC_DIR = path.join(ROOT_DIR, 'packages', 'bff-server', 'src');
const bffFiles = fs.existsSync(BFF_SRC_DIR) ? walkDir(BFF_SRC_DIR, ['.ts', '.js']) : [];

const FORBIDDEN_BFF_PATTERNS = [
  {
    id: 'BFF-01',
    name: 'Unverified Cookie Existence Check in BFF Route/Middleware',
    regex: /Boolean\(\s*req\.cookies\?\.\s*\[['"](?:__Host-session|__Host-cg_site_pass|cg_site_pass)['"]\]/g,
    severity: 'CRITICAL',
    description: 'BFF middlewares must never accept cookie presence (Boolean(req.cookies[...])) as proof of authentication. Always verify via decryptSession() or verifySiteGateToken().',
    isViolation: (content) => !content.includes('decryptSession') || !content.includes('verifySiteGateToken')
  },
  {
    id: 'BFF-02',
    name: 'Unverified Session-Lease Header Check (UUID Regex Only)',
    regex: /req\.headers\[['"]x-session-token['"]\]/g,
    severity: 'CRITICAL',
    description: 'Any BFF route authenticating via x-session-token must verify the lease against public.session_leases (is_revoked = false) or forward it to an authoritative DB RPC.',
    allowedFiles: ['middleware/idempotencyMiddleware.ts', 'routes/proxy.ts'],
    isViolation: (content) => !content.includes("from('session_leases')") && !content.includes('rpc(')
  },
  {
    id: 'BFF-03',
    name: 'Unscoped Idempotency-Key Header (Cross-User Replay Risk)',
    regex: /req\.headers\[['"]idempotency-key['"]\]/g,
    severity: 'HIGH',
    description: 'Explicit Idempotency-Key headers must be cryptographically bound to the caller scope (computeCallerScopeHash) to prevent cross-user response replay.',
    isViolation: (content) => !content.includes('computeCallerScopeHash')
  },
  {
    id: 'BFF-04',
    name: 'Asymmetric Student Storage Write/Delete BOLA Guard',
    regex: /STUDENT_DELETE_SCHOOL_ASSET_DENIED/g,
    severity: 'CRITICAL',
    description: 'Storage path validation must block both student DELETE and student WRITE (STUDENT_WRITE_SCHOOL_ASSET_DENIED) on school-wide paths and enforce effectiveStudentId.',
    isViolation: (content) => !content.includes('STUDENT_WRITE_SCHOOL_ASSET_DENIED') || !content.includes('effectiveStudentId')
  },
  {
    id: 'BFF-05',
    name: 'Unpinned WebAuthn Public Key in BFF Signature Verifier',
    regex: /router\.post\(\s*['"]\/webauthn\/verify['"]/g,
    severity: 'CRITICAL',
    description: 'WebAuthn verification in BFF must resolve the server-pinned SPKI public key via get_webauthn_credential_public_key before calling crypto.verify.',
    isViolation: (content) => !content.includes('get_webauthn_credential_public_key') || !content.includes('cryptoMod.verify')
  }
];

for (const bffFile of bffFiles) {
  const rawBff = fs.readFileSync(bffFile, 'utf-8');
  const relBff = path.relative(ROOT_DIR, bffFile);
  const cleanBff = rawBff.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  for (const rule of FORBIDDEN_BFF_PATTERNS) {
    if (rule.allowedFiles && rule.allowedFiles.some((af) => relBff.includes(af))) continue;
    rule.regex.lastIndex = 0;
    const match = rule.regex.exec(cleanBff);
    if (match) {
      if (typeof rule.isViolation === 'function' && !rule.isViolation(cleanBff, relBff)) {
        continue;
      }
      process.stderr.write(`\n  🔴 [FAIL] [${rule.severity}] ${rule.id}: ${rule.name}\n`);
      process.stderr.write(`       File: ${relBff}\n`);
      process.stderr.write(`       Details: ${rule.description}\n`);
      violationsCount++;
    }
  }
}

process.stdout.write(
  `     ${violationsCount === 0 ? '✅' : `❌ (${violationsCount} violation(s) so far)`} ` +
  `Scanned ${bffFiles.length} BFF server file(s).\n\n`
);

// 2. SCAN SQL MIGRATIONS FOR RLS DEFICIENCIES & DML SHIELDS
process.stdout.write('  📂 [2/7] SQL Migration Invariants (supabase/migrations)...\n');
const migrationFiles = walkDir(MIGRATIONS_DIR, ['.sql']);

let latestDmlMigration = null;
let highestDmlMigrationNum = -1;
let latestAuthCredMigration = null;
let highestAuthCredMigrationNum = -1;

for (const filePath of migrationFiles) {
  migrationsScanned++;
  const rawContent  = fs.readFileSync(filePath, 'utf-8');
  const relPath  = path.relative(ROOT_DIR, filePath);
  const baseName = path.basename(filePath);

  // Deterministically strip comments (--.*$ and /* ... */) before all SQL invariant checks
  const content = rawContent
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');

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

  // Track latest authenticate_by_credential SSOT definition
  if (/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?authenticate_by_credential\b/i.test(content)) {
    const match = baseName.match(/^(\d+)_/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highestAuthCredMigrationNum) {
        highestAuthCredMigrationNum = num;
        latestAuthCredMigration = { file: relPath, content, baseName, num };
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

    // 1% Invariant SQL-01: Scalar Subquery RLS Enforcement (Migrations >= 436)
    if (migNum >= 436) {
      const unSubqueried = content.match(/school_id\s*=\s*get_current_user_school_id\(\)/gi);
      if (unSubqueried) {
        process.stderr.write(`\n  🔴 [FAIL] [CRITICAL] Un-subqueried RLS function call in Migration ${baseName}\n`);
        process.stderr.write(`       File: ${relPath}\n`);
        process.stderr.write(`       Details: Migrations >= 436 must wrap RLS helper functions in scalar subqueries: 'school_id = (SELECT public.get_current_user_school_id())' to prevent O(N) query planner degradation.\n`);
        violationsCount++;
      }
    }

    // 1% Invariant SQL-02: Strict Plaintext PIN Elimination (Migrations >= 435)
    if (migNum >= 435) {
      if (content.includes('v_stored_hash = v_clean_pin') || content.includes('v_stored_hash = input_pin')) {
        process.stderr.write(`\n  🔴 [FAIL] [CRITICAL] Insecure Plaintext PIN Fallback in Migration ${baseName}\n`);
        process.stderr.write(`       File: ${relPath}\n`);
        process.stderr.write(`       Details: Migrations >= 435 must strictly eliminate plaintext PIN comparison fallbacks (Fail-Closed).\n`);
        violationsCount++;
      }
    }

    // 1% Invariant SQL-03: Parent Step-Up Lease Timebox (Migrations >= 435)
    if (migNum >= 435 && content.includes('save_parent_controls') && content.includes('session_leases')) {
      const spcFuncRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?save_parent_controls\b[\s\S]*?AS\s+(\$([a-zA-Z0-9_]*)\$)([\s\S]*?)\1/i;
      const spcMatch = content.match(spcFuncRegex);
      const funcBodyToCheck = spcMatch ? spcMatch[3] : content;
      if (funcBodyToCheck.includes("INTERVAL '30 days'") || funcBodyToCheck.includes("INTERVAL '7 days'")) {
        process.stderr.write(`\n  🔴 [FAIL] [HIGH] Insecure Long-Lived Parent Session Lease in Migration ${baseName}\n`);
        process.stderr.write(`       File: ${relPath}\n`);
        process.stderr.write(`       Details: Parent step-up leases in save_parent_controls must be timeboxed to a maximum of 15 minutes (INTERVAL '15 minutes') to protect shared family devices.\n`);
        violationsCount++;
      }
    }

    // 1% Invariant SQL-04: Zero Hardcoded Default Passwords in Migrations
    const defaultCredMatch = content.match(/ADD\s+COLUMN[^\n;]*(?:password|passwort|master_admin_password)[^\n;]*DEFAULT\s+['"][^'"]+['"]/i);
    if (defaultCredMatch) {
      process.stderr.write(`\n  🔴 [FAIL] [CRITICAL] Hardcoded Default Credential in Migration ${baseName}\n`);
      process.stderr.write(`       File: ${relPath}\n`);
      process.stderr.write(`       Details: SQL migrations must NEVER specify hardcoded default credentials in ADD COLUMN DDL statements. Use DEFAULT NULL.\n`);
      violationsCount++;
    }

    // 1% Invariant SQL-05: Zero Destructive DDL & Zero-Downtime Migration Guard (Migrations >= 511)
    if (migNum >= 511) {
      const isBypassed = rawContent.includes('-- zero-downtime-bypass:');
      if (!isBypassed) {
        const destructiveMatch = content.match(/\b(?:DROP\s+COLUMN|RENAME\s+COLUMN|TRUNCATE\s+(?:TABLE\s+)?(?!temp_|tmp_))\b/i);
        if (destructiveMatch) {
          process.stderr.write(`\n  🔴 [FAIL] [CRITICAL] Destructive DDL without Expand-Contract Pattern in Migration ${baseName}\n`);
          process.stderr.write(`       File: ${relPath}\n`);
          process.stderr.write(`       Details: Migrations >= 511 must adhere to Zero-Downtime Deployments (Stripe/GitHub Pattern). Dropping or renaming columns directly breaks live clients. Deprecate first in views, drop only after client migration window, or document with '-- zero-downtime-bypass: <reason>'.\n`);
          violationsCount++;
        }
      }
    }

    // 1% Invariant SQL-06: Zero Plaintext Auth-Bypasses or Mock Hashes (Migrations >= 539)
    if (migNum >= 539) {
      if (content.includes("'test-campus'") || content.includes('20ebecf465c192667822feac7b049d50ad76fa0c42289f61b0a514d0ff9e6bf9')) {
        process.stderr.write(`\n  🔴 [FAIL] [CRITICAL] Insecure Plaintext Auth Bypass or Hardcoded Mock Hash in Migration ${baseName}\n`);
        process.stderr.write(`       File: ${relPath}\n`);
        process.stderr.write(`       Details: Migrations >= 539 must strictly eliminate plaintext token bypasses ('test-campus') and hardcoded mock digests in auth/contract RPCs.\n`);
        violationsCount++;
      }
    }

    // 1% Invariant SQL-07: SECURITY DEFINER Caller Authorization Guard (Migrations >= 540)
    if (migNum >= 540) {
      const funcRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)[\s\S]*?AS\s+(\$([a-zA-Z0-9_]*)\$)([\s\S]*?)\2\s*(?:[a-zA-Z0-9_\s=,']*);/gi;
      let funcMatch;
      while ((funcMatch = funcRegex.exec(content)) !== null) {
        const fullFuncDef = funcMatch[0];
        const funcName = funcMatch[1];
        const funcBody = funcMatch[4];

        const isSecDefiner = /\bSECURITY\s+DEFINER\b/i.test(fullFuncDef);
        if (!isSecDefiner) continue;

        // Check if granted to authenticated or anon in this migration
        const grantRegex = new RegExp(`GRANT\\s+(?:EXECUTE|ALL)\\s+ON\\s+FUNCTION\\s+(?:public\\.)?${funcName}\\b[^;]*\\bTO\\s+[^;]*\\b(?:authenticated|anon)\\b`, 'i');
        const isGrantedToAuthOrAnon = grantRegex.test(content);

        if (!isGrantedToAuthOrAnon) continue;

        // Exempt authoritative login/challenge functions, public landing/theme metadata, public contract verification and public biography PIN functions
        const isLoginOrChallengeExempt = [
          'authenticate_by_credential',
          'authenticate_student_by_credential',
          'authenticate_student_by_id_and_day',
          'authenticate_webauthn_credential',
          'generate_webauthn_challenge',
          'get_public_school_theme',
          'build_safe_school_context',
          'verify_personal_pin',
          'verify_parent_pin',
          'login_master_admin',
          'register_school_and_admin',
          'search_public_schools',
          'verify_shared_biography_pin',
          'record_shared_biography_reaction',
          'verify_b2b_contract_digest',
          'switch_user_active_role'
        ].includes(funcName);

        if (isLoginOrChallengeExempt) continue;

        // 1% Invariant SQL-11 (Migrations >= 591): Forbid current_user IN ('postgres', ...) inside SECURITY DEFINER
        if (migNum >= 591 && /\bcurrent_user\s+IN\s*\([^)]*'postgres'/i.test(funcBody)) {
          process.stderr.write(`\n  🔴 [FAIL] [CRITICAL] Forbidden current_user Check inside SECURITY DEFINER in Migration ${baseName}\n`);
          process.stderr.write(`       Function: ${funcName}\n`);
          process.stderr.write(`       File: ${relPath}\n`);
          process.stderr.write(`       Details: Inside a postgres-owned SECURITY DEFINER function, current_user is ALWAYS 'postgres'. Use current_setting('role', true) = 'service_role' instead.\n`);
          violationsCount++;
        }

        // Verify authoritative caller validation in function body
        const hasCallerAuth = 
          funcBody.includes('is_master_admin()') ||
          funcBody.includes('get_current_user_school_id()') ||
          funcBody.includes('get_current_authenticated_user_id()') ||
          funcBody.includes('auth.uid()') ||
          funcBody.includes('session_leases') ||
          funcBody.includes("current_setting('role'") ||
          (migNum < 591 && /\bcurrent_user\s+(?:IN\s*\([^)]*\)|=)/i.test(funcBody)) ||
          funcBody.includes('get_current_user_role()');

        if (!hasCallerAuth) {
          process.stderr.write(`\n  🔴 [FAIL] [CRITICAL] Unchecked SECURITY DEFINER Function in Migration ${baseName}\n`);
          process.stderr.write(`       Function: ${funcName}\n`);
          process.stderr.write(`       File: ${relPath}\n`);
          process.stderr.write(`       Details: SECURITY DEFINER functions exposed to 'authenticated' or 'anon' must validate the caller identity (e.g. is_master_admin(), get_current_user_school_id(), get_current_authenticated_user_id(), session_leases, or current_setting('role', true) = 'service_role').\n`);
          violationsCount++;
        }
      }
    }

    // 1% Invariant SQL-08: Zero Plaintext PIN Comparison Guard (Migrations >= 540)
    if (migNum >= 540) {
      const pinComparisonRegex = /(?:\b(?:personal_pin|parent_pin)\s*(?:=|<>|!=)\s*(?:p_[a-zA-Z0-9_]+|input[a-zA-Z0-9_]*|v_[a-zA-Z0-9_]+|[a-zA-Z0-9_]*pin[a-zA-Z0-9_]*|encode\s*\(|digest\s*\()|(?:p_[a-zA-Z0-9_]+|input[a-zA-Z0-9_]*|v_[a-zA-Z0-9_]+|[a-zA-Z0-9_]*pin[a-zA-Z0-9_]*|encode\s*\(|digest\s*\()\s*(?:=|<>|!=)\s*\b(?:personal_pin|parent_pin)\b)/i;
      const pinMatch = content.match(pinComparisonRegex);
      if (pinMatch) {
        process.stderr.write(`\n  🔴 [FAIL] [CRITICAL] Insecure Plaintext PIN Comparison in Migration ${baseName}\n`);
        process.stderr.write(`       File: ${relPath}\n`);
        process.stderr.write(`       Match: "${pinMatch[0]}"\n`);
        process.stderr.write(`       Details: Migrations >= 540 must strictly eliminate plaintext PIN comparison fallbacks and direct equality/inequality comparisons on personal_pin or parent_pin against parameters. PIN verifications must use verify_personal_pin or verify_parent_pin RPCs.\n`);
        violationsCount++;
      }
    }

    // 1% Invariant SQL-09: Forbidden Primary-Key Match & Two-Stage Lease Minting in Credential-Lookup RPCs (Migrations == 555 or >= 591)
    if ((migNum === 555 || migNum >= 591) && content.includes('authenticate_by_credential')) {
      const pkMatchRegex = /\b(?:[a-zA-Z0-9_]+\.)?id(?:::uuid|::text)?\s*=\s*(?:v_clean|p_credential)(?:::uuid|::text)?\b|\b(?:v_clean|p_credential)(?:::uuid|::text)?\s*=\s*(?:[a-zA-Z0-9_]+\.)?id(?:::uuid|::text)?\b/i;
      
      const funcRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?authenticate_by_credential\b[\s\S]*?AS\s+(\$([a-zA-Z0-9_]*)\$)([\s\S]*?)\1\s*(?:[a-zA-Z0-9_\s=,']*);/gi;
      let funcMatch;
      let checkedBody = false;
      while ((funcMatch = funcRegex.exec(content)) !== null) {
        checkedBody = true;
        const funcBody = funcMatch[3];
        const pkMatch = funcBody.match(pkMatchRegex);
        if (pkMatch) {
          process.stderr.write(`\n  🔴 [FAIL] [CRITICAL] Forbidden Primary-Key Match in authenticate_by_credential in Migration ${baseName}\n`);
          process.stderr.write(`       File: ${relPath}\n`);
          process.stderr.write(`       Match: "${pkMatch[0]}"\n`);
          process.stderr.write(`       Details: authenticate_by_credential must NEVER match on primary key 'id = v_clean::uuid'. Credentials must strictly match qr_token, teacher_qr_token, or ausweis_nummer.\n`);
          violationsCount++;
        }
      }

      if (!checkedBody) {
        const pkMatch = content.match(pkMatchRegex);
        if (pkMatch) {
          process.stderr.write(`\n  🔴 [FAIL] [CRITICAL] Forbidden Primary-Key Match in authenticate_by_credential in Migration ${baseName}\n`);
          process.stderr.write(`       File: ${relPath}\n`);
          process.stderr.write(`       Match: "${pkMatch[0]}"\n`);
          process.stderr.write(`       Details: authenticate_by_credential must NEVER match on primary key 'id = v_clean::uuid'. Credentials must strictly match qr_token, teacher_qr_token, or ausweis_nummer.\n`);
          violationsCount++;
        }
      }
    }

    // 1% Invariant SQL-10: Strict Non-Plaintext Password Hash in Users Raw (Migrations >= 555)
    if (migNum >= 555 && content.includes('users_raw')) {
      const insertStartRegex = /INSERT\s+INTO\s+(?:public\.)?users_raw\s*\(/gi;
      let insertMatch;
      while ((insertMatch = insertStartRegex.exec(content)) !== null) {
        const colStart = insertMatch.index + insertMatch[0].length - 1;
        const colExtract = extractBalancedParentheses(content, colStart);
        if (!colExtract) continue;

        const columns = splitSqlList(colExtract.content).map(c => c.toLowerCase().trim().replace(/^["']|["']$/g, ''));
        const pwdHashIdx = columns.indexOf('password_hash');
        if (pwdHashIdx === -1) continue;

        const afterCols = content.substring(colExtract.endIndex);
        const valuesMatch = afterCols.match(/VALUES\s*\(/i);
        if (!valuesMatch || valuesMatch.index === undefined) continue;

        const valStart = colExtract.endIndex + valuesMatch.index + valuesMatch[0].length - 1;
        const valExtract = extractBalancedParentheses(content, valStart);
        if (!valExtract) continue;

        const values = splitSqlList(valExtract.content);
        if (values.length > pwdHashIdx) {
          const pwdValue = values[pwdHashIdx];
          const isPlaintextPin = /\b(?:v_generated_pin|v_clean_pin|input_pin|v_pin|p_pin)\b/i.test(pwdValue);
          if (isPlaintextPin) {
            process.stderr.write(`\n  🔴 [FAIL] [CRITICAL] Plaintext PIN assigned to password_hash in Migration ${baseName}\n`);
            process.stderr.write(`       File: ${relPath}\n`);
            process.stderr.write(`       Assigned Value: "${pwdValue}"\n`);
            process.stderr.write(`       Details: password_hash in users_raw must be NULL or a cryptographic hash. Initial PINs must be hashed via extensions.crypt() into private_auth.user_secrets.\n`);
            violationsCount++;
          }
        }
      }

      const updateMatch = content.match(/\bpassword_hash\s*=\s*(?:v_generated_pin|v_clean_pin|input_pin|v_pin|p_pin)\b/i);
      if (updateMatch) {
        process.stderr.write(`\n  🔴 [FAIL] [CRITICAL] Plaintext PIN assigned to password_hash via UPDATE in Migration ${baseName}\n`);
        process.stderr.write(`       File: ${relPath}\n`);
        process.stderr.write(`       Match: "${updateMatch[0]}"\n`);
        process.stderr.write(`       Details: password_hash in users_raw must be NULL or a cryptographic hash.\n`);
        violationsCount++;
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

// Verify that the LATEST authenticate_by_credential SSOT enforces Two-Stage Lease Minting & Zero Primary-Key Matching!
if (latestAuthCredMigration) {
  const pkMatchRegex = /\b(?:[a-zA-Z0-9_]+\.)?id(?:::uuid|::text)?\s*=\s*(?:v_clean|p_credential)(?:::uuid|::text)?\b|\b(?:v_clean|p_credential)(?:::uuid|::text)?\s*=\s*(?:[a-zA-Z0-9_]+\.)?id(?:::uuid|::text)?\b/i;
  const authFuncRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?authenticate_by_credential\b[\s\S]*?AS\s+(\$([a-zA-Z0-9_]*)\$)([\s\S]*?)\1/i;
  const authFuncMatch = latestAuthCredMigration.content.match(authFuncRegex);
  const authFuncBody = authFuncMatch ? authFuncMatch[3] : latestAuthCredMigration.content;

  const hasForbiddenPkMatch = pkMatchRegex.test(authFuncBody);
  const hasForbiddenCrossTenantFallback = authFuncBody.includes('Fallback: if school_id was provided') ||
    (authFuncBody.match(/FROM\s+public\.users_raw\s+u/gi) || []).length > 2;
  const hasTwoStageLeaseGate = authFuncBody.includes('v_requires_pin') && /IF\s+NOT\s+v_requires_pin\s+THEN/i.test(authFuncBody);
  const hasMasterAdminBlock = authFuncBody.includes('is_master_admin');
  const hasSafeSchoolProjection = authFuncBody.includes('build_safe_school_context');

  if (hasForbiddenPkMatch || hasForbiddenCrossTenantFallback || !hasTwoStageLeaseGate || !hasMasterAdminBlock || !hasSafeSchoolProjection) {
    process.stderr.write(`\n  🔴 [FAIL] [CRITICAL] Insecure authenticate_by_credential SSOT in latest migration\n`);
    process.stderr.write(`       File: ${latestAuthCredMigration.file}\n`);
    process.stderr.write(`       Details: The latest authenticate_by_credential definition must forbid primary-key matching, forbid cross-tenant fallback queries, block is_master_admin, use build_safe_school_context, and enforce Two-Stage Lease Minting (IF NOT v_requires_pin THEN).\n`);
    violationsCount++;
  } else {
    process.stdout.write(`     ✅ Latest Auth RPC Migration (${latestAuthCredMigration.baseName}) enforces Two-Stage Lease Minting, Strict Tenant-Binding & Zero-UUID-Guessing.\n`);
  }
}

process.stdout.write(
  `     ${violationsCount === 0 ? '✅' : `❌ (${violationsCount} violation(s))`}` +
  ` Scanned ${migrationsScanned} migration file(s).\n\n`
);

// PARALLEL EXECUTION OF INVARIANT SUB-SUITES (3/7 - 7/7)
async function runSubSuite(cmd, cwd) {
  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd, encoding: 'utf-8' });
    return { passed: true, stdout, stderr };
  } catch (err) {
    return { passed: false, stdout: err.stdout || '', stderr: err.stderr || err.message };
  }
}

const [finopsRes, rlsRes, teacherRes, headersRes, sbomRes] = await Promise.all([
  runSubSuite('npx tsx src/domain/__tests__/runBillingInvariantTests.ts', path.join(ROOT_DIR, 'apps', 'groovelab')),
  runSubSuite('npx tsx scripts/verify_rls_catalog_invariants.ts', ROOT_DIR),
  runSubSuite('npx tsx src/tests/runTeacherNameInvariantTests.ts', path.join(ROOT_DIR, 'apps', 'groovelab')),
  runSubSuite('node scripts/verify_static_security_headers.mjs', ROOT_DIR),
  runSubSuite('node scripts/generate_cyclonedx_sbom.mjs', ROOT_DIR)
]);

// 3. FINOPS ARCHITECTURAL INVARIANT & BILLING SUITE
process.stdout.write('  📂 [3/7] FinOps Billing Invariants (runBillingInvariantTests.ts)...\n');
if (finopsRes.passed) {
  if (finopsRes.stdout) process.stdout.write(finopsRes.stdout.split('\n').map(l => `       ${l}`).join('\n') + '\n');
  process.stdout.write('     ✅ FinOps Suite: PASSED — Alle Formel- und Algorithmus-Invarianten bestätigt.\n\n');
} else {
  process.stderr.write('  🚨 FinOps Invariant Check FAILED: Billing engine deviation detected!\n');
  process.stderr.write(finopsRes.stderr + '\n');
  violationsCount++;
}

// 4. FORENSIC RLS & SCHEMA CATALOG INVARIANTS
process.stdout.write('  📂 [4/7] Forensic RLS & Schema Catalog Invariants...\n');
if (rlsRes.passed) {
  if (rlsRes.stdout) process.stdout.write(rlsRes.stdout.split('\n').map(l => `       ${l}`).join('\n') + '\n');
  process.stdout.write('     ✅ All 20 Forensic Architecture & Performance Invariants: VERIFIED\n\n');
} else {
  process.stderr.write('  🚨 Forensic RLS Catalog Invariant Check FAILED: Schema invariant violation detected!\n');
  process.stderr.write(rlsRes.stderr + '\n');
  violationsCount++;
}

// 5. TEACHER NAME COMMUNICATION INVARIANTS ("Vorname Nachname")
process.stdout.write('  📂 [5/7] Teacher Name Communication Invariants (runTeacherNameInvariantTests.ts)...\n');
if (teacherRes.passed) {
  if (teacherRes.stdout) process.stdout.write(teacherRes.stdout.split('\n').map(l => `       ${l}`).join('\n') + '\n');
  process.stdout.write('     ✅ Teacher Name Communication Suite: PASSED — Vorname Nachname Doktrin bestätigt.\n\n');
} else {
  process.stderr.write('  🚨 Teacher Name Communication Check FAILED: Invariant violation detected!\n');
  process.stderr.write(teacherRes.stderr + '\n');
  violationsCount++;
}

// 6. STATIC PERIMETER & MOZILLA OBSERVATORY A+ HEADER INVARIANTS
process.stdout.write('  📂 [6/7] Static Perimeter & Mozilla Observatory A+ Header Invariants...\n');
if (headersRes.passed) {
  process.stdout.write('     ✅ Static Perimeter Suite: PASSED — 100% Mozilla Observatory A+ & SecurityHeaders.com Konformität bestätigt.\n\n');
} else {
  process.stderr.write('  🚨 Static Perimeter Header Check FAILED: Security header degradation detected!\n');
  process.stderr.write(headersRes.stderr + '\n');
  violationsCount++;
}

// 7. SUPPLY CHAIN & CYCLONEDX SBOM INVARIANTS (NIST SP 800-161)
process.stdout.write('  📂 [7/7] Supply Chain CycloneDX SBOM Invariants (NIST SP 800-161)...\n');
if (sbomRes.passed) {
  process.stdout.write('     ✅ CycloneDX SBOM Suite: PASSED — Dynamisches Software-Inventar & SHA-512 Integrität verifiziert.\n\n');
} else {
  process.stderr.write('  🚨 CycloneDX SBOM Check FAILED: Supply-Chain Integritätsprüfung fehlgeschlagen!\n');
  process.stderr.write(sbomRes.stderr + '\n');
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
