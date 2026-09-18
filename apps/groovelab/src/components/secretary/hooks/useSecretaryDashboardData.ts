import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { isSchoolBypassActive } from '../../../domain/pricingEngine';

export interface SystemAlert {
  id: string;
  schoolId: string;
  teacherId: string;
  type: string;
  message: string;
  createdAt: string;
  resolved: boolean;
  teacherName?: string;
}

export interface SecretaryBriefingData {
  openCapacityAlerts: number;
  inactiveTeachers: number;
  schedules: {
    draft: number;
    readyForReview: number;
    approved: number;
  };
  alerts: Array<{
    id: string;
    type: string;
    message: string;
    created_at: string;
  }>;
}

export interface UseSecretaryDashboardDataOptions {
  schoolId: string;
  userId?: string;
  userRole?: string;
  userRoles?: string[];
  schoolName: string;
  currentUserProfile: any;
  setCurrentUserProfile: (profile: any) => void;
  currentSchoolProfile: any;
  setCurrentSchoolProfile: (profile: any) => void;

  // External state bindings
  rooms: any[];
  setRooms: React.Dispatch<React.SetStateAction<any[]>>;
  subjects: any[];
  setSubjects: React.Dispatch<React.SetStateAction<any[]>>;
  userMap: Record<string, string>;
  setUserMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  schoolEquipment: any[];
  setSchoolEquipment: React.Dispatch<React.SetStateAction<any[]>>;
  schoolInvoices?: any[];
  setSchoolInvoices?: React.Dispatch<React.SetStateAction<any[]>>;

  // External hook callbacks & updaters
  fetchPendingBookings: () => void;
  fetchTariffBookings: (school?: any) => void;
  fetchRoomIssues: () => Promise<void>;
  fetchAnnouncements: () => Promise<void>;
  fetchLiveStatusData: () => Promise<void>;
  showRealtimeNotification: (msg: string) => void;
  initSettingsFromSchool: (school: any) => void;
  initBillingFromSchool: (school: any) => void;
  handleDeleteExpiredStudents: (auto: boolean, list: any[]) => void;

  // State setters from other hooks
  setStudents: (students: any[]) => void;
  setFrozenStudents: (frozen: any[]) => void;
  setCoaches: (coaches: any[]) => void;
  setCampusTeachers: (teachers: any[]) => void;
  setAllTeachers: (teachers: any[]) => void;
  setBypassTeachers: (teachers: any[]) => void;
  setEmployees: (employees: any[]) => void;
  setPendingSchedules: (schedules: any[]) => void;
  setMatrixAllocations: (allocs: any[]) => void;
  setUnsubmittedTeachers: (map: any) => void;
  setActiveSessions: (sessions: any[]) => void;
  setHelpRequests: (requests: any[]) => void;
  setTickets: (tickets: any[]) => void;
  setSelectedRoomId: (id: string) => void;
  selectedRoomId: string | null;

  // Settings setters
  setIsAvvSigned: (val: boolean) => void;
  setSchoolName: (val: string) => void;
  setSchoolStreet: (val: string) => void;
  setSchoolHouseNumber: (val: string) => void;
  setSchoolZipCode: (val: string) => void;
  setSchoolCity: (val: string) => void;
  setSchoolPhoneNumber: (val: string) => void;
  setSchoolEmail: (val: string) => void;
  setAbsenceEmail: (val: string) => void;
  setSchoolSubdomain: (val: string) => void;
  setOpeningHours: (val: any) => void;
  setEditColor: (val: string) => void;
  setIsSchoolTrial: (val: boolean) => void;
  setSchoolTrialEndsAt: (val: string | null) => void;
  setSchoolStatus: (val: string) => void;
  setSubscriptionBypass: (val: boolean) => void;
  setSelectedStorageAddonGb: (val: number) => void;
  setSelectedStorageAddonFee: (val: number) => void;
  setKioskToken: (val: string) => void;
  setCampusToken: (val: string) => void;
  setAllowMessagesGlobal: (val: boolean) => void;
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

  // Extended settings setters
  setCampusHomeworkNotesSync: (val: boolean) => void;
  setCampusMeisterwerkEnabled: (val: boolean) => void;
  setCampusFocusTimerDefaultMin: (val: number) => void;
  setCampusFocusTimerXpFactor: (val: number) => void;
  setCampusLoopstationBarsPause: (val: number) => void;
  setCampusAudioMaxSessionMinutes: (val: number) => void;
  setCampusScheduleSlotMinutes: (val: number) => void;
  setCampusScheduleConflictWarning: (val: boolean) => void;
  setCampusParentAbsenceNotify: (val: boolean) => void;
  setCampusParentChatEnabled: (val: boolean) => void;
  setCampusParentStatsEnabled: (val: boolean) => void;
  setCampusKioskPinLength: (val: number) => void;
  setCampusKioskAutoLogoutMinutes: (val: number) => void;
  setGlMaxBandMembers: (val: number) => void;
  setGlAllowStudentBandCreation: (val: boolean) => void;
  setGlSongLevelStarterEnabled: (val: boolean) => void;
  setGlSongLevelProEnabled: (val: boolean) => void;
  setGlSongLevelMasterEnabled: (val: boolean) => void;
  setGlSongProposalWorkflow: (val: boolean) => void;
  setGlLiveDefaultBpm: (val: number) => void;
  setGlLiveCountInBars: (val: number) => void;
  setGlLiveStageDisplayEnabled: (val: boolean) => void;
  setGlSkillRadarTiming: (val: boolean) => void;
  setGlSkillRadarTechnique: (val: boolean) => void;
  setGlSkillRadarSound: (val: boolean) => void;
  setGlSkillRadarRepertoire: (val: boolean) => void;
  setGlSkillRadarTeamplay: (val: boolean) => void;
  setGlMusicianAvatarsEnabled: (val: boolean) => void;
  setGlBandCoatOfArmsEnabled: (val: boolean) => void;
  setGlBandChatEnabled: (val: boolean) => void;
  setGlCoachModerationRequired: (val: boolean) => void;
  setGlJamRecordingCompression: (val: boolean) => void;
}

export interface UseSecretaryDashboardDataReturn {
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  schoolInvoices: any[];
  setSchoolInvoices: React.Dispatch<React.SetStateAction<any[]>>;
  buildings: any[];
  setBuildings: React.Dispatch<React.SetStateAction<any[]>>;
  stations: any[];
  setStations: React.Dispatch<React.SetStateAction<any[]>>;
  bands: any[];
  setBands: React.Dispatch<React.SetStateAction<any[]>>;
  alerts: SystemAlert[];
  setAlerts: React.Dispatch<React.SetStateAction<SystemAlert[]>>;
  briefingData: SecretaryBriefingData | null;
  setBriefingData: React.Dispatch<React.SetStateAction<SecretaryBriefingData | null>>;
  schoolEvents: any[];
  setSchoolEvents: React.Dispatch<React.SetStateAction<any[]>>;
  roomMap: Record<string, string>;
  setRoomMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  fetchDashboardData: () => Promise<void>;
}

