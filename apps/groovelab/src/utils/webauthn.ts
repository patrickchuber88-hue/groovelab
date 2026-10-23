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
 * Safely converts either a 64-char hex string or a Base64URL string into an ArrayBuffer.
 */
function challengeToArrayBuffer(challenge: string): ArrayBuffer {
  const clean = challenge.trim();
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes.buffer;
  }
  return base64urlToArrayBuffer(clean);
}

/**
 * Safely extracts and normalizes the Relying Party ID (FQDN hostname without port or path).
 * Per W3C WebAuthn spec § 5.4.3, an RP ID MUST NOT be an IP address.
 */
export const getSanitizedRpId = (): string | undefined => {
  if (typeof window === 'undefined') return 'campus-groovelab.de';
  const hostname = window.location.hostname;
  if (!hostname || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':')) {
    return undefined;
  }
  return hostname;
};

/**
 * Registers a new credential (biometrics) for the user.
 * In a production app, the challenge, rp, and user information would be fetched from the backend first.
 */
export const registerBiometrics = async (
  userName: string,
  userId: string,
  challengeFromServer: string,
  displayName?: string
): Promise<any> => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported on this device/browser.');
  }

  const rpId = getSanitizedRpId();
  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge: challengeToArrayBuffer(challengeFromServer),
    rp: {
      name: 'Campus-Groovelab',
      ...(rpId ? { id: rpId } : {}),
    },
    user: {
      id: new TextEncoder().encode(userId).buffer,
      name: userName,
      displayName: displayName || userName,
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
  const spkiBuffer = typeof response.getPublicKey === 'function' ? response.getPublicKey() : null;
  const publicKeyAlgorithm = typeof response.getPublicKeyAlgorithm === 'function' ? response.getPublicKeyAlgorithm() : -7;

  // Format response for sending to the server
  return {
    id: credential.id,
    rawId: arrayBufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      attestationObject: arrayBufferToBase64url(response.attestationObject),
      publicKeySpki: spkiBuffer ? arrayBufferToBase64url(spkiBuffer) : arrayBufferToBase64url(response.attestationObject),
      publicKeyAlgorithm,
    },
  };
};

/**
 * Extracts cryptographic assertion fields (authenticatorData, clientDataJSON, signature, reported_sign_count)
 * from a native browser PublicKeyCredential assertion response for server-side FIDO2 verification ([P0-5]).
 */
