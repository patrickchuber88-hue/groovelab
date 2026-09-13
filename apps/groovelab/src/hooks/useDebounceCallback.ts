import { useRef, useCallback, useEffect } from 'react';

/**
 * ⚡ Memory-Safe Tier-1 Debounce Callback Hook
 * 
 * Verhindert Memory-Leaks und übermäßige Aufrufe:
 * - Räumt Timer bei Komponenten-Unmount automatisch auf
 * - Hält immer die aktuellste Referenz der übergebenen Callback-Funktion
 * 
 * @param callback Die auszuführende Funktion
 * @param delayMs Verzögerungszeit in Millisekunden (Standard: 300ms)
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delayMs: number = 300
): (...args: Parameters<T>) => void {
  const callbackRef = useRef<T>(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    },
    [delayMs]
  );
}
