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
  const startTimeRef = useRef(startTime);
  const endTimeRef = useRef(endTime);
  const isPlayingRef = useRef(false);

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
        if (activeUrl.startsWith('data:audio') || activeUrl.startsWith('blob:') || activeUrl.startsWith('http')) {
          const resp = await fetch(activeUrl);
          arrayBuffer = await resp.arrayBuffer();
        } else {
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

        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioCtxRef.current = audioCtx;

        const decoded = await audioCtx.decodeAudioData(arrayBuffer);
        if (!active) return;

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

  // Compute 192 waveform vertical amplitude bars
  const waveformBars = useMemo(() => {
    if (!audioBuffer) return [];
    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;
    const barsCount = 192;
    const blockSize = Math.floor(totalSamples / barsCount);
    const bars: number[] = [];

    for (let i = 0; i < barsCount; i++) {
      let blockSum = 0;
      const start = i * blockSize;
      const end = Math.min(start + blockSize, totalSamples);
      for (let j = start; j < end; j += 4) {
        blockSum += Math.abs(channelData[j]);
      }
      const avg = blockSum / ((end - start) / 4 || 1);
      const heightPercent = Math.min(100, Math.max(12, Math.round(Math.pow(avg, 0.75) * 180)));
      bars.push(heightPercent);
    }
    return bars;
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

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    if (source.detune) {
      source.detune.value = semitones * 100;
    } else {
      source.playbackRate.value = Math.pow(2, semitones / 12);
    }

    source.connect(ctx.destination);

    const curStart = startTimeRef.current;
    const curEnd = endTimeRef.current;
    const requestedStart = startSec !== undefined ? startSec : curStart;
    const playStart = Math.max(0, Math.min(curEnd - 0.05, requestedStart));
    const playDuration = Math.max(0.1, curEnd - playStart);

    source.start(0, playStart, playDuration);
    activeSourceRef.current = source;
    isPlayingRef.current = true;
    setIsPlaying(true);
    setCurrentPlayTime(playStart);
    playbackStartTimestampRef.current = ctx.currentTime;

    // 🔁 Automatisch immer im Loop abspielen:
    source.onended = () => {
      if (isPlayingRef.current) {
        playFrom(startTimeRef.current);
      } else {
        stopPlayback();
      }
    };

    const updatePlayhead = () => {
      if (!ctx || !activeSourceRef.current || !isPlayingRef.current) return;
      const elapsed = ctx.currentTime - playbackStartTimestampRef.current;
      const current = playStart + elapsed;
      if (current <= curEnd) {
        setCurrentPlayTime(current);
        animFrameRef.current = requestAnimationFrame(updatePlayhead);
      } else {
        setCurrentPlayTime(curEnd);
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

                  {/* 1. Inactive/Dimmed Waveform */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5px',
                    opacity: 0.22,
                    pointerEvents: 'none'
                  }}>
                    {waveformBars.map((heightPercent, i) => (
                      <div
                        key={`dim-${i}`}
                        style={{
                          flex: 1,
                          minWidth: '1.5px',
                          height: `${heightPercent}%`,
                          borderRadius: '99px',
                          background: '#64748b'
                        }}
                      />
                    ))}
                  </div>

                  {/* 2. Active Selection Waveform */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5px',
                    clipPath: `inset(0 ${Math.max(0, 100 - endPercent)}% 0 ${startPercent}%)`,
                    WebkitClipPath: `inset(0 ${Math.max(0, 100 - endPercent)}% 0 ${startPercent}%)`,
                    pointerEvents: 'none'
                  }}>
                    {waveformBars.map((heightPercent, i) => (
                      <div
                        key={`act-${i}`}
                        style={{
                          flex: 1,
                          minWidth: '1.5px',
                          height: `${heightPercent}%`,
                          borderRadius: '99px',
                          background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
                          boxShadow: heightPercent > 40 ? '0 0 4px rgba(34, 197, 94, 0.35)' : 'none'
                        }}
                      />
                    ))}
                  </div>

                  {/* 3. Live Playhead Needle during Playback */}
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
