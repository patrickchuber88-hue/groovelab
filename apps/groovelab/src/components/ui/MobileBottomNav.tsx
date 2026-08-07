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
  BookOpen,
  Zap,
  Play,
  Award,
  Megaphone
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activePlatform: 'campus' | 'groovelab' | 'admin';
  setActivePlatform: (platform: 'campus' | 'groovelab' | 'admin') => void;
  userRole?: string;
  unreadCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  activePlatform,
  setActivePlatform,
  userRole = 'student',
  unreadCount = 0
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const getActiveThemeClass = () => {
    switch (activePlatform) {
      case 'campus': return 'active-campus';
      case 'groovelab': return 'active-groovelab';
      case 'admin': return 'active-admin';
      default: return 'active-campus';
    }
  };

  // Define 1:1 menu items matching Desktop Left Sidebar in exact order
  const getMenuItems = () => {
    if (userRole === 'student') {
      if (activePlatform === 'campus') {
        return [
          { id: 'briefing', label: 'Briefing', icon: Monitor },
          { id: 'homework_book', label: 'Aufgaben', icon: BookOpen },
          { id: 'practice_board', label: 'Übe-Pfad', icon: Zap },
          { id: 'mediathek', label: 'Mediathek', icon: Library },
          { id: 'events', label: 'Termine', icon: Calendar },
          { id: 'campus_cup', label: 'Performance', icon: Trophy },
          { id: 'messages', label: 'Nachrichten', icon: Mail, badge: unreadCount },
          { id: 'settings', label: 'Einstellungen', icon: Settings },
        ];
      } else {
        return [
          { id: 'live', label: 'Live Lab', icon: Monitor },
          { id: 'practice', label: 'Üben', icon: Play },
          { id: 'library', label: 'Bibliothek', icon: Library },
          { id: 'repertoire', label: 'Repertoire', icon: Award },
          { id: 'matching', label: 'Band-Matching', icon: Users },
          { id: 'bands', label: 'Bands', icon: Box },
          { id: 'messages', label: 'Nachrichten', icon: Megaphone },
        ];
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
        return [
          { id: 'live', label: 'Live Lab', icon: Monitor },
          { id: 'messages', label: 'Nachrichten', icon: Mail },
          { id: 'students', label: 'Schüler', icon: Users },
          { id: 'team', label: 'Team', icon: Users },
          { id: 'bands', label: 'Bands', icon: Box },
          { id: 'songs', label: 'Song-Bibliothek', icon: Library },
          { id: 'repertoire', label: 'Repertoire', icon: Award },
          { id: 'setup', label: 'Einstellungen', icon: Settings },
        ];
      }
    }
  };

  const menuItems = getMenuItems();

  // Primary 4 Tabs for Bottom Nav
  const primaryTabs = userRole === 'student'
    ? (activePlatform === 'campus'
        ? [
            { id: 'briefing', label: 'Briefing', icon: Monitor },
            { id: 'homework_book', label: 'Aufgaben', icon: BookOpen },
            { id: 'events', label: 'Termine', icon: Calendar },
            { id: 'messages', label: 'Chat', icon: Mail }
          ]
        : [
            { id: 'live', label: 'Live Lab', icon: Monitor },
            { id: 'practice', label: 'Üben', icon: Play },
            { id: 'repertoire', label: 'Repertoire', icon: Award },
            { id: 'messages', label: 'Chat', icon: Megaphone }
          ])
    : [
        { id: 'live', label: 'Briefing', icon: Monitor },
        { id: 'schedule', label: 'Stundenplan', icon: Calendar },
        { id: 'events', label: 'Termine', icon: Calendar },
        { id: 'messages', label: 'Chat', icon: Mail }
      ];

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
              width: '85%',
              maxWidth: '360px',
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>Hauptmenü</span>
              <button 
                onClick={() => setDrawerOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Platform Switcher inside Drawer */}
            <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', uppercase: 'true', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Modul Wechseln
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => { setActivePlatform('campus'); setDrawerOpen(false); }}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '16px',
                    border: activePlatform === 'campus' ? '2px solid #34a853' : '1px solid #e2e8f0',
                    background: activePlatform === 'campus' ? '#e6f4ea' : '#ffffff',
                    color: activePlatform === 'campus' ? '#34a853' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <GraduationCap size={16} /> Campus
                </button>

                <button
                  onClick={() => { setActivePlatform('groovelab'); setDrawerOpen(false); }}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '16px',
                    border: activePlatform === 'groovelab' ? '2px solid #eab308' : '1px solid #e2e8f0',
                    background: activePlatform === 'groovelab' ? '#fefce8' : '#ffffff',
                    color: activePlatform === 'groovelab' ? '#ca8a04' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Music size={16} /> GrooveLab
                </button>
              </div>
            </div>

            {/* 1:1 Navigation Items List (Same sequence as Left Sidebar) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Menüpunkte
              </div>
              {menuItems.map(item => {
                const ItemIcon = item.icon;
                const isActive = activeTab === item.id;

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
                      background: isActive 
                        ? (activePlatform === 'campus' ? 'rgba(52, 168, 83, 0.1)' : 'rgba(234, 179, 8, 0.15)') 
                        : 'transparent',
                      color: isActive 
                        ? (activePlatform === 'campus' ? '#34a853' : '#ca8a04') 
                        : '#334155',
                      fontWeight: isActive ? 800 : 600,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <ItemIcon size={20} color={isActive ? (activePlatform === 'campus' ? '#34a853' : '#ca8a04') : '#64748b'} />
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
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar (4 Primary Tabs + 5th Menü Tab) */}
      <nav className="cg-mobile-bottom-nav">
        {primaryTabs.map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`cg-bottom-nav-item ${isActive ? getActiveThemeClass() : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <TabIcon size={22} color="currentColor" />
              <span>{tab.label}</span>
            </button>
          );
        })}

        {/* 5th Tab: Menü Drawer */}
        <button
          className={`cg-bottom-nav-item ${drawerOpen ? getActiveThemeClass() : ''}`}
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={22} color="currentColor" />
          <span>Menü</span>
        </button>
      </nav>
    </>
  );
};
