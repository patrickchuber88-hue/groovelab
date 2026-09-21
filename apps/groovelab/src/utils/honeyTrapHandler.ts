/**
 * Campus-Groovelab Semantic Honey-Token & AI-Crawler Trap Handler
 * Standard: OWASP ASVS Level 3 / Active Defense & Tarpit Throttling
 * 
 * Intercepts, records, and neutralizes automated bots, scrapers, and autonomous
 * LLM agents attempting to crawl or exploit decoy endpoints or hidden form fields.
 */

import { reportClientError } from '../lib/errorTelemetry';
import { getOrCreateActiveTrace } from './w3cTraceContext';
import { isDevEnvironment } from './tenantUrlHelper';

export const CANARY_BAIT_PATHS = [
  '/api/v1/internal/admin_vault_export',
  '/api/v1/security-canary-export',
  '/internal/master_admin_backdoor',
  '/system/database_raw_dump.sql'
];

/**
 * Checks if a URL or path matches a defined canary honey trap.
 */
export function isCanaryPath(path: string): boolean {
  if (!path) return false;
  return CANARY_BAIT_PATHS.some(canary => path.includes(canary));
}

/**
 * Simulates a synthetic Tarpit delay to exhaust bot connection pool and compute budget.
 */
export async function applyTarpitDelay(ms: number = 2500): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Invoked when an automated scraper, bot, or LLM agent touches or interacts with a canary trap.
 */
export function handleCanaryProbe(meta: {
  source?: string;
  field?: string;
  path?: string;
  userAgent?: string;
} = {}): void {
  const activeTrace = getOrCreateActiveTrace();
  const isDev = isDevEnvironment();

  const details = {
    source: meta.source || 'DOM_HONEY_TOKEN',
    field: meta.field || 'canary_link',
    path: meta.path || (typeof window !== 'undefined' ? window.location?.pathname : null) || '/',
    trace_id: activeTrace.traceId,
    traceparent: activeTrace.traceparent,
    timestamp: new Date().toISOString()
  };

  const alertMessage = `ANOMALOUS_CANARY_PROBE_DETECTED: Automated agent touched honeypot [${details.field}] at ${details.path}`;

  if (isDev) {
    console.warn(`🍯 [HoneyTrap] Canary triggered:`, details);
  } else {
    console.error(`🚨 [HoneyTrap] Canary triggered in production:`, details);
  }

  // Report critical forensic incident
  reportClientError(alertMessage, {
    severity: 'CRITICAL',
    tag: 'SECURITY_CANARY_TRIPPED',
    context: 'HoneyTrapHandler'
  });
}
