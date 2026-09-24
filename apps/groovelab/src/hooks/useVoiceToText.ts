import { useState, useEffect, useRef, useCallback } from 'react';
import { requestMicrophonePermissionOnce } from '../services/audioPermissionService';

export interface UseVoiceToTextOptions {
  lang?: string;
  onResult?: (text: string) => void;
  onError?: (error: string) => void;
}

/**
 * 🎙️ Intelligent German Dictation & Punctuation Formatter (0.1% Goldstandard)
 * Converts spoken keywords ("punkt", "komma", "neue zeile", "fragezeichen") into clean punctuation
 * and handles capitalization rules according to German orthography.
 */
export const formatGermanDictation = (text: string): string => {
  if (!text) return '';

  let res = text;

  // 1. Spoken punctuation keywords (case-insensitive)
  res = res.replace(/\s*\b(punkt|full stop)\b\s*/gi, '. ');
  res = res.replace(/\s*\b(komma|comma)\b\s*/gi, ', ');
  res = res.replace(/\s*\b(ausrufezeichen|ausrufungszeichen|exclamation mark)\b\s*/gi, '! ');
  res = res.replace(/\s*\b(fragezeichen|question mark)\b\s*/gi, '? ');
  res = res.replace(/\s*\b(doppelpunkt|colon)\b\s*/gi, ': ');
  res = res.replace(/\s*\b(semikolon|strichpunkt|semicolon)\b\s*/gi, '; ');
  res = res.replace(/\s*\b(neue zeile|neuer absatz|absatz|new line)\b\s*/gi, '\n');
  res = res.replace(/\s*\b(bindestrich|spiegelstrich|gedankenstrich|hyphen)\b\s*/gi, ' - ');
  res = res.replace(/\s*\b(anführungszeichen|anführungsstriche)\b\s*/gi, '"');
  res = res.replace(/\s*\b(klammer auf)\b\s*/gi, ' (');
  res = res.replace(/\s*\b(klammer zu)\b\s*/gi, ') ');

  // 2. Clean up multiple spaces and spaces before punctuation
  res = res.replace(/[ \t]+/g, ' ');
  res = res.replace(/\s+([.,!?:;)])/g, '$1');
  res = res.replace(/([(])\s+/g, '$1');

  // 3. Auto-capitalize character at start and after sentence terminators [.!?\n]
  res = res.replace(/(^|[.!?\n]\s+)([a-zäöü])/g, (_, prefix, char) => prefix + char.toUpperCase());

  // 4. Capitalize very first character of the string if it's a letter
  if (res.length > 0 && /^[a-zäöü]/.test(res)) {
    res = res.charAt(0).toUpperCase() + res.slice(1);
  }

  return res;
};

/**
 * 🎙️ Universal Web Speech Recognition Hook (0.1% Goldstandard)
 * - Deterministic event.results scanning (prevents compounding interim duplications)
 * - Screen WakeLock integration
 * - Automatic visibility & unmount teardown
 * - One-time microphone permission gatekeeper
 */
export const useVoiceToText = (options: UseVoiceToTextOptions = {}) => {
  const { lang = 'de-DE', onResult, onError } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
      if (wakeLockRef.current) {
        try { wakeLockRef.current.release(); } catch (e) {}
        wakeLockRef.current = null;
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (wakeLockRef.current) {
      try { wakeLockRef.current.release(); } catch (e) {}
      wakeLockRef.current = null;
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
  }, []);

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Spracherkennung wird von diesem Browser leider nicht unterstützt.');
      if (onError) onError('Speech recognition not supported');
      return;
    }

    // 🛡️ Centralized One-Time Permission Gatekeeper (Unified Session Authorization)
    const hasPermission = await requestMicrophonePermissionOnce();
    if (!hasPermission) {
      setError('Mikrofon-Freigabe wurde nicht erteilt.');
      if (onError) onError('Microphone permission denied');
      return;
    }

    // 📱 Screen WakeLock (Prevent tablet sleep during dictation)
    if ('wakeLock' in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (e) {}
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
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setError(null);
      };

      // 🛡️ ZERO-DUPLICATION RESULT PARSER (0.1% Goldstandard)
      // Iterates through full event.results list to reconstruct exact state
      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = 0; i < event.results.length; i++) {
          const resItem = event.results[i];
          const text = resItem?.[0]?.transcript || '';
          if (resItem.isFinal) {
            finalStr += (finalStr ? ' ' : '') + text;
          } else {
            interimStr += (interimStr ? ' ' : '') + text;
          }
        }

        finalTranscriptRef.current = finalStr.trim();
        const rawCombined = (finalStr + (interimStr ? ' ' + interimStr : '')).trim();
        const formatted = formatGermanDictation(rawCombined);

        setTranscript(formatted);
        if (onResult) onResult(formatted);
      };

      recognition.onerror = (event: any) => {
        console.warn('[useVoiceToText] Recognition error:', event.error);
        if (event.error === 'not-allowed') {
          localStorage.removeItem('campus_microphone_permission_granted');
          setError('Mikrofon-Zugriff wurde verweigert. Bitte in den Browser-Einstellungen erlauben.');
        } else if (event.error !== 'no-speech') {
          setError(`Spracherkennungs-Hinweis: ${event.error}`);
          if (onError) onError(event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        isListeningRef.current = false;
        if (wakeLockRef.current) {
          try { wakeLockRef.current.release(); } catch (e) {}
          wakeLockRef.current = null;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('[useVoiceToText] Failed to start:', err);
      setError('Mikrofon konnte nicht gestartet werden.');
      setIsListening(false);
      isListeningRef.current = false;
      if (wakeLockRef.current) {
        try { wakeLockRef.current.release(); } catch (e) {}
        wakeLockRef.current = null;
      }
    }
  }, [lang, onResult, onError]);

  const toggleListening = useCallback(async () => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      await startListening();
    }
  }, [startListening, stopListening]);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    setTranscript
  };
};

export interface UseDictationInputOptions {
  value: string;
  onChange: (newValue: string) => void;
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

/**
 * 🎯 0.1% Goldstandard Input-Binding Dictation Hook
 * Connects any input or textarea state directly to the dictation engine.
 * Guarantees zero text duplication, preserves prior typed content, and formats German punctuation.
 */
export const useDictationInput = ({
  value,
  onChange,
  lang = 'de-DE',
  onStart,
  onEnd,
  onError
}: UseDictationInputOptions) => {
  const baseTextRef = useRef<string>('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript
  } = useVoiceToText({
    lang,
    onResult: (liveFormattedSpoken) => {
      const base = baseTextRef.current;
      const cleanSpoken = liveFormattedSpoken.trim();
      const combined = base ? `${base} ${cleanSpoken}` : cleanSpoken;
      onChangeRef.current(combined);
    },
    onError: (err) => {
      if (onError) onError(err);
    }
  });

  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
      baseTextRef.current = '';
      if (onEnd) onEnd();
    } else {
      baseTextRef.current = (value || '').trim();
      resetTranscript();
      if (onStart) onStart();
      await startListening();
    }
  }, [isListening, value, startListening, stopListening, resetTranscript, onStart, onEnd]);

  return {
    isListening,
    isSupported,
    error,
    toggleListening,
    stopListening,
    startListening: useCallback(async () => {
      baseTextRef.current = (value || '').trim();
      resetTranscript();
      if (onStart) onStart();
      await startListening();
    }, [value, resetTranscript, onStart, startListening])
  };
};
