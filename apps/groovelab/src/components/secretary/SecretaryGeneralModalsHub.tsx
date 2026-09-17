import React, { Suspense, lazy } from 'react';

const QRCodeModal = lazy(() => import('../QRCodeModal').then(m => ({ default: m.QRCodeModal })));
const AVVModal = lazy(() => import('../AVVModal').then(m => ({ default: m.AVVModal })));
const DpoIdCardModal = lazy(() => import('../DpoIdCardModal').then(m => ({ default: m.DpoIdCardModal })));
const DpoAuditPortal = lazy(() => import('../DpoAuditPortal').then(m => ({ default: m.DpoAuditPortal })));
const FeedbackHubModal = lazy(() => import('../feedback/FeedbackHubModal').then(m => ({ default: m.FeedbackHubModal })));
const BulkImportModal = lazy(() => import('../common/BulkImportModal').then(m => ({ default: m.BulkImportModal })));
const GuidanceCenterModal = lazy(() => import('../modals/GuidanceCenterModal').then(m => ({ default: m.GuidanceCenterModal })));
const ParentInfoSheetModal = lazy(() => import('../modals/ParentInfoSheetModal').then(m => ({ default: m.ParentInfoSheetModal })));
const LegalTextModal = lazy(() => import('../LegalTextModal').then(m => ({ default: m.LegalTextModal })));
const SchoolDunningPayModal = lazy(() => import('./SchoolDunningPayModal').then(m => ({ default: m.SchoolDunningPayModal })));

export interface SecretaryGeneralModalsHubProps {
  // Common tenant & user
  schoolId: string;
  schoolName: string;
  userId?: string;
  currentUserProfile?: any;
  currentSchoolProfile?: any;
  setCurrentSchoolProfile: (val: any) => void;
  fetchDashboardData: () => Promise<void> | void;
  activeTab: string;
  activePlatform?: string;

  // 1. Legal Text Modal (Terms & Privacy)
  showAgb: boolean;
  setShowAgb: (val: boolean) => void;
  showPrivacy: boolean;
  setShowPrivacy: (val: boolean) => void;

  // 2. School Dunning Pay Modal (EPC-QR)
  showDunningPayModal: boolean;
  setShowDunningPayModal: (val: boolean) => void;
  dunningStatus?: any;
  operatorCompany?: string;
  operatorIban?: string;
  operatorBic?: string;
  setActiveTab: (tab: any) => void;
  setSecretarySubTab: (subTab: any) => void;
  setTrustRefreshToken: (token: number) => void;

  // 3. QR Code Modal (ID Card)
  showOwnQrModal: boolean;
  setShowOwnQrModal: (val: boolean) => void;
  qrModalUser: any;
  setQrModalUser: (user: any) => void;

  // 4. AVV Modal (Art. 28 DSGVO)
  showAvvModal: boolean;
  setShowAvvModal: (val: boolean) => void;
  setIsAvvSigned: (val: boolean) => void;

  // 5. DPO ID Card Modal
  showDpoIdCardModal: boolean;
  setShowDpoIdCardModal: (val: boolean) => void;

  // 6. DPO Audit Portal Modal
  showDpoPortalModal: boolean;
  setShowDpoPortalModal: (val: boolean) => void;

  // 7. Bulk Import Modal
  showBulkImportModal: boolean;
  setShowBulkImportModal: (val: boolean) => void;
  allUniqueTeacherProfiles: any[];

  // 8. Parent Info Sheet Modal
  showParentInfoSheetModal: boolean;
  setShowParentInfoSheetModal: (val: boolean) => void;

  // 9. Guidance Center Modal
  showGuidanceModal: boolean;
  setShowGuidanceModal: (val: boolean) => void;
  guidanceInitialTab?: 'teacher' | 'parent' | 'templates';

  // 10. Feedback Hub Modal
  isFeedbackModalOpen: boolean;
  setIsFeedbackModalOpen: (val: boolean) => void;
}

