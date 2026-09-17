/**
 * ==============================================================================
 * CAMPUS-GROOVELAB SECRETARY VERWALTUNG TAB
 * Monolith Goldstandard: Clean component isolation (< 3.000 LOC per tab)
 * Bounded Context: Administration & School Governance (Module Color: Red #ea4335)
 * ==============================================================================
 */

import React, { Suspense, lazy, useMemo } from 'react';
import { SchoolDunningStatus } from '../../../domain/schoolDunningEngine';

// Lazy-loaded administration subviews for high performance and fast code-splitting
const SecretaryAnnouncementsView = lazy(() => import('../SecretaryAnnouncementsView').then(m => ({ default: m.SecretaryAnnouncementsView })));
const SecretaryCrisisView = lazy(() => import('../SecretaryCrisisView').then(m => ({ default: m.SecretaryCrisisView })));
const SecretaryEquipmentView = lazy(() => import('../SecretaryEquipmentView').then(m => ({ default: m.SecretaryEquipmentView })));
const SecretaryAuditView = lazy(() => import('../SecretaryAuditView').then(m => ({ default: m.SecretaryAuditView })));
const SecretaryRoomsView = lazy(() => import('../SecretaryRoomsView').then(m => ({ default: m.SecretaryRoomsView })));
const SecretaryLicensesView = lazy(() => import('../SecretaryLicensesView').then(m => ({ default: m.SecretaryLicensesView })));
const SecretarySetupView = lazy(() => import('../SecretarySetupView').then(m => ({ default: m.SecretarySetupView })));
const SecretaryEmployeesView = lazy(() => import('../SecretaryEmployeesView').then(m => ({ default: m.SecretaryEmployeesView })));
const SecretaryBriefingView = lazy(() => import('../SecretaryBriefingView').then(m => ({ default: m.SecretaryBriefingView })));

export type SecretarySubTab =
  | 'briefing'
  | 'employees'
  | 'licenses'
  | 'setup'
  | 'rooms'
  | 'equipment'
  | 'crisis'
  | 'audit'
  | 'duties'
  | 'announcements';

export interface SecretaryVerwaltungTabProps {
  secretarySubTab: SecretarySubTab;
  setSecretarySubTab: React.Dispatch<React.SetStateAction<any>> | ((subTab: any) => void);
  activeTab: 'secretary' | 'campus' | 'groovelab';
  setActiveTab: React.Dispatch<React.SetStateAction<'secretary' | 'campus' | 'groovelab'>> | ((tab: 'secretary' | 'campus' | 'groovelab') => void);
  campusSubTab: string;
  setCampusSubTab: React.Dispatch<React.SetStateAction<any>> | ((tab: any) => void);

  // Common school and identity props
  schoolId: string;
  schoolNumericId: number;
  schoolName: string;
  schoolStreet?: string;
  setSchoolStreet?: (val: string) => void;
  schoolHouseNumber?: string;
  setSchoolHouseNumber?: (val: string) => void;
  schoolZipCode?: string;
  setSchoolZipCode?: (val: string) => void;
  schoolCity?: string;
  setSchoolCity?: (val: string) => void;
  schoolSubdomain?: string;
  setSchoolSubdomain?: (val: string) => void;
  schoolPhoneNumber?: string;
  setSchoolPhoneNumber?: (val: string) => void;
  schoolEmail?: string;
  setSchoolEmail?: (val: string) => void;
  absenceEmail?: string;
  setAbsenceEmail?: (val: string) => void;
  logoUrl?: string;
  setLogoUrl?: (val: string) => void;
  setSchoolName?: (val: string) => void;
  currentSchoolProfile: any;
  setCurrentSchoolProfile: React.Dispatch<React.SetStateAction<any>> | ((profile: any) => void);
  currentUserProfile: any;
  userId?: string;
  supabase: any;
  windowWidth: number;
  fetchDashboardData: () => Promise<void> | void;

  // Rooms & Allocation states
  rooms: any[];
  setRooms?: React.Dispatch<React.SetStateAction<any[]>>;
  buildings?: any[];
  setBuildings?: React.Dispatch<React.SetStateAction<any[]>>;
  matrixAllocations?: any[];
  roomSearchQuery: string;
  setRoomSearchQuery: React.Dispatch<React.SetStateAction<string>> | ((query: string) => void);
  selectedDayPlan?: any;
  setSelectedDayPlan?: React.Dispatch<React.SetStateAction<any>>;
  roomsSubView: 'matrix' | 'cards' | 'live' | 'issues' | 'settings' | 'overview' | 'plan' | any;
  setRoomsSubView: any;
  schedulesRoomsViewMode: any;
  setSchedulesRoomsViewMode: any;
  roomIssues: any[];
  setRoomIssues?: React.Dispatch<React.SetStateAction<any[]>>;
  pendingBookings: any[];
  setPendingBookings?: React.Dispatch<React.SetStateAction<any[]>>;
  pendingSchedules?: any[];
  handleConfirmBooking: (bookingId: string) => Promise<void>;
  handleRejectBooking: (bookingId: string) => Promise<void>;
  parseRoomName: (name: string) => any;
  getFloorColor: (name: string) => any;
  getAlphabeticalColor: (name: string) => { avatarBg: string; avatarColor: string };
  formatInstrumentName: (inst?: string | null | any) => string;
  getAlphabeticalUniColor: (name: string) => any;
  checkTimeOverlap?: (start1: string, end1: string, start2: string, end2: string) => boolean;
  getPlanDisplayName?: (plan: any) => string;
  onOpenFacilityLogModal?: () => void;

  // Teachers & Staff
  campusTeachers: any[];
  bypassTeachers: any[];
  coaches: any[];
  allTeachers: any[];
  employees: any[];
  setEmployees: React.Dispatch<React.SetStateAction<any[]>>;
  revealedPins: Record<string, boolean>;
  setRevealedPins: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  employeeFirstName: string;
  setEmployeeFirstName: React.Dispatch<React.SetStateAction<string>>;
  employeeLastName: string;
  setEmployeeLastName: React.Dispatch<React.SetStateAction<string>>;
  employeeSearchQuery: string;
  setEmployeeSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  employeeStatusTab: 'all' | 'active' | 'inactive';
  setEmployeeStatusTab: React.Dispatch<React.SetStateAction<'all' | 'active' | 'inactive'>>;
  employeeFilterRole: string;
  setEmployeeFilterRole: React.Dispatch<React.SetStateAction<string>>;
  isEmployeeCsvExpanded: boolean;
  setIsEmployeeCsvExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  employeeCsvText: string;
  setEmployeeCsvText: React.Dispatch<React.SetStateAction<string>>;
  showAddEmployeeModal: boolean;
  setShowAddEmployeeModal: React.Dispatch<React.SetStateAction<boolean>>;
  dragHoveredEmployeeRole: string | null;
  setDragHoveredEmployeeRole: React.Dispatch<React.SetStateAction<string | null>>;
  employeeFilterRoleFocused: boolean;
  setEmployeeFilterRoleFocused: React.Dispatch<React.SetStateAction<boolean>>;
  employeeStatusTabFocused: boolean;
  setEmployeeStatusTabFocused: React.Dispatch<React.SetStateAction<boolean>>;
  employeeSearchFocused: boolean;
  setEmployeeSearchFocused: React.Dispatch<React.SetStateAction<boolean>>;
  handleCreateEmployee: (e: React.FormEvent) => Promise<void>;
  handleDeleteUser: (userId: string, userName?: string) => Promise<void>;
  handleImportEmployees: (csvData: string) => Promise<void>;
  handleToggleRole: (...args: any[]) => Promise<void>;
  handleUpdateEmployeeRole: (userId: string, newRole: string) => Promise<void>;

  // Briefing View Props
  expandedSidebarTeacherId: string | null;
  setExpandedSidebarTeacherId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedFilterTeacherId: string | null;
  setSelectedFilterTeacherId: React.Dispatch<React.SetStateAction<string | null>>;
  students: any[];
  userMap: Record<string, any>;
  roomMap: Record<string, any>;
  isAvvSigned: boolean;
  setShowAvvModal: React.Dispatch<React.SetStateAction<boolean>>;
  showLogbookModal: boolean;
  setShowLogbookModal: React.Dispatch<React.SetStateAction<boolean>>;
  showStorageManagerModal: boolean;
  setShowStorageManagerModal: React.Dispatch<React.SetStateAction<boolean>>;
  dismissedInvoiceAlert: boolean;
  setDismissedInvoiceAlert: React.Dispatch<React.SetStateAction<boolean>>;
  selectedInvoice: any;
  setSelectedInvoice: React.Dispatch<React.SetStateAction<any>>;
  contractStartDate: string | null;
  simulatedToday: string;
  studentLevyMonthly_global: number;
  extraLevyMonthly_global: number;
  studentSharePreview_global: number;
  schoolShareBookedExtra_global: number;
  currentTotalB2B_global: number;
  mixedTotal_global: number;
  fetchLogbookBookings: () => Promise<void>;
  getEffectiveStorageUsedBytes: (profile: any) => number;

