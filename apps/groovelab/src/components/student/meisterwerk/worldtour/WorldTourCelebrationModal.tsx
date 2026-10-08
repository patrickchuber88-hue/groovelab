import React, { useEffect } from 'react';
import { Award, RotateCcw, Search, Compass, Sparkles, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import { WorldTourCountry } from '../../../../types/worldTour';

interface WorldTourCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  country: WorldTourCountry;
  stars: number;
  scorePercent: number;
  hitCount: number;
  nearCount: number;
  missCount: number;
  xpAwarded: number;
  onRetry: () => void;
  onAnalyzeScore: () => void;
  onBackToMap?: () => void;
}

export const WorldTourCelebrationModal: React.FC<WorldTourCelebrationModalProps> = ({
  isOpen,
  onClose,
  country,
  stars,
  scorePercent,
  hitCount,
  nearCount,
  missCount,
  xpAwarded,
  onRetry,
  onAnalyzeScore,
  onBackToMap
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onAnalyzeScore();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onAnalyzeScore]);

  if (!isOpen) return null;

  const isSuccess = stars >= 1;
  const isPerfection = stars === 3;

  // Stamp ink color by outcome
  const stampColor = isPerfection
    ? '#15803d' // Dark Emerald Green
    : stars === 2
    ? '#0284c7' // Ocean Blue
    : stars === 1
    ? '#b45309' // Warm Amber
    : '#64748b'; // Slate

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ergebnis für ${country.name}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onAnalyzeScore();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1.5px solid #e2e8f0',
          position: 'relative',
          animation: 'fade-in 0.25s ease-out'
        }}
      >
        {/* Schließen / Zum Notenbild Button */}
        <button
          onClick={onAnalyzeScore}
          aria-label="Modal schließen und Notenbild analysieren"
          title="Notenbild analysieren (Esc)"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            zIndex: 10,
            touchAction: 'manipulation'
          }}
          className="hover-scale"
        >
          <X size={18} />
        </button>

        {/* Header Hero mit 3D Reisepass-Stempel */}
        <div
          style={{
            padding: '32px 24px 20px 24px',
            background: isSuccess
              ? 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)'
              : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative'
          }}
        >
          {/* 3D Reisepass-Stempel (Ink Stamp SVG) */}
          <div
            style={{
              position: 'relative',
              width: '130px',
              height: '130px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(-5deg)',
              filter: `drop-shadow(0 4px 10px ${stampColor}33)`,
              marginBottom: '12px'
            }}
          >
            <svg width="130" height="130" viewBox="0 0 130 130" fill="none">
              {/* Outer jagged / stamped ring */}
              <circle
                cx="65"
                cy="65"
                r="60"
                stroke={stampColor}
                strokeWidth="3.5"
                strokeDasharray="5 3"
              />
              <circle
                cx="65"
                cy="65"
                r="53"
                stroke={stampColor}
                strokeWidth="1.5"
              />
              {/* Country & Program Text */}
              <path
                id="stampCurveTop"
                d="M 22 65 A 43 43 0 0 1 108 65"
                fill="none"
              />
              <text fontSize="8.5" fontWeight="900" fill={stampColor} letterSpacing="1.2">
                <textPath href="#stampCurveTop" startOffset="50%" textAnchor="middle">
                  ★ CAMPUS GROOVELAB ★
                </textPath>
              </text>
              <path
                id="stampCurveBottom"
                d="M 108 65 A 43 43 0 0 1 22 65"
                fill="none"
              />
              <text fontSize="8" fontWeight="800" fill={stampColor} letterSpacing="1.1">
                <textPath href="#stampCurveBottom" startOffset="50%" textAnchor="middle">
                  {country.name.toUpperCase()}
                </textPath>
              </text>
              {/* Center icon / year */}
              <circle cx="65" cy="65" r="24" fill={`${stampColor}14`} stroke={stampColor} strokeWidth="1.5" />
              <text x="65" y="62" fontSize="14" textAnchor="middle" dominantBaseline="central">
                {country.flagEmoji}
              </text>
              <text x="65" y="77" fontSize="8" fontWeight="900" fill={stampColor} textAnchor="middle">
                {isSuccess ? 'GEPRÜFT' : 'ÜBUNG'}
              </text>
            </svg>
          </div>

          {/* Sterne & Titel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                style={{
                  fontSize: '2.2rem',
                  lineHeight: 1,
                  filter: s <= stars ? 'drop-shadow(0 3px 8px rgba(234, 179, 8, 0.55))' : 'grayscale(1)',
                  opacity: s <= stars ? 1 : 0.22,
                  transform: s <= stars ? 'scale(1.08)' : 'scale(1)',
                  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                ★
              </span>
            ))}
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 2px 0' }}>
            {isPerfection
              ? 'Perfekt gemeistert! 🌟'
              : stars === 2
              ? 'Hervorragende Leistung! 👏'
              : stars === 1
              ? 'Klasse! Stempel freigeschaltet! 🎯'
              : 'Schöner Versuch! Übe weiter! 🎵'}
          </h2>

          <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '4px 0 0 0', maxWidth: '420px', lineHeight: 1.45 }}>
            {isSuccess
              ? `Dein Reisepass-Stempel für ${country.name} („${country.pieceTitle || country.anthemTitle}“) ist offiziell in deinem Campus-Pass eingetragen.`
              : `Du hast ${scorePercent}% erreicht. Ab 50% Trefferquote schaltest du den offiziellen Reisepass-Stempel frei.`}
          </p>

          {/* XP Banner */}
          {xpAwarded > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '12px',
                padding: '6px 14px',
                borderRadius: '12px',
                background: '#f5f3ff',
                border: '1.5px solid #ddd6fe',
                color: '#6d28d9',
                fontWeight: 900,
                fontSize: '0.86rem',
                boxShadow: 'none'
              }}
            >
              <Sparkles size={16} />
              <span>+{xpAwarded} Campus XP verdient!</span>
            </div>
          )}
        </div>

        {/* Forensische Bewertung & Treffer-Statistik */}
        <div style={{ padding: '0 24px 20px 24px' }}>
          <div
            style={{
              background: '#f8fafc',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>
                Gesamte Trefferquote
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 900, color: isSuccess ? '#15803d' : '#0f172a' }}>
                {scorePercent}%
              </span>
            </div>

            {/* Didaktischer Übe-Tipp für Schüler bei <60% */}
            {!isSuccess && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: '#fefce8',
                border: '1px solid #fef08a',
                fontSize: '0.78rem',
                color: '#854d0e',
                fontWeight: 750,
                lineHeight: 1.4,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💡</span>
                <span>
                  {scorePercent >= 45
                    ? `Fast geschafft (${scorePercent}% von 60%)! Tipp: Übe das Stück noch 1–2 Mal im Modus "2. Mitspielen" mit etwas ruhigerem Tempo.`
                    : `Noch kein Meisterstern – aber Übung macht den Meister! Schalte das Metronom (Taste M) ein und spiele die Noten in Ruhe durch.`}
                </span>
              </div>
            )}

            {/* Treffer-Fortschrittsbalken */}
            <div
              style={{
                width: '100%',
                height: '10px',
                background: '#e2e8f0',
                borderRadius: '6px',
                overflow: 'hidden',
                display: 'flex'
              }}
            >
              <div
                style={{
                  width: `${scorePercent}%`,
                  background: isPerfection
                    ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                    : stars === 2
                    ? 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)'
                    : stars === 1
                    ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                    : '#94a3b8',
                  borderRadius: '6px',
                  transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              />
            </div>

            {/* Aufschlüsselung der Töne */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginTop: '4px'
              }}
            >
              <div
                style={{
                  padding: '8px',
                  borderRadius: '10px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  textAlign: 'center'
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '0.74rem', fontWeight: 800 }}>
                  <CheckCircle2 size={13} />
                  <span>Volltreffer</span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>
                  {hitCount}
                </div>
              </div>

              <div
                style={{
                  padding: '8px',
                  borderRadius: '10px',
                  background: '#fefce8',
                  border: '1px solid #fef08a',
                  textAlign: 'center'
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ca8a04', fontSize: '0.74rem', fontWeight: 800 }}>
                  <AlertTriangle size={13} />
                  <span>Knapp</span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#854d0e', marginTop: '2px' }}>
                  {nearCount}
                </div>
              </div>

              <div
                style={{
                  padding: '8px',
                  borderRadius: '10px',
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  textAlign: 'center'
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#e11d48', fontSize: '0.74rem', fontWeight: 800 }}>
                  <XCircle size={13} />
                  <span>Verpasst</span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#9f1239', marginTop: '2px' }}>
                  {missCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 0.1% Goldstandard Action Buttons */}
        <div
          style={{
            padding: '16px 24px 24px 24px',
            background: '#ffffff',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {/* Primäre didaktische Aktion: Notenbild analysieren */}
          <button
            onClick={onAnalyzeScore}
            aria-label="Notenbild analysieren: Prüfe deine Treffer direkt im Notenblatt"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 18px',
              borderRadius: '12px',
              background: '#f0f9ff',
              border: '1.5px solid #bae6fd',
              color: '#0369a1',
              fontWeight: 850,
              fontSize: '0.90rem',
              cursor: 'pointer',
              touchAction: 'manipulation',
              minHeight: '44px'
            }}
            className="hover-scale"
          >
            <Search size={16} />
            <span>Notenbild analysieren (Note für Note)</span>
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: onBackToMap ? '1fr 1fr' : '1fr', gap: '10px' }}>
            <button
              onClick={onRetry}
              aria-label="Challenge noch einmal spielen"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px 16px',
                borderRadius: '12px',
                background: '#0284c7',
                border: 'none',
                color: '#ffffff',
                fontWeight: 850,
                fontSize: '0.86rem',
                cursor: 'pointer',
                touchAction: 'manipulation',
                boxShadow: 'none',
                minHeight: '44px'
              }}
              className="hover-scale"
            >
              <RotateCcw size={15} />
              <span>Noch einmal</span>
            </button>

            {onBackToMap && (
              <button
                onClick={onBackToMap}
                aria-label="Zurück zur Weltkarte"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '11px 16px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  minHeight: '44px'
                }}
                className="hover-scale"
              >
                <Compass size={15} />
                <span>Zur Weltkarte</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
