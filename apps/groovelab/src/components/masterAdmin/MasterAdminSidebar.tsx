import React from 'react';
import {
  Shield,
  Search,
  Activity,
  Layers,
  CreditCard,
  Receipt,
  Cpu,
  Tag,
  ShieldAlert,
  Lightbulb,
  Wrench,
  Database,
  Building2,
  HardDrive,
  BookOpen,
  LogOut
} from 'lucide-react';
import type { MasterAdminPortalTab } from './MasterAdminTypes';

export interface MasterAdminSidebarProps {
  activePortalTab: MasterAdminPortalTab;
  setActivePortalTab: (tab: MasterAdminPortalTab) => void;
  onOpenCommandPalette: () => void;
  onOpenAkademie: () => void;
  onLogout: () => void;
  adminUsername?: string;
  pendingUsersCount: number;
  isGlobalMaintenanceActive: boolean;
  pendingStorageCount: number;
}

const SIDEBAR_TABS: Array<{ id: MasterAdminPortalTab; label: string; icon: React.ReactNode }> = [
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
];

export function MasterAdminSidebar({
  activePortalTab,
  setActivePortalTab,
  onOpenCommandPalette,
  onOpenAkademie,
  onLogout,
  adminUsername,
  pendingUsersCount,
  isGlobalMaintenanceActive,
  pendingStorageCount
}: MasterAdminSidebarProps) {
  const handleSwitchToSecretary = () => {
    try {
      sessionStorage.removeItem('groovelab_is_master_admin');
      localStorage.removeItem('groovelab_is_master_admin');
      sessionStorage.setItem('groovelab_active_workspace', 'secretary');
      localStorage.setItem('groovelab_active_workspace', 'secretary');
      sessionStorage.setItem('groovelab_active_platform', 'campus');
      sessionStorage.setItem('campus_active_tab', 'briefing');
    } catch (e) {
      console.warn('Storage operation failed in handleSwitchToSecretary:', e);
    }
    window.location.reload();
  };

  return (
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
            onClick={onOpenCommandPalette}
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

          {SIDEBAR_TABS.map((tab) => {
            const isActive = activePortalTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`master-tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`master-panel-${tab.id}`}
                tabIndex={0}
                onClick={() => setActivePortalTab(tab.id)}
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
                {tab.id === 'briefing' && pendingUsersCount > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    padding: '2px 7px',
                    borderRadius: '10px',
                    minWidth: '16px',
                    textAlign: 'center',
                    boxShadow: '0 2px 5px rgba(239, 68, 68, 0.25)'
                  }}>
                    {pendingUsersCount}
                  </span>
                )}
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
                {tab.id === 'executive' && pendingStorageCount > 0 && (
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
                    <HardDrive size={10} /> {pendingStorageCount}
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
              {adminUsername || 'Master Admin'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#ea4335', fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              System Root
            </div>
          </div>
        </div>

        {/* Akademie & Handbuch Button */}
        <button
          type="button"
          onClick={onOpenAkademie}
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
          onClick={handleSwitchToSecretary}
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
  );
}
