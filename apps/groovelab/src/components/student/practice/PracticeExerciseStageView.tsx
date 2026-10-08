import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  BookOpen, Music, Headphones, Play, Pause, CheckCircle, Target,
  Flame, ShieldCheck, Sparkles, ChevronRight, FileText,
  RotateCcw, Trophy, Award, HelpCircle, Volume2
} from 'lucide-react';
import { CampusUiLevel } from '../../campus/CampusLevelSwitcher';
import {
  useAuthoritativeHomeworkPlan,
  AuthoritativeHomeworkPlan,
  UseAuthoritativeHomeworkPlanParams,
  AuthoritativeHomeworkBook,
  AuthoritativeHomeworkSong
} from '../hooks/useAuthoritativeHomeworkPlan';
import { useAuthoritativeHomeworkOptional } from '../context/AuthoritativeHomeworkContext';
import { isWeeklySnapshotContainer, formatConsecutivePageRanges } from '../tabs/briefing/homeworkSummaryHelper';
import { getSongColor } from '../studentDateUtils';
import { StudentHomeworkStatusButton } from '../homework/StudentHomeworkStatusButton';
import { MicroScoreSnippetButton } from '../meisterwerk/microscore/MicroScoreSnippetButton';

export interface PracticeExerciseStageViewProps extends UseAuthoritativeHomeworkPlanParams {
  studentId?: string | null;
  studentUser?: any;
  studentUiLevel?: CampusUiLevel;
  isMusicStandMode?: boolean;
  plan?: AuthoritativeHomeworkPlan;
  streak?: number;
  availableShields?: number;
  weekDays?: any[];
  onStartFocusSession?: (task?: { id: string; title: string }) => void;
  onOpenHomeworkBook?: (targetTab?: any, targetViewMode?: any) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 🏛️ 0,1% DeepMind Goldstandard: PracticeExerciseStageView
 * 
 * Asymmetrische Focus-Stage mit adaptivem Action-Stack (65:35 Grid auf Desktop,
 * zentrierte Single-Center-Column am Notenständer/Tablet, 1-Spalten-Stream auf Mobile).
 * 
 * Neurodidaktische Axiome (Sweller / Ericsson / Hattie):
 * 1. "Rule of One": Eine dominante Wochen-Challenge im visuellen Zentrum (Focus-Hero).
 * 2. Sound Before Sight: Direkter Lehrer-Audio-Referenzanker mit < 3s Abruf-Latenz.
 * 3. Deliberate Practice: Qualitativer "3x fehlerfrei hintereinander"-Counter statt Zeit-Absitzen.
 * 4. Metakognition: 3-Stufen Reflexions-Ampel (Klappt / Wackelig / Hilfe).
 * 5. Notenständer-Ergonomie: Aus 60-100 cm Distanz perfekt lesbar, 48px Touch-Targets.
 * 6. Rule 9: Zero Color-Clash Doktrin (Apple Tone-in-Tone, keine unharmonischen Kontur-Füllungen).
 */
export const PracticeExerciseStageView: React.FC<PracticeExerciseStageViewProps> = ({
  studentId,
  studentUser,
  studentUiLevel = 'pro',
  isMusicStandMode = false,
  plan: passedPlan,
  localProgress,
  lehrwerke,
  progressItems,
  activeSongSkills,
  assignedCampusSongs,
  streak = 0,
  availableShields = 3,
  weekDays = [],
  onStartFocusSession,
  onOpenHomeworkBook,
  className = '',
  style = {}
}) => {
  const contextPlan = useAuthoritativeHomeworkOptional();
  const internalPlan = useAuthoritativeHomeworkPlan({
    studentId,
    studentUser,
    localProgress,
    lehrwerke,
    progressItems,
    activeSongSkills,
    assignedCampusSongs
  });

  const plan = passedPlan || contextPlan || internalPlan;
  const {
    books,
    songs,
    generalNotes,
    audioTracks,
    microScores,
    studentQuestion,
    hasActiveHomework
  } = plan;

  const safeSongs = useMemo(() => {
    return (songs || []).filter((s: AuthoritativeHomeworkSong) =>
      !isWeeklySnapshotContainer(s.cleanTitle) &&
      !isWeeklySnapshotContainer(s.title) &&
      !isWeeklySnapshotContainer(s.artist)
    );
  }, [songs]);

  const effectiveHasActiveHomework = Boolean(
    hasActiveHomework && (books.length > 0 || safeSongs.length > 0 || generalNotes.length > 0 || (microScores && microScores.length > 0))
  );

  // 1. Identifikation der primären Haupt-Aufgabe (Focus-Hero)
  const primaryBook: AuthoritativeHomeworkBook | null = books.length > 0 ? books[0] : null;
  const primarySong: AuthoritativeHomeworkSong | null = (!primaryBook && safeSongs.length > 0) ? safeSongs[0] : null;
  const primaryMicroScore = microScores && microScores.length > 0 ? microScores[0] : null;

  const primaryTaskId = primaryBook
    ? `book-${primaryBook.title}`
    : primarySong
      ? `song-${primarySong.id || primarySong.cleanTitle}`
      : primaryMicroScore
        ? primaryMicroScore.id
        : 'general-practice';

  const primaryTitle = primaryBook
    ? primaryBook.title
    : primarySong
      ? primarySong.cleanTitle
      : primaryMicroScore
        ? primaryMicroScore.title
        : 'Freies Üben & Repertoire-Fokus';

  const primarySubtitle = primaryBook
    ? (formatConsecutivePageRanges(primaryBook.pages) || primaryBook.formattedPages ? `Seite ${formatConsecutivePageRanges(primaryBook.pages) || primaryBook.formattedPages}` : 'Lehrwerk-Übung')
    : primarySong
      ? (primarySong.notes || primarySong.artist || 'Song-Projekt')
      : primaryMicroScore
        ? `${primaryMicroScore.tempoBpm || 80} BPM • ${primaryMicroScore.barsCount || 2} Takte Notenschnipsel`
        : 'Wähle ein Stück oder starte den Fokus-Timer';

  // 2. Audio-Player State für den Referenz-Take der Lehrkraft
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleAudio = (url: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.ontimeupdate = () => { if (audioRef.current) setAudioCurrentTime(audioRef.current.currentTime); };
      audioRef.current.onloadedmetadata = () => { if (audioRef.current) setAudioDuration(audioRef.current.duration); };
      audioRef.current.onended = () => { setIsPlayingAudio(false); setAudioCurrentTime(0); };
    }
    if (audioRef.current.src !== url) audioRef.current.src = url;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(err => console.warn('Audio play error:', err));
    }
  };

  const formatSeconds = (sec?: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 3. Qualitativer 3x-Fehlerfrei-Counter (Deliberate Practice)
  const [passCount, setPassCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const saved = localStorage.getItem(`cg_pass_count_${studentId || 'default'}_${primaryTaskId}`);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const advancePassCount = () => {
    setPassCount(prev => {
      const next = prev >= 3 ? 0 : prev + 1;
      try {
        localStorage.setItem(`cg_pass_count_${studentId || 'default'}_${primaryTaskId}`, String(next));
      } catch {}
      return next;
    });
  };

  // Sekundäre Aufgaben für das Context Shelf
  const secondaryBooks = books.slice(primaryBook ? 1 : 0);
  const secondarySongs = safeSongs.slice(primarySong ? 1 : 0);

  const isJunior = studentUiLevel === 'junior';
  const isTeen = studentUiLevel === 'teen';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        boxSizing: 'border-box',
        ...style
      }}
      className={`practice-exercise-stage-container ${className}`}
    >
      <style>{`
        .practice-exercise-bento-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          width: 100%;
          boxSizing: border-box;
        }
        @media (min-width: 1025px) {
          .practice-exercise-bento-grid {
            grid-template-columns: minmax(0, 1.8fr) minmax(320px, 1.1fr);
            gap: 20px;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .practice-exercise-bento-grid {
            max-width: 680px;
            margin: 0 auto;
            width: 100%;
          }
        }
        .stage-interactive-card {
          transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.15s ease;
        }
        .stage-interactive-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px -6px rgba(0, 0, 0, 0.06);
        }
      `}</style>

      {/* ========================================================================= */}
      /* 🚀 DAS 0,1% ASYMMETRISCHE 2-ZONEN-GRID                                     */
      {/* ========================================================================= */}
      <div className="practice-exercise-bento-grid">
        
        {/* ===================================================================== */}
        {/* ZONE A: DIE FOCUS STAGE (65% Desktop / 100% Notenständer)             */}
        {/* ===================================================================== */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* 🌟 1. MASTER FOCUS HERO CARD */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              border: effectiveHasActiveHomework ? '2px solid #bbf7d0' : '2px solid #e2e8f0',
              padding: isMusicStandMode ? '24px 24px' : '20px 22px',
              boxShadow: effectiveHasActiveHomework ? '0 12px 32px -4px rgba(16, 185, 129, 0.10)' : '0 8px 24px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxSizing: 'border-box',
              position: 'relative',
              overflow: 'hidden'
            }}
            className="stage-interactive-card"
          >
            {/* Oberer Highlight-Glow */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: effectiveHasActiveHomework
                ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                : 'linear-gradient(90deg, #64748b 0%, #94a3b8 100%)'
            }} />

            {/* Header-Zeile mit Eyebrow & Status-Pill */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: effectiveHasActiveHomework ? '#ecfdf5' : '#f1f5f9',
                  color: effectiveHasActiveHomework ? '#065f46' : '#475569',
                  border: effectiveHasActiveHomework ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                  fontSize: '0.76rem',
                  fontWeight: 900,
                  padding: '4px 10px',
                  borderRadius: '100px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  {effectiveHasActiveHomework ? (
                    <>
                      <Sparkles size={12} color="#059669" />
                      <span>Heutiger Fokus • Wochen-Aufgabe</span>
                    </>
                  ) : (
                    <>
                      <Music size={12} color="#64748b" />
                      <span>Freies Üben • Repertoire</span>
                    </>
                  )}
                </span>

                {primaryBook && primarySubtitle.includes('Seite') && (
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 900,
                    color: '#15803d',
                    background: '#dcfce7',
                    border: '1px solid #bbf7d0',
                    padding: '3px 10px',
                    borderRadius: '100px'
                  }}>
                    {primarySubtitle}
                  </span>
                )}
              </div>

              {/* 3-Stufen Reflexions-Ampel direkt am Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <StudentHomeworkStatusButton
                  studentId={studentId || studentUser?.id}
                  taskId={primaryTaskId}
                  label={primaryTitle}
                  variant="standard"
                />
              </div>
            </div>

            {/* Titelbereich & Instrument/Icon */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                width: isMusicStandMode ? '54px' : '48px',
                height: isMusicStandMode ? '54px' : '48px',
                borderRadius: '16px',
                background: effectiveHasActiveHomework ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: effectiveHasActiveHomework ? '0 4px 12px rgba(16, 185, 129, 0.28)' : '0 2px 8px rgba(0,0,0,0.1)',
                flexShrink: 0
              }}>
                {primaryBook ? <BookOpen size={24} /> : <Music size={24} />}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                <h3 style={{
                  margin: 0,
                  fontSize: isMusicStandMode ? '1.40rem' : '1.25rem',
                  fontWeight: 950,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.25
                }}>
                  {primaryTitle}
                </h3>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569', fontWeight: 650, lineHeight: 1.35 }}>
                  {primaryBook ? (primaryBook.notes?.[0] || 'Präzise Wiederholung der Passage bei Sub-Tempo.') : primarySubtitle}
                </p>
              </div>
            </div>

            {/* 🎵 INLINE NOTENSCHNIPSEL (MICROSCORE PREVIEW) */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <MicroScoreSnippetButton
                  studentId={studentId || studentUser?.id}
                  taskId={primaryTaskId}
                  taskTitle={primaryTitle}
                  defaultInstrument={studentUser?.instrument}
                  isJunior={isJunior}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 850, color: '#0f172a' }}>
                    Notenbild &amp; Takt-Fokus
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                    1–4 Takte isolierte Problemstelle mit Metronom
                  </span>
                </div>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 800, color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: '8px' }}>
                <Target size={13} color="#059669" />
                <span>Sub-Tempo empfohlen</span>
              </div>
            </div>

            {/* 🎧 AUDIO-REFERENZ DES LEHRERS (SOUND BEFORE SIGHT) */}
            {audioTracks && audioTracks.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                border: '1.5px solid #a7f3d0',
                borderRadius: '16px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => toggleAudio(audioTracks[0].url)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                      flexShrink: 0
                    }}
                    className="hover-scale-mini"
                    aria-label={isPlayingAudio ? "Audio-Referenz anhalten" : "Audio-Referenz abspielen"}
                  >
                    {isPlayingAudio ? <Pause size={18} fill="#ffffff" /> : <Play size={18} fill="#ffffff" style={{ marginLeft: '2px' }} />}
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Headphones size={13} color="#059669" strokeWidth={2.4} />
                      <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#065f46' }}>
                        {audioTracks[0].label || 'Audio-Referenz deiner Lehrkraft'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 650 }}>
                      {isPlayingAudio ? `${formatSeconds(audioCurrentTime)} / ${formatSeconds(audioDuration)}` : 'Höre das klangliche Zielbild vor dem ersten Anschlag'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Volume2 size={16} color="#059669" />
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#047857' }}>
                    {audioTracks.length === 1 ? '1 Take' : `${audioTracks.length} Takes`}
                  </span>
                </div>
              </div>
            )}

            {/* 🎯 QUALITÄTS-METRIK: 3X FEHLERFREI HINTEREINANDER (DELIBERATE PRACTICE) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={16} color="#15803d" />
                <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a' }}>
                  Qualitäts-Challenge:
                </span>
                <span style={{ fontSize: '0.80rem', color: '#475569', fontWeight: 700 }}>
                  3 fehlerfreie Durchläufe
                </span>
              </div>

              {/* 3 Durchlauf-Kapseln */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {[1, 2, 3].map(step => {
                  const isDone = passCount >= step;
                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={advancePassCount}
                      style={{
                        minHeight: '38px',
                        padding: '4px 12px',
                        borderRadius: '100px',
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                        background: isDone ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#ffffff',
                        color: isDone ? '#ffffff' : '#64748b',
                        border: isDone ? 'none' : '1.5px solid #cbd5e1',
                        boxShadow: isDone ? '0 2px 8px rgba(16, 185, 129, 0.28)' : 'none'
                      }}
                      className="hover-scale-mini"
                      title={`Durchlauf ${step} umschalten`}
                      aria-label={`Durchlauf ${step}: ${isDone ? 'Gemeistert' : 'Offen'}`}
                    >
                      {isDone ? <CheckCircle size={14} color="#ffffff" strokeWidth={2.8} /> : <span>{step}</span>}
                      <span>{step}. Durchlauf</span>
                    </button>
                  );
                })}

                {passCount > 0 && (
                  <button
                    type="button"
                    onClick={() => { setPassCount(0); localStorage.removeItem(`cg_pass_count_${studentId || 'default'}_${primaryTaskId}`); }}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                    title="Durchläufe zurücksetzen"
                    aria-label="Durchläufe zurücksetzen"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* PRIMARY CALL-TO-ACTION: FOKUS-SESSION STARTEN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
              <button
                type="button"
                onClick={() => onStartFocusSession?.({ id: primaryTaskId, title: primaryTitle })}
                style={{
                  flex: 1,
                  minHeight: isMusicStandMode ? '54px' : '48px',
                  background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '12px 24px',
                  fontSize: isMusicStandMode ? '1.08rem' : '0.98rem',
                  fontWeight: 950,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 8px 20px rgba(22, 163, 74, 0.30)',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale"
                aria-label={`Fokus-Session für ${primaryTitle} starten`}
              >
                <Play size={18} fill="#ffffff" />
                <span>Fokus-Session mit dieser Übung starten</span>
              </button>

              {onOpenHomeworkBook && (
                <button
                  type="button"
                  onClick={() => onOpenHomeworkBook('homework_book')}
                  style={{
                    minHeight: isMusicStandMode ? '54px' : '48px',
                    padding: '12px 18px',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    color: '#334155',
                    fontSize: '0.88rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                  className="hover-scale"
                  aria-label="Aufgabenheft öffnen"
                >
                  <BookOpen size={16} color="#64748b" />
                  <span>Aufgabenheft</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* ZONE B: DAS CONTEXT SHELF (35% Desktop / gestapelt auf Tablet/Mobile) */}
        {/* ===================================================================== */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* 📅 1. WOCHEN-KONSISTENZ (7-TAGE KAPSELN) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '22px',
            border: '1.5px solid #e2e8f0',
            padding: '16px 18px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame size={16} fill="#f59e0b" color="#f59e0b" />
                <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>
                  Wochen-Konsistenz
                </span>
                <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700 }}>
                  ({streak} Tage Streak)
                </span>
              </div>

              <span style={{
                fontSize: '0.72rem',
                fontWeight: 850,
                color: '#4f46e5',
                background: '#eef2ff',
                border: '1px solid #c7d2fe',
                padding: '2px 8px',
                borderRadius: '100px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <ShieldCheck size={12} color="#6366f1" />
                <span>{availableShields}/3 Schilde</span>
              </span>
            </div>

            {/* 7-Tage Grid */}
            {weekDays && weekDays.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {weekDays.map((d: any, idx: number) => {
                  const isMastered = d.hasMastered || d.dayState === 'mastered';
                  const isShielded = d.dayState === 'shielded' || d.isJoker;
                  const isToday = d.isToday;

                  let bg = '#f8fafc';
                  let border = '1px solid #e2e8f0';
                  let color = '#64748b';

                  if (isMastered) {
                    bg = '#ecfdf5';
                    border = '1.5px solid #10b981';
                    color = '#065f46';
                  } else if (isToday) {
                    bg = '#fefce8';
                    border = '1.5px solid #fde047';
                    color = '#b45309';
                  } else if (isShielded) {
                    bg = '#f5f3ff';
                    border = '1.5px solid #c4b5fd';
                    color = '#6d28d9';
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        background: bg,
                        border,
                        borderRadius: '10px',
                        padding: '6px 2px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        minHeight: '44px'
                      }}
                    >
                      <span style={{ fontSize: '0.64rem', fontWeight: 900, color, textTransform: 'uppercase' }}>
                        {d.dayName}
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color }}>
                        {isMastered ? `${d.totalMins || 3}m` : isToday ? 'Heute' : isShielded ? 'Schild' : '·'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 📚 2. BEGLEITENDE AUFGABEN IM WOCHEN-FAHRPLAN */}
          {(secondaryBooks.length > 0 || secondarySongs.length > 0 || generalNotes.length > 0) && (
            <div style={{
              background: '#ffffff',
              borderRadius: '22px',
              border: '1.5px solid #e2e8f0',
              padding: '16px 18px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxSizing: 'border-box'
            }}>
              <span style={{
                fontSize: '0.76rem',
                fontWeight: 900,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Weitere Aufgaben dieser Woche
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {secondaryBooks.map((b, idx) => (
                  <div
                    key={`sec-b-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <BookOpen size={14} color="#e11d48" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.title}
                      </span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 850, color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '6px', flexShrink: 0 }}>
                        {formatConsecutivePageRanges(b.pages) || b.formattedPages}
                      </span>
                    </div>

                    <StudentHomeworkStatusButton
                      studentId={studentId || studentUser?.id}
                      taskId={`book-${b.title}`}
                      label={b.title}
                      variant="compact_hud"
                    />
                  </div>
                ))}

                {secondarySongs.map((s, idx) => (
                  <div
                    key={`sec-s-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <Music size={14} color="#ca8a04" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.cleanTitle}
                      </span>
                    </div>

                    <StudentHomeworkStatusButton
                      studentId={studentId || studentUser?.id}
                      taskId={`song-${s.id || s.cleanTitle}`}
                      label={s.cleanTitle}
                      variant="compact_hud"
                    />
                  </div>
                ))}

                {generalNotes && generalNotes.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.80rem',
                    color: '#334155'
                  }}>
                    <FileText size={14} color="#10b981" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {generalNotes[0]}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 💬 3. FRAGE AN DIE LEHRKRAFT (FALLS AKTIV) */}
          {studentQuestion && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '16px',
              background: '#fffdf0',
              border: '1.5px solid #fde047',
              boxShadow: '0 2px 8px rgba(250, 204, 21, 0.12)'
            }}>
              <HelpCircle size={15} color="#ca8a04" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <strong style={{ fontSize: '0.78rem', color: '#854d0e', textTransform: 'uppercase' }}>Deine Frage aktiv:</strong>
                <span style={{ fontSize: '0.84rem', color: '#713f12', fontWeight: 700 }}>„{studentQuestion}“</span>
              </div>
            </div>
          )}

          {/* 🏆 4. SPACED REPETITION / REPERTOIRE IMPULS */}
          <div style={{
            background: '#ffffff',
            borderRadius: '22px',
            border: '1.5px solid #e2e8f0',
            padding: '14px 18px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#fef3c7',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706',
                flexShrink: 0
              }}>
                <Trophy size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a' }}>
                  Repertoire-Gedächtnis
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 650 }}>
                  Frische ein gemeistertes Stück auf
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenHomeworkBook?.('audiobiography', 'document')}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '100px',
                padding: '4px 12px',
                fontSize: '0.76rem',
                fontWeight: 850,
                color: '#334155',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              className="hover-scale-mini"
              aria-label="Repertoire im Protokoll öffnen"
            >
              <span>Öffnen</span>
              <ChevronRight size={14} />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
