import React, { useEffect, useRef } from 'react';
import { UserNote } from '../../services/notesService';
import { TeacherNotesBoardView } from '../teacher/notes/board/TeacherNotesBoardView';

export interface TeacherNotesBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: UserNote[];
  allStudents?: any[];
  todayStudents?: any[];
  user: any;
  onCreateNote: (content: string, options?: any) => Promise<any>;
  onUpdateNote: (id: string, updates: Partial<UserNote>) => Promise<any>;
  onDeleteNote: (id: string) => Promise<any>;
  onTogglePin: (id: string) => Promise<any>;
  onToggleCompleteTodo: (id: string) => Promise<any>;
  onToggleArchive: (id: string) => Promise<any>;
  onDismissRoomIssue?: (id: string) => Promise<any>;
  onResolveRoomIssue?: (id: string, resolvedBy?: 'teacher' | 'secretary') => Promise<any>;
  onSyncToHomeworkBook?: (note: UserNote) => Promise<any>;
  onUnsyncFromHomeworkBook?: (note: UserNote) => Promise<any>;
  onOpenHomeworkModal?: (student: any) => void;
  onOpenCommandPalette?: () => void;
  schoolId?: number | string;
  initialTab?: 'students' | 'desk' | 'defects';
  initialStudentId?: string | number;
}

export const TeacherNotesBoardModal: React.FC<TeacherNotesBoardModalProps> = ({
  isOpen,
  onClose,
  notes,
  allStudents = [],
  todayStudents = [],
  user,
  schoolId,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onTogglePin,
  onToggleCompleteTodo,
  onToggleArchive,
  onResolveRoomIssue,
  onDismissRoomIssue,
  onOpenHomeworkModal,
  initialTab = 'students',
  initialStudentId
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
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
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notizen-Board"
        style={{
          width: '96vw',
          maxWidth: '1240px',
          height: '90vh',
          maxHeight: '860px',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <TeacherNotesBoardView
          onClose={onClose}
          notes={notes}
          allStudents={allStudents}
          todayStudents={todayStudents}
          user={user}
          schoolId={schoolId || user?.school_id}
          onCreateNote={onCreateNote}
          onUpdateNote={onUpdateNote}
          onDeleteNote={onDeleteNote}
          onTogglePin={onTogglePin}
          onToggleCompleteTodo={onToggleCompleteTodo}
          onToggleArchive={onToggleArchive}
          onResolveRoomIssue={onResolveRoomIssue}
          onDismissRoomIssue={onDismissRoomIssue}
          onOpenHomeworkModal={onOpenHomeworkModal}
          initialTab={initialTab}
          initialStudentId={initialStudentId}
        />
      </div>
    </div>
  );
};
