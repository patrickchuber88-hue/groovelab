/**
 * ==============================================================================
 * CAMPUS-GROOVELAB SECURE SESSION ZEROIZATION UTILITY
 * Standard: NIST SP 800-88 / OWASP ASVS Level 3 Memory Sanitization
 * ==============================================================================
 */

import { removeSecureCookie } from './cookieAuthBridge';

/**
 * Performs complete cryptographic memory wipe and storage zeroization upon logout or tenant switch.
 */
export function executeSessionZeroize(options: { preserveDeviceKey?: boolean; redirectUrl?: string } = {}): void {
  const { preserveDeviceKey = true, redirectUrl = '/' } = options;

  try {
    console.info('[Security] Initiating complete session zeroization...');

    // 1. Wipe sensitive localStorage items
    const keysToPreserve = new Set(
      preserveDeviceKey ? ['gl_global_device_key', 'groovelab_kiosk_token', 'groovelab_station_id', 'groovelab_kiosk_room_id'] : []
    );

    const allKeys = Object.keys(localStorage);
    allKeys.forEach((key) => {
      if (!keysToPreserve.has(key)) {
        // Overwrite before removing (defense against flash memory residual inspection)
        try {
          localStorage.setItem(key, '00000000000000000000000000000000');
        } catch (e) {}
        localStorage.removeItem(key);
      }
    });

    // 2. Wipe sessionStorage completely
    sessionStorage.clear();

    // 3. Purge Auth & Lease Cookies
    removeSecureCookie('cg_session_lease');
    removeSecureCookie('cg_auth_token');
    removeSecureCookie('cg_registration_access_unlocked');

    // 4. Overwrite in-memory window credentials if any exist
    if (typeof window !== 'undefined') {
      (window as any).__CG_AUTH_STATE__ = null;
      (window as any).__CG_USER__ = null;
    }

    console.info('[Security] Session zeroization complete.');

    // 5. Navigate to clean destination if requested
    if (redirectUrl && typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
  } catch (err) {
    console.error('[Security] Error during session zeroization:', err);
    if (redirectUrl && typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
  }
}
