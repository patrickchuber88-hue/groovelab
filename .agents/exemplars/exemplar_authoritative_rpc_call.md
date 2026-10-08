# 🛡️ Exemplar 3: Autorativer Sicherheits-RPC-Aufruf mit Fail-Closed Schutz
<!--
Bounded Context: Core Security / ASVS Level 3
Rules: Server-side PIN verification via authoritative RPC; zero client plaintext PIN evaluation;
fail-closed on error or timeout; opaque lease issuance; 100% synthetic IDs.
-->

### Problemstellung
Eine sensible Elternbereichs-Aktion (z. B. Aktivierung des didaktischen Junior-Schutzes oder Ändern von Bildschirmzeit-Limits) erfordert die Verifikation der 6-stelligen Eltern-PIN. Die Prüfung darf niemals im Client geschehen (`inputPin === storedPin` ist strikt verboten).

### Konforme 0,1% Goldstandard Implementierung

```tsx
// apps/groovelab/src/services/parentAuthService.ts
import { supabase } from '../lib/supabaseClient';

export interface VerifyParentPinResponse {
  success: boolean;
  leaseToken?: string;
  error?: string;
}

const SYNTHETIC_SAMPLE_SCHOOL_ID = '00000000-0000-0000-0000-000000000000';

export async function verifyParentPinWithLease(
  parentUserId: string,
  enteredPin: string,
  schoolId: string = SYNTHETIC_SAMPLE_SCHOOL_ID
): Promise<VerifyParentPinResponse> {
  // Input Pre-Flight Sanitization
  if (!enteredPin || enteredPin.trim().length !== 6 || !/^\d{6}$/.test(enteredPin)) {
    return { success: false, error: 'Die Eltern-PIN muss exakt 6 Ziffern umfassen.' };
  }

  try {
    // OWASP ASVS Level 3: 100% serverseitige Verifikation via autoritativem PostgreSQL RPC
    const { data, error } = await supabase.rpc('verify_parent_pin_with_lease', {
      p_user_id: parentUserId,
      p_pin: enteredPin,
      p_school_id: schoolId,
      p_lease_duration_minutes: 15
    });

    // Fail-Closed Doktrin: Jeder Netzwerk- oder DB-Fehler führt zum sofortigen Abbruch
    if (error) {
      console.error('[SECURITY AUDIT] verify_parent_pin_with_lease fehlgeschlagen:', error.message);
      return { 
        success: false, 
        error: 'Autorisierung verweigert oder Sicherheits-RPC nicht erreichbar.' 
      };
    }

    if (!data || !data.verified || !data.session_lease) {
      return { 
        success: false, 
        error: 'Ungültige Eltern-PIN. Bitte überprüfen Sie Ihre Eingabe.' 
      };
    }

    // Erfolgreiche Verifikation liefert ein opakes, zeitlich begrenztes Session-Lease-Token
    return {
      success: true,
      leaseToken: data.session_lease
    };
  } catch (err) {
    // Fail-Closed: Keine Ausnahmen nach außen durchreichen
    console.error('[SECURITY AUDIT] Unerwartete Ausnahme bei PIN-Prüfung:', err);
    return {
      success: false,
      error: 'Sicherheitsfehler während der Autorisierung. Bitte versuchen Sie es erneut.'
    };
  }
}
```
