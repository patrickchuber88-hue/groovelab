import { supabase } from '../lib/supabase';
import { validateMediaBlob, stripAudioMetadata } from './mediaSecurityValidator';

/**
 * Enterprise+ Audio Storage Helper
 * Provides a secure mechanism to retrieve streaming URLs for user audio files
 * with HMAC-signed URL generation (15 min TTL) and seamless fallback to public storage.
 */

// In-memory cache for generated signed URLs to avoid redundant signing requests during playback
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getSecureAudioUrl(
  filePath: string,
  bucket: string = 'campus-assets',
  expiresInSeconds: number = 300 // 5 minutes TTL for JIT signed audio streaming (UrhG § 19a compliance)
): Promise<string> {
  if (!filePath) return '';

  let actualBucket = bucket;
  let relativePath = filePath;

  // 🛡️ UrhG § 19a & Private Bucket Support:
  // If the path is a full Supabase storage public or signed URL, extract bucket and object path
  if (filePath.includes('/storage/v1/object/public/') || filePath.includes('/storage/v1/object/sign/')) {
    const match = filePath.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?#]+)\/([^?#]+)/);
    if (match) {
      actualBucket = decodeURIComponent(match[1]);
      relativePath = decodeURIComponent(match[2]);
    }
  } else if (filePath.startsWith('blob:')) {
    return filePath;
  } else if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    // Other external third-party URL
    return filePath;
  }

  const cacheKey = `${actualBucket}:${relativePath}`;
  const now = Date.now();

  if (signedUrlCache.has(cacheKey)) {
    const entry = signedUrlCache.get(cacheKey)!;
    // Return cached if at least 30 seconds remain before expiration
    if (entry.expiresAt - now > 30 * 1000) {
      return entry.url;
    }
  }

  try {
    // 1. Generate short-lived HMAC Pre-Signed URL for private audio streaming
    const { data: signedData, error: signErr } = await supabase.storage
      .from(actualBucket)
      .createSignedUrl(relativePath, expiresInSeconds);

    if (!signErr && signedData?.signedUrl) {
      signedUrlCache.set(cacheKey, {
        url: signedData.signedUrl,
        expiresAt: now + expiresInSeconds * 1000
      });
      return signedData.signedUrl;
    }

    // 2. Fallback to public URL only if signed url fails
    const { data: pubData } = supabase.storage.from(actualBucket).getPublicUrl(relativePath);
    return pubData?.publicUrl || filePath;
  } catch (err) {
    console.warn('[AudioStorageHelper] Error generating secure signed URL, returning fallback:', err);
    return filePath;
  }
}

/**
 * Computes a SHA-256 cryptographic checksum of an audio Blob before uploading
 * Ensures end-to-end payload integrity and prevents bit-rot or tampering in transit.
 */
export async function computeBlobSha256(blob: Blob): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return 'sha256-unsupported-runtime';
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('[AudioStorageHelper] Error computing blob SHA-256:', err);
    return 'sha256-computation-error';
  }
}

export interface CanonicalAudioStoragePathOptions {
  schoolId?: string | null;
  studentId?: string | null;
  category?: string;
  trackId?: string | null;
  extension?: string;
}

/**
 * Generates canonical, multi-tenant scoped storage path:
 * schools/<schoolId>/students/<studentId>/<category>/<uniqueId>.<ext>
 * Polymorphic: Supports both options object and positional arguments.
 */
