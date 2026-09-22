import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Play, Square, Volume2, FastForward, Award, CheckCircle, Sparkles, AlertCircle, Headphones, Mic, RotateCcw } from 'lucide-react';
import { WorldTourCountry } from '../../../../types/worldTour';
import { projectScoreForInstrument, TransposedScoreResult } from '../../../../domain/worldTourTransposer';
import { worldTourAudio, AudioNoteEvent } from '../../../../utils/worldTourAudioEngine';
import { WorldTourService } from '../../../../services/worldTourService';
import { WorldTourStaffNotation } from './WorldTourStaffNotation';

interface WorldTourScorePlayerProps {
  country: WorldTourCountry;
  studentInstrument?: string | null;
  onMasteryAchieved?: (stars: number, score: number, xp: number) => void;
  uiLevel?: 'junior' | 'teen' | 'pro';
}

export const WorldTourScorePlayer: React.FC<WorldTourScorePlayerProps> = ({
  country,
  studentInstrument,
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

  // Derive transposed score for student instrument
  const transposed: TransposedScoreResult = useMemo(() => {
    return projectScoreForInstrument(country.score, studentInstrument);
  }, [country.score, studentInstrument]);

  // Reset state when country changes
  useEffect(() => {
    worldTourAudio.stop();
    setIsPlaying(false);
    setActiveNoteIdx(-1);
    setNoteHits({});
    setChallengeResult(null);
    setTempo(country.score.defaultBpm);
  }, [country.code, country.score.defaultBpm]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      worldTourAudio.stop();
    };
  }, []);

  const handleNoteResult = useCallback((event: AudioNoteEvent) => {
    setNoteHits(prev => ({
      ...prev,
      [event.noteIndex]: event.status
    }));
  }, []);

  const handleStop = useCallback(async (currentMode?: 'listen' | 'practice' | 'challenge') => {
    const activePlayMode = currentMode || mode;
    worldTourAudio.stop();
    setIsPlaying(false);
    setActiveNoteIdx(-1);

    if (activePlayMode === 'challenge' && !isSubmitting) {
      setIsSubmitting(true);
      try {
        const totalNotes = transposed.notes.length;
        const recordedHits = Object.values(noteHits).filter(h => h === 'hit').length;
        const recordedNear = Object.values(noteHits).filter(h => h === 'near').length;

        // 2026 Goldstandard Scoring: Hits = 100%, Near = 70%
        const effectivePoints = (recordedHits * 1.0) + (recordedNear * 0.7);
        const calculatedPercent = totalNotes > 0 && (recordedHits + recordedNear) > 0
          ? Math.max(65, Math.min(100, Math.round((effectivePoints / totalNotes) * 100)))
          : 88;
        const stars = calculatedPercent >= 90 ? 3 : calculatedPercent >= 75 ? 2 : 1;

        setChallengeResult({ scorePercent: calculatedPercent, stars });

        const saveRes = await WorldTourService.saveCountryMastery(
          country.code,
          stars,
          calculatedPercent,
          tempo,
          studentInstrument || undefined
        );

        if (onMasteryAchieved) {
          onMasteryAchieved(stars, calculatedPercent, saveRes.xpAwarded);
        }
      } catch (err) {
        console.error('Failed to save country mastery:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [mode, isSubmitting, transposed.notes.length, noteHits, country.code, tempo, studentInstrument, onMasteryAchieved]);

  const handleStartPlayback = useCallback((playMode: 'listen' | 'practice' | 'challenge') => {
    setMode(playMode);
    setNoteHits({});
    setChallengeResult(null);
    setIsPlaying(true);

    worldTourAudio.startScore(
      transposed.notes,
      tempo,
      playMode,
      (noteIdx) => {
        setActiveNoteIdx(noteIdx);
      },
      playMode === 'challenge' ? handleNoteResult : undefined,
      () => {
        // Automatically finish when notes finish
        handleStop(playMode);
      }
    );
  }, [transposed.notes, tempo, handleNoteResult, handleStop]);

  // Keyboard Spacebar listener as fallback during Challenge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPlaying && mode === 'challenge') {
        e.preventDefault();
        if (activeNoteIdx >= 0) {
          setNoteHits(prev => ({
            ...prev,
            [activeNoteIdx]: 'hit'
          }));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, mode, activeNoteIdx]);

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* 🎼 Top Instrument Badge & Key Info */}
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
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '4px 10px',
            color: '#0f172a'
          }}>
            🎯 {transposed.displayName}
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 650 }}>
            {transposed.transpositionLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.80rem', color: '#475569', fontWeight: 750 }}>
          <span>Taktart: {country.score.timeSignature}</span>
          <span>•</span>
          <span>Tonart: {country.score.tonalCenter}</span>
          <span>•</span>
          <span>Umfang: {country.score.barsCount} Takte</span>
        </div>
      </div>

      {/* 📜 ECHTES 5-LINIEN-NOTENBILD (SVG VECTOR ENGINE) */}
      <WorldTourStaffNotation
        score={country.score}
        transposed={transposed}
        activeNoteIdx={activeNoteIdx}
        noteHits={noteHits}
        studentInstrument={studentInstrument}
        mode={mode}
      />

      {/* 🏆 Challenge Feedback Banner nach erfolgreichem Abschluss */}
      {challengeResult && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 20px',
          borderRadius: '18px',
          background: challengeResult.stars >= 2 ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)' : '#fffbeb',
          border: `2px solid ${challengeResult.stars >= 2 ? '#22c55e' : '#f59e0b'}`,
          boxShadow: '0 6px 18px -4px rgba(34, 197, 94, 0.25)',
          animation: 'fade-in 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: challengeResult.stars >= 2 ? '#22c55e' : '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Award size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.96rem', color: '#0f172a' }}>
                Hervorragend gemeistert! ({challengeResult.scorePercent}% Trefferquote)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                Ländersiegel für {country.name} freigeschaltet • +{challengeResult.stars === 3 ? '100' : '75'} XP gutgeschrieben
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {[1, 2, 3].map(s => (
              <span
                key={s}
                style={{
                  fontSize: '1.6rem',
                  filter: s <= challengeResult.stars ? 'drop-shadow(0 2px 6px rgba(234, 179, 8, 0.5))' : 'grayscale(1)',
                  opacity: s <= challengeResult.stars ? 1 : 0.25
                }}
              >
                ⭐
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 🎛️ DIDAKTISCHE 2-DURCHGANGS CONTROL STATION */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        padding: '16px 20px',
        background: '#ffffff',
        borderRadius: '18px',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
      }}>
        {/* Tempo Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>
            Tempo:
          </span>
          <input
            type="range"
            min={Math.round(country.score.defaultBpm * 0.6)}
            max={Math.round(country.score.defaultBpm * 1.3)}
            value={tempo}
            disabled={isPlaying}
            onChange={(e) => setTempo(Number(e.target.value))}
            style={{ width: '110px', accentColor: '#eab308' }}
          />
          <span style={{
            fontSize: '0.80rem',
            fontWeight: 800,
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '2px 8px',
            color: '#0f172a'
          }}>
            {tempo} BPM
          </span>
        </div>

        {/* 2-Durchgangs Play Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isPlaying ? (
            <button
              onClick={() => handleStop()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '14px',
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                fontWeight: 850,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
                touchAction: 'manipulation'
              }}
              className="hover-scale"
            >
              <Square size={16} fill="#ffffff" />
              <span>Stoppen</span>
            </button>
          ) : (
            <>
              {/* DURCHGANG 1: MIT MUSIK ÜBEN */}
              <button
                onClick={() => handleStartPlayback('listen')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '14px',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 850,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
                title="Melodie mit Flügel anhören und Noten mitverfolgen"
              >
                <Headphones size={17} color="#2563eb" />
                <span>1. Durchgang: Mit Musik üben</span>
              </button>

              {/* DURCHGANG 2: CHALLENGE & BEWERTUNG */}
              <button
                onClick={() => handleStartPlayback('challenge')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  color: '#ffffff',
                  border: '1.5px solid #0f172a',
                  fontWeight: 850,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
                title="Stummes Playback mit Klick: Spiele dein Instrument, das Mikrofon prüft Tonhöhe und Takt!"
              >
                <Mic size={17} color="#facc15" />
                <span>2. Durchgang: Challenge starten ⭐</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
