/**
 * RFC 6238 / RFC 4226 compliant TOTP Generator and Verifier
 * 100% Offline, Native Web Crypto API (HMAC-SHA1), Zero External Dependencies
 */

export function base32Decode(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

export async function generateTOTP(secretBase32: string, timeStepWindow = 30, timestamp = Date.now()): Promise<string> {
  const keyBytes = base32Decode(secretBase32);
  if (keyBytes.length === 0) return '000000';
  const epochSeconds = Math.floor(timestamp / 1000);
  const counter = Math.floor(epochSeconds / timeStepWindow);

  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  counterView.setUint32(0, 0, false);
  counterView.setUint32(4, counter, false);

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
  const hash = new Uint8Array(signature);

  const offset = hash[hash.length - 1] & 0xf;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

export async function verifyTOTP(token: string, secretBase32: string): Promise<boolean> {
  const cleanToken = token.replace(/\s+/g, '').trim();
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) return false;

  const now = Date.now();
  const windows = [0, -30000, 30000]; // Current window ± 30 seconds for clock drift

  for (const offset of windows) {
    try {
      const expected = await generateTOTP(secretBase32, 30, now + offset);
      if (expected === cleanToken) {
        return true;
      }
    } catch (err) {
      console.warn('TOTP check error:', err);
    }
  }
  return false;
}
