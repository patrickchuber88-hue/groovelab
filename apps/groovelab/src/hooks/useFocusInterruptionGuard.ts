import { useState, useEffect, useRef, useCallback } from 'react';
import { SharedAudioEngine } from '../utils/sharedAudioEngine';

export type FocusAbortReason = 'timeout' | 'strike_limit_exceeded';

export interface UseFocusInterruptionGuardOptions {
  /** Ob das überwachte Tool / die Übesession aktuell aktiv ist */
  isActive: boolean;
  /** Name des aktiven Tools für Logging / UI (z. B. "Fokus-Übetimer") */
  toolName?: string;
  /** Ob der Benutzer innerhalb der App vom Tool weggewechselt ist (z. B. anderes Board/Tab) */
  isLeavingTool?: boolean;
  /** Callback beim endgültigen Abbruch (Timeout oder 2. Strike) */
  onAbort: (reason: FocusAbortReason) => void;
  /** Optionaler Callback beim Start der Kulanz oder jedem Tick */
  onGraceWarning?: (secondsLeft: number) => void;
  /** Optionaler Callback bei rechtzeitiger Rückkehr (Strike verbraucht) */
  onRecovered?: (strikesUsed: number) => void;
}

export interface UseFocusInterruptionGuardResult {
  /** Ob aktuell eine Kulanz-Phase (10s Countdown) läuft */
  isInterrupted: boolean;
  /** Verbleibende Kulanz-Sekunden (10 -> 0) */
  graceSecondsLeft: number;
  /** Anzahl verbrauchter Strikes (0 = noch Kulanz verfügbar, 1 = Verwarnung aktiv) */
  strikes: number;
  /** Ob die Session abgebrochen wurde */
  isAborted: boolean;
  /** Der genaue Grund für den Abbruch */
  abortReason: FocusAbortReason | null;
  /** Manuelles Zurücksetzen des Guard-Zustands */
  resetGuard: () => void;
  /** Bestätigt das Abbruch-Modal und räumt den State auf */
  acknowledgeAbort: () => void;
}

const GRACE_PERIOD_SECONDS = 10;

/**
 * Enterprise Anti-Ablenkungs- & Fokus-Wächter (Focus Interruption Guard)
 * 
 * Regeln:
 * - 1. Verlassen des Tools/Tabs: 10 Sekunden Kulanz mit akustischem & visuellem Warnton.
 * - Rechtzeitige Rückkehr: Session läuft weiter, 1. Strike verbraucht ("Verwarnung 1/1 aktiv").
 * - Zeitüberschreitung (>10s): Sofortiger Abbruch nach Fail-Closed Doktrin.
 * - 2. Verlassen nach bereits verbrauchtem Strike: Sofortiger Abbruch ohne 2. Kulanz.
 * - Throttling-Sicher: Prüft bei Rückkehr aus dem Hintergrund immer Date.now() Differenzen.
 */
