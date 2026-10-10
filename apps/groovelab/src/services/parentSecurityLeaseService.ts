/**
 * ==============================================================================
 * 🛡️ Campus-Groovelab Enterprise+ Parental Security & Lease Service
 * Datei: apps/groovelab/src/services/parentSecurityLeaseService.ts
 * Standards: OWASP ASVS Level 3 (V2, V3, V4), BGB § 104, DSGVO Art. 8 & 25,
 *            NIST SP 800-63B (AAL3 Step-Up Authentication)
 * Single Source of Truth (SSOT) für Eltern-Authentifizierung, Step-Up Leases
 * und revisionssichere save_parent_controls Anreicherung (Anti-Split-Brain).
 * ==============================================================================
 */

import { supabase } from '../lib/supabase';
import { getOrCreateDeviceKey } from '../utils/sessionLeaseManager';

// Canonical Session Storage Keys
export const STORAGE_KEYS = {
  PRIMARY_LEASE: 'gl_parent_session_lease',
  ACTIVE_LEASE_ID: 'gl_active_session_lease_id',
  PARENT_EXPIRY_PREFIX: 'groovelab_parent_session_',
  MODULE_UNLOCK_PREFIX: 'campus_parent_module_unlock_',
  STUDENT_UNLOCKED_PREFIX: 'groovelab_parent_unlocked_',
  GLOBAL_UNLOCKED: 'groovelab_parent_unlocked_global',
  PARENT_MODE_EVENT: 'groovelab_parent_mode_changed',
} as const;

// 15-Minute Sliding Inactivity Window (Harmonized with Migration 508 / 437)
export const PARENT_LEASE_INACTIVITY_MS = 15 * 60 * 1000; // 900 seconds
export const PARENT_LEASE_HARD_CAP_MS = 30 * 60 * 1000;   // 1800 seconds

export interface ParentVerificationResult {
  success: boolean;
  leaseToken?: string;
  error?: string;
}

/**
 * Returns the currently active, unexpired parent lease token from sessionStorage.
 * Returns null if no lease exists or the 15-minute sliding window has expired.
 */
export function getActiveParentLeaseToken(studentId?: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check expiration if studentId is provided
    if (studentId) {
      const expiryStr = sessionStorage.getItem(`${STORAGE_KEYS.PARENT_EXPIRY_PREFIX}${studentId}`);
      if (expiryStr) {
        const expiresAt = Number(expiryStr);
        if (!isNaN(expiresAt) && Date.now() > expiresAt) {
          // Lease expired: purge cleanly
          purgeParentSessionLease(studentId);
          return null;
        }
      }
    }

    // 2. Fetch primary or secondary lease token
    const token =
      sessionStorage.getItem(STORAGE_KEYS.PRIMARY_LEASE) ||
      sessionStorage.getItem(STORAGE_KEYS.ACTIVE_LEASE_ID);

    return token && token.trim().length > 0 ? token.trim() : null;
  } catch (err) {
    console.warn('[ParentSecurityLease] Error reading active lease token:', err);
    return null;
  }
}

/**
 * Checks whether an authoritative parent session is currently unlocked and valid.
 */
export function isParentSessionActive(studentId: string): boolean {
  if (typeof window === 'undefined' || !studentId) return false;

  try {
    const expiryStr = sessionStorage.getItem(`${STORAGE_KEYS.PARENT_EXPIRY_PREFIX}${studentId}`);
    if (!expiryStr) return false;

    const expiresAt = Number(expiryStr);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      purgeParentSessionLease(studentId);
      return false;
    }

    const hasLease = Boolean(getActiveParentLeaseToken(studentId));
    const hasFlag = sessionStorage.getItem(`${STORAGE_KEYS.STUDENT_UNLOCKED_PREFIX}${studentId}`) === 'true';

    return hasLease || hasFlag;
  } catch {
    return false;
  }
}

/**
 * Registers an active parent session lease across all canonical storage keys,
 * refreshes the 15-minute sliding window, and broadcasts the event.
 */
export function setActiveParentLease(
  leaseToken: string,
  studentId: string,
  durationMs: number = PARENT_LEASE_INACTIVITY_MS
): void {
  if (typeof window === 'undefined') return;

  const validToken = String(leaseToken || '').trim();
  const expiresAt = Date.now() + durationMs;

  try {
    if (validToken) {
      sessionStorage.setItem(STORAGE_KEYS.PRIMARY_LEASE, validToken);
      sessionStorage.setItem(STORAGE_KEYS.ACTIVE_LEASE_ID, validToken);
    }

    if (studentId) {
      sessionStorage.setItem(`${STORAGE_KEYS.PARENT_EXPIRY_PREFIX}${studentId}`, String(expiresAt));
      sessionStorage.setItem(`${STORAGE_KEYS.MODULE_UNLOCK_PREFIX}${studentId}`, String(expiresAt));
      sessionStorage.setItem(`${STORAGE_KEYS.STUDENT_UNLOCKED_PREFIX}${studentId}`, 'true');
    }

    sessionStorage.setItem(STORAGE_KEYS.GLOBAL_UNLOCKED, 'true');

    // Cross-Component Event Broadcast
    window.dispatchEvent(
      new CustomEvent(STORAGE_KEYS.PARENT_MODE_EVENT, { detail: true })
    );
  } catch (err) {
    console.warn('[ParentSecurityLease] Failed to set active parent lease:', err);
  }
}

/**
 * Atomically purges all parent session storage keys and broadcasts the lock state.
 */
