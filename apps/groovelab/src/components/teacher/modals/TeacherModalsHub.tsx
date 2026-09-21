import React, { Suspense, lazy } from 'react';
import { X, TrendingUp, Trash2 } from 'lucide-react';
import { AvatarImage } from '../../common/AvatarImage';
import { normalizeInstrument, INSTRUMENT_COLORS, TEACHER_INSTRUMENT_ICONS } from '../utils/teacherDashboardUtils';
import { formatTeacherFullName } from '../../../utils/nameHelper';
import { deleteStudentFully } from '../../../utils/studentDeletionService';
import { checkIsAudioTresorActive } from '../../../domain/stickersAndTresor';
import { queryCache } from '../../../lib/supabase';
import { TourStartButton } from '../../PremiumOnboardingTour';

// Modals
import { TeacherInviteStudentModal } from '../TeacherInviteStudentModal';
import { TeacherUrgentCancellationsModal } from '../TeacherUrgentCancellationsModal';
import { TeacherMakeupTokenModal } from '../TeacherMakeupTokenModal';
import { TeacherEditStudentModal } from '../TeacherEditStudentModal';
import { TeacherAbsenceModal } from '../TeacherAbsenceModal';
import { TeacherAbsenceNotifModal } from '../TeacherAbsenceNotifModal';
import { TeacherAbsenceEndedModal } from '../TeacherAbsenceEndedModal';
import { TeacherAbsenceOverviewModal } from '../TeacherAbsenceOverviewModal';
import { CampusAppointmentShoutboxModal } from '../../CampusAppointmentShoutboxModal';
import { GlobalNotesDrawer } from '../../notes/GlobalNotesDrawer';
import { TeacherAnnouncementReaderModal } from '../TeacherAnnouncementReaderModal';

// Lazy loaded modals
const LiveStageToolboxModal = lazy(() => import('../../LiveStageToolboxModal').then(m => ({ default: m.LiveStageToolboxModal })));
const TeacherDetailModal = lazy(() => import('../../TeacherDetailModal').then(m => ({ default: m.TeacherDetailModal })));
const StudentDetailModal = lazy(() => import('../../StudentDetailModal').then(m => ({ default: m.StudentDetailModal })));
const ConfirmDeleteStudentModal = lazy(() => import('../../ConfirmDeleteStudentModal').then(m => ({ default: m.ConfirmDeleteStudentModal })));
const MeisterwerkDocumentationModal = lazy(() => import('../../MeisterwerkDocumentationModal').then(m => ({ default: m.MeisterwerkDocumentationModal })));
const TagesplanQuickAudioModal = lazy(() => import('../../campus/TagesplanQuickAudioModal').then(m => ({ default: m.TagesplanQuickAudioModal })));
const CommandPaletteModal = lazy(() => import('../../common/CommandPaletteModal').then(m => ({ default: m.CommandPaletteModal })));
const FeedbackHubModal = lazy(() => import('../../feedback/FeedbackHubModal').then(m => ({ default: m.FeedbackHubModal })));
const HelpCenterModal = lazy(() => import('../../help/HelpCenterModal').then(m => ({ default: m.HelpCenterModal })));

export interface TeacherModalsHubProps {
  userId: string;
  teacher: any;
  schoolData: any;
  activePlatform: 'campus' | 'groovelab';
  isMobileDevice: boolean;
  windowWidth: number;
  teacherDunningStatus: any;
  rooms: any[];
  allStudents: any[];
  setAllStudents: React.Dispatch<React.SetStateAction<any[]>>;
  todayTagesplanStudents: any[];
  activeSessions: any[];
  teacherTodayRooms: string[];
  activeTimelineSlot: any;
  fetchData: () => Promise<void>;
  onToast: (msg: string) => void;
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;
  
