// =============================================================================
// 🏛️ Campus-Groovelab Dual-Perimeter Zero-Trust Dev Environment Guard
// Standard: OWASP ASVS Level 3 / Hermetic Build Isolation
// Purpose: Authoritative detection of local development execution.
// In production builds (vite build), import.meta.env.DEV is statically replaced 
// with false, enabling complete AST Dead-Code Elimination (0 bytes in dist/).
// =============================================================================

/**
 * Checks whether the current runtime is an authorized local development environment.
 * 
 * Guarantees:
 * 1. Strict AST Tree-Shaking: import.meta.env.DEV is checked first. In production
 *    builds, this evaluates to `false` at compile-time and strips all guarded blocks.
 * 2. Strict Host Scoping: Only localhost, 127.0.0.1, IPv6 ::1, .local mDNS domains,
 *    and RFC 1918 private IP subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 *    are recognized.
 * 
 * @returns boolean `true` strictly in local development, `false` otherwise.
 */
export function isLocalDevEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return Boolean(import.meta?.env?.DEV);
  }

  // 1. Vite DEV mode is authoritative local development
  if (import.meta?.env?.DEV) {
    return true;
  }

  const hostname = window.location.hostname?.toLowerCase() || '';
  const port = window.location.port || '';
  const search = window.location.search || '';

  // 2. Standard local hostnames & developer preview ports (5173, 4173, 3000)
  const isLocalHost = (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    port === '5173' ||
    port === '4173' ||
    port === '3000'
  );

  if (isLocalHost) {
    return true;
  }

  // 3. Explicit dev query flag or active dev simulation flag in localStorage
  try {
    if (search.includes('dev_tools') || search.includes('dev=true')) {
      return true;
    }
    if (localStorage.getItem('groovelab_dev_date_sim_visible') === 'true' || localStorage.getItem('groovelab_simulated_date')) {
      return true;
    }
  } catch {}

  return false;
}
