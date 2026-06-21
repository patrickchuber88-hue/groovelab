# Groovelab 15-Minute Realistic Load Simulation Consolidated Report

**Date of Execution**: 2026-06-21  
**Target Database**: Supabase PostgreSQL (`https://supabase.campus-groovelab.de`)  
**Active User Load**: ~6,500 users (6,375 students, 90 teachers, 1% students designated as admins, 5% designated as teachers client-side) across 10 newly created dummy schools.  
**Simulation Duration**: 15 minutes (907.3 seconds)  
**Log File**: `simulation_realistic_15m.log`  

---

## 1. Executive Summary & Core Metrics

The 15-minute realistic load simulation was successfully executed to evaluate the Groovelab backend under production-level concurrency. The user journeys simulated typical real-world activities for students (dashboard loads, check-ins, practice logs, homework reading, feedback), teachers (student lists, notes/homework updates, event program point submissions, conflict checks), and admins (viewing school user statistics). 

Under a load of 6,500 active users, a total of **114,235 requests** were dispatched at an average throughput of **125.91 req/s**. The database was subjected to a query mix designed to reflect actual product behavior: 70% Read operations, 20% Session Check-ins/Check-outs, and 10% Write operations.

The overall request success rate was **81.45%** (93,040 successful requests vs. 21,195 failures). While multi-tenant isolation rules successfully prevented cross-school data leakages, the database connection pool starved, and the tail latency rose to approximately 10 seconds.

### 1.1 Key Metrics Table

| Metric | Value | Verdict |
| :--- | :--- | :--- |
| **Total Duration** | 907.3 seconds (15m 7s) | Target Met |
| **Total Requests** | 114,235 | High Concurrency Fulfill |
| **Throughput** | 125.91 requests/second | Backend Saturated |
| **Successful Requests** | 93,040 (81.45%) | Bottlenecks Identified |
| **Failed Requests** | 21,195 (18.55%) | Action Required |
| **p50 (Median) Latency** | 1,005 ms | Degraded |
| **p95 Latency** | 9,827 ms | Severe Queuing |
| **p99 Latency** | 10,032 ms | Max Starvation |
| **Multi-Tenant Leakage** | 0 occurrences | **PASS (Secure)** |

### 1.2 Consolidated Error Breakdown

| Error/Exception Key | Status | Count | Percentage | Primary Cause |
| :--- | :---: | :--- | :--- | :--- |
| **DB_EXCEPTION_42703** | 400 | 10,370 | 9.08% | Querying non-existent `coach_notes`/`homework` columns on `lessons`. |
| **UNKNOWN_ERROR_504** | 504 | 5,241 | 4.59% | PostgREST connection pool timeout (starving waiting for Postgres connection). |
| **UNKNOWN_ERROR_502** | 502 | 2,212 | 1.94% | API Gateway proxy timeouts due to upstream PostgREST drops. |
| **DB_EXCEPTION_23514** | 400 | 1,466 | 1.28% | Check constraint on `band_proposal_votes` (`vote` must be `'approve'`/`'reject'`). |
| **DB_EXCEPTION_23505** | 409 | 1,008 | 0.88% | Uniqueness constraint violations on `band_song_slots` and `lab_planning`. |
| **DB_EXCEPTION_PGRST204** | 400 | 305 | 0.27% | PostgREST schema cache mismatch trying to PATCH missing `coach_notes` on `lessons`. |
| **RLS_VIOLATION** (`[P0001]`) | 400 | 268 | 0.23% | Custom triggers checking real user roles (blocking simulated students acting as admins). |
| **UNKNOWN_ERROR_500** | 500 | 283 | 0.25% | General server exceptions (189) and SQL statement timeouts (`57014`) (94). |
| **DB_EXCEPTION_P0001** | 400 | 42 | 0.04% | Stored trigger blocking teachers from adding program points to other users' private events. |

---

## 2. In-Depth Expert Feedback Synthesis

Five expert subagents (Quality Control, Cyber-Security, Database, Server/Infrastructure, and App Developer) evaluated the execution logs, source configurations, and database state to produce the following findings.

