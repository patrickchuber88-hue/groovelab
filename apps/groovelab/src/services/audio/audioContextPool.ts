/**
 * ==============================================================================
 * 🎵 Campus-Groovelab Universal AudioContext Pool (0.1% Goldstandard 2027)
 * OWASP ASVS Level 3 / Fail-Safe / Hardware DSP & Battery Optimization Engine
 * ==============================================================================
 * 
 * Bounded Context: Audio Subsystem & Hardware DSP Lifecycle Management
 * 
 * Invariants:
 * 1. Hardware Ceiling Protection: Max 1 global AudioContext instance per browser tab.
 *    (Eliminates the iOS Safari / Chromium 6-instance limit exhaustion).
 * 2. Smart Battery & Clock Management: Automatically suspends AudioContext after 15s
 *    of zero active leases to stop hardware audio clocks and conserve power.
 * 3. Instant Reactivation: Resumes immediately upon acquiring a lease or synthesizing audio.
 * 4. User Gesture Unlock: Transparently binds to initial user interactions to lift
 *    browser autoplay policy restrictions.
 * 5. Safe Decoding: Robust decodeAudioData wrapper supporting both Promise and callback specs.
 */

export type AudioLeaseToken = string;

export interface AudioContextMetrics {
  state: AudioContextState | 'uninitialized';
  sampleRate: number;
  activeLeases: string[];
  leaseCount: number;
  isSuspended: boolean;
  currentTime: number;
}

class AudioContextPoolManager {
  private static instance: AudioContextPoolManager | null = null;
  private ctx: AudioContext | null = null;
  private activeLeases: Map<string, number> = new Map();
  private suspendTimer: ReturnType<typeof setTimeout> | null = null;
  private unlockListenersAttached: boolean = false;
  private readonly AUTO_SUSPEND_DELAY_MS = 15000;

  private constructor() {
    this.setupUserGestureUnlock();
  }

  public static getInstance(): AudioContextPoolManager {
    if (!AudioContextPoolManager.instance) {
      AudioContextPoolManager.instance = new AudioContextPoolManager();
    }
    return AudioContextPoolManager.instance;
  }

