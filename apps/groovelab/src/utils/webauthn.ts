// Client-side WebAuthn Helpers for Campus-Groovelab

/**
 * Checks if WebAuthn / Biometrics (TouchID, FaceID, etc.) is supported on the current browser/device.
 */
export const isWebAuthnSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
};

/**
 * Helper to convert a Base64URL string into an ArrayBuffer.
 */
function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

/**
 * Helper to convert an ArrayBuffer to a Base64URL string.
 */
function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = window.btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Registers a new credential (biometrics) for the user.
 * In a production app, the challenge, rp, and user information would be fetched from the backend first.
 */
export const registerBiometrics = async (
  email: string,
  userId: string,
  challengeFromServer: string
): Promise<any> => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported on this device/browser.');
  }

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge: base64urlToArrayBuffer(challengeFromServer),
    rp: {
      name: 'Campus-Groovelab',
      id: window.location.hostname,
    },
    user: {
      id: base64urlToArrayBuffer(userId),
      name: email,
      displayName: email,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' }, // ES256
      { alg: -257, type: 'public-key' }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Forces biometrics like TouchID/FaceID
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  };

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Failed to create biometrics credential.');
  }

  const response = credential.response as AuthenticatorAttestationResponse;

  // Format response for sending to the server
  return {
    id: credential.id,
    rawId: arrayBufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      attestationObject: arrayBufferToBase64url(response.attestationObject),
    },
  };
};

/**
 * Authenticates the user using an existing credential (biometrics).
 */
export const authenticateBiometrics = async (
  challengeFromServer: string,
  allowedCredentialIds: string[]
): Promise<any> => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported on this device/browser.');
  }

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: base64urlToArrayBuffer(challengeFromServer),
    allowCredentials: allowedCredentialIds.map((id) => ({
      id: base64urlToArrayBuffer(id),
      type: 'public-key',
    })),
    userVerification: 'required',
    timeout: 60000,
  };

  const assertion = (await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  })) as PublicKeyCredential;

  if (!assertion) {
    throw new Error('Failed to retrieve biometrics credentials.');
  }

  const response = assertion.response as AuthenticatorAssertionResponse;

  return {
    id: assertion.id,
    rawId: arrayBufferToBase64url(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      authenticatorData: arrayBufferToBase64url(response.authenticatorData),
      signature: arrayBufferToBase64url(response.signature),
      userHandle: response.userHandle ? arrayBufferToBase64url(response.userHandle) : null,
    },
  };
};
