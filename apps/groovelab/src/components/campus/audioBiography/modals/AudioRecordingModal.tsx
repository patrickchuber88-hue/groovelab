import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Disc, X, ChevronDown, Check, CheckCircle2, Play, Pause,
  Mic, Square, Sparkles
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

  const modalDualAudioRef = useRef<{ master: HTMLAudioElement | null; raw: HTMLAudioElement | null }>({ master: null, raw: null });
  const remasterDebounceRef = useRef<any>(null);

  const colors = {
    textPrimary: isLight ? '#0f172a' : '#f8fafc',
    textSecondary: isLight ? '#475569' : '#cbd5e1'
  };

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
    };
  }, [stopModalDualPreview]);

  const toggleModalPreview = useCallback((version: 'master' | 'raw') => {
    if (!pendingDualResult) return;

    if (modalPreviewPlaying === version) {
      stopModalDualPreview();
      return;
    }

    if (modalDualAudioRef.current.master && modalDualAudioRef.current.raw && modalPreviewPlaying) {
      if (version === 'master') {
        modalDualAudioRef.current.raw.volume = 0.0;
        modalDualAudioRef.current.master.volume = 1.0;
      } else {
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
  }, [pendingDualResult, recordSeconds, activeInstrument.profile, modalPreviewPlaying]);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Disc size={22} color="#10b981" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.01em' }}>
                {title}
              </h3>
              <span style={{ fontSize: '0.80rem', color: colors.textSecondary, fontWeight: 600 }}>
                {subtitle}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '1.2rem', cursor: 'pointer' }}
            aria-label="Schließen"
          >
            ✕
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
                Erzeuge Studio Audio-Processing & Pure RAW
              </span>
            </div>
          </div>
        ) : pendingDualResult ? (
          /* Decision Cards: Master vs RAW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.96rem', fontWeight: 900, color: colors.textPrimary, display: 'block' }}>
                🎵 Aufnahme fertig! Welche Version möchtest du speichern?
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Studio Master Card */}
              <div
                onClick={() => setSelectedVersionChoice('master')}
                style={{
                  border: `2px solid ${selectedVersionChoice === 'master' ? '#10b981' : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)')}`,
                  borderRadius: '16px',
                  padding: '14px',
                  background: selectedVersionChoice === 'master' ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.12)') : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 900, padding: '2px 8px', borderRadius: '100px', background: '#10b981', color: 'white' }}>
                    ✨ STUDIO MASTER
                  </span>
                  {selectedVersionChoice === 'master' && <CheckCircle2 size={16} color="#10b981" />}
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 900, color: colors.textPrimary }}>Studio Audio-Processing</div>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: colors.textSecondary, lineHeight: 1.3 }}>
                  Mit Studio Audio-Processing, Raumakustik & Dynamik.
                </p>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleModalPreview('master');
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '100px',
                    border: 'none',
                    background: modalPreviewPlaying === 'master' ? '#ef4444' : '#10b981',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    marginTop: '4px'
                  }}
                >
                  {modalPreviewPlaying === 'master' ? <Pause size={13} /> : <Play size={13} />}
                  <span>{modalPreviewPlaying === 'master' ? '🔁 Loop stoppen' : '▶️ Master vorhören (Loop)'}</span>
                </button>
              </div>

              {/* RAW Card */}
              <div
                onClick={() => setSelectedVersionChoice('raw')}
                style={{
                  border: `2px solid ${selectedVersionChoice === 'raw' ? '#3b82f6' : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)')}`,
                  borderRadius: '16px',
                  padding: '14px',
                  background: selectedVersionChoice === 'raw' ? (isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.12)') : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 900, padding: '2px 8px', borderRadius: '100px', background: '#3b82f6', color: 'white' }}>
                    🎙️ PURE RAW
                  </span>
                  {selectedVersionChoice === 'raw' && <CheckCircle2 size={16} color="#3b82f6" />}
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 900, color: colors.textPrimary }}>Originalklang (RAW)</div>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: colors.textSecondary, lineHeight: 1.3 }}>
                  Unbearbeitete Originalaufnahme mit pegelangepasster Lautheit.
                </p>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleModalPreview('raw');
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '100px',
                    border: 'none',
                    background: modalPreviewPlaying === 'raw' ? '#ef4444' : '#3b82f6',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    marginTop: '4px'
                  }}
                >
                  {modalPreviewPlaying === 'raw' ? <Pause size={13} /> : <Play size={13} />}
                  <span>{modalPreviewPlaying === 'raw' ? '🔁 Loop stoppen' : '▶️ RAW vorhören (Loop)'}</span>
                </button>
              </div>
            </div>

            {/* 🏛️ Apple-Style Spatial Audio Raumakustik (3 Presets + Fein-Tuning Slider) */}
            <div style={{
              background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)',
              borderRadius: '18px',
              padding: '14px 16px',
              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: colors.textPrimary, letterSpacing: '-0.01em' }}>
                    🏛️ Raumgröße & Hall
                  </span>
                  {isReMasteringReverb && (
                    <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 800, animation: 'pulse 1s infinite' }}>
                      ⏳ Remastering...
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  color: '#10b981',
                  background: isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.18)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '2px 9px',
                  borderRadius: '100px'
                }}>
                  {ROOM_ACOUSTIC_PROFILES[selectedRoomType]?.emoji || '🏛️'} {ROOM_ACOUSTIC_PROFILES[selectedRoomType]?.name || 'Mittel'} ({ROOM_ACOUSTIC_PROFILES[selectedRoomType]?.sub || 'Konzertsaal'}) • {reverbWetSlider}% Wet
                </span>
              </div>

              {/* 3 Child-Friendly Room Size Preset Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[ROOM_ACOUSTIC_PROFILES.small, ROOM_ACOUSTIC_PROFILES.medium, ROOM_ACOUSTIC_PROFILES.large].map(room => {
                  const isActive = selectedRoomType === room.id;
                  return (
                    <button
                      key={room.id}
                      type="button"
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
                        gap: '4px',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                      className="hover-scale"
                    >
                      <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>{room.emoji}</span>
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
                        color: isActive ? (isLight ? '#15803d' : '#86efac') : colors.textSecondary
                      }}>
                        {room.sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Apple Fine-Tuning Slider Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: colors.textSecondary, fontWeight: 700 }}>
                  <span>Feinabstimmung (Raumtiefe & Wet/Dry Mix):</span>
                  <span style={{ color: '#10b981', fontWeight: 900 }}>{reverbWetSlider}% Wet</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={reverbWetSlider}
                  onChange={(e) => handleReverbSliderChange(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Song Meta Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text"
                placeholder="Songtitel eingeben..."
                value={tempSongTitle}
                onChange={(e) => setTempSongTitle(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '12px', border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`, background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.35)', color: colors.textPrimary }}
              />
              <input
                type="text"
                placeholder="Persönliche Notiz (optional)..."
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '12px', border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.15)'}`, background: isLight ? '#ffffff' : 'rgba(0,0,0,0.25)', color: colors.textPrimary }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={onResetSession}
                style={{ flex: 1, padding: '12px', borderRadius: '100px', border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)'}`, background: 'transparent', color: colors.textSecondary, fontWeight: 800, cursor: 'pointer' }}
              >
                Neu aufnehmen
              </button>
              <button
                type="button"
                onClick={handleSave}
                style={{ flex: 2, padding: '12px', borderRadius: '100px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', fontWeight: 900, cursor: 'pointer' }}
                className="hover-scale"
              >
                Speichern
              </button>
            </div>
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