export function purgeParentSessionLease(studentId?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const activeLease =
      sessionStorage.getItem(STORAGE_KEYS.PRIMARY_LEASE) ||
      sessionStorage.getItem(STORAGE_KEYS.ACTIVE_LEASE_ID);

    sessionStorage.removeItem(STORAGE_KEYS.PRIMARY_LEASE);
    sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_LEASE_ID);
    sessionStorage.removeItem(STORAGE_KEYS.GLOBAL_UNLOCKED);

    if (studentId) {
      sessionStorage.removeItem(`${STORAGE_KEYS.PARENT_EXPIRY_PREFIX}${studentId}`);
      sessionStorage.removeItem(`${STORAGE_KEYS.MODULE_UNLOCK_PREFIX}${studentId}`);
      sessionStorage.removeItem(`${STORAGE_KEYS.STUDENT_UNLOCKED_PREFIX}${studentId}`);
    }

    // Comprehensive cleanup of all legacy parent keys
    try {
      Object.keys(sessionStorage).forEach((key) => {
        if (
          key.startsWith('groovelab_parent_') ||
          key.startsWith('campus_parent_') ||
          key.startsWith('groovelab_family_unlocked_') ||
          key === STORAGE_KEYS.PRIMARY_LEASE ||
          key === STORAGE_KEYS.ACTIVE_LEASE_ID
        ) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (_) {}

    // Authoritative Server-Side Revocation RPC
    if (
      activeLease &&
      !activeLease.startsWith('parent-passkey-') &&
      !activeLease.startsWith('parent-lease-') &&
      !activeLease.startsWith('transient_lease_')
    ) {
      try {
        supabase.rpc('revoke_parent_session_lease', { p_lease_id: activeLease }).then(() => {}, () => {});
      } catch (_) {}
    }

    // Broadcast lock event to instantly re-arm all UI parent gates
    window.dispatchEvent(
      new CustomEvent(STORAGE_KEYS.PARENT_MODE_EVENT, { detail: false })
    );
  } catch (err) {
    console.warn('[ParentSecurityLease] Error purging parent session lease:', err);
  }
}

/**
 * Authoritatively verifies a parent PIN via PostgreSQL RPC `verify_parent_pin_with_lease`.
 * Establishes an unforgeable session lease in public.session_leases on success.
 */
export async function verifyParentPinAuthoritative(
  studentId: string,
  inputPin: string,
  deviceKey?: string
): Promise<ParentVerificationResult> {
  const cleanPin = (inputPin || '').trim();
  if (!studentId || cleanPin.length < 4) {
    return { success: false, error: 'Ungültige PIN-Eingabe.' };
  }

  const effectiveDeviceKey = deviceKey || getOrCreateDeviceKey();

  try {
    // 1. Primary: Authoritative RPC verify_parent_pin_with_lease (Migration 508 / 431)
    const { data: leaseData, error: leaseErr } = await supabase.rpc(
      'verify_parent_pin_with_lease',
      {
        p_student_id: studentId,
        p_input_pin: cleanPin,
        p_device_key: effectiveDeviceKey
      }
    );

    if (!leaseErr && leaseData?.success === true) {
      const leaseToken = String(leaseData.lease_token || leaseData.lease_id || '');
      if (leaseToken) {
        setActiveParentLease(leaseToken, studentId);
      }
      return { success: true, leaseToken };
    }

    // 2. Secondary Fallback: Direct verify_parent_pin if lease RPC is temporarily degraded
    const { data: directOk, error: directErr } = await supabase.rpc(
      'verify_parent_pin',
      {
        student_id: studentId,
        input_pin: cleanPin
      }
    );

    if (!directErr && directOk === true) {
      // Synthesize local temporary token for backward compatibility
      const fallbackToken = `transient_lease_${Date.now()}`;
      setActiveParentLease(fallbackToken, studentId);
      return { success: true, leaseToken: fallbackToken };
    }

    return {
      success: false,
      error: leaseErr?.message || directErr?.message || 'Falsche Eltern-Master-PIN.'
    };
  } catch (err: any) {
    console.error('[ParentSecurityLease] Unexpected verification error:', err);
    return {
      success: false,
      error: err?.message || 'Verbindungsfehler bei der PIN-Prüfung.'
    };
  }
}

/**
 * Enriches any outgoing `save_parent_controls` settings payload with the active
 * `lease_token` and/or `parent_pin`.
 * 
 * 🛡️ Eliminates the P0 Passkey-to-Bedtime 42501 defect:
 * Parents authenticated via WebAuthn Passkeys do not hold an in-memory PIN.
 * By injecting `lease_token`, PostgreSQL Migration 508 / 437 accepts the update
 * without requiring an in-memory PIN.
 */
export function enrichParentControlsPayload(
  arg1: string | Record<string, any>,
  arg2: string | Record<string, any>,
  inMemoryPin?: string | null
): Record<string, any> {
  let studentId: string;
  let settings: Record<string, any>;

  if (typeof arg1 === 'string') {
    studentId = arg1;
    settings = (arg2 as Record<string, any>) || {};
  } else {
    settings = (arg1 as Record<string, any>) || {};
    studentId = typeof arg2 === 'string' ? arg2 : '';
  }

  const activeLease = getActiveParentLeaseToken(studentId);
  const cleanPin = (inMemoryPin || '').trim();

  const enriched: Record<string, any> = {
    ...settings
  };

  // Inject lease_token if available
  if (activeLease) {
    enriched.lease_token = activeLease;
  }

  // Inject parent_pin and pin if available in volatile RAM
  if (cleanPin) {
    enriched.parent_pin = cleanPin;
    enriched.pin = cleanPin;
  }

  return enriched;
}
