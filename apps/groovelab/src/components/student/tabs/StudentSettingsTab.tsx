import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { unsubscribeUserFromPush } from '../../../utils/webPush';
import {
  Lock, Trophy, Sparkles, Star, Coffee, Clock, Timer, BookOpen, Play, Pause, Square,
  RotateCcw, Volume2, Moon, QrCode, X, Eye, EyeOff, Zap, Music, Library, School,
  Calendar, CalendarX, Check, CheckCircle, Target, Pencil, User, Mail, Phone, Users,
  Shield, Settings, Bell, FileText, AlertTriangle, ShieldCheck, CheckCheck, Mic, Download,
  Key, Delete, Sliders, Compass, Lightbulb, Copy, Fingerprint, Headphones, ChevronLeft, ChevronRight, Camera
} from 'lucide-react';
import { formatTeacherFullName } from '../../../utils/nameHelper';
import { CampusGroovelabText } from '../../CampusGroovelabBrand';
import { validateNewPin } from '../../../utils/pinValidation';
import { secureVault } from '../../../utils/secureVault';
import { AddSiblingModal } from '../../campus/AddSiblingModal';
import { Avatar, getInstrumentAvatarUrl, resolveCampusStudentAvatar, STUDENT_AVATARS } from '../studentAvatars.constants';
import { CAMPUS_AGE_STANDARDS } from '../studentAgeStandards';
import { StudentBillingInvoicesSection } from '../StudentBillingInvoicesSection';
import JSZip from 'jszip';
import { ensureWavBlob } from '../../../utils/audioMasteringEngine';
import { ALL_STICKERS, getUnifiedStickerStatus } from '../../../domain/stickersAndTresor';
import { ParentProtectionSettingsView } from '../settings/ParentProtectionSettingsView';
import { ParentScreenTimeSettingsView } from '../settings/ParentScreenTimeSettingsView';
import { ParentPracticeReportSettingsView } from '../settings/ParentPracticeReportSettingsView';
import { ParentCancellationLogSettingsView } from '../settings/ParentCancellationLogSettingsView';
import { ParentFamilyProfilesSettingsView } from '../settings/ParentFamilyProfilesSettingsView';
import { ParentDataVaultSettingsView } from '../settings/ParentDataVaultSettingsView';
import { ParentDevelopmentGridSettingsView } from '../settings/ParentDevelopmentGridSettingsView';
import { ParentConsentSettingsView } from '../settings/ParentConsentSettingsView';

export interface StudentSettingsTabProps {
  activeStudentSettingsModal: string | null;
  activeTab: string;
  applyAndSaveParentControls: (updates: any) => Promise<void>;
  avatar?: any;
  bedtimeEnd: string;
  bedtimeModeEnabled: boolean;
  bedtimeStart: string;
  cancelledSchoolYearOccurrences: any[];
  checkIsParentSessionActive: () => boolean;
  currentPlatform: string;
  daytimeLockDays: 'school_days' | 'everyday';
  daytimeLockEnabled: boolean;
  daytimeLockEnd: string;
  daytimeLockStart: string;
  draftAllowAbsences: boolean | null;
  draftAllowAudio: boolean | null;
  draftAllowChat: boolean | null;
  draftAllowLeaderboard: boolean | null;
  draftAllowProposals: boolean | null;
  draftAllowReschedule: boolean | null;
  draftAllowTimer: boolean | null;
  draftAllowTts: boolean | null;
  draftBoardOverrides: Record<string, boolean>;
  draftUiLevel: string;
  extendParentSession: () => void;
  familyProfiles: any[];
  firstPinActiveField: 'new' | 'confirm';
  firstPinShowMask: boolean;
  generateParentRecoveryKey: () => string;
  getTargetMinutes: (item: any) => number;
  handleBiometricUnlock: () => Promise<void>;
  handleRegisterParentPasskey?: () => Promise<{ success: boolean; error?: string }>;
  handleCloseSettingsModal: () => void;
  handleDownloadGoBdReceipt: (rec: any) => Promise<void>;
  handleExportGdprReport: () => Promise<void>;
  handleExportFullDataArchive?: () => Promise<void>;
  handleOpenSettingsModule: (module: string) => void;
  handleRemoveFamilyProfile: (id: string, e?: React.MouseEvent) => void;
  handleSetInstantLock: (minutes: number | null) => Promise<void>;
  handleSwitchFamilyStudent: (targetId: string, keepParentUnlocked?: boolean) => void;
  handleUndoCancelOccurrence: (occ: any, skipPinCheck?: boolean) => Promise<any>;
  handleUpdateBedtime: (enabled: boolean, start?: string, end?: string) => Promise<void>;
  handleUpdateDaytimeLock: (enabled: boolean, start?: string, end?: string, days?: 'school_days' | 'everyday') => Promise<void>;
  handleVerifyParentPinAttempt: (cleanInput: string, onSuccess: () => void) => Promise<any>;
  hasCopiedRecoveryKey: boolean;
  instantLockUntil: number | null;
  isAddSiblingModalOpen: boolean;
  isAdultStudent: boolean;
  isCurrentlyInInstantLock: boolean;
  isIOS: boolean;
  isMobile: boolean;
  isParentGateShaking: boolean;
  isParentLockWarning: boolean;
  isParentUnlocked: boolean;
  isPremiumUser: boolean;
  isSavingPin: boolean;
  isStandalone: boolean;
  isVerifyingParentGate: boolean;
  isWebAuthnAvailable: boolean;
  newGeneratedRecoveryKey: string;
  onProfileUpdate?: (updated: any) => void;
  parentBriefingDismissed: boolean;
  parentControlsTab: 'governance' | 'insights' | 'cancellations' | 'downloads';
  parentGateCooldownSeconds: number;
  parentGateError: string | null;
  parentGatePinInput: string;
  parentLockRemainingSeconds: number;
  parentSetupConfirm: string;
  parentSetupError: string | null;
  parentSetupPin: string;
  parentSetupStep: 'enter' | 'confirm';
  pinFormConfirm: string;
  pinFormError: string | null;
  pinFormNew: string;
  pinFormSuccess: string;
  pushEnabled: boolean;
  pushNotifChat: boolean;
  pushNotifHomework: boolean;
  pushNotifPracticeReminder: boolean;
  pushNotifScheduleChanges: boolean;
  pushNotifWeeklyDigest: boolean;
  recentlyChangedDiff: any;
  renderParentGateModal: () => React.ReactNode;
  renderRecoveryKeyModal: () => React.ReactNode;
  scheduleOccurrences: any[];
  securityPinTarget: 'student' | 'parent';
  setActiveStudentSettingsModal: (modal: any) => void;
  setFamilyProfiles: React.Dispatch<React.SetStateAction<any[]>>;
  setFirstPinActiveField: (field: 'new' | 'confirm') => void;
  setFirstPinShowMask: React.Dispatch<React.SetStateAction<boolean>>;
  setHasCopiedRecoveryKey: React.Dispatch<React.SetStateAction<boolean>>;
  setIsAddSiblingModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsHelpCenterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSavingPin: React.Dispatch<React.SetStateAction<boolean>>;
  setNewGeneratedRecoveryKey: React.Dispatch<React.SetStateAction<string>>;
  setParentBriefingDismissed: React.Dispatch<React.SetStateAction<boolean>>;
  setParentControlsTab: React.Dispatch<React.SetStateAction<'governance' | 'insights' | 'cancellations' | 'downloads'>>;
  setParentGateError: React.Dispatch<React.SetStateAction<string>> | ((err: any) => void);
  setParentGatePinInput: React.Dispatch<React.SetStateAction<string>>;
  setParentSetupConfirm: React.Dispatch<React.SetStateAction<string>>;
  setParentSetupError: React.Dispatch<React.SetStateAction<string>> | ((err: any) => void);
  setParentSetupPin: React.Dispatch<React.SetStateAction<string>>;
  setParentSetupStep: React.Dispatch<React.SetStateAction<'enter' | 'confirm'>>;
  setPinFormConfirm: React.Dispatch<React.SetStateAction<string>>;
  setPinFormError: React.Dispatch<React.SetStateAction<string>> | ((err: any) => void);
  setPinFormNew: React.Dispatch<React.SetStateAction<string>>;
  setPinFormSuccess: React.Dispatch<React.SetStateAction<string>>;
  setPushEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setPushNotifChat: React.Dispatch<React.SetStateAction<boolean>>;
  setPushNotifHomework: React.Dispatch<React.SetStateAction<boolean>>;
  setPushNotifPracticeReminder: React.Dispatch<React.SetStateAction<boolean>>;
  setPushNotifScheduleChanges: React.Dispatch<React.SetStateAction<boolean>>;
  setPushNotifWeeklyDigest: React.Dispatch<React.SetStateAction<boolean>>;
  setRecentlyChangedDiff: React.Dispatch<React.SetStateAction<any>>;
  setRecoveryKeyError: React.Dispatch<React.SetStateAction<string>> | ((err: any) => void);
  setRecoveryKeyInput: (input: string) => void;
  setSecurityPinTarget: (target: 'student' | 'parent') => void;
  setSettingsSubTab: React.Dispatch<React.SetStateAction<any>> | ((subTab: any) => void);
  setShowEmergencyKitModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowParentActivationModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPushSoftPrompt: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRecoveryKeyModal: React.Dispatch<React.SetStateAction<boolean>>;
  setStudentUser: React.Dispatch<React.SetStateAction<any>>;
  showEmergencyKitModal: boolean;
  studentId: string;
  studentUiLevel?: string;
  studentUser: any;
  totalPracticeMinutes: number;
  weeklyPracticeMinutes?: number;
  schoolYearPracticeMinutes?: number;
  lockParentSession?: () => void;
}