export const extractWebAuthnAssertionPayload = (assertion: PublicKeyCredential): {
  p_authenticator_data: string;
  p_client_data_json: string;
  p_signature: string;
  p_reported_sign_count: number;
} => {
  const assertionResp = assertion.response as AuthenticatorAssertionResponse;
  const p_authenticator_data = assertionResp?.authenticatorData
    ? arrayBufferToBase64url(assertionResp.authenticatorData)
    : '';
  const p_client_data_json = assertionResp?.clientDataJSON
    ? arrayBufferToBase64url(assertionResp.clientDataJSON)
    : '';
  const p_signature = assertionResp?.signature
    ? arrayBufferToBase64url(assertionResp.signature)
    : '';

  let p_reported_sign_count = 0;
  try {
    if (assertionResp?.authenticatorData && assertionResp.authenticatorData.byteLength >= 37) {
      const dv = new DataView(assertionResp.authenticatorData);
      p_reported_sign_count = dv.getUint32(33, false);
    }
  } catch {}

  return {
    p_authenticator_data,
    p_client_data_json,
    p_signature,
    p_reported_sign_count,
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

  const rpId = getSanitizedRpId();
  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: challengeToArrayBuffer(challengeFromServer),
    ...(rpId ? { rpId } : {}),
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
  email?: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolName?: string | null;
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
 * [MIG-592 / Vektor 1C] Never persists a plaintext sessionToken in localStorage (Zero-Secret-Leakage).
 */
export const saveBiometricProfile = (profile: BiometricVaultProfile): void => {
  if (typeof window === 'undefined') return;
  try {
    const sanitizedProfile: BiometricVaultProfile = {
      ...profile,
      sessionToken: ''
    };
    const current = getStoredBiometricProfiles();
    const existingIndex = current.findIndex((p) => p.userId === sanitizedProfile.userId);
    if (existingIndex >= 0) {
      current[existingIndex] = sanitizedProfile;
    } else {
      current.push(sanitizedProfile);
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
  photoUrl?: string | null,
  schoolName?: string | null
): Promise<BiometricVaultProfile> => {
  // Generate pseudo random challenge
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const challenge = arrayBufferToBase64url(randomBytes.buffer);

  // Format human-readable FIDO2 account name with School context (e.g. "Patrick Huber • Patrick Huber Musikschule")
  const roleLabel = role === 'admin' ? 'Schulleitung' : role === 'teacher' ? 'Lehrkraft' : '';
  const contextParts = [schoolName, roleLabel].filter(Boolean).join(' • ');
  const formattedAccountName = contextParts 
    ? `${firstName} ${lastName} (${contextParts})` 
    : `${firstName} ${lastName}`;

  const credential = await registerBiometrics(
    formattedAccountName,
    userId,
    challenge,
    formattedAccountName
  );

  const profile: BiometricVaultProfile = {
    userId,
    email: email || '',
    firstName,
    lastName,
    role,
    schoolName: schoolName || null,
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

/**
 * Invalidates / cleans up a biometric profile when a PIN is reset or password is changed.
 */
export const invalidateBiometricProfile = (userId: string): void => {
  removeBiometricProfile(userId);
  console.log('[WebAuthn] Invalidated biometric credentials for user:', userId);
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

/**
 * [MIG-592 / Vektor 1A & 1B] Verifies a WebAuthn assertion via the authoritative BFF FIDO2 endpoint
 * (/api/auth/webauthn/verify -> Node.js crypto.verify against DB-pinned SPKI public key)
 * with resilient fallback to the hardened PostgreSQL RPC in local/test environments.
 */
export const verifyWebAuthnAssertionAuthoritative = async (
  supabase: any,
  credentialId: string,
  challenge: string,
  schoolId: string | null | undefined,
  assertionPayload: {
    p_authenticator_data: string;
    p_client_data_json: string;
    p_signature: string;
    p_reported_sign_count: number;
  }
): Promise<{ data: any; error: any }> => {
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    try {
      const resp = await window.fetch('/api/auth/webauthn/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          credentialId,
          challenge,
          schoolId: schoolId || null,
          authenticatorData: assertionPayload.p_authenticator_data,
          clientDataJSON: assertionPayload.p_client_data_json,
          signature: assertionPayload.p_signature,
          reportedSignCount: assertionPayload.p_reported_sign_count
        })
      });
      if (resp.ok || resp.status === 400 || resp.status === 401 || resp.status === 403) {
        const json = await resp.json().catch(() => null);
        if (json && typeof json === 'object') {
          return { data: json, error: resp.ok ? null : { message: json.error || 'WebAuthn verification failed' } };
        }
      }
    } catch {
      // Fallback to direct hardened PostgreSQL RPC when BFF proxy is unreachable in local/offline test environments
    }
  }

  return supabase.rpc('authenticate_webauthn_credential', {
    p_credential_id: credentialId,
    p_challenge: challenge,
    p_school_id: schoolId || null,
    ...assertionPayload
  });
};

/**
 * Authoritative Biometric Passkey Unlock for Parent Gates
 * Generates cryptographic challenge, invokes native WebAuthn get assertion,
 * and verifies assertion via BFF /api/auth/webauthn/verify & server RPC authenticate_webauthn_credential.
 */
export const authenticateParentBiometricPasskey = async (
  supabase: any,
  targetUserId: string,
  schoolId?: string | null
): Promise<{ success: boolean; lease_token?: string; error?: string }> => {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn / Biometrie wird von diesem Gerät nicht unterstützt.' };
  }

  try {
    // 1. Request cryptographic challenge from server
    const { data: chalData, error: chalErr } = await supabase.rpc('generate_webauthn_challenge', {
      p_user_id: targetUserId,
      p_type: 'auth'
    });

    if (chalErr || !chalData?.challenge) {
      return { success: false, error: 'Sicherheits-Challenge konnte nicht vom Server bezogen werden.' };
    }

    const challengeBuffer = new Uint8Array(
      chalData.challenge.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []
    ).buffer;

    const rpId = getSanitizedRpId();

    // 2. Perform native WebAuthn assertion
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challengeBuffer,
        userVerification: 'required',
        timeout: 60000,
        ...(rpId ? { rpId } : {})
      },
    })) as PublicKeyCredential;

    if (!assertion) {
      return { success: false, error: 'Keine biometrische Bestätigung empfangen.' };
    }

    // 3. Authenticate credential via authoritative BFF crypto.verify + server RPC
    const assertionPayload = extractWebAuthnAssertionPayload(assertion);
    const { data: authResult, error: authErr } = await verifyWebAuthnAssertionAuthoritative(
      supabase,
      assertion.id,
      chalData.challenge,
      schoolId || null,
      assertionPayload
    );

    if (authErr || !authResult?.success) {
      return {
        success: false,
        error: authResult?.error || authErr?.message || 'Biometrischer Passkey nicht erkannt oder nicht für dieses Profil hinterlegt.'
      };
    }

    return { 
      success: true, 
      lease_token: authResult?.lease_token 
    };
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
      return { success: false, error: 'Biometrische Prüfung abgebrochen.' };
    }
    return { success: false, error: err.message || 'Passkey-Entsperrung fehlgeschlagen.' };
  }
};

