/**
 * Tier-1 Multi-Tenant URL & Routing Engine
 * Campus-Groovelab Enterprise+ Architecture
 * 
 * Provides canonical, school-scoped subdomain and deep-link generation
 * for zero-mail onboarding, parent invitations, teacher logins, and PDF generation.
 */

import { isLocalDevEnvironment } from './devEnvironment';

/**
 * Converts a school name into a clean, URL-safe subdomain slug.
 */
export function slugifyTenantName(name: string): string {
  if (!name || !name.trim()) return 'musikschule';
  return name
    .toLowerCase()
    .trim()
    .replace(/[äöüß]/g, (match) => {
      const mapping: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
      return mapping[match] || match;
    })
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'musikschule';
}

/**
 * Resolves the primary subdomain slug for a school.
 */
export function getTenantSubdomain(schoolName: string, explicitSubdomain?: string | null): string {
  if (explicitSubdomain && explicitSubdomain.trim()) {
    return explicitSubdomain.trim().toLowerCase();
  }
  return slugifyTenantName(schoolName);
}

/**
 * Resolves the base root domain of the current environment.
 */
function getBasePlatformDomain(): string {
  if (typeof window === 'undefined') return 'campus-groovelab.de';
  let cleanHost = window.location.host;
  if (cleanHost.startsWith('www.')) {
    cleanHost = cleanHost.substring(4);
  }
  const knownDomains = ['campus-groovelab.de', 'groovelab.de', 'campus-groovelab.com'];
  for (const domain of knownDomains) {
    if (cleanHost.endsWith(domain)) {
      return domain;
    }
  }
  return 'campus-groovelab.de';
}

/**
 * Generates the school-scoped origin / root URL.
 */
export function getSchoolOrigin(schoolName: string, explicitSubdomain?: string | null): string {
  const subdomain = getTenantSubdomain(schoolName, explicitSubdomain);
  if (typeof window === 'undefined') {
    return `https://${subdomain}.campus-groovelab.de`;
  }

  const host = window.location.host;
  const protocol = window.location.protocol;

  // Localhost & Dev Support
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const port = host.split(':')[1] || '5173';
    return `${protocol}//localhost:${port}?school=${subdomain}`;
  }

  const baseDomain = getBasePlatformDomain();
  return `${protocol}//${subdomain}.${baseDomain}`;
}

/**
 * Generates the official school-scoped Student / Parent Onboarding URL.
 * Used in Elternbriefe, Infocenter, Messenger-Vorlagen, and PDFs.
 * 
 * - If token is provided: Produces canonical /onboarding/:token Tier-1 URL
 * - If token is omitted: Points to the school origin / portal
 */
export function getParentOnboardingUrl(
  schoolName: string,
  explicitSubdomain?: string | null,
  token?: string | null
): string {
  const subdomain = getTenantSubdomain(schoolName, explicitSubdomain);
  const cleanToken = token ? token.trim() : null;

  if (cleanToken) {
    if (typeof window === 'undefined') {
      return `https://${subdomain}.campus-groovelab.de/onboarding/${encodeURIComponent(cleanToken)}?platform=campus`;
    }
    const host = window.location.host;
    const protocol = window.location.protocol;
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      const port = host.split(':')[1] || '5173';
      return `${protocol}//localhost:${port}/onboarding/${encodeURIComponent(cleanToken)}?school=${subdomain}&platform=campus`;
    }
    const baseDomain = getBasePlatformDomain();
    return `${protocol}//${subdomain}.${baseDomain}/onboarding/${encodeURIComponent(cleanToken)}?platform=campus`;
  }

  return getSchoolOrigin(schoolName, explicitSubdomain);
}

/**
 * Generates the canonical, single-source-of-truth Student Onboarding URL.
 * Guaranteed to route to StudentOnboardingPage (/onboarding/:token).
 */
export function getCanonicalStudentOnboardingUrl(
  token: string,
  platform: 'campus' | 'groovelab' = 'campus'
): string {
  const cleanToken = (token || '').trim();
  if (!cleanToken) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://campus-groovelab.de';
  return `${origin}/onboarding/${cleanToken}?platform=${platform}`;
}

/**
 * Generates the official school-scoped Teacher Login URL.
 */
export function getTeacherLoginUrl(
  schoolName: string,
  explicitSubdomain?: string | null
): string {
  return getSchoolOrigin(schoolName, explicitSubdomain);
}

/**
 * Checks if the current environment is a local development host.
 */
export function isLocalhostEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return isLocalDevEnvironment() ||
         host === 'localhost' || 
         host === '127.0.0.1' || 
         host === '0.0.0.0' || 
         host === '[::1]' ||
         host.endsWith('.localhost') ||
         host.endsWith('.local') ||
         /^192\.168\./.test(host) ||
         /^10\./.test(host) ||
         /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);
}

/**
 * Strict check: Only true in Vite DEV mode on a local machine.
 * Eliminates all URL parameter bypasses in production builds.
 */
export function isDevEnvironment(): boolean {
  return isLocalDevEnvironment();
}

/**
 * Generates the canonical, Tier-1 SaaS Enterprise+ QR Landing Page URL.
 * Single source of truth for all QR codes, Ausweise, stickers, and wallet passes.
 * 
 * - Production: Always https://campus-groovelab.de/qr/:token
 * - Localhost / Local Wi-Fi Dev: window.location.origin/qr/:token
 * - Zero-Trust: Rejects empty tokens
 */
export function getCanonicalQrLandingUrl(qrToken?: string | null): string {
  const cleanToken = (qrToken || '').trim();
  if (!cleanToken) return '';

  if (typeof window === 'undefined') {
    return `https://campus-groovelab.de/qr/${cleanToken}`;
  }

  const hostname = window.location.hostname.toLowerCase();
  const isLocal = isLocalDevEnvironment() ||
                  hostname === 'localhost' || 
                  hostname === '127.0.0.1' || 
                  hostname === '0.0.0.0' || 
                  hostname === '[::1]' ||
                  hostname.endsWith('.localhost') ||
                  hostname.endsWith('.local') ||
                  /^192\.168\./.test(hostname) ||
                  /^10\./.test(hostname) ||
                  /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

  if (isLocal) {
    return `${window.location.origin}/qr/${cleanToken}`;
  }

  return `https://campus-groovelab.de/qr/${cleanToken}`;
}