  // Modals state
  showStageToolbox: any;
  setShowStageToolbox: (val: any) => void;
  selectedCoachProfile: any;
  setSelectedCoachProfile: (coach: any) => void;
  selectedStudentProfile: any;
  setSelectedStudentProfile: (student: any) => void;
  deleteStudentModalData: any;
  setDeleteStudentModalData: (data: any) => void;
  modalDocStudent: any;
  setDocStudent: (student: any) => void;
  setEditingBand: (band: any) => void;
  quickAudioStudent: any;
  setQuickAudioStudent: (student: any) => void;
  showCommandPalette: boolean;
  setShowCommandPalette: (show: boolean) => void;
  showNotesDrawer: boolean;
  setShowNotesDrawer: (show: boolean) => void;
  isFeedbackModalOpen: boolean;
  setIsFeedbackModalOpen: (open: boolean) => void;
  isHelpCenterOpen: boolean;
  setIsHelpCenterOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onTabChange?: (tab: string) => void;
  onLocationModeChange?: (mode: 'lab' | 'home') => void;

  // Student Invite & Edit
  showInviteStudent: boolean;
  setShowInviteStudent: (show: boolean) => void;
  inviteFirstName: string;
  setInviteFirstName: (name: string) => void;
  inviteLastName: string;
  setInviteLastName: (name: string) => void;
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  inviteLink: string | null;
  setInviteLink: (link: string | null) => void;
  inviteSaving: boolean;
  handleInviteStudent: (e: React.FormEvent) => Promise<void>;
  editingStudent: any;
  setEditingStudent: (student: any) => void;
  handleUpdateStudent: (e: React.FormEvent) => Promise<void>;

  // Absence
  showAbsenceModal: boolean;
  setShowAbsenceModal: (show: boolean) => void;
  isTeacherCurrentlyAbsent: boolean;
  quickAbsencePreset: any;
  setQuickAbsencePreset: (preset: any) => void;
  absenceStartDate: string;
  setAbsenceStartDate: (date: string) => void;
  absenceUntilDate: string;
  setAbsenceUntilDate: (date: string) => void;
  showCustomStart: boolean;
  setShowCustomStart: (show: boolean) => void;
  absenceHandlingOwner: any;
  setAbsenceHandlingOwner: (owner: any) => void;
  absenceOfficialNote: string;
  setAbsenceOfficialNote: (note: string) => void;
  cancellationsCount: number;
  submittingAbsence: boolean;
  handleReportAbsence: () => Promise<void>;
  handleEndAbsence: () => Promise<void>;
  absenceNotifModal: any;
  setAbsenceNotifModal: (modal: any) => void;
  showRealNames: boolean;
  showAbsenceEndedModal: boolean;
  setShowAbsenceEndedModal: (show: boolean) => void;
  showAbsenceOverviewModal: boolean;
  setShowAbsenceOverviewModal: (show: boolean) => void;
  totalAbsenceCancellationsCount: number;
  readCancellationsCount: number;
  unreadCancellationsCount: number;
  groupedAbsenceCancellations: any[];
  collapsedAbsenceDates: Record<string, boolean>;
  toggleAbsenceDateCollapse: (dateKey: string) => void;
  toggleAllAbsenceDates: () => void;
  areAllAbsenceDatesCollapsed: boolean;
  handleEmergencyShoutbox?: (occ: any) => void;
  handleMarkStudentContacted?: (targetId: string, contactType?: 'reached' | 'voicemail') => Promise<void> | void;

  // Urgent cancellations & Makeup
  isUrgentModalOpen: boolean;
  urgentCancellations: any[];
  setIsUrgentModalOpen: (open: boolean) => void;
  fetchUrgentCancellations: () => Promise<void>;
  handleUrgentSnooze: (minutes: number) => void;
  isMakeupModalOpen: boolean;
  makeupModalMode: any;
  selectedMakeupSlot: any;
  selectedMakeupToken: any;
  setIsMakeupModalOpen: (open: boolean) => void;
  setSelectedMakeupSlot: (slot: any) => void;
  setSelectedMakeupToken: (token: any) => void;
  fetchActiveMakeupTokens: () => Promise<void>;

  // Submissions Pipeline
  showAllSubmissions: boolean;
  setShowAllSubmissions: (show: boolean) => void;
  allSubmissions: any[];
  handleApproveSubmission: (subId: string) => Promise<void>;
  handleRejectSubmission: (subId: string) => Promise<void>;

