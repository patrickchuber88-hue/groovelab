# ADR-001: Fail-Closed Authentifizierung & Server-Side PIN-Verifikation

- **Status:** Akzeptiert (Enterprise+ Invariante)
- **Datum:** 2026-08 / Re-zertifiziert 2026-09
- **Domäne:** Core Security & OWASP ASVS Level 3

---

## Kontext & Problemstellung
Im Bildungs- und Musikschulumfeld nutzen Minderjährige, Eltern, Lehrkräfte und Schulleitungen dieselbe Plattform auf unterschiedlichsten Endgeräten (private Smartphones, Schul-Tablets, Leihgeräte).
Ein klassischer Web-Ansatz („Frontend prüft `storedPin === enteredPin`“ oder PostgREST-Filter `.eq('qr_token', input)`) birgt dramatische Risiken:
1. PINs und Hashes wären im Client-Speicher oder Netzwerktraffic einsehbar (Secret Leakage).
2. Lokale Prüfungen können per Browser DevTools in 2 Sekunden manipuliert werden (Zero-Trust-Verletzung).
3. Fällt ein Auth-Dienst aus, besteht die Gefahr, dass unsichere Fallbacks unberechtigten Zugriff gewähren.

---

## Entscheidung
1. **Zero-Trust im Frontend:** Weder React-State, `localStorage`, `sessionStorage` noch URL-Parameter besitzen Autorisierungswirkung.
2. **Autoritative Server-RPCs:** Authentifizierung erfolgt ausnahmslos über:
   - `authenticate_by_credential(p_credential, p_school_id)`
   - `authenticate_webauthn_credential(p_credential_id, p_challenge, p_school_id)`
   - `login_master_admin(p_username, p_password, p_totp_code)`
3. **Fail-Closed Doktrin:** Schlägt der RPC fehl oder ist Supabase nicht erreichbar, wird sofort hart abgebrochen. Keine Fallbacks auf direkte Tabellenabfragen.
4. **100% Server-Side PINs:** PIN-Prüfungen (`verify_personal_pin`, `verify_parent_pin`) und PIN-Setups erfolgen vollständig in PostgreSQL mit Bcrypt/Argon2.
5. **Zero Secret Leakage:** `parent_pin`, `personal_pin`, `two_factor_secret` existieren niemals in lesbaren Client-SELECTs.

---

## Konsequenzen & Invarianten für den Code
- **Verboten:** `.from('users').select('personal_pin')` oder `.from('students').select('*').eq('qr_token', ...)`
- **Erlaubt:** Nur vorberechnete Flags konsumieren (`has_personal_pin: boolean`, `has_parent_pin: boolean`).
- **Verifikations-Guard:** `npm run security:check` und `npm run security:secrets` scannen die Codebasis automatisiert auf Verstöße.
