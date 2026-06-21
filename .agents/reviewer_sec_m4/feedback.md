# GrooveLab Security Audit Report

**Date**: 2026-06-21  
**Auditor**: Reviewer & Adversarial Critic Agent  
**Context**: Evaluation of database schema, RLS policies, and `simulation_realistic_15m.log` (114,251 requests from 6,500 simulated users across 10 schools).

---

## 1. Executive Summary

The overall security posture of the GrooveLab database is **partially hardened but contains critical vulnerabilities and architectural regressions**. 
While multi-tenant partitioning (`school_id` isolation) prevented any data leakage during the 15-minute simulation, several critical issues were identified:
1. **Critical Registration Bypass**: The user registration flow remains vulnerable to client-controlled header manipulation (`x-invite-school-id`) because the secure token-based signup migrations (`invite_tokens` table and validation triggers) have **not been merged into the main migrations**.
2. **Search Path Hijacking**: Multiple `SECURITY DEFINER` functions—including view triggers calling `pgp_sym_encrypt` and RLS validators—lack explicit `SET search_path` attributes and call functions without schema qualification, exposing the database to privilege escalation.
3. **Role Regression (Secretary)**: A regression in `is_teacher_or_admin()` introduced in migration 131 excludes the `secretary` role, effectively locking secretaries out of administrative actions.
4. **Student Write Escalation**: The RLS policy for modifying campus events allows any user (including students) to modify or delete events if they are the creator, exposing the event management flow to student-driven manipulation.
5. **Log Mislabeling**: The RLS blocks reported in the simulation summary are actually **custom PL/pgSQL database exceptions** (`P0001`) raised by validation triggers before RLS policies are evaluated.

---

## 2. Table-by-Table RLS Audit

### A. `public.users_raw` (Base table for `users` view)
* **RLS Status**: Enabled.
* **Audit Findings**:
  * **SELECT**: Secure. Partitioned by `check_school_access(school_id)`. Also allows lookup via active kiosk or QR tokens.
  * **INSERT** (`users_insert` policy): **CRITICAL VULNERABILITY**. Allows insertion if the client supplies an arbitrary HTTP header `x-invite-school-id` that matches the target `school_id`. Since the client controls request headers and they are unsigned/unverified, any user can register under any school.
  * **UPDATE**: Secure. Restricted to matching school users who are either admins/teachers or updating their own profile (`id = x-user-id`).
  * **DELETE**: Secure. Restricted to school admins/teachers.

### B. `public.lessons`
* **RLS Status**: Enabled.
* **Audit Findings**:
  * **SELECT**: Functional Gap. The policy is:
    ```sql
    USING (
      (public.get_current_user_role() = 'teacher' AND teacher_id = public.get_current_user_id())
      OR (public.get_current_user_role() = 'student' AND student_id = public.get_current_user_id())
    )
    ```
    This lacks an explicit `check_school_access(school_id)` check (relying entirely on matching user IDs). More importantly, it **locks out school admins and secretaries** from viewing lesson schedules.
  * **INSERT / UPDATE / DELETE**: Restricted to `is_master_admin()`. This prevents any school-level administrator or teacher from scheduling or canceling lessons directly on the table, indicating that write operations must go through RPCs or are functionally blocked.

### C. `public.campus_events`
* **RLS Status**: Enabled.
* **Audit Findings**:
  * **SELECT**: Secure. Partitioned by school access and respects visibility fields (`all`, `teachers`, `students`, or `private` linked to the creator).
  * **INSERT / UPDATE / DELETE** (`campus_events_modify` policy): **HIGH RISK**. The policy uses:
    ```sql
    USING (
      public.is_master_admin()
      OR (
        public.check_school_access(school_id)
        AND (public.is_teacher_or_admin() OR created_by = public.get_current_user_id())
      )
    )
    ```
    Since this policy controls ALL operations (including INSERT), any student can create an event by setting `created_by` to their own ID, and subsequently update or delete it. Writing events should be restricted to administrative roles.

### D. `public.campus_event_program_points`
* **RLS Status**: Enabled.
* **Audit Findings**:
  * **SELECT**: Secure. Partitioned by school access and role-restricted (admins/secretaries see all, teachers see non-private or owned points, students see points where their ID is present in `additional_feedback_responses->'assigned_students'`).
  * **INSERT / UPDATE / DELETE**: Secure. Restricted to school admins/secretaries or teachers owning the program points (with the deletion restricted to points with status `'submitted'`).
  * **Validation Trigger (`validate_campus_event_program_point`)**: Enforces strict business validations on insert/update. However, it executes as a `SECURITY DEFINER` function without a restricted search path (see Section 5).

---

## 3. Multi-Tenant Isolation & Leakage Assessment

