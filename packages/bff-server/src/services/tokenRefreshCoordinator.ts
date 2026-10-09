import crypto from 'crypto';

export interface RefreshedSessionResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  encryptedCookie: string;
  isReusedFlight?: boolean;
}

export type RefreshStatus = 'SUCCESS' | 'REVOKED' | 'UPSTREAM_ERROR';

export interface RefreshOutcome {
  status: RefreshStatus;
  data?: RefreshedSessionResult;
  error?: string;
}

/**
 * 🛡️ TOKEN REFRESH COORDINATOR (OWASP ASVS LEVEL 3 & RFC 6819 SINGLE-FLIGHT PATTERN)
 *
 * Sovereign, in-memory concurrency barrier for OAuth 2.0 / Supabase GoTrue token refreshes.
 *
 * Solves the RFC 6819 Token Rotation Replay Race Condition:
 * - When multiple concurrent API requests arrive with an expiring session (< 60s),
 *   they are merged into a single in-flight Promise.
 * - Guarantees that EXACTLY ONE refresh HTTP request is dispatched to GoTrue.
 * - Eliminates spurious "Invalid Refresh Token: Already Used" errors and phantom user logouts.
 * - 100% sovereign in-memory execution on Hetzner, zero US-cloud exposure.
 */
export class TokenRefreshCoordinator {
  private static instance: TokenRefreshCoordinator | null = null;

  // Key: SHA-256 hash of refreshToken -> Promise resolving to RefreshOutcome
  private inFlightRefreshes: Map<string, Promise<RefreshOutcome>> = new Map();
  private totalDispatchedRefreshes = 0;
  private totalDeduplicatedCalls = 0;

  private constructor() {}

  public static getInstance(): TokenRefreshCoordinator {
    if (!TokenRefreshCoordinator.instance) {
      TokenRefreshCoordinator.instance = new TokenRefreshCoordinator();
    }
    return TokenRefreshCoordinator.instance;
  }

  public static resetInstance(): void {
    TokenRefreshCoordinator.instance = null;
  }

  /**
   * Hashes the refresh token to a fixed-length key to save memory.
   */
  private hashKey(refreshToken: string): string {
    return crypto.createHash('sha256').update(refreshToken).digest('hex');
  }

  /**
   * Coordinates concurrent token refresh operations.
   * If a refresh for the given token is already in-flight, returns the existing Promise.
   */
  public async coordinate(
    refreshToken: string,
    executor: () => Promise<RefreshOutcome>
  ): Promise<RefreshOutcome> {
    if (!refreshToken || typeof refreshToken !== 'string') {
      return { status: 'REVOKED', error: 'INVALID_REFRESH_TOKEN' };
    }

    const key = this.hashKey(refreshToken);
    const existingPromise = this.inFlightRefreshes.get(key);

    if (existingPromise) {
      this.totalDeduplicatedCalls++;
      const outcome = await existingPromise;
      if (outcome.status === 'SUCCESS' && outcome.data) {
        return {
          ...outcome,
          data: {
            ...outcome.data,
            isReusedFlight: true
          }
        };
      }
      return outcome;
    }

    this.totalDispatchedRefreshes++;

    const flightPromise = (async () => {
      try {
        return await executor();
      } catch (err: any) {
        console.error('[TokenRefreshCoordinator] Unexpected executor error:', err);
        return {
          status: 'UPSTREAM_ERROR' as RefreshStatus,
          error: err?.message || 'UNKNOWN_REFRESH_ERROR'
        };
      } finally {
        this.inFlightRefreshes.delete(key);
      }
    })();

    this.inFlightRefreshes.set(key, flightPromise);
    return flightPromise;
  }

  /**
   * Returns current count of in-flight refresh promises.
   */
  public getInFlightCount(): number {
    return this.inFlightRefreshes.size;
  }

  /**
   * Telemetry stats.
   */
  public getStats(): { dispatched: number; deduplicated: number; inFlight: number } {
    return {
      dispatched: this.totalDispatchedRefreshes,
      deduplicated: this.totalDeduplicatedCalls,
      inFlight: this.inFlightRefreshes.size
    };
  }

  public clear(): void {
    this.inFlightRefreshes.clear();
    this.totalDispatchedRefreshes = 0;
    this.totalDeduplicatedCalls = 0;
  }
}
