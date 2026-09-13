/**
 * Campus-Groovelab Enterprise URL Security Scrubber
 * 
 * Automatically scrubs sensitive authentication tokens, PINs, and signatures
 * from the browser address bar immediately after consumption.
 * Prevents history leakage, referrer leakage, and shoulder-surfing.
 */

let _lastReplaceStateWindowStart = 0;
let _replaceStateWindowCount = 0;

/**
 * Throttled history.replaceState wrapper with No-Op guard to respect Apple WebKit's
 * 100 calls / 30 seconds rate-limit.
 */
export function safeReplaceUrl(targetUrl: string): void {
  if (typeof window === 'undefined' || !window.history) return;
  try {
    const currentFull = window.location.pathname + window.location.search + window.location.hash;
    // 1. Strict No-Op Guard: Do not invoke WebKit History API if URL is already clean
    if (currentFull === targetUrl) return;

    // 2. Sliding window rate limiter (max 20 calls per 10 seconds)
    const now = Date.now();
    if (now - _lastReplaceStateWindowStart > 10000) {
      _lastReplaceStateWindowStart = now;
      _replaceStateWindowCount = 0;
    }
    _replaceStateWindowCount++;
    if (_replaceStateWindowCount > 20) {
      console.warn('[Security] WebKit replaceState rate-limit protected. Skipping excessive call.');
      return;
    }

    window.history.replaceState(null, '', targetUrl);
  } catch (e) {
    console.warn('[Security] replaceState failed safely:', e);
  }
}

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
      'onboarding_token',
      'ghost_token'
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
      safeReplaceUrl(cleanPath);
      console.log('[Security] Sensitive URL tokens successfully scrubbed from address bar.');
    }
  } catch (err) {
    console.warn('[Security] Failed to scrub URL params:', err);
  }
}

/**
 * Scrubs sensitive path-based tokens (e.g., /qr/:token or /onboarding/:token) 
 * once the token has been safely extracted into memory/sessionStorage.
 */
export function scrubSensitiveUrlPath(cleanReplacementPath: string = '/'): void {
  if (typeof window === 'undefined') return;

  try {
    const currentPath = window.location.pathname;
    const isSensitivePath = /^\/(qr|onboarding|device-onboarding)\/[0-9a-fA-F-]{10,}/.test(currentPath);

    if (isSensitivePath) {
      const cleanUrl = cleanReplacementPath + (window.location.search || '') + (window.location.hash || '');
      safeReplaceUrl(cleanUrl);
      console.log('[Security] Sensitive path token successfully scrubbed from address bar.');
    }
  } catch (err) {
    console.warn('[Security] Failed to scrub URL path:', err);
  }
}