### 2.1 Quality Control Evaluation (QC Expert)
*   **Pathway Coverage**: The simulation successfully exercised all planned workflows (Student, Teacher, and Admin routes). However, real user pathways were heavily disrupted by the 18.55% failure rate.
*   **User Experience (UX) Impact**: A 1.0-second median response time is highly noticeable to end-users, while the 9.8-second p95 latency renders the app practically unusable under heavy traffic. Users clicking check-in or saving schedule preferences would experience freezing screens, likely triggering repeated double-clicking which worsens the database load.
*   **Functional Failures**: The largest QC failure is the schema mismatch on lessons (9.08% of all requests). Every attempt by a student to fetch homework or by a teacher to write notes aborted with a 400 Bad Request, blocking essential pedagogical functions.

### 2.2 Server & Infrastructure Evaluation (Infra Expert)
*   **Connection Starvation**: The primary server bottleneck is database connection starvation. With PostgreSQL's connection limit capped at 100, a high concurrency of 6,500 active users results in massive queuing.
*   **Gateway Timeouts (504s / 502s)**: PostgREST's connection acquisition timeout is set to 10 seconds. When requests were queued longer than 10 seconds waiting for one of the 100 Postgres connection slots, PostgREST aborted them with 504 errors. When PostgREST saturated and dropped sockets, the API Gateway (Kong/Nginx) threw 502 Bad Gateway errors.
*   **Statement Timeouts (57014)**: Under heavy write load and CPU constraints, locks were held longer. Read queries that took longer than the 10-second statement timeout were terminated by PostgreSQL.

### 2.3 Database Performance & Schema Evaluation (Database Expert)
*   **Seq Scans on User email Decryption**: The `users` view decrypts email prefixes using subqueries on `user_email_prefixes` and `user_email_suffixes`. Because these tables lack indexes on `user_id`, *every single lookup* of a user or student list performs a full sequential scan of both tables. Under load, listing 600 students triggers sequential scans across millions of virtual rows, exhausting the CPU (peaking at 75-80%) and triggering query statement timeouts.
*   **Uniqueness Collisions (`23505`)**: 
    *   `band_song_slots`: The client did not supply `part_number` when joining slots, defaulting to `1`. Concurrently, multiple students attempting to join the same band song for the same instrument collided on the unique constraint `(band_song_id, instrument, part_number)`.
    *   `lab_planning`: The simulation issued plain `POST` inserts with hardcoded day/time values (`Montag 17:00`), causing unique constraint collisions (`user_id, day, time`) if run repeatedly.
*   **Timeline Index Gap**: No index existed on `campus_event_program_points` for `(event_id, stage_number, sort_order)`. Offloaded timeline queries had to sort and scan records sequentially in memory.

### 2.4 App Developer Evaluation (Developer Expert)
*   **Schema Drift (Lessons Table)**: The client query targets `lessons.coach_notes` and `lessons.homework`. However, the database schema defines `coach_notes` on the `users` table, and homework notes on `progress_matrix` or `meisterwerk_protocol`. This schema drift caused 10,675 aborted queries.
*   **Conflict Checking Offloading**: Offloading the daily schedule conflict checks to the Postgres RPC function `get_schedule_conflicts` was highly successful. It reduced client-side computational complexity from $O(N \cdot M + N^2)$ to index-assisted database-side loops, saving massive network payloads and preventing the exposure of private teacher calendars to client browsers.

### 2.5 Cyber-Security Audit (Security Expert)
*   **Multi-Tenant Isolation**: Verified complete tenant segregation; no cross-school leakages occurred. Partitioning via `public.check_school_access(school_id)` successfully restricted reads/writes.
*   **Registration Bypass Vulnerability**: Migration 171 allows user inserts if the client-supplied HTTP header `x-invite-school-id` matches the target `school_id`. Because headers are controlled by the client and unsigned, any attacker can bypass registration protections. A secure token-based signup migration exists as a scratch script (`apply_improvements.ts`) but was never merged.
*   **Search Path Hijacking Risk**: Several `SECURITY DEFINER` functions—including view trigger `handle_users_view_dml()` and RLS helpers—lack explicit `SET search_path` constraints. An attacker could hijack functions like `pgp_sym_encrypt` by defining a malicious function with the same name in a schema they control, executing code with superuser privileges.
*   **Role Regression**: Migration 131 redefined `is_teacher_or_admin()` to resolve recursion but omitted the `secretary` role check. This regression locked secretaries out of administrative privileges.
*   **Log Mislabeling**: The RLS errors reported in logs are actually procedural database exceptions (`P0001`) raised by `BEFORE INSERT` triggers before RLS check execution. RLS policies behaved correctly.

---

## 3. Actionable Recommendations & Remediation Plan

To resolve the identified performance bottlenecks, security risks, and code defects, we recommend executing the following multi-tiered remediation plan:

