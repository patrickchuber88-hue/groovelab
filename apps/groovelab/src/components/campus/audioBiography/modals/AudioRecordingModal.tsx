import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Disc, X, ChevronDown, Check, CheckCircle2, Play, Pause,
  Mic, Square, Sparkles, Sliders, Radio, Home, Landmark,
  Building2, Music2, FileText, AlertTriangle, RotateCcw, Volume2
} from 'lucide-react';
import {
  ReverbRoomType,
  ROOM_ACOUSTIC_PROFILES,
  DualMasteringResult,
  processStudioMastering
} from '../../../../utils/audioMasteringEngine';
import { SmartInstrumentConfig, SMART_INSTRUMENT_FAMILIES } from '../types';

interface AudioRecordingModalProps {
  onClose: () => void;
  title: string;
  subtitle: string;
  isLight: boolean;
  isRecording: boolean;
  countDown: number | null;
  recordSeconds: number;
  isProcessingMastering: boolean;
  pendingDualResult: DualMasteringResult | null;
  recordingAutoStoppedInfo?: boolean;
  onStartCountIn: () => void;
  onStopRecording: () => void;
  onResetSession: () => void;
  onSaveTrack: (data: {
    versionChoice: 'master' | 'raw';
    songTitle: string;
    artist: string;
    note: string;
    roomType: ReverbRoomType;
    wetPercent: number;
  }) => Promise<void>;
  saveProgress?: { percent: number; stage: string; detail: string } | null;
  defaultInstrument?: SmartInstrumentConfig;
  studentName?: string;
}

