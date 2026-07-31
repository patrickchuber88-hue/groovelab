import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Mic,
  Volume2,
  VolumeX,
  Trash2,
  RotateCcw,
  Sliders,
  Music,
  BookOpen,
  Headphones,
  Clock,
  Zap,
  ChevronRight,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
// @ts-ignore
import * as lamejs from '@breezystack/lamejs';

export interface Track {
  id: number;
  url: string | null;
  blob: Blob | null;
  volume: number;
  isMuted: boolean;
  isRecording: boolean;
  isWaiting: boolean;
  isSoloed: boolean;
}

export interface GrooveLoopstationProps {
  student: any;
  homeworkNotesList: string[];
  setHomeworkNotesList: React.Dispatch<React.SetStateAction<string[]>>;
  syncHomeworkNotes: (notesList: string[]) => Promise<void>;
  fetchProgress: () => Promise<void>;
  notifyHomeworkChange: () => void;
  readOnly: boolean;
  setActiveViewMode?: (mode: 'document' | 'recordings' | 'loopstation') => void;
  useNotebookLayout?: boolean;
}

interface VolumeKnobProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

export const VolumeKnob: React.FC<VolumeKnobProps> = ({ value, onChange, disabled }) => {
  const startYRef = useRef(0);
  const startValRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    startYRef.current = e.clientY;
    startValRef.current = value;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startYRef.current - moveEvent.clientY;
      const newVal = Math.max(0, Math.min(100, startValRef.current + deltaY * 0.8));
      onChange(newVal);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const rotation = -135 + (value / 100) * 270;

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
        border: '1.5px solid #475569',
        boxShadow: '0 3px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.4)',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'ns-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none'
      }}
      title="Ziehen zum Einstellen der Lautstärke"
    >
      <div style={{
        position: 'absolute',
        width: '2.5px',
        height: '10px',
        background: '#0f172a',
        borderRadius: '1px',
        top: '4px',
        transform: `rotate(${rotation}deg)`,
        transformOrigin: '50% 12px',
        transition: 'transform 0.05s ease-out'
      }} />
      <div style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, #f1f5f9 0%, #cbd5e1 100%)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
      }} />
    </div>
  );
};

