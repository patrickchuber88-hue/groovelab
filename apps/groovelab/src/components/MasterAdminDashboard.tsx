import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { 
  WifiOff, RotateCcw, CheckCircle, HardDrive, ExternalLink, Eye, Shield 
} from 'lucide-react';

import { useMasterPricing } from '../context/MasterPricingContext';
import { measureDatabasePing, LatencyMetric } from '../utils/latencyMonitor';

// Re-exports for backwards compatibility
export { LOAD_TIERS } from './masterAdmin/MasterAdminTypes';
export type { LoadTier, ServerMetric, MasterAdminPortalTab } from './masterAdmin/MasterAdminTypes';
import type { MasterAdminPortalTab } from './masterAdmin/MasterAdminTypes';

// Sidebar & Layout Components
import { MasterAdminSidebar } from './masterAdmin/MasterAdminSidebar';

// Domain Hooks
import { useMasterAdminSchools } from './masterAdmin/hooks/useMasterAdminSchools';
import { useMasterAdminTelemetry } from './masterAdmin/hooks/useMasterAdminTelemetry';
import { useMasterAdminPricing } from './masterAdmin/hooks/useMasterAdminPricing';
import { useMasterAdminOperator } from './masterAdmin/hooks/useMasterAdminOperator';
import { useMasterAdminIdleLock } from './masterAdmin/hooks/useMasterAdminIdleLock';
import { useMasterAdminModalStates } from './masterAdmin/hooks/useMasterAdminModalStates';
import { useMasterAdminStepUp } from './masterAdmin/hooks/useMasterAdminStepUp';
import { useMasterAdminSecurityShield } from './masterAdmin/hooks/useMasterAdminSecurityShield';

// Tabs
import { ExecutiveTab } from './masterAdmin/tabs/ExecutiveTab';
import { SchoolsTab } from './masterAdmin/tabs/SchoolsTab';
import { ReconciliationTab } from './masterAdmin/tabs/ReconciliationTab';
import { TelemetryTab } from './masterAdmin/tabs/TelemetryTab';
import { PricingTab } from './masterAdmin/tabs/PricingTab';
import { TrustSafetyTab } from './masterAdmin/tabs/TrustSafetyTab';
import { FeedbackTab } from './masterAdmin/tabs/FeedbackTab';
import { MaintenanceTab } from './masterAdmin/tabs/MaintenanceTab';
import { BackupResetTab } from './masterAdmin/tabs/BackupResetTab';
import { OperatorTab } from './masterAdmin/tabs/OperatorTab';

// Consolidated Modals Hub
import { MasterAdminModalsHub } from './masterAdmin/modals/MasterAdminModalsHub';

// Lazy Loaded Components
const BillingDashboard = lazy(() => import('./BillingDashboard').then(m => ({ default: m.BillingDashboard })));
const SchoolDetailDrawer = lazy(() => import('./masterAdmin/drawers/SchoolDetailDrawer').then(m => ({ default: m.SchoolDetailDrawer })));

interface MasterAdminDashboardProps {
  onLogout: () => void;
  currentUser?: any;
}

