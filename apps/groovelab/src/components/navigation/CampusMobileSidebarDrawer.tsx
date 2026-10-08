import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  School,
  X,
  ArrowLeftRight,
  GraduationCap,
  Music,
  Monitor,
  Calendar,
  Mail,
  Users,
  Library,
  Box,
  Settings,
  ShieldCheck,
  BookOpen,
  Zap,
  Play,
  Award,
  Megaphone,
  Trophy,
  Shield,
  QrCode,
  Compass,
  AlertCircle
} from 'lucide-react';
import { CampusSidebarRailItem } from '../layout/CampusSidebarRailItem';
import { CampusSidebarUserHub } from '../layout/CampusSidebarUserHub';
import { CampusRibbonNoteIcon } from '../CampusGroovelabBrand';

export interface CampusMobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  school?: any;
  activePlatform: 'campus' | 'groovelab' | 'admin' | string;
  setActivePlatform: (platform: 'campus' | 'groovelab' | 'admin' | string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeWorkspace?: string | null;
  teachers?: any[];
  session?: any;
  campusStudentUiLevel?: string;
  parentUnlocked?: boolean;
  unreadCount?: number;
  studentMessages?: any[];
  showMissionsFeature?: boolean;
  isMusicStandMode?: boolean;
  toggleMusicStandMode?: () => void;
  onShowQr?: () => void;
  onLogout?: (confirmFirst?: boolean, hardPurge?: boolean) => void;
  onOpenPrivacy?: () => void;
  onOpenAgb?: () => void;
  onOpenImpressum?: () => void;
  onOpenAccessibility?: () => void;
  onSwitchActiveRole?: (role: string) => void;
  trialDaysLeft?: number | null;
  setShowTrialInfoModal?: (show: boolean) => void;
}

/**
 * 🏛️ CampusMobileSidebarDrawer (0,1% Enterprise Goldstandard)
 * 
 * Bietet 1:1 visuelle und funktionale Parität zur linken Desktop-Sidebar im Mobile View / PWA.
 * Verfügt über:
 * - Off-Canvas Slide-In Drawer von links mit abgedunkeltem Backdrop
 * - Header mit Schul-Branding und taktilem 'X'-Schließen-Button oben rechts (WCAG 2.5.5 / BFSG 2025)
 * - Dual-Role Switcher („Zur Verwaltung“)
 * - Symmetrischen 2-Spalten Segmented Platform Switcher (Campus / GrooveLab)
 * - Einzeilige, rollenbasierte Pill-Navigationselemente
 * - Integrierten Campus Pass & User Profile Hub
 * - BFSG 2025 / WCAG 2.2 AA Barrierefreiheit (Focus Trap, Escape-Listener, Swipe-to-Close)
 */
