/**
 * ==============================================================================
 * CAMPUS-GROOVELAB SECRETARY CAMPUS TAB
 * Monolith Goldstandard: Clean component isolation (< 3.000 LOC per tab)
 * Bounded Context: Campus Music School Operations (Module Color: Green #34a853)
 * ==============================================================================
 */

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import {
  Search, Filter, Plus, ChevronRight, Check, X, Users, Settings, UserPlus,
  BookOpen, DoorOpen, Calendar, Sliders, LayoutDashboard, AlertCircle, Clock,
  ShieldCheck, ShieldAlert, Cpu, HardDrive, Zap, Trash2, Download, Eye, EyeOff,
  Music, Lock, Key, QrCode, GraduationCap, ClipboardList, FileText, CheckCircle,
  BarChart2, LayoutGrid, Info, Activity, Lightbulb
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { SecretaryStudentsView } from '../SecretaryStudentsView';
import { SecretarySubjectsView } from '../SecretarySubjectsView';
import { CampusEventsBoard } from '../../CampusEventsBoard';
import { AdminDashboard } from '../../AdminDashboard';
import { AppleStyleTokenField } from '../../common/AppleStyleTokenField';
import { useRealNamesVisibility, maskLastName } from '../../../utils/nameHelper';
import { getAlphabeticalHue } from '../../../utils/adminColorHelpers';
import { DEFAULT_FOKUS_LEVELS } from '../../../utils/studentProgressEngine';

const getAlphabeticalColor = (name: string) => {
  const trimmed = (name || '').trim();
  if (trimmed.toLowerCase() === 'ohne zuweisung') {
    return {
      avatarBg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      avatarColor: '#475569'
    };
  }
  const hue = getAlphabeticalHue(trimmed);
  const avatarBg = `linear-gradient(135deg, hsl(${hue}, 85%, 94%) 0%, hsl(${hue}, 80%, 84%) 100%)`;
  const avatarColor = `hsl(${hue}, 90%, 25%)`;
  return { avatarBg, avatarColor };
};

export interface SecretaryCampusTabProps {
  campusSubTab: 'briefing' | 'onboarding' | 'subjects' | 'students' | 'rooms' | 'events' | 'schedules' | 'status';
  setCampusSubTab: React.Dispatch<React.SetStateAction<any>> | ((tab: any) => void);
  setSecretarySubTab: React.Dispatch<React.SetStateAction<any>> | ((subTab: any) => void);
  activePlatform?: string;
  schoolId: string;
  userId?: string;
  userRole?: string;
  userRoles?: string[];
  showRealNames?: boolean;
  windowWidth: number;
  onLogout?: () => void;
  schoolName: string;
  currentSchoolProfile?: any;
  fetchDashboardData: () => Promise<void> | void;

  // Modals & Navigation triggers
  showAddTeacherModal: boolean;
  setShowAddTeacherModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAddStudentModal: boolean;
  setShowAddStudentModal: React.Dispatch<React.SetStateAction<boolean>>;
  showBulkImportModal: boolean;
  setShowBulkImportModal: React.Dispatch<React.SetStateAction<boolean>>;
  showBulkDeleteModal: boolean;
  setShowBulkDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  showGuidanceModal: boolean;
  setShowGuidanceModal: React.Dispatch<React.SetStateAction<boolean>>;
  guidanceInitialTab?: string;
  setGuidanceInitialTab: React.Dispatch<React.SetStateAction<any>>;
  showParentInfoSheetModal: boolean;
  setShowParentInfoSheetModal: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFeedbackModalOpen: (open: boolean) => void;
  manageTeacher?: any;
  setManageTeacher: (teacher: any) => void;
  selectedStudentForDetail?: any;
  setSelectedStudentForDetail: (student: any) => void;
  setSettingsTab: React.Dispatch<React.SetStateAction<any>>;
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

  // Onboarding & Teachers
  teachersManageTeachers: boolean;
  setTeachersManageTeachers: React.Dispatch<React.SetStateAction<boolean>>;
  campusTeachers: any[];
  allTeachers: any[];
  coaches: any[];
  bypassTeachers: any[];
  unsubmittedTeachers: any;
  teacherSearchQuery: string;
  setTeacherSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  teacherFilterInstrument: string;
  setTeacherFilterInstrument: React.Dispatch<React.SetStateAction<string>>;
  teacherStatusTab: 'all' | 'pending' | 'active' | 'inactive';
  setTeacherStatusTab: React.Dispatch<React.SetStateAction<any>>;
  newTeacherFirstName: string;
  setNewTeacherFirstName: React.Dispatch<React.SetStateAction<string>>;
  newTeacherLastName: string;
  setNewTeacherLastName: React.Dispatch<React.SetStateAction<string>>;
  newTeacherEmail: string;
  setNewTeacherEmail: React.Dispatch<React.SetStateAction<string>>;
  newTeacherInstrument: string;
  setNewTeacherInstrument: React.Dispatch<React.SetStateAction<string>>;
  newTeacherContractEndsAt: string;
  setNewTeacherContractEndsAt: React.Dispatch<React.SetStateAction<string>>;
  handleCreateTeacher: (e: React.FormEvent) => Promise<void> | void;
  handleImportTeachers: (e: React.FormEvent) => Promise<void> | void;
  handleToggleTeacherModule: (teacher: any, module: 'campus' | 'groovelab') => Promise<void> | void;
  handleUpdateTeacherInstrument: (teacherId: string, inst: string) => Promise<void> | void;
  handleGenerateInviteToken: (type: any, id?: any, name?: any) => Promise<void> | void;
  handleDownloadTeacherSchedule: (teacherId: string, teacherName?: any, instrument?: any) => void;
  handleDeleteUser: (userId: string, role?: string, name?: string) => Promise<void> | void;
  isCsvExpanded: boolean;
  setIsCsvExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  csvText: string;
  setCsvText: React.Dispatch<React.SetStateAction<string>>;
  expandedSidebarTeacherId: string | null;
  setExpandedSidebarTeacherId: React.Dispatch<React.SetStateAction<string | null>>;

  // Students
  students: any[];
  filteredStudents: any[];
  frozenStudents: any[];
  studentSearchQuery: string;
  setStudentSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  studentFilterTeacher: string;
  setStudentFilterTeacher: React.Dispatch<React.SetStateAction<string>>;
  studentFilterInstrument: string;
  setStudentFilterInstrument: React.Dispatch<React.SetStateAction<string>>;
  studentFilterStatus: string;
  setStudentFilterStatus: React.Dispatch<React.SetStateAction<any>>;
  studentCurrentPage: number;
  setStudentCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  studentPageSize: number;
  setStudentPageSize: React.Dispatch<React.SetStateAction<number>>;
  selectedStudentIds: string[];
  setSelectedStudentIds: React.Dispatch<React.SetStateAction<string[]>>;
  copiedStudentId: string | null;
  setCopiedStudentId: React.Dispatch<React.SetStateAction<string | null>>;
  newStudentFirstName: string;
  setNewStudentFirstName: React.Dispatch<React.SetStateAction<string>>;
  newStudentLastName: string;
  setNewStudentLastName: React.Dispatch<React.SetStateAction<string>>;
  newStudentNickname: string;
  setNewStudentNickname: React.Dispatch<React.SetStateAction<string>>;
  newStudentInstrument: string;
  setNewStudentInstrument: React.Dispatch<React.SetStateAction<string>>;
  newStudentTeacherId: string;
  setNewStudentTeacherId: React.Dispatch<React.SetStateAction<string>>;
  newStudentDuration: number;
  setNewStudentDuration: React.Dispatch<React.SetStateAction<number>>;
  newStudentIsAppUser: boolean;
  setNewStudentIsAppUser: React.Dispatch<React.SetStateAction<boolean>>;
  newStudentIsCampusActive: boolean;
  setNewStudentIsCampusActive: React.Dispatch<React.SetStateAction<boolean>>;
  newStudentIsGroovelabActive: boolean;
  setNewStudentIsGroovelabActive: React.Dispatch<React.SetStateAction<boolean>>;
  handleCreateStudentCampus: (e?: any) => Promise<void> | void;
  handleDeleteStudentCampus: (id: string, name: string) => Promise<void> | void;
  handleToggleStudentModule: (student: any, module: 'campus' | 'groovelab') => Promise<void> | void;
  handleUpdateStudentTeacher: (studentId: string, teacherId: string | null) => Promise<void> | void;
  handleBatchImportStudents: (e?: any) => Promise<void> | void;
  isStudentCsvExpanded: boolean;
  setIsStudentCsvExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  studentCsvText: string;
  setStudentCsvText: React.Dispatch<React.SetStateAction<string>>;
  isImportingStudentsBatch: boolean;
  setIsImportingStudentsBatch: React.Dispatch<React.SetStateAction<boolean>>;
  bulkDeleteStep: number;
  setBulkDeleteStep: React.Dispatch<React.SetStateAction<any>>;
  bulkDeletePin: string;
  setBulkDeletePin: React.Dispatch<React.SetStateAction<string>>;

  // Schedules (Matrix & Allocation)
  pendingSchedules: any[];
  rooms: any[];
  matrixAllocations: any[];
  setMatrixAllocations: React.Dispatch<React.SetStateAction<any[]>>;
  selectedFilterTeacherId: string | null;
  setSelectedFilterTeacherId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedDayPlan: any;
  setSelectedDayPlan: React.Dispatch<React.SetStateAction<any>>;
  showOnlyPendingReviews: boolean;
  setShowOnlyPendingReviews: React.Dispatch<React.SetStateAction<boolean>>;
  isSavingApproval: boolean;
  isApprovingAllSchedules: boolean;
  draggedPlanId: string | null;
  setDraggedPlanId: React.Dispatch<React.SetStateAction<string | null>>;
  draggedPlanDay: number | null;
  setDraggedPlanDay: React.Dispatch<React.SetStateAction<number | null>>;
  dragOverCell: { roomId: string | null; day: number | null };
  setDragOverCell: React.Dispatch<React.SetStateAction<{ roomId: string | null; day: number | null }>>;
  dragHoveredTeacher: string | null;
  setDragHoveredTeacher: React.Dispatch<React.SetStateAction<string | null>>;
  dragHoveredInstrument: string | null;
  setDragHoveredInstrument: React.Dispatch<React.SetStateAction<string | null>>;
  activeContextMenu: any;
  setActiveContextMenu: React.Dispatch<React.SetStateAction<any>>;
  schedulesSidebarTab: 'submissions' | 'stats';
  setSchedulesSidebarTab: React.Dispatch<React.SetStateAction<'submissions' | 'stats'>>;
  sidebarTeacherSearch: string;
  setSidebarTeacherSearch: React.Dispatch<React.SetStateAction<string>>;
  handleDragStartMatrix: (e: React.DragEvent, planId: string, day?: any) => void;
  handleDropOnMatrix: (e: React.DragEvent, targetRoomId: string | null, dayOrTime: any) => void;
  handleApproveAllPendingSchedules: () => Promise<void> | void;
  handleRejectTeacherDayPlan: (plan: any) => Promise<void> | void;
  handleSaveAndApproveAll: (flag?: boolean) => Promise<void> | void;
  handleMergePlans: (plan1: any, plan2?: any) => Promise<void> | void;
  handleSplitPlan: (plan: any, splitIdx: number) => Promise<void> | void;
  runAutoRoomAllocation: () => void;
  getPlanDisplayName: (plan: any) => string;
  getSplitPoints: (plan: any) => Array<{ index: number; time: string; duration: number }>;

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

  // Settings & Status
  subjects: any[];
  activeSubjectsList: string[];
  schoolEvents: any[];
  activeCampusSettingsModal: string | null;
  setActiveCampusSettingsModal: React.Dispatch<React.SetStateAction<any>>;
  campusScheduleSlotMinutes: number;
  setCampusScheduleSlotMinutes: React.Dispatch<React.SetStateAction<number>>;
  campusScheduleConflictWarning: boolean;
  setCampusScheduleConflictWarning: React.Dispatch<React.SetStateAction<boolean>>;
  campusHomeworkNotesSync: boolean;
  setCampusHomeworkNotesSync: React.Dispatch<React.SetStateAction<boolean>>;
  campusParentChatEnabled: boolean;
  setCampusParentChatEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  campusParentAbsenceNotify: boolean;
  setCampusParentAbsenceNotify: React.Dispatch<React.SetStateAction<boolean>>;
  campusMeisterwerkEnabled: boolean;
  setCampusMeisterwerkEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  campusAudioMaxSessionMinutes: number;
  setCampusAudioMaxSessionMinutes: React.Dispatch<React.SetStateAction<number>>;
  campusLoopstationBarsPause: number;
  setCampusLoopstationBarsPause: React.Dispatch<React.SetStateAction<number>>;
  campusFocusTimerDefaultMin: number;
  campusKioskPinLength: number;
  openingHours: any;
  simulatedToday: string;
  billingPayer: string;
  studentBillingOption: string;
  hasCampusSub: boolean;
  hasGroovelabSub: boolean;
  isBillingBooked: boolean;
  lastBackupDate: string | null;
  daysSinceLastBackup: number | null;
  showBackupAlert: boolean;
  handleSaveSettingValue: (key: string, val: any, setter?: any) => Promise<void>;
  handleToggleSetting: (key: string, currentVal: boolean, setter: (v: boolean) => void) => Promise<void>;
}

export const SecretaryCampusTab: React.FC<SecretaryCampusTabProps> = ({
  campusSubTab,
  setCampusSubTab,
  setSecretarySubTab,
  activePlatform,
  schoolId,
  userId,
  userRole,
  userRoles,
  showRealNames = true,
  windowWidth,
  onLogout,
  schoolName,
  currentSchoolProfile,
  fetchDashboardData,
  showAddTeacherModal,
  setShowAddTeacherModal,
  showAddStudentModal,
  setShowAddStudentModal,
  showBulkImportModal,
  setShowBulkImportModal,
  showBulkDeleteModal,
  setShowBulkDeleteModal,
  showGuidanceModal,
  setShowGuidanceModal,
  guidanceInitialTab,
  setGuidanceInitialTab,
  showParentInfoSheetModal,
  setShowParentInfoSheetModal,
  setIsFeedbackModalOpen,
  manageTeacher,
  setManageTeacher,
  selectedStudentForDetail,
  setSelectedStudentForDetail,
  setSettingsTab,
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
  campusTeachers,
  allTeachers,
  coaches,
  bypassTeachers,
  unsubmittedTeachers,
  teacherSearchQuery,
  setTeacherSearchQuery,
  teacherFilterInstrument,
  setTeacherFilterInstrument,
  teacherStatusTab,
  setTeacherStatusTab,
  newTeacherFirstName,
  setNewTeacherFirstName,
  newTeacherLastName,
  setNewTeacherLastName,
  newTeacherEmail,
  setNewTeacherEmail,
  newTeacherInstrument,
  setNewTeacherInstrument,
  newTeacherContractEndsAt,
  setNewTeacherContractEndsAt,
  handleCreateTeacher,
  handleImportTeachers,
  handleToggleTeacherModule,
  handleUpdateTeacherInstrument,
  handleGenerateInviteToken,
  handleDownloadTeacherSchedule,
  handleDeleteUser,
  isCsvExpanded,
  setIsCsvExpanded,
  csvText,
  setCsvText,
  expandedSidebarTeacherId,
  setExpandedSidebarTeacherId,
  students,
  filteredStudents,
  frozenStudents,
  studentSearchQuery,
  setStudentSearchQuery,
  studentFilterTeacher,
  setStudentFilterTeacher,
  studentFilterInstrument,
  setStudentFilterInstrument,
  studentFilterStatus,
  setStudentFilterStatus,
  studentCurrentPage,
  setStudentCurrentPage,
  studentPageSize,
  setStudentPageSize,
  selectedStudentIds,
  setSelectedStudentIds,
  copiedStudentId,
  setCopiedStudentId,
  newStudentFirstName,
  setNewStudentFirstName,
  newStudentLastName,
  setNewStudentLastName,
  newStudentNickname,
  setNewStudentNickname,
  newStudentInstrument,
  setNewStudentInstrument,
  newStudentTeacherId,
  setNewStudentTeacherId,
  newStudentDuration,
  setNewStudentDuration,
  newStudentIsAppUser,
  setNewStudentIsAppUser,
  newStudentIsCampusActive,
  setNewStudentIsCampusActive,
  newStudentIsGroovelabActive,
  setNewStudentIsGroovelabActive,
  handleCreateStudentCampus,
  handleDeleteStudentCampus,
  handleToggleStudentModule,
  handleUpdateStudentTeacher,
  handleBatchImportStudents,
  isStudentCsvExpanded,
  setIsStudentCsvExpanded,
  studentCsvText,
  setStudentCsvText,
  isImportingStudentsBatch,
  setIsImportingStudentsBatch,
  bulkDeleteStep,
  setBulkDeleteStep,
  bulkDeletePin,
  setBulkDeletePin,
  pendingSchedules,
  rooms,
  matrixAllocations,
  setMatrixAllocations,
  selectedFilterTeacherId,
  setSelectedFilterTeacherId,
  selectedDayPlan,
  setSelectedDayPlan,
  showOnlyPendingReviews,
  setShowOnlyPendingReviews,
  isSavingApproval,
  isApprovingAllSchedules,
  draggedPlanId,
  setDraggedPlanId,
  draggedPlanDay,
  setDraggedPlanDay,
  dragOverCell,
  setDragOverCell,
  dragHoveredTeacher,
  setDragHoveredTeacher,
  dragHoveredInstrument,
  setDragHoveredInstrument,
  activeContextMenu,
  setActiveContextMenu,
  schedulesSidebarTab,
  setSchedulesSidebarTab,
  sidebarTeacherSearch,
  setSidebarTeacherSearch,
  handleDragStartMatrix,
  handleDropOnMatrix,
  handleApproveAllPendingSchedules,
  handleRejectTeacherDayPlan,
  handleSaveAndApproveAll,
  handleMergePlans,
  handleSplitPlan,
  runAutoRoomAllocation,
  getPlanDisplayName,
  getSplitPoints,
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
  subjects,
  activeSubjectsList,
  schoolEvents,
  activeCampusSettingsModal,
  setActiveCampusSettingsModal,
  campusScheduleSlotMinutes,
  setCampusScheduleSlotMinutes,
  campusScheduleConflictWarning,
  setCampusScheduleConflictWarning,
  campusHomeworkNotesSync,
  setCampusHomeworkNotesSync,
  campusParentChatEnabled,
  setCampusParentChatEnabled,
  campusParentAbsenceNotify,
  setCampusParentAbsenceNotify,
  campusMeisterwerkEnabled,
  setCampusMeisterwerkEnabled,
  campusAudioMaxSessionMinutes,
  setCampusAudioMaxSessionMinutes,
  campusLoopstationBarsPause,
  setCampusLoopstationBarsPause,
  campusFocusTimerDefaultMin,
  campusKioskPinLength,
  openingHours,
  simulatedToday,
  billingPayer,
  studentBillingOption,
  hasCampusSub,
  hasGroovelabSub,
  isBillingBooked,
  lastBackupDate,
  daysSinceLastBackup,
  showBackupAlert,
  handleSaveSettingValue,
  handleToggleSetting,
}) => {
  const { toggleVisibility: toggleRealNames } = useRealNamesVisibility();
  return (
          <div className="campus-grid" style={(campusSubTab === 'briefing' || campusSubTab === 'events' || campusSubTab === 'rooms') ? { gridTemplateColumns: '1fr', gap: 0 } : {}}>
            
            {/* Left Content Pane (Main Board Content) */}
            <div style={{ flex: (campusSubTab === 'briefing' || campusSubTab === 'onboarding' || campusSubTab === 'students' || campusSubTab === 'events' || campusSubTab === 'rooms') ? '1' : '1.6', display: 'flex', flexDirection: 'column', gap: '24px', width: (campusSubTab === 'briefing' || campusSubTab === 'onboarding' || campusSubTab === 'students' || campusSubTab === 'events' || campusSubTab === 'rooms') ? '100%' : 'auto', minWidth: 0 }}>
              
              {/* Subtab: Startseite (Briefing) */}
              {campusSubTab === 'briefing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Apple Style Header Card */}
                  <div className="google-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.5rem' }}>🎓</span>
                      <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        Campus-Zentrale
                      </h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: '1.5', fontFamily: 'Inter' }}>
                      Willkommen in der Campus-Verwaltung. Hier koordinierst du die Lehrkräfte, das Onboarding neuer Kolleginnen und Kollegen sowie die Stundenplan-Freigaben für deine Musikschule.
                    </p>
                  </div>

                  {/* Backup Warning Banner (Campus Green Theme) */}
                  {showBackupAlert && (
                    <div style={{
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                      border: '1px solid #bbf7d0',
                      borderRadius: '16px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      boxShadow: '0 4px 12px -2px rgba(22, 163, 74, 0.08)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          background: '#dcfce7',
                          borderRadius: '12px',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #86efac'
                        }}>
                          <ShieldAlert size={20} style={{ color: '#34a853' }} />
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.84rem', color: '#14532d', marginBottom: '2px' }}>
                            Lokale Datensicherung empfohlen!
                          </strong>
                          <span style={{ fontSize: '0.76rem', color: '#166534', lineHeight: '1.3' }}>
                            {lastBackupDate 
                              ? `Dein letztes lokales Daten-Backup ist bereits ${daysSinceLastBackup} Tage alt. Bitte erstelle eine aktuelle Sicherungsdatei in den Einstellungen, um deine rechtlichen Mitwirkungspflichten zu erfüllen.`
                              : 'Es wurde noch kein lokales Daten-Backup heruntergeladen. Bitte erstelle eine Sicherungsdatei in den Einstellungen, um deine rechtlichen Mitwirkungspflichten zu erfüllen.'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSecretarySubTab('setup');
                          setSettingsTab('backup');
                        }}
                        style={{
                          background: '#34a853',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 12px rgba(19, 115, 51, 0.2)',
                          transition: 'transform 0.15s, background-color 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#14532d'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#34a853'}
                      >
                        Jetzt sichern
                      </button>
                    </div>
                  )}

                  {/* Sicherheitswarnung: Onboarding-Konflikte */}
                  {frozenStudents.length > 0 && (
                    <div style={{
                      background: '#fef2f2',
                      border: '1.5px solid #dc2626',
                      borderRadius: '20px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      boxShadow: '0 4px 20px rgba(220, 38, 38, 0.08)',
                      textAlign: 'left'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#991b1b', fontFamily: 'Outfit' }}>
                          Sicherheitswarnung: Onboarding-Konflikte ({frozenStudents.length})
                        </h4>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#7f1d1d', lineHeight: '1.4', fontFamily: 'Inter' }}>
                        Mehrere Schüler-Onboardings wurden von den Eltern als blockiert gemeldet. Die Profile wurden zum Schutz vor unbefugtem Zugriff automatisch eingefroren. Bitte verifiziere die Eltern und lasse ihnen den Einladungs-Link zukommen.
                      </p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {frozenStudents.map((stud) => (
                          <div key={stud.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#ffffff',
                            border: '1px solid #fee2e2',
                            padding: '10px 14px',
                            borderRadius: '12px'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <strong style={{ fontSize: '0.82rem', color: '#1e293b' }}>
                                {stud.first_name} {stud.last_name}
                              </strong>
                              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                Instrument: {stud.instrument}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleGenerateInviteToken(stud.id, `${stud.first_name} ${stud.last_name}`)}
                              style={{
                                padding: '8px 12px',
                                background: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Einladungs-Link kopieren
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Overdue Activation Invoice Alerts */}
                  {(() => {
                    const today = simulatedToday ? new Date(simulatedToday + 'T14:00:00') : new Date();
                    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                    const diffDays = Math.floor((today.getTime() - prevMonthEnd.getTime()) / (1000 * 60 * 60 * 24));
                    const isSchoolPaid = billingPayer === 'school' && (studentBillingOption === 'option2' || studentBillingOption === 'option3_2');
                    
                    if (isSchoolPaid && diffDays >= 11 && diffDays <= 20) {
                      return (
                        <div style={{
                          background: '#fffbeb',
                          border: '1.5px solid #f59e0b',
                          borderRadius: '20px',
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.04)'
                        }}>
                          <AlertCircle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                            <strong style={{ fontSize: '0.85rem', color: '#78350f', fontFamily: 'Urbanist' }}>
                              Zahlungserinnerung: Aktivierungs-Rechnung ausstehend
                            </strong>
                            <span style={{ fontSize: '0.78rem', color: '#b45309', fontFamily: 'Inter', lineHeight: '1.4' }}>
                              Die monatliche Aktivierungs-Rechnung ist seit über 10 Tagen überfällig. Bitte begleichen Sie den ausstehenden Betrag in den nächsten Tagen, um eine automatische Deaktivierung der betroffenen Schüler-Profile zu vermeiden.
                            </span>
                          </div>
                          <button
                            onClick={() => setSecretarySubTab('licenses')}
                            style={{
                              background: '#f59e0b',
                              color: 'white',
                              border: 'none',
                              padding: '8px 14px',
                              borderRadius: '10px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              fontFamily: 'Urbanist',
                              transition: 'all 0.2s'
                            }}
                          >
                            Jetzt begleichen
                          </button>
                        </div>
                      );
                    }
                    
                    if (isSchoolPaid && diffDays > 20) {
                      return (
                        <div style={{
                          background: '#fef2f2',
                          border: '1.5px solid #ef4444',
                          borderRadius: '20px',
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)'
                        }}>
                          <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                            <strong style={{ fontSize: '0.85rem', color: '#991b1b', fontFamily: 'Urbanist' }}>
                              Zahlungsverzug: Schüler-Profile deaktiviert
                            </strong>
                            <span style={{ fontSize: '0.78rem', color: '#b91c1c', fontFamily: 'Inter', lineHeight: '1.4' }}>
                              Aufgrund des anhaltenden Zahlungsverzugs (über 20 Tage) wurden die betroffenen Schüler-Accounts temporär in den inaktiven Modus versetzt. Nach Begleichung der Rechnung werden alle Profile sofort wieder freigeschaltet.
                            </span>
                          </div>
                          <button
                            onClick={() => setSecretarySubTab('licenses')}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '8px 14px',
                              borderRadius: '10px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              fontFamily: 'Urbanist',
                              transition: 'all 0.2s'
                            }}
                          >
                            Rechnung ausgleichen
                          </button>
                        </div>
                      );
                    }
                    
                    return null;
                  })()}

                  {(() => {
                    const allUniqueTeachers = [...(campusTeachers || []), ...(bypassTeachers || []), ...(coaches || [])].reduce((acc: any[], t: any) => {
                      if (!acc.some(existing => existing.id === t.id)) {
                        acc.push(t);
                      }
                      return acc;
                    }, []);
                    const activeStudents = students.filter(s => s.is_campus_active || s.is_groovelab_active).length;
                    const pendingStudents = students.filter(s => !(s.is_campus_active || s.is_groovelab_active)).length;
                    const trialStudents = students.filter(s => s.is_trial && s.trial_ends_at && new Date(s.trial_ends_at).getTime() > Date.now());
                    const activeSubjects = subjects.filter(s => s.name.toLowerCase() !== 'ohne zuweisung').length;

                    const activeTeachersCount = allUniqueTeachers.filter(t => t.isPinActivated).length;
                    const pendingTeachersCount = allUniqueTeachers.filter(t => !t.isPinActivated).length;

                    const kpis = [
                      enabledCampusSubjects && {
                        id: 'subjects',
                        label: 'Unterrichtsfächer',
                        value: `${activeSubjects} Fächer`,
                        details: 'Aktive Unterrichtsangebote',
                        icon: BookOpen,
                        iconBg: '#eff6ff',
                        iconColor: '#1d4ed8',
                      },
                      {
                        id: 'onboarding',
                        label: 'Lehrkräfte',
                        value: `${activeTeachersCount} Aktiv`,
                        details: `${pendingTeachersCount} im Onboarding/Bypass`,
                        icon: GraduationCap,
                        iconBg: '#e6f4ea',
                        iconColor: '#34a853',
                      },
                      {
                        id: 'students',
                        label: 'Schüler',
                        value: `${activeStudents} Aktiv`,
                        details: `${pendingStudents} ausstehend`,
                        icon: Users,
                        iconBg: '#fdf2f8',
                        iconColor: '#db2777',
                      },
                      enabledCampusRooms && {
                        id: 'rooms',
                        label: 'Räume',
                        value: `${rooms.length} Räume`,
                        details: 'Konfigurierte Unterrichtsräume',
                        icon: DoorOpen,
                        iconBg: '#f0fdfa',
                        iconColor: '#34a853',
                      },
                      enabledCampusEvents && {
                        id: 'events',
                        label: 'Termine & News',
                        value: `${schoolEvents.length} Termine`,
                        details: 'Schulweite Ankündigungen',
                        icon: Calendar,
                        iconBg: '#fff1f2',
                        iconColor: '#e11d48',
                      },
                      enabledCampusSchedules && {
                        id: 'schedules',
                        label: 'Stundenpläne',
                        value: `${pendingSchedules.length} Review`,
                        details: pendingSchedules.length > 0 ? 'Dringende Freigaben ausstehend' : 'Alle Stundenpläne freigegeben',
                        icon: Calendar,
                        iconBg: pendingSchedules.length > 0 ? '#fef2f2' : '#e6f4ea',
                        iconColor: pendingSchedules.length > 0 ? '#991b1b' : '#34a853',
                        badge: pendingSchedules.length > 0 ? pendingSchedules.length : undefined,
                      },
                      {
                        id: 'status',
                        label: 'Einstellungen',
                        value: 'Konfiguration',
                        details: 'Module & System-Status',
                        icon: Sliders,
                        iconBg: '#f8fafc',
                        iconColor: '#475569',
                      }
                    ].filter(Boolean) as any[];

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* KPI Cards Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                          {kpis.map(kpi => {
                            const Icon = kpi.icon;
                            const isScheduleWarning = kpi.id === 'schedules' && pendingSchedules.length > 0;
                            return (
                              <div
                                key={kpi.id}
                                onClick={() => setCampusSubTab(kpi.id)}
                                className="google-card"
                                style={{
                                  padding: '20px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px',
                                  border: isScheduleWarning ? '1px solid rgba(220, 38, 38, 0.2) !important' : '1px solid rgba(255, 255, 255, 0.5) !important',
                                  background: isScheduleWarning ? 'linear-gradient(135deg, rgba(254, 242, 242, 0.8) 0%, rgba(254, 242, 242, 0.4) 100%) !important' : undefined
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '12px',
                                    background: kpi.iconBg,
                                    color: kpi.iconColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <Icon size={20} />
                                  </div>
                                  {kpi.badge !== undefined && (
                                    <span style={{
                                      background: '#dc2626',
                                      color: '#ffffff',
                                      fontSize: '0.75rem',
                                      fontWeight: 900,
                                      padding: '2px 8px',
                                      borderRadius: '100px'
                                    }}>
                                      {kpi.badge}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {kpi.label}
                                  </span>
                                  <strong style={{ display: 'block', fontSize: '1.6rem', color: isScheduleWarning ? '#991b1b' : '#0f172a', marginTop: '4px', fontWeight: 900, fontFamily: 'Urbanist' }}>
                                    {kpi.value}
                                  </strong>
                                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginTop: '4px', fontWeight: 550, fontFamily: 'Inter', lineHeight: '1.3' }}>
                                    {kpi.details}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Single-Column Bottom Area */}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr', 
                          gap: '24px', 
                          alignItems: 'start' 
                        }}>
                          {/* Left Column: Notices */}
                          <div className="google-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <ClipboardList size={18} style={{ color: '#34a853' }} />
                              Wichtige Hinweise &amp; Aufgaben
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                <AlertCircle size={20} style={{ color: '#34a853', flexShrink: 0 }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <strong style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 800, fontFamily: 'Urbanist' }}>Stundenplan-Reviews:</strong>
                                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'Inter', lineHeight: '1.4' }}>
                                    Es stehen aktuell {pendingSchedules.length} Stundenpläne zur Review bereit. Bitte prüfe die Belegung, um Konflikte zu vermeiden.
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                <Key size={20} style={{ color: '#34a853', flexShrink: 0 }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <strong style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 800, fontFamily: 'Urbanist' }}>Lehrer-Bypass:</strong>
                                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'Inter', lineHeight: '1.4' }}>
                                    Es warten noch {bypassTeachers.length} Lehrkräfte auf ihre finale Aktivierung via Support-PIN.
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Subtab: Onboarding */}
              {campusSubTab === 'onboarding' && (() => {
                // Deduplicate teachers
                const allUniqueTeachers = [...(campusTeachers || []), ...(bypassTeachers || []), ...(coaches || [])].reduce((acc: any[], t: any) => {
                  if (!acc.some(existing => existing.id === t.id)) {
                    acc.push(t);
                  }
                  return acc;
                }, []);

                const uniqueInstruments = Array.from(new Set(allUniqueTeachers.map(t => t.instrument || 'Nicht festgelegt')));

                const filteredTeachers = allUniqueTeachers.filter((t: any) => {
                  const firstName = (t.firstName || t.first_name || '').toLowerCase();
                  const lastName = (t.lastName || t.last_name || '').toLowerCase();
                  const email = (t.email || '').toLowerCase();
                  const query = teacherSearchQuery.toLowerCase().trim();
                  
                  const matchesSearch = !query || firstName.includes(query) || lastName.includes(query) || email.includes(query);
                  
                  const isCampus = t.isCampusActive || t.is_campus_active;
                  const isActive = t.isActive ?? t.is_active;
                  const matchesStatus = teacherStatusTab === 'all' ||
                    (teacherStatusTab === 'active' && isCampus && isActive) ||
                    (teacherStatusTab === 'inactive' && !isActive);

                  const instrument = (t.instrument || 'Nicht festgelegt').toLowerCase();
                  const filterInst = teacherFilterInstrument.toLowerCase();
                  const matchesInstrument = teacherFilterInstrument === 'All' || instrument === filterInst;
                    
                  return matchesSearch && matchesStatus && matchesInstrument;
                });

                return (
                  <div className="google-card" style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '24px', 
                    width: '100%',
                    padding: '24px',
                    borderRadius: '24px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)'
                  }}>
                    {/* TITLE BLOCK & ACTIONS */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={22} style={{ color: '#0f172a' }} />
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                          Lehrerverwaltung ({allUniqueTeachers.length})
                        </h3>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setIsCsvExpanded(!isCsvExpanded)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            borderRadius: '12px', 
                            padding: '8px 16px', 
                            fontSize: '0.8rem', 
                            fontWeight: 800,
                            background: isCsvExpanded ? '#f1f5f9' : '#ffffff',
                            color: '#475569',
                            border: '1.5px solid #cbd5e1',
                            cursor: 'pointer',
                            fontFamily: 'Urbanist',
                            transition: 'all 0.2s'
                          }}
                        >
                          <FileText size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Sammel-Onboarding (CSV) ▼
                        </button>

                        <button
                          onClick={() => setShowAddTeacherModal(true)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            borderRadius: '12px', 
                            padding: '8px 16px', 
                            fontSize: '0.8rem', 
                            fontWeight: 800,
                            background: '#34a853',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: 'Urbanist',
                            boxShadow: '0 4px 10px rgba(52,168,83,0.15)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Plus size={15} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Lehrkraft anlegen
                        </button>
                      </div>
                    </div>

                    {/* Collapsible CSV Box */}
                    {isCsvExpanded && (
                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 900, fontFamily: 'Urbanist' }}>
                            Sammel-Onboarding (Lehrer)
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'Inter' }}>
                            Format pro Zeile: <code>Vorname; Nachname; Hauptinstrument (optional)</code>
                          </span>
                        </div>

                        {teacherFilterInstrument && teacherFilterInstrument !== 'All' && (() => {
                          const instName = teacherFilterInstrument;
                          const { avatarBg: instAvatarBg, avatarColor: instAvatarColor } = getAlphabeticalColor(instName);

                          return (
                            <div style={{
                              background: 'rgba(52, 168, 83, 0.03)',
                              border: '1.5px solid rgba(52, 168, 83, 0.12)',
                              borderRadius: '16px',
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              marginTop: '2px',
                              marginBottom: '2px',
                              flexWrap: 'wrap',
                              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                                <span style={{ fontSize: '0.68rem', color: '#34a853', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Urbanist' }}>
                                  <Zap size={14} style={{ marginRight: '6px', verticalAlign: 'middle', fill: '#34a853' }} /> Smart Auto-Zuweisung:
                                </span>

                                {/* Instrument Pill */}
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  background: '#ffffff',
                                  border: '1.5px solid #cbd5e1',
                                  padding: '4px 10px 4px 6px',
                                  borderRadius: '100px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                }}>
                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: instAvatarBg,
                                    color: instAvatarColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.65rem',
                                    fontWeight: 900,
                                    fontFamily: 'Urbanist'
                                  }}>
                                    {instName[0]?.toUpperCase() || 'I'}
                                  </div>
                                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                    {instName}
                                  </span>
                                  <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Instrument
                                  </span>
                                </div>
                              </div>
                              
                              <span style={{ fontSize: '0.65rem', color: '#34a853', fontWeight: 900, background: '#e6f4ea', padding: '4px 10px', borderRadius: '8px', letterSpacing: '0.02em', textTransform: 'uppercase', fontFamily: 'Urbanist' }}>
                                Hauptinstrument wird automatisch verknüpft!
                              </span>
                            </div>
                          );
                        })()}

                        <textarea
                          value={csvText}
                          onChange={(e) => setCsvText(e.target.value)}
                          placeholder={
                            teacherFilterInstrument && teacherFilterInstrument !== 'All'
                              ? "Markus; Weber\nAnna; Becker"
                              : "Markus; Weber; Gitarre\nAnna; Becker; Gesang"
                          }
                          style={{
                            width: '100%',
                            height: '100px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            padding: '10px',
                            fontSize: '0.78rem',
                            fontFamily: 'monospace',
                            outline: 'none',
                            resize: 'vertical'
                          }}
                        />
                        <button
                          onClick={handleImportTeachers}
                          className="google-btn-primary"
                          style={{ background: '#34a853', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, alignSelf: 'flex-start', cursor: 'pointer' }}
                        >
                          Lehrer importieren
                        </button>
                      </div>
                    )}

                    {/* FILTERS ROW */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1.5, minWidth: '240px' }}>
                        <input
                          type="text"
                          value={teacherSearchQuery}
                          onChange={(e) => setTeacherSearchQuery(e.target.value)}
                          placeholder="Lehrkraft nach Name oder E-Mail suchen..."
                          style={{
                            width: '100%',
                            padding: '10px 16px 10px 38px',
                            borderRadius: '14px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            fontFamily: 'Urbanist',
                            fontWeight: 600,
                            outline: 'none',
                            background: '#ffffff'
                          }}
                        />
                        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      </div>

                      <select
                        value={teacherFilterInstrument}
                        onChange={(e) => setTeacherFilterInstrument(e.target.value)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '14px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          fontFamily: 'Urbanist',
                          fontWeight: 600,
                          outline: 'none',
                          background: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="All">Alle Instrumente</option>
                        {uniqueInstruments.map(inst => (
                          <option key={inst} value={inst}>{inst}</option>
                        ))}
                      </select>

                      <select
                        value={teacherStatusTab}
                        onChange={(e) => setTeacherStatusTab(e.target.value as any)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '14px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          fontFamily: 'Urbanist',
                          fontWeight: 600,
                          outline: 'none',
                          background: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="all">Alle</option>
                        <option value="active">Aktiv (Campus)</option>
                        <option value="inactive">Inaktiv (Bypass)</option>
                      </select>
                    </div>

                    {/* DYNAMIC TEACHER LIST (HORIZONTAL ROWS) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowX: 'auto', width: '100%' }}>
                      <style>{`
                        .status-toggle-btn {
                          border: none;
                          padding: 5px 12px;
                          border-radius: 10px;
                          font-size: 0.74rem;
                          font-weight: 700;
                          min-width: 65px;
                          text-align: center;
                          cursor: pointer;
                          transition: all 0.2s ease;
                          font-family: 'Urbanist', sans-serif;
                        }
                        .status-toggle-btn:hover {
                          transform: scale(1.05);
                        }
                        .status-toggle-btn.campus-active {
                          background: #e6f4ea;
                          color: #34a853;
                          box-shadow: 0 2px 8px rgba(52,168,83,0.12);
                        }
                        .status-toggle-btn.campus-active:hover {
                          background: #d1f2dd !important;
                        }
                        .status-toggle-btn.campus-inactive {
                          background: #f5f5f7;
                          color: #86868b;
                        }
                        .status-toggle-btn.campus-inactive:hover {
                          background: #e9e9eb !important;
                          color: #1d1d1f;
                        }
                        .status-toggle-btn.groove-active {
                          background: #fef3c7;
                          color: #b45309;
                          box-shadow: 0 2px 8px rgba(245,158,11,0.12);
                        }
                        .status-toggle-btn.groove-active:hover {
                          background: #fde68a !important;
                        }
                        .status-toggle-btn.groove-inactive {
                          background: #f5f5f7;
                          color: #86868b;
                        }
                        .status-toggle-btn.groove-inactive:hover {
                          background: #e9e9eb !important;
                          color: #1d1d1f;
                        }
                      `}</style>
                      {filteredTeachers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                          Keine Lehrkräfte gefunden. Lege ein neues Profil an oder passe deine Filter an.
                        </div>
                      ) : (
                        filteredTeachers.map((t: any) => {
                          const isCampus = t.isCampusActive || t.is_campus_active;
                          const isGroove = t.isGroovelabActive || t.is_groovelab_active;
                          const teacherName = `${t.firstName || t.first_name || ''} ${t.lastName || t.last_name || ''}`.trim();
                          const { avatarBg, avatarColor } = getAlphabeticalColor(teacherName);

                          return (
                            <div
                              key={t.id}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("teacherId", t.id);
                              }}
                              onClick={() => setManageTeacher(t)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 16px',
                                borderRadius: '16px',
                                border: '1px solid #f1f5f9',
                                background: '#ffffff',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.01)',
                                transition: 'all 0.25s ease',
                                minWidth: '850px',
                                cursor: 'pointer',
                                contentVisibility: 'auto',
                                containIntrinsicSize: '0 62px'
                              }}
                              className="hover-scale"
                            >
                              {/* Avatar & Name Info */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1.6', minWidth: '180px' }}>
                                <div style={{
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '50%',
                                  background: avatarBg,
                                  color: avatarColor,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.88rem',
                                  fontFamily: 'Urbanist',
                                  flexShrink: 0
                                }}>
                                  {(t.firstName?.[0] || t.first_name?.[0] || 'L')}{(t.lastName?.[0] || t.last_name?.[0] || 'L')}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {teacherName}
                                  </span>
                                  <span style={{ fontSize: '0.74rem', color: t.email ? '#86868b' : '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {t.email || 'Keine E-Mail hinterlegt'}
                                  </span>
                                </div>
                              </div>

                              {/* Instrument Badge */}
                              <div style={{ flex: '1', minWidth: '100px' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '6px 12px',
                                  borderRadius: '10px',
                                  background: '#f5f5f7',
                                  color: '#3a3a3c',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  textAlign: 'center',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}>
                                  {t.instrument || 'Nicht festgelegt'}
                                </span>
                              </div>

                              {/* Status Badges (Campus & Groove) */}
                              <div style={{ flex: '1.25', minWidth: '130px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTeacherModule(t, 'campus');
                                  }}
                                  className={`status-toggle-btn ${isCampus ? 'campus-active' : 'campus-inactive'}`}
                                >
                                  Campus
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTeacherModule(t, 'groovelab');
                                  }}
                                  className={`status-toggle-btn ${isGroove ? 'groove-active' : 'groove-inactive'}`}
                                >
                                  Groovelab
                                </button>
                              </div>

                              {/* Aktivierungs-Status */}
                              <div style={{ flex: '0.4', minWidth: '50px', display: 'flex', justifyContent: 'center' }}>
                                {t.isPinActivated ? (
                                  <span title="Aktiviert"><CheckCircle size={18} style={{ color: '#34a853' }} /></span>
                                ) : (
                                  <span title="Ausstehend"><Clock size={18} style={{ color: '#fbbc04' }} /></span>
                                )}
                              </div>

                              {/* Pupil Count */}
                              <div style={{ flex: '1', minWidth: '100px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, color: '#3a3a3c' }}>
                                <Users size={16} style={{ color: '#86868b' }} />
                                <span>{(students.filter((s: any) => s.teacher_id === t.id).length) || t.studentCount || 0} Schüler</span>
                              </div>

                              {/* Action Buttons */}
                              <div style={{ flex: '1.2', minWidth: '120px', display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setManageTeacher(t);
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#1a73e8',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontFamily: 'Urbanist'
                                  }}
                                >
                                  Pass teilen
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUser(t.id);
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#34a853',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: '2px 6px'
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>

                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Manual Add Teacher Modal */}
                    {showAddTeacherModal && (
                      <div 
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-teacher-modal-title"
                        onClick={(e) => {
                          if (e.target === e.currentTarget) setShowAddTeacherModal(false);
                        }}
                        style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                      >
                        <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                          {/* Modal Header */}
                          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 id="add-teacher-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                              <Plus size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Neue Lehrkraft hinzufügen
                            </h3>
                            <button 
                              type="button"
                              aria-label="Dialog schließen"
                              onClick={() => setShowAddTeacherModal(false)}
                              style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                            >
                              ✕
                            </button>
                          </div>

                          {/* Modal Body */}
                          <form onSubmit={handleCreateTeacher}>
                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Vorname *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newTeacherFirstName}
                                    onChange={(e) => setNewTeacherFirstName(e.target.value)}
                                    placeholder="z.B. Johann"
                                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                  />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Nachname *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newTeacherLastName}
                                    onChange={(e) => {
                                      setNewTeacherLastName(e.target.value);
                                    }}
                                    placeholder="z.B. Bach"
                                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                  />
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>E-Mail-Adresse</label>
                                <input
                                  type="email"
                                  value={newTeacherEmail}
                                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                                  placeholder="z.B. bach@musaek.de"
                                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                />
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Instrumente/Fächer *</label>
                                <AppleStyleTokenField
                                  label=""
                                  selectedString={newTeacherInstrument}
                                  onChange={setNewTeacherInstrument}
                                  suggestions={activeSubjectsList}
                                  placeholder="Unterrichtsfächer auswählen..."
                                />
                              </div>


                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Endzeit / Vertragsende (Zugriff erlischt automatisch)</label>
                                <input
                                  type="date"
                                  value={newTeacherContractEndsAt}
                                  onChange={(e) => setNewTeacherContractEndsAt(e.target.value)}
                                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                />
                              </div>
                            </div>

                            {/* Modal Footer */}
                            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderRadius: '0 0 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                              <button
                                type="button"
                                onClick={() => setShowAddTeacherModal(false)}
                                style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem' }}
                              >
                                Abbrechen
                              </button>
                              <button
                                type="submit"
                                className="google-btn-primary"
                                style={{ background: '#34a853', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '0.82rem', fontWeight: 700 }}
                              >
                                Lehrkraft anlegen
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Subtab: Unterrichtsfächer */}
              {campusSubTab === 'subjects' && (
                <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Unterrichtsfächer werden geladen...</div>}>
                  <SecretarySubjectsView
                    schoolId={schoolId}
                    subjects={subjects}
                    allTeachers={allTeachers}
                    students={students}
                    supabase={supabase}
                    onRefresh={fetchDashboardData}
                  />
                </Suspense>
              )}
              
              {/* Subtab: Schülerboard (Campus-Schülerverwaltung) */}
              {campusSubTab === 'students' && (
            <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Schüler-Verwaltung wird geladen...</div>}>
              <SecretaryStudentsView
                students={students}
                campusTeachers={campusTeachers}
                bypassTeachers={bypassTeachers}
                coaches={coaches}
                currentSchoolProfile={currentSchoolProfile}
                schoolId={schoolId}
                schoolName={schoolName}
                windowWidth={windowWidth}
                hasCampusSub={hasCampusSub}
                hasGroovelabSub={hasGroovelabSub}
                studentBillingOption={studentBillingOption}
                isBillingBooked={isBillingBooked}
                billingPayer={billingPayer}
                isImportingStudentsBatch={isImportingStudentsBatch}
                setIsImportingStudentsBatch={setIsImportingStudentsBatch}
                filteredStudents={filteredStudents}
                studentSearchQuery={studentSearchQuery}
                setStudentSearchQuery={setStudentSearchQuery}
                studentFilterInstrument={studentFilterInstrument}
                setStudentFilterInstrument={setStudentFilterInstrument}
                studentFilterTeacher={studentFilterTeacher}
                setStudentFilterTeacher={setStudentFilterTeacher}
                studentFilterStatus={studentFilterStatus}
                setStudentFilterStatus={setStudentFilterStatus}
                isStudentCsvExpanded={isStudentCsvExpanded}
                setIsStudentCsvExpanded={setIsStudentCsvExpanded}
                studentCsvText={studentCsvText}
                setStudentCsvText={setStudentCsvText}
                studentCurrentPage={studentCurrentPage}
                setStudentCurrentPage={setStudentCurrentPage}
                studentPageSize={studentPageSize}
                setStudentPageSize={setStudentPageSize}
                selectedStudentIds={selectedStudentIds}
                setSelectedStudentIds={setSelectedStudentIds}
                showAddStudentModal={showAddStudentModal}
                setShowAddStudentModal={setShowAddStudentModal}
                showBulkImportModal={showBulkImportModal}
                setShowBulkImportModal={setShowBulkImportModal}
                showGuidanceModal={showGuidanceModal}
                setShowGuidanceModal={setShowGuidanceModal}
                showParentInfoSheetModal={showParentInfoSheetModal}
                setShowParentInfoSheetModal={setShowParentInfoSheetModal}
                showBulkDeleteModal={showBulkDeleteModal}
                setShowBulkDeleteModal={setShowBulkDeleteModal}
                bulkDeletePin={bulkDeletePin}
                setBulkDeletePin={setBulkDeletePin}
                bulkDeleteStep={bulkDeleteStep}
                setBulkDeleteStep={setBulkDeleteStep}
                guidanceInitialTab={guidanceInitialTab}
                setGuidanceInitialTab={setGuidanceInitialTab}
                newStudentFirstName={newStudentFirstName}
                setNewStudentFirstName={setNewStudentFirstName}
                newStudentLastName={newStudentLastName}
                setNewStudentLastName={setNewStudentLastName}
                newStudentNickname={newStudentNickname}
                setNewStudentNickname={setNewStudentNickname}
                newStudentInstrument={newStudentInstrument}
                setNewStudentInstrument={setNewStudentInstrument}
                newStudentDuration={newStudentDuration}
                setNewStudentDuration={setNewStudentDuration}
                newStudentTeacherId={newStudentTeacherId}
                setNewStudentTeacherId={setNewStudentTeacherId}
                newStudentIsAppUser={newStudentIsAppUser}
                setNewStudentIsAppUser={setNewStudentIsAppUser}
                newStudentIsCampusActive={newStudentIsCampusActive}
                setNewStudentIsCampusActive={setNewStudentIsCampusActive}
                newStudentIsGroovelabActive={newStudentIsGroovelabActive}
                setNewStudentIsGroovelabActive={setNewStudentIsGroovelabActive}
                selectedStudentForDetail={selectedStudentForDetail}
                setSelectedStudentForDetail={setSelectedStudentForDetail}
                activeContextMenu={activeContextMenu}
                setActiveContextMenu={setActiveContextMenu}
                copiedStudentId={copiedStudentId}
                setCopiedStudentId={setCopiedStudentId}
                showRealNames={showRealNames}
                toggleRealNames={toggleRealNames}
                fetchDashboardData={fetchDashboardData}
                handleBatchImportStudents={handleBatchImportStudents}
                handleCreateStudentCampus={handleCreateStudentCampus}
                handleDeleteStudentCampus={handleDeleteStudentCampus}
                handleUpdateStudentTeacher={handleUpdateStudentTeacher}
                handleToggleStudentModule={handleToggleStudentModule}
                getAlphabeticalColor={getAlphabeticalColor}
              />
            </Suspense>
          )}

              {/* Subtab: Campus Räume */}
              {campusSubTab === 'rooms' && (
                <div style={{ flex: 1, minWidth: 0, height: '85vh', overflowY: 'auto' }}>
                  <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Raumverwaltung...</div>}>
                    <AdminDashboard
                      userId={userId || ''}
                      onLogout={onLogout || (() => {})}
                      forceTab="rooms"
                      activePlatform="campus"
                      hideHeader={true}
                    />
                  </Suspense>
                </div>
              )}

              {/* Subtab: Termine Board */}
              {campusSubTab === 'events' && (
                <div style={{ flex: 1, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Termine &amp; Kalender...</div>}>
                    <CampusEventsBoard
                      userId={userId || ''}
                      role="secretary"
                      schoolId={schoolId}
                      supabase={supabase}
                      brandColor="#34a853"
                    />
                  </Suspense>
                </div>
              )}

              {/* Subtab: Schedules – Hybride Raumplanungs-Zentrale */}
              {campusSubTab === 'schedules' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, sans-serif' }}>

                  {/* Pending Schedules Review Banner (Warm Yellow Dashed Aesthetic) */}
                  {pendingSchedules.length > 0 && (
                    <div style={{
                      background: '#fffbeb',
                      border: '1.5px dashed #f59e0b',
                      borderRadius: '20px',
                      padding: '16px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 20px rgba(245, 158, 11, 0.08)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Activity size={22} style={{ color: '#b45309' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{pendingSchedules.length} ausstehende Stundenplan-Freigaben zur Review</span>
                            <span style={{ fontSize: '0.66rem', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                              Prüfung erforderlich
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#92400e', marginTop: '2px', fontWeight: 600 }}>
                            Lehrkräfte haben neue oder geänderte Stundenpläne eingereicht.
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const nextState = !showOnlyPendingReviews;
                            setShowOnlyPendingReviews(nextState);
                            setApprovalToast({
                              message: nextState 
                                ? `Röntgen-Modus aktiv: Ausstehende Stundenpläne werden hervorgehoben` 
                                : 'Röntgen-Modus beendet',
                              type: 'success'
                            });
                            setTimeout(() => setApprovalToast(null), 3500);
                          }}
                          style={{
                            background: showOnlyPendingReviews ? '#d97706' : '#fef3c7',
                            color: showOnlyPendingReviews ? '#ffffff' : '#b45309',
                            border: '1px solid #fde68a',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: showOnlyPendingReviews ? '0 4px 14px rgba(217, 119, 6, 0.3)' : 'none'
                          }}
                        >
                          <Eye size={14} />
                          <span>{showOnlyPendingReviews ? 'Röntgen-Modus beenden' : `Röntgen-Modus (${pendingSchedules.length})`}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleApproveAllPendingSchedules}
                          disabled={isApprovingAllSchedules}
                          style={{
                            background: 'linear-gradient(135deg, #d97706, #b45309)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 18px',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 10px rgba(217, 119, 6, 0.25)',
                            transition: 'all 0.18s ease',
                          }}
                        >
                          {isApprovingAllSchedules ? (
                            <>
                              <Clock size={14} className="animate-spin" />
                              <span>Wende Freigaben an...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={14} />
                              <span>Alle {pendingSchedules.length} jetzt freigeben</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Toolbar */}
                  <div style={{ background: 'white', borderRadius: '24px', padding: '20px 24px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GraduationCap size={20} style={{ color: '#34a853' }} />
                        <span>Campus Raum-Koordinationsboard</span>
                      </h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 550 }}>
                        {schedulesRoomsViewMode === 'live' 
                          ? 'Operativer Tages-Belegungsplan mit Belegungskurven & Ad-hoc-Spontanbuchung' 
                          : 'Wochen-Matrix zur Semesterplanung: Weise Lehrkräfte per Drag & Drop Räumen zu'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'stretch', gap: '8px', width: '100%' }}>
                      {/* Segmented Switch for Modes */}
                      <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '9px', border: '1px solid #cbd5e1', width: '300px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => setSchedulesRoomsViewMode('designer')}
                          style={{
                            flex: 1,
                            background: schedulesRoomsViewMode === 'designer' ? '#34a853' : 'transparent',
                            color: schedulesRoomsViewMode === 'designer' ? 'white' : '#475569',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          Raumplan-Designer
                        </button>
                        <button
                          type="button"
                          onClick={() => setSchedulesRoomsViewMode('live')}
                          style={{
                            flex: 1,
                            background: schedulesRoomsViewMode === 'live' ? '#34a853' : 'transparent',
                            color: schedulesRoomsViewMode === 'live' ? 'white' : '#475569',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          Raumplan (Live)
                        </button>
                      </div>

                      {schedulesRoomsViewMode === 'designer' && (
                        <>
                          <button
                            type="button"
                            onClick={runAutoRoomAllocation}
                            disabled={matrixAllocations.filter(p => !p.roomId).length === 0}
                            style={{ flex: 1, background: 'white', border: '1.5px solid #cbd5e1', color: '#475569', fontWeight: 800, padding: '7px 12px', borderRadius: '10px', fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', opacity: matrixAllocations.filter(p => !p.roomId).length === 0 ? 0.5 : 1, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                          >
                            ⚡ Auto
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Möchtest du wirklich alle Zuteilungen zurücksetzen? Alle Termine werden wieder in die Liste der offenen Zuteilungen verschoben.')) {
                                setMatrixAllocations(prev => prev.map(p => ({ ...p, roomId: null })));
                              }
                            }}
                            style={{ flex: 1, background: 'white', border: '1.5px solid #fca5a5', color: '#b91c1c', fontWeight: 800, padding: '7px 12px', borderRadius: '10px', fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                          >
                            Zurücksetzen
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveAndApproveAll(false)}
                            disabled={isSavingApproval}
                            style={{ flex: 1.5, background: isSavingApproval ? '#6b9e7a' : 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', color: 'white', border: 'none', fontWeight: 800, padding: '7.5px 14px', borderRadius: '10px', fontSize: '0.74rem', cursor: isSavingApproval ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(52,168,83,0.15)', whiteSpace: 'nowrap', opacity: isSavingApproval ? 0.8 : 1, transition: 'all 0.2s' }}
                          >
                            {isSavingApproval ? (
                              <>
                                <svg style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                                Wird freigegeben...
                              </>
                            ) : 'Speichern & Freigeben'}
                          </button>

                        </>
                      )}
                    </div>
                  </div>

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* VIEW MODE 1: DYNAMISCHER LIVE-RAUMPLAN (TIMELINE VIEW) */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {schedulesRoomsViewMode === 'live' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      {/* Weekday Switcher (Apple-style Segmented Control) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8e8e93', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>Tag auswählen</span>
                          <span style={{ fontSize: '0.7rem', color: '#8e8e93', fontWeight: 600 }}>Semester-Belegungen</span>
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(7, 1fr)', 
                          gap: '2px', 
                          background: '#f1f5f9', 
                          padding: '3px', 
                          borderRadius: '14px',
                          border: '1px solid rgba(0,0,0,0.02)',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                          {[1,2,3,4,5,6,7].map(d => {
                            const isSelected = liveViewDay === d;
                            const dayName = ['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][d];
                            const allocationCount = matrixAllocations.filter(p => p.dayOfWeek === d && p.roomId).length;
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setLiveViewDay(d)}
                                style={{
                                  background: isSelected ? '#ffffff' : 'transparent',
                                  border: 'none',
                                  color: isSelected ? '#1c1c1e' : '#636366',
                                  padding: '10px 8px',
                                  borderRadius: '11px',
                                  fontSize: '0.78rem',
                                  fontWeight: isSelected ? 700 : 500,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)' : 'none',
                                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}
                              >
                                <span>{dayName}</span>
                                <span style={{ 
                                  background: isSelected ? '#34a853' : 'rgba(0, 0, 0, 0.05)', 
                                  color: isSelected ? 'white' : '#636366', 
                                  fontSize: '0.65rem', 
                                  fontWeight: 700, 
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s ease'
                                }}>
                                  {allocationCount}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Timeline Board */}
                      <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', padding: '24px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', overflowX: 'auto' }}>
                        {rooms.length === 0 ? (
                          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🏫</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Keine Räume gefunden. Bitte zuerst Räume im System anlegen.</span>
                          </div>
                        ) : (
                          <div style={{ minWidth: '800px', position: 'relative' }}>
                            
                            {/* Closed notification overlay */}
                            {(() => {
                              const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                              const liveHours = openingHours?.[dayKeys[liveViewDay]];
                              const isLiveClosed = liveHours?.active === false;
                              if (isLiveClosed) {
                                return (
                                  <div style={{ background: '#fef2f2', border: '1.5px solid #fee2e2', color: '#ef4444', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                    <AlertCircle size={20} />
                                    <div>
                                      <strong style={{ fontSize: '0.88rem', display: 'block', fontWeight: 800 }}>Groovelab geschlossen</strong>
                                      <span style={{ fontSize: '0.78rem', opacity: 0.9, fontWeight: 600 }}>Das Groovelab ist am {['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][liveViewDay]} geschlossen. (Die hier gezeigten Timelines gelten für Groovelab-Räume)</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            
                            {/* Hour Header Bar */}
                            <div style={{ display: 'flex', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
                              <div style={{ width: '180px', flexShrink: 0, fontSize: '0.72rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Raum</div>
                              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', paddingLeft: '20px', position: 'relative' }}>
                                {['13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'].map((hr, idx) => (
                                  <div key={idx} style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textAlign: 'center', width: '40px', flexShrink: 0, position: 'relative' }}>
                                    {hr}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Room Timeline Rows */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                              {rooms.filter(room => room.is_campus_active !== false).map(room => {
                                const roomAllocations = matrixAllocations.filter(p => p.roomId === room.id && p.dayOfWeek === liveViewDay);
                                
                                // Conflict checker inside the timeline
                                const hasConflicts = roomAllocations.some(p1 => 
                                  roomAllocations.some(p2 => p1.id !== p2.id && p1.startTime < p2.endTime && p2.startTime < p1.endTime)
                                );

                                return (
                                  <div key={room.id} style={{ display: 'flex', alignItems: 'center', minHeight: '64px', paddingBottom: '8px', borderBottom: '1px solid #f8fafc' }}>
                                    
                                    {/* Left info box */}
                                    <div style={{ width: '180px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <strong style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 800 }}>{room.name}</strong>
                                        {hasConflicts && (
                                          <span style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', fontSize: '0.58rem', fontWeight: 900, padding: '1px 5px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="Zeitliche Überschneidung!">
                                            ⚠️ KOLLISION
                                          </span>
                                        )}
                                      </div>

                                      
                                    </div>

                                    {/* Right timeline grid area */}
                                    <div style={{ flex: 1, height: '52px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                                      
                                      {/* Visual Hour Grid lines */}
                                      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none', paddingLeft: '20px', paddingRight: '20px' }}>
                                        {[1,2,3,4,5,6,7,8,9].map(i => (
                                          <div key={i} style={{ borderLeft: '1.5px dashed rgba(226, 232, 240, 0.7)', height: '100%' }} />
                                        ))}
                                      </div>

                                      {/* Inactive/Closed Zone Overlays */}
                                      {(() => {
                                        // Only show inactive overlays for GrooveLab rooms
                                        const isGroovelabRoom = room.name.toLowerCase().includes('groovelab');
                                        if (!isGroovelabRoom) return null;

                                        const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                                        const liveHours = openingHours?.[dayKeys[liveViewDay]];
                                        if (!liveHours || liveHours.active === false) return null;
                                        if (!liveHours.start || !liveHours.end) return null;

                                        const tToM = (t: string) => {
                                          const [h, m] = t.split(':').map(Number);
                                          return h * 60 + m;
                                        };

                                        const startMin = tToM(liveHours.start);
                                        const endMin = tToM(liveHours.end);

                                        // Timeline is 13:00 (780 mins) to 21:00 (1260 mins). Duration 480 mins.
                                        const leftZoneWidth = Math.max(0, Math.min(100, ((startMin - 780) / 480) * 100));
                                        const rightZoneLeft = Math.max(0, Math.min(100, ((endMin - 780) / 480) * 100));
                                        const rightZoneWidth = 100 - rightZoneLeft;

                                        return (
                                          <>
                                            {leftZoneWidth > 0 && (
                                              <div style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                bottom: 0,
                                                width: `${leftZoneWidth}%`,
                                                background: 'repeating-linear-gradient(45deg, rgba(241,245,249,0.5), rgba(241,245,249,0.5) 5px, rgba(226,232,240,0.5) 5px, rgba(226,232,240,0.5) 10px)',
                                                borderRight: '1px solid rgba(203,213,225,0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#94a3b8',
                                                fontSize: '0.62rem',
                                                fontWeight: 800,
                                                pointerEvents: 'none',
                                                zIndex: 1
                                              }}>
                                                Geschlossen
                                              </div>
                                            )}
                                            {rightZoneWidth > 0 && (
                                              <div style={{
                                                position: 'absolute',
                                                left: `${rightZoneLeft}%`,
                                                top: 0,
                                                bottom: 0,
                                                width: `${rightZoneWidth}%`,
                                                background: 'repeating-linear-gradient(45deg, rgba(241,245,249,0.5), rgba(241,245,249,0.5) 5px, rgba(226,232,240,0.5) 5px, rgba(226,232,240,0.5) 10px)',
                                                borderLeft: '1px solid rgba(203,213,225,0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#94a3b8',
                                                fontSize: '0.62rem',
                                                fontWeight: 800,
                                                pointerEvents: 'none',
                                                zIndex: 1
                                              }}>
                                                Geschlossen
                                              </div>
                                            )}
                                          </>
                                        );
                                      })()}

                                      {/* Absolute Positioned Allocations */}
                                      {roomAllocations.map(plan => {
                                        // Conversion helper
                                        const timeToMins = (t: string) => {
                                          if (!t || !t.includes(':')) return 840; // Default 14:00
                                          const [h, m] = t.split(':').map(Number);
                                          return h * 60 + m;
                                        };

                                        const startMin = timeToMins(plan.startTime);
                                        const endMin = timeToMins(plan.endTime);
                                        
                                        // Timeline starts 13:00 (780 mins), ends 21:00 (1260 mins). Duration 480 mins.
                                        const leftPercent = Math.max(0, Math.min(100, ((startMin - 780) / 480) * 100));
                                        const widthPercent = Math.max(8, Math.min(100 - leftPercent, ((endMin - startMin) / 480) * 100));

                                        const isConflict = roomAllocations.some(p => 
                                          p.id !== plan.id && p.startTime < plan.endTime && plan.startTime < p.endTime
                                        );

                                        // Beautiful pastel coloring replaced with uniform green
                                        const themeBg = 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)';
                                        const themeBorder = '#34a853';
                                        const themeText = '#34a853';

                                        return (
                                          <div
                                            key={plan.id}
                                            onClick={() => setSelectedDayPlan(plan)}
                                            style={{
                                              position: 'absolute',
                                              left: `${leftPercent}%`,
                                              width: `${widthPercent}%`,
                                              height: '38px',
                                              background: themeBg,
                                              border: `1.5px solid ${themeBorder}`,
                                              borderLeft: `4.5px solid ${themeBorder}`,
                                              borderRadius: '10px',
                                              padding: '2px 8px',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              justifyContent: 'center',
                                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                                              zIndex: isConflict ? 10 : 2,
                                              transition: 'all 0.2s',
                                              overflow: 'hidden'
                                            }}
                                            className="hover-scale-mini"
                                            title={`${getPlanDisplayName(plan)} (${plan.instrument}) : ${plan.startTime} - ${plan.endTime}`}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                              <span style={{ fontSize: '0.67rem', fontWeight: 900, color: themeText, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {getPlanDisplayName(plan)}
                                              </span>
                                              <span style={{ fontSize: '0.58rem', fontWeight: 900, fontFamily: 'monospace', color: themeText, opacity: 0.85 }}>
                                                {plan.startTime} - {plan.endTime}
                                              </span>
                                            </div>
                                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: themeText, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {plan.id.startsWith('adhoc_') ? '⚡ Spontan' : plan.instrument}
                                            </span>
                                          </div>
                                        );
                                      })}

                                      {roomAllocations.length === 0 && (
                                        <div style={{ width: '100%', textAlign: 'center', fontSize: '0.67rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.02em' }}>
                                          ☕ Frei · Keine Zuweisungen
                                        </div>
                                      )}
                                    </div>

                                  </div>
                                );
                              })}
                            </div>

                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* VIEW MODE 2: UPGRADED RAUMPLAN-DESIGNER (MATRIX GRID)    */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {schedulesRoomsViewMode === 'designer' && (
                    <div style={{ overflowX: 'auto', background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', padding: '24px', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
                      {rooms.length === 0 ? (
                        <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
                          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🏫</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Keine Räume gefunden. Bitte zuerst Räume im System anlegen.</span>
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '8px 6px', tableLayout: 'fixed', minWidth: '700px' }}>
                          <colgroup>
                            <col style={{ width: '130px' }} />
                            {[1,2,3,4,5,6,7].map(d => <col key={d} />)}
                          </colgroup>

                          <thead>
                            <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                              <th style={{ padding: '10px 12px', fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Raum</th>
                              {[1,2,3,4,5,6,7].map(d => (
                                <th key={d} style={{ padding: '10px 10px', fontSize: '0.75rem', fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left' }}>
                                  {['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][d]}
                                  {matrixAllocations.filter(p => !p.roomId && p.dayOfWeek === d).length > 0 && (
                                    <span style={{ marginLeft: '6px', background: '#fef3c7', color: '#b45309', fontSize: '0.6rem', fontWeight: 900, padding: '1px 6px', borderRadius: '6px' }}>
                                      {matrixAllocations.filter(p => !p.roomId && p.dayOfWeek === d).length} offen
                                    </span>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>

                          <tbody>
                            {/* ── Nicht zugewiesen row ── */}
                            <tr style={{ borderBottom: '2px solid #fef3c7', background: '#fffbeb' }}>
                              <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                                <strong style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Kein Raum</strong>
                                <span style={{ fontSize: '0.6rem', color: '#d97706', fontWeight: 700 }}>↓ in Raum ziehen</span>
                              </td>
                              {[1,2,3,4,5,6,7].map(dayNum => {
                                const unassigned = matrixAllocations.filter(p => {
                                  if (p.roomId) return false;
                                  if (p.dayOfWeek !== dayNum) return false;
                                  if (selectedFilterTeacherId && p.teacherId !== selectedFilterTeacherId) return false;
                                  return true;
                                });
                                return (
                                  <td
                                    key={dayNum}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDropOnMatrix(e, null, dayNum)}
                                    style={{ padding: '8px', verticalAlign: 'top', minHeight: '72px', position: 'relative' }}
                                  >
                                    {unassigned.length === 0 ? (
                                      <div style={{
                                        height: '56px',
                                        borderRadius: '10px',
                                        border: '2px dashed rgba(245, 158, 11, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'rgba(245, 158, 11, 0.35)',
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        background: 'rgba(254, 243, 199, 0.05)'
                                      }}>
                                        Leer
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                                        {unassigned.map(plan => {
                                          const isGL = plan.teacherId === 'groovelab';
                                          const isExplicitPending = plan.status === 'ready_for_admin_review' || plan.status === 'pending';
                                          const isTeacherPending = !isGL && pendingSchedules.some(s => {
                                            const cleanSTeacher = s.teacher_id ? s.teacher_id.replace(/^teacher-/i, '') : '';
                                            const cleanPlanTeacher = plan.teacherId ? plan.teacherId.replace(/^teacher-/i, '') : '';
                                            return s.id === plan.id || (cleanSTeacher && cleanSTeacher === cleanPlanTeacher);
                                          });
                                          const isPendingBlock = isExplicitPending || isTeacherPending;

                                          let cardBg = isGL ? '#fffbeb' : '#e6f4ea';
                                          let cardBorder = isGL ? '1px solid #fde68a' : '1px solid #a7f3d0';
                                          let cardBorderLeft = isGL ? '4px solid #f59e0b' : '4px solid #34a853';
                                          const titleColor = isGL ? '#92400e' : '#0f172a';
                                          const instColor = isGL ? '#b45309' : '#64748b';
                                          const timeColor = isGL ? '#d97706' : '#34a853';

                                          if (showOnlyPendingReviews && isPendingBlock) {
                                            cardBorder = '1.5px dashed #f59e0b';
                                            cardBorderLeft = '4px solid #f59e0b';
                                            cardBg = '#fffbeb';
                                          }

                                          const blockOpacity = showOnlyPendingReviews ? (isPendingBlock ? 1 : 0.25) : 1;
                                          const blockShadow = showOnlyPendingReviews && isPendingBlock ? '0 4px 16px rgba(245, 158, 11, 0.22)' : (isGL ? '0 4px 8px rgba(245, 158, 11, 0.06)' : '0 4px 8px rgba(52, 168, 83, 0.06)');

                                          return (
                                            <div
                                              key={plan.id}
                                              draggable
                                              onDragStart={(e) => handleDragStartMatrix(e, plan.id)}
                                              onDragEnd={() => {
                                                setDraggedPlanId(null);
                                                setDraggedPlanDay(null);
                                              }}
                                              onMouseEnter={(e) => {
                                                if (showOnlyPendingReviews && !isPendingBlock) {
                                                  e.currentTarget.style.opacity = '1';
                                                }
                                              }}
                                              onMouseLeave={(e) => {
                                                if (showOnlyPendingReviews && !isPendingBlock) {
                                                  e.currentTarget.style.opacity = '0.25';
                                                }
                                              }}
                                              onClick={(e) => {
                                                setSelectedDayPlan(plan);
                                                e.stopPropagation();
                                              }}
                                              title={`${getPlanDisplayName(plan)} (${plan.instrument})`}
                                              style={{
                                                position: 'relative',
                                                background: cardBg,
                                                border: cardBorder,
                                                borderLeft: cardBorderLeft,
                                                borderRadius: '10px',
                                                padding: '7px 9px',
                                                cursor: 'grab',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '2px',
                                                boxShadow: blockShadow,
                                                opacity: blockOpacity,
                                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                                userSelect: 'none',
                                                WebkitUserSelect: 'none'
                                              }}
                                            >
                                              <span style={{ fontSize: '0.73rem', fontWeight: 800, color: titleColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getPlanDisplayName(plan)}</span>
                                              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: instColor }}>{plan.instrument}</span>
                                              <span style={{ fontSize: '0.62rem', fontWeight: 900, fontFamily: 'monospace', color: timeColor }}>⏱ {plan.startTime}–{plan.endTime}</span>
                                              {(() => {
                                                // Only validate for GrooveLab slots
                                                const isGroovelabPlan = plan.teacherId === 'groovelab';
                                                if (!isGroovelabPlan) return null;

                                                const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                                                const dayHours = openingHours?.[dayKeys[dayNum]];
                                                if (!dayHours) return null;
                                                
                                                if (dayHours.start && dayHours.end && (plan.startTime < dayHours.start || plan.endTime > dayHours.end)) {
                                                  return <span style={{ pointerEvents: 'none', fontSize: '0.55rem', fontWeight: 900, color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2', padding: '2px 4px', borderRadius: '4px', marginTop: '2px', alignSelf: 'flex-start' }} title={`Öffnungszeiten: ${dayHours.start} - ${dayHours.end}`}>⚠️ Außerhalb Betriebszeit (${dayHours.start}–${dayHours.end})</span>;
                                                }
                                                return null;
                                              })()}
                                              {isPendingBlock && (
                                                <span style={{ pointerEvents: 'none', fontSize: '0.58rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '2px 6px', borderRadius: '6px', marginTop: '3px', display: 'inline-flex', alignItems: 'center', gap: '3px', width: 'fit-content' }}>
                                                  <Activity size={10} style={{ color: '#b45309' }} />
                                                  <span>Review</span>
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>

                            {/* ── Room rows (All rooms visible in X-Ray mode) ── */}
                            {rooms
                              .filter(room => room.is_campus_active !== false)
                              .map((room, rIdx) => {
                              // Smart instrument compatibility check for visual highlighting
                              const draggedPlan = draggedPlanId ? matrixAllocations.find(p => p.id === draggedPlanId) : null;
                              
                              let isCompatible = true;
                              if (draggedPlan && draggedPlan.instrument) {
                                const unsuitable = room.unsuitable_instruments || (() => {
                                  try {
                                    const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
                                    return map[room.id] || [];
                                  } catch { return []; }
                                })();
                                isCompatible = !unsuitable.some((inst: string) => inst.toLowerCase() === draggedPlan.instrument.toLowerCase());
                              }

                              return (
                                <tr id={`room-row-${room.id}`} key={room.id} style={{ borderBottom: rIdx < rooms.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                  <td style={{ padding: '8px', verticalAlign: 'top', background: draggedPlanId && !isCompatible ? '#fef2f2' : 'transparent', transition: 'background 0.25s' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      <strong style={{ fontSize: '0.78rem', color: draggedPlanId && !isCompatible ? '#991b1b' : '#0f172a', fontWeight: 800 }}>
                                        {room.name}
                                      </strong>
                                      {draggedPlanId && !isCompatible && (
                                        <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 600 }}>
                                          ⚠️ Nicht geeignet
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  {[1,2,3,4,5,6,7].map(dayNum => {
                                    const cellPlans = matrixAllocations.filter(p => p.roomId === room.id && p.dayOfWeek === dayNum);
                                    
                                    // Visual highlight styling based on compatibility & real-time dragover hover
                                    let borderStyle = '1px solid #f1f5f9';
                                    let cellBg = 'transparent';

                                    const isCellHovered = dragOverCell.roomId === room.id && dragOverCell.day === dayNum;
                                    const draggedPlan = draggedPlanId ? matrixAllocations.find(p => p.id === draggedPlanId) : null;

                                    let hasDragOverlap = false;
                                    if (draggedPlan && cellPlans.length > 0) {
                                      hasDragOverlap = cellPlans.some(p => 
                                        p.id !== draggedPlan.id && 
                                        p.startTime < draggedPlan.endTime && 
                                        draggedPlan.startTime < p.endTime
                                      );
                                    }

                                    if (draggedPlanId && draggedPlanDay === dayNum) {
                                      if (isCellHovered) {
                                        if (hasDragOverlap) {
                                          borderStyle = '2px solid #ef4444';
                                          cellBg = 'rgba(239, 68, 68, 0.07)';
                                        } else if (isCompatible) {
                                          borderStyle = '2px solid #34a853';
                                          cellBg = 'rgba(52, 168, 83, 0.07)';
                                        } else {
                                          borderStyle = '2px solid #f59e0b';
                                          cellBg = 'rgba(245, 158, 11, 0.07)';
                                        }
                                      } else {
                                        borderStyle = '1px solid rgba(52, 168, 83, 0.2)';
                                        cellBg = 'rgba(52, 168, 83, 0.015)';
                                      }
                                    }

                                    return (
                                      <td
                                        key={dayNum}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDragEnter={() => setDragOverCell({ roomId: room.id, day: dayNum })}
                                        onDrop={(e) => {
                                          setDragOverCell({ roomId: null, day: null });
                                          handleDropOnMatrix(e, room.id, dayNum);
                                        }}
                                        style={{
                                          padding: '0',
                                          verticalAlign: 'top',
                                          height: '1px'
                                        }}
                                      >
                                        <div style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '5px',
                                          minHeight: '64px',
                                          height: '100%',
                                          borderRadius: '12px',
                                          border: borderStyle,
                                          background: cellBg,
                                          opacity: draggedPlanId && draggedPlanDay !== dayNum ? 0.35 : 1,
                                          padding: draggedPlanId && draggedPlanDay === dayNum ? '6px' : '4px',
                                          transition: 'all 0.2s ease',
                                          cursor: draggedPlanId && draggedPlanDay !== dayNum ? 'not-allowed' : 'default',
                                          boxSizing: 'border-box'
                                        }}>
                                          {cellPlans.map(plan => {
                                            const hasOverlap = cellPlans.some(p => p.id !== plan.id && p.startTime < plan.endTime && plan.startTime < p.endTime);
                                            const isGroovelabPlan = plan.teacherId === 'groovelab';

                                            const isExplicitPending = plan.status === 'ready_for_admin_review' || plan.status === 'pending';
                                            const isTeacherPending = !isGroovelabPlan && pendingSchedules.some(s => {
                                              const cleanSTeacher = s.teacher_id ? s.teacher_id.replace(/^teacher-/i, '') : '';
                                              const cleanPlanTeacher = plan.teacherId ? plan.teacherId.replace(/^teacher-/i, '') : '';
                                              return s.id === plan.id || (cleanSTeacher && cleanSTeacher === cleanPlanTeacher);
                                            });
                                            const isPendingBlock = isExplicitPending || isTeacherPending;

                                            let themeBg = isGroovelabPlan ? '#fefce8' : 'rgba(230, 244, 234, 0.45)';
                                            let themeBorder = isGroovelabPlan ? '1px solid #fef08a' : '1px solid #e2e8f0';
                                            let themeBorderLeft = isGroovelabPlan ? '4px solid #facc15' : '4px solid #34a853';
                                            const themeText = '#0f172a';
                                            const timeText = isGroovelabPlan ? '#eab308' : '#34a853';

                                            if (hasOverlap) {
                                              themeBorder = isGroovelabPlan ? '2px dashed #facc15' : '2px dashed #34a853';
                                            }

                                            if (showOnlyPendingReviews && isPendingBlock) {
                                              themeBorder = '1.5px dashed #f59e0b';
                                              themeBorderLeft = '4px solid #f59e0b';
                                              themeBg = '#fffbeb';
                                            }

                                            const planOpacity = showOnlyPendingReviews ? (isPendingBlock ? 1 : 0.25) : 1;
                                            const planShadow = showOnlyPendingReviews && isPendingBlock ? '0 4px 16px rgba(245, 158, 11, 0.22)' : '0 1px 3px rgba(0,0,0,0.02)';

                                            return (
                                              <div
                                                key={plan.id}
                                                draggable
                                                onDragStart={(e) => handleDragStartMatrix(e, plan.id)}
                                                onDragEnd={() => {
                                                  setDraggedPlanId(null);
                                                  setDraggedPlanDay(null);
                                                }}
                                                onMouseEnter={(e) => {
                                                  if (showOnlyPendingReviews && !isPendingBlock) {
                                                    e.currentTarget.style.opacity = '1';
                                                  }
                                                }}
                                                onMouseLeave={(e) => {
                                                  if (showOnlyPendingReviews && !isPendingBlock) {
                                                    e.currentTarget.style.opacity = '0.25';
                                                  }
                                                }}
                                                onClick={() => setSelectedDayPlan(plan)}
                                                style={{
                                                  background: themeBg,
                                                  border: themeBorder,
                                                  borderLeft: themeBorderLeft,
                                                  borderRadius: '10px',
                                                  padding: '7px 9px',
                                                  cursor: 'grab',
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  gap: '2px',
                                                  boxShadow: planShadow,
                                                  opacity: planOpacity,
                                                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                                  userSelect: 'none',
                                                  WebkitUserSelect: 'none'
                                                }}
                                              >
                                                <div style={{ pointerEvents: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                                                  <span style={{ fontSize: '0.73rem', fontWeight: 800, color: themeText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {getPlanDisplayName(plan)}
                                                  </span>
                                                  {hasOverlap && <span style={{ fontSize: '0.6rem', flexShrink: 0 }} title="Zeitkonflikt!">⚠️</span>}
                                                </div>
                                                <span style={{ pointerEvents: 'none', fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8' }}>{plan.instrument}</span>
                                                <span style={{ pointerEvents: 'none', fontSize: '0.62rem', fontWeight: 900, fontFamily: 'monospace', color: hasOverlap ? '#ef4444' : timeText }}>
                                                  ⏱ {plan.startTime}–{plan.endTime}
                                                </span>
                                                {(() => {
                                                  if (!isGroovelabPlan) return null;

                                                  const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                                                  const dayHours = openingHours?.[dayKeys[dayNum]];
                                                  if (!dayHours) return null;
                                                  if (dayHours.start && dayHours.end && (plan.startTime < dayHours.start || plan.endTime > dayHours.end)) {
                                                    return <span style={{ pointerEvents: 'none', fontSize: '0.55rem', fontWeight: 900, color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2', padding: '2px 4px', borderRadius: '4px', marginTop: '2px', alignSelf: 'flex-start' }} title={`Öffnungszeiten: ${dayHours.start} - ${dayHours.end}`}>⚠️ Außerhalb Betriebszeit (${dayHours.start}–${dayHours.end})</span>;
                                                  }
                                                  return null;
                                                })()}
                                                {isPendingBlock && (
                                                  <span style={{ pointerEvents: 'none', fontSize: '0.58rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '2px 6px', borderRadius: '6px', marginTop: '3px', display: 'inline-flex', alignItems: 'center', gap: '3px', width: 'fit-content' }}>
                                                    <Activity size={10} style={{ color: '#b45309' }} />
                                                    <span>Review</span>
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })}
                                          {cellPlans.length === 0 && <div style={{ height: '40px' }} />}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* DIALOG POPUP: SPONTANE AD-HOC BELEGUNG BUCHEN            */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {showAdHocBooking && (
                    <div 
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="adhoc-booking-modal-title"
                      onClick={(e) => {
                        if (e.target === e.currentTarget) {
                          setShowAdHocBooking(false);
                          setAdHocStudentName('');
                        }
                      }}
                      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                    >
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!adHocTeacherId) {
                            alert('Bitte wähle eine Lehrkraft.');
                            return;
                          }
                          const chosenTeacher = campusTeachers.find(t => t.id === adHocTeacherId);
                          const name = chosenTeacher ? `${chosenTeacher.firstName} ${chosenTeacher.lastName}` : 'Lehrkraft';
                          const instrument = chosenTeacher ? chosenTeacher.instrument : 'Instrument';

                          // Compute end time: startTime (e.g. "14:15") + duration (minutes)
                          const [h, m] = adHocStartTime.split(':').map(Number);
                          const totalMins = h * 60 + m + adHocDuration;
                          const endH = Math.floor(totalMins / 60) % 24;
                          const endM = totalMins % 60;
                          const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

                          const newPlanId = `adhoc_${Date.now()}`;
                          const newPlanEntry = {
                            id: newPlanId,
                            teacherId: adHocTeacherId,
                            teacherName: name,
                            instrument: instrument,
                            dayOfWeek: liveViewDay,
                            startTime: adHocStartTime,
                            endTime: endTimeStr,
                            roomId: adHocRoomId,
                            status: 'approved',
                            slots: [
                              {
                                student_name: adHocStudentName.trim() || 'Spontane Buchung (Freies Üben)',
                                time_slot: adHocStartTime,
                                duration: adHocDuration,
                              }
                            ]
                          };

                          setMatrixAllocations(prev => [...prev, newPlanEntry]);
                          setShowAdHocBooking(false);
                          setAdHocStudentName('');
                          alert('Spontanbelegung erfolgreich eingebucht! ⚡');
                        }}
                        style={{ background: 'white', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.5)', width: '100%', maxWidth: '440px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 24px 64px rgba(15,23,42,0.18)', animation: 'modalFadeIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}
                      >
                        <div>
                          <h3 id="adhoc-booking-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>⚡ Spontanbelegung buchen</h3>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 550 }}>
                            Buche ad-hoc freie Zeitkapazitäten für {rooms.find(r => r.id === adHocRoomId)?.name || 'diesen Raum'}.
                          </p>
                        </div>

                        {/* Teacher Selector */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label htmlFor="adhoc-teacher-select" style={{ fontSize: '0.67rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lehrkraft auswählen</label>
                          <select
                            id="adhoc-teacher-select"
                            aria-label="Lehrkraft für Spontanbelegung auswählen"
                            required
                            value={adHocTeacherId}
                            onChange={(e) => setAdHocTeacherId(e.target.value)}
                            style={{ padding: '8px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 700, color: '#475569', cursor: 'pointer', outline: 'none' }}
                          >
                            <option value="">— Bitte Lehrkraft wählen —</option>
                            {campusTeachers.map(t => (
                              <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.instrument})</option>
                            ))}
                          </select>
                        </div>

                        {/* Student Name input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label htmlFor="adhoc-student-name" style={{ fontSize: '0.67rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Schüler / Zweck (Optional)</label>
                          <input
                            id="adhoc-student-name"
                            aria-label="Schüler oder Zweck für Spontanbelegung"
                            type="text"
                            placeholder="z.B. Nachholstunde Max Muster, oder Freies Üben"
                            value={adHocStudentName}
                            onChange={(e) => setAdHocStudentName(e.target.value)}
                            style={{ padding: '8px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 700, outline: 'none' }}
                          />
                        </div>

                        {/* Start Time & Duration Picker */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label htmlFor="adhoc-start-time" style={{ fontSize: '0.67rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Startzeit</label>
                            <input
                              id="adhoc-start-time"
                              aria-label="Startzeit für Spontanbelegung"
                              type="time"
                              value={adHocStartTime}
                              onChange={(e) => setAdHocStartTime(e.target.value)}
                              style={{ padding: '8px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 700, color: '#475569', outline: 'none' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label htmlFor="adhoc-duration" style={{ fontSize: '0.67rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dauer</label>
                            <select
                              id="adhoc-duration"
                              aria-label="Dauer für Spontanbelegung"
                              value={adHocDuration}
                              onChange={(e) => setAdHocDuration(Number(e.target.value))}
                              style={{ padding: '8px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 700, color: '#475569', cursor: 'pointer', outline: 'none' }}
                            >
                              <option value={30}>30 Min.</option>
                              <option value={45}>45 Min.</option>
                              <option value={50}>50 Min.</option>
                              <option value={60}>60 Min.</option>
                              <option value={90}>90 Min.</option>
                            </select>
                          </div>
                        </div>

                        {/* Submit / Cancel Buttons */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                          <button
                            type="submit"
                            style={{ flex: 1.5, background: '#ea4335', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(234,67,53,0.3)' }}
                          >
                            Einbuchen ⚡
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAdHocBooking(false);
                              setAdHocStudentName('');
                            }}
                            style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Abbrechen
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* DETAIL DRAWER PANEL (CLICK ON ANY PLAN BLOCK TO INSPECT) */}
                  {/* ──────────────────────────────────────────────────────── */}
                  {selectedDayPlan && (
                    <div 
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="dayplan-inspect-title"
                      style={{ position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh', background: 'white', boxShadow: '-12px 0 48px rgba(15,23,42,0.14)', borderLeft: '1px solid #e2e8f0', zIndex: 1050, display: 'flex', flexDirection: 'column', padding: '24px', animation: 'modalFadeIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
                        <div>
                          <span style={{ fontSize: '0.63rem', fontWeight: 800, color: '#f59e0b', background: '#fffbeb', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '6px' }}>
                            {['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][selectedDayPlan.dayOfWeek]} Plan
                          </span>
                          <h3 id="dayplan-inspect-title" style={{ margin: '0 0 2px 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>{getPlanDisplayName(selectedDayPlan)}</h3>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>🎸 {selectedDayPlan.instrument}</span>
                        </div>
                        <button 
                          type="button"
                          aria-label="Details schließen"
                          onClick={() => setSelectedDayPlan(null)} 
                          style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '7px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Room selector */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
                        <label style={{ fontSize: '0.67rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em' }}>Unterrichtsraum zuweisen</label>
                        <select
                          value={selectedDayPlan.roomId || ''}
                          onChange={(e) => {
                            const targetRoomId = e.target.value || null;
                            setMatrixAllocations(prev => prev.map(p => {
                              if (p.id === selectedDayPlan.id) {
                                const updated = { ...p, roomId: targetRoomId };
                                setTimeout(() => setSelectedDayPlan(updated), 0);
                                return updated;
                              }
                              return p;
                            }));
                          }}
                          style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '9px 12px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="">— Kein Raum (zurücksetzen) —</option>
                          {rooms.filter(r => r.is_campus_active !== false).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        
                        {!selectedDayPlan.id.startsWith('adhoc_') && (
                          <button
                            onClick={() => handleRejectTeacherDayPlan(selectedDayPlan)}
                            style={{ background: 'rgba(239,68,68,0.05)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '9px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', width: '100%' }}
                          >
                            ↩ Zur Überarbeitung zurückweisen
                          </button>
                        )}

                        {/* Split / Merge Block Controls */}
                        {(() => {
                          const splits = getSplitPoints(selectedDayPlan);
                          const isAlreadySplit = selectedDayPlan.id.includes('_split');
                          
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                              {isAlreadySplit && (
                                <button
                                  onClick={() => handleMergePlans(selectedDayPlan)}
                                  style={{ background: 'rgba(52,168,83,0.05)', color: '#34a853', border: '1px solid rgba(52,168,83,0.2)', padding: '9px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                  🔗 Aufteilung aufheben (Zusammenfügen)
                                </button>
                              )}
                              
                              {!isAlreadySplit && splits.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em' }}>Block aufteilen (Pause gefunden)</span>
                                  {splits.map((pt, pIdx) => (
                                    <button
                                      key={pIdx}
                                      onClick={() => handleSplitPlan(selectedDayPlan, pt.index)}
                                      style={{ background: 'rgba(245,158,11,0.05)', color: '#d97706', border: '1px solid rgba(245,158,11,0.2)', padding: '9px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', width: '100%' }}
                                    >
                                      ✂️ Block teilen an Pause um {pt.time} ({pt.duration} Min.)
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Slot list */}
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em' }}>Stundenliste</h4>
                        {selectedDayPlan.teacherId === 'groovelab' ? (
                          <div style={{ padding: '9px 11px', borderRadius: '10px', border: '1px solid #f1f5f9', background: '#f8fafc', borderLeft: '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1d1d1f' }}>
                                GrooveLab Betriebszeit
                              </span>
                              <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 650, display: 'block', marginTop: '1px' }}>
                                Virtueller Termin für Raumzuteilung
                              </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.73rem', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>
                                {selectedDayPlan.startTime}–{selectedDayPlan.endTime}
                              </span>
                            </div>
                          </div>
                        ) : (
                          selectedDayPlan.slots.map((slot: any, idx: number) => {
                            const isBreak = !slot.student_id && !selectedDayPlan.id.startsWith('adhoc_');
                            return (
                              <div key={idx} style={{ padding: '9px 11px', borderRadius: '10px', border: '1px solid #f1f5f9', background: isBreak ? '#fffbeb' : '#f8fafc', borderLeft: isBreak ? '4px solid #f59e0b' : '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1d1d1f' }}>
                                    {isBreak ? '☕ Pause' : slot.student_name}
                                  </span>
                                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 650, display: 'block', marginTop: '1px' }}>
                                    {isBreak ? 'Pause' : `Instrument: ${slot.student_instrument || selectedDayPlan.instrument || 'Instrument'}`}
                                  </span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontSize: '0.73rem', fontWeight: 900, fontFamily: 'monospace', color: isBreak ? '#b45309' : '#0f172a' }}>{slot.time_slot}</span>
                                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginTop: '1px' }}>{slot.duration} Min</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Subtab: Einstellungen (formerly Status & API) */}
              {campusSubTab === 'status' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', textAlign: 'left' }}>
                      ⚙️ Einstellungen
                    </h2>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>
                      Wähle ein Modul aus, um Menü-Boards, Hausaufgabenheft, Übe-Timer, Stundenplan-Raster und Berechtigungen für deinen Campus zu konfigurieren.
                    </p>
                  </div>

                  {/* MODULAR COVER CARDS GRID (CAMPUS GREEN #34a853) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: windowWidth < 640 ? 'repeat(2, 1fr)' : windowWidth < 1024 ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '18px',
                    width: '100%'
                  }}>
                    {[
                      {
                        id: 'boards',
                        title: 'Menü- & Board-Struktur',
                        subtitle: 'Fächer, Räume, Termine, Pläne',
                        badge: `${[enabledCampusSubjects, enabledCampusRooms, enabledCampusEvents, enabledCampusSchedules].filter(Boolean).length} Boards Aktiv`,
                        gradient: 'linear-gradient(135deg, #34a853 0%, #15803d 100%)',
                        shadowColor: 'rgba(52, 168, 83, 0.40)',
                        icon: LayoutGrid
                      },
                      {
                        id: 'homework',
                        title: 'Hausaufgaben & Protokoll',
                        subtitle: 'Hausaufgabenheft & Meisterwerk',
                        badge: campusHomeworkNotesSync ? 'Auto-Sync An' : 'Manuell',
                        gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                        shadowColor: 'rgba(16, 185, 129, 0.40)',
                        icon: BookOpen
                      },
                      {
                        id: 'timer',
                        title: 'Übe-Timer & Audio-Loopstation',
                        subtitle: `${campusFocusTimerDefaultMin} Min Focus • ${campusLoopstationBarsPause}-Takte Loop-Puffer`,
                        badge: `${campusFocusTimerDefaultMin} Min • Loopstation`,
                        gradient: 'linear-gradient(135deg, #059669 0%, #065f46 100%)',
                        shadowColor: 'rgba(5, 150, 105, 0.40)',
                        icon: Clock
                      },
                      {
                        id: 'schedule',
                        title: 'Stundenplan & Zeitraster',
                        subtitle: `${campusScheduleSlotMinutes} Min Takt • Konflikt-Check`,
                        badge: `${campusScheduleSlotMinutes} Min Raster`,
                        gradient: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
                        shadowColor: 'rgba(13, 148, 136, 0.40)',
                        icon: Calendar
                      },
                      {
                        id: 'parent',
                        title: 'Eltern-Portal & Freigaben',
                        subtitle: 'Abwesenheiten, Chat & DSGVO',
                        badge: campusParentChatEnabled ? 'Chat Aktiv' : 'Nur Abwesenheit',
                        gradient: 'linear-gradient(135deg, #16a34a 0%, #166534 100%)',
                        shadowColor: 'rgba(22, 163, 74, 0.40)',
                        icon: Users
                      },
                      {
                        id: 'kiosk',
                        title: 'Campus-Kiosk & QR-Login',
                        subtitle: `${campusKioskPinLength}-stellig • ${enabledQrLogin ? 'QR-Login An' : 'Passwort'}`,
                        badge: enabledQrLogin ? 'QR-Login Aktiv' : 'PIN & Passwort',
                        gradient: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                        shadowColor: 'rgba(34, 197, 94, 0.40)',
                        icon: QrCode
                      },
                      {
                        id: 'permissions',
                        title: 'Lehrkräfte-Rechte',
                        subtitle: 'Schüler- & Lehrer-Rollen im Campus',
                        badge: campusTeachersManageStudents ? 'Erweitert' : 'Standard',
                        gradient: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
                        shadowColor: 'rgba(46, 125, 50, 0.40)',
                        icon: ShieldCheck
                      },
                      {
                        id: 'feedback',
                        title: 'Ideenschmiede Campus',
                        subtitle: 'Wünsche & Fehler melden',
                        badge: 'Mitgestalten',
                        gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        shadowColor: 'rgba(5, 150, 105, 0.40)',
                        icon: Lightbulb
                      }
                    ].map((module) => {
                      const IconComp = module.icon;
                      return (
                        <div
                          key={module.id}
                          onClick={() => {
                            if (module.id === 'feedback') {
                              setIsFeedbackModalOpen(true);
                              return;
                            }
                            setActiveCampusSettingsModal(module.id as any);
                          }}
                          style={{
                            background: '#ffffff',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '20px',
                            padding: '24px 16px 20px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 14px 28px -6px rgba(0,0,0,0.08), 0 4px 8px -2px rgba(0,0,0,0.04)';
                            e.currentTarget.style.borderColor = '#34a853';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                          }}
                        >
                          {/* Accent Top Line */}
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '3.5px',
                            background: module.gradient
                          }} />

                          {/* App Squircle Icon */}
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            background: module.gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            boxShadow: `0 8px 18px -4px ${module.shadowColor}`,
                            marginBottom: '14px',
                            flexShrink: 0
                          }}>
                            <IconComp size={28} color="#ffffff" strokeWidth={2.2} />
                          </div>

                          {/* Title */}
                          <h4 style={{
                            margin: '0 0 6px 0',
                            fontSize: '1.02rem',
                            fontWeight: 900,
                            color: '#0f172a',
                            fontFamily: 'Urbanist, sans-serif',
                            lineHeight: 1.2
                          }}>
                            {module.title}
                          </h4>

                          {/* Subtitle */}
                          <p style={{
                            margin: '0 0 14px 0',
                            fontSize: '0.78rem',
                            color: '#64748b',
                            lineHeight: 1.35,
                            minHeight: '28px'
                          }}>
                            {module.subtitle}
                          </p>

                          {/* Status Badge */}
                          <span style={{
                            marginTop: 'auto',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#15803d',
                            background: '#e6f4ea',
                            border: '1px solid #bbf7d0',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            letterSpacing: '0.02em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {module.badge}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* FOCUS MODAL FOR CAMPUS SETTINGS */}
                  {activeCampusSettingsModal && (
                    <div 
                      role="dialog"
                      aria-modal="true"
                      aria-label="Campus Einstellungen"
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(15, 23, 42, 0.55)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        boxSizing: 'border-box'
                      }}
                      onClick={(e) => {
                        if (e.target === e.currentTarget) setActiveCampusSettingsModal(null);
                      }}
                    >
                      <div 
                        style={{
                          width: '100%',
                          maxWidth: '680px',
                          maxHeight: '90vh',
                          background: '#ffffff',
                          borderRadius: '24px',
                          border: '1px solid rgba(255, 255, 255, 0.8)',
                          boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.35)',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                        className="animate-scale-in"
                      >
                        {/* Modal Header */}
                        <div style={{
                          padding: '20px 24px',
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#f8fafc'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '12px',
                              background: 'linear-gradient(135deg, #34a853 0%, #15803d 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 12px rgba(52, 168, 83, 0.35)'
                            }}>
                              {activeCampusSettingsModal === 'boards' && <LayoutGrid size={22} color="#ffffff" />}
                              {activeCampusSettingsModal === 'homework' && <BookOpen size={22} color="#ffffff" />}
                              {activeCampusSettingsModal === 'timer' && <Clock size={22} color="#ffffff" />}
                              {activeCampusSettingsModal === 'schedule' && <Calendar size={22} color="#ffffff" />}
                              {activeCampusSettingsModal === 'parent' && <Users size={22} color="#ffffff" />}
                              {activeCampusSettingsModal === 'kiosk' && <QrCode size={22} color="#ffffff" />}
                              {activeCampusSettingsModal === 'permissions' && <ShieldCheck size={22} color="#ffffff" />}
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                {activeCampusSettingsModal === 'boards' && 'Menü- & Board-Struktur'}
                                {activeCampusSettingsModal === 'homework' && 'Hausaufgaben & Schüler-Protokoll'}
                                {activeCampusSettingsModal === 'timer' && 'Übe-Timer & Audio-Loopstation'}
                                {activeCampusSettingsModal === 'schedule' && 'Stundenplan & Zeitraster'}
                                {activeCampusSettingsModal === 'parent' && 'Eltern-Portal & DSGVO-Freigaben'}
                                {activeCampusSettingsModal === 'kiosk' && 'Campus-Kiosk & Schnellzugang'}
                                {activeCampusSettingsModal === 'permissions' && 'Lehrkräfte-Berechtigungen'}
                              </h3>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                                {activeCampusSettingsModal === 'boards' && 'Aktiviere oder deaktiviere boardspezifische Menüeinträge deiner Musikschule.'}
                                {activeCampusSettingsModal === 'homework' && 'Konfiguriere Hausaufgabenheft-Sync und Meisterwerk-Dokumentation.'}
                                {activeCampusSettingsModal === 'timer' && 'Steuere Focus-Timer-Standards, 4-Takte Loopstation-Puffer und Audio-Tresor Limits.'}
                                {activeCampusSettingsModal === 'schedule' && 'Definiere Zeitraster, Taktung und Konfliktwarnungen für Räume.'}
                                {activeCampusSettingsModal === 'parent' && 'Lege DSGVO-sichere Voreinstellungen für Eltern und Erziehungsberechtigte fest.'}
                                {activeCampusSettingsModal === 'kiosk' && 'Verwalte QR-Authentifizierung und Terminal-PIN-Richtlinien.'}
                                {activeCampusSettingsModal === 'permissions' && 'Reguliere Berechtigungen von Lehrkräften zur Datenpflege.'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveCampusSettingsModal(null)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              border: '1px solid #e2e8f0',
                              background: '#ffffff',
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: 'calc(90vh - 140px)' }}>
                          
                          {/* 1. BOARDS */}
                          {activeCampusSettingsModal === 'boards' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {[
                                { key: 'gl_setting_subjects', label: 'Unterrichtsfächer', desc: 'Erlaubt die Definition spezifischer Instrumente & Fächer für Lehrkräfte.', val: enabledCampusSubjects, set: setEnabledCampusSubjects, icon: BookOpen },
                                { key: 'gl_setting_rooms', label: 'Räume', desc: 'Konfiguriert physische Unterrichtsräume und überwacht deren Schlüssel-Status.', val: enabledCampusRooms, set: setEnabledCampusRooms, icon: DoorOpen },
                                { key: 'gl_setting_events', label: 'Termine & Schulferien', desc: 'Verwaltet zentrale Ferienzeiten, Schulfeste und interne Event-Planung.', val: enabledCampusEvents, set: setEnabledCampusEvents, icon: Calendar },
                                { key: 'gl_setting_schedules', label: 'Stundenpläne', desc: 'Aktiviert den Prüf- und Freigabe-Workflow für eingereichte Lehrerstundenpläne.', val: enabledCampusSchedules, set: setEnabledCampusSchedules, icon: Clock }
                              ].map((item) => {
                                const ItemIcon = item.icon;
                                return (
                                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '75%' }}>
                                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: item.val ? '#e6f4ea' : '#f1f5f9', color: item.val ? '#34a853' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ItemIcon size={18} />
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{item.label}</div>
                                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>{item.desc}</div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleToggleSetting(item.key, !item.val, item.set)}
                                      style={{
                                        padding: '6px 14px',
                                        borderRadius: '100px',
                                        border: 'none',
                                        background: item.val ? '#34a853' : '#e2e8f0',
                                        color: item.val ? '#ffffff' : '#64748b',
                                        fontWeight: 800,
                                        fontSize: '0.76rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      {item.val ? 'Aktiv' : 'Deaktiviert'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* 2. HOMEWORK */}
                          {activeCampusSettingsModal === 'homework' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Automatische Notizen-Synchronisation</div>
                                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Synchronisiert Hausaufgabeneinträge der Lehrkraft in Echtzeit in die Schülervorschau.</div>
                                </div>
                                <button
                                  onClick={() => handleSaveSettingValue('gl_campus_homework_notes_sync', !campusHomeworkNotesSync, setCampusHomeworkNotesSync)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    border: 'none',
                                    background: campusHomeworkNotesSync ? '#34a853' : '#e2e8f0',
                                    color: campusHomeworkNotesSync ? '#ffffff' : '#64748b',
                                    fontWeight: 800,
                                    fontSize: '0.76rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {campusHomeworkNotesSync ? 'Aktiv' : 'Deaktiviert'}
                                </button>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Meisterwerk-Dokumentation</div>
                                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Ermöglicht das Festhalten von Meilensteinen und Urkunden im Schüler-Protokoll.</div>
                                </div>
                                <button
                                  onClick={() => handleSaveSettingValue('gl_campus_meisterwerk_enabled', !campusMeisterwerkEnabled, setCampusMeisterwerkEnabled)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    border: 'none',
                                    background: campusMeisterwerkEnabled ? '#34a853' : '#e2e8f0',
                                    color: campusMeisterwerkEnabled ? '#ffffff' : '#64748b',
                                    fontWeight: 800,
                                    fontSize: '0.76rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {campusMeisterwerkEnabled ? 'Aktiv' : 'Deaktiviert'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 3. TIMER & LOOPSTATION */}
                          {activeCampusSettingsModal === 'timer' && (() => {
                            const currentFokusLevels = openingHours?.fokus_levels || DEFAULT_FOKUS_LEVELS;

                            const handleUpdateFokusMinutes = (levelKey: 'level1' | 'level2' | 'level3', flameKey: 'kleine' | 'mittlere' | 'helden', val: number) => {
                              const safeVal = Math.max(1, Math.min(60, val));
                              const updated = JSON.parse(JSON.stringify(currentFokusLevels));
                              if (!updated[levelKey]) updated[levelKey] = { ...(DEFAULT_FOKUS_LEVELS as any)[levelKey] };
                              updated[levelKey][flameKey] = safeVal;
                              handleSaveSettingValue('fokus_levels', updated);
                            };

                            const handleResetFokusLevels = () => {
                              handleSaveSettingValue('fokus_levels', DEFAULT_FOKUS_LEVELS);
                            };

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {/* 3-LEVEL STREAK PROGRESSION MATRIX */}
                                <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                    <div>
                                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Clock size={16} style={{ color: '#34a853' }} />
                                        <span>Pädagogische Fokus-Timer Vorgaben</span>
                                      </div>
                                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                                        Jedes Alter startet in Stufe 1. Mit zunehmender Streak-Ausdauer steigen Schüler in Stufe 2 und 3 auf.
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={handleResetFokusLevels}
                                      style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        color: '#475569',
                                        cursor: 'pointer'
                                      }}
                                      title="Auf didaktische Standardwerte zurücksetzen"
                                    >
                                      Standard-Werte
                                    </button>
                                  </div>

                                  {/* 3 Stufen Kacheln */}
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
                                    {[
                                      {
                                        key: 'level1' as const,
                                        title: '🥚 Stufe 1: Habit-Starter',
                                        subtitle: 'Start für ALLE Schüler',
                                        defaults: DEFAULT_FOKUS_LEVELS.level1
                                      },
                                      {
                                        key: 'level2' as const,
                                        title: '🐥 Stufe 2: Streak-Routinier',
                                        subtitle: '14+ Tage Streak / 250m',
                                        defaults: DEFAULT_FOKUS_LEVELS.level2
                                      },
                                      {
                                        key: 'level3' as const,
                                        title: '🦅 Stufe 3: Fokus-Virtuose',
                                        subtitle: '45+ Tage Streak / 1.000m',
                                        defaults: DEFAULT_FOKUS_LEVELS.level3
                                      }
                                    ].map((lvl) => {
                                      const conf = currentFokusLevels[lvl.key] || lvl.defaults;
                                      return (
                                        <div key={lvl.key} style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                          <div>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{lvl.title}</div>
                                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>{lvl.subtitle}</div>
                                          </div>

                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                                            {[
                                              { k: 'kleine' as const, label: '🔥 Klein (1–3 T.)' },
                                              { k: 'mittlere' as const, label: '🔥🔥 Standard (4–8 T.)' },
                                              { k: 'helden' as const, label: '👑 Helden (9+ T.)' }
                                            ].map((flame) => (
                                              <div key={flame.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 650 }}>{flame.label}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    max="60"
                                                    value={conf[flame.k] ?? lvl.defaults[flame.k]}
                                                    onChange={(e) => handleUpdateFokusMinutes(lvl.key, flame.k, parseInt(e.target.value) || 1)}
                                                    style={{
                                                      width: '44px',
                                                      padding: '3px 6px',
                                                      textAlign: 'center',
                                                      fontSize: '0.78rem',
                                                      fontWeight: 800,
                                                      border: '1px solid #cbd5e1',
                                                      borderRadius: '6px',
                                                      background: '#f8fafc',
                                                      color: '#0f172a',
                                                      outline: 'none'
                                                    }}
                                                  />
                                                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Min</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Zwingende Loopstation-Pause (Sample-Genauigkeit)</div>
                                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Verhindert verschluckte Anschläge (Swallowed Attack) bei Mehrspur-Aufnahmen im Solo-Übestudio.</div>
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    {[2, 4, 8].map((bars) => (
                                      <button
                                        key={bars}
                                        onClick={() => handleSaveSettingValue('gl_campus_loopstation_bars_pause', bars, setCampusLoopstationBarsPause)}
                                        style={{
                                          flex: 1,
                                          padding: '8px',
                                          borderRadius: '10px',
                                          border: '1.5px solid',
                                          borderColor: campusLoopstationBarsPause === bars ? '#34a853' : '#e2e8f0',
                                          background: campusLoopstationBarsPause === bars ? '#e6f4ea' : '#ffffff',
                                          color: campusLoopstationBarsPause === bars ? '#166534' : '#64748b',
                                          fontWeight: 800,
                                          fontSize: '0.8rem',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {bars} Takte {bars === 4 && '(Standard)'}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Maximale Audio-Aufnahmedauer pro Take</div>
                                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Schützt den Cloud-Speicher vor überlangen unkomprimierten Sprach- und Audiomitschnitten.</div>
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    {[5, 10, 15].map((min) => (
                                      <button
                                        key={min}
                                        onClick={() => handleSaveSettingValue('gl_campus_audio_max_min', min, setCampusAudioMaxSessionMinutes)}
                                        style={{
                                          flex: 1,
                                          padding: '8px',
                                          borderRadius: '10px',
                                          border: '1.5px solid',
                                          borderColor: campusAudioMaxSessionMinutes === min ? '#34a853' : '#e2e8f0',
                                          background: campusAudioMaxSessionMinutes === min ? '#e6f4ea' : '#ffffff',
                                          color: campusAudioMaxSessionMinutes === min ? '#166534' : '#64748b',
                                          fontWeight: 800,
                                          fontSize: '0.8rem',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {min} Min
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* 4. SCHEDULE */}
                          {activeCampusSettingsModal === 'schedule' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Unterrichts-Taktung / Zeiteinheiten</div>
                                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Standard-Raster im intelligenten Stundenplan-Designer.</div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                  {[30, 45, 60].map((slot) => (
                                    <button
                                      key={slot}
                                      onClick={() => handleSaveSettingValue('gl_campus_schedule_slot_min', slot, setCampusScheduleSlotMinutes)}
                                      style={{
                                        flex: 1,
                                        padding: '8px',
                                        borderRadius: '10px',
                                        border: '1.5px solid',
                                        borderColor: campusScheduleSlotMinutes === slot ? '#34a853' : '#e2e8f0',
                                        background: campusScheduleSlotMinutes === slot ? '#e6f4ea' : '#ffffff',
                                        color: campusScheduleSlotMinutes === slot ? '#166534' : '#64748b',
                                        fontWeight: 800,
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {slot} Min
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Raum- und Doppelbelegungswarnung</div>
                                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Warnt die Verwaltung sofort, wenn ein Raum zeitgleich für zwei Lehrkräfte eingeteilt wird.</div>
                                </div>
                                <button
                                  onClick={() => handleSaveSettingValue('gl_campus_schedule_conflict_warning', !campusScheduleConflictWarning, setCampusScheduleConflictWarning)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    border: 'none',
                                    background: campusScheduleConflictWarning ? '#34a853' : '#e2e8f0',
                                    color: campusScheduleConflictWarning ? '#ffffff' : '#64748b',
                                    fontWeight: 800,
                                    fontSize: '0.76rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {campusScheduleConflictWarning ? 'Aktiv' : 'Deaktiviert'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 5. PARENT */}
                          {activeCampusSettingsModal === 'parent' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Digitale Abwesenheitsmeldung</div>
                                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Erlaubt Eltern, Abwesenheiten und Unterrichtsausfälle direkt per Klick zu melden.</div>
                                </div>
                                <button
                                  onClick={() => handleSaveSettingValue('gl_campus_parent_absence_notify', !campusParentAbsenceNotify, setCampusParentAbsenceNotify)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    border: 'none',
                                    background: campusParentAbsenceNotify ? '#34a853' : '#e2e8f0',
                                    color: campusParentAbsenceNotify ? '#ffffff' : '#64748b',
                                    fontWeight: 800,
                                    fontSize: '0.76rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {campusParentAbsenceNotify ? 'Aktiv' : 'Deaktiviert'}
                                </button>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Direkte Schulkommunikation &amp; Chat</div>
                                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>DSGVO-konforme Direktnachrichten zwischen Lehrkraft und Erziehungsberechtigten.</div>
                                </div>
                                <button
                                  onClick={() => handleSaveSettingValue('gl_campus_parent_chat_enabled', !campusParentChatEnabled, setCampusParentChatEnabled)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    border: 'none',
                                    background: campusParentChatEnabled ? '#34a853' : '#e2e8f0',
                                    color: campusParentChatEnabled ? '#ffffff' : '#64748b',
                                    fontWeight: 800,
                                    fontSize: '0.76rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {campusParentChatEnabled ? 'Aktiv' : 'Deaktiviert'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 6. KIOSK */}
                          {activeCampusSettingsModal === 'kiosk' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>QR-Code Authentifizierung</div>
                                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Erlaubt passwortlosen Portal-Zugang für Endnutzer via scannbare QR-Codes.</div>
                                </div>
                                <button
                                  onClick={() => handleToggleSetting('gl_setting_qr_login', !enabledQrLogin, setEnabledQrLogin)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    border: 'none',
                                    background: enabledQrLogin ? '#34a853' : '#e2e8f0',
                                    color: enabledQrLogin ? '#ffffff' : '#64748b',
                                    fontWeight: 800,
                                    fontSize: '0.76rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {enabledQrLogin ? 'Aktiv' : 'Deaktiviert'}
                                </button>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Kalender-Widget auf Startseite</div>
                                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Blendet die heutige Betriebsübersicht im Startseiten-Panel ein.</div>
                                </div>
                                <button
                                  onClick={() => handleToggleSetting('gl_setting_calendar_widget', !enabledCalendarWidget, setEnabledCalendarWidget)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    border: 'none',
                                    background: enabledCalendarWidget ? '#34a853' : '#e2e8f0',
                                    color: enabledCalendarWidget ? '#ffffff' : '#64748b',
                                    fontWeight: 800,
                                    fontSize: '0.76rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {enabledCalendarWidget ? 'Aktiv' : 'Deaktiviert'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 7. PERMISSIONS */}
                          {activeCampusSettingsModal === 'permissions' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Schüler hinzufügen &amp; verwalten</div>
                                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Erlaubt Lehrkräften, im Campus-Modul neue Schüler-Profile anzulegen oder zu bearbeiten.</div>
                                </div>
                                <button
                                  onClick={() => handleToggleSetting('gl_setting_campus_teachers_manage_students', !campusTeachersManageStudents, setCampusTeachersManageStudents)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    border: 'none',
                                    background: campusTeachersManageStudents ? '#34a853' : '#e2e8f0',
                                    color: campusTeachersManageStudents ? '#ffffff' : '#64748b',
                                    fontWeight: 800,
                                    fontSize: '0.76rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {campusTeachersManageStudents ? 'Aktiv' : 'Deaktiviert'}
                                </button>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Lehrkräfte hinzufügen &amp; verwalten</div>
                                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Erlaubt Lehrkräften, im Campus-Modul Profile anderer Lehrer anzulegen oder zu bearbeiten.</div>
                                </div>
                                <button
                                  onClick={() => handleToggleSetting('gl_setting_campus_teachers_manage_teachers', !campusTeachersManageTeachers, setCampusTeachersManageTeachers)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    border: 'none',
                                    background: campusTeachersManageTeachers ? '#34a853' : '#e2e8f0',
                                    color: campusTeachersManageTeachers ? '#ffffff' : '#64748b',
                                    fontWeight: 800,
                                    fontSize: '0.76rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {campusTeachersManageTeachers ? 'Aktiv' : 'Deaktiviert'}
                                </button>
                              </div>
                            </div>
                          )}

                        </div>

                        {/* Modal Footer */}
                        <div style={{
                          padding: '16px 24px',
                          borderTop: '1px solid #f1f5f9',
                          display: 'flex',
                          justifyContent: 'flex-end',
                          background: '#f8fafc'
                        }}>
                          <button
                            onClick={() => setActiveCampusSettingsModal(null)}
                            style={{
                              padding: '10px 20px',
                              borderRadius: '12px',
                              border: 'none',
                              background: '#34a853',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '0.84rem',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)'
                            }}
                          >
                            Fertig
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Right Sidebar Pane */}
            {campusSubTab !== 'briefing' && campusSubTab !== 'events' && campusSubTab !== 'rooms' && campusSubTab !== 'status' && (
              <div style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '24px', flexShrink: 0 }}>


              {/* Onboarding Sidebar */}
              {campusSubTab === 'onboarding' && (() => {
                const allUniqueTeachers = [...(campusTeachers || []), ...(bypassTeachers || []), ...(coaches || [])].reduce((acc: any[], t: any) => {
                  if (!acc.some(existing => existing.id === t.id)) {
                    acc.push(t);
                  }
                  return acc;
                }, []);

                const instrumentCounts = allUniqueTeachers.reduce((acc: Record<string, number>, t: any) => {
                  const inst = t.instrument || 'Nicht festgelegt';
                  acc[inst] = (acc[inst] || 0) + 1;
                  return acc;
                }, {});

                const sortedInstruments = [...activeSubjectsList].sort((a, b) => a.localeCompare(b, 'de'));

                return (
                  <div className="google-card" style={{ 
                    padding: '24px', 
                    borderRadius: '24px', 
                    border: '1.5px solid #cbd5e1', 
                    background: '#ffffff',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Music size={20} style={{ color: '#0f172a' }} />
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                          Instrumente
                        </h4>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: '1.45', fontFamily: 'Inter' }}>
                        Klicke auf ein Instrument, um das Sammel-Onboarding zu filtern und Lehrer direkt dafür anzulegen.
                      </p>
                    </div>

                    {/* Instrument List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      
                      {/* "Alle Instrumente anzeigen" Row */}
                      {(() => {
                        const isActive = teacherFilterInstrument === 'All';
                        const isHovered = dragHoveredInstrument === 'All';
                        return (
                          <div
                            onClick={() => setTeacherFilterInstrument('All')}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragHoveredInstrument('All');
                            }}
                            onDragLeave={() => setDragHoveredInstrument(null)}
                            onDrop={(e) => {
                              const teacherId = e.dataTransfer.getData("teacherId");
                              if (teacherId) {
                                handleUpdateTeacherInstrument(teacherId, 'Allgemein');
                              }
                              setDragHoveredInstrument(null);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '16px',
                              border: isHovered 
                                ? '2px dashed #34a853' 
                                : isActive 
                                  ? '1.5px solid #34a853' 
                                  : '1.5px solid #cbd5e1',
                              background: isHovered 
                                ? '#e6f4ea' 
                                : isActive 
                                  ? '#e6f4ea' 
                                  : '#ffffff',
                              cursor: 'pointer',
                              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: isActive ? '0 4px 12px rgba(52,168,83,0.06)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {/* Circle Icon */}
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: '#f1f5f9',
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <Music size={18} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                  Alle Instrumente anzeigen
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                  Gesamtübersicht
                                </span>
                              </div>
                            </div>
                            
                            {/* Badge */}
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '10px',
                              background: isActive ? '#e6f4ea' : '#f1f5f9',
                              color: isActive ? '#34a853' : '#64748b',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              fontFamily: 'Urbanist',
                              whiteSpace: 'nowrap'
                            }}>
                              {allUniqueTeachers.length} Lehrer
                            </span>
                          </div>
                        );
                      })()}

                      {/* Individual Instrument Rows */}
                      {sortedInstruments.map((instName) => {
                        const isActive = teacherFilterInstrument === instName;
                        const isHovered = dragHoveredInstrument === instName;
                        const count = instrumentCounts[instName] || 0;
                        
                        const { avatarBg, avatarColor } = getAlphabeticalColor(instName);

                        return (
                          <div
                            key={instName}
                            onClick={() => setTeacherFilterInstrument(isActive ? 'All' : instName)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragHoveredInstrument(instName);
                            }}
                            onDragLeave={() => setDragHoveredInstrument(null)}
                            onDrop={(e) => {
                              const teacherId = e.dataTransfer.getData("teacherId");
                              if (teacherId) {
                                handleUpdateTeacherInstrument(teacherId, instName);
                              }
                              setDragHoveredInstrument(null);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '16px',
                              border: isHovered 
                                ? '2px dashed #34a853' 
                                : isActive 
                                  ? '1.5px solid #34a853' 
                                  : '1.5px solid #f1f5f9',
                              background: isHovered 
                                ? '#e6f4ea' 
                                : isActive 
                                  ? '#e6f4ea' 
                                  : '#ffffff',
                              cursor: 'pointer',
                              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {/* Circle Icon with first letter */}
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: avatarBg,
                                color: avatarColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 900,
                                fontFamily: 'Urbanist',
                                flexShrink: 0
                              }}>
                                {instName[0]?.toUpperCase() || 'I'}
                              </div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                {instName}
                              </span>
                            </div>
                            
                            {/* Badge */}
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '10px',
                              background: isActive ? '#e6f4ea' : '#f1f5f9',
                              color: isActive ? '#34a853' : '#64748b',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              fontFamily: 'Urbanist',
                              whiteSpace: 'nowrap'
                            }}>
                              {count} Lehrer
                            </span>
                          </div>
                        );
                      })}

                    </div>
                  </div>
                );
              })()}

              {/* Student Board Sidebar */}
              {campusSubTab === 'students' && (() => {
                const allUniqueTeachers = [...(campusTeachers || []), ...(bypassTeachers || []), ...(coaches || [])].reduce((acc: any[], t: any) => {
                  if (!acc.some(existing => existing.id === t.id)) {
                    acc.push(t);
                  }
                  return acc;
                }, []);

                const getAvatarGradient = (name: string) => getAlphabeticalColor(name).avatarBg;
                const getAvatarTextColor = (name: string) => getAlphabeticalColor(name).avatarColor;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '340px', flexShrink: 0 }}>
                    <div className="google-card" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                      padding: '24px',
                      borderRadius: '24px',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)'
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={20} style={{ color: '#0f172a' }} />
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        Lehrer
                      </h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.45, fontFamily: 'Inter' }}>
                      Klicke auf einen Lehrer, um das Sammel-Onboarding zu filtern und direkt Schüler für ihn zu erfassen.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '750px', overflowY: 'auto', paddingRight: '4px' }}>
                      
                      {/* Option / Slot für Alle Lehrer */}
                      {(() => {
                        const isActive = studentFilterTeacher === 'All';
                        return (
                          <div
                            onClick={() => {
                              setStudentFilterTeacher('All');
                              setStudentCurrentPage(1);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '16px',
                              border: isActive 
                                ? '1.5px solid #34a853' 
                                : '1.5px solid #f1f5f9',
                              background: isActive 
                                ? '#e6f4ea' 
                                : '#ffffff',
                              cursor: 'pointer',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: isActive ? '0 4px 12px rgba(52,168,83,0.06)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: '#e6f4ea',
                                color: '#34a853',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1rem',
                                flexShrink: 0
                              }}>
                                <Users size={18} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                  Alle Lehrer anzeigen
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                  Gesamtübersicht
                                </span>
                              </div>
                            </div>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '10px',
                              background: isActive ? '#e6f4ea' : '#f1f5f9',
                              color: isActive ? '#34a853' : '#64748b',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              fontFamily: 'Urbanist',
                              whiteSpace: 'nowrap'
                            }}>
                              {students.length} Schüler
                            </span>
                          </div>
                        );
                      })()}

                      {/* Fixed "Allgemein" entry for students without a teacher */}
                      {(() => {
                        const unassignedCount = students.filter(s => !s.teacher_id).length;
                        const isSelected = studentFilterTeacher === 'none';
                        const isHovered = dragHoveredTeacher === 'none';
                        return (
                          <div
                            key="allgemein"
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              setDragHoveredTeacher('none');
                            }}
                            onDragLeave={() => setDragHoveredTeacher(null)}
                            onDrop={(e) => {
                              const studentId = e.dataTransfer.getData("studentId") || e.dataTransfer.getData("text/plain");
                              if (studentId) {
                                handleUpdateStudentTeacher(studentId, null);
                              }
                              setDragHoveredTeacher(null);
                            }}
                            onClick={() => {
                              setStudentFilterTeacher('none');
                              setStudentCurrentPage(1);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '16px',
                              border: isHovered
                                ? '2px dashed #94a3b8'
                                : isSelected
                                  ? '1.5px solid #cbd5e1'
                                  : '1.5px solid #f1f5f9',
                              background: isHovered
                                ? '#f8fafc'
                                : isSelected
                                  ? '#f1f5f9'
                                  : '#ffffff',
                              cursor: 'pointer',
                              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: '#f1f5f9',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 900,
                                fontFamily: 'Urbanist',
                                flexShrink: 0
                              }}>
                                OZ
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                  Ohne Zuweisung
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                  Ohne Lehrerzuweisung
                                </span>
                              </div>
                            </div>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '10px',
                              background: isSelected ? '#e2e8f0' : '#f1f5f9',
                              color: isSelected ? '#334155' : '#64748b',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              fontFamily: 'Urbanist',
                              whiteSpace: 'nowrap'
                            }}>
                              {unassignedCount} Schüler
                            </span>
                          </div>
                        );
                      })()}

                      {allUniqueTeachers.map((t: any) => {
                        const teacherName = `${t.firstName || t.first_name || ''} ${t.lastName || t.last_name || ''}`.trim();
                        const assignedCount = students.filter(s => s.teacher_id === t.id).length;
                        const initials = `${t.firstName?.[0] || t.first_name?.[0] || ''}${t.lastName?.[0] || t.last_name?.[0] || ''}`.toUpperCase() || 'D';
                        const isSelected = studentFilterTeacher === t.id;
                        const isHovered = dragHoveredTeacher === t.id;

                        const avatarBg = getAvatarGradient(teacherName);
                        const avatarColor = getAvatarTextColor(teacherName);

                        return (
                          <div
                            key={t.id}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              setDragHoveredTeacher(t.id);
                            }}
                            onDragLeave={() => setDragHoveredTeacher(null)}
                            onDrop={(e) => {
                              const studentId = e.dataTransfer.getData("studentId") || e.dataTransfer.getData("text/plain");
                              if (studentId) {
                                handleUpdateStudentTeacher(studentId, t.id);
                              }
                              setDragHoveredTeacher(null);
                            }}
                            onClick={() => {
                              setStudentFilterTeacher(t.id);
                              setStudentCurrentPage(1);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '16px',
                              border: isHovered 
                                ? '2px dashed #34a853' 
                                : isSelected 
                                  ? '1.5px solid #34a853' 
                                  : '1.5px solid #f1f5f9',
                              background: isHovered 
                                ? '#e6f4ea' 
                                : isSelected 
                                  ? '#e6f4ea' 
                                  : '#ffffff',
                              cursor: 'pointer',
                              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: avatarBg,
                                color: avatarColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 900,
                                fontFamily: 'Urbanist',
                                flexShrink: 0
                              }}>
                                {initials}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {teacherName}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {t.instrument || 'Lehrer'}
                                </span>
                              </div>
                            </div>

                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '10px',
                              background: isSelected ? '#e6f4ea' : '#f1f5f9',
                              color: isSelected ? '#34a853' : '#64748b',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              fontFamily: 'Urbanist',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              {assignedCount} Schüler
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Apple HIG Datenschutz-Cockpit */}
                  <div className="google-card" style={{
                    padding: '24px',
                    borderRadius: '24px',
                    border: '1.5px solid #e2e8f0',
                    background: '#ffffff',
                    boxShadow: '0 10px 30px -5px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          background: '#e6f4ea',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <ShieldCheck size={18} style={{ color: '#34a853' }} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                          Datenschutz-Cockpit
                        </h3>
                      </div>
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        color: '#15803d',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }}></span>
                        DSGVO-KONFORM (ART. 32)
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.45, fontFamily: 'Inter' }}>
                      Aktive Sicherheitsstufen & TOMs nach Art. 32 DSGVO für Campus-Groovelab an dieser Musikschule.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { 
                          icon: <Lock size={15} style={{ color: '#0f172a' }} />,
                          title: 'PGP-Datenverschlüsselung', 
                          value: '100% Aktiv', 
                          desc: 'Verschlüsselung im Ruhezustand (Art. 32 DSGVO).',
                          legalNote: 'Schülervornamen und E-Mail-Fragmente werden kryptographisch mit PGP/AES im Ruhezustand (Encryption-at-Rest) in PostgreSQL isoliert.'
                        },
                        { 
                          icon: <ShieldCheck size={15} style={{ color: '#0f172a' }} />,
                          title: 'Schüler-Datenminimierung', 
                          value: '0 Kinder-E-Mails', 
                          desc: 'Keine E-Mails/Adressen erfasst (Art. 5 DSGVO).',
                          legalNote: 'Vollständige Einhaltung des Grundsatzes der Datenminimierung (Art. 5 Abs. 1 lit. c DSGVO) zum Schutz Minderjähriger (ErwGr. 38).'
                        },
                        { 
                          icon: <EyeOff size={15} style={{ color: '#0f172a' }} />,
                          title: 'Schulterblick-Schutz', 
                          value: 'Maskierung aktiv', 
                          desc: 'Pseudonymisierte Namensmaskierung (TOM Art. 32).',
                          legalNote: 'Standardmäßige Namens-Anonymisierung im Schulsekretariat zum Schutz vor unbefugter Einsichtnahme durch Dritte.'
                        },
                        { 
                          icon: <HardDrive size={15} style={{ color: '#0f172a' }} />,
                          title: 'Serverstandort Falkenstein', 
                          value: 'ISO 27001 (DE)', 
                          desc: 'Deutsches RZ ohne Drittlandtransfer (Art. 44).',
                          legalNote: 'Betrieb im DIN EN ISO/IEC 27001 zertifizierten deutschen Rechenzentrum (Hetzner Falkenstein). 100% EU-Datensouveränität.'
                        },
                        { 
                          icon: <Cpu size={15} style={{ color: '#0f172a' }} />,
                          title: 'Zero-Cloud Biometrie', 
                          value: '100% Lokal', 
                          desc: 'Reine Client-Side Bild-/QR-Verarbeitung (Art. 9).',
                          legalNote: 'QR- und Bildanalysen laufen ausschließlich lokal im Browser-Arbeitsspeicher (WASM/RAM). Keine biometrischen Daten nach Art. 9 DSGVO.'
                        }
                      ].map((item, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          background: '#f8fafc',
                          padding: '10px 12px',
                          borderRadius: '14px',
                          border: '1px solid #f1f5f9',
                          transition: 'all 0.15s ease'
                        }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}>
                            {item.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.title}
                              </span>
                              <span style={{
                                fontSize: '0.66rem',
                                fontWeight: 800,
                                color: '#15803d',
                                background: '#ecfdf5',
                                border: '1px solid #d1fae5',
                                padding: '2px 7px',
                                borderRadius: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                flexShrink: 0
                              }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                                {item.value}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35 }} title={item.legalNote}>
                              {item.desc}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
              })()}


              {/* Schedules Sidebar – Live Stats & Submissions */}
              {campusSubTab === 'schedules' && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  minWidth: '320px',
                  borderRadius: '16px',
                  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.03)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif'
                }}>
                  
                  {/* Segmented Control for Switchable Tabs */}
                  <div style={{
                    display: 'flex',
                    background: 'rgba(120, 120, 128, 0.08)',
                    padding: '2px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 0, 0, 0.02)'
                  }}>
                    <button
                      type="button"
                      onClick={() => setSchedulesSidebarTab('submissions')}
                      style={{
                        flex: 1,
                        background: schedulesSidebarTab === 'submissions' ? '#ffffff' : 'transparent',
                        color: schedulesSidebarTab === 'submissions' ? '#1c1c1e' : '#8e8e93',
                        border: 'none',
                        boxShadow: schedulesSidebarTab === 'submissions' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04)' : 'none',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <ClipboardList size={13} style={{ color: schedulesSidebarTab === 'submissions' ? '#34a853' : '#8e8e93' }} />
                      Einreichungen
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchedulesSidebarTab('stats')}
                      style={{
                        flex: 1,
                        background: schedulesSidebarTab === 'stats' ? '#ffffff' : 'transparent',
                        color: schedulesSidebarTab === 'stats' ? '#1c1c1e' : '#8e8e93',
                        border: 'none',
                        boxShadow: schedulesSidebarTab === 'stats' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04)' : 'none',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <BarChart2 size={13} style={{ color: schedulesSidebarTab === 'stats' ? '#34a853' : '#8e8e93' }} />
                      Wochenauslastung
                    </button>
                  </div>

                  {schedulesSidebarTab === 'submissions' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Submissions header */}
                      <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#1c1c1e' }}>
                        Offene Zuteilungen ({matrixAllocations.filter(p => !p.roomId).length} Tage offen)
                      </h4>

                      {/* Apple-Style Search Filter for Teachers */}
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Search size={14} style={{ position: 'absolute', left: '12px', color: '#8e8e93', pointerEvents: 'none' }} />
                        <input
                          type="text"
                          placeholder="Lehrkraft filtern..."
                          value={sidebarTeacherSearch}
                          onChange={(e) => setSidebarTeacherSearch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 32px 8px 34px',
                            fontSize: '0.78rem',
                            fontWeight: 500,
                            background: 'rgba(118, 118, 128, 0.08)',
                            color: '#1c1c1e',
                            border: '1px solid rgba(0, 0, 0, 0.06)',
                            borderRadius: '10px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                          }}
                          onFocus={(e) => {
                            e.target.style.background = '#ffffff';
                            e.target.style.borderColor = '#34a853';
                            e.target.style.boxShadow = '0 0 0 3px rgba(52, 168, 83, 0.15), inset 0 1px 2px rgba(0,0,0,0.02)';
                          }}
                          onBlur={(e) => {
                            e.target.style.background = 'rgba(118, 118, 128, 0.08)';
                            e.target.style.borderColor = 'rgba(0, 0, 0, 0.06)';
                            e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.03)';
                          }}
                        />
                        {sidebarTeacherSearch && (
                          <button
                            type="button"
                            onClick={() => setSidebarTeacherSearch('')}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              background: 'rgba(142, 142, 147, 0.25)',
                              border: 'none',
                              borderRadius: '50%',
                              width: '16px',
                              height: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#1c1c1e',
                              cursor: 'pointer',
                              padding: 0
                            }}
                            title="Suche zurücksetzen"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Group and render submissions */}
                      {(() => {
                        const unassigned = matrixAllocations.filter(p => !p.roomId);
                        
                        // Group by teacher
                        const grouped: Record<string, { teacherName: string, instrument: string, blocks: any[], isUnsubmitted: boolean, hasPending: boolean, pendingCount: number }> = {};
                        
                        // 1. Initialize with all active teachers (Campus, Bypass, and Coaches)
                        const allTeachersList: any[] = [];
                        const seenIds = new Set<string>();
                        [...(campusTeachers || []), ...(bypassTeachers || []), ...(coaches || [])].forEach(t => {
                          if (t && t.id && !seenIds.has(t.id)) {
                            seenIds.add(t.id);
                            allTeachersList.push(t);
                          }
                        });
                        // Inject virtual GrooveLab teacher
                        allTeachersList.push({
                          id: 'groovelab',
                          firstName: 'Groove',
                          lastName: 'Lab',
                          instrument: 'Plattform',
                          role: 'teacher'
                        });

                        allTeachersList.forEach(t => {
                          const cleanTId = t.id ? t.id.replace(/^teacher-/i, '') : '';
                          const teacherPendingBlocks = matrixAllocations.filter(p => {
                            const cleanPId = p.teacherId ? p.teacherId.replace(/^teacher-/i, '') : '';
                            const isMatch = p.teacherId === t.id || (cleanPId && cleanPId === cleanTId);
                            if (!isMatch) return false;

                            const isExpPending = p.status === 'ready_for_admin_review' || p.status === 'pending';
                            const isTPending = pendingSchedules.some(s => {
                              const cleanSTeacher = s.teacher_id ? s.teacher_id.replace(/^teacher-/i, '') : '';
                              return s.id === p.id || (cleanSTeacher && cleanSTeacher === cleanPId);
                            });
                            return isExpPending || isTPending;
                          });

                          const isUnsubmitted = !!unsubmittedTeachers[t.id];
                          // Only set hasPending to true if teacher has actual submitted pending blocks awaiting approval!
                          const hasPending = teacherPendingBlocks.length > 0;

                          grouped[t.id] = {
                            teacherName: `${t.firstName} ${t.lastName}`,
                            instrument: t.instrument || 'Lehrkraft',
                            blocks: [],
                            isUnsubmitted,
                            hasPending,
                            pendingCount: teacherPendingBlocks.length
                          };
                        });

                        // 2. Put unassigned day blocks under each teacher
                        unassigned.forEach(p => {
                          if (!grouped[p.teacherId]) {
                            grouped[p.teacherId] = {
                              teacherName: p.teacherName,
                              instrument: p.instrument,
                              blocks: [],
                              isUnsubmitted: !!unsubmittedTeachers[p.teacherId],
                              hasPending: false,
                              pendingCount: 0
                            };
                          }
                          grouped[p.teacherId].blocks.push(p);
                        });

                        // Filter by search query
                        const filteredTeachers = Object.entries(grouped).filter(([tId, data]) => {
                          const matchesSearch = data.teacherName.toLowerCase().includes(sidebarTeacherSearch.toLowerCase().trim());
                          return matchesSearch;
                        });

                        // In Röntgen-Modus: Sort teachers with pending reviews to the VERY TOP!
                        if (showOnlyPendingReviews) {
                          filteredTeachers.sort(([, a], [, b]) => {
                            if (a.hasPending && !b.hasPending) return -1;
                            if (!a.hasPending && b.hasPending) return 1;
                            return b.pendingCount - a.pendingCount;
                          });
                        }

                        if (filteredTeachers.length === 0) {
                          return (
                            <div style={{
                              padding: '24px 16px',
                              textAlign: 'center',
                              borderRadius: '12px',
                              border: '1px dashed rgba(0, 0, 0, 0.08)',
                              background: 'rgba(0, 0, 0, 0.01)',
                              color: '#8e8e93',
                              fontSize: '0.74rem',
                              fontWeight: 650
                            }}>
                              Keine passenden Lehrkräfte gefunden.
                            </div>
                          );
                        }

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* "Alle Lehrer" Button */}
                            <button
                              onClick={() => {
                                setSelectedFilterTeacherId(null);
                                setExpandedSidebarTeacherId(null);
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: selectedFilterTeacherId === null ? '#34a853' : 'rgba(120, 120, 128, 0.08)',
                                color: selectedFilterTeacherId === null ? '#ffffff' : '#1c1c1e',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.15s ease',
                                boxShadow: selectedFilterTeacherId === null ? '0 1px 3px rgba(52, 168, 83, 0.2)' : 'none'
                              }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Users size={13} style={{ color: selectedFilterTeacherId === null ? '#ffffff' : '#8e8e93' }} />
                                Alle Lehrer anzeigen
                              </span>
                              <span style={{ 
                                fontSize: '0.66rem', 
                                background: selectedFilterTeacherId === null ? 'rgba(255,255,255,0.25)' : 'rgba(120, 120, 128, 0.12)', 
                                padding: '1px 5px', 
                                borderRadius: '6px', 
                                color: selectedFilterTeacherId === null ? '#ffffff' : '#8e8e93',
                                fontWeight: 700 
                              }}>
                                {unassigned.length}
                              </span>
                            </button>

                            {filteredTeachers.map(([tId, data]) => {
                              const isSelected = selectedFilterTeacherId === tId;
                              const isExpanded = expandedSidebarTeacherId === tId;
                              const isRontgenPending = showOnlyPendingReviews && data.hasPending;
                              const isRontgenDimmed = showOnlyPendingReviews && !data.hasPending;

                              let cardBorder = isSelected 
                                ? '1px solid rgba(52, 168, 83, 0.3)' 
                                : data.isUnsubmitted 
                                  ? '1px solid rgba(245, 158, 11, 0.3)' 
                                  : '1px solid rgba(0, 0, 0, 0.06)';

                              let cardBorderLeft = isSelected 
                                ? '3px solid #34a853' 
                                : data.isUnsubmitted 
                                  ? '3px solid #f59e0b' 
                                  : '1px solid rgba(0, 0, 0, 0.06)';

                              let cardShadow = isSelected ? '0 2px 8px rgba(52, 168, 83, 0.06)' : '0 1px 2px rgba(0,0,0,0.01)';

                              if (isRontgenPending) {
                                cardBorder = '1.5px dashed #f59e0b';
                                cardBorderLeft = '4px solid #f59e0b';
                                cardShadow = '0 4px 16px rgba(245, 158, 11, 0.22)';
                              }

                              return (
                                <div 
                                  key={tId} 
                                  style={{ 
                                    background: isRontgenPending ? '#fffbeb' : '#ffffff', 
                                    border: cardBorder, 
                                    borderRadius: '10px', 
                                    overflow: 'hidden',
                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                    boxShadow: cardShadow,
                                    borderLeft: cardBorderLeft,
                                    opacity: isRontgenDimmed ? 0.35 : 1
                                  }}
                                  onMouseEnter={(e) => {
                                    if (isRontgenDimmed) e.currentTarget.style.opacity = '1';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (isRontgenDimmed) e.currentTarget.style.opacity = '0.35';
                                  }}
                                >
                                  {/* Accordion Header */}
                                  <div 
                                    onClick={() => {
                                      setSelectedFilterTeacherId(isSelected ? null : tId);
                                      setExpandedSidebarTeacherId(isExpanded ? null : tId);
                                    }}
                                    style={{ 
                                      padding: '9px 12px', 
                                      cursor: 'pointer', 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center',
                                      background: isRontgenPending
                                        ? 'rgba(245, 158, 11, 0.08)'
                                        : isSelected 
                                          ? 'rgba(52, 168, 83, 0.04)' 
                                          : data.isUnsubmitted 
                                            ? 'rgba(245, 158, 11, 0.02)' 
                                            : '#ffffff',
                                      borderBottom: isExpanded ? '1px solid rgba(0, 0, 0, 0.04)' : 'none'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <ChevronRight size={10} style={{ 
                                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                                        transition: 'transform 0.15s ease-out', 
                                        marginRight: '6px', 
                                        color: isRontgenPending
                                          ? '#d97706'
                                          : isSelected 
                                            ? '#34a853' 
                                            : data.isUnsubmitted 
                                              ? '#d97706' 
                                              : '#8e8e93' 
                                      }} />
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                        <span style={{ 
                                          fontSize: '0.74rem', 
                                          fontWeight: 700, 
                                          color: isRontgenPending
                                            ? '#92400e'
                                            : isSelected 
                                              ? '#34a853' 
                                              : data.isUnsubmitted 
                                                ? '#d97706' 
                                                : '#1c1c1e' 
                                        }}>{data.teacherName}</span>
                                        <span style={{ fontSize: '0.62rem', color: '#8e8e93', fontWeight: 500 }}>{data.instrument}</span>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {isRontgenPending && (
                                        <span style={{
                                          fontSize: '0.62rem',
                                          background: '#fef3c7',
                                          color: '#b45309',
                                          border: '1px solid #fde68a',
                                          fontWeight: 800,
                                          padding: '2px 6px',
                                          borderRadius: '6px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px'
                                        }}>
                                          <Activity size={10} style={{ color: '#b45309' }} />
                                          <span>Review</span>
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadTeacherSchedule(tId, data.teacherName, data.instrument);
                                        }}
                                        style={{
                                          background: 'rgba(52, 168, 83, 0.08)',
                                          border: '1px solid rgba(52, 168, 83, 0.2)',
                                          color: '#34a853',
                                          borderRadius: '6px',
                                          padding: '3px 7px',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          fontSize: '0.64rem',
                                          fontWeight: 700,
                                          transition: 'all 0.15s ease'
                                        }}
                                        title={`Unterrichtszeiten für ${data.teacherName} (alle Wochentage) herunterladen`}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#34a853';
                                          e.currentTarget.style.color = '#ffffff';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'rgba(52, 168, 83, 0.08)';
                                          e.currentTarget.style.color = '#34a853';
                                        }}
                                      >
                                        <Download size={12} />
                                        <span>Download</span>
                                      </button>
                                      {data.isUnsubmitted ? (
                                        <span style={{ 
                                          fontSize: '0.66rem', 
                                          background: 'rgba(245, 158, 11, 0.12)', 
                                          color: '#d97706', 
                                          fontWeight: 700, 
                                          padding: '2px 6px', 
                                          borderRadius: '6px' 
                                        }}>
                                          Entwurf
                                        </span>
                                      ) : (
                                        <span style={{ 
                                          fontSize: '0.66rem', 
                                          background: isSelected ? 'rgba(52, 168, 83, 0.12)' : 'rgba(120, 120, 128, 0.08)', 
                                          color: isSelected ? '#34a853' : '#8e8e93', 
                                          fontWeight: 700, 
                                          padding: '1px 5px', 
                                          borderRadius: '6px' 
                                        }}>
                                          {data.blocks.length} {data.blocks.length === 1 ? 'Tag' : 'Tage'}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Collapsible content (Accordion Details) */}
                                  {isExpanded && (
                                    <div style={{ padding: '6px 8px 8px 8px', background: 'rgba(120, 120, 128, 0.04)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {data.isUnsubmitted ? (
                                        <div style={{
                                          padding: '12px 10px',
                                          borderRadius: '8px',
                                          border: '1px dashed rgba(245, 158, 11, 0.3)',
                                          background: 'rgba(245, 158, 11, 0.05)',
                                          color: '#d97706',
                                          fontSize: '0.72rem',
                                          fontWeight: 600,
                                          textAlign: 'center',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          gap: '6px'
                                        }}>
                                          <Lock size={14} style={{ color: '#d97706' }} />
                                          <span>Stundenplan noch nicht eingereicht</span>
                                        </div>
                                      ) : data.blocks.length === 0 ? (
                                        <div style={{
                                          padding: '12px 10px',
                                          borderRadius: '8px',
                                          border: '1px dashed rgba(52, 168, 83, 0.3)',
                                          background: 'rgba(52, 168, 83, 0.05)',
                                          color: '#34a853',
                                          fontSize: '0.72rem',
                                          fontWeight: 600,
                                          textAlign: 'center'
                                        }}>
                                          Alle Tage erfolgreich zugeteilt! ✅
                                        </div>
                                      ) : (
                                        <div style={{ border: '1px solid rgba(0, 0, 0, 0.06)', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
                                          {[...data.blocks]
                                            .sort((a, b) => {
                                              if (a.dayOfWeek !== b.dayOfWeek) {
                                                return a.dayOfWeek - b.dayOfWeek;
                                              }
                                              return (a.startTime || '').localeCompare(b.startTime || '');
                                            })
                                            .map((block, idx, sortedArr) => (
                                              <div 
                                                key={block.id}
                                                draggable
                                                onDragStart={(e) => handleDragStartMatrix(e, block.id)}
                                                onDragEnd={() => {
                                                  setDraggedPlanId(null);
                                                  setDraggedPlanDay(null);
                                                }}
                                                style={{
                                                  background: '#ffffff',
                                                  borderBottom: idx < sortedArr.length - 1 ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
                                                  padding: '8px 10px',
                                                  cursor: 'grab',
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  gap: '6px',
                                                  userSelect: 'none',
                                                  WebkitUserSelect: 'none'
                                                }}
                                              >
                                                <div style={{ pointerEvents: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1c1c1e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Calendar size={11} style={{ color: '#007aff' }} />
                                                    {['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][block.dayOfWeek]}
                                                  </span>
                                                  <span style={{ fontSize: '0.66rem', fontWeight: 500, color: '#8e8e93' }}>
                                                    {block.startTime}–{block.endTime}
                                                  </span>
                                                </div>
                                                
                                                {/* Room quick selection dropdown (Apple Select style) */}
                                                <select
                                                  defaultValue=""
                                                  onChange={(e) => {
                                                    const rId = e.target.value;
                                                    if (rId) {
                                                      const room = rooms.find(r => r.id === rId);
                                                      if (room) {
                                                        const unsuitable = room.unsuitable_instruments || (() => {
                                                          try {
                                                            const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
                                                            return map[room.id] || [];
                                                          } catch { return []; }
                                                        })();
                                                        if (unsuitable.some((inst: string) => inst.toLowerCase() === block.instrument?.toLowerCase())) {
                                                          alert(`Zuteilung verweigert: Raum "${room.name}" ist akustisch ungeeignet für das Instrument "${block.instrument}".`);
                                                          e.target.value = "";
                                                          return;
                                                        }
                                                      }
                                                      setMatrixAllocations(prev => prev.map(p => p.id === block.id ? { ...p, roomId: rId } : p));
                                                    }
                                                  }}
                                                  style={{
                                                    width: '100%',
                                                    fontSize: '0.68rem',
                                                    padding: '5px 24px 5px 8px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    outline: 'none',
                                                    background: 'rgba(120, 120, 128, 0.08)',
                                                    color: '#1c1c1e',
                                                    fontWeight: 500,
                                                    appearance: 'none',
                                                    WebkitAppearance: 'none',
                                                    backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=\'%238e8e93\' height=\'14\' viewBox=\'0 0 24 24\' width=\'14\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>")',
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundPositionX: '97%',
                                                    backgroundPositionY: '50%',
                                                    cursor: 'pointer'
                                                  }}
                                                >
                                                  <option value="" disabled>Raum zuweisen...</option>
                                                  {rooms.filter(rm => rm.is_campus_active !== false).map(rm => (
                                                    <option key={rm.id} value={rm.id}>{rm.name}</option>
                                                  ))}
                                                </select>
                                              </div>
                                            ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        
                        {/* REVIEW CARD */}
                        <div style={{
                          background: '#ffffff',
                          border: '1px solid rgba(0, 0, 0, 0.06)',
                          borderRadius: '14px',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.01)',
                          transition: 'transform 0.15s ease',
                          cursor: 'default'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '6px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'rgba(0, 122, 255, 0.1)',
                              color: '#007aff'
                            }}>
                              <Clock size={13} />
                            </div>
                            <span style={{ fontSize: '0.66rem', color: '#8e8e93', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Review</span>
                          </div>
                          <strong style={{ fontSize: '1.6rem', color: '#1c1c1e', fontWeight: 700, marginTop: '8px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
                            {pendingSchedules.length}
                          </strong>
                        </div>

                        {/* OFFEN CARD */}
                        {(() => {
                          const hasUnassigned = matrixAllocations.some(p => !p.roomId);
                          const unassignedCount = matrixAllocations.filter(p => !p.roomId).length;
                          return (
                            <div style={{
                              background: '#ffffff',
                              border: '1px solid rgba(0, 0, 0, 0.06)',
                              borderRadius: '14px',
                              padding: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.01)',
                              transition: 'transform 0.15s ease',
                              cursor: 'default'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '6px' }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: hasUnassigned ? 'rgba(255, 149, 0, 0.1)' : 'rgba(52, 168, 83, 0.1)',
                                  color: hasUnassigned ? '#ff9500' : '#34c759'
                                }}>
                                  <Calendar size={13} />
                                </div>
                                <span style={{ fontSize: '0.66rem', color: '#8e8e93', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Offen</span>
                              </div>
                              <strong style={{ fontSize: '1.6rem', color: hasUnassigned ? '#ff9500' : '#34c759', fontWeight: 700, marginTop: '8px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
                                {unassignedCount}
                              </strong>
                            </div>
                          );
                        })()}

                        {/* VERTEILT CARD */}
                        <div style={{
                          background: '#ffffff',
                          border: '1px solid rgba(0, 0, 0, 0.06)',
                          borderRadius: '14px',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.01)',
                          transition: 'transform 0.15s ease',
                          cursor: 'default'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '6px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'rgba(52, 168, 83, 0.1)',
                              color: '#34c759'
                            }}>
                              <CheckCircle size={13} />
                            </div>
                            <span style={{ fontSize: '0.66rem', color: '#8e8e93', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Verteilt</span>
                          </div>
                          <strong style={{ fontSize: '1.6rem', color: '#34c759', fontWeight: 700, marginTop: '8px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
                            {matrixAllocations.filter(p => p.roomId).length}
                          </strong>
                        </div>

                        {/* KONFLIKTE CARD */}
                        {(() => {
                          let conflicts = 0;
                          const byRoomDay: Record<string, any[]> = {};
                          matrixAllocations.filter(p => p.roomId).forEach(p => {
                            const k = `${p.roomId}_${p.dayOfWeek}`;
                            if (!byRoomDay[k]) byRoomDay[k] = [];
                            byRoomDay[k].push(p);
                          });
                          Object.values(byRoomDay).forEach(group => {
                            if (group.length > 1) {
                              group.forEach((p, i) => {
                                group.forEach((q, j) => {
                                  if (i < j && p.startTime < q.endTime && q.startTime < p.endTime) conflicts++;
                                });
                              });
                            }
                          });
                          const hasConflicts = conflicts > 0;
                          return (
                            <div style={{
                              background: '#ffffff',
                              border: '1px solid rgba(0, 0, 0, 0.06)',
                              borderRadius: '14px',
                              padding: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.01)',
                              transition: 'transform 0.15s ease',
                              cursor: 'default'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '6px' }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: hasConflicts ? 'rgba(255, 59, 48, 0.1)' : 'rgba(142, 142, 147, 0.1)',
                                  color: hasConflicts ? '#ff3b30' : '#8e8e93'
                                }}>
                                  <AlertCircle size={13} />
                                </div>
                                <span style={{ fontSize: '0.66rem', color: '#8e8e93', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Konflikte</span>
                              </div>
                              <strong style={{ fontSize: '1.6rem', color: hasConflicts ? '#ff3b30' : '#1c1c1e', fontWeight: 700, marginTop: '8px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
                                {conflicts}
                              </strong>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Conflict details log logger if there are conflicts */}
                      {(() => {
                        const conflictDetails: string[] = [];
                        const byRoomDay: Record<string, any[]> = {};
                        matrixAllocations.filter(p => p.roomId).forEach(p => {
                          const k = `${p.roomId}_${p.dayOfWeek}`;
                          if (!byRoomDay[k]) byRoomDay[k] = [];
                          byRoomDay[k].push(p);
                        });
                        Object.entries(byRoomDay).forEach(([roomDayKey, group]) => {
                          if (group.length > 1) {
                            group.forEach((p, i) => {
                              group.forEach((q, j) => {
                                if (i < j && p.startTime < q.endTime && q.startTime < p.endTime) {
                                  const dayName = ['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][p.dayOfWeek];
                                  const rName = rooms.find(rm => rm.id === p.roomId)?.name || 'Raum';
                                  conflictDetails.push(`${dayName}, ${rName}: ${p.teacherName} und ${q.teacherName} überschneiden sich (${p.startTime}–${p.endTime} vs. ${q.startTime}–${q.endTime})`);
                                }
                              });
                            });
                          }
                        });

                        if (conflictDetails.length > 0) {
                          return (
                            <div style={{
                              background: 'rgba(255, 59, 48, 0.05)',
                              border: '1px solid rgba(255, 59, 48, 0.15)',
                              padding: '8px',
                              borderRadius: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertCircle size={14} style={{ color: '#ff3b30' }} />
                                <strong style={{ color: '#ff3b30', fontSize: '0.74rem', fontWeight: 700 }}>Konflikte gefunden:</strong>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                                {conflictDetails.map((det, idx) => (
                                  <div key={idx} style={{ fontSize: '0.68rem', color: '#ff3b30', lineHeight: '1.3', fontWeight: 500 }}>
                                    • {det}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div style={{
                        background: 'rgba(120, 120, 128, 0.06)',
                        border: '1px solid rgba(0, 0, 0, 0.04)',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'rgba(120, 120, 128, 0.08)',
                          color: '#8e8e93',
                          flexShrink: 0
                        }}>
                          <DoorOpen size={15} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <strong style={{ display: 'block', color: '#1c1c1e', fontSize: '0.78rem', fontWeight: 600 }}>Räume verfügbar:</strong>
                          <p style={{ margin: 0, color: '#8e8e93', lineHeight: '1.3', fontSize: '0.72rem', fontWeight: 500 }}>
                            {rooms.length} Räume · {rooms.length * 5} mögliche Tageszuteilungen pro Woche
                          </p>
                        </div>
                      </div>

                      <div style={{
                        background: 'rgba(255, 59, 48, 0.05)',
                        border: '1px solid rgba(255, 59, 48, 0.12)',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'rgba(255, 59, 48, 0.08)',
                          color: '#ff3b30',
                          flexShrink: 0
                        }}>
                          <AlertCircle size={15} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <strong style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#ff3b30' }}>Hinweis:</strong>
                          <p style={{ margin: 0, fontSize: '0.72rem', lineHeight: '1.4', color: '#8e2d2d', fontWeight: 500 }}>
                            Abgelehnte Stundenpläne gehen zurück in den Draft-Zustand. Lehrkräfte können erneut einreichen.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}


              </div>
            )}

          </div>

  );
};

export default SecretaryCampusTab;
