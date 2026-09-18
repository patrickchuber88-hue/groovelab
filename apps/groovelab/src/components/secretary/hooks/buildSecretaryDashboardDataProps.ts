import { UseSecretaryDashboardDataOptions } from './useSecretaryDashboardData';

export interface BuildSecretaryDashboardDataOptions {
  schoolId: string;
  userId: string;
  userRole?: string;
  userRoles?: string[];
  currentUserProfile: any;
  setCurrentUserProfile: (profile: any) => void;
  currentSchoolProfile: any;
  setCurrentSchoolProfile: (profile: any) => void;
  settings: any;
  extendedSettings: any;
  licenses: any;
  staff: any;
  studentsHook: any;
  bookings: any;
  schedules: any;
  equipment: any;
  announcements: any;
  liveLab: any;
  rooms: any[];
  setRooms: React.Dispatch<React.SetStateAction<any[]>>;
  subjects: any[];
  setSubjects: React.Dispatch<React.SetStateAction<any[]>>;
  userMap: Record<string, string>;
  setUserMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCoaches: (coaches: any[]) => void;
  setCampusTeachers: (teachers: any[]) => void;
  setAllTeachers: (teachers: any[]) => void;
  setBypassTeachers: (teachers: any[]) => void;
  setIsAvvSigned: (val: boolean) => void;
  setEnabledCampusSubjects: (val: boolean) => void;
  setEnabledCampusRooms: (val: boolean) => void;
  setEnabledCampusEvents: (val: boolean) => void;
  setEnabledCampusSchedules: (val: boolean) => void;
  setEnabledCalendarWidget: (val: boolean) => void;
  setEnabledQrLogin: (val: boolean) => void;
  setTeachersManageStudents: (val: boolean) => void;
  setTeachersManageTeachers: (val: boolean) => void;
  setCampusTeachersManageStudents: (val: boolean) => void;
  setCampusTeachersManageTeachers: (val: boolean) => void;
}

/**
 * Type-safe builder assembling the parameters for useSecretaryDashboardData.
 * Binds sub-hooks and states cleanly without polluting the main coordinator shell.
 */
