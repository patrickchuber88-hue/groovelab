import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, Plus, Minus, Volume2, Mic, MicOff, RotateCcw, 
  Sparkles, Radio, Activity, Compass, Zap, Sliders, CheckCircle2, ChevronDown, ChevronUp, Music
} from 'lucide-react';
import { acquireAudioStream, releaseAudioStream } from '../../services/audioPermissionService';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface TuningString {
  name: string;
  octave: number;
  freq: number;
  label: string;
}

interface InstrumentPreset {
  id: string;
  name: string;
  strings: TuningString[];
}

const INSTRUMENT_PRESETS: InstrumentPreset[] = [
  {
    id: 'chromatic',
    name: 'Chromatisch (Alle Instrumente)',
    strings: []
  },
  {
    id: 'guitar_standard',
    name: 'Gitarre (Standard EADGBE)',
    strings: [
      { name: 'E', octave: 2, freq: 82.41, label: '6. E (82 Hz)' },
      { name: 'A', octave: 2, freq: 110.00, label: '5. A (110 Hz)' },
      { name: 'D', octave: 3, freq: 146.83, label: '4. D (147 Hz)' },
      { name: 'G', octave: 3, freq: 196.00, label: '3. G (196 Hz)' },
      { name: 'B', octave: 3, freq: 246.94, label: '2. H/B (247 Hz)' },
      { name: 'E', octave: 4, freq: 329.63, label: '1. e (330 Hz)' }
    ]
  },
  {
    id: 'bass_4',
    name: 'E-Bass (4-Saiter EADG)',
    strings: [
      { name: 'E', octave: 1, freq: 41.20, label: '4. E (41 Hz)' },
      { name: 'A', octave: 1, freq: 55.00, label: '3. A (55 Hz)' },
      { name: 'D', octave: 2, freq: 73.42, label: '2. D (73 Hz)' },
      { name: 'G', octave: 2, freq: 98.00, label: '1. G (98 Hz)' }
    ]
  },
  {
    id: 'ukulele',
    name: 'Ukulele (GCEA)',
    strings: [
      { name: 'G', octave: 4, freq: 392.00, label: '4. G (392 Hz)' },
      { name: 'C', octave: 4, freq: 261.63, label: '3. C (262 Hz)' },
      { name: 'E', octave: 4, freq: 329.63, label: '2. E (330 Hz)' },
      { name: 'A', octave: 4, freq: 440.00, label: '1. A (440 Hz)' }
    ]
  },
  {
    id: 'violin',
    name: 'Violine (GDAE)',
    strings: [
      { name: 'G', octave: 3, freq: 196.00, label: '4. G (196 Hz)' },
      { name: 'D', octave: 4, freq: 293.66, label: '3. D (294 Hz)' },
      { name: 'A', octave: 4, freq: 440.00, label: '2. A (440 Hz)' },
      { name: 'E', octave: 5, freq: 659.25, label: '1. E (659 Hz)' }
    ]
  }
];

