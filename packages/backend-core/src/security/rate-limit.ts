/**
 * 🛡️ Tier-1 Enterprise Rate Limiting Utility
 * Prevents brute-force, DDoS, and excessive API usage.
 * In a real production serverless environment, this should be backed by Upstash Redis.
 * This implementation provides the standard interface and an in-memory fallback for demonstration/single-instance apps.
 */

interface RateLimitConfig {
  maxRequests: number;  // Max allowed requests
  windowMs: number;     // Time window in milliseconds
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

// In-Memory Fallback Store (Note: Resets on server restart/serverless cold boot)
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

export async function checkRateLimit(
  identifier: string, // Usually the user's IP or Tenant ID
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const record = memoryStore.get(identifier);

  // Clean up expired record
  if (record && now > record.expiresAt) {
    memoryStore.delete(identifier);
  }

  const currentRecord = memoryStore.get(identifier) || { count: 0, expiresAt: now + config.windowMs };
  
  if (currentRecord.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: currentRecord.expiresAt,
    };
  }

  currentRecord.count += 1;
  memoryStore.set(identifier, currentRecord);

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - currentRecord.count,
    resetTime: currentRecord.expiresAt,
  };
}
