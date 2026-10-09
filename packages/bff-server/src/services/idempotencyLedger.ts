import crypto from 'crypto';

export interface IdempotencyRecord {
  key: string;
  status: 'IN_FLIGHT' | 'COMPLETED';
  statusCode?: number;
  body?: any;
  headers?: Record<string, string>;
  createdAt: number;
  expiresAt: number;
  lastAccessed: number;
}

export type AcquireResult = 'ACQUIRED' | 'IN_FLIGHT' | 'COMPLETED';

export interface IdempotencyLedgerOptions {
  maxEntries?: number;
  defaultTtlMs?: number;
  inFlightTimeoutMs?: number;
  pruneIntervalMs?: number;
}

/**
 * 🛡️ IDEMPOTENCY LEDGER (OWASP ASVS LEVEL 3 & RFC 9110 / STRIPE STANDARD)
 *
 * Sovereign, in-memory anti-replay and concurrency barrier.
 * - Protects mutating BFF endpoints from duplicate network retries and race conditions.
 * - Memory-capped with LRU eviction to prevent Out-Of-Memory (OOM) DoS.
 * - Auto-releases locks on 5xx fatal errors to allow legitimate client retries.
 * - Zero US-cloud exposure: 100% sovereign in-memory execution on Hetzner.
 */
export class IdempotencyLedger {
  private static instance: IdempotencyLedger | null = null;

  private records: Map<string, IdempotencyRecord> = new Map();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;
  private readonly inFlightTimeoutMs: number;
  private pruneTimer: NodeJS.Timeout | null = null;

  constructor(options: IdempotencyLedgerOptions = {}) {
    this.maxEntries = options.maxEntries ?? Number(process.env.BFF_IDEMPOTENCY_MAX_ENTRIES || 10000);
    this.defaultTtlMs = options.defaultTtlMs ?? Number(process.env.BFF_IDEMPOTENCY_TTL_MS || 120000); // 120s
    this.inFlightTimeoutMs = options.inFlightTimeoutMs ?? 30000; // 30s lock timeout

    const pruneInterval = options.pruneIntervalMs ?? 60000; // 60s periodic cleanup
    if (typeof setInterval !== 'undefined') {
      this.pruneTimer = setInterval(() => {
        this.pruneExpired();
      }, pruneInterval);
      if (this.pruneTimer && typeof this.pruneTimer.unref === 'function') {
        this.pruneTimer.unref();
      }
    }
  }

  public static getInstance(options?: IdempotencyLedgerOptions): IdempotencyLedger {
    if (!IdempotencyLedger.instance) {
      IdempotencyLedger.instance = new IdempotencyLedger(options);
    }
    return IdempotencyLedger.instance;
  }

  /**
   * Resets the singleton instance (primarily for tests)
   */
  public static resetInstance(): void {
    if (IdempotencyLedger.instance) {
      IdempotencyLedger.instance.destroy();
      IdempotencyLedger.instance = null;
    }
  }

  /**
   * Attempts to acquire an idempotency lock for the given key.
   */
  public acquire(key: string, ttlMs?: number): AcquireResult {
    const now = Date.now();
    const existing = this.records.get(key);

    if (existing) {
      // Check if entry has expired
      if (now > existing.expiresAt) {
        this.records.delete(key);
      } else if (existing.status === 'IN_FLIGHT') {
        // Check if in-flight lock timed out (e.g. server crash or hung unhandled error)
        if (now - existing.createdAt > this.inFlightTimeoutMs) {
          // Re-acquire lock on stale in-flight request
          existing.createdAt = now;
          existing.expiresAt = now + (ttlMs ?? this.defaultTtlMs);
          existing.lastAccessed = now;
          return 'ACQUIRED';
        }
        existing.lastAccessed = now;
        return 'IN_FLIGHT';
      } else if (existing.status === 'COMPLETED') {
        // Touch LRU order
        existing.lastAccessed = now;
        this.touch(key, existing);
        return 'COMPLETED';
      }
    }

    // Enforce memory capacity limit (LRU eviction)
    this.ensureCapacity();

    const recordTtl = ttlMs ?? this.defaultTtlMs;
    const newRecord: IdempotencyRecord = {
      key,
      status: 'IN_FLIGHT',
      createdAt: now,
      expiresAt: now + recordTtl,
      lastAccessed: now
    };

    this.records.set(key, newRecord);
    return 'ACQUIRED';
  }

