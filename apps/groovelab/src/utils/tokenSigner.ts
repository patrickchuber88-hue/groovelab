/**
 * Campus-Groovelab Tier-1 Cryptographic Token & Device Binding Engine
 * Implements PSD2 RTS / FIDO2 Level Token Verification and Device Binding Gate.
 */

import { supabase } from '../lib/supabase';

export interface TokenVerificationResult {
  success: boolean;
  studentId?: string;
  schoolId?: string;
  schoolName?: string;
  schoolSubdomain?: string;
  displayName?: string;
  instrument?: string;
  role?: string;
  requiresDevicePinGate?: boolean;
  isFirstTimeRedemption?: boolean;
  message?: string;
}

/**
 * Validates a student token against the database and evaluates device-pairing requirements.
 */
export async function verifyTokenIntegrity(
  token: string,
  deviceKey?: string
): Promise<TokenVerificationResult> {
  if (!token || token.trim() === '') {
    return { success: false, message: 'Leerer Token übergeben.' };
  }

  try {
    const { data, error } = await supabase.rpc('verify_student_token_integrity', {
      p_token: token.trim(),
      p_device_key: deviceKey || ''
    });

    if (error) {
      console.warn('[TokenSigner] verify_student_token_integrity RPC error:', error);
      return { success: false, message: error.message };
    }

    return (data as TokenVerificationResult) || { success: false, message: 'Keine Antwort erhalten.' };
  } catch (err: any) {
    console.error('[TokenSigner] Exception during token verification:', err);
    return { success: false, message: err?.message || 'Netzwerkfehler bei Token-Prüfung.' };
  }
}

/**
 * 1-Click Emergency Revocation of student tokens and active sessions.
 */
export async function revokeStudentToken(studentId: string): Promise<{ success: boolean; newQrToken?: string; newAusweisNummer?: string; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('revoke_student_token_and_sessions', {
      p_student_id: studentId
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      newQrToken: data?.newQrToken,
      newAusweisNummer: data?.newAusweisNummer
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Fehler beim Widerrufen des Tokens.' };
  }
}
