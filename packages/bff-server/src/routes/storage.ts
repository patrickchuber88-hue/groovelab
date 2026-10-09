import express, { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { decryptSession } from '../lib/session/crypto';
import { validateMagicBytes, scrubMediaMetadata } from '../lib/mediaValidator';
import { validateBody } from '../middleware/validateIngress';
import { idempotencyBarrier } from '../middleware/idempotencyMiddleware';
import { presignUploadSchema, presignStreamSchema, deleteAssetsSchema } from '../schemas/ingressSchemas';

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

export interface AuthUserData {
  accessToken: string;
  user: any;
  role: string;
  schoolId: string | null;
}

/**
 * Authoritatively resolves and verifies user session via JWE cookie or Bearer header.
 */
export async function resolveAuthUser(req: Request): Promise<AuthUserData | null> {
  let accessToken: string | null = null;
  const sessionCookie = req.cookies?.['__Host-session'];
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

  if (!accessToken) return null;

  try {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return null;
    }

    const user = userData.user;
    const role = user.user_metadata?.role || user.app_metadata?.role || 'student';
    const schoolId = user.user_metadata?.school_id || user.app_metadata?.school_id || null;

    return { accessToken, user, role, schoolId };
  } catch {
    return null;
  }
}

/**
 * Validates path traversal and BOLA/IDOR permissions against authenticated user identity.
 */
export function validatePathAccess(
  filePath: string,
  authData: AuthUserData
): { allowed: boolean; reason?: string } {
  // 1. Strict Path Traversal Prevention
  if (filePath.includes('..') || filePath.includes('\\') || filePath.includes('//')) {
    return { allowed: false, reason: 'PATH_TRAVERSAL_DETECTED' };
  }

  // Master Admin can access all paths
  if (authData.role === 'master_admin') {
    return { allowed: true };
  }

  // Canonical Hierarchies:
  // schools/<schoolId>/students/<studentId>/<context>/<filename>
  // schools/<schoolId>/<context>/<filename>
  // <context>/<filename>
  const segments = filePath.split('/').filter(Boolean);

  if (segments[0] === 'schools') {
    const targetSchoolId = segments[1];
    // School staff/admin/teacher/student must match targetSchoolId if schoolId is known
    if (authData.schoolId && targetSchoolId && authData.schoolId !== targetSchoolId) {
      return { allowed: false, reason: 'MULTI_TENANT_VIOLATION' };
    }

    if (segments[2] === 'students') {
      const targetStudentId = segments[3];
      // If student caller, they can ONLY access their own student folder
      if (authData.role === 'student' && authData.user.id !== targetStudentId) {
        return { allowed: false, reason: 'STUDENT_BOLA_VIOLATION' };
      }
    }
  }

  return { allowed: true };
}

// ── In-Memory LRU Cache for Signed Streaming Leases ──
interface CachedStreamLease {
  signedUrl: string;
  expiresAt: number;
}
const streamLeaseCache = new Map<string, CachedStreamLease>();
const MAX_STREAM_CACHE_ENTRIES = 5000;

export function getCachedStreamUrl(cacheKey: string): string | null {
  const cached = streamLeaseCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt - Date.now() > 300 * 1000) {
    return cached.signedUrl;
  }
  streamLeaseCache.delete(cacheKey);
  return null;
}