/**
 * Authoritative Biometric Passkey Login for Master Admin Cockpit
 * Zero-Trust & NIST SP 800-63B AAL3:
 * 1. Requests fresh 32-byte cryptographic challenge nonce from server
 * 2. Invokes browser navigator.credentials.get with userVerification: 'required'
 * 3. Verifies credential and receives verified session lease via BFF /api/auth/webauthn/verify & authenticate_webauthn_credential
 */
export const authenticateMasterBiometricPasskey = async (
  supabase: any
): Promise<{ success: boolean; user?: any; lease_token?: string; error?: string }> => {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn / Biometrie wird von diesem Gerät oder Browser nicht unterstützt.' };
  }

  try {
    const { data: chalData, error: chalErr } = await supabase.rpc('generate_webauthn_challenge', {
      p_type: 'auth'
    });

    if (chalErr || !chalData?.challenge) {
      return { success: false, error: 'Sicherheits-Challenge konnte nicht vom Server bezogen werden.' };
    }

    const challengeBuffer = new Uint8Array(
      chalData.challenge.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []
    ).buffer;

    const rpId = getSanitizedRpId();

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challengeBuffer,
        userVerification: 'required',
        timeout: 60000,
        ...(rpId ? { rpId } : {})
      },
    })) as PublicKeyCredential;

    if (!assertion) {
      return { success: false, error: 'Keine biometrische Bestätigung empfangen.' };
    }

    const assertionPayload = extractWebAuthnAssertionPayload(assertion);
    const { data: authResult, error: authErr } = await verifyWebAuthnAssertionAuthoritative(
      supabase,
      assertion.id,
      chalData.challenge,
      null,
      assertionPayload
    );

    if (authErr || !authResult?.success || !authResult?.user) {
      return {
        success: false,
        error: authResult?.error || authErr?.message || 'Passkey nicht erkannt oder keinem Master-Admin-Konto zugeordnet.'
      };
    }

    if (!authResult.user.is_master_admin) {
      return {
        success: false,
        error: 'Zugriff verweigert: Dieses Passkey-Konto besitzt keine Master-Admin-Berechtigung.'
      };
    }

    return {
      success: true,
      user: authResult.user,
      lease_token: authResult.lease_token
    };
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
      return { success: false, error: 'Biometrische Authentifizierung abgebrochen.' };
    }
    return { success: false, error: err.message || 'Passkey-Authentifizierung fehlgeschlagen.' };
  }
};

/**
 * Registers a new hardware-bound Passkey for Master Admin with authoritative server persistence
 */
