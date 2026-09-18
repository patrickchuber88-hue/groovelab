import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { 
  Shield, Activity, Layers, CreditCard, Receipt, Cpu, Tag, ShieldAlert, 
  Lightbulb, Wrench, Database, Building2, BookOpen, LogOut, Search, 
  WifiOff, RotateCcw, CheckCircle, HardDrive, ExternalLink, Eye 
} from 'lucide-react';

import { useMasterPricing } from '../context/MasterPricingContext';
import { measureDatabasePing, LatencyMetric } from '../utils/latencyMonitor';

// Re-exports for backwards compatibility
export { LOAD_TIERS } from './masterAdmin/MasterAdminTypes';
export type { LoadTier, ServerMetric } from './masterAdmin/MasterAdminTypes';
import type { School } from './masterAdmin/MasterAdminTypes';

// Domain Hooks
import { useMasterAdminSchools } from './masterAdmin/hooks/useMasterAdminSchools';
import { useMasterAdminTelemetry } from './masterAdmin/hooks/useMasterAdminTelemetry';
import { useMasterAdminPricing } from './masterAdmin/hooks/useMasterAdminPricing';
import { useMasterAdminOperator } from './masterAdmin/hooks/useMasterAdminOperator';
import { useMasterAdminIdleLock } from './masterAdmin/hooks/useMasterAdminIdleLock';

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

// Modals
import { GhostGateModal } from './masterAdmin/modals/GhostGateModal';
import { SchoolArchiveModal } from './masterAdmin/modals/SchoolArchiveModal';
import { MasterCommandPaletteModal } from './masterAdmin/modals/MasterCommandPaletteModal';
import { ExecutiveMonthlyReportModal } from './masterAdmin/modals/ExecutiveMonthlyReportModal';
import { PricingLegalNoticeModal } from './masterAdmin/modals/PricingLegalNoticeModal';
import { MasterIdleLockModal } from './masterAdmin/modals/MasterIdleLockModal';

// Lazy Loaded Components
const BillingDashboard = lazy(() => import('./BillingDashboard').then(m => ({ default: m.BillingDashboard })));
const SchoolDetailDrawer = lazy(() => import('./masterAdmin/drawers/SchoolDetailDrawer').then(m => ({ default: m.SchoolDetailDrawer })));
const HelpCenterModal = lazy(() => import('./help/HelpCenterModal').then(m => ({ default: m.HelpCenterModal })));

export type MasterAdminPortalTab = 
  | 'executive' 
  | 'schools' 
  | 'briefing' 
  | 'billing' 
  | 'telemetry' 
  | 'pricing' 
  | 'trust_safety' 
  | 'operator' 
  | 'maintenance' 
  | 'backup' 
  | 'feedback';

interface MasterAdminDashboardProps {
  onLogout: () => void;
  currentUser?: any;
}

