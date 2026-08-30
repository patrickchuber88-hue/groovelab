/**
 * ==============================================================================
 * CAMPUS-GROOVELAB ENTERPRISE COOKIE AUTH BRIDGE
 * Implements hardened SameSite=Strict / Secure cookie management for Tier-1 SaaS
 * ==============================================================================
 */

export interface SecureCookieOptions {
  days?: number;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  path?: string;
}

/**
 * Stores a secure authentication or telemetry session lease token.
 */
export function setSecureCookie(
  name: string,
  value: string,
  options: SecureCookieOptions = {}
): void {
  try {
    const {
      days = 30,
      secure = window.location.protocol === 'https:',
      sameSite = 'Strict',
      path = '/'
    } = options;

    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = `; expires=${date.toUTCString()}`;
    }

    const secureFlag = secure ? '; Secure' : '';
    const sameSiteFlag = `; SameSite=${sameSite}`;

    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}${expires}; path=${path}${secureFlag}${sameSiteFlag}`;
  } catch (err) {
    console.warn('[CookieAuthBridge] Failed to set secure cookie:', err);
  }
}

/**
 * Retrieves a cookie safely.
 */
export function getSecureCookie(name: string): string | null {
  try {
    const nameEQ = `${encodeURIComponent(name)}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
  } catch (err) {
    console.warn('[CookieAuthBridge] Failed to read secure cookie:', err);
  }
  return null;
}

/**
 * Clears a secure cookie safely.
 */
export function removeSecureCookie(name: string, path: string = '/'): void {
  try {
    document.cookie = `${encodeURIComponent(name)}=; Max-Age=-99999999; path=${path}; SameSite=Strict; Secure`;
  } catch (err) {
    console.warn('[CookieAuthBridge] Failed to remove secure cookie:', err);
  }
}
