import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { CampusDesktopSidebar } from './CampusDesktopSidebar';
import { CampusDesktopHeader } from './CampusDesktopHeader';
import { CampusMainContentRouter, CampusMainContentRouterProps } from './CampusMainContentRouter';
import { MobileTopHeader } from '../ui/MobileTopHeader';
import { MobileBottomNav } from '../ui/MobileBottomNav';
import { PwaInstallationModals } from '../ui/PwaInstallationModals';

export interface CampusAppLayoutProps extends CampusMainContentRouterProps {
  // Toast
  toastMessage: { type: 'error' | 'success' | string; text: string } | null;
  setToastMessage: (msg: any) => void;

  // PWA Install Modals
  showInstallBanner: boolean;
  setShowInstallBanner: (show: boolean) => void;
  showInstallGuide: boolean;
  setShowInstallGuide: (show: boolean) => void;
  deferredPrompt: any;
  handleInstallPWA: () => void;
  handleDismissInstall?: () => void;

  // Sidebar specific
  isMusicStandMode: boolean;
  toggleMusicStandMode: () => void;

  // Header / Session specific
  isKioskMode: boolean;
  isCampusUnlocked: boolean;
  setShowCampusPinPrompt: (show: boolean) => void;
  showEnsemblesFeature?: boolean;
  setShowMobileInfo: (show: boolean) => void;
  isOfflineMode: boolean;
  trialDaysLeft: number | null;
  setShowTrialInfoModal: (show: boolean) => void;
  activeStudentsCount: number;
  showDateSimulation?: boolean;
  simulatedDate: string | null;
  setSimulatedDate: (date: string | null) => void;
  campusUnreadCount?: number;
  handleSwitchActiveRole: (role: string) => Promise<void>;

  // Help FAB
  handleHelpRequest: () => void;

  // Children (optional)
  children?: React.ReactNode;
}

