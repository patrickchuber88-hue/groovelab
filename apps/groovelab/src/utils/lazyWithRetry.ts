import React from 'react';

/**
 * 0.1% Goldstandard Resilient Dynamic Import & Lazy Loading Engine
 * Standards: OWASP ASVS Level 3 / Fail-Safe Resilience & PWA Cache Drift Recovery
 * 
 * Solves:
 * 1. Network Glitches: Automatically retries failed dynamic imports once after 350ms.
 * 2. Deployment Drift: When a new production release changes chunk hashes, outdated clients
 *    attempting to load removed chunks trigger a controlled, debounced page refresh instead of a crash.
 * 3. Interoperability: Resolves both default (`m.default`) and named exports (`m.QRCodeModal`, etc.).
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | Record<string, any>>,
  namedExport?: string
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const resolveComponent = (module: any): { default: T } => {
      if (namedExport && module[namedExport]) {
        return { default: module[namedExport] };
      }
      if (module.default) {
        return { default: module.default };
      }
      // Automatic fallback for named exports matching component pattern
      const keys = Object.keys(module).filter(k => k !== '__esModule' && typeof module[k] === 'function');
      if (keys.length > 0) {
        return { default: module[keys[0]] };
      }
      throw new Error(`[lazyWithRetry] Could not resolve component from dynamic import module: ${Object.keys(module).join(', ')}`);
    };

    try {
      const module = await factory();
      return resolveComponent(module);
    } catch (initialError) {
      console.warn('[lazyWithRetry] Initial dynamic import failed. Retrying in 350ms...', initialError);

      await new Promise(res => setTimeout(res, 350));

      try {
        const module = await factory();
        return resolveComponent(module);
      } catch (retryError) {
        const errStr = String((retryError as any)?.message || retryError || '');
        const isChunkDriftError =
          errStr.includes('Failed to fetch dynamically imported module') ||
          errStr.includes('error loading dynamically imported module') ||
          errStr.includes('Importing a module script failed') ||
          errStr.includes('loading-error') ||
          errStr.includes('dynamically imported');

        if (isChunkDriftError && typeof window !== 'undefined') {
          const isLocalhost =
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.endsWith('.local');

          if (!isLocalhost) {
            const lastReload = sessionStorage.getItem('last_chunk_error_reload');
            const now = Date.now();

            if (!lastReload || now - parseInt(lastReload, 10) > 60000) {
              sessionStorage.setItem('last_chunk_error_reload', String(now));
              console.warn('[lazyWithRetry] Production chunk drift detected. Auto-reloading application to update asset manifest...');
              window.location.reload();
              // Return an unresolved promise to prevent re-throwing while page reloads
              return new Promise<{ default: T }>(() => {});
            }
          }
        }

        console.error('[lazyWithRetry] Dynamic import failed after retry:', retryError);
        throw retryError;
      }
    }
  });
}
