/**
 * 🛡️ Client-Side Anti-Brute-Force Rate Limiter for PIN & Token Verification
 * Prevents automated credential guessing on kiosks and user login forms.
 */

interface RateLimitState {
  attempts: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

const STORAGE_KEY_PREFIX = 'cg_rate_limit_';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds lockout
const ATTEMPT_WINDOW_MS = 3 * 60 * 1000; // 3 minutes rolling window

export const pinRateLimiter = {
  /**
   * Check if an action key (e.g. 'pin_login' or specific school token) is currently locked out
   */
  checkStatus(actionKey: string = 'default'): { isLocked: boolean; remainingSeconds: number; attempts: number } {
    try {
      const stored = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${actionKey}`);
      if (!stored) return { isLocked: false, remainingSeconds: 0, attempts: 0 };

      const state: RateLimitState = JSON.parse(stored);
      const now = Date.now();

      // Check if currently locked
      if (state.lockedUntil && state.lockedUntil > now) {
        const remainingSeconds = Math.ceil((state.lockedUntil - now) / 1000);
        return { isLocked: true, remainingSeconds, attempts: state.attempts };
      }

      // If lockout expired or attempt window expired, reset
      if (now - state.lastAttempt > ATTEMPT_WINDOW_MS) {
        sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${actionKey}`);
        return { isLocked: false, remainingSeconds: 0, attempts: 0 };
      }

      return { isLocked: false, remainingSeconds: 0, attempts: state.attempts };
    } catch (e) {
      return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    }
  },

  /**
   * Record a failed PIN attempt and trigger lockout if MAX_ATTEMPTS reached
   */
  recordFailedAttempt(actionKey: string = 'default'): { isLocked: boolean; remainingSeconds: number; attempts: number } {
    try {
      const now = Date.now();
      const current = this.checkStatus(actionKey);
      const newAttempts = current.attempts + 1;

      let lockedUntil: number | null = null;
      let isLocked = false;
      let remainingSeconds = 0;

      if (newAttempts >= MAX_ATTEMPTS) {
        lockedUntil = now + LOCKOUT_DURATION_MS;
        isLocked = true;
        remainingSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
      }

      const state: RateLimitState = {
        attempts: newAttempts,
        lockedUntil,
        lastAttempt: now
      };

      sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${actionKey}`, JSON.stringify(state));
      return { isLocked, remainingSeconds, attempts: newAttempts };
    } catch (e) {
      return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    }
  },

  /**
   * Reset rate limiter upon successful authentication
   */
  reset(actionKey: string = 'default'): void {
    try {
      sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${actionKey}`);
    } catch (e) {}
  }
};