  // Shoutbox
  activeChatOcc: any;
  setActiveChatOcc: (occ: any) => void;

  // Announcements
  openAnnouncementDetailModal: any;
  setOpenAnnouncementDetailModal: (item: any) => void;
  questionnaireAnswers: Record<string, string>;
  setQuestionnaireAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  submittingFeedback: boolean;
  handleSubmitFeedbackResponse: (requestId: string) => Promise<void>;
  handleMarkRequestAsDone: (requestId: string) => Promise<void>;

  // Tour
  startTour: () => void;
  TourComponent: React.ComponentType<any>;
}

export const TeacherModalsHub: React.FC<TeacherModalsHubProps> = ({
  userId,
  teacher,
  schoolData,
  activePlatform,
  isMobileDevice,
  windowWidth,
  teacherDunningStatus,
  rooms,
  allStudents,
  setAllStudents,
  todayTagesplanStudents,
  activeSessions,
  teacherTodayRooms,
  activeTimelineSlot,
  fetchData,
  onToast,
  toastMessage,
  setToastMessage,
  showStageToolbox,
  setShowStageToolbox,
  selectedCoachProfile,
  setSelectedCoachProfile,
  selectedStudentProfile,
  setSelectedStudentProfile,
  deleteStudentModalData,
  setDeleteStudentModalData,
  modalDocStudent,
  setDocStudent,
  setEditingBand,
  quickAudioStudent,
  setQuickAudioStudent,
  showCommandPalette,
  setShowCommandPalette,
  showNotesDrawer,
  setShowNotesDrawer,
  isFeedbackModalOpen,
  setIsFeedbackModalOpen,
  isHelpCenterOpen,
  setIsHelpCenterOpen,
  activeTab,
  setActiveTab,
  onTabChange,
  onLocationModeChange,
  showInviteStudent,
  setShowInviteStudent,
  inviteFirstName,
  setInviteFirstName,
  inviteLastName,
  setInviteLastName,
  inviteEmail,
  setInviteEmail,
  inviteLink,
  setInviteLink,
  inviteSaving,
  handleInviteStudent,
  editingStudent,
  setEditingStudent,
  handleUpdateStudent,
  showAbsenceModal,
  setShowAbsenceModal,
  isTeacherCurrentlyAbsent,
  quickAbsencePreset,
  setQuickAbsencePreset,
  absenceStartDate,
  setAbsenceStartDate,
  absenceUntilDate,
  setAbsenceUntilDate,
  showCustomStart,
  setShowCustomStart,
  absenceHandlingOwner,
  setAbsenceHandlingOwner,
  absenceOfficialNote,
  setAbsenceOfficialNote,
  cancellationsCount,
  submittingAbsence,
  handleReportAbsence,
  handleEndAbsence,
  absenceNotifModal,
  setAbsenceNotifModal,
  showRealNames,
  showAbsenceEndedModal,
  setShowAbsenceEndedModal,
  showAbsenceOverviewModal,
  setShowAbsenceOverviewModal,
  totalAbsenceCancellationsCount,
  readCancellationsCount,
  unreadCancellationsCount,
  groupedAbsenceCancellations,
  collapsedAbsenceDates,
  toggleAbsenceDateCollapse,
  toggleAllAbsenceDates,
  areAllAbsenceDatesCollapsed,
  handleEmergencyShoutbox,
  handleMarkStudentContacted,
  isUrgentModalOpen,
  urgentCancellations,
  setIsUrgentModalOpen,
  fetchUrgentCancellations,
  handleUrgentSnooze,
  isMakeupModalOpen,
  makeupModalMode,
  selectedMakeupSlot,
  selectedMakeupToken,
  setIsMakeupModalOpen,
  setSelectedMakeupSlot,
  setSelectedMakeupToken,
  fetchActiveMakeupTokens,
  showAllSubmissions,
  setShowAllSubmissions,
  allSubmissions,
  handleApproveSubmission,
  handleRejectSubmission,
  activeChatOcc,
  setActiveChatOcc,
  openAnnouncementDetailModal,
  setOpenAnnouncementDetailModal,
  questionnaireAnswers,
  setQuestionnaireAnswers,
  submittingFeedback,
  handleSubmitFeedbackResponse,
  handleMarkRequestAsDone,
  startTour,
  TourComponent
}) => {
  return (
    <>
      {showStageToolbox && (
        <Suspense fallback={null}>
          <LiveStageToolboxModal 
            initialTab={showStageToolbox} 
            onClose={() => setShowStageToolbox(null)} 
          />
        </Suspense>
      )}

      {selectedCoachProfile && (
        <Suspense fallback={null}>
          <TeacherDetailModal teacher={selectedCoachProfile} onClose={() => setSelectedCoachProfile(null)} />
        </Suspense>
      )}

      {selectedStudentProfile && (
        <Suspense fallback={null}>
          <StudentDetailModal 
            student={selectedStudentProfile} 
            onClose={() => setSelectedStudentProfile(null)} 
            callerDashboard="teacher"
            activePlatform={activePlatform === 'campus' ? 'campus' : 'groovelab'}
            onOpenBandProfile={(band) => {
              setEditingBand(band);
              setSelectedStudentProfile(null);
            }}
            onOpenTageskompass={(std) => {
              const sId = std.id || std.user_id;
              const matched = allStudents.find((s: any) => String(s.id) === String(sId));
              const localLevel = typeof window !== 'undefined' && sId ? localStorage.getItem(`campus_student_ui_level_${sId}`) : null;
              setDocStudent({
                ...std,
                id: sId,
                first_name: std.first_name,
                last_name: std.last_name,
                photo_url: std.photo_url || '/avatar_ghost.jpg',
                is_campus_active: std.is_campus_active,
                campus_ui_level: localLevel || std.campus_ui_level || matched?.campus_ui_level,
                parent_permissions: std.parent_permissions || matched?.parent_permissions,
                school_id: std.school_id || teacher?.school_id,
                schoolId: std.school_id || teacher?.school_id,
                schools: std.schools || teacher?.schools,
                school_name: std.schools?.name || std.school_name
              });
              setSelectedStudentProfile(null);
            }}
          />
        </Suspense>
      )}

      {deleteStudentModalData && (
        <Suspense fallback={null}>
          <ConfirmDeleteStudentModal
            isOpen={!!deleteStudentModalData}
            student={deleteStudentModalData}
            activePlatform={activePlatform === 'campus' ? 'campus' : activePlatform === 'groovelab' ? 'groovelab' : 'all'}
            onClose={() => setDeleteStudentModalData(null)}
            onConfirm={async (studentId) => {
              const sName = deleteStudentModalData?.name;
              const res = await deleteStudentFully(studentId, {
                activePlatform: activePlatform === 'campus' ? 'campus' : activePlatform === 'groovelab' ? 'groovelab' : 'all',
                isCampusActive: deleteStudentModalData?.isCampusActive,
                isGroovelabActive: deleteStudentModalData?.isGroovelabActive,
                studentName: sName
              });
              if (!res.success) {
                throw new Error(res.error);
              }
              const fName = sName ? sName.trim().split(/\s+/)[0].toLowerCase() : '';
              setAllStudents(prev => prev.filter(s => {
                if (s.id === studentId) return false;
                if (fName && s.first_name && s.first_name.toLowerCase().trim() === fName) return false;
                return true;
              }));
              queryCache.invalidatePrefix('teacher_students_');
              await fetchData();
            }}
          />
        </Suspense>
      )}

      {modalDocStudent && (
        <Suspense fallback={null}>
          <MeisterwerkDocumentationModal 
            student={modalDocStudent} 
            onClose={() => setDocStudent(null)} 
            teacherId={userId}
            teacherName={formatTeacherFullName(teacher)}
            schoolId={modalDocStudent?.school_id || teacher?.school_id || schoolData?.id}
            schoolName={schoolData?.name || ''}
            hasTresorStorage={Number(schoolData?.storage_addon_gb || 0) > 0 || checkIsAudioTresorActive(modalDocStudent)}
            readOnly={teacherDunningStatus?.isTeacherReadOnly || false}
            uiLevel={modalDocStudent?.campus_ui_level || undefined}
            parentPermissions={modalDocStudent?.parent_permissions}
            groupStudents={modalDocStudent?.groupStudents || (modalDocStudent?.students && modalDocStudent.students.length > 1 ? modalDocStudent.students : [])}
            onProfileClick={(student) => {
              setDocStudent(null);
              setSelectedStudentProfile(student);
            }}
          />
        </Suspense>
      )}

      {quickAudioStudent && (
        <Suspense fallback={null}>
          <TagesplanQuickAudioModal
            isOpen={Boolean(quickAudioStudent) && !teacherDunningStatus?.isTeacherReadOnly}
            student={quickAudioStudent}
            teacher={teacher}
            allStudents={allStudents}
            dateStr={new Date().toISOString()}
            hasTresorStorage={Number(schoolData?.storage_addon_gb || 0) > 0 || checkIsAudioTresorActive(quickAudioStudent) || checkIsAudioTresorActive(teacher)}
            onClose={() => setQuickAudioStudent(null)}
            onSaved={() => {
              onToast(`✓ Hausaufgabe für ${quickAudioStudent.first_name || quickAudioStudent.name} erfolgreich aktualisiert!`);
            }}
          />
        </Suspense>
      )}

      {showCommandPalette && (
        <Suspense fallback={null}>
          <CommandPaletteModal
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            allStudents={allStudents}
            onOpenNotesBoard={() => {
              setActiveTab('briefing');
            }}
            onOpenQuickNote={() => {
              setActiveTab('briefing');
            }}
            onOpenStudentHomework={(student) => {
              const sId = student.id || student.user_id;
              const matched = allStudents.find((s: any) => String(s.id) === String(sId));
              const localLevel = typeof window !== 'undefined' && sId ? localStorage.getItem(`campus_student_ui_level_${sId}`) : null;
              setDocStudent({
                ...student,
                id: sId,
                first_name: student.first_name || student.name?.split(' ')[0],
                last_name: student.last_name || student.name?.split(' ').slice(1).join(' '),
                photo_url: student.photo_url || '/avatar_ghost.jpg',
                is_campus_active: student.is_campus_active ?? false,
                campus_ui_level: localLevel || student.campus_ui_level || matched?.campus_ui_level,
                parent_permissions: student.parent_permissions || matched?.parent_permissions,
                school_id: student.school_id || teacher?.school_id,
                schoolId: student.school_id || teacher?.school_id
              });
            }}
            onOpenSchedule={() => {
              if (onTabChange) onTabChange('schedule');
            }}
            onOpenRoomPlanner={() => {
              if (onTabChange) onTabChange('rooms');
            }}
            onOpenMeisterwerk={() => {
              if (allStudents.length > 0) {
                setDocStudent(allStudents[0]);
              }
            }}
            onOpenGrooveLab={() => {
              if (onLocationModeChange) onLocationModeChange('lab');
            }}
          />
        </Suspense>
      )}

      {/* Invite Student Modal */}
      <TeacherInviteStudentModal
        showInviteStudent={showInviteStudent}
        setShowInviteStudent={setShowInviteStudent}
        inviteLink={inviteLink}
        setInviteLink={setInviteLink}
        inviteFirstName={inviteFirstName}
        setInviteFirstName={setInviteFirstName}
        inviteLastName={inviteLastName}
        setInviteLastName={setInviteLastName}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        inviteSaving={inviteSaving}
        handleInviteStudent={handleInviteStudent}
      />

      {/* Urgent Cancellations Modal */}
      {isUrgentModalOpen && urgentCancellations.length > 0 && (
        <TeacherUrgentCancellationsModal
          isOpen={isUrgentModalOpen}
          teacherId={userId}
          items={urgentCancellations}
          onClose={() => setIsUrgentModalOpen(false)}
          onRefresh={fetchUrgentCancellations}
          onSnooze={handleUrgentSnooze}
        />
      )}

      {/* Makeup Token Modal */}
      {isMakeupModalOpen && (
        <TeacherMakeupTokenModal
          isOpen={isMakeupModalOpen}
          mode={makeupModalMode}
          occurrence={selectedMakeupSlot}
          token={selectedMakeupToken}
          rooms={rooms || []}
          teacherId={userId}
          onClose={() => {
            setIsMakeupModalOpen(false);
            setSelectedMakeupSlot(null);
            setSelectedMakeupToken(null);
          }}
          onSuccess={async () => {
            await fetchActiveMakeupTokens();
            await fetchData();
          }}
        />
      )}

      {/* Edit Student Modal */}
      <TeacherEditStudentModal
        editingStudent={editingStudent}
        setEditingStudent={setEditingStudent}
        handleUpdateStudent={handleUpdateStudent}
        activePlatform={activePlatform}
        schoolData={schoolData}
      />

      {/* Pipeline Submissions Overlay */}
      {showAllSubmissions && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          zIndex: 2000,
          padding: '40px',
          overflowY: 'auto'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                 <div style={{ background: '#f59e0b', color: 'white', padding: '12px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.2)' }}>
                   <TrendingUp size={28} />
                 </div>
                 <div>
                   <h2 style={{ fontSize: '28px', fontWeight: 1000, color: '#0f172a', margin: 0 }}>Vollständige Pipeline</h2>
                   <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600, margin: '4px 0 0 0' }}>{allSubmissions.length} ausstehende Abnahmen</p>
                 </div>
               </div>
               <button 
                 onClick={() => setShowAllSubmissions(false)}
                 style={{ background: '#f1f5f9', border: 'none', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
               >
                 <X size={24} />
               </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {allSubmissions.map(sub => {
                const isInLab = activeSessions.some(sess => sess.user_id === sub.user_id);
                return (
                  <div key={sub.id} style={{ 
                    background: 'white', 
                    padding: '24px', 
                    borderRadius: '32px', 
                    border: `2px solid ${isInLab ? '#34a853' : '#ef4444'}`,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: isInLab ? '#34a853' : '#ef4444',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '10px',
                      fontSize: '0.6rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {isInLab ? 'IM LAB' : 'HOME'}
                    </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                     <div style={{ width: '56px', height: '56px', borderRadius: '18px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 8px 16px rgba(0,0,0,0.05)' }}>
                       <AvatarImage src={sub.users?.photo_url} user={sub.users} activePlatform={activePlatform} />
                     </div>
                     <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <div style={{ fontWeight: 1000, fontSize: '1.1rem', color: '#0f172a' }}>{sub.users?.first_name}</div>
                          {(() => {
                            const norm = normalizeInstrument(sub.instrument);
                            return (
                              <div style={{ 
                                width: '24px', height: '24px', borderRadius: '8px', 
                                background: INSTRUMENT_COLORS[norm] || '#cbd5e1', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                fontSize: '0.8rem', flexShrink: 0,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}>
                                {TEACHER_INSTRUMENT_ICONS[norm] || '🎸'}
                              </div>
                            );
                          })()}
                          <div style={{ background: '#e2e8f0', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 950, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {(sub.difficulty_level === 'original' || sub.difficulty_level === 'pro') ? '⚡ PRO' : '🚀 STARTER'}
                          </div>
                        </div>

                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                           {sub.instrument}{sub.part_number && sub.part_number > 1 ? ` ${sub.part_number}` : ''}
                        </div>
                     </div>
                   </div>

                   <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                     <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Song</div>
                     <div style={{ fontWeight: 900, color: '#1e293b' }}>{sub.songs?.artist} - {sub.songs?.title}</div>
                   </div>

                   <div style={{ display: 'flex', gap: '12px' }}>
                     <button 
                       onClick={() => handleApproveSubmission(sub.id)}
                       style={{ flex: 2, background: '#34a853', color: 'white', border: 'none', padding: '12px', borderRadius: '16px', fontWeight: 1000, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(52, 168, 83, 0.2)' }}
                     >
                       BESTÄTIGEN
                     </button>
                     <button 
                       onClick={() => handleRejectSubmission(sub.id)}
                       style={{ flex: 1, background: '#f1f5f9', color: '#ef4444', border: 'none', padding: '12px', borderRadius: '16px', fontWeight: 1000, fontSize: '0.85rem', cursor: 'pointer' }}
                     >
                       <Trash2 size={18} />
                     </button>
                   </div>
                  </div>
                );
              })}
            </div>

            {allSubmissions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✨</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 1000, color: '#1e293b' }}>Alles erledigt!</h3>
                <p style={{ color: '#64748b', fontWeight: 600 }}>Es gibt aktuell keine ausstehenden Challenges.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Absence Modals */}
      <TeacherAbsenceModal
        showAbsenceModal={showAbsenceModal}
        setShowAbsenceModal={setShowAbsenceModal}
        windowWidth={windowWidth}
        teacher={teacher}
        isTeacherCurrentlyAbsent={() => Boolean(isTeacherCurrentlyAbsent)}
        quickAbsencePreset={quickAbsencePreset}
        setQuickAbsencePreset={setQuickAbsencePreset}
        absenceStartDate={absenceStartDate}
        setAbsenceStartDate={setAbsenceStartDate}
        absenceUntilDate={absenceUntilDate}
        setAbsenceUntilDate={setAbsenceUntilDate}
        showCustomStart={showCustomStart}
        setShowCustomStart={setShowCustomStart}
        absenceHandlingOwner={absenceHandlingOwner}
        setAbsenceHandlingOwner={setAbsenceHandlingOwner}
        absenceOfficialNote={absenceOfficialNote}
        setAbsenceOfficialNote={setAbsenceOfficialNote}
        cancellationsCount={cancellationsCount}
        submittingAbsence={submittingAbsence}
        handleReportAbsence={handleReportAbsence}
        handleEndAbsence={handleEndAbsence}
      />

      <TeacherAbsenceNotifModal
        absenceNotifModal={absenceNotifModal}
        setAbsenceNotifModal={setAbsenceNotifModal}
        schoolData={schoolData}
        teacher={teacher}
        allStudents={allStudents}
        showRealNames={showRealNames}
      />

      <TeacherAbsenceEndedModal
        showAbsenceEndedModal={showAbsenceEndedModal}
        setShowAbsenceEndedModal={setShowAbsenceEndedModal}
      />

      <TeacherAbsenceOverviewModal
        showAbsenceOverviewModal={showAbsenceOverviewModal}
        setShowAbsenceOverviewModal={setShowAbsenceOverviewModal}
        totalAbsenceCancellationsCount={totalAbsenceCancellationsCount}
        readCancellationsCount={readCancellationsCount}
        unreadCancellationsCount={unreadCancellationsCount}
        groupedAbsenceCancellations={groupedAbsenceCancellations}
        collapsedAbsenceDates={collapsedAbsenceDates}
        toggleAbsenceDateCollapse={toggleAbsenceDateCollapse}
        toggleAllAbsenceDates={toggleAllAbsenceDates}
        areAllAbsenceDatesCollapsed={areAllAbsenceDatesCollapsed}
        handleEmergencyShoutbox={handleEmergencyShoutbox || (() => {})}
        handleMarkStudentContacted={handleMarkStudentContacted}
      />

      {/* 1:1 Shoutbox Overlay */}
      {activeChatOcc && (
        <CampusAppointmentShoutboxModal
          isOpen={Boolean(activeChatOcc)}
          onClose={() => setActiveChatOcc(null)}
          occurrence={activeChatOcc}
          currentUserId={userId}
          currentUserRole="teacher"
          currentUserProfile={teacher}
          onStatusChange={(newStatus, updatedOcc) => {
            if (activeChatOcc) {
              setActiveChatOcc((prev: any) => prev ? ({ ...prev, status: newStatus, ...updatedOcc }) : null);
            }
            fetchData();
          }}
        />
      )}

      {/* Realtime Toast Message Overlay */}
      {toastMessage && (
        <div 
          className="animation-slide-up"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, #ca8a04, #eab308)',
            color: '#0f172a',
            borderRadius: '16px',
            padding: '16px 24px',
            boxShadow: '0 10px 30px rgba(234, 179, 8, 0.4)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 800,
            fontSize: '0.95rem',
            border: '1px solid #fef08a'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>🎉</span>
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            aria-label="Toast schließen"
            style={{
              background: 'none',
              border: 'none',
              color: '#0f172a',
              cursor: 'pointer',
              fontSize: '1.2rem',
              fontWeight: 800,
              marginLeft: '8px',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}

      {!isMobileDevice && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
          <TourStartButton onClick={startTour} platformTheme={activePlatform === 'campus' ? 'campus' : 'groovelab'} />
        </div>
      )}
      <TourComponent />

      {/* Feedback & Ideenschmiede Modal */}
      {isFeedbackModalOpen && (
        <Suspense fallback={null}>
          <FeedbackHubModal
            isOpen={isFeedbackModalOpen}
            onClose={() => setIsFeedbackModalOpen(false)}
            userRole="teacher"
            userId={userId}
            userName={teacher ? formatTeacherFullName(teacher) : 'Lehrkraft'}
            schoolId={teacher?.school_id || (teacher as any)?.schoolId}
            schoolName={schoolData?.name || (teacher as any)?.school_name}
            activePlatform={activePlatform}
          />
        </Suspense>
      )}

      {/* Leitfäden & Akademie Modal */}
      {isHelpCenterOpen && (
        <Suspense fallback={null}>
          <HelpCenterModal
            isOpen={isHelpCenterOpen}
            onClose={() => setIsHelpCenterOpen(false)}
            userRole="teacher"
            activePlatform={activePlatform as any}
            schoolName={schoolData?.name || (teacher as any)?.school_name}
            initialBoardId={activeTab || 'briefing'}
            onNavigateBoard={(target) => {
              if (target) setActiveTab(target as any);
            }}
            onOpenFeedbackHub={() => {
              setIsHelpCenterOpen(false);
              setIsFeedbackModalOpen(true);
            }}
          />
        </Suspense>
      )}

      {/* Global Notes Quick-Drawer */}
      <GlobalNotesDrawer
        isOpen={showNotesDrawer}
        onClose={() => setShowNotesDrawer(false)}
        user={teacher}
        schoolId={teacher?.school_id || (teacher as any)?.schoolId || schoolData?.id}
        activeStudent={null}
        allStudents={allStudents}
        todayStudents={todayTagesplanStudents}
        rooms={rooms}
        currentRoom={activeTimelineSlot?.room || activeTimelineSlot?.rooms?.name || teacherTodayRooms[0] || ''}
        teacherTodayRooms={teacherTodayRooms}
        onOpenHomeworkModal={(stud) => {
          const sId = stud.id || stud.user_id;
          const matched = allStudents.find((s: any) => String(s.id) === String(sId));
          const localLevel = typeof window !== 'undefined' && sId ? localStorage.getItem(`campus_student_ui_level_${sId}`) : null;
          setDocStudent({
            ...stud,
            id: sId,
            first_name: stud.first_name || stud.name?.split(' ')[0],
            last_name: stud.last_name || stud.name?.split(' ').slice(1).join(' '),
            photo_url: stud.photo_url || '/avatar_ghost.jpg',
            is_campus_active: stud.is_campus_active ?? false,
            campus_ui_level: localLevel || stud.campus_ui_level || matched?.campus_ui_level,
            parent_permissions: stud.parent_permissions || matched?.parent_permissions,
            school_id: stud.school_id || teacher?.school_id,
            schoolId: stud.school_id || teacher?.school_id
          });
        }}
      />

      {/* Announcement Reader Modal */}
      <TeacherAnnouncementReaderModal
        openAnnouncementDetailModal={openAnnouncementDetailModal}
        setOpenAnnouncementDetailModal={setOpenAnnouncementDetailModal}
        isMobileDevice={isMobileDevice}
        questionnaireAnswers={questionnaireAnswers}
        setQuestionnaireAnswers={setQuestionnaireAnswers}
        submittingFeedback={submittingFeedback}
        handleSubmitFeedbackResponse={handleSubmitFeedbackResponse}
        handleMarkRequestAsDone={handleMarkRequestAsDone}
      />
    </>
  );
};
