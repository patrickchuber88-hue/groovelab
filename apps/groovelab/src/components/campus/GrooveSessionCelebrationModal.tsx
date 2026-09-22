import React, { useEffect } from 'react';
import { Trophy, Star, Sparkles, Clock, Flame, Play, X, CheckCircle2 } from 'lucide-react';

export interface GrooveSessionCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  onCompleteAndExit?: () => void;
  xpEarned: number;
  practiceSeconds: number;
  accuracy: number;
  maxStreak: number;
  bpm: number;
  levelName: string;
  studentName?: string;
  radarLevelUp?: {
    newLevel: number;
    title: string;
  } | null;
}

export const GrooveSessionCelebrationModal: React.FC<GrooveSessionCelebrationModalProps> = ({
  isOpen,
  onClose,
  onPlayAgain,
  onCompleteAndExit,
  xpEarned,
  practiceSeconds,
  accuracy,
  maxStreak,
  bpm,
  levelName,
  studentName,
  radarLevelUp
}) => {
  // WCAG AA Escape Key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const stars = accuracy >= 90 ? 3 : (accuracy >= 70 ? 2 : 1);
  const practiceMinutes = Math.max(1, Math.round(practiceSeconds / 60));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.70)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#ffffff',
          borderRadius: '28px',
          border: '1.5px solid #fed7aa',
          boxShadow: '0 25px 50px -12px rgba(217, 119, 6, 0.25), 0 10px 20px rgba(0, 0, 0, 0.15)',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '20px',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        {/* Close Button top-right */}
        <button
          type="button"
          onClick={onCompleteAndExit || onClose}
          aria-label="Modal schließen"
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '10px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b'
          }}
        >
          <X size={18} />
        </button>

        {/* 1. Header Trophy Icon */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(217, 119, 6, 0.35)',
            marginTop: '4px'
          }}
        >
          <Trophy size={36} color="#ffffff" strokeWidth={2.4} />
        </div>

        {/* 2. Title & Star Rating */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
            {[1, 2, 3].map((starIdx) => {
              const isActive = starIdx <= stars;
              return (
                <Star
                  key={starIdx}
                  size={26}
                  color={isActive ? '#f59e0b' : '#cbd5e1'}
                  fill={isActive ? '#f59e0b' : 'transparent'}
                  strokeWidth={2.2}
                />
              );
            })}
          </div>

          <h2
            id="celebration-title"
            style={{
              margin: 0,
              fontSize: '1.45rem',
              fontWeight: 950,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            {stars === 3 ? 'Groove-Meisterleistung!' : (stars === 2 ? 'Klasse Rhythmus-Puls!' : 'Starker Übe-Einsatz!')}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: '#64748b', fontWeight: 700 }}>
            {levelName} • {bpm} BPM • {studentName || 'Groove-Schüler'}
          </p>
        </div>

        {/* AUTONOMER RADAR LEVEL-UP BANNER */}
        {radarLevelUp && (
          <div style={{
            width: '100%',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '2px solid #f59e0b',
            borderRadius: '20px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
            boxSizing: 'border-box'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)'
            }}>
              <Sparkles size={24} color="#d97706" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.70rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase' }}>
                Skill-Radar Level-Up!
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 950, color: '#78350f' }}>
                Stufe {radarLevelUp.newLevel}: {radarLevelUp.title}
              </div>
            </div>
          </div>
        )}

        {/* 3. XP & Übezeit Belohnungskarten */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
          {/* XP Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1.5px solid #fde68a',
              borderRadius: '20px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', fontWeight: 900, color: '#b45309' }}>
              <Sparkles size={14} color="#d97706" />
              <span>Verdiente XP</span>
            </div>
            <span style={{ fontSize: '1.85rem', fontWeight: 950, color: '#b45309', letterSpacing: '-0.02em' }}>
              +{xpEarned}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 750 }}>
              XP-Punkte gesichert
            </span>
          </div>

          {/* Practice Time Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1.5px solid #bbf7d0',
              borderRadius: '20px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', fontWeight: 900, color: '#166534' }}>
              <Clock size={14} color="#16a34a" />
              <span>Übeminuten</span>
            </div>
            <span style={{ fontSize: '1.65rem', fontWeight: 950, color: '#14532d', letterSpacing: '-0.02em' }}>
              {practiceMinutes} Min.
            </span>
            <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 750 }}>
              Mit Briefing-Board synchron
            </span>
          </div>
        </div>

        {/* 4. Detail-Metriken (Trefferquote & Streak) */}
        <div
          style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            padding: '10px 16px',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 800 }}>Trefferquote</span>
            <span style={{ fontSize: '1.10rem', fontWeight: 950, color: '#15803d' }}>{accuracy}%</span>
          </div>
          <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 800 }}>Max. Streak</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Flame size={14} color="#d97706" />
              <span style={{ fontSize: '1.10rem', fontWeight: 950, color: '#b45309' }}>{maxStreak}</span>
            </div>
          </div>
        </div>

        {/* 5. 1% Goldstandard Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onPlayAgain}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              border: 'none',
              borderRadius: '16px',
              padding: '14px 20px',
              color: '#ffffff',
              fontSize: '1.02rem',
              fontWeight: 950,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 6px 18px rgba(249, 115, 22, 0.40)',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
          >
            <Play size={18} fill="#ffffff" color="#ffffff" />
            <span>Nochmal spielen ➔</span>
          </button>

          <button
            type="button"
            onClick={onCompleteAndExit || onClose}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              border: 'none',
              borderRadius: '16px',
              padding: '13px 20px',
              color: '#ffffff',
              fontSize: '0.94rem',
              fontWeight: 950,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.30)',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
          >
            <CheckCircle2 size={18} color="#ffffff" />
            <span>Abschließen & Beenden (+{xpEarned} XP) ➔</span>
          </button>
        </div>
      </div>
    </div>
  );
};
