import React, { useRef } from 'react';
import { Mic } from 'lucide-react';
import { useDictationInput, useVoiceToText } from '../../hooks/useVoiceToText';

export interface SpeechDictationButtonProps {
  value?: string;
  onChange?: (val: string) => void;
  onTranscript?: (text: string) => void;
  title?: string;
  size?: 'sm' | 'md';
  joinWithNewline?: boolean;
}

export const SpeechDictationButton: React.FC<SpeechDictationButtonProps> = ({
  value,
  onChange,
  onTranscript,
  title = "Diktieren",
  size = 'sm',
  joinWithNewline = false
}) => {
  const isBoundToInput = value !== undefined && typeof onChange === 'function';

  // 1. Kanonische Anbindung via useDictationInput (Zero Duplication & Silence Auto-Stop)
  const dictationInput = useDictationInput({
    value: value || '',
    onChange: onChange || (() => {}),
    joinWithNewline,
    autoStopOnSilence: true,
    silenceTimeoutMs: 2000
  });

  // 2. Fallback falls nur onTranscript übergeben wird
  const legacyBaseRef = useRef<string>('');
  const legacyVoice = useVoiceToText({
    autoStopOnSilence: true,
    silenceTimeoutMs: 2000,
    onAutoStop: () => {
      legacyBaseRef.current = '';
    },
    onResult: (text) => {
      if (text && text.trim() && onTranscript) {
        onTranscript(text.trim());
      }
    }
  });

  const isListening = isBoundToInput ? dictationInput.isListening : legacyVoice.isListening;
  const toggleListening = isBoundToInput ? dictationInput.toggleListening : legacyVoice.toggleListening;

  return (
    <button
      type="button"
      onClick={toggleListening}
      className="tactile-btn"
      title={isListening ? "Aufnahme stoppen..." : "Sprache zu Text diktieren"}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: size === 'sm' ? '4px 10px' : '6px 12px',
        borderRadius: '999px',
        fontSize: size === 'sm' ? '0.70rem' : '0.76rem',
        fontWeight: 800,
        cursor: 'pointer',
        border: isListening ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
        background: isListening ? '#fef2f2' : '#ffffff',
        color: isListening ? '#dc2626' : '#475569',
        boxShadow: isListening ? '0 0 12px rgba(239, 68, 68, 0.4)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.2s ease',
        animation: isListening ? 'collectorGlow 1.2s infinite alternate' : 'none'
      }}
    >
      {isListening ? (
        <>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
          <span>Hört zu... (Stopp)</span>
        </>
      ) : (
        <>
          <Mic size={size === 'sm' ? 12 : 14} style={{ color: 'currentColor' }} />
          <span>{title}</span>
        </>
      )}
    </button>
  );
};
