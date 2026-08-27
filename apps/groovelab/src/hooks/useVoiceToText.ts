import { useState, useEffect, useRef, useCallback } from 'react';

interface UseVoiceToTextOptions {
  lang?: string;
  onResult?: (text: string) => void;
  onError?: (error: string) => void;
}

/**
 * Intelligent German Dictation & Punctuation Formatter
 * Converts spoken keywords ("punkt", "komma", "neue zeile", "bindestrich") into clean punctuation
 * and handles capitalization rules.
 */
export const formatGermanDictation = (text: string): string => {
  if (!text) return '';

  let res = text;

  // Replace spoken punctuation keywords (case-insensitive)
  res = res.replace(/\s*\b(punkt|full stop)\b\s*/gi, '. ');
  res = res.replace(/\s*\b(komma|comma)\b\s*/gi, ', ');
  res = res.replace(/\s*\b(ausrufezeichen|ausrufungszeichen|exclamation mark)\b\s*/gi, '! ');
  res = res.replace(/\s*\b(fragezeichen|question mark)\b\s*/gi, '? ');
  res = res.replace(/\s*\b(doppelpunkt|colon)\b\s*/gi, ': ');
  res = res.replace(/\s*\b(semikolon|semicolon)\b\s*/gi, '; ');
  res = res.replace(/\s*\b(neue zeile|absatz|new line)\b\s*/gi, '\n');
  res = res.replace(/\s*\b(bindestrich|spiegelstrich|gedankenstrich|hyphen)\b\s*/gi, ' - ');

  // Clean up duplicate spaces
  res = res.replace(/[ \t]+/g, ' ');
  res = res.replace(/\s+([.,!?:;])/g, '$1');

  // Auto-capitalize first character of string and after [.!?\n]
  res = res.replace(/(^|[.!?\n]\s+)([a-zäöü])/g, (_, prefix, char) => prefix + char.toUpperCase());

  // Capitalize first letter overall if not capitalized
  if (res.length > 0 && /^[a-zäöü]/.test(res)) {
    res = res.charAt(0).toUpperCase() + res.slice(1);
  }

  return res;
};

export const useVoiceToText = (options: UseVoiceToTextOptions = {}) => {
  const { lang = 'de-DE', onResult, onError } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
      }
    }

    return () => {
      // Strict hardware safety cleanup on unmount
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Spracherkennung wird von diesem Browser leider nicht unterstützt.');
      if (onError) onError('Speech recognition not supported');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      finalTranscriptRef.current = '';
      setTranscript('');

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let newlyFinalized = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            newlyFinalized += (newlyFinalized ? ' ' : '') + chunk;
          } else {
            interim += (interim ? ' ' : '') + chunk;
          }
        }

        if (newlyFinalized) {
          finalTranscriptRef.current = (finalTranscriptRef.current ? `${finalTranscriptRef.current} ${newlyFinalized}` : newlyFinalized).trim();
        }

        const rawCombined = (finalTranscriptRef.current + (interim ? ' ' + interim : '')).trim();
        const formatted = formatGermanDictation(rawCombined);
        
        setTranscript(formatted);
        if (onResult) onResult(formatted);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setError(`Spracherkennungs-Hinweis: ${event.error}`);
          if (onError) onError(event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setError('Mikrofon konnte nicht gestartet werden.');
      setIsListening(false);
    }
  }, [lang, onResult, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript
  };
};
