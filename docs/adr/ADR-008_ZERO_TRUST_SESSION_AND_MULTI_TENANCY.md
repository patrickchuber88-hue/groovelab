# ADR-008: Zero-Trust Multi-Tenancy & PgBouncer Session Isolation

- **Status:** Akzeptiert (OWASP ASVS Level 3, BSI TR-03116 & Fail-Closed Invariante)
- **Datum:** 2026-09-18
- **Domäne:** Systemarchitektur, Multi-Tenancy, Database Security & Session Hygiene

---

## Kontext & Problemstellung

In mandantenfähigen B2B-SaaS-Plattformen mit geteilten Datenbanken (Single-Database Multi-Tenancy) bestehen zwei fundamentale Risiken:

1. **Connection-Pool-Poisoning (PgBouncer / Supavisor):**  
   Wird der Mandanten-Kontext über sitzungsgebundene SQL-Befehle (z. B. `SET app.current_tenant_id = '...'`) gesetzt, verbleibt die Variable auf der physischen Verbindung, wenn der Connection Pool im Transaction-Mode agiert. Ein nachfolgender HTTP-Request eines völlig anderen Mandanten könnte dieselbe Verbindung übernehmen und unberechtigt fremde Daten einsehen.
2. **Tabelleninhaber-Bypass bei Standard-RLS:**  
   Standardmäßiges `ENABLE ROW LEVEL SECURITY` schützt vor normalen Anwendungsbenutzern, wird jedoch von Tabelleneigentümern (`table owner`) und administrativen Wartungsverbindungen standardmäßig umgangen.
3. **Cross-Tenant-Foreign-Key Injektionen:**  
   Besitzt eine Entität nur einen einfachen Fremdschlüssel (`student_id`), könnte ein Angreifer versuchen, einen Datensatz seiner Schule mit der ID eines Schülers einer fremden Schule zu verknüpfen.

---

## Entscheidung

Für **Campus-Groovelab** wird eine deterministische, transaktionssichere und hardwarenahe Multi-Tenancy-Architektur festgelegt:

1. **Deterministischer Auth-Kontext via JWT / PostgREST (Zero Pool-Poisoning):**
   - Der Mandanten-Kontext wird niemals über langlebige Session-Variablen (`SET session ...`) gesteuert.
   - PostgREST und Supabase setzen den Kontext transaktionsgebunden pro HTTP-Request über `SET LOCAL request.jwt.claim.sub`.
   - Die autoritative Funktion `public.get_current_user_school_id()` löst die `school_id` deterministisch über `auth.uid()` aus `public.users_raw` auf (`SECURITY DEFINER` mit explizitem `SET search_path = public, private_auth, pg_catalog`).
   - Sobald die Transaktion endet, ist der Kontext rückstandslos bereinigt.

2. **Flächendeckendes `FORCE ROW LEVEL SECURITY` (Migration 445):**
   - Alle operativen Mandantentabellen (`users_raw`, `students`, `lessons`, `assignments`, `campus_direct_messages`, `schedule_occurrences`, `invoices`, etc.) unterliegen `FORCE ROW LEVEL SECURITY`.
   - Selbst Tabelleneigentümer und Wartungs-Rollen unterliegen den RLS-Policies ohne Ausnahme.

3. **Composite Foreign Keys & Engine-Level Mandantensperre (Migration 444):**
   - Tabellen mit Eltern-Kind-Beziehungen nutzen zusammengesetzte Fremdschlüssel:
     `FOREIGN KEY (child_id, school_id) REFERENCES parent_table(id, school_id)`.
   - Cross-Tenant-Verknüpfungen sind auf Datenbankebene physikalisch unmöglich.

4. **1% Enterprise Cryptographic Message Vault at Rest (Migration 446):**
   - Sämtliche Nachrichten (`campus_direct_messages`) und Shoutbox-Texte werden mit AES-256 (`pgcrypto`) hardware-beschleunigt verschlüsselt gespeichert.
   - Jede Schule besitzt einen isolierten kryptografischen Schlüssel in `private_auth.school_secrets`.

5. **DIN 66398 Löschklasse 1 (60-Tage Auto-Purge):**
   - Termingekoppelte Shoutboxen werden nach 60 Tagen automatisch geleert; allgemeine Chats bleiben dauerhaft erhalten (vollverschlüsselt).

---

## Konsequenzen & Invarianten für den Code

- **Verbot unmaskierter PostgREST-Suchen:** Es dürfen niemals ungefilterte Direktabfragen auf fremde `school_id`s ausgeführt werden.
- **Fail-Closed Doktrin:** Ergibt `get_current_user_school_id()` `NULL`, evaluieren alle Policies zu `FALSE`.
- **Forensischer Beweis:** Das SQL-Skript `scripts/security/rls-tenant-isolation-proof.sql` dient als versionierter, reproduzierbarer Nachweis der Unangreifbarkeit für Auditoren und Schulleitungen.
