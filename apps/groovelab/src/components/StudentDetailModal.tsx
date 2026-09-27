import React from 'react';
import { getFormattedScheduleDayTime } from './student/detail/shared/StudentScheduleCard';
import { LiquidGlassSkeleton } from './ui/LiquidGlassSkeleton';

const AdminStudentDetailModal = React.lazy(() =>
  import('./student/detail/AdminStudentDetailModal').then(m => ({ default: m.AdminStudentDetailModal }))
);
const TeacherStudentDetailModal = React.lazy(() =>
  import('./student/detail/TeacherStudentDetailModal').then(m => ({ default: m.TeacherStudentDetailModal }))
);
const GroovelabStudentDetailModal = React.lazy(() =>
  import('./student/detail/GroovelabStudentDetailModal').then(m => ({ default: m.GroovelabStudentDetailModal }))
);

export { getFormattedScheduleDayTime };

export interface StudentDetailModalProps {
  student: any;
  onClose: () => void;
  onOpenBandProfile?: (band: any) => void;
  onOpenTageskompass?: (student: any) => void;
  activePlatform?: 'secretary' | 'campus' | 'groovelab' | 'admin' | 'teacher';
  callerDashboard?: 'teacher' | 'secretary' | 'admin';
  onSwitchPlatform?: (newPlatform: 'campus' | 'groovelab') => void;
}

/**
 * 🏛️ Monolith Goldstandard Router: StudentDetailModal
 *
 * Entflechtet transparent und abwärtskompatibel die Schüler-Karteikarte nach
 * dem volljuristischen Drei-Töpfe-Prinzip (OWASP ASVS Level 3 / Fail-Closed Least-Privilege):
 * - Pädagogik (Teacher): TeacherStudentDetailModal (Unterricht, Hausaufgaben, Kompetenzen & PIN-Hilfe)
 * - Verwaltung (Admin / Secretary): AdminStudentDetailModal (Vertrag, Gebühren, FinOps & DSGVO Art. 15)
 * - GrooveLab (Live Lab): GroovelabStudentDetailModal (Reine GrooveLab-Metriken: 5-Säulen-Radar, Songs, XP, Station)
 *
 * Invariante:
 * Befindet sich der Benutzer im GrooveLab (activePlatform === 'groovelab'), wird ausnahmslos
 * das reine GroovelabStudentDetailModal ohne Campus-Stammdaten oder Hausaufgaben geladen.
 */
export const StudentDetailModal: React.FC<StudentDetailModalProps> = (props) => {
  const activeWorkspace = typeof window !== 'undefined'
    ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace'))
    : null;

  // ⚡ 0,1% Goldstandard: Bounded Context GrooveLab Live Lab
  // Zeigt im GrooveLab ausschließlich reine Fachinformationen (Skill-Radar, Songs, XP) ohne Campus-Verwaltungsdaten
  const isGroovelabContext =
    props.activePlatform === 'groovelab' ||
    (!props.activePlatform && (
      (typeof window !== 'undefined' && (
        sessionStorage.getItem('groovelab_active_platform') === 'groovelab' ||
        localStorage.getItem('groovelab_active_platform') === 'groovelab'
      ))
    ));

  if (isGroovelabContext) {
    return (
      <React.Suspense fallback={<LiquidGlassSkeleton type="modal" />}>
        <GroovelabStudentDetailModal 
          student={props.student}
          onClose={props.onClose}
          onOpenBandProfile={props.onOpenBandProfile}
          callerDashboard={props.callerDashboard}
        />
      </React.Suspense>
    );
  }

  // Strikte pädagogische Priorisierung: Im Lehrer-Kontext niemals Verwaltungsdaten exponieren
  const isTeacherContext =
    props.callerDashboard === 'teacher' ||
    activeWorkspace === 'teacher' ||
    props.activePlatform === 'teacher';

  if (isTeacherContext) {
    return (
      <React.Suspense fallback={<LiquidGlassSkeleton type="modal" />}>
        <TeacherStudentDetailModal {...props} />
      </React.Suspense>
    );
  }

  const isAdminOrSecretary =
    (props.callerDashboard === 'admin' ||
     props.callerDashboard === 'secretary' ||
     props.activePlatform === 'admin' ||
     props.activePlatform === 'secretary') &&
    activeWorkspace !== 'teacher';

  if (isAdminOrSecretary) {
    return (
      <React.Suspense fallback={<LiquidGlassSkeleton type="modal" />}>
        <AdminStudentDetailModal {...props} />
      </React.Suspense>
    );
  }

  // Fail-Closed Fallback: Im Zweifel immer die pädagogische Minimal-Rechte-Ansicht
  return (
    <React.Suspense fallback={<LiquidGlassSkeleton type="modal" />}>
      <TeacherStudentDetailModal {...props} />
    </React.Suspense>
  );
};

export default StudentDetailModal;
