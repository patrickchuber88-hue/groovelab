import React from 'react';
import { 
  Shield, 
  GraduationCap, 
  Music, 
  LayoutDashboard, 
  ShieldAlert, 
  FileText, 
  DoorOpen, 
  Settings, 
  Users, 
  Award, 
  Clock, 
  BookOpen, 
  UserPlus, 
  Calendar, 
  Sliders, 
  Monitor, 
  QrCode, 
  LogOut 
} from 'lucide-react';
import { TourStartButton } from '../PremiumOnboardingTour';

export interface SecretaryUserProfile {
  id?: string;
  nickname?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  email?: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface CrisisNotificationItem {
  status: string;
  slot_start_datetime: string;
  teacher?: {
    ausfall_until?: string;
    ausfallUntil?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SecretarySidebarProps {
  activeTab: 'secretary' | 'campus' | 'groovelab';
  secretarySubTab: string;
  setSecretarySubTab: (tab: any) => void;
  campusSubTab: string;
  setCampusSubTab: (tab: any) => void;
  groovelabSubTab: string;
  setGroovelabSubTab: (tab: any) => void;
  hasCampusSub: boolean;
  hasGroovelabSub?: boolean;
  enabledCampusSubjects: boolean;
  enabledCampusRooms: boolean;
  enabledCampusEvents: boolean;
  enabledCampusSchedules: boolean;
  crisisNotifications: CrisisNotificationItem[];
  pendingSchedules: unknown[];
  startTour: () => void;
  currentUserProfile: SecretaryUserProfile | null;
  setShowOwnQrModal: (show: boolean) => void;
  onLogout?: () => void;
  handleSecretaryLogout: () => void;
}

export const SecretarySidebar: React.FC<SecretarySidebarProps> = ({
  activeTab,
  secretarySubTab,
  setSecretarySubTab,
  campusSubTab,
  setCampusSubTab,
  groovelabSubTab,
  setGroovelabSubTab,
  hasCampusSub,
  enabledCampusSubjects,
  enabledCampusRooms,
  enabledCampusEvents,
  enabledCampusSchedules,
  crisisNotifications,
  pendingSchedules,
  startTour,
  currentUserProfile,
  setShowOwnQrModal,
  onLogout,
  handleSecretaryLogout
}) => {
  return (
    <div 
      className="glass-sidebar"
      style={{
        width: '280px',
        padding: '36px 20px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        height: '100vh',
        boxSizing: 'border-box',
        overflowY: 'auto',
        flexShrink: 0,
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0'
      }}
    >
      {/* Brand header / Logo */}
      <div style={{ paddingBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}>
            {activeTab === 'secretary' ? (
              <Shield size={28} color="#ea4335" strokeWidth={3} />
            ) : activeTab === 'campus' ? (
              <GraduationCap size={28} color="#34a853" strokeWidth={3} />
            ) : (
              <Music size={28} color="#eab308" strokeWidth={3} />
            )}
          </div>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 900, 
            color: activeTab === 'secretary' ? '#ea4335' : activeTab === 'campus' ? '#34a853' : '#eab308',
            letterSpacing: '-0.02em',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            {activeTab === 'secretary' ? 'Verwaltung' : activeTab === 'campus' ? 'Campus' : 'GrooveLab'}
          </div>
        </div>
        {activeTab === 'secretary' && secretarySubTab === 'briefing' && (
          <TourStartButton 
            onClick={startTour}
            platformTheme="admin"
          />
        )}
      </div>

      {/* Dynamic Sidebar Nav Items based on active workspace */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        
        {/* If activeTab is Secretary */}
        {activeTab === 'secretary' && ([
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
        ] as any[]).filter(Boolean).map((item: any) => {
          const Icon = item.icon;
          const isSelected = secretarySubTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                React.startTransition(() => {
                  setSecretarySubTab(item.id as any);
                });
              }}
              className={`google-sidebar-item briefing ${isSelected ? 'active briefing' : ''}`}
            >
              <div className="sidebar-icon-circle briefing">
                <Icon size={16} />
              </div>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span style={{
                  background: isSelected ? '#ea4335' : '#fce8e6',
                  color: isSelected ? '#ffffff' : '#c5221f',
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

        {/* If activeTab is Campus */}
        {activeTab === 'campus' && ([
          { id: 'briefing', label: 'Startseite', icon: LayoutDashboard },
          enabledCampusSubjects && { id: 'subjects', label: 'Unterrichtsfächer', icon: BookOpen },
          { id: 'onboarding', label: 'Lehrer', icon: UserPlus },
          { id: 'students', label: 'Schüler', icon: Users },
          enabledCampusRooms && { id: 'rooms', label: 'Räume', icon: DoorOpen },
          enabledCampusEvents && { id: 'events', label: 'Termine', icon: Calendar },
          enabledCampusSchedules && { id: 'schedules', label: `Stundenpläne`, count: pendingSchedules.length, icon: Calendar },
          { id: 'status', label: 'Einstellungen', icon: Sliders }
        ] as any[]).filter(Boolean).map((item: any) => {
          const Icon = item.icon;
          const isSelected = campusSubTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCampusSubTab(item.id as any)}
              className={`google-sidebar-item campus ${isSelected ? 'active campus' : ''}`}
            >
              <div className="sidebar-icon-circle campus">
                <Icon size={16} />
              </div>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span style={{
                  background: isSelected ? '#34a853' : '#e6f4ea',
                  color: isSelected ? '#ffffff' : '#34a853',
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

        {/* If activeTab is GrooveLab */}
        {activeTab === 'groovelab' && [
          { id: 'live', label: 'Live Lab', icon: Monitor },
          { id: 'coaches', label: 'Lehrer', icon: GraduationCap },
          { id: 'students', label: 'Schüler', icon: Users },
          { id: 'settings', label: 'Einstellungen', icon: Settings }
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = groovelabSubTab === item.id;
          const itemClass = 'google-sidebar-item groovelab-dark';
          return (
            <button
              key={item.id}
              onClick={() => setGroovelabSubTab(item.id as any)}
              className={`${itemClass} ${isSelected ? 'active' : ''}`}
            >
              <div className="sidebar-icon-circle groovelab">
                <Icon size={16} />
              </div>
              <span style={{ flex: 1 }}>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Profile Info at bottom of sidebar */}
      <div style={{ borderTop: activeTab === 'campus' ? '1px solid #e6f4ea' : (activeTab === 'secretary' ? '1px solid #fee2e2' : '1px solid #fef3c7'), paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setShowOwnQrModal(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowOwnQrModal(true);
            }
          }}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '10px 12px', 
            borderRadius: '16px', 
            cursor: 'pointer', 
            transition: 'all 0.2s ease', 
            backgroundColor: secretarySubTab === 'briefing' ? (activeTab === 'campus' ? '#e6f4ea' : (activeTab === 'secretary' ? '#fff1f2' : '#fffbeb')) : '#f8fafc', 
            border: '1px solid #f1f5f9' 
          }}
          aria-label="Eigenen Ausweis öffnen"
        >
          <div style={{ position: 'relative' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <img 
                src="/campus_login_hero.png"
                alt="" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} 
                loading="lazy" 
              />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUserProfile?.nickname || currentUserProfile?.first_name || 'Verwaltung'}
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Schulsekretariat
            </div>
          </div>
        </div>

        {/* Ausweis Button - Always Red for Verwaltung/Sekretariat */}
        <button 
          type="button"
          onClick={() => setShowOwnQrModal(true)}
          style={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            padding: '10px 12px', 
            borderRadius: '12px', 
            border: '1.5px solid rgba(234, 67, 53, 0.25)', 
            background: 'rgba(234, 67, 53, 0.08)', 
            color: '#ea4335', 
            fontWeight: 800, 
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(234, 67, 53, 0.05)',
            transition: 'all 0.2s ease'
          }}
          className="hover-scale"
        >
          <QrCode size={16} color="#ea4335" /> Ausweis zeigen
        </button>
        
        {onLogout && (
          <button 
            type="button"
            onClick={handleSecretaryLogout}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              padding: '10px 12px', 
              borderRadius: '12px', 
              border: 'none', 
              background: '#fff1f2', 
              color: '#ef4444', 
              fontWeight: 800, 
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            className="hover-scale"
          >
            <LogOut size={16} color="#ef4444" /> Abmelden
          </button>
        )}
      </div>
    </div>
  );
};