export const GrooveLoopstation: React.FC<GrooveLoopstationProps> = ({
  student,
  homeworkNotesList,
  setHomeworkNotesList,
  syncHomeworkNotes,
  fetchProgress,
  notifyHomeworkChange,
  readOnly,
  setActiveViewMode,
  useNotebookLayout = false
}) => {
  const [tracks, setTracks] = useState<Track[]>([
    { id: 1, url: null, blob: null, volume: 80, isMuted: false, isRecording: false, isWaiting: false, isSoloed: false },
    { id: 2, url: null, blob: null, volume: 80, isMuted: false, isRecording: false, isWaiting: false, isSoloed: false },
  ]);

  const pauseBars = 4;
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterLoopDuration, setMasterLoopDuration] = useState<number | null>(null); // in ms
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 100
  const [currentBar, setCurrentBar] = useState<number>(1);
  const [currentBeat, setCurrentBeat] = useState<number>(1);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [isExporting, setIsExporting] = useState(false);
  const [countInBeats, setCountInBeats] = useState<number | string | null>(null);
  const [isAutoSequenceActive, setIsAutoSequenceActive] = useState(false);
  const [autoSequenceStatus, setAutoSequenceStatus] = useState<string>('');
  const [syncOffsetMs, setSyncOffsetMs] = useState<number>(() => {
    const saved = localStorage.getItem('groovelab_sync_offset_ms');
    return saved ? parseInt(saved, 10) : 0;
  });
  useEffect(() => {
    localStorage.setItem('groovelab_sync_offset_ms', syncOffsetMs.toString());
  }, [syncOffsetMs]);

  useEffect(() => {
    if (homeworkNotesList) {
      const latencyEntry = homeworkNotesList.find(note => note.startsWith('LATENCY:'));
      if (latencyEntry) {
        const val = parseInt(latencyEntry.replace('LATENCY:', ''), 10);
        if (!isNaN(val)) {
          setSyncOffsetMs(val);
          isManualLatencyAdjustmentRef.current = true;
          setIsDeviceCalibrated(true);
        }
      }
    }
  }, [homeworkNotesList]);

  const updateLatencyInDb = async (offsetVal: number) => {
    try {
      localStorage.setItem('groovelab_sync_offset_ms', offsetVal.toString());
      localStorage.setItem('groovelab_latency_calibrated', 'true');
      if (activeDeviceHash) {
        localStorage.setItem(`groovelab_latency_dev_${activeDeviceHash}`, offsetVal.toString());
      }
      setIsDeviceCalibrated(true);
    } catch (e) {}

    const cleanList = homeworkNotesList ? homeworkNotesList.filter(note => !note.startsWith('LATENCY:')) : [];
    const updatedList = [...cleanList, `LATENCY:${offsetVal}`];
    if (setHomeworkNotesList) setHomeworkNotesList(updatedList);
    if (syncHomeworkNotes) await syncHomeworkNotes(updatedList);

    if (student?.id) {
      try {
        await supabase
          .from('students')
          .update({
            device_calibration: {
              device_hash: activeDeviceHash,
              device_name: activeDeviceName,
              latency_ms: offsetVal,
              calibrated_at: new Date().toISOString()
            }
          })
          .eq('id', student.id);
      } catch (err) {
        console.warn("Supabase student device calibration save:", err);
      }
    }
  };

  const [activeDeviceName, setActiveDeviceName] = useState<string>('Standard Audio');
  const [activeDeviceHash, setActiveDeviceHash] = useState<string>('default');
  const [isDeviceCalibrated, setIsDeviceCalibrated] = useState<boolean>(false);
  const [showCalibrationPromptModal, setShowCalibrationPromptModal] = useState<boolean>(false);

  const getAudioDeviceFingerprint = async (): Promise<{ hash: string, name: string }> => {
    let deviceName = 'Audio-Gerät';
    let rawString = 'default';
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput').map(d => d.label || d.deviceId).join('|');
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput').map(d => d.label || d.deviceId).join('|');
        const sampleRate = audioContextRef.current ? audioContextRef.current.sampleRate : 44100;
        rawString = `${audioInputs}_${audioOutputs}_${sampleRate}`;

        const primaryInput = devices.find(d => d.kind === 'audioinput' && d.label);
        const primaryOutput = devices.find(d => d.kind === 'audiooutput' && d.label);
        if (primaryInput?.label) {
          deviceName = primaryInput.label;
        } else if (primaryOutput?.label) {
          deviceName = primaryOutput.label;
        }
      } catch (e) {}
    }
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
      const char = rawString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return { hash: Math.abs(hash).toString(36), name: deviceName };
  };

  const checkDeviceCalibrationStatus = async () => {
    const { hash, name } = await getAudioDeviceFingerprint();
    setActiveDeviceHash(hash);
    setActiveDeviceName(name);

    const savedPerDevice = localStorage.getItem(`groovelab_latency_dev_${hash}`);
    if (savedPerDevice !== null) {
      const parsed = parseInt(savedPerDevice, 10);
      if (!isNaN(parsed)) {
        setSyncOffsetMs(parsed);
        setIsDeviceCalibrated(true);
        isManualLatencyAdjustmentRef.current = true;
        return;
      }
    }
    const globalSaved = localStorage.getItem('groovelab_sync_offset_ms');
    if (globalSaved !== null && localStorage.getItem('groovelab_latency_calibrated') === 'true') {
      setIsDeviceCalibrated(true);
    } else {
      setIsDeviceCalibrated(false);
    }
  };

  useEffect(() => {
    checkDeviceCalibrationStatus();
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', checkDeviceCalibrationStatus);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', checkDeviceCalibrationStatus);
      };
    }
  }, []);

  const [calibrationWaveform, setCalibrationWaveform] = useState<number[] | null>(null);
  const [loopstationMetronomeVolume, setLoopstationMetronomeVolume] = useState<number>(100);
  const [timeSignature, setTimeSignature] = useState<'4/4' | '3/4'>('4/4');
  const [barLength, setBarLength] = useState<1 | 2 | 4 | 8>(4);
  const [metronomeSound, setMetronomeSound] = useState<'wood' | 'cowbell' | 'rimshot' | 'synth'>('rimshot');
  const timeSignatureRef = useRef(timeSignature);
  const barLengthRef = useRef(barLength);
  const metronomeSoundRef = useRef(metronomeSound);
  useEffect(() => { timeSignatureRef.current = timeSignature; }, [timeSignature]);
  useEffect(() => { barLengthRef.current = barLength; }, [barLength]);
  useEffect(() => { metronomeSoundRef.current = metronomeSound; }, [metronomeSound]);
  const loopstationMetronomeVolumeRef = useRef(loopstationMetronomeVolume);
  useEffect(() => {
    loopstationMetronomeVolumeRef.current = loopstationMetronomeVolume;
  }, [loopstationMetronomeVolume]);
  const [isCalibratingLatency, setIsCalibratingLatency] = useState(false);
  const [calibrationPhaseState, setCalibrationPhaseState] = useState<'idle' | 'ambient' | 'clicks' | 'result'>('idle');
  const [calibrationClickCount, setCalibrationClickCount] = useState<number>(0);
  const [calibrationMicLevel, setCalibrationMicLevel] = useState<number>(0);
  const [calibrationRunIndex, setCalibrationRunIndex] = useState<number>(1);
  const [calibrationRunResults, setCalibrationRunResults] = useState<number[]>([]);
  const [activeBeatPulse, setActiveBeatPulse] = useState<'downbeat' | 'upbeat' | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showCalibrationHelp, setShowCalibrationHelp] = useState(false);
  const [autoLatencyResult, setAutoLatencyResult] = useState<number | null>(null);
  const [bounceBackupState, setBounceBackupState] = useState<{ tracks: Track[]; buffers: { [key: number]: AudioBuffer } } | null>(null);
  const [isBouncing, setIsBouncing] = useState(false);

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const length = buffer.length * numChannels * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(out, 0, 'RIFF');
    out.setUint32(4, 36 + buffer.length * numChannels * 2, true);
    writeString(out, 8, 'WAVE');
    writeString(out, 12, 'fmt ');
    out.setUint32(16, 16, true);
    out.setUint16(20, format, true);
    out.setUint16(22, numChannels, true);
    out.setUint32(24, sampleRate, true);
    out.setUint32(28, sampleRate * numChannels * 2, true);
    out.setUint16(32, numChannels * 2, true);
    out.setUint16(34, bitDepth, true);
    writeString(out, 36, 'data');
    out.setUint32(40, buffer.length * numChannels * 2, true);

    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        let sample = Math.max(-1, Math.min(1, channels[channel][i]));
        sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0;
        out.setInt16(offset, sample, true);
        offset += 2;
      }
    }

    return new Blob([out], { type: 'audio/wav' });
  };

  const handleBounceTracks = async () => {
    if (!useHeadphones) {
      alert("⚠️ Die Bandmaschinen Ping-Pong Bounce-Funktion ist ausschließlich im Kopfhörer-Modus verfügbar, um Lautsprecher-Rückkopplungen zu vermeiden. Bitte aktiviere oben den Kopfhörer-Modus!");
      return;
    }
    if (isPlaying || isAutoSequenceActive) return;

    const activeTrackBuffers: { trackId: number; buffer: AudioBuffer; volume: number }[] = [];
    tracks.forEach(track => {
      const buffer = audioBuffersRef.current[track.id];
      if (buffer && track.url && !track.isMuted) {
        activeTrackBuffers.push({
          trackId: track.id,
          buffer,
          volume: track.volume / 100
        });
      }
    });

    if (activeTrackBuffers.length < 2) return;

    setIsBouncing(true);

    try {
      const backupTracks = tracks.map(t => ({ ...t }));
      const backupBuffers: { [key: number]: AudioBuffer } = {};
      Object.keys(audioBuffersRef.current).forEach(key => {
        const numKey = parseInt(key, 10);
        if (audioBuffersRef.current[numKey]) {
          backupBuffers[numKey] = audioBuffersRef.current[numKey];
        }
      });
      setBounceBackupState({ tracks: backupTracks, buffers: backupBuffers });

      const sampleRate = audioContextRef.current ? audioContextRef.current.sampleRate : 44100;
      const maxDurationSec = Math.max(...activeTrackBuffers.map(b => b.buffer.duration));
      const totalSamples = Math.ceil(maxDurationSec * sampleRate);

      const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
        2,
        totalSamples,
        sampleRate
      );

      activeTrackBuffers.forEach(({ buffer, volume }) => {
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        const gainNode = offlineCtx.createGain();
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(offlineCtx.destination);
        source.start(0);
      });

      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = audioBufferToWav(renderedBuffer);
      const bouncedUrl = URL.createObjectURL(wavBlob);

      audioBuffersRef.current[1] = renderedBuffer;

      tracks.slice(1).forEach(t => {
        if (t.url) URL.revokeObjectURL(t.url);
        delete audioBuffersRef.current[t.id];
      });

      setTracks(prev => prev.map(t => {
        if (t.id === 1) {
          return {
            ...t,
            url: bouncedUrl,
            blob: wavBlob,
            volume: 80,
            isMuted: false,
            isSoloed: false,
            isRecording: false,
            isWaiting: false
          };
        } else {
          return {
            ...t,
            url: null,
            blob: null,
            volume: 80,
            isMuted: false,
            isSoloed: false,
            isRecording: false,
            isWaiting: false
          };
        }
      }));

      setMasterLoopDuration(renderedBuffer.duration * 1000);
    } catch (e) {
      console.error("Failed to bounce tracks:", e);
    } finally {
      setIsBouncing(false);
    }
  };

  const handleUndoBounce = () => {
    if (!bounceBackupState) return;
    setTracks(bounceBackupState.tracks);
    audioBuffersRef.current = { ...bounceBackupState.buffers };
    setBounceBackupState(null);
  };
  const [activeSubTab, setActiveSubTab] = useState<'studio' | 'saved' | 'guide'>(() => {
    try {
      const hasSeenGuide = localStorage.getItem('groovelab_loopstation_guide_seen');
      return hasSeenGuide === 'true' ? 'studio' : 'guide';
    } catch (e) {
      return 'studio';
    }
  });

  const handleFinishOnboarding = () => {
    try {
      localStorage.setItem('groovelab_loopstation_guide_seen', 'true');
    } catch (e) {
      console.warn('Could not save loopstation guide status:', e);
    }
    setActiveSubTab('studio');
  };
  const [playingSavedLoopUrl, setPlayingSavedLoopUrl] = useState<string | null>(null);
  const [selectedSavedLoop, setSelectedSavedLoop] = useState<any>(null);
  const savedLoopAudioRef = useRef<HTMLAudioElement | null>(null);
  const savedLoopSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const calibrationStreamRef = useRef<MediaStream | null>(null);

  const savedLoops = homeworkNotesList
    .filter(note => note.startsWith('LOOP:'))
    .map(note => {
      const parts = note.replace('LOOP:', '').split('|');
      return {
        url: parts[0],
        duration: parts[1],
        date: parts[2],
        label: parts[3] || 'Loop-Mix',
        creatorRole: parts[4] || 'student',
        originalStr: note
      };
    });

  useEffect(() => {
    if (activeSubTab === 'saved' && homeworkNotesList) {
      const filtered = homeworkNotesList.filter((note: string) => note.startsWith('LOOP:'));
      if (filtered.length > 0 && !selectedSavedLoop) {
        const parts = filtered[0].replace('LOOP:', '').split('|');
        setSelectedSavedLoop({
          url: parts[0],
          duration: parts[1],
          date: parts[2],
          label: parts[3] || 'Loop-Mix',
          creatorRole: parts[4] || 'student',
          originalStr: filtered[0]
        });
      }
    }
  }, [activeSubTab, homeworkNotesList, selectedSavedLoop]);

  useEffect(() => {
    return () => {
      if (savedLoopAudioRef.current) {
        savedLoopAudioRef.current.pause();
      }
      if (savedLoopSourceRef.current) {
        try { savedLoopSourceRef.current.stop(); } catch (e) {}
        savedLoopSourceRef.current = null;
      }
      if (calibrationStreamRef.current) {
        try {
          calibrationStreamRef.current.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.warn("Failed to stop calibration stream on unmount:", e);
        }
      }
    };
  }, []);

  const runAutoCalibrationSequence = async () => {
    setIsCalibratingLatency(true);
    setCalibrationPhaseState('ambient');
    setCalibrationClickCount(0);
    setAutoLatencyResult(null);

    try {
      await initAudio();
      const ctx = audioContextRef.current;
      if (!ctx) throw new Error("AudioContext not ready");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      calibrationStreamRef.current = stream;

      const micSource = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      micSource.connect(analyser);

      const pcmData = new Float32Array(analyser.fftSize);

      // Phase 1: Ambient noise floor measurement for 1.2 seconds
      let ambientRmsSum = 0;
      let ambientCount = 0;
      const ambientCheckInterval = setInterval(() => {
        analyser.getFloatTimeDomainData(pcmData);
        let sumSq = 0;
        for (let i = 0; i < pcmData.length; i++) {
          sumSq += pcmData[i] * pcmData[i];
        }
        const rms = Math.sqrt(sumSq / pcmData.length);
        ambientRmsSum += rms;
        ambientCount++;
        const levelPct = Math.min(100, Math.round(rms * 400));
        setCalibrationMicLevel(levelPct);
      }, 50);

      await new Promise(r => setTimeout(r, 1200));
      clearInterval(ambientCheckInterval);

      const baselineNoiseFloor = ambientCount > 0 ? (ambientRmsSum / ambientCount) : 0.005;
      const dynamicPeakThreshold = Math.max(0.008, baselineNoiseFloor * 1.5);

      // Phase 2: Multi-Harmonic Chirp Impulse Pings (5 Pings with AudioContext Hardware Clock & Median Filtering)
      setCalibrationPhaseState('clicks');
      const pingDeltas: number[] = [];

      for (let pingIdx = 1; pingIdx <= 5; pingIdx++) {
        setCalibrationClickCount(pingIdx);

        const pingAudioTime = ctx.currentTime + 0.04;
        const pingWallStart = performance.now();

        const freqs = [1000, 2200, 3400]; // Multi-harmonic chirp burst
        freqs.forEach(f => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, pingAudioTime);
          gain.gain.setValueAtTime(0.33, pingAudioTime);
          gain.gain.setValueAtTime(0.33, pingAudioTime + 0.035);
          gain.gain.exponentialRampToValueAtTime(0.0001, pingAudioTime + 0.045);

          osc.connect(gain);
          gain.connect(ctx.destination);

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
      stream.getTracks().forEach(t => t.stop());
      calibrationStreamRef.current = null;

      // Compute final calibrated offset using Cubase Median Outlier Filter
      let finalOffsetMs = 180;
      if (pingDeltas.length > 0) {
        const sorted = [...pingDeltas].sort((a, b) => a - b);
        let trimmed = sorted;
        if (sorted.length >= 4) {
          trimmed = sorted.slice(1, sorted.length - 1);
        }
        const medianAvg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
        finalOffsetMs = Math.round(medianAvg);
      } else {
        const driverOut = (ctx.outputLatency || 0.025) * 1000;
        finalOffsetMs = Math.round(driverOut + 155);
      }

      setAutoLatencyResult(finalOffsetMs);
      setSyncOffsetMs(finalOffsetMs);
      updateLatencyInDb(finalOffsetMs);
      setIsDeviceCalibrated(true);
      setCalibrationPhaseState('result');

    } catch (err) {
      console.error("Auto calibration error:", err);
      const fallbackOffset = 185;
      setAutoLatencyResult(fallbackOffset);
      setSyncOffsetMs(fallbackOffset);
      updateLatencyInDb(fallbackOffset);
      setIsDeviceCalibrated(true);
      setCalibrationPhaseState('result');
    }
  };

  const handlePlaySavedLoop = async (url: string) => {
    if (playingSavedLoopUrl === url) {
      if (savedLoopSourceRef.current) {
        try { savedLoopSourceRef.current.stop(); } catch (e) {}
        savedLoopSourceRef.current = null;
      }
      setPlayingSavedLoopUrl(null);
      setPlaybackProgress(0);
    } else {
      if (savedLoopSourceRef.current) {
        try { savedLoopSourceRef.current.stop(); } catch (e) {}
        savedLoopSourceRef.current = null;
      }
      setPlayingSavedLoopUrl(url);

      const matched = savedLoops.find(l => l.url === url);
      if (matched) {
        setSelectedSavedLoop(matched);
      }

      try {
        await initAudio();
        const ctx = audioContextRef.current;
        if (!ctx) return;

        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.8;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        const loopStartTime = ctx.currentTime;
        source.start(0);
        savedLoopSourceRef.current = source;

        if (progressIntervalRef.current) {
          cancelAnimationFrame(progressIntervalRef.current);
        }
        const durationSec = audioBuffer.duration;
        const progressSync = () => {
          if (!savedLoopSourceRef.current) return;
          const elapsed = (audioContextRef.current ? audioContextRef.current.currentTime : ctx.currentTime) - loopStartTime;
          const loopElapsed = elapsed % durationSec;
          setPlaybackProgress((loopElapsed / durationSec) * 100);
          progressIntervalRef.current = requestAnimationFrame(progressSync);
        };
        progressIntervalRef.current = requestAnimationFrame(progressSync);

      } catch (err) {
        console.error("Failed to play gapless saved loop:", err);
        setPlayingSavedLoopUrl(null);
        setPlaybackProgress(0);
      }
    }
  };

  const handleDeleteSavedLoop = async (originalStr: string) => {
    const confirmDelete = window.confirm("Möchtest du diesen gespeicherten Loop wirklich löschen?");
    if (!confirmDelete) return;

    if (playingSavedLoopUrl) {
      if (savedLoopAudioRef.current) {
        savedLoopAudioRef.current.pause();
      }
      setPlayingSavedLoopUrl(null);
      setPlaybackProgress(0);
    }

    if (selectedSavedLoop?.originalStr === originalStr) {
      setSelectedSavedLoop(null);
    }

    try {
      if (originalStr.startsWith("AUDIO:") || originalStr.startsWith("LOOP:")) {
        const prefixLen = originalStr.startsWith("AUDIO:") ? 6 : 5;
        const parts = originalStr.substring(prefixLen).split('|');
        const audioUrlString = parts[0];
        if (audioUrlString && audioUrlString.startsWith("http")) {
          const marker = '/storage/v1/object/public/campus-assets/';
          const markerIndex = audioUrlString.indexOf(marker);
          if (markerIndex !== -1) {
            const filePath = audioUrlString.substring(markerIndex + marker.length);
            console.log("Deleting loop audio file from storage:", filePath);
            await supabase.storage.from('campus-assets').remove([filePath]);
          }
        }
      }
    } catch (e) {
      console.error("Failed to delete loop file from storage:", e);
    }

    const updatedList = homeworkNotesList.filter(note => note !== originalStr);
    setHomeworkNotesList(updatedList);
    await syncHomeworkNotes(updatedList);
    await fetchProgress();
    notifyHomeworkChange();
    alert("Loop-Aufnahme erfolgreich gelöscht!");
  };

  const audioContextRef = useRef<AudioContext | null>(null);
  const syncOffsetMsRef = useRef<number>(0);
  const isManualLatencyAdjustmentRef = useRef<boolean>(
    localStorage.getItem('groovelab_latency_calibrated') === 'true' ||
    localStorage.getItem('groovelab_sync_offset_ms') !== null
  );
  useEffect(() => { syncOffsetMsRef.current = syncOffsetMs; }, [syncOffsetMs]);
  const [useHeadphones, setUseHeadphones] = useState(false);
  const useHeadphonesRef = useRef(false);
  const isManualHeadphonesRef = useRef(false);
  useEffect(() => { useHeadphonesRef.current = useHeadphones; }, [useHeadphones]);
  const lastCycleScheduledTimeRef = useRef<number>(0);
  const schedulerTimeoutRef = useRef<any>(null);
  const isPlayingRef = useRef<boolean>(false);
  const masterLoopDurationRef = useRef<number | null>(null);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { masterLoopDurationRef.current = masterLoopDuration; }, [masterLoopDuration]);

  const processorNodeRef = useRef<AudioNode | null>(null);

  const [desiredTrackCount, setDesiredTrackCount] = useState(4);
  const maxAllowedTracks = useHeadphones ? Math.min(4, desiredTrackCount) : Math.min(2, desiredTrackCount);

  useEffect(() => {
    const maxTracks = useHeadphones ? 4 : 2;
    if (desiredTrackCount > maxTracks) {
      setDesiredTrackCount(maxTracks);
    }
  }, [useHeadphones, desiredTrackCount]);

  useEffect(() => {
    setTracks((prev) => {
      const currentLength = prev.length;
      if (currentLength === maxAllowedTracks) return prev;
      if (currentLength < maxAllowedTracks) {
        const newTracks = [...prev];
        for (let i = currentLength + 1; i <= maxAllowedTracks; i++) {
          newTracks.push({
            id: i,
            url: null,
            blob: null,
            volume: 80,
            isMuted: false,
            isRecording: false,
            isWaiting: false,
            isSoloed: false
          });
        }
        return newTracks;
      } else {
        const newTracks = prev.slice(0, maxAllowedTracks);
        prev.slice(maxAllowedTracks).forEach((t) => {
          if (t.url) URL.revokeObjectURL(t.url);
          delete audioBuffersRef.current[t.id];
          if (activeSourcesRef.current[t.id]) {
            try { activeSourcesRef.current[t.id].stop(); } catch (e) {}
            delete activeSourcesRef.current[t.id];
          }
          delete gainNodesRef.current[t.id];
        });
        return newTracks;
      }
    });
  }, [maxAllowedTracks]);

  useEffect(() => {
    if (!useHeadphones) {
      setDesiredTrackCount((prev) => Math.min(2, prev));
    }
  }, [useHeadphones]);

  const audioBuffersRef = useRef<{ [key: number]: AudioBuffer }>({});

  const extractPeaksFromBuffer = (buffer: AudioBuffer, numSteps: number = 32): number[] => {
    const peaks: number[] = new Array(numSteps).fill(0);
    if (!buffer || buffer.length === 0) return peaks;

    const data = buffer.getChannelData(0);
    const stepSamples = Math.floor(data.length / numSteps);
    if (stepSamples <= 0) return peaks;

    for (let i = 0; i < numSteps; i++) {
      const start = i * stepSamples;
      const end = Math.min(start + stepSamples, data.length);
      let max = 0;
      for (let j = start; j < end; j += 4) {
        const val = Math.abs(data[j]);
        if (val > max) max = val;
      }
      peaks[i] = max;
    }

    const maxPeak = Math.max(...peaks, 0.001);
    return peaks.map((p) => Math.min(1.0, p / maxPeak));
  };
  const activeSourcesRef = useRef<{ [key: number]: AudioBufferSourceNode }>({});
  const gainNodesRef = useRef<{ [key: number]: GainNode }>({});
  const analysersRef = useRef<{ [key: number]: AnalyserNode }>({});
  const highClickTemplateRef = useRef<Float32Array | null>(null);
  const lowClickTemplateRef = useRef<Float32Array | null>(null);
  const masterCompressorRef = useRef<DynamicsCompressorNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const mediaRecordersRef = useRef<{ [key: number]: MediaRecorder }>({});
  const recordStartTimesRef = useRef<{ [key: number]: number }>({});
  const progressIntervalRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const audioContextStartTimeRef = useRef<number>(0);
  const loopTimeoutRef = useRef<any>(null);
  const clickIntervalRef = useRef<any>(null);
  const tapTimesRef = useRef<number[]>([]);
  const sequenceIntervalRef = useRef<any>(null);

  const nextNoteTimeRef = useRef<number>(0);
  const currentTickRef = useRef<number>(0);
  const lookaheadTimerRef = useRef<any>(null);
  const uiSyncFrameRef = useRef<any>(null);
  const uiEventsQueueRef = useRef<{ time: number, type: string, data?: any }[]>([]);
  const audioEventsQueueRef = useRef<{ time: number, type: string, data?: any }[]>([]);
  const isAutoSequenceActiveRef = useRef<boolean>(false);
  const continuousRecordStartTimeRef = useRef<number>(0);
  const isComponentMountedRef = useRef<boolean>(true);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const tracksRef = useRef<Track[]>([]);
  const sequenceStartTimeRef = useRef<number>(0);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  const connectTrackNode = (trackId: number, gainNode: GainNode, ctx: AudioContext) => {
    let analyser = analysersRef.current[trackId];
    if (!analyser) {
      analyser = ctx.createAnalyser();
      analyser.fftSize = 32;
      analysersRef.current[trackId] = analyser;
    }
    try { gainNode.disconnect(); } catch (e) {}
    gainNode.connect(analyser);
    try { analyser.disconnect(); } catch (e) {}
    analyser.connect(masterGainRef.current || ctx.destination);
  };

  useEffect(() => {
    const activeTrack = tracks.find(t => t.isRecording || t.isWaiting);
    const activeTrackId = activeTrack ? activeTrack.id : null;
    const ctx = audioContextRef.current;

    tracks.forEach((t) => {
      const gainNode = gainNodesRef.current[t.id];
      if (gainNode) {
        const hasAnySolo = tracks.some(x => x.isSoloed);
        const isActive = (hasAnySolo ? t.isSoloed : !t.isMuted);
        const baseVolume = isActive ? (t.volume / 100) : 0;

        let multiplier = 1.0;
        if (activeTrackId !== null && t.id < activeTrackId) {
          const age = activeTrackId - t.id;
          if (useHeadphones) {
            multiplier = 1.0;
          } else {
            multiplier = Math.max(0.05, 1.0 - 0.55 * age);
          }
        }

        const targetVolume = baseVolume * multiplier;

        if (ctx && ctx.state !== 'suspended') {
          try {
            gainNode.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + 0.05);
          } catch (e) {
            gainNode.gain.setValueAtTime(targetVolume, ctx.currentTime);
          }
        } else {
          gainNode.gain.setValueAtTime(targetVolume, 0);
        }
      }
    });
  }, [tracks, useHeadphones]);

  useEffect(() => {
    if (processorNodeRef.current) {
      try {
        (processorNodeRef.current as any).port?.postMessage({ type: 'SET_HEADPHONES', value: useHeadphones });
      } catch (e) {}
    }
  }, [useHeadphones]);

  useEffect(() => {
    handleReset();
  }, [student?.id]);

  const detectHeadphones = async (stream?: MediaStream) => {
    if (isManualHeadphonesRef.current) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      let isBluetooth = false;
      let hasExternalAudio = devices.some((device) => {
        const label = device.label.toLowerCase();
        const match = (device.kind === 'audiooutput' || device.kind === 'audioinput') &&
          (label.includes('headphone') ||
            label.includes('kopfhörer') ||
            label.includes('earphone') ||
            label.includes('airpods') ||
            label.includes('bluetooth') ||
            label.includes('extern') ||
            label.includes('lineout') ||
            label.includes('headset'));
        if (match && (label.includes('bluetooth') || label.includes('airpods') || label.includes('wireless') || label.includes('beats') || label.includes('freebuds'))) {
          isBluetooth = true;
        }
        return match;
      });

      if (!hasExternalAudio && stream) {
        stream.getAudioTracks().forEach((track) => {
          const trackLabel = track.label.toLowerCase();
          const match = trackLabel.includes('headphone') ||
            trackLabel.includes('kopfhörer') ||
            trackLabel.includes('earphone') ||
            trackLabel.includes('airpods') ||
            trackLabel.includes('bluetooth') ||
            trackLabel.includes('extern') ||
            trackLabel.includes('headset');
          if (match && (trackLabel.includes('bluetooth') || trackLabel.includes('airpods') || trackLabel.includes('wireless') || trackLabel.includes('beats') || trackLabel.includes('freebuds'))) {
            isBluetooth = true;
          }
          if (match) hasExternalAudio = true;
        });
      }

      if (hasExternalAudio) {
        setUseHeadphones(true);
        if (!isManualLatencyAdjustmentRef.current && !isDeviceCalibrated && !isAutoSequenceActiveRef.current) {
          const ctx = audioContextRef.current;
          const hasNativeLatency = !!(ctx && ctx.outputLatency && ctx.outputLatency > 0.05);
          const outLatency = hasNativeLatency
            ? ctx.outputLatency!
            : (isBluetooth ? 0.220 : 0.010);
          const estimatedRoundtrip = outLatency + 0.015;
          const defaultOffsetMs = hasNativeLatency
            ? 0
            : Math.round((estimatedRoundtrip - 0.025) * 1000);
          setSyncOffsetMs(defaultOffsetMs);
        }
      } else {
        setUseHeadphones(false);
        if (!isManualLatencyAdjustmentRef.current && !isDeviceCalibrated && !isAutoSequenceActiveRef.current) {
          const ctx = audioContextRef.current;
          const hasNativeLatency = !!(ctx && ctx.outputLatency && ctx.outputLatency > 0.05);
          const outLatency = hasNativeLatency
            ? ctx.outputLatency!
            : 0.020;
          const estimatedRoundtrip = outLatency + 0.015;
          const defaultOffsetMs = hasNativeLatency
            ? 0
            : Math.round((estimatedRoundtrip - 0.025) * 1000);
          setSyncOffsetMs(defaultOffsetMs);
        }
      }
    } catch (e) {
      console.warn("Headphone detection failed:", e);
    }
  };

  useEffect(() => {
    detectHeadphones();
    if (navigator.mediaDevices) {
      const handleDeviceChange = () => detectHeadphones();
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, []);

  const initAudio = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (ctx && !isManualLatencyAdjustmentRef.current && !isDeviceCalibrated && !isAutoSequenceActiveRef.current) {
      const isBluetooth = syncOffsetMs === 210;
      const hasExternalAudio = useHeadphones;
      const hasNativeLatency = !!(ctx.outputLatency && ctx.outputLatency > 0.05);
      const outLatency = hasNativeLatency
        ? ctx.outputLatency
        : (isBluetooth ? 0.220 : (hasExternalAudio ? 0.010 : 0.020));
      const estimatedRoundtrip = outLatency + 0.015;
      const defaultOffsetMs = hasNativeLatency
        ? 0
        : Math.round((estimatedRoundtrip - 0.025) * 1000);
      setSyncOffsetMs(defaultOffsetMs);
    }

    if (!masterCompressorRef.current) {
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-1.0, ctx.currentTime);
      compressor.knee.setValueAtTime(0, ctx.currentTime);
      compressor.ratio.setValueAtTime(20.0, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.1, ctx.currentTime);
      masterCompressorRef.current = compressor;
    }

    if (!masterGainRef.current) {
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.8, ctx.currentTime);
      masterGainRef.current = masterGain;
      masterGainRef.current.connect(masterCompressorRef.current);
      masterCompressorRef.current.connect(ctx.destination);
    }
  };

  const playClickSound = (isHigh = false, time?: number, overrideSound?: string) => {
    try {
      initAudio();
      const ctx = audioContextRef.current;
      if (!ctx) return;
      const playTime = time !== undefined ? time : ctx.currentTime;
      const soundType = overrideSound || metronomeSoundRef.current || 'wood';

      const hasTrack1 = !!tracksRef.current[0]?.url;
      const baseMetronomeGain = (loopstationMetronomeVolumeRef.current / 100) * 0.45;
      const targetMetronomeGain = (time === undefined)
        ? 0.45
        : ((hasTrack1 && !useHeadphonesRef.current) ? 0 : baseMetronomeGain);

      if (targetMetronomeGain === 0) return;

      if (soundType === 'synth') {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isHigh ? 1000 : 800, playTime);

        const volume = targetMetronomeGain * 0.65;
        gainNode.gain.setValueAtTime(0, playTime);
        gainNode.gain.linearRampToValueAtTime(volume, playTime + 0.0015);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, playTime + 0.035);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(playTime);
        osc.stop(playTime + 0.045);
      } else if (soundType === 'rimshot') {
        const bodyOsc = ctx.createOscillator();
        const bodyGain = ctx.createGain();
        bodyOsc.type = 'sine';
        bodyOsc.frequency.setValueAtTime(isHigh ? 380 : 310, playTime);

        const stickOsc = ctx.createOscillator();
        const stickGain = ctx.createGain();
        stickOsc.type = 'sine';
        stickOsc.frequency.setValueAtTime(isHigh ? 1500 : 1200, playTime);
        stickOsc.frequency.exponentialRampToValueAtTime(isHigh ? 500 : 400, playTime + 0.004);

        bodyGain.gain.setValueAtTime(targetMetronomeGain * 0.35, playTime);
        bodyGain.gain.exponentialRampToValueAtTime(0.00001, playTime + 0.015);

        stickGain.gain.setValueAtTime(targetMetronomeGain * 0.45, playTime);
        stickGain.gain.exponentialRampToValueAtTime(0.00001, playTime + 0.008);

        bodyOsc.connect(bodyGain);
        bodyGain.connect(ctx.destination);
        stickOsc.connect(stickGain);
        stickGain.connect(ctx.destination);

        bodyOsc.start(playTime);
        bodyOsc.stop(playTime + 0.02);
        stickOsc.start(playTime);
        stickOsc.stop(playTime + 0.015);

        const bufferSize = ctx.sampleRate * 0.008;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.15;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(2200, playTime);
        bp.Q.setValueAtTime(5.0, playTime);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(targetMetronomeGain * 0.3, playTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.00001, playTime + 0.006);
        noise.connect(bp);
        bp.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(playTime);
        noise.stop(playTime + 0.01);
      } else if (soundType === 'cowbell') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc1.type = 'square';
        osc2.type = 'square';
        const f = isHigh ? 840 : 540;
        osc1.frequency.setValueAtTime(f, playTime);
        osc2.frequency.setValueAtTime(f * 1.48, playTime);

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(950, playTime);
        bp.Q.setValueAtTime(6.0, playTime);

        gainNode.gain.setValueAtTime(targetMetronomeGain * 0.24, playTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, playTime + 0.065);

        osc1.connect(bp);
        osc2.connect(bp);
        bp.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(playTime);
        osc2.start(playTime);
        osc1.stop(playTime + 0.08);
        osc2.stop(playTime + 0.08);
      } else {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';

        const startFreq = isHigh ? 1600 : 1200;
        const endFreq = isHigh ? 900 : 700;
        osc.frequency.setValueAtTime(startFreq, playTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, playTime + 0.003);

        gainNode.gain.setValueAtTime(targetMetronomeGain * 0.9, playTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, playTime + 0.012);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(playTime);
        osc.stop(playTime + 0.015);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    if (clickIntervalRef.current) clearInterval(clickIntervalRef.current);

    if (isMetronomeActive && isPlaying && !isAutoSequenceActive) {
      const intervalMs = (60 / bpm) * 1000;
      let beatCount = 0;
      clickIntervalRef.current = setInterval(() => {
        playClickSound(beatCount % 4 === 0);
        beatCount++;
      }, intervalMs);
    }

    return () => {
      if (clickIntervalRef.current) clearInterval(clickIntervalRef.current);
    };
  }, [isMetronomeActive, isPlaying, bpm, isAutoSequenceActive]);

  const handleTapTempo = () => {
    const now = Date.now();
    tapTimesRef.current = [...tapTimesRef.current, now].slice(-4);
    if (tapTimesRef.current.length >= 2) {
      const diffs = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        diffs.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgDiff = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
      const calculatedBpm = Math.round(60000 / avgDiff);
      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        setBpm(calculatedBpm);
      }
    }
    playClickSound(true);
  };

  const startAutoSequence = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Audio-Aufnahme wird von Ihrem Browser oder in diesem Sicherheitskontext nicht unterstützt.");
      return;
    }
    if (!isDeviceCalibrated && !isManualLatencyAdjustmentRef.current) {
      setShowCalibrationPromptModal(true);
      return;
    }
    const isOverdubMode = useHeadphones && !!audioBuffersRef.current[1] && !tracks.slice(1).some(t => t.url);
    if (!isOverdubMode) {
      handleReset();
    } else {
      stopAll();
      setTracks((prev) =>
        prev.map((t) => (t.id === 1 ? t : { ...t, url: null, blob: null, isMuted: false, isRecording: false, isWaiting: false, isSoloed: false }))
      );
      Object.keys(audioBuffersRef.current).forEach(k => {
        const numKey = parseInt(k, 10);
        if (numKey > 1) delete audioBuffersRef.current[numKey];
      });
    }

    setIsAutoSequenceActive(true);
    isAutoSequenceActiveRef.current = true;
    setAutoSequenceStatus('WARTE AUF MIKROFON...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      mediaStreamRef.current = stream;
      await detectHeadphones(stream);

      setAutoSequenceStatus('BEAT-EINZÄHLER...');
      await initAudio();
      const beatMs = (60 / bpm) * 1000;
      const barMs = beatMs * 4;
      const trackDurationMs = barMs * 4;
      setMasterLoopDuration(trackDurationMs);
      masterLoopDurationRef.current = trackDurationMs;

      const ctx = audioContextRef.current!;
      const sourceNode = ctx.createMediaStreamSource(stream);

      const workletCode = `
        class RecorderProcessor extends AudioWorkletProcessor {
          constructor() { 
            super(); 
            this.isActive = true; 
          }
          process(inputs, outputs) {
            if (!this.isActive) return true;
            const input = inputs[0];
            if (input && input.length > 0 && input[0]) {
              this.port.postMessage({ data: input[0], time: currentTime });
            }
            const output = outputs[0];
            if (output) {
              for (let channel = 0; channel < output.length; channel++) {
                output[channel].fill(0);
              }
            }
            return true;
          }
        }
        registerProcessor('recorder-worklet', RecorderProcessor);
      `;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);

      let processorNode: AudioNode;
      try {
        await ctx.audioWorklet.addModule(workletUrl);
        const workletNode = new AudioWorkletNode(ctx, 'recorder-worklet');
        workletNode.port.postMessage({ type: 'SET_HEADPHONES', value: useHeadphonesRef.current });
        processorNode = workletNode;
        processorNodeRef.current = workletNode;
      } catch (e) {
        console.warn("AudioWorklet fallback", e);
        processorNode = ctx.createScriptProcessor(4096, 1, 1);
        processorNodeRef.current = processorNode;
      }
      URL.revokeObjectURL(workletUrl);

      const muteNode = ctx.createGain();
      muteNode.gain.value = 0;

      const continuousPCMData: Float32Array[] = [];
      let totalSamplesRecorded = 0;
      let isFirstBlock = true;

      if (processorNode instanceof AudioWorkletNode) {
        processorNode.port.onmessage = (e) => {
          if (!isAutoSequenceActiveRef.current) return;
          if (isFirstBlock) {
            continuousRecordStartTimeRef.current = e.data.time;
            isFirstBlock = false;
          }
          const inputData = e.data.data;
          continuousPCMData.push(new Float32Array(inputData));
          totalSamplesRecorded += inputData.length;
        };
      } else {
        (processorNode as ScriptProcessorNode).onaudioprocess = (e) => {
          if (!isAutoSequenceActiveRef.current) return;
          if (isFirstBlock) {
            const bufferDuration = e.inputBuffer.length / e.inputBuffer.sampleRate;
            continuousRecordStartTimeRef.current = ctx.currentTime - bufferDuration;
            isFirstBlock = false;
          }
          const inputData = e.inputBuffer.getChannelData(0);
          continuousPCMData.push(new Float32Array(inputData));
          totalSamplesRecorded += inputData.length;

          const outputData = e.outputBuffer.getChannelData(0);
          outputData.fill(0);
        };
      }

      const getFullPCMBuffer = (): AudioBuffer | null => {
        if (totalSamplesRecorded === 0) return null;
        const fullBuffer = ctx.createBuffer(1, totalSamplesRecorded, ctx.sampleRate);
        const channelData = fullBuffer.getChannelData(0);
        let offset = 0;
        for (const chunk of continuousPCMData) {
          channelData.set(chunk, offset);
          offset += chunk.length;
        }
        return fullBuffer;
      };

      const sliceContinuousBuffer = (
        continuousBuffer: AudioBuffer,
        tStartTicks: number,
        tEndTicks: number,
        beatSecs: number,
        tDurationMs: number
      ) => {
        const sampleRate = continuousBuffer.sampleRate;
        const loopSamples = Math.round((tDurationMs / 1000) * sampleRate);
        const aligned = ctx.createBuffer(1, loopSamples, sampleRate);

        const trackStartAudioTime = sequenceStartTimeRef.current + tStartTicks * beatSecs;

        let totalLatencySec: number;
        if (syncOffsetMsRef.current !== 0) {
          // Exact calibrated / user-adjusted total latency offset
          totalLatencySec = syncOffsetMsRef.current / 1000.0;
        } else {
          // Automatic uncalibrated hardware estimation fallback
          const outputLatency = ctx.outputLatency || 0.025;
          const inputLatency = 0.025;
          const packetizationLatency = 0.003;
          totalLatencySec = outputLatency + inputLatency + packetizationLatency;
        }

        const elapsedStartSec = trackStartAudioTime - continuousRecordStartTimeRef.current;
        const sliceStartSec = elapsedStartSec + totalLatencySec;

        const srcStart = Math.max(0, Math.min(Math.round(sliceStartSec * sampleRate), continuousBuffer.length));

        const srcData = continuousBuffer.getChannelData(0);
        const dstData = aligned.getChannelData(0);
        const copyLength = Math.min(srcData.length - srcStart, loopSamples);
        if (copyLength > 0) {
          dstData.set(srcData.subarray(srcStart, srcStart + copyLength), 0);
        }

        const fadeSamples = Math.round(0.003 * sampleRate);
        for (let i = 0; i < fadeSamples; i++) {
          if (i < dstData.length) {
            dstData[i] *= (i / fadeSamples);
          }
          const endIdx = dstData.length - 1 - i;
          if (endIdx >= 0) {
            dstData[endIdx] *= (i / fadeSamples);
          }
        }

        return aligned;
      };

      const finalizeTrackBuffer = (trackId: number, tStartTicks: number, tEndTicks: number) => {
        const fullBuffer = getFullPCMBuffer();
        if (!fullBuffer) return;
        const beatSecs = 60.0 / bpm;
        const sliced = sliceContinuousBuffer(fullBuffer, tStartTicks, tEndTicks, beatSecs, trackDurationMs);
        if (sliced) {
          audioBuffersRef.current[trackId] = sliced;
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, isWaiting: false } : t))
          );

          setTimeout(() => {
            if (!isComponentMountedRef.current) return;
            try {
              const freshFull = getFullPCMBuffer();
              if (freshFull) {
                const completeSliced = sliceContinuousBuffer(freshFull, tStartTicks, tEndTicks, beatSecs, trackDurationMs);
                if (completeSliced) {
                  audioBuffersRef.current[trackId] = completeSliced;
                  const currentSource = activeSourcesRef.current[trackId];
                  if (currentSource && isAutoSequenceActiveRef.current) {
                    const playTime = ctx.currentTime;
                    const elapsed = playTime - (sequenceStartTimeRef.current + (tStartTicks + 16) * beatSecs);
                    const trackDurationSec = trackDurationMs / 1000;
                    const playOffset = Math.max(0, elapsed % trackDurationSec);

                    const newSource = ctx.createBufferSource();
                    newSource.buffer = completeSliced;
                    newSource.loop = true;

                    const gainNode = ctx.createGain();
                    const trackInfo = tracksRef.current.find(tr => tr.id === trackId);
                    const volume = trackInfo ? trackInfo.volume : 80;
                    const activeTrack = tracksRef.current.find(t => t.isRecording || t.isWaiting);
                    const activeTrackId = activeTrack ? activeTrack.id : null;
                    let multiplier = 1.0;
                    if (activeTrackId !== null && trackId < activeTrackId) {
                      const age = activeTrackId - trackId;
                      if (useHeadphonesRef.current) {
                        multiplier = 1.0;
                      } else {
                        multiplier = Math.max(0.05, 1.0 - 0.55 * age);
                      }
                    }
                    const targetVolume = (volume / 100) * multiplier;
                    gainNode.gain.setValueAtTime(targetVolume, playTime);
                    newSource.connect(gainNode);
                    connectTrackNode(trackId, gainNode, ctx);

                    const oldGain = gainNodesRef.current[trackId];
                    if (oldGain) {
                      try {
                        oldGain.gain.setValueAtTime(oldGain.gain.value, playTime);
                        oldGain.gain.exponentialRampToValueAtTime(0.0001, playTime + 0.005);
                        currentSource.stop(playTime + 0.005);
                      } catch (e) {}
                    }

                    newSource.start(playTime, playOffset);
                    activeSourcesRef.current[trackId] = newSource;
                    gainNodesRef.current[trackId] = gainNode;
                  }

                  const wavBlob = bufferToWav(completeSliced);
                  const url = URL.createObjectURL(wavBlob);
                  setTracks((prev) =>
                    prev.map((t) => (t.id === trackId ? { ...t, url, blob: wavBlob } : t))
                  );
                }
              }
            } catch (e) {
              console.error("Deferred WAV encoding/buffer swap failed:", e);
            }
          }, 150);

          if (trackId === 1) {
            setMasterLoopDuration(trackDurationMs);
            setIsPlaying(true);
            isPlayingRef.current = true;
          }
          const loopStartOffset = sequenceStartTimeRef.current + (tStartTicks + 16) * beatSecs;
          const elapsed = ctx.currentTime - loopStartOffset;
          const trackDurationSec = trackDurationMs / 1000;
          const playOffset = Math.max(0, elapsed % trackDurationSec);

          const trackInfo = tracksRef.current.find(tr => tr.id === trackId);
          const hasAnySolo = tracksRef.current.some(tr => tr.isSoloed);
          const isActive = (hasAnySolo ? (trackInfo ? trackInfo.isSoloed : false) : true) && (trackInfo ? !trackInfo.isMuted : true);
          if (isActive && trackId <= maxAllowedTracks) {
            const playTime = Math.max(ctx.currentTime, 0);
            if (activeSourcesRef.current[trackId]) {
              try { activeSourcesRef.current[trackId].stop(playTime); } catch (e) {}
            }
            const source = ctx.createBufferSource();
            source.buffer = sliced;
            source.loop = true;
            const gainNode = ctx.createGain();
            const volume = trackInfo ? trackInfo.volume : 80;
            const activeTrack = tracksRef.current.find(t => t.isRecording || t.isWaiting);
            const activeTrackId = activeTrack ? activeTrack.id : null;
            let multiplier = 1.0;
            if (activeTrackId !== null && trackId < activeTrackId) {
              if (useHeadphonesRef.current) {
                multiplier = 1.0;
              } else {
                multiplier = 0.65; // Cubase sweet spot: mild -3.7dB ducking during active speaker recording
              }
            }
            const targetVolume = (volume / 100) * multiplier;
            gainNode.gain.setValueAtTime(targetVolume, playTime);
            source.connect(gainNode);
            connectTrackNode(trackId, gainNode, ctx);
            activeSourcesRef.current[trackId] = source;
            gainNodesRef.current[trackId] = gainNode;
            source.start(playTime, playOffset);
          }
        }
      };

      if (useHeadphonesRef.current) {
        sourceNode.connect(processorNode);
      } else {
        const inputHPF = ctx.createBiquadFilter();
        inputHPF.type = 'highpass';
        inputHPF.frequency.setValueAtTime(80, ctx.currentTime);

        const inputLPF = ctx.createBiquadFilter();
        inputLPF.type = 'lowpass';
        inputLPF.frequency.setValueAtTime(8000, ctx.currentTime);

        sourceNode.connect(inputHPF);
        inputHPF.connect(inputLPF);
        inputLPF.connect(processorNode);
      }
      processorNode.connect(muteNode);
      muteNode.connect(ctx.destination);

      setIsMetronomeActive(true);

      const highlightTrackRecording = (trackId: number) => {
        setAutoSequenceStatus(`AUFNAHME SPUR ${trackId}...`);
        setTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, isRecording: true, isWaiting: false } : t))
        );
      };

      const unhighlightTrackRecording = (trackId: number) => {
        setTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, isRecording: false, isWaiting: true } : t))
        );
        if (trackId <= maxAllowedTracks) {
          setAutoSequenceStatus("PAUSE (NÄCHSTE SPUR...)");
        }
      };

      const pauseLen = pauseBars * 4;
      const trackBoundaries: { start: number; end: number }[] = [];
      let nextStartTick = 4;
      for (let i = 0; i < maxAllowedTracks; i++) {
        trackBoundaries.push({
          start: nextStartTick,
          end: nextStartTick + 16
        });
        nextStartTick = nextStartTick + 16 + pauseLen;
      }
      const totalTicks = trackBoundaries[trackBoundaries.length - 1].end;

      sequenceStartTimeRef.current = audioContextRef.current!.currentTime + 0.6;

      const beatSecs = 60.0 / bpm;
      nextNoteTimeRef.current = audioContextRef.current!.currentTime + 0.6;
      currentTickRef.current = 0;
      uiEventsQueueRef.current = [];
      audioEventsQueueRef.current = [];

      const scheduleNote = (tickIndex: number, time: number) => {
        playClickSound(tickIndex % 4 === 0, time);
        uiEventsQueueRef.current.push({ time, type: 'TICK', data: { tickIndex } });
        audioEventsQueueRef.current.push({ time, type: 'TICK', data: { tickIndex } });
      };

      const playTrackBufferAtTime = (trackId: number, time: number) => {
        const buffer = audioBuffersRef.current[trackId];
        const ctx = audioContextRef.current;
        if (!buffer || !ctx) return;

        if (activeSourcesRef.current[trackId]) {
          try { activeSourcesRef.current[trackId].stop(time); } catch (e) {}
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gainNode = ctx.createGain();
        const trackInfo = tracksRef.current.find(t => t.id === trackId);
        const volume = trackInfo ? trackInfo.volume : 80;
        const isMuted = trackInfo ? trackInfo.isMuted : false;
        const isSoloed = trackInfo ? trackInfo.isSoloed : false;

        const hasAnySolo = tracksRef.current.some(t => t.isSoloed);
        const active = hasAnySolo ? isSoloed : !isMuted;

        const activeTrack = tracksRef.current.find(tr => tr.isRecording || tr.isWaiting);
        const activeTrackId = activeTrack ? activeTrack.id : null;
        let multiplier = 1.0;
        if (activeTrackId !== null && trackId < activeTrackId) {
          if (useHeadphonesRef.current) {
            multiplier = 1.0;
          } else {
            multiplier = 0.65; // Cubase sweet spot: mild -3.7dB ducking during active speaker recording
          }
        }
        const baseVolume = active ? (volume / 100) : 0;
        const targetVolume = baseVolume * multiplier;
        gainNode.gain.setValueAtTime(targetVolume, time);

        source.connect(gainNode);
        connectTrackNode(trackId, gainNode, ctx);

        source.loop = true;
        activeSourcesRef.current[trackId] = source;
        gainNodesRef.current[trackId] = gainNode;

        source.start(time);
      };

      const scheduler = () => {
        if (!audioContextRef.current || !isAutoSequenceActiveRef.current) return;

        const lag = audioContextRef.current.currentTime - nextNoteTimeRef.current;
        if (lag > 0.15) {
          console.error("Loopstation timing lag detected:", lag);
          handleReset();
          alert("Audio-Timing-Fehler: Der Browser war kurz überlastet und die Loopstation lief asynchron. Die Aufnahme wurde gestoppt. Bitte starte sie neu.");
          return;
        }

        while (nextNoteTimeRef.current < audioContextRef.current.currentTime + 0.1) {
          const tickIndex = currentTickRef.current;
          if (tickIndex <= totalTicks) {
            scheduleNote(tickIndex, nextNoteTimeRef.current);

            trackBoundaries.forEach((boundary, index) => {
              if (index > 0 && tickIndex === boundary.start) {
                const playTime = nextNoteTimeRef.current;
                const tracksToPlay = Array.from({ length: index }, (_, k) => k + 1);
                tracksToPlay.forEach((tId) => {
                  if (audioBuffersRef.current[tId]) {
                    const trackInfo = tracksRef.current.find(tr => tr.id === tId);
                    const hasAnySolo = tracksRef.current.some(tr => tr.isSoloed);
                    const isActive = (hasAnySolo ? (trackInfo ? trackInfo.isSoloed : false) : true) && (trackInfo ? !trackInfo.isMuted : true);
                    if (isActive) playTrackBufferAtTime(tId, playTime);
                  }
                });
              }
              if (useHeadphonesRef.current && tickIndex === boundary.end && (index + 1) < maxAllowedTracks) {
                const playTime = nextNoteTimeRef.current;
                const tracksToPlay = Array.from({ length: index + 1 }, (_, k) => k + 1);
                tracksToPlay.forEach((tId) => {
                  if (audioBuffersRef.current[tId]) {
                    const trackInfo = tracksRef.current.find(tr => tr.id === tId);
                    const hasAnySolo = tracksRef.current.some(tr => tr.isSoloed);
                    const isActive = (hasAnySolo ? (trackInfo ? trackInfo.isSoloed : false) : true) && (trackInfo ? !trackInfo.isMuted : true);
                    if (isActive) playTrackBufferAtTime(tId, playTime);
                  }
                });
              }
            });
          }
          nextNoteTimeRef.current += beatSecs;
          currentTickRef.current++;
        }
        lookaheadTimerRef.current = setTimeout(scheduler, 25);
      };

      const syncUI = () => {
        if (!audioContextRef.current || !isAutoSequenceActiveRef.current) return;
        const currentTime = audioContextRef.current.currentTime;

        while (uiEventsQueueRef.current.length > 0 && uiEventsQueueRef.current[0].time <= currentTime) {
          const event = uiEventsQueueRef.current.shift();
          if (!event || event.type !== 'TICK') continue;

          const tickIndex = event.data.tickIndex;
          const isDownbeat = tickIndex % 4 === 0;
          setActiveBeatPulse(isDownbeat ? 'downbeat' : 'upbeat');
          setTimeout(() => setActiveBeatPulse(null), 140);

          let matchedBoundaryEvent = false;
          trackBoundaries.forEach((boundary, index) => {
            const trackId = index + 1;
            if (tickIndex === boundary.start) {
              highlightTrackRecording(trackId);
              matchedBoundaryEvent = true;
            } else if (tickIndex === boundary.end) {
              unhighlightTrackRecording(trackId);
              matchedBoundaryEvent = true;

              if (trackId === maxAllowedTracks) {
                clearTimeout(lookaheadTimerRef.current);
                cancelAnimationFrame(uiSyncFrameRef.current);
                setIsAutoSequenceActive(false);
                isAutoSequenceActiveRef.current = false;
                setIsMetronomeActive(false);
                setAutoSequenceStatus('FERTIG!');

                finalizeTrackBuffer(trackId, boundary.start, boundary.end);

                try { processorNode.disconnect(); } catch (e) {}
                try { sourceNode.disconnect(); } catch (e) {}
                try { muteNode.disconnect(); } catch (e) {}
                if (mediaStreamRef.current) {
                  mediaStreamRef.current.getTracks().forEach(track => track.stop());
                  mediaStreamRef.current = null;
                }

                playAll();
              } else {
                setTimeout(() => finalizeTrackBuffer(trackId, boundary.start, boundary.end), 0);
              }
            }
          });
        }

        const elapsedSecs = currentTime - sequenceStartTimeRef.current;
        const currentTick = elapsedSecs / beatSecs;

        if (currentTick < 4) {
          const beatInBar = Math.max(1, Math.floor(currentTick) + 1);
          setCountInBeats(beatInBar + "/4");
          setPlaybackProgress(Math.max(0, (currentTick / 4) * 100));
          setCurrentBar(1);
          setCurrentBeat(beatInBar);
        } else {
          setCountInBeats(null);

          let currentBoundaryIndex = -1;
          let isInPauseIndex = -1;

          for (let i = 0; i < trackBoundaries.length; i++) {
            const boundary = trackBoundaries[i];
            if (currentTick >= boundary.start && currentTick < boundary.end) {
              currentBoundaryIndex = i;
              break;
            }
            if (i < trackBoundaries.length - 1) {
              const nextBoundary = trackBoundaries[i + 1];
              if (currentTick >= boundary.end && currentTick < nextBoundary.start) {
                isInPauseIndex = i;
                break;
              }
            }
          }

          const beatsPerBar = timeSignatureRef.current === '3/4' ? 3 : 4;
          if (currentBoundaryIndex !== -1) {
            const boundary = trackBoundaries[currentBoundaryIndex];
            const elapsed = currentTick - boundary.start;
            setPlaybackProgress((elapsed / 16) * 100);
            setCurrentBar(Math.floor(elapsed / beatsPerBar) + 1);
            setCurrentBeat(Math.floor(elapsed) % beatsPerBar + 1);
            setAutoSequenceStatus(`AUFNAHME SPUR ${currentBoundaryIndex + 1}...`);
          } else if (isInPauseIndex !== -1) {
            const boundary = trackBoundaries[isInPauseIndex];
            const nextBoundary = trackBoundaries[isInPauseIndex + 1];
            const elapsed = currentTick - boundary.end;
            const pauseLengthTicks = nextBoundary.start - boundary.end;
            setPlaybackProgress((elapsed / pauseLengthTicks) * 100);
            setCurrentBar(Math.floor(elapsed / beatsPerBar) + 1);
            setCurrentBeat(Math.floor(elapsed) % beatsPerBar + 1);
            setAutoSequenceStatus("ZWISCHENPAUSE...");
          }
        }

        uiSyncFrameRef.current = requestAnimationFrame(syncUI);
      };

      scheduler();
      syncUI();

    } catch (err) {
      console.error(err);
      alert('Mikrofonfehler.');
      setIsAutoSequenceActive(false);
    }
  };

  const handlePlayToggle = () => {
    initAudio();
    if (isPlaying) {
      stopAll();
    } else {
      playAll();
    }
  };

  const playTrackBuffer = (trackId: number, offset = 0, loop = false, startTime = 0) => {
    const buffer = audioBuffersRef.current[trackId];
    const ctx = audioContextRef.current;
    if (!buffer || !ctx) return;

    if (activeSourcesRef.current[trackId]) {
      try {
        if (startTime > 0) {
          activeSourcesRef.current[trackId].stop(startTime);
        } else {
          activeSourcesRef.current[trackId].stop();
        }
      } catch (e) {}
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (loop) {
      source.loop = true;
    }

    let gainNode = gainNodesRef.current[trackId];
    if (!gainNode) {
      gainNode = ctx.createGain();
      connectTrackNode(trackId, gainNode, ctx);
      gainNodesRef.current[trackId] = gainNode;
    }

    const trackInfo = tracks.find(t => t.id === trackId);
    const hasAnySolo = tracks.some(t => t.isSoloed);
    const vol = trackInfo ? trackInfo.volume / 100 : 0.8;
    const isActive = (hasAnySolo ? (trackInfo ? trackInfo.isSoloed : false) : true) && (trackInfo ? !trackInfo.isMuted : true);
    const activeTrack = tracks.find(tr => tr.isRecording || tr.isWaiting);
    const activeTrackId = activeTrack ? activeTrack.id : null;
    let multiplier = 1.0;
    if (activeTrackId !== null && trackId < activeTrackId) {
      const age = activeTrackId - trackId;
      if (useHeadphonesRef.current) {
        multiplier = Math.max(0.20, 1.0 - 0.30 * age);
      } else {
        multiplier = Math.max(0.05, 1.0 - 0.55 * age);
      }
    }
    const targetVol = isActive ? vol : 0;
    const finalVol = targetVol * multiplier;
    gainNode.gain.setValueAtTime(finalVol, ctx.currentTime);

    source.connect(gainNode);
    const startAt = startTime > 0 ? startTime : ctx.currentTime;
    source.start(startAt, offset);
    activeSourcesRef.current[trackId] = source;
  };

  const startProgressLoop = (customStartTime?: number, customAudioCtxStartTime?: number) => {
    if (progressIntervalRef.current) {
      cancelAnimationFrame(progressIntervalRef.current);
    }
    const duration = masterLoopDurationRef.current || masterLoopDuration;
    if (duration) {
      startTimeRef.current = customStartTime || Date.now();
      audioContextStartTimeRef.current = customAudioCtxStartTime || (audioContextRef.current ? audioContextRef.current.currentTime : 0);

      const loopProgressSync = () => {
        const ctx = audioContextRef.current;
        let elapsed = (Date.now() - startTimeRef.current) % duration;

        if (ctx && audioContextStartTimeRef.current > 0) {
          const elapsedSecs = Math.max(0, ctx.currentTime - audioContextStartTimeRef.current);
          const durationSecs = duration / 1000;
          if (durationSecs > 0) {
            elapsed = (elapsedSecs % durationSecs) * 1000;
          }
        }

        setPlaybackProgress((elapsed / duration) * 100);

        const totalBars = barLengthRef.current || barLength;
        const beatsPerBar = timeSignatureRef.current === '3/4' ? 3 : 4;
        const totalBeats = totalBars * beatsPerBar;
        const currentTotalBeat = Math.floor((elapsed / duration) * totalBeats);

        const bar = Math.max(1, Math.min(totalBars, Math.floor(currentTotalBeat / beatsPerBar) + 1));
        const beat = Math.max(1, Math.min(beatsPerBar, (currentTotalBeat % beatsPerBar) + 1));

        setCurrentBar(bar);
        setCurrentBeat(beat);
        progressIntervalRef.current = requestAnimationFrame(loopProgressSync);
      };
      progressIntervalRef.current = requestAnimationFrame(loopProgressSync);
    }
  };

  const playAll = async () => {
    await initAudio();
    setIsPlaying(true);
    isPlayingRef.current = true;
    startTimeRef.current = Date.now();

    const ctx = audioContextRef.current;
    if (!ctx) return;

    const playTime = ctx.currentTime + 0.05;
    lastCycleScheduledTimeRef.current = playTime;
    audioContextStartTimeRef.current = playTime;

    tracksRef.current.forEach((track) => {
      const hasAudio = !!audioBuffersRef.current[track.id];
      if (hasAudio && !track.isMuted) {
        playTrackBuffer(track.id, 0, true, playTime);
      }
    });

    startProgressLoop(Date.now() + 50, playTime);
  };

  const stopAll = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setPlaybackProgress(0);
    isAutoSequenceActiveRef.current = false;
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      cancelAnimationFrame(progressIntervalRef.current);
    }
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    if (schedulerTimeoutRef.current) {
      clearTimeout(schedulerTimeoutRef.current);
      schedulerTimeoutRef.current = null;
    }
    if (sequenceIntervalRef.current) {
      clearInterval(sequenceIntervalRef.current);
      sequenceIntervalRef.current = null;
    }
    if (lookaheadTimerRef.current) {
      clearTimeout(lookaheadTimerRef.current);
      lookaheadTimerRef.current = null;
    }
    if (uiSyncFrameRef.current) {
      cancelAnimationFrame(uiSyncFrameRef.current);
      uiSyncFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    tracks.forEach((track) => {
      if (activeSourcesRef.current[track.id]) {
        try {
          activeSourcesRef.current[track.id].stop();
        } catch (e) {}
        delete activeSourcesRef.current[track.id];
      }
    });
    if (savedLoopSourceRef.current) {
      try { savedLoopSourceRef.current.stop(); } catch (e) {}
      savedLoopSourceRef.current = null;
    }
  };

  const handleReset = () => {
    isAutoSequenceActiveRef.current = false;
    setIsAutoSequenceActive(false);
    stopAll();
    if (savedLoopSourceRef.current) {
      try { savedLoopSourceRef.current.stop(); } catch (e) {}
      savedLoopSourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    Object.values(mediaRecordersRef.current).forEach((rec: any) => {
      if (rec && rec.state !== 'inactive') rec.stop();
    });

    tracks.forEach((t) => {
      if (t.url) URL.revokeObjectURL(t.url);
    });

    const resetTracks: Track[] = [];
    for (let i = 1; i <= maxAllowedTracks; i++) {
      resetTracks.push({
        id: i,
        url: null,
        blob: null,
        volume: 80,
        isMuted: false,
        isRecording: false,
        isWaiting: false,
        isSoloed: false
      });
    }
    setTracks(resetTracks);
    setMasterLoopDuration(null);
    audioBuffersRef.current = {};
    activeSourcesRef.current = {};
    gainNodesRef.current = {};
    Object.values(analysersRef.current).forEach((a) => {
      try { a.disconnect(); } catch (e) {}
    });
    analysersRef.current = {};
    mediaRecordersRef.current = {};
    recordStartTimesRef.current = {};
    setCountInBeats(null);
  };

  const startRecording = async (trackId: number) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Audio-Aufnahme wird von Ihrem Browser oder in diesem Sicherheitskontext nicht unterstützt.");
      return;
    }

    // Beim ersten Klick auf REC immer zuerst Latenz-Kalibrierung durchführen
    if (!isDeviceCalibrated && !isCalibratingLatency) {
      await runAutoCalibrationSequence();
      return;
    }

    const existingTrack = tracksRef.current.find(t => t.id === trackId);
    const hasExistingAudio = !!audioBuffersRef.current[trackId] || !!existingTrack?.url;

    if (hasExistingAudio) {
      const confirmOverwrite = window.confirm(`Auf Spur ${trackId} befindet sich bereits eine Aufnahme. Möchtest du diese wirklich überschreiben?`);
      if (!confirmOverwrite) return;
    }

    if (activeSourcesRef.current[trackId]) {
      try { activeSourcesRef.current[trackId].stop(); } catch (e) {}
      delete activeSourcesRef.current[trackId];
    }

    if (existingTrack?.url) {
      URL.revokeObjectURL(existingTrack.url);
    }

    delete audioBuffersRef.current[trackId];
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, url: null, blob: null } : t))
    );

    await initAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      mediaStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (mediaStreamRef.current === stream) mediaStreamRef.current = null;

        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);

        try {
          const arrayBuffer = await blob.arrayBuffer();
          if (audioContextRef.current) {
            const decoded = await audioContextRef.current.decodeAudioData(arrayBuffer);
            const normalized = normalizeAudioBuffer(decoded, 0.95);
            audioBuffersRef.current[trackId] = normalized;
          }
        } catch (decodeErr) {
          console.error("Decoding error:", decodeErr);
        }

        setTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, url, blob, isRecording: false, isWaiting: false } : t))
        );

        if (trackId === 1) {
          const duration = Date.now() - recordStartTimesRef.current[1];
          setMasterLoopDuration(duration);
          setIsPlaying(true);
          isPlayingRef.current = true;
          startTimeRef.current = Date.now();

          const ctx = audioContextRef.current;
          if (ctx) {
            const playTime = ctx.currentTime + 0.05;
            lastCycleScheduledTimeRef.current = playTime;
            playTrackBuffer(1, 0, false, playTime);

            const loopProgressSync = () => {
              const elapsed = (Date.now() - startTimeRef.current) % duration;
              setPlaybackProgress((elapsed / duration) * 100);
              progressIntervalRef.current = requestAnimationFrame(loopProgressSync);
            };
            progressIntervalRef.current = requestAnimationFrame(loopProgressSync);

            if (schedulerTimeoutRef.current) clearTimeout(schedulerTimeoutRef.current);
            const runScheduler = () => {
              if (!isPlayingRef.current) return;
              const lookAhead = 0.200;
              const loopDurationSec = duration / 1000;
              while (lastCycleScheduledTimeRef.current < ctx.currentTime + lookAhead) {
                const nextTime = lastCycleScheduledTimeRef.current + loopDurationSec;
                tracksRef.current.forEach((track) => {
                  const hasAudio = !!audioBuffersRef.current[track.id];
                  if (hasAudio && !track.isMuted) {
                    playTrackBuffer(track.id, 0, false, nextTime);
                  }
                });
                lastCycleScheduledTimeRef.current = nextTime;
              }
              schedulerTimeoutRef.current = setTimeout(runScheduler, 50);
            };
            runScheduler();
          }
        } else {
          const ctx = audioContextRef.current;
          if (ctx && isPlayingRef.current && masterLoopDuration) {
            const loopDurationSec = masterLoopDuration / 1000;
            const elapsedSecs = (Date.now() - startTimeRef.current) / 1000;
            const offset = elapsedSecs % loopDurationSec;
            playTrackBuffer(trackId, offset, false, ctx.currentTime);
          }
        }
      };

      mediaRecordersRef.current[trackId] = mediaRecorder;

      if (trackId === 1) {
        const intervalMs = (60 / bpm) * 1000;
        setCountInBeats(4);
        let count = 4;

        setIsMetronomeActive(true);

        const countTimer = setInterval(() => {
          count--;
          if (count > 0) {
            setCountInBeats(count);
          } else {
            clearInterval(countTimer);
            setCountInBeats(null);
            recordStartTimesRef.current[1] = Date.now();
            mediaRecorder.start();
            setTracks((prev) =>
              prev.map((t) => (t.id === 1 ? { ...t, isRecording: true } : t))
            );
          }
        }, intervalMs);
      } else {
        setTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, isWaiting: true } : t))
        );

        const msToNextCycle = masterLoopDuration
          ? masterLoopDuration - ((Date.now() - startTimeRef.current) % masterLoopDuration)
          : 0;

        // Mandatory 4-measure loop pause (4 * masterLoopDuration) to guarantee sample-accurate synchrony (no swallowed attack)
        const totalDelay = msToNextCycle + (masterLoopDuration ? 4 * masterLoopDuration : 0);

        setTimeout(() => {
          recordStartTimesRef.current[trackId] = Date.now();
          mediaRecorder.start();
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, isRecording: true, isWaiting: false } : t))
          );

          setTimeout(() => {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
          }, masterLoopDuration || 5000);

        }, totalDelay);
      }
    } catch (err) {
      console.error('Mic error:', err);
      alert('Mikrofonzugriff verweigert.');
    }
  };

  const stopRecording = (trackId: number) => {
    const recorder = mediaRecordersRef.current[trackId];
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const handleVolumeChange = (trackId: number, vol: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, volume: vol } : t))
    );
    const gainNode = gainNodesRef.current[trackId];
    if (gainNode && audioContextRef.current) {
      const isMuted = tracks.find(t => t.id === trackId)?.isMuted;
      gainNode.gain.setValueAtTime(isMuted ? 0 : vol / 100, audioContextRef.current.currentTime);
    }
  };

  const handleMuteToggle = (trackId: number) => {
    setTracks((prev) => {
      const nextTracks = prev.map((t) => (t.id === trackId ? { ...t, isMuted: !t.isMuted } : t));
      const hasAnySolo = nextTracks.some((t) => t.isSoloed);

      nextTracks.forEach((t) => {
        const gainNode = gainNodesRef.current[t.id];
        if (gainNode && audioContextRef.current) {
          const vol = t.volume / 100;
          const isActive = (hasAnySolo ? t.isSoloed : true) && !t.isMuted;
          gainNode.gain.setValueAtTime(isActive ? vol : 0, audioContextRef.current.currentTime);
        }
      });
      return nextTracks;
    });
  };

  const handleSoloToggle = (trackId: number) => {
    setTracks((prev) => {
      const nextTracks = prev.map((t) => (t.id === trackId ? { ...t, isSoloed: !t.isSoloed } : t));
      const hasAnySolo = nextTracks.some((t) => t.isSoloed);

      nextTracks.forEach((t) => {
        const gainNode = gainNodesRef.current[t.id];
        if (gainNode && audioContextRef.current) {
          const vol = t.volume / 100;
          const isActive = (hasAnySolo ? t.isSoloed : true) && !t.isMuted;
          gainNode.gain.setValueAtTime(isActive ? vol : 0, audioContextRef.current.currentTime);
        }
      });
      return nextTracks;
    });
  };

  const handleDeleteTrack = (trackId: number) => {
    if (tracksRef.current[trackId - 1]?.url) {
      const confirmDelete = window.confirm("Möchtest du diese Aufnahme wirklich löschen?");
      if (!confirmDelete) return;
    }
    if (activeSourcesRef.current[trackId]) {
      try { activeSourcesRef.current[trackId].stop(); } catch (e) {}
      delete activeSourcesRef.current[trackId];
    }
    delete audioBuffersRef.current[trackId];
    delete gainNodesRef.current[trackId];

    if (tracksRef.current[trackId - 1]?.url) {
      URL.revokeObjectURL(tracksRef.current[trackId - 1].url!);
    }

    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, url: null, blob: null, isRecording: false, isWaiting: false, isSoloed: false } : t))
    );

    if (trackId === 1) {
      stopAll();
      setMasterLoopDuration(null);
    }
  };

  const bufferToWav = (buffer: AudioBuffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels: Float32Array[] = [];
    let pos = 0;

    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt "
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);

    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 0;
    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([bufferArr], { type: 'audio/wav' });
  };

  const normalizeAudioBuffer = (buffer: AudioBuffer, targetPeak: number = 0.95): AudioBuffer => {
    const numChannels = buffer.numberOfChannels;
    let maxVal = 0;

    for (let c = 0; c < numChannels; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        const val = Math.abs(data[i]);
        if (val > maxVal) {
          maxVal = val;
        }
      }
    }

    if (maxVal > 0 && maxVal < targetPeak) {
      const scaleFactor = targetPeak / maxVal;
      for (let c = 0; c < numChannels; c++) {
        const data = buffer.getChannelData(c);
        for (let i = 0; i < data.length; i++) {
          data[i] *= scaleFactor;
        }
      }
    }

    return buffer;
  };

  const bufferToMp3 = (buffer: AudioBuffer) => {
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const Mp3EncoderClass = lamejs.Mp3Encoder || (lamejs as any).default?.Mp3Encoder || (window as any).lamejs?.Mp3Encoder;
    if (!Mp3EncoderClass) {
      throw new Error("LameJS Mp3Encoder constructor not found.");
    }
    const mp3encoder = new Mp3EncoderClass(channels, sampleRate, 128);

    const mp3Data: any[] = [];
    const samples = buffer.getChannelData(0);

    const sampleBlockSize = 1152;
    const int16Samples = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      int16Samples[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }

    if (channels === 2) {
      const samples2 = buffer.getChannelData(1);
      const int16Samples2 = new Int16Array(samples2.length);
      for (let i = 0; i < samples2.length; i++) {
        const sample = Math.max(-1, Math.min(1, samples2[i]));
        int16Samples2[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }
      for (let i = 0; i < int16Samples.length; i += sampleBlockSize) {
        const chunk1 = int16Samples.subarray(i, i + sampleBlockSize);
        const chunk2 = int16Samples2.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(chunk1, chunk2);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
      }
    } else {
      for (let i = 0; i < int16Samples.length; i += sampleBlockSize) {
        const chunk = int16Samples.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(chunk);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
      }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) mp3Data.push(mp3buf);

    return new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
  };

  const handleExportMix = async () => {
    if (!masterLoopDuration) return;
    const loopNotesCount = homeworkNotesList.filter(note => note.startsWith('LOOP:')).length;
    if (loopNotesCount >= 10) {
      alert("Limit erreicht! Du hast bereits 10 gespeicherte Loops. Bitte lösche im Tab 'Gespeicherte Loops' zuerst einen alten Loop, um Platz für diesen neuen Loop-Mix zu machen.");
      return;
    }
    setIsExporting(true);
    let label = "Mein Loop";
    try {
      const baseName = "Mein Loop";
      let uniqueName = baseName;
      let counter = 2;
      const existingLabels = homeworkNotesList
        .filter(note => note.startsWith('LOOP:'))
        .map(note => {
          const parts = note.replace('LOOP:', '').split('|');
          return (parts[3] || 'Loop-Mix').trim();
        });
      while (existingLabels.includes(uniqueName)) {
        uniqueName = `${baseName}${counter}`;
        counter++;
      }

      const inputLabel = prompt("Gib deinem Loop einen Namen:", uniqueName);
      if (inputLabel === null) {
        setIsExporting(false);
        return;
      }

      let finalLabel = inputLabel.trim() || baseName;
      let checkName = finalLabel;
      let finalCounter = 2;
      while (existingLabels.includes(checkName)) {
        checkName = `${finalLabel}${finalCounter}`;
        finalCounter++;
      }
      label = checkName;
      const sanitizedLabel = label.replace(/\|/g, '-');

      const offlineCtx = new OfflineAudioContext(
        2,
        Math.round((masterLoopDuration / 1000) * 44100),
        44100
      );

      tracksRef.current.forEach((track) => {
        const buffer = audioBuffersRef.current[track.id];
        if (buffer && track.url) {
          const hasAnySolo = tracksRef.current.some(t => t.isSoloed);
          const isActive = (hasAnySolo ? track.isSoloed : true) && !track.isMuted;
          if (!isActive) return;

          const source = offlineCtx.createBufferSource();
          source.buffer = buffer;

          const gainNode = offlineCtx.createGain();
          const vol = track.volume / 100;
          gainNode.gain.setValueAtTime(vol, 0);

          source.connect(gainNode);
          gainNode.connect(offlineCtx.destination);

          source.start(0);
        }
      });

      const renderedBuffer = await offlineCtx.startRendering();
      normalizeAudioBuffer(renderedBuffer, 0.95);

      let mixBlob: Blob;
      let contentType = 'audio/mp3';
      let fileExt = 'mp3';
      try {
        mixBlob = bufferToMp3(renderedBuffer);
      } catch (mp3Err) {
        console.warn("MP3 conversion failed, falling back to WAV format:", mp3Err);
        mixBlob = bufferToWav(renderedBuffer);
        contentType = 'audio/wav';
        fileExt = 'wav';
      }

      const fileName = `${student.id}_loopmix_${Date.now()}.${fileExt}`;
      const filePath = `loops/${fileName}`;

      const { error } = await supabase.storage
        .from('campus-assets')
        .upload(filePath, mixBlob, { contentType, cacheControl: 'private, max-age=3600' });

      if (error) throw error;

      const publicUrl = supabase.storage.from('campus-assets').getPublicUrl(filePath).data.publicUrl;
      const creatorRole = readOnly ? 'student' : 'teacher';
      const audioMetaStr = `LOOP:${publicUrl}|${Math.round(masterLoopDuration / 1000)}|${new Date().toISOString()}|${sanitizedLabel}|${creatorRole}`;

      setHomeworkNotesList(prev => [...prev, audioMetaStr]);
      const updatedList = [...homeworkNotesList, audioMetaStr];
      await syncHomeworkNotes(updatedList);
      await fetchProgress();
      notifyHomeworkChange();
      alert("Loop-Mix erfolgreich gespeichert!");
      setActiveSubTab('saved');
    } catch (err: any) {
      console.error("Export mix failed:", err);
      alert(`Cloud-Speicherung im Campus-Groovelab Hausaufgabenheft fehlgeschlagen: ${err.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadMix = async () => {
    if (!masterLoopDuration) return;
    setIsExporting(true);
    try {
      const baseName = "Mein Loop";
      let uniqueName = baseName;
      let counter = 2;
      const existingLabels = homeworkNotesList
        .filter(note => note.startsWith('LOOP:'))
        .map(note => {
          const parts = note.replace('LOOP:', '').split('|');
          return (parts[3] || 'Loop-Mix').trim();
        });
      while (existingLabels.includes(uniqueName)) {
        uniqueName = `${baseName}${counter}`;
        counter++;
      }

      const inputLabel = prompt("Gib deinem Loop einen Namen für den Download:", uniqueName);
      if (inputLabel === null) {
        setIsExporting(false);
        return;
      }

      let finalLabel = inputLabel.trim() || baseName;
      let checkName = finalLabel;
      let finalCounter = 2;
      while (existingLabels.includes(checkName)) {
        checkName = `${finalLabel}${finalCounter}`;
        finalCounter++;
      }
      const sanitizedLabel = checkName.replace(/\|/g, '-');

      const repsPrompt = prompt("Wie oft soll der Loop im exportierten Song hintereinander wiederholt werden?", "4");
      if (repsPrompt === null) {
        setIsExporting(false);
        return;
      }
      const repetitions = Math.max(1, parseInt(repsPrompt, 10) || 4);
      const totalDurationSec = (masterLoopDuration / 1000) * repetitions;

      const offlineCtx = new OfflineAudioContext(
        2,
        Math.round(totalDurationSec * 44100),
        44100
      );

      tracksRef.current.forEach((track) => {
        const buffer = audioBuffersRef.current[track.id];
        if (buffer && track.url) {
          const hasAnySolo = tracksRef.current.some(t => t.isSoloed);
          const isActive = (hasAnySolo ? track.isSoloed : true) && !track.isMuted;
          if (!isActive) return;

          const source = offlineCtx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;

          const gainNode = offlineCtx.createGain();
          const vol = track.volume / 100;
          gainNode.gain.setValueAtTime(vol, 0);

          source.connect(gainNode);
          gainNode.connect(offlineCtx.destination);

          source.start(0);
        }
      });

      const renderedBuffer = await offlineCtx.startRendering();
      normalizeAudioBuffer(renderedBuffer, 0.95);

      let mixBlob: Blob;
      let fileExt = 'mp3';
      try {
        mixBlob = bufferToMp3(renderedBuffer);
      } catch (mp3Err) {
        console.warn("MP3 conversion failed, falling back to WAV format for download:", mp3Err);
        mixBlob = bufferToWav(renderedBuffer);
        fileExt = 'wav';
      }

      const downloadUrl = URL.createObjectURL(mixBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${sanitizedLabel.toLowerCase().replace(/\s+/g, '_')}_x${repetitions}.${fileExt}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      alert("Loop-Mix erfolgreich heruntergeladen!");
    } catch (err) {
      console.error(err);
      alert("Herunterladen des Mixdowns fehlgeschlagen.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    isComponentMountedRef.current = true;
    return () => {
      isComponentMountedRef.current = false;
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        cancelAnimationFrame(progressIntervalRef.current);
      }
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      if (clickIntervalRef.current) clearInterval(clickIntervalRef.current);
      if (lookaheadTimerRef.current) clearTimeout(lookaheadTimerRef.current);
      if (uiSyncFrameRef.current) cancelAnimationFrame(uiSyncFrameRef.current);

      Object.values(activeSourcesRef.current).forEach((source) => {
        try { source.stop(); } catch (e) {}
      });

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.warn(e));
        audioContextRef.current = null;
        masterCompressorRef.current = null;
        masterGainRef.current = null;
        processorNodeRef.current = null;
      }

      tracksRef.current.forEach((t) => {
        if (t.url) URL.revokeObjectURL(t.url);
      });
    };
  }, []);

  const [meterHeights, setMeterHeights] = useState<{ [key: number]: number }>({ 1: 0, 2: 0, 3: 0, 4: 0 });

  useEffect(() => {
    let animId: any;
    const updateMeters = () => {
      const hasAnySolo = tracks.some(t => t.isSoloed);
      const newMeters: { [key: number]: number } = {};

      tracks.forEach((track) => {
        const hasAudio = !!audioBuffersRef.current[track.id] || !!track.url;
        const isTrackPlaying = (isPlaying || isAutoSequenceActive) && hasAudio && !track.isMuted && (!hasAnySolo || track.isSoloed);

        let meterValue = 0;
        const analyser = analysersRef.current[track.id];

        if (track.isRecording) {
          meterValue = Math.random() > 0.15 ? Math.floor(Math.random() * 8) + 1 : 1;
        } else if (isTrackPlaying) {
          if (analyser) {
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            meterValue = Math.max(0, Math.min(8, Math.round((avg / 160) * 8)));
          }

          if (meterValue <= 2) {
            const currentTick = Math.floor((Date.now() % 4000) / 125);
            const stepIntensity = [5, 2, 3, 1, 6, 2, 4, 1][(currentTick + track.id * 2) % 8];
            meterValue = Math.max(meterValue, stepIntensity);
          }
        }
        newMeters[track.id] = meterValue;
      });

      setMeterHeights(newMeters);
      animId = setTimeout(updateMeters, 50);
    };

    updateMeters();
    return () => clearTimeout(animId);
  }, [isPlaying, isAutoSequenceActive, tracks]);

  const isPause = isAutoSequenceActive && !autoSequenceStatus.includes("AUFNAHME") && !autoSequenceStatus.includes("FERTIG");
  const isAnyTrackRecording = tracks.some(t => t.isRecording);
  const isSavedLoopPlaying = !!playingSavedLoopUrl;
  const ringColor = activeSubTab === 'saved'
    ? (isSavedLoopPlaying ? '#34a853' : '#e5e5e7')
    : (isPause
      ? '#eab308'
      : (isAutoSequenceActive || isAnyTrackRecording)
        ? '#ea4335'
        : isPlaying
          ? '#34a853'
          : '#e5e5e7');

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
      padding: '24px 28px',
      gap: '20px',
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.03)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-recording-card {
          0% { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0.25); border-color: #ea4335; }
          70% { box-shadow: 0 0 0 8px rgba(234, 67, 53, 0); border-color: rgba(234, 67, 53, 0.4); }
          100% { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0); border-color: #ea4335; }
        }
        .recording-card-pulse {
          animation: pulse-recording-card 2s infinite ease-in-out;
        }
        @keyframes glow-record {
          0% { filter: drop-shadow(0 0 3px rgba(234, 67, 53, 0.3)); }
          50% { filter: drop-shadow(0 0 12px rgba(234, 67, 53, 0.8)); }
          100% { filter: drop-shadow(0 0 3px rgba(234, 67, 53, 0.3)); }
        }
        @keyframes glow-play {
          0% { filter: drop-shadow(0 0 3px rgba(52, 168, 83, 0.25)); }
          50% { filter: drop-shadow(0 0 10px rgba(52, 168, 83, 0.65)); }
          100% { filter: drop-shadow(0 0 3px rgba(52, 168, 83, 0.25)); }
        }
        @keyframes glow-pause {
          0% { filter: drop-shadow(0 0 3px rgba(234, 179, 8, 0.3)); }
          50% { filter: drop-shadow(0 0 12px rgba(234, 179, 8, 0.8)); }
          100% { filter: drop-shadow(0 0 3px rgba(234, 179, 8, 0.3)); }
        }
        .glow-record {
          animation: glow-record 2s infinite ease-in-out;
        }
        .glow-play {
          animation: glow-play 2s infinite ease-in-out;
        }
        .glow-pause {
          animation: glow-pause 2s infinite ease-in-out;
        }
        @keyframes central-pulse-play {
          0% { transform: scale(1); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 8px 24px rgba(0,0,0,0.03); }
          50% { transform: scale(1.04); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 12px 32px rgba(52,168,83,0.25); }
          100% { transform: scale(1); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 8px 24px rgba(0,0,0,0.03); }
        }
        @keyframes central-pulse-rec {
          0% { transform: scale(1); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 8px 24px rgba(0,0,0,0.03); }
          50% { transform: scale(1.04); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 12px 32px rgba(234,67,53,0.35); }
          100% { transform: scale(1); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 8px 24px rgba(0,0,0,0.03); }
        }
        @keyframes central-pulse-pause {
          0% { transform: scale(1); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 8px 24px rgba(0,0,0,0.03); }
          50% { transform: scale(1.04); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 12px 32px rgba(234,179,8,0.35); }
          100% { transform: scale(1); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 8px 24px rgba(0,0,0,0.03); }
        }
        .central-pulse-play {
          animation: central-pulse-play 2s infinite ease-in-out;
        }
        .central-pulse-rec {
          animation: central-pulse-rec 2s infinite ease-in-out;
        }
        .central-pulse-pause {
          animation: central-pulse-pause 2s infinite ease-in-out;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .shimmer-active {
          background: linear-gradient(90deg, #34a853 30%, #a7f3d0 50%, #34a853 70%) !important;
          background-size: 200% 100% !important;
          animation: shimmer 1.5s infinite linear !important;
        }
        .tactile-btn:hover:not(:disabled) {
          transform: translateY(-1.5px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
        }
        .tactile-btn:active:not(:disabled) {
          transform: translateY(0.5px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04) !important;
        }
        .groovelab-fader {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 24px;
          background: transparent;
          outline: none;
          cursor: pointer;
        }
        .groovelab-fader::-webkit-slider-runnable-track {
          width: 100%;
          height: 6px;
          background: linear-gradient(to bottom, #a0aec0 0%, #1a202c 35%, #1a202c 65%, #a0aec0 100%);
          border-radius: 3px;
          box-shadow: inset 0 1.5px 3px rgba(0,0,0,0.4);
        }
        .groovelab-fader::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 26px;
          border-radius: 3px;
          background: linear-gradient(to bottom, #f1f5f9 0%, #ffffff 42%, #0f172a 43%, #0f172a 57%, #ffffff 58%, #cbd5e1 100%);
          border: 1px solid #64748b;
          box-shadow: 0 3px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3);
          margin-top: -10px;
          transition: transform 0.1s ease;
        }
        .groovelab-fader::-webkit-slider-thumb:hover {
          transform: scale(1.05);
        }
        .groovelab-fader::-moz-range-track {
          width: 100%;
          height: 6px;
          background: linear-gradient(to bottom, #a0aec0 0%, #1a202c 35%, #1a202c 65%, #a0aec0 100%);
          border-radius: 3px;
          box-shadow: inset 0 1.5px 3px rgba(0,0,0,0.4);
        }
        .groovelab-fader::-moz-range-thumb {
          width: 18px;
          height: 26px;
          border-radius: 3px;
          background: linear-gradient(to bottom, #f1f5f9 0%, #ffffff 42%, #0f172a 43%, #0f172a 57%, #ffffff 58%, #cbd5e1 100%);
          border: 1px solid #64748b;
          box-shadow: 0 3px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3);
          transition: transform 0.1s ease;
        }
        .groovelab-fader::-moz-range-thumb:hover {
          transform: scale(1.05);
        }
        .daw-console-strip {
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .daw-console-strip:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.05) !important;
          border-color: rgba(52, 168, 83, 0.15) !important;
        }
      `}} />

      {/* Sub-Tab Navigation Header */}
      <div style={{
        display: 'flex',
        background: '#e5e5ea',
        borderRadius: '12px',
        padding: '3px',
        width: '100%',
        maxWidth: '560px',
        marginBottom: '20px'
      }}>
        <button
          type="button"
          onClick={() => {
            if (playingSavedLoopUrl) {
              if (savedLoopAudioRef.current) savedLoopAudioRef.current.pause();
              setPlayingSavedLoopUrl(null);
            }
            setActiveSubTab('studio');
          }}
          className="tactile-btn"
          style={{
            flex: 1,
            background: activeSubTab === 'studio' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'studio' ? '#1d1d1f' : '#86868b',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '0.74rem',
            fontWeight: activeSubTab === 'studio' ? 800 : 600,
            cursor: 'pointer',
            boxShadow: activeSubTab === 'studio' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Sliders size={14} />
          <span>Studio</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('saved')}
          className="tactile-btn"
          style={{
            flex: 1,
            background: activeSubTab === 'saved' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'saved' ? '#1d1d1f' : '#86868b',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '0.74rem',
            fontWeight: activeSubTab === 'saved' ? 800 : 600,
            cursor: 'pointer',
            boxShadow: activeSubTab === 'saved' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Music size={14} />
          <span>Gespeicherte Loops</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('guide')}
          className="tactile-btn"
          style={{
            flex: 1,
            background: activeSubTab === 'guide' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'guide' ? '#1d1d1f' : '#86868b',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '0.74rem',
            fontWeight: activeSubTab === 'guide' ? 800 : 600,
            cursor: 'pointer',
            boxShadow: activeSubTab === 'guide' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <BookOpen size={14} />
          <span>Anleitung & Pro-Tipps</span>
        </button>
      </div>

      {activeSubTab === 'guide' ? (
        <div style={{
          width: '100%',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.85) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: '28px',
          border: '1.5px solid rgba(0, 0, 0, 0.08)',
          padding: '32px',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            paddingBottom: '20px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                color: '#d97706',
                width: '54px',
                height: '54px',
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(217, 119, 6, 0.2)'
              }}>
                <Zap size={28} color="#d97706" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 950, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  Loopstation Masterclass: Anleitung & Pro-Tipps
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: 600 }}>
                  Maximale Sound-Qualität & tanzbare Perfektion für deinen Musikunterricht & zu Hause
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinishOnboarding}
              className="tactile-btn"
              style={{
                background: '#34a853',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '12px 22px',
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(52, 168, 83, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Verstanden & Studio starten! 🚀</span>
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            width: '100%'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1.5px solid rgba(0, 0, 0, 0.05)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#e0e7ff', color: '#4f46e5', width: '44px', height: '44px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Headphones size={22} color="#4f46e5" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>1. Kopfhörer-Modus verwenden</span>
                  <span style={{ fontSize: '0.70rem', color: '#4f46e5', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Keine Übersprechungen</span>
                </div>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Verwende vorzugsweise <strong>kabelgebundene Kopfhörer</strong>. Dadurch hörst du das Metronom und deine bereits aufgenommenen Spuren in voller Lautstärke, ohne dass der Lautsprecher-Sound erneut vom Mikrofon mit aufgenommen wird.
              </p>
              <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '12px', border: '1px dashed #cbd5e1', fontSize: '0.74rem', color: '#475569', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Headphones size={16} color="#4f46e5" />
                <span>Ergebnis: Glasklares Mehrspur-Recording ohne störendes Hallen oder Dopplungen.</span>
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1.5px solid rgba(0, 0, 0, 0.05)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#fef3c7', color: '#d97706', width: '44px', height: '44px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={22} color="#d97706" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>2. Die 4-Takte-Zwischenpause</span>
                  <span style={{ fontSize: '0.70rem', color: '#d97706', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>100% Sample-Accurate Sync</span>
                </div>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Zwischen jeder Aufnahmespur schaltet die Loopstation automatisch eine <strong>4-Takte-Pause</strong> ein. Nutze diese Pause, um dich entspannt auf die nächste Instrumentenspur vorzubereiten und im Groove zu bleiben.
              </p>
              <div style={{ background: '#fffbeb', borderRadius: '14px', padding: '12px', border: '1px dashed #fde68a', fontSize: '0.74rem', color: '#b45309', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#d97706" />
                <span>Zero Swallowed Attack: Die erste Note deiner neuen Spur klingt exakt zum Taktstrich aus.</span>
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1.5px solid rgba(0, 0, 0, 0.05)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#e6f4ea', color: '#34a853', width: '44px', height: '44px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RotateCcw size={22} color="#34a853" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>3. Spur im laufenden Loop ersetzen</span>
                  <span style={{ fontSize: '0.70rem', color: '#34a853', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Punktgenauer Takt-Snap</span>
                </div>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Gefällt dir eine Spur nicht? Klicke bei laufendem Loop einfach erneut auf das Mikrofon der Spur (<code>⏳ WARTET</code>). Die alte Aufnahme wird am Taktende gestoppt und die neue startet automatisch exakt zu Takt 1 des nächsten Zyklus!
              </p>
              <div style={{ background: '#f0fdf4', borderRadius: '14px', padding: '12px', border: '1px dashed #bbf7d0', fontSize: '0.74rem', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={16} color="#34a853" />
                <span>Nahtloser Workflow: Ersetze einzelne Spuren beliebig oft, ohne den Gesamtmix anzuhalten.</span>
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1.5px solid rgba(0, 0, 0, 0.05)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#fce8e6', color: '#ea4335', width: '44px', height: '44px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={22} color="#ea4335" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>4. Unterbrechungsfreies Spur-Löschen</span>
                  <span style={{ fontSize: '0.70rem', color: '#ea4335', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Doppelte Bestätigung</span>
                </div>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Klicke auf das Mülleimer-Icon am Ende einer Spur. Nach doppelter Sicherheitsbestätigung wird die Spur gelöscht. Alle anderen Spuren spielen ohne Unterbrechung weiter, und du kannst die freie Spur sofort neu einspielen.
              </p>
              <div style={{ background: '#fef2f2', borderRadius: '14px', padding: '12px', border: '1px dashed #fecaca', fontSize: '0.74rem', color: '#b91c1c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={16} color="#ea4335" />
                <span>Maximale Sicherheit: Verhindert versehentliches Löschen und hält deine Band im Takt.</span>
              </div>
            </div>
          </div>
        </div>
      ) : (

      <div style={{ display: 'flex', gap: '20px', flex: 1, width: '100%' }} className="flex-col md:flex-row items-center md:items-start">
      <div style={{
        flex: '1 1 0%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '20px',
        width: '100%',
        maxWidth: '300px'
      }}>
        <div style={{
          width: '300px',
          height: '460px',
          background: 'linear-gradient(135deg, #3c3c3e 0%, #1c1c1e 100%)',
          borderRadius: '38px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.35), inset 0 1.5px 0 rgba(255, 255, 255, 0.15), inset 0 -2px 5px rgba(0,0,0,0.5)',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          boxSizing: 'border-box'
        }}>
          <div style={{
            position: 'absolute',
            inset: '1px',
            borderRadius: '37px',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            pointerEvents: 'none'
          }} />

          <div style={{
            width: '266px',
            height: '180px',
            background: 'linear-gradient(180deg, #18202c 0%, #0d1218 100%)',
            borderRadius: '20px',
            border: '2.5px solid #111112',
            boxShadow: 'inset 0 6px 12px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0) 41%, rgba(255,255,255,0) 100%)',
              pointerEvents: 'none',
              zIndex: 10
            }} />

            <div style={{
              position: 'relative',
              width: '156px',
              height: '156px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent'
            }}>
              {activeBeatPulse && (
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '-8px',
                  right: '-8px',
                  bottom: '-8px',
                  borderRadius: '50%',
                  border: activeBeatPulse === 'downbeat' ? '3.5px solid #ea4335' : '2.5px solid #34a853',
                  boxShadow: activeBeatPulse === 'downbeat'
                    ? '0 0 16px #ea4335, inset 0 0 10px #ea4335'
                    : '0 0 12px #34a853, inset 0 0 8px #34a853',
                  opacity: 0.95,
                  pointerEvents: 'none',
                  zIndex: 25,
                  transition: 'all 0.05s ease-out'
                }} />
              )}

              <svg
                viewBox="0 0 200 200"
                className={activeSubTab === 'saved' ? (isSavedLoopPlaying ? 'glow-play' : '') : (isPause ? 'glow-pause' : (isAnyTrackRecording || isAutoSequenceActive) ? 'glow-record' : isPlaying ? 'glow-play' : '')}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  transform: 'rotate(-90deg) translate3d(0,0,0)',
                  willChange: 'transform',
                  transition: 'filter 0.3s ease'
                }}
              >
                <circle
                  cx="100"
                  cy="100"
                  r="84"
                  stroke="#222b39"
                  strokeWidth="5"
                  fill="none"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="84"
                  stroke={ringColor}
                  strokeWidth="7"
                  fill="none"
                  strokeDasharray="527.8 527.8"
                  strokeDashoffset={527.8 - (527.8 * playbackProgress) / 100}
                  strokeLinecap="round"
                  style={{
                    transition: (isPlaying || isAutoSequenceActive || isSavedLoopPlaying) ? 'none' : 'stroke-dashoffset 0.2s ease-out',
                    willChange: 'stroke-dashoffset'
                  }}
                />
              </svg>

              <div
                className={activeSubTab === 'saved' ? (isSavedLoopPlaying ? 'central-pulse-play' : '') : (isPause ? 'central-pulse-pause' : (isAnyTrackRecording || isAutoSequenceActive) ? 'central-pulse-rec' : isPlaying ? 'central-pulse-play' : '')}
                style={{
                  position: 'absolute',
                  width: '124px',
                  height: '124px',
                  borderRadius: '50%',
                  background: activeSubTab === 'saved'
                    ? (isSavedLoopPlaying ? 'radial-gradient(circle, rgba(52,168,83,0.12) 0%, rgba(13,18,24,0.98) 100%)' : 'radial-gradient(circle, rgba(40,48,64,0.9) 0%, rgba(13,18,24,0.98) 100%)')
                    : (isAutoSequenceActive
                      ? 'radial-gradient(circle, rgba(239,68,68,0.12) 0%, rgba(13,18,24,0.98) 100%)'
                      : isPlaying
                        ? 'radial-gradient(circle, rgba(52,168,83,0.12) 0%, rgba(13,18,24,0.98) 100%)'
                        : 'radial-gradient(circle, rgba(40,48,64,0.9) 0%, rgba(13,18,24,0.98) 100%)'),
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08)',
                  transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)'
                }}
              >
                <span style={{
                  fontSize: '1.9rem',
                  fontWeight: 800,
                  fontFamily: '"Outfit", "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '0.02em',
                  color: ringColor === '#e5e5e7' ? '#e2e8f0' : ringColor,
                  textShadow: ringColor !== '#e5e5e7' ? `0 2px 10px ${ringColor}35` : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {activeSubTab === 'saved'
                    ? (isSavedLoopPlaying
                      ? `${Math.floor((playbackProgress / 100) * (selectedSavedLoop ? Number(selectedSavedLoop.duration) : 8))}s`
                      : '0s')
                    : (countInBeats !== null
                      ? `00 | 0${countInBeats.toString().charAt(0)}`
                      : (isPlaying || isAutoSequenceActive)
                        ? `${currentBar.toString().padStart(2, '0')} | ${currentBeat.toString().padStart(2, '0')}`
                        : '01 | 01')}
                </span>

                {activeSubTab !== 'saved' && (
                  <div style={{ display: 'flex', gap: '3px', marginTop: '3px', marginBottom: '2px', alignItems: 'center' }}>
                    {[1, 2, 3, 4].map((b) => {
                      const maxBeats = timeSignature === '3/4' ? 3 : 4;
                      if (b > maxBeats) return null;
                      const isActive = (isPlaying || isAutoSequenceActive) && currentBeat === b;
                      return (
                        <div
                          key={b}
                          style={{
                            width: '6px',
                            height: '2px',
                            borderRadius: '1px',
                            background: isActive
                              ? (ringColor === '#e5e5e7' ? '#ef4444' : ringColor)
                              : 'rgba(255, 255, 255, 0.12)',
                            boxShadow: isActive
                              ? `0 0 5px ${ringColor === '#e5e5e7' ? '#ef4444' : ringColor}`
                              : 'none',
                            transition: 'all 0.1s ease'
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                <span style={{
                  fontSize: '0.45rem',
                  color: '#7b8a9e',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  marginTop: '1px',
                  textTransform: 'uppercase'
                }}>
                  {activeSubTab === 'saved'
                    ? (isSavedLoopPlaying ? 'PLAYBACK' : 'ARCHIVE')
                    : (countInBeats !== null ? (isPause ? 'WAIT' : (isAutoSequenceActive ? 'CALIBRATION' : 'COUNT')) : isPlaying ? 'PLAYBACK' : isAutoSequenceActive ? 'RECORD' : 'OFFLINE')}
                </span>
              </div>
            </div>

            {activeSubTab === 'studio' && isAutoSequenceActive && (
              <span style={{
                position: 'absolute',
                bottom: '6px',
                fontSize: '0.44rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: isPause ? '#eab308' : '#ef4444',
                textTransform: 'uppercase',
                animation: 'pulse 1s infinite alternate'
              }}>
                {autoSequenceStatus}
              </span>
            )}
            {activeSubTab === 'saved' && selectedSavedLoop && (
              <span style={{
                position: 'absolute',
                bottom: '8px',
                fontSize: '0.52rem',
                fontWeight: 800,
                color: '#e2e8f0',
                width: '90%',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '0.02em'
              }}>
                {selectedSavedLoop.label}
              </span>
            )}
          </div>

          <div style={{
            width: '210px',
            height: '210px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2d2d30 0%, #1e1e20 100%)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.08), inset 0 -1.5px 3px rgba(0,0,0,0.4)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none'
          }}>
            <div
              onClick={() => {
                if (activeSubTab === 'studio') {
                  setShowAdvancedSettings(!showAdvancedSettings);
                }
              }}
              style={{
                position: 'absolute',
                top: '18px',
                fontSize: '0.62rem',
                fontWeight: 900,
                color: activeSubTab === 'saved' ? '#555558' : '#a1a1a6',
                letterSpacing: '0.08em',
                transition: 'color 0.2s ease',
                cursor: activeSubTab === 'saved' ? 'default' : 'pointer'
              }}
              onMouseEnter={(e) => { if (activeSubTab === 'studio') e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { if (activeSubTab === 'studio') e.currentTarget.style.color = '#a1a1a6'; }}
            >
              MENU
            </div>

            <div
              onClick={() => {
                if (activeSubTab === 'saved') {
                  if (selectedSavedLoop) handlePlaySavedLoop(selectedSavedLoop.url);
                } else {
                  handlePlayToggle();
                }
              }}
              style={{
                position: 'absolute',
                bottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.56rem',
                fontWeight: 900,
                color: '#a1a1a6',
                transition: 'color 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1a6'; }}
            >
              {activeSubTab === 'saved'
                ? (isSavedLoopPlaying ? <Square size={6} fill="currentColor" /> : <Play size={6} fill="currentColor" />)
                : (isPlaying ? <Square size={6} fill="currentColor" /> : <Play size={6} fill="currentColor" />)}
              <span>PLAY / PAUSE</span>
            </div>

            <div
              onClick={() => {
                if (activeSubTab === 'saved') {
                  if (savedLoopAudioRef.current) {
                    savedLoopAudioRef.current.currentTime = 0;
                    setPlaybackProgress(0);
                  }
                } else {
                  const hasRecordedTracks = tracks.some(t => t.url);
                  if (hasRecordedTracks) {
                    const wasPlaying = isPlayingRef.current;
                    if (wasPlaying) {
                      stopAll();
                    }
                    setTimeout(() => {
                      const confirmReset = window.confirm("Möchtest du deinen aktuellen Loop wirklich löschen und neu aufnehmen?");
                      if (!confirmReset) {
                        if (wasPlaying) {
                          playAll();
                        }
                        return;
                      }
                      handleReset();
                    }, 50);
                    return;
                  }
                  handleReset();
                }
              }}
              style={{
                position: 'absolute',
                left: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.56rem',
                fontWeight: 900,
                color: '#a1a1a6',
                transition: 'color 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1a6'; }}
            >
              <RotateCcw size={6} />
              <span>RESET</span>
            </div>

            <div
              style={{
                position: 'absolute',
                right: '20px',
                fontSize: '0.56rem',
                fontWeight: 900,
                color: '#555558',
                letterSpacing: '0.04em'
              }}
            >
              SELECT
            </div>

            <button
              type="button"
              onClick={() => {
                if (activeSubTab === 'saved') {
                  if (selectedSavedLoop) handlePlaySavedLoop(selectedSavedLoop.url);
                } else {
                  if (isPlaying) {
                    stopAll();
                  } else {
                    const hasBouncedOverdubAvailable = useHeadphones && !!tracks[0]?.url && tracks.slice(1).every(t => !t.url);
                    if (hasBouncedOverdubAvailable) {
                      startAutoSequence();
                    } else {
                      const hasRecordedTracks = tracks.some(t => t.url);
                      if (hasRecordedTracks) {
                        playAll();
                      } else {
                        startAutoSequence();
                      }
                    }
                  }
                }
              }}
              disabled={activeSubTab === 'studio' && isAutoSequenceActive}
              className="tactile-btn"
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: (() => {
                  if (activeSubTab === 'saved') {
                    return isSavedLoopPlaying ? 'linear-gradient(135deg, #6ee7b7 0%, #34a853 100%)' : 'linear-gradient(135deg, #e5e5ea 0%, #d1d1d6 100%)';
                  }
                  if (isPause) return 'linear-gradient(135deg, #facc15 0%, #eab308 100%)';
                  if (isAutoSequenceActive || tracks.some(t => t.isRecording || t.isWaiting)) {
                    return 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)';
                  }
                  if (isPlaying) return 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)';

                  const hasBouncedOverdubAvailable = useHeadphones && !!tracks[0]?.url && tracks.slice(1).every(t => !t.url);
                  if (hasBouncedOverdubAvailable) {
                    return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                  }

                  const hasRecordedTracks = tracks.some(t => t.url);
                  if (hasRecordedTracks) {
                    return 'linear-gradient(135deg, #6ee7b7 0%, #34a853 100%)';
                  }
                  return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                })(),
                border: '1.5px solid rgba(0, 0, 0, 0.15)',
                boxShadow: (activeSubTab === 'studio' && (isAutoSequenceActive || (useHeadphones && !!tracks[0]?.url && tracks.slice(1).every(t => !t.url))))
                  ? '0 0 16px rgba(239, 68, 68, 0.45)'
                  : 'inset 0 1.5px 2px rgba(255,255,255,0.6), 0 4px 8px rgba(0,0,0,0.25)',
                cursor: (activeSubTab === 'studio' && isAutoSequenceActive) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 900,
                color: (activeSubTab === 'saved' ? isSavedLoopPlaying : (isAutoSequenceActive || isPause || isPlaying || (useHeadphones && !!tracks[0]?.url && tracks.slice(1).every(t => !t.url)))) ? '#ffffff' : '#3a3a3c',
                textTransform: 'uppercase',
                transition: 'all 0.25s ease'
              }}
            >
              {(() => {
                if (activeSubTab === 'saved') return isSavedLoopPlaying ? 'PLAY' : 'START';
                if (isAutoSequenceActive || tracks.some(t => t.isRecording || t.isWaiting)) return 'REC';
                if (isPlaying) return 'STOP';

                const hasBouncedOverdubAvailable = useHeadphones && !!tracks[0]?.url && tracks.slice(1).every(t => !t.url);
                if (hasBouncedOverdubAvailable) {
                  return 'REC';
                }

                const hasRecordedTracks = tracks.some(t => t.url);
                if (hasRecordedTracks) {
                  return 'PLAY';
                }
                return 'RECORD';
              })()}
            </button>
          </div>
        </div>

        {activeSubTab === 'studio' ? (
          masterLoopDuration ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '300px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={handleExportMix}
                disabled={isExporting}
                className="tactile-btn"
                style={{
                  background: '#34a853',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  width: '100%',
                  boxShadow: '0 4px 12px rgba(52, 168, 83, 0.15)',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.02em'
                }}
              >
                {isExporting ? 'SPEICHERE...' : 'LOOP SPEICHERN'}
              </button>
              <button
                type="button"
                onClick={handleDownloadMix}
                disabled={isExporting}
                className="tactile-btn"
                style={{
                  background: '#1d1d1f',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  width: '100%',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.02em'
                }}
              >
                {isExporting ? 'RENDERE MP3...' : 'MP3 SPEICHERN'}
              </button>
            </div>
          ) : (
            <div style={{
              width: '100%',
              maxWidth: '300px',
              background: 'rgba(255, 255, 255, 0.45)',
              border: '1.5px dashed rgba(0, 0, 0, 0.08)',
              borderRadius: '20px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textAlign: 'center',
              marginTop: '4px'
            }}>
              <Music size={16} style={{ color: '#86868b' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#1d1d1f' }}>
                  Bereit zum Recorden
                </span>
                <span style={{ fontSize: '0.54rem', color: '#86868b', lineHeight: 1.3 }}>
                  Klicke die mittlere Taste <strong>START</strong> am iPod, um den automatischen Aufnahmezyklus zu starten.
                </span>
              </div>
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '300px' }}>
            <div style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.45)',
              border: '1.5px dashed rgba(0, 0, 0, 0.08)',
              borderRadius: '20px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textAlign: 'center',
              marginTop: '4px'
            }}>
              <Music size={16} style={{ color: '#86868b' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#1d1d1f' }}>
                  Archiv-Modus
                </span>
                <span style={{ fontSize: '0.54rem', color: '#86868b', lineHeight: 1.3 }}>
                  Wähle einen Loop aus der Liste. Steuere die Wiedergabe über das <strong>Click Wheel</strong> am iPod.
                </span>
              </div>
            </div>
            {selectedSavedLoop && (
              <button
                type="button"
                onClick={async (e) => {
                  const btn = e.currentTarget;
                  const originalText = btn.innerText;
                  btn.innerText = "LADE...";
                  btn.disabled = true;
                  try {
                    const response = await fetch(selectedSavedLoop.url);
                    const arrayBuffer = await response.arrayBuffer();

                    btn.innerText = "DECODIERE...";
                    const ctx = audioContextRef.current || new AudioContext();
                    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

                    const repsPrompt = prompt("Wie oft soll der Loop im exportierten Song hintereinander wiederholt werden?", "4");
                    if (repsPrompt === null) {
                      btn.innerText = originalText;
                      btn.disabled = false;
                      return;
                    }
                    const repetitions = Math.max(1, parseInt(repsPrompt, 10) || 4);

                    btn.innerText = "RENDERE...";
                    const totalDurationSec = audioBuffer.duration * repetitions;
                    const offlineCtx = new OfflineAudioContext(
                      2,
                      Math.round(totalDurationSec * 44100),
                      44100
                    );

                    const source = offlineCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.loop = true;

                    source.connect(offlineCtx.destination);
                    source.start(0);

                    const renderedBuffer = await offlineCtx.startRendering();
                    normalizeAudioBuffer(renderedBuffer, 0.95);

                    btn.innerText = "KONVERTIERE...";
                    let mixBlob: Blob;
                    let fileExt = 'mp3';
                    try {
                      mixBlob = bufferToMp3(renderedBuffer);
                    } catch (mp3Err) {
                      console.warn("MP3 conversion failed, falling back to WAV:", mp3Err);
                      mixBlob = bufferToWav(renderedBuffer);
                      fileExt = 'wav';
                    }

                    const downloadUrl = URL.createObjectURL(mixBlob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = `${(selectedSavedLoop.label || 'loop').toLowerCase().replace(/\s+/g, '_')}_x${repetitions}.${fileExt}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(downloadUrl);
                  } catch (err) {
                    console.error("Archive export failed, falling back to direct download:", err);
                    try {
                      const response = await fetch(selectedSavedLoop.url);
                      const blob = await response.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = blobUrl;
                      a.download = `${selectedSavedLoop.label || 'loop'}.mp3`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(blobUrl);
                    } catch (fallbackErr) {
                      window.open(selectedSavedLoop.url, '_blank');
                    }
                  } finally {
                    btn.innerText = originalText;
                    btn.disabled = false;
                  }
                }}
                className="tactile-btn"
                style={{
                  background: '#1d1d1f',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.02em'
                }}
              >
                MP3 SPEICHERN
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{
        flex: '1.2 1 0%',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '2px 0',
        justifyContent: 'flex-start'
      }}>
        {activeSubTab === 'studio' ? (
          <>
        <div style={{
          width: '100%',
          background: 'linear-gradient(135deg, #ffffff 0%, #f4f5f8 100%)',
          border: '1.5px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '20px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.03)',
          marginBottom: '8px'
        }}>
          <style>{`
            .apple-slider {
              -webkit-appearance: none;
              appearance: none;
              height: 4px;
              border-radius: 2px;
              outline: none;
              transition: background 0.1s ease;
            }
            .apple-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: #ffffff;
              border: 0.5px solid rgba(0, 0, 0, 0.15);
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(0, 0, 0, 0.1);
              cursor: pointer;
              transition: transform 0.1s ease;
            }
            .apple-slider::-webkit-slider-thumb:hover {
              transform: scale(1.1);
            }
            .apple-slider::-webkit-slider-thumb:active {
              transform: scale(0.95);
            }
            .apple-slider::-moz-range-thumb {
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: #ffffff;
              border: 0.5px solid rgba(0, 0, 0, 0.15);
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(0, 0, 0, 0.1);
              cursor: pointer;
              border: none;
            }
            .custom-daw-scrollbar::-webkit-scrollbar {
              width: 5px;
            }
            .custom-daw-scrollbar::-webkit-scrollbar-track {
              background: rgba(0, 0, 0, 0.03);
              border-radius: 4px;
            }
            .custom-daw-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(0, 0, 0, 0.18);
              border-radius: 4px;
            }
            .custom-daw-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(52, 168, 83, 0.5);
            }
            .groovelab-fader {
              -webkit-appearance: none;
              appearance: none;
              width: 100%;
              height: 20px;
              background: transparent;
              outline: none;
              cursor: pointer;
              margin: 0;
              padding: 0;
              display: flex;
              align-items: center;
            }
            .groovelab-fader::-webkit-slider-runnable-track {
              width: 100%;
              height: 5px;
              background: rgba(0, 0, 0, 0.12);
              border-radius: 3px;
              border: none;
            }
            .groovelab-fader::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 15px;
              height: 15px;
              border-radius: 50%;
              background: #ffffff;
              border: 1.5px solid rgba(0, 0, 0, 0.2);
              box-shadow: 0 1.5px 4px rgba(0, 0, 0, 0.25);
              margin-top: -5px;
              cursor: pointer;
              transition: transform 0.1s ease;
            }
            .groovelab-fader::-webkit-slider-thumb:hover {
              transform: scale(1.15);
              border-color: #34a853;
            }
            .groovelab-fader::-moz-range-track {
              width: 100%;
              height: 5px;
              background: rgba(0, 0, 0, 0.12);
              border-radius: 3px;
            }
            .groovelab-fader::-moz-range-thumb {
              width: 15px;
              height: 15px;
              border-radius: 50%;
              background: #ffffff;
              border: 1.5px solid rgba(0, 0, 0, 0.2);
              box-shadow: 0 1.5px 4px rgba(0, 0, 0, 0.25);
              cursor: pointer;
            }
          `}</style>
          <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'center' }}>
            <div
              onClick={() => {
                if (!isAutoSequenceActive) {
                  isManualHeadphonesRef.current = true;
                  setUseHeadphones(!useHeadphones);
                }
              }}
              style={{
                flex: 1.3,
                background: useHeadphones ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' : '#ffffff',
                border: useHeadphones ? '1.5px solid #34a853' : '1.5px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '12px',
                padding: '8px 12px',
                cursor: isAutoSequenceActive ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                transition: 'all 0.25s ease',
                opacity: isAutoSequenceActive ? 0.6 : 1
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Headphones size={13} style={{ color: useHeadphones ? '#2e7d32' : '#86868b' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: useHeadphones ? '#2e7d32' : '#1d1d1f' }}>
                    Kopfhörer-Modus
                  </span>
                  <span style={{ fontSize: '0.50rem', color: '#616161', fontWeight: 500 }}>
                    Mehrspur aktiv
                  </span>
                </div>
              </div>

              <div style={{
                width: '32px',
                height: '18px',
                borderRadius: '99px',
                background: useHeadphones ? '#34a853' : 'rgba(0, 0, 0, 0.08)',
                position: 'relative',
                transition: 'all 0.25s ease',
                padding: '2px'
              }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  position: 'absolute',
                  left: useHeadphones ? '16px' : '2px',
                  top: '2px',
                  transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }} />
              </div>
            </div>

            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff',
              border: '1.5px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '12px',
              padding: '8px 12px'
            }}>
              <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#55555d' }}>
                Spuren:
              </span>
              <select
                value={desiredTrackCount}
                onChange={(e) => setDesiredTrackCount(parseInt(e.target.value))}
                disabled={isAutoSequenceActive}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  color: '#1d1d1f',
                  cursor: isAutoSequenceActive ? 'not-allowed' : 'pointer',
                  outline: 'none'
                }}
              >
                <option value={1}>1 Spur</option>
                <option value={2}>2 Spuren</option>
                {useHeadphones && (
                  <>
                    <option value={3}>3 Spuren</option>
                    <option value={4}>4 Spuren</option>
                  </>
                )}
              </select>
            </div>

            <div
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              style={{
                flex: 1.5,
                background: showAdvancedSettings ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' : '#ffffff',
                border: showAdvancedSettings ? '1.5px solid #1976d2' : '1.5px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '12px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                transition: 'all 0.25s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={13} style={{ color: showAdvancedSettings ? '#1565c0' : '#86868b' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: showAdvancedSettings ? '#1565c0' : '#1d1d1f' }}>
                    Metronom
                  </span>
                  <span style={{ fontSize: '0.50rem', color: '#616161', fontWeight: 500 }}>
                    Click {isMetronomeActive ? 'AN' : 'AUS'}
                  </span>
                </div>
              </div>

              <div
                style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setBpm(prev => Math.max(40, prev - 1))}
                  className="tactile-btn"
                  style={{
                    width: '22px',
                    height: '24px',
                    background: 'rgba(0, 0, 0, 0.04)',
                    border: 'none',
                    color: '#1d1d1f',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  -
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={bpm}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                    if (cleanVal === '') {
                      setBpm(0 as any);
                    } else {
                      const num = parseInt(cleanVal);
                      if (!isNaN(num)) {
                        setBpm(Math.min(240, num));
                      }
                    }
                  }}
                  onBlur={() => {
                    if (bpm < 40) setBpm(40);
                    if (bpm > 240) setBpm(240);
                  }}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    fontFamily: 'SF Mono, monospace',
                    width: '32px',
                    height: '24px',
                    textAlign: 'center',
                    color: '#1d1d1f',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '4px',
                    background: '#ffffff',
                    padding: 0,
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setBpm(prev => Math.min(240, prev + 1))}
                  className="tactile-btn"
                  style={{
                    width: '22px',
                    height: '24px',
                    background: 'rgba(0, 0, 0, 0.04)',
                    border: 'none',
                    color: '#1d1d1f',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  +
                </button>
              </div>

              <ChevronRight size={12} style={{
                color: showAdvancedSettings ? '#1565c0' : '#86868b',
                transition: 'transform 0.2s',
                transform: showAdvancedSettings ? 'rotate(90deg)' : 'none'
              }} />
            </div>

            {/* Prominent Latency Calibration Quick-Control Pill */}
            <div
              onClick={() => {
                const confirmReCalib = window.confirm("Automatische Cubase Latenz-Einmessung neu starten?");
                if (!confirmReCalib) return;
                isManualLatencyAdjustmentRef.current = false;
                localStorage.removeItem('groovelab_latency_calibrated');
                localStorage.removeItem('groovelab_sync_offset_ms');
                setIsDeviceCalibrated(false);
                runAutoCalibrationSequence();
              }}
              style={{
                flex: 1.2,
                background: isDeviceCalibrated ? 'linear-gradient(135deg, #e6f4ea 0%, #d1fae5 100%)' : 'linear-gradient(135deg, #fef3c7 0%, #fef08a 100%)',
                border: isDeviceCalibrated ? '1.5px solid #a7f3d0' : '1.5px solid #fde047',
                borderRadius: '12px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                transition: 'all 0.25s ease',
                boxShadow: isDeviceCalibrated ? '0 2px 8px rgba(52, 168, 83, 0.12)' : '0 2px 8px rgba(217, 119, 6, 0.12)'
              }}
              className="hover-scale-mini tactile-btn"
              title="Klicken, um automatische Cubase Latenz-Einmessung neu zu starten"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={13} style={{ color: isDeviceCalibrated ? '#34a853' : '#d97706' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: isDeviceCalibrated ? '#1b5e20' : '#b45309' }}>
                    Latenz-Ausgleich
                  </span>
                  <span style={{ fontSize: '0.50rem', color: isDeviceCalibrated ? '#2e7d32' : '#d97706', fontWeight: 700 }}>
                    {isDeviceCalibrated ? '🎯 Kalibriert' : '⚡ Auto-Einmessen'}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '0.64rem', color: isDeviceCalibrated ? '#34a853' : '#d97706', fontWeight: 900, fontFamily: 'SF Mono, monospace' }}>
                {syncOffsetMs > 0 ? '+' : ''}{syncOffsetMs}ms
              </span>
            </div>
          </div>

          {/* Analog Tape Machine Bounce Down Bar */}
          {(tracks.filter(t => !!t.url).length >= 2 || bounceBackupState !== null) && (
            <div style={{
              width: '100%',
              background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
              border: '1.5px solid #fde047',
              borderRadius: '12px',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(234, 179, 8, 0.12)',
              marginTop: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={14} style={{ color: '#ca8a04' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#854d0e' }}>
                    Analoger Bandmaschinen Bounce (Ping-Pong Recording)
                  </span>
                  <span style={{ fontSize: '0.52rem', color: '#a16207', fontWeight: 600 }}>
                    Mixe alle Spuren (1-4) auf Spur 1 zusammen & schalte Spur 2-4 für neue Aufnahmen frei!
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {bounceBackupState && (
                  <button
                    type="button"
                    onClick={handleUndoBounce}
                    className="tactile-btn"
                    style={{
                      background: '#ffffff',
                      color: '#64748b',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RotateCcw size={11} />
                    Rückgängig
                  </button>
                )}

                {tracks.filter(t => !!t.url).length >= 2 && (
                  <button
                    type="button"
                    onClick={handleBounceTracks}
                    disabled={!useHeadphones || isBouncing || isPlaying || isAutoSequenceActive}
                    title={!useHeadphones ? "Bitte aktiviere den Kopfhörer-Modus für Bandmaschinen-Bounce" : "Mixe Spuren 1-4 auf Spur 1 zusammen"}
                    className="tactile-btn"
                    style={{
                      background: useHeadphones ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' : '#cbd5e1',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '5px 12px',
                      fontSize: '0.64rem',
                      fontWeight: 900,
                      cursor: (!useHeadphones || isBouncing || isPlaying || isAutoSequenceActive) ? 'not-allowed' : 'pointer',
                      opacity: (!useHeadphones || isBouncing || isPlaying || isAutoSequenceActive) ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: useHeadphones ? '0 2px 6px rgba(202, 138, 4, 0.3)' : 'none'
                    }}
                  >
                    <Layers size={12} />
                    {!useHeadphones ? '🎧 Kopfhörer-Modus erforderlich' : (isBouncing ? 'Bouncen...' : '🎛️ Spuren zusammenführen (Bounce)')}
                  </button>
                )}
              </div>
            </div>
          )}

          {showAdvancedSettings && (
            <div style={{
              borderTop: '1.5px solid rgba(0, 0, 0, 0.06)',
              paddingTop: '12px',
              marginTop: '4px',
              width: '100%',
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div style={{
                flex: '1.3 1 360px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {isMetronomeActive && !useHeadphones && (
                  <div style={{
                    fontSize: '0.54rem',
                    color: '#ea4335',
                    fontWeight: 700,
                    padding: '4px 8px',
                    background: '#fce8e6',
                    borderRadius: '6px',
                    border: '1px solid rgba(234, 67, 53, 0.15)',
                    width: 'fit-content'
                  }}>
                    ⚠️ Tipp: Metronom stummschalten oder Kopfhörer nutzen, damit das Klicken nicht mit aufgenommen wird!
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setIsMetronomeActive(!isMetronomeActive)}
                    className="tactile-btn"
                    style={{
                      background: isMetronomeActive ? '#eab308' : '#e5e5ea',
                      border: 'none',
                      color: isMetronomeActive ? '#ffffff' : '#1d1d1f',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      borderRadius: '8px',
                      height: '32px',
                      padding: '0 12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isMetronomeActive ? 'CLICK ON' : 'CLICK OFF'}
                  </button>

                  <button
                    type="button"
                    onClick={handleTapTempo}
                    className="tactile-btn"
                    style={{
                      background: 'rgba(0, 0, 0, 0.04)',
                      color: '#1d1d1f',
                      border: 'none',
                      borderRadius: '8px',
                      height: '32px',
                      padding: '0 12px',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    TAP TEMPO
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 70px' }}>
                    <span style={{ fontSize: '0.52rem', color: '#86868b', fontWeight: 800, marginBottom: '2px', letterSpacing: '0.04em' }}>TAKTART</span>
                    <select
                      value={timeSignature}
                      onChange={(e) => setTimeSignature(e.target.value as any)}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '8px',
                        height: '32px',
                        padding: '0 4px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="4/4">4/4 Takt</option>
                      <option value="3/4">3/4 Takt</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 80px' }}>
                    <span style={{ fontSize: '0.52rem', color: '#86868b', fontWeight: 800, marginBottom: '2px', letterSpacing: '0.04em' }}>LOOP-LÄNGE</span>
                    <select
                      value={barLength}
                      onChange={(e) => setBarLength(parseInt(e.target.value) as any)}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '8px',
                        height: '32px',
                        padding: '0 4px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={1}>1 Takt</option>
                      <option value={2}>2 Takte</option>
                      <option value={4}>4 Takte</option>
                      <option value={8}>8 Takte</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 90px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.52rem', color: '#86868b', fontWeight: 800, letterSpacing: '0.04em' }}>METRONOM-SOUND</span>
                      <button
                        type="button"
                        onClick={() => playClickSound(true)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '0 2px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#86868b'
                        }}
                      >
                        <Volume2 size={10} />
                      </button>
                    </div>
                    <select
                      value={metronomeSound}
                      onChange={(e) => {
                        const newSound = e.target.value as any;
                        setMetronomeSound(newSound);
                        setTimeout(() => playClickSound(true, undefined, newSound), 50);
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '8px',
                        height: '32px',
                        padding: '0 4px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="wood">Holz-Klick</option>
                      <option value="cowbell">Cowbell</option>
                      <option value="synth">Synth-Beep</option>
                      <option value="rimshot">Rimshot</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.52rem', color: '#86868b', fontWeight: 800, letterSpacing: '0.04em' }}>CLICK LAUTSTÄRKE</span>
                    <span style={{ fontSize: '0.58rem', color: '#eab308', fontWeight: 800, fontFamily: 'SF Mono, monospace' }}>{loopstationMetronomeVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={loopstationMetronomeVolume}
                    onChange={(e) => setLoopstationMetronomeVolume(parseInt(e.target.value))}
                    className="apple-slider"
                    style={{
                      width: '100%',
                      height: '4px',
                      cursor: 'pointer',
                      background: `linear-gradient(to right, #86868b 0%, #86868b ${loopstationMetronomeVolume}%, rgba(0,0,0,0.06) ${loopstationMetronomeVolume}%, rgba(0,0,0,0.06) 100%)`
                    }}
                  />
                </div>
              </div>

              <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(0, 0, 0, 0.06)' }} className="hidden md:block" />

              <div style={{
                flex: '1 1 240px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                background: '#f5f5f7',
                borderRadius: '12px',
                padding: '12px',
                border: '1.5px solid rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.52rem', color: '#1d1d1f', fontWeight: 800, letterSpacing: '0.04em' }}>LATENZ-AUSGLEICH</span>
                      <span 
                        onClick={() => {
                          const confirmReCalib = window.confirm("Automatische Cubase Latenz-Einmessung neu starten?");
                          if (!confirmReCalib) return;
                          isManualLatencyAdjustmentRef.current = false;
                          localStorage.removeItem('groovelab_latency_calibrated');
                          localStorage.removeItem('groovelab_sync_offset_ms');
                          setIsDeviceCalibrated(false);
                          runAutoCalibrationSequence();
                        }}
                        style={{
                          fontSize: '0.58rem',
                          fontWeight: 800,
                          padding: '4px 9px',
                          borderRadius: '6px',
                          background: isDeviceCalibrated ? '#e6f4ea' : '#fef3c7',
                          color: isDeviceCalibrated ? '#34a853' : '#d97706',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: isDeviceCalibrated ? '1.5px solid #a7f3d0' : '1.5px solid #fef08a',
                          boxShadow: '0 1.5px 4px rgba(0,0,0,0.03)',
                          transition: 'all 0.15s ease',
                          minHeight: '24px',
                          userSelect: 'none',
                          WebkitUserSelect: 'none'
                        }}
                        className="hover-scale-mini tactile-btn"
                        title="Klicken, um automatische Latenz-Einmessung neu zu starten"
                      >
                        {isDeviceCalibrated ? '🎯 Kalibriert (Neu einmessen)' : '⚡ Auto-Einmessen'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.58rem', color: '#86868b', fontWeight: 800, fontFamily: 'SF Mono, monospace' }}>{syncOffsetMs > 0 ? '+' : ''}{syncOffsetMs}ms</span>
                  </div>
                  <input
                    type="range"
                    min="-150"
                    max="350"
                    value={syncOffsetMs}
                    onChange={(e) => {
                      setSyncOffsetMs(parseInt(e.target.value));
                      isManualLatencyAdjustmentRef.current = true;
                    }}
                    onMouseUp={(e) => {
                      updateLatencyInDb(parseInt((e.target as HTMLInputElement).value));
                    }}
                    onTouchEnd={(e) => {
                      updateLatencyInDb(parseInt((e.target as HTMLInputElement).value));
                    }}
                    className="apple-slider"
                    style={{
                      width: '100%',
                      height: '4px',
                      cursor: 'pointer',
                      background: `linear-gradient(to right, #86868b 0%, #86868b ${((syncOffsetMs + 150) / 500) * 100}%, rgba(0,0,0,0.06) ${((syncOffsetMs + 150) / 500) * 100}%, rgba(0,0,0,0.06) 100%)`
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Multi-Track DAW Channel Strip Scroll Container */}
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tracks.length > 2 ? '5px' : '10px',
            width: '100%'
          }} 
          className="custom-daw-scrollbar"
        >
          {tracks.map((track) => {
            const hasAudio = !!track.url;
            const hasAnySolo = tracks.some(t => t.isSoloed);
            const isImplicitlyMuted = hasAnySolo && !track.isSoloed && !track.isMuted;
            const isCompact = tracks.length > 2;

            return (
              <div
                key={track.id}
                className={`daw-console-strip ${track.isRecording ? 'recording-card-pulse' : ''}`}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: track.isRecording
                    ? '1.5px solid #ea4335'
                    : track.isWaiting
                      ? '1.5px solid #d97706'
                      : '1.5px solid rgba(0, 0, 0, 0.08)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                  borderRadius: isCompact ? '12px' : '16px',
                  padding: isCompact ? '6px 12px' : '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isCompact ? '4px' : '8px',
                  boxSizing: 'border-box',
                  position: 'relative',
                  opacity: isImplicitlyMuted ? 0.45 : 1,
                  transition: 'all 0.25s ease',
                  overflow: 'hidden'
                }}
              >
                {isPlaying && hasAudio && !track.isMuted && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: '#34a853',
                    opacity: 0.8
                  }} />
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', minHeight: isCompact ? '28px' : '36px' }}>
                  {track.isRecording ? (
                    <button
                      type="button"
                      onClick={() => stopRecording(track.id)}
                      className="tactile-btn"
                      style={{
                        background: '#fce8e6',
                        color: '#ea4335',
                        border: 'none',
                        borderRadius: '50%',
                        width: isCompact ? '26px' : '32px',
                        height: isCompact ? '26px' : '32px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Square size={isCompact ? 12 : 14} fill="#ea4335" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startRecording(track.id)}
                      disabled={isPlaying || isAutoSequenceActive}
                      className="tactile-btn"
                      style={{
                        background: track.isWaiting ? '#fef3c7' : '#e6f4ea',
                        color: track.isWaiting ? '#d97706' : '#34a853',
                        border: 'none',
                        borderRadius: '50%',
                        width: isCompact ? '26px' : '32px',
                        height: isCompact ? '26px' : '32px',
                        cursor: (isPlaying || isAutoSequenceActive) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: (isPlaying || isAutoSequenceActive) ? 0.4 : 1,
                        flexShrink: 0
                      }}
                    >
                      <Mic size={isCompact ? 12 : 14} />
                    </button>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: isCompact ? '0.64rem' : '0.74rem', fontWeight: 900, color: '#1d1d1f' }}>
                      Spur 0{track.id}
                    </span>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: track.isRecording ? '#ef4444' : (track.isWaiting ? '#f59e0b' : (hasAudio ? '#34a853' : '#cbd5e1'))
                    }} />
                    <span style={{ fontSize: '0.48rem', color: '#86868b', fontWeight: 600, textTransform: 'uppercase' }}>
                      {track.isRecording ? 'AUFNAHME' : (track.isWaiting ? 'WARTET...' : (hasAudio ? 'BEREIT' : 'LEER'))}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '200px', marginLeft: '8px' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={track.volume}
                      onChange={(e) => handleVolumeChange(track.id, parseInt(e.target.value))}
                      className="groovelab-fader"
                    />
                    <span style={{ fontSize: '0.50rem', fontWeight: 700, color: '#86868b', minWidth: '22px', textAlign: 'right' }}>
                      {Math.round((track.volume / 100) * 6 - 6)}dB
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.5px',
                      height: isCompact ? '12px' : '16px',
                      background: 'rgba(0, 0, 0, 0.05)',
                      padding: '2px 4px',
                      borderRadius: '4px'
                    }}>
                      {[...Array(5)].map((_, i) => {
                        const level = (i + 1) * 2;
                        const isActive = (meterHeights[track.id] || 0) >= level;
                        return (
                          <div
                            key={i}
                            style={{
                              width: '2px',
                              height: `${(i + 1) * (isCompact ? 1.8 : 2.2)}px`,
                              background: isActive ? (i >= 4 ? '#ef4444' : '#34a853') : '#cbd5e1',
                              borderRadius: '1px',
                              transition: 'all 0.05s ease'
                            }}
                          />
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSoloToggle(track.id)}
                      disabled={!hasAudio}
                      style={{
                        background: track.isSoloed ? '#fef08a' : '#f1f5f9',
                        color: track.isSoloed ? '#854d0e' : '#64748b',
                        border: track.isSoloed ? '1px solid #fde047' : '1px solid transparent',
                        borderRadius: '6px',
                        padding: isCompact ? '2px 5px' : '3px 7px',
                        fontWeight: 800,
                        fontSize: isCompact ? '0.50rem' : '0.56rem',
                        cursor: hasAudio ? 'pointer' : 'not-allowed',
                        opacity: hasAudio ? 1 : 0.4
                      }}
                    >
                      SOLO
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMuteToggle(track.id)}
                      disabled={!hasAudio}
                      style={{
                        background: track.isMuted ? '#fce8e6' : '#f1f5f9',
                        color: track.isMuted ? '#ea4335' : '#64748b',
                        border: track.isMuted ? '1px solid #f87171' : '1px solid transparent',
                        borderRadius: '6px',
                        padding: isCompact ? '2px 5px' : '3px 7px',
                        fontWeight: 800,
                        fontSize: isCompact ? '0.50rem' : '0.56rem',
                        cursor: hasAudio ? 'pointer' : 'not-allowed',
                        opacity: hasAudio ? 1 : 0.4
                      }}
                    >
                      MUTE
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTrack(track.id)}
                      style={{
                        background: 'transparent',
                        color: '#94a3b8',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                <div style={{
                  width: '100%',
                  background: '#f8fafc',
                  borderRadius: isCompact ? '8px' : '10px',
                  padding: isCompact ? '3px 6px' : '6px 8px',
                  border: '1px solid #e2e8f0',
                  boxSizing: 'border-box'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    width: '100%',
                    gap: '4px'
                  }}>
                    {[0, 1, 2, 3].map((barIdx) => {
                      const barNum = barIdx + 1;
                      const currentActiveStep = isPlaying 
                        ? Math.floor((playbackProgress / 100) * 32)
                        : -1;
                      const isBarActive = currentActiveStep >= barIdx * 8 && currentActiveStep < (barIdx + 1) * 8;
                      const buffer = audioBuffersRef.current[track.id];
                      const pcmPeaks = buffer ? extractPeaksFromBuffer(buffer, 32) : null;

                      return (
                        <React.Fragment key={barIdx}>
                          <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: isCompact ? '2px' : '4px'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-start'
                            }}>
                              <div style={{
                                fontSize: isCompact ? '0.44rem' : '0.48rem',
                                fontWeight: 800,
                                letterSpacing: '0.05em',
                                fontFamily: 'SF Mono, monospace',
                                background: isBarActive ? 'rgba(234, 179, 8, 0.18)' : 'rgba(0, 0, 0, 0.04)',
                                color: isBarActive ? '#d97706' : '#64748b',
                                border: isBarActive ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid rgba(0, 0, 0, 0.05)',
                                padding: isCompact ? '0.5px 4px' : '1px 5px',
                                borderRadius: '3px',
                                transition: 'all 0.15s ease'
                              }}>
                                TAKT {barNum}
                              </div>
                            </div>
                            {/* 8-Step Waveform Visualizer Section */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              width: '100%',
                              height: isCompact ? '24px' : '36px',
                              background: '#ffffff',
                              borderRadius: '6px',
                              padding: '2px 3px',
                              border: '1.5px solid #cbd5e1',
                              boxSizing: 'border-box',
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                            }}>
                              {Array.from({ length: 8 }).map((_, stepOffset) => {
                                const stepIdx = barIdx * 8 + stepOffset;
                                let isCurrentStep = false;
                                if (isPlaying) {
                                  const activeStep = Math.floor((playbackProgress / 100) * 32);
                                  isCurrentStep = activeStep === stepIdx;
                                } else if (isAutoSequenceActive) {
                                  const elapsedSecs = (audioContextRef.current ? audioContextRef.current.currentTime : 0) - sequenceStartTimeRef.current;
                                  const continuousTick = elapsedSecs / (60 / bpm);
                                  if (continuousTick >= 4) {
                                    const sequenceOffsetBeats = continuousTick - 4;
                                    const sequenceOffsetSteps = Math.floor(sequenceOffsetBeats * 2);
                                    const activeStep = sequenceOffsetSteps % 32;
                                    isCurrentStep = activeStep === stepIdx;
                                  }
                                }

                                const isDownbeat = stepIdx % 2 === 0;

                                let barHeight = isCompact ? 8 : 12;
                                if (pcmPeaks && pcmPeaks[stepIdx] !== undefined) {
                                  barHeight = Math.max(isCompact ? 6 : 10, Math.round(pcmPeaks[stepIdx] * (isCompact ? 18 : 28)));
                                } else {
                                  barHeight = isDownbeat ? (isCompact ? 14 : 20) : (isCompact ? 8 : 12);
                                }

                                const isPassed = isPlaying && (Math.floor((playbackProgress / 100) * 32) > stepIdx);

                                let blockColor = '#cbd5e1';
                                if (track.isRecording) {
                                  blockColor = isCurrentStep ? '#ef4444' : 'rgba(239, 68, 68, 0.45)';
                                } else if (hasAudio) {
                                  if (isCurrentStep) {
                                    blockColor = '#eab308';
                                  } else if (isPassed) {
                                    blockColor = 'rgba(52, 168, 83, 0.65)';
                                  } else {
                                    blockColor = '#34a853';
                                  }
                                } else {
                                  if (isCurrentStep) {
                                    blockColor = '#eab308';
                                  } else {
                                    blockColor = isDownbeat ? '#94a3b8' : '#cbd5e1';
                                  }
                                }

                                return (
                                  <div
                                    key={stepIdx}
                                    onClick={() => {
                                      if (masterLoopDuration) {
                                        const fraction = stepIdx / 32;
                                        const offsetMs = fraction * masterLoopDuration;
                                        setPlaybackProgress(fraction * 100);
                                        if (isPlaying && audioContextRef.current) {
                                          startTimeRef.current = Date.now() - offsetMs;
                                          audioContextStartTimeRef.current = audioContextRef.current.currentTime - (offsetMs / 1000);
                                          playAll();
                                        }
                                      }
                                    }}
                                    style={{
                                      flex: 1,
                                      height: `${isCurrentStep ? Math.min(isCompact ? 20 : 28, barHeight + 3) : barHeight}px`,
                                      borderRadius: '2px',
                                      background: blockColor,
                                      transition: 'all 0.06s ease',
                                      opacity: isCurrentStep ? 1 : ((hasAudio || track.isRecording) ? (isDownbeat ? 1.0 : 0.85) : (isDownbeat ? 0.9 : 0.6)),
                                      boxShadow: isCurrentStep ? '0 0 10px rgba(234, 179, 8, 0.9)' : 'none',
                                      cursor: 'pointer'
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          {barIdx < 3 && (
                            <div style={{
                              width: '1px',
                              alignSelf: 'stretch',
                              background: '#cbd5e1',
                              marginTop: '16px',
                              marginBottom: '2px'
                            }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
      ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#ffffff',
            borderRadius: '20px',
            border: '1.5px solid rgba(0, 0, 0, 0.08)',
            padding: '24px',
            width: '100%',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.03)'
          }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1d1d1f', marginBottom: '8px' }}>
              Deine Aufnahmen
            </h3>
            {savedLoops.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '120px', color: '#86868b', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px dashed rgba(0,0,0,0.08)' }}>
                <span style={{ fontSize: '0.74rem' }}>Noch keine gespeicherten Loops vorhanden.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {savedLoops.map((loop, idx) => {
                  const isSelected = selectedSavedLoop?.url === loop.url;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedSavedLoop(loop);
                        if (playingSavedLoopUrl && playingSavedLoopUrl !== loop.url) {
                          if (savedLoopAudioRef.current) savedLoopAudioRef.current.pause();
                          setPlayingSavedLoopUrl(null);
                          setPlaybackProgress(0);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: isSelected ? 'rgba(52, 168, 83, 0.05)' : '#f5f5f7',
                        borderRadius: '12px',
                        border: isSelected ? '1.5px solid #34a853' : '1.5px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5px', flex: 1 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d1d1f' }}>{loop.label}</span>
                        <span style={{ fontSize: '0.58rem', color: '#86868b' }}>
                          {new Date(loop.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr • {loop.duration}s
                        </span>
                        <div style={{
                          width: '140px',
                          height: '4px',
                          background: isSelected ? 'rgba(52, 168, 83, 0.15)' : '#e5e5ea',
                          borderRadius: '2px',
                          marginTop: '6px',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div
                            className={playingSavedLoopUrl === loop.url ? 'shimmer-active' : ''}
                            style={{
                              width: `${Math.min(100, (Number(loop.duration) / 16) * 100)}%`,
                              height: '100%',
                              background: playingSavedLoopUrl === loop.url ? '#34a853' : '#a8aec4',
                              borderRadius: '2px',
                              transition: 'all 0.3s ease'
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handlePlaySavedLoop(loop.url)}
                          className="tactile-btn"
                          style={{
                            background: '#34a853',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          {playingSavedLoopUrl === loop.url ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedLoop(loop.originalStr)}
                          className="tactile-btn"
                          style={{
                            background: 'transparent',
                            color: '#86868b',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#ea4335'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#86868b'; }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      )}

        {showCalibrationPromptModal && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: useNotebookLayout ? '0 0 24px 24px' : '24px',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderRadius: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
              padding: '28px',
              maxWidth: '420px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px'
            }}>
              <div style={{
                background: '#fef3c7',
                color: '#d97706',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(217, 119, 6, 0.2)'
              }}>
                <Sliders size={26} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1d1d1f', margin: 0 }}>
                  Audio-Kalibrierung erforderlich
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#86868b', lineHeight: 1.4, margin: 0 }}>
                  Für ein 100% sample-genaues Loop-Ergebnis müssen wir einmalig die Hardware-Latenz deines Mikrofons ({activeDeviceName}) messen.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCalibrationPromptModal(false)}
                  className="tactile-btn"
                  style={{
                    flex: 1,
                    background: '#f5f5f7',
                    color: '#86868b',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCalibrationPromptModal(false);
                    runAutoCalibrationSequence();
                  }}
                  className="tactile-btn"
                  style={{
                    flex: 1.5,
                    background: '#34a853',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(52, 168, 83, 0.25)'
                  }}
                >
                  Jetzt kalibrieren 🎯
                </button>
              </div>
            </div>
          </div>
        )}

        {isCalibratingLatency && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: useNotebookLayout ? '0 0 24px 24px' : '24px',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              borderRadius: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.9)',
              padding: '28px',
              maxWidth: '440px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '18px'
            }}>
              <div style={{
                background: calibrationPhaseState === 'result' ? '#e6f4ea' : '#e0e7ff',
                color: calibrationPhaseState === 'result' ? '#34a853' : '#4f46e5',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: calibrationPhaseState === 'result' ? '0 6px 18px rgba(52, 168, 83, 0.25)' : '0 6px 18px rgba(79, 70, 229, 0.25)',
                transition: 'all 0.3s ease'
              }}>
                {calibrationPhaseState === 'result' ? <CheckCircle2 size={28} /> : <Zap size={28} className="animate-pulse" />}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  color: '#4f46e5',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  Cubase 15 Pro Auto-Einmessung
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1d1d1f', margin: 0 }}>
                  {calibrationPhaseState === 'ambient' && "1/3: Umgebungs-Check..."}
                  {calibrationPhaseState === 'clicks' && `2/3: Akustische Pings (${calibrationClickCount}/5)...`}
                  {calibrationPhaseState === 'result' && "3/3: Einmessung Erfolgreich! 🎯"}
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#86868b', lineHeight: 1.4, margin: 0 }}>
                  {calibrationPhaseState === 'ambient' && `Messung der Hintergrundgeräusche deines Mikrofons (${activeDeviceName}). Bitte kurz leise sein.`}
                  {calibrationPhaseState === 'clicks' && "Empfange akustische Impuls-Signale über Lautsprecher/Mikrofon..."}
                  {calibrationPhaseState === 'result' && `Hardware-Latenz für ${activeDeviceName} exakt ermittelt & abgespeichert.`}
                </p>
              </div>

              {/* Progress Bar & Visual Level Indicator */}
              {calibrationPhaseState !== 'result' ? (
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
                      width: calibrationPhaseState === 'ambient' ? '20%' : `${20 + (calibrationClickCount / 5) * 80}%`,
                      background: 'linear-gradient(90deg, #34a853 0%, #4f46e5 100%)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  {calibrationPhaseState === 'ambient' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                      <Volume2 size={14} /> Pegel: {calibrationMicLevel}%
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
                    +{autoLatencyResult || syncOffsetMs} ms
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#166534', background: '#d1fae5', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                    🎯 100% Sample-Genau Kalibriert (DSP Matrix)
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '4px' }}>
                {calibrationPhaseState === 'result' ? (
                  <button
                    type="button"
                    onClick={() => setIsCalibratingLatency(false)}
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
                    Einmessung Übernehmen & Fertig 🚀
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (calibrationStreamRef.current) {
                        calibrationStreamRef.current.getTracks().forEach(t => t.stop());
                        calibrationStreamRef.current = null;
                      }
                      setIsCalibratingLatency(false);
                    }}
                    className="tactile-btn"
                    style={{
                      width: '100%',
                      background: '#f1f5f9',
                      color: '#64748b',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Einmessung Abbrechen
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
