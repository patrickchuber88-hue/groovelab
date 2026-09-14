import React from 'react';
import { CheckCircle } from 'lucide-react';

export interface TeacherAbsenceEndedModalProps {
  showAbsenceEndedModal: boolean;
  setShowAbsenceEndedModal: (show: boolean) => void;
}

export const TeacherAbsenceEndedModal: React.FC<TeacherAbsenceEndedModalProps> = ({
  showAbsenceEndedModal,
  setShowAbsenceEndedModal
}) => {
  if (!showAbsenceEndedModal) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
      onClick={() => setShowAbsenceEndedModal(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="absence-ended-title"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '28px',
          padding: '32px 28px',
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '20px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.2)'
        }}
      >
        {/* Green Apple Squircle Icon Badge */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: '#e6f4ea',
          border: '1.5px solid #bbf7d0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(52, 168, 83, 0.18)'
        }}>
          <CheckCircle size={32} color="#34a853" strokeWidth={2.5} />
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3
            id="absence-ended-title"
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 900,
              color: '#0f172a',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              letterSpacing: '-0.02em'
            }}
          >
            Abwesenheit beendet!
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '0.92rem',
              color: '#64748b',
              fontWeight: 600,
              lineHeight: 1.45,
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            Du stehst wieder als regulär verfügbar im System.
          </p>
        </div>

        {/* Campus-Grüner OK Button */}
        <button
          type="button"
          onClick={() => setShowAbsenceEndedModal(false)}
          autoFocus
          style={{
            background: '#34a853',
            color: '#ffffff',
            border: 'none',
            borderRadius: '16px',
            padding: '14px 24px',
            width: '100%',
            fontSize: '1rem',
            fontWeight: 900,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(52, 168, 83, 0.35)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#2e974a';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#34a853';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
};
