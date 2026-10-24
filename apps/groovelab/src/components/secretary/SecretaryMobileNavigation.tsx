import React from 'react';
import {
  LayoutDashboard, DoorOpen, Users, Award, Calendar,
  Monitor, GraduationCap, Settings, Menu, X, ShieldAlert,
  FileText, BookOpen, UserPlus, Sliders, QrCode, Lightbulb, LogOut, Clock,
  School, User, Shield, Music, ArrowLeftRight
} from 'lucide-react';
import { SecretaryUserProfile } from './SecretarySidebar';

export interface SecretaryMobileNavigationProps {
  activeTab: 'campus' | 'secretary' | 'groovelab';
  setActiveTab: (tab: any) => void;
  secretarySubTab: string;
  setSecretarySubTab: (subTab: any) => void;
  campusSubTab: string;
  setCampusSubTab: (subTab: any) => void;
  groovelabSubTab: string;
  setGroovelabSubTab: (subTab: any) => void;
  hasCampusSub: boolean;
  hasGroovelabSub?: boolean;
  crisisNotifications: any[];
  enabledCampusSubjects: boolean;
  enabledCampusRooms: boolean;
  enabledCampusEvents: boolean;
  enabledCampusSchedules: boolean;
  pendingSchedules: any[];
  mobileSecretaryDrawerOpen: boolean;
  setMobileSecretaryDrawerOpen: (open: boolean) => void;
  setShowOwnQrModal: (show: boolean) => void;
  setIsFeedbackModalOpen: (show: boolean) => void;
  onLogout?: () => void;
  handleSecretaryLogout: () => void;
  schoolName?: string;
  currentUserProfile?: SecretaryUserProfile | null;
  isCurrentUserTeacher?: boolean;
  onRoleSwitched?: (role: string) => void;
  onOpenPersonalSecurity?: () => void;
  onOpenPrivacy?: () => void;
  onOpenAgb?: () => void;
  onOpenImpressum?: () => void;
  onOpenAccessibility?: () => void;
}

