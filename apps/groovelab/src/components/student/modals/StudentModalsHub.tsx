import React, { Suspense, lazy, useRef } from 'react';
import { CampusLevelSelectModal } from '../../campus/CampusLevelSelectModal';
import { GlobalParentPinModal } from './GlobalParentPinModal';
import { SiblingPinUnlockModal } from './SiblingPinUnlockModal';
import { StudentJuniorPreFlightModal } from './StudentJuniorPreFlightModal';
import { StudentJuniorStickerModal, JuniorStickerCategory } from './StudentJuniorStickerModal';
import { StudentJuniorStickerDetailModal } from './StudentJuniorStickerDetailModal';
import { StudentJuniorStickerAwardModal } from './StudentJuniorStickerAwardModal';
import { StudentSessionCelebrationModal } from './StudentSessionCelebrationModal';
import { StudentMatchCelebrationModal } from './StudentMatchCelebrationModal';
import { CampusAppointmentShoutboxModal } from '../../CampusAppointmentShoutboxModal';
import { StudentRescheduleBottomSheetModal } from './StudentRescheduleBottomSheetModal';
import { DigitalDetoxOverlay } from './DigitalDetoxOverlay';
import { StudentContributionsModal } from './StudentContributionsModal';
import { StudentRulesModal } from './StudentRulesModal';
import { StudentCrisisNotifsModal } from './StudentCrisisNotifsModal';
import { StudentSongDetailModal } from './StudentSongDetailModal';
import { StudentLehrwerkDetailModal } from './StudentLehrwerkDetailModal';
import { FocusAbortedModal } from '../../focus/FocusAbortedModal';
import { ALL_STICKERS } from '../../../domain/stickersAndTresor';
import { formatStudentPureFirstName, formatTeacherFullName } from '../../../utils/nameHelper';

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
  celebrationDetails: any;
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
    <>
      {/* 1. Level Modal */}
      {showLevelModal && (
        <CampusLevelSelectModal
          currentLevel={studentUiLevel}
          onSelectLevel={handleLevelChange}
          onClose={() => setShowLevelModal(false)}
        />
      )}

      {/* 2. Global Parent PIN Modal */}
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

      {/* 4. Junior Pre-Flight Modal */}
      <StudentJuniorPreFlightModal
        isOpen={showJuniorPreFlightModal}
        onClose={() => setShowJuniorPreFlightModal(false)}
        missionInfo={juniorMissionDetails}
        targetMins={targetMins}
        juniorSelectedTrackIndex={juniorSelectedTrackIndex}
        onSelectTrackIndex={setJuniorSelectedTrackIndex}
        onStartMission={onStartJuniorMission}
      />

      {/* 5. Junior Sticker Modal */}
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

      {/* 6. Junior Sticker Detail */}
      <StudentJuniorStickerDetailModal
        sticker={juniorSelectedPreviewSticker}
        onClose={() => setJuniorSelectedPreviewSticker(null)}
        assignedCampusSongs={assignedCampusSongs}
        progressItems={progressItems}
        isSongMastered={isSongMastered}
        onStartRocket={onStartRocket}
        onDownloadJpg={downloadJuniorStickerJpg || (() => {})}
      />

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
      <StudentSessionCelebrationModal
        isOpen={showCelebration}
        celebrationDetails={celebrationDetails}
        studentUiLevel={studentUiLevel}
        personalAverageMinutes={15}
        celebrationCanvasRef={internalCanvasRef}
        celebrationRingProgress={celebrationRingProgress}
        onClose={() => setShowCelebration(false)}
      />

      {/* 9. Match Celebration */}
      <StudentMatchCelebrationModal
        data={matchCelebrationData}
        onClose={() => setMatchCelebrationData(null)}
      />

      {/* 10. Appointment Quick Chat (Shoutbox) */}
      {showAppointmentChat && appointmentChatData && (
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
          initialDraftMessage={rescheduleChatDraft}
        />
      )}

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
          onOpenChatInquiry={(teacher, suggestedText) => {
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
          teacherAvatarUrl={activeRescheduleBottomSheetOcc?.teacher?.avatar_url || activeRescheduleBottomSheetOcc?.teacher?.photo_url}
        />
      )}

      {/* 12. Detox Overlay */}
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

      {/* 13. Contributions Modal */}
      <StudentContributionsModal
        data={contributionsModalData}
        loading={loadingContributions}
        onClose={() => setContributionsModalData(null)}
      />

      {/* 14. Rules Modal */}
      <StudentRulesModal
        isOpen={showRulesModal}
        evolutionLevel={avatar?.evolution_level || 1}
        onClose={() => setShowRulesModal(false)}
      />

      {/* 15. Crisis Notifications */}
      <StudentCrisisNotifsModal
        unreadCrisisNotifs={unreadCrisisNotifs}
        onDismiss={() => setUnreadCrisisNotifs([])}
        onAcknowledgeSuccess={(acknowledgedIds) => {
          setUnreadCrisisNotifs(unreadCrisisNotifs.filter(n => !acknowledgedIds.includes(n.id)));
        }}
      />

      {/* 16. Push Soft Prompt */}
      {showPushSoftPrompt && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* 17. Praxis Toolbox */}
      {showStudentToolbox && (
        <Suspense fallback={null}>
          <StudentToolboxModal
            isOpen={showStudentToolbox}
            onClose={() => setShowStudentToolbox(false)}
            ageGroup={studentUiLevel || 'pro'}
          />
        </Suspense>
      )}

      {/* 18. Parent Activation Modal */}
      {showParentActivationModal && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* 19. Soft Lock Modal */}
      {showSoftLockModal && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* 20. Help Center */}
      {isHelpCenterOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* 21. Feedback Hub */}
      {isFeedbackModalOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* 22. Meisterwerk Certificate */}
      {certificateSong && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* 23. Song & Lehrwerk Details */}
      <StudentSongDetailModal
        song={selectedSongForDetail}
        onClose={() => setSelectedSongForDetail(null)}
        studentId={studentId}
        progressItems={progressItems}
        handleTabChangeLocal={handleTabChangeLocal}
        setSelectedTopic={setSelectedTopic}
      />

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

      {/* 24. Wrapped Story */}
      {showWrapped && !!wrappedData && (
        <Suspense fallback={null}>
          <CampusWrappedStoryModal
            isOpen={Boolean(showWrapped && !!wrappedData)}
            onClose={() => setShowWrapped && setShowWrapped(false)}
            wrappedData={wrappedData}
            avatar={avatar}
            currentLevel={currentLevel || 1}
            studentId={studentId}
            levelTitle={levelTitle || ''}
          />
        </Suspense>
      )}

      {/* 25. Focus Interruption Guard Modal */}
      {focusGuard && (
        <FocusAbortedModal
          isOpen={focusGuard.isAborted}
          reason={focusGuard.abortReason}
          toolName="Fokus-Übetimer"
          onClose={() => {
            focusGuard.acknowledgeAbort();
          }}
        />
      )}
    </>
  );
};
