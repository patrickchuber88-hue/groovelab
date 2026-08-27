import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, ArrowLeft, RotateCcw, Check, Sparkles, Sliders, Music, Radio } from 'lucide-react';
import { acquireAudioStream, releaseAudioStream } from '../../services/audioPermissionService';

// Musikalische Noten-Definitionen
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface TuningString {
  name: string;
  octave: number;
  freq: number;
  label?: string;
}

interface InstrumentPreset {
  id: string;
  name: string;
  icon: string;
  strings: TuningString[];
}

const INSTRUMENT_PRESETS: InstrumentPreset[] = [
  {
    id: 'guitar_standard',
    name: 'Gitarre (Standard)',
    icon: '🎸',
    strings: [
      { name: 'E', octave: 2, freq: 82.41, label: '6. E' },
      { name: 'A', octave: 2, freq: 110.00, label: '5. A' },
      { name: 'D', octave: 3, freq: 146.83, label: '4. D' },
      { name: 'G', octave: 3, freq: 196.00, label: '3. G' },
      { name: 'B', octave: 3, freq: 246.94, label: '2. B' },
      { name: 'E', octave: 4, freq: 329.63, label: '1. e' }
    ]
  },
  {
    id: 'guitar_drop_d',
    name: 'Gitarre (Drop D)',
    icon: '🎸',
    strings: [
      { name: 'D', octave: 2, freq: 73.42, label: '6. D' },
      { name: 'A', octave: 2, freq: 110.00, label: '5. A' },
      { name: 'D', octave: 3, freq: 146.83, label: '4. D' },
      { name: 'G', octave: 3, freq: 196.00, label: '3. G' },
      { name: 'B', octave: 3, freq: 246.94, label: '2. B' },
      { name: 'E', octave: 4, freq: 329.63, label: '1. e' }
    ]
  },
  {
    id: 'bass_4',
    name: 'E-Bass (4-Saiter)',
    icon: '🎸',
    strings: [
      { name: 'E', octave: 1, freq: 41.20, label: '4. E' },
      { name: 'A', octave: 1, freq: 55.00, label: '3. A' },
      { name: 'D', octave: 2, freq: 73.42, label: '2. D' },
      { name: 'G', octave: 2, freq: 98.00, label: '1. G' }
    ]
  },
  {
    id: 'bass_5',
    name: 'E-Bass (5-Saiter)',
    icon: '🎸',
    strings: [
      { name: 'B', octave: 0, freq: 30.87, label: '5. B' },
      { name: 'E', octave: 1, freq: 41.20, label: '4. E' },
      { name: 'A', octave: 1, freq: 55.00, label: '3. A' },
      { name: 'D', octave: 2, freq: 73.42, label: '2. D' },
      { name: 'G', octave: 2, freq: 98.00, label: '1. G' }
    ]
  },
  {
    id: 'violin',
    name: 'Geige / Violine',
    icon: '🎻',
    strings: [
      { name: 'G', octave: 3, freq: 196.00, label: '4. G' },
      { name: 'D', octave: 4, freq: 293.66, label: '3. D' },
      { name: 'A', octave: 4, freq: 440.00, label: '2. A' },
      { name: 'E', octave: 5, freq: 659.25, label: '1. E' }
    ]
  },
  {
    id: 'cello',
    name: 'Cello',
    icon: '🎻',
    strings: [
      { name: 'C', octave: 2, freq: 65.41, label: '4. C' },
      { name: 'G', octave: 2, freq: 98.00, label: '3. G' },
      { name: 'D', octave: 3, freq: 146.83, label: '2. D' },
      { name: 'A', octave: 3, freq: 220.00, label: '1. A' }
    ]
  },
  {
    id: 'ukulele',
    name: 'Ukulele (G-C-E-A)',
    icon: '🏝️',
    strings: [
      { name: 'G', octave: 4, freq: 392.00, label: '4. G' },
      { name: 'C', octave: 4, freq: 261.63, label: '3. C' },
      { name: 'E', octave: 4, freq: 329.63, label: '2. E' },
      { name: 'A', octave: 4, freq: 440.00, label: '1. A' }
    ]
  },
  {
    id: 'chromatic',
    name: 'Chromatisch (Alle Töne)',
    icon: '🎙️',
    strings: []
  }
];

