/**
 * Campus-Groovelab Enterprise Cryptographic Message Vault Helper
 * Bounded Context: SEC-24 (Client-side Decryption Cache & Transparenter Vault)
 * 
 * Transparently handles AES-256 decrypted content for campus_direct_messages
 * with high-performance in-memory caching to guarantee < 1ms render times.
 */

import { supabase } from '../supabase';

// L1 In-Memory Decryption Cache: hash/ciphertext -> plaintext
const decryptedCache = new Map<string, string>();

/**
 * Primes the L1 decryption cache with a known plaintext for an encrypted message.
 * Crucial for Zero-Flicker UX when the current user sends a message.
 */
export function primeDecryptedCache(
  schoolId: string | null | undefined,
  ciphertext: string | null | undefined,
  plaintext: string | null | undefined
): void {
  if (!schoolId || !ciphertext || !plaintext) return;
  const cacheKey = `${schoolId}:${ciphertext}`;
  decryptedCache.set(cacheKey, plaintext);
}

/**
 * Clears the in-memory decryption cache (e.g. on user logout).
 */
export function clearDecryptedCache(): void {
  decryptedCache.clear();
}

/**
 * Decrypts a single message string if it is encrypted with the 'enc:' prefix.
 * If already plain text or empty, returns immediately.
 */
export async function decryptMessageContent(
  content: string | null | undefined,
  schoolId: string | null | undefined
): Promise<string> {
  if (!content) return '';
  if (!content.startsWith('enc:')) return content;
  if (!schoolId) return content;

  // Check cache first
  const cacheKey = `${schoolId}:${content}`;
  if (decryptedCache.has(cacheKey)) {
    return decryptedCache.get(cacheKey)!;
  }

  try {
    const { data, error } = await supabase.rpc('decrypt_message_content', {
      p_content: content,
      p_school_id: schoolId
    });

    if (error || !data) {
      return content;
    }

    const decrypted = String(data);
    if (!decrypted.startsWith('[Verschlüsselt')) {
      decryptedCache.set(cacheKey, decrypted);
    }
    return decrypted;
  } catch (e) {
    console.warn('[messageCrypto] Decryption error, falling back to raw:', e);
    return content;
  }
}

/**
 * High-performance batch decryption for chat views.
 * Decrypts an array of message objects transparently in a single RPC call.
 */
export async function decryptMessagesBatch<T extends { content?: string | null; [key: string]: any }>(
  messages: T[],
  schoolId: string | null | undefined
): Promise<T[]> {
  if (!messages || messages.length === 0) return [];
  if (!schoolId) return messages;

  // 1. Separate messages that need network decryption from cached/plain messages
  const needsDecryption: { index: number; content: string }[] = [];
  const results = [...messages];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const rawContent = msg.content;
    if (rawContent && typeof rawContent === 'string' && rawContent.startsWith('enc:')) {
      const cacheKey = `${schoolId}:${rawContent}`;
      if (decryptedCache.has(cacheKey)) {
        results[i] = { ...msg, content: decryptedCache.get(cacheKey)! };
      } else {
        needsDecryption.push({ index: i, content: rawContent });
      }
    }
  }

  // If everything was plain or cached, return immediately (< 1ms fast path)
  if (needsDecryption.length === 0) {
    return results;
  }

  try {
    const uniqueCiphertexts = Array.from(new Set(needsDecryption.map(item => item.content)));
    const payload = uniqueCiphertexts.map(c => ({ content: c }));
    const { data, error } = await supabase.rpc('decrypt_message_batch', {
      p_messages: payload,
      p_school_id: schoolId
    });

    if (!error && Array.isArray(data)) {
      data.forEach((item: any, idx: number) => {
        const rawCipher = uniqueCiphertexts[idx];
        const decrypted = item?.content || rawCipher;
        if (decrypted && !decrypted.startsWith('[Verschlüsselt')) {
          decryptedCache.set(`${schoolId}:${rawCipher}`, decrypted);
        }
      });

      // Apply cached decrypted content to all matching items
      for (const item of needsDecryption) {
        const decrypted = decryptedCache.get(`${schoolId}:${item.content}`) || item.content;
        results[item.index] = { ...results[item.index], content: decrypted };
      }
    }
  } catch (e) {
    console.warn('[messageCrypto] Batch decryption error:', e);
  }

  return results;
}
