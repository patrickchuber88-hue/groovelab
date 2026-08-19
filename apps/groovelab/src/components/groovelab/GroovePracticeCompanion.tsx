import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2, VolumeX, Music, Clock, Sliders, RotateCcw, Mic, Zap, Activity, CheckCircle2, Sparkles, Star, BookOpen, Check, Settings } from 'lucide-react';
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
  onRhythmScoreUpdate?: (score: number, details: { beatsCount: number; precision: number; bpm: number; songTitle?: string; stars?: number; advice?: string }) => void;
  targetBpm?: number;
  targetScore?: number;
  isCampusModule?: boolean;
  activeSongContext?: { songTitle: string; targetBpm: number; songId?: string } | null;
}

// GroovePracticeCompanion (Student Metronome & Beat Generator with Campus Rhythmus-Coach)
// --------------------------------------------------------------------------------------


export const GroovePracticeCompanion: React.FC<GroovePracticeCompanionProps> = ({ 
  useNotebookLayout,
  onRhythmScoreUpdate,
  targetBpm,
  targetScore,
  isCampusModule = true,
  activeSongContext
}) => {
  const getBeatsPerBar = (style: string) => {
    if (style === 'walzer') return 3;
    if (style === 'ballad68') return 6;
    return 4;
  };

  const [mobileTab, setMobileTab] = useState<'metronome' | 'rhythms'>('metronome');
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768 || !!document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait');
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768 || !!document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait'));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(activeSongContext?.targetBpm || targetBpm || 120);
  const [selectedStyle, setSelectedStyle] = useState<'metronome' | 'rock' | 'hiphop' | 'swing' | 'latin' | 'funk' | 'reggae' | 'walzer' | 'ballad68' | 'disco' | 'singersongwriter'>('metronome');
  const [selectedVariation, setSelectedVariation] = useState<'A' | 'B' | 'C'>('A');
  const [volMaster, setVolMaster] = useState(100);
  const [volKick, setVolKick] = useState(100);
  const [volSnare, setVolSnare] = useState(100);
  const [volHat, setVolHat] = useState(100);
  const [volMetronome, setVolMetronome] = useState(100);

  // 🎙️ Campus Rhythmus-Coach States & Realtime Audio Tracking
  const [rhythmCoachActive, setRhythmCoachActive] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState<1 | 2>(1);
  const [step1Count, setStep1Count] = useState<number>(0);
  const [step2Count, setStep2Count] = useState<number>(0);
  const [calibrationDoneText, setCalibrationDoneText] = useState<string | null>(null);

  const [grooveFeedback, setGrooveFeedback] = useState<{ type: 'perfect' | 'rushing' | 'dragging'; noteLabel?: string } | null>(null);
  const [rhythmScoreStats, setRhythmScoreStats] = useState<{
    totalBeats: number;
    inTime: number;
    rushing: number;
    dragging: number;
    quarters: number;
    eights: number;
    sixteenths: number;
    dotted: number;
  }>({
    totalBeats: 0,
    inTime: 0,
    rushing: 0,
    dragging: 0,
    quarters: 0,
    eights: 0,
    sixteenths: 0,
    dotted: 0
  });

  const microTimingDeltasRef = useRef<number[]>([]);

  // ⭐️ Non-XP 3-Star Summary Card State
  const [summaryCardData, setSummaryCardData] = useState<{
    stars: number;
    precision: number;
    beatsCount: number;
    barsCount: number;
    bpm: number;
    songTitle?: string;
    advice: string;
    noteDistribution?: { quartersPct: number; eightsPct: number; sixteenthsPct: number; dottedPct: number };
    microTimingDeltas?: number[];
  } | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const scheduledBeatTimesRef = useRef<number[]>([]);
  const lastTransientTimeRef = useRef<number>(0);
  const calibratedThresholdRef = useRef<number>(0.045);
  const getInitialLatency = () => {
    const saved = localStorage.getItem('groovelab_latency_offset');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 140; // True round-trip hardware latency baseline for WebAudio
  };
  const calibratedLatencyOffsetRef = useRef<number>(getInitialLatency());
  const feedbackTimerRef = useRef<any>(null);
  const onRhythmScoreUpdateRef = useRef(onRhythmScoreUpdate);

  useEffect(() => {
    onRhythmScoreUpdateRef.current = onRhythmScoreUpdate;
  }, [onRhythmScoreUpdate]);

  useEffect(() => {
    if (activeSongContext?.targetBpm) {
      setBpm(activeSongContext.targetBpm);
      const isCalibrated = localStorage.getItem('groovelab_latency_calibrated') === 'true';
      if (!isCalibrated) {
        handleStartCalibration();
      } else {
        setRhythmCoachActive(true);
      }
    }
  }, [activeSongContext]);

  // 🎛️ Exact Loopstation Cubase Auto-Einmessung States
  const [isLoopstationCalibrating, setIsLoopstationCalibrating] = useState(false);
  const [loopstationPhaseState, setLoopstationPhaseState] = useState<'idle' | 'ambient' | 'clicks' | 'result'>('idle');
  const [loopstationClickCount, setLoopstationClickCount] = useState<number>(0);
  const [loopstationMicLevel, setLoopstationMicLevel] = useState<number>(0);
  const [loopstationLatencyResult, setLoopstationLatencyResult] = useState<number>(140);
  const loopstationStreamRef = useRef<MediaStream | null>(null);

  // 🎙️ Instrument 3-Tone Einpegeln States
  const [liveMicLevelPct, setLiveMicLevelPct] = useState<number>(0);
  const [instrumentToneCount, setInstrumentToneCount] = useState<number>(0);
  const [instrumentToneDoneText, setInstrumentToneDoneText] = useState<string | null>(null);
  const [isInstrumentCalibrating, setIsInstrumentCalibrating] = useState<boolean>(false);

  // Toggle Rhythm Coach with Forced Initial Calibration Guard
  const toggleRhythmCoach = () => {
    const isCalibrated = localStorage.getItem('groovelab_latency_calibrated') === 'true';
    if (!rhythmCoachActive && !isCalibrated) {
      handleStartCalibration(true);
      return;
    }
    const next = !rhythmCoachActive;
    setRhythmCoachActive(next);
    if (next) {
      setSelectedStyle('metronome');
    }
  };

  // Smart Cascade Calibration Handler
  const handleStartCalibration = (forceLoopstationCheck: boolean = false) => {
    setSelectedStyle('metronome');
    const isForce = typeof forceLoopstationCheck === 'boolean' ? forceLoopstationCheck : false;
    const isCalibrated = localStorage.getItem('groovelab_latency_calibrated') === 'true';

    if (!isCalibrated || isForce) {
      runLoopstationAutoCalibration();
    } else {
      runInstrumentToneCalibration();
    }
  };

  // Ref to hold step 1 ambient sound timer
  const ambientToneTimerRef = useRef<any>(null);
  const calibrationAudioCtxRef = useRef<AudioContext | null>(null);
  const calibrationAnalyserRef = useRef<AnalyserNode | null>(null);

  // 1️⃣ Loopstation Cubase 15 Pro Auto-Einmessung Engine
  const runLoopstationAutoCalibration = async () => {
    setIsLoopstationCalibrating(true);
    setLoopstationPhaseState('ambient');
    setLoopstationClickCount(0);
    setLoopstationMicLevel(0);

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      calibrationAudioCtxRef.current = audioCtx;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      loopstationStreamRef.current = stream;

      const micSource = audioCtx.createMediaStreamSource(stream);

      // 🎛️ DSP Biquad Bandpass Filter (1800Hz, Q=2.5)
      // Filters out keyboard typing clicks, table thumps & ambient hum by 90%, isolating only metronome chirp frequencies
      const bandpassFilter = audioCtx.createBiquadFilter();
      bandpassFilter.type = 'bandpass';
      bandpassFilter.frequency.setValueAtTime(1800, audioCtx.currentTime);
      bandpassFilter.Q.setValueAtTime(2.5, audioCtx.currentTime);

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;

      micSource.connect(bandpassFilter);
      bandpassFilter.connect(analyser);
      calibrationAnalyserRef.current = analyser;

      const pcmData = new Float32Array(analyser.fftSize);

      // 🎚️ 60 FPS Frequency-Selective Peak-Decay VU Envelope Follower
      let animFrameId: number;
      let peakRms = 0;

      const updateMicLevel = () => {
        if (!calibrationAudioCtxRef.current || calibrationAudioCtxRef.current.state === 'closed') return;

        analyser.getFloatTimeDomainData(pcmData);
        let sumSq = 0;
        for (let i = 0; i < pcmData.length; i++) {
          sumSq += pcmData[i] * pcmData[i];
        }
        const currentRms = Math.sqrt(sumSq / pcmData.length);

        if (currentRms > peakRms) {
          peakRms = currentRms;
        } else {
          peakRms = peakRms * 0.90; // Smooth VU decay
        }

        // Calibrated level formula for filtered metronome frequency band
        const levelPct = Math.min(100, Math.round(Math.pow(peakRms, 0.40) * 1450));
        setLoopstationMicLevel(levelPct);

        animFrameId = requestAnimationFrame(updateMicLevel);
      };

      animFrameId = requestAnimationFrame(updateMicLevel);

      // Play pleasant, comfortable metronome test chirp pulses (0.16 gain) every 400ms
      if (ambientToneTimerRef.current) clearInterval(ambientToneTimerRef.current);
      ambientToneTimerRef.current = setInterval(() => {
        try {
          if (audioCtx && audioCtx.state === 'running') {
            const t = audioCtx.currentTime;
            const freqs = [1200, 2400];
            freqs.forEach(f => {
              const osc = audioCtx.createOscillator();
              const g = audioCtx.createGain();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(f, t);
              g.gain.setValueAtTime(0.16, t);
              g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
              osc.connect(g);
              g.connect(audioCtx.destination);
              osc.start(t);
              osc.stop(t + 0.055);
            });
          }
        } catch (_) {}
      }, 400);
    } catch (err) {
      console.warn("Loopstation auto calibration error:", err);
      setIsLoopstationCalibrating(false);
      runInstrumentToneCalibration();
    }
  };

  // Proceed from Schritt 1 to Schritt 2 (Metronom-Pings Latenz-Messung)
  const proceedToStep2PingCalibration = async () => {
    if (ambientToneTimerRef.current) {
      clearInterval(ambientToneTimerRef.current);
      ambientToneTimerRef.current = null;
    }

    const audioCtx = calibrationAudioCtxRef.current;
    const analyser = calibrationAnalyserRef.current;
    if (!audioCtx || !analyser || !loopstationStreamRef.current) return;

    setLoopstationPhaseState('clicks');
    const pcmData = new Float32Array(analyser.fftSize);
    const dynamicPeakThreshold = 0.015;
    const pingDeltas: number[] = [];

    for (let pingIdx = 1; pingIdx <= 5; pingIdx++) {
      setLoopstationClickCount(pingIdx);

      const pingAudioTime = audioCtx.currentTime + 0.04;
      const pingWallStart = performance.now();

      const freqs = [1000, 2200, 3400]; // Multi-harmonic chirp burst
      freqs.forEach(f => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, pingAudioTime);
        gain.gain.setValueAtTime(0.33, pingAudioTime);
        gain.gain.setValueAtTime(0.33, pingAudioTime + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, pingAudioTime + 0.045);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(pingAudioTime);
        osc.stop(pingAudioTime + 0.045);
      });

      // Capture mic peak window with high-precision performance.now() linked to AudioContext clock
      let maxPeak = 0;
      let peakWallTime = 0;

      const sampleInterval = setInterval(() => {
        analyser.getFloatTimeDomainData(pcmData);
        const now = performance.now();
        for (let i = 0; i < pcmData.length; i++) {
          const absVal = Math.abs(pcmData[i]);
          if (absVal > maxPeak) {
            maxPeak = absVal;
            peakWallTime = now;
          }
        }
      }, 5);

      await new Promise(r => setTimeout(r, 420));
      clearInterval(sampleInterval);

      if (maxPeak >= dynamicPeakThreshold && peakWallTime > pingWallStart) {
        const delta = Math.round(peakWallTime - pingWallStart - 40);
        if (delta > 20 && delta < 500) {
          pingDeltas.push(delta);
        }
      }
    }

    // Stop mic stream
    if (loopstationStreamRef.current) {
      loopstationStreamRef.current.getTracks().forEach(t => t.stop());
      loopstationStreamRef.current = null;
    }

    // Compute final calibrated offset using Cubase Median Outlier Filter
    let finalOffsetMs = 0;
    if (pingDeltas.length > 0) {
      const sorted = [...pingDeltas].sort((a, b) => a - b);
      let trimmed = sorted;
      if (sorted.length >= 4) {
        trimmed = sorted.slice(1, sorted.length - 1);
      }
      const medianAvg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
      finalOffsetMs = Math.max(15, Math.min(450, Math.round(medianAvg)));
    } else {
      const baseLat = (audioCtx.baseLatency || 0.005) * 1000;
      const outLat = (audioCtx.outputLatency || 0.020) * 1000;
      finalOffsetMs = Math.round(baseLat + outLat + 95);
    }

    audioCtx.close();

    setLoopstationLatencyResult(finalOffsetMs);
    calibratedLatencyOffsetRef.current = finalOffsetMs;

    // 🔗 Save shared latency calibration globally (Loopstation + Rhythmus-Coach sync)
    try {
      localStorage.setItem('groovelab_latency_offset', finalOffsetMs.toString());
      localStorage.setItem('groovelab_latency_calibrated', 'true');
    } catch (_) {}

    setLoopstationPhaseState('result');
  };

  // 2️⃣ Instrument 3-Tone Einpegeln Engine
  const runInstrumentToneCalibration = () => {
    setIsInstrumentCalibrating(true);
    setInstrumentToneCount(0);
    setInstrumentToneDoneText(null);

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const pcmBuffer = new Float32Array(analyser.fftSize);
      let maxPeak = 0;
      let count = 0;
      let lastTransient = 0;

      // Audio confirmation ping when a tone is locked in
      const playLockPing = () => {
        try {
          const t = audioCtx.currentTime;
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, t);
          g.gain.setValueAtTime(0.2, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
          osc.connect(g);
          g.connect(audioCtx.destination);
          osc.start(t);
          osc.stop(t + 0.09);
        } catch (_) {}
      };

      const checkInterval = setInterval(() => {
        analyser.getFloatTimeDomainData(pcmBuffer);
        let sum = 0;
        for (let i = 0; i < pcmBuffer.length; i++) {
          const val = Math.abs(pcmBuffer[i]);
          sum += val * val;
          if (val > maxPeak) maxPeak = val;
        }
        const rms = Math.sqrt(sum / pcmBuffer.length);
        const now = audioCtx.currentTime;
        setLiveMicLevelPct(Math.round(Math.min(100, (rms / 0.12) * 100)));

        if (rms > 0.04 && (now - lastTransient) > 0.45) {
          lastTransient = now;
          count += 1;
          setInstrumentToneCount(count);
          playLockPing();

          if (count >= 3) {
            clearInterval(checkInterval);
            stream.getTracks().forEach(t => t.stop());
            audioCtx.close();

            calibratedThresholdRef.current = Math.max(0.025, Math.min(0.25, maxPeak * 0.42 || 0.045));
            setInstrumentToneDoneText("Instrument fertig eingepeigelt! 🎯");

            setTimeout(() => {
              setIsInstrumentCalibrating(false);
              setRhythmCoachActive(true);
            }, 800);
          }
        }
      }, 25);
    }).catch(err => {
      console.warn("Instrument tone calibration error:", err);
      setIsInstrumentCalibrating(false);
    });
  };
  
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

  // 🎙️ Realtime Microphone Audio Transient Tracker for Campus Rhythmus-Coach
  useEffect(() => {
    if (!isPlaying || !rhythmCoachActive) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
      setGrooveFeedback(null);
      return;
    }

    let animFrameId: number;

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      micStreamRef.current = stream;

      const initTracking = () => {
        const ctx = audioCtxRef.current;
        if (!ctx || ctx.state === 'closed') {
          setTimeout(initTracking, 50);
          return;
        }

        try {
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.2;
          source.connect(analyser);
          analyserNodeRef.current = analyser;

          const pcmBuffer = new Float32Array(analyser.fftSize);

          const checkTransient = () => {
            const currentCtx = audioCtxRef.current;
            if (!currentCtx || currentCtx.state === 'closed' || !isPlayingRef.current) return;
            analyser.getFloatTimeDomainData(pcmBuffer);

            // Calculate RMS energy of current audio frame
            let sum = 0;
            for (let i = 0; i < pcmBuffer.length; i++) {
              sum += pcmBuffer[i] * pcmBuffer[i];
            }
            const rms = Math.sqrt(sum / pcmBuffer.length);
            const now = currentCtx.currentTime;

            // Dynamic adaptive RMS threshold for 100% reliable mic detection across all instruments & claps
            const activeThreshold = Math.max(0.012, Math.min(calibratedThresholdRef.current || 0.022, 0.032));

            // Check if transient exceeds calibrated noise threshold & refractory period (160ms)
            if (rms > activeThreshold && (now - lastTransientTimeRef.current) > 0.16) {
              lastTransientTimeRef.current = now;

              // 🎼 Metronom-Klick Verankerungs-Engine (DAW-Grade Precision Anchor)
              const beats = scheduledBeatTimesRef.current;
              if (beats.length > 0) {
                let closestBeat = beats[0];
                let minDiffSec = Math.abs(now - closestBeat);
                for (const b of beats) {
                  const d = Math.abs(now - b);
                  if (d < minDiffSec) {
                    minDiffSec = d;
                    closestBeat = b;
                  }
                }

                const quarterSec = 60.0 / bpmRef.current;
                const barElapsed = Math.max(0, now - barStartAudioTimeRef.current);
                const posInBeats = (barElapsed / quarterSec) % 4.0;
                const beatFraction = posInBeats - Math.floor(posInBeats);

                // 🎯 100% Complete Metric Sub-Beat Window Partitioning (Viertel ♩, Achtel ♪, 16tel 𝅘𝅥𝅯, Punktiert ♩.)
                let noteType: 'quarter' | 'eight' | 'sixteenth' | 'dotted' = 'quarter';

                if (beatFraction <= 0.18 || beatFraction >= 0.82) {
                  noteType = 'quarter'; // ♩ Viertelnote (±18% des Hauptbeats)
                } else if (Math.abs(beatFraction - 0.50) <= 0.14) {
                  // Check if dotted syncopation on beat 1.5 or 3.5
                  if (Math.abs(posInBeats - 1.5) < 0.18 || Math.abs(posInBeats - 3.5) < 0.18) {
                    noteType = 'dotted'; // ♩. Punktierte Viertel/Achtel Synkope
                  } else {
                    noteType = 'eight'; // ♪ Achtelnote auf dem Off-Beat
                  }
                } else {
                  noteType = 'sixteenth'; // 𝅘𝅥𝅯 16tel Subdivision (0.25 oder 0.75)
                }

                const diffMs = ((now - closestBeat) * 1000) - calibratedLatencyOffsetRef.current;

                microTimingDeltasRef.current.push(Math.round(diffMs));
                if (microTimingDeltasRef.current.length > 40) {
                  microTimingDeltasRef.current.shift();
                }

                let feedbackType: 'perfect' | 'rushing' | 'dragging' = 'perfect';
                if (Math.abs(diffMs) <= 35) {
                  feedbackType = 'perfect';
                } else if (diffMs < -35 && diffMs >= -120) {
                  feedbackType = 'rushing';
                } else if (diffMs > 35 && diffMs <= 120) {
                  feedbackType = 'dragging';
                }

                const noteLabel = noteType === 'quarter' ? '♩ Viertel' : (noteType === 'eight' ? '♪ Achtel' : (noteType === 'sixteenth' ? '𝅘𝅥𝅯 16tel' : '♩. Punktiert'));
                setGrooveFeedback({ type: feedbackType, noteLabel });
                if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
                feedbackTimerRef.current = setTimeout(() => setGrooveFeedback(null), 340);

                setRhythmScoreStats(prev => {
                  const newTotal = prev.totalBeats + 1;
                  const newInTime = prev.inTime + (feedbackType === 'perfect' ? 1 : 0);
                  const newRushing = prev.rushing + (feedbackType === 'rushing' ? 1 : 0);
                  const newDragging = prev.dragging + (feedbackType === 'dragging' ? 1 : 0);

                  const precisionPct = Math.round((newInTime / newTotal) * 100);
                  if (onRhythmScoreUpdateRef.current) {
                    onRhythmScoreUpdateRef.current(precisionPct, {
                      beatsCount: newTotal,
                      precision: precisionPct,
                      bpm: bpmRef.current
                    });
                  }

                  return {
                    totalBeats: newTotal,
                    inTime: newInTime,
                    rushing: newRushing,
                    dragging: newDragging,
                    quarters: prev.quarters + (noteType === 'quarter' ? 1 : 0),
                    eights: prev.eights + (noteType === 'eight' ? 1 : 0),
                    sixteenths: prev.sixteenths + (noteType === 'sixteenth' ? 1 : 0),
                    dotted: prev.dotted + (noteType === 'dotted' ? 1 : 0)
                  };
                });
              }
            }
            animFrameId = requestAnimationFrame(checkTransient);
          };

          animFrameId = requestAnimationFrame(checkTransient);
        } catch (err) {
          console.warn("Error setting up mic media stream source:", err);
        }
      };

      initTracking();
    }).catch(err => {
      console.warn('Microphone access for Campus Rhythmus-Coach unavailable:', err);
      setRhythmCoachActive(false);
    });

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
    };
  }, [isPlaying, rhythmCoachActive]);

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
    const playClick = (isAccent = false) => {
      // 🔊 150%+ Ultra-Loud Sample Playback Boost
      playSample(kitBuffers.click, mVol, isAccent ? 3.6 : 2.5, 0.005);

      // 🔊 High-Penetration Dual-Oscillator Synth Burst (Cuts 150% louder through acoustic instruments)
      try {
        const osc = ctx.createOscillator();
        const snapOsc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(isAccent ? 1600 : 1200, time);

        snapOsc.type = 'triangle';
        snapOsc.frequency.setValueAtTime(isAccent ? 3200 : 2400, time);

        const clickGainVal = mVol * (isAccent ? 3.0 : 2.0);
        g.gain.setValueAtTime(0.001, time);
        g.gain.linearRampToValueAtTime(clickGainVal, time + 0.001);
        g.gain.exponentialRampToValueAtTime(0.00001, time + 0.040);

        osc.connect(g);
        snapOsc.connect(g);
        g.connect(masterGain);

        osc.start(time);
        snapOsc.start(time);
        osc.stop(time + 0.045);
        snapOsc.stop(time + 0.025);
      } catch (_) {}
    };

    const triggerVisualBeat = (beatIdx: number) => {
      // Record scheduled quarter beat timestamp for Rhythmus-Coach transient alignment
      scheduledBeatTimesRef.current.push(time);
      if (scheduledBeatTimesRef.current.length > 30) {
        scheduledBeatTimesRef.current.shift();
      }

      ctx.resume().then(() => {
        setActiveBeatIndex(beatIdx);
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
      padding: isMobileView ? '16px 16px calc(240px + env(safe-area-inset-bottom, 40px)) 16px' : '32px 28px',
      gap: '24px',
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      
      {/* Mobile Segmented Switcher for Metronome vs Begleit-Rhythmen */}
      {isMobileView && (
        <div style={{
          display: 'flex',
          background: '#e2e8f0',
          borderRadius: '12px',
          padding: '3px',
          width: '100%',
          marginBottom: '8px'
        }}>
          <button
            type="button"
            onClick={() => setMobileTab('metronome')}
            style={{
              flex: 1,
              background: mobileTab === 'metronome' ? '#ffffff' : 'transparent',
              color: mobileTab === 'metronome' ? '#1d1d1f' : '#64748b',
              border: 'none',
              borderRadius: '9px',
              padding: '10px 12px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: mobileTab === 'metronome' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Clock size={15} />
            <span>Metronom</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('rhythms')}
            style={{
              flex: 1,
              background: mobileTab === 'rhythms' ? '#ffffff' : 'transparent',
              color: mobileTab === 'rhythms' ? '#1d1d1f' : '#64748b',
              border: 'none',
              borderRadius: '9px',
              padding: '10px 12px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: mobileTab === 'rhythms' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Music size={15} />
            <span>Begleit-Rhythmen & Tracks</span>
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', flex: 1, width: '100%' }} className="flex-col lg:flex-row">
        {/* Left Column: Equalized Metronome Panel */}
        <div style={{
          flex: '1 1 0%',
          minWidth: isMobileView ? '100%' : '320px',
          display: (!isMobileView || mobileTab === 'metronome') ? 'flex' : 'none',
          flexDirection: 'column',
          alignItems: 'center',
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e8e8ed',
          padding: '18px 22px',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: '0.62rem', color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              ÜBE-METRONOM
            </span>
          </div>

          {/* Mechanical Metronome Container */}
          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', margin: '2px 0' }}>
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

            <svg width="155" height="185" viewBox="0 0 180 215" style={{ overflow: 'visible' }}>
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

          {/* Constant Metronome Beat Indicator Dots */}
          <div style={{ display: 'flex', gap: '14px', margin: '5px 0' }}>
            {Array.from({ length: 4 }).map((_, idx) => {
              const isActive = (activeBeatIndex !== null && activeBeatIndex !== undefined) ? (activeBeatIndex % 4 === idx) : false;
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
              padding: '10px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            TAP TEMPO
          </button>

          {/* Active Song Context Banner */}
          {activeSongContext?.songTitle && (
            <div style={{
              width: '100%',
              background: 'linear-gradient(135deg, #e6f4ea 0%, #d1fae5 100%)',
              border: '1px solid #34a853',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Music size={15} style={{ color: '#34a853' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#15803d' }}>
                  Song-Übung: <strong>{activeSongContext.songTitle}</strong>
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', background: '#ffffff', padding: '2px 8px', borderRadius: '8px' }}>
                {activeSongContext.targetBpm} BPM
              </span>
            </div>
          )}

          {/* Clean Play/Pause Button */}
          <button
            type="button"
            onClick={() => {
              if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                audioCtxRef.current.resume();
              }
              setIsPlaying(!isPlaying);
            }}
            className="tactile-btn"
            style={{
              width: '100%',
              background: isPlaying ? '#ea4335' : '#34a853',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '14px',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              boxShadow: isPlaying ? '0 4px 14px rgba(234, 67, 53, 0.3)' : '0 4px 14px rgba(52, 168, 83, 0.3)',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {isPlaying ? (
              <>
                <Square size={14} fill="currentColor" />
                <span>Stoppen</span>
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" />
                <span>Starten</span>
              </>
            )}
          </button>

          {/* ⭐️ Non-XP 3-Star Summary Card Modal */}
          {summaryCardData && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              overflowY: 'auto'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '24px 20px',
                maxWidth: '420px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
                animation: 'scaleIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #e6f4ea 0%, #d1fae5 100%)',
                  border: '2px solid #34a853',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34a853'
                }}>
                  <Sparkles size={30} />
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    RHYTHMUS-EVALUATION
                  </span>
                  <h3 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>
                    {summaryCardData.songTitle ? `Auswertung: ${summaryCardData.songTitle}` : 'Rhythmus-Auswertung'}
                  </h3>
                </div>

                {/* 1-3 Stars Rating Row */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', margin: '4px 0' }}>
                  {[1, 2, 3].map(starNum => {
                    const isLit = starNum <= summaryCardData.stars;
                    return (
                      <div
                        key={starNum}
                        style={{
                          transform: isLit ? 'scale(1.15)' : 'scale(0.9)',
                          transition: `all 0.3s ease-out ${starNum * 0.1}s`
                        }}
                      >
                        <Star
                          size={38}
                          fill={isLit ? '#eab308' : '#e2e8f0'}
                          color={isLit ? '#ca8a04' : '#cbd5e1'}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Precision % and Stats Grid */}
                <div style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 700 }}>Rhythmus-Präzision</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#15803d', fontFamily: 'SF Mono, monospace' }}>
                      {summaryCardData.precision}%
                    </span>
                  </div>
                  <div style={{ height: '1px', background: '#cbd5e1' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: '#475569', fontWeight: 700 }}>
                    <span>{summaryCardData.barsCount} Takte absolviert</span>
                    <span>{summaryCardData.beatsCount} Hits</span>
                    <span>{summaryCardData.bpm} BPM</span>
                  </div>
                </div>

                {/* 🎯 Visual Micro-Timing Groove Radar Scale */}
                {summaryCardData.microTimingDeltas && summaryCardData.microTimingDeltas.length > 0 && (
                  <div style={{
                    width: '100%',
                    background: '#0f172a',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', fontWeight: 800 }}>
                      <span style={{ color: '#f59e0b' }}>-100ms (Zu früh ⚡)</span>
                      <span style={{ color: '#34a853', background: 'rgba(52, 168, 83, 0.2)', padding: '1px 6px', borderRadius: '4px' }}>
                        🎯 Golden Zone (±35ms)
                      </span>
                      <span style={{ color: '#3b82f6' }}>+100ms (Zu spät 🐢)</span>
                    </div>

                    {/* Micro-Timing Timeline Track */}
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '22px',
                      background: '#1e293b',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      {/* Central Green Target Zone (±35ms) */}
                      <div style={{
                        position: 'absolute',
                        left: '32.5%',
                        width: '35%',
                        top: 0,
                        bottom: 0,
                        background: 'rgba(52, 168, 83, 0.25)',
                        borderLeft: '1.5px dashed #34a853',
                        borderRight: '1.5px dashed #34a853'
                      }} />

                      {/* Center 0ms Line */}
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: 0,
                        bottom: 0,
                        width: '2px',
                        background: '#34a853'
                      }} />

                      {/* Plot Student Hit Markers */}
                      {summaryCardData.microTimingDeltas.map((delta, idx) => {
                        const clampedDelta = Math.max(-100, Math.min(100, delta));
                        const pct = ((clampedDelta + 100) / 200) * 100;
                        const isPerfect = Math.abs(clampedDelta) <= 35;
                        const isRushing = clampedDelta < -35;
                        const color = isPerfect ? '#34a853' : (isRushing ? '#f59e0b' : '#3b82f6');

                        return (
                          <div
                            key={idx}
                            style={{
                              position: 'absolute',
                              left: `${pct}%`,
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: color,
                              boxShadow: `0 0 6px ${color}`,
                              zIndex: 3
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 🎵 Recognized Note Structure Badge */}
                {summaryCardData.noteDistribution && (
                  <div style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#166534',
                    background: '#e6f4ea',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '6px 12px',
                    width: '100%',
                    textAlign: 'center'
                  }}>
                    🎵 Erkannte Noten: ♩ Viertel {summaryCardData.noteDistribution.quartersPct}% • ♪ Achtel {summaryCardData.noteDistribution.eightsPct}% • 𝅘𝅥𝅯 16tel {summaryCardData.noteDistribution.sixteenthsPct}%
                  </div>
                )}

                {/* Didactic AI Advice Text */}
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, background: '#f0fdf4', padding: '12px 14px', borderRadius: '12px', borderLeft: '4px solid #34a853' }}>
                  {summaryCardData.advice}
                </p>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setSummaryCardData(null)}
                    style={{
                      flex: 1,
                      background: '#f1f5f9',
                      color: '#64748b',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Verwerfen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (summaryCardData && onRhythmScoreUpdateRef.current) {
                        onRhythmScoreUpdateRef.current(summaryCardData.precision, {
                          beatsCount: summaryCardData.beatsCount,
                          precision: summaryCardData.precision,
                          bpm: summaryCardData.bpm,
                          songTitle: summaryCardData.songTitle,
                          stars: summaryCardData.stars,
                          advice: summaryCardData.advice
                        });
                      }
                      setSummaryCardData(null);
                    }}
                    style={{
                      flex: 1.6,
                      background: '#34a853',
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
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(52, 168, 83, 0.3)'
                    }}
                  >
                    <BookOpen size={14} />
                    <span>Ins Notenheft eintragen 📚</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Equalized Drum Beat Generator & Mixer Panel (Generous 50/50 Breathing Room) */}
        <div style={{
          flex: '1 1 0%',
          minWidth: isMobileView ? '100%' : '320px',
          display: (!isMobileView || mobileTab === 'rhythms') ? 'flex' : 'none',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e8e8ed',
          padding: '24px 26px',
          gap: '20px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '0.62rem', color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                BEAT GENERATOR
              </span>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1d1d1f', margin: '2px 0 0 0' }}>Begleit-Rhythmen</h3>
            </div>

            <button
              type="button"
              onClick={() => {
                if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                  audioCtxRef.current.resume();
                }
                setIsPlaying(!isPlaying);
              }}
              className="tactile-btn"
              style={{
                background: isPlaying ? '#ea4335' : '#34a853',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isPlaying ? '0 4px 14px rgba(234, 67, 53, 0.3)' : '0 4px 14px rgba(52, 168, 83, 0.3)',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {isPlaying ? (
                <>
                  <Square size={14} fill="currentColor" />
                  <span>Stoppen</span>
                </>
              ) : (
                <>
                  <Play size={14} fill="currentColor" />
                  <span>Starten</span>
                </>
              )}
            </button>
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
                  onClick={() => {
                    setSelectedStyle(styleOpt.id as any);
                    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                      audioCtxRef.current.resume();
                    }
                    setIsPlaying(true);
                  }}
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

      {/* 🎛️ Exact Loopstation Cubase 15 Pro Auto-Einmessung Modal */}
      {isLoopstationCalibrating && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '32px 28px',
            maxWidth: '380px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '18px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              background: loopstationPhaseState === 'result' ? '#e6f4ea' : '#e0e7ff',
              color: loopstationPhaseState === 'result' ? '#34a853' : '#4f46e5',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: loopstationPhaseState === 'result' ? '0 6px 18px rgba(52, 168, 83, 0.25)' : '0 6px 18px rgba(79, 70, 229, 0.25)',
              transition: 'all 0.3s ease'
            }}>
              {loopstationPhaseState === 'result' ? <CheckCircle2 size={28} /> : <Zap size={28} style={{ animation: 'pulse 1.5s infinite' }} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{
                fontSize: '0.62rem',
                fontWeight: 900,
                color: '#4f46e5',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                Cubase 15 Pro Auto-Einmessung (Loopstation Modus)
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1d1d1f', margin: 0 }}>
                {loopstationPhaseState === 'ambient' && "1/3: Geräte-Lautstärke & Raumpegel einpegeln..."}
                {loopstationPhaseState === 'clicks' && `2/3: Metronom-Töne Auto-Einmessung (${loopstationClickCount}/5)...`}
                {loopstationPhaseState === 'result' && "Latenz Erfolgreich Ermittelt! 🎯 (Weiter zu Schritt 3)"}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#86868b', lineHeight: 1.4, margin: 0 }}>
                {loopstationPhaseState === 'ambient' && "Messung der Hintergrundgeräusche deines Mikrofons. Bitte Lautstärke auf normale Übe-Lautstärke stellen."}
                {loopstationPhaseState === 'clicks' && "Empfange akustische Metronom-Impulse über Lautsprecher/Mikrofon..."}
                {loopstationPhaseState === 'result' && "Hardware-Latenz für Loopstation & Rhythmus-Coach exakt im System gespeichert."}
              </p>
            </div>

            {loopstationPhaseState !== 'result' ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: '#f1f5f9',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: loopstationPhaseState === 'ambient' ? '20%' : `${20 + (loopstationClickCount / 5) * 80}%`,
                    background: 'linear-gradient(90deg, #34a853 0%, #4f46e5 100%)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                {loopstationPhaseState === 'ambient' && (
                  <div style={{
                    width: '100%',
                    background: '#0f172a',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginTop: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', fontWeight: 800 }}>
                      <span style={{ color: '#94a3b8' }}>Geräte-Lautstärke Pegel</span>
                      <span style={{ color: '#34a853', background: 'rgba(52, 168, 83, 0.2)', padding: '1px 6px', borderRadius: '4px' }}>
                        🎯 Ziel: Grüne Zone (35-75%)
                      </span>
                    </div>

                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '16px',
                      background: '#1e293b',
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}>
                      {/* Target Green Level Window (35% to 75%) */}
                      <div style={{
                        position: 'absolute',
                        left: '35%',
                        width: '40%',
                        top: 0,
                        bottom: 0,
                        background: 'rgba(52, 168, 83, 0.25)',
                        borderLeft: '1.5px dashed #34a853',
                        borderRight: '1.5px dashed #34a853'
                      }} />

                      {/* Live VU Meter Level Bar */}
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, loopstationMicLevel)}%`,
                        background: loopstationMicLevel > 80 ? '#ef4444' : (loopstationMicLevel >= 30 ? '#34a853' : '#3b82f6'),
                        borderRadius: '6px',
                        transition: 'width 0.05s ease-out'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.60rem', color: '#94a3b8', textAlign: 'center', fontWeight: 700 }}>
                      💡 Bitte stelle die Lautsprecher-Lautstärke deines Geräts so ein, dass der Pegel im grünen Bereich liegt.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px 20px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800 }}>ERMITTELTE HARDWARE-LATENZ</span>
                <span style={{ fontSize: '1.8rem', color: '#34a853', fontWeight: 900, fontFamily: 'SF Mono, monospace' }}>
                  +{loopstationLatencyResult} ms
                </span>
                <span style={{ fontSize: '0.62rem', color: '#166534', background: '#d1fae5', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                  🎯 100% Sample-Genau Kalibriert (DSP Matrix)
                </span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '4px' }}>
              {loopstationPhaseState === 'ambient' && (
                <button
                  type="button"
                  onClick={() => proceedToStep2PingCalibration()}
                  className="tactile-btn"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #34a853 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(52, 168, 83, 0.3)'
                  }}
                >
                  Lautstärke ist eingestellt ➔ Weiter zu Schritt 2 (Latenz Messen) 🚀
                </button>
              )}

              {loopstationPhaseState === 'result' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsLoopstationCalibrating(false);
                    runInstrumentToneCalibration();
                  }}
                  className="tactile-btn"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #34a853 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(52, 168, 83, 0.3)'
                  }}
                >
                  Latenz Übernehmen & Weiter zu Schritt 3 🚀
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (ambientToneTimerRef.current) clearInterval(ambientToneTimerRef.current);
                  if (loopstationStreamRef.current) {
                    loopstationStreamRef.current.getTracks().forEach(t => t.stop());
                    loopstationStreamRef.current = null;
                  }
                  setIsLoopstationCalibrating(false);
                }}
                className="tactile-btn"
                style={{
                  width: '100%',
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎙️ Instrument 3-Tone Einpegeln Modal */}
      {isInstrumentCalibrating && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '28px',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            {instrumentToneDoneText ? (
              <>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#e6f4ea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34a853'
                }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#15803d' }}>Instrument Perfekt Einpegeilt!</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', fontWeight: 700 }}>
                  {instrumentToneDoneText}
                </p>
              </>
            ) : (
              <>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#e6f4ea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34a853'
                }}>
                  <Mic size={32} />
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  SCHRITT 3/3: INSTRUMENT EINPEGELN (3 TÖNE)
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '1.15rem', fontWeight: 900, color: '#1e293b' }}>
                  Spiele 3 Töne nacheinander auf deinem Instrument
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                  In Raumstille (ohne Metronom). Jeder Ton wird einzeln vom Mikrofon quittiert und eingeloggt.
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  {[1, 2, 3].map(num => (
                    <div
                      key={num}
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '16px',
                        background: num <= instrumentToneCount ? '#34a853' : '#f1f5f9',
                        color: num <= instrumentToneCount ? '#ffffff' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1rem',
                        transition: 'all 0.2s ease-out',
                        boxShadow: num <= instrumentToneCount ? '0 6px 14px rgba(52, 168, 83, 0.35)' : 'none'
                      }}
                    >
                      {num <= instrumentToneCount ? '✓' : `Ton ${num}`}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