export function MasterAdminDashboard({ onLogout, currentUser }: MasterAdminDashboardProps) {
  const masterPricing = useMasterPricing();
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);
  const [globalFetchError, setGlobalFetchError] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [isAkademieOpen, setIsAkademieOpen] = useState(false);
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState(false);
  const [showLegalNoticeModal, setShowLegalNoticeModal] = useState(false);
  const [selectedReportMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [dbLatency, setDbLatency] = useState<LatencyMetric>({ rttMs: 18, quality: 'EXCELLENT', timestamp: Date.now() });

  const showToast = useCallback((msg: string) => {
    setSaveSuccessToast(msg);
    setTimeout(() => setSaveSuccessToast(null), 3500);
  }, []);

  // 1. Telemetry Domain Hook
  const telemetry = useMasterAdminTelemetry();

  // 2. Schools Domain Hook
  const schools = useMasterAdminSchools({
    onNotify: showToast,
    onRefreshMetrics: telemetry.fetchServerMetrics,
  });

  // 3. Pricing Domain Hook
  const pricing = useMasterAdminPricing({
    onNotify: showToast,
  });

  // 4. Operator Domain Hook
  const operator = useMasterAdminOperator({
    currentUser,
    onNotify: showToast,
  });

  // 5. Idle Lock Watchdog Hook (15-min fail-closed lock)
  const idleLock = useMasterAdminIdleLock({
    currentUser,
    adminUsername: operator.adminUsername,
    adminUserId: operator.adminUser?.id,
  });

  // Tab State
  const [activePortalTab, setActivePortalTabRaw] = useState<MasterAdminPortalTab>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('cg_master_active_portal_tab');
      const validTabs: MasterAdminPortalTab[] = [
        'executive', 'schools', 'briefing', 'billing', 'telemetry', 
        'pricing', 'trust_safety', 'operator', 'maintenance', 'backup', 'feedback'
      ];
      if (saved && validTabs.includes(saved as MasterAdminPortalTab)) {
        return saved as MasterAdminPortalTab;
      }
    }
    return 'executive';
  });

  const setActivePortalTab = useCallback((newTab: MasterAdminPortalTab) => {
    setActivePortalTabRaw(newTab);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cg_master_active_portal_tab', newTab);
    }
  }, []);

  // Cmd+K Palette Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        <div style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(35px)',
          WebkitBackdropFilter: 'blur(35px)',
          borderRight: '1px solid rgba(15, 23, 42, 0.06)',
          padding: '40px 24px 32px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100vh',
          position: 'sticky',
          top: 0,
          boxShadow: '4px 0 24px rgba(15, 23, 42, 0.01)'
        }}>
          <div>
            {/* App Logo & Branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '44px', padding: '0 8px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #eab308 100%)',
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={20} color="#ffffff" />
              </div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                  Campus-Groovelab
                </h1>
                <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Admin Leitstand
                </span>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <nav role="tablist" aria-label="Master-Admin Hauptnavigation" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Cmd+K Trigger */}
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  background: '#f8fafc',
                  color: '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={14} color="#64748b" />
                  <span>Suchen / Befehl...</span>
                </div>
                <kbd style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: '#475569',
                  fontFamily: 'sans-serif'
                }}>⌘K</kbd>
              </button>

              {[
                { id: 'executive', label: 'Master Cockpit', icon: <Activity size={18} /> },
                { id: 'schools', label: 'Schulen & Tenants', icon: <Layers size={18} /> },
                { id: 'briefing', label: 'Zahlungsabgleich & Aktivierungen', icon: <CreditCard size={18} /> },
                { id: 'billing', label: 'Financial Control', icon: <Receipt size={18} /> },
                { id: 'telemetry', label: 'Telemetrie & Health', icon: <Cpu size={18} /> },
                { id: 'pricing', label: 'Preise & Kampagnen', icon: <Tag size={18} /> },
                { id: 'trust_safety', label: 'Trust & Safety (Takedowns)', icon: <ShieldAlert size={18} /> },
                { id: 'feedback', label: 'Ideen & Feedback', icon: <Lightbulb size={18} /> },
                { id: 'maintenance', label: 'Wartung & Betrieb', icon: <Wrench size={18} /> },
                { id: 'backup', label: 'Backup & Reset', icon: <Database size={18} /> },
                { id: 'operator', label: 'Betreiber & Zugang', icon: <Building2 size={18} /> }
              ].map((tab) => {
                const isActive = activePortalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`master-tab-${tab.id}`}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`master-panel-${tab.id}`}
                    tabIndex={0}
                    onClick={() => setActivePortalTab(tab.id as MasterAdminPortalTab)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: 'none',
                      background: isActive ? 'rgba(234, 67, 53, 0.08)' : 'transparent',
                      color: isActive ? '#ea4335' : '#475569',
                      fontSize: '0.88rem',
                      fontWeight: isActive ? 800 : 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isActive ? '0 4px 12px rgba(234, 67, 53, 0.06)' : 'none',
                      justifyContent: 'space-between'
                    }}
                    className="sidebar-nav-btn"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: isActive ? '#ea4335' : '#64748b', transition: 'color 0.2s', display: 'flex', alignItems: 'center' }}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                    </div>
                    {tab.id === 'maintenance' && isGlobalMaintenanceActive && (
                      <span style={{
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        color: '#dc2626',
                        fontSize: '0.68rem',
                        fontWeight: 850,
                        padding: '2px 6px',
                        borderRadius: '6px',
                        boxShadow: '0 0 8px rgba(239, 68, 68, 0.25)',
                        letterSpacing: '0.02em'
                      }}>
                        AKTIV
                      </span>
                    )}
                    {tab.id === 'executive' && pendingStorageSchools.length > 0 && (
                      <span style={{
                        background: '#f59e0b',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        padding: '2px 7px',
                        borderRadius: '10px',
                        minWidth: '16px',
                        textAlign: 'center',
                        boxShadow: '0 2px 5px rgba(245, 158, 11, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <HardDrive size={10} /> {pendingStorageSchools.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div style={{
            borderTop: '1px solid rgba(15, 23, 42, 0.06)',
            paddingTop: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
              <img
                src="/campus_login_hero.png"
                alt="Master Admin"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/campus_login_hero.png';
                }}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(234, 67, 53, 0.3)',
                  boxShadow: '0 4px 10px rgba(15, 23, 42, 0.15)'
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {operator.adminUsername || 'Master Admin'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#ea4335', fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  System Root
                </div>
              </div>
            </div>

            {/* Akademie & Handbuch Button */}
            <button
              type="button"
              onClick={() => setIsAkademieOpen(true)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.04) 0%, rgba(234, 67, 53, 0.08) 100%)',
                border: '1px solid rgba(234, 67, 53, 0.25)',
                color: '#0f172a',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} color="#ea4335" />
                <span>Akademie & Handbuch</span>
              </span>
              <span style={{
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '0.66rem',
                fontWeight: 900,
                padding: '2px 7px',
                borderRadius: '6px',
                letterSpacing: '0.04em'
              }}>
                ROOT
              </span>
            </button>

            {/* Zur Schulleitung wechseln */}
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('groovelab_is_master_admin');
                localStorage.removeItem('groovelab_is_master_admin');
                sessionStorage.setItem('groovelab_active_workspace', 'secretary');
                localStorage.setItem('groovelab_active_workspace', 'secretary');
                sessionStorage.setItem('groovelab_active_platform', 'campus');
                sessionStorage.setItem('campus_active_tab', 'briefing');
                window.location.reload();
              }}
              style={{
                width: '100%',
                padding: '11px',
                marginBottom: '8px',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#334155',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <Building2 size={15} color="#475569" />
                <span>Zur Schulleitung wechseln</span>
              </span>
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={onLogout}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                color: '#dc2626',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <LogOut size={14} /> Abmelden
            </button>
          </div>
        </div>

        {/* Right Workspace Area */}
        <div style={{
          padding: '44px 54px',
          overflowY: 'auto',
          height: '100vh',
          boxSizing: 'border-box',
          position: 'relative'
        }}>
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
          {saveSuccessToast && (
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
              <span>{saveSuccessToast}</span>
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
                pendingUsers={[]}
                masterPricing={masterPricing}
                onRefresh={schools.fetchSchoolsAndStats}
                onOpenCommandPalette={() => setCommandPaletteOpen(true)}
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
                pendingUsers={[]}
                schools={schools.schools}
                masterPricing={masterPricing}
                loadingPending={false}
                onRefresh={schools.fetchSchoolsAndStats}
                onBatchActivate={async () => {}}
                onSingleActivate={async () => {}}
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
                onOpenLegalNoticeModal={() => setShowLegalNoticeModal(true)}
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
                saveSuccessToast={saveSuccessToast}
                setSaveSuccessToast={setSaveSuccessToast}
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
                adminPassword={operator.adminPassword}
                setAdminPassword={operator.setAdminPassword}
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
                showGiroCodeModal={operator.showGiroCodeModal}
                setShowGiroCodeModal={operator.setShowGiroCodeModal}
              />
            </div>
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

          {/* Ghost Support Gate Modal */}
          <GhostGateModal
            ghostGateSchool={schools.ghostGateSchool}
            ghostGateReason={schools.ghostGateReason}
            setGhostGateReason={schools.setGhostGateReason}
            ghostGateTicketRef={schools.ghostGateTicketRef}
            setGhostGateTicketRef={schools.setGhostGateTicketRef}
            onClose={() => schools.setGhostGateSchool(null)}
            onConfirm={(school, fullReason) => {
              schools.handleStartGhostMode(school, fullReason);
              schools.setGhostGateSchool(null);
            }}
          />

          {/* School Archive Modal */}
          <SchoolArchiveModal
            archiveModalSchool={schools.archiveModalSchool}
            onClose={() => schools.setArchiveModalSchool(null)}
            onPauseSchool={(s) => schools.handleToggleSchoolStatus(s, 'suspended')}
            onDeleteSchool={(id, name) => schools.handleDeleteSchool(id, name)}
          />

          {/* Cmd+K Master Command Palette */}
          <MasterCommandPaletteModal
            isOpen={commandPaletteOpen}
            search={commandSearch}
            setSearch={setCommandSearch}
            onClose={() => setCommandPaletteOpen(false)}
            schools={schools.schools}
            onSelectSchool={(s: School) => {
              schools.setSelectedSchool(s);
              setCommandPaletteOpen(false);
            }}
            onNavigateTab={(tab) => {
              setActivePortalTab(tab as MasterAdminPortalTab);
              setCommandPaletteOpen(false);
            }}
          />

          {/* Executive Monthly Report Modal */}
          <ExecutiveMonthlyReportModal
            isOpen={showMonthlyReportModal}
            onClose={() => setShowMonthlyReportModal(false)}
            selectedReportMonth={selectedReportMonth}
            schools={schools.schools}
            pendingUsers={[]}
            priceCampus={pricing.priceCampus}
            priceGroovelab={pricing.priceGroovelab}
            priceKombi={pricing.priceKombi}
            priceStudent={pricing.priceStudent}
          />

          {/* Pricing Legal Notice Modal */}
          <PricingLegalNoticeModal
            isOpen={showLegalNoticeModal}
            onClose={() => setShowLegalNoticeModal(false)}
            priceCampus={Number(pricing.priceCampus)}
            priceGroovelab={Number(pricing.priceGroovelab)}
            priceKombi={Number(pricing.priceKombi)}
            priceTeacher={Number(pricing.priceTeacher)}
            priceStudent={Number(pricing.priceStudent)}
            priceEffectiveDate={pricing.priceEffectiveDate}
          />

          {/* 15-Min Inactivity Idle Lock Screen */}
          <MasterIdleLockModal
            isIdleLocked={idleLock.isIdleLocked}
            idleUnlockLoading={idleLock.idleUnlockLoading}
            idlePinInput={idleLock.idlePinInput}
            setIdlePinInput={idleLock.setIdlePinInput}
            idleError={idleLock.idleError}
            onIdleUnlock={idleLock.handleIdleUnlock}
            masterPasskeyActive={operator.masterPasskeyActive}
            onLogout={onLogout}
          />

          {/* Campus-Groovelab Fullscreen-Akademie */}
          {isAkademieOpen && (
            <Suspense fallback={null}>
              <HelpCenterModal
                isOpen={isAkademieOpen}
                onClose={() => setIsAkademieOpen(false)}
                userRole="master_admin"
                activePlatform="campus"
                initialBoardId={activePortalTab}
                onNavigateBoard={(target) => {
                  if (target) setActivePortalTab(target as MasterAdminPortalTab);
                }}
                schoolName="Campus-Groovelab Platform Root"
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
