import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { isMasterPasskeyRegistered, authenticateMasterPasskey } from '../../../utils/webauthn';

export type StepUpMode = 'biometric_or_totp' | 'totp_only';

export function useMasterAdminStepUp() {
  const [isStepUpOpen, setIsStepUpOpen] = useState(false);
  const [stepUpActionName, setStepUpActionName] = useState('');
  const [stepUpActionCallback, setStepUpActionCallback] = useState<(() => Promise<void> | void) | null>(null);
  const [stepUpMode, setStepUpMode] = useState<StepUpMode>('biometric_or_totp');
  const [stepUpLoading, setStepUpLoading] = useState(false);
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  const [stepUpTotpInput, setStepUpTotpInput] = useState('');

  const requestStepUp = useCallback((
    actionName: string,
    onVerified: () => Promise<void> | void,
    mode: StepUpMode = 'biometric_or_totp'
  ) => {
    setStepUpActionName(actionName);
    setStepUpActionCallback(() => onVerified);
    setStepUpMode(mode);
    setStepUpTotpInput('');
    setStepUpError(null);
    setIsStepUpOpen(true);
  }, []);

  const closeStepUp = useCallback(() => {
    setIsStepUpOpen(false);
    setStepUpActionCallback(null);
    setStepUpError(null);
    setStepUpTotpInput('');
    setStepUpMode('biometric_or_totp');
  }, []);

  const verifyWithBiometrics = useCallback(async () => {
    setStepUpLoading(true);
    setStepUpError(null);
    try {
      if (isMasterPasskeyRegistered()) {
        await authenticateMasterPasskey();
        setIsStepUpOpen(false);
        if (stepUpActionCallback) {
          await stepUpActionCallback();
        }
        setStepUpActionCallback(null);
      } else {
        throw new Error('Kein biometrischer Passkey auf diesem Gerät eingerichtet.');
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        setStepUpError(err?.message || 'Biometrische Autorisierung fehlgeschlagen.');
      }
    } finally {
      setStepUpLoading(false);
    }
  }, [stepUpActionCallback]);

  const verifyWithTotp = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = stepUpTotpInput.trim().replace(/[^0-9]/g, '');
    if (cleanCode.length !== 6) {
      setStepUpError('Bitte den 6-stelligen Google Authenticator Code eingeben.');
      return;
    }

    setStepUpLoading(true);
    setStepUpError(null);
    try {
      const { data, error } = await supabase.rpc('verify_master_admin_step_up', {
        p_totp_code: cleanCode
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Ungültiger Authenticator-Code.');
      }

      setIsStepUpOpen(false);
      setStepUpTotpInput('');
      if (stepUpActionCallback) {
        await stepUpActionCallback();
      }
      setStepUpActionCallback(null);
    } catch (err: any) {
      setStepUpError(err?.message || 'Autorisierung fehlgeschlagen.');
    } finally {
      setStepUpLoading(false);
    }
  }, [stepUpTotpInput, stepUpActionCallback]);

  return {
    isStepUpOpen,
    stepUpActionName,
    stepUpMode,
    stepUpLoading,
    stepUpError,
    stepUpTotpInput,
    setStepUpTotpInput,
    requestStepUp,
    closeStepUp,
    verifyWithBiometrics,
    verifyWithTotp,
  };
}
