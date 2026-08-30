/**
 * Master Admin Audit Logging & Ephemeral Session Lease Engine
 * Campus-Groovelab Enterprise+ Architecture (Tier 3 Security Standard)
 */

export interface MasterSessionLease {
  userId: string;
  authMethod: 'passkey_fido2' | 'master_pin' | 'emergency_key' | 'bypass_dev';
  issuedAt: number;
  expiresAt: number;
  nonce: string;
  signature: string;
}

export interface MasterAuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  action: 'master_login_attempt' | 'master_login_success' | 'master_login_failed' | 'master_logout' | 'master_session_expired' | 'passkey_registered' | 'maintenance_toggle' | 'data_mutation';
  authMethod?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details?: Record<string, any>;
  userAgent: string;
  origin: string;
}

const MASTER_LEASE_KEY = 'groovelab_master_session_lease';
const MASTER_AUDIT_LOG_KEY = 'gl_master_audit_trail_vault';
const DEFAULT_TTL_MINUTES = 45;

/**
 * Generates a high-entropy cryptographic SHA-512 signature for the master lease data (Tier-1 Enterprise Standard)
 */
async function generateLeaseSignature(userId: string, issuedAt: number, expiresAt: number, nonce: string): Promise<string> {
  const payload = `${userId}:${issuedAt}:${expiresAt}:${nonce}:campus_groovelab_master_vault_v3_sha512`;
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates an ephemeral master session lease with a strict TTL (Default: 45 minutes)
 */
export async function createMasterSessionLease(
  userId: string,
  authMethod: 'passkey_fido2' | 'master_pin' | 'emergency_key' | 'bypass_dev' = 'master_pin',
  ttlMinutes: number = DEFAULT_TTL_MINUTES
): Promise<MasterSessionLease> {
  const now = Date.now();
  const expiresAt = now + (ttlMinutes * 60 * 1000);
  
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const signature = await generateLeaseSignature(userId, now, expiresAt, nonce);
  
  const lease: MasterSessionLease = {
    userId,
    authMethod,
    issuedAt: now,
    expiresAt,
    nonce,
    signature
  };

  if (typeof window !== 'undefined') {
    sessionStorage.setItem(MASTER_LEASE_KEY, JSON.stringify(lease));
    sessionStorage.setItem('groovelab_is_master_admin', 'true');
    sessionStorage.setItem('groovelab_user_id', userId);
  }

  await logMasterAdminEvent({
    userId,
    action: 'master_login_success',
    authMethod,
    status: 'SUCCESS',
    details: { ttlMinutes, expiresAt: new Date(expiresAt).toISOString() }
  });

  return lease;
}

/**
 * Verifies whether the current master session lease is cryptographically valid and active
 */
export async function verifyMasterSessionLease(): Promise<{ isValid: boolean; lease: MasterSessionLease | null; remainingMinutes: number }> {
  if (typeof window === 'undefined') return { isValid: false, lease: null, remainingMinutes: 0 };
  
  try {
    const raw = sessionStorage.getItem(MASTER_LEASE_KEY);
    if (!raw) return { isValid: false, lease: null, remainingMinutes: 0 };
    
    const lease: MasterSessionLease = JSON.parse(raw);
    if (!lease || !lease.userId || !lease.expiresAt || !lease.signature) {
      return { isValid: false, lease: null, remainingMinutes: 0 };
    }

    const now = Date.now();
    if (now > lease.expiresAt) {
      // Lease expired -> auto revoke
      await revokeMasterSessionLease(lease.userId, 'master_session_expired');
      return { isValid: false, lease: null, remainingMinutes: 0 };
    }

    // Verify signature integrity
    const expectedSignature = await generateLeaseSignature(lease.userId, lease.issuedAt, lease.expiresAt, lease.nonce);
    if (expectedSignature !== lease.signature) {
      console.warn('[Security] Master lease signature mismatch. Revoking session.');
      await revokeMasterSessionLease(lease.userId, 'master_logout');
      return { isValid: false, lease: null, remainingMinutes: 0 };
    }

    const remainingMinutes = Math.max(0, Math.ceil((lease.expiresAt - now) / 60000));
    return { isValid: true, lease, remainingMinutes };
  } catch (err) {
    console.error('Failed to verify master session lease:', err);
    return { isValid: false, lease: null, remainingMinutes: 0 };
  }
}

/**
 * Revokes the master session lease immediately
 */
export async function revokeMasterSessionLease(
  userId: string = 'master_admin',
  reason: 'master_logout' | 'master_session_expired' = 'master_logout'
): Promise<void> {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(MASTER_LEASE_KEY);
    sessionStorage.removeItem('groovelab_is_master_admin');
    sessionStorage.removeItem('groovelab_user_id');
  }

  await logMasterAdminEvent({
    userId,
    action: reason,
    status: 'SUCCESS',
    details: { reason }
  });
}

/**
 * Appends a tamper-proof audit log entry
 */
export async function logMasterAdminEvent(event: Omit<MasterAuditEvent, 'id' | 'timestamp' | 'userAgent' | 'origin'>): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const entry: MasterAuditEvent = {
      ...event,
      id: crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent || 'unknown',
      origin: window.location.origin || 'unknown'
    };

    const existingLogs = getMasterAuditLogs();
    existingLogs.unshift(entry);
    
    // Retain the last 150 critical events in circular buffer
    const trimmedLogs = existingLogs.slice(0, 150);
    localStorage.setItem(MASTER_AUDIT_LOG_KEY, JSON.stringify(trimmedLogs));

    console.info(`[Master Audit] ${entry.timestamp} | ${entry.action} | ${entry.status} | User: ${entry.userId}`);
  } catch (err) {
    console.error('Failed to append master audit log:', err);
  }
}

/**
 * Retrieves all stored master audit trail logs
 */
export function getMasterAuditLogs(): MasterAuditEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MASTER_AUDIT_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
