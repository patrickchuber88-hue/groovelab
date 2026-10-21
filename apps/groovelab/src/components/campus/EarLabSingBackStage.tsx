import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  Mic,
  Check,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Activity,
  Sparkles
} from 'lucide-react';
import { earSynth, SoundEngineTimbre } from '../../services/audio/EarSynthEngine';
import {
  RealtimePitchStream,
  YinPitchResult,
  evaluatePitchMatch,
  midiToFreq
} from '../../services/audio/YinPitchDetectionEngine';
import type { VdmLevel } from './earLabCatalogData';

export interface EarLabSingBackStageProps {
  currentPitchQuestion: { midi: number; label: string } | null;
  vdmLevel: VdmLevel;
  uiLevel: 'junior' | 'teen' | 'pro';
  soundTimbre: SoundEngineTimbre;
  onPitchMatched: () => void;
  onSkipPitchQuestion: () => void;
}

/**
 * 0,1% Enterprise & Musikschul-Goldstandard:
 * Autarker Sing-Back & Intonations-Satellit (YIN Engine)
 *
 * Beinhaltet:
 * - Hands-Free 10-Runden-Durchlauf (Mikrofon bleibt über Rundenwechsel aktiv)
 * - Akustischer Self-Listening-Guard (Echo-Stummschaltung während der Referenzton klingt)
 * - Stale-Closure-freier 30-fps Loop via synchronisierter Refs
 * - EMA-Frequenzglättung & ~700ms Tonhalte-Training gegen Zufallstreffer beim Durchrutschen
 * - VdM-stufengerechte Cent-Toleranzen (Junior ±40ct, D1 ±30ct, D2 ±24ct, D3 ±18ct)
 * - Oktav-Transparenz-Badge (Sopran/Alt/Tenor/Bass & Stimmbruch-Inklusion)
 */