export const CampusMobileSidebarDrawer: React.FC<CampusMobileSidebarDrawerProps> = ({
  isOpen,
  onClose,
  user,
  school,
  activePlatform,
  setActivePlatform,
  activeTab,
  setActiveTab,
  activeWorkspace,
  teachers = [],
  session,
  campusStudentUiLevel = 'junior',
  parentUnlocked = false,
  unreadCount = 0,
  studentMessages = [],
  showMissionsFeature = false,
  isMusicStandMode = false,
  toggleMusicStandMode = () => {},
  onShowQr = () => {},
  onLogout = () => {},
  onOpenPrivacy = () => {},
  onOpenAgb = () => {},
  onOpenImpressum = () => {},
  onOpenAccessibility = () => {},
  onSwitchActiveRole,
  trialDaysLeft,
  setShowTrialInfoModal
}) => {
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Normalized role checks
  const userRole = (user?.role || 'student').toLowerCase();
  const isStudent = userRole === 'student';
  const isTeacher = userRole === 'teacher';
  const isStaff = userRole === 'admin' || userRole === 'secretary';

  const isGrooveLabBooked = Boolean(
    (school ? (school.has_groovelab_subscription || !school.is_billing_booked || school.subscription_bypass) : true) &&
    (user?.is_groovelab_active || isStaff)
  );

  // Body scroll lock & focus management when drawer toggles
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const focusTimer = setTimeout(() => closeBtnRef.current?.focus(), 60);

      return () => {
        clearTimeout(focusTimer);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Global keydown listener for Escape dismissal & Focus trap (WCAG 2.1.2)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null || el.getClientRects().length > 0);

        if (focusableElements.length === 0) return;
        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl || !drawerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl || !drawerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle tab selection with drawer dismissal
  const handleSelectTab = useCallback((tabId: string) => {
    setActiveTab(tabId);
    onClose();
  }, [setActiveTab, onClose]);

  // Handle platform switch
  const handleSwitchPlatform = useCallback((platform: 'campus' | 'groovelab') => {
    if (activePlatform !== platform) {
      setActivePlatform(platform);
      if (platform === 'campus') {
        const rawCampusTab = sessionStorage.getItem('campus_active_tab');
        const startTab = rawCampusTab && rawCampusTab !== 'live' ? rawCampusTab : 'briefing';
        setActiveTab(startTab);
        sessionStorage.setItem('campus_active_tab', startTab);
      } else {
        if (isTeacher) {
          sessionStorage.setItem('groovelab_active_workspace', 'teacher');
        }
        if (isStaff || isTeacher) {
          sessionStorage.setItem('groovelab_location_mode', 'lab');
        }
        setActiveTab('live');
        sessionStorage.setItem('groovelab_active_tab', 'live');
        localStorage.setItem('groovelab_active_tab', 'live');
      }
    }
  }, [activePlatform, setActivePlatform, setActiveTab, isTeacher, isStaff]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes campusDrawerBackdropFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes campusDrawerSlideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* ── Abgedunkelter Backdrop Blur (Tap schließt die Sidebar) ── */}
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 11000,
          animation: 'campusDrawerBackdropFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          touchAction: 'manipulation'
        }}
      />

      {/* ── Off-Canvas Slide-In Drawer von links ── */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Hauptnavigation"
        onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStartX === null) return;
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          // Swipe nach links schließt die Leiste
          if (deltaX < -50) {
            onClose();
          }
          setTouchStartX(null);
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 'min(320px, 86vw)',
          maxWidth: '340px',
          height: '100dvh',
          background: '#ffffff',
          zIndex: 11001,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 28px rgba(0, 0, 0, 0.16)',
          animation: 'campusDrawerSlideInLeft 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
          paddingTop: 'max(12px, var(--safe-area-inset-top, env(safe-area-inset-top, 12px)))',
          paddingBottom: 'max(14px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 14px)))',
          paddingLeft: '14px',
          paddingRight: '14px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {/* ── 1. Header: School Branding + 'X' Schließen-Button oben rechts ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
          flexShrink: 0,
          paddingBottom: '6px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: '8px'
          }}>
            {/* School Branding */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: 0,
                flex: 1
              }}
              title={school?.name || 'Musäk Bad Säckingen'}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(51, 65, 85, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155',
                flexShrink: 0
              }}>
                <School size={15} color="#334155" />
              </div>
              <span style={{
                fontSize: '0.86rem',
                fontWeight: 800,
                color: '#1e293b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '-0.01em',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                {school?.name || 'Musäk Bad Säckingen'}
              </span>
            </div>

            {/* Prominenter 'X' Schließen-Button oben rechts (WCAG 2.5.5 >= 44x44px Touch Target) */}
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Menü schließen"
              title="Menü schließen"
              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                touchAction: 'manipulation',
                outline: 'none',
                flexShrink: 0
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  border: activePlatform === 'campus' ? '1.5px solid rgba(52, 168, 83, 0.40)' : '1px solid #e2e8f0',
                  background: activePlatform === 'campus' ? 'rgba(52, 168, 83, 0.10)' : '#f8fafc',
                  color: activePlatform === 'campus' ? '#34a853' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.16s ease'
                }}
                className="hover-scale"
              >
                <X size={18} strokeWidth={2.4} color={activePlatform === 'campus' ? '#34a853' : 'currentColor'} />
              </div>
            </button>
          </div>

          {/* Dual-Role Switcher: „Zur Verwaltung“ (nur für Lehrer mit Admin/Sekretariat-Rechten) */}
          {user && Array.isArray(user.roles) && (user.roles.includes('admin') || user.roles.includes('secretary')) && onSwitchActiveRole && (
            <button
              type="button"
              onClick={() => {
                onSwitchActiveRole(user.roles.includes('admin') ? 'admin' : 'secretary');
                onClose();
              }}
              title="Zur Schulverwaltung wechseln"
              aria-label="Zur Schulverwaltung wechseln"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                height: '36px',
                padding: '0 12px',
                borderRadius: '9999px',
                background: '#fef2f2',
                border: 'none',
                color: '#b91c1c',
                fontWeight: 750,
                fontSize: '0.78rem',
                letterSpacing: '-0.01em',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                cursor: 'pointer',
                transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 1px 3px rgba(239, 68, 68, 0.08)'
              }}
              className="hover-scale"
            >
              <ArrowLeftRight size={13} color="#ea4335" strokeWidth={2.2} />
              <School size={15} color="#ea4335" strokeWidth={2.2} />
              <span>Zur Verwaltung</span>
            </button>
          )}

          {/* Trial Days Pill (falls aktiv) */}
          {(userRole === 'teacher' || userRole === 'admin' || userRole === 'secretary') && school?.is_trial && !school?.subscription_bypass && trialDaysLeft !== null && trialDaysLeft !== undefined && (
            <button
              type="button"
              onClick={() => {
                setShowTrialInfoModal?.(true);
                onClose();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                height: '28px',
                padding: '0 8px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                border: 'none',
                color: 'white',
                fontWeight: 850,
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.2)'
              }}
              className="hover-scale"
              title="Details zur Probezeit"
            >
              <AlertCircle size={12} color="white" />
              <span>{trialDaysLeft > 0 ? `Probezeit: ${trialDaysLeft} ${trialDaysLeft === 1 ? 'Tag' : 'Tage'}` : 'Probezeit abgelaufen'}</span>
            </button>
          )}
        </div>

        {/* ── 2. Segmented Platform Switcher: Campus vs. GrooveLab ── */}
        <div style={{ padding: '4px 0 8px 0', width: '100%', flexShrink: 0 }}>
          {isGrooveLabBooked ? (
            <div
              role="tablist"
              aria-label="Plattformauswahl"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                background: '#f1f5f9',
                padding: '4px',
                borderRadius: '13px',
                border: '1px solid #e2e8f0',
                width: '100%',
                gap: '4px',
                boxSizing: 'border-box'
              }}
            >
              {/* Campus Segment */}
              <button
                type="button"
                role="tab"
                aria-selected={activePlatform === 'campus'}
                onClick={() => handleSwitchPlatform('campus')}
                style={{
                  height: '50px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activePlatform === 'campus' ? '#34a853' : 'transparent',
                  color: activePlatform === 'campus' ? '#ffffff' : '#64748b',
                  fontWeight: activePlatform === 'campus' ? 800 : 650,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: activePlatform === 'campus' ? '0 2px 8px rgba(52, 168, 83, 0.32)' : 'none',
                  outline: 'none',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  letterSpacing: '-0.01em',
                  userSelect: 'none',
                  touchAction: 'manipulation',
                  boxSizing: 'border-box'
                }}
                className="hover-scale-mini"
                title="Zu Campus wechseln"
              >
                <GraduationCap
                  size={18}
                  color={activePlatform === 'campus' ? '#ffffff' : 'rgba(52, 168, 83, 0.85)'}
                />
                <span>Campus</span>
              </button>

              {/* GrooveLab Segment */}
              <button
                type="button"
                role="tab"
                aria-selected={activePlatform === 'groovelab'}
                onClick={() => handleSwitchPlatform('groovelab')}
                style={{
                  height: '50px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activePlatform === 'groovelab' ? '#facc15' : 'transparent',
                  color: activePlatform === 'groovelab' ? '#0f172a' : '#64748b',
                  fontWeight: activePlatform === 'groovelab' ? 800 : 650,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: activePlatform === 'groovelab' ? '0 2px 8px rgba(234, 179, 8, 0.35)' : 'none',
                  outline: 'none',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  letterSpacing: '-0.01em',
                  userSelect: 'none',
                  touchAction: 'manipulation',
                  boxSizing: 'border-box'
                }}
                className="hover-scale-mini"
                title="Zu GrooveLab wechseln"
              >
                <CampusRibbonNoteIcon
                  size={18}
                  color={activePlatform === 'groovelab' ? '#0f172a' : 'rgba(202, 138, 4, 0.85)'}
                />
                <span>GrooveLab</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                background: 'rgba(52, 168, 83, 0.08)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <GraduationCap size={20} color="#34a853" />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34a853' }}>Campus</div>
            </div>
          )}
        </div>

        {/* ── 3. Scrollable Navigation List: Einzeilige Pill-Navigations-Items ── */}
        <nav
          className="sidebar-menu"
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            paddingRight: '2px',
            paddingTop: '2px'
          }}
        >
          {isStudent ? (
            activePlatform === 'campus' ? (
              <>
                <CampusSidebarRailItem
                  icon={<Monitor size={20} />}
                  label="Briefing"
                  isActive={['briefing', 'profile'].includes(activeTab)}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('briefing')}
                />
                <CampusSidebarRailItem
                  icon={<BookOpen size={20} />}
                  label="Aufgaben"
                  isActive={activeTab === 'homework_book'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('homework_book')}
                />
                {(parentUnlocked || campusStudentUiLevel !== 'junior') && (
                  <CampusSidebarRailItem
                    icon={<Zap size={20} />}
                    label="Übe-Pfad"
                    isActive={activeTab === 'practice_board'}
                    isCollapsed={false}
                    platform={activePlatform}
                    onClick={() => handleSelectTab('practice_board')}
                  />
                )}
                <CampusSidebarRailItem
                  icon={<Calendar size={20} />}
                  label="Termine"
                  isActive={activeTab === 'events'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('events')}
                />
                <CampusSidebarRailItem
                  icon={<Mail size={20} />}
                  label="Nachrichten"
                  isActive={activeTab === 'messages'}
                  isCollapsed={false}
                  platform={activePlatform}
                  badgeCount={unreadCount}
                  onClick={() => handleSelectTab('messages')}
                />
                <CampusSidebarRailItem
                  icon={!parentUnlocked ? <ShieldCheck size={20} /> : <Settings size={20} />}
                  label={!parentUnlocked ? 'Elternbereich' : 'Einstellungen'}
                  isActive={activeTab === 'settings'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('settings')}
                />
              </>
            ) : activePlatform === 'ensembles' ? (
              <CampusSidebarRailItem
                icon={<Users size={20} />}
                label="Ensembles & Bands"
                isActive={activeTab === 'overview'}
                isCollapsed={false}
                platform={activePlatform}
                onClick={() => handleSelectTab('overview')}
              />
            ) : (
              <>
                <CampusSidebarRailItem
                  icon={<Monitor size={20} />}
                  label="Live Lab"
                  isActive={activeTab === 'live'}
                  isCollapsed={false}
                  platform={activePlatform}
                  hasPulseDot={true}
                  onClick={() => handleSelectTab('live')}
                />
                {!user?.is_external_vocalist && (
                  <>
                    <CampusSidebarRailItem
                      icon={<Play size={20} fill={activeTab === 'practice' ? 'currentColor' : 'none'} />}
                      label="Üben"
                      isActive={activeTab === 'practice'}
                      isCollapsed={false}
                      platform={activePlatform}
                      onClick={() => handleSelectTab('practice')}
                    />
                    <CampusSidebarRailItem
                      icon={<Library size={20} />}
                      label="Bibliothek"
                      isActive={activeTab === 'library'}
                      isCollapsed={false}
                      platform={activePlatform}
                      onClick={() => handleSelectTab('library')}
                    />
                  </>
                )}
                <CampusSidebarRailItem
                  icon={<Award size={20} />}
                  label="Repertoire"
                  isActive={activeTab === 'repertoire'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('repertoire')}
                />
                {!user?.is_external_vocalist && (
                  <CampusSidebarRailItem
                    icon={<Users size={20} />}
                    label="Band-Matching"
                    isActive={activeTab === 'matching'}
                    isCollapsed={false}
                    platform={activePlatform}
                    onClick={() => handleSelectTab('matching')}
                  />
                )}
                <CampusSidebarRailItem
                  icon={<Box size={20} />}
                  label="Bands"
                  isActive={activeTab === 'bands'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('bands')}
                />
                <CampusSidebarRailItem
                  icon={<Megaphone size={20} />}
                  label="Nachrichten"
                  isActive={activeTab === 'messages'}
                  isCollapsed={false}
                  platform={activePlatform}
                  badgeCount={studentMessages.filter((m: any) => !m.read_by?.includes(user?.id)).length}
                  onClick={() => handleSelectTab('messages')}
                />
              </>
            )
          ) : (
            // Lehrkraft & Verwaltung
            activePlatform === 'campus' ? (
              <>
                <CampusSidebarRailItem
                  icon={<Monitor size={20} />}
                  label="Briefing"
                  isActive={activeTab === 'briefing'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('briefing')}
                />
                <CampusSidebarRailItem
                  icon={<Calendar size={20} />}
                  label="Stundenplan"
                  isActive={activeTab === 'schedule'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('schedule')}
                />
                <CampusSidebarRailItem
                  icon={<Calendar size={20} />}
                  label="Termine"
                  isActive={activeTab === 'events'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('events')}
                />
                <CampusSidebarRailItem
                  icon={<Mail size={20} />}
                  label="Nachrichten"
                  isActive={activeTab === 'messages'}
                  isCollapsed={false}
                  platform={activePlatform}
                  badgeCount={unreadCount}
                  onClick={() => handleSelectTab('messages')}
                />
                <CampusSidebarRailItem
                  icon={<Users size={20} />}
                  label="Schüler"
                  isActive={activeTab === 'students'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('students')}
                />
                <CampusSidebarRailItem
                  icon={<Library size={20} />}
                  label="Mediathek"
                  isActive={activeTab === 'songs'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('songs')}
                />
                <CampusSidebarRailItem
                  icon={<Box size={20} />}
                  label="Räume"
                  isActive={activeTab === 'rooms'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('rooms')}
                />
                {showMissionsFeature && (
                  <CampusSidebarRailItem
                    icon={<Compass size={20} />}
                    label="Missions"
                    isActive={activeTab === 'missions'}
                    isCollapsed={false}
                    platform={activePlatform}
                    onClick={() => handleSelectTab('missions')}
                  />
                )}
                {userRole !== 'teacher' && (
                  <CampusSidebarRailItem
                    icon={<Trophy size={20} />}
                    label="Highlights & Fortschritt"
                    isActive={activeTab === 'stats'}
                    isCollapsed={false}
                    platform={activePlatform}
                    onClick={() => handleSelectTab('stats')}
                  />
                )}
                <CampusSidebarRailItem
                  icon={<Settings size={20} />}
                  label="Einstellungen"
                  isActive={activeTab === 'setup' || activeTab === 'settings'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab(isStaff ? 'setup' : 'settings')}
                />
              </>
            ) : activePlatform === 'ensembles' ? (
              <CampusSidebarRailItem
                icon={<Users size={20} />}
                label="Ensembles & Bands"
                isActive={activeTab === 'overview'}
                isCollapsed={false}
                platform={activePlatform}
                onClick={() => handleSelectTab('overview')}
              />
            ) : (
              // GrooveLab Mode Staff/Teacher
              <>
                <CampusSidebarRailItem
                  icon={<Monitor size={20} />}
                  label="Live Lab"
                  isActive={activeTab === 'live'}
                  isCollapsed={false}
                  platform={activePlatform}
                  hasPulseDot={true}
                  onClick={() => handleSelectTab('live')}
                />
                {school?.has_campus_subscription && (
                  <CampusSidebarRailItem
                    icon={<Mail size={20} />}
                    label="Nachrichten"
                    isActive={activeTab === 'messages'}
                    isCollapsed={false}
                    platform={activePlatform}
                    onClick={() => handleSelectTab('messages')}
                  />
                )}
                <CampusSidebarRailItem
                  icon={<Users size={20} />}
                  label="Schüler"
                  isActive={activeTab === 'students'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('students')}
                />
                <CampusSidebarRailItem
                  icon={<Shield size={20} />}
                  label="Team"
                  isActive={activeTab === 'team'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('team')}
                />
                {(school?.has_campus_subscription || school?.has_groovelab_subscription) && (
                  <CampusSidebarRailItem
                    icon={<Box size={20} />}
                    label="Räume"
                    isActive={activeTab === 'rooms'}
                    isCollapsed={false}
                    platform={activePlatform}
                    onClick={() => handleSelectTab('rooms')}
                  />
                )}
                <CampusSidebarRailItem
                  icon={<Library size={20} />}
                  label="Songs"
                  isActive={activeTab === 'songs'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('songs')}
                />
                <CampusSidebarRailItem
                  icon={<Box size={20} />}
                  label="Bands"
                  isActive={activeTab === 'bands'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('bands')}
                />
                <CampusSidebarRailItem
                  icon={<Music size={20} />}
                  label="Statistik"
                  isActive={activeTab === 'stats'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('stats')}
                />
                <CampusSidebarRailItem
                  icon={<QrCode size={20} />}
                  label="ID Galerie"
                  isActive={activeTab === 'gallery'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab('gallery')}
                />
                <CampusSidebarRailItem
                  icon={<Settings size={20} />}
                  label="Einstellungen"
                  isActive={activeTab === 'setup' || activeTab === 'settings'}
                  isCollapsed={false}
                  platform={activePlatform}
                  onClick={() => handleSelectTab(isStaff ? 'setup' : 'settings')}
                />
              </>
            )
          )}
        </nav>

        {/* ── 4. Bottom Dock: Pass Card + User Profile Card + Quiet Legal Links ── */}
        <div style={{
          marginTop: 'auto',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '10px',
          width: '100%',
          flexShrink: 0,
          boxSizing: 'border-box'
        }}>
          <CampusSidebarUserHub
            user={user}
            activePlatform={activePlatform}
            activeStudentTab={activeTab}
            setActiveStudentTab={(tab) => {
              setActiveTab(tab);
              onClose();
            }}
            activeWorkspace={activeWorkspace}
            teachers={teachers}
            session={session}
            isCollapsed={false}
            onShowQr={() => {
              onShowQr();
              onClose();
            }}
            onLogout={(confirmFirst, hardPurge) => {
              onLogout(confirmFirst, hardPurge);
              onClose();
            }}
            onOpenPrivacy={() => {
              onOpenPrivacy();
              onClose();
            }}
            onOpenAgb={() => {
              onOpenAgb();
              onClose();
            }}
            onOpenImpressum={() => {
              onOpenImpressum();
              onClose();
            }}
            onOpenAccessibility={() => {
              onOpenAccessibility();
              onClose();
            }}
            onSwitchActiveRole={(role) => {
              onSwitchActiveRole?.(role);
              onClose();
            }}
            isMusicStandMode={isMusicStandMode}
            toggleMusicStandMode={toggleMusicStandMode}
          />
        </div>
      </aside>
    </>
  );
};

export default CampusMobileSidebarDrawer;
