import React from 'react';
import type { SecretaryModalsMasterHubProps } from './SecretaryModalsMasterHub';

export interface BuildSecretaryModalsMasterHubPropsParams {
  // Identity & Core Infrastructure
  schoolId: string;
  schoolNumericId: number;
  userId?: string;
  supabase: any;
  currentSchoolProfile: any;
  setCurrentSchoolProfile: React.Dispatch<React.SetStateAction<any>> | ((profile: any) => void);
  currentUserProfile: any;
  activePlatform?: string;
  showRealNames?: boolean;

  // Pricing & Operator Details
  masterPricing: any;
  operatorCompany: string;
  operatorContact: string;
  operatorStreet: string;
  operatorZip: string;
  operatorCity: string;
  operatorIban: string;
  operatorBic: string;

  // Navigation & Shell
  navigation: any;

  // Hook Bundles
  settings: any;
  extendedSettings: any;
  licenses: any;
  staff: any;
  studentsHook: any;
  bookings: any;
  schedules: any;
  dashboardData: any;
  activeSubjectsList?: string[];

  // Modals & Handlers
  showAgb: boolean;
  setShowAgb: React.Dispatch<React.SetStateAction<boolean>>;
  showPrivacy: boolean;
  setShowPrivacy: React.Dispatch<React.SetStateAction<boolean>>;
  showDpoIdCardModal: boolean;
  setShowDpoIdCardModal: React.Dispatch<React.SetStateAction<boolean>>;
  showDpoPortalModal: boolean;
  setShowDpoPortalModal: React.Dispatch<React.SetStateAction<boolean>>;
  showParentInfoSheetModal: boolean;
  setShowParentInfoSheetModal: React.Dispatch<React.SetStateAction<boolean>>;
  showGuidanceModal: boolean;
  setShowGuidanceModal: React.Dispatch<React.SetStateAction<boolean>>;
  guidanceInitialTab?: 'teacher' | 'parent' | 'templates';
  isFeedbackModalOpen: boolean;
  setIsFeedbackModalOpen: (open: boolean) => void;
  showFacilityLogModal: boolean;
  setShowFacilityLogModal: (show: boolean) => void;
  handleResolveRoomIssue: (issueId: string) => Promise<void>;
  handleReopenRoomIssue: (issueId: string) => Promise<void>;
  showUnassignedWarning: boolean;
  setShowUnassignedWarning: (show: boolean) => void;
  showAvvModal?: boolean;
  setShowAvvModal?: React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean) => void);
  isAvvSigned?: boolean;
  setIsAvvSigned?: React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean) => void);
  rooms?: any[];
  userMap?: Record<string, string>;
  allUniqueTeacherProfiles: any[];
  getEffectiveStorageUsedBytes: (profile: any) => number;
  generateStarterPin: (role: string, isCampus: boolean, isGroovelab: boolean) => string;
}

/**
 * Builds the complete, type-safe prop tree for SecretaryModalsMasterHub
 * reducing over 300 LOC in SecretaryDashboard.tsx while maintaining Goldstandard modularity.
 */
