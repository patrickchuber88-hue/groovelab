import React, { Suspense, lazy, useRef } from 'react';
import type { JuniorStickerCategory } from './StudentJuniorStickerModal';
import type { StudentSessionCelebrationModalProps } from './StudentSessionCelebrationModal';
import { ALL_STICKERS } from '../../../domain/stickersAndTresor';
import { formatStudentPureFirstName, formatTeacherFullName } from '../../../utils/nameHelper';

const CampusLevelSelectModal = lazy(() => import('../../campus/CampusLevelSelectModal').then(m => ({ default: m.CampusLevelSelectModal })));
const GlobalParentPinModal = lazy(() => import('./GlobalParentPinModal').then(m => ({ default: m.GlobalParentPinModal })));
const SiblingPinUnlockModal = lazy(() => import('./SiblingPinUnlockModal').then(m => ({ default: m.SiblingPinUnlockModal })));
const AddSiblingModal = lazy(() => import('../../campus/AddSiblingModal').then(m => ({ default: m.AddSiblingModal })));
const StudentJuniorPreFlightModal = lazy(() => import('./StudentJuniorPreFlightModal').then(m => ({ default: m.StudentJuniorPreFlightModal })));
const StudentJuniorStickerModal = lazy(() => import('./StudentJuniorStickerModal').then(m => ({ default: m.StudentJuniorStickerModal })));
const StudentJuniorStickerDetailModal = lazy(() => import('./StudentJuniorStickerDetailModal').then(m => ({ default: m.StudentJuniorStickerDetailModal })));
const StudentJuniorStickerAwardModal = lazy(() => import('./StudentJuniorStickerAwardModal').then(m => ({ default: m.StudentJuniorStickerAwardModal })));
const StudentSessionCelebrationModal = lazy(() => import('./StudentSessionCelebrationModal').then(m => ({ default: m.StudentSessionCelebrationModal })));
const StudentMatchCelebrationModal = lazy(() => import('./StudentMatchCelebrationModal').then(m => ({ default: m.StudentMatchCelebrationModal })));
const CampusAppointmentShoutboxModal = lazy(() => import('../../CampusAppointmentShoutboxModal').then(m => ({ default: m.CampusAppointmentShoutboxModal })));
const StudentRescheduleBottomSheetModal = lazy(() => import('./StudentRescheduleBottomSheetModal').then(m => ({ default: m.StudentRescheduleBottomSheetModal })));
const DigitalDetoxOverlay = lazy(() => import('./DigitalDetoxOverlay').then(m => ({ default: m.DigitalDetoxOverlay })));
const StudentContributionsModal = lazy(() => import('./StudentContributionsModal').then(m => ({ default: m.StudentContributionsModal })));
const StudentRulesModal = lazy(() => import('./StudentRulesModal').then(m => ({ default: m.StudentRulesModal })));
const StudentCrisisNotifsModal = lazy(() => import('./StudentCrisisNotifsModal').then(m => ({ default: m.StudentCrisisNotifsModal })));
const StudentSongDetailModal = lazy(() => import('./StudentSongDetailModal').then(m => ({ default: m.StudentSongDetailModal })));
const StudentLehrwerkDetailModal = lazy(() => import('./StudentLehrwerkDetailModal').then(m => ({ default: m.StudentLehrwerkDetailModal })));
const FocusAbortedModal = lazy(() => import('../../focus/FocusAbortedModal').then(m => ({ default: m.FocusAbortedModal })));
const PushNotificationSoftPromptModal = lazy(() => import('../../ui/PushNotificationSoftPromptModal').then(m => ({ default: m.PushNotificationSoftPromptModal })));
const StudentToolboxModal = lazy(() => import('../../campus/StudentToolboxModal').then(m => ({ default: m.StudentToolboxModal })));
const ParentCampusActivationModal = lazy(() => import('../../ParentCampusActivationModal').then(m => ({ default: m.ParentCampusActivationModal })));
const PaymentGracePeriodSoftLockModal = lazy(() => import('../../PaymentGracePeriodSoftLockModal').then(m => ({ default: m.PaymentGracePeriodSoftLockModal })));
const HelpCenterModal = lazy(() => import('../../help/HelpCenterModal').then(m => ({ default: m.HelpCenterModal })));
const FeedbackHubModal = lazy(() => import('../../feedback/FeedbackHubModal').then(m => ({ default: m.FeedbackHubModal })));
const MeisterwerkCertificateModal = lazy(() => import('../../ui/MeisterwerkCertificateModal').then(m => ({ default: m.MeisterwerkCertificateModal })));
const CampusWrappedStoryModal = lazy(() => import('./CampusWrappedStoryModal').then(m => ({ default: m.CampusWrappedStoryModal })));

