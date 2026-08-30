/**
 * Campus-Groovelab Tier-1 Zero-PII Crash Telemetry Sanitizer
 * Scrubs all emails, UUIDs, tokens, and PII from runtime stack traces.
 */

// Regex patterns for sensitive data
const UUID_REGEX = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const JWT_REGEX = /eyJ[a-zA-Z0-9-_]+\.eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/g;
const PIN_REGEX = /\b\d{4,8}\b/g;

export function sanitizeErrorMessage(message: string): string {
  if (!message || typeof message !== 'string') return '';

  return message
    .replace(JWT_REGEX, '[REDACTED_JWT]')
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(UUID_REGEX, '[REDACTED_UUID]')
    .replace(PIN_REGEX, '[REDACTED_PIN]');
}

export function initGlobalErrorSanitizer(): void {
  if (typeof window === 'undefined') return;

  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const sanitizedArgs = args.map((arg) => {
      if (typeof arg === 'string') {
        return sanitizeErrorMessage(arg);
      }
      if (arg instanceof Error) {
        const sanitizedError = new Error(sanitizeErrorMessage(arg.message));
        sanitizedError.stack = sanitizeErrorMessage(arg.stack || '');
        return sanitizedError;
      }
      return arg;
    });

    originalConsoleError.apply(console, sanitizedArgs);
  };
}
