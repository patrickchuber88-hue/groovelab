import React from 'react';
import { 
  GraduationCap, 
  Music, 
  Monitor, 
  BookOpen, 
  Zap, 
  Library, 
  Calendar, 
  Trophy, 
  Mail, 
  Settings, 
  ShieldCheck, 
  Check, 
  Lock, 
  Users, 
  Play, 
  Award, 
  Box, 
  Megaphone, 
  Compass, 
  Shield, 
  QrCode, 
  LogOut, 
  ZoomIn,
  PanelLeftClose,
  PanelLeftOpen,
  School,
  ArrowLeftRight,
  AlertCircle
} from 'lucide-react';
import { CampusSidebarRailItem } from './CampusSidebarRailItem';
import { CampusSidebarUserHub } from './CampusSidebarUserHub';
import { CampusRibbonNoteIcon } from '../CampusGroovelabBrand';
import { StudioAvatar } from '../StudioAvatar';
import { formatTeacherFullName } from '../../utils/nameHelper';

export interface CampusDesktopSidebarProps {
  user: any;
  school: any;
  activePlatform: 'campus' | 'groovelab' | 'ensembles' | string;
  setActivePlatform?: (platform: any) => void;
  activeStudentTab: string;
  setActiveStudentTab: (tab: string) => void;
  activeWorkspace?: string | null;
  teachers?: any[];
  session?: any;
  windowWidth: number;
  campusStudentUiLevel: string;
  parentUnlocked: boolean;
  campusUnreadCount: number;
  studentMessages?: any[];
  showMissionsFeature?: boolean;
  isMusicStandMode: boolean;
  toggleMusicStandMode: () => void;
  onShowQr: () => void;
  onLogout: (confirmFirst?: boolean, hardPurge?: boolean) => void;
  onOpenPrivacy: () => void;
  onOpenAgb: () => void;
  onOpenImpressum: () => void;
  onOpenAccessibility: () => void;
  supabase: any;
  setParentPermissionsVersion: React.Dispatch<React.SetStateAction<number>>;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  trialDaysLeft?: number | null;
  setShowTrialInfoModal?: (show: boolean) => void;
  onSwitchActiveRole?: (role: string) => void;
}

