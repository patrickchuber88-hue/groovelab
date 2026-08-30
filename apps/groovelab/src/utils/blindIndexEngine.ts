/**
 * Campus-Groovelab Blind Indexing & PII Cryptographic Search Engine
 * 
 * Implements deterministic HMAC-SHA-256 blind indexing to allow fast database
 * lookups of phone numbers and PII without storing plaintext data in database columns.
 */

const BLIND_INDEX_SECRET_SALT = 'campus_groovelab_blind_index_salt_2026!';

/**
 * Computes a deterministic blind index hash for an exact search value (e.g. phone number).
 * Normalizes phone numbers (removes spaces, dashes, international prefix formatting).
 */
export async function computeBlindIndex(value: string | null | undefined, fieldPrefix: string = 'phone'): Promise<string> {
  if (!value || typeof value !== 'string') return '';

  let normalized = value.trim().toLowerCase();
  if (fieldPrefix === 'phone') {
    // Normalize phone numbers: +49 170 123456 -> 49170123456
    normalized = normalized.replace(/[^0-9]/g, '');
    if (normalized.startsWith('00')) normalized = normalized.substring(2);
    else if (normalized.startsWith('0')) normalized = '49' + normalized.substring(1); // Standardize DACH lead zero
  }

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const enc = new TextEncoder();
    const keyData = enc.encode(`${BLIND_INDEX_SECRET_SALT}:${fieldPrefix}`);
    const key = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await window.crypto.subtle.sign(
      'HMAC',
      key,
      enc.encode(normalized)
    );

    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  return '';
}
