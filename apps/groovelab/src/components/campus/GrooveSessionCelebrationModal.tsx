import React, { useEffect } from 'react';
import { Trophy, Star, Sparkles, Clock, Flame, Play, X, CheckCircle2 } from 'lucide-react';

export interface GrooveSessionCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
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
        {/* Close Button top-right (Stays in taskbook!) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Modal schließen und im Aufgabenheft bleiben"
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
            {stars === 3 ? 'Meisterhafter Groove!' : (stars === 2 ? 'Klasse Rhythmus-Puls!' : 'Starker Übe-Einsatz!')}
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
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
            }}>
              <Trophy size={24} color="#d97706" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', flex: 1 }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 950, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Kompetenz-Radar Aufstieg!
              </span>
              <span style={{ fontSize: '0.94rem', fontWeight: 950, color: '#78350f', lineHeight: 1.2 }}>
                Rhythmus-Säule: Stufe {radarLevelUp.newLevel} ({radarLevelUp.title})
              </span>
              <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#92400e', marginTop: '2px' }}>
                Durch fleißiges Üben &amp; Treffergenauigkeit selbständig gemeistert!
              </span>
            </div>
          </div>
        )}

        {/* 3. KPI Highlights (XP & Übeminuten synchronisiert) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            width: '100%'
          }}
        >
          {/* XP Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1.5px solid #fde68a',
              borderRadius: '18px',
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#b45309', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase' }}>
              <Sparkles size={14} color="#d97706" />
              <span>Gesammelte XP</span>
            </div>
            <span style={{ fontSize: '1.65rem', fontWeight: 950, color: '#92400e', letterSpacing: '-0.02em' }}>
              +{xpEarned} XP
            </span>
            <span style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 750 }}>
              Ins Schüler-Konto gebucht
            </span>
          </div>

          {/* Übezeit Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1.5px solid #86efac',
              borderRadius: '18px',
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#166534', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase' }}>
              <Clock size={14} color="#15803d" />
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
            border: '1px solid #e2e8f0',
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

        {/* 5. Action Buttons (Aufgabenheft bleibt offen!) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onPlayAgain}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              borderRadius: '16px',
              padding: '14px 20px',
              color: '#ffffff',
              fontSize: '0.96rem',
              fontWeight: 950,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
          >
            <Play size={18} fill="#ffffff" color="#ffffff" />
            <span>Gleich nochmal spielen</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              background: '#f1f5f9',
              border: '1.5px solid #cbd5e1',
              borderRadius: '16px',
              padding: '12px 20px',
              color: '#334155',
              fontSize: '0.88rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
          >
            <CheckCircle2 size={16} color="#15803d" />
            <span>XP gesichert! Schließen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
