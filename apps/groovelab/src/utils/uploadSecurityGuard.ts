/**
 * Campus-Groovelab Client-Side Upload Security Guard
 * 
 * Enforces strict MIME-type whitelists, extension validation, and payload size caps
 * before files are transmitted to Supabase Storage.
 * Blocks executable SVG scripts, disguised payloads, and oversized media.
 */

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
}

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;  // 25 MB
const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_AUDIO_MIMES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/aac'];
const ALLOWED_DOC_MIMES = ['application/pdf'];

/**
 * Validates a file before upload.
 */
export function validateFileUpload(
  file: File | Blob,
  category: 'avatar' | 'audio' | 'document',
  filename?: string
): UploadValidationResult {
  if (!file) {
    return { valid: false, error: 'Keine Datei ausgewählt.' };
  }

  // 1. Size Validation
  const size = file.size;
  if (category === 'avatar' && size > MAX_AVATAR_SIZE_BYTES) {
    return { valid: false, error: 'Profilbild überschreitet das Limit von 5 MB.' };
  }
  if (category === 'audio' && size > MAX_AUDIO_SIZE_BYTES) {
    return { valid: false, error: 'Audio-Aufnahme überschreitet das Limit von 25 MB.' };
  }
  if (category === 'document' && size > MAX_DOCUMENT_SIZE_BYTES) {
    return { valid: false, error: 'Dokument überschreitet das Limit von 15 MB.' };
  }

  // 2. MIME Type Validation
  const mime = file.type.toLowerCase();

  if (category === 'avatar') {
    // Explicit block on SVG with potential embedded XSS scripts
    if (mime.includes('svg') || (filename && filename.toLowerCase().endsWith('.svg'))) {
      return { valid: false, error: 'SVG-Dateien sind aus Sicherheitsgründen nicht für Profilbilder zugelassen.' };
    }
    if (mime && !ALLOWED_IMAGE_MIMES.includes(mime)) {
      return { valid: false, error: 'Ungültiges Bildformat. Nur JPEG, PNG und WebP sind erlaubt.' };
    }
  }

  if (category === 'audio') {
    if (mime && !ALLOWED_AUDIO_MIMES.some(allowed => mime.includes(allowed.split('/')[1]))) {
      return { valid: false, error: 'Ungültiges Audioformat. Bitte MP3, WAV, AAC oder WebM verwenden.' };
    }
  }

  if (category === 'document') {
    if (mime && !ALLOWED_DOC_MIMES.includes(mime)) {
      return { valid: false, error: 'Ungültiges Dokumentenformat. Nur PDF-Dateien sind erlaubt.' };
    }
  }

  return { valid: true };
}
