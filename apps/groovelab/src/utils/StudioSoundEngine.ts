/**
 * ==============================================================================
 * 🏛️ CAMPUS-GROOVELAB TIER-1 HIGH-FIDELITY STUDIO SOUND ENGINE
 * ==============================================================================
 * 0,1% Goldstandard Audio-Percussion & Drumkit Synthesizer.
 * Generiert und cacht hochauflösende 32-Bit Floating Point AudioBuffer für:
 * 1. Acoustic Studio Drums (Maple Shell Kick, Wood Snare, Rosewood Clave Click)
 * 2. Real Body Percussion (Chest Thump, Multi-Burst Hand Clap, Finger Snap)
 * 3. Latin Percussion (Cuban Clave, Conga/Tumbadora Slap, Bongo High Rim)
 * 4. Urban 808 Studio (Deep Sub Kick, Snappy 808 Clap, Crisp Rim)
 *
 * Garantiert:
 * - 0 ms Trigger-Latenz durch In-Memory AudioBuffer Caching
 * - 100% PWA Offline-Fähigkeit ohne Netzwerk-Abhängigkeiten
 * - Musikalische Transienten-Modellierung (Multi-Burst Claps, Holz-Resonanzen)
 * ==============================================================================
 */

export type SoundKitType = 'acoustic' | 'body_percussion' | 'latin' | 'urban_808';
export type SoundInstrumentType = 'kick' | 'snare' | 'hihat' | 'click';

class StudioSoundEngineService {
  private static instance: StudioSoundEngineService;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private isWarmedUp: boolean = false;

  private constructor() {}

  public static getInstance(): StudioSoundEngineService {
    if (!StudioSoundEngineService.instance) {
      StudioSoundEngineService.instance = new StudioSoundEngineService();
    }
    return StudioSoundEngineService.instance;
  }

  /**
   * Initialisiert und pre-cached alle Audio-Buffer für den übergebenen AudioContext
   */
  public warmUp(ctx: AudioContext): void {
    if (this.isWarmedUp && this.bufferCache.size > 0) return;
    const kits: SoundKitType[] = ['acoustic', 'body_percussion', 'latin', 'urban_808'];
    const instruments: SoundInstrumentType[] = ['kick', 'snare', 'hihat', 'click'];

    kits.forEach(kit => {
      instruments.forEach(inst => {
        this.getOrCreateBuffer(ctx, kit, inst);
      });
    });
    this.isWarmedUp = true;
  }

  /**
   * Liefert den gecachten AudioBuffer oder generiert ihn in-memory
   */
  public getOrCreateBuffer(ctx: AudioContext, kit: SoundKitType, inst: SoundInstrumentType): AudioBuffer {
    const key = `${ctx.sampleRate}_${kit}_${inst}`;
    const cached = this.bufferCache.get(key);
    if (cached) return cached;

    const buffer = this.synthesizeStudioSample(ctx, kit, inst);
    this.bufferCache.set(key, buffer);
    return buffer;
  }

  /**
   * Spielt einen Percussion-Sound mit hochpräzisem WebAudio Zeitstempel ab
   */
  public playSound(
    ctx: AudioContext,
    kit: SoundKitType,
    inst: SoundInstrumentType,
    time: number,
    volume: number = 1.0,
    accent: boolean = false
  ): AudioNode {
    const buffer = this.getOrCreateBuffer(ctx, kit, inst);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Pitch-Micro-Variance für organischen, nicht-maschinellen Sound (+- 1.5%)
    const microPitch = 1.0 + (Math.random() * 0.03 - 0.015);
    source.playbackRate.value = accent ? microPitch * 1.03 : microPitch;

    const gainNode = ctx.createGain();
    const safeTime = Math.max(ctx.currentTime + 0.003, time);

    const targetGain = Math.max(0.0001, volume * (accent ? 1.25 : 1.0));
    gainNode.gain.setValueAtTime(targetGain, safeTime);

    source.connect(gainNode);
    source.start(safeTime);

    return gainNode;
  }