During the 15-minute simulation:
* **Tenant Partitioning**: Verification confirms **0 unauthorized data leakages** occurred between the 10 simulated schools.
* **Mechanism**: School-level partitioning is primarily driven by the `public.check_school_access(school_id)` policy helper, which validates that the user's school (resolved via `x-user-id` header) matches the queried record's `school_id`.
* **Weakness**: The `lessons` table does not employ `check_school_access` and instead relies on matching `teacher_id` or `student_id` directly to the session user. While functionally secure against cross-school reads for individual teachers/students, it represents an inconsistent partitioning design.

---

## 4. Analysis of Log Violations

The simulation log recorded:
* **268 `status:400` errors** with message `[P0001] Unauthorized`
* **42 `status:400` errors** with message `[P0001] Cannot submit program point for another user's private event`

### Root Cause Analysis:
Contrary to the summary report, these are **not RLS policy blocks**. 
* **Standard RLS blocks** in PostgreSQL either silently filter rows (for SELECT) or throw a policy check violation error with SQLSTATE `44000` (for INSERT/UPDATE `WITH CHECK`).
* **SQLSTATE `P0001`** is the code for custom user-raised exceptions (`raise_exception`) thrown via `RAISE EXCEPTION` in PL/pgSQL.
* These exceptions were raised by the **`BEFORE INSERT OR UPDATE` validation trigger function `validate_campus_event_program_point`** (defined in migration 174). Since `BEFORE` triggers execute prior to RLS validation, the requests were aborted by procedural validation rules:
  1. The **268 `Unauthorized`** blocks occurred when simulated student accounts attempted to insert or update program points, which is restricted to teachers/admins/secretaries (Lines 52 and 91 of migration 174).
  2. The **42 `Cannot submit...`** blocks occurred when simulated teachers attempted to insert a program point linking to a private event that they did not create (Line 67 of migration 174).

---

## 5. User Registration Flow Vulnerability

The current codebase contains a major security flaw in user registration:
* **Vulnerable Check**: Migration 171 establishes the `users_insert` RLS policy check:
  ```sql
  OR (((current_setting('request.headers'::text, true))::json ->> 'x-invite-school-id'::text) = (school_id)::text)
  ```
  This permits any insertion where the request header `x-invite-school-id` matches the user's `school_id`. Clients can easily forge this header to register arbitrary accounts.
* **Token-Based Status**: There is **no `invite_tokens` table** or `validate_invite_token` function in the migration directory (`supabase/migrations/`).
* **Implementation Gap**: A scratch script `apps/groovelab/scratch/apply_improvements.ts` contains the DDL to create the `invite_tokens` table, create the verification function, change the RLS policy, and add an `AFTER INSERT` trigger to mark tokens as used. However, **this script was never converted into a database migration**, leaving the production schema vulnerable to registration bypass.

---

## 6. Search Path Hijacking & Function Qualification

Trigger functions executing with `SECURITY DEFINER` privileges run with the permissions of the function owner (superuser). If the search path is not locked down, a malicious user can intercept unqualified function calls.

### A. View Trigger: `public.handle_users_view_dml()`
* **Vulnerability**: Executed as `SECURITY DEFINER` (migration 172). It calls `pgp_sym_encrypt` and `gen_random_uuid` without schema qualification and **lacks a `SET search_path` attribute**.
* **Risk**: An attacker who can execute DML on the `users` view can hijack `pgp_sym_encrypt` by defining a malicious function with the same name in a schema they control, executing arbitrary code with owner privileges.
* **Status**: Unfixed in migrations. The fix in `apply_improvements.ts` (qualifying `extensions.pgp_sym_encrypt`) was never merged.

### B. Validation Trigger: `public.validate_campus_event_program_point()`
* **Vulnerability**: Executed as `SECURITY DEFINER` (migration 174). It calls `gen_random_uuid()` without schema qualification and **lacks a `SET search_path` attribute**.

### C. RLS Helpers
* **Vulnerability**: Functions `get_kiosk_school_id`, `get_user_school_id`, `is_master_admin`, `is_teacher_or_admin`, and `check_school_access` (migration 131) are defined as `SECURITY DEFINER` but **lack `SET search_path`**.

### D. Authenticator Role Search Path
* **Vulnerability**: The `authenticator` role's search path has not been restricted in migrations, leaving the entry point for PostgREST queries exposed to default path resolution.

---

## 7. Critical Role Regression (Secretary Access)

* **Migration 129**: Correctly updated the administrative helper `public.is_teacher_or_admin()` to return `true` for the `'secretary'` role.
* **Migration 131**: Redefined `public.is_teacher_or_admin()` to fix RLS recursion, but **omitted the secretary check**, reverting back to:
  ```sql
  RETURN v_role IN ('teacher', 'admin');
  ```
* **Impact**: Because RLS policies on tables like `campus_events` and general admin configurations use `public.is_teacher_or_admin()`, secretaries are now **blocked from performing administrative actions** across multiple features, even though specific program point RLS rules explicitly mention the `'secretary'` role.
