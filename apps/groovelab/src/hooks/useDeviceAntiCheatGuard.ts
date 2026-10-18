import { useState, useEffect, useRef, useCallback } from 'react';
import { SharedAudioEngine } from '../utils/sharedAudioEngine';

export type DeviceAntiCheatAbortReason =
  | 'timeout'
  | 'strike_limit_exceeded'
  | 'device_lifted_timeout'
  | 'device_motion_strike'
  | 'touch_interaction_strike'
  | 'desktop_input_strike'
  | 'app_switch_timeout'
  | 'permission_denied'
  | 'sensor_probe_failed';

export type DeviceAntiCheatTriggerReason =
  | 'orientation'
  | 'motion'
  | 'touch'
  | 'desktop_input'
  | 'visibility'
  | 'blur';

export interface UseDeviceAntiCheatGuardOptions {
  /** Ob das überwachte Tool / die Übesession aktuell aktiv ist */
  isActive: boolean;
  /** Name des aktiven Tools für Logging / UI (z. B. "Fokus-Übetimer") */
  toolName?: string;
  /** Ob aktuell eine Hardware-/Berechtigungsabfrage läuft, bei der Blur-Events ignoriert werden */
  isPermissionPending?: boolean;
  /** Ob der didaktische Notenständer-Modus auf Tablets erlaubt ist (Neigung ~75°) */
  allowMusicStandMode?: boolean;
  /** Callback beim endgültigen harten Abbruch (Timeout, Strike-Limit oder Permission-Fail) */
  onHardAbort: (reason: DeviceAntiCheatAbortReason, message: string) => void;
  /** Optionaler Callback beim Start der Kulanz oder jedem Tick (Sekunden übrig, Grund) */
  onGraceWarning?: (secondsLeft: number, trigger: DeviceAntiCheatTriggerReason) => void;
  /** Optionaler Callback bei rechtzeitiger Rückkehr auf den Tisch (Strike verbraucht) */
  onRecovered?: (strikesUsed: number) => void;
}

export interface UseDeviceAntiCheatGuardResult {
  /** Ob das Gerät korrekt flach auf dem Tisch bzw. im Notenständer liegt */
  isTableFlat: boolean;
  /** Konkrete Ausrichtung: 'face-up' | 'face-down' | 'music-stand' | 'none' */
  flatType: 'face-up' | 'face-down' | 'music-stand' | 'none';
  /** Ob aktuell eine 10s-Kulanzphase aktiv ist */
  isInterrupted: boolean;
  /** Verbleibende Kulanz-Sekunden (10 -> 0) */
  graceSecondsLeft: number;
  /** Anzahl verbrauchter Strikes (0 oder 1) */
  strikes: number;
  /** Ob die Session endgültig hart abgebrochen wurde */
  isAborted: boolean;
  /** Der genaue Grund für den harten Abbruch */
  abortReason: DeviceAntiCheatAbortReason | null;
  /** Didaktische Abbruch-Meldung */
  abortNotice: string | null;
  /** Autoritativer WebKit / Chrome Sensor-Permissions-Handshake */
  requestSensorPermissions: () => Promise<boolean>;
  /** Manuelles Zurücksetzen des Guards */
  resetGuard: () => void;
  /** Bestätigt das Abbruch-Modal und räumt den State auf */
  acknowledgeAbort: () => void;
}

const GRACE_PERIOD_SECONDS = 10;
const MAX_TABLE_ANGLE_DEG = 8.0; // Strikte Tisch-Horizontale (max 8° für Kamera-Bump)
const TREMOR_RMS_THRESHOLD_MS2 = 0.25; // Physiologischer Hand-Tremor (8-12Hz Fluktuation)
const SENSOR_PROBE_MS = 400; // Fail-Closed Sensor-Liveness Timeout

/**
 * 🛡️ 0,1% Enterprise Device Anti-Cheat Guard (Desktop, PWA & Mobile)
 * 
 * Regeln & Invarianten:
 * - Tisch-Doktrin: Gerät muss flach (Face-Up oder Face-Down) auf dem Tisch liegen.
 * - Sensor-Filter: Gyroskop (<= 8°) und Accelerometer-RMS (< 0.25 m/s²). Handheld-Nutzung wird sofort erkannt.
 * - Zero-Touch Veto: Berührungen des Displays während aktiver Session lösen Veto aus.
 * - Desktop Activity Guard: Tastatur-/Maus-Stürme am PC während Instrumenten-Üben lösen Veto aus.
 * - 3-Stufen-Resilienz: 1. Veto friert Zeit ein -> 2. 10s Kulanz (1 Strike) -> 3. Hard Abort (Fail-Closed).
 */
