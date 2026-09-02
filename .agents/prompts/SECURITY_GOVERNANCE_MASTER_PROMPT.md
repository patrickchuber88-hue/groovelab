══════════════════════════════════════════════════════════════════════════════════
🛡️ CAMPUS-GROOVELAB ENTERPRISE+ SECURITY GOVERNANCE MASTER-PROMPT
Klassifizierung: UNUMSTÖSSLICHE ARCHITEKTUR-INVARIANTE (FAIL-CLOSED)
══════════════════════════════════════════════════════════════════════════════════

Du arbeitest an der Codebase von Campus-Groovelab. Die Plattform befindet sich auf 
einem verifizierten Tier-1 Enterprise+ Sicherheitsniveau (OWASP ASVS Level 3). 
Deine oberste Pflicht ist es, diesen Sicherheitsstandard bei jeder Code-Änderung, 
jedem neuen Feature und jedem Refactoring zu 100% zu wahren.

Jeder Code, der gegen die folgenden 10 Sicherheits-Axiome verstößt, ist fehlerhaft 
und führt zum sofortigen Abbruch der Aufgabe.

──────────────────────────────────────────────────────────────────────────────────
DIE 10 UNUMSTÖSSLICHEN SICHERHEITS-AXIOME
──────────────────────────────────────────────────────────────────────────────────

1. ZERO-TRUST FRONTEND (CLIENT = VOLLSTÄNDIG ÖFFENTLICH & MANIPULIERBAR):
   • Browser-JavaScript, localStorage, sessionStorage, React-State und URL-Parameter 
     sind reine UI-Hilfsmittel und besitzen NIEMALS Autorisierungs- oder Sicherheitswirkung.
   • Keine sicherheitsrelevanten Entscheidungen im Frontend (z.B. `if (user.role === 'admin')`).

2. AUTHENTIFIZIERUNG NUR ÜBER SERVERSEITIGE KANONISCHE RPCS:
   • Logins (Ausweis, QR, PIN, Passkey, Master-Admin) laufen AUSNAHMSLOS über:
     - `authenticate_by_credential(p_credential, p_school_id)`
     - `authenticate_webauthn_credential(p_credential_id, p_challenge, p_school_id)`
     - `login_master_admin(p_username, p_password, p_totp_code)`
   • Es dürfen NIEMALS direkte PostgREST-Abfragen auf `users`, `users_raw` oder 
     `students` zur Credential-Suche ausgeführt werden (z.B. KEIN `.eq('qr_token', ...)`).

3. FAIL-CLOSED ARCHITEKTUR (KEINE UNSICHEREN LEGACY-FALLBACKS):
   • Schlägt ein Sicherheits-RPC fehl oder ist nicht erreichbar, MUSS die Operation 
     abbrechen und einen Fehler werfen.
   • Es ist STRENG VERBOTEN, bei RPC-Fehlern auf direkte Tabellen-Abfragen oder 
     lokale Vergleichslogiken auszuweichen.

4. ABSOLUTE ZERO-SECRET-LEAKAGE IN VIEWS & BUNDLES:
   • Die Spalten `parent_pin`, `personal_pin`, `master_admin_password`, `two_factor_secret`, 
     `password_hash` dürfen NIEMALS in lesbaren SELECT-Statements, RPC-Rückgabewerten 
     oder Client-Objekten enthalten sein.
   • Der Client empfängt ausschließlich vorberechnete Boolesche Flags (`has_parent_pin`, 
     `has_personal_pin`, `is_pin_activated`, `is_2fa_enabled`).

5. VERIFIKATIONEN & RESETS ZU 100% SERVERSEITIG:
   • PIN-Prüfungen: `verify_personal_pin`, `verify_parent_pin`, `verify_student_pin`.
   • PIN-Setups: `set_initial_student_pin`, `set_personal_pin`.
   • PIN-Resets: `request_student_pin_reset`, `reset_student_pin_via_birth_day`, 
     `reset_parent_pin_via_recovery_key`.
   • Es dürfen keine JavaScript-Vergleiche nach dem Muster `storedPin === input` 
     existieren.

6. ROLLENWECHSEL & PRIVILEGE-ESCALATION-SCHUTZ:
   • Rollenwechsel dürfen NUR über `switch_user_active_role(p_target_role)` erfolgen.
   • Direkte Client-Updates wie `supabase.from('users').update({ role: ... })` 
     oder Änderungen an `is_master_admin` und `school_id` sind streng verboten und 
     werden serverseitig durch `trg_users_view_dml` neutralisiert.

7. MANDANTENTRENNUNG & IDOR/BOLA-SCHUTZ:
   • Jede Datenbank-Abfrage und RLS-Policy muss strikt auf `school_id = get_current_user_school_id()` 
     beschränkt sein.
   • Cross-School-Zugriffe sind standardmäßig blockiert (Default-Deny).

8. STORAGE-SCOPING & DESTRUKTIVE AKTIONEN:
   • Löschoperationen auf `storage.objects` (Buckets `campus-assets`, `groovelab-assets`) 
     müssen strikt auf den Ordner des angemeldeten Benutzers oder Schulleitung beschränkt sein.
   • Anonymes Löschen ist vollständig verboten.

9. AUDIT-LOGGING FÜR ALLE PRIVILEGIERTEN OPERATIONEN:
   • Alle administrativen Aktionen, Ghost-Support-Sitzungen, Notfall-Resets und 
     Master-Logins müssen unveränderbar in `public.audit_logs` oder `master_audit_trail` 
     protokolliert werden.

10. VERIFIKATIONSPFLICHT NACH JEDER ÄNDERUNG:
    • Führe nach jeder Code-Änderung `npx tsc --noEmit` und `npx vite build` aus.
    • Führe eine Repository-weite Suche nach verbotenen Mustern durch, bevor du die 
      Arbeit als abgeschlossen meldest.
══════════════════════════════════════════════════════════════════════════════════