  /**
   * One-time user interaction listener to unlock AudioContext on iOS/Chrome autoplay restrictions
   */
  private setupUserGestureUnlock(): void {
    if (typeof window === 'undefined' || this.unlockListenersAttached) return;

    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended' && this.activeLeases.size > 0) {
        this.ctx.resume().catch(() => {});
      }
      // Remove listeners once invoked
      ['touchstart', 'touchend', 'mousedown', 'keydown'].forEach(evt => {
        window.removeEventListener(evt, unlock, true);
      });
      this.unlockListenersAttached = false;
    };

    ['touchstart', 'touchend', 'mousedown', 'keydown'].forEach(evt => {
      window.addEventListener(evt, unlock, { capture: true, once: true, passive: true });
    });
    this.unlockListenersAttached = true;
  }

  /**
   * Returns or initializes the shared AudioContext instance.
   * Auto-resumes if suspended.
   */
  public getSharedAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return null;
        this.ctx = new AudioContextClass();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      return this.ctx;
    } catch (err) {
      console.warn('[AudioContextPool] Failed to create or resume AudioContext:', err);
      return null;
    }
  }

  /**
   * Acquires a lease on the shared AudioContext for a specific component or service.
   * Cancels any pending auto-suspend timer and ensures the hardware clock is running.
   */
  public async acquireAudioLease(clientName: string): Promise<AudioContext | null> {
    const currentCount = this.activeLeases.get(clientName) || 0;
    this.activeLeases.set(clientName, currentCount + 1);

    // Cancel pending auto-suspend
    if (this.suspendTimer) {
      clearTimeout(this.suspendTimer);
      this.suspendTimer = null;
    }

    const ctx = this.getSharedAudioContext();
    if (!ctx) return null;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (err) {
        console.warn(`[AudioContextPool] Resume error for client "${clientName}":`, err);
      }
    }

    return ctx;
  }

  /**
   * Releases an active lease. When active leases reach zero, a 15-second countdown
   * is started before suspending the context to conserve device resources.
   */
  public releaseAudioLease(clientName: string): void {
    const currentCount = this.activeLeases.get(clientName) || 0;
    if (currentCount <= 1) {
      this.activeLeases.delete(clientName);
    } else {
      this.activeLeases.set(clientName, currentCount - 1);
    }

    // If zero active leases remain across the whole system, schedule power-saving suspend
    if (this.activeLeases.size === 0 && this.ctx && this.ctx.state === 'running') {
      if (this.suspendTimer) {
        clearTimeout(this.suspendTimer);
      }
      this.suspendTimer = setTimeout(() => {
        if (this.activeLeases.size === 0 && this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
        this.suspendTimer = null;
      }, this.AUTO_SUSPEND_DELAY_MS);
    }
  }

  /**
   * Decodes an ArrayBuffer into an AudioBuffer safely across all browser generations.
   */
  public async safeDecodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    const ctx = this.getSharedAudioContext();
    if (!ctx) {
      throw new Error('Web Audio API is unavailable in this environment.');
    }

    return new Promise<AudioBuffer>((resolve, reject) => {
      // Standard modern Promise-based decodeAudioData
      const promise = ctx.decodeAudioData(
        arrayBuffer.slice(0),
        (decoded) => resolve(decoded),
        (error) => reject(error)
      );

      // In case decodeAudioData returns a native Promise (Chrome / Safari 14+)
      if (promise && typeof promise.then === 'function') {
        promise.then(resolve).catch(reject);
      }
    });
  }

  /**
   * Dispatches a quick audio cue (e.g. messenger chime, haptic beep) without requiring
   * a long-lived component lease.
   */
  public async playImmediateSound(synthFn: (ctx: AudioContext) => void): Promise<void> {
    try {
      const ctx = this.getSharedAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }
      synthFn(ctx);
    } catch (err) {
      // Audio cue failure must never crash user operations
      console.warn('[AudioContextPool] playImmediateSound failed safely:', err);
    }
  }

  /**
   * Current forensic diagnostics for audit and performance monitoring.
   */
  public getMetrics(): AudioContextMetrics {
    return {
      state: this.ctx ? this.ctx.state : 'uninitialized',
      sampleRate: this.ctx ? this.ctx.sampleRate : 0,
      activeLeases: Array.from(this.activeLeases.keys()),
      leaseCount: Array.from(this.activeLeases.values()).reduce((sum, n) => sum + n, 0),
      isSuspended: this.ctx ? this.ctx.state === 'suspended' : true,
      currentTime: this.ctx ? this.ctx.currentTime : 0
    };
  }

  /**
   * Explicitly closes and destroys the AudioContext (used in test teardowns or full app resets).
   */
  public async destroy(): Promise<void> {
    if (this.suspendTimer) {
      clearTimeout(this.suspendTimer);
      this.suspendTimer = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        await this.ctx.close();
      } catch (err) {
        console.warn('[AudioContextPool] Error closing AudioContext:', err);
      }
    }
    this.ctx = null;
    this.activeLeases.clear();
  }
}

export const audioContextPool = AudioContextPoolManager.getInstance();

export const getSharedAudioContext = (): AudioContext | null =>
  audioContextPool.getSharedAudioContext();

export const acquireAudioLease = (clientName: string): Promise<AudioContext | null> =>
  audioContextPool.acquireAudioLease(clientName);

export const releaseAudioLease = (clientName: string): void =>
  audioContextPool.releaseAudioLease(clientName);

export const safeDecodeAudioData = (arrayBuffer: ArrayBuffer): Promise<AudioBuffer> =>
  audioContextPool.safeDecodeAudioData(arrayBuffer);

export const playImmediateSound = (synthFn: (ctx: AudioContext) => void): Promise<void> =>
  audioContextPool.playImmediateSound(synthFn);
