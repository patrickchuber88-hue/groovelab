import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { computeSchoolDunningStatus, SchoolDunningStatus } from '../../../domain/schoolDunningEngine';
import { isDevEnvironment } from '../../../utils/tenantUrlHelper';

export interface UseSecretaryExtendedSettingsProps {
  schoolId: string;
  currentSchoolProfile: any;
  isSchoolTrial: boolean;
  schoolTrialEndsAt: string | null;
  subscriptionBypass: boolean;
  simulatedToday?: string;
  initialSchoolInvoices?: any[];
  fetchDashboardData?: () => Promise<void> | void;
  setManageTeacher?: (teacher: any) => void;
}

export interface UseSecretaryExtendedSettingsReturn {
  // Campus Extended Settings
  campusHomeworkNotesSync: boolean;
  setCampusHomeworkNotesSync: React.Dispatch<React.SetStateAction<boolean>>;
  campusMeisterwerkEnabled: boolean;
  setCampusMeisterwerkEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  campusFocusTimerDefaultMin: number;
  setCampusFocusTimerDefaultMin: React.Dispatch<React.SetStateAction<number>>;
  campusFocusTimerXpFactor: number;
  setCampusFocusTimerXpFactor: React.Dispatch<React.SetStateAction<number>>;
  campusLoopstationBarsPause: number;
  setCampusLoopstationBarsPause: React.Dispatch<React.SetStateAction<number>>;
  campusAudioMaxSessionMinutes: number;
  setCampusAudioMaxSessionMinutes: React.Dispatch<React.SetStateAction<number>>;
  campusScheduleSlotMinutes: number;
  setCampusScheduleSlotMinutes: React.Dispatch<React.SetStateAction<number>>;
  campusScheduleConflictWarning: boolean;
  setCampusScheduleConflictWarning: React.Dispatch<React.SetStateAction<boolean>>;
  campusParentAbsenceNotify: boolean;
  setCampusParentAbsenceNotify: React.Dispatch<React.SetStateAction<boolean>>;
  campusParentChatEnabled: boolean;
  setCampusParentChatEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  campusParentStatsEnabled: boolean;
  setCampusParentStatsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  campusKioskPinLength: number;
  setCampusKioskPinLength: React.Dispatch<React.SetStateAction<number>>;
  campusKioskAutoLogoutMinutes: number;
  setCampusKioskAutoLogoutMinutes: React.Dispatch<React.SetStateAction<number>>;
  activeCampusSettingsModal: 'boards' | 'homework' | 'timer' | 'schedule' | 'parent' | 'kiosk' | 'permissions' | 'feedback' | null;
  setActiveCampusSettingsModal: React.Dispatch<React.SetStateAction<'boards' | 'homework' | 'timer' | 'schedule' | 'parent' | 'kiosk' | 'permissions' | 'feedback' | null>>;

  // GrooveLab Extended Settings
  glMaxBandMembers: number;
  setGlMaxBandMembers: React.Dispatch<React.SetStateAction<number>>;
  glAllowStudentBandCreation: boolean;
  setGlAllowStudentBandCreation: React.Dispatch<React.SetStateAction<boolean>>;
  glSongLevelStarterEnabled: boolean;
  setGlSongLevelStarterEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  glSongLevelProEnabled: boolean;
  setGlSongLevelProEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  glSongLevelMasterEnabled: boolean;
  setGlSongLevelMasterEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  glSongProposalWorkflow: boolean;
  setGlSongProposalWorkflow: React.Dispatch<React.SetStateAction<boolean>>;
  glLiveDefaultBpm: number;
  setGlLiveDefaultBpm: React.Dispatch<React.SetStateAction<number>>;
  glLiveCountInBars: number;
  setGlLiveCountInBars: React.Dispatch<React.SetStateAction<number>>;
  glLiveStageDisplayEnabled: boolean;
  setGlLiveStageDisplayEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  glSkillRadarTiming: boolean;
  setGlSkillRadarTiming: React.Dispatch<React.SetStateAction<boolean>>;
  glSkillRadarTechnique: boolean;
  setGlSkillRadarTechnique: React.Dispatch<React.SetStateAction<boolean>>;
  glSkillRadarSound: boolean;
  setGlSkillRadarSound: React.Dispatch<React.SetStateAction<boolean>>;
  glSkillRadarRepertoire: boolean;
  setGlSkillRadarRepertoire: React.Dispatch<React.SetStateAction<boolean>>;
  glSkillRadarTeamplay: boolean;
  setGlSkillRadarTeamplay: React.Dispatch<React.SetStateAction<boolean>>;
  glMusicianAvatarsEnabled: boolean;
  setGlMusicianAvatarsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  glBandCoatOfArmsEnabled: boolean;
  setGlBandCoatOfArmsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  glBandChatEnabled: boolean;
  setGlBandChatEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  glCoachModerationRequired: boolean;
  setGlCoachModerationRequired: React.Dispatch<React.SetStateAction<boolean>>;
  glJamRecordingCompression: boolean;
  setGlJamRecordingCompression: React.Dispatch<React.SetStateAction<boolean>>;
  activeGroovelabSettingsModal: 'bands' | 'songs' | 'live' | 'radar' | 'avatars' | 'rooms' | 'permissions' | 'feedback' | null;
  setActiveGroovelabSettingsModal: React.Dispatch<React.SetStateAction<'bands' | 'songs' | 'live' | 'radar' | 'avatars' | 'rooms' | 'permissions' | 'feedback' | null>>;

