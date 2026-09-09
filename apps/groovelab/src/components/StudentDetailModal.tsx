import React from 'react';
import { AdminStudentDetailModal } from './student/detail/AdminStudentDetailModal';
import { TeacherStudentDetailModal } from './student/detail/TeacherStudentDetailModal';
import { getFormattedScheduleDayTime } from './student/detail/shared/StudentScheduleCard';

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
 *
 * Invariante:
 * Befindet sich der Benutzer im Lehrer-Dashboard oder im Lehrer-Workspace (activeWorkspace === 'teacher'
 * oder callerDashboard === 'teacher'), wird ausnahmslos das pädagogische TeacherStudentDetailModal
 * gerendert – selbst wenn der Account administrative Zusatzrollen besitzt.
 */
export const StudentDetailModal: React.FC<StudentDetailModalProps> = (props) => {
  const activeWorkspace = typeof window !== 'undefined'
    ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace'))
    : null;

  // Strikte pädagogische Priorisierung: Im Lehrer-Kontext niemals Verwaltungsdaten exponieren
  const isTeacherContext =
    props.callerDashboard === 'teacher' ||
    activeWorkspace === 'teacher' ||
    props.activePlatform === 'teacher';

  if (isTeacherContext) {
    return <TeacherStudentDetailModal {...props} />;
  }

  const isAdminOrSecretary =
    (props.callerDashboard === 'admin' ||
     props.callerDashboard === 'secretary' ||
     props.activePlatform === 'admin' ||
     props.activePlatform === 'secretary') &&
    activeWorkspace !== 'teacher';

  if (isAdminOrSecretary) {
    return <AdminStudentDetailModal {...props} />;
  }

  // Fail-Closed Fallback: Im Zweifel immer die pädagogische Minimal-Rechte-Ansicht
  return <TeacherStudentDetailModal {...props} />;
};

export default StudentDetailModal;
