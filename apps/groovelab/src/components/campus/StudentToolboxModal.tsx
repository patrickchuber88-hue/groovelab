import React, { useEffect } from 'react';
import { X, Sliders, Sparkles, Music } from 'lucide-react';
import { BriefingToolboxCard } from './BriefingToolboxCard';

interface StudentToolboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  ageGroup?: 'junior' | 'teen' | 'pro' | string;
}

export const StudentToolboxModal: React.FC<StudentToolboxModalProps> = ({
  isOpen,
  onClose,
  ageGroup = 'teen'
}) => {
  // ESC key to close
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

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        animation: 'fadeIn 0.15s ease'
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
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          animation: 'scaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#e6f4ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34a853',
              flexShrink: 0
            }}>
              <Sliders size={20} color="#34a853" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Praxis-Toolbox
                </h3>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 850,
                  textTransform: 'uppercase',
                  background: '#e6f4ea',
                  color: '#15803d',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  letterSpacing: '0.04em'
                }}>
                  Live Studio
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                Rhythmus-Trainer & chromatisches Stimmgerät für dein tägliches Üben
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease'
            }}
            title="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <BriefingToolboxCard />
        </div>
      </div>
    </div>
  );
};
