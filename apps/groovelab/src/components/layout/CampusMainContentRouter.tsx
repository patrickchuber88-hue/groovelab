import React, { lazy, Suspense } from 'react';
import { ShieldCheck, User } from 'lucide-react';
import { ErrorBoundary, DashboardLoader } from '../ui/ErrorBoundary';
import { CampusStaffProfileView } from '../campus/CampusStaffProfileView';
import { GrooveLabProfileView } from '../groovelab/GrooveLabProfileView';
import { MessagesTabContainer } from '../messages/MessagesTabContainer';
import { StudentPracticeRepertoireTabs } from '../groovelab/StudentPracticeRepertoireTabs';
import { StudentBandMatchingSuite } from '../groovelab/StudentBandMatchingSuite';
import { StudentLibraryTab } from '../groovelab/StudentLibraryTab';
import { StudentTeamTab } from '../groovelab/StudentTeamTab';
import { generateRandomBandName } from '../../utils/bandNameGenerator';

const EnsembleDashboard = lazy(() => import('../EnsembleDashboard').then(m => ({ default: m.EnsembleDashboard })));
const TeacherDashboard = lazy(() => import('../TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const StudentAvatarDashboard = lazy(() => import('../StudentAvatarDashboard').then(m => ({ default: m.StudentAvatarDashboard })));
const AdminDashboard = lazy(() => import('../AdminDashboard').then(m => ({ default: m.AdminDashboard })));

export interface CampusMainContentRouterProps {
  windowWidth: number;
  activeStudentTab: string;
  parentUnlocked: boolean;
  setParentUnlocked: React.Dispatch<React.SetStateAction<boolean>>;
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  school: any;
  activePlatform: 'campus' | 'groovelab' | 'ensembles' | string;
  setActivePlatform: (platform: any) => void;
  setActiveStudentTab: (tab: string) => void;
  campusStudentUiLevel: string;
  setParentPermissionsVersion: React.Dispatch<React.SetStateAction<number>>;
  supabase: any;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarNotificationsCount: (count: number) => void;
  session: any;
  setSession: (session: any) => void;
  locationMode: 'lab' | 'home';
  setLocationMode: (mode: 'lab' | 'home') => void;
  setSuggestingSkill: (skill: any) => void;
  foundingName: string;
  setFoundingName: (name: string) => void;
  foundingLanguage: any;
  teachers: any[];
  campusTeacherStats: any;
  activeWorkspace: string | null;
  setShowQR: (show: boolean) => void;
  setShowPrivacy: (show: boolean) => void;
  setShowAgb: (show: boolean) => void;
  setShowCancellation: (show: boolean) => void;
  setShowImpressum: (show: boolean) => void;
  setShowAccessibility: (show: boolean) => void;
  userSongs: any[];
  userBands: any[];
  allBands: any[];
  brandColor: string;
  fetchPlanningData: (...args: any[]) => any;
  setAvatarPickerType: (type: any) => void;
  setShowAvatarPicker: (show: boolean) => void;
  setSelectedBandForProfile: (band: any) => void;
  setShowBandProfile: (show: boolean) => void;
  globalPlannedSlots: any;
  plannedSlots: any;
  toggleSlot: (day: string, hour: string) => void;
  loggedInUserId: string | null;
  handleLogout: (confirmFirst?: boolean, hardPurge?: boolean) => void;
  showMissionsFeature: boolean;
  schoolUsers: any[];
  campusMessages: any[];
  announcements: any[];
  studentMessages: any[];
  selectedCampusRecipient: any;
  setSelectedCampusRecipient: (recipient: any) => void;
  handleSendCampusMessage: (...args: any[]) => any;
  handleMarkCampusMessagesAsRead: (...args: any[]) => any;
  handleMarkCampusGroupAsRead: (...args: any[]) => any;
  handleMarkCampusChannelAsRead: (...args: any[]) => any;
  setAnnouncementTitle: (title: string) => void;
  setAnnouncementMessage: (message: string) => void;
  setAnnouncementTarget: (target: any) => void;
  setSelectedTargetUserIds: (ids: any) => void;
  handlePostAnnouncement: (...args: any[]) => any;
  handleDeleteAnnouncement: (id: string) => Promise<void>;
  handleAcknowledgeStudentMessage: (msgId: string) => Promise<void>;
  practiceSongs: any[];
  groupedPracticeSongs: any;
  groupedRepertoireSongs: any;
  practiceSearchQuery: string;
  setPracticeSearchQuery: (query: string) => void;
  practiceSearchType: any;
  setPracticeSearchType: (type: any) => void;
  practiceAlphaFilter: string | null;
  setPracticeAlphaFilter: (filter: string | null) => void;
  expandedSongId: string | null;
  setExpandedSongId: (id: string | null) => void;
  updateProgress: (songId: string, diff: number) => Promise<void> | void;
  handleSubmitForApproval: (songId: string) => Promise<void> | void;
  handleDeleteSong: (songId: string) => Promise<void> | void;
  setActivePdfSong: (song: any) => void;
  setActivePdfFolderUrl: (url: string | null) => void;
  isMobile: boolean;
  wallSongs: any[];
  matchingLevelFilter: any;
  setMatchingLevelFilter: (level: any) => void;
  activeBandSubTab: any;
  setActiveBandSubTab: (tab: any) => void;
  bandSearchText: string;
  setBandSearchText: (text: string) => void;
  bandSearchLetter: string | null;
  setBandSearchLetter: (letter: string | null) => void;
  setSelectedStudentForPreview: (student: any) => void;
  fetchDashboardData: (userId?: any, isInitial?: boolean) => Promise<void> | void;
  width: number;
  globalSongs: any[];
  handleAddSongToRepertoire: (song: any) => Promise<void> | void;
  setSelectedTeacher: (teacher: any) => void;
}

export const CampusMainContentRouter: React.FC<CampusMainContentRouterProps> = ({
  windowWidth,
  activeStudentTab,
  parentUnlocked,
  setParentUnlocked,
  user,
  setUser,
  school,
  activePlatform,
  setActivePlatform,
  setActiveStudentTab,
  campusStudentUiLevel,
  setParentPermissionsVersion,
  supabase,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  setSidebarNotificationsCount,
  session,
  setSession,
  locationMode,
  setLocationMode,
  setSuggestingSkill,
  foundingName,
  setFoundingName,
  foundingLanguage,
  teachers,
  campusTeacherStats,
  activeWorkspace,
  setShowQR,
  setShowPrivacy,
  setShowAgb,
  setShowCancellation,
  setShowImpressum,
  setShowAccessibility,
  userSongs,
  userBands,
  allBands,
  brandColor,
  fetchPlanningData,
  setAvatarPickerType,
  setShowAvatarPicker,
  setSelectedBandForProfile,
  setShowBandProfile,
  globalPlannedSlots,
  plannedSlots,
  toggleSlot,
  loggedInUserId,
  handleLogout,
  showMissionsFeature,
  schoolUsers,
  campusMessages,
  announcements,
  studentMessages,
  selectedCampusRecipient,
  setSelectedCampusRecipient,
  handleSendCampusMessage,
  handleMarkCampusMessagesAsRead,
  handleMarkCampusGroupAsRead,
  handleMarkCampusChannelAsRead,
  setAnnouncementTitle,
  setAnnouncementMessage,
  setAnnouncementTarget,
  setSelectedTargetUserIds,
  handlePostAnnouncement,
  handleDeleteAnnouncement,
  handleAcknowledgeStudentMessage,
  practiceSongs,
  groupedPracticeSongs,
  groupedRepertoireSongs,
  practiceSearchQuery,
  setPracticeSearchQuery,
  practiceSearchType,
  setPracticeSearchType,
  practiceAlphaFilter,
  setPracticeAlphaFilter,
  expandedSongId,
  setExpandedSongId,
  updateProgress,
  handleSubmitForApproval,
  handleDeleteSong,
  setActivePdfSong,
  setActivePdfFolderUrl,
  isMobile,
  wallSongs,
  matchingLevelFilter,
  setMatchingLevelFilter,
  activeBandSubTab,
  setActiveBandSubTab,
  bandSearchText,
  setBandSearchText,
  bandSearchLetter,
  setBandSearchLetter,
  setSelectedStudentForPreview,
  fetchDashboardData,
  width,
  globalSongs,
  handleAddSongToRepertoire,
  setSelectedTeacher,
}) => {
  return (
    <main id="main-content" tabIndex={-1} className="main-content" style={{ 
      overflow: (windowWidth <= 768 || activeStudentTab !== 'live') ? 'auto' : 'hidden', 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      padding: windowWidth <= 768 
        ? (activeStudentTab === 'live' ? '4px 4px 0 4px' : '4px 4px var(--mobile-scroll-clearance-bottom, calc(96px + env(safe-area-inset-bottom, 16px))) 4px') 
        : '10px',
      scrollPaddingTop: windowWidth <= 768 ? 'var(--mobile-scroll-clearance-top, calc(56px + env(safe-area-inset-top, 0px)))' : undefined,
      scrollPaddingBottom: windowWidth <= 768 ? 'var(--mobile-scroll-clearance-bottom, calc(96px + env(safe-area-inset-bottom, 16px)))' : undefined,
      boxSizing: 'border-box',
      minWidth: 0,
      width: '100%'
    }}>
      {/* 🛡️ Persistent Sticky Safety Banner when Parent Mode is active */}
      {parentUnlocked && user?.role?.toLowerCase() === 'student' && (
        <div style={{
          position: 'sticky',
          top: windowWidth <= 768 ? 'calc(54px + env(safe-area-inset-top, 0px))' : 0,
          zIndex: 890,
          background: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          padding: '8px 16px',
          borderRadius: '14px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem',
          fontWeight: 700,
          boxShadow: '0 2px 10px rgba(2, 132, 199, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#ffffff" />
              <span>Eltern-Vorschau aktiv</span>
            </div>

            {/* If active tab is a togglable board, show quick release toggle in the header */}
            {['practice_board', 'mediathek', 'events', 'campus_cup', 'messages'].includes(activeStudentTab) && (() => {
              const boardNames: Record<string, string> = {
                practice_board: 'Übe-Pfad',
                mediathek: 'Mediathek',
                events: 'Termine',
                campus_cup: 'Klassen-Highlights & Team-Power',
                messages: 'Nachrichten'
              };
              let allowed = true;
              if (campusStudentUiLevel === 'junior') {
                const juniorAllowed = ['briefing', 'homework_book', 'practice_board', 'events', 'settings'];
                allowed = juniorAllowed.includes(activeStudentTab);
              }
              const override = typeof window !== 'undefined' ? localStorage.getItem(`campus_board_override_${activeStudentTab}`) : null;
              if (override === 'true') allowed = true;
              if (override === 'false') allowed = false;

              const toggleActiveBoard = () => {
                const next = !allowed;
                localStorage.setItem(`campus_board_override_${activeStudentTab}`, String(next));
                if (activeStudentTab === 'messages') {
                  localStorage.setItem('campus_allow_chat', String(next));
                }
                if (activeStudentTab === 'campus_cup') {
                  localStorage.setItem('campus_allow_leaderboard', String(next));
                }
                if (user?.id) {
                  const nextPerms = {
                    ...(user?.parent_permissions || {}),
                    [`board_${activeStudentTab}`]: next
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
                window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId: activeStudentTab, allowed: next } }));
                setParentPermissionsVersion(v => v + 1);
              };

              return (
                <button
                  type="button"
                  onClick={toggleActiveBoard}
                  style={{
                    background: allowed ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                    border: allowed ? '1px solid #86efac' : '1px solid #fca5a5',
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: '100px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Klicken, um dieses Board für dein Kind freizugeben oder zu sperren"
                  className="hover-scale-subtle"
                >
                  <span>Board {boardNames[activeStudentTab]}:</span>
                  <span style={{ fontWeight: 900, textDecoration: 'underline' }}>
                    {allowed ? '✓ Für Kind freigegeben' : '🔒 Für Kind gesperrt'}
                  </span>
                </button>
              );
            })()}
          </div>

          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('groovelab_parent_unlocked_global');
              if (user?.id) {
                sessionStorage.removeItem(`groovelab_parent_unlocked_${user.id}`);
                sessionStorage.removeItem(`groovelab_parent_session_${user.id}`);
              }
              setParentUnlocked(false);
              window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: false }));
              setActiveStudentTab('briefing');
            }}
            style={{
              background: '#ffffff',
              color: '#0369a1',
              border: 'none',
              borderRadius: '16px',
              padding: '4px 12px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              whiteSpace: 'nowrap'
            }}
            title="Eltern-Modus beenden und zur geschützten Schüleransicht wechseln"
          >
            <User size={12} color="#0369a1" />
            <span>Schüleransicht aktivieren</span>
          </button>
        </div>
      )}

      {/* Ensemble & Bands Platform View */}
      {activePlatform === 'ensembles' && (
        <ErrorBoundary>
          <Suspense fallback={<DashboardLoader />}>
            <EnsembleDashboard 
              user={user}
              schoolId={user.school_id}
              supabase={supabase}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Live Lab Tab for Students (Kept mounted for instant platform switching) */}
      {user.role?.toLowerCase() === 'student' && (
        <div style={{ 
          display: (activePlatform === 'groovelab' || (activePlatform !== 'ensembles' && activePlatform !== 'campus' && activeStudentTab === 'live')) ? 'flex' : 'none', 
          flexDirection: 'column', 
          flex: 1, 
          minHeight: 0,
          width: '100%' 
        }}>
          <ErrorBoundary>
            <div className="animation-slide-up" style={{ width: '100%', padding: windowWidth <= 768 ? '8px 4px 4px 4px' : '24px 16px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
              <Suspense fallback={<DashboardLoader />}>
                <TeacherDashboard 
                  key="student-live-dashboard"
                  userId={user.id} 
                  initialTeacher={user}
                  hideHeader={true} 
                  viewMode="student" 
                  onTabChange={setActiveStudentTab}
                  isSidebarCollapsed={isSidebarCollapsed}
                  setIsSidebarCollapsed={setIsSidebarCollapsed}
                  onSidebarNotificationsChange={setSidebarNotificationsCount}
                  activePlatform="groovelab"
                  session={session}
                  onSessionChange={setSession}
                  locationMode={locationMode}
                  onLocationModeChange={(mode) => {
                    setLocationMode(mode);
                    sessionStorage.setItem('groovelab_location_mode', mode);
                  }}
                  onSwitchPlatform={(newPlatform) => {
                    setActivePlatform(newPlatform);
                  }}
                  onFoundBand={(form: any, mySlot: any) => {
                    console.log('[DEBUG-Groovelab] setSuggestingSkill (manual click) in TeacherDashboard onFoundBand');
                    setSuggestingSkill({
                      ...mySlot,
                      isLeader: true,
                      leaderName: 'Du',
                      song_id: form.song?.id || form.song_id,
                      songs: { id: form.song?.id || form.song_id, title: form.song?.title },
                      formation_group: form.groupKey || form.id,
                      members: form.members
                    });
                    setFoundingName(generateRandomBandName(foundingLanguage));
                  }}
                />
              </Suspense>
            </div>
          </ErrorBoundary>
        </div>
      )}

      {/* Student Campus Dashboard Tabs (Kept mounted for instant platform switching) */}
      {user.role?.toLowerCase() === 'student' && (
        <div style={{ 
          display: (activePlatform === 'campus' && activeStudentTab !== 'messages') ? 'block' : 'none',
          width: '100%'
        }}>
          <ErrorBoundary>
            <Suspense fallback={<DashboardLoader />}>
              <StudentAvatarDashboard 
                studentId={user.id} 
                initialUser={user}
                parentActiveTab={activeStudentTab}
                onTabChange={(tab) => setActiveStudentTab(tab)}
                onProfileUpdate={(updatedFields: any) => {
                  setUser((prev: any) => prev ? { ...prev, ...updatedFields } : null);
                }}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {/* Profile Tab */}
      {activeStudentTab === 'profile' && !(user.role?.toLowerCase() === 'student' && activePlatform === 'campus') && (
        <ErrorBoundary>
          {(user.role === 'teacher' || user.role === 'admin' || user.role === 'secretary') && activePlatform === 'campus' ? (
            /* --- WORLD-CLASS CAMPUS TEACHER PROFILE DESIGN --- */
            <CampusStaffProfileView
              user={user}
              teachers={teachers}
              campusTeacherStats={campusTeacherStats}
              activeWorkspace={activeWorkspace}
              activePlatform={activePlatform}
              onShowQr={() => setShowQR(true)}
              onOpenPrivacy={() => setShowPrivacy(true)}
              onOpenAgb={() => setShowAgb(true)}
              onOpenCancellation={() => setShowCancellation(true)}
              onOpenImpressum={() => setShowImpressum(true)}
              onOpenAccessibility={() => setShowAccessibility(true)}
            />
          ) : (
            /* --- GROOVELAB PROFILE LOOK (ORIGINAL) --- */
            <GrooveLabProfileView
              user={user}
              setUser={setUser}
              teachers={teachers}
              userSongs={userSongs}
              userBands={userBands}
              allBands={allBands}
              brandColor={brandColor}
              activePlatform={activePlatform}
              supabase={supabase}
              fetchPlanningData={fetchPlanningData}
              onChangeAvatar={() => {
                setAvatarPickerType('teacher');
                setShowAvatarPicker(true);
              }}
              onShowQr={() => setShowQR(true)}
              onOpenBandProfile={(band: any) => {
                setSelectedBandForProfile(band);
                setShowBandProfile(true);
              }}
              onOpenPrivacy={() => setShowPrivacy(true)}
              onOpenAgb={() => setShowAgb(true)}
              onOpenCancellation={() => setShowCancellation(true)}
              onOpenImpressum={() => setShowImpressum(true)}
              onOpenAccessibility={() => setShowAccessibility(true)}
              globalPlannedSlots={globalPlannedSlots}
              plannedSlots={plannedSlots}
              toggleSlot={toggleSlot}
              loggedInUserId={loggedInUserId}
            />
          )}
        </ErrorBoundary>
      )}

      {/* Admin/Teacher Section Tabs (Unified) */}
      {((user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'secretary')) && activePlatform !== 'ensembles' && activeStudentTab !== 'profile' && activeStudentTab !== 'messages' && (
        <ErrorBoundary key={`admin-teacher-suite-${activePlatform}`}>
          <AdminDashboard 
            key={`admin-dashboard-${activePlatform}`}
            userId={user.id} 
            onLogout={handleLogout} 
            forceTab={['schedule', 'students', 'team', 'rooms', 'songs', 'stats', 'gallery', 'setup', 'bands', 'events', 'briefing', 'live', showMissionsFeature ? 'missions' : ''].includes(activeStudentTab) ? activeStudentTab : undefined}
            activePlatform={activePlatform as any}
            onTabChange={(tabId: any) => setActiveStudentTab(tabId)}
            onSwitchPlatform={(platform) => setActivePlatform(platform)}
            onOpenBandProfile={(band: any) => {
              setSelectedBandForProfile(band);
              setShowBandProfile(true);
            }}
            session={session}
            onSessionChange={setSession}
            locationMode={locationMode}
            onLocationModeChange={(mode) => {
              setLocationMode(mode);
              sessionStorage.setItem('groovelab_location_mode', mode);
            }}
          />
        </ErrorBoundary>
      )}

      {/* Messages Tab */}
      {activeStudentTab === 'messages' && (
        <MessagesTabContainer
          user={user}
          activePlatform={activePlatform}
          schoolUsers={schoolUsers}
          campusMessages={campusMessages}
          announcements={announcements}
          studentMessages={studentMessages}
          selectedCampusRecipient={selectedCampusRecipient}
          setSelectedCampusRecipient={setSelectedCampusRecipient}
          onSendCampusMessage={handleSendCampusMessage}
          onMarkCampusMessagesAsRead={handleMarkCampusMessagesAsRead}
          onMarkCampusGroupAsRead={handleMarkCampusGroupAsRead}
          onMarkCampusChannelAsRead={handleMarkCampusChannelAsRead}
          onPostAnnouncement={async (title: any, message: any, targetType: any, targetUserIds: any) => {
            setAnnouncementTitle(title);
            setAnnouncementMessage(message);
            setAnnouncementTarget(targetType as any);
            setSelectedTargetUserIds(targetUserIds);
            await handlePostAnnouncement({ preventDefault: () => {} } as any);
          }}
          onDeleteAnnouncement={handleDeleteAnnouncement}
          onAcknowledgeMessage={handleAcknowledgeStudentMessage}
        />
      )}

      {/* Practice & Repertoire Tabs */}
      {['practice', 'repertoire'].includes(activeStudentTab) && (
        <StudentPracticeRepertoireTabs
          activeStudentTab={activeStudentTab as 'practice' | 'repertoire'}
          user={user}
          userSongs={userSongs}
          practiceSongs={practiceSongs}
          groupedPracticeSongs={groupedPracticeSongs}
          groupedRepertoireSongs={groupedRepertoireSongs}
          userBands={userBands}
          brandColor={brandColor}
          practiceSearchQuery={practiceSearchQuery}
          setPracticeSearchQuery={setPracticeSearchQuery}
          practiceSearchType={practiceSearchType as any}
          setPracticeSearchType={setPracticeSearchType}
          practiceAlphaFilter={practiceAlphaFilter}
          setPracticeAlphaFilter={setPracticeAlphaFilter}
          expandedSongId={expandedSongId}
          setExpandedSongId={setExpandedSongId}
          updateProgress={updateProgress}
          handleSubmitForApproval={handleSubmitForApproval}
          handleDeleteSong={handleDeleteSong}
          onOpenPdfViewer={(song: any, folderUrl: any) => {
            setActivePdfSong(song);
            setActivePdfFolderUrl(folderUrl);
          }}
          isMobile={isMobile}
        />
      )}

      {/* Band Matching & Bands Tabs (Students) */}
      {['matching', 'bands'].includes(activeStudentTab) && user.role === 'student' && (
        <StudentBandMatchingSuite
          activeStudentTab={activeStudentTab as 'matching' | 'bands'}
          user={user}
          brandColor={brandColor}
          wallSongs={wallSongs}
          userSongs={userSongs}
          userBands={userBands}
          allBands={allBands}
          matchingLevelFilter={matchingLevelFilter}
          setMatchingLevelFilter={setMatchingLevelFilter}
          activeBandSubTab={activeBandSubTab}
          setActiveBandSubTab={setActiveBandSubTab}
          bandSearchText={bandSearchText}
          setBandSearchText={setBandSearchText}
          bandSearchLetter={bandSearchLetter || ''}
          setBandSearchLetter={setBandSearchLetter}
          onOpenBandProfile={(band: any) => {
            setSelectedBandForProfile(band);
            setShowBandProfile(true);
          }}
          onPreviewStudent={(student: any) => {
            setSelectedStudentForPreview(student);
          }}
          onFoundBandFromSlot={(mySlot: any, song: any, form: any) => {
            console.log('[DEBUG-Groovelab] setSuggestingSkill (Matching Board click) in App.tsx');
            setSuggestingSkill({
              ...mySlot,
              isLeader: true,
              leaderName: 'Du',
              song_id: song.song_id,
              songs: { id: song.song_id, title: song.title },
              formation_group: form.id,
              members: form.members
            });
            if (!foundingName) setFoundingName(generateRandomBandName(foundingLanguage));
          }}
          onRefreshDashboard={(userId: any) => fetchDashboardData(userId)}
          isMobile={isMobile}
          width={width}
        />
      )}

      {activeStudentTab === 'library' && (
        <StudentLibraryTab
          globalSongs={globalSongs}
          userSongs={userSongs}
          brandColor={brandColor}
          onAddSongToRepertoire={handleAddSongToRepertoire}
          isMobile={isMobile}
        />
      )}

      {/* Team Tab */}
      {user.role?.toLowerCase() === 'student' && activeStudentTab === 'team' && (
        <StudentTeamTab
          teachers={teachers}
          brandColor={brandColor}
          onSelectTeacher={(t: any) => setSelectedTeacher(t)}
          isMobile={isMobile}
        />
      )}
    </main>
  );
};

export default CampusMainContentRouter;
