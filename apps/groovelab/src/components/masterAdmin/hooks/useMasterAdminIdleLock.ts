import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { isMasterPasskeyRegistered, authenticateMasterPasskey } from '../../../utils/webauthn';
import { revokeMasterSessionLease } from '../../../utils/masterAuditLogger';

interface UseMasterAdminIdleLockOptions {
  currentUser?: { id?: string } | null;
  adminUsername?: string;
  adminUserId?: string;
}

export function useMasterAdminIdleLock({ currentUser, adminUsername, adminUserId }: UseMasterAdminIdleLockOptions = {}) {
  const [isIdleLocked, setIsIdleLocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('cg_master_idle_locked') === 'true';
    } catch {
      return false;
    }
  });
  const [idleUnlockLoading, setIdleUnlockLoading] = useState(false);
  const [idlePinInput, setIdlePinInput] = useState('');
  const [idleError, setIdleError] = useState<string | null>(null);
  const [idleFailedAttempts, setIdleFailedAttempts] = useState<number>(0);

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let lastResetMs = 0;
    const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minuten

    const resetIdleTimer = () => {
      if (isIdleLocked) return;
      const now = Date.now();
      if (now - lastResetMs < 2000) return;
      lastResetMs = now;
      if (idleTimer !== undefined) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        try {
          sessionStorage.setItem('cg_master_idle_locked', 'true');
        } catch {
          // Ignore storage errors
        }
        setIsIdleLocked(true);
      }, IDLE_TIMEOUT_MS);
    };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      if (idleTimer !== undefined) clearTimeout(idleTimer);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetIdleTimer));
    };
  }, [isIdleLocked]);

  const handleIdleUnlock = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIdleUnlockLoading(true);
    setIdleError(null);
    try {
      const pinOrPass = idlePinInput.trim();

      // 1. Dual-Unlock Fix: If user entered a TOTP or Recovery code, verify it server-side first
      if (pinOrPass.length > 0) {
        const currentUserId = currentUser?.id || adminUserId;
        let isVerified = false;

        if (/^[0-9]{6}$/.test(pinOrPass)) {
          const { data: stepUpData, error: stepUpErr } = await supabase.rpc('verify_master_admin_step_up', {
            p_totp_code: pinOrPass
          });
          if (!stepUpErr && stepUpData?.success === true) {
            isVerified = true;
          } else {
            const { data: authTotp, error: authTotpErr } = await supabase.rpc('login_master_admin', {
              p_username: adminUsername || 'admin',
              p_totp_code: pinOrPass
            });
            if (!authTotpErr && authTotp && (authTotp.id || authTotp.is_master_admin)) {
              isVerified = true;
            }
          }
        } else if (pinOrPass.toUpperCase().startsWith('GL-') || pinOrPass.length >= 12) {
          const { data: authData, error: authErr } = await supabase.rpc('login_master_admin', {
            p_username: adminUsername || 'admin',
            p_recovery_code: pinOrPass
          });

          if (!authErr && authData && (authData.id || authData.is_master_admin)) {
            isVerified = true;
          }
        } else {
          throw new Error('Bitte den 6-stelligen Google Authenticator Code oder Notfall-Code (GL-...) eingeben.');
        }

        if (isVerified) {
          try {
            sessionStorage.removeItem('cg_master_idle_locked');
          } catch {
            // Ignore storage errors
          }
          setIsIdleLocked(false);
          setIdlePinInput('');
          setIdleFailedAttempts(0);
          setIdleUnlockLoading(false);
          return;
        }

        const nextFailures = idleFailedAttempts + 1;
        setIdleFailedAttempts(nextFailures);

        if (nextFailures >= 3) {
          try {
            sessionStorage.removeItem('cg_master_idle_locked');
          } catch {
            // Ignore storage errors
          }
          await revokeMasterSessionLease(currentUserId || 'master_admin', 'master_logout');
          window.location.reload();
          return;
        }

        throw new Error(`Ungültige Anmeldedaten. Noch ${3 - nextFailures} Versuch(e) verbleibend.`);
      }

      // 2. Only when idlePinInput is empty and Passkey is registered, trigger WebAuthn Passkey
      if (isMasterPasskeyRegistered()) {
        await authenticateMasterPasskey();
        try {
          sessionStorage.removeItem('cg_master_idle_locked');
        } catch {
          // Ignore storage errors
        }
        setIsIdleLocked(false);
        setIdlePinInput('');
        setIdleFailedAttempts(0);
        setIdleUnlockLoading(false);
        return;
      }

      throw new Error('Bitte Touch ID verwenden oder den 6-stelligen Google Authenticator Code eingeben.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Entsperrung fehlgeschlagen.';
      setIdleError(errMsg);
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
