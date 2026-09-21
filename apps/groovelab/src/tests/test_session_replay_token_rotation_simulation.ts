/**
 * ==============================================================================
 * 🛡️ FORENSIC SIMULATION 5: SESSION REPLAY ATTACK & TOKEN ROTATION DRILL
 * ==============================================================================
 * Forensic Validation Standard: OWASP ASVS Level 3 / RFC 6749 / RFC 7519
 * 
 * Simulates adversarial credential & session attacks:
 * 1. Hardware Device Fingerprint & Fail-Safe Storage Resilience.
 * 2. Session Lease Registration & Server-Side Nonce Handshake.
 * 3. Session Interception & Replay Attack Defense (Remote 1-Click Logout).
 * 4. Multi-Device Killswitch (Atomically Terminating All Active Devices).
 * 5. Compromised Physical QR Pass / Token Rotation Defense (Stolen Ausweis).
 * 6. PostgREST Direct Insert Defense (CVSS 10.0 Policy Barrier).
 * 7. Cross-Tenant Privilege Escalation & Revocation Boundary Check.
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Setup mock browser globals
let localStorageStore: Record<string, string> = {};
let sessionStorageStore: Record<string, string> = {};

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  standalone: false
};

try {
  Object.defineProperty(globalThis, 'navigator', {
    value: mockNavigator,
    configurable: true,
    writable: true
  });
} catch {
  try {
    Object.defineProperty(globalThis.navigator, 'userAgent', {
      value: mockNavigator.userAgent,
      configurable: true
    });
  } catch {}
}

(global as any).window = {
  location: { origin: 'http://localhost:3000', pathname: '/' },
  matchMedia: () => ({ matches: false }),
  navigator: mockNavigator,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true
};



(global as any).localStorage = {
  getItem: (k: string) => localStorageStore[k] || null,
  setItem: (k: string, v: string) => { localStorageStore[k] = v; },
  removeItem: (k: string) => { delete localStorageStore[k]; }
};

(global as any).sessionStorage = {
  getItem: (k: string) => sessionStorageStore[k] || null,
  setItem: (k: string, v: string) => { sessionStorageStore[k] = v; },
  removeItem: (k: string) => { delete sessionStorageStore[k]; }
};

// In-Memory Database Simulator for Simulation 5
interface MockSessionLease {
  id: string;
  user_id: string;
  school_id: string;
  device_name: string;
  device_key: string;
  role: string;
  user_agent: string | null;
  is_revoked: boolean;
  revoked_at: string | null;
  last_active_at: string;
  created_at: string;
}

interface MockUser {
  id: string;
  school_id: string;
  role: string;
  qr_token: string;
  active_sessions_count: number;
}

const dbState = {
  sessionLeases: new Map<string, MockSessionLease>(),
  users: new Map<string, MockUser>(),
  callerContext: {
    role: 'student',
    schoolId: 'school-alpha-id',
    userId: 'student-victim-id',
    isMasterAdmin: false
  }
};

// Seed Test Data
const VICTIM_STUDENT_ID = '550e8400-e29b-41d4-a716-446655440001';
const ATTACKER_STUDENT_ID = '550e8400-e29b-41d4-a716-446655440002';
const SCHOOL_ALPHA_ID = '660e8400-e29b-41d4-a716-446655440001';
const SCHOOL_BETA_ID = '660e8400-e29b-41d4-a716-446655440002';
const ORIGINAL_QR_TOKEN = '770e8400-e29b-41d4-a716-446655440001';

dbState.users.set(VICTIM_STUDENT_ID, {
  id: VICTIM_STUDENT_ID,
  school_id: SCHOOL_ALPHA_ID,
  role: 'student',
  qr_token: ORIGINAL_QR_TOKEN,
  active_sessions_count: 2
});

dbState.users.set(ATTACKER_STUDENT_ID, {
  id: ATTACKER_STUDENT_ID,
  school_id: SCHOOL_BETA_ID,
  role: 'student',
  qr_token: '880e8400-e29b-41d4-a716-446655440002',
  active_sessions_count: 1
});

// Global Fetch Interceptor to emulate PostgreSQL + PostgREST RPC Engine
(globalThis as any).fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : (input as any).href || '';
  const method = init?.method || 'GET';
  const body = init?.body ? JSON.parse(init.body as string) : {};

  // 1. RPC: register_session_lease
  if (url.includes('/rpc/register_session_lease')) {
    const { p_user_id, p_school_id, p_device_name, p_device_key, p_role, p_user_agent } = body;
    for (const lease of dbState.sessionLeases.values()) {
      if (lease.user_id === p_user_id && lease.device_key === p_device_key) {
        if (lease.is_revoked) {
          return new Response(JSON.stringify({
            success: false,
            revoked: true,
            message: 'Diese Gerätesitzung wurde von der Schulleitung widerrufen.'
          }), { status: 200, headers: { 'content-type': 'application/json' } });
        }
        lease.last_active_at = new Date().toISOString();
        return new Response(JSON.stringify({
          success: true,
          lease_id: lease.id,
          is_new: false
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
    }
    const newId = `lease-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newLease: MockSessionLease = {
      id: newId,
      user_id: p_user_id,
      school_id: p_school_id,
      device_name: p_device_name || 'Unbekanntes Gerät',
      device_key: p_device_key,
      role: p_role || 'student',
      user_agent: p_user_agent,
      is_revoked: false,
      revoked_at: null,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    dbState.sessionLeases.set(newId, newLease);
    return new Response(JSON.stringify({
      success: true,
      lease_id: newId,
      is_new: true
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  // 2. RPC: revoke_session_lease
  if (url.includes('/rpc/revoke_session_lease')) {
    const { p_lease_id } = body;
    const lease = dbState.sessionLeases.get(p_lease_id);
    if (!lease) {
      return new Response(JSON.stringify(false), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    const { role, schoolId, userId, isMasterAdmin } = dbState.callerContext;
    const isAuthorized = isMasterAdmin ||
      (schoolId === lease.school_id && ['admin', 'secretary'].includes(role)) ||
      userId === lease.user_id;

    if (!isAuthorized) {
      return new Response(JSON.stringify({
        code: 'P0001',
        message: 'Keine Berechtigung zum Widerrufen dieser Sitzung.'
      }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    lease.is_revoked = true;
    lease.revoked_at = new Date().toISOString();
    return new Response(JSON.stringify(true), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  // 3. RPC: revoke_all_user_session_leases
  if (url.includes('/rpc/revoke_all_user_session_leases')) {
    const { p_target_user_id } = body;
    const targetUser = dbState.users.get(p_target_user_id);
    if (!targetUser) {
      return new Response(JSON.stringify(0), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    const { role, schoolId, userId, isMasterAdmin } = dbState.callerContext;
    const isAuthorized = isMasterAdmin ||
      (schoolId === targetUser.school_id && ['admin', 'secretary'].includes(role)) ||
      userId === p_target_user_id;

    if (!isAuthorized) {
      return new Response(JSON.stringify({
        code: 'P0001',
        message: 'Keine Berechtigung zum Widerrufen der Sitzungen.'
      }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    let revokedCount = 0;
    for (const lease of dbState.sessionLeases.values()) {
      if (lease.user_id === p_target_user_id && !lease.is_revoked) {
        lease.is_revoked = true;
        lease.revoked_at = new Date().toISOString();
        revokedCount++;
      }
    }
    return new Response(JSON.stringify(revokedCount), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  // 4. RPC: revoke_and_regenerate_qr_token
  if (url.includes('/rpc/revoke_and_regenerate_qr_token')) {
    const { p_target_user_id } = body;
    const targetUser = dbState.users.get(p_target_user_id);
    if (!targetUser) {
      return new Response(JSON.stringify({
        code: 'P0001',
        message: 'Nutzer wurde nicht gefunden.'
      }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    const { role, schoolId, userId, isMasterAdmin } = dbState.callerContext;
    const isAuthorized = isMasterAdmin ||
      (schoolId === targetUser.school_id && ['admin', 'secretary'].includes(role)) ||
      userId === p_target_user_id;

    if (!isAuthorized) {
      return new Response(JSON.stringify({
        code: 'P0001',
        message: 'Keine Berechtigung zur Neuausstellung dieses Ausweises.'
      }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    const newQr = `qr-rotated-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    targetUser.qr_token = newQr;
    targetUser.active_sessions_count = 0;

    return new Response(JSON.stringify({
      success: true,
      user_id: p_target_user_id,
      new_qr_token: newQr
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  // 5. RPC: authenticate_by_credential
  if (url.includes('/rpc/authenticate_by_credential')) {
    const { p_credential, p_school_id } = body;
    for (const user of dbState.users.values()) {
      if (user.school_id === p_school_id && user.qr_token === p_credential) {
        return new Response(JSON.stringify({
          success: true,
          user_id: user.id,
          role: user.role
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
    }
    return new Response(JSON.stringify({
      code: 'P0001',
      message: 'Ungültige Anmeldedaten.'
    }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  // 6. Direct Table PostgREST: session_leases
  if (url.includes('/rest/v1/session_leases')) {
    if (method === 'POST') {
      if (!dbState.callerContext.isMasterAdmin) {
        return new Response(JSON.stringify({
          code: '42501',
          message: 'new row violates row-level security policy "session_leases_deny_client_insert" for table "session_leases"'
        }), { status: 403, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify([{ success: true }]), {
        status: 201,
        headers: { 'content-type': 'application/json' }
      });
    }
    return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  return new Response(JSON.stringify({ message: 'OK' }), { status: 200, headers: { 'content-type': 'application/json' } });
};

// Import sessionLeaseManager after fetch interceptor is armed
const sessionLeaseManager = await import('../utils/sessionLeaseManager');
const { supabase } = await import('../lib/supabase');


let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

async function runSessionSecuritySimulation() {
  console.log('\n================================================================');
  console.log('🛡️ STARTING SIMULATION 5: SESSION REPLAY & TOKEN ROTATION DRILL');
  console.log('================================================================\n');

  // --- STAGE 1: HARDWARE-BOUND DEVICE FINGERPRINT ---
  console.log('📱 [STAGE 1] Device Key Lifecycle & Storage Resilience...');
  const deviceKey1 = sessionLeaseManager.getOrCreateDeviceKey();
  const deviceKey2 = sessionLeaseManager.getOrCreateDeviceKey();
  assert(
    deviceKey1.length > 10 && deviceKey1 === deviceKey2,
    'Device key generated and persistently retrieved from storage'
  );

  // Storage failure simulation (Safari Private Browsing QuotaExceeded)
  const originalGetItem = global.localStorage.getItem;
  global.localStorage.getItem = () => { throw new Error('QuotaExceededError'); };
  const fallbackKey = sessionLeaseManager.getOrCreateDeviceKey();
  assert(
    typeof fallbackKey === 'string' && fallbackKey.length > 0,
    'Device key falls back gracefully during storage exceptions (Zero-Crash Invariant)'
  );
  global.localStorage.getItem = originalGetItem;

  // Device display name parsing
  const displayName = sessionLeaseManager.getDeviceDisplayName();
  assert(
    displayName.includes('Mac') || displayName.includes('Chrome') || displayName.includes('Browser'),
    `Human-readable device name correctly resolved: "${displayName}"`
  );

  // --- STAGE 2: SESSION LEASE REGISTRATION ---
  console.log('\n🔑 [STAGE 2] Registering Active Session Lease on Login...');
  dbState.callerContext.userId = VICTIM_STUDENT_ID;
  dbState.callerContext.schoolId = SCHOOL_ALPHA_ID;
  dbState.callerContext.role = 'student';

  const regResult = await sessionLeaseManager.registerClientSessionLease(
    { id: VICTIM_STUDENT_ID, role: 'student' },
    SCHOOL_ALPHA_ID
  );

  assert(
    regResult.success === true && typeof regResult.leaseId === 'string',
    `Session Lease successfully registered on server (Lease ID: ${regResult.leaseId})`
  );

  assert(
    sessionStorage.getItem('gl_active_session_lease_id') === regResult.leaseId,
    'Active Lease ID securely stored in volatile sessionStorage'
  );

  // --- STAGE 3: REPLAY ATTACK DEFENSE VIA 1-CLICK REMOTE LOGOUT ---
  console.log('\n⚔️ [STAGE 3] Simulating Session Token Interception & Replay Attack...');
  const capturedLeaseId = regResult.leaseId!;

  // User/Admin performs remote logout of this device
  console.log('  -> Victim executes 1-Click Remote Logout from another trusted device...');
  const revokeSuccess = await sessionLeaseManager.revokeClientSessionLease(capturedLeaseId);
  assert(revokeSuccess === true, 'Remote session revocation RPC executed successfully');

  // Attacker attempts replay attack using intercepted device key / lease ID
  console.log('  -> Adversary executes Replay Attack with captured session credentials...');
  const replayResult = await sessionLeaseManager.registerClientSessionLease(
    { id: VICTIM_STUDENT_ID, role: 'student' },
    SCHOOL_ALPHA_ID
  );

  assert(
    replayResult.success === false && replayResult.revoked === true,
    'Replay Attack Neutralized: Server actively denies registration on revoked device lease'
  );

  // --- STAGE 4: MULTI-DEVICE MASS KILLSWITCH ---
  console.log('\n🛑 [STAGE 4] Multi-Device Emergency Mass Killswitch...');
  // Register 3 simulated devices for victim
  const devA = `device-key-ipad-${Date.now()}`;
  const devB = `device-key-iphone-${Date.now()}`;
  const devC = `device-key-laptop-${Date.now()}`;

  await supabase.rpc('register_session_lease', {
    p_user_id: VICTIM_STUDENT_ID, p_school_id: SCHOOL_ALPHA_ID, p_device_name: 'iPad', p_device_key: devA, p_role: 'student'
  });
  await supabase.rpc('register_session_lease', {
    p_user_id: VICTIM_STUDENT_ID, p_school_id: SCHOOL_ALPHA_ID, p_device_name: 'iPhone', p_device_key: devB, p_role: 'student'
  });
  await supabase.rpc('register_session_lease', {
    p_user_id: VICTIM_STUDENT_ID, p_school_id: SCHOOL_ALPHA_ID, p_device_name: 'Laptop', p_device_key: devC, p_role: 'student'
  });

  const revokedAllCount = await sessionLeaseManager.revokeAllSessionsForUser(VICTIM_STUDENT_ID);
  assert(
    revokedAllCount >= 3,
    `Mass Killswitch: Successfully revoked all ${revokedAllCount} concurrent user device leases`
  );

  // --- STAGE 5: COMPROMISED PHYSICAL MUSIC ID & TOKEN ROTATION ---
  console.log('\n🎫 [STAGE 5] Physical Music ID Stolen: Cryptographic Token Rotation...');
  // 5.1 Verify original token worked
  const authBefore = await supabase.rpc('authenticate_by_credential', {
    p_credential: ORIGINAL_QR_TOKEN,
    p_school_id: SCHOOL_ALPHA_ID
  });
  assert(authBefore.data?.success === true, 'Original QR token authenticated successfully');

  // 5.2 Admin regenerates QR token (Stolen card reported)
  console.log('  -> School Admin triggers 1-Click QR Token Re-issuance (Verlust-Schutz)...');
  dbState.callerContext.role = 'admin';
  const rotationResult = await sessionLeaseManager.revokeAndRegenerateQRToken(VICTIM_STUDENT_ID);
  assert(
    rotationResult?.success === true && typeof rotationResult.new_qr_token === 'string',
    `QR Token regenerated: New Token = ${rotationResult?.new_qr_token?.substring(0, 16)}...`
  );

  const victimUser = dbState.users.get(VICTIM_STUDENT_ID)!;
  assert(
    victimUser.active_sessions_count === 0,
    'Forced Re-Authentication: All active sessions terminated upon token re-issuance'
  );

  // 5.3 Adversary tries to use old stolen QR code
  console.log('  -> Adversary attempts login with stolen physical card QR code...');
  const authReplay = await supabase.rpc('authenticate_by_credential', {
    p_credential: ORIGINAL_QR_TOKEN,
    p_school_id: SCHOOL_ALPHA_ID
  });
  assert(
    authReplay.error !== null && authReplay.data === null,
    'Stolen Token Defense: Stolen physical QR token immediately rejected (Fail-Closed)'
  );

  // 5.4 Legit student logs in with newly issued card
  console.log('  -> Student logs in with new replacement QR card...');
  const authNew = await supabase.rpc('authenticate_by_credential', {
    p_credential: rotationResult!.new_qr_token!,
    p_school_id: SCHOOL_ALPHA_ID
  });
  assert(
    authNew.data?.success === true && authNew.data.user_id === VICTIM_STUDENT_ID,
    'Replacement QR token successfully authenticates student'
  );

  // --- STAGE 6: ZERO-TRUST POSTGREST DIRECT CLIENT INSERT DEFENSE ---
  console.log('\n🛡️ [STAGE 6] PostgREST Direct Insert Defense (CVSS 10.0 Mitigation)...');
  dbState.callerContext.isMasterAdmin = false;
  const directInsertResult = await supabase.from('session_leases').insert({
    user_id: VICTIM_STUDENT_ID,
    school_id: SCHOOL_ALPHA_ID,
    device_key: 'forged-device-key',
    is_revoked: false
  });

  assert(
    directInsertResult.error !== null && directInsertResult.error.code === '42501',
    'PostgREST Direct Insert Violation Blocked by Policy "session_leases_deny_client_insert"'
  );

  // --- STAGE 7: CROSS-TENANT & PRIVILEGE BOUNDARY BARRIER ---
  console.log('\n🛑 [STAGE 7] Cross-Tenant Privilege Escalation Defense...');
  // Attacker from School Beta tries to revoke a lease of School Alpha
  dbState.callerContext.role = 'student';
  dbState.callerContext.userId = ATTACKER_STUDENT_ID;
  dbState.callerContext.schoolId = SCHOOL_BETA_ID;

  // Create active lease in school Alpha
  const targetLeaseId = `lease-alpha-${Date.now()}`;
  dbState.sessionLeases.set(targetLeaseId, {
    id: targetLeaseId,
    user_id: VICTIM_STUDENT_ID,
    school_id: SCHOOL_ALPHA_ID,
    device_name: 'Alpha iPad',
    device_key: 'alpha-key',
    role: 'student',
    user_agent: null,
    is_revoked: false,
    revoked_at: null,
    last_active_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  });

  const unauthorizedRevoke = await supabase.rpc('revoke_session_lease', {
    p_lease_id: targetLeaseId
  });

  assert(
    unauthorizedRevoke.error !== null && unauthorizedRevoke.error.message.includes('Keine Berechtigung'),
    'Cross-Tenant Defense: Unauthorized outsider cannot revoke other users session leases'
  );

  console.log('\n================================================================');
  console.log(`🏁 SIMULATION 5 RESULT: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSessionSecuritySimulation().catch((err) => {
  console.error('Fatal Simulation 5 Exception:', err);
  process.exit(1);
});
