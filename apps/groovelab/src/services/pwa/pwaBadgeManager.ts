/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: PWA App Badging & Focus-Quiet-Hours Manager
 * 
 * Verankerung:
 * - W3C Badging API (navigator.setAppBadge / navigator.clearAppBadge)
 * - Kinderschutz & ArbZG § 5 Ruhezeiten (20:00 bis 07:00 Uhr)
 * - Fail-Closed & Zero-Crash Architecture: 100% gekapselt in try/catch
 */

export interface BadgeManagerOptions {
  ignoreQuietHours?: boolean;
}

/**
 * Prüft, ob die W3C Badging API im aktuellen Browser verfügbar ist (z.B. iOS PWA, Android Chrome, Edge).
 */
export function isBadgingSupported(): boolean {
  return typeof navigator !== 'undefined' && 
         'setAppBadge' in navigator && 
         'clearAppBadge' in navigator;
}

/**
 * Ermittelt, ob aktuell Schutz- und Ruhezeiten gelten (Standard: 20:00 Uhr abends bis 07:00 Uhr morgens).
 * Schützt Kinder und Lehrkräfte vor unzeitgemäßem Benachrichtigungsdruck.
 */
export function isQuietHours(date: Date = new Date()): boolean {
  const currentHour = date.getHours();
  return currentHour >= 20 || currentHour < 7;
}

/**
 * Aktualisiert das App-Icon-Badge auf dem Homescreen.
 * 
 * @param count Anzahl ungelesener Ereignisse (Nachrichten, Hausaufgaben, Absagen)
 * @param options Optionale Parameter (z.B. Übersteuerung der Ruhezeiten)
 * @returns Promise<boolean> true, wenn das Badge erfolgreich gesetzt wurde
 */
export async function updatePwaAppBadge(
  count: number, 
  options: BadgeManagerOptions = {}
): Promise<boolean> {
  if (!isBadgingSupported()) {
    return false;
  }

  try {
    const effectiveCount = Math.max(0, Math.floor(count));

    // Liegen keine ungelesenen Elemente vor, Badge rückstandslos entfernen
    if (effectiveCount === 0) {
      await navigator.clearAppBadge();
      return true;
    }

    // Wenn Ruhezeiten aktiv sind und nicht explizit ignoriert werden: Badge nicht anzeigen
    if (!options.ignoreQuietHours && isQuietHours()) {
      await navigator.clearAppBadge();
      return false;
    }

    // Badge mit autoritativer Zähler-Zahl setzen
    await navigator.setAppBadge(effectiveCount);
    return true;
  } catch (err) {
    // Fail-Closed: Stille Kapselung ohne UI-Störung
    return false;
  }
}

/**
 * Entfernt das App-Icon-Badge restlos vom Homescreen.
 */
export async function clearPwaAppBadge(): Promise<boolean> {
  if (!isBadgingSupported()) {
    return false;
  }

  try {
    await navigator.clearAppBadge();
    return true;
  } catch (err) {
    return false;
  }
}
