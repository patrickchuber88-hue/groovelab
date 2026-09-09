import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { 
  Activity, Award, Bell, BookOpen, Calendar, CheckCircle, ChevronRight, Clock, 
  Disc, Edit3, FileText, Flame, GraduationCap, Headphones, Lightbulb, Moon, Music, 
  Pause, Play, Rocket, Settings, Shield, ShieldCheck, Smartphone, Sparkles, Square, 
  Star, Target, Trophy, X, Zap 
} from "lucide-react";
import { CampusUiLevel } from "../../campus/CampusLevelSwitcher";
import { ZenPlayAlongDock } from "../../campus/ZenPlayAlongDock";
import { formatTeacherFullName } from "../../../utils/nameHelper";
import { getSimulatedNow, toLocalYYYYMMDD } from "../studentDateUtils";

const Confetti = lazy(() => import("react-confetti"));

export interface StudentPracticeTabProps {
  activeTab: string;
  studentUiLevel: CampusUiLevel;
  juniorMissionPhase: "idle" | "zen" | "celebrating";
  preStartCountdown: number | null;
  studentId: string;
  studentUser: any;
  avatar: any;
  effectivePracticeMinutes: number;
  secondsElapsedRef: React.MutableRefObject<number>;
  isJuniorMissionPausedRef: React.MutableRefObject<boolean>;
  startJuniorMissionImmediately: () => void;
  handleFinishJuniorMission: () => void;
  handleEmergencyExitJuniorMission: () => void;
  handleCloseJuniorCelebration: () => void;
  handleStartPracticeSession: () => Promise<void>;
  finishPracticeSession: () => Promise<void>;
  logParentGuidedPractice: (minutes: number) => Promise<void>;
  handleOpenHomeworkBookWithView: (targetTab?: any, targetViewMode?: any) => void;
  playMilestoneSound: (tier: 1 | 2 | 3) => void;
  playStarChimeSound: () => void;
  getDeterministicWeekMetrics: () => any;
  getGroupedLogs: () => any;
  getJuniorMissionDetails: () => any;
  getTargetMinutes: (streak?: number) => number;
  sessionActive: boolean;
  secondsElapsed: number;
  isMobile?: boolean;
  isMusicStandMode?: boolean;
  flamesActive?: boolean;
  xpActive?: boolean;
  assignedCampusSongs: any[];
  lehrwerke: any[];
  progressItems: any[];
  fokusLogs: any[];
  activeSongSkills: any[];
  showJuniorPracticeSettingsModal: boolean;
  setShowJuniorPracticeSettingsModal: (show: boolean) => void;
  showJuniorStickerModal: boolean;
  setShowJuniorStickerModal: (show: boolean) => void;
  practiceAnchor: string | null;
  setPracticeAnchor: (anchor: string | null) => void;
  juniorMissionTier: 1 | 2 | 3;
  juniorMissionCountdown: number | null;
  isJuniorMissionPaused: boolean;
  setIsJuniorMissionPaused: (paused: boolean) => void;
  showJuniorCheatSheet: boolean;
  setShowJuniorCheatSheet: React.Dispatch<React.SetStateAction<boolean>>;
  juniorSelectedTrackIndex: number;
  isJuniorTabPaused: boolean;
  juniorCelebrationSummary: any;
  juniorLaunchStage: "launching" | "summary";
  expandedMonths: Record<string, boolean>;
  setExpandedMonths: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export const StudentPracticeTab: React.FC<StudentPracticeTabProps> = ({
  activeTab,
  studentUiLevel,
  juniorMissionPhase,
  preStartCountdown,
  studentId,
  studentUser,
  avatar,
  effectivePracticeMinutes,
  secondsElapsedRef,
  isJuniorMissionPausedRef,
  startJuniorMissionImmediately,
  handleFinishJuniorMission,
  handleEmergencyExitJuniorMission,
  handleCloseJuniorCelebration,
  handleStartPracticeSession,
  finishPracticeSession,
  logParentGuidedPractice,
  handleOpenHomeworkBookWithView,
  playMilestoneSound,
  playStarChimeSound,
  getDeterministicWeekMetrics,
  getGroupedLogs,
  getJuniorMissionDetails,
  getTargetMinutes,
  sessionActive,
  secondsElapsed,
  isMobile = false,
  isMusicStandMode = false,
  flamesActive = true,
  xpActive = true,
  assignedCampusSongs,
  lehrwerke,
  progressItems,
  fokusLogs,
  activeSongSkills,
  showJuniorPracticeSettingsModal,
  setShowJuniorPracticeSettingsModal,
  showJuniorStickerModal,
  setShowJuniorStickerModal,
  practiceAnchor,
  setPracticeAnchor,
  juniorMissionTier,
  juniorMissionCountdown,
  isJuniorMissionPaused,
  setIsJuniorMissionPaused,
  showJuniorCheatSheet,
  setShowJuniorCheatSheet,
  juniorSelectedTrackIndex,
  isJuniorTabPaused,
  juniorCelebrationSummary,
  juniorLaunchStage,
  expandedMonths,
  setExpandedMonths,
}) => {
  return (
      <div id="tour-student-practice" style={{ display: activeTab === 'practice_board' ? 'flex' : 'none', flexDirection: 'column', gap: '16px', width: '100%' }} className="animation-slide-up practice-board-wrapper">
        {activeTab === 'practice_board' && (
          <>
            {/* ========================================================================= */}
            {/* 🌟 JUNIOR GOLDSTANDARD: KINDGERECHTER ÜBE-PFAD (7-10 JAHRE)              */}
            {/* ========================================================================= */}
            {studentUiLevel === 'junior' && juniorMissionPhase === 'idle' && (() => {
              const streak = avatar?.streak_flame || 0;
              const targetMins = getTargetMinutes(streak);
              const weekMetrics = getDeterministicWeekMetrics();
              const { weekDays, weekPracticedCount, availableShields } = weekMetrics;

              // XP Calculation
              let xpVal = avatar?.xp || 0;
              try {
                const localStats = JSON.parse(localStorage.getItem(`cg_offline_stats_${studentId}`) || '{}');
                if (localStats.current_xp) xpVal = Math.max(xpVal, localStats.current_xp);
                const localPractice = JSON.parse(localStorage.getItem(`cg_offline_practice_${studentId}`) || '{}');
                if (localPractice.xp) xpVal = Math.max(xpVal, localPractice.xp);
              } catch (e) {}

              // Next Sticker Calculation (Harmonized 1:1 with effectivePracticeMinutes)
              const effMins = effectivePracticeMinutes;
              let nextStickerName = 'Fleiß-Pionier';
              let targetMin = 20;
              let prevMin = 0;
              let stickerIcon = '🐝';
              let stickerId = 'fleiss-pionier';
              if (effMins >= 500) {
                nextStickerName = 'Übe-Großmeister';
                targetMin = 1500;
                prevMin = 500;
                stickerIcon = '🏆';
                stickerId = 'uebe-grossmeister';
              } else if (effMins >= 100) {
                nextStickerName = 'Übe-Legende';
                targetMin = 500;
                prevMin = 100;
                stickerIcon = '👑';
                stickerId = 'uebe-legende';
              } else if (effMins >= 20) {
                nextStickerName = 'Übe-Meister';
                targetMin = 100;
                prevMin = 20;
                stickerIcon = '🦉';
                stickerId = 'uebe-meister';
              }

              const isMax = effMins >= 1500;
              const progressPct = isMax ? 100 : Math.min(100, Math.max(0, ((effMins - prevMin) / (targetMin - prevMin)) * 100));
              const minsToNext = Math.max(1, targetMin - effMins);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }} className="animation-fade-in">
                  
                  {/* Cosmic Keyframe Animations & Juicy Styles */}
                  <style>{`
                    @keyframes cosmicTwinkle {
                      0%, 100% { opacity: 0.25; transform: scale(0.75); }
                      50% { opacity: 1; transform: scale(1.25); filter: drop-shadow(0 0 8px rgba(232, 121, 249, 0.95)); }
                    }
                    @keyframes rocketHover {
                      0%, 100% { transform: translateY(0px) rotate(-1.5deg); }
                      50% { transform: translateY(-9px) rotate(2deg); }
                    }
                    @keyframes thrusterPulse {
                      0%, 100% { transform: scaleY(0.9); opacity: 0.85; filter: drop-shadow(0 0 8px #f59e0b); }
                      50% { transform: scaleY(1.45); opacity: 1; filter: drop-shadow(0 0 16px #f97316); }
                    }
                    @keyframes orbitSatellite {
                      from { transform: rotate(0deg) translateX(97px) rotate(0deg); }
                      to { transform: rotate(360deg) translateX(97px) rotate(-360deg); }
                    }
                    @keyframes pulseRadarBeacon {
                      0% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.6); }
                      70% { transform: scale(1.03); box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
                      100% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                    }
                    @keyframes goldCoinShine {
                      0%, 100% { filter: brightness(1) drop-shadow(0 2px 4px rgba(234, 179, 8, 0.25)); }
                      50% { filter: brightness(1.25) drop-shadow(0 4px 10px rgba(250, 204, 21, 0.6)); }
                    }
                    @keyframes amberStreakGlow {
                      0%, 100% {
                        box-shadow: 0 4px 0 #b45309, 0 6px 14px rgba(245, 158, 11, 0.30);
                        filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.35));
                      }
                      50% {
                        box-shadow: 0 4px 0 #b45309, 0 10px 22px rgba(245, 158, 11, 0.55);
                        filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.75));
                      }
                    }
                    .junior-3d-button {
                      background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);
                      box-shadow: 0 8px 0 #312e81, 0 16px 25px rgba(49, 46, 129, 0.45);
                      transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
                      transform: translateY(0);
                    }
                    .junior-3d-button:hover {
                      transform: translateY(-2px);
                      box-shadow: 0 10px 0 #312e81, 0 20px 30px rgba(49, 46, 129, 0.55);
                    }
                    .junior-3d-button:active {
                      transform: translateY(6px);
                      box-shadow: 0 2px 0 #312e81, 0 6px 12px rgba(49, 46, 129, 0.3);
                    }
                    .junior-day-coin {
                      transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                    .junior-day-coin:hover {
                      transform: translateY(-3px) scale(1.05);
                    }
                  `}</style>

                  {/* 1. Sanfter Junior Header: Ruhig & Motivierend (Harmonisiert mit Briefing Board Box 2 Indigo) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    background: '#ffffff',
                    borderRadius: isMobile ? '20px' : '24px',
                    padding: isMusicStandMode ? '20px 28px' : (isMobile ? '14px 14px' : '16px 24px'),
                    border: '1.5px solid #e2e8f0',
                    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.04)',
                    boxSizing: 'border-box',
                    maxWidth: '100%',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: isMusicStandMode ? '64px' : '56px',
                        height: isMusicStandMode ? '64px' : '56px',
                        borderRadius: '18px',
                        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#4f46e5',
                        boxShadow: '0 6px 16px rgba(99, 102, 241, 0.22)',
                        flexShrink: 0
                      }}>
                        <Rocket size={isMusicStandMode ? 32 : 28} color="#4f46e5" />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: isMusicStandMode ? '1.55rem' : '1.38rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                          Mission Musik-Kosmos
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', color: '#64748b', fontWeight: 650, lineHeight: 1.4 }}>
                          Handy flach hinlegen, spielen &amp; Sterne sammeln!
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {/* Star Streak Pill (Luminous Amber / Solar Gold when active) */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: streak > 0 ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : '#f8fafc',
                        border: streak > 0 ? '1.5px solid #fcd34d' : '1.5px solid #e2e8f0',
                        color: streak > 0 ? '#92400e' : '#64748b',
                        padding: isMusicStandMode ? '8px 16px' : '6px 14px',
                        borderRadius: '100px',
                        fontWeight: 900,
                        fontSize: isMusicStandMode ? '0.92rem' : '0.86rem',
                        boxShadow: streak > 0 ? '0 4px 14px rgba(245, 158, 11, 0.25)' : '0 2px 4px rgba(0,0,0,0.03)',
                        transition: 'all 0.3s ease'
                      }}>
                        <Star size={18} fill={streak > 0 ? '#f59e0b' : '#94a3b8'} color={streak > 0 ? '#d97706' : '#94a3b8'} style={{ filter: streak > 0 ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.7))' : 'none' }} />
                        <span>{streak} {streak === 1 ? 'Tag' : 'Tage'} Serie</span>
                      </div>

                      {/* XP Pill */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#eef2ff',
                        border: '1.5px solid #e0e7ff',
                        color: '#4f46e5',
                        padding: isMusicStandMode ? '8px 16px' : '6px 14px',
                        borderRadius: '100px',
                        fontWeight: 900,
                        fontSize: isMusicStandMode ? '0.92rem' : '0.86rem',
                        boxShadow: '0 2px 6px rgba(79, 70, 229, 0.1)'
                      }}>
                        <Star size={18} fill="#4f46e5" />
                        <span>{xpVal} XP</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Center Stage Hero: Die Magische Weltraum-Startrampe (Cosmic Purple & Indigo Galaxy) */}
                  <div style={{
                    width: '100%',
                    background: 'linear-gradient(160deg, #090514 0%, #1e103a 35%, #2e1065 70%, #150928 100%)',
                    borderRadius: isMobile ? '24px' : '32px',
                    border: '2px solid rgba(168, 85, 247, 0.35)',
                    padding: isMusicStandMode ? '44px 32px' : (isMobile ? '28px 16px' : '40px 28px'),
                    boxShadow: '0 20px 50px -10px rgba(46, 16, 101, 0.5), 0 0 35px rgba(168, 85, 247, 0.15) inset',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                  }}>
                    {/* Background Cosmic Starfield Elements (Cosmic Purple & Golden Stars) */}
                    {[
                      { top: '14%', left: '8%', size: 10, delay: '0s', color: '#fde047' },
                      { top: '20%', right: '12%', size: 12, delay: '1.2s', color: '#c084fc' },
                      { top: '48%', left: '7%', size: 8, delay: '0.7s', color: '#818cf8' },
                      { top: '56%', right: '9%', size: 10, delay: '1.8s', color: '#fde047' },
                      { top: '78%', left: '12%', size: 11, delay: '2.3s', color: '#e879f9' },
                      { top: '82%', right: '11%', size: 8, delay: '0.4s', color: '#a78bfa' },
                      { top: '12%', left: '42%', size: 7, delay: '1.5s', color: '#ffffff' },
                      { top: '26%', right: '32%', size: 9, delay: '2.0s', color: '#fde047' }
                    ].map((star, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          top: star.top,
                          left: star.left,
                          right: star.right,
                          width: `${star.size}px`,
                          height: `${star.size}px`,
                          animation: `cosmicTwinkle 2.5s ease-in-out infinite ${star.delay}`,
                          pointerEvents: 'none',
                          zIndex: 0
                        }}
                      >
                        <svg width={star.size} height={star.size} viewBox="0 0 24 24" fill={star.color}>
                          <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
                        </svg>
                      </div>
                    ))}

                    {/* Ambient Cosmic Purple & Indigo Nebula Glow */}
                    <div style={{
                      position: 'absolute',
                      top: '-60px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '380px',
                      height: '240px',
                      background: 'radial-gradient(circle, rgba(168, 85, 247, 0.28) 0%, rgba(99, 102, 241, 0.18) 50%, rgba(0,0,0,0) 75%)',
                      borderRadius: '50%',
                      pointerEvents: 'none'
                    }} />

                    {/* Gear / Settings Button in top right (Cosmic Glass) */}
                    <button
                      type="button"
                      onClick={() => setShowJuniorPracticeSettingsModal(true)}
                      style={{
                        position: 'absolute',
                        top: isMobile ? '12px' : '18px',
                        right: isMobile ? '12px' : '18px',
                        background: 'rgba(255, 255, 255, 0.12)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(199, 210, 254, 0.25)',
                        borderRadius: '14px',
                        padding: isMobile ? '10px 14px' : '8px 14px',
                        minHeight: isMobile ? '44px' : 'auto',
                        touchAction: 'manipulation',
                        color: '#c7d2fe',
                        fontSize: isMusicStandMode ? '0.88rem' : '0.80rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        zIndex: 2
                      }}
                      className="hover-scale"
                      title="Zaubertöne & Anker anpassen"
                    >
                      <Settings size={14} color="#c7d2fe" />
                      <span>Einstellungen</span>
                    </button>

                    {/* Schwebende Vektor-Rakete Illustration */}
                    <div style={{
                      position: 'relative',
                      width: '78px',
                      height: '78px',
                      marginBottom: '10px',
                      animation: 'rocketHover 4s ease-in-out infinite',
                      zIndex: 1
                    }}>
                      <svg width="78" height="78" viewBox="0 0 68 68" fill="none" style={{ filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.45))' }}>
                        {/* Thruster Flame with Pulse Animation */}
                        <g style={{ transformOrigin: '34px 50px', animation: 'thrusterPulse 0.4s ease-in-out infinite alternate' }}>
                          <path d="M30 48 Q34 66 34 68 Q34 66 38 48 Z" fill="#f97316" />
                          <path d="M32 48 Q34 60 34 62 Q34 60 36 48 Z" fill="#fde047" />
                        </g>
                        {/* Red Wings */}
                        <path d="M22 36 L12 48 Q20 48 24 43 Z" fill="#ef4444" />
                        <path d="M46 36 L56 48 Q48 48 44 43 Z" fill="#ef4444" />
                        {/* Spaceship Main White Hull */}
                        <path d="M34 8 C26 18 24 34 24 46 L44 46 C44 34 42 18 34 8 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
                        {/* Red Nose Cone */}
                        <path d="M34 8 C30 14 27 20 26 23 L42 23 C41 20 38 14 34 8 Z" fill="#ef4444" />
                        {/* Cyan Cockpit Porthole */}
                        <circle cx="34" cy="30" r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                        <circle cx="32" cy="28" r="2" fill="#ffffff" />
                      </svg>
                    </div>