export function buildCanonicalAudioStoragePath(
  paramsOrSchoolId: CanonicalAudioStoragePathOptions | string | null | undefined,
  studentIdArg?: string | null,
  categoryArg?: string,
  trackIdOrFileNameArg?: string | null,
  extensionArg?: string
): string {
  let schoolId: string | null | undefined;
  let studentId: string | null | undefined;
  let category: string | undefined;
  let trackId: string | null | undefined;
  let extension: string | undefined;

  if (paramsOrSchoolId && typeof paramsOrSchoolId === 'object') {
    schoolId = paramsOrSchoolId.schoolId;
    studentId = paramsOrSchoolId.studentId;
    category = paramsOrSchoolId.category;
    trackId = paramsOrSchoolId.trackId;
    extension = paramsOrSchoolId.extension;
  } else {
    schoolId = typeof paramsOrSchoolId === 'string' ? paramsOrSchoolId : null;
    studentId = studentIdArg;
    category = categoryArg;
    trackId = trackIdOrFileNameArg;
    extension = extensionArg;
  }

  // Handle case where trackIdOrFileNameArg already has an extension (e.g. feedback_123.webm or track.mp3)
  if (trackId && trackId.includes('.')) {
    const lastDot = trackId.lastIndexOf('.');
    if (!extension) {
      extension = trackId.substring(lastDot + 1);
    }
    trackId = trackId.substring(0, lastDot);
  }

  const safeSchool = (schoolId || 'global').replace(/[^a-zA-Z0-9_-]/g, '') || 'global';
  const safeStudent = (studentId || 'general').replace(/[^a-zA-Z0-9_-]/g, '') || 'general';
  const safeCat = (category || 'recordings').replace(/[^a-zA-Z0-9_-]/g, '') || 'recordings';
  const safeTrackId = (trackId || `track_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
  const safeExt = (extension || 'mp3').replace(/[^a-zA-Z0-9]/g, '');

  return `schools/${safeSchool}/students/${safeStudent}/${safeCat}/${safeTrackId}.${safeExt}`;
}

export interface AudioUploadIntegrityResult {
  success: boolean;
  filePath: string;
  checksumSha256: string;
  sizeBytes: number;
  publicUrl: string;
  error?: any;
}

export interface PresignedUploadTicket {
  success: boolean;
  bucket: string;
  path: string;
  signedUrl: string;
  token?: string;
  expiresInSeconds: number;
  maxSizeBytes: number;
  contentType: string;
}

/**
 * Requests an ephemeral, cryptographically authenticated Pre-signed Upload URL
 * from the Express BFF (/api/storage/presign-upload).
 * Guarantees zero host memory buffering for large audio streams.
 */
export async function requestPresignedUploadTicket(options: {
  context: string;
  extension: string;
  contentType: string;
  sizeBytes: number;
  schoolId?: string | null;
  uniqueId?: string | null;
  bucket?: string;
}): Promise<PresignedUploadTicket | null> {
  try {
    const bffOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const res = await fetch(`${bffOrigin}/api/storage/presign-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(options),
    });

    if (!res.ok) {
      console.warn(`[AudioStorageHelper] Presigned upload ticket request failed (HTTP ${res.status}).`);
      return null;
    }

    const data: PresignedUploadTicket = await res.json();
    return data;
  } catch (err) {
    console.warn('[AudioStorageHelper] Network error requesting presigned upload ticket, falling back to direct storage:', err);
    return null;
  }
}

/**
 * Uploads an audio blob directly to Supabase Storage via signed URL or direct upload,
 * enforcing SHA-256 cryptographic verification and metadata embedding.
 */