export const EarLabSingBackStage: React.FC<EarLabSingBackStageProps> = ({
  currentPitchQuestion,
  vdmLevel,
  uiLevel,
  soundTimbre,
  onPitchMatched,
  onSkipPitchQuestion
}) => {
  const [isPitchListening, setIsPitchListening] = useState<boolean>(false);
  const [livePitchResult, setLivePitchResult] = useState<YinPitchResult | null>(null);
  const [smoothedCents, setSmoothedCents] = useState<number>(0);
  const [pitchMatchLockCountdown, setPitchMatchLockCountdown] = useState<number>(0);
  const [isPitchLockedIn, setIsPitchLockedIn] = useState<boolean>(false);
  const [isSynthPlayingTarget, setIsSynthPlayingTarget] = useState<boolean>(false);

  // Refs für Stale-Closure-Immunität im 30fps Audio-Loop
  const pitchStreamRef = useRef<RealtimePitchStream | null>(null);
  const currentQuestionRef = useRef<{ midi: number; label: string } | null>(currentPitchQuestion);
  const vdmLevelRef = useRef<VdmLevel>(vdmLevel);
  const isLockedInRef = useRef<boolean>(false);
  const onPitchMatchedRef = useRef<() => void>(onPitchMatched);
  const synthDuckingUntilRef = useRef<number>(0);
  const smoothedCentsRef = useRef<number>(0);
  const duckingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // VdM-Stufengerechte Intonations-Toleranz in Cents
  const getToleranceForLevel = useCallback((lvl: VdmLevel): number => {
    if (lvl === 'junior') return 40;
    if (lvl === 'd1') return 30;
    if (lvl === 'd2') return 24;
    return 18; // d3 Studio-Präzision
  }, []);

  // Synchronisiere Props in Refs für Echtzeit-Loop
  useEffect(() => {
    currentQuestionRef.current = currentPitchQuestion;
  }, [currentPitchQuestion]);

  useEffect(() => {
    vdmLevelRef.current = vdmLevel;
  }, [vdmLevel]);

  useEffect(() => {
    onPitchMatchedRef.current = onPitchMatched;
  }, [onPitchMatched]);

  // Referenzton mit akustischem Self-Listening-Guard abspielen
  const handlePlayTargetPitch = useCallback((durationSec: number = 1.5) => {
    const q = currentQuestionRef.current;
    if (!q) return;

    // Sperre Mikrofon-Auswertung während der Synth klingt + 260ms Raumhall-Puffer
    const muteDurationMs = Math.round(durationSec * 1000) + 260;
    synthDuckingUntilRef.current = performance.now() + muteDurationMs;
    setIsSynthPlayingTarget(true);

    if (duckingTimerRef.current) clearTimeout(duckingTimerRef.current);
    duckingTimerRef.current = setTimeout(() => {
      setIsSynthPlayingTarget(false);
    }, muteDurationMs);

    earSynth.playNote(q.midi, durationSec, 0.42, 0, soundTimbre);
  }, [soundTimbre]);

  // Bei neuem Zielton: Lock-In zurücksetzen & im Hands-Free-Modus neuen Ton automatisch vorspielen
  useEffect(() => {
    isLockedInRef.current = false;
    setIsPitchLockedIn(false);
    setPitchMatchLockCountdown(0);
    setLivePitchResult(null);
    smoothedCentsRef.current = 0;
    setSmoothedCents(0);

    if (isPitchListening && currentPitchQuestion) {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = setTimeout(() => {
        handlePlayTargetPitch(1.35);
      }, 320);
    }
  }, [currentPitchQuestion, isPitchListening, handlePlayTargetPitch]);

  // Leertaste spielt jederzeit den Zielton erneut vor (Hands-Free Tastatur-Ergonomie)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'BUTTON' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        handlePlayTargetPitch(1.5);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayTargetPitch]);

  // Echtzeit-Mikrofon-Stream starten/stoppen (bleibt über Rundenwechsel aktiv)
  const togglePitchListening = async () => {
    if (isPitchListening) {
      pitchStreamRef.current?.stop();
      setIsPitchListening(false);
      setLivePitchResult(null);
      setPitchMatchLockCountdown(0);
    } else {
      if (!pitchStreamRef.current) {
        pitchStreamRef.current = new RealtimePitchStream();
      }

      // Spiele beim ersten Start direkt den Referenzton vor (mit Echo-Schutz)
      handlePlayTargetPitch(1.4);

      const ok = await pitchStreamRef.current.start((result) => {
        // 1. Akustischer Self-Listening Guard: Ignoriere Lautsprecher-Output während der Synth klingt
        if (performance.now() < synthDuckingUntilRef.current) {
          return;
        }

        // 2. Ignoriere Auswertung, wenn Runde bereits eingerastet ist
        if (isLockedInRef.current) {
          return;
        }

        setLivePitchResult(result);

        const activeQuestion = currentQuestionRef.current;
        if (activeQuestion && result.pitch && result.isAudible && result.clarity >= 0.65) {
          const targetFreq = midiToFreq(activeQuestion.midi);
          const tolerance = getToleranceForLevel(vdmLevelRef.current);
          const score = evaluatePitchMatch(result.pitch, targetFreq, tolerance);

          // Exponentielle Glättung (EMA) für ruhige, musikalische Zeigerführung
          const nextSmoothed = smoothedCentsRef.current * 0.62 + score.cents * 0.38;
          smoothedCentsRef.current = nextSmoothed;
          setSmoothedCents(nextSmoothed);

          if (score.isMatched) {
            setPitchMatchLockCountdown(prev => {
              // ~20 Frames à 33ms (~660ms) stabile Tonhaltung für 100% Lock-In
              const nextVal = Math.min(100, prev + 5);
              if (nextVal >= 100 && !isLockedInRef.current) {
                isLockedInRef.current = true;
                setIsPitchLockedIn(true);
                // Positives Bestätigungs-Feedback & automatischer Übergang OHNE Mikrofon-Abbruch!
                if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
                advanceTimerRef.current = setTimeout(() => {
                  onPitchMatchedRef.current();
                }, 850);
              }
              return nextVal;
            });
          } else {
            // Sanftes Abschmelzen bei kurzem Stimm-Wackler statt hartem Reset
            setPitchMatchLockCountdown(prev => Math.max(0, prev - 3.5));
          }
        } else {
          // Stille: Haltebalken sinkt langsam ab
          setPitchMatchLockCountdown(prev => Math.max(0, prev - 2.5));
        }
      });

      setIsPitchListening(ok);
    }
  };

  // Unmount Cleanup
  useEffect(() => {
    return () => {
      pitchStreamRef.current?.stop();
      if (duckingTimerRef.current) clearTimeout(duckingTimerRef.current);
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const targetFreq = midiToFreq(currentPitchQuestion?.midi || 60);
  const toleranceCents = getToleranceForLevel(vdmLevel);
  const hasActiveVoice = Boolean(
    !isSynthPlayingTarget &&
    livePitchResult &&
    livePitchResult.isAudible &&
    livePitchResult.pitch &&
    livePitchResult.clarity >= 0.65
  );

  const evalScore = hasActiveVoice && livePitchResult?.pitch
    ? evaluatePitchMatch(livePitchResult.pitch, targetFreq, toleranceCents)
    : null;

  const isMatched = Boolean(evalScore?.isMatched || isPitchLockedIn);
  const displayCents = hasActiveVoice ? Math.round(smoothedCents) : 0;
  const rmsPercent = livePitchResult?.isAudible
    ? Math.min(100, Math.round((livePitchResult.rms / 0.12) * 100))
    : 0;

  // Position des Stimm-Orbs auf der Spur (5% bis 95%, 50% = exakte Mitte)
  const orbPositionPercent = hasActiveVoice
    ? Math.max(6, Math.min(94, 50 + (smoothedCents * 0.75)))
    : 50;

  return (
    <div
      role="tabpanel"
      id="panel-ear-pitch-match"
      aria-labelledby="tab-ear-pitch-match"
      tabIndex={0}
      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
    >
      {/* Screenreader Live-Ankündigung für Barrierefreiheit (BFSG / WCAG 2.2 AA) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}
      >
        {isPitchLockedIn
          ? `Zielton ${currentPitchQuestion?.label} perfekt getroffen! Nächste Runde startet.`
          : ''}
      </div>

      <div style={{
        background: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        borderRadius: '18px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        {/* Obere Steuerleiste: Zielton-Vorhören, Metadaten & Hands-Free Mikrofon-Schalter */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              type="button"
              onClick={() => handlePlayTargetPitch(1.6)}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '18px',
                border: 'none',
                background: isSynthPlayingTarget ? '#7e22ce' : '#a855f7',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: 'none',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              className="hover-scale"
              title="Zielton vorhören (Tastatur: Leertaste)"
              aria-label={`Zielton ${currentPitchQuestion?.label} vorhören`}
            >
              <Volume2 size={26} strokeWidth={2.4} />
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '1.22rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  Zielton: {currentPitchQuestion?.label || 'C4'}
                </span>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 850,
                  padding: '3px 9px',
                  borderRadius: '7px',
                  background: '#f3e8ff',
                  color: '#6b21a8'
                }}>
                  {Math.round(targetFreq)} Hz
                </span>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '7px',
                  background: '#f1f5f9',
                  color: '#475569'
                }}>
                  Toleranz ±{toleranceCents} ct
                </span>
              </div>
              <span style={{ fontSize: '0.80rem', color: '#475569', fontWeight: 600, display: 'block', marginTop: '2px' }}>
                {uiLevel === 'junior'
                  ? 'Höre den Ton und singe, summe („Mmmh“) oder spiele ihn nach!'
                  : 'Singe, summe („Mmmh“) oder spiele den Ton auf deinem Instrument (Oktav-tolerant)'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Ton überspringen / Neuer Ton */}
            <button
              type="button"
              onClick={onSkipPitchQuestion}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
              title="Anderen Zielton wählen, falls dieser Ton unbequem liegt"
            >
              <RotateCcw size={15} strokeWidth={2.3} />
              <span>Anderer Ton</span>
            </button>

            {/* Hands-Free Mikrofon-Toggle */}
            <button
              type="button"
              onClick={togglePitchListening}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 20px',
                borderRadius: '14px',
                border: 'none',
                background: isPitchListening ? '#0f172a' : '#10b981',
                color: '#ffffff',
                fontSize: '0.86rem',
                fontWeight: 850,
                cursor: 'pointer',
                boxShadow: 'none',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
            >
              <Mic size={17} strokeWidth={2.4} color={isPitchListening ? '#34d399' : '#ffffff'} />
              <span>{isPitchListening ? 'Hands-Free aktiv (Stopp)' : 'Mikrofon starten'}</span>
            </button>
          </div>
        </div>

        {/* 2027 Immer sichtbares Intonations-Cockpit (Stimm- & Instrumenten-Radar) */}
        <div style={{
          width: '100%',
          background: isPitchLockedIn ? '#ecfdf5' : '#ffffff',
          border: isPitchLockedIn ? '1.5px solid #10b981' : '1.5px solid #e2e8f0',
          borderRadius: '18px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          boxShadow: 'none',
          transition: 'all 0.2s ease'
        }}>
          {/* Oberes Status- & Noten-Readout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            {/* Links: Live-Mikrofon-Status & Echo-Schutz-Anzeige */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: !isPitchListening
                  ? '#cbd5e1'
                  : isSynthPlayingTarget
                  ? '#a855f7'
                  : hasActiveVoice
                  ? '#10b981'
                  : '#f59e0b',
                transition: 'background 0.15s ease'
              }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                {!isPitchListening
                  ? 'Mikrofon im Standby'
                  : isSynthPlayingTarget
                  ? '🔊 Referenzton klingt (Echo-Schutz aktiv)…'
                  : hasActiveVoice
                  ? '🎤 Signal erkannt'
                  : '🎤 Bereit – singe, summe oder spiele jetzt'}
              </span>

              {/* Subtiler Live-Pegel-Balken (RMS) */}
              {isPitchListening && !isSynthPlayingTarget && (
                <div
                  title="Mikrofon-Eingangspegel"
                  style={{
                    width: '48px',
                    height: '6px',
                    background: '#f1f5f9',
                    borderRadius: '99px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{
                    width: `${rmsPercent}%`,
                    height: '100%',
                    background: hasActiveVoice ? '#10b981' : '#94a3b8',
                    transition: 'width 0.08s linear'
                  }} />
                </div>
              )}
            </div>

            {/* Rechts: Oktav-Äquivalenz Badge (wichtig für Stimmbruch / tiefe & hohe Stimmen) */}
            {evalScore && evalScore.octaveOffset !== 0 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '99px',
                background: '#f0fdf4',
                border: 'none',
                color: '#15803d',
                fontSize: '0.74rem',
                fontWeight: 850
              }}>
                <Sparkles size={13} strokeWidth={2.4} />
                <span>
                  Oktav-tolerant ({Math.abs(evalScore.octaveOffset)} Okt. {evalScore.octaveOffset < 0 ? 'tiefer' : 'höher'} ✓)
                </span>
              </div>
            )}
          </div>

          {/* Zentrum: Gesungene Note vs. Ziel-Note */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: '12px',
            minHeight: '52px'
          }}>
            {isPitchLockedIn ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Check size={22} strokeWidth={3} />
                </div>
                <span style={{ fontSize: '1.85rem', fontWeight: 950, color: '#047857', letterSpacing: '-0.02em' }}>
                  {currentPitchQuestion?.label} perfekt gehalten!
                </span>
              </div>
            ) : hasActiveVoice && livePitchResult ? (
              <>
                <span style={{
                  fontSize: '2.6rem',
                  fontWeight: 950,
                  color: isMatched ? '#059669' : '#0f172a',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  transition: 'color 0.15s ease'
                }}>
                  {livePitchResult.noteName || '–'}
                </span>
                <span style={{ fontSize: '0.90rem', fontWeight: 800, color: '#64748b' }}>
                  ({Math.round(livePitchResult.pitch || 0)} Hz)
                </span>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                <Activity size={22} strokeWidth={2.2} color="#8b5cf6" />
                <span style={{ fontSize: '1.05rem', fontWeight: 850, color: '#334155' }}>
                  {isSynthPlayingTarget
                    ? `Höre ${currentPitchQuestion?.label} (${Math.round(targetFreq)} Hz)…`
                    : isPitchListening
                    ? `Ziel: ${currentPitchQuestion?.label} – führe deine Stimme in die grüne Mitte`
                    : `Klicke rechts oben auf „Mikrofon starten“ für den Hands-Free-Modus`}
                </span>
              </div>
            )}
          </div>

          {/* Immer sichtbares Intonations-Visier (Pitch-Spur mit Sweet-Spot-Korridor) */}
          <div style={{
            width: '100%',
            maxWidth: '520px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#64748b',
              padding: '0 4px'
            }}>
              <span>♭ Zu tief (-50 ct)</span>
              <span style={{ color: '#047857', fontWeight: 900 }}>
                🎯 Ziel: {currentPitchQuestion?.label} (0 ct)
              </span>
              <span>♯ Zu hoch (+50 ct)</span>
            </div>

            <div style={{
              width: '100%',
              height: '34px',
              background: '#f1f5f9',
              borderRadius: '100px',
              position: 'relative',
              overflow: 'hidden',
              border: '1.5px solid #e2e8f0'
            }}>
              {/* Grüner Ziel-Korridor (Sweet Spot proportional zur VdM-Toleranz) */}
              <div style={{
                position: 'absolute',
                left: `${50 - (toleranceCents * 0.45)}%`,
                width: `${toleranceCents * 0.9}%`,
                height: '100%',
                background: isMatched ? '#a7f3d0' : '#dcfce7',
                borderLeft: '1.5px dashed #10b981',
                borderRight: '1.5px dashed #10b981',
                transition: 'all 0.15s ease'
              }} />

              {/* Exakte 0-Cent Mittellinie */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: '2px',
                background: '#10b981',
                opacity: 0.45,
                transform: 'translateX(-50%)'
              }} />

              {/* Dynamischer Voice-Orb (im Standby dezent in der Mitte geparkt) */}
              <div style={{
                position: 'absolute',
                left: `${orbPositionPercent}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: !hasActiveVoice && !isPitchLockedIn
                  ? '#94a3b8'
                  : isMatched
                  ? '#059669'
                  : displayCents < 0
                  ? '#2563eb'
                  : '#ea580c',
                border: '2.5px solid #ffffff',
                opacity: hasActiveVoice || isPitchLockedIn ? 1 : 0.45,
                transition: 'left 0.08s cubic-bezier(0.16, 1, 0.3, 1), background 0.15s ease, opacity 0.15s ease'
              }} />
            </div>
          </div>

          {/* Didaktische Richtungs-Führung & Tonhalte-Fortschritt (Hold-to-Lock) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            minHeight: '44px'
          }}>
            {hasActiveVoice && evalScore ? (
              isMatched ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#d1fae5',
                  color: '#047857',
                  padding: '5px 16px',
                  borderRadius: '99px',
                  fontSize: '0.84rem',
                  fontWeight: 900
                }}>
                  <Check size={16} strokeWidth={3} />
                  <span>
                    {uiLevel === 'junior'
                      ? 'Super getroffen! Halte den Ton stabil…'
                      : 'Im Zielkorridor! Ton ruhig halten…'}
                  </span>
                </div>
              ) : displayCents < 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  padding: '5px 14px',
                  borderRadius: '99px',
                  fontSize: '0.82rem',
                  fontWeight: 850
                }}>
                  <ArrowUp size={15} strokeWidth={2.8} />
                  <span>
                    {uiLevel === 'junior'
                      ? 'Etwas höher singen'
                      : `Etwas höher intonieren (${Math.abs(displayCents)} ct zu tief)`}
                  </span>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffedd5',
                  color: '#c2410c',
                  padding: '5px 14px',
                  borderRadius: '99px',
                  fontSize: '0.82rem',
                  fontWeight: 850
                }}>
                  <ArrowDown size={15} strokeWidth={2.8} />
                  <span>
                    {uiLevel === 'junior'
                      ? 'Etwas tiefer singen'
                      : `Etwas tiefer intonieren (+${displayCents} ct zu hoch)`}
                  </span>
                </div>
              )
            ) : (
              <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 650 }}>
                💡 Tipp: Drücke jederzeit die <strong>Leertaste</strong>, um den Zielton noch einmal zu hören.
              </span>
            )}

            {/* Kontinuierlicher Tonhalte-Fortschrittsbalken (~700ms Stabilitäts-Nachweis) */}
            <div style={{
              width: '100%',
              maxWidth: '300px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}>
              <div style={{
                width: '100%',
                height: '8px',
                background: '#f1f5f9',
                borderRadius: '100px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  width: `${Math.round(pitchMatchLockCountdown)}%`,
                  height: '100%',
                  background: '#10b981',
                  transition: 'width 0.08s linear'
                }} />
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: pitchMatchLockCountdown > 0 ? '#047857' : '#64748b' }}>
                Ton-Stabilität: {Math.round(pitchMatchLockCountdown)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
