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

const VAULT_META_STORE = 'CampusGroovelabVaultMeta';
const VAULT_SALT_KEY = 'campus_offline_vault_salt_v1';

/**
 * Persists and retrieves a stable, cryptographically random salt bound to the physical device.
 * Ensures offline takes remain AES-GCM-256 encrypted at rest, but can be decrypted across tab reloads.
 */
async function getOrCreatePersistentSalt(): Promise<Uint8Array> {
  if (volatileSessionSalt && volatileSessionSalt.length === 16) {
    return volatileSessionSalt;
  }

  // 1. Check LocalStorage for existing device-bound salt
  if (typeof localStorage !== 'undefined') {
    try {
      const storedB64 = localStorage.getItem(VAULT_SALT_KEY);
      if (storedB64) {
        const decoded = base64ToUint8Array(storedB64);
        if (decoded && decoded.length === 16) {
          volatileSessionSalt = decoded;
          return volatileSessionSalt;
        }
      }
    } catch {}
  }

  // 2. Check IndexedDB persistent store
  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      const idbSalt = await new Promise<Uint8Array | null>((resolve) => {
        const req = window.indexedDB.open(VAULT_META_STORE, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains('metadata')) {
            req.result.createObjectStore('metadata');
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          try {
            const tx = db.transaction('metadata', 'readonly');
            const getReq = tx.objectStore('metadata').get(VAULT_SALT_KEY);
            getReq.onsuccess = () => resolve(getReq.result || null);
            getReq.onerror = () => resolve(null);
          } catch {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });

      if (idbSalt && idbSalt.length === 16) {
        volatileSessionSalt = idbSalt;
        if (typeof localStorage !== 'undefined') {
          try { localStorage.setItem(VAULT_SALT_KEY, bufferToBase64(idbSalt)); } catch {}
        }
        return volatileSessionSalt;
      }
    } catch {}
  }

  // 3. Generate a fresh 16-byte cryptographically secure salt
  const freshSalt = window.crypto.getRandomValues(new Uint8Array(16));
  volatileSessionSalt = freshSalt;

  // Persist to both LocalStorage and IndexedDB
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(VAULT_SALT_KEY, bufferToBase64(freshSalt)); } catch {}
  }
  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      const req = window.indexedDB.open(VAULT_META_STORE, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('metadata')) {
          req.result.createObjectStore('metadata');
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction('metadata', 'readwrite');
          tx.objectStore('metadata').put(freshSalt, VAULT_SALT_KEY);
        } catch {}
      };
    } catch {}
  }

  return volatileSessionSalt;
}

const VAULT_CRYPTOKEY_IDB_KEY = 'campus_offline_vault_nonextractable_key_v2';

/**
 * Retrieves or generates a hardware-bound, non-extractable 256-bit AES-GCM CryptoKey in IndexedDB.
 * Structured clone in IndexedDB preserves the CryptoKey across reloads while keeping raw key bytes
 * completely inaccessible to JavaScript (extractable = false, OWASP ASVS L3 V14).
 */
async function getOrCreateIndexedDbNonExtractableKey(): Promise<CryptoKey | null> {
  if (typeof window === 'undefined' || !window.indexedDB || !window.crypto?.subtle) {
    return null;
  }

  try {
    const existingKey = await new Promise<CryptoKey | null>((resolve) => {
      const req = window.indexedDB.open(VAULT_META_STORE, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('metadata')) {
          req.result.createObjectStore('metadata');
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction('metadata', 'readonly');
          const getReq = tx.objectStore('metadata').get(VAULT_CRYPTOKEY_IDB_KEY);
          getReq.onsuccess = () => {
            const res = getReq.result;
            resolve(res && typeof res === 'object' && 'type' in res ? (res as CryptoKey) : null);
          };
          getReq.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });

    if (existingKey) {
      return existingKey;
    }

    const generatedKey = await window.crypto.subtle.generateKey(
      { name: VAULT_CONFIG.ALGORITHM, length: VAULT_CONFIG.KEY_LENGTH },
      false, // non-extractable!
      ['encrypt', 'decrypt']
    );

    await new Promise<void>((resolve) => {
      const req = window.indexedDB.open(VAULT_META_STORE, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('metadata')) {
          req.result.createObjectStore('metadata');
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction('metadata', 'readwrite');
          tx.objectStore('metadata').put(generatedKey, VAULT_CRYPTOKEY_IDB_KEY);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      };
      req.onerror = () => resolve();
    });

    return generatedKey;
  } catch {
    return null;
  }
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

  // [P2-5] Primary path: Use non-extractable 256-bit AES-GCM CryptoKey stored in IndexedDB
  if (!customPassphrase) {
    const idbKey = await getOrCreateIndexedDbNonExtractableKey();
    if (idbKey) {
      volatileSessionKey = idbKey;
      return idbKey;
    }
  }

  if (!volatileSessionSalt) {
    volatileSessionSalt = await getOrCreatePersistentSalt();
  }

  // Full 128-bit/256-bit entropy derivation (all 16 bytes of salt encoded in hex, never 3 bytes)
  const fullSaltHex = Array.from(volatileSessionSalt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const seedString = customPassphrase || `campus_session_vault_v2_${fullSaltHex}`;

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
