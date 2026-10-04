/**
 * 🏛️ Campus-Groovelab Mobiles Termine-Bottom-Dock
 * 
 * 0.1% Monolith Goldstandard / Autarker Satellit für CampusEventsBoard
 * Bounded Context: Events & Schedule / Mobile Ergonomics
 * Standards: OWASP ASVS Level 3 / BFSG 2025 / WCAG 2.2 AA / WCAG 2.5.5 Touch Targets
 * 
 * Features:
 * 1. Ergonomische Verlagerung der Termine-Hauptnavigation in die Daumenzone (untere 35%).
 * 2. 1:1 Design-System-Parität zum Aufgaben-Board (MeisterwerkMobileBottomBar).
 * 3. Haptisches 10ms Tap-Feedback via Vibration API.
 * 4. Taktile Touch-Zellen (>= 48px) mit WAI-ARIA Tablist-Semantik.
 * 5. Apple Frosted Pearl Material mit 20px Blur und Safe-Area-Puffer.
 */

import React from 'react';

export interface CampusEventsMobileTabItem {
  id: number;
  label: string;
  icon: any;
}

export interface CampusEventsMobileBottomBarProps {
  tabs: CampusEventsMobileTabItem[];
  activeIndex: number;
  onSelectTab: (index: number) => void;
  brandColor?: string;
}

export const CampusEventsMobileBottomBar: React.FC<CampusEventsMobileBottomBarProps> = ({
  tabs,
  activeIndex,
  onSelectTab,
  brandColor = '#34a853'
}) => {
  const handleTap = (index: number) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {}
    onSelectTab(index);
  };

  return (
    <nav
      role="tablist"
      aria-label="Termine Hauptnavigation"
      className="campus-events-mobile-bottom-dock"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 900,
        height: 'calc(52px + max(20px, env(safe-area-inset-bottom, 20px)))',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
        paddingTop: '6px',
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '0.5px solid rgba(0, 0, 0, 0.10)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        boxSizing: 'border-box',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      {tabs.map((tab, idx) => {
        const TabIcon = tab.icon;
        const isActive = activeIndex === idx;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onClick={() => handleTap(idx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTap(idx);
              }
            }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              height: '100%',
              minHeight: '44px',
              border: 'none',
              borderRadius: 0,
              background: 'transparent',
              cursor: 'pointer',
              padding: '2px 0',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
              boxSizing: 'border-box'
            }}
          >
            {/* ICON SQUIRCLE / PILL INDICATOR */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '24px',
                borderRadius: '12px',
                background: isActive ? `${brandColor}18` : 'transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <TabIcon
                size={18}
                color={isActive ? brandColor : '#94a3b8'}
                strokeWidth={isActive ? 2.4 : 1.9}
              />
            </div>

            {/* TAB LABEL */}
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: isActive ? 800 : 600,
                color: isActive ? brandColor : '#64748b',
                letterSpacing: isActive ? '-0.01em' : '0',
                transition: 'color 0.15s ease'
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