### 3.1 Server-Side Database & Connection Tuning (High Priority)

1.  **Deploy PgBouncer in Transaction Mode**:
    *   Route database connections through PgBouncer on port `6543`.
    *   Set PgBouncer pool mode to `transaction`. This allows Postgres connection slots to be leased only for the duration of individual transactions (lasting <10ms), enabling 100 connection slots to support thousands of concurrent users.
    *   *Warning (Prepared Statements)*: Disable prepared statements in the client connection string (e.g. `?pgbouncer=true` or `statement_cache_size=0`) to avoid SQLSTATE `26000` errors.
2.  **Deploy Read-Replicas**:
    *   Set up a read-replica server. Configure the application API gateway to route all read queries (`GET`) to the replica, leaving the primary database dedicated to handling writes (`POST`/`PATCH`/`DELETE`). This removes lock contention on write-heavy tables.
3.  **Upgrade VPS Hardware**:
    *   Upgrade Hetzner database VPS to dedicated vCPUs to handle heavy RLS and cryptographic decryption processing.
    *   Upgrade storage drives to NVMe with guaranteed IOPS to speed up transactional disk flushes.

### 3.2 Database Schema & Query Optimization

1.  **Create Performance Indexes**:
    *   Execute the following SQL script to create unique indexes on email-split tables (preventing sequential scans during decryption subqueries) and the composite index for timeline ordering:
    ```sql
    -- Optimize user list loading and email decryption
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_prefixes_user_id ON public.user_email_prefixes(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_suffixes_user_id ON public.user_email_suffixes(user_id);

    -- Optimize event timeline rendering
    CREATE INDEX IF NOT EXISTS idx_program_points_timeline ON public.campus_event_program_points(event_id, stage_number, sort_order);
    ```
2.  **Implement Batch Session Check-in RPC**:
    *   Combine check-out of old sessions and check-in of new sessions into a single atomic database function (`check_in_student(p_user_id, p_station_id)`). This reduces client-to-server connection round-trips from 3 to 1.
3.  **Resolve Check Constraints & Uniqueness Collisions**:
    *   Fix the simulation vote payloads to match the check constraint (replace `'yes'`/`'no'` with `'approve'`/`'reject'`).
    *   Update `lab_planning` writes to perform UPSERT queries instead of INSERT:
        *   Append `on_conflict=user_id,day,time` or use PostgREST header `Prefer: resolution=merge-duplicates`.
    *   Avoid duplicate slot bookings by letting the database automatically compute the next `part_number` in a trigger if the client leaves it blank.

### 3.3 Security Hardening & Bug Fixes

1.  **Pin search_path on SECURITY DEFINER Functions**:
    *   Update DML view triggers and onboarding functions to set an explicit, secure search path to block search path hijacking:
    ```sql
    ALTER FUNCTION public.handle_users_view_dml() SET search_path = public, pg_catalog, extensions;
    ALTER FUNCTION public.complete_onboarding(UUID, TEXT) SET search_path = public, pg_catalog, extensions;
    ```
2.  **Deploy Token-Based Registration**:
    *   Merge the `invite_tokens` schema and verification triggers from `apps/groovelab/scratch/apply_improvements.ts` into a database migration.
    *   Transition registration from unverified HTTP headers (`x-invite-school-id`) to server-verified cryptographic invitation tokens.
3.  **Fix Secretary Access Regression**:
    *   Modify `public.is_teacher_or_admin()` to include the `'secretary'` role in the return criteria:
    ```sql
    CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
    RETURNS BOOLEAN AS $$
    DECLARE
        v_role TEXT;
    BEGIN
        v_role := public.get_current_user_role();
        RETURN v_role IN ('teacher', 'admin', 'secretary');
    END;
    $$ LANGUAGE plpgsql STABLE;
    ```

### 3.4 Client-Side Performance Optimizations

1.  **Request Debouncing**:
    *   Implement client-side debouncing (e.g. 500ms) for high-frequency user interactions (like checking preferences in `lab_planning` or clicking calendar filters) to prevent multiple rapid database requests.
2.  **Request Batching**:
    *   Buffer multiple user actions (like casting votes on different band song proposals) and dispatch them in a single batch query (e.g. `upsert` of an array) every 2 seconds.
3.  **Optimistic UI with Graceful Error Reversals**:
    *   Provide instant UI updates to the user. If database constraints or gateway errors abort the transaction in the background, display a toast notification and revert the UI state gracefully.
