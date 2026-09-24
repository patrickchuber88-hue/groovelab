import React from 'react';
import { Mic } from 'lucide-react';
import { useVoiceToText } from '../../hooks/useVoiceToText';

export const SpeechDictationButton: React.FC<{
  onTranscript: (text: string) => void;
  title?: string;
  size?: 'sm' | 'md';
}> = ({ onTranscript, title = "Diktieren", size = 'sm' }) => {
  const { isListening, toggleListening, error } = useVoiceToText({
    onResult: (text) => {
      if (text && text.trim()) {
        onTranscript(text.trim());
      }
    }
  });

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