export const SecretaryMobileNavigation: React.FC<SecretaryMobileNavigationProps> = ({
  activeTab,
  setActiveTab,
  secretarySubTab,
  setSecretarySubTab,
  campusSubTab,
  setCampusSubTab,
  groovelabSubTab,
  setGroovelabSubTab,
  hasCampusSub,
  crisisNotifications,
  enabledCampusSubjects,
  enabledCampusRooms,
  enabledCampusEvents,
  enabledCampusSchedules,
  pendingSchedules,
  mobileSecretaryDrawerOpen,
  setMobileSecretaryDrawerOpen,
  setShowOwnQrModal,
  setIsFeedbackModalOpen,
  onLogout,
  handleSecretaryLogout,
  schoolName,
  currentUserProfile,
  isCurrentUserTeacher = false,
  onRoleSwitched,
  onOpenPersonalSecurity,
  onOpenPrivacy,
  onOpenAgb,
  onOpenImpressum,
  onOpenAccessibility
}) => {
  const unreadCrisisCount = (() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return (crisisNotifications || []).filter(n => {
      if (n.status !== 'UNREAD') return false;
      const untilVal = n.teacher?.ausfall_until ?? n.teacher?.ausfallUntil;
      if (!n.teacher || !untilVal) return false;
      const absenceUntilTime = new Date(untilVal).getTime();
      if (absenceUntilTime < todayStart.getTime()) return false;
      const isPast = new Date(n.slot_start_datetime).getTime() < todayStart.getTime();
      return !isPast;
    }).length;
  })();

  const userDisplayName = currentUserProfile
    ? `${currentUserProfile.first_name || ''} ${currentUserProfile.last_name || ''}`.trim()
    : (schoolName ? `${schoolName} Schulleitung` : 'Verwaltung');

  return (
    <>
      {/* ─── Apple Glass Mobile Bottom Navigation for Administration & Secretariat (5 Thumb-Zone Tabs) ─── */}
      <nav
        className="secretary-mobile-bottom-dock student-briefing-mobile-bottom-dock"
        aria-label="Verwaltung Schnellnavigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          zIndex: 900,
          height: 'calc(50px + max(6px, calc(env(safe-area-inset-bottom, 0px) * 0.45)))',
          paddingBottom: 'max(6px, calc(env(safe-area-inset-bottom, 0px) * 0.45))',
          paddingTop: '6px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          boxShadow: '0 -4px 20px rgba(15, 23, 42, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          boxSizing: 'border-box'
        }}
      >
        {activeTab === 'secretary' && (
          <>
            <button
              type="button"
              aria-current={secretarySubTab === 'briefing' ? 'page' : undefined}
              className={`cg-bottom-nav-item ${secretarySubTab === 'briefing' ? 'active-admin' : ''}`}
              style={{ minHeight: '44px' }}
              onClick={() => {
                React.startTransition(() => {
                  setSecretarySubTab('briefing');
                });
              }}
            >
              <LayoutDashboard size={20} color="currentColor" />
              <span>Cockpit</span>
            </button>
            <button
              type="button"
              aria-current={secretarySubTab === 'rooms' ? 'page' : undefined}
              className={`cg-bottom-nav-item ${secretarySubTab === 'rooms' ? 'active-admin' : ''}`}
              style={{ minHeight: '44px' }}
              onClick={() => {
                React.startTransition(() => {
                  setSecretarySubTab('rooms');
                });
              }}
            >
              <DoorOpen size={20} color="currentColor" />
              <span>Räume</span>
            </button>
            {hasCampusSub ? (
              <button
                type="button"
                aria-current={secretarySubTab === 'crisis' ? 'page' : undefined}
                className={`cg-bottom-nav-item ${secretarySubTab === 'crisis' ? 'active-admin' : ''}`}
                style={{ minHeight: '44px' }}
                onClick={() => {
                  React.startTransition(() => {
                    setSecretarySubTab('crisis');
                  });
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={20} color="currentColor" />
                  {unreadCrisisCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-8px',
                      background: '#ea4335',
                      color: '#ffffff',
                      borderRadius: '999px',
                      padding: '1px 5px',
                      fontSize: '9px',
                      fontWeight: 900,
                      lineHeight: 1
                    }}>
                      {unreadCrisisCount}
                    </span>
                  )}
                </div>
                <span>Ausfälle</span>
              </button>
            ) : (
              <button
                type="button"
                aria-current={secretarySubTab === 'announcements' ? 'page' : undefined}
                className={`cg-bottom-nav-item ${secretarySubTab === 'announcements' ? 'active-admin' : ''}`}
                style={{ minHeight: '44px' }}
                onClick={() => {
                  React.startTransition(() => {
                    setSecretarySubTab('announcements');
                  });
                }}
              >
                <FileText size={20} color="currentColor" />
                <span>Infos</span>
              </button>
            )}
            <button
              type="button"
              aria-current={secretarySubTab === 'employees' ? 'page' : undefined}
              className={`cg-bottom-nav-item ${secretarySubTab === 'employees' ? 'active-admin' : ''}`}
              style={{ minHeight: '44px' }}
              onClick={() => {
                React.startTransition(() => {
                  setSecretarySubTab('employees');
                });
              }}
            >
              <Users size={20} color="currentColor" />
              <span>Team</span>
            </button>
            <button
              type="button"
              aria-current={secretarySubTab === 'licenses' ? 'page' : undefined}
              className={`cg-bottom-nav-item ${secretarySubTab === 'licenses' ? 'active-admin' : ''}`}
              style={{ minHeight: '44px' }}
              onClick={() => {
                React.startTransition(() => {
                  setSecretarySubTab('licenses');
                });
              }}
            >
              <Award size={20} color="currentColor" />
              <span>Gebühren</span>
            </button>
          </>
        )}

        {activeTab === 'campus' && (
          <>
            <button
              type="button"
              aria-current={campusSubTab === 'briefing' ? 'page' : undefined}
              className={`cg-bottom-nav-item ${campusSubTab === 'briefing' ? 'active-campus' : ''}`}
              style={{ minHeight: '44px' }}
              onClick={() => setCampusSubTab('briefing')}
            >
              <LayoutDashboard size={20} color="currentColor" />
              <span>Zentrale</span>
            </button>
            <button
              type="button"
              aria-current={campusSubTab === 'schedules' ? 'page' : undefined}
              className={`cg-bottom-nav-item ${campusSubTab === 'schedules' ? 'active-campus' : ''}`}
              style={{ minHeight: '44px' }}
              onClick={() => setCampusSubTab('schedules')}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={20} color="currentColor" />
                {pendingSchedules.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-7px',
                    background: '#34a853',
                    color: 'white',
                    borderRadius: '999px',
                    padding: '1px 5px',
                    fontSize: '9px',
                    fontWeight: 900,
                    lineHeight: 1
                  }}>
                    {pendingSchedules.length}
                  </span>
                )}
              </div>
              <span>Pläne</span>
            </button>
            <button
              type="button"
              aria-current={campusSubTab === 'students' ? 'page' : undefined}
              className={`cg-bottom-nav-item ${campusSubTab === 'students' ? 'active-campus' : ''}`}
              style={{ minHeight: '44px' }}
              onClick={() => setCampusSubTab('students')}
            >
              <Users size={20} color="currentColor" />
              <span>Schüler</span>
            </button>
            <button
              type="button"
              aria-current={campusSubTab === 'onboarding' ? 'page' : undefined}
              className={`cg-bottom-nav-item ${campusSubTab === 'onboarding' ? 'active-campus' : ''}`}
              style={{ minHeight: '44px' }}
              onClick={() => setCampusSubTab('onboarding')}
            >
              <UserPlus size={20} color="currentColor" />
              <span>Lehrer</span>
            </button>
            {enabledCampusEvents ? (
              <button
                type="button"
                aria-current={campusSubTab === 'events' ? 'page' : undefined}
                className={`cg-bottom-nav-item ${campusSubTab === 'events' ? 'active-campus' : ''}`}
                style={{ minHeight: '44px' }}
                onClick={() => setCampusSubTab('events')}
              >
                <Clock size={20} color="currentColor" />
                <span>Termine</span>
              </button>
            ) : (
              <button
                type="button"
                aria-current={campusSubTab === 'rooms' ? 'page' : undefined}
                className={`cg-bottom-nav-item ${campusSubTab === 'rooms' ? 'active-campus' : ''}`}
                style={{ minHeight: '44px' }}
                onClick={() => setCampusSubTab('rooms')}
              >
                <DoorOpen size={20} color="currentColor" />
                <span>Räume</span>
              </button>
            )}
          </>
        )}

        {activeTab === 'groovelab' && (
          <>
            <button
              type="button"
              aria-current={groovelabSubTab === 'live' ? 'page' : undefined}
              className={`cg-bottom-nav-item ${groovelabSubTab === 'live' ? 'active-groovelab' : ''}`}
              style={{ minHeight: '44px' }}
              onClick={() => setGroovelabSubTab('live')}
            >
              <Monitor size={20} color="currentColor" />
              <span>Live Lab</span>
            </button>
            <button
              type="button"
              aria-current={groovelabSubTab === 'coaches' ? 'page' : undefined}
              className={`cg-bottom-nav-item ${groovelabSubTab === 'coaches' ? 'active-groovelab' : ''}`}
              style={{ minHeight: '44px' }}
              onClick={() => setGroovelabSubTab('coaches')}
            >
              <GraduationCap size={20} color="currentColor" />
              <span>Lehrer</span>
            </button>
            <button
              type="button"
              aria-current={groovelabSubTab === 'students' ? 'page' : undefined}
              className={`cg-bottom-nav-item ${groovelabSubTab === 'students' ? 'active-groovelab' : ''}`}
              style={{ minHeight: '44px' }}
              onClick={() => setGroovelabSubTab('students')}
            >
              <Users size={20} color="currentColor" />
              <span>Schüler</span>
            </button>
            <button
              type="button"
              aria-current={groovelabSubTab === 'settings' ? 'page' : undefined}
              className={`cg-bottom-nav-item ${groovelabSubTab === 'settings' ? 'active-groovelab' : ''}`}
              style={{ minHeight: '44px' }}
              onClick={() => setGroovelabSubTab('settings')}
            >
              <Settings size={20} color="currentColor" />
              <span>Setup</span>
            </button>
            <button
              type="button"
              className="cg-bottom-nav-item"
              style={{ minHeight: '44px' }}
              onClick={() => {
                React.startTransition(() => {
                  setActiveTab('secretary');
                  setSecretarySubTab('briefing');
                });
              }}
            >
              <Shield size={20} color="currentColor" />
              <span>Verwaltung</span>
            </button>
          </>
        )}
      </nav>

      {/* ─── 0,1% Goldstandard: Left Slide-Over Sidebar Drawer (1:1 Parity with SecretarySidebar & CampusMobileSidebarDrawer) ─── */}
      {mobileSecretaryDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Hauptmenü Schulsekretariat & Verwaltung"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.50)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'flex-start',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setMobileSecretaryDrawerOpen(false)}
        >
          <aside
            style={{
              width: 'min(320px, 86vw)',
              maxWidth: '340px',
              height: '100dvh',
              background: '#ffffff',
              boxShadow: '12px 0 40px rgba(15, 23, 42, 0.22)',
              padding: 'max(18px, env(safe-area-inset-top, 18px)) 16px max(20px, env(safe-area-inset-bottom, 20px))',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflowY: 'auto',
              boxSizing: 'border-box',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 1. School Identity Header + Tactile 44x44px 'X' Close Button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  background: activeTab === 'campus'
                    ? 'rgba(52, 168, 83, 0.12)'
                    : activeTab === 'groovelab'
                      ? 'rgba(234, 179, 8, 0.16)'
                      : 'rgba(234, 67, 53, 0.10)',
                  color: activeTab === 'campus'
                    ? '#15803d'
                    : activeTab === 'groovelab'
                      ? '#b45309'
                      : '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <School size={19} strokeWidth={2.2} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    letterSpacing: '-0.02em'
                  }}>
                    {schoolName || 'Meine Musikschule'}
                  </span>
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em'
                  }}>
                    Schulleitung &amp; Sekretariat
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileSecretaryDrawerOpen(false)}
                aria-label="Hauptmenü schließen"
                title="Hauptmenü schließen"
                style={{
                  width: '44px',
                  height: '44px',
                  minWidth: '44px',
                  minHeight: '44px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#f1f5f9',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0
                }}
              >
                <X size={20} strokeWidth={2.4} />
              </button>
            </div>

            {/* 2. Dual-Role Switcher Pill ("Zum Lehrerpult") */}
            {isCurrentUserTeacher && onRoleSwitched && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setMobileSecretaryDrawerOpen(false);
                  onRoleSwitched('teacher');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  minHeight: '44px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: '#f0fdf4',
                  border: 'none',
                  color: '#15803d',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <ArrowLeftRight size={15} color="#16a34a" />
                <GraduationCap size={16} color="#16a34a" />
                <span>Zum Lehrerpult wechseln</span>
              </button>
            )}

            {/* 3. Apple Segmented Control: 3-Modul Switcher [Verwaltung | Campus | GrooveLab] */}
            <div
              role="tablist"
              aria-label="Modulauswahl Verwaltung, Campus und GrooveLab"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '4px',
                background: '#f1f5f9',
                padding: '4px',
                borderRadius: '12px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'secretary'}
                id="quick-tab-secretary"
                onClick={() => {
                  setActiveTab('secretary');
                  sessionStorage.setItem('groovelab_active_workspace', 'secretary');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  minHeight: '38px',
                  padding: '6px 4px',
                  borderRadius: '9px',
                  border: 'none',
                  background: activeTab === 'secretary' ? '#ea4335' : 'transparent',
                  color: activeTab === 'secretary' ? '#ffffff' : '#64748b',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <Shield size={13} color={activeTab === 'secretary' ? '#ffffff' : '#64748b'} />
                <span>Verwaltung</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'campus'}
                id="quick-tab-campus"
                onClick={() => {
                  setActiveTab('campus');
                  sessionStorage.setItem('groovelab_active_workspace', 'campus');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  minHeight: '38px',
                  padding: '6px 4px',
                  borderRadius: '9px',
                  border: 'none',
                  background: activeTab === 'campus' ? '#34a853' : 'transparent',
                  color: activeTab === 'campus' ? '#ffffff' : '#64748b',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <GraduationCap size={13} color={activeTab === 'campus' ? '#ffffff' : '#64748b'} />
                <span>Campus</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'groovelab'}
                id="quick-tab-groovelab"
                onClick={() => {
                  setActiveTab('groovelab');
                  sessionStorage.setItem('groovelab_active_workspace', 'groovelab');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  minHeight: '38px',
                  padding: '6px 4px',
                  borderRadius: '9px',
                  border: 'none',
                  background: activeTab === 'groovelab' ? '#facc15' : 'transparent',
                  color: activeTab === 'groovelab' ? '#0f172a' : '#64748b',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <Music size={13} color={activeTab === 'groovelab' ? '#0f172a' : '#64748b'} />
                <span>GrooveLab</span>
              </button>
            </div>

            {/* 4. Scrollable Pill Navigation List for Active Module */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 6px 2px' }}>
                {activeTab === 'secretary' ? 'Verwaltung & Governance' : activeTab === 'campus' ? 'Campus Steuerung' : 'GrooveLab Steuerung'}
              </span>

              {activeTab === 'secretary' && [
                { id: 'briefing', label: 'Briefing & Cockpit', icon: LayoutDashboard },
                hasCampusSub && {
                  id: 'crisis',
                  label: 'Ausfall-Cockpit',
                  icon: ShieldAlert,
                  count: unreadCrisisCount
                },
                hasCampusSub && { id: 'announcements', label: 'Mitteilungen & Infos', icon: FileText },
                { id: 'rooms', label: 'Räume & Belegung', icon: DoorOpen },
                hasCampusSub && { id: 'equipment', label: 'Instrumente & Ausstattung', icon: Settings },
                { id: 'employees', label: 'Mitarbeiter & Rollen', icon: Users },
                { id: 'licenses', label: 'Abrechnung & Infrastruktur', icon: Award },
                { id: 'audit', label: 'Änderungsverlauf', icon: Clock },
                { id: 'setup', label: 'Einstellungen', icon: Settings }
              ].filter((item): item is any => !!item).map((item) => {
                const Icon = item.icon;
                const isSelected = secretarySubTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      React.startTransition(() => {
                        setSecretarySubTab(item.id as any);
                      });
                      setMobileSecretaryDrawerOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minHeight: '42px',
                      padding: '9px 12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: isSelected ? '#fce8e6' : 'transparent',
                      color: isSelected ? '#b91c1c' : '#334155',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxSizing: 'border-box'
                    }}
                  >
                    <Icon size={18} color={isSelected ? '#ea4335' : '#64748b'} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span style={{
                        background: '#ea4335',
                        color: '#ffffff',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '100px'
                      }}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}

              {activeTab === 'campus' && [
                { id: 'briefing', label: 'Campus-Zentrale', icon: LayoutDashboard },
                enabledCampusSubjects && { id: 'subjects', label: 'Unterrichtsfächer', icon: BookOpen },
                { id: 'onboarding', label: 'Lehrer', icon: UserPlus },
                { id: 'students', label: 'Schüler', icon: Users },
                enabledCampusRooms && { id: 'rooms', label: 'Räume', icon: DoorOpen },
                enabledCampusEvents && { id: 'events', label: 'Termine', icon: Calendar },
                enabledCampusSchedules && { id: 'schedules', label: 'Stundenpläne', count: pendingSchedules.length, icon: Calendar },
                { id: 'status', label: 'Einstellungen', icon: Sliders }
              ].filter((item): item is any => !!item).map((item) => {
                const Icon = item.icon;
                const isSelected = campusSubTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCampusSubTab(item.id as any);
                      setMobileSecretaryDrawerOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minHeight: '42px',
                      padding: '9px 12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: isSelected ? '#e6f4ea' : 'transparent',
                      color: isSelected ? '#15803d' : '#334155',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxSizing: 'border-box'
                    }}
                  >
                    <Icon size={18} color={isSelected ? '#34a853' : '#64748b'} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span style={{
                        background: '#34a853',
                        color: '#ffffff',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '100px'
                      }}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}

              {activeTab === 'groovelab' && [
                { id: 'live', label: 'Live Lab', icon: Monitor },
                { id: 'coaches', label: 'Lehrer', icon: GraduationCap },
                { id: 'students', label: 'Schüler', icon: Users },
                { id: 'settings', label: 'Einstellungen', icon: Settings }
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = groovelabSubTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setGroovelabSubTab(item.id as any);
                      setMobileSecretaryDrawerOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minHeight: '42px',
                      padding: '9px 12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: isSelected ? '#fefce8' : 'transparent',
                      color: isSelected ? '#a16207' : '#334155',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxSizing: 'border-box'
                    }}
                  >
                    <Icon size={18} color={isSelected ? '#ca8a04' : '#64748b'} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 5. Bottom User Hub Dock (Verwaltungs-Pass, Profile & Personal Security, Logout, Legal) */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Verwaltungs-Pass Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(254, 242, 242, 0.7) 0%, rgba(254, 226, 226, 0.35) 100%)',
                borderRadius: '14px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0f172a' }}>Verwaltungs-Pass</span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>QR-Zugangsausweis</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileSecretaryDrawerOpen(false);
                    setShowOwnQrModal(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#ea4335',
                    color: '#ffffff',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <QrCode size={14} />
                  <span>Ausweis</span>
                </button>
              </div>

              {/* User Profile + Personal Security + Logout Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '8px 10px'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setMobileSecretaryDrawerOpen(false);
                    if (onOpenPersonalSecurity) onOpenPersonalSecurity();
                  }}
                  title="Persönliches Profil & Sicherheit öffnen"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: 0,
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <User size={16} strokeWidth={2.3} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {userDisplayName}
                    </span>
                    <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700 }}>
                      Sicherheit &amp; PIN →
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileSecretaryDrawerOpen(false);
                    setIsFeedbackModalOpen(true);
                  }}
                  title="Feedback & Ideen"
                  aria-label="Feedback & Ideen"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '9px',
                    border: 'none',
                    background: '#ffffff',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <Lightbulb size={16} />
                </button>

                {onLogout && (
                  <button
                    type="button"
                    onClick={handleSecretaryLogout}
                    title="Sicher abmelden"
                    aria-label="Abmelden"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '9px',
                      border: 'none',
                      background: '#fee2e2',
                      color: '#b91c1c',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <LogOut size={14} />
                    <span>Abmelden</span>
                  </button>
                )}
              </div>

              {/* Legal Links Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                paddingTop: '2px'
              }}>
                {onOpenPrivacy && (
                  <button type="button" onClick={() => { setMobileSecretaryDrawerOpen(false); onOpenPrivacy(); }} style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>
                    Datenschutz
                  </button>
                )}
                {onOpenAgb && (
                  <button type="button" onClick={() => { setMobileSecretaryDrawerOpen(false); onOpenAgb(); }} style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>
                    • AGB
                  </button>
                )}
                {onOpenImpressum && (
                  <button type="button" onClick={() => { setMobileSecretaryDrawerOpen(false); onOpenImpressum(); }} style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>
                    • Impressum
                  </button>
                )}
                {onOpenAccessibility && (
                  <button type="button" onClick={() => { setMobileSecretaryDrawerOpen(false); onOpenAccessibility(); }} style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>
                    • Barrierefreiheit
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

