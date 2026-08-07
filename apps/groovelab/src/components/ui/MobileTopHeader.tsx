import React from 'react';
import { GraduationCap, Music, Bell } from 'lucide-react';

interface MobileTopHeaderProps {
  user: any;
  activePlatform: 'campus' | 'groovelab' | 'admin';
  setActivePlatform: (platform: 'campus' | 'groovelab' | 'admin') => void;
  unreadCount?: number;
}

export const MobileTopHeader: React.FC<MobileTopHeaderProps> = ({
  user,
  activePlatform,
  setActivePlatform,
  unreadCount = 0
}) => {
  const getAvatarSrc = () => {
    if (user?.role === 'admin' || user?.role === 'secretary') {
      return '/campus_login_hero.png';
    }
    return user?.avatar_url || '/campus_login_hero.png';
  };

  return (
    <header
      className="cg-mobile-top-header"
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        height: 'auto',
        minHeight: '52px',
        paddingTop: 'calc(env(safe-area-inset-top, 12px) + 24px)',
        paddingBottom: '8px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '14px',
        paddingRight: '14px',
        zIndex: 900,
        boxSizing: 'border-box'
      }}
    >
      {/* Left: App Brand Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '1.05rem', fontWeight: 900, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <span style={{ color: '#34a853' }}>Campus</span>
          <span style={{ color: '#64748b', margin: '0 1px' }}>-</span>
          <span style={{ color: '#eab308' }}>Groovelab</span>
        </span>
      </div>

      {/* Center: iOS Segmented Control Toggle [ Campus | GrooveLab ] */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#f1f5f9',
          borderRadius: '100px',
          padding: '3px',
          border: '1px solid rgba(226, 232, 240, 0.8)'
        }}
      >
        <button
          onClick={() => setActivePlatform('campus')}
          style={{
            padding: '6px 14px',
            borderRadius: '100px',
            border: 'none',
            background: activePlatform === 'campus' ? '#ffffff' : 'transparent',
            color: activePlatform === 'campus' ? '#34a853' : '#64748b',
            fontWeight: activePlatform === 'campus' ? 800 : 600,
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            boxShadow: activePlatform === 'campus' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <GraduationCap size={14} />
          <span>Campus</span>
        </button>

        <button
          onClick={() => setActivePlatform('groovelab')}
          style={{
            padding: '6px 14px',
            borderRadius: '100px',
            border: 'none',
            background: activePlatform === 'groovelab' ? '#ffffff' : 'transparent',
            color: activePlatform === 'groovelab' ? '#ca8a04' : '#64748b',
            fontWeight: activePlatform === 'groovelab' ? 800 : 600,
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            boxShadow: activePlatform === 'groovelab' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Music size={14} />
          <span>GrooveLab</span>
        </button>
      </div>

      {/* Right: Notifications & Profile Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Unread Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(241, 245, 249, 0.8)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <Bell size={16} />
          </button>
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                background: '#ef4444',
                color: 'white',
                fontSize: '9px',
                fontWeight: 900,
                borderRadius: '100px',
                padding: '2px 4px',
                lineHeight: 1
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
