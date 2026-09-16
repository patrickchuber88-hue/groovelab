import React from 'react';
import { OnboardingHelpModalsHub } from '../modals/OnboardingHelpModalsHub';
import { SecurityAuthModalsHub } from '../modals/SecurityAuthModalsHub';
import { DetailProfilesModalsHub } from '../modals/DetailProfilesModalsHub';
import { BandFoundingModalsHub } from '../modals/BandFoundingModalsHub';
import { ProfileBandModalsHub } from '../modals/ProfileBandModalsHub';
import { safeReplaceState } from '../../utils/historyUtils';

export interface CampusAppModalsHubProps {
  user: any;
  setUser: (val: any) => void;
  school: any;
  schoolUsers: any[];
  teachers: any[];
  userBands: any[];
  globalSongs: any[];
  activePlatform: string;
  activeWorkspace: string | null;
  activeStudentTab: string;
  brandColor: string;
  width: number;
  height: number;
  supabase: any;
  locationMode: 'lab' | 'home';
  session: any;

  // Band Founding & Skill Suggestion
  suggestingSkill: any;
  setSuggestingSkill: (val: any) => void;
  foundingName: string;
  setFoundingName: (val: string) => void;
  foundingLanguage: 'de' | 'en';
  setFoundingLanguage: React.Dispatch<React.SetStateAction<'de' | 'en'>> | ((val: 'de' | 'en') => void);
  selectedCoachId: string;
  setSelectedCoachId: React.Dispatch<React.SetStateAction<string>> | ((val: string) => void);
  handleFoundBand: ((skill?: any) => Promise<void> | void) | any;
  dismissSuggestion: (id: any) => void;
  handleSuggestToBand: ((bandId: string, song: any) => Promise<void> | void) | any;
  fetchDashboardData: (userId: string, isInitial?: boolean) => Promise<any>;
  setActiveStudentTab: (tab: string) => void;

  // Onboarding & Help
  showQR: boolean;
  setShowQR: (val: boolean) => void;
  isGlobalHelpCenterOpen: boolean;
  setIsGlobalHelpCenterOpen: (val: boolean) => void;
  showTrialInfoModal: boolean;
  setShowTrialInfoModal: (val: boolean) => void;
  trialDaysLeft: number | null;
  handleSwitchActiveRole: (role: string) => void;
  showMobileInfo: boolean;
  setShowMobileInfo: (val: boolean) => void;
  showSchoolOnboardingModal: boolean;
  setShowSchoolOnboardingModal: (val: boolean) => void;

  // Legal Modals
  renderLegalModals: () => React.ReactNode;

  // Detail Profiles
  selectedTeacher: any;
  setSelectedTeacher: (val: any) => void;
  selectedStudentProfile: any;
  setSelectedStudentProfile: (val: any) => void;
  showConfetti: boolean;
  clearConfetti: () => void;
  setActivePlatform: (platform: any) => void;

  // Profile, Band, Avatar & Gateway
  APP_INSTRUMENT_ICONS: any;
  APP_INSTRUMENT_COLORS: any;
  activeAnnouncement: any;
  handleAcknowledgeAnnouncement: (id: any) => Promise<void> | void;
  showEditProfile: boolean;
  setShowEditProfile: (val: boolean) => void;
  editingProfile: any;
  setEditingProfile: (val: any) => void;
  handleUpdateProfile: (e: React.FormEvent) => Promise<void> | void;
  selectedStudentForPreview: any;
  setSelectedStudentForPreview: (val: any) => void;
  showBandProfile: boolean;
  setShowBandProfile: (val: boolean) => void;
  selectedBandForProfile: any;
  setSelectedBandForProfile: (val: any) => void;
  bandProfileView: 'public' | 'backstage';
  setBandProfileView: React.Dispatch<React.SetStateAction<'public' | 'backstage'>> | ((view: 'public' | 'backstage') => void);
  isSharedView: boolean;
  showEditBand: boolean;
  setShowEditBand: (val: boolean) => void;
  editingBand: any;
  setEditingBand: (val: any) => void;
  showAvatarPicker: boolean;
  setShowAvatarPicker: (val: boolean) => void;
  avatarPickerType: 'student' | 'band' | 'teacher';
  setAvatarPickerType: React.Dispatch<React.SetStateAction<'student' | 'band' | 'teacher'>> | ((val: any) => void);
  bandAvatarSizeFilter: 'Alle' | '3' | '4' | '5';
  setBandAvatarSizeFilter: React.Dispatch<React.SetStateAction<'Alle' | '3' | '4' | '5'>> | ((val: any) => void);
  avatarInstrumentFilter: any;
  setAvatarInstrumentFilter: React.Dispatch<React.SetStateAction<any>> | ((val: any) => void);
  BAND_AVATARS: any[];
  STUDENT_AVATARS: any[];
  TEACHER_AVATARS: any[];
  CAMPUS_AVATARS: any[];
  failedAvatarUrls: string[];
  selectedBandForGateway: any;
  setSelectedBandForGateway: (val: any) => void;
  pendingFounding: any;
  setPendingFounding: (val: any) => void;
  gatewayJustClosed: React.MutableRefObject<boolean>;

