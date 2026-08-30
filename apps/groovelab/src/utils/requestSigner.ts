/**
 * Campus-Groovelab Tier-1 Paranoid-Tier HMAC-SHA256 Request Watermarking Engine
 * Signs sensitive client-side payload mutations with ephemeral timestamps to prevent replay attacks.
 */

export interface SignedRequestHeaders {
  'X-Request-Timestamp': string;
  'X-Request-Signature': string;
  'X-Request-Nonce': string;
}

/**
 * Generates an ephemeral HMAC-SHA256 signature for a request payload.
 */
export async function signPayload(
  payload: Record<string, any> | string,
  secretKey: string = 'campus-groovelab-anti-replay-v1'
): Promise<SignedRequestHeaders> {
  const timestamp = Date.now().toString();
  const nonce = window.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const dataToSign = `${timestamp}:${nonce}:${serialized}`;

  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await window.crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(dataToSign)
  );

  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    'X-Request-Timestamp': timestamp,
    'X-Request-Signature': signatureHex,
    'X-Request-Nonce': nonce
  };
}