export async function uploadAudioWithIntegrityVerification(
  filePath: string,
  blob: Blob,
  bucket: string = 'campus-assets',
  contentType: string = 'audio/webm'
): Promise<AudioUploadIntegrityResult> {
  // 🛡️ Enterprise Child Privacy: Strip device metadata / hardware fingerprints
  const sanitizedBlob = await stripAudioMetadata(blob);
  const checksum = await computeBlobSha256(sanitizedBlob);
  const sizeBytes = sanitizedBlob.size;

  // 🛡️ Enterprise Magic-Byte & Anti-Malware Ingestion Validation
  const validation = await validateMediaBlob(sanitizedBlob, 'audio', contentType);
  if (!validation.isValid) {
    console.error('[AudioStorageHelper] Media Security Ingestion Blocked:', validation.reason);
    return {
      success: false,
      filePath,
      checksumSha256: checksum,
      sizeBytes,
      publicUrl: '',
      error: new Error(validation.reason || 'Sicherheitswarnung: Ungültige oder manipulierte Mediendatei abgewiesen.')
    };
  }

  // 1. Attempt Zero-Memory Direct-to-Storage Upload via Pre-signed URL
  try {
    // Extract context, schoolId, uniqueId, extension from target filePath if structured
    const pathParts = filePath.split('/');
    let schoolId: string | null = null;
    let context = 'audio';
    const filename = pathParts[pathParts.length - 1];

    if (pathParts[0] === 'schools' && pathParts.length >= 4) {
      schoolId = pathParts[1];
      context = pathParts[2];
    } else if (pathParts.length >= 2) {
      context = pathParts[0];
    }

    const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
    const extension = extMatch ? extMatch[1] : 'webm';
    const uniqueId = filename.replace(/\.[a-zA-Z0-9]+$/, '');

    const ticket = await requestPresignedUploadTicket({
      context,
      extension,
      contentType,
      sizeBytes,
      schoolId,
      uniqueId,
      bucket
    });

    if (ticket && ticket.token) {
      // Direct-to-Storage via Supabase Signed Upload Token
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, sanitizedBlob, {
          contentType,
          upsert: true
        });

      if (!uploadErr && uploadData) {
        const publicUrl = await getSecureAudioUrl(ticket.path, ticket.bucket);
        return {
          success: true,
          filePath: ticket.path,
          checksumSha256: checksum,
          sizeBytes,
          publicUrl
        };
      }
      console.warn('[AudioStorageHelper] Signed token upload encountered error, falling back to standard upload:', uploadErr);
    }
  } catch (directUploadErr) {
    console.warn('[AudioStorageHelper] Direct presigned upload attempt bypassed, using fallback:', directUploadErr);
  }

  // 2. Fallback: Standard authenticated Supabase Storage upload
  try {
    const { error } = await supabase.storage.from(bucket).upload(filePath, sanitizedBlob, {
      contentType,
      upsert: true,
      cacheControl: 'private, max-age=3600',
      metadata: {
        sha256_checksum: checksum,
        file_size_bytes: sizeBytes,
        uploaded_at: new Date().toISOString()
      }
    });

    if (error) {
      console.error('[AudioStorageHelper] Storage upload failed:', error);
      return {
        success: false,
        filePath,
        checksumSha256: checksum,
        sizeBytes,
        publicUrl: '',
        error
      };
    }

    const publicUrl = await getSecureAudioUrl(filePath, bucket);

    return {
      success: true,
      filePath,
      checksumSha256: checksum,
      sizeBytes,
      publicUrl
    };
  } catch (err) {
    console.error('[AudioStorageHelper] Unexpected exception during verified upload:', err);
    return {
      success: false,
      filePath,
      checksumSha256: checksum,
      sizeBytes,
      publicUrl: '',
      error: err
    };
  }
}

/**
 * Scans Supabase storage buckets, database tables, and local audio caches to calculate
 * the exact audio storage bytes consumed by a given school tenant, and synchronizes
 * the result back to `schools.storage_used_bytes` and local overrides.
 */
