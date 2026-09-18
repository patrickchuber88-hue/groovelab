import React, { Suspense, lazy } from 'react';
import { Clock, Check } from 'lucide-react';

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

  // Inactivity Warning (Pre-Lock Warning Dialog)
  showAutoLockWarning?: boolean;
  autoLockCountdown?: number;
  onContinueSession?: () => void;
  onLogoutWarning?: () => void;

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

  showAutoLockWarning = false,
  autoLockCountdown = 60,
  onContinueSession,
  onLogoutWarning,

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
        <Suspense
          fallback={
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999999,
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            />
          }
        >
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

      {/* 5. Inaktivitätswarnung (Pre-Lock Warning Dialog - OWASP ASVS L3) */}
      {showAutoLockWarning && onContinueSession && onLogoutWarning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Inaktivitätswarnung"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div
            className="glass-panel animation-slide-up"
            style={{
              background: '#ffffff',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '36px',
              borderRadius: '28px',
              maxWidth: '460px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 30px 60px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#fef2f2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
              }}
            >
              <Clock size={32} />
            </div>

            <div>
              <h2
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  color: '#1e293b',
                  margin: '0 0 10px 0',
                  letterSpacing: '-0.02em',
                }}
              >
                Bist du noch da?
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  color: '#64748b',
                  lineHeight: 1.5,
                  fontWeight: 550,
                }}
              >
                Aufgrund von Inaktivität wirst du in{' '}
                <span style={{ color: '#ef4444', fontWeight: 800 }}>
                  {autoLockCountdown} Sekunden
                </span>{' '}
                automatisch abgemeldet.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <button
                type="button"
                onClick={onContinueSession}
                style={{
                  background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '16px 24px',
                  borderRadius: '16px',
                  fontSize: '1rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(52,168,83,0.3)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  minHeight: '44px',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
                className="hover-scale"
              >
                <Check size={20} />
                Ja, weiterüben!
              </button>

              <button
                type="button"
                onClick={onLogoutWarning}
                style={{
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: '16px',
                  fontSize: '0.9rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  width: '100%',
                  minHeight: '44px',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
                className="hover-scale"
              >
                Jetzt abmelden
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
