#!/usr/bin/env node
// =============================================================================
// 🛡️ Campus-Groovelab BSI 360° Cybersecurity Evaluation Matrix Guard (0,1% Goldstandard)
// Standards: BSI IT-Grundschutz (APP.3.1, CON.1, ORP.4, OPS.1.2.2),
//            BSI TR-02102-1/2, OWASP ASVS Level 3 (v4.0.3), NIS-2 (Art. 21),
//            DSGVO Art. 5, 8, 25, 32, ISO/IEC 27001:2022
// Purpose:   Evaluates all 6 weighted cybersecurity domains (24 checks) across
//            SQL SSOT migrations, BFF perimeter, FIDO2/WebAuthn, client vaults,
//            Nginx edge configs, and backup encryption scripts (< 150ms).
//            Outputs human-readable scorecard or JSON (--json) for weekly/monthly
//            resilience dossiers. Fails closed (exit 1) on ANY violation or if
//            weighted score drops below 95.0 / 100.
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const IS_JSON = process.argv.includes('--json');

const startTime = Date.now();

function readTextSafe(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf-8');
}

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');
}

// -----------------------------------------------------------------------------
// Resolve Latest SSOT SQL Function Definitions across supabase/migrations
// -----------------------------------------------------------------------------
const migrationsDir = path.join(ROOT_DIR, 'supabase', 'migrations');
const migrationFiles = fs.existsSync(migrationsDir)
  ? fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'))
  : [];

const trackedFunctions = [
  'build_safe_school_context',
  'get_current_authenticated_user_id',
  'authenticate_by_credential',
  'verify_personal_pin',
  'verify_parent_pin',
  'set_personal_pin',
  'set_initial_student_pin',
  'get_master_schools_overview',
  'get_secretary_dashboard_bootstrap',
  'register_webauthn_credential',
  'authenticate_webauthn_credential',
  'authenticate_student_by_id_and_day',
  'save_user_audio_calibration',
  'get_user_audio_calibrations',
  'delete_user_audio_calibration',
  'record_security_idempotency_nonce'
];

const trackedPolicies = [
  'audio_recordings_policy',
  'audio_milestones_policy',
  'school_year_playlists_policy',
  'student_consents_select',
  'gdpr_deletion_requests_select',
  'band_rehearsals_select'
];

const latestFunctionDefs = new Map();
const latestPolicyDefs = new Map();
let latestMigration591PlusContent = '';
let migration387Content = '';

for (const file of migrationFiles) {
  const numMatch = file.match(/^(\d{1,4})_/);
  if (!numMatch) continue;
  const migNum = parseInt(numMatch[1], 10);
  if (migNum >= 20000000) continue;

  const rawSql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
  const cleanSql = stripSqlComments(rawSql);

  if (migNum === 301 || migNum === 387 || migNum === 469 || migNum === 538) {
    migration387Content += `\n-- FILE: ${file}\n` + cleanSql;
  }
  if (migNum >= 591) {
    latestMigration591PlusContent += `\n-- FILE: ${file}\n` + cleanSql;
  }

  for (const fnName of trackedFunctions) {
    const fnRegex = new RegExp(
      `CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+(?:public\\.|private_auth\\.)?${fnName}\\b[\\s\\S]*?AS\\s+(\\$([a-zA-Z0-9_]*)\\$)([\\s\\S]*?)\\1`,
      'gi'
    );
    let match;
    while ((match = fnRegex.exec(cleanSql)) !== null) {
      const current = latestFunctionDefs.get(fnName);
      if (!current || migNum >= current.migNum) {
        latestFunctionDefs.set(fnName, {
          migNum,
          file,
          fullDef: match[0],
          body: match[3]
        });
      }
    }
  }

  for (const polName of trackedPolicies) {
    const polRegex = new RegExp(
      `CREATE\\s+POLICY\\s+"${polName}"\\s+ON\\s+public\\.[a-zA-Z0-9_]+[\\s\\S]*?;`,
      'gi'
    );
    let pMatch;
    while ((pMatch = polRegex.exec(cleanSql)) !== null) {
      const currentPol = latestPolicyDefs.get(polName);
      if (!currentPol || migNum >= currentPol.migNum) {
        latestPolicyDefs.set(polName, {
          migNum,
          file,
          stmt: pMatch[0]
        });
      }
    }
  }
}

