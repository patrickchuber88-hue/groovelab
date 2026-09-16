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
  ZoomIn 
} from 'lucide-react';
import { StudioAvatar } from '../StudioAvatar';
import { formatTeacherFullName } from '../../utils/nameHelper';

export interface CampusDesktopSidebarProps {
  user: any;
  school: any;
  activePlatform: 'campus' | 'groovelab' | 'ensembles' | string;
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
}

export const CampusDesktopSidebar: React.FC<CampusDesktopSidebarProps> = ({
  user,
  school,
  activePlatform,
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
  setParentPermissionsVersion
}) => {
  return (
    <aside className="sidebar-nav" style={{ display: windowWidth >= 1024 ? 'flex' : 'none' }}>
      <div className="sidebar-logo" style={{ padding: '8px 0px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <GraduationCap size={24} color="#34a853" strokeWidth={3} />
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
              <Music size={24} color="#eab308" strokeWidth={3} />
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

      <nav className="sidebar-menu" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {user.role?.toLowerCase() === 'student' ? (
          activePlatform === 'campus' ? (() => {
            const campusSettings = user?.schools?.opening_hours?.campus_settings || {};
            const showLeaderboard = campusSettings.show_leaderboard !== false;
            const flamesActive = campusSettings.flames_active !== false;

            const isBoardAllowedForChild = (boardId: string) => {
              if (campusStudentUiLevel === 'pro') return true;

              // Mediathek (reine Metadaten, Play-Alongs & Übe-Fahrpläne) ist für alle Altersstufen immer aktiv
              if (boardId === 'mediathek') return true;

              // Local override if parent configured it
              if (typeof window !== 'undefined') {
                const override = localStorage.getItem(`campus_board_override_${boardId}`);
                if (override === 'true') return true;
                if (override === 'false') return false;
              }

              if (campusStudentUiLevel === 'junior') {
                const juniorAllowed = ['briefing', 'homework_book', 'practice_board', 'mediathek', 'events', 'settings'];
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
                    background: isAllowed ? '#dcfce7' : '#f1f5f9',
                    color: isAllowed ? '#16a34a' : '#64748b',
                    border: isAllowed ? '1px solid #86efac' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    boxShadow: isAllowed ? '0 1px 3px rgba(22, 163, 74, 0.12)' : 'none',
                    outline: 'none'
                  }}
                  className="hover-scale"
                >
                  {isAllowed ? <Check size={13} strokeWidth={3} /> : <Lock size={12} strokeWidth={2.5} />}
                </span>
              );
            };

            return (
              <>
                <button 
                  type="button"
                  onClick={() => setActiveStudentTab('briefing')} 
                  className={`sidebar-item ${['briefing', 'profile'].includes(activeStudentTab) ? `active ${activePlatform}` : ''}`}
                >
                  <Monitor size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Briefing</span>
                </button>
                <button 
                  type="button"
                  onClick={() => { setActiveStudentTab('homework_book'); window.dispatchEvent(new CustomEvent('campus_reset_homework_board')); }} 
                  className={`sidebar-item ${activeStudentTab === 'homework_book' ? `active ${activePlatform}` : ''}`}
                >
                  <BookOpen size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Aufgaben</span>
                </button>
                {(parentUnlocked || (flamesActive && isBoardAllowedForChild('practice_board'))) && (
                  <button 
                    type="button"
                    onClick={() => setActiveStudentTab('practice_board')} 
                    className={`sidebar-item ${activeStudentTab === 'practice_board' ? `active ${activePlatform}` : ''}`}
                    style={{ opacity: parentUnlocked && !isBoardAllowedForChild('practice_board') ? 0.72 : 1 }}
                  >
                    <Zap size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Übe-Pfad</span>
                    {renderParentStatusPill('practice_board')}
                  </button>
                )}
                {(parentUnlocked || isBoardAllowedForChild('mediathek')) && (
                  <button 
                    type="button"
                    onClick={() => setActiveStudentTab('mediathek')} 
                    className={`sidebar-item ${activeStudentTab === 'mediathek' ? `active ${activePlatform}` : ''}`}
                    style={{ opacity: parentUnlocked && !isBoardAllowedForChild('mediathek') ? 0.72 : 1 }}
                  >
                    <Library size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Mediathek</span>
                    {renderParentStatusPill('mediathek')}
                  </button>
                )}
                {(parentUnlocked || isBoardAllowedForChild('events')) && (
                  <button 
                    type="button"
                    onClick={() => setActiveStudentTab('events')} 
                    className={`sidebar-item ${activeStudentTab === 'events' ? `active ${activePlatform}` : ''}`}
                    style={{ opacity: parentUnlocked && !isBoardAllowedForChild('events') ? 0.72 : 1 }}
                  >
                    <Calendar size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Termine</span>
                    {renderParentStatusPill('events')}
                  </button>
                )}
                {(parentUnlocked || (showLeaderboard && isBoardAllowedForChild('campus_cup'))) && (
                  <button 
                    type="button"
                    onClick={() => setActiveStudentTab('campus_cup')} 
                    className={`sidebar-item ${activeStudentTab === 'campus_cup' ? `active ${activePlatform}` : ''}`}
                    style={{ opacity: parentUnlocked && !isBoardAllowedForChild('campus_cup') ? 0.72 : 1 }}
                    title="Highlights & Fortschritt"
                  >
                    <Trophy size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.82rem', letterSpacing: '-0.02em' }}>Highlights &amp; Fortschritt</span>
                    {renderParentStatusPill('campus_cup')}
                  </button>
                )}

                {(parentUnlocked || isBoardAllowedForChild('messages')) && (
                  <button 
                    type="button"
                    onClick={() => setActiveStudentTab('messages')} 
                    className={`sidebar-item ${activeStudentTab === 'messages' ? `active ${activePlatform}` : ''}`} 
                    style={{ opacity: parentUnlocked && !isBoardAllowedForChild('messages') ? 0.72 : 1, position: 'relative' }}
                  >
                    <Mail size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Nachrichten</span>
                    {campusUnreadCount > 0 && !parentUnlocked && (
                      <div style={{ 
                        background: '#ef4444', 
                        color: 'white', 
                        borderRadius: '50%', 
                        minWidth: '18px', 
                        height: '18px', 
                        padding: '0 5px', 
                        fontSize: '0.65rem', 
                        fontWeight: 900, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        marginLeft: 'auto', 
                        boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)' 
                      }}>{campusUnreadCount}</div>
                    )}
                    {renderParentStatusPill('messages')}
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setActiveStudentTab('settings')} 
                  className={`sidebar-item ${activeStudentTab === 'settings' ? `active ${activePlatform}` : ''}`}
                >
                  {(campusStudentUiLevel === 'junior' || campusStudentUiLevel === 'teen') && !parentUnlocked ? (
                    <>
                      <ShieldCheck size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Elternbereich</span>
                    </>
                  ) : (
                    <>
                      <Settings size={20} style={{ flexShrink: 0 }} /> <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Einstellungen</span>
                    </>
                  )}
                </button>
              </>
            );
          })()
          : activePlatform === 'ensembles' ? (
            <>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('overview')} 
                className={`sidebar-item ${activeStudentTab === 'overview' ? `active ${activePlatform}` : ''}`}
              >
                <Users size={20} /> Ensembles & Bands
              </button>
            </>
          ) : (
            <>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('live')} 
                className={`sidebar-item ${activeStudentTab === 'live' ? `active ${activePlatform}` : ''}`} 
                style={{ position: 'relative' }}
              >
                <Monitor size={20} /> Live Lab
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444', marginLeft: 'auto', flexShrink: 0 }} className="animate-pulse"></div>
              </button>

              {/* Only for instrumentalists */}
              {!user.is_external_vocalist && (
                <>
                  <button 
                    type="button"
                    onClick={() => setActiveStudentTab('practice')} 
                    className={`sidebar-item ${activeStudentTab === 'practice' ? `active ${activePlatform}` : ''}`}
                  >
                    <Play size={20} fill={activeStudentTab === 'practice' ? 'white' : 'none'} /> Üben
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveStudentTab('library')} 
                    className={`sidebar-item ${activeStudentTab === 'library' ? `active ${activePlatform}` : ''}`}
                  >
                    <Library size={20} /> Bibliothek
                  </button>
                </>
              )}

              <button 
                type="button"
                onClick={() => setActiveStudentTab('repertoire')} 
                className={`sidebar-item ${activeStudentTab === 'repertoire' ? `active ${activePlatform}` : ''}`}
              >
                <Award size={20} /> Repertoire
              </button>

              {!user.is_external_vocalist && (
                <button 
                  type="button"
                  onClick={() => setActiveStudentTab('matching')} 
                  className={`sidebar-item ${activeStudentTab === 'matching' ? `active ${activePlatform}` : ''}`}
                >
                  <Users size={20} /> Band-Matching
                </button>
              )}

              <button 
                type="button"
                onClick={() => setActiveStudentTab('bands')} 
                className={`sidebar-item ${activeStudentTab === 'bands' ? `active ${activePlatform}` : ''}`}
              >
                <Box size={20} /> Bands
              </button>

              <button 
                type="button"
                onClick={() => setActiveStudentTab('messages')} 
                className={`sidebar-item ${activeStudentTab === 'messages' ? `active ${activePlatform}` : ''}`} 
                style={{ position: 'relative' }}
              >
                <Megaphone size={20} /> Nachrichten
                {studentMessages.filter(m => !m.read_by?.includes(user?.id)).length > 0 && (
                  <div style={{ 
                    background: '#ef4444', 
                    color: 'white', 
                    borderRadius: '50%', 
                    minWidth: '18px', 
                    height: '18px', 
                    padding: '0 5px', 
                    fontSize: '0.65rem', 
                    fontWeight: 900, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginLeft: 'auto', 
                    boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)' 
                  }}>{studentMessages.filter(m => !m.read_by?.includes(user?.id)).length}</div>
                )}
              </button>
            </>
          )
        ) : (
          activePlatform === 'campus' ? (
            <>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('briefing')} 
                className={`sidebar-item ${activeStudentTab === 'briefing' ? `active ${activePlatform}` : ''}`} 
                style={{ position: 'relative' }}
              >
                <Monitor size={20} /> Briefing
              </button>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('schedule')} 
                className={`sidebar-item ${activeStudentTab === 'schedule' ? `active ${activePlatform}` : ''}`}
              >
                <Calendar size={20} /> Stundenplan
              </button>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('events')} 
                className={`sidebar-item ${activeStudentTab === 'events' ? `active ${activePlatform}` : ''}`}
              >
                <Calendar size={20} /> Termine
              </button>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('messages')} 
                className={`sidebar-item ${activeStudentTab === 'messages' ? `active ${activePlatform}` : ''}`} 
                style={{ position: 'relative' }}
              >
                <Mail size={20} /> Nachrichten
                {campusUnreadCount > 0 && (
                  <div style={{ 
                    background: '#ef4444', 
                    color: 'white', 
                    borderRadius: '50%', 
                    minWidth: '18px', 
                    height: '18px', 
                    padding: '0 5px', 
                    fontSize: '0.65rem', 
                    fontWeight: 900, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginLeft: 'auto', 
                    boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)' 
                  }}>{campusUnreadCount}</div>
                )}
              </button>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('students')} 
                className={`sidebar-item ${activeStudentTab === 'students' ? `active ${activePlatform}` : ''}`}
              >
                <Users size={20} /> Schüler
              </button>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('songs')} 
                className={`sidebar-item ${activeStudentTab === 'songs' ? `active ${activePlatform}` : ''}`}
              >
                <Library size={20} /> Mediathek
              </button>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('rooms')} 
                className={`sidebar-item ${activeStudentTab === 'rooms' ? `active ${activePlatform}` : ''}`}
              >
                <Box size={20} /> Räume
              </button>
              {showMissionsFeature && (
                <button 
                  type="button"
                  onClick={() => setActiveStudentTab('missions')} 
                  className={`sidebar-item ${activeStudentTab === 'missions' ? `active ${activePlatform}` : ''}`}
                >
                  <Compass size={20} /> Missions
                </button>
              )}
              <button 
                type="button"
                onClick={() => setActiveStudentTab('stats')} 
                className={`sidebar-item ${activeStudentTab === 'stats' ? `active ${activePlatform}` : ''}`}
              >
                <Trophy size={20} /> Highlights & Fortschritt
              </button>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('setup')} 
                className={`sidebar-item ${activeStudentTab === 'setup' ? `active ${activePlatform}` : ''}`}
              >
                <Settings size={20} /> Einstellungen
              </button>
            </>
          ) : activePlatform === 'ensembles' ? (
            <>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('overview')} 
                className={`sidebar-item ${activeStudentTab === 'overview' ? `active ${activePlatform}` : ''}`}
              >
                <Users size={20} /> Ensembles & Bands
              </button>
            </>
          ) : (
            <>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('live')} 
                className={`sidebar-item ${activeStudentTab === 'live' ? `active ${activePlatform}` : ''}`} 
                style={{ position: 'relative' }}
              >
                <Monitor size={20} /> Live Lab
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444', marginLeft: 'auto', flexShrink: 0 }} className="animate-pulse"></div>
              </button>
              {school?.has_campus_subscription && (
                <button 
                  type="button"
                  onClick={() => setActiveStudentTab('messages')} 
                  className={`sidebar-item ${activeStudentTab === 'messages' ? `active ${activePlatform}` : ''}`}
                >
                  <Mail size={20} /> Nachrichten
                </button>
              )}
              <button 
                type="button"
                onClick={() => setActiveStudentTab('students')} 
                className={`sidebar-item ${activeStudentTab === 'students' ? `active ${activePlatform}` : ''}`}
              >
                <Users size={20} /> Schüler
              </button>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('team')} 
                className={`sidebar-item ${activeStudentTab === 'team' ? `active ${activePlatform}` : ''}`}
              >
                <Shield size={20} /> Team
              </button>
              {(school?.has_campus_subscription || school?.has_groovelab_subscription) && (
                <button 
                  type="button"
                  onClick={() => setActiveStudentTab('rooms')} 
                  className={`sidebar-item ${activeStudentTab === 'rooms' ? `active ${activePlatform}` : ''}`}
                >
                  <Box size={20} /> Räume
                </button>
              )}
              <button 
                type="button"
                onClick={() => setActiveStudentTab('songs')} 
                className={`sidebar-item ${activeStudentTab === 'songs' ? `active ${activePlatform}` : ''}`}
              >
                <Library size={20} /> Songs
              </button>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('bands')} 
                className={`sidebar-item ${activeStudentTab === 'bands' ? `active ${activePlatform}` : ''}`}
              >
                <Box size={20} /> Bands
              </button>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('stats')} 
                className={`sidebar-item ${activeStudentTab === 'stats' ? `active ${activePlatform}` : ''}`}
              >
                <Music size={20} /> Statistik
              </button>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('gallery')} 
                className={`sidebar-item ${activeStudentTab === 'gallery' ? `active ${activePlatform}` : ''}`}
              >
                <QrCode size={20} /> ID Galerie
              </button>
              <button 
                type="button"
                onClick={() => setActiveStudentTab('setup')} 
                className={`sidebar-item ${activeStudentTab === 'setup' ? `active ${activePlatform}` : ''}`}
              >
                <Settings size={20} /> Einstellungen
              </button>
            </>
          )
        )}
      </nav>

      <div style={{ 
        marginTop: 'auto', 
        borderTop: '1px solid #f1f5f9', 
        padding: '20px 12px 12px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* Profile Card wrapper (clickable to open profile) */}
        <button 
          type="button"
          onClick={() => setActiveStudentTab('profile')} 
          style={{ 
            width: '100%',
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            gap: '8px', 
            padding: '14px 12px', 
            borderRadius: '16px', 
            border: activeStudentTab === 'profile'
              ? (activePlatform === 'campus' ? '2.5px solid #34a853' : '2.5px solid #eab308')
              : '1px solid #e2e8f0', 
            background: activeStudentTab === 'profile'
              ? (activePlatform === 'campus' ? '#e6f4ea' : '#fefce8')
              : '#f8fafc',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box'
          }}
        >
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <div style={{ 
              width: '58px', 
              height: '58px', 
              borderRadius: '16px', 
              overflow: 'hidden', 
              border: '2.5px solid white', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)' 
            }}>
              <StudioAvatar 
                src={user.photo_url} 
                user={{
                  ...user,
                  role: (activeWorkspace === 'teacher' || user.role === 'teacher') ? 'teacher' : user.role,
                  isTeacherContext: (activeWorkspace === 'teacher' || user.role === 'teacher'),
                  resolved_instrument: user.resolved_instrument || user.instrument || (teachers.find(t => t.id === user.teacher_id)?.instrument) || (teachers[0]?.instrument) || 'Gitarre'
                }} 
                activePlatform={activePlatform} 
                onClick={() => setActiveStudentTab('profile')} 
              />
            </div>
            {session && (
              <div style={{ 
                position: 'absolute', 
                bottom: -2, 
                right: -2, 
                width: '12px', 
                height: '12px', 
                background: activePlatform === 'campus' ? '#34a853' : '#eab308', 
                borderRadius: '50%', 
                border: '2px solid white' 
              }} />
            )}
          </div>

          {/* Name & Role centered underneath (Complete readable name, no truncate) */}
          <div style={{ minWidth: 0, width: '100%' }}>
            <div style={{ 
              fontWeight: 800, 
              fontSize: '0.88rem', 
              lineHeight: 1.25,
              color: '#0f172a', 
              whiteSpace: 'normal', 
              wordBreak: 'break-word',
              textAlign: 'center',
              marginBottom: '3px'
            }}>
              {user.role === 'student' ? 'Mein Profil' : formatTeacherFullName(user.first_name, user.last_name)}
            </div>
            <div style={{ 
              fontSize: '0.66rem', 
              fontWeight: 800, 
              color: '#64748b', 
              textTransform: 'uppercase', 
              letterSpacing: '0.04em',
              textAlign: 'center'
            }}>
              {activePlatform === 'campus'
                ? (user.role === 'admin' ? 'Campus Admin' : user.role === 'teacher' ? 'Campus Lehrkraft' : user.role === 'secretary' ? 'Campus Verwaltung' : 'Campus Schüler')
                : (user.role === 'admin' ? 'Groovelab Admin' : user.role === 'teacher' ? 'Groovelab Lehrer' : user.role === 'secretary' ? 'Groovelab Verwaltung' : (user.role === 'student' ? 'groovelab' : 'Groovelab Schüler'))}
            </div>
          </div>
        </button>

        {/* Notenständer-Modus Toggle Button (Student Goldstandard) -> Jetzt: Vergrößern */}
        {user.role?.toLowerCase() === 'student' && activePlatform === 'campus' && (
          <button 
            type="button"
            onClick={toggleMusicStandMode}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '11px 14px', 
              borderRadius: '12px', 
              border: isMusicStandMode ? '1.2px solid #bbf7d0' : '1px solid #e2e8f0', 
              background: isMusicStandMode ? '#f0fdf4' : '#f8fafc', 
              color: isMusicStandMode ? '#166534' : '#334155', 
              fontWeight: 800, 
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: isMusicStandMode ? '0 2px 8px rgba(52, 168, 83, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="hover-scale"
            title="Vergrößern: Großschrift & Glanceability für Notenständer & Distanz am Instrument (60–90 cm)"
            onMouseEnter={(e) => {
              if (!isMusicStandMode) {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#0f172a';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMusicStandMode) {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#334155';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ZoomIn size={16} color={isMusicStandMode ? '#166534' : '#64748b'} strokeWidth={2} />
              <span>Vergrößern</span>
            </div>
            <span style={{
              background: isMusicStandMode ? '#34a853' : '#f1f5f9',
              color: isMusicStandMode ? '#ffffff' : '#64748b',
              fontSize: '0.68rem',
              fontWeight: 950,
              padding: '2px 7px',
              borderRadius: '100px',
              letterSpacing: '0.02em'
            }}>
              {isMusicStandMode ? 'AKTIV' : 'AUS'}
            </span>
          </button>
        )}

        {/* Ausweis button (Hero CTA) */}
        {(user?.qr_token || user?.teacher_qr_token) && (() => {
          const isPureAdminOrSec = (user?.role === 'admin' || user?.role === 'secretary') && (!user?.roles || !user.roles.includes('teacher'));
          const themeGreen = activePlatform === 'campus' || (!isPureAdminOrSec && activePlatform !== 'ensembles' && activePlatform !== 'groovelab');
          const buttonBorder = isPureAdminOrSec 
            ? '1.2px solid rgba(234, 67, 53, 0.25)'
            : themeGreen
              ? '1.2px solid #bbf7d0' 
              : activePlatform === 'ensembles' 
                ? '1.2px solid #bfdbfe' 
                : '1.2px solid #fef08a';

          const buttonBg = isPureAdminOrSec 
            ? '#fef2f2'
            : themeGreen 
              ? '#f0fdf4' 
              : activePlatform === 'ensembles' 
                ? '#eff6ff' 
                : '#fefce8';

          const buttonColor = isPureAdminOrSec 
            ? '#b91c1c'
            : themeGreen 
              ? '#166534' 
              : activePlatform === 'ensembles' 
                ? '#1d4ed8' 
                : '#854d0e';

          return (
            <button 
              type="button"
              onClick={onShowQr}
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px', 
                padding: '11px 14px', 
                borderRadius: '12px', 
                border: buttonBorder, 
                background: buttonBg, 
                color: buttonColor, 
                fontWeight: 800, 
                fontSize: '0.82rem', 
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              className="hover-scale"
              title="Digitalen Ausweis öffnen"
            >
              <QrCode size={16} color={buttonColor} strokeWidth={2.2} /> Ausweis zeigen
            </button>
          );
        })()}

        {/* Abmelden button (De-escalated Clean Ghost Button) */}
        <button 
          type="button"
          onClick={() => onLogout(true, true)}
          style={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '7px', 
            padding: '9px 12px', 
            borderRadius: '10px', 
            border: '1px solid transparent', 
            background: 'transparent', 
            color: '#94a3b8', 
            fontWeight: 700, 
            fontSize: '0.78rem',
            cursor: 'pointer',
            transition: 'all 0.18s ease'
          }}
          title="Sicher von Campus-Groovelab abmelden"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fef2f2';
            e.currentTarget.style.color = '#dc2626';
            e.currentTarget.style.borderColor = '#fecdd3';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <LogOut size={14} strokeWidth={2} /> Abmelden
        </button>
        
        {/* Legal Links under logout (Single clean balanced row) */}
        <div style={{ 
          marginTop: '2px', 
          paddingTop: '8px',
          borderTop: '1px solid #f1f5f9', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '5px', 
          fontSize: '9.5px', 
          fontWeight: 700, 
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          width: '100%',
          userSelect: 'none'
        }}>
          <span 
            role="button"
            tabIndex={0}
            onClick={onOpenPrivacy} 
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenPrivacy(); } }}
            style={{ cursor: 'pointer', transition: 'color 0.15s', outline: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            Datenschutz
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span 
            role="button"
            tabIndex={0}
            onClick={onOpenAgb} 
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenAgb(); } }}
            style={{ cursor: 'pointer', transition: 'color 0.15s', outline: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            AGB
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span 
            role="button"
            tabIndex={0}
            onClick={onOpenImpressum} 
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenImpressum(); } }}
            style={{ cursor: 'pointer', transition: 'color 0.15s', outline: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            Impressum
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span 
            role="button"
            tabIndex={0}
            onClick={onOpenAccessibility} 
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenAccessibility(); } }}
            style={{ cursor: 'pointer', transition: 'color 0.15s', outline: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            Barrierefreiheit
          </span>
        </div>
      </div>
    </aside>
  );
};

export default CampusDesktopSidebar;