  // Tokens & Operational Settings
  kioskToken: string;
  setKioskToken: React.Dispatch<React.SetStateAction<string>>;
  campusToken: string;
  setCampusToken: React.Dispatch<React.SetStateAction<string>>;
  allowMessagesGlobal: boolean;
  setAllowMessagesGlobal: React.Dispatch<React.SetStateAction<boolean>>;
  regeneratingTokens: boolean;
  setRegeneratingTokens: React.Dispatch<React.SetStateAction<boolean>>;
  handleRegenerateTokens: () => Promise<void>;
  handleToggleMessagesGlobal: (newValue: boolean) => Promise<void>;

  isPaused: boolean;
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
  handleToggleIsPaused: (newValue: boolean) => Promise<void>;
  limitsEnabled: boolean;
  setLimitsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  handleToggleLimitsEnabled: (newValue: boolean) => Promise<void>;

  handleResetTeacherPin: (teacherId: string) => Promise<void>;
  handleUpdateTeacher: (updatedData: any) => Promise<void>;

  // Delinquency & Grace Period
  schoolInvoices: any[];
  setSchoolInvoices: React.Dispatch<React.SetStateAction<any[]>>;
  showDunningPayModal: boolean;
  setShowDunningPayModal: React.Dispatch<React.SetStateAction<boolean>>;
  trustRefreshToken: number;
  setTrustRefreshToken: React.Dispatch<React.SetStateAction<number>>;
  dunningStatus: SchoolDunningStatus;
  assertSecretaryWriteAccess: (actionLabel?: string) => boolean;
  expandedYears: Record<string, boolean>;
  setExpandedYears: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showDateSimulation: boolean;
  setShowDateSimulation: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useSecretaryExtendedSettings({
  schoolId,
  currentSchoolProfile,
  isSchoolTrial,
  schoolTrialEndsAt,
  subscriptionBypass,
  simulatedToday,
  initialSchoolInvoices,
  fetchDashboardData,
  setManageTeacher
}: UseSecretaryExtendedSettingsProps): UseSecretaryExtendedSettingsReturn {
  const [schoolInvoices, setSchoolInvoices] = useState<any[]>(initialSchoolInvoices || []);
  // 1. Campus Extended Settings States
  const [campusHomeworkNotesSync, setCampusHomeworkNotesSync] = useState<boolean>(true);
  const [campusMeisterwerkEnabled, setCampusMeisterwerkEnabled] = useState<boolean>(true);
  const [campusFocusTimerDefaultMin, setCampusFocusTimerDefaultMin] = useState<number>(25);
  const [campusFocusTimerXpFactor, setCampusFocusTimerXpFactor] = useState<number>(1);
  const [campusLoopstationBarsPause, setCampusLoopstationBarsPause] = useState<number>(4);
  const [campusAudioMaxSessionMinutes, setCampusAudioMaxSessionMinutes] = useState<number>(10);
  const [campusScheduleSlotMinutes, setCampusScheduleSlotMinutes] = useState<number>(45);
  const [campusScheduleConflictWarning, setCampusScheduleConflictWarning] = useState<boolean>(true);
  const [campusParentAbsenceNotify, setCampusParentAbsenceNotify] = useState<boolean>(true);
  const [campusParentChatEnabled, setCampusParentChatEnabled] = useState<boolean>(true);
  const [campusParentStatsEnabled, setCampusParentStatsEnabled] = useState<boolean>(true);
  const [campusKioskPinLength, setCampusKioskPinLength] = useState<number>(4);
  const [campusKioskAutoLogoutMinutes, setCampusKioskAutoLogoutMinutes] = useState<number>(5);
  const [activeCampusSettingsModal, setActiveCampusSettingsModal] = useState<'boards' | 'homework' | 'timer' | 'schedule' | 'parent' | 'kiosk' | 'permissions' | 'feedback' | null>(null);

  // 2. GrooveLab Extended Settings States
  const [glMaxBandMembers, setGlMaxBandMembers] = useState<number>(8);
  const [glAllowStudentBandCreation, setGlAllowStudentBandCreation] = useState<boolean>(true);
  const [glSongLevelStarterEnabled, setGlSongLevelStarterEnabled] = useState<boolean>(true);
  const [glSongLevelProEnabled, setGlSongLevelProEnabled] = useState<boolean>(true);
  const [glSongLevelMasterEnabled, setGlSongLevelMasterEnabled] = useState<boolean>(true);
  const [glSongProposalWorkflow, setGlSongProposalWorkflow] = useState<boolean>(true);
  const [glLiveDefaultBpm, setGlLiveDefaultBpm] = useState<number>(120);
  const [glLiveCountInBars, setGlLiveCountInBars] = useState<number>(1);
  const [glLiveStageDisplayEnabled, setGlLiveStageDisplayEnabled] = useState<boolean>(true);
  const [glSkillRadarTiming, setGlSkillRadarTiming] = useState<boolean>(true);
  const [glSkillRadarTechnique, setGlSkillRadarTechnique] = useState<boolean>(true);
  const [glSkillRadarSound, setGlSkillRadarSound] = useState<boolean>(true);
  const [glSkillRadarRepertoire, setGlSkillRadarRepertoire] = useState<boolean>(true);
  const [glSkillRadarTeamplay, setGlSkillRadarTeamplay] = useState<boolean>(true);
  const [glMusicianAvatarsEnabled, setGlMusicianAvatarsEnabled] = useState<boolean>(true);
  const [glBandCoatOfArmsEnabled, setGlBandCoatOfArmsEnabled] = useState<boolean>(true);
  const [glBandChatEnabled, setGlBandChatEnabled] = useState<boolean>(true);
  const [glCoachModerationRequired, setGlCoachModerationRequired] = useState<boolean>(false);
  const [glJamRecordingCompression, setGlJamRecordingCompression] = useState<boolean>(true);
  const [activeGroovelabSettingsModal, setActiveGroovelabSettingsModal] = useState<'bands' | 'songs' | 'live' | 'radar' | 'avatars' | 'rooms' | 'permissions' | 'feedback' | null>(null);

  // 3. Operational & Token States
  const [kioskToken, setKioskToken] = useState<string>('');
  const [campusToken, setCampusToken] = useState<string>('');
  const [allowMessagesGlobal, setAllowMessagesGlobal] = useState<boolean>(true);
  const [regeneratingTokens, setRegeneratingTokens] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [limitsEnabled, setLimitsEnabled] = useState<boolean>(false);

  // 4. Delinquency & Grace Period Architecture
  const [showDunningPayModal, setShowDunningPayModal] = useState<boolean>(false);
  const [trustRefreshToken, setTrustRefreshToken] = useState<number>(0);
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({ '2026': true, '2025': true });

  const dunningStatus = useMemo<SchoolDunningStatus>(() => {
    const oldest = Array.isArray(schoolInvoices) 
      ? schoolInvoices.find((i: any) => i && i.due_date && String(i.status || '').toLowerCase() !== 'paid' && String(i.status || '').toLowerCase() !== 'bezahlt') 
      : null;
    const localTrustUntil = oldest ? localStorage.getItem(`groovelab_trust_token_${oldest.id}`) : null;

    const effectiveSchool = {
      ...(currentSchoolProfile || {
        id: schoolId,
        is_trial: isSchoolTrial,
        trial_ends_at: schoolTrialEndsAt,
        subscription_bypass: subscriptionBypass
      }),
      dunning_trust_extension_until: currentSchoolProfile?.dunning_trust_extension_until || localTrustUntil || undefined
    };
    return computeSchoolDunningStatus(effectiveSchool, schoolInvoices, simulatedToday || undefined);
  }, [currentSchoolProfile, schoolId, isSchoolTrial, schoolTrialEndsAt, subscriptionBypass, schoolInvoices, simulatedToday, trustRefreshToken]);

  useEffect(() => {
    if (schoolId) {
      if (dunningStatus.isAudioTresorReadOnly) {
        localStorage.setItem(`groovelab_audio_tresor_readonly_${schoolId}`, 'true');
      } else {
        localStorage.removeItem(`groovelab_audio_tresor_readonly_${schoolId}`);
      }
      if (dunningStatus.isTeacherReadOnly) {
        localStorage.setItem(`groovelab_teacher_readonly_${schoolId}`, 'true');
      } else {
        localStorage.removeItem(`groovelab_teacher_readonly_${schoolId}`);
      }
      localStorage.setItem(`groovelab_dunning_level_${schoolId}`, dunningStatus.level);
    }
  }, [schoolId, dunningStatus.isAudioTresorReadOnly, dunningStatus.isTeacherReadOnly, dunningStatus.level]);

  const assertSecretaryWriteAccess = useCallback((actionLabel?: string): boolean => {
    if (dunningStatus.isSecretaryReadOnly) {
      alert(`Administrativer Schreibschutz aktiv: Da die B2B-Infrastrukturrechnung seit über 30 Tagen aussteht, ist diese Aktion (${actionLabel || 'Bearbeiten/Erstellen'}) vorübergehend gesperrt. Bitte begleiche den Betrag über den angezeigten EPC-QR GiroCode.`);
      return false;
    }
    return true;
  }, [dunningStatus.isSecretaryReadOnly]);

  // Dev Date Simulation
  const [showDateSimulation, setShowDateSimulation] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !isDevEnvironment()) return false;
    return localStorage.getItem('groovelab_dev_date_sim_visible') === 'true';
  });

  useEffect(() => {
    if (!isDevEnvironment()) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        setShowDateSimulation(prev => {
          const next = !prev;
          try { localStorage.setItem('groovelab_dev_date_sim_visible', String(next)); } catch {}
          window.dispatchEvent(new CustomEvent('groovelab_date_sim_toggle', { detail: next }));
          return next;
        });
      }
    };
    const handleToggleSync = (e: any) => {
      if (typeof e?.detail === 'boolean') {
        setShowDateSimulation(e.detail);
      } else {
        const saved = localStorage.getItem('groovelab_dev_date_sim_visible') === 'true';
        setShowDateSimulation(saved);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('groovelab_date_sim_toggle', handleToggleSync);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('groovelab_date_sim_toggle', handleToggleSync);
    };
  }, []);

  // 5. Operational Handlers
  const handleRegenerateTokens = useCallback(async () => {
    try {
      setRegeneratingTokens(true);
      const newKioskToken = 'kiosk_' + Math.random().toString(36).substring(2, 15);
      const newCampusToken = 'campus_' + Math.random().toString(36).substring(2, 15);

      const { error } = await supabase
        .from('schools')
        .update({
          groovelab_kiosk_token: newKioskToken,
          campus_login_token: newCampusToken
        })
        .eq('id', schoolId);

      if (error) throw error;
      setKioskToken(newKioskToken);
      setCampusToken(newCampusToken);
      alert('Tokens wurden neu ausgestellt.');
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setRegeneratingTokens(false);
    }
  }, [schoolId]);

  const handleToggleMessagesGlobal = useCallback(async (newValue: boolean) => {
    try {
      setAllowMessagesGlobal(newValue);
      const { error } = await supabase
        .from('schools')
        .update({ allow_messages_global: newValue })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      setAllowMessagesGlobal(!newValue);
    }
  }, [schoolId]);

  const handleToggleIsPaused = useCallback(async (newValue: boolean) => {
    try {
      setIsPaused(newValue);
      const { error } = await supabase
        .from('schools')
        .update({ is_paused: newValue })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      setIsPaused(!newValue);
    }
  }, [schoolId]);

  const handleToggleLimitsEnabled = useCallback(async (newValue: boolean) => {
    try {
      setLimitsEnabled(newValue);
      const { error } = await supabase
        .from('schools')
        .update({ limits_enabled: newValue })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      setLimitsEnabled(!newValue);
    }
  }, [schoolId]);

  const handleResetTeacherPin = useCallback(async (teacherId: string) => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    if (!confirm(`Soll der PIN für diese Lehrkraft wirklich neu generiert werden? (Neuer PIN: ${newPin})`)) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          ausweis_nummer: newPin,
          is_pin_activated: false,
          personal_pin: null
        })
        .eq('id', teacherId);

      if (error) throw error;
      alert(`PIN wurde erfolgreich auf ${newPin} geändert.`);
      fetchDashboardData?.();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  }, [fetchDashboardData]);

  const handleUpdateTeacher = useCallback(async (updatedData: any) => {
    try {
      const teacherPayload = {
        first_name: updatedData.firstName,
        last_name: updatedData.lastName,
        email: (updatedData.email && updatedData.email.trim()) ? updatedData.email.trim() : null,
        instrument: updatedData.instrument,
        required_equipment: updatedData.requiredEquipment || [],
        ausweis_nummer: updatedData.ausweisNummer,
        is_campus_active: updatedData.isCampusActive,
        is_groovelab_active: updatedData.isGroovelabActive,
        is_active: updatedData.isActive,
        role: updatedData.role,
        contract_ends_at: updatedData.contractEndsAt || null
      };

      const { error: rawErr } = await supabase
        .from('users')
        .update(teacherPayload)
        .eq('id', updatedData.id);

      try {
        await supabase.from('users').update(teacherPayload).eq('id', updatedData.id);
      } catch (e) {}

      if (rawErr) throw rawErr;
      if (setManageTeacher) setManageTeacher(null);
      fetchDashboardData?.();
    } catch (err: any) {
      alert('Fehler beim Aktualisieren: ' + err.message);
    }
  }, [fetchDashboardData, setManageTeacher]);

  return {
    // Campus Extended Settings
    campusHomeworkNotesSync,
    setCampusHomeworkNotesSync,
    campusMeisterwerkEnabled,
    setCampusMeisterwerkEnabled,
    campusFocusTimerDefaultMin,
    setCampusFocusTimerDefaultMin,
    campusFocusTimerXpFactor,
    setCampusFocusTimerXpFactor,
    campusLoopstationBarsPause,
    setCampusLoopstationBarsPause,
    campusAudioMaxSessionMinutes,
    setCampusAudioMaxSessionMinutes,
    campusScheduleSlotMinutes,
    setCampusScheduleSlotMinutes,
    campusScheduleConflictWarning,
    setCampusScheduleConflictWarning,
    campusParentAbsenceNotify,
    setCampusParentAbsenceNotify,
    campusParentChatEnabled,
    setCampusParentChatEnabled,
    campusParentStatsEnabled,
    setCampusParentStatsEnabled,
    campusKioskPinLength,
    setCampusKioskPinLength,
    campusKioskAutoLogoutMinutes,
    setCampusKioskAutoLogoutMinutes,
    activeCampusSettingsModal,
    setActiveCampusSettingsModal,

    // GrooveLab Extended Settings
    glMaxBandMembers,
    setGlMaxBandMembers,
    glAllowStudentBandCreation,
    setGlAllowStudentBandCreation,
    glSongLevelStarterEnabled,
    setGlSongLevelStarterEnabled,
    glSongLevelProEnabled,
    setGlSongLevelProEnabled,
    glSongLevelMasterEnabled,
    setGlSongLevelMasterEnabled,
    glSongProposalWorkflow,
    setGlSongProposalWorkflow,
    glLiveDefaultBpm,
    setGlLiveDefaultBpm,
    glLiveCountInBars,
    setGlLiveCountInBars,
    glLiveStageDisplayEnabled,
    setGlLiveStageDisplayEnabled,
    glSkillRadarTiming,
    setGlSkillRadarTiming,
    glSkillRadarTechnique,
    setGlSkillRadarTechnique,
    glSkillRadarSound,
    setGlSkillRadarSound,
    glSkillRadarRepertoire,
    setGlSkillRadarRepertoire,
    glSkillRadarTeamplay,
    setGlSkillRadarTeamplay,
    glMusicianAvatarsEnabled,
    setGlMusicianAvatarsEnabled,
    glBandCoatOfArmsEnabled,
    setGlBandCoatOfArmsEnabled,
    glBandChatEnabled,
    setGlBandChatEnabled,
    glCoachModerationRequired,
    setGlCoachModerationRequired,
    glJamRecordingCompression,
    setGlJamRecordingCompression,
    activeGroovelabSettingsModal,
    setActiveGroovelabSettingsModal,

    // Tokens & Operational Settings
    kioskToken,
    setKioskToken,
    campusToken,
    setCampusToken,
    allowMessagesGlobal,
    setAllowMessagesGlobal,
    regeneratingTokens,
    setRegeneratingTokens,
    handleRegenerateTokens,
    handleToggleMessagesGlobal,

    isPaused,
    setIsPaused,
    handleToggleIsPaused,
    limitsEnabled,
    setLimitsEnabled,
    handleToggleLimitsEnabled,

    handleResetTeacherPin,
    handleUpdateTeacher,

    // Delinquency & Grace Period
    schoolInvoices,
    setSchoolInvoices,
    showDunningPayModal,
    setShowDunningPayModal,
    trustRefreshToken,
    setTrustRefreshToken,
    dunningStatus,
    assertSecretaryWriteAccess,
    expandedYears,
    setExpandedYears,
    showDateSimulation,
    setShowDateSimulation
  };
}
