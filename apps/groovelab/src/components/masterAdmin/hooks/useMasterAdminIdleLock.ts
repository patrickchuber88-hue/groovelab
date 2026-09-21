import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { isMasterPasskeyRegistered, authenticateMasterPasskey } from '../../../utils/webauthn';
import { revokeMasterSessionLease } from '../../../utils/masterAuditLogger';

interface UseMasterAdminIdleLockOptions {
  currentUser?: any;
  adminUsername?: string;
  adminUserId?: string;
}

export function useMasterAdminIdleLock({ currentUser, adminUsername, adminUserId }: UseMasterAdminIdleLockOptions = {}) {
  const [isIdleLocked, setIsIdleLocked] = useState(false);
  const [idleUnlockLoading, setIdleUnlockLoading] = useState(false);
  const [idlePinInput, setIdlePinInput] = useState('');
  const [idleError, setIdleError] = useState<string | null>(null);
  const [idleFailedAttempts, setIdleFailedAttempts] = useState<number>(0);

  useEffect(() => {
    let idleTimer: any;
    const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minuten

    const resetIdleTimer = () => {
      if (isIdleLocked) return;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIsIdleLocked(true);
      }, IDLE_TIMEOUT_MS);
    };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetIdleTimer));
    };
  }, [isIdleLocked]);

  const handleIdleUnlock = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIdleUnlockLoading(true);
    setIdleError(null);
    try {
      if (isMasterPasskeyRegistered()) {
        await authenticateMasterPasskey();
        setIsIdleLocked(false);
        setIdlePinInput('');
        setIdleFailedAttempts(0);
        setIdleUnlockLoading(false);
        return;
      }

      const pinOrPass = idlePinInput.trim();
      if (!pinOrPass) {
        throw new Error('Bitte Touch ID oder 6-stelligen Google Authenticator Code eingeben.');
      }

      const currentUserId = currentUser?.id || adminUserId;
      let isVerified = false;

      // 1. If 6-digit number, verify as Google Authenticator TOTP
      if (/^[0-9]{6}$/.test(pinOrPass)) {
        const { data: stepUpData, error: stepUpErr } = await supabase.rpc('verify_master_admin_step_up', {
          p_totp_code: pinOrPass
        });
        if (!stepUpErr && stepUpData?.success === true) {
          isVerified = true;
        } else {
          // Fallback to login_master_admin with TOTP
          const { data: authTotp, error: authTotpErr } = await supabase.rpc('login_master_admin', {
            p_username: adminUsername || 'admin',
            p_password: ' ',
            p_totp_code: pinOrPass
          });
          if (!authTotpErr && authTotp && (authTotp.id || authTotp.is_master_admin)) {
            isVerified = true;
          }
        }
      } else {
        // 2. Otherwise verify as Master Admin Password via login_master_admin
        const { data: authData, error: authErr } = await supabase.rpc('login_master_admin', {
          p_username: adminUsername || 'admin',
          p_password: pinOrPass
        });

        if (!authErr && authData && (authData.id || authData.requires_2fa || authData.is_master_admin)) {
          isVerified = true;
        }
      }

      if (isVerified) {
        setIsIdleLocked(false);
        setIdlePinInput('');
        setIdleFailedAttempts(0);
        setIdleUnlockLoading(false);
        return;
      }

      const nextFailures = idleFailedAttempts + 1;
      setIdleFailedAttempts(nextFailures);

      if (nextFailures >= 3) {
        await revokeMasterSessionLease(currentUserId || 'master_admin', 'master_logout');
        window.location.reload();
        return;
      }

      throw new Error(`Ungültige Anmeldedaten. Noch ${3 - nextFailures} Versuch(e) verbleibend.`);
    } catch (err: any) {
      setIdleError(err?.message || 'Entsperrung fehlgeschlagen.');
    } finally {
      setIdleUnlockLoading(false);
    }
  }, [idlePinInput, currentUser, adminUserId, adminUsername, idleFailedAttempts]);

  return {
    isIdleLocked,
    setIsIdleLocked,
    idleUnlockLoading,
    idlePinInput,
    setIdlePinInput,
    idleError,
    handleIdleUnlock
  };
}
