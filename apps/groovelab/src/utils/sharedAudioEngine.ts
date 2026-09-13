/**
 * Campus-Groovelab Shared Audio Engine Singleton
 * 
 * Implements the Tier-1 WebAudio Lifecycle Standard for iOS Safari, WebKit, and Chromium:
 * - Single persistent AudioContext to respect Apple WebKit's 4-6 context hardware limit.
 * - Global zero-touch gesture unlocking on first pointer/touch event.
 * - Tab visibility lifecycle management (auto-suspend in background to preserve battery, auto-resume on foreground).
 * - Dedicated OfflineAudioContext helper for zero-hardware DSP renders.
 */

export class SharedAudioEngine {
  private static instance: AudioContext | null = null;
  private static isUnlocked = false;
  private static isVisibilityListenerAttached = false;
  private static silentAudioElement: HTMLAudioElement | null = null;
  private static activePracticeSessionCount = 0;

  /**
   * 📱 iOS Safari Silent Audio Loop for Hardware Mute Switch Bypass.
   * Forces Apple WebKit to route WebAudio to the 'Playback' category
   * instead of 'Ambient' (which is muted by the physical silence switch).
   * 
   * STRICT ENTERPRISE LEITPLANKE:
   * - Only active while a practice session, metronome or timer is running!
   * - Immediately paused and unloaded when stopping (0% battery drain in idle).
   */
  public static startSessionAudioBypass(): void {
    if (typeof window === 'undefined') return;
    this.activePracticeSessionCount++;

    if (this.silentAudioElement) return;

    try {
      const audio = document.createElement('audio');
      // Tiny valid 1-frame silent MP3 data URI
      audio.src = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAACcQCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      audio.loop = true;
      audio.volume = 0.001;
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
      this.silentAudioElement = audio;
    } catch (e) {
      console.warn('[SharedAudioEngine] Could not start session audio bypass:', e);
    }
  }

  /**
   * Immediately stops and disposes of the silent audio loop to preserve iPhone battery.
   */
  public static stopSessionAudioBypass(): void {
    if (this.activePracticeSessionCount > 0) {
      this.activePracticeSessionCount--;
    }

    if (this.activePracticeSessionCount <= 0 && this.silentAudioElement) {
      try {
        this.silentAudioElement.pause();
        this.silentAudioElement.removeAttribute('src');
        this.silentAudioElement.load();
      } catch (e) {}
      this.silentAudioElement = null;
      this.activePracticeSessionCount = 0;
    }
  }

  /**
   * Returns the shared singleton AudioContext instance.
   * Auto-resumes if in suspended state.
   */
  public static getContext(): AudioContext {
    if (typeof window === 'undefined') {
      throw new Error('[SharedAudioEngine] Window is undefined (SSR environment)');
    }

    if (!this.instance || this.instance.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('[SharedAudioEngine] Web Audio API is not supported in this browser.');
      }

      try {
        this.instance = new AudioContextClass({
          latencyHint: 'interactive'
        });
      } catch {
        this.instance = new AudioContextClass();
      }

      this.attachLifecycleListeners(this.instance);
    }

    if (this.instance.state === 'suspended') {
      this.instance.resume().catch(() => {});
    }

    return this.instance;
  }

  /**
   * Global iOS Safari / WebKit Audio Unlocker:
   * iOS mutes WebAudio until a user gesture triggers resume().
   * This installs passive, lightweight listeners that clean up after the first trigger.
   */
  public static initAutoUnlock(): void {
    if (this.isUnlocked || typeof window === 'undefined') return;

    const unlockEvents = ['touchstart', 'touchend', 'pointerdown', 'keydown'];

    const unlockHandler = () => {
      try {
        const ctx = this.getContext();
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            this.isUnlocked = true;
          }).catch(() => {});
        } else if (ctx.state === 'running') {
          this.isUnlocked = true;
        }

        if (this.isUnlocked) {
          unlockEvents.forEach(evt => {
            window.removeEventListener(evt, unlockHandler);
          });
        }
      } catch {
        // Safe ignore
      }
    };

    unlockEvents.forEach(evt => {
      window.addEventListener(evt, unlockHandler, { passive: true, once: false });
    });
  }

  /**
   * Attaches background/foreground listeners to conserve power and avoid audio glitches.
   */
  private static attachLifecycleListeners(ctx: AudioContext): void {
    if (this.isVisibilityListenerAttached || typeof document === 'undefined') return;
    this.isVisibilityListenerAttached = true;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Tab moved to background: suspend context if running to avoid draining battery
        if (ctx.state === 'running') {
          ctx.suspend().catch(() => {});
        }
      } else {
        // Tab returned to foreground: resume context
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      }
    });
  }

  /**
   * Creates a dedicated OfflineAudioContext for deterministic, non-realtime DSP calculations.
   * OfflineAudioContext instances do not consume hardware DAC slots and are automatically
   * collected after startRendering() completes.
   */
  public static createOfflineContext(
    numberOfChannels: number = 2,
    length: number,
    sampleRate: number = 48000
  ): OfflineAudioContext {
    return new OfflineAudioContext(numberOfChannels, Math.max(1, length), sampleRate);
  }

  /**
   * Explicitly unlocks the AudioContext upon user gesture.
   */
  public static async unlock(): Promise<void> {
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      this.isUnlocked = true;
    } catch (e) {
      console.warn('[SharedAudioEngine] Unlock error:', e);
    }
  }

  /**
   * Closes and cleans up the active context if needed.
   */
  public static async close(): Promise<void> {
    if (this.instance && this.instance.state !== 'closed') {
      try {
        await this.instance.close();
      } catch {}
      this.instance = null;
    }
  }
}