  // Crisis Management Props
  crisisNotifications: any[];
  crisisTabMode: any;
  setCrisisTabMode: any;
  selectedCrisisTeacherId: string | null;
  setSelectedCrisisTeacherId: React.Dispatch<React.SetStateAction<string | null>>;
  handleMarkAsNotified: (ticketId: string) => Promise<void>;
  handleClaimTicket: (ticketId: string) => Promise<void>;
  handleArchiveCrisisTicket: (ticketId: string) => Promise<void>;
  handleArchiveAllResolvedTickets: (...args: any[]) => Promise<void>;
  handleEndAbsenceOnBehalf: (...args: any[]) => Promise<void>;
  expandedLiveDayStr: string | null;
  setExpandedLiveDayStr: React.Dispatch<React.SetStateAction<string | null>>;
  selectedArchiveLog: any;
  setSelectedArchiveLog: React.Dispatch<React.SetStateAction<any>>;

  // Licenses & Billing Props
  activeStudentsCount_global: number;
  activeGroovelabStudentsCount_global: number;
  passiveStudentsCount_global: number;
  billableTeachersCount: number;
  teacherServiceFeeTotal_global: number;
  moduleCost_global: number;
  storageAddonFee_global: number;
  baseB2B_global: number;
  masterRates: any;
  effectiveSchoolRates: any;
  masterPricing: any;
  isSammelzahler: boolean;
  fetchTariffBookings: () => Promise<void>;
  hasCampusSub: boolean;
  setHasCampusSub: React.Dispatch<React.SetStateAction<boolean>>;
  hasGroovelabSub: boolean;
  setHasGroovelabSub: React.Dispatch<React.SetStateAction<boolean>>;
  campusActivatedThisMonth: boolean;
  setCampusActivatedThisMonth: React.Dispatch<React.SetStateAction<boolean>>;
  groovelabActivatedThisMonth: boolean;
  setGroovelabActivatedThisMonth: React.Dispatch<React.SetStateAction<boolean>>;
  handleToggleCampusSub: (...args: any[]) => Promise<void>;
  handleToggleGroovelabSub: (...args: any[]) => Promise<void>;
  studentBillingOption: string;
  setStudentBillingOption: React.Dispatch<React.SetStateAction<any>>;
  isBillingBooked: boolean;
  setIsBillingBooked: React.Dispatch<React.SetStateAction<boolean>>;
  bookedExtraUsers: number;
  setBookedExtraUsers: React.Dispatch<React.SetStateAction<number>>;
  extraUsersSliderVal: number;
  setExtraUsersSliderVal: React.Dispatch<React.SetStateAction<number>>;
  extraBillingOption: string;
  setExtraBillingOption: React.Dispatch<React.SetStateAction<any>>;
  nextBillingOption: string;
  setNextBillingOption: React.Dispatch<React.SetStateAction<any>>;
  nextBillingOptionEffectiveAt: string | null | any;
  setNextBillingOptionEffectiveAt: any;
  showChangeTariffModal: boolean;
  setShowChangeTariffModal: React.Dispatch<React.SetStateAction<boolean>>;
  showCheckoutModal: boolean;
  setShowCheckoutModal: React.Dispatch<React.SetStateAction<boolean>>;
  checkoutStep: number;
  setCheckoutStep: React.Dispatch<React.SetStateAction<number>>;
  billingPayer: string;
  setBillingPayer: React.Dispatch<React.SetStateAction<any>>;
  showSuccessModal: boolean;
  setShowSuccessModal: React.Dispatch<React.SetStateAction<boolean>>;
  customUmlageAmount: number;
  setCustomUmlageAmount: React.Dispatch<React.SetStateAction<number>>;
  agreedToTerms: boolean;
  setAgreedToTerms: React.Dispatch<React.SetStateAction<boolean>>;
  couponCode: string;
  setCouponCode: React.Dispatch<React.SetStateAction<string>>;
  isCouponApplied: boolean;
  setIsCouponApplied: React.Dispatch<React.SetStateAction<boolean>>;
  couponDiscount: number;
  setCouponDiscount: React.Dispatch<React.SetStateAction<number>>;
  showCouponInput: boolean;
  setShowCouponInput: React.Dispatch<React.SetStateAction<boolean>>;
  hasCustomBillingAddress: boolean;
  setHasCustomBillingAddress: React.Dispatch<React.SetStateAction<boolean>>;
  customBillingName: string;
  setCustomBillingName: React.Dispatch<React.SetStateAction<string>>;
  customBillingStreet: string;
  setCustomBillingStreet: React.Dispatch<React.SetStateAction<string>>;
  customBillingZip: string;
  setCustomBillingZip: React.Dispatch<React.SetStateAction<string>>;
  customBillingCity: string;
  setCustomBillingCity: React.Dispatch<React.SetStateAction<string>>;
  customBillingEmail: string;
  setCustomBillingEmail: React.Dispatch<React.SetStateAction<string>>;
  customBillingLeitwegId: string;
  setCustomBillingLeitwegId: React.Dispatch<React.SetStateAction<string>>;
  hasCustomActivationBillingAddress: boolean;
  setHasCustomActivationBillingAddress: React.Dispatch<React.SetStateAction<boolean>>;
  customActivationBillingName: string;
  setCustomActivationBillingName: React.Dispatch<React.SetStateAction<string>>;
  customActivationBillingStreet: string;
  setCustomActivationBillingStreet: React.Dispatch<React.SetStateAction<string>>;
  customActivationBillingZip: string;
  setCustomActivationBillingZip: React.Dispatch<React.SetStateAction<string>>;
  customActivationBillingCity: string;
  setCustomActivationBillingCity: React.Dispatch<React.SetStateAction<string>>;
  customActivationBillingEmail: string;
  setCustomActivationBillingEmail: React.Dispatch<React.SetStateAction<string>>;
  selectedStorageAddonGb: number;
  setSelectedStorageAddonGb: React.Dispatch<React.SetStateAction<number>>;
  selectedStorageAddonFee: number;
  setSelectedStorageAddonFee: React.Dispatch<React.SetStateAction<number>>;
  showSwitchBillingModelModal: boolean;
  setShowSwitchBillingModelModal: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSwitchTargetPayer: string;
  setSelectedSwitchTargetPayer: React.Dispatch<React.SetStateAction<any>>;
  showStorageTerminationModal: boolean;
  setShowStorageTerminationModal: React.Dispatch<React.SetStateAction<boolean>>;
  agreedToSepa: boolean;
  setAgreedToSepa: React.Dispatch<React.SetStateAction<boolean>>;
  showConfirmExtra: boolean;
  setShowConfirmExtra: React.Dispatch<React.SetStateAction<boolean>>;
  isSchoolTrial: boolean;
  setIsSchoolTrial: React.Dispatch<React.SetStateAction<boolean>>;
  schoolTrialEndsAt: string | null;
  setSchoolTrialEndsAt: React.Dispatch<React.SetStateAction<string | null>>;
  schoolStatus: string;
  setSchoolStatus: React.Dispatch<React.SetStateAction<string>>;
  subscriptionBypass: boolean;
  setContractStartDate?: any;
  setSimulatedToday?: any;
  expandedYears: any;
  setExpandedYears: any;
  isCancelled: boolean;
  setIsCancelled: React.Dispatch<React.SetStateAction<boolean>>;
  schoolContractEndsAt: string | null | any;
  setSchoolContractEndsAt: any;
  showModuleUpgradeModal: boolean;
  setShowModuleUpgradeModal: React.Dispatch<React.SetStateAction<boolean>>;
  setUpgradeTargetModule: any;
  setShowCancelModal: React.Dispatch<React.SetStateAction<boolean>>;
  tariffBookings: any[];
  loadingTariffBookings: boolean;
  activeStudentsModalList: any;
  setActiveStudentsModalList: React.Dispatch<React.SetStateAction<any>>;
  dunningStatus: SchoolDunningStatus;
  setShowDunningPayModal: React.Dispatch<React.SetStateAction<boolean>>;