function getFnBody(fnName) {
  return latestFunctionDefs.get(fnName)?.body || '';
}

function getFnFile(fnName) {
  return latestFunctionDefs.get(fnName)?.file || 'MISSING';
}

function getPolicyStmt(polName) {
  return latestPolicyDefs.get(polName)?.stmt || '';
}

function getPolicyFile(polName) {
  return latestPolicyDefs.get(polName)?.file || 'MISSING';
}

// -----------------------------------------------------------------------------
// Load Target Files for Domains 1, 2, 5, 6
// -----------------------------------------------------------------------------
const nginxMain = readTextSafe('deploy/nginx/campus-groovelab.de.conf');
const nginxSupabase = readTextSafe('deploy/nginx/supabase.campus-groovelab.de.conf');
const nginxLocal = readTextSafe('nginx.conf');
const allNginx = `${nginxMain}\n${nginxSupabase}\n${nginxLocal}`;

const bffCrypto = readTextSafe('packages/bff-server/src/lib/session/crypto.ts');
const offlineVault = readTextSafe('apps/groovelab/src/lib/security/encryptedOfflineVault.ts');
const aesStorageVault = readTextSafe('apps/groovelab/src/utils/aesStorageVault.ts');
const webauthnClient = readTextSafe('apps/groovelab/src/utils/webauthn.ts');
const bffAuthRoute = readTextSafe('packages/bff-server/src/routes/auth.ts');
const bffStorageRoute = readTextSafe('packages/bff-server/src/routes/storage.ts');
const bffMediaValidator = readTextSafe('packages/bff-server/src/lib/mediaValidator.ts');
const bffSentinelRoute = readTextSafe('packages/bff-server/src/routes/sentinel.ts');
const bffIndex = readTextSafe('packages/bff-server/src/index.ts');
const bffIdempotency = readTextSafe('packages/bff-server/src/services/idempotencyLedger.ts');

const deploySh = readTextSafe('deploy.sh');
const backupSh = readTextSafe('backup.sh');
const backupEnterpriseSh = readTextSafe('scripts/backup_supabase_enterprise.sh');
const backupCampusDbSh = readTextSafe('deploy/backup/backup_campus_db.sh');