export function useDeviceAntiCheatGuard({
  isActive,
  toolName = 'Fokus-Timer',
  isPermissionPending = false,
  allowMusicStandMode = false,
  onHardAbort,
  onGraceWarning,
  onRecovered
}: UseDeviceAntiCheatGuardOptions): UseDeviceAntiCheatGuardResult {
  // Plattform-Erkennung
  const isMobile = typeof navigator !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  const isTablet = isMobile && (
    /iPad|Tablet|PlayBook/i.test(navigator.userAgent) ||
    (typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) >= 600)
  );

  const [isTableFlat, setIsTableFlat] = useState(!isMobile);
  const [flatType, setFlatType] = useState<'face-up' | 'face-down' | 'music-stand' | 'none'>(!isMobile ? 'face-up' : 'none');
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [graceSecondsLeft, setGraceSecondsLeft] = useState(GRACE_PERIOD_SECONDS);
  const [strikes, setStrikes] = useState(0);
  const [isAborted, setIsAborted] = useState(false);
  const [abortReason, setAbortReason] = useState<DeviceAntiCheatAbortReason | null>(null);
  const [abortNotice, setAbortNotice] = useState<string | null>(null);

  // Synchronous State Refs
  const strikesRef = useRef(0);
  const isInterruptedRef = useRef(false);
  const isTableFlatRef = useRef(!isMobile);
  const leftTimestampRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTriggerRef = useRef<DeviceAntiCheatTriggerReason>('orientation');

  // Sensor Buffer & Filter Refs
  const hasReceivedSensorEventRef = useRef(false);
  const isDeviceMovingRef = useRef(false);
  const motionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accelSamplesRef = useRef<number[]>([]);
  const lastAccelTimeRef = useRef(0);
  const desktopKeyStrokeCountRef = useRef(0);
  const desktopKeyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Callback Refs
  const onHardAbortRef = useRef(onHardAbort);
  const onGraceWarningRef = useRef(onGraceWarning);
  const onRecoveredRef = useRef(onRecovered);

  useEffect(() => {
    onHardAbortRef.current = onHardAbort;
    onGraceWarningRef.current = onGraceWarning;
    onRecoveredRef.current = onRecovered;
  });

  // Sound Synthesizer via SharedAudioEngine
  const playWarningBeep = useCallback(() => {
    try {
      const ctx = SharedAudioEngine.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.28);
      gain.gain.setValueAtTime(0.20, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([160, 80, 160]);
      }
    } catch (e) {
      console.warn('[AntiCheatGuard] Warning sound failed:', e);
    }
  }, []);

  const playAbortSound = useCallback(() => {
    try {
      const ctx = SharedAudioEngine.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(165, now + 0.45);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      console.warn('[AntiCheatGuard] Abort sound failed:', e);
    }
  }, []);

  const playRecoveryChime = useCallback(() => {
    try {
      const ctx = SharedAudioEngine.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.14, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
      gain2.gain.setValueAtTime(0.14, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn('[AntiCheatGuard] Recovery chime failed:', e);
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // 🛡️ Fail-Closed Hard Abort Trigger
  const triggerHardAbort = useCallback((reason: DeviceAntiCheatAbortReason, message: string) => {
    clearTimer();
    isInterruptedRef.current = false;
    leftTimestampRef.current = null;
    setIsInterrupted(false);
    setIsAborted(true);
    setAbortReason(reason);
    setAbortNotice(message);
    playAbortSound();

    try {
      window.dispatchEvent(new CustomEvent('campus_focus_session_aborted', {
        detail: { reason, message, toolName }
      }));
    } catch {}

    onHardAbortRef.current(reason, message);
  }, [clearTimer, playAbortSound, toolName]);

  // Veto Trigger (Stufe 1 oder Stufe 3)
  const triggerVeto = useCallback((trigger: DeviceAntiCheatTriggerReason, abortReasonIfStrike: DeviceAntiCheatAbortReason, message: string) => {
    if (!isActive || isAborted) return;
    currentTriggerRef.current = trigger;

    // Zweiter Verstoß oder Strike verbraucht -> Sofortiger harter Abbruch!
    if (strikesRef.current >= 1) {
      triggerHardAbort(abortReasonIfStrike, message);
      return;
    }

    // Bereits in Kulanz?
    if (isInterruptedRef.current) return;

    isInterruptedRef.current = true;
    setIsInterrupted(true);
    setGraceSecondsLeft(GRACE_PERIOD_SECONDS);
    leftTimestampRef.current = Date.now();
    playWarningBeep();
    onGraceWarningRef.current?.(GRACE_PERIOD_SECONDS, trigger);

    clearTimer();
    countdownIntervalRef.current = setInterval(() => {
      if (leftTimestampRef.current) {
        const elapsedSecs = Math.floor((Date.now() - leftTimestampRef.current) / 1000);
        const remaining = Math.max(0, GRACE_PERIOD_SECONDS - elapsedSecs);
        setGraceSecondsLeft(remaining);
        onGraceWarningRef.current?.(remaining, currentTriggerRef.current);

        if (remaining <= 0) {
          triggerHardAbort('timeout', message);
        }
      }
    }, 1000);
  }, [isActive, isAborted, triggerHardAbort, playWarningBeep, clearTimer]);

  // Recovery Trigger (Stufe 2)
  const handleRecovery = useCallback(() => {
    if (!isInterruptedRef.current || isAborted) return;

    // Prüfen, ob im Hintergrund mehr als 10s vergangen sind (Hintergrund-Throttling Guard)
    if (leftTimestampRef.current) {
      const elapsedSecs = (Date.now() - leftTimestampRef.current) / 1000;
      if (elapsedSecs >= GRACE_PERIOD_SECONDS) {
        triggerHardAbort('timeout', 'Kulanzfrist überschritten: Du bist nicht rechtzeitig zum Fokus-Timer zurückgekehrt. 🛑');
        return;
      }
    }

    clearTimer();
    isInterruptedRef.current = false;
    leftTimestampRef.current = null;
    setIsInterrupted(false);
    setGraceSecondsLeft(GRACE_PERIOD_SECONDS);

    const newStrikes = strikesRef.current + 1;
    strikesRef.current = newStrikes;
    setStrikes(newStrikes);

    playRecoveryChime();
    onRecoveredRef.current?.(newStrikes);
  }, [isAborted, clearTimer, triggerHardAbort, playRecoveryChime]);

  // 🛡️ WebKit & Android Dual-Permission Handshake (Fail-Closed)
  const requestSensorPermissions = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return true;

    try {
      const DeviceOrientationWithPermission = typeof DeviceOrientationEvent !== 'undefined'
        ? (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
        : undefined;
      const DeviceMotionWithPermission = typeof DeviceMotionEvent !== 'undefined'
        ? (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })
        : undefined;

      const orientationPromise = typeof DeviceOrientationWithPermission?.requestPermission === 'function'
        ? DeviceOrientationWithPermission.requestPermission().catch(() => 'denied')
        : Promise.resolve('granted');

      const motionPromise = typeof DeviceMotionWithPermission?.requestPermission === 'function'
        ? DeviceMotionWithPermission.requestPermission().catch(() => 'denied')
        : Promise.resolve('granted');

      const [orientationRes, motionRes] = await Promise.all([orientationPromise, motionPromise]);
      const granted = orientationRes === 'granted' && motionRes === 'granted';

      if (!granted && isMobile) {
        const notice = 'Sensor-Berechtigung verweigert: Der Fokus-Timer erfordert Zugriff auf die Bewegungssensoren, um die Tischablage zu prüfen. 🛑';
        triggerHardAbort('permission_denied', notice);
      }

      return granted;
    } catch (err) {
      console.warn('[AntiCheatGuard] Dual permission handshake error:', err);
      if (isMobile) {
        triggerHardAbort('permission_denied', 'Sensor-Berechtigungsfehler: Zugriff auf Lagesensoren fehlgeschlagen. 🛑');
      }
      return false;
    }
  }, [isMobile, triggerHardAbort]);

  // 📱 Mobile & PWA Sensor Listener Engine (Gyroskop + RMS-Accelerometer)
  useEffect(() => {
    if (!isActive || typeof window === 'undefined') {
      setIsTableFlat(!isMobile);
      isTableFlatRef.current = !isMobile;
      setFlatType(!isMobile ? 'face-up' : 'none');
      hasReceivedSensorEventRef.current = false;
      return;
    }

    if (!isMobile || !('DeviceOrientationEvent' in window)) {
      // Desktop / Laptop: Physisch auf dem Tisch
      setIsTableFlat(true);
      isTableFlatRef.current = true;
      setFlatType('face-up');
      return;
    }

    // Mobilgerät: Zunächst false (Fail-Closed), bis Lagesensor echte Flachlage meldet
    setIsTableFlat(false);
    isTableFlatRef.current = false;
    setFlatType('none');
    hasReceivedSensorEventRef.current = false;

    // 400ms Sensor Probe: Meldet das Gerät echte Events?
    const probeTimeout = setTimeout(() => {
      if (isActive && !hasReceivedSensorEventRef.current) {
        console.warn('[AntiCheatGuard] Sensor probe failed after 400ms: No sensor events received.');
        triggerHardAbort(
          'sensor_probe_failed',
          'Keine Sensor-Signale empfangen: Auf Mobilgeräten erfordert der Fokus-Timer aktive Lagesensoren. 🛑'
        );
      }
    }, SENSOR_PROBE_MS);

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta;
      const gamma = e.gamma;
      if (beta !== null || gamma !== null) {
        hasReceivedSensorEventRef.current = true;
      }
      if (beta === null || gamma === null) {
        setIsTableFlat(false);
        isTableFlatRef.current = false;
        setFlatType('none');
        triggerVeto('orientation', 'device_lifted_timeout', 'Lagesensor-Signal verloren: Bitte lege das Gerät ruhig auf den Tisch! 🛑');
        return;
      }

      // 1. Flat Face-Up: Display zeigt nach oben, Neigung beta & gamma <= 8 Grad
      const faceUp = Math.abs(beta) <= MAX_TABLE_ANGLE_DEG && Math.abs(gamma) <= MAX_TABLE_ANGLE_DEG;
      // 2. Flat Face-Down: Display liegt auf dem Tisch (beta nahe 180/-180, gamma <= 8 Grad)
      const faceDown = Math.abs(Math.abs(beta) - 180) <= MAX_TABLE_ANGLE_DEG && Math.abs(gamma) <= MAX_TABLE_ANGLE_DEG;
      // 3. Optionaler Notenständer-Modus auf Tablets (~75° Pitch)
      const musicStand = allowMusicStandMode && isTablet && (beta >= 65 && beta <= 88 && Math.abs(gamma) <= 12);

      const isOrientedCorrectly = faceUp || faceDown || musicStand;
      const currentFlatType: 'face-up' | 'face-down' | 'music-stand' | 'none' = faceDown
        ? 'face-down'
        : (faceUp ? 'face-up' : (musicStand ? 'music-stand' : 'none'));

      setFlatType(currentFlatType);

      const isTrulyFlatAndStill = isOrientedCorrectly && !isDeviceMovingRef.current;
      setIsTableFlat(isTrulyFlatAndStill);
      isTableFlatRef.current = isTrulyFlatAndStill;

      if (!isTrulyFlatAndStill) {
        triggerVeto(
          'orientation',
          'device_lifted_timeout',
          'Gerät angehoben: Das Smartphone muss während des Übens flach auf dem Tisch liegen! 🛑'
        );
      } else if (isInterruptedRef.current && (typeof document === 'undefined' || !document.hidden)) {
        handleRecovery();
      }
    };

    const handleMotion = (e: DeviceMotionEvent) => {
      const now = performance.now();
      const acc = e.acceleration || e.accelerationIncludingGravity;
      if (acc) {
        hasReceivedSensorEventRef.current = true;
      }
      if (!acc) return;

      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = (e.acceleration ? acc.z : 0) || 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Rolling Buffer für RMS-Tremor-Filterung (letzte 8 Samples)
      if (now - lastAccelTimeRef.current >= 40) { // ~25Hz Sampling
        lastAccelTimeRef.current = now;
        accelSamplesRef.current.push(magnitude);
        if (accelSamplesRef.current.length > 8) {
          accelSamplesRef.current.shift();
        }

        // Berechnung der Standardabweichung / RMS
        if (accelSamplesRef.current.length >= 4) {
          const mean = accelSamplesRef.current.reduce((a, b) => a + b, 0) / accelSamplesRef.current.length;
          const variance = accelSamplesRef.current.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / accelSamplesRef.current.length;
          const rmsTremor = Math.sqrt(variance);

          // Veto bei Erschütterung ODER anhaltendem Hand-Tremor
          if (magnitude > 1.4 || rmsTremor > TREMOR_RMS_THRESHOLD_MS2) {
            isDeviceMovingRef.current = true;
            setIsTableFlat(false);
            isTableFlatRef.current = false;

            triggerVeto(
              'motion',
              'device_motion_strike',
              'Handheld-Nutzung / Bewegung registriert: Das Gerät wird in der Hand gehalten! Bitte auf den Tisch legen. 🛑'
            );

            if (motionTimeoutRef.current) clearTimeout(motionTimeoutRef.current);
            motionTimeoutRef.current = setTimeout(() => {
              isDeviceMovingRef.current = false;
            }, 1200);
          }
        }
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      clearTimeout(probeTimeout);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
      if (motionTimeoutRef.current) clearTimeout(motionTimeoutRef.current);
    };
  }, [isActive, isMobile, isTablet, allowMusicStandMode, triggerVeto, handleRecovery, triggerHardAbort]);

  // 👆 Zero-Touch Screen Veto Engine (Tippen auf dem Display während der Session blockieren)
  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;

    const handlePointerDown = (e: PointerEvent | TouchEvent) => {
      // Erlaube Klicks auf explizit freigegebene Elemente (z. B. "Session Beenden" oder Pause)
      const target = e.target as HTMLElement | null;
      if (
        target?.closest('[data-focus-allow-interaction="true"]') ||
        target?.closest('button') ||
        target?.closest('[role="button"]')
      ) {
        return;
      }

      triggerVeto(
        'touch',
        'touch_interaction_strike',
        'Display-Bedienung erkannt: Während der Fokus-Session darf das Gerät nicht bedient werden! 🛑'
      );
    };

    window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, [isActive, triggerVeto]);

  // 💻 Desktop / Laptop Input Activity Guard ("Hands on Instrument Doktrin")
  useEffect(() => {
    if (!isActive || isMobile || typeof window === 'undefined') return;

    const handleDesktopInput = () => {
      desktopKeyStrokeCountRef.current += 1;

      if (desktopKeyResetTimeoutRef.current) clearTimeout(desktopKeyResetTimeoutRef.current);
      desktopKeyResetTimeoutRef.current = setTimeout(() => {
        desktopKeyStrokeCountRef.current = 0;
      }, 4000);

      // Wer mehr als 6 Anschläge in 4 Sekunden tätigt, chattet oder surft
      if (desktopKeyStrokeCountRef.current >= 6) {
        triggerVeto(
          'desktop_input',
          'desktop_input_strike',
          'Aktive Computernutzung erkannt: Beim Instrumenten-Üben bleibt die Tastatur unberührt! 🛑'
        );
      }
    };

    window.addEventListener('keydown', handleDesktopInput);
    return () => {
      window.removeEventListener('keydown', handleDesktopInput);
      if (desktopKeyResetTimeoutRef.current) clearTimeout(desktopKeyResetTimeoutRef.current);
    };
  }, [isActive, isMobile, triggerVeto]);

  // 🛡️ Visibility & Window Blur Guard (Tab-Wechsel, App-Hintergrund, Desktop-Fokusverlust)
  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;

    const handleVisibility = () => {
      if (isPermissionPending && !document.hidden) return;

      const isWindowFocused = isMobile ? true : document.hasFocus();

      if (document.hidden || !isWindowFocused) {
        triggerVeto(
          'visibility',
          'app_switch_timeout',
          'Fokus-Unterbrechung: Du hast den Tab oder das Fenster gewechselt. Beim Üben bleibt der Timer im Vordergrund! 🛑'
        );
      } else if (isTableFlatRef.current && isInterruptedRef.current) {
        handleRecovery();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [isActive, isMobile, isPermissionPending, triggerVeto, handleRecovery]);

  // Reset bei Deaktivierung
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
    setAbortNotice(null);
  }, [clearTimer]);

  const acknowledgeAbort = useCallback(() => {
    resetGuard();
  }, [resetGuard]);

  return {
    isTableFlat,
    flatType,
    isInterrupted,
    graceSecondsLeft,
    strikes,
    isAborted,
    abortReason,
    abortNotice,
    requestSensorPermissions,
    resetGuard,
    acknowledgeAbort
  };
}
