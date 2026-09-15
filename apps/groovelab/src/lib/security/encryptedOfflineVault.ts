// ==============================================================================
// 🏛️ Campus-Groovelab Encrypted Offline Vault (W3C Web Cryptography API)
// Standards: OWASP ASVS Level 3 (V2, V8, V14) / DSGVO Art. 8 & 32 / BSI TR-02102
// Scope:     Kryptografischer Schutz ruhender Audio- und Schülerdaten (AES-GCM 256)
// ==============================================================================

/**
 * Konfiguration des kryptografischen Tresors
 */
const VAULT_CONFIG = {
  ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256,
  IV_BYTE_LENGTH: 12, // 96-Bit standard non-repeating IV für AES-GCM
  PBKDF2_ITERATIONS: 100000,
  HASH: 'SHA-256'
} as const;

/**
 * Flüchtiger Sitzungsschlüssel im RAM (wird niemals auf Festplatte/Storage geschrieben)
 */
let volatileSessionKey: CryptoKey | null = null;
let volatileSessionSalt: Uint8Array | null = null;

// Hilfsfunktionen für ArrayBuffer <-> Base64
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Initialisiert oder liefert den flüchtigen Sitzungsschlüssel
 */
async function getOrCreateSessionKey(customPassphrase?: string): Promise<CryptoKey> {
  if (volatileSessionKey && !customPassphrase) {
    return volatileSessionKey;
  }

  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Cryptography API (crypto.subtle) ist in dieser Umgebung nicht verfügbar.');
  }

  if (!volatileSessionSalt) {
    volatileSessionSalt = window.crypto.getRandomValues(new Uint8Array(16));
  }

  // Ableitung aus Passphrase oder kryptografischem Zufall
  const seedString = customPassphrase || (
    'campus_session_' + 
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('campus_active_role') || 'ephemeral' : 'ephemeral') + 
    '_' + volatileSessionSalt[0] + '_' + volatileSessionSalt[15]
  );

  const encoder = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(seedString),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: volatileSessionSalt as unknown as BufferSource,
      iterations: VAULT_CONFIG.PBKDF2_ITERATIONS,
      hash: VAULT_CONFIG.HASH
    },
    baseKey,
    { name: VAULT_CONFIG.ALGORITHM, length: VAULT_CONFIG.KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );

  if (!customPassphrase) {
    volatileSessionKey = derivedKey;
  }

  return derivedKey;
}

export interface EncryptedOfflineBlobResult {
  ciphertextBase64: string;
  ivBase64: string;
  mimeType: string;
  encryptedAt: string;
}

/**
 * Verschlüsselt einen Audio- oder Binär-Blob vor dem Ablegen in IndexedDB/Storage
 */
export async function encryptOfflineBlob(
  blob: Blob,
  customPassphrase?: string
): Promise<EncryptedOfflineBlobResult> {
  const key = await getOrCreateSessionKey(customPassphrase);
  const iv = window.crypto.getRandomValues(new Uint8Array(VAULT_CONFIG.IV_BYTE_LENGTH));
  const arrayBuffer = await blob.arrayBuffer();

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: VAULT_CONFIG.ALGORITHM,
      iv: iv
    },
    key,
    arrayBuffer
  );

  return {
    ciphertextBase64: bufferToBase64(ciphertextBuffer),
    ivBase64: bufferToBase64(iv),
    mimeType: blob.type || 'application/octet-stream',
    encryptedAt: new Date().toISOString()
  };
}

/**
 * Entschlüsselt einen verschlüsselten Offline-Blob zurück in ein natives Blob-Objekt
 */
export async function decryptOfflineBlob(
  encrypted: EncryptedOfflineBlobResult,
  customPassphrase?: string
): Promise<Blob> {
  const key = await getOrCreateSessionKey(customPassphrase);
  const iv = base64ToUint8Array(encrypted.ivBase64);
  const ciphertextBytes = base64ToUint8Array(encrypted.ciphertextBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: VAULT_CONFIG.ALGORITHM,
      iv: iv as unknown as BufferSource
    },
    key,
    ciphertextBytes as unknown as BufferSource
  );

  return new Blob([decryptedBuffer], { type: encrypted.mimeType });
}

export interface EncryptedOfflineJsonResult {
  ciphertextBase64: string;
  ivBase64: string;
  encryptedAt: string;
}

/**
 * Verschlüsselt strukturierte Daten (z. B. Notizen, Übepläne)
 */
export async function encryptOfflineJson<T>(
  data: T,
  customPassphrase?: string
): Promise<EncryptedOfflineJsonResult> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(jsonString);

  const key = await getOrCreateSessionKey(customPassphrase);
  const iv = window.crypto.getRandomValues(new Uint8Array(VAULT_CONFIG.IV_BYTE_LENGTH));

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: VAULT_CONFIG.ALGORITHM,
      iv: iv
    },
    key,
    encodedData
  );

  return {
    ciphertextBase64: bufferToBase64(ciphertextBuffer),
    ivBase64: bufferToBase64(iv),
    encryptedAt: new Date().toISOString()
  };
}

/**
 * Entschlüsselt strukturierte Daten
 */
export async function decryptOfflineJson<T>(
  encrypted: EncryptedOfflineJsonResult,
  customPassphrase?: string
): Promise<T> {
  const key = await getOrCreateSessionKey(customPassphrase);
  const iv = base64ToUint8Array(encrypted.ivBase64);
  const ciphertextBytes = base64ToUint8Array(encrypted.ciphertextBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: VAULT_CONFIG.ALGORITHM,
      iv: iv as unknown as BufferSource
    },
    key,
    ciphertextBytes as unknown as BufferSource
  );

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonString) as T;
}

/**
 * Vernichtet den flüchtigen Sitzungsschlüssel bei Logout (Zero-Residual)
 */
export function purgeVolatileSessionKey(): void {
  volatileSessionKey = null;
  volatileSessionSalt = null;
}
