/**
 * Campus-Groovelab Ideal Security & Simplicity PIN Validation Engine
 * 
 * Sets the optimal balance between high usability for kids/teens/students
 * and essential baseline security:
 * - Requires exactly 4 numeric digits.
 * - Blocks only trivial repetitive sequences (0000, 1111, ..., 1234, 4321).
 * - Allows all other personal combinations (years, favorite numbers, memorable dates) freely.
 */

// Essential trivial blacklist (all same digits or direct 4-step runs)
const TRIVIAL_PINS = new Set([
  '0000', '1111', '2222', '3333', '4444',
  '5555', '6666', '7777', '8888', '9999',
  '1234', '4321'
]);

export interface PinValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a proposed 4-digit PIN for format and baseline security.
 * 
 * @param pin The 4-digit string to validate
 * @param _dayOfBirth Optional (maintained for backward compatibility)
 */
export function validateNewPin(pin: string, _dayOfBirth?: number | string | null): PinValidationResult {
  const cleanPin = String(pin || '').trim();

  // 1. Length & Numeric Format Check
  if (!/^\d{4}$/.test(cleanPin)) {
    return {
      isValid: false,
      error: 'Die PIN muss genau 4 Ziffern lang sein.'
    };
  }

  // 2. Baseline Trivial Sequences Block
  if (TRIVIAL_PINS.has(cleanPin)) {
    return {
      isValid: false,
      error: 'Diese PIN ist zu einfach zu erraten (bitte keine Folgen wie 1234 oder 0000 wählen).'
    };
  }

  return { isValid: true };
}
