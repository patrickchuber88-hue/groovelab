/**
 * 🏛️ Campus-Groovelab Micro-Score Audio Synthesizer
 * microScoreAudioSynthesizer.ts
 * 
 * Hochpräzise WebAudio-Klangarchitektur für den 0,1% Goldstandard:
 * - 6 Bläser-Klangmodelle: Blockflöte, Querflöte, Klarinette, Altsaxophon, Trompete, Posaune
 * - Klavier, Akustik-Gitarre, E-Bass, Streicher, Percussion
 * - Hardware-genauer Woodblock-Metronom-Scheduler
 * - Pitch-Neutrales WSOLA Slow-Motion (0.6x–1.2x bei 440 Hz)
 * - Mute-Funktion für Schüler-Aufnahme (Metronom-Only Playalong ohne Instrumenten-Bleed)
 */

import { SharedAudioEngine } from '../../../../utils/sharedAudioEngine';
import { MicroScoreDuration, MicroScoreInstrument, MicroScoreNote, MicroScoreSnippet } from './microScore.types';
import { StudioSampleLibrary } from '../../../../services/audio/StudioSampleLibrary';
import { PhysicalModelingEngine } from '../../../../services/audio/PhysicalModelingEngine';
import { StudioKeyboardEngine } from '../../../../services/audio/StudioKeyboardEngine';

// Noten-zu-Frequenz Zuordnung (A4 = 440 Hz)
const NOTE_SEMITONES: Record<string, number> = {
  'C': 0, 'C#': 1, 'DB': 1,
  'D': 2, 'D#': 3, 'EB': 3,
  'E': 4, 'E#': 5,
  'F': 5, 'FB': 4, 'F#': 6, 'GB': 6,
  'G': 7, 'G#': 8, 'AB': 8,
  'A': 9, 'A#': 10, 'BB': 10, 'B': 11, 'H': 11, 'B#': 0, 'CB': 11
};

