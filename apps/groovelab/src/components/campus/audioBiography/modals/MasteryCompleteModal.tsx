import React from 'react';
import Confetti from 'react-confetti';

export interface MasteryCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasteryCompleteModal: React.FC<MasteryCompleteModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Goldener Meister-Abschluss"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.3s ease-out'
      }}
      onClick={onClose}
    >
      {/* Fullscreen Golden Confetti Celebration */}
      <Confetti
        width={typeof window !== 'undefined' ? window.innerWidth : 800}
        height={typeof window !== 'undefined' ? window.innerHeight : 600}
        recycle={false}
        numberOfPieces={400}
        gravity={0.20}
        colors={['#fbbf24', '#f59e0b', '#d97706', '#10b981', '#ffffff', '#eab308']}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #18181b 0%, #0f172a 100%)',
          border: '2px solid #ca8a04',
          borderRadius: '32px',
          maxWidth: '520px',
          width: '100%',
          padding: '36px 30px',
          textAlign: 'center',
          boxShadow: '0 25px 60px -15px rgba(202, 138, 4, 0.4), 0 0 40px rgba(251, 191, 36, 0.15)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          color: '#ffffff'
        }}
      >
        {/* Glowing Golden Crown Orb */}
        <div
          style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 35px rgba(251, 191, 36, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.5)',
            border: '3px solid #fef08a',
            fontSize: '44px'
          }}
        >
          👑
        </div>

        {/* Header / Titles */}
        <div>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 900,
              color: '#fbbf24',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '6px'
            }}
          >
            🌟 Meilenstein 10 Vollbracht
          </div>
          <h3
            style={{
              fontSize: '1.65rem',
              fontWeight: 900,
              color: '#ffffff',
              margin: 0,
              lineHeight: 1.2
            }}
          >
            Großes Meisterstück gemeistert!
          </h3>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: '0.90rem',
            color: '#cbd5e1',
            lineHeight: 1.55,
            margin: 0,
            maxWidth: '440px'
          }}
        >
          Herzlichen Glückwunsch! Du hast mit <strong style={{ color: '#fbbf24' }}>„Mein großes Meisterstück“</strong> alle 10 Meilensteine deiner musikalischen Audio-Biografie erfolgreich gemeistert.
        </p>

        {/* Golden Badge Card */}
        <div
          style={{
            background: 'rgba(251, 191, 36, 0.12)',
            border: '1.5px solid rgba(251, 191, 36, 0.4)',
            borderRadius: '18px',
            padding: '14px 20px',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🏆</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#fef08a' }}>
                10/10 Meilensteine Vollständig
              </div>
              <div style={{ fontSize: '0.70rem', color: '#cbd5e1' }}>
                Goldene Meister-Krone 👑 freigeschaltet
              </div>
            </div>
          </div>
          <span
            style={{
              background: '#ca8a04',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 900,
              padding: '4px 10px',
              borderRadius: '999px'
            }}
          >
            +100 XP
          </span>
        </div>

        {/* Action CTA */}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            padding: '15px 24px',
            borderRadius: '16px',
            border: 'none',
            background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
            color: '#18181b',
            fontWeight: 900,
            fontSize: '0.98rem',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(251, 191, 36, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '6px'
          }}
          className="hover-scale"
        >
          <span>Zurück zur Audio-Biografie</span>
          <span>👑</span>
        </button>
      </div>
    </div>
  );
};
