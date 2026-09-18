import React, { Suspense, lazy } from 'react';
import { formatTeacherFullName } from '../../../utils/nameHelper';
import { checkIsAudioTresorActive } from '../../../domain/stickersAndTresor';
import { AdminBandEditModal } from './AdminBandEditModal';
import { AdminBatchiPadModal } from './AdminBatchiPadModal';

const StudentDetailModal = lazy(() => import('../../StudentDetailModal').then(m => ({ default: m.StudentDetailModal })));
const AVVModal = lazy(() => import('../../AVVModal').then(m => ({ default: m.AVVModal })));
const MeisterwerkDocumentationModal = lazy(() => import('../../MeisterwerkDocumentationModal').then(m => ({ default: m.MeisterwerkDocumentationModal })));
const AdminSongDetailModal = lazy(() => import('./AdminSongDetailModal').then(m => ({ default: m.AdminSongDetailModal })));
const AdminTextbausteinModal = lazy(() => import('./AdminTextbausteinModal').then(m => ({ default: m.AdminTextbausteinModal })));

export interface AdminModalsMasterHubProps {
  // Batch iPad
  showBatchiPadModal: { roomId: string } | null;
  setShowBatchiPadModal: (val: { roomId: string } | null) => void;
  onExecuteBatchiPad: (roomId: string, count: number) => Promise<void> | void;

  // Student Detail
  selectedStudent: any | null;
  setSelectedStudent: (s: any | null) => void;
  admin: any;
  userId: string;
  activePlatform: string;
  onSwitchPlatform?: ((platform: 'campus' | 'groovelab') => void) | (() => void);

  // Logout
  showLogoutConfirm: boolean;
  setShowLogoutConfirm: (b: boolean) => void;
  onLogout: () => void;

  // AVV
  showAVVModal: boolean;
  setShowAVVModal: (b: boolean) => void;
  schoolObj: any;
  setAdmin: React.Dispatch<any>;
  onFetchData: (silent?: boolean) => void;

  // Song Detail
  selectedSongForDetail: any | null;
  setSelectedSongForDetail: (s: any | null) => void;
  students: any[];
  supabase: any;
  textbausteine: any[];
  setTextbausteine: React.Dispatch<React.SetStateAction<any[]>>;
  songLessonNotes: string;
  setSongLessonNotes: React.Dispatch<React.SetStateAction<string>>;
  setSongs: React.Dispatch<React.SetStateAction<any[]>>;

  // Textbausteine
  showTextbausteinModal: boolean;
  setShowTextbausteinModal: (b: boolean) => void;
  previewingTextbaustein: any;
  setPreviewingTextbaustein: (p: any) => void;
  copiedTbId: string | null;
  setCopiedTbId: (id: string | null) => void;

  // Tageskompass
  showTageskompassModal: boolean;
  setShowTageskompassModal: (b: boolean) => void;
  selectedStudentForTageskompass: any | null;
  setSelectedStudentForTageskompass: (s: any | null) => void;
  initialLehrwerkIdForTageskompass: string | null;
  setInitialLehrwerkIdForTageskompass: (id: string | null) => void;
  lehrwerke: any[];

  // Teacher Tools
  showTeacherToolsModal: boolean;
  setShowTeacherToolsModal: (b: boolean) => void;

  // Band Edit
  editingBand: any | null;
  setEditingBand: (b: any | null) => void;
  onSaveBandEdit: (e: React.FormEvent) => void;
  teachers: any[];
  schedules: any[];
  onRemoveMember: (memberId: string) => void;
  onAddMember: (bandId: string, userId: string | null, instrument: string, externalName?: string) => void;

  brandColor?: string;
}

