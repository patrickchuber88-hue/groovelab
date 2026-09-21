/**
 * Campus-Groovelab Client-Side Runtime Integrity Guard
 * Standard: OWASP ASVS Level 3 / BSI IT-Grundschutz (Anti-Extension & Hooking Shield)
 * 
 * Verifies the integrity of fundamental JavaScript runtime primitives and APIs
 * to detect and neutralize Man-in-the-Browser attacks, malicious browser extensions,
 * and hostile prototype pollution.
 */

import { isDevEnvironment } from './tenantUrlHelper';
import { reportClientError } from '../lib/errorTelemetry';
import { executeSessionZeroize } from './sessionZeroize';

export interface RuntimeIntegrityReport {
  intact: boolean;
  anomalies: string[];
  timestamp: string;
}

/**
 * Inspects critical browser primitives to detect unauthorized modifications or hooks.
 */
export function verifyRuntimeIntegrity(): RuntimeIntegrityReport {
  const anomalies: string[] = [];

  try {
    // 1. Check window.fetch native integrity (when running in browser environment)
    if (typeof window !== 'undefined') {
      if (typeof window.fetch !== 'function') {
        anomalies.push('GLOBAL_FETCH_MISSING');
      } else {
        const fetchStr = Function.prototype.toString.call(window.fetch);
        if (!fetchStr.includes('[native code]')) {
          anomalies.push('GLOBAL_FETCH_HOOKED_OR_MONKEY_PATCHED');
        }
      }

      // 2. Check Web Cryptography API integrity
      if (typeof window.crypto === 'undefined' || !window.crypto.subtle) {
        anomalies.push('CRYPTO_SUBTLE_UNAVAILABLE');
      } else if (typeof window.crypto.subtle.digest !== 'function') {
        anomalies.push('CRYPTO_SUBTLE_DIGEST_CORRUPTED');
      }
    }

    // 3. Check Object.prototype for Prototype Pollution
    const dangerousKeys = [
      'isAdmin', 
      'is_master_admin', 
      'role', 
      'school_id', 
      'admin_pin', 
      'personal_pin',
      'qr_token',
      'subdomain'
    ];
    for (const key of dangerousKeys) {
      if (Object.prototype.hasOwnProperty(key)) {
        anomalies.push(`OBJECT_PROTOTYPE_POLLUTED_${key.toUpperCase()}`);
      }
    }

    // 4. Check Array.prototype fundamental methods
    const coreArrayMethods: Array<keyof Array<any>> = ['push', 'map', 'slice', 'filter'];
    for (const method of coreArrayMethods) {
      if (typeof (Array.prototype as any)[method] !== 'function') {
        anomalies.push(`ARRAY_PROTOTYPE_${String(method).toUpperCase()}_CORRUPTED`);
      }
    }

    // 5. Check Function.prototype.toString integrity
    if (typeof Function.prototype.toString !== 'function') {
      anomalies.push('FUNCTION_TOSTRING_CORRUPTED');
    }

  } catch (err: any) {
    anomalies.push(`INTEGRITY_CHECK_EXCEPTION_${err?.message || 'UNKNOWN'}`);
  }

  return {
    intact: anomalies.length === 0,
    anomalies,
    timestamp: new Date().toISOString()
  };
}

/**
 * Initializes continuous runtime protection.
 * In production, any detected tampering will trigger defensive session sanitization (Zeroize).
 */
export function initRuntimeIntegrityGuard(options: {
  enforceInDev?: boolean;
  onTamper?: (anomalies: string[]) => void;
} = {}): void {
  if (typeof window === 'undefined') return;

  const isDev = isDevEnvironment() && !options.enforceInDev;

  const report = verifyRuntimeIntegrity();

  if (!report.intact) {
    const errorMsg = `[RuntimeIntegrity] Anomalies detected: ${report.anomalies.join(', ')}`;

    if (isDev) {
      console.warn(`⚠️ ${errorMsg} (Suppressed in Local Dev / Test Mode)`);
      return;
    }

    console.error(`🚨 ${errorMsg}`);

    // Report critical anomaly to centralized telemetry
    reportClientError(errorMsg, {
      severity: 'CRITICAL',
      tag: 'RUNTIME_TAMPERING_DETECTED',
      context: 'RuntimeIntegrityGuard'
    });

    if (options.onTamper) {
      options.onTamper(report.anomalies);
    }

    // Defensive Fail-Closed: Wipe volatile credentials to prevent exfiltration
    executeSessionZeroize({
      preserveDeviceKey: true,
      redirectUrl: '/'
    });
  }
}
