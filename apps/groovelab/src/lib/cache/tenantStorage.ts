/**
 * ==============================================================================
 * 🛡️ Campus-Groovelab Enterprise Tenant-Scoped Cache & Storage Engine
 * Standard: OWASP ASVS Level 3 / Multi-Tenancy Client-Isolation (Punkt 11)
 * ==============================================================================
 * Enforces strict namespacing across client storage (localStorage / sessionStorage)
 * to prevent Cross-Tenant data leaks on shared devices (school tablets, family devices).
 * Pattern: `cg:${schoolId}:${userId}:${key}:v1`
 */

export interface TenantStorageContext {
  schoolId: string;
  userId: string;
}

export class TenantStorage {
  private static PREFIX = 'cg';
  private static VERSION = 'v1';

  /**
   * Builds an immutable, tenant-scoped storage key
   */
  public static buildKey(ctx: TenantStorageContext, key: string): string {
    const sId = ctx.schoolId || 'global';
    const uId = ctx.userId || 'anon';
    return `${this.PREFIX}:${sId}:${uId}:${key}:${this.VERSION}`;
  }

  /**
   * Safely writes JSON serialized payload to scoped localStorage
   */
  public static setItem<T>(ctx: TenantStorageContext, key: string, value: T): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      const fullKey = this.buildKey(ctx, key);
      const payload = JSON.stringify({
        data: value,
        schoolId: ctx.schoolId,
        userId: ctx.userId,
        timestamp: Date.now(),
      });
      window.localStorage.setItem(fullKey, payload);
      return true;
    } catch (e) {
      console.warn('[TenantStorage] Failed to set item:', key, e);
      return false;
    }
  }

  /**
   * Safely reads and parses scoped JSON payload, validating tenant ownership
   */
  public static getItem<T>(ctx: TenantStorageContext, key: string): T | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const fullKey = this.buildKey(ctx, key);
      const raw = window.localStorage.getItem(fullKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      // Hard Fail-Closed Check: If tenant mismatch in stored object, purge and deny
      if (parsed.schoolId !== ctx.schoolId || parsed.userId !== ctx.userId) {
        console.error('[TenantStorage] Tampered or cross-tenant key detected. Purging:', fullKey);
        window.localStorage.removeItem(fullKey);
        return null;
      }

      return parsed.data as T;
    } catch (e) {
      console.warn('[TenantStorage] Failed to read item:', key, e);
      return null;
    }
  }

  /**
   * Removes a single scoped key
   */
  public static removeItem(ctx: TenantStorageContext, key: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const fullKey = this.buildKey(ctx, key);
      window.localStorage.removeItem(fullKey);
    } catch (e) {
      console.warn('[TenantStorage] Failed to remove item:', key, e);
    }
  }

  /**
   * Purges all keys belonging to a specific school tenant or user on logout
   */
  public static purgeTenant(schoolId: string, userId?: string): number {
    if (typeof window === 'undefined' || !window.localStorage) return 0;
    let purgedCount = 0;
    try {
      const targetPrefix = userId 
        ? `${this.PREFIX}:${schoolId}:${userId}:`
        : `${this.PREFIX}:${schoolId}:`;

      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(targetPrefix)) {
          keysToRemove.push(k);
        }
      }

      for (const k of keysToRemove) {
        window.localStorage.removeItem(k);
        purgedCount++;
      }
    } catch (e) {
      console.warn('[TenantStorage] Error during tenant purge:', e);
    }
    return purgedCount;
  }
}
