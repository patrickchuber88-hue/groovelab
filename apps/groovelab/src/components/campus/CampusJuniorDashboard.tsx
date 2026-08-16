import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, Star, Flame, Award, BookOpen, Clock, Play, Pause, RotateCcw, 
  Check, Volume2, Mic, Calendar, Trophy, Music, Info, X
} from 'lucide-react';
import Confetti from 'react-confetti';
import { ALL_STICKERS } from '../MeisterwerkDocumentationModal';
import { SimpleVoiceRecorder } from './SimpleVoiceRecorder';
import { cleanHomeworkNotesText } from '../../utils/nameHelper';

interface CampusJuniorDashboardProps {
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

const DEFAULT_FOKUS_LEVELS = {
  level1: { kleine: 3, mittlere: 5, helden: 10 },
  level2: { kleine: 5, mittlere: 10, helden: 15 },
  level3: { kleine: 10, mittlere: 15, helden: 20 }
};

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
  if (inst.includes('horn')) return '/avatars/horn_avatar_new.png';
  if (inst.includes('cello')) return '/avatars/cello_avatar_new.png';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return '/avatars/violine_avatar_new.png';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return '/avatars/klarinette_avatar_new.png';
  if (inst.includes('querflöte') || inst.includes('flute')) return '/avatars/querfloete_avatar.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophon_avatar_new.png';
  if (inst.includes('blockflöte') || inst.includes('recorder') || inst.includes('blockfloete')) return '/avatars/blockfloete_avatar.png';
  return '/avatars/gitarre_avatar_new.png';
};

