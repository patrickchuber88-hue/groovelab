/**
 * Campus-Groovelab Reserved Subdomains Blacklist
 * 
 * Prevents subdomain-hijacking, phishing, and routing collisions
 * for critical infrastructure endpoints.
 */

export const RESERVED_SUBDOMAINS = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'login',
  'signup',
  'register',
  'root',
  'system',
  'support',
  'dashboard',
  'mail',
  'secure',
  'static',
  'assets',
  'cdn',
  'groovelab',
  'campus',
  'master',
  'status',
  'help',
  'billing',
  'dev',
  'staging',
  'test',
  'demo',
  'portal',
  'account',
  'kiosk',
  'stage',
  'live',
  'secretariat',
  'sekretariat',
  'schulleitung',
  'teacher',
  'lehrer',
  'student',
  'schueler',
  'eltern',
  'parents',
  'download',
  'pass',
  'qr'
]);

/**
 * Checks whether a given subdomain is reserved by the system.
 */
export function isSubdomainReserved(subdomain: string): boolean {
  if (!subdomain) return false;
  const clean = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  return RESERVED_SUBDOMAINS.has(clean);
}
