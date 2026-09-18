import React from 'react';
import type { SecretaryGroovelabTabProps } from './SecretaryGroovelabTab';

export interface BuildSecretaryGroovelabPropsParams {
  schoolId: string;
  userId?: string;
  showRealNames?: boolean;
  activePlatform?: string;

  // Navigation & Shell
  navigation: any;

  // Hook Bundles
  settings: any;
  extendedSettings: any;
  staff: any;
  studentsHook: any;
  liveLab: any;
  dashboardData: any;

  // Teachers (State from SecretaryDashboard)
  campusTeachers?: any[];
  allTeachers?: any[];
  coaches?: any[];
  bypassTeachers?: any[];

  // Permissions & Toggles
  teachersManageStudents: boolean;
  setTeachersManageStudents: React.Dispatch<React.SetStateAction<boolean>>;
  teachersManageTeachers: boolean;
  setTeachersManageTeachers: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFeedbackModalOpen: (open: boolean) => void;
}

/**
 * Builds the complete, type-safe prop tree for SecretaryGroovelabTab
 * reducing prop sprawl in SecretaryDashboard.tsx while maintaining Goldstandard isolation.
 */
export function buildSecretaryGroovelabProps(
  params: BuildSecretaryGroovelabPropsParams
): SecretaryGroovelabTabProps {
  const {
    schoolId,
    userId,
    showRealNames = true,
    activePlatform,
    navigation,
    settings,
    extendedSettings,
    staff,
    studentsHook,
    liveLab,
    dashboardData,
    teachersManageStudents,
    setTeachersManageStudents,
    teachersManageTeachers,
    setTeachersManageTeachers,
    setIsFeedbackModalOpen
  } = params;

  return {
    groovelabSubTab: navigation.groovelabSubTab,
    activePlatform,
    schoolId,
    userId,
    showRealNames,
    windowWidth: navigation.windowWidth,
    windowHeight: navigation.windowHeight,
    containerWidth: navigation.containerWidth,
    containerRef: navigation.containerRef,
    zoomFactor: liveLab.zoomFactor,
    handleZoomChange: liveLab.handleZoomChange,

    // Rooms & Stations (Live Blueprint)
    rooms: dashboardData.rooms,
    stations: dashboardData.stations,
    selectedRoomId: liveLab.selectedRoomId,
    setSelectedRoomId: liveLab.setSelectedRoomId,
    activeSessions: dashboardData.activeSessions,
    helpRequests: dashboardData.helpRequests,
    holidayXpActive: liveLab.holidayXpActive,
    handleToggleHolidayXp: liveLab.handleToggleHolidayXp,
    handleLogoutStudent: liveLab.handleLogoutStudent,

    // Students & Bands
    students: studentsHook.students,
    bands: dashboardData.bands,
    teachersManageStudents,
    setTeachersManageStudents,
    groovelabStudentSearchQuery: studentsHook.groovelabStudentSearchQuery,
    setGroovelabStudentSearchQuery: studentsHook.setGroovelabStudentSearchQuery,
    groovelabStudentFilterInstrument: studentsHook.groovelabStudentFilterInstrument,
    setGroovelabStudentFilterInstrument: studentsHook.setGroovelabStudentFilterInstrument,
    handleToggleStudentModule: studentsHook.handleToggleStudentModule,
    setSelectedStudentForDetail: studentsHook.setSelectedStudentForDetail,
    setShowAddStudentModal: studentsHook.setShowAddStudentModal,
    setNewStudentIsGroovelabActive: studentsHook.setNewStudentIsGroovelabActive,
    showAddGroovelabStudentModal: studentsHook.showAddGroovelabStudentModal,
    setShowAddGroovelabStudentModal: studentsHook.setShowAddGroovelabStudentModal,
    groovelabStudentModalSearchQuery: studentsHook.groovelabStudentModalSearchQuery,
    setGroovelabStudentModalSearchQuery: studentsHook.setGroovelabStudentModalSearchQuery,
    showManualCreateGroovelabStudent: studentsHook.showManualCreateGroovelabStudent,
    setShowManualCreateGroovelabStudent: studentsHook.setShowManualCreateGroovelabStudent,
    newStudentFirstName: studentsHook.newStudentFirstName,
    setNewStudentFirstName: studentsHook.setNewStudentFirstName,
    newStudentLastName: studentsHook.newStudentLastName,
    setNewStudentLastName: studentsHook.setNewStudentLastName,
    handleCreateStudentGroovelab: studentsHook.handleCreateStudentGroovelab,

    // Coaches (Teachers)
    coaches: params.coaches ?? staff?.coaches ?? [],
    campusTeachers: params.campusTeachers ?? staff?.campusTeachers ?? [],
    allTeachers: params.allTeachers ?? staff?.allTeachers ?? [],
    bypassTeachers: params.bypassTeachers ?? staff?.bypassTeachers ?? [],
    teachersManageTeachers,
    setTeachersManageTeachers,
    coachSearchQuery: staff.coachSearchQuery,
    setCoachSearchQuery: staff.setCoachSearchQuery,
    coachFilterInstrument: staff.coachFilterInstrument,
    setCoachFilterInstrument: staff.setCoachFilterInstrument,
    handleToggleTeacherModule: staff.handleToggleTeacherModule,
    setManageTeacher: staff.setManageTeacher,
    setSelectedCoachProfile: staff.setSelectedCoachProfile,
    showAddCoachModal: staff.showAddCoachModal,
    setShowAddCoachModal: staff.setShowAddCoachModal,
    coachModalSearchQuery: staff.coachModalSearchQuery,
    setCoachModalSearchQuery: staff.setCoachModalSearchQuery,
    showManualCreateCoach: staff.showManualCreateCoach,
    setShowManualCreateCoach: staff.setShowManualCreateCoach,
    setShowAddTeacherModal: staff.setShowAddTeacherModal,
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
    handleCreateCoachForGroovelab: staff.handleCreateCoachForGroovelab,
    activeSubjectsList: dashboardData.activeSubjectsList,

    // Settings & Toggles
    activeGroovelabSettingsModal: extendedSettings.activeGroovelabSettingsModal,
    setActiveGroovelabSettingsModal: extendedSettings.setActiveGroovelabSettingsModal,
    glMaxBandMembers: extendedSettings.glMaxBandMembers,
    setGlMaxBandMembers: extendedSettings.setGlMaxBandMembers,
    glAllowStudentBandCreation: extendedSettings.glAllowStudentBandCreation,
    setGlAllowStudentBandCreation: extendedSettings.setGlAllowStudentBandCreation,
    glSongLevelStarterEnabled: extendedSettings.glSongLevelStarterEnabled,
    setGlSongLevelStarterEnabled: extendedSettings.setGlSongLevelStarterEnabled,
    glSongLevelProEnabled: extendedSettings.glSongLevelProEnabled,
    setGlSongLevelProEnabled: extendedSettings.setGlSongLevelProEnabled,
    glSongLevelMasterEnabled: extendedSettings.glSongLevelMasterEnabled,
    setGlSongLevelMasterEnabled: extendedSettings.setGlSongLevelMasterEnabled,
    glSongProposalWorkflow: extendedSettings.glSongProposalWorkflow,
    setGlSongProposalWorkflow: extendedSettings.setGlSongProposalWorkflow,
    glLiveDefaultBpm: extendedSettings.glLiveDefaultBpm,
    setGlLiveDefaultBpm: extendedSettings.setGlLiveDefaultBpm,
    glLiveCountInBars: extendedSettings.glLiveCountInBars,
    setGlLiveCountInBars: extendedSettings.setGlLiveCountInBars,
    glLiveStageDisplayEnabled: extendedSettings.glLiveStageDisplayEnabled,
    setGlLiveStageDisplayEnabled: extendedSettings.setGlLiveStageDisplayEnabled,
    glSkillRadarTiming: extendedSettings.glSkillRadarTiming,
    setGlSkillRadarTiming: extendedSettings.setGlSkillRadarTiming,
    glSkillRadarTechnique: extendedSettings.glSkillRadarTechnique,
    setGlSkillRadarTechnique: extendedSettings.setGlSkillRadarTechnique,
    glSkillRadarSound: extendedSettings.glSkillRadarSound,
    setGlSkillRadarSound: extendedSettings.setGlSkillRadarSound,
    glSkillRadarRepertoire: extendedSettings.glSkillRadarRepertoire,
    setGlSkillRadarRepertoire: extendedSettings.setGlSkillRadarRepertoire,
    glSkillRadarTeamplay: extendedSettings.glSkillRadarTeamplay,
    setGlSkillRadarTeamplay: extendedSettings.setGlSkillRadarTeamplay,
    glMusicianAvatarsEnabled: extendedSettings.glMusicianAvatarsEnabled,
    setGlMusicianAvatarsEnabled: extendedSettings.setGlMusicianAvatarsEnabled,
    glBandCoatOfArmsEnabled: extendedSettings.glBandCoatOfArmsEnabled,
    setGlBandCoatOfArmsEnabled: extendedSettings.setGlBandCoatOfArmsEnabled,
    glBandChatEnabled: extendedSettings.glBandChatEnabled,
    setGlBandChatEnabled: extendedSettings.setGlBandChatEnabled,
    glJamRecordingCompression: extendedSettings.glJamRecordingCompression,
    setGlJamRecordingCompression: extendedSettings.setGlJamRecordingCompression,
    allowMessagesGlobal: extendedSettings.allowMessagesGlobal,
    handleToggleMessagesGlobal: extendedSettings.handleToggleMessagesGlobal,
    handleSaveSettingValue: settings.handleSaveSettingValue,
    handleToggleSetting: settings.handleToggleSetting,
    handleRegenerateTokens: extendedSettings.handleRegenerateTokens,
    setIsFeedbackModalOpen
  };
}
