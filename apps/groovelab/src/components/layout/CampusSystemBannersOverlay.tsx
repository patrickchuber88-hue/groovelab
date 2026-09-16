import React, { lazy, Suspense } from 'react';
import { Clock } from 'lucide-react';
import { OfflineSyncIndicator } from '../ui/OfflineSyncIndicator';
import { OfflineStatusBadge } from '../ui/OfflineStatusBadge';
import { PrivacyShieldOverlay } from '../ui/PrivacyShieldOverlay';

const GhostSupportCapsule = lazy(() => import('../masterAdmin/GhostSupportCapsule').then(m => ({ default: m.GhostSupportCapsule })));
const MaintenanceLockoutOverlay = lazy(() => import('../MaintenanceLockoutOverlay').then(m => ({ default: m.MaintenanceLockoutOverlay })));
const GlobalBroadcastBanner = lazy(() => import('../GlobalBroadcastBanner').then(m => ({ default: m.GlobalBroadcastBanner })));
const PwaUpdateToast = lazy(() => import('../ui/PwaUpdateToast').then(m => ({ default: m.PwaUpdateToast })));

export interface CampusSystemBannersOverlayProps {
  isGhostParam: boolean;
  user: any;
  handleSwitchActiveRole: (role: string) => void;
  isMaintenanceLockoutActive: boolean;
  maintenanceState: any;
  setMaintenanceBypass: (val: boolean) => void;
  school: any;
  activePlatform: string;
  broadcastAnnouncement: any;
  isShielded: boolean;
  dismissShield: () => void;
  trialDaysLeft: number | null;
  setShowTrialInfoModal: (val: boolean) => void;
  showPwaUpdateToast: boolean;
  setShowPwaUpdateToast: (val: boolean) => void;
}

/**
 * 🏛️ Komponente: CampusSystemBannersOverlay
 * Bounded Context für systemweite Banner, Overlays, Notfall-Wartung, Ghost-Support & Privacy Shield.
 */
export const CampusSystemBannersOverlay: React.FC<CampusSystemBannersOverlayProps> = ({
  isGhostParam,
  user,
  handleSwitchActiveRole,
  isMaintenanceLockoutActive,
  maintenanceState,
  setMaintenanceBypass,
  school,
  activePlatform,
  broadcastAnnouncement,
  isShielded,
  dismissShield,
  trialDaysLeft,
  setShowTrialInfoModal,
  showPwaUpdateToast,
  setShowPwaUpdateToast
}) => {
  return (
    <>
      {isGhostParam && (
        <GhostSupportCapsule 
          schoolName={user?.schools?.name || (Array.isArray(user?.schools) ? user.schools[0]?.name : undefined)} 
          currentRole={user?.role}
          onRoleChange={handleSwitchActiveRole}
        />
      )}
      {isMaintenanceLockoutActive && maintenanceState && (
        <Suspense fallback={null}>
          <MaintenanceLockoutOverlay 
            maintenanceState={maintenanceState} 
            onBypassUnlocked={() => setMaintenanceBypass(true)} 
            currentRole={user?.role}
            currentSchoolId={school?.id}
            activePlatform={activePlatform}
          />
        </Suspense>
      )}
      {broadcastAnnouncement && (
        <Suspense fallback={null}>
          <GlobalBroadcastBanner 
            announcement={broadcastAnnouncement} 
            currentRole={user?.role} 
            activePlatform={activePlatform}
            currentSchoolId={school?.id}
          />
        </Suspense>
      )}
      <OfflineSyncIndicator />
      <PrivacyShieldOverlay 
        isActive={isShielded} 
        onUnlock={dismissShield} 
        schoolName={user?.schools?.name || (Array.isArray(user?.schools) ? user.schools[0]?.name : undefined)} 
      />
      {/* Soft Trial Pre-Expiry Warning Banner for Admin/Secretary (Days 27-30) */}
      {(user?.role === 'admin' || user?.role === 'secretary') && school?.is_trial && !school?.subscription_bypass && trialDaysLeft !== null && trialDaysLeft <= 3 && trialDaysLeft > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)',
          borderBottom: '1px solid #fde68a',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          zIndex: 999
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={16} color="#b45309" />
            <span style={{ fontSize: '0.84rem', fontWeight: 650, color: '#92400e' }}>
              Hinweis: Die 30-tägige Probezeit Ihrer Musikschule endet in <strong>{trialDaysLeft} {trialDaysLeft === 1 ? 'Tag' : 'Tagen'}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTrialInfoModal(true)}
            style={{
              padding: '6px 14px',
              borderRadius: '10px',
              background: '#b45309',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(180, 83, 9, 0.2)'
            }}
          >
            Jetzt ansehen &amp; freischalten
          </button>
        </div>
      )}
      {showPwaUpdateToast && (
        <Suspense fallback={null}>
          <PwaUpdateToast 
            onUpdate={async () => {
              try {
                if ('caches' in window) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map(k => caches.delete(k)));
                }
                if ('serviceWorker' in navigator) {
                  const reg = await navigator.serviceWorker.getRegistration();
                  if (reg && reg.waiting) {
                    reg.waiting.postMessage({ action: 'skipWaiting' });
                  }
                }
              } catch {}
              window.location.replace('/?v=' + Date.now());
            }}
            onDismiss={() => setShowPwaUpdateToast(false)}
          />
        </Suspense>
      )}
      <OfflineStatusBadge />
    </>
  );
};
