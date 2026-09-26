import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ArrowLeft,
  RotateCcw,
  Check,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ChevronDown,
  Lock,
  Minus,
  Plus,
  Radio
} from 'lucide-react';
import { acquireAudioStream, releaseAudioStream } from '../../services/audioPermissionService';

// Musikalische Noten-Definitionen
const NOTE_NAMES_INTL = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_GERMAN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B', 'H'];

export interface TuningString {
  name: string;
  octave: number;
  freq: number;
  label?: string;
  germanLabel?: string;
}

export interface InstrumentPreset {
  id: string;
  name: string;
  shortLabel?: string;
  strings: TuningString[];
}

// 🏛️ Monolith Goldstandard: Reine Typografie & 100% monochrome Nomenklatur (Zero-Emoji)
const INSTRUMENT_PRESETS: InstrumentPreset[] = [
  {
    id: 'guitar_standard',
    name: 'Gitarre (Standard: E-A-D-G-B-e)',
    shortLabel: 'Gitarre',
    strings: [
      { name: 'E', octave: 2, freq: 82.41, label: '6. E', germanLabel: '6. E' },
      { name: 'A', octave: 2, freq: 110.00, label: '5. A', germanLabel: '5. A' },
      { name: 'D', octave: 3, freq: 146.83, label: '4. D', germanLabel: '4. D' },
      { name: 'G', octave: 3, freq: 196.00, label: '3. G', germanLabel: '3. G' },
      { name: 'B', octave: 3, freq: 246.94, label: '2. B', germanLabel: '2. H' },
      { name: 'E', octave: 4, freq: 329.63, label: '1. e', germanLabel: '1. e' }
    ]
  },
  {
    id: 'guitar_drop_d',
    name: 'Gitarre (Drop D: D-A-D-G-B-e)',
    shortLabel: 'Drop D',
    strings: [
      { name: 'D', octave: 2, freq: 73.42, label: '6. D', germanLabel: '6. D' },
      { name: 'A', octave: 2, freq: 110.00, label: '5. A', germanLabel: '5. A' },
      { name: 'D', octave: 3, freq: 146.83, label: '4. D', germanLabel: '4. D' },
      { name: 'G', octave: 3, freq: 196.00, label: '3. G', germanLabel: '3. G' },
      { name: 'B', octave: 3, freq: 246.94, label: '2. B', germanLabel: '2. H' },
      { name: 'E', octave: 4, freq: 329.63, label: '1. e', germanLabel: '1. e' }
    ]
  },
  {
    id: 'bass_4',
    name: 'E-Bass (4-Saiter: E-A-D-G)',
    shortLabel: 'Bass 4-S',
    strings: [
      { name: 'E', octave: 1, freq: 41.20, label: '4. E', germanLabel: '4. E' },
      { name: 'A', octave: 1, freq: 55.00, label: '3. A', germanLabel: '3. A' },
      { name: 'D', octave: 2, freq: 73.42, label: '2. D', germanLabel: '2. D' },
      { name: 'G', octave: 2, freq: 98.00, label: '1. G', germanLabel: '1. G' }
    ]
  },
  {
    id: 'bass_5',
    name: 'E-Bass (5-Saiter: B-E-A-D-G)',
    shortLabel: 'Bass 5-S',
    strings: [
      { name: 'B', octave: 0, freq: 30.87, label: '5. B', germanLabel: '5. H' },
      { name: 'E', octave: 1, freq: 41.20, label: '4. E', germanLabel: '4. E' },
      { name: 'A', octave: 1, freq: 55.00, label: '3. A', germanLabel: '3. A' },
      { name: 'D', octave: 2, freq: 73.42, label: '2. D', germanLabel: '2. D' },
      { name: 'G', octave: 2, freq: 98.00, label: '1. G', germanLabel: '1. G' }
    ]
  },
  {
    id: 'violin',
    name: 'Geige / Violine (G-D-A-E)',
    shortLabel: 'Geige',
    strings: [
      { name: 'G', octave: 3, freq: 196.00, label: '4. G', germanLabel: '4. G' },
      { name: 'D', octave: 4, freq: 293.66, label: '3. D', germanLabel: '3. D' },
      { name: 'A', octave: 4, freq: 440.00, label: '2. A', germanLabel: '2. A' },
      { name: 'E', octave: 5, freq: 659.25, label: '1. E', germanLabel: '1. E' }
    ]
  },
  {
    id: 'cello',
    name: 'Cello (C-G-D-A)',
    shortLabel: 'Cello',
    strings: [
      { name: 'C', octave: 2, freq: 65.41, label: '4. C', germanLabel: '4. C' },
      { name: 'G', octave: 2, freq: 98.00, label: '3. G', germanLabel: '3. G' },
      { name: 'D', octave: 3, freq: 146.83, label: '2. D', germanLabel: '2. D' },
      { name: 'A', octave: 3, freq: 220.00, label: '1. A', germanLabel: '1. A' }
    ]
  },
  {
    id: 'ukulele',
    name: 'Ukulele (G-C-E-A)',
    shortLabel: 'Ukulele',
    strings: [
      { name: 'G', octave: 4, freq: 392.00, label: '4. G', germanLabel: '4. G' },
      { name: 'C', octave: 4, freq: 261.63, label: '3. C', germanLabel: '3. C' },
      { name: 'E', octave: 4, freq: 329.63, label: '2. E', germanLabel: '2. E' },
      { name: 'A', octave: 4, freq: 440.00, label: '1. A', germanLabel: '1. A' }
    ]
  },
  {
    id: 'chromatic',
    name: 'Chromatisch (Alle Töne / Bläser & Klavier)',
    shortLabel: 'Chromatisch',
    strings: []
  }
];