  /**
   * High-End In-Memory PCM Synthese für authentische Studio-Percussion
   */
  private synthesizeStudioSample(ctx: AudioContext, kit: SoundKitType, inst: SoundInstrumentType): AudioBuffer {
    const sampleRate = ctx.sampleRate;

    if (kit === 'acoustic') {
      if (inst === 'kick') return this.generateMapleKick(ctx, sampleRate);
      if (inst === 'snare') return this.generateAcornSnare(ctx, sampleRate);
      if (inst === 'click') return this.generateRosewoodClick(ctx, sampleRate);
      return this.generateSmoothShaker(ctx, sampleRate);
    } 
    
    if (kit === 'body_percussion') {
      if (inst === 'kick') return this.generateChestThump(ctx, sampleRate);
      if (inst === 'snare') return this.generateMultiBurstClap(ctx, sampleRate);
      if (inst === 'click') return this.generateFingerSnap(ctx, sampleRate);
      return this.generateSoftLap(ctx, sampleRate);
    } 
    
    if (kit === 'latin') {
      if (inst === 'kick') return this.generateTumbadoraOpen(ctx, sampleRate);
      if (inst === 'snare') return this.generateCongaSlap(ctx, sampleRate);
      if (inst === 'click') return this.generateCubanClave(ctx, sampleRate);
      return this.generateBongoRim(ctx, sampleRate);
    }

    // Default / Urban 808
    if (inst === 'kick') return this.generate808SubKick(ctx, sampleRate);
    if (inst === 'snare') return this.generate808SnappyClap(ctx, sampleRate);
    if (inst === 'click') return this.generate808Rim(ctx, sampleRate);
    return this.generate808ClosedHat(ctx, sampleRate);
  }

  // ============================================================================
  // 1. ACOUSTIC MAPLE DRUMSET (Warme Holzkessel, klare Transienten)
  // ============================================================================
  private generateMapleKick(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.24); // 240ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      // Exponential Pitch Sweep: 155Hz Beater -> 52Hz Shell
      const freq = 52 + 103 * Math.exp(-t / 0.038);
      const phase = 2 * Math.PI * freq * t;

      // 1st Fundamental + 2nd Harmonic
      const fundamental = Math.sin(phase);
      const harmonic2 = 0.28 * Math.sin(phase * 2);
      
      // Beater Bevel Transient (Click)
      const beaterClick = (Math.exp(-t / 0.004) * (Math.random() * 2 - 1)) * 0.45;
      
