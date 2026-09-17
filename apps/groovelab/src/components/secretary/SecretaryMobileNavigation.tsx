import React from 'react';
import {
  LayoutDashboard, DoorOpen, Users, Award, Calendar,
  Monitor, GraduationCap, Settings, Menu, X, ShieldAlert,
  FileText, BookOpen, UserPlus, Sliders, QrCode, Lightbulb, LogOut, Clock
} from 'lucide-react';

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
  handleSecretaryLogout
}) => {
  return (
    <>
      {/* ─── Apple Glass Mobile Bottom Navigation for Administration & Secretariat ─── */}
      <nav className="cg-mobile-bottom-nav">
        {activeTab === 'secretary' && (
          <>
            <button
              type="button"
              className={`cg-bottom-nav-item ${secretarySubTab === 'briefing' ? 'active-admin' : ''}`}
              onClick={() => {
                React.startTransition(() => {
                  setSecretarySubTab('briefing');
                });
              }}
            >
              <LayoutDashboard size={20} color="currentColor" />
              <span>Briefing</span>
            </button>
            <button
              type="button"
              className={`cg-bottom-nav-item ${secretarySubTab === 'rooms' ? 'active-admin' : ''}`}
              onClick={() => {
                React.startTransition(() => {
                  setSecretarySubTab('rooms');
                });
              }}
            >
              <DoorOpen size={20} color="currentColor" />
              <span>Räume</span>
            </button>
            <button
              type="button"
              className={`cg-bottom-nav-item ${secretarySubTab === 'employees' ? 'active-admin' : ''}`}
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
              className={`cg-bottom-nav-item ${secretarySubTab === 'licenses' ? 'active-admin' : ''}`}
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
              className={`cg-bottom-nav-item ${campusSubTab === 'briefing' ? 'active-campus' : ''}`}
              onClick={() => setCampusSubTab('briefing')}
            >
              <LayoutDashboard size={20} color="currentColor" />
              <span>Start</span>
            </button>
            <button
              type="button"
              className={`cg-bottom-nav-item ${campusSubTab === 'schedules' ? 'active-campus' : ''}`}
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
              className={`cg-bottom-nav-item ${campusSubTab === 'students' ? 'active-campus' : ''}`}
              onClick={() => setCampusSubTab('students')}
            >
              <Users size={20} color="currentColor" />
              <span>Schüler</span>
            </button>
            <button
              type="button"
              className={`cg-bottom-nav-item ${campusSubTab === 'rooms' ? 'active-campus' : ''}`}
              onClick={() => setCampusSubTab('rooms')}
            >
              <DoorOpen size={20} color="currentColor" />
              <span>Räume</span>
            </button>
          </>
        )}

        {activeTab === 'groovelab' && (
          <>
            <button
              type="button"
              className={`cg-bottom-nav-item ${groovelabSubTab === 'live' ? 'active-groovelab' : ''}`}
              onClick={() => setGroovelabSubTab('live')}
            >
              <Monitor size={20} color="currentColor" />
              <span>Live Lab</span>
            </button>
            <button
              type="button"
              className={`cg-bottom-nav-item ${groovelabSubTab === 'coaches' ? 'active-groovelab' : ''}`}
              onClick={() => setGroovelabSubTab('coaches')}
            >
              <GraduationCap size={20} color="currentColor" />
              <span>Lehrer</span>
            </button>
            <button
              type="button"
              className={`cg-bottom-nav-item ${groovelabSubTab === 'students' ? 'active-groovelab' : ''}`}
              onClick={() => setGroovelabSubTab('students')}
            >
              <Users size={20} color="currentColor" />
              <span>Schüler</span>
            </button>
            <button
              type="button"
              className={`cg-bottom-nav-item ${groovelabSubTab === 'settings' ? 'active-groovelab' : ''}`}
              onClick={() => setGroovelabSubTab('settings')}
            >
              <Settings size={20} color="currentColor" />
              <span>Setup</span>
            </button>
          </>
        )}

        {/* Universal Menü Drawer Button */}
        <button
          type="button"
          className={`cg-bottom-nav-item ${mobileSecretaryDrawerOpen ? (activeTab === 'secretary' ? 'active-admin' : activeTab === 'campus' ? 'active-campus' : 'active-groovelab') : ''}`}
          onClick={() => setMobileSecretaryDrawerOpen(true)}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Menu size={20} color="currentColor" />
          </div>
          <span>Menü</span>
        </button>
      </nav>

      {/* ─── Mobile Slide-Over Drawer for Administration & Secretariat ─── */}
      {mobileSecretaryDrawerOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setMobileSecretaryDrawerOpen(false)}
        >
          <div 
            style={{
              width: '88%',
              maxWidth: '380px',
              height: '100%',
              background: '#ffffff',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.2)',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              overflowY: 'auto',
              boxSizing: 'border-box'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>Verwaltung Menü</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '100px',
                  background: activeTab === 'secretary' ? '#fce8e6' : (activeTab === 'campus' ? '#e6f4ea' : '#fefce8'),
                  color: activeTab === 'secretary' ? '#ea4335' : (activeTab === 'campus' ? '#34a853' : '#ca8a04'),
                  fontSize: '0.68rem',
                  fontWeight: 800
                }}>
                  {activeTab === 'secretary' ? '🛡️ Verwaltung' : (activeTab === 'campus' ? '🎓 Campus' : '🎵 GrooveLab')}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setMobileSecretaryDrawerOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* 1-Tap Module Switcher */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modul wechseln:</span>
              <div role="tablist" aria-label="Schnellwechsel Modul" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
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
                    padding: '8px 4px',
                    borderRadius: '10px',
                    border: activeTab === 'secretary' ? '1.5px solid #ea4335' : '1px solid #e2e8f0',
                    background: activeTab === 'secretary' ? '#ea4335' : '#f8fafc',
                    color: activeTab === 'secretary' ? '#ffffff' : '#475569',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  🛡️ Verwaltung
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
                    padding: '8px 4px',
                    borderRadius: '10px',
                    border: activeTab === 'campus' ? '1.5px solid #34a853' : '1px solid #e2e8f0',
                    background: activeTab === 'campus' ? '#34a853' : '#f8fafc',
                    color: activeTab === 'campus' ? '#ffffff' : '#475569',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  🎓 Campus
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
                    padding: '8px 4px',
                    borderRadius: '10px',
                    border: activeTab === 'groovelab' ? '1.5px solid #ca8a04' : '1px solid #e2e8f0',
                    background: activeTab === 'groovelab' ? '#ca8a04' : '#f8fafc',
                    color: activeTab === 'groovelab' ? '#ffffff' : '#475569',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  🎵 GrooveLab
                </button>
              </div>
            </div>

            {/* Subtabs list for active module */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px' }}>Funktionen &amp; Boards:</span>
              
              {activeTab === 'secretary' && [
                { id: 'briefing', label: 'Briefing', icon: LayoutDashboard },
                hasCampusSub && { 
                  id: 'crisis', 
                  label: 'Ausfall-Cockpit', 
                  icon: ShieldAlert, 
                  count: (() => {
                    const todayStart = new Date();
                    todayStart.setHours(0,0,0,0);
                    return crisisNotifications.filter(n => {
                      if (n.status !== 'UNREAD') return false;
                      const untilVal = n.teacher?.ausfall_until ?? n.teacher?.ausfallUntil;
                      if (!n.teacher || !untilVal) return false;
                      const absenceUntilTime = new Date(untilVal).getTime();
                      if (absenceUntilTime < todayStart.getTime()) return false;
                      const isPast = new Date(n.slot_start_datetime).getTime() < todayStart.getTime();
                      return !isPast;
                    }).length;
                  })()
                },
                hasCampusSub && { id: 'announcements', label: 'Mitteilungen & Informationen', icon: FileText },
                { id: 'rooms', label: 'Räume', icon: DoorOpen },
                hasCampusSub && { id: 'equipment', label: 'Instrumente & Ausstattung', icon: Settings },
                { id: 'employees', label: 'Mitarbeiter', icon: Users },
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
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: isSelected ? '#fce8e6' : 'transparent',
                      color: isSelected ? '#ea4335' : '#334155',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      textAlign: 'left'
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
                { id: 'briefing', label: 'Startseite', icon: LayoutDashboard },
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
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: isSelected ? '#e6f4ea' : 'transparent',
                      color: isSelected ? '#34a853' : '#334155',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      textAlign: 'left'
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
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: isSelected ? '#fefce8' : 'transparent',
                      color: isSelected ? '#ca8a04' : '#334155',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Icon size={18} color={isSelected ? '#ca8a04' : '#64748b'} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Actions Footer in Drawer */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setMobileSecretaryDrawerOpen(false);
                  setShowOwnQrModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(234, 67, 53, 0.25)',
                  background: 'rgba(234, 67, 53, 0.08)',
                  color: '#ea4335',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <QrCode size={16} /> <span>Ausweis zeigen</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileSecretaryDrawerOpen(false);
                  setIsFeedbackModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Lightbulb size={16} /> <span>Feedback &amp; Ideen</span>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={handleSecretaryLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #fee2e2',
                    background: '#fef2f2',
                    color: '#ef4444',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <LogOut size={16} /> <span>Abmelden</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
