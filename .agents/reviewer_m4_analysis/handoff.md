# Handoff Report - E2E Test Failures in Real Mode

This report analyzes the failures observed when running the Groovelab Overhaul E2E test suite in Real Mode (`USE_MOCK=false`) against the real Supabase database schema.

---

## 1. Observation

When executing the E2E test suite using the command:
```bash
USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts
```
The test run completed with exit code `1`, indicating failures in **10 out of 115** test cases. Below are the verbatim error outputs and failure logs for each:

*   **T1_F3_1: F3: Admin can configure event visibility to announce submission**
    *   *Error*: `Error: Failed to set visibility` (from `apps/groovelab/src/tests/e2e_test_cases.ts` line 207).
*   **T1_F4_1: F4: Teacher submits valid program point successfully**
    *   *Error*: `Error: Default status should be submitted` (from `apps/groovelab/src/tests/e2e_test_cases.ts` line 336).
*   **T1_F4_2: F4: Submitted program point defaults correct fields**
    *   *Error*: `Error: Should default to submitted` (from `apps/groovelab/src/tests/e2e_test_cases.ts` line 356).
*   **T1_F5_5: F5: Secretary can insert pause program points**
    *   *Error*: `Error: Failed to insert pause point` (from `apps/groovelab/src/tests/e2e_test_cases.ts` line 542).
*   **T2_F3_1: F3 Boundary: Announcement description is very long**
    *   *Error*: `TypeError: Cannot read properties of undefined (reading 'length')` (from `apps/groovelab/src/tests/e2e_test_cases.ts` line 1392).
*   **T2_F5_5: F5 Boundary: Duplicate sort orders are permitted and resolved by ID**
    *   *Error*: `Error: Should fetch both tie-order items` (from `apps/groovelab/src/tests/e2e_test_cases.ts` line 1633).
*   **T2_F6_2: F6 Boundary: Timeline calculates offsets when event start_time is missing**
    *   *Error*: `TypeError: Cannot read properties of undefined (reading 'duration')` (from `apps/groovelab/src/tests/e2e_test_cases.ts` line 1683).
*   **T3_7: T3: Feedback updates prompt teacher duration changes which recalculate timeline offsets**
    *   *Error*: `TypeError: Cannot read properties of undefined (reading 'duration')` (from `apps/groovelab/src/tests/e2e_test_cases.ts` line 2365).
*   **T3_10: T3: Parallel submission reviews only calculate approved points in timeline and export**
    *   *Error*: `Error: Should only export approved points` (from `apps/groovelab/src/tests/e2e_test_cases.ts` line 2437).
*   **T4_4: T4: Music festival with 3 parallel stages (Real Scenario)**
    *   *Error*: `Error: Stage 1 parallel calculation mismatch: 0, 20, 41, 63, 86, 110, 135, 161, 188, 216` (from `apps/groovelab/src/tests/e2e_test_cases.ts` line 2673).

---

## 2. Logic Chain

By correlating these observations with the codebase, database migrations, and RLS policies, we trace each failure to one of four specific root causes:

### Cause A: Return Data Structure Mismatch (Object vs. Array)
*   **Observation**: Tests `T1_F3_1`, `T1_F4_1`, `T1_F4_2`, `T1_F5_5`, and `T2_F3_1` all failed on assertions accessing properties directly on the returned `data` object (e.g. `data.status`, `data.visibility`, `data.description.length`).
*   **Reasoning**: In `run_e2e_tests.ts`, the fetch interceptor for Real Mode adds the `Prefer: return=representation` header, which instructs PostgREST to return the representation of inserted/updated rows as a JSON array (`[{...}]`). The `MockDatabase.runQuery` implementation, however, returns a single object if the payload is not an array. Thus, in Real Mode, `data` is an array, meaning `data.status` resolves to `undefined`, which fails assertions that expect it to equal a string or have a `.length` property.

### Cause B: Trigger-Enforced Role Rules vs. Permissive Mock Database
*   **Observation**: `T3_10` threw `Should only export approved points` (0 approved points found), and `T4_4` threw `Stage 1 parallel calculation mismatch: 0, 20, 41, 63, 86, 110, 135, 161, 188, 216`.
*   **Reasoning**: In both tests, the user is logged in as `teacher-1` but attempts to insert program points with `status = 'approved'`, `stage_number > 1`, and `sort_order > 0`. The database trigger function `validate_campus_event_program_point()` (defined in `173_event_coordinator_schema.sql` lines 293–296) intercepts teacher inserts and forces defaults:
    ```sql
    NEW.status := 'submitted';
    NEW.is_pause := false;
    NEW.sort_order := 0;
    NEW.stage_number := 1;
    ```
    *   In `T3_10`, this overrides `'approved'` to `'submitted'`. The select query filters by `status = 'approved'`, returning 0 points.
    *   In `T4_4`, this overrides all 10 festival points' stages to `stage_number = 1` and `sort_order = 0`. The Stage 1 offset calculation therefore operates on all 10 points instead of the expected subset of 4, producing the observed mismatch array.