export function useFocusInterruptionGuard({
  isActive,
  toolName = 'Übe-Tool',
  isLeavingTool = false,
  onAbort,
  onGraceWarning,
  onRecovered
}: UseFocusInterruptionGuardOptions): UseFocusInterruptionGuardResult {
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [graceSecondsLeft, setGraceSecondsLeft] = useState(GRACE_PERIOD_SECONDS);
  const [strikes, setStrikes] = useState(0);
  const [isAborted, setIsAborted] = useState(false);
  const [abortReason, setAbortReason] = useState<FocusAbortReason | null>(null);

  // Refs für Event-Listener & Intervalle
  const strikesRef = useRef(0);
  const isInterruptedRef = useRef(false);
  const leftTimestampRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onAbortRef = useRef(onAbort);
  const onGraceWarningRef = useRef(onGraceWarning);
  const onRecoveredRef = useRef(onRecovered);

  useEffect(() => {
    onAbortRef.current = onAbort;
    onGraceWarningRef.current = onGraceWarning;
    onRecoveredRef.current = onRecovered;
  });

  // Sounds
  const playWarningBeep = useCallback(() => {
    try {
      const ctx = SharedAudioEngine.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([120, 60, 120]);
      }
    } catch (e) {
      console.warn('[FocusGuard] Warning sound failed:', e);
    }
  }, []);

  const playAbortSound = useCallback(() => {
    try {
      const ctx = SharedAudioEngine.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(165, now + 0.4);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn('[FocusGuard] Abort sound failed:', e);
    }
  }, []);

  const playRecoveryChime = useCallback(() => {
    try {
      const ctx = SharedAudioEngine.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
      gain2.gain.setValueAtTime(0.12, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn('[FocusGuard] Recovery chime failed:', e);
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Hard Abort Trigger
  const triggerAbort = useCallback((reason: FocusAbortReason) => {
    clearTimer();
    isInterruptedRef.current = false;
    leftTimestampRef.current = null;
    setIsInterrupted(false);
    setIsAborted(true);
    setAbortReason(reason);
    playAbortSound();
    onAbortRef.current(reason);
  }, [clearTimer, playAbortSound]);

  // Handle Interruption (User leaves tool or app)
  const handleInterruptionStart = useCallback(() => {
    if (!isActive || isAborted) return;

    // Zweiter Strike: Sofortiger Abbruch ohne erneute Kulanz!
    if (strikesRef.current >= 1) {
      triggerAbort('strike_limit_exceeded');
      return;
    }

    // Bereits in Kulanz-Phase?
    if (isInterruptedRef.current) return;

    isInterruptedRef.current = true;
    setIsInterrupted(true);
    setGraceSecondsLeft(GRACE_PERIOD_SECONDS);
    leftTimestampRef.current = Date.now();
    playWarningBeep();
    onGraceWarningRef.current?.(GRACE_PERIOD_SECONDS);

    clearTimer();
    countdownIntervalRef.current = setInterval(() => {
      // Hardware- & Hintergrund-Throttling Guard: Timestamp-Differenz prüfen
      if (leftTimestampRef.current) {
        const elapsedSecs = Math.floor((Date.now() - leftTimestampRef.current) / 1000);
        const remaining = Math.max(0, GRACE_PERIOD_SECONDS - elapsedSecs);
        setGraceSecondsLeft(remaining);
        onGraceWarningRef.current?.(remaining);

        if (remaining <= 0) {
          triggerAbort('timeout');
        }
      }
    }, 1000);
  }, [isActive, isAborted, triggerAbort, playWarningBeep, clearTimer]);

  // Handle Recovery (User returns within grace period)
  const handleRecovery = useCallback(() => {
    if (!isInterruptedRef.current || isAborted) return;

    // Prüfen, ob im Hintergrund mehr als 10s vergangen sind
    if (leftTimestampRef.current) {
      const elapsedSecs = (Date.now() - leftTimestampRef.current) / 1000;
      if (elapsedSecs >= GRACE_PERIOD_SECONDS) {
        triggerAbort('timeout');
        return;
      }
    }

    clearTimer();
    isInterruptedRef.current = false;
    leftTimestampRef.current = null;
    setIsInterrupted(false);
    setGraceSecondsLeft(GRACE_PERIOD_SECONDS);

    // 1 Strike verbrauchen
    const newStrikes = strikesRef.current + 1;
    strikesRef.current = newStrikes;
    setStrikes(newStrikes);

    playRecoveryChime();
    onRecoveredRef.current?.(newStrikes);
  }, [isAborted, clearTimer, triggerAbort, playRecoveryChime]);

  // Überwachung von In-App-Wechseln (isLeavingTool)
  useEffect(() => {
    if (!isActive || isAborted) return;

    if (isLeavingTool) {
      handleInterruptionStart();
    } else if (isInterruptedRef.current) {
      // Nur recovern, wenn das Dokument auch wirklich im Vordergrund ist
      if (typeof document !== 'undefined' && !document.hidden) {
        handleRecovery();
      }
    }
  }, [isLeavingTool, isActive, isAborted, handleInterruptionStart, handleRecovery]);

  // Überwachung von externen Wechseln (Browser-Tab, Minimieren, Blur)
  useEffect(() => {
    if (typeof window === 'undefined' || !isActive || isAborted) return;

    const handleVisibilityChange = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isFocused = isMobile ? true : document.hasFocus();

      if (document.hidden || !isFocused) {
        handleInterruptionStart();
      } else if (!isLeavingTool && isInterruptedRef.current) {
        handleRecovery();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isActive, isAborted, isLeavingTool, handleInterruptionStart, handleRecovery]);

  // Reset bei Deaktivierung der Session
  useEffect(() => {
    if (!isActive) {
      clearTimer();
      isInterruptedRef.current = false;
      leftTimestampRef.current = null;
      setIsInterrupted(false);
      setGraceSecondsLeft(GRACE_PERIOD_SECONDS);
      setStrikes(0);
      strikesRef.current = 0;
    }
  }, [isActive, clearTimer]);

  const resetGuard = useCallback(() => {
    clearTimer();
    isInterruptedRef.current = false;
    leftTimestampRef.current = null;
    setIsInterrupted(false);
    setGraceSecondsLeft(GRACE_PERIOD_SECONDS);
    setStrikes(0);
    strikesRef.current = 0;
    setIsAborted(false);
    setAbortReason(null);
  }, [clearTimer]);

  const acknowledgeAbort = useCallback(() => {
    resetGuard();
  }, [resetGuard]);

  return {
    isInterrupted,
    graceSecondsLeft,
    strikes,
    isAborted,
    abortReason,
    resetGuard,
    acknowledgeAbort
  };
}