// Robuste Autokorrelation für Pitch-Detection
function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  // Noise Gate: Hintergrundgeräusche ignorieren
  if (rms < 0.012) return -1;

  // Trimming der Signal-Ränder
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }

  const trimmedBuf = buf.slice(r1, r2);
  const c = new Float32Array(trimmedBuf.length).fill(0);
  for (let i = 0; i < trimmedBuf.length; i++) {
    for (let j = 0; j < trimmedBuf.length - i; j++) {
      c[i] = c[i] + trimmedBuf[j] * trimmedBuf[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < trimmedBuf.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;
  if (T0 === -1 || maxval / c[0] < 0.5) return -1;

  // Parabolische Interpolation für Sub-Sample-Genauigkeit
  const x1 = c[T0 - 1];
  const x2 = c[T0];
  const x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

// Frequenz zu Note & Cents
function noteFromPitch(frequency: number, a4: number = 440) {
  const noteNum = 12 * (Math.log(frequency / a4) / Math.log(2));
  return Math.round(noteNum) + 69;
}

function frequencyFromNoteNumber(note: number, a4: number = 440) {
  return a4 * Math.pow(2, (note - 69) / 12);
}

function centsOffFromPitch(frequency: number, note: number, a4: number = 440) {
  return Math.floor((1200 * Math.log(frequency / frequencyFromNoteNumber(note, a4))) / Math.log(2));
}

interface CampusTunerProps {
  onBack?: () => void;
  uiLevel?: string;
}

export const CampusTuner: React.FC<CampusTunerProps> = ({ onBack, uiLevel = 'pro' }) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('guitar_standard');
  const [selectedStringIndex, setSelectedStringIndex] = useState<number | null>(null);
  const [a4Reference, setA4Reference] = useState<number>(440);
  const [isPlayingReference, setIsPlayingReference] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Live Detektierte Werte
  const [detectedPitch, setDetectedPitch] = useState<number | null>(null);
  const [detectedNote, setDetectedNote] = useState<string>('--');
  const [detectedOctave, setDetectedOctave] = useState<number | null>(null);
  const [centsDeviation, setCentsDeviation] = useState<number>(0);
  const [inTuneConfidence, setInTuneConfidence] = useState<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const selectedPreset = INSTRUMENT_PRESETS.find(p => p.id === selectedPresetId) || INSTRUMENT_PRESETS[0];

  // Stop Microphone & Hardware Teardown
  const stopListening = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      releaseAudioStream(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (err) {}
      audioContextRef.current = null;
    }
    setIsListening(false);
    setDetectedPitch(null);
    setDetectedNote('--');
    setDetectedOctave(null);
    setCentsDeviation(0);
  }, []);

  // Update Loop für Audio-Analyse
  const updatePitch = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const buf = new Float32Array(2048);
    analyser.getFloatTimeDomainData(buf);

    const pitch = autoCorrelate(buf, audioContextRef.current.sampleRate);

    if (pitch !== -1 && pitch > 20 && pitch < 2000) {
      setDetectedPitch(Math.round(pitch * 10) / 10);
      const noteNum = noteFromPitch(pitch, a4Reference);
      const noteName = NOTE_NAMES[noteNum % 12];
      const octave = Math.floor(noteNum / 12) - 1;
      const cents = centsOffFromPitch(pitch, noteNum, a4Reference);

      setDetectedNote(noteName);
      setDetectedOctave(octave);
      setCentsDeviation(Math.max(-50, Math.min(50, cents)));

      if (Math.abs(cents) <= 3) {
        setInTuneConfidence(prev => Math.min(prev + 1, 10));
      } else {
        setInTuneConfidence(0);
      }

      // Auto-Highlight matching string in preset
      if (selectedPreset.strings.length > 0) {
        const bestStringIdx = selectedPreset.strings.findIndex(
          s => s.name === noteName && Math.abs(s.octave - octave) <= 1
        );
        if (bestStringIdx !== -1) {
          setSelectedStringIndex(bestStringIdx);
        }
      }
    } else {
      setInTuneConfidence(0);
    }

    animationFrameRef.current = requestAnimationFrame(updatePitch);
  }, [a4Reference, selectedPreset.strings]);

  // Start Microphone
  const startListening = async () => {
    setMicError(null);
    try {
      const stream = await acquireAudioStream({
        audio: {
          echoCancellation: false,
          autoGainControl: true,
          noiseSuppression: false
        }
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      // Biquad Filter für saubere Intonationserkennung
      const biquad = audioCtx.createBiquadFilter();
      biquad.type = 'lowpass';
      biquad.frequency.setValueAtTime(1500, audioCtx.currentTime);

      source.connect(biquad);
      biquad.connect(analyser);

      setIsListening(true);
      animationFrameRef.current = requestAnimationFrame(updatePitch);
    } catch (err: any) {
      console.error('Microphone access failed in CampusTuner:', err);
      setMicError('Mikrofonzugriff wurde verweigert oder ist nicht verfügbar.');
      setIsListening(false);
    }
  };

  // Referenzton abspielen / stoppen
  const toggleReferenceTone = () => {
    if (isPlayingReference) {
      if (oscRef.current) {
        try {
          oscRef.current.stop();
          oscRef.current.disconnect();
        } catch (e) {}
        oscRef.current = null;
      }
      setIsPlayingReference(false);
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = audioContextRef.current || new AudioCtx();
        audioContextRef.current = audioCtx;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(a4Reference, audioCtx.currentTime);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        oscRef.current = osc;
        gainNodeRef.current = gain;
        setIsPlayingReference(true);
      } catch (err) {
        console.error('Error playing reference tone:', err);
      }
    }
  };

  // Cleanup on Unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (oscRef.current) {
        try {
          oscRef.current.stop();
        } catch (e) {}
      }
    };
  }, [stopListening]);

  const isInTune = isListening && detectedPitch !== null && Math.abs(centsDeviation) <= 3;
  const isClose = isListening && detectedPitch !== null && Math.abs(centsDeviation) <= 10;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      maxWidth: '880px',
      margin: '0 auto',
      width: '100%',
      padding: '0 8px'
    }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                padding: '8px 14px',
                borderRadius: '12px',
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#0f172a',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
            >
              <ArrowLeft size={16} />
              <span>Zurück zur Übersicht</span>
            </button>
          )}
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>🎸</span>
              <span>WebAudio Stimmgerät</span>
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
              Präzise Frequenzerkennung mit Autokorrelation für saubere Intonation
            </p>
          </div>
        </div>

        {/* Instrument Preset Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={selectedPresetId}
            onChange={(e) => {
              setSelectedPresetId(e.target.value);
              setSelectedStringIndex(null);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#0f172a',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
          >
            {INSTRUMENT_PRESETS.map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.icon} {preset.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={toggleReferenceTone}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '12px',
              border: 'none',
              background: isPlayingReference ? '#ef4444' : '#f1f5f9',
              color: isPlayingReference ? '#ffffff' : '#475569',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Kammerton A4 (440 Hz) abspielen"
            className="hover-scale"
          >
            {isPlayingReference ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span>440 Hz Ton</span>
          </button>
        </div>
      </div>

      {micError && (
        <div style={{
          background: '#fef2f2',
          border: '1.5px solid #fecaca',
          borderRadius: '16px',
          padding: '12px 16px',
          color: '#b91c1c',
          fontSize: '0.84rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚠️</span>
          <span>{micError}</span>
        </div>
      )}

      {/* Main Tuner Stage Hero Card (Apple HIG Pure White Stage) */}
      <div style={{
        background: '#ffffff',
        border: isInTune ? '2px solid #22c55e' : '1.5px solid #e2e8f0',
        borderRadius: '28px',
        padding: '36px 28px',
        boxShadow: isInTune
          ? '0 20px 48px -10px rgba(34, 197, 94, 0.22), 0 0 0 1.5px rgba(34, 197, 94, 0.35)'
          : '0 12px 32px -4px rgba(0, 0, 0, 0.05), 0 2px 6px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* In-Tune Banner Glass Pill */}
        {isInTune && (
          <div style={{
            position: 'absolute',
            top: '18px',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            backdropFilter: 'blur(8px)',
            color: '#15803d',
            padding: '5px 16px',
            borderRadius: '99px',
            fontSize: '0.78rem',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)',
            animation: 'pulse 1.5s infinite'
          }}>
            <Check size={14} strokeWidth={3} />
            <span>Perfekt gestimmt!</span>
          </div>
        )}

        {/* Large Note Display Centerpiece with Dynamic Apple Radiant Glow */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{
              fontSize: '4.8rem',
              fontWeight: 950,
              fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
              color: isInTune ? '#16a34a' : isClose ? '#f59e0b' : isListening ? '#0f172a' : '#cbd5e1',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              textShadow: isInTune ? '0 0 28px rgba(34, 197, 94, 0.45)' : 'none',
              transition: 'all 0.2s ease'
            }}>
              {detectedNote}
            </span>
            {detectedOctave !== null && isListening && (
              <span style={{
                fontSize: '2rem',
                fontWeight: 850,
                color: isInTune ? '#22c55e' : '#94a3b8',
                lineHeight: 1,
                transition: 'color 0.2s ease'
              }}>
                {detectedOctave}
              </span>
            )}
          </div>

          <div style={{
            marginTop: '8px',
            fontSize: '0.90rem',
            fontWeight: 800,
            color: isInTune ? '#15803d' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {detectedPitch ? (
              <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
                {detectedPitch.toFixed(1)} Hz
              </span>
            ) : isListening ? (
              <span>Spiele eine Saite...</span>
            ) : (
              <span>Stimmgerät inaktiv</span>
            )}
          </div>
        </div>

        {/* Cent Deviation Precision Meter Gauge */}
        <div style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            fontWeight: 850,
            color: '#94a3b8',
            letterSpacing: '0.02em'
          }}>
            <span>◀ TIEF (-50)</span>
            <span style={{
              color: isInTune ? '#16a34a' : '#0f172a',
              fontWeight: 900,
              fontSize: '0.84rem',
              fontVariantNumeric: 'tabular-nums',
              background: isInTune ? '#dcfce7' : '#f1f5f9',
              padding: '2px 8px',
              borderRadius: '8px',
              transition: 'all 0.15s ease'
            }}>
              {centsDeviation > 0 ? `+${centsDeviation} ct` : `${centsDeviation} ct`}
            </span>
            <span>HOCH (+50) ▶</span>
          </div>

          {/* Meter Track with Precision Ticks */}
          <div style={{
            width: '100%',
            height: '20px',
            background: '#f1f5f9',
            borderRadius: '99px',
            position: 'relative',
            overflow: 'hidden',
            border: '1.5px solid #e2e8f0',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)'
          }}>
            {/* Center Zero Target Line */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: '3px',
              background: '#0f172a',
              transform: 'translateX(-50%)',
              zIndex: 5
            }} />

            {/* In-Tune Sweet Spot Zone (±3 cents) */}
            <div style={{
              position: 'absolute',
              left: '47%',
              right: '47%',
              top: 0,
              bottom: 0,
              background: 'rgba(34, 197, 94, 0.3)',
              zIndex: 2
            }} />

            {/* Dynamic Precision Needle Indicator */}
            {isListening && detectedPitch !== null && (
              <div style={{
                position: 'absolute',
                left: `${50 + (centsDeviation / 50) * 45}%`,
                top: '2px',
                bottom: '2px',
                width: '14px',
                borderRadius: '8px',
                background: isInTune
                  ? '#16a34a'
                  : isClose
                  ? '#f59e0b'
                  : '#ef4444',
                transform: 'translateX(-50%)',
                boxShadow: isInTune
                  ? '0 0 12px rgba(34, 197, 94, 0.8), 0 2px 4px rgba(0,0,0,0.1)'
                  : '0 2px 6px rgba(0,0,0,0.15)',
                transition: 'left 0.08s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s',
                zIndex: 10
              }} />
            )}
          </div>
        </div>

        {/* Saiten-Auswahl / Target Pegs (sofern Preset Saiten hat) */}
        {selectedPreset.strings.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            marginTop: '8px'
          }}>
            {selectedPreset.strings.map((str, idx) => {
              const isSelected = selectedStringIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedStringIndex(idx)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '58px',
                    padding: '8px 12px',
                    borderRadius: '14px',
                    border: isSelected ? '2px solid #16a34a' : '1.5px solid #e2e8f0',
                    background: isSelected ? '#dcfce7' : '#f8fafc',
                    color: isSelected ? '#15803d' : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(34, 197, 94, 0.2)' : 'none'
                  }}
                  className="hover-scale"
                >
                  <span style={{ fontSize: '0.92rem', fontWeight: 900 }}>{str.name}{str.octave}</span>
                  <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748b' }}>{str.label || `${str.freq}Hz`}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Big Mic Toggle Action Button (52px Signature Apple Hero Pill) */}
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          style={{
            marginTop: '12px',
            padding: '14px 34px',
            borderRadius: '20px',
            border: 'none',
            background: isListening
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            color: '#ffffff',
            fontWeight: 900,
            fontSize: '1.02rem',
            cursor: 'pointer',
            boxShadow: isListening
              ? '0 8px 24px rgba(239, 68, 68, 0.35)'
              : '0 8px 24px rgba(34, 197, 94, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          className="hover-scale"
        >
          {isListening ? <MicOff size={22} /> : <Mic size={22} />}
          <span>{isListening ? 'Mikrofon ausschalten' : 'Stimmen starten (Mikrofon an)'}</span>
        </button>
      </div>

      {/* Safety & Compliance Hint */}
      <div style={{
        textAlign: 'center',
        fontSize: '0.72rem',
        color: '#94a3b8',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px'
      }}>
        <span>🔒</span>
        <span>Lokale WebAudio-Verarbeitung: Es wird keine Audio-Aufnahme gespeichert oder übertragen.</span>
      </div>
    </div>
  );
};