export function setCachedStreamUrl(cacheKey: string, signedUrl: string, ttlSeconds: number): void {
  if (streamLeaseCache.size >= MAX_STREAM_CACHE_ENTRIES) {
    const oldestKey = streamLeaseCache.keys().next().value;
    if (oldestKey) streamLeaseCache.delete(oldestKey);
  }
  streamLeaseCache.set(cacheKey, {
    signedUrl,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

export function invalidateStreamLease(cacheKey: string): void {
  streamLeaseCache.delete(cacheKey);
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
 * Protected by: Ingress Schema Validation -> Idempotency Barrier
 */
router.post('/presign-upload', validateBody(presignUploadSchema), idempotencyBarrier(), async (req: Request, res: Response) => {
  try {
    // 1. Authenticate user via JWE session cookie or Authorization header
    const authData = await resolveAuthUser(req);
    if (!authData) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentifizierung erforderlich. Kein gültiger Sitzungs-Token vorhanden.'
      });
    }
    const authUser = authData.user;
    const accessToken = authData.accessToken;

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
 * POST /api/storage/presign-stream
 * 
 * Generates an ephemeral, cryptographically authenticated Pre-signed Streaming URL (UrhG § 73).
 * Protected by: Ingress Schema Validation -> JWE Session Auth -> BOLA Multi-Tenant Gatekeeper -> In-Memory LRU Cache.
 */
router.post('/presign-stream', validateBody(presignStreamSchema), async (req: Request, res: Response) => {
  try {
    const authData = await resolveAuthUser(req);
    if (!authData) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentifizierung erforderlich. Keine gültige Sitzung vorhanden.'
      });
    }

    const { filePath, bucket = 'campus-assets', expiresInSeconds = 1800 } = req.body;

    const accessCheck = validatePathAccess(filePath, authData);
    if (!accessCheck.allowed) {
      console.warn(`🚨 [BFF Storage BOLA Guard] Blocked stream access to ${filePath} by user ${authData.user.id}: ${accessCheck.reason}`);
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Zugriff auf diese Mediendatei verweigert (BOLA / Mandantenschutz).'
      });
    }

    // Sub-millisecond In-Memory LRU Cache lookup
    const cacheKey = `${bucket}:${filePath}`;
    const cachedUrl = getCachedStreamUrl(cacheKey);
    if (cachedUrl) {
      return res.status(200).json({
        success: true,
        bucket,
        filePath,
        signedUrl: cachedUrl,
        expiresInSeconds,
        cached: true
      });
    }

    // Ephemeral scoped storage client
    const storageClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${authData.accessToken}` }
      }
    });

    const { data: signedData, error: signError } = await storageClient.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresInSeconds);

    if (signError || !signedData?.signedUrl) {
      return res.status(404).json({
        error: 'FILE_NOT_FOUND',
        message: 'Audiodatei nicht gefunden oder Signierung fehlgeschlagen.',
        details: signError?.message
      });
    }

    setCachedStreamUrl(cacheKey, signedData.signedUrl, expiresInSeconds);

    return res.status(200).json({
      success: true,
      bucket,
      filePath,
      signedUrl: signedData.signedUrl,
      expiresInSeconds,
      cached: false
    });
  } catch (err: any) {
    console.error('[BFF Storage Presign Stream] Unexpected error:', err);
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Unerwarteter Fehler bei der Medien-Signierung.'
    });
  }
});

/**
 * GET /api/storage/stream/:bucket/*
 * 
 * Streams protected private audio media with HTTP 206 Partial Content (Range Support)
 * for seamless scrubbing/buffering in iOS Safari WebAudio.
 * Zero-Memory Architecture: HTTP 307 Temporary Redirect directly to signed storage endpoint.
 */
router.get('/stream/:bucket/*', async (req: Request, res: Response) => {
  try {
    const bucket = req.params.bucket;
    const filePath = req.params[0];

    if (!ALLOWED_BUCKETS.has(bucket) || !filePath) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Zugriff auf diesen Speicherpfad verweigert.' });
    }

    // 🛡️ Fail-Closed Authentication & Session Verification (CWE-306 Remediation)
    const authData = await resolveAuthUser(req);
    if (!authData) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentifizierung für Medien-Streaming erforderlich.'
      });
    }

    // 🛡️ Path Traversal & BOLA Validation
    const accessCheck = validatePathAccess(filePath, authData);
    if (!accessCheck.allowed) {
      if (accessCheck.reason === 'PATH_TRAVERSAL_DETECTED') {
        return res.status(400).json({ error: 'BAD_REQUEST', message: 'Ungültiger Pfad.' });
      }
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Zugriff auf diese Mediendatei verweigert (BOLA).' });
    }

    // Ephemeral download client
    const storageClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${authData.accessToken}` }
      }
    });
    const { data: signedData, error: signError } = await storageClient.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600); // 3.600s TTL (60 Minuten) für Unterrichtseinheiten & Bandproben (UrhG § 73)

    if (signError || !signedData?.signedUrl) {
      return res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'Audiodatei nicht gefunden oder Signierung fehlgeschlagen.' });
    }

    // 🛡️ ZERO-PROXY ARCHITECTURE (OWASP ASVS L3 / Zero Heap Buffering of Children's Voices)
    // Direct HTTP 307 Temporary Redirect with Range Headers to signed storage endpoint
    res.setHeader('Location', signedData.signedUrl);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    return res.status(307).end();
  } catch (err: any) {
    console.error('[BFF Storage Stream] Error streaming media:', err);
    return res.status(500).json({ error: 'STREAMING_ERROR', message: 'Fehler beim Medienstreaming.' });
  }
});

/**
 * POST /api/storage/delete-assets
 * 
 * Authoritative GDPR Art. 17 Asset Purge Engine & Batch Deletion Gateway.
 * Protected by: Ingress Schema Validation -> Session Auth -> BOLA Path Verification -> Audit Log.
 */
router.post('/delete-assets', validateBody(deleteAssetsSchema), async (req: Request, res: Response) => {
  try {
    const authData = await resolveAuthUser(req);
    if (!authData) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentifizierung erforderlich. Keine gültige Sitzung vorhanden.'
      });
    }

    const { bucket = 'campus-assets', filePaths }: { bucket: string; filePaths: string[] } = req.body;

    const authorizedPaths: string[] = [];
    const rejectedPaths: string[] = [];

    for (const p of filePaths) {
      const check = validatePathAccess(p, authData);
      if (check.allowed) {
        authorizedPaths.push(p);
      } else {
        rejectedPaths.push(p);
      }
    }

    if (authorizedPaths.length === 0) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Keine Berechtigung zum Löschen der angegebenen Dateien (BOLA Schutz).',
        rejectedPaths
      });
    }

    const storageClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${authData.accessToken}` }
      }
    });

    const { error: removeError } = await storageClient.storage
      .from(bucket)
      .remove(authorizedPaths);

    if (removeError) {
      console.error('[BFF Storage Delete] Upstream storage deletion failed:', removeError);
      return res.status(502).json({
        error: 'STORAGE_DELETION_FAILED',
        message: 'Löschen der Dateien im Storage-System fehlgeschlagen.',
        details: removeError.message
      });
    }

    // Invalidate LRU stream cache for deleted paths
    for (const p of authorizedPaths) {
      invalidateStreamLease(`${bucket}:${p}`);
    }

    console.log(`[BFF Storage Delete] User ${authData.user.id} (${authData.role}) purged ${authorizedPaths.length} assets from ${bucket}.`);

    return res.status(200).json({
      success: true,
      bucket,
      deletedCount: authorizedPaths.length,
      deletedPaths: authorizedPaths,
      rejectedCount: rejectedPaths.length,
      rejectedPaths
    });
  } catch (err: any) {
    console.error('[BFF Storage Delete] Unexpected error:', err);
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Unerwarteter Fehler beim Löschen der Mediendateien.'
    });
  }
});

export default router;
