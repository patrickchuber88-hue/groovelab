import React from 'react';
import { ArrowLeft, Info, Search, Send } from 'lucide-react';
import { Student } from '../../meisterwerk.types';

export interface MeisterwerkHeaderProps {
  isMobileOrSim: boolean;
  student: Student;
  studentInstrument?: string;
  displayedStudentName: string;
  studentFirstName: string;
  onProfileClick?: (student: Student) => void;
  isTeacherSandbox: boolean;
  isTeacherTools: boolean;
  isTeacherSelf: boolean;
  isTeacherMode: boolean;
  uiLevel: 'junior' | 'teen' | 'pro';
  effectiveParentPermissions?: any;
  propParentPermissions?: any;
  activeViewMode: string;
  setActiveViewMode: (mode: any) => void;
  activeModalTab: string;
  setActiveModalTab: (tab: any) => void;
  activeSubView: string;
  setActiveSubView: (view: any) => void;
  hubTab: string;
  setHubTab: (tab: any) => void;
  mobileProtokollTab: string;
  setMobileProtokollTab: (tab: any) => void;
  recordingSearchQuery: string;
  setRecordingSearchQuery: (q: string) => void;
  onOpenAssignModal?: () => void;
  renderFullscreenButton: () => React.ReactNode;
  renderCloseButton: () => React.ReactNode;
  setOnboardingStep: (step: number) => void;
  setShowProtokollOnboarding: (val: boolean) => void;
  setShowAgeUiInfoModal: (val: boolean) => void;
  resolveCampusStudentAvatar: (s: any) => string;
}

