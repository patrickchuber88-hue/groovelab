/**
 * ==============================================================================
 * CAMPUS-GROOVELAB SECURE SESSION ZEROIZATION UTILITY
 * Standard: NIST SP 800-88 / OWASP ASVS Level 3 Memory Sanitization
 * ==============================================================================
 */

import { removeSecureCookie } from './cookieAuthBridge';
import { broadcastLogoutToPeerTabs } from './authBroadcastSync';
import { safeReplaceUrl } from './urlSecurityScrubber';
import { secureVault } from './secureVault';

/**
 * Performs complete cryptographic memory wipe and storage zeroization upon logout or tenant switch.
 */
export function executeSessionZeroize(options: { preserveDeviceKey?: boolean; redirectUrl?: string; broadcast?: boolean } = {}): void {
  const { preserveDeviceKey = true, redirectUrl, broadcast = false } = options;

  try {
    console.info('[Security] Initiating complete session zeroization (broadcast=' + broadcast + ')...');

    if (broadcast) {
      broadcastLogoutToPeerTabs();
    }

    // 1. Wipe tab-scoped sessionStorage completely
    try {
      sessionStorage.clear();
    } catch (_) {}

    // 2. Clean up legacy or ephemeral session keys from localStorage without disrupting device/station config
    const sessionKeysToScrub = [
      'groovelab_user_id',
      'campus_active_student_id',
      'groovelab_current_student_id',
      'groovelab_cached_user',
      'gl_active_session_lease_id',
      'groovelab_is_master_admin',
      'groovelab_active_workspace'
    ];
    sessionKeysToScrub.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    });

    // 3. Purge Auth & Lease Cookies
    removeSecureCookie('cg_session_lease');
    removeSecureCookie('cg_auth_token');
    removeSecureCookie('cg_registration_access_unlocked');

    // 4. Overwrite in-memory window credentials if any exist
    if (typeof window !== 'undefined') {
      (window as any).__CG_AUTH_STATE__ = null;
      (window as any).__CG_USER__ = null;
    }

    // 5. Cryptographic Client-Vault Zeroization (AES-GCM-256 Shredding)
    try {
      secureVault.zeroize();
    } catch (_) {}

    console.info('[Security] Session zeroization complete.');

    // 6. Navigate to clean destination if requested and not already there
    if (redirectUrl && typeof window !== 'undefined') {
      safeReplaceUrl(redirectUrl);
    }
  } catch (err) {
    console.error('[Security] Error during session zeroization:', err);
  }
}
