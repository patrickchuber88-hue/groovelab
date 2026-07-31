import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2, VolumeX, Music, Clock, Sliders, RotateCcw } from 'lucide-react';
import { ACOUSTIC_STUDIO_SAMPLES } from './AcousticDrumSamples';

// Helper to decode Base64 WAV into AudioBuffer
const decodeBase64Wav = (ctx: AudioContext, b64Uri: string): AudioBuffer => {
  const base64 = b64Uri.split(',')[1];
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  // Synchronous PCM WAV decoding for instant 0ms play
  const sr = ctx.sampleRate;
  const numSamples = Math.floor((bytes.length - 44) / 2);
  const buf = ctx.createBuffer(1, numSamples, sr);
  const chan = buf.getChannelData(0);
  const dataView = new DataView(bytes.buffer);
  
  for (let i = 0; i < numSamples; i++) {
    const raw = dataView.getInt16(44 + i * 2, true);
    chan[i] = raw / 32768.0;
  }
  return buf;
};

export interface GroovePracticeCompanionProps {
  useNotebookLayout?: boolean;
}

// GroovePracticeCompanion (Student Metronome & Beat Generator)
// -------------------------------------------------------------


export const GroovePracticeCompanion: React.FC<any> = ({ useNotebookLayout }) => {
  const getBeatsPerBar = (style: string) => {
    if (style === 'walzer') return 3;
    if (style === 'ballad68') return 6;
    return 4;
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [selectedStyle, setSelectedStyle] = useState<'metronome' | 'rock' | 'hiphop' | 'swing' | 'latin' | 'funk' | 'reggae' | 'walzer' | 'ballad68' | 'disco' | 'singersongwriter'>('metronome');
  const [selectedVariation, setSelectedVariation] = useState<'A' | 'B' | 'C'>('A');
  const [volMaster, setVolMaster] = useState(100);
  const [volKick, setVolKick] = useState(100);
  const [volSnare, setVolSnare] = useState(100);
  const [volHat, setVolHat] = useState(100);
  const [volMetronome, setVolMetronome] = useState(100);
  
  const [mutedInstruments, setMutedInstruments] = useState<string[]>([]);
  const [soloedInstruments, setSoloedInstruments] = useState<string[]>([]);
  
  const [activeBeatIndex, setActiveBeatIndex] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0.0);
  const current16thNoteRef = useRef(0);
  const timerIdRef = useRef<any>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const [barProgress, setBarProgress] = useState(0);
  const barStartAudioTimeRef = useRef<number>(0);
  const progressFrameRef = useRef<number | null>(null);

  // Refs to allow real-time volume, variation, and solo/mute adjustments without rebuilding the scheduler loop
  const volMasterRef = useRef(volMaster);
  const volKickRef = useRef(volKick);
  const volSnareRef = useRef(volSnare);
  const volHatRef = useRef(volHat);
  const volMetronomeRef = useRef(volMetronome);
  const selectedVariationRef = useRef(selectedVariation);
  const mutedInstrumentsRef = useRef(mutedInstruments);
  const soloedInstrumentsRef = useRef(soloedInstruments);

  useEffect(() => {
    volMasterRef.current = volMaster;
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime((volMaster / 100) * 1.5, audioCtxRef.current.currentTime);
    }
  }, [volMaster]);
  useEffect(() => { volKickRef.current = volKick; }, [volKick]);
  useEffect(() => { volSnareRef.current = volSnare; }, [volSnare]);
  useEffect(() => { volHatRef.current = volHat; }, [volHat]);
  useEffect(() => { volMetronomeRef.current = volMetronome; }, [volMetronome]);
  useEffect(() => { selectedVariationRef.current = selectedVariation; }, [selectedVariation]);
  useEffect(() => { mutedInstrumentsRef.current = mutedInstruments; }, [mutedInstruments]);
  useEffect(() => { soloedInstrumentsRef.current = soloedInstruments; }, [soloedInstruments]);

  const toggleMute = (inst: string) => {
    setMutedInstruments(prev => 
      prev.includes(inst) ? prev.filter(x => x !== inst) : [...prev, inst]
    );
  };
  const toggleSolo = (inst: string) => {
    setSoloedInstruments(prev => 
      prev.includes(inst) ? prev.filter(x => x !== inst) : [...prev, inst]
    );
  };
  const isMuted = (inst: string) => mutedInstruments.includes(inst);
  const isSolo = (inst: string) => soloedInstruments.includes(inst);

  // Keep bpm and style in refs to update scheduler on the fly without closing AudioContext
  const bpmRef = useRef(bpm);
  const selectedStyleRef = useRef(selectedStyle);
  const isPlayingRef = useRef(isPlaying);
  const sampleBufferCacheRef = useRef<Record<string, Record<string, AudioBuffer>>>({});

  const getOrCreateGenreSampleBuffers = (ctx: AudioContext, genre: string): Record<string, AudioBuffer> => {
    if (sampleBufferCacheRef.current[genre]) {
      return sampleBufferCacheRef.current[genre];
    }

    // Decode REAL Studio Recorded PCM WAV Samples & Sterile Quartz Digital Metronome Click
    const kickBuf = decodeBase64Wav(ctx, ACOUSTIC_STUDIO_SAMPLES.kick);
    const snareBuf = decodeBase64Wav(ctx, ACOUSTIC_STUDIO_SAMPLES.snare);
    const hatClosedBuf = decodeBase64Wav(ctx, ACOUSTIC_STUDIO_SAMPLES.hatClosed);
    const hatOpenBuf = decodeBase64Wav(ctx, ACOUSTIC_STUDIO_SAMPLES.hatOpen);
    const clickBuf = decodeBase64Wav(ctx, ACOUSTIC_STUDIO_SAMPLES.click);

    // Helper: Render Wooden Rimshot AudioBuffer
    const renderRimBuffer = (): AudioBuffer => {
      const dur = 0.05;
      const sr = ctx.sampleRate;
      const buf = ctx.createBuffer(2, Math.floor(sr * dur), sr);
      const L = buf.getChannelData(0);
      const R = buf.getChannelData(1);
      const len = buf.length;

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const woodClick = Math.sin(2 * Math.PI * 980 * t) * Math.exp(-t * 80);
        const val = woodClick * 0.40;
        L[i] = val;
        R[i] = val;
      }
      return buf;
    };

    const kitBuffers: Record<string, AudioBuffer> = {
      kick: kickBuf,
      snare: snareBuf,
      hatClosed: hatClosedBuf,
      hatOpen: hatOpenBuf,
      rim: renderRimBuffer(),
      click: clickBuf
    };

    sampleBufferCacheRef.current[genre] = kitBuffers;
    return kitBuffers;
  };

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { selectedStyleRef.current = selectedStyle; }, [selectedStyle]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const tapTimesRef = useRef<number[]>([]);
  const handleTapTempo = () => {
    const now = performance.now();
    tapTimesRef.current = [...tapTimesRef.current.filter(t => now - t < 2000), now];
    if (tapTimesRef.current.length >= 2) {
      const intervals = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      setBpm(Math.max(40, Math.min(240, calculatedBpm)));
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      if (progressFrameRef.current) cancelAnimationFrame(progressFrameRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setActiveBeatIndex(null);
      setBarProgress(0);
      return;
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = (volMasterRef.current / 100) * 1.5;

    // 🎚️ Master Studio Bus Compressor & Limiter (100% Pure, Dry, Ring-Free Audio)
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, audioCtx.currentTime);
    compressor.knee.setValueAtTime(4, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(4.0, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.015, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.12, audioCtx.currentTime);

    // Pure Direct Routing: MasterGain -> Compressor -> Destination
    masterGain.connect(compressor);
    compressor.connect(audioCtx.destination);
    masterGainRef.current = masterGain;

    const bufferSize = audioCtx.sampleRate * 0.25;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    noiseBufferRef.current = noiseBuffer;

    nextNoteTimeRef.current = audioCtx.currentTime + 0.05;
    barStartAudioTimeRef.current = audioCtx.currentTime + 0.05;
    current16thNoteRef.current = 0;

    const syncBarProgress = () => {
      if (!audioCtxRef.current || !isPlayingRef.current) return;
      const ctx = audioCtxRef.current;
      const secondsPerBeat = 60.0 / bpmRef.current;
      const style = selectedStyleRef.current;
      const beats = style === 'walzer' ? 3 : (style === 'ballad68' ? 6 : 4);
      const secondsPerBar = secondsPerBeat * beats;
      
      const elapsed = ctx.currentTime - barStartAudioTimeRef.current;
      const progressPercent = Math.min(100, Math.max(0, (elapsed / secondsPerBar) * 100));
      setBarProgress(progressPercent);
      progressFrameRef.current = requestAnimationFrame(syncBarProgress);
    };
    progressFrameRef.current = requestAnimationFrame(syncBarProgress);

    const scheduler = () => {
      while (nextNoteTimeRef.current < audioCtx.currentTime + 0.1) {
        scheduleNote(current16thNoteRef.current, nextNoteTimeRef.current, audioCtx, masterGain);
        advanceNote();
      }
    };

    const advanceNote = () => {
      const secondsPerBeat = 60.0 / bpmRef.current;
      const style = selectedStyleRef.current;
      let stepsInBar = 16;
      let stepDuration = secondsPerBeat / 4;
      if (style === 'swing') {
        stepsInBar = 12;
        stepDuration = secondsPerBeat / 3;
      } else if (style === 'walzer') {
        stepsInBar = 12;
        stepDuration = secondsPerBeat / 4;
      } else if (style === 'ballad68') {
        stepsInBar = 12;
        stepDuration = secondsPerBeat / 2;
      }
      nextNoteTimeRef.current += stepDuration;
      current16thNoteRef.current = (current16thNoteRef.current + 1) % stepsInBar;
      
      if (current16thNoteRef.current === 0) {
        barStartAudioTimeRef.current = nextNoteTimeRef.current;
      }
    };

    timerIdRef.current = setInterval(scheduler, 25);
    return () => {
      clearInterval(timerIdRef.current);
      if (progressFrameRef.current) cancelAnimationFrame(progressFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [isPlaying]);

  const scheduleNote = (step: number, time: number, ctx: AudioContext, masterGain: GainNode) => {
    const getEffectiveVolume = (id: string, baseVol: number) => {
      if (soloedInstrumentsRef.current.length > 0 && !soloedInstrumentsRef.current.includes(id)) {
        return 0;
      }
      if (mutedInstrumentsRef.current.includes(id)) {
        return 0;
      }
      return baseVol / 100;
    };

    const kVol = getEffectiveVolume('kick', volKickRef.current);
    const sVol = getEffectiveVolume('snare', volSnareRef.current);
    const hVol = getEffectiveVolume('hat', volHatRef.current);
    const mVol = getEffectiveVolume('click', volMetronomeRef.current);

    const style = selectedStyleRef.current;
    const kitBuffers = getOrCreateGenreSampleBuffers(ctx, style);

    // High-End Sample Playback with Micro-Ramp (Zero Clicking & Phase-Locked Metronome Alignment)
    const playSample = (buffer: AudioBuffer, vol: number, volMultiplier = 1.0, pitchJitter = 0.0) => {
      if (vol <= 0.001 || !buffer) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      if (pitchJitter > 0) {
        source.playbackRate.value = 1 + (Math.random() * 2 - 1) * pitchJitter;
      }
      const gain = ctx.createGain();
      const targetGain = vol * volMultiplier * 1.5;
      // Micro 0.8ms linear ramp prevents DC zero-crossing clicks & pops
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(targetGain, time + 0.0008);
      
      source.connect(gain);
      gain.connect(masterGain);
      source.start(time);
    };

    const playKick = (volMul = 1.0) => playSample(kitBuffers.kick, kVol, volMul, 0.008);
    const playSnare = (volMul = 1.0) => playSample(kitBuffers.snare, sVol, volMul, 0.015);
    const playRimClick = (volMul = 1.0) => playSample(kitBuffers.rim, sVol, volMul * 0.8, 0.010);
    const playHat = (isOpen = false, volMul = 1.0) => playSample(isOpen ? kitBuffers.hatOpen : kitBuffers.hatClosed, hVol, volMul, 0.018);
    const playClick = (isAccent = false) => playSample(kitBuffers.click, mVol, isAccent ? 1.3 : 0.8, 0.005);

    const triggerVisualBeat = (beatIdx: number) => {
      ctx.resume().then(() => {
        if (!isPlayingRef.current) return;
        const msDiff = Math.max(0, (time - ctx.currentTime) * 1000);
        setTimeout(() => {
          if (isPlayingRef.current) {
            setActiveBeatIndex(beatIdx);
          }
        }, msDiff);
      });
    };

    const isSwing = selectedStyleRef.current === 'swing';
    const variant = selectedVariationRef.current; // 'A', 'B' or 'C'

    if (selectedStyleRef.current === 'metronome') {
      const beatIdx = Math.floor(step / 4);
      if (variant === 'A') {
        // V1: Classic quarter-note clicks
        if (step % 4 === 0) {
          playClick(beatIdx === 0);
          triggerVisualBeat(beatIdx);
        }
      } else if (variant === 'B') {
        // V2: Eighth-note clicks (pedagogical subdivision)
        if (step % 2 === 0) {
          playClick(step === 0);
          if (step % 4 === 0) triggerVisualBeat(beatIdx);
        }
      } else {
        // V3: 16th-note clicks (high resolution micro-timing)
        playClick(step === 0);
        if (step % 4 === 0) triggerVisualBeat(beatIdx);
      }
    } else if (selectedStyleRef.current === 'rock') {
      if (variant === 'A') {
        // V1: Solid basic Pop/Rock beat
        if (step === 0 || step === 8 || step === 10) playKick(1.0);
        if (step === 4 || step === 12) playSnare(1.0);
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 1.0 : 0.62);
      } else if (variant === 'B') {
        // V2: Groove+ (Syncopated kick upbeats)
        if (step === 0 || step === 6 || step === 8 || step === 10 || step === 14) playKick(1.0);
        if (step === 4 || step === 12) playSnare(1.0);
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 1.0 : 0.65);
      } else {
        // V3: Complex (Snare ghost notes + ride feel)
        if (step === 0 || step === 3 || step === 8 || step === 10 || step === 11) playKick(1.0);
        if (step === 4 || step === 12) playSnare(1.0);
        else if (step === 7 || step === 15) playSnare(0.25); // Ghost notes
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 1.05 : 0.72);
        else if (step === 11) playHat(false, 0.45);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'hiphop') {
      if (variant === 'A') {
        // V1: Classic laid-back pocket
        if (step === 0) playKick(1.3);
        else if (step === 3 || step === 10) playKick(0.9);
        if (step === 4 || step === 12) playSnare(1.1);
        else if (step === 7 || step === 15) playSnare(0.22);
        if (step % 2 === 0) playHat(step === 14, step % 4 === 0 ? 0.9 : 0.55);
      } else if (variant === 'B') {
        // V2: Groove+ (Boom-Bap double kick)
        if (step === 0 || step === 2 || step === 8 || step === 10) playKick(1.2);
        if (step === 4 || step === 12) playSnare(1.1);
        else if (step === 15) playSnare(0.25);
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 0.95 : 0.62);
      } else {
        // V3: Complex (Trap hat subdivisions/rolls)
        if (step === 0 || step === 8 || step === 11) playKick(1.3);
        if (step === 4 || step === 12) playSnare(1.15);
        // Hi-Hat roll on step 14 & 15
        if (step === 14 || step === 15) {
          playHat(false, 0.75);
        } else if (step % 2 === 0) {
          playHat(false, step % 4 === 0 ? 1.0 : 0.6);
        }
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (isSwing) {
      if (variant === 'A') {
        // V1: Classic jazz swing ride cymbal with feathered kick
        if (step === 0 || step === 3 || step === 6 || step === 9) playKick(0.32);
        if (step === 2) playRimClick(0.45);
        else if (step === 8) playSnare(0.4);
        if (step === 0 || step === 3 || step === 6 || step === 9) playHat(false, 1.0);
        else if (step === 2 || step === 5 || step === 8 || step === 11) playHat(true, 0.55);
        if (step === 3 || step === 9) playRimClick(0.25);
      } else if (variant === 'B') {
        // V2: Groove+ (Comping snare hits)
        if (step === 0 || step === 6) playKick(0.35);
        if (step === 2 || step === 5 || step === 11) playSnare(0.5); // active snare comping
        if (step === 0 || step === 3 || step === 6 || step === 9) playHat(false, 1.05);
        else if (step === 2 || step === 5 || step === 8 || step === 11) playHat(true, 0.62);
        if (step === 3 || step === 9) playRimClick(0.3);
      } else {
        // V3: Complex (Swing triplets fill)
        if (step === 0 || step === 6) playKick(0.5);
        if (step === 9 || step === 10 || step === 11) {
          playSnare(0.7); // crescendo snare fill
        } else if (step === 2 || step === 5) {
          playSnare(0.32);
        }
        if (step === 0 || step === 3 || step === 6 || step === 9) playHat(false, 1.0);
      }
      if (step % 3 === 0) triggerVisualBeat(Math.floor(step / 3));
    } else if (selectedStyleRef.current === 'latin') {
      if (variant === 'A') {
        // V1: Classic Bossa double kick & rim clave
        if (step === 0 || step === 3 || step === 8 || step === 11) playKick(0.95);
        if (step === 0 || step === 3 || step === 6 || step === 10 || step === 12) playRimClick(1.0);
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 0.8 : 0.48);
      } else if (variant === 'B') {
        // V2: Groove+ (High-energy Samba surdo sweep)
        if (step === 0 || step === 2 || step === 4 || step === 6 || step === 8 || step === 10 || step === 12 || step === 14) {
          playKick(step % 4 === 2 ? 1.15 : 0.6); // typical surdo groove
        }
        if (step === 0 || step === 4 || step === 8 || step === 12) playRimClick(0.95);
        if (step % 2 === 0) playHat(false, 0.75);
      } else {
        // V3: Complex (Cascara clave & open hats)
        if (step === 0 || step === 3 || step === 8 || step === 11) playKick(1.0);
        // Cascara rimshot pattern
        if (step === 0 || step === 2 || step === 3 || step === 5 || step === 6 || step === 8 || step === 10 || step === 11 || step === 13 || step === 14) {
          playRimClick(0.85);
        }
        if (step % 4 === 2) playHat(true, 0.7); // open hat barks
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'funk') {
      if (variant === 'A') {
        // V1: Funky Breakbeat with ghost snares
        if (step === 0 || step === 6 || step === 10 || step === 11) playKick(1.15);
        if (step === 4 || step === 12) playSnare(1.1);
        else if (step === 7 || step === 13 || step === 15) playSnare(0.28);
        if (step % 2 === 0) playHat(step === 6 || step === 14, (step === 6 || step === 14) ? 1.0 : (step % 4 === 0 ? 0.95 : 0.55));
        else if (step === 3 || step === 11) playHat(false, 0.35);
      } else if (variant === 'B') {
        // V2: Groove+ (Linear Funk - tight groove, no simultaneous strikes)
        if (step === 0 || step === 6 || step === 10) playKick(1.2);
        else if (step === 4 || step === 12 || step === 14) playSnare(1.15);
        else if (step === 2 || step === 8 || step === 15) playHat(false, 0.85);
      } else {
        // V3: Complex (Funk drum fill)
        if (step === 0 || step === 6 || step === 11) playKick(1.2);
        if (step === 4 || step === 12) playSnare(1.1);
        else if (step === 13 || step === 14 || step === 15) playSnare(0.9); // rapid fill
        if (step % 2 === 0) playHat(false, 0.8);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'reggae') {
      if (variant === 'A') {
        // V1: Classic One-Drop with guide click
        if (step === 8) { playKick(1.2); playSnare(1.05); }
        if (step === 4 || step === 12) playRimClick(0.9);
        if (step === 0) playRimClick(0.22); // pedagogical guide
        if (step % 2 === 0) playHat(false, (step === 2 || step === 6 || step === 10 || step === 14) ? 1.0 : 0.58);
      } else if (variant === 'B') {
        // V2: Groove+ (Steppers style - four on the floor kick)
        if (step === 0 || step === 4 || step === 8 || step === 12) playKick(1.15);
        if (step === 8) playSnare(1.05);
        if (step === 4 || step === 12) playRimClick(0.85);
        if (step % 2 === 0) playHat(false, 0.88);
      } else {
        // V3: Complex (Rocksteady with rimshot fill)
        if (step === 8) playKick(1.2);
        if (step === 8 || step === 14 || step === 15) playSnare(1.0);
        if (step === 4 || step === 12) playRimClick(0.9);
        if (step % 2 === 0) playHat(false, 0.8);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'walzer') {
      if (variant === 'A') {
        // V1: Classic Waltz boom-chick-chick
        if (step === 0) playKick(1.0);
        if (step === 4 || step === 8) { playRimClick(0.85); playSnare(0.22); }
        if (step % 2 === 0) playHat(false, step === 0 ? 0.95 : (step === 4 || step === 8 ? 0.72 : 0.45));
      } else if (variant === 'B') {
        // V2: Groove+ (Syncopated Jazz Waltz)
        if (step === 0 || step === 6) playKick(0.9);
        if (step === 4 || step === 8) playSnare(0.75);
        if (step === 0 || step === 3 || step === 4 || step === 7 || step === 8 || step === 11) playHat(false, 0.8);
      } else {
        // V3: Complex (Waltz snare fill)
        if (step === 0) playKick(1.0);
        if (step === 4) playSnare(0.7);
        if (step === 8 || step === 9 || step === 10 || step === 11) playSnare(0.8); // 3rd beat roll
        if (step % 2 === 0) playHat(false, 0.8);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'ballad68') {
      if (variant === 'A') {
        // V1: Slow 6/8 Triplet Ballad
        if (step === 0) playKick(1.2);
        else if (step === 5) playKick(0.6);
        if (step === 6) playSnare(1.1);
        if (step % 2 === 0) playHat(false, (step === 0 || step === 6) ? 1.0 : 0.6);
      } else if (variant === 'B') {
        // V2: Groove+ (Heartbeat Ballad)
        if (step === 0 || step === 4 || step === 5) playKick(1.1);
        if (step === 6) playSnare(1.15);
        else if (step === 11) playRimClick(0.5);
        if (step % 2 === 0) playHat(false, 0.82);
      } else {
        // V3: Complex (Ballad fill on 10/11)
        if (step === 0 || step === 5) playKick(1.2);
        if (step === 6) playSnare(1.1);
        else if (step === 10 || step === 11) playSnare(0.85); // roll
        if (step % 2 === 0) playHat(false, 0.8);
      }
      if (step % 2 === 0) triggerVisualBeat(Math.floor(step / 2));
    } else if (selectedStyleRef.current === 'disco') {
      if (variant === 'A') {
        // V1: Classic Four-on-the-Floor
        if (step === 0 || step === 4 || step === 8 || step === 12) playKick(1.15);
        if (step === 4 || step === 12) playSnare(1.0);
        if (step % 2 === 0) playHat(step === 2 || step === 6 || step === 10 || step === 14, (step === 2 || step === 6 || step === 10 || step === 14) ? 1.05 : 0.5);
      } else if (variant === 'B') {
        // V2: Groove+ (Syncopated Hi-hat opening)
        if (step === 0 || step === 4 || step === 8 || step === 12) playKick(1.15);
        if (step === 4 || step === 12) playSnare(1.0);
        // Hi-Hat bark on all offbeat eighths (2, 6, 10, 14 open, then closed on 3, 7, 11, 15)
        if (step === 2 || step === 6 || step === 10 || step === 14) {
          playHat(true, 1.1);
        } else if (step === 3 || step === 7 || step === 11 || step === 15) {
          playHat(false, 0.5);
        } else if (step % 4 === 0) {
          playHat(false, 0.85);
        }
      } else {
        // V3: Complex (Disco fill)
        if (step === 0 || step === 3 || step === 4 || step === 8 || step === 11 || step === 12) playKick(1.1);
        if (step === 4 || step === 12) playSnare(1.1);
        else if (step === 15) playSnare(0.8);
        if (step % 2 === 0) playHat(false, 0.8);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'singersongwriter') {
      if (variant === 'A') {
        // V1: Soft Acoustic Folk Pocket (Feathered Kick & Rimshot / Cross-Stick)
        if (step === 0 || step === 10) playKick(0.75);
        if (step === 4 || step === 12) playRimClick(0.9);
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 0.7 : 0.4);
      } else if (variant === 'B') {
        // V2: Groove+ (Shaker & Soft Brush Snare)
        if (step === 0 || step === 10) playKick(0.8);
        if (step === 4 || step === 12) playSnare(0.55); // soft brush snare
        else if (step === 7 || step === 15) playSnare(0.18); // subtle brush scrape
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 0.75 : 0.45);
      } else {
        // V3: Complex (Singer-Songwriter Acoustic Fill & Open Hat Sizzle)
        if (step === 0 || step === 6 || step === 10) playKick(0.85);
        if (step === 4 || step === 12) playSnare(0.65);
        else if (step === 14 || step === 15) playRimClick(0.75); // acoustic wooden fill
        if (step % 2 === 0) playHat(step === 10, step === 10 ? 0.8 : 0.5);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
      borderTop: '1px solid #e2e8f0',
      borderRadius: useNotebookLayout ? '0 0 24px 24px' : '24px',
      minHeight: '520px',
      color: '#1d1d1f',
      padding: '32px 28px',
      gap: '24px',
      width: '100%',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      
      <div style={{ display: 'flex', gap: '28px', flex: 1, width: '100%' }} className="flex-col lg:flex-row">
        {/* Left Column: Tempo / Tap / Visual Metronome */}
        <div style={{
          flex: '1 1 0%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #f1f3f5',
          padding: '24px',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          <div style={{ width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: '0.62rem', color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              ÜBE-METRONOM
            </span>
          </div>

          {/* Mechanical Metronome Container */}
          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
            <style>{`
              @keyframes swing-anim {
                0% { transform: rotate(-12deg); }
                100% { transform: rotate(12deg); }
              }
              @keyframes rotate-key {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>

            <svg width="180" height="215" viewBox="0 0 180 215" style={{ overflow: 'visible' }}>
              <defs>
                {/* Walnut Wood Gradient */}
                <linearGradient id="walnutWood" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6c472c" />
                  <stop offset="40%" stopColor="#53331b" />
                  <stop offset="85%" stopColor="#2f1d0f" />
                  <stop offset="100%" stopColor="#1c1109" />
                </linearGradient>
                {/* Wood Shadow Overlay */}
                <radialGradient id="woodGlow" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#ffe5d9" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
                </radialGradient>
                {/* Hollow Interior Shadow */}
                <linearGradient id="interiorChamber" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#19110d" />
                  <stop offset="100%" stopColor="#060403" />
                </linearGradient>
                {/* Ivory scale Plate */}
                <linearGradient id="ivoryPlate" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbf9f4" />
                  <stop offset="100%" stopColor="#e5decb" />
                </linearGradient>
                {/* Steel Pendulum Rod */}
                <linearGradient id="steelRod" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f3f4f6" />
                  <stop offset="50%" stopColor="#9ca3af" />
                  <stop offset="100%" stopColor="#d1d5db" />
                </linearGradient>
                {/* Brass Gold Gradient */}
                <linearGradient id="brassGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffe066" />
                  <stop offset="35%" stopColor="#e5c142" />
                  <stop offset="75%" stopColor="#b58e17" />
                  <stop offset="100%" stopColor="#7a5b08" />
                </linearGradient>
                {/* Soft Casing Drop Shadow */}
                <filter id="casingShadow" x="-20%" y="-10%" width="140%" height="130%">
                  <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.32" />
                </filter>
              </defs>

              {/* Side Winding Key (Connected cleanly to right casing edge at x=138, static 3D angle) */}
              <g style={{
                transformOrigin: '138px 145px',
                transform: 'rotate(25deg)',
                transition: 'transform 0.2s ease-out'
              }}>
                <rect x="136" y="142" width="8" height="6" fill="url(#brassGold)" stroke="#7a5b08" strokeWidth="0.8" rx="1" />
                <path d="M 144 145 C 144 138, 158 138, 158 145 C 158 152, 144 152, 144 145 Z" fill="none" stroke="url(#brassGold)" strokeWidth="2.5" />
                <circle cx="144" cy="145" r="1.8" fill="#5a3d00" />
              </g>

              {/* 3D Pyramid Casing (Walnut Wood) */}
              <path 
                d="M 90 12 L 24 195 C 24 201, 30 205, 38 205 L 142 205 C 150 205, 156 201, 156 195 Z" 
                fill="url(#walnutWood)" 
                stroke="#2f1d0f" 
                strokeWidth="2.5"
                filter="url(#casingShadow)"
              />
              <path 
                d="M 90 12 L 24 195 C 24 201, 30 205, 38 205 L 142 205 C 150 205, 156 201, 156 195 Z" 
                fill="url(#woodGlow)" 
                style={{ mixBlendMode: 'multiply' }}
              />

              {/* Golden Casing Trim Line */}
              <path 
                d="M 90 18 L 29 191 C 32 195, 36 197, 42 197 L 138 197 C 144 197, 148 195, 151 191 Z" 
                fill="none" 
                stroke="#e5c142" 
                strokeWidth="1.2" 
                opacity="0.32"
              />

              {/* Hollow Interior Chamber (Trapezoid for wider text space at top) */}
              <path 
                d="M 78 35 L 102 35 L 138 188 L 42 188 Z" 
                fill="url(#interiorChamber)" 
                stroke="#19110d" 
                strokeWidth="1.5"
              />

              {/* Ivory scale Plate (Trapezoid fitting scale markings perfectly) */}
              <path 
                d="M 80 40 L 100 40 L 134 184 L 46 184 Z" 
                fill="url(#ivoryPlate)" 
                stroke="#b5ad9e"
                strokeWidth="0.5"
              />

              {/* Detailed Scale Lines and Tempo Markings (Left Column: BPM, Right Column: Term) */}
              <g fill="#1d1d1f" opacity="0.65" fontFamily="Georgia, serif" fontSize="5.5" fontWeight="bold">
                {/* Center axis line */}
                <line x1="90" y1="45" x2="90" y2="175" stroke="#1d1d1f" strokeWidth="0.8" opacity="0.25" />

                {/* 40 Largo */}
                <line x1="82" y1="65" x2="98" y2="65" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="76" y="67" textAnchor="end">40</text>
                <text x="104" y="67" textAnchor="start">Largo</text>

                {/* 80 Adagio */}
                <line x1="80" y1="83" x2="100" y2="83" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="74" y="85" textAnchor="end">80</text>
                <text x="106" y="85" textAnchor="start">Adagio</text>

                {/* 120 Andante */}
                <line x1="78" y1="101" x2="102" y2="101" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="72" y="103" textAnchor="end">120</text>
                <text x="108" y="103" textAnchor="start">Andante</text>

                {/* 160 Allegro */}
                <line x1="76" y1="119" x2="104" y2="119" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="70" y="121" textAnchor="end">160</text>
                <text x="110" y="121" textAnchor="start">Allegro</text>

                {/* 200 Presto */}
                <line x1="74" y1="137" x2="106" y2="137" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="68" y="139" textAnchor="end">200</text>
                <text x="112" y="139" textAnchor="start">Presto</text>

                {/* 240 Prestissimo */}
                <line x1="72" y1="155" x2="108" y2="155" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="66" y="157" textAnchor="end">240</text>
                <text x="114" y="157" textAnchor="start">Prestiss</text>
              </g>

              {/* Pendulum Shadow Group (Swings behind the rod for massive 3D depth) */}
              <g style={{
                transformOrigin: '87px 180px',
                transform: isPlaying ? 'none' : 'rotate(0deg)',
                animation: isPlaying ? `swing-anim ${60 / bpm}s ease-in-out infinite alternate` : 'none',
                transition: isPlaying ? 'none' : 'transform 0.3s ease-out',
                opacity: 0.22
              }}>
                <line x1="87" y1="180" x2="87" y2="40" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" />
                <rect 
                  x="77" 
                  y={40 + ((240 - bpm) / (240 - 40)) * 115} 
                  width="20" 
                  height="15" 
                  rx="2"
                  fill="#000000" 
                />
              </g>

              {/* Pendulum Group (rotating from pivot point) */}
              <g style={{
                transformOrigin: '90px 180px',
                transform: isPlaying ? 'none' : 'rotate(0deg)',
                animation: isPlaying ? `swing-anim ${60 / bpm}s ease-in-out infinite alternate` : 'none',
                transition: isPlaying ? 'none' : 'transform 0.3s ease-out'
              }}>
                {/* Steel Pendulum Rod */}
                <line x1="90" y1="180" x2="90" y2="40" stroke="url(#steelRod)" strokeWidth="3" strokeLinecap="round" />
                
                {/* 3D Brass weight */}
                <rect 
                  x="80" 
                  y={40 + ((240 - bpm) / (240 - 40)) * 115} 
                  width="20" 
                  height="15" 
                  rx="2"
                  fill="url(#brassGold)" 
                  stroke="#856404"
                  strokeWidth="1.2"
                  style={{ transition: 'y 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)' }}
                />
                {/* Center screw detail on weight */}
                <circle 
                  cx="90" 
                  cy={40 + ((240 - bpm) / (240 - 40)) * 115 + 7.5} 
                  r="2.5" 
                  fill="url(#brassGold)" 
                  stroke="#5a3d00" 
                  strokeWidth="0.8"
                  style={{ transition: 'cy 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)' }}
                />
              </g>

              {/* Brass Lager / Pivot Cap */}
              <circle cx="90" cy="180" r="7.5" fill="url(#brassGold)" stroke="#5a3d00" strokeWidth="1.5" />
              <circle cx="90" cy="180" r="2.5" fill="#423000" />
            </svg>
          </div>

          {/* Visual Beat Indicator Dots */}
          <div style={{ display: 'flex', gap: '14px', margin: '5px 0' }}>
            {Array.from({ length: getBeatsPerBar(selectedStyle) }).map((_, idx) => {
              const isActive = activeBeatIndex === idx;
              return (
                <div
                  key={idx}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: isActive 
                      ? (idx === 0 ? '#ea4335' : '#34a853') 
                      : '#e5e5e7',
                    boxShadow: isActive 
                      ? `0 0 8px ${idx === 0 ? 'rgba(234, 67, 53, 0.5)' : 'rgba(52, 168, 83, 0.5)'}` 
                      : 'none',
                    transition: 'all 0.08s ease'
                  }}
                />
              );
            })}
          </div>

          {/* Takt-Fortschritts-Sweep-Bar */}
          <div style={{
            width: '160px',
            height: '5px',
            background: '#e5e5e7',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative',
            marginTop: '-2px',
            marginBottom: '4px'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${barProgress}%`,
              background: 'linear-gradient(90deg, #34a853 0%, #2ecc71 100%)',
              boxShadow: '0 0 6px rgba(52, 168, 83, 0.3)',
              borderRadius: '10px',
              transition: isPlaying ? 'none' : 'width 0.1s ease-out'
            }} />
          </div>

          {/* Large Tempo Display */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '3.6rem', fontWeight: 900, color: '#1d1d1f', lineHeight: 1.1, fontFamily: 'SF Mono, monospace' }}>
              {bpm}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#86868b', fontWeight: 700 }}>
              BEATS PER MINUTE
            </span>
          </div>

          {/* Plus / Minus Tempo Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setBpm(prev => Math.max(40, prev - 5))}
              className="tactile-btn"
              style={{
                width: '44px',
                height: '38px',
                borderRadius: '10px',
                background: '#f5f5f7',
                border: 'none',
                color: '#1d1d1f',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => setBpm(prev => Math.max(40, prev - 1))}
              className="tactile-btn"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#f5f5f7',
                border: 'none',
                color: '#1d1d1f',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              -1
            </button>
            <button
              type="button"
              onClick={() => setBpm(prev => Math.min(240, prev + 1))}
              className="tactile-btn"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#f5f5f7',
                border: 'none',
                color: '#1d1d1f',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => setBpm(prev => Math.min(240, prev + 5))}
              className="tactile-btn"
              style={{
                width: '44px',
                height: '38px',
                borderRadius: '10px',
                background: '#f5f5f7',
                border: 'none',
                color: '#1d1d1f',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              +5
            </button>
          </div>

          <button
            type="button"
            onClick={handleTapTempo}
            className="tactile-btn"
            style={{
              width: '100%',
              background: '#f5f5f7',
              color: '#1d1d1f',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            TAP TEMPO
          </button>

          {/* Play/Pause button */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="tactile-btn"
            style={{
              width: '100%',
              background: isPlaying ? '#ea4335' : '#34a853',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            {isPlaying ? (
              <>
                <Square size={12} fill="currentColor" />
                <span>Stoppen</span>
              </>
            ) : (
              <>
                <Play size={12} fill="currentColor" />
                <span>Starten</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Drum Beat Generator & Mixer */}
        <div style={{
          flex: '1.2 1 0%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #f1f3f5',
          padding: '24px',
          gap: '20px'
        }}>
          <div>
            <span style={{ fontSize: '0.62rem', color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              BEAT GENERATOR
            </span>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1d1d1f', margin: '4px 0 0 0' }}>Begleit-Rhythmen</h3>
          </div>

          {/* Rhythms Selector Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px'
          }}>
            {[
              { id: 'metronome', label: 'Metronom Klick' },
              { id: 'singersongwriter', label: 'Singer-Songwriter (Akustik)' },
              { id: 'rock', label: 'Rock & Pop Groove' },
              { id: 'hiphop', label: 'Hip-Hop Pocket' },
              { id: 'swing', label: 'Jazz Swing' },
              { id: 'latin', label: 'Latin Bossa' },
              { id: 'funk', label: 'Funk Break' },
              { id: 'reggae', label: 'Reggae One-Drop' },
              { id: 'walzer', label: 'Walzer (3/4 Takt)' },
              { id: 'ballad68', label: '6/8 Ballade' },
              { id: 'disco', label: 'Disco (4-on-the-Floor)' }
            ].map((styleOpt) => {
              const isSelected = selectedStyle === styleOpt.id;
              return (
                <button
                  key={styleOpt.id}
                  type="button"
                  onClick={() => setSelectedStyle(styleOpt.id as any)}
                  className="tactile-btn"
                  style={{
                    background: isSelected ? '#34a853' : '#f5f5f7',
                    color: isSelected ? '#ffffff' : '#1d1d1f',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {styleOpt.label}
                </button>
              );
            })}
          </div>

          {/* Master Volume & Power Boost Control */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '8px',
            borderTop: '1px solid #f1f3f5',
            paddingTop: '14px',
            background: volMaster > 100 ? 'rgba(234, 179, 8, 0.06)' : 'transparent',
            borderRadius: '12px',
            padding: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Volume2 style={{ width: '14px', height: '14px', color: volMaster > 100 ? '#d97706' : '#1d1d1f' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1d1d1f' }}>Master-Lautstärke</span>
                {volMaster > 100 && (
                  <span style={{ fontSize: '0.55rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', background: '#eab308', color: '#ffffff', letterSpacing: '0.04em' }}>
                    ⚡ POWER BOOST (+{Math.round((volMaster - 100) / 8.33)}dB)
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: volMaster > 100 ? '#d97706' : '#86868b', fontFamily: 'SF Mono, monospace' }}>
                {volMaster}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={volMaster}
              onChange={(e) => setVolMaster(Number(e.target.value))}
              className="groovelab-fader"
              style={{ flex: 1 }}
            />
          </div>

          {/* Beat Variations Selector */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '8px',
            borderTop: '1px solid #f1f3f5',
            paddingTop: '14px'
          }}>
            <span style={{ fontSize: '0.58rem', color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Groove-Variationen
            </span>
            <div style={{
              display: 'flex',
              gap: '6px'
            }}>
              {[
                { id: 'A', label: 'Variante A: Standard' },
                { id: 'B', label: 'Variante B: Groove+' },
                { id: 'C', label: 'Variante C: Fill / Komplex' }
              ].map((varOpt) => {
                const isSelected = selectedVariation === varOpt.id;
                return (
                  <button
                    key={varOpt.id}
                    type="button"
                    onClick={() => setSelectedVariation(varOpt.id as any)}
                    className="tactile-btn"
                    style={{
                      flex: 1,
                      background: isSelected ? '#eab308' : '#f5f5f7',
                      color: isSelected ? '#ffffff' : '#1d1d1f',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px 4px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease-in-out',
                      boxShadow: isSelected ? '0 2px 8px rgba(234, 179, 8, 0.3)' : 'none'
                    }}
                  >
                    {varOpt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mixer Channel Strips */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            marginTop: '10px',
            borderTop: '1px solid #f1f3f5',
            paddingTop: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.58rem', color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                INSTRUMENTEN MIXER
              </span>
              <span style={{ fontSize: '0.55rem', color: '#5f6368', background: '#f5f5f7', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, border: '1px solid #e5e7eb' }}>
                🥁 {selectedStyle === 'singersongwriter' ? 'Singer-Songwriter Soft Mahogany Kit' :
                     selectedStyle === 'swing' ? 'Smoky Vintage Jazz Brush Kit' :
                     selectedStyle === 'hiphop' ? 'Dark Tape Boom-Bap Sub Kit' :
                     selectedStyle === 'reggae' ? 'Deep Dub One-Drop Sub Kit' :
                     selectedStyle === 'latin' ? 'Warm Percussive Bossa Kit' :
                     selectedStyle === 'funk' ? '70s Vintage Damped Funk Break Kit' :
                     selectedStyle === 'rock' ? 'Dark Vintage Birch Studio Rock Kit' :
                     selectedStyle === 'walzer' ? 'Acoustic Chamber Waltz Kit' :
                     selectedStyle === 'ballad68' ? 'Warm Slow Ballad Heartbeat Kit' :
                     selectedStyle === 'disco' ? 'Damped 70s Studio Disco Kit' : 'Soft Hardwood Teak Click Kit'}
              </span>
            </div>

            {selectedStyle === 'metronome' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d1d1f' }}>Klick-Lautstärke</span>
                  <span style={{ fontSize: '0.62rem', color: volMetronome > 100 ? '#d97706' : '#86868b', fontFamily: 'SF Mono, monospace', fontWeight: 700 }}>
                    {volMetronome}% {volMetronome > 100 && '⚡'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => toggleMute('click')}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: isMuted('click') ? '#ea4335' : '#f5f5f7',
                        color: isMuted('click') ? '#ffffff' : '#5f6368',
                        transition: 'all 0.15s ease-in-out'
                      }}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSolo('click')}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: isSolo('click') ? '#eab308' : '#f5f5f7',
                        color: isSolo('click') ? '#ffffff' : '#5f6368',
                        transition: 'all 0.15s ease-in-out'
                      }}
                    >
                      S
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={volMetronome}
                    onChange={(e) => setVolMetronome(Number(e.target.value))}
                    className="groovelab-fader"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Bass Drum (Kick) Channel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d1d1f' }}>Bass Drum (Kick)</span>
                    <span style={{ fontSize: '0.62rem', color: volKick > 100 ? '#d97706' : '#86868b', fontFamily: 'SF Mono, monospace', fontWeight: 700 }}>
                      {volKick}% {volKick > 100 && '⚡'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => toggleMute('kick')}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          background: isMuted('kick') ? '#ea4335' : '#f5f5f7',
                          color: isMuted('kick') ? '#ffffff' : '#5f6368',
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        M
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSolo('kick')}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          background: isSolo('kick') ? '#eab308' : '#f5f5f7',
                          color: isSolo('kick') ? '#ffffff' : '#5f6368',
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        S
                      </button>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={volKick}
                      onChange={(e) => setVolKick(Number(e.target.value))}
                      className="groovelab-fader"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                {/* Snare Drum Channel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d1d1f' }}>Snare Drum</span>
                    <span style={{ fontSize: '0.62rem', color: volSnare > 100 ? '#d97706' : '#86868b', fontFamily: 'SF Mono, monospace', fontWeight: 700 }}>
                      {volSnare}% {volSnare > 100 && '⚡'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => toggleMute('snare')}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          background: isMuted('snare') ? '#ea4335' : '#f5f5f7',
                          color: isMuted('snare') ? '#ffffff' : '#5f6368',
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        M
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSolo('snare')}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          background: isSolo('snare') ? '#eab308' : '#f5f5f7',
                          color: isSolo('snare') ? '#ffffff' : '#5f6368',
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        S
                      </button>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={volSnare}
                      onChange={(e) => setVolSnare(Number(e.target.value))}
                      className="groovelab-fader"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                {/* Hi-Hat Channel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d1d1f' }}>Hi-Hat</span>
                    <span style={{ fontSize: '0.62rem', color: volHat > 100 ? '#d97706' : '#86868b', fontFamily: 'SF Mono, monospace', fontWeight: 700 }}>
                      {volHat}% {volHat > 100 && '⚡'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => toggleMute('hat')}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          background: isMuted('hat') ? '#ea4335' : '#f5f5f7',
                          color: isMuted('hat') ? '#ffffff' : '#5f6368',
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        M
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSolo('hat')}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          background: isSolo('hat') ? '#eab308' : '#f5f5f7',
                          color: isSolo('hat') ? '#ffffff' : '#5f6368',
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        S
                      </button>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={volHat}
                      onChange={(e) => setVolHat(Number(e.target.value))}
                      className="groovelab-fader"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

