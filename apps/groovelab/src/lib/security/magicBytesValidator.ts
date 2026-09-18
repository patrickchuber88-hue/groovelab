/**
 * Campus-Groovelab Enterprise Magic-Bytes Binary Header Guard
 * Bounded Context: SEC-24 (OWASP ASVS Level 3 Binary Validation)
 * 
 * Inspects raw file bytes to prevent disguised malicious executables or
 * scripts from being uploaded with spoofed file extensions.
 */

export interface MagicBytesValidationResult {
  valid: boolean;
  detectedMime: string | null;
  error?: string;
}

/**
 * Validates a File or Blob against its physical binary magic numbers.
 * Reads only the first 32 bytes into an ArrayBuffer for instant, zero-lag inspection.
 */
export async function validateFileMagicBytes(file: File | Blob): Promise<MagicBytesValidationResult> {
  if (!file || file.size === 0) {
    return { valid: false, detectedMime: null, error: 'Datei ist leer oder ungültig.' };
  }

  // Read only the first 32 bytes
  const slice = file.slice(0, 32);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 1. PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return { valid: true, detectedMime: 'application/pdf' };
  }

  // 2. PNG: \x89PNG\r\n\x1a\n (0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A)
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0D &&
    bytes[5] === 0x0A &&
    bytes[6] === 0x1A &&
    bytes[7] === 0x0A
  ) {
    return { valid: true, detectedMime: 'image/png' };
  }

  // 3. JPEG: 0xFF 0xD8 0xFF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // 4. Audio MP3: ID3 header (0x49 0x44 0x33) or MPEG frame sync (0xFF 0xFB/FA/F3/F2)
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return { valid: true, detectedMime: 'audio/mpeg' };
  }
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) {
    return { valid: true, detectedMime: 'audio/mpeg' };
  }

  // 5. Audio WAV: RIFF....WAVE (0x52 0x49 0x46 0x46 ... 0x57 0x41 0x56 0x45)
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45
  ) {
    return { valid: true, detectedMime: 'audio/wav' };
  }

  // 6. Audio/Video MP4/M4A: ....ftyp (Offset 4: 0x66 0x74 0x79 0x70)
  if (
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  ) {
    return { valid: true, detectedMime: 'audio/mp4' };
  }

  // 7. Audio FLAC: fLaC (0x66 0x4C 0x61 0x43)
  if (
    bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43
  ) {
    return { valid: true, detectedMime: 'audio/flac' };
  }

  // 8. Audio OGG: OggS (0x4F 0x67 0x67 0x53)
  if (
    bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53
  ) {
    return { valid: true, detectedMime: 'audio/ogg' };
  }

  // Binary signature could not be verified -> Hard Reject
  return {
    valid: false,
    detectedMime: null,
    error: 'Sicherheitsfehler: Der Dateiinhalt entspricht keinem erlaubten, sicheren Format (PDF, MP3, WAV, M4A, PNG, JPEG).'
  };
}
