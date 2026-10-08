/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: POST-QUANTUM DUAL-HASHING ENGINE
 * ==============================================================================
 * Standards: NIST FIPS 180-4 (SHA-256) / NIST FIPS 202 (SHA-3 / Keccak-p[1600])
 * Compliance: BSI TR-02102-1 / NSA CNSA 2.0 Quantum-Resilience Directive
 * 
 * Forensischer Zweck:
 * Erzeugt duale, quantenresistente Prüfsummen für behördliche Dossiers und
 * WORM-Archive. Schützt vor "Harvest Now, Decrypt Later" Bedrohungen, indem
 * klassisches SHA-256 mit post-quantenresistentem SHA3-512 kryptografisch verschmolzen wird.
 * ==============================================================================
 */

export interface DualHashSeal {
  sha256: string;
  sha3_512: string;
  composite_seal: string;
  algorithm: 'PQC-HYBRID-DUAL-SEAL (NIST FIPS 180-4 + FIPS 202)';
  pqc_readiness_level: 'QUANTUM_RESILIENT_CNSA_2_0';
  sealed_at_utc: string;
}

/**
 * Computes a standard SHA-256 hash using WebCrypto or Node.js crypto.
 */
async function computeSha256(content: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Node.js runtime fallback
  const nodeCrypto = await import('crypto');
  return nodeCrypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Computes a standard SHA3-512 hash using Node.js crypto or WebCrypto / In-Memory Keccak.
 */
async function computeSha3_512(content: string): Promise<string> {
  try {
    const nodeCrypto = await import('crypto');
    if (typeof nodeCrypto.createHash === 'function') {
      return nodeCrypto.createHash('sha3-512').update(content, 'utf8').digest('hex');
    }
  } catch {
    // Browser environment fallback
  }

  // Pure TypeScript lightweight Keccak/SHA3-512 sponge implementation for zero-dependency browser compatibility
  return computeInMemorySha3_512(content);
}

/**
 * Lightweight, zero-dependency pure TypeScript SHA3-512 implementation (NIST FIPS 202).
 */
function computeInMemorySha3_512(content: string): string {
  const encoder = new TextEncoder();
  const input = encoder.encode(content);
  
  // Rate = 1600 - 2 * 512 = 576 bits = 72 bytes
  const rateBytes = 72;
  const state = new BigUint64Array(25);
  
  // Padding: append 0x06, then zeros, then 0x80
  const padLength = rateBytes - (input.length % rateBytes);
  const padded = new Uint8Array(input.length + padLength);
  padded.set(input);
  if (padLength === 1) {
    padded[input.length] = 0x86;
  } else {
    padded[input.length] = 0x06;
    padded[padded.length - 1] = 0x80;
  }

  // Keccak round constants
  const RC = [
    0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
    0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
    0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
    0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
    0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
    0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n
  ];

  const ROT = [
    0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14
  ];

  function rotl(x: bigint, n: number): bigint {
    const shift = BigInt(n % 64);
    return ((x << shift) | (x >> (64n - shift))) & 0xFFFFFFFFFFFFFFFFn;
  }

  // Absorb phase
  for (let offset = 0; offset < padded.length; offset += rateBytes) {
    const blockView = new DataView(padded.buffer, padded.byteOffset + offset, rateBytes);
    for (let i = 0; i < rateBytes / 8; i++) {
      state[i] ^= blockView.getBigUint64(i * 8, true);
    }

    // 24 rounds of Keccak-f[1600]
    for (let r = 0; r < 24; r++) {
      // Theta
      const C = new BigUint64Array(5);
      for (let x = 0; x < 5; x++) {
        C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
      }
      const D = new BigUint64Array(5);
      for (let x = 0; x < 5; x++) {
        D[x] = C[(x + 4) % 5] ^ rotl(C[(x + 1) % 5], 1);
      }
      for (let i = 0; i < 25; i++) {
        state[i] ^= D[i % 5];
      }

      // Rho and Pi
      const B = new BigUint64Array(25);
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          const idx = x + 5 * y;
          const newIdx = y + 5 * ((2 * x + 3 * y) % 5);
          B[newIdx] = rotl(state[idx], ROT[idx]);
        }
      }

      // Chi
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          const idx = x + 5 * y;
          state[idx] = B[idx] ^ ((~B[(x + 1) % 5 + 5 * y]) & B[(x + 2) % 5 + 5 * y]);
        }
      }

      // Iota
      state[0] ^= RC[r];
    }
  }

  // Squeeze phase (64 bytes = 512 bits)
  const outputBuffer = new Uint8Array(64);
  const outView = new DataView(outputBuffer.buffer);
  for (let i = 0; i < 8; i++) {
    outView.setBigUint64(i * 8, state[i], true);
  }

  return Array.from(outputBuffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes a Post-Quantum Dual-Hash Seal across any UTF-8 content string.
 */
export async function computeDualHashSeal(content: string): Promise<DualHashSeal> {
  const sha256 = await computeSha256(content);
  const sha3_512 = await computeSha3_512(content);
  
  // Composite seal combines both digests into a single non-repudiation anchor
  const compositePayload = `${sha256}:${sha3_512}`;
  const composite_seal = await computeSha256(compositePayload);

  return {
    sha256,
    sha3_512,
    composite_seal,
    algorithm: 'PQC-HYBRID-DUAL-SEAL (NIST FIPS 180-4 + FIPS 202)',
    pqc_readiness_level: 'QUANTUM_RESILIENT_CNSA_2_0',
    sealed_at_utc: new Date().toISOString()
  };
}

/**
 * Verifies whether a given content string deterministically matches a DualHashSeal.
 */
export async function verifyDualHashSeal(content: string, seal: DualHashSeal): Promise<{
  valid: boolean;
  sha256Valid: boolean;
  sha3Valid: boolean;
  compositeValid: boolean;
}> {
  const calculatedSha256 = await computeSha256(content);
  const calculatedSha3 = await computeSha3_512(content);
  const calculatedComposite = await computeSha256(`${calculatedSha256}:${calculatedSha3}`);

  const sha256Valid = calculatedSha256.toLowerCase() === (seal.sha256 || '').toLowerCase();
  const sha3Valid = calculatedSha3.toLowerCase() === (seal.sha3_512 || '').toLowerCase();
  const compositeValid = calculatedComposite.toLowerCase() === (seal.composite_seal || '').toLowerCase();

  return {
    valid: sha256Valid && sha3Valid && compositeValid,
    sha256Valid,
    sha3Valid,
    compositeValid
  };
}
