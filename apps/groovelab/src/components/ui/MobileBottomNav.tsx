import React, { useState } from 'react';
import { Home, Calendar, Music, MessageSquare, Menu, X, Shield } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activePlatform: 'campus' | 'groovelab' | 'admin';
  setActivePlatform: (platform: 'campus' | 'groovelab' | 'admin') => void;
  userRole: string;
  unreadCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  activePlatform,
  setActivePlatform,
  userRole,
  unreadCount = 0,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const getActiveThemeClass = () => {
    if (activePlatform === 'campus') return 'active-campus';
    if (activePlatform === 'groovelab') return 'active-groovelab';
    return 'active-admin';
  };

  return (
    <>
      {/* Off-Canvas Burger Drawer */}
      {drawerOpen && (
        <div className="cg-bottom-sheet-backdrop" onClick={() => setDrawerOpen(false)}>
          <div 
            className="cg-bottom-sheet-container" 
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: '32px' }}
          >
            <div className="cg-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                Campus-Groovelab Menü
              </h3>
              <button 
                onClick={() => setDrawerOpen(false)}
                style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modul Switcher */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>
                Modul wechseln
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <button
                  onClick={() => { setActivePlatform('campus'); setDrawerOpen(false); }}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '16px',
                    border: activePlatform === 'campus' ? '2px solid #34a853' : '1px solid #e2e8f0',
                    background: activePlatform === 'campus' ? '#e6f4ea' : '#f8fafc',
                    color: activePlatform === 'campus' ? '#34a853' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Campus
                </button>
                <button
                  onClick={() => { setActivePlatform('groovelab'); setDrawerOpen(false); }}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '16px',
                    border: activePlatform === 'groovelab' ? '2px solid #eab308' : '1px solid #e2e8f0',
                    background: activePlatform === 'groovelab' ? '#fefce8' : '#f8fafc',
                    color: activePlatform === 'groovelab' ? '#ca8a04' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  GrooveLab
                </button>
                {(userRole === 'admin' || userRole === 'secretary') && (
                  <button
                    onClick={() => { setActivePlatform('admin'); setDrawerOpen(false); }}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '16px',
                      border: activePlatform === 'admin' ? '2px solid #ea4335' : '1px solid #e2e8f0',
                      background: activePlatform === 'admin' ? '#fce8e6' : '#f8fafc',
                      color: activePlatform === 'admin' ? '#ea4335' : '#64748b',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Shield size={14} /> Admin
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <nav className="cg-mobile-bottom-nav">
        {/* Tab 1: Briefing */}
        <button
          className={`cg-bottom-nav-item ${['briefing', 'dashboard', 'live'].includes(activeTab) ? getActiveThemeClass() : ''}`}
          onClick={() => setActiveTab('briefing')}
        >
          <Home size={22} color="currentColor" />
          <span>Briefing</span>
        </button>

        {/* Tab 2: Stundenplan / Protokoll */}
        <button
          className={`cg-bottom-nav-item ${['schedule', 'homework_book', 'schedule_board'].includes(activeTab) ? getActiveThemeClass() : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <Calendar size={22} color="currentColor" />
          <span>Stundenplan</span>
        </button>

        {/* Tab 3: GrooveLab / Bands */}
        <button
          className={`cg-bottom-nav-item ${['bands', 'groovelab', 'songs'].includes(activeTab) ? getActiveThemeClass() : ''}`}
          onClick={() => setActiveTab('bands')}
        >
          <Music size={22} color="currentColor" />
          <span>GrooveLab</span>
        </button>

        {/* Tab 4: Messages / Shouts */}
        <button
          className={`cg-bottom-nav-item ${['messages', 'shouts'].includes(activeTab) ? getActiveThemeClass() : ''}`}
          onClick={() => setActiveTab('messages')}
          style={{ position: 'relative' }}
        >
          <MessageSquare size={22} color="currentColor" />
          <span>Shouts</span>
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '4px',
                right: '22px',
                background: '#ef4444',
                color: 'white',
                fontSize: '10px',
                fontWeight: 900,
                borderRadius: '100px',
                padding: '2px 5px',
                lineHeight: 1
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Tab 5: Burger Menu */}
        <button
          className="cg-bottom-nav-item"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={22} color="currentColor" />
          <span>Menü</span>
        </button>
      </nav>
    </>
  );
};
