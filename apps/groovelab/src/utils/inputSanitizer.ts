/**
 * Campus-Groovelab Enterprise Input Sanitizer
 * 
 * Protects against Cross-Site Scripting (XSS), HTML injection,
 * and malicious payload formatting across all forms and onboarding wizards.
 */

/**
 * Strips all HTML tags, script elements, event handlers, and javascript: protocols.
 */
export function sanitizeTextInput(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Remove <style> tags
    .replace(/<[^>]+>/g, '')                                          // Strip all remaining HTML tags
    .replace(/javascript:/gi, '')                                     // Strip javascript: protocol
    .replace(/vbscript:/gi, '')                                       // Strip vbscript: protocol
    .replace(/data:text\/html/gi, '')                                 // Strip data HTML
    .replace(/on\w+\s*=/gi, '')                                       // Strip inline event handlers (e.g. onload=)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')                // Strip non-printable control characters
    .trim();
}

/**
 * Sanitizes a school name, preserving legal abbreviations and standard musical characters.
 */
export function sanitizeSchoolName(name: string | null | undefined): string {
  const clean = sanitizeTextInput(name);
  return clean.replace(/[<>{}[\]\\^`~]/g, '').replace(/\s+/g, ' ');
}

/**
 * Sanitizes postal address lines (street, house number, city).
 */
export function sanitizeAddress(address: string | null | undefined): string {
  const clean = sanitizeTextInput(address);
  return clean.replace(/[<>{}[\]\\^`~]/g, '').replace(/\s+/g, ' ');
}

/**
 * Sanitizes personal names (first name, last name).
 */
export function sanitizePersonName(name: string | null | undefined): string {
  const clean = sanitizeTextInput(name);
  return clean.replace(/[<>{}[\]\\^`~0-9]/g, '').replace(/\s+/g, ' ');
}
