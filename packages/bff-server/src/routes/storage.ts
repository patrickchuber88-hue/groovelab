import express, { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { decryptSession } from '../lib/session/crypto';
import { validateMagicBytes, scrubMediaMetadata } from '../lib/mediaValidator';

const router = Router();

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://supabase-kong:8000';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

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

    // 🛡️ FAIL-CLOSED AUTHENTICATION GUARD (Zero unauthenticated uploads)
    if (!accessToken) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentifizierung erforderlich. Kein gültiger Sitzungs-Token vorhanden.'
      });
    }

    // 🛡️ Authoritatively verify user token with Supabase
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Ungültiger oder abgelaufener Authentifizierungs-Token.'
      });
    }
    const authUser = userData.user;

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

    // 🛡️ BOLA / IDOR Protection: Non-staff users cannot write into another user's folder
    const userRole = authUser.user_metadata?.role || authUser.app_metadata?.role;
    if (cleanStudentId && userRole === 'student' && authUser.id !== cleanStudentId) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Zugriff verweigert: Sie können nur Dateien in Ihr eigenes Verzeichnis hochladen.'
      });
    }

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

    // 5. Ephemeral upload signing client scoped to authenticated caller
    const storageClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    });

    // 6. Generate signed upload URL with 5 minutes (300s) TTL (upsert: false to protect integrity)
    const { data, error } = await storageClient.storage
      .from(targetBucket)
      .createSignedUploadUrl(storagePath, { upsert: false });

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

/**
 * POST /api/storage/verify-upload-buffer
 * 
 * Inspects uploaded file buffer for genuine magic bytes and scrubs identifiable metadata (EXIF/ID3/GPS).
 */
router.post('/verify-upload-buffer', express.raw({ type: '*/*', limit: '25mb' }), (req: Request, res: Response) => {
  const buffer = req.body as Buffer;
  if (!buffer || buffer.length === 0) {
    return res.status(400).json({ error: 'EMPTY_FILE', message: 'Keine Dateidaten empfangen.' });
  }

  const validation = validateMagicBytes(buffer);
  if (!validation.isValid) {
    return res.status(415).json({
      error: 'INVALID_MAGIC_BYTES',
      message: 'Echte Magic-Byte-Prüfung fehlgeschlagen: Die Datei entspricht nicht dem autorisierten Binärformat.',
      details: validation.error
    });
  }

  const { scrubbedItemsCount } = scrubMediaMetadata(buffer);

  return res.status(200).json({
    success: true,
    detectedFormat: validation.detectedFormat,
    mimeType: validation.mimeType,
    metadataScrubbed: scrubbedItemsCount > 0,
    scrubbedItemsCount
  });
});

/**
 * GET /api/storage/stream/:bucket/*
 * 
 * Streams protected private audio media with HTTP 206 Partial Content (Range Support)
 * for seamless scrubbing/buffering in iOS Safari WebAudio.
 */
router.get('/stream/:bucket/*', async (req: Request, res: Response) => {
  try {
    const bucket = req.params.bucket;
    const filePath = req.params[0];

    if (!ALLOWED_BUCKETS.has(bucket) || !filePath) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Zugriff auf diesen Speicherpfad verweigert.' });
    }

    // Ephemeral download client
    const storageClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    const { data: signedData, error: signError } = await storageClient.storage
      .from(bucket)
      .createSignedUrl(filePath, 1800); // 30 minutes TTL for playback (UrhG § 73)

    if (signError || !signedData?.signedUrl) {
      return res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'Audiodatei nicht gefunden oder Signierung fehlgeschlagen.' });
    }

    // Forward range requests to upstream storage to ensure iOS Safari WebAudio compatibility
    const rangeHeader = req.headers.range;
    const fetchHeaders: Record<string, string> = {};
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const upstreamRes = await fetch(signedData.signedUrl, { headers: fetchHeaders });

    res.status(upstreamRes.status);
    upstreamRes.headers.forEach((value, key) => {
      // Forward relevant audio streaming headers
      if (['content-range', 'content-length', 'content-type', 'accept-ranges'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      const pump = async () => {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        res.write(Buffer.from(value));
        await pump();
      };
      await pump();
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error('[BFF Storage Stream] Error streaming media:', err);
    return res.status(500).json({ error: 'STREAMING_ERROR', message: 'Fehler beim Medienstreaming.' });
  }
});

export default router;
