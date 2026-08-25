import React, { useEffect, useRef } from 'react';
import { X, Edit3 } from 'lucide-react';
import { BriefingNotesCard } from './BriefingNotesCard';

interface GlobalNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  schoolId?: number | string;
  activeStudent?: any;
  allStudents?: any[];
  onOpenHomeworkModal?: (student: any) => void;
}

export const GlobalNotesDrawer: React.FC<GlobalNotesDrawerProps> = ({
  isOpen,
  onClose,
  user,
  schoolId,
  activeStudent,
  allStudents = [],
  onOpenHomeworkModal
}) => {
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape key
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
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={drawerRef}
        style={{
          width: '100%',
          maxWidth: '440px',
          height: '100%',
          backgroundColor: '#f8fafc',
          boxShadow: '-12px 0 35px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '20px',
          animation: 'slideLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative'
        }}
      >
        {/* Drawer Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Quick Notizen
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
              ⌘J
            </span>
          </div>

          <button
            onClick={onClose}
            title="Schließen (Esc)"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Embedded Card */}
        <div style={{ flex: 1 }}>
          <BriefingNotesCard
            user={user}
            schoolId={schoolId}
            activeStudent={activeStudent}
            allStudents={allStudents}
            onOpenHomeworkModal={onOpenHomeworkModal}
          />
        </div>
      </div>
    </div>
  );
};
