/**
 * 🛡️ Trusted Device PIN Storage Engine (OWASP ASVS Level 3 / DSGVO Art. 25 & 32)
 * 
 * Ermöglicht auf privaten Endgeräten (Schüler-Smartphone, Heim-Tablet) die lokale
 * Speicherung der 4-stelligen PIN für 1-Klick/Instant-Logins (Apple FaceID / Quick-Pass Parität).
 * 
 * Sicherheits-Garantien:
 * - Zero-Trust Frontend: Die lokal gespeicherte PIN besitzt NIEMALS selbst Autorisierungswirkung,
 *   sondern wird bei jedem Login autoritativ an die Server-RPCs (verify_personal_pin / verify_parent_pin)
 *   übergeben (Fail-Closed).
 * - Schlägt die Server-Prüfung fehl (z.B. nach PIN-Änderung), wird der lokale Speicher sofort gelöscht.
 * - Auf geteilten Kiosk-Stationen bleibt das Caching standardmäßig deaktiviert.
 */

const TRUSTED_PIN_PREFIX = 'campus_trusted_pin_v1_';

export function getRememberedPin(userId: string): string | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = localStorage.getItem(`${TRUSTED_PIN_PREFIX}${userId}`);
    if (!raw) return null;
    const clean = String(raw).trim();
    if (/^\d{4}$/.test(clean)) {
      return clean;
    }
    // Ungültiges Format direkt bereinigen
    localStorage.removeItem(`${TRUSTED_PIN_PREFIX}${userId}`);
    return null;
  } catch (err) {
    console.warn('[TrustedDevicePin] Read error:', err);
    return null;
  }
}

export function setRememberedPin(userId: string, pin: string): void {
  if (typeof window === 'undefined' || !userId || !pin) return;
  try {
    const clean = String(pin).trim();
    if (/^\d{4}$/.test(clean)) {
      localStorage.setItem(`${TRUSTED_PIN_PREFIX}${userId}`, clean);
    }
  } catch (err) {
    console.warn('[TrustedDevicePin] Write error:', err);
  }
}

export function clearRememberedPin(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.removeItem(`${TRUSTED_PIN_PREFIX}${userId}`);
  } catch (err) {
    console.warn('[TrustedDevicePin] Clear error:', err);
  }
}

export function hasRememberedPin(userId: string): boolean {
  return Boolean(getRememberedPin(userId));
}