export function MasterAdminDashboard({ onLogout, currentUser }: MasterAdminDashboardProps) {
  const masterPricing = useMasterPricing();
  const modalStates = useMasterAdminModalStates();
  const [globalFetchError, setGlobalFetchError] = useState<string | null>(null);
  const [dbLatency, setDbLatency] = useState<LatencyMetric>({ rttMs: 18, quality: 'EXCELLENT', timestamp: Date.now() });

  // 1. Telemetry Domain Hook
  const telemetry = useMasterAdminTelemetry();

  // 2. Schools Domain Hook
  const schools = useMasterAdminSchools({
    onNotify: modalStates.showToast,
    onRefreshMetrics: telemetry.fetchServerMetrics,
  });

  // 3. Pricing Domain Hook
  const pricing = useMasterAdminPricing({
    onNotify: modalStates.showToast,
    schools: schools.schools,
    schoolStats: schools.schoolStats,
  });

  // 4. Operator Domain Hook
  const operator = useMasterAdminOperator({
    currentUser,
    onNotify: modalStates.showToast,
  });

  // 5. Idle Lock Watchdog Hook (15-min fail-closed lock)
  const idleLock = useMasterAdminIdleLock({
    currentUser,
    adminUsername: operator.adminUsername,
    adminUserId: operator.adminUser?.id,
  });

  // 6. JIT Step-Up Authentication Hook
  const stepUp = useMasterAdminStepUp();

  // 7. Client-Side Runtime Integrity Guard
  const securityShield = useMasterAdminSecurityShield();

  // Tab State
  const [activePortalTab, setActivePortalTabRaw] = useState<MasterAdminPortalTab>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('cg_master_active_portal_tab');
        const validTabs: MasterAdminPortalTab[] = [
          'executive', 'schools', 'briefing', 'billing', 'telemetry', 
          'pricing', 'trust_safety', 'operator', 'maintenance', 'backup', 'feedback'
        ];
        if (saved && validTabs.includes(saved as MasterAdminPortalTab)) {
          return saved as MasterAdminPortalTab;
        }
      } catch (e) {
        console.warn('Storage operation failed in activePortalTab init:', e);
      }
    }
    return 'executive';
  });

  const setActivePortalTab = useCallback((newTab: MasterAdminPortalTab) => {
    setActivePortalTabRaw(newTab);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('cg_master_active_portal_tab', newTab);
      } catch (e) {
        console.warn('Storage operation failed in setActivePortalTab:', e);
      }
    }
  }, []);

  // Cmd+K Palette Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        modalStates.setCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        modalStates.setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalStates]);

  // Periodic Latency Ping
  useEffect(() => {
    measureDatabasePing().then(setDbLatency).catch(() => {});
    const pingInterval = setInterval(() => {
      measureDatabasePing().then(setDbLatency).catch(() => {});
    }, 15000);
    return () => clearInterval(pingInterval);
  }, []);

  // Global Maintenance Detection
  const isGlobalMaintenanceActive = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const localMaint = localStorage.getItem('cg_master_maintenance_state');
        if (localMaint) {
          try {
            if (JSON.parse(localMaint)?.isActive) return true;
          } catch {}
        }
        const localAnnounce = localStorage.getItem('cg_master_broadcast_announcement');
        if (localAnnounce) {
          try {
            const parsed = JSON.parse(localAnnounce);
            if (parsed?.isActive && (parsed?.type === 'maintenance' || parsed?.severity === 'emergency' || parsed?.title?.toLowerCase().includes('wartung'))) {
              return true;
            }
          } catch {}
        }
      } catch (e) {
        console.warn('Storage operation failed in isGlobalMaintenanceActive:', e);
      }
    }
    if (pricing.specialOffers && Array.isArray(pricing.specialOffers)) {
      const m = pricing.specialOffers.find((o: any) => o?.id === '__cg_master_maintenance_state__') as any;
      if (m?.state?.isActive) return true;
      const a = pricing.specialOffers.find((o: any) => o?.id === '__cg_master_broadcast_announcement__') as any;
      if (a?.state?.isActive && (a?.state?.type === 'maintenance' || a?.state?.severity === 'emergency' || a?.state?.title?.toLowerCase().includes('wartung'))) {
        return true;
      }
    }
    return false;
  }, [pricing.specialOffers]);

  const pendingStorageSchools = useMemo(() => (schools.schools || []).filter((s: any) => 
    s && 
    !s.name?.toLowerCase().includes('groove academy') && 
    (s.storage_addon_status === 'pending_activation' || 
     s.storage_addon_status === 'pending_provisioning' || 
     s.storage_addon_status === 'pending_hetzner' || 
     (s.storage_addon_pending_gb && Number(s.storage_addon_pending_gb) > 0))
  ), [schools.schools]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 0%, #fcfdfe 0%, #f3f6fa 50%, #e9edf5 100%)',
      color: '#1e293b',
      fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
      padding: '0',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Background Decorative Blobs */}
      <div style={{
        position: 'fixed',
        top: '-10%',
        right: '-10%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-10%',
        left: '-10%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(234, 179, 8, 0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Main Container Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '290px 1fr',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Left Premium Sidebar */}
        <MasterAdminSidebar
          activePortalTab={activePortalTab}
          setActivePortalTab={setActivePortalTab}
          onOpenCommandPalette={() => modalStates.setCommandPaletteOpen(true)}
          onOpenAkademie={() => modalStates.setIsAkademieOpen(true)}
          onLogout={onLogout}
          adminUsername={operator.adminUsername}
          pendingUsersCount={schools.pendingUsers.length}
          isGlobalMaintenanceActive={isGlobalMaintenanceActive}
          pendingStorageCount={pendingStorageSchools.length}
        />

        {/* Right Workspace Area */}
        <div style={{
          padding: '44px 54px',
          overflowY: 'auto',
          height: '100vh',
          boxSizing: 'border-box',
          position: 'relative'
        }}>
          {/* Security Shield Tamper Banner */}
          {securityShield.integrityCompromised && (
            <div style={{
              background: '#fef2f2',
              border: '2px solid #ef4444',
              borderRadius: '16px',
              padding: '16px 20px',
              color: '#b91c1c',
              marginBottom: '24px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 16px rgba(220, 38, 38, 0.1)'
            }}>
              <Shield size={24} color="#dc2626" />
              <div>
                <div style={{ fontSize: '0.90rem' }}>⚠️ SICHERHEITS-INTEGRITÄTSWARNUNG</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '2px' }}>{securityShield.integrityReason}</div>
              </div>
            </div>
          )}

          {/* DOM Zeroing: Arbeitsspeicher- und DOM-Bereinigung im gesperrten Zustand */}
          {idleLock.isIdleLocked ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '75vh',
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <Shield size={30} color="#64748b" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#475569', margin: '0 0 6px 0' }}>
                Leitstand geschützt &amp; im Ruhezustand
              </h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '360px', margin: 0, lineHeight: 1.5 }}>
                Vertrauliche Arbeitsdaten wurden aus dem DOM und Arbeitsspeicher entfernt. Entsperren Sie über Touch ID oder Google Authenticator.
              </p>
            </div>
          ) : (
            <>
              {/* Offline / Server Error Banner */}
              {globalFetchError && (
                <div style={{
                  background: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  borderRadius: '20px',
                  padding: '16px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                  marginBottom: '24px',
                  boxShadow: '0 4px 20px rgba(245, 158, 11, 0.08)'
                }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '13px',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <WifiOff size={20} color="#0f172a" />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                    Server-Verbindung eingeschränkt ({globalFetchError})
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                    Die Verbindung zum Hetzner Server / Supabase Cluster ist temporär unterbrochen.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setGlobalFetchError(null); schools.fetchSchoolsAndStats(); }}
                disabled={schools.loading}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  padding: '9px 18px',
                  borderRadius: '12px',
                  fontSize: '0.82rem',
                  fontWeight: 850,
                  cursor: schools.loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px'
                }}
              >
                <RotateCcw size={14} className={schools.loading ? 'animate-spin' : ''} color="#0f172a" />
                <span>{schools.loading ? 'Verbinde...' : 'Erneut verbinden'}</span>
              </button>
            </div>
          )}

          {/* Maintenance Status Pill & DB Ping */}
          {activePortalTab !== 'executive' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setActivePortalTab('maintenance')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isGlobalMaintenanceActive ? '#fee2e2' : '#ecfdf5',
                  border: `1px solid ${isGlobalMaintenanceActive ? '#fca5a5' : '#86efac'}`,
                  color: isGlobalMaintenanceActive ? '#dc2626' : '#15803d',
                  padding: '6px 14px',
                  borderRadius: '100px',
                  fontSize: '0.78rem',
                  fontWeight: 850,
                  cursor: 'pointer'
                }}
              >
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isGlobalMaintenanceActive ? '#dc2626' : '#10b981'
                }} />
                <span>{isGlobalMaintenanceActive ? 'Wartungsmodus Aktiv' : 'System-Status: Normal & Online'}</span>
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '100px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '0.74rem',
                fontWeight: 800,
                color: dbLatency.quality === 'POOR' ? '#dc2626' : (dbLatency.quality === 'FAIR' ? '#d97706' : '#15803d')
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: dbLatency.quality === 'POOR' ? '#dc2626' : (dbLatency.quality === 'FAIR' ? '#d97706' : '#16a34a')
                }} />
                <span>DB-Ping: {dbLatency.rttMs} ms (Hetzner EU)</span>
              </div>

              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                Campus-Groovelab Enterprise Leitstand
              </div>
            </div>
          )}

          {/* Active Ghost Mode Support Session Banner */}
          {schools.activeGhostSession && (
            <div style={{
              background: '#0f172a',
              color: '#ffffff',
              padding: '14px 22px',
              borderRadius: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <Shield size={20} color="#ffffff" />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800 }}>Support-Sitzung aktiv (Ghost-Mode)</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Autorisierter Master-Zugriff auf: <strong style={{ color: '#ffffff' }}>{schools.activeGhostSession.schoolName}</strong>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/?school_id=${schools.activeGhostSession.schoolId}&support_ghost=true`;
                    window.location.href = url;
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Eye size={13} /> Schulumgebung öffnen
                </button>
                <button
                  type="button"
                  onClick={schools.handleStopGhostMode}
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.80rem',
                    cursor: 'pointer'
                  }}
                >
                  Sitzung beenden
                </button>
              </div>
            </div>
          )}

          {/* Success Toast */}
          {modalStates.saveSuccessToast && (
            <div style={{
              position: 'fixed',
              top: '24px',
              right: '28px',
              zIndex: 99999,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              padding: '14px 22px',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(5, 150, 105, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.90rem',
              fontWeight: 800
            }}>
              <CheckCircle size={20} color="#ffffff" />
              <span>{modalStates.saveSuccessToast}</span>
            </div>
          )}

          {/* Pending Hetzner Storage Provisioning Banner */}
          {pendingStorageSchools.length > 0 && activePortalTab !== 'executive' && (
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '1.5px solid #f59e0b',
              borderRadius: '16px',
              padding: '14px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <HardDrive size={18} color="#0f172a" />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#78350f' }}>
                    {pendingStorageSchools.length} Hetzner Audio-Tresor Bereitstellung{pendingStorageSchools.length > 1 ? 'en' : ''} ausstehend
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#92400e', fontWeight: 600 }}>
                    {pendingStorageSchools.map(s => `${s.name} (+${s.storage_addon_pending_gb || 10} GB)`).join(', ')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.open('https://console.hetzner.cloud/projects', '_blank')}
                style={{
                  background: '#ffffff',
                  border: '1px solid #d97706',
                  color: '#92400e',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ExternalLink size={12} /> console.hetzner.cloud ↗
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB CONTENT PANELS                                                  */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activePortalTab === 'executive' && (
            <div role="tabpanel" id="master-panel-executive" aria-labelledby="master-tab-executive" tabIndex={0}>
              <ExecutiveTab
                schools={schools.schools}
                schoolStats={schools.schoolStats}
                loading={schools.loading}
                serverMetrics={telemetry.serverMetrics}
                pendingUsers={schools.pendingUsers}
                masterPricing={masterPricing}
                onRefresh={schools.fetchSchoolsAndStats}
                onOpenCommandPalette={() => modalStates.setCommandPaletteOpen(true)}
                onNavigateTab={(tab) => setActivePortalTab(tab as MasterAdminPortalTab)}
                onSelectSchool={(s) => schools.setSelectedSchool(s)}
              />
            </div>
          )}

          {activePortalTab === 'schools' && (
            <div role="tabpanel" id="master-panel-schools" aria-labelledby="master-tab-schools" tabIndex={0}>
              <SchoolsTab
                schools={schools.schools}
                schoolStats={schools.schoolStats}
                loading={schools.loading}
                masterPricing={masterPricing}
                onRefresh={schools.fetchSchoolsAndStats}
                onSelectSchool={(s) => schools.setSelectedSchool(s)}
                onStartGhostMode={(s) => schools.setGhostGateSchool(s)}
                onDeleteSchool={(s) => schools.setArchiveModalSchool(s)}
                onToggleSchoolStatus={schools.handleToggleSchoolStatus}
                onProvisionSchool={schools.handleProvisionSchool}
                onUpdateOperatorNotes={schools.handleUpdateOperatorNotes}
                onExtendTrial={schools.handleExtendTrial}
              />
            </div>
          )}

          {activePortalTab === 'briefing' && (
            <div role="tabpanel" id="master-panel-briefing" aria-labelledby="master-tab-briefing" tabIndex={0}>
              <ReconciliationTab
                pendingUsers={schools.pendingUsers}
                schools={schools.schools}
                masterPricing={masterPricing}
                loadingPending={schools.loadingPending}
                onRefresh={schools.fetchPendingUsers}
                onBatchActivate={schools.handleBatchActivateUsers}
                onSingleActivate={schools.handleActivateUser}
              />
            </div>
          )}

          {activePortalTab === 'billing' && (
            <div role="tabpanel" id="master-panel-billing" aria-labelledby="master-tab-billing" tabIndex={0}>
              <Suspense fallback={<div className="p-8 text-center text-slate-400 font-medium">Lade Abrechnungs-Zentrale...</div>}>
                <BillingDashboard />
              </Suspense>
            </div>
          )}

          {activePortalTab === 'telemetry' && (
            <div role="tabpanel" id="master-panel-telemetry" aria-labelledby="master-tab-telemetry" tabIndex={0}>
              <TelemetryTab
                serverMetrics={telemetry.serverMetrics}
                fetchingMetrics={telemetry.fetchingMetrics}
                telemetryCountdown={telemetry.telemetryCountdown}
                apiLatencyMs={telemetry.apiLatencyMs}
                onRefresh={telemetry.fetchServerMetrics}
              />
            </div>
          )}

          {activePortalTab === 'pricing' && (
            <div role="tabpanel" id="master-panel-pricing" aria-labelledby="master-tab-pricing" tabIndex={0}>
              <PricingTab
                activeCurrency={pricing.activeCurrency}
                setActiveCurrency={pricing.setActiveCurrency}
                liveKpiStats={pricing.liveKpiStats}
                priceCampus={pricing.priceCampus}
                setPriceCampus={pricing.setPriceCampus}
                priceGroovelab={pricing.priceGroovelab}
                setPriceGroovelab={pricing.setPriceGroovelab}
                priceKombi={pricing.priceKombi}
                setPriceKombi={pricing.setPriceKombi}
                priceTeacher={pricing.priceTeacher}
                setPriceTeacher={pricing.setPriceTeacher}
                priceStudent={pricing.priceStudent}
                setPriceStudent={pricing.setPriceStudent}
                pricePassiveStudent={pricing.pricePassiveStudent}
                setPricePassiveStudent={pricing.setPricePassiveStudent}
                priceStorageAddon={pricing.priceStorageAddon}
                setPriceStorageAddon={pricing.setPriceStorageAddon}
                defaultTrialDays={pricing.defaultTrialDays}
                setDefaultTrialDays={pricing.setDefaultTrialDays}
                priceChangeScope={pricing.priceChangeScope}
                setPriceChangeScope={pricing.setPriceChangeScope}
                priceEffectiveDate={pricing.priceEffectiveDate}
                setPriceEffectiveDate={pricing.setPriceEffectiveDate}
                priceChangeReason={pricing.priceChangeReason}
                setPriceChangeReason={pricing.setPriceChangeReason}
                storageTiersList={pricing.storageTiersList}
                setStorageTiersList={pricing.setStorageTiersList}
                specialOffers={pricing.specialOffers}
                setSpecialOffers={pricing.setSpecialOffers}
                pricingAuditLogs={pricing.pricingAuditLogs}
                pricingSaving={pricing.pricingSaving}
                onSavePricing={pricing.handleSavePricing}
                onSaveCampaigns={pricing.handleSaveCampaigns}
                onOpenLegalNoticeModal={() => modalStates.setShowLegalNoticeModal(true)}
                schools={schools.schools}
                schoolStats={schools.schoolStats}
              />
            </div>
          )}

          {activePortalTab === 'trust_safety' && (
            <div role="tabpanel" id="master-panel-trust-safety" aria-labelledby="master-tab-trust_safety" tabIndex={0}>
              <TrustSafetyTab />
            </div>
          )}

          {activePortalTab === 'feedback' && (
            <div role="tabpanel" id="master-panel-feedback" aria-labelledby="master-tab-feedback" tabIndex={0}>
              <FeedbackTab />
            </div>
          )}

          {activePortalTab === 'maintenance' && (
            <div role="tabpanel" id="master-panel-maintenance" aria-labelledby="master-tab-maintenance" tabIndex={0}>
              <MaintenanceTab
                schools={schools.schools}
                saveSuccessToast={modalStates.saveSuccessToast}
                setSaveSuccessToast={modalStates.setSaveSuccessToast}
              />
            </div>
          )}

          {activePortalTab === 'backup' && (
            <div role="tabpanel" id="master-panel-backup" aria-labelledby="master-tab-backup" tabIndex={0}>
              <BackupResetTab
                schools={schools.schools}
                onRefreshSchools={schools.fetchSchoolsAndStats}
              />
            </div>
          )}

          {activePortalTab === 'operator' && (
            <div role="tabpanel" id="master-panel-operator" aria-labelledby="master-tab-operator" tabIndex={0}>
              <OperatorTab
                billingCompany={operator.billingCompany}
                setBillingCompany={operator.setBillingCompany}
                billingContact={operator.billingContact}
                setBillingContact={operator.setBillingContact}
                billingStreet={operator.billingStreet}
                setBillingStreet={operator.setBillingStreet}
                billingZip={operator.billingZip}
                setBillingZip={operator.setBillingZip}
                billingCity={operator.billingCity}
                setBillingCity={operator.setBillingCity}
                billingIban={operator.billingIban}
                setBillingIban={operator.setBillingIban}
                billingBic={operator.billingBic}
                setBillingBic={operator.setBillingBic}
                taxMode={operator.taxMode}
                setTaxMode={operator.setTaxMode}
                vatId={operator.vatId}
                setVatId={operator.setVatId}
                taxNumber={operator.taxNumber}
                setTaxNumber={operator.setTaxNumber}
                vatRatePercent={operator.vatRatePercent}
                setVatRatePercent={operator.setVatRatePercent}
                priceDisplayMode={operator.priceDisplayMode}
                setPriceDisplayMode={operator.setPriceDisplayMode}
                grandfatheringActive={operator.grandfatheringActive}
                setGrandfatheringActive={operator.setGrandfatheringActive}
                grandfatheringCutoffDate={operator.grandfatheringCutoffDate}
                setGrandfatheringCutoffDate={operator.setGrandfatheringCutoffDate}
                updatingBilling={operator.updatingBilling}
                onUpdateBillingSettings={operator.handleUpdateBillingSettings}
                adminUsername={operator.adminUsername}
                setAdminUsername={operator.setAdminUsername}
                updatingAdmin={operator.updatingAdmin}
                onUpdateAdminCredentials={operator.handleUpdateAdminCredentials}
                twoFactorEnabled={operator.twoFactorEnabled}
                twoFactorSecret={operator.twoFactorSecret}
                showTwoFactorModal={operator.showTwoFactorModal}
                setShowTwoFactorModal={operator.setShowTwoFactorModal}
                twoFactorCodeInput={operator.twoFactorCodeInput}
                setTwoFactorCodeInput={operator.setTwoFactorCodeInput}
                onToggleTwoFactor={operator.handleToggleTwoFactor}
                onConfirmTwoFactor={operator.handleConfirmTwoFactor}
                masterPasskeyActive={operator.masterPasskeyActive}
                onRegisterPasskey={operator.handleRegisterPasskey}
                recoveryCodes={operator.recoveryCodes}
                showRecoveryModal={operator.showRecoveryModal}
                setShowRecoveryModal={operator.setShowRecoveryModal}
                generatingRecovery={operator.generatingRecovery}
                onGenerateRecoveryCodes={operator.handleGenerateRecoveryCodes}
                showGiroCodeModal={operator.showGiroCodeModal}
                setShowGiroCodeModal={operator.setShowGiroCodeModal}
              />
            </div>
          )}
          </>
        )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* DRAWERS & MODALS                                                    */}
          {/* ═══════════════════════════════════════════════════════════════════ */}

          {/* 360° Tenant Detail Drawer */}
          {schools.selectedSchool && (
            <Suspense fallback={<div className="p-8 text-center text-slate-400 font-medium">Lade Mandanten-Details...</div>}>
              <SchoolDetailDrawer
                school={schools.selectedSchool}
                schoolStats={schools.schoolStats[schools.selectedSchool.id]}
                masterPricing={masterPricing}
                operatorCompany={operator.billingCompany}
                onClose={() => schools.setSelectedSchool(null)}
                onUpdateSchool={schools.handleUpdateSchool}
                onStartGhostMode={(s) => schools.setGhostGateSchool(s)}
                onDeleteSchool={(s) => schools.setArchiveModalSchool(s)}
                onTogglePause={(s) => schools.handleToggleSchoolStatus(s, s.status === 'suspended' ? 'active' : 'suspended')}
              />
            </Suspense>
          )}

          {/* Consolidated Modals Hub with JIT Step-Up Verification */}
          <MasterAdminModalsHub
            schools={schools}
            pricing={pricing}
            operator={operator}
            idleLock={idleLock}
            modalStates={modalStates}
            stepUp={stepUp}
            activePortalTab={activePortalTab}
            setActivePortalTab={setActivePortalTab}
            onLogout={onLogout}
          />
        </div>
      </div>
    </div>
  );
}