export const CampusDesktopSidebar: React.FC<CampusDesktopSidebarProps> = ({
  user,
  school,
  activePlatform,
  setActivePlatform,
  activeStudentTab,
  setActiveStudentTab,
  activeWorkspace,
  teachers = [],
  session,
  windowWidth,
  campusStudentUiLevel,
  parentUnlocked,
  campusUnreadCount,
  studentMessages = [],
  showMissionsFeature = false,
  isMusicStandMode,
  toggleMusicStandMode,
  onShowQr,
  onLogout,
  onOpenPrivacy,
  onOpenAgb,
  onOpenImpressum,
  onOpenAccessibility,
  supabase,
  setParentPermissionsVersion,
  isCollapsed = false,
  onToggleCollapse,
  trialDaysLeft,
  setShowTrialInfoModal,
  onSwitchActiveRole
}) => {
  const isGrooveLabBooked = Boolean(
    (school ? (school.has_groovelab_subscription || !school.is_billing_booked || school.subscription_bypass) : true) &&
    (user?.is_groovelab_active || user?.role === 'admin' || user?.role === 'secretary')
  );

  return (
    <aside className={`sidebar-nav ${isCollapsed ? 'is-collapsed' : ''}`} style={{ display: windowWidth >= 769 ? 'flex' : 'none' }}>
      {/* ── Intelligent Sidebar Header ── */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px', 
        width: '100%', 
        padding: '2px 2px 6px 2px',
        boxSizing: 'border-box'
      }}>
        {/* Top Row: School Branding + Collapse Button */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isCollapsed ? 'center' : 'space-between', 
          width: '100%',
          gap: '8px'
        }}>
          {!isCollapsed && (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                minWidth: 0, 
                flex: 1 
              }}
              title={school?.name || 'Meine Musikschule'}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(51, 65, 85, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155',
                flexShrink: 0
              }}>
                <School size={15} color="#334155" />
              </div>
              <span style={{
                fontSize: '0.84rem',
                fontWeight: 800,
                color: '#1e293b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '-0.01em',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                {school?.name || 'Musäk Bad Säckingen'}
              </span>
            </div>
          )}

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
              title={isCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
              style={{
                width: isCollapsed ? '44px' : '30px',
                height: isCollapsed ? '44px' : '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: isCollapsed ? '12px' : '8px',
                border: activePlatform === 'campus' ? '1.5px solid rgba(52, 168, 83, 0.35)' : '1px solid #e2e8f0',
                background: activePlatform === 'campus' ? 'rgba(52, 168, 83, 0.08)' : '#f8fafc',
                color: activePlatform === 'campus' ? '#34a853' : '#64748b',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              className="hover-scale"
            >
              {isCollapsed ? <PanelLeftOpen size={18} color={activePlatform === 'campus' ? '#34a853' : 'currentColor'} /> : <PanelLeftClose size={15} color={activePlatform === 'campus' ? '#34a853' : 'currentColor'} />}
            </button>
          )}
        </div>

        {/* Dual-Role Switcher: „Zur Verwaltung“ (Strictly for teachers with dual admin/secretary roles, nur im ausgeklappten Zustand) */}
        {!isCollapsed && user && Array.isArray(user.roles) && (user.roles.includes('admin') || user.roles.includes('secretary')) && onSwitchActiveRole && (
          <button
            type="button"
            onClick={() => onSwitchActiveRole(user.roles.includes('admin') ? 'admin' : 'secretary')}
            title="Zur Schulverwaltung wechseln"
            aria-label="Zur Schulverwaltung wechseln"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              height: '36px',
              padding: '0 12px',
              borderRadius: '9999px',
              background: '#fef2f2',
              border: 'none',
              color: '#b91c1c',
              fontWeight: 750,
              fontSize: '0.78rem',
              letterSpacing: '-0.01em',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              cursor: 'pointer',
              transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 1px 3px rgba(239, 68, 68, 0.08)'
            }}
            className="hover-scale"
          >
            <ArrowLeftRight size={13} color="#ea4335" strokeWidth={2.2} />
            <School size={15} color="#ea4335" strokeWidth={2.2} />
            <span>Zur Verwaltung</span>
          </button>
        )}

        {/* Trial Days Pill (if trial active) */}
        {!isCollapsed && (user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary') && school?.is_trial && !school?.subscription_bypass && trialDaysLeft !== null && trialDaysLeft !== undefined && (
          <button
            type="button"
            onClick={() => setShowTrialInfoModal?.(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              height: '28px',
              padding: '0 8px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              border: 'none',
              color: 'white',
              fontWeight: 850,
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.2)'
            }}
            className="hover-scale"
            title="Details zur Probezeit"
          >
            <AlertCircle size={12} color="white" />
            <span>{trialDaysLeft > 0 ? `Probezeit: ${trialDaysLeft} ${trialDaysLeft === 1 ? 'Tag' : 'Tage'}` : 'Probezeit abgelaufen'}</span>
          </button>
        )}
      </div>
      <div className="sidebar-logo" style={{ padding: '6px 0px 8px 0px', width: '100%' }}>
        {isGrooveLabBooked && setActivePlatform ? (
          <div
            role="tablist"
            aria-label="Plattformauswahl"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '13px',
              border: '1px solid #e2e8f0',
              width: '100%',
              gap: '4px',
              boxSizing: 'border-box'
            }}
          >
            {/* Campus Segment - 2-zeilig (Icon über Text) */}
            <button
              type="button"
              role="tab"
              aria-selected={activePlatform === 'campus'}
              onClick={() => {
                if (activePlatform !== 'campus') {
                  setActivePlatform('campus');
                  const rawCampusTab = sessionStorage.getItem('campus_active_tab');
                  const startTab = (rawCampusTab && rawCampusTab !== 'live') ? rawCampusTab : 'briefing';
                  setActiveStudentTab(startTab);
                  sessionStorage.setItem('campus_active_tab', startTab);
                }
              }}
              style={{
                height: '50px',
                borderRadius: '10px',
                border: 'none',
                background: activePlatform === 'campus' ? '#34a853' : 'transparent',
                color: activePlatform === 'campus' ? '#ffffff' : '#64748b',
                fontWeight: activePlatform === 'campus' ? 800 : 650,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: activePlatform === 'campus' ? '0 2px 8px rgba(52, 168, 83, 0.32)' : 'none',
                outline: 'none',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '-0.01em',
                userSelect: 'none',
                touchAction: 'manipulation',
                boxSizing: 'border-box'
              }}
              className="hover-scale-mini"
              title="Zu Campus wechseln"
            >
              <GraduationCap 
                size={18} 
                color={activePlatform === 'campus' ? '#ffffff' : 'rgba(52, 168, 83, 0.85)'} 
              />
              <span>Campus</span>
            </button>

            {/* GrooveLab Segment - 2-zeilig (Icon über Text) */}
            <button
              type="button"
              role="tab"
              aria-selected={activePlatform === 'groovelab'}
              onClick={() => {
                if (activePlatform !== 'groovelab') {
                  if (user?.role === 'teacher') {
                    sessionStorage.setItem('groovelab_active_workspace', 'teacher');
                  }
                  setActivePlatform('groovelab');
                  const isStaff = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary';
                  if (isStaff) {
                    sessionStorage.setItem('groovelab_location_mode', 'lab');
                  }
                  setActiveStudentTab('live');
                  sessionStorage.setItem('groovelab_active_tab', 'live');
                  localStorage.setItem('groovelab_active_tab', 'live');
                }
              }}
              style={{
                height: '50px',
                borderRadius: '10px',
                border: 'none',
                background: activePlatform === 'groovelab' ? '#facc15' : 'transparent',
                color: activePlatform === 'groovelab' ? '#0f172a' : '#64748b',
                fontWeight: activePlatform === 'groovelab' ? 800 : 650,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: activePlatform === 'groovelab' ? '0 2px 8px rgba(234, 179, 8, 0.35)' : 'none',
                outline: 'none',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '-0.01em',
                userSelect: 'none',
                touchAction: 'manipulation',
                boxSizing: 'border-box'
              }}
              className="hover-scale-mini"
              title="Zu GrooveLab wechseln"
            >
              <CampusRibbonNoteIcon 
                size={18} 
                color={activePlatform === 'groovelab' ? '#0f172a' : 'rgba(202, 138, 4, 0.85)'} 
              />
              <span>GrooveLab</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activePlatform === 'campus' ? (
              <>
                <div style={{ 
                  width: '42px', 
                  height: '42px', 
                  background: 'rgba(52, 168, 83, 0.08)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(52, 168, 83, 0.1)'
                }}>
                  <GraduationCap size={24} color="#34a853" />
                </div>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 900, 
                  color: '#34a853',
                  letterSpacing: '-0.02em'
                }}>Campus</div>
              </>
            ) : (
              <>
                <div style={{ 
                  width: '42px', 
                  height: '42px', 
                  background: '#fefce8', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(234, 179, 8, 0.1)'
                }}>
                  <CampusRibbonNoteIcon size={24} color="#eab308" />
                </div>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 900, 
                  color: '#eab308',
                  letterSpacing: '-0.02em'
                }}>GrooveLab</div>
              </>
            )}
          </div>
        )}
      </div>

      <nav className="sidebar-menu" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {user.role?.toLowerCase() === 'student' ? (
          activePlatform === 'campus' ? (() => {
            const campusSettings = user?.schools?.opening_hours?.campus_settings || {};
            const showLeaderboard = campusSettings.show_leaderboard !== false;
            const flamesActive = campusSettings.flames_active !== false;

            const isBoardAllowedForChild = (boardId: string) => {
              if (campusStudentUiLevel === 'pro') return true;

              // Local override if parent configured it
              if (typeof window !== 'undefined') {
                const override = localStorage.getItem(`campus_board_override_${boardId}`);
                if (override === 'true') return true;
                if (override === 'false') return false;
              }

              if (campusStudentUiLevel === 'junior') {
                const juniorAllowed = ['briefing', 'homework_book', 'practice_board', 'events', 'settings'];
                return juniorAllowed.includes(boardId);
              }
              return true;
            };

            const toggleBoardForChild = (boardId: string, e?: React.MouseEvent) => {
              if (e) e.stopPropagation();
              const current = isBoardAllowedForChild(boardId);
              const next = !current;
              localStorage.setItem(`campus_board_override_${boardId}`, String(next));
              if (boardId === 'messages') {
                localStorage.setItem('campus_allow_chat', String(next));
              }
              if (boardId === 'campus_cup') {
                localStorage.setItem('campus_allow_leaderboard', String(next));
              }
              if (user?.id) {
                const nextPerms = {
                  ...(user?.parent_permissions || {}),
                  [`board_${boardId}`]: next
                };
                (async () => {
                  try {
                    const activeLeaseToken = typeof window !== 'undefined'
                      ? (sessionStorage.getItem('gl_parent_session_lease') || sessionStorage.getItem('gl_active_session_lease_id'))
                      : null;
                    const { error } = await supabase.rpc('save_parent_controls', {
                      p_student_id: user.id,
                      p_settings: {
                        parent_permissions: nextPerms,
                        ...(activeLeaseToken ? { lease_token: activeLeaseToken } : {})
                      }
                    });
                    if (error) throw error;
                  } catch {
                    try {
                      await supabase.from('users').update({
                        parent_permissions: nextPerms
                      }).eq('id', user.id);
                    } catch (err) {}
                  }
                })();
              }
              window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId, allowed: next } }));
              setParentPermissionsVersion(v => v + 1);
            };

            const renderParentStatusPill = (boardId: string) => {
              if (!parentUnlocked) return null;
              const isAllowed = isBoardAllowedForChild(boardId);
              return (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => toggleBoardForChild(boardId, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleBoardForChild(boardId);
                    }
                  }}
                  title={isAllowed ? 'Für Kind freigegeben (Klicken zum Sperren)' : 'Für Kind gesperrt (Klicken zum Freigeben)'}
                  style={{
                    marginLeft: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '22px',
                    height: '22px',
                    minWidth: '22px',
                    borderRadius: '8px',
                    background: isAllowed ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f1f5f9',
                    color: isAllowed ? '#ffffff' : '#64748b',
                    border: isAllowed ? 'none' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    boxShadow: isAllowed ? '0 1px 4px rgba(16, 185, 129, 0.25)' : 'none',
                    outline: 'none'
                  }}
                  className="hover-scale"
                >
                  {isAllowed ? <Check size={13} strokeWidth={3} color="#ffffff" /> : <Lock size={12} strokeWidth={2.5} />}
                </span>
              );
            };

            return (
              <>
                <CampusSidebarRailItem
                  icon={<Monitor size={20} />}
                  label="Briefing"
                  isActive={['briefing', 'profile'].includes(activeStudentTab)}
                  isCollapsed={isCollapsed}
                  platform={activePlatform}
                  onClick={() => setActiveStudentTab('briefing')}
                />
                {(user?.schools?.opening_hours?.gl_campus_meisterwerk_enabled !== false || parentUnlocked) && (
                  <CampusSidebarRailItem
                    icon={<BookOpen size={20} />}
                    label="Aufgaben"
                    isActive={activeStudentTab === 'homework_book'}
                    isCollapsed={isCollapsed}
                    platform={activePlatform}
                    onClick={() => { setActiveStudentTab('homework_book'); window.dispatchEvent(new CustomEvent('campus_reset_homework_board')); }}
                  />
                )}
                {(parentUnlocked || (flamesActive && isBoardAllowedForChild('practice_board'))) && (
                  <CampusSidebarRailItem
                    icon={<Zap size={20} />}
                    label="Übe-Pfad"
                    isActive={activeStudentTab === 'practice_board'}
                    isCollapsed={isCollapsed}
                    platform={activePlatform}
                    onClick={() => setActiveStudentTab('practice_board')}
                    rightSlot={renderParentStatusPill('practice_board')}
                    style={{ opacity: parentUnlocked && !isBoardAllowedForChild('practice_board') ? 0.72 : 1 }}
                  />
                )}

                {(parentUnlocked || isBoardAllowedForChild('events')) && (
                  <CampusSidebarRailItem
                    icon={<Calendar size={20} />}
                    label="Termine"
                    isActive={activeStudentTab === 'events'}
                    isCollapsed={isCollapsed}
                    platform={activePlatform}
                    onClick={() => setActiveStudentTab('events')}
                    onMouseEnter={() => { import('../CampusEventsBoard'); }}
                    rightSlot={renderParentStatusPill('events')}
                    style={{ opacity: parentUnlocked && !isBoardAllowedForChild('events') ? 0.72 : 1 }}
                  />
                )}

                {(parentUnlocked || isBoardAllowedForChild('messages')) && (
                  <CampusSidebarRailItem
                    icon={<Mail size={20} />}
                    label="Nachrichten"
                    isActive={activeStudentTab === 'messages'}
                    isCollapsed={isCollapsed}
                    platform={activePlatform}
                    badgeCount={!parentUnlocked ? campusUnreadCount : 0}
                    onClick={() => setActiveStudentTab('messages')}
                    rightSlot={renderParentStatusPill('messages')}
                    style={{ opacity: parentUnlocked && !isBoardAllowedForChild('messages') ? 0.72 : 1 }}
                  />
                )}

                {(() => {
                  const isAdult = Boolean(
                    user?.is_adult === true || (() => {
                      const rawBd = (user as any)?.birthdate || (user as any)?.birth_date;
                      if (!rawBd) return false;
                      const bd = new Date(rawBd);
                      if (isNaN(bd.getTime())) return false;
                      const age = Math.abs(new Date(Date.now() - bd.getTime()).getUTCFullYear() - 1970);
                      return age >= 18;
                    })()
                  );
                  const isMinor = user?.role === 'student' && !isAdult;
                  const showParentMode = isMinor && !parentUnlocked;

                  return (
                    <CampusSidebarRailItem
                      icon={showParentMode ? <ShieldCheck size={20} /> : <Settings size={20} />}
                      label={showParentMode ? 'Elternbereich' : (isMinor ? 'Einstellungen' : 'Mein Account')}
                      isActive={activeStudentTab === 'settings'}
                      isCollapsed={isCollapsed}
                      platform={activePlatform}
                      onClick={() => setActiveStudentTab('settings')}
                    />
                  );
                })()}
              </>
            );
          })()
          : activePlatform === 'ensembles' ? (
            <>
              <CampusSidebarRailItem
                icon={<Users size={20} />}
                label="Ensembles & Bands"
                isActive={activeStudentTab === 'overview'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('overview')}
              />
            </>
          ) : (
            <>
              <CampusSidebarRailItem
                icon={<Monitor size={20} />}
                label="Live Lab"
                isActive={activeStudentTab === 'live'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                hasPulseDot={true}
                onClick={() => setActiveStudentTab('live')}
              />

              {/* Only for instrumentalists */}
              {!user.is_external_vocalist && (
                <>
                  <CampusSidebarRailItem
                    icon={<Play size={20} fill={activeStudentTab === 'practice' ? 'currentColor' : 'none'} />}
                    label="Üben"
                    isActive={activeStudentTab === 'practice'}
                    isCollapsed={isCollapsed}
                    platform={activePlatform}
                    onClick={() => setActiveStudentTab('practice')}
                  />
                  <CampusSidebarRailItem
                    icon={<Library size={20} />}
                    label="Bibliothek"
                    isActive={activeStudentTab === 'library'}
                    isCollapsed={isCollapsed}
                    platform={activePlatform}
                    onClick={() => setActiveStudentTab('library')}
                  />
                </>
              )}

              <CampusSidebarRailItem
                icon={<Award size={20} />}
                label="Repertoire"
                isActive={activeStudentTab === 'repertoire'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('repertoire')}
              />

              {!user.is_external_vocalist && (
                <CampusSidebarRailItem
                  icon={<Users size={20} />}
                  label="Band-Matching"
                  isActive={activeStudentTab === 'matching'}
                  isCollapsed={isCollapsed}
                  platform={activePlatform}
                  onClick={() => setActiveStudentTab('matching')}
                />
              )}

              <CampusSidebarRailItem
                icon={<Box size={20} />}
                label="Bands"
                isActive={activeStudentTab === 'bands'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('bands')}
              />

              <CampusSidebarRailItem
                icon={<Megaphone size={20} />}
                label="Nachrichten"
                isActive={activeStudentTab === 'messages'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                badgeCount={studentMessages.filter(m => !m.read_by?.includes(user?.id)).length}
                onClick={() => setActiveStudentTab('messages')}
              />
            </>
          )
        ) : (
          activePlatform === 'campus' ? (
            <>
              <CampusSidebarRailItem
                icon={<Monitor size={20} />}
                label="Briefing"
                isActive={activeStudentTab === 'briefing'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('briefing')}
              />
              <CampusSidebarRailItem
                icon={<Calendar size={20} />}
                label="Stundenplan"
                isActive={activeStudentTab === 'schedule'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('schedule')}
              />
              <CampusSidebarRailItem
                icon={<Calendar size={20} />}
                label="Termine"
                isActive={activeStudentTab === 'events'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('events')}
                onMouseEnter={() => { import('../CampusEventsBoard'); }}
              />
              <CampusSidebarRailItem
                icon={<Mail size={20} />}
                label="Nachrichten"
                isActive={activeStudentTab === 'messages'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                badgeCount={campusUnreadCount}
                onClick={() => setActiveStudentTab('messages')}
              />
              <CampusSidebarRailItem
                icon={<Users size={20} />}
                label="Schüler"
                isActive={activeStudentTab === 'students'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('students')}
              />
              <CampusSidebarRailItem
                icon={<Library size={20} />}
                label="Mediathek"
                isActive={activeStudentTab === 'songs'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('songs')}
              />
              <CampusSidebarRailItem
                icon={<Box size={20} />}
                label="Räume"
                isActive={activeStudentTab === 'rooms'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('rooms')}
              />
              {showMissionsFeature && (
                <CampusSidebarRailItem
                  icon={<Compass size={20} />}
                  label="Missions"
                  isActive={activeStudentTab === 'missions'}
                  isCollapsed={isCollapsed}
                  platform={activePlatform}
                  onClick={() => setActiveStudentTab('missions')}
                />
              )}
              {user.role !== 'teacher' && (
                <CampusSidebarRailItem
                  icon={<Trophy size={20} />}
                  label="Highlights & Fortschritt"
                  isActive={activeStudentTab === 'stats'}
                  isCollapsed={isCollapsed}
                  platform={activePlatform}
                  onClick={() => setActiveStudentTab('stats')}
                />
              )}
              <CampusSidebarRailItem
                icon={<Settings size={20} />}
                label="Einstellungen"
                isActive={activeStudentTab === 'setup'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('setup')}
              />
            </>
          ) : activePlatform === 'ensembles' ? (
            <>
              <CampusSidebarRailItem
                icon={<Users size={20} />}
                label="Ensembles & Bands"
                isActive={activeStudentTab === 'overview'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('overview')}
              />
            </>
          ) : (
            <>
              <CampusSidebarRailItem
                icon={<Monitor size={20} />}
                label="Live Lab"
                isActive={activeStudentTab === 'live'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                hasPulseDot={true}
                onClick={() => setActiveStudentTab('live')}
              />
              {school?.has_campus_subscription && (
                <CampusSidebarRailItem
                  icon={<Mail size={20} />}
                  label="Nachrichten"
                  isActive={activeStudentTab === 'messages'}
                  isCollapsed={isCollapsed}
                  platform={activePlatform}
                  onClick={() => setActiveStudentTab('messages')}
                />
              )}
              <CampusSidebarRailItem
                icon={<Users size={20} />}
                label="Schüler"
                isActive={activeStudentTab === 'students'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('students')}
              />
              <CampusSidebarRailItem
                icon={<Shield size={20} />}
                label="Team"
                isActive={activeStudentTab === 'team'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('team')}
              />
              {(school?.has_campus_subscription || school?.has_groovelab_subscription) && (
                <CampusSidebarRailItem
                  icon={<Box size={20} />}
                  label="Räume"
                  isActive={activeStudentTab === 'rooms'}
                  isCollapsed={isCollapsed}
                  platform={activePlatform}
                  onClick={() => setActiveStudentTab('rooms')}
                />
              )}
              <CampusSidebarRailItem
                icon={<Library size={20} />}
                label="Songs"
                isActive={activeStudentTab === 'songs'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('songs')}
              />
              <CampusSidebarRailItem
                icon={<Box size={20} />}
                label="Bands"
                isActive={activeStudentTab === 'bands'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('bands')}
              />
              <CampusSidebarRailItem
                icon={<Music size={20} />}
                label="Statistik"
                isActive={activeStudentTab === 'stats'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('stats')}
              />
              <CampusSidebarRailItem
                icon={<QrCode size={20} />}
                label="ID Galerie"
                isActive={activeStudentTab === 'gallery'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('gallery')}
              />
              <CampusSidebarRailItem
                icon={<Settings size={20} />}
                label="Einstellungen"
                isActive={activeStudentTab === 'setup'}
                isCollapsed={isCollapsed}
                platform={activePlatform}
                onClick={() => setActiveStudentTab('setup')}
              />
            </>
          )
        )}
      </nav>

      {/* ── Gemini-Style Compact User Hub (Avatar, Quick-Ausweis & Popover) ── */}
      <div style={{ 
        marginTop: 'auto', 
        borderTop: '1px solid #f1f5f9', 
        padding: isCollapsed ? '12px 6px' : '12px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <CampusSidebarUserHub
          user={user}
          activePlatform={activePlatform}
          activeStudentTab={activeStudentTab}
          setActiveStudentTab={setActiveStudentTab}
          activeWorkspace={activeWorkspace}
          teachers={teachers}
          session={session}
          isCollapsed={isCollapsed}
          onShowQr={onShowQr}
          onLogout={onLogout}
          onOpenPrivacy={onOpenPrivacy}
          onOpenAgb={onOpenAgb}
          onOpenImpressum={onOpenImpressum}
          onOpenAccessibility={onOpenAccessibility}
          onSwitchActiveRole={onSwitchActiveRole}
          isMusicStandMode={isMusicStandMode}
          toggleMusicStandMode={toggleMusicStandMode}
        />
      </div>
    </aside>
  );
};

export default CampusDesktopSidebar;
