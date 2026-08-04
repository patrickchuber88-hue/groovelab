// Time-To-Live (TTL) Storage Wrapper for Campus-Groovelab
// Prevents stale LocalStorage profiles from remaining cached indefinitely

export interface TTLCacheItem<T> {
  value: T;
  expiresAt: number;
}

/**
 * Stores an item in localStorage with an automatic Time-To-Live (default 24 hours).
 */
export function setItemWithTTL<T>(key: string, value: T, ttlMs: number = 24 * 60 * 60 * 1000): void {
  if (typeof window === 'undefined') return;
  try {
    const item: TTLCacheItem<T> = {
      value,
      expiresAt: Date.now() + ttlMs,
    };
    localStorage.setItem(key, JSON.stringify(item));
  } catch (err) {
    console.error(`[TTLCache] Failed to save key ${key}:`, err);
  }
}

/**
 * Retrieves an item from localStorage, automatically removing it if expired.
 */
export function getItemWithTTL<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed: TTLCacheItem<T> = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.expiresAt) {
      return null;
    }

    if (Date.now() > parsed.expiresAt) {
      console.log(`[TTLCache] Item ${key} expired. Clearing stale cache.`);
      localStorage.removeItem(key);
      return null;
    }

    return parsed.value;
  } catch (err) {
    console.warn(`[TTLCache] Failed to parse key ${key}:`, err);
    return null;
  }
}
