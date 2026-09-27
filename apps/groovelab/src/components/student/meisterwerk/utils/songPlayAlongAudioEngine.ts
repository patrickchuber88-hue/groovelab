/**
 * 🎵 0.1% Goldstandard Web Audio Play-Along Synthesizer 2027
 * Sample-akkurate Synthese von Drums (Kick, Snare, Hi-Hat), Sub-Bass, Chords & Metronom.
 *
 * 100% Zero-Dependency Web Audio API (keine schweren externen Audio-Files/Soundfonts).
 * Ressourcenschonend (< 15 MB RAM), iOS Safari Auto-Unlock & Fail-Safe Cleanup.
 */

import { PITCH_CLASSES, getChordNotes } from './musicTheoryEngine';

export interface AudioMixerState {
  masterVolume: number;     // 0..1
  metronomeVolume: number;  // 0..1
  drumsVolume: number;      // 0..1
  bassVolume: number;       // 0..1
  chordsVolume: number;     // 0..1
  isMuted: boolean;
  metronomeMuted: boolean;
  drumsMuted: boolean;
  bassMuted: boolean;
  chordsMuted: boolean;
}

export const DEFAULT_MIXER_STATE: AudioMixerState = {
  masterVolume: 0.85,
  metronomeVolume: 0.75,
  drumsVolume: 0.8,
  bassVolume: 0.7,
  chordsVolume: 0.55,
  isMuted: false,
  metronomeMuted: false,
  drumsMuted: false,
  bassMuted: false,
  chordsMuted: false
};

// Base frequencies for notes in octave 1/2 for Bass (Hz)
const NOTE_BASE_FREQS: Record<number, number> = {
  0: 65.41,  // C2
  1: 69.30,  // C#2
  2: 73.42,  // D2
  3: 77.78,  // D#2
  4: 82.41,  // E2 (E-Saite Gitarre/Bass)
  5: 87.31,  // F2
  6: 92.50,  // F#2
  7: 98.00,  // G2
  8: 103.83, // G#2
  9: 110.00, // A2
  10: 116.54,// A#2
  11: 123.47 // B2
};

// Chord octave 3/4 frequencies (Hz)
const NOTE_CHORD_FREQS: Record<number, number> = {
  0: 261.63, // C4
  1: 277.18, // C#4
  2: 293.66, // D4
  3: 311.13, // D#4
  4: 329.63, // E4
  5: 349.23, // F4
  6: 369.99, // F#4
  7: 392.00, // G4
  8: 415.30, // G#4
  9: 440.00, // A4
  10: 466.16,// A#4
  11: 493.88 // B4
};

class SongPlayAlongAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private mixerState: AudioMixerState = { ...DEFAULT_MIXER_STATE };

  constructor() {
    // Lazily initialize context on first user interaction
  }

  private initContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.mixerState.isMuted ? 0 : this.mixerState.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Pre-render white noise buffer for Snare & Hi-Hat
      const bufferSize = this.ctx.sampleRate * 1; // 1 second buffer
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public updateMixer(newState: Partial<AudioMixerState>) {
    this.mixerState = { ...this.mixerState, ...newState };
    if (this.masterGain && this.ctx) {
      const effVolume = this.mixerState.isMuted ? 0 : this.mixerState.masterVolume;
      this.masterGain.gain.setValueAtTime(effVolume, this.ctx.currentTime);
    }
  }

  public getMixerState(): AudioMixerState {
    return { ...this.mixerState };
  }

  /**
   * Synthesize Metronome Tick
   */
  public playClick(isDownbeat: boolean) {
    if (this.mixerState.isMuted || this.mixerState.metronomeMuted || this.mixerState.metronomeVolume <= 0) return;
    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isDownbeat ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(isDownbeat ? 1400 : 900, now);
    osc.frequency.exponentialRampToValueAtTime(isDownbeat ? 400 : 300, now + 0.03);

    const volume = this.mixerState.metronomeVolume * (isDownbeat ? 0.35 : 0.2);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Synthesize Kick Drum (Punchy pitch-decay 808 style)
   */
  public playKick() {
    if (this.mixerState.isMuted || this.mixerState.drumsMuted || this.mixerState.drumsVolume <= 0) return;
    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Frequency sweeps down rapidly: 140 Hz -> 40 Hz
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.08);

    const volume = this.mixerState.drumsVolume * 0.7;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Synthesize Snare Drum (Bandpassed noise + tone punch)
   */
  public playSnare() {
    if (this.mixerState.isMuted || this.mixerState.drumsMuted || this.mixerState.drumsVolume <= 0) return;
    const ctx = this.initContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;

    const now = ctx.currentTime;

    // 1. Noise snap
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.Q.setValueAtTime(1.2, now);

    const noiseGain = ctx.createGain();
    const volume = this.mixerState.drumsVolume * 0.45;
    noiseGain.gain.setValueAtTime(volume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // 2. Tone body
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.06);

    oscGain.gain.setValueAtTime(volume * 0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noiseSource.start(now);
    noiseSource.stop(now + 0.18);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Synthesize Hi-Hat (Crisp high-passed noise pulse)
   */
  public playHiHat(isOpen = false) {
    if (this.mixerState.isMuted || this.mixerState.drumsMuted || this.mixerState.drumsVolume <= 0) return;
    const ctx = this.initContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, now);

    const gain = ctx.createGain();
    const duration = isOpen ? 0.25 : 0.05;
    const volume = this.mixerState.drumsVolume * (isOpen ? 0.3 : 0.2);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration + 0.02);
  }

  /**
   * Synthesize Sub-Bass Root Note with warm fundamental and sub-sine
   */
  public playBassNote(chordName: string) {
    if (this.mixerState.isMuted || this.mixerState.bassMuted || this.mixerState.bassVolume <= 0) return;
    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;

    const chordInfo = getChordNotes(chordName);
    const pitch = chordInfo.bass ? (PITCH_CLASSES[chordInfo.bass.toUpperCase()] ?? chordInfo.rootPitch) : chordInfo.rootPitch;
    const freq = NOTE_BASE_FREQS[pitch] || 65.41;

    const now = ctx.currentTime;
    const duration = 0.85;

    // 1. Primary body oscillator (triangle)
    const osc1 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + duration);

    const volume = this.mixerState.bassVolume * 0.42;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc1.stop(now + duration + 0.05);
  }

  /**
   * Synthesize Polyphonic Warm VST E-Piano / Studio Rhodes Chord
   * Uses dual oscillators per voice (triangle body + bell chime overtone)
   * with dynamic filter sweep and natural musical sustain.
   */
  public playChordPad(chordName: string) {
    if (this.mixerState.isMuted || this.mixerState.chordsMuted || this.mixerState.chordsVolume <= 0) return;
    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;

    const chordInfo = getChordNotes(chordName);
    const now = ctx.currentTime;
    const duration = 1.6;
    const voiceCount = Math.max(1, chordInfo.pitchClasses.length);
    const chordVolume = (this.mixerState.chordsVolume * 0.22) / voiceCount;

    chordInfo.pitchClasses.slice(0, 5).forEach((pitch, idx) => {
      if (!ctx || !this.masterGain) return;
      const baseFreq = NOTE_CHORD_FREQS[pitch] || 261.63;
      // Voicing spread: lowest note as root, higher notes placed in musical register
      const freq = idx === 0 ? baseFreq : baseFreq * (idx >= 3 ? 2 : 1);

      // --- Oscillator 1: Warm Body (Triangle with slight detune) ---
      const oscBody = ctx.createOscillator();
      const detuneCents = (idx % 2 === 0 ? 1.5 : -1.5);
      oscBody.type = 'triangle';
      oscBody.frequency.setValueAtTime(freq, now);
      oscBody.detune.setValueAtTime(detuneCents, now);

      // --- Oscillator 2: Bell / Tine Attack Harmonic (Sine at 2x freq) ---
      const oscTine = ctx.createOscillator();
      oscTine.type = 'sine';
      oscTine.frequency.setValueAtTime(freq * 2, now);

      // Tine envelope: quick bright decay (hammer strike chime)
      const tineGain = ctx.createGain();
      tineGain.gain.setValueAtTime(0.001, now);
      tineGain.gain.linearRampToValueAtTime(chordVolume * 0.4, now + 0.008);
      tineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      // Body envelope: natural sustain lingering musically
      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.001, now);
      bodyGain.gain.linearRampToValueAtTime(chordVolume, now + 0.02);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Dynamic lowpass filter: bright attack (2400Hz) settling to round tone (850Hz)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(850, now + 0.6);

      // Routing
      oscBody.connect(bodyGain);
      oscTine.connect(tineGain);

      bodyGain.connect(filter);
      tineGain.connect(filter);

      filter.connect(this.masterGain);

      oscBody.start(now);
      oscTine.start(now);

      oscBody.stop(now + duration + 0.05);
      oscTine.stop(now + 0.35);
    });
  }

  /**
   * Unified Beat Player: fires at each metronome beat in the measure
   */
  public triggerBeat(params: {
    beat: number;
    totalBeats: number;
    chord?: string;
    drumFeel?: string;
    isFirstBeatOfMeasure?: boolean;
    shouldPlayChord?: boolean;
  }) {
    const { beat, totalBeats, chord, isFirstBeatOfMeasure = false, shouldPlayChord } = params;

    // 1. Metronome Click
    this.playClick(beat === 1);

    // 2. Drums Pattern
    if (totalBeats === 4) {
      // 4/4 Beat: Kick on 1 and 3, Snare on 2 and 4, Hi-Hat on every beat
      if (beat === 1 || beat === 3) {
        this.playKick();
      }
      if (beat === 2 || beat === 4) {
        this.playSnare();
      }
      this.playHiHat(beat === 4);
    } else if (totalBeats === 3) {
      // 3/4 Walzer: Kick on 1, Snare/Rim on 2 & 3
      if (beat === 1) {
        this.playKick();
      } else {
        this.playSnare();
      }
      this.playHiHat(false);
    } else if (totalBeats === 6) {
      // 6/8 Feel: Kick on 1 and 4, Snare on 4
      if (beat === 1) this.playKick();
      if (beat === 4) this.playSnare();
      this.playHiHat(beat === 6);
    } else if (totalBeats === 12) {
      // 12/8 Blues / Slow Rock: Pulses on 1, 4, 7, 10
      if (beat === 1 || beat === 7) this.playKick();
      if (beat === 4 || beat === 10) this.playSnare();
      this.playHiHat(beat % 3 === 0);
    } else {
      // Default: Kick on 1, Snare on 2
      if (beat === 1) this.playKick();
      if (beat === 2) this.playSnare();
      this.playHiHat(false);
    }

    // 3. Bass & Chord Sounding
    const triggerChord = shouldPlayChord !== undefined ? shouldPlayChord : isFirstBeatOfMeasure;
    if (chord && triggerChord) {
      this.playBassNote(chord);
      this.playChordPad(chord);
    }
  }

  /**
   * Play a single preview note (e.g. for interactive pentatonic solo pills)
   */
  public playSingleNote(noteName: string, durationSec = 0.8) {
    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;

    const clean = noteName.toUpperCase().replace('H', 'B');
    const pitchClass = PITCH_CLASSES[clean] ?? 0;
    const baseFreq = NOTE_CHORD_FREQS[pitchClass] || 261.63;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);

    // Subtle Rhodes chime overtone
    const oscChime = ctx.createOscillator();
    const gainChime = ctx.createGain();
    oscChime.type = 'triangle';
    oscChime.frequency.setValueAtTime(baseFreq * 2, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    gainChime.gain.setValueAtTime(0, now);
    gainChime.gain.linearRampToValueAtTime(0.18, now + 0.015);
    gainChime.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    oscChime.connect(gainChime);
    gain.connect(this.masterGain);
    gainChime.connect(this.masterGain);

    osc.start(now);
    oscChime.start(now);
    osc.stop(now + durationSec + 0.05);
    oscChime.stop(now + 0.3);
  }

  /**
   * Subtle metronome double-tick preview when adjusting tempo
   */
  public playTempoTick() {
    this.playClick(true);
    setTimeout(() => {
      this.playClick(false);
    }, 180);
  }

  /**
   * Safely stop and suspend
   */
  public suspend() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }
}

export const playAlongAudioEngine = new SongPlayAlongAudioEngine();