export const CampusAppLayout: React.FC<CampusAppLayoutProps> = React.memo(({
  // Toast
  toastMessage,
  setToastMessage,

  // PWA
  showInstallBanner,
  setShowInstallBanner,
  showInstallGuide,
  setShowInstallGuide,
  deferredPrompt,
  handleInstallPWA,
  handleDismissInstall,

  // Core App & Session State
  user,
  setUser,
  school,
  activePlatform,
  setActivePlatform,
  activeStudentTab,
  setActiveStudentTab,
  activeWorkspace,
  teachers,
  session,
  setSession,
  windowWidth,
  campusStudentUiLevel,
  parentUnlocked,
  setParentUnlocked,
  campusUnreadCount,
  studentMessages,
  showMissionsFeature,
  isMusicStandMode,
  toggleMusicStandMode,
  handleLogout,
  supabase,
  setParentPermissionsVersion,
  locationMode,
  setLocationMode,
  isKioskMode,
  isCampusUnlocked,
  setShowCampusPinPrompt,
  showEnsemblesFeature,
  setShowMobileInfo,
  isOfflineMode,
  trialDaysLeft,
  setShowTrialInfoModal,
  activeStudentsCount,
  showDateSimulation,
  simulatedDate,
  setSimulatedDate,
  handleSwitchActiveRole,
  handleHelpRequest,

  // Modal Triggers
  setShowQR,
  setShowPrivacy,
  setShowAgb,
  setShowCancellation,
  setShowImpressum,
  setShowAccessibility,

  // Router Props
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  setSidebarNotificationsCount,
  setSuggestingSkill,
  foundingName,
  setFoundingName,
  foundingLanguage,
  campusTeacherStats,
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
  schoolUsers,
  campusMessages,
  announcements,
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

  children
}) => {
  const hasCampusSub = Boolean(school && (school.has_campus_subscription || !school.is_billing_booked || school.subscription_bypass));
  const hasGrooveLabSub = Boolean(school && (school.has_groovelab_subscription || !school.is_billing_booked || school.subscription_bypass));
  const isStaff = user?.role === 'admin' || user?.role === 'secretary';
  const hasCampusActive = Boolean((isStaff || user?.is_campus_active) && hasCampusSub);
  const hasGrooveLabActive = Boolean((isStaff || user?.is_groovelab_active) && hasGrooveLabSub);

  return (
    <div className="app-layout">
      {toastMessage && (
        <div 
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: toastMessage.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(16px)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            pointerEvents: 'auto',
            animation: 'slideDownFade 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={() => setToastMessage(null)}
        >
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} color="#34a853" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <PwaInstallationModals
        showInstallBanner={showInstallBanner}
        setShowInstallBanner={setShowInstallBanner}
        showInstallGuide={showInstallGuide}
        setShowInstallGuide={setShowInstallGuide}
        activePlatform={activePlatform}
        deferredPrompt={deferredPrompt}
        handleInstallPWA={handleInstallPWA}
        handleDismissInstall={handleDismissInstall}
      />

      <style>{`
        .sidebar-nav .hover-scale { transition: all 0.2s ease !important; }
        .sidebar-nav .hover-scale:hover { 
          transform: translateX(4px); 
          background: rgba(255,255,255,0.03) !important;
          border-color: rgba(255,255,255,0.05) !important;
        }
        @keyframes slideUpFade {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Sidebar Navigation (iPad/Desktop) */}
      <CampusDesktopSidebar
        user={user}
        school={school}
        activePlatform={activePlatform}
        activeStudentTab={activeStudentTab}
        setActiveStudentTab={setActiveStudentTab}
        activeWorkspace={activeWorkspace}
        teachers={teachers}
        session={session}
        windowWidth={windowWidth}
        campusStudentUiLevel={campusStudentUiLevel}
        parentUnlocked={parentUnlocked}
        campusUnreadCount={campusUnreadCount ?? 0}
        studentMessages={studentMessages}
        showMissionsFeature={showMissionsFeature}
        isMusicStandMode={isMusicStandMode}
        toggleMusicStandMode={toggleMusicStandMode}
        onShowQr={() => setShowQR(true)}
        onLogout={handleLogout}
        onOpenPrivacy={() => setShowPrivacy(true)}
        onOpenAgb={() => setShowAgb(true)}
        onOpenImpressum={() => setShowImpressum(true)}
        onOpenAccessibility={() => setShowAccessibility(true)}
        supabase={supabase}
        setParentPermissionsVersion={setParentPermissionsVersion}
      />

      <div className={`main-wrapper ${activeStudentTab === 'live' ? 'live-tab-active' : ''}`} style={{ paddingTop: '0' }}>
        <MobileTopHeader
          user={user}
          school={school}
          activePlatform={activePlatform as 'campus' | 'groovelab' | 'admin'}
          setActivePlatform={(p) => {
            if (p === 'campus') {
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
            } else if (p === 'groovelab') {
              if (user?.role === 'teacher') {
                sessionStorage.setItem('groovelab_active_workspace', 'teacher');
              }
              setActivePlatform('groovelab');
              if (isStaff || user?.role === 'teacher') {
                setLocationMode('lab');
                sessionStorage.setItem('groovelab_location_mode', 'lab');
              }
              setActiveStudentTab('live');
              sessionStorage.setItem('groovelab_active_tab', 'live');
              localStorage.setItem('groovelab_active_tab', 'live');
            } else {
              setActivePlatform(p);
            }
          }}
          hasCampusActive={hasCampusActive}
          hasGrooveLabActive={hasGrooveLabActive}
          unreadCount={campusUnreadCount}
        />

        {/* BFSG 2025 / WCAG 2.4.1 Skip-to-Content Navigation Link */}
        <a href="#main-content" className="skip-to-content">
          Zum Hauptinhalt springen
        </a>

        <CampusDesktopHeader
          user={user}
          school={school}
          activePlatform={activePlatform}
          setActivePlatform={setActivePlatform}
          activeStudentTab={activeStudentTab}
          setActiveStudentTab={setActiveStudentTab}
          windowWidth={windowWidth}
          locationMode={locationMode}
          setLocationMode={setLocationMode}
          isKioskMode={isKioskMode}
          isCampusUnlocked={isCampusUnlocked}
          setShowCampusPinPrompt={setShowCampusPinPrompt}
          showEnsemblesFeature={showEnsemblesFeature}
          setShowMobileInfo={setShowMobileInfo}
          isOfflineMode={isOfflineMode}
          trialDaysLeft={trialDaysLeft}
          setShowTrialInfoModal={setShowTrialInfoModal}
          teachers={teachers}
          session={session}
          activeStudentsCount={activeStudentsCount}
          showDateSimulation={showDateSimulation}
          simulatedDate={simulatedDate}
          setSimulatedDate={setSimulatedDate}
          handleSwitchActiveRole={handleSwitchActiveRole}
          handleLogout={handleLogout}
        />

        <CampusMainContentRouter
          windowWidth={windowWidth}
          activeStudentTab={activeStudentTab}
          parentUnlocked={parentUnlocked}
          setParentUnlocked={setParentUnlocked}
          user={user}
          setUser={setUser}
          school={school}
          activePlatform={activePlatform}
          setActivePlatform={setActivePlatform}
          setActiveStudentTab={setActiveStudentTab}
          campusStudentUiLevel={campusStudentUiLevel}
          setParentPermissionsVersion={setParentPermissionsVersion}
          supabase={supabase}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          setSidebarNotificationsCount={setSidebarNotificationsCount}
          session={session}
          setSession={setSession}
          locationMode={locationMode}
          setLocationMode={setLocationMode}
          setSuggestingSkill={setSuggestingSkill}
          foundingName={foundingName}
          setFoundingName={setFoundingName}
          foundingLanguage={foundingLanguage}
          teachers={teachers}
          campusTeacherStats={campusTeacherStats}
          activeWorkspace={activeWorkspace}
          setShowQR={setShowQR}
          setShowPrivacy={setShowPrivacy}
          setShowAgb={setShowAgb}
          setShowCancellation={setShowCancellation}
          setShowImpressum={setShowImpressum}
          setShowAccessibility={setShowAccessibility}
          userSongs={userSongs}
          userBands={userBands}
          allBands={allBands}
          brandColor={brandColor}
          fetchPlanningData={fetchPlanningData}
          setAvatarPickerType={setAvatarPickerType}
          setShowAvatarPicker={setShowAvatarPicker}
          setSelectedBandForProfile={setSelectedBandForProfile}
          setShowBandProfile={setShowBandProfile}
          globalPlannedSlots={globalPlannedSlots}
          plannedSlots={plannedSlots}
          toggleSlot={toggleSlot}
          loggedInUserId={loggedInUserId}
          handleLogout={handleLogout}
          showMissionsFeature={showMissionsFeature}
          schoolUsers={schoolUsers}
          campusMessages={campusMessages}
          announcements={announcements}
          studentMessages={studentMessages}
          selectedCampusRecipient={selectedCampusRecipient}
          setSelectedCampusRecipient={setSelectedCampusRecipient}
          handleSendCampusMessage={handleSendCampusMessage}
          handleMarkCampusMessagesAsRead={handleMarkCampusMessagesAsRead}
          handleMarkCampusGroupAsRead={handleMarkCampusGroupAsRead}
          handleMarkCampusChannelAsRead={handleMarkCampusChannelAsRead}
          setAnnouncementTitle={setAnnouncementTitle}
          setAnnouncementMessage={setAnnouncementMessage}
          setAnnouncementTarget={setAnnouncementTarget}
          setSelectedTargetUserIds={setSelectedTargetUserIds}
          handlePostAnnouncement={handlePostAnnouncement}
          handleDeleteAnnouncement={handleDeleteAnnouncement}
          handleAcknowledgeStudentMessage={handleAcknowledgeStudentMessage}
          practiceSongs={practiceSongs}
          groupedPracticeSongs={groupedPracticeSongs}
          groupedRepertoireSongs={groupedRepertoireSongs}
          practiceSearchQuery={practiceSearchQuery}
          setPracticeSearchQuery={setPracticeSearchQuery}
          practiceSearchType={practiceSearchType}
          setPracticeSearchType={setPracticeSearchType}
          practiceAlphaFilter={practiceAlphaFilter}
          setPracticeAlphaFilter={setPracticeAlphaFilter}
          expandedSongId={expandedSongId}
          setExpandedSongId={setExpandedSongId}
          updateProgress={updateProgress}
          handleSubmitForApproval={handleSubmitForApproval}
          handleDeleteSong={handleDeleteSong}
          setActivePdfSong={setActivePdfSong}
          setActivePdfFolderUrl={setActivePdfFolderUrl}
          isMobile={isMobile}
          wallSongs={wallSongs}
          matchingLevelFilter={matchingLevelFilter}
          setMatchingLevelFilter={setMatchingLevelFilter}
          activeBandSubTab={activeBandSubTab}
          setActiveBandSubTab={setActiveBandSubTab}
          bandSearchText={bandSearchText}
          setBandSearchText={setBandSearchText}
          bandSearchLetter={bandSearchLetter}
          setBandSearchLetter={setBandSearchLetter}
          setSelectedStudentForPreview={setSelectedStudentForPreview}
          fetchDashboardData={fetchDashboardData}
          width={width}
          globalSongs={globalSongs}
          handleAddSongToRepertoire={handleAddSongToRepertoire}
          setSelectedTeacher={setSelectedTeacher}
        />

        {/* Mobile Native Bottom Navigation Bar (Controlled via CSS for Mobile & Simulator) */}
        {user && (
          <MobileBottomNav
            activeTab={activeStudentTab}
            setActiveTab={setActiveStudentTab}
            activePlatform={activePlatform as 'campus' | 'groovelab' | 'admin'}
            setActivePlatform={(p) => setActivePlatform(p)}
            userRole={user?.role?.toLowerCase() || 'student'}
            hasCampusActive={hasCampusActive}
            hasGrooveLabActive={hasGrooveLabActive}
            unreadCount={campusUnreadCount}
          />
        )}

        {/* Help FAB (Only for logged-in students in Lab Mode with active station on the Groovelab platform) */}
        {user && activePlatform === 'groovelab' && user.role === 'student' && locationMode === 'lab' && session?.station_id && (
          <div className="fab-container">
            <button 
              className="fab-button" 
              onClick={handleHelpRequest}
              title="Hilfe rufen"
            >
              <AlertCircle size={28} />
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
});

CampusAppLayout.displayName = 'CampusAppLayout';