export interface StudentModalsHubProps {
  // Level modal
  showLevelModal: boolean;
  setShowLevelModal: (show: boolean) => void;
  studentUiLevel: any;
  handleLevelChange: (newLevel: any) => Promise<void>;

  // Global Parent PIN
  showGlobalParentPinModal: boolean;
  setShowGlobalParentPinModal: (show: boolean) => void;
  globalPinInput: string;
  setGlobalPinInput: React.Dispatch<React.SetStateAction<string>>;
  globalPinError: string;
  setGlobalPinError: React.Dispatch<React.SetStateAction<string>>;
  handleVerifyGlobalParentPin: (pin: string) => Promise<void>;
  handleBiometricUnlockForGlobalPin: () => Promise<void>;

  // Sibling
  pendingSiblingUnlock: any;
  setPendingSiblingUnlock: (s: any) => void;
  executeSwitchFamilyStudent: (id: string) => void;

  // Add Sibling Modal (0,1% Goldstandard: Universal across ProfileTab, Briefing & Settings)
  isAddSiblingModalOpen?: boolean;
  setIsAddSiblingModalOpen?: (open: boolean) => void;
  familyProfiles?: any[];
  setFamilyProfiles?: React.Dispatch<React.SetStateAction<any[]>>;

  // Junior Mission & Stickers
  showJuniorPreFlightModal: boolean;
  setShowJuniorPreFlightModal: (show: boolean) => void;
  juniorMissionDetails: any;
  targetMins: number;
  juniorSelectedTrackIndex: number;
  setJuniorSelectedTrackIndex: (idx: number) => void;
  onStartJuniorMission: () => void;

  showJuniorStickerModal: boolean;
  setShowJuniorStickerModal: (show: boolean) => void;
  unifiedStickersMap: any;
  juniorStickerCategory: JuniorStickerCategory;
  setJuniorStickerCategory: (cat: JuniorStickerCategory) => void;
  juniorSelectedPreviewSticker: any;
  setJuniorSelectedPreviewSticker: (st: any) => void;
  onStartJuniorInstrument: () => void;

  assignedCampusSongs: any[];
  progressItems: any[];
  isSongMastered: (id: string) => boolean;
  onStartRocket: () => void;
  downloadJuniorStickerJpg?: (st: any) => void;

  juniorAwardedStickerToCelebrate: any;
  setJuniorAwardedStickerToCelebrate: (st: any) => void;

  // Session Celebration
  showCelebration: boolean;
  setShowCelebration: (show: boolean) => void;
  celebrationDetails: StudentSessionCelebrationModalProps['celebrationDetails'];
  validationMode?: StudentSessionCelebrationModalProps['validationMode'];
  celebrationRingProgress: number;

  // Match Celebration
  matchCelebrationData: any;
  setMatchCelebrationData: (data: any) => void;

  // Appointment Quick Chat (Shoutbox)
  showAppointmentChat: boolean;
  setShowAppointmentChat: (show: boolean) => void;
  appointmentChatData: any;
  setAppointmentChatData: (d: any) => void;
  rescheduleChatDraft: string;
  studentId: string;
  studentUser: any;
  isParentUnlocked: boolean;
  isChatAllowed?: boolean;
  onRefreshData?: () => void;

  // Reschedule Bottom Sheet
  isRescheduleSheetOpen: boolean;
  closeRescheduleBottomSheet: () => void;
  activeRescheduleBottomSheetOcc: any;
  isRescheduleLoading: boolean;
  isStudentRescheduleAllowed: boolean;
  handleConfirmReschedule: (occId: string) => Promise<void>;
  handleVerifyGlobalParentPinAsync: (pin: string) => Promise<boolean>;

