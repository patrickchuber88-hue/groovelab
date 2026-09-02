# 🏛️ Campus-Groovelab Tier-1 Enterprise+ Forensic Security Baseline

**Status:** ACTIVE & IMMUTABLE INVARIANT FINGERPRINT  
**Security Standard:** OWASP ASVS Level 3 / BSI TR-02102-1 / DSGVO Art. 25 & 32 (Privacy-by-Design & Privacy-by-Default)  
**Verification Tooling:** `scripts/security_drift_guard.mjs` & `scripts/security_negative_test_suite.mjs`

---

## 1. Executive Summary & Zero-Trust Core Architecture

Die Sicherheitsarchitektur von **Campus-Groovelab** basiert auf dem Prinzip des **vollständigen Misstrauens gegenüber dem Client (Zero-Trust Frontend)**. Da Browser-JavaScript, localStorage, React-States und URL-Parameter clientseitig manipuliert werden können, befinden sich alle Autorisierungs-, Authentifizierungs- und Datenintegritäts-Schranken auf der **PostgreSQL/Supabase-Backend-Ebene (Security-Definer RPCs, RLS, DML-Trigger & Opaque Session Leases)**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CLIENT (BROWSER / PWA / KIOSK)                       │
│    • Zero Secrets: Keine PINs, keine Passwörter, keine Hashes          │
│    • Opaque Session Leases (30-Tage TTL, 2h Support-Ghost TTL)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (TLS 1.3 + SRI Hashes)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   POSTGREST / SUPABASE PERIMETER                       │
│    • Autorisierung ausschließlich über Server-RPCs                     │
│    • Public Views mit Static NULL-Maskierung (users, students)         │
│    • DML-Trigger (trg_users_view_dml) neutralisieren Privilege Escalation│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SECURITY DEFINER / ISOLATED SCHEMA
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             POSTGRESQL STORAGE & ISOLATED PRIVATE SCHEMAS              │
│    • private_auth Schema: user_secrets, school_secrets, challenges    │
│    • Force Row Level Security (RLS) auf allen Tabellen                │
│    • Unveränderbare Revisionsprotokolle (audit_logs)                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Die 10 Unumstößlichen Sicherheits-Axiome (Architektur-Invarianten)

| # | Axiom | Technische Umsetzung | Fail-Closed Schutzmechanismus |
| :- | :--- | :--- | :--- |
| **1** | **Zero-Trust Client** | Frontend trifft keine Autorisierungsentscheidungen | Backend prüft jeden Request unabhängig von Client-Headern |
| **2** | **Kanonische Auth-RPCs** | Login nur via `authenticate_by_credential`, `authenticate_webauthn_credential`, `login_master_admin` | PostgREST-Suchen nach Ausweisen/Tokens sind anonym blockiert |
| **3** | **Fail-Closed Fallback** | Keine unsicheren Client-Fallbacks bei Backend-Fehlern | App bricht den Zugriff sofort ab (Default-Deny) |
| **4** | **Zero Secret Exposure** | Sensible Spalten liefern im `users`-View statisch `NULL::text` | Keine Passwörter, PINs oder Hashes in lesbaren Tabellen |
| **5** | **Server-Side PIN Verifikation** | `verify_personal_pin`, `verify_parent_pin`, `verify_student_pin` | Brute-Force-Lockout nach Fehlversuchen (`pin_locked_until`) |
| **6** | **Privilege Escalation Schutz** | `switch_user_active_role` prüft `roles`-Array in DB; `trg_users_view_dml` schützt Rollen & Mandanten | Direkte `users.update({ role })` werden serverseitig überschrieben |
| **7** | **Mandantentrennung (Multi-Tenancy)** | RLS erzwingt `school_id = get_current_user_school_id()` | Cross-Tenant-Queries liefern leere Ergebnismengen (0 Rows) |
| **8** | **Storage Scoping** | Storage-RLS auf Buckets `campus-assets` und `groovelab-assets` | Anonymes Löschen oder Cross-User-Modifikation ist verboten |
| **9** | **WebAuthn FIDO2 Challenge-Response** | Server generiert 32-Byte Nonce (`private_auth.webauthn_challenges`) mit 5-Minuten-TTL | Replay-Attacken und gefälschte Assertions sind unmöglich |
| **10** | **Automated Drift Detection** | `scripts/security_drift_guard.mjs` scannt jeden Build nach Verboten | Builds brechen bei Invarianten-Verletzungen sofort ab |

---

## 3. Autoritatives RPC- und Schnittstellen-Register

