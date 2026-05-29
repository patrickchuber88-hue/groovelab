import React from 'react';
import Confetti from 'react-confetti';

interface ConfettiModalProps {
  showConfetti: any;
  width: number;
  height: number;
  brandColor: string;
  clearConfetti: () => void;
}

export default function ConfettiModal({ showConfetti, width, height, brandColor, clearConfetti }: ConfettiModalProps) {
  if (!showConfetti) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }}>
      <Confetti width={width} height={height} />
      <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '40px', borderRadius: '32px', textAlign: 'center', maxWidth: '400px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '16px', color: 'var(--text-main)' }}>🎉 Glückwunsch!</h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Du hast eine vollständige Band für den Song<br/>
          <strong>{showConfetti.bands?.band_songs?.[0]?.songs?.title || 'deinen neuen Song'}</strong><br/>
          gefunden!
        </p>
        <button onClick={clearConfetti} style={{ background: brandColor, color: 'white', border: 'none', padding: '16px 32px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer' }}>
          Weiter geht's!
        </button>
      </div>
    </div>
  );
}