export function useSecretaryDashboardData(options: UseSecretaryDashboardDataOptions): UseSecretaryDashboardDataReturn {
  const {
    schoolId,
    userId,
    userRole,
    currentUserProfile,
    setCurrentUserProfile,
    setCurrentSchoolProfile,
    rooms,
    setRooms,
    subjects,
    setSubjects,
    userMap,
    setUserMap,
    schoolEquipment,
    setSchoolEquipment,
    fetchPendingBookings,
    fetchTariffBookings,
    fetchRoomIssues,
    fetchAnnouncements,
    fetchLiveStatusData,
    showRealtimeNotification,
    initSettingsFromSchool,
    initBillingFromSchool,
    handleDeleteExpiredStudents,
    setStudents,
    setFrozenStudents,
    setCoaches,
    setCampusTeachers,
    setAllTeachers,
    setBypassTeachers,
    setEmployees,
    setPendingSchedules,
    setMatrixAllocations,
    setUnsubmittedTeachers,
    setActiveSessions,
    setHelpRequests,
    setTickets,
    setSelectedRoomId,
    selectedRoomId,
    setIsAvvSigned,
    setSchoolName,
    setSchoolStreet,
    setSchoolHouseNumber,
    setSchoolZipCode,
    setSchoolCity,
    setSchoolPhoneNumber,
    setSchoolEmail,
    setAbsenceEmail,
    setSchoolSubdomain,
    setOpeningHours,
    setEditColor,
    setIsSchoolTrial,
    setSchoolTrialEndsAt,
    setSchoolStatus,
    setSubscriptionBypass,
    setSelectedStorageAddonGb,
    setSelectedStorageAddonFee,
    setKioskToken,
    setCampusToken,
    setAllowMessagesGlobal,
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
    setCampusHomeworkNotesSync,
    setCampusMeisterwerkEnabled,
    setCampusFocusTimerDefaultMin,
    setCampusFocusTimerXpFactor,
    setCampusLoopstationBarsPause,
    setCampusAudioMaxSessionMinutes,
    setCampusScheduleSlotMinutes,
    setCampusScheduleConflictWarning,
    setCampusParentAbsenceNotify,
    setCampusParentChatEnabled,
    setCampusParentStatsEnabled,
    setCampusKioskPinLength,
    setCampusKioskAutoLogoutMinutes,
    setGlMaxBandMembers,
    setGlAllowStudentBandCreation,
    setGlSongLevelStarterEnabled,
    setGlSongLevelProEnabled,
    setGlSongLevelMasterEnabled,
    setGlSongProposalWorkflow,
    setGlLiveDefaultBpm,
    setGlLiveCountInBars,
    setGlLiveStageDisplayEnabled,
    setGlSkillRadarTiming,
    setGlSkillRadarTechnique,
    setGlSkillRadarSound,
    setGlSkillRadarRepertoire,
    setGlSkillRadarTeamplay,
    setGlMusicianAvatarsEnabled,
    setGlBandCoatOfArmsEnabled,
    setGlBandChatEnabled,
    setGlCoachModerationRequired,
    setGlJamRecordingCompression
  } = options;

  // Local states owned by this hook
  const [loading, setLoading] = useState<boolean>(true);
  const [internalSchoolInvoices, internalSetSchoolInvoices] = useState<any[]>([]);
  const schoolInvoices = options.schoolInvoices ?? internalSchoolInvoices;
  const setSchoolInvoices = options.setSchoolInvoices ?? internalSetSchoolInvoices;
  const [buildings, setBuildings] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [bands, setBands] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [briefingData, setBriefingData] = useState<SecretaryBriefingData | null>(null);
  const [schoolEvents, setSchoolEvents] = useState<any[]>([]);
  const [roomMap, setRoomMap] = useState<Record<string, string>>({});

  // 🎙️ Dynamic Multi-Layer Audio-Vault Calculator (Local-First + Cloud Reconciliation)
  const getEffectiveStorageUsedBytes = (profile: any): number => {
    let bytes = Number(profile?.storage_used_bytes || 0);

    try {
      if (typeof window !== 'undefined') {
        let localBytes = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;

          // 1. Homework audio notes: campus_homework_notes_${studentId}
          if (key.startsWith('campus_homework_notes_')) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const notes = JSON.parse(val);
                if (Array.isArray(notes)) {
                  notes.forEach((note: string) => {
                    if (typeof note === 'string' && (note.startsWith('AUDIO:') || note.startsWith('LOOP:'))) {
                      const parts = note.split('|');
                      const durSec = Number(parts[1] || 10);
                      localBytes += Math.max(120000, durSec * 32000);
                    }
                  });
                }
              }
            } catch {}
          }

          // 2. Junior student recordings: campus_junior_recordings_${studentId}
          if (key.startsWith('campus_junior_recordings_')) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const recs = JSON.parse(val);
                if (Array.isArray(recs)) {
                  recs.forEach((rec: any) => {
                    const dur = Number(rec?.duration || 10);
                    localBytes += Math.max(120000, dur * 32000);
                  });
                }
              }
            } catch {}
          }

          // 3. Audio biography takes: campus_audio_biography_${studentId}
          if (key.startsWith('campus_audio_biography_')) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const bio = JSON.parse(val);
                if (Array.isArray(bio)) {
                  bio.forEach((track: any) => {
                    const dur = Number(track?.duration || 30);
                    localBytes += Math.max(250000, dur * 32000);
                  });
                }
              }
            } catch {}
          }
        }
        bytes = Math.max(bytes, localBytes);
      }
    } catch {}

    return bytes;
  };

  const fetchDashboardData = useCallback(async () => {
    if (!schoolId) return;

    try {
      setLoading(true);
      fetchPendingBookings();
      fetchTariffBookings();

      // Check B2B AVV legal consent status (Single Source of Truth)
      let hasB2bAvvConsent = false;
      try {
        const { data: consentData, error: consentError } = await supabase
          .from('legal_consents')
          .select('id')
          .eq('school_id', schoolId)
          .eq('consent_type', 'terms_b2b_avv')
          .eq('is_revoked', false)
          .maybeSingle();

        if (!consentError && consentData) {
          hasB2bAvvConsent = true;
        }
      } catch (err) {
        console.error('[Dashboard] Error in B2B AVV legal consent check:', err);
      }

      // Parallelized fetch of school settings, users, student contract statuses, pending students, activation days, and schedules
      const [
        schoolResult,
        usersResult,
        studentsDbResult,
        pendingStudentsResult,
        actDaysResult,
        allSchedsResult
      ] = await Promise.all([
        supabase
          .from('schools')
          .select('id, subdomain, name, logo_url, primary_color, calendar_url, groovelab_kiosk_token, campus_login_token, allow_messages_global, has_campus_subscription, has_groovelab_subscription, is_paused, limits_enabled, user_quota, pending_user_quota, campus_activated_this_month, groovelab_activated_this_month, student_billing_option, zip_code, city, street, house_number, phone_number, email, contract_ends_at, created_at, is_billing_booked, contract_start_date, extra_billing_option, opening_hours, is_trial, trial_ends_at, status, subscription_bypass, school_year_start_month, school_year_start_day, auto_delete_expired_users, custom_price_campus, custom_price_groovelab, custom_price_kombi, custom_price_teacher, custom_price_student, grandfathered_campus_price, grandfathered_groovelab_price, grandfathered_kombi_price, grandfathered_teacher_price, grandfathered_student_price, price_grandfathered_at, avv_signed_at, avv_signee_name, storage_addon_gb, storage_addon_monthly_fee, storage_addon_status, storage_pending_downgrade_gb, storage_pending_effective_date, storage_used_bytes')
          .eq('id', schoolId)
          .single(),
        supabase
          .from('users')
          .select('id, first_name, last_name, role, roles, email, instrument, is_active, ausweis_nummer, teacher_qr_token, is_campus_active, is_groovelab_active, nickname, is_premium_user, contract_ends_at, teacher_id, lesson_duration, qr_token, is_pin_activated, ausfall_until, personal_pin, created_at, preferred_room_ids, planned_boards, student_billing_payment_method, activated_at, student_billing_cash_paid, is_trial, trial_ends_at, exempt_from_direct_billing')
          .eq('school_id', schoolId),
        supabase
          .from('students')
          .select('id, status, onboarding_frozen, onboarding_pin, timetable_assigned_at')
          .eq('school_id', schoolId),
        supabase
          .from('pending_students_decrypted')
          .select('id, school_id, teacher_id, instrument, status, created_at, first_name, last_name, day_of_birth')
          .eq('school_id', schoolId),
        supabase
          .from('activation_days')
          .select('student_id, day_of_birth')
          .eq('school_id', schoolId),
        supabase
          .from('schedules')
          .select('status, teacher_id, student_id')
          .eq('school_id', schoolId)
      ]);

      let rawSchoolData: any = schoolResult.data;
      if (schoolResult.error) {
        console.warn('[SecretaryDashboard] schoolResult query warning, trying fallback select:', schoolResult.error);
        const fallbackRes = await supabase
          .from('schools')
          .select('*')
          .eq('id', schoolId)
          .maybeSingle();
        if (fallbackRes.data) {
          rawSchoolData = fallbackRes.data;
        }
      }
      if (!rawSchoolData) {
        console.warn('[SecretaryDashboard] School record empty, initializing baseline profile for', schoolId);
        rawSchoolData = { id: schoolId, name: 'Meine Musikschule' };
      }
      let schoolData: any = rawSchoolData;
      if (schoolData) {
        const localSignedTimestamp = typeof window !== 'undefined' 
          ? (localStorage.getItem(`groovelab_avv_signed_${schoolId}`) || localStorage.getItem(`groovelab_avv_signed_${schoolData.id}`)) 
          : null;
        if (localSignedTimestamp && !schoolData.avv_signed_at) {
          schoolData.avv_signed_at = localSignedTimestamp;
        }

        let storageAddonGbFromSource = Number(schoolData.storage_addon_gb || schoolData.extra_storage_gb || 0);

        schoolData.storage_addon_gb = storageAddonGbFromSource;
        if (storageAddonGbFromSource > 0) {
          schoolData.storage_addon_status = 'active';
        }

        const storageUsedBytesFromSource = getEffectiveStorageUsedBytes(schoolData);
        schoolData.storage_used_bytes = storageUsedBytesFromSource;

        setCurrentSchoolProfile(schoolData);
        fetchTariffBookings(schoolData);
        setIsAvvSigned(Boolean(schoolData.avv_signed_at || hasB2bAvvConsent || localSignedTimestamp));
        if (storageAddonGbFromSource > 0 && schoolData.storage_addon_status !== 'cancelled') {
          localStorage.setItem('groovelab_storage_addon_active', 'true');
          localStorage.setItem('campus_storage_addon_active', 'true');
          localStorage.setItem('groovelab_storage_addon_gb', String(storageAddonGbFromSource));
          localStorage.setItem('campus_storage_addon_gb', String(storageAddonGbFromSource));
          localStorage.setItem(`groovelab_storage_addon_gb_${schoolId}`, String(storageAddonGbFromSource));
          localStorage.setItem(`campus_storage_addon_gb_${schoolId}`, String(storageAddonGbFromSource));
        }
        setSchoolName(schoolData.name || 'Musäk Bad Säckingen');
        setSchoolStreet(schoolData.street || 'Karl-Fürstenberg-Str.');
        setSchoolHouseNumber(schoolData.house_number || '59');
        setSchoolZipCode(schoolData.zip_code || '79618');
        setSchoolCity(schoolData.city || 'Rheinfelden');
        setSchoolPhoneNumber(schoolData.phone || '');
        setSchoolEmail(schoolData.email || schoolData.contact_email || '');
        setAbsenceEmail(schoolData.absence_email || '');
        setSchoolSubdomain(schoolData.subdomain || '');
        setOpeningHours(schoolData.opening_hours);
        const op = schoolData.opening_hours || {};
        setEnabledCampusSubjects(op.gl_setting_subjects !== false);
        setEnabledCampusRooms(op.gl_setting_rooms !== false);
        setEnabledCampusEvents(op.gl_setting_events !== false);
        setEnabledCampusSchedules(op.gl_setting_schedules !== false);
        setEnabledCalendarWidget(op.gl_setting_calendar_widget !== false);
        setEnabledQrLogin(op.gl_setting_qr_login !== false);
        setTeachersManageStudents(op.gl_setting_groovelab_teachers_manage_students === true);
        setTeachersManageTeachers(op.gl_setting_groovelab_teachers_manage_teachers === true);
        setCampusTeachersManageStudents(op.gl_setting_campus_teachers_manage_students === true);
        setCampusTeachersManageTeachers(op.gl_setting_campus_teachers_manage_teachers === true);

        // Extended Campus Settings
        setCampusHomeworkNotesSync(op.gl_campus_homework_notes_sync !== false);
        setCampusMeisterwerkEnabled(op.gl_campus_meisterwerk_enabled !== false);
        setCampusFocusTimerDefaultMin(Number(op.gl_campus_focus_timer_min || 25));
        setCampusFocusTimerXpFactor(Number(op.gl_campus_focus_timer_xp || 1));
        setCampusLoopstationBarsPause(Number(op.gl_campus_loopstation_bars_pause || 4));
        setCampusAudioMaxSessionMinutes(Number(op.gl_campus_audio_max_min || 10));
        setCampusScheduleSlotMinutes(Number(op.gl_campus_schedule_slot_min || 45));
        setCampusScheduleConflictWarning(op.gl_campus_schedule_conflict_warning !== false);
        setCampusParentAbsenceNotify(op.gl_campus_parent_absence_notify !== false);
        setCampusParentChatEnabled(op.gl_campus_parent_chat_enabled !== false);
        setCampusParentStatsEnabled(op.gl_campus_parent_stats_enabled !== false);
        setCampusKioskPinLength(Number(op.gl_campus_kiosk_pin_length || 4));
        setCampusKioskAutoLogoutMinutes(Number(op.gl_campus_kiosk_auto_logout_min || 5));

        // Extended GrooveLab Settings
        setGlMaxBandMembers(Number(op.gl_max_band_members || 8));
        setGlAllowStudentBandCreation(op.gl_allow_student_band_creation !== false);
        setGlSongLevelStarterEnabled(op.gl_song_level_starter !== false);
        setGlSongLevelProEnabled(op.gl_song_level_pro !== false);
        setGlSongLevelMasterEnabled(op.gl_song_level_master !== false);
        setGlSongProposalWorkflow(op.gl_song_proposal_workflow !== false);
        setGlLiveDefaultBpm(Number(op.gl_live_default_bpm || 120));
        setGlLiveCountInBars(Number(op.gl_live_count_in_bars || 1));
        setGlLiveStageDisplayEnabled(op.gl_live_stage_display_enabled !== false);
        setGlSkillRadarTiming(op.gl_skill_radar_timing !== false);
        setGlSkillRadarTechnique(op.gl_skill_radar_technique !== false);
        setGlSkillRadarSound(op.gl_skill_radar_sound !== false);
        setGlSkillRadarRepertoire(op.gl_skill_radar_repertoire !== false);
        setGlSkillRadarTeamplay(op.gl_skill_radar_teamplay !== false);
        setGlMusicianAvatarsEnabled(op.gl_musician_avatars_enabled !== false);
        setGlBandCoatOfArmsEnabled(op.gl_band_coat_of_arms_enabled !== false);
        setGlBandChatEnabled(op.gl_band_chat_enabled !== false);
        setGlCoachModerationRequired(op.gl_coach_moderation_required === true);
        setGlJamRecordingCompression(op.gl_jam_recording_compression !== false);

        setSchoolEmail(schoolData.email || '');
        setEditColor(schoolData.primary_color || '#1a73e8');
        const dbIsBooked = schoolData.is_billing_booked === true;
        const storedIsBookedStr = typeof window !== 'undefined' ? localStorage.getItem(`isBillingBooked_${schoolId}`) : null;
        const isExplicitlyReset = storedIsBookedStr === 'false';
        const isBooked = !isExplicitlyReset && (dbIsBooked || storedIsBookedStr === 'true');

        setIsSchoolTrial(isBooked ? false : (schoolData.is_trial ?? false));
        setSchoolTrialEndsAt(schoolData.trial_ends_at || null);
        setSchoolStatus(isBooked ? 'active' : (schoolData.status || 'active'));
        setSubscriptionBypass(isSchoolBypassActive(schoolData));

        const storageGbFromDb = Number(schoolData.storage_addon_gb ?? schoolData.extra_storage_gb ?? 0);
        const storageFeeFromDb = Number(schoolData.storage_addon_monthly_fee || 0);
        const storageFeeDefault = (storageGbFromDb === 5 ? 1.49 : storageGbFromDb === 10 ? 1.99 : storageGbFromDb === 20 ? 3.99 : storageGbFromDb === 25 ? 3.99 : storageGbFromDb === 50 ? 6.99 : storageGbFromDb === 100 ? 11.99 : storageGbFromDb === 250 ? 24.99 : 0);
        const effectiveStorageFee = storageFeeFromDb > 0 ? storageFeeFromDb : (storageGbFromDb > 0 ? storageFeeDefault : 0);

        setSelectedStorageAddonGb(storageGbFromDb);
        setSelectedStorageAddonFee(effectiveStorageFee);
        initSettingsFromSchool(schoolData);
        setKioskToken(schoolData.groovelab_kiosk_token || '');
        setCampusToken(schoolData.campus_login_token || '');
        setAllowMessagesGlobal(schoolData.allow_messages_global ?? true);
        // Hydrate all billing, license, subscription and quota settings
        initBillingFromSchool(schoolData);
        
        // Load cloud-persisted GoBD invoices into local cache (v4)
        if (schoolId) {
          try {
            // Clean legacy unversioned & v3 caches
            Object.keys(localStorage).forEach(k => {
              if (k.startsWith(`campus_gobd_${schoolId}_`) || k.startsWith(`campus_gobd_v3_${schoolId}_`)) {
                localStorage.removeItem(k);
              }
              if (k.startsWith(`campus_gobd_v4_${schoolId}_`)) {
                try {
                  const item = JSON.parse(localStorage.getItem(k) || '{}');
                  if (!item || item.amount === undefined || item.amount === null || item.amount === 0 || isNaN(item.amount)) {
                    localStorage.removeItem(k);
                  }
                } catch (e) {
                  localStorage.removeItem(k);
                }
              }
            });
          } catch (e) {}

          supabase
            .from('invoices')
            .select('id, type, amount, status, billing_date, due_date, items')
            .eq('school_id', schoolId)
            .then(({ data, error }) => {
              if (data && !error) {
                setSchoolInvoices(data);
                if (typeof window !== 'undefined') {
                  data.forEach((inv: any) => {
                    if (inv.items && inv.items.gobd_version === 4) {
                      const snapKey = `campus_gobd_v4_${schoolId}_${inv.id}`;
                      const validAmount = (inv.amount && Number(inv.amount) > 0) ? Number(inv.amount) : (inv.items.amount || undefined);
                      if (validAmount) {
                        const merged = { ...inv.items, amount: validAmount, id: inv.id, status: (inv.status === 'paid' || inv.status === 'Bezahlt') ? 'Bezahlt' : (inv.status || 'Bezahlt') };
                        localStorage.setItem(snapKey, JSON.stringify(merged));
                      }
                    }
                  });
                }
              }
            });
        }
      }

      let allUsers: any[] = usersResult.data || [];
      if (usersResult.error) {
        console.warn('[SecretaryDashboard] usersResult warning, trying resilient fallback:', usersResult.error);
        try {
          const fallbackUsersRes = await supabase
            .from('users')
            .select('*')
            .eq('school_id', schoolId);
          if (fallbackUsersRes.data && fallbackUsersRes.data.length > 0) {
            allUsers = fallbackUsersRes.data;
          }
        } catch (e) {}
      }

      // Fetch contract statuses for all students
      const { data: studentsDb } = studentsDbResult;

      // Extract frozen profiles
      const frozenList: any[] = [];
      const { data: pendingStudents } = pendingStudentsResult;

      studentsDb?.forEach(st => {
        if (st.onboarding_frozen) {
          const pending = pendingStudents?.find(p => p.id === st.id);
          const activeUser = allUsers?.find(u => u.id === st.id);
          const first_name = pending?.first_name || activeUser?.first_name || 'Unbekannt';
          const last_name = pending?.last_name || activeUser?.last_name || 'Schüler';
          const instrument = pending?.instrument || activeUser?.instrument || 'Instrument';
          frozenList.push({
            id: st.id,
            first_name,
            last_name,
            instrument,
            timetable_assigned_at: st.timetable_assigned_at
          });
        }
      });
      setFrozenStudents(frozenList);

      // Fetch activation days for student onboarding verification
      const { data: actDays } = actDaysResult;
      const activationDaysMap: Record<string, number> = {};
      if (actDays) {
        actDays.forEach(ad => {
          if (ad.student_id) {
            activationDaysMap[ad.student_id] = ad.day_of_birth;
          }
        });
      }

      // Fetch all schedules for dynamic student counting
      const { data: allScheds } = allSchedsResult;
      const teacherStudentMap: Record<string, Set<string>> = {};
      if (allScheds) {
        allScheds.forEach(s => {
          if (s.status === 'approved' && s.teacher_id && s.student_id) {
            if (!teacherStudentMap[s.teacher_id]) {
              teacherStudentMap[s.teacher_id] = new Set();
            }
            teacherStudentMap[s.teacher_id].add(s.student_id);
          }
        });
      }

      const map: Record<string, string> = {};
      const userInstrumentMap: Record<string, string> = {};
      const coachesList: any[] = [];
      const campusTeachersList: any[] = [];
      const bypassList: any[] = [];
      const employeesList: any[] = [];
      const studentsList: any[] = [];
      const teacherInstrumentMap: Record<string, string> = {};

      allUsers?.forEach(u => {
        if (u.role === 'teacher' || (u.roles && u.roles.includes('teacher'))) {
          if (u.instrument) {
            teacherInstrumentMap[u.id] = u.instrument;
          }
        }
      });

      allUsers?.forEach(u => {
        const fullName = `${u.first_name} ${u.last_name}`;
        map[u.id] = fullName;
        userInstrumentMap[u.id] = u.instrument || '';

        const isEmployee = u.role === 'admin' || u.role === 'secretary' ||
          (u.roles && (u.roles.includes('admin') || u.roles.includes('secretary')));
        if (isEmployee) {
          employeesList.push(u);
        }

        if (u.role === 'student') {
          const pendingMatch = pendingStudents?.find(p => p.id === u.id || (p.first_name && u.first_name && p.first_name.toLowerCase().trim() === u.first_name.toLowerCase().trim()));
          const resolvedDay = activationDaysMap[u.id] || (u as any).day_of_birth || pendingMatch?.day_of_birth || (pendingMatch ? activationDaysMap[pendingMatch.id] : null) || 1;
          const hasCreatedPin = Boolean(activationDaysMap[u.id] || (pendingMatch && activationDaysMap[pendingMatch.id]) || (u as any).onboarding_pin || (u as any).pin);
          const isGrooveActive = Boolean(u.is_groovelab_active);
          const resolvedStatus = (hasCreatedPin || isGrooveActive) ? 'aktiv' : (u.status || 'offen');
          const isPending = !hasCreatedPin && !isGrooveActive;

          let resolvedInstrument = u.instrument;
          if (!u.teacher_id) {
            resolvedInstrument = 'Musiker';
          } else if (!resolvedInstrument || resolvedInstrument === 'Musiker' || resolvedInstrument === 'Nicht festgelegt' || resolvedInstrument === 'Instrument') {
            resolvedInstrument = teacherInstrumentMap[u.teacher_id] || 'Musiker';
          }

          studentsList.push({
            ...u,
            instrument: resolvedInstrument,
            isPendingOnboarding: isPending,
            day_of_birth: resolvedDay,
            status: resolvedStatus,
            is_active: isGrooveActive ? true : (u.is_active ?? false),
            is_app_user: isGrooveActive ? true : (u.is_app_user ?? false)
          });
        }
      });

      // Helper for normalized key matching
      const normKey = (f: string, l: string) => `${(f || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '')}_${(l || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '')}`;
      const isTestName = (f: string, l: string) => {
        const fn = (f || '').toLowerCase().trim();
        const full = `${f || ''} ${l || ''}`.toLowerCase().trim();
        return !fn || fn.startsWith('test') || fn.includes('testvorname') || full.includes('ausstehend') || full.includes('onboarding') || full.includes('unbekannt') || full === 'schüler' || full === 'musiker';
      };

      // Merge pending students into student list (avoid duplicates and orphan stubs)
      if (pendingStudents) {
        pendingStudents.forEach(ps => {
          if (!ps) return;
          const rawFName = (ps.first_name || '').trim();
          const rawLName = (ps.last_name || '').trim();
          if (isTestName(rawFName, rawLName)) return;

          const psNormKey = normKey(rawFName, rawLName);
          const userMatch = allUsers?.find(u => u.id === ps.id || (psNormKey !== '_' && normKey(u.first_name, u.last_name) === psNormKey));
          const exists = studentsList.some(s => s.id === ps.id || (psNormKey !== '_' && normKey(s.first_name, s.last_name) === psNormKey));
          if (!exists) {
            const fName = rawFName;
            const lName = rawLName;
            const fullName = `${fName} ${lName}`.trim();
            
            map[ps.id] = fullName;
            userInstrumentMap[ps.id] = ps.instrument || '';

            const isCampusAct = userMatch ? !!userMatch.is_campus_active : ((ps as any).is_campus_active === true);
            const isGrooveAct = userMatch ? !!userMatch.is_groovelab_active : ((ps as any).is_groovelab_active === true);

            const effectiveTeacherId = ps.teacher_id || (userMatch ? userMatch.teacher_id : null);
            let resolvedInstrument = ps.instrument || (userMatch ? userMatch.instrument : null);
            if (!effectiveTeacherId) {
              resolvedInstrument = 'Musiker';
            } else if (!resolvedInstrument || resolvedInstrument === 'Musiker' || resolvedInstrument === 'Nicht festgelegt' || resolvedInstrument === 'Instrument') {
              resolvedInstrument = teacherInstrumentMap[effectiveTeacherId] || 'Musiker';
            }

            studentsList.push({
              id: ps.id,
              school_id: ps.school_id,
              teacher_id: effectiveTeacherId,
              role: 'student',
              first_name: fName,
              last_name: lName,
              email: '',
              instrument: resolvedInstrument,
              is_active: isGrooveAct ? true : false,
              is_app_user: isGrooveAct ? true : false,
              is_campus_active: isCampusAct,
              is_groovelab_active: isGrooveAct,
              status: isGrooveAct ? 'aktiv' : 'inactive',
              isPendingOnboarding: isGrooveAct ? false : true,
              day_of_birth: ps.day_of_birth || null,
              ausweis_nummer: isGrooveAct ? 'GrooveLab Aktiv' : 'Ausstehend (Onboarding)',
              created_at: ps.created_at || new Date().toISOString()
            });
          }
        });
      }

      allUsers?.forEach(u => {
        const isTeacher = u.role === 'teacher' || (Array.isArray(u.roles) && u.roles.includes('teacher'));
        if (isTeacher) {
          const currentStudentCount = studentsList.filter(s => s.teacher_id === u.id).length;
          if (!u.is_active) {
            bypassList.push({
              id: u.id,
              firstName: u.first_name,
              lastName: u.last_name,
              email: u.email || '',
              instrument: u.instrument || '',
              maxStudents: 10,
              ausweisNummer: u.ausweis_nummer || '',
              teacherQrToken: u.teacher_qr_token || '',
              studentCount: currentStudentCount,
              contractEndsAt: u.contract_ends_at || null,
              isCampusActive: u.is_campus_active,
              isGroovelabActive: u.is_groovelab_active,
              isActive: u.is_active ?? false,
              role: u.role,
              roles: u.roles,
              isPinActivated: u.is_pin_activated,
              ausfall_until: u.ausfall_until,
              preferred_room_ids: u.preferred_room_ids || []
            });
          } else {
            if (u.is_groovelab_active) {
              coachesList.push({
                id: u.id,
                firstName: u.first_name,
                lastName: u.last_name,
                email: u.email || '',
                role: u.role,
                roles: u.roles,
                instrument: u.instrument || '',
                isActive: u.is_active ?? true,
                isCampusActive: u.is_campus_active,
                isGroovelabActive: u.is_groovelab_active,
                ausweisNummer: u.ausweis_nummer || '',
                teacherQrToken: u.teacher_qr_token || '',
                studentCount: currentStudentCount,
                contractEndsAt: u.contract_ends_at || null,
                ausfall_until: u.ausfall_until,
                preferred_room_ids: u.preferred_room_ids || [],
                isPinActivated: u.is_pin_activated
              });
            }
            if (u.is_campus_active !== false) {
              campusTeachersList.push({
                id: u.id,
                firstName: u.first_name,
                lastName: u.last_name,
                email: u.email || '',
                role: u.role,
                roles: u.roles,
                instrument: u.instrument || '',
                isCampusActive: u.is_campus_active,
                isGroovelabActive: u.is_groovelab_active,
                isActive: u.is_active ?? true,
                ausweisNummer: u.ausweis_nummer || '',
                teacherQrToken: u.teacher_qr_token || '',
                studentCount: currentStudentCount,
                contractEndsAt: u.contract_ends_at || null,
                ausfall_until: u.ausfall_until,
                preferred_room_ids: u.preferred_room_ids || [],
                isPinActivated: u.is_pin_activated
              });
            }
          }
        }
      });

      setUserMap(map);
      setCoaches(coachesList);
      setCampusTeachers(campusTeachersList);
      setAllTeachers(allUsers?.filter(u => u.role === 'teacher' || (u.roles && u.roles.includes('teacher'))).map(u => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email || '',
        role: u.role,
        roles: u.roles,
        instrument: u.instrument || '',
        isActive: u.is_active ?? true,
        isCampusActive: u.is_campus_active,
        isGroovelabActive: u.is_groovelab_active,
        isPinActivated: u.is_pin_activated
      })) || []);
      setBypassTeachers(bypassList);
      setEmployees(employeesList);

      const deduplicateStudents = (students: any[]): any[] => {
        if (!Array.isArray(students)) return [];
        const seenIds = new Set<string>();
        const studentMap = new Map<string, any>();

        for (const student of students) {
          if (!student) continue;
          if (student.id && seenIds.has(student.id)) continue;

          const fn = (student.first_name || '').trim().toLowerCase();
          const ln = (student.last_name || '').trim().toLowerCase();
          const nameKey = `${fn}_${ln}`;

          if (nameKey !== '_') {
            if (studentMap.has(nameKey)) {
              const existing = studentMap.get(nameKey);
              if (existing.isPendingOnboarding && !student.isPendingOnboarding) {
                if (existing.id) seenIds.delete(existing.id);
                studentMap.set(nameKey, student);
                if (student.id) seenIds.add(student.id);
              }
              continue;
            }
            studentMap.set(nameKey, student);
          } else {
            const fallbackKey = student.id || `anon_${Math.random()}`;
            studentMap.set(fallbackKey, student);
          }

          if (student.id) seenIds.add(student.id);
        }

        return Array.from(studentMap.values());
      };

      const isTestUser = (s: any): boolean => {
        if (!s) return false;
        const fn = (s.first_name || s.firstName || '').trim().toLowerCase();
        const ln = (s.last_name || s.lastName || '').trim().toLowerCase();
        const email = (s.email || '').trim().toLowerCase();
        return (
          fn.startsWith('test') ||
          fn.startsWith('jane') ||
          fn.startsWith('bob') ||
          ln === 't.' ||
          ln === 'test' ||
          email.includes('test')
        );
      };

      const testUsersToPurge = (allUsers || []).filter((u: any) => isTestUser(u));
      if (testUsersToPurge.length > 0) {
        const purgeIds = testUsersToPurge.map((u: any) => u.id).filter(Boolean);
        if (purgeIds.length > 0) {
          Promise.all([
            supabase.from('schedule_occurrences').delete().in('student_id', purgeIds),
            supabase.from('schedules').delete().in('student_id', purgeIds),
            supabase.from('students').delete().in('id', purgeIds),
            supabase.from('users').delete().in('id', purgeIds)
          ]).catch(e => console.error('Error purging test users from DB:', e));
        }
      }

      const cleanStudentsList = studentsList.filter(s => !isTestUser(s));
      setStudents(deduplicateStudents(cleanStudentsList));

      // Fetch logged in user profile details strictly isolated by school_id
      let resolvedProfile: any = null;
      if (userId && userId !== 'master-support-id') {
        const { data: currUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .eq('school_id', schoolId)
          .maybeSingle();
        if (currUser) {
          resolvedProfile = currUser;
          setCurrentUserProfile(currUser);
          const isCurrInEmployees = employeesList.some(e => e.id === currUser.id);
          if (!isCurrInEmployees && (currUser.role === 'admin' || currUser.role === 'secretary' || userRole === 'admin' || userRole === 'secretary' || (currUser.roles && (currUser.roles.includes('admin') || currUser.roles.includes('secretary'))))) {
            employeesList.unshift(currUser);
            setEmployees([...employeesList]);
          }
        }
      }

      // If user profile is not resolved (e.g. ghost mode, first load or orphaned school)
      if (!resolvedProfile) {
        if (employeesList.length > 0) {
          resolvedProfile = employeesList[0];
          setCurrentUserProfile(employeesList[0]);
        } else if (schoolData?.billing_contact_person || schoolData?.name) {
          // Automatic Self-Healing: Provision missing headmaster/admin user from school metadata
          const contactPerson = (schoolData.billing_contact_person || '').trim();
          let fName = 'Schulleitung';
          let lName = '';
          if (contactPerson) {
            const parts = contactPerson.split(' ');
            fName = parts[0] || 'Schulleitung';
            lName = parts.slice(1).join(' ') || '';
          }
          const defaultAdminPin = Math.floor(100000 + Math.random() * 900000).toString();
          const healedAdmin = {
            id: crypto.randomUUID(),
            school_id: schoolId,
            role: 'admin',
            roles: ['admin'],
            first_name: fName,
            last_name: lName,
            email: schoolData.billing_email || schoolData.email || `${fName.toLowerCase()}@campus-groovelab.de`,
            password_hash: defaultAdminPin,
            ausweis_nummer: defaultAdminPin,
            qr_token: crypto.randomUUID(),
            photo_url: '/campus_login_hero.png',
            avatar_url: '/campus_login_hero.png',
            is_campus_active: true,
            is_groovelab_active: true,
            is_active: true,
            is_pin_activated: true,
            created_at: new Date().toISOString()
          };

          // Save to users asynchronously so it is permanently in Supabase
          try {
            await supabase.from('users').insert(healedAdmin);
          } catch (err: any) {
            console.warn('[SecretaryDashboard] Orphaned school auto-heal notice:', err);
          }

          resolvedProfile = healedAdmin;
          setCurrentUserProfile(healedAdmin);
          employeesList.push(healedAdmin);
          setEmployees([...employeesList]);
        }
      }

      // Fetch rooms
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('*')
        .eq('school_id', schoolId);

      // Fetch buildings
      const { data: buildingsData } = await supabase
        .from('buildings')
        .select('*')
        .eq('school_id', schoolId);
      if (buildingsData) setBuildings(buildingsData);

      const mappedRooms = (roomsData || []).map(r => {
        const localBuildingId = (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_building_mappings_${schoolId}`) || '{}');
            return map[r.id] || null;
          } catch { return null; }
        })();
        const localUnsuitable = (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
            return map[r.id] || [];
          } catch { return []; }
        })();
        const localInstruments = (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
            return map[r.id] || [];
          } catch { return []; }
        })();
        const localSonstiges = (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_sonstiges_mappings_${schoolId}`) || '{}');
            return map[r.id] || '';
          } catch { return ''; }
        })();

        return {
          ...r,
          building_id: r.building_id || localBuildingId,
          equipment: r.allowed_instruments || [],
          unsuitable_instruments: r.unsuitable_instruments || localUnsuitable,
          room_instruments: r.room_instruments || localInstruments,
          sonstiges: r.sonstiges || localSonstiges
        };
      });
      mappedRooms.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de-DE', { numeric: true, sensitivity: 'base' }));
      setRooms(mappedRooms);
      if (mappedRooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(mappedRooms[0].id);
      }

      const rMap: Record<string, string> = {};
      mappedRooms.forEach(r => {
        rMap[r.id] = r.name;
      });
      setRoomMap(rMap);

      // Fetch school equipment
      const { data: equipmentData } = await supabase
        .from('school_equipment')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      setSchoolEquipment(equipmentData || []);

      // Fetch stations
      const { data: stationsData } = await supabase
        .from('stations')
        .select('*, rooms!inner(*)')
        .eq('rooms.school_id', schoolId);
      setStations(stationsData || []);

      // Fetch bands for GrooveLab module
      try {
        const { data: bandsData } = await supabase
          .from('bands')
          .select('*')
          .eq('school_id', schoolId);
        setBands(bandsData || []);
      } catch (err) {
        console.warn('Error fetching bands in SecretaryDashboard:', err);
      }

      // Fetch system alerts
      const { data: alertsData, error: alertsErr } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (alertsErr) throw alertsErr;

      const mappedAlerts: SystemAlert[] = (alertsData || []).map(alert => ({
        id: alert.id,
        schoolId: alert.school_id,
        teacherId: alert.teacher_id,
        type: alert.type,
        message: alert.message,
        createdAt: alert.created_at,
        resolved: alert.resolved || false,
        teacherName: map[alert.teacher_id] || 'Unbekannte Lehrkraft'
      }));
      setAlerts(mappedAlerts);

      // Fetch all schedules for this school to build the Room Planner Matrix
      let allSchedulesData: any[] = [];
      try {
        const { data, error: schedErr } = await supabase
          .from('schedules')
          .select('*')
          .eq('school_id', schoolId);
        if (schedErr) throw schedErr;
        allSchedulesData = data || [];
        localStorage.setItem(`groovelab_schedules_cache_${schoolId}`, JSON.stringify(allSchedulesData));
      } catch (err) {
        console.warn('Supabase schedules fetch failed, falling back to local cache:', err);
        const cached = localStorage.getItem(`groovelab_schedules_cache_${schoolId}`);
        if (cached) {
          allSchedulesData = JSON.parse(cached);
        }
      }

      const mappedSchedules = (allSchedulesData || [])
        .filter(s => s.status === 'ready_for_admin_review')
        .map(s => ({
          ...s,
          teacher_name: map[s.teacher_id] || 'Unbekannte Lehrkraft',
          student_name: map[s.student_id] || 'Unbekannter Schüler',
          room_name: s.room_id ? rMap[s.room_id] || 'Unbekannter Raum' : 'Kein Raum'
        }));
      setPendingSchedules(mappedSchedules);

      // Group schedules by teacher_id and day_of_week to build matrixAllocations
      const teacherDays: Record<string, any[]> = {};
      const unsubmittedTeachersMap: Record<string, boolean> = {};

      (allSchedulesData || []).forEach(s => {
        if (s.status === 'rejected') return;
        const key = `${s.teacher_id}_${s.day_of_week}`;
        if (!teacherDays[key]) teacherDays[key] = [];
        teacherDays[key].push(s);
      });

      // Dual-Source Failsafe: Fallback to u.planned_boards if schedules table has no entries for teacher
      (allUsers || []).forEach(u => {
        const isTeacher = u.role === 'teacher' || (Array.isArray(u.roles) && u.roles.includes('teacher'));
        if (isTeacher) {
          const rawPlanned = u.planned_boards || (u as any).campus_räume || (u as any).groovelab_räume;
          let loadedDrafts: any[] = [];
          let loadedSubmittedDraftId = '';
          if (rawPlanned && typeof rawPlanned === 'object' && !Array.isArray(rawPlanned) && (rawPlanned as any).drafts) {
            loadedDrafts = (rawPlanned as any).drafts;
            loadedSubmittedDraftId = (rawPlanned as any).submittedDraftId || '';
          } else if (Array.isArray(rawPlanned) && rawPlanned.length > 0) {
            loadedDrafts = [{ id: 'default', name: 'Standard-Entwurf', boards: rawPlanned }];
          } else if (rawPlanned && typeof rawPlanned === 'object' && Array.isArray((rawPlanned as any).boards)) {
            loadedDrafts = [{ id: 'default', name: 'Standard-Entwurf', boards: (rawPlanned as any).boards }];
          }
          
          const hasSchedulesInDb = (allSchedulesData || []).some(s => s.teacher_id === u.id && s.status !== 'rejected');
          const isSubmitted = loadedSubmittedDraftId !== '' || hasSchedulesInDb || (loadedDrafts.length > 0);
          
          if (!isSubmitted) {
            unsubmittedTeachersMap[u.id] = true;
          }

          // Extract boards from planned_boards: if a teacher has a submitted or approved draft, it is authoritative
          if (loadedDrafts.length > 0) {
            const targetDraft = (loadedSubmittedDraftId && loadedDrafts.find(d => d.id === loadedSubmittedDraftId)) || loadedDrafts[0];
            const hasValidBoards = targetDraft && Array.isArray(targetDraft.boards) && targetDraft.boards.some((b: any) => b.students && b.students.length > 0);

            if (hasValidBoards) {
              // Clear any stale database slots for this teacher so the designer draft governs
              for (let d = 1; d <= 7; d++) {
                delete teacherDays[`${u.id}_${d}`];
              }

              targetDraft.boards.forEach((b: any) => {
                if (b.dayOfWeek && b.students && b.students.length > 0) {
                  const key = `${u.id}_${b.dayOfWeek}`;
                  teacherDays[key] = b.students.map((st: any) => ({
                    id: `fallback_${u.id}_${st.id}`,
                    school_id: schoolId,
                    teacher_id: u.id,
                    student_id: st.isBreak ? null : st.id,
                    day_of_week: b.dayOfWeek,
                    time_slot: st.assignedTime || b.startAnchor || '14:00',
                    room_id: b.roomId || null,
                    duration: st.duration || 30,
                    status: (targetDraft as any)?.status || 'ready_for_admin_review',
                    instrument: st.instrument || 'Musiker',
                    student_name: st.isBreak ? 'Pause' : `${st.first_name || ''} ${st.last_name || ''}`.trim() || 'Schüler',
                    isGroup: !!st.isGroup,
                    groupStudents: st.groupStudents || []
                  }));
                }
              });
            }
          }
        }
      });
      setUnsubmittedTeachers(unsubmittedTeachersMap);

      const draftMap = (() => {
        try {
          return JSON.parse(localStorage.getItem(`groovelab_matrix_allocations_draft_${schoolId}`) || '{}');
        } catch { return {}; }
      })();

      const initialAllocations = Object.entries(teacherDays)
        .map(([key, slots]) => {
          const [teacherId, dayOfWeekStr] = key.split('_');
          const dayOfWeek = parseInt(dayOfWeekStr);

          const sortedSlots = [...slots]
            .map(s => ({
              ...s,
              student_name: s.student_name || (s.student_id ? map[s.student_id] || 'Unbekannter Schüler' : 'Pause'),
              student_instrument: s.student_id ? userInstrumentMap[s.student_id] || s.instrument || '' : ''
            }))
            .sort((a, b) => (a.time_slot || '').localeCompare(b.time_slot || ''));
          const startTime = sortedSlots[0]?.time_slot || '14:00';
          
          const addMins = (t: string, m: number) => {
            const [hStr, mStr] = t.split(':');
            let h = parseInt(hStr) || 0;
            let mVal = parseInt(mStr) || 0;
            mVal += m;
            h += Math.floor(mVal / 60);
            mVal = mVal % 60;
            h = h % 24;
            return `${String(h).padStart(2, '0')}:${String(mVal).padStart(2, '0')}`;
          };

          const lastSlot = sortedSlots[sortedSlots.length - 1];
          const endTime = lastSlot ? addMins(lastSlot.time_slot, lastSlot.duration || 45) : '15:00';

          const isPending = sortedSlots.some(s => s.status === 'ready_for_admin_review');
          const dbRoomId = sortedSlots.find(s => s.room_id)?.room_id || null;
          const roomId = draftMap[key] !== undefined ? draftMap[key] : dbRoomId;

          const teacherProfile = campusTeachersList.find(t => t.id === teacherId);
          const teacherName = map[teacherId] || (teacherProfile ? `${teacherProfile.firstName} ${teacherProfile.lastName}` : 'Unbekannte Lehrkraft');
          const instrument = userInstrumentMap[teacherId] || teacherProfile?.instrument || 'Gitarre';

          return {
            id: key,
            teacherId,
            teacherName,
            instrument,
            dayOfWeek,
            startTime,
            endTime,
            roomId: roomId || null,
            status: isPending ? 'pending' : 'approved',
            slots: sortedSlots
          };
        });

      // Generate GrooveLab opening hours blocks as virtual plans for the groovelab teacher
      const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const groovelabBlocks: any[] = [];
      const opHours = schoolData?.opening_hours || {};
      const glRooms = mappedRooms.filter(r => r.is_groovelab_active);
      
      for (let d = 1; d <= 7; d++) {
        const dayKey = dayKeys[d];
        const dayHours = opHours[dayKey];
        if (dayHours && dayHours.active === true) {
          const key = `groovelab_${d}`;
          
          if (glRooms.length > 0) {
            glRooms.forEach(glRoom => {
              const rKey = `${key}_${glRoom.id}`;
              const roomId = draftMap[rKey] !== undefined ? draftMap[rKey] : glRoom.id;
              groovelabBlocks.push({
                id: rKey,
                teacherId: 'groovelab',
                teacherName: 'GrooveLab',
                instrument: 'Plattform',
                dayOfWeek: d,
                startTime: dayHours.start || '14:00',
                endTime: dayHours.end || '18:00',
                roomId,
                status: 'approved',
                slots: []
              });
            });
          } else {
            const roomId = draftMap[key] !== undefined ? draftMap[key] : (dayHours.roomId || null);
            groovelabBlocks.push({
              id: key,
              teacherId: 'groovelab',
              teacherName: 'GrooveLab',
              instrument: 'Plattform',
              dayOfWeek: d,
              startTime: dayHours.start || '14:00',
              endTime: dayHours.end || '18:00',
              roomId,
              status: 'approved',
              slots: []
            });
          }
        }
      }

      setMatrixAllocations([...initialAllocations, ...groovelabBlocks]);

      // Calculate stats
      const activeAlertsCount = mappedAlerts.filter(a => !a.resolved && a.type === 'capacity_overrun').length;
      const inactiveTeachersCount = bypassList.length;

      let draft = 0;
      const readyForReview = mappedSchedules.length;
      let approved = 0;
      if (allScheds) {
        allScheds.forEach(s => {
          if (s.status === 'draft') draft++;
          else if (s.status === 'approved') approved++;
        });
      }

      setBriefingData({
        openCapacityAlerts: activeAlertsCount,
        inactiveTeachers: inactiveTeachersCount,
        schedules: { draft, readyForReview, approved },
        alerts: mappedAlerts.filter(a => !a.resolved).map(a => ({
          id: a.id,
          type: a.type,
          message: schoolData?.allow_messages_global ? a.message : '[SYSTEM: Nachrichten global stummgeschaltet]',
          created_at: a.createdAt
        }))
      });

      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .select('*, users!inner(*), stations(*)')
        .is('check_out_time', null)
        .eq('users.school_id', schoolId);

      if (!sessErr && sessData) {
        const schoolSess = sessData
          .filter((s: any) => {
            const u = Array.isArray(s.users) ? s.users[0] : s.users;
            return u?.school_id === schoolId;
          })
          .map((s: any) => ({
            ...s,
            users: Array.isArray(s.users) ? s.users[0] : s.users,
            stations: Array.isArray(s.stations) ? s.stations[0] : s.stations
          }));
        setActiveSessions(schoolSess);
      }

      // Fetch help requests
      const { data: helpData } = await supabase
        .from('help_requests')
        .select('*, users(*)')
        .eq('school_id', schoolId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setHelpRequests(helpData || []);

      // Fetch groovelab tickets
      const { data: ticketsData, error: ticketsErr } = await supabase
        .from('groovelab_tickets')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (!ticketsErr && ticketsData) {
        setTickets(ticketsData);
      }

      // Fetch school room issues & facility defects
      try {
        await fetchRoomIssues();
      } catch (err) {
        console.warn('Could not fetch room issues:', err);
      }

      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      
      let list = subjectsData || [];
      
      // Deduplicate by name case-insensitively
      const uniqueList: any[] = [];
      const seenNames = new Set();
      for (const sub of list) {
        const nameKey = (sub.name || '').trim().toLowerCase();
        if (!seenNames.has(nameKey)) {
          seenNames.add(nameKey);
          uniqueList.push(sub);
        }
      }
      list = uniqueList;

      const DEFAULT_STANDARD_SUBJECTS = [
        { name: 'Schlagzeug', description: 'Schlagzeug & Percussion', category: 'Allgemein' },
        { name: 'Piano', description: 'Klavier & Tasteninstrumente', category: 'Allgemein' },
        { name: 'Gitarre', description: 'Gitarre & Ukulele', category: 'Allgemein' },
        { name: 'Gesang', description: 'Gesang & Stimmbildung', category: 'Allgemein' },
        { name: 'Geige', description: 'Geige & Streichinstrumente', category: 'Allgemein' },
        { name: 'Querflöte', description: 'Querflöte & Holzbläser', category: 'Allgemein' },
        { name: 'Saxophon', description: 'Saxophon & Blasinstrumente', category: 'Allgemein' },
        { name: 'Bass', description: 'E-Bass & Kontrabass', category: 'Allgemein' },
        { name: 'Keyboard', description: 'Keyboard & Synthesizer', category: 'Allgemein' },
        { name: 'Trompete', description: 'Trompete & Blechbläser', category: 'Allgemein' }
      ];

      const hasInstrumentSubjects = list.some(s => {
        const n = (s.name || '').toLowerCase();
        return n !== 'ohne zuweisung' && n !== 'allgemein' && n !== 'groovelab';
      });

      if (!hasInstrumentSubjects && schoolId) {
        try {
          const toInsert = DEFAULT_STANDARD_SUBJECTS.map(sub => ({
            school_id: schoolId,
            name: sub.name,
            description: sub.description,
            category: sub.category,
            is_active: true
          }));
          const { data: newSubs } = await supabase.from('subjects').insert(toInsert).select();
          if (newSubs && newSubs.length > 0) {
            list.push(...newSubs);
          }
        } catch (e) {
          console.error("Error auto-seeding default subjects:", e);
        }
      }

      const hasOhneZuweisung = list.some(s => (s.name || '').toLowerCase() === 'ohne zuweisung');
      if (!hasOhneZuweisung && schoolId) {
        try {
          const { data: newSub, error: insertErr } = await supabase
            .from('subjects')
            .insert({
              school_id: schoolId,
              name: 'ohne Zuweisung',
              category: 'Allgemein'
            })
            .select('*')
            .single();
          if (!insertErr && newSub) {
            list.push(newSub);
          }
        } catch (e) {
          console.error("Error auto-creating subject:", e);
        }
      }

      const sortedSubjects = list.sort((a, b) => {
        if ((a.name || '').toLowerCase() === 'ohne zuweisung') return -1;
        if ((b.name || '').toLowerCase() === 'ohne zuweisung') return 1;
        return (a.name || '').localeCompare(b.name || '', 'de');
      });
      setSubjects(sortedSubjects);

      // Fetch campus announcements (school events)
      const { data: annData, error: annErr } = await supabase
        .from('campus_announcements')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (!annErr && annData) {
        setSchoolEvents(annData);
      } else {
        setSchoolEvents([]);
      }

      // Auto-delete expired users if enabled
      if (schoolData?.auto_delete_expired_users) {
        const expired = studentsList.filter((s: any) => s.contractEndsAt && new Date(s.contractEndsAt).getTime() < Date.now());
        if (expired.length > 0) {
          handleDeleteExpiredStudents(true, studentsList);
        }
      }

      await fetchAnnouncements();
    } catch (err: any) {
      console.error('Error fetching secretary dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [
    schoolId,
    userId,
    userRole,
    fetchPendingBookings,
    fetchTariffBookings,
    fetchRoomIssues,
    fetchAnnouncements,
    fetchLiveStatusData,
    initSettingsFromSchool,
    initBillingFromSchool,
    handleDeleteExpiredStudents,
    setStudents,
    setFrozenStudents,
    setCoaches,
    setCampusTeachers,
    setAllTeachers,
    setBypassTeachers,
    setEmployees,
    setPendingSchedules,
    setMatrixAllocations,
    setUnsubmittedTeachers,
    setActiveSessions,
    setHelpRequests,
    setTickets,
    setSelectedRoomId,
    selectedRoomId,
    setCurrentUserProfile,
    setCurrentSchoolProfile,
    setIsAvvSigned,
    setSchoolName,
    setSchoolStreet,
    setSchoolHouseNumber,
    setSchoolZipCode,
    setSchoolCity,
    setSchoolPhoneNumber,
    setSchoolEmail,
    setAbsenceEmail,
    setSchoolSubdomain,
    setOpeningHours,
    setEditColor,
    setIsSchoolTrial,
    setSchoolTrialEndsAt,
    setSchoolStatus,
    setSubscriptionBypass,
    setSelectedStorageAddonGb,
    setSelectedStorageAddonFee,
    setKioskToken,
    setCampusToken,
    setAllowMessagesGlobal,
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
    setCampusHomeworkNotesSync,
    setCampusMeisterwerkEnabled,
    setCampusFocusTimerDefaultMin,
    setCampusFocusTimerXpFactor,
    setCampusLoopstationBarsPause,
    setCampusAudioMaxSessionMinutes,
    setCampusScheduleSlotMinutes,
    setCampusScheduleConflictWarning,
    setCampusParentAbsenceNotify,
    setCampusParentChatEnabled,
    setCampusParentStatsEnabled,
    setCampusKioskPinLength,
    setCampusKioskAutoLogoutMinutes,
    setGlMaxBandMembers,
    setGlAllowStudentBandCreation,
    setGlSongLevelStarterEnabled,
    setGlSongLevelProEnabled,
    setGlSongLevelMasterEnabled,
    setGlSongProposalWorkflow,
    setGlLiveDefaultBpm,
    setGlLiveCountInBars,
    setGlLiveStageDisplayEnabled,
    setGlSkillRadarTiming,
    setGlSkillRadarTechnique,
    setGlSkillRadarSound,
    setGlSkillRadarRepertoire,
    setGlSkillRadarTeamplay,
    setGlMusicianAvatarsEnabled,
    setGlBandCoatOfArmsEnabled,
    setGlBandChatEnabled,
    setGlCoachModerationRequired,
    setGlJamRecordingCompression,
    rooms,
    setRooms,
    subjects,
    setSubjects,
    userMap,
    setUserMap,
    schoolEquipment,
    setSchoolEquipment
  ]);

  // Realtime subscription for system alerts, bookings, and user profiles with 500ms settling debounce
  useEffect(() => {
    if (!schoolId) return;
    
    fetchPendingBookings();

    const handleRefresh = () => {
      fetchPendingBookings();
    };
    window.addEventListener('refresh-bookings', handleRefresh);

    let dashboardTimeout: any = null;

    const debouncedFetchDashboardData = () => {
      if (dashboardTimeout) clearTimeout(dashboardTimeout);
      dashboardTimeout = setTimeout(() => {
        fetchDashboardData();
      }, 500);
    };

    const channel = supabase
      .channel(`realtime_secretary_dashboard_${schoolId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_alerts' }, () => {
        debouncedFetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `school_id=eq.${schoolId}` }, () => {
        debouncedFetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_bookings' }, (payload: any) => {
        fetchPendingBookings();
        if (payload.eventType === 'INSERT' && payload.new && payload.new.status === 'pending') {
          showRealtimeNotification('Neue vorläufige Raumbuchung erhalten!');
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        fetchLiveStatusData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_requests' }, () => {
        fetchLiveStatusData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notes' }, async () => {
        try {
          fetchRoomIssues();
        } catch (e) {}
      })
      .subscribe();

    return () => {
      if (dashboardTimeout) clearTimeout(dashboardTimeout);
      supabase.removeChannel(channel);
      window.removeEventListener('refresh-bookings', handleRefresh);
    };
  }, [schoolId, fetchDashboardData, fetchPendingBookings, fetchLiveStatusData, fetchRoomIssues, showRealtimeNotification]);

  // Initial fetch on school change
  useEffect(() => {
    fetchDashboardData();
  }, [schoolId, fetchDashboardData]);

  return {
    loading,
    setLoading,
    schoolInvoices,
    setSchoolInvoices,
    buildings,
    setBuildings,
    stations,
    setStations,
    bands,
    setBands,
    alerts,
    setAlerts,
    briefingData,
    setBriefingData,
    schoolEvents,
    setSchoolEvents,
    roomMap,
    setRoomMap,
    fetchDashboardData
  };
}