// Intelligente Initialisierung: Letztes Preset -> Schüler-Instrument -> Fallback
function resolveInitialPresetId(studentInstrument?: string): string {
  try {
    const saved = localStorage.getItem('campus_tuner_last_preset');
    if (saved && INSTRUMENT_PRESETS.some(p => p.id === saved)) {
      return saved;
    }
  } catch (e) {}

  if (studentInstrument) {
    const norm = studentInstrument.toLowerCase();
    if (norm.includes('gitarre') || norm.includes('guitar')) return 'guitar_standard';
    if (norm.includes('bass')) return 'bass_4';
    if (norm.includes('geige') || norm.includes('violin')) return 'violin';
    if (norm.includes('cello') || norm.includes('violoncello')) return 'cello';
    if (norm.includes('ukulele')) return 'ukulele';
    // Für Nicht-Saiten-Instrumente (Klavier, Gesang, Querflöte, Trompete, Saxophon):
    if (norm.includes('klavier') || norm.includes('piano') || norm.includes('flöte') ||
        norm.includes('sax') || norm.includes('trompete') || norm.includes('posaune')) {
      return 'chromatic';
    }
  }

  return 'guitar_standard';
}

// 🌟 0,1% Goldstandard 2027: YIN Pitch Detection Algorithm (de Cheveigné & Kawahara)
function detectPitchYIN(buf: Float32Array, sampleRate: number, threshold: number = 0.12): number {
  const size = buf.length;

  let rms = 0;
  for (let i = 0; i < size; i++) {
    rms += buf[i] * buf[i];
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.009) return -1;

  const halfSize = Math.floor(size / 2);
  const yinBuffer = new Float32Array(halfSize);

  for (let tau = 0; tau < halfSize; tau++) {
    let sum = 0;
    for (let i = 0; i < halfSize; i++) {
      const delta = buf[i] - buf[i + tau];
      sum += delta * delta;
    }
    yinBuffer[tau] = sum;
  }

  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] = runningSum > 0 ? (yinBuffer[tau] * tau) / runningSum : 1;
  }

  let tauEstimate = -1;
  for (let tau = 2; tau < halfSize; tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < halfSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) {
    let minVal = 1000;
    for (let tau = 2; tau < halfSize; tau++) {
      if (yinBuffer[tau] < minVal) {
        minVal = yinBuffer[tau];
        tauEstimate = tau;
      }
    }
    if (minVal > 0.35) return -1;
  }

  let betterTau = tauEstimate;
  if (tauEstimate > 0 && tauEstimate < halfSize - 1) {
    const s0 = yinBuffer[tauEstimate - 1];
    const s1 = yinBuffer[tauEstimate];
    const s2 = yinBuffer[tauEstimate + 1];
    const denominator = 2 * (s0 - 2 * s1 + s2);
    if (denominator !== 0) {
      betterTau = tauEstimate + (s0 - s2) / denominator;
    }
  }

  if (betterTau <= 0) return -1;
  return sampleRate / betterTau;
}

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
  studentInstrument?: string;
}

