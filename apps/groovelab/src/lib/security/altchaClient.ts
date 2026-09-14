/**
 * ==============================================================================
 * 🛡️ Campus-Groovelab Sovereign ALTCHA Proof-of-Work Client
 * Standard: 100% Self-Hosted / Zero-US-Cloud / DSGVO Art. 25 & 32
 * ==============================================================================
 * Solves cryptographic Proof-of-Work challenges transparently in the background
 * without user friction (no captchas, no images, no cookies).
 * Typical solve time: 40ms - 120ms.
 */

export interface AltchaChallenge {
  algorithm: string;
  challenge: string;
  salt: string;
  signature: string;
  maxnumber: number;
}

export interface AltchaPayload {
  challenge: string;
  salt: string;
  nonce: string;
  signature: string;
  verified: boolean;
}

/**
 * Computes SHA-256 hex string of a text input using Web Cryptography API
 */
async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Solves an ALTCHA challenge asynchronously in chunks to keep the browser 60 FPS responsive
 */
export async function solveAltchaChallenge(
  challengeData: AltchaChallenge,
  onProgress?: (percent: number) => void
): Promise<AltchaPayload | null> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    console.warn('[AltchaClient] Web Crypto API not available.');
    return null;
  }

  const { challenge, salt, signature, maxnumber } = challengeData;
  const targetHash = challenge.toLowerCase();
  const chunkSize = 2000;
  let current = 1;

  while (current <= maxnumber) {
    const chunkLimit = Math.min(current + chunkSize, maxnumber + 1);

    for (let i = current; i < chunkLimit; i++) {
      const candidateString = `${salt}${i}`;
      const candidateHash = await sha256Hex(candidateString);

      if (candidateHash === targetHash) {
        // Solution found!
        if (onProgress) onProgress(100);
        return {
          challenge,
          salt,
          nonce: i.toString(),
          signature,
          verified: true,
        };
      }
    }

    current = chunkLimit;
    if (onProgress) {
      onProgress(Math.floor((current / maxnumber) * 100));
    }

    // Yield control to the browser microtask queue to ensure UI stays perfectly smooth
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  console.warn('[AltchaClient] Could not find solution within maxnumber threshold.');
  return null;
}
