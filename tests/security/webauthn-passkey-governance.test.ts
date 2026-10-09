import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  webauthnChallengeSchema,
  webauthnRegistrationSchema,
  webauthnAuthenticationSchema,
  webauthnRevocationSchema,
} from '../../packages/bff-server/src/schemas/ingressSchemas.js';

describe('🛡️ Hebel 15: WebAuthn FIDO2 Passkey Hardware Citadel & Credential Store Harmonization (SEC-114 / CAM-150)', () => {
  const rootDir = process.cwd();
  const migration553Path = path.join(
    rootDir,
    'supabase/migrations/553_enterprise_webauthn_passkey_citadel.sql'
  );
  assert.ok(fs.existsSync(migration553Path), 'Migration 553 must exist');
  const migration553Sql = fs.readFileSync(migration553Path, 'utf8');

  // ── 1. SCHEMA & STORE HARMONIZATION ──
  describe('1. Schema & Store Harmonization (private_auth & public.user_credentials)', () => {
    it('creates private_auth.webauthn_credentials with strict typed columns', () => {
      assert.match(
        migration553Sql,
        /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+private_auth\.webauthn_credentials/i,
        'Must create private_auth.webauthn_credentials'
      );
      assert.match(
        migration552Sql,
        /credential_id\s+TEXT\s+UNIQUE\s+NOT\s+NULL/i,
        'credential_id must be UNIQUE NOT NULL'
      );
      assert.match(
        migration552Sql,
        /sign_count\s+BIGINT\s+DEFAULT\s+0\s+NOT\s+NULL/i,
        'sign_count must exist for cloned authenticator defense'
      );
      assert.match(
        migration552Sql,
        /is_active\s+BOOLEAN\s+DEFAULT\s+TRUE\s+NOT\s+NULL/i,
        'is_active flag must exist'
      );
      assert.match(
        migration552Sql,
        /last_used_at\s+TIMESTAMPTZ/i,
        'last_used_at timestamp must exist'
      );
    });

    it('ensures backward-compatibility columns on public.user_credentials', () => {
      assert.match(
        migration552Sql,
        /ALTER\s+TABLE\s+public\.user_credentials\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+is_active/i,
        'Must add is_active to public.user_credentials'
      );
      assert.match(
        migration552Sql,
        /ALTER\s+TABLE\s+public\.user_credentials\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+sign_count/i,
        'Must add sign_count to public.user_credentials'
      );
      assert.match(
        migration552Sql,
        /ALTER\s+TABLE\s+public\.user_credentials\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+last_used_at/i,
        'Must add last_used_at to public.user_credentials'
      );
    });

    it('backfills legacy credentials from public.user_credentials to private_auth.webauthn_credentials', () => {
      assert.match(
        migration552Sql,
        /INSERT\s+INTO\s+private_auth\.webauthn_credentials/i,
        'Must backfill into private_auth'
      );
      assert.match(
        migration552Sql,
        /FROM\s+public\.user_credentials\s+uc/i,
        'Must select from legacy public.user_credentials'
      );
      assert.match(
        migration552Sql,
        /ON\s+CONFLICT\s+\(credential_id\)\s+DO\s+UPDATE/i,
        'Must be idempotent with ON CONFLICT'
      );
    });
  });

  // ── 2. CHALLENGE NONCE GENERATION ──
  describe('2. Cryptographic Nonce Generation (generate_webauthn_challenge)', () => {
    it('generates 32-byte cryptographic random challenge with 5-minute TTL', () => {
      assert.match(
        migration552Sql,
        /encode\(extensions\.gen_random_bytes\(32\),\s*'hex'\)/i,
        'Must generate 32-byte (256-bit) cryptographically strong random hex nonce'
      );
      assert.match(
        migration552Sql,
        /NOW\(\)\s*\+\s*INTERVAL\s*'5\s+minutes'/i,
        'Must enforce 5-minute maximum challenge TTL'
      );
    });

    it('purges expired nonces before issuing new challenge', () => {
      assert.match(
        migration552Sql,
        /DELETE\s+FROM\s+private_auth\.webauthn_challenges\s+WHERE\s+expires_at\s*<\s*NOW\(\)/i,
        'Must automatically sweep expired nonces'
      );
    });
  });

  // ── 3. REGISTRATION RPC GOVERNANCE ──
  describe('3. Registration RPC Governance (register_webauthn_credential)', () => {
    it('verifies caller ownership or master admin authorization', () => {
      assert.match(
        migration552Sql,
        /public\.is_master_admin\(\)/i,
        'Must allow master admin override'
      );
      assert.match(
        migration552Sql,
        /v_caller_id\s*=\s*p_user_id/i,
        'Must strictly check caller ownership against target user_id'
      );
      assert.match(
        migration552Sql,
        /UNAUTHORIZED_PASSKEY_REGISTRATION/,
        'Must fail closed with UNAUTHORIZED_PASSKEY_REGISTRATION'
      );
    });

    it('atomically verifies and consumes registration challenge', () => {
      assert.match(
        migration552Sql,
        /FROM\s+private_auth\.webauthn_challenges[\s\S]*?FOR\s+UPDATE/i,
        'Must lock challenge row FOR UPDATE'
      );
      assert.match(
        migration552Sql,
        /DELETE\s+FROM\s+private_auth\.webauthn_challenges\s+WHERE\s+id\s*=\s*v_chal_record\.id/i,
        'Must immediately delete challenge to prevent reuse'
      );
    });

    it('synchronously persists in both private_auth and public.user_credentials', () => {
      assert.match(
        migration552Sql,
        /INSERT\s+INTO\s+private_auth\.webauthn_credentials/i,
        'Must insert into private_auth'
      );
      assert.match(
        migration552Sql,
        /INSERT\s+INTO\s+public\.user_credentials/i,
        'Must dual-persist into public.user_credentials'
      );
    });

    it('creates an immutable audit log entry upon registration', () => {
      assert.match(
        migration552Sql,
        /INSERT\s+INTO\s+public\.audit_logs[\s\S]*?'REGISTER_PASSKEY'/i,
        'Must log REGISTER_PASSKEY in audit_logs'
      );
    });
  });

  // ── 4. AUTHENTICATION RPC GOVERNANCE ──
  describe('4. Authentication RPC Governance (authenticate_webauthn_credential)', () => {
    it('atomically locks and consumes challenge via FOR UPDATE', () => {
      assert.match(
        migration552Sql,
        /FROM\s+private_auth\.webauthn_challenges[\s\S]*?WHERE\s+challenge\s*=\s*v_clean_chal[\s\S]*?FOR\s+UPDATE/i,
        'Must lock auth challenge row FOR UPDATE'
      );
      assert.match(
        migration552Sql,
        /DELETE\s+FROM\s+private_auth\.webauthn_challenges\s+WHERE\s+id\s*=\s*v_challenge_record\.id/i,
        'Must delete challenge on consumption for replay protection'
      );
    });

    it('looks up credential with active check and fallback', () => {
      assert.match(
        migration552Sql,
        /FROM\s+private_auth\.webauthn_credentials[\s\S]*?WHERE\s+credential_id\s*=\s*v_clean_cred\s+AND\s+is_active\s*=\s*TRUE/i,
        'Must query private_auth.webauthn_credentials with is_active = TRUE'
      );
      assert.match(
        migration552Sql,
        /FROM\s+public\.user_credentials[\s\S]*?WHERE\s+credential_id\s*=\s*v_clean_cred/i,
        'Must have resilient fallback to public.user_credentials'
      );
    });

    it('enforces lockout defense (pin_locked_until)', () => {
      assert.match(
        migration552Sql,
        /v_user\.pin_locked_until\s*>\s*NOW\(\)/i,
        'Must check pin_locked_until'
      );
      assert.match(
        migration552Sql,
        /Sicherheitssperre:\s*Zu\s*viele\s*Fehlversuche/i,
        'Must return lockout error message'
      );
    });

    it('enforces cloned authenticator defense by incrementing sign_count and counter', () => {
      assert.match(
        migration552Sql,
        /sign_count\s*=\s*sign_count\s*\+\s*1/i,
        'Must increment sign_count'
      );
      assert.match(
        migration552Sql,
        /counter\s*=\s*counter\s*\+\s*1/i,
        'Must increment counter'
      );
      assert.match(
        migration552Sql,
        /last_used_at\s*=\s*NOW\(\)/i,
        'Must update last_used_at'
      );
    });

    it('enforces multi-tenant isolation and active user verification', () => {
      assert.match(
        migration552Sql,
        /\(p_school_id\s+IS\s+NULL\s+OR\s+school_id\s*=\s*p_school_id\s+OR\s+is_master_admin\s*=\s*TRUE\)/i,
        'Must enforce school_id matching or master admin override'
      );
    });

    it('issues verified 30-day session lease and redacts student last_name (DSGVO Art. 8 & 9)', () => {
      assert.match(
        migration552Sql,
        /INSERT\s+INTO\s+public\.session_leases/i,
        'Must issue session_leases record'
      );
      assert.match(
        migration552Sql,
        /'last_name',\s*CASE\s+WHEN\s+v_user\.role\s*=\s*'student'\s+THEN\s+NULL\s+ELSE\s+v_user\.last_name\s+END/i,
        'Must strictly redact student last_name per KUG § 22 and DSGVO'
      );
    });

    it('logs AUTH_PASSKEY in audit_logs', () => {
      assert.match(
        migration552Sql,
        /'webauthn_credentials',\s*'AUTH_PASSKEY'/i,
        'Must log AUTH_PASSKEY in public.audit_logs'
      );
    });
  });

  // ── 5. REVOCATION RPC GOVERNANCE ──
  describe('5. Passkey Revocation & Multi-Device Session Purge (revoke_user_passkeys)', () => {
    it('deactivates credentials and invalidates active session leases', () => {
      assert.match(
        migration552Sql,
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.revoke_user_passkeys/i,
        'Must declare revoke_user_passkeys function'
      );
      assert.match(
        migration552Sql,
        /UPDATE\s+private_auth\.webauthn_credentials\s+SET\s+is_active\s*=\s*FALSE/i,
        'Must deactivate passkeys in private_auth'
      );
      assert.match(
        migration552Sql,
        /UPDATE\s+public\.session_leases\s+SET\s+is_revoked\s*=\s*TRUE/i,
        'Must revoke all session leases for target user'
      );
      assert.match(
        migration552Sql,
        /token_version\s*=\s*COALESCE\(token_version,\s*1\)\s*\+\s*1/i,
        'Must increment token_version for instant JWT invalidation'
      );
      assert.match(
        migration552Sql,
        /sessions_revoked_at\s*=\s*timezone\('utc'::text,\s*now\(\)\)/i,
        'Must stamp sessions_revoked_at'
      );
    });

    it('enforces strict role-based authorization on revocation', () => {
      assert.match(
        migration552Sql,
        /UNAUTHORIZED_REVOCATION/i,
        'Must fail-closed with UNAUTHORIZED_REVOCATION'
      );
    });
  });

  // ── 6. BFF SERVER ZOD INGRESS SCHEMAS ──
  describe('6. BFF Ingress Schemas (Zod Validation & Anti-Pollution)', () => {
    it('validates webauthnChallengeSchema correctly', () => {
      const valid = webauthnChallengeSchema.parse({
        userId: '11111111-1111-1111-1111-111111111111',
        type: 'auth',
      });
      assert.strictEqual(valid.type, 'auth');

      // Default type is 'auth'
      const defaultValid = webauthnChallengeSchema.parse({});
      assert.strictEqual(defaultValid.type, 'auth');

      // Rejects invalid UUID
      assert.throws(() => {
        webauthnChallengeSchema.parse({ userId: 'not-a-uuid' });
      });

      // Rejects prototype pollution / extra fields
      assert.throws(() => {
        webauthnChallengeSchema.parse({ __proto__: { admin: true } });
      });
    });

    it('validates webauthnRegistrationSchema and enforces bounds', () => {
      const validPayload = {
        userId: '22222222-2222-2222-2222-222222222222',
        credentialId: 'cred_id_minimum_16_characters_here',
        publicKey: 'public_key_minimum_16_characters_content',
        deviceName: 'MacBook TouchID',
        challenge: 'a'.repeat(64),
      };
      const result = webauthnRegistrationSchema.parse(validPayload);
      assert.strictEqual(result.deviceName, 'MacBook TouchID');

      // Rejects short credentialId (< 16 chars)
      assert.throws(() => {
        webauthnRegistrationSchema.parse({ ...validPayload, credentialId: 'short' });
      });

      // Rejects short challenge (< 32 chars)
      assert.throws(() => {
        webauthnRegistrationSchema.parse({ ...validPayload, challenge: 'short_chal' });
      });

      // Rejects unexpected injected fields (.strict())
      assert.throws(() => {
        webauthnRegistrationSchema.parse({ ...validPayload, injectedField: 'malicious' });
      });
    });

    it('validates webauthnAuthenticationSchema and bounds', () => {
      const validPayload = {
        credentialId: 'cred_id_minimum_16_characters_here',
        challenge: 'b'.repeat(64),
        schoolId: '33333333-3333-3333-3333-333333333333',
      };
      const result = webauthnAuthenticationSchema.parse(validPayload);
      assert.strictEqual(result.schoolId, '33333333-3333-3333-3333-333333333333');

      // Allows optional / null schoolId
      const nullSchool = webauthnAuthenticationSchema.parse({
        credentialId: 'cred_id_minimum_16_characters_here',
        challenge: 'b'.repeat(64),
        schoolId: null,
      });
      assert.strictEqual(nullSchool.schoolId, null);

      // Rejects short credentialId
      assert.throws(() => {
        webauthnAuthenticationSchema.parse({
          credentialId: 'too_short',
          challenge: 'b'.repeat(64),
        });
      });
    });

    it('validates webauthnRevocationSchema', () => {
      const valid = webauthnRevocationSchema.parse({
        targetUserId: '44444444-4444-4444-4444-444444444444',
      });
      assert.strictEqual(valid.targetUserId, '44444444-4444-4444-4444-444444444444');

      assert.throws(() => {
        webauthnRevocationSchema.parse({ targetUserId: 'invalid-id' });
      });
    });
  });

  // ── 7. FRONTEND CLIENT UTILITY INTEGRATION ──
  describe('7. Frontend Client Utility Integration (webauthn.ts)', () => {
    it('exports revokeUserPasskeysAuthoritative with clean typing', () => {
      const webauthnTsPath = path.join(rootDir, 'apps/groovelab/src/utils/webauthn.ts');
      const webauthnTs = fs.readFileSync(webauthnTsPath, 'utf8');

      assert.match(
        webauthnTs,
        /export\s+const\s+revokeUserPasskeysAuthoritative\s*=/i,
        'Must export revokeUserPasskeysAuthoritative'
      );
      assert.match(
        webauthnTs,
        /supabase\.rpc\('revoke_user_passkeys'/i,
        'Must call revoke_user_passkeys RPC'
      );
    });
  });
});
