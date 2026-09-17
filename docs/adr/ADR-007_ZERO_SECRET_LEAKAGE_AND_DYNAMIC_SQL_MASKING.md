# ADR-007: Zero-Secret-Leakage, Dynamic SQL Masking & Zero-PII Telemetry

- **Status:** Akzeptiert (OWASP ASVS Level 3 & DSGVO Art. 25/32 Invariante)
- **Datum:** 2026-09-17
- **Domäne:** Security, Privacy by Design & Data Protection

---

## Kontext & Problemstellung
Im Bildungsumfeld fallen hochsensible personenbezogene Daten (PII) an:
- Namen, Geburtstage und Kontaktdaten Minderjähriger.
- Bankverbindungen, Zahlungsmodalitäten und Barzahlungsquittungen.
- Persönliche PINs, Eltern-PINs, TOTP-Secrets und Passwort-Hashes.
- Fehlermeldungen und Stack-Traces bei Netzwerk- oder Runtime-Crashes.

Klassische Single-Page-Applications (SPAs) übertragen häufig ganze Datensätze an den Client und filtern sensible Felder erst im UI (`user.is_admin ? user.pin : null`). 
Dies verletzt das **Zero-Trust-Prinzip**: Ein Angreifer kann die Originaldaten im DevTools-Netzwerk-Tab oder im Browser-Speicher direkt extrahieren.

---

## Entscheidung
1. **Dynamisches SQL-PII-Masking auf Datenbankebene (`users_view` & `trg_users_view_dml`):**
   - Sensible Spalten (`email`, `phone`, `billing_method`, `cash_paid`, `last_name`, `qr_token`, `ausweis_nummer`) werden bereits im SQL-View dynamisch maskiert, wenn der anfragende Nutzer keine Schulleitungs-Berechtigung besitzt.
   - Fremde Schüler-Profile auf Kiosk- und Schul-Tablets erhalten serverseitig `last_name: null` und maskierte Initialen.
2. **Zero-Secret-Leakage in Views und Bundles:**
   - Die Spalten `parent_pin`, `personal_pin`, `two_factor_secret`, `password_hash`, `master_admin_password` dürfen NIEMALS in lesbaren Client-SELECTs oder DTOs auftauchen.
   - Der Client empfängt ausschließlich vorberechnete Booleans (`has_parent_pin`, `has_personal_pin`, `is_pin_activated`, `is_2fa_enabled`).
3. **FinTech Zero-PII Crash Telemetry Sanitizer (`initGlobalErrorSanitizer`):**
   - Laufzeitfehler, unhandled Promise Rejections und Netzwerk-Logs werden vor dem Telemetrie-Dispatch automatisch von Token, E-Mail-Adressen, Namen und Passwörtern bereinigt.
4. **Anti-Tamper Shield (`initAntiTamperShield`):**
   - Schutz der JavaScript-Laufzeitumgebung gegen unbefugte Manipulation nativer Prototypen und DOM-Injektionen.

---

## Konsequenzen & Invarianten für den Code
- **Strikte Invariante 04 & 14:** `public.users` und `users_raw` besitzen keine unmaskierten Direktabfragen für schulfremde Benutzer.
- **Verbot von Klartext-PINs im Speicher:** PINs werden ausschließlich transient in Passwort-Inputs gehalten und unmittelbar nach dem RPC-Aufruf verworfen.
- **Verifikations-Guard:** `npm run security:secrets` und `npm run security:check` prüfen kontinuierlich auf Entropie und Secret-Leaks.