export const AdminModalsMasterHub: React.FC<AdminModalsMasterHubProps> = ({
  showBatchiPadModal,
  setShowBatchiPadModal,
  onExecuteBatchiPad,
  selectedStudent,
  setSelectedStudent,
  admin,
  userId,
  activePlatform,
  onSwitchPlatform,
  showLogoutConfirm,
  setShowLogoutConfirm,
  onLogout,
  showAVVModal,
  setShowAVVModal,
  schoolObj,
  setAdmin,
  onFetchData,
  selectedSongForDetail,
  setSelectedSongForDetail,
  students,
  supabase,
  textbausteine,
  setTextbausteine,
  songLessonNotes,
  setSongLessonNotes,
  setSongs,
  showTextbausteinModal,
  setShowTextbausteinModal,
  previewingTextbaustein,
  setPreviewingTextbaustein,
  copiedTbId,
  setCopiedTbId,
  showTageskompassModal,
  setShowTageskompassModal,
  selectedStudentForTageskompass,
  setSelectedStudentForTageskompass,
  initialLehrwerkIdForTageskompass,
  setInitialLehrwerkIdForTageskompass,
  lehrwerke,
  showTeacherToolsModal,
  setShowTeacherToolsModal,
  editingBand,
  setEditingBand,
  onSaveBandEdit,
  teachers,
  schedules,
  onRemoveMember,
  onAddMember,
  brandColor = '#facc15'
}) => {
  const activeWorkspace = typeof window !== 'undefined' 
    ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace')) 
    : null;
  const isTeacherMode = admin?.role === 'teacher' || activeWorkspace === 'teacher' || userId === 'teacher';

  return (
    <>
      {/* 1. Batch iPad Modal */}
      <AdminBatchiPadModal
        showBatchiPadModal={showBatchiPadModal}
        onClose={() => setShowBatchiPadModal(null)}
        onExecuteBatch={onExecuteBatchiPad}
      />

      {/* 2. Student Detail Modal */}
      {selectedStudent && (
        <Suspense fallback={null}>
          <StudentDetailModal 
            student={selectedStudent} 
            onClose={() => setSelectedStudent(null)} 
            callerDashboard={isTeacherMode ? 'teacher' : 'admin'}
            onOpenBandProfile={(band) => {
              setEditingBand(band);
              setSelectedStudent(null);
            }}
            activePlatform={activePlatform === "campus" ? "campus" : "groovelab"}
            onSwitchPlatform={onSwitchPlatform}
          />
        </Suspense>
      )}

      {/* 3. Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-label="Abmelden bestätigen" 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 9999, 
            background: 'rgba(0,0,0,0.6)', 
            backdropFilter: 'blur(10px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '20px' 
          }}
        >
          <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '12px' }}>Abmelden?</h3>
            <p style={{ color: '#64748b', marginBottom: '32px', fontWeight: 500 }}>Bist du sicher, dass du das Admin-Dashboard verlassen möchtest?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', color: '#1e293b', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={onLogout} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Ja, Abmelden</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. AVV Modal */}
      {showAVVModal && (
        <Suspense fallback={null}>
          <AVVModal
            isOpen={showAVVModal}
            onClose={() => setShowAVVModal(false)}
            school={schoolObj || (admin?.schools ? (Array.isArray(admin.schools) ? admin.schools[0] : admin.schools) : null) || { id: admin?.school_id, name: admin?.first_name ? `${admin.first_name}'s Schule` : 'Musikschule' }}
            onAVVSigned={() => {
              const nowIso = new Date().toISOString();
              if (admin) {
                setAdmin((prev: any) => {
                  if (!prev) return prev;
                  const currentSchools = prev.schools;
                  let updatedSchools;
                  if (Array.isArray(currentSchools)) {
                    updatedSchools = currentSchools.map((s: any) => ({ ...s, avv_signed_at: nowIso }));
                  } else if (currentSchools && typeof currentSchools === 'object') {
                    updatedSchools = { ...currentSchools, avv_signed_at: nowIso };
                  } else {
                    updatedSchools = { id: prev.school_id, avv_signed_at: nowIso };
                  }
                  return {
                    ...prev,
                    schools: updatedSchools
                  };
                });
              }
              setShowAVVModal(false);
              onFetchData(true);
            }}
          />
        </Suspense>
      )}

      {/* 5. Song Detail Modal */}
      {selectedSongForDetail && (
        <Suspense fallback={null}>
          <AdminSongDetailModal
            song={selectedSongForDetail}
            onClose={() => setSelectedSongForDetail(null)}
            students={students}
            supabase={supabase}
            textbausteine={textbausteine}
            songLessonNotes={songLessonNotes}
            setSongLessonNotes={setSongLessonNotes}
            onSongUpdated={(updatedSong) => {
              setSongs(prev => prev.map(s => s.id === updatedSong.id ? updatedSong : s));
              setSelectedSongForDetail(updatedSong);
            }}
            onOpenTageskompass={(student) => {
              setSelectedStudentForTageskompass(student);
              setShowTageskompassModal(true);
            }}
          />
        </Suspense>
      )}

      {/* 6. Textbausteine Modal */}
      <Suspense fallback={null}>
        <AdminTextbausteinModal
          isOpen={showTextbausteinModal}
          onClose={() => setShowTextbausteinModal(false)}
          textbausteine={textbausteine}
          setTextbausteine={setTextbausteine}
          brandColor={brandColor}
          previewingTextbaustein={previewingTextbaustein}
          onClosePreview={() => setPreviewingTextbaustein(null)}
          copiedTbId={copiedTbId}
          setCopiedTbId={setCopiedTbId}
        />
      </Suspense>

      {/* 7. Tageskompass Documentation Modal */}
      {showTageskompassModal && selectedStudentForTageskompass && (
        <Suspense fallback={null}>
          <MeisterwerkDocumentationModal
            student={{
              id: selectedStudentForTageskompass.id,
              first_name: selectedStudentForTageskompass.first_name,
              last_name: selectedStudentForTageskompass.last_name,
              photo_url: selectedStudentForTageskompass.photo_url || '/avatar_ghost.jpg',
              is_campus_active: selectedStudentForTageskompass.is_campus_active,
              school_id: selectedStudentForTageskompass.school_id || admin?.school_id,
              campus_ui_level: selectedStudentForTageskompass.campus_ui_level,
              parent_permissions: selectedStudentForTageskompass.parent_permissions
            }}
            onClose={() => {
              setShowTageskompassModal(false);
              setSelectedStudentForTageskompass(null);
              setInitialLehrwerkIdForTageskompass(null);
            }}
            teacherId={userId}
            teacherName={formatTeacherFullName(admin)}
            schoolId={admin?.school_id || selectedStudentForTageskompass.school_id}
            initialLehrwerke={lehrwerke}
            initialLehrwerkId={initialLehrwerkIdForTageskompass || undefined}
            uiLevel={selectedStudentForTageskompass.campus_ui_level || undefined}
            parentPermissions={selectedStudentForTageskompass.parent_permissions}
            hasTresorStorage={checkIsAudioTresorActive(selectedStudentForTageskompass) || checkIsAudioTresorActive(admin)}
            onProfileClick={(student) => {
              setShowTageskompassModal(false);
              setSelectedStudentForTageskompass(null);
              setInitialLehrwerkIdForTageskompass(null);
              setSelectedStudent(student);
            }}
          />
        </Suspense>
      )}

      {/* 8. Teacher Tools Sandbox Modal */}
      {showTeacherToolsModal && (
        <Suspense fallback={null}>
          <MeisterwerkDocumentationModal
            student={{
              id: 'teacher-self',
              first_name: admin?.first_name || 'Lehrer',
              last_name: admin?.last_name || '',
              name: formatTeacherFullName(admin),
              photo_url: admin?.photo_url || '/campus_login_hero.png',
              is_campus_active: true,
              school_id: admin?.school_id,
              role: 'teacher',
              is_teacher: true,
              campus_ui_level: 'pro'
            }}
            onClose={() => setShowTeacherToolsModal(false)}
            teacherId={userId}
            teacherName={formatTeacherFullName(admin)}
            schoolId={admin?.school_id}
            initialLehrwerke={lehrwerke}
            isTeacherTools={true}
            isTeacherSandbox={true}
            uiLevel="pro"
            hasTresorStorage={checkIsAudioTresorActive(admin)}
          />
        </Suspense>
      )}

      {/* 9. Band Edit Modal */}
      <AdminBandEditModal
        editingBand={editingBand}
        setEditingBand={setEditingBand}
        onSaveBandEdit={onSaveBandEdit}
        teachers={teachers}
        students={students}
        schedules={schedules}
        onRemoveMember={onRemoveMember}
        onAddMember={onAddMember}
        brandColor={brandColor}
      />
    </>
  );
};
