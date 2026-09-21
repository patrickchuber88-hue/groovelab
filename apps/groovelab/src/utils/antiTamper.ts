/**
 * Campus-Groovelab Tier-1 Paranoid-Tier Anti-Tampering & Console Shield
 * Protects production web environments from script injection, unauthorized console execution,
 * and malicious DOM inspection while keeping localhost/development 100% open for debugging.
 */

import { initRuntimeIntegrityGuard } from './runtimeIntegrityGuard';

export function initAntiTamperShield(): void {
  if (typeof window === 'undefined') return;

  const h = window.location.hostname;
  const p = window.location.port;

  const isDev = import.meta.env.DEV || 
                h === 'localhost' || 
                h === '127.0.0.1' ||
                h.endsWith('.localhost') ||
                h.endsWith('.local') ||
                h.startsWith('192.168.') ||
                h.startsWith('10.') ||
                /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h) ||
                p === '5173' ||
                p === '4173';

  // Never tamper with local development workflows or private network test devices
  if (isDev) {
    console.info('🛠️ [Anti-Tamper] Development / Private network mode active: DevTools & Logging unrestricted.');
    return;
  }

  try {
    // 0. Continuous Runtime Integrity Guard (Anti-Extension & Prototype Hijacking)
    initRuntimeIntegrityGuard();

    // 1. Silence non-essential console outputs in production
    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.debug = noop;
    console.trace = noop;

    // 2. Clear console history buffer
    if (typeof console.clear === 'function') {
      console.clear();
    }

    // 3. Prevent DevTools shortcuts on Kiosk / Student mode screens
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Prevent F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Prevent Ctrl+Shift+I / Cmd+Option+I (Inspect)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        return false;
      }
      // Prevent Ctrl+U / Cmd+Option+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        return false;
      }
    }, { capture: true });

    // 4. Self-defending debugger trap (stops automated decompilers/inspectors)
    setInterval(() => {
      const startTime = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const executionTime = performance.now() - startTime;
      // If execution paused > 100ms, DevTools is actively paused on debugger
      if (executionTime > 100) {
        if (typeof console.clear === 'function') console.clear();
      }
    }, 4000);

  } catch (err) {
    // Fallback: silent failure to prevent UI interruption
  }
}