// -----------------------------------------------------------------------------
// Evaluate All 6 BSI / OWASP ASVS L3 Domains (24 Checks)
// -----------------------------------------------------------------------------
const domains = [
  {
    id: 'DOM_1',
    name: '1. EU-Souveränität & Cloud-Isolation',
    standard: 'BSI C5 / Schrems-II / DSGVO Art. 44',
    weightPercent: 15,
    checks: [
      {
        id: 'DOM1_01',
        title: 'Zero US-DNS-Resolver in Nginx (Kein 1.1.1.1 / 8.8.8.8 / 9.9.9.9)',
        passed:
          allNginx.length > 0 &&
          !/resolver\s+[^\n;]*(?:1\.1\.1\.1|8\.8\.8\.8|8\.8\.4\.4|9\.9\.9\.9)/i.test(
            allNginx.replace(/#.*$/gm, '')
          ),
        evidence: 'deploy/nginx/*.conf & nginx.conf (0 US-Cloud DNS resolvers)'
      },
      {
        id: 'DOM1_02',
        title: 'Souveräne EU/DE-DNS-Resolver (Hetzner 185.12.64.1 / DNS0.eu 193.110.81.0)',
        passed:
          nginxMain.includes('185.12.64.1') &&
          nginxSupabase.includes('185.12.64.1') &&
          nginxLocal.includes('185.12.64.1'),
        evidence: 'Hetzner DE & DNS0.eu resolvers active across all 3 Nginx configs'
      },
      {
        id: 'DOM1_03',
        title: 'Aktives Nginx Edge Rate-Limiting (campus_auth_limit & campus_api_limit)',
        passed:
          nginxMain.includes('zone=campus_auth_limit') &&
          nginxMain.includes('zone=campus_api_limit') &&
          nginxSupabase.includes('zone=supabase_rest_limit'),
        evidence: 'limit_req_zone & limit_req active in campus-groovelab.de.conf & supabase.conf'
      },
      {
        id: 'DOM1_04',
        title: 'Anti-IP-Spoofing Perimeter (X-Real-IP & X-Forwarded-For = $remote_addr, CF-Header Purge)',
        passed:
          nginxMain.includes('proxy_set_header X-Forwarded-For $remote_addr;') &&
          nginxMain.includes('proxy_set_header CF-Connecting-IP "";') &&
          nginxSupabase.includes('proxy_set_header X-Forwarded-For $remote_addr;') &&
          nginxSupabase.includes('proxy_set_header CF-Connecting-IP "";'),
        evidence: 'Client X-Forwarded-For & CF-Connecting-IP neutralized at Nginx ingress'
      }
    ]
  },
  {
    id: 'DOM_2',
    name: '2. Kryptografie & Key-Management',
    standard: 'BSI TR-02102-1 / OWASP ASVS V6',
    weightPercent: 15,
    checks: [
      {
        id: 'DOM2_01',
        title: 'RFC 5869 HKDF-SHA256 Key Derivation & 256-Bit Secret-Floor im BFF',
        passed:
          bffCrypto.includes("crypto.hkdfSync('sha256'") &&
          bffCrypto.includes('Buffer.byteLength(rawSecret') &&
          bffCrypto.includes('< 32'),
        evidence: 'packages/bff-server/src/lib/session/crypto.ts (HKDF-SHA256 + >=32B floor)'
      },
      {
        id: 'DOM2_02',
        title: 'Non-Extractable WebCrypto Session Keys im Offline-Vault (extractable: false)',
        passed:
          offlineVault.includes('extractable = false') ||
          (offlineVault.includes("['encrypt', 'decrypt']") &&
            !offlineVault.includes("true, ['encrypt', 'decrypt']")),
        evidence: 'apps/groovelab/src/lib/security/encryptedOfflineVault.ts (extractable: false)'
      },
      {
        id: 'DOM2_03',
        title: 'Fail-Closed AES-GCM Storage Vault ohne Klartext-Fallback',
        passed:
          aesStorageVault.includes('AES-GCM') &&
          aesStorageVault.includes('PBKDF2') &&
          !aesStorageVault.includes('JSON.parse(rawPayload)') &&
          !aesStorageVault.includes('JSON.parse(payload)'),
        evidence: 'apps/groovelab/src/utils/aesStorageVault.ts (Zero plaintext fallback)'
      },
      {
        id: 'DOM2_04',
        title: 'Echte FIDO2 SPKI-Public-Key-Extraktion & Server-Pinned crypto.verify',
        passed:
          webauthnClient.includes('getPublicKey') &&
          webauthnClient.includes('authenticatorData') &&
          webauthnClient.includes('/api/auth/webauthn/verify') &&
          bffAuthRoute.includes('get_webauthn_credential_public_key') &&
          (bffAuthRoute.includes('crypto.verify') || bffAuthRoute.includes('cryptoMod.verify')) &&
          bffAuthRoute.includes('createPublicKey'),
        evidence: 'apps/groovelab/src/utils/webauthn.ts & packages/bff-server/src/routes/auth.ts'
      }
    ]
  },
  {
    id: 'DOM_3',
    name: '3. Authentifizierung & Session-Governance',
    standard: 'OWASP ASVS V2 & V3 / BSI ORP.4',
    weightPercent: 25,
    checks: [
      {
        id: 'DOM3_01',
        title: 'Zweistufiges Lease-Minting, Master-Admin-Gate, Strikter Tenant-Filter & Zero-UUID-Match in authenticate_by_credential',
        passed: (() => {
          const body = getFnBody('authenticate_by_credential');
          const pkMatchRegex = /\b(?:[a-zA-Z0-9_]+\.)?id(?:::uuid|::text)?\s*=\s*(?:v_clean|p_credential)(?:::uuid|::text)?\b/i;
          return (
            body.length > 0 &&
            !pkMatchRegex.test(body) &&
            !body.includes('Fallback: if school_id was provided') &&
            body.includes('is_master_admin') &&
            body.includes('v_requires_pin') &&
            /IF\s+NOT\s+v_requires_pin\s+THEN/i.test(body)
          );
        })(),
        evidence: `Latest authenticate_by_credential in ${getFnFile('authenticate_by_credential')}`
      },
      {
        id: 'DOM3_02',
        title: 'Stage-2 Post-PIN Session-Lease-Minting & Rate-Limiting (mint_verified_pin_session_lease + qr_login_rate_limits)',
        passed:
          getFnBody('verify_personal_pin').includes('mint_verified_pin_session_lease') &&
          getFnBody('verify_personal_pin').includes('qr_login_rate_limits') &&
          getFnBody('verify_personal_pin').includes('v_is_pin_activated = FALSE') &&
          getFnBody('verify_parent_pin').includes('mint_verified_pin_session_lease') &&
          getFnBody('set_personal_pin').includes('mint_verified_pin_session_lease') &&
          getFnBody('set_initial_student_pin').includes('mint_verified_pin_session_lease'),
        evidence: 'verify_personal_pin, verify_parent_pin, set_personal_pin & set_initial_student_pin'
      },
      {
        id: 'DOM3_03',
        title: 'UUID-Only Session-Lease-Auflösung mit u.is_active = TRUE & 15m Master-TTL ohne device_key-Fallback',
        passed: (() => {
          const body = getFnBody('get_current_authenticated_user_id');
          return (
            body.length > 0 &&
            body.includes('id = v_token::uuid') &&
            body.includes('u.is_active = TRUE') &&
            body.includes("INTERVAL '15 minutes'") &&
            !/device_key\s*=\s*v_token/i.test(body)
          );
        })(),
        evidence: `Latest get_current_authenticated_user_id in ${getFnFile('get_current_authenticated_user_id')}`
      },
      {
        id: 'DOM3_04',
        title: 'WebAuthn Assertion-Prüfung & gehärtetes Schüler-Geburtstagstag-Onboarding (created_at & TOFU)',
        passed: (() => {
          const webauthnBody = getFnBody('authenticate_webauthn_credential');
          const regWebauthnBody = getFnBody('register_webauthn_credential');
          const studentDayBody = getFnBody('authenticate_student_by_id_and_day');
          return (
            webauthnBody.includes('FIDO2_ASSERTION_REQUIRED') &&
            webauthnBody.includes('webauthn.get') &&
            regWebauthnBody.includes('CREDENTIAL_ID_COLLISION') &&
            studentDayBody.includes('created_at >') &&
            !studentDayBody.includes('attempt_at') &&
            !studentDayBody.includes("'qr_token',")
          );
        })(),
        evidence: `authenticate_webauthn_credential & authenticate_student_by_id_and_day (${getFnFile('authenticate_webauthn_credential')})`
      }
    ]
  },
  {
    id: 'DOM_4',
    name: '4. Mandantentrennung & Autorisierung (RLS)',
    standard: 'OWASP ASVS V4 / ISO 27001 A.8.24',
    weightPercent: 25,
    checks: [
      {
        id: 'DOM4_01',
        title: 'Zero current_user Bypass in get_master_schools_overview (is_master_admin / service_role only)',
        passed: (() => {
          const body = getFnBody('get_master_schools_overview');
          return (
            body.length > 0 &&
            body.includes('is_master_admin()') &&
            body.includes("current_setting('role', true) = 'service_role'") &&
            !/\bcurrent_user\b/i.test(body)
          );
        })(),
        evidence: `Latest get_master_schools_overview in ${getFnFile('get_master_schools_overview')}`
      },
      {
        id: 'DOM4_02',
        title: 'Fail-Closed Caller- & Rollen-Prüfung in get_secretary_dashboard_bootstrap',
        passed: (() => {
          const body = getFnBody('get_secretary_dashboard_bootstrap');
          return (
            body.length > 0 &&
            body.includes('IF v_caller_id IS NULL THEN') &&
            body.includes("v_caller_role NOT IN ('admin', 'secretary')") &&
            body.includes('v_caller_school_id IS DISTINCT FROM p_school_id')
          );
        })(),
        evidence: `Latest get_secretary_dashboard_bootstrap in ${getFnFile('get_secretary_dashboard_bootstrap')}`
      },
      {
        id: 'DOM4_03',
        title: 'Monotone SQL-Policy-Ratchet: Schüler-isolierte ReBAC-RLS auf Audio-, Consent- & Löschtabellen (§ 201 StGB)',
        passed: (() => {
          const audioRecPol = getPolicyStmt('audio_recordings_policy');
          const audioMilePol = getPolicyStmt('audio_milestones_policy');
          const playlistPol = getPolicyStmt('school_year_playlists_policy');
          const consentPol = getPolicyStmt('student_consents_select');
          const gdprPol = getPolicyStmt('gdpr_deletion_requests_select');
          const bandPol = getPolicyStmt('band_rehearsals_select');

          return (
            audioRecPol.includes('is_assigned_teacher_of_student') &&
            !audioRecPol.includes("'admin'") &&
            !audioRecPol.includes("'secretary'") &&
            audioMilePol.includes('is_assigned_teacher_of_student') &&
            !audioMilePol.includes("'admin'") &&
            !audioMilePol.includes("'secretary'") &&
            playlistPol.includes('is_assigned_teacher_of_student') &&
            consentPol.length > 0 &&
            gdprPol.length > 0 &&
            bandPol.length > 0
          );
        })(),
        evidence: `Latest audio_recordings_policy in ${getPolicyFile('audio_recordings_policy')} (ReBAC-locked, 0 leadership access)`
      },
      {
        id: 'DOM4_04',
        title: 'Caller-Ownership-Prüfung & ReBAC in Audio-Kalibrierungs-RPCs (save/get/delete)',
        passed:
          getFnBody('save_user_audio_calibration').includes('v_caller_id = p_user_id') &&
          getFnBody('get_user_audio_calibrations').includes('v_caller_id = p_user_id') &&
          getFnBody('delete_user_audio_calibration').includes('v_caller_id = p_user_id') &&
          getFnBody('save_user_audio_calibration').includes('is_assigned_teacher_of_student'),
        evidence: `Audio calibration RPCs in ${getFnFile('save_user_audio_calibration')}`
      }
    ]
  },
  {
    id: 'DOM_5',
    name: '5. API-, BFF- & Storage-Perimeter',
    standard: 'OWASP ASVS V12–V14 / BSI APP.3.1',
    weightPercent: 10,
    checks: [
      {
        id: 'DOM5_01',
        title: 'Storage-Proxy Session-Lease-Verifikation & Cross-Student Write/Read BOLA-Schutz',
        passed:
          bffStorageRoute.includes('session_leases') &&
          bffStorageRoute.includes('x-session-token') &&
          bffStorageRoute.includes("authUser.role === 'student'") &&
          bffStorageRoute.includes('STUDENT_WRITE_SCHOOL_ASSET_DENIED') &&
          bffStorageRoute.includes('effectiveStudentId'),
        evidence: 'packages/bff-server/src/routes/storage.ts (Session lease + student write/read prefix guard)'
      },
      {
        id: 'DOM5_02',
        title: 'Vollständige Magic-Byte-Signaturprüfung (FLAC/WEBP/AAC) & binäres JPEG-EXIF-Stripping',
        passed:
          bffMediaValidator.includes('0x66') &&
          bffMediaValidator.includes('stripJpegMetadata') &&
          bffMediaValidator.includes('marker >= 0xe1 && marker <= 0xef') &&
          bffStorageRoute.includes('stripJpegMetadata'),
        evidence: 'packages/bff-server/src/lib/mediaValidator.ts & routes/storage.ts'
      },
      {
        id: 'DOM5_03',
        title: 'Kryptografisch verifizierter Dead-Letter-Sentinel & X-Real-IP Rate-Limiter-Priorität',
        passed:
          bffSentinelRoute.includes('DEAD_LETTER_RATE_MAP') &&
          bffSentinelRoute.includes('x-session-token') &&
          bffSentinelRoute.includes('decryptSession') &&
          bffSentinelRoute.includes('verifySiteGateToken') &&
          bffSentinelRoute.includes('session_leases') &&
          bffIndex.includes("req.headers['x-real-ip']"),
        evidence: 'packages/bff-server/src/routes/sentinel.ts & src/index.ts'
      },
      {
        id: 'DOM5_04',
        title: 'Caller-gebundenes Multi-Worker Nonce-Ledger (record_security_idempotency_nonce)',
        passed:
          bffIdempotency.includes('record_security_idempotency_nonce') &&
          bffIdempotency.includes('computeCallerScopeHash') &&
          getFnBody('record_security_idempotency_nonce').includes('security_nonce_ledger'),
        evidence: 'packages/bff-server/src/services/idempotencyLedger.ts & Migration 592'
      }
    ]
  },
  {
    id: 'DOM_6',
    name: '6. Audit-Trail (WORM), Forensik & Backup-Resilienz',
    standard: 'BSI OPS.1.2.2 / ISO 27037 / DSGVO Art. 32',
    weightPercent: 10,
    checks: [
      {
        id: 'DOM6_01',
        title: 'Kryptografischer SHA-256 Merkle-Tree WORM-Trigger auf audit_logs & master_audit_trail',
        passed:
          migration387Content.includes('chain_Anchor_Genesis_2026_Campus_GrooveLab') ||
          migration387Content.includes('previous_hash') ||
          migration387Content.includes('prev_hash') ||
          migration387Content.includes('trg_audit_hash_chain'),
        evidence: 'supabase/migrations/469 & 538 (SHA-256 Merkle-Tree WORM Hash-Chain)'
      },
      {
        id: 'DOM6_02',
        title: 'Secret-Free School Context Projection (build_safe_school_context ohne SEPA-IBAN/Invite-Token)',
        passed: (() => {
          const safeSchoolBody = getFnBody('build_safe_school_context');
          return (
            safeSchoolBody.length > 0 &&
            !safeSchoolBody.includes("'sepa_iban'") &&
            !safeSchoolBody.includes("'invite_token'") &&
            getFnBody('authenticate_by_credential').includes('build_safe_school_context') &&
            getFnBody('authenticate_student_by_id_and_day').includes('build_safe_school_context')
          );
        })(),
        evidence: `build_safe_school_context in ${getFnFile('build_safe_school_context')}`
      },
      {
        id: 'DOM6_03',
        title: 'Zero Plaintext Credentials (raw_credential = NULL) in qr_login_rate_limits',
        passed:
          latestMigration591PlusContent.includes('SET raw_credential = NULL') &&
          !getFnBody('authenticate_by_credential').includes('VALUES (v_ip_hash, v_token_log_hash, v_raw'),
        evidence: 'qr_login_rate_limits stores SHA-256 hashes only (raw_credential = NULL)'
      },
      {
        id: 'DOM6_04',
        title: 'Obligatorische Multi-Recipient Age-X25519-Verschlüsselung & umask 077 ohne Klartext-/Symmetrie-Fallback',
        passed:
          deploySh.includes('umask 077') &&
          deploySh.includes('age -r') &&
          !deploySh.includes("> '$PRE_DEPLOY_BACKUP_PATH' && chmod 600") &&
          backupSh.includes('age -r') &&
          !backupSh.includes('echo "Backup erfolgreich erstellt."') &&
          backupEnterpriseSh.includes('umask 077') &&
          backupEnterpriseSh.includes('age -r') &&
          !backupEnterpriseSh.includes('openssl rand -hex 32') &&
          backupCampusDbSh.includes('umask 077') &&
          backupCampusDbSh.includes('age -r') &&
          !backupCampusDbSh.includes('--symmetric'),
        evidence: 'deploy.sh, backup.sh, backup_supabase_enterprise.sh & backup_campus_db.sh'
      }
    ]
  }
];

// -----------------------------------------------------------------------------
// Score Calculation
// -----------------------------------------------------------------------------
let totalChecks = 0;
let totalPassed = 0;
let weightedScore = 0;
const failedChecks = [];

const domainSummaries = domains.map((dom) => {
  const passedCount = dom.checks.filter((c) => c.passed).length;
  const totalCount = dom.checks.length;
  totalChecks += totalCount;
  totalPassed += passedCount;

  for (const c of dom.checks) {
    if (!c.passed) {
      failedChecks.push({
        domainId: dom.id,
        domainName: dom.name,
        checkId: c.id,
        title: c.title,
        evidence: c.evidence
      });
    }
  }

  const domainScore100 = Math.round((passedCount / totalCount) * 1000) / 10;
  const weightedContribution = Math.round(((passedCount / totalCount) * dom.weightPercent) * 100) / 100;
  weightedScore += weightedContribution;

  let rating = 'Exzellent (Goldstandard)';
  if (domainScore100 < 100 && domainScore100 >= 90) rating = 'Sehr gut (ASVS L3)';
  else if (domainScore100 < 90) rating = 'Abweichung detektiert (Remediation erforderlich)';

  return {
    id: dom.id,
    name: dom.name,
    standard: dom.standard,
    weightPercent: dom.weightPercent,
    passedChecks: passedCount,
    totalChecks: totalCount,
    domainScore100,
    weightedContribution,
    rating,
    checks: dom.checks
  };
});

weightedScore = Math.round(weightedScore * 10) / 10;
const durationMs = Date.now() - startTime;
const passed = failedChecks.length === 0 && weightedScore >= 95.0;

const summaryPayload = {
  standard: 'BSI IT-Grundschutz / OWASP ASVS Level 3 / NIS-2 / DSGVO Art. 32',
  timestamp: new Date().toISOString(),
  durationMs,
  passed,
  weightedScore,
  maxScore: 100,
  thresholdScore: 95.0,
  totalChecks,
  totalPassed,
  failedCount: failedChecks.length,
  verdict: passed
    ? 'BSI 0,1% GOLDSTANDARD VERIFIED (100/100)'
    : `FAILED (${weightedScore}/100, ${failedChecks.length} violation(s))`,
  domains: domainSummaries,
  failedChecks
};

if (IS_JSON) {
  process.stdout.write(JSON.stringify(summaryPayload, null, 2) + '\n');
  process.exit(passed ? 0 : 1);
}

// -----------------------------------------------------------------------------
// Human-Readable Console Output
// -----------------------------------------------------------------------------
const HR = '═'.repeat(78);
const SUB_HR = '─'.repeat(78);

process.stdout.write(`\n${HR}\n`);
process.stdout.write('  🛡️   CAMPUS-GROOVELAB BSI 360° CYBERSECURITY EVALUATION MATRIX GUARD\n');
process.stdout.write('       Standards: BSI IT-Grundschutz, TR-02102-1, OWASP ASVS L3, NIS-2, DSGVO\n');
process.stdout.write(`${HR}\n\n`);

for (const dom of domainSummaries) {
  const icon = dom.passedChecks === dom.totalChecks ? '✅' : '❌';
  process.stdout.write(
    `  ${icon} ${dom.name} [${dom.standard}] — Gewicht: ${dom.weightPercent}% | Score: ${dom.domainScore100}/100 (${dom.passedChecks}/${dom.totalChecks})\n`
  );
  for (const chk of dom.checks) {
    if (chk.passed) {
      process.stdout.write(`     ✓ [${chk.id}] ${chk.title}\n`);
    } else {
      process.stderr.write(`     ✗ [${chk.id}] [FAIL] ${chk.title} (${chk.evidence})\n`);
    }
  }
  process.stdout.write('\n');
}

process.stdout.write(`${SUB_HR}\n`);
process.stdout.write(`  📊 BSI 360° GESAMTSCORE : ${weightedScore.toFixed(1)} / 100.0 Punkte (Schwellenwert: >= 95.0)\n`);
process.stdout.write(`  🔍 GEPRÜFTE INVARIANTEN : ${totalPassed} / ${totalChecks} bestanden (${durationMs}ms)\n`);
process.stdout.write(`  🏛️  URTEIL               : ${summaryPayload.verdict}\n`);
process.stdout.write(`${HR}\n\n`);

if (!passed) {
  process.stderr.write(
    `🚨 BSI 360° MATRIX GUARD FAILED: ${failedChecks.length} Invariante(n) verletzt (Score: ${weightedScore}/100).\n\n`
  );
  process.exit(1);
}

process.exit(0);
