import React from 'react';
import type { SecretaryCampusTabProps } from './SecretaryCampusTab';

export interface BuildSecretaryCampusPropsParams {
  schoolId: string;
  userId?: string;
  userRole?: string;
  userRoles?: string[];
  activePlatform?: string;
  showRealNames?: boolean;
  onLogout?: () => void;
  currentSchoolProfile: any;

  // Navigation & Shell
  navigation: any;

  // Hook Bundles
  settings: any;
  extendedSettings: any;
  licenses: any;
  staff: any;
  studentsHook: any;
  schedules: any;
  dashboardData: any;

  // Modals & Navigation triggers
  showGuidanceModal: boolean;
  setShowGuidanceModal: React.Dispatch<React.SetStateAction<boolean>>;
  guidanceInitialTab?: string;
  setGuidanceInitialTab: React.Dispatch<React.SetStateAction<any>>;
  showParentInfoSheetModal: boolean;
  setShowParentInfoSheetModal: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFeedbackModalOpen: (open: boolean) => void;
  setApprovalToast: (toast: any) => void;

  // Feature Toggles (Campus)
  enabledCampusSubjects: boolean;
  setEnabledCampusSubjects: React.Dispatch<React.SetStateAction<boolean>>;
  enabledCampusRooms: boolean;
  setEnabledCampusRooms: React.Dispatch<React.SetStateAction<boolean>>;
  enabledCampusEvents: boolean;
  setEnabledCampusEvents: React.Dispatch<React.SetStateAction<boolean>>;
  enabledCampusSchedules: boolean;
  setEnabledCampusSchedules: React.Dispatch<React.SetStateAction<boolean>>;
  enabledCalendarWidget: boolean;
  setEnabledCalendarWidget: React.Dispatch<React.SetStateAction<boolean>>;
  enabledQrLogin: boolean;
  setEnabledQrLogin: React.Dispatch<React.SetStateAction<boolean>>;
  campusTeachersManageStudents: boolean;
  setCampusTeachersManageStudents: React.Dispatch<React.SetStateAction<boolean>>;
  campusTeachersManageTeachers: boolean;
  setCampusTeachersManageTeachers: React.Dispatch<React.SetStateAction<boolean>>;
  teachersManageTeachers: boolean;
  setTeachersManageTeachers: React.Dispatch<React.SetStateAction<boolean>>;

