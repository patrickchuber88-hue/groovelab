/**
 * ==============================================================================
 * CAMPUS-GROOVELAB ERROR HELPER & TYPE-GUARD UTILITY
 * Standardizes unknown error handling across all services, RPCs, and UI layers.
 * Eliminates unsafe `catch (err: any)` patterns according to Strict TypeScript.
 * ==============================================================================
 */

export interface StructuredErrorLike {
  message?: string;
  code?: string | number;
  details?: string;
  hint?: string;
  status?: number;
}

/**
 * Type-guard to check whether an unknown value is an Error instance.
 */
export function isErrorObject(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type-guard to check whether an unknown value is a structured PostgREST or API error object.
 */
export function isStructuredErrorLike(error: unknown): error is StructuredErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('message' in error || 'details' in error || 'code' in error || 'status' in error)
  );
}

/**
 * Safely extracts a user-readable error message from an unknown error type.
 */
export function getErrorMessage(error: unknown, fallback: string = 'Ein unbekannter Fehler ist aufgetreten.'): string {
  if (!error) {
    return fallback;
  }

  if (typeof error === 'string') {
    return error.trim() || fallback;
  }

  if (isErrorObject(error)) {
    return error.message || fallback;
  }

  if (isStructuredErrorLike(error)) {
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message.trim();
    }
    if (typeof error.details === 'string' && error.details.trim()) {
      return error.details.trim();
    }
    if (typeof error.code === 'string' || typeof error.code === 'number') {
      return `Fehlercode: ${error.code}`;
    }
  }

  try {
    const stringified = JSON.stringify(error);
    if (stringified && stringified !== '{}') {
      return stringified;
    }
  } catch {
    // Ignore JSON circular structure serialization errors
  }

  return fallback;
}

/**
 * Safely extracts an error code (e.g. Postgres error code '23505' or HTTP status) from an unknown error.
 */
export function getErrorCode(error: unknown): string | number | undefined {
  if (isStructuredErrorLike(error)) {
    return error.code || error.status;
  }
  return undefined;
}
