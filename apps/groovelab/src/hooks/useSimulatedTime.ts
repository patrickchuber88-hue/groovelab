import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_DATE = 'groovelab_simulated_date';
const STORAGE_KEY_TS = 'groovelab_simulated_start_timestamp';
const EVENT_NAME = 'groovelab_simulated_date_changed';

/**
 * Pure Utility Funktion zum Abfragen der aktuellen (ggf. simulierten) Systemzeit.
 * Kann in React-Komponenten und zustandslosen Services gleichermaßen genutzt werden.
 */
export function getSimulatedNow(): Date {
  if (typeof window === 'undefined') return new Date();

  try {
    const simStr = localStorage.getItem(STORAGE_KEY_DATE);
    if (!simStr) return new Date();

    const startTsStr = localStorage.getItem(STORAGE_KEY_TS);
    const startTs = startTsStr ? parseInt(startTsStr, 10) : Date.now();
    const elapsed = Date.now() - (isNaN(startTs) ? Date.now() : startTs);

    const parts = simStr.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0])) return new Date();

    const simDate = new Date(parts[0], parts[1] - 1, parts[2], 14, 0, 0, 0);
    return new Date(simDate.getTime() + elapsed);
  } catch {
    return new Date();
  }
}

/**
 * ⏰ Reaktiver Hook für simulierte Systemzeit in Campus-Groovelab
 * 
 * Synchronisiert automatisch über Tab- und Modulgrenzen hinweg per CustomEvent und StorageEvent.
 */
export function useSimulatedTime() {
  const [now, setNow] = useState<Date>(() => getSimulatedNow());
  const [simulatedDateStr, setSimulatedDateStr] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DATE) : null;
  });

  const sync = useCallback(() => {
    setNow(getSimulatedNow());
    setSimulatedDateStr(typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DATE) : null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener(EVENT_NAME, sync);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_DATE || e.key === STORAGE_KEY_TS) {
        sync();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [sync]);

  const setSimulatedDate = useCallback((dateStr: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_DATE, dateStr);
    localStorage.setItem(STORAGE_KEY_TS, String(Date.now()));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
    sync();
  }, [sync]);

  const clearSimulatedDate = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY_DATE);
    localStorage.removeItem(STORAGE_KEY_TS);
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
    sync();
  }, [sync]);

  return {
    now,
    isSimulated: Boolean(simulatedDateStr),
    simulatedDateStr,
    setSimulatedDate,
    clearSimulatedDate,
    refresh: sync
  };
}