  // Security & Auth
  showAdminSecuritySuiteModal: boolean;
  setShowAdminSecuritySuiteModal: (val: boolean) => void;
  showQuarterlyAccessReportModal: boolean;
  setShowQuarterlyAccessReportModal: (val: boolean) => void;
  isScreenLockedByInactivity: boolean;
  setIsScreenLockedByInactivity: (val: boolean) => void;
  setIsCampusUnlocked: (val: boolean) => void;
  handleLogout: (purgeUser?: boolean, keepPlatformCookie?: boolean) => Promise<void>;
  showAutoLockWarning: boolean;
  setShowAutoLockWarning: (val: boolean) => void;
  autoLockCountdown: number;
  showCampusPinPrompt: boolean;
  setShowCampusPinPrompt?: (val: boolean) => void;
}

/**
 * 🏛️ Komponente: CampusAppModalsHub
 * Konsolidierter Orchestrator für alle Dialoge, Modals und Sicherheits-Gates im Campus-Groovelab App Root.
 */
export const CampusAppModalsHub: React.FC<CampusAppModalsHubProps> = ({
  user,
  setUser,
  school,
  schoolUsers,
  teachers,
  userBands,
  globalSongs,
  activePlatform,
  activeWorkspace,
  activeStudentTab,
  brandColor,
  width,
  height,
  supabase,
  locationMode,
  session,

  suggestingSkill,
  setSuggestingSkill,
  foundingName,
  setFoundingName,
  foundingLanguage,
  setFoundingLanguage,
  selectedCoachId,
  setSelectedCoachId,
  handleFoundBand,
  dismissSuggestion,
  handleSuggestToBand,
  fetchDashboardData,
  setActiveStudentTab,

  showQR,
  setShowQR,
  isGlobalHelpCenterOpen,
  setIsGlobalHelpCenterOpen,
  showTrialInfoModal,
  setShowTrialInfoModal,
  trialDaysLeft,
  handleSwitchActiveRole,
  showMobileInfo,
  setShowMobileInfo,
  showSchoolOnboardingModal,
  setShowSchoolOnboardingModal,

  renderLegalModals,

  selectedTeacher,
  setSelectedTeacher,
  selectedStudentProfile,
  setSelectedStudentProfile,
  showConfetti,
  clearConfetti,
  setActivePlatform,

  APP_INSTRUMENT_ICONS,
  APP_INSTRUMENT_COLORS,
  activeAnnouncement,
  handleAcknowledgeAnnouncement,
  showEditProfile,
  setShowEditProfile,
  editingProfile,
  setEditingProfile,
  handleUpdateProfile,
  selectedStudentForPreview,
  setSelectedStudentForPreview,
  showBandProfile,
  setShowBandProfile,
  selectedBandForProfile,
  setSelectedBandForProfile,
  bandProfileView,
  setBandProfileView,
  isSharedView,
  showEditBand,
  setShowEditBand,
  editingBand,
  setEditingBand,
  showAvatarPicker,
  setShowAvatarPicker,
  avatarPickerType,
  setAvatarPickerType,
  bandAvatarSizeFilter,
  setBandAvatarSizeFilter,
  avatarInstrumentFilter,
  setAvatarInstrumentFilter,
  BAND_AVATARS,
  STUDENT_AVATARS,
  TEACHER_AVATARS,
  CAMPUS_AVATARS,
  failedAvatarUrls,
  selectedBandForGateway,
  setSelectedBandForGateway,
  pendingFounding,
  setPendingFounding,
  gatewayJustClosed,

  showAdminSecuritySuiteModal,
  setShowAdminSecuritySuiteModal,
  showQuarterlyAccessReportModal,
  setShowQuarterlyAccessReportModal,
  isScreenLockedByInactivity,
  setIsScreenLockedByInactivity,
  setIsCampusUnlocked,
  handleLogout,
  showAutoLockWarning,
  setShowAutoLockWarning,
  autoLockCountdown,
  showCampusPinPrompt,
  setShowCampusPinPrompt
}) => {
  return (
    <>
      {/* 🎸 Band Founding & Skill Suggestion Hub */}
      <BandFoundingModalsHub
        user={user}
        brandColor={brandColor}
        suggestingSkill={suggestingSkill}
        setSuggestingSkill={setSuggestingSkill}
        foundingName={foundingName}
        setFoundingName={setFoundingName}
        foundingLanguage={foundingLanguage}
        setFoundingLanguage={setFoundingLanguage}
        teachers={teachers}
        selectedCoachId={selectedCoachId}
        setSelectedCoachId={setSelectedCoachId}
        handleFoundBand={handleFoundBand}
        dismissSuggestion={dismissSuggestion}
        userBands={userBands}
        globalSongs={globalSongs}
        handleSuggestToBand={handleSuggestToBand}
        supabase={supabase}
        fetchDashboardData={fetchDashboardData}
        setActiveStudentTab={setActiveStudentTab}
      />

      {/* 🧭 Onboarding, Guidance & Help Modals Hub */}
      <OnboardingHelpModalsHub
        user={user}
        school={school}
        activePlatform={activePlatform}
        showQR={showQR}
        onCloseQR={() => setShowQR(false)}
        isHelpCenterOpen={isGlobalHelpCenterOpen}
        onCloseHelpCenter={() => setIsGlobalHelpCenterOpen(false)}
        showTrialInfo={showTrialInfoModal}
        onCloseTrialInfo={() => setShowTrialInfoModal(false)}
        trialDaysLeft={trialDaysLeft}
        onNavigateToBilling={() => {
          setShowTrialInfoModal(false);
          if (user?.role === 'admin' || user?.role === 'secretary') {
            sessionStorage.setItem('groovelab_active_workspace', 'secretary');
            handleSwitchActiveRole('admin');
          }
        }}
        showMobileInfo={showMobileInfo}
        onCloseMobileInfo={() => setShowMobileInfo(false)}
        locationMode={locationMode}
        stationName={session?.stations?.name}
        showSchoolOnboardingModal={showSchoolOnboardingModal}
        onCloseSchoolOnboarding={() => setShowSchoolOnboardingModal(false)}
        onSchoolOnboardingSuccess={(schoolData, userData) => {
          setShowSchoolOnboardingModal(false);
          if (typeof window !== 'undefined' && window.history) {
            safeReplaceState({}, document.title, window.location.pathname);
          }
          window.location.reload();
        }}
      />

      {/* Render Legal Modals Helper Call */}
      {renderLegalModals()}

      {/* 📇 Detail Profiles & Reward Modals Hub */}
      <DetailProfilesModalsHub
        user={user}
        activePlatform={activePlatform}
        activeWorkspace={activeWorkspace}
        selectedTeacher={selectedTeacher}
        onCloseTeacher={() => setSelectedTeacher(null)}
        selectedStudentProfile={selectedStudentProfile}
        onCloseStudentProfile={() => setSelectedStudentProfile(null)}
        onOpenBandProfile={(band) => {
          setSelectedBandForProfile(band);
          setBandProfileView('public');
          setShowBandProfile(true);
          setSelectedStudentProfile(null);
        }}
        onOpenTageskompass={(student) => {
          if ((window as any).openTageskompass) {
            (window as any).openTageskompass(student);
          }
          setSelectedStudentProfile(null);
        }}
        onSwitchPlatform={(newPlatform) => {
          setActivePlatform(newPlatform);
        }}
        showConfetti={showConfetti}
        confettiWidth={width}
        confettiHeight={height}
        confettiBrandColor={brandColor}
        onClearConfetti={clearConfetti}
      />

      {/* 👤 Profile, Band, Avatar & Gateway Modals Hub */}
      <ProfileBandModalsHub
        user={user}
        setUser={setUser}
        brandColor={brandColor}
        width={width}
        activePlatform={activePlatform}
        supabase={supabase}
        fetchDashboardData={fetchDashboardData}
        APP_INSTRUMENT_ICONS={APP_INSTRUMENT_ICONS}
        APP_INSTRUMENT_COLORS={APP_INSTRUMENT_COLORS}
        activeAnnouncement={activeAnnouncement}
        handleAcknowledgeAnnouncement={handleAcknowledgeAnnouncement}
        showEditProfile={showEditProfile}
        setShowEditProfile={setShowEditProfile}
        editingProfile={editingProfile}
        setEditingProfile={setEditingProfile}
        handleUpdateProfile={handleUpdateProfile}
        selectedStudentForPreview={selectedStudentForPreview}
        setSelectedStudentForPreview={setSelectedStudentForPreview}
        showBandProfile={showBandProfile}
        setShowBandProfile={setShowBandProfile}
        selectedBandForProfile={selectedBandForProfile}
        setSelectedBandForProfile={setSelectedBandForProfile}
        bandProfileView={bandProfileView}
        setBandProfileView={setBandProfileView}
        isSharedView={isSharedView}
        showEditBand={showEditBand}
        setShowEditBand={setShowEditBand}
        editingBand={editingBand}
        setEditingBand={setEditingBand}
        teachers={teachers}
        showAvatarPicker={showAvatarPicker}
        setShowAvatarPicker={setShowAvatarPicker}
        avatarPickerType={avatarPickerType}
        setAvatarPickerType={setAvatarPickerType}
        bandAvatarSizeFilter={bandAvatarSizeFilter}
        setBandAvatarSizeFilter={setBandAvatarSizeFilter}
        avatarInstrumentFilter={avatarInstrumentFilter}
        setAvatarInstrumentFilter={setAvatarInstrumentFilter}
        BAND_AVATARS={BAND_AVATARS}
        STUDENT_AVATARS={STUDENT_AVATARS}
        TEACHER_AVATARS={TEACHER_AVATARS}
        CAMPUS_AVATARS={CAMPUS_AVATARS}
        failedAvatarUrls={failedAvatarUrls}
        selectedBandForGateway={selectedBandForGateway}
        setSelectedBandForGateway={setSelectedBandForGateway}
        pendingFounding={pendingFounding}
        setPendingFounding={setPendingFounding}
        gatewayJustClosed={gatewayJustClosed}
        clearConfetti={clearConfetti}
      />

      {/* 🛡️ Universal Security & Auth Modals Hub (OWASP ASVS Level 3) */}
      <SecurityAuthModalsHub
        user={user}
        school={school}
        schoolUsers={schoolUsers}
        supabase={supabase}
        activePlatform={activePlatform}
        showAdminSecuritySuiteModal={showAdminSecuritySuiteModal}
        onCloseAdminSecuritySuite={() => setShowAdminSecuritySuiteModal(false)}
        showQuarterlyAccessReportModal={showQuarterlyAccessReportModal}
        onOpenQuarterlyAccessReport={() => setShowQuarterlyAccessReportModal(true)}
        onCloseQuarterlyAccessReport={() => setShowQuarterlyAccessReportModal(false)}
        isScreenLockedByInactivity={isScreenLockedByInactivity}
        onUnlockSession={() => {
          setIsScreenLockedByInactivity(false);
          setIsCampusUnlocked(true);
        }}
        onLogoutSession={() => {
          handleLogout(true, false);
        }}
        showAutoLockWarning={showAutoLockWarning}
        autoLockCountdown={autoLockCountdown}
        onContinueSession={() => setShowAutoLockWarning(false)}
        onLogoutWarning={() => {
          setShowAutoLockWarning(false);
          handleLogout(true, false);
        }}
        showCampusPinPrompt={showCampusPinPrompt}
        onCloseCampusPinPrompt={() => {
          setShowCampusPinPrompt?.(false);
        }}
        onUnlockCampusPin={() => {
          setIsCampusUnlocked(true);
          setShowCampusPinPrompt?.(false);
          const wasScreenLocked = isScreenLockedByInactivity;
          setIsScreenLockedByInactivity(false);
          if (!wasScreenLocked) {
            setActivePlatform('campus');
            const isStaff = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary';
            const startTab = isStaff ? 'live' : 'briefing';
            setActiveStudentTab(startTab);
            localStorage.setItem('campus_active_tab', startTab);
          }
        }}
      />
    </>
  );
};
