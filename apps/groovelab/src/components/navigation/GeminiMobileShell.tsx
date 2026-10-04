import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu,
  CloudOff,
  RefreshCw,
  Bell,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { subscribePendingOfflineCount, flushOfflineSyncQueue } from '../../services/offlineSyncService';
import { resolveCampusStudentAvatar } from '../../utils/avatarResolutionEngine';
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
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isTitleVisible, setIsTitleVisible] = useState<boolean>(false);

  // 🏛️ Scroll-Aware Header Listener (Transparenz ganz oben -> Frosted Glass & Large Title Collapse)
  useEffect(() => {
    const checkScroll = (pos: number) => {
      setIsScrolled(pos > 10);
      setIsTitleVisible(pos > 40);
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

  // 🏛️ 0,1% Dynamic Board Title Resolver für Scroll-Aware Header Transition
  const currentBoardTitle = React.useMemo(() => {
    switch (activeTab) {
      case 'settings':
        return parentUnlocked ? 'Elternbereich' : 'Einstellungen';
      case 'homework_book':
      case 'homework':
        return 'Aufgaben';
      case 'practice_board':
        return 'Übe-Pfad';
      case 'events':
        return 'Termine';
      case 'messages':
        return 'Nachrichten';
      case 'briefing':
        return 'Briefing';
      case 'schedule':
        return 'Stundenplan';
      case 'live':
        return 'Live Lab';
      case 'practice':
        return 'Üben';
      case 'library':
        return 'Bibliothek';
      case 'repertoire':
        return 'Repertoire';
      case 'matching':
        return 'Band-Matching';
      case 'bands':
        return 'Bands';
      case 'students':
        return 'Schüler';
      case 'studio':
        return 'Aufgaben-Studio';
      case 'team':
        return 'Team';
      case 'rooms':
        return 'Räume';
      case 'songs':
        return 'Mediathek';
      case 'stats':
        return 'Statistik';
      case 'gallery':
        return 'ID Galerie';
      case 'setup':
        return 'Einstellungen';
      default:
        return '';
    }
  }, [activeTab, parentUnlocked]);

  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);

  // 🏛️ Sub-View State Listener für Header-Verschmelzung (Aufgabenheft, Sticker-Album, etc.)
  const [subViewNavState, setSubViewNavState] = useState<{
    isActive: boolean;
    label: string;
    isStickerAlbum: boolean;
  }>({
    isActive: false,
    label: 'Zurück zu den Modulen',
    isStickerAlbum: false
  });

  useEffect(() => {
    const handleSubViewNav = (e: any) => {
      if (e?.detail) {
        setSubViewNavState({
          isActive: !!e.detail.isActive,
          label: e.detail.label || 'Zurück zu den Modulen',
          isStickerAlbum: !!e.detail.isStickerAlbum
        });
      }
    };
    window.addEventListener('campus_subview_nav_state', handleSubViewNav as EventListener);
    return () => {
      window.removeEventListener('campus_subview_nav_state', handleSubViewNav as EventListener);
    };
  }, []);

  // Normalized role checks
  const userRole = (user?.role || 'student').toLowerCase();
  const isStudent = userRole === 'student' || (!userRole && !user?.is_master_admin);
  const isStaff = userRole === 'admin' || userRole === 'secretary';

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
      setIsDrawerOpen(false);
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



  const isSubViewActive = activePlatform === 'campus' && activeTab === 'homework_book' && subViewNavState.isActive;

  const getAvatarSrc = () => {
    if (isStaff) return '/campus_login_hero.png';
    if (activePlatform === 'campus') {
      return resolveCampusStudentAvatar(user, teachers);
    }
    return user?.avatar_url || resolveCampusStudentAvatar(user, teachers);
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
          background: (isSubViewActive && subViewNavState.isStickerAlbum)
            ? 'rgba(15, 23, 42, 0.92)'
            : isScrolled
            ? 'rgba(255, 255, 255, 0.85)'
            : 'transparent',
          backdropFilter: (isSubViewActive && subViewNavState.isStickerAlbum) || isScrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: (isSubViewActive && subViewNavState.isStickerAlbum) || isScrolled ? 'blur(20px)' : 'none',
          borderBottom: (isSubViewActive && subViewNavState.isStickerAlbum)
            ? '1px solid rgba(255, 255, 255, 0.12)'
            : isScrolled
            ? '1px solid rgba(226, 232, 240, 0.8)'
            : '1px solid transparent'
        }}
      >
        {/* Left: ☰ Hamburger Button (44×44px Touch Target) in GrooveLab Gelb */}
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
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: activePlatform === 'campus'
                ? 'rgba(52, 168, 83, 0.15)'
                : (isSubViewActive && subViewNavState.isStickerAlbum)
                ? 'rgba(234, 179, 8, 0.22)'
                : 'rgba(234, 179, 8, 0.14)',
              border: activePlatform === 'campus'
                ? '1.5px solid rgba(52, 168, 83, 0.50)'
                : (isSubViewActive && subViewNavState.isStickerAlbum)
                ? '1.5px solid rgba(250, 204, 21, 0.70)'
                : '1.5px solid rgba(234, 179, 8, 0.40)',
              boxShadow: activePlatform === 'campus'
                ? '0 2px 8px rgba(52, 168, 83, 0.25)'
                : (isSubViewActive && subViewNavState.isStickerAlbum)
                ? '0 2px 8px rgba(234, 179, 8, 0.30)'
                : '0 1px 4px rgba(234, 179, 8, 0.12)',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <Menu
              size={24}
              strokeWidth={2.6}
              color={activePlatform === 'campus' ? '#34a853' : (isSubViewActive && subViewNavState.isStickerAlbum) ? '#facc15' : '#b45309'}
            />
          </div>
        </button>

        {/* Center: SubView Back Button OR 0,1% Scroll-Aware Collapsing Title (Apple Large Title Pattern) */}
        {isSubViewActive ? (
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('campus_trigger_universal_back'));
            }}
            className="cg-gemini-pill-btn hover-scale-mini"
            aria-label={subViewNavState.label}
            style={{
              background: subViewNavState.isStickerAlbum ? 'rgba(255, 255, 255, 0.12)' : '#f1f5f9',
              border: subViewNavState.isStickerAlbum ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid #cbd5e1',
              color: subViewNavState.isStickerAlbum ? '#ffffff' : '#0f172a',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '36px',
              minHeight: '36px',
              padding: '0 14px',
              borderRadius: '100px',
              fontWeight: 800,
              fontSize: '0.80rem',
              cursor: 'pointer',
              boxShadow: subViewNavState.isStickerAlbum
                ? '0 2px 8px rgba(0, 0, 0, 0.3)'
                : '0 1px 3px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowLeft
              size={15}
              strokeWidth={2.6}
              color={subViewNavState.isStickerAlbum ? '#ffffff' : '#0f172a'}
            />
            <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subViewNavState.label}
            </span>
          </button>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              opacity: currentBoardTitle ? 1 : 0,
              pointerEvents: 'auto',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            <span
              style={{
                fontSize: '0.96rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
                color: (isSubViewActive && subViewNavState.isStickerAlbum) ? '#ffffff' : '#0f172a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {currentBoardTitle}
            </span>
          </div>
        )}

        {/* Right: Parental status, Cloud sync, iCal Action, Bell & Avatar (>=44×44px touch targets) */}
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
            style={{
              position: 'relative',
              color: (isSubViewActive && subViewNavState.isStickerAlbum) ? '#ffffff' : '#475569'
            }}
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
