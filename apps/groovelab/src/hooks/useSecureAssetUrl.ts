/**
 * ==============================================================================
 * 🛡️ Campus-Groovelab Enterprise Secure Asset Hook (useSecureAssetUrl)
 * Standard: UrhG § 19a & DSGVO Art. 32 / Private Bucket Signed URLs (Punkt 81)
 * ==============================================================================
 * Provides transparent, reactive resolution of private storage objects via
 * short-lived 60-second HMAC signed URLs, disallowing public exposure.
 */

import { useState, useEffect } from 'react';
import { getSecureAudioUrl } from '../utils/audioStorageHelper';

export interface SecureAssetOptions {
  bucket?: string;
  expiresInSeconds?: number;
}

export function useSecureAssetUrl(
  filePath: string | null | undefined,
  options: SecureAssetOptions = {}
): {
  url: string | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const bucket = options.bucket || 'campus-assets';
  const expiresInSeconds = options.expiresInSeconds || 60; // Default: 60s ephemerality

  const resolveUrl = async () => {
    if (!filePath) {
      setUrl(null);
      setLoading(false);
      return;
    }

    // Direct blobs or data-uris do not need resolution
    if (filePath.startsWith('blob:') || filePath.startsWith('data:')) {
      setUrl(filePath);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resolved = await getSecureAudioUrl(filePath, bucket, expiresInSeconds);
      setUrl(resolved);
    } catch (err) {
      console.warn('[useSecureAssetUrl] Failed to generate signed URL:', err);
      setError(err instanceof Error ? err : new Error('Signed URL resolution failed'));
      setUrl(filePath); // Fallback to raw path if offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    resolveUrl();
  }, [filePath, bucket, expiresInSeconds]);

  return {
    url,
    loading,
    error,
    refresh: resolveUrl,
  };
}
