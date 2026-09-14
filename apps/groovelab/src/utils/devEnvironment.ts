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
  // 🛡️ Axiom 1: Compile-Time Gate (AST Dead-Code Elimination)
  if (!import.meta.env.DEV) {
    return false;
  }

  // 🛡️ Axiom 2: Browser Context & Hostname Verification
  if (typeof window === 'undefined' || !window.location || !window.location.hostname) {
    return false;
  }

  const hostname = window.location.hostname.toLowerCase();

  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.local') ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  );
}