export const CampusJuniorDashboard: React.FC<CampusJuniorDashboardProps> = ({
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
  // Official School Focus Level presets for Junior (Level 1)
  const config = schoolFokusLevels || DEFAULT_FOKUS_LEVELS;
  const level1Config = config.level1 || DEFAULT_FOKUS_LEVELS.level1;
  const presetMinutesOptions = [
    { label: 'Kleine Flamme 🔥', mins: level1Config.kleine || 3 },
    { label: 'Mittlere Flamme 🔥🔥', mins: level1Config.mittlere || 5 },
    { label: 'Helden-Flamme 👑', mins: level1Config.helden || 10 }
  ];

  const [selectedPresetMinutes, setSelectedPresetMinutes] = useState<number>(level1Config.mittlere || 5);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>((level1Config.mittlere || 5) * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState<boolean>(false);

  // Selected Sticker Modal
  const [selectedSticker, setSelectedSticker] = useState<any | null>(null);

  // Active voice recorder accordion
  const [activeRecorderItem, setActiveRecorderItem] = useState<string | null>(null);

  // Audio Playalong Player State
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Streaks & Flame
  const streakDays = avatar?.current_streak || 1;

  // Timer Countdown Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsTimerRunning(false);
            handleTimerFinished();
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

  const handleTimerFinished = () => {
    setShowConfetti(true);
    setShowCelebrationModal(true);
    if (onCompletePracticeSession) {
      onCompletePracticeSession(selectedPresetMinutes, selectedPresetMinutes * 5);
    }
    setTimeout(() => setShowConfetti(false), 6000);
  };

  const startPresetTimer = (mins: number) => {
    setSelectedPresetMinutes(mins);
    setTimerSecondsLeft(mins * 60);
    setIsTimerRunning(true);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSecondsLeft(selectedPresetMinutes * 60);
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

  // Format timer MM:SS
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
        title: item.topic_name || item.title || 'Musikstück',
        instrument: item.instrument || studentUser?.instrument || 'Instrument'
      };
    });
  }, [progressItems, studentUser]);

  // Unlocked Sticker Calculation (100% Unified with Level 3 Blueprint)
  const unlockedStickerIds = useMemo(() => {
    const ids = new Set<string>();
    if (totalPracticeMinutes >= 50) ids.add('fleiss-pionier');
    if (totalPracticeMinutes >= 250) ids.add('uebe-meister');
    if (totalPracticeMinutes >= 1000) ids.add('uebe-legende');
    if (totalPracticeMinutes >= 2000) ids.add('uebe-grossmeister');
    if (currentXp >= 250) ids.add('xp-sammler');
    if (currentXp >= 1000) ids.add('xp-champion');
    if (currentXp >= 2500) ids.add('xp-meister');
    if (currentXp >= 5000) ids.add('xp-legende');
    if (streakDays >= 3) ids.add('dranbleiber');
    if (streakDays >= 7) ids.add('wochen-held');
    if (streakDays >= 21) ids.add('streak-koenig');
    if (streakDays >= 30) ids.add('streak-kaiser');
    return ids;
  }, [totalPracticeMinutes, currentXp, streakDays]);

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
          background: 'radial-gradient(circle, rgba(52, 168, 83, 0.3) 0%, rgba(52, 168, 83, 0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', zIndex: 1 }}>
          {/* Avatar Icon */}
          <div style={{
            width: '84px',
            height: '84px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
            flexShrink: 0
          }}>
            <img 
              src={instrumentAvatarUrl} 
              alt="Instrument Avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e: any) => { e.target.src = '/avatars/gitarre_avatar_new.png'; }}
            />
          </div>

          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(52, 168, 83, 0.2)',
              color: '#4ade80',
              padding: '3px 10px',
              borderRadius: '100px',
              fontSize: '0.72rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
              border: '1px solid rgba(52, 168, 83, 0.3)'
            }}>
              <Sparkles size={12} />
              <span>Campus Junior (6–10 J.)</span>
            </div>

            <h1 style={{ 
              margin: 0, 
              fontSize: '1.8rem', 
              fontWeight: 950, 
              fontFamily: "'Urbanist', 'Plus Jakarta Sans', sans-serif",
              letterSpacing: '-0.02em',
              lineHeight: 1.15
            }}>
              Hallo {studentUser?.first_name || 'Musikschüler'}! 🎵
            </h1>

            <p style={{ margin: '4px 0 0 0', fontSize: '0.92rem', color: '#94a3b8', fontWeight: 650 }}>
              Nächste Stunde: <span style={{ color: '#ffffff', fontWeight: 800 }}>{nextLessonInfo}</span>
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
              Dein Fortschritt
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 950, color: '#facc15' }}>
              {currentXp} XP gesammelt ⭐
            </span>
          </div>
        </div>
      </div>

      {/* 3. HAUSAUFGABENHEFT WIDGET (Junior: Große Schrift, 1-Klick Play & Recorder) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '30px',
        padding: '28px 24px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'rgba(52, 168, 83, 0.12)', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={22} strokeWidth={2.4} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 950, color: '#0f172a', fontFamily: 'Urbanist', letterSpacing: '-0.02em' }}>
                Mein Hausaufgabenheft 📝
              </h2>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 650 }}>
                Was gibt es diese Woche zu üben?
              </span>
            </div>
          </div>

          <span style={{
            fontSize: '0.85rem',
            fontWeight: 900,
            background: '#f0fdf4',
            color: '#16a34a',
            padding: '6px 14px',
            borderRadius: '100px',
            border: '1px solid rgba(22, 163, 74, 0.2)'
          }}>
            {currentHomeworkList.filter(h => h.isDone).length} von {currentHomeworkList.length} erledigt
          </span>
        </div>

        {currentHomeworkList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', background: '#f8fafc', borderRadius: '20px', border: '1.5px dashed #cbd5e1' }}>
            <Sparkles size={36} color="#34a853" style={{ marginBottom: '8px' }} />
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
              Alles erledigt! Super gemacht! 🎉
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
              Aktuell sind keine neuen Aufgaben eingetragen. Du kannst jederzeit mit dem Übe-Timer spielen!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {currentHomeworkList.map(item => (
              <div 
                key={item.id}
                style={{
                  background: item.isDone ? '#f8fafc' : '#ffffff',
                  borderRadius: '24px',
                  padding: '20px 22px',
                  border: item.isDone ? '1.5px solid #e2e8f0' : '2px solid rgba(52, 168, 83, 0.35)',
                  boxShadow: item.isDone ? 'none' : '0 6px 18px rgba(52, 168, 83, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Song Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      background: item.isDone ? '#e2e8f0' : 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
                      color: item.isDone ? '#64748b' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Music size={22} strokeWidth={2.4} />
                    </div>

                    <div>
                      <h3 style={{ 
                        margin: 0, 
                        fontSize: '1.25rem', 
                        fontWeight: 950, 
                        color: item.isDone ? '#64748b' : '#0f172a',
                        textDecoration: item.isDone ? 'line-through' : 'none'
                      }}>
                        {item.title}
                      </h3>
                      {item.cleanNote && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#475569', fontWeight: 650, lineHeight: 1.35 }}>
                          💡 <em>{item.cleanNote}</em>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Audio Play & Checkbox */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.playAlongUrl && (
                      <button
                        type="button"
                        onClick={() => togglePlayAudio(item.playAlongUrl!)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 16px',
                          borderRadius: '14px',
                          border: 'none',
                          background: playingAudioUrl === item.playAlongUrl ? '#ef4444' : '#3b82f6',
                          color: '#ffffff',
                          fontWeight: 850,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        className="hover-scale"
                      >
                        {playingAudioUrl === item.playAlongUrl ? <Pause size={16} /> : <Play size={16} fill="white" />}
                        <span>{playingAudioUrl === item.playAlongUrl ? 'Stop' : 'Anhören'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveRecorderItem(activeRecorderItem === item.id ? null : item.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 14px',
                        borderRadius: '14px',
                        border: '1.5px solid #cbd5e1',
                        background: activeRecorderItem === item.id ? '#fee2e2' : '#ffffff',
                        color: activeRecorderItem === item.id ? '#dc2626' : '#475569',
                        fontWeight: 850,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                      className="hover-scale"
                      title="Audio-Aufnahme für Lehrer"
                    >
                      <Mic size={16} color={activeRecorderItem === item.id ? '#dc2626' : '#475569'} />
                      <span>{activeRecorderItem === item.id ? 'Recorder zu' : 'Aufnehmen'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleHomeworkDone && onToggleHomeworkDone(item)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 18px',
                        borderRadius: '14px',
                        border: 'none',
                        background: item.isDone ? '#f1f5f9' : 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
                        color: item.isDone ? '#64748b' : '#ffffff',
                        fontWeight: 900,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        boxShadow: item.isDone ? 'none' : '0 4px 14px rgba(52, 168, 83, 0.3)'
                      }}
                      className="hover-scale"
                    >
                      <Check size={16} strokeWidth={3} />
                      <span>{item.isDone ? 'Erledigt ✓' : 'Fertig geübt!'}</span>
                    </button>
                  </div>
                </div>

                {/* Optional Voice Recorder Drawer */}
                {activeRecorderItem === item.id && (
                  <div style={{ marginTop: '6px', padding: '16px', background: '#f8fafc', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
                    <SimpleVoiceRecorder
                      studentId={studentId}
                      topicName={item.title}
                      onAudioSaved={(url: string) => {
                        console.log('Audio recorded for teacher:', url);
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. ÜBE-STREAK FOKUS-TIMER (Junior: Feste Vorgaben der Schule, Großer Kreis, Konfetti) */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
        borderRadius: '30px',
        padding: '28px 24px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
        border: '2px solid rgba(52, 168, 83, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '20px'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(52, 168, 83, 0.15)',
            color: '#15803d',
            padding: '4px 12px',
            borderRadius: '100px',
            fontSize: '0.75rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '8px'
          }}>
            <Clock size={13} />
            <span>Fokus-Timer der Musikschule</span>
          </div>

          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 950, color: '#0f172a', fontFamily: 'Urbanist' }}>
            Starte deine Übe-Session ⏱️
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.92rem', fontWeight: 650 }}>
            Wähle deine Flammen-Stufe und sammle neue XP für dein Profil!
          </p>
        </div>

        {/* Preset Buttons based on School Focus Levels */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {presetMinutesOptions.map(opt => (
            <button
              key={opt.mins}
              type="button"
              onClick={() => startPresetTimer(opt.mins)}
              style={{
                padding: '12px 18px',
                borderRadius: '16px',
                border: selectedPresetMinutes === opt.mins ? '2px solid #34a853' : '1.5px solid #cbd5e1',
                background: selectedPresetMinutes === opt.mins ? '#34a853' : '#ffffff',
                color: selectedPresetMinutes === opt.mins ? '#ffffff' : '#334155',
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: selectedPresetMinutes === opt.mins ? '0 4px 14px rgba(52, 168, 83, 0.25)' : '0 2px 6px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              className="hover-scale"
            >
              <span>{opt.label}</span>
              <span style={{ opacity: 0.8, fontSize: '0.8rem' }}>({opt.mins}m)</span>
            </button>
          ))}
        </div>

        {/* Big Countdown Timer Circle */}
        <div style={{
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: isTimerRunning ? '0 0 30px rgba(52, 168, 83, 0.4)' : '0 10px 25px rgba(0,0,0,0.15)',
          border: '4px solid #34a853',
          transition: 'all 0.3s ease'
        }}>
          <span style={{ fontSize: '2.8rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.02em' }}>
            {formattedTimer}
          </span>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isTimerRunning ? 'Läuft... 🎶' : 'Bereit'}
          </span>
        </div>

        {/* Timer Control Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isTimerRunning ? (
            <button
              type="button"
              onClick={() => setIsTimerRunning(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                borderRadius: '16px',
                border: 'none',
                background: 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
                color: '#ffffff',
                fontWeight: 950,
                fontSize: '1.05rem',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(52, 168, 83, 0.35)'
              }}
              className="hover-scale"
            >
              <Play size={18} fill="white" />
              <span>Üben starten!</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsTimerRunning(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                borderRadius: '16px',
                border: 'none',
                background: '#eab308',
                color: '#ffffff',
                fontWeight: 950,
                fontSize: '1.05rem',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(234, 179, 8, 0.35)'
              }}
              className="hover-scale"
            >
              <Pause size={18} />
              <span>Pause</span>
            </button>
          )}

          <button
            type="button"
            onClick={resetTimer}
            style={{
              padding: '14px 18px',
              borderRadius: '16px',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#64748b',
              fontWeight: 850,
              cursor: 'pointer'
            }}
            className="hover-scale"
            title="Zurücksetzen"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* 5. MEISTERWERK PANINI-STICKER WAND (100% Einheitlich mit Level 3) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '30px',
        padding: '28px 24px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={22} strokeWidth={2.4} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 950, color: '#0f172a', fontFamily: 'Urbanist', letterSpacing: '-0.02em' }}>
                Mein Meisterwerk-Sticker-Album 🏆
              </h2>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 650 }}>
                Sammle alle Auszeichnungen durch fleißiges Üben!
              </span>
            </div>
          </div>

          <span style={{
            fontSize: '0.85rem',
            fontWeight: 900,
            background: '#fefce8',
            color: '#854d0e',
            padding: '6px 14px',
            borderRadius: '100px',
            border: '1px solid rgba(234, 179, 8, 0.3)'
          }}>
            {unlockedStickerIds.size} von {ALL_STICKERS.length} freigeschaltet ✨
          </span>
        </div>

        {/* Unified Stickers Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '14px'
        }}>
          {ALL_STICKERS.map(stk => {
            const isUnlocked = unlockedStickerIds.has(stk.id);

            return (
              <div
                key={stk.id}
                onClick={() => setSelectedSticker(stk)}
                style={{
                  background: isUnlocked ? stk.bg : '#f8fafc',
                  borderRadius: '20px',
                  padding: '16px 10px',
                  border: isUnlocked ? `2px solid ${stk.color}` : '1.5px dashed #cbd5e1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  opacity: isUnlocked ? 1 : 0.45,
                  transform: isUnlocked ? 'scale(1)' : 'none',
                  boxShadow: isUnlocked ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="hover-scale"
              >
                <span style={{ fontSize: '2rem' }}>{stk.emoji}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: isUnlocked ? '#0f172a' : '#94a3b8', lineHeight: 1.2 }}>
                  {stk.title}
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: isUnlocked ? stk.color : '#94a3b8',
                  textTransform: 'uppercase'
                }}>
                  {isUnlocked ? 'Freigeschaltet ✓' : 'Noch gesperrt'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Celebration Modal after Timer */}
      {showCelebrationModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '30px', maxWidth: '420px', width: '100%',
            padding: '36px 28px', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
          }}>
            <span style={{ fontSize: '3.5rem' }}>🎉</span>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 950, color: '#0f172a' }}>
              Fantastisch geübt!
            </h2>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', fontWeight: 650 }}>
              Du hast <strong style={{ color: '#34a853' }}>{selectedPresetMinutes} Minuten</strong> konzentriert musiziert und <strong style={{ color: '#ca8a04' }}>+{selectedPresetMinutes * 5} XP</strong> verdient!
            </p>
            <button
              type="button"
              onClick={() => setShowCelebrationModal(false)}
              style={{
                width: '100%', padding: '14px', borderRadius: '16px', border: 'none',
                background: 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
                color: '#ffffff', fontWeight: 900, fontSize: '1rem', cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(52, 168, 83, 0.3)'
              }}
            >
              Weiter so! 🚀
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
            background: '#ffffff', borderRadius: '30px', maxWidth: '400px', width: '100%',
            padding: '30px 24px', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', position: 'relative'
          }}>
            <button
              type="button"
              onClick={() => setSelectedSticker(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>
            <span style={{ fontSize: '3.5rem' }}>{selectedSticker.emoji}</span>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, color: '#0f172a' }}>{selectedSticker.title}</h3>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', fontWeight: 600 }}>{selectedSticker.desc}</p>
            {selectedSticker.equiv && (
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8rem', color: '#64748b', fontWeight: 650 }}>
                {selectedSticker.equiv}
              </div>
            )}
            <button
              type="button"
              onClick={() => setSelectedSticker(null)}
              style={{
                width: '100%', padding: '12px', borderRadius: '14px', border: 'none',
                background: '#0f172a', color: '#ffffff', fontWeight: 900, cursor: 'pointer', marginTop: '6px'
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
