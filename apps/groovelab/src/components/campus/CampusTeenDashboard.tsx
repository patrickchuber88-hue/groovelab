import React, { useState, useMemo, useEffect } from 'react';
import { 
  Zap, Star, Flame, Award, BookOpen, Clock, Play, Pause, RotateCcw, 
  Check, Volume2, Mic, Calendar, Trophy, Music, Sliders, X, ArrowRight
} from 'lucide-react';
import Confetti from 'react-confetti';
import { ALL_STICKERS, getUnifiedStickersMap } from '../../domain/stickersAndTresor';
import { SimpleVoiceRecorder } from './SimpleVoiceRecorder';
import { cleanHomeworkNotesText } from '../../utils/nameHelper';
import { DEFAULT_FOKUS_LEVELS, getEngineEffectiveLevel } from '../../utils/studentProgressEngine';
import { getAvatarLevelFrameStyle } from '../StudioAvatar';

interface CampusTeenDashboardProps {
  studentUser: any;
  studentId: string;
  avatar: any;
  currentXp: number;
  progressItems: any[];
  lehrwerke?: any[];
  localProgress?: any[];
  briefingData: any;
  scheduleOccurrences: any[];
  onCompletePracticeSession?: (minutes: number, xpEarned: number) => void;
  onToggleHomeworkDone?: (item: any) => void;
  totalPracticeMinutes?: number;
  fokusLogs?: any[];
  schoolFokusLevels?: any;
}

const getInstrumentAvatarUrl = (instrument: string | null | undefined): string => {
  if (!instrument) return '/avatars/gitarre_avatar_new.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('e-gitarre')) return '/avatars/egitarre_avatar.png';
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/gitarre_avatar_new.png';
  if (inst.includes('e-bass')) return '/avatars/ebass_avatar.png';
  if (inst.includes('kontrabass') || inst.includes('double bass')) return '/avatars/kontrabass_avatar.png';
  if (inst.includes('bass')) return '/avatars/bass_avatar.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/schlagzeug_avatar.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/klavier_avatar_new.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/gesang_avatar.png';
  if (inst.includes('trompete') || inst.includes('trumpet')) return '/avatars/trompete_avatar_new.png';
  if (inst.includes('posaune') || inst.includes('trombone')) return '/avatars/posaune_avatar.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophon_avatar_new.png';
  return '/avatars/gitarre_avatar_new.png';
};

