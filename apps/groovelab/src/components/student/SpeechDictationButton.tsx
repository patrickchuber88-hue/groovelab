import React, { useState, useRef, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { requestMicrophonePermissionOnce } from '../../services/audioPermissionService';

export const SpeechDictationButton: React.FC<{
  onTranscript: (text: string) => void;
  title?: string;
  size?: 'sm' | 'md';
}> = ({ onTranscript, title = "Diktieren", size = 'sm' }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // 🛡️ Hardware-Sicherheit: Automatische Hard-Termination bei Tab-Wechsel oder Unmount
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch {}
        }
        setIsListening(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const toggleListening = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Spracherkennung wird von Ihrem Browser leider nicht unterstützt (empfohlen: Google Chrome, Safari oder Microsoft Edge).");
      return;
    }

    if (isListening) {
      setIsListening(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      return;
    }

    // 🛡️ Centralized One-Time Permission Gatekeeper (Unified Session Authorization)
    const hasPermission = await requestMicrophonePermissionOnce();
    if (!hasPermission) {
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'de-DE';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (!transcript && event.results?.[0]?.[0]?.transcript) {
          transcript = event.results[0][0].transcript;
        }
        if (transcript && transcript.trim()) {
          onTranscript(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[SpeechDictation] Error:", event.error);
        if (event.error === 'not-allowed') {
          localStorage.removeItem('campus_microphone_permission_granted');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("[SpeechDictation] Start failed:", e);
      setIsListening(false);
    }
  };

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
        animation: isListening ? 'paniniGlow 1.2s infinite alternate' : 'none'
      }}
    >
      {isListening ? (
        <>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
          <span>Hört zu... (Stopp)</span>
        </>
      ) : (
        <>
          <Mic size={size === 'sm' ? 12 : 14} style={{ color: '#0284c7' }} />
          <span>{title}</span>
        </>
      )}
    </button>
  );
};
