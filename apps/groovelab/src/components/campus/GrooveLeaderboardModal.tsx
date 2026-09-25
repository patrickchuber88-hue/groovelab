import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy } from 'lucide-react';
import { GrooveLeaderboardWidget } from './GrooveLeaderboardWidget';
import { RhythmLevel } from './GrooveTrainerStudioView';

export interface GrooveLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLevel: RhythmLevel;
  onSelectLevel: (lvl: RhythmLevel) => void;
  student?: any;
  onPlayLevel?: (lvl: RhythmLevel) => void;
  latestScore?: {
    level: RhythmLevel;
    score?: number;
    accuracy: number;
    streak: number;
    bpm: number;
  } | null;
}

export const GrooveLeaderboardModal: React.FC<GrooveLeaderboardModalProps> = ({
  isOpen,
  onClose,
  selectedLevel,
  onSelectLevel,
  student,
  onPlayLevel,
  latestScore
}) => {
  // ⌨️ ESC-Key Listener für Barrierefreiheit (WCAG 2.2 AA)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hall of Groove - Rhythmus-Rangliste"
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 11500,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.6)',
          overflow: 'hidden',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Modal Top Bar: 0,1% Swiss Design Single-Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: '#ea580c',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)'
              }}
            >
              <Trophy size={20} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Hall of Groove
                </h3>
                <span style={{
                  background: '#fef3c7',
                  color: '#b45309',
                  fontSize: '0.66rem',
                  fontWeight: 900,
                  padding: '2px 7px',
                  borderRadius: '100px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  Live
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                {student?.school_name || student?.schools?.name || 'Campus-Groovelab'} • Rhythmus-Rangliste
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
            title="Schließen (Esc)"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content: GrooveLeaderboardWidget */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <GrooveLeaderboardWidget
            selectedLevel={selectedLevel}
            onSelectLevel={onSelectLevel}
            student={student}
            onPlayLevel={(lvl) => {
              onClose();
              if (onPlayLevel) {
                onPlayLevel(lvl);
              }
            }}
            latestScore={latestScore}
            useNotebookLayout={false}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