      // Decay Envelope
      const env = Math.exp(-t / 0.065);
      data[i] = (fundamental + harmonic2 + beaterClick) * env;
    }
    return buf;
  }

  private generateAcornSnare(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.18); // 180ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    let noiseState = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sr;
      // Body Tone (185Hz + 330Hz Rim)
      const body = 0.55 * Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t / 0.035)
                 + 0.25 * Math.sin(2 * Math.PI * 330 * t) * Math.exp(-t / 0.022);

      // Snare Wires: High-passed noise mit natürlichem Raspeln
      const rawNoise = Math.random() * 2 - 1;
      noiseState = 0.88 * noiseState + 0.12 * rawNoise; // Low-leak filter
      const wires = (rawNoise - noiseState) * Math.exp(-t / 0.085) * 0.75;

      // Stick Strike Transient
      const strike = Math.exp(-t / 0.003) * (Math.random() * 2 - 1) * 0.35;

      data[i] = (body + wires + strike) * Math.exp(-t / 0.09);
    }
    return buf;
  }

  private generateRosewoodClick(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.045); // 45ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      // Wood Bell Resonance: 2180Hz + Overtone 4360Hz
      const tone = 0.75 * Math.sin(2 * Math.PI * 2180 * t)
                 + 0.25 * Math.sin(2 * Math.PI * 4360 * t);
      const attack = t < 0.0015 ? t / 0.0015 : Math.exp(-(t - 0.0015) / 0.008);
      data[i] = tone * attack;
    }
    return buf;
  }

  private generateSmoothShaker(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.06); // 60ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    let lastVal = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sr;
      // High-Frequency Bead Shaker
      const noise = Math.random() * 2 - 1;
      lastVal = noise - 0.75 * lastVal; // Highpass
      const env = t < 0.01 ? (t / 0.01) : Math.exp(-(t - 0.01) / 0.022);
      data[i] = lastVal * env * 0.40;
    }
    return buf;
  }

  // ============================================================================
  // 2. REAL BODY PERCUSSION (Multi-Burst Clap, Chest Thump, Finger Snap)
  // ============================================================================
  private generateChestThump(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.16); // 160ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      // Deep Fleshy Thump (75Hz -> 38Hz)
      const freq = 38 + 37 * Math.exp(-t / 0.028);
      const tone = Math.sin(2 * Math.PI * freq * t);
      const slap = (Math.random() * 2 - 1) * Math.exp(-t / 0.006) * 0.35;
      data[i] = (tone + slap) * Math.exp(-t / 0.05);
    }
    return buf;
  }

  private generateMultiBurstClap(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.15); // 150ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    // Echte Claps bestehen aus 3 versetzten Handflächen-Schlägen (t=0ms, 9ms, 18ms)
    for (let i = 0; i < length; i++) {
      const t = i / sr;
      const noise = Math.random() * 2 - 1;

      const burst1 = t >= 0.000 ? Math.exp(-(t - 0.000) / 0.006) * noise * 0.55 : 0;
      const burst2 = t >= 0.009 ? Math.exp(-(t - 0.009) / 0.008) * noise * 0.70 : 0;
      const burst3 = t >= 0.018 ? Math.exp(-(t - 0.018) / 0.045) * noise * 0.95 : 0;

      data[i] = (burst1 + burst2 + burst3) * 0.75;
    }
    return buf;
  }

  private generateFingerSnap(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.05); // 50ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      // High-Fleshy Click at 3800Hz
      const tone = Math.sin(2 * Math.PI * 3800 * t);
      const env = t < 0.001 ? t / 0.001 : Math.exp(-(t - 0.001) / 0.009);
      data[i] = tone * env * 0.65;
    }
    return buf;
  }

  private generateSoftLap(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.08); // 80ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      const tone = Math.sin(2 * Math.PI * 140 * t);
      const slap = (Math.random() * 2 - 1) * Math.exp(-t / 0.005) * 0.25;
      data[i] = (tone + slap) * Math.exp(-t / 0.025) * 0.6;
    }
    return buf;
  }

  // ============================================================================
  // 3. LATIN PERCUSSION (Cuban Clave, Tumbadora, Conga Slap)
  // ============================================================================
  private generateCubanClave(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.06); // 60ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      // High-density Hardwood resonance (2450Hz + 4900Hz)
      const tone = 0.85 * Math.sin(2 * Math.PI * 2450 * t)
                 + 0.15 * Math.sin(2 * Math.PI * 4900 * t);
      const env = t < 0.001 ? t / 0.001 : Math.exp(-(t - 0.001) / 0.015);
      data[i] = tone * env * 0.9;
    }
    return buf;
  }

  private generateTumbadoraOpen(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.22); // 220ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      const freq = 120 + 40 * Math.exp(-t / 0.03);
      const tone = Math.sin(2 * Math.PI * freq * t);
      data[i] = tone * Math.exp(-t / 0.07) * 0.95;
    }
    return buf;
  }

  private generateCongaSlap(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.12); // 120ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      const tone = Math.sin(2 * Math.PI * 340 * t) * Math.exp(-t / 0.02);
      const slap = (Math.random() * 2 - 1) * Math.exp(-t / 0.008) * 0.85;
      data[i] = (tone + slap) * Math.exp(-t / 0.04);
    }
    return buf;
  }

  private generateBongoRim(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.05); // 50ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      const tone = Math.sin(2 * Math.PI * 1820 * t);
      data[i] = tone * Math.exp(-t / 0.012) * 0.75;
    }
    return buf;
  }

  // ============================================================================
  // 4. URBAN 808 STUDIO (Deep Sub, Snappy 808 Clap)
  // ============================================================================
  private generate808SubKick(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.28); // 280ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      const freq = 46 + 68 * Math.exp(-t / 0.025);
      const tone = Math.sin(2 * Math.PI * freq * t);
      // Soft saturation clip
      data[i] = Math.tanh(tone * 1.3) * Math.exp(-t / 0.09) * 0.95;
    }
    return buf;
  }

  private generate808SnappyClap(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.16); // 160ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      const noise = Math.random() * 2 - 1;
      const b1 = t >= 0.000 ? Math.exp(-(t - 0.000) / 0.005) * noise * 0.6 : 0;
      const b2 = t >= 0.012 ? Math.exp(-(t - 0.012) / 0.006) * noise * 0.8 : 0;
      const b3 = t >= 0.024 ? Math.exp(-(t - 0.024) / 0.040) * noise * 0.95 : 0;
      data[i] = (b1 + b2 + b3) * 0.8;
    }
    return buf;
  }

  private generate808Rim(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.035); // 35ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      const tone = Math.sin(2 * Math.PI * 1680 * t);
      data[i] = tone * Math.exp(-t / 0.007) * 0.8;
    }
    return buf;
  }

  private generate808ClosedHat(ctx: AudioContext, sr: number): AudioBuffer {
    const length = Math.floor(sr * 0.04); // 40ms
    const buf = ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      // Metallic square ring
      const metal = Math.sign(Math.sin(2 * Math.PI * 4200 * t)) * Math.sign(Math.sin(2 * Math.PI * 6100 * t));
      data[i] = metal * Math.exp(-t / 0.01) * 0.35;
    }
    return buf;
  }
}

export const StudioSoundEngine = StudioSoundEngineService.getInstance();
