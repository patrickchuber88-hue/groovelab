/**
 * ==============================================================================
 * 🛡️ Campus-Groovelab Media Sanitizer & EXIF/GPS Metadata Stripper
 * Standard: DSGVO Art. 25 & 32 / Privacy-by-Design Media Uploads (Punkt 83)
 * ==============================================================================
 * Strips all EXIF, GPS location tags, and device fingerprints from images before
 * they are uploaded to storage buckets.
 */

import { detectMediaMagicBytes, validateMediaBlob } from '../../utils/mediaSecurityValidator';

export interface SanitizedMediaResult {
  blob: Blob;
  mimeType: string;
  originalSize: number;
  sanitizedSize: number;
  isSanitized: boolean;
}

/**
 * Strips EXIF/GPS metadata by rendering an image to an offscreen Canvas
 * and re-encoding it into a clean binary Blob.
 */
export async function stripImageMetadata(file: File | Blob): Promise<SanitizedMediaResult> {
  const originalSize = file.size;

  // 1. Verify binary magic bytes to prevent polyglot file uploads
  const validation = await validateMediaBlob(file, 'image', file.type);
  if (!validation.isValid) {
    throw new Error(`[SanitizeMedia] Ungültige oder verdächtige Bilddatei: ${validation.reason}`);
  }

  // 2. Load into HTML Image
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D-Context nicht verfügbar.');
        }

        // Draw image clean onto fresh canvas (strips all EXIF/GPS metadata tags)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Export as sanitized image/jpeg or image/png
        const targetMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Fehler bei der Canvas-Kompilierung.'));
              return;
            }
            resolve({
              blob,
              mimeType: targetMime,
              originalSize,
              sanitizedSize: blob.size,
              isSanitized: true,
            });
          },
          targetMime,
          0.92 // High visual fidelity
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Konnte Bild zur Metadaten-Bereinigung nicht laden.'));
    };

    img.src = objectUrl;
  });
}
