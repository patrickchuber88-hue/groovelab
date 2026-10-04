import React from 'react';
import { BookOpen, LayoutGrid } from 'lucide-react';

export interface MeisterwerkMobileBottomBarProps {
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
  const isHausaufgabenActive =
    mobileProtokollTab === 'homework' &&
    (activeViewMode === 'document' || activeViewMode === 'recordings') &&
    activeModalTab === 'document';
  const isModulesActive = !isHausaufgabenActive;

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
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 90,
        height: 'calc(50px + max(24px, env(safe-area-inset-bottom, 24px)))',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
        paddingTop: '6px',
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '0.5px solid rgba(0, 0, 0, 0.12)',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        boxSizing: 'border-box',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
      className="meisterwerk-mobile-bottom-dock"
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
          border: 'none',
          borderRadius: 0,
          background: 'transparent',
          cursor: 'pointer',
          padding: '4px 0',
          transition: 'color 0.15s ease, opacity 0.15s ease',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
          position: 'relative'
        }}
      >
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen
            size={22}
            strokeWidth={isHausaufgabenActive ? 2.5 : 1.8}
            color={isHausaufgabenActive ? CAMPUS_GREEN : INACTIVE_COLOR}
          />
        </div>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: isHausaufgabenActive ? 800 : 550,
            letterSpacing: '-0.01em',
            color: isHausaufgabenActive ? CAMPUS_GREEN : INACTIVE_COLOR,
            lineHeight: 1
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
          border: 'none',
          borderRadius: 0,
          background: 'transparent',
          cursor: 'pointer',
          padding: '4px 0',
          transition: 'color 0.15s ease, opacity 0.15s ease',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
          position: 'relative'
        }}
      >
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <LayoutGrid
            size={22}
            strokeWidth={isModulesActive ? 2.5 : 1.8}
            color={isModulesActive ? CAMPUS_GREEN : INACTIVE_COLOR}
          />
        </div>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: isModulesActive ? 800 : 550,
            letterSpacing: '-0.01em',
            color: isModulesActive ? CAMPUS_GREEN : INACTIVE_COLOR,
            lineHeight: 1
          }}
        >
          {isTeacherSelf ? 'Studio-Module' : 'Module'}
        </span>
      </button>
    </nav>
  );
};
