import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu,
  ChevronDown,
  GraduationCap,
  Music,
  Cloud,
  CloudOff,
  RefreshCw,
  Bell,
  ShieldCheck,
  Check,
  Lock
} from 'lucide-react';
import { subscribePendingOfflineCount, flushOfflineSyncQueue } from '../../services/offlineSyncService';
import { CampusMobileSidebarDrawer } from './CampusMobileSidebarDrawer';

export interface GeminiMobileShellProps {
  user: any;
  school?: any;
  activePlatform: 'campus' | 'groovelab' | 'admin' | string;
  setActivePlatform: (platform: 'campus' | 'groovelab' | 'admin' | string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hasCampusActive?: boolean;
  hasGrooveLabActive?: boolean;
  unreadCount?: number;
  parentUnlocked?: boolean;
  setParentUnlocked?: (unlocked: boolean) => void;
  campusStudentUiLevel?: string;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onOpenPrivacy?: () => void;
  onOpenAgb?: () => void;
  onOpenImpressum?: () => void;
  onOpenAccessibility?: () => void;
  onOpenParentPin?: () => void;
  onSwitchActiveRole?: (role: string) => void;
  activeWorkspace?: string | null;
  teachers?: any[];
  session?: any;
  studentMessages?: any[];
  showMissionsFeature?: boolean;
  isMusicStandMode?: boolean;
  toggleMusicStandMode?: () => void;
  onShowQr?: () => void;
  trialDaysLeft?: number | null;
  setShowTrialInfoModal?: (show: boolean) => void;
}

export const GeminiMobileShell: React.FC<GeminiMobileShellProps> = ({
  user,
  school,
  activePlatform,
  setActivePlatform,
  activeTab,
  setActiveTab,
  hasCampusActive,
  hasGrooveLabActive,
  unreadCount = 0,
  parentUnlocked = false,
  setParentUnlocked,
  campusStudentUiLevel = 'junior',
  onLogout,
  onOpenSettings,
  onOpenPrivacy,
  onOpenAgb,
  onOpenImpressum,
  onOpenAccessibility,
  onOpenParentPin,
  onSwitchActiveRole,
  activeWorkspace,
  teachers = [],
  session,
  studentMessages = [],
  showMissionsFeature = false,
  isMusicStandMode = false,
  toggleMusicStandMode = () => {},
  onShowQr,
  trialDaysLeft,
  setShowTrialInfoModal
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  // 🏛️ Scroll-Aware Header Listener (Transparenz ganz oben -> Frosted Glass beim Scrollen)
  useEffect(() => {
    const checkScroll = (pos: number) => {
      setIsScrolled(pos > 10);
    };
    const onWindowScroll = () => {
      checkScroll(window.scrollY || document.documentElement.scrollTop || 0);
    };
    window.addEventListener('scroll', onWindowScroll, { passive: true });
    const onContainerScroll = (e: Event) => {
      const el = e.target as HTMLElement;
      if (el && typeof el.scrollTop === 'number') {
        checkScroll(el.scrollTop);
      }
    };
    document.addEventListener('scroll', onContainerScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', onWindowScroll);
      document.removeEventListener('scroll', onContainerScroll, { capture: true });
    };
  }, []);

  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);

  // Normalized role checks
  const userRole = (user?.role || 'student').toLowerCase();
  const isStudent = userRole === 'student' || (!userRole && !user?.is_master_admin);
  const isTeacher = userRole === 'teacher';
  const isStaff = userRole === 'admin' || userRole === 'secretary';

  const hasCampusSub = Boolean(school?.has_campus_subscription || !school?.is_billing_booked || school?.subscription_bypass);
  const hasGrooveLabSub = Boolean(school?.has_groovelab_subscription || !school?.is_billing_booked || school?.subscription_bypass);

  const isCampusEligible = hasCampusActive !== undefined ? hasCampusActive : Boolean((isStaff || user?.is_campus_active) && hasCampusSub);
  const isGrooveLabEligible = hasGrooveLabActive !== undefined ? hasGrooveLabActive : Boolean((isStaff || user?.is_groovelab_active) && hasGrooveLabSub);
  const showModuleSwitcher = (isCampusEligible && isGrooveLabEligible) || isStaff;

  // Offline sync queue & network status listeners
  useEffect(() => {
    const unsub = subscribePendingOfflineCount(setPendingCount);
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        await flushOfflineSyncQueue();
      } finally {
        setIsSyncing(false);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Focus restoration to trigger button when drawer closes (WCAG 2.1.2)
  const prevDrawerOpenRef = useRef(isDrawerOpen);
  useEffect(() => {
    if (prevDrawerOpenRef.current && !isDrawerOpen) {
      triggerBtnRef.current?.focus();
    }
    prevDrawerOpenRef.current = isDrawerOpen;
  }, [isDrawerOpen]);

  // Global keydown listener for Escape dismissal of Scope Dropdown
  useEffect(() => {
    if (!isScopeMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsScopeMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScopeMenuOpen]);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await flushOfflineSyncQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  // Authoritative Platform Switching with state caching
  const handlePlatformSwitch = useCallback(
    (target: 'campus' | 'groovelab' | 'admin' | string) => {
      setIsScopeMenuOpen(false);
      setActivePlatform(target);
      if (target === 'campus') {
        const rawCampusTab = sessionStorage.getItem('campus_active_tab');
        const startTab = rawCampusTab && rawCampusTab !== 'live' ? rawCampusTab : 'briefing';
        setActiveTab(startTab);
        sessionStorage.setItem('campus_active_tab', startTab);
      } else if (target === 'groovelab') {
        setActiveTab('live');
        sessionStorage.setItem('groovelab_active_tab', 'live');
        localStorage.setItem('groovelab_active_tab', 'live');
      } else if (target === 'admin') {
        setActiveTab('verwaltung');
      }
    },
    [setActivePlatform, setActiveTab]
  );

  // Lock parental session back to student mode
  const handleLockParentMode = useCallback(() => {
    sessionStorage.removeItem('groovelab_parent_unlocked_global');
    if (user?.id) {
      sessionStorage.removeItem(`groovelab_parent_unlocked_${user.id}`);
      sessionStorage.removeItem(`groovelab_parent_session_${user.id}`);
    }
    setParentUnlocked?.(false);
    window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: false }));
    setIsDrawerOpen(false);
  }, [user?.id, setParentUnlocked]);



  const getAvatarSrc = () => {
    if (isStaff) return '/campus_login_hero.png';
    return user?.avatar_url || '/campus_login_hero.png';
  };





  return (
    <>
      <style>{`
        .cg-gemini-header {
          position: sticky; top: 0; left: 0; right: 0; height: 48px; min-height: 48px; max-height: 48px;
          padding-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px));
          box-sizing: content-box;
          transition: background 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, backdrop-filter 0.25s ease, -webkit-backdrop-filter 0.25s ease;
          display: flex; align-items: center; justify-content: space-between;
          padding-left: max(8px, env(safe-area-inset-left, 8px));
          padding-right: max(10px, env(safe-area-inset-right, 10px));
          z-index: 900;
        }
        .cg-gemini-touch-btn {
          width: 44px; height: 44px; min-width: 44px; min-height: 44px;
          border-radius: 12px; border: none; background: transparent;
          display: flex; align-items: center; justify-content: center;
          color: #1e293b; cursor: pointer; touch-action: manipulation;
          -webkit-tap-highlight-color: transparent; outline: none;
        }
        .cg-gemini-pill-btn {
          display: inline-flex; align-items: center; gap: 6px; height: 34px; min-height: 34px;
          padding: 0 12px; border-radius: 100px; font-size: 0.80rem; font-weight: 800;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04); transition: all 0.15s ease;
          outline: none; white-space: nowrap; touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        .cg-gemini-interactive-tile {
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cg-gemini-interactive-tile:active { transform: scale(0.98); }
      `}</style>

      {/* ── Minimalist Top Header (48px Height, Scroll-Aware Transparenz -> Frosted Glass) ── */}
      <header
        role="banner"
        aria-label="Hauptnavigation Oben"
        className="cg-mobile-top-header cg-gemini-header"
        style={{
          background: isScrolled ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(20px)' : 'none',
          borderBottom: isScrolled ? '1px solid rgba(226, 232, 240, 0.8)' : '1px solid transparent'
        }}
      >
        {/* Left: ☰ Hamburger Button (44×44px Touch Target) */}
        <button
          ref={triggerBtnRef}
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Hauptmenü öffnen"
          aria-expanded={isDrawerOpen}
          aria-haspopup="dialog"
          className="cg-gemini-touch-btn hover-scale"
          title="Hauptmenü öffnen"
        >
          <Menu size={22} strokeWidth={2.4} />
        </button>

        {/* Center: Scope/Platform Dropdown (Reiner Gemini Typografie-Stil 1:1 wie „Gemini Flash ⌵“) */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              if (showModuleSwitcher) setIsScopeMenuOpen((prev) => !prev);
            }}
            aria-label={`Plattform wählen: Aktuell ${
              activePlatform === 'campus' ? 'Campus' : activePlatform === 'admin' ? 'Verwaltung' : 'GrooveLab'
            }`}
            aria-haspopup="listbox"
            aria-expanded={isScopeMenuOpen}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              height: '44px',
              padding: '0 8px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              cursor: showModuleSwitcher ? 'pointer' : 'default',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
            title={showModuleSwitcher ? 'Plattform wechseln' : undefined}
          >
            <span
              style={{
                fontSize: '1.02rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
                color: '#0f172a'
              }}
            >
              {activePlatform === 'campus' ? 'Campus' : activePlatform === 'admin' ? 'Verwaltung' : 'GrooveLab'}
            </span>
            {activePlatform === 'groovelab' && (
              <span style={{ fontSize: '0.80rem', fontWeight: 600, color: '#ca8a04', marginLeft: '2px' }}>
                Studio
              </span>
            )}
            {showModuleSwitcher && (
              <ChevronDown
                size={14}
                strokeWidth={2.4}
                style={{
                  color: '#64748b',
                  marginLeft: '2px',
                  transform: isScopeMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              />
            )}
          </button>

          {/* Scope Dropdown Menu */}
          {isScopeMenuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setIsScopeMenuOpen(false)} />
              <div
                role="listbox"
                aria-label="Plattform wählen"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 999,
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                  padding: '6px',
                  minWidth: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                {isCampusEligible && (
                  <button
                    type="button"
                    role="option"
                    aria-selected={activePlatform === 'campus'}
                    onClick={() => handlePlatformSwitch('campus')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: activePlatform === 'campus' ? '#e6f4ea' : 'transparent',
                      color: activePlatform === 'campus' ? '#166534' : '#334155',
                      fontWeight: activePlatform === 'campus' ? 800 : 650,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <GraduationCap size={16} color={activePlatform === 'campus' ? '#166534' : '#64748b'} />
                      <span>Campus Schule</span>
                    </span>
                    {activePlatform === 'campus' && <Check size={14} color="#166534" strokeWidth={3} />}
                  </button>
                )}

                {isGrooveLabEligible && (
                  <button
                    type="button"
                    role="option"
                    aria-selected={activePlatform === 'groovelab'}
                    onClick={() => handlePlatformSwitch('groovelab')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: activePlatform === 'groovelab' ? '#fef9c3' : 'transparent',
                      color: activePlatform === 'groovelab' ? '#854d0e' : '#334155',
                      fontWeight: activePlatform === 'groovelab' ? 800 : 650,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Music size={15} color={activePlatform === 'groovelab' ? '#854d0e' : '#64748b'} />
                      <span>GrooveLab Studio</span>
                    </span>
                    {activePlatform === 'groovelab' && <Check size={14} color="#854d0e" strokeWidth={3} />}
                  </button>
                )}

                {isStaff && (
                  <button
                    type="button"
                    role="option"
                    aria-selected={activePlatform === 'admin'}
                    onClick={() => handlePlatformSwitch('admin')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: activePlatform === 'admin' ? '#fee2e2' : 'transparent',
                      color: activePlatform === 'admin' ? '#991b1b' : '#334155',
                      fontWeight: activePlatform === 'admin' ? 800 : 650,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={15} color={activePlatform === 'admin' ? '#991b1b' : '#64748b'} />
                      <span>Schulverwaltung</span>
                    </span>
                    {activePlatform === 'admin' && <Check size={14} color="#991b1b" strokeWidth={3} />}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: Parental status, Cloud sync, Bell & Avatar (>=44×44px touch targets) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {parentUnlocked && isStudent && (
            <button
              type="button"
              onClick={handleLockParentMode}
              title="Eltern-Modus sperren"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                height: '30px',
                padding: '0 8px',
                borderRadius: '100px',
                border: '1px solid #bae6fd',
                background: '#f0f9ff',
                color: '#0284c7',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                marginRight: '2px'
              }}
            >
              <Lock size={11} color="#0284c7" />
              <span>Sperren</span>
            </button>
          )}

          {(!isOnline || isSyncing) && (
            <button
              type="button"
              onClick={handleManualSync}
              title={!isOnline ? 'Offline-Modus aktiv' : 'Synchronisiere...'}
              className="cg-gemini-touch-btn"
              style={{ color: !isOnline ? '#ef4444' : '#3b82f6' }}
            >
              {!isOnline ? (
                <CloudOff size={18} color="#ef4444" />
              ) : (
                <RefreshCw size={17} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
              )}
            </button>
          )}

          {/* Unread Notifications Bell Button (44×44px Touch Target) */}
          <button
            type="button"
            onClick={() => {
              if (activePlatform !== 'campus') handlePlatformSwitch('campus');
              setActiveTab('messages');
              window.dispatchEvent(new CustomEvent('campus_open_messages_tab'));
            }}
            aria-label={unreadCount > 0 ? `${unreadCount} ungelesene Benachrichtigungen` : 'Benachrichtigungen & Nachrichten'}
            className="cg-gemini-touch-btn hover-scale-mini"
            style={{ position: 'relative', color: '#475569' }}
            title="Benachrichtigungen & Mitteilungen"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '7px',
                  right: '7px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  boxShadow: '0 0 0 2px #ffffff'
                }}
              />
            )}
          </button>

          {/* User Profile Avatar (44×44px Touch Target - Direktsprung zum Profil/Settings gem. Grill-Me) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab(isStaff ? 'setup' : 'settings');
              onOpenSettings?.();
            }}
            aria-label={`Profil & Einstellungen von ${user?.name || 'Benutzer'} öffnen`}
            className="cg-gemini-touch-btn hover-scale-mini"
            title="Profil & Einstellungen öffnen"
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                overflow: 'hidden',
                border:
                  activePlatform === 'campus'
                    ? '2px solid #34a853'
                    : activePlatform === 'admin'
                    ? '2px solid #ef4444'
                    : '2px solid #eab308',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
              }}
            >
              <img
                src={getAvatarSrc()}
                alt={user?.name || 'Profilbild'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/campus_login_hero.png';
                }}
              />
            </div>
          </button>
        </div>
      </header>

      {/* ── 0,1% Enterprise Goldstandard Mobile Sidebar Drawer (1:1 Desktop Parität & 'X'-Schließen oben rechts) ── */}
      <CampusMobileSidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
        school={school}
        activePlatform={activePlatform}
        setActivePlatform={handlePlatformSwitch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeWorkspace={activeWorkspace}
        teachers={teachers}
        session={session}
        campusStudentUiLevel={campusStudentUiLevel}
        parentUnlocked={parentUnlocked}
        unreadCount={unreadCount}
        studentMessages={studentMessages}
        showMissionsFeature={showMissionsFeature}
        isMusicStandMode={isMusicStandMode}
        toggleMusicStandMode={toggleMusicStandMode}
        onShowQr={onShowQr}
        onLogout={onLogout}
        onOpenPrivacy={onOpenPrivacy}
        onOpenAgb={onOpenAgb}
        onOpenImpressum={onOpenImpressum}
        onOpenAccessibility={onOpenAccessibility}
        onSwitchActiveRole={onSwitchActiveRole}
        trialDaysLeft={trialDaysLeft}
        setShowTrialInfoModal={setShowTrialInfoModal}
      />
    </>
  );
};