                    {/* Glowing Target Pill (Indigo/Violet) */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(129, 140, 248, 0.18)',
                      border: '1px solid rgba(165, 180, 252, 0.4)',
                      color: '#c7d2fe',
                      padding: isMusicStandMode ? '7px 22px' : '6px 18px',
                      borderRadius: '100px',
                      fontSize: isMusicStandMode ? '0.92rem' : '0.86rem',
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginBottom: '20px',
                      boxShadow: '0 0 15px rgba(99, 102, 241, 0.25)',
                      zIndex: 1
                    }}>
                      <Target size={16} color="#c7d2fe" />
                      <span>Tages-Fokus: {targetMins} Min. am Stück</span>
                    </div>

                    {/* Big Reaktor-Dial Ring (195px) with Orbiting Satellite Star (Indigo / Purple) */}
                    <div style={{
                      position: 'relative',
                      width: '195px',
                      height: '195px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(129, 140, 248, 0.18) 0%, rgba(0,0,0,0) 70%)',
                      zIndex: 1
                    }}>
                      {/* Rotating Dashed Orbit Track */}
                      <div style={{
                        position: 'absolute',
                        inset: '-5px',
                        borderRadius: '50%',
                        border: '1.5px dashed rgba(165, 180, 252, 0.45)',
                        pointerEvents: 'none'
                      }} />

                      {/* Orbiting Satellite Star */}
                      <div style={{
                        position: 'absolute',
                        width: '195px',
                        height: '195px',
                        borderRadius: '50%',
                        animation: 'spinSlow 14s linear infinite',
                        pointerEvents: 'none'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '-10px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #e0e7ff 0%, #c084fc 100%)',
                          boxShadow: '0 0 12px #c084fc, 0 0 24px rgba(168, 85, 247, 0.8)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Star size={13} fill="#4f46e5" color="#4f46e5" />
                        </div>
                      </div>

                      <svg width="195" height="195" viewBox="0 0 195 195" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                        <circle cx="97.5" cy="97.5" r="86" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="6.5" />
                        <circle
                          cx="97.5"
                          cy="97.5"
                          r="86"
                          fill="none"
                          stroke="url(#juniorCosmicDial)"
                          strokeWidth="6.5"
                          strokeDasharray={2 * Math.PI * 86}
                          strokeDashoffset={0}
                          strokeLinecap="round"
                          style={{ filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.8))' }}
                        />
                        <defs>
                          <linearGradient id="juniorCosmicDial" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#818cf8" />
                            <stop offset="50%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                      </svg>

                      <div style={{
                        position: 'absolute',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center'
                      }}>
                        <span style={{
                          fontSize: isMusicStandMode ? '3.3rem' : '3.0rem',
                          fontWeight: 950,
                          color: '#ffffff',
                          letterSpacing: '-0.04em',
                          lineHeight: 1,
                          fontFamily: "'Urbanist', sans-serif",
                          textShadow: '0 0 28px rgba(168, 85, 247, 0.7)'
                        }}>
                          {String(targetMins).padStart(2, '0')}:00
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 850,
                          color: '#c7d2fe',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          marginTop: '6px',
                          background: 'rgba(129, 140, 248, 0.22)',
                          border: '1px solid rgba(165, 180, 252, 0.4)',
                          padding: '3px 12px',
                          borderRadius: '100px'
                        }}>
                          Zielzeit
                        </span>
                      </div>
                    </div>

                    {/* 🎮 Juicy 3D Arcade Bumper Button with Space Sound (Indigo/Purple Theme) */}
                    <button
                      type="button"
                      onClick={() => {
                        startJuniorMissionImmediately();
                      }}
                      className="junior-3d-button"
                      style={{
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '20px',
                        padding: isMusicStandMode ? '18px 44px' : '17px 38px',
                        minHeight: '52px',
                        touchAction: 'manipulation',
                        fontSize: isMusicStandMode ? '1.18rem' : '1.12rem',
                        fontWeight: 950,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginTop: '24px',
                        zIndex: 1
                      }}
                    >
                      <Rocket size={26} color="#ffffff" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }} />
                      <span style={{ textShadow: '0 2px 4px rgba(0,0,0,0.25)', letterSpacing: '0.01em' }}>
                        Rakete zünden &amp; Üben starten
                      </span>
                    </button>

                    {/* Space Microcopy */}
                    <p style={{
                      fontSize: isMusicStandMode ? '0.98rem' : '0.90rem',
                      color: '#c7d2fe',
                      fontWeight: 650,
                      margin: '16px 0 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      zIndex: 1
                    }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Smartphone size={13} color="#c7d2fe" /> Handy flach hinlegen
                      </span>
                      <span>·</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Moon size={13} color="#c7d2fe" /> Bildschirm wird dunkel
                      </span>
                      <span>·</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Bell size={13} color="#c7d2fe" /> Zaubertöne leiten dich
                      </span>
                    </p>
                  </div>

                  {/* 3. Bottom Dual Grid: 2 Ruhige, Ausbalancierte Karten (Briefing Board Format) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '24px',
                    width: '100%'
                  }}>
                    {/* Karte A: Deine Woche in Sternen ✨ (3D Münzen & Star Chime Audio) */}
                    <div style={{
                      background: '#ffffff',
                      borderRadius: isMobile ? '24px' : '32px',
                      border: '2px solid #e2e8f0',
                      padding: isMusicStandMode ? '32px' : (isMobile ? '18px 14px' : '28px'),
                      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.04)',
                      boxSizing: 'border-box',
                      maxWidth: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '18px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: isMusicStandMode ? '64px' : '56px', height: isMusicStandMode ? '64px' : '56px', minWidth: isMusicStandMode ? '64px' : '56px', borderRadius: '18px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', boxShadow: '0 6px 16px rgba(99, 102, 241, 0.22)' }}>
                          <Sparkles size={isMusicStandMode ? 32 : 28} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              <h4 style={{ margin: 0, fontSize: isMusicStandMode ? '1.55rem' : '1.38rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                                Deine Woche in Sternen
                              </h4>
                              
                              {/* 🛡️ Schutzschilde & ⭐ Wochenfortschritt direkt rechts neben dem Titel */}
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span 
                                  title={`${availableShields} von 3 Schutzschilden aktiv für diese Woche`}
                                  style={{
                                    fontSize: isMusicStandMode ? '0.88rem' : '0.80rem',
                                    fontWeight: 900,
                                    background: availableShields > 0 ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' : '#f8fafc',
                                    color: availableShields > 0 ? '#6d28d9' : '#64748b',
                                    padding: isMusicStandMode ? '5px 12px' : '4px 10px',
                                    borderRadius: '100px',
                                    border: availableShields > 0 ? '1.5px solid #c4b5fd' : '1px solid #e2e8f0',
                                    boxShadow: availableShields > 0 ? '0 2px 8px rgba(124, 58, 237, 0.16)' : '0 2px 4px rgba(0,0,0,0.03)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    {[1, 2, 3].map(sNum => (
                                      <Shield
                                        key={sNum}
                                        size={12}
                                        fill={sNum <= availableShields ? '#7c3aed' : 'none'}
                                        color={sNum <= availableShields ? '#7c3aed' : '#c4b5fd'}
                                        style={{
                                          opacity: sNum <= availableShields ? 1 : 0.35,
                                          filter: sNum <= availableShields ? 'drop-shadow(0 0 2px rgba(124, 58, 237, 0.5))' : 'none'
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <span>{availableShields} von 3 Schilden</span>
                                </span>

                                <span style={{
                                  fontSize: isMusicStandMode ? '0.90rem' : '0.82rem',
                                  fontWeight: 900,
                                  background: weekPracticedCount > 0 ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : '#f8fafc',
                                  color: weekPracticedCount > 0 ? '#92400e' : '#64748b',
                                  padding: isMusicStandMode ? '5px 13px' : '4px 11px',
                                  borderRadius: '100px',
                                  border: weekPracticedCount > 0 ? '1px solid #fcd34d' : '1px solid #e2e8f0',
                                  boxShadow: weekPracticedCount > 0 ? '0 2px 8px rgba(245, 158, 11, 0.18)' : '0 2px 4px rgba(0,0,0,0.03)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  <span>{weekPracticedCount} von 7 Tagen</span>
                                  <Star size={13} fill={weekPracticedCount > 0 ? '#f59e0b' : '#94a3b8'} color={weekPracticedCount > 0 ? '#d97706' : '#94a3b8'} style={{ filter: weekPracticedCount > 0 ? 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.7))' : 'none' }} />
                                </span>
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', color: '#64748b', fontWeight: 650, lineHeight: 1.4, display: 'block', marginTop: '3px' }}>
                            Tippe auf die Tage für Zaubertöne!
                          </span>
                        </div>
                      </div>

                      {/* 7 Days Grid with 3D Coins */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                        {weekDays.map((d: any, idx: number) => {
                          let bg = '#f8fafc';
                          let border = '1px solid #e2e8f0';
                          let textColor = '#64748b';
                          let boxShadow = '0 3px 0 #cbd5e1';
                          let iconEl = <span style={{ fontSize: '0.85rem', opacity: 0.4 }}>·</span>;
                          let subText = d.isFuture ? '·' : 'Pause';
                          let customAnimation = 'none';

                          if (d.isToday) {
                            if (d.hasMastered || d.dayState === 'mastered') {
                              bg = 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 40%, #fde68a 100%)';
                              border = '1.5px solid #f59e0b';
                              textColor = '#78350f';
                              boxShadow = '0 4px 0 #b45309, 0 8px 20px rgba(245, 158, 11, 0.40)';
                              iconEl = <Star size={19} fill="#f59e0b" color="#b45309" style={{ filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))' }} />;
                              subText = `${d.totalMins || 3}m`;
                              customAnimation = 'amberStreakGlow 2.4s infinite ease-in-out';
                            } else {
                              // TODAY_STANDBY (Option A): Einladender Standby-Modus
                              bg = 'linear-gradient(180deg, #eef2ff 0%, #e0e7ff 100%)';
                              border = '1.5px solid #6366f1';
                              textColor = '#4338ca';
                              boxShadow = '0 4px 0 #3730a3, 0 8px 16px rgba(99, 102, 241, 0.25)';
                              iconEl = <Sparkles size={18} color="#4338ca" />;
                              subText = 'Heute!';
                              customAnimation = 'pulseRadarBeacon 2.5s infinite';
                            }
                          } else if (d.hasMastered || d.dayState === 'mastered') {
                            // PAST MASTERED: Bernstein/Sonnengold mit leuchtendem Stern
                            bg = 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 45%, #fde68a 100%)';
                            border = '1.5px solid #f59e0b';
                            textColor = '#78350f';
                            boxShadow = '0 4px 0 #b45309, 0 6px 16px rgba(245, 158, 11, 0.28)';
                            iconEl = <Star size={18} fill="#f59e0b" color="#b45309" style={{ filter: 'drop-shadow(0 0 5px rgba(245, 158, 11, 0.7))' }} />;
                            subText = `${d.totalMins}m`;
                            customAnimation = 'amberStreakGlow 3.5s infinite ease-in-out';
                          } else if (d.dayState === 'shielded' || d.isJoker) {
                            // SHIELDED (Schutzschild immer in Lila/Indigo)
                            bg = 'linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)';
                            border = '1.5px solid #a78bfa';
                            textColor = '#5b21b6';
                            boxShadow = '0 4px 0 #6d28d9, 0 6px 16px rgba(124, 58, 237, 0.22)';
                            iconEl = <Shield size={18} fill="#7c3aed" color="#7c3aed" style={{ filter: 'drop-shadow(0 0 4px rgba(124, 58, 237, 0.6))' }} />;
                            subText = 'Schild';
                          } else if (!d.isFuture) {
                            // PAUSE (Mond in sanftem Schieferblau)
                            bg = '#f8fafc';
                            border = '1px solid #e2e8f0';
                            textColor = '#94a3b8';
                            boxShadow = '0 2px 0 #cbd5e1';
                            iconEl = <Moon size={16} color="#94a3b8" />;
                            subText = 'Pause';
                          }

                          return (
                            <div
                              key={idx}
                              className="junior-day-coin"
                              role="button"
                              tabIndex={0}
                              onMouseEnter={() => {
                                if (d.hasMastered || d.isToday || d.dayState === 'shielded' || d.isJoker) playStarChimeSound();
                              }}
                              onClick={() => {
                                playStarChimeSound();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  playStarChimeSound();
                                }
                              }}
                              style={{
                                background: bg,
                                border: border,
                                borderRadius: '18px',
                                padding: '10px 4px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                minHeight: '74px',
                                boxShadow: boxShadow,
                                animation: customAnimation,
                                cursor: 'pointer',
                                touchAction: 'manipulation'
                              }}
                            >
                              <span style={{ fontSize: '0.74rem', fontWeight: 900, color: textColor, textTransform: 'uppercase' }}>
                                {d.dayName}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '20px' }}>
                                {iconEl}
                              </div>
                              <span style={{ fontSize: '0.68rem', fontWeight: 850, color: textColor }}>
                                {subText}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Karte B: Dein nächster Sticker 🐝 (Holographic Card & Laser Bar) */}
                    <div style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #fdf4ff 100%)',
                      borderRadius: isMobile ? '24px' : '32px',
                      border: '2px solid rgba(99, 102, 241, 0.25)',
                      padding: isMusicStandMode ? '32px' : (isMobile ? '18px 14px' : '28px'),
                      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.04)',
                      boxSizing: 'border-box',
                      maxWidth: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '18px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: isMusicStandMode ? '64px' : '56px', height: isMusicStandMode ? '64px' : '56px', borderRadius: '18px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', boxShadow: '0 6px 16px rgba(99, 102, 241, 0.22)' }}>
                            <Award size={isMusicStandMode ? 32 : 28} />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: isMusicStandMode ? '1.55rem' : '1.38rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                              Nächster Meilenstein
                            </h4>
                            <span style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', color: '#64748b', fontWeight: 650, lineHeight: 1.4 }}>
                              Sticker-Pfad Belohnung
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowJuniorStickerModal(true)}
                          style={{
                            background: '#ffffff',
                            border: '1.5px solid #c7d2fe',
                            borderRadius: '100px',
                            padding: isMusicStandMode ? '6px 14px' : '5px 12px',
                            color: '#4f46e5',
                            fontSize: isMusicStandMode ? '0.92rem' : '0.84rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                          }}
                          className="hover-scale"
                        >
                          <BookOpen size={14} />
                          <span>Sticker-Album</span>
                        </button>
                      </div>

                      {/* 3D Holographic Sticker Preview Block */}
                      <div 
                        onClick={() => setShowJuniorStickerModal(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          background: '#ffffff',
                          borderRadius: '20px',
                          padding: '16px 18px',
                          border: '1.5px solid #e2e8f0',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          cursor: 'pointer'
                        }}
                        className="hover-scale"
                      >
                        <div style={{
                          width: isMusicStandMode ? '64px' : '56px',
                          height: isMusicStandMode ? '64px' : '56px',
                          borderRadius: '18px',
                          background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)',
                          border: '2.5px solid #818cf8',
                          boxShadow: '0 6px 16px rgba(99, 102, 241, 0.30), 0 3px 0 #4f46e5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          padding: '3px',
                          overflow: 'hidden'
                        }}>
                          <img
                            src={`/stickers/${stickerId}.png?v=1`}
                            alt={nextStickerName}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                const span = document.createElement('span');
                                span.style.fontSize = '1.6rem';
                                span.innerText = stickerIcon;
                                parent.appendChild(span);
                              }
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 950, fontSize: isMusicStandMode ? '1.20rem' : '1.08rem', color: '#0f172a' }}>{nextStickerName}</span>
                            <span style={{ fontSize: isMusicStandMode ? '0.92rem' : '0.86rem', fontWeight: 900, color: '#4f46e5' }}>{effMins} / {targetMin} Min</span>
                          </div>

                          {/* Laser Energy Bar (Purple to Lavender) */}
                          <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '100px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${progressPct}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #818cf8 0%, #a855f7 50%, #c084fc 100%)',
                              borderRadius: '100px',
                              boxShadow: '0 0 10px rgba(168, 85, 247, 0.5)',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>

                          <span style={{ fontSize: isMusicStandMode ? '0.88rem' : '0.80rem', color: '#64748b', fontWeight: 650 }}>
                            {isMax ? 'Großmeister-Status erreicht! 🏆' : `Noch ${minsToNext} Min. konzentriert üben zum Freischalten!`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Optional: Eltern-Geführt Modus 1-Klick */}
                  {(studentUser?.campus_usage_mode === 'eltern_geführt' || studentUser?.app_usage_mode === 'eltern_geführt') && (
                    <div style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1.5px solid #bbf7d0',
                      borderRadius: '20px',
                      padding: '16px 20px',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: '0 4px 15px rgba(52, 168, 83, 0.06)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          👨‍👩‍👧 1-Klick Übezeit eintragen (Eltern-Modus)
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {[3, 5, 10].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => logParentGuidedPractice(mins)}
                            style={{
                              background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '10px',
                              fontSize: '0.82rem',
                              fontWeight: 900,
                              cursor: 'pointer'
                            }}
                            className="hover-scale"
                          >
                            {mins} Min
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Junior Practice Settings Modal (Anker & Zaubertöne) */}
                  {showJuniorPracticeSettingsModal && createPortal(
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 10005,
                        background: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                      }}
                      onClick={() => setShowJuniorPracticeSettingsModal(false)}
                    >
                      <div
                        style={{
                          background: '#ffffff',
                          borderRadius: '24px',
                          maxWidth: '460px',
                          width: '100%',
                          padding: '24px',
                          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '18px',
                          border: '1px solid #e2e8f0'
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Settings size={18} color="#15803d" />
                            <h3 style={{ margin: 0, fontSize: '1.10rem', fontWeight: 900, color: '#0f172a' }}>
                              Übe-Einstellungen
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowJuniorPracticeSettingsModal(false)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', minWidth: '36px', minHeight: '36px' }}
                          >
                            <X size={20} />
                          </button>
                        </div>

                        {/* Anker-Einstellung */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 850, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Target size={15} color="#15803d" /> Dein persönlicher Übe-Anker:
                          </span>
                          <div style={{
                            background: '#f8fafc',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.82rem',
                            color: '#334155'
                          }}>
                            {practiceAnchor ? `„${practiceAnchor}“` : 'Noch kein Anker festgelegt.'}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPracticeAnchor(null);
                              setShowJuniorPracticeSettingsModal(false);
                            }}
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '10px',
                              padding: '10px 14px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              color: '#334155',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              minHeight: '44px',
                              touchAction: 'manipulation'
                            }}
                          >
                            <Edit3 size={14} /> Anker neu einstellen
                          </button>
                        </div>

                        {/* Zaubertöne */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 850, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Bell size={15} color="#15803d" /> Zaubertöne testen:
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => playMilestoneSound(1)}
                              style={{ background: '#e6f4ea', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 8px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', color: '#15803d', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', minHeight: '44px', touchAction: 'manipulation' }}
                            >
                              <Bell size={13} /> Glocke
                            </button>
                            <button
                              type="button"
                              onClick={() => playMilestoneSound(2)}
                              style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '10px', padding: '10px 8px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', color: '#4338ca', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', minHeight: '44px', touchAction: 'manipulation' }}
                            >
                              <Music size={13} /> Harfe
                            </button>
                            <button
                              type="button"
                              onClick={() => playMilestoneSound(3)}
                              style={{ background: '#f3e8ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '10px 8px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', color: '#7e22ce', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', minHeight: '44px', touchAction: 'manipulation' }}
                            >
                              <Sparkles size={13} /> Akkord
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowJuniorPracticeSettingsModal(false)}
                          style={{
                            background: '#15803d',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px',
                            fontSize: '0.86rem',
                            fontWeight: 850,
                            cursor: 'pointer',
                            marginTop: '6px',
                            minHeight: '44px',
                            touchAction: 'manipulation'
                          }}
                        >
                          Fertig
                        </button>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* 🌌 JUNIOR FULLSCREEN ZEN SPACE MISSION STAGE (REIZENTZUG & RAKETEN-PHYSIK) */}
            {/* ========================================================================= */}
            {studentUiLevel === 'junior' && (juniorMissionPhase === 'zen' || juniorMissionPhase === 'celebrating') && (() => {
              const streak = avatar?.streak_flame || 0;
              const targetMins = getTargetMinutes(streak);
              const targetSeconds = targetMins * 60;
              const elapsedSecs = secondsElapsedRef.current || secondsElapsed;
              const isGoalReached = elapsedSecs >= targetSeconds;
              const currentMins = Math.floor(elapsedSecs / 60);
              const currentSecs = elapsedSecs % 60;
              const remainingSecs = Math.max(0, targetSeconds - elapsedSecs);
              const minsLeft = Math.floor(remainingSecs / 60);
              const secsLeft = remainingSecs % 60;
              const bonusSecs = Math.max(0, elapsedSecs - targetSeconds);
              const bonusMins = Math.floor(bonusSecs / 60);
              const bonusSecsRemain = bonusSecs % 60;

              const missionInfo = getJuniorMissionDetails();
              const rawInst = (studentUser?.instrument || '').trim();
              const isFeminineInst = rawInst ? ['gitarre', 'e-gitarre', 'flöte', 'querflöte', 'blockflöte', 'trompete', 'geige', 'violine', 'posaune', 'klarinette', 'harfe', 'bratsche', 'tuba', 'mundharmonika', 'ukulele'].some(w => rawInst.toLowerCase().includes(w)) : false;
              const instrumentLabel = rawInst ? (isFeminineInst ? `Deine ${rawInst}` : `Dein ${rawInst}`) : 'Dein Instrument';

              return createPortal(
                <div
                  id="junior-space-mission-portal"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 100002,
                    background: '#04020a',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    userSelect: 'none',
                    WebkitUserSelect: 'none'
                  }}
                >
                  {/* Keyframe Animations for Zen Space Mission */}
                  <style>{`
                    @keyframes zenBreathNebula {
                      0%, 100% { opacity: 0.35; transform: scale(0.97); }
                      50% { opacity: 0.65; transform: scale(1.03); }
                    }
                    @keyframes zenRocketHover {
                      0%, 100% { transform: translateY(-7px); }
                      50% { transform: translateY(7px); }
                    }
                    @keyframes warpSpeedLines {
                      0% { transform: translateY(-100vh); opacity: 0; }
                      20% { opacity: 0.85; }
                      80% { opacity: 0.85; }
                      100% { transform: translateY(100vh); opacity: 0; }
                    }
                    @keyframes nebulaColorBloom {
                      0% { transform: scale(0.6); opacity: 0; filter: blur(35px); }
                      50% { opacity: 0.9; filter: blur(12px); }
                      100% { transform: scale(1.3); opacity: 0.55; filter: blur(0px); }
                    }
                    @keyframes rocketSputterShake {
                      0%, 100% { transform: translate(0, 0) rotate(0deg); }
                      20% { transform: translate(-5px, 2px) rotate(-4deg); }
                      40% { transform: translate(5px, -2px) rotate(4deg); }
                      60% { transform: translate(-4px, -1px) rotate(-2deg); }
                      80% { transform: translate(4px, 1px) rotate(2deg); }
                    }
                    @keyframes smokePuffAnim {
                      0% { transform: scale(0.4) translateY(0); opacity: 0.85; }
                      50% { transform: scale(1.3) translateY(14px); opacity: 0.6; }
                      100% { transform: scale(2.2) translateY(28px); opacity: 0; }
                    }
                    @keyframes thrusterFlamePulse {
                      0%, 100% { transform: scaleY(1); opacity: 0.92; }
                      50% { transform: scaleY(1.35) scaleX(1.06); opacity: 1; filter: drop-shadow(0 0 24px #c084fc); }
                    }
                    @keyframes rocketOrbitLaunchAnim {
                      0% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
                      15% { transform: translateY(14px) scale(0.95) rotate(-2deg); }
                      35% { transform: translateY(-70px) scale(1.08) rotate(5deg); }
                      65% { transform: translate(110px, -380px) scale(0.90) rotate(25deg); }
                      85% { transform: translate(190px, -720px) scale(0.60) rotate(50deg); opacity: 0.85; }
                      100% { transform: translate(260px, -1150px) scale(0.30) rotate(65deg); opacity: 0; }
                    }
                    @keyframes rocketHyperspaceLaunchAnim {
                      0% { transform: translateY(0) scale(1); opacity: 1; filter: drop-shadow(0 0 15px rgba(129, 140, 248, 0.6)); }
                      15% { transform: translateY(16px) scale(0.94); filter: drop-shadow(0 0 25px #818cf8); }
                      35% { transform: translateY(-60px) scale(1.2); filter: drop-shadow(0 0 45px #c084fc); }
                      70% { transform: translateY(-480px) scale(1.6); filter: drop-shadow(0 0 70px #e879f9); opacity: 0.95; }
                      100% { transform: translateY(-1500px) scale(3.2); opacity: 0; filter: drop-shadow(0 0 110px #ffffff); }
                    }
                    @keyframes victoryCardSlideUp {
                      0% { transform: translateY(60px) scale(0.92); opacity: 0; }
                      100% { transform: translateY(0) scale(1); opacity: 1; }
                    }
                    .junior-zen-bg {
                      background: #000000;
                      transition: background 2.5s ease;
                    }
                    .junior-orbit-glow-bg {
                      background: linear-gradient(160deg, #090514 0%, #1e103a 35%, #2e1065 70%, #150928 100%);
                      transition: background 2.5s ease;
                    }
                    .junior-celebrating-bg {
                      background: linear-gradient(160deg, #090514 0%, #1e103a 35%, #2e1065 70%, #150928 100%);
                      transition: background 0.8s ease;
                    }
                  `}</style>

                  {/* Background Cosmic Canvas: Pure Deep Black during Zen Focus Phase (Zero Distraction), Cosmic Awakening upon Goal Reach or Celebration */}
                  <div
                    className={juniorMissionPhase === 'zen' ? (isGoalReached ? 'junior-orbit-glow-bg' : 'junior-zen-bg') : 'junior-celebrating-bg'}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      zIndex: 0,
                      overflow: 'hidden'
                    }}
                  >
                    {/* Nebula Glow & Twinkling Stars ONLY active when goal is reached or in celebration (Zero distraction during focus) */}
                    {(isGoalReached || juniorMissionPhase === 'celebrating') && (
                      <>
                        {/* Centered Cosmic Nebula Glow */}
                        <div style={{
                          position: 'absolute',
                          top: '30%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '640px',
                          height: '460px',
                          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(99, 102, 241, 0.18) 50%, rgba(0,0,0,0) 75%)',
                          borderRadius: '50%',
                          animation: 'zenBreathNebula 6s ease-in-out infinite'
                        }} />

                        {/* Twinkling Stars */}
                        {[
                          { top: '10%', left: '12%', size: 8, delay: '0s', color: '#fde047' },
                          { top: '18%', right: '15%', size: 10, delay: '1.2s', color: '#c084fc' },
                          { top: '35%', left: '8%', size: 9, delay: '0.7s', color: '#818cf8' },
                          { top: '45%', right: '10%', size: 8, delay: '1.8s', color: '#fde047' },
                          { top: '70%', left: '14%', size: 10, delay: '2.3s', color: '#e879f9' },
                          { top: '80%', right: '16%', size: 7, delay: '0.4s', color: '#a78bfa' },
                          { top: '12%', left: '46%', size: 6, delay: '1.5s', color: '#ffffff' },
                          { top: '28%', right: '35%', size: 9, delay: '2.0s', color: '#fde047' }
                        ].map((star, i) => (
                          <div
                            key={i}
                            style={{
                              position: 'absolute',
                              top: star.top,
                              left: star.left,
                              right: star.right,
                              width: `${star.size}px`,
                              height: `${star.size}px`,
                              animation: `cosmicTwinkle 3s ease-in-out infinite ${star.delay}`,
                              pointerEvents: 'none'
                            }}
                          >
                            <svg width={star.size} height={star.size} viewBox="0 0 24 24" fill={star.color}>
                              <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
                            </svg>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Warp Speed Lines during Tier 3 Celebration */}
                    {juniorMissionPhase === 'celebrating' && juniorMissionTier === 3 && (
                      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                        {Array.from({ length: 22 }).map((_, idx) => {
                          const leftPct = (idx * 4.5) + ((idx % 5) * 0.4);
                          const animDelay = (idx * 0.12) % 1.5;
                          const animDur = 0.55 + (idx % 4) * 0.12;
                          return (
                            <div
                              key={idx}
                              style={{
                                position: 'absolute',
                                left: `${leftPct}%`,
                                top: 0,
                                width: idx % 3 === 0 ? '2.5px' : '1.5px',
                                height: '140px',
                                background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #c084fc 40%, #ffffff 80%, rgba(255,255,255,0) 100%)',
                                borderRadius: '100px',
                                animation: `warpSpeedLines ${animDur}s linear infinite ${animDelay}s`,
                                boxShadow: '0 0 8px #a855f7'
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ========================================================================= */}
                  {/* PHASE 2: ZEN STAGE (DÄMPFUNG & REIZENTZUG AM INSTRUMENT)                 */}
                  {/* ========================================================================= */}
                  {juniorMissionPhase === 'zen' && (
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        width: '100%',
                        maxWidth: '440px',
                        margin: '0 auto',
                        height: '100%',
                        maxHeight: '100dvh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMusicStandMode ? '20px 18px 24px 18px' : '16px 16px 20px 16px',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                      }}
                    >
                      {/* ========================================================================= */}
                      {/* MASKE 2: START-COUNTDOWN (3-2-1 ZÜNDUNGS-SEQUENZ AM INSTRUMENT)            */}
                      {/* ========================================================================= */}
                      {juniorMissionCountdown !== null ? (
                        <div style={{
                          position: 'relative',
                          zIndex: 10,
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '24px',
                          padding: '24px',
                          textAlign: 'center',
                          boxSizing: 'border-box'
                        }}>
                          <div style={{
                            width: '170px',
                            height: '170px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.22) 0%, rgba(245, 158, 11, 0.06) 60%, rgba(0,0,0,0) 80%)',
                            border: '3px solid rgba(253, 224, 71, 0.55)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 45px rgba(245, 158, 11, 0.45)',
                            animation: 'countInPulse 0.5s ease-out'
                          }}>
                            <span style={{
                              fontSize: '5.5rem',
                              fontWeight: 950,
                              color: '#fbbf24',
                              fontFamily: "'Plus Jakarta Sans', 'Urbanist', sans-serif",
                              lineHeight: 1,
                              textShadow: '0 0 35px rgba(251, 191, 36, 0.85)'
                            }}>
                              {juniorMissionCountdown}
                            </span>
                          </div>

                          <div style={{
                            background: 'rgba(255, 255, 255, 0.10)',
                            border: '1.5px solid rgba(255, 255, 255, 0.25)',
                            borderRadius: '100px',
                            padding: '8px 22px',
                            color: '#ffffff',
                            fontSize: '1.05rem',
                            fontWeight: 850,
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
                          }}>
                            Mache {instrumentLabel} bereit... 🎶
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* ========================================================================= */}
                          {/* MASKE 3: ZEN-STAGE FOKUS-TIMER (SMARTPHONE-OPTIMIERT AM INSTRUMENT)       */}
                          {/* ========================================================================= */}
                          
                          {/* ZONE A: APPLE UNIFIED MUSIC STAND HUD (STATUS + EDITORIAL HAUSAUFGABEN) */}
                          <div style={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            background: 'rgba(255, 255, 255, 0.025)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            borderRadius: '20px',
                            padding: '10px 14px',
                            boxSizing: 'border-box'
                          }}>
                            {/* Obere HUD-Zeile: Status-Kapsel links + Taktile Apple-Buttons rechts */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              gap: '10px',
                              paddingBottom: (missionInfo.books?.length || missionInfo.songs?.length || missionInfo.teacherNote) ? '8px' : '0',
                              borderBottom: (missionInfo.books?.length || missionInfo.songs?.length || missionInfo.teacherNote) ? '1px solid rgba(255, 255, 255, 0.06)' : 'none'
                            }}>
                              {/* Left: 🟢 Fokus-Zeit Badge mit zartem Glow */}
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(34, 197, 94, 0.12)',
                                border: '1px solid rgba(74, 222, 128, 0.3)',
                                borderRadius: '100px',
                                padding: '5px 12px',
                                fontSize: '0.82rem',
                                fontWeight: 850,
                                color: '#86efac'
                              }}>
                                <span style={{
                                  width: '7px',
                                  height: '7px',
                                  borderRadius: '50%',
                                  background: '#22c55e',
                                  boxShadow: '0 0 8px #22c55e',
                                  display: 'inline-block'
                                }} />
                                <span>Fokus-Zeit</span>
                              </div>

                              {/* Right: Apple Music Pro-Kids Liquid Glass Capsules */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isGoalReached ? (
                                  <button
                                    type="button"
                                    onClick={handleFinishJuniorMission}
                                    style={{
                                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.35) 100%)',
                                      border: '1.5px solid rgba(253, 224, 71, 0.7)',
                                      backdropFilter: 'blur(20px)',
                                      WebkitBackdropFilter: 'blur(20px)',
                                      borderRadius: '100px',
                                      height: '40px',
                                      padding: '0 18px',
                                      color: '#fef08a',
                                      fontSize: '0.90rem',
                                      fontWeight: 950,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '7px',
                                      boxShadow: '0 0 16px rgba(245, 158, 11, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)',
                                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                    }}
                                    className="hover-scale"
                                  >
                                    <span>Abschließen</span>
                                    <Star size={15} fill="#fef08a" color="#fef08a" />
                                  </button>
                                ) : (
                                  <>
                                    {/* ⏸️ Pause (Apple Music Frosted Glass Capsule) */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsJuniorMissionPaused(true);
                                        isJuniorMissionPausedRef.current = true;
                                      }}
                                      style={{
                                        background: 'rgba(255, 255, 255, 0.10)',
                                        border: '1px solid rgba(255, 255, 255, 0.18)',
                                        backdropFilter: 'blur(20px)',
                                        WebkitBackdropFilter: 'blur(20px)',
                                        borderRadius: '100px',
                                        height: '40px',
                                        padding: '0 16px',
                                        color: '#f8fafc',
                                        fontSize: '0.86rem',
                                        fontWeight: 900,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '7px',
                                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                      }}
                                      className="hover-scale"
                                    >
                                      <Pause size={14} fill="#f8fafc" color="#f8fafc" />
                                      <span>Pause</span>
                                    </button>

                                    {/* ⏹️ Beenden (Apple Music Coral-Glass Capsule - Beruhigt & Stressfrei) */}
                                    <button
                                      type="button"
                                      onClick={handleFinishJuniorMission}
                                      style={{
                                        background: 'rgba(239, 68, 68, 0.16)',
                                        border: '1px solid rgba(248, 113, 113, 0.38)',
                                        backdropFilter: 'blur(20px)',
                                        WebkitBackdropFilter: 'blur(20px)',
                                        borderRadius: '100px',
                                        height: '40px',
                                        padding: '0 16px',
                                        color: '#fca5a5',
                                        fontSize: '0.86rem',
                                        fontWeight: 900,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '7px',
                                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.2)',
                                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                      }}
                                      className="hover-scale"
                                      title="Übung beenden und deine Übe-Zeit als XP sichern"
                                    >
                                      <Square size={13} fill="#fca5a5" color="#fca5a5" />
                                      <span>Beenden</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Bücher-Liste (Offen, freie Typografie, keine Kasten-in-Kasten Rahmen) */}
                            {missionInfo.books && missionInfo.books.length > 0 && missionInfo.books.map((b: any, bIdx: number) => {
                              const pageNums = b.pageNums || [];
                              return (
                                <div key={`zen-b-${bIdx}`} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '10px',
                                  padding: '3px 2px',
                                  background: 'transparent',
                                  border: 'none'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                    <div style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '7px',
                                      background: '#fee2e2',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#dc2626',
                                      flexShrink: 0
                                    }}>
                                      <BookOpen size={13} strokeWidth={2.4} />
                                    </div>
                                    <span style={{
                                      fontSize: '0.90rem',
                                      fontWeight: 850,
                                      color: '#f8fafc',
                                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                                      whiteSpace: 'nowrap',
                                      textOverflow: 'ellipsis',
                                      overflow: 'hidden'
                                    }}>
                                      {b.title}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                    {pageNums.map((pNum: any) => (
                                      <span key={`p-${pNum}`} style={{
                                        background: '#dcfce7',
                                        color: '#15803d',
                                        fontSize: '0.76rem',
                                        fontWeight: 900,
                                        padding: '2px 7px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(134, 239, 172, 0.6)',
                                        flexShrink: 0
                                      }}>
                                        S. {pNum}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Songs-Liste (Offen, freie Typografie, keine Kasten-in-Kasten Rahmen) */}
                            {missionInfo.songs && missionInfo.songs.length > 0 && missionInfo.songs.map((s: any, sIdx: number) => {
                              const songTitle = (s.topic_name || s.title || '').replace(/\s*\([^)]*\)\s*$/, '');
                              return (
                                <div key={`zen-s-${sIdx}`} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '10px',
                                  padding: '3px 2px',
                                  background: 'transparent',
                                  border: 'none'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                    <div style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '7px',
                                      background: '#ede9fe',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#7c3aed',
                                      flexShrink: 0
                                    }}>
                                      <Music size={13} strokeWidth={2.4} />
                                    </div>
                                    <span style={{
                                      fontSize: '0.90rem',
                                      fontWeight: 850,
                                      color: '#f8fafc',
                                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                                      whiteSpace: 'nowrap',
                                      textOverflow: 'ellipsis',
                                      overflow: 'hidden'
                                    }}>
                                      {songTitle}
                                    </span>
                                  </div>
                                  {s.homework_notes && (
                                    <span style={{
                                      fontSize: '0.74rem',
                                      color: '#94a3b8',
                                      fontWeight: 650,
                                      whiteSpace: 'nowrap',
                                      textOverflow: 'ellipsis',
                                      overflow: 'hidden',
                                      maxWidth: '130px'
                                    }}>
                                      {s.homework_notes}
                                    </span>
                                  )}
                                </div>
                              );
                            })}

                            {/* Fallback bei freiem Üben */}
                            {(!missionInfo.books || missionInfo.books.length === 0) && (!missionInfo.songs || missionInfo.songs.length === 0) && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '4px 2px',
                                background: 'transparent',
                                border: 'none'
                              }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '7px',
                                  background: '#ede9fe',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#7c3aed',
                                  flexShrink: 0
                                }}>
                                  <Sparkles size={13} />
                                </div>
                                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#e2e8f0' }}>
                                  Freies Üben &amp; Entdecken
                                </span>
                              </div>
                            )}

                            {/* Lehrkraft-Tipp Zitatzeile (Dezent integriert ohne Kasten) */}
                            {missionInfo.teacherNote && (
                              <div 
                                onClick={() => setShowJuniorCheatSheet(prev => !prev)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 2px 2px 2px',
                                  borderTop: (missionInfo.books?.length || missionInfo.songs?.length) ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                                  fontSize: '0.78rem',
                                  color: '#94a3b8',
                                  fontWeight: 600,
                                  lineHeight: 1.3,
                                  cursor: 'pointer'
                                }}
                                title="Tipp antippen für Spickzettel-Ansicht"
                              >
                                <Lightbulb size={13} color="#fcd34d" style={{ flexShrink: 0 }} />
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#cbd5e1' }}>
                                  „{missionInfo.teacherNote}“
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Spickzettel-Popup (Non-disruptiv: Timer läuft ruhig weiter) */}
                          {showJuniorCheatSheet && (
                            <div style={{
                              position: 'absolute',
                              top: '70px',
                              left: '16px',
                              right: '16px',
                              maxWidth: '400px',
                              margin: '0 auto',
                              background: 'rgba(15, 23, 42, 0.96)',
                              backdropFilter: 'blur(20px)',
                              border: '2px solid rgba(165, 180, 252, 0.45)',
                              borderRadius: '24px',
                              padding: '20px 22px',
                              boxShadow: '0 24px 50px rgba(0,0,0,0.7)',
                              zIndex: 20,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fcd34d', fontWeight: 900, fontSize: '0.94rem' }}>
                                  <Lightbulb size={18} />
                                  <span>Tipp von deiner Lehrkraft</span>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => setShowJuniorCheatSheet(false)}
                                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex' }}
                                >
                                  <X size={18} />
                                </button>
                              </div>
                              <p style={{ margin: 0, fontSize: '1.00rem', color: '#f8fafc', lineHeight: 1.5, fontWeight: 650 }}>
                                „{missionInfo.teacherNote}“
                              </p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.12)', fontSize: '0.84rem', color: '#a5b4fc' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                  <Clock size={13} color="#a5b4fc" /> Timer läuft weiter
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowJuniorCheatSheet(false)}
                                  style={{
                                    background: 'rgba(99, 102, 241, 0.35)',
                                    border: '1.5px solid #818cf8',
                                    borderRadius: '100px',
                                    color: '#ffffff',
                                    padding: '6px 16px',
                                    fontSize: '0.86rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    minHeight: '36px',
                                    touchAction: 'manipulation'
                                  }}
                                >
                                  <CheckCircle size={14} />
                                  <span>Verstanden</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ZONE B: MONUMENTALER ORBIT-REAKTOR (ZENTRUM - ZERO DISTRACTION) */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            textAlign: 'center',
                            margin: 'auto 0'
                          }}>
                            {/* 240px Orbit-Reaktor Ring (Keine Rakete während der Übezeit) */}
                            <div style={{
                              position: 'relative',
                              width: isMusicStandMode ? '260px' : '230px',
                              height: isMusicStandMode ? '260px' : '230px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              background: isGoalReached
                                ? 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(168, 85, 247, 0.06) 50%, rgba(0,0,0,0) 75%)'
                                : 'rgba(255, 255, 255, 0.02)',
                              transition: 'background 2s ease'
                            }}>
                              {/* SVG Orbit-Reaktor Ring */}
                              <svg
                                width={isMusicStandMode ? '260' : '230'}
                                height={isMusicStandMode ? '260' : '230'}
                                viewBox="0 0 280 280"
                                style={{ transform: 'rotate(-90deg)', overflow: 'visible', position: 'absolute', inset: 0 }}
                              >
                                <defs>
                                  <linearGradient id="reactorZenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#38bdf8" />
                                    <stop offset="50%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                  </linearGradient>
                                  <linearGradient id="reactorZenGradReached" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#fbbf24" />
                                    <stop offset="50%" stopColor="#ec4899" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                  </linearGradient>
                                </defs>
                                {/* Base Track */}
                                <circle
                                  cx="140"
                                  cy="140"
                                  r="124"
                                  fill="none"
                                  stroke="rgba(255, 255, 255, 0.08)"
                                  strokeWidth="10"
                                />
                                {/* Animated Orbit Progress Ring */}
                                <circle
                                  cx="140"
                                  cy="140"
                                  r="124"
                                  fill="none"
                                  stroke={isGoalReached ? 'url(#reactorZenGradReached)' : 'url(#reactorZenGrad)'}
                                  strokeWidth={isGoalReached ? '12' : '10'}
                                  strokeDasharray={2 * Math.PI * 124}
                                  strokeDashoffset={2 * Math.PI * 124 * (1 - Math.min(1, elapsedSecs / targetSeconds))}
                                  strokeLinecap="round"
                                  style={{
                                    transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 1.5s ease',
                                    filter: isGoalReached
                                      ? 'drop-shadow(0 0 16px rgba(251, 191, 36, 0.65))'
                                      : 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.40))'
                                  }}
                                />
                              </svg>

                              {/* Ziffern & Status-Pille im Inneren des Rings */}
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}>
                                <div style={{
                                  fontSize: isMusicStandMode ? '4.6rem' : '3.9rem',
                                  fontWeight: 950,
                                  color: isGoalReached ? '#fbbf24' : '#ffffff',
                                  letterSpacing: '-0.04em',
                                  lineHeight: 1,
                                  fontFamily: "'Urbanist', 'Plus Jakarta Sans', sans-serif",
                                  textShadow: isGoalReached
                                    ? '0 0 24px rgba(251, 191, 36, 0.5)'
                                    : '0 0 16px rgba(99, 102, 241, 0.30)',
                                  transition: 'color 1.5s ease, text-shadow 1.5s ease'
                                }}>
                                  {String(currentMins).padStart(2, '0')}:{String(currentSecs).padStart(2, '0')}
                                </div>

                                <div style={{
                                  fontSize: isMusicStandMode ? '0.94rem' : '0.84rem',
                                  fontWeight: 900,
                                  color: isGoalReached ? '#fde047' : '#e0e7ff',
                                  letterSpacing: '0.02em',
                                  background: isGoalReached ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.10)',
                                  border: isGoalReached ? '2px solid rgba(251, 191, 36, 0.6)' : '1.5px solid rgba(255, 255, 255, 0.20)',
                                  padding: isMusicStandMode ? '6px 16px' : '4px 14px',
                                  borderRadius: '100px',
                                  backdropFilter: 'blur(12px)',
                                  boxShadow: isGoalReached ? '0 0 20px rgba(245, 158, 11, 0.4)' : '0 4px 14px rgba(0,0,0,0.4)',
                                  transition: 'all 1.5s ease',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}>
                                  {!isGoalReached ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <Target size={13} color="#e0e7ff" /> Ziel: {String(targetMins).padStart(2, '0')}:00 Min.
                                    </span>
                                  ) : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <Star size={13} fill="#fbbf24" color="#fbbf24" /> Sternen-Ziel erreicht!
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Motivierende Missions-Sprache */}
                            <div style={{ maxWidth: '380px', padding: '0 8px' }}>
                              <p style={{
                                margin: 0,
                                fontSize: isMusicStandMode ? '1.02rem' : '0.90rem',
                                color: '#cbd5e1',
                                fontWeight: 700,
                                lineHeight: 1.35,
                                textShadow: '0 2px 8px rgba(0,0,0,0.7)'
                              }}>
                                „{instrumentLabel} lädt den Sternenantrieb! Höre genau auf deine Töne“
                              </p>
                            </div>
                          </div>

                          {/* ZONE C: ERGONOMISCHES 3D-AUDIO-DOCK (UNTEN) */}
                          {missionInfo.audioTracks && missionInfo.audioTracks.length > 0 ? (
                            <div style={{ width: '100%', maxWidth: '440px', zIndex: 12 }}>
                              <ZenPlayAlongDock 
                                tracks={missionInfo.audioTracks} 
                                initialIndex={juniorSelectedTrackIndex}
                                isMusicStandMode={isMusicStandMode} 
                                teacherName={studentUser?.teacher_name ? formatTeacherFullName(studentUser.teacher_name) : 'Deine Lehrkraft'}
                              />
                            </div>
                          ) : (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              color: 'rgba(255, 255, 255, 0.65)',
                              fontSize: '0.86rem',
                              fontWeight: 700,
                              background: 'rgba(255, 255, 255, 0.08)',
                              padding: '8px 18px',
                              borderRadius: '100px',
                              border: '1.5px solid rgba(255, 255, 255, 0.14)'
                            }}>
                              <Sparkles size={15} color="#c084fc" />
                              <span>Sternenenergie wird durch dein Spiel geladen</span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Tab-Lock Detox Pause Overlay (Wenn das Kind in einen anderen Tab wechselt) */}
                      {isJuniorTabPaused && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(9, 5, 20, 0.94)',
                          backdropFilter: 'blur(16px)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '32px',
                          textAlign: 'center',
                          zIndex: 10
                        }}>
                          <div style={{
                            width: '74px',
                            height: '74px',
                            borderRadius: '24px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '2px solid rgba(245, 158, 11, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '16px',
                            color: '#f59e0b'
                          }}>
                            <Pause size={34} />
                          </div>
                          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 950, color: '#ffffff' }}>
                            Mission pausiert
                          </h3>
                          <p style={{ margin: 0, maxWidth: '320px', fontSize: '0.96rem', color: '#cbd5e1', fontWeight: 650, lineHeight: 1.5 }}>
                            Bleib bei deinem Instrument! Der Übe-Timer wartet hier auf dich.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* PHASE 3: CELEBRATION STAGE (DYNAMISCHE 3-STUFEN RAKETEN-PHYSIK)           */}
                  {/* ========================================================================= */}
                  {/* ========================================================================= */}
                  {/* PHASE 3: CELEBRATION STAGE (DYNAMISCHE 2-PHASEN RAKETEN-PHYSIK)           */}
                  {/* ========================================================================= */}
                  {juniorMissionPhase === 'celebrating' && (() => {
                    const animFlightSec = (juniorCelebrationSummary?.flightDurationMs || 3400) / 1000;

                    return (
                      <>
                        {/* ========================================================================= */}
                        {/* PHASE 3A: CINEMATIC FULLSCREEN ROCKET LAUNCH (ACT 1)                      */}
                        {/* ========================================================================= */}
                        {juniorLaunchStage === 'launching' && (
                          <div
                            style={{
                              position: 'relative',
                              zIndex: 2,
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '24px',
                              boxSizing: 'border-box'
                            }}
                          >
                            {/* Center Space Rocket Physics Animation */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative'
                            }}>
                              {/* STUFE 1: Sputtering Rocket (Abbruch vor Zielzeit) */}
                              {juniorMissionTier === 1 && (
                                <div style={{
                                  position: 'relative',
                                  animation: 'rocketSputterShake 0.4s ease-in-out infinite',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center'
                                }}>
                                  <svg width="120" height="120" viewBox="0 0 80 90" fill="none" style={{ filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.5))', overflow: 'visible' }}>
                                    <path d="M26 48 L10 66 Q22 67 28 60 Z" fill="#6366f1" stroke="#4f46e5" strokeWidth="1.5" />
                                    <path d="M54 48 L70 66 Q58 67 52 60 Z" fill="#6366f1" stroke="#4f46e5" strokeWidth="1.5" />
                                    <path d="M40 8 C30 22 28 44 28 62 L52 62 C52 44 50 22 40 8 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                                    <path d="M40 8 C35 15 31 22 30 27 L50 27 C49 22 45 15 40 8 Z" fill="#818cf8" />
                                    <circle cx="40" cy="38" r="8.5" fill="#0369a1" stroke="#38bdf8" strokeWidth="2.5" />
                                    <circle cx="37.5" cy="35.5" r="3" fill="#ffffff" opacity="0.8" />
                                    <rect x="33" y="62" width="14" height="4" rx="2" fill="#1e1b4b" stroke="#4338ca" strokeWidth="1" />
                                  </svg>
                                  {/* Comic Smoke Puffs */}
                                  <div style={{ display: 'flex', gap: '10px', marginTop: '-12px', pointerEvents: 'none' }}>
                                    <span style={{ fontSize: '1.6rem', animation: 'smokePuffAnim 0.8s ease-out infinite' }}>💨</span>
                                    <span style={{ fontSize: '1.2rem', animation: 'smokePuffAnim 1.1s ease-out infinite 0.2s' }}>💨</span>
                                  </div>
                                </div>
                              )}

                              {/* STUFE 2: Powerful Orbit Launch (Zielzeit erreicht) */}
                              {juniorMissionTier === 2 && (
                                <div style={{
                                  position: 'relative',
                                  animation: `rocketOrbitLaunchAnim ${animFlightSec}s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center'
                                }}>
                                  <svg width="130" height="130" viewBox="0 0 80 90" fill="none" style={{ filter: 'drop-shadow(0 0 30px rgba(168, 85, 247, 0.75))', overflow: 'visible' }}>
                                    <defs>
                                      <linearGradient id="rocketBodyGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#f8fafc" />
                                        <stop offset="45%" stopColor="#ffffff" />
                                        <stop offset="100%" stopColor="#cbd5e1" />
                                      </linearGradient>
                                      <linearGradient id="rocketNoseGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#a855f7" />
                                        <stop offset="100%" stopColor="#6366f1" />
                                      </linearGradient>
                                      <linearGradient id="thrusterPlasmaGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#ffffff" />
                                        <stop offset="30%" stopColor="#38bdf8" />
                                        <stop offset="70%" stopColor="#c084fc" />
                                        <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
                                      </linearGradient>
                                      <linearGradient id="thrusterCoreGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#ffffff" />
                                        <stop offset="60%" stopColor="#e879f9" />
                                        <stop offset="100%" stopColor="rgba(232, 121, 249, 0)" />
                                      </linearGradient>
                                    </defs>

                                    {/* Dynamic Plasma Thruster Plume */}
                                    <g style={{ transformOrigin: '40px 64px', animation: 'thrusterFlamePulse 0.25s ease-in-out infinite alternate' }}>
                                      <path d="M26 64 Q40 108 40 112 Q40 108 54 64 Z" fill="url(#thrusterPlasmaGrad2)" opacity="0.85" />
                                      <path d="M31 64 Q40 96 40 98 Q40 96 49 64 Z" fill="url(#thrusterCoreGrad2)" />
                                      <path d="M35 64 Q40 82 40 84 Q40 82 45 64 Z" fill="#ffffff" />
                                    </g>

                                    {/* Wings / Fins */}
                                    <path d="M26 48 L10 66 Q22 67 28 60 Z" fill="#6366f1" stroke="#4f46e5" strokeWidth="1.5" />
                                    <path d="M54 48 L70 66 Q58 67 52 60 Z" fill="#6366f1" stroke="#4f46e5" strokeWidth="1.5" />
                                    {/* Body */}
                                    <path d="M40 8 C30 22 28 44 28 62 L52 62 C52 44 50 22 40 8 Z" fill="url(#rocketBodyGrad2)" stroke="#cbd5e1" strokeWidth="1.5" />
                                    {/* Nose */}
                                    <path d="M40 8 C35 15 31 22 30 27 L50 27 C49 22 45 15 40 8 Z" fill="url(#rocketNoseGrad2)" />
                                    {/* Portal */}
                                    <circle cx="40" cy="38" r="8.5" fill="#0369a1" stroke="#38bdf8" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 8px #38bdf8)' }} />
                                    <circle cx="37.5" cy="35.5" r="3" fill="#ffffff" opacity="0.85" />
                                    {/* Nozzle */}
                                    <rect x="33" y="62" width="14" height="4" rx="2" fill="#1e1b4b" stroke="#4338ca" strokeWidth="1" />
                                  </svg>
                                </div>
                              )}

                              {/* STUFE 3: Hyperspace Warp Speed (Bonus-Zeit gemeistert) */}
                              {juniorMissionTier === 3 && (
                                <div style={{
                                  position: 'relative',
                                  animation: `rocketHyperspaceLaunchAnim ${animFlightSec}s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center'
                                }}>
                                  <svg width="145" height="145" viewBox="0 0 80 90" fill="none" style={{ filter: 'drop-shadow(0 0 40px #e879f9)', overflow: 'visible' }}>
                                    <defs>
                                      <linearGradient id="rocketBodyGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#ffffff" />
                                        <stop offset="50%" stopColor="#e0e7ff" />
                                        <stop offset="100%" stopColor="#cbd5e1" />
                                      </linearGradient>
                                      <linearGradient id="rocketNoseGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#c084fc" />
                                        <stop offset="100%" stopColor="#a855f7" />
                                      </linearGradient>
                                      <linearGradient id="thrusterPlasmaGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#ffffff" />
                                        <stop offset="25%" stopColor="#38bdf8" />
                                        <stop offset="60%" stopColor="#c084fc" />
                                        <stop offset="100%" stopColor="rgba(232, 121, 249, 0)" />
                                      </linearGradient>
                                      <linearGradient id="thrusterCoreGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#ffffff" />
                                        <stop offset="50%" stopColor="#e879f9" />
                                        <stop offset="100%" stopColor="rgba(232, 121, 249, 0)" />
                                      </linearGradient>
                                    </defs>

                                    {/* Dual Hyper-Plasma Thruster Exhaust */}
                                    <g style={{ transformOrigin: '40px 64px', animation: 'thrusterFlamePulse 0.20s ease-in-out infinite alternate' }}>
                                      <path d="M22 64 Q40 124 40 128 Q40 124 58 64 Z" fill="url(#thrusterPlasmaGrad3)" opacity="0.9" />
                                      <path d="M28 64 Q40 108 40 110 Q40 108 52 64 Z" fill="url(#thrusterCoreGrad3)" />
                                      <path d="M33 64 Q40 92 40 94 Q40 92 47 64 Z" fill="#ffffff" />
                                    </g>

                                    {/* Wings / Fins */}
                                    <path d="M26 48 L8 68 Q22 69 28 60 Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="2" />
                                    <path d="M54 48 L72 68 Q58 69 52 60 Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="2" />
                                    {/* Body */}
                                    <path d="M40 8 C30 22 28 44 28 62 L52 62 C52 44 50 22 40 8 Z" fill="url(#rocketBodyGrad3)" stroke="#c084fc" strokeWidth="2" />
                                    {/* Nose */}
                                    <path d="M40 8 C35 15 31 22 30 27 L50 27 C49 22 45 15 40 8 Z" fill="url(#rocketNoseGrad3)" />
                                    {/* Portal */}
                                    <circle cx="40" cy="38" r="9" fill="#0284c7" stroke="#38bdf8" strokeWidth="3" style={{ filter: 'drop-shadow(0 0 12px #38bdf8)' }} />
                                    <circle cx="37" cy="35" r="3.5" fill="#ffffff" opacity="0.9" />
                                    {/* Nozzle */}
                                    <rect x="32" y="62" width="16" height="4.5" rx="2" fill="#1e1b4b" stroke="#7c3aed" strokeWidth="1.5" />
                                  </svg>
                                </div>
                              )}
                            </div>

                            {/* Cinematic Launch Telemetry Status Pill */}
                            <div style={{
                              marginTop: '32px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              backdropFilter: 'blur(16px)',
                              border: '1px solid rgba(165, 180, 252, 0.35)',
                              borderRadius: '100px',
                              padding: '10px 24px',
                              color: '#ffffff',
                              fontSize: '0.98rem',
                              fontWeight: 850,
                              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '10px'
                            }}>
                              <Sparkles size={18} color="#c084fc" />
                              <span>
                                {juniorMissionTier === 1 && 'Treibstoff gesammelt! Ein kleiner Probelauf'}
                                {juniorMissionTier === 2 && 'Missions-Ziel erreicht! Kurs auf die Sterne!'}
                                {juniorMissionTier === 3 && `INTERSTELLARER HYPERRAUM! +${juniorCelebrationSummary?.bonusMins || 0} Min. Bonus!`}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* ========================================================================= */}
                        {/* PHASE 3B: VICTORY SUMMARY CARD (ACT 2 - AFTER FLIGHT)                     */}
                        {/* ========================================================================= */}
                        {juniorLaunchStage === 'summary' && (
                          <div
                            style={{
                              position: 'relative',
                              zIndex: 2,
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '24px',
                              boxSizing: 'border-box'
                            }}
                          >
                            {/* Confetti for Tier 2 and Tier 3 */}
                            {juniorMissionTier >= 2 && (
                              <Suspense fallback={null}>
                                <Confetti
                                  width={typeof window !== 'undefined' ? window.innerWidth : 400}
                                  height={typeof window !== 'undefined' ? window.innerHeight : 800}
                                  recycle={false}
                                  numberOfPieces={juniorMissionTier === 3 ? 400 : 250}
                                  gravity={juniorMissionTier === 3 ? 0.14 : 0.20}
                                  colors={['#818cf8', '#a855f7', '#c084fc', '#e879f9', '#ffffff']}
                                />
                              </Suspense>
                            )}

                            {/* Victory / Mission Summary Card with Slide-Up */}
                            <div style={{
                              background: 'rgba(255, 255, 255, 0.95)',
                              backdropFilter: 'blur(20px)',
                              borderRadius: '32px',
                              border: '2px solid rgba(168, 85, 247, 0.35)',
                              padding: isMusicStandMode ? '36px 32px' : '28px 24px',
                              maxWidth: '460px',
                              width: '100%',
                              boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 35px rgba(168, 85, 247, 0.25)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              gap: '16px',
                              animation: 'victoryCardSlideUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                            }}>
                              <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '20px',
                                background: juniorMissionTier === 1 ? '#fee2e2' : (juniorMissionTier === 2 ? '#eef2ff' : '#fdf4ff'),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 8px 20px rgba(0,0,0,0.06)'
                              }}>
                                {juniorMissionTier === 1 && <Sparkles size={32} color="#ef4444" />}
                                {juniorMissionTier === 2 && <Star size={32} fill="#6366f1" color="#4338ca" />}
                                {juniorMissionTier === 3 && <Trophy size={32} color="#a855f7" />}
                              </div>

                              <h3 style={{
                                margin: 0,
                                fontSize: isMusicStandMode ? '1.55rem' : '1.38rem',
                                fontWeight: 950,
                                color: '#0f172a',
                                fontFamily: "'Plus Jakarta Sans', sans-serif"
                              }}>
                                {juniorMissionTier === 1 && 'Fast geschafft!'}
                                {juniorMissionTier === 2 && 'Missions-Ziel erreicht!'}
                                {juniorMissionTier === 3 && 'INTERSTELLARER HYPERRAUM!'}
                              </h3>

                              <p style={{
                                margin: 0,
                                fontSize: isMusicStandMode ? '1.05rem' : '0.94rem',
                                color: '#475569',
                                fontWeight: 650,
                                lineHeight: 1.5
                              }}>
                                {juniorCelebrationSummary?.message || 'Tolle Leistung an deinem Instrument!'}
                              </p>

                              {/* Badges / Rewards in Indigo/Purple Palette */}
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <span style={{
                                  background: '#eef2ff',
                                  border: '1px solid #c7d2fe',
                                  color: '#4338ca',
                                  padding: '6px 14px',
                                  borderRadius: '100px',
                                  fontSize: '0.86rem',
                                  fontWeight: 900,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <Star size={15} fill="#4338ca" />
                                  <span>+{juniorCelebrationSummary?.xpGained || 50} XP gesichert</span>
                                </span>

                                {juniorMissionTier >= 2 && (
                                  <span style={{
                                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                                    border: '1px solid #fcd34d',
                                    color: '#92400e',
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    fontSize: '0.86rem',
                                    fontWeight: 900,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)'
                                  }}>
                                    <Star size={15} fill="#f59e0b" color="#b45309" style={{ filter: 'drop-shadow(0 0 5px rgba(245, 158, 11, 0.7))' }} />
                                    <span>Wochen-Stern entzündet</span>
                                  </span>
                                )}
                              </div>

                              {/* Return to Base Button */}
                              <button
                                type="button"
                                onClick={handleCloseJuniorCelebration}
                                style={{
                                  width: '100%',
                                  minHeight: '52px',
                                  borderRadius: '20px',
                                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '1.10rem',
                                  fontWeight: 950,
                                  cursor: 'pointer',
                                  marginTop: '8px',
                                  boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '10px'
                                }}
                                className="hover-scale"
                              >
                                <Rocket size={20} />
                                <span>Zurück zur Basis</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* ========================================================================= */}
                  {/* ⏸️ JUNIOR MISSION PAUSE OVERLAY (STRESSFREIE VERSCHNAUFPAUSE)               */}
                  {/* ========================================================================= */}
                  {isJuniorMissionPaused && (
                    <div style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(5, 3, 15, 0.88)',
                      backdropFilter: 'blur(20px)',
                      zIndex: 100005,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '24px'
                    }}>
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '32px',
                        maxWidth: '440px',
                        width: '100%',
                        padding: '32px 28px',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '20px'
                      }}>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '20px',
                          background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                          color: '#4f46e5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 8px 20px rgba(79, 70, 229, 0.2)'
                        }}>
                          <Pause size={30} fill="currentColor" />
                        </div>

                        <div>
                          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Kurze Verschnaufpause
                          </h3>
                          <p style={{ margin: 0, fontSize: '0.94rem', color: '#64748b', fontWeight: 650, lineHeight: 1.45 }}>
                            Keine Eile! Dein Fortschritt ist sicher aufgehoben.
                          </p>
                        </div>

                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '16px',
                          padding: '12px 18px',
                          width: '100%',
                          boxSizing: 'border-box',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          border: '1px solid #e2e8f0'
                        }}>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Bisher geübt</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 950, color: '#0f172a' }}>
                              {Math.floor(elapsedSecs / 60)} Min. {elapsedSecs % 60} Sek.
                            </div>
                          </div>
                          <span style={{
                            background: '#ede9fe',
                            color: '#6d28d9',
                            padding: '5px 12px',
                            borderRadius: '100px',
                            fontSize: '0.82rem',
                            fontWeight: 900,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>Noch {Math.max(1, Math.ceil((targetSeconds - elapsedSecs) / 60))} Min. bis</span>
                            <Star size={12} fill="#6d28d9" color="#6d28d9" />
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setIsJuniorMissionPaused(false);
                              isJuniorMissionPausedRef.current = false;
                            }}
                            style={{
                              width: '100%',
                              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '20px',
                              padding: '16px',
                              fontWeight: 950,
                              fontSize: '1.05rem',
                              cursor: 'pointer',
                              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              minHeight: '48px',
                              touchAction: 'manipulation'
                            }}
                            className="hover-scale"
                          >
                            <Play size={18} fill="white" />
                            <span>Weiterfliegen &amp; Üben</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsJuniorMissionPaused(false);
                              isJuniorMissionPausedRef.current = false;
                              handleFinishJuniorMission();
                            }}
                            style={{
                              width: '100%',
                              background: 'transparent',
                              color: '#64748b',
                              border: '1px solid #cbd5e1',
                              borderRadius: '16px',
                              padding: '12px',
                              fontWeight: 850,
                              fontSize: '0.90rem',
                              cursor: 'pointer',
                              minHeight: '44px',
                              touchAction: 'manipulation'
                            }}
                          >
                            Üben für heute beenden
                          </button>

                          <button
                            type="button"
                            onClick={handleEmergencyExitJuniorMission}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              fontSize: '0.82rem',
                              fontWeight: 750,
                              cursor: 'pointer',
                              padding: '8px',
                              minHeight: '40px',
                              touchAction: 'manipulation'
                            }}
                          >
                            Ohne Speichern verlassen
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 🛡️ Fail-Safe Fallback: Falls weder Zen noch Celebrating aktiv sind */}
                  {juniorMissionPhase !== 'zen' && juniorMissionPhase !== 'celebrating' && (
                    <div style={{
                      position: 'relative',
                      zIndex: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '16px',
                      padding: '32px',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.30)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#818cf8'
                      }}>
                        <Rocket size={32} />
                      </div>
                      <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.3rem', fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Bereit für die nächste Mission
                      </h3>
                      <button
                        type="button"
                        onClick={handleEmergencyExitJuniorMission}
                        style={{
                          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '100px',
                          padding: '12px 28px',
                          fontSize: '1rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)'
                        }}
                        className="hover-scale"
                      >
                        Zurück zum Dashboard
                      </button>
                    </div>
                  )}
                </div>,
                document.body
              );
            })()}

            
            
            {/* ========================================================================= */}
            {/* ⚡ TEEN FLOW: THE ACOUSTIC LOUNGE (11–15 JAHRE) - 1:1 JUNIOR PARITÄT     */}
            {/* ========================================================================= */}
            {studentUiLevel === 'teen' && (() => {
              const streak = avatar?.streak_flame || 0;
              const targetMins = getTargetMinutes(streak);
              const targetSeconds = targetMins * 60;
              const weekMetrics = getDeterministicWeekMetrics();
              const { weekDays, weekPracticedCount } = weekMetrics;
              const elapsedSecs = secondsElapsedRef.current || secondsElapsed;
              const isGoalReached = elapsedSecs >= targetSeconds;
              const currentMins = Math.floor(elapsedSecs / 60);
              const currentSecs = elapsedSecs % 60;
              const effMins = effectivePracticeMinutes;

              let xpVal = avatar?.xp || 0;
              try {
                const localStats = JSON.parse(localStorage.getItem(`cg_offline_stats_${studentId}`) || '{}');
                if (localStats.current_xp) xpVal = Math.max(xpVal, localStats.current_xp);
                const localPractice = JSON.parse(localStorage.getItem(`cg_offline_practice_${studentId}`) || '{}');
                if (localPractice.xp) xpVal = Math.max(xpVal, localPractice.xp);
              } catch (e) {}
              let nextStickerName = 'Fleiß-Pionier';
              let targetMin = 20;
              let prevMin = 0;
              let stickerIcon = '🐝';
              let stickerId = 'fleiss-pionier';
              if (effMins >= 500) {
                nextStickerName = 'Übe-Großmeister';
                targetMin = 1500;
                prevMin = 500;
                stickerIcon = '🏆';
                stickerId = 'uebe-grossmeister';
              } else if (effMins >= 100) {
                nextStickerName = 'Übe-Legende';
                targetMin = 500;
                prevMin = 100;
                stickerIcon = '👑';
                stickerId = 'uebe-legende';
              } else if (effMins >= 20) {
                nextStickerName = 'Übe-Meister';
                targetMin = 100;
                prevMin = 20;
                stickerIcon = '🦉';
                stickerId = 'uebe-meister';
              }
              const isMax = effMins >= 1500;
              const progressPct = isMax ? 100 : Math.min(100, Math.max(0, ((effMins - prevMin) / (targetMin - prevMin)) * 100));
              const minsToNext = Math.max(1, targetMin - effMins);

              const missionInfo = getJuniorMissionDetails();
              const rawInst = (studentUser?.instrument || '').trim();
              const isFeminineInst = rawInst ? ['gitarre', 'e-gitarre', 'flöte', 'querflöte', 'blockflöte', 'trompete', 'geige', 'violine', 'posaune', 'klarinette', 'harfe', 'bratsche', 'tuba', 'mundharmonika', 'ukulele'].some(w => rawInst.toLowerCase().includes(w)) : false;
              const instrumentLabel = rawInst ? (isFeminineInst ? `Deine ${rawInst}` : `Dein ${rawInst}`) : 'Dein Instrument';

              // =========================================================================
              // 🎧 WENN SESSION AKTIV IST -> IMMERSIVE TEEN FOCUS STAGE
              // =========================================================================
              if (sessionActive) {
                return createPortal(
                  <div
                    id="teen-flow-mission-portal"
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 100002,
                      background: 'linear-gradient(160deg, #090d16 0%, #0f172a 40%, #1e293b 80%, #090d16 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      fontFamily: '"Plus Jakarta Sans", sans-serif'
                    }}
                  >
                    {/* Countdown Overlay (3-2-1) */}
                    {preStartCountdown !== null && preStartCountdown > 0 ? (
                      <div style={{
                        position: 'relative',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '24px',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          width: '170px',
                          height: '170px',
                          borderRadius: '50%',
                          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.05) 70%)',
                          border: '3px solid #fbbf24',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 50px rgba(245, 158, 11, 0.45)',
                          animation: 'countInPulse 0.5s ease-out'
                        }}>
                          <span style={{ fontSize: '5.5rem', fontWeight: 950, color: '#fbbf24', lineHeight: 1 }}>
                            {preStartCountdown}
                          </span>
                        </div>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1.5px solid rgba(245, 158, 11, 0.4)',
                          borderRadius: '100px',
                          padding: '8px 24px',
                          color: '#ffffff',
                          fontSize: '1.05rem',
                          fontWeight: 850
                        }}>
                          Kopfhörer auf, {instrumentLabel} bereit machen... 🎧
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        position: 'relative',
                        zIndex: 1,
                        width: '100%',
                        maxWidth: '440px',
                        margin: '0 auto',
                        height: '100%',
                        maxHeight: '100dvh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMusicStandMode ? '20px 18px 24px' : '16px 16px 20px',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                      }}>
                        {/* ZONE A: HUD Top Bar mit Status & Taktilen Buttons */}
                        <div style={{
                          width: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          background: 'rgba(30, 41, 59, 0.85)',
                          border: '1.5px solid rgba(245, 158, 11, 0.3)',
                          borderRadius: '20px',
                          padding: '10px 14px',
                          boxSizing: 'border-box'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            gap: '10px'
                          }}>
                            {/* Left Status Pill */}
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: 'rgba(245, 158, 11, 0.15)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              borderRadius: '100px',
                              padding: '5px 12px',
                              fontSize: '0.82rem',
                              fontWeight: 850,
                              color: '#fbbf24'
                            }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }} />
                              <Headphones size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                              <span>Übe-Studio</span>
                            </div>

                            {/* Right Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isGoalReached ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsJuniorMissionPaused(false);
                                    isJuniorMissionPausedRef.current = false;
                                    finishPracticeSession();
                                  }}
                                  style={{
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    border: '1.5px solid #fde047',
                                    borderRadius: '100px',
                                    height: '40px',
                                    padding: '0 18px',
                                    color: '#ffffff',
                                    fontSize: '0.90rem',
                                    fontWeight: 950,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '7px',
                                    boxShadow: '0 0 16px rgba(245, 158, 11, 0.45)'
                                  }}
                                >
                                  <span>Abschließen</span>
                                  <Star size={15} fill="#ffffff" color="#ffffff" />
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = !isJuniorMissionPaused;
                                      setIsJuniorMissionPaused(next);
                                      isJuniorMissionPausedRef.current = next;
                                    }}
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.10)',
                                      border: '1px solid rgba(255, 255, 255, 0.2)',
                                      borderRadius: '100px',
                                      height: '40px',
                                      padding: '0 16px',
                                      color: '#f8fafc',
                                      fontSize: '0.86rem',
                                      fontWeight: 900,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '7px'
                                    }}
                                  >
                                    <Pause size={14} fill="#f8fafc" color="#f8fafc" />
                                    <span>{isJuniorMissionPaused ? 'Weiter' : 'Pause'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsJuniorMissionPaused(false);
                                      isJuniorMissionPausedRef.current = false;
                                      finishPracticeSession();
                                    }}
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.20)',
                                      border: '1px solid rgba(248, 113, 113, 0.4)',
                                      borderRadius: '100px',
                                      height: '40px',
                                      padding: '0 16px',
                                      color: '#fca5a5',
                                      fontSize: '0.86rem',
                                      fontWeight: 900,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '7px'
                                    }}
                                  >
                                    <Square size={13} fill="#fca5a5" color="#fca5a5" />
                                    <span>Beenden</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Hausaufgaben-Bereich am Instrument (Alle Bücher mit Seiten, alle Songs, qualifizierte Lehrkraft-Notiz) */}
                          {(Boolean(missionInfo.books?.length) || Boolean(missionInfo.songs?.length) || Boolean(missionInfo.teacherNote && missionInfo.hasSpecificNote)) && (
                            <div style={{
                              borderTop: '1px solid rgba(255, 255, 255, 0.10)',
                              paddingTop: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              width: '100%'
                            }}>
                              {/* Bücher mit allen Seitenzahlen */}
                              {missionInfo.books?.map((b: any, bIdx: number) => {
                                const pageNums = b.pageNums || [];
                                return (
                                  <div key={`teen-b-${bIdx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                      <BookOpen size={14} color="#fbbf24" style={{ flexShrink: 0 }} />
                                      <span style={{ fontSize: '0.90rem', fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                        {b.title}
                                      </span>
                                    </div>
                                    {pageNums.length > 0 && (
                                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                        {pageNums.map((pNum: any) => (
                                          <span key={`teen-p-${pNum}`} style={{
                                            background: 'rgba(245, 158, 11, 0.20)',
                                            color: '#fef08a',
                                            border: '1px solid rgba(245, 158, 11, 0.4)',
                                            fontSize: '0.80rem',
                                            fontWeight: 850,
                                            padding: '2px 8px',
                                            borderRadius: '6px'
                                          }}>
                                            S. {pNum}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Songs */}
                              {missionInfo.songs?.map((s: any, sIdx: number) => {
                                const songTitle = (s.topic_name || s.title || '').replace(/\s*\([^)]*\)\s*$/, '');
                                return (
                                  <div key={`teen-s-${sIdx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                      <Music size={14} color="#fbbf24" style={{ flexShrink: 0 }} />
                                      <span style={{ fontSize: '0.90rem', fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                        {songTitle}
                                      </span>
                                    </div>
                                    {s.homework_notes && s.homework_notes.trim() && s.homework_notes.trim().toLowerCase() !== 'zusätzliche bemerkung' && (
                                      <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 650, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '150px' }}>
                                        {s.homework_notes}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Spezifische Lehrkraft-Notiz (falls kein Platzhalter) */}
                              {missionInfo.hasSpecificNote && missionInfo.teacherNote && missionInfo.teacherNote.trim().toLowerCase() !== 'zusätzliche bemerkung' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '2px', borderTop: (missionInfo.books?.length || missionInfo.songs?.length) ? '1px solid rgba(255, 255, 255, 0.06)' : 'none' }}>
                                  <Lightbulb size={13} color="#fcd34d" style={{ flexShrink: 0 }} />
                                  <span style={{ fontSize: '0.84rem', color: '#cbd5e1', fontWeight: 650, fontStyle: 'italic', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    „{missionInfo.teacherNote}“
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* ZONE B: Monumentaler Vinyl Orbit-Reaktor (Zentrum) */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '12px',
                          textAlign: 'center',
                          margin: 'auto 0'
                        }}>
                          <div style={{
                            position: 'relative',
                            width: isMusicStandMode ? '260px' : '230px',
                            height: isMusicStandMode ? '260px' : '230px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, #0f172a 0%, #090d16 100%)',
                            border: '3px solid rgba(245, 158, 11, 0.35)',
                            boxShadow: '0 0 60px rgba(245, 158, 11, 0.28), 0 0 100px rgba(245, 158, 11, 0.12), inset 0 0 35px rgba(0,0,0,0.8)'
                          }}>
                            {/* SVG Vinyl Grooves & Progress Arc */}
                            <svg
                              width={isMusicStandMode ? '260' : '230'}
                              height={isMusicStandMode ? '260' : '230'}
                              viewBox="0 0 280 280"
                              style={{ transform: 'rotate(-90deg)', overflow: 'visible', position: 'absolute', inset: 0 }}
                            >
                              <defs>
                                <linearGradient id="teenProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#f59e0b" />
                                  <stop offset="100%" stopColor="#d97706" />
                                </linearGradient>
                                <linearGradient id="teenProgressGradReached" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#f59e0b" />
                                  <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                              </defs>
                              <circle cx="140" cy="140" r="124" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="10" />
                              <circle
                                cx="140"
                                cy="140"
                                r="124"
                                fill="none"
                                stroke={isGoalReached ? 'url(#teenProgressGradReached)' : 'url(#teenProgressGrad)'}
                                strokeWidth={isGoalReached ? '12' : '10'}
                                strokeDasharray={2 * Math.PI * 124}
                                strokeDashoffset={2 * Math.PI * 124 * (1 - Math.min(1, elapsedSecs / targetSeconds))}
                                strokeLinecap="round"
                                style={{
                                  transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                  filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.6))'
                                }}
                              />
                            </svg>

                            {/* Digits & Status Pill */}
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}>
                              <div style={{
                                fontSize: isMusicStandMode ? '4.6rem' : '3.9rem',
                                fontWeight: 950,
                                color: isGoalReached ? '#34d399' : '#fef08a',
                                letterSpacing: '-0.04em',
                                lineHeight: 1,
                                fontFamily: "'Urbanist', 'Plus Jakarta Sans', sans-serif",
                                fontVariantNumeric: 'tabular-nums',
                                fontFeatureSettings: '"tnum"',
                                textShadow: isGoalReached ? '0 0 35px rgba(52, 211, 153, 0.6)' : '0 0 25px rgba(245, 158, 11, 0.45)'
                              }}>
                                {String(currentMins).padStart(2, '0')}:{String(currentSecs).padStart(2, '0')}
                              </div>

                              <div style={{
                                fontSize: isMusicStandMode ? '0.94rem' : '0.84rem',
                                fontWeight: 900,
                                color: isGoalReached ? '#34d399' : '#fbbf24',
                                background: isGoalReached ? 'rgba(52, 211, 153, 0.15)' : 'rgba(245, 158, 11, 0.25)',
                                border: isGoalReached ? '1.5px solid rgba(52, 211, 153, 0.5)' : '1.5px solid rgba(245, 158, 11, 0.5)',
                                padding: isMusicStandMode ? '6px 16px' : '4px 14px',
                                borderRadius: '100px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                {!isGoalReached ? (
                                  <>
                                    <Target size={13} color="#fbbf24" style={{ flexShrink: 0 }} />
                                    <span>Ziel: {String(targetMins).padStart(2, '0')}:00 Min.</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap size={13} color="#34d399" style={{ flexShrink: 0 }} />
                                    <span>Flow-Ziel erreicht!</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ maxWidth: '420px', padding: '0 8px', marginTop: '2px' }}>
                            <p style={{ margin: 0, fontSize: isMusicStandMode ? '1.02rem' : '0.90rem', color: '#cbd5e1', fontWeight: 750, lineHeight: 1.35, letterSpacing: '-0.01em' }}>
                              „{instrumentLabel} ist am Start! Finde deinen Groove“
                            </p>
                          </div>
                        </div>

                        {/* ZONE C: Audio Play-Along Dock */}
                        {missionInfo.audioTracks && missionInfo.audioTracks.length > 0 ? (
                          <div style={{ width: '100%', maxWidth: '440px', zIndex: 12 }}>
                            <ZenPlayAlongDock
                              tracks={missionInfo.audioTracks}
                              isMusicStandMode={isMusicStandMode}
                              teacherName={studentUser?.teacher_name ? formatTeacherFullName(studentUser.teacher_name) : 'Deine Lehrkraft'}
                              theme="amber"
                            />
                          </div>
                        ) : (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'rgba(255, 255, 255, 0.75)',
                            fontSize: '0.86rem',
                            fontWeight: 700,
                            background: 'rgba(245, 158, 11, 0.12)',
                            padding: '8px 18px',
                            borderRadius: '100px',
                            border: '1.5px solid rgba(245, 158, 11, 0.25)'
                          }}>
                            <Zap size={15} color="#fbbf24" />
                            <span>Jede gespielte Minute stärkt dein Muskelgedächtnis</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>,
                  document.body
                );
              }

              // =========================================================================
              // 🎸 WENN SESSION IDLE IST -> DAS ERGONOMISCHE DASHBOARD (1:1 JUNIOR PARITÄT)
              // =========================================================================
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }} className="animation-fade-in practice-board-teen">
                  
                  {/* 1. Header Bar: Einzeilige Überschrift ohne Subtext */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    borderRadius: '24px',
                    padding: isMusicStandMode ? '20px 28px' : '16px 24px',
                    border: '1.5px solid rgba(245, 158, 11, 0.25)',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: isMusicStandMode ? '64px' : '56px',
                        height: isMusicStandMode ? '64px' : '56px',
                        borderRadius: '18px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1.5px solid rgba(245, 158, 11, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fbbf24',
                        boxShadow: '0 6px 16px rgba(245, 158, 11, 0.2)',
                        flexShrink: 0
                      }}>
                        <Headphones size={isMusicStandMode ? 32 : 28} color="#fbbf24" />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: isMusicStandMode ? '1.65rem' : '1.45rem', fontWeight: 950, color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                          Übe-Pfad 🎧
                        </h3>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {/* Flow Flamme */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1.5px solid rgba(245, 158, 11, 0.35)',
                        color: '#fbbf24',
                        padding: isMusicStandMode ? '8px 16px' : '6px 14px',
                        borderRadius: '100px',
                        fontWeight: 900,
                        fontSize: isMusicStandMode ? '0.92rem' : '0.86rem'
                      }}>
                        <Flame size={18} fill="#f59e0b" color="#f59e0b" />
                        <span>{streak} {streak === 1 ? 'Tag' : 'Tage'} Flow</span>
                      </div>

                      {/* XP Pill */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1.5px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        padding: isMusicStandMode ? '8px 16px' : '6px 14px',
                        borderRadius: '100px',
                        fontWeight: 900,
                        fontSize: isMusicStandMode ? '0.92rem' : '0.86rem'
                      }}>
                        <Star size={16} fill="#fbbf24" color="#fbbf24" />
                        <span>{xpVal} XP</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Karte A: Center Stage Hero (Der Flow-Timer - OHNE Dropdown!) */}
                  <div style={{
                    width: '100%',
                    background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
                    borderRadius: '32px',
                    border: '2px solid rgba(245, 158, 11, 0.28)',
                    padding: isMusicStandMode ? '44px 32px' : '40px 28px',
                    boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.5), 0 0 35px rgba(245, 158, 11, 0.08) inset',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                  }}>
                    {/* Ambient Glow */}
                    <div style={{
                      position: 'absolute',
                      top: '-50px',
                      right: '-30px',
                      width: '280px',
                      height: '280px',
                      background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(0,0,0,0) 70%)',
                      borderRadius: '50%',
                      pointerEvents: 'none'
                    }} />

                    {/* Target Pill */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#fbbf24',
                      padding: isMusicStandMode ? '7px 22px' : '6px 18px',
                      borderRadius: '100px',
                      fontSize: isMusicStandMode ? '0.92rem' : '0.86rem',
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginBottom: '20px',
                      boxShadow: '0 0 15px rgba(245, 158, 11, 0.15)',
                      zIndex: 1
                    }}>
                      <Target size={16} color="#fbbf24" />
                      <span>Tagesziel: {targetMins} Min. am Stück</span>
                    </div>

                    {/* Vinyl Groove Dial Ring (195px) */}
                    <div style={{
                      position: 'relative',
                      width: '195px',
                      height: '195px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.9) 70%)',
                      border: '3px solid rgba(245, 158, 11, 0.35)',
                      boxShadow: '0 0 35px rgba(245, 158, 11, 0.12), inset 0 0 20px rgba(0,0,0,0.6)',
                      marginBottom: '24px',
                      zIndex: 1
                    }}>
                      <div style={{
                        position: 'absolute',
                        inset: '-6px',
                        borderRadius: '50%',
                        border: '1.5px dashed rgba(245, 158, 11, 0.4)',
                        pointerEvents: 'none'
                      }} />
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{
                          fontSize: isMusicStandMode ? '3.6rem' : '3.2rem',
                          fontWeight: 950,
                          color: '#fef3c7',
                          fontFamily: "'Plus Jakarta Sans', monospace",
                          letterSpacing: '-0.03em',
                          lineHeight: 1
                        }}>
                          {String(targetMins).padStart(2, '0')}:00
                        </span>
                        <span style={{ fontSize: '0.76rem', color: '#cbd5e1', fontWeight: 700, marginTop: '6px' }}>
                          Fokuszeit
                        </span>
                      </div>
                    </div>

                    {/* Primary Action Button */}
                    <div style={{ width: '100%', maxWidth: '380px', zIndex: 1 }}>
                      <button
                        type="button"
                        onClick={handleStartPracticeSession}
                        style={{
                          width: '100%',
                          minHeight: isMusicStandMode ? '56px' : '50px',
                          borderRadius: '20px',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          border: '2px solid #fde047',
                          color: '#ffffff',
                          fontSize: isMusicStandMode ? '1.18rem' : '1.08rem',
                          fontWeight: 950,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          boxShadow: '0 12px 28px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255,255,255,0.4)',
                          letterSpacing: '-0.01em',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        className="hover-scale"
                      >
                        <Play size={20} fill="#ffffff" color="#ffffff" />
                        <span>Übe-Session starten</span>
                      </button>
                    </div>

                    <span style={{ fontSize: '0.80rem', color: '#94a3b8', fontWeight: 650, marginTop: '14px', zIndex: 1 }}>
                      🎧 Kopfhörer aufsetzen &amp; konzentriert üben
                    </span>
                  </div>

                  {/* 3. Bottom Dual Grid: Karte C (Wochen-Konsistenz) + Karte B (Sticker-Meilenstein) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '24px',
                    width: '100%'
                  }}>
                    {/* Karte C: Weekly Beats & Flow-Serie (Exakt 2 Schilde pro Woche) */}
                    <div style={{
                      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                      borderRadius: '32px',
                      border: '2px solid rgba(245, 158, 11, 0.25)',
                      padding: isMusicStandMode ? '32px' : '28px',
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '18px',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: isMusicStandMode ? '64px' : '56px', height: isMusicStandMode ? '64px' : '56px', borderRadius: '18px', background: 'rgba(245, 158, 11, 0.15)', border: '1.5px solid rgba(245, 158, 11, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                            <Flame size={isMusicStandMode ? 32 : 28} fill="#f59e0b" color="#f59e0b" />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: isMusicStandMode ? '1.55rem' : '1.38rem', fontWeight: 950, color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              Deine Übe-Woche
                            </h4>
                            <span style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', color: '#cbd5e1', fontWeight: 650 }}>
                              Wochen-Rhythmus &amp; Schilde
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 850,
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <Shield size={13} fill="#fbbf24" color="#fbbf24" />
                            <span>2 Schilde aktiv</span>
                          </span>
                        </div>
                      </div>

                      {/* 7-Tage-Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                        {weekDays.map((d: any, idx: number) => {
                          const isDone = d.hasMastered;
                          const isToday = d.isToday;
                          return (
                            <div
                              key={idx}
                              style={{
                                background: isDone ? 'rgba(16, 185, 129, 0.15)' : (isToday ? 'rgba(245, 158, 11, 0.15)' : 'rgba(15, 23, 42, 0.6)'),
                                border: isDone ? '1.5px solid #10b981' : (isToday ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)'),
                                borderRadius: '16px',
                                padding: '10px 4px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                minHeight: '74px'
                              }}
                            >
                              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: isDone ? '#34d399' : (isToday ? '#fbbf24' : '#94a3b8'), textTransform: 'uppercase' }}>
                                {d.dayName}
                              </span>
                              {isDone ? (
                                <Zap size={18} color="#34d399" />
                              ) : isToday ? (
                                <Flame size={18} fill="#f59e0b" color="#f59e0b" />
                              ) : (
                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>·</span>
                              )}
                              <span style={{ fontSize: '0.66rem', fontWeight: 850, color: isDone ? '#34d399' : (isToday ? '#fbbf24' : '#94a3b8') }}>
                                {isDone ? `${d.totalMins || 3}m` : (isToday ? 'Heute' : 'Pause')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Karte B: Nächster Meilenstein mit echtem Sticker */}
                    <div style={{
                      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                      borderRadius: '32px',
                      border: '2px solid rgba(245, 158, 11, 0.25)',
                      padding: isMusicStandMode ? '32px' : '28px',
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '18px',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: isMusicStandMode ? '64px' : '56px', height: isMusicStandMode ? '64px' : '56px', borderRadius: '18px', background: 'rgba(245, 158, 11, 0.15)', border: '1.5px solid rgba(245, 158, 11, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                            <Award size={isMusicStandMode ? 32 : 28} />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: isMusicStandMode ? '1.55rem' : '1.38rem', fontWeight: 950, color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              Nächster Meilenstein
                            </h4>
                            <span style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', color: '#cbd5e1', fontWeight: 650 }}>
                              Sticker-Pfad Belohnung
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowJuniorStickerModal(true)}
                          style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1.5px solid rgba(245, 158, 11, 0.35)',
                            borderRadius: '100px',
                            padding: isMusicStandMode ? '6px 14px' : '5px 12px',
                            color: '#fbbf24',
                            fontSize: isMusicStandMode ? '0.92rem' : '0.84rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          className="hover-scale"
                        >
                          <BookOpen size={14} />
                          <span>Sticker-Album</span>
                        </button>
                      </div>

                      {/* Echte Sticker Vorschau */}
                      <div
                        onClick={() => setShowJuniorStickerModal(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          background: 'rgba(15, 23, 42, 0.7)',
                          borderRadius: '20px',
                          padding: '16px 18px',
                          border: '1.5px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer'
                        }}
                        className="hover-scale"
                      >
                        <div style={{
                          width: isMusicStandMode ? '64px' : '56px',
                          height: isMusicStandMode ? '64px' : '56px',
                          borderRadius: '18px',
                          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(15, 23, 42, 0.8) 100%)',
                          border: '2px solid rgba(245, 158, 11, 0.45)',
                          boxShadow: '0 6px 16px rgba(245, 158, 11, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          padding: '4px',
                          overflow: 'hidden'
                        }}>
                          <img
                            src={`/stickers/${stickerId}.png?v=1`}
                            alt={nextStickerName}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                const span = document.createElement('span');
                                span.style.fontSize = '1.6rem';
                                span.innerText = stickerIcon;
                                parent.appendChild(span);
                              }
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 950, fontSize: isMusicStandMode ? '1.20rem' : '1.08rem', color: '#ffffff' }}>{nextStickerName}</span>
                            <span style={{ fontSize: isMusicStandMode ? '0.92rem' : '0.86rem', fontWeight: 900, color: '#fbbf24' }}>{effMins} / {targetMin} Min</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #10b981)', borderRadius: '10px' }} />
                          </div>
                          <span style={{ fontSize: isMusicStandMode ? '0.88rem' : '0.80rem', color: '#94a3b8', fontWeight: 650 }}>
                            {isMax ? 'Maximaler Status erreicht! ⭐' : `Noch ${minsToNext} Min. bis zum nächsten Sticker!`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* 🎓 PRO STUDIO: HELLES APPLE HIG DESIGN (16+ J.) - 1:1 JUNIOR PARITÄT      */}
            {/* ========================================================================= */}
            {studentUiLevel === 'pro' && (() => {
              const streak = avatar?.streak_flame || 0;
              const targetMins = getTargetMinutes(streak);
              const targetSeconds = targetMins * 60;
              const weekMetrics = getDeterministicWeekMetrics();
              const { weekDays, weekPracticedCount } = weekMetrics;
              const elapsedSecs = secondsElapsedRef.current || secondsElapsed;
              const isGoalReached = elapsedSecs >= targetSeconds;
              const currentMins = Math.floor(elapsedSecs / 60);
              const currentSecs = elapsedSecs % 60;

              let xpVal = avatar?.xp || 0;
              try {
                const localStats = JSON.parse(localStorage.getItem(`cg_offline_stats_${studentId}`) || '{}');
                if (localStats.current_xp) xpVal = Math.max(xpVal, localStats.current_xp);
                const localPractice = JSON.parse(localStorage.getItem(`cg_offline_practice_${studentId}`) || '{}');
                if (localPractice.xp) xpVal = Math.max(xpVal, localPractice.xp);
              } catch (e) {}

              const missionInfo = getJuniorMissionDetails();
              const rawInst = (studentUser?.instrument || '').trim();
              const isFeminineInst = rawInst ? ['gitarre', 'e-gitarre', 'flöte', 'querflöte', 'blockflöte', 'trompete', 'geige', 'violine', 'posaune', 'klarinette', 'harfe', 'bratsche', 'tuba', 'mundharmonika', 'ukulele'].some(w => rawInst.toLowerCase().includes(w)) : false;
              const instrumentLabel = rawInst ? (isFeminineInst ? `Deine ${rawInst}` : `Dein ${rawInst}`) : 'Dein Instrument';

              // Active incomplete songs for Meisterwerk (100% gemeisterte Stücke gehören ins Protokoll-Archiv)
              const activeSongsList: any[] = [];
              (activeSongSkills || []).forEach((skill: any) => {
                const title = skill.songs?.title || skill.title || skill.song_title;
                const progress = skill.progress_percent ?? (skill.status === 'MASTERED' ? 100 : 75);
                if (title && progress < 100 && skill.status !== 'MASTERED') {
                  if (!activeSongsList.some(s => s.title.toLowerCase() === title.toLowerCase())) {
                    activeSongsList.push({
                      title,
                      subtitle: skill.songs?.composer || skill.songs?.artist || 'Song-Repertoire',
                      progress,
                      isCurrentHomework: Boolean(skill.is_current_homework),
                      updatedAt: skill.updated_at || skill.created_at || null
                    });
                  }
                }
              });
              (progressItems || []).forEach((item: any) => {
                const rawTopic = (item.topic_name || item.title || '').trim();
                if (!rawTopic || rawTopic.includes(' - Seite ') || rawTopic.startsWith('Hausaufgabe KW ') || rawTopic.toLowerCase().startsWith('test')) return;
                const cleanT = rawTopic.replace(/\s*\([^)]*\)\s*$/, '').trim();
                const progress = item.progress_percent ?? (item.status === 'MASTERED' ? 100 : 60);
                if (cleanT && progress < 100 && item.status !== 'MASTERED') {
                  if (!activeSongsList.some(s => s.title.toLowerCase() === cleanT.toLowerCase())) {
                    activeSongsList.push({
                      title: cleanT,
                      subtitle: item.instrument || 'Konzertstück',
                      progress,
                      isCurrentHomework: Boolean(item.is_current_homework),
                      updatedAt: item.updated_at || item.created_at || null
                    });
                  }
                }
              });

              // Smarte 3-Stufen Priorisierung (Goldstandard):
              // 1. Hausaufgabe zuerst (aktueller Wochenfokus)
              // 2. Goal-Gradient (höchster Fortschritt zuerst, z.B. 85% vor 40%)
              // 3. Aktualität (zuletzt geübt)
              activeSongsList.sort((a, b) => {
                if (a.isCurrentHomework && !b.isCurrentHomework) return -1;
                if (!a.isCurrentHomework && b.isCurrentHomework) return 1;
                if (b.progress !== a.progress) return b.progress - a.progress;
                return 0;
              });

              // =========================================================================
              // 🎓 WENN SESSION AKTIV IST -> HELLE APPLE HIG CUERTINO FOCUS STAGE
              // =========================================================================
              if (sessionActive) {
                return createPortal(
                  <div
                    id="pro-studio-mission-portal"
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 100002,
                      background: 'linear-gradient(160deg, #f8fafc 0%, #ffffff 50%, #f1f5f9 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      fontFamily: '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif'
                    }}
                  >
                    {/* Countdown Overlay (3-2-1) */}
                    {preStartCountdown !== null && preStartCountdown > 0 ? (
                      <div style={{
                        position: 'relative',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '24px',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          width: '170px',
                          height: '170px',
                          borderRadius: '50%',
                          background: 'radial-gradient(circle, rgba(22, 163, 74, 0.12) 0%, rgba(22, 163, 74, 0.02) 70%)',
                          border: '3px solid #16a34a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 45px rgba(22, 163, 74, 0.25)',
                          animation: 'countInPulse 0.5s ease-out'
                        }}>
                          <span style={{ fontSize: '5.5rem', fontWeight: 950, color: '#16a34a', lineHeight: 1 }}>
                            {preStartCountdown}
                          </span>
                        </div>
                        <div style={{
                          background: '#ffffff',
                          border: '1.5px solid #86efac',
                          borderRadius: '100px',
                          padding: '8px 24px',
                          color: '#0f172a',
                          fontSize: '1.05rem',
                          fontWeight: 850,
                          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)'
                        }}>
                          Fokus einnehmen, {instrumentLabel} bereit machen... 🎓
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        position: 'relative',
                        zIndex: 1,
                        width: '100%',
                        maxWidth: '440px',
                        margin: '0 auto',
                        height: '100%',
                        maxHeight: '100dvh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMusicStandMode ? '20px 18px 24px' : '16px 16px 20px',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                      }}>
                        {/* ZONE A: HUD Top Bar mit Status & Apple HIG Buttons */}
                        <div style={{
                          width: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '20px',
                          padding: '10px 14px',
                          boxSizing: 'border-box',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            gap: '10px'
                          }}>
                            {/* Left Status Pill */}
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: '#e6f4ea',
                              border: '1px solid #86efac',
                              borderRadius: '100px',
                              padding: '5px 12px',
                              fontSize: '0.82rem',
                              fontWeight: 850,
                              color: '#15803d'
                            }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 6px #16a34a' }} />
                              <span>Studio-Fokus</span>
                              <GraduationCap size={13} color="#16a34a" />
                            </div>

                            {/* Right Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isGoalReached ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsJuniorMissionPaused(false);
                                    isJuniorMissionPausedRef.current = false;
                                    finishPracticeSession();
                                  }}
                                  style={{
                                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                    border: 'none',
                                    borderRadius: '100px',
                                    height: '40px',
                                    padding: '0 18px',
                                    color: '#ffffff',
                                    fontSize: '0.90rem',
                                    fontWeight: 950,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '7px',
                                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)'
                                  }}
                                >
                                  <span>Abschließen</span>
                                  <CheckCircle size={15} color="#ffffff" />
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = !isJuniorMissionPaused;
                                      setIsJuniorMissionPaused(next);
                                      isJuniorMissionPausedRef.current = next;
                                    }}
                                    style={{
                                      background: '#f8fafc',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '100px',
                                      height: '40px',
                                      padding: '0 16px',
                                      color: '#334155',
                                      fontSize: '0.86rem',
                                      fontWeight: 900,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '7px'
                                    }}
                                  >
                                    <Pause size={14} color="#334155" />
                                    <span>{isJuniorMissionPaused ? 'Weiter' : 'Pause'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsJuniorMissionPaused(false);
                                      isJuniorMissionPausedRef.current = false;
                                      finishPracticeSession();
                                    }}
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.08)',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      borderRadius: '100px',
                                      height: '40px',
                                      padding: '0 16px',
                                      color: '#dc2626',
                                      fontSize: '0.86rem',
                                      fontWeight: 900,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '7px'
                                    }}
                                  >
                                    <Square size={13} fill="#dc2626" color="#dc2626" />
                                    <span>Beenden</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Hausaufgaben-Bereich am Instrument (Alle Bücher mit Seiten, alle Songs, qualifizierte Lehrkraft-Notiz) */}
                          {(Boolean(missionInfo.books?.length) || Boolean(missionInfo.songs?.length) || Boolean(missionInfo.teacherNote && missionInfo.hasSpecificNote)) && (
                            <div style={{
                              borderTop: '1px solid #f1f5f9',
                              paddingTop: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              width: '100%'
                            }}>
                              {/* Bücher */}
                              {missionInfo.books?.map((b: any, bIdx: number) => {
                                const pageNums = b.pageNums || [];
                                return (
                                  <div key={`pro-b-${bIdx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                      <BookOpen size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                                      <span style={{ fontSize: '0.90rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                        {b.title}
                                      </span>
                                    </div>
                                    {pageNums.length > 0 && (
                                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                        {pageNums.map((pNum: any) => (
                                          <span key={`pro-p-${pNum}`} style={{
                                            background: '#e6f4ea',
                                            color: '#15803d',
                                            border: '1px solid #86efac',
                                            fontSize: '0.80rem',
                                            fontWeight: 850,
                                            padding: '2px 8px',
                                            borderRadius: '6px'
                                          }}>
                                            S. {pNum}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Songs */}
                              {missionInfo.songs?.map((s: any, sIdx: number) => {
                                const songTitle = (s.topic_name || s.title || '').replace(/\s*\([^)]*\)\s*$/, '');
                                return (
                                  <div key={`pro-s-${sIdx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                      <Music size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                                      <span style={{ fontSize: '0.90rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                        {songTitle}
                                      </span>
                                    </div>
                                    {s.homework_notes && s.homework_notes.trim() && s.homework_notes.trim().toLowerCase() !== 'zusätzliche bemerkung' && (
                                      <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 650, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '150px' }}>
                                        {s.homework_notes}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Spezifische Lehrkraft-Notiz */}
                              {missionInfo.hasSpecificNote && missionInfo.teacherNote && missionInfo.teacherNote.trim().toLowerCase() !== 'zusätzliche bemerkung' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '2px', borderTop: (missionInfo.books?.length || missionInfo.songs?.length) ? '1px solid #f1f5f9' : 'none' }}>
                                  <Lightbulb size={13} color="#16a34a" style={{ flexShrink: 0 }} />
                                  <span style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 650, fontStyle: 'italic', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    „{missionInfo.teacherNote}“
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* ZONE B: Monumentaler Apple Precision Dial (Zentrum) */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '12px',
                          textAlign: 'center',
                          margin: 'auto 0'
                        }}>
                          <div style={{
                            position: 'relative',
                            width: isMusicStandMode ? '260px' : '230px',
                            height: isMusicStandMode ? '260px' : '230px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            background: '#ffffff',
                            boxShadow: '0 12px 35px rgba(22, 163, 74, 0.08), 0 2px 10px rgba(0,0,0,0.03)'
                          }}>
                            <svg
                              width={isMusicStandMode ? '260' : '230'}
                              height={isMusicStandMode ? '260' : '230'}
                              viewBox="0 0 280 280"
                              style={{ transform: 'rotate(-90deg)', overflow: 'visible', position: 'absolute', inset: 0 }}
                            >
                              <defs>
                                <linearGradient id="proProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#16a34a" />
                                  <stop offset="100%" stopColor="#4ade80" />
                                </linearGradient>
                                <linearGradient id="proProgressGradReached" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#16a34a" />
                                  <stop offset="100%" stopColor="#22c55e" />
                                </linearGradient>
                              </defs>
                              <circle cx="140" cy="140" r="124" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                              <circle
                                cx="140"
                                cy="140"
                                r="124"
                                fill="none"
                                stroke={isGoalReached ? 'url(#proProgressGradReached)' : 'url(#proProgressGrad)'}
                                strokeWidth={isGoalReached ? '12' : '10'}
                                strokeDasharray={2 * Math.PI * 124}
                                strokeDashoffset={2 * Math.PI * 124 * (1 - Math.min(1, elapsedSecs / targetSeconds))}
                                strokeLinecap="round"
                                style={{
                                  transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                  filter: 'drop-shadow(0 2px 8px rgba(22, 163, 74, 0.35))'
                                }}
                              />
                            </svg>

                            {/* Digits & Status Pill */}
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}>
                              <div style={{
                                fontSize: isMusicStandMode ? '4.6rem' : '3.9rem',
                                fontWeight: 950,
                                color: isGoalReached ? '#15803d' : '#0f172a',
                                letterSpacing: '-0.04em',
                                lineHeight: 1,
                                fontVariantNumeric: 'tabular-nums',
                                fontFamily: "'Urbanist', 'Plus Jakarta Sans', sans-serif"
                              }}>
                                {String(currentMins).padStart(2, '0')}:{String(currentSecs).padStart(2, '0')}
                              </div>

                              <div style={{
                                fontSize: isMusicStandMode ? '0.94rem' : '0.84rem',
                                fontWeight: 900,
                                color: '#15803d',
                                background: isGoalReached ? '#dcfce7' : '#e6f4ea',
                                border: '1.5px solid #86efac',
                                padding: isMusicStandMode ? '6px 16px' : '4px 14px',
                                borderRadius: '100px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                {!isGoalReached ? (
                                  <>
                                    <Target size={13} color="#16a34a" />
                                    <span>Ziel: {String(targetMins).padStart(2, '0')}:00 Min.</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle size={13} color="#15803d" />
                                    <span>Tagesziel erreicht</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ maxWidth: '380px', padding: '0 8px' }}>
                            <p style={{ margin: 0, fontSize: isMusicStandMode ? '1.02rem' : '0.90rem', color: '#475569', fontWeight: 700, lineHeight: 1.35 }}>
                              „{instrumentLabel} im Studio-Fokus. Präzision formt meisterhaften Klang.“
                            </p>
                          </div>
                        </div>

                        {/* ZONE C: Audio Play-Along Dock (Helles Cupertino Frosted Glass) */}
                        {missionInfo.audioTracks && missionInfo.audioTracks.length > 0 ? (
                          <div style={{ width: '100%', maxWidth: '440px', zIndex: 12 }}>
                            <ZenPlayAlongDock
                              tracks={missionInfo.audioTracks}
                              isMusicStandMode={isMusicStandMode}
                              teacherName={studentUser?.teacher_name ? formatTeacherFullName(studentUser.teacher_name) : 'Deine Lehrkraft'}
                              theme="light"
                            />
                          </div>
                        ) : (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#64748b',
                            fontSize: '0.86rem',
                            fontWeight: 700,
                            background: '#ffffff',
                            padding: '8px 18px',
                            borderRadius: '100px',
                            border: '1.5px solid #e2e8f0',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                          }}>
                            <Sparkles size={15} color="#16a34a" />
                            <span>Konzentrierte Wiederholung formt musikalische Virtuosität</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>,
                  document.body
                );
              }

              // =========================================================================
              // 🎓 WENN SESSION IDLE IST -> DAS ERGONOMISCHE DASHBOARD (1:1 JUNIOR PARITÄT)
              // =========================================================================
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }} className="animation-fade-in practice-board-pro">
                  
                  {/* 1. Header Bar: Einzeilige Überschrift ohne Subtext */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: isMusicStandMode ? '20px 28px' : '16px 24px',
                    border: '1.5px solid #e2e8f0',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: isMusicStandMode ? '64px' : '56px',
                        height: isMusicStandMode ? '64px' : '56px',
                        borderRadius: '18px',
                        background: '#e6f4ea',
                        border: '1.5px solid #86efac',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#16a34a',
                        boxShadow: '0 4px 12px rgba(22, 163, 74, 0.12)',
                        flexShrink: 0
                      }}>
                        <Music size={isMusicStandMode ? 32 : 28} color="#16a34a" />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: isMusicStandMode ? '1.65rem' : '1.45rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                          Übe-Pfad 🎓
                        </h3>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {/* Streak Pill */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#fffbeb',
                        border: '1.5px solid #fde68a',
                        color: '#b45309',
                        padding: isMusicStandMode ? '8px 16px' : '6px 14px',
                        borderRadius: '100px',
                        fontWeight: 900,
                        fontSize: isMusicStandMode ? '0.92rem' : '0.86rem'
                      }}>
                        <Flame size={18} fill="#f59e0b" color="#f59e0b" />
                        <span>{streak} {streak === 1 ? 'Tag' : 'Tage'} Streak</span>
                      </div>

                      {/* XP Pill */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#e6f4ea',
                        border: '1.5px solid #86efac',
                        color: '#15803d',
                        padding: isMusicStandMode ? '8px 16px' : '6px 14px',
                        borderRadius: '100px',
                        fontWeight: 900,
                        fontSize: isMusicStandMode ? '0.92rem' : '0.86rem'
                      }}>
                        <Star size={16} fill="#16a34a" color="#16a34a" />
                        <span>{xpVal} XP</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Karte A: Center Stage Hero (Der Apple Precision Timer - OHNE Dropdown!) */}
                  <div style={{
                    width: '100%',
                    background: '#ffffff',
                    borderRadius: '32px',
                    border: '2px solid #e2e8f0',
                    padding: isMusicStandMode ? '44px 32px' : '40px 28px',
                    boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.06), 0 0 35px rgba(22, 163, 74, 0.03) inset',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                  }}>
                    {/* Target Pill */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#e6f4ea',
                      border: '1.5px solid #86efac',
                      color: '#15803d',
                      padding: isMusicStandMode ? '7px 22px' : '6px 18px',
                      borderRadius: '100px',
                      fontSize: isMusicStandMode ? '0.92rem' : '0.86rem',
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginBottom: '20px',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)',
                      zIndex: 1
                    }}>
                      <Target size={16} color="#16a34a" />
                      <span>Tages-Fokus: {targetMins} Min. am Stück</span>
                    </div>

                    {/* Apple HIG Precision Dial Ring (195px) */}
                    <div style={{
                      position: 'relative',
                      width: '195px',
                      height: '195px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background: '#ffffff',
                      border: '4px solid #16a34a',
                      boxShadow: '0 12px 35px rgba(22, 163, 74, 0.15), inset 0 2px 8px rgba(0, 0, 0, 0.03)',
                      marginBottom: '24px',
                      zIndex: 1
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{
                          fontSize: isMusicStandMode ? '3.6rem' : '3.2rem',
                          fontWeight: 950,
                          color: '#0f172a',
                          fontFamily: "'Plus Jakarta Sans', monospace",
                          letterSpacing: '-0.03em',
                          lineHeight: 1
                        }}>
                          {String(targetMins).padStart(2, '0')}:00
                        </span>
                        <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700, marginTop: '6px' }}>
                          Fokuszeit
                        </span>
                      </div>
                    </div>

                    {/* Primary Action Button */}
                    <div style={{ width: '100%', maxWidth: '380px', zIndex: 1 }}>
                      <button
                        type="button"
                        onClick={handleStartPracticeSession}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '20px',
                          minHeight: '52px',
                          padding: '14px 24px',
                          fontSize: isMusicStandMode ? '1.18rem' : '1.05rem',
                          fontWeight: 950,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          boxShadow: '0 8px 25px rgba(22, 163, 74, 0.35)',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-scale"
                      >
                        <Play size={20} fill="#ffffff" />
                        <span>Fokus-Session starten</span>
                      </button>
                    </div>

                    {/* Microcopy underneath */}
                    <p style={{
                      fontSize: isMusicStandMode ? '0.98rem' : '0.90rem',
                      color: '#64748b',
                      fontWeight: 650,
                      margin: '16px 0 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      zIndex: 1
                    }}>
                      <span>🎧 Fokus setzen</span>
                      <span>·</span>
                      <span>🎯 Konzentration bündeln</span>
                      <span>·</span>
                      <span>🎓 Präzision formen</span>
                    </p>
                  </div>

                  {/* 3. Bottom Dual Grid: 2 Ruhige, Ausbalancierte Karten (1:1 Parität mit Junior) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '24px',
                    width: '100%'
                  }}>
                    {/* Karte C: Wochen-Konsistenz & Fokus (7-Tage-Grid mit 2 Ruhetagen) */}
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '32px',
                      border: '2px solid #e2e8f0',
                      padding: isMusicStandMode ? '32px' : '28px',
                      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '18px',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: isMusicStandMode ? '64px' : '56px', height: isMusicStandMode ? '64px' : '56px', borderRadius: '18px', background: '#e6f4ea', border: '1.5px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                            <Activity size={isMusicStandMode ? 32 : 28} color="#16a34a" />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: isMusicStandMode ? '1.55rem' : '1.38rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              Wochen-Konsistenz &amp; Fokus
                            </h4>
                            <span style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', color: '#64748b', fontWeight: 650 }}>
                              {weekPracticedCount} von 7 Tagen • 2 Ruhetage geschützt
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 850,
                            background: '#e6f4ea',
                            color: '#15803d',
                            border: '1px solid #86efac',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <ShieldCheck size={13} color="#16a34a" />
                            <span>2 Ruhetage aktiv</span>
                          </span>
                        </div>
                      </div>

                      {/* 7-Tage-Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                        {weekDays.map((d: any, idx: number) => {
                          const isDone = d.hasMastered;
                          const isToday = d.isToday;
                          return (
                            <div
                              key={idx}
                              style={{
                                background: isDone ? '#f0fdf4' : (isToday ? '#e6f4ea' : '#f8fafc'),
                                border: isDone ? '1.5px solid #86efac' : (isToday ? '1.5px solid #86efac' : '1px solid #e2e8f0'),
                                borderRadius: '16px',
                                padding: '10px 4px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                minHeight: '74px'
                              }}
                            >
                              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: isDone ? '#166534' : (isToday ? '#15803d' : '#64748b'), textTransform: 'uppercase' }}>
                                {d.dayName}
                              </span>
                              {isDone ? (
                                <CheckCircle size={18} color="#166534" />
                              ) : isToday ? (
                                <Sparkles size={16} color="#16a34a" />
                              ) : (
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>·</span>
                              )}
                              <span style={{ fontSize: '0.66rem', fontWeight: 850, color: isDone ? '#166534' : (isToday ? '#15803d' : '#64748b') }}>
                                {isDone ? `${d.totalMins || 3}m` : (isToday ? 'Heute' : 'Pause')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Karte B: Meisterwerk & Repertoire-Widget (Offene Konzertstücke & Bühnenreife) */}
                    <div style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                      borderRadius: '32px',
                      border: '2px solid #e2e8f0',
                      padding: isMusicStandMode ? '32px' : '28px',
                      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '18px',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: isMusicStandMode ? '64px' : '56px', height: isMusicStandMode ? '64px' : '56px', borderRadius: '18px', background: '#e6f4ea', border: '1.5px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                            <Trophy size={isMusicStandMode ? 32 : 28} />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: isMusicStandMode ? '1.55rem' : '1.38rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              Meisterwerk &amp; Repertoire
                            </h4>
                            <span style={{ fontSize: isMusicStandMode ? '1.05rem' : '0.92rem', color: '#64748b', fontWeight: 650 }}>
                              Bühnenreife &amp; Konzertstücke
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenHomeworkBookWithView('audiobiography', 'document')}
                          style={{
                            background: '#ffffff',
                            border: '1.5px solid #86efac',
                            borderRadius: '100px',
                            padding: isMusicStandMode ? '6px 14px' : '5px 12px',
                            color: '#15803d',
                            fontSize: isMusicStandMode ? '0.92rem' : '0.84rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.08)'
                          }}
                          className="hover-scale"
                        >
                          <FileText size={14} />
                          <span>Protokoll öffnen</span>
                        </button>
                      </div>

                      {/* Repertoire Stücke Preview (Maximal 2 unvollständige Stücke im Arbeits-Fokus) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {activeSongsList.length > 0 ? (
                          <>
                            {activeSongsList.slice(0, 2).map((song, sIdx) => (
                              <div
                                key={`pro-song-${sIdx}`}
                                onClick={() => handleOpenHomeworkBookWithView('audiobiography', 'document')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '14px',
                                  background: '#ffffff',
                                  borderRadius: '20px',
                                  padding: '12px 16px',
                                  border: song.isCurrentHomework ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                                  boxShadow: song.isCurrentHomework ? '0 4px 14px rgba(22, 163, 74, 0.08)' : '0 2px 8px rgba(0,0,0,0.03)',
                                  cursor: 'pointer'
                                }}
                                className="hover-scale"
                              >
                                <div style={{
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '14px',
                                  background: song.isCurrentHomework ? '#e6f4ea' : '#f8fafc',
                                  border: song.isCurrentHomework ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#16a34a',
                                  flexShrink: 0
                                }}>
                                  <Disc size={22} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                      <span style={{ fontWeight: 950, fontSize: isMusicStandMode ? '1.05rem' : '0.96rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {song.title}
                                      </span>
                                      {song.isCurrentHomework && (
                                        <span style={{
                                          background: '#e6f4ea',
                                          color: '#15803d',
                                          border: '1px solid #86efac',
                                          fontSize: '0.70rem',
                                          fontWeight: 850,
                                          padding: '1px 6px',
                                          borderRadius: '6px',
                                          flexShrink: 0
                                        }}>
                                          Hausaufgabe
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#15803d', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                                      {song.progress}% Bühnenreif
                                    </span>
                                  </div>
                                  <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(99, Math.max(5, song.progress))}%`, height: '100%', background: 'linear-gradient(90deg, #16a34a, #22c55e)', borderRadius: '10px' }} />
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* Dezente Fußzeile bei mehr als 2 offenen Stücken */}
                            {activeSongsList.length > 2 && (
                              <div style={{ textAlign: 'center', paddingTop: '2px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenHomeworkBookWithView('audiobiography', 'document')}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#15803d',
                                    fontSize: '0.80rem',
                                    fontWeight: 850,
                                    cursor: 'pointer',
                                    padding: '2px 8px'
                                  }}
                                  className="hover-scale"
                                >
                                  + {activeSongsList.length - 2} weitere {activeSongsList.length - 2 === 1 ? 'Stück' : 'Stücke'} in Arbeit • Alle im Protokoll öffnen →
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{
                            background: '#ffffff',
                            borderRadius: '20px',
                            padding: '18px 16px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            border: '1.5px dashed #86efac'
                          }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: '#e6f4ea',
                              border: '1.5px solid #86efac',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#16a34a'
                            }}>
                              <Trophy size={20} />
                            </div>
                            <span style={{ fontWeight: 950, fontSize: '0.94rem', color: '#0f172a' }}>
                              Alle Konzertstücke meisterhaft abgeschlossen
                            </span>
                            <span style={{ fontSize: '0.80rem', color: '#64748b', maxWidth: '320px', lineHeight: 1.35 }}>
                              Hervorragende Leistung! Wähle im Meisterwerk-Protokoll ein neues Stück oder sprich deine Lehrkraft an.
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenHomeworkBookWithView('audiobiography', 'document')}
                              style={{
                                marginTop: '4px',
                                background: '#e6f4ea',
                                border: '1.5px solid #86efac',
                                borderRadius: '100px',
                                padding: '5px 14px',
                                color: '#15803d',
                                fontSize: '0.80rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.08)'
                              }}
                              className="hover-scale"
                            >
                              Neues Stück im Protokoll wählen →
                            </button>
                          </div>
                        )}
                      </div>

                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'center', display: 'block' }}>
                        Geschütztes didaktisches Übeprotokoll deiner Musikschule
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}


          {/* ========================================================================= */}
          {/* 📅 ROW 5: ÜBE-CHRONIK & ARCHIV (VERGANGENE MONATE & SESSIONS - Teen & Pro) */}
          {/* ========================================================================= */}
          {studentUiLevel !== 'junior' && (() => {
            const isTeen = studentUiLevel === 'teen';
            const now = getSimulatedNow();
            const todayDd = String(now.getDate()).padStart(2, '0');
            const todayMm = String(now.getMonth() + 1).padStart(2, '0');
            const todayYy = String(now.getFullYear()).substring(2);
            const todayDateStr = `${todayDd}.${todayMm}.${todayYy}`;

            const monthNamesShort = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
            const monthNamesFull = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
            const dayNamesFull = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

            const formatFriendlyDate = (dateStr: string) => {
              const parts = dateStr.split('.');
              if (parts.length < 3) return dateStr;
              const day = parseInt(parts[0], 10);
              const monthIndex = parseInt(parts[1], 10) - 1;
              const year = 2000 + parseInt(parts[2], 10);
              const d = new Date(year, monthIndex, day);

              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const targetStart = new Date(year, monthIndex, day);
              const diffDays = Math.round((todayStart.getTime() - targetStart.getTime()) / (1000 * 60 * 60 * 24));

              if (diffDays === 0) return `Heute (${dayNamesFull[d.getDay()]})`;
              if (diffDays === 1) return `Gestern (${dayNamesFull[d.getDay()]})`;
              if (diffDays === 2) return `Vorgestern (${dayNamesFull[d.getDay()]})`;
              return `${dayNamesFull[d.getDay()]}, ${day}. ${monthNamesShort[monthIndex]}`;
            };

            const weekMetrics = getDeterministicWeekMetrics();
            const { weekDays } = weekMetrics;

            let shieldDatesArr: string[] = [];
            try {
              shieldDatesArr = JSON.parse(localStorage.getItem(`cg_shield_usage_dates_${studentId}`) || '[]');
              if (!Array.isArray(shieldDatesArr)) shieldDatesArr = [];
            } catch (e) {
              shieldDatesArr = [];
            }
            if (studentUser?.joker_used_at) {
              const jokerIso = toLocalYYYYMMDD(new Date(studentUser.joker_used_at));
              if (!shieldDatesArr.includes(jokerIso)) {
                shieldDatesArr.push(jokerIso);
              }
            }

            const shieldedDaysMap = new Map<string, number>();
            weekDays.forEach((d: any) => {
              if (d.isJoker) {
                shieldedDaysMap.set(d.dateStr, d.shieldNumber || 1);
                if (!shieldDatesArr.includes(d.dateStr)) {
                  shieldDatesArr.push(d.dateStr);
                }
              }
            });
            shieldDatesArr.forEach((sd, idx) => {
              if (!shieldedDaysMap.has(sd)) {
                shieldedDaysMap.set(sd, idx + 1);
              }
            });
            const shieldDatesSet = new Set(shieldDatesArr);

            // 1. Alle Tage aus getGroupedLogs() erfassen
            const rawGrouped = getGroupedLogs();
            const groupedByDate: Record<string, {
              date: string;
              focusSeconds: number;
              extraSeconds: number;
              hasMasteredSession: boolean;
              flameLevel: string;
              isPlaceholder?: boolean;
              isToday?: boolean;
            }> = {};

            rawGrouped.forEach((g: any) => {
              groupedByDate[g.date] = { ...g };
            });

            // 2. Garantiere lückenlose Ruhetag-Historie: Jeder jemals eingesetzte Schild / Ruhetag wird im Archiv abgebildet
            shieldDatesArr.forEach(isoStr => {
              const isoParts = isoStr.split('-');
              if (isoParts.length === 3) {
                const ddMmYy = `${isoParts[2]}.${isoParts[1]}.${isoParts[0].substring(2)}`;
                if (!groupedByDate[ddMmYy]) {
                  groupedByDate[ddMmYy] = {
                    date: ddMmYy,
                    focusSeconds: 0,
                    extraSeconds: 0,
                    hasMasteredSession: false,
                    flameLevel: 'Keine Flamme',
                    isPlaceholder: false,
                    isToday: ddMmYy === todayDateStr
                  };
                }
              }
            });

            // 3. Relevante Tage: Geübt (> 0) ODER geschützt (Schild/Ruhetag)
            // Auch der heutige Tag wird in Echtzeit erfasst, sobald geübt oder geschützt wurde
            const allMeaningfulLogs = Object.values(groupedByDate).filter(g => {
              const totalSecs = (g.focusSeconds || 0) + (g.extraSeconds || 0);
              const parts = g.date.split('.');
              const isoDateStr = parts.length === 3 ? `20${parts[2]}-${parts[1]}-${parts[0]}` : '';
              const isJoker = Boolean(shieldedDaysMap.has(isoDateStr) || shieldDatesSet.has(isoDateStr));
              return totalSecs > 0 || isJoker;
            });

            allMeaningfulLogs.sort((a, b) => {
              const parseDateStr = (s: string) => {
                const parts = s.split('.');
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = 2000 + parseInt(parts[2], 10);
                return new Date(year, month, day).getTime();
              };
              return parseDateStr(b.date) - parseDateStr(a.date);
            });

            // 4. Mathematisch saubere Monats-Akkumulation
            interface MonthArchive {
              label: string;
              key: string;
              entries: typeof allMeaningfulLogs;
              totalMins: number;
              activePracticeDays: number;
              shieldedDays: number;
            }

            const monthsMap: Record<string, MonthArchive> = {};
            const currentMonthKey = `${now.getMonth()}-${now.getFullYear()}`;
            monthsMap[currentMonthKey] = {
              label: `${monthNamesFull[now.getMonth()]} ${now.getFullYear()}`,
              key: currentMonthKey,
              entries: [],
              totalMins: 0,
              activePracticeDays: 0,
              shieldedDays: 0
            };

            allMeaningfulLogs.forEach(entry => {
              const parts = entry.date.split('.');
              if (parts.length < 3) return;
              const monthIndex = parseInt(parts[1], 10) - 1;
              const yearFull = 2000 + parseInt(parts[2], 10);
              const key = `${monthIndex}-${yearFull}`;

              if (!monthsMap[key]) {
                monthsMap[key] = {
                  label: `${monthNamesFull[monthIndex]} ${yearFull}`,
                  key,
                  entries: [],
                  totalMins: 0,
                  activePracticeDays: 0,
                  shieldedDays: 0
                };
              }
              monthsMap[key].entries.push(entry);

              const totalSecs = (entry.focusSeconds || 0) + (entry.extraSeconds || 0);
              const isoDateStr = parts.length === 3 ? `20${parts[2]}-${parts[1]}-${parts[0]}` : '';
              const isShielded = Boolean(shieldedDaysMap.has(isoDateStr) || shieldDatesSet.has(isoDateStr));

              if (totalSecs > 0) {
                monthsMap[key].totalMins += Math.floor(totalSecs / 60);
                monthsMap[key].activePracticeDays += 1;
              }
              if (isShielded) {
                monthsMap[key].shieldedDays += 1;
              }
            });

            const sortedMonths = Object.values(monthsMap).sort((a, b) => {
              const [aMonth, aYear] = a.key.split('-').map(Number);
              const [bMonth, bYear] = b.key.split('-').map(Number);
              if (aYear !== bYear) return bYear - aYear;
              return bMonth - aMonth;
            });

            // Globale Kennzahlen für den Header
            const totalActivePracticeDays = allMeaningfulLogs.filter(e => ((e.focusSeconds || 0) + (e.extraSeconds || 0)) > 0).length;
            const totalShieldedDaysCount = allMeaningfulLogs.filter(e => {
              const parts = e.date.split('.');
              const isoDateStr = parts.length === 3 ? `20${parts[2]}-${parts[1]}-${parts[0]}` : '';
              return Boolean(shieldedDaysMap.has(isoDateStr) || shieldDatesSet.has(isoDateStr));
            }).length;

            // Level-spezifische Design-Tokens
            const containerBg = isTeen ? 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' : '#ffffff';
            const containerBorder = isTeen ? '1.5px solid rgba(245, 158, 11, 0.25)' : '1.5px solid #e2e8f0';
            const containerShadow = isTeen ? '0 20px 40px rgba(0, 0, 0, 0.3)' : '0 8px 24px rgba(0, 0, 0, 0.04)';
            const headerBorderBottom = isTeen ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #f1f5f9';
            const iconBadgeBg = isTeen ? 'rgba(245, 158, 11, 0.15)' : '#e6f4ea';
            const iconBadgeBorder = isTeen ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #86efac';
            const iconColor = isTeen ? '#fbbf24' : '#16a34a';
            const titleColor = isTeen ? '#ffffff' : '#0f172a';
            const subtitleColor = isTeen ? '#94a3b8' : '#64748b';
            const countPillBg = isTeen ? 'rgba(15, 23, 42, 0.7)' : '#f8fafc';
            const countPillColor = isTeen ? '#e2e8f0' : '#475569';
            const countPillBorder = isTeen ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0';

            return (
              <div style={{
                width: '100%',
                background: containerBg,
                borderRadius: '24px',
                border: containerBorder,
                padding: '22px 26px',
                boxShadow: containerShadow,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: headerBorderBottom, paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: iconBadgeBg, border: iconBadgeBorder, padding: '8px', borderRadius: '12px' }}>
                      <Calendar size={18} color={iconColor} />
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 850, fontSize: '18px', color: titleColor, margin: 0 }}>
                        Übe-Chronik &amp; Archiv
                      </h4>
                      <p style={{ fontSize: '0.74rem', color: subtitleColor, margin: '2px 0 0 0', fontWeight: 600 }}>
                        {isTeen ? 'Alle vergangenen Übe-Tage & gesammelten XP im Monatsverlauf' : 'Übe-Verlauf & dokumentierte Einheiten im Monatsüberblick'}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: countPillColor, fontWeight: 750, background: countPillBg, border: countPillBorder, padding: '4px 12px', borderRadius: '100px' }}>
                    {totalActivePracticeDays} dokumentierte {totalActivePracticeDays === 1 ? 'Übetag' : 'Übetage'}
                    {totalShieldedDaysCount > 0 ? (isTeen ? ` • ${totalShieldedDaysCount} geschützt` : ` • ${totalShieldedDaysCount} ${totalShieldedDaysCount === 1 ? 'Ruhetag' : 'Ruhetage'}`) : ''}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {sortedMonths.map((month, mIdx) => {
                    const isExpanded = expandedMonths[month.key] !== undefined 
                      ? expandedMonths[month.key] 
                      : mIdx === 0;

                    const toggleMonth = () => {
                      setExpandedMonths(prev => ({
                        ...prev,
                        [month.key]: !isExpanded
                      }));
                    };

                    return (
                      <div key={month.key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Month Header Accordion */}
                        <div
                          onClick={toggleMonth}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: isTeen ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc',
                            border: isTeen ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                            borderRadius: '16px',
                            padding: '12px 16px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ChevronRight 
                              size={15} 
                              style={{ 
                                color: isTeen ? '#fbbf24' : '#64748b', 
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                                transition: 'transform 0.2s ease-in-out' 
                              }} 
                            />
                            <span style={{ fontWeight: 850, fontSize: '0.86rem', color: isTeen ? '#f8fafc' : '#0f172a' }}>
                              {month.label}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{
                              fontSize: '0.70rem',
                              fontWeight: 800,
                              color: isTeen ? '#fbbf24' : '#15803d',
                              background: isTeen ? 'rgba(245, 158, 11, 0.15)' : '#e6f4ea',
                              border: isTeen ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #86efac',
                              padding: '3px 10px',
                              borderRadius: '100px'
                            }}>
                              {month.activePracticeDays} {month.activePracticeDays === 1 ? 'Übetag' : 'Übetage'}
                              {month.shieldedDays > 0 ? (
                                isTeen ? ` • ${month.shieldedDays} geschützt` : ` • ${month.shieldedDays} ${month.shieldedDays === 1 ? 'Ruhetag' : 'Ruhetage'}`
                              ) : ''}
                              {` • ${month.totalMins} Min.`}
                            </span>
                          </div>
                        </div>

                        {/* Collapsed/Expanded List of Past Sessions */}
                        {isExpanded && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '6px' }}>
                            {month.entries.length === 0 ? (
                              <div style={{
                                textAlign: 'center',
                                color: isTeen ? '#94a3b8' : '#64748b',
                                fontSize: '0.78rem',
                                fontStyle: 'italic',
                                padding: '16px 10px',
                                background: isTeen ? 'rgba(15, 23, 42, 0.5)' : '#fafafa',
                                borderRadius: '14px',
                                border: isTeen ? '1px dashed rgba(255,255,255,0.1)' : '1px dashed #e2e8f0'
                              }}>
                                Noch keine vergangenen Sessions in diesem Monat archiviert.
                              </div>
                            ) : (
                              month.entries.map((entry, eIdx) => {
                                const parts = entry.date.split('.');
                                const isoDateStr = parts.length === 3 ? `20${parts[2]}-${parts[1]}-${parts[0]}` : '';
                                const isShielded = Boolean(shieldedDaysMap.has(isoDateStr) || shieldDatesSet.has(isoDateStr));
                                const shieldNumber = shieldedDaysMap.get(isoDateStr) || (shieldDatesArr.indexOf(isoDateStr) !== -1 ? shieldDatesArr.indexOf(isoDateStr) + 1 : 1);

                                const fSecs = entry.focusSeconds || 0;
                                const eSecs = entry.extraSeconds || 0;
                                const totalSecs = fSecs + eSecs;
                                const totalMins = Math.floor(totalSecs / 60);
                                const xp = Math.max(1, totalMins);

                                if (isShielded) {
                                  return (
                                    <div
                                      key={eIdx}
                                      style={{
                                        background: isTeen ? 'rgba(30, 41, 59, 0.55)' : '#ffffff',
                                        border: isTeen ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #e2e8f0',
                                        borderRadius: '16px',
                                        padding: '12px 16px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        boxShadow: isTeen ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.02)',
                                        borderLeft: isTeen ? '4px solid #f59e0b' : '4px solid #16a34a'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                          width: '34px',
                                          height: '34px',
                                          borderRadius: '10px',
                                          background: isTeen ? 'rgba(245, 158, 11, 0.15)' : '#e6f4ea',
                                          border: isTeen ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #86efac',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center'
                                        }}>
                                          {isTeen ? (
                                            <Shield size={17} color="#fbbf24" fill="#fbbf24" />
                                          ) : (
                                            <ShieldCheck size={17} color="#16a34a" />
                                          )}
                                        </div>
                                        <div>
                                          <span style={{ fontSize: '0.82rem', fontWeight: 850, color: isTeen ? '#ffffff' : '#0f172a' }}>
                                            {formatFriendlyDate(entry.date)}
                                          </span>
                                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isTeen ? '#fbbf24' : '#15803d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                              {isTeen ? (
                                                <Shield size={10} color="#fbbf24" fill="#fbbf24" />
                                              ) : (
                                                <ShieldCheck size={11} color="#16a34a" />
                                              )}
                                              {isTeen ? `Schild ${shieldNumber} eingesetzt (Woche geschützt)` : `Ruhetag ${shieldNumber} eingelegt (Fokus-Schutz)`}
                                            </span>
                                            {totalSecs > 0 && (
                                              <>
                                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>•</span>
                                                <span style={{ fontSize: '0.70rem', fontWeight: 650, color: isTeen ? '#cbd5e1' : '#64748b', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                  {isTeen ? '⏱️' : <Clock size={11} color="#16a34a" style={{ flexShrink: 0 }} />}
                                                  {totalSecs < 60 ? `${totalSecs} Sek.` : `${Math.floor(totalSecs / 60)}:${String(totalSecs % 60).padStart(2, '0')} Min.`} Fokus
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <span style={{
                                        fontSize: '0.70rem',
                                        fontWeight: 800,
                                        color: isTeen ? '#fbbf24' : '#15803d',
                                        background: isTeen ? 'rgba(245, 158, 11, 0.15)' : '#e6f4ea',
                                        padding: '3px 10px',
                                        borderRadius: '8px',
                                        border: isTeen ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #86efac',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}>
                                        {isTeen ? (
                                          <Shield size={10} color="#fbbf24" fill="#fbbf24" />
                                        ) : (
                                          <ShieldCheck size={11} color="#16a34a" />
                                        )}
                                        {isTeen ? `Schild ${shieldNumber} geschützt` : `Ruhetag ${shieldNumber} aktiv`}
                                      </span>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={eIdx}
                                    style={{
                                      background: isTeen ? 'rgba(30, 41, 59, 0.55)' : '#ffffff',
                                      border: isTeen ? '1px solid rgba(255, 255, 255, 0.08)' : (entry.hasMasteredSession ? '1px solid #bbf7d0' : '1px solid #e2e8f0'),
                                      borderRadius: '16px',
                                      padding: '12px 16px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      boxShadow: isTeen ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.02)',
                                      borderLeft: isTeen 
                                        ? (entry.hasMasteredSession ? '4px solid #10b981' : '4px solid #f59e0b') 
                                        : (entry.hasMasteredSession ? '4px solid #10b981' : '4px solid #16a34a')
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div style={{
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '10px',
                                        background: isTeen 
                                          ? (entry.hasMasteredSession ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)') 
                                          : (entry.hasMasteredSession ? '#f0fdf4' : '#e6f4ea'),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}>
                                        <Flame 
                                          size={17} 
                                          color={isTeen 
                                            ? (entry.hasMasteredSession ? '#34d399' : '#fbbf24') 
                                            : (entry.hasMasteredSession ? '#166534' : '#16a34a')
                                          } 
                                          fill={entry.hasMasteredSession ? (isTeen ? '#34d399' : '#166534') : 'none'} 
                                        />
                                      </div>
                                      <div>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 850, color: isTeen ? '#ffffff' : '#0f172a' }}>
                                          {formatFriendlyDate(entry.date)}
                                        </span>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isTeen ? '#34d399' : '#166534', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            {isTeen ? '⏱️' : <Clock size={11} color="#16a34a" style={{ flexShrink: 0 }} />}
                                            {totalSecs < 60 ? `${totalSecs} Sek.` : `${Math.floor(totalSecs / 60)}:${String(totalSecs % 60).padStart(2, '0')} Min.`} Fokus
                                          </span>
                                          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>•</span>
                                          <span style={{ fontSize: '0.72rem', fontWeight: 850, color: isTeen ? '#38bdf8' : '#15803d', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            {isTeen ? (
                                              `+${xp} XP ⚡`
                                            ) : (
                                              <>
                                                <Zap size={11} color="#16a34a" style={{ flexShrink: 0 }} />
                                                <span>+{xp} XP</span>
                                              </>
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <span style={{
                                      fontSize: '0.70rem',
                                      fontWeight: 800,
                                      color: isTeen 
                                        ? (entry.hasMasteredSession ? '#34d399' : '#fbbf24') 
                                        : (entry.hasMasteredSession ? '#166534' : '#15803d'),
                                      background: isTeen 
                                        ? (entry.hasMasteredSession ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)') 
                                        : (entry.hasMasteredSession ? '#f0fdf4' : '#e6f4ea'),
                                      padding: '3px 10px',
                                      borderRadius: '8px',
                                      border: isTeen 
                                        ? (entry.hasMasteredSession ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)') 
                                        : (entry.hasMasteredSession ? '1px solid #bbf7d0' : '1px solid #86efac')
                                    }}>
                                      {entry.hasMasteredSession 
                                        ? (isTeen ? 'Meisterhaft' : 'Ziel erreicht ✓') 
                                        : (isTeen ? 'Übe-Session' : 'Fokus-Einheit')}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          </>
        )}
      </div>
  );
};
