import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2, VolumeX, Music, Clock, Sliders, RotateCcw } from 'lucide-react';

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
  const [selectedStyle, setSelectedStyle] = useState<'metronome' | 'rock' | 'hiphop' | 'swing' | 'latin' | 'funk' | 'reggae' | 'walzer' | 'ballad68' | 'disco'>('metronome');
  const [selectedVariation, setSelectedVariation] = useState<'A' | 'B' | 'C'>('A');
  const [volKick, setVolKick] = useState(80);
  const [volSnare, setVolSnare] = useState(80);
  const [volHat, setVolHat] = useState(80);
  const [volMetronome, setVolMetronome] = useState(80);
  
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
  const volKickRef = useRef(volKick);
  const volSnareRef = useRef(volSnare);
  const volHatRef = useRef(volHat);
  const volMetronomeRef = useRef(volMetronome);
  const selectedVariationRef = useRef(selectedVariation);
  const mutedInstrumentsRef = useRef(mutedInstruments);
  const soloedInstrumentsRef = useRef(soloedInstruments);

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
    masterGain.gain.value = 0.8;
    masterGain.connect(audioCtx.destination);
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

    const playKick = (volMul = 1.0) => {
      if (kVol <= 0.001) return;
      // Resonant drumhead sine sweep (warm bass body)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(140, time);

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(masterGain);

      osc.frequency.setValueAtTime(110, time);
      osc.frequency.exponentialRampToValueAtTime(46, time + 0.09);

      gain.gain.setValueAtTime(kVol * volMul * 0.9, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
      
      osc.start(time);
      osc.stop(time + 0.20);

      // Acoustic leather beater contact slap
      const beater = ctx.createOscillator();
      const beaterGain = ctx.createGain();
      beater.type = 'triangle';
      
      const beaterFilter = ctx.createBiquadFilter();
      beaterFilter.type = 'bandpass';
      beaterFilter.frequency.setValueAtTime(1700, time);
      beaterFilter.Q.setValueAtTime(2.0, time);

      beater.connect(beaterFilter);
      beaterFilter.connect(beaterGain);
      beaterGain.connect(masterGain);

      beater.frequency.setValueAtTime(800, time);
      beater.frequency.exponentialRampToValueAtTime(140, time + 0.008);

      beaterGain.gain.setValueAtTime(kVol * volMul * 0.22, time);
      beaterGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.01);

      beater.start(time);
      beater.stop(time + 0.015);
    };

    const playSnare = (volMul = 1.0) => {
      if (sVol <= 0.001) return;
      if (!noiseBufferRef.current) return;
      
      // Snappy snare wires rattle (filtered noise)
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBufferRef.current;
      
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2100, time);
      noiseFilter.Q.setValueAtTime(1.4, time);
      
      const noiseHp = ctx.createBiquadFilter();
      noiseHp.type = 'highpass';
      noiseHp.frequency.setValueAtTime(950, time);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(sVol * 0.36 * volMul, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseHp);
      noiseHp.connect(noiseGain);
      noiseGain.connect(masterGain);
      
      noise.start(time);
      noise.stop(time + 0.18);

      // Acoustic drumhead shell resonance tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(175, time);
      osc1.frequency.exponentialRampToValueAtTime(125, time + 0.08);

      gain1.gain.setValueAtTime(sVol * 0.40 * volMul, time);
      gain1.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
      
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(time);
      osc1.stop(time + 0.11);

      // Stick impact transient
      const rim = ctx.createOscillator();
      const rimGain = ctx.createGain();
      rim.type = 'triangle';
      rim.frequency.setValueAtTime(950, time);
      rim.frequency.exponentialRampToValueAtTime(350, time + 0.01);
      
      rimGain.gain.setValueAtTime(sVol * 0.18 * volMul, time);
      rimGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.014);
      
      rim.connect(rimGain);
      rimGain.connect(masterGain);
      rim.start(time);
      rim.stop(time + 0.018);
    };

    const playRimClick = (volMul = 1.0) => {
      if (sVol <= 0.001) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(450, time);

      osc.connect(hp);
      hp.connect(gain);
      gain.connect(masterGain);

      osc.frequency.setValueAtTime(1100, time);
      osc.frequency.exponentialRampToValueAtTime(580, time + 0.012);

      gain.gain.setValueAtTime(sVol * 0.38 * volMul, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.016);
      osc.start(time);
      osc.stop(time + 0.02);
    };

    const playHat = (isOpen = false, volMul = 1.0) => {
      if (hVol <= 0.001) return;
      if (!noiseBufferRef.current) return;
      
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBufferRef.current;
      
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(7000, time);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(11500, time);
      bp.Q.setValueAtTime(1.8, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(hVol * (isOpen ? 0.14 : 0.09) * volMul, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + (isOpen ? 0.20 : 0.035));

      noise.connect(hp);
      hp.connect(bp);
      bp.connect(gain);
      gain.connect(masterGain);
      
      noise.start(time);
      noise.stop(time + (isOpen ? 0.22 : 0.05));
    };

    const playClick = (isAccent = false) => {
      if (mVol <= 0.001) return;
      
      // Resonant woodblock body with physical decay and pitch bend
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      
      // Pitch drop simulating physical strike impact bending
      osc.frequency.setValueAtTime(isAccent ? 1550 : 1050, time);
      osc.frequency.exponentialRampToValueAtTime(isAccent ? 650 : 450, time + 0.012);
      
      // Bandpass filter to simulate wood block hollow enclosure resonance
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(isAccent ? 1200 : 850, time);
      bp.Q.setValueAtTime(3.8, time);

      osc.connect(bp);
      bp.connect(gain);
      gain.connect(masterGain);

      gain.gain.setValueAtTime(mVol * 0.75, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.028);
      osc.start(time);
      osc.stop(time + 0.045);

      // Mallet click transient (wood strike sound)
      if (noiseBufferRef.current) {
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBufferRef.current;
        
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(3200, time);
        noiseFilter.Q.setValueAtTime(4.0, time);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(mVol * 0.42, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.006);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);

        noise.start(time);
        noise.stop(time + 0.01);
      }
    };

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
            <span style={{ fontSize: '0.58rem', color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              INSTRUMENTEN MIXER
            </span>

            {selectedStyle === 'metronome' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d1d1f' }}>Klick-Lautstärke</span>
                  <span style={{ fontSize: '0.62rem', color: '#86868b', fontFamily: 'SF Mono, monospace' }}>{volMetronome}%</span>
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
                    max="100"
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
                    <span style={{ fontSize: '0.62rem', color: '#86868b', fontFamily: 'SF Mono, monospace' }}>{volKick}%</span>
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
                      max="100"
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
                    <span style={{ fontSize: '0.62rem', color: '#86868b', fontFamily: 'SF Mono, monospace' }}>{volSnare}%</span>
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
                      max="100"
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
                    <span style={{ fontSize: '0.62rem', color: '#86868b', fontFamily: 'SF Mono, monospace' }}>{volHat}%</span>
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
                      max="100"
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

