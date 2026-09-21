import { SharedAudioEngine } from '../../../utils/sharedAudioEngine';

/**
 * 🚀 Junior Rocket Mission Sound Effects Synthesis Engine
 * Pure Web Audio API synthesis via SharedAudioEngine singleton.
 * Zero external assets, zero latency, 100% fail-safe.
 */

// 💨 Stufe 1: Sputter-Sound (Abbruch vor Zielzeit)
export function playRocketSputterSound(): void {
  try {
    const ctx = SharedAudioEngine.getContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    [0, 0.14, 0.28].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(155 - idx * 25, now + offset);
      osc.frequency.exponentialRampToValueAtTime(50, now + offset + 0.11);
      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.linearRampToValueAtTime(0.18, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.14);
    });
  } catch (e) {
    console.warn('[juniorRocketAudio] Rocket sputter sound fallback:', e);
  }
}

// 🚀 Stufe 2: Resonanter Orbit-Raketenstart (120Hz -> 620Hz mit Sub-Bass)
export function playOrbitLaunchSound(): void {
  try {
    const ctx = SharedAudioEngine.getContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // 1. Haupt-Raketenantrieb mit Tiefpassfilter
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.65);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(950, now + 0.55);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.85);

    // 2. Sub-Bass Fundament
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(60, now);
    sub.frequency.linearRampToValueAtTime(90, now + 0.5);
    subGain.gain.setValueAtTime(0.22, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.8);
  } catch (e) {
    console.warn('[juniorRocketAudio] Orbit launch sound fallback:', e);
  }
}

// ✨ Stufe 2 Belohnung: Polyphones Himmels-Glockenspiel (C5, E5, G5, B5, D6)
export function playCelestialVictoryChime(): void {
  try {
    const ctx = SharedAudioEngine.getContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 987.77, 1174.66];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 1.5);
    });
  } catch (e) {
    console.warn('[juniorRocketAudio] Celestial victory chime fallback:', e);
  }
}

// 🌌 Stufe 3: Hyperraum-Warp Sound (Sci-Fi Sweep + C6-D7 Sternenstaub-Schimmer)
export function playHyperspaceWarpSound(): void {
  try {
    const ctx = SharedAudioEngine.getContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // Warp-Sweep mit Bandpass-Resonanz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(1700, now + 0.65);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 5;
    filter.frequency.setValueAtTime(350, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.65);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.9);

    // Sternenstaub-Schimmer (C6-D7)
    [1046.50, 1318.51, 1567.98, 2093.00, 2349.32].forEach((freq, idx) => {
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(freq, now + 0.25 + idx * 0.07);
      chimeGain.gain.setValueAtTime(0.001, now + 0.25 + idx * 0.07);
      chimeGain.gain.linearRampToValueAtTime(0.12, now + 0.25 + idx * 0.07 + 0.03);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25 + idx * 0.07 + 1.2);
      chimeOsc.connect(chimeGain);
      chimeGain.connect(ctx.destination);
      chimeOsc.start(now + 0.25 + idx * 0.07);
      chimeOsc.stop(now + 0.25 + idx * 0.07 + 1.3);
    });
  } catch (e) {
    console.warn('[juniorRocketAudio] Hyperspace warp sound fallback:', e);
  }
}
