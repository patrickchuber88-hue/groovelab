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
    const val = localStorage.getItem(`cg_parent_instant_lock_${studentId}`);
    return val ? Number(val) : null;
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
    const ws = sessionStorage.getItem('groovelab_active_workspace');
    return ws === 'teacher' || ws === 'admin' || ws === 'secretary';
  }

  const checkIsParentUnlockedGlobal = useCallback((): boolean => {
    if (isTeacherSession()) return true;
    if (isAdultStudent) return true;
    if (isParentUnlocked) return true;
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('groovelab_parent_unlocked_global') === 'true') return true;
      if (studentId && sessionStorage.getItem(`groovelab_parent_unlocked_${studentId}`) === 'true') return true;
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

  // Updates for Bedtime & Daytime
  const handleUpdateBedtime = async (enabled: boolean, start?: string, end?: string) => {
    setBedtimeModeEnabled(enabled);
    if (start) setBedtimeStart(start);
    if (end) setBedtimeEnd(end);
    try {
      await supabase.from('users').update({
        parent_permissions: {
          ...(studentUser?.parent_permissions || {}),
          bedtime_enabled: enabled,
          bedtime_start: start || bedtimeStart,
          bedtime_end: end || bedtimeEnd
        }
      }).eq('id', studentId);
    } catch (e) {
      console.warn('Could not persist bedtime:', e);
    }
  };

  const handleUpdateDaytimeLock = async (enabled: boolean, start?: string, end?: string, days?: 'school_days' | 'everyday') => {
    setDaytimeLockEnabled(enabled);
    if (start) setDaytimeLockStart(start);
    if (end) setDaytimeLockEnd(end);
    if (days) setDaytimeLockDays(days);
    try {
      await supabase.from('users').update({
        parent_permissions: {
          ...(studentUser?.parent_permissions || {}),
          daytime_lock_enabled: enabled,
          daytime_lock_start: start || daytimeLockStart,
          daytime_lock_end: end || daytimeLockEnd,
          daytime_lock_days: days || daytimeLockDays
        }
      }).eq('id', studentId);
    } catch (e) {
      console.warn('Could not persist daytime lock:', e);
    }
  };

  const handleSetInstantLock = async (durationMinutes: number | null) => {
    if (!durationMinutes) {
      setInstantLockUntil(null);
      localStorage.removeItem(`cg_parent_instant_lock_${studentId}`);
    } else {
      const until = Date.now() + durationMinutes * 60 * 1000;
      setInstantLockUntil(until);
      localStorage.setItem(`cg_parent_instant_lock_${studentId}`, String(until));
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
    localStorage.setItem('groovelab_active_student_id', targetStudentId);
    window.location.reload();
  };

  const handleRemoveFamilyProfile = (removeStudentId: string) => {
    setFamilyProfiles(prev => {
      const updated = prev.filter(p => p.id !== removeStudentId);
      localStorage.setItem('campus_family_profiles', JSON.stringify(updated));
      return updated;
    });
  };

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
    handleVerifyParentPinAttempt
  };
}
