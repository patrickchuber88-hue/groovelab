// Client-side API Request Throttler for Campus-Groovelab
// Protects Supabase API quotas against infinite React component re-fetch loops

const requestHistoryMap: Map<string, number[]> = new Map();

/**
 * Checks if an API request is permitted under rate limit thresholds.
 * Returns true if allowed, false if throttled.
 */
export function checkRequestRateLimit(
  apiKey: string,
  maxRequestsPerWindow: number = 30,
  windowMs: number = 10000
): boolean {
  const now = Date.now();
  const history = (requestHistoryMap.get(apiKey) || []).filter((t) => now - t < windowMs);

  if (history.length >= maxRequestsPerWindow) {
    console.warn(`[RateLimit] Throttling rapid API calls for key: ${apiKey}`);
    return false; // Throttled
  }

  history.push(now);
  requestHistoryMap.set(apiKey, history);
  return true; // Allowed
}
