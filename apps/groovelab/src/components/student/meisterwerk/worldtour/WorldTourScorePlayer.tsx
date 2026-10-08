import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, Square, Headphones, Mic, RotateCcw, Radio, Award, AlertCircle, Search, Timer, Sparkles, X } from 'lucide-react';
import { WorldTourCountry } from '../../../../types/worldTour';
import { projectScoreForInstrument, TransposedScoreResult, isTablatureEligible } from '../../../../domain/worldTourTransposer';
import { worldTourAudio, AudioNoteEvent } from '../../../../utils/worldTourAudioEngine';
import { WorldTourService } from '../../../../services/worldTourService';
import { playTriumphantXpChime } from '../../../../utils/campusXpEffects';
import { WorldTourStaffNotation } from './WorldTourStaffNotation';
import { WorldTourCelebrationModal } from './WorldTourCelebrationModal';

interface WorldTourScorePlayerProps {
  country: WorldTourCountry;
  studentInstrument?: string | null;
  studentId?: string;
  onMasteryAchieved?: (stars: number, score: number, xp: number) => void;
  uiLevel?: 'junior' | 'teen' | 'pro';
  onBackToMap?: () => void;
}

export const WorldTourScorePlayer: React.FC<WorldTourScorePlayerProps> = ({
  country,
  studentInstrument,
  studentId,
  onMasteryAchieved,
  uiLevel = 'teen',
  onBackToMap
}) => {
  const [mode, setMode] = useState<'listen' | 'practice' | 'challenge'>('listen');
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNoteIdx, setActiveNoteIdx] = useState<number>(-1);
  const [noteHits, setNoteHits] = useState<Record<number, 'pending' | 'hit' | 'near' | 'miss'>>({});
  const [tempo, setTempo] = useState<number>(country.score.defaultBpm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [challengeResult, setChallengeResult] = useState<{ scorePercent: number; stars: number } | null>(null);
  const [isDroneActive, setIsDroneActive] = useState(false);
  const [isMetronomeActive, setIsMetronomeActive] = useState(true);
  const [countInInfo, setCountInInfo] = useState<{ currentBeat: number; totalBeats: number } | null>(null);
  const [isAborted, setIsAborted] = useState(false);
  const [micError, setMicError] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);

  // 🎯 2027 Live Intonation HUD State
  const [liveIntonation, setLiveIntonation] = useState<{
    centsDiff?: number;
    detectedHz?: number;
    status: 'pending' | 'hit' | 'near' | 'miss';
    pitch: string;
  } | null>(null);

  // 🏆 2027 Celebratory Modal State
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [celebrationDetails, setCelebrationDetails] = useState<{
    hitCount: number;
    nearCount: number;
    missCount: number;
    xpAwarded: number;
  }>({ hitCount: 0, nearCount: 0, missCount: 0, xpAwarded: 0 });

  // Ref to eliminate closure staleness during async completion
  const noteHitsRef = useRef<Record<number, 'pending' | 'hit' | 'near' | 'miss'>>({});
  const playModeRef = useRef<'listen' | 'practice' | 'challenge'>('listen');
  const [practiceCompletedToast, setPracticeCompletedToast] = useState<string | null>(null);

  // 🎸/🎻 Saiten-Tabs & Griffschrift State (Default: false = Reine Standard-Notation für alle Instrumente)
  const [showTabs, setShowTabs] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('cg_worldtour_show_tabs') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleTabs = useCallback(() => {
    setShowTabs(prev => {
      const next = !prev;
      try {
        localStorage.setItem('cg_worldtour_show_tabs', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Derive transposed score for student instrument (standard notation by default, tabs opt-in for strings/plucked)
  const transposed: TransposedScoreResult = useMemo(() => {
    return projectScoreForInstrument(country.score, studentInstrument, showTabs);
  }, [country.score, studentInstrument, showTabs]);

  // Reset state when country changes
  useEffect(() => {
    worldTourAudio.stop();
    worldTourAudio.toggleDrone('C3', false);
    setIsDroneActive(false);
    setIsPlaying(false);
    setIsRequestingMic(false);
    setActiveNoteIdx(-1);
    setCountInInfo(null);
    setNoteHits({});
    noteHitsRef.current = {};
    setChallengeResult(null);
    setIsAborted(false);
    setMicError(false);
    setPracticeCompletedToast(null);
    setTempo(country.score.defaultBpm);
    setLiveIntonation(null);
    setIsCelebrationOpen(false);
  }, [country.code, country.score.defaultBpm]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      worldTourAudio.stop();
      worldTourAudio.toggleDrone('C3', false);
    };
  }, []);

  const handleToggleDrone = useCallback(() => {
    // Derive root pitch from tonal center or first note
    const firstNotePitch = country.score.notes.find(n => n.pitch !== 'REST')?.pitch || 'C3';
    const rootPitch = firstNotePitch.replace(/[0-9]/, '3');
    const newState = worldTourAudio.toggleDrone(rootPitch);
    setIsDroneActive(newState);
  }, [country.score.notes]);

  const handleToggleMetronome = useCallback(() => {
    const next = worldTourAudio.toggleMetronome();
    setIsMetronomeActive(next);
  }, []);

  // Render throttling: only trigger re-render if note hit status actually changed
  const handleNoteResult = useCallback((event: AudioNoteEvent) => {
    noteHitsRef.current[event.noteIndex] = event.status;
    if (event.centsDiff !== undefined || event.status) {
      setLiveIntonation({
        centsDiff: event.centsDiff,
        detectedHz: event.detectedHz,
        status: event.status,
        pitch: event.pitch
      });
    }
    setNoteHits(prev => {
      if (prev[event.noteIndex] === event.status) {
        return prev;
      }
      return {
        ...prev,
        [event.noteIndex]: event.status
      };
    });
  }, []);

  // Manual Abort Handler: Clicking Stop aborts without scoring or saving ("Challenge abgebrochen", 0 stars, no DB save)
  const handleManualStop = useCallback(() => {
    worldTourAudio.stop();
    setIsPlaying(false);
    setIsRequestingMic(false);
    setActiveNoteIdx(-1);
    setCountInInfo(null);
    setLiveIntonation(null);

    if (playModeRef.current === 'challenge') {
      setIsAborted(true);
      setChallengeResult(null); // Aborted: 0 stars, no DB save
      setIsCelebrationOpen(false);
    }
  }, []);

  // Regular Song Completion Handler: Stale-closure immune, zero-wait optimistic feedback
  const handleSongComplete = useCallback(() => {
    worldTourAudio.stop();
    setIsPlaying(false);
    setIsRequestingMic(false);
    setActiveNoteIdx(-1);
    setCountInInfo(null);
    setLiveIntonation(null);

    const activeMode = playModeRef.current;

    if (activeMode === 'challenge') {
      const totalNotes = transposed.notes.filter(n => n.pitch !== 'REST').length;
      const currentHits = noteHitsRef.current;
      const recordedHits = Object.values(currentHits).filter(h => h === 'hit').length;
      const recordedNear = Object.values(currentHits).filter(h => h === 'near').length;
      const recordedMiss = Math.max(0, totalNotes - recordedHits - recordedNear);

      // Honest Pedagogical Scoring (No fake fallback):
      // Full Hits = 100%, Near Hits = 60%
      const effectivePoints = (recordedHits * 1.0) + (recordedNear * 0.6);
      const calculatedPercent = totalNotes > 0
        ? Math.min(100, Math.round((effectivePoints / totalNotes) * 100))
        : 0;

      // 0,1% VdM-Norm: 90%+ = 3 Sterne (Meisterklasse), 75%+ = 2 Sterne (Gut/Sicher), 60%+ = 1 Stern (Bestanden)
      const stars = calculatedPercent >= 90 ? 3 : calculatedPercent >= 75 ? 2 : calculatedPercent >= 60 ? 1 : 0;
      const initialXp = stars === 3 ? 150 : stars === 2 ? 100 : stars === 1 ? 50 : 0;

      // 1. Sofortiges optimistisches UI-Feedback (0ms Latenz)
      setChallengeResult({ scorePercent: calculatedPercent, stars });
      setIsAborted(false);
      setCelebrationDetails({
        hitCount: recordedHits,
        nearCount: recordedNear,
        missCount: recordedMiss,
        xpAwarded: initialXp
      });
      setIsCelebrationOpen(true);

      // 2. Akustischer Triumph-Chime via WebAudio & globales XP-Event
      if (stars >= 1) {
        playTriumphantXpChime();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('campus-xp-awarded', {
              detail: {
                studentId,
                amount: initialXp,
                reason: `World Tour Challenge: ${country.name}`
              }
            })
          );
        }
      }

      if (onMasteryAchieved) {
        onMasteryAchieved(stars, calculatedPercent, initialXp);
      }

      // 3. Asynchrone persistente Speicherung im Hintergrund (Zero-Wait)
      WorldTourService.saveCountryMastery(
        country.code,
        stars,
        calculatedPercent,
        tempo,
        studentInstrument || undefined,
        studentId
      ).then(saveRes => {
        if (saveRes.xpAwarded !== undefined && saveRes.xpAwarded !== initialXp) {
          setCelebrationDetails(prev => ({
            ...prev,
            xpAwarded: saveRes.xpAwarded
          }));
        }
      }).catch(err => {
        console.warn('Background mastery save deferred or offline:', err);
      });
    } else if (activeMode === 'practice') {
      // Positives Feedback im Mitspiel-Modus
      setPracticeCompletedToast(`🎉 Klasse mitgespielt! Du hast ${country.name} komplett durchgespielt. Bereit für die 3. Challenge?`);
    } else if (activeMode === 'listen') {
      setPracticeCompletedToast(`🎵 Lied zu Ende gehört! Jetzt bist du dran: Klicke auf "2. Mitspielen"!`);
    }
  }, [transposed.notes, country.code, country.name, tempo, studentInstrument, studentId, onMasteryAchieved]);

  const handleStartPlayback = useCallback(async (playMode: 'listen' | 'practice' | 'challenge') => {
    playModeRef.current = playMode;
    setMode(playMode);
    setNoteHits({});
    noteHitsRef.current = {};
    setChallengeResult(null);
    setIsAborted(false);
    setMicError(false);
    setPracticeCompletedToast(null);
    setLiveIntonation(null);
    setIsCelebrationOpen(false);

    if (playMode === 'challenge') {
      setIsRequestingMic(true);
    }

    try {
      const started = await worldTourAudio.startScore(
        transposed.notes,
        tempo,
        playMode,
        (noteIdx, currentBeat, totalBeats) => {
          if (noteIdx === -1 && currentBeat !== undefined && totalBeats !== undefined) {
            setCountInInfo({ currentBeat, totalBeats });
            setActiveNoteIdx(-1);
          } else {
            setCountInInfo(null);
            setActiveNoteIdx(noteIdx);
          }
        },
        playMode === 'challenge' ? handleNoteResult : undefined,
        () => {
          handleSongComplete();
        },
        {
          uiLevel,
          studentInstrument,
          timeSignature: country.score.timeSignature,
          anacrusisBeats: country.score.anacrusisBeats,
          repeatSections: country.score.repeatSections,
          metronomeEnabled: isMetronomeActive,
          metronomeVolume: 1.0,
          onMicError: () => {
            setMicError(true);
            setIsPlaying(false);
          }
        }
      );

      if (started) {
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
        if (playMode === 'challenge') {
          setMicError(true);
        }
      }
    } catch {
      setIsPlaying(false);
      if (playMode === 'challenge') {
        setMicError(true);
      }
    } finally {
      setIsRequestingMic(false);
    }
  }, [transposed.notes, tempo, handleNoteResult, handleSongComplete, uiLevel, studentInstrument, country.score.timeSignature, country.score.anacrusisBeats, country.score.repeatSections, isMetronomeActive]);

  const handleRetryMic = useCallback(async () => {
    setMicError(false);
    if (isPlaying) {
      const success = await worldTourAudio.retryMicrophone();
      if (!success) {
        setMicError(true);
      }
    } else {
      handleStartPlayback('challenge');
    }
  }, [isPlaying, handleStartPlayback]);

  // Touch & Manual Tap Handler for Tablet / Screen / Keyboard accessibility
  const handleManualHit = useCallback((noteIndex?: number) => {
    if (!isPlaying || mode !== 'challenge') return;
    const targetIdx = noteIndex !== undefined ? noteIndex : activeNoteIdx;
    if (targetIdx >= 0) {
      worldTourAudio.registerManualHit(targetIdx);
      noteHitsRef.current[targetIdx] = 'hit';
      setLiveIntonation({
        status: 'hit',
        pitch: transposed.notes[targetIdx]?.pitch || '',
        centsDiff: 0
      });
      setNoteHits(prev => {
        if (prev[targetIdx] === 'hit') return prev;
        return {
          ...prev,
          [targetIdx]: 'hit'
        };
      });
    }
  }, [isPlaying, mode, activeNoteIdx, transposed.notes]);

  // Keyboard Spacebar listener as fallback / manual tap during Challenge, 'M' to toggle metronome
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (e.code === 'Space' && isPlaying && mode === 'challenge') {
        e.preventDefault();
        handleManualHit();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMetronome();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, mode, handleManualHit, handleToggleMetronome]);

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      paddingBottom: 'calc(var(--bottom-bar-height, 68px) + env(safe-area-inset-bottom) + 32px)'
    }}>
      {/* 🎛️ Zeile 2: Integrierte Studio-Dirigentenkonsole (46px, Zero Waste) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '8px 16px',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        position: 'sticky',
        top: '56px',
        zIndex: 25
      }}>
        {/* Links: Segmented Playback & Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isPlaying ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleManualStop}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '10px',
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)',
                  touchAction: 'manipulation',
                  minHeight: '44px'
                }}
              >
                <Square size={15} fill="#ffffff" />
                <span>Stopp</span>
              </button>

              {/* Dynamic Animated Count-in Beat Badges / Status Indicator */}
              {countInInfo ? (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '10px',
                  background: '#e0f2fe',
                  border: '1px solid #bae6fd'
                }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0369a1', marginRight: '2px' }}>
                    Einzählen:
                  </span>
                  {Array.from({ length: countInInfo.totalBeats }, (_, i) => i + 1).map((b) => {
                    const isCurrent = b === countInInfo.currentBeat;
                    const isPast = b < countInInfo.currentBeat;
                    return (
                      <div
                        key={b}
                        style={{
                          width: isCurrent ? '28px' : '22px',
                          height: isCurrent ? '28px' : '22px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: isCurrent ? '0.90rem' : '0.74rem',
                          background: isCurrent
                            ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                            : isPast
                            ? '#38bdf8'
                            : '#ffffff',
                          color: isCurrent || isPast ? '#ffffff' : '#94a3b8',
                          boxShadow: isCurrent ? '0 0 0 3px rgba(2, 132, 199, 0.35)' : 'none',
                          transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                      >
                        {b}
                      </div>
                    );
                  })}
                </div>
              ) : mode === 'challenge' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* 🎯 2027 Live Intonation HUD Pill */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.80rem',
                      fontWeight: 850,
                      padding: '5px 12px',
                      borderRadius: '10px',
                      background: liveIntonation?.status === 'hit'
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : liveIntonation?.status === 'near'
                        ? '#fef3c7'
                        : liveIntonation?.status === 'miss'
                        ? '#fee2e2'
                        : '#fef3c7',
                      color: liveIntonation?.status === 'hit'
                        ? '#ffffff'
                        : liveIntonation?.status === 'near'
                        ? '#a16207'
                        : liveIntonation?.status === 'miss'
                        ? '#b91c1c'
                        : '#b45309',
                      border: liveIntonation?.status === 'hit'
                        ? 'none'
                        : `1.5px solid ${
                            liveIntonation?.status === 'near'
                              ? '#fde047'
                              : liveIntonation?.status === 'miss'
                              ? '#fca5a5'
                              : '#fcd34d'
                          }`,
                      boxShadow: liveIntonation?.status === 'hit'
                        ? '0 2px 8px rgba(16, 185, 129, 0.28)'
                        : '0 2px 6px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {liveIntonation?.status === 'hit' ? (
                      <>
                        <span>🎯</span>
                        <span>
                          Perfekt {liveIntonation.centsDiff !== undefined
                            ? (liveIntonation.centsDiff >= 0
                              ? `(+${Math.round(liveIntonation.centsDiff)}ct)`
                              : `(${Math.round(liveIntonation.centsDiff)}ct)`)
                            : ''}
                        </span>
                      </>
                    ) : liveIntonation?.status === 'near' ? (
                      <>
                        <span>{liveIntonation.centsDiff && liveIntonation.centsDiff > 0 ? '▲' : '▼'}</span>
                        <span>
                          {liveIntonation.centsDiff && liveIntonation.centsDiff > 0
                            ? `Zu hoch (+${Math.round(liveIntonation.centsDiff)}ct)`
                            : `Zu tief (${Math.round(liveIntonation.centsDiff || 0)}ct)`}
                        </span>
                      </>
                    ) : liveIntonation?.status === 'miss' ? (
                      <>
                        <span>✖</span>
                        <span>Verpasst</span>
                      </>
                    ) : (
                      <>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#f59e0b',
                            animation: 'pulse 1.5s infinite'
                          }}
                        />
                        <span>Höre zu...</span>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => handleManualHit()}
                    aria-label="Ton treffen (Tippen oder Leertaste)"
                    title="Treffer manuell registrieren (Touch / Leertaste)"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 850,
                      fontSize: '0.80rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                      touchAction: 'manipulation',
                      minHeight: '44px'
                    }}
                  >
                    <span>🎯 Treffer (Tippen)</span>
                  </button>
                </div>
              ) : (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  padding: '5px 10px',
                  borderRadius: '8px',
                  background: '#e0f2fe',
                  color: '#0284c7'
                }}>
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#0284c7',
                    animation: 'pulse 1.5s infinite'
                  }} />
                  {mode === 'listen' ? 'Hören...' : 'Mitspielen...'}
                </span>
              )}
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {/* 1. Hören */}
              <button
                onClick={() => handleStartPlayback('listen')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  minHeight: '44px'
                }}
              >
                <Headphones size={15} />
                <span>1. Hören</span>
              </button>

              {/* 2. Mitspielen */}
              <button
                onClick={() => handleStartPlayback('practice')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  color: '#0284c7',
                  border: '1px solid #bae6fd',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  minHeight: '44px'
                }}
              >
                <Play size={15} />
                <span>2. Mitspielen</span>
              </button>

              {/* 3. Challenge / Konzert */}
              <button
                onClick={() => handleStartPlayback('challenge')}
                disabled={isRequestingMic}
                aria-label={isRequestingMic ? 'Mikrofon freigeben...' : '3. Challenge starten'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '10px',
                  background: isRequestingMic
                    ? '#0284c7'
                    : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: isRequestingMic ? 'wait' : 'pointer',
                  boxShadow: '0 2px 10px rgba(2, 132, 199, 0.3)',
                  touchAction: 'manipulation',
                  minHeight: '44px',
                  opacity: isRequestingMic ? 0.8 : 1
                }}
              >
                <Mic size={15} />
                <span>{isRequestingMic ? 'Mikrofon freigeben...' : '3. Challenge'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Mitte: Partitur-Info & Tonika-Bordun */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: '0.80rem',
            fontWeight: 800,
            color: '#334155'
          }}>
            <span>{transposed.displayName}</span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span>{country.score.tonalCenter}</span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span>{country.score.timeSignature}</span>
          </div>

          <button
            onClick={handleToggleDrone}
            aria-label={isDroneActive ? 'Bordun ausschalten' : 'Bordun einschalten'}
            title="Grundton-Bordun für Intonationskontrolle"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '10px',
              background: isDroneActive ? '#fef3c7' : '#f8fafc',
              border: `1px solid ${isDroneActive ? '#f59e0b' : '#cbd5e1'}`,
              color: isDroneActive ? '#b45309' : '#475569',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              touchAction: 'manipulation',
              minHeight: '44px'
            }}
          >
            <Radio size={14} color={isDroneActive ? '#d97706' : '#64748b'} />
            <span>Bordun {isDroneActive ? 'AN' : 'AUS'}</span>
          </button>

          {/* ⏱️ Metronom-Klick AN/AUS */}
          <button
            onClick={handleToggleMetronome}
            aria-label={isMetronomeActive ? 'Metronom ausschalten (Taste M)' : 'Metronom einschalten (Taste M)'}
            title="Metronom-Klick AN/AUS (Taste M)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '10px',
              background: isMetronomeActive ? '#ecfdf5' : '#f8fafc',
              border: `1.5px solid ${isMetronomeActive ? '#10b981' : '#cbd5e1'}`,
              color: isMetronomeActive ? '#059669' : '#475569',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              touchAction: 'manipulation',
              minHeight: '44px'
            }}
          >
            <Timer size={14} color={isMetronomeActive ? '#059669' : '#64748b'} />
            <span>Metronom {isMetronomeActive ? 'AN' : 'AUS'}</span>
          </button>

          {/* 🎸/🎻 Saiten-Tabs / Griffschrift Umschalter (Exklusiv für Zupfer & Streicher) */}
          {isTablatureEligible(studentInstrument) && (
            <button
              onClick={handleToggleTabs}
              aria-label={showTabs ? 'Tabs ausblenden (Nur Noten)' : 'Tabs einblenden (Noten + Tabs)'}
              title="Zwischen 'Nur Noten' und 'Noten + Tabs' umschalten"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '10px',
                background: showTabs ? '#fef3c7' : '#f8fafc',
                border: `1px solid ${showTabs ? '#f59e0b' : '#cbd5e1'}`,
                color: showTabs ? '#b45309' : '#475569',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                touchAction: 'manipulation',
                minHeight: '44px'
              }}
            >
              <Sparkles size={14} color={showTabs ? '#d97706' : '#64748b'} />
              <span>Tabs {showTabs ? 'AN' : 'AUS'}</span>
            </button>
          )}
        </div>

        {/* Rechts: Kompakte Tempo-Steuerung (BPM) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setTempo(prev => Math.max(40, prev - 5))}
            disabled={isPlaying}
            aria-label="5 BPM langsamer"
            title="-5 BPM"
            style={{
              padding: '5px 9px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#475569',
              cursor: isPlaying ? 'not-allowed' : 'pointer',
              minHeight: '36px'
            }}
          >
            -5
          </button>

          <span style={{
            fontSize: '0.84rem',
            fontWeight: 900,
            color: '#0f172a',
            minWidth: '58px',
            textAlign: 'center',
            fontVariantNumeric: 'tabular-nums'
          }}>
            ♩ = {tempo}
          </span>

          <button
            onClick={() => setTempo(prev => Math.min(180, prev + 5))}
            disabled={isPlaying}
            aria-label="5 BPM schneller"
            title="+5 BPM"
            style={{
              padding: '5px 9px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#475569',
              cursor: isPlaying ? 'not-allowed' : 'pointer',
              minHeight: '36px'
            }}
          >
            +5
          </button>

          <button
            onClick={() => setTempo(country.score.defaultBpm)}
            disabled={isPlaying || tempo === country.score.defaultBpm}
            aria-label="Tempo auf Standard zurücksetzen"
            title="Auf Originaltempo zurücksetzen"
            style={{
              padding: '6px 8px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              cursor: tempo === country.score.defaultBpm ? 'default' : 'pointer',
              opacity: tempo === country.score.defaultBpm ? 0.4 : 1,
              minHeight: '36px'
            }}
          >
            <RotateCcw size={14} color="#475569" />
          </button>
        </div>
      </div>

      {/* ⚠️ Mikrofon-Fehler-Banner */}
      {micError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '14px',
            background: '#fff1f2',
            border: '1.5px solid #fecdd3',
            color: '#9f1239'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} color="#e11d48" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>
                Mikrofon-Zugriff nicht verfügbar oder verweigert
              </div>
              <div style={{ fontSize: '0.76rem', color: '#be123c', marginTop: '2px' }}>
                Erlaube den Mikrofon-Zugriff im Browser oder spiele mit der Leertaste im manuellen Modus mit.
              </div>
            </div>
          </div>
          <button
            onClick={handleRetryMic}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#e11d48',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              touchAction: 'manipulation'
            }}
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* 🛑 Challenge Abgebrochen Banner */}
      {isAborted && !isPlaying && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 18px',
          borderRadius: '14px',
          background: '#f8fafc',
          border: '1.5px solid #cbd5e1',
          color: '#475569'
        }}>
          <AlertCircle size={18} color="#64748b" />
          <div style={{ fontSize: '0.84rem', fontWeight: 750 }}>
            Challenge abgebrochen — Es wurden keine Sterne oder Punkte gespeichert.
          </div>
        </div>
      )}

      {/* 💡 Didaktischer Zwischen-Toast (Anhören / Übemodus abgeschlossen) */}
      {practiceCompletedToast && !isPlaying && !challengeResult && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '14px',
            background: mode === 'practice' ? '#ecfdf5' : '#eff6ff',
            border: `1.5px solid ${mode === 'practice' ? '#10b981' : '#bfdbfe'}`,
            color: mode === 'practice' ? '#065f46' : '#1e40af',
            animation: 'fade-in 0.25s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={18} color={mode === 'practice' ? '#10b981' : '#2563eb'} />
            <div style={{ fontWeight: 800, fontSize: '0.84rem' }}>
              {practiceCompletedToast}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {mode === 'listen' ? (
              <button
                onClick={() => handleStartPlayback('practice')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
              >
                🎷 2. Mitspielen starten
              </button>
            ) : mode === 'practice' ? (
              <button
                onClick={() => handleStartPlayback('challenge')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
              >
                🎯 3. Challenge wagen
              </button>
            ) : null}

            <button
              onClick={() => setPracticeCompletedToast(null)}
              aria-label="Hinweis schließen"
              style={{
                background: 'transparent',
                border: 'none',
                color: mode === 'practice' ? '#166534' : '#1e40af',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 🏆 3. Challenge Feedback Banner nach regulärem Abschluss */}
      {challengeResult && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '14px 18px',
          borderRadius: '16px',
          background: challengeResult.stars >= 2 ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)' : '#fffbeb',
          border: `2px solid ${challengeResult.stars >= 2 ? '#22c55e' : challengeResult.stars === 1 ? '#f59e0b' : '#cbd5e1'}`,
          boxShadow: '0 4px 14px -2px rgba(34, 197, 94, 0.20)',
          animation: 'fade-in 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: challengeResult.stars >= 2 ? '#22c55e' : challengeResult.stars === 1 ? '#f59e0b' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Award size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#0f172a' }}>
                {challengeResult.stars >= 2
                  ? `Hervorragend gemeistert! (${challengeResult.scorePercent}% Trefferquote)`
                  : challengeResult.stars === 1
                  ? `Guter Versuch! (${challengeResult.scorePercent}% Trefferquote)`
                  : `Weiter üben! (${challengeResult.scorePercent}% Trefferquote)`}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '2px' }}>
                {challengeResult.stars >= 1
                  ? `Reisepass-Stempel für ${country.name} freigeschaltet • +${challengeResult.stars * 50} XP`
                  : 'Versuche es noch einmal im Übemodus, um deinen Reisepass-Stempel zu verdienen!'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsCelebrationOpen(true)}
              aria-label="Reisepass-Stempel und Details ansehen"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#334155',
                cursor: 'pointer',
                touchAction: 'manipulation'
              }}
              className="hover-scale"
            >
              <span>Reisepass-Stempel</span>
            </button>

            <button
              onClick={() => handleStartPlayback('challenge')}
              aria-label="Challenge noch einmal spielen"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '10px',
                background: '#0284c7',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#ffffff',
                cursor: 'pointer',
                touchAction: 'manipulation'
              }}
              className="hover-scale"
            >
              <RotateCcw size={13} />
              <span>Noch einmal</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {[1, 2, 3].map(s => (
                <span
                  key={s}
                  style={{
                    fontSize: '1.45rem',
                    filter: s <= challengeResult.stars ? 'drop-shadow(0 2px 6px rgba(234, 179, 8, 0.5))' : 'grayscale(1)',
                    opacity: s <= challengeResult.stars ? 1 : 0.25
                  }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 📜 4. ECHTES NOTENBILD (SVG VECTOR ENGINE MIT 3-TIER-UNTERSTÜTZUNG) */}
      <WorldTourStaffNotation
        score={country.score}
        transposed={transposed}
        activeNoteIdx={activeNoteIdx}
        noteHits={noteHits}
        studentInstrument={studentInstrument}
        mode={mode}
        uiLevel={uiLevel}
        onNoteTap={handleManualHit}
      />

      {/* 📚 5. Urtext-Zertifizierung & Dual-Source-Nachweis */}
      {country.sources && country.sources.length >= 2 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 18px',
          background: '#f8fafc',
          borderRadius: '14px',
          border: '1.5px solid #e2e8f0',
          fontSize: '0.76rem',
          color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>🏛️ Wissenschaftlicher Urtext-Nachweis:</span>
            <span>1. {country.sources[0]} • 2. {country.sources[1]}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: 800 }}>
            <span>✓ 100 % Gemeinfreies Kulturgut</span>
          </div>
        </div>
      )}

      {/* 🏆 World Tour 2027 Celebratory Modal */}
      {challengeResult && (
        <WorldTourCelebrationModal
          isOpen={isCelebrationOpen}
          onClose={() => setIsCelebrationOpen(false)}
          country={country}
          stars={challengeResult.stars}
          scorePercent={challengeResult.scorePercent}
          hitCount={celebrationDetails.hitCount}
          nearCount={celebrationDetails.nearCount}
          missCount={celebrationDetails.missCount}
          xpAwarded={celebrationDetails.xpAwarded}
          onRetry={() => {
            setIsCelebrationOpen(false);
            handleStartPlayback('challenge');
          }}
          onAnalyzeScore={() => {
            setIsCelebrationOpen(false);
          }}
          onBackToMap={onBackToMap}
        />
      )}
    </div>
  );
};