### A. Authentifizierung & Session-Ausstellung
- **`public.authenticate_by_credential(p_credential TEXT, p_school_id UUID)`**:
  - Unterstützt: 6-stellige Einmal-PINs, Master-PINs, Ausweisnummern, QR-Tokens, Teacher-QR-Tokens.
  - Erzeugt einen aktiven Datensatz in `public.session_leases` (30 Tage TTL).
  - Gibt ein strikt bereinigtes Zero-Knowledge-Profil zurück (alle PINs = null, `has_personal_pin` = bool).
- **`public.generate_webauthn_challenge(p_user_id UUID, p_type TEXT)`**:
  - Generiert kryptografisch sichere 32-Byte Nonce in `private_auth.webauthn_challenges`.
- **`public.register_webauthn_credential(p_user_id, p_credential_id, p_public_key, p_device_name, p_challenge)`**:
  - Validiert One-Time-Challenge und bindet Passkey-Credentials an den Benutzer.
- **`public.authenticate_webauthn_credential(p_credential_id TEXT, p_challenge TEXT, p_school_id UUID)`**:
  - Verifiziert Passkey-Assertion serverseitig, prüft Lockout und stellt Session Lease aus.
- **`public.login_master_admin(p_username TEXT, p_password TEXT, p_totp_code TEXT)`**:
  - Validiert Master-Admin-Passwort via Bcrypt/Argon2 und prüft TOTP-2FA serverseitig.

### B. PIN-Verifikation & Notfall-Resets
- **`public.verify_personal_pin(p_user_id UUID, p_pin TEXT)`**:
  - Verifiziert persönliche PIN serverseitig, sperrt Konto bei 5 Fehlversuchen für 15 Minuten.
- **`public.verify_parent_pin(p_student_id UUID, p_pin TEXT)`**:
  - Verifiziert 6-stellige Eltern-Master-PIN serverseitig.
- **`public.reset_parent_pin_via_recovery_key(p_student_id UUID, p_recovery_key TEXT)`**:
  - Prüft Notfallschlüssel serverseitig, setzt Eltern-PIN atomar zurück und auditiert die Aktion.
- **`public.set_personal_pin(p_user_id UUID, p_old_pin TEXT, p_new_pin TEXT)`**:
  - Aktualisiert PIN unter serverseitiger Validierung der alten PIN bzw. des Einmal-Ausweises.

### C. Rollen- & Mandanten-Steuerung
- **`public.switch_user_active_role(p_target_role TEXT)`**:
  - Verifiziert, dass `p_target_role` im `roles`-Array des angemeldeten Benutzers hinterlegt ist.
- **`public.activate_support_ghost_session(p_school_id UUID, p_role TEXT)`**:
  - Nur für Master-Admins; stellt ephemeren 2-Stunden-Lease aus und schreibt Audit-Log.

---

## 4. Schemata, Views & Maskierungs-Matrix

| Datenbank-Objekt | Schema | Zugriff | Sichtbare Spalten / Maskierung |
| :--- | :--- | :--- | :--- |
| `users_raw` | `public` | RLS (Verwaltung / Intern) | Physische Basistabelle mit Spalten für Hashes und Tokens |
| `users` | `public` (View) | Anon & Authenticated | `qr_token`, `teacher_qr_token`, `ausweis_nummer` für Anon = `NULL`. PINs/Passwörter = `NULL::text` |
| `user_secrets` | `private_auth` | Nur Security Definer RPCs | Isoliert vor jedem PostgREST-Zugriff |
| `school_secrets` | `private_auth` | Nur Security Definer RPCs | Isoliert vor jedem PostgREST-Zugriff |
| `webauthn_challenges`| `private_auth` | Nur Security Definer RPCs | Ephemerer Challenge-Speicher (5-Minuten-TTL) |
| `session_leases` | `public` | RLS (Eigener Lease) | Autoritativer Session-Lease-Speicher |
| `audit_logs` | `public` | Append-Only (RLS) | Unveränderbare Revisionsprotokollierung |

---

## 5. Automatisierte Drift-Guard- und CI/CD-Sicherheitsregeln

Jeder Build (`npm run build`) und jeder Commit führt folgende automatisierte Prüfungen aus:

1. **`node scripts/security_drift_guard.mjs`**:
   - Erkennt direkte Zugriffe auf `users_raw` oder `private_auth`.
   - Erkennt clientseitige PIN-Gleichheitsvergleiche (`===`).
   - Erkennt PostgREST-Filter nach geheimen Tokens.
   - Erkennt Plaintext-PIN-Keys im Browser-Storage.
2. **`bash scripts/pre_commit_secret_scanner.sh --all`**:
   - Erkennt versehentlich eingecheckte private Schlüssel, Service-Role-Keys oder Datenbank-URIs.
3. **`node scripts/security_negative_test_suite.mjs`**:
   - Führt simulierte Angriffe mit dem anonymen PostgREST-Client aus.
