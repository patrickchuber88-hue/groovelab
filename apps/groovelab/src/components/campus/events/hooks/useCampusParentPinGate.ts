import { useState, useMemo, useCallback } from 'react';
import { isWebAuthnSupported, authenticateParentBiometricPasskey } from '../../../../utils/webauthn';

interface UseCampusParentPinGateParams {
  userId: string;
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  schoolId: string;
  supabase: any;
  studentUser?: any;
  parentAllowChat?: boolean;
  parentAllowAbsences?: boolean;
}

export function useCampusParentPinGate({
  userId,
  role,
  schoolId,
  supabase,
  studentUser,
  parentAllowChat,
  parentAllowAbsences
}: UseCampusParentPinGateParams) {
  const [showPinGateModal, setShowPinGateModal] = useState(false);
  const [pinGateInput, setPinGateInput] = useState('');
  const [pinGateError, setPinGateError] = useState('');
  const [pinGatePendingAction, setPinGatePendingAction] = useState<(() => void) | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Master PIN & Parent Permissions Check
  const checkIsParentUnlocked = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const globalUnlocked = sessionStorage.getItem('groovelab_parent_unlocked_global') === 'true';
    const userSession = sessionStorage.getItem(`groovelab_parent_session_${userId}`);
    return globalUnlocked || (userSession !== null && Number(userSession) > Date.now());
  }, [userId]);

  const isChatAllowed = useMemo(() => {
    if (role !== 'student') return true;
    if (checkIsParentUnlocked()) return true;
    if (parentAllowChat !== undefined) return parentAllowChat;
    const localSetting = typeof window !== 'undefined' ? localStorage.getItem('campus_allow_chat') : null;
    if (localSetting !== null) return localSetting === 'true';
    const localUserSetting = typeof window !== 'undefined' ? localStorage.getItem(`groovelab_parent_allow_chat_${userId}`) : null;
    if (localUserSetting !== null) return localUserSetting === 'true';
    return studentUser?.parent_allow_chat ?? false;
  }, [role, checkIsParentUnlocked, parentAllowChat, studentUser, userId]);

  const isAbsenceAllowed = useMemo(() => {
    if (role !== 'student') return true;
    if (parentAllowAbsences !== undefined && parentAllowAbsences !== null) return Boolean(parentAllowAbsences);
    const userAbs = (studentUser as any)?.parent_allow_absences;
    if (userAbs !== undefined && userAbs !== null) return Boolean(userAbs);
    const localUserSetting = typeof window !== 'undefined' && userId ? localStorage.getItem(`groovelab_parent_allow_absences_${userId}`) : null;
    if (localUserSetting !== null) return localUserSetting === 'true';
    return false;
  }, [role, parentAllowAbsences, studentUser, userId]);

  const requestPinGate = useCallback((action: () => void) => {
    setPinGatePendingAction(() => action);
    setPinGateInput('');
    setPinGateError('');
    setShowPinGateModal(true);
  }, []);

  const handleVerifyParentPin = useCallback(async (inputPin: string) => {
    if (!inputPin || inputPin.length < 4) {
      setPinGateError('Bitte gib mindestens 4 Ziffern ein.');
      return;
    }
    setIsVerifyingPin(true);
    setPinGateError('');
    try {
      const cleanInput = inputPin.trim();
      let isMatch = false;

      if (userId) {
        // Server-Side verify_parent_pin RPC (Fail-Closed)
        try {
          const { data: parentOk } = await supabase.rpc('verify_parent_pin', {
            student_id: userId,
            input_pin: cleanInput
          });
          if (parentOk === true) isMatch = true;
        } catch (e) {}
      }

      if (isMatch) {
        sessionStorage.setItem('groovelab_parent_unlocked_global', 'true');
        sessionStorage.setItem(`groovelab_parent_unlocked_${userId}`, 'true');
        sessionStorage.setItem(`groovelab_parent_session_${userId}`, String(Date.now() + 180 * 1000));
        setShowPinGateModal(false);
        setPinGateInput('');
        setPinGateError('');
        if (pinGatePendingAction) {
          const action = pinGatePendingAction;
          setPinGatePendingAction(null);
          action();
        }
      } else {
        setPinGateError('Falsche Master-PIN. Bitte versuche es erneut.');
        setPinGateInput('');
      }
    } catch (err: any) {
      setPinGateError('Fehler bei der PIN-Prüfung: ' + (err?.message || 'Unbekannt'));
    } finally {
      setIsVerifyingPin(false);
    }
  }, [userId, supabase, pinGatePendingAction]);

  const handleBiometricUnlock = useCallback(async () => {
    if (!userId) return;
    setIsVerifyingPin(true);
    setPinGateError('');
    try {
      const authRes = await authenticateParentBiometricPasskey(
        supabase,
        userId,
        schoolId || null
      );

      if (!authRes.success) {
        if (authRes.error && !authRes.error.includes('abgebrochen')) {
          setPinGateError(authRes.error);
        }
        return;
      }

      sessionStorage.setItem('groovelab_parent_unlocked_global', 'true');
      sessionStorage.setItem(`groovelab_parent_unlocked_${userId}`, 'true');
      sessionStorage.setItem(`groovelab_parent_session_${userId}`, String(Date.now() + 180 * 1000));
      setShowPinGateModal(false);
      setPinGateInput('');
      setPinGateError('');
      if (pinGatePendingAction) {
        const action = pinGatePendingAction;
        setPinGatePendingAction(null);
        action();
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        setPinGateError(err.message || 'Passkey-Entsperrung fehlgeschlagen.');
      }
    } finally {
      setIsVerifyingPin(false);
    }
  }, [userId, supabase, schoolId, pinGatePendingAction]);

  return {
    showPinGateModal,
    setShowPinGateModal,
    pinGateInput,
    setPinGateInput,
    pinGateError,
    setPinGateError,
    pinGatePendingAction,
    setPinGatePendingAction,
    isVerifyingPin,
    checkIsParentUnlocked,
    isParentUnlocked: checkIsParentUnlocked(),
    isWebAuthnSupported,
    isChatAllowed,
    isAbsenceAllowed,
    requestPinGate,
    openParentPinGate: requestPinGate,
    handleVerifyParentPin,
    handleBiometricUnlock
  };
}
