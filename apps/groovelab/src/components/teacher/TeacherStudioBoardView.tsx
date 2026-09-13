import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Send,
  CheckCircle2
} from 'lucide-react';
import { MeisterwerkDocumentationModal } from '../MeisterwerkDocumentationModal';
import { TeacherHomeworkAssignModal } from './TeacherHomeworkAssignModal';
import {
  fetchTeacherSandboxEntry,
  saveTeacherSandboxEntry,
  TeacherSandboxEntry
} from '../../services/teacherStudioService';
import { formatTeacherFullName } from '../../utils/nameHelper';

export interface TeacherStudioBoardViewProps {
  teacher: any;
  allStudents: any[];
  todayStudents?: any[];
  schoolData?: any;
  activePlatform?: 'campus' | 'groovelab';
  onClose?: () => void;
}

export const TeacherStudioBoardView: React.FC<TeacherStudioBoardViewProps> = ({
  teacher,
  allStudents = [],
  todayStudents = [],
  schoolData,
  activePlatform = 'campus',
  onClose
}) => {
  const teacherId = teacher?.id || teacher?.userId;
  const schoolId = teacher?.school_id || teacher?.schoolId;

  const [sandboxEntry, setSandboxEntry] = useState<TeacherSandboxEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Show Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load sandbox entry on mount
  useEffect(() => {
    let isMounted = true;
    if (teacherId && schoolId) {
      setIsLoading(true);
      fetchTeacherSandboxEntry(teacherId, schoolId).then(entry => {
        if (isMounted) {
          setSandboxEntry(entry);
          setIsLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [teacherId, schoolId]);

  // Virtual Teacher Student Representation for MeisterwerkDocumentationModal
  // Strikte Enterprise+ Doktrin: Lehrkräfte haben NIEMALS ein Schüler-Alters-UI (Junior/Teen), sondern stets vollen Zugriff ('pro')
  const teacherStudentObject = useMemo(() => {
    return {
      id: teacherId || 'teacher-studio-sandbox',
      first_name: teacher?.first_name || 'Lehrkraft',
      last_name: teacher?.last_name || '',
      name: formatTeacherFullName(teacher),
      school_id: schoolId,
      campus_ui_level: 'pro',
      is_campus_active: true,
      role: 'teacher',
      is_teacher: true,
      schools: schoolData || teacher?.schools,
      teacher_name: formatTeacherFullName(teacher),
      teacher_id: teacherId
    };
  }, [teacher, teacherId, schoolId, schoolData]);

  // Compute current ISO week & week number
  const { currentWeekIso, currentWeekNum } = useMemo(() => {
    const d = new Date();
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const pastDays = (d.getTime() - startOfYear.getTime()) / 86400000;
    const wk = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
    const wkStr = String(wk).padStart(2, '0');
    return {
      currentWeekIso: `${d.getFullYear()}-W${wkStr}`,
      currentWeekNum: wkStr
    };
  }, []);

  const handleAssignmentSuccess = (assignedCount: number, studentNames: string[]) => {
    const namePreview = studentNames.slice(0, 3).join(', ') + (studentNames.length > 3 ? ` (+${studentNames.length - 3})` : '');
    showToast(`✓ Hausaufgabe erfolgreich an ${assignedCount} Schüler zugewiesen (${namePreview})!`);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: '85vh',
        boxSizing: 'border-box',
        background: '#f8fafc',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 999999,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.86rem',
            fontWeight: 700,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <CheckCircle2 size={18} color="#22c55e" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Simulation Stage */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderRadius: '16px',
          marginBottom: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        {/* Title & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Aufgaben-Studio
              </h2>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '3px 8px',
                  borderRadius: '20px',
                  background: '#e0f2fe',
                  color: '#0369a1'
                }}
              >
                Lehrer-Vorbereitungsraum & Sandbox
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
              Teste Schüler-Funktionen, erstelle eigene Aufnahmen und weise sie per Klick an Schüler zu.
            </p>
          </div>
        </div>

        {/* Controls: Assign CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => setIsAssignModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              transition: 'transform 0.15s ease'
            }}
            className="hover-scale"
          >
            <Send size={15} />
            <span>An Schüler zuweisen...</span>
          </button>
        </div>
      </header>

      {/* Main Board Container */}
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
        }}
      >
        <MeisterwerkDocumentationModal
          key="teacher-studio-board"
          student={teacherStudentObject}
          onClose={onClose || (() => {})}
          teacherId={teacherId}
          teacherName={formatTeacherFullName(teacher)}
          schoolId={schoolId}
          schoolName={schoolData?.name || 'Campus-Groovelab'}
          isEmbed={true}
          readOnly={false}
          isTeacherTools={true}
          isTeacherSandbox={true}
          uiLevel="pro"
          hasTresorStorage={true}
          initialViewMode="document"
          initialModalTab="document"
          onOpenAssignModal={() => setIsAssignModalOpen(true)}
        />
      </div>

      {/* Zuweisungs-Modal */}
      <TeacherHomeworkAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        teacher={teacher}
        allStudents={allStudents}
        todayStudents={todayStudents}
        currentWeekIso={currentWeekIso}
        currentWeekNum={currentWeekNum}
        currentNotesContent={sandboxEntry?.homework_notes || ''}
        currentLehrwerke={sandboxEntry?.assigned_lehrwerke || []}
        currentSongs={sandboxEntry?.assigned_songs || []}
        currentAudios={sandboxEntry?.audio_recordings || []}
        onSuccess={handleAssignmentSuccess}
      />
    </div>
  );
};
