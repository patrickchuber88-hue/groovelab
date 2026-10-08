/**
 * Campus-Groovelab 2027 Goldstandard Audio Engine
 * EarSynthEngine.ts
 * 
 * High-fidelity Web Audio synthesis engine specifically tuned for ear training:
 * - Master-Bus DynamicsCompressorNode (Brickwall Limiter against headphone clipping)
 * - 3 rich harmonic instrument models: Rhodes, Grand Piano, Warm Strings
 * - Key Center Drone (Tonika-Bordun) for functional scale-degree ear training
 * - Sample-accurate timing for intervals, chords, cadences and song anchors
 */

import { StudioKeyboardEngine } from './StudioKeyboardEngine';

export type SoundEngineTimbre = 'rhodes' | 'grand_piano' | 'strings';
export type IntervalPlaybackMode = 'ascending' | 'descending' | 'harmonic';
export type ChordPlaybackMode = 'block' | 'arpeggio_up' | 'arpeggio_down';

export interface AnchorNoteStep {
  semitones: number;
  duration?: number;
  gap?: number;
  velocity?: number;
  isTargetInterval?: boolean;
}

export class EarSynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private limiterNode: DynamicsCompressorNode | null = null;
  
  // Drone Sub-Graph
  private droneGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private isDroneActive: boolean = false;
  private currentDroneRootMidi: number = 48; // C3 default
  private cadenceTimeoutIds: any[] = [];

  private activeTimbre: SoundEngineTimbre = 'rhodes';

  constructor() {
    // Lazy AudioContext initialization on first user interaction
  }

  public getContext(): AudioContext {
    if (typeof window === 'undefined') {
      throw new Error('EarSynthEngine requires a browser environment.');
    }
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.setupMasterChain();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Richtet den Master-Bus mit Brickwall-Limiter ein
   * Schützt Schüler-Ohren vor Übersteuerung und Kopfhörer-Clipping
   */
  private setupMasterChain() {
    if (!this.ctx) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    // Brickwall Limiter (EBU R128 Peak Guard)
    this.limiterNode = this.ctx.createDynamicsCompressor();
    this.limiterNode.threshold.setValueAtTime(-1.0, this.ctx.currentTime); // -1.0 dBFS
    this.limiterNode.knee.setValueAtTime(0.0, this.ctx.currentTime);        // Hard knee
    this.limiterNode.ratio.setValueAtTime(20.0, this.ctx.currentTime);     // 20:1 Limiting
    this.limiterNode.attack.setValueAtTime(0.001, this.ctx.currentTime);   // 1 ms
    this.limiterNode.release.setValueAtTime(0.05, this.ctx.currentTime);   // 50 ms

    this.masterGain.connect(this.limiterNode);
    this.limiterNode.connect(this.ctx.destination);
  }

  public setTimbre(timbre: SoundEngineTimbre) {
    this.activeTimbre = timbre;
  }

  public getTimbre(): SoundEngineTimbre {
    return this.activeTimbre;
  }

  /**
   * Wandelt MIDI Notennummer in Frequenz um (A4 = 440 Hz)
   */
  public midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Spielt einen einzelnen Ton mit der gewählten Klangfarbe
   */
  public playTone(
    freq: number, 
    startTime: number, 
    duration: number, 
    velocity: number = 0.35, 
    customTimbre?: SoundEngineTimbre
  ) {
    const ctx = this.getContext();
    if (!this.masterGain) this.setupMasterChain();
    if (!this.masterGain) return;

    const timbre = customTimbre || this.activeTimbre;
    const now = Math.max(ctx.currentTime, startTime);

    if (timbre === 'rhodes') {
      // 🎹 0,1% Studio Rhodes Suitcase 73 Mark I
      StudioKeyboardEngine.playRhodesNote(ctx, freq, {
        time: now,
        durationSec: duration,
        velocity,
        destination: this.masterGain
      });
    } else if (timbre === 'grand_piano') {
      // 🎹 0,1% Konzertflügel Cantabile mit 3-Chor Saiten-Schwebung
      StudioKeyboardEngine.playGrandPianoNote(ctx, freq, {
        time: now,
        durationSec: duration,
        velocity,
        destination: this.masterGain
      });
    } else {
      // 🎻 Warme Streicher / Strings-Pad: Sägezahn + Tiefpass mit weichem Einblenden
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const voiceGain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.002, now); // Subtiles Schwebungs-Detune

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.Q.setValueAtTime(2.0, now);

      const attack = Math.min(0.08, duration * 0.2);
      const release = 0.14;
      const noteEndTime = now + duration;

      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.linearRampToValueAtTime(velocity * 0.75, now + attack);
      voiceGain.gain.setValueAtTime(velocity * 0.68, Math.max(now + attack + 0.01, noteEndTime));
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + release);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(noteEndTime + release + 0.02);
      osc2.stop(noteEndTime + release + 0.02);
    }
  }

  /**
   * Spielt eine Note nach MIDI-Nummer
   */
  public playNote(
    midi: number, 
    duration: number = 1.0, 
    velocity: number = 0.35, 
    delaySec: number = 0, 
    customTimbre?: SoundEngineTimbre
  ) {
    const ctx = this.getContext();
    const freq = this.midiToFreq(midi);
    this.playTone(freq, ctx.currentTime + delaySec, duration, velocity, customTimbre);
  }

  /**
   * Spielt ein Intervall (aufsteigend, absteigend oder harmonisch zusammen)
   */
  public playInterval(
    rootMidi: number, 
    semitones: number, 
    mode: IntervalPlaybackMode = 'ascending',
    durationPerNote: number = 0.85,
    customTimbre?: SoundEngineTimbre
  ) {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const targetMidi = rootMidi + semitones;

    if (mode === 'ascending') {
      this.playNote(rootMidi, durationPerNote, 0.35, 0, customTimbre);
      this.playNote(targetMidi, durationPerNote + 0.2, 0.38, durationPerNote * 0.9, customTimbre);
    } else if (mode === 'descending') {
      this.playNote(targetMidi, durationPerNote, 0.38, 0, customTimbre);
      this.playNote(rootMidi, durationPerNote + 0.2, 0.35, durationPerNote * 0.9, customTimbre);
    } else {
      // Harmonisch (gleichzeitig)
      this.playNote(rootMidi, durationPerNote * 1.5, 0.3, 0, customTimbre);
      this.playNote(targetMidi, durationPerNote * 1.5, 0.3, 0, customTimbre);
    }
  }

  /**
   * Spielt einen Akkord (Block oder Arpeggio)
   */
  public playChord(
    rootMidi: number, 
    intervals: number[], 
    mode: ChordPlaybackMode = 'block',
    totalDuration: number = 2.0,
    customTimbre?: SoundEngineTimbre
  ) {
    if (mode === 'block') {
      intervals.forEach(semi => {
        this.playNote(rootMidi + semi, totalDuration, 0.28, 0, customTimbre);
      });
    } else if (mode === 'arpeggio_up') {
      const step = 0.22;
      intervals.forEach((semi, idx) => {
        this.playNote(rootMidi + semi, totalDuration - (idx * step), 0.32, idx * step, customTimbre);
      });
    } else {
      // Arpeggio down
      const reversed = [...intervals].reverse();
      const step = 0.22;
      reversed.forEach((semi, idx) => {
        this.playNote(rootMidi + semi, totalDuration - (idx * step), 0.32, idx * step, customTimbre);
      });
    }
  }

  /**
   * Spielt die Song-Anchor-Melodie zum Wiedererkennen des Intervalls
   * Mit dynamischem Spotlighting (die ersten 2 Töne/Ziel-Töne lauter) und authentischer Rhythmik
   */
  public playSongAnchor(
    rootMidi: number, 
    anchorNotes: (number | AnchorNoteStep)[], 
    defaultNoteDuration: number = 0.35,
    customTimbre?: SoundEngineTimbre
  ) {
    let accumulatedTime = 0;
    anchorNotes.forEach((step, idx) => {
      const stepObj: AnchorNoteStep = typeof step === 'number' ? { semitones: step } : step;
      const isLast = idx === anchorNotes.length - 1;
      const dur = stepObj.duration ?? (isLast ? defaultNoteDuration * 2.0 : defaultNoteDuration);
      const gap = stepObj.gap ?? (dur * 0.98);
      const isTarget = stepObj.isTargetInterval ?? (idx < 2);
      // 0,1% Goldstandard Spotlighting: Zieltöne prägnant (0.50), Melodiefortsetzung als sanfte Begleitung (0.22)
      const vel = stepObj.velocity ?? (isTarget ? 0.50 : 0.22);

      this.playNote(rootMidi + stepObj.semitones, dur, vel, accumulatedTime, customTimbre);
      accumulatedTime += gap;
    });
  }

  /**
   * Stoppt eine laufende Kadenz-Wiedergabe
   */
  public stopCadence() {
    this.cadenceTimeoutIds.forEach(id => clearTimeout(id));
    this.cadenceTimeoutIds = [];
  }

  /**
   * Spielt eine klassische Kadenz zur tonalen Einstimmung (I - IV - V - I)
   */
  public playCadence(rootMidi: number = 60, customTimbre?: SoundEngineTimbre) {
    this.stopCadence();

    // I: Dur (0, 4, 7)
    this.playChord(rootMidi, [0, 4, 7], 'block', 0.8, customTimbre);
    
    // IV: Subdominante (5, 9, 12)
    const t1 = setTimeout(() => {
      this.playChord(rootMidi, [0, 5, 9], 'block', 0.8, customTimbre);
    }, 750);

    // V: Dominante (7, 11, 14) -> (-1, 2, 7)
    const t2 = setTimeout(() => {
      this.playChord(rootMidi, [-1, 2, 7], 'block', 0.8, customTimbre);
    }, 1500);

    // I: Tonika Auflösung (0, 4, 7, 12)
    const t3 = setTimeout(() => {
      this.playChord(rootMidi, [0, 4, 7, 12], 'block', 1.4, customTimbre);
    }, 2250);

    this.cadenceTimeoutIds.push(t1, t2, t3);
  }

  /**
   * Startet den Key Center Drone (Tonika-Bordun)
   * Didaktische Schlüsselkomponente für relatives Gehörtraining nach Tonleiterstufen
   */
  public startKeyCenterDrone(rootMidi: number = 48) {
    const ctx = this.getContext();
    if (!this.masterGain) this.setupMasterChain();
    if (!this.masterGain) return;

    this.currentDroneRootMidi = rootMidi;

    if (this.isDroneActive) {
      // Wenn bereits aktiv, Frequenzen sanft anpassen
      this.setDroneRoot(rootMidi);
      return;
    }

    const now = ctx.currentTime;
    const rootFreq = this.midiToFreq(rootMidi);
    const fifthFreq = this.midiToFreq(rootMidi + 7);

    this.droneGain = ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.0001, now);
    // Sanftes Einblenden auf angenehmen Hintergrundpegel (8% Lautstärke)
    this.droneGain.gain.linearRampToValueAtTime(0.08, now + 0.6);

    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(450, now);

    this.droneOsc1 = ctx.createOscillator();
    this.droneOsc1.type = 'triangle';
    this.droneOsc1.frequency.setValueAtTime(rootFreq, now);

    this.droneOsc2 = ctx.createOscillator();
    this.droneOsc2.type = 'sine';
    this.droneOsc2.frequency.setValueAtTime(fifthFreq, now);

    this.droneOsc1.connect(this.droneFilter);
    this.droneOsc2.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    this.droneOsc1.start(now);
    this.droneOsc2.start(now);

    this.isDroneActive = true;
  }

  /**
   * Ändert die Tonika des Drones mit weichem Glissando
   */
  public setDroneRoot(rootMidi: number) {
    if (!this.isDroneActive || !this.droneOsc1 || !this.droneOsc2 || !this.ctx) {
      this.currentDroneRootMidi = rootMidi;
      return;
    }
    this.currentDroneRootMidi = rootMidi;
    const now = this.ctx.currentTime;
    const rootFreq = this.midiToFreq(rootMidi);
    const fifthFreq = this.midiToFreq(rootMidi + 7);

    this.droneOsc1.frequency.setTargetAtTime(rootFreq, now, 0.15);
    this.droneOsc2.frequency.setTargetAtTime(fifthFreq, now, 0.15);
  }

  /**
   * Stoppt den Key Center Drone mit leisem Fade-Out
   */
  public stopKeyCenterDrone() {
    if (!this.isDroneActive || !this.droneGain || !this.ctx) return;

    const now = this.ctx.currentTime;
    this.droneGain.gain.setTargetAtTime(0.0001, now, 0.12);

    const osc1 = this.droneOsc1;
    const osc2 = this.droneOsc2;

    setTimeout(() => {
      try {
        osc1?.stop();
        osc2?.stop();
        osc1?.disconnect();
        osc2?.disconnect();
      } catch (_) {}
    }, 450);

    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneFilter = null;
    this.droneGain = null;
    this.isDroneActive = false;
  }

  public getIsDroneActive(): boolean {
    return this.isDroneActive;
  }

  public getDroneRootMidi(): number {
    return this.currentDroneRootMidi;
  }

  /**
   * Spielt einen Stimmton (A4 = 440 Hz oder C4 = 261.63 Hz)
   */
  public playReferencePitch(freq: number = 440.0, duration: number = 2.0) {
    const ctx = this.getContext();
    this.playTone(freq, ctx.currentTime, duration, 0.35, 'rhodes');
  }

  /**
   * Stoppt sämtliche aktiven Klänge, Kadenzen und Drones
   */
  public stopAll() {
    this.stopCadence();
    this.stopKeyCenterDrone();
  }
}

// Globaler Singleton für konsistente AudioContext-Nutzung
export const earSynth = new EarSynthEngine();
