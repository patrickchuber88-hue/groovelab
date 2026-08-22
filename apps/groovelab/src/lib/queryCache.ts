/**
 * ⚡ Enterprise+ In-Memory Query & Stale-While-Revalidate (SWR) Cache Engine
 * Platform: Campus-Groovelab (https://campus-groovelab.de)
 * 
 * Provides:
 * 1. 0ms instant rendering from in-memory cache for static and semi-static school catalog data.
 * 2. Request Coalescing (Deduplication): Prevents redundant identical queries when multiple components mount concurrently.
 * 3. Transparent background revalidation (Stale-While-Revalidate) without UI disruption.
 * 4. Granular cache invalidation on database mutations (e.g. room created/updated).
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

interface CacheOptions {
  ttlMs?: number;                  // How long the data is considered completely fresh (default: 2 minutes)
  staleWhileRevalidate?: boolean;  // Return cached data immediately, then fetch in background if stale (default: true)
}

class QueryCacheEngine {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlightRequests = new Map<string, Promise<any>>();

  /**
   * Fetches data with SWR caching and request coalescing.
   */
  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttlMs = 120_000, staleWhileRevalidate = true } = options;
    const now = Date.now();
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    // 1. Fresh Cache Hit -> return immediately
    if (entry && now - entry.timestamp < entry.ttlMs) {
      return entry.data;
    }

    // 2. Stale Cache Hit -> return cached data immediately and trigger background revalidation
    if (entry && staleWhileRevalidate) {
      this.revalidateInBackground(key, fetcher, ttlMs);
      return entry.data;
    }

    // 3. Cache Miss -> Deduplicate in-flight requests or execute
    return this.executeWithDeduplication(key, fetcher, ttlMs);
  }

  /**
   * Executes fetcher while reusing any active in-flight Promise for the same key.
   */
  private async executeWithDeduplication<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number
  ): Promise<T> {
    const active = this.inFlightRequests.get(key);
    if (active) {
      return active as Promise<T>;
    }

    const promise = (async () => {
      try {
        const data = await fetcher();
        if (data !== undefined && data !== null) {
          this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttlMs,
          });
        }
        return data;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, promise);
    return promise;
  }

  /**
   * Revalidates stale cache entry asynchronously in the background.
   */
  private revalidateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number
  ): void {
    if (this.inFlightRequests.has(key)) return;

    this.executeWithDeduplication(key, fetcher, ttlMs).catch((err) => {
      console.warn(`[QueryCache] Background revalidation failed for key "${key}":`, err);
    });
  }

  /**
   * Manually sets or primes a cache entry.
   */
  set<T>(key: string, data: T, ttlMs = 120_000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs,
    });
  }

  /**
   * Reads raw cache entry synchronously without triggering network calls.
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    return entry?.data as T | undefined;
  }

  /**
   * Invalidates a specific cache key.
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.inFlightRequests.delete(key);
  }

  /**
   * Invalidates all cache keys matching a prefix (e.g. "rooms:", "lehrwerke:").
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        this.inFlightRequests.delete(key);
      }
    }
  }

  /**
   * Clears the entire cache.
   */
  clear(): void {
    this.cache.clear();
    this.inFlightRequests.clear();
  }
}

// Global Singleton Instance
export const queryCache = new QueryCacheEngine();

// Top-level convenience functions
export const cachedQuery = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> => queryCache.fetch(key, fetcher, options);

export const invalidateCacheKey = (key: string): void => queryCache.invalidate(key);
export const invalidateCachePrefix = (prefix: string): void => queryCache.invalidatePrefix(prefix);
export const clearQueryCache = (): void => queryCache.clear();
