import React from 'react';
import { StudentSettingsTabProps } from './StudentSettingsTab';
import { exportStudentGdprDossier } from '../../../services/gdprDataExportService';

export interface BuildStudentSettingsParams {
  studentId: string;
  profile: any;
  practice: any;
  streaks: any;
  parent: any;
  schedule: any;
  feed: any;
  onProfileUpdate?: (updated: any) => void;
  setIsHelpCenterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPushSoftPrompt: React.Dispatch<React.SetStateAction<boolean>>;
}

export function buildStudentSettingsProps(params: BuildStudentSettingsParams): StudentSettingsTabProps {
  const {
    studentId,
    profile,
    practice,
    streaks,
    parent,
    schedule,
    feed,
    onProfileUpdate,
    setIsHelpCenterOpen,
    setShowPushSoftPrompt,
  } = params;

  return {
    activeStudentSettingsModal: parent.activeStudentSettingsModal as any,
    activeTab: profile.activeTab,
    avatar: streaks.avatar,
    applyAndSaveParentControls: async (updates: any) => {
      if (updates?.uiLevel) {
        profile.setStudentUiLevel(updates.uiLevel);
        if (onProfileUpdate) {
          try {
            onProfileUpdate({ campus_ui_level: updates.uiLevel });
          } catch (e) {
            console.warn('Could not propagate uiLevel to root:', e);
          }
        }
      }
      await parent.applyAndSaveParentControls(updates);
    },
    bedtimeEnd: parent.bedtimeEnd,
    bedtimeModeEnabled: parent.bedtimeModeEnabled,
    bedtimeStart: parent.bedtimeStart,
    cancelledSchoolYearOccurrences: schedule.cancelledSchoolYearOccurrences,
    checkIsParentSessionActive: parent.checkIsParentSessionActiveLocal,
    currentPlatform: profile.currentPlatform,
    daytimeLockDays: parent.daytimeLockDays,
    daytimeLockEnabled: parent.daytimeLockEnabled,
    daytimeLockEnd: parent.daytimeLockEnd,
    daytimeLockStart: parent.daytimeLockStart,
    draftAllowAbsences: true,
    draftAllowAudio: true,
    draftAllowChat: true,
    draftAllowLeaderboard: true,
    draftAllowProposals: true,
    draftAllowReschedule: true,
    draftAllowTimer: true,
    draftAllowTts: feed.draftAllowTts,
    draftBoardOverrides: {},
    draftUiLevel: profile.studentUiLevel,
    extendParentSession: parent.extendParentSession,
    lockParentSession: parent.lockParentSession,
    parentLockRemainingSeconds: parent.parentLockRemainingSeconds,
    familyProfiles: parent.familyProfiles,
    firstPinActiveField: 'new',
    firstPinShowMask: false,
    generateParentRecoveryKey: () => '',
    getTargetMinutes: streaks.getTargetMinutes,
    handleBiometricUnlock: parent.handleBiometricUnlock,
    handleRegisterParentPasskey: parent.handleRegisterParentPasskey,
    handleCloseSettingsModal: () => parent.setActiveStudentSettingsModal(null),
    handleDownloadGoBdReceipt: async () => {},
    handleExportGdprReport: async () => {
      try {
        if (!profile.studentUser) return;
        await exportStudentGdprDossier(profile.studentUser, {
          evolutionLevel: streaks.evolutionLevel,
          flameType: streaks.flameType,
          totalMinutes: streaks.totalMinutes,
          parentPermissions: parent.parentPermissions,
          homeworkNotes: feed.homeworkNotes,
          stickers: feed.stickers
        });
      } catch (err) {
        console.error('[GDPR Art. 15 Export] Error:', err);
      }
    },
    handleExportFullDataArchive: async () => {},
    handleOpenSettingsModule: (mod) => parent.setActiveStudentSettingsModal(mod),
    handleRemoveFamilyProfile: parent.handleRemoveFamilyProfile,
    handleSetInstantLock: parent.handleSetInstantLock,
    handleSwitchFamilyStudent: parent.handleSwitchFamilyStudent,
    handleUndoCancelOccurrence: schedule.handleUndoCancelOccurrence,
    handleUpdateBedtime: parent.handleUpdateBedtime,
    handleUpdateDaytimeLock: parent.handleUpdateDaytimeLock,
    handleVerifyParentPinAttempt: parent.handleVerifyParentPinAttempt,
    hasCopiedRecoveryKey: parent.hasCopiedRecoveryKey,
    instantLockUntil: parent.instantLockUntil,
    isAddSiblingModalOpen: parent.isAddSiblingModalOpen,
    isAdultStudent: profile.isAdultStudent,
    isCurrentlyInInstantLock: parent.isCurrentlyInInstantLock,
    isIOS: false,
    isMobile: profile.isMobile,
    isParentGateShaking: parent.isParentGateShaking,
    isParentLockWarning: parent.isParentLockWarning,
    isParentUnlocked: parent.isParentUnlocked,
    isPremiumUser: false,
    isSavingPin: false,
    isStandalone: false,
    isVerifyingParentGate: parent.isVerifyingParentGate,
    isWebAuthnAvailable: true,
    newGeneratedRecoveryKey: parent.newGeneratedRecoveryKey,
    onProfileUpdate,
    parentBriefingDismissed: false,
    parentControlsTab: 'governance',
    parentGateCooldownSeconds: parent.parentGateCooldownSeconds,
    parentGateError: parent.parentGateError,
    parentGatePinInput: parent.parentGatePinInput,
    parentSetupConfirm: '',
    parentSetupError: '',
    parentSetupPin: '',
    parentSetupStep: 'enter',
    pinFormConfirm: '',
    pinFormError: '',
    pinFormNew: '',
    pinFormSuccess: '',
    pushEnabled: false,
    pushNotifChat: false,
    pushNotifHomework: false,
    pushNotifPracticeReminder: false,
    pushNotifScheduleChanges: false,
    pushNotifWeeklyDigest: false,
    recentlyChangedDiff: parent.recentlyChangedDiff,
    renderParentGateModal: () => null,
    renderRecoveryKeyModal: () => null,
    scheduleOccurrences: schedule.scheduleOccurrences,
    securityPinTarget: 'parent',
    setActiveStudentSettingsModal: parent.setActiveStudentSettingsModal as any,
    setFamilyProfiles: parent.setFamilyProfiles,
    setFirstPinActiveField: () => {},
    setFirstPinShowMask: () => {},
    setHasCopiedRecoveryKey: parent.setHasCopiedRecoveryKey,
    setIsAddSiblingModalOpen: parent.setIsAddSiblingModalOpen,
    setIsHelpCenterOpen,
    setIsSavingPin: () => {},
    setNewGeneratedRecoveryKey: parent.setNewGeneratedRecoveryKey,
    setParentBriefingDismissed: () => {},
    setParentControlsTab: () => {},
    setParentGateError: parent.setParentGateError,
    setParentGatePinInput: parent.setParentGatePinInput,
    setParentSetupConfirm: () => {},
    setParentSetupError: () => {},
    setParentSetupPin: () => {},
    setParentSetupStep: () => {},
    setPinFormConfirm: () => {},
    setPinFormError: () => {},
    setPinFormNew: () => {},
    setPinFormSuccess: () => {},
    setPushEnabled: () => {},
    setPushNotifChat: () => {},
    setPushNotifHomework: () => {},
    setPushNotifPracticeReminder: () => {},
    setPushNotifScheduleChanges: () => {},
    setPushNotifWeeklyDigest: () => {},
    setRecentlyChangedDiff: parent.setRecentlyChangedDiff,
    setRecoveryKeyError: parent.setRecoveryKeyError,
    setRecoveryKeyInput: parent.setRecoveryKeyInput,
    setSecurityPinTarget: () => {},
    setSettingsSubTab: () => {},
    setShowEmergencyKitModal: parent.setShowEmergencyKitModal,
    setShowParentActivationModal: parent.setShowParentActivationModal,
    setShowPushSoftPrompt,
    setShowRecoveryKeyModal: parent.setShowRecoveryKeyModal,
    setStudentUser: profile.setStudentUser,
    showEmergencyKitModal: parent.showEmergencyKitModal,
    studentId,
    studentUiLevel: profile.studentUiLevel,
    studentUser: profile.studentUser,
    totalPracticeMinutes: Math.floor(practice.secondsElapsed / 60),
    weeklyPracticeMinutes: 0,
    schoolYearPracticeMinutes: 0,
  };
}
