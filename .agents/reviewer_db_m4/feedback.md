# GrooveLab Database Performance & Integrity Analysis Report

## Executive Summary
This report analyzes database performance, schema design, indexing, and transactional integrity based on the 15-minute real-world write-heavy load simulation (`simulation_realistic_15m.log`) and current database schema state. 

During the simulation, response latencies rose significantly compared to read-only benchmarks, with metrics of:
*   **p50 Latency:** 1,005 ms
*   **p95 Latency:** 9,827 ms
*   **p99 Latency:** 10,032 ms
*   **Error Rate:** 18.57% (primarily connection pool timeouts and statement cancellations)

The analysis reveals that these spikes were driven by a combination of connection pool starvation (exceeding PostgreSQL's 100-connection limit), heavy write lock contention, statement timeouts on read queries due to subquery-based email decryption on unindexed foreign keys, and cryptographic overhead in database triggers. 

Additionally, the report reviews the effectiveness of the compound index `idx_program_points_timeline` on `campus_event_program_points`, details the PostgreSQL `search_path` vulnerability with `SECURITY DEFINER` functions using `pgp_sym_encrypt`, and provides production-ready SQL scripts to resolve these issues.

---

## 1. Analysis of the 15-Minute Load Simulation Metrics
Under the realistic simulation of 6,500 parallel users and ~127 requests per second, database latencies increased drastically (p50 of ~1s, p95/p99 of ~9.8s - 10s). The root causes for this degradation are:

### A. Connection Pool Starvation
*   **The Issue:** PostgreSQL was configured with its default limit of 100 concurrent connections.
*   **Mechanism:** Under a write-heavy load, connection lifetimes are extended due to transactional waits. If the client does not use a transaction-level connection pooler (like PgBouncer in *Transaction Mode*), each backend server process holds onto its database connection for the entire request lifecycle.
*   **Result:** The connection pool was rapidly exhausted, resulting in 5,241 instances of `504 - Timed out acquiring connection from connection pool` (error code `PGRST003` from PostgREST). 

### B. Write Lock Contention and Transaction Queuing
*   **Mechanism:** Concurrent transactions (such as checking in, logging progress, and proposing/voting on songs) perform updates and inserts on tables (`sessions`, `user_progress`, `help_requests`). 
*   **Locking:** Writes acquire `RowExclusiveLock` on target tables. Foreign key constraints (e.g., `user_id` pointing to `users_raw`) require the database to acquire `RowShareLock` on parent rows to ensure referential integrity.
*   **Blockages:** When multiple users write to rows linked to the same parent tables or schemas, transactions queue up waiting for locks. Because transactions are held open during slow queries, subsequent transactions must wait, propagating delays down the queue and inflating tail latencies (p95 and p99 exceeding 9.8 seconds).

### C. Cryptographic Overhead and CPU Exhaustion
*   **Mechanism:** CPU utilization on the VPS peaked at 75-80%. A substantial part of this CPU overhead was caused by the email encryption/decryption schema introduced in migration `172_split_user_emails_encrypted.sql`.
*   **Crypto Trigger:** Writes to the `public.users` view execute `handle_users_view_dml()` under `SECURITY DEFINER`. Inside this trigger, `pgp_sym_encrypt()` is called to split and encrypt email prefixes into `user_email_prefixes`. Cryptographic hashing and symmetric encryption are highly CPU-bound. 
*   **Locks Held Open:** Since encryption happens synchronously within the trigger transaction, it extends the duration of the transaction. Locks on `users_raw` and related tables are held longer, worsening lock contention.

### D. Unindexed View Queries and Statement Timeouts
*   **Mechanism:** The load test log reveals frequent timeouts for reads, specifically `Teacher_LoadStudents -> status:500 (3027ms) | Error: [57014] canceling statement due to statement timeout`.
*   **Query Analysis:** `Teacher_LoadStudents` executes a `GET` request: `/rest/v1/users?school_id=eq.${schoolId}&role=eq.student`. The `users` view is defined as:
    ```sql
    CREATE OR REPLACE VIEW public.users AS
    SELECT ur.*,
        (
            SELECT pgp_sym_decrypt(uep.prefix, public.get_encryption_key()) || '@' || ues.suffix
            FROM public.user_email_prefixes uep
            JOIN public.user_email_suffixes ues ON uep.user_id = ues.user_id
            WHERE uep.user_id = ur.id LIMIT 1
        ) AS email
    FROM public.users_raw ur;
    ```
*   **Lack of Indexes:** There are **no indexes** on `user_id` in either `user_email_prefixes` or `user_email_suffixes`.
*   **Query Execution Failure:** For every single student returned (up to 600 per school), PostgreSQL has to run the decryption subquery. Without an index on `user_id`, the database must perform a **Sequential Scan** (Seq Scan) on `user_email_prefixes` and `user_email_suffixes` (6,500+ rows each) for *every row* in the student list. This results in:
    $$\text{Total scanned rows} = \text{Students} \times (\text{Prefix Rows} + \text{Suffix Rows}) = 600 \times (6,500 + 6,500) = 7,800,000\text{ rows}$$
    In addition, it calls `pgp_sym_decrypt` 600 times. This combination exceeded the 3-second statement timeout, causing the database to terminate the query, wasting connection capacity and causing connection starvation.

---

## 2. Assessment of the Composite Index `idx_program_points_timeline`
The compound index `idx_program_points_timeline` is defined on `campus_event_program_points(event_id, stage_number, sort_order)`.

### A. Current Indexing Gap
In `173_event_coordinator_schema.sql`, `campus_event_program_points` was created with only a primary key index on `id`. No indexes were created on foreign keys or query filters.
The query to render an event's timeline is:
```sql
SELECT * FROM public.campus_event_program_points 
WHERE event_id = $1 AND stage_number = $2 
ORDER BY sort_order ASC;
```

### B. Efficiency of the Composite Index
Creating the composite index `(event_id, stage_number, sort_order)` optimizes this query in three ways:
1.  **Index Scan Filtering (B-Tree Matching):** Placing `event_id` and `stage_number` as the leading columns of a B-Tree index allows PostgreSQL to perform an index lookup. It jumps directly to the matching event and stage records in $O(\log N)$ time, bypassing a full Sequential Scan of the `campus_event_program_points` table.
2.  **Elimination of Explicit Sorts:** Under normal operation, PostgreSQL would have to fetch matching records and execute a sorting algorithm (e.g., QuickSort or MergeSort) in memory or temporary disk files to satisfy `ORDER BY sort_order`. Since the index stores keys in sorted order of the composite columns, the records matching `(event_id, stage_number)` are **already pre-sorted** by `sort_order` within the index. The database planner reads them directly from the index, eliminating the `Sort` node from the query plan.
3.  **Correct Column Ordering:** In composite indexes, columns queried with equality filters (`event_id = $1` and `stage_number = $2`) must appear before columns used in sorting or range scans (`sort_order`). Because `event_id` has high cardinality and `stage_number` has lower cardinality, placing `event_id` first maximizes indexing selectivity.

---

## 3. Search Path Vulnerabilities and Configuration Solutions
In `172_split_user_emails_encrypted.sql`, the DML trigger function `handle_users_view_dml()` is defined with `SECURITY DEFINER` but lacks an explicit `SET search_path` clause. It calls `pgp_sym_encrypt()` and `pgp_sym_decrypt()` as unqualified functions.

### A. The Security & Operational Risk
1.  **Search Path Hijacking (Privilege Escalation):**
    *   A `SECURITY DEFINER` function executes with the privileges of its owner (typically a superuser or service role).
    *   If no `search_path` is explicitly pinned to the function, it inherits the search path of the session that calls it.
    *   An attacker who has access to create schemas/functions in the database (e.g. creating a schema `malicious` with a custom function `pgp_sym_encrypt(text, text)`) can set their session's search path to:
        ```sql
        SET search_path = malicious, public;
        ```
    *   When the attacker triggers the DML trigger (by inserting a row into `public.users`), the `SECURITY DEFINER` function resolves `pgp_sym_encrypt()` by checking the schemas in the search path. It finds `malicious.pgp_sym_encrypt()` first and executes it with superuser privileges. The attacker's custom function can exfiltrate the encryption key (retrieved via `public.get_encryption_key()`), plaintext passwords/emails, or modify unrelated tables.
2.  **Operational Failure:**
    *   If `pgcrypto` is installed in a schema that is not part of the active caller's search path (e.g., the `extensions` schema in Supabase), calls to unqualified `pgp_sym_encrypt()` will fail with a "function does not exist" error, blocking all inserts/updates on users.

### B. Configuration Solutions
To resolve this risk, three steps must be taken:
1.  **Apply `SET search_path` on the Function:** Pin a safe search path (e.g. `public, pg_catalog, extensions`) directly to the function definition. This forces the function to ignore the calling session's search path.
2.  **Fully Qualify Schema Function Calls:** Qualify external functions by their installation schema (e.g. `extensions.pgp_sym_encrypt` and `extensions.pgp_sym_decrypt`).
3.  **Role Search Paths:** Restrict the default search path of connections by setting it on specific roles:
    ```sql
    ALTER ROLE authenticator SET search_path TO public, extensions;
    ```

---

## 4. Concrete SQL Optimization Examples

Below are the SQL scripts to apply these optimizations to the database.

### A. Performance Indexes (Timeline & Email Decryption)
Run the following script to create the composite timeline index and the unique indexes on email split tables to resolve view scan timeouts.

```sql
-- 🚀 Optimize Campus Events Timeline Rendering
CREATE INDEX IF NOT EXISTS idx_program_points_timeline 
ON public.campus_event_program_points(event_id, stage_number, sort_order);

-- 🚀 Optimize User Email Decryption View (Prevents N+1 Sequential Scans)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_prefixes_user_id 
ON public.user_email_prefixes(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_suffixes_user_id 
ON public.user_email_suffixes(user_id);
```

### B. Security Hardening for DML View Trigger
Re-define the DML trigger function on the `users` view with an explicit `search_path` and fully qualified cryptographic calls.

```sql
-- 🛡️ Secure DML Trigger for public.users View
CREATE OR REPLACE FUNCTION public.handle_users_view_dml()
RETURNS TRIGGER AS $$
DECLARE
    email_parts TEXT[];
    email_prefix TEXT;
    email_suffix TEXT;
    r_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Insert into users_raw
        INSERT INTO public.users_raw (
            id, school_id, role, first_name, last_name, avatar_url, qr_token, instrument, 
            created_at, coach_notes, photo_url, bio, bands, projects, listening, gear, 
            musical_styles, equipment_list, last_seen, expertise, age, birth_date, 
            pending_repertoire_proposal, is_external_vocalist, show_messages_menu, 
            master_admin_username, master_admin_password, is_trial, trial_ends_at, 
            contract_ends_at, status, is_master_admin, is_app_user, is_campus_active, 
            is_groovelab_active, is_premium_user, teacher_id, ausweis_nummer, 
            teacher_qr_token, is_active, max_students, nickname, password_hash, 
            ausweis_id, personal_pin, show_sekretariat, show_campus, show_groovelab, 
            lesson_duration, planned_boards, required_equipment, sick_until, phone, 
            joker_used, is_pin_activated, groovelab_räume, campus_räume, joker_used_at, 
            sick_start, push_notifications_enabled, push_notif_schedule_changes, 
            push_notif_homework, push_notif_all_features, app_usage_mode, 
            preferred_room_ids, groovelab_instrument, student_billing_payment_method, 
            activated_at, student_billing_cash_paid, roles
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()), NEW.school_id, NEW.role, NEW.first_name, NEW.last_name, NEW.avatar_url, NEW.qr_token, NEW.instrument,
            COALESCE(NEW.created_at, NOW()), NEW.coach_notes, NEW.photo_url, NEW.bio, NEW.bands, NEW.projects, NEW.listening, NEW.gear,
            NEW.musical_styles, NEW.equipment_list, NEW.last_seen, NEW.expertise, NEW.age, NEW.birth_date,
            NEW.pending_repertoire_proposal, NEW.is_external_vocalist, NEW.show_messages_menu,
            NEW.master_admin_username, NEW.master_admin_password, NEW.is_trial, NEW.trial_ends_at,
            NEW.contract_ends_at, NEW.status, NEW.is_master_admin, NEW.is_app_user, NEW.is_campus_active,
            NEW.is_groovelab_active, NEW.is_premium_user, NEW.teacher_id, NEW.ausweis_nummer,
            NEW.teacher_qr_token, NEW.is_active, NEW.max_students, NEW.nickname, NEW.password_hash,
            NEW.ausweis_id, NEW.personal_pin, NEW.show_sekretariat, NEW.show_campus, NEW.show_groovelab,
            NEW.lesson_duration, NEW.planned_boards, NEW.required_equipment, NEW.sick_until, NEW.phone,
            NEW.joker_used, NEW.is_pin_activated, NEW.groovelab_räume, NEW.campus_räume, NEW.joker_used_at,
            NEW.sick_start, NEW.push_notifications_enabled, NEW.push_notif_schedule_changes,
            NEW.push_notif_homework, NEW.push_notif_all_features, NEW.app_usage_mode,
            NEW.preferred_room_ids, NEW.groovelab_instrument, NEW.student_billing_payment_method,
            NEW.activated_at, NEW.student_billing_cash_paid, NEW.roles
        ) RETURNING id INTO r_id;

        -- Split and encrypt email prefix (fully qualified to extensions schema)
        IF NEW.email IS NOT NULL AND NEW.email LIKE '%@%' THEN
            email_parts := string_to_array(NEW.email, '@');
            email_prefix := email_parts[1];
            email_suffix := email_parts[2];
            
            INSERT INTO public.user_email_prefixes (user_id, prefix)
            VALUES (r_id, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()));
            
            INSERT INTO public.user_email_suffixes (user_id, suffix)
            VALUES (r_id, email_suffix);
        END IF;

        SELECT * INTO NEW FROM public.users WHERE id = r_id;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Update users_raw
        UPDATE public.users_raw SET
            school_id = NEW.school_id,
            role = NEW.role,
            first_name = NEW.first_name,
            last_name = NEW.last_name,
            avatar_url = NEW.avatar_url,
            qr_token = NEW.qr_token,
            instrument = NEW.instrument,
            created_at = NEW.created_at,
            coach_notes = NEW.coach_notes,
            photo_url = NEW.photo_url,
            bio = NEW.bio,
            bands = NEW.bands,
            projects = NEW.projects,
            listening = NEW.listening,
            gear = NEW.gear,
            musical_styles = NEW.musical_styles,
            equipment_list = NEW.equipment_list,
            last_seen = NEW.last_seen,
            expertise = NEW.expertise,
            age = NEW.age,
            birth_date = NEW.birth_date,
            pending_repertoire_proposal = NEW.pending_repertoire_proposal,
            is_external_vocalist = NEW.is_external_vocalist,
            show_messages_menu = NEW.show_messages_menu,
            master_admin_username = NEW.master_admin_username,
            master_admin_password = NEW.master_admin_password,
            is_trial = NEW.is_trial,
            trial_ends_at = NEW.trial_ends_at,
            contract_ends_at = NEW.contract_ends_at,
            status = NEW.status,
            is_master_admin = NEW.is_master_admin,
            is_app_user = NEW.is_app_user,
            is_campus_active = NEW.is_campus_active,
            is_groovelab_active = NEW.is_groovelab_active,
            is_premium_user = NEW.is_premium_user,
            teacher_id = NEW.teacher_id,
            ausweis_nummer = NEW.ausweis_nummer,
            teacher_qr_token = NEW.teacher_qr_token,
            is_active = NEW.is_active,
            max_students = NEW.max_students,
            nickname = NEW.nickname,
            password_hash = NEW.password_hash,
            ausweis_id = NEW.ausweis_id,
            personal_pin = NEW.personal_pin,
            show_sekretariat = NEW.show_sekretariat,
            show_campus = NEW.show_campus,
            show_groovelab = NEW.show_groovelab,
            lesson_duration = NEW.lesson_duration,
            planned_boards = NEW.planned_boards,
            required_equipment = NEW.required_equipment,
            sick_until = NEW.sick_until,
            phone = NEW.phone,
            joker_used = NEW.joker_used,
            is_pin_activated = NEW.is_pin_activated,
            groovelab_räume = NEW.groovelab_räume,
            campus_räume = NEW.campus_räume,
            joker_used_at = NEW.joker_used_at,
            sick_start = NEW.sick_start,
            push_notifications_enabled = NEW.push_notifications_enabled,
            push_notif_schedule_changes = NEW.push_notif_schedule_changes,
            push_notif_homework = NEW.push_notif_homework,
            push_notif_all_features = NEW.push_notif_all_features,
            app_usage_mode = NEW.app_usage_mode,
            preferred_room_ids = NEW.preferred_room_ids,
            groovelab_instrument = NEW.groovelab_instrument,
            student_billing_payment_method = NEW.student_billing_payment_method,
            activated_at = NEW.activated_at,
            student_billing_cash_paid = NEW.student_billing_cash_paid,
            roles = NEW.roles
        WHERE id = OLD.id;

        -- Update encrypted email if modified
        IF NEW.email IS DISTINCT FROM OLD.email THEN
            DELETE FROM public.user_email_prefixes WHERE user_id = OLD.id;
            DELETE FROM public.user_email_suffixes WHERE user_id = OLD.id;
            
            IF NEW.email IS NOT NULL AND NEW.email LIKE '%@%' THEN
                email_parts := string_to_array(NEW.email, '@');
                email_prefix := email_parts[1];
                email_suffix := email_parts[2];
                
                INSERT INTO public.user_email_prefixes (user_id, prefix)
                VALUES (OLD.id, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()));
                
                INSERT INTO public.user_email_suffixes (user_id, suffix)
                VALUES (OLD.id, email_suffix);
            END IF;
        END IF;

        SELECT * INTO NEW FROM public.users WHERE id = OLD.id;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.users_raw WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, extensions;
```

### C. Hardening of User Onboarding Functions
Add `SET search_path` to all onboarding-related RPC functions.

```sql
-- 🛡️ Secure complete_onboarding RPC
ALTER FUNCTION public.complete_onboarding(UUID, TEXT) 
SET search_path = public, pg_catalog, extensions;

-- 🛡️ Secure import_student RPC
ALTER FUNCTION public.import_student(TEXT, TEXT, TEXT, TEXT, UUID, UUID) 
SET search_path = public, pg_catalog;

-- 🛡️ Secure verify_onboarding RPC
ALTER FUNCTION public.verify_onboarding(TEXT, TEXT, TEXT, INT) 
SET search_path = public, pg_catalog;

-- 🛡️ Secure request_magic_link RPC
ALTER FUNCTION public.request_magic_link(TEXT) 
SET search_path = public, pg_catalog;
```

### D. Secure New User Sync Trigger
The following code displays how to securely synchronize newly registered authentication users to the public application database tables.

```sql
-- 🛡️ Secure Auth User Synchronization Function
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users_raw (
        id, 
        school_id, 
        role, 
        first_name, 
        last_name, 
        qr_token, 
        is_active, 
        status
    )
    VALUES (
        NEW.id,
        COALESCE((NEW.raw_user_meta_data->>'school_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'::public.user_role),
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        gen_random_uuid(),
        TRUE,
        'active'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- 🛡️ Secure Trigger Binding on auth.users
DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;
CREATE TRIGGER trg_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();
```

---

## 5. Security Auditing for Other SECURITY DEFINER Functions
A search of the migrations reveals that several RLS helper functions optimized in `121_optimize_rls_functions.sql` also run as `SECURITY DEFINER` but are missing `SET search_path`. These should be updated to ensure the security boundary is maintained:

```sql
-- Apply SET search_path to RLS helper functions
ALTER FUNCTION public.get_kiosk_token() SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_qr_token() SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_kiosk_school_id() SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_user_school_id() SET search_path = public, pg_catalog;
```
