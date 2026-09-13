/**
 * 🏛️ Kanonische Tier-1 Formatter-Engine für Campus-Groovelab
 * 
 * Bietet defensive, fehlertolerante (Fail-Closed) Pure Functions für:
 * - Währungsbeträge (EUR & CHF nach PAngV)
 * - Deutsche Datums- und Wochentagsformate
 * 
 * Garantiert Single Source of Truth (SSOT) ohne Rundungs- oder Format-Diskrepanzen.
 */

export type CurrencyCode = 'EUR' | 'CHF';

/**
 * Formatiert einen Betrag standardkonform nach deutschen bzw. Schweizer Konventionen.
 * Fängt null, undefined und NaN defensiv ab.
 * 
 * @example
 * formatCurrency(14.9) => "14,90 €"
 * formatCurrency(14.9, 'CHF') => "CHF 14.90"
 * formatCurrency(null) => "0,00 €"
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: CurrencyCode = 'EUR'
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return currency === 'CHF' ? 'CHF 0.00' : '0,00 €';
  }

  const num = Number(amount);
  if (currency === 'CHF') {
    return `CHF ${num.toFixed(2)}`;
  }
  return `${num.toFixed(2).replace('.', ',')} €`;
}

/**
 * Formatiert einen Datums-String oder ein Date-Objekt in das deutsche Standardformat DD.MM.YYYY.
 * Unterstützt ISO-Strings (z.B. "2026-09-12"), Date-Objekte und Millisekunden-Timestamps.
 * 
 * @example
 * formatGermanDate("2026-09-12") => "12.09.2026"
 * formatGermanDate(new Date()) => "12.09.2026"
 */
export function formatGermanDate(
  date: string | Date | number | null | undefined
): string {
  if (!date) return '';

  try {
    // Schneller Pfad für Standard YYYY-MM-DD Strings
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
      const parts = date.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
      }
    }

    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) {
      return typeof date === 'string' ? date : '';
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return typeof date === 'string' ? date : '';
  }
}

/**
 * Liefert das deutsche Wochentags-Kürzel (z.B. "Mo", "Di") oder den vollen Namen.
 * 
 * @example
 * formatGermanWeekday("2026-09-12") => "Sa"
 * formatGermanWeekday("2026-09-12", false) => "Samstag"
 */
export function formatGermanWeekday(
  date: string | Date | number | null | undefined,
  short: boolean = true
): string {
  if (!date) return '';

  try {
    let d: Date;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const parts = date.split('-');
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = date instanceof Date ? date : new Date(date);
    }

    if (isNaN(d.getTime())) return '';

    return d.toLocaleDateString('de-DE', { weekday: short ? 'short' : 'long' }).substring(0, short ? 2 : undefined);
  } catch {
    return '';
  }
}

/**
 * Formatiert Uhrzeiten (HH:MM) defensiv.
 * Schneidet Sekunden ab oder normalisiert Sekunden-Timestamps.
 * 
 * @example
 * formatTimeDisplay("14:30:00") => "14:30"
 * formatTimeDisplay("09:15") => "09:15"
 */
export function formatTimeDisplay(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  return timeStr.substring(0, 5);
}