export const BriefingToolboxCard: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'metronome' | 'tuner'>('metronome');

  // Metronome State
  const [bpm, setBpm] = useState<number>(() => {
    const saved = localStorage.getItem('campus_toolbox_bpm');
    return saved ? parseInt(saved, 10) || 120 : 120;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timeSignature, setTimeSignature] = useState<number>(4);
  const [subdivision, setSubdivision] = useState<number>(1); // 1 = Quarter, 2 = 8th, 3 = Triplet, 4 = 16th
  const [accentDownbeat, setAccentDownbeat] = useState<boolean>(true);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [currentSubbeat, setCurrentSubbeat] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.7);

  // Tempo Trainer
  const [isTrainerOpen, setIsTrainerOpen] = useState<boolean>(false);
  const [isTrainerActive, setIsTrainerActive] = useState<boolean>(false);
  const [trainerStepBpm, setTrainerStepBpm] = useState<number>(2);
  const [trainerBars, setTrainerBars] = useState<number>(4);
  const [trainerTargetBpm, setTrainerTargetBpm] = useState<number>(160);
  const barsCounterRef = useRef<number>(0);

  // Tap Tempo State
  const tapTimesRef = useRef<number[]>([]);

  // Web Audio Contexts & Timers
  const metroAudioCtxRef = useRef<AudioContext | null>(null);
  const timerWorkerRef = useRef<any>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const currentBeatRef = useRef<number>(0);
  const currentSubbeatRef = useRef<number>(0);
  const bpmRef = useRef<number>(bpm);
  bpmRef.current = bpm;

  // Persist BPM
  useEffect(() => {
    localStorage.setItem('campus_toolbox_bpm', bpm.toString());
  }, [bpm]);

  // Tuner State
  const [isTunerActive, setIsTunerActive] = useState<boolean>(false);
  const [detectedNote, setDetectedNote] = useState<string>('--');
  const [detectedOctave, setDetectedOctave] = useState<number | null>(null);
  const [detectedFreq, setDetectedFreq] = useState<number>(0);
  const [centsDiff, setCentsDiff] = useState<number>(0);
  const [isInTune, setIsInTune] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('chromatic');
  const [referenceA4, setReferenceA4] = useState<number>(440);
  const [isPitchGenActive, setIsPitchGenActive] = useState<boolean>(false);

  const tunerAudioCtxRef = useRef<AudioContext | null>(null);
  const tunerStreamRef = useRef<MediaStream | null>(null);
  const tunerAnalyserRef = useRef<AnalyserNode | null>(null);
  const tunerRafRef = useRef<number | null>(null);
  const pitchGenOscRef = useRef<OscillatorNode | null>(null);

  // Audio Context Helpers
  const getMetroAudioCtx = useCallback(() => {
    if (!metroAudioCtxRef.current || metroAudioCtxRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        metroAudioCtxRef.current = new AudioCtx();
      }
    }
    if (metroAudioCtxRef.current && metroAudioCtxRef.current.state === 'suspended') {
      metroAudioCtxRef.current.resume();
    }
    return metroAudioCtxRef.current;
  }, []);

  const playClick = useCallback((time: number, isDownbeat: boolean, isSub: boolean) => {
    try {
      const ctx = getMetroAudioCtx();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (isDownbeat && accentDownbeat) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, time);
        gain.gain.setValueAtTime(volume * 0.9, time);
      } else if (isSub) {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, time);
        gain.gain.setValueAtTime(volume * 0.35, time);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, time);
        gain.gain.setValueAtTime(volume * 0.65, time);
      }

      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.045);
    } catch (e) {
      console.warn('[Metronome] Audio click error:', e);
    }
  }, [getMetroAudioCtx, accentDownbeat, volume]);

  // High-precision Web Audio Scheduler
  const scheduleAheadTime = 0.1; // 100ms lookahead
  const scheduler = useCallback(() => {
    const ctx = getMetroAudioCtx();
    if (!ctx) return;

    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      const isSub = currentSubbeatRef.current > 0;
      const isDown = currentBeatRef.current === 0 && !isSub;

      playClick(nextNoteTimeRef.current, isDown, isSub);

      const beatVal = currentBeatRef.current;
      const subVal = currentSubbeatRef.current;
      setTimeout(() => {
        setCurrentBeat(beatVal);
        setCurrentSubbeat(subVal);
      }, Math.max(0, (nextNoteTimeRef.current - ctx.currentTime) * 1000));

      // Advance subbeat & beat
      const secondsPerBeat = 60.0 / bpmRef.current;
      const secondsPerSub = secondsPerBeat / subdivision;
      nextNoteTimeRef.current += secondsPerSub;

      currentSubbeatRef.current++;
      if (currentSubbeatRef.current >= subdivision) {
        currentSubbeatRef.current = 0;
        currentBeatRef.current++;

        if (currentBeatRef.current >= timeSignature) {
          currentBeatRef.current = 0;
          barsCounterRef.current++;

          // Check Tempo Trainer progression
          if (isTrainerActive && barsCounterRef.current >= trainerBars) {
            barsCounterRef.current = 0;
            setBpm(prev => {
              const next = Math.min(trainerTargetBpm, prev + trainerStepBpm);
              return next;
            });
          }
        }
      }
    }
  }, [getMetroAudioCtx, playClick, subdivision, timeSignature, isTrainerActive, trainerBars, trainerStepBpm, trainerTargetBpm]);

  // Metronome Timer Loop
  useEffect(() => {
    if (isPlaying && activeTool === 'metronome') {
      const ctx = getMetroAudioCtx();
      if (ctx) {
        nextNoteTimeRef.current = ctx.currentTime + 0.05;
        currentBeatRef.current = 0;
        currentSubbeatRef.current = 0;
        barsCounterRef.current = 0;
        setCurrentBeat(0);
        setCurrentSubbeat(0);
      }

      const timer = setInterval(scheduler, 25);
      timerWorkerRef.current = timer;

      return () => clearInterval(timer);
    } else {
      if (timerWorkerRef.current) {
        clearInterval(timerWorkerRef.current);
        timerWorkerRef.current = null;
      }
      setCurrentBeat(0);
      setCurrentSubbeat(0);
    }
  }, [isPlaying, activeTool, getMetroAudioCtx, scheduler]);

  // Tap Tempo Handler
  const handleTapTempo = () => {
    const now = Date.now();
    const times = tapTimesRef.current;

    // Reset if last tap was more than 2 seconds ago
    if (times.length > 0 && now - times[times.length - 1] > 2000) {
      tapTimesRef.current = [];
    }

    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 5) {
      tapTimesRef.current.shift();
    }

    if (tapTimesRef.current.length >= 2) {
      const intervals = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 30 && calculatedBpm <= 300) {
        setBpm(calculatedBpm);
      }
    }
  };

  // Autocorrelation Pitch Detection for Tuner
  const autoCorrelate = (buf: Float32Array, sampleRate: number): number => {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
      const val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.015) return -1; // Not enough signal

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }

    const buf2 = buf.slice(r1, r2);
    const c = new Array(buf2.length).fill(0);
    for (let i = 0; i < buf2.length; i++) {
      for (let j = 0; j < buf2.length - i; j++) {
        c[i] = c[i] + buf2[j] * buf2[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < buf2.length; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;

    // Parabolic interpolation for fine tuning
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  };

  const getNoteFromPitch = useCallback((frequency: number, refA4: number) => {
    const noteNum = 12 * (Math.log(frequency / refA4) / Math.log(2));
    const midi = Math.round(noteNum) + 69;
    const noteIndex = (midi % 12 + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    const idealFreq = refA4 * Math.pow(2, (midi - 69) / 12);
    const cents = Math.floor(1200 * Math.log2(frequency / idealFreq));

    return {
      note: NOTE_NAMES[noteIndex],
      octave,
      cents,
      idealFreq
    };
  }, []);

  // Tuner Microphone Loop
  const startTuner = async () => {
    try {
      const stream = await acquireAudioStream({ 
        audio: { 
          echoCancellation: false, 
          noiseSuppression: false, 
          autoGainControl: false 
        } 
      });
      tunerStreamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      tunerAudioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      tunerAnalyserRef.current = analyser;

      setIsTunerActive(true);

      const buffer = new Float32Array(analyser.fftSize);
      const updatePitch = () => {
        if (!tunerAnalyserRef.current) return;
        tunerAnalyserRef.current.getFloatTimeDomainData(buffer);
        const pitch = autoCorrelate(buffer, ctx.sampleRate);

        if (pitch !== -1 && pitch > 30 && pitch < 2000) {
          setDetectedFreq(Math.round(pitch * 10) / 10);
          const { note, octave, cents } = getNoteFromPitch(pitch, referenceA4);
          setDetectedNote(note);
          setDetectedOctave(octave);
          setCentsDiff(cents);
          setIsInTune(Math.abs(cents) <= 4);
        }
        tunerRafRef.current = requestAnimationFrame(updatePitch);
      };

      tunerRafRef.current = requestAnimationFrame(updatePitch);
    } catch (err) {
      console.warn('[Tuner] Microphone access error:', err);
      setIsTunerActive(false);
    }
  };

  const stopTuner = useCallback(() => {
    if (tunerRafRef.current) {
      cancelAnimationFrame(tunerRafRef.current);
      tunerRafRef.current = null;
    }
    if (tunerStreamRef.current) {
      releaseAudioStream(tunerStreamRef.current);
      tunerStreamRef.current = null;
    }
    if (tunerAudioCtxRef.current && tunerAudioCtxRef.current.state !== 'closed') {
      tunerAudioCtxRef.current.close().catch(() => {});
      tunerAudioCtxRef.current = null;
    }
    setIsTunerActive(false);
    setDetectedNote('--');
    setDetectedOctave(null);
    setDetectedFreq(0);
    setCentsDiff(0);
    setIsInTune(false);
  }, []);

  // Reference Pitch Pipe Generator
  const toggleReferencePitch = () => {
    if (isPitchGenActive) {
      if (pitchGenOscRef.current) {
        pitchGenOscRef.current.stop();
        pitchGenOscRef.current.disconnect();
        pitchGenOscRef.current = null;
      }
      setIsPitchGenActive(false);
    } else {
      const ctx = getMetroAudioCtx();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(referenceA4, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      pitchGenOscRef.current = osc;
      setIsPitchGenActive(true);
    }
  };

  // Hardware-Safety Cleanup: Stop Audio & Mic when switching tools or unmounting
  useEffect(() => {
    return () => {
      setIsPlaying(false);
      stopTuner();
      if (pitchGenOscRef.current) {
        pitchGenOscRef.current.stop();
        pitchGenOscRef.current = null;
      }
    };
  }, [stopTuner]);

  // When switching sub-tabs inside toolbox, stop active sounds/mic
  const handleSwitchTool = (tool: 'metronome' | 'tuner') => {
    if (tool !== activeTool) {
      setIsPlaying(false);
      stopTuner();
      if (isPitchGenActive && pitchGenOscRef.current) {
        pitchGenOscRef.current.stop();
        pitchGenOscRef.current = null;
        setIsPitchGenActive(false);
      }
      setActiveTool(tool);
    }
  };

  const selectedPreset = INSTRUMENT_PRESETS.find(p => p.id === selectedPresetId) || INSTRUMENT_PRESETS[0];

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      minHeight: '440px'
    }}>
      {/* Sub-Header Toggle (Rhythmus vs. Tuner) */}
      <div style={{
        display: 'flex',
        background: '#f1f5f9',
        borderRadius: '12px',
        padding: '3px',
        gap: '4px'
      }}>
        <button
          type="button"
          onClick={() => handleSwitchTool('metronome')}
          style={{
            flex: 1,
            padding: '7px 10px',
            borderRadius: '9px',
            border: activeTool === 'metronome' ? '1px solid #cbd5e1' : 'none',
            background: activeTool === 'metronome' ? '#ffffff' : 'transparent',
            color: activeTool === 'metronome' ? '#0f172a' : '#64748b',
            fontWeight: activeTool === 'metronome' ? 800 : 600,
            fontSize: '0.76rem',
            cursor: 'pointer',
            boxShadow: activeTool === 'metronome' ? '0 2px 5px rgba(0,0,0,0.04)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <Activity size={13} color={activeTool === 'metronome' ? '#34a853' : '#64748b'} />
          <span>Rhythmus-Trainer</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTool('tuner')}
          style={{
            flex: 1,
            padding: '7px 10px',
            borderRadius: '9px',
            border: activeTool === 'tuner' ? '1px solid #cbd5e1' : 'none',
            background: activeTool === 'tuner' ? '#ffffff' : 'transparent',
            color: activeTool === 'tuner' ? '#0f172a' : '#64748b',
            fontWeight: activeTool === 'tuner' ? 800 : 600,
            fontSize: '0.76rem',
            cursor: 'pointer',
            boxShadow: activeTool === 'tuner' ? '0 2px 5px rgba(0,0,0,0.04)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <Radio size={13} color={activeTool === 'tuner' ? '#34a853' : '#64748b'} />
          <span>Stimmgerät & Pitch</span>
        </button>
      </div>

      {activeTool === 'metronome' ? (
        /* ================= METRONOM & RHYTHMUS-TRAINER ================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* BPM Large Hero Display & Dial */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '16px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tempo (BPM)
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {bpm}
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>
                  {bpm < 60 ? 'Largo' : bpm < 76 ? 'Adagio' : bpm < 108 ? 'Andante' : bpm < 120 ? 'Moderato' : bpm < 168 ? 'Allegro' : 'Presto'}
                </span>
              </div>
            </div>

            {/* Quick Step Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <button
                type="button"
                onClick={() => setBpm(b => Math.max(30, b - 5))}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="-5 BPM"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => setBpm(b => Math.max(30, b - 1))}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="-1 BPM"
              >
                <Minus size={13} />
              </button>
              <button
                type="button"
                onClick={() => setBpm(b => Math.min(300, b + 1))}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="+1 BPM"
              >
                <Plus size={13} />
              </button>
              <button
                type="button"
                onClick={() => setBpm(b => Math.min(300, b + 5))}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="+5 BPM"
              >
                +5
              </button>
            </div>
          </div>

          {/* BPM Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <input
              type="range"
              min="30"
              max="300"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                accentColor: '#34a853',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8' }}>
              <span>30 BPM</span>
              <span>120 BPM</span>
              <span>300 BPM</span>
            </div>
          </div>

          {/* Visual Beat Bar Display */}
          <div style={{
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 0'
          }}>
            {Array.from({ length: timeSignature }).map((_, idx) => {
              const isCurrent = isPlaying && currentBeat === idx;
              const isDown = idx === 0;

              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    height: isCurrent ? '22px' : '14px',
                    borderRadius: '7px',
                    background: isCurrent 
                      ? (isDown ? '#34a853' : '#0f172a') 
                      : '#e2e8f0',
                    transition: 'all 0.08s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isCurrent ? '0 0 10px rgba(52, 168, 83, 0.4)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isCurrent ? '#ffffff' : '#64748b',
                    fontSize: '0.65rem',
                    fontWeight: 900
                  }}
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>

          {/* Main Controls Row (Play, Tap Tempo, Taktart, Subdivisions) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
            {/* Play / Pause Primary Button */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '10px',
                borderRadius: '12px',
                border: 'none',
                background: isPlaying ? '#0f172a' : '#34a853',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isPlaying ? '0 4px 12px rgba(15, 23, 42, 0.25)' : '0 4px 12px rgba(52, 168, 83, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              <span>{isPlaying ? 'Stopp' : 'Start'}</span>
            </button>

            {/* Tap Tempo Button */}
            <button
              type="button"
              onClick={handleTapTempo}
              style={{
                padding: '10px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#0f172a',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Zap size={14} color="#64748b" />
              <span>Tap Tempo</span>
            </button>

            {/* Time Signature Selector */}
            <select
              value={timeSignature}
              onChange={(e) => setTimeSignature(parseInt(e.target.value, 10))}
              style={{
                padding: '8px 10px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              <option value="2">2/4 Takt</option>
              <option value="3">3/4 Takt</option>
              <option value="4">4/4 Takt</option>
              <option value="5">5/4 Takt</option>
              <option value="6">6/8 Takt</option>
            </select>
          </div>

          {/* Subdivisions & Tempo Trainer Accordion */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b' }}>Unterteilung:</span>
              <div style={{ display: 'flex', gap: '3px' }}>
                {[
                  { id: 1, label: '1/4' },
                  { id: 2, label: '1/8' },
                  { id: 3, label: '3-el' },
                  { id: 4, label: '1/16' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSubdivision(sub.id)}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '6px',
                      border: subdivision === sub.id ? '1px solid #34a853' : '1px solid #e2e8f0',
                      background: subdivision === sub.id ? '#e6f4ea' : '#ffffff',
                      color: subdivision === sub.id ? '#1e7e34' : '#64748b',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsTrainerOpen(!isTrainerOpen)}
              style={{
                border: 'none',
                background: 'transparent',
                color: isTrainerActive ? '#34a853' : '#64748b',
                fontSize: '0.70rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{isTrainerActive ? '⚡ Trainer aktiv' : 'Tempo-Trainer'}</span>
              {isTrainerOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {/* Tempo Trainer Drawer */}
          {isTrainerOpen && (
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a' }}>
                  Automatisches Steigerungstraining (Accelerando)
                </span>
                <input
                  type="checkbox"
                  checked={isTrainerActive}
                  onChange={(e) => setIsTrainerActive(e.target.checked)}
                  style={{ accentColor: '#34a853', width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', fontSize: '0.68rem' }}>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>Steigerung:</span>
                  <select
                    value={trainerStepBpm}
                    onChange={(e) => setTrainerStepBpm(parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700 }}
                  >
                    <option value="1">+1 BPM</option>
                    <option value="2">+2 BPM</option>
                    <option value="5">+5 BPM</option>
                  </select>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>Intervall:</span>
                  <select
                    value={trainerBars}
                    onChange={(e) => setTrainerBars(parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700 }}
                  >
                    <option value="1">Jeder Takt</option>
                    <option value="2">Alle 2 Takte</option>
                    <option value="4">Alle 4 Takte</option>
                    <option value="8">Alle 8 Takte</option>
                  </select>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>Ziel-Tempo:</span>
                  <select
                    value={trainerTargetBpm}
                    onChange={(e) => setTrainerTargetBpm(parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700 }}
                  >
                    <option value="140">140 BPM</option>
                    <option value="160">160 BPM</option>
                    <option value="180">180 BPM</option>
                    <option value="200">200 BPM</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================= CHROMATISCHER TUNER & PITCH GENERATOR ================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Preset Selector */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 800,
                fontSize: '0.74rem',
                cursor: 'pointer'
              }}
            >
              {INSTRUMENT_PRESETS.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setReferenceA4(r => r === 440 ? 442 : r === 442 ? 432 : 440)}
              style={{
                padding: '7px 10px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#0f172a',
                fontWeight: 800,
                fontSize: '0.70rem',
                cursor: 'pointer'
              }}
              title="Kammerton A4 Kalibrierung (440Hz / 442Hz / 432Hz)"
            >
              A={referenceA4}Hz
            </button>
          </div>

          {/* Tuner Gauge Hero Display */}
          <div style={{
            background: isTunerActive && isInTune 
              ? 'linear-gradient(135deg, #e6f4ea 0%, #d1fae5 100%)' 
              : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: isTunerActive && isInTune ? '1px solid #34a853' : '1px solid #e2e8f0',
            transition: 'all 0.2s ease',
            minHeight: '170px'
          }}>
            {/* Note & Octave */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{
                fontSize: '3.2rem',
                fontWeight: 900,
                color: isTunerActive ? (isInTune ? '#1e7e34' : '#0f172a') : '#94a3b8',
                letterSpacing: '-0.04em',
                lineHeight: 1
              }}>
                {isTunerActive ? detectedNote : '--'}
              </span>
              {isTunerActive && detectedOctave !== null && (
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: isInTune ? '#1e7e34' : '#64748b' }}>
                  {detectedOctave}
                </span>
              )}
            </div>

            {/* Cents Needle Display */}
            <div style={{ width: '100%', maxWidth: '240px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{
                height: '8px',
                background: '#e2e8f0',
                borderRadius: '100px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Center Zero Line */}
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  background: '#0f172a',
                  transform: 'translateX(-50%)',
                  zIndex: 2
                }} />

                {/* Needle Indicator */}
                {isTunerActive && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    width: '12px',
                    borderRadius: '100px',
                    background: isInTune ? '#34a853' : (centsDiff < 0 ? '#ea4335' : '#eab308'),
                    left: `${Math.max(5, Math.min(95, 50 + centsDiff))}%`,
                    transform: 'translateX(-50%)',
                    transition: 'left 0.1s ease-out',
                    zIndex: 3
                  }} />
                )}
              </div>

              {/* Cents Text & Hz */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 800 }}>
                <span style={{ color: '#64748b' }}>
                  {isTunerActive && detectedFreq > 0 ? `${detectedFreq} Hz` : 'Bereit'}
                </span>
                <span style={{ color: isInTune ? '#1e7e34' : (centsDiff > 0 ? '#eab308' : '#ea4335') }}>
                  {isTunerActive ? (isInTune ? '✓ Perfekt gestimmt' : `${centsDiff > 0 ? '+' : ''}${centsDiff} Cent`) : 'Mikrofon starten'}
                </span>
              </div>
            </div>
          </div>

          {/* Tuner Mic Action Button & Pitch Generator */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={isTunerActive ? stopTuner : startTuner}
              style={{
                padding: '11px',
                borderRadius: '12px',
                border: 'none',
                background: isTunerActive ? '#ea4335' : '#34a853',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.80rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isTunerActive ? '0 4px 12px rgba(234, 67, 53, 0.25)' : '0 4px 12px rgba(52, 168, 83, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              {isTunerActive ? <MicOff size={15} /> : <Mic size={15} />}
              <span>{isTunerActive ? 'Stimmgerät stoppen' : 'Live-Stimmgerät'}</span>
            </button>

            <button
              type="button"
              onClick={toggleReferencePitch}
              style={{
                padding: '11px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: isPitchGenActive ? '#0f172a' : '#f8fafc',
                color: isPitchGenActive ? '#ffffff' : '#0f172a',
                fontWeight: 800,
                fontSize: '0.74rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Music size={14} color={isPitchGenActive ? '#ffffff' : '#64748b'} />
              <span>{isPitchGenActive ? 'Ton Stopp' : `Kammerton A (${referenceA4}Hz)`}</span>
            </button>
          </div>

          {/* Instrument String Helper Pills (if preset selected) */}
          {selectedPreset.strings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Saiten-Übersicht ({selectedPreset.name}):
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '4px' }}>
                {selectedPreset.strings.map((str, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '4px 6px',
                      borderRadius: '6px',
                      background: isTunerActive && detectedNote === str.name ? '#e6f4ea' : '#f8fafc',
                      border: isTunerActive && detectedNote === str.name ? '1px solid #34a853' : '1px solid #e2e8f0',
                      color: isTunerActive && detectedNote === str.name ? '#1e7e34' : '#475569',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      textAlign: 'center'
                    }}
                  >
                    {str.label}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
