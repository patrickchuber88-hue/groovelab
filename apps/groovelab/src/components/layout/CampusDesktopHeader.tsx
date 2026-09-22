import React from 'react';
import { 
  GraduationCap, 
  Music, 
  Users, 
  Lock, 
  Info, 
  AlertCircle, 
  School, 
  User, 
  MapPin, 
  Tablet, 
  RefreshCw, 
  ArrowLeftRight, 
  LogOut,
  Calendar
} from 'lucide-react';
import { StudioAvatar } from '../StudioAvatar';
import { formatTeacherFullName } from '../../utils/nameHelper';
import { isDevEnvironment } from '../../utils/tenantUrlHelper';

function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface CampusDesktopHeaderProps {
  user: any;
  school: any;
  activePlatform: 'campus' | 'groovelab' | 'ensembles' | string;
  setActivePlatform: (platform: any) => void;
  activeStudentTab: string;
  setActiveStudentTab: (tab: string) => void;
  windowWidth: number;
  locationMode: 'lab' | 'home';
  setLocationMode: (mode: 'lab' | 'home') => void;
  isKioskMode: boolean;
  isCampusUnlocked: boolean;
  setShowCampusPinPrompt: (show: boolean) => void;
  showEnsemblesFeature?: boolean;
  setShowMobileInfo: (show: boolean) => void;
  isOfflineMode: boolean;
  trialDaysLeft: number | null;
  setShowTrialInfoModal: (show: boolean) => void;
  teachers?: any[];
  session?: any;
  activeStudentsCount: number;
  showDateSimulation?: boolean;
  simulatedDate: string | null;
  setSimulatedDate: (date: string | null) => void;
  handleSwitchActiveRole: (newRole: string) => Promise<void> | void;
  handleLogout: (confirmFirst?: boolean, hardPurge?: boolean) => void;
}

