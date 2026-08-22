import React, { useState } from 'react';
import { 
  Monitor, 
  Calendar, 
  Mail, 
  Users, 
  Library, 
  Box, 
  Trophy, 
  Settings, 
  Menu, 
  X, 
  GraduationCap, 
  Music, 
  Shield,
  ShieldCheck,
  BookOpen,
  Zap,
  Play,
  Award,
  Megaphone,
  BarChart2,
  QrCode
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activePlatform: 'campus' | 'groovelab' | 'admin';
  setActivePlatform: (platform: 'campus' | 'groovelab' | 'admin') => void;
  userRole?: string;
  unreadCount?: number;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
}

const isBoardAllowedForStudent = (boardId: string, level: string, isParentUnlocked: boolean): boolean => {
  if (isParentUnlocked) return true;
  if (level === 'pro') return true;

  // Custom parent override from localStorage if set
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem(`campus_board_override_${boardId}`);
    if (override === 'true') return true;
    if (override === 'false') return false;
  }

  if (level === 'junior') {
    // Junior defaults: Briefing, Homework Book, Practice Board (Übe-Pfad), Events (Termine), Settings
    const juniorAllowed = ['briefing', 'homework_book', 'practice_board', 'events', 'settings'];
    return juniorAllowed.includes(boardId);
  }

  if (level === 'teen') {
    return true;
  }

  return true;
};

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  activePlatform,
  setActivePlatform,
  userRole = 'student',
  unreadCount = 0
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const [campusStudentUiLevel, setCampusStudentUiLevel] = useState<string>(() => {
    if (typeof window === 'undefined') return 'junior';
    return localStorage.getItem('campus_student_ui_level') || 'junior';
  });
  const [parentUnlocked, setParentUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('groovelab_parent_unlocked_global') === 'true';
  });

  const [, setNavVersion] = useState(0);

  React.useEffect(() => {
    const handleLevelChangeEvt = (e: any) => {
      if (e?.detail) setCampusStudentUiLevel(e.detail);
    };
    const handleParentModeChange = (e: any) => {
      if (typeof e?.detail === 'boolean') setParentUnlocked(e.detail);
    };
    const handlePermissionChange = () => {
      setNavVersion(v => v + 1);
    };
    window.addEventListener('campus_ui_level_changed', handleLevelChangeEvt);
    window.addEventListener('groovelab_parent_mode_changed', handleParentModeChange);
    window.addEventListener('campus_board_permission_changed', handlePermissionChange);
    return () => {
      window.removeEventListener('campus_ui_level_changed', handleLevelChangeEvt);
      window.removeEventListener('groovelab_parent_mode_changed', handleParentModeChange);
      window.removeEventListener('campus_board_permission_changed', handlePermissionChange);
    };
  }, []);

  const itemRefs = React.useRef<{ [key: string]: HTMLButtonElement | null }>({});

  React.useEffect(() => {
    if (activeTab && itemRefs.current[activeTab]) {
      itemRefs.current[activeTab]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeTab]);

  const getActiveThemeClass = () => {
    switch (activePlatform) {
      case 'campus': return 'active-campus';
      case 'groovelab': return 'active-groovelab';
      case 'admin': return 'active-admin';
      default: return 'active-campus';
    }
  };

  // Define 1:1 menu items matching Desktop Left Sidebar in exact order
  const getMenuItems = (): MenuItem[] => {
    if (userRole === 'student') {
      if (activePlatform === 'campus') {
        const allItems: MenuItem[] = [
          { id: 'briefing', label: 'Briefing', icon: Monitor },
          { id: 'homework_book', label: 'Aufgaben', icon: BookOpen },
          { id: 'practice_board', label: 'Übe-Pfad', icon: Zap },
          { id: 'mediathek', label: 'Mediathek', icon: Library },
          { id: 'events', label: 'Termine', icon: Calendar },
          { id: 'campus_cup', label: 'Performance', icon: Trophy },
          { id: 'messages', label: 'Nachrichten', icon: Mail, badge: unreadCount },
          { 
            id: 'settings', 
            label: (campusStudentUiLevel === 'junior' || campusStudentUiLevel === 'teen') && !parentUnlocked ? 'Elternbereich' : 'Einstellungen', 
            icon: (campusStudentUiLevel === 'junior' || campusStudentUiLevel === 'teen') && !parentUnlocked ? ShieldCheck : Settings 
          },
        ];
        return allItems.filter(item => isBoardAllowedForStudent(item.id, campusStudentUiLevel, parentUnlocked));
      } else {
        const allItems: MenuItem[] = [
          { id: 'live', label: 'Live Lab', icon: Monitor },
          { id: 'practice', label: 'Üben', icon: Play },
          { id: 'library', label: 'Bibliothek', icon: Library },
          { id: 'repertoire', label: 'Repertoire', icon: Award },
          { id: 'matching', label: 'Band-Matching', icon: Users },
          { id: 'bands', label: 'Bands', icon: Box },
          { id: 'messages', label: 'Nachrichten', icon: Megaphone },
        ];
        return allItems.filter(item => isBoardAllowedForStudent(item.id, campusStudentUiLevel, parentUnlocked));
      }
    } else {
      // Teacher / Admin / Secretary
      if (activePlatform === 'campus') {
        return [
          { id: 'live', label: 'Briefing', icon: Monitor },
          { id: 'schedule', label: 'Stundenplan', icon: Calendar },
          { id: 'events', label: 'Termine', icon: Calendar },
          { id: 'messages', label: 'Nachrichten', icon: Mail, badge: unreadCount },
          { id: 'students', label: 'Schüler', icon: Users },
          { id: 'songs', label: 'Mediathek', icon: Library },
          { id: 'rooms', label: 'Räume', icon: Box },
          { id: 'stats', label: 'Performance', icon: Trophy },
          { id: 'setup', label: 'Einstellungen', icon: Settings },
        ];
      } else {
        // GrooveLab Desktop Sidebar 1:1 Match
        return [
          { id: 'live', label: 'Live Lab', icon: Monitor },
          { id: 'messages', label: 'Nachrichten', icon: Mail, badge: unreadCount },
          { id: 'students', label: 'Schüler', icon: Users },
          { id: 'team', label: 'Team', icon: Users },
          { id: 'rooms', label: 'Räume', icon: Box },
          { id: 'songs', label: 'Songs', icon: Library },
          { id: 'bands', label: 'Bands', icon: Box },
          { id: 'stats', label: 'Statistik', icon: BarChart2 },
          { id: 'id_gallery', label: 'ID Galerie', icon: QrCode },
          { id: 'setup', label: 'Einstellungen', icon: Settings },
        ];
      }
    }
  };

  const menuItems = getMenuItems();

  // Primary 4 Tabs for Bottom Nav based on UI Level
  const getPrimaryTabs = () => {
    if (userRole === 'student') {
      if (activePlatform === 'campus') {
        if (campusStudentUiLevel === 'junior' && !parentUnlocked) {
          return [
            { id: 'briefing', label: 'Briefing', icon: Monitor },
            { id: 'homework_book', label: 'Aufgaben', icon: BookOpen },
            { id: 'practice_board', label: 'Übe-Pfad', icon: Zap },
            { id: 'events', label: 'Termine', icon: Calendar }
          ];
        }
        return [
          { id: 'briefing', label: 'Briefing', icon: Monitor },
          { id: 'homework_book', label: 'Aufgaben', icon: BookOpen },
          { id: 'events', label: 'Termine', icon: Calendar },
          { id: 'messages', label: 'Chat', icon: Mail, badge: unreadCount }
        ];
      } else {
        return [
          { id: 'live', label: 'Live Lab', icon: Monitor },
          { id: 'practice', label: 'Üben', icon: Play },
          { id: 'repertoire', label: 'Repertoire', icon: Award },
          { id: 'messages', label: 'Chat', icon: Megaphone, badge: unreadCount }
        ];
      }
    } else {
      return activePlatform === 'campus'
        ? [
            { id: 'live', label: 'Briefing', icon: Monitor },
            { id: 'schedule', label: 'Stundenplan', icon: Calendar },
            { id: 'songs', label: 'Mediathek', icon: Library },
            { id: 'messages', label: 'Chat', icon: Mail, badge: unreadCount }
          ]
        : [
            { id: 'live', label: 'Live Lab', icon: Monitor },
            { id: 'bands', label: 'Bands', icon: Box },
            { id: 'songs', label: 'Songs', icon: Library },
            { id: 'messages', label: 'Chat', icon: Mail, badge: unreadCount }
          ];
    }
  };

  const primaryTabs: Array<{ id: string; label: string; icon: any; badge?: number }> = getPrimaryTabs();

  return (
    <>
      {/* Full Screen Slide-Over Drawer for "Menü" Tab */}
      {drawerOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setDrawerOpen(false)}
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
              gap: '14px',
              overflowY: 'auto',
              boxSizing: 'border-box'
            }}
            onClick={e => e.stopPropagation()}
            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStartX === null) return;
              const deltaX = e.changedTouches[0].clientX - touchStartX;
              if (deltaX < -50 && activePlatform === 'campus') {
                setActivePlatform('groovelab');
              } else if (deltaX > 50 && activePlatform === 'groovelab') {
                setActivePlatform('campus');
              }
              setTouchStartX(null);
            }}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>Hauptmenü</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '100px',
                  background: activePlatform === 'campus' ? '#e6f4ea' : '#fefce8',
                  color: activePlatform === 'campus' ? '#34a853' : '#ca8a04',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  border: activePlatform === 'campus' ? '1px solid #bbf7d0' : '1px solid #fef08a'
                }}>
                  {activePlatform === 'campus' ? '🎓 Campus' : '🎵 GrooveLab'}
                </span>
              </div>
              <button 
                onClick={() => setDrawerOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Instagram Swipecard Segmented Platform Switcher */}
            <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', textAlign: 'center' }}>
                Modul wechseln
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setActivePlatform('campus')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '14px',
                    border: activePlatform === 'campus' ? '2px solid #34a853' : '1px solid transparent',
                    background: activePlatform === 'campus' ? '#34a853' : '#ffffff',
                    color: activePlatform === 'campus' ? '#ffffff' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: activePlatform === 'campus' ? '0 3px 10px rgba(52, 168, 83, 0.25)' : 'none'
                  }}
                >
                  <GraduationCap size={16} /> Campus
                </button>

                <button
                  type="button"
                  onClick={() => setActivePlatform('groovelab')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '14px',
                    border: activePlatform === 'groovelab' ? '2px solid #eab308' : '1px solid transparent',
                    background: activePlatform === 'groovelab' ? '#eab308' : '#ffffff',
                    color: activePlatform === 'groovelab' ? '#ffffff' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: activePlatform === 'groovelab' ? '0 3px 10px rgba(234, 179, 8, 0.25)' : 'none'
                  }}
                >
                  <Music size={16} /> GrooveLab
                </button>
              </div>
            </div>

            {/* 1:1 Navigation Items Swipecard List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', flex: 1 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Menüpunkte ({activePlatform === 'campus' ? 'Campus' : 'GrooveLab'})</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Wischen zum Wechseln</span>
              </div>
              {menuItems.map(item => {
                const ItemIcon = item.icon;
                const isActive = activeTab === item.id;
                const activeColor = activePlatform === 'campus' ? '#34a853' : '#ca8a04';
                const activeBg = activePlatform === 'campus' ? 'rgba(52, 168, 83, 0.1)' : 'rgba(234, 179, 8, 0.15)';

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setDrawerOpen(false);
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: 'none',
                      background: isActive ? activeBg : 'transparent',
                      color: isActive ? activeColor : '#334155',
                      fontWeight: isActive ? 800 : 600,
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease-out'
                    }}
                  >
                    <ItemIcon size={19} color={isActive ? activeColor : '#64748b'} />
                    <span>{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', borderRadius: '100px', padding: '2px 8px', fontSize: '11px', fontWeight: 900 }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Instagram Bottom Page Indicator Dots */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              paddingTop: '10px',
              borderTop: '1px solid #f1f5f9',
              marginTop: 'auto'
            }}>
              <div
                onClick={() => setActivePlatform('campus')}
                style={{
                  width: activePlatform === 'campus' ? '22px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: activePlatform === 'campus' ? '#34a853' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                title="Karte 1: Campus Modul"
              />
              <div
                onClick={() => setActivePlatform('groovelab')}
                style={{
                  width: activePlatform === 'groovelab' ? '22px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: activePlatform === 'groovelab' ? '#eab308' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                title="Karte 2: GrooveLab Modul"
              />
            </div>
          </div>
        </div>
      )}

      {/* Horizontal Scrollable Bottom Navigation Bar (All Menu Items in One Single Row) */}
      <nav className="cg-mobile-bottom-nav">
        {menuItems.map(item => {
          const TabIcon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              ref={el => { itemRefs.current[item.id] = el; }}
              className={`cg-bottom-nav-item ${isActive ? getActiveThemeClass() : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TabIcon size={20} color="currentColor" />
                {item.badge && item.badge > 0 ? (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-7px',
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '999px',
                    padding: '1px 5px',
                    fontSize: '9px',
                    fontWeight: 900,
                    lineHeight: 1
                  }}>
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Menü Drawer Button as the final item at the end of the scrollable row */}
        <button
          className={`cg-bottom-nav-item ${drawerOpen ? getActiveThemeClass() : ''}`}
          onClick={() => setDrawerOpen(true)}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Menu size={20} color="currentColor" />
          </div>
          <span>Menü</span>
        </button>
      </nav>
    </>
  );
};
