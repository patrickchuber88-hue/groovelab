import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_DATE = 'groovelab_simulated_date';
const STORAGE_KEY_TIME = 'groovelab_simulated_time';
const STORAGE_KEY_TS = 'groovelab_simulated_start_timestamp';
const EVENT_NAME = 'groovelab_simulated_date_changed';

/**
 * Pure Utility Funktion zum Abfragen der aktuellen (ggf. simulierten) Systemzeit.
 * Unterstützt autoritative Datum- und Uhrzeitsimulation für alle Dashboards.
 */
export function getSimulatedNow(): Date {
  if (typeof window === 'undefined') return new Date();

  try {
    const simDateStr = localStorage.getItem(STORAGE_KEY_DATE);
    const simTimeStr = localStorage.getItem(STORAGE_KEY_TIME);
    if (!simDateStr && !simTimeStr) return new Date();

    const startTsStr = localStorage.getItem(STORAGE_KEY_TS);
    let startTs = startTsStr ? parseInt(startTsStr, 10) : NaN;
    // ⏰ Garantierter Start: Bei fehlendem, veraltetem (>14h) oder negativem Timestamp neu ansetzen
    if (isNaN(startTs) || (Date.now() - startTs) > 14 * 60 * 60 * 1000 || (Date.now() - startTs) < 0) {
      startTs = Date.now();
      localStorage.setItem(STORAGE_KEY_TS, String(startTs));
    }
    const elapsed = Date.now() - startTs;

    let year: number;
    let monthIndex: number;
    let day: number;

    if (simDateStr) {
      const parts = simDateStr.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0])) {
        year = parts[0];
        monthIndex = parts[1] - 1;
        day = parts[2];
      } else {
        const real = new Date();
        year = real.getFullYear();
        monthIndex = real.getMonth();
        day = real.getDate();
      }
    } else {
      const real = new Date();
      year = real.getFullYear();
      monthIndex = real.getMonth();
      day = real.getDate();
    }

    let hours = 14;
    let minutes = 0;
    let seconds = 0;

    if (simTimeStr) {
      const tParts = simTimeStr.split(':').map(Number);
      if (!isNaN(tParts[0])) hours = tParts[0];
      if (tParts.length > 1 && !isNaN(tParts[1])) minutes = tParts[1];
      if (tParts.length > 2 && !isNaN(tParts[2])) seconds = tParts[2];
    }

    const simDate = new Date(year, monthIndex, day, hours, minutes, seconds, 0);
    return new Date(simDate.getTime() + elapsed);
  } catch {
    return new Date();
  }
}

/**
 * ⏰ Reaktiver Hook für simulierte Systemzeit in Campus-Groovelab
 * 
 * Synchronisiert Datum und Uhrzeit automatisch über Tab- und Modulgrenzen hinweg.
 */
export function useSimulatedTime() {
  const [now, setNow] = useState<Date>(() => getSimulatedNow());
  const [simulatedDateStr, setSimulatedDateStr] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DATE) : null;
  });
  const [simulatedTimeStr, setSimulatedTimeStr] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_TIME) : null;
  });

  const sync = useCallback(() => {
    setNow(getSimulatedNow());
    setSimulatedDateStr(typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DATE) : null);
    setSimulatedTimeStr(typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_TIME) : null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener(EVENT_NAME, sync);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_DATE || e.key === STORAGE_KEY_TIME || e.key === STORAGE_KEY_TS) {
        sync();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [sync]);

  const setSimulatedDate = useCallback((dateStr: string, timeStr?: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_DATE, dateStr);
    if (timeStr) {
      localStorage.setItem(STORAGE_KEY_TIME, timeStr);
    } else if (!localStorage.getItem(STORAGE_KEY_TIME)) {
      localStorage.setItem(STORAGE_KEY_TIME, '14:00:00');
    }
    localStorage.setItem(STORAGE_KEY_TS, String(Date.now()));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
    sync();
  }, [sync]);

  const setSimulatedTime = useCallback((timeStr: string) => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY_DATE)) {
      const real = new Date();
      const yyyy = real.getFullYear();
      const mm = String(real.getMonth() + 1).padStart(2, '0');
      const dd = String(real.getDate()).padStart(2, '0');
      localStorage.setItem(STORAGE_KEY_DATE, `${yyyy}-${mm}-${dd}`);
    }
    localStorage.setItem(STORAGE_KEY_TIME, timeStr);
    localStorage.setItem(STORAGE_KEY_TS, String(Date.now()));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
    sync();
  }, [sync]);

  const shiftSimulatedTime = useCallback((deltaMinutes: number) => {
    if (typeof window === 'undefined') return;
    const current = getSimulatedNow();
    current.setMinutes(current.getMinutes() + deltaMinutes);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const hh = String(current.getHours()).padStart(2, '0');
    const min = String(current.getMinutes()).padStart(2, '0');
    const ss = String(current.getSeconds()).padStart(2, '0');

    localStorage.setItem(STORAGE_KEY_DATE, `${yyyy}-${mm}-${dd}`);
    localStorage.setItem(STORAGE_KEY_TIME, `${hh}:${min}:${ss}`);
    localStorage.setItem(STORAGE_KEY_TS, String(Date.now()));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
    sync();
  }, [sync]);

  const clearSimulatedDate = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY_DATE);
    localStorage.removeItem(STORAGE_KEY_TIME);
    localStorage.removeItem(STORAGE_KEY_TS);
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
    sync();
  }, [sync]);

  return {
    now,
    isSimulated: Boolean(simulatedDateStr || simulatedTimeStr),
    simulatedDateStr,
    simulatedTimeStr,
    setSimulatedDate,
    setSimulatedTime,
    shiftSimulatedTime,
    clearSimulatedDate,
    refresh: sync
  };
}
