import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SlidersHorizontal, Landmark, Home, Maximize2, Check, Sparkles
} from 'lucide-react';
import { ReverbRoomType, processStudioMastering } from '../../../../utils/audioMasteringEngine';
import { getBlob } from '../../../../utils/blobStorage';
import { AudioVersionSquareCover } from '../views/AudioVersionSquareCover';

export interface EditingTrackData {
  trackId: string;
  title: string;
  artist?: string;
  preferredVersion: 'master' | 'raw';
  reverbRoomType: ReverbRoomType;
  reverbWetMix: number;
  rawUrl?: string;
  masteredUrl?: string;
  remasteredBlob?: Blob;
}

interface TrackEditModalProps {
  trackData: EditingTrackData;
  onClose: () => void;
  onSave: (data: EditingTrackData) => Promise<void>;
  isLight: boolean;
  onPreviewToggle?: (version: 'master' | 'raw') => void;
  previewPlaying?: 'master' | 'raw' | null;
}

export const TrackEditModal: React.FC<TrackEditModalProps> = ({
  trackData,
  onClose,
  onSave,
  isLight
}) => {
  const [data, setData] = useState<EditingTrackData>(trackData);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activePlayingVersion, setActivePlayingVersion] = useState<'master' | 'raw' | null>(null);
  const [isRemastering, setIsRemastering] = useState<boolean>(false);

  // Audio & DSP Engine Referenzen
  const rawBlobRef = useRef<Blob | null>(null);
  const currentMasterUrlRef = useRef<string>(trackData.masteredUrl || '');
  const currentRawUrlRef = useRef<string>(trackData.rawUrl || '');
  const remasteredBlobRef = useRef<Blob | null>(null);
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null);
  const createdUrlsRef = useRef<string[]>([]);
  const remasterDebounceRef = useRef<any>(null);

  const colors = {
    textPrimary: isLight ? '#0f172a' : '#f8fafc',
    textSecondary: isLight ? '#475569' : '#cbd5e1'
  };

  // 1. Initialisierung: Raw AudioBlob aus IndexedDB oder URL laden
  useEffect(() => {
    let isMounted = true;
    async function initRawAudio() {
      try {
        let b: any = await getBlob(`campus_audio_${trackData.trackId}_raw`);
        if (!b && trackData.rawUrl) {
          const resp = await fetch(trackData.rawUrl);
          b = await resp.blob();
        }
        if (isMounted && b && b instanceof Blob) {
          rawBlobRef.current = b;
        }
      } catch (err) {
        console.warn('[TrackEditModal] Raw audio init warning:', err);
      }
    }
    initRawAudio();

    return () => {
      isMounted = false;
      if (remasterDebounceRef.current) {
        clearTimeout(remasterDebounceRef.current);
      }
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current.src = '';
        audioInstanceRef.current = null;
      }
      createdUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    };
  }, [trackData.trackId, trackData.rawUrl]);

  // 2. 🎛️ Live-DSP Re-Mastering Engine mit 120ms Debounce
  const triggerRemaster = useCallback((newRoom: ReverbRoomType, newWet: number) => {
    if (remasterDebounceRef.current) {
      clearTimeout(remasterDebounceRef.current);
    }

    setIsRemastering(true);

    remasterDebounceRef.current = setTimeout(async () => {
      try {
        let sourceBlob = rawBlobRef.current;
        if (!sourceBlob && trackData.rawUrl) {
          try {
            const resp = await fetch(trackData.rawUrl);
            sourceBlob = await resp.blob();
            rawBlobRef.current = sourceBlob;
          } catch (fetchErr) {
            console.warn('[TrackEditModal] Fallback fetch failed:', fetchErr);
          }
        }

        if (!sourceBlob) {
          setIsRemastering(false);
          return;
        }

        // Echtes Studio-Mastering im Hintergrund via Web Audio Engine
        const res = await processStudioMastering(sourceBlob, 30, {
          reverbRoom: newRoom,
          reverbWetMix: newWet
        });

        const newUrl = URL.createObjectURL(res.masteredBlob);
        createdUrlsRef.current.push(newUrl);
        currentMasterUrlRef.current = newUrl;
        remasteredBlobRef.current = res.masteredBlob;

        // Wenn Master gerade abgespielt wird: Nahtloser Swap an der aktuellen Position!
        if (audioInstanceRef.current && activePlayingVersion === 'master') {
          const curTime = audioInstanceRef.current.currentTime;
          audioInstanceRef.current.src = newUrl;
          audioInstanceRef.current.currentTime = curTime;
          audioInstanceRef.current.play().catch(console.warn);
        }
      } catch (err) {
        console.warn('[TrackEditModal] Live remaster failed:', err);
      } finally {
        setIsRemastering(false);
      }
    }, 120);
  }, [activePlayingVersion, trackData.rawUrl]);

  // 3. Play/Pause & A/B Umschalter
  const handleTogglePreview = (version: 'master' | 'raw') => {
    if (activePlayingVersion === version) {
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
      }
      setActivePlayingVersion(null);
      return;
    }

    const targetUrl = version === 'master'
      ? (currentMasterUrlRef.current || trackData.masteredUrl)
      : (currentRawUrlRef.current || trackData.rawUrl);

    if (!targetUrl) return;

    const prevTime = audioInstanceRef.current ? audioInstanceRef.current.currentTime : 0;
    if (!audioInstanceRef.current) {
      audioInstanceRef.current = new Audio(targetUrl);
      audioInstanceRef.current.loop = true;
      audioInstanceRef.current.onended = () => setActivePlayingVersion(null);
    } else {
      audioInstanceRef.current.src = targetUrl;
    }

    audioInstanceRef.current.currentTime = prevTime;
    audioInstanceRef.current.play().catch(console.warn);
    setActivePlayingVersion(version);
  };

  const handleClose = () => {
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
    }
    onClose();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
      }
      await onSave({
        ...data,
        remasteredBlob: remasteredBlobRef.current || undefined
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Song bearbeiten & Raumklang"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.82)',
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
        padding: '24px',
        maxWidth: '520px',
        width: '100%',
        color: colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}>
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.10rem', fontWeight: 900 }}>
                Song bearbeiten & Raumklang
              </h3>
              <span style={{ fontSize: '0.74rem', color: colors.textSecondary, fontWeight: 600 }}>
                Standard-Version & Raumakustik anpassen
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

        {/* 🏛️ 0,1% Goldstandard: Quadratische unifarbene Cover (1:1 Aspect-Ratio) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 800, color: colors.textPrimary }}>
            Standard-Wiedergabeversion:
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* 🟢 Studio Master Cover (Smaragdgrün, 1:1 Quadratisch) */}
            <AudioVersionSquareCover
              version="master"
              isSelected={data.preferredVersion === 'master'}
              onSelect={() => setData(prev => ({ ...prev, preferredVersion: 'master' }))}
              isPlaying={activePlayingVersion === 'master'}
              isProcessing={isRemastering}
              onTogglePlay={() => handleTogglePreview('master')}
              isLight={isLight}
            />

            {/* 🔵 Originalaufnahme Cover (Kobaltblau, 1:1 Quadratisch) */}
            <AudioVersionSquareCover
              version="raw"
              isSelected={data.preferredVersion === 'raw'}
              onSelect={() => setData(prev => ({ ...prev, preferredVersion: 'raw' }))}
              isPlaying={activePlayingVersion === 'raw'}
              onTogglePlay={() => handleTogglePreview('raw')}
              isLight={isLight}
            />
          </div>
        </div>

        {/* 🎛️ Raumgröße & Hall Faltungshall-Sektion mit Live-Remastering */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.80rem', fontWeight: 900, color: colors.textPrimary }}>Raumgröße & Hall:</span>
              {isRemastering && (
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  padding: '2px 6px',
                  borderRadius: '100px',
                  background: 'rgba(16, 185, 129, 0.18)',
                  color: '#10b981',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <Sparkles size={10} />
                  <span>Live-DSP</span>
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 800 }}>{data.reverbWetMix}% Wet</span>
          </div>

          {/* Raum Presets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { id: 'small', name: 'Intim', sub: 'Wohnzimmer', roomKey: 'warm_livingroom' as ReverbRoomType, Icon: Home },
              { id: 'medium', name: 'Mittel', sub: 'Konzertsaal', roomKey: 'concert_hall' as ReverbRoomType, Icon: Landmark },
              { id: 'large', name: 'Groß', sub: 'Kathedrale', roomKey: 'cathedral' as ReverbRoomType, Icon: Maximize2 }
            ].map(room => {
              const isActive = (data.reverbRoomType as string).includes(room.id) || data.reverbRoomType === room.roomKey;
              const RoomIcon = room.Icon;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => {
                    setData(prev => ({ ...prev, reverbRoomType: room.roomKey }));
                    triggerRemaster(room.roomKey, data.reverbWetMix);
                  }}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '14px',
                    border: isActive ? '2px solid #10b981' : `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
                    background: isActive ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.22)') : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: isActive ? '0 0 12px rgba(16, 185, 129, 0.25)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <RoomIcon size={18} color={isActive ? '#10b981' : colors.textSecondary} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, color: colors.textPrimary }}>{room.name}</span>
                  <span style={{ fontSize: '0.62rem', color: colors.textSecondary }}>{room.sub}</span>
                </button>
              );
            })}
          </div>

          {/* Hall-Anteil Schieberegler */}
          <input
            type="range"
            min="0"
            max="35"
            step="0.5"
            value={data.reverbWetMix}
            onChange={(e) => {
              const newWet = Number(e.target.value);
              setData(prev => ({ ...prev, reverbWetMix: newWet }));
              triggerRemaster(data.reverbRoomType, newWet);
            }}
            style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
            aria-label="Hall-Anteil Wet-Mix Regler"
          />
        </div>

        {/* Text-Inputs (Titel & Interpret) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '4px' }}>Songtitel:</label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => setData(prev => ({ ...prev, title: e.target.value }))}
              style={{
                width: '100%',
                padding: '9px 11px',
                borderRadius: '12px',
                border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)'}`,
                background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.35)',
                color: colors.textPrimary,
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '4px' }}>Interpret:</label>
            <input
              type="text"
              value={data.artist || ''}
              onChange={(e) => setData(prev => ({ ...prev, artist: e.target.value }))}
              style={{
                width: '100%',
                padding: '9px 11px',
                borderRadius: '12px',
                border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)'}`,
                background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.35)',
                color: colors.textPrimary,
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={handleClose}
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '100px',
              border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)'}`,
              background: 'transparent',
              color: colors.textPrimary,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              flex: 1.3,
              padding: '11px',
              borderRadius: '100px',
              border: 'none',
              background: '#10b981',
              color: 'white',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            className="hover-scale"
          >
            <Check size={16} />
            <span>{isSaving ? 'Wird gespeichert...' : 'Änderungen speichern'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
