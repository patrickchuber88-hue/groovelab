import React from "react";
import { createPortal } from "react-dom";
import { CheckCircle, Flame, Shield, Sparkles, Target, Timer, Zap } from "lucide-react";

export interface StudentSessionCelebrationModalProps {
  isOpen: boolean;
  celebrationDetails: {
    exactSeconds?: number;
    sessionMinutes?: number;
    dailyGoal?: number;
    sessionCompletedTarget?: boolean;
    streakFlame?: number;
    xpGained?: number;
    usedJokerThisSession?: boolean;
    streak?: number;
  } | null;
  studentUiLevel: 'junior' | 'teen' | 'pro';
  personalAverageMinutes: number;
  celebrationRingProgress: number;
  celebrationCanvasRef: React.RefObject<any>;
  onClose: () => void;
}

export const StudentSessionCelebrationModal: React.FC<StudentSessionCelebrationModalProps> = ({
  isOpen,
  celebrationDetails,
  studentUiLevel,
  personalAverageMinutes,
  celebrationRingProgress,
  celebrationCanvasRef,
  onClose,
}) => {
  if (!isOpen || !celebrationDetails || typeof document === "undefined") return null;

  const exactSecs = celebrationDetails.exactSeconds ?? ((celebrationDetails.sessionMinutes ?? 0) * 60);
  const targetMins = celebrationDetails.dailyGoal || 3;
  const targetSecs = targetMins * 60;
  const isGoalReached = Boolean(celebrationDetails.sessionCompletedTarget);
  const remainingSecs = Math.max(0, targetSecs - exactSecs);
  const isFlow = exactSecs >= targetSecs + 90;

  const formatSecs = (s: number) => {
    if (s < 60) return `${s} Sek.`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}:${String(rem).padStart(2, '0')} Min.` : `${m} Min.`;
  };

  let celebrationTitle = studentUiLevel === 'pro'
    ? "Fokus-Session erfasst"
    : studentUiLevel === 'teen'
    ? "Groove gestartet!"
    : "Der erste Schritt sitzt!";
  let celebrationSubtitle = studentUiLevel === 'pro'
    ? `${formatSecs(exactSecs)} konzentrierte Spielzeit erfasst. Noch ${formatSecs(remainingSecs)} bis zum vollen Tagesziel.`
    : studentUiLevel === 'teen'
    ? `Jede Minute am Instrument zählt. Noch ${formatSecs(remainingSecs)} bis zum vollen Tagesziel! ⚡`
    : `Dein Gehirn und deine Finger lernen ab der 1. Sekunde. Noch ${formatSecs(remainingSecs)} bis zur Tages-Flamme! 🔥`;

  if (isFlow) {
    celebrationTitle = studentUiLevel === 'pro'
      ? "Exzellenter Flow & Fokus"
      : studentUiLevel === 'teen'
      ? "Voller Groove & Flow! 🎧"
      : "Voller Flow & Spielfreude! 🚀";
    celebrationSubtitle = studentUiLevel === 'pro'
      ? `${formatSecs(exactSecs)} fokussierte Übezeit erfasst. Höchste musikalische Hingabe und Präzision.`
      : studentUiLevel === 'teen'
      ? `Du warst voll im Sound – ${formatSecs(exactSecs)} pure Hingabe! ⚡`
      : `Du warst voll im Sound – ${formatSecs(exactSecs)} pure Hingabe! ✨`;
  } else if (isGoalReached) {
    celebrationTitle = studentUiLevel === 'pro'
      ? "Tagesziel meisterhaft erreicht"
      : studentUiLevel === 'teen'
      ? "Tages-Session gemeistert! ⚡"
      : "Tages-Flamme entfacht! 🔥";
    celebrationSubtitle = studentUiLevel === 'pro'
      ? `${targetMins} Minuten gezielte Übepraxis erfolgreich dokumentiert. Kontinuität formt meisterhafte Virtuosität.`
      : studentUiLevel === 'teen'
      ? `${targetMins} Minuten voller Fokus. Dein Timing und Rhythmus werden von Tag zu Tag stabiler! ⚡`
      : `${targetMins} Minuten voller Fokus. Genau dieses tägliche Dranbleiben macht dich meisterhaft! 🏆`;
  }

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10003, // Topmost layer
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        color: '#1e293b',
        userSelect: 'none',
        fontFamily: '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif'
      }}
    >
      <div role="dialog" aria-modal="true" style={{
        width: '100%',
        maxWidth: '380px',
        background: '#ffffff',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        borderRadius: '32px',
        padding: '34px 24px',
        textAlign: 'center',
        boxShadow: studentUiLevel === 'pro'
          ? '0 25px 60px -15px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.1), 0 0 40px rgba(0, 113, 227, 0.08)'
          : studentUiLevel === 'teen'
          ? '0 25px 60px -15px rgba(0, 0, 0, 0.18), 0 0 1px rgba(0, 0, 0, 0.1), 0 0 40px rgba(13, 148, 136, 0.12)'
          : '0 25px 60px -15px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.1), 0 0 40px rgba(52, 168, 83, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '22px',
        position: 'relative'
      }}>
        {/* Animated Progress Ring Container */}
        <div style={{ position: 'relative', width: '136px', height: '136px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          {/* Canvas for Particle Explosion */}
          <canvas
            ref={celebrationCanvasRef}
            width={320}
            height={320}
            style={{
              position: 'absolute',
              top: '-92px',
              left: '-92px',
              width: '320px',
              height: '320px',
              pointerEvents: 'none',
              zIndex: 10
            }}
          />

          {/* SVG circular progress bar */}
          <svg width="136" height="136" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth="8"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="transparent"
              stroke="url(#celebrationProgressGrad)"
              strokeWidth="8"
              strokeDasharray="439.82"
              strokeDashoffset={439.82 - 439.82 * celebrationRingProgress}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                filter: studentUiLevel === 'pro'
                  ? 'drop-shadow(0 2px 6px rgba(22, 163, 74, 0.35))'
                  : studentUiLevel === 'teen'
                  ? 'drop-shadow(0 2px 6px rgba(13, 148, 136, 0.35))'
                  : 'drop-shadow(0 2px 6px rgba(52, 168, 83, 0.35))'
              }}
            />
            <defs>
              <linearGradient id="celebrationProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={studentUiLevel === 'pro' ? "#16a34a" : studentUiLevel === 'teen' ? "#0d9488" : "#34a853"} />
                <stop offset="100%" stopColor={studentUiLevel === 'pro' ? "#22c55e" : studentUiLevel === 'teen' ? "#f59e0b" : "#22c55e"} />
              </linearGradient>
            </defs>
          </svg>

          {/* Icon & Streak Count in Center */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5
          }}>
            {studentUiLevel === 'pro' ? (
              <CheckCircle
                size={32}
                color="#16a34a"
                style={{
                  filter: 'drop-shadow(0 2px 8px rgba(22, 163, 74, 0.35))'
                }}
              />
            ) : (
              <Flame
                size={34}
                color={studentUiLevel === 'teen' ? "#f59e0b" : "#ea580c"}
                fill={studentUiLevel === 'teen' ? "#f59e0b" : "#ea580c"}
                style={{
                  filter: studentUiLevel === 'teen' 
                    ? 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.45))'
                    : 'drop-shadow(0 2px 8px rgba(234, 88, 12, 0.45))',
                  transform: 'scale(1)',
                  animation: 'pulse 2s infinite ease-in-out'
                }}
              />
            )}
            <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1e293b', marginTop: '1px', lineHeight: 1 }}>
              {celebrationDetails.streakFlame && celebrationDetails.streakFlame > 0 ? celebrationDetails.streakFlame : '1.'}
            </span>
            <span style={{ 
              fontSize: '0.72rem', 
              fontWeight: 900, 
              color: studentUiLevel === 'pro' ? '#16a34a' : studentUiLevel === 'teen' ? '#f59e0b' : '#ea580c', 
              textTransform: 'uppercase', 
              letterSpacing: '0.06em', 
              marginTop: '2px' 
            }}>
              {studentUiLevel === 'pro' 
                ? (celebrationDetails.streakFlame && celebrationDetails.streakFlame > 0 ? 'Tage Serie' : 'Tag 1') 
                : (celebrationDetails.streakFlame && celebrationDetails.streakFlame > 0 ? 'Tage Streak' : 'Tag im Anflug')}
            </span>
          </div>
        </div>

        <div>
          <h3 style={{ 
            fontSize: '1.58rem', 
            fontWeight: 900, 
            color: studentUiLevel === 'pro' ? '#0f172a' : studentUiLevel === 'teen' ? '#0f172a' : '#166534', 
            margin: '0 0 6px 0', 
            letterSpacing: '-0.03em' 
          }}>
            {celebrationTitle}
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#64748b', fontWeight: 600, lineHeight: 1.48, margin: 0, maxWidth: '320px' }}>
            {celebrationSubtitle}
          </p>
        </div>

        {/* Modern 3-Pill Grid (Light Mode) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          width: '100%'
        }}>
          {/* Pill 1: Fokus-Zeit */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '13px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
          }}>
            <Timer size={18} color={studentUiLevel === 'pro' ? "#16a34a" : studentUiLevel === 'teen' ? "#0d9488" : "#34a853"} />
            <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.1 }}>
              {formatSecs(exactSecs)}
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Fokus-Zeit
            </span>
          </div>

          {/* Pill 2: XP / Erfahrung */}
          <div style={{
            background: studentUiLevel === 'pro'
              ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
              : studentUiLevel === 'teen'
              ? 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)'
              : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: studentUiLevel === 'pro'
              ? '1px solid #86efac'
              : studentUiLevel === 'teen'
              ? '1px solid #99f6e4'
              : '1px solid #bae6fd',
            borderRadius: '20px',
            padding: '13px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            boxShadow: studentUiLevel === 'pro' ? '0 2px 6px rgba(22, 163, 74, 0.08)' : '0 2px 6px rgba(2, 132, 199, 0.06)'
          }}>
            <Zap size={18} color={studentUiLevel === 'pro' ? "#16a34a" : studentUiLevel === 'teen' ? "#0d9488" : "#0284c7"} />
            <span style={{ 
              fontSize: '0.88rem', 
              fontWeight: 900, 
              color: studentUiLevel === 'pro' ? '#15803d' : studentUiLevel === 'teen' ? '#0d9488' : '#0284c7', 
              lineHeight: 1.1 
            }}>
              {exactSecs < 60 
                ? (studentUiLevel === 'pro' ? 'Score ab 1m' : '1. XP ab 1m') 
                : `+${celebrationDetails.xpGained} XP`}
            </span>
            <span style={{ 
              fontSize: '0.72rem', 
              fontWeight: 800, 
              color: studentUiLevel === 'pro' ? '#16a34a' : studentUiLevel === 'teen' ? '#0f766e' : '#0369a1', 
              textTransform: 'uppercase', 
              letterSpacing: '0.04em' 
            }}>
              {exactSecs < 60 
                ? (studentUiLevel === 'pro' ? `Noch ${60 - exactSecs}s` : studentUiLevel === 'teen' ? `Noch ${60 - exactSecs}s ⚡` : `Noch ${60 - exactSecs}s 🚀`) 
                : (studentUiLevel === 'pro' ? 'Fokus-Score' : studentUiLevel === 'teen' ? 'Erfahrung ⚡' : 'Erfahrung ✨')}
            </span>
          </div>

          {/* Pill 3: Ziel & Ø-Schnitt */}
          <div style={{
            background: isGoalReached ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
            border: isGoalReached ? '1px solid #86efac' : '1px solid #fde047',
            borderRadius: '20px',
            padding: '13px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
          }}>
            <Target size={18} color={isGoalReached ? "#15803d" : "#ca8a04"} />
            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: isGoalReached ? '#15803d' : '#854d0e', lineHeight: 1.1 }}>
              {isGoalReached ? 'Ziel erreicht!' : `Noch ${formatSecs(remainingSecs)}`}
            </span>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: isGoalReached ? '#166534' : '#a16207', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
              Ø {personalAverageMinutes}m • {targetMins}m Ziel
            </span>
          </div>
        </div>

        {celebrationDetails.usedJokerThisSession && (
          <div style={{
            fontSize: '0.82rem',
            color: '#5b21b6',
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            border: '1.5px solid #c4b5fd',
            padding: '12px 14px',
            borderRadius: '16px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.12)',
            animation: 'popIn 0.3s ease-out'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 3px 10px rgba(124, 58, 237, 0.35)'
            }}>
              <Shield size={18} color="#ffffff" fill="#ffffff" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 900, color: '#6d28d9', fontSize: '0.86rem' }}>
                  Schutzschild aktiv! 🔥
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, background: '#f5f3ff', color: '#6d28d9', padding: '2px 8px', borderRadius: '100px', border: '1px solid #ddd6fe' }}>
                  Glut-Schutz
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 650, marginTop: '2px' }}>
                Dein <strong>{celebrationDetails.streak}-Tage-Streak</strong> wurde gerettet und glimmt geschützt weiter!
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            background: studentUiLevel === 'pro'
              ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
              : studentUiLevel === 'teen'
              ? 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'
              : 'linear-gradient(135deg, #34a853 0%, #22c55e 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '16px 20px',
            borderRadius: '20px',
            fontWeight: 900,
            fontSize: '0.98rem',
            letterSpacing: '-0.01em',
            cursor: 'pointer',
            boxShadow: studentUiLevel === 'pro'
              ? 'inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 10px 25px -4px rgba(22, 163, 74, 0.4)'
              : studentUiLevel === 'teen'
              ? 'inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 10px 25px -4px rgba(13, 148, 136, 0.4)'
              : 'inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 10px 25px -4px rgba(52, 168, 83, 0.4)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          className="hover-scale"
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {studentUiLevel === 'pro' ? (
            <CheckCircle size={18} />
          ) : studentUiLevel === 'teen' ? (
            <Zap size={18} />
          ) : (
            <Sparkles size={18} />
          )}
          <span>
            {studentUiLevel === 'pro'
              ? 'Session abschließen'
              : studentUiLevel === 'teen'
              ? 'Groove mitnehmen'
              : "Super, weiter geht's!"}
          </span>
        </button>
      </div>
    </div>,
    document.body
  );
};
