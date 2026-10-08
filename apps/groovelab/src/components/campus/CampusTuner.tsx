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
  transpositionOffset?: number;
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
    name: 'Konzertstimmung (C) / Klavier',
    shortLabel: 'Chromatisch (C)',
    strings: [],
    transpositionOffset: 0
  },
  {
    id: 'trumpet_bb',
    name: 'Trompete / Klarinette (Bb)',
    shortLabel: 'Trompete (Bb)',
    strings: [],
    transpositionOffset: 2
  },
  {
    id: 'alto_sax_eb',
    name: 'Altsaxophon (Eb)',
    shortLabel: 'Altsax (Eb)',
    strings: [],
    transpositionOffset: 9
  },
  {
    id: 'tenor_sax_bb',
    name: 'Tenorsaxophon / Bassklarinette (Bb Tief)',
    shortLabel: 'Tenorsax (Bb)',
    strings: [],
    transpositionOffset: 14
  },
  {
    id: 'bari_sax_eb',
    name: 'Baritonsaxophon (Eb Tief)',
    shortLabel: 'Barisax (Eb)',
    strings: [],
    transpositionOffset: 21
  },
  {
    id: 'horn_f',
    name: 'Waldhorn (F)',
    shortLabel: 'Horn (F)',
    strings: [],
    transpositionOffset: 7
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

import { YinAudioWorkletEngine } from '../../services/audio/YinAudioWorkletEngine';

function noteFromPitch(frequency: number, a4: number = 440) {
  const noteNum = 12 * (Math.log(frequency / a4) / Math.log(2));
  return Math.round(noteNum) + 69;
}

function frequencyFromNoteNumber(note: number, a4: number = 440) {
  return a4 * Math.pow(2, (note - 69) / 12);
}

function centsOffFromPitch(frequency: number, note: number, a4: number = 440) {
  return Math.round((1200 * Math.log(frequency / frequencyFromNoteNumber(note, a4))) / Math.log(2));
}

// 🌟 0,1% Goldstandard: Akustische Harmonische & Saiten-Matching Engine
// Erkennt Saiten auch bei schwachem Grundton (z.B. MacBook-Mikrofon dämpft tiefe E-Saite bei 82 Hz)
function findMatchingStringIndex(
  noteName: string,
  octave: number,
  pitch: number,
  presetStrings: TuningString[],
  useGerman: boolean
): number {
  if (!presetStrings || presetStrings.length === 0) return -1;

  // 1. Exakter Match (Notenname + Oktave)
  const exactIdx = presetStrings.findIndex(s => {
    const sName = useGerman ? (s.name === 'B' ? 'H' : s.name) : s.name;
    return sName === noteName && s.octave === octave;
  });
  if (exactIdx !== -1) return exactIdx;

  // 2. Harmonische / Oktav-Tolerante Zuordnung
  const candidates = presetStrings
    .map((s, idx) => ({ s, idx }))
    .filter(({ s }) => {
      const sName = useGerman ? (s.name === 'B' ? 'H' : s.name) : s.name;
      return sName === noteName;
    });

  if (candidates.length === 1) {
    // Eindeutige Saite (z.B. A2, D3, G3, H3) - es gibt nur eine einzige Saite mit diesem Namen!
    return candidates[0].idx;
  }

  if (candidates.length > 1) {
    // Mehrere Saiten mit gleichem Namen (z.B. tiefe E2 vs. hohe E4 bei der Gitarre)
    let bestIdx = -1;
    let minDiff = Infinity;
    for (const { s, idx } of candidates) {
      const diff1 = Math.abs(pitch - s.freq);
      const diff2 = Math.abs(pitch - s.freq * 2);
      const effectiveDiff = Math.min(diff1, diff2);
      if (effectiveDiff < minDiff) {
        minDiff = effectiveDiff;
        bestIdx = idx;
      }
    }
    return bestIdx;
  }

  return -1;
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
  const [a4Reference, setA4Reference] = useState<number>(440);
  const [isPlayingReference, setIsPlayingReference] = useState<boolean>(false);
  const [playingToneFreq, setPlayingToneFreq] = useState<number | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [useGermanNotation, setUseGermanNotation] = useState<boolean>(true);
  const [lockedStringIndex, setLockedStringIndex] = useState<number | null>(null);

  // Live Detektierte Werte
  const [detectedPitch, setDetectedPitch] = useState<number | null>(null);
  const [detectedNote, setDetectedNote] = useState<string>('--');
  const [detectedOctave, setDetectedOctave] = useState<number | null>(null);
  const [actualNoteHint, setActualNoteHint] = useState<string | null>(null);
  const [centsDeviation, setCentsDeviation] = useState<number>(0);

  // 🌟 Feature 5: Glättungs-Filter für Nadel-Physik & Magnetischer Snap
  const smoothedCentsRef = useRef<number>(0);
  const velocityCentsRef = useRef<number>(0);
  const [smoothedCents, setSmoothedCents] = useState<number>(0);

  const [tunedStrings, setTunedStrings] = useState<Record<number, boolean>>({});

  const engineRef = useRef<YinAudioWorkletEngine | null>(null);
  const uiAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const audioSessionIdRef = useRef<number>(0);

  const selectedPreset = INSTRUMENT_PRESETS.find(p => p.id === selectedPresetId) || INSTRUMENT_PRESETS[0];

  // Stop Microphone & Hardware Teardown
  const stopListening = useCallback(() => {
    audioSessionIdRef.current++;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      releaseAudioStream(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    if (uiAudioContextRef.current && uiAudioContextRef.current.state !== 'closed') {
      try {
        uiAudioContextRef.current.close();
      } catch (err) {}
      uiAudioContextRef.current = null;
    }
    setIsListening(false);
    setDetectedPitch(null);
    setDetectedNote('--');
    setDetectedOctave(null);
    setCentsDeviation(0);
    smoothedCentsRef.current = 0;
    velocityCentsRef.current = 0;
    setSmoothedCents(0);
  }, []);

  // Zweistufiger Sinus-Chime (880Hz -> 1760Hz) bei erfolgreichem Stimmen
  const playLockInChime = useCallback(() => {
    try {
      let ctx = uiAudioContextRef.current;
      if (!ctx || ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        ctx = new AudioCtx();
        uiAudioContextRef.current = ctx;
      }
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
      let audioCtx = uiAudioContextRef.current;
      if (!audioCtx || audioCtx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioCtx();
        uiAudioContextRef.current = audioCtx;
      }
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
    if (!engineRef.current) return;

    // 🌟 YIN AudioWorklet Pitch Detection (Zero-GC, lock-free)
    const pitch = engineRef.current.getDetectedPitch();

    if (pitch !== -1 && pitch > 20 && pitch < 2200) {
      const roundedPitch = Math.round(pitch * 10) / 10;
      setDetectedPitch(roundedPitch);

      if (lockedStringIndex !== null && selectedPreset.strings[lockedStringIndex]) {
        const targetString = selectedPreset.strings[lockedStringIndex];
        const targetCents = Math.round(1200 * (Math.log(pitch / targetString.freq) / Math.log(2)));
        const clampedCents = Math.max(-50, Math.min(50, targetCents));

        const noteNum = noteFromPitch(targetString.freq, a4Reference);
        const noteNameList = useGermanNotation ? NOTE_NAMES_GERMAN : NOTE_NAMES_INTL;
        const noteName = noteNameList[noteNum % 12];

        setDetectedNote(noteName);
        setDetectedOctave(targetString.octave);
        setCentsDeviation(clampedCents);

        // Magnetischer Snap im Sweet-Spot (±3 Cents)
        let targetCentsPhys = clampedCents;
        if (Math.abs(clampedCents) <= 3) {
          targetCentsPhys = clampedCents * 0.1; // Starker magnetischer Snap zur 0
        }

        // 🌟 0,1% Goldstandard: Kritisch gedämpfte Masse-Feder-Gleichung (Schwere, langsame Nadel)
        // stiffness (Federkonstante): Sehr niedrig (0.04), die Nadel ist träge und fühlt sich wie ein schweres analoges Bauteil an.
        // damping (Dämpfung): Hoch (0.40 = 2 * sqrt(0.04)), verhindert jegliches Überschießen (Critical Damping).
        const stiffness = 0.04;
        const damping = 0.40;
        const force = stiffness * (targetCentsPhys - smoothedCentsRef.current) - damping * velocityCentsRef.current;
        velocityCentsRef.current += force;
        smoothedCentsRef.current += velocityCentsRef.current;

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
        // 🌟 Transposition anwenden: Wir verschieben die erkannte MIDI-Note um den Offset des Presets
        const physicalNoteNum = noteFromPitch(pitch, a4Reference);
        const activeOffset = selectedPreset.transpositionOffset || 0;
        const transposedNoteNum = physicalNoteNum + activeOffset;
        
        const noteNameList = useGermanNotation ? NOTE_NAMES_GERMAN : NOTE_NAMES_INTL;
        const noteName = noteNameList[transposedNoteNum % 12 < 0 ? (transposedNoteNum % 12) + 12 : transposedNoteNum % 12];
        const octave = Math.floor(transposedNoteNum / 12) - 1;
        const rawCents = centsOffFromPitch(pitch, physicalNoteNum, a4Reference);
        const clampedCents = Math.max(-50, Math.min(50, rawCents));

        setDetectedNote(noteName);
        setDetectedOctave(octave);
        setCentsDeviation(clampedCents);

        let targetCentsPhys = clampedCents;
        if (Math.abs(clampedCents) <= 3) {
          targetCentsPhys = clampedCents * 0.1;
        }

        // 🌟 0,1% Goldstandard: Kritisch gedämpfte Masse-Feder-Gleichung (Schwere, langsame Nadel)
        // stiffness (Federkonstante): Sehr niedrig (0.04), die Nadel ist träge und fühlt sich wie ein schweres analoges Bauteil an.
        // damping (Dämpfung): Hoch (0.40 = 2 * sqrt(0.04)), verhindert jegliches Überschießen (Critical Damping).
        const stiffness = 0.04;
        const damping = 0.40;
        const force = stiffness * (targetCentsPhys - smoothedCentsRef.current) - damping * velocityCentsRef.current;
        velocityCentsRef.current += force;
        smoothedCentsRef.current += velocityCentsRef.current;

        setSmoothedCents(Math.round(smoothedCentsRef.current * 10) / 10);

        if (Math.abs(clampedCents) <= 3) {
          inTuneFramesRef.current += 1;
          if (inTuneFramesRef.current >= 5 && selectedPreset.strings.length > 0) {
            const bestIdx = findMatchingStringIndex(noteName, octave, pitch, selectedPreset.strings, useGermanNotation);
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
            const bestIdx = findMatchingStringIndex(noteName, octave, pitch, selectedPreset.strings, useGermanNotation);
          if (bestIdx !== -1) {
            setSelectedStringIndex(bestIdx);
          }
        }
      }
    } else {
      inTuneFramesRef.current = 0;
      smoothedCentsRef.current = smoothedCentsRef.current * 0.90;
      if (Math.abs(smoothedCentsRef.current) < 0.5) smoothedCentsRef.current = 0;
    velocityCentsRef.current = 0;
      setSmoothedCents(Math.round(smoothedCentsRef.current));
    }

    animationFrameRef.current = requestAnimationFrame(updatePitch);
  }, [a4Reference, selectedPreset.strings, lockedStringIndex, useGermanNotation, playLockInChime]);

  // Start Microphone mit 4096-Puffer für Bass/Cello
  const startListening = async () => {
    setMicError(null);
    const sessionId = ++audioSessionIdRef.current;
    try {
      const stream = await acquireAudioStream({
        audio: {
          echoCancellation: false,
          autoGainControl: true,
          noiseSuppression: false
        }
      });
      if (sessionId !== audioSessionIdRef.current) {
        releaseAudioStream(stream);
        return;
      }
      mediaStreamRef.current = stream;

      const engine = new YinAudioWorkletEngine();
      await engine.initialize();

      if (sessionId !== audioSessionIdRef.current) {
        engine.destroy();
        if (mediaStreamRef.current) {
          releaseAudioStream(mediaStreamRef.current);
          mediaStreamRef.current = null;
        }
        return;
      }

      const isBassOrCello = selectedPresetId.startsWith('bass') || selectedPresetId === 'cello';
      engine.connectMicrophone(stream, isBassOrCello ? 400 : 1800);

      engineRef.current = engine;

      setIsListening(true);
      animationFrameRef.current = requestAnimationFrame(updatePitch);
    } catch (err: any) {
      if (sessionId === audioSessionIdRef.current) {
        console.error('Microphone access failed in CampusTuner:', err);
        setMicError('Mikrofonzugriff wurde verweigert oder ist nicht verfügbar.');
        setIsListening(false);
      }
    }
  };

  // Dynamische Tiefpassfilter-Nachführung bei Instrumentenwechsel im laufenden Betrieb
  useEffect(() => {
    if (engineRef.current && isListening) {
      const isBassOrCello = selectedPresetId.startsWith('bass') || selectedPresetId === 'cello';
      engineRef.current.setLowpassCutoff(isBassOrCello ? 400 : 1800);
    }
  }, [selectedPresetId, isListening]);

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
      gap: '18px',
      maxWidth: '980px',
      margin: '0 auto',
      width: '100%',
      padding: '0 12px',
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
            boxShadow: 'none',
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
            boxShadow: 'none',
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
                : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: 'none',
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
        borderRadius: '28px',
        padding: '36px 24px 28px 24px',
        boxShadow: 'none',
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
            boxShadow: 'none',
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
          width: '100%',
          maxWidth: '440px',
          height: '220px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: allStringsTuned ? '8px' : '0px'
        }}>
          {/* MONOPHONE NADEL */}
            <svg
            viewBox="0 0 440 220"
            width="100%"
            height="100%"
            style={{ 
              overflow: 'visible', 
              maxWidth: '440px'
            }}
          >
            <path
              d="M 81.4 120 A 160 160 0 0 1 358.6 120"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* In-Tune Sweet-Spot Segment (-3.6° bis +3.6°, ca. ±3 ct) mit Smaragd-Glow */}
            <path
              d="M 210 40.3 A 160 160 0 0 1 230 40.3"
              fill="none"
              stroke={isInTune ? '#16a34a' : '#22c55e'}
              strokeWidth={isInTune ? '14' : '10'}
              strokeLinecap="round"
              style={{
                transition: 'stroke-width 0.2s ease, stroke 0.2s ease',
                filter: isInTune ? 'drop-shadow(0 0 14px rgba(34,197,94,0.95))' : 'none'
              }}
            />

            {/* Hilfs-Ticks für Skalen-Orientierung (-50, -25, -10, 0, 10, 25, 50 ct) */}
            {[-50, -25, -10, 0, 10, 25, 50].map((ct) => {
              const rad = ((ct / 50) * 60 - 90) * (Math.PI / 180);
              const isCenter = ct === 0;
              const isMajor = Math.abs(ct) === 50 || Math.abs(ct) === 25 || isCenter;
              const rInner = 142;
              const rOuter = isCenter ? 180 : isMajor ? 172 : 166;
              const x1 = 220 + rInner * Math.cos(rad);
              const y1 = 200 + rInner * Math.sin(rad);
              const x2 = 220 + rOuter * Math.cos(rad);
              const y2 = 200 + rOuter * Math.sin(rad);

              return (
                <line
                  key={ct}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isCenter ? (isInTune ? '#16a34a' : '#0f172a') : isMajor ? '#94a3b8' : '#cbd5e1'}
                  strokeWidth={isCenter ? 3.5 : isMajor ? 2.5 : 1.5}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Skalen-Labels für ♭ / 0 / ♯ */}
            <text x="56" y="112" fill="#94a3b8" fontSize="12" fontWeight="800" textAnchor="middle">♭ -50</text>
            <text x="220" y="16" fill={isInTune ? '#16a34a' : '#64748b'} fontSize="11" fontWeight="900" textAnchor="middle">PERFEKT (0)</text>
            <text x="384" y="112" fill="#94a3b8" fontSize="12" fontWeight="800" textAnchor="middle">+50 ♯</text>

            {/* Nadel mit magnetischem Dämpfungs-Gleitverhalten */}
            {isListening && detectedPitch !== null && (
              <g
                style={{
                  transformOrigin: '220px 200px',
                  transform: `rotate(${needleAngle}deg)`
                }}
              >
                <line
                  x1="220"
                  y1="200"
                  x2="220"
                  y2="34"
                  stroke={isInTune ? '#16a34a' : isFlat ? '#d97706' : '#ea580c'}
                  strokeWidth={isInTune ? '5.5' : '4'}
                  strokeLinecap="round"
                  style={{
                    filter: isInTune
                      ? 'drop-shadow(0 0 14px rgba(34, 197, 94, 0.95))'
                      : 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))'
                  }}
                />
                <circle
                  cx="220"
                  cy="34"
                  r={isInTune ? '7.5' : '6'}
                  fill={isInTune ? '#16a34a' : isFlat ? '#d97706' : '#ea580c'}
                />
              </g>
            )}

            {/* Nadel-Drehpunkt (Zentrum) */}
            <circle cx="220" cy="200" r="7" fill="#0f172a" />
            <circle cx="220" cy="200" r="3" fill="#94a3b8" />
          </svg>
        </div>

        {/* 3. Notenständer-HUD: Monumentale Note mit Richtungs-Hilfe */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '-6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{
              fontSize: 'clamp(5.2rem, 12vw, 7.2rem)',
              fontWeight: 950,
              color: isInTune
                ? '#16a34a'
                : isListening && detectedPitch !== null
                ? '#0f172a'
                : '#cbd5e1',
              letterSpacing: '-0.05em',
              lineHeight: 1,
              textShadow: isInTune
                ? '0 0 40px rgba(34, 197, 94, 0.55), 0 0 80px rgba(34, 197, 94, 0.25)'
                : 'none',
              transition: 'color 0.2s ease, text-shadow 0.2s ease'
            }}>
              {detectedNote}
            </span>
            {detectedOctave !== null && isListening && (
              <span style={{
                fontSize: '2.5rem',
                fontWeight: 900,
                color: isInTune ? '#22c55e' : '#64748b',
                lineHeight: 1
              }}>
                {detectedOctave}
              </span>
            )}
          </div>

          {/* Richtungs-Hinweis für Schüler (▲ FESTER / ▼ LOCKERER / ✓ PERFEKT) & Hero-CTA */}
          <div style={{ minHeight: '52px', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isListening && detectedPitch !== null ? (
              isInTune ? (
                <div style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '7px 20px',
                  borderRadius: '99px',
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: 'none'
                }}>
                  <Check size={18} strokeWidth={3} />
                  <span>Perfekt gestimmt! (±0 ct)</span>
                </div>
              ) : isFlat ? (
                <div style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: '1.5px solid #fcd34d',
                  color: '#b45309',
                  padding: '7px 20px',
                  borderRadius: '99px',
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  boxShadow: 'none'
                }}>
                  <ArrowUp size={17} strokeWidth={3} />
                  <span>Fester drehen ({centsDeviation} ct)</span>
                </div>
              ) : (
                <div style={{
                  background: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)',
                  border: '1.5px solid #fdba74',
                  color: '#c2410c',
                  padding: '7px 20px',
                  borderRadius: '99px',
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  boxShadow: 'none'
                }}>
                  <ArrowDown size={17} strokeWidth={3} />
                  <span>Lockerer drehen (+{centsDeviation} ct)</span>
                </div>
              )
            ) : isListening ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '99px'
              }}>
                <Radio size={15} color="#06b6d4" className="animate-pulse" />
                <span style={{ fontSize: '0.90rem', fontWeight: 800, color: '#475569' }}>
                  Spiele eine Saite an...
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={startListening}
                style={{
                  background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '13px 28px',
                  fontSize: '1.02rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  minHeight: '52px'
                }}
                className="hover-scale"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') startListening(); }}
                title="Mikrofon einschalten und Stimmen starten"
              >
                <Mic size={20} strokeWidth={2.5} />
                <span>Mikrofon aktivieren & Stimmen</span>
              </button>
            )}
          </div>

          {/* Frequenz-Anzeige */}
          {uiLevel !== 'junior' && detectedPitch && isListening && (
            <div style={{
              marginTop: '6px',
              fontSize: '0.84rem',
              fontWeight: 800,
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
            maxWidth: '780px',
            marginTop: '22px',
            paddingTop: '18px',
            borderTop: '1.5px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            {/* Status-Zeile mit Tipp & Reset */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0 6px',
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#64748b'
            }}>
              <span>
                {tunedStringsCount > 0
                  ? `${tunedStringsCount} von ${totalStringsCount} Saiten gestimmt`
                  : 'Tipp: Klicke eine Saite an zum Feststellen (Target-Lock) oder Vorhören:'}
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
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '8px'
                  }}
                  className="hover-scale"
                  title="Alle gestimmten Saiten zurücksetzen"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Horizontale Saiten-Kacheln (78×84px Squircle Touch Tiles) */}
            <div style={{
              display: 'flex',
              gap: '8px',
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
                        if (isPegPlaying) playTone(null);
                      } else {
                        setLockedStringIndex(idx);
                        setSelectedStringIndex(idx);
                        playTone(str.freq);
                      }
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '78px',
                      minHeight: '84px',
                      padding: '12px 14px',
                      borderRadius: '18px',
                      border: isLocked
                        ? '2px solid #0891b2'
                        : isTuned
                        ? '2px solid #10b981'
                        : isSelected
                        ? '2px solid #06b6d4'
                        : isPegPlaying
                        ? '2px solid #0891b2'
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
                        : '#1e293b',
                      cursor: 'pointer',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: 'none',
                      outline: 'none',
                      touchAction: 'manipulation'
                    }}
                    className="hover-scale"
                    title={`${displayName}${str.octave} (${str.freq} Hz) • Klick: Target-Lock / Vorhören`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault(); // Verhindere Scrollen bei Leertaste
                        if (lockedStringIndex === idx) {
                          setLockedStringIndex(null);
                          if (isPegPlaying) playTone(null);
                        } else {
                          setLockedStringIndex(idx);
                          setSelectedStringIndex(idx);
                          playTone(str.freq);
                        }
                      }
                    }}
                  >
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      color: isLocked ? '#0891b2' : isTuned ? '#059669' : '#94a3b8',
                      marginBottom: '2px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {idx + 1}. Saite
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                        {displayName}{str.octave}
                      </span>
                      {isTuned && <Check size={14} strokeWidth={3.5} color="#10b981" />}
                      {isLocked && <Lock size={12} strokeWidth={2.5} color="#0891b2" />}
                    </div>
                    <span style={{
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      color: isLocked ? '#0f172a' : isTuned ? '#047857' : '#64748b',
                      marginTop: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      {isPegPlaying ? (
                        <>
                          <Volume2 size={11} />
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
