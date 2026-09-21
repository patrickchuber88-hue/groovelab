import React, { useState } from 'react';
import {
  SlidersHorizontal, CheckCircle2, Play, Pause, Landmark,
  Home, Maximize2, Check
} from 'lucide-react';
import { ReverbRoomType, ROOM_ACOUSTIC_PROFILES } from '../../../../utils/audioMasteringEngine';

export interface EditingTrackData {
  trackId: string;
  title: string;
  artist?: string;
  preferredVersion: 'master' | 'raw';
  reverbRoomType: ReverbRoomType;
  reverbWetMix: number;
  rawUrl?: string;
  masteredUrl?: string;
}

interface TrackEditModalProps {
  trackData: EditingTrackData;
  onClose: () => void;
  onSave: (data: EditingTrackData) => Promise<void>;
  isLight: boolean;
  onPreviewToggle: (version: 'master' | 'raw') => void;
  previewPlaying: 'master' | 'raw' | null;
}

export const TrackEditModal: React.FC<TrackEditModalProps> = ({
  trackData,
  onClose,
  onSave,
  isLight,
  onPreviewToggle,
  previewPlaying
}) => {
  const [data, setData] = useState<EditingTrackData>(trackData);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const colors = {
    textPrimary: isLight ? '#0f172a' : '#f8fafc',
    textSecondary: isLight ? '#475569' : '#cbd5e1'
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(data);
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
        padding: '26px',
        maxWidth: '520px',
        width: '100%',
        color: colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}>
              <SlidersHorizontal size={18} />
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
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '1.2rem', cursor: 'pointer' }}
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        {/* Version Selection Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.76rem', fontWeight: 800, color: colors.textPrimary }}>
            Standard-Wiedergabeversion:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Master */}
            <div
              onClick={() => setData(prev => ({ ...prev, preferredVersion: 'master' }))}
              style={{
                border: `2px solid ${data.preferredVersion === 'master' ? '#10b981' : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)')}`,
                borderRadius: '16px',
                padding: '12px',
                background: data.preferredVersion === 'master' ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.12)') : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.64rem', fontWeight: 900, padding: '2px 7px', borderRadius: '100px', background: '#10b981', color: 'white' }}>
                  ✨ STUDIO MASTER
                </span>
                {data.preferredVersion === 'master' && <CheckCircle2 size={15} color="#10b981" />}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 900, color: colors.textPrimary }}>Studio-Klang</div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewToggle('master');
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '100px',
                  border: 'none',
                  background: previewPlaying === 'master' ? '#ef4444' : '#10b981',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                {previewPlaying === 'master' ? <Pause size={12} /> : <Play size={12} />}
                <span>{previewPlaying === 'master' ? 'Loop stoppen' : 'Studio vorhören'}</span>
              </button>
            </div>

            {/* RAW */}
            <div
              onClick={() => setData(prev => ({ ...prev, preferredVersion: 'raw' }))}
              style={{
                border: `2px solid ${data.preferredVersion === 'raw' ? '#3b82f6' : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)')}`,
                borderRadius: '16px',
                padding: '12px',
                background: data.preferredVersion === 'raw' ? (isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.12)') : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.64rem', fontWeight: 900, padding: '2px 7px', borderRadius: '100px', background: '#3b82f6', color: 'white' }}>
                  🎙️ PURE RAW
                </span>
                {data.preferredVersion === 'raw' && <CheckCircle2 size={15} color="#3b82f6" />}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 900, color: colors.textPrimary }}>Originalaufnahme</div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewToggle('raw');
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '100px',
                  border: 'none',
                  background: previewPlaying === 'raw' ? '#ef4444' : '#3b82f6',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                {previewPlaying === 'raw' ? <Pause size={12} /> : <Play size={12} />}
                <span>{previewPlaying === 'raw' ? 'Loop stoppen' : 'RAW vorhören'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Reverb Presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.80rem', fontWeight: 900, color: colors.textPrimary }}>Raumgröße & Hall:</span>
            <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 800 }}>{data.reverbWetMix}% Wet</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { id: 'small', name: 'Intim', sub: 'Wohnzimmer', Icon: Home },
              { id: 'medium', name: 'Mittel', sub: 'Konzertsaal', Icon: Landmark },
              { id: 'large', name: 'Groß', sub: 'Kathedrale', Icon: Maximize2 }
            ].map(room => {
              const isActive = (data.reverbRoomType as string).includes(room.id);
              const RoomIcon = room.Icon;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setData(prev => ({ ...prev, reverbRoomType: (room.id === 'small' ? 'warm_livingroom' : room.id === 'medium' ? 'concert_hall' : 'cathedral') as ReverbRoomType }))}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '14px',
                    border: isActive ? '2px solid #10b981' : `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
                    background: isActive ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.22)') : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RoomIcon size={18} color={isActive ? '#10b981' : colors.textSecondary} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, color: colors.textPrimary }}>{room.name}</span>
                </button>
              );
            })}
          </div>

          <input
            type="range"
            min="0"
            max="35"
            step="0.5"
            value={data.reverbWetMix}
            onChange={(e) => setData(prev => ({ ...prev, reverbWetMix: Number(e.target.value) }))}
            style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
          />
        </div>

        {/* Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '4px' }}>Songtitel:</label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => setData(prev => ({ ...prev, title: e.target.value }))}
              style={{ width: '100%', padding: '9px 11px', borderRadius: '12px', border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)'}`, background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.35)', color: colors.textPrimary, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '4px' }}>Interpret:</label>
            <input
              type="text"
              value={data.artist || ''}
              onChange={(e) => setData(prev => ({ ...prev, artist: e.target.value }))}
              style={{ width: '100%', padding: '9px 11px', borderRadius: '12px', border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)'}`, background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.35)', color: colors.textPrimary, boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: '100px', border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)'}`, background: 'transparent', color: colors.textPrimary, fontWeight: 800, cursor: 'pointer' }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{ flex: 1.3, padding: '11px', borderRadius: '100px', border: 'none', background: '#10b981', color: 'white', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
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
