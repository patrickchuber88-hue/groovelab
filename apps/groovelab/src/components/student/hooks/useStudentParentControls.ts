import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParentSessionLock } from '../../../hooks/useParentSessionLock';
import { isWebAuthnSupported, getSanitizedRpId, registerBiometrics } from '../../../utils/webauthn';

interface UseStudentParentControlsProps {
  studentId: string;
  studentUser: any;
  isAdultStudent: boolean;
  isIOS?: boolean;
  isMobile?: boolean;
  onProfileUpdate?: (fields: any) => void;
}

export function useStudentParentControls({
  studentId,
  studentUser,
  isAdultStudent,
  isIOS = false,
  isMobile = false,
  onProfileUpdate
}: UseStudentParentControlsProps) {
  // Enterprise PIN & Session Lease
  const inMemoryParentPinRef = useRef<string>('');
  const [isParentUnlocked, setIsParentUnlocked] = useState<boolean>(false);
  const [showParentGateModal, setShowParentGateModal] = useState<boolean>(false);
  const [parentGatePinInput, setParentGatePinInput] = useState('');
  const [parentGateError, setParentGateError] = useState('');
  const [isVerifyingParentGate, setIsVerifyingParentGate] = useState(false);
  const [isParentGateShaking, setIsParentGateShaking] = useState(false);
  const [parentGateFailedCount, setParentGateFailedCount] = useState(0);
  const [parentGateCooldownSeconds, setParentGateCooldownSeconds] = useState(0);

  // Recovery Key & Emergency Kit
  const [showRecoveryKeyModal, setShowRecoveryKeyModal] = useState(false);
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [recoveryKeyError, setRecoveryKeyError] = useState('');
  const [showEmergencyKitModal, setShowEmergencyKitModal] = useState(false);
  const [newGeneratedRecoveryKey, setNewGeneratedRecoveryKey] = useState('');
  const [hasCopiedRecoveryKey, setHasCopiedRecoveryKey] = useState(false);

  // Bedtime & Daytime Locks
  const [bedtimeModeEnabled, setBedtimeModeEnabled] = useState<boolean>(() => {
    return Boolean(studentUser?.parent_permissions?.bedtime_enabled);
  });
  const [bedtimeStart, setBedtimeStart] = useState<string>(() => {
    return studentUser?.parent_permissions?.bedtime_start || '21:00';
  });
  const [bedtimeEnd, setBedtimeEnd] = useState<string>(() => {
    return studentUser?.parent_permissions?.bedtime_end || '06:30';
  });

  const [daytimeLockEnabled, setDaytimeLockEnabled] = useState<boolean>(() => {
    return Boolean(studentUser?.parent_permissions?.daytime_lock_enabled);
  });
  const [daytimeLockStart, setDaytimeLockStart] = useState<string>(() => {
    return studentUser?.parent_permissions?.daytime_lock_start || '08:00';
  });
  const [daytimeLockEnd, setDaytimeLockEnd] = useState<string>(() => {
    return studentUser?.parent_permissions?.daytime_lock_end || '14:00';
  });
  const [daytimeLockDays, setDaytimeLockDays] = useState<'school_days' | 'everyday'>(() => {
    return studentUser?.parent_permissions?.daytime_lock_days || 'school_days';
  });

  // Instant Lock
  const [instantLockUntil, setInstantLockUntil] = useState<number | null>(() => {
    if (typeof window === 'undefined' || !studentId) return null;
    try {
      const val = localStorage.getItem(`cg_parent_instant_lock_${studentId}`);
      return val ? Number(val) : null;
    } catch {
      return null;
    }
  });

  const isCurrentlyInInstantLock = instantLockUntil !== null && Date.now() < instantLockUntil;

  // Family Profiles & Sibling Switch
  const [familyProfiles, setFamilyProfiles] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('campus_family_profiles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isAddSiblingModalOpen, setIsAddSiblingModalOpen] = useState(false);
  const [pendingSiblingUnlock, setPendingSiblingUnlock] = useState<any | null>(null);

  // Modal Hub triggers
  const [activeStudentSettingsModal, setActiveStudentSettingsModal] = useState<string | null>(null);
  const [showParentActivationModal, setShowParentActivationModal] = useState(false);
  const [showSoftLockModal, setShowSoftLockModal] = useState(false);

  // 180s Rolling Window Session Lock Hook
  const {
    isWarning: isParentLockWarning,
    remainingSeconds: parentLockRemainingSeconds,
    extendSession: extendParentSession,
    lockNow: lockParentSession
  } = useParentSessionLock({
    enabled: isParentUnlocked,
    studentId,
    onLock: () => {
      setIsParentUnlocked(false);
      inMemoryParentPinRef.current = '';
    }
  });

  const isParentSessionActive = isParentUnlocked && parentLockRemainingSeconds > 0;

  // Anti-brute force timer
  useEffect(() => {
    if (parentGateCooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setParentGateCooldownSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [parentGateCooldownSeconds]);

  const hasConfiguredParentPin = Boolean(studentUser?.has_parent_pin || studentUser?.parent_pin_configured);

  const checkIsParentSessionActiveLocal = useCallback((): boolean => {
    if (isTeacherSession()) return true;
    if (isAdultStudent) return true;
    if (isParentUnlocked) return true;
    return Boolean(isParentSessionActive);
  }, [isAdultStudent, isParentUnlocked, isParentSessionActive]);

  function isTeacherSession(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const ws = sessionStorage.getItem('groovelab_active_workspace');
      return ws === 'teacher' || ws === 'admin' || ws === 'secretary';
    } catch {
      return false;
    }
  }

  const checkIsParentUnlockedGlobal = useCallback((): boolean => {
    if (isTeacherSession()) return true;
    if (isAdultStudent) return true;
    if (isParentUnlocked) return true;
    if (typeof window !== 'undefined') {
      try {
        if (sessionStorage.getItem('groovelab_parent_unlocked_global') === 'true') return true;
        if (studentId && sessionStorage.getItem(`groovelab_parent_unlocked_${studentId}`) === 'true') return true;
      } catch {
        return false;
      }
    }
    return false;
  }, [isAdultStudent, isParentUnlocked, studentId]);

  // Biometric Unlock
  const handleBiometricUnlock = async () => {
    try {
      setIsVerifyingParentGate(true);
      setParentGateError('');
      const targetId = studentId || studentUser?.id;
      if (!targetId) throw new Error('Kein Schülerprofil zugeordnet.');

      const { data: chalData, error: chalErr } = await supabase.rpc('generate_webauthn_challenge', {
        p_user_id: targetId,
        p_type: 'auth'
      });

      if (chalErr || !chalData?.challenge) {
        throw new Error('Sicherheits-Challenge konnte nicht vom Server bezogen werden.');
      }

      const challengeBuffer = new Uint8Array(
        chalData.challenge.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []
      ).buffer;

      const rpId = getSanitizedRpId();
      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: challengeBuffer,
          userVerification: 'required',
          timeout: 60000,
          ...(rpId ? { rpId } : {})
        },
      })) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Keine biometrische Bestätigung empfangen.');
      }

      const { data: authResult, error: authErr } = await supabase.rpc('authenticate_webauthn_credential', {
        p_credential_id: assertion.id,
        p_challenge: chalData.challenge,
        p_school_id: studentUser?.school_id || null
      });

      if (authErr || !authResult?.success) {
        throw new Error(authResult?.error || authErr?.message || 'Passkey nicht erkannt.');
      }

      setIsParentUnlocked(true);
      setShowParentGateModal(false);
      extendParentSession();
      window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: true }));
    } catch (e: any) {
      if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
        setParentGateError(e.message || 'FaceID/TouchID Entsperrung fehlgeschlagen.');
      }
    } finally {
      setIsVerifyingParentGate(false);
    }
  };

  // Register Passkey
  const handleRegisterParentPasskey = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const targetId = studentId || studentUser?.id;
      if (!targetId) throw new Error('Kein Schülerprofil zugeordnet.');

      const { data: chalData, error: chalErr } = await supabase.rpc('generate_webauthn_challenge', {
        p_user_id: targetId,
        p_type: 'register'
      });

      if (chalErr || !chalData?.challenge) {
        throw new Error('Sicherheits-Challenge konnte nicht bezogen werden.');
      }

      const safeFirstName = (studentUser?.first_name || 'schueler')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const email = `eltern.${safeFirstName || 'kind'}@campus-groovelab.local`;

      const passkeyResult = await registerBiometrics(
        email,
        targetId,
        chalData.challenge,
        `Eltern-Gerät • ${studentUser?.first_name || 'Kind'}`
      );

      const deviceName = isIOS ? 'Apple Face/Touch ID' : isMobile ? 'Smartphone Biometrie' : 'Eltern-Passkey';
      const { data: regResult, error: regErr } = await supabase.rpc('register_webauthn_credential', {
        p_user_id: targetId,
        p_credential_id: passkeyResult.id,
        p_public_key: JSON.stringify(passkeyResult.response),
        p_device_name: deviceName,
        p_challenge: chalData.challenge
      });

      if (regErr || !regResult?.success) {
        throw new Error(regErr?.message || regResult?.error || 'Passkey-Registrierung fehlgeschlagen.');
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registrierung abgebrochen.' };
    }
  };

  // Verify PIN
  const handleVerifyParentPinAttempt = async (cleanInput: string, onSuccess: () => void) => {
    if (parentGateCooldownSeconds > 0) return;
    setParentGateError('');

    const targetId = studentId || studentUser?.id;
    if (!targetId) return;

    setIsVerifyingParentGate(true);
    try {
      let isOk = false;
      try {
        const { data: leaseData, error: leaseErr } = await supabase.rpc('verify_parent_pin_with_lease', {
          p_student_id: targetId,
          p_input_pin: cleanInput,
          p_device_key: `browser-${Date.now()}`
        });
        if (!leaseErr && leaseData?.success === true) {
          isOk = true;
        }
      } catch (e) {}

      if (!isOk) {
        try {
          const { data: parentOk } = await supabase.rpc('verify_parent_pin', {
            student_id: targetId,
            input_pin: cleanInput
          });
          if (parentOk === true) isOk = true;
        } catch (e) {}
      }

      if (isOk) {
        inMemoryParentPinRef.current = cleanInput;
        setParentGateFailedCount(0);
        setParentGatePinInput('');
        setIsParentUnlocked(true);
        extendParentSession();
        setShowParentGateModal(false);
        window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: true }));
        onSuccess();
      } else {
        setIsParentGateShaking(true);
        setTimeout(() => setIsParentGateShaking(false), 380);
        const nextFailCount = parentGateFailedCount + 1;
        setParentGateFailedCount(nextFailCount);
        if (nextFailCount >= 5) {
          setParentGateCooldownSeconds(30);
          setParentGateError('Zu viele Fehlversuche. 30 Sekunden Sicherheitssperre aktiv.');
        } else {
          setParentGateError(`Falsche Eltern-Master-PIN (Versuch ${nextFailCount}/5).`);
        }
        setParentGatePinInput('');
      }
    } catch (e: any) {
      setParentGateError('Fehler: ' + (e?.message || 'Verbindungsfehler'));
      setParentGatePinInput('');
    } finally {
      setIsVerifyingParentGate(false);
    }
  };

  // Updates for Bedtime & Daytime via Authoritative save_parent_controls RPC
  const handleUpdateBedtime = async (enabled: boolean, start?: string, end?: string) => {
    setBedtimeModeEnabled(enabled);
    if (start) setBedtimeStart(start);
    if (end) setBedtimeEnd(end);
    try {
      const nextPermissions = {
        ...(studentUser?.parent_permissions || {}),
        bedtime_enabled: enabled,
        bedtime_start: start || bedtimeStart,
        bedtime_end: end || bedtimeEnd
      };
      await supabase.rpc('save_parent_controls', {
        p_student_id: studentId,
        p_settings: {
          parent_pin: inMemoryParentPinRef.current || undefined,
          parent_permissions: nextPermissions
        }
      });
      if (studentUser) {
        studentUser.parent_permissions = nextPermissions;
      }
    } catch (e) {
      console.warn('Could not persist bedtime via save_parent_controls:', e);
    }
  };

  const handleUpdateDaytimeLock = async (enabled: boolean, start?: string, end?: string, days?: 'school_days' | 'everyday') => {
    setDaytimeLockEnabled(enabled);
    if (start) setDaytimeLockStart(start);
    if (end) setDaytimeLockEnd(end);
    if (days) setDaytimeLockDays(days);
    try {
      const nextPermissions = {
        ...(studentUser?.parent_permissions || {}),
        daytime_lock_enabled: enabled,
        daytime_lock_start: start || daytimeLockStart,
        daytime_lock_end: end || daytimeLockEnd,
        daytime_lock_days: days || daytimeLockDays
      };
      await supabase.rpc('save_parent_controls', {
        p_student_id: studentId,
        p_settings: {
          parent_pin: inMemoryParentPinRef.current || undefined,
          parent_permissions: nextPermissions
        }
      });
      if (studentUser) {
        studentUser.parent_permissions = nextPermissions;
      }
    } catch (e) {
      console.warn('Could not persist daytime lock via save_parent_controls:', e);
    }
  };

  const handleSetInstantLock = async (durationMinutes: number | null) => {
    try {
      if (!durationMinutes) {
        setInstantLockUntil(null);
        localStorage.removeItem(`cg_parent_instant_lock_${studentId}`);
      } else {
        const until = Date.now() + durationMinutes * 60 * 1000;
        setInstantLockUntil(until);
        localStorage.setItem(`cg_parent_instant_lock_${studentId}`, String(until));
      }
    } catch (e) {
      console.warn('Could not update instant lock in storage:', e);
    }
  };

  // Family profile switcher
  const handleSwitchFamilyStudent = (targetStudentId: string) => {
    const target = familyProfiles.find(p => p.id === targetStudentId);
    if (target && target.has_personal_pin && !isParentUnlocked) {
      setPendingSiblingUnlock(target);
    } else {
      executeSwitchFamilyStudent(targetStudentId);
    }
  };

  const executeSwitchFamilyStudent = (targetStudentId: string) => {
    try {
      localStorage.setItem('groovelab_active_student_id', targetStudentId);
    } catch (e) {
      console.warn('Could not set active student in storage:', e);
    }
    window.location.reload();
  };

  const handleRemoveFamilyProfile = (removeStudentId: string) => {
    setFamilyProfiles(prev => {
      const updated = prev.filter(p => p.id !== removeStudentId);
      try {
        localStorage.setItem('campus_family_profiles', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save updated family profiles:', e);
      }
      return updated;
    });
  };

  const [recentlyChangedDiff, setRecentlyChangedDiff] = useState<any>(null);

  const applyAndSaveParentControls = useCallback(async (updates: {
    uiLevel?: 'junior' | 'teen' | 'pro' | string;
    allowAbsences?: boolean;
    allowRescheduleConfirm?: boolean;
    allowChat?: boolean;
    allowTimer?: boolean;
    allowLeaderboard?: boolean;
    allowProposals?: boolean;
    allowAudio?: boolean;
    allowTeacherAudio?: boolean;
    allowStudentAudio?: boolean;
    allowTts?: boolean;
    bedtimeEnabled?: boolean;
    bedtimeStart?: string;
    bedtimeEnd?: string;
    daytimeLockEnabled?: boolean;
    daytimeLockStart?: string;
    daytimeLockEnd?: string;
    daytimeLockDays?: 'school_days' | 'everyday';
    instantLockUntil?: number | null;
    boardOverrides?: Record<string, boolean>;
  }) => {
    const targetStudentId = studentId || studentUser?.id;
    const nextUiLevel = updates.uiLevel ?? studentUser?.campus_ui_level ?? 'junior';
    const isJuniorLevel = nextUiLevel === 'junior';

    const nextAllowAbsences = isJuniorLevel
      ? false
      : (updates.allowAbsences !== undefined 
          ? updates.allowAbsences 
          : (studentUser?.parent_allow_absences !== undefined && studentUser?.parent_allow_absences !== null ? Boolean(studentUser.parent_allow_absences) : false));
    const nextAllowReschedule = isJuniorLevel
      ? false
      : (updates.allowRescheduleConfirm !== undefined 
          ? updates.allowRescheduleConfirm 
          : (studentUser?.parent_allow_reschedule_confirm !== undefined && studentUser?.parent_allow_reschedule_confirm !== null ? Boolean(studentUser.parent_allow_reschedule_confirm) : true));
    const nextAllowChat = updates.allowChat !== undefined 
      ? updates.allowChat 
      : (studentUser?.parent_allow_chat !== undefined && studentUser?.parent_allow_chat !== null ? Boolean(studentUser.parent_allow_chat) : false);
    const nextAllowTimer = updates.allowTimer !== undefined 
      ? updates.allowTimer 
      : (studentUser?.parent_allow_timer !== undefined && studentUser?.parent_allow_timer !== null ? Boolean(studentUser.parent_allow_timer) : true);
    const nextAllowLeaderboard = updates.allowLeaderboard !== undefined 
      ? updates.allowLeaderboard 
      : (studentUser?.parent_allow_leaderboard !== undefined && studentUser?.parent_allow_leaderboard !== null ? Boolean(studentUser.parent_allow_leaderboard) : false);
    const nextAllowProposals = updates.allowProposals !== undefined 
      ? updates.allowProposals 
      : (studentUser?.parent_allow_proposals !== undefined && studentUser?.parent_allow_proposals !== null ? Boolean(studentUser.parent_allow_proposals) : false);
    const nextAllowAudio = updates.allowAudio !== undefined 
      ? updates.allowAudio 
      : (studentUser?.parent_allow_audio !== undefined && studentUser?.parent_allow_audio !== null ? Boolean(studentUser.parent_allow_audio) : false);
    const nextAllowTeacherAudio = updates.allowTeacherAudio !== undefined
      ? updates.allowTeacherAudio
      : (studentUser?.parent_permissions?.allow_teacher_audio !== undefined
          ? Boolean(studentUser.parent_permissions.allow_teacher_audio)
          : false);
    const nextAllowStudentAudio = updates.allowStudentAudio !== undefined
      ? updates.allowStudentAudio
      : (studentUser?.parent_permissions?.allow_student_audio !== undefined
          ? Boolean(studentUser.parent_permissions.allow_student_audio)
          : false);
    const nextAllowTts = updates.allowTts !== undefined 
      ? updates.allowTts 
      : (studentUser?.parent_allow_tts !== undefined && studentUser?.parent_allow_tts !== null ? Boolean(studentUser.parent_allow_tts) : false);

    const nextOverrides = {
      ...(studentUser?.parent_permissions?.board_overrides || {}),
      ...(updates.boardOverrides || {})
    };

    if (updates.uiLevel !== undefined) {
      if (studentUser) {
        studentUser.campus_ui_level = updates.uiLevel;
      }
      if (targetStudentId) {
        localStorage.setItem(`campus_student_ui_level_${targetStudentId}`, updates.uiLevel);
      }
      localStorage.setItem('campus_student_ui_level', updates.uiLevel);
      window.dispatchEvent(new CustomEvent('campus_ui_level_changed', { detail: { studentId: targetStudentId, uiLevel: updates.uiLevel } }));
      window.dispatchEvent(new CustomEvent('campus_ui_level_changed', { detail: updates.uiLevel }));
    }
    if (updates.allowAbsences !== undefined || isJuniorLevel) {
      const finalAbsences = isJuniorLevel ? false : (updates.allowAbsences ?? nextAllowAbsences);
      localStorage.setItem('campus_allow_absences', String(finalAbsences));
      if (studentId) localStorage.setItem(`groovelab_parent_allow_absences_${studentId}`, String(finalAbsences));
    }
    if (updates.allowRescheduleConfirm !== undefined || isJuniorLevel) {
      const finalReschedule = isJuniorLevel ? false : (updates.allowRescheduleConfirm ?? nextAllowReschedule);
      localStorage.setItem('campus_allow_reschedule_confirm', String(finalReschedule));
      if (studentId) localStorage.setItem(`groovelab_parent_allow_reschedule_${studentId}`, String(finalReschedule));
    }
    if (updates.allowChat !== undefined) {
      localStorage.setItem('campus_allow_chat', String(updates.allowChat));
      localStorage.setItem('campus_board_override_messages', String(updates.allowChat));
      if (studentId) localStorage.setItem(`groovelab_parent_allow_chat_${studentId}`, String(updates.allowChat));
      window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId: 'messages', allowed: updates.allowChat } }));
    }
    if (updates.allowTimer !== undefined) {
      localStorage.setItem('campus_allow_timer', String(updates.allowTimer));
      localStorage.setItem('campus_board_override_practice_board', String(updates.allowTimer));
      if (studentId) localStorage.setItem(`groovelab_parent_allow_timer_${studentId}`, String(updates.allowTimer));
      window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId: 'practice_board', allowed: updates.allowTimer } }));
    }
    if (updates.allowLeaderboard !== undefined) {
      localStorage.setItem('campus_allow_leaderboard', String(updates.allowLeaderboard));
      localStorage.setItem('campus_board_override_campus_cup', String(updates.allowLeaderboard));
      if (studentId) localStorage.setItem(`groovelab_parent_allow_leaderboard_${studentId}`, String(updates.allowLeaderboard));
      window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId: 'campus_cup', allowed: updates.allowLeaderboard } }));
    }
    if (updates.allowProposals !== undefined) {
      localStorage.setItem('campus_allow_proposals', String(updates.allowProposals));
      localStorage.setItem('campus_board_override_mediathek', String(updates.allowProposals));
      if (studentId) localStorage.setItem(`groovelab_parent_allow_proposals_${studentId}`, String(updates.allowProposals));
      window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId: 'mediathek', allowed: updates.allowProposals } }));
    }
    if (updates.allowAudio !== undefined) {
      localStorage.setItem('campus_allow_audio', String(updates.allowAudio));
      localStorage.setItem('campus_board_override_recordings', String(updates.allowAudio));
      if (studentId) localStorage.setItem(`groovelab_parent_allow_audio_${studentId}`, String(updates.allowAudio));
      window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId: 'recordings', allowed: updates.allowAudio } }));
    }
    if (updates.allowTeacherAudio !== undefined) {
      if (studentId) localStorage.setItem(`groovelab_parent_allow_teacher_audio_${studentId}`, String(updates.allowTeacherAudio));
      localStorage.setItem('campus_allow_teacher_audio', String(updates.allowTeacherAudio));
    }
    if (updates.allowStudentAudio !== undefined) {
      if (studentId) localStorage.setItem(`groovelab_parent_allow_student_audio_${studentId}`, String(updates.allowStudentAudio));
      localStorage.setItem('campus_allow_student_audio', String(updates.allowStudentAudio));
    }
    if (updates.allowTts !== undefined) {
      if (studentId) localStorage.setItem(`groovelab_parent_allow_tts_${studentId}`, String(updates.allowTts));
    }
    if (updates.boardOverrides) {
      Object.entries(updates.boardOverrides).forEach(([bId, allowed]) => {
        localStorage.setItem(`campus_board_override_${bId}`, String(allowed));
        window.dispatchEvent(new CustomEvent('campus_board_permission_changed', { detail: { boardId: bId, allowed } }));
      });
    }

    const nextBedtimeEnabled = updates.bedtimeEnabled !== undefined 
      ? updates.bedtimeEnabled 
      : bedtimeModeEnabled;
    const nextBedtimeStart = updates.bedtimeStart || bedtimeStart;
    const nextBedtimeEnd = updates.bedtimeEnd || bedtimeEnd;

    if (updates.bedtimeEnabled !== undefined) {
      setBedtimeModeEnabled(updates.bedtimeEnabled);
      localStorage.setItem('campus_bedtime_enabled', String(updates.bedtimeEnabled));
    }
    if (updates.bedtimeStart) {
      setBedtimeStart(updates.bedtimeStart);
      localStorage.setItem('campus_bedtime_start', updates.bedtimeStart);
    }
    if (updates.bedtimeEnd) {
      setBedtimeEnd(updates.bedtimeEnd);
      localStorage.setItem('campus_bedtime_end', updates.bedtimeEnd);
    }

    const nextDaytimeLockEnabled = updates.daytimeLockEnabled !== undefined
      ? updates.daytimeLockEnabled
      : daytimeLockEnabled;
    const nextDaytimeLockStart = updates.daytimeLockStart || daytimeLockStart;
    const nextDaytimeLockEnd = updates.daytimeLockEnd || daytimeLockEnd;
    const nextDaytimeLockDays = updates.daytimeLockDays || daytimeLockDays;

    if (updates.daytimeLockEnabled !== undefined) {
      setDaytimeLockEnabled(updates.daytimeLockEnabled);
      localStorage.setItem('campus_daytime_lock_enabled', String(updates.daytimeLockEnabled));
    }
    if (updates.daytimeLockStart) {
      setDaytimeLockStart(updates.daytimeLockStart);
      localStorage.setItem('campus_daytime_lock_start', updates.daytimeLockStart);
    }
    if (updates.daytimeLockEnd) {
      setDaytimeLockEnd(updates.daytimeLockEnd);
      localStorage.setItem('campus_daytime_lock_end', updates.daytimeLockEnd);
    }
    if (updates.daytimeLockDays) {
      setDaytimeLockDays(updates.daytimeLockDays);
      localStorage.setItem('campus_daytime_lock_days', updates.daytimeLockDays);
    }

    const nextInstantLockUntil = updates.instantLockUntil !== undefined
      ? updates.instantLockUntil
      : instantLockUntil;
    if (updates.instantLockUntil !== undefined) {
      setInstantLockUntil(nextInstantLockUntil);
      if (nextInstantLockUntil) {
        localStorage.setItem(`cg_parent_instant_lock_${studentId}`, String(nextInstantLockUntil));
      } else {
        localStorage.removeItem(`cg_parent_instant_lock_${studentId}`);
      }
    }

    const nextPermissions = {
      ...(studentUser?.parent_permissions || {}),
      board_overrides: nextOverrides,
      parent_allow_tts: nextAllowTts,
      allow_teacher_audio: nextAllowTeacherAudio,
      allow_student_audio: nextAllowStudentAudio,
      bedtime_mode: {
        enabled: nextBedtimeEnabled,
        start: nextBedtimeStart,
        end: nextBedtimeEnd
      },
      daytime_lock: {
        enabled: nextDaytimeLockEnabled,
        start: nextDaytimeLockStart,
        end: nextDaytimeLockEnd,
        days: nextDaytimeLockDays
      },
      instant_lock_until: nextInstantLockUntil
    };

    const payload: any = {
      campus_ui_level: nextUiLevel,
      parent_allow_absences: nextAllowAbsences,
      parent_allow_reschedule_confirm: nextAllowReschedule,
      parent_allow_chat: nextAllowChat,
      parent_allow_timer: nextAllowTimer,
      parent_allow_leaderboard: nextAllowLeaderboard,
      parent_allow_proposals: nextAllowProposals,
      parent_allow_audio: nextAllowAudio,
      parent_permissions: nextPermissions
    };

    if (onProfileUpdate) {
      try {
        onProfileUpdate({ ...payload, parent_allow_tts: nextAllowTts });
      } catch (e) {
        console.warn('Could not propagate profile update to root:', e);
      }
    }

    try {
      if (targetStudentId) {
        const activeLeaseToken = typeof window !== 'undefined'
          ? (sessionStorage.getItem('gl_parent_session_lease') || sessionStorage.getItem('gl_active_session_lease_id'))
          : null;

        const settingsPayload = {
          ...payload,
          ...(activeLeaseToken ? { lease_token: activeLeaseToken } : {}),
          ...(inMemoryParentPinRef.current ? { parent_pin: inMemoryParentPinRef.current } : {})
        };

        const { error: rpcErr } = await supabase.rpc('save_parent_controls', {
          p_student_id: targetStudentId,
          p_settings: settingsPayload
        });

        if (rpcErr) {
          console.warn('[Security Fail-Closed] save_parent_controls RPC rejected update:', rpcErr);
        } else {
          extendParentSession();
          if (updates.uiLevel !== undefined) {
            const labels: Record<string, string> = { junior: 'Junior (6–10 J.)', teen: 'Teen (11–15 J.)', pro: '+16 / Pro' };
            console.log(`[ParentControls] Alters-UI erfolgreich auf „${labels[updates.uiLevel] || updates.uiLevel}“ gespeichert 🛡️`);
            try {
              const topicName = `realtime_ui_level_${targetStudentId}`;
              const existingCh = supabase.getChannels().find((c: any) => c.topic === `realtime:${topicName}` || c.topic === topicName);
              if (existingCh && (existingCh.state === 'joined' || existingCh.state === 'joining')) {
                existingCh.send({
                  type: 'broadcast',
                  event: 'ui-level-changed',
                  payload: { uiLevel: updates.uiLevel }
                });
              } else {
                const tempCh = supabase.channel(topicName);
                tempCh.subscribe((status) => {
                  if (status === 'SUBSCRIBED') {
                    tempCh.send({
                      type: 'broadcast',
                      event: 'ui-level-changed',
                      payload: { uiLevel: updates.uiLevel }
                    });
                    setTimeout(() => supabase.removeChannel(tempCh), 1500);
                  }
                });
              }
            } catch (bcErr) {
              console.warn('[ParentControls] Error broadcasting ui-level-changed:', bcErr);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error auto-saving parent controls:', err);
    }
  }, [studentId, studentUser, bedtimeModeEnabled, bedtimeStart, bedtimeEnd, daytimeLockEnabled, daytimeLockStart, daytimeLockEnd, daytimeLockDays, instantLockUntil, onProfileUpdate, extendParentSession]);

  return {
    isParentUnlocked,
    setIsParentUnlocked,
    inMemoryParentPinRef,
    hasConfiguredParentPin,
    showParentGateModal,
    setShowParentGateModal,
    parentGatePinInput,
    setParentGatePinInput,
    parentGateError,
    setParentGateError,
    isVerifyingParentGate,
    isParentGateShaking,
    parentGateFailedCount,
    parentGateCooldownSeconds,
    showRecoveryKeyModal,
    setShowRecoveryKeyModal,
    recoveryKeyInput,
    setRecoveryKeyInput,
    recoveryKeyError,
    setRecoveryKeyError,
    showEmergencyKitModal,
    setShowEmergencyKitModal,
    newGeneratedRecoveryKey,
    setNewGeneratedRecoveryKey,
    hasCopiedRecoveryKey,
    setHasCopiedRecoveryKey,
    bedtimeModeEnabled,
    bedtimeStart,
    bedtimeEnd,
    handleUpdateBedtime,
    daytimeLockEnabled,
    daytimeLockStart,
    daytimeLockEnd,
    daytimeLockDays,
    handleUpdateDaytimeLock,
    instantLockUntil,
    isCurrentlyInInstantLock,
    handleSetInstantLock,
    familyProfiles,
    setFamilyProfiles,
    handleSwitchFamilyStudent,
    handleRemoveFamilyProfile,
    isAddSiblingModalOpen,
    setIsAddSiblingModalOpen,
    pendingSiblingUnlock,
    setPendingSiblingUnlock,
    executeSwitchFamilyStudent,
    activeStudentSettingsModal,
    setActiveStudentSettingsModal,
    showParentActivationModal,
    setShowParentActivationModal,
    showSoftLockModal,
    setShowSoftLockModal,
    checkIsParentUnlockedGlobal,
    checkIsParentSessionActiveLocal,
    parentLockRemainingSeconds,
    isParentLockWarning,
    extendParentSession,
    lockParentSession,
    handleBiometricUnlock,
    handleRegisterParentPasskey,
    handleVerifyParentPinAttempt,
    recentlyChangedDiff,
    setRecentlyChangedDiff,
    applyAndSaveParentControls
  };
}
