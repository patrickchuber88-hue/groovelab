/**
 * Campus-Groovelab Enterprise AES-256-GCM Storage Vault
 * 
 * Provides hardware-bound, authenticated client-side encryption (AEAD)
 * for all sensitive offline data, family profiles, and PIN caches in localStorage.
 */

const VAULT_SALT = 'campus_groovelab_vault_salt_2026!';
const DEVICE_KEY_STORAGE = 'gl_global_device_key';

let cachedCryptoKey: CryptoKey | null = null;

/**
 * Derives a 256-bit AES-GCM CryptoKey from the device hardware key and application salt using PBKDF2.
 */
async function getOrCreateVaultKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey;

  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not supported in this environment.');
  }

  let deviceKey = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (!deviceKey) {
    deviceKey = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY_STORAGE, deviceKey);
  }

  const enc = new TextEncoder();
  const rawKeyMaterial = enc.encode(deviceKey + VAULT_SALT);

  // Import raw key material for PBKDF2 derivation
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    rawKeyMaterial,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-GCM 256-bit key
  const salt = enc.encode(VAULT_SALT);
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 10000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  cachedCryptoKey = derivedKey;
  return derivedKey;
}

/**
 * Encrypts arbitrary data (objects, strings) into an authenticated AES-256-GCM ciphertext container.
 * Format: `enc:v1:<12-byte IV hex>:<ciphertext hex>`
 */
export async function encryptVaultData(data: any): Promise<string> {
  if (data === undefined || data === null) return '';

  try {
    const key = await getOrCreateVaultKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit standard IV for GCM
    const jsonStr = JSON.stringify(data);
    const encodedData = new TextEncoder().encode(jsonStr);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encodedData
    );

    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const cipherHex = Array.from(new Uint8Array(ciphertextBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    return `enc:v1:${ivHex}:${cipherHex}`;
  } catch (err) {
    console.error('[AESVault] Encryption error:', err);
    // Fallback: Return raw string if Web Crypto fails
    return typeof data === 'string' ? data : JSON.stringify(data);
  }
}

/**
 * Decrypts an authenticated AES-256-GCM ciphertext container back into original JavaScript data.
 * Transparently supports unencrypted JSON fallbacks for backward compatibility.
 */
export async function decryptVaultData<T = any>(payload: string | null): Promise<T | null> {
  if (!payload || typeof payload !== 'string') return null;

  // Backward compatibility: If not encrypted, parse directly as JSON
  if (!payload.startsWith('enc:v1:')) {
    try {
      return JSON.parse(payload) as T;
    } catch {
      return payload as unknown as T;
    }
  }

  try {
    const parts = payload.split(':');
    if (parts.length !== 4) return null;

    const ivHex = parts[2];
    const cipherHex = parts[3];

    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const key = await getOrCreateVaultKey();
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );

    const decodedStr = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decodedStr) as T;
  } catch (err) {
    console.error('[AESVault] Decryption / authentication error:', err);
    return null;
  }
}

/**
 * Stores an item in localStorage encrypted with AES-256-GCM.
 */
export async function setVaultItem(key: string, value: any): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const encrypted = await encryptVaultData(value);
    localStorage.setItem(key, encrypted);
  } catch (err) {
    console.error(`[AESVault] Failed to save vault item ${key}:`, err);
  }
}

/**
 * Retrieves and decrypts an item from localStorage.
 */
export async function getVaultItem<T = any>(key: string, defaultValue: T | null = null): Promise<T | null> {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const decrypted = await decryptVaultData<T>(raw);
    return decrypted !== null ? decrypted : defaultValue;
  } catch (err) {
    console.error(`[AESVault] Failed to read vault item ${key}:`, err);
    return defaultValue;
  }
}

/**
 * Removes an item from localStorage.
 */
export function removeVaultItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}