  // Detox
  showDetox: boolean;
  setShowDetox: (show: boolean) => void;
  detoxCompleted: boolean;
  setDetoxCompleted: (v: boolean) => void;
  detoxMinutes: number;
  detoxSecondsLeft: number;
  isFaceDown: boolean;
  setIsDetoxActive: (v: boolean) => void;
  xpActive: boolean;

  // Contributions & Rules & Crisis
  contributionsModalData: any;
  setContributionsModalData: (data: any) => void;
  loadingContributions: boolean;
  showRulesModal: boolean;
  setShowRulesModal: (show: boolean) => void;
  avatar: any;
  unreadCrisisNotifs: any[];
  setUnreadCrisisNotifs: (notifs: any[]) => void;

  // Soft Prompt & Toolbox
  showPushSoftPrompt: boolean;
  setShowPushSoftPrompt: (show: boolean) => void;
  pushNotifScheduleChanges: boolean;
  pushNotifHomework: boolean;
  pushNotifAllFeatures: boolean;
  setPushEnabled: (v: boolean) => void;
  showStudentToolbox: boolean;
  setShowStudentToolbox: (show: boolean) => void;

  // Activation & SoftLock
  showParentActivationModal: boolean;
  setShowParentActivationModal: (show: boolean) => void;
  showSoftLockModal: boolean;
  setShowSoftLockModal: (show: boolean) => void;

  // Help & Feedback
  isHelpCenterOpen: boolean;
  setIsHelpCenterOpen: (show: boolean) => void;
  currentPlatform: 'campus' | 'groovelab';
  resolvedSchoolName: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isFeedbackModalOpen: boolean;
  setIsFeedbackModalOpen: (show: boolean) => void;

  // Certificate
  certificateSong: any;
  setCertificateSong: (s: any) => void;
  briefingData: any;

  // Song & Lehrwerk details
  selectedSongForDetail: any;
  setSelectedSongForDetail: (s: any) => void;
  selectedLehrwerkForDetail: any;
  setSelectedLehrwerkForDetail: (b: any) => void;
  lehrwerke: any[];
  localProgress: any;
  isMobile: boolean;
  handleTabChangeLocal: (tab: string) => void;
  setSelectedTopic: (topic: string) => void;

  // Wrapped
  showWrapped?: boolean;
  setShowWrapped?: (show: boolean) => void;
  wrappedData?: any;
  currentLevel?: number;
  levelTitle?: string;

  // Focus Guard
  focusGuard?: any;
}

