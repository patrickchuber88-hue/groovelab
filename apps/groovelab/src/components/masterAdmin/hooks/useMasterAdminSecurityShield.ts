import { useState, useEffect, useCallback } from 'react';

export function useMasterAdminSecurityShield() {
  const [integrityCompromised, setIntegrityCompromised] = useState(false);
  const [integrityReason, setIntegrityReason] = useState<string | null>(null);

  const performIntegrityScan = useCallback((): boolean => {
    if (typeof window === 'undefined') return true;

    // 1. Clickjacking Protection (Iframe check)
    try {
      if (window.self !== window.top) {
        setIntegrityCompromised(true);
        setIntegrityReason('Clickjacking-Schutz: Unerlaubte Einbettung in fremden Iframe erkannt.');
        return false;
      }
    } catch {
      setIntegrityCompromised(true);
      setIntegrityReason('Cross-Origin Iframe-Restriktion aktiv.');
      return false;
    }

    // 2. Prototype Pollution Guard
    try {
      const forbiddenProps = ['isAdmin', 'is_master_admin', 'role', 'polluted', 'payload'];
      for (const prop of forbiddenProps) {
        if (prop in Object.prototype) {
          setIntegrityCompromised(true);
          setIntegrityReason(`Prototype Pollution erkannt (${prop} in Object.prototype).`);
          return false;
        }
      }
    } catch (e) {
      console.warn('Prototype scan warning:', e);
    }

    // 3. Native Fetch Integrity (Detect hostile extension hooks)
    try {
      const fetchStr = Function.prototype.toString.call(window.fetch);
      if (!fetchStr.includes('[native code]') && !fetchStr.includes('fetch')) {
        setIntegrityCompromised(true);
        setIntegrityReason('Netzwerk-Integritätswarnung: window.fetch wurde modifiziert.');
        return false;
      }
    } catch (e) {
      console.warn('Fetch integrity scan warning:', e);
    }

    return true;
  }, []);

  useEffect(() => {
    performIntegrityScan();
    const interval = setInterval(performIntegrityScan, 30000);
    return () => clearInterval(interval);
  }, [performIntegrityScan]);

  return {
    integrityCompromised,
    integrityReason,
    performIntegrityScan,
  };
}
