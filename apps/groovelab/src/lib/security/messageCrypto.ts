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
 * Decrypts a single message string if it is encrypted with the 'enc:' prefix.
 * If already plain text or empty, returns immediately.
 */
export async function decryptMessageContent(
  content: string | null | undefined,
  schoolId: string
): Promise<string> {
  if (!content) return '';
  if (!content.startsWith('enc:')) return content;

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
    decryptedCache.set(cacheKey, decrypted);
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
  schoolId: string
): Promise<T[]> {
  if (!messages || messages.length === 0) return [];

  // 1. Separate messages that need network decryption from cached/plain messages
  const needsDecryption: { index: number; content: string }[] = [];
  const results = [...messages];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const rawContent = msg.content;
    if (rawContent && rawContent.startsWith('enc:')) {
      const cacheKey = `${schoolId}:${rawContent}`;
      if (decryptedCache.has(cacheKey)) {
        results[i] = { ...msg, content: decryptedCache.get(cacheKey)! };
      } else {
        needsDecryption.push({ index: i, content: rawContent });
      }
    }
  }

  // If everything was plain or cached, return immediately
  if (needsDecryption.length === 0) {
    return results;
  }

  try {
    const payload = needsDecryption.map(item => ({ content: item.content }));
    const { data, error } = await supabase.rpc('decrypt_message_batch', {
      p_messages: payload,
      p_school_id: schoolId
    });

    if (!error && Array.isArray(data)) {
      data.forEach((item: any, idx: number) => {
        const originalIndex = needsDecryption[idx].index;
        const rawContent = needsDecryption[idx].content;
        const decrypted = item?.content || rawContent;
        
        // Cache result
        decryptedCache.set(`${schoolId}:${rawContent}`, decrypted);
        results[originalIndex] = { ...results[originalIndex], content: decrypted };
      });
    }
  } catch (e) {
    console.warn('[messageCrypto] Batch decryption error:', e);
  }

  return results;
}