export const MeisterwerkHeader: React.FC<MeisterwerkHeaderProps> = ({
  isMobileOrSim,
  student,
  studentInstrument,
  displayedStudentName,
  studentFirstName,
  onProfileClick,
  isTeacherSandbox,
  isTeacherTools,
  isTeacherSelf,
  isTeacherMode,
  uiLevel,
  effectiveParentPermissions,
  propParentPermissions,
  activeViewMode,
  setActiveViewMode,
  activeModalTab,
  setActiveModalTab,
  activeSubView,
  setActiveSubView,
  hubTab,
  setHubTab,
  mobileProtokollTab,
  setMobileProtokollTab,
  recordingSearchQuery,
  setRecordingSearchQuery,
  onOpenAssignModal,
  renderFullscreenButton,
  renderCloseButton,
  setOnboardingStep,
  setShowProtokollOnboarding,
  setShowAgeUiInfoModal,
  resolveCampusStudentAvatar
}) => {
  const isHausaufgabenActive =
    mobileProtokollTab === 'homework' &&
    (activeViewMode === 'document' || activeViewMode === 'recordings') &&
    activeModalTab === 'document';
  const isModulesActive = !isHausaufgabenActive;

  const overrides =
    effectiveParentPermissions?.module_overrides ||
    (student as any)?.parent_permissions?.module_overrides ||
    propParentPermissions?.module_overrides;

  const isCurrentModuleInactive =
    (activeViewMode === 'loopstation' && uiLevel === 'junior' && !overrides?.loopstation) ||
    (activeSubView === 'history' && activeViewMode === 'document' && uiLevel !== 'pro' && !overrides?.archive);

  return (
    <>
      <div
        style={{
          padding: isMobileOrSim
            ? 'max(10px, env(safe-area-inset-top, 10px)) max(12px, env(safe-area-inset-right, 12px)) 6px max(12px, env(safe-area-inset-left, 12px))'
            : 'max(16px, env(safe-area-inset-top, 16px)) max(20px, env(safe-area-inset-right, 20px)) 16px max(20px, env(safe-area-inset-left, 20px))',
          background: 'linear-gradient(135deg, #34a853 0%, #4f46e5 100%)',
          backdropFilter: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '0',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
        }}
        className="modal-header-container"
      >
        {/* Top Row */}
        <div
          className="header-top-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            minWidth: 0,
            position: 'relative'
          }}
        >
          {/* Left: Avatar + Student Info */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}
            className="header-left-info"
          >
            <div
              onClick={() => onProfileClick && onProfileClick(student)}
              title={onProfileClick ? 'Schülerprofil anzeigen' : undefined}
              style={{
                width: isMobileOrSim ? '30px' : '38px',
                height: isMobileOrSim ? '30px' : '38px',
                borderRadius: '10px',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                border: '1.5px solid rgba(255, 213, 79, 0.2)',
                cursor: onProfileClick ? 'pointer' : 'default',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => {
                if (onProfileClick) e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                if (onProfileClick) e.currentTarget.style.opacity = '1';
              }}
            >
              <img
                src={resolveCampusStudentAvatar({
                  ...(student || {}),
                  instrument: studentInstrument || student?.instrument
                })}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt=""
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2
                  onClick={() => onProfileClick && onProfileClick(student)}
                  title={onProfileClick ? 'Schülerprofil anzeigen' : undefined}
                  style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    cursor: onProfileClick ? 'pointer' : 'default',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (onProfileClick) e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    if (onProfileClick) e.currentTarget.style.opacity = '1';
                  }}
                >
                  {displayedStudentName}
                </h2>
                {!isTeacherSandbox && !isTeacherTools && !isTeacherSelf ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setOnboardingStep(0);
                        setShowProtokollOnboarding(true);
                      }}
                      title="Anleitung & Onboarding anzeigen"
                      style={{
                        background: 'rgba(255, 255, 255, 0.18)',
                        border: '1px solid rgba(255, 255, 255, 0.28)',
                        color: '#ffffff',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                      }}
                      className="hover-scale"
                    >
                      <Info size={13} color="#ffffff" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAgeUiInfoModal(true)}
                      title="Altersstufe & Berechtigungen anzeigen"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background:
                          uiLevel === 'junior'
                            ? 'rgba(254, 240, 138, 0.22)'
                            : uiLevel === 'teen'
                            ? 'rgba(199, 210, 254, 0.22)'
                            : 'rgba(233, 213, 255, 0.22)',
                        border:
                          uiLevel === 'junior'
                            ? '1px solid rgba(253, 224, 71, 0.55)'
                            : uiLevel === 'teen'
                            ? '1px solid rgba(165, 180, 252, 0.55)'
                            : '1px solid rgba(216, 180, 254, 0.55)',
                        borderRadius: '100px',
                        padding: '2px 8px',
                        color: '#ffffff',
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.12)',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        flexShrink: 0
                      }}
                      className="hover-scale"
                    >
                      <span>
                        {uiLevel === 'junior'
                          ? '🧒 Junior (6–10 J.)'
                          : uiLevel === 'teen'
                          ? '⚡ Teen (11–15 J.)'
                          : '🎓 Pro (ab 16 J.)'}
                      </span>
                    </button>
                  </>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      borderRadius: '100px',
                      padding: '2px 8px',
                      color: '#ffffff',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      flexShrink: 0
                    }}
                  >
                    Lehrkraft
                  </span>
                )}
              </div>
              {(activeViewMode === 'recordings' || activeModalTab === 'audiobiography') && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 650,
                    color: 'rgba(255, 255, 255, 0.75)',
                    lineHeight: 1,
                    marginTop: '2px'
                  }}
                >
                  Aufgabenheft · Audio-Studio
                </span>
              )}
            </div>
          </div>

          {/* Desktop Navigation Action */}
          {(activeViewMode !== 'document' ||
            activeModalTab !== 'document' ||
            activeSubView !== 'hub' ||
            hubTab === 'protocol') && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                display: isMobileOrSim ? 'none' : 'flex',
                alignItems: 'center',
                gap: '10px',
                zIndex: 10
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveModalTab('document');
                  setActiveViewMode('document');
                  setActiveSubView('hub');
                  setHubTab('modules');
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.16)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255, 255, 255, 0.32)',
                  color: '#ffffff',
                  padding: '7px 18px',
                  borderRadius: '100px',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  letterSpacing: '-0.01em',
                  userSelect: 'none'
                }}
                className="hover-scale"
              >
                <ArrowLeft size={15} color="#ffffff" strokeWidth={2.6} />
                <span>Zurück zu den Modulen</span>
              </button>

              {activeViewMode === 'recordings' && (
                <div style={{ position: 'relative', width: '260px' }}>
                  <Search
                    size={14}
                    color="#64748b"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Aufnahmen durchsuchen..."
                    value={recordingSearchQuery}
                    onChange={(e) => setRecordingSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 28px 6px 34px',
                      borderRadius: '100px',
                      border: '1.5px solid #e2e8f0',
                      background: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                    }}
                  />
                  {recordingSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setRecordingSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: '#e2e8f0',
                        border: 'none',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        cursor: 'pointer',
                        fontSize: '10px',
                        padding: 0
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Right Actions */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}
            className="header-right-actions"
          >
            {onOpenAssignModal && (
              <button
                type="button"
                onClick={onOpenAssignModal}
                aria-label="Hausaufgabe an Schüler zuweisen"
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  color: '#ffffff',
                  fontWeight: 850,
                  fontSize: '0.80rem',
                  flexShrink: 0,
                  boxShadow: '0 2px 10px rgba(2, 132, 199, 0.35)'
                }}
                className="hover-scale"
                title="Hausaufgabe an Schüler zuweisen"
              >
                <Send size={13} />
                <span>An Schüler zuweisen</span>
              </button>
            )}
            {renderFullscreenButton()}
            {renderCloseButton()}
          </div>
        </div>

        {/* Bottom Row - iOS Segmented Switch */}
        <div
          className="header-mobile-menu-row"
          style={{
            display: isMobileOrSim ? 'flex' : 'none',
            width: '100%',
            marginTop: '4px',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div
            role="tablist"
            aria-label="Bereichsauswahl"
            style={{
              display: 'inline-flex',
              background: 'rgba(0, 0, 0, 0.22)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              padding: '3px',
              borderRadius: '100px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
              width: '100%',
              maxWidth: '280px'
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={isModulesActive}
              onClick={() => {
                setActiveModalTab('document');
                setActiveViewMode('document');
                setActiveSubView('hub');
                setHubTab('modules');
                setMobileProtokollTab('repertoire');
              }}
              style={{
                flex: 1,
                padding: '7px 14px',
                borderRadius: '100px',
                border: 'none',
                background: isModulesActive ? '#ffffff' : 'transparent',
                color: isModulesActive ? '#0f172a' : '#ffffff',
                fontWeight: 850,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isModulesActive ? '0 2px 8px rgba(0, 0, 0, 0.18)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none'
              }}
            >
              {isTeacherSelf ? 'Studio-Module' : 'Module'}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={isHausaufgabenActive}
              onClick={() => {
                setActiveModalTab('document');
                setActiveViewMode('document');
                setActiveSubView('hub');
                setMobileProtokollTab('homework');
              }}
              style={{
                flex: 1,
                padding: '7px 14px',
                borderRadius: '100px',
                border: 'none',
                background: isHausaufgabenActive ? '#ffffff' : 'transparent',
                color: isHausaufgabenActive ? '#0f172a' : '#ffffff',
                fontWeight: 850,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isHausaufgabenActive ? '0 2px 8px rgba(0, 0, 0, 0.18)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none'
              }}
            >
              {isTeacherSelf ? 'Anleitung & Tipps' : 'Hausaufgaben'}
            </button>
          </div>
        </div>
      </div>

      {/* Teacher Demo Mode Banner */}
      {isTeacherMode && !isTeacherSandbox && !isTeacherTools && !isTeacherSelf && isCurrentModuleInactive && (
        <div
          style={{
            background: 'linear-gradient(90deg, #fef3c7 0%, #fffbeb 100%)',
            borderBottom: '1.5px solid #fde68a',
            padding: '9px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.80rem',
            fontWeight: 750,
            color: '#92400e',
            zIndex: 45,
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(245, 158, 11, 0.10)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={16} color="#d97706" style={{ flexShrink: 0 }} />
            <span>
              <strong>Lehrer-Demo-Modus:</strong> Dieses Modul ist für{' '}
              <strong>{studentFirstName}</strong> in der {uiLevel.toUpperCase()}-Stufe regulär
              ausgeblendet. Du nutzt es zur Unterrichtsvorführung.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveViewMode('document');
              setActiveModalTab('document');
              setActiveSubView('hub');
              setHubTab('modules');
            }}
            style={{
              background: '#ffffff',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#b45309',
              cursor: 'pointer'
            }}
          >
            Zurück zur Übersicht
          </button>
        </div>
      )}
    </>
  );
};
