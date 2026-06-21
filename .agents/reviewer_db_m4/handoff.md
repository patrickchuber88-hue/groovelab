# Handoff Report — Database Performance & Integrity Review

## 1. Observation
1.  **Simulation Metrics:** In `simulation_reports_15m_realistic.md`, the 15-minute write-heavy simulation details are:
    *   Total requests: 114,251.
    *   p50: 1,005 ms, p95: 9,827 ms, p99: 10,032 ms.
    *   Failure rate: 18.57% (21,211 requests).
    *   Errors: 5,241 Connection Pool Timeouts (`504` status, code `PGRST003` / `Timed out acquiring connection from connection pool`), 2,212 Bad Gateways, 10,370 invalid column queries, and 921 unique constraint violations.
2.  **Statement Timeouts:** In `simulation_realistic_15m.log`, read operations consistently timeout:
    *   `GET Teacher_LoadStudents -> status:500 (3027ms) | Error: [57014] canceling statement due to statement timeout`
3.  **Timeline Schema:** In `173_event_coordinator_schema.sql` (lines 34-70), the `campus_event_program_points` table is created. It includes columns `event_id`, `stage_number`, and `sort_order`, but lacks any index definition.
4.  **Email View Schema:** In `172_split_user_emails_encrypted.sql` (lines 60-70), the `users` view decrypts emails by querying `user_email_prefixes` and `user_email_suffixes` using `uep.user_id = ur.id`. However, neither of these two tables has an index on their `user_id` column.
5.  **Search Path Security:** In `172_split_user_emails_encrypted.sql` (lines 73-235), `handle_users_view_dml()` is defined as `SECURITY DEFINER` but lacks a `SET search_path` clause and calls `pgp_sym_encrypt` and `pgp_sym_decrypt` as unqualified functions.
6.  **RLS Helpers Security:** In `121_optimize_rls_functions.sql`, functions like `get_kiosk_school_id` and `get_user_school_id` run as `SECURITY DEFINER` without a `SET search_path` clause.
7.  **Onboarding Security:** In `133_fix_complete_onboarding_return.sql`, `complete_onboarding` runs as `SECURITY DEFINER` without a `SET search_path` clause.

## 2. Logic Chain
1.  **View Bottleneck (N+1 Scans):** When `Teacher_LoadStudents` queries `public.users` view (Obs. 2), it triggers a subquery to decrypt the email address for each user row (Obs. 4). Because `user_email_prefixes` and `user_email_suffixes` do not index `user_id` (Obs. 4), the database runs N sequential scans (one per row) on both tables.
2.  **Statement Timeouts:** For 600 students, scanning 6,500+ records in both tables and running `pgp_sym_decrypt` 600 times (Obs. 4) consumes massive CPU and exceeds the 3-second database statement timeout, causing statement cancellations (Obs. 2).
3.  **Connection Pool Exhaustion:** These long-running CPU-bound queries and triggers hold database connections open. Since PostgreSQL is limited to 100 connections, incoming requests quickly deplete the pool, resulting in connection pool timeouts (Obs. 1).
4.  **Timeline Render Bottleneck:** Without an index on `(event_id, stage_number, sort_order)` (Obs. 3), timeline queries require full sequential table scans and explicit sorts, degrading speed as the table grows under load.
5.  **Search Path Hijacking Vulnerability:** Since trigger functions, onboarding RPCs, and RLS helpers are `SECURITY DEFINER` but have no locked search paths (Obs. 5, 6, 7), they execute using the session's search path. An attacker could define a fake `pgp_sym_encrypt` or other functions in a custom schema, manipulate their session's search path, and execute arbitrary code with the definer's superuser privileges.

## 3. Caveats
No caveats.

## 4. Conclusion
*   **Verdict:** REQUEST_CHANGES (due to critical performance N+1 query timeouts and search path privilege escalation security risks).
*   **Actionable Fixes:**
    1.  Create composite index `idx_program_points_timeline` on `campus_event_program_points(event_id, stage_number, sort_order)`.
    2.  Create unique indexes on `user_email_prefixes(user_id)` and `user_email_suffixes(user_id)`.
    3.  Harden all `SECURITY DEFINER` functions (`handle_users_view_dml`, `complete_onboarding`, RLS helpers) by adding `SET search_path = public, pg_catalog, extensions` and schema-qualifying calls.

## 5. Verification Method
Verify that the database changes are applied:
1.  Check the database indexes:
    ```sql
    SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('campus_event_program_points', 'user_email_prefixes', 'user_email_suffixes');
    ```
2.  Check search paths on security definer functions:
    ```sql
    SELECT proname, prosecdef, proconfig FROM pg_proc WHERE proname IN ('handle_users_view_dml', 'complete_onboarding', 'get_user_school_id', 'get_kiosk_school_id');
    ```
