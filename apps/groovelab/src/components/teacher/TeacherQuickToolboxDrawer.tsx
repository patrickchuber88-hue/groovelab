import React, { useEffect } from 'react';
import { X, Wrench } from 'lucide-react';
import { BriefingToolboxCard } from '../campus/BriefingToolboxCard';

export interface TeacherQuickToolboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activePlatform?: 'campus' | 'groovelab';
}

export const TeacherQuickToolboxDrawer: React.FC<TeacherQuickToolboxDrawerProps> = ({
  isOpen,
  onClose,
  activePlatform = 'campus'
}) => {
  // Close on Escape key
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

  const isCampus = activePlatform === 'campus';
  const accentColor = isCampus ? '#34a853' : '#eab308';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Campus-Groovelab Didaktik Toolbox"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          maxHeight: '100dvh',
          background: '#ffffff',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #ffffff, #f8fafc)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: isCampus ? '#e6f4ea' : '#fef9c3',
                color: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Wrench size={20} strokeWidth={2.4} color={accentColor} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                Didaktik Toolbox
              </h3>
              <p style={{ margin: '1px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                Stimmgerät, Metronom &amp; Werkzeuge
              </p>
            </div>
          </div>

          <button
            type="button"
            role="button"
            aria-label="Toolbox schließen"
            tabIndex={0}
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClose();
              }
            }}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              touchAction: 'manipulation'
            }}
            className="hover-scale"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            boxSizing: 'border-box'
          }}
          className="no-scrollbar"
        >
          <BriefingToolboxCard />
        </div>
      </div>
    </div>
  );
};
