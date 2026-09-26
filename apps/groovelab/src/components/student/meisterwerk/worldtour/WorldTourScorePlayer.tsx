import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, Square, Headphones, Mic, RotateCcw, Radio, Award, AlertCircle } from 'lucide-react';
import { WorldTourCountry } from '../../../../types/worldTour';
import { projectScoreForInstrument, TransposedScoreResult } from '../../../../domain/worldTourTransposer';
import { worldTourAudio, AudioNoteEvent } from '../../../../utils/worldTourAudioEngine';
import { WorldTourService } from '../../../../services/worldTourService';
import { WorldTourStaffNotation } from './WorldTourStaffNotation';

interface WorldTourScorePlayerProps {
  country: WorldTourCountry;
  studentInstrument?: string | null;
  studentId?: string;
  onMasteryAchieved?: (stars: number, score: number, xp: number) => void;
  uiLevel?: 'junior' | 'teen' | 'pro';
}

export const WorldTourScorePlayer: React.FC<WorldTourScorePlayerProps> = ({
  country,
  studentInstrument,
  studentId,
  onMasteryAchieved,
  uiLevel = 'teen'
}) => {
  const [mode, setMode] = useState<'listen' | 'practice' | 'challenge'>('listen');
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNoteIdx, setActiveNoteIdx] = useState<number>(-1);
  const [noteHits, setNoteHits] = useState<Record<number, 'pending' | 'hit' | 'near' | 'miss'>>({});
  const [tempo, setTempo] = useState<number>(country.score.defaultBpm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [challengeResult, setChallengeResult] = useState<{ scorePercent: number; stars: number } | null>(null);
  const [isDroneActive, setIsDroneActive] = useState(false);
  const [countInInfo, setCountInInfo] = useState<{ currentBeat: number; totalBeats: number } | null>(null);
  const [isAborted, setIsAborted] = useState(false);
  const [micError, setMicError] = useState(false);

  // Ref to eliminate closure staleness during async completion
  const noteHitsRef = useRef<Record<number, 'pending' | 'hit' | 'near' | 'miss'>>({});

  // Derive transposed score for student instrument
  const transposed: TransposedScoreResult = useMemo(() => {
    return projectScoreForInstrument(country.score, studentInstrument);
  }, [country.score, studentInstrument]);

  // Reset state when country changes
  useEffect(() => {
    worldTourAudio.stop();
    worldTourAudio.toggleDrone('C3', false);
    setIsDroneActive(false);
    setIsPlaying(false);
    setActiveNoteIdx(-1);
    setCountInInfo(null);
    setNoteHits({});
    noteHitsRef.current = {};
    setChallengeResult(null);
    setIsAborted(false);
    setMicError(false);
    setTempo(country.score.defaultBpm);
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

  // Render throttling: only trigger re-render if note hit status actually changed
  const handleNoteResult = useCallback((event: AudioNoteEvent) => {
    noteHitsRef.current[event.noteIndex] = event.status;
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
    setActiveNoteIdx(-1);
    setCountInInfo(null);

    if (mode === 'challenge') {
      setIsAborted(true);
      setChallengeResult(null); // Aborted: 0 stars, no DB save
    }
  }, [mode]);

  // Regular Song Completion Handler: Only saves to DB and awards stars when song was completely played
  const handleSongComplete = useCallback(async () => {
    worldTourAudio.stop();
    setIsPlaying(false);
    setActiveNoteIdx(-1);
    setCountInInfo(null);

    if (mode === 'challenge' && !isSubmitting) {
      setIsSubmitting(true);
      try {
        const totalNotes = transposed.notes.filter(n => n.pitch !== 'REST').length;
        const currentHits = noteHitsRef.current;
        const recordedHits = Object.values(currentHits).filter(h => h === 'hit').length;
        const recordedNear = Object.values(currentHits).filter(h => h === 'near').length;

        // Honest Pedagogical Scoring (No fake fallback):
        // Full Hits = 100%, Near Hits = 60%
        const effectivePoints = (recordedHits * 1.0) + (recordedNear * 0.6);
        const calculatedPercent = totalNotes > 0
          ? Math.min(100, Math.round((effectivePoints / totalNotes) * 100))
          : 0;

        // Honest Stars: 90%+ = 3 Sterne, 75%+ = 2 Sterne, 50%+ = 1 Stern
        const stars = calculatedPercent >= 90 ? 3 : calculatedPercent >= 75 ? 2 : calculatedPercent >= 50 ? 1 : 0;

        setChallengeResult({ scorePercent: calculatedPercent, stars });
        setIsAborted(false);

        const saveRes = await WorldTourService.saveCountryMastery(
          country.code,
          stars,
          calculatedPercent,
          tempo,
          studentInstrument || undefined,
          studentId
        );

        if (onMasteryAchieved) {
          onMasteryAchieved(stars, calculatedPercent, saveRes.xpAwarded);
        }
      } catch (err) {
        console.error('Failed to save country mastery on completion:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [mode, isSubmitting, transposed.notes, country.code, tempo, studentInstrument, studentId, onMasteryAchieved]);

  const handleStartPlayback = useCallback((playMode: 'listen' | 'practice' | 'challenge') => {
    setMode(playMode);
    setNoteHits({});
    noteHitsRef.current = {};
    setChallengeResult(null);
    setIsAborted(false);
    setMicError(false);
    setIsPlaying(true);

    worldTourAudio.startScore(
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
        onMicError: () => {
          setMicError(true);
        }
      }
    );
  }, [transposed.notes, tempo, handleNoteResult, handleSongComplete, uiLevel, studentInstrument, country.score.timeSignature, country.score.anacrusisBeats]);

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
      setNoteHits(prev => {
        if (prev[targetIdx] === 'hit') return prev;
        return {
          ...prev,
          [targetIdx]: 'hit'
        };
      });
    }
  }, [isPlaying, mode, activeNoteIdx]);

  // Keyboard Spacebar listener as fallback / manual tap during Challenge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPlaying && mode === 'challenge') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
        e.preventDefault();
        handleManualHit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, mode, handleManualHit]);

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* 🎼 1. Swiss-Style Partitur-Kopf (Einziger autoritativer Header) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '12px 18px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '0.84rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            border: 'none',
            borderRadius: '10px',
            padding: '5px 12px',
            color: '#ffffff',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
          }}>
            {transposed.displayName}
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 650 }}>
            {transposed.transpositionLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.80rem', color: '#475569', fontWeight: 750 }}>
          <span>Tonart: <strong style={{ color: '#0f172a' }}>{country.score.tonalCenter}</strong></span>
          <span>•</span>
          <span>Taktart: <strong style={{ color: '#0f172a' }}>{country.score.timeSignature}</strong></span>
          <span>•</span>
          <span>Umfang: {country.score.barsCount} Takte</span>

          {/* Tonika-Bordun (Drone) Toggle Button */}
          <button
            onClick={handleToggleDrone}
            aria-label="Grundton-Bordun umschalten"
            title="Schaltet einen warmen Tonika-Bordun im Hintergrund ein"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '8px',
              border: `1.5px solid ${isDroneActive ? '#0284c7' : '#cbd5e1'}`,
              background: isDroneActive ? '#e0f2fe' : '#f8fafc',
              color: isDroneActive ? '#0284c7' : '#64748b',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              touchAction: 'manipulation'
            }}
          >
            <Radio size={13} color={isDroneActive ? '#0284c7' : '#94a3b8'} />
            <span>Bordun {isDroneActive ? 'AN' : 'AUS'}</span>
          </button>
        </div>
      </div>

      {/* 🎛️ 2. Zero-Scroll Dirigentenpult: Master Studio Transport Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        padding: '14px 20px',
        background: '#ffffff',
        borderRadius: '18px',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Playback Trigger Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {isPlaying ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handleManualStop}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '12px',
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.90rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                  touchAction: 'manipulation'
                }}
              >
                <Square size={16} fill="#ffffff" />
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
                          width: isCurrent ? '30px' : '24px',
                          height: isCurrent ? '30px' : '24px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: isCurrent ? '0.96rem' : '0.76rem',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: '#fef3c7',
                    color: '#b45309'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#f59e0b',
                      animation: 'pulse 1.5s infinite'
                    }} />
                    Challenge aktiv!
                  </span>

                  <button
                    onClick={() => handleManualHit()}
                    aria-label="Ton treffen (Tippen oder Leertaste)"
                    title="Treffer manuell registrieren (Touch / Leertaste)"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 850,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                      touchAction: 'manipulation'
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
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#e0f2fe',
                  color: '#0284c7'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#0284c7',
                    animation: 'pulse 1.5s infinite'
                  }} />
                  {mode === 'listen' ? 'Hören & Audiieren...' : 'Mitspielen läuft...'}
                </span>
              )}
            </div>
          ) : (
            <>
              {/* 1. Hören */}
              <button
                onClick={() => handleStartPlayback('listen')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: '1.5px solid #cbd5e1',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  touchAction: 'manipulation'
                }}
              >
                <Headphones size={16} />
                <span>1. Hören</span>
              </button>

              {/* 2. Mitspielen */}
              <button
                onClick={() => handleStartPlayback('practice')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  color: '#0284c7',
                  border: '1.5px solid #bae6fd',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  touchAction: 'manipulation'
                }}
              >
                <Play size={16} />
                <span>2. Mitspielen</span>
              </button>

              {/* 3. Challenge / Konzert */}
              <button
                onClick={() => handleStartPlayback('challenge')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                  touchAction: 'manipulation'
                }}
              >
                <Mic size={16} />
                <span>3. Challenge</span>
              </button>
            </>
          )}
        </div>

        {/* Tempo Controller (BPM) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setTempo(prev => Math.max(40, prev - 5))}
            disabled={isPlaying}
            aria-label="5 BPM langsamer"
            title="-5 BPM"
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#475569',
              cursor: isPlaying ? 'not-allowed' : 'pointer'
            }}
          >
            -5
          </button>

          <input
            type="range"
            min={Math.max(40, country.score.defaultBpm - 40)}
            max={Math.min(180, country.score.defaultBpm + 40)}
            value={tempo}
            disabled={isPlaying}
            onChange={(e) => setTempo(parseInt(e.target.value, 10))}
            style={{ width: '90px', cursor: isPlaying ? 'not-allowed' : 'pointer' }}
          />

          <button
            onClick={() => setTempo(prev => Math.min(180, prev + 5))}
            disabled={isPlaying}
            aria-label="5 BPM schneller"
            title="+5 BPM"
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#475569',
              cursor: isPlaying ? 'not-allowed' : 'pointer'
            }}
          >
            +5
          </button>

          <span style={{
            fontSize: '0.84rem',
            fontWeight: 900,
            color: '#0f172a',
            minWidth: '55px',
            fontVariantNumeric: 'tabular-nums'
          }}>
            ♩ = {tempo}
          </span>

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
              opacity: tempo === country.score.defaultBpm ? 0.4 : 1
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {[1, 2, 3].map(s => (
              <span
                key={s}
                style={{
                  fontSize: '1.5rem',
                  filter: s <= challengeResult.stars ? 'drop-shadow(0 2px 6px rgba(234, 179, 8, 0.5))' : 'grayscale(1)',
                  opacity: s <= challengeResult.stars ? 1 : 0.25
                }}
              >
                ★
              </span>
            ))}
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
    </div>
  );
};
