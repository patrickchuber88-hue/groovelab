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
        height: 'calc(50px + max(6px, calc(env(safe-area-inset-bottom, 0px) * 0.45)))',
        paddingBottom: 'max(6px, calc(env(safe-area-inset-bottom, 0px) * 0.45))',
        paddingTop: '6px',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -4px 20px rgba(15, 23, 42, 0.06)',
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
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        {/* 🏛️ 0,1% Goldstandard: Oberer 3px Akzent-Indikator bei Auswahl */}
        {isHausaufgabenActive && (
          <div style={{ position: 'absolute', top: 0, width: '28px', height: '3px', borderRadius: '999px', background: CAMPUS_GREEN }} />
        )}

        {/* ICON SQUIRCLE / PILL INDICATOR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '46px',
            height: '26px',
            borderRadius: '13px',
            background: isHausaufgabenActive ? 'rgba(52, 168, 83, 0.20)' : 'transparent',
            border: isHausaufgabenActive ? '1px solid rgba(52, 168, 83, 0.38)' : '1px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          <BookOpen
            size={20}
            strokeWidth={isHausaufgabenActive ? 2.5 : 2.0}
            color={isHausaufgabenActive ? '#15803d' : '#64748b'}
          />
        </div>
        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: isHausaufgabenActive ? 800 : 600,
            letterSpacing: isHausaufgabenActive ? '-0.01em' : '0',
            color: isHausaufgabenActive ? '#15803d' : '#64748b',
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
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        {/* 🏛️ 0,1% Goldstandard: Oberer 3px Akzent-Indikator bei Auswahl */}
        {isModulesActive && (
          <div style={{ position: 'absolute', top: 0, width: '28px', height: '3px', borderRadius: '999px', background: CAMPUS_GREEN }} />
        )}

        {/* ICON SQUIRCLE / PILL INDICATOR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '46px',
            height: '26px',
            borderRadius: '13px',
            background: isModulesActive ? 'rgba(52, 168, 83, 0.20)' : 'transparent',
            border: isModulesActive ? '1px solid rgba(52, 168, 83, 0.38)' : '1px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          <LayoutGrid
            size={20}
            strokeWidth={isModulesActive ? 2.5 : 2.0}
            color={isModulesActive ? '#15803d' : '#64748b'}
          />
        </div>
        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: isModulesActive ? 800 : 600,
            letterSpacing: isModulesActive ? '-0.01em' : '0',
            color: isModulesActive ? '#15803d' : '#64748b',
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
