# Handoff Report: M2 Database Migration Analysis

## 1. Observation
- **Task Directive**: `task.md` line 4:
  > "Analyze the database requirements for Groovelab Event Coordinator Overhaul and design the migration file `supabase/migrations/173_event_coordinator_schema.sql`."
- **Event Config Requirements**: `ORIGINAL_REQUEST.md` lines 17-18:
  > "R2. Event-Konfiguration & Programm-Zusammenstellung
  > - Ermögliche das Konfigurieren eines Events (z.B. Musikschulfest) mit: Anzahl der Bühnen, Gesamtdauer der Veranstaltung und Dauer des Konzertprogramms."
- **Program Point Fields**: `PROJECT.md` lines 29-53 specifies the interface contract for the `campus_event_program_points` table, defining columns such as `id`, `event_id`, `school_id`, `teacher_id`, `name`, `ensemble_band`, `performer_count`, `duration`, `preferred_time`, `title`, `artist`, `composer`, `arranger`, `publisher`, `tech_requirements`, `chairs_needed`, `music_stands_needed`, `remarks`, `stage_number`, `sort_order`, `is_pause`, `status` (CHECK in 'submitted', 'approved', 'rejected'), and `additional_feedback_responses` (JSONB).
- **Existing Helper Functions**: Found in migrations:
  - `public.get_current_user_id()` returns `UUID` (reads `x-user-id` from header) - defined in `124_fix_campus_events_rls.sql:8`
  - `public.get_current_user_role()` returns `public.user_role` - defined in `127_campus_events_color_and_visibility.sql:9`
  - `public.check_school_access(school_id)` returns `boolean` - defined in `131_fix_rls_recursion.sql:126`
  - `public.is_teacher_or_admin()` returns `boolean` - defined in `129_fix_is_teacher_or_admin_for_secretary.sql:4`
  - `public.is_master_admin()` returns `boolean` - defined in `131_fix_rls_recursion.sql:60`
- **Validation Constraints from E2E Tests**:
  - `apps/groovelab/src/tests/e2e_test_cases.ts` Line 1522: tests negative performer count check (`performer_count: -2`).
  - `e2e_test_cases.ts` Line 1530: tests that teacher cannot edit after status changes to `approved`.
  - `e2e_test_cases.ts` Line 1557: status check constraint enforces `submitted`, `approved`, `rejected` (blocks `pending_review`).
  - `e2e_test_cases.ts` Line 1580: blocks negative stage numbers.
  - `e2e_test_cases.ts` Line 1594: blocks negative sort orders.
  - `e2e_test_cases.ts` Line 1777: blocks requesting feedback on rejected program points.
  - `e2e_test_cases.ts` Line 1823: blocks teachers from adding or changing questions in `additional_feedback_responses`.
  - `e2e_test_cases.ts` Line 1845: blocks requesting feedback with empty questions array (`[]`).
  - `e2e_test_cases.ts` Line 1889: blocks teacher from submitting answers to a feedback request that has been cleared/deleted.
  - `e2e_test_cases.ts` Line 1937: prevents teachers from modifying other teachers' submissions.
  - `e2e_test_cases.ts` Line 1964: enforces that feedback answers must match the length of questions exactly when status is `responded`.
  - `e2e_test_cases.ts` Line 800: checks that students cannot query or see `additional_feedback_responses`.

## 2. Logic Chain
1. **Event Config Alterations**:
   - `campus_events` already exists in the database. To configure an event with multiple stages, total duration, and program duration (as required by `ORIGINAL_REQUEST.md`), we must alter `campus_events` to add `stage_count` (int, default 1), `total_duration` (int), and `program_duration` (int).
   - Check constraints must ensure `stage_count >= 1`, `total_duration >= 0`, and `program_duration >= 0`.
2. **Table Design**:
   - `campus_event_program_points` does not exist in the database and must be created.
   - Standard columns must match `PROJECT.md` exactly, including default values (`performer_count = 1`, `chairs_needed = 0`, `music_stands_needed = 0`, `stage_number = 1`, `sort_order = 0`, `is_pause = FALSE`, `status = 'submitted'`, and `additional_feedback_responses = '{}'::jsonb`).
3. **Role-Based RLS Policies**:
   - **SELECT**: To protect feedback requests from students (`T1_F7_5`), we restrict row visibility of `campus_event_program_points` to users whose role is in `('teacher', 'admin', 'secretary')`. Students will select an empty array, satisfying the test.
   - **INSERT**: Admins, secretaries, and teachers may insert points for their school. Teachers are restricted to inserting rows where `teacher_id = public.get_current_user_id()`.
   - **UPDATE**: Admins, secretaries, and teachers can update. State and owner checks are delegated to the trigger.
   - **DELETE**: Admins and secretaries can delete anything. Teachers can only delete their own points if the status is NOT `'approved'`.
4. **Trigger Validations**:
   - Trigger function `validate_program_point()` runs `BEFORE INSERT OR UPDATE FOR EACH ROW`.
   - Bypasses validation if user is master admin or if called outside context (e.g. system seeding where `x-user-id` header is absent).
   - Enforces teacher update locks on `'approved'` points and restricts teachers to editing their own points.
   - Validates JSONB feedback structure: prevents teachers from altering questions; blocks responding if questions are empty or cleared; validates matching answers length only when status transitions to `'responded'`.
   - Prevents admins/secretaries from requesting feedback on rejected points or using an empty questions array.

## 3. Caveats
- Column-level SELECT security in PostgreSQL cannot differentiate custom app roles mapping to the same `authenticated` role. Therefore, blocking SELECT entirely for student users on the `campus_event_program_points` table was chosen. If students later need to view approved acts (without feedback metadata), a secure database view (`CREATE VIEW public.campus_event_acts AS SELECT id, event_id, name, ensemble_band, performer_count, duration, stage_number, sort_order, is_pause FROM public.campus_event_program_points WHERE status = 'approved'`) should be created.
- The `stage_count`, `total_duration`, and `program_duration` columns are added to the existing `campus_events` table as nullable or with defaults to avoid migration errors with pre-existing rows.

## 4. Conclusion
The database migration schema for M2 has been completely analyzed, designed, and documented. The proposed migration script `proposed_173_event_coordinator_schema.sql` contains:
- `ALTER TABLE public.campus_events` to add event configuration fields.
- `CREATE TABLE public.campus_event_program_points` mapping the full structure.
- Check constraints enforcing E2E validation rules.
- Column indexes for performance optimization.
- Secure RLS policies based on `request.headers` session context.
- A comprehensive `validate_program_point()` trigger function validating JSONB structures and business rules for teachers/secretaries.

The SQL migration file has been drafted as:
`/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_explorer_m2_1/proposed_173_event_coordinator_schema.sql`

## 5. Verification Method
1. **Inspection**:
   - Review `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_explorer_m2_1/proposed_173_event_coordinator_schema.sql` for correct Postgres syntax, trigger function logic, and policy structures.
2. **Execution (in subsequent milestones)**:
   - Apply the migration script on the Supabase/PostgreSQL instance:
     `psql -d <db_url> -f supabase/migrations/173_event_coordinator_schema.sql`
   - Run the E2E test runner script to verify that the constraints, triggers, and RLS policies behave exactly as expected:
     `npm run test:e2e` (or the project's test command).
   - Invalidation conditions: E2E tests failing on program point validations, incorrect roles having write access to program points, or JSONB feedback queries failing due to syntax errors.
