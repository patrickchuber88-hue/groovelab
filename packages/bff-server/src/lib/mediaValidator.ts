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

  // 2. MP3 / AAC ADTS: ID3 tag header or frame sync
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return { isValid: true, detectedFormat: 'MP3 (ID3)', mimeType: 'audio/mpeg' };
  }
  if (buffer[0] === 0xff && (buffer[1] === 0xf1 || buffer[1] === 0xf9)) {
    return { isValid: true, detectedFormat: 'AAC (ADTS)', mimeType: 'audio/aac' };
  }
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return { isValid: true, detectedFormat: 'MP3 (Raw Frame)', mimeType: 'audio/mpeg' };
  }

  // 3. M4A / MP4 / AAC Audio: ftypM4A or ftypmp42 or ftypisom at offset 4
  const ftypStr = buffer.subarray(4, 12).toString('ascii');
  if (ftypStr.startsWith('ftypM4A') || ftypStr.startsWith('ftypmp4') || ftypStr.startsWith('ftypisom') || ftypStr.startsWith('ftypdash')) {
    return { isValid: true, detectedFormat: 'M4A/MP4', mimeType: 'audio/mp4' };
  }

  // 4. WAV / WEBP: RIFF....WAVE or RIFF....WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    const riffSubType = buffer.subarray(8, 12).toString('ascii');
    if (riffSubType === 'WAVE') {
      return { isValid: true, detectedFormat: 'WAV', mimeType: 'audio/wav' };
    }
    if (riffSubType === 'WEBP') {
      return { isValid: true, detectedFormat: 'WEBP', mimeType: 'image/webp' };
    }
  }

  // 5. FLAC: fLaC (0x66 0x4C 0x61 0x43)
  if (buffer[0] === 0x66 && buffer[1] === 0x4c && buffer[2] === 0x61 && buffer[3] === 0x43) {
    return { isValid: true, detectedFormat: 'FLAC', mimeType: 'audio/flac' };
  }

  // 6. OGG: OggS (0x4F 0x67 0x67 0x53)
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return { isValid: true, detectedFormat: 'OGG', mimeType: 'audio/ogg' };
  }

  // 7. WebM / Matroska: 0x1A 0x45 0xDF 0xA3
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { isValid: true, detectedFormat: 'WEBM', mimeType: 'audio/webm' };
  }

  // 8. PNG: \x89PNG\r\n\x1a\n
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { isValid: true, detectedFormat: 'PNG', mimeType: 'image/png' };
  }

  // 9. JPEG: \xFF\xD8\xFF
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
 * Strips binary JPEG APP1-APP15 (0xFFE1..0xFFEF) EXIF/XMP/IPTC segments while preserving
 * SOI (0xFFD8), APP0/JFIF (0xFFE0), DQT, DHT, SOF, and SOS scan data.
 */
export function stripJpegMetadata(buffer: Buffer): { buffer: Buffer; strippedSegments: number } {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return { buffer, strippedSegments: 0 };
  }

  const chunks: Buffer[] = [buffer.subarray(0, 2)]; // SOI
  let offset = 2;
  let strippedSegments = 0;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    const marker = buffer[offset + 1];
    // SOS (Start of Scan 0xDA) or EOI (0xD9): copy remainder verbatim
    if (marker === 0xda || marker === 0xd9) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    // Standalone markers without length
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(buffer.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2 || offset + 2 + segmentLength > buffer.length) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    // Strip APP1..APP15 (0xE1..0xEF) and COM (0xFE) comments
    if ((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) {
      strippedSegments++;
    } else {
      chunks.push(buffer.subarray(offset, offset + 2 + segmentLength));
    }

    offset += 2 + segmentLength;
  }

  return { buffer: Buffer.concat(chunks), strippedSegments };
}

/**
 * Sanitizes metadata (EXIF/GPS/Device markers & binary JPEG APP1-APP15 segments) from audio & image buffers.
 * Strips identifiable strings like iPhone/iPad hardware tags or geographical GPS coordinates.
 */
export function scrubMediaMetadata(buffer: Buffer): { cleanedBuffer: Buffer; scrubbedItemsCount: number } {
  let scrubbedCount = 0;
  let workingBuffer = Buffer.from(buffer);

  // 1. Binary JPEG EXIF/XMP Segment Stripping (APP1..APP15 & COM)
  if (workingBuffer.length >= 4 && workingBuffer[0] === 0xff && workingBuffer[1] === 0xd8) {
    const jpegRes = stripJpegMetadata(workingBuffer);
    workingBuffer = Buffer.from(jpegRes.buffer);
    scrubbedCount += jpegRes.strippedSegments;
  }

  // 2. Common metadata markers (ID3/MP4/RIFF/QuickTime atoms) to zero out
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
    const textSnapshot = workingBuffer.toString('binary');
    while ((match = pattern.exec(textSnapshot)) !== null) {
      const start = match.index;
      const len = match[0].length;
      for (let i = 0; i < len; i++) {
        workingBuffer[start + i] = 0x20;
      }
      scrubbedCount++;
    }
  }

  return { cleanedBuffer: workingBuffer, scrubbedItemsCount: scrubbedCount };
}
