import React from 'react';
import { Volume2, VolumeX, X, Sliders, Check } from 'lucide-react';
import { AudioMixerState, playAlongAudioEngine } from '../../utils/songPlayAlongAudioEngine';

export interface SongAudioMixerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mixerState: AudioMixerState;
  onUpdateMixer: (newState: Partial<AudioMixerState>) => void;
}

export const SongAudioMixerModal: React.FC<SongAudioMixerModalProps> = ({
  isOpen,
  onClose,
  mixerState,
  onUpdateMixer
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tracks: Array<{
    id: keyof AudioMixerState;
    muteKey: keyof AudioMixerState;
    label: string;
    icon: string;
    description: string;
  }> = [
    { id: 'metronomeVolume', muteKey: 'metronomeMuted', label: 'Metronom / Klick', icon: '⏱️', description: 'Holzblock / Rimshot mit Downbeat-Akzent' },
    { id: 'drumsVolume', muteKey: 'drumsMuted', label: 'Schlagzeug (Drums)', icon: '🥁', description: 'Kick, Snare & Hi-Hat Rhythmus' },
    { id: 'bassVolume', muteKey: 'bassMuted', label: 'E-Bass (Sub-Bass)', icon: '🎸', description: 'Grundton-Begleitung der Taktakkorde' },
    { id: 'chordsVolume', muteKey: 'chordsMuted', label: 'Harmonie (Pad/Keys)', icon: '🎹', description: 'Polyphoner warmer Akkordsound' }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Play-Along Backing-Track Mixer"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '460px',
          padding: '24px',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)',
          border: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}>
              <Sliders size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Play-Along Audio-Mixer
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                Synthesizer-Spuren für dein optimales Üben
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Master Volume Row */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onUpdateMixer({ isMuted: !mixerState.isMuted })}
              style={{
                border: 'none',
                background: mixerState.isMuted ? '#fee2e2' : '#dcfce7',
                color: mixerState.isMuted ? '#dc2626' : '#16a34a',
                padding: '6px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title={mixerState.isMuted ? 'Stummschaltung aufheben' : 'Alles stummschalten'}
            >
              {mixerState.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a' }}>
              Gesamtlautstärke
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={mixerState.masterVolume}
            onChange={(e) => onUpdateMixer({ masterVolume: parseFloat(e.target.value) })}
            style={{ width: '130px', accentColor: '#2563eb', cursor: 'pointer' }}
          />
        </div>

        {/* Individual Tracks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tracks.map((t) => {
            const vol = mixerState[t.id] as number;
            const isMuted = mixerState[t.muteKey] as boolean;

            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '8px 4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '160px' }}>
                  <button
                    type="button"
                    onClick={() => onUpdateMixer({ [t.muteKey]: !isMuted })}
                    style={{
                      border: '1px solid #cbd5e1',
                      background: isMuted ? '#f1f5f9' : '#ffffff',
                      color: isMuted ? '#94a3b8' : '#0f172a',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      fontWeight: 850
                    }}
                  >
                    {isMuted ? 'Muted' : 'Mute'}
                  </button>

                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 850, color: isMuted ? '#94a3b8' : '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </div>
                    <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 650 }}>
                      {t.description}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    disabled={isMuted}
                    value={vol}
                    onChange={(e) => onUpdateMixer({ [t.id]: parseFloat(e.target.value) })}
                    style={{
                      width: '100px',
                      accentColor: '#16a34a',
                      cursor: isMuted ? 'not-allowed' : 'pointer',
                      opacity: isMuted ? 0.4 : 1
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', minWidth: '32px', textAlign: 'right' }}>
                    {Math.round(vol * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '14px',
            fontWeight: 850,
            fontSize: '0.86rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Check size={16} />
          <span>Fertig</span>
        </button>
      </div>
    </div>
  );
};
