import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Square, 
  Repeat, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Sparkles, 
  Check, 
  RotateCcw, 
  Music2, 
  ShieldCheck, 
  SlidersHorizontal,
  Scissors 
} from 'lucide-react';
import { getBlob, storeBlob } from '../../utils/blobStorage';
import { shiftAudioBufferPitch } from '../../utils/pitchShifter';
import { safeDecodeAudioData, audioBufferToWavBlob } from '../../utils/audioMasteringEngine';
import { getAudioNotes } from '../../utils/audioNotesStorage';

export interface AudioEditorSaveResult {
  url: string;
  original_url?: string;
  duration: number;
  original_duration?: number;
  label: string;
  mode: 'overwrite' | 'duplicate';
  is_edited?: boolean;
  pitch_semitones?: number;
  cut_start_time?: number;
  cut_end_time?: number;
}

export interface AudioEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioUrl: string;
  originalAudioUrl?: string;
  initialLabel?: string;
  initialDuration?: number;
  initialOriginalDuration?: number;
  initialPitch?: number;
  hasAudioTresor?: boolean;
  onSave: (result: AudioEditorSaveResult) => void;
  onRevertToOriginal?: () => void;
}

export const AudioEditorModal: React.FC<AudioEditorModalProps> = ({
  isOpen,
  onClose,
  audioUrl,
  originalAudioUrl,
  initialLabel = 'Aufnahme',
  initialDuration = 0,
  initialOriginalDuration,
  initialPitch = 0,
  hasAudioTresor = true,
  onSave,
  onRevertToOriginal
}) => {
  const [activeUrl, setActiveUrl] = useState<string>(audioUrl);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoopingSelection, setIsLoopingSelection] = useState(false);
  
  const [duration, setDuration] = useState(initialDuration || 0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(initialDuration || 0);
  const [currentPlayTime, setCurrentPlayTime] = useState(0);
  
  const [semitones, setSemitones] = useState(initialPitch || 0); // Pitch Shift: -12 to +12
  const [editLabel, setEditLabel] = useState(initialLabel);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDraggingHandle, setActiveDraggingHandle] = useState<'start' | 'end' | null>(null);
  const [isHoveringHandle, setIsHoveringHandle] = useState<'start' | 'end' | null>(null);
  // 📍 Subtle Referenz-Pins aus Audio Timeline Notizen
  const timelineNotes = useMemo(() => getAudioNotes(audioUrl || ''), [audioUrl]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimestampRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingHandleRef = useRef<'start' | 'end' | null>(null);
  const startTimeRef = useRef(startTime);
  const endTimeRef = useRef(endTime);
  const isPlayingRef = useRef(false);
  const pitchCacheRef = useRef<Map<number, AudioBuffer>>(new Map());

  const getPitchShiftedBuffer = (buffer: AudioBuffer, shift: number, ctx: AudioContext | BaseAudioContext): AudioBuffer => {
    if (!buffer || shift === 0) return buffer;
    const cached = pitchCacheRef.current.get(shift);
    if (cached) return cached;
    const shifted = shiftAudioBufferPitch(buffer, shift, ctx);
    pitchCacheRef.current.set(shift, shifted);
    return shifted;
  };

  useEffect(() => {
    startTimeRef.current = startTime;
  }, [startTime]);

  useEffect(() => {
    endTimeRef.current = endTime;
  }, [endTime]);

  const masterOriginalKey = originalAudioUrl || audioUrl;
  const isDifferentFromMaster = Boolean(
    (originalAudioUrl && originalAudioUrl !== activeUrl) ||
    startTime > 0.05 ||
    (duration > 0 && endTime < duration - 0.05) ||
    semitones !== 0
  );

  // Sync activeUrl when audioUrl prop changes
  useEffect(() => {
    setActiveUrl(audioUrl);
  }, [audioUrl]);

  // Load and decode audio buffer
  useEffect(() => {
    if (!isOpen || !activeUrl) return;
    let active = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        let arrayBuffer: ArrayBuffer | null = null;
        if (activeUrl.startsWith('data:') || activeUrl.startsWith('blob:')) {
          const resp = await fetch(activeUrl);
          arrayBuffer = await resp.arrayBuffer();
        } else if (activeUrl.startsWith('http://') || activeUrl.startsWith('https://')) {
          const resp = await fetch(activeUrl, { mode: 'cors' });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          arrayBuffer = await resp.arrayBuffer();
        } else {
          // Local IndexedDB key (e.g. campus_blob_... or campus_audio_...)
          const raw = await getBlob(activeUrl);
          if (raw instanceof Blob) {
            arrayBuffer = await raw.arrayBuffer();
          } else if (raw instanceof ArrayBuffer) {
            arrayBuffer = raw;
          }
        }

        if (!arrayBuffer) {
          throw new Error('Konnte Audiodaten nicht abrufen');
        }

        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioCtxRef.current = audioCtx;

        if (audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => {});
        }

        const decoded = await safeDecodeAudioData(audioCtx, arrayBuffer);
        if (!active) return;

        pitchCacheRef.current.clear();
        setAudioBuffer(decoded);
        const dur = decoded.duration;
        setDuration(dur);
        setStartTime(0);
        setEndTime(dur);
        setCurrentPlayTime(0);
      } catch (err) {
        console.error('AudioEditor: Decode failed:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
      stopPlayback();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [isOpen, activeUrl]);

  // Compute 80 responsive waveform amplitude bars (with multi-channel peak normalization & Safari fallback)
  const waveformBars = useMemo(() => {
    const barsCount = 80;
    if (audioBuffer && audioBuffer.length > 0) {
      const numChannels = audioBuffer.numberOfChannels;
      const channelsData: Float32Array[] = [];
      for (let c = 0; c < numChannels; c++) {
        channelsData.push(audioBuffer.getChannelData(c));
      }
      const totalSamples = audioBuffer.length;
      const blockSize = Math.max(1, Math.floor(totalSamples / barsCount));
      const rawPeaks: number[] = [];
      let maxPeak = 0.001;

      for (let i = 0; i < barsCount; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, totalSamples);
        let blockMax = 0;
        const step = Math.max(1, Math.floor((end - start) / 24));
        for (let j = start; j < end; j += step) {
          for (let c = 0; c < numChannels; c++) {
            const val = Math.abs(channelsData[c][j] || 0);
            if (val > blockMax) blockMax = val;
          }
        }
        rawPeaks.push(blockMax);
        if (blockMax > maxPeak) maxPeak = blockMax;
      }

      return rawPeaks.map((peak, i) => {
        const normalized = Math.min(1, Math.max(0.08, peak / maxPeak));
        const height = Math.max(6, Math.round(normalized * 66 + 6));
        const x = (i / barsCount) * 800 + 1.2;
        const width = Math.max(2, (800 / barsCount) - 3.2);
        const y = (80 - height) / 2;
        return { x, y, width, height };
      });
    }

    // 🛡️ Safari & Browser Fallback: Realistische organische Audio-Wellenform (falls decodeAudioData geblockt wurde)
    const fallbackSeed = [
      0.18, 0.32, 0.52, 0.72, 0.88, 0.95, 0.82, 0.60, 0.44, 0.70,
      0.86, 0.92, 0.78, 0.54, 0.38, 0.64, 0.90, 0.98, 0.76, 0.55,
      0.40, 0.65, 0.85, 0.92, 0.72, 0.50, 0.34, 0.60, 0.82, 0.94,
      0.74, 0.48, 0.32, 0.56, 0.80, 0.92, 0.72, 0.50, 0.36, 0.62,
      0.86, 0.96, 0.76, 0.52, 0.34, 0.60, 0.84, 0.96, 0.75, 0.48,
      0.30, 0.54, 0.78, 0.90, 0.70, 0.45, 0.32, 0.52, 0.74, 0.86,
      0.68, 0.42, 0.28, 0.48, 0.70, 0.84, 0.62, 0.40, 0.25, 0.42,
      0.62, 0.76, 0.56, 0.36, 0.22, 0.38, 0.52, 0.66, 0.42, 0.20
    ];
    return fallbackSeed.map((peak, i) => {
      const height = Math.round(peak * 66 + 6);
      const x = (i / barsCount) * 800 + 1.2;
      const width = Math.max(2, (800 / barsCount) - 3.2);
      const y = (80 - height) / 2;
      return { x, y, width, height };
    });
  }, [audioBuffer]);

  // Stop playback cleanup
  const stopPlayback = () => {
    isPlayingRef.current = false;
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.onended = null;
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
      } catch {}
      activeSourceRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
    setCurrentPlayTime(startTimeRef.current);
  };

  // Play selection from specific second with automatic endless loop
  const playFrom = (startSec?: number) => {
    if (!audioBuffer || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    window.dispatchEvent(new CustomEvent('campus-global-audio-play', { detail: { playerId: 'audio_editor_preview' } }));

    // Stop previous node if running without cancelling loop
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.onended = null;
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
      } catch {}
      activeSourceRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const bufferToPlay = getPitchShiftedBuffer(audioBuffer, semitones, ctx);

    const source = ctx.createBufferSource();
    source.buffer = bufferToPlay;
    source.playbackRate.value = 1.0;
    if (source.detune) {
      source.detune.value = 0;
    }

    source.connect(ctx.destination);

    const curStart = startTimeRef.current;
    const curEnd = endTimeRef.current;
    const requestedStart = startSec !== undefined ? startSec : curStart;
    const playStart = Math.max(0, Math.min(curEnd - 0.05, requestedStart));

    // 🔁 Sample-akkurates, verzögerungsfreies Hardware-Looping direkt über die Web Audio Engine:
    source.loop = true;
    source.loopStart = curStart;
    source.loopEnd = curEnd;

    source.start(0, playStart);
    activeSourceRef.current = source;
    isPlayingRef.current = true;
    setIsPlaying(true);
    setCurrentPlayTime(playStart);
    playbackStartTimestampRef.current = ctx.currentTime;

    source.onended = () => {
      if (!isPlayingRef.current) {
        stopPlayback();
      }
    };

    const loopSpan = Math.max(0.05, curEnd - curStart);
    const updatePlayhead = () => {
      if (!ctx || !activeSourceRef.current || !isPlayingRef.current) return;
      const elapsed = ctx.currentTime - playbackStartTimestampRef.current;
      const rawCurrent = playStart + elapsed;
      let current: number;
      if (rawCurrent <= curEnd) {
        current = rawCurrent;
      } else {
        const overtime = rawCurrent - curEnd;
        current = curStart + (overtime % loopSpan);
      }
      setCurrentPlayTime(current);
      animFrameRef.current = requestAnimationFrame(updatePlayhead);
    };
    animFrameRef.current = requestAnimationFrame(updatePlayhead);
  };

  // Real-time live pitch shifting during active playback without altering speed
  const prevSemitonesRef = useRef(semitones);
  useEffect(() => {
    if (prevSemitonesRef.current !== semitones) {
      prevSemitonesRef.current = semitones;
      if (isPlayingRef.current && audioCtxRef.current) {
        const curPlayhead = Math.min(endTimeRef.current, Math.max(startTimeRef.current, currentPlayTime));
        playFrom(curPlayhead);
      }
    }
  }, [semitones, currentPlayTime]);

  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      playFrom(startTime);
    }
  };

  // Keyboard Shortcuts (Apple Pro Studio Workflow)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        setIsLoopingSelection(prev => !prev);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlaying, startTime, endTime, isLoopingSelection]);

  // Click on waveform to play from that exact timestamp
  const handleWaveformPointerDown = (e: React.PointerEvent) => {
    if (isDraggingHandleRef.current) return;
    if (!waveformContainerRef.current || !duration) return;
    const rect = waveformContainerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = ratio * duration;
    playFrom(targetSec);
  };

  // Dragging logic for start and end handles
  const updateHandleFromClientX = (clientX: number) => {
    if (!waveformContainerRef.current || !duration) return;
    const rect = waveformContainerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetSec = ratio * duration;

    if (isDraggingHandleRef.current === 'start') {
      const newStart = Math.max(0, Math.min(endTime - 0.05, targetSec));
      setStartTime(newStart);
      if (!isPlaying) setCurrentPlayTime(newStart);
    } else if (isDraggingHandleRef.current === 'end') {
      const newEnd = Math.min(duration, Math.max(startTime + 0.05, targetSec));
      setEndTime(newEnd);
    }
  };

  const handlePointerDownHandle = (e: React.PointerEvent, handle: 'start' | 'end') => {
    e.stopPropagation();
    isDraggingHandleRef.current = handle;
    setActiveDraggingHandle(handle);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingHandleRef.current) {
      updateHandleFromClientX(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingHandleRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      isDraggingHandleRef.current = null;
      setActiveDraggingHandle(null);
    }
  };

  // ↩️ Revert to Master Original Recording (Non-Destructive Audio-Tresor Restore)
  const handleRestoreMasterOriginal = async () => {
    stopPlayback();
    if (masterOriginalKey && masterOriginalKey !== activeUrl) {
      setActiveUrl(masterOriginalKey);
    } else if (audioBuffer) {
      setStartTime(0);
      setEndTime(duration);
      setSemitones(0);
      setCurrentPlayTime(0);
    }
    if (onRevertToOriginal) {
      onRevertToOriginal();
    }
  };

  // Reset to full recording length
  const handleResetFullLength = () => {
    setStartTime(0);
    setEndTime(duration);
    setCurrentPlayTime(0);
  };

  // Perform Audio Crop with Smooth 25ms Micro-Fades & Pitch Shift
  const handleExportSave = async (mode: 'overwrite' | 'duplicate') => {
    if (!audioBuffer) return;
    setIsSaving(true);
    stopPlayback();

    try {
      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.max(0, Math.min(audioBuffer.length - 1, Math.floor(startTime * sampleRate)));
      const endSample = Math.max(startSample + 1, Math.min(audioBuffer.length, Math.floor(endTime * sampleRate)));
      const newLength = Math.max(1, endSample - startSample);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const offlineCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, newLength, sampleRate);
      const croppedBuffer = offlineCtx.createBuffer(audioBuffer.numberOfChannels, newLength, sampleRate);

      // 🔁 Exakte 1:1 Sample-Kopie des ausgewählten Bereichs ohne Lautstärke-Dips (identisch zur Loop-Vorschau)
      for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
        const srcData = audioBuffer.getChannelData(c);
        const destData = croppedBuffer.getChannelData(c);

        for (let i = 0; i < newLength; i++) {
          destData[i] = srcData[startSample + i] || 0;
        }
      }

      // If Pitch Shift is set, apply pitch shifter preserving exact duration & tempo
      let finalBuffer = croppedBuffer;
      if (semitones !== 0) {
        finalBuffer = shiftAudioBufferPitch(croppedBuffer, semitones, offlineCtx);
      }

      const wavBlob = audioBufferToWavBlob(finalBuffer);
      const newKey = `campus_audio_cut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.wav`;
      await storeBlob(newKey, wavBlob);

      const newDurationSec = Math.max(0.1, Number(finalBuffer.duration.toFixed(2)));
      let finalLabel = editLabel.trim() || initialLabel;
      if (mode === 'duplicate' && (finalLabel === initialLabel || !editLabel.trim())) {
        finalLabel = `${initialLabel} (Kopie)`;
      }

      const masterOrig = masterOriginalKey || audioUrl;
      const masterOrigDuration = initialOriginalDuration || duration;

      onSave({
        url: newKey,
        original_url: masterOrig,
        duration: newDurationSec,
        original_duration: masterOrigDuration,
        label: finalLabel,
        mode,
        is_edited: true,
        pitch_semitones: semitones,
        cut_start_time: startTime,
        cut_end_time: endTime
      });
      setIsSaving(false);
      onClose();
    } catch (err) {
      console.error('[AudioEditor] Save error:', err);
      setIsSaving(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toFixed(1);
    return `${m}:${Number(s) < 10 ? '0' : ''}${s}`;
  };

  const formatTimePrecise = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toFixed(2);
    return `${m}:${Number(s) < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;
  const playPercent = duration > 0 ? (currentPlayTime / duration) * 100 : startPercent;

  return (
    <div
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      aria-labelledby="audio-editor-title"
      style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.55)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '26px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '22px',
        boxSizing: 'border-box',
        animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        border: '1px solid #e2e8f0'
      }}>
        
        {/* ✂️ Header: Clean, Kid-Friendly, Focus on "Aufnahme kürzen" */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#dcfce7',
              border: '1px solid #86efac',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#15803d'
            }}>
              <Scissors size={20} strokeWidth={2.3} />
            </div>
            <h3 id="audio-editor-title" style={{ margin: 0, fontSize: '1.20rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Aufnahme kürzen
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
            title="Schließen"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* 🏷️ Title Field: Subtle, Clean */}
        <div style={{ position: 'relative', width: '100%' }}>
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            color: '#16a34a',
            pointerEvents: 'none'
          }}>
            <Music2 size={16} />
          </div>
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            placeholder="Titel der Aufnahme..."
            style={{
              width: '100%',
              fontSize: '0.86rem',
              fontWeight: 750,
              padding: '9px 36px 9px 38px',
              borderRadius: '12px',
              border: '1.5px solid #e2e8f0',
              background: '#f8fafc',
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'all 0.15s ease'
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.background = '#ffffff'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
          />
          {editLabel && (
            <button
              type="button"
              onClick={() => setEditLabel('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#e2e8f0',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                padding: 0
              }}
              title="Titel leeren"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* 🎛️ Waveform & Trimmer Stage */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '20px',
          border: '1.5px solid #e2e8f0',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxSizing: 'border-box'
        }}>
          
          {/* Header Badges: Grün für Start, Weiß für Dauer, Rot für Ende */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              background: '#dcfce7',
              border: '1px solid #86efac',
              color: '#15803d',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 850,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>Start: {formatTime(startTime)}</span>
            </span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                color: '#334155',
                fontWeight: 850,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}>
                Dauer: {formatTime(Math.max(0, endTime - startTime))}
              </span>
            </div>

            <span style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#b91c1c',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 850,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>Ende: {formatTime(endTime)}</span>
            </span>
          </div>

          {/* Waveform Stage with tactile iOS-style drag handles */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1.5px solid #e2e8f0',
              padding: '0 12px',
              boxSizing: 'border-box',
              overflow: 'visible',
              userSelect: 'none',
              touchAction: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            {/* Coordinate Track */}
            <div
              ref={waveformContainerRef}
              onPointerDown={handleWaveformPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                cursor: 'pointer',
                overflow: 'visible'
              }}
              title="Klicken zum Vorhören ab dieser Position"
            >
              {isLoading ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.80rem', fontWeight: 800 }}>
                  <Sparkles size={16} className="animate-spin" style={{ marginRight: '8px', color: '#16a34a' }} />
                  Lade Audio...
                </div>
              ) : (
                <>
                  {/* Center Reference Line */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: 'rgba(226, 232, 240, 0.9)',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }} />

                  {/* 1 & 2. High-Performance Responsive SVG Waveform with Selection Clip-Mask */}
                  <svg
                    viewBox="0 0 800 80"
                    preserveAspectRatio="none"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none'
                    }}
                  >
                    <defs>
                      <clipPath id="audio-editor-active-selection-clip">
                        <rect
                          x={`${startPercent}%`}
                          y="0"
                          width={`${Math.max(0, endPercent - startPercent)}%`}
                          height="80"
                        />
                      </clipPath>
                    </defs>

                    {/* Dimmed Background Track (trimmed areas) */}
                    <g opacity={0.25}>
                      {waveformBars.map((bar, i) => (
                        <rect
                          key={`dim-${i}`}
                          x={bar.x}
                          y={bar.y}
                          width={bar.width}
                          height={bar.height}
                          rx={bar.width / 2}
                          ry={bar.width / 2}
                          fill="#64748b"
                        />
                      ))}
                    </g>

                    {/* Active In-Selection Waveform (Brand Green) */}
                    <g clipPath="url(#audio-editor-active-selection-clip)">
                      {waveformBars.map((bar, i) => (
                        <rect
                          key={`act-${i}`}
                          x={bar.x}
                          y={bar.y}
                          width={bar.width}
                          height={bar.height}
                          rx={bar.width / 2}
                          ry={bar.width / 2}
                          fill="#16a34a"
                        />
                      ))}
                    </g>
                  </svg>

                  {/* 3. Subtle Reference Pins from Audio Timeline Notes (SoundCloud-Style) */}
                  {duration > 0 && timelineNotes.map((note) => {
                    const markerPct = Math.max(0, Math.min(100, (note.time / duration) * 100));
                    const pinColor = note.tag === 'tip' ? '#eab308' : note.tag === 'bar' ? '#3b82f6' : note.tag === 'highlight' ? '#ec4899' : '#f97316';
                    return (
                      <div
                        key={note.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Zu Notiz "${note.text.substring(0, 24)}" (${formatTime(note.time)}) springen`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            playFrom(note.time);
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          playFrom(note.time);
                        }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: `${markerPct}%`,
                          transform: 'translateX(-50%)',
                          width: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          zIndex: 25,
                          cursor: 'pointer'
                        }}
                        title={`Notiz: "${note.text}" (${formatTime(note.time)}) - Klick zum Anspringen`}
                      >
                        <div style={{
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          background: pinColor,
                          border: '1.5px solid #ffffff',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
                          marginTop: '2px'
                        }} />
                        <div style={{
                          width: '1px',
                          flex: 1,
                          background: pinColor,
                          opacity: 0.5,
                          borderLeft: '1px dashed'
                        }} />
                      </div>
                    );
                  })}

                  {/* 3b. Live Playhead Needle during Playback */}
                  {isPlaying && (
                    <div style={{
                      position: 'absolute',
                      top: '-6px',
                      bottom: '-6px',
                      left: `${playPercent}%`,
                      transform: 'translateX(-50%)',
                      width: '2px',
                      background: '#0f172a',
                      boxShadow: '0 0 8px rgba(15, 23, 42, 0.5)',
                      pointerEvents: 'none',
                      zIndex: 40
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '8px',
                        height: '8px',
                        background: '#0f172a',
                        borderRadius: '50%',
                        border: '1.5px solid #ffffff'
                      }} />
                    </div>
                  )}

                  {/* 4. 🟢 Start-Griff (Grün) mit 1px feiner vertikaler Schnittlinie */}
                  <div
                    onPointerDown={(e) => handlePointerDownHandle(e, 'start')}
                    onMouseEnter={() => setIsHoveringHandle('start')}
                    onMouseLeave={() => setIsHoveringHandle(null)}
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      bottom: '-10px',
                      left: `${startPercent}%`,
                      transform: 'translateX(-50%)',
                      width: '36px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'ew-resize',
                      zIndex: 30,
                      touchAction: 'none'
                    }}
                    title="Startpunkt ziehen"
                  >
                    {/* Floating Precise Time Pill during Drag */}
                    {activeDraggingHandle === 'start' && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        marginBottom: '6px',
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        pointerEvents: 'none'
                      }}>
                        {formatTime(startTime)}
                      </div>
                    )}

                    {/* Top Grip Tab */}
                    <div style={{
                      width: '22px',
                      height: '18px',
                      borderRadius: '6px',
                      background: '#16a34a',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      flexShrink: 0,
                      transition: 'transform 0.1s ease',
                      transform: activeDraggingHandle === 'start' ? 'scale(1.15)' : 'scale(1)'
                    }}>
                      <div style={{ width: '1.5px', height: '8px', background: '#ffffff', borderRadius: '1px' }} />
                      <div style={{ width: '1.5px', height: '8px', background: '#ffffff', borderRadius: '1px' }} />
                    </div>

                    {/* ⚡ 1px feine vertikale Schnittlinie für absoluten genauen Schnitt */}
                    <div style={{
                      width: '1px',
                      flex: 1,
                      background: '#16a34a',
                      opacity: 0.95
                    }} />

                    {/* Bottom Grip Tab */}
                    <div style={{
                      width: '22px',
                      height: '18px',
                      borderRadius: '6px',
                      background: '#16a34a',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      flexShrink: 0,
                      transition: 'transform 0.1s ease',
                      transform: activeDraggingHandle === 'start' ? 'scale(1.15)' : 'scale(1)'
                    }}>
                      <div style={{ width: '1.5px', height: '8px', background: '#ffffff', borderRadius: '1px' }} />
                      <div style={{ width: '1.5px', height: '8px', background: '#ffffff', borderRadius: '1px' }} />
                    </div>
                  </div>

                  {/* 5. 🔴 Ende-Griff (Rot) mit 1px feiner vertikaler Schnittlinie */}
                  <div
                    onPointerDown={(e) => handlePointerDownHandle(e, 'end')}
                    onMouseEnter={() => setIsHoveringHandle('end')}
                    onMouseLeave={() => setIsHoveringHandle(null)}
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      bottom: '-10px',
                      left: `${endPercent}%`,
                      transform: 'translateX(-50%)',
                      width: '36px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'ew-resize',
                      zIndex: 30,
                      touchAction: 'none'
                    }}
                    title="Endpunkt ziehen"
                  >
                    {/* Floating Precise Time Pill during Drag */}
                    {activeDraggingHandle === 'end' && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        marginBottom: '6px',
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        pointerEvents: 'none'
                      }}>
                        {formatTime(endTime)}
                      </div>
                    )}

                    {/* Top Grip Tab */}
                    <div style={{
                      width: '22px',
                      height: '18px',
                      borderRadius: '6px',
                      background: '#ef4444',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      flexShrink: 0,
                      transition: 'transform 0.1s ease',
                      transform: activeDraggingHandle === 'end' ? 'scale(1.15)' : 'scale(1)'
                    }}>
                      <div style={{ width: '1.5px', height: '8px', background: '#ffffff', borderRadius: '1px' }} />
                      <div style={{ width: '1.5px', height: '8px', background: '#ffffff', borderRadius: '1px' }} />
                    </div>

                    {/* ⚡ 1px feine vertikale Schnittlinie für absoluten genauen Schnitt */}
                    <div style={{
                      width: '1px',
                      flex: 1,
                      background: '#ef4444',
                      opacity: 0.95
                    }} />

                    {/* Bottom Grip Tab */}
                    <div style={{
                      width: '22px',
                      height: '18px',
                      borderRadius: '6px',
                      background: '#ef4444',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      flexShrink: 0,
                      transition: 'transform 0.1s ease',
                      transform: activeDraggingHandle === 'end' ? 'scale(1.15)' : 'scale(1)'
                    }}>
                      <div style={{ width: '1.5px', height: '8px', background: '#ffffff', borderRadius: '1px' }} />
                      <div style={{ width: '1.5px', height: '8px', background: '#ffffff', borderRadius: '1px' }} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 🎚️ Tonhöhe anpassen: Schlichte 3-Button Steuerung (Tiefer / Original / Höher) */}
        <div style={{
          background: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '16px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <SlidersHorizontal size={15} color="#16a34a" />
            <span style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a' }}>
              Tonhöhe:
            </span>
          </div>

          {/* Genau 3 Buttons: Tiefer | Original | Höher */}
          <div style={{ display: 'flex', gap: '6px', flex: 1, maxWidth: '290px' }}>
            <button
              type="button"
              onClick={() => setSemitones(prev => Math.max(-12, prev - 1))}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '10px',
                border: semitones < 0 ? '1.5px solid #15803d' : '1px solid #cbd5e1',
                background: semitones < 0 ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : '#ffffff',
                color: semitones < 0 ? '#ffffff' : '#334155',
                fontSize: '0.76rem',
                fontWeight: 850,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: semitones < 0 ? '0 2px 6px rgba(22, 163, 74, 0.25)' : '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale-mini"
              title="Tonhöhe tiefer"
            >
              <span>Tiefer</span>
              {semitones < 0 && <span style={{ opacity: 0.9 }}>({semitones})</span>}
            </button>

            <button
              type="button"
              onClick={() => setSemitones(0)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '10px',
                border: semitones === 0 ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                background: semitones === 0 ? '#0f172a' : '#ffffff',
                color: semitones === 0 ? '#ffffff' : '#334155',
                fontSize: '0.76rem',
                fontWeight: 850,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: semitones === 0 ? '0 2px 6px rgba(15, 23, 42, 0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale-mini"
              title="Originale Tonhöhe"
            >
              <span>Original</span>
            </button>

            <button
              type="button"
              onClick={() => setSemitones(prev => Math.min(12, prev + 1))}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '10px',
                border: semitones > 0 ? '1.5px solid #15803d' : '1px solid #cbd5e1',
                background: semitones > 0 ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : '#ffffff',
                color: semitones > 0 ? '#ffffff' : '#334155',
                fontSize: '0.76rem',
                fontWeight: 850,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: semitones > 0 ? '0 2px 6px rgba(22, 163, 74, 0.25)' : '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale-mini"
              title="Tonhöhe höher"
            >
              <span>Höher</span>
              {semitones > 0 && <span style={{ opacity: 0.9 }}>(+{semitones})</span>}
            </button>
          </div>
        </div>

        {/* 🎧 Playback Button: Spielt automatisch immer im Loop ab */}
        <button
          type="button"
          onClick={togglePlay}
          style={{
            width: '100%',
            background: isPlaying ? '#0f172a' : '#f1f5f9',
            color: isPlaying ? '#ffffff' : '#0f172a',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '12px 18px',
            fontSize: '0.88rem',
            fontWeight: 850,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale"
        >
          {isPlaying ? (
            <>
              <Square size={15} fill="currentColor" />
              <span>Stopp</span>
            </>
          ) : (
            <>
              <Repeat size={15} strokeWidth={2.6} style={{ color: '#16a34a' }} />
              <Play size={15} fill="currentColor" style={{ marginLeft: '-2px' }} />
              <span>Bereich loopen ({formatTime(Math.max(0, endTime - startTime))})</span>
            </>
          )}
        </button>

        {/* 💾 Fertig Speichern Button */}
        <button
          type="button"
          disabled={isSaving}
          onClick={() => handleExportSave('overwrite')}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            border: 'none',
            borderRadius: '16px',
            padding: '13px 20px',
            fontSize: '0.92rem',
            fontWeight: 900,
            color: '#ffffff',
            cursor: isSaving ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale"
        >
          <Check size={18} strokeWidth={2.8} />
          <span>{isSaving ? 'Wird gespeichert...' : 'Fertig (Zuschnitt speichern)'}</span>
        </button>

        {/* ↩️ Dezent unten: Zurück zum Original */}
        {isDifferentFromMaster && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-4px' }}>
            <button
              type="button"
              onClick={handleRestoreMasterOriginal}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}
            >
              <RotateCcw size={11} strokeWidth={2.4} />
              <span>Original wiederherstellen ({formatTime(initialOriginalDuration || duration)})</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
