/**
 * Campus-Groovelab Heartbeat & Background Polling Orchestrator
 * 
 * 1% Goldstandard Battery & Network Hygiene:
 * - Automatically pauses background timers when app is hidden / phone locked
 * - Fires consolidated wake-up sync when returning to foreground
 * - Prevents uncoordinated polling stampedes and cuts mobile radio battery drain
 */

export interface HeartbeatJob {
  id: string;
  intervalMs: number;
  onTick: () => void | Promise<void>;
  runImmediatelyOnWakeup?: boolean;
}

class HeartbeatOrchestratorManager {
  private static instance: HeartbeatOrchestratorManager | null = null;
  private jobs: Map<string, HeartbeatJob> = new Map();
  private activeTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private isVisible: boolean = true;

  private constructor() {
    this.initVisibilityListener();
  }

  public static getInstance(): HeartbeatOrchestratorManager {
    if (!HeartbeatOrchestratorManager.instance) {
      HeartbeatOrchestratorManager.instance = new HeartbeatOrchestratorManager();
    }
    return HeartbeatOrchestratorManager.instance;
  }

  private initVisibilityListener(): void {
    if (typeof document === 'undefined') return;

    this.isVisible = document.visibilityState === 'visible';

    document.addEventListener('visibilitychange', () => {
      const currentlyVisible = document.visibilityState === 'visible';
      if (currentlyVisible === this.isVisible) return;
      this.isVisible = currentlyVisible;

      if (this.isVisible) {
        this.handleForegroundWakeup();
      } else {
        this.handleBackgroundSleep();
      }
    });
  }

  private handleForegroundWakeup(): void {
    console.info('[HeartbeatOrchestrator] App entered foreground. Resuming active heartbeat intervals & triggering wake-up jobs...');
    
    this.jobs.forEach(job => {
      // 1. Trigger immediate wake-up if requested
      if (job.runImmediatelyOnWakeup) {
        try {
          const res = job.onTick();
          if (res && typeof (res as any).catch === 'function') {
            (res as any).catch((err: any) => console.warn(`[HeartbeatOrchestrator] Wake-up tick failed for ${job.id}:`, err));
          }
        } catch (err) {
          console.warn(`[HeartbeatOrchestrator] Wake-up tick exception for ${job.id}:`, err);
        }
      }

      // 2. Restart interval
      this.startJobInterval(job);
    });
  }

  private handleBackgroundSleep(): void {
    console.info('[HeartbeatOrchestrator] App entered background. Suspending all background polling timers to preserve mobile battery.');
    this.activeTimers.forEach(timer => clearInterval(timer));
    this.activeTimers.clear();
  }

  private startJobInterval(job: HeartbeatJob): void {
    if (!this.isVisible) return; // Do not start if currently in background

    // Clear existing timer if any
    const existing = this.activeTimers.get(job.id);
    if (existing) clearInterval(existing);

    const timer = setInterval(() => {
      if (!this.isVisible) return;
      try {
        job.onTick();
      } catch (err) {
        console.warn(`[HeartbeatOrchestrator] Interval tick exception for ${job.id}:`, err);
      }
    }, job.intervalMs);

    this.activeTimers.set(job.id, timer);
  }

  /**
   * Registers a background task.
   */
  public registerJob(job: HeartbeatJob): () => void {
    this.jobs.set(job.id, job);
    if (this.isVisible) {
      this.startJobInterval(job);
    }

    return () => {
      this.unregisterJob(job.id);
    };
  }

  public unregisterJob(jobId: string): void {
    const timer = this.activeTimers.get(jobId);
    if (timer) {
      clearInterval(timer);
      this.activeTimers.delete(jobId);
    }
    this.jobs.delete(jobId);
  }

  public isAppVisible(): boolean {
    return this.isVisible;
  }
}

export const heartbeatOrchestrator = HeartbeatOrchestratorManager.getInstance();

export const registerHeartbeatJob = (job: HeartbeatJob): (() => void) => {
  return heartbeatOrchestrator.registerJob(job);
};
