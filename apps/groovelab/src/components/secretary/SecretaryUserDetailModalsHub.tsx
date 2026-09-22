import React, { Suspense, lazy } from 'react';
import { Key, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { deleteStudentFully } from '../../utils/studentDeletionService';
import { TeacherManagementModal } from '../verwaltung/TeacherManagementModal';

const StudentDetailModal = lazy(() => import('../StudentDetailModal').then(m => ({ default: m.StudentDetailModal })));
const TeacherDetailModal = lazy(() => import('../TeacherDetailModal').then(m => ({ default: m.TeacherDetailModal })));
const ConfirmDeleteStudentModal = lazy(() => import('../ConfirmDeleteStudentModal').then(m => ({ default: m.ConfirmDeleteStudentModal })));

export interface SecretaryUserDetailModalsHubProps {
  // Student detail modal
  selectedStudentForDetail: any;
  setSelectedStudentForDetail: (student: any) => void;

  // Student deletion confirmation
  deleteStudentModalData: any;
  setDeleteStudentModalData: (data: any) => void;
  setStudents: React.Dispatch<React.SetStateAction<any[]>>;

  // Teacher detail modal
  selectedCoachProfile: any;
  setSelectedCoachProfile: (teacher: any) => void;

  // Teacher management modal
  manageTeacher: any;
  setManageTeacher: (teacher: any) => void;
  schoolName: string;
  schoolId: string;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  setCampusSubTab: (sub: any) => void;
  setGroovelabSubTab: (sub: any) => void;
  students: any[];
  bands: any[];
  activeSubjectsList?: string[];
  handleUpdateTeacher: (updatedData: any) => Promise<void>;
  handleDeleteUser: (userId: string) => Promise<void>;
  setQrModalUser: (user: any) => void;
  generateStarterPin: (role: string, isCampus: boolean, isGroovelab: boolean) => string;

  // Unassigned room warning
  showUnassignedWarning: boolean;
  setShowUnassignedWarning: (show: boolean) => void;
  matrixAllocations: any[];
  handleSaveAndApproveAll: (bypassWarnings?: boolean, targetTeacherId?: string) => Promise<void>;

  // Floating student context menu (3 dots)
  activeContextMenu: {
    student: any;
    top: number;
    right: number;
  } | null;
  setActiveContextMenu: (menu: any) => void;
  handleDeleteStudentCampus: (
    studentId: string,
    name: string,
    instrument?: string,
    teacherId?: string,
    isCampusActive?: boolean,
    isGroovelabActive?: boolean
  ) => void;

  // Global refresh
  fetchDashboardData: () => Promise<void>;
}

export function SecretaryUserDetailModalsHub({
  selectedStudentForDetail,
  setSelectedStudentForDetail,
  deleteStudentModalData,
  setDeleteStudentModalData,
  setStudents,
  selectedCoachProfile,
  setSelectedCoachProfile,
  manageTeacher,
  setManageTeacher,
  schoolName,
  schoolId,
  activeTab,
  setActiveTab,
  setCampusSubTab,
  setGroovelabSubTab,
  students,
  bands,
  activeSubjectsList = [],
  handleUpdateTeacher,
  handleDeleteUser,
  setQrModalUser,
  generateStarterPin,
  showUnassignedWarning,
  setShowUnassignedWarning,
  matrixAllocations,
  handleSaveAndApproveAll,
  activeContextMenu,
  setActiveContextMenu,
  handleDeleteStudentCampus,
  fetchDashboardData
}: SecretaryUserDetailModalsHubProps) {

  // SVG download helper for QR codes in TeacherManagementModal
  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg || !manageTeacher) return;

    if (!svg.getAttribute('xmlns')) {
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const base64Data = btoa(unescape(encodeURIComponent(svgData)));
      const dataUrl = `data:image/svg+xml;charset=utf-8;base64,${base64Data}`;

      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `QR_Code_${manageTeacher.firstName || 'User'}_${manageTeacher.lastName || ''}.svg`;
      downloadLink.target = '_blank';

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (e) {
      console.error('Fallback download using Blob due to Base64 failure:', e);
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `QR_Code_${manageTeacher.firstName || 'User'}_${manageTeacher.lastName || ''}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <>
      {/* 🎓 Student Detail Modal */}
      {selectedStudentForDetail && (
        <Suspense fallback={null}>
          <StudentDetailModal
            student={selectedStudentForDetail}
            onClose={() => {
              setSelectedStudentForDetail(null);
              fetchDashboardData();
            }}
            callerDashboard="secretary"
            activePlatform={activeTab as any}
            onSwitchPlatform={(newPlatform) => {
              setActiveTab(newPlatform);
              if (newPlatform === 'campus') {
                setCampusSubTab('briefing');
              } else if (newPlatform === 'groovelab') {
                setGroovelabSubTab('live');
              }
            }}
          />
        </Suspense>
      )}

      {/* ⚠️ Confirm Delete Student Modal */}
      {deleteStudentModalData && (
        <Suspense fallback={null}>
          <ConfirmDeleteStudentModal
            isOpen={!!deleteStudentModalData}
            student={deleteStudentModalData}
            activePlatform={activeTab === 'campus' ? 'campus' : activeTab === 'groovelab' ? 'groovelab' : 'all'}
            onClose={() => setDeleteStudentModalData(null)}
            onConfirm={async (studentId) => {
              const sName = deleteStudentModalData?.name;
              const res = await deleteStudentFully(studentId, {
                activePlatform: activeTab === 'campus' ? 'campus' : activeTab === 'groovelab' ? 'groovelab' : 'all',
                isCampusActive: deleteStudentModalData?.isCampusActive,
                isGroovelabActive: deleteStudentModalData?.isGroovelabActive,
                studentName: sName
              });
              if (!res.success) {
                throw new Error(res.error);
              }
              const fName = sName ? sName.trim().split(/\s+/)[0].toLowerCase() : '';
              setStudents((prev: any[]) => prev.filter((s: any) => {
                if (s.id === studentId) return false;
                if (fName && s.first_name && s.first_name.toLowerCase().trim() === fName) return false;
                return true;
              }));
              await fetchDashboardData();
            }}
          />
        </Suspense>
      )}

      {/* 🎸 Teacher Detail Modal */}
      {selectedCoachProfile && (
        <Suspense fallback={null}>
          <TeacherDetailModal
            teacher={selectedCoachProfile}
            onClose={() => setSelectedCoachProfile(null)}
          />
        </Suspense>
      )}

      {/* ⚙️ Teacher Management Modal */}
      {manageTeacher && (
        <TeacherManagementModal
          teacher={manageTeacher}
          schoolName={schoolName}
          schoolId={schoolId}
          activeTab={activeTab}
          students={students}
          bands={bands}
          activeSubjectsList={activeSubjectsList || []}
          onClose={() => setManageTeacher(null)}
          onSave={async (updatedData) => {
            await handleUpdateTeacher(updatedData);
          }}
          onDelete={async (teacherId) => {
            await handleDeleteUser(teacherId);
          }}
          onRevokeSessions={async (teacherId) => {
            await supabase.rpc('revoke_user_sessions', { p_user_id: teacherId });
          }}
          onOpenQrModal={(user) => {
            setQrModalUser({
              ...user,
              first_name: user.firstName || user.first_name,
              last_name: user.lastName || user.last_name,
              role: user.role || 'teacher',
              qr_token: user.teacherQrToken || user.ausweisNummer || user.id,
              teacher_qr_token: user.teacherQrToken || user.ausweisNummer || user.id,
              ausweis_nummer: user.ausweisNummer || user.ausweis_nummer,
              is_campus_active: user.isCampusActive,
              is_groovelab_active: user.isGroovelabActive
            });
          }}
          downloadQRCode={downloadQRCode}
          generateStarterPin={generateStarterPin}
        />
      )}

      {/* ─── Unassigned-Warning Modal ─── */}
      {showUnassignedWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unassigned-warning-title"
            style={{ background: 'white', borderRadius: '20px', padding: '28px 28px 22px', maxWidth: 380, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center' }}
          >
            <div style={{ fontSize: '2.4rem', marginBottom: 10 }} aria-hidden="true">⚠️</div>
            <h3 id="unassigned-warning-title" style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>Nicht alle Räume zugewiesen</h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
              Es gibt noch {matrixAllocations.filter(p => !p.roomId).length} Lehrkraft-Tag-Kombination(en) ohne Raumzuweisung. Diese werden <strong>nicht freigegeben</strong>.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setShowUnassignedWarning(false)}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', color: '#64748b' }}
              >
                Abbrechen
              </button>
              <button
                onClick={() => { setShowUnassignedWarning(false); handleSaveAndApproveAll(true); }}
                style={{ flex: 1.2, padding: '10px 16px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #34a853, #22c55e)', color: 'white', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(52,168,83,0.3)' }}
              >
                Trotzdem freigeben
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Floating Active Context Menu (3-Dots Menu) ─── */}
      {activeContextMenu && activeContextMenu.student && (
        <>
          <div
            role="presentation"
            aria-hidden="true"
            onClick={() => setActiveContextMenu(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'transparent' }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${activeContextMenu.top}px`,
              right: `${activeContextMenu.right}px`,
              width: '220px',
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              padding: '6px',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            {/* PIN Display if available */}
            {activeContextMenu.student.is_app_user && (
              <div style={{
                padding: '6px 10px',
                fontSize: '0.74rem',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: '8px',
                fontFamily: 'monospace',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span>Login-PIN:</span>
                <strong style={{ color: '#0f172a', fontSize: '0.84rem' }}>{activeContextMenu.student.ausweis_nummer || 'Keine'}</strong>
              </div>
            )}

            {/* PIN Reset */}
            <button
              type="button"
              onClick={async () => {
                const s = activeContextMenu.student;
                setActiveContextMenu(null);
                const sName = `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'diesem Schüler';
                if (!window.confirm(`PIN von ${sName} zurücksetzen?\n\nDer Schüler wird beim nächsten App-Aufruf dazu aufgefordert, seinen Geburtstagstag zu bestätigen und eine neue 4-stellige PIN zu vergeben.`)) {
                  return;
                }
                try {
                  await supabase.from('activation_days').delete().eq('student_id', s.id);
                  const userResetPayload: any = {
                    onboarding_pin: null,
                    personal_pin: null,
                    parent_pin: null,
                    is_pin_activated: false,
                    status: 'offen'
                  };
                  try {
                    await supabase.from('users').update(userResetPayload).eq('id', s.id);
                  } catch (e) {}
                  const { error: userResetErr } = await supabase.from('users').update(userResetPayload).eq('id', s.id);
                  if (userResetErr && userResetErr.message?.includes('onboarding_pin')) {
                    delete userResetPayload.onboarding_pin;
                    await supabase.from('users').update(userResetPayload).eq('id', s.id);
                  }
                  await supabase.from('students').update({ onboarding_pin: null, is_pin_activated: false, status: 'offen' }).eq('id', s.id);
                  await supabase.from('pending_students').update({ is_pin_activated: false, status: 'offen' }).eq('id', s.id);
                  fetchDashboardData();
                  alert(`PIN von ${sName} wurde zurückgesetzt.`);
                } catch (err: any) {
                  alert('Fehler beim Zurücksetzen der PIN: ' + err.message);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: '#334155',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Key size={14} color="#b45309" />
              <span>PIN zurücksetzen</span>
            </button>

            {/* Geburtstagstag Selector */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderRadius: '8px',
              background: '#f8fafc'
            }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>Geburtstagstag:</span>
              <select
                value={activeContextMenu.student.day_of_birth || 1}
                onChange={async (e) => {
                  const newDay = parseInt(e.target.value, 10);
                  const s = activeContextMenu.student;
                  try {
                    const { data: existing } = await supabase
                      .from('activation_days')
                      .select('student_id')
                      .eq('student_id', s.id)
                      .maybeSingle();

                    if (existing) {
                      const { error: err } = await supabase
                        .from('activation_days')
                        .update({ day_of_birth: newDay })
                        .eq('student_id', s.id);
                      if (err) throw err;
                    } else {
                      const { error: err } = await supabase
                        .from('activation_days')
                        .insert({ student_id: s.id, day_of_birth: newDay });
                      if (err) throw err;
                    }

                    if (s.isPendingOnboarding) {
                      await supabase
                        .from('pending_students')
                        .update({ day_of_birth: newDay })
                        .eq('id', s.id);
                    }

                    fetchDashboardData();
                  } catch (err: any) {
                    console.error('Fehler beim Ändern des Geburtstagstags:', err);
                    alert('Fehler beim Ändern des Geburtstagstags: ' + err.message);
                  }
                }}
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  cursor: 'pointer'
                }}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Tag {d}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />

            {/* Delete Student */}
            <button
              type="button"
              onClick={() => {
                const s = activeContextMenu.student;
                setActiveContextMenu(null);
                handleDeleteStudentCampus(
                  s.id,
                  `${s.first_name || ''} ${s.last_name || ''}`.trim(),
                  s.instrument,
                  s.teacher_id,
                  s.is_campus_active,
                  s.is_groovelab_active
                );
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: 'none',
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}
            >
              <Trash2 size={14} color="#dc2626" />
              <span>Schüler löschen</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}