### Cause C: PostgREST Bulk Insert ID Constraint Violation
*   **Observation**: `T3_7` failed with `TypeError: Cannot read properties of undefined (reading 'duration')` because the query returned an empty array.
*   **Reasoning**: In `T3_7`, the test bulk-inserts two program points: the first with an explicit `id` (`ppId`), and the second without one. In PostgREST, bulk inserts compile into a single SQL statement where missing columns are explicitly set to `NULL`. Since the `id` column has a `NOT NULL` constraint and the `validate_campus_event_program_point()` trigger does not coalesce `NEW.id := COALESCE(NEW.id, gen_random_uuid())`, PostgreSQL rejects the insert, throwing a `null value in column "id"` violation. The insert fails silently (as the test does not check error codes), and the subsequent query returns no rows.

### Cause D: Database Schema Type and Constraint Violations in Payloads
*   **Observation**: `T2_F5_5` and `T2_F6_2` failed with empty query results.
*   **Reasoning**:
    *   In `T2_F5_5`, the test inserts points with custom string IDs `'pp-tie-a'` and `'pp-tie-b'`. The database column `id` is typed as `UUID`, causing the database to reject the invalid strings and fail the insert.
    *   In `T2_F6_2`, the test inserts a `campus_event` omitting the `start_time` parameter. The migration `118_add_school_calendar_url.sql` defines `start_time TIME NOT NULL`, which throws a `not-null constraint` violation and rejects the insert.

---

## 3. Caveats

*   **Mock Mode Coverage**: The Mock Database (`MockDatabase`) does not currently enforce database constraints (like `UUID` syntax validation, `NOT NULL` constraints on `start_time`, or role-based triggers that override payloads). Consequently, tests passing in Mock Mode may give a false sense of security.
*   **Trigger Coalescing**: Trigger logic should handle PostgREST bulk-insert mechanics gracefully, which it currently does not for `id` columns.

---

## 4. Conclusion & Recommendations

The E2E test failures in Real Mode are due to structural mismatches between the Mock Database implementation and standard PostgREST array returns, coupled with strict database schema rules (UUID, NOT NULL constraints) and trigger validations overriding teacher inputs.

### Recommendations for Worker Tasks:

1.  **Test Client Wrapper or Test Case Adaptation**:
    *   Modify test assertions for single-row inserts and updates to expect an array response and read from index `0` (e.g., `data[0].status` instead of `data.status`).
    *   Alternatively, align the fetch interceptor in `run_e2e_tests.ts` to unwrap single-row objects if the query indicates a single-row expectation, though modifying the test assertions is more robust as it mirrors how client-side applications consume the Supabase SDK.
2.  **Align Session Roles in Tests**:
    *   Update `T3_10` and `T4_4` so that administrative actions (like approving points, assigning sort orders, or scheduling stages) are executed under an admin session (`sessionStorage.setItem('groovelab_user_id', 'admin-1')`) rather than a teacher session.
3.  **Enhance Trigger Resiliency for Bulk Inserts**:
    *   Add `NEW.id := COALESCE(NEW.id, gen_random_uuid());` at the start of the `validate_campus_event_program_point` trigger function to handle PostgREST's bulk-insert null padding.
4.  **Fix Invalid Test Payloads**:
    *   Update `T2_F5_5` to use valid UUIDs for all keys (e.g., using `uuid()` helper) instead of mock strings.
    *   Update `T2_F6_2` to include a default valid `start_time` (e.g., `'00:00'`) or modify the database schema to make `start_time` nullable if events can be created without it.

---

## 5. Verification Method

To independently verify the test suite execution and reproduce the findings:
1.  Run the E2E tests in Real Mode:
    ```bash
    USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts
    ```
2.  Inspect the outputs and verify that the 10 listed tests fail with the specified errors.
3.  Examine the database migrations in `supabase/migrations/173_event_coordinator_schema.sql` (specifically the trigger `validate_campus_event_program_point`) and `supabase/migrations/118_add_school_calendar_url.sql` (to see the `NOT NULL` constraint on `start_time`).
