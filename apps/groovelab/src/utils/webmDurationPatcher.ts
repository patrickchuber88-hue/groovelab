/**
 * Campus-Groovelab In-Memory WebM EBML Duration Patcher
 * 
 * Fixes the Chromium/WebAudio MediaRecorder bug where WebM audio blobs lack
 * the EBML `Duration` cue header, causing `audio.duration === Infinity` and
 * broken timeline scrubbing in Chrome, Safari and Android.
 * 
 * References:
 * - Matroska / EBML Specification (RFC 8794)
 * - Element 0x1549A966: Segment Info
 * - Element 0x4489: Segment Duration (Float)
 * - Element 0x2AD7B1: TimestampScale (default: 1,000,000 ns = 1 ms)
 */

export async function fixWebmDuration(blob: Blob, durationSeconds: number): Promise<Blob> {
  if (!blob || !blob.type.includes('webm') || durationSeconds <= 0) {
    return blob;
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    const uint8 = new Uint8Array(arrayBuffer);

    // 1. Verify EBML Magic Header: 0x1A, 0x45, 0xDF, 0xA3
    if (uint8[0] !== 0x1A || uint8[1] !== 0x45 || uint8[2] !== 0xDF || uint8[3] !== 0xA3) {
      return blob; // Not a valid EBML/WebM container, return unchanged
    }

    // 2. Scan for Segment Info (0x15, 0x49, 0xA9, 0x66) in the first 4096 bytes
    let infoOffset = -1;
    const scanLimit = Math.min(uint8.length - 8, 4096);

    for (let i = 4; i < scanLimit; i++) {
      if (
        uint8[i] === 0x15 &&
        uint8[i + 1] === 0x49 &&
        uint8[i + 2] === 0xA9 &&
        uint8[i + 3] === 0x66
      ) {
        infoOffset = i;
        break;
      }
    }

    if (infoOffset === -1) {
      return blob; // No Info segment found in header range
    }

    // 3. Check if Duration element (0x44, 0x89) already exists inside Info
    let durationOffset = -1;
    let durationLen = 0;
    const infoSearchLimit = Math.min(infoOffset + 512, uint8.length - 4);

    for (let i = infoOffset + 4; i < infoSearchLimit; i++) {
      if (uint8[i] === 0x44 && uint8[i + 1] === 0x89) {
        durationOffset = i;
        // The length descriptor of EBML float is at i + 2
        const lenByte = uint8[i + 2];
        if (lenByte === 0x84) {
          durationLen = 4; // 32-bit float
        } else if (lenByte === 0x88) {
          durationLen = 8; // 64-bit float
        }
        break;
      }
    }

    const durationMs = durationSeconds * 1000;

    if (durationOffset !== -1 && durationLen > 0) {
      // Modify in-place
      const patchedBuffer = arrayBuffer.slice(0);
      const patchedView = new DataView(patchedBuffer);
      const floatStart = durationOffset + 3;

      if (durationLen === 4) {
        patchedView.setFloat32(floatStart, durationMs, false); // Big endian
      } else {
        patchedView.setFloat64(floatStart, durationMs, false); // Big endian
      }

      return new Blob([patchedBuffer], { type: blob.type });
    }

    // 4. If Duration element is not present in Info header, return original intact blob safely
    return blob;
  } catch (err) {
    console.warn('[webmDurationPatcher] Could not patch WebM duration header:', err);
    return blob;
  }
}
