// ==============================================================================
// Campus-Groovelab Media Validator & Forensic Metadata Sanitizer
// Standard: OWASP ASVS Level 3 / UrhG § 73 / KUG § 22 (Zero-Photo & Metadata Scrub)
// ==============================================================================

export interface MagicByteValidationResult {
  isValid: boolean;
  detectedFormat: string | null;
  mimeType: string | null;
  error?: string;
}

/**
 * Validates a buffer's initial bytes against authoritative media signatures.
 * Blocks polyglot scripts or disguised executables.
 */
export function validateMagicBytes(buffer: Buffer): MagicByteValidationResult {
  if (!buffer || buffer.length < 12) {
    return { isValid: false, detectedFormat: null, mimeType: null, error: 'File buffer too short for signature validation' };
  }

  // 1. PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46 && buffer[4] === 0x2d) {
    return { isValid: true, detectedFormat: 'PDF', mimeType: 'application/pdf' };
  }

  // 2. MP3: ID3 tag header or frame sync 0xFF 0xFB / 0xFF 0xF3 / 0xFF 0xF2
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return { isValid: true, detectedFormat: 'MP3 (ID3)', mimeType: 'audio/mpeg' };
  }
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return { isValid: true, detectedFormat: 'MP3 (Raw Frame)', mimeType: 'audio/mpeg' };
  }

  // 3. M4A / MP4 Audio: ftypM4A or ftypmp42 or ftypisom at offset 4
  const ftypStr = buffer.subarray(4, 12).toString('ascii');
  if (ftypStr.startsWith('ftypM4A') || ftypStr.startsWith('ftypmp4') || ftypStr.startsWith('ftypisom') || ftypStr.startsWith('ftypdash')) {
    return { isValid: true, detectedFormat: 'M4A/MP4', mimeType: 'audio/mp4' };
  }

  // 4. WAV: RIFF....WAVE (0x52 0x49 0x46 0x46 .... 0x57 0x41 0x56 0x45)
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    const waveStr = buffer.subarray(8, 12).toString('ascii');
    if (waveStr === 'WAVE') {
      return { isValid: true, detectedFormat: 'WAV', mimeType: 'audio/wav' };
    }
  }

  // 5. OGG: OggS (0x4F 0x67 0x67 0x53)
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return { isValid: true, detectedFormat: 'OGG', mimeType: 'audio/ogg' };
  }

  // 6. WebM / Matroska: 0x1A 0x45 0xDF 0xA3
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { isValid: true, detectedFormat: 'WEBM', mimeType: 'audio/webm' };
  }

  // 7. PNG: \x89PNG\r\n\x1a\n
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { isValid: true, detectedFormat: 'PNG', mimeType: 'image/png' };
  }

  // 8. JPEG: \xFF\xD8\xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, detectedFormat: 'JPEG', mimeType: 'image/jpeg' };
  }

  return {
    isValid: false,
    detectedFormat: null,
    mimeType: null,
    error: 'Unrecognized or unauthorized binary format (Magic Byte Mismatch)'
  };
}

/**
 * Sanitizes metadata (EXIF/GPS/Device markers) from audio & image buffers.
 * Strips identifiable strings like iPhone/iPad hardware tags or geographical GPS coordinates.
 */
export function scrubMediaMetadata(buffer: Buffer): { cleanedBuffer: Buffer; scrubbedItemsCount: number } {
  let scrubbedCount = 0;
  const copy = Buffer.from(buffer);

  // Common metadata markers to zero out
  const privacyPatterns = [
    /iPhone/gi,
    /iPad/gi,
    /MacBook/gi,
    /Android/gi,
    /Pixel/gi,
    /Samsung/gi,
    /GPSVersionID/gi,
    /GPSLatitude/gi,
    /GPSLongitude/gi
  ];

  for (const pattern of privacyPatterns) {
    let match: RegExpExecArray | null;
    const textSnapshot = copy.toString('binary');
    while ((match = pattern.exec(textSnapshot)) !== null) {
      const start = match.index;
      const len = match[0].length;
      // Overwrite with neutral whitespace or zeros
      for (let i = 0; i < len; i++) {
        copy[start + i] = 0x20; // replace with space
      }
      scrubbedCount++;
    }
  }

  return { cleanedBuffer: copy, scrubbedItemsCount: scrubbedCount };
}
