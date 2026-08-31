/**
 * 🛡️ Tier-1 Enterprise WebAuthn (FIDO2) Service
 * Native implementation of Passkeys (TouchID/FaceID/Windows Hello)
 * Zero dependency on external npm packages to prevent supply-chain attacks.
 */

export class PasskeyService {
  /**
   * Checks if the device supports WebAuthn / Passkeys
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 
           window.PublicKeyCredential !== undefined &&
           typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
  }

  /**
   * Initiates the creation of a new Passkey for a user.
   * In a real backend flow, the `challenge` must be provided by the server.
   */
  static async registerPasskey(userEmail: string, userId: string, serverChallenge: BufferSource): Promise<PublicKeyCredential | null> {
    if (!this.isSupported()) throw new Error('WebAuthn not supported on this device');

    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: serverChallenge,
      rp: {
        name: "Campus-Groovelab Enterprise",
        id: window.location.hostname
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userEmail,
        displayName: userEmail
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },  // ES256
        { type: "public-key", alg: -257 } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Enforce built-in authenticators (TouchID/FaceID)
        userVerification: "required"
      },
      timeout: 60000,
      attestation: "none"
    };

    try {
      const credential = await navigator.credentials.create({ publicKey });
      return credential as PublicKeyCredential;
    } catch (error) {
      console.error("[PasskeyService] Registration failed:", error);
      throw error;
    }
  }

  /**
   * Authenticates a user using their existing Passkey.
   */
  static async authenticatePasskey(serverChallenge: BufferSource): Promise<PublicKeyCredential | null> {
    if (!this.isSupported()) throw new Error('WebAuthn not supported');

    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: serverChallenge,
      rpId: window.location.hostname,
      userVerification: "required",
      timeout: 60000
    };

    try {
      const assertion = await navigator.credentials.get({ publicKey });
      return assertion as PublicKeyCredential;
    } catch (error) {
      console.error("[PasskeyService] Authentication failed:", error);
      throw error;
    }
  }
}
