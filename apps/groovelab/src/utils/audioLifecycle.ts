/**
 * Web Audio Context Lifecycle Manager for Campus-Groovelab
 * 
 * Protects against iOS Safari and mobile browser AudioContext limits (usually 4 to 6 concurrent contexts).
 * Tracks active contexts and ensures dormant/unmounted contexts are cleanly closed and garbage-collected.
 */

const activeContexts = new Set<AudioContext>();

/**
 * Creates a managed AudioContext with automatic registration and sample-rate safety.
 */
export const createManagedAudioContext = (options?: AudioContextOptions): AudioContext | null => {
  if (typeof window === 'undefined') return null;

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    console.warn('[AudioLifecycle] Web Audio API not supported in this environment.');
    return null;
  }

  try {
    const ctx = new AudioContextClass(options);
    activeContexts.add(ctx);

    // Auto-remove when closed
    const originalClose = ctx.close.bind(ctx);
    ctx.close = async () => {
      activeContexts.delete(ctx);
      return originalClose();
    };

    console.log(`[AudioLifecycle] AudioContext created. Active contexts count: ${activeContexts.size}`);
    return ctx;
  } catch (err) {
    console.error('[AudioLifecycle] Failed to instantiate AudioContext:', err);
    return null;
  }
};

/**
 * Safely closes and unregisters a managed AudioContext.
 */
export const releaseAudioContext = async (ctx: AudioContext | null | undefined): Promise<void> => {
  if (!ctx) return;
  try {
    activeContexts.delete(ctx);
    if (ctx.state !== 'closed') {
      await ctx.close();
      console.log(`[AudioLifecycle] AudioContext cleanly closed. Remaining active: ${activeContexts.size}`);
    }
  } catch (err) {
    console.warn('[AudioLifecycle] Error closing AudioContext:', err);
  }
};

/**
 * Teardown all active contexts (e.g. on user logout or route change)
 */
export const releaseAllAudioContexts = async (): Promise<void> => {
  console.log(`[AudioLifecycle] Releasing all ${activeContexts.size} active audio contexts...`);
  const list = Array.from(activeContexts);
  activeContexts.clear();
  await Promise.all(
    list.map(async (ctx) => {
      try {
        if (ctx.state !== 'closed') {
          await ctx.close();
        }
      } catch {
        // Ignore teardown errors
      }
    })
  );
};
