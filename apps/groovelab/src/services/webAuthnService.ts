// ==============================================================================
// 🏛️ Campus-Groovelab Enterprise+ WebAuthn & Passkey Hardware Enclave Service
// Standards: W3C Web Authentication (WebAuthn Level 3), FIDO2 Alliance,
//            BSI TR-03107-1, OWASP ASVS Level 3, TDDDG § 25
// ==============================================================================

/**
 * Encodes an ArrayBuffer or Uint8Array to Base64URL string (RFC 4648 § 5)
 */
export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes a Base64URL string to Uint8Array
 */
export function base64UrlToUint8Array(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface PasskeyAvailability {
  isSupported: boolean;
  isPlatformAuthenticatorAvailable: boolean;
  isConditionalMediationAvailable: boolean;
}

/**
 * Checks whether the client device supports FIDO2 WebAuthn hardware passkeys (Apple TouchID/FaceID, Windows Hello)
 */
export async function checkPasskeyCapabilities(): Promise<PasskeyAvailability> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return {
      isSupported: false,
      isPlatformAuthenticatorAvailable: false,
      isConditionalMediationAvailable: false
    };
  }

  let isPlatformAvailable = false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      isPlatformAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    isPlatformAvailable = false;
  }

  let isConditionalAvailable = false;
  try {
    if (typeof (PublicKeyCredential as any).isConditionalMediationAvailable === 'function') {
      isConditionalAvailable = await (PublicKeyCredential as any).isConditionalMediationAvailable();
    }
  } catch {
    isConditionalAvailable = false;
  }

  return {
    isSupported: true,
    isPlatformAuthenticatorAvailable: isPlatformAvailable,
    isConditionalMediationAvailable: isConditionalAvailable
  };
}

export interface RegisterPasskeyOptions {
  challengeBase64: string;
  userId: string;
  userName: string;
  userDisplayName: string;
  relyingPartyId?: string;
  relyingPartyName?: string;
}

export interface RegisterPasskeyResult {
  success: boolean;
  credentialId?: string;
  rawIdBase64?: string;
  clientDataJSON?: string;
  attestationObject?: string;
  error?: string;
  cancelled?: boolean;
}

/**
 * Registers a new FIDO2 Passkey credential hermetically locked to the device's Secure Enclave / TPM.
 */
export async function registerPlatformPasskey({
  challengeBase64,
  userId,
  userName,
  userDisplayName,
  relyingPartyId = typeof window !== 'undefined' ? window.location.hostname : 'campus-groovelab.de',
  relyingPartyName = 'Campus-Groovelab'
}: RegisterPasskeyOptions): Promise<RegisterPasskeyResult> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { success: false, error: 'WebAuthn wird von diesem Browser nicht unterstützt.' };
  }

  try {
    const challenge = base64UrlToUint8Array(challengeBase64);
    const userHandle = new TextEncoder().encode(userId);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge as unknown as BufferSource,
      rp: {
        name: relyingPartyName,
        id: relyingPartyId
      },
      user: {
        id: userHandle as unknown as BufferSource,
        name: userName,
        displayName: userDisplayName
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256 (ECDSA w/ SHA-256) - Apple Secure Enclave & Android
        { alg: -257, type: 'public-key' } // RS256 (RSA Signature w/ SHA-256) - Windows Hello
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Hardware Secure Enclave / TPM only (Zero Software-Token Leakage)
        userVerification: 'required',        // Biometric / Device PIN mandatory
        residentKey: 'required',             // Discoverable credential
        requireResidentKey: true
      },
      timeout: 60000,
      attestation: 'none' // Privacy-preserving: zero hardware serial leakage
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Passkey-Erstellung abgebrochen.' };
    }

    const response = credential.response as AuthenticatorAttestationResponse;
    const credentialId = bufferToBase64Url(credential.rawId);
    const clientDataJSON = bufferToBase64Url(response.clientDataJSON);
    const attestationObject = bufferToBase64Url(response.attestationObject);

    return {
      success: true,
      credentialId,
      rawIdBase64: credentialId,
      clientDataJSON,
      attestationObject
    };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, cancelled: true, error: 'Passkey-Erstellung vom Nutzer abgebrochen.' };
    }
    return { success: false, error: err.message || 'Passkey-Registrierung fehlgeschlagen.' };
  }
}

export interface AuthenticatePasskeyOptions {
  challengeBase64: string;
  allowedCredentialIds?: string[];
  relyingPartyId?: string;
}

export interface AuthenticatePasskeyResult {
  success: boolean;
  credentialId?: string;
  clientDataJSON?: string;
  authenticatorData?: string;
  signature?: string;
  userHandle?: string;
  error?: string;
  cancelled?: boolean;
}

/**
 * Authenticates an existing FIDO2 Passkey credential against the device's Secure Enclave.
 */
export async function authenticatePlatformPasskey({
  challengeBase64,
  allowedCredentialIds = [],
  relyingPartyId = typeof window !== 'undefined' ? window.location.hostname : 'campus-groovelab.de'
}: AuthenticatePasskeyOptions): Promise<AuthenticatePasskeyResult> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { success: false, error: 'WebAuthn wird von diesem Browser nicht unterstützt.' };
  }

  try {
    const challenge = base64UrlToUint8Array(challengeBase64);

    const allowCredentials: PublicKeyCredentialDescriptor[] = allowedCredentialIds.map(id => ({
      id: base64UrlToUint8Array(id) as unknown as BufferSource,
      type: 'public-key',
      transports: ['internal']
    }));

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: challenge as unknown as BufferSource,
      rpId: relyingPartyId,
      userVerification: 'required',
      timeout: 60000,
      ...(allowCredentials.length > 0 ? { allowCredentials } : {})
    };

    const assertion = (await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    })) as PublicKeyCredential | null;

    if (!assertion) {
      return { success: false, error: 'Passkey-Authentifizierung abgebrochen.' };
    }

    const response = assertion.response as AuthenticatorAssertionResponse;
    const credentialId = bufferToBase64Url(assertion.rawId);
    const clientDataJSON = bufferToBase64Url(response.clientDataJSON);
    const authenticatorData = bufferToBase64Url(response.authenticatorData);
    const signature = bufferToBase64Url(response.signature);
    const userHandle = response.userHandle ? bufferToBase64Url(response.userHandle) : undefined;

    return {
      success: true,
      credentialId,
      clientDataJSON,
      authenticatorData,
      signature,
      userHandle
    };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, cancelled: true, error: 'Biometrische Bestätigung vom Nutzer abgebrochen.' };
    }
    return { success: false, error: err.message || 'Passkey-Authentifizierung fehlgeschlagen.' };
  }
}