  // Equipment Props
  schoolEquipment: any[];
  selectedEquipmentRoomId: string | null;
  setSelectedEquipmentRoomId: React.Dispatch<React.SetStateAction<string>> | ((id: any) => void);
  equipmentFormName: string;
  setEquipmentFormName: React.Dispatch<React.SetStateAction<string>>;
  equipmentFormQty: number;
  setEquipmentFormQty: React.Dispatch<React.SetStateAction<number>>;
  equipmentSaving: boolean;
  handleSaveEquipment: () => Promise<void>;
  equipmentSearchQuery: string;
  setEquipmentSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  equipmentSortFreeFirst: boolean;
  setEquipmentSortFreeFirst: React.Dispatch<React.SetStateAction<boolean>>;
  dragOverRoomId: string | null;
  setDragOverRoomId: React.Dispatch<React.SetStateAction<string | null>>;
  handleDropInstrumentOnRoom: (instId: string, targetRoomId: string) => Promise<void>;
  editingEquipmentGroup: any;
  setEditingEquipmentGroup: React.Dispatch<React.SetStateAction<any>>;
  editGroupName: string;
  setEditGroupName: React.Dispatch<React.SetStateAction<string>>;
  editGroupModel: string;
  setEditGroupModel: React.Dispatch<React.SetStateAction<string>>;
  editGroupLink: string;
  setEditGroupLink: React.Dispatch<React.SetStateAction<string>>;
  editGroupCoupled: boolean;
  setEditGroupCoupled: React.Dispatch<React.SetStateAction<boolean>>;
  editGroupQty: number;
  setEditGroupQty: React.Dispatch<React.SetStateAction<number>>;
  editGroupInstancesData: any[];
  setEditGroupInstancesData: React.Dispatch<React.SetStateAction<any[]>>;
  handleSaveEquipmentGroup: () => Promise<void>;
  handleDeleteEquipment: (id: string) => Promise<void>;
  equipmentNameInputRef: React.RefObject<HTMLInputElement>;
  equipmentQtyInputRef: React.RefObject<HTMLInputElement>;

  // Setup Props
  kioskPinLength: number;
  setKioskPinLength: (val: number) => void;
  bypassPin: string;
  setBypassPin: (val: string) => void;
  logRetention: any;
  setLogRetention: any;
  syncInterval: any;
  setSyncInterval: any;
  calendarUrls: string[];
  newCalendarUrlInput: string;
  setNewCalendarUrlInput: (val: string) => void;
  lastBackupDate: string | null;
  schoolYearStartDay: number;
  schoolYearStartMonth: number;
  autoDeleteExpiredUsers: boolean;
  isCurrentDevicePasskeyActive: boolean;
  isSavingSettings: boolean;
  isSettingsDirty: boolean;
  activeSecretarySettingsModal: any;
  setActiveSecretarySettingsModal: any;
  settingsTab: any;
  setSettingsTab: any;
  showResetModal: boolean;
  setShowResetModal: (show: boolean) => void;
  resetConfirmText: string;
  setResetConfirmText: (text: string) => void;
  showOwnQrModal: boolean;
  setShowOwnQrModal: (show: boolean) => void;
  copiedSettingsLink: boolean;
  setCopiedSettingsLink: (copied: boolean) => void;
  copiedSettingsPin: boolean;
  setCopiedSettingsPin: (copied: boolean) => void;
  copiedKioskLink: boolean;
  setCopiedKioskLink: (copied: boolean) => void;
  copiedSchoolLink: boolean;
  setCopiedSchoolLink: (copied: boolean) => void;
  setIsFeedbackModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShowDpoIdCardModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowDpoPortalModal: React.Dispatch<React.SetStateAction<boolean>>;
  setQrModalUser: (user: any) => void;
  handleSaveAllSettings: () => Promise<void>;
  handleAddCalendarUrl: () => void;
  handleRemoveCalendarUrl: (index: number) => void;
  handleExportBackup: () => Promise<void>;
  handleRestoreBackup: (file: File) => Promise<void>;
  handleEnrollBiometrics: () => Promise<void>;
  handleRemoveBiometrics: () => Promise<void> | void;
  handleTestBiometrics: () => Promise<void>;
  handleDeleteExpiredStudents: () => Promise<void>;
  handleToggleAutoClean: (...args: any[]) => Promise<void>;
  handleUpdateSchoolYear: (day: number, month: number) => Promise<void>;
  biometricsStatus: 'idle' | 'testing' | 'enrolling' | 'removing' | 'error' | 'success' | 'registering' | 'verifying';
  biometricsMessage: string | null;
  kioskToken: string | null;
  isExporting: boolean;
  isRestoring: boolean;

  // Announcements Props
  announcementsList: any[];
  announcementsLoading: boolean;
  editingAnnouncementId: string | null;
  setEditingAnnouncementId: React.Dispatch<React.SetStateAction<string | null>>;
  newAnnouncementTitle: string;
  setNewAnnouncementTitle: React.Dispatch<React.SetStateAction<string>>;
  newAnnouncementDescription: string;
  setNewAnnouncementDescription: React.Dispatch<React.SetStateAction<string>>;
  newAnnouncementType: any;
  setNewAnnouncementType: React.Dispatch<React.SetStateAction<any>>;
  newAnnouncementPriority: any;
  setNewAnnouncementPriority: React.Dispatch<React.SetStateAction<any>>;
  newAnnouncementIsAnonymous: boolean;
  setNewAnnouncementIsAnonymous: React.Dispatch<React.SetStateAction<boolean>>;
  newAnnouncementTargetType: any;
  setNewAnnouncementTargetType: React.Dispatch<React.SetStateAction<any>>;
  newAnnouncementTargetGroup: string;
  setNewAnnouncementTargetGroup: React.Dispatch<React.SetStateAction<string>>;
  newAnnouncementTargetTeacherId: string;
  setNewAnnouncementTargetTeacherId: React.Dispatch<React.SetStateAction<string>>;
  newAnnouncementDueDate: string;
  setNewAnnouncementDueDate: React.Dispatch<React.SetStateAction<string>>;
  newAnnouncementRecurrence: any;
  setNewAnnouncementRecurrence: React.Dispatch<React.SetStateAction<any>>;
  newAnnouncementAttachmentUrl: string;
  setNewAnnouncementAttachmentUrl: React.Dispatch<React.SetStateAction<string>>;
  newAnnouncementQuestions: any[];
  setNewAnnouncementQuestions: React.Dispatch<React.SetStateAction<any[]>>;
  isUploadingAnnouncementAttachment: boolean;
  handleUploadAnnouncementAttachment: (fileOrEvent: any) => Promise<void>;
  handleCreateAnnouncement?: () => Promise<void>;
  handleSaveAnnouncement?: () => Promise<void>;
  handleDeleteAnnouncement: (id: string) => Promise<void>;
  selectedAnnouncementForStats: any;
  setSelectedAnnouncementForStats: React.Dispatch<React.SetStateAction<any>>;
  announcementResponsesList: any[];
  fetchAnnouncementStats: (id: string) => Promise<void>;
  statsModalTab: 'all' | 'unconfirmed' | 'questions' | 'status' | 'qa';
  setStatsModalTab: React.Dispatch<React.SetStateAction<any>>;
  statsStatusFilter: 'all' | 'confirmed' | 'unconfirmed' | 'completed' | 'pending';
  setStatsStatusFilter: React.Dispatch<React.SetStateAction<any>>;
  statsSearchQuery: string;
  setStatsSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  expandedResponseIds: any;
  setExpandedResponseIds: React.Dispatch<React.SetStateAction<any>>;
  handleExportCSV: (announcement: any) => void;

  // Audit Logs Props
  auditLogs: any[];
  auditLoading: boolean;
  auditSearchQuery: string;
  setAuditSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  auditActionFilter: string;
  setAuditActionFilter: React.Dispatch<React.SetStateAction<string>>;
  auditLimit: number;
  setAuditLimit: React.Dispatch<React.SetStateAction<number>>;
  exportAuditLogsToCsv: () => void;
  translateKey: (key: string) => string;
  translateValue: (key: string, val: any) => string;
}

