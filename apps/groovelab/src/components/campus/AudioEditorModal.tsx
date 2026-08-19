import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Square, Repeat, ChevronLeft, ChevronRight, X, Sparkles, Check, RotateCcw } from 'lucide-react';
import { getBlob, storeBlob } from '../../utils/blobStorage';

interface AudioEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioUrl: string;
  initialLabel?: string;
  initialDuration?: number;
  onSave: (result: { url: string; duration: number; label: string; mode: 'overwrite' | 'duplicate' }) => void;
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
  initialLabel = 'Aufnahme',
  initialDuration = 0,
  onSave
}) => {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoopingSelection, setIsLoopingSelection] = useState(false);
  
  const [duration, setDuration] = useState(initialDuration || 0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(initialDuration || 0);
  const [currentPlayTime, setCurrentPlayTime] = useState(0);
  
  const [semitones, setSemitones] = useState(0); // Pitch Shift: -12 to +12
  const [editLabel, setEditLabel] = useState(initialLabel);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDraggingHandle, setActiveDraggingHandle] = useState<'start' | 'end' | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimestampRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingHandleRef = useRef<'start' | 'end' | null>(null);

  // Load and decode audio buffer
  useEffect(() => {
    if (!isOpen || !audioUrl) return;
    let active = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        let arrayBuffer: ArrayBuffer | null = null;
        if (audioUrl.startsWith('campus_blob_') || audioUrl.startsWith('campus_audio_')) {
          const raw = await getBlob(audioUrl);
          if (raw instanceof Blob) {
            arrayBuffer = await raw.arrayBuffer();
          } else if (raw instanceof ArrayBuffer) {
            arrayBuffer = raw;
          }
        } else {
          const res = await fetch(audioUrl);
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
  }, [isOpen, audioUrl]);

  // Compute 92 ultra-fine normalized waveform bars
  const waveformBars = useMemo(() => {
    if (!audioBuffer) return Array(92).fill(20);
    const numBars = 92;
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerBar = Math.floor(channelData.length / numBars);
    const rawPeaks: number[] = [];

    for (let i = 0; i < numBars; i++) {
      let max = 0;
      const start = i * samplesPerBar;
      const end = start + samplesPerBar;
      for (let j = start; j < end; j += 4) {
        const val = Math.abs(channelData[j]);
        if (val > max) max = val;
      }
      rawPeaks.push(max);
    }

    const highestPeak = Math.max(...rawPeaks, 0.04);
    // Normalize to range 14% to 96% height
    return rawPeaks.map(p => Math.max(14, Math.round((p / highestPeak) * 96)));
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

  // 🎛️ Real-time live pitch shifting during active playback
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

      onSave({
        url: newKey,
        duration: newDurationSec,
        label: finalLabel,
        mode
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

  if (!isOpen) return null;

  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;
  const playPercent = duration > 0 ? (currentPlayTime / duration) * 100 : startPercent;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.2), 0 0 1px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        padding: '24px',
        boxSizing: 'border-box',
        animation: 'scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}>
        
        {/* Apple-Style Header: Minimal, Clean */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Audio-Editor
            </span>
            <h3 style={{ margin: '1px 0 0', fontSize: '1.20rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
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
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
            title="Schließen"
          >
            <X size={15} />
          </button>
        </div>

        {/* Minimalist Title Field */}
        <input
          type="text"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          placeholder="Titel der Aufnahme..."
          style={{
            width: '100%',
            fontSize: '0.88rem',
            fontWeight: 700,
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#0f172a',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s ease'
          }}
        />

        {/* Minimalist Waveform Section */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '18px',
          border: '1px solid #e2e8f0',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxSizing: 'border-box'
        }}>
          
          {/* Header Numbers: Start | Total Selection (with Reset button) | End */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', fontWeight: 750, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: '#ef4444', fontWeight: 800 }}>Start: {formatTime(startTime)}</span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: '#0f172a', fontWeight: 850, background: '#ffffff', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '6px' }}>
                Dauer: {formatTime(Math.max(0, endTime - startTime))}
              </span>
              {(startTime > 0.05 || endTime < duration - 0.05) && (
                <button
                  type="button"
                  onClick={handleResetFullLength}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    fontSize: '0.66rem',
                    fontWeight: 750,
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  className="hover-scale-mini"
                  title="Ganze Länge wiederherstellen"
                >
                  <RotateCcw size={10} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <span style={{ color: '#ef4444', fontWeight: 800 }}>Ende: {formatTime(endTime)}</span>
          </div>

          {/* Ultra-Fine Waveform Trimmer with 1px Red Needles, Exact Clip-Masking, and Click-to-Play */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '76px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '0 12px',
              boxSizing: 'border-box',
              overflow: 'visible',
              userSelect: 'none',
              touchAction: 'none'
            }}
          >
            {/* Unified 100% Inner Coordinate Track */}
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
              title="Klicken zum Vorhören ab dieser Stelle"
            >
              {isLoading ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}>
                  Lädt Waveform...
                </div>
              ) : (
                <>
                  {/* 1. Underlying Dimmed Waveform (Full Width, 35% Transparent Gray) */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    opacity: 0.35,
                    pointerEvents: 'none'
                  }}>
                    {waveformBars.map((heightPercent, i) => (
                      <div
                        key={`dim-${i}`}
                        style={{
                          flex: 1,
                          minWidth: '2px',
                          height: `${heightPercent}%`,
                          borderRadius: '1px',
                          background: '#94a3b8'
                        }}
                      />
                    ))}
                  </div>

                  {/* 2. Active Vibrant Green Waveform, Pixel-Perfect Cut Exactly on the Red Needles */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    clipPath: `inset(0 ${Math.max(0, 100 - endPercent)}% 0 ${startPercent}%)`,
                    WebkitClipPath: `inset(0 ${Math.max(0, 100 - endPercent)}% 0 ${startPercent}%)`,
                    pointerEvents: 'none'
                  }}>
                    {waveformBars.map((heightPercent, i) => (
                      <div
                        key={`act-${i}`}
                        style={{
                          flex: 1,
                          minWidth: '2px',
                          height: `${heightPercent}%`,
                          borderRadius: '1px',
                          background: '#16a34a'
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
                      boxShadow: '0 0 6px rgba(15, 23, 42, 0.7), 0 0 2px #ffffff',
                      pointerEvents: 'none',
                      zIndex: 40
                    }}>
                      {/* Diamond Top Cap */}
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '7px',
                        height: '7px',
                        background: '#0f172a',
                        borderRadius: '50%',
                        border: '1.5px solid #ffffff'
                      }} />
                    </div>
                  )}

                  {/* 4. 🔴 1px Ultra-Fine Red Needle - START */}
                  <div
                    onPointerDown={(e) => handlePointerDownHandle(e, 'start')}
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      bottom: '-6px',
                      left: `${startPercent}%`,
                      transform: 'translateX(-50%)',
                      width: '24px',
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
                  {/* Floating Time Tooltip during Drag */}
                  {activeDraggingHandle === 'start' && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      marginBottom: '6px',
                      background: '#0f172a',
                      color: '#ffffff',
                      fontSize: '0.64rem',
                      fontWeight: 850,
                      padding: '2px 6px',
                      borderRadius: '5px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      pointerEvents: 'none'
                    }}>
                      {formatTime(startTime)}
                    </div>
                  )}

                  {/* Top Grip Circle */}
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    border: '1.5px solid #ffffff',
                    boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
                    flexShrink: 0
                  }} />

                  {/* 1px Center Red Needle Line */}
                  <div style={{
                    width: '1px',
                    flex: 1,
                    background: '#ef4444',
                    boxShadow: '0 0 3px rgba(239, 68, 68, 0.4)'
                  }} />

                  {/* Bottom Grip Circle */}
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    border: '1.5px solid #ffffff',
                    boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
                    flexShrink: 0
                  }} />
                </div>

                {/* 5. 🔴 1px Ultra-Fine Red Needle - END */}
                <div
                  onPointerDown={(e) => handlePointerDownHandle(e, 'end')}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    bottom: '-6px',
                    left: `${endPercent}%`,
                    transform: 'translateX(-50%)',
                    width: '24px',
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
                  {/* Floating Time Tooltip during Drag */}
                  {activeDraggingHandle === 'end' && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      marginBottom: '6px',
                      background: '#0f172a',
                      color: '#ffffff',
                      fontSize: '0.64rem',
                      fontWeight: 850,
                      padding: '2px 6px',
                      borderRadius: '5px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      pointerEvents: 'none'
                    }}>
                      {formatTime(endTime)}
                    </div>
                  )}

                  {/* Top Grip Circle */}
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    border: '1.5px solid #ffffff',
                    boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
                    flexShrink: 0
                  }} />

                  {/* 1px Center Red Needle Line */}
                  <div style={{
                    width: '1px',
                    flex: 1,
                    background: '#ef4444',
                    boxShadow: '0 0 3px rgba(239, 68, 68, 0.4)'
                  }} />

                  {/* Bottom Grip Circle */}
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    border: '1.5px solid #ffffff',
                    boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
                    flexShrink: 0
                  }} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Minimalist Micro-Steppers */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  const val = Math.max(0, Number((startTime - 0.1).toFixed(1)));
                  setStartTime(val);
                  if (!isPlaying) setCurrentPlayTime(val);
                }}
                style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '3px 7px', fontSize: '0.66rem', fontWeight: 800, color: '#475569', cursor: 'pointer' }}
                className="hover-scale-mini"
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
                style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '3px 7px', fontSize: '0.66rem', fontWeight: 800, color: '#475569', cursor: 'pointer' }}
                className="hover-scale-mini"
              >
                +0.1s
              </button>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setEndTime(prev => Math.max(startTime + 0.1, Number((prev - 0.1).toFixed(1))))}
                style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '3px 7px', fontSize: '0.66rem', fontWeight: 800, color: '#475569', cursor: 'pointer' }}
                className="hover-scale-mini"
              >
                -0.1s
              </button>
              <button
                type="button"
                onClick={() => setEndTime(prev => Math.min(duration, Number((prev + 0.1).toFixed(1))))}
                style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '3px 7px', fontSize: '0.66rem', fontWeight: 800, color: '#475569', cursor: 'pointer' }}
                className="hover-scale-mini"
              >
                +0.1s
              </button>
            </div>
          </div>
        </div>

        {/* Minimalist Pitch Control: Left Arrow | Number | Right Arrow */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>
            Tonhöhe (Pitch)
          </span>

          {/* Stepper Capsule: [ < ] [ +1 ] [ > ] */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '99px',
            padding: '2px 4px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
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
              className="hover-scale-mini"
              title="Halbton tiefer"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>

            <span style={{
              fontSize: '0.84rem',
              fontWeight: 900,
              color: semitones !== 0 ? '#16a34a' : '#475569',
              minWidth: '42px',
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
              userSelect: 'none'
            }}>
              {semitones > 0 ? `+${semitones}` : semitones}
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
              className="hover-scale-mini"
              title="Halbton höher"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Minimal Playback Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={togglePlay}
            style={{
              flex: 1,
              background: isPlaying ? '#0f172a' : '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: isPlaying ? '0 2px 8px rgba(15, 23, 42, 0.2)' : '0 2px 8px rgba(22, 163, 74, 0.25)',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
          >
            {isPlaying ? (
              <>
                <Square size={12} fill="currentColor" />
                <span>Stopp</span>
              </>
            ) : (
              <>
                <Play size={12} fill="currentColor" />
                <span>Probehören</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsLoopingSelection(!isLoopingSelection)}
            style={{
              background: isLoopingSelection ? '#dcfce7' : '#f8fafc',
              border: isLoopingSelection ? '1.2px solid #16a34a' : '1px solid #e2e8f0',
              color: isLoopingSelection ? '#15803d' : '#64748b',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
            title="Loop-Wiedergabe"
          >
            <Repeat size={12} strokeWidth={isLoopingSelection ? 2.6 : 2} />
            <span>Loop</span>
          </button>
        </div>

        {/* Minimalist Footer Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleExportSave('duplicate')}
            style={{
              flex: 1,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '10px',
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
            className="hover-scale"
          >
            <Sparkles size={12} color="#6366f1" />
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
              borderRadius: '12px',
              padding: '10px',
              fontSize: '0.78rem',
              fontWeight: 850,
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)'
            }}
            className="hover-scale"
          >
            <Check size={13} strokeWidth={3} />
            <span>{isSaving ? 'Speichert...' : 'Speichern'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
