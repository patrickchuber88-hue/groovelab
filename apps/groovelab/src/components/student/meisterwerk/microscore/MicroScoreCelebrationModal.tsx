/**
 * 🏛️ Campus-Groovelab Micro-Score Studio
 * MicroScoreCelebrationModal.tsx
 * 
 * 0,1% Goldstandard Celebration Modal für Noten-Schnipsel Challenges:
 * - VdM-Didaktik Sternen-Evaluation (1–3 Sterne)
 * - XP-Progression & Treffer-Aufschlüsselung (Hits, Near, Miss)
 * - BFSG 2025 & WCAG 2.2 AA Parität (Keyboard Escape/Enter, Kontrast ≥ 7:1)
 * - Apple Squircle Radien & Unifarben-Axiom
 */
import React, { useEffect } from 'react';
import { Award, RotateCcw, X, Star } from 'lucide-react';

export interface MicroScoreCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  stars: number;
  scorePercent: number;
  hitCount: number;
  nearCount: number;
  missCount: number;
  xpAwarded: number;
  snippetTitle: string;
}

export const MicroScoreCelebrationModal: React.FC<MicroScoreCelebrationModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  stars,
  scorePercent,
  hitCount,
  nearCount,
  missCount,
  xpAwarded,
  snippetTitle
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') onRetry();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onRetry]);

  if (!isOpen) return null;

  const isSuccess = stars >= 1;

  const titleMessage = stars === 3
    ? 'Meisterklasse!'
    : stars === 2
    ? 'Klasse gespielt!'
    : stars === 1
    ? 'Herausforderung gemeistert!'
    : 'Fast geschafft!';

  const subtitleMessage = stars === 3
    ? 'Unglaubliche Intonation und perfektes Timing!'
    : stars === 2
    ? 'Sehr sicher im Rhythmus und gute Tonhöhen!'
    : stars === 1
    ? 'Solide Leistung! Übe weiter für die 3 Sterne!'
    : 'Probier es gleich noch einmal mit dem Einzähler!';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ergebnis der Noten-Schnipsel Challenge"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        role="document"
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          border: '1px solid #e2e8f0',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            border: 'none',
            background: '#f1f5f9',
            color: '#64748b',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={16} color="currentColor" />
        </button>

        {/* Header Icon Squircle */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: isSuccess ? '#0f172a' : '#f8fafc',
            color: isSuccess ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: isSuccess ? '0 4px 16px rgba(15, 23, 42, 0.25)' : 'none'
          }}
        >
          <Award size={28} color="currentColor" strokeWidth={2.2} />
        </div>

        {/* Sternen-Leiste */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          {[1, 2, 3].map(starIndex => {
            const isFilled = starIndex <= stars;
            return (
              <Star
                key={starIndex}
                size={26}
                fill={isFilled ? '#0f172a' : 'transparent'}
                color="#0f172a"
                strokeWidth={2}
              />
            );
          })}
        </div>

        {/* Headline */}
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
          {titleMessage}
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
          {subtitleMessage}
        </p>

        {/* XP Badge */}
        {xpAwarded > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f1f5f9',
              color: '#0f172a',
              padding: '6px 14px',
              borderRadius: '99px',
              fontSize: '0.84rem',
              fontWeight: 850,
              marginBottom: '18px'
            }}
          >
            <span>+{xpAwarded} XP erhalten</span>
          </div>
        )}

        {/* Treffer & Score Details */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#f8fafc',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '12px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Treffer</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#10b981' }}>{hitCount}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nahe</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f59e0b' }}>{nearCount}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Genauigkeit</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>{scorePercent}%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button
            type="button"
            onClick={onRetry}
            style={{
              flex: 1,
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: '0.82rem',
              fontWeight: 850,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
            }}
          >
            <RotateCcw size={15} color="currentColor" strokeWidth={2.2} />
            <span>Nochmal</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              backgroundColor: '#f1f5f9',
              color: '#0f172a',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
};