export const registerMasterPasskeyAuthoritative = async (
  supabase: any,
  masterUserId: string,
  deviceName: string = 'Master TouchID / YubiKey',
  totpCode?: string
): Promise<{ success: boolean; error?: string; leaseToken?: string }> => {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn / Biometrie wird von diesem Gerät nicht unterstützt.' };
  }

  try {
    const { data: chalData, error: chalErr } = await supabase.rpc('generate_webauthn_challenge', {
      p_user_id: masterUserId,
      p_type: 'register'
    });

    if (chalErr || !chalData?.challenge) {
      return { success: false, error: 'Registrierungs-Challenge konnte nicht vom Server bezogen werden.' };
    }

    const rpId = getSanitizedRpId();
    const challengeBuffer = new Uint8Array(
      chalData.challenge.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []
    ).buffer;

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: challengeBuffer,
        rp: {
          name: 'Campus-Groovelab Master Cockpit',
          ...(rpId ? { id: rpId } : {})
        },
        user: {
          id: new TextEncoder().encode(masterUserId).buffer,
          name: 'master-admin',
          displayName: 'Master Administrator'
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          userVerification: 'required',
          residentKey: 'preferred'
        },
        timeout: 60000
      }
    })) as PublicKeyCredential;

    if (!credential) {
      return { success: false, error: 'Passkey-Erstellung vom Benutzer abgebrochen.' };
    }

    const attestationResp = credential.response as AuthenticatorAttestationResponse;
    const spkiBuf = typeof attestationResp.getPublicKey === 'function' ? attestationResp.getPublicKey() : null;
    const publicKeyPayload = spkiBuf
      ? arrayBufferToBase64url(spkiBuf)
      : arrayBufferToBase64url(attestationResp.attestationObject || credential.rawId);

    const { data: regResult, error: regErr } = await supabase.rpc('register_webauthn_credential', {
      p_user_id: masterUserId,
      p_credential_id: credential.id,
      p_public_key: publicKeyPayload,
      p_device_name: deviceName,
      p_challenge: chalData.challenge,
      p_totp_code: totpCode ? totpCode.trim() : null
    });

    if (regErr || !regResult?.success) {
      return { success: false, error: regResult?.error || regErr?.message || 'Passkey-Registrierung in der Datenbank fehlgeschlagen.' };
    }

    // 🛡️ NIST SP 800-63B AAL3: Persist newly minted lease token if returned by authoritative DB RPC
    if (regResult?.lease_token) {
      const leaseToken = String(regResult.lease_token);
      try {
        sessionStorage.setItem('gl_active_session_lease_id', leaseToken);
        localStorage.setItem('gl_active_session_lease_id', leaseToken);
        sessionStorage.setItem('groovelab_user_id', masterUserId);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('groovelab_user_id', masterUserId);
        }
        sessionStorage.setItem('groovelab_is_master_admin', 'true');
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('groovelab_is_master_admin', 'true');
        }
      } catch {}
    }

    // Save local hint so UI knows a passkey is registered locally
    localStorage.setItem(MASTER_PASSKEY_STORAGE_KEY, JSON.stringify({
      userId: masterUserId,
      credentialId: credential.id,
      createdAt: new Date().toISOString()
    }));

    return { 
      success: true,
      leaseToken: regResult?.lease_token ? String(regResult.lease_token) : undefined
    };
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
      return { success: false, error: 'Passkey-Erstellung abgebrochen.' };
    }
    return { success: false, error: err.message || 'Passkey-Registrierung fehlgeschlagen.' };
  }
};

/**
 * Authoritative Passkey Revocation across all user devices
 * Enforces atomic session purge and database deactivation via revoke_user_passkeys RPC
 */
export const revokeUserPasskeysAuthoritative = async (
  supabase: any,
  targetUserId: string
): Promise<{ success: boolean; revokedCount?: number; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('revoke_user_passkeys', {
      p_target_user_id: targetUserId
    });

    if (error || !data?.success) {
      return {
        success: false,
        error: data?.error || error?.message || 'Widerruf der Passkeys fehlgeschlagen.'
      };
    }

    return {
      success: true,
      revokedCount: data.revoked_count ?? 0
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Passkey-Widerruf fehlgeschlagen.' };
  }
};

/**
 * 🛡️ Authoritative Student Passkey Registration Helper for QR Landing Page
 */
export const registerAuthoritativeStudentPasskey = async (
  supabase: any,
  profile: any,
  token: string
): Promise<void> => {
  if (!isWebAuthnSupported()) {
    throw new Error('Biometrie wird von diesem Gerät nicht unterstützt.');
  }

  const { data: chalData, error: chalErr } = await supabase.rpc('generate_webauthn_challenge', {
    p_user_id: profile.id,
    p_type: 'register'
  });

  if (chalErr || !chalData?.challenge) {
    throw new Error('Sicherheits-Challenge konnte nicht vom Server bezogen werden.');
  }

  const userHandle = `schueler_${profile.id.substring(0, 8)}`;
  const studentName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Schüler';

  const passkeyResult = await registerBiometrics(
    userHandle,
    profile.id,
    chalData.challenge,
    studentName
  );

  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  const deviceName = isIOS ? 'Apple Touch ID / Face ID' : 'Passkey Authenticator';

  const { data: regResult, error: regErr } = await supabase.rpc('register_webauthn_credential', {
    p_user_id: profile.id,
    p_credential_id: passkeyResult.id,
    p_public_key: JSON.stringify(passkeyResult.response),
    p_device_name: deviceName,
    p_challenge: chalData.challenge
  });

  if (regErr || !regResult?.success) {
    throw new Error(regErr?.message || regResult?.error || 'Registrierung fehlgeschlagen.');
  }

  saveBiometricProfile({
    userId: profile.id,
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    role: profile.role || 'student',
    instrument: profile.instrument || null,
    credentialId: passkeyResult.id,
    sessionToken: token,
    createdAt: new Date().toISOString()
  });
};