export function SecretaryVerwaltungTab(props: SecretaryVerwaltungTabProps) {
  const {
    secretarySubTab,
    campusSubTab,
    setCampusSubTab,
    activeTab,
    setActiveTab,
    setSecretarySubTab,
    schoolId,
    schoolNumericId,
    schoolName,
    schoolStreet,
    schoolHouseNumber,
    schoolZipCode,
    schoolCity,
    schoolSubdomain,
    setSchoolSubdomain,
    schoolPhoneNumber,
    setSchoolPhoneNumber,
    schoolEmail,
    setSchoolEmail,
    absenceEmail,
    setAbsenceEmail,
    logoUrl,
    setLogoUrl,
    setSchoolName,
    setSchoolStreet,
    setSchoolHouseNumber,
    setSchoolZipCode,
    setSchoolCity,
    currentSchoolProfile,
    setCurrentSchoolProfile,
    currentUserProfile,
    userId,
    supabase,
    windowWidth,
    fetchDashboardData,

    // Rooms
    rooms,
    setRooms,
    buildings,
    setBuildings,
    matrixAllocations,
    roomSearchQuery,
    setRoomSearchQuery,
    selectedDayPlan,
    setSelectedDayPlan,
    roomsSubView,
    setRoomsSubView,
    schedulesRoomsViewMode,
    setSchedulesRoomsViewMode,
    roomIssues,
    setRoomIssues,
    pendingBookings,
    setPendingBookings,
    pendingSchedules,
    handleConfirmBooking,
    handleRejectBooking,
    parseRoomName,
    getFloorColor,
    getAlphabeticalColor,
    formatInstrumentName,
    getAlphabeticalUniColor,
    checkTimeOverlap,
    getPlanDisplayName,
    onOpenFacilityLogModal,

    // Staff
    campusTeachers,
    bypassTeachers,
    coaches,
    allTeachers,
    employees,
    setEmployees,
    revealedPins,
    setRevealedPins,
    employeeFirstName,
    setEmployeeFirstName,
    employeeLastName,
    setEmployeeLastName,
    employeeSearchQuery,
    setEmployeeSearchQuery,
    employeeStatusTab,
    setEmployeeStatusTab,
    employeeFilterRole,
    setEmployeeFilterRole,
    isEmployeeCsvExpanded,
    setIsEmployeeCsvExpanded,
    employeeCsvText,
    setEmployeeCsvText,
    showAddEmployeeModal,
    setShowAddEmployeeModal,
    dragHoveredEmployeeRole,
    setDragHoveredEmployeeRole,
    employeeFilterRoleFocused,
    setEmployeeFilterRoleFocused,
    employeeStatusTabFocused,
    setEmployeeStatusTabFocused,
    employeeSearchFocused,
    setEmployeeSearchFocused,
    handleCreateEmployee,
    handleDeleteUser,
    handleImportEmployees,
    handleToggleRole,
    handleUpdateEmployeeRole,

    // Briefing
    expandedSidebarTeacherId,
    setExpandedSidebarTeacherId,
    selectedFilterTeacherId,
    setSelectedFilterTeacherId,
    students,
    userMap,
    roomMap,
    isAvvSigned,
    setShowAvvModal,
    showLogbookModal,
    setShowLogbookModal,
    showStorageManagerModal,
    setShowStorageManagerModal,
    dismissedInvoiceAlert,
    setDismissedInvoiceAlert,
    selectedInvoice,
    setSelectedInvoice,
    contractStartDate,
    simulatedToday,
    studentLevyMonthly_global,
    extraLevyMonthly_global,
    studentSharePreview_global,
    schoolShareBookedExtra_global,
    currentTotalB2B_global,
    mixedTotal_global,
    fetchLogbookBookings,
    getEffectiveStorageUsedBytes,

    // Crisis
    crisisNotifications,
    crisisTabMode,
    setCrisisTabMode,
    selectedCrisisTeacherId,
    setSelectedCrisisTeacherId,
    handleMarkAsNotified,
    handleClaimTicket,
    handleArchiveCrisisTicket,
    handleArchiveAllResolvedTickets,
    handleEndAbsenceOnBehalf,
    expandedLiveDayStr,
    setExpandedLiveDayStr,
    selectedArchiveLog,
    setSelectedArchiveLog,

    // Licenses
    activeStudentsCount_global,
    activeGroovelabStudentsCount_global,
    passiveStudentsCount_global,
    billableTeachersCount,
    teacherServiceFeeTotal_global,
    moduleCost_global,
    storageAddonFee_global,
    baseB2B_global,
    masterRates,
    effectiveSchoolRates,
    masterPricing,
    isSammelzahler,
    fetchTariffBookings,
    hasCampusSub,
    setHasCampusSub,
    hasGroovelabSub,
    setHasGroovelabSub,
    campusActivatedThisMonth,
    setCampusActivatedThisMonth,
    groovelabActivatedThisMonth,
    setGroovelabActivatedThisMonth,
    handleToggleCampusSub,
    handleToggleGroovelabSub,
    studentBillingOption,
    setStudentBillingOption,
    isBillingBooked,
    setIsBillingBooked,
    bookedExtraUsers,
    setBookedExtraUsers,
    extraUsersSliderVal,
    setExtraUsersSliderVal,
    extraBillingOption,
    setExtraBillingOption,
    nextBillingOption,
    setNextBillingOption,
    nextBillingOptionEffectiveAt,
    setNextBillingOptionEffectiveAt,
    showChangeTariffModal,
    setShowChangeTariffModal,
    showCheckoutModal,
    setShowCheckoutModal,
    checkoutStep,
    setCheckoutStep,
    billingPayer,
    setBillingPayer,
    showSuccessModal,
    setShowSuccessModal,
    customUmlageAmount,
    setCustomUmlageAmount,
    agreedToTerms,
    setAgreedToTerms,
    couponCode,
    setCouponCode,
    isCouponApplied,
    setIsCouponApplied,
    couponDiscount,
    setCouponDiscount,
    showCouponInput,
    setShowCouponInput,
    hasCustomBillingAddress,
    setHasCustomBillingAddress,
    customBillingName,
    setCustomBillingName,
    customBillingStreet,
    setCustomBillingStreet,
    customBillingZip,
    setCustomBillingZip,
    customBillingCity,
    setCustomBillingCity,
    customBillingEmail,
    setCustomBillingEmail,
    customBillingLeitwegId,
    setCustomBillingLeitwegId,
    hasCustomActivationBillingAddress,
    setHasCustomActivationBillingAddress,
    customActivationBillingName,
    setCustomActivationBillingName,
    customActivationBillingStreet,
    setCustomActivationBillingStreet,
    customActivationBillingZip,
    setCustomActivationBillingZip,
    customActivationBillingCity,
    setCustomActivationBillingCity,
    customActivationBillingEmail,
    setCustomActivationBillingEmail,
    selectedStorageAddonGb,
    setSelectedStorageAddonGb,
    selectedStorageAddonFee,
    setSelectedStorageAddonFee,
    showSwitchBillingModelModal,
    setShowSwitchBillingModelModal,
    selectedSwitchTargetPayer,
    setSelectedSwitchTargetPayer,
    showStorageTerminationModal,
    setShowStorageTerminationModal,
    agreedToSepa,
    setAgreedToSepa,
    showConfirmExtra,
    setShowConfirmExtra,
    isSchoolTrial,
    setIsSchoolTrial,
    schoolTrialEndsAt,
    setSchoolTrialEndsAt,
    schoolStatus,
    setSchoolStatus,
    subscriptionBypass,
    setContractStartDate,
    setSimulatedToday,
    expandedYears,
    setExpandedYears,
    isCancelled,
    setIsCancelled,
    schoolContractEndsAt,
    setSchoolContractEndsAt,
    showModuleUpgradeModal,
    setShowModuleUpgradeModal,
    setUpgradeTargetModule,
    setShowCancelModal,
    tariffBookings,
    loadingTariffBookings,
    activeStudentsModalList,
    setActiveStudentsModalList,
    dunningStatus,
    setShowDunningPayModal,

    // Equipment
    schoolEquipment,
    selectedEquipmentRoomId,
    setSelectedEquipmentRoomId,
    equipmentFormName,
    setEquipmentFormName,
    equipmentFormQty,
    setEquipmentFormQty,
    equipmentSaving,
    handleSaveEquipment,
    equipmentSearchQuery,
    setEquipmentSearchQuery,
    equipmentSortFreeFirst,
    setEquipmentSortFreeFirst,
    dragOverRoomId,
    setDragOverRoomId,
    handleDropInstrumentOnRoom,
    editingEquipmentGroup,
    setEditingEquipmentGroup,
    editGroupName,
    setEditGroupName,
    editGroupModel,
    setEditGroupModel,
    editGroupLink,
    setEditGroupLink,
    editGroupCoupled,
    setEditGroupCoupled,
    editGroupQty,
    setEditGroupQty,
    editGroupInstancesData,
    setEditGroupInstancesData,
    handleSaveEquipmentGroup,
    handleDeleteEquipment,
    equipmentNameInputRef,
    equipmentQtyInputRef,

    // Setup
    kioskPinLength,
    setKioskPinLength,
    bypassPin,
    setBypassPin,
    logRetention,
    setLogRetention,
    syncInterval,
    setSyncInterval,
    calendarUrls,
    newCalendarUrlInput,
    setNewCalendarUrlInput,
    lastBackupDate,
    schoolYearStartDay,
    schoolYearStartMonth,
    autoDeleteExpiredUsers,
    isCurrentDevicePasskeyActive,
    isSavingSettings,
    isSettingsDirty,
    activeSecretarySettingsModal,
    setActiveSecretarySettingsModal,
    settingsTab,
    setSettingsTab,
    showResetModal,
    setShowResetModal,
    resetConfirmText,
    setResetConfirmText,
    showOwnQrModal,
    setShowOwnQrModal,
    copiedSettingsLink,
    setCopiedSettingsLink,
    copiedSettingsPin,
    setCopiedSettingsPin,
    copiedKioskLink,
    setCopiedKioskLink,
    copiedSchoolLink,
    setCopiedSchoolLink,
    setIsFeedbackModalOpen,
    setShowDpoIdCardModal,
    setShowDpoPortalModal,
    setQrModalUser,
    handleSaveAllSettings,
    handleAddCalendarUrl,
    handleRemoveCalendarUrl,
    handleExportBackup,
    handleRestoreBackup,
    handleEnrollBiometrics,
    handleRemoveBiometrics,
    handleTestBiometrics,
    handleDeleteExpiredStudents,
    handleToggleAutoClean,
    handleUpdateSchoolYear,
    biometricsStatus,
    biometricsMessage,
    kioskToken,
    isExporting,
    isRestoring,

    // Announcements
    announcementsList,
    announcementsLoading,
    editingAnnouncementId,
    setEditingAnnouncementId,
    newAnnouncementTitle,
    setNewAnnouncementTitle,
    newAnnouncementDescription,
    setNewAnnouncementDescription,
    newAnnouncementType,
    setNewAnnouncementType,
    newAnnouncementPriority,
    setNewAnnouncementPriority,
    newAnnouncementIsAnonymous,
    setNewAnnouncementIsAnonymous,
    newAnnouncementTargetType,
    setNewAnnouncementTargetType,
    newAnnouncementTargetGroup,
    setNewAnnouncementTargetGroup,
    newAnnouncementTargetTeacherId,
    setNewAnnouncementTargetTeacherId,
    newAnnouncementDueDate,
    setNewAnnouncementDueDate,
    newAnnouncementRecurrence,
    setNewAnnouncementRecurrence,
    newAnnouncementAttachmentUrl,
    setNewAnnouncementAttachmentUrl,
    newAnnouncementQuestions,
    setNewAnnouncementQuestions,
    isUploadingAnnouncementAttachment,
    handleUploadAnnouncementAttachment,
    handleCreateAnnouncement,
    handleSaveAnnouncement,
    handleDeleteAnnouncement,
    selectedAnnouncementForStats,
    setSelectedAnnouncementForStats,
    announcementResponsesList,
    fetchAnnouncementStats,
    statsModalTab,
    setStatsModalTab,
    statsStatusFilter,
    setStatsStatusFilter,
    statsSearchQuery,
    setStatsSearchQuery,
    expandedResponseIds,
    setExpandedResponseIds,
    handleExportCSV,

    // Audit
    auditLogs,
    auditLoading,
    auditSearchQuery,
    setAuditSearchQuery,
    auditActionFilter,
    setAuditActionFilter,
    auditLimit,
    setAuditLimit,
    exportAuditLogsToCsv,
    translateKey,
    translateValue,
  } = props;

  // Compute all unique teachers for announcement recipient selection
  const allUniqueTeachers = useMemo(() => {
    return [...campusTeachers, ...bypassTeachers, ...coaches].reduce((acc: any[], t: any) => {
      if (!acc.some(existing => existing.id === t.id)) {
        acc.push(t);
      }
      return acc;
    }, []);
  }, [campusTeachers, bypassTeachers, coaches]);

  const handleEditAnnouncement = (announcement: any) => {
    setEditingAnnouncementId(announcement.id);
    setNewAnnouncementTitle(announcement.title);
    setNewAnnouncementDescription(announcement.description || '');
    setNewAnnouncementType(announcement.duty_type as any);
    setNewAnnouncementQuestions(announcement.questions || []);
    setNewAnnouncementPriority((announcement.priority as any) || 'standard');
    setNewAnnouncementIsAnonymous(announcement.is_anonymous || false);
    setNewAnnouncementTargetType(announcement.target_type as any);
    setNewAnnouncementTargetGroup(announcement.target_group || 'all');
    setNewAnnouncementTargetTeacherId(announcement.target_teacher_id || '');
    setNewAnnouncementDueDate(announcement.due_date ? announcement.due_date.split('T')[0] : '');
    setNewAnnouncementRecurrence((announcement.recurrence as any) || 'none');
    setNewAnnouncementAttachmentUrl(announcement.attachment_url || '');
  };

  const handleResetAnnouncementForm = () => {
    setEditingAnnouncementId(null);
    setNewAnnouncementTitle('');
    setNewAnnouncementDescription('');
    setNewAnnouncementType('todo');
    setNewAnnouncementQuestions([]);
    setNewAnnouncementPriority('standard');
    setNewAnnouncementIsAnonymous(false);
    setNewAnnouncementTargetType('all');
    setNewAnnouncementDueDate('');
    setNewAnnouncementRecurrence('none');
    setNewAnnouncementAttachmentUrl('');
  };

  const handleDeleteEquipmentGroup = async () => {
    if (!editingEquipmentGroup) return;
    for (const inst of editingEquipmentGroup.instances) {
      await handleDeleteEquipment(inst.id);
    }
    setEditingEquipmentGroup(null);
  };

  return (
    <>
      {/* TAB 1: SECRETARY - BRIEFING */}
      {secretarySubTab === 'briefing' && (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Briefing wird geladen...</div>}>
          <SecretaryBriefingView
            currentSchoolProfile={currentSchoolProfile}
            setCurrentSchoolProfile={setCurrentSchoolProfile}
            currentUserProfile={currentUserProfile}
            userId={userId}
            schoolId={schoolId}
            schoolNumericId={schoolNumericId}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            secretarySubTab={secretarySubTab}
            setSecretarySubTab={setSecretarySubTab}
            campusSubTab={campusSubTab}
            setCampusSubTab={setCampusSubTab}
            schedulesRoomsViewMode={schedulesRoomsViewMode}
            setSchedulesRoomsViewMode={setSchedulesRoomsViewMode}
            roomsSubView={roomsSubView}
            setRoomsSubView={setRoomsSubView}
            roomSearchQuery={roomSearchQuery}
            setRoomSearchQuery={setRoomSearchQuery as any}
            expandedSidebarTeacherId={expandedSidebarTeacherId}
            setExpandedSidebarTeacherId={setExpandedSidebarTeacherId}
            selectedFilterTeacherId={selectedFilterTeacherId}
            setSelectedFilterTeacherId={setSelectedFilterTeacherId}
            pendingBookings={pendingBookings}
            setPendingBookings={setPendingBookings}
            roomIssues={roomIssues}
            setRoomIssues={setRoomIssues as any}
            rooms={rooms}
            students={students}
            campusTeachers={campusTeachers}
            bypassTeachers={bypassTeachers}
            coaches={coaches}
            matrixAllocations={matrixAllocations || []}
            pendingSchedules={pendingSchedules || []}
            userMap={userMap}
            roomMap={roomMap}
            isAvvSigned={isAvvSigned}
            setShowAvvModal={setShowAvvModal}
            showLogbookModal={showLogbookModal}
            setShowLogbookModal={setShowLogbookModal}
            onOpenFacilityLogModal={onOpenFacilityLogModal}
            showStorageManagerModal={showStorageManagerModal}
            setShowStorageManagerModal={setShowStorageManagerModal}
            dismissedInvoiceAlert={dismissedInvoiceAlert}
            setDismissedInvoiceAlert={setDismissedInvoiceAlert}
            studentBillingOption={studentBillingOption}
            isBillingBooked={isBillingBooked}
            bookedExtraUsers={bookedExtraUsers}
            extraBillingOption={extraBillingOption}
            selectedStorageAddonGb={selectedStorageAddonGb}
            setSelectedStorageAddonGb={setSelectedStorageAddonGb}
            selectedInvoice={selectedInvoice}
            setSelectedInvoice={setSelectedInvoice}
            contractStartDate={contractStartDate}
            simulatedToday={simulatedToday}
            studentLevyMonthly_global={studentLevyMonthly_global}
            extraLevyMonthly_global={extraLevyMonthly_global}
            studentSharePreview_global={studentSharePreview_global}
            schoolShareBookedExtra_global={schoolShareBookedExtra_global}
            currentTotalB2B_global={currentTotalB2B_global}
            mixedTotal_global={mixedTotal_global}
            fetchLogbookBookings={fetchLogbookBookings}
            handleConfirmBooking={handleConfirmBooking}
            handleRejectBooking={handleRejectBooking}
            getEffectiveStorageUsedBytes={getEffectiveStorageUsedBytes}
          />
        </Suspense>
      )}

      {/* TAB 1.1: SECRETARY - CRISIS */}
      {secretarySubTab === 'crisis' && (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Vertretungs- &amp; Krisenmanagement...</div>}>
          <SecretaryCrisisView
            crisisNotifications={crisisNotifications}
            crisisTabMode={crisisTabMode}
            setCrisisTabMode={setCrisisTabMode}
            selectedCrisisTeacherId={selectedCrisisTeacherId}
            setSelectedCrisisTeacherId={setSelectedCrisisTeacherId}
            handleMarkAsNotified={handleMarkAsNotified}
            handleClaimTicket={handleClaimTicket}
            handleArchiveCrisisTicket={handleArchiveCrisisTicket}
            handleArchiveAllResolvedTickets={handleArchiveAllResolvedTickets}
            handleEndAbsenceOnBehalf={handleEndAbsenceOnBehalf}
            expandedLiveDayStr={expandedLiveDayStr}
            setExpandedLiveDayStr={setExpandedLiveDayStr}
            selectedArchiveLog={selectedArchiveLog}
            setSelectedArchiveLog={setSelectedArchiveLog}
          />
        </Suspense>
      )}

      {/* TAB 1.5: SECRETARY - EMPLOYEES */}
      {secretarySubTab === 'employees' && (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Mitarbeiter-Verwaltung wird geladen...</div>}>
          <SecretaryEmployeesView
            employees={employees}
            setEmployees={setEmployees}
            currentUserProfile={currentUserProfile}
            userId={userId}
            revealedPins={revealedPins}
            setRevealedPins={setRevealedPins}
            employeeFirstName={employeeFirstName}
            setEmployeeFirstName={setEmployeeFirstName}
            employeeLastName={employeeLastName}
            setEmployeeLastName={setEmployeeLastName}
            employeeSearchQuery={employeeSearchQuery}
            setEmployeeSearchQuery={setEmployeeSearchQuery}
            employeeStatusTab={employeeStatusTab}
            setEmployeeStatusTab={setEmployeeStatusTab}
            employeeFilterRole={employeeFilterRole}
            setEmployeeFilterRole={setEmployeeFilterRole}
            isEmployeeCsvExpanded={isEmployeeCsvExpanded}
            setIsEmployeeCsvExpanded={setIsEmployeeCsvExpanded}
            employeeCsvText={employeeCsvText}
            setEmployeeCsvText={setEmployeeCsvText}
            showAddEmployeeModal={showAddEmployeeModal}
            setShowAddEmployeeModal={setShowAddEmployeeModal}
            dragHoveredEmployeeRole={dragHoveredEmployeeRole}
            setDragHoveredEmployeeRole={setDragHoveredEmployeeRole}
            employeeFilterRoleFocused={employeeFilterRoleFocused}
            setEmployeeFilterRoleFocused={setEmployeeFilterRoleFocused}
            employeeStatusTabFocused={employeeStatusTabFocused}
            setEmployeeStatusTabFocused={setEmployeeStatusTabFocused}
            employeeSearchFocused={employeeSearchFocused}
            setEmployeeSearchFocused={setEmployeeSearchFocused}
            getAlphabeticalColor={getAlphabeticalColor}
            handleCreateEmployee={handleCreateEmployee}
            handleDeleteUser={handleDeleteUser}
            handleImportEmployees={handleImportEmployees as any}
            handleToggleRole={handleToggleRole as any}
            handleUpdateEmployeeRole={handleUpdateEmployeeRole}
          />
        </Suspense>
      )}

      {/* TAB 1.7: SECRETARY - LICENSES */}
      {secretarySubTab === 'licenses' && (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Abrechnung &amp; Infrastruktur...</div>}>
          <SecretaryLicensesView
            schoolId={schoolId}
            schoolNumericId={schoolNumericId}
            schoolName={schoolName}
            schoolStreet={schoolStreet}
            schoolHouseNumber={schoolHouseNumber}
            schoolZipCode={schoolZipCode}
            schoolCity={schoolCity}
            currentSchoolProfile={currentSchoolProfile}
            setCurrentSchoolProfile={setCurrentSchoolProfile}
            supabase={supabase}
            allTeachers={allTeachers}
            employees={employees}
            students={students}
            activeStudentsCount_global={activeStudentsCount_global}
            activeGroovelabStudentsCount_global={activeGroovelabStudentsCount_global}
            passiveStudentsCount_global={passiveStudentsCount_global}
            billableTeachersCount={billableTeachersCount}
            teacherServiceFeeTotal_global={teacherServiceFeeTotal_global}
            moduleCost_global={moduleCost_global}
            storageAddonFee_global={storageAddonFee_global}
            baseB2B_global={baseB2B_global}
            masterRates={masterRates}
            effectiveSchoolRates={effectiveSchoolRates}
            masterPricing={masterPricing}
            isSammelzahler={isSammelzahler}
            fetchDashboardData={fetchDashboardData as any}
            fetchTariffBookings={fetchTariffBookings as any}
            hasCampusSub={hasCampusSub}
            setHasCampusSub={setHasCampusSub}
            hasGroovelabSub={hasGroovelabSub}
            setHasGroovelabSub={setHasGroovelabSub}
            campusActivatedThisMonth={campusActivatedThisMonth}
            setCampusActivatedThisMonth={setCampusActivatedThisMonth}
            groovelabActivatedThisMonth={groovelabActivatedThisMonth}
            setGroovelabActivatedThisMonth={setGroovelabActivatedThisMonth}
            handleToggleCampusSub={handleToggleCampusSub}
            handleToggleGroovelabSub={handleToggleGroovelabSub}
            studentBillingOption={studentBillingOption}
            setStudentBillingOption={setStudentBillingOption}
            isBillingBooked={isBillingBooked}
            setIsBillingBooked={setIsBillingBooked}
            bookedExtraUsers={bookedExtraUsers}
            setBookedExtraUsers={setBookedExtraUsers}
            extraUsersSliderVal={extraUsersSliderVal}
            setExtraUsersSliderVal={setExtraUsersSliderVal}
            extraBillingOption={extraBillingOption}
            setExtraBillingOption={setExtraBillingOption}
            nextBillingOption={nextBillingOption}
            setNextBillingOption={setNextBillingOption}
            nextBillingOptionEffectiveAt={nextBillingOptionEffectiveAt}
            setNextBillingOptionEffectiveAt={setNextBillingOptionEffectiveAt}
            showChangeTariffModal={showChangeTariffModal}
            setShowChangeTariffModal={setShowChangeTariffModal}
            showCheckoutModal={showCheckoutModal}
            setShowCheckoutModal={setShowCheckoutModal}
            checkoutStep={checkoutStep}
            setCheckoutStep={setCheckoutStep}
            billingPayer={billingPayer as any}
            setBillingPayer={setBillingPayer as any}
            showSuccessModal={showSuccessModal}
            setShowSuccessModal={setShowSuccessModal}
            customUmlageAmount={customUmlageAmount}
            setCustomUmlageAmount={setCustomUmlageAmount}
            agreedToTerms={agreedToTerms}
            setAgreedToTerms={setAgreedToTerms}
            couponCode={couponCode}
            setCouponCode={setCouponCode}
            isCouponApplied={isCouponApplied}
            setIsCouponApplied={setIsCouponApplied}
            couponDiscount={couponDiscount}
            setCouponDiscount={setCouponDiscount}
            showCouponInput={showCouponInput}
            setShowCouponInput={setShowCouponInput}
            hasCustomBillingAddress={hasCustomBillingAddress}
            setHasCustomBillingAddress={setHasCustomBillingAddress}
            customBillingName={customBillingName}
            setCustomBillingName={setCustomBillingName}
            customBillingStreet={customBillingStreet}
            setCustomBillingStreet={setCustomBillingStreet}
            customBillingZip={customBillingZip}
            setCustomBillingZip={setCustomBillingZip}
            customBillingCity={customBillingCity}
            setCustomBillingCity={setCustomBillingCity}
            customBillingEmail={customBillingEmail}
            setCustomBillingEmail={setCustomBillingEmail}
            customBillingLeitwegId={customBillingLeitwegId}
            setCustomBillingLeitwegId={setCustomBillingLeitwegId}
            setShowAvvModal={setShowAvvModal}
            hasCustomActivationBillingAddress={hasCustomActivationBillingAddress}
            setHasCustomActivationBillingAddress={setHasCustomActivationBillingAddress}
            customActivationBillingName={customActivationBillingName}
            setCustomActivationBillingName={setCustomActivationBillingName}
            customActivationBillingStreet={customActivationBillingStreet}
            setCustomActivationBillingStreet={setCustomActivationBillingStreet}
            customActivationBillingZip={customActivationBillingZip}
            setCustomActivationBillingZip={setCustomActivationBillingZip}
            customActivationBillingCity={customActivationBillingCity}
            setCustomActivationBillingCity={setCustomActivationBillingCity}
            customActivationBillingEmail={customActivationBillingEmail}
            setCustomActivationBillingEmail={setCustomActivationBillingEmail}
            selectedStorageAddonGb={selectedStorageAddonGb}
            setSelectedStorageAddonGb={setSelectedStorageAddonGb}
            selectedStorageAddonFee={selectedStorageAddonFee}
            setSelectedStorageAddonFee={setSelectedStorageAddonFee}
            showStorageManagerModal={showStorageManagerModal}
            setShowStorageManagerModal={setShowStorageManagerModal}
            showSwitchBillingModelModal={showSwitchBillingModelModal}
            setShowSwitchBillingModelModal={setShowSwitchBillingModelModal}
            selectedSwitchTargetPayer={selectedSwitchTargetPayer as any}
            setSelectedSwitchTargetPayer={setSelectedSwitchTargetPayer as any}
            showStorageTerminationModal={showStorageTerminationModal}
            setShowStorageTerminationModal={setShowStorageTerminationModal}
            agreedToSepa={agreedToSepa}
            setAgreedToSepa={setAgreedToSepa}
            selectedInvoice={selectedInvoice}
            setSelectedInvoice={setSelectedInvoice}
            showConfirmExtra={showConfirmExtra}
            setShowConfirmExtra={setShowConfirmExtra}
            isSchoolTrial={isSchoolTrial}
            setIsSchoolTrial={setIsSchoolTrial}
            schoolTrialEndsAt={schoolTrialEndsAt}
            setSchoolTrialEndsAt={setSchoolTrialEndsAt}
            schoolStatus={schoolStatus}
            setSchoolStatus={setSchoolStatus}
            subscriptionBypass={subscriptionBypass}
            contractStartDate={contractStartDate}
            setContractStartDate={setContractStartDate as any}
            simulatedToday={simulatedToday}
            setSimulatedToday={setSimulatedToday as any}
            expandedYears={expandedYears}
            setExpandedYears={setExpandedYears}
            isCancelled={isCancelled}
            setIsCancelled={setIsCancelled}
            schoolContractEndsAt={schoolContractEndsAt}
            setSchoolContractEndsAt={setSchoolContractEndsAt}
            showModuleUpgradeModal={showModuleUpgradeModal}
            setShowModuleUpgradeModal={setShowModuleUpgradeModal}
            setUpgradeTargetModule={setUpgradeTargetModule}
            setShowCancelModal={setShowCancelModal}
            tariffBookings={tariffBookings}
            loadingTariffBookings={loadingTariffBookings}
            activeStudentsModalList={activeStudentsModalList}
            setActiveStudentsModalList={setActiveStudentsModalList}
            getEffectiveStorageUsedBytes={getEffectiveStorageUsedBytes}
            isSecretaryReadOnly={dunningStatus?.isSecretaryReadOnly || false}
            onOpenDunningPayModal={() => setShowDunningPayModal(true)}
          />
        </Suspense>
      )}

      {/* TAB: SECRETARY - RÄUME */}
      {secretarySubTab === 'rooms' && (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Raumverwaltung...</div>}>
          <SecretaryRoomsView
            schoolId={schoolId}
            rooms={rooms}
            setRooms={setRooms as any}
            buildings={buildings || []}
            setBuildings={setBuildings as any}
            matrixAllocations={matrixAllocations || []}
            roomSearchQuery={roomSearchQuery}
            setRoomSearchQuery={setRoomSearchQuery as any}
            selectedDayPlan={selectedDayPlan}
            setSelectedDayPlan={setSelectedDayPlan as any}
            supabase={supabase}
            fetchDashboardData={fetchDashboardData as any}
            parseRoomName={parseRoomName}
            getFloorColor={getFloorColor}
            getAlphabeticalColor={getAlphabeticalColor}
            formatInstrumentName={formatInstrumentName}
            roomIssues={roomIssues}
            getAlphabeticalUniColor={getAlphabeticalUniColor}
            checkTimeOverlap={checkTimeOverlap as any}
            getPlanDisplayName={getPlanDisplayName as any}
            roomsSubView={roomsSubView}
            setRoomsSubView={setRoomsSubView as any}
            pendingBookings={pendingBookings}
            handleConfirmBooking={handleConfirmBooking}
            handleRejectBooking={handleRejectBooking}
            onOpenFacilityLogModal={onOpenFacilityLogModal}
          />
        </Suspense>
      )}

      {/* TAB 1.7.5: SECRETARY - EQUIPMENT */}
      {secretarySubTab === 'equipment' && (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Inventar &amp; Instrumente...</div>}>
          <SecretaryEquipmentView
            schoolId={schoolId}
            schoolEquipment={schoolEquipment}
            rooms={rooms}
            selectedEquipmentRoomId={selectedEquipmentRoomId === 'All' ? null : selectedEquipmentRoomId}
            setSelectedEquipmentRoomId={(id: string | null) => setSelectedEquipmentRoomId(id || 'All')}
            equipmentFormName={equipmentFormName}
            setEquipmentFormName={setEquipmentFormName}
            equipmentFormQty={equipmentFormQty}
            setEquipmentFormQty={setEquipmentFormQty}
            equipmentSaving={equipmentSaving}
            handleSaveEquipment={handleSaveEquipment}
            equipmentSearchQuery={equipmentSearchQuery}
            setEquipmentSearchQuery={setEquipmentSearchQuery}
            equipmentSortFreeFirst={equipmentSortFreeFirst}
            setEquipmentSortFreeFirst={setEquipmentSortFreeFirst}
            dragOverRoomId={dragOverRoomId}
            setDragOverRoomId={setDragOverRoomId}
            handleDropInstrumentOnRoom={handleDropInstrumentOnRoom}
            editingEquipmentGroup={editingEquipmentGroup}
            setEditingEquipmentGroup={setEditingEquipmentGroup}
            editGroupName={editGroupName}
            setEditGroupName={setEditGroupName}
            editGroupModel={editGroupModel}
            setEditGroupModel={setEditGroupModel}
            editGroupLink={editGroupLink}
            setEditGroupLink={setEditGroupLink}
            editGroupCoupled={editGroupCoupled}
            setEditGroupCoupled={setEditGroupCoupled}
            editGroupQty={editGroupQty}
            setEditGroupQty={setEditGroupQty}
            editGroupInstancesData={editGroupInstancesData}
            setEditGroupInstancesData={setEditGroupInstancesData}
            handleSaveGroupEdit={handleSaveEquipmentGroup}
            handleDeleteEquipmentGroup={handleDeleteEquipmentGroup}
            equipmentNameInputRef={equipmentNameInputRef}
            equipmentQtyInputRef={equipmentQtyInputRef}
            parseRoomName={parseRoomName}
          />
        </Suspense>
      )}

      {/* TAB 1.8: SECRETARY - SETUP */}
      {secretarySubTab === 'setup' && (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Einstellungen...</div>}>
          <SecretarySetupView
            schoolId={schoolId}
            schoolName={schoolName || ''}
            setSchoolName={setSchoolName as any}
            schoolSubdomain={schoolSubdomain || ''}
            setSchoolSubdomain={setSchoolSubdomain as any}
            schoolStreet={schoolStreet || ''}
            setSchoolStreet={setSchoolStreet as any}
            schoolHouseNumber={schoolHouseNumber || ''}
            setSchoolHouseNumber={setSchoolHouseNumber as any}
            schoolZipCode={schoolZipCode || ''}
            setSchoolZipCode={setSchoolZipCode as any}
            schoolCity={schoolCity || ''}
            setSchoolCity={setSchoolCity as any}
            schoolPhoneNumber={schoolPhoneNumber || ''}
            setSchoolPhoneNumber={setSchoolPhoneNumber as any}
            schoolEmail={schoolEmail || ''}
            setSchoolEmail={setSchoolEmail as any}
            absenceEmail={absenceEmail || ''}
            setAbsenceEmail={setAbsenceEmail as any}
            logoUrl={logoUrl || ''}
            setLogoUrl={setLogoUrl as any}
            kioskPinLength={kioskPinLength}
            setKioskPinLength={setKioskPinLength}
            bypassPin={bypassPin}
            setBypassPin={setBypassPin}
            logRetention={logRetention}
            setLogRetention={setLogRetention}
            syncInterval={syncInterval}
            setSyncInterval={setSyncInterval}
            calendarUrls={calendarUrls}
            newCalendarUrlInput={newCalendarUrlInput}
            setNewCalendarUrlInput={setNewCalendarUrlInput}
            isAvvSigned={isAvvSigned}
            setShowAvvModal={setShowAvvModal as any}
            lastBackupDate={lastBackupDate}
            schoolYearStartDay={schoolYearStartDay}
            schoolYearStartMonth={schoolYearStartMonth}
            autoDeleteExpiredUsers={autoDeleteExpiredUsers}
            isCurrentDevicePasskeyActive={isCurrentDevicePasskeyActive}
            isSavingSettings={isSavingSettings}
            isSettingsDirty={isSettingsDirty}
            windowWidth={windowWidth}
            activeSecretarySettingsModal={activeSecretarySettingsModal}
            setActiveSecretarySettingsModal={setActiveSecretarySettingsModal}
            settingsTab={settingsTab}
            setSettingsTab={setSettingsTab}
            showResetModal={showResetModal}
            setShowResetModal={setShowResetModal}
            resetConfirmText={resetConfirmText}
            setResetConfirmText={setResetConfirmText}
            showOwnQrModal={showOwnQrModal}
            setShowOwnQrModal={setShowOwnQrModal}
            copiedSettingsLink={copiedSettingsLink}
            setCopiedSettingsLink={setCopiedSettingsLink}
            copiedSettingsPin={copiedSettingsPin}
            setCopiedSettingsPin={setCopiedSettingsPin}
            copiedKioskLink={copiedKioskLink}
            setCopiedKioskLink={setCopiedKioskLink}
            copiedSchoolLink={copiedSchoolLink}
            setCopiedSchoolLink={setCopiedSchoolLink}
            setIsFeedbackModalOpen={setIsFeedbackModalOpen}
            setShowDpoIdCardModal={setShowDpoIdCardModal}
            setShowDpoPortalModal={setShowDpoPortalModal}
            setQrModalUser={setQrModalUser}
            handleSaveAllSettings={handleSaveAllSettings}
            handleAddCalendarUrl={handleAddCalendarUrl}
            handleRemoveCalendarUrl={handleRemoveCalendarUrl}
            handleExportBackup={handleExportBackup}
            handleRestoreBackup={handleRestoreBackup}
            handleEnrollBiometrics={handleEnrollBiometrics}
            handleRemoveBiometrics={handleRemoveBiometrics}
            handleTestBiometrics={handleTestBiometrics}
            handleDeleteExpiredStudents={handleDeleteExpiredStudents}
            handleToggleAutoClean={handleToggleAutoClean}
            handleUpdateSchoolYear={handleUpdateSchoolYear}
            students={students}
            contractEndsAt={schoolContractEndsAt}
            currentUserProfile={currentUserProfile}
            biometricsStatus={biometricsStatus as any}
            biometricsMessage={biometricsMessage || ''}
            kioskToken={kioskToken || ''}
            hasCampusSub={hasCampusSub}
            hasGroovelabSub={hasGroovelabSub}
            studentBillingOption={studentBillingOption}
            isExporting={isExporting}
            isRestoring={isRestoring}
          />
        </Suspense>
      )}

      {/* TAB 1.9: SECRETARY - ANNOUNCEMENTS & DUTIES */}
      {(secretarySubTab === 'announcements' || secretarySubTab === 'duties') && (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Mitteilungen &amp; Informationen...</div>}>
          <SecretaryAnnouncementsView
            announcements={announcementsList}
            announcementsLoading={announcementsLoading}
            allUniqueTeachers={allUniqueTeachers}
            editingAnnouncementId={editingAnnouncementId}
            setEditingAnnouncementId={setEditingAnnouncementId}
            newAnnouncementTitle={newAnnouncementTitle}
            setNewAnnouncementTitle={setNewAnnouncementTitle}
            newAnnouncementDescription={newAnnouncementDescription}
            setNewAnnouncementDescription={setNewAnnouncementDescription}
            newAnnouncementType={newAnnouncementType}
            setNewAnnouncementType={setNewAnnouncementType}
            newAnnouncementPriority={newAnnouncementPriority}
            setNewAnnouncementPriority={setNewAnnouncementPriority}
            newAnnouncementIsAnonymous={newAnnouncementIsAnonymous}
            setNewAnnouncementIsAnonymous={setNewAnnouncementIsAnonymous}
            newAnnouncementTargetType={newAnnouncementTargetType}
            setNewAnnouncementTargetType={setNewAnnouncementTargetType}
            newAnnouncementTargetGroup={newAnnouncementTargetGroup}
            setNewAnnouncementTargetGroup={setNewAnnouncementTargetGroup}
            newAnnouncementTargetTeacherId={newAnnouncementTargetTeacherId}
            setNewAnnouncementTargetTeacherId={setNewAnnouncementTargetTeacherId}
            newAnnouncementDueDate={newAnnouncementDueDate}
            setNewAnnouncementDueDate={setNewAnnouncementDueDate}
            newAnnouncementRecurrence={newAnnouncementRecurrence}
            setNewAnnouncementRecurrence={setNewAnnouncementRecurrence}
            newAnnouncementAttachmentUrl={newAnnouncementAttachmentUrl}
            setNewAnnouncementAttachmentUrl={setNewAnnouncementAttachmentUrl}
            newAnnouncementQuestions={newAnnouncementQuestions}
            setNewAnnouncementQuestions={setNewAnnouncementQuestions}
            uploadingAnnouncementAttachment={isUploadingAnnouncementAttachment}
            handleUploadAnnouncementAttachment={handleUploadAnnouncementAttachment}
            handleSaveAnnouncement={(handleSaveAnnouncement || handleCreateAnnouncement || (async () => {})) as any}
            handleDeleteAnnouncement={handleDeleteAnnouncement}
            handleEditAnnouncement={handleEditAnnouncement}
            handleResetAnnouncementForm={handleResetAnnouncementForm}
            selectedAnnouncementForStats={selectedAnnouncementForStats}
            setSelectedAnnouncementForStats={setSelectedAnnouncementForStats}
            announcementResponses={announcementResponsesList}
            fetchAnnouncementStats={fetchAnnouncementStats}
            statsModalTab={statsModalTab as any}
            setStatsModalTab={setStatsModalTab}
            statsStatusFilter={statsStatusFilter as any}
            setStatsStatusFilter={setStatsStatusFilter}
            statsSearchQuery={statsSearchQuery}
            setStatsSearchQuery={setStatsSearchQuery}
            expandedResponseIds={expandedResponseIds}
            setExpandedResponseIds={setExpandedResponseIds}
            handleExportAnnouncementPdf={() => window.print()}
            handleExportAnnouncementCsv={() => handleExportCSV(selectedAnnouncementForStats)}
          />
        </Suspense>
      )}

      {/* TAB 1.10: SECRETARY - AUDIT */}
      {secretarySubTab === 'audit' && (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Audit-Logbuch...</div>}>
          <SecretaryAuditView
            auditLogs={auditLogs}
            auditLoading={auditLoading}
            auditSearchQuery={auditSearchQuery}
            setAuditSearchQuery={setAuditSearchQuery}
            auditActionFilter={auditActionFilter}
            setAuditActionFilter={setAuditActionFilter}
            auditLimit={auditLimit}
            setAuditLimit={setAuditLimit}
            userMap={userMap}
            exportAuditLogsToCsv={exportAuditLogsToCsv}
            translateKey={translateKey}
            translateValue={translateValue}
          />
        </Suspense>
      )}
    </>
  );
}

export default SecretaryVerwaltungTab;
