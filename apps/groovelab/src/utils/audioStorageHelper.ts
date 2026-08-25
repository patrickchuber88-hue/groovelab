import { supabase } from '../lib/supabase';

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
  expiresInSeconds: number = 900 // 15 minutes
): Promise<string> {
  if (!filePath) return '';

  // If already a full external URL, return directly
  if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('blob:')) {
    return filePath;
  }

  const cacheKey = `${bucket}:${filePath}`;
  const now = Date.now();

  if (signedUrlCache.has(cacheKey)) {
    const entry = signedUrlCache.get(cacheKey)!;
    // Return cached if at least 60 seconds remain before expiration
    if (entry.expiresAt - now > 60 * 1000) {
      return entry.url;
    }
  }

  try {
    // 1. Try creating a signed private URL
    const { data: signedData, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresInSeconds);

    if (!signErr && signedData?.signedUrl) {
      signedUrlCache.set(cacheKey, {
        url: signedData.signedUrl,
        expiresAt: now + expiresInSeconds * 1000
      });
      return signedData.signedUrl;
    }

    // 2. Fallback to public URL if bucket is public or signed url failed
    const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return pubData?.publicUrl || filePath;
  } catch (err) {
    console.warn('[AudioStorageHelper] Error generating secure URL, falling back to public:', err);
    const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return pubData?.publicUrl || filePath;
  }
}
