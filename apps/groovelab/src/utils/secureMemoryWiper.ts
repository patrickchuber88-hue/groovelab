/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: SECURE MEMORY ZERO-REMANENCE WIPER
 * ==============================================================================
 * Standards: ISO/IEC 27040 (Sanitization & Zero-Remanence) / BSI IT-Grundschutz SYS.1.6
 * Compliance: OWASP ASVS Level 3 V8 Data Protection / Defense against Cold-Boot & Heap Scraping
 * 
 * Forensischer Zweck:
 * Gewährleistet, dass flüchtige kryptografische Schlüssel, Notfall-PINs und temporäre
 * Migrations-Puffer nach ihrer Verwendung aktiv im V8-Arbeitsspeicher genullt werden,
 * anstatt auf den unvorhersehbaren Garbage Collector zu warten.
 * ==============================================================================
 */

/**
 * Allocates a secure contiguous typed byte array of a given size.
 */
export function allocateSecureBuffer(size: number): Uint8Array {
  if (size <= 0 || !Number.isSafeInteger(size)) {
    throw new Error('SECURE_MEMORY_ERROR: Buffer size must be a positive safe integer.');
  }
  return new Uint8Array(size);
}

/**
 * Forensically sanitizes a buffer by applying a 3-pass overwrite pattern:
 * 1. Pass: All zeros (0x00)
 * 2. Pass: All ones (0xFF)
 * 3. Pass: All zeros (0x00)
 * 
 * This defeats remnant memory scrapers and core dump extractors.
 */
export function wipeBuffer(buffer: Uint8Array | { buffer: ArrayBufferLike; byteOffset: number; byteLength: number }): void {
  if (!buffer) return;

  const uint8 = buffer instanceof Uint8Array 
    ? buffer 
    : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Pass 1: 0x00
  uint8.fill(0x00);
  // Pass 2: 0xFF
  uint8.fill(0xFF);
  // Pass 3: 0x00
  uint8.fill(0x00);
}

/**
 * Executes a scoped cryptographic operation with an automatically sanitized buffer.
 * Guarantees memory wiping via try/finally block even if exceptions are thrown.
 */
export function runWithSecureBuffer<T>(
  size: number,
  operation: (buffer: Uint8Array) => T
): T {
  const buffer = allocateSecureBuffer(size);
  try {
    return operation(buffer);
  } finally {
    wipeBuffer(buffer);
  }
}

/**
 * Asynchronous version of runWithSecureBuffer for promises.
 */
export async function runWithSecureBufferAsync<T>(
  size: number,
  operation: (buffer: Uint8Array) => Promise<T>
): Promise<T> {
  const buffer = allocateSecureBuffer(size);
  try {
    return await operation(buffer);
  } finally {
    wipeBuffer(buffer);
  }
}

/**
 * Verifies whether a given buffer is completely zeroed out.
 */
export function isBufferZeroed(buffer: Uint8Array): boolean {
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] !== 0) return false;
  }
  return true;
}
