import React, { useState } from 'react';
import { MessageSquare, Check } from 'lucide-react';
import { MilestoneData } from '../types';

interface MilestoneReflectionModalProps {
  milestone: MilestoneData;
  onClose: () => void;
  onSaveNote: (note: string) => void;
  isLight: boolean;
}

export const MilestoneReflectionModal: React.FC<MilestoneReflectionModalProps> = ({
  milestone,
  onClose,
  onSaveNote,
  isLight
}) => {
  const [reflectionText, setReflectionText] = useState<string>(milestone.personalNote || '');

  const colors = {
    textPrimary: isLight ? '#0f172a' : '#f8fafc',
    textSecondary: isLight ? '#475569' : '#cbd5e1'
  };

  const handleSave = () => {
    onSaveNote(reflectionText.trim());
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Persönliche Reflexion"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
    >
      <div style={{
        background: isLight ? '#ffffff' : '#1e293b',
        border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
        borderRadius: '24px',
        padding: '28px',
        maxWidth: '460px',
        width: '100%',
        color: colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={20} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>
              Warum dieses Stück?
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '1.2rem', cursor: 'pointer' }}
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '0.82rem', color: colors.textSecondary, lineHeight: 1.45, fontWeight: 500 }}>
          Halte deine Gedanken zu <strong>{milestone.title}</strong> fest: Was war die größte Herausforderung? Welche Emotion verbindest du mit diesem Moment?
        </p>

        <textarea
          rows={4}
          value={reflectionText}
          onChange={(e) => setReflectionText(e.target.value)}
          placeholder="Schreibe deine persönliche Notiz hier..."
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: '14px',
            border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
            background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.35)',
            color: colors.textPrimary,
            fontSize: '0.86rem',
            fontWeight: 600,
            resize: 'none',
            boxSizing: 'border-box'
          }}
          autoFocus
        />

        <button
          type="button"
          onClick={handleSave}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '100px',
            border: 'none',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            fontWeight: 900,
            fontSize: '0.86rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
          }}
          className="hover-scale"
        >
          <Check size={16} strokeWidth={3} />
          <span>Gedanken verewigen</span>
        </button>
      </div>
    </div>
  );
};
