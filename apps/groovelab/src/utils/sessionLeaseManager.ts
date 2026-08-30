/**
 * Campus-Groovelab Session Lease & Security Manager
 * 
 * Provides zero-trust cryptographic device tracking, remote logout,
 * and security event aggregation.
 */

import { supabase } from '../lib/supabase';

const DEVICE_KEY_STORAGE = 'gl_global_device_key';
const ACTIVE_LEASE_STORAGE = 'gl_active_session_lease_id';

/**
 * Retrieves or establishes a permanent unique hardware/browser key for this device.
 */
export function getOrCreateDeviceKey(): string {
  if (typeof window === 'undefined') return 'unknown-device';
  let key = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY_STORAGE, key);
  }
  return key;
}

/**
 * Computes a human-readable display name for the current browser/OS (e.g. "Safari auf iPad", "Chrome auf Mac").
 */
export function getDeviceDisplayName(): string {
  if (typeof window === 'undefined') return 'Desktop / Browser';

  const ua = navigator.userAgent;
  let os = 'Unbekanntes OS';
  if (/iPad|iPhone|iPod/.test(ua)) os = 'iOS Gerät';
  else if (/Macintosh|Mac OS X/.test(ua)) os = 'Mac';
  else if (/Windows/.test(ua)) os = 'Windows PC';
  else if (/Android/.test(ua)) os = 'Android Gerät';
  else if (/Linux/.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/Chrome|CriOS/.test(ua) && !/Edge|Edg|OPR/.test(ua)) browser = 'Chrome';
  else if (/Safari/.test(ua) && !/Chrome|CriOS/.test(ua)) browser = 'Safari';
  else if (/Firefox|FxiOS/.test(ua)) browser = 'Firefox';
  else if (/Edge|Edg/.test(ua)) browser = 'Edge';

  const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  const pwaTag = isPWA ? ' (Campus App)' : '';

  return `${browser} auf ${os}${pwaTag}`;
}

/**
 * Registers an active session lease on the server upon login.
 */
export async function registerClientSessionLease(user: { id: string; role?: string }, schoolId: string): Promise<{ success: boolean; leaseId?: string; revoked?: boolean }> {
  if (!user?.id || !schoolId) return { success: false };

  try {
    const deviceKey = getOrCreateDeviceKey();
    const deviceName = getDeviceDisplayName();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
    const role = user.role || 'student';

    const { data, error } = await supabase.rpc('register_session_lease', {
      p_user_id: user.id,
      p_school_id: schoolId,
      p_device_name: deviceName,
      p_device_key: deviceKey,
      p_role: role,
      p_user_agent: userAgent
    });

    if (error) {
      console.warn('[SessionLease] Failed to register session lease:', error);
      return { success: false };
    }

    if (data?.revoked) {
      return { success: false, revoked: true };
    }

    if (data?.lease_id) {
      sessionStorage.setItem(ACTIVE_LEASE_STORAGE, data.lease_id);
      localStorage.setItem(ACTIVE_LEASE_STORAGE, data.lease_id);
      return { success: true, leaseId: data.lease_id };
    }

    return { success: true };
  } catch (err) {
    console.error('[SessionLease] Exception registering lease:', err);
    return { success: false };
  }
}

/**
 * Revokes a specific session lease (1-Click Remote Logout).
 */
export async function revokeClientSessionLease(leaseId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('revoke_session_lease', {
      p_lease_id: leaseId
    });
    if (error) throw error;
    return Boolean(data);
  } catch (err) {
    console.error('[SessionLease] Error revoking lease:', err);
    return false;
  }
}

/**
 * Revokes all active sessions for a user (Terminates all devices).
 */
export async function revokeAllSessionsForUser(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('revoke_all_user_session_leases', {
      p_target_user_id: userId
    });
    if (error) throw error;
    return typeof data === 'number' ? data : 0;
  } catch (err) {
    console.error('[SessionLease] Error revoking all user leases:', err);
    return 0;
  }
}

/**
 * Fetches the complete school security overview for the Admin/Secretariat Security Suite.
 */
export async function fetchSchoolSecurityOverview(schoolId: string): Promise<{
  active_devices: any[];
  blocked_attempts_count: number;
  total_tracked_devices: number;
} | null> {
  try {
    const { data, error } = await supabase.rpc('get_school_security_overview', {
      p_school_id: schoolId
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SessionLease] Error fetching security overview:', err);
    return null;
  }
}

/**
 * 1-Click QR Token Revocation & Re-issuance (Verlust-Schutz).
 */
export async function revokeAndRegenerateQRToken(targetUserId: string): Promise<{ success: boolean; new_qr_token?: string } | null> {
  try {
    const { data, error } = await supabase.rpc('revoke_and_regenerate_qr_token', {
      p_target_user_id: targetUserId
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SessionLease] Error regenerating QR token:', err);
    return null;
  }
}