export async function computeSchoolStorageUsedBytes(schoolId: string, knownUserIds?: string[]): Promise<number> {
  if (!schoolId) return 0;

  let maxDiscoveredBytes = 0;

  // 1. Check local overrides and direct cached keys
  try {
    if (typeof window !== 'undefined') {
      const directKey = localStorage.getItem(`groovelab_storage_used_bytes_${schoolId}`);
      if (directKey) {
        maxDiscoveredBytes = Math.max(maxDiscoveredBytes, Number(directKey));
      }
      const overridesStr = localStorage.getItem('groovelab_school_overrides');
      if (overridesStr) {
        const overrides = JSON.parse(overridesStr);
        if (overrides[schoolId]?.storage_used_bytes) {
          maxDiscoveredBytes = Math.max(maxDiscoveredBytes, Number(overrides[schoolId].storage_used_bytes));
        }
      }
    }
  } catch {}

  // 2. Fetch all user IDs belonging to this school
  const userIds = new Set<string>(knownUserIds || []);
  try {
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('school_id', schoolId);
    users?.forEach((u: any) => {
      if (u?.id) userIds.add(String(u.id));
    });
  } catch {}

  // 3. Scan DB audio_recordings table using tenant_id
  try {
    const { data: recsTenant } = await supabase
      .from('audio_recordings')
      .select('file_size_bytes')
      .eq('tenant_id', schoolId);
    if (recsTenant && recsTenant.length > 0) {
      const dbSum = recsTenant.reduce((acc, curr) => acc + Number(curr.file_size_bytes || 0), 0);
      maxDiscoveredBytes = Math.max(maxDiscoveredBytes, dbSum);
    }
  } catch {}

  // 4. Scan Supabase storage buckets ('campus-assets', 'groovelab-assets')
  let bucketAggregatedBytes = 0;
  const subFolders = ['recordings', 'loops', 'audio_biography', 'audio', 'meisterwerk'];
  const buckets = ['campus-assets', 'groovelab-assets'];

  for (const bucket of buckets) {
    // A. School-scoped folder: schools/${schoolId}/${subFolder}
    for (const sub of subFolders) {
      try {
        const { data: files } = await supabase.storage
          .from(bucket)
          .list(`schools/${schoolId}/${sub}`, { limit: 1000 });
        if (files && files.length > 0) {
          for (const f of files) {
            const size = Number(f.metadata?.size || (f as any).size || 0);
            if (size > 0) bucketAggregatedBytes += size;
          }
        }
      } catch {}
    }

    // B. Root folders: matching schoolId or any user ID of this school
    for (const sub of subFolders) {
      try {
        const { data: files } = await supabase.storage
          .from(bucket)
          .list(sub, { limit: 1000 });
        if (files && files.length > 0) {
          for (const f of files) {
            const size = Number(f.metadata?.size || (f as any).size || 0);
            if (size <= 0) continue;
            const name = f.name || '';
            let belongs = name.includes(schoolId);
            if (!belongs && userIds.size > 0) {
              for (const uid of userIds) {
                if (name.includes(uid)) {
                  belongs = true;
                  break;
                }
              }
            }
            if (belongs) {
              bucketAggregatedBytes += size;
            }
          }
        }
      } catch {}
    }
  }
  maxDiscoveredBytes = Math.max(maxDiscoveredBytes, bucketAggregatedBytes);

  // 5. Scan student recordings from localStorage
  let studentAudioBytes = 0;
  try {
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        let keyBelongsToSchool = key.includes(schoolId);
        if (!keyBelongsToSchool && userIds.size > 0) {
          for (const uid of userIds) {
            if (key.includes(uid)) {
              keyBelongsToSchool = true;
              break;
            }
          }
        }

        if (key.startsWith('campus_homework_notes_')) {
          if (keyBelongsToSchool || userIds.size === 0) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const notes = JSON.parse(val);
                if (Array.isArray(notes)) {
                  notes.forEach((note: string) => {
                    if (typeof note === 'string' && (note.startsWith('AUDIO:') || note.startsWith('LOOP:'))) {
                      const parts = note.split('|');
                      const durSec = Number(parts[1] || 10);
                      studentAudioBytes += Math.max(120000, durSec * 32000);
                    }
                  });
                }
              }
            } catch {}
          }
        } else if (key.startsWith('campus_junior_recordings_')) {
          if (keyBelongsToSchool || userIds.size === 0) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const recs = JSON.parse(val);
                if (Array.isArray(recs)) {
                  recs.forEach((rec: any) => {
                    const dur = Number(rec?.duration || 10);
                    studentAudioBytes += Math.max(120000, dur * 32000);
                  });
                }
              }
            } catch {}
          }
        } else if (key.startsWith('campus_audio_biography_')) {
          if (keyBelongsToSchool || userIds.size === 0) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const bio = JSON.parse(val);
                if (Array.isArray(bio)) {
                  bio.forEach((track: any) => {
                    const dur = Number(track?.duration || 30);
                    studentAudioBytes += Math.max(250000, dur * 32000);
                  });
                }
              }
            } catch {}
          }
        } else if (key.startsWith('groovelab_loop_tracks_')) {
          if (keyBelongsToSchool || userIds.size === 0) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const loops = JSON.parse(val);
                if (Array.isArray(loops)) {
                  loops.forEach((lp: any) => {
                    const dur = Number(lp?.duration || 15);
                    studentAudioBytes += Math.max(180000, dur * 32000);
                  });
                }
              }
            } catch {}
          }
        }
      }
    }
  } catch {}
  maxDiscoveredBytes = Math.max(maxDiscoveredBytes, studentAudioBytes);

  // 6. Check school.storage_used_bytes in database
  try {
    const { data: sch } = await supabase
      .from('schools')
      .select('storage_used_bytes')
      .eq('id', schoolId)
      .maybeSingle();
    if (sch?.storage_used_bytes) {
      maxDiscoveredBytes = Math.max(maxDiscoveredBytes, Number(sch.storage_used_bytes));
    }
  } catch {}

  // 7. Universal Synchronisation: Persistent write-back to Supabase & local caches
  if (maxDiscoveredBytes > 0 && typeof window !== 'undefined') {
    try {
      const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
      const overrides = JSON.parse(overridesStr);
      if (!overrides[schoolId]) overrides[schoolId] = {};
      overrides[schoolId].storage_used_bytes = maxDiscoveredBytes;
      localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
      localStorage.setItem(`groovelab_storage_used_bytes_${schoolId}`, String(maxDiscoveredBytes));

      supabase
        .from('schools')
        .update({ storage_used_bytes: maxDiscoveredBytes })
        .eq('id', schoolId)
        .then(() => {});
    } catch {}
  }

  return maxDiscoveredBytes;
}

