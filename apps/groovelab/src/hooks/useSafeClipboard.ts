import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseSafeClipboardOptions {
  resetDelayMs?: number;
}

export interface UseSafeClipboardReturn {
  copy: (text: string) => Promise<boolean>;
  hasCopied: boolean;
  copiedText: string | null;
  error: Error | null;
  reset: () => void;
}

/**
 * 🛡️ Resilienter Tier-1 Clipboard Hook für Campus-Groovelab
 * 
 * Führt asynchrones Kopieren in die Zwischenablage aus:
 * - Primär: navigator.clipboard.writeText
 * - Fallback: document.execCommand('copy') für ältere iOS Safari WebViews / ungesicherte Kontexte
 * - Kein Crash bei abgelehnten Berechtigungen (Fail-Closed mit Error-State)
 * - Reaktives `hasCopied` Flag mit konfigurierbarem Auto-Reset
 */
export function useSafeClipboard(options: UseSafeClipboardOptions = {}): UseSafeClipboardReturn {
  const { resetDelayMs = 2500 } = options;
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHasCopied(false);
    setCopiedText(null);
    setError(null);
  }, []);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setError(null);

    // 1. Moderne Clipboard-API prüfen
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        setHasCopied(true);
        setCopiedText(text);
        timerRef.current = setTimeout(() => setHasCopied(false), resetDelayMs);
        return true;
      } catch (err: any) {
        // Fallback falls Erlaubnis verweigert oder iOS WebView Exception
      }
    }

    // 2. Fallback via temporäres Textarea-Element
    if (typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          setHasCopied(true);
          setCopiedText(text);
          timerRef.current = setTimeout(() => setHasCopied(false), resetDelayMs);
          return true;
        }
      } catch (fallbackErr: any) {
        setError(fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)));
      }
    }

    setError(new Error('Kopieren in die Zwischenablage nicht möglich.'));
    return false;
  }, [resetDelayMs]);

  return { copy, hasCopied, copiedText, error, reset };
}
