/**
 * ==============================================================================
 * CAMPUS-GROOVELAB RFC 7807 PROBLEM DETAILS ERROR HANDLER
 * Translates REST API errors into standardized RFC 7807 Problem Details
 * ==============================================================================
 */

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
  timestamp: string;
}

export function parseApiError(error: any, endpoint?: string): ProblemDetails {
  const timestamp = new Date().toISOString();

  if (!error) {
    return {
      type: 'https://campus-groovelab.de/errors/unknown',
      title: 'Unbekannter Fehler',
      status: 500,
      detail: 'Ein unerwarteter Systemfehler ist aufgetreten.',
      instance: endpoint,
      code: 'CG_UNKNOWN_ERROR',
      timestamp,
    };
  }

  // Check if error is already an RFC 7807 object
  if (error.type && error.title && error.status) {
    return {
      ...error,
      timestamp: error.timestamp || timestamp,
    };
  }

  const postgrestCode = error.code || error.status || '';
  const message = error.message || error.error_description || String(error);

  switch (postgrestCode) {
    case '42501':
    case 403:
      return {
        type: 'https://campus-groovelab.de/errors/forbidden',
        title: 'Zugriff verweigert (RLS Violation)',
        status: 403,
        detail: 'Sie besitzen keine Berechtigung für diesen Schul- oder Benutzerkontext.',
        instance: endpoint,
        code: 'CG_FORBIDDEN',
        timestamp,
      };

    case '23505': // Unique violation
    case 409:
      return {
        type: 'https://campus-groovelab.de/errors/conflict',
        title: 'Datenkonflikt (Bereits vorhanden)',
        status: 409,
        detail: 'Dieser Datensatz oder diese Buchung existiert bereits im System.',
        instance: endpoint,
        code: 'CG_CONFLICT',
        timestamp,
      };

    case 'PGRST116':
    case 404:
      return {
        type: 'https://campus-groovelab.de/errors/not-found',
        title: 'Datensatz nicht gefunden',
        status: 404,
        detail: 'Der angeforderte Datensatz konnte nicht gefunden werden.',
        instance: endpoint,
        code: 'CG_NOT_FOUND',
        timestamp,
      };

    case '23503': // Foreign key violation
      return {
        type: 'https://campus-groovelab.de/errors/invalid-reference',
        title: 'Ungültige Verknüpfung',
        status: 422,
        detail: 'Die verknüpfte Schule, Lehrkraft oder der Raum existiert nicht mehr.',
        instance: endpoint,
        code: 'CG_INVALID_REFERENCE',
        timestamp,
      };

    default:
      return {
        type: 'https://campus-groovelab.de/errors/api-error',
        title: 'API-Anfrage fehlgeschlagen',
        status: typeof error.status === 'number' ? error.status : 400,
        detail: message,
        instance: endpoint,
        code: postgrestCode ? `PGRST_${postgrestCode}` : 'CG_API_ERROR',
        timestamp,
      };
  }
}