export const CampusDesktopHeader: React.FC<CampusDesktopHeaderProps> = ({
  user,
  school,
  activePlatform,
  setActivePlatform,
  activeStudentTab,
  setActiveStudentTab,
  windowWidth,
  locationMode,
  setLocationMode,
  isKioskMode,
  isCampusUnlocked,
  setShowCampusPinPrompt,
  showEnsemblesFeature = false,
  setShowMobileInfo,
  isOfflineMode,
  trialDaysLeft,
  setShowTrialInfoModal,
  teachers = [],
  session,
  activeStudentsCount,
  showDateSimulation = false,
  simulatedDate,
  setSimulatedDate,
  handleSwitchActiveRole,
  handleLogout
}) => {
  return (
    <>
      <header 
        className="header desktop-only-header" 
        style={{ 
          display: windowWidth <= 768 ? 'none' : 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0 10px', 
          height: '56px', 
          background: 'transparent' 
        }}
      >
        {/* App Switcher Tabs */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-end', 
          gap: windowWidth <= 640 ? '2px' : (windowWidth <= 1024 ? '4px' : '6px'), 
          height: '100%',
          paddingTop: '10px',
          boxSizing: 'border-box'
        }}>
          {/* Campus Tab */}
          {school && (school.has_campus_subscription || !school.is_billing_booked) && user?.is_campus_active && (
            <div 
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  const isStaff = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary';
                  const isStudent = user?.role === 'student';
                  if (isStudent && locationMode === 'lab' && isKioskMode && !isCampusUnlocked) {
                    setShowCampusPinPrompt(true);
                    return;
                  }
                  if (user?.role === 'teacher') {
                    sessionStorage.setItem('groovelab_active_workspace', 'teacher');
                  }
                  setActivePlatform('campus');
                  const rawCampusTab = sessionStorage.getItem('campus_active_tab');
                  const startTab = (rawCampusTab && rawCampusTab !== 'live') ? rawCampusTab : 'briefing';
                  setActiveStudentTab(startTab);
                  sessionStorage.setItem('campus_active_tab', startTab);
                }
              }}
              onClick={() => {
                const isStaff = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary';
                const isStudent = user?.role === 'student';
                if (isStudent && locationMode === 'lab' && isKioskMode && !isCampusUnlocked) {
                  setShowCampusPinPrompt(true);
                  return;
                }
                if (user?.role === 'teacher') {
                  sessionStorage.setItem('groovelab_active_workspace', 'teacher');
                }
                setActivePlatform('campus');
                const rawCampusTab = sessionStorage.getItem('campus_active_tab');
                const startTab = (rawCampusTab && rawCampusTab !== 'live') ? rawCampusTab : 'briefing';
                setActiveStudentTab(startTab);
                sessionStorage.setItem('campus_active_tab', startTab);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: windowWidth <= 640 ? '6px 10px 4px' : (windowWidth <= 1024 ? '10px 14px 8px' : '12px 22px 10px'),
                borderRadius: '12px 12px 0 0',
                background: activePlatform === 'campus' ? '#34a853' : 'rgba(52, 168, 83, 0.05)',
                color: activePlatform === 'campus' ? '#ffffff' : '#34a853',
                border: activePlatform === 'campus' ? '1px solid #34a853' : '1px solid rgba(52, 168, 83, 0.18)',
                borderBottom: 'none',
                fontWeight: 750,
                fontSize: windowWidth <= 768 ? '0.75rem' : '0.82rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                zIndex: activePlatform === 'campus' ? 2 : 1,
                transform: activePlatform === 'campus' ? 'translateY(1px)' : 'translateY(0)',
                boxShadow: activePlatform === 'campus' ? '0 -4px 16px rgba(52, 168, 83, 0.18)' : 'none',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                height: windowWidth <= 768 ? '36px' : '44px',
                boxSizing: 'border-box',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                outline: 'none'
              }}
            >
              <GraduationCap size={15} color={activePlatform === 'campus' ? '#ffffff' : '#34a853'} />
              {windowWidth > 640 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {locationMode === 'lab' && user?.role === 'student' && activePlatform !== 'campus' && (
                    <Lock size={12} style={{ color: 'inherit' }} />
                  )}
                  Campus
                </span>
              )}
            </div>
          )}

          {Boolean((school ? (school.has_groovelab_subscription || !school.is_billing_booked || school.subscription_bypass) : true) && (user?.is_groovelab_active || user?.role === 'admin' || user?.role === 'secretary')) && (
            <div 
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (user?.role === 'teacher') {
                    sessionStorage.setItem('groovelab_active_workspace', 'teacher');
                  }
                  setActivePlatform('groovelab');
                  const isStaff = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary';
                  if (isStaff) {
                    setLocationMode('lab');
                    sessionStorage.setItem('groovelab_location_mode', 'lab');
                  }
                  setActiveStudentTab('live');
                  sessionStorage.setItem('groovelab_active_tab', 'live');
                  localStorage.setItem('groovelab_active_tab', 'live');
                }
              }}
              onClick={() => {
                if (user?.role === 'teacher') {
                  sessionStorage.setItem('groovelab_active_workspace', 'teacher');
                }
                setActivePlatform('groovelab');
                const isStaff = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary';
                if (isStaff) {
                  setLocationMode('lab');
                  sessionStorage.setItem('groovelab_location_mode', 'lab');
                }
                setActiveStudentTab('live');
                sessionStorage.setItem('groovelab_active_tab', 'live');
                localStorage.setItem('groovelab_active_tab', 'live');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: windowWidth <= 640 ? '6px 10px 4px' : (windowWidth <= 1024 ? '10px 14px 8px' : '12px 22px 10px'),
                borderRadius: '12px 12px 0 0',
                background: activePlatform === 'groovelab' ? '#facc15' : 'rgba(250, 204, 21, 0.05)',
                color: activePlatform === 'groovelab' ? '#09090b' : '#eab308',
                border: activePlatform === 'groovelab' ? '1px solid #facc15' : '1px solid rgba(250, 204, 21, 0.18)',
                borderBottom: 'none',
                fontWeight: 750,
                fontSize: windowWidth <= 768 ? '0.75rem' : '0.82rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                zIndex: activePlatform === 'groovelab' ? 2 : 1,
                transform: activePlatform === 'groovelab' ? 'translateY(1px)' : 'translateY(0)',
                boxShadow: activePlatform === 'groovelab' ? '0 -4px 16px rgba(250, 204, 21, 0.18)' : 'none',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                height: windowWidth <= 768 ? '36px' : '44px',
                boxSizing: 'border-box',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                outline: 'none'
              }}
            >
              <Music size={15} color={activePlatform === 'groovelab' ? '#09090b' : '#eab308'} />
              {windowWidth > 640 && <span>GrooveLab</span>}
            </div>
          )}

          {/* Ensemble & Bands Tab */}
          {showEnsemblesFeature && (
            <div 
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActivePlatform('ensembles');
                }
              }}
              onClick={() => {
                setActivePlatform('ensembles');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: windowWidth <= 640 ? '6px 10px 4px' : (windowWidth <= 1024 ? '10px 14px 8px' : '12px 22px 10px'),
                borderRadius: '12px 12px 0 0',
                background: activePlatform === 'ensembles' ? '#3b82f6' : 'rgba(59, 130, 246, 0.05)',
                color: activePlatform === 'ensembles' ? '#ffffff' : '#3b82f6',
                border: activePlatform === 'ensembles' ? '1px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.18)',
                borderBottom: 'none',
                fontWeight: 750,
                fontSize: windowWidth <= 768 ? '0.75rem' : '0.82rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                zIndex: activePlatform === 'ensembles' ? 2 : 1,
                transform: activePlatform === 'ensembles' ? 'translateY(1px)' : 'translateY(0)',
                boxShadow: activePlatform === 'ensembles' ? '0 -4px 16px rgba(59, 130, 246, 0.18)' : 'none',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                height: windowWidth <= 768 ? '36px' : '44px',
                boxSizing: 'border-box',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                outline: 'none'
              }}
            >
              <Users size={15} color={activePlatform === 'ensembles' ? '#ffffff' : '#3b82f6'} />
              {windowWidth > 640 && <span>Ensembles & Bands</span>}
            </div>
          )}
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: windowWidth <= 1024 ? '16px' : '28px',
          marginLeft: windowWidth <= 1024 ? '24px' : '48px'
        }}>
          {/* Status Pills */}
          {windowWidth <= 640 ? (
            <button
              type="button"
              onClick={() => setShowMobileInfo(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: activePlatform === 'campus' ? 'rgba(52, 168, 83, 0.08)' : (activePlatform === 'ensembles' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(250, 204, 21, 0.08)'),
                border: `1px solid ${activePlatform === 'campus' ? '#34a853' : (activePlatform === 'ensembles' ? '#3b82f6' : '#facc15')}30`,
                color: activePlatform === 'campus' ? '#34a853' : (activePlatform === 'ensembles' ? '#3b82f6' : '#eab308'),
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                cursor: 'pointer',
                borderWidth: '1px',
                padding: 0,
                outline: 'none'
              }}
              aria-label="Info anzeigen"
            >
              <Info size={18} />
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: windowWidth <= 768 ? '4px' : '8px' }}>
              {isOfflineMode && (
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', 
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                  padding: windowWidth <= 768 ? '8px 12px' : '8px 16px', borderRadius: '12px', 
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                  color: 'white'
                }}>
                  <AlertCircle size={14} color="white" />
                  <span style={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Offline Modus
                  </span>
                </div>
              )}
              {/* Interactive 30-Tage Trial Pill */}
              {(user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary') && school?.is_trial && !school?.subscription_bypass && trialDaysLeft !== null && (
                <button
                  type="button"
                  onClick={() => setShowTrialInfoModal(true)}
                  title="Klicken für Details zur 30-Tage Probezeit"
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', 
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
                    padding: windowWidth <= 768 ? '8px 12px' : '8px 16px', borderRadius: '12px', 
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2)';
                  }}
                >
                  <AlertCircle size={14} color="white" />
                  <span style={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {trialDaysLeft > 0 
                      ? `Probezeit: ${trialDaysLeft} ${trialDaysLeft === 1 ? 'Tag' : 'Tage'}`
                      : 'Probezeit abgelaufen'}
                  </span>
                </button>
              )}

              {/* Unified School, Teacher, Student, Admin & Secretary Pill */}
              {(() => {
                const badgeBaseStyle: React.CSSProperties = {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(59, 130, 246, 0.04)',
                  height: windowWidth <= 768 ? '36px' : '40px',
                  padding: windowWidth <= 768 ? '0 12px' : '0 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.12)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                };
                const textStyle: React.CSSProperties = {
                  fontWeight: 750,
                  fontSize: '0.76rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                };

                if (activePlatform === 'groovelab') {
                  return (
                    <div style={badgeBaseStyle}>
                      <span style={textStyle}>
                        <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <School size={14} color="#ef4444" />
                          <span>
                            {school?.name || 'Meine Musikschule'}
                          </span>
                        </span>
                      </span>
                    </div>
                  );
                } else if (user?.role === 'student') {
                  return (
                    <div style={badgeBaseStyle}>
                      <span style={textStyle}>
                        {windowWidth > 768 && (
                          <>
                            <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <School size={14} color="#ef4444" />
                              <span>
                                {school?.name || 'Meine Musikschule'}
                              </span>
                            </span>
                            <span style={{ color: '#94a3b8', margin: '0 2px' }}>•</span>
                            <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User size={14} color="#3b82f6" />
                              <span>
                                {(() => {
                                  const matchedTeacher = (user.teacher_id && teachers.find(t => t.id === user.teacher_id)) || user.teacher || (teachers.length > 0 ? teachers[0] : null);
                                  return formatTeacherFullName(matchedTeacher, matchedTeacher?.last_name);
                                })()}
                              </span>
                            </span>
                            <span style={{ color: '#94a3b8', margin: '0 2px' }}>•</span>
                          </>
                        )}
                        <span style={{ color: '#34a853', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>
                            {user?.first_name ? user.first_name.toUpperCase() : 'CAMPUS SCHÜLER'}
                          </span>
                        </span>
                      </span>
                    </div>
                  );
                } else if (user?.role === 'teacher') {
                  return (
                    <div style={badgeBaseStyle}>
                      <span style={textStyle}>
                        <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <School size={14} color="#ef4444" />
                          <span>
                            {windowWidth <= 768 
                              ? getInitials(school?.name === 'Testlauf' ? 'Testlauf' : (school?.name || 'Meine Musikschule')) 
                              : (school?.name === 'Testlauf' ? 'Testlauf' : (school?.name || 'Meine Musikschule'))}
                          </span>
                        </span>
                        <span style={{ color: '#94a3b8', margin: '0 2px' }}>•</span>
                        <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={14} color="#3b82f6" />
                          <span>
                            {windowWidth <= 768 
                              ? getInitials(`${user.first_name} ${user.last_name}`) 
                              : `${user.first_name} ${user.last_name}`}
                          </span>
                        </span>
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div style={badgeBaseStyle}>
                      <span style={textStyle}>
                        <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <School size={14} color="#ef4444" />
                          <span>
                            {windowWidth <= 768 
                              ? getInitials(school?.name || 'Meine Musikschule') 
                              : (school?.name || 'Meine Musikschule')}
                          </span>
                        </span>
                        <span style={{ color: '#94a3b8', margin: '0 2px' }}>•</span>
                        <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={14} color="#3b82f6" />
                          <span>
                            {windowWidth <= 768 
                              ? `${getInitials(`${user.first_name} ${user.last_name}`)} • ${user?.role === 'admin' ? 'AD' : 'VW'}`
                              : `${user.first_name} ${user.last_name} • ${user?.role === 'admin' ? 'CAMPUS ADMIN' : 'CAMPUS VERWALTUNG'}`}
                          </span>
                        </span>
                      </span>
                    </div>
                  );
                }
              })()}

              {/* Location Pill */}
              {activePlatform === 'groovelab' && (() => {
                const stationName = locationMode === 'lab' 
                  ? (session?.stations?.name || ((user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'teacher') ? 'Lehrer iPad' : 'Labor iPad'))
                  : 'Home';
                
                const isTeacherStation = stationName.toLowerCase().includes('lehrer');
                const stationColor = locationMode === 'lab' ? (session?.stations?.color || '#10b981') : '#64748b';
                const stationNumber = stationName.replace(/[^0-9]/g, '');
                const hasNumber = stationNumber.length > 0;
                
                const isHome = locationMode !== 'lab';
                const badgeColor = isTeacherStation ? '#34a853' : stationColor;
                const displayBg = isHome 
                  ? 'rgba(100, 116, 139, 0.06)' 
                  : `${badgeColor}12`;
                const displayBorder = isHome
                  ? '1px solid rgba(100, 116, 139, 0.12)'
                  : `1px solid ${badgeColor}25`;
                const displayColor = isHome
                  ? '#64748b'
                  : badgeColor;

                return (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    background: displayBg, 
                    border: displayBorder, 
                    padding: '6px 12px', 
                    borderRadius: '10px', 
                    color: displayColor,
                    height: '36px',
                    boxSizing: 'border-box',
                    boxShadow: 'none',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}>
                    {isHome ? (
                      <MapPin size={14} style={{ opacity: 0.8 }} />
                    ) : (
                      <Tablet size={14} style={{ color: displayColor }} />
                    )}
                    
                    <span style={{ 
                      fontWeight: 750, 
                      fontSize: '0.75rem', 
                      letterSpacing: '-0.01em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {isHome ? (
                        'Home'
                      ) : isTeacherStation ? (
                        'Lehrer'
                      ) : (
                        <>
                          <span style={{ color: displayColor, fontWeight: 750 }}>iPad</span>
                          {hasNumber ? (
                            <span style={{ 
                              background: `${displayColor}20`, 
                              color: displayColor, 
                              borderRadius: '6px', 
                              padding: '2px 6px', 
                              fontSize: '0.7rem', 
                              fontWeight: 800, 
                              lineHeight: 1, 
                              minWidth: '16px', 
                              textAlign: 'center' 
                            }}>
                              {stationNumber}
                            </span>
                          ) : (
                            <span style={{ color: displayColor }}>{stationName}</span>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                );
              })()}

              {/* Lab Count Pill */}
              {activePlatform === 'groovelab' && (() => {
                const themeColor = (activePlatform as string) === 'campus' ? '#34a853' : '#eab308';
                const displayBg = `${themeColor}12`;
                const displayBorder = `1px solid ${themeColor}25`;
                const displayColor = themeColor;
                
                return (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    background: displayBg, 
                    border: displayBorder, 
                    padding: '6px 12px', 
                    borderRadius: '10px', 
                    height: '36px',
                    boxSizing: 'border-box',
                    boxShadow: 'none',
                    transition: 'all 0.2s ease',
                    color: displayColor,
                    flexShrink: 0
                  }}>
                    <Users size={14} style={{ color: displayColor }} />
                    <span style={{ 
                      fontWeight: 750, 
                      fontSize: '0.75rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px' 
                    }}>
                      <span style={{ 
                        background: `${displayColor}20`,
                        color: displayColor, 
                        borderRadius: '6px', 
                        padding: '2px 5px', 
                        fontSize: '0.7rem', 
                        fontWeight: 800, 
                        lineHeight: 1 
                      }}>
                        {activeStudentsCount}
                      </span>
                      {windowWidth > 576 ? 'im Lab' : 'Lab'}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* User Info & Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: windowWidth <= 1024 ? '8px' : '16px', paddingLeft: windowWidth <= 1024 ? '8px' : '16px', borderLeft: '1px solid #f1f5f9' }}>
            {windowWidth > 1024 && activePlatform !== 'campus' && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem' }}>Hallo {user.first_name}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                  {user.role === 'admin' ? 'Groovelab Admin' : user.role === 'teacher' ? 'Groovelab Lehrer' : user.role === 'secretary' ? 'Groovelab Verwaltung' : 'Groovelab Schüler'}
                </div>
              </div>
            )}

            {/* Elegant Refresh / Reload Button */}
            <button 
              type="button"
              onClick={() => window.location.reload()}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: windowWidth <= 768 ? '36px' : '40px', 
                height: windowWidth <= 768 ? '36px' : '40px', 
                borderRadius: '12px', 
                background: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                color: '#64748b', 
                cursor: 'pointer', 
                transition: 'all 0.2s ease', 
                flexShrink: 0 
              }}
              className="hover-scale"
              title="Seite neu laden"
              aria-label="Seite neu laden"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#334155';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <RefreshCw size={16} />
            </button>

            {activePlatform !== 'campus' && (
              <div 
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveStudentTab('profile');
                  }
                }}
                onClick={() => setActiveStudentTab('profile')}
                style={{ 
                  width: windowWidth <= 768 ? '36px' : '40px', 
                  height: windowWidth <= 768 ? '36px' : '40px', 
                  borderRadius: '12px', 
                  border: '3px solid white', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)', 
                  overflow: 'hidden', 
                  flexShrink: 0, 
                  cursor: 'pointer',
                  outline: 'none'
                }}
                aria-label="Profil öffnen"
              >
                <StudioAvatar 
                  src={user.photo_url} 
                  user={{
                    ...user,
                    resolved_instrument: user.resolved_instrument || user.instrument || (teachers.find(t => t.id === user.teacher_id)?.instrument) || (teachers[0]?.instrument) || 'Gitarre'
                  }} 
                  activePlatform={activePlatform} 
                  onClick={() => setActiveStudentTab('profile')} 
                />
              </div>
            )}

            {/* Datum Simulation Control (Dev Mode Only - Toggled via Shift+T) */}
            {isDevEnvironment() && showDateSimulation && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: simulatedDate ? '#fefce8' : '#f8fafc',
                border: simulatedDate ? '1.5px solid #eab308' : '1.5px solid #cbd5e1',
                height: windowWidth <= 768 ? '36px' : '40px',
                padding: '0 10px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#334155',
                boxShadow: simulatedDate ? '0 2px 8px rgba(234, 179, 8, 0.2)' : 'none',
                transition: 'all 0.2s',
                flexShrink: 0
              }} title="Datum-Simulation für alle Dashboards">
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: simulatedDate ? '#854d0e' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} strokeWidth={2.4} color={simulatedDate ? '#854d0e' : '#64748b'} />
                  <span>Simu:</span>
                </span>
                <input 
                  type="date"
                  value={simulatedDate || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSimulatedDate(val || null);
                    if (val) {
                      localStorage.setItem('groovelab_simulated_date', val);
                      localStorage.setItem('groovelab_simulated_start_timestamp', String(Date.now()));
                      if (school?.id) {
                        localStorage.setItem(`simulatedToday_${school.id}`, val);
                      }
                    } else {
                      localStorage.removeItem('groovelab_simulated_date');
                      localStorage.removeItem('groovelab_simulated_start_timestamp');
                      if (school?.id) {
                        localStorage.removeItem(`simulatedToday_${school.id}`);
                      }
                    }
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new CustomEvent('groovelab_simulated_date_changed'));
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    color: simulatedDate ? '#ca8a04' : '#0f172a',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                {simulatedDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatedDate(null);
                      localStorage.removeItem('groovelab_simulated_date');
                      localStorage.removeItem('groovelab_simulated_start_timestamp');
                      if (school?.id) {
                        localStorage.removeItem(`simulatedToday_${school.id}`);
                      }
                      window.dispatchEvent(new Event('storage'));
                      window.dispatchEvent(new CustomEvent('groovelab_simulated_date_changed'));
                    }}
                    style={{
                      border: 'none',
                      background: '#fef08a',
                      color: '#854d0e',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                    title="Auf heutiges Datum zurücksetzen"
                  >
                    Heute
                  </button>
                )}
              </div>
            )}

            {/* Elegant Switch to Admin/Verwaltung Button (Strictly only for teachers who genuinely possess dual-role admin/secretary privileges) */}
            {user && Array.isArray(user.roles) && (user.roles.includes('admin') || user.roles.includes('secretary')) && (
              <button 
                type="button"
                onClick={() => {
                  const targetRole = user.roles.includes('admin') ? 'admin' : 'secretary';
                  handleSwitchActiveRole(targetRole);
                }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '6px', 
                  background: '#fce8e6', 
                  border: '1.5px solid #ea4335', 
                  height: windowWidth <= 768 ? '36px' : '40px',
                  padding: windowWidth <= 480 ? '0 10px' : '0 14px', 
                  borderRadius: '12px', 
                  color: '#ea4335', 
                  fontWeight: 800, 
                  fontSize: '0.8rem', 
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 12px rgba(234, 67, 53, 0.12)',
                  flexShrink: 0
                }}
                className="hover-scale"
                title="Zur Schulverwaltung wechseln"
                aria-label="Aktive Ansicht: Lehrkraft. Klicken, um zur Schulverwaltung zu wechseln."
              >
                <ArrowLeftRight size={13} color="#ea4335" />
                <School size={15} color="#ea4335" />
                <span>Zur Verwaltung</span>
              </button>
            )}

            {/* Elegant Logout Button next to avatar (mobile-only to avoid duplicate on desktop) */}
            {windowWidth <= 1024 && (
              <button 
                type="button"
                onClick={() => handleLogout(true, true)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '6px', 
                  background: '#ffe4e6', 
                  border: '1px solid #fecdd3', 
                  height: windowWidth <= 768 ? '36px' : '40px', 
                  padding: windowWidth <= 480 ? '0 10px' : '0 14px', 
                  borderRadius: '12px', 
                  color: '#e11d48', 
                  fontWeight: 800, 
                  fontSize: '0.8rem', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
                  boxShadow: '0 2px 10px rgba(225, 29, 72, 0.08)', 
                  flexShrink: 0 
                }}
                className="hover-scale"
                title="Abmelden"
                aria-label="Abmelden"
              >
                <LogOut size={14} color="#e11d48" />
                {windowWidth > 480 && <span>Abmelden</span>}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Thin colored accent line matching active platform — consistent across all boards */}
      <div style={{
        height: '3px',
        width: '100%',
        background: activePlatform === 'campus'
          ? '#34a853'
          : activePlatform === 'groovelab'
            ? '#fbbc05'
            : '#0b57d0',
        flexShrink: 0,
        marginBottom: '0px'
      }} />
    </>
  );
};

export default CampusDesktopHeader;
