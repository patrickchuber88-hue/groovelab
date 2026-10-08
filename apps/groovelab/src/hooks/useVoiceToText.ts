import { useState, useEffect, useRef, useCallback } from 'react';
import { requestMicrophonePermissionOnce, isMicrophonePermissionCached } from '../services/audioPermissionService';

export interface UseVoiceToTextOptions {
  lang?: string;
  onResult?: (text: string) => void;
  onError?: (error: string) => void;
  autoStopOnSilence?: boolean;
  silenceTimeoutMs?: number;
  initialTimeoutMs?: number;
  maxDurationMs?: number;
  onAutoStop?: (reason: 'silence' | 'initial_timeout' | 'max_duration') => void;
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
 * - Dual-threshold Silence Detection (automatic stop when speaking ceases)
 * - Screen WakeLock integration
 * - Automatic visibility & unmount teardown
 * - One-time microphone permission gatekeeper
 */
export const useVoiceToText = (options: UseVoiceToTextOptions = {}) => {
  const {
    lang = 'de-DE',
    onResult,
    onError,
    autoStopOnSilence = true,
    silenceTimeoutMs = 2000,
    initialTimeoutMs = 6000,
    maxDurationMs = 60000,
    onAutoStop
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);
  const wakeLockRef = useRef<any>(null);

  // Watchdog Timers for 0.1% Silence Auto-Stop
  const silenceTimerRef = useRef<any>(null);
  const initialTimerRef = useRef<any>(null);
  const maxDurationTimerRef = useRef<any>(null);
  const hasSpokenRef = useRef<boolean>(false);

  const clearAllTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (initialTimerRef.current) {
      clearTimeout(initialTimerRef.current);
      initialTimerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearAllTimers();
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
  }, [clearAllTimers]);

  const triggerAutoStop = useCallback((reason: 'silence' | 'initial_timeout' | 'max_duration') => {
    // 📳 Taktiles Haptic Feedback (20ms) für mobile Geräte & Tablets (iOS PWA / Android)
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(20); } catch (_) {}
    }
    stopListening();
    if (onAutoStop) {
      onAutoStop(reason);
    }
  }, [stopListening, onAutoStop]);

  const resetSilenceTimer = useCallback(() => {
    if (!autoStopOnSilence) return;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      triggerAutoStop('silence');
    }, silenceTimeoutMs);
  }, [autoStopOnSilence, silenceTimeoutMs, triggerAutoStop]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && recognitionRef.current) {
        clearAllTimers();
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
      clearAllTimers();
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
  }, [clearAllTimers]);

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
    // Fast-path: If permission is already cached, bypass async permission pre-flight to preserve
    // the synchronous transient user activation token required by WebKit/Blink for recognition.start()!
    if (!isMicrophonePermissionCached()) {
      const hasPermission = await requestMicrophonePermissionOnce();
      if (!hasPermission) {
        setError('Mikrofon-Freigabe wurde nicht erteilt.');
        if (onError) onError('Microphone permission denied');
        return;
      }
    }

    // 📱 Screen WakeLock (Triggered non-blocking in background so it never consumes the transient gesture token)
    if ('wakeLock' in navigator && !wakeLockRef.current) {
      (navigator as any).wakeLock.request('screen').then((lock: any) => {
        wakeLockRef.current = lock;
      }).catch(() => {});
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      finalTranscriptRef.current = '';
      setTranscript('');
      hasSpokenRef.current = false;
      clearAllTimers();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setError(null);

        // ⏱️ Max Session Ceiling Timer
        if (maxDurationMs > 0) {
          maxDurationTimerRef.current = setTimeout(() => {
            triggerAutoStop('max_duration');
          }, maxDurationMs);
        }

        // ⏱️ Initial Inactivity Watchdog
        if (autoStopOnSilence && initialTimeoutMs > 0) {
          initialTimerRef.current = setTimeout(() => {
            if (!hasSpokenRef.current) {
              triggerAutoStop('initial_timeout');
            }
          }, initialTimeoutMs);
        }
      };

      recognition.onspeechstart = () => {
        hasSpokenRef.current = true;
        if (initialTimerRef.current) {
          clearTimeout(initialTimerRef.current);
          initialTimerRef.current = null;
        }
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };

      recognition.onspeechend = () => {
        if (hasSpokenRef.current) {
          resetSilenceTimer();
        }
      };

      // 🛡️ ZERO-DUPLICATION RESULT PARSER (0.1% Goldstandard)
      // Iterates through full event.results list to reconstruct exact state
      recognition.onresult = (event: any) => {
        hasSpokenRef.current = true;
        if (initialTimerRef.current) {
          clearTimeout(initialTimerRef.current);
          initialTimerRef.current = null;
        }

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

        // 🛑 Silence Watchdog: Debounce reset on every speech token
        resetSilenceTimer();
      };

      recognition.onerror = (event: any) => {
        console.warn('[useVoiceToText] Recognition error:', event.error);
        if (event.error === 'not-allowed') {
          const isIosStandalone = typeof window !== 'undefined' && 
            ((navigator as any).standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)) &&
            /iPad|iPhone|iPod/.test(navigator.userAgent);

          if (isIosStandalone) {
            setError('Im iOS-Homescreen-Modus schränkt Apple die Spracherkennung ein. Bitte nutze die Tastatur oder öffne Campus im Safari-Browser.');
          } else {
            localStorage.removeItem('campus_microphone_permission_granted');
            setError('Mikrofon-Zugriff wurde verweigert. Bitte in den Browser-Einstellungen erlauben.');
          }
        } else if (event.error !== 'no-speech') {
          setError(`Spracherkennungs-Hinweis: ${event.error}`);
          if (onError) onError(event.error);
        }
      };

      recognition.onend = () => {
        clearAllTimers();
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
      clearAllTimers();
      setError('Mikrofon konnte nicht gestartet werden.');
      setIsListening(false);
      isListeningRef.current = false;
      if (wakeLockRef.current) {
        try { wakeLockRef.current.release(); } catch (e) {}
        wakeLockRef.current = null;
      }
    }
  }, [
    lang,
    onResult,
    onError,
    autoStopOnSilence,
    initialTimeoutMs,
    maxDurationMs,
    clearAllTimers,
    triggerAutoStop,
    resetSilenceTimer
  ]);

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
  autoStopOnSilence?: boolean;
  silenceTimeoutMs?: number;
  initialTimeoutMs?: number;
  maxDurationMs?: number;
  onAutoStop?: (reason: 'silence' | 'initial_timeout' | 'max_duration') => void;
}