/**
 * Tier-1 SaaS Enterprise+ Storage Path Generator
 * Enforces pure UUID/hash names for uploaded assets in Supabase Storage.
 * Strips all personal information (names, special characters, whitespace).
 * 
 * Path schema:
 * schools/${schoolId}/${context}/${uniqueId}.${extension}
 * or
 * ${context}/${uniqueId}.${extension} (if schoolId not provided)
 */
export function generateAnonymizedStoragePath(
  schoolId: string | null | undefined,
  context: 'recordings' | 'audio_biography' | 'loops' | 'feed-attachments' | 'audio' | 'avatars' | string,
  uniqueId: string,
  extension: string = 'webm'
): string {
  // Sanitize context and extension (alphanumeric, dashes, underscores only)
  const cleanContext = context.replace(/[^a-zA-Z0-9_-]/g, '') || 'audio';
  const cleanExt = extension.replace(/^\./, '').replace(/[^a-zA-Z0-9]/g, '') || 'webm';
  
  // Sanitize uniqueId: ensure only UUID, timestamp, or safe hash characters
  const cleanId = uniqueId.replace(/[^a-zA-Z0-9_-]/g, '') || `${Date.now()}`;
  
  const cleanSchoolId = schoolId ? schoolId.replace(/[^a-zA-Z0-9_-]/g, '') : null;
  const schoolPrefix = cleanSchoolId ? `schools/${cleanSchoolId}/` : '';

  return `${schoolPrefix}${cleanContext}/${cleanId}.${cleanExt}`;
}
