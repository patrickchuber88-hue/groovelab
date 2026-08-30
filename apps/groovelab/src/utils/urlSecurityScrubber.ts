/**
 * Campus-Groovelab Enterprise URL Security Scrubber
 * 
 * Automatically scrubs sensitive authentication tokens, PINs, and signatures
 * from the browser address bar immediately after consumption.
 * Prevents history leakage, referrer leakage, and shoulder-surfing.
 */

export function scrubSensitiveUrlParams(): void {
  if (typeof window === 'undefined') return;

  try {
    const url = new URL(window.location.href);
    const sensitiveKeys = [
      'token',
      'kiosk_token',
      'qr_token',
      'invite_token',
      'invite_school_id',
      'sig',
      'exp',
      'pin',
      'temp_key',
      'onboarding_token'
    ];

    let hasSensitive = false;

    sensitiveKeys.forEach((key) => {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        hasSensitive = true;
      }
    });

    if (hasSensitive) {
      const cleanPath = url.pathname + (url.search ? url.search : '') + url.hash;
      window.history.replaceState(null, '', cleanPath);
      console.log('[Security] Sensitive URL tokens successfully scrubbed from address bar.');
    }
  } catch (err) {
    console.warn('[Security] Failed to scrub URL params:', err);
  }
}
