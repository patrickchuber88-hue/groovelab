// Strict Runtime Type Guards & Data Minimization Validation for Campus-Groovelab
// Eliminates `as any` type casting across Student, Teacher, and Auth states

export interface ValidatedStudent {
  id: string;
  first_name: string;
  last_name: string;
  role: 'student';
  instrument?: string | null;
  avatar_url?: string | null;
  school_id?: string | null;
}

export interface ValidatedUser {
  id: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  first_name?: string;
  last_name?: string;
}

/**
 * Validates that an untyped object conforms to the Student structure.
 */
export function isStudent(obj: any): obj is ValidatedStudent {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.first_name === 'string' &&
    typeof obj.last_name === 'string'
  );
}

/**
 * Anonymizes student names per DSGVO/COPPA project rules ("First Name + Initial Last Name").
 * Example: "Max Mustermann" -> "Max M."
 */
export function formatAnonymizedName(firstName: string, lastName?: string | null): string {
  if (!firstName) return '';
  const initial = lastName ? ` ${lastName.trim().charAt(0)}.` : '';
  return `${firstName.trim()}${initial}`;
}

/**
 * Safely parses JSON strings with a default fallback to prevent runtime crashes.
 */
export function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    const parsed = JSON.parse(jsonString);
    return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
  } catch (err) {
    console.warn('[SafeJsonParse] Corrupted JSON detected, falling back to default:', err);
    return fallback;
  }
}