export const StudentModalsHub: React.FC<StudentModalsHubProps> = ({
  showLevelModal,
  setShowLevelModal,
  studentUiLevel,
  handleLevelChange,
  showGlobalParentPinModal,
  setShowGlobalParentPinModal,
  globalPinInput,
  setGlobalPinInput,
  globalPinError,
  setGlobalPinError,
  handleVerifyGlobalParentPin,
  handleBiometricUnlockForGlobalPin,
  pendingSiblingUnlock,
  setPendingSiblingUnlock,
  executeSwitchFamilyStudent,
  isAddSiblingModalOpen = false,
  setIsAddSiblingModalOpen,
  familyProfiles = [],
  setFamilyProfiles,
  showJuniorPreFlightModal,
  setShowJuniorPreFlightModal,
  juniorMissionDetails,
  targetMins,
  juniorSelectedTrackIndex,
  setJuniorSelectedTrackIndex,
  onStartJuniorMission,
  showJuniorStickerModal,
  setShowJuniorStickerModal,
  unifiedStickersMap,
  juniorStickerCategory,
  setJuniorStickerCategory,
  juniorSelectedPreviewSticker,
  setJuniorSelectedPreviewSticker,
  onStartJuniorInstrument,
  assignedCampusSongs,
  progressItems,
  isSongMastered,
  onStartRocket,
  downloadJuniorStickerJpg,
  juniorAwardedStickerToCelebrate,
  setJuniorAwardedStickerToCelebrate,
  showCelebration,
  setShowCelebration,
  celebrationDetails,
  validationMode,
  celebrationRingProgress,
  matchCelebrationData,
  setMatchCelebrationData,
  showAppointmentChat,
  setShowAppointmentChat,
  appointmentChatData,
  setAppointmentChatData,
  rescheduleChatDraft,
  studentId,
  studentUser,
  isParentUnlocked,
  isChatAllowed,
  onRefreshData,
  isRescheduleSheetOpen,
  closeRescheduleBottomSheet,
  activeRescheduleBottomSheetOcc,
  isRescheduleLoading,
  isStudentRescheduleAllowed,
  handleConfirmReschedule,
  handleVerifyGlobalParentPinAsync,
  showDetox,
  setShowDetox,
  detoxCompleted,
  setDetoxCompleted,
  detoxMinutes,
  detoxSecondsLeft,
  isFaceDown,
  setIsDetoxActive,
  xpActive,
  contributionsModalData,
  setContributionsModalData,
  loadingContributions,
  showRulesModal,
  setShowRulesModal,
  avatar,
  unreadCrisisNotifs,
  setUnreadCrisisNotifs,
  showPushSoftPrompt,
  setShowPushSoftPrompt,
  pushNotifScheduleChanges,
  pushNotifHomework,
  pushNotifAllFeatures,
  setPushEnabled,
  showStudentToolbox,
  setShowStudentToolbox,
  showParentActivationModal,
  setShowParentActivationModal,
  showSoftLockModal,
  setShowSoftLockModal,
  isHelpCenterOpen,
  setIsHelpCenterOpen,
  currentPlatform,
  resolvedSchoolName,
  activeTab,
  setActiveTab,
  isFeedbackModalOpen,
  setIsFeedbackModalOpen,
  certificateSong,
  setCertificateSong,
  briefingData,
  selectedSongForDetail,
  setSelectedSongForDetail,
  selectedLehrwerkForDetail,
  setSelectedLehrwerkForDetail,
  lehrwerke,
  localProgress,
  isMobile,
  handleTabChangeLocal,
  setSelectedTopic,
  showWrapped,
  setShowWrapped,
  wrappedData,
  currentLevel,
  levelTitle,
  focusGuard
}) => {
  const internalCanvasRef = useRef<any>(null);

  return (
    <Suspense fallback={null}>
      {/* 1. Level Modal */}
      {showLevelModal && (
        <CampusLevelSelectModal
          currentLevel={studentUiLevel}
          onSelectLevel={handleLevelChange}
          onClose={() => setShowLevelModal(false)}
        />
      )}

      {/* 2. Global Parent PIN Modal */}
      {showGlobalParentPinModal && (
        <GlobalParentPinModal
          isOpen={showGlobalParentPinModal}
          studentUiLevel={studentUiLevel}
          globalPinError={globalPinError}
          globalPinInput={globalPinInput}
          setGlobalPinInput={setGlobalPinInput}
          setGlobalPinError={setGlobalPinError}
          onVerify={handleVerifyGlobalParentPin}
          onBiometricUnlock={handleBiometricUnlockForGlobalPin}
          onClose={() => setShowGlobalParentPinModal(false)}
        />
      )}

      {/* 3. Sibling PIN Modal */}
      {pendingSiblingUnlock && (
        <SiblingPinUnlockModal
          sibling={pendingSiblingUnlock}
          onSuccess={(targetId) => {
            setPendingSiblingUnlock(null);
            executeSwitchFamilyStudent(targetId);
          }}
          onClose={() => setPendingSiblingUnlock(null)}
        />
      )}

      {/* 3b. Add Sibling Modal (0,1% Goldstandard: Universal modal for Profile & Settings tabs) */}
      {isAddSiblingModalOpen && setIsAddSiblingModalOpen && (
        <AddSiblingModal
          isOpen={isAddSiblingModalOpen}
          onClose={() => setIsAddSiblingModalOpen(false)}
          currentStudentId={studentId || (studentUser as any)?.id || ''}
          schoolId={(studentUser as any)?.school_id}
          existingFamilyProfiles={familyProfiles}
          onProfileAdded={(newProfile) => {
            if (setFamilyProfiles) {
              setFamilyProfiles((prev: any[]) => {
                const filtered = prev.filter((p: any) => p.id !== newProfile.id);
                return [...filtered, newProfile];
              });
            }
          }}
        />
      )}

      {/* 4. Junior Pre-Flight Modal */}
      {showJuniorPreFlightModal && (
        <StudentJuniorPreFlightModal
          isOpen={showJuniorPreFlightModal}
          onClose={() => setShowJuniorPreFlightModal(false)}
          missionInfo={juniorMissionDetails}
          targetMins={targetMins}
          juniorSelectedTrackIndex={juniorSelectedTrackIndex}
          onSelectTrackIndex={setJuniorSelectedTrackIndex}
          onStartMission={onStartJuniorMission}
        />
      )}

      {/* 5. Junior Sticker Modal */}
      {showJuniorStickerModal && (
        <StudentJuniorStickerModal
          isOpen={showJuniorStickerModal}
          onClose={() => setShowJuniorStickerModal(false)}
          allStickers={ALL_STICKERS}
          unifiedStickersMap={unifiedStickersMap}
          juniorStickerCategory={juniorStickerCategory}
          setJuniorStickerCategory={setJuniorStickerCategory}
          onSelectSticker={(st) => setJuniorSelectedPreviewSticker(st)}
          onStartInstrument={onStartJuniorInstrument}
        />
      )}

      {/* 6. Junior Sticker Detail */}
      {juniorSelectedPreviewSticker && (
        <StudentJuniorStickerDetailModal
          sticker={juniorSelectedPreviewSticker}
          onClose={() => setJuniorSelectedPreviewSticker(null)}
          assignedCampusSongs={assignedCampusSongs}
          progressItems={progressItems}
          isSongMastered={isSongMastered}
          onStartRocket={onStartRocket}
          onDownloadJpg={downloadJuniorStickerJpg || (() => {})}
        />
      )}

      {/* 7. Junior Sticker Award Celebration */}
      {studentUiLevel === 'junior' && juniorAwardedStickerToCelebrate && (
        <StudentJuniorStickerAwardModal
          sticker={juniorAwardedStickerToCelebrate}
          assignedCampusSongs={assignedCampusSongs}
          progressItems={progressItems}
          isSongMastered={isSongMastered}
          actualStudentName={formatStudentPureFirstName(studentUser?.first_name, 'Musik-Schüler')}
          studentInstrument={studentUser?.instrument || 'Instrumentalausbildung'}
          schoolName={resolvedSchoolName || studentUser?.school_name}
          onDownloadJpg={downloadJuniorStickerJpg || (() => {})}
          onStickInAlbum={() => {
            setJuniorAwardedStickerToCelebrate(null);
            setShowJuniorStickerModal(true);
          }}
        />
      )}

      {/* 8. Session Celebration */}
      {showCelebration && (
        <StudentSessionCelebrationModal
          isOpen={showCelebration}
          celebrationDetails={celebrationDetails}
          validationMode={validationMode || celebrationDetails?.validationMode}
          studentUiLevel={studentUiLevel}
          personalAverageMinutes={15}
          celebrationCanvasRef={internalCanvasRef}
          celebrationRingProgress={celebrationRingProgress}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {/* 9. Match Celebration */}
      {matchCelebrationData && (
        <StudentMatchCelebrationModal
          data={matchCelebrationData}
          onClose={() => setMatchCelebrationData(null)}
        />
      )}

      {/* 10. Appointment Quick Chat (Shoutbox) */}
      {showAppointmentChat && appointmentChatData && (() => {
        // 🛡️ 0.1% Goldstandard: Fail-Closed Parental Chat Permission Check (DSGVO Art. 8 & BGB § 104)
        const effectiveChatAllowed = (() => {
          if (isChatAllowed !== undefined) return isChatAllowed;
          if (studentUser?.parent_permissions?.allow_chat !== undefined) return Boolean(studentUser.parent_permissions.allow_chat);
          if (studentUser?.parent_allow_chat !== undefined && studentUser?.parent_allow_chat !== null) {
            return Boolean(studentUser.parent_allow_chat);
          }
          const effectiveUiLevel = studentUiLevel || studentUser?.campus_ui_level || 
            (typeof window !== 'undefined' ? (localStorage.getItem(`campus_student_ui_level_${studentId}`) || localStorage.getItem('campus_student_ui_level')) : null) || 
            'junior';
          if (effectiveUiLevel === 'junior') {
            return false;
          }
          return true;
        })();

        return (
          <CampusAppointmentShoutboxModal
            isOpen={showAppointmentChat}
            onClose={() => {
              setShowAppointmentChat(false);
              setAppointmentChatData(null);
            }}
            occurrence={appointmentChatData}
            currentUserId={studentId}
            currentUserRole="student"
            currentUserProfile={studentUser || { id: studentId }}
            isParentUnlocked={isParentUnlocked}
            isChatAllowed={effectiveChatAllowed}
            initialDraftMessage={rescheduleChatDraft}
          />
        );
      })()}

      {/* 11. Reschedule Bottom Sheet */}
      {isRescheduleSheetOpen && (
        <StudentRescheduleBottomSheetModal
          isOpen={isRescheduleSheetOpen}
          onClose={closeRescheduleBottomSheet}
          occurrence={activeRescheduleBottomSheetOcc}
          isLoading={isRescheduleLoading}
          parentAllowRescheduleConfirm={isStudentRescheduleAllowed}
          studentUiLevel={studentUiLevel}
          onConfirmReschedule={async (occId) => {
            await handleConfirmReschedule(occId);
            closeRescheduleBottomSheet();
          }}
          onOpenChatInquiry={(teacher, _suggestedText) => {
            const occ = activeRescheduleBottomSheetOcc;
            if (!occ) return;
            setAppointmentChatData({
              occurrenceId: occ.id,
              date: occ.date,
              start_time: occ.start_time,
              status: occ.status,
              teacherId: teacher?.id || occ.teacher_id,
              teacher: teacher || occ.teacher
            });
            setShowAppointmentChat(true);
            closeRescheduleBottomSheet();
          }}
          onVerifyParentPin={handleVerifyGlobalParentPinAsync}
          teacherName={formatTeacherFullName(activeRescheduleBottomSheetOcc?.teacher || studentUser?.teacher || studentUser?.teacher_name)}
        />
      )}

      {/* 12. Detox Overlay */}
      {showDetox && (
        <DigitalDetoxOverlay
          isOpen={showDetox}
          onClose={() => setShowDetox(false)}
          detoxCompleted={detoxCompleted}
          setDetoxCompleted={setDetoxCompleted}
          detoxMinutes={detoxMinutes}
          detoxSecondsLeft={detoxSecondsLeft}
          isFaceDown={isFaceDown}
          setIsDetoxActive={setIsDetoxActive}
          xpActive={xpActive}
        />
      )}

      {/* 13. Contributions Modal */}
      {contributionsModalData && (
        <StudentContributionsModal
          data={contributionsModalData}
          loading={loadingContributions}
          onClose={() => setContributionsModalData(null)}
        />
      )}

      {/* 14. Rules Modal */}
      {showRulesModal && (
        <StudentRulesModal
          isOpen={showRulesModal}
          evolutionLevel={avatar?.evolution_level || 1}
          onClose={() => setShowRulesModal(false)}
        />
      )}

      {/* 15. Crisis Notifications */}
      {unreadCrisisNotifs && unreadCrisisNotifs.length > 0 && (
        <StudentCrisisNotifsModal
          unreadCrisisNotifs={unreadCrisisNotifs}
          onDismiss={() => setUnreadCrisisNotifs([])}
          onAcknowledgeSuccess={(acknowledgedIds) => {
            setUnreadCrisisNotifs(unreadCrisisNotifs.filter(n => !acknowledgedIds.includes(n.id)));
          }}
        />
      )}

      {/* 16. Push Soft Prompt */}
      {showPushSoftPrompt && (
        <PushNotificationSoftPromptModal
          isOpen={showPushSoftPrompt}
          onClose={() => setShowPushSoftPrompt(false)}
          userId={studentId}
          initialScheduleChanges={pushNotifScheduleChanges}
          initialHomework={pushNotifHomework}
          initialStreakAndNews={pushNotifAllFeatures}
          onSuccess={() => {
            setPushEnabled(true);
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {/* 17. Praxis Toolbox */}
      {showStudentToolbox && (
        <StudentToolboxModal
          isOpen={showStudentToolbox}
          onClose={() => setShowStudentToolbox(false)}
          ageGroup={studentUiLevel || 'pro'}
        />
      )}

      {/* 18. Parent Activation Modal */}
      {showParentActivationModal && (
        <ParentCampusActivationModal
          student={studentUser || { id: studentId }}
          schoolData={{
            ...(studentUser?.schools || {}),
            name: studentUser?.schools?.name || 'Campus-Groovelab Partner-Musikschule'
          }}
          onClose={() => setShowParentActivationModal(false)}
          onPaymentSubmitted={() => {
            setShowParentActivationModal(false);
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {/* 19. Soft Lock Modal */}
      {showSoftLockModal && (
        <PaymentGracePeriodSoftLockModal
          student={studentUser || { id: studentId }}
          schoolData={{
            ...(studentUser?.schools || {}),
            name: studentUser?.schools?.name || 'Campus-Groovelab Partner-Musikschule'
          }}
          onClose={() => setShowSoftLockModal(false)}
          onOpenActivationModal={() => {
            setShowSoftLockModal(false);
            setShowParentActivationModal(true);
          }}
        />
      )}

      {/* 20. Help Center */}
      {isHelpCenterOpen && (
        <HelpCenterModal
          isOpen={isHelpCenterOpen}
          onClose={() => setIsHelpCenterOpen(false)}
          userRole="student"
          activePlatform={currentPlatform}
          schoolName={resolvedSchoolName || 'Meine Musikschule'}
          initialBoardId={activeTab || 'briefing'}
          onNavigateBoard={(target) => {
            if (target) setActiveTab(target);
          }}
        />
      )}

      {/* 21. Feedback Hub */}
      {isFeedbackModalOpen && (
        <FeedbackHubModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          userRole="student"
          userId={studentId}
          userName={studentUser?.first_name || 'Schüler'}
          schoolId={studentUser?.school_id}
          schoolName={(studentUser as any)?.school_name}
          activePlatform={currentPlatform}
        />
      )}

      {/* 22. Meisterwerk Certificate */}
      {certificateSong && (
        <MeisterwerkCertificateModal
          studentName={formatStudentPureFirstName(studentUser?.first_name, 'Musikschüler')}
          songTitle={certificateSong.title || 'Meisterwerk'}
          instrument={studentUser?.instrument || 'Instrument'}
          schoolName={resolvedSchoolName}
          teacherName={formatTeacherFullName(studentUser?.teacher_name || briefingData?.todayLesson?.teacher_name || 'Deine Lehrkraft')}
          masteredDate={certificateSong.masteredDate}
          certificateId={certificateSong.certificateId}
          onClose={() => setCertificateSong(null)}
        />
      )}

      {/* 23. Song & Lehrwerk Details */}
      {selectedSongForDetail && (
        <StudentSongDetailModal
          song={selectedSongForDetail}
          onClose={() => setSelectedSongForDetail(null)}
          studentId={studentId}
          progressItems={progressItems}
          handleTabChangeLocal={handleTabChangeLocal}
          setSelectedTopic={setSelectedTopic}
        />
      )}

      {selectedLehrwerkForDetail && (
        <StudentLehrwerkDetailModal
          book={selectedLehrwerkForDetail}
          onClose={() => setSelectedLehrwerkForDetail(null)}
          lehrwerke={lehrwerke}
          progressItems={progressItems}
          localProgress={localProgress}
          studentId={studentId}
          isMobile={isMobile}
          handleTabChangeLocal={handleTabChangeLocal}
          setSelectedTopic={setSelectedTopic}
        />
      )}

      {/* 24. Wrapped Story */}
      {showWrapped && !!wrappedData && (
        <CampusWrappedStoryModal
          isOpen={Boolean(showWrapped && !!wrappedData)}
          onClose={() => setShowWrapped && setShowWrapped(false)}
          wrappedData={wrappedData}
          avatar={avatar}
          currentLevel={currentLevel || 1}
          studentId={studentId}
          levelTitle={levelTitle || ''}
        />
      )}

      {/* 25. Focus Interruption Guard Modal */}
      {focusGuard?.isAborted && (
        <FocusAbortedModal
          isOpen={focusGuard.isAborted}
          reason={focusGuard.abortReason}
          toolName="Fokus-Übetimer"
          uiLevel={studentUiLevel}
          onClose={() => {
            focusGuard.acknowledgeAbort();
          }}
        />
      )}
    </Suspense>
  );
};