export const CampusTeenDashboard: React.FC<CampusTeenDashboardProps> = ({
  studentUser,
  studentId,
  avatar,
  currentXp,
  progressItems,
  briefingData,
  scheduleOccurrences,
  onCompletePracticeSession,
  onToggleHomeworkDone,
  totalPracticeMinutes = 0,
  fokusLogs = [],
  schoolFokusLevels
}) => {
  // Official School Focus Level presets: All students start at Level 1 (3/5/10m) and level up via practice
  const config = schoolFokusLevels || DEFAULT_FOKUS_LEVELS;
  const effectiveLevel = useMemo(() => {
    const dbLevel = avatar?.evolution_level || 1;
    const currentStreak = avatar?.current_streak || avatar?.streak_flame || 0;
    return getEngineEffectiveLevel(dbLevel, totalPracticeMinutes, currentStreak);
  }, [avatar?.evolution_level, avatar?.current_streak, avatar?.streak_flame, totalPracticeMinutes]);

  const levelKey = `level${effectiveLevel}` as 'level1' | 'level2' | 'level3';
  const activeLevelConfig = config[levelKey] || DEFAULT_FOKUS_LEVELS[levelKey];
  const presetMinutesOptions = [
    { label: 'Kleine Flamme 🔥', mins: activeLevelConfig.kleine || 3 },
    { label: 'Mittlere Flamme 🔥🔥', mins: activeLevelConfig.mittlere || 5 },
    { label: 'Helden-Flamme 👑', mins: activeLevelConfig.helden || 10 }
  ];

  // Focus Timer State
  const [targetMins, setTargetMins] = useState<number>(activeLevelConfig.mittlere || 5);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>((activeLevelConfig.mittlere || 5) * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState<boolean>(false);

  // Active Voice Recorder
  const [activeRecorderId, setActiveRecorderId] = useState<string | null>(null);

  // Selected Sticker Modal
  const [selectedSticker, setSelectedSticker] = useState<any | null>(null);

  // Audio Playalong Player State
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Streaks & Flame
  const streakDays = avatar?.current_streak || 1;

  // Countdown effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsTimerRunning(false);
            setShowConfetti(true);
            setShowCelebrationModal(true);
            if (onCompletePracticeSession) {
              onCompletePracticeSession(targetMins, targetMins * 5);
            }
            setTimeout(() => setShowConfetti(false), 5000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSecondsLeft]);

  const selectPresetMins = (mins: number) => {
    setTargetMins(mins);
    setTimerSecondsLeft(mins * 60);
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSecondsLeft(targetMins * 60);
  };

  const togglePlayAudio = (url: string) => {
    if (playingAudioUrl === url && audioElement) {
      audioElement.pause();
      setPlayingAudioUrl(null);
      return;
    }
    if (audioElement) {
      audioElement.pause();
    }
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => setPlayingAudioUrl(null);
    setAudioElement(audio);
    setPlayingAudioUrl(url);
  };

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const formattedTimer = useMemo(() => {
    const mins = Math.floor(timerSecondsLeft / 60);
    const secs = timerSecondsLeft % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, [timerSecondsLeft]);

  // Clean homework items
  const currentHomeworkList = useMemo(() => {
    const activeItems = (progressItems || []).filter(item => {
      if (item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
      return item.is_current_homework || item.status === 'IN_PROGRESS' || item.status === 'MASTERED';
    });

    return activeItems.map(item => {
      const isDone = item.status === 'MASTERED' || item.status === 'THEORY_DONE';
      let cleanNote = cleanHomeworkNotesText(item.homework_notes || item.teacher_notes || '');
      let playAlongUrl: string | null = null;
      const raw = item.homework_notes || item.teacher_notes || '';
      if (raw.includes('AUDIO:')) {
        const match = raw.match(/AUDIO:([^|]+)/);
        if (match && match[1]) playAlongUrl = match[1];
      }

      return {
        ...item,
        isDone,
        cleanNote,
        playAlongUrl,
        title: item.topic_name || item.title || 'Song / Übung',
        instrument: item.instrument || studentUser?.instrument || 'Instrument'
      };
    });
  }, [progressItems, studentUser]);

  // Unlocked Sticker Calculation (100% Unified across all levels)
  const unlockedStickersMap = useMemo(() => {
    return getUnifiedStickersMap({
      practiceMinutes: totalPracticeMinutes,
      xp: currentXp,
      streakDays,
      progressItems: progressItems || []
    });
  }, [totalPracticeMinutes, currentXp, streakDays, progressItems]);

  const unlockedStickerIds = useMemo(() => {
    const ids = new Set<string>();
    Object.keys(unlockedStickersMap).forEach(id => {
      if (unlockedStickersMap[id].isUnlocked) ids.add(id);
    });
    return ids;
  }, [unlockedStickersMap]);

  // Next lesson details
  const nextLessonInfo = useMemo(() => {
    const nextOcc = (scheduleOccurrences || [])[0];
    const hasToday = !!briefingData?.todayLesson;
    if (hasToday) return `Heute, ${briefingData.todayLesson.time} Uhr`;
    if (nextOcc) {
      const d = new Date(nextOcc.date);
      return `${d.toLocaleDateString('de-DE', { weekday: 'long' })}, ${nextOcc.start_time?.substring(0, 5)} Uhr`;
    }
    return 'Demnächst';
  }, [scheduleOccurrences, briefingData]);

  const instrumentAvatarUrl = getInstrumentAvatarUrl(studentUser?.instrument);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', width: '100%', maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box' }} className="animation-slide-up">
      {showConfetti && <Confetti numberOfPieces={160} recycle={false} />}

      {/* 1. TOP 4 GAMIFIED KPI TILES (Level 3 Design DNA) */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '14px', width: '100%', flexWrap: 'wrap' }} className="kpi-row-container">
        
        {/* KPI 1: Level XP */}
        <div style={{ 
          flex: '1 1 140px',
          minWidth: 0,
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white',
          borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '86px',
          padding: '18px 20px', boxSizing: 'border-box',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }} className="hover-scale">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.95 }}>Level XP</span>
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '6px', borderRadius: '12px' }}>
              <Star size={17} color="white" fill="white" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '10px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {currentXp || 0}
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, opacity: 0.9 }}>XP ⭐</span>
          </div>
        </div>

        {/* KPI 2: Aufgaben */}
        <div style={{ 
          flex: '1 1 140px',
          minWidth: 0,
          background: 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)', color: 'white',
          borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(52, 168, 83, 0.3)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '86px',
          padding: '18px 20px', boxSizing: 'border-box',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }} className="hover-scale">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.95 }}>Aufgaben</span>
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '6px', borderRadius: '12px' }}>
              <BookOpen size={17} color="white" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '10px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {currentHomeworkList.filter(h => h.isDone).length}/{currentHomeworkList.length || 0}
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, opacity: 0.9 }}>Erledigt 📝</span>
          </div>
        </div>

        {/* KPI 3: Übeminuten */}
        <div style={{ 
          flex: '1 1 140px',
          minWidth: 0,
          background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)', color: 'white',
          borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(234, 179, 8, 0.35)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '86px',
          padding: '18px 20px', boxSizing: 'border-box',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }} className="hover-scale">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.95 }}>Übeminuten</span>
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '6px', borderRadius: '12px' }}>
              <Clock size={17} color="white" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '10px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {totalPracticeMinutes || 0}
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, opacity: 0.9 }}>Minuten ⏱️</span>
          </div>
        </div>

        {/* KPI 4: Streak */}
        <div style={{ 
          flex: '1 1 140px',
          minWidth: 0,
          background: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)', color: 'white',
          borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(234, 88, 12, 0.35)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '86px',
          padding: '18px 20px', boxSizing: 'border-box',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }} className="hover-scale">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.95 }}>Übe-Streak</span>
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '6px', borderRadius: '12px' }}>
              <Flame size={17} color="white" fill="white" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '10px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {streakDays}
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, opacity: 0.9 }}>Tage 🔥</span>
          </div>
        </div>

      </div>

      {/* 2. HERO CARD (Studio Dark Card Blaupause) */}
      <div style={{
        background: '#0f172a',
        borderRadius: '30px',
        padding: '24px 28px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background glow */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2, 132, 199, 0.3) 0%, rgba(2, 132, 199, 0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', zIndex: 1 }}>
          {/* Avatar Icon */}
          {(() => {
            const frameStyle = getAvatarLevelFrameStyle(effectiveLevel);
            return (
              <div style={{
                width: '84px',
                height: '84px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                border: frameStyle.border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: frameStyle.boxShadow,
                flexShrink: 0,
                transition: 'all 0.3s ease'
              }}>
                <img 
                  src={instrumentAvatarUrl} 
                  alt="Instrument Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e: any) => { e.target.src = '/avatars/gitarre_avatar_new.png'; }}
                />
              </div>
            );
          })()}

          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(2, 132, 199, 0.2)',
              color: '#38bdf8',
              padding: '3px 10px',
              borderRadius: '100px',
              fontSize: '0.72rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
              border: '1px solid rgba(2, 132, 199, 0.3)'
            }}>
              <Zap size={12} />
              <span>Campus Teen (11–15 J.)</span>
            </div>

            <h1 style={{ 
              margin: 0, 
              fontSize: '1.8rem', 
              fontWeight: 950, 
              fontFamily: "'Urbanist', 'Plus Jakarta Sans', sans-serif",
              letterSpacing: '-0.02em',
              lineHeight: 1.15
            }}>
              Hallo {studentUser?.first_name || 'Musiker'}! 🚀
            </h1>

            <p style={{ margin: '4px 0 0 0', fontSize: '0.92rem', color: '#94a3b8', fontWeight: 650 }}>
              Nächster Unterricht: <span style={{ color: '#ffffff', fontWeight: 800 }}>{nextLessonInfo}</span>
            </p>
          </div>
        </div>

        {/* Level XP Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1 }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '12px 18px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '4px'
          }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              XP Fortschritt
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 950, color: '#38bdf8' }}>
              {currentXp} Level-Punkte ⚡
            </span>
          </div>
        </div>
      </div>

      {/* 3. 2-COLUMN COCKPIT GRID (Spotify / Modern Teen Look) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* LEFT COLUMN: Hausaufgabenheft & Audio-Memos */}
        <div style={{
          background: '#ffffff',
          borderRadius: '30px',
          padding: '26px 22px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={20} strokeWidth={2.4} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 950, color: '#0f172a', fontFamily: 'Urbanist' }}>
                  Hausaufgaben & Repertoire
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 650 }}>
                  Aktuelle Songs & Theorie-Übungen
                </span>
              </div>
            </div>

            <span style={{
              fontSize: '0.78rem',
              fontWeight: 850,
              background: '#f0f9ff',
              color: '#0284c7',
              padding: '4px 12px',
              borderRadius: '100px',
              border: '1px solid rgba(2, 132, 199, 0.2)'
            }}>
              {currentHomeworkList.filter(h => h.isDone).length}/{currentHomeworkList.length} Fertig
            </span>
          </div>

          {currentHomeworkList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', background: '#f8fafc', borderRadius: '20px' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 650 }}>
                Keine offenen Hausaufgaben. Perfekte Zeit für eigene Song-Ideen! 🎸
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentHomeworkList.map(item => (
                <div 
                  key={item.id}
                  style={{
                    background: item.isDone ? '#f8fafc' : '#ffffff',
                    borderRadius: '20px',
                    padding: '16px 18px',
                    border: item.isDone ? '1px solid #e2e8f0' : '1.5px solid rgba(2, 132, 199, 0.3)',
                    boxShadow: item.isDone ? 'none' : '0 4px 14px rgba(2, 132, 199, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ 
                        margin: 0, 
                        fontSize: '1.15rem', 
                        fontWeight: 900, 
                        color: item.isDone ? '#64748b' : '#0f172a',
                        textDecoration: item.isDone ? 'line-through' : 'none'
                      }}>
                        {item.title}
                      </h3>
                      {item.cleanNote && (
                        <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: '#475569', fontWeight: 650, lineHeight: 1.3 }}>
                          💡 <em>{item.cleanNote}</em>
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.playAlongUrl && (
                        <button
                          type="button"
                          onClick={() => togglePlayAudio(item.playAlongUrl!)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            border: 'none',
                            background: playingAudioUrl === item.playAlongUrl ? '#ef4444' : '#0284c7',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          {playingAudioUrl === item.playAlongUrl ? <Pause size={14} /> : <Play size={14} fill="white" />}
                          <span>Play</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveRecorderId(activeRecorderId === item.id ? null : item.id)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          background: activeRecorderId === item.id ? '#fee2e2' : '#ffffff',
                          color: activeRecorderId === item.id ? '#dc2626' : '#475569',
                          cursor: 'pointer'
                        }}
                        title="Audio-Memo aufnehmen"
                      >
                        <Mic size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleHomeworkDone && onToggleHomeworkDone(item)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '8px 14px',
                          borderRadius: '12px',
                          border: 'none',
                          background: item.isDone ? '#f1f5f9' : 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
                          color: item.isDone ? '#64748b' : '#ffffff',
                          fontWeight: 850,
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Check size={14} strokeWidth={3} />
                        <span>{item.isDone ? 'Erledigt' : 'Abhaken'}</span>
                      </button>
                    </div>
                  </div>

                  {activeRecorderId === item.id && (
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <SimpleVoiceRecorder
                        studentId={studentId}
                        topicName={item.title}
                        onAudioSaved={(url: string) => console.log('Teen audio memo saved:', url)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Pomodoro Fokus-Timer & Sticker Fortchritt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Pomodoro Fokus-Timer nach offiziellen Schul-Vorgaben */}
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
            borderRadius: '30px',
            padding: '24px 22px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
            border: '2px solid rgba(2, 132, 199, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#0284c7" />
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 950, color: '#0f172a', fontFamily: 'Urbanist' }}>
                Fokus-Timer der Musikschule
              </h3>
            </div>

            {/* Presets based on school levels */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {presetMinutesOptions.map(opt => (
                <button
                  key={opt.mins}
                  type="button"
                  onClick={() => selectPresetMins(opt.mins)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '12px',
                    border: targetMins === opt.mins ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: targetMins === opt.mins ? '#0284c7' : '#ffffff',
                    color: targetMins === opt.mins ? '#ffffff' : '#334155',
                    fontWeight: 850,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  className="hover-scale"
                >
                  <span>{opt.label}</span>
                  <span style={{ opacity: 0.8, fontSize: '0.75rem' }}>({opt.mins}m)</span>
                </button>
              ))}
            </div>

            {/* Timer Display */}
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              border: '3px solid #0284c7',
              boxShadow: isTimerRunning ? '0 0 25px rgba(2, 132, 199, 0.4)' : 'none'
            }}>
              <span style={{ fontSize: '2.4rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {formattedTimer}
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                {isTimerRunning ? 'Fokus aktiv ⚡' : 'Bereit'}
              </span>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {!isTimerRunning ? (
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '12px 24px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  <Play size={16} fill="white" />
                  <span>Timer starten</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(false)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '12px 24px',
                    borderRadius: '14px',
                    border: 'none',
                    background: '#eab308',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  <Pause size={16} />
                  <span>Pause</span>
                </button>
              )}

              <button
                type="button"
                onClick={resetTimer}
                style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {/* Meisterwerk Sticker Fortschritt (100% Unified with Level 3) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '30px',
            padding: '24px 22px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={18} color="#eab308" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', fontFamily: 'Urbanist' }}>
                  Meisterwerk-Sticker
                </h3>
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 850, color: '#ca8a04' }}>
                {unlockedStickerIds.size}/{ALL_STICKERS.length} Freigeschaltet
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '8px' }}>
              {ALL_STICKERS.map(stk => {
                const isUnlocked = unlockedStickerIds.has(stk.id);
                return (
                  <div
                    key={stk.id}
                    onClick={() => setSelectedSticker(stk)}
                    style={{
                      background: isUnlocked ? stk.bg : '#f8fafc',
                      borderRadius: '14px',
                      padding: '10px 4px',
                      border: isUnlocked ? `1.5px solid ${stk.color}` : '1px dashed #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      opacity: isUnlocked ? 1 : 0.4,
                      transition: 'all 0.2s'
                    }}
                    className="hover-scale"
                    title={`${stk.title}: ${stk.desc}`}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{stk.emoji}</span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#475569', marginTop: '2px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60px' }}>
                      {stk.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Celebration Modal */}
      {showCelebrationModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '28px', maxWidth: '400px', width: '100%',
            padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px'
          }}>
            <span style={{ fontSize: '3rem' }}>⚡</span>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 950, color: '#0f172a' }}>
              Fokus-Session gemeistert!
            </h2>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', fontWeight: 650 }}>
              Du hast <strong style={{ color: '#0284c7' }}>{targetMins} Minuten</strong> produktiv geübt und <strong style={{ color: '#eab308' }}>+{targetMins * 5} XP</strong> gesammelt!
            </p>
            <button
              type="button"
              onClick={() => setShowCelebrationModal(false)}
              style={{
                width: '100%', padding: '12px', borderRadius: '14px', border: 'none',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff', fontWeight: 900, cursor: 'pointer'
              }}
            >
              Weiterrocken 🚀
            </button>
          </div>
        </div>
      )}

      {/* Sticker Detail Modal */}
      {selectedSticker && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '28px', maxWidth: '400px', width: '100%',
            padding: '28px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', position: 'relative'
          }}>
            <button
              type="button"
              onClick={() => setSelectedSticker(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={15} />
            </button>
            <span style={{ fontSize: '3rem' }}>{selectedSticker.emoji}</span>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 950, color: '#0f172a' }}>{selectedSticker.title}</h3>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.88rem', fontWeight: 600 }}>{selectedSticker.desc}</p>
            {selectedSticker.equiv && (
              <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', fontSize: '0.78rem', color: '#64748b', fontWeight: 650 }}>
                {selectedSticker.equiv}
              </div>
            )}
            <button
              type="button"
              onClick={() => setSelectedSticker(null)}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                background: '#0f172a', color: '#ffffff', fontWeight: 900, cursor: 'pointer', marginTop: '4px'
              }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
