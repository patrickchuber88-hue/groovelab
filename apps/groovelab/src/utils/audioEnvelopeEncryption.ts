/**
 * Campus-Groovelab Tier-1 FinTech-Grade Audio Envelope Encryption Engine
 * Complies with AES-GCM-256 (NIST SP 800-38D) and PBKDF2 (100,000 Iterations, SHA-256)
 * Guarantees zero-knowledge client-side encryption of audio streams before cloud upload.
 */

export interface EncryptedAudioPayload {
  cipherBuffer: ArrayBuffer;
  iv: string;   // Base64 encoded 12-byte IV
  salt: string; // Base64 encoded 16-byte Salt
  algorithm: 'AES-GCM-256';
  version: 1;
}

/**
 * Derives a 256-bit AES-GCM CryptoKey from a secret passphrase and salt using PBKDF2.
 */
export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts an audio ArrayBuffer client-side with AES-GCM-256.
 */
export async function encryptAudioBuffer(
  audioBuffer: ArrayBuffer,
  secretKey: string
): Promise<EncryptedAudioPayload> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secretKey, salt);

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any
    },
    key,
    audioBuffer
  );

  return {
    cipherBuffer,
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
    algorithm: 'AES-GCM-256',
    version: 1
  };
}

/**
 * Decrypts an encrypted audio ArrayBuffer client-side with AES-GCM-256.
 */
export async function decryptAudioBuffer(
  encryptedPayload: EncryptedAudioPayload,
  secretKey: string
): Promise<ArrayBuffer> {
  const iv = new Uint8Array(atob(encryptedPayload.iv).split('').map(c => c.charCodeAt(0)));
  const salt = new Uint8Array(atob(encryptedPayload.salt).split('').map(c => c.charCodeAt(0)));
  const key = await deriveKey(secretKey, salt);

  return window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as any
    },
    key,
    encryptedPayload.cipherBuffer
  );
}
