import React, { Suspense, lazy } from 'react';

const AdminSecuritySuiteModal = lazy(() => import('../AdminSecuritySuiteModal').then(m => ({ default: m.AdminSecuritySuiteModal })));
const QuarterlyAccessReportModal = lazy(() => import('../ui/QuarterlyAccessReportModal').then(m => ({ default: m.QuarterlyAccessReportModal })));
const SessionLockModal = lazy(() => import('../ui/SessionLockModal').then(m => ({ default: m.SessionLockModal })));
const CampusPinUnlockModal = lazy(() => import('../CampusPinUnlockModal').then(m => ({ default: m.CampusPinUnlockModal })));

export interface SecurityAuthModalsHubProps {
  user: any;
  school: any;
  schoolUsers?: any[];
  supabase: any;
  activePlatform: string;

  // Admin Security Suite & Quarterly Report
  showAdminSecuritySuiteModal: boolean;
  onCloseAdminSecuritySuite: () => void;
  showQuarterlyAccessReportModal: boolean;
  onOpenQuarterlyAccessReport: () => void;
  onCloseQuarterlyAccessReport: () => void;

  // Inactivity Session Lock
  isScreenLockedByInactivity: boolean;
  onUnlockSession: () => void;
  onLogoutSession: () => void;

  // Campus PIN Prompt
  showCampusPinPrompt: boolean;
  onCloseCampusPinPrompt: () => void;
  onUnlockCampusPin: () => void;
}

/**
 * 🛡️ SecurityAuthModalsHub (Monolith Goldstandard Hub)
 * Kapselt alle sicherheits- und sitzungsrelevanten Dialoge (Admin-Security-Suite,
 * DPO-Quartalsbericht, 45-Minuten Inaktivitätssperre, Campus PIN Unlock)
 * nach OWASP ASVS Level 3.
 */
export const SecurityAuthModalsHub: React.FC<SecurityAuthModalsHubProps> = ({
  user,
  school,
  schoolUsers = [],
  supabase,
  activePlatform,

  showAdminSecuritySuiteModal,
  onCloseAdminSecuritySuite,
  showQuarterlyAccessReportModal,
  onOpenQuarterlyAccessReport,
  onCloseQuarterlyAccessReport,

  isScreenLockedByInactivity,
  onUnlockSession,
  onLogoutSession,

  showCampusPinPrompt,
  onCloseCampusPinPrompt,
  onUnlockCampusPin,
}) => {
  const effectiveSchoolId = school?.id || user?.school_id || (Array.isArray(user?.schools) ? user?.schools[0]?.id : user?.schools?.id);
  const effectiveSchool = school || (Array.isArray(user?.schools) ? user?.schools[0] : user?.schools);

  return (
    <>
      {/* 1. Admin Forensik & Security Suite Modal */}
      {showAdminSecuritySuiteModal && effectiveSchoolId && (
        <Suspense fallback={null}>
          <AdminSecuritySuiteModal
            schoolId={effectiveSchoolId}
            onClose={onCloseAdminSecuritySuite}
            onOpenAccessReport={onOpenQuarterlyAccessReport}
          />
        </Suspense>
      )}

      {/* 2. DPO / DSGVO Quartals-Zugriffsbericht */}
      {showQuarterlyAccessReportModal && (
        <Suspense fallback={null}>
          <QuarterlyAccessReportModal
            school={effectiveSchool}
            schoolUsers={schoolUsers}
            onClose={onCloseQuarterlyAccessReport}
          />
        </Suspense>
      )}

      {/* 3. Universal 45-Minute Inactivity Screen Lock (OWASP ASVS L3) */}
      {isScreenLockedByInactivity && (
        <Suspense fallback={null}>
          <SessionLockModal
            user={user}
            supabase={supabase}
            schoolData={school}
            activePlatform={activePlatform}
            onUnlock={onUnlockSession}
            onLogout={onLogoutSession}
          />
        </Suspense>
      )}

      {/* 4. Campus PIN Unlock Prompt */}
      {showCampusPinPrompt && (
        <Suspense fallback={null}>
          <CampusPinUnlockModal
            user={user}
            supabase={supabase}
            schoolData={school}
            onUnlock={onUnlockCampusPin}
            onClose={onCloseCampusPinPrompt}
          />
        </Suspense>
      )}
    </>
  );
};
