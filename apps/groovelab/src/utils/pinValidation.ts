/**
 * Campus-Groovelab Enterprise PIN Validation Engine
 * 
 * Enforces high entropy and security for 4-digit user PINs while maintaining
 * frictionless UX and child-friendly design.
 */

// Top global insecure/trivial 4-digit PINs
const TRIVIAL_PINS = new Set([
  '0000', '1111', '2222', '3333', '4444',
  '5555', '6666', '7777', '8888', '9999',
  '1234', '4321', '2580', '1212', '6969'
]);

export interface PinValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a proposed 4-digit PIN against trivial sequences and biographic birthday patterns.
 * 
 * @param pin The 4-digit string to validate
 * @param dayOfBirth Optional day of birth (1-31) of the user
 */
export function validateNewPin(pin: string, dayOfBirth?: number | string | null): PinValidationResult {
  const cleanPin = String(pin || '').trim();

  // 1. Length & Format Check
  if (!/^\d{4}$/.test(cleanPin)) {
    return {
      isValid: false,
      error: 'Die PIN muss genau 4 Ziffern lang sein.'
    };
  }

  // 2. Trivial & Pattern Blacklist
  if (TRIVIAL_PINS.has(cleanPin)) {
    return {
      isValid: false,
      error: 'Diese PIN ist zu einfach zu erraten. Bitte wähle eine sicherere Zahlenfolge.'
    };
  }

  // 3. DACH Birthday Heuristic (DDMM)
  // Only blocks when PIN starts with the user's birth day (DD) followed by a valid month (01-12).
  if (dayOfBirth !== undefined && dayOfBirth !== null && String(dayOfBirth).trim() !== '') {
    const dayNum = parseInt(String(dayOfBirth), 10);
    if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
      const dd = String(dayNum).padStart(2, '0');
      if (cleanPin.startsWith(dd)) {
        const potentialMonth = parseInt(cleanPin.slice(2, 4), 10);
        if (potentialMonth >= 1 && potentialMonth <= 12) {
          return {
            isValid: false,
            error: 'Bitte verwende aus Sicherheitsgründen nicht deinen Geburtstag (Tag + Monat) als PIN.'
          };
        }
      }
    }
  }

  return { isValid: true };
}