export function StudentSettingsTab(props: StudentSettingsTabProps) {
  const {
    activeStudentSettingsModal,
    activeTab,
    applyAndSaveParentControls,
    avatar,
    bedtimeEnd,
    bedtimeModeEnabled,
    bedtimeStart,
    cancelledSchoolYearOccurrences,
    checkIsParentSessionActive,
    currentPlatform,
    daytimeLockDays,
    daytimeLockEnabled,
    daytimeLockEnd,
    daytimeLockStart,
    draftAllowAbsences,
    draftAllowAudio,
    draftAllowChat,
    draftAllowLeaderboard,
    draftAllowProposals,
    draftAllowReschedule,
    draftAllowTimer,
    draftAllowTts,
    draftBoardOverrides,
    draftUiLevel,
    extendParentSession,
    familyProfiles,
    firstPinActiveField,
    firstPinShowMask,
    generateParentRecoveryKey,
    getTargetMinutes,
    handleBiometricUnlock,
    handleRegisterParentPasskey,
    handleCloseSettingsModal,
    handleDownloadGoBdReceipt,
    handleExportGdprReport,
    handleExportFullDataArchive,
    handleOpenSettingsModule,
    handleRemoveFamilyProfile,
    handleSetInstantLock,
    handleSwitchFamilyStudent,
    handleUndoCancelOccurrence,
    handleUpdateBedtime,
    handleUpdateDaytimeLock,
    handleVerifyParentPinAttempt,
    hasCopiedRecoveryKey,
    instantLockUntil,
    isAddSiblingModalOpen,
    isAdultStudent,
    isCurrentlyInInstantLock,
    isIOS,
    isMobile,
    isParentGateShaking,
    isParentLockWarning,
    isParentUnlocked,
    isPremiumUser,
    isSavingPin,
    isStandalone,
    isVerifyingParentGate,
    isWebAuthnAvailable,
    newGeneratedRecoveryKey,
    onProfileUpdate,
    parentBriefingDismissed,
    parentControlsTab,
    parentGateCooldownSeconds,
    parentGateError,
    parentGatePinInput,
    parentLockRemainingSeconds,
    parentSetupConfirm,
    parentSetupError,
    parentSetupPin,
    parentSetupStep,
    pinFormConfirm,
    pinFormError,
    pinFormNew,
    pinFormSuccess,
    pushEnabled,
    pushNotifChat,
    pushNotifHomework,
    pushNotifPracticeReminder,
    pushNotifScheduleChanges,
    pushNotifWeeklyDigest,
    recentlyChangedDiff,
    renderParentGateModal,
    renderRecoveryKeyModal,
    scheduleOccurrences,
    securityPinTarget,
    setActiveStudentSettingsModal,
    setFamilyProfiles,
    setFirstPinActiveField,
    setFirstPinShowMask,
    setHasCopiedRecoveryKey,
    setIsAddSiblingModalOpen,
    setIsHelpCenterOpen,
    setIsSavingPin,
    setNewGeneratedRecoveryKey,
    setParentBriefingDismissed,
    setParentControlsTab,
    setParentGateError,
    setParentGatePinInput,
    setParentSetupConfirm,
    setParentSetupError,
    setParentSetupPin,
    setParentSetupStep,
    setPinFormConfirm,
    setPinFormError,
    setPinFormNew,
    setPinFormSuccess,
    setPushEnabled,
    setPushNotifChat,
    setPushNotifHomework,
    setPushNotifPracticeReminder,
    setPushNotifScheduleChanges,
    setPushNotifWeeklyDigest,
    setRecentlyChangedDiff,
    setRecoveryKeyError,
    setRecoveryKeyInput,
    setSecurityPinTarget,
    setSettingsSubTab,
    setShowEmergencyKitModal,
    setShowParentActivationModal,
    setShowPushSoftPrompt,
    setShowRecoveryKeyModal,
    setStudentUser,
    showEmergencyKitModal,
    studentId,
    studentUiLevel,
    studentUser,
    totalPracticeMinutes,
    weeklyPracticeMinutes,
    schoolYearPracticeMinutes
  } = props;

  const [downloadingSection, setDownloadingSection] = React.useState<string | null>(null);
  const [downloadProgressMsg, setDownloadProgressMsg] = React.useState<string>('');
  const [downloadFeedback, setDownloadFeedback] = React.useState<string | null>(null);

  // 🛡️ Passkey (FaceID / TouchID) State
  const [hasDevicePasskey, setHasDevicePasskey] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const targetId = studentId || (studentUser as any)?.id;
    return Boolean(targetId && localStorage.getItem(`groovelab_parent_passkey_active_${targetId}`) === 'true');
  });
  const [isRegisteringPasskey, setIsRegisteringPasskey] = React.useState<boolean>(false);
  const [passkeyActionMessage, setPasskeyActionMessage] = React.useState<string | null>(null);
  const [passkeyActionStatus, setPasskeyActionStatus] = React.useState<'success' | 'error'>('success');
  const [activeHubSubTab, setActiveHubSubTab] = React.useState<string>('default');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const targetId = studentId || (studentUser as any)?.id;
    if (targetId) {
      setHasDevicePasskey(localStorage.getItem(`groovelab_parent_passkey_active_${targetId}`) === 'true');
    }
  }, [studentId, (studentUser as any)?.id]);

  // 🌟 Direct Parent Cockpit: State & Authoritative Actions (0,1% Monolith Goldstandard)
  const serverScreenMinutes = studentUser?.parent_permissions?.max_screen_minutes;
  const [directMaxMinutes, setDirectMaxMinutes] = React.useState<number>(() => {
    if (typeof serverScreenMinutes === 'number' && serverScreenMinutes > 0) return serverScreenMinutes;
    return (studentUiLevel === 'junior' || draftUiLevel === 'junior') ? 30 : ((studentUiLevel === 'teen' || draftUiLevel === 'teen') ? 45 : 60);
  });

  React.useEffect(() => {
    if (typeof serverScreenMinutes === 'number') {
      setDirectMaxMinutes(serverScreenMinutes);
    }
  }, [serverScreenMinutes]);

  const handleDirectSetMaxMinutes = async (mins: number) => {
    setDirectMaxMinutes(mins);
    const targetId = studentId || (studentUser as any)?.id;
    if (targetId) {
      try {
        const nextPermissions = {
          ...(studentUser?.parent_permissions || {}),
          max_screen_minutes: mins,
          updated_at: new Date().toISOString()
        };
        await supabase.rpc('save_parent_controls', {
          p_student_id: targetId,
          p_settings: {
            parent_permissions: nextPermissions
          }
        });
        if (studentUser) {
          studentUser.parent_permissions = nextPermissions;
        }
      } catch (e) {
        console.warn('Fehler beim Speichern der Pausen-Erinnerung:', e);
      }
    }
  };

  const [isDirectSwitchingLevel, setIsDirectSwitchingLevel] = React.useState<boolean>(false);

  const handleDirectAgeLevelSwitch = async (targetLevelId: 'junior' | 'teen' | 'pro') => {
    if (isDirectSwitchingLevel || targetLevelId === draftUiLevel) return;
    setIsDirectSwitchingLevel(true);
    try {
      const targetStandard = CAMPUS_AGE_STANDARDS[targetLevelId] || CAMPUS_AGE_STANDARDS.junior;
      await applyAndSaveParentControls({
        uiLevel: targetLevelId,
        allowAbsences: targetStandard.allowAbsences,
        allowRescheduleConfirm: targetStandard.allowRescheduleConfirm,
        allowChat: targetStandard.allowChat,
        allowTimer: targetStandard.allowTimer,
        allowLeaderboard: targetStandard.allowLeaderboard,
        allowProposals: true,
        allowAudio: targetStandard.allowAudio,
        allowStudentAudio: targetStandard.allowStudentAudio,
        allowTeacherAudio: targetStandard.allowTeacherAudio,
        allowTts: targetStandard.allowTts,
        boardOverrides: { ...targetStandard.boardOverrides, mediathek: true },
        bedtimeEnabled: targetStandard.bedtimeEnabled,
        bedtimeStart: targetStandard.bedtimeStart,
        bedtimeEnd: targetStandard.bedtimeEnd,
      });
    } catch (e) {
      console.warn('Fehler beim direkten Umschalten der Altersstufe:', e);
    } finally {
      setIsDirectSwitchingLevel(false);
    }
  };

  const curChatAllowed = draftAllowChat !== null
    ? draftAllowChat
    : (studentUser?.parent_allow_chat !== undefined ? Boolean(studentUser?.parent_allow_chat) : (CAMPUS_AGE_STANDARDS[draftUiLevel as keyof typeof CAMPUS_AGE_STANDARDS]?.allowChat ?? false));

  const handleDirectToggleChat = async () => {
    await applyAndSaveParentControls({ allowChat: !curChatAllowed });
  };

  const curAudioAllowed = draftAllowAudio !== null
    ? draftAllowAudio
    : (studentUser?.parent_allow_audio !== undefined ? Boolean(studentUser?.parent_allow_audio) : (draftBoardOverrides?.recordings ?? false));

  const handleDirectToggleAudio = async () => {
    const nextVal = !curAudioAllowed;
    await applyAndSaveParentControls({
      allowAudio: nextVal,
      allowStudentAudio: nextVal,
      allowTeacherAudio: nextVal
    });
  };

  const curAbsencesAllowed = draftAllowAbsences !== null
    ? draftAllowAbsences
    : (studentUser?.parent_allow_absences !== undefined ? Boolean(studentUser?.parent_allow_absences) : (CAMPUS_AGE_STANDARDS[draftUiLevel as keyof typeof CAMPUS_AGE_STANDARDS]?.allowAbsences ?? false));

  const handleDirectToggleAbsences = async () => {
    await applyAndSaveParentControls({ allowAbsences: !curAbsencesAllowed });
  };

  const curRescheduleAllowed = draftAllowReschedule !== null
    ? draftAllowReschedule
    : (studentUser?.parent_allow_reschedule !== undefined ? Boolean(studentUser?.parent_allow_reschedule) : (CAMPUS_AGE_STANDARDS[draftUiLevel as keyof typeof CAMPUS_AGE_STANDARDS]?.allowRescheduleConfirm ?? false));

  const handleDirectToggleReschedule = async () => {
    await applyAndSaveParentControls({ allowRescheduleConfirm: !curRescheduleAllowed });
  };

  const skillLevelsPreview = React.useMemo(() => {
    try {
      if (studentUser?.skill_radar_levels && typeof studentUser.skill_radar_levels === 'object') {
        return studentUser.skill_radar_levels;
      }
      const saved = typeof window !== 'undefined' ? localStorage.getItem(`groovelab_skill_overrides_${studentId || studentUser?.id || 'default'}`) : null;
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { timing: 3, rhythm: 3, technique: 3, repertoire: 2, creativity: 3 };
  }, [studentUser?.skill_radar_levels, studentId, studentUser?.id]);

  const downloadBlobAsFile = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const gatherStudentAudioRecordings = () => {
    const recordings: { title: string; url: string; date: string; duration?: number }[] = [];
    const seenUrls = new Set<string>();

    try {
      const raw = localStorage.getItem(`campus_junior_recordings_${studentId}`) || '[]';
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((rec: any, idx: number) => {
          const u = rec.audioUrl || rec.url;
          if (u && !seenUrls.has(u)) {
            seenUrls.add(u);
            recordings.push({
              title: rec.title || rec.label || `Übe-Aufnahme #${idx + 1}`,
              url: u,
              date: rec.date || rec.created_at || new Date().toISOString().split('T')[0],
              duration: rec.duration
            });
          }
        });
      }
    } catch (e) {}

    try {
      const rawBio = localStorage.getItem(`campus_milestones_${studentId}`) || '[]';
      const parsedBio = JSON.parse(rawBio);
      if (Array.isArray(parsedBio)) {
        parsedBio.forEach((m: any) => {
          const u = m.audioUrl || m.masteredAudioUrl;
          if (u && !seenUrls.has(u)) {
            seenUrls.add(u);
            recordings.push({
              title: m.title || 'Meilenstein',
              url: u,
              date: m.recordedAt || new Date().toISOString().split('T')[0],
              duration: m.duration
            });
          }
        });
      }
    } catch (e) {}

    return recordings;
  };

  const gatherUnlockedStickers = () => {
    const ctx = {
      practiceMinutes: totalPracticeMinutes || 0,
      xp: studentUser?.xp || 0,
      streakDays: studentUser?.current_streak || 0,
      progressItems: []
    };
    return ALL_STICKERS.map(st => {
      const status = getUnifiedStickerStatus(st, ctx);
      return {
        id: st.id,
        emoji: st.emoji,
        title: st.title,
        desc: st.desc,
        category: st.category,
        rarity: st.rarity,
        rarityLabel: st.rarityLabel,
        isUnlocked: status.isUnlocked,
        count: status.count,
        details: status.details
      };
    });
  };

  const studentCancellationsCount = React.useMemo(() => {
    return (cancelledSchoolYearOccurrences || []).filter((occ: any) => {
      const s = String(occ.status || '').toLowerCase();
      const role = String(occ.canceled_by_role || '').toLowerCase();
      return s === 'canceled_by_student' || role === 'student' || s === 'absent';
    }).length;
  }, [cancelledSchoolYearOccurrences]);

  const handleDownloadFullArchive = async () => {
    setDownloadingSection('full');
    setDownloadProgressMsg('Stelle didaktische Chronik, Sticker-Album & Audio-Dateien zusammen...');
    try {
      const zip = new JSZip();
      const safeName = (studentUser?.first_name || 'Schueler').replace(/[^a-zA-Z0-9_-]/g, '_');
      const rootFolder = zip.folder(`Campus_Meisterwerk_Archiv_${safeName}`) || zip;

      const unlockedStickers = gatherUnlockedStickers();
      const chronicle = {
        export_date: new Date().toISOString(),
        schueler: {
          vorname: studentUser?.first_name || '',
          gesamt_uebezeit_minuten: totalPracticeMinutes || 0,
          xp_punkte: studentUser?.xp || 0,
          aktuelle_streak_tage: studentUser?.current_streak || 0,
        },
        sammel_sticker_album: {
          gesamt_verfuegbar: ALL_STICKERS.length,
          freigeschaltet_anzahl: unlockedStickers.filter(s => s.isUnlocked).length,
          auszeichnungen: unlockedStickers.filter(s => s.isUnlocked)
        },
        dsgVO_hinweis: 'Dieses Archiv wurde gemäß Art. 20 DSGVO (Recht auf Datenübertragbarkeit) erstellt.'
      };
      rootFolder.file('didaktik_chronik_und_sticker.json', JSON.stringify(chronicle, null, 2));

      const audios = gatherStudentAudioRecordings();
      if (audios.length > 0) {
        const audioFolder = rootFolder.folder('audio_tresor') || rootFolder;
        for (let i = 0; i < audios.length; i++) {
          const a = audios[i];
          setDownloadProgressMsg(`Lade Aufnahme ${i + 1} von ${audios.length}: ${a.title}...`);
          try {
            const res = await fetch(a.url);
            if (res.ok) {
              const blob = await res.blob();
              const safeTitle = a.title.replace(/[^a-zA-Z0-9_-]/g, '_');
              const wavBlob = await ensureWavBlob(blob, { title: safeTitle, artist: 'Campus-Groovelab' });
              audioFolder.file(`${a.date}_${safeTitle}.wav`, wavBlob);
            }
          } catch (err) {}
        }
      }

      setDownloadProgressMsg('Erstelle ZIP-Komprimierung...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlobAsFile(zipBlob, `Campus-Meisterwerk-Archiv_${safeName}_${new Date().toISOString().split('T')[0]}.zip`);
      setDownloadFeedback('Vollständiges Meisterwerk-Archiv erfolgreich heruntergeladen!');
    } catch (e) {
      setDownloadFeedback('Fehler beim Erstellen des Archivs.');
    } finally {
      setDownloadingSection(null);
      setDownloadProgressMsg('');
      setTimeout(() => setDownloadFeedback(null), 4000);
    }
  };

  const handleDownloadAudioOnly = async () => {
    setDownloadingSection('audio');
    setDownloadProgressMsg('Sammle Audio-Aufnahmen...');
    try {
      const zip = new JSZip();
      const safeName = (studentUser?.first_name || 'Schueler').replace(/[^a-zA-Z0-9_-]/g, '_');
      const audios = gatherStudentAudioRecordings();
      
      if (audios.length === 0) {
        setDownloadFeedback('Keine Audioaufnahmen im Tresor vorhanden.');
        setDownloadingSection(null);
        return;
      }

      for (let i = 0; i < audios.length; i++) {
        const a = audios[i];
        setDownloadProgressMsg(`Packe Audio ${i + 1}/${audios.length}: ${a.title}...`);
        try {
          const res = await fetch(a.url);
          if (res.ok) {
            const blob = await res.blob();
            const safeTitle = a.title.replace(/[^a-zA-Z0-9_-]/g, '_');
            const wavBlob = await ensureWavBlob(blob, { title: safeTitle, artist: 'Campus-Groovelab' });
            zip.file(`${a.date}_${safeTitle}.wav`, wavBlob);
          }
        } catch (err) {}
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlobAsFile(zipBlob, `Audio-Tresor_${safeName}_${new Date().toISOString().split('T')[0]}.zip`);
      setDownloadFeedback('Audio-Tresor Aufnahmen erfolgreich heruntergeladen!');
    } catch (e) {
      setDownloadFeedback('Fehler beim Herunterladen der Aufnahmen.');
    } finally {
      setDownloadingSection(null);
      setDownloadProgressMsg('');
      setTimeout(() => setDownloadFeedback(null), 4000);
    }
  };

  const handleDownloadBiographyOnly = async () => {
    setDownloadingSection('biography');
    setDownloadProgressMsg('Sammle Meilensteine der Audio-Biografie...');
    try {
      const zip = new JSZip();
      const safeName = (studentUser?.first_name || 'Schueler').replace(/[^a-zA-Z0-9_-]/g, '_');
      const rawBio = localStorage.getItem(`campus_milestones_${studentId}`) || '[]';
      const milestones = JSON.parse(rawBio);

      let count = 0;
      for (const m of milestones) {
        const u = m.audioUrl || m.masteredAudioUrl;
        if (u) {
          count++;
          setDownloadProgressMsg(`Lade Meilenstein ${count}: ${m.title}...`);
          try {
            const res = await fetch(u);
            if (res.ok) {
              const blob = await res.blob();
              const safeTitle = (m.title || 'Meilenstein').replace(/[^a-zA-Z0-9_-]/g, '_');
              const wavBlob = await ensureWavBlob(blob, { title: safeTitle, artist: 'Campus-Groovelab' });
              zip.file(`${safeTitle}.wav`, wavBlob);
            }
          } catch (err) {}
        }
      }

      if (count === 0) {
        setDownloadFeedback('Noch keine Audio-Biografie Aufnahmen vorhanden.');
        setDownloadingSection(null);
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlobAsFile(zipBlob, `Audio-Biografie_${safeName}_${new Date().toISOString().split('T')[0]}.zip`);
      setDownloadFeedback('Audio-Biografie Meilensteine erfolgreich heruntergeladen!');
    } catch (e) {
      setDownloadFeedback('Fehler beim Export der Biografie.');
    } finally {
      setDownloadingSection(null);
      setDownloadProgressMsg('');
      setTimeout(() => setDownloadFeedback(null), 4000);
    }
  };

  const handleDownloadChronicleAndStickers = async () => {
    setDownloadingSection('chronicle');
    setDownloadProgressMsg('Erstelle Sammel-Sticker-Album & Didaktik-Chronik...');
    try {
      const unlockedStickers = gatherUnlockedStickers();
      const safeName = (studentUser?.first_name || 'Schueler').replace(/[^a-zA-Z0-9_-]/g, '_');

      const data = {
        dokument_titel: `Sammel-Sticker-Album & Didaktik-Chronik: ${studentUser?.first_name || ''}`,
        erstellt_am: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        plattform: 'Campus-Groovelab',
        statistiken: {
          gesamt_uebezeit: `${totalPracticeMinutes || 0} Minuten`,
          xp_stand: `${studentUser?.xp || 0} XP`,
          aktuelle_streak: `${studentUser?.current_streak || 0} Tage`
        },
        sammel_sticker_album: unlockedStickers.map(st => ({
          emoji: st.emoji,
          titel: st.title,
          beschreibung: st.desc,
          kategorie: st.category,
          seltenheitsgrad: st.rarityLabel,
          status: st.isUnlocked ? 'Freigeschaltet ⭐' : 'Noch gesperrt 🔒',
          anzahl: st.count,
          auszeichnungen: st.details
        }))
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlobAsFile(blob, `Didaktik-Chronik_und_Sticker-Album_${safeName}.json`);

      if (typeof handleExportGdprReport === 'function') {
        await handleExportGdprReport();
      }

      setDownloadFeedback('Sammel-Sticker-Album & Didaktik-Chronik erfolgreich exportiert!');
    } catch (e) {
      setDownloadFeedback('Fehler beim Export.');
    } finally {
      setDownloadingSection(null);
      setDownloadProgressMsg('');
      setTimeout(() => setDownloadFeedback(null), 4000);
    }
  };

  return (
      <div style={{ display: (activeTab === 'settings' && studentUser) ? 'flex' : 'none', marginTop: '0px', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '0' }}>
        {activeTab === 'settings' && studentUser && (() => {
          const isJuniorOrTeen = (studentUiLevel === 'junior' || studentUiLevel === 'teen');
          const isMinorStudent = !isAdultStudent;
          const isParentSessionActive = checkIsParentSessionActive();
          const isParentGateLocked = isMinorStudent && !isParentSessionActive;
          const hasConfiguredParentPin = Boolean(studentUser?.has_parent_pin === true);

          const isProtectionHub = activeStudentSettingsModal === 'protection_and_safety' || activeStudentSettingsModal === 'parent_controls' || activeStudentSettingsModal === 'screentime' || activeStudentSettingsModal === 'security';
          const isLearningHub = activeStudentSettingsModal === 'learning_and_insights' || activeStudentSettingsModal === 'practice_report' || activeStudentSettingsModal === 'skills_radar' || activeStudentSettingsModal === 'cancellations';
          const isFamilyHub = activeStudentSettingsModal === 'family_and_devices' || activeStudentSettingsModal === 'family_profiles';
          const isBillingHub = activeStudentSettingsModal === 'billing_and_legal' || activeStudentSettingsModal === 'billing' || activeStudentSettingsModal === 'notifications' || activeStudentSettingsModal === 'consents' || activeStudentSettingsModal === 'downloads' || activeStudentSettingsModal === 'legal' || activeStudentSettingsModal === 'modules';

          const effectiveProtectionSubTab = (isProtectionHub && activeHubSubTab !== 'default')
            ? activeHubSubTab
            : (activeStudentSettingsModal === 'screentime' ? 'screentime' : (activeStudentSettingsModal === 'security' ? 'security' : 'parent_controls'));

          const effectiveLearningSubTab = (isLearningHub && activeHubSubTab !== 'default')
            ? activeHubSubTab
            : (activeStudentSettingsModal === 'skills_radar' ? 'skills_radar' : (activeStudentSettingsModal === 'cancellations' ? 'cancellations' : 'practice_report'));

          const effectiveBillingSubTab = (isBillingHub && activeHubSubTab !== 'default')
            ? activeHubSubTab
            : (activeStudentSettingsModal === 'notifications' ? 'notifications' : (activeStudentSettingsModal === 'consents' ? 'consents' : (activeStudentSettingsModal === 'downloads' || activeStudentSettingsModal === 'legal' ? 'downloads' : 'billing')));

          const handleCardClick = (id: string) => {
            if (id === 'parent_controls' || id === 'screentime' || id === 'security') {
              setActiveHubSubTab(id);
              handleOpenSettingsModule('protection_and_safety');
            } else if (id === 'practice_report' || id === 'cancellations' || id === 'skills_radar') {
              setActiveHubSubTab(id);
              handleOpenSettingsModule('learning_and_insights');
            } else if (id === 'family_profiles') {
              setActiveHubSubTab('family_profiles');
              handleOpenSettingsModule('family_and_devices');
            } else if (id === 'modules') {
              setActiveHubSubTab('default');
              handleOpenSettingsModule('modules');
            } else if (id === 'billing' || id === 'notifications' || id === 'consents' || id === 'downloads' || id === 'legal') {
              setActiveHubSubTab(id === 'legal' ? 'downloads' : id);
              handleOpenSettingsModule('billing_and_legal');
            } else {
              setActiveHubSubTab(id);
              handleOpenSettingsModule(id);
            }
          };

          return (
            <>
              {isParentGateLocked ? (
                <div style={{
                width: '100%',
                maxWidth: '440px',
                margin: '20px auto',
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '32px',
                padding: '36px 28px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.08)'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '22px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  marginBottom: '16px',
                  boxShadow: '0 8px 20px -4px rgba(2, 132, 199, 0.4)'
                }}>
                  <ShieldCheck size={34} />
                </div>

                <h2 style={{ fontSize: '1.4rem', fontWeight: 1000, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {hasConfiguredParentPin ? 'Elternbereich geschützt' : '6-stellige Eltern-Master-PIN vergeben'}
                </h2>
                <p style={{ margin: '8px 0 18px 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, lineHeight: 1.4 }}>
                  {hasConfiguredParentPin
                    ? 'Bitte gib deine 6-stellige Eltern-Master-PIN ein, um den Elternbereich und alle Einstellungen zu öffnen.'
                    : (parentSetupStep === 'enter'
                        ? 'Erstelle eine neue 6-stellige Master-PIN für den geschützten Elternbereich.'
                        : 'Wiederhole deine 6-stellige Master-PIN zur Bestätigung.')}
                </p>

                <style>{`
                  @keyframes pinShakeAnim {
                    0%, 100% { transform: translateX(0); }
                    15%, 45%, 75% { transform: translateX(-8px); }
                    30%, 60%, 90% { transform: translateX(8px); }
                  }
                `}</style>

                {(parentGateError || parentSetupError) && (
                  <div style={{
                    padding: '10px 16px',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: '14px',
                    color: '#dc2626',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    marginBottom: '16px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    {parentGateError || parentSetupError}
                  </div>
                )}

                {parentGateCooldownSeconds > 0 && (
                  <div style={{
                    padding: '10px 16px',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    borderRadius: '14px',
                    color: '#92400e',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    marginBottom: '16px',
                    width: '100%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    <Clock size={16} color="#92400e" />
                    <span>Sicherheitssperre aktiv: Bitte warte noch <strong>{parentGateCooldownSeconds}s</strong></span>
                  </div>
                )}

                {/* 1-Click Biometric Quick-Unlock (FaceID / TouchID / Passkey) - Duale Direktansicht */}
                {isWebAuthnAvailable && (
                  <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                    <button
                      type="button"
                      onClick={handleBiometricUnlock}
                      disabled={isVerifyingParentGate || parentGateCooldownSeconds > 0}
                      style={{
                        width: '100%',
                        padding: '13px 20px',
                        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                        border: '1.5px solid #86efac',
                        borderRadius: '18px',
                        color: '#15803d',
                        fontSize: '0.88rem',
                        fontWeight: 850,
                        cursor: (isVerifyingParentGate || parentGateCooldownSeconds > 0) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 14px rgba(34, 197, 94, 0.16)',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                    >
                      <Fingerprint size={20} color="#16a34a" />
                      <span>Mit FaceID / TouchID entsperren</span>
                    </button>

                    {/* Dezenter Teiler: Oder 6-stellige PIN eingeben */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                      <span style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        oder 6-stellige PIN eingeben
                      </span>
                      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                    </div>
                  </div>
                )}

                {/* 6 Dots Display with Shake Animation */}
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  marginBottom: '20px',
                  animation: isParentGateShaking ? 'pinShakeAnim 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97) both' : 'none'
                }}>
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const currentLen = hasConfiguredParentPin 
                      ? parentGatePinInput.length 
                      : (parentSetupStep === 'enter' ? parentSetupPin.length : parentSetupConfirm.length);
                    const isFilled = currentLen > idx;
                    const isError = isParentGateShaking;
                    return (
                      <div
                        key={idx}
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          border: `2px solid ${isError ? '#dc2626' : (isFilled ? '#0284c7' : '#cbd5e1')}`,
                          background: isError ? '#dc2626' : (isFilled ? '#0284c7' : 'transparent'),
                          transition: 'all 0.15s ease'
                        }}
                      />
                    );
                  })}
                </div>

                {/* 3x4 Touch Keypad */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  width: '100%',
                  maxWidth: '300px'
                }}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'back'].map((key) => {
                    const isSpecial = key === 'C' || key === 'back';
                    const isDisabled = isVerifyingParentGate || parentGateCooldownSeconds > 0;
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={isDisabled}
                        onClick={async () => {
                          if (parentGateCooldownSeconds > 0) return;
                          setParentGateError('');
                          setParentSetupError('');

                          if (hasConfiguredParentPin) {
                            if (key === 'C') {
                              setParentGatePinInput('');
                            } else if (key === 'back') {
                              setParentGatePinInput((prev: string) => prev.slice(0, -1));
                            } else if (parentGatePinInput.length < 6) {
                              const nextVal = parentGatePinInput + key;
                              setParentGatePinInput(nextVal);
                              if (nextVal.length === 6) {
                                handleVerifyParentPinAttempt(nextVal, () => {
                                  setSettingsSubTab('overview');
                                  setActiveStudentSettingsModal(null);
                                });
                              }
                            }
                          } else {
                            // First-time PIN setup
                            if (parentSetupStep === 'enter') {
                              if (key === 'C') {
                                setParentSetupPin('');
                              } else if (key === 'back') {
                                setParentSetupPin((prev: string) => prev.slice(0, -1));
                              } else if (parentSetupPin.length < 6) {
                                const nextVal = parentSetupPin + key;
                                setParentSetupPin(nextVal);
                                if (nextVal.length === 6) {
                                  if (/^(\d)\1+$/.test(nextVal) || nextVal === '123456' || nextVal === '654321') {
                                    setParentSetupError('Bitte wähle eine sicherere PIN (nicht 123456 oder 000000).');
                                    setParentSetupPin('');
                                    return;
                                  }
                                  setParentSetupStep('confirm');
                                }
                              }
                            } else {
                              if (key === 'C') {
                                setParentSetupConfirm('');
                              } else if (key === 'back') {
                                setParentSetupConfirm((prev: string) => prev.slice(0, -1));
                              } else if (parentSetupConfirm.length < 6) {
                                const nextVal = parentSetupConfirm + key;
                                setParentSetupConfirm(nextVal);
                                if (nextVal.length === 6) {
                                  if (nextVal !== parentSetupPin) {
                                    setParentSetupError('Die PINs stimmen nicht überein.');
                                    setParentSetupConfirm('');
                                    setParentSetupPin('');
                                    setParentSetupStep('enter');
                                    return;
                                  }

                                  const recKey = generateParentRecoveryKey();
                                  try {
                                    let rpcSuccess = false;
                                    try {
                                      const { data: rpcRes, error: rpcErr } = await supabase.rpc('set_parent_pin_with_recovery_key', {
                                        p_student_id: studentId,
                                        p_new_pin: nextVal,
                                        p_recovery_key: recKey
                                      });
                                      if (!rpcErr && rpcRes === true) rpcSuccess = true;
                                    } catch (e) {}

                                    if (!rpcSuccess) {
                                      const { data: fbRes, error: fbErr } = await supabase.rpc('set_parent_pin', {
                                        p_student_id: studentId,
                                        p_new_pin: nextVal
                                      });
                                      if (fbErr || fbRes !== true) {
                                        throw new Error(fbErr?.message || 'Serverfehler beim Speichern der Eltern-PIN.');
                                      }
                                    }
                                    
                                    if (studentUser) {
                                      (studentUser as any).has_parent_pin = true;
                                    }

                                    sessionStorage.setItem(`groovelab_parent_session_${studentId}`, String(Date.now() + 180 * 1000));
                                    sessionStorage.setItem(`groovelab_parent_unlocked_${studentId}`, 'true');
                                    sessionStorage.setItem('groovelab_parent_unlocked_global', 'true');
                                    window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: true }));

                                    setParentSetupPin('');
                                    setParentSetupConfirm('');
                                    setParentSetupStep('enter');

                                    // Trigger Schicht 1: One-Time Emergency Kit Modal!
                                    setNewGeneratedRecoveryKey(recKey);
                                    setHasCopiedRecoveryKey(false);
                                    setShowEmergencyKitModal(true);
                                  } catch (e: any) {
                                    setParentSetupError('Fehler beim Speichern: ' + e.message);
                                    setParentSetupConfirm('');
                                  }
                                }
                              }
                            }
                          }
                        }}
                          style={{
                            height: '48px',
                            borderRadius: '14px',
                            border: '1.5px solid #e2e8f0',
                            background: '#ffffff',
                            color: '#0f172a',
                            fontSize: '1.15rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            transition: 'all 0.1s'
                          }}
                          className="hover-scale"
                        >
                          {key === 'back' ? <Delete size={20} /> : key}
                        </button>
                      );
                    })}
                  </div>

                  {/* Secure Tier-1 PIN Recovery Link */}
                  {hasConfiguredParentPin && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryKeyInput('');
                          setRecoveryKeyError('');
                          setShowRecoveryKeyModal(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0284c7',
                          fontSize: '0.8rem',
                          fontWeight: 750,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <ShieldCheck size={14} />
                        <span>Eltern-PIN vergessen? Mit Notfall-Schlüssel wiederherstellen</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '1.65rem', fontWeight: 1000, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: currentPlatform === 'groovelab' ? '#fefce8' : '#e6f4ea', border: currentPlatform === 'groovelab' ? '1px solid #fef08a' : '1px solid #ceebd6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: currentPlatform === 'groovelab' ? '#ca8a04' : '#34a853' }}>
                      <Sliders size={22} strokeWidth={2.4} />
                    </div>
                    <span>{isAdultStudent ? 'Mein Account & Einstellungen' : 'Elternbereich & Schutz'}</span>
                  </h2>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>
                    {isAdultStudent 
                      ? 'Verwalte deine App-Designs, Push-Benachrichtigungen, persönliche PIN, Belege und Datenschutz-Einstellungen eigenständig.' 
                      : 'Schutz- & Freigabefunktionen, Benachrichtigungen und Sicherheit für Eltern.'}
                  </p>
                </div>

                {/* 🛡️ 1-Tap Parent Area Lock Button */}
                {isMinorStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = studentId || (studentUser as any)?.id;
                      if (targetId) {
                        sessionStorage.removeItem(`groovelab_parent_session_${targetId}`);
                        sessionStorage.removeItem(`groovelab_parent_unlocked_${targetId}`);
                      }
                      sessionStorage.removeItem('groovelab_parent_unlocked_global');
                      window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: false }));
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#fef2f2',
                      border: '1.5px solid #fca5a5',
                      color: '#b91c1c',
                      padding: '10px 18px',
                      borderRadius: '16px',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)'
                    }}
                    className="hover-scale"
                    title="Elternbereich jetzt sofort sperren"
                    aria-label="Elternbereich jetzt sperren"
                  >
                    <Lock size={15} strokeWidth={2.5} />
                    <span>Bereich sperren</span>
                  </button>
                )}
              </div>

              {/* 🌟 PASSIVE ACCOUNT HERO STATUS STAGE (CAMPUS ONLY) */}
              {currentPlatform === 'campus' && !studentUser?.is_campus_active && (
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                  border: '1.5px solid #86efac',
                  borderRadius: '24px',
                  padding: '24px',
                  boxShadow: '0 8px 24px -4px rgba(34, 197, 94, 0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                      }}>
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 850, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Status: Basis-Zugang (Passiv)
                        </span>
                        <h3 style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                          Interaktives Campus-Studio für {studentUser?.first_name || 'dein Kind'} freischalten
                        </h3>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 12px',
                      borderRadius: '100px',
                      background: '#dcfce7',
                      color: '#15803d',
                      border: '1px solid #86efac',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <Sparkles size={12} color="#15803d" />
                      <span>1 Monat gratis schnuppern</span>
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
                    Stundenplan und Hausaufgabenheft sind bereits aktiv. Schalte jetzt die interaktive <strong>Audio-Loopstation</strong>, den <strong>Übe-Timer mit Streaks</strong> und die <strong>persönliche Audio-Biografie</strong> frei.
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '4px' }}>
                    <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700 }}>
                      Laufender Monat 100% kostenlos • Danach nur 0,49 € / Mo. bis zum Schuljahresende (31.08.)
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowParentActivationModal(true)}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '14px',
                        padding: '12px 22px',
                        fontSize: '0.88rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)',
                        transition: 'all 0.15s',
                        minHeight: '44px',
                        touchAction: 'manipulation'
                      }}
                      className="hover-scale"
                    >
                      <Sparkles size={16} />
                      <span>Kostenfreien Schnuppermonat starten</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 🌟 3 ERGONOMISCHE SINNABSCHNITTE: ELTERNZONE & EINSTELLUNGEN (0,1% GOLDSTANDARD) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>

                {/* 1. Geschwister-Switcher Chips (wenn mehrere Profile vorhanden) */}
                {familyProfiles && familyProfiles.length > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    overflowX: 'auto',
                    padding: '4px 2px 8px 2px',
                    WebkitOverflowScrolling: 'touch'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', whiteSpace: 'nowrap', paddingRight: '4px' }}>
                      Kind wechseln:
                    </span>
                    {familyProfiles.map((member: any) => {
                      const isCurrent = member.id === studentId;
                      const targetMember = isCurrent && !member.instrument ? { ...member, instrument: studentUser?.instrument } : member;
                      const memberAvatarUrl = resolveCampusStudentAvatar(targetMember);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            if (!isCurrent) handleSwitchFamilyStudent(member.id, true);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 14px 6px 8px',
                            borderRadius: '100px',
                            border: isCurrent ? '2px solid #0f172a' : '1.5px solid #e2e8f0',
                            background: isCurrent ? '#0f172a' : '#ffffff',
                            color: isCurrent ? '#ffffff' : '#334155',
                            cursor: isCurrent ? 'default' : 'pointer',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            boxShadow: isCurrent ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap',
                            minHeight: '40px',
                            touchAction: 'manipulation'
                          }}
                          className={!isCurrent ? "hover-scale" : ""}
                          title={isCurrent ? `${member.first_name || 'Kind'} (Aktuell ausgewählt)` : `Zu ${member.first_name || 'Kind'} wechseln`}
                        >
                          <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            background: '#f1f5f9',
                            border: `1.5px solid ${isCurrent ? '#ffffff' : '#cbd5e1'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <img src={memberAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <span>{member.first_name || member.name || 'Kind'}</span>
                          {isCurrent && (
                            <span style={{ fontSize: '0.68rem', background: '#22c55e', color: '#ffffff', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
                              Aktiv
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setIsAddSiblingModalOpen(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '100px',
                        border: '1.5px dashed #cbd5e1',
                        background: '#f8fafc',
                        color: '#64748b',
                        fontSize: '0.78rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        minHeight: '40px',
                        touchAction: 'manipulation'
                      }}
                      className="hover-scale"
                      title="Weiteres Kind per QR/PIN verknüpfen"
                    >
                      <Users size={14} />
                      <span>+ Kind koppeln</span>
                    </button>
                  </div>
                )}

                {/* 2. 1-Tap Sofortpause Banner (nur wenn aktiv als unaufdringlicher Schnellzugriff) */}
                {isCurrentlyInInstantLock && (
                  <div style={{
                    background: '#fffbeb',
                    border: '2px solid #fde68a',
                    borderRadius: '20px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    flexWrap: 'wrap',
                    boxShadow: '0 6px 20px rgba(217, 119, 6, 0.12)',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#d97706',
                        flexShrink: 0
                      }}>
                        <Coffee size={22} strokeWidth={2.4} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                            1-Tap Sofortpause („Familienzeit“)
                          </h3>
                          {instantLockUntil && (
                            <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.72rem', fontWeight: 850, padding: '2px 8px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                              Aktiv bis {new Date(instantLockUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Uhr
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 550, lineHeight: 1.35 }}>
                          Die App ist aktuell für Familienzeit pausiert. Dein Kind kann den Übe-Modus währenddessen nicht starten.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSetInstantLock(null)}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '12px',
                        background: '#d97706',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 850,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
                        minHeight: '44px',
                        touchAction: 'manipulation'
                      }}
                      className="hover-scale"
                    >
                      <RotateCcw size={15} />
                      <span>Pause jetzt aufheben</span>
                    </button>
                  </div>
                )}

                {/* ABSCHNITT 1: Schutz & Wohlbefinden */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', textAlign: 'left', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={18} color="#0284c7" />
                        <span>{isAdultStudent ? 'Schutz & App-Design' : 'Schutz & Wohlbefinden'}</span>
                      </h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        {isAdultStudent ? 'Altersstufe, Benutzeroberfläche und Login-Sicherheit' : 'Altersstufen, Bildschirmzeit-Ruhefenster und Eltern-PIN'}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', background: '#f0f9ff', padding: '3px 10px', borderRadius: '100px', border: '1px solid #bae6fd' }}>
                      Sicherheitszone
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                    gap: '16px',
                    width: '100%'
                  }}>
                    {[
                      {
                        id: 'parent_controls',
                        title: isAdultStudent ? 'App-Design & Modus' : 'Kinderschutz & Freigaben',
                        subtitle: isAdultStudent ? 'Didaktisches UI-Level & Funktionen' : 'Altersstufen & 8 didaktische Toggles',
                        badge: isAdultStudent ? 'Self-Management' : 'Altersstufe',
                        badgeBg: '#dcfce7',
                        badgeColor: '#15803d',
                        badgeBorder: '#86efac',
                        gradient: currentPlatform === 'groovelab' ? 'linear-gradient(135deg, #facc15 0%, #d97706 100%)' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        shadowColor: currentPlatform === 'groovelab' ? 'rgba(250, 204, 21, 0.40)' : 'rgba(2, 132, 199, 0.40)',
                        icon: isAdultStudent ? Compass : ShieldCheck
                      },
                      {
                        id: 'screentime',
                        title: 'Bildschirmzeit & Ruhe',
                        subtitle: bedtimeModeEnabled ? `Ruhezeit ab ${bedtimeStart} Uhr aktiv` : 'Nachtruhe, Schul-Fokus & Sofortpause',
                        badge: bedtimeModeEnabled ? 'Geschützt' : 'Ruhefenster',
                        badgeBg: bedtimeModeEnabled ? '#dcfce7' : '#f8fafc',
                        badgeColor: bedtimeModeEnabled ? '#15803d' : '#475569',
                        badgeBorder: bedtimeModeEnabled ? '#86efac' : '#e2e8f0',
                        gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                        shadowColor: 'rgba(99, 102, 241, 0.40)',
                        icon: Moon
                      },
                      {
                        id: 'security',
                        title: isAdultStudent ? 'PIN & Account-Sicherheit' : 'PIN & Eltern-Schutz',
                        subtitle: isAdultStudent
                          ? ((studentUser?.has_personal_pin || studentUser?.is_pin_activated) ? '4-stellige PIN aktiv' : '4-stellige PIN festlegen')
                          : '6-stellige Eltern-PIN & 4-stellige Schüler-PIN',
                        badge: (hasConfiguredParentPin || studentUser?.has_personal_pin || studentUser?.is_pin_activated) ? 'Geschützt' : 'PIN vergeben',
                        badgeBg: '#dcfce7',
                        badgeColor: '#15803d',
                        badgeBorder: '#86efac',
                        gradient: currentPlatform === 'groovelab' ? 'linear-gradient(135deg, #ca8a04 0%, #854d0e 100%)' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                        shadowColor: currentPlatform === 'groovelab' ? 'rgba(202, 138, 4, 0.40)' : 'rgba(22, 163, 74, 0.40)',
                        icon: Lock
                      },
                      {
                        id: 'notifications',
                        title: 'Mitteilungen & Push',
                        subtitle: pushEnabled ? 'Push-Mitteilungen auf diesem Gerät aktiv' : 'Hausaufgaben, Chat & Stundenplan-Meldungen',
                        badge: pushEnabled ? 'Aktiv' : 'Inaktiv',
                        badgeBg: pushEnabled ? '#dcfce7' : '#f1f5f9',
                        badgeColor: pushEnabled ? '#15803d' : '#64748b',
                        badgeBorder: pushEnabled ? '#86efac' : '#e2e8f0',
                        gradient: currentPlatform === 'groovelab' ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        shadowColor: currentPlatform === 'groovelab' ? 'rgba(234, 179, 8, 0.40)' : 'rgba(59, 130, 246, 0.40)',
                        icon: Bell
                      }
                    ].map((module) => {
                      const IconComp = module.icon;
                      return (
                        <div
                          key={module.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`${module.title}: ${module.subtitle}`}
                          onClick={() => handleCardClick(module.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleCardClick(module.id);
                            }
                          }}
                          style={{
                            background: '#ffffff',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '24px',
                            padding: '24px 16px 20px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                            position: 'relative',
                            touchAction: 'manipulation',
                            outline: 'none'
                          }}
                          className="hover-scale"
                        >
                          <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '16px',
                            background: module.gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '14px',
                            boxShadow: `0 8px 20px -4px ${module.shadowColor}`
                          }}>
                            <IconComp size={30} color="#ffffff" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
                          </div>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '3px 9px',
                            borderRadius: '100px',
                            background: module.badgeBg,
                            color: module.badgeColor,
                            border: `1px solid ${module.badgeBorder}`,
                            marginBottom: '10px',
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase'
                          }}>
                            {module.badge}
                          </span>
                          <h3 style={{
                            margin: '0 0 4px 0',
                            fontSize: '1.05rem',
                            fontWeight: 900,
                            color: '#0f172a',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            letterSpacing: '-0.01em'
                          }}>
                            {module.title}
                          </h3>
                          <p style={{
                            margin: 0,
                            fontSize: '0.78rem',
                            color: '#64748b',
                            fontWeight: 600,
                            lineHeight: '1.35'
                          }}>
                            {module.subtitle}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ABSCHNITT 2: Lernalltag & Einblick */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', textAlign: 'left', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BookOpen size={18} color="#16a34a" />
                        <span>Lernalltag &amp; Einblick</span>
                      </h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        Übefortschritt, Unterrichtsausfälle im Blick und Geschwisterprofile
                      </p>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', background: '#e6f4ea', padding: '3px 10px', borderRadius: '100px', border: '1px solid #bbf7d0' }}>
                      Transparenz
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                    gap: '16px',
                    width: '100%'
                  }}>
                    {[
                      {
                        id: 'practice_report',
                        title: 'Übe-Report & Insights',
                        subtitle: `${weeklyPracticeMinutes !== undefined ? weeklyPracticeMinutes : totalPracticeMinutes} Min. Übezeit diese Woche`,
                        badge: `${(studentUser?.current_streak || avatar?.streak_flame || 0) > 0 ? `${studentUser?.current_streak || avatar?.streak_flame || 0} Tage Streak` : '1 Tage Streak'}`,
                        badgeBg: '#f8fafc',
                        badgeColor: '#334155',
                        badgeBorder: '#e2e8f0',
                        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        shadowColor: 'rgba(16, 185, 129, 0.40)',
                        icon: Clock
                      },
                      {
                        id: 'cancellations',
                        title: 'Gemeldete Abwesenheiten',
                        subtitle: cancelledSchoolYearOccurrences.length > 0
                          ? `${cancelledSchoolYearOccurrences.length} Abwesenheiten gemeldet`
                          : 'Keine Abwesenheiten gemeldet',
                        badge: cancelledSchoolYearOccurrences.length > 0 ? `${cancelledSchoolYearOccurrences.length} Termine` : 'Alles regulär',
                        badgeBg: '#f8fafc',
                        badgeColor: '#334155',
                        badgeBorder: '#e2e8f0',
                        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        shadowColor: 'rgba(245, 158, 11, 0.40)',
                        icon: CalendarX
                      },
                      {
                        id: 'family_profiles',
                        title: 'Familie & Geschwister',
                        subtitle: familyProfiles.length > 1 ? `${familyProfiles.length} Profile verknüpft (1-Tap Wechsel)` : 'Geschwisterkinder & Geräteverwaltung',
                        badge: familyProfiles.length > 1 ? `${familyProfiles.length} Kinder` : 'Multi-Profil',
                        badgeBg: '#f8fafc',
                        badgeColor: '#334155',
                        badgeBorder: '#e2e8f0',
                        gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        shadowColor: 'rgba(59, 130, 246, 0.40)',
                        icon: Users
                      },
                      {
                        id: 'skills_radar',
                        title: (() => {
                          const lvl = ((draftUiLevel ?? (studentUser as any)?.campus_ui_level ?? (typeof window !== 'undefined' ? localStorage.getItem('campus_student_ui_level') : null)) || 'junior');
                          return lvl === 'junior' ? 'Musik-Stern & Raster' : (lvl === 'pro' ? 'Kompetenzen-Radar' : 'Skill-Radar & Raster');
                        })(),
                        subtitle: 'Didaktisches Entwicklungsraster (5 Säulen)',
                        badge: '5 Dimensionen',
                        badgeBg: '#f8fafc',
                        badgeColor: '#334155',
                        badgeBorder: '#e2e8f0',
                        gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                        shadowColor: 'rgba(236, 72, 153, 0.40)',
                        icon: Sparkles
                      }
                    ].map((module) => {
                      const IconComp = module.icon;
                      return (
                        <div
                          key={module.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`${module.title}: ${module.subtitle}`}
                          onClick={() => handleCardClick(module.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleCardClick(module.id);
                            }
                          }}
                          style={{
                            background: '#ffffff',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '24px',
                            padding: '24px 16px 20px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                            position: 'relative',
                            touchAction: 'manipulation',
                            outline: 'none'
                          }}
                          className="hover-scale"
                        >
                          <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '16px',
                            background: module.gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '14px',
                            boxShadow: `0 8px 20px -4px ${module.shadowColor}`
                          }}>
                            <IconComp size={30} color="#ffffff" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
                          </div>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '3px 9px',
                            borderRadius: '100px',
                            background: module.badgeBg,
                            color: module.badgeColor,
                            border: `1px solid ${module.badgeBorder}`,
                            marginBottom: '10px',
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase'
                          }}>
                            {module.badge}
                          </span>
                          <h3 style={{
                            margin: '0 0 4px 0',
                            fontSize: '1.05rem',
                            fontWeight: 900,
                            color: '#0f172a',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            letterSpacing: '-0.01em'
                          }}>
                            {module.title}
                          </h3>
                          <p style={{
                            margin: 0,
                            fontSize: '0.78rem',
                            color: '#64748b',
                            fontWeight: 600,
                            lineHeight: '1.35'
                          }}>
                            {module.subtitle}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ABSCHNITT 3: Konto & Transparenz */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', textAlign: 'left', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={18} color="#7c3aed" />
                        <span>Konto &amp; Transparenz</span>
                      </h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        Modul-Status, 0,00 € Bereitstellung, Datenschutz &amp; DSGVO-Downloads
                      </p>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', padding: '3px 10px', borderRadius: '100px', border: '1px solid #ddd6fe' }}>
                      Konto
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                    gap: '16px',
                    width: '100%'
                  }}>
                    {[
                      {
                        id: 'modules',
                        title: 'Module & Freischaltung',
                        subtitle: studentUser?.is_campus_active ? 'Campus & GrooveLab aktiv' : (currentPlatform === 'groovelab' ? 'GrooveLab aktiv' : '1 Monat gratis schnuppern'),
                        badge: (studentUser?.is_campus_active || currentPlatform === 'groovelab') ? 'Aktiv' : '1 Mo. gratis',
                        badgeBg: '#f8fafc',
                        badgeColor: '#334155',
                        badgeBorder: '#e2e8f0',
                        gradient: currentPlatform === 'groovelab' ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        shadowColor: currentPlatform === 'groovelab' ? 'rgba(234, 179, 8, 0.35)' : 'rgba(5, 150, 105, 0.40)',
                        icon: Zap
                      },
                      {
                        id: 'billing',
                        title: isAdultStudent ? 'Vertrag & Belege' : 'Belege & Bereitstellung',
                        subtitle: (studentUser as any)?.is_direct_billed ? 'Jahresbeitrag & Zahlungsbelege' : 'Von Musikschule übernommen (0,00 €)',
                        badge: (studentUser as any)?.is_direct_billed ? 'Direktabrechnung' : '0,00 € Inklusive',
                        badgeBg: '#f8fafc',
                        badgeColor: '#334155',
                        badgeBorder: '#e2e8f0',
                        gradient: currentPlatform === 'groovelab' ? 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                        shadowColor: currentPlatform === 'groovelab' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(124, 58, 237, 0.40)',
                        icon: FileText
                      },
                      {
                        id: 'downloads',
                        title: 'Datenschutz & Datentresor',
                        subtitle: 'Art. 15 Auskunft & 4 Archiv-Downloads',
                        badge: 'DSGVO konform',
                        badgeBg: '#f8fafc',
                        badgeColor: '#334155',
                        badgeBorder: '#e2e8f0',
                        gradient: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                        shadowColor: 'rgba(71, 85, 105, 0.40)',
                        icon: ShieldCheck
                      },
                      {
                        id: 'consents',
                        title: 'Einwilligungen & Medien',
                        subtitle: 'Foto-, Audio- & Video-Zustimmungen',
                        badge: 'KUG Bildnisschutz',
                        badgeBg: '#f8fafc',
                        badgeColor: '#334155',
                        badgeBorder: '#e2e8f0',
                        gradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                        shadowColor: 'rgba(13, 148, 136, 0.40)',
                        icon: Camera
                      }
                    ].map((module) => {
                      const IconComp = module.icon;
                      return (
                        <div
                          key={module.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`${module.title}: ${module.subtitle}`}
                          onClick={() => handleCardClick(module.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleCardClick(module.id);
                            }
                          }}
                          style={{
                            background: '#ffffff',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '24px',
                            padding: '24px 16px 20px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                            position: 'relative',
                            touchAction: 'manipulation',
                            outline: 'none'
                          }}
                          className="hover-scale"
                        >
                          <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '16px',
                            background: module.gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '14px',
                            boxShadow: `0 8px 20px -4px ${module.shadowColor}`
                          }}>
                            <IconComp size={30} color="#ffffff" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
                          </div>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '3px 9px',
                            borderRadius: '100px',
                            background: module.badgeBg,
                            color: module.badgeColor,
                            border: `1px solid ${module.badgeBorder}`,
                            marginBottom: '10px',
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase'
                          }}>
                            {module.badge}
                          </span>
                          <h3 style={{
                            margin: '0 0 4px 0',
                            fontSize: '1.05rem',
                            fontWeight: 900,
                            color: '#0f172a',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            letterSpacing: '-0.01em'
                          }}>
                            {module.title}
                          </h3>
                          <p style={{
                            margin: 0,
                            fontSize: '0.78rem',
                            color: '#64748b',
                            fontWeight: 600,
                            lineHeight: '1.35'
                          }}>
                            {module.subtitle}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* KOMPAKTE SERVICE-LEISTE: Mitteilungen & Direkter Feedback-Kanal */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: '#f8fafc',
                  padding: '14px 20px',
                  borderRadius: '18px',
                  border: '1.5px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b'
                    }}>
                      <Settings size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#0f172a' }}>
                        Service &amp; Mitteilungen
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 550 }}>
                        Push-Kanäle anpassen oder Ideen direkt an unser Team senden.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHubSubTab('notifications');
                        handleOpenSettingsModule('billing_and_legal');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '8px 14px',
                        borderRadius: '12px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        color: '#334155',
                        fontSize: '0.80rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                      className="hover-scale"
                    >
                      <Bell size={15} color="#3b82f6" />
                      <span>Mitteilungen {pushEnabled ? '(Aktiv)' : ''}</span>
                    </button>

                    <a
                      href="mailto:kontakt@campus-groovelab.de?subject=Feedback%20Elternbereich"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '8px 14px',
                        borderRadius: '12px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        color: '#334155',
                        fontSize: '0.80rem',
                        fontWeight: 800,
                        textDecoration: 'none',
                        cursor: 'pointer'
                      }}
                      className="hover-scale"
                    >
                      <Lightbulb size={15} color="#ca8a04" />
                      <span>Feedback &amp; Ideen</span>
                    </a>
                  </div>
                </div>

              </div>

            {/* PERSISTENT STATUS BAR */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 28px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              borderRadius: '20px',
              marginTop: '8px'
            }}>
              <span style={{ fontSize: '0.82rem', color: currentPlatform === 'groovelab' ? '#ca8a04' : '#34a853', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✓ Alle Einstellungen synchronisiert.
              </span>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                Änderungen werden sofort wirksam und gesichert.
              </span>
            </div>

            {/* QUICK LINK: HANDBUCH & AKADEMIE */}
            <div style={{ 
              background: currentPlatform === 'groovelab' ? '#fefce8' : '#f0fdf4', 
              borderRadius: '20px', 
              padding: '18px 24px', 
              border: `1.5px solid ${currentPlatform === 'groovelab' ? '#fef08a' : '#bbf7d0'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '12px', 
                  background: currentPlatform === 'groovelab' ? '#eab308' : '#34a853', 
                  color: currentPlatform === 'groovelab' ? '#0f172a' : '#ffffff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <BookOpen size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: currentPlatform === 'groovelab' ? '#713f12' : '#14532d' }}>
                    Campus-Hilfe &amp; Akademie für Schüler &amp; Eltern
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: currentPlatform === 'groovelab' ? '#854d0e' : '#166534' }}>
                    So nutzt du dein digitales Aufgabenheft, den Übe-Timer, Streaks und die Loopstation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpCenterOpen(true)}
                style={{
                  background: currentPlatform === 'groovelab' ? '#eab308' : '#34a853',
                  color: currentPlatform === 'groovelab' ? '#0f172a' : '#ffffff',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: currentPlatform === 'groovelab' ? '0 4px 12px rgba(234, 179, 8, 0.25)' : '0 4px 12px rgba(52, 168, 83, 0.25)',
                  transition: 'all 0.15s'
                }}
                className="hover-scale"
              >
                <BookOpen size={14} /> Leitfäden öffnen
              </button>
            </div>

            {/* PARENT GATEKEEPER MODAL (6-Digit Parent Master PIN) */}
            {renderParentGateModal()}

            {/* FOCUS MODAL */}
            {activeStudentSettingsModal && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 25000,
                  background: isMobile ? '#ffffff' : 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: isMobile ? 'none' : 'blur(8px)',
                  WebkitBackdropFilter: isMobile ? 'none' : 'blur(8px)',
                  display: 'flex',
                  alignItems: isMobile ? 'stretch' : 'center',
                  justifyContent: 'center',
                  padding: isMobile ? 0 : '20px'
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    handleCloseSettingsModal();
                  }
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: isMobile ? 0 : '24px',
                    width: '100%',
                    maxWidth: isMobile ? '100vw' : (isBillingHub ? '920px' : '760px'),
                    height: isMobile ? '100dvh' : 'auto',
                    maxHeight: isMobile ? '100dvh' : '88vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: isMobile ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: isMobile ? 'none' : '1px solid #e2e8f0',
                    overflow: 'hidden'
                  }}
                  className={isMobile ? "mobile-modal-shell" : "animation-slide-up"}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div style={{
                    padding: isMobile ? 'max(10px, env(safe-area-inset-top, 10px)) 16px 12px 16px' : '20px 24px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f8fafc',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    flexShrink: 0
                  }}>
                    {isMobile ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={handleCloseSettingsModal}
                          style={{
                            minHeight: '44px',
                            minWidth: '44px',
                            padding: '6px 12px',
                            borderRadius: '12px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            color: '#0f172a',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                          }}
                          className="hover-scale"
                          title="Zurück zur Übersicht"
                        >
                          <ChevronLeft size={20} />
                          <span>Zurück</span>
                        </button>

                        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                          <h3 style={{
                            margin: 0,
                            fontSize: '0.96rem',
                            fontWeight: 900,
                            color: '#0f172a',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {isProtectionHub && (isAdultStudent ? 'App & Sicherheit' : 'Kinderschutz & Sicherheit')}
                            {isLearningHub && 'Lernalltag & Einblick'}
                            {isFamilyHub && 'Familie & Geräte'}
                            {isBillingHub && (isAdultStudent ? 'Vertrag & Datenschutz' : 'Bereitstellung & Datenschutz')}
                            {!isProtectionHub && !isLearningHub && !isFamilyHub && !isBillingHub && (
                              activeStudentSettingsModal === 'modules' ? 'Module' : 'Einstellungen'
                            )}
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={handleCloseSettingsModal}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#64748b',
                            flexShrink: 0
                          }}
                          className="hover-scale"
                          title="Schließen"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: isProtectionHub
                              ? (currentPlatform === 'groovelab' ? 'linear-gradient(135deg, #facc15 0%, #d97706 100%)' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)')
                              : isLearningHub
                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                              : isFamilyHub
                              ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                              : 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                          }}>
                            {isProtectionHub && (isAdultStudent ? <Compass size={20} color="#ffffff" /> : <ShieldCheck size={20} color="#ffffff" />)}
                            {isLearningHub && <BookOpen size={20} color="#ffffff" />}
                            {isFamilyHub && <Users size={20} color="#ffffff" />}
                            {isBillingHub && <FileText size={20} color="#ffffff" />}
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              {isProtectionHub && (isAdultStudent ? 'App-Design & Sicherheit' : 'Kinderschutz & Sicherheit')}
                              {isLearningHub && 'Lernalltag & Einblick'}
                              {isFamilyHub && 'Familie & Geräte'}
                              {isBillingHub && (isAdultStudent ? 'Vertrag, Belege & Datenschutz' : 'Bereitstellung, Belege & Datenschutz')}
                            </h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                              {isProtectionHub && (isAdultStudent ? 'Altersstufe, didaktische Freigaben und persönliche PIN.' : 'Altersstufen-Standards, Bildschirmzeit, Ruhefenster & Eltern-PIN.')}
                              {isLearningHub && 'Wöchentliche Übezeit, didaktisches 5-Säulen Entwicklungsraster & Abwesenheiten.'}
                              {isFamilyHub && 'Geschwisterkinder per 1-Tap wechseln, neues Kind hinzufügen und Geräte verwalten.'}
                              {isBillingHub && (isAdultStudent ? 'Vertragsübersicht, amtliche Belege, Push-Kanäle und DSGVO-Datentresor.' : '0,00 € Bereitstellung, amtliche Bestätigung, Push-Kanäle und DSGVO-Datentresor.')}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isParentUnlocked && !isAdultStudent && (
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  sessionStorage.removeItem('groovelab_parent_unlocked_global');
                                  if (studentId) {
                                    sessionStorage.removeItem(`groovelab_parent_unlocked_${studentId}`);
                                    sessionStorage.removeItem(`groovelab_parent_session_${studentId}`);
                                  }
                                  window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: false }));
                                } catch (e) {}
                                handleCloseSettingsModal();
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#fef2f2',
                                border: '1.5px solid #fecaca',
                                borderRadius: '12px',
                                padding: '8px 12px',
                                minHeight: '44px',
                                color: '#b91c1c',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                touchAction: 'manipulation'
                              }}
                              className="hover-scale"
                              title="Elternbereich sofort sperren &amp; Session beenden"
                              aria-label="Elternbereich sofort sperren und Session beenden"
                            >
                              <Lock size={15} />
                              <span>Sperren</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              handleCloseSettingsModal();
                            }}
                            style={{
                              background: '#f1f5f9',
                              border: 'none',
                              borderRadius: '50%',
                              width: '44px',
                              height: '44px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#64748b',
                              touchAction: 'manipulation'
                            }}
                            className="hover-scale"
                            title="Schließen"
                            aria-label="Fenster schließen"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* WAI-ARIA SUBTAB-LEISTE FÜR MULTI-TAB HUBS */}
                  {isProtectionHub && (
                    <div
                      role="tablist"
                      aria-label="Kinderschutz-Untermenü"
                      style={{
                        padding: isMobile ? '8px 14px 10px 14px' : '10px 24px 12px 24px',
                        background: '#f8fafc',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        flexShrink: 0
                      }}
                    >
                      {[
                        { id: 'parent_controls', label: isAdultStudent ? 'Altersstufe & Design' : 'Didaktik & Freigaben', icon: ShieldCheck },
                        { id: 'screentime', label: 'Bildschirmzeit & Ruhe', icon: Moon },
                        { id: 'security', label: isAdultStudent ? 'Persönliche PIN' : 'PIN & Passkey', icon: Lock }
                      ].map(tab => {
                        const isSelected = effectiveProtectionSubTab === tab.id;
                        const TabIcon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            tabIndex={0}
                            onClick={() => setActiveHubSubTab(tab.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setActiveHubSubTab(tab.id);
                              }
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '7px 14px',
                              borderRadius: '12px',
                              border: isSelected ? '1px solid #cbd5e1' : '1px solid transparent',
                              background: isSelected ? '#ffffff' : 'transparent',
                              color: isSelected ? '#0f172a' : '#64748b',
                              fontWeight: isSelected ? 850 : 650,
                              fontSize: '0.80rem',
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                              whiteSpace: 'nowrap',
                              minHeight: '38px',
                              touchAction: 'manipulation',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover-scale"
                          >
                            <TabIcon size={14} color={isSelected ? (currentPlatform === 'groovelab' ? '#ca8a04' : '#0284c7') : '#64748b'} />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {isLearningHub && (
                    <div
                      role="tablist"
                      aria-label="Lernalltag-Untermenü"
                      style={{
                        padding: isMobile ? '8px 14px 10px 14px' : '10px 24px 12px 24px',
                        background: '#f8fafc',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        flexShrink: 0
                      }}
                    >
                      {[
                        { id: 'practice_report', label: 'Übe-Report & Streak', icon: Clock },
                        { id: 'skills_radar', label: draftUiLevel === 'junior' ? 'Musik-Stern (5 Säulen)' : 'Entwicklungsraster', icon: Sparkles },
                        { id: 'cancellations', label: 'Abwesenheiten', icon: CalendarX }
                      ].map(tab => {
                        const isSelected = effectiveLearningSubTab === tab.id;
                        const TabIcon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            tabIndex={0}
                            onClick={() => setActiveHubSubTab(tab.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setActiveHubSubTab(tab.id);
                              }
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '7px 14px',
                              borderRadius: '12px',
                              border: isSelected ? '1px solid #cbd5e1' : '1px solid transparent',
                              background: isSelected ? '#ffffff' : 'transparent',
                              color: isSelected ? '#0f172a' : '#64748b',
                              fontWeight: isSelected ? 850 : 650,
                              fontSize: '0.80rem',
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                              whiteSpace: 'nowrap',
                              minHeight: '38px',
                              touchAction: 'manipulation',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover-scale"
                          >
                            <TabIcon size={14} color={isSelected ? '#15803d' : '#64748b'} />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {isBillingHub && (
                    <div
                      role="tablist"
                      aria-label="Vertrag-Untermenü"
                      style={{
                        padding: isMobile ? '8px 14px 10px 14px' : '10px 24px 12px 24px',
                        background: '#f8fafc',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        flexShrink: 0
                      }}
                    >
                      {[
                        { id: 'billing', label: isAdultStudent ? 'Vertrag & Belege' : 'Bereitstellung & Belege', icon: FileText },
                        { id: 'notifications', label: 'Mitteilungen & Push', icon: Bell },
                        { id: 'consents', label: 'Einwilligungen', icon: Camera },
                        { id: 'downloads', label: 'DSGVO & Datentresor', icon: Download }
                      ].map(tab => {
                        const isSelected = effectiveBillingSubTab === tab.id;
                        const TabIcon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            tabIndex={0}
                            onClick={() => setActiveHubSubTab(tab.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setActiveHubSubTab(tab.id);
                              }
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '7px 14px',
                              borderRadius: '12px',
                              border: isSelected ? '1px solid #cbd5e1' : '1px solid transparent',
                              background: isSelected ? '#ffffff' : 'transparent',
                              color: isSelected ? '#0f172a' : '#64748b',
                              fontWeight: isSelected ? 850 : 650,
                              fontSize: '0.80rem',
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                              whiteSpace: 'nowrap',
                              minHeight: '38px',
                              touchAction: 'manipulation',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover-scale"
                          >
                            <TabIcon size={14} color={isSelected ? '#6d28d9' : '#64748b'} />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Modal Body */}
                  <div
                    style={{
                      padding: isMobile ? '16px 14px calc(88px + env(safe-area-inset-bottom, 24px)) 14px' : '24px',
                      overflowY: 'auto',
                      overscrollBehaviorY: 'contain',
                      WebkitOverflowScrolling: 'touch',
                      touchAction: 'pan-y',
                      flex: isMobile ? '1 1 0%' : 1,
                      minHeight: 0,
                      maxHeight: '100%',
                      textAlign: 'left'
                    }}
                    className={isMobile ? "mobile-scroll-container" : ""}
                  >
                    {(activeStudentSettingsModal === 'parent_controls' || (isProtectionHub && effectiveProtectionSubTab === 'parent_controls')) && (
                      <ParentProtectionSettingsView
                        studentUser={studentUser}
                        studentId={studentId}
                        isAdultStudent={isAdultStudent}
                        draftUiLevel={draftUiLevel}
                        draftAllowAbsences={draftAllowAbsences}
                        draftAllowReschedule={draftAllowReschedule}
                        draftAllowChat={draftAllowChat}
                        draftAllowTimer={draftAllowTimer}
                        draftAllowLeaderboard={draftAllowLeaderboard}
                        draftAllowProposals={draftAllowProposals}
                        draftAllowAudio={draftAllowAudio}
                        draftAllowTts={draftAllowTts}
                        draftBoardOverrides={draftBoardOverrides}
                        applyAndSaveParentControls={applyAndSaveParentControls}
                        recentlyChangedDiff={recentlyChangedDiff}
                        setRecentlyChangedDiff={setRecentlyChangedDiff}
                        cancelledSchoolYearOccurrences={cancelledSchoolYearOccurrences}
                        scheduleOccurrences={scheduleOccurrences}
                        onLockSession={props.lockParentSession}
                        parentSessionSecondsRemaining={props.parentLockRemainingSeconds}
                      />
                    )}

                    {(activeStudentSettingsModal === 'screentime' || (isProtectionHub && effectiveProtectionSubTab === 'screentime')) && (() => {
                      const currentLvlKey = ((draftUiLevel ?? (studentUser as any)?.campus_ui_level ?? (typeof window !== 'undefined' ? localStorage.getItem('campus_student_ui_level') : null)) || 'junior') as 'junior' | 'teen' | 'pro';
                      return (
                        <ParentScreenTimeSettingsView
                          currentLvlKey={currentLvlKey}
                          bedtimeModeEnabled={bedtimeModeEnabled}
                          bedtimeStart={bedtimeStart}
                          bedtimeEnd={bedtimeEnd}
                          handleUpdateBedtime={handleUpdateBedtime}
                          daytimeLockEnabled={daytimeLockEnabled}
                          daytimeLockStart={daytimeLockStart}
                          daytimeLockEnd={daytimeLockEnd}
                          daytimeLockDays={daytimeLockDays}
                          handleUpdateDaytimeLock={handleUpdateDaytimeLock}
                          instantLockUntil={instantLockUntil}
                          isCurrentlyInInstantLock={isCurrentlyInInstantLock}
                          handleSetInstantLock={handleSetInstantLock}
                        />
                      );
                    })()}

                    {(activeStudentSettingsModal === 'practice_report' || (isLearningHub && effectiveLearningSubTab === 'practice_report')) && (() => {
                      const currentLvlKey = ((draftUiLevel ?? (studentUser as any)?.campus_ui_level ?? (typeof window !== 'undefined' ? localStorage.getItem('campus_student_ui_level') : null)) || 'junior') as 'junior' | 'teen' | 'pro';
                      return (
                        <ParentPracticeReportSettingsView
                          currentLvlKey={currentLvlKey}
                          totalPracticeMinutes={totalPracticeMinutes}
                          weeklyPracticeMinutes={weeklyPracticeMinutes}
                          schoolYearPracticeMinutes={schoolYearPracticeMinutes}
                          avatar={avatar}
                          studentUser={studentUser}
                          getTargetMinutes={getTargetMinutes}
                        />
                      );
                    })()}

                    {(activeStudentSettingsModal === 'cancellations' || (isLearningHub && effectiveLearningSubTab === 'cancellations')) && (
                      <ParentCancellationLogSettingsView
                        cancelledSchoolYearOccurrences={cancelledSchoolYearOccurrences}
                        handleUndoCancelOccurrence={handleUndoCancelOccurrence}
                      />
                    )}

                    {(activeStudentSettingsModal === 'family_profiles' || isFamilyHub) && (
                      <ParentFamilyProfilesSettingsView
                        familyProfiles={familyProfiles}
                        studentId={studentId}
                        studentUser={studentUser}
                        handleSwitchFamilyStudent={handleSwitchFamilyStudent}
                        handleRemoveFamilyProfile={handleRemoveFamilyProfile}
                        setIsAddSiblingModalOpen={setIsAddSiblingModalOpen}
                      />
                    )}

                    {(activeStudentSettingsModal === 'skills_radar' || (isLearningHub && effectiveLearningSubTab === 'skills_radar')) && (() => {
                      const currentLvlKey = ((draftUiLevel ?? (studentUser as any)?.campus_ui_level ?? (typeof window !== 'undefined' ? localStorage.getItem('campus_student_ui_level') : null)) || 'junior') as 'junior' | 'teen' | 'pro';
                      return (
                        <ParentDevelopmentGridSettingsView
                          currentLvlKey={currentLvlKey}
                          studentUser={studentUser}
                          studentId={studentId}
                          instrumentName={avatar?.instrument}
                        />
                      );
                    })()}

                    {(activeStudentSettingsModal === 'notifications' || (isBillingHub && effectiveBillingSubTab === 'notifications')) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Push-Benachrichtigungen Haupt-Toggle */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', transition: 'all 0.2s', opacity: isPremiumUser ? 1 : 0.6 }}>
                            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                              <div style={{ padding: '10px', borderRadius: '12px', background: pushEnabled ? '#34a85315' : '#f1f5f9', color: pushEnabled ? '#34a853' : '#94a3b8', display: 'flex', transition: 'all 0.2s' }}>
                                <Bell size={18} />
                              </div>
                              <div>
                                <h4 style={{ margin: '0 0 2px 0', fontSize: '0.875rem', fontWeight: 800, color: '#1e293b' }}>Push-Benachrichtigungen aktivieren</h4>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Erlaube der App, dir wichtige Mitteilungen auf dein Handy zu schicken.</p>
                              </div>
                            </div>
                            
                            {isPremiumUser ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {pushEnabled && (
                                  <button
                                    type="button"
                                    onClick={() => setShowPushSoftPrompt(true)}
                                    style={{
                                      background: '#f1f5f9',
                                      color: '#0f172a',
                                      border: 'none',
                                      borderRadius: '100px',
                                      padding: '6px 14px',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      transition: 'background 0.2s'
                                    }}
                                  >
                                    Anpassen
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!pushEnabled) {
                                      setShowPushSoftPrompt(true);
                                    } else {
                                      const success = await unsubscribeUserFromPush(studentId);
                                      if (!success) {
                                        alert('Fehler beim Deaktivieren der Push-Benachrichtigungen.');
                                      } else {
                                        setPushEnabled(false);
                                      }
                                    }
                                  }}
                                  className={`app-binary-switch ${pushEnabled ? 'active' : ''}`}
                                  style={{ backgroundColor: pushEnabled ? '#34a853' : undefined }}
                                >
                                  <div className="app-binary-switch-knob" />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fee2e2', color: '#ef4444', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800 }}>
                                <Lock size={12} strokeWidth={2.5} aria-hidden="true" />
                                <span>Nur für aktive Schüler</span>
                              </div>
                            )}
                          </div>

                          {!isPremiumUser && (
                            <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: '4px 0 0 0', fontWeight: 700 }}>
                              * Dein Account muss in der Verwaltung aktiv geschaltet sein, um diese Echtzeit-Funktion nutzen zu können.
                            </p>
                          )}

                          {/* iOS Helper Alert */}
                          {isIOS && !isStandalone && (
                            <div style={{
                              padding: '12px 16px',
                              background: '#fffbeb',
                              border: '1px solid #fef3c7',
                              borderRadius: '16px',
                              fontSize: '0.75rem',
                              color: '#b45309',
                              lineHeight: '1.4',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px'
                            }}>
                              <Lightbulb size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} aria-hidden="true" />
                              <div>
                                <strong>iOS / iPhone Info:</strong> Um Benachrichtigungen auf Apple-Geräten zu aktivieren, musst du die App zuerst auf deinem Homescreen installieren: Tippe im Safari-Browser auf das <strong>Teilen-Symbol (Box mit Pfeil nach oben)</strong> und wähle <strong>"Zum Home-Bildschirm"</strong>. Öffne <CampusGroovelabText campusColor="#34a853" groovelabColor="#eab308" fontWeight={750} /> danach über das neue App-Icon auf deinem Homescreen.
                              </div>
                            </div>
                          )}

                          {/* The 5 Modular Granular Push Channels */}
                          {pushEnabled && isPremiumUser && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 850, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                                Spezifische Benachrichtigungs-Kanäle
                              </div>
                              {[
                                { k: 'changes', label: 'Termin- & Stundenplanänderungen', desc: 'Sofortige Alerts bei Raumwechseln, Vertretungen oder Ausfällen.', val: pushNotifScheduleChanges, setter: setPushNotifScheduleChanges, dbKey: 'push_notif_schedule_changes', icon: <Calendar size={18} /> },
                                { k: 'homework', label: 'Hausaufgaben & Lehrer-Feedback', desc: 'Benachrichtigung, sobald deine Lehrkraft neue Aufgaben notiert hat.', val: pushNotifHomework, setter: setPushNotifHomework, dbKey: 'push_notif_homework', icon: <Pencil size={18} /> },
                                { k: 'chat', label: 'Direktnachrichten & Chat', desc: 'Sofort-Mitteilung bei neuen Antworten von deiner Lehrkraft oder Musikschule.', val: pushNotifChat, setter: setPushNotifChat, dbKey: 'push_notif_chat', icon: <Mail size={18} /> },
                                { k: 'practice', label: 'Übe-Erinnerung & Streak-Schutz', desc: 'Sanfter Reminder am Nachmittag, um die tägliche Übe-Serie zu halten.', val: pushNotifPracticeReminder, setter: setPushNotifPracticeReminder, dbKey: 'push_notif_practice_reminder', icon: <Zap size={18} /> },
                                { k: 'digest', label: 'Wöchentlicher Übe-Rückblick', desc: 'Sonntags-Digest mit gesammelten Übe-Minuten und Meilensteinen.', val: pushNotifWeeklyDigest, setter: setPushNotifWeeklyDigest, dbKey: 'push_notif_weekly_digest', icon: <Trophy size={18} /> }
                              ].map((row) => (
                                <div key={row.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', transition: 'all 0.2s' }}>
                                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                    <div style={{ padding: '10px', borderRadius: '12px', background: row.val ? '#34a85315' : '#f1f5f9', color: row.val ? '#34a853' : '#94a3b8', display: 'flex', transition: 'all 0.2s' }}>
                                      {row.icon}
                                    </div>
                                    <div>
                                      <h4 style={{ margin: '0 0 2px 0', fontSize: '0.875rem', fontWeight: 800, color: '#1e293b' }}>{row.label}</h4>
                                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{row.desc}</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const nextVal = !row.val;
                                      row.setter(nextVal);
                                      try {
                                        await supabase.from('users').update({ [row.dbKey]: nextVal }).eq('id', studentId);
                                      } catch (err) {
                                        console.warn('[NotificationSettings] Failed to save push preference:', err);
                                      }
                                    }}
                                    className={`app-binary-switch ${row.val ? 'active' : ''}`}
                                    style={{ backgroundColor: row.val ? '#34a853' : undefined }}
                                  >
                                    <div className="app-binary-switch-knob" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* System-Cache leeren (Hilfe & Diagnose) */}
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                          <h3 style={{ fontSize: '0.90rem', fontWeight: 850, color: '#64748b', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RotateCcw size={15} color="#64748b" /> App-Cache &amp; Diagnose
                          </h3>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '12px', fontWeight: 550, lineHeight: '1.4' }}>
                            Wenn die App nicht korrekt lädt oder alte Daten anzeigt, kannst du hier den lokalen Speicher bereinigen.
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm('Möchtest du wirklich den lokalen Cache-Speicher leeren? Deine Anmeldung bleibt dabei vollständig erhalten.')) {
                                try {
                                  if ('caches' in window) {
                                    const keys = await caches.keys();
                                    await Promise.all(keys.map(key => caches.delete(key)));
                                  }
                                } catch (e) {
                                  console.warn('Could not clear PWA cache:', e);
                                }
                                localStorage.removeItem('groovelab_active_practice_session');
                                localStorage.removeItem('student_lehrwerke_progress');
                                localStorage.removeItem('groovelab_offline_user_cache');
                                localStorage.removeItem('groovelab_cached_schools');
                                localStorage.removeItem('groovelab_cached_user');
                                window.location.reload();
                              }
                            }}
                            style={{
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                            className="hover-scale"
                          >
                            <RotateCcw size={14} /> Lokalen Cache leeren
                          </button>
                        </div>
                      </div>
                    )}

                    {(activeStudentSettingsModal === 'security' || (isProtectionHub && effectiveProtectionSubTab === 'security')) && (() => {
                      const isParentTarget = securityPinTarget === 'parent' && !isAdultStudent;
                      const targetPinLength = isParentTarget ? 6 : 4;
                      const isFilledComplete = pinFormNew.length === targetPinLength && pinFormConfirm.length === targetPinLength;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '440px', margin: '0 auto', width: '100%' }}>
                          {/* Segmented Tab Switcher: Schüler-PIN (4-stellig) vs. Eltern-PIN (6-stellig) */}
                          {!isAdultStudent && (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '6px',
                              background: '#e2e8f0',
                              padding: '4px',
                              borderRadius: '16px'
                            }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSecurityPinTarget('student');
                                  setPinFormNew('');
                                  setPinFormConfirm('');
                                  setPinFormError('');
                                  setPinFormSuccess('');
                                  setFirstPinActiveField('new');
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  padding: '10px 12px',
                                  borderRadius: '12px',
                                  border: 'none',
                                  background: securityPinTarget === 'student' ? '#ffffff' : 'transparent',
                                  color: securityPinTarget === 'student' ? '#15803d' : '#64748b',
                                  fontWeight: securityPinTarget === 'student' ? 850 : 650,
                                  fontSize: '0.82rem',
                                  cursor: 'pointer',
                                  boxShadow: securityPinTarget === 'student' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                                className="hover-scale"
                              >
                                <Shield size={16} color={securityPinTarget === 'student' ? '#15803d' : '#64748b'} />
                                <span>Schüler-PIN (4-stellig)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSecurityPinTarget('parent');
                                  setPinFormNew('');
                                  setPinFormConfirm('');
                                  setPinFormError('');
                                  setPinFormSuccess('');
                                  setFirstPinActiveField('new');
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  padding: '10px 12px',
                                  borderRadius: '12px',
                                  border: 'none',
                                  background: securityPinTarget === 'parent' ? '#ffffff' : 'transparent',
                                  color: securityPinTarget === 'parent' ? '#0284c7' : '#64748b',
                                  fontWeight: securityPinTarget === 'parent' ? 850 : 650,
                                  fontSize: '0.82rem',
                                  cursor: 'pointer',
                                  boxShadow: securityPinTarget === 'parent' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                                className="hover-scale"
                              >
                                <Lock size={16} color={securityPinTarget === 'parent' ? '#0284c7' : '#64748b'} />
                                <span>Eltern-PIN (6-stellig)</span>
                              </button>
                            </div>
                          )}

                          <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '24px',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ 
                                padding: '10px', 
                                borderRadius: '12px', 
                                background: isParentTarget ? '#e0f2fe' : '#e6f4ea', 
                                color: isParentTarget ? '#0284c7' : '#34a853' 
                              }}>
                                {isParentTarget ? <Lock size={20} /> : <Shield size={20} />}
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                                  {isAdultStudent 
                                    ? 'Persönliche 4-stellige PIN festlegen' 
                                    : (isParentTarget ? '6-stellige Eltern-PIN festlegen' : '4-stellige Schüler-PIN festlegen')}
                                </h4>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                  {isAdultStudent 
                                    ? 'Schützt deinen Stundenplan und dein persönliches Konto.' 
                                    : (isParentTarget 
                                        ? 'Schützt das Eltern-Kontrollzentrum, Board-Freigaben und Ruhezeiten vor deinem Kind.' 
                                        : 'Schützt den Stundenplan und das persönliche Profil deines Kindes auf geteilten Geräten.')}
                                </p>
                              </div>
                            </div>

                            {pinFormError && (
                              <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '12px', color: '#dc2626', fontSize: '0.8rem', fontWeight: 700 }}>
                                {pinFormError}
                              </div>
                            )}

                            {pinFormSuccess && (
                              <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', color: '#166534', fontSize: '0.8rem', fontWeight: 700 }}>
                                {pinFormSuccess}
                              </div>
                            )}

                            {/* Field 1: Neue PIN */}
                            <div 
                              onClick={() => setFirstPinActiveField('new')}
                              style={{
                                padding: '12px 14px',
                                borderRadius: '16px',
                                border: firstPinActiveField === 'new' 
                                  ? (isParentTarget ? '2px solid #0284c7' : '2px solid #15803d') 
                                  : '1.5px solid #e2e8f0',
                                background: firstPinActiveField === 'new' 
                                  ? (isParentTarget ? '#f0f9ff' : '#f0fdf4') 
                                  : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                textAlign: 'left'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ 
                                  fontSize: '0.72rem', 
                                  fontWeight: 800, 
                                  color: firstPinActiveField === 'new' 
                                    ? (isParentTarget ? '#0284c7' : '#15803d') 
                                    : '#64748b', 
                                  textTransform: 'uppercase', 
                                  letterSpacing: '0.04em' 
                                }}>
                                  1. Neue {targetPinLength}-stellige {isParentTarget ? 'Eltern-PIN' : 'PIN'}
                                </span>
                                {pinFormNew.length === targetPinLength && (
                                  <span style={{ 
                                    fontSize: '0.7rem', 
                                    fontWeight: 800, 
                                    color: isParentTarget ? '#0284c7' : '#15803d', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '3px' 
                                  }}>
                                    <Check size={13} strokeWidth={3} /> {targetPinLength} Ziffern
                                  </span>
                                )}
                              </div>

                              {/* Dots / Numbers Display */}
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                gap: isParentTarget ? '8px' : '14px', 
                                padding: '4px 0' 
                              }}>
                                {Array.from({ length: targetPinLength }).map((_, idx) => {
                                  const char = pinFormNew[idx];
                                  const isFilled = Boolean(char);
                                  const activeColor = isParentTarget ? '#0284c7' : '#15803d';
                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        width: isParentTarget ? '38px' : '42px',
                                        height: isParentTarget ? '44px' : '46px',
                                        borderRadius: '12px',
                                        border: isFilled 
                                          ? `2px solid ${activeColor}` 
                                          : (firstPinActiveField === 'new' && pinFormNew.length === idx ? '2px solid #3b82f6' : '1.5px solid #cbd5e1'),
                                        background: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.25rem',
                                        fontWeight: 900,
                                        color: '#0f172a',
                                        boxShadow: isFilled ? `0 2px 6px ${activeColor}25` : 'none',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      {isFilled ? (firstPinShowMask ? char : '●') : ''}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Field 2: PIN Bestätigen */}
                            <div 
                              onClick={() => setFirstPinActiveField('confirm')}
                              style={{
                                padding: '12px 14px',
                                borderRadius: '16px',
                                border: firstPinActiveField === 'confirm' 
                                  ? (isParentTarget ? '2px solid #0284c7' : '2px solid #15803d') 
                                  : '1.5px solid #e2e8f0',
                                background: firstPinActiveField === 'confirm' 
                                  ? (isParentTarget ? '#f0f9ff' : '#f0fdf4') 
                                  : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                textAlign: 'left'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ 
                                  fontSize: '0.72rem', 
                                  fontWeight: 800, 
                                  color: firstPinActiveField === 'confirm' 
                                    ? (isParentTarget ? '#0284c7' : '#15803d') 
                                    : '#64748b', 
                                  textTransform: 'uppercase', 
                                  letterSpacing: '0.04em' 
                                }}>
                                  2. {targetPinLength}-stellige PIN wiederholen
                                </span>
                                {pinFormConfirm.length === targetPinLength && (
                                  pinFormNew === pinFormConfirm ? (
                                    <span style={{ 
                                      fontSize: '0.7rem', 
                                      fontWeight: 800, 
                                      color: isParentTarget ? '#0284c7' : '#15803d', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '3px' 
                                    }}>
                                      <CheckCheck size={14} strokeWidth={2.5} /> Stimmt überein
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#dc2626' }}>
                                      Stimmt nicht überein
                                    </span>
                                  )
                                )}
                              </div>

                              {/* Dots / Numbers Display */}
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                gap: isParentTarget ? '8px' : '14px', 
                                padding: '4px 0' 
                              }}>
                                {Array.from({ length: targetPinLength }).map((_, idx) => {
                                  const char = pinFormConfirm[idx];
                                  const isFilled = Boolean(char);
                                  const activeColor = isParentTarget ? '#0284c7' : '#15803d';
                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        width: isParentTarget ? '38px' : '42px',
                                        height: isParentTarget ? '44px' : '46px',
                                        borderRadius: '12px',
                                        border: isFilled 
                                          ? (pinFormNew === pinFormConfirm && pinFormConfirm.length === targetPinLength ? `2px solid ${activeColor}` : '2px solid #64748b') 
                                          : (firstPinActiveField === 'confirm' && pinFormConfirm.length === idx ? '2px solid #3b82f6' : '1.5px solid #cbd5e1'),
                                        background: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.25rem',
                                        fontWeight: 900,
                                        color: '#0f172a',
                                        boxShadow: isFilled ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      {isFilled ? (firstPinShowMask ? char : '●') : ''}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Toggle show/hide numbers */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', margin: '-4px 0 0 0' }}>
                              <button
                                type="button"
                                onClick={() => setFirstPinShowMask(!firstPinShowMask)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#64748b',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '2px 4px'
                                }}
                              >
                                {firstPinShowMask ? <EyeOff size={14} /> : <Eye size={14} />}
                                <span>{firstPinShowMask ? 'Ziffern verbergen' : 'Ziffern anzeigen'}</span>
                              </button>
                            </div>

                            {/* On-Screen Touch Keypad */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '8px',
                              width: '100%',
                              marginTop: '4px'
                            }}>
                              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'back'].map((key) => {
                                const isClear = key === 'C';
                                const isBack = key === 'back';
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                      setPinFormError('');
                                      setPinFormSuccess('');
                                      if (firstPinActiveField === 'new') {
                                        if (isClear) {
                                          setPinFormNew('');
                                        } else if (isBack) {
                                          setPinFormNew((prev: string) => prev.slice(0, -1));
                                        } else if (pinFormNew.length < targetPinLength) {
                                          const nextVal = pinFormNew + key;
                                          setPinFormNew(nextVal);
                                          if (nextVal.length === targetPinLength) {
                                            setFirstPinActiveField('confirm');
                                          }
                                        }
                                      } else {
                                        if (isClear) {
                                          setPinFormConfirm('');
                                        } else if (isBack) {
                                          if (pinFormConfirm.length === 0) {
                                            setFirstPinActiveField('new');
                                          } else {
                                            setPinFormConfirm((prev: string) => prev.slice(0, -1));
                                          }
                                        } else if (pinFormConfirm.length < targetPinLength) {
                                          setPinFormConfirm((prev: string) => prev + key);
                                        }
                                      }
                                    }}
                                    style={{
                                      padding: '12px 0',
                                      borderRadius: '14px',
                                      border: '1px solid #e2e8f0',
                                      background: (isClear || isBack) ? '#f1f5f9' : '#ffffff',
                                      color: '#0f172a',
                                      fontSize: (isClear || isBack) ? '0.85rem' : '1.25rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                      transition: 'all 0.1s'
                                    }}
                                    className="hover-scale"
                                  >
                                    {isBack ? <Delete size={18} /> : key}
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              type="button"
                              disabled={isSavingPin || !isFilledComplete}
                              onClick={async () => {
                                if (pinFormNew.length !== targetPinLength) {
                                  setPinFormError(`Bitte gib eine vollständige ${targetPinLength}-stellige PIN ein.`);
                                  return;
                                }
                                if (pinFormNew !== pinFormConfirm) {
                                  setPinFormError('Die eingegebenen PINs stimmen nicht überein.');
                                  return;
                                }

                                if (isParentTarget) {
                                  // Trivial validation for 6-digit parent PIN
                                  const trivialPins = ['123456', '654321', '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999'];
                                  if (trivialPins.includes(pinFormNew)) {
                                    setPinFormError('Diese PIN ist zu einfach. Bitte wähle eine sicherere 6-stellige Eltern-PIN.');
                                    return;
                                  }
                                } else {
                                  const dayOfBirth = (studentUser as any)?.day_of_birth || (Array.isArray((studentUser as any)?.activation_days) ? (studentUser as any)?.activation_days[0]?.day_of_birth : (studentUser as any)?.activation_days?.day_of_birth);
                                  const validation = validateNewPin(pinFormNew, dayOfBirth);
                                  if (!validation.isValid) {
                                    setPinFormError(validation.error || 'Ungültige PIN.');
                                    return;
                                  }
                                }

                                setIsSavingPin(true);
                                setPinFormError('');

                                try {
                                  if (isParentTarget) {
                                    // --- SAVE 6-DIGIT PARENT PIN VIA SERVER RPC ---
                                    const { data: rpcRes, error } = await supabase.rpc('set_parent_pin', {
                                      p_student_id: studentId,
                                      p_new_pin: pinFormNew
                                    });

                                    sessionStorage.setItem('groovelab_parent_unlocked_global', 'true');
                                    sessionStorage.setItem(`groovelab_parent_unlocked_${studentId}`, 'true');

                                    if (error || rpcRes !== true) {
                                      setPinFormError('Fehler beim Speichern der Eltern-PIN: ' + (error?.message || 'Serverfehler'));
                                    } else {
                                      setPinFormSuccess('Deine 6-stellige Eltern-PIN wurde erfolgreich gespeichert!');
                                      setStudentUser((prev: any) => prev ? {
                                        ...prev,
                                        has_parent_pin: true
                                      } : prev);
                                      setPinFormNew('');
                                      setPinFormConfirm('');
                                    }
                                  } else {
                                    // --- SAVE 4-DIGIT STUDENT PIN (personal_pin) VIA SERVER RPC ---
                                    const authQrToken = studentUser?.qr_token || studentUser?.ausweis_nummer || studentId || '';
                                    
                                    let rpcSuccess = false;
                                    let rpcErrorMsg = '';

                                    // 1. Primary RPC
                                    try {
                                      const { data: rpcRes, error } = await supabase.rpc('set_initial_student_pin', {
                                        p_student_id: studentId,
                                        p_qr_token: authQrToken,
                                        p_pin: pinFormNew
                                      });
                                      if (!error && rpcRes === true) {
                                        rpcSuccess = true;
                                      } else if (error) {
                                        rpcErrorMsg = error.message;
                                      }
                                    } catch (e: any) {
                                      rpcErrorMsg = e?.message || '';
                                    }

                                    // 2. Secondary Fallback RPC
                                    if (!rpcSuccess) {
                                      try {
                                        const { data: pRes, error: pErr } = await supabase.rpc('set_personal_pin', {
                                          p_user_id: studentId,
                                          p_new_pin: pinFormNew
                                        });
                                        if (!pErr && pRes === true) {
                                          rpcSuccess = true;
                                        } else if (pErr) {
                                          rpcErrorMsg = pErr.message || rpcErrorMsg;
                                        }
                                      } catch (e: any) {
                                        rpcErrorMsg = e?.message || rpcErrorMsg;
                                      }
                                    }

                                    if (!rpcSuccess) {
                                      setPinFormError('Fehler beim Speichern der Schüler-PIN: ' + (rpcErrorMsg || 'Serverfehler'));
                                    } else {
                                       setPinFormSuccess('Deine 4-stellige Schüler-PIN wurde erfolgreich gespeichert!');
                                       setStudentUser((prev: any) => {
                                         const updated = prev ? {
                                           ...prev,
                                           is_pin_activated: true,
                                           has_personal_pin: true
                                         } : prev;
                                         if (studentId && updated) {
                                           try {
                                             secureVault.set(`cg_secure_vault_user_${studentId}`, updated);
                                           } catch (e) {}
                                         }
                                         return updated;
                                       });
                                       if (studentId) {
                                         try {
                                           secureVault.get<any>(`cg_secure_vault_user_${studentId}`).then(existing => {
                                             const merged = { ...(existing || {}), ...(studentUser || {}), is_pin_activated: true, has_personal_pin: true };
                                             secureVault.set(`cg_secure_vault_user_${studentId}`, merged);
                                           });
                                         } catch (e) {}
                                       }
                                       if (onProfileUpdate) {
                                         try { onProfileUpdate({ is_pin_activated: true, has_personal_pin: true }); } catch (e) {}
                                       }
                                       setPinFormNew('');
                                       setPinFormConfirm('');
                                    }
                                  }
                                } catch (err: any) {
                                  setPinFormError('Fehler: ' + (err?.message || 'Speichern fehlgeschlagen.'));
                                } finally {
                                  setIsSavingPin(false);
                                }
                              }}
                              style={{
                                marginTop: '6px',
                                padding: '14px 20px',
                                borderRadius: '14px',
                                background: isFilledComplete 
                                  ? (isParentTarget ? '#0284c7' : '#34a853') 
                                  : '#e2e8f0',
                                color: isFilledComplete ? '#ffffff' : '#94a3b8',
                                border: 'none',
                                fontWeight: 800,
                                fontSize: '0.875rem',
                                cursor: (isFilledComplete && !isSavingPin) ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                              className={isFilledComplete ? "hover-scale" : ""}
                            >
                              {isParentTarget ? <Lock size={16} /> : <Shield size={16} />}
                              {isSavingPin 
                                ? 'Speichere PIN...' 
                                : (isAdultStudent 
                                    ? 'Persönliche PIN jetzt speichern' 
                                    : (isParentTarget ? '6-stellige Eltern-PIN jetzt speichern' : '4-stellige Schüler-PIN jetzt speichern'))}
                            </button>
                          </div>

                          {/* 🛡️ Biometrischer Passkey (FaceID / TouchID) für Eltern */}
                          {isParentTarget && (
                            <div style={{
                              background: '#ffffff',
                              border: '1.5px solid #e2e8f0',
                              borderRadius: '24px',
                              padding: '20px 22px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '14px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                    border: '1.5px solid #86efac',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#15803d',
                                    flexShrink: 0
                                  }}>
                                    <Fingerprint size={22} />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.92rem', fontWeight: 850, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span>Biometrischer Passkey</span>
                                      <span style={{
                                        fontSize: '0.66rem',
                                        fontWeight: 800,
                                        padding: '2px 8px',
                                        borderRadius: '100px',
                                        background: hasDevicePasskey ? '#dcfce7' : '#f1f5f9',
                                        color: hasDevicePasskey ? '#15803d' : '#64748b',
                                        border: hasDevicePasskey ? '1px solid #86efac' : '1px solid #e2e8f0'
                                      }}>
                                        {hasDevicePasskey ? 'Aktiv auf diesem Gerät' : 'Optional'}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                                      FaceID, TouchID oder Geräteschlüssel für sekundenschnelles Entsperren ohne PIN-Eingabe.
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {passkeyActionMessage && (
                                <div style={{
                                  padding: '10px 14px',
                                  borderRadius: '12px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  background: passkeyActionStatus === 'success' ? '#f0fdf4' : '#fee2e2',
                                  border: passkeyActionStatus === 'success' ? '1px solid #86efac' : '1px solid #fca5a5',
                                  color: passkeyActionStatus === 'success' ? '#15803d' : '#dc2626'
                                }}>
                                  {passkeyActionMessage}
                                </div>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, flex: 1, minWidth: '180px' }}>
                                  {isWebAuthnAvailable 
                                    ? (hasDevicePasskey 
                                        ? 'Dein Passkey ist verknüpft. Du kannst ihn bei Bedarf für diesen Browser erneuern.' 
                                        : 'Du kannst diesen Browser jetzt mit biometrischem Passkey verknüpfen.')
                                    : 'Biometrische Sensoren auf diesem Browser nicht verfügbar (PIN bleibt Standard).'}
                                </div>
                                {isWebAuthnAvailable && (
                                  <button
                                    type="button"
                                    disabled={isRegisteringPasskey}
                                    onClick={async () => {
                                      if (!handleRegisterParentPasskey) return;
                                      setIsRegisteringPasskey(true);
                                      setPasskeyActionMessage(null);
                                      try {
                                        const res = await handleRegisterParentPasskey();
                                        if (res.success) {
                                          setHasDevicePasskey(true);
                                          setPasskeyActionStatus('success');
                                          setPasskeyActionMessage('✨ Passkey erfolgreich aktiviert! Du kannst den Elternbereich künftig mit FaceID/TouchID entsperren.');
                                        } else {
                                          setPasskeyActionStatus('error');
                                          setPasskeyActionMessage(res.error || 'Einrichtung fehlgeschlagen.');
                                        }
                                      } catch (e: any) {
                                        setPasskeyActionStatus('error');
                                        setPasskeyActionMessage(e?.message || 'Fehler beim Einrichten des Passkeys.');
                                      } finally {
                                        setIsRegisteringPasskey(false);
                                      }
                                    }}
                                    style={{
                                      padding: '10px 16px',
                                      borderRadius: '14px',
                                      background: hasDevicePasskey ? '#f8fafc' : '#0284c7',
                                      color: hasDevicePasskey ? '#0f172a' : '#ffffff',
                                      border: hasDevicePasskey ? '1.5px solid #cbd5e1' : 'none',
                                      fontSize: '0.82rem',
                                      fontWeight: 850,
                                      cursor: isRegisteringPasskey ? 'wait' : 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      boxShadow: hasDevicePasskey ? 'none' : '0 2px 8px rgba(2, 132, 199, 0.25)',
                                      transition: 'all 0.15s ease'
                                    }}
                                    className="hover-scale"
                                  >
                                    <Key size={16} />
                                    <span>{isRegisteringPasskey ? 'Warte auf Sensor...' : (hasDevicePasskey ? 'Passkey erneuern' : 'Passkey jetzt einrichten')}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {activeStudentSettingsModal === 'modules' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Modul 1: Campus */}
                        <div style={{
                          background: '#ffffff',
                          border: '1.5px solid #86efac',
                          borderRadius: '20px',
                          padding: '22px',
                          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                              }}>
                                <BookOpen size={22} />
                              </div>
                              <div>
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Schüler- &amp; Übestudio
                                </span>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                                  Modul Campus
                                </h4>
                              </div>
                            </div>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '4px 10px',
                              borderRadius: '100px',
                              background: studentUser?.is_campus_active ? '#dcfce7' : '#fef3c7',
                              color: studentUser?.is_campus_active ? '#15803d' : '#b45309',
                              border: `1px solid ${studentUser?.is_campus_active ? '#86efac' : '#fde68a'}`
                            }}>
                              {studentUser?.is_campus_active ? '✓ Aktiv freigeschaltet' : 'Bereit zur Aktivierung'}
                            </span>
                          </div>

                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
                            Umfasst das digitale Hausaufgabenheft, den interaktiven Übe-Timer mit Streaks &amp; Level-Ups, die Audio-Loopstation und die persönliche Audio-Biografie.
                          </p>

                          {/* Feature Pills */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {[
                              { label: 'Übe-Timer & Streaks', icon: Clock },
                              { label: 'Audio-Loopstation', icon: Mic },
                              { label: 'Hausaufgabenheft & Notizen', icon: BookOpen },
                              { label: 'Audio-Biografie', icon: Music }
                            ].map((feat) => {
                              const FeatIcon = feat.icon;
                              return (
                                <span key={feat.label} style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#1e293b',
                                  background: '#f1f5f9',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}>
                                  <FeatIcon size={12} color="#15803d" />
                                  <span>{feat.label}</span>
                                </span>
                              );
                            })}
                          </div>

                          {/* Action Button */}
                          <div style={{ paddingTop: '6px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9' }}>
                            {studentUser?.is_campus_active ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '0.76rem', color: '#15803d', fontWeight: 700 }}>
                                  Aktiv für das laufende Schuljahr
                                </span>
                                <button
                                  type="button"
                                  disabled
                                  style={{
                                    padding: '8px 14px',
                                    borderRadius: '10px',
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'default',
                                    minHeight: '44px'
                                  }}
                                >
                                  Bereits freigeschaltet
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowParentActivationModal(true)}
                                style={{
                                  padding: '10px 18px',
                                  borderRadius: '12px',
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '0.82rem',
                                  fontWeight: 850,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                  minHeight: '44px',
                                  touchAction: 'manipulation'
                                }}
                                className="hover-scale"
                              >
                                <Sparkles size={14} />
                                <span>Gratis-Schnuppermonat starten &amp; freischalten</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Modul 2: GrooveLab Modul */}
                        <div style={{
                          background: '#ffffff',
                          border: '1.5px solid #fef08a',
                          borderRadius: '20px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                          boxShadow: '0 4px 16px -4px rgba(234, 179, 8, 0.15)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fefce8', border: '1px solid #fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Music size={18} color="#ca8a04" />
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                                  Modul GrooveLab
                                </h4>
                              </div>
                            </div>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '4px 10px',
                              borderRadius: '100px',
                              background: '#fefce8',
                              color: '#a16207',
                              border: '1px solid #fef08a'
                            }}>
                              Inklusive (Musikschule übernimmt 100%)
                            </span>
                          </div>

                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
                            Umfasst die Band-Rooms, Song-Bibliotheken zum Mitspielen, Live Lab, den Skill-Radar und spielerische Musiker-Avatare.
                          </p>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {[
                              { label: 'Band-Rooms', icon: Users },
                              { label: 'Song-Bibliotheken', icon: Library },
                              { label: 'Skill-Radar', icon: Target },
                              { label: 'Musiker-Avatare', icon: Sparkles }
                            ].map((feat) => {
                              const FeatIcon = feat.icon;
                              return (
                                <span key={feat.label} style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#1e293b',
                                  background: '#fefce8',
                                  border: '1px solid #fef9c3',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}>
                                  <FeatIcon size={12} color="#ca8a04" />
                                  <span>{feat.label}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {(activeStudentSettingsModal === 'billing' || (isBillingHub && effectiveBillingSubTab === 'billing')) && (
                      <div>
                        {studentUser?.role?.toLowerCase() === 'student' && (
                          <StudentBillingInvoicesSection studentUser={studentUser} studentId={studentId} />
                        )}
                      </div>
                    )}

                    {activeStudentSettingsModal === 'legal' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* DSGVO & Datenschutz Karte */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: 850, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Shield size={14} color="#15803d" />
                            <span>Datenschutz &amp; Datenminimierung</span>
                          </span>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.5, fontWeight: 550 }}>
                            <CampusGroovelabText campusColor="#34a853" groovelabColor="#eab308" fontWeight={750} /> folgt dem Grundsatz der strikten Datenvermeidung. Es werden <strong>keine Bankdaten, keine SEPA-Mandate und keine privaten E-Mail-Adressen von Schülern</strong> in der App-Datenbank gespeichert.
                          </p>
                          <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', fontSize: '0.78rem', color: '#475569', lineHeight: 1.6 }}>
                            <li>Hosting ausschließlich in zertifizierten deutschen Rechenzentren (Hetzner Online GmbH &amp; Supabase EU).</li>
                            <li>Audiodaten und Memos dienen rein dem Unterricht und können jederzeit rückstandslos gelöscht werden.</li>
                            <li>Volle Betroffenenrechte nach Art. 15–21 DSGVO (Auskunft &amp; Löschung jederzeit über das Sekretariat).</li>
                          </ul>
                        </div>

                        {/* Kostenfreie Software & Bereitstellung */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: 850, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={14} color="#0369a1" />
                            <span><CampusGroovelabText campusColor="#34a853" groovelabColor="#eab308" fontWeight={850} /> Bereitstellung</span>
                          </span>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.5, fontWeight: 550 }}>
                            Die <CampusGroovelabText fontWeight={700} /> Software ist ohne gesonderte Lizenzkaufgebühren im Bereitstellungspaket enthalten (Reine Cloud- &amp; Hosting-Infrastruktur).
                          </p>
                        </div>

                        {/* DSGVO Art. 15 PDF Export */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FileText size={18} color="#0284c7" style={{ flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                                DSGVO Art. 15 Auskunftsbericht
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                                Offizielles Daten- &amp; Übeprotokoll gemäß DSGVO als PDF herunterladen.
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleExportGdprReport}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              borderRadius: '10px',
                              background: '#0284c7',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                            className="hover-scale"
                          >
                            <Download size={14} />
                            <span>PDF Export</span>
                          </button>
                        </div>

                        {/* Gesetzliche Vertragsbestätigung (§ 312f Abs. 2 BGB) */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '16px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldCheck size={20} color="#15803d" style={{ flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                                Gesetzliche Vertragsbestätigung &amp; Widerrufsbelehrung
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 500, marginTop: '2px' }}>
                                2-seitiger amtlicher Beleg auf dauerhaftem Datenträger inkl. Widerrufsbelehrung &amp; GoBD-Siegel.
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const { generateB2CParentContractPDF } = await import('../../../utils/pdfGenerator');
                              const studentName = `${studentUser?.first_name || 'Schüler'} ${(studentUser?.last_name ? studentUser.last_name.slice(0, 1) + '.' : '')}`.trim();
                              generateB2CParentContractPDF({
                                studentName,
                                studentId: studentId || studentUser?.id || 'schueler',
                                schoolName: studentUser?.school_name || 'Musikschule',
                                isDirectBilled: studentUser?.is_direct_billed,
                                isHardship: studentUser?.is_hardship_exempt
                              });
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              borderRadius: '10px',
                              background: '#15803d',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              flexShrink: 0,
                              boxShadow: '0 2px 6px rgba(21, 128, 61, 0.2)'
                            }}
                            className="hover-scale"
                            title="Vertragsurkunde und Widerrufsbelehrung als PDF herunterladen"
                          >
                            <Download size={14} />
                            <span>PDF Beleg</span>
                          </button>
                        </div>

                        {/* Impressum */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BookOpen size={14} color="#475569" />
                            <span>Impressum</span>
                          </span>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.45, fontWeight: 550 }}>
                            <CampusGroovelabText campusColor="#34a853" groovelabColor="#eab308" fontWeight={800} /> • Patrick Huber, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden<br />
                            E-Mail: <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#059669', fontWeight: 700 }}>kontakt@campus-groovelab.de</a> (Antwort werktags &lt; 60 Min.)
                          </p>
                        </div>
                      </div>
                    )}

                    {(activeStudentSettingsModal === 'consents' || (isBillingHub && effectiveBillingSubTab === 'consents')) && (
                      <ParentConsentSettingsView
                        studentUser={studentUser}
                        studentId={studentId}
                      />
                    )}

                    {(activeStudentSettingsModal === 'downloads' || (isBillingHub && (effectiveBillingSubTab === 'downloads' || effectiveBillingSubTab === 'legal'))) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* DSGVO Art. 20 Datenübertragbarkeit / Voll-Archiv Export */}
                        {handleExportFullDataArchive && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Download size={18} color="#059669" style={{ flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                                  Vollständiges Datenarchiv (Art. 20 DSGVO)
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                                  Alle Hausaufgaben, Meisterwerke, Übe-Logs &amp; Audio-Memos als JSON herunterladen.
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleExportFullDataArchive}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                background: '#059669',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                flexShrink: 0
                              }}
                              className="hover-scale"
                            >
                              <Download size={14} />
                              <span>JSON Export</span>
                            </button>
                          </div>
                        )}

                        {/* 🌟 4 Modulare Didaktik-Datentresor Downloads (Art. 20 DSGVO) */}
                        <ParentDataVaultSettingsView
                          downloadingSection={downloadingSection}
                          downloadProgressMsg={downloadProgressMsg}
                          downloadFeedback={downloadFeedback}
                          handleDownloadFullArchive={handleDownloadFullArchive}
                          handleDownloadAudioOnly={handleDownloadAudioOnly}
                          handleDownloadBiographyOnly={handleDownloadBiographyOnly}
                          handleDownloadChronicleAndStickers={handleDownloadChronicleAndStickers}
                          handleExportGdprReport={handleExportGdprReport}
                          handleExportFullDataArchive={handleExportFullDataArchive}
                        />
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div
                    style={{
                      padding: isMobile ? '10px 16px calc(max(10px, env(safe-area-inset-bottom, 10px)) + 4px) 16px' : '16px 24px',
                      borderTop: '1px solid #f1f5f9',
                      background: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isMobile ? 'stretch' : 'flex-end',
                      gap: '10px',
                      position: 'relative',
                      zIndex: 20,
                      flexShrink: 0
                    }}
                    className={isMobile ? "mobile-modal-footer" : ""}
                  >
                    <button
                      type="button"
                      onClick={handleCloseSettingsModal}
                      style={{
                        padding: isMobile ? '12px 20px' : '8px 20px',
                        borderRadius: isMobile ? '14px' : '10px',
                        border: isMobile ? 'none' : '1px solid #cbd5e1',
                        background: isMobile ? '#0f172a' : '#ffffff',
                        color: isMobile ? '#ffffff' : '#475569',
                        fontSize: isMobile ? '0.90rem' : '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        width: isMobile ? '100%' : 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: isMobile ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                      }}
                      className="hover-scale"
                    >
                      {isMobile ? (
                        <>
                          <Check size={18} />
                          <span>Fertig &amp; Schließen</span>
                        </>
                      ) : (
                        'Schließen'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

            {/* TIER-1 SAAS SCHICHT 1: ONE-TIME EMERGENCY KIT MODAL */}
            {showEmergencyKitModal && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 11000,
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px'
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '28px',
                    width: '100%',
                    maxWidth: '520px',
                    padding: '32px 28px',
                    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
                    border: '1.5px solid #bae6fd',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    position: 'relative'
                  }}
                  className="animation-slide-up"
                >
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '22px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    marginBottom: '16px',
                    boxShadow: '0 8px 24px -4px rgba(2, 132, 199, 0.4)'
                  }}>
                    <ShieldCheck size={36} />
                  </div>

                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', fontWeight: 1000, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Dein Eltern-Notfallschlüssel
                  </h3>
                  <p style={{ margin: '0 0 20px 0', fontSize: '0.84rem', color: '#64748b', fontWeight: 600, lineHeight: 1.45 }}>
                    Sichere diesen Schlüssel jetzt sorgfältig. Er wird auf dem Profil deines Kindes <strong>nie wieder angezeigt</strong>!
                  </p>

                  {/* Monospace Key Display */}
                  <div style={{
                    width: '100%',
                    background: '#f0fdf4',
                    border: '2px dashed #86efac',
                    borderRadius: '18px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    boxSizing: 'border-box',
                    marginBottom: '16px'
                  }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Master Recovery Key
                    </span>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 1000,
                      color: '#0f172a',
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      letterSpacing: '0.12em',
                      userSelect: 'all'
                    }}>
                      {newGeneratedRecoveryKey}
                    </div>
                  </div>

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(newGeneratedRecoveryKey);
                        setHasCopiedRecoveryKey(true);
                        setTimeout(() => setHasCopiedRecoveryKey(false), 3000);
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      background: hasCopiedRecoveryKey ? '#f0fdf4' : '#ffffff',
                      color: hasCopiedRecoveryKey ? '#15803d' : '#334155',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      marginBottom: '20px',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                  >
                    {hasCopiedRecoveryKey ? <Check size={16} /> : <Copy size={16} />}
                    <span>{hasCopiedRecoveryKey ? 'In Zwischenablage kopiert!' : 'Schlüssel kopieren'}</span>
                  </button>

                  {/* Security Info Card */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '0.76rem',
                    color: '#475569',
                    lineHeight: 1.45,
                    marginBottom: '24px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <strong style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <ShieldCheck size={14} color="#0284c7" /> Kinderschutz-Garantie:
                    </strong>
                    Bewahre diesen Notfallschlüssel getrennt vom Gerät deines Kindes auf (z. B. in deinem Passwort-Manager oder notiert bei deinen Unterlagen).
                  </div>

                  {/* Confirmation CTA */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmergencyKitModal(false);
                      setSettingsSubTab('overview');
                      setActiveStudentSettingsModal(null);
                    }}
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      touchAction: 'manipulation',
                      padding: '14px 20px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.92rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 8px 20px -4px rgba(2, 132, 199, 0.4)',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    className="hover-scale"
                  >
                    <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                    <span>Ich habe den Schlüssel sicher aufbewahrt</span>
                  </button>
                </div>
              </div>
            )}

            {/* SECURE RECOVERY KEY MODAL */}
            {renderRecoveryKeyModal()}

            {/* 🛡️ In-App Geschwisterkind hinzufügen Modal (Goldstandard: QR-Scan + PIN) */}
            <AddSiblingModal
              isOpen={isAddSiblingModalOpen}
              onClose={() => setIsAddSiblingModalOpen(false)}
              currentStudentId={studentId || (studentUser as any)?.id || ''}
              schoolId={(studentUser as any)?.school_id}
              existingFamilyProfiles={familyProfiles}
              onProfileAdded={(newProfile) => {
                setFamilyProfiles((prev: any[]) => {
                  const filtered = prev.filter((p: any) => p.id !== newProfile.id);
                  const updated = [...filtered, newProfile];
                  try {
                    localStorage.setItem('campus_family_profiles', JSON.stringify(updated));
                    const localProfs = JSON.parse(localStorage.getItem('groovelab_local_profiles') || '[]');
                    const updatedLocal = [...localProfs.filter((p: any) => p.id !== newProfile.id), newProfile];
                    localStorage.setItem('groovelab_local_profiles', JSON.stringify(updatedLocal));
                  } catch (e) {}
                  return updated;
                });
              }}
            />

            {/* ⏳ 10-Sekunden Inaktivitäts-Warnungs-Toast für Elternbereich */}
            {isParentLockWarning && isParentUnlocked && (
              <div style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 99999,
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                border: '1.5px solid #f59e0b',
                borderRadius: '18px',
                padding: '14px 20px',
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                color: '#ffffff',
                animation: 'pinShakeAnim 0.5s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={20} color="#f59e0b" />
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>
                      Eltern-Sitzung läuft in <span style={{ color: '#f59e0b', fontSize: '1rem', fontWeight: 900 }}>{parentLockRemainingSeconds}s</span> ab
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Zum Schutz deiner Einstellungen wird gleich automatisch gesperrt.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={extendParentSession}
                  style={{
                    background: '#f59e0b',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  className="hover-scale"
                >
                  Um 3 Min. verlängern
                </button>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
