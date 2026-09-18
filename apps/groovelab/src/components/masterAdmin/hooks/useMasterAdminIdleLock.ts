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
        throw new Error('Bitte Passkey, Master-Passwort oder PIN eingeben.');
      }

      const currentUserId = currentUser?.id || adminUserId;
      let isVerified = false;

      // Check Master Admin credentials via login_master_admin RPC
      const { data: authData, error: authErr } = await supabase.rpc('login_master_admin', {
        p_username: adminUsername || 'admin',
        p_password: pinOrPass
      });

      if (!authErr && authData && (authData.id || authData.requires_2fa || authData.is_master_admin)) {
        isVerified = true;
      } else if (currentUserId) {
        const { data: pinValid, error: pinErr } = await supabase.rpc('verify_personal_pin', {
          user_uuid: currentUserId,
          input_pin: pinOrPass
        });
        if (!pinErr && pinValid === true) {
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
