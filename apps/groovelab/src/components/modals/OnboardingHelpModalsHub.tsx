import React, { Suspense, lazy, useEffect } from 'react';
import type { HelpUserRole, HelpPlatform } from '../help/HelpCenterModal';

// Hermetic lazy imports for optimal Core Web Vitals (LCP/INP)
const QRCodeModal = lazy(() => import('../QRCodeModal').then(m => ({ default: m.QRCodeModal })));
const HelpCenterModal = lazy(() => import('../help/HelpCenterModal').then(m => ({ default: m.HelpCenterModal })));
const TrialInfoModal = lazy(() => import('../TrialInfoModal').then(m => ({ default: m.TrialInfoModal })));
const SchoolSelfOnboardingModal = lazy(() => import('../SchoolSelfOnboardingModal').then(m => ({ default: m.SchoolSelfOnboardingModal })));

export interface OnboardingHelpModalsHubProps {
  user: any;
  school: any;
  activePlatform: string;
  // QR Code Modal
  showQR?: boolean;
  onCloseQR?: () => void;
  // Global Help Center / Akademie
  isHelpCenterOpen?: boolean;
  onCloseHelpCenter?: () => void;
  // Trial & Subscription Status Modal
  showTrialInfo?: boolean;
  onCloseTrialInfo?: () => void;
  trialDaysLeft?: number | null;
  onNavigateToBilling?: () => void;
  // Mobile Quick Status Info Modal
  showMobileInfo?: boolean;
  onCloseMobileInfo?: () => void;
  locationMode?: string;
  stationName?: string;
  // School Onboarding Modal
  showSchoolOnboardingModal?: boolean;
  onCloseSchoolOnboarding?: () => void;
  onSchoolOnboardingSuccess?: (schoolData: any, userData: any) => void;
}

/**
 * Deterministische Ermittlung der Hilfe- und Akademie-Benutzerrolle
 * unter Berücksichtigung von Master-Admin, Dual-Roles und aktiven Workspaces.
 */
function resolveHelpUserRole(user: any): HelpUserRole {
  if (user?.role?.toLowerCase() === 'master_admin') return 'master_admin';
  if (user?.role?.toLowerCase() === 'student') return 'student';

  const activeWs = typeof window !== 'undefined'
    ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace'))
    : null;

  if (activeWs === 'student') return 'student';
  if (activeWs === 'teacher') return 'teacher';
  if (activeWs === 'secretary') return 'secretary';

  if (user?.role?.toLowerCase() === 'teacher') return 'teacher';
  if (user?.role?.toLowerCase() === 'secretary') return 'secretary';
  return (user?.role as HelpUserRole) || 'admin';
}

/**
 * 🧭 OnboardingHelpModalsHub
 * Zentraler Bounded Context Hub für alle Onboarding-, Ausweis-, Leitfaden-,
 * Lizenzstatus- und schnellen System-Info-Modals der Campus-Groovelab Plattform.
 */
export const OnboardingHelpModalsHub: React.FC<OnboardingHelpModalsHubProps> = ({
  user,
  school,
  activePlatform,
  showQR = false,
  onCloseQR,
  isHelpCenterOpen = false,
  onCloseHelpCenter,
  showTrialInfo = false,
  onCloseTrialInfo,
  trialDaysLeft = null,
  onNavigateToBilling,
  showMobileInfo = false,
  onCloseMobileInfo,
  locationMode,
  stationName,
  showSchoolOnboardingModal = false,
  onCloseSchoolOnboarding,
  onSchoolOnboardingSuccess
}) => {
  // ESC-Taste für Mobile Info Modal
  useEffect(() => {
    if (!showMobileInfo || !onCloseMobileInfo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobileInfo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMobileInfo, onCloseMobileInfo]);

  return (
    <>
      {/* 1. Modal: QR-Code / Campus- & GrooveLab-Pass */}
      {showQR && (user?.qr_token || user?.teacher_qr_token) && onCloseQR && (
        <Suspense fallback={null}>
          <QRCodeModal
            user={user}
            activePlatform={activePlatform}
            onClose={onCloseQR}
          />
        </Suspense>
      )}

      {/* 2. Modal: Globales Leitfäden- & Akademie-Center */}
      {isHelpCenterOpen && onCloseHelpCenter && (
        <Suspense fallback={null}>
          <HelpCenterModal
            isOpen={isHelpCenterOpen}
            onClose={onCloseHelpCenter}
            userRole={resolveHelpUserRole(user)}
            activePlatform={activePlatform as HelpPlatform}
            schoolName={school?.name || 'Meine Musikschule'}
          />
        </Suspense>
      )}

      {/* 3. Modal: 30-Tage-Probezeit Status & Lizenz-Upgrade */}
      {showTrialInfo && onCloseTrialInfo && (
        <Suspense fallback={null}>
          <TrialInfoModal
            isOpen={showTrialInfo}
            onClose={onCloseTrialInfo}
            school={school}
            userRole={user?.role}
            trialDaysLeft={trialDaysLeft}
            onNavigateToBilling={onNavigateToBilling}
          />
        </Suspense>
      )}

      {/* 4. Modal: Musikschul-Selbstonboarding */}
      {showSchoolOnboardingModal && onCloseSchoolOnboarding && onSchoolOnboardingSuccess && (
        <Suspense fallback={null}>
          <SchoolSelfOnboardingModal
            onClose={onCloseSchoolOnboarding}
            onSuccess={onSchoolOnboardingSuccess}
          />
        </Suspense>
      )}

      {/* 5. Mobile Info Overlay Modal für konsolidierte Status-Pills */}
      {showMobileInfo && onCloseMobileInfo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Status und Details"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(9, 9, 11, 0.40)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onCloseMobileInfo();
            }
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '24px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 800,
                color: '#09090b',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              Status &amp; Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Musikschule:</span>
                <span style={{ fontSize: '0.85rem', color: '#09090b', fontWeight: 800 }}>
                  {school?.name || 'Meine Musikschule'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Benutzer:</span>
                <span style={{ fontSize: '0.85rem', color: '#09090b', fontWeight: 800 }}>
                  {user?.first_name} {user?.last_name}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Rolle:</span>
                <span style={{ fontSize: '0.85rem', color: '#09090b', fontWeight: 800, textTransform: 'uppercase' }}>
                  {user?.role === 'admin'
                    ? 'Administrator'
                    : user?.role === 'teacher'
                    ? 'Lehrer'
                    : user?.role === 'secretary'
                    ? 'Sekretariat'
                    : 'Schüler'}
                </span>
              </div>
              {school?.is_trial && !school?.subscription_bypass && trialDaysLeft !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Probezeit:</span>
                  <span style={{ fontSize: '0.85rem', color: '#eab308', fontWeight: 800 }}>
                    {trialDaysLeft > 0 ? `${trialDaysLeft} Tage verbleibend` : 'Abgelaufen'}
                  </span>
                </div>
              )}
              {locationMode === 'lab' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Station:</span>
                  <span style={{ fontSize: '0.85rem', color: '#34a853', fontWeight: 800 }}>
                    {stationName || 'Labor iPad'}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={onCloseMobileInfo}
              style={{
                width: '100%',
                minHeight: '44px',
                padding: '12px',
                background:
                  activePlatform === 'campus'
                    ? '#34a853'
                    : activePlatform === 'ensembles'
                    ? '#3b82f6'
                    : '#facc15',
                color: activePlatform === 'groovelab' ? '#09090b' : 'white',
                border: 'none',
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none'
              }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </>
  );
};