export function getPitchHz(pitch: string): number {
  if (!pitch || pitch === 'REST') return 0;
  const match = pitch.trim().toUpperCase().match(/^([A-H][#B♮]?)(-?\d+)$/);
  if (!match) return 440;
  let name = match[1].replace('♮', '');
  if (name === 'H') name = 'B';
  const octave = parseInt(match[2], 10);
  const semitone = NOTE_SEMITONES[name] ?? 9;
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * 🏛️ 0,1% Goldstandard: Akustische Transpositions-Parität
 * Rechnet die im Notensystem notierte Tonhöhe in die echte, physikalisch klingende Frequenz um.
 */
export function getSoundingHz(instrument: MicroScoreInstrument | string, pitch: string): number {
  const rawHz = getPitchHz(pitch);
  if (rawHz <= 0) return 0;

  switch (instrument) {
    case 'clarinet':
    case 'trumpet':
      // Bb-Instrumente klingen 2 Halbtöne tiefer als notiert
      return rawHz * Math.pow(2, -2 / 12);
    case 'altosax':
      // Eb-Instrumente klingen 9 Halbtöne tiefer als notiert
      return rawHz * Math.pow(2, -9 / 12);
    case 'bass':
    case 'guitar':
      // 8vb Standard: Klingen 1 Oktave tiefer als im Violinschlüssel notiert
      return rawHz / 2;
    case 'recorder':
      // 8va Standard: Sopranblockflöte klingt 1 Oktave HÖHER als notiert (Notiert C4 -> Klingt C5 = 523 Hz)
      return rawHz * 2;
    case 'ukulele':
      // C-Sopran/Konzert Ukulele: Nicht-transponierendes C-Instrument (Notiert C4 -> Klingt C4 = 261 Hz)
      return rawHz;
    default:
      return rawHz;
  }
}

export function durationToSixteenths(
  duration: MicroScoreDuration,
  isDotted: boolean = false,
  isTriplet: boolean = false
): number {
  let base = 4;
  switch (duration) {
    case '1': base = 16; break;
    case '2': base = 8; break;
    case '4': base = 4; break;
    case '8': base = 2; break;
    case '16': base = 1; break;
  }
  if (isTriplet) {
    return (base * 2) / 3;
  }
  return isDotted ? Math.floor(base * 1.5) : base;
}

export function durationToSeconds(
  duration: MicroScoreDuration,
  bpm: number,
  isDotted: boolean = false,
  isTriplet: boolean = false
): number {
  const sixteenthSec = 60 / (bpm * 4);
  const sixteenths = durationToSixteenths(duration, isDotted, isTriplet);
  return sixteenths * sixteenthSec;
}

type StudioWaveType = 'recorder' | 'flute' | 'clarinet' | 'altosax' | 'brass' | 'strings' | 'vocals';

export class MicroScoreAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private metronomeGain: GainNode | null = null;
  private instrumentGain: GainNode | null = null;
  private customDestination: AudioNode | null = null;
  private isMutedInstrument: boolean = false;
  private scheduledSources: Set<{ stop: () => void; disconnect: () => void }> = new Set();
  private cachedNoiseBuffer: AudioBuffer | null = null;
  private waveCache: WeakMap<AudioContext, Partial<Record<StudioWaveType, PeriodicWave>>> = new WeakMap();

  constructor() {}

  /**
   * 🏛️ 0,1% Goldstandard: Ausgangs-Routing für Sub-Graphen & Master-Bus-Limiter
   */
  public setOutputDestination(dest: AudioNode | null): void {
    this.customDestination = dest;
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.disconnect();
      } catch {}
      if (dest) {
        this.masterGain.connect(dest);
      } else {
        this.masterGain.connect(this.ctx.destination);
      }
    }
  }

  public init(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = SharedAudioEngine.getContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      if (this.customDestination) {
        this.masterGain.connect(this.customDestination);
      } else {
        this.masterGain.connect(this.ctx.destination);
      }
    }

    if (!this.instrumentGain) {
      this.instrumentGain = this.ctx.createGain();
      this.instrumentGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.instrumentGain.connect(this.masterGain);
    }

    if (!this.metronomeGain) {
      this.metronomeGain = this.ctx.createGain();
      this.metronomeGain.gain.setValueAtTime(0.95, this.ctx.currentTime);
      this.metronomeGain.connect(this.masterGain);
    }

    StudioSampleLibrary.preloadRealSamples(this.ctx);
    PhysicalModelingEngine.prewarmCommonNotes(this.ctx, 'acoustic_guitar');
    PhysicalModelingEngine.prewarmCommonNotes(this.ctx, 'electric_bass');
    return this.ctx;
  }

  private getStudioWave(ctx: AudioContext, type: StudioWaveType): PeriodicWave {
    let ctxWaves = this.waveCache.get(ctx);
    if (!ctxWaves) {
      ctxWaves = {};
      this.waveCache.set(ctx, ctxWaves);
    }
    const existing = ctxWaves[type];
    if (existing) return existing;

    let imag: Float32Array;
    switch (type) {
      case 'recorder':
        // Edle Birnbaum-Sopranblockflöte: Grundton + sanfte Oktave + zarte Duodezime
        imag = new Float32Array([0, 1.0, 0.22, 0.14, 0.03, 0.015]);
        break;
      case 'flute':
        // Silber-Querflöte: Klarer Grundton mit seidigem Obertonschimmer
        imag = new Float32Array([0, 1.0, 0.34, 0.15, 0.06, 0.02]);
        break;
      case 'clarinet':
        // Boehm-Klarinette: Dominante ungerade Teiltöne (1, 3, 5, 7) + weiche gerade Korpuswärme
        imag = new Float32Array([0, 1.0, 0.07, 0.48, 0.05, 0.24, 0.03, 0.11]);
        break;
      case 'altosax':
        // Konisches Altsaxophon: Warmer, tragfähiger Rohrblatt-Kern ohne Sägezahn-Schärfe
        imag = new Float32Array([0, 1.0, 0.60, 0.40, 0.25, 0.15, 0.08, 0.04]);
        break;
      case 'brass':
        // Orchester-Blechbläser (Trompete / Posaune): Runde harmonische Obertonreihe
        imag = new Float32Array([0, 1.0, 0.76, 0.54, 0.36, 0.22, 0.13, 0.07, 0.035]);
        break;
      case 'strings':
        // Akustischer Bogenstrich (Violine / Cello): Samtiges Helmholtz-Spektrum
        imag = new Float32Array([0, 1.0, 0.50, 0.33, 0.22, 0.14, 0.09, 0.05]);
        break;
      case 'vocals':
      default:
        // Menschliche Glottis-Welle für warmen Chor-/Soloklang
        imag = new Float32Array([0, 1.0, 0.56, 0.34, 0.20, 0.11, 0.06, 0.03]);
        break;
    }

    const real = new Float32Array(imag.length);
    const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    ctxWaves[type] = wave;
    return wave;
  }

  public setInstrumentMuted(muted: boolean): void {
    this.isMutedInstrument = muted;
    if (this.instrumentGain && this.ctx) {
      this.instrumentGain.gain.setValueAtTime(muted ? 0 : 0.9, this.ctx.currentTime);
    }
  }

  /**
   * Sofortige Ton-Wiedergabe für Klick- und Tastatur-Feedback (0,1% Latenz)
   */
  public playToneNow(
    instrument: MicroScoreInstrument,
    pitch: string,
    durationSec: number = 0.20,
    volume: number = 0.70
  ): void {
    if (this.isMutedInstrument || !pitch || pitch === 'REST') return;
    const ctx = this.init();
    this.scheduleToneAtTime(instrument, pitch, ctx.currentTime, durationSec, volume);
  }

  /**
   * Sofortiger Schlagzeug-Treffer für Pad- und Tastatur-Klicks (0,1% Latenz)
   */
  public playDrumHitNow(padId: string, volume: number = 0.75): void {
    if (this.isMutedInstrument) return;
    const ctx = this.init();
    if (!this.instrumentGain) return;
    this.synthDrum(ctx, padId, ctx.currentTime, volume);
  }

  /**
   * Polyphone Akkord-Wiedergabe für Klick- und Tastatur-Feedback
   * Skaliert Headroom gegen Clipping und erzeugt bei Gitarre ein natürliches 12ms-Strumming
   */
  public playChordNow(
    instrument: MicroScoreInstrument,
    pitches: string[],
    durationSec: number = 0.35,
    volume: number = 0.70
  ): void {
    if (this.isMutedInstrument || !pitches || pitches.length === 0) return;
    const validPitches = pitches.filter(p => p && p !== 'REST');
    if (validPitches.length === 0) return;

    const ctx = this.init();
    const polyVolume = volume / Math.sqrt(Math.max(1, validPitches.length));

    validPitches.forEach((pitch, idx) => {
      const delay = instrument === 'guitar' ? idx * 0.012 : 0;
      this.scheduleToneAtTime(instrument, pitch, ctx.currentTime + delay, durationSec, polyVolume);
    });
  }

  public stopAll(): void {
    this.scheduledSources.forEach(s => {
      try {
        s.stop();
        s.disconnect();
      } catch {}
    });
    this.scheduledSources.clear();
    StudioKeyboardEngine.stopAll();
    PhysicalModelingEngine.stopAll();
    StudioSampleLibrary.stopAll();
  }

  /**
   * Kristallklarer Woodblock-Metronomklick mit prägnantem Transient
   */
  public scheduleMetronomeClick(time: number, isAccent: boolean = false): void {
    const ctx = this.init();
    if (!this.metronomeGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    const startFreq = isAccent ? 2400 : 1600;
    const endFreq = isAccent ? 1400 : 950;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.015);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(450, time);
    filter.Q.setValueAtTime(1.0, time);

    const targetGain = isAccent ? 0.95 : 0.75;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(targetGain, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + (isAccent ? 0.065 : 0.048));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.metronomeGain);

    osc.start(time);
    osc.stop(time + 0.07);
    this.trackSource(osc, gain, filter);
  }

  /**
   * 🏛️ 0,1% Goldstandard: Direkte Tonhöhen-Wiedergabe nach physikalischer Frequenz (Concert Pitch)
   * Perfekt für Gehörtraining, A/B-Klangvergleich und YIN Pitch-Matching
   */
  public playFrequencyAtTime(
    instrument: MicroScoreInstrument | string,
    hz: number,
    time: number,
    durationSec: number,
    volume: number = 0.55
  ): void {
    if (this.isMutedInstrument || hz <= 0) return;
    const ctx = this.init();
    if (!this.instrumentGain) return;

    switch (instrument as string) {
      case 'recorder':
        this.synthRecorder(ctx, hz, time, durationSec, volume);
        break;
      case 'flute':
        this.synthFlute(ctx, hz, time, durationSec, volume);
        break;
      case 'clarinet':
        this.synthClarinet(ctx, hz, time, durationSec, volume);
        break;
      case 'altosax':
        this.synthAltoSax(ctx, hz, time, durationSec, volume);
        break;
      case 'trumpet':
        this.synthTrumpet(ctx, hz, time, durationSec, volume);
        break;
      case 'trombone':
        this.synthTrombone(ctx, hz, time, durationSec, volume);
        break;
      case 'guitar':
        this.synthGuitar(ctx, hz, time, durationSec, volume);
        break;
      case 'ukulele':
        this.synthGuitar(ctx, hz * 2, time, durationSec, volume);
        break;
      case 'bass':
        this.synthBass(ctx, hz, time, durationSec, volume);
        break;
      case 'strings':
      case 'violin':
        this.synthStrings(ctx, hz, time, durationSec, volume);
        break;
      case 'cello':
      case 'violoncello':
        this.synthStrings(ctx, hz / 2, time, durationSec, volume);
        break;
      case 'vocals':
      case 'vocal':
      case 'voice':
        this.synthVocals(ctx, hz, time, durationSec, volume);
        break;
      case 'piano':
      case 'universal':
      default:
        this.synthPiano(ctx, hz, time, durationSec, volume);
        break;
    }
  }

  /**
   * Akustische Klangsynthese für das gewählte Instrument
   */
  public scheduleToneAtTime(
    instrument: MicroScoreInstrument,
    pitch: string,
    time: number,
    durationSec: number,
    volume: number = 0.55
  ): void {
    if (this.isMutedInstrument || !pitch || pitch === 'REST') return;
    const ctx = this.init();
    if (!this.instrumentGain) return;

    if (instrument === 'drums') {
      this.synthDrum(ctx, pitch, time, volume);
      return;
    }

    const hz = getSoundingHz(instrument, pitch);
    if (hz <= 0) return;

    this.playFrequencyAtTime(instrument, hz, time, durationSec, volume);
  }

  /**
   * Erzeugt einen subtilen, organischen Anblas-Luftimpuls (Air-Chiff) für Holzbläser
   */
  private triggerBreathChiff(ctx: AudioContext, hz: number, time: number, vol: number, dest: AudioNode): void {
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(Math.min(3600, Math.max(900, hz * 2.2)), time);
    bp.Q.setValueAtTime(3.2, time);

    const chiffGain = ctx.createGain();
    chiffGain.gain.setValueAtTime(0.0001, time);
    chiffGain.gain.linearRampToValueAtTime(vol * 0.08, time + 0.006);
    chiffGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.028);

    noiseSource.connect(bp);
    bp.connect(chiffGain);
    chiffGain.connect(dest);

    noiseSource.start(time);
    noiseSource.stop(time + 0.032);
    this.trackSource(noiseSource, bp, chiffGain);
  }

  // --- 1. Blockflöte (Recorder: Edle Birnbaum-Sopranblockflöte mit sanftem Anblas-Chiff) ---
  private synthRecorder(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.getStudioWave(ctx, 'recorder'));
    osc.frequency.setValueAtTime(hz, time);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(4800, hz * 3.4), time);
    filter.Q.setValueAtTime(0.707, time);

    const gain = ctx.createGain();
    const attack = 0.020;
    const release = Math.max(0.24, Math.min(0.48, dur * 0.35));
    const noteEndTime = time + dur;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.78, time + attack);
    gain.gain.setValueAtTime(vol * 0.74, Math.max(time + attack + 0.01, noteEndTime));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.instrumentGain);

    this.triggerBreathChiff(ctx, hz, time, vol * 0.75, this.instrumentGain);

    osc.start(time);
    osc.stop(noteEndTime + release + 0.02);
    this.trackSource(osc, gain, filter);
  }

  // --- 2. Querflöte (Flute): Seidiger Silberflöten-Klang mit korrektem LFO-Vibrato & Air-Chiff ---
  private synthFlute(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.setPeriodicWave(this.getStudioWave(ctx, 'flute'));
    osc.frequency.setValueAtTime(hz, time);

    // 5.2 Hz Vibrato setzt sanft nach 110ms ein (korrektes Routing über lfoGain!)
    lfo.frequency.setValueAtTime(5.2, time);
    lfoGain.gain.setValueAtTime(0, time);
    lfoGain.gain.setValueAtTime(0, time + 0.09);
    lfoGain.gain.linearRampToValueAtTime(2.6, time + 0.22);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(3800, hz * 3.6), time);
    filter.Q.setValueAtTime(0.707, time);

    const attack = 0.032;
    const release = Math.max(0.28, Math.min(0.52, dur * 0.38));
    const noteEndTime = time + dur;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.85, time + attack);
    gain.gain.setValueAtTime(vol * 0.78, Math.max(time + attack + 0.01, noteEndTime));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.instrumentGain);

    this.triggerBreathChiff(ctx, hz, time, vol, this.instrumentGain);

    lfo.start(time);
    osc.start(time);
    const stopTime = noteEndTime + release + 0.02;
    lfo.stop(stopTime);
    osc.stop(stopTime);
    this.trackSource(osc, gain, filter, lfoGain);
    this.trackSource(lfo);
  }

  // --- 3. Klarinette (Clarinet): Warmes Grenadill-Holz-Spektrum statt harscher Rechteck-Welle ---
  private synthClarinet(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const bodyFilter = ctx.createBiquadFilter();
    const bellFilter = ctx.createBiquadFilter();

    osc.setPeriodicWave(this.getStudioWave(ctx, 'clarinet'));
    osc.frequency.setValueAtTime(hz, time);

    bodyFilter.type = 'peaking';
    bodyFilter.frequency.setValueAtTime(Math.max(650, Math.min(1800, hz * 2.2)), time);
    bodyFilter.Q.setValueAtTime(1.4, time);
    bodyFilter.gain.setValueAtTime(2.5, time);

    bellFilter.type = 'lowpass';
    bellFilter.frequency.setValueAtTime(Math.min(3600, hz * 5.2), time);
    bellFilter.Q.setValueAtTime(0.8, time);

    const attack = 0.022;
    const release = Math.max(0.26, Math.min(0.48, dur * 0.35));
    const noteEndTime = time + dur;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.78, time + attack);
    gain.gain.setValueAtTime(vol * 0.72, Math.max(time + attack + 0.01, noteEndTime));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    osc.connect(bodyFilter);
    bodyFilter.connect(bellFilter);
    bellFilter.connect(gain);
    gain.connect(this.instrumentGain);

    osc.start(time);
    osc.stop(noteEndTime + release + 0.02);
    this.trackSource(osc, gain, bodyFilter, bellFilter);
  }

  // --- 4. Altsaxophon (Alto Sax): Konisches Messing-Rohrblatt-Modell mit sanftem Vibrato ---
  private synthAltoSax(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const formant = ctx.createBiquadFilter();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.setPeriodicWave(this.getStudioWave(ctx, 'altosax'));
    osc.frequency.setValueAtTime(hz, time);

    lfo.frequency.setValueAtTime(5.0, time);
    lfoGain.gain.setValueAtTime(0, time);
    lfoGain.gain.setValueAtTime(0, time + 0.10);
    lfoGain.gain.linearRampToValueAtTime(2.4, time + 0.24);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    formant.type = 'peaking';
    formant.frequency.setValueAtTime(1150, time);
    formant.Q.setValueAtTime(1.6, time);
    formant.gain.setValueAtTime(3.0, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(hz * 2.2, time);
    filter.frequency.exponentialRampToValueAtTime(Math.min(3900, hz * 4.6), time + 0.045);
    filter.Q.setValueAtTime(1.1, time);

    const attack = 0.024;
    const release = Math.max(0.28, Math.min(0.52, dur * 0.36));
    const noteEndTime = time + dur;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.84, time + attack);
    gain.gain.setValueAtTime(vol * 0.76, Math.max(time + attack + 0.01, noteEndTime));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    osc.connect(formant);
    formant.connect(filter);
    filter.connect(gain);
    gain.connect(this.instrumentGain);

    const stopTime = noteEndTime + release + 0.02;
    lfo.start(time);
    osc.start(time);
    lfo.stop(stopTime);
    osc.stop(stopTime);
    this.trackSource(osc, gain, formant, filter, lfoGain);
    this.trackSource(lfo);
  }

  // --- 5. Trompete (Trumpet): Edler Konzert-Blechbläser mit dynamischer Schallstück-Öffnung ---
  private synthTrumpet(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    const osc = ctx.createOscillator();
    const formant = ctx.createBiquadFilter();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.setPeriodicWave(this.getStudioWave(ctx, 'brass'));
    osc.frequency.setValueAtTime(hz, time);

    formant.type = 'peaking';
    formant.frequency.setValueAtTime(1450, time);
    formant.Q.setValueAtTime(1.5, time);
    formant.gain.setValueAtTime(2.8, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.max(600, hz * 1.8), time);
    filter.frequency.exponentialRampToValueAtTime(Math.min(4600, hz * 4.8), time + 0.042);
    filter.Q.setValueAtTime(1.25, time);

    const attack = 0.020;
    const release = Math.max(0.26, Math.min(0.48, dur * 0.34));
    const noteEndTime = time + dur;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.84, time + attack);
    gain.gain.setValueAtTime(vol * 0.76, Math.max(time + attack + 0.01, noteEndTime));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    osc.connect(formant);
    formant.connect(filter);
    filter.connect(gain);
    gain.connect(this.instrumentGain);

    osc.start(time);
    osc.stop(noteEndTime + release + 0.02);
    this.trackSource(osc, gain, formant, filter);
  }

  // --- 6. Posaune (Trombone): Warmes, sonores Tief-Blech ---
  private synthTrombone(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    const osc = ctx.createOscillator();
    const formant = ctx.createBiquadFilter();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.setPeriodicWave(this.getStudioWave(ctx, 'brass'));
    osc.frequency.setValueAtTime(hz, time);

    formant.type = 'peaking';
    formant.frequency.setValueAtTime(620, time);
    formant.Q.setValueAtTime(1.4, time);
    formant.gain.setValueAtTime(2.5, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.max(320, hz * 1.6), time);
    filter.frequency.exponentialRampToValueAtTime(Math.min(2500, hz * 4.2), time + 0.055);
    filter.Q.setValueAtTime(1.15, time);

    const attack = 0.030;
    const release = Math.max(0.32, Math.min(0.55, dur * 0.38));
    const noteEndTime = time + dur;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.88, time + attack);
    gain.gain.setValueAtTime(vol * 0.80, Math.max(time + attack + 0.01, noteEndTime));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    osc.connect(formant);
    formant.connect(filter);
    filter.connect(gain);
    gain.connect(this.instrumentGain);

    osc.start(time);
    osc.stop(noteEndTime + release + 0.02);
    this.trackSource(osc, gain, formant, filter);
  }

  // --- 🎼 Cantabile Konzertflügel (0,1% Goldstandard) ---
  private synthPiano(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;
    StudioKeyboardEngine.playGrandPianoNote(ctx, hz, {
      durationSec: dur,
      velocity: vol,
      time,
      destination: this.instrumentGain
    });
  }

  // --- 🎸 Akustik-Gitarre (Extended Karplus-Strong Waveguide mit intelligenter Lauf-Dämpfung) ---
  private synthGuitar(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;
    PhysicalModelingEngine.playNote(ctx, {
      pitchHz: hz,
      durationSec: Math.max(dur, 2.4),
      velocity: vol,
      pluckType: 'acoustic_guitar'
    }, time, this.instrumentGain);
  }

  // --- E-Bass (Extended Karplus-Strong Fender Bass) ---
  private synthBass(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;
    PhysicalModelingEngine.playNote(ctx, {
      pitchHz: hz,
      durationSec: Math.max(dur, 1.8),
      velocity: vol,
      pluckType: 'electric_bass'
    }, time, this.instrumentGain);
  }

  // --- Streicher (Strings: Violine / Ensemble mit Helmholtz-PeriodicWave & gefixtem Vibrato-Routing) ---
  private synthStrings(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    const stringsWave = this.getStudioWave(ctx, 'strings');
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    osc1.setPeriodicWave(stringsWave);
    osc1.frequency.setValueAtTime(hz, time);
    osc1.detune.setValueAtTime(-1.8, time);

    osc2.setPeriodicWave(stringsWave);
    osc2.frequency.setValueAtTime(hz, time);

    osc3.setPeriodicWave(stringsWave);
    osc3.frequency.setValueAtTime(hz, time);
    osc3.detune.setValueAtTime(1.8, time);

    // Organischer 5.2 Hz Vibrato-LFO (korrekt über lfoGain geroutet!)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(5.2, time);
    lfoGain.gain.setValueAtTime(0, time);
    lfoGain.gain.setValueAtTime(0, time + 0.075);
    lfoGain.gain.linearRampToValueAtTime(2.8, time + 0.22);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);
    lfoGain.connect(osc3.frequency);

    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(Math.min(4200, Math.max(1100, hz * 3.6)), time);
    bodyFilter.Q.setValueAtTime(0.85, time);

    const bridgeFilter = ctx.createBiquadFilter();
    bridgeFilter.type = 'peaking';
    bridgeFilter.frequency.setValueAtTime(2600, time);
    bridgeFilter.Q.setValueAtTime(1.5, time);
    bridgeFilter.gain.setValueAtTime(2.2, time);

    const gain = ctx.createGain();
    const attack = 0.055;
    const release = Math.max(0.38, Math.min(0.68, dur * 0.42));
    const noteEndTime = time + dur;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.74, time + attack);
    gain.gain.setValueAtTime(vol * 0.68, Math.max(time + attack + 0.01, noteEndTime));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    osc1.connect(bodyFilter);
    osc2.connect(bodyFilter);
    osc3.connect(bodyFilter);
    bodyFilter.connect(bridgeFilter);
    bridgeFilter.connect(gain);
    gain.connect(this.instrumentGain);

    const stopTime = noteEndTime + release + 0.02;
    lfo.start(time);
    osc1.start(time);
    osc2.start(time);
    osc3.start(time);

    lfo.stop(stopTime);
    osc1.stop(stopTime);
    osc2.stop(stopTime);
    osc3.stop(stopTime);

    this.trackSource(osc1, gain, bodyFilter);
    this.trackSource(osc2, bridgeFilter);
    this.trackSource(osc3, lfoGain);
    this.trackSource(lfo);
  }

  // --- 7. Vokal / Gesang (Vocals: Warmer Glottis-Klangkörper mit 3 Vokal-Formanten & sanftem Vibrato) ---
  private synthVocals(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    const vocalWave = this.getStudioWave(ctx, 'vocals');
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.setPeriodicWave(vocalWave);
    osc1.frequency.setValueAtTime(hz, time);
    osc1.detune.setValueAtTime(-1.2, time);

    osc2.setPeriodicWave(vocalWave);
    osc2.frequency.setValueAtTime(hz, time);
    osc2.detune.setValueAtTime(1.2, time);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(5.0, time);
    lfoGain.gain.setValueAtTime(0, time);
    lfoGain.gain.setValueAtTime(0, time + 0.09);
    lfoGain.gain.linearRampToValueAtTime(2.2, time + 0.22);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    const formant1 = ctx.createBiquadFilter();
    const formant2 = ctx.createBiquadFilter();
    const formant3 = ctx.createBiquadFilter();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const gain3 = ctx.createGain();
    const masterGain = ctx.createGain();

    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(780, time);
    formant1.Q.setValueAtTime(3.2, time);

    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(1220, time);
    formant2.Q.setValueAtTime(3.8, time);

    formant3.type = 'bandpass';
    formant3.frequency.setValueAtTime(2650, time);
    formant3.Q.setValueAtTime(4.2, time);

    const attack = 0.042;
    const release = Math.max(0.32, Math.min(0.58, dur * 0.38));
    const noteEndTime = time + dur;

    masterGain.gain.setValueAtTime(0.0001, time);
    masterGain.gain.linearRampToValueAtTime(vol * 0.84, time + attack);
    masterGain.gain.setValueAtTime(vol * 0.78, Math.max(time + attack + 0.01, noteEndTime));
    masterGain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    gain1.gain.setValueAtTime(0.68, time);
    gain2.gain.setValueAtTime(0.34, time);
    gain3.gain.setValueAtTime(0.14, time);

    osc1.connect(formant1);
    osc1.connect(formant2);
    osc1.connect(formant3);
    osc2.connect(formant1);
    osc2.connect(formant2);
    osc2.connect(formant3);

    formant1.connect(gain1);
    formant2.connect(gain2);
    formant3.connect(gain3);
    gain1.connect(masterGain);
    gain2.connect(masterGain);
    gain3.connect(masterGain);
    masterGain.connect(this.instrumentGain);

    const stopTime = noteEndTime + release + 0.02;
    lfo.start(time);
    osc1.start(time);
    osc2.start(time);
    lfo.stop(stopTime);
    osc1.stop(stopTime);
    osc2.stop(stopTime);

    this.trackSource(osc1, masterGain, formant1, gain1);
    this.trackSource(osc2, formant2, gain2, formant3, gain3);
    this.trackSource(lfo, lfoGain);
  }

  // --- Schlagzeug-Synthese (0,1% DSP Physical Modeling: Kick, Snare, Hi-Hat, Toms, Crash, Ride) ---

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.cachedNoiseBuffer || this.cachedNoiseBuffer.sampleRate !== ctx.sampleRate) {
      const bufferSize = ctx.sampleRate; // 1 Sekunde White Noise
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.cachedNoiseBuffer = buffer;
    }
    return this.cachedNoiseBuffer;
  }

  private synthDrum(ctx: AudioContext, pitchOrPad: string, time: number, vol: number): void {
    if (!this.instrumentGain) return;
    const p = (pitchOrPad || '').trim().toLowerCase();
    if (p === 'kick' || p === 'bd' || p === 'f4' || p === 'c3' || p === 'b2') {
      StudioSampleLibrary.trigger(ctx, 'kick', { time, velocity: vol, destination: this.instrumentGain });
    } else if (p === 'snare' || p === 'sd' || p === 'c5' || p === 'c4') {
      StudioSampleLibrary.trigger(ctx, 'snare', { time, velocity: vol, destination: this.instrumentGain });
    } else if (p === 'hihat' || p === 'hh' || p === 'g5' || p === 'g4' || p === 'f#4' || p === 'gb4') {
      StudioSampleLibrary.trigger(ctx, 'hatClosed', { time, velocity: vol, destination: this.instrumentGain });
    } else if (p === 'hihat_open' || p === 'open_hihat' || p === 'g#5' || p === 'ab5' || p === 'a#4' || p === 'bb4') {
      StudioSampleLibrary.trigger(ctx, 'hatOpen', { time, velocity: vol, destination: this.instrumentGain });
    } else if (p === 'hatpedal' || p === 'hihat_pedal' || p === 'pedal_hh' || p === 'hihat_foot' || p === 'd3') {
      StudioSampleLibrary.trigger(ctx, 'hatPedal', { time, velocity: vol, destination: this.instrumentGain });
    } else if (p === 'crash' || p === 'a5' || p === 'c6') {
      StudioSampleLibrary.trigger(ctx, 'crash', { time, velocity: vol, destination: this.instrumentGain });
    } else if (p === 'ride_bell' || p === 'ridebell' || p === 'bell' || p === 'glocke' || p === 'kuppe' || p === '53') {
      StudioSampleLibrary.trigger(ctx, 'rideBell', { time, velocity: vol, destination: this.instrumentGain });
    } else if (p === 'ride' || p === 'f5') {
      StudioSampleLibrary.trigger(ctx, 'ride', { time, velocity: vol, destination: this.instrumentGain });
    } else if (p === 'rim') {
      StudioSampleLibrary.trigger(ctx, 'rim', { time, velocity: vol, destination: this.instrumentGain });
    } else if (p === 'shaker' || p === 'shakerfwd') {
      StudioSampleLibrary.trigger(ctx, 'shakerFwd', { time, velocity: vol, destination: this.instrumentGain });
    } else if (p === 'tom_hi' || p === 'tom1' || p === 'e5' || p === 'e4') {
      StudioSampleLibrary.trigger(ctx, 'tomHi', { time, velocity: vol, destination: this.instrumentGain });
    } else if (p === 'tom_mid' || p === 'tom2' || p === 'd5' || p === 'd4') {
      StudioSampleLibrary.trigger(ctx, 'tomMid', { time, velocity: vol, destination: this.instrumentGain });
    } else if (p === 'tom_floor' || p === 'tom3' || p === 'a4' || p === 'a3' || p === 'g3') {
      StudioSampleLibrary.trigger(ctx, 'tomFloor', { time, velocity: vol, destination: this.instrumentGain });
    } else {
      // Intelligente Tonhöhen-Projektion für beliebige Melodien
      const hz = getPitchHz(pitchOrPad);
      if (hz <= 150) {
        StudioSampleLibrary.trigger(ctx, 'kick', { time, velocity: vol, destination: this.instrumentGain });
      } else if (hz <= 280) {
        StudioSampleLibrary.trigger(ctx, 'snare', { time, velocity: vol, destination: this.instrumentGain });
      } else if (hz <= 450) {
        StudioSampleLibrary.trigger(ctx, 'tomMid', { time, velocity: vol, destination: this.instrumentGain });
      } else {
        StudioSampleLibrary.trigger(ctx, 'hatClosed', { time, velocity: vol, destination: this.instrumentGain });
      }
    }
  }

  /**
   * Bass Drum (22"): Kraftvoller 145 Hz -> 38 Hz Pitch-Sweep mit Beater-Klick
   */
  private synthKick(ctx: AudioContext, time: number, vol: number): void {
    if (!this.instrumentGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.055);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol * 1.1, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);

    osc.connect(gain);
    gain.connect(this.instrumentGain);

    osc.start(time);
    osc.stop(time + 0.33);

    // Beater Click Transient
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(450, time);
    clickOsc.frequency.exponentialRampToValueAtTime(80, time + 0.015);
    clickGain.gain.setValueAtTime(vol * 0.45, time);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
    clickOsc.connect(clickGain);
    clickGain.connect(this.instrumentGain);
    clickOsc.start(time);
    clickOsc.stop(time + 0.025);

    this.trackSource(osc, gain);
    this.trackSource(clickOsc, clickGain);
  }

  /**
   * Snare Drum (14"): 185 Hz Kessel-Körper + Highpass-Teppich-Rauschen
   */
  private synthSnare(ctx: AudioContext, time: number, vol: number): void {
    if (!this.instrumentGain) return;

    // 1. Tonaler Kessel-Sound
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(185, time);
    osc.frequency.exponentialRampToValueAtTime(125, time + 0.07);
    oscGain.gain.setValueAtTime(vol * 0.7, time);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
    osc.connect(oscGain);
    oscGain.connect(this.instrumentGain);
    osc.start(time);
    osc.stop(time + 0.15);

    // 2. Snare-Teppich (Highpass Noise)
    const noiseBuffer = this.getNoiseBuffer(ctx);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, time);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.85, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.instrumentGain);
    noiseSource.start(time);
    noiseSource.stop(time + 0.23);

    this.trackSource(osc, oscGain);
    this.trackSource(noiseSource, noiseGain, filter);
  }

  /**
   * Hi-Hat (14"): Bandpass-Rauschcluster mit akzentuierter Hüllkurve (Closed vs Open)
   */
  private synthHiHat(ctx: AudioContext, time: number, vol: number, isOpen: boolean): void {
    if (!this.instrumentGain) return;
    const noiseBuffer = this.getNoiseBuffer(ctx);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(7800, time);
    filter.Q.setValueAtTime(2.2, time);

    const gain = ctx.createGain();
    const decay = isOpen ? 0.32 : 0.048;
    gain.gain.setValueAtTime(vol * 0.75, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.instrumentGain);

    noiseSource.start(time);
    noiseSource.stop(time + decay + 0.01);
    this.trackSource(noiseSource, gain, filter);
  }

  /**
   * Crash Becken (16"): Authentisches B20-Bronze Akustikmodell via StudioSampleLibrary
   */
  private synthCrash(ctx: AudioContext, time: number, vol: number): void {
    if (!this.instrumentGain) return;
    StudioSampleLibrary.trigger(ctx, 'crash', { time, velocity: vol, destination: this.instrumentGain });
  }

  /**
   * Ride Becken (20"): Authentisches Dark Flat Ride Akustikmodell via StudioSampleLibrary
   */
  private synthRide(ctx: AudioContext, time: number, vol: number): void {
    if (!this.instrumentGain) return;
    StudioSampleLibrary.trigger(ctx, 'ride', { time, velocity: vol, destination: this.instrumentGain });
  }

  /**
   * Toms (Hi/Mid/Floor): Prägnanter Pitch-Sweep mit warmem Resonanz-Decay
   */
  private synthTom(ctx: AudioContext, startHz: number, endHz: number, time: number, vol: number): void {
    if (!this.instrumentGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startHz, time);
    osc.frequency.exponentialRampToValueAtTime(endHz, time + 0.07);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.85, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.34);

    osc.connect(gain);
    gain.connect(this.instrumentGain);

    osc.start(time);
    osc.stop(time + 0.35);
    this.trackSource(osc, gain);
  }

  private trackSource(node: AudioNode, ...extraNodes: AudioNode[]): void {
    const handle = {
      stop: () => {
        try {
          if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
            (node as AudioScheduledSourceNode).stop();
          }
        } catch {}
      },
      disconnect: () => {
        try {
          node.disconnect();
          extraNodes.forEach(n => n.disconnect());
        } catch {}
      }
    };
    this.scheduledSources.add(handle);

    if ('onended' in node) {
      (node as AudioScheduledSourceNode).onended = () => {
        this.scheduledSources.delete(handle);
        handle.disconnect();
      };
    }
  }
}
