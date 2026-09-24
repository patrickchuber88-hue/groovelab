import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  synthesizeNeuralSpeech, 
  playAudioBlob, 
  stopNeuralSpeech, 
  buildContinuousHomeworkNarrative, 
  cleanTextForTts 
} from '../../../../services/neuralTtsService';

export function useMeisterwerkTts() {
  const [ttsMode, setTtsMode] = useState<'neural_thorsten' | 'neural_kerstin' | 'cheerful' | 'classic'>(() => {
    try {
      const saved = localStorage.getItem('campus_tts_mode');
      if (saved === 'neural_thorsten' || saved === 'neural_kerstin' || saved === 'cheerful' || saved === 'classic') {
        return saved;
      }
      return 'neural_thorsten';
    } catch {
      return 'neural_thorsten';
    }
  });

  const [ttsStatusText, setTtsStatusText] = useState<string | null>(null);
  const [isTtsSpeaking, setIsTtsSpeaking] = useState<boolean>(false);
  const [activeTtsKey, setActiveTtsKey] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const ttsSessionIdRef = useRef<number>(0);

  const handleSetTtsMode = useCallback((mode: 'neural_thorsten' | 'neural_kerstin' | 'cheerful' | 'classic') => {
    setTtsMode(mode);
    try {
      localStorage.setItem('campus_tts_mode', mode);
    } catch {}
  }, []);

  // Web Audio Motivational Intro Chime
  const playMotivationalTtsIntroChime = useCallback((mode: string) => {
    if (mode === 'classic') return;
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // C5, E5, G5, C6
      const notes = [
        { freq: 523.25, time: 0.00, dur: 0.10 },
        { freq: 659.25, time: 0.07, dur: 0.12 },
        { freq: 783.99, time: 0.14, dur: 0.14 },
        { freq: 1046.50, time: 0.21, dur: 0.24 }
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.15, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + dur + 0.04);
      });

      setTimeout(() => {
        try {
          ctx.close();
        } catch {}
      }, 700);
    } catch (e) {
      console.warn('[TTS] Audio chime failed gracefully:', e);
    }
  }, []);

  // Pre-load and listen to dynamic browser voice registry
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      try {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setAvailableVoices(v);
        }
      } catch (e) {
        console.warn('[TTS] Failed to load voices:', e);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const selectBestGermanVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const germanVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('de'));
    if (germanVoices.length === 0) {
      return voices[0] || null;
    }

    const isNetworkVoice = (v: SpeechSynthesisVoice) =>
      v.localService === false ||
      v.name.toLowerCase().includes('online') ||
      v.name.toLowerCase().includes('network');

    const localVoices = germanVoices.filter(v => !isNetworkVoice(v));
    const pool = localVoices.length > 0 ? localVoices : germanVoices;

    const preferredNames = ['anna', 'helena', 'petra', 'markus', 'martin', 'siri', 'katja', 'amira', 'marlene', 'vicki', 'stefan', 'hedda'];
    for (const name of preferredNames) {
      const match = pool.find(v => v.name.toLowerCase().includes(name));
      if (match) return match;
    }

    const enhanced = pool.find(v => 
      v.name.toLowerCase().includes('enhanced') || 
      v.name.toLowerCase().includes('premium') || 
      v.name.toLowerCase().includes('erweitert')
    );
    if (enhanced) return enhanced;

    if (pool.length > 0) return pool[0];
    return germanVoices[0] || null;
  };

  const handleStopSpeaking = () => {
    ttsSessionIdRef.current += 1;
    stopNeuralSpeech();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      try {
        window.speechSynthesis.resume();
      } catch {}
    }
    setIsTtsSpeaking(false);
    setActiveTtsKey(null);
    setTtsStatusText(null);
  };

  useEffect(() => {
    return () => {
      ttsSessionIdRef.current += 1;
      stopNeuralSpeech();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        try {
          window.speechSynthesis.resume();
        } catch {}
      }
    };
  }, []);

  const handleSpeakText = async (textOrPhrases: string | string[], elementKey: string = 'global') => {
    if (isTtsSpeaking && activeTtsKey === elementKey) {
      handleStopSpeaking();
      return;
    }

    handleStopSpeaking();

    const normalizedInput = Array.isArray(textOrPhrases)
      ? textOrPhrases.map(p => cleanTextForTts(p)).join(' ')
      : cleanTextForTts(textOrPhrases);

    const rawPhrases = normalizedInput
      .split(/(?<=[.!?])\s+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (rawPhrases.length === 0) return;

    const phrases: string[] = [];
    for (let i = 0; i < rawPhrases.length; i++) {
      const p = rawPhrases[i];
      if (phrases.length === 0 && p.length < 30 && i < rawPhrases.length - 1) {
        phrases.push(`${p} ${rawPhrases[i + 1]}`);
        i++;
      } else {
        phrases.push(p);
      }
    }

    const currentSessionId = ++ttsSessionIdRef.current;
    setIsTtsSpeaking(true);
    setActiveTtsKey(elementKey);

    playMotivationalTtsIntroChime(ttsMode);

    // If neural voice selected, attempt neural synthesis
    if (ttsMode.startsWith('neural')) {
      const voiceId = ttsMode === 'neural_kerstin' ? 'kerstin' : 'thorsten';
      setTtsStatusText('Lade Sprachausgabe...');

      try {
        const fullText = phrases.join(' ');
        const audioBlob = await synthesizeNeuralSpeech(fullText, voiceId);

        if (currentSessionId !== ttsSessionIdRef.current) return;

        if (audioBlob) {
          setTtsStatusText(null);
          await playAudioBlob(audioBlob);
          if (currentSessionId === ttsSessionIdRef.current) {
            setIsTtsSpeaking(false);
            setActiveTtsKey(null);
          }
          return;
        }
      } catch (err) {
        console.warn('[TTS] Neural synthesis fallback to browser speech:', err);
      }
    }

    // Fallback: Browser SpeechSynthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setTtsStatusText(null);
      let phraseIndex = 0;

      const speakNext = () => {
        if (currentSessionId !== ttsSessionIdRef.current) return;
        if (phraseIndex >= phrases.length) {
          setIsTtsSpeaking(false);
          setActiveTtsKey(null);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(phrases[phraseIndex]);
        utterance.lang = 'de-DE';
        const bestVoice = selectBestGermanVoice();
        if (bestVoice) utterance.voice = bestVoice;

        utterance.rate = ttsMode === 'cheerful' ? 1.08 : 0.96;
        utterance.pitch = ttsMode === 'cheerful' ? 1.15 : 1.0;

        utterance.onend = () => {
          phraseIndex++;
          speakNext();
        };

        utterance.onerror = () => {
          if (currentSessionId === ttsSessionIdRef.current) {
            setIsTtsSpeaking(false);
            setActiveTtsKey(null);
          }
        };

        window.speechSynthesis.speak(utterance);
      };

      speakNext();
    } else {
      setIsTtsSpeaking(false);
      setActiveTtsKey(null);
      setTtsStatusText(null);
    }
  };

  const buildCompleteWeeklyHomeworkSpeechPhrases = (
    weekNumOrTeacherOrOptions?: any,
    booksOrNotes?: any,
    songsList?: any,
    audioNotes?: any,
    generalNotes?: any,
    studentQuestion?: any
  ): string[] => {
    // 🛡️ 1% Goldstandard: Wenn ein strukturiertes Options-Objekt übergeben wird
    if (weekNumOrTeacherOrOptions && typeof weekNumOrTeacherOrOptions === 'object' && !Array.isArray(weekNumOrTeacherOrOptions) && ('books' in weekNumOrTeacherOrOptions || 'songs' in weekNumOrTeacherOrOptions || 'studentFirstName' in weekNumOrTeacherOrOptions)) {
      const narrative = buildContinuousHomeworkNarrative(weekNumOrTeacherOrOptions);
      return [narrative];
    }

    // 🛡️ Rückwärtskompatibler Fallback für positionale Argumente
    const books = Array.isArray(booksOrNotes) ? booksOrNotes : [];
    const songs = Array.isArray(songsList) ? songsList : [];
    const audioArr = Array.isArray(audioNotes) ? audioNotes : [];
    const audioCount = audioArr.length > 0 ? audioArr.length : (typeof audioNotes === 'number' ? audioNotes : 0);
    const audioRecordings = audioArr.map((a: any) => ({
      label: a.label || a.title || 'Aufnahme'
    }));

    const teacherName = typeof weekNumOrTeacherOrOptions === 'string' && isNaN(Number(weekNumOrTeacherOrOptions))
      ? weekNumOrTeacherOrOptions
      : undefined;

    const narrative = buildContinuousHomeworkNarrative({
      teacherName,
      books,
      songs,
      audioCount,
      audioRecordings: audioRecordings.length > 0 ? audioRecordings : undefined,
      generalNotes: typeof generalNotes === 'string' ? generalNotes : (typeof booksOrNotes === 'string' ? booksOrNotes : ''),
      studentQuestion: typeof studentQuestion === 'string' ? studentQuestion : undefined
    });
    return [narrative];
  };

  return {
    ttsMode,
    handleSetTtsMode,
    isTtsSpeaking,
    activeTtsKey,
    ttsStatusText,
    handleSpeakText,
    handleStopSpeaking,
    buildCompleteWeeklyHomeworkSpeechPhrases
  };
}
