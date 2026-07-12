# Database Audit Report: Campus-Groovelab

This report details a complete database audit of the **Campus-Groovelab** platform database schemas, migrations, query implementations, and logs.

---

## 1. Schema Drift Audit

### Findings:
*   **The `lessons` Table Structure**:
    *   Created in migration `173_event_coordinator_schema.sql` (Line 77) to ensure compatibility for event tracking/scheduling.
    *   The schema consists of: `id`, `teacher_id`, `student_id`, `school_id`, `date`, `start_time`, `duration`, and `status`.
    *   **Crucially, the `lessons` table does not contain `coach_notes` or `homework` columns.**
*   **The Query Mismatch (`DB_EXCEPTION_42703` & `DB_EXCEPTION_PGRST204`)**:
    *   During system load/stress testing simulation (`simulate_load_realistic_15m.mjs:543`), the client attempted to retrieve homework via:
        `GET /rest/v1/lessons?student_id=eq.${userId}&select=coach_notes,homework`
    *   Since these columns do not exist on the `lessons` table, this triggered `DB_EXCEPTION_42703` (`column lessons.coach_notes does not exist`) and `DB_EXCEPTION_PGRST204` (`Could not find the 'coach_notes' column of 'lessons' in the schema cache` during updates).
*   **Where the Data Actually Lives**:
    *   `coach_notes` is defined on the `users` table (added in migration `11_coach_notes.sql`).
    *   `homework_notes` is defined on the `progress_matrix` table (added in migration `102_add_homework_notes_to_progress_matrix.sql`), stored as serialized JSON strings.
*   **Verdict**: The client-side queries in the test suite suffered from schema drift by targeting the wrong table columns. Production frontend application queries in `CampusEventsBoard.tsx` properly query the database tables without referencing non-existent columns.

---

## 2. Billing & Pricing Rules Compliance

The database schemas and front-end application code comply fully with the **Campus-Groovelab** pricing rules:

*   **100% Free Software License**: 
    *   The base software license is free of charge ("100% kostenlos").
    *   Verbiage is consistently displayed across the signup screens, landing page, and terms of service.
*   **Base module pricing**:
    *   **Campus Module**: Base price is 7,99 € / Mo.
    *   **GrooveLab Module**: Base price is 4,99 € / Mo.
    *   **Kombi-Vorteil Bundle**: Billed at 9,99 € / Mo. when both modules are active (saving 2,99 € / Mo. compared to 12,98 € / Mo.).
    *   Implemented dynamically in `BillingDashboard.tsx` (utilizing `master_billing_settings` values defaulting to 7.99 and 4.99).
*   **Service & User Fees**:
    *   Admin/Teacher fee: 0,49 € / Mo. per active profile.
    *   Student activations:
        *   **School Payer (Sammelzahler)**: Billed at 0,49 € / active student / Mo.
        *   **Direct Billing (Direktabrechnung with Parents)**: Only available for the Campus module. Students pay 0,49 € / Mo. (or 0,40 € / Mo. in partial direct billing with the school covering a 0,09 € database profile fee).
        *   **Exemptions**: Individual students can be excluded from direct billing via the `exempt_from_direct_billing` boolean flag, shifting costs back to the school.

---

## 3. Row-Level Security (RLS) Policy Enforcement

*   **Hardening against Header Spoofing**:
    *   Helper functions `get_current_user_id()` and `get_user_school_id()` (hardened in migration `211_fix_security_and_billing_gaps.sql` and `201_security_hardening.sql`) resolve the authenticated user first via `auth.uid()` before falling back to request headers. This successfully seals spoofing vectors.
*   **RLS Coverage**:
    *   RLS is explicitly enabled on all 19 auxiliary/custom tables (e.g., `student_onboarding_tokens`, `student_schedule_preferences`, `activation_days`) via migration `201_security_hardening.sql`.
    *   Policies prevent privilege escalation. For example, `users_update` checks `is_master_admin()` or verified school staff privilege `check_school_access()` combined with matching the user's ID.

---

## 4. Large Base64 Audio Data Auditing

*   **GDPR & COPPA Compliance**:
    *   Raw audio binary/Base64 strings are **not** stored inside the database text columns.
    *   **Audio Upload Pipeline**: In `MeisterwerkDocumentationModal.tsx:552`, recordings are converted to a Blob and uploaded directly to Supabase Storage (`campus-assets` bucket). Only the file metadata referencing the public URL is saved in the database text column (`homeworkNotesList`).
    *   **Safety Trigger**: All micro-recordings stop and release system resources when saving, preventing background access.

---

### Audit Status: PASS
The database schema, RLS policies, billing calculations, and audio storage mechanisms conform fully to the specified platform rules.
