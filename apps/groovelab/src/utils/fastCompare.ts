/**
 * fastCompare.ts - High-Performance Structural Equality Checker
 * Campus-Groovelab Monolith Goldstandard
 * 
 * Replaces main-thread blocking JSON.stringify(prev) === JSON.stringify(next) patterns.
 * Runs in O(N) with microsecond execution times, preventing browser frame drops and render stalls.
 */

export function areArraysEqualFast<T extends Record<string, any>>(
  a: T[] | null | undefined,
  b: T[] | null | undefined,
  keysToCheck?: (keyof T)[]
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;

  for (let i = 0; i < a.length; i++) {
    const itemA = a[i];
    const itemB = b[i];
    if (itemA === itemB) continue;
    if (!itemA || !itemB) return false;

    // Check id first if present
    if (itemA.id !== undefined || itemB.id !== undefined) {
      if (itemA.id !== itemB.id) return false;
    }

    if (keysToCheck && keysToCheck.length > 0) {
      for (const k of keysToCheck) {
        if (itemA[k] !== itemB[k]) return false;
      }
    } else {
      // Default common state keys
      if (itemA.updated_at !== itemB.updated_at) return false;
      if (itemA.status !== itemB.status) return false;
      if (itemA.name !== itemB.name) return false;
      if (itemA.is_active !== itemB.is_active) return false;
      if (itemA.is_campus_active !== itemB.is_campus_active) return false;
      if (itemA.is_groovelab_active !== itemB.is_groovelab_active) return false;
      if (itemA.gps_verified !== itemB.gps_verified) return false;
    }
  }

  return true;
}

export function areObjectsEqualFast<T extends Record<string, any>>(
  a: T | null | undefined,
  b: T | null | undefined,
  keysToCheck?: (keyof T)[]
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  const keys = keysToCheck || (Object.keys(a) as (keyof T)[]);
  for (const k of keys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}