  /**
   * Marks an in-flight operation as completed and caches the response.
   */
  public complete(
    key: string,
    statusCode: number,
    body: any,
    headers?: Record<string, string>,
    ttlMs?: number
  ): void {
    const now = Date.now();
    const existing = this.records.get(key);
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;

    const record: IdempotencyRecord = {
      key,
      status: 'COMPLETED',
      statusCode,
      body,
      headers: headers ?? {},
      createdAt: existing ? existing.createdAt : now,
      expiresAt: now + effectiveTtl,
      lastAccessed: now
    };

    this.records.set(key, record);
    this.touch(key, record);
  }

  /**
   * Releases an idempotency lock immediately.
   * Crucial for 5xx server errors or unhandled exceptions to allow clients to retry.
   */
  public release(key: string): void {
    this.records.delete(key);
  }

  /**
   * Retrieves an idempotency record if present and not expired.
   */
  public get(key: string): IdempotencyRecord | null {
    const record = this.records.get(key);
    if (!record) return null;

    if (Date.now() > record.expiresAt) {
      this.records.delete(key);
      return null;
    }

    record.lastAccessed = Date.now();
    this.touch(key, record);
    return record;
  }

  /**
   * Checks if an active (non-expired) key exists.
   */
  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Computes a deterministic SHA-256 fingerprint for a request.
   * Combines client IP, HTTP method, route, and sorted JSON body.
   */
  public computeFingerprint(
    ip: string,
    method: string,
    path: string,
    body?: any
  ): string {
    const normalizedIp = (ip || '0.0.0.0').trim().toLowerCase();
    const normalizedMethod = (method || 'GET').trim().toUpperCase();
    const normalizedPath = (path || '/').trim().toLowerCase();

    let serializedBody = '';
    if (body !== undefined && body !== null) {
      if (typeof body === 'object') {
        serializedBody = this.deterministicStringify(body);
      } else {
        serializedBody = String(body);
      }
    }

    const payload = `${normalizedIp}|${normalizedMethod}|${normalizedPath}|${serializedBody}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Sorts object keys recursively to ensure deterministic serialization regardless of key order.
   */
  public deterministicStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      return `[${obj.map((item) => this.deterministicStringify(item)).join(',')}]`;
    }

    const keys = Object.keys(obj).sort();
    const entries = keys.map((key) => {
      const val = this.deterministicStringify(obj[key]);
      return `${JSON.stringify(key)}:${val}`;
    });

    return `{${entries.join(',')}}`;
  }

  /**
   * Prunes all expired records from memory.
   */
  public pruneExpired(): number {
    const now = Date.now();
    let prunedCount = 0;

    for (const [key, record] of this.records.entries()) {
      if (now > record.expiresAt) {
        this.records.delete(key);
        prunedCount++;
      }
    }

    return prunedCount;
  }

  /**
   * Returns current active record count.
   */
  public size(): number {
    return this.records.size;
  }

  /**
   * Clears all records.
   */
  public clear(): void {
    this.records.clear();
  }

  /**
   * Stops background interval timer.
   */
  public destroy(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
    this.clear();
  }

  /**
   * Refreshes the insertion order in Map for LRU tracking.
   */
  private touch(key: string, record: IdempotencyRecord): void {
    this.records.delete(key);
    this.records.set(key, record);
  }

  /**
   * Evicts the oldest entry if maxEntries capacity is reached.
   */
  private ensureCapacity(): void {
    if (this.records.size >= this.maxEntries) {
      // First try to prune any expired entries
      const pruned = this.pruneExpired();
      if (pruned > 0 && this.records.size < this.maxEntries) {
        return;
      }

      // If still full, evict oldest entry (first key in map)
      const oldestKey = this.records.keys().next().value;
      if (oldestKey !== undefined) {
        this.records.delete(oldestKey);
      }
    }
  }
}
