import React from 'react';
import { supabase } from '../../../lib/supabase';
import { unsubscribeUserFromPush } from '../../../utils/webPush';
import {
  Lock, Trophy, Sparkles, Star, Coffee, Clock, Timer, BookOpen, Play, Pause, Square,
  RotateCcw, Volume2, Moon, QrCode, X, Eye, EyeOff, Zap, Music, Library, School,
  Calendar, CalendarX, Check, CheckCircle, Target, Pencil, User, Mail, Phone, Users,
  Shield, Settings, Bell, FileText, AlertTriangle, ShieldCheck, CheckCheck, Mic, Download,
  Key, Delete, Sliders, Compass, Lightbulb, Copy, Fingerprint, Headphones
} from 'lucide-react';
import { formatTeacherFullName } from '../../../utils/nameHelper';
import { CampusGroovelabText } from '../../CampusGroovelabBrand';
import { validateNewPin } from '../../../utils/pinValidation';
import { AddSiblingModal } from '../../campus/AddSiblingModal';
import { Avatar, getInstrumentAvatarUrl, STUDENT_AVATARS } from '../studentAvatars.constants';
import { CAMPUS_AGE_STANDARDS } from '../studentAgeStandards';
import { StudentBillingInvoicesSection } from '../StudentBillingInvoicesSection';
import JSZip from 'jszip';
import { ALL_STICKERS, getUnifiedStickerStatus } from '../../../domain/stickersAndTresor';

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
    totalPracticeMinutes
  } = props;

  const [downloadingSection, setDownloadingSection] = React.useState<string | null>(null);
  const [downloadProgressMsg, setDownloadProgressMsg] = React.useState<string>('');
  const [downloadFeedback, setDownloadFeedback] = React.useState<string | null>(null);

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
              audioFolder.file(`${a.date}_${safeTitle}.webm`, blob);
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
            zip.file(`${a.date}_${safeTitle}.webm`, blob);
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
              zip.file(`${safeTitle}.webm`, blob);
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
          const isParentSessionActive = checkIsParentSessionActive();
          const hasConfiguredParentPin = Boolean(studentUser?.has_parent_pin === true);

          return (
            <>
              {isJuniorOrTeen && !isParentSessionActive ? (
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
                  {hasConfiguredParentPin ? 'Elternbereich geschützt 🛡️' : '6-stellige Eltern-Master-PIN vergeben 🛡️'}
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
                    <span>⏳ Sicherheitssperre aktiv: Bitte warte noch <strong>{parentGateCooldownSeconds}s</strong></span>
                  </div>
                )}

                {/* 1-Click Biometric Quick-Unlock (FaceID / TouchID / Passkey) - Nur wenn echte Hardware verfügbar */}
                {hasConfiguredParentPin && isWebAuthnAvailable && (
                  <button
                    type="button"
                    onClick={handleBiometricUnlock}
                    disabled={isVerifyingParentGate || parentGateCooldownSeconds > 0}
                    style={{
                      width: '100%',
                      maxWidth: '300px',
                      padding: '10px 16px',
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                      border: '1.5px solid #86efac',
                      borderRadius: '16px',
                      color: '#15803d',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.12)'
                    }}
                    className="hover-scale"
                  >
                    <Fingerprint size={18} />
                    <span>Mit FaceID / TouchID entsperren</span>
                  </button>
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
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: currentPlatform === 'groovelab' ? '#fefce8' : '#e6f4ea', border: currentPlatform === 'groovelab' ? '1px solid #fef08a' : '1px solid #ceebd6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: currentPlatform === 'groovelab' ? '#ca8a04' : '#34a853' }}>
                    <Sliders size={22} strokeWidth={2.4} />
                  </div>
                  <span>{isAdultStudent ? 'Mein Account & Einstellungen' : (isJuniorOrTeen ? 'Elternbereich & Schutz' : 'Einstellungen & Eltern-Zone')}</span>
                </h2>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>
                  {isAdultStudent 
                    ? 'Verwalte deine App-Designs, Push-Benachrichtigungen, persönliche PIN, Belege und Datenschutz-Einstellungen eigenständig.' 
                    : (isJuniorOrTeen 
                      ? 'Schutz- & Freigabefunktionen, Benachrichtigungen und Sicherheit für Eltern.' 
                      : 'Verwalte deine Push-Benachrichtigungen, persönliche PIN, Belege und Erziehungsberechtigten-Freigaben.')}
                </p>
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
                      border: '1px solid #86efac'
                    }}>
                      🎁 1 Monat gratis schnuppern
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
                    Stundenplan und Hausaufgabenheft sind bereits aktiv. Schalte jetzt die interaktive <strong>Audio-Loopstation</strong>, den <strong>Übe-Timer mit Streaks</strong> und die <strong>persönliche Audio-Biografie</strong> frei.
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '4px' }}>
                    <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700 }}>
                      ✓ Laufender Monat 100% kostenlos • Danach nur 0,49 € / Mo. bis zum Schuljahresende (31.08.)
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
                        transition: 'all 0.15s'
                      }}
                      className="hover-scale"
                    >
                      <Sparkles size={16} />
                      <span>Kostenfreien Schnuppermonat starten ➔</span>
                    </button>
                  </div>
                </div>
              )}

              {/* MODULAR COVER CARDS GRID */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '18px',
              width: '100%'
            }}>
              {[
                {
                  id: 'modules',
                  title: 'Module & Freischaltung',
                  subtitle: studentUser?.is_campus_active ? 'Campus & GrooveLab aktiv' : (currentPlatform === 'groovelab' ? 'GrooveLab aktiv' : '1 Monat gratis schnuppern'),
                  badge: (studentUser?.is_campus_active || currentPlatform === 'groovelab') ? 'Aktiv' : '1 Mo. gratis',
                  gradient: currentPlatform === 'groovelab' ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  shadowColor: currentPlatform === 'groovelab' ? 'rgba(234, 179, 8, 0.35)' : 'rgba(16, 185, 129, 0.40)',
                  icon: Zap
                },
                {
                  id: 'parent_controls',
                  title: isAdultStudent ? 'App- & Design-Stufe' : 'Eltern-Kontrollzentrum',
                  subtitle: isAdultStudent ? 'Benutzeroberfläche & Boards' : 'Altersstufe & Freigaben',
                  badge: isAdultStudent ? 'Self-Management' : 'Master-PIN Schutz',
                  gradient: currentPlatform === 'groovelab' ? 'linear-gradient(135deg, #facc15 0%, #d97706 100%)' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  shadowColor: currentPlatform === 'groovelab' ? 'rgba(250, 204, 21, 0.40)' : 'rgba(2, 132, 199, 0.40)',
                  icon: isAdultStudent ? Compass : ShieldCheck
                },
                {
                  id: 'notifications',
                  title: 'Mitteilungen & Alerts',
                  subtitle: pushEnabled ? 'Push-Mitteilungen aktiv' : 'Mitteilungen & Push-Kanäle',
                  badge: pushEnabled ? 'Aktiv' : 'Konfigurieren',
                  gradient: currentPlatform === 'groovelab' ? 'linear-gradient(135deg, #eab308 0%, #a16207 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  shadowColor: currentPlatform === 'groovelab' ? 'rgba(234, 179, 8, 0.35)' : 'rgba(59, 130, 246, 0.40)',
                  icon: Bell
                },
                {
                  id: 'security',
                  title: isAdultStudent ? 'PIN & Account-Sicherheit' : 'PIN & Sicherheit',
                  subtitle: isAdultStudent
                    ? ((studentUser?.has_personal_pin || studentUser?.is_pin_activated) ? '4-stellige PIN aktiv' : '4-stellige PIN festlegen')
                    : '6-stellige Eltern-PIN & 4-stellige Schüler-PIN',
                  badge: (hasConfiguredParentPin || studentUser?.has_personal_pin || studentUser?.is_pin_activated) ? 'Geschützt' : 'PIN vergeben',
                  gradient: currentPlatform === 'groovelab' ? 'linear-gradient(135deg, #ca8a04 0%, #854d0e 100%)' : 'linear-gradient(135deg, #34a853 0%, #15803d 100%)',
                  shadowColor: currentPlatform === 'groovelab' ? 'rgba(202, 138, 4, 0.40)' : 'rgba(52, 168, 83, 0.40)',
                  icon: Lock
                },
                {
                  id: 'billing',
                  title: isAdultStudent ? 'Vertrag & Belege' : 'Belege & Bereitstellung',
                  subtitle: (studentUser as any)?.is_direct_billed ? 'Jahresbeitrag & Zahlungsbelege' : 'Von Musikschule übernommen (0,00 €)',
                  badge: (studentUser as any)?.is_direct_billed ? 'Direktabrechnung' : 'Inklusive',
                  gradient: currentPlatform === 'groovelab' ? 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)' : 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                  shadowColor: currentPlatform === 'groovelab' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(139, 92, 246, 0.40)',
                  icon: FileText
                },
                {
                  id: 'legal',
                  title: 'Rechtliches & DSGVO',
                  subtitle: 'Datenschutz & Art. 15 Export',
                  badge: 'DSGVO Konform',
                  gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                  shadowColor: 'rgba(100, 116, 139, 0.40)',
                  icon: ShieldCheck
                },
                {
                  id: 'feedback',
                  title: 'Ideenschmiede',
                  subtitle: 'Wünsche & Fehler melden',
                  badge: 'Mitgestalten',
                  gradient: currentPlatform === 'groovelab' ? 'linear-gradient(135deg, #facc15 0%, #ca8a04 100%)' : 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                  shadowColor: currentPlatform === 'groovelab' ? 'rgba(250, 204, 21, 0.35)' : 'rgba(236, 72, 153, 0.40)',
                  icon: Lightbulb
                }
              ].map((module) => {
                const IconComp = module.icon;
                return (
                  <div
                    key={module.id}
                    onClick={() => handleOpenSettingsModule(module.id as any)}
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
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      position: 'relative'
                    }}
                    className="hover-scale"
                  >
                    {/* Square Cover Icon Box */}
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

                    {/* Status Badge */}
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '3px 9px',
                      borderRadius: '100px',
                      background: currentPlatform === 'groovelab' ? '#fefce8' : '#e6f4ea',
                      color: currentPlatform === 'groovelab' ? '#ca8a04' : '#15803d',
                      border: currentPlatform === 'groovelab' ? '1px solid #fef08a' : 'none',
                      marginBottom: '10px',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase'
                    }}>
                      {module.badge}
                    </span>

                    {/* Title & Subtitle */}
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
                  zIndex: 10000,
                  background: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px'
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
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: activeStudentSettingsModal === 'billing' ? '920px' : '680px',
                    maxHeight: '88vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden'
                  }}
                  className="animation-slide-up"
                  onClick={(e) => e.stopPropagation()}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: activeStudentSettingsModal === 'modules'
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : activeStudentSettingsModal === 'parent_controls'
                          ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                          : activeStudentSettingsModal === 'notifications'
                          ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                          : activeStudentSettingsModal === 'security'
                          ? 'linear-gradient(135deg, #34a853 0%, #15803d 100%)'
                          : activeStudentSettingsModal === 'billing'
                          ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
                          : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                      }}>
                        {activeStudentSettingsModal === 'modules' && <Zap size={20} color="#ffffff" />}
                        {activeStudentSettingsModal === 'parent_controls' && (isAdultStudent ? <Compass size={20} color="#ffffff" /> : <ShieldCheck size={20} color="#ffffff" />)}
                        {activeStudentSettingsModal === 'notifications' && <Bell size={20} color="#ffffff" />}
                        {activeStudentSettingsModal === 'security' && <Lock size={20} color="#ffffff" />}
                        {activeStudentSettingsModal === 'billing' && <FileText size={20} color="#ffffff" />}
                        {activeStudentSettingsModal === 'legal' && <ShieldCheck size={20} color="#ffffff" />}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {activeStudentSettingsModal === 'modules' && 'Module & Freischaltung'}
                          {activeStudentSettingsModal === 'parent_controls' && (isAdultStudent ? 'App- & Design-Einstellungen' : 'Eltern-Kontrollzentrum')}
                          {activeStudentSettingsModal === 'notifications' && 'Mitteilungen & Benachrichtigungen'}
                          {activeStudentSettingsModal === 'security' && (isAdultStudent ? 'PIN & Account-Sicherheit' : 'PIN & Sicherheit')}
                          {activeStudentSettingsModal === 'billing' && (isAdultStudent ? 'Vertrag & Belege' : 'Belege & Bereitstellung')}
                          {activeStudentSettingsModal === 'legal' && 'Rechtliches & Datenschutz'}
                        </h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                          {activeStudentSettingsModal === 'modules' && 'Verwalte Campus- & GrooveLab-Module und schalte Zusatzfunktionen frei.'}
                          {activeStudentSettingsModal === 'parent_controls' && (isAdultStudent ? 'Passe Benutzeroberfläche und Funktionen nach deinen Wünschen an.' : 'Schutz-, Design- & Freigabefunktionen für dein Kind.')}
                          {activeStudentSettingsModal === 'notifications' && 'Passe an, worüber und wie wir dich informieren.'}
                          {activeStudentSettingsModal === 'security' && (isAdultStudent ? '4-stellige persönliche PIN für schnellen und sicheren Login.' : (securityPinTarget === 'parent' ? '6-stellige Eltern-PIN zum Schutz des Kontrollzentrums & der Ruhezeiten.' : '4-stellige Schüler-PIN für dein Kind (schützt Stundenplan & Profil).'))}
                          {activeStudentSettingsModal === 'billing' && (isAdultStudent ? 'Übersicht über deine gebuchten Module und Zahlungsnachweise.' : 'Übersicht über 100% freie App, Bereitstellung & Zahlungsnachweise.')}
                          {activeStudentSettingsModal === 'legal' && 'Transparente Informationen zu Datenschutz, DSGVO & Jugendschutz.'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCloseSettingsModal}
                      style={{
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#64748b'
                      }}
                      className="hover-scale"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div style={{ padding: '24px', overflowY: 'auto', flex: 1, textAlign: 'left' }}>
                    {activeStudentSettingsModal === 'parent_controls' && (() => {
                      const currentLvlKey = (draftUiLevel ?? (studentUser as any)?.campus_ui_level ?? (localStorage.getItem('campus_student_ui_level') || 'junior')) as 'junior' | 'teen' | 'pro';
                      const standard = CAMPUS_AGE_STANDARDS[currentLvlKey] || CAMPUS_AGE_STANDARDS.junior;

                      const curAbsences = currentLvlKey === 'junior' 
                        ? false 
                        : (draftAllowAbsences !== null ? draftAllowAbsences : ((studentUser as any)?.parent_allow_absences !== undefined && (studentUser as any)?.parent_allow_absences !== null ? Boolean((studentUser as any)?.parent_allow_absences) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_absences_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_absences_${studentId}`) === 'true' : (currentLvlKey === 'pro'))));
                      const curReschedule = currentLvlKey === 'junior'
                        ? false
                        : (draftAllowReschedule !== null ? draftAllowReschedule : ((studentUser as any)?.parent_allow_reschedule_confirm !== undefined && (studentUser as any)?.parent_allow_reschedule_confirm !== null ? Boolean((studentUser as any)?.parent_allow_reschedule_confirm) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_reschedule_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_reschedule_${studentId}`) === 'true' : true)));
                      const curChat = draftAllowChat !== null ? draftAllowChat : ((studentUser as any)?.parent_allow_chat !== undefined && (studentUser as any)?.parent_allow_chat !== null ? Boolean((studentUser as any)?.parent_allow_chat) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_chat_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_chat_${studentId}`) === 'true' : (currentLvlKey !== 'junior')));
                      const curTimer = draftAllowTimer !== null ? draftAllowTimer : ((studentUser as any)?.parent_allow_timer !== undefined && (studentUser as any)?.parent_allow_timer !== null ? Boolean((studentUser as any)?.parent_allow_timer) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_timer_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_timer_${studentId}`) === 'true' : true));
                      const curLeaderboard = draftAllowLeaderboard !== null ? draftAllowLeaderboard : ((studentUser as any)?.parent_allow_leaderboard !== undefined && (studentUser as any)?.parent_allow_leaderboard !== null ? Boolean((studentUser as any)?.parent_allow_leaderboard) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_leaderboard_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_leaderboard_${studentId}`) === 'true' : (currentLvlKey !== 'junior')));
                      const curProposals = draftAllowProposals !== null ? draftAllowProposals : ((studentUser as any)?.parent_allow_proposals !== undefined && (studentUser as any)?.parent_allow_proposals !== null ? Boolean((studentUser as any)?.parent_allow_proposals) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_proposals_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_proposals_${studentId}`) === 'true' : (draftBoardOverrides.mediathek ?? (currentLvlKey !== 'junior'))));
                      const curAudio = draftAllowAudio !== null ? draftAllowAudio : ((studentUser as any)?.parent_allow_audio !== undefined && (studentUser as any)?.parent_allow_audio !== null ? Boolean((studentUser as any)?.parent_allow_audio) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_audio_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_audio_${studentId}`) === 'true' : (draftBoardOverrides.recordings ?? false)));
                      const curTeacherAudio = (studentUser as any)?.parent_permissions?.allow_teacher_audio !== undefined
                        ? Boolean((studentUser as any)?.parent_permissions?.allow_teacher_audio)
                        : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_teacher_audio_${studentId}`) !== null
                            ? localStorage.getItem(`groovelab_parent_allow_teacher_audio_${studentId}`) === 'true'
                            : false);
                      const curStudentAudio = (studentUser as any)?.parent_permissions?.allow_student_audio !== undefined
                        ? Boolean((studentUser as any)?.parent_permissions?.allow_student_audio)
                        : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_student_audio_${studentId}`) !== null
                            ? localStorage.getItem(`groovelab_parent_allow_student_audio_${studentId}`) === 'true'
                            : false);
                      const curTts = draftAllowTts !== null ? draftAllowTts : ((studentUser as any)?.parent_allow_tts !== undefined && (studentUser as any)?.parent_allow_tts !== null ? Boolean((studentUser as any)?.parent_allow_tts) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_tts_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_tts_${studentId}`) === 'true' : (currentLvlKey === 'junior')));

                      const isDeviating = 
                        curAbsences !== standard.allowAbsences ||
                        curReschedule !== standard.allowRescheduleConfirm ||
                        curChat !== standard.allowChat ||
                        curTimer !== standard.allowTimer ||
                        curLeaderboard !== standard.allowLeaderboard ||
                        curProposals !== standard.allowProposals ||
                        curAudio !== standard.allowAudio ||
                        curTts !== standard.allowTts;

                      // 🛡️ Goldstandard: Atomarer Stufenwechsel mit direktem Standard-Load & Diff-Highlighting
                      const handleSwitchAgeLevelWithStandard = async (targetLevelId: 'junior' | 'teen' | 'pro') => {
                        if (targetLevelId === currentLvlKey) return;
                        const targetStandard = CAMPUS_AGE_STANDARDS[targetLevelId] || CAMPUS_AGE_STANDARDS.junior;

                        const currentValues: Record<string, boolean> = {
                          allowAbsences: curAbsences,
                          allowRescheduleConfirm: curReschedule,
                          allowChat: curChat,
                          allowTimer: curTimer,
                          allowLeaderboard: curLeaderboard,
                          allowProposals: curProposals,
                          allowAudio: curAudio,
                          allowTts: curTts,
                        };

                        const targetValues: Record<string, boolean> = {
                          allowAbsences: targetStandard.allowAbsences,
                          allowRescheduleConfirm: targetStandard.allowRescheduleConfirm,
                          allowChat: targetStandard.allowChat,
                          allowTimer: targetStandard.allowTimer,
                          allowLeaderboard: targetStandard.allowLeaderboard,
                          allowProposals: targetStandard.allowProposals,
                          allowAudio: targetStandard.allowAudio,
                          allowTts: targetStandard.allowTts,
                        };

                        const diffKeys: string[] = [];
                        const changesRecord: Record<string, { from: boolean; to: boolean }> = {};

                        Object.keys(targetValues).forEach((key) => {
                          if (currentValues[key] !== targetValues[key]) {
                            diffKeys.push(key);
                            changesRecord[key] = {
                              from: currentValues[key],
                              to: targetValues[key],
                            };
                          }
                        });

                        if (diffKeys.length > 0) {
                          setRecentlyChangedDiff({
                            keys: diffKeys,
                            targetLevelLabel: targetStandard.label,
                            targetLevelId,
                            changes: changesRecord,
                          });

                          setTimeout(() => {
                            setRecentlyChangedDiff((prev: any) => (prev?.targetLevelId === targetLevelId ? null : prev));
                          }, 4500);
                        } else {
                          setRecentlyChangedDiff(null);
                        }

                        // 🛡️ Atomar den empfohlenen Standard für das Ziel-Dashboard aktivieren & persistieren
                        await applyAndSaveParentControls({
                          uiLevel: targetLevelId,
                          allowAbsences: targetStandard.allowAbsences,
                          allowRescheduleConfirm: targetStandard.allowRescheduleConfirm,
                          allowChat: targetStandard.allowChat,
                          allowTimer: targetStandard.allowTimer,
                          allowLeaderboard: targetStandard.allowLeaderboard,
                          allowProposals: targetStandard.allowProposals,
                          allowAudio: targetStandard.allowAudio,
                          allowTts: targetStandard.allowTts,
                          boardOverrides: targetStandard.boardOverrides,
                          bedtimeEnabled: targetStandard.bedtimeEnabled,
                          bedtimeStart: targetStandard.bedtimeStart,
                          bedtimeEnd: targetStandard.bedtimeEnd,
                        });
                      };

                      // Helper für reaktives Diff-Highlighting pro Zeile
                      const getHighlightProps = (featureKey: string) => {
                        const isHighlighted = Boolean(recentlyChangedDiff?.keys.includes(featureKey));
                        const changeMeta = recentlyChangedDiff?.changes[featureKey];
                        const isNewlyActivated = changeMeta?.to;

                        return {
                          isHighlighted,
                          style: {
                            background: isHighlighted ? (isNewlyActivated ? '#f0fdf4' : '#fef2f2') : '#f8fafc',
                            border: isHighlighted 
                              ? (isNewlyActivated ? '1.5px solid #86efac' : '1.5px solid #fca5a5') 
                              : '1px solid #e2e8f0',
                            boxShadow: isHighlighted 
                              ? (isNewlyActivated ? '0 0 14px rgba(22, 163, 74, 0.22)' : '0 0 14px rgba(220, 38, 38, 0.22)') 
                              : 'none',
                            transition: 'all 0.4s ease'
                          },
                          badge: isHighlighted ? (
                            <span style={{
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: isNewlyActivated ? '#dcfce7' : '#fee2e2',
                              color: isNewlyActivated ? '#15803d' : '#b91c1c',
                              border: isNewlyActivated ? '1px solid #86efac' : '1px solid #fca5a5',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {isNewlyActivated ? '✨ Neu aktiviert' : '🔒 Automatisch geschützt'}
                            </span>
                          ) : null
                        };
                      };

                      const hlTts = getHighlightProps('allowTts');
                      const hlTimer = getHighlightProps('allowTimer');
                      const hlProposals = getHighlightProps('allowProposals');
                      const hlAudio = getHighlightProps('allowAudio');
                      const hlAbsences = getHighlightProps('allowAbsences');
                      const hlReschedule = getHighlightProps('allowRescheduleConfirm');
                      const hlChat = getHighlightProps('allowChat');
                      const hlLeaderboard = getHighlightProps('allowLeaderboard');

                      // 🛡️ Termin-Updates & Schüler-Absagen seit letztem Besuch
                      const childFirstName = studentUser?.first_name || 'Dein Kind';
                      const studentCancellations = cancelledSchoolYearOccurrences.filter((occ: any) => 
                        occ.status === 'canceled_by_student' || occ.canceled_by_role === 'student'
                      );
                      const pendingReschedules = (scheduleOccurrences || []).filter((occ: any) => 
                        occ.status === 'pending_reschedule'
                      );
                      const confirmedReschedules = (scheduleOccurrences || []).filter((occ: any) => 
                        occ.status === 'rescheduled_confirmed'
                      );
                      const totalUpdatesCount = studentCancellations.length + pendingReschedules.length + confirmedReschedules.length;
                      const hasTerminUpdates = totalUpdatesCount > 0;

                      const pendingTeacherAudioRequest = (() => {
                        if (typeof window === 'undefined' || !studentId) return null;
                        const raw = localStorage.getItem(`groovelab_parent_req_teacher_audio_${studentId}`);
                        if (!raw) return null;
                        try {
                          return JSON.parse(raw);
                        } catch (e) {
                          return { requestedAt: raw, teacherName: 'Die Lehrkraft' };
                        }
                      })();

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          {/* 🛡️ Anfrage der Lehrkraft für didaktische Audio-Freigabe */}
                          {pendingTeacherAudioRequest && !curTeacherAudio && (
                            <div style={{
                              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                              borderRadius: '20px',
                              padding: '16px 18px',
                              border: '1.5px solid #86efac',
                              boxShadow: '0 4px 18px rgba(22, 163, 74, 0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '14px',
                              flexWrap: 'wrap'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
                                <div style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '12px',
                                  background: '#22c55e',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                                }}>
                                  <Headphones size={20} />
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 850, color: '#14532d' }}>
                                    Didaktische Audio-Freigabe erbeten
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                    {pendingTeacherAudioRequest.teacherName || 'Deine Lehrkraft'} bittet um Erlaubnis, im Unterricht kurze Tonaufnahmen zur Fehleranalyse und Play-Alongs aufnehmen zu dürfen.
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    applyAndSaveParentControls({ allowTeacherAudio: true });
                                    if (studentId) localStorage.removeItem(`groovelab_parent_req_teacher_audio_${studentId}`);
                                  }}
                                  style={{
                                    background: '#16a34a',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '8px 16px',
                                    fontSize: '0.80rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)'
                                  }}
                                  className="hover-scale"
                                >
                                  ✓ Jetzt freigeben
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 🛡️ Termin-Updates & Ausfälle Zusammenfassungs-Banner für Eltern */}
                          {hasTerminUpdates && !parentBriefingDismissed && (
                            <div style={{
                              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                              borderRadius: '20px',
                              padding: '16px 18px',
                              border: '1.5px solid #bae6fd',
                              boxShadow: '0 4px 18px rgba(2, 132, 199, 0.08)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '10px',
                                    background: '#e0f2fe',
                                    color: '#0284c7',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <Bell size={16} />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 850, color: '#0f172a' }}>
                                      Termin-Updates &amp; Ausfälle
                                    </div>
                                    <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
                                      Aktuelle Mitteilungen für {childFirstName}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{
                                    background: '#e0f2fe',
                                    color: '#0369a1',
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    padding: '3px 8px',
                                    borderRadius: '8px'
                                  }}>
                                    {totalUpdatesCount} {totalUpdatesCount === 1 ? 'Mitteilung' : 'Mitteilungen'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setParentBriefingDismissed(true);
                                      if (studentId) localStorage.setItem(`groovelab_parent_dismissed_briefing_${studentId}`, String(Date.now()));
                                    }}
                                    style={{
                                      background: '#0284c7',
                                      color: '#ffffff',
                                      border: 'none',
                                      padding: '5px 12px',
                                      borderRadius: '8px',
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    className="hover-scale"
                                  >
                                    <Check size={12} strokeWidth={3} />
                                    <span>Verstanden ✓</span>
                                  </button>
                                </div>
                              </div>

                              {/* Event list */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {studentCancellations.slice(0, 3).map((occ: any) => {
                                  const occD = new Date(occ.date + 'T00:00:00');
                                  const dateStr = occD.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
                                  const timeStr = occ.start_time ? `${occ.start_time.substring(0, 5)} Uhr` : '';
                                  const tName = occ.teacher ? formatTeacherFullName(occ.teacher) : (occ.teacher_name ? formatTeacherFullName(occ.teacher_name) : 'Lehrkraft');
                                  return (
                                    <div key={occ.id || `${occ.date}_${occ.start_time}`} style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '8px 12px',
                                      background: '#fee2e2',
                                      borderRadius: '10px',
                                      fontSize: '0.74rem',
                                      border: '1px solid #fca5a5'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <CalendarX size={14} color="#dc2626" />
                                        <span style={{ fontWeight: 700, color: '#991b1b' }}>
                                          {childFirstName} hat den Unterricht am {dateStr} {timeStr} abgesagt.
                                        </span>
                                      </div>
                                      <span style={{ fontSize: '0.68rem', color: '#b91c1c', fontWeight: 600 }}>
                                        {tName} informiert
                                      </span>
                                    </div>
                                  );
                                })}

                                {pendingReschedules.slice(0, 2).map((occ: any) => {
                                  const occD = new Date(occ.date + 'T00:00:00');
                                  const dateStr = occD.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
                                  const timeStr = occ.start_time ? `${occ.start_time.substring(0, 5)} Uhr` : '';
                                  return (
                                    <div key={occ.id} style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '8px 12px',
                                      background: '#fffbeb',
                                      borderRadius: '10px',
                                      fontSize: '0.74rem',
                                      border: '1px solid #fde68a'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <RotateCcw size={14} color="#d97706" />
                                        <span style={{ fontWeight: 700, color: '#92400e' }}>
                                          Ausweichtermin vorgeschlagen: {dateStr} {timeStr}
                                        </span>
                                      </div>
                                      <span style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 600 }}>
                                        Bestätigung ausstehend
                                      </span>
                                    </div>
                                  );
                                })}

                                {confirmedReschedules.slice(0, 2).map((occ: any) => {
                                  const occD = new Date(occ.date + 'T00:00:00');
                                  const dateStr = occD.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
                                  const timeStr = occ.start_time ? `${occ.start_time.substring(0, 5)} Uhr` : '';
                                  return (
                                    <div key={occ.id} style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '8px 12px',
                                      background: '#f0fdf4',
                                      borderRadius: '10px',
                                      fontSize: '0.74rem',
                                      border: '1px solid #86efac'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <CheckCircle size={14} color="#16a34a" />
                                        <span style={{ fontWeight: 700, color: '#166534' }}>
                                          Ausweichtermin bestätigt: {dateStr} {timeStr}
                                        </span>
                                      </div>
                                      <span style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 600 }}>
                                        Verbindlich fest
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 3-Tab Nav: Schutz & Freigaben | Übe-Report & Fortschritt | Absagen-Logbuch */}
                          <div style={{
                            display: 'flex',
                            background: '#e2e8f0',
                            padding: '4px',
                            borderRadius: '14px',
                            gap: '4px'
                          }}>
                            <button
                              type="button"
                              onClick={() => setParentControlsTab('governance')}
                              style={{
                                flex: 1,
                                border: 'none',
                                background: parentControlsTab === 'governance' ? '#ffffff' : 'transparent',
                                color: parentControlsTab === 'governance' ? '#0284c7' : '#64748b',
                                fontWeight: parentControlsTab === 'governance' ? 850 : 650,
                                fontSize: '0.80rem',
                                padding: '9px 8px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: parentControlsTab === 'governance' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <ShieldCheck size={16} />
                              <span>Schutz &amp; Freigaben</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setParentControlsTab('insights')}
                              style={{
                                flex: 1,
                                border: 'none',
                                background: parentControlsTab === 'insights' ? '#ffffff' : 'transparent',
                                color: parentControlsTab === 'insights' ? '#0284c7' : '#64748b',
                                fontWeight: parentControlsTab === 'insights' ? 850 : 650,
                                fontSize: '0.80rem',
                                padding: '9px 8px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: parentControlsTab === 'insights' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Clock size={16} />
                              <span>Übe-Report &amp; Fortschritt</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setParentControlsTab('cancellations')}
                              style={{
                                flex: 1,
                                border: 'none',
                                background: parentControlsTab === 'cancellations' ? '#ffffff' : 'transparent',
                                color: parentControlsTab === 'cancellations' ? '#0284c7' : '#64748b',
                                fontWeight: parentControlsTab === 'cancellations' ? 850 : 650,
                                fontSize: '0.80rem',
                                padding: '9px 8px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: parentControlsTab === 'cancellations' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <FileText size={16} />
                              <span>Absagen-Logbuch</span>
                              {cancelledSchoolYearOccurrences.length > 0 && (
                                <span style={{
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  fontSize: '0.66rem',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: '8px'
                                }}>
                                  {cancelledSchoolYearOccurrences.length}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setParentControlsTab('downloads')}
                              style={{
                                flex: 1,
                                border: 'none',
                                background: parentControlsTab === 'downloads' ? '#ffffff' : 'transparent',
                                color: parentControlsTab === 'downloads' ? '#0284c7' : '#64748b',
                                fontWeight: parentControlsTab === 'downloads' ? 850 : 650,
                                fontSize: '0.80rem',
                                padding: '9px 8px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: parentControlsTab === 'downloads' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Download size={16} />
                              <span>Downloads &amp; Tresor</span>
                            </button>
                          </div>

                          {parentControlsTab === 'governance' && (
                            <>
                              {/* 🛡️ Volljährigkeits-Selbstbestimmung (Art. 6 Abs. 1 lit. a DSGVO) */}
                              {isAdultStudent && (
                                <div style={{
                                  background: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  borderRadius: '16px',
                                  padding: '16px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  textAlign: 'left'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <ShieldCheck size={18} color="#15803d" />
                                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#15803d' }}>
                                        Volljährigkeit (§ 2 BGB): Privatsphäre &amp; Eltern-Einblick
                                      </span>
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.80rem', fontWeight: 700, color: '#15803d' }}>
                                      <input 
                                        type="checkbox" 
                                        checked={Boolean((studentUser as any)?.adult_allow_parent_access)}
                                        onChange={async (e) => {
                                          const nextVal = e.target.checked;
                                          try {
                                            if (studentUser?.id || studentId) {
                                              await supabase.from('users').update({ adult_allow_parent_access: nextVal }).eq('id', studentUser?.id || studentId);
                                              if (studentUser) (studentUser as any).adult_allow_parent_access = nextVal;
                                            }
                                          } catch (err) {}
                                        }}
                                        style={{ width: '16px', height: '16px', accentColor: '#16a34a' }}
                                      />
                                      <span>Eltern-Lesezugriff gestatten</span>
                                    </label>
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#166534', lineHeight: 1.4 }}>
                                    Als volljährige Person bestimmst du selbst über deine Daten (Art. 6 Abs. 1 lit. a DSGVO). Wenn diese Option deaktiviert ist, wird der elterliche Zugriff über die Eltern-PIN vollständig gesperrt.
                                  </div>
                                </div>
                              )}

                              {/* Campus UI Design Switcher (Junior, Teen, +16) */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            padding: '18px',
                            borderRadius: '18px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            textAlign: 'left'
                          }}>
                            <div>
                              <div style={{ fontSize: '0.92rem', fontWeight: 850, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Compass size={18} color="#0284c7" />
                                <span>App-Design &amp; Altersstufe (Campus)</span>
                              </div>
                              <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500, lineHeight: 1.4, marginTop: '2px' }}>
                                Legt fest, welche Benutzeroberfläche und Standard-Boards dein Kind in der Web-App sieht.
                              </div>
                            </div>

                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '8px',
                              background: '#e2e8f0',
                              padding: '5px',
                              borderRadius: '14px'
                            }}>
                              {[
                                { id: 'junior', label: 'Junior', age: '6–10 J.' },
                                { id: 'teen', label: 'Teen', age: '11–15 J.' },
                                { id: 'pro', label: '+16 / Pro', age: 'Ab 16 J.' }
                              ].map((lvl) => {
                                const currentLevel = currentLvlKey;
                                const active = currentLevel === lvl.id;
                                return (
                                  <button
                                    key={lvl.id}
                                    type="button"
                                    onClick={() => {
                                      handleSwitchAgeLevelWithStandard(lvl.id as any);
                                    }}
                                    style={{
                                      padding: '10px 6px',
                                      borderRadius: '11px',
                                      border: 'none',
                                      background: active ? '#ffffff' : 'transparent',
                                      color: active ? '#0284c7' : '#64748b',
                                      fontWeight: active ? 850 : 650,
                                      fontSize: '0.82rem',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      gap: '2px',
                                      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <span>{lvl.label}</span>
                                    <span style={{ fontSize: '0.66rem', opacity: active ? 0.9 : 0.7 }}>{lvl.age}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 🛡️ Feedback-Banner bei automatischem Standard-Load */}
                          {recentlyChangedDiff && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              background: '#f0f9ff',
                              border: '1px solid #bae6fd',
                              color: '#0369a1',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              animation: 'fadeIn 0.3s ease'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={16} color="#0284c7" />
                                <span>
                                  Empfohlener Standard für <strong>{recentlyChangedDiff.targetLevelLabel}</strong> geladen ({recentlyChangedDiff.keys.length} Funktion{recentlyChangedDiff.keys.length > 1 ? 'en' : ''} automatisch angepasst)
                                </span>
                              </div>
                              <span style={{ fontSize: '0.70rem', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                                Standard aktiv
                              </span>
                            </div>
                          )}

                          {/* Granular Board & Feature Toggles with Reset to Age Standard */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sliders size={16} color="#0284c7" />
                                <span>Individuelle Board- &amp; Feature-Freigaben</span>
                              </div>
                              {isDeviating ? (
                                <button
                                  type="button"
                                  onClick={() => applyAndSaveParentControls(standard)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    background: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    color: '#0369a1',
                                    fontSize: '0.72rem',
                                    fontWeight: 750,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  className="hover-scale"
                                  title={`Setzt alle Freigaben auf den empfohlenen Standard für ${standard.label} zurück`}
                                >
                                  <RotateCcw size={12} />
                                  <span>Standard für {standard.label} wiederherstellen</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.70rem', color: '#16a34a', fontWeight: 750, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Check size={12} strokeWidth={3} />
                                  <span>Standard für {standard.label} aktiv</span>
                                </span>
                              )}
                            </div>

                            {/* Toggle 1: Audio-Vorleseassistent (Sprachausgabe) */}
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 16px',
                              borderRadius: '16px',
                              cursor: 'pointer',
                              ...hlTts.style
                            }}>
                              <div style={{ paddingRight: '12px', textAlign: 'left' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <Volume2 size={16} color="#0284c7" style={{ flexShrink: 0 }} />
                                  <span>Audio-Vorleseassistent (Sprachausgabe)</span>
                                  {currentLvlKey === 'junior' && (
                                    <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: '#dcfce7', color: '#16a34a' }}>
                                      Empfohlen für Junior
                                    </span>
                                  )}
                                  {hlTts.badge}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                  Liest Hausaufgaben, Notizen und Übe-Fahrpläne kindgerecht laut auf Deutsch vor. Unverzichtbar für Leseanfänger und bei LRS/Dyslexie.
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={curTts}
                                onChange={(e) => applyAndSaveParentControls({ allowTts: e.target.checked })}
                                style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer' }}
                              />
                            </label>

                            {/* Toggle 2: Practice Board (Übe-Pfad & Fokus-Timer) */}
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 16px',
                              borderRadius: '16px',
                              cursor: 'pointer',
                              ...hlTimer.style
                            }}>
                              <div style={{ paddingRight: '12px', textAlign: 'left' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <Zap size={16} color="#0284c7" style={{ flexShrink: 0 }} />
                                  <span>Übe-Pfad &amp; Fokus-Timer</span>
                                  {hlTimer.badge}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                  {currentLvlKey === 'junior' 
                                    ? 'Pädagogischer Übe-Timer und Fleiß-Sterne ohne Verluststress für eigenständiges Üben zu Hause.'
                                    : 'Interaktiver Fokus-Timer, Kontinuität und Meilensteine für eigenständiges Üben zu Hause.'}
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={curTimer}
                                onChange={(e) => applyAndSaveParentControls({ allowTimer: e.target.checked, boardOverrides: { practice_board: e.target.checked } })}
                                style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer' }}
                              />
                            </label>

                            {/* Toggle 3: Mediathek: Songs, Begleitspuren & Fahrpläne */}
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 16px',
                              borderRadius: '16px',
                              cursor: 'pointer',
                              ...hlProposals.style
                            }}>
                              <div style={{ paddingRight: '12px', textAlign: 'left' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <Library size={16} color="#0284c7" style={{ flexShrink: 0 }} />
                                  <span>Mediathek: Songs, Begleitspuren &amp; Fahrpläne</span>
                                  {hlProposals.badge}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                  Schulkatalog, Play-Along-Tracks und strukturierte Übe-Fahrpläne. Urheberrechtskonform ohne Notenblatt-Downloads (§ 53 Abs. 4 UrhG).
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={curProposals}
                                onChange={(e) => applyAndSaveParentControls({ allowProposals: e.target.checked, boardOverrides: { mediathek: e.target.checked } })}
                                style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer' }}
                              />
                            </label>

                            {/* Toggle 4: Checkbox 1 - Eigene Song-Aufnahmen des Schülers (Art. 8 DSGVO / KUG) */}
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 16px',
                              borderRadius: '16px',
                              cursor: 'pointer',
                              ...hlAudio.style
                            }}>
                              <div style={{ paddingRight: '12px', textAlign: 'left' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <Mic size={16} color="#0284c7" style={{ flexShrink: 0 }} />
                                  <span>Eigene Tonaufnahmen des Schülers (Übe-Studio &amp; Loopstation)</span>
                                  <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1' }}>
                                    Art. 8 DSGVO
                                  </span>
                                  {hlAudio.badge}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                  Erlaubt deinem Kind, eigene Übe-Aufnahmen, Loopstation-Spuren und Memos mit dem Mikrofon aufzuzeichnen. Standardmäßig deaktiviert (Privacy by Default) zum Schutz Minderjähriger. Inkl. 30-Tage-Speicherfrist.
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={curStudentAudio && curAudio}
                                onChange={(e) => applyAndSaveParentControls({ 
                                  allowAudio: e.target.checked, 
                                  allowStudentAudio: e.target.checked, 
                                  boardOverrides: { recordings: e.target.checked } 
                                })}
                                style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer' }}
                              />
                            </label>

                            {/* Toggle 4b: Checkbox 2 - Didaktische Tonaufnahmen der Lehrkraft im Unterricht (§ 201 StGB / § 73 UrhG) */}
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 16px',
                              borderRadius: '16px',
                              cursor: 'pointer',
                              background: curTeacherAudio ? '#f0fdf4' : '#f8fafc',
                              border: curTeacherAudio ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                              transition: 'all 0.2s ease'
                            }}>
                              <div style={{ paddingRight: '12px', textAlign: 'left' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <Headphones size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                                  <span>Tonaufnahmen des Schülers durch die Lehrkraft im Unterricht</span>
                                  <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: '#dcfce7', color: '#15803d' }}>
                                    § 201 StGB / § 73 UrhG
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                  Erlaubt der Lehrkraft, im Unterricht Tonaufnahmen deines Kindes für didaktische Zwecke (Korrektur, Vorspiel-Analyse) anzufertigen. Ist dieser Schalter aus, darf die Lehrkraft zum Schutz der Schüler ausschließlich sich selbst vorspielen.
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={curTeacherAudio}
                                onChange={(e) => applyAndSaveParentControls({ allowTeacherAudio: e.target.checked })}
                                style={{ width: '20px', height: '20px', accentColor: '#16a34a', cursor: 'pointer' }}
                              />
                            </label>

                            {/* Toggle 5: Absences (Unterrichtsstunden selbstständig absagen) */}
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 16px',
                              borderRadius: '16px',
                              opacity: currentLvlKey === 'junior' ? 0.75 : 1,
                              cursor: currentLvlKey === 'junior' ? 'not-allowed' : 'pointer',
                              ...hlAbsences.style
                            }}>
                              <div style={{ paddingRight: '12px', textAlign: 'left' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: currentLvlKey === 'junior' ? '#64748b' : '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <Calendar size={16} color={currentLvlKey === 'junior' ? '#94a3b8' : '#0284c7'} style={{ flexShrink: 0 }} />
                                  <span>Unterrichtsstunden selbstständig absagen</span>
                                  {currentLvlKey === 'junior' && (
                                    <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626' }}>
                                      Im Junior-Modus gesperrt
                                    </span>
                                  )}
                                  {hlAbsences.badge}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                  {currentLvlKey === 'junior'
                                    ? 'Aus rechtlichen Gründen (Vertragsschutz der Eltern) im Junior-Modus dauerhaft deaktiviert. Absagen erfolgen über den Eltern-Zugang.'
                                    : (currentLvlKey === 'teen'
                                        ? 'Erlaubt deinem Teenager, Termine bei Verhinderung selbstständig abzusagen (Eltern erhalten sofort eine Benachrichtigung).'
                                        : 'Erlaubt eigenständige Terminabmeldung im Verhinderungsfall gemäß den Schul-Stornobedingungen.')}
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                disabled={currentLvlKey === 'junior'}
                                checked={currentLvlKey === 'junior' ? false : curAbsences}
                                onChange={(e) => {
                                  if (currentLvlKey !== 'junior') {
                                    applyAndSaveParentControls({ allowAbsences: e.target.checked });
                                  }
                                }}
                                style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: currentLvlKey === 'junior' ? 'not-allowed' : 'pointer' }}
                              />
                            </label>

                            {/* Toggle 5b: Ausweich- & Verschiebungstermine selbstständig annehmen */}
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 16px',
                              borderRadius: '16px',
                              opacity: currentLvlKey === 'junior' ? 0.75 : 1,
                              cursor: currentLvlKey === 'junior' ? 'not-allowed' : 'pointer',
                              ...hlReschedule.style
                            }}>
                              <div style={{ paddingRight: '12px', textAlign: 'left' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: currentLvlKey === 'junior' ? '#64748b' : '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <RotateCcw size={16} color={currentLvlKey === 'junior' ? '#94a3b8' : '#0284c7'} style={{ flexShrink: 0 }} />
                                  <span>Ausweich- &amp; Verschiebungstermine annehmen</span>
                                  {currentLvlKey === 'junior' && (
                                    <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626' }}>
                                      Im Junior-Modus Eltern-PIN erforderlich
                                    </span>
                                  )}
                                  {hlReschedule.badge}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                  {currentLvlKey === 'junior'
                                    ? 'Im Junior-Modus standardmäßig geschützt. Ausweichtermine müssen von den Eltern per PIN freigegeben werden.'
                                    : 'Erlaubt deinem Kind, von der Lehrkraft vorgeschlagene Ausweichtermine selbstständig anzunehmen. Wenn deaktiviert, wird die Eltern-PIN verlangt.'}
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                disabled={currentLvlKey === 'junior'}
                                checked={currentLvlKey === 'junior' ? false : curReschedule}
                                onChange={(e) => {
                                  if (currentLvlKey !== 'junior') {
                                    applyAndSaveParentControls({ allowRescheduleConfirm: e.target.checked });
                                  }
                                }}
                                style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: currentLvlKey === 'junior' ? 'not-allowed' : 'pointer' }}
                              />
                            </label>

                            {/* Toggle 6: Chat (Direktnachrichten an Lehrkräfte schreiben) */}
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 16px',
                              borderRadius: '16px',
                              cursor: 'pointer',
                              ...hlChat.style
                            }}>
                              <div style={{ paddingRight: '12px', textAlign: 'left' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <Mail size={16} color="#0284c7" style={{ flexShrink: 0 }} />
                                  <span>Direktnachrichten an Lehrkräfte schreiben</span>
                                  {hlChat.badge}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                  {currentLvlKey === 'junior'
                                    ? 'Im Junior-Modus standardmäßig deaktiviert (Kinderschutz). Erlaubt bei Freigabe nur direkte Fragen zu Hausaufgaben.'
                                    : 'Erlaubt deinem Kind, im Chat Nachrichten und Fragen zu Hausaufgaben und Songs an die Lehrkraft zu senden.'}
                                </div>
                                <div style={{ fontSize: '0.70rem', color: '#0369a1', fontWeight: 650, marginTop: '4px' }}>
                                  💬 Chatverlauf jederzeit im Menüpunkt „Nachrichten“ einsehbar.
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={curChat}
                                onChange={(e) => applyAndSaveParentControls({ allowChat: e.target.checked, boardOverrides: { messages: e.target.checked } })}
                                style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer' }}
                              />
                            </label>

                            {/* Toggle 7: Leaderboard (Klassen-Highlights & Team-Power) */}
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 16px',
                              borderRadius: '16px',
                              cursor: 'pointer',
                              ...hlLeaderboard.style
                            }}>
                              <div style={{ paddingRight: '12px', textAlign: 'left' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <Trophy size={16} color="#0284c7" style={{ flexShrink: 0 }} />
                                  <span>Klassen-Highlights &amp; Team-Power</span>
                                  {hlLeaderboard.badge}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                  {currentLvlKey === 'junior'
                                    ? 'Gemeinsame Klassen-Ziele ohne individuelle Ranglisten oder Leistungsdruck (DSA Art. 28 konform).'
                                    : 'Gemeinsame Übe-Minuten sammeln, Meilensteine der Klasse feiern und Team-Ziele erreichen.'}
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={curLeaderboard}
                                onChange={(e) => applyAndSaveParentControls({ allowLeaderboard: e.target.checked, boardOverrides: { campus_cup: e.target.checked } })}
                                style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer' }}
                              />
                            </label>
                          </div>

                        {/* Must-Have 1: Ruhezeiten & Nachtruhe-Schutz */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          padding: '18px',
                          borderRadius: '18px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          textAlign: 'left'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Moon size={18} color="#0284c7" style={{ flexShrink: 0 }} />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 850, color: '#0f172a' }}>
                                    Nachtruhe-Schutz &amp; Ruhezeiten
                                  </div>
                                  {currentLvlKey === 'junior' && (
                                    <span style={{ background: '#e0f2fe', color: '#0284c7', fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px' }}>
                                      Junior-Standard: 20:00 – 07:00
                                    </span>
                                  )}
                                  {currentLvlKey === 'teen' && (
                                    <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px' }}>
                                      Teen-Standard: 21:30 – 06:30
                                    </span>
                                  )}
                                  {currentLvlKey === 'pro' && (
                                    <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px' }}>
                                      Pro-Standard: 24h Zugriff
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                  {currentLvlKey === 'junior' 
                                    ? 'Schützt vor Reizüberflutung und sichert gesunden Schlaf (20:00 – 07:00 Uhr). Jederzeit per Eltern-PIN entsperrbar.'
                                    : currentLvlKey === 'teen'
                                    ? 'Altersgerechte Ruhezeit ab 21:30 Uhr (Schutz vor nächtlichen Push-Nachrichten & Chat-Stress).'
                                    : '24h freier Übezugriff für Pro-Musiker & Erwachsene. Ruhezeiten können bei Bedarf manuell aktiviert werden.'}
                                </div>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={bedtimeModeEnabled}
                              onChange={(e) => handleUpdateBedtime(e.target.checked)}
                              style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer', flexShrink: 0 }}
                            />
                          </div>

                          {bedtimeModeEnabled && (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '10px',
                              padding: '12px',
                              borderRadius: '12px',
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              marginTop: '4px'
                            }}>
                              <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                  Ruhezeit ab:
                                </label>
                                <select
                                  value={bedtimeStart}
                                  onChange={(e) => handleUpdateBedtime(true, e.target.value, bedtimeEnd)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    background: '#f8fafc',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'].map(t => (
                                    <option key={t} value={t}>{t} Uhr</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                  Aufwachen um:
                                </label>
                                <select
                                  value={bedtimeEnd}
                                  onChange={(e) => handleUpdateBedtime(true, bedtimeStart, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    background: '#f8fafc',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00'].map(t => (
                                    <option key={t} value={t}>{t} Uhr</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Must-Have 1b: Schulzeit- & Hausaufgaben-Fokus (Tages-Sperrfenster) */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          padding: '18px',
                          borderRadius: '18px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          textAlign: 'left'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <BookOpen size={18} color="#6366f1" style={{ flexShrink: 0 }} />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 850, color: '#0f172a' }}>
                                    Schulzeit- &amp; Hausaufgaben-Fokus
                                  </div>
                                  <span style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px' }}>
                                    Tages-Sperre
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                  Pausiert die App während der regulären Schulzeit oder Hausaufgaben, um Ablenkung zu vermeiden.
                                </div>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={daytimeLockEnabled}
                              onChange={(e) => handleUpdateDaytimeLock(e.target.checked)}
                              style={{ width: '20px', height: '20px', accentColor: '#6366f1', cursor: 'pointer', flexShrink: 0 }}
                            />
                          </div>

                          {daytimeLockEnabled && (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                              padding: '12px',
                              borderRadius: '12px',
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              marginTop: '4px'
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                    Sperre ab:
                                  </label>
                                  <select
                                    value={daytimeLockStart}
                                    onChange={(e) => handleUpdateDaytimeLock(true, e.target.value, daytimeLockEnd, daytimeLockDays)}
                                    style={{
                                      width: '100%',
                                      padding: '8px 10px',
                                      borderRadius: '8px',
                                      border: '1px solid #cbd5e1',
                                      fontSize: '0.82rem',
                                      fontWeight: 700,
                                      color: '#0f172a',
                                      background: '#f8fafc',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {['07:30', '08:00', '08:30', '09:00', '13:00', '13:30', '14:00', '14:30'].map(t => (
                                      <option key={t} value={t}>{t} Uhr</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                    Entsperren um:
                                  </label>
                                  <select
                                    value={daytimeLockEnd}
                                    onChange={(e) => handleUpdateDaytimeLock(true, daytimeLockStart, e.target.value, daytimeLockDays)}
                                    style={{
                                      width: '100%',
                                      padding: '8px 10px',
                                      borderRadius: '8px',
                                      border: '1px solid #cbd5e1',
                                      fontSize: '0.82rem',
                                      fontWeight: 700,
                                      color: '#0f172a',
                                      background: '#f8fafc',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {['12:00', '12:30', '13:00', '13:30', '14:00', '15:00', '15:30', '16:00', '17:00'].map(t => (
                                      <option key={t} value={t}>{t} Uhr</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '4px' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>Gültigkeit:</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDaytimeLock(true, daytimeLockStart, daytimeLockEnd, 'school_days')}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    border: '1px solid',
                                    borderColor: daytimeLockDays === 'school_days' ? '#6366f1' : '#cbd5e1',
                                    background: daytimeLockDays === 'school_days' ? '#e0e7ff' : '#f8fafc',
                                    color: daytimeLockDays === 'school_days' ? '#4338ca' : '#64748b',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Mo – Fr (Schultage)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDaytimeLock(true, daytimeLockStart, daytimeLockEnd, 'everyday')}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    border: '1px solid',
                                    borderColor: daytimeLockDays === 'everyday' ? '#6366f1' : '#cbd5e1',
                                    background: daytimeLockDays === 'everyday' ? '#e0e7ff' : '#f8fafc',
                                    color: daytimeLockDays === 'everyday' ? '#4338ca' : '#64748b',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Täglich
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Must-Have 1c: 1-Tap Sofortpause ("Familienzeit / Bildschirm-Auszeit") */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          padding: '18px',
                          borderRadius: '18px',
                          background: isCurrentlyInInstantLock ? '#fffbeb' : '#f8fafc',
                          border: isCurrentlyInInstantLock ? '1.5px solid #fde68a' : '1px solid #e2e8f0',
                          textAlign: 'left'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Coffee size={18} color="#d97706" style={{ flexShrink: 0 }} />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 850, color: '#0f172a' }}>
                                    1-Tap Sofortpause („Familienzeit“)
                                  </div>
                                  {isCurrentlyInInstantLock && (
                                    <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px' }}>
                                      Aktiv bis {new Date(instantLockUntil!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Uhr
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                  Sperrt die App sofort für gemeinsame Familienzeit oder Mahlzeiten, ohne Einstellungen zu verändern.
                                </div>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleSetInstantLock(30)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#1e293b',
                                cursor: 'pointer'
                              }}
                              className="hover-scale"
                            >
                              +30 Min. Pause
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetInstantLock(60)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#1e293b',
                                cursor: 'pointer'
                              }}
                              className="hover-scale"
                            >
                              +60 Min. (Essen/Familie)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetInstantLock(-1)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#1e293b',
                                cursor: 'pointer'
                              }}
                              className="hover-scale"
                            >
                              Bis morgen früh
                            </button>
                            {isCurrentlyInInstantLock && (
                              <button
                                type="button"
                                onClick={() => handleSetInstantLock(null)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  background: '#fee2e2',
                                  border: '1px solid #fca5a5',
                                  color: '#b91c1c',
                                  cursor: 'pointer'
                                }}
                                className="hover-scale"
                              >
                                Pause jetzt beenden
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Must-Have 2: Verknüpfte Familien-Profile (Administrative Geräteverwaltung) */}
                        {familyProfiles.length > 0 && (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            padding: '22px 20px',
                            borderRadius: '22px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            textAlign: 'left'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '10px',
                                background: '#e0f2fe',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <Users size={18} color="#0284c7" />
                              </div>
                              <div>
                                <div style={{ fontSize: '0.92rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.01em' }}>
                                  Familien-Profile &amp; Geschwister (Schnellwechsel)
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                  Wähle dein Profil: Wechsle per Fingertipp blitzschnell zwischen Geschwisterprofilen – ohne ständige PIN-Eingabe.
                                </div>
                              </div>
                            </div>

                            {/* Family Profiles Carousel / Stage */}
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'flex-start',
                              gap: '16px', 
                              flexWrap: 'wrap', 
                              marginTop: '8px' 
                            }}>
                              {familyProfiles.map((member: any) => {
                                const isCurrent = member.id === studentId;
                                const memberInst = member.instrument || (isCurrent ? studentUser?.instrument : 'Gitarre') || 'Gitarre';
                                const defaultInstAvatar = getInstrumentAvatarUrl(memberInst);
                                
                                // Robust avatar URL resolution
                                let avatarSrc = defaultInstAvatar;
                                const rawPhoto = member.photo_url;
                                if (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim() && rawPhoto !== '/campus_login_hero.png') {
                                  const p = rawPhoto.trim();
                                  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:image/')) {
                                    avatarSrc = p;
                                  } else if (p.startsWith('/avatars/') || p.startsWith('/avatar_')) {
                                    avatarSrc = p;
                                  } else if (p.startsWith('/')) {
                                    avatarSrc = p;
                                  } else {
                                    const matched = STUDENT_AVATARS.find(a => a.id === p || a.url === p);
                                    if (matched) {
                                      avatarSrc = matched.url;
                                    } else if (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg')) {
                                      avatarSrc = `/avatars/${p}`;
                                    }
                                  }
                                }

                                return (
                                  <div
                                    key={member.id}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      width: '100px',
                                      position: 'relative',
                                      textAlign: 'center'
                                    }}
                                  >
                                    {/* Squircle Avatar Button */}
                                    <button
                                      type="button"
                                      onClick={() => !isCurrent && handleSwitchFamilyStudent(member.id)}
                                      style={{
                                        position: 'relative',
                                        width: '72px',
                                        height: '72px',
                                        borderRadius: '20px',
                                        padding: 0,
                                        border: isCurrent ? '3px solid #0284c7' : '2.5px solid #ffffff',
                                        background: '#ffffff',
                                        cursor: isCurrent ? 'default' : 'pointer',
                                        boxShadow: isCurrent 
                                          ? '0 8px 24px -4px rgba(2, 132, 199, 0.4), 0 2px 8px rgba(0,0,0,0.06)' 
                                          : '0 4px 14px rgba(0,0,0,0.08)',
                                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                      className={!isCurrent ? "hover-scale" : undefined}
                                      title={isCurrent ? `${member.first_name} (Aktives Profil)` : `Zu ${member.first_name} wechseln`}
                                    >
                                      <img
                                        src={avatarSrc}
                                        alt={member.first_name || 'Schüler'}
                                        onError={(e) => {
                                          const img = e.currentTarget;
                                          const fallback = getInstrumentAvatarUrl(memberInst);
                                          if (img.src !== fallback && !img.src.endsWith(fallback)) {
                                            img.src = fallback;
                                          } else {
                                            img.src = '/avatars/gitarre_avatar_new.png';
                                          }
                                        }}
                                        style={{ 
                                          width: '100%', 
                                          height: '100%', 
                                          objectFit: 'cover', 
                                          background: '#f1f5f9',
                                          display: 'block'
                                        }}
                                      />
                                      {isCurrent && (
                                        <div style={{
                                          position: 'absolute',
                                          inset: 0,
                                          border: '2px solid rgba(255,255,255,0.6)',
                                          borderRadius: '17px',
                                          pointerEvents: 'none'
                                        }} />
                                      )}
                                    </button>

                                    {/* Unlink Badge for non-current profiles */}
                                    {!isCurrent && (
                                      <button
                                        type="button"
                                        onClick={(e) => handleRemoveFamilyProfile(member.id, e)}
                                        style={{
                                          position: 'absolute',
                                          top: '-4px',
                                          right: '8px',
                                          width: '22px',
                                          height: '22px',
                                          borderRadius: '50%',
                                          background: '#ffffff',
                                          border: '1.5px solid #cbd5e1',
                                          color: '#64748b',
                                          padding: 0,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                          transition: 'all 0.15s ease',
                                          zIndex: 2
                                        }}
                                        className="hover-scale"
                                        title={`${member.first_name} von diesem Gerät entfernen`}
                                      >
                                        <X size={12} strokeWidth={2.5} />
                                      </button>
                                    )}

                                    {/* Profile Name */}
                                    <div style={{
                                      fontSize: '0.84rem',
                                      fontWeight: 850,
                                      color: isCurrent ? '#0284c7' : '#0f172a',
                                      marginTop: '8px',
                                      width: '100%',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      lineHeight: 1.2
                                    }}>
                                      {member.first_name} {member.last_name ? member.last_name.trim().charAt(0) + '.' : ''}
                                    </div>

                                    {/* Status / Instrument Badge */}
                                    {isCurrent ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '0.66rem',
                                        fontWeight: 800,
                                        color: '#0284c7',
                                        background: '#e0f2fe',
                                        padding: '2px 7px',
                                        borderRadius: '8px',
                                        marginTop: '4px'
                                      }}>
                                        ● Aktiv
                                      </span>
                                    ) : (
                                      <span style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        color: '#64748b',
                                        marginTop: '3px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '100%'
                                      }}>
                                        {member.instrument || 'Schüler'}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Netflix-Style Iconic "+ Kind hinzufügen" Tile */}
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                width: '100px',
                                textAlign: 'center'
                              }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAddSiblingModalOpen(true);
                                  }}
                                  style={{
                                    width: '72px',
                                    height: '72px',
                                    borderRadius: '20px',
                                    border: '2px dashed #94a3b8',
                                    background: '#ffffff',
                                    color: '#0284c7',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '2px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                  }}
                                  className="hover-scale"
                                  title="Weiteres Kind per QR-Ausweis hinzufügen"
                                >
                                  <QrCode size={24} color="#0284c7" />
                                </button>

                                <div style={{
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  color: '#0284c7',
                                  marginTop: '8px',
                                  lineHeight: 1.2
                                }}>
                                  + Kind
                                </div>
                                <span style={{
                                  fontSize: '0.66rem',
                                  fontWeight: 600,
                                  color: '#94a3b8',
                                  marginTop: '2px'
                                }}>
                                  QR-Scan
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Real-time sync status footer bar */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 16px',
                          borderRadius: '14px',
                          background: '#e6f4ea',
                          border: '1px solid #bbf7d0',
                          color: '#15803d',
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}>
                          <ShieldCheck size={16} color="#15803d" style={{ flexShrink: 0 }} />
                          <span>Alle Einstellungen werden in Echtzeit gespeichert und in der App übernommen.</span>
                        </div>
                            </>
                          )}

                          {/* Tab 2: Wöchentlicher Übe-Report & Fortschritt */}
                          {parentControlsTab === 'insights' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              {/* 📊 Eltern-Wochenreport & Übe-Insights */}
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '14px',
                                padding: '22px 20px',
                                borderRadius: '22px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
                                textAlign: 'left'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '10px',
                                      background: '#e6f4ea',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      <Clock size={18} color="#16a34a" />
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '0.94rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.01em' }}>
                                        Wöchentlicher Übe-Report &amp; Fortschritt
                                      </div>
                                      <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                        100% datenschutzkonforme Zusammenfassung der Übe-Einheiten zu Hause.
                                      </div>
                                    </div>
                                  </div>
                                  <span style={{
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.70rem',
                                    fontWeight: 800
                                  }}>
                                    Aktuelle Woche
                                  </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '4px' }}>
                                  <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '14px', padding: '14px' }}>
                                    <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Übe-Minuten</div>
                                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>
                                      {totalPracticeMinutes} Min.
                                    </div>
                                    <div style={{ fontSize: '0.70rem', color: '#94a3b8', marginTop: '2px' }}>Ziel: {getTargetMinutes(avatar?.streak_flame || 0)} Min./Tag</div>
                                  </div>

                                  <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '14px', padding: '12px' }}>
                                    <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Aktiver Streak</div>
                                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0284c7', marginTop: '2px' }}>
                                      {avatar?.streak_flame || 0} Tage
                                    </div>
                                    <div style={{ fontSize: '0.70rem', color: '#94a3b8', marginTop: '2px' }}>3 Schutzschilde aktiv</div>
                                  </div>

                                  <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '14px', padding: '12px' }}>
                                    <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Campus-XP</div>
                                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ca8a04', marginTop: '2px' }}>
                                      {(avatar as any)?.experience_points || (avatar as any)?.xp || 0} XP
                                    </div>
                                    <div style={{ fontSize: '0.70rem', color: '#94a3b8', marginTop: '2px' }}>Level {avatar?.evolution_level || 1} erreicht</div>
                                  </div>
                                </div>
                              </div>

                              {/* Pädagogische Leitlinie & Entlastung */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '16px 18px',
                                borderRadius: '16px',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#15803d',
                                textAlign: 'left'
                              }}>
                                <Sparkles size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div style={{ fontSize: '0.78rem', lineHeight: 1.45 }}>
                                  <strong style={{ display: 'block', marginBottom: '2px', fontSize: '0.84rem' }}>
                                    Pädagogische Motivation ohne Leistungsdruck
                                  </strong>
                                  {currentLvlKey === 'junior'
                                    ? 'Im Junior-Modus steht die Freude am Instrument im Vordergrund. 10 bis 15 Minuten spielerisches Üben an 3–4 Tagen pro Woche reichen völlig aus, um nachhaltige motorische Gewohnheiten zu verankern.'
                                    : currentLvlKey === 'teen'
                                    ? 'Im Teen-Modus stärkt der Fokus-Timer die Selbstorganisation. Kontinuierliche Einheiten von 20 bis 30 Minuten fördern die Repertoire-Festigung vor der nächsten Musikstunde.'
                                    : 'Pro-Modus: Vertiefung von Phrasierung, Technik und Repertoire. Zielgerichtete Sessions ab 30 bis 45 Minuten für fortgeschrittene Musiker.'}
                                </div>
                              </div>

                              {/* DSGVO Transparenz-Hinweis */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px 16px',
                                borderRadius: '14px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: '#64748b',
                                fontSize: '0.74rem'
                              }}>
                                <ShieldCheck size={16} color="#64748b" style={{ flexShrink: 0 }} />
                                <span>DSGVO-zertifiziert: Keine Verhaltens-Scorecards, keine Werbetracker. Die Übedaten verbleiben ausschließlich zwischen Familie, Schüler und Musikschule.</span>
                              </div>
                            </div>
                          )}

                          {/* Tab 3: Revisionssicheres Absagen-Logbuch */}
                          {parentControlsTab === 'cancellations' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              {/* Absagen-Logbuch Header Card */}
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                padding: '20px',
                                borderRadius: '20px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
                                textAlign: 'left'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '10px',
                                      background: cancelledSchoolYearOccurrences.length > 0 ? '#fee2e2' : '#e6f4ea',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      {cancelledSchoolYearOccurrences.length > 0 ? (
                                        <AlertTriangle size={18} color="#dc2626" />
                                      ) : (
                                        <ShieldCheck size={18} color="#16a34a" />
                                      )}
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '0.94rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.01em' }}>
                                        Revisionssicheres Absagen-Logbuch
                                      </div>
                                      <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                                        Schuljahr {new Date().getMonth() >= 8 ? `${new Date().getFullYear()}/${new Date().getFullYear() + 1}` : `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`} – Chronologische Dokumentation aller Unterrichtsabsagen.
                                      </div>
                                    </div>
                                  </div>
                                  <span style={{
                                    background: cancelledSchoolYearOccurrences.length > 0 ? '#fee2e2' : '#e6f4ea',
                                    color: cancelledSchoolYearOccurrences.length > 0 ? '#b91c1c' : '#15803d',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 800
                                  }}>
                                    {cancelledSchoolYearOccurrences.length} {cancelledSchoolYearOccurrences.length === 1 ? 'Absage' : 'Absagen'}
                                  </span>
                                </div>

                                {/* Summary KPI Badges */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginTop: '4px' }}>
                                  <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '10px 12px' }}>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Gesamt im Schuljahr</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                                      {cancelledSchoolYearOccurrences.length}
                                    </div>
                                  </div>
                                  <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '10px 12px' }}>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Durch Familie/Schüler</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>
                                      {cancelledSchoolYearOccurrences.filter((o: any) => o.status === 'canceled_by_student' || o.canceled_by_role === 'student').length}
                                    </div>
                                  </div>
                                  <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '10px 12px' }}>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Durch Lehrkraft/Schule</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#d97706', marginTop: '2px' }}>
                                      {cancelledSchoolYearOccurrences.filter((o: any) => o.status === 'teacher_sick' || o.status === 'canceled_by_teacher_sick' || (o.status === 'cancelled' && o.canceled_by_role !== 'student')).length}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* List of cancelled occurrences */}
                              {cancelledSchoolYearOccurrences.length === 0 ? (
                                <div style={{
                                  padding: '36px 20px',
                                  borderRadius: '18px',
                                  background: '#f0fdf4',
                                  border: '1.5px dashed #86efac',
                                  textAlign: 'center',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '10px'
                                }}>
                                  <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: '#dcfce7',
                                    color: '#16a34a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <CheckCircle size={26} />
                                  </div>
                                  <div style={{ fontSize: '0.92rem', fontWeight: 850, color: '#15803d' }}>
                                    Keine Unterrichtsabsagen in diesem Schuljahr
                                  </div>
                                  <div style={{ fontSize: '0.76rem', color: '#166534', maxWidth: '380px', lineHeight: 1.4 }}>
                                    Vorbildliche Kontinuität! Alle geplanten Unterrichtsstunden haben regulär stattgefunden bzw. sind wie geplant angesetzt.
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  {cancelledSchoolYearOccurrences.map((occ: any) => {
                                    const occDate = new Date(occ.date + 'T00:00:00');
                                    const dateFormatted = occDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
                                    const isStudentCancel = occ.status === 'canceled_by_student' || occ.canceled_by_role === 'student';
                                    const isTeacherSick = occ.status === 'teacher_sick' || occ.status === 'canceled_by_teacher_sick';
                                    const teacherName = occ.teacher ? formatTeacherFullName(occ.teacher) : (occ.teacher_name ? formatTeacherFullName(occ.teacher_name) : 'Deine Lehrkraft');

                                    return (
                                      <div
                                        key={occ.id || `${occ.date}_${occ.start_time}`}
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '10px',
                                          padding: '16px',
                                          borderRadius: '16px',
                                          background: '#ffffff',
                                          border: '1px solid #fee2e2',
                                          boxShadow: '0 2px 8px rgba(220, 38, 38, 0.04)',
                                          textAlign: 'left'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                              width: '32px',
                                              height: '32px',
                                              borderRadius: '10px',
                                              background: isStudentCancel ? '#fee2e2' : '#fef3c7',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              flexShrink: 0
                                            }}>
                                              <CalendarX size={16} color={isStudentCancel ? '#dc2626' : '#d97706'} />
                                            </div>
                                            <div>
                                              <div style={{ fontSize: '0.88rem', fontWeight: 850, color: '#0f172a' }}>
                                                {dateFormatted} {occ.start_time ? `• ${occ.start_time.substring(0, 5)} Uhr` : ''}
                                              </div>
                                              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                                                Coach: {teacherName} {occ.instrument ? `• ${occ.instrument}` : ''}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Status Badge */}
                                          <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            fontSize: '0.70rem',
                                            fontWeight: 800,
                                            background: isStudentCancel ? '#fee2e2' : '#fef3c7',
                                            color: isStudentCancel ? '#b91c1c' : '#b45309',
                                            border: isStudentCancel ? '1px solid #fca5a5' : '1px solid #fde68a'
                                          }}>
                                            {isStudentCancel ? '❌ Durch Schüler/Eltern storniert' : isTeacherSick ? '⚠️ Durch Lehrkraft entfallen (Terminabsage)' : '⚠️ Unterricht abgesagt'}
                                          </span>
                                        </div>

                                        {/* Cancellation Reason if provided */}
                                        {occ.cancel_reason && (
                                          <div style={{
                                            fontSize: '0.74rem',
                                            color: '#475569',
                                            background: '#f8fafc',
                                            padding: '6px 10px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0'
                                          }}>
                                            <strong>Grund:</strong> {occ.cancel_reason}
                                          </div>
                                        )}

                                        {/* Action row: Undo cancellation */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '6px' }}>
                                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                            Protokolliert im Schulplan
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleUndoCancelOccurrence(occ, true)}
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '5px',
                                              padding: '5px 12px',
                                              borderRadius: '8px',
                                              background: '#f0fdf4',
                                              border: '1px solid #86efac',
                                              color: '#15803d',
                                              fontSize: '0.74rem',
                                              fontWeight: 800,
                                              cursor: 'pointer'
                                            }}
                                            className="hover-scale"
                                            title="Absage widerrufen und Termin im Stundenplan reaktivieren"
                                          >
                                            <RotateCcw size={13} />
                                            <span>Absage zurücknehmen</span>
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Legal Notice */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: '#64748b',
                                fontSize: '0.70rem'
                              }}>
                                <ShieldCheck size={14} color="#64748b" style={{ flexShrink: 0 }} />
                                <span>Rechtssicher dokumentiert nach § 241 Abs. 2 BGB und der Musikschulordnung. Stornierungsfristen richten sich nach dem Unterrichtsvertrag.</span>
                              </div>
                            </div>
                          )}

                          {/* Tab 4: Downloads & Didaktik-Datentresor (DSGVO Art. 20) */}
                          {parentControlsTab === 'downloads' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              {/* Header Card */}
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                padding: '24px',
                                borderRadius: '24px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.04)',
                                textAlign: 'left'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                      width: '44px',
                                      height: '44px',
                                      borderRadius: '14px',
                                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                      border: '1px solid #bfdbfe',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#2563eb',
                                      flexShrink: 0
                                    }}>
                                      <Download size={22} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '1.08rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em' }}>
                                        Downloads &amp; Didaktik-Datentresor
                                      </div>
                                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, lineHeight: 1.4, marginTop: '2px' }}>
                                        Volle Datensouveränität nach Art. 20 DSGVO. Sichere alle Übedaten, Audioaufnahmen und Sammel-Sticker auf deinem lokalen Rechner.
                                      </div>
                                    </div>
                                  </div>
                                  <span style={{
                                    background: '#ecfdf5',
                                    color: '#15803d',
                                    padding: '5px 12px',
                                    borderRadius: '100px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    border: '1px solid #bbf7d0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                  }}>
                                    <ShieldCheck size={14} />
                                    <span>DSGVO Art. 20 konform</span>
                                  </span>
                                </div>

                                {downloadProgressMsg && (
                                  <div style={{
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: '12px',
                                    padding: '10px 14px',
                                    color: '#1e40af',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    <RotateCcw size={16} className="spin-slow" />
                                    <span>{downloadProgressMsg}</span>
                                  </div>
                                )}

                                {downloadFeedback && (
                                  <div style={{
                                    background: downloadFeedback.includes('Fehler') ? '#fef2f2' : '#f0fdf4',
                                    border: `1px solid ${downloadFeedback.includes('Fehler') ? '#fecaca' : '#bbf7d0'}`,
                                    borderRadius: '12px',
                                    padding: '10px 14px',
                                    color: downloadFeedback.includes('Fehler') ? '#dc2626' : '#15803d',
                                    fontSize: '0.82rem',
                                    fontWeight: 800,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    <CheckCircle size={16} />
                                    <span>{downloadFeedback}</span>
                                  </div>
                                )}
                              </div>

                              {/* 4 Modular Download Cards */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                
                                {/* 1. Vollständiges Meisterwerk-Archiv (.ZIP) */}
                                <div style={{
                                  background: '#ffffff',
                                  border: '1.5px solid #e2e8f0',
                                  borderRadius: '20px',
                                  padding: '20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '16px',
                                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                                  textAlign: 'left'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '620px' }}>
                                    <div style={{
                                      width: '46px',
                                      height: '46px',
                                      borderRadius: '14px',
                                      background: '#fef3c7',
                                      border: '1px solid #fde68a',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#b45309',
                                      fontSize: '1.3rem',
                                      flexShrink: 0
                                    }}>
                                      📦
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                                        Vollständiges Meisterwerk-Archiv (.ZIP)
                                      </div>
                                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '2px', lineHeight: 1.45 }}>
                                        Enthält alle eigenen Tonaufnahmen aus dem Audio-Tresor, die Audio-Biografie, das <strong>komplette Sammel-Sticker-Album</strong> und die didaktische Chronik.
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleDownloadFullArchive}
                                    disabled={downloadingSection !== null}
                                    style={{
                                      background: '#0f172a',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '14px',
                                      padding: '10px 18px',
                                      fontSize: '0.84rem',
                                      fontWeight: 850,
                                      cursor: downloadingSection !== null ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                                      opacity: downloadingSection !== null ? 0.6 : 1
                                    }}
                                  >
                                    <Download size={15} />
                                    <span>{downloadingSection === 'full' ? 'Exportiert...' : 'Komplett-ZIP herunterladen'}</span>
                                  </button>
                                </div>

                                {/* 2. Nur Audio-Tresor & Übeaufnahmen (.ZIP) */}
                                <div style={{
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '20px',
                                  padding: '20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '16px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                  textAlign: 'left'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '620px' }}>
                                    <div style={{
                                      width: '46px',
                                      height: '46px',
                                      borderRadius: '14px',
                                      background: '#eff6ff',
                                      border: '1px solid #bfdbfe',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#2563eb',
                                      fontSize: '1.3rem',
                                      flexShrink: 0
                                    }}>
                                      🎙️
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                                        Audio-Tresor &amp; Übeaufnahmen (.ZIP)
                                      </div>
                                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '2px', lineHeight: 1.45 }}>
                                        Alle selbst eingespielten Übe-Takes, Loopstation-Sessions und Hausaufgaben-Mitschnitte als sauber benannte Audiodateien.
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleDownloadAudioOnly}
                                    disabled={downloadingSection !== null}
                                    style={{
                                      background: '#2563eb',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '14px',
                                      padding: '10px 18px',
                                      fontSize: '0.84rem',
                                      fontWeight: 850,
                                      cursor: downloadingSection !== null ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      boxShadow: '0 3px 10px rgba(37, 99, 235, 0.2)',
                                      opacity: downloadingSection !== null ? 0.6 : 1
                                    }}
                                  >
                                    <Download size={15} />
                                    <span>{downloadingSection === 'audio' ? 'Lade Audios...' : 'Audio-Paket herunterladen'}</span>
                                  </button>
                                </div>

                                {/* 3. Nur Audio-Biografie & Meilensteine (.ZIP) */}
                                <div style={{
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '20px',
                                  padding: '20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '16px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                  textAlign: 'left'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '620px' }}>
                                    <div style={{
                                      width: '46px',
                                      height: '46px',
                                      borderRadius: '14px',
                                      background: '#fdf4ff',
                                      border: '1px solid #f5d0fe',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#c026d3',
                                      fontSize: '1.3rem',
                                      flexShrink: 0
                                    }}>
                                      🌟
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                                        Audio-Biografie &amp; Meilensteine (.ZIP)
                                      </div>
                                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '2px', lineHeight: 1.45 }}>
                                        Die kuratierten Highlight-Aufnahmen deiner musikalischen Meilensteine (Erster Song, Bühnenerfolge, Lieblingsstücke).
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleDownloadBiographyOnly}
                                    disabled={downloadingSection !== null}
                                    style={{
                                      background: '#a21caf',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '14px',
                                      padding: '10px 18px',
                                      fontSize: '0.84rem',
                                      fontWeight: 850,
                                      cursor: downloadingSection !== null ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      boxShadow: '0 3px 10px rgba(162, 28, 175, 0.2)',
                                      opacity: downloadingSection !== null ? 0.6 : 1
                                    }}
                                  >
                                    <Download size={15} />
                                    <span>{downloadingSection === 'biography' ? 'Lade Meilensteine...' : 'Biografie-ZIP herunterladen'}</span>
                                  </button>
                                </div>

                                {/* 4. Didaktik-Chronik, Urkunden & Sammel-Sticker (.JSON / .PDF) */}
                                <div style={{
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '20px',
                                  padding: '20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '16px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                  textAlign: 'left'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '620px' }}>
                                    <div style={{
                                      width: '46px',
                                      height: '46px',
                                      borderRadius: '14px',
                                      background: '#f0fdf4',
                                      border: '1px solid #bbf7d0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#16a34a',
                                      fontSize: '1.3rem',
                                      flexShrink: 0
                                    }}>
                                      📜
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                                        Didaktik-Chronik, Urkunden &amp; Sammel-Sticker (.JSON / .PDF)
                                      </div>
                                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '2px', lineHeight: 1.45 }}>
                                        Das <strong>komplette Sammel-Sticker-Album</strong> mit allen freigeschalteten Badges, Emojis, Erwerbsdaten und didaktischen Lehrkraft-Begründungen sowie die offizielle DSGVO-Chronik.
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleDownloadChronicleAndStickers}
                                    disabled={downloadingSection !== null}
                                    style={{
                                      background: '#16a34a',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '14px',
                                      padding: '10px 18px',
                                      fontSize: '0.84rem',
                                      fontWeight: 850,
                                      cursor: downloadingSection !== null ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      boxShadow: '0 3px 10px rgba(22, 163, 74, 0.2)',
                                      opacity: downloadingSection !== null ? 0.6 : 1
                                    }}
                                  >
                                    <Download size={15} />
                                    <span>{downloadingSection === 'chronicle' ? 'Exportiere...' : 'Sticker & Chronik exportieren'}</span>
                                  </button>
                                </div>

                              </div>

                              {/* Protection Notice */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 16px',
                                borderRadius: '14px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: '#64748b',
                                fontSize: '0.72rem',
                                lineHeight: 1.4
                              }}>
                                <ShieldCheck size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                                <span><strong>Schutz der Privatsphäre:</strong> Der Export enthält ausschließlich Daten des Schülers. Interne Vermerke und persönliche Lehrkraft-Notizen bleiben zum Schutz der Lehrkräfte strikt unzugänglich.</span>
                              </div>

                            </div>
                          )}
                      </div>
                    );
                  })()}

                    {activeStudentSettingsModal === 'notifications' && (
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#ef4444', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800 }}>
                                <span>🔒 Nur für aktive Schüler</span>
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
                              fontWeight: 600
                            }}>
                              <strong>💡 iOS / iPhone Info:</strong> Um Benachrichtigungen auf Apple-Geräten zu aktivieren, musst du die App zuerst auf deinem Homescreen installieren: Tippe im Safari-Browser auf das <strong>Teilen-Symbol (Box mit Pfeil nach oben)</strong> und wähle <strong>"Zum Home-Bildschirm"</strong>. Öffne Campus-Groovelab danach über das neue App-Icon auf deinem Homescreen.
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
                                      await supabase.from('users').update({ [row.dbKey]: nextVal }).eq('id', studentId);
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

                    {activeStudentSettingsModal === 'security' && (() => {
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
                                      setPinFormSuccess('Deine 6-stellige Eltern-PIN wurde erfolgreich gespeichert! 🛡️');
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
                                      setPinFormSuccess('Deine 4-stellige Schüler-PIN wurde erfolgreich gespeichert! 🎒');
                                      setStudentUser((prev: any) => prev ? {
                                        ...prev,
                                        is_pin_activated: true,
                                        has_personal_pin: true,
                                        personal_pin: pinFormNew
                                      } : prev);
                                      if (onProfileUpdate) {
                                        try { onProfileUpdate({ is_pin_activated: true, personal_pin: pinFormNew }); } catch (e) {}
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
                            {['⏱️ Übe-Timer & Streaks', '🎙️ Audio-Loopstation', '📖 Hausaufgabenheft & Notizen', '🎵 Audio-Biografie'].map((feat) => (
                              <span key={feat} style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: '#1e293b',
                                background: '#f1f5f9',
                                padding: '4px 10px',
                                borderRadius: '8px'
                              }}>
                                {feat}
                              </span>
                            ))}
                          </div>

                          {/* Action Button */}
                          <div style={{ paddingTop: '6px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9' }}>
                            {studentUser?.is_campus_active ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '0.76rem', color: '#15803d', fontWeight: 700 }}>
                                  ✓ Aktiv für das laufende Schuljahr
                                </span>
                                <button
                                  type="button"
                                  onClick={handleDownloadGoBdReceipt}
                                  style={{
                                    background: '#ffffff',
                                    border: '1.5px solid #cbd5e1',
                                    borderRadius: '8px',
                                    padding: '5px 10px',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title="Offizielle GoBD-Zahlungsquittung für Steuererklärung / Arbeitgeber-Zuschuss herunterladen"
                                >
                                  <Download size={13} />
                                  <span>GoBD-Quittung (PDF)</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  handleCloseSettingsModal();
                                  setShowParentActivationModal(true);
                                }}
                                style={{
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '12px',
                                  padding: '10px 18px',
                                  fontSize: '0.84rem',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                                }}
                                className="hover-scale"
                              >
                                <Sparkles size={16} />
                                <span>Gratis-Schnuppermonat starten &amp; freischalten ➔</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Modul 2: GrooveLab */}
                        <div style={{
                          background: '#ffffff',
                          border: '1.5px solid #fef08a',
                          borderRadius: '20px',
                          padding: '22px',
                          boxShadow: '0 4px 16px rgba(234, 179, 8, 0.08)',
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
                                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)'
                              }}>
                                <Music size={22} />
                              </div>
                              <div>
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Band- &amp; Repertoire-Suite
                                </span>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
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
                              ✓ Inklusive (Musikschule übernimmt 100%)
                            </span>
                          </div>

                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
                            Umfasst die Band-Rooms, Song-Bibliotheken zum Mitspielen, Live Lab, den Skill-Radar und spielerische Musiker-Avatare.
                          </p>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {['🎸 Band-Rooms', '🎼 Song-Bibliotheken', '🎯 Skill-Radar', '👻 Musiker-Avatare'].map((feat) => (
                              <span key={feat} style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: '#1e293b',
                                background: '#fefce8',
                                border: '1px solid #fef9c3',
                                padding: '4px 10px',
                                borderRadius: '8px'
                              }}>
                                {feat}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeStudentSettingsModal === 'billing' && (
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
                          <span style={{ fontSize: '0.76rem', fontWeight: 850, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            🔒 Datenschutz &amp; Datenminimierung
                          </span>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.5, fontWeight: 550 }}>
                            Campus-Groovelab folgt dem Grundsatz der strikten Datenvermeidung. Es werden <strong>keine Bankdaten, keine SEPA-Mandate und keine privaten E-Mail-Adressen von Schülern</strong> in der App-Datenbank gespeichert.
                          </p>
                          <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', fontSize: '0.78rem', color: '#475569', lineHeight: 1.6 }}>
                            <li>Hosting ausschließlich in zertifizierten deutschen Rechenzentren (Hetzner Online GmbH &amp; Supabase EU).</li>
                            <li>Audiodaten und Memos dienen rein dem Unterricht und können jederzeit rückstandslos gelöscht werden.</li>
                            <li>Volle Betroffenenrechte nach Art. 15–21 DSGVO (Auskunft &amp; Löschung jederzeit über das Sekretariat).</li>
                          </ul>
                        </div>

                        {/* Kostenfreie Software & Bereitstellung */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: 850, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            ⚖️ <CampusGroovelabText campusColor="#0369a1" groovelabColor="#d97706" /> Bereitstellung
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

                        {/* Impressum & Anbieterkennzeichnung */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            📄 Impressum &amp; Anbieterkennzeichnung (§ 5 DDG)
                          </span>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.5, fontWeight: 550 }}>
                            <strong>Campus-Groovelab</strong> • Plattformbetrieb Patrick Huber, Karl-Fürstenberg Str. 59, 79618 Rheinfelden.<br />
                            E-Mail: <a href="mailto:kontakt@campus-groovelab.de" style={{ color: '#059669', fontWeight: 700 }}>kontakt@campus-groovelab.de</a> (⚡ 60-Minuten Schnellkontakt-Service an Werktagen).<br />
                            Keine Lizenzkaufgebühren (Cloud- &amp; Hostingpauschale gem. § 19 UStG).<br />
                            Server-Standort &amp; Datenspeicherung: Bundesrepublik Deutschland (EU).
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #f1f5f9',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '10px'
                  }}>
                    <button
                      onClick={handleCloseSettingsModal}
                      style={{
                        padding: '8px 20px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#475569',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      className="hover-scale"
                    >
                      Schließen
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
                    Dein Eltern-Notfallschlüssel 🛡️
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
                      padding: '14px 20px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.92rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 8px 20px -4px rgba(2, 132, 199, 0.4)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                  >
                    ✓ Ich habe den Schlüssel sicher aufbewahrt ➔
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
                  <span style={{ fontSize: '1.2rem' }}>⏳</span>
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
