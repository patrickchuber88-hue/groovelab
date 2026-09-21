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

const NOOP_FN = () => {};
const ASYNC_NOOP_FN = async () => {};

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
    setSchoolEquipment: equipment.setSchoolEquipment || NOOP_FN,
    schoolInvoices: licenses.schoolInvoices || [],
    setSchoolInvoices: licenses.setSchoolInvoices || NOOP_FN,
    fetchPendingBookings: bookings.fetchPendingBookings || NOOP_FN,
    fetchTariffBookings: licenses.fetchTariffBookings || NOOP_FN,
    fetchRoomIssues: bookings.fetchRoomIssues || ASYNC_NOOP_FN,
    fetchAnnouncements: announcements.fetchAnnouncements || ASYNC_NOOP_FN,
    fetchLiveStatusData: liveLab.fetchLiveStatusData || ASYNC_NOOP_FN,
    showRealtimeNotification: liveLab.showRealtimeNotification || NOOP_FN,
    initSettingsFromSchool: settings.initSettingsFromSchool || NOOP_FN,
    initBillingFromSchool: licenses.initBillingFromSchool || NOOP_FN,
    handleDeleteExpiredStudents: studentsHook.handleDeleteExpiredStudents || NOOP_FN,
    setStudents: studentsHook.setStudents || NOOP_FN,
    setFrozenStudents: studentsHook.setFrozenStudents || NOOP_FN,
    setCoaches,
    setCampusTeachers,
    setAllTeachers,
    setBypassTeachers,
    setEmployees: staff.setEmployees || NOOP_FN,
    setPendingSchedules: schedules.setPendingSchedules || NOOP_FN,
    setMatrixAllocations: schedules.setMatrixAllocations || NOOP_FN,
    setUnsubmittedTeachers: schedules.setUnsubmittedTeachers || NOOP_FN,
    setActiveSessions: liveLab.setActiveSessions || NOOP_FN,
    setHelpRequests: liveLab.setHelpRequests || NOOP_FN,
    setTickets: liveLab.setTickets || NOOP_FN,
    setSelectedRoomId: schedules.setSelectedRoomId || NOOP_FN,
    selectedRoomId: schedules.selectedRoomId || null,
    setIsAvvSigned,
    setSchoolName: settings.setSchoolName || NOOP_FN,
    setSchoolStreet: settings.setSchoolStreet || NOOP_FN,
    setSchoolHouseNumber: settings.setSchoolHouseNumber || NOOP_FN,
    setSchoolZipCode: settings.setSchoolZipCode || NOOP_FN,
    setSchoolCity: settings.setSchoolCity || NOOP_FN,
    setSchoolPhoneNumber: settings.setSchoolPhoneNumber || NOOP_FN,
    setSchoolEmail: settings.setSchoolEmail || NOOP_FN,
    setAbsenceEmail: settings.setAbsenceEmail || NOOP_FN,
    setSchoolSubdomain: settings.setSchoolSubdomain || NOOP_FN,
    setOpeningHours: settings.setOpeningHours || NOOP_FN,
    setEditColor: NOOP_FN,
    setIsSchoolTrial: licenses.setIsSchoolTrial || NOOP_FN,
    setSchoolTrialEndsAt: licenses.setSchoolTrialEndsAt || NOOP_FN,
    setSchoolStatus: licenses.setSchoolStatus || NOOP_FN,
    setSubscriptionBypass: licenses.setSubscriptionBypass || NOOP_FN,
    setSelectedStorageAddonGb: licenses.setSelectedStorageAddonGb || NOOP_FN,
    setSelectedStorageAddonFee: licenses.setSelectedStorageAddonFee || NOOP_FN,
    setKioskToken: extendedSettings.setKioskToken || NOOP_FN,
    setCampusToken: extendedSettings.setCampusToken || NOOP_FN,
    setAllowMessagesGlobal: extendedSettings.setAllowMessagesGlobal || NOOP_FN,
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
    setCampusHomeworkNotesSync: extendedSettings.setCampusHomeworkNotesSync || NOOP_FN,
    setCampusMeisterwerkEnabled: extendedSettings.setCampusMeisterwerkEnabled || NOOP_FN,
    setCampusFocusTimerDefaultMin: extendedSettings.setCampusFocusTimerDefaultMin || NOOP_FN,
    setCampusFocusTimerXpFactor: extendedSettings.setCampusFocusTimerXpFactor || NOOP_FN,
    setCampusLoopstationBarsPause: extendedSettings.setCampusLoopstationBarsPause || NOOP_FN,
    setCampusAudioMaxSessionMinutes: extendedSettings.setCampusAudioMaxSessionMinutes || NOOP_FN,
    setCampusScheduleSlotMinutes: extendedSettings.setCampusScheduleSlotMinutes || NOOP_FN,
    setCampusScheduleConflictWarning: extendedSettings.setCampusScheduleConflictWarning || NOOP_FN,
    setCampusParentAbsenceNotify: extendedSettings.setCampusParentAbsenceNotify || NOOP_FN,
    setCampusParentChatEnabled: extendedSettings.setCampusParentChatEnabled || NOOP_FN,
    setCampusParentStatsEnabled: extendedSettings.setCampusParentStatsEnabled || NOOP_FN,
    setCampusKioskPinLength: extendedSettings.setCampusKioskPinLength || NOOP_FN,
    setCampusKioskAutoLogoutMinutes: extendedSettings.setCampusKioskAutoLogoutMinutes || NOOP_FN,
    setGlMaxBandMembers: extendedSettings.setGlMaxBandMembers || NOOP_FN,
    setGlAllowStudentBandCreation: extendedSettings.setGlAllowStudentBandCreation || NOOP_FN,
    setGlSongLevelStarterEnabled: extendedSettings.setGlSongLevelStarterEnabled || NOOP_FN,
    setGlSongLevelProEnabled: extendedSettings.setGlSongLevelProEnabled || NOOP_FN,
    setGlSongLevelMasterEnabled: extendedSettings.setGlSongLevelMasterEnabled || NOOP_FN,
    setGlSongProposalWorkflow: extendedSettings.setGlSongProposalWorkflow || NOOP_FN,
    setGlLiveDefaultBpm: extendedSettings.setGlLiveDefaultBpm || NOOP_FN,
    setGlLiveCountInBars: extendedSettings.setGlLiveCountInBars || NOOP_FN,
    setGlLiveStageDisplayEnabled: extendedSettings.setGlLiveStageDisplayEnabled || NOOP_FN,
    setGlSkillRadarTiming: extendedSettings.setGlSkillRadarTiming || NOOP_FN,
    setGlSkillRadarTechnique: extendedSettings.setGlSkillRadarTechnique || NOOP_FN,
    setGlSkillRadarSound: extendedSettings.setGlSkillRadarSound || NOOP_FN,
    setGlSkillRadarRepertoire: extendedSettings.setGlSkillRadarRepertoire || NOOP_FN,
    setGlSkillRadarTeamplay: extendedSettings.setGlSkillRadarTeamplay || NOOP_FN,
    setGlMusicianAvatarsEnabled: extendedSettings.setGlMusicianAvatarsEnabled || NOOP_FN,
    setGlBandCoatOfArmsEnabled: extendedSettings.setGlBandCoatOfArmsEnabled || NOOP_FN,
    setGlBandChatEnabled: extendedSettings.setGlBandChatEnabled || NOOP_FN,
    setGlCoachModerationRequired: extendedSettings.setGlCoachModerationRequired || NOOP_FN,
    setGlJamRecordingCompression: extendedSettings.setGlJamRecordingCompression || NOOP_FN
  };
}
