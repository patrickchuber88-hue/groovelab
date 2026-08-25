/**
 * Tier-1 SaaS Circuit Breaker & Adaptive Throttling
 * Campus-Groovelab Enterprise+ Architecture
 * 
 * Protects database connection poolers (Supavisor / PgBouncer) during massive registration
 * spikes (e.g. September school start) by fast-failing and transparently serving from local cache.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold?: number;     // Number of failures before tripping (Default: 3)
  cooldownMs?: number;            // How long to stay open before half-open probe (Default: 6000ms)
  timeoutMs?: number;             // Request timeout threshold (Default: 8000ms)
}

class DatabaseCircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly timeoutMs: number;

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold || 5;
    this.cooldownMs = options?.cooldownMs || 4000;
    this.timeoutMs = options?.timeoutMs || 15000;
  }

  public getState(): CircuitState {
    const now = Date.now();
    // Decay failures if no failure occurred in the last 20 seconds
    if (this.state === 'CLOSED' && this.failureCount > 0 && now - this.lastFailureTime > 20000) {
      this.failureCount = 0;
    }

    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime > this.cooldownMs) {
        this.state = 'HALF_OPEN';
        console.info('[CircuitBreaker] Entering HALF_OPEN state. Probing database health...');
      }
    }
    return this.state;
  }

  public recordSuccess(): void {
    if (this.state !== 'CLOSED') {
      console.info('[CircuitBreaker] Health probe successful. Resetting state to CLOSED.');
    }
    this.state = 'CLOSED';
    this.failureCount = 0;
  }

  public recordFailure(err?: any): void {
    const errMsg = err?.message || String(err || '');
    const isAbort = err?.name === 'AbortError' || errMsg.includes('AbortError') || errMsg.includes('aborted');
    if (isAbort) {
      // Client-side cancellation or component unmount should not trip the server circuit breaker
      return;
    }

    const now = Date.now();
    // Reset count if previous failure was long ago
    if (this.state === 'CLOSED' && now - this.lastFailureTime > 20000) {
      this.failureCount = 0;
    }

    this.failureCount++;
    this.lastFailureTime = now;
    
    console.warn(`[CircuitBreaker] DB Failure recorded (${this.failureCount}/${this.failureThreshold}):`, errMsg);

    if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      console.error(`[CircuitBreaker] Circuit TRIPPED to OPEN. Throttling requests for ${this.cooldownMs}ms to protect server.`);
    }
  }

  public async execute<T>(fn: (signal?: AbortSignal) => Promise<T>, fallbackFn?: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      console.warn('[CircuitBreaker] Circuit is OPEN. Fast-failing to cache fallback.');
      if (fallbackFn) {
        return fallbackFn();
      }
      throw new Error('DATABASE_CIRCUIT_OPEN: Der Server ist vorübergehend ausgelastet. Lokaler Offline-Schutz ist aktiv.');
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : null;

    try {
      const result = await fn(controller?.signal);
      if (timeoutId) clearTimeout(timeoutId);
      this.recordSuccess();
      return result;
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      this.recordFailure(err);

      if (fallbackFn) {
        console.info('[CircuitBreaker] Request failed, executing provided fallback...');
        return fallbackFn();
      }
      throw err;
    }
  }
}

export const dbCircuitBreaker = new DatabaseCircuitBreaker({
  failureThreshold: 5,
  cooldownMs: 4000,
  timeoutMs: 15000
});