/**
 * 🎯 0.1% Goldstandard Input-Binding Dictation Hook
 * Connects any input or textarea state directly to the dictation engine.
 * Guarantees zero text duplication, preserves prior typed content, and automatically stops on silence.
 */
export const useDictationInput = ({
  value,
  onChange,
  lang = 'de-DE',
  onStart,
  onEnd,
  onError,
  autoStopOnSilence = true,
  silenceTimeoutMs = 2000,
  initialTimeoutMs = 6000,
  maxDurationMs = 60000,
  onAutoStop
}: UseDictationInputOptions) => {
  const baseTextRef = useRef<string>('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const handleAutoStop = useCallback((reason: 'silence' | 'initial_timeout' | 'max_duration') => {
    baseTextRef.current = '';
    if (onAutoStop) onAutoStop(reason);
    if (onEndRef.current) onEndRef.current();
  }, [onAutoStop]);

  const {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript
  } = useVoiceToText({
    lang,
    autoStopOnSilence,
    silenceTimeoutMs,
    initialTimeoutMs,
    maxDurationMs,
    onAutoStop: handleAutoStop,
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

  const stopListeningWrapper = useCallback(() => {
    stopListening();
    baseTextRef.current = '';
    if (onEndRef.current) onEndRef.current();
  }, [stopListening]);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListeningWrapper();
    } else {
      baseTextRef.current = (value || '').trim();
      resetTranscript();
      if (onStart) onStart();
      await startListening();
    }
  }, [isListening, value, startListening, stopListeningWrapper, resetTranscript, onStart]);

  return {
    isListening,
    isSupported,
    error,
    toggleListening,
    stopListening: stopListeningWrapper,
    startListening: useCallback(async () => {
      baseTextRef.current = (value || '').trim();
      resetTranscript();
      if (onStart) onStart();
      await startListening();
    }, [value, resetTranscript, onStart, startListening])
  };
};