export function buildSecretaryModalsMasterHubProps(
  params: BuildSecretaryModalsMasterHubPropsParams
): SecretaryModalsMasterHubProps {
  const {
    schoolId,
    schoolNumericId,
    userId,
    supabase,
    currentSchoolProfile,
    setCurrentSchoolProfile,
    currentUserProfile,
    activePlatform,
    showRealNames = true,
    masterPricing,
    operatorCompany,
    operatorContact,
    operatorStreet,
    operatorZip,
    operatorCity,
    operatorIban,
    operatorBic,
    navigation,
    settings,
    extendedSettings,
    licenses,
    staff,
    studentsHook,
    bookings,
    schedules,
    dashboardData,
    showAgb,
    setShowAgb,
    showPrivacy,
    setShowPrivacy,
    showDpoIdCardModal,
    setShowDpoIdCardModal,
    showDpoPortalModal,
    setShowDpoPortalModal,
    showParentInfoSheetModal,
    setShowParentInfoSheetModal,
    showGuidanceModal,
    setShowGuidanceModal,
    guidanceInitialTab,
    isFeedbackModalOpen,
    setIsFeedbackModalOpen,
    showFacilityLogModal,
    setShowFacilityLogModal,
    handleResolveRoomIssue,
    handleReopenRoomIssue,
    showUnassignedWarning,
    setShowUnassignedWarning,
    allUniqueTeacherProfiles,
    getEffectiveStorageUsedBytes,
    generateStarterPin
  } = params;

  return {
    operationsProps: {
      showLogbookModal: bookings.showLogbookModal,
      setShowLogbookModal: bookings.setShowLogbookModal,
      logbookBookings: bookings.logbookBookings,
      editingLogbookBookingId: bookings.editingLogbookBookingId,
      setEditingLogbookBookingId: bookings.setEditingLogbookBookingId,
      editBookingTitle: bookings.editBookingTitle,
      setEditBookingTitle: bookings.setEditBookingTitle,
      editBookingRoomId: bookings.editBookingRoomId,
      setEditBookingRoomId: bookings.setEditBookingRoomId,
      editBookingDate: bookings.editBookingDate,
      setEditBookingDate: bookings.setEditBookingDate,
      editBookingStartTime: bookings.editBookingStartTime,
      setEditBookingStartTime: bookings.setEditBookingStartTime,
      editBookingEndTime: bookings.editBookingEndTime,
      setEditBookingEndTime: bookings.setEditBookingEndTime,
      rooms: params.rooms ?? dashboardData?.rooms ?? [],
      handleConfirmLogbookBooking: bookings.handleConfirmLogbookBooking,
      handleUpdateLogbookBooking: bookings.handleUpdateLogbookBooking,
      handleDeleteLogbookBooking: bookings.handleDeleteLogbookBooking,
      showTrialLogModal: licenses.showTrialLogModal,
      setShowTrialLogModal: licenses.setShowTrialLogModal,
      trialLogsLoading: licenses.trialLogsLoading,
      trialLogs: licenses.trialLogs,
      userMap: params.userMap ?? dashboardData?.userMap ?? {},
      showResetModal: settings.showResetModal,
      setShowResetModal: settings.setShowResetModal,
      resetConfirmText: settings.resetConfirmText,
      setResetConfirmText: settings.setResetConfirmText,
      schoolName: settings.schoolName,
      handleResetSchool: settings.handleResetSchool,
      isResetting: settings.isResetting,
      showBulkDeleteModal: studentsHook.showBulkDeleteModal,
      setShowBulkDeleteModal: studentsHook.setShowBulkDeleteModal,
      bulkDeleteStep: studentsHook.bulkDeleteStep,
      setBulkDeleteStep: studentsHook.setBulkDeleteStep,
      bulkDeletePin: studentsHook.bulkDeletePin,
      setBulkDeletePin: studentsHook.setBulkDeletePin,
      selectedStudentIds: studentsHook.selectedStudentIds,
      setSelectedStudentIds: studentsHook.setSelectedStudentIds,
      students: studentsHook.students,
      setStudents: studentsHook.setStudents,
      showRealNames,
      activeTab: navigation.activeTab,
      fetchDashboardData: dashboardData.fetchDashboardData
    },

    facilityLogProps: showFacilityLogModal ? {
      isOpen: showFacilityLogModal,
      onClose: () => setShowFacilityLogModal(false),
      roomIssues: bookings?.roomIssues ?? dashboardData?.roomIssues ?? [],
      rooms: params.rooms ?? dashboardData?.rooms ?? [],
      schoolId,
      onResolveIssue: handleResolveRoomIssue,
      onReopenIssue: handleReopenRoomIssue
    } : null,

    userDetailProps: {
      selectedStudentForDetail: studentsHook.selectedStudentForDetail,
      setSelectedStudentForDetail: studentsHook.setSelectedStudentForDetail,
      deleteStudentModalData: studentsHook.deleteStudentModalData,
      setDeleteStudentModalData: studentsHook.setDeleteStudentModalData,
      setStudents: studentsHook.setStudents,
      selectedCoachProfile: staff.selectedCoachProfile,
      setSelectedCoachProfile: staff.setSelectedCoachProfile,
      manageTeacher: staff.manageTeacher,
      setManageTeacher: staff.setManageTeacher,
      schoolName: settings.schoolName,
      schoolId,
      activeTab: navigation.activeTab,
      setActiveTab: navigation.setActiveTab,
      setCampusSubTab: navigation.setCampusSubTab,
      setGroovelabSubTab: navigation.setGroovelabSubTab,
      students: studentsHook.students,
      bands: dashboardData.bands,
      activeSubjectsList: params.activeSubjectsList ?? dashboardData?.activeSubjectsList ?? [],
      handleUpdateTeacher: extendedSettings.handleUpdateTeacher,
      handleDeleteUser: staff.handleDeleteUser,
      setQrModalUser: settings.setQrModalUser,
      generateStarterPin,
      showUnassignedWarning,
      setShowUnassignedWarning,
      matrixAllocations: schedules.matrixAllocations,
      handleSaveAndApproveAll: schedules.handleSaveAndApproveAll,
      activeContextMenu: schedules.activeContextMenu,
      setActiveContextMenu: schedules.setActiveContextMenu,
      handleDeleteStudentCampus: studentsHook.handleDeleteStudentCampus,
      fetchDashboardData: dashboardData.fetchDashboardData
    },

    billingProps: {
      schoolId,
      schoolNumericId,
      schoolName: settings.schoolName,
      schoolStreet: settings.schoolStreet,
      schoolHouseNumber: settings.schoolHouseNumber,
      schoolZipCode: settings.schoolZipCode,
      schoolCity: settings.schoolCity,
      supabase,
      currentSchoolProfile,
      setCurrentSchoolProfile,
      fetchDashboardData: dashboardData.fetchDashboardData,
      fetchTariffBookings: licenses.fetchTariffBookings,
      masterPricing,
      students: studentsHook.students,
      showChangeTariffModal: licenses.showChangeTariffModal,
      setShowChangeTariffModal: licenses.setShowChangeTariffModal,
      selectedModalOption: licenses.selectedModalOption,
      setSelectedModalOption: licenses.setSelectedModalOption,
      studentBillingOption: licenses.studentBillingOption,
      setNextBillingOption: licenses.setNextBillingOption,
      setNextBillingOptionEffectiveAt: licenses.setNextBillingOptionEffectiveAt,
      activeStudentsModalList: licenses.activeStudentsModalList,
      setActiveStudentsModalList: licenses.setActiveStudentsModalList,
      modalStudentSearchQuery: licenses.modalStudentSearchQuery,
      setModalStudentSearchQuery: licenses.setModalStudentSearchQuery,
      showSwitchBillingModelModal: licenses.showSwitchBillingModelModal,
      setShowSwitchBillingModelModal: licenses.setShowSwitchBillingModelModal,
      selectedSwitchTargetPayer: licenses.selectedSwitchTargetPayer,
      setSelectedSwitchTargetPayer: licenses.setSelectedSwitchTargetPayer,
      billingPayer: licenses.billingPayer,
      setBillingPayer: licenses.setBillingPayer,
      setStudentBillingOption: licenses.setStudentBillingOption,
      isSwitchingPayer: licenses.isSwitchingPayer,
      setIsSwitchingPayer: licenses.setIsSwitchingPayer,
      showStorageManagerModal: licenses?.showStorageManagerModal ?? false,
      setShowStorageManagerModal: licenses?.setShowStorageManagerModal ?? (() => {}),
      selectedStorageAddonGb: licenses.selectedStorageAddonGb,
      setSelectedStorageAddonGb: licenses.setSelectedStorageAddonGb,
      selectedStorageAddonFee: licenses.selectedStorageAddonFee,
      setSelectedStorageAddonFee: licenses.setSelectedStorageAddonFee,
      hasCampusSub: licenses.hasCampusSub,
      hasGroovelabSub: licenses.hasGroovelabSub,
      isSubmittingStorage: licenses.isSubmittingStorage,
      setIsSubmittingStorage: licenses.setIsSubmittingStorage,
      setStorageBookingSuccessModal: licenses.setStorageBookingSuccessModal,
      getEffectiveStorageUsedBytes,
      storageBookingSuccessModal: licenses.storageBookingSuccessModal,
      showStorageTerminationModal: licenses.showStorageTerminationModal,
      setShowStorageTerminationModal: licenses.setShowStorageTerminationModal,
      storageTerminationDays: licenses.storageTerminationDays,
      setStorageTerminationDays: licenses.setStorageTerminationDays,
      selectedInvoice: licenses?.selectedInvoice ?? null,
      setSelectedInvoice: licenses?.setSelectedInvoice ?? (() => {}),
      campusActivatedThisMonth: licenses.campusActivatedThisMonth,
      groovelabActivatedThisMonth: licenses.groovelabActivatedThisMonth,
      billableTeachersCount: licenses.billableTeachersCount,
      activeStudentsCount_global: licenses.activeStudentsCount_global,
      activeGroovelabStudentsCount_global: licenses.activeGroovelabStudentsCount_global,
      passiveStudentsCount_global: licenses.passiveStudentsCount_global,
      isSammelzahler: licenses.isSammelzahler,
      operatorCompany,
      operatorContact,
      operatorStreet,
      operatorZip,
      operatorCity,
      operatorIban,
      operatorBic,
      showCancelModal: licenses.showCancelModal,
      setShowCancelModal: licenses.setShowCancelModal,
      simulatedToday: dashboardData.simulatedToday,
      schoolContractEndsAt: licenses.schoolContractEndsAt,
      setSchoolContractEndsAt: licenses.setSchoolContractEndsAt,
      setIsCancelled: licenses.setIsCancelled,
      cancellationReason: licenses.cancellationReason,
      setCancellationReason: licenses.setCancellationReason,
      setLastCancellationId: licenses.setLastCancellationId,
      getSchoolYearEndInfo: licenses.getSchoolYearEndInfo,
      downloadCancellationReceiptPdf: licenses.downloadCancellationReceiptPdf,
      showModuleUpgradeModal: licenses.showModuleUpgradeModal,
      setShowModuleUpgradeModal: licenses.setShowModuleUpgradeModal,
      upgradeTargetModule: licenses.upgradeTargetModule,
      upgradeProcessing: licenses.upgradeProcessing,
      setUpgradeProcessing: licenses.setUpgradeProcessing,
      setHasCampusSub: licenses.setHasCampusSub,
      setHasGroovelabSub: licenses.setHasGroovelabSub,
      downloadUpgradeConfirmationPdf: licenses.downloadUpgradeConfirmationPdf
    },

    generalProps: {
      schoolId,
      schoolName: settings.schoolName || currentSchoolProfile?.name || 'Stadtmusikschule',
      userId,
      currentUserProfile,
      currentSchoolProfile,
      setCurrentSchoolProfile,
      fetchDashboardData: dashboardData.fetchDashboardData,
      activeTab: navigation.activeTab,
      activePlatform: activePlatform as any,
      showAgb,
      setShowAgb,
      showPrivacy,
      setShowPrivacy,
      showDunningPayModal: extendedSettings.showDunningPayModal,
      setShowDunningPayModal: extendedSettings.setShowDunningPayModal,
      dunningStatus: extendedSettings.dunningStatus,
      operatorCompany,
      operatorIban,
      operatorBic,
      setActiveTab: navigation.setActiveTab,
      setSecretarySubTab: navigation.setSecretarySubTab,
      setTrustRefreshToken: extendedSettings.setTrustRefreshToken,
      showOwnQrModal: settings.showOwnQrModal,
      setShowOwnQrModal: settings.setShowOwnQrModal,
      qrModalUser: settings.qrModalUser,
      setQrModalUser: settings.setQrModalUser,
      showAvvModal: params.showAvvModal ?? settings?.showAvvModal ?? false,
      setShowAvvModal: params.setShowAvvModal ?? settings?.setShowAvvModal ?? (() => {}),
      setIsAvvSigned: params.setIsAvvSigned ?? settings?.setIsAvvSigned ?? (() => {}),
      showDpoIdCardModal,
      setShowDpoIdCardModal,
      showDpoPortalModal,
      setShowDpoPortalModal,
      showBulkImportModal: studentsHook.showBulkImportModal,
      setShowBulkImportModal: studentsHook.setShowBulkImportModal,
      allUniqueTeacherProfiles,
      showParentInfoSheetModal,
      setShowParentInfoSheetModal,
      showGuidanceModal,
      setShowGuidanceModal,
      guidanceInitialTab,
      isFeedbackModalOpen,
      setIsFeedbackModalOpen
    }
  };
}
