/**
 * 🏛️ Campus-Groovelab History Utilities (Enterprise Goldstandard)
 * Rate-limited and exception-safe wrapper for window.history.replaceState
 */

let _lastReplaceStateTime = 0;
let _replaceStateCount = 0;

export const safeReplaceState = (data: any, unused: string, url?: string | URL | null): void => {
  if (typeof window === 'undefined' || !window.history) return;
  try {
    if (url) {
      const urlStr = typeof url === 'string' ? url : url.toString();
      const currentFull = window.location.pathname + window.location.search + window.location.hash;
      if (currentFull === urlStr) return;
    }
    const now = Date.now();
    if (now - _lastReplaceStateTime > 10000) {
      _lastReplaceStateTime = now;
      _replaceStateCount = 0;
    }
    _replaceStateCount++;
    if (_replaceStateCount > 25) {
      return;
    }
    window.history.replaceState(data, unused, url);
  } catch (e) {
    console.warn('[History] safeReplaceState caught error:', e);
  }
};