const formatSeconds = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const AudioRecordingModal: React.FC<AudioRecordingModalProps> = ({
  onClose,
  title,
  subtitle,
  isLight,
  isRecording,
  countDown,
  recordSeconds,
  isProcessingMastering,
  pendingDualResult,
  recordingAutoStoppedInfo,
  onStartCountIn,
  onStopRecording,
  onResetSession,
  onSaveTrack,
  saveProgress,
  defaultInstrument = SMART_INSTRUMENT_FAMILIES[0],
  studentName = ''
}) => {
  const [activeInstrument, setActiveInstrument] = useState<SmartInstrumentConfig>(defaultInstrument);
  const [showInstrumentPicker, setShowInstrumentPicker] = useState<boolean>(false);
  const [selectedVersionChoice, setSelectedVersionChoice] = useState<'master' | 'raw'>('master');
  const [selectedRoomType, setSelectedRoomType] = useState<ReverbRoomType>('medium');
  const [reverbWetSlider, setReverbWetSlider] = useState<number>(8);
  const [tempSongTitle, setTempSongTitle] = useState<string>('');
  const [tempArtist, setTempArtist] = useState<string>(studentName);
  const [tempNote, setTempNote] = useState<string>('');
  const [modalPreviewPlaying, setModalPreviewPlaying] = useState<'master' | 'raw' | null>(null);
  const [isReMasteringReverb, setIsReMasteringReverb] = useState<boolean>(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);

  const modalDualAudioRef = useRef<{ master: HTMLAudioElement | null; raw: HTMLAudioElement | null }>({ master: null, raw: null });
  const remasterDebounceRef = useRef<any>(null);
  const createdBlobUrlsRef = useRef<Set<string>>(new Set());

  const colors = {
    textPrimary: isLight ? '#0f172a' : '#f8fafc',
    textSecondary: isLight ? '#475569' : '#cbd5e1'
  };

  const registerBlobUrl = useCallback((url: string) => {
    if (url && url.startsWith('blob:')) {
      createdBlobUrlsRef.current.add(url);
    }
    return url;
  }, []);

  const cleanupBlobUrls = useCallback(() => {
    createdBlobUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    createdBlobUrlsRef.current.clear();
  }, []);

  const stopModalDualPreview = useCallback(() => {
    if (modalDualAudioRef.current.master) {
      modalDualAudioRef.current.master.pause();
      modalDualAudioRef.current.master = null;
    }
    if (modalDualAudioRef.current.raw) {
      modalDualAudioRef.current.raw.pause();
      modalDualAudioRef.current.raw = null;
    }
    setModalPreviewPlaying(null);
  }, []);

  useEffect(() => {
    return () => {
      stopModalDualPreview();
      cleanupBlobUrls();
    };
  }, [stopModalDualPreview, cleanupBlobUrls]);

  const toggleModalPreview = useCallback((version: 'master' | 'raw') => {
    if (!pendingDualResult) return;

    if (modalPreviewPlaying === version) {
      stopModalDualPreview();
      return;
    }

    if (modalDualAudioRef.current.master && modalDualAudioRef.current.raw && modalPreviewPlaying) {
      const currentTime = modalPreviewPlaying === 'master' 
        ? modalDualAudioRef.current.master.currentTime 
        : modalDualAudioRef.current.raw.currentTime;

      if (version === 'master') {
        modalDualAudioRef.current.master.currentTime = currentTime;
        modalDualAudioRef.current.raw.volume = 0.0;
        modalDualAudioRef.current.master.volume = 1.0;
      } else {
        modalDualAudioRef.current.raw.currentTime = currentTime;
        modalDualAudioRef.current.master.volume = 0.0;
        modalDualAudioRef.current.raw.volume = 1.0;
      }
      setModalPreviewPlaying(version);
      return;
    }

    stopModalDualPreview();

    const masterUrl = pendingDualResult.masteredUrl;
    const rawUrl = pendingDualResult.rawNormalizedUrl || pendingDualResult.rawUrl;

    if (!masterUrl || !rawUrl) return;

    const masterAudio = new Audio(masterUrl);
    const rawAudio = new Audio(rawUrl);
    masterAudio.loop = true;
    rawAudio.loop = true;

    if (version === 'master') {
      masterAudio.volume = 1.0;
      rawAudio.volume = 0.0;
    } else {
      masterAudio.volume = 0.0;
      rawAudio.volume = 1.0;
    }

    modalDualAudioRef.current = { master: masterAudio, raw: rawAudio };

    Promise.all([
      masterAudio.play().catch(console.warn),
      rawAudio.play().catch(console.warn)
    ]);

    setModalPreviewPlaying(version);
  }, [pendingDualResult, modalPreviewPlaying, stopModalDualPreview]);

  const triggerUploadRemasterPreview = useCallback((roomType: ReverbRoomType, wetPercent: number) => {
    if (!pendingDualResult) return;
    if (remasterDebounceRef.current) clearTimeout(remasterDebounceRef.current);

    remasterDebounceRef.current = setTimeout(async () => {
      setIsReMasteringReverb(true);
      try {
        const rawBlob = pendingDualResult.rawNormalizedBlob || pendingDualResult.rawBlob;
        const newMasterRes = await processStudioMastering(rawBlob, recordSeconds || 30, {
          profile: activeInstrument.profile,
          reverbRoomType: roomType,
          reverbWetMix: wetPercent / 100,
          enableReverb: wetPercent > 0
        });

        registerBlobUrl(newMasterRes.masteredUrl);
        pendingDualResult.masteredBlob = newMasterRes.masteredBlob;
        pendingDualResult.masteredUrl = newMasterRes.masteredUrl;

        if (modalDualAudioRef.current.master) {
          const currentPos = modalDualAudioRef.current.master.currentTime;
          const wasMasterPlaying = modalPreviewPlaying === 'master';
          modalDualAudioRef.current.master.pause();

          const newMasterAudio = new Audio(newMasterRes.masteredUrl);
          newMasterAudio.loop = true;
          newMasterAudio.currentTime = currentPos;
          newMasterAudio.volume = wasMasterPlaying ? 1.0 : 0.0;
          modalDualAudioRef.current.master = newMasterAudio;
          newMasterAudio.play().catch(console.warn);
        }
      } catch (err) {
        console.warn('Remaster preview failed:', err);
      } finally {
        setIsReMasteringReverb(false);
      }
    }, 120);
  }, [pendingDualResult, recordSeconds, activeInstrument.profile, modalPreviewPlaying, registerBlobUrl]);

  const handleUploadRoomTypeChange = useCallback((newRoomType: ReverbRoomType) => {
    setSelectedRoomType(newRoomType);
    const newWet = ROOM_ACOUSTIC_PROFILES[newRoomType]?.defaultWet ?? 8.0;
    setReverbWetSlider(newWet);
    triggerUploadRemasterPreview(newRoomType, newWet);
  }, [triggerUploadRemasterPreview]);

  const handleReverbSliderChange = useCallback((newPercent: number) => {
    setReverbWetSlider(newPercent);
    triggerUploadRemasterPreview(selectedRoomType, newPercent);
  }, [selectedRoomType, triggerUploadRemasterPreview]);

  const handleSave = async () => {
    stopModalDualPreview();
    await onSaveTrack({
      versionChoice: selectedVersionChoice,
      songTitle: tempSongTitle.trim() || title,
      artist: tempArtist.trim() || studentName,
      note: tempNote.trim(),
      roomType: selectedRoomType,
      wetPercent: reverbWetSlider
    });
  };

  const handleClose = () => {
    stopModalDualPreview();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Audio-Aufnahme und Mastering"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
    >
      <div style={{
        background: isLight ? '#ffffff' : '#1e293b',
        border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
        borderRadius: '24px',
        padding: '28px',
        maxWidth: '520px',
        width: '100%',
        color: colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
              border: `1.5px solid ${isLight ? '#a7f3d0' : 'rgba(16, 185, 129, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0
            }}>
              <Disc size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 900, letterSpacing: '-0.02em', color: colors.textPrimary }}>
                {title}
              </h3>
              <span style={{ fontSize: '0.78rem', color: colors.textSecondary, fontWeight: 600 }}>
                {subtitle}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textSecondary,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            aria-label="Modal schließen"
          >
            <X size={16} />
          </button>
        </div>

        {/* Instrument Selector Pill */}
        {!isProcessingMastering && !pendingDualResult && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '100%' }}>
            <button
              type="button"
              onClick={() => setShowInstrumentPicker(prev => !prev)}
              aria-label={`Instrument wählen: ${activeInstrument.name}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '999px',
                background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
                border: `1.5px solid ${showInstrumentPicker ? '#10b981' : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)')}`,
                color: colors.textPrimary,
                cursor: 'pointer'
              }}
              className="hover-scale"
            >
              <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{activeInstrument.emoji}</span>
              <span style={{ fontSize: '0.84rem', fontWeight: 800 }}>{activeInstrument.name}</span>
              <ChevronDown size={14} color={colors.textSecondary} />
            </button>

            {showInstrumentPicker && (
              <div
                style={{
                  position: 'absolute',
                  top: '48px',
                  zIndex: 100,
                  width: '100%',
                  maxWidth: '380px',
                  background: isLight ? '#ffffff' : '#1e293b',
                  border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`,
                  borderRadius: '18px',
                  padding: '8px',
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '240px', overflowY: 'auto' }}>
                  {SMART_INSTRUMENT_FAMILIES.map(family => {
                    const isSelected = activeInstrument.id === family.id;
                    return (
                      <button
                        key={family.id}
                        type="button"
                        onClick={() => {
                          setActiveInstrument(family);
                          setShowInstrumentPicker(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: 'none',
                          background: isSelected ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.18)') : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.25rem' }}>{family.emoji}</span>
                          <span style={{ fontSize: '0.84rem', fontWeight: isSelected ? 900 : 700, color: isSelected ? '#10b981' : colors.textPrimary }}>
                            {family.name}
                          </span>
                        </div>
                        {isSelected && <Check size={16} color="#10b981" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Body */}
        {saveProgress ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '100%', maxWidth: '380px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 900 }}>{saveProgress.stage}</span>
                <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#10b981' }}>{saveProgress.percent}%</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${saveProgress.percent}%`, background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', borderRadius: '999px' }} />
              </div>
              <span style={{ fontSize: '0.76rem', color: colors.textSecondary, marginTop: '10px', display: 'block' }}>{saveProgress.detail}</span>
            </div>
          </div>
        ) : isProcessingMastering ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', border: '4px solid #10b981', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
            <div>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: colors.textPrimary, display: 'block' }}>
                🎛️ Studio Audio-Processing...
              </span>
              <span style={{ fontSize: '0.78rem', color: colors.textSecondary, marginTop: '4px', display: 'block' }}>
                Erzeuge Studio Master & Originalaufnahme
              </span>
            </div>
          </div>
        ) : pendingDualResult ? (
          /* Decision Cards: Master vs RAW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Audiophile Micro CSS Animations for Equalizer Soundbars */}
            <style>{`
              @keyframes soundwave-bar-pulse {
                0%, 100% { height: 4px; }
                50% { height: 13px; }
              }
              .gl-soundwave-1 { animation: soundwave-bar-pulse 0.7s ease-in-out infinite; }
              .gl-soundwave-2 { animation: soundwave-bar-pulse 0.7s ease-in-out infinite 0.18s; }
              .gl-soundwave-3 { animation: soundwave-bar-pulse 0.7s ease-in-out infinite 0.36s; }
            `}</style>

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '1.02rem', fontWeight: 900, color: colors.textPrimary, letterSpacing: '-0.01em', display: 'block' }}>
                Aufnahme fertig: Wähle deinen Klang
              </span>
              <span style={{ fontSize: '0.78rem', color: colors.textSecondary, marginTop: '3px', display: 'block' }}>
                Vergleiche das Studio-Mastering direkt mit der Rohaufnahme.
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label="Klangversion auswählen"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}
            >
              {/* Studio Master Card */}
              <div
                role="radio"
                aria-checked={selectedVersionChoice === 'master'}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedVersionChoice('master');
                  }
                }}
                onClick={() => setSelectedVersionChoice('master')}
                style={{
                  border: `2px solid ${selectedVersionChoice === 'master' ? '#10b981' : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)')}`,
                  borderRadius: '16px',
                  padding: '14px',
                  background: selectedVersionChoice === 'master' ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.12)') : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  outline: 'none',
                  boxShadow: selectedVersionChoice === 'master' ? '0 4px 16px rgba(16, 185, 129, 0.18)' : 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '3px 9px',
                    borderRadius: '100px',
                    background: '#10b981',
                    color: 'white',
                    letterSpacing: '0.04em'
                  }}>
                    <Sparkles size={11} />
                    <span>STUDIO MASTER</span>
                  </span>
                  {selectedVersionChoice === 'master' && <CheckCircle2 size={17} color="#10b981" />}
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 900, color: colors.textPrimary }}>Studio Audio-Processing</div>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: colors.textSecondary, lineHeight: 1.35 }}>
                  Mit Studio Audio-Processing, Raumakustik & Dynamik.
                </p>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleModalPreview('master');
                  }}
                  aria-label={modalPreviewPlaying === 'master' ? 'Studio Master pausieren' : 'Studio Master vorhören'}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '100px',
                    border: 'none',
                    background: modalPreviewPlaying === 'master' ? '#047857' : '#10b981',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginTop: '4px',
                    boxShadow: modalPreviewPlaying === 'master' ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {modalPreviewPlaying === 'master' ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '12px' }}>
                        <span className="gl-soundwave-1" style={{ width: '2.5px', background: '#ffffff', borderRadius: '1px' }} />
                        <span className="gl-soundwave-2" style={{ width: '2.5px', background: '#ffffff', borderRadius: '1px' }} />
                        <span className="gl-soundwave-3" style={{ width: '2.5px', background: '#ffffff', borderRadius: '1px' }} />
                      </div>
                      <Pause size={12} />
                      <span>Wiedergabe stoppen</span>
                    </>
                  ) : (
                    <>
                      <Play size={12} fill="white" />
                      <span>Master vorhören</span>
                    </>
                  )}
                </button>
              </div>

              {/* RAW Card */}
              <div
                role="radio"
                aria-checked={selectedVersionChoice === 'raw'}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedVersionChoice('raw');
                  }
                }}
                onClick={() => setSelectedVersionChoice('raw')}
                style={{
                  border: `2px solid ${selectedVersionChoice === 'raw' ? '#3b82f6' : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)')}`,
                  borderRadius: '16px',
                  padding: '14px',
                  background: selectedVersionChoice === 'raw' ? (isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.12)') : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  outline: 'none',
                  boxShadow: selectedVersionChoice === 'raw' ? '0 4px 16px rgba(59, 130, 246, 0.18)' : 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '3px 9px',
                    borderRadius: '100px',
                    background: '#3b82f6',
                    color: 'white',
                    letterSpacing: '0.04em'
                  }}>
                    <Radio size={11} />
                    <span>ORIGINALAUFNAHME</span>
                  </span>
                  {selectedVersionChoice === 'raw' && <CheckCircle2 size={17} color="#3b82f6" />}
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 900, color: colors.textPrimary }}>Originalaufnahme</div>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: colors.textSecondary, lineHeight: 1.35 }}>
                  Unbearbeitete Originalaufnahme mit pegelangepasster Lautheit.
                </p>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleModalPreview('raw');
                  }}
                  aria-label={modalPreviewPlaying === 'raw' ? 'Originalaufnahme pausieren' : 'Originalaufnahme vorhören'}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '100px',
                    border: 'none',
                    background: modalPreviewPlaying === 'raw' ? '#1e40af' : '#3b82f6',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginTop: '4px',
                    boxShadow: modalPreviewPlaying === 'raw' ? '0 0 12px rgba(59, 130, 246, 0.4)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {modalPreviewPlaying === 'raw' ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '12px' }}>
                        <span className="gl-soundwave-1" style={{ width: '2.5px', background: '#ffffff', borderRadius: '1px' }} />
                        <span className="gl-soundwave-2" style={{ width: '2.5px', background: '#ffffff', borderRadius: '1px' }} />
                        <span className="gl-soundwave-3" style={{ width: '2.5px', background: '#ffffff', borderRadius: '1px' }} />
                      </div>
                      <Pause size={12} />
                      <span>Wiedergabe stoppen</span>
                    </>
                  ) : (
                    <>
                      <Play size={12} fill="white" />
                      <span>Originalaufnahme vorhören</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Apple-Style Spatial Audio Raumakustik (3 Presets + Fein-Tuning Slider) */}
            <div style={{
              background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)',
              borderRadius: '18px',
              padding: '14px 16px',
              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={16} color="#10b981" />
                  <span style={{ fontSize: '0.84rem', fontWeight: 900, color: colors.textPrimary, letterSpacing: '-0.01em' }}>
                    Raumakustik & Hall
                  </span>
                  {isReMasteringReverb && (
                    <span style={{ fontSize: '0.70rem', color: '#10b981', fontWeight: 800, animation: 'pulse 1s infinite' }}>
                      Remastering...
                    </span>
                  )}
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: isLight ? '#065f46' : '#6ee7b7',
                  background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.18)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '3px 10px',
                  borderRadius: '100px'
                }}>
                  {selectedRoomType === 'small' && <Home size={12} />}
                  {selectedRoomType === 'medium' && <Landmark size={12} />}
                  {selectedRoomType === 'large' && <Building2 size={12} />}
                  <span>{ROOM_ACOUSTIC_PROFILES[selectedRoomType]?.name || 'Mittel'} ({ROOM_ACOUSTIC_PROFILES[selectedRoomType]?.sub || 'Konzertsaal'}) • {reverbWetSlider}% Wet</span>
                </div>
              </div>

              {/* 3 Room Size Preset Buttons with Vector Icons */}
              <div
                role="radiogroup"
                aria-label="Raumgröße Presets"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}
              >
                {[ROOM_ACOUSTIC_PROFILES.small, ROOM_ACOUSTIC_PROFILES.medium, ROOM_ACOUSTIC_PROFILES.large].map(room => {
                  const isActive = selectedRoomType === room.id;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => handleUploadRoomTypeChange(room.id as any)}
                      style={{
                        padding: '12px 6px',
                        borderRadius: '14px',
                        border: isActive 
                          ? '2px solid #10b981' 
                          : `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
                        background: isActive 
                          ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.22)') 
                          : (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.03)'),
                        boxShadow: isActive ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                      className="hover-scale"
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: isActive ? (isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.25)') : (isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isActive ? '#10b981' : colors.textSecondary
                      }}>
                        {room.id === 'small' && <Home size={17} />}
                        {room.id === 'medium' && <Landmark size={17} />}
                        {room.id === 'large' && <Building2 size={17} />}
                      </div>
                      <span style={{
                        fontSize: '0.80rem',
                        fontWeight: 900,
                        color: isActive ? (isLight ? '#059669' : '#34d399') : colors.textPrimary,
                        whiteSpace: 'nowrap'
                      }}>
                        {room.name}
                      </span>
                      <span style={{
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        color: isActive ? (isLight ? '#059669' : '#10b981') : colors.textSecondary
                      }}>
                        {room.sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Apple Fine-Tuning Slider Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: colors.textSecondary, fontWeight: 700 }}>
                  <label htmlFor="reverb-slider-range" style={{ cursor: 'pointer' }}>
                    Feinabstimmung (Raumtiefe & Wet/Dry Mix):
                  </label>
                  <span style={{ color: '#10b981', fontWeight: 900 }}>{reverbWetSlider}% Wet</span>
                </div>
                <input
                  id="reverb-slider-range"
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={reverbWetSlider}
                  aria-label="Raumtiefe und Wet/Dry Mix"
                  onChange={(e) => handleReverbSliderChange(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer', height: '6px' }}
                />
              </div>
            </div>

            {/* Song Meta Inputs - Structured Track Details Card */}
            <div style={{
              background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
              borderRadius: '16px',
              padding: '14px',
              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.70rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.textSecondary }}>
                <Music2 size={13} color="#10b981" />
                <span>Track-Details</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label htmlFor="recording-song-title" style={{ fontSize: '0.68rem', fontWeight: 800, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Songtitel
                </label>
                <input
                  id="recording-song-title"
                  type="text"
                  placeholder={title || 'Songtitel eingeben...'}
                  value={tempSongTitle}
                  onChange={(e) => setTempSongTitle(e.target.value)}
                  aria-label="Songtitel"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.16)'}`,
                    background: isLight ? '#ffffff' : 'rgba(0, 0, 0, 0.3)',
                    color: colors.textPrimary,
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label htmlFor="recording-song-note" style={{ fontSize: '0.68rem', fontWeight: 800, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Persönliche Notiz (optional)
                </label>
                <input
                  id="recording-song-note"
                  type="text"
                  placeholder="z. B. Im ersten Take gemeistert..."
                  value={tempNote}
                  onChange={(e) => setTempNote(e.target.value)}
                  aria-label="Persönliche Notiz"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.12)'}`,
                    background: isLight ? '#ffffff' : 'rgba(0, 0, 0, 0.2)',
                    color: colors.textPrimary,
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Action Buttons & Safe Discard Safeguard */}
            {showDiscardConfirm ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '14px',
                background: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.12)',
                border: `1.5px solid ${isLight ? '#fecaca' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} color="#ef4444" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isLight ? '#991b1b' : '#fca5a5' }}>
                    Aufnahme wirklich verwerfen und neu starten?
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowDiscardConfirm(false)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '100px',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                      background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                      color: colors.textPrimary,
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopModalDualPreview();
                      setShowDiscardConfirm(false);
                      onResetSession();
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '100px',
                      border: 'none',
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    Ja, Aufnahme löschen
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(true)}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '100px',
                    border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)'}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  className="hover-scale"
                >
                  <RotateCcw size={15} />
                  <span>Neu aufnehmen</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  style={{
                    flex: 2,
                    padding: '12px 20px',
                    borderRadius: '100px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)'
                  }}
                  className="hover-scale"
                >
                  <Check size={18} strokeWidth={2.8} />
                  <span>Aufnahme speichern</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Mic Capture View */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
            {countDown !== null ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '92px', height: '92px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(16, 185, 129, 0.5)' }}>
                  <span style={{ fontSize: '2.8rem', fontWeight: 900, color: 'white' }}>{countDown}</span>
                </div>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#10b981' }}>Hände ans Instrument!</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={isRecording ? onStopRecording : onStartCountIn}
                  aria-label={isRecording ? 'Aufnahme beenden' : 'Aufnahme starten'}
                  style={{
                    width: '92px',
                    height: '92px',
                    borderRadius: '50%',
                    background: isRecording ? '#ef4444' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: isRecording ? '0 10px 28px rgba(239, 68, 68, 0.5)' : '0 10px 28px rgba(16, 185, 129, 0.4)'
                  }}
                  className="hover-scale"
                >
                  {isRecording ? <Square size={32} fill="#ffffff" color="#ffffff" /> : <Mic size={38} color="#ffffff" strokeWidth={2.4} />}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '1.45rem', fontWeight: 900, color: isRecording ? '#ef4444' : colors.textPrimary, display: 'block' }}>
                    {isRecording ? formatSeconds(recordSeconds) : 'Bereit zur Aufnahme'}
                  </span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.80rem', color: colors.textSecondary }}>
                    {isRecording ? 'Aufnahme läuft... Spiele deinen Song!' : 'Ein Tap aufs Mikrofon startet 3 Sekunden Einzählen.'}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