export function buildSecretaryDashboardDataProps(options: BuildSecretaryDashboardDataOptions): UseSecretaryDashboardDataOptions {
  const {
    schoolId,
    userId,
    userRole,
    userRoles,
    currentUserProfile,
    setCurrentUserProfile,
    currentSchoolProfile,
    setCurrentSchoolProfile,
    settings,
    extendedSettings,
    licenses,
    staff,
    studentsHook,
    bookings,
    schedules,
    equipment,
    announcements,
    liveLab,
    rooms,
    setRooms,
    subjects,
    setSubjects,
    userMap,
    setUserMap,
    setCoaches,
    setCampusTeachers,
    setAllTeachers,
    setBypassTeachers,
    setIsAvvSigned,
    setEnabledCampusSubjects,
    setEnabledCampusRooms,
    setEnabledCampusEvents,
    setEnabledCampusSchedules,
    setEnabledCalendarWidget,
    setEnabledQrLogin,
    setTeachersManageStudents,
    setTeachersManageTeachers,
    setCampusTeachersManageStudents,
    setCampusTeachersManageTeachers
  } = options;

  return {
    schoolId: schoolId || '',
    userId: userId || '',
    userRole,
    userRoles,
    schoolName: settings.schoolName || '',
    currentUserProfile,
    setCurrentUserProfile,
    currentSchoolProfile,
    setCurrentSchoolProfile,
    rooms,
    setRooms,
    subjects,
    setSubjects,
    userMap,
    setUserMap,
    schoolEquipment: equipment.schoolEquipment || [],
    setSchoolEquipment: equipment.setSchoolEquipment || (() => {}),
    schoolInvoices: licenses.schoolInvoices || [],
    setSchoolInvoices: licenses.setSchoolInvoices || (() => {}),
    fetchPendingBookings: bookings.fetchPendingBookings || (() => {}),
    fetchTariffBookings: licenses.fetchTariffBookings || (() => {}),
    fetchRoomIssues: bookings.fetchRoomIssues || (async () => {}),
    fetchAnnouncements: announcements.fetchAnnouncements || (async () => {}),
    fetchLiveStatusData: liveLab.fetchLiveStatusData || (async () => {}),
    showRealtimeNotification: liveLab.showRealtimeNotification || (() => {}),
    initSettingsFromSchool: settings.initSettingsFromSchool || (() => {}),
    initBillingFromSchool: licenses.initBillingFromSchool || (() => {}),
    handleDeleteExpiredStudents: studentsHook.handleDeleteExpiredStudents || (() => {}),
    setStudents: studentsHook.setStudents || (() => {}),
    setFrozenStudents: studentsHook.setFrozenStudents || (() => {}),
    setCoaches,
    setCampusTeachers,
    setAllTeachers,
    setBypassTeachers,
    setEmployees: staff.setEmployees || (() => {}),
    setPendingSchedules: schedules.setPendingSchedules || (() => {}),
    setMatrixAllocations: schedules.setMatrixAllocations || (() => {}),
    setUnsubmittedTeachers: schedules.setUnsubmittedTeachers || (() => {}),
    setActiveSessions: liveLab.setActiveSessions || (() => {}),
    setHelpRequests: liveLab.setHelpRequests || (() => {}),
    setTickets: liveLab.setTickets || (() => {}),
    setSelectedRoomId: schedules.setSelectedRoomId || (() => {}),
    selectedRoomId: schedules.selectedRoomId || null,
    setIsAvvSigned,
    setSchoolName: settings.setSchoolName || (() => {}),
    setSchoolStreet: settings.setSchoolStreet || (() => {}),
    setSchoolHouseNumber: settings.setSchoolHouseNumber || (() => {}),
    setSchoolZipCode: settings.setSchoolZipCode || (() => {}),
    setSchoolCity: settings.setSchoolCity || (() => {}),
    setSchoolPhoneNumber: settings.setSchoolPhoneNumber || (() => {}),
    setSchoolEmail: settings.setSchoolEmail || (() => {}),
    setAbsenceEmail: settings.setAbsenceEmail || (() => {}),
    setSchoolSubdomain: settings.setSchoolSubdomain || (() => {}),
    setOpeningHours: settings.setOpeningHours || (() => {}),
    setEditColor: () => {},
    setIsSchoolTrial: licenses.setIsSchoolTrial || (() => {}),
    setSchoolTrialEndsAt: licenses.setSchoolTrialEndsAt || (() => {}),
    setSchoolStatus: licenses.setSchoolStatus || (() => {}),
    setSubscriptionBypass: licenses.setSubscriptionBypass || (() => {}),
    setSelectedStorageAddonGb: licenses.setSelectedStorageAddonGb || (() => {}),
    setSelectedStorageAddonFee: licenses.setSelectedStorageAddonFee || (() => {}),
    setKioskToken: extendedSettings.setKioskToken || (() => {}),
    setCampusToken: extendedSettings.setCampusToken || (() => {}),
    setAllowMessagesGlobal: extendedSettings.setAllowMessagesGlobal || (() => {}),
    setEnabledCampusSubjects,
    setEnabledCampusRooms,
    setEnabledCampusEvents,
    setEnabledCampusSchedules,
    setEnabledCalendarWidget,
    setEnabledQrLogin,
    setTeachersManageStudents,
    setTeachersManageTeachers,
    setCampusTeachersManageStudents,
    setCampusTeachersManageTeachers,
    setCampusHomeworkNotesSync: extendedSettings.setCampusHomeworkNotesSync || (() => {}),
    setCampusMeisterwerkEnabled: extendedSettings.setCampusMeisterwerkEnabled || (() => {}),
    setCampusFocusTimerDefaultMin: extendedSettings.setCampusFocusTimerDefaultMin || (() => {}),
    setCampusFocusTimerXpFactor: extendedSettings.setCampusFocusTimerXpFactor || (() => {}),
    setCampusLoopstationBarsPause: extendedSettings.setCampusLoopstationBarsPause || (() => {}),
    setCampusAudioMaxSessionMinutes: extendedSettings.setCampusAudioMaxSessionMinutes || (() => {}),
    setCampusScheduleSlotMinutes: extendedSettings.setCampusScheduleSlotMinutes || (() => {}),
    setCampusScheduleConflictWarning: extendedSettings.setCampusScheduleConflictWarning || (() => {}),
    setCampusParentAbsenceNotify: extendedSettings.setCampusParentAbsenceNotify || (() => {}),
    setCampusParentChatEnabled: extendedSettings.setCampusParentChatEnabled || (() => {}),
    setCampusParentStatsEnabled: extendedSettings.setCampusParentStatsEnabled || (() => {}),
    setCampusKioskPinLength: extendedSettings.setCampusKioskPinLength || (() => {}),
    setCampusKioskAutoLogoutMinutes: extendedSettings.setCampusKioskAutoLogoutMinutes || (() => {}),
    setGlMaxBandMembers: extendedSettings.setGlMaxBandMembers || (() => {}),
    setGlAllowStudentBandCreation: extendedSettings.setGlAllowStudentBandCreation || (() => {}),
    setGlSongLevelStarterEnabled: extendedSettings.setGlSongLevelStarterEnabled || (() => {}),
    setGlSongLevelProEnabled: extendedSettings.setGlSongLevelProEnabled || (() => {}),
    setGlSongLevelMasterEnabled: extendedSettings.setGlSongLevelMasterEnabled || (() => {}),
    setGlSongProposalWorkflow: extendedSettings.setGlSongProposalWorkflow || (() => {}),
    setGlLiveDefaultBpm: extendedSettings.setGlLiveDefaultBpm || (() => {}),
    setGlLiveCountInBars: extendedSettings.setGlLiveCountInBars || (() => {}),
    setGlLiveStageDisplayEnabled: extendedSettings.setGlLiveStageDisplayEnabled || (() => {}),
    setGlSkillRadarTiming: extendedSettings.setGlSkillRadarTiming || (() => {}),
    setGlSkillRadarTechnique: extendedSettings.setGlSkillRadarTechnique || (() => {}),
    setGlSkillRadarSound: extendedSettings.setGlSkillRadarSound || (() => {}),
    setGlSkillRadarRepertoire: extendedSettings.setGlSkillRadarRepertoire || (() => {}),
    setGlSkillRadarTeamplay: extendedSettings.setGlSkillRadarTeamplay || (() => {}),
    setGlMusicianAvatarsEnabled: extendedSettings.setGlMusicianAvatarsEnabled || (() => {}),
    setGlBandCoatOfArmsEnabled: extendedSettings.setGlBandCoatOfArmsEnabled || (() => {}),
    setGlBandChatEnabled: extendedSettings.setGlBandChatEnabled || (() => {}),
    setGlCoachModerationRequired: extendedSettings.setGlCoachModerationRequired || (() => {}),
    setGlJamRecordingCompression: extendedSettings.setGlJamRecordingCompression || (() => {})
  };
}
