import React from 'react';
import { BookOpen, LayoutGrid } from 'lucide-react';

export interface MeisterwerkMobileBottomBarProps {
  hubTab?: string;
  mobileProtokollTab: string;
  setMobileProtokollTab: (tab: any) => void;
  activeViewMode: string;
  setActiveViewMode: (mode: any) => void;
  activeModalTab: string;
  setActiveModalTab: (tab: any) => void;
  activeSubView: string;
  setActiveSubView: (view: any) => void;
  setHubTab: (tab: any) => void;
  isTeacherSelf?: boolean;
}

export const MeisterwerkMobileBottomBar: React.FC<MeisterwerkMobileBottomBarProps> = ({
  hubTab,
  mobileProtokollTab,
  setMobileProtokollTab,
  activeViewMode,
  setActiveViewMode,
  activeModalTab,
  setActiveModalTab,
  activeSubView: _activeSubView,
  setActiveSubView,
  setHubTab,
  isTeacherSelf = false
}) => {
  const isModulesActive =
    hubTab === 'modules' ||
    mobileProtokollTab === 'repertoire' ||
    activeViewMode === 'loopstation' ||
    activeViewMode === 'tuner' ||
    activeViewMode === 'earlab' ||
    activeViewMode === 'worldtour';
  const isHausaufgabenActive = !isModulesActive;

  const handleSelectHomework = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {}
    setActiveModalTab('document');
    setActiveViewMode('document');
    setActiveSubView('hub');
    setMobileProtokollTab('homework');
    setHubTab('protocol');
  };

  const handleSelectModules = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {}
    setActiveModalTab('document');
    setActiveViewMode('document');
    setActiveSubView('hub');
    setHubTab('modules');
    setMobileProtokollTab('repertoire');
  };

  // Autoritatives Campus-Grün (#34a853) & Dezent neutrales Inaktiv-Slate (#94a3b8)
  const CAMPUS_GREEN = '#34a853';
  const INACTIVE_COLOR = '#94a3b8';

  return (
    <nav
      role="tablist"
      aria-label="Aufgabenheft Hauptnavigation"
      className="meisterwerk-mobile-bottom-dock"
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
        touchAction: 'manipulation',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      {/* Tab 1: Hausaufgaben */}
      <button
        type="button"
        role="tab"
        aria-selected={isHausaufgabenActive}
        tabIndex={0}
        onClick={handleSelectHomework}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelectHomework();
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
            background: isHausaufgabenActive ? `${CAMPUS_GREEN}18` : 'transparent',
            transition: 'all 0.2s ease'
          }}
        >
          <BookOpen
            size={18}
            strokeWidth={isHausaufgabenActive ? 2.4 : 1.9}
            color={isHausaufgabenActive ? CAMPUS_GREEN : '#94a3b8'}
          />
        </div>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: isHausaufgabenActive ? 800 : 600,
            letterSpacing: isHausaufgabenActive ? '-0.01em' : '0',
            color: isHausaufgabenActive ? CAMPUS_GREEN : '#64748b',
            lineHeight: 1,
            transition: 'color 0.15s ease'
          }}
        >
          {isTeacherSelf ? 'Anleitung' : 'Hausaufgaben'}
        </span>
      </button>

      {/* Tab 2: Module */}
      <button
        type="button"
        role="tab"
        aria-selected={isModulesActive}
        tabIndex={0}
        onClick={handleSelectModules}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelectModules();
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
            background: isModulesActive ? `${CAMPUS_GREEN}18` : 'transparent',
            transition: 'all 0.2s ease'
          }}
        >
          <LayoutGrid
            size={18}
            strokeWidth={isModulesActive ? 2.4 : 1.9}
            color={isModulesActive ? CAMPUS_GREEN : '#94a3b8'}
          />
        </div>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: isModulesActive ? 800 : 600,
            letterSpacing: isModulesActive ? '-0.01em' : '0',
            color: isModulesActive ? CAMPUS_GREEN : '#64748b',
            lineHeight: 1,
            transition: 'color 0.15s ease'
          }}
        >
          {isTeacherSelf ? 'Studio-Module' : 'Module'}
        </span>
      </button>
    </nav>
  );
};
