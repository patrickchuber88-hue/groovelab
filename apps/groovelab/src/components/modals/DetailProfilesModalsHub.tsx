import React, { Suspense, lazy } from 'react';

const TeacherDetailModal = lazy(() => import('../TeacherDetailModal').then(m => ({ default: m.TeacherDetailModal })));
const StudentDetailModal = lazy(() => import('../StudentDetailModal').then(m => ({ default: m.StudentDetailModal })));
const ConfettiModal = lazy(() => import('../ConfettiModal'));

export interface DetailProfilesModalsHubProps {
  user: any;
  activePlatform?: string;
  activeWorkspace?: string | null;

  // Teacher Detail Profile
  selectedTeacher: any | null;
  onCloseTeacher: () => void;

  // Student Detail Profile
  selectedStudentProfile: any | null;
  onCloseStudentProfile: () => void;
  onOpenBandProfile?: (band: any) => void;
  onOpenTageskompass?: (student: any) => void;
  onSwitchPlatform?: (newPlatform: 'campus' | 'groovelab') => void;

  // Confetti / Reward Overlay
  showConfetti?: boolean;
  confettiWidth?: number;
  confettiHeight?: number;
  confettiBrandColor?: string;
  onClearConfetti?: () => void;
}

/**
 * Deterministische Ermittlung des callerDashboard für StudentDetailModal
 * nach dem OWASP ASVS Level 3 Drei-Töpfe-Prinzip:
 * Im Lehrer-Kontext wird niemals Verwaltungs- oder Vertragskontext exponiert.
 */
function resolveCallerDashboard(user: any, activeWorkspace?: string | null): 'teacher' | 'secretary' | 'admin' | undefined {
  const sessionWs = typeof window !== 'undefined'
    ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace'))
    : null;
  const effectiveWs = activeWorkspace || sessionWs;

  if (effectiveWs === 'teacher' || user?.role === 'teacher') return 'teacher';
  if (effectiveWs === 'secretary' || user?.role === 'secretary') return 'secretary';
  if (effectiveWs === 'admin' || user?.role === 'admin') return 'admin';
  return undefined;
}

/**
 * 📇 DetailProfilesModalsHub (Monolith Goldstandard Hub)
 * Kapselt die Detail-Karteikarten für Lehrkräfte und Schüler sowie
 * das Gamification-Belohnungsoverlay (ConfettiModal).
 */
export const DetailProfilesModalsHub: React.FC<DetailProfilesModalsHubProps> = ({
  user,
  activePlatform = 'campus',
  activeWorkspace,
  selectedTeacher,
  onCloseTeacher,
  selectedStudentProfile,
  onCloseStudentProfile,
  onOpenBandProfile,
  onOpenTageskompass,
  onSwitchPlatform,
  showConfetti = false,
  confettiWidth = typeof window !== 'undefined' ? window.innerWidth : 1200,
  confettiHeight = typeof window !== 'undefined' ? window.innerHeight : 800,
  confettiBrandColor = '#eab308',
  onClearConfetti,
}) => {
  return (
    <>
      {/* 1. Confetti Reward Overlay */}
      {showConfetti && onClearConfetti && (
        <Suspense fallback={null}>
          <ConfettiModal
            showConfetti={showConfetti}
            width={confettiWidth}
            height={confettiHeight}
            brandColor={confettiBrandColor}
            clearConfetti={onClearConfetti}
          />
        </Suspense>
      )}

      {/* 2. Teacher Detail Profile Card */}
      {selectedTeacher && (
        <Suspense fallback={null}>
          <TeacherDetailModal
            teacher={selectedTeacher}
            onClose={onCloseTeacher}
          />
        </Suspense>
      )}

      {/* 3. Student Detail Profile Card (Drei-Töpfe-Prinzip) */}
      {selectedStudentProfile && (
        <Suspense fallback={null}>
          <StudentDetailModal
            student={selectedStudentProfile}
            onClose={onCloseStudentProfile}
            onOpenBandProfile={onOpenBandProfile}
            onOpenTageskompass={onOpenTageskompass}
            activePlatform={activePlatform as any}
            callerDashboard={resolveCallerDashboard(user, activeWorkspace)}
            onSwitchPlatform={onSwitchPlatform}
          />
        </Suspense>
      )}
    </>
  );
};
