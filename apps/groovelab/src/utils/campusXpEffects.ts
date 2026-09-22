/**
 * 🌟 Campus-Groovelab 1% Goldstandard XP Effects & Sound Engine
 * 
 * Provides:
 * - Pure WebAudio triumphant arpeggio chime (Zero network latency, no external mp3 assets)
 * - requestAnimationFrame easeOutCubic animated counter
 * - Keyframes & CSS styles for the golden deposit pulse & floating XP badge
 */

/**
 * Plays a shimmering, harmonic C-Major arpeggio chime to celebrate XP deposits
 */
export const playTriumphantXpChime = (): void => {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // Harmonic C-Major Arpeggio (C5 -> E5 -> G5 -> C6) with golden chime acoustics
    const notes = [
      { freq: 523.25, time: 0.00, duration: 0.45 },
      { freq: 659.25, time: 0.09, duration: 0.48 },
      { freq: 783.99, time: 0.18, duration: 0.55 },
      { freq: 1046.50, time: 0.27, duration: 0.90 },
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      // Bell / Marimba acoustic envelope
      gain.gain.setValueAtTime(0.0001, now + time);
      gain.gain.exponentialRampToValueAtTime(0.20, now + time + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration + 0.05);
    });

    // Auto-close context after chime ends to prevent browser audio leaks
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1600);
  } catch (_) {
    // Fail-safe: Silent degradation on restricted browser contexts
  }
};

/**
 * Animates a numeric XP counter from startXp to endXp smoothly over durationMs
 * Returns a cleanup cancellation function
 */
export const animateXpCountUp = (
  startXp: number,
  endXp: number,
  durationMs: number = 1200,
  onUpdate: (value: number) => void,
  onComplete?: () => void
): (() => void) => {
  if (startXp === endXp) {
    onUpdate(endXp);
    if (onComplete) onComplete();
    return () => {};
  }

  let startTime: number | null = null;
  let animId: number | null = null;
  let isCancelled = false;

  // Cubic Out Easing: starts briskly, decelerates into final count
  const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

  const step = (timestamp: number) => {
    if (isCancelled) return;
    if (startTime === null) startTime = timestamp;
    const progress = Math.min(1, (timestamp - startTime) / durationMs);
    const easedProgress = easeOutCubic(progress);
    const currentValue = Math.round(startXp + (endXp - startXp) * easedProgress);

    onUpdate(currentValue);

    if (progress < 1) {
      animId = requestAnimationFrame(step);
    } else {
      onUpdate(endXp);
      if (onComplete) onComplete();
    }
  };

  animId = requestAnimationFrame(step);

  return () => {
    isCancelled = true;
    if (animId !== null) {
      cancelAnimationFrame(animId);
    }
  };
};

/**
 * Global CSS Keyframes for the golden aura pulse and floating XP badge
 */
export const CAMPUS_XP_EFFECTS_CSS = `
@keyframes campusXpGoldPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.7), 0 10px 25px -5px rgba(99, 102, 241, 0.35);
    border-color: rgba(250, 204, 21, 0.9);
    transform: scale(1);
  }
  35% {
    box-shadow: 0 0 35px 8px rgba(250, 204, 21, 0.85), 0 14px 30px -6px rgba(99, 102, 241, 0.45);
    border-color: #facc15;
    transform: scale(1.035);
  }
  70% {
    box-shadow: 0 0 24px 5px rgba(250, 204, 21, 0.65), 0 12px 28px -5px rgba(99, 102, 241, 0.40);
    border-color: rgba(250, 204, 21, 0.8);
    transform: scale(1.015);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(250, 204, 21, 0), 0 10px 25px -5px rgba(99, 102, 241, 0.35);
    border-color: rgba(255, 255, 255, 0.25);
    transform: scale(1);
  }
}

@keyframes campusXpFloatingBadge {
  0% {
    opacity: 0;
    transform: translate(-50%, 0) scale(0.7);
  }
  20% {
    opacity: 1;
    transform: translate(-50%, -14px) scale(1.1);
  }
  75% {
    opacity: 1;
    transform: translate(-50%, -32px) scale(1.05);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -48px) scale(0.9);
  }
}

.campus-xp-pulsing {
  animation: campusXpGoldPulse 1.8s cubic-bezier(0.25, 1, 0.5, 1) !important;
  z-index: 10 !important;
}

.campus-xp-floating-badge {
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #facc15 0%, #f59e0b 100%);
  color: #0f172a;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.88rem;
  font-weight: 950;
  padding: 5px 14px;
  border-radius: 9999px;
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.55), 0 0 0 2px #ffffff;
  pointer-events: none;
  white-space: nowrap;
  animation: campusXpFloatingBadge 2.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  z-index: 50;
}
`;
