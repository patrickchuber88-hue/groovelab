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
  SlidersHorizontal 
} from 'lucide-react';
import { getBlob, storeBlob } from '../../utils/blobStorage';

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

// Convert AudioBuffer to 16-bit PCM WAV Blob
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  const channels: Float32Array[] = [];
  const sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"

  // FMT sub-chunk
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);

  // data sub-chunk
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([outBuffer], { type: 'audio/wav' });
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

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimestampRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingHandleRef = useRef<'start' | 'end' | null>(null);

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
        if (activeUrl.startsWith('campus_blob_') || activeUrl.startsWith('campus_audio_')) {
          const raw = await getBlob(activeUrl);
          if (raw instanceof Blob) {
            arrayBuffer = await raw.arrayBuffer();
          } else if (raw instanceof ArrayBuffer) {
            arrayBuffer = raw;
          }
        } else {
          const res = await fetch(activeUrl);
          arrayBuffer = await res.arrayBuffer();
        }

        if (!arrayBuffer) throw new Error("Audio buffer empty");

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const decoded = await ctx.decodeAudioData(arrayBuffer);
        if (active) {
          setAudioBuffer(decoded);
          const totalSec = decoded.duration;
          setDuration(totalSec);
          setStartTime(0);
          setEndTime(totalSec);
          setCurrentPlayTime(0);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[AudioEditor] Load error:', err);
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

    // 🎚️ Web Worker Offloading: Compute 192 ultra-fine HDR Studio Waveform bars
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(192).fill(16));

  useEffect(() => {
    if (!audioBuffer) {
      setWaveformBars(Array(192).fill(16));
      return;
    }
    
    const worker = new Worker(new URL('../../workers/waveformWorker.ts', import.meta.url), { type: 'module' });
    
    worker.onmessage = (e) => {
      setWaveformBars(e.data.waveformBars);
      worker.terminate();
    };

    worker.postMessage({
      channelData: audioBuffer.getChannelData(0),
      numBars: 192
    });

    return () => {
      worker.terminate();
    };
  }, [audioBuffer]);

  // Stop playback cleanup
  const stopPlayback = () => {
    if (activeSourceRef.current) {
      try {
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
    setCurrentPlayTime(startTime);
  };

  // Play selection from specific second with pitch shift
  const playFrom = (startSec?: number) => {
    if (!audioBuffer || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    window.dispatchEvent(new CustomEvent('campus-global-audio-play', { detail: { playerId: 'audio_editor_preview' } }));

    stopPlayback();

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    if (source.detune) {
      source.detune.value = semitones * 100;
    } else {
      source.playbackRate.value = Math.pow(2, semitones / 12);
    }

    source.connect(ctx.destination);

    // If startSec is given, play from that spot; otherwise from startTime
    const requestedStart = startSec !== undefined ? startSec : startTime;
    const playStart = Math.max(0, Math.min(endTime - 0.05, requestedStart));
    const playDuration = Math.max(0.1, endTime - playStart);

    source.start(0, playStart, playDuration);
    activeSourceRef.current = source;
    setIsPlaying(true);
    setCurrentPlayTime(playStart);
    playbackStartTimestampRef.current = ctx.currentTime;

    source.onended = () => {
      if (isLoopingSelection) {
        playFrom(startTime);
      } else {
        stopPlayback();
      }
    };

    const updatePlayhead = () => {
      if (!ctx || !activeSourceRef.current) return;
      const elapsed = ctx.currentTime - playbackStartTimestampRef.current;
      const current = playStart + elapsed;
      if (current <= endTime) {
        setCurrentPlayTime(current);
        animFrameRef.current = requestAnimationFrame(updatePlayhead);
      } else {
        setCurrentPlayTime(endTime);
      }
    };
    animFrameRef.current = requestAnimationFrame(updatePlayhead);
  };

  // Real-time live pitch shifting during active playback
  useEffect(() => {
    if (activeSourceRef.current && isPlaying && audioCtxRef.current) {
      const source = activeSourceRef.current;
      const now = audioCtxRef.current.currentTime;
      if (source.detune) {
        source.detune.setValueAtTime(semitones * 100, now);
      } else {
        source.playbackRate.setValueAtTime(Math.pow(2, semitones / 12), now);
      }
    }
  }, [semitones, isPlaying]);

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
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.floor(endTime * sampleRate);
      const newLength = Math.max(1, endSample - startSample);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const offlineCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, newLength, sampleRate);
      const croppedBuffer = offlineCtx.createBuffer(audioBuffer.numberOfChannels, newLength, sampleRate);

      // 25ms Anti-Click Micro-Fade (clean fade-in & fade-out)
      const fadeSamples = Math.min(Math.floor(sampleRate * 0.025), Math.floor(newLength / 2));

      for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
        const srcData = audioBuffer.getChannelData(c);
        const destData = croppedBuffer.getChannelData(c);

        for (let i = 0; i < newLength; i++) {
          let sample = srcData[startSample + i];

          // Fade-In at start
          if (i < fadeSamples) {
            sample *= (i / fadeSamples);
          }
          // Fade-Out at end
          else if (i > newLength - fadeSamples) {
            sample *= ((newLength - i) / fadeSamples);
          }

          destData[i] = sample;
        }
      }

      // If Pitch Shift is set, apply via offline context
      let finalBuffer = croppedBuffer;
      if (semitones !== 0) {
        const pitchSource = offlineCtx.createBufferSource();
        pitchSource.buffer = croppedBuffer;
        if (pitchSource.detune) {
          pitchSource.detune.value = semitones * 100;
        } else {
          pitchSource.playbackRate.value = Math.pow(2, semitones / 12);
        }
        pitchSource.connect(offlineCtx.destination);
        pitchSource.start(0);
        finalBuffer = await offlineCtx.startRendering();
      }

      const wavBlob = audioBufferToWavBlob(finalBuffer);
      const newKey = `campus_audio_cut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await storeBlob(newKey, wavBlob);

      const newDurationSec = Math.max(1, Math.round(finalBuffer.duration));
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
        borderRadius: '28px',
        maxWidth: '540px',
        width: '100%',
        boxShadow: '0 32px 80px -16px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '24px 26px',
        boxSizing: 'border-box',
        animation: 'scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        border: '1px solid rgba(255, 255, 255, 0.8)'
      }}>
        
        {/* 🍏 Apple-Style Header: Category + Non-Destructive Audio-Tresor Safe Badge + Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.66rem', fontWeight: 850, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Studio Audio-Editor
              </span>
              {hasAudioTresor && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(22, 163, 74, 0.08)',
                  color: '#15803d',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  fontSize: '0.62rem',
                  fontWeight: 850,
                  border: '1px solid rgba(22, 163, 74, 0.2)'
                }}>
                  <ShieldCheck size={11} strokeWidth={2.5} />
                  <span>Audio-Tresor geschützt</span>
                </div>
              )}
            </div>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.24rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Zuschneiden & Pitch
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
            title="Schließen (Esc)"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        {/* 🏷️ Title Field: Apple Voice Memos Ergonomics */}
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
              fontSize: '0.88rem',
              fontWeight: 750,
              padding: '10px 36px 10px 38px',
              borderRadius: '14px',
              border: '1.5px solid #e2e8f0',
              background: '#f8fafc',
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'all 0.15s ease',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
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

        {/* 🎛️ Ultra-High-Resolution Waveform & Trimmer Stage */}
        <div style={{
          background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRadius: '22px',
          border: '1px solid #e2e8f0',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxSizing: 'border-box',
          boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.03)'
        }}>
          
          {/* Header Numbers & Revert Anchor */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: '#dc2626', fontWeight: 850 }}>
              Start: {formatTime(startTime)}
            </span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#0f172a', fontWeight: 900, background: '#ffffff', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                Dauer: {formatTime(Math.max(0, endTime - startTime))}
              </span>

              {/* ↩️ Dedicated Non-Destructive Revert to Original Master Button */}
              {isDifferentFromMaster && (
                <button
                  type="button"
                  onClick={handleRestoreMasterOriginal}
                  style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    padding: '3px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 850,
                    color: '#15803d',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 1px 4px rgba(34, 197, 94, 0.15)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  title="Komplette Originalaufnahme aus dem Audio-Tresor wiederherstellen"
                >
                  <RotateCcw size={11} strokeWidth={2.5} />
                  <span>Original laden ({formatTime(initialOriginalDuration || duration)})</span>
                </button>
              )}
            </div>

            <span style={{ color: '#dc2626', fontWeight: 850 }}>
              Ende: {formatTime(endTime)}
            </span>
          </div>

          {/* 192 Hi-DPI Waveform Stage with Logic Pro Brackets */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '94px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1.5px solid #e2e8f0',
              padding: '0 10px',
              boxSizing: 'border-box',
              overflow: 'visible',
              userSelect: 'none',
              touchAction: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
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
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800 }}>
                  <Sparkles size={14} className="animate-spin" style={{ marginRight: '6px', color: '#16a34a' }} />
                  Analysiere High-Definition Studio-Waveform...
                </div>
              ) : (
                <>
                  {/* 🎼 0dB Subtle Studio Center Reference Line */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: 'rgba(226, 232, 240, 0.95)',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }} />

                  {/* 🟢 Active Selection Glass Tint */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${startPercent}%`,
                    width: `${Math.max(0, endPercent - startPercent)}%`,
                    background: 'rgba(16, 185, 129, 0.05)',
                    pointerEvents: 'none'
                  }} />

                  {/* 1. Underlying Dimmed Waveform (Full Track, Slate Gray 28%) */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1px',
                    opacity: 0.28,
                    pointerEvents: 'none'
                  }}>
                    {waveformBars.map((heightPercent, i) => (
                      <div
                        key={`dim-${i}`}
                        style={{
                          flex: 1,
                          minWidth: '1.2px',
                          height: `${heightPercent}%`,
                          borderRadius: '99px',
                          background: '#94a3b8'
                        }}
                      />
                    ))}
                  </div>

                  {/* 2. Active Vibrant Emerald Waveform, Exact Pixel-Perfect Cut */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1px',
                    clipPath: `inset(0 ${Math.max(0, 100 - endPercent)}% 0 ${startPercent}%)`,
                    WebkitClipPath: `inset(0 ${Math.max(0, 100 - endPercent)}% 0 ${startPercent}%)`,
                    pointerEvents: 'none'
                  }}>
                    {waveformBars.map((heightPercent, i) => (
                      <div
                        key={`act-${i}`}
                        style={{
                          flex: 1,
                          minWidth: '1.2px',
                          height: `${heightPercent}%`,
                          borderRadius: '99px',
                          background: 'linear-gradient(180deg, #34d399 0%, #10b981 50%, #059669 100%)',
                          boxShadow: heightPercent > 45 ? '0 0 5px rgba(16, 185, 129, 0.45)' : 'none'
                        }}
                      />
                    ))}
                  </div>

                  {/* 3. Live Playhead Needle during Probehören */}
                  {isPlaying && (
                    <div style={{
                      position: 'absolute',
                      top: '-6px',
                      bottom: '-6px',
                      left: `${playPercent}%`,
                      transform: 'translateX(-50%)',
                      width: '2px',
                      background: '#0f172a',
                      boxShadow: '0 0 8px rgba(15, 23, 42, 0.7), 0 0 2px #ffffff',
                      pointerEvents: 'none',
                      zIndex: 40
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '0',
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

                  {/* 4. 🔴 Logic Pro Studio Trim Handle - START */}
                  <div
                    onPointerDown={(e) => handlePointerDownHandle(e, 'start')}
                    onMouseEnter={() => setIsHoveringHandle('start')}
                    onMouseLeave={() => setIsHoveringHandle(null)}
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      bottom: '-6px',
                      left: `${startPercent}%`,
                      transform: 'translateX(-50%)',
                      width: '28px',
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
                        marginBottom: '8px',
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        pointerEvents: 'none',
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}>
                        {formatTimePrecise(startTime)} s
                      </div>
                    )}

                    {/* Top Bracket Cap */}
                    <div style={{
                      width: isHoveringHandle === 'start' || activeDraggingHandle === 'start' ? '12px' : '10px',
                      height: isHoveringHandle === 'start' || activeDraggingHandle === 'start' ? '12px' : '10px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.45)',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }} />

                    {/* Center Needle */}
                    <div style={{
                      width: '2px',
                      flex: 1,
                      background: '#ef4444',
                      boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)'
                    }} />

                    {/* Bottom Bracket Cap */}
                    <div style={{
                      width: isHoveringHandle === 'start' || activeDraggingHandle === 'start' ? '12px' : '10px',
                      height: isHoveringHandle === 'start' || activeDraggingHandle === 'start' ? '12px' : '10px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.45)',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }} />
                  </div>

                  {/* 5. 🔴 Logic Pro Studio Trim Handle - END */}
                  <div
                    onPointerDown={(e) => handlePointerDownHandle(e, 'end')}
                    onMouseEnter={() => setIsHoveringHandle('end')}
                    onMouseLeave={() => setIsHoveringHandle(null)}
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      bottom: '-6px',
                      left: `${endPercent}%`,
                      transform: 'translateX(-50%)',
                      width: '28px',
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
                        marginBottom: '8px',
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        pointerEvents: 'none',
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}>
                        {formatTimePrecise(endTime)} s
                      </div>
                    )}

                    {/* Top Bracket Cap */}
                    <div style={{
                      width: isHoveringHandle === 'end' || activeDraggingHandle === 'end' ? '12px' : '10px',
                      height: isHoveringHandle === 'end' || activeDraggingHandle === 'end' ? '12px' : '10px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.45)',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }} />

                    {/* Center Needle */}
                    <div style={{
                      width: '2px',
                      flex: 1,
                      background: '#ef4444',
                      boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)'
                    }} />

                    {/* Bottom Bracket Cap */}
                    <div style={{
                      width: isHoveringHandle === 'end' || activeDraggingHandle === 'end' ? '12px' : '10px',
                      height: isHoveringHandle === 'end' || activeDraggingHandle === 'end' ? '12px' : '10px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.45)',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }} />
                  </div>

                  {/* ⏱️ Subtle Logic Pro Timeline Ruler */}
                  {duration > 0 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '1px',
                      left: 0,
                      right: 0,
                      display: 'flex',
                      justifyContent: 'space-between',
                      pointerEvents: 'none',
                      userSelect: 'none',
                      opacity: 0.55
                    }}>
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: idx === 0 ? 'flex-start' : (idx === 4 ? 'flex-end' : 'center') }}>
                          <span style={{ fontSize: '0.52rem', fontWeight: 750, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                            {formatTime(duration * pct)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Precision Micro-Steppers */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                type="button"
                onClick={() => {
                  const val = Math.max(0, Number((startTime - 0.1).toFixed(1)));
                  setStartTime(val);
                  if (!isPlaying) setCurrentPlayTime(val);
                }}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '7px', padding: '3px 8px', fontSize: '0.68rem', fontWeight: 800, color: '#334155', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
              >
                -0.1s
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = Math.min(endTime - 0.1, Number((startTime + 0.1).toFixed(1)));
                  setStartTime(val);
                  if (!isPlaying) setCurrentPlayTime(val);
                }}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '7px', padding: '3px 8px', fontSize: '0.68rem', fontWeight: 800, color: '#334155', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
              >
                +0.1s
              </button>
            </div>

            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                type="button"
                onClick={() => setEndTime(prev => Math.max(startTime + 0.1, Number((prev - 0.1).toFixed(1))))}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '7px', padding: '3px 8px', fontSize: '0.68rem', fontWeight: 800, color: '#334155', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
              >
                -0.1s
              </button>
              <button
                type="button"
                onClick={() => setEndTime(prev => Math.min(duration, Number((prev + 0.1).toFixed(1))))}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '7px', padding: '3px 8px', fontSize: '0.68rem', fontWeight: 800, color: '#334155', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
              >
                +0.1s
              </button>
            </div>
          </div>
        </div>

        {/* 🎚️ Tonhöhe (Pitch) Transposition Bar with Quick Preset Chips */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersHorizontal size={15} color="#16a34a" />
              <span style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a' }}>
                Tonhöhe (Pitch Transpose)
              </span>
              {semitones !== 0 && (
                <button
                  type="button"
                  onClick={() => setSemitones(0)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  title="Auf Original-Tonhöhe zurücksetzen"
                >
                  <RotateCcw size={10} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Stepper Capsule */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '99px',
              padding: '2px 4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              gap: '2px'
            }}>
              <button
                type="button"
                onClick={() => setSemitones(prev => Math.max(-12, prev - 1))}
                disabled={semitones <= -12}
                style={{
                  width: '28px',
                  height: '28px',
                  border: 'none',
                  background: 'transparent',
                  color: semitones <= -12 ? '#cbd5e1' : '#0f172a',
                  cursor: semitones <= -12 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%'
                }}
                title="Halbton tiefer"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>

              <span style={{
                fontSize: '0.78rem',
                fontWeight: 900,
                color: semitones !== 0 ? '#16a34a' : '#475569',
                minWidth: '82px',
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
                userSelect: 'none',
                padding: '0 4px'
              }}>
                {semitones === 0 
                  ? '0 (Original)' 
                  : `${semitones > 0 ? `+${semitones}` : semitones} ${Math.abs(semitones) === 1 ? 'Halbton' : 'Halbtöne'}`}
              </span>

              <button
                type="button"
                onClick={() => setSemitones(prev => Math.min(12, prev + 1))}
                disabled={semitones >= 12}
                style={{
                  width: '28px',
                  height: '28px',
                  border: 'none',
                  background: 'transparent',
                  color: semitones >= 12 ? '#cbd5e1' : '#0f172a',
                  cursor: semitones >= 12 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%'
                }}
                title="Halbton höher"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Quick Transpose Chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { label: '-12 (Oktave)', val: -12 },
              { label: '-2 (Ganzton)', val: -2 },
              { label: '0 (Original)', val: 0 },
              { label: '+2 (Ganzton)', val: 2 },
              { label: '+12 (Oktave)', val: 12 }
            ].map(chip => (
              <button
                key={chip.val}
                type="button"
                onClick={() => setSemitones(chip.val)}
                style={{
                  background: semitones === chip.val ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : '#ffffff',
                  color: semitones === chip.val ? '#ffffff' : '#475569',
                  border: semitones === chip.val ? '1px solid #15803d' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '3px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  boxShadow: semitones === chip.val ? '0 2px 6px rgba(22, 163, 74, 0.25)' : '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={e => {
                  if (semitones !== chip.val) {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#94a3b8';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={e => {
                  if (semitones !== chip.val) {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* 🎧 Playback & Loop Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={togglePlay}
            style={{
              flex: 1,
              background: isPlaying ? '#0f172a' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '11px 18px',
              fontSize: '0.84rem',
              fontWeight: 850,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isPlaying ? '0 2px 10px rgba(15, 23, 42, 0.25)' : '0 4px 14px rgba(22, 163, 74, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            {isPlaying ? (
              <>
                <Square size={13} fill="currentColor" />
                <span>Stopp</span>
              </>
            ) : (
              <>
                <Play size={13} fill="currentColor" />
                <span>Probehören (Leertaste)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsLoopingSelection(!isLoopingSelection)}
            style={{
              background: isLoopingSelection ? '#dcfce7' : '#f8fafc',
              border: isLoopingSelection ? '1.5px solid #16a34a' : '1.5px solid #cbd5e1',
              color: isLoopingSelection ? '#15803d' : '#475569',
              borderRadius: '14px',
              padding: '11px 16px',
              fontSize: '0.78rem',
              fontWeight: 850,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            title="Loop-Wiedergabe umschalten (L)"
          >
            <Repeat size={14} strokeWidth={isLoopingSelection ? 2.8 : 2.2} />
            <span>Loop</span>
          </button>
        </div>

        {/* 💾 Footer Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleExportSave('duplicate')}
            style={{
              flex: 1,
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '14px',
              padding: '11px',
              fontSize: '0.80rem',
              fontWeight: 850,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
          >
            <Sparkles size={14} color="#6366f1" />
            <span>Als Kopie sichern</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleExportSave('overwrite')}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              border: 'none',
              borderRadius: '14px',
              padding: '11px',
              fontSize: '0.82rem',
              fontWeight: 900,
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            <Check size={15} strokeWidth={3} />
            <span>{isSaving ? 'Speichert...' : 'Speichern'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