  // Ad-hoc Bookings & Live View
  schedulesRoomsViewMode: 'designer' | 'live';
  setSchedulesRoomsViewMode: React.Dispatch<React.SetStateAction<'designer' | 'live'>>;
  liveViewDay: number;
  setLiveViewDay: React.Dispatch<React.SetStateAction<number>>;
  showAdHocBooking: boolean;
  setShowAdHocBooking: React.Dispatch<React.SetStateAction<boolean>>;
  adHocRoomId: string | null;
  setAdHocRoomId: React.Dispatch<React.SetStateAction<string | null>>;
  adHocStartTime: string;
  setAdHocStartTime: React.Dispatch<React.SetStateAction<string>>;
  adHocDuration: number;
  setAdHocDuration: React.Dispatch<React.SetStateAction<number>>;
  adHocTeacherId: string;
  setAdHocTeacherId: React.Dispatch<React.SetStateAction<string>>;
  adHocStudentName: string;
  setAdHocStudentName: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * Builds the complete, type-safe prop tree for SecretaryCampusTab
 * reducing prop sprawl in SecretaryDashboard.tsx while maintaining Goldstandard isolation.
 */
export function buildSecretaryCampusProps(
  params: BuildSecretaryCampusPropsParams
): SecretaryCampusTabProps {
  const {
    schoolId,
    userId,
    userRole,
    userRoles,
    activePlatform,
    showRealNames = true,
    onLogout,
    currentSchoolProfile,
    navigation,
    settings,
    extendedSettings,
    licenses,
    staff,
    studentsHook,
    schedules,
    dashboardData,
    showGuidanceModal,
    setShowGuidanceModal,
    guidanceInitialTab,
    setGuidanceInitialTab,
    showParentInfoSheetModal,
    setShowParentInfoSheetModal,
    setIsFeedbackModalOpen,
    setApprovalToast,
    enabledCampusSubjects,
    setEnabledCampusSubjects,
    enabledCampusRooms,
    setEnabledCampusRooms,
    enabledCampusEvents,
    setEnabledCampusEvents,
    enabledCampusSchedules,
    setEnabledCampusSchedules,
    enabledCalendarWidget,
    setEnabledCalendarWidget,
    enabledQrLogin,
    setEnabledQrLogin,
    campusTeachersManageStudents,
    setCampusTeachersManageStudents,
    campusTeachersManageTeachers,
    setCampusTeachersManageTeachers,
    teachersManageTeachers,
    setTeachersManageTeachers,
    schedulesRoomsViewMode,
    setSchedulesRoomsViewMode,
    liveViewDay,
    setLiveViewDay,
    showAdHocBooking,
    setShowAdHocBooking,
    adHocRoomId,
    setAdHocRoomId,
    adHocStartTime,
    setAdHocStartTime,
    adHocDuration,
    setAdHocDuration,
    adHocTeacherId,
    setAdHocTeacherId,
    adHocStudentName,
    setAdHocStudentName
  } = params;

  return {
    campusSubTab: navigation.campusSubTab,
    setCampusSubTab: navigation.setCampusSubTab,
    setSecretarySubTab: navigation.setSecretarySubTab,
    activePlatform,
    schoolId,
    userId,
    userRole,
    userRoles,
    showRealNames,
    windowWidth: navigation.windowWidth,
    onLogout,
    schoolName: settings.schoolName,
    currentSchoolProfile,
    fetchDashboardData: dashboardData.fetchDashboardData,

    // Modals & Navigation triggers
    showAddTeacherModal: staff.showAddTeacherModal,
    setShowAddTeacherModal: staff.setShowAddTeacherModal,
    showAddStudentModal: studentsHook.showAddStudentModal,
    setShowAddStudentModal: studentsHook.setShowAddStudentModal,
    showBulkImportModal: studentsHook.showBulkImportModal,
    setShowBulkImportModal: studentsHook.setShowBulkImportModal,
    showBulkDeleteModal: studentsHook.showBulkDeleteModal,
    setShowBulkDeleteModal: studentsHook.setShowBulkDeleteModal,
    showGuidanceModal,
    setShowGuidanceModal,
    guidanceInitialTab,
    setGuidanceInitialTab,
    showParentInfoSheetModal,
    setShowParentInfoSheetModal,
    setIsFeedbackModalOpen,
    manageTeacher: staff.manageTeacher,
    setManageTeacher: staff.setManageTeacher,
    selectedStudentForDetail: studentsHook.selectedStudentForDetail,
    setSelectedStudentForDetail: studentsHook.setSelectedStudentForDetail,
    setSettingsTab: settings.setSettingsTab,
    setApprovalToast,

    // Feature Toggles (Campus)
    enabledCampusSubjects,
    setEnabledCampusSubjects,
    enabledCampusRooms,
    setEnabledCampusRooms,
    enabledCampusEvents,
    setEnabledCampusEvents,
    enabledCampusSchedules,
    setEnabledCampusSchedules,
    enabledCalendarWidget,
    setEnabledCalendarWidget,
    enabledQrLogin,
    setEnabledQrLogin,
    campusTeachersManageStudents,
    setCampusTeachersManageStudents,
    campusTeachersManageTeachers,
    setCampusTeachersManageTeachers,

    // Onboarding & Teachers
    teachersManageTeachers,
    setTeachersManageTeachers,
    campusTeachers: staff.campusTeachers,
    allTeachers: staff.allTeachers,
    coaches: staff.coaches,
    bypassTeachers: staff.bypassTeachers,
    unsubmittedTeachers: staff.unsubmittedTeachers,
    teacherSearchQuery: staff.teacherSearchQuery,
    setTeacherSearchQuery: staff.setTeacherSearchQuery,
    teacherFilterInstrument: staff.teacherFilterInstrument,
    setTeacherFilterInstrument: staff.setTeacherFilterInstrument,
    teacherStatusTab: staff.teacherStatusTab,
    setTeacherStatusTab: staff.setTeacherStatusTab,
    newTeacherFirstName: staff.newTeacherFirstName,
    setNewTeacherFirstName: staff.setNewTeacherFirstName,
    newTeacherLastName: staff.newTeacherLastName,
    setNewTeacherLastName: staff.setNewTeacherLastName,
    newTeacherEmail: staff.newTeacherEmail,
    setNewTeacherEmail: staff.setNewTeacherEmail,
    newTeacherInstrument: staff.newTeacherInstrument,
    setNewTeacherInstrument: staff.setNewTeacherInstrument,
    newTeacherContractEndsAt: staff.newTeacherContractEndsAt,
    setNewTeacherContractEndsAt: staff.setNewTeacherContractEndsAt,
    handleCreateTeacher: staff.handleCreateTeacher,
    handleImportTeachers: staff.handleImportTeachers,
    handleToggleTeacherModule: staff.handleToggleTeacherModule,
    handleUpdateTeacherInstrument: staff.handleUpdateTeacherInstrument,
    handleGenerateInviteToken: staff.handleGenerateInviteToken,
    handleDownloadTeacherSchedule: staff.handleDownloadTeacherSchedule,
    handleDeleteUser: staff.handleDeleteUser,
    isCsvExpanded: staff.isCsvExpanded,
    setIsCsvExpanded: staff.setIsCsvExpanded,
    csvText: staff.csvText,
    setCsvText: staff.setCsvText,
    expandedSidebarTeacherId: staff.expandedSidebarTeacherId,
    setExpandedSidebarTeacherId: staff.setExpandedSidebarTeacherId,

    // Students
    students: studentsHook.students,
    filteredStudents: studentsHook.filteredStudents,
    frozenStudents: studentsHook.frozenStudents,
    studentSearchQuery: studentsHook.studentSearchQuery,
    setStudentSearchQuery: studentsHook.setStudentSearchQuery,
    studentFilterTeacher: studentsHook.studentFilterTeacher,
    setStudentFilterTeacher: studentsHook.setStudentFilterTeacher,
    studentFilterInstrument: studentsHook.studentFilterInstrument,
    setStudentFilterInstrument: studentsHook.setStudentFilterInstrument,
    studentFilterStatus: studentsHook.studentFilterStatus,
    setStudentFilterStatus: studentsHook.setStudentFilterStatus,
    studentCurrentPage: studentsHook.studentCurrentPage,
    setStudentCurrentPage: studentsHook.setStudentCurrentPage,
    studentPageSize: studentsHook.studentPageSize,
    setStudentPageSize: studentsHook.setStudentPageSize,
    selectedStudentIds: studentsHook.selectedStudentIds,
    setSelectedStudentIds: studentsHook.setSelectedStudentIds,
    copiedStudentId: studentsHook.copiedStudentId,
    setCopiedStudentId: studentsHook.setCopiedStudentId,
    newStudentFirstName: studentsHook.newStudentFirstName,
    setNewStudentFirstName: studentsHook.setNewStudentFirstName,
    newStudentLastName: studentsHook.newStudentLastName,
    setNewStudentLastName: studentsHook.setNewStudentLastName,
    newStudentNickname: studentsHook.newStudentNickname,
    setNewStudentNickname: studentsHook.setNewStudentNickname,
    newStudentInstrument: studentsHook.newStudentInstrument,
    setNewStudentInstrument: studentsHook.setNewStudentInstrument,
    newStudentTeacherId: studentsHook.newStudentTeacherId,
    setNewStudentTeacherId: studentsHook.setNewStudentTeacherId,
    newStudentDuration: studentsHook.newStudentDuration,
    setNewStudentDuration: studentsHook.setNewStudentDuration,
    newStudentIsAppUser: studentsHook.newStudentIsAppUser,
    setNewStudentIsAppUser: studentsHook.setNewStudentIsAppUser,
    newStudentIsCampusActive: studentsHook.newStudentIsCampusActive,
    setNewStudentIsCampusActive: studentsHook.setNewStudentIsCampusActive,
    newStudentIsGroovelabActive: studentsHook.newStudentIsGroovelabActive,
    setNewStudentIsGroovelabActive: studentsHook.setNewStudentIsGroovelabActive,
    handleCreateStudentCampus: studentsHook.handleCreateStudentCampus,
    handleDeleteStudentCampus: studentsHook.handleDeleteStudentCampus,
    handleToggleStudentModule: studentsHook.handleToggleStudentModule,
    handleUpdateStudentTeacher: studentsHook.handleUpdateStudentTeacher,
    handleBatchImportStudents: studentsHook.handleBatchImportStudents,
    isStudentCsvExpanded: studentsHook.isStudentCsvExpanded,
    setIsStudentCsvExpanded: studentsHook.setIsStudentCsvExpanded,
    studentCsvText: studentsHook.studentCsvText,
    setStudentCsvText: studentsHook.setStudentCsvText,
    isImportingStudentsBatch: studentsHook.isImportingStudentsBatch,
    setIsImportingStudentsBatch: studentsHook.setIsImportingStudentsBatch,
    bulkDeleteStep: studentsHook.bulkDeleteStep,
    setBulkDeleteStep: studentsHook.setBulkDeleteStep,
    bulkDeletePin: studentsHook.bulkDeletePin,
    setBulkDeletePin: studentsHook.setBulkDeletePin,

    // Schedules (Matrix & Allocation)
    pendingSchedules: schedules.pendingSchedules,
    rooms: dashboardData.rooms,
    matrixAllocations: schedules.matrixAllocations,
    setMatrixAllocations: schedules.setMatrixAllocations,
    selectedFilterTeacherId: schedules.selectedFilterTeacherId,
    setSelectedFilterTeacherId: schedules.setSelectedFilterTeacherId,
    selectedDayPlan: schedules.selectedDayPlan,
    setSelectedDayPlan: schedules.setSelectedDayPlan,
    showOnlyPendingReviews: schedules.showOnlyPendingReviews,
    setShowOnlyPendingReviews: schedules.setShowOnlyPendingReviews,
    isSavingApproval: schedules.isSavingApproval,
    isApprovingAllSchedules: schedules.isApprovingAllSchedules,
    draggedPlanId: schedules.draggedPlanId,
    setDraggedPlanId: schedules.setDraggedPlanId,
    draggedPlanDay: schedules.draggedPlanDay,
    setDraggedPlanDay: schedules.setDraggedPlanDay,
    dragOverCell: schedules.dragOverCell,
    setDragOverCell: schedules.setDragOverCell,
    dragHoveredTeacher: schedules.dragHoveredTeacher,
    setDragHoveredTeacher: schedules.setDragHoveredTeacher,
    dragHoveredInstrument: schedules.dragHoveredInstrument,
    setDragHoveredInstrument: schedules.setDragHoveredInstrument,
    activeContextMenu: schedules.activeContextMenu,
    setActiveContextMenu: schedules.setActiveContextMenu,
    schedulesSidebarTab: schedules.schedulesSidebarTab,
    setSchedulesSidebarTab: schedules.setSchedulesSidebarTab,
    sidebarTeacherSearch: schedules.sidebarTeacherSearch,
    setSidebarTeacherSearch: schedules.setSidebarTeacherSearch,
    handleDragStartMatrix: schedules.handleDragStartMatrix,
    handleDropOnMatrix: schedules.handleDropOnMatrix,
    handleApproveAllPendingSchedules: schedules.handleApproveAllPendingSchedules,
    handleRejectTeacherDayPlan: schedules.handleRejectTeacherDayPlan,
    handleSaveAndApproveAll: schedules.handleSaveAndApproveAll,
    handleMergePlans: schedules.handleMergePlans,
    handleSplitPlan: schedules.handleSplitPlan,
    runAutoRoomAllocation: schedules.runAutoRoomAllocation,
    getPlanDisplayName: schedules.getPlanDisplayName,
    getSplitPoints: schedules.getSplitPoints,

    // Ad-hoc Bookings & Live View
    schedulesRoomsViewMode,
    setSchedulesRoomsViewMode,
    liveViewDay,
    setLiveViewDay,
    showAdHocBooking,
    setShowAdHocBooking,
    adHocRoomId,
    setAdHocRoomId,
    adHocStartTime,
    setAdHocStartTime,
    adHocDuration,
    setAdHocDuration,
    adHocTeacherId,
    setAdHocTeacherId,
    adHocStudentName,
    setAdHocStudentName,

    // Settings & Status
    subjects: dashboardData.subjects,
    activeSubjectsList: dashboardData.activeSubjectsList,
    schoolEvents: dashboardData.schoolEvents,
    activeCampusSettingsModal: extendedSettings.activeCampusSettingsModal,
    setActiveCampusSettingsModal: extendedSettings.setActiveCampusSettingsModal,
    campusScheduleSlotMinutes: extendedSettings.campusScheduleSlotMinutes,
    setCampusScheduleSlotMinutes: extendedSettings.setCampusScheduleSlotMinutes,
    campusScheduleConflictWarning: extendedSettings.campusScheduleConflictWarning,
    setCampusScheduleConflictWarning: extendedSettings.setCampusScheduleConflictWarning,
    campusHomeworkNotesSync: extendedSettings.campusHomeworkNotesSync,
    setCampusHomeworkNotesSync: extendedSettings.setCampusHomeworkNotesSync,
    campusParentChatEnabled: extendedSettings.campusParentChatEnabled,
    setCampusParentChatEnabled: extendedSettings.setCampusParentChatEnabled,
    campusParentAbsenceNotify: extendedSettings.campusParentAbsenceNotify,
    setCampusParentAbsenceNotify: extendedSettings.setCampusParentAbsenceNotify,
    campusMeisterwerkEnabled: extendedSettings.campusMeisterwerkEnabled,
    setCampusMeisterwerkEnabled: extendedSettings.setCampusMeisterwerkEnabled,
    campusAudioMaxSessionMinutes: extendedSettings.campusAudioMaxSessionMinutes,
    setCampusAudioMaxSessionMinutes: extendedSettings.setCampusAudioMaxSessionMinutes,
    campusLoopstationBarsPause: extendedSettings.campusLoopstationBarsPause,
    setCampusLoopstationBarsPause: extendedSettings.setCampusLoopstationBarsPause,
    campusFocusTimerDefaultMin: extendedSettings.campusFocusTimerDefaultMin,
    campusKioskPinLength: extendedSettings.campusKioskPinLength,
    openingHours: settings.openingHours,
    simulatedToday: dashboardData.simulatedToday,
    billingPayer: licenses.billingPayer,
    studentBillingOption: licenses.studentBillingOption,
    hasCampusSub: licenses.hasCampusSub,
    hasGroovelabSub: licenses.hasGroovelabSub,
    isBillingBooked: licenses.isBillingBooked,
    lastBackupDate: settings.lastBackupDate,
    daysSinceLastBackup: settings.daysSinceLastBackup,
    showBackupAlert: settings.showBackupAlert,
    handleSaveSettingValue: settings.handleSaveSettingValue,
    handleToggleSetting: settings.handleToggleSetting
  };
}