export const CampusTuner: React.FC<CampusTunerProps> = ({ onBack, uiLevel = 'pro', studentInstrument }) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => resolveInitialPresetId(studentInstrument));
  const [selectedStringIndex, setSelectedStringIndex] = useState<number | null>(null);

  // 🌟 Feature 1: Individuelle Kammerton-Kalibrierung mit Stepper (430–450 Hz)
  const [a4Reference, setA4Reference] = useState<number>(440);
  const [isPlayingReference, setIsPlayingReference] = useState<boolean>(false);
  const [playingToneFreq, setPlayingToneFreq] = useState<number | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  // 🌟 Feature 3: Deutsche H / International B Nomenklatur
  const [useGermanNotation, setUseGermanNotation] = useState<boolean>(true);

  // 🌟 Feature 4: Manuelles Target-Lock (Saiten-Anpinnen bei extremer Verstimmung)
  const [lockedStringIndex, setLockedStringIndex] = useState<number | null>(null);

  // Live Detektierte Werte
  const [detectedPitch, setDetectedPitch] = useState<number | null>(null);
  const [detectedNote, setDetectedNote] = useState<string>('--');
  const [detectedOctave, setDetectedOctave] = useState<number | null>(null);
  const [centsDeviation, setCentsDeviation] = useState<number>(0);

  // 🌟 Feature 5: Glättungs-Filter für Nadel-Physik & Magnetischer Snap
  const smoothedCentsRef = useRef<number>(0);
  const [smoothedCents, setSmoothedCents] = useState<number>(0);

  // Gestimmte Saiten
  const [tunedStrings, setTunedStrings] = useState<Record<number, boolean>>({});

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

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
    smoothedCentsRef.current = 0;
    setSmoothedCents(0);
  }, []);

  // Zweistufiger Sinus-Chime (880Hz -> 1760Hz) bei erfolgreichem Stimmen
  const playLockInChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = audioContextRef.current || new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.16, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.30);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760, now + 0.09);
      gain2.gain.setValueAtTime(0.001, now + 0.09);
      gain2.gain.linearRampToValueAtTime(0.20, now + 0.13);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.52);
    } catch (err) {
      console.warn('CampusTuner chime playback failed:', err);
    }
  }, []);

  // Referenzton abspielen oder stoppen
  const playTone = useCallback((freq: number | null) => {
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch (e) {}
      oscRef.current = null;
    }

    if (freq === null || playingToneFreq === freq) {
      setPlayingToneFreq(null);
      setIsPlayingReference(false);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      oscRef.current = osc;
      setPlayingToneFreq(freq);
      setIsPlayingReference(freq === a4Reference);
    } catch (err) {
      console.error('Error playing reference tone:', err);
      setPlayingToneFreq(null);
      setIsPlayingReference(false);
    }
  }, [playingToneFreq, a4Reference]);

  const toggleReferenceTone = () => {
    playTone(playingToneFreq === a4Reference ? null : a4Reference);
  };

  // Update Loop für Audio-Analyse
  const inTuneFramesRef = useRef<number>(0);

  const updatePitch = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);

    // 🌟 YIN Pitch Detection (Oktavsprung-frei)
    const pitch = detectPitchYIN(buf, audioContextRef.current.sampleRate);

    if (pitch !== -1 && pitch > 20 && pitch < 2200) {
      const roundedPitch = Math.round(pitch * 10) / 10;
      setDetectedPitch(roundedPitch);

      if (lockedStringIndex !== null && selectedPreset.strings[lockedStringIndex]) {
        const targetString = selectedPreset.strings[lockedStringIndex];
        const targetFreq = targetString.freq;
        const targetCents = Math.round(1200 * (Math.log(pitch / targetFreq) / Math.log(2)));
        const clampedCents = Math.max(-50, Math.min(50, targetCents));

        const noteNum = noteFromPitch(targetFreq, a4Reference);
        const noteNameList = useGermanNotation ? NOTE_NAMES_GERMAN : NOTE_NAMES_INTL;
        const noteName = noteNameList[noteNum % 12];

        setDetectedNote(noteName);
        setDetectedOctave(targetString.octave);
        setCentsDeviation(clampedCents);

        // Magnetischer Snap im Sweet-Spot (±3 Cents)
        let effectiveCents = clampedCents;
        if (Math.abs(clampedCents) <= 3) {
          effectiveCents = clampedCents * 0.4;
        }

        smoothedCentsRef.current = smoothedCentsRef.current * 0.72 + effectiveCents * 0.28;
        setSmoothedCents(Math.round(smoothedCentsRef.current * 10) / 10);

        if (Math.abs(clampedCents) <= 3) {
          inTuneFramesRef.current += 1;
          if (inTuneFramesRef.current >= 5) {
            setTunedStrings(prev => {
              if (prev[lockedStringIndex]) return prev;
              playLockInChime();
              return { ...prev, [lockedStringIndex]: true };
            });
          }
        } else {
          inTuneFramesRef.current = 0;
        }
      } else {
        const noteNum = noteFromPitch(pitch, a4Reference);
        const noteNameList = useGermanNotation ? NOTE_NAMES_GERMAN : NOTE_NAMES_INTL;
        const noteName = noteNameList[noteNum % 12];
        const octave = Math.floor(noteNum / 12) - 1;
        const rawCents = centsOffFromPitch(pitch, noteNum, a4Reference);
        const clampedCents = Math.max(-50, Math.min(50, rawCents));

        setDetectedNote(noteName);
        setDetectedOctave(octave);
        setCentsDeviation(clampedCents);

        let effectiveCents = clampedCents;
        if (Math.abs(clampedCents) <= 3) {
          effectiveCents = clampedCents * 0.35;
        }

        smoothedCentsRef.current = smoothedCentsRef.current * 0.72 + effectiveCents * 0.28;
        setSmoothedCents(Math.round(smoothedCentsRef.current * 10) / 10);

        if (Math.abs(clampedCents) <= 3) {
          inTuneFramesRef.current += 1;
          if (inTuneFramesRef.current >= 5 && selectedPreset.strings.length > 0) {
            const bestIdx = selectedPreset.strings.findIndex(
              s => (useGermanNotation ? (s.name === 'B' ? 'H' : s.name) : s.name) === noteName &&
                   Math.abs(s.octave - octave) <= 1
            );
            if (bestIdx !== -1) {
              setTunedStrings(prev => {
                if (prev[bestIdx]) return prev;
                playLockInChime();
                return { ...prev, [bestIdx]: true };
              });
            }
          }
        } else {
          inTuneFramesRef.current = 0;
        }

        if (selectedPreset.strings.length > 0) {
          const bestIdx = selectedPreset.strings.findIndex(
            s => (useGermanNotation ? (s.name === 'B' ? 'H' : s.name) : s.name) === noteName &&
                 Math.abs(s.octave - octave) <= 1
          );
          if (bestIdx !== -1) {
            setSelectedStringIndex(bestIdx);
          }
        }
      }
    } else {
      inTuneFramesRef.current = 0;
      smoothedCentsRef.current = smoothedCentsRef.current * 0.90;
      if (Math.abs(smoothedCentsRef.current) < 0.5) smoothedCentsRef.current = 0;
      setSmoothedCents(Math.round(smoothedCentsRef.current));
    }

    animationFrameRef.current = requestAnimationFrame(updatePitch);
  }, [a4Reference, selectedPreset.strings, lockedStringIndex, useGermanNotation, playLockInChime]);

  // Start Microphone mit 4096-Puffer für Bass/Cello
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

      const isBassOrCello = selectedPresetId.startsWith('bass') || selectedPresetId === 'cello';
      analyser.fftSize = isBassOrCello ? 4096 : 2048;
      analyserRef.current = analyser;

      const biquad = audioCtx.createBiquadFilter();
      biquad.type = 'lowpass';
      biquad.frequency.setValueAtTime(isBassOrCello ? 900 : 1800, audioCtx.currentTime);

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

  useEffect(() => {
    return () => {
      stopListening();
      if (oscRef.current) {
        try {
          oscRef.current.stop();
          oscRef.current.disconnect();
        } catch (e) {}
      }
    };
  }, [stopListening]);

  const isInTune = isListening && detectedPitch !== null && Math.abs(centsDeviation) <= 3;
  const isFlat = isListening && detectedPitch !== null && centsDeviation < -3;
  const isSharp = isListening && detectedPitch !== null && centsDeviation > 3;

  const needleAngle = (smoothedCents / 50) * 60;
  const totalStringsCount = selectedPreset.strings.length;
  const tunedStringsCount = Object.keys(tunedStrings).length;
  const allStringsTuned = totalStringsCount > 0 && tunedStringsCount === totalStringsCount;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      maxWidth: '720px',
      margin: '0 auto',
      width: '100%',
      padding: '0 8px',
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif"
    }}>
      {/* 1. Header Bar: Zurück, Instrument, Kammerton-Kalibrierung & Notation (100% Monochrome) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '0 4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                padding: '7px 12px',
                borderRadius: '12px',
                fontSize: '0.80rem',
                fontWeight: 800,
                color: '#0f172a',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
              title="Zurück zur Übersicht"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onBack(); }}
            >
              <ArrowLeft size={15} />
              <span>Zurück</span>
            </button>
          )}

          {/* Cyan Cover Modul-Badge (Wiedererkennungswert aus dem Aufgabenheft) */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            color: '#ffffff',
            padding: '6px 13px',
            borderRadius: '12px',
            fontSize: '0.80rem',
            fontWeight: 900,
            boxShadow: '0 4px 14px -2px rgba(6, 182, 212, 0.40)',
            letterSpacing: '0.01em'
          }}>
            <Radio size={14} color="#ffffff" strokeWidth={2.4} />
            <span>Stimmgerät</span>
          </div>

          {/* Instrumenten-Selektor */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select
              value={selectedPresetId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedPresetId(nextId);
                setSelectedStringIndex(null);
                setLockedStringIndex(null);
                setTunedStrings({});
                try {
                  localStorage.setItem('campus_tuner_last_preset', nextId);
                } catch (err) {}
                if (playingToneFreq !== null) playTone(null);
              }}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '14px',
                padding: '8px 34px 8px 14px',
                fontSize: '0.86rem',
                fontWeight: 850,
                color: '#0f172a',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                outline: 'none',
                transition: 'all 0.15s ease'
              }}
              title="Instrument auswählen"
            >
              {INSTRUMENT_PRESETS.map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              style={{ position: 'absolute', right: '12px', pointerEvents: 'none', color: '#64748b' }}
            />
          </div>

          {/* Deutsche H / B Noten-Nomenklatur Umschalter mit Cyan-Akzent */}
          <button
            type="button"
            onClick={() => setUseGermanNotation(prev => !prev)}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              border: useGermanNotation ? '1.5px solid #06b6d4' : '1.5px solid #e2e8f0',
              background: useGermanNotation ? 'rgba(6, 182, 212, 0.08)' : '#ffffff',
              color: useGermanNotation ? '#0891b2' : '#0f172a',
              fontSize: '0.76rem',
              fontWeight: 850,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
            title="Zwischen deutscher H-Notation und internationaler B-Notation umschalten"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setUseGermanNotation(p => !p); }}
          >
            <span>{useGermanNotation ? 'Notation: H' : 'Notation: B'}</span>
          </button>
        </div>

        {/* Rechte Controls: Kammerton-Stepper (+/-) & Mikrofon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Kammerton-Kalibrierungs-Stepper [ - ] 440 Hz [ + ] */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#ffffff',
            border: a4Reference !== 440 ? '1.5px solid #06b6d4' : '1.5px solid #e2e8f0',
            borderRadius: '14px',
            padding: '2px 4px',
            boxShadow: a4Reference !== 440 ? '0 2px 8px rgba(6, 182, 212, 0.20)' : '0 2px 5px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease'
          }}>
            <button
              type="button"
              disabled={a4Reference <= 430}
              onClick={() => {
                setA4Reference(prev => Math.max(430, prev - 1));
                if (playingToneFreq !== null) playTone(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: a4Reference <= 430 ? '#cbd5e1' : '#0f172a',
                cursor: a4Reference <= 430 ? 'default' : 'pointer',
                padding: '4px 6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              className="hover-scale"
              title="Kammerton um 1 Hz verringern (Min. 430 Hz)"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setA4Reference(p => Math.max(430, p - 1)); }}
            >
              <Minus size={13} strokeWidth={2.5} />
            </button>

            <button
              type="button"
              onClick={toggleReferenceTone}
              style={{
                background: isPlayingReference ? '#0f172a' : 'transparent',
                border: 'none',
                color: isPlayingReference ? '#ffffff' : '#0f172a',
                fontWeight: 900,
                fontSize: '0.78rem',
                padding: '4px 8px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              className="hover-scale"
              title={isPlayingReference ? 'Kammerton stoppen' : `Kammerton (${a4Reference} Hz) hören`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleReferenceTone(); }}
            >
              {isPlayingReference ? <VolumeX size={13} /> : <Volume2 size={13} />}
              <span>{a4Reference} Hz</span>
            </button>

            <button
              type="button"
              disabled={a4Reference >= 450}
              onClick={() => {
                setA4Reference(prev => Math.min(450, prev + 1));
                if (playingToneFreq !== null) playTone(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: a4Reference >= 450 ? '#cbd5e1' : '#0f172a',
                cursor: a4Reference >= 450 ? 'default' : 'pointer',
                padding: '4px 6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              className="hover-scale"
              title="Kammerton um 1 Hz erhöhen (Max. 450 Hz)"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setA4Reference(p => Math.min(450, p + 1)); }}
            >
              <Plus size={13} strokeWidth={2.5} />
            </button>

            {/* 1-Tap Reset Button, falls abweichend von 440 Hz */}
            {a4Reference !== 440 && (
              <button
                type="button"
                onClick={() => setA4Reference(440)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '0.64rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  marginLeft: '2px'
                }}
                className="hover-scale"
                title="1-Tap Reset auf 440 Hz Standard"
              >
                Reset
              </button>
            )}
          </div>

          {/* Mikrofon Toggle */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '14px',
              border: 'none',
              background: isListening
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: isListening
                ? '0 4px 14px rgba(239, 68, 68, 0.28)'
                : '0 4px 14px rgba(34, 197, 94, 0.28)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="hover-scale"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (isListening) stopListening(); else startListening(); } }}
          >
            {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            <span>{isListening ? 'Stop' : 'Stimmen'}</span>
          </button>
        </div>
      </div>

      {/* Fehler-Meldung */}
      {micError && (
        <div style={{
          background: '#fef2f2',
          border: '1.5px solid #fecaca',
          borderRadius: '14px',
          padding: '10px 14px',
          color: '#b91c1c',
          fontSize: '0.82rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{micError}</span>
        </div>
      )}

      {/* 2. Hero Card: Der Didaktische Stimm-Bogen (Arc Meter) mit Smaragd-Aura Snap & Cyan Identität */}
      <div style={{
        background: '#ffffff',
        border: isInTune
          ? '2px solid #22c55e'
          : isListening
          ? '1.5px solid #06b6d4'
          : '1.5px solid #e2e8f0',
        borderRadius: '24px',
        padding: '24px 20px 20px 20px',
        boxShadow: isInTune
          ? '0 16px 48px -6px rgba(34, 197, 94, 0.30), 0 0 28px rgba(34, 197, 94, 0.20)'
          : isListening
          ? '0 12px 36px -4px rgba(6, 182, 212, 0.18), 0 2px 8px rgba(6, 182, 212, 0.08)'
          : '0 10px 28px -4px rgba(0, 0, 0, 0.04), 0 2px 6px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden'
      }}>
        {/* Erfolgs-Banner bei vollendetem Stimmen */}
        {allStringsTuned && (
          <div style={{
            position: 'absolute',
            top: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            padding: '4px 14px',
            borderRadius: '99px',
            fontSize: '0.74rem',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            animation: 'pulse 1.8s infinite',
            zIndex: 10
          }}>
            <Sparkles size={13} />
            <span>Alle Saiten perfekt gestimmt!</span>
          </div>
        )}

        {/* Feature 4: Target-Lock Badge (Saiten-Anpinnen aktiv) */}
        {lockedStringIndex !== null && selectedPreset.strings[lockedStringIndex] && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '16px',
            background: '#f8fafc',
            border: '1.5px solid #cbd5e1',
            color: '#0f172a',
            padding: '3px 10px',
            borderRadius: '10px',
            fontSize: '0.72rem',
            fontWeight: 850,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            zIndex: 10
          }}>
            <Lock size={11} strokeWidth={2.5} />
            <span>
              Ziel: {selectedPreset.strings[lockedStringIndex].label} ({selectedPreset.strings[lockedStringIndex].freq} Hz)
            </span>
            <button
              type="button"
              onClick={() => setLockedStringIndex(null)}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#0f172a',
                fontSize: '0.62rem',
                fontWeight: 900,
                cursor: 'pointer',
                padding: '1px 5px',
                marginLeft: '4px'
              }}
              title="Target-Lock aufheben und zu automatischer Saitenerkennung zurückkehren"
            >
              Auto
            </button>
          </div>
        )}

        {/* SVG Bogen-Kompass (Arc Gauge) */}
        <div style={{
          position: 'relative',
          width: '260px',
          height: '135px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: allStringsTuned ? '8px' : '0px'
        }}>
          <svg
            viewBox="0 0 260 135"
            width="260"
            height="135"
            style={{ overflow: 'visible' }}
          >
            {/* Hintergrund-Bogen */}
            <path
              d="M 47.7 72.5 A 95 95 0 0 1 212.3 72.5"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="8"
              strokeLinecap="round"
            />

            {/* In-Tune Sweet-Spot Segment (-3° bis +3°) mit Smaragd-Glow */}
            <path
              d="M 125 25.1 A 95 95 0 0 1 135 25.1"
              fill="none"
              stroke={isInTune ? '#16a34a' : '#22c55e'}
              strokeWidth={isInTune ? '11' : '8'}
              strokeLinecap="round"
              style={{
                transition: 'stroke-width 0.2s ease, stroke 0.2s ease',
                filter: isInTune ? 'drop-shadow(0 0 8px rgba(34,197,94,0.9))' : 'none'
              }}
            />

            {/* Hilfs-Ticks für Skalen-Orientierung */}
            {[-50, -25, 0, 25, 50].map((ct) => {
              const rad = ((ct / 50) * 60 - 90) * (Math.PI / 180);
              const rInner = 82;
              const rOuter = ct === 0 ? 106 : 98;
              const x1 = 130 + rInner * Math.cos(rad);
              const y1 = 120 + rInner * Math.sin(rad);
              const x2 = 130 + rOuter * Math.cos(rad);
              const y2 = 120 + rOuter * Math.sin(rad);
              const isCenter = ct === 0;

              return (
                <line
                  key={ct}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isCenter ? (isInTune ? '#16a34a' : '#0f172a') : '#94a3b8'}
                  strokeWidth={isCenter ? 2.5 : 1.5}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Nadel mit magnetischem Dämpfungs-Gleitverhalten */}
            {isListening && detectedPitch !== null && (
              <g
                style={{
                  transformOrigin: '130px 120px',
                  transform: `rotate(${needleAngle}deg)`,
                  transition: 'transform 0.08s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <line
                  x1="130"
                  y1="120"
                  x2="130"
                  y2="20"
                  stroke={isInTune ? '#16a34a' : isFlat ? '#d97706' : '#ea580c'}
                  strokeWidth={isInTune ? '4.5' : '3'}
                  strokeLinecap="round"
                  style={{
                    filter: isInTune
                      ? 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.95))'
                      : 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))'
                  }}
                />
                <circle
                  cx="130"
                  cy="20"
                  r={isInTune ? '6' : '4.5'}
                  fill={isInTune ? '#16a34a' : isFlat ? '#d97706' : '#ea580c'}
                />
              </g>
            )}

            {/* Nadel-Drehpunkt */}
            <circle cx="130" cy="120" r="4.5" fill="#0f172a" />
          </svg>
        </div>

        {/* 3. Notenständer-HUD: Riesen-Note mit Richtungs-Hilfe */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '-10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{
              fontSize: '4.4rem',
              fontWeight: 950,
              color: isInTune
                ? '#16a34a'
                : isListening && detectedPitch !== null
                ? '#0f172a'
                : '#cbd5e1',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              textShadow: isInTune ? '0 0 28px rgba(34, 197, 94, 0.45)' : 'none',
              transition: 'color 0.2s ease, text-shadow 0.2s ease'
            }}>
              {detectedNote}
            </span>
            {detectedOctave !== null && isListening && (
              <span style={{
                fontSize: '1.8rem',
                fontWeight: 850,
                color: isInTune ? '#22c55e' : '#94a3b8',
                lineHeight: 1
              }}>
                {detectedOctave}
              </span>
            )}
          </div>

          {/* Richtungs-Hinweis für Schüler (▲ FESTER / ▼ LOCKERER / ✓ PERFEKT) */}
          <div style={{ minHeight: '32px', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isListening && detectedPitch !== null ? (
              isInTune ? (
                <div style={{
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  color: '#15803d',
                  padding: '3px 12px',
                  borderRadius: '99px',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 10px rgba(34, 197, 94, 0.20)'
                }}>
                  <Check size={14} strokeWidth={3} />
                  <span>Perfekt gestimmt!</span>
                </div>
              ) : isFlat ? (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#b45309',
                  padding: '3px 12px',
                  borderRadius: '99px',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <ArrowUp size={13} strokeWidth={3} />
                  <span>Fester drehen ({centsDeviation} ct)</span>
                </div>
              ) : (
                <div style={{
                  background: '#ffedd5',
                  border: '1px solid #fed7aa',
                  color: '#c2410c',
                  padding: '3px 12px',
                  borderRadius: '99px',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <ArrowDown size={13} strokeWidth={3} />
                  <span>Lockerer drehen (+{centsDeviation} ct)</span>
                </div>
              )
            ) : isListening ? (
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
                Spiele eine Saite an...
              </span>
            ) : (
              <button
                type="button"
                onClick={startListening}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '4px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                className="hover-scale"
              >
                <Mic size={13} />
                <span>Mikrofon aktivieren</span>
              </button>
            )}
          </div>

          {/* Frequenz-Anzeige */}
          {uiLevel !== 'junior' && detectedPitch && isListening && (
            <div style={{
              marginTop: '4px',
              fontSize: '0.74rem',
              fontWeight: 750,
              color: '#64748b',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {detectedPitch.toFixed(1)} Hz (Ref: {a4Reference} Hz)
            </div>
          )}
        </div>

        {/* 4. Saiten-Roadmap mit Target-Locking & Checkliste (100% Monochrome Icons) */}
        {selectedPreset.strings.length > 0 && (
          <div style={{
            width: '100%',
            maxWidth: '480px',
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            {/* Status-Zeile mit Tipp */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0 4px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#64748b'
            }}>
              <span>
                {tunedStringsCount > 0
                  ? `${tunedStringsCount} von ${totalStringsCount} Saiten gestimmt`
                  : 'Tipp: Klicke eine Saite an zum Feststellen (Target-Lock):'}
              </span>
              {tunedStringsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setTunedStrings({})}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '0.70rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '6px'
                  }}
                  className="hover-scale"
                  title="Alle gestimmten Saiten zurücksetzen"
                >
                  <RotateCcw size={11} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Horizontale Saiten-Pills */}
            <div style={{
              display: 'flex',
              gap: '6px',
              width: '100%',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              {selectedPreset.strings.map((str, idx) => {
                const isSelected = selectedStringIndex === idx;
                const isLocked = lockedStringIndex === idx;
                const isTuned = !!tunedStrings[idx];
                const isPegPlaying = playingToneFreq === str.freq;

                const displayName = useGermanNotation && str.name === 'B' ? 'H' : str.name;
                const displayLabel = useGermanNotation && str.germanLabel ? str.germanLabel : (str.label || `${str.freq} Hz`);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (lockedStringIndex === idx) {
                        setLockedStringIndex(null);
                      } else {
                        setLockedStringIndex(idx);
                        setSelectedStringIndex(idx);
                      }
                      playTone(str.freq);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '64px',
                      padding: '10px 12px',
                      borderRadius: '14px',
                      border: isLocked
                        ? '2px solid #0891b2'
                        : isTuned
                        ? '1.5px solid #10b981'
                        : isSelected
                        ? '1.5px solid #06b6d4'
                        : isPegPlaying
                        ? '1.5px solid #0891b2'
                        : '1.5px solid #e2e8f0',
                      background: isLocked
                        ? 'rgba(6, 182, 212, 0.14)'
                        : isTuned
                        ? '#ecfdf5'
                        : isSelected
                        ? 'rgba(6, 182, 212, 0.07)'
                        : isPegPlaying
                        ? 'rgba(6, 182, 212, 0.10)'
                        : '#f8fafc',
                      color: isLocked
                        ? '#0891b2'
                        : isTuned
                        ? '#065f46'
                        : isSelected
                        ? '#0e7490'
                        : '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isLocked
                        ? '0 3px 10px rgba(6, 182, 212, 0.25)'
                        : isTuned
                        ? '0 2px 6px rgba(16, 185, 129, 0.2)'
                        : isSelected
                        ? '0 2px 8px rgba(6, 182, 212, 0.18)'
                        : 'none',
                      outline: 'none'
                    }}
                    className="hover-scale"
                    title={`${displayName}${str.octave} (${str.freq} Hz) • Klick: Target-Lock / Vorhören`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        if (lockedStringIndex === idx) setLockedStringIndex(null);
                        else { setLockedStringIndex(idx); setSelectedStringIndex(idx); }
                        playTone(str.freq);
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                        {displayName}{str.octave}
                      </span>
                      {isTuned && <Check size={11} strokeWidth={3.5} />}
                      {isLocked && <Lock size={10} strokeWidth={2.5} />}
                    </div>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 750,
                      color: isLocked ? '#0f172a' : isTuned ? '#047857' : '#64748b',
                      marginTop: '1px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}>
                      {isPegPlaying ? (
                        <>
                          <Volume2 size={9} />
                          <span>Ton</span>
                        </>
                      ) : (
                        displayLabel
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
