import React from 'react';
import { Layers, Music, SlidersHorizontal, Mic, Keyboard, Drum, Hand, Zap, Sun } from 'lucide-react';
import { SoundKitType } from '../../../utils/StudioSoundEngine';

export interface GrooveSoundRackProps {
  soundKit: SoundKitType;
  onSoundKitChange: (kit: SoundKitType) => void;
  isBassEnabled: boolean;
  onToggleBass: () => void;
  inputMode: 'acoustic' | 'touch' | 'midi';
  onInputModeChange: (mode: 'acoustic' | 'touch' | 'midi') => void;
  onOpenAudioSettings: () => void;
  disabled?: boolean;
  isNotebook?: boolean;
}

const SOUND_KITS: { id: SoundKitType; label: string; icon: React.ReactNode }[] = [
  { id: 'acoustic', label: 'Studio Drums', icon: <Drum size={15} strokeWidth={2.2} /> },
  { id: 'body_percussion', label: 'Body Percussion', icon: <Hand size={15} strokeWidth={2.2} /> },
  { id: 'urban_808', label: 'Urban 808', icon: <Zap size={15} strokeWidth={2.2} /> },
  { id: 'latin', label: 'Latin Congas', icon: <Sun size={15} strokeWidth={2.2} /> }
];

export const GrooveSoundRack: React.FC<GrooveSoundRackProps> = ({
  soundKit,
  onSoundKitChange,
  isBassEnabled,
  onToggleBass,
  inputMode,
  onInputModeChange,
  onOpenAudioSettings,
  disabled = false,
  isNotebook = false
}) => {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: isNotebook ? '20px' : '16px',
        border: '1.5px solid #e2e8f0',
        padding: isNotebook ? '14px 16px' : '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        boxSizing: 'border-box'
      }}
      aria-label="Klang- und Instrumenten-Rack"
    >
      {/* 1. Header: Titel & Audio-Kalibrierung */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} color="#0284c7" />
          <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Sound & Instrumente
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenAudioSettings}
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '3px 8px',
            fontSize: '0.68rem',
            fontWeight: 850,
            color: '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Hardware-Erkennung, Mikrofon-Pegel & Latenz kalibrieren"
        >
          <SlidersHorizontal size={11} />
          <span>Audio-Latenz</span>
        </button>
      </div>

      {/* 2. Sound-Kit Schnellwahl (Pills) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
        {SOUND_KITS.map(kit => {
          const isSelected = soundKit === kit.id;
          return (
            <button
              key={kit.id}
              type="button"
              disabled={disabled}
              onClick={() => onSoundKitChange(kit.id)}
              style={{
                border: isSelected ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                background: isSelected ? '#f0f9ff' : '#f8fafc',
                color: isSelected ? '#0369a1' : '#334155',
                borderRadius: '10px',
                padding: '6px 8px',
                fontSize: '0.72rem',
                fontWeight: isSelected ? 950 : 750,
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.1s ease',
                boxShadow: isSelected ? '0 2px 6px rgba(2, 132, 199, 0.12)' : 'none'
              }}
            >
              <div style={{ color: isSelected ? '#0284c7' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {kit.icon}
              </div>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {kit.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Bassline-Playalong Switch & Eingabemodus */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
        {/* Bass Toggle */}
        <button
          type="button"
          onClick={onToggleBass}
          style={{
            background: isBassEnabled ? '#ecfdf5' : '#f8fafc',
            border: isBassEnabled ? '1.5px solid #10b981' : '1px solid #cbd5e1',
            color: isBassEnabled ? '#065f46' : '#64748b',
            borderRadius: '9px',
            padding: '4px 9px',
            fontSize: '0.70rem',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          title="Groovige Bassline zu- oder abschalten"
        >
          <Music size={12} color={isBassEnabled ? '#059669' : '#64748b'} />
          <span>Bassline {isBassEnabled ? 'AN' : 'AUS'}</span>
        </button>

        {/* Input Mode Switcher */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '9px', padding: '2px', gap: '2px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => onInputModeChange('acoustic')}
            disabled={disabled}
            style={{
              border: 'none',
              background: inputMode === 'acoustic' ? '#ffffff' : 'transparent',
              color: inputMode === 'acoustic' ? '#0f172a' : '#64748b',
              borderRadius: '7px',
              padding: '3px 7px',
              fontSize: '0.66rem',
              fontWeight: inputMode === 'acoustic' ? 950 : 750,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: inputMode === 'acoustic' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
            title="Klatschen / Instrument (Hands-Free!)"
          >
            <Mic size={11} />
            <span>Klatschen</span>
          </button>
          <button
            type="button"
            onClick={() => onInputModeChange('touch')}
            disabled={disabled}
            style={{
              border: 'none',
              background: inputMode === 'touch' ? '#ffffff' : 'transparent',
              color: inputMode === 'touch' ? '#0f172a' : '#64748b',
              borderRadius: '7px',
              padding: '3px 7px',
              fontSize: '0.66rem',
              fontWeight: inputMode === 'touch' ? 950 : 750,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: inputMode === 'touch' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
            title="Touch / Taste"
          >
            <Keyboard size={11} />
            <span>Taste</span>
          </button>
        </div>
      </div>
    </div>
  );
};
