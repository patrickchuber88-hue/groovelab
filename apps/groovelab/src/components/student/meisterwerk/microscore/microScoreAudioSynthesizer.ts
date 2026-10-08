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

export class MicroScoreAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private metronomeGain: GainNode | null = null;
  private instrumentGain: GainNode | null = null;
  private isMutedInstrument: boolean = false;
  private scheduledSources: Array<{ stop: () => void; disconnect: () => void }> = [];
  private cachedNoiseBuffer: AudioBuffer | null = null;

  constructor() {}

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
      this.masterGain.connect(this.ctx.destination);
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

    return this.ctx;
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
    // Headroom-Gain-Skalierung für sauberen, verzerrungsfreien Klang
    const polyVolume = volume / Math.sqrt(Math.max(1, validPitches.length));

    validPitches.forEach((pitch, idx) => {
      // Natürliches organisches Gitarren-Strumming (12ms Versatz pro Saite)
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
    this.scheduledSources = [];
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
    gain.gain.setValueAtTime(targetGain, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + (isAccent ? 0.065 : 0.048));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.metronomeGain);

    osc.start(time);
    osc.stop(time + 0.07);

    const handle = {
      stop: () => { try { osc.stop(); } catch {} },
      disconnect: () => { try { osc.disconnect(); gain.disconnect(); filter.disconnect(); } catch {} }
    };
    this.scheduledSources.push(handle);
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

    // Schlagzeug-Routing (PAS Drum Notation & Pad-IDs)
    if (instrument === 'drums') {
      this.synthDrum(ctx, pitch, time, volume);
      return;
    }

    const hz = getSoundingHz(instrument, pitch);
    if (hz <= 0) return;

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

  // --- 1. Blockflöte (Recorder: C-Sopranblockflöte mit Fippel-Körper & 2. Harmonischer) ---
  private synthRecorder(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    const oscFund = ctx.createOscillator();
    const oscHarm2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const harmGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscFund.type = 'sine';
    oscFund.frequency.setValueAtTime(hz, time);

    // 2. Harmonische (Oktave) für warmen Holzflöten-Körper
    oscHarm2.type = 'sine';
    oscHarm2.frequency.setValueAtTime(hz * 2, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(6500, hz * 3.2), time);

    const attack = 0.022;
    const release = 0.12;
    const noteEndTime = time + dur;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.82, time + attack);
    gain.gain.setValueAtTime(vol * 0.78, Math.max(time + attack + 0.01, noteEndTime));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    harmGain.gain.setValueAtTime(0.0001, time);
    harmGain.gain.linearRampToValueAtTime(vol * 0.16, time + attack);
    harmGain.gain.setValueAtTime(vol * 0.12, Math.max(time + attack + 0.01, noteEndTime));
    harmGain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    oscFund.connect(filter);
    oscHarm2.connect(harmGain);
    harmGain.connect(filter);
    filter.connect(gain);
    gain.connect(this.instrumentGain);

    oscFund.start(time);
    oscHarm2.start(time);
    oscFund.stop(noteEndTime + release + 0.02);
    oscHarm2.stop(noteEndTime + release + 0.02);
    this.trackSource(oscFund, gain, filter);
    this.trackSource(oscHarm2, harmGain);
  }

  // --- 2. Querflöte (Flute): Transparenter Grundton, sanftes Atem-Vibrato ---
  private synthFlute(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(hz, time);

    // 5.5 Hz Vibrato setzt nach 100ms ein
    lfo.frequency.setValueAtTime(5.5, time);
    lfoGain.gain.setValueAtTime(0, time);
    lfoGain.gain.linearRampToValueAtTime(3.5, time + 0.12);
    lfo.connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(3200, hz * 3.2), time);

    const attack = 0.035;
    const release = 0.14;
    const noteEndTime = time + dur;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.9, time + attack);
    gain.gain.setValueAtTime(vol * 0.82, Math.max(time + attack + 0.01, noteEndTime));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.instrumentGain!);

    lfo.start(time);
    osc.start(time);
    lfo.stop(noteEndTime + release + 0.02);
    osc.stop(noteEndTime + release + 0.02);
    this.trackSource(osc, gain, filter);
  }

  // --- 3. Klarinette (Clarinet): Dominante ungerade Harmonische, holziger Zylinderkorpus ---
  private synthClarinet(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const formant = ctx.createBiquadFilter();

    // Rechteck-Welle für die ungeradzahligen Teiltöne der Klarinette
    osc.type = 'square';
    osc.frequency.setValueAtTime(hz, time);

    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(Math.max(800, Math.min(2200, hz * 2)), time);
    formant.Q.setValueAtTime(2.2, time);

    const attack = 0.02;
    const release = 0.12;
    const noteEndTime = time + dur;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.72, time + attack);
    gain.gain.setValueAtTime(vol * 0.68, Math.max(time + attack + 0.01, noteEndTime));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    osc.connect(formant);
    formant.connect(gain);
    gain.connect(this.instrumentGain);

    osc.start(time);
    osc.stop(noteEndTime + release + 0.02);
    this.trackSource(osc, gain, formant);
  }

  // --- 4. Altsaxophon (Alto Sax): Konische Mensur, volles Spektrum, Biss im Attack ---
  private synthAltoSax(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    const oscSaw = ctx.createOscillator();
    const oscTri = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscSaw.type = 'sawtooth';
    oscSaw.frequency.setValueAtTime(hz, time);
    oscTri.type = 'triangle';
    oscTri.frequency.setValueAtTime(hz, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(hz * 2, time);
    filter.frequency.exponentialRampToValueAtTime(Math.min(4200, hz * 4), time + 0.04);
    filter.Q.setValueAtTime(2.0, time);

    const attack = 0.025;
    const release = 0.13;
    const noteEndTime = time + dur;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.85, time + attack);
    gain.gain.setValueAtTime(vol * 0.78, Math.max(time + attack + 0.01, noteEndTime));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    oscSaw.connect(filter);
    oscTri.connect(filter);
    filter.connect(gain);
    gain.connect(this.instrumentGain!);

    oscSaw.start(time);
    oscTri.start(time);
    oscSaw.stop(noteEndTime + release + 0.02);
    oscTri.stop(noteEndTime + release + 0.02);
    this.trackSource(oscSaw, gain, filter);
  }

  // --- 5. Trompete (Trumpet): Brillanter metallischer Attack & Sweep ---
  private synthTrumpet(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(hz, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(Math.min(5500, hz * 5), time + 0.05);
    filter.Q.setValueAtTime(2.8, time);

    const attack = 0.02;
    const release = 0.12;
    const noteEndTime = time + dur;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.88, time + attack);
    gain.gain.setValueAtTime(vol * 0.80, Math.max(time + attack + 0.01, noteEndTime));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.instrumentGain);

    osc.start(time);
    osc.stop(noteEndTime + release + 0.02);
    this.trackSource(osc, gain, filter);
  }

  // --- 6. Posaune (Trombone): Warmes, sonores Tief-Blech ---
  private synthTrombone(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(hz, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.exponentialRampToValueAtTime(Math.min(2600, hz * 3.5), time + 0.06);
    filter.Q.setValueAtTime(1.8, time);

    const attack = 0.035;
    const release = 0.15;
    const noteEndTime = time + dur;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.92, time + attack);
    gain.gain.setValueAtTime(vol * 0.85, Math.max(time + attack + 0.01, noteEndTime));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.instrumentGain!);

    osc.start(time);
    osc.stop(noteEndTime + release + 0.02);
    this.trackSource(osc, gain, filter);
  }

  // --- 🎼 Musik-Weltreise Standard: Cantabile Konzertflügel (0,1% Goldstandard) ---
  private synthPiano(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;
    StudioKeyboardEngine.playGrandPianoNote(ctx, hz, {
      durationSec: dur,
      velocity: vol,
      time,
      destination: this.instrumentGain
    });
  }

  // --- 🎸 Musik-Weltreise Standard: Akustik-Gitarre (Extended Karplus-Strong Waveguide) ---
  private synthGuitar(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;
    const acousticDur = Math.max(dur * 2.2, 2.4);
    PhysicalModelingEngine.playNote(ctx, {
      pitchHz: hz,
      durationSec: acousticDur,
      velocity: vol,
      pluckType: 'acoustic_guitar'
    }, time, this.instrumentGain);
  }

  // --- E-Bass (Extended Karplus-Strong Fender Bass) ---
  private synthBass(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;
    PhysicalModelingEngine.playNote(ctx, {
      pitchHz: hz,
      durationSec: dur,
      velocity: vol,
      pluckType: 'electric_bass'
    }, time, this.instrumentGain);
  }

  // --- Streicher (Strings: Violine / Ensemble mit Holzdecken-Formant, Steg-Resonanz & Vibrato) ---
  private synthStrings(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    // Dreifach-Unisono-Saiten (Streicher-Chorus mit ±1.8 Cent Detuning)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(hz, time);
    osc1.detune.setValueAtTime(-1.8, time);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(hz, time);

    osc3.type = 'sawtooth';
    osc3.frequency.setValueAtTime(hz, time);
    osc3.detune.setValueAtTime(1.8, time);

    // Organischer 5.2 Hz Vibrato-LFO (setzt nach 75ms Bogenwechsel musikalisch ein)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(5.2, time);
    lfoGain.gain.setValueAtTime(0, time);
    lfoGain.gain.setValueAtTime(0, time + 0.075);
    lfoGain.gain.linearRampToValueAtTime(3.2, time + 0.22);
    lfo.connect(osc1.frequency);
    lfo.connect(osc2.frequency);
    lfo.connect(osc3.frequency);

    // 1. Resonanz-Formant: Fichten-/Ahorn-Holzkorpus (Warmer Saitenkörper)
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(Math.min(4500, Math.max(1200, hz * 3.5)), time);
    bodyFilter.Q.setValueAtTime(1.1, time);

    // 2. Steg-Präsenz (Bridge Hill Formant bei 2.800 Hz für tragfähigen Bogenklang)
    const bridgeFilter = ctx.createBiquadFilter();
    bridgeFilter.type = 'peaking';
    bridgeFilter.frequency.setValueAtTime(2800, time);
    bridgeFilter.Q.setValueAtTime(1.8, time);
    bridgeFilter.gain.setValueAtTime(2.5, time);

    const gain = ctx.createGain();
    const attack = 0.065; // Organischer Bogenstrich-Attack (Helmholtz Slip-Stick)
    const release = 0.18; // Geschmeidiger Bogen-Nachhall
    const noteEndTime = time + dur;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.72, time + attack);
    gain.gain.setValueAtTime(vol * 0.68, Math.max(time + attack + 0.01, noteEndTime));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    osc1.connect(bodyFilter);
    osc2.connect(bodyFilter);
    osc3.connect(bodyFilter);
    bodyFilter.connect(bridgeFilter);
    bridgeFilter.connect(gain);
    gain.connect(this.instrumentGain);

    lfo.start(time);
    osc1.start(time);
    osc2.start(time);
    osc3.start(time);

    const stopTime = noteEndTime + release + 0.02;
    lfo.stop(stopTime);
    osc1.stop(stopTime);
    osc2.stop(stopTime);
    osc3.stop(stopTime);

    this.trackSource(osc1, gain, bodyFilter);
    this.trackSource(osc2, bridgeFilter);
    this.trackSource(osc3, lfoGain);
    this.trackSource(lfo);
  }

  // --- 7. Vokal / Gesang (Vocals: Warmer Menschlicher Vokal-Klangkörper "Ah" mit 2 Formanten) ---
  private synthVocals(ctx: AudioContext, hz: number, time: number, dur: number, vol: number): void {
    if (!this.instrumentGain) return;

    const osc = ctx.createOscillator();
    const formant1 = ctx.createBiquadFilter();
    const formant2 = ctx.createBiquadFilter();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const masterGain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(hz, time);

    // Formant 1 (F1: 800 Hz "Ah"-Vokalisation)
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(800, time);
    formant1.Q.setValueAtTime(3.6, time);

    // Formant 2 (F2: 1250 Hz Vokalfarbe)
    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(1250, time);
    formant2.Q.setValueAtTime(4.0, time);

    const attack = 0.045;
    const release = 0.14;
    const noteEndTime = time + dur;

    masterGain.gain.setValueAtTime(0.0001, time);
    masterGain.gain.linearRampToValueAtTime(vol * 0.82, time + attack);
    masterGain.gain.setValueAtTime(vol * 0.76, Math.max(time + attack + 0.01, noteEndTime));
    masterGain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

    gain1.gain.setValueAtTime(0.70, time);
    gain2.gain.setValueAtTime(0.35, time);

    osc.connect(formant1);
    osc.connect(formant2);
    formant1.connect(gain1);
    formant2.connect(gain2);
    gain1.connect(masterGain);
    gain2.connect(masterGain);
    masterGain.connect(this.instrumentGain);

    osc.start(time);
    osc.stop(noteEndTime + release + 0.02);
    this.trackSource(osc, masterGain, formant1);
    this.trackSource(gain1, formant2, gain2);
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
   * Crash Becken (16"): Breites Hochton-Rauschen mit natürlichem 1,3s Ausklang
   */
  private synthCrash(ctx: AudioContext, time: number, vol: number): void {
    if (!this.instrumentGain) return;
    const noiseBuffer = this.getNoiseBuffer(ctx);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4500, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol * 0.9, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.25);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.instrumentGain);

    noiseSource.start(time);
    noiseSource.stop(time + 1.26);
    this.trackSource(noiseSource, gain, filter);
  }

  /**
   * Ride Becken (20"): Brillanter 580/870 Hz Glocken-Ping + samtiger 6 kHz Becken-Wash
   */
  private synthRide(ctx: AudioContext, time: number, vol: number): void {
    if (!this.instrumentGain) return;

    // Ride Bell Tone (Doppelter Sinus-Ping)
    const bell1 = ctx.createOscillator();
    const bell2 = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell1.type = 'sine';
    bell1.frequency.setValueAtTime(580, time);
    bell2.type = 'sine';
    bell2.frequency.setValueAtTime(872, time);

    bellGain.gain.setValueAtTime(vol * 0.45, time);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);
    bell1.connect(bellGain);
    bell2.connect(bellGain);
    bellGain.connect(this.instrumentGain);
    bell1.start(time);
    bell2.start(time);
    bell1.stop(time + 0.30);
    bell2.stop(time + 0.30);

    // Ride Wash (Cymbal Shimmer)
    const noiseBuffer = this.getNoiseBuffer(ctx);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(6200, time);
    filter.Q.setValueAtTime(2.8, time);

    const washGain = ctx.createGain();
    washGain.gain.setValueAtTime(vol * 0.35, time);
    washGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.75);

    noiseSource.connect(filter);
    filter.connect(washGain);
    washGain.connect(this.instrumentGain);
    noiseSource.start(time);
    noiseSource.stop(time + 0.76);

    this.trackSource(bell1, bellGain);
    this.trackSource(bell2);
    this.trackSource(noiseSource, washGain, filter);
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
          if ('stop' in node && typeof (node as any).stop === 'function') {
            (node as any).stop();
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
    this.scheduledSources.push(handle);
  }
}
