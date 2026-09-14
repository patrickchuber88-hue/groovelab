import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { decryptSession } from '../lib/session/crypto';

const router = Router();

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://supabase-kong:8000';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// Allowed MIME types for Zero-Memory Media Ingestion
const ALLOWED_MIME_TYPES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

// Allowed context buckets and folders
const ALLOWED_BUCKETS = new Set(['campus-assets', 'groovelab-assets']);
const ALLOWED_CONTEXTS = new Set([
  'recordings',
  'loops',
  'audio_biography',
  'audio',
  'meisterwerk',
  'avatars',
  'feed-attachments',
  'homework',
  'practice_companion',
  'media',
  'band-media'
]);

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB strict upper limit

interface PresignUploadRequest {
  context: string;
  extension: string;
  contentType: string;
  sizeBytes: number;
  schoolId?: string | null;
  studentId?: string | null;
  uniqueId?: string | null;
  bucket?: string;
}

/**
 * Sanitizes path segments to prevent directory traversal or malicious characters.
 */
function sanitizePathSegment(input: string | null | undefined, defaultValue: string = ''): string {
  if (!input) return defaultValue;
  return input.replace(/[^a-zA-Z0-9_-]/g, '') || defaultValue;
}

/**
 * POST /api/storage/presign-upload
 * 
 * Generates an ephemeral, cryptographically signed Direct-to-Storage upload URL.
 * Bypasses the BFF Node.js process heap memory completely (Zero-Memory Audio Pipeline).
 */
router.post('/presign-upload', async (req: Request, res: Response) => {
  try {
    // 1. Authenticate user via JWE session cookie or Authorization header
    let accessToken: string | null = null;
    const sessionCookie = req.cookies['__Host-session'];
    if (sessionCookie) {
      const session = await decryptSession(sessionCookie);
      if (session?.accessToken) {
        accessToken = session.accessToken;
      }
    }

    if (!accessToken && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        accessToken = parts[1];
      }
    }

    const {
      context = 'audio',
      extension = 'webm',
      contentType = 'audio/webm',
      sizeBytes = 0,
      schoolId = null,
      studentId = null,
      uniqueId = null,
      bucket = 'campus-assets'
    }: PresignUploadRequest = req.body;

    // 2. Validate MIME type
    const normalizedContentType = contentType.toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(normalizedContentType)) {
      return res.status(400).json({
        error: 'INVALID_MIME_TYPE',
        message: `MIME-Type '${contentType}' ist nicht zulässig. Erlaubt: Audio (WebM, MP4, MP3, WAV) und Bilder.`
      });
    }

    // 3. Validate size constraints
    const numericSize = Number(sizeBytes);
    if (isNaN(numericSize) || numericSize <= 0) {
      return res.status(400).json({
        error: 'INVALID_FILE_SIZE',
        message: 'Ungültige Dateigröße deklariert.'
      });
    }
    if (numericSize > MAX_UPLOAD_BYTES) {
      return res.status(413).json({
        error: 'FILE_TOO_LARGE',
        message: `Dateigröße (${(numericSize / 1024 / 1024).toFixed(2)} MB) überschreitet das Limit von 25 MB.`
      });
    }

    // 4. Validate and sanitize bucket and context
    const targetBucket = ALLOWED_BUCKETS.has(bucket) ? bucket : 'campus-assets';
    const cleanContext = sanitizePathSegment(context, 'audio');
    if (!ALLOWED_CONTEXTS.has(cleanContext)) {
      return res.status(400).json({
        error: 'INVALID_CONTEXT',
        message: `Ungültiger Kontext '${context}'.`
      });
    }

    const cleanExt = sanitizePathSegment(extension, 'webm');
    const cleanUniqueId = sanitizePathSegment(uniqueId, `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    const cleanSchoolId = sanitizePathSegment(schoolId, '');
    const cleanStudentId = sanitizePathSegment(studentId, '');

    // Canonical Campus-Groovelab storage path:
    // schools/<schoolId>/students/<studentId>/<context>/<uniqueId>.<ext> or schools/<schoolId>/<context>/<uniqueId>.<ext>
    let storagePath: string;
    if (cleanSchoolId && cleanStudentId) {
      storagePath = `schools/${cleanSchoolId}/students/${cleanStudentId}/${cleanContext}/${cleanUniqueId}.${cleanExt}`;
    } else if (cleanSchoolId) {
      storagePath = `schools/${cleanSchoolId}/${cleanContext}/${cleanUniqueId}.${cleanExt}`;
    } else {
      storagePath = `${cleanContext}/${cleanUniqueId}.${cleanExt}`;
    }

    // 5. Generate authenticated storage client
    const signingKey = accessToken || supabaseServiceRoleKey;
    const clientOptions: any = {
      auth: { persistSession: false },
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      }
    };

    const storageClient = createClient(supabaseUrl, signingKey, clientOptions);

    // 6. Generate signed upload URL with 5 minutes (300s) TTL
    const { data, error } = await storageClient.storage
      .from(targetBucket)
      .createSignedUploadUrl(storagePath, { upsert: true });

    if (error || !data) {
      console.error('[BFF Storage] Failed to generate signed upload URL:', error);
      return res.status(502).json({
        error: 'STORAGE_SIGNING_FAILED',
        message: 'Konnte signierte Upload-URL nicht vom Storage-Dienst abrufen.',
        details: error?.message
      });
    }

    console.log(`[BFF Storage] Signed upload ticket issued for path: ${storagePath} (Bucket: ${targetBucket}, Size: ${numericSize} bytes)`);

    return res.status(200).json({
      success: true,
      bucket: targetBucket,
      path: storagePath,
      signedUrl: data.signedUrl,
      token: data.token,
      expiresInSeconds: 300,
      maxSizeBytes: MAX_UPLOAD_BYTES,
      contentType: normalizedContentType
    });
  } catch (err: any) {
    console.error('[BFF Storage] Unexpected error in presign-upload:', err);
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Unerwarteter Fehler bei der Signierung des Datei-Uploads.'
    });
  }
});

export default router;
