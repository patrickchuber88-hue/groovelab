import React from 'react';
import { EyeOff, Lock } from 'lucide-react';

interface PrivacyShieldOverlayProps {
  isActive: boolean;
  onUnlock: () => void;
  schoolName?: string;
}

export const PrivacyShieldOverlay: React.FC<PrivacyShieldOverlayProps> = ({
  isActive,
  onUnlock,
  schoolName = 'Campus-Groovelab'
}) => {
  if (!isActive) return null;

  return (
    <div
      onClick={onUnlock}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        cursor: 'pointer',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '24px',
          padding: '32px',
          maxWidth: '380px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0f172a'
          }}
        >
          <EyeOff size={28} />
        </div>

        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            Sichtschutz aktiv
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 }}>
            Vertrauliche Daten in <strong>{schoolName}</strong> sind vor Blicken Dritter geschützt.
          </p>
        </div>

        <button
          onClick={onUnlock}
          style={{
            marginTop: '8px',
            padding: '12px 24px',
            borderRadius: '12px',
            background: '#0f172a',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'transform 0.15s ease'
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Lock size={15} />
          <span>Klicken zum Fortsetzen</span>
        </button>
      </div>
    </div>
  );
};
