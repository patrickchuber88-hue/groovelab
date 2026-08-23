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

// ─── Biometric Device Vault & Multi-Profile Management ─────────────────────────

export interface BiometricVaultProfile {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  instrument?: string | null;
  photoUrl?: string | null;
  credentialId: string;
  sessionToken: string;
  createdAt: string;
}

const VAULT_STORAGE_KEY = 'gl_biometric_device_vault';

/**
 * Retrieves all registered biometric profiles on this device with schema sanitization.
 */
export const getStoredBiometricProfiles = (): BiometricVaultProfile[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Sanitize schema to prevent crashes from corrupted profiles
    return parsed.filter(
      (p: any) =>
        p &&
        typeof p === 'object' &&
        typeof p.userId === 'string' &&
        typeof p.credentialId === 'string' &&
        typeof p.firstName === 'string'
    );
  } catch (err) {
    console.error('Failed to parse biometric vault:', err);
    return [];
  }
};

/**
 * Saves or updates a biometric profile in the local vault.
 */
export const saveBiometricProfile = (profile: BiometricVaultProfile): void => {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredBiometricProfiles();
    const existingIndex = current.findIndex((p) => p.userId === profile.userId);
    if (existingIndex >= 0) {
      current[existingIndex] = profile;
    } else {
      current.push(profile);
    }
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Failed to save biometric profile to localStorage:', err);
  }
};

/**
 * Removes a biometric profile from the local vault.
 */
export const removeBiometricProfile = (userId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredBiometricProfiles();
    const updated = current.filter((p) => p.userId !== userId);
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to remove biometric profile:', err);
  }
};

/**
 * Registers WebAuthn biometrics for a user on this device and stores it in the local vault.
 */
export const registerUserBiometrics = async (
  email: string,
  userId: string,
  firstName: string,
  lastName: string,
  role: string,
  sessionToken: string,
  instrument?: string | null,
  photoUrl?: string | null
): Promise<BiometricVaultProfile> => {
  // Generate pseudo random challenge
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const challenge = arrayBufferToBase64url(randomBytes.buffer);
  const credential = await registerBiometrics(email || `${userId}@campus-groovelab.de`, userId, challenge);

  const profile: BiometricVaultProfile = {
    userId,
    email: email || '',
    firstName,
    lastName,
    role,
    instrument: instrument || null,
    photoUrl: photoUrl || null,
    credentialId: credential.id,
    sessionToken,
    createdAt: new Date().toISOString(),
  };

  saveBiometricProfile(profile);
  return profile;
};

/**
 * Authenticates a biometric user on this device and returns their vault profile.
 */
export const authenticateUserBiometrics = async (
  targetUserId?: string
): Promise<BiometricVaultProfile> => {
  const profiles = getStoredBiometricProfiles();
  if (profiles.length === 0) {
    throw new Error('Kein biometrisches Profil auf diesem Gerät registriert.');
  }

  const selectedProfile = targetUserId
    ? profiles.find((p) => p.userId === targetUserId)
    : profiles[profiles.length - 1]; // Default to most recently added profile

  if (!selectedProfile) {
    throw new Error('Gewünschtes Nutzerprofil für Biometrie nicht gefunden.');
  }

  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const challenge = arrayBufferToBase64url(randomBytes.buffer);
  await authenticateBiometrics(challenge, [selectedProfile.credentialId]);

  return selectedProfile;
};

// ─── Master Admin Dedicated Passkey / FIDO2 Engine ───────────────────────────

const MASTER_PASSKEY_STORAGE_KEY = 'gl_master_admin_passkey';

export interface MasterPasskeyProfile {
  userId: string;
  email: string;
  credentialId: string;
  createdAt: string;
  lastUsedAt?: string;
}

/**
 * Checks whether a Master Admin Passkey is registered on this hardware device
 */
export const isMasterPasskeyRegistered = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(MASTER_PASSKEY_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!(parsed && parsed.credentialId && parsed.userId);
  } catch {
    return false;
  }
};

/**
 * Registers a new hardware-bound Passkey (TouchID / FaceID / YubiKey) for Master Admin
 */
export const registerMasterPasskey = async (
  userId: string,
  email: string = 'master@campus-groovelab.de'
): Promise<MasterPasskeyProfile> => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn / Biometrie wird von diesem Gerät nicht unterstützt.');
  }

  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const challenge = arrayBufferToBase64url(randomBytes.buffer);
  const credential = await registerBiometrics(email, userId, challenge);

  const profile: MasterPasskeyProfile = {
    userId,
    email,
    credentialId: credential.id,
    createdAt: new Date().toISOString()
  };

  localStorage.setItem(MASTER_PASSKEY_STORAGE_KEY, JSON.stringify(profile));
  return profile;
};

/**
 * Authenticates the Master Admin using the hardware Passkey
 */
export const authenticateMasterPasskey = async (): Promise<MasterPasskeyProfile> => {
  if (!isMasterPasskeyRegistered()) {
    throw new Error('Kein Master-Passkey auf diesem Gerät hinterlegt.');
  }

  const raw = localStorage.getItem(MASTER_PASSKEY_STORAGE_KEY);
  const profile: MasterPasskeyProfile = JSON.parse(raw!);

  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const challenge = arrayBufferToBase64url(randomBytes.buffer);
  await authenticateBiometrics(challenge, [profile.credentialId]);

  profile.lastUsedAt = new Date().toISOString();
  localStorage.setItem(MASTER_PASSKEY_STORAGE_KEY, JSON.stringify(profile));

  return profile;
};

