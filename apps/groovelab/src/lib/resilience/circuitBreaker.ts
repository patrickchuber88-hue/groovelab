/**
 * ==============================================================================
 * 🛡️ Campus-Groovelab Enterprise API Circuit Breaker Engine
 * Standard: Resilienz & Fail-Fast Protection (Punkt 95)
 * ==============================================================================
 * Protects downstream microservices and external gateways (SMTP, calendar feeds, webhooks)
 * from cascading thread exhaustion and connection pool leaks.
 * States:
 *  - CLOSED: Normal operation, requests pass through.
 *  - OPEN: Threshold exceeded, requests fail immediately without blocking connections.
 *  - HALF_OPEN: Cooldown expired, trial requests test if downstream service has recovered.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Failures before opening circuit (default: 3)
  cooldownPeriodMs?: number; // Time in OPEN state before testing (default: 30,000ms)
  timeoutMs?: number; // Timeout per individual execution (default: 5,000ms)
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly cooldownPeriodMs: number;
  private readonly timeoutMs: number;

  constructor(private name: string, options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownPeriodMs = options.cooldownPeriodMs ?? 30000;
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  public getState(): CircuitState {
    this.evaluateState();
    return this.state;
  }

  private evaluateState(): void {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.cooldownPeriodMs) {
        this.state = 'HALF_OPEN';
      }
    }
  }

  /**
   * Executes an async operation wrapped with circuit breaking and timeout protection
   */
  public async execute<T>(action: () => Promise<T>): Promise<T> {
    this.evaluateState();

    if (this.state === 'OPEN') {
      throw new Error(`[CircuitBreaker:${this.name}] Circuit is OPEN. Fast-failing to preserve backend threads.`);
    }

    let timer: NodeJS.Timeout | undefined;

    try {
      // Race the action against timeoutMs
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`[CircuitBreaker:${this.name}] Execution timed out after ${this.timeoutMs}ms.`));
        }, this.timeoutMs);
      });

      const result = await Promise.race([action(), timeoutPromise]);

      if (timer) clearTimeout(timer);
      this.onSuccess();
      return result;
    } catch (err) {
      if (timer) clearTimeout(timer);
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN' || this.failureCount > 0) {
      this.state = 'CLOSED';
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`[CircuitBreaker:${this.name}] Failure threshold reached (${this.failureCount}). Circuit transitioned to OPEN.`);
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}