export const SecretaryGeneralModalsHub: React.FC<SecretaryGeneralModalsHubProps> = ({
  schoolId,
  schoolName,
  userId,
  currentUserProfile,
  currentSchoolProfile,
  setCurrentSchoolProfile,
  fetchDashboardData,
  activeTab,
  activePlatform,

  // 1. Legal Text Modal
  showAgb,
  setShowAgb,
  showPrivacy,
  setShowPrivacy,

  // 2. Dunning Pay Modal
  showDunningPayModal,
  setShowDunningPayModal,
  dunningStatus,
  operatorCompany,
  operatorIban,
  operatorBic,
  setActiveTab,
  setSecretarySubTab,
  setTrustRefreshToken,

  // 3. QR Modal
  showOwnQrModal,
  setShowOwnQrModal,
  qrModalUser,
  setQrModalUser,

  // 4. AVV Modal
  showAvvModal,
  setShowAvvModal,
  setIsAvvSigned,

  // 5. DPO ID Card Modal
  showDpoIdCardModal,
  setShowDpoIdCardModal,

  // 6. DPO Portal Modal
  showDpoPortalModal,
  setShowDpoPortalModal,

  // 7. Bulk Import Modal
  showBulkImportModal,
  setShowBulkImportModal,
  allUniqueTeacherProfiles,

  // 8. Parent Info Sheet Modal
  showParentInfoSheetModal,
  setShowParentInfoSheetModal,

  // 9. Guidance Center Modal
  showGuidanceModal,
  setShowGuidanceModal,
  guidanceInitialTab,

  // 10. Feedback Hub Modal
  isFeedbackModalOpen,
  setIsFeedbackModalOpen
}) => {
  return (
    <>
      {/* Canonical Legal Text Modal (Single Source of Truth) */}
      {(showAgb || showPrivacy) && (
        <Suspense fallback={null}>
          <LegalTextModal
            isOpen={showAgb || showPrivacy}
            onClose={() => {
              setShowAgb(false);
              setShowPrivacy(false);
            }}
            initialTab={showAgb ? 'terms' : 'privacy'}
          />
        </Suspense>
      )}

      {/* Modal: B2B Delinquency EPC-QR Sofortausgleich */}
      {showDunningPayModal && (
        <Suspense fallback={null}>
          <SchoolDunningPayModal
            isOpen={showDunningPayModal}
            onClose={() => setShowDunningPayModal(false)}
            dunningStatus={dunningStatus}
            schoolName={schoolName || currentSchoolProfile?.name || 'Musikschule'}
            operatorCompany={operatorCompany}
            operatorIban={operatorIban}
            operatorBic={operatorBic}
            onGoToLicenses={() => {
              setActiveTab('secretary');
              setSecretarySubTab('licenses');
            }}
            onActivateTrustExtension={() => {
              setTrustRefreshToken(Date.now());
            }}
          />
        </Suspense>
      )}

      {/* Modal: QR Code / Ausweis anzeigen */}
      {(showOwnQrModal || qrModalUser) && (
        <Suspense fallback={null}>
          <QRCodeModal 
            user={qrModalUser || currentUserProfile} 
            activePlatform={qrModalUser ? "campus" : "secretary"} 
            onClose={() => {
              setShowOwnQrModal(false);
              setQrModalUser(null);
            }} 
          />
        </Suspense>
      )}

      {/* AVV Modal gem. Art. 28 DSGVO */}
      {showAvvModal && (
        <Suspense fallback={null}>
          <AVVModal
            isOpen={showAvvModal}
            onClose={() => setShowAvvModal(false)}
            school={currentSchoolProfile || { id: schoolId, name: schoolName || 'Musikschule' }}
            onAVVSigned={() => {
              const nowIso = new Date().toISOString();
              setIsAvvSigned(true);
              if (schoolId) {
                localStorage.setItem(`groovelab_avv_signed_${schoolId}`, nowIso);
              }
              if (currentSchoolProfile?.id) {
                localStorage.setItem(`groovelab_avv_signed_${currentSchoolProfile.id}`, nowIso);
              }
              setCurrentSchoolProfile((prev: any) => ({
                ...(prev || {}),
                avv_signed_at: nowIso
              }));
              fetchDashboardData();
            }}
          />
        </Suspense>
      )}

      {/* DPO ID Card Modal (Art. 38 DSGVO) */}
      {showDpoIdCardModal && (
        <Suspense fallback={null}>
          <DpoIdCardModal
            isOpen={showDpoIdCardModal}
            onClose={() => setShowDpoIdCardModal(false)}
            schoolName={schoolName || 'Stadtmusikschule'}
            schoolId={schoolId}
          />
        </Suspense>
      )}

      {/* DPO Audit Portal Modal */}
      {showDpoPortalModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          background: '#ffffff',
          overflowY: 'auto'
        }}>
          <Suspense fallback={null}>
            <DpoAuditPortal
              onClose={() => setShowDpoPortalModal(false)}
              schoolName={schoolName || 'Stadtmusikschule'}
            />
          </Suspense>
        </div>
      )}

      {/* Smarter CSV/Excel Bulk-Import Modal */}
      {showBulkImportModal && (
        <Suspense fallback={null}>
          <BulkImportModal
            isOpen={showBulkImportModal}
            onClose={() => setShowBulkImportModal(false)}
            schoolId={schoolId}
            schoolName={schoolName || currentSchoolProfile?.name || 'Stadtmusikschule'}
            teachers={allUniqueTeacherProfiles.map((t: any) => ({ id: t.id, name: t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim() }))}
            onImportComplete={() => {
              fetchDashboardData();
            }}
          />
        </Suspense>
      )}

      {/* Personalisierbares Eltern-Informationsblatt (PDF) Modal */}
      {showParentInfoSheetModal && (
        <Suspense fallback={null}>
          <ParentInfoSheetModal
            isOpen={showParentInfoSheetModal}
            onClose={() => setShowParentInfoSheetModal(false)}
            schoolData={{
              name: schoolName || currentSchoolProfile?.name || 'Unsere Musikschule',
              subdomain: currentSchoolProfile?.subdomain || '',
              logo_url: currentSchoolProfile?.logo_url || '',
              city: currentSchoolProfile?.city || '',
              student_billing_option: currentSchoolProfile?.student_billing_option || 'school_all',
              email: currentSchoolProfile?.email || ''
            }}
            activePlatformDefault={activeTab === 'campus' ? 'campus' : activeTab === 'groovelab' ? 'groovelab' : 'both'}
          />
        </Suspense>
      )}

      {/* Interaktives In-App Leitfaden & Eltern-Info Modal */}
      {showGuidanceModal && (
        <Suspense fallback={null}>
          <GuidanceCenterModal
            isOpen={showGuidanceModal}
            onClose={() => setShowGuidanceModal(false)}
            schoolName={schoolName || currentSchoolProfile?.name || 'Stadtmusikschule'}
            schoolSubdomain={currentSchoolProfile?.subdomain}
            activePlatform={activePlatform as any}
            initialTab={guidanceInitialTab}
          />
        </Suspense>
      )}

      {/* Platform-wide Feedback & Ideenschmiede Modal */}
      {isFeedbackModalOpen && (
        <Suspense fallback={null}>
          <FeedbackHubModal
            isOpen={isFeedbackModalOpen}
            onClose={() => setIsFeedbackModalOpen(false)}
            userRole="secretary"
            userId={userId}
            userName={schoolName ? `${schoolName} Verwaltung` : 'Verwaltung'}
            schoolId={currentSchoolProfile?.id || schoolId}
            schoolName={schoolName || currentSchoolProfile?.name}
            activePlatform={activeTab === 'secretary' ? 'admin_desk' : activeTab}
          />
        </Suspense>
      )}
    </>
  );
};
