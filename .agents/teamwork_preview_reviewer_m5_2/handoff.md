# Handoff Report: Milestone 5 Review - Drag-and-Drop Program Board & Conflict Prevention

## 1. Observation

### File Analysis
* **File 1**: `apps/groovelab/src/components/CampusEventsBoard.tsx`
  * Drag-and-drop drop handlers `handleDropOnTimeline` (line 361) and `handleDropOnUnscheduledPool` (line 336) are defined.
  * Manual entries state variable `isManualEntryModalOpen` (line 219) and form state variables `manualTitle` (line 220), `manualEnsemble` (line 221), `manualTeacherId` (line 222), `manualInstrument` (line 223), `manualDuration` (line 224) are defined.
  * However, a search of the file shows that none of these handlers or state variables are used or rendered within the JSX return block of the component.
* **File 2**: `supabase/migrations/174_add_instrument_and_is_scheduled_to_program_points.sql`
  * Adds `instrument TEXT NULL` and `is_scheduled BOOLEAN DEFAULT FALSE NOT NULL` columns.
  * Recreates the trigger function `validate_campus_event_program_point()`, but does not recreate the trigger itself.
* **File 3**: `apps/groovelab/src/tests/e2e_test_cases.ts` and `apps/groovelab/src/tests/run_e2e_tests.ts`
  * Defines and runs 121 E2E tests.

### Build and Test Commands Run
* **TypeScript Compilation**: `npx tsc --noEmit -p apps/groovelab/tsconfig.json`
  * **Result**: Passed successfully.
* **Mock Mode E2E**: `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
  * **Result**: 121 / 121 tests passed (100% success rate).
* **Real Mode E2E**: `USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
  * **Result**: 103 / 123 tests passed (83.7% success rate). 20 tests failed (Note: all Milestone 5 specific tests passed; failures are in other milestones due to user view RLS/recursion).
  * Verbatim failure log snippets:
    * `[FAIL] [Tier 1] T1_F7_3: F7: Secretary can cancel a feedback request`
      `Error: Cannot read properties of undefined (reading 'additional_feedback_responses')`
    * `[FAIL] [Tier 1] T1_F8_1: F8: Teacher submits answers to feedback questions successfully`
      `Error: Cannot read properties of undefined (reading 'additional_feedback_responses')`
    * `[FAIL] [Tier 2] T2_F6_2: F6 Boundary: Timeline calculates offsets when event start_time is missing`
      `Error: Cannot read properties of undefined (reading 'duration')`

---

## 2. Logic Chain

1. **Facade/Dummy Implementation**:
   * We observed that `handleDropOnTimeline`, `handleDropOnUnscheduledPool`, and `isManualEntryModalOpen` are defined in the code of `CampusEventsBoard.tsx` but are completely absent from the TSX rendering block.
   * This is a facade implementation because it makes it appear that drag-and-drop and manual entry are implemented, but they are not actually rendered or usable in the application.
2. **Real Mode E2E Failures due to RLS & Schema issues**:
   * The E2E tests in real mode fail on multiple features (e.g., status changes, stage numbers, conflict checks).
   * We observed that `public.users` view is created with `security_invoker = true` (in migration 172). Consequently, when helper functions like `get_current_user_role()` (which does not have `SET row_security = off`) query `public.users`, they invoke the RLS check under the active user's session.
   * This results in access failures or empty data returned, leading to database operations affecting 0 rows and E2E tests failing because they expect the rows to be modified.
3. **Logic Gaps in Conflict Prevention**:
   * In `getConflictsMap()`, the lesson status check is `lesson.status !== 'cancelled'`. Since other canceled statuses like `'canceled_by_student'` and `'canceled_by_teacher_sick'` contain a single 'l', they are not matched, causing canceled lessons to be incorrectly flagged as conflicts.
   * In `handleDropOnTimeline` and `handleEditDuration`, conflict checks are only evaluated for the modified program point (`ppId`): `if (conflicts[ppId])`. However, changing duration or order shifts all subsequent sequential points on that stage, which can cause other points to clash with lessons. These shifted conflicts are ignored.

---

## 3. Caveats

* We assumed the hosted Supabase environment at `https://supabase.campus-groovelab.de` is the intended target for real-mode E2E tests.
* We did not attempt to modify the codebase to fix these errors, as our role is strictly review-only.

---

## 4. Conclusion & Verdict

**Verdict**: **REQUEST_CHANGES** (Critical Finding: **INTEGRITY VIOLATION**)

* The implementation contains a dummy/facade implementation of the drag-and-drop timeline board and manual entries modal, which are declared in state/handlers but never rendered in the UI.
* 20 E2E test cases fail when running in real database mode due to view RLS configurations and schema mismatches.
* The conflict check logic has major logic gaps, failing to exclude all canceled lesson statuses and failing to check conflicts on shifted sequential timeline points.

---

## 5. Verification Method

* Run the TypeScript compiler: `npx tsc --noEmit -p apps/groovelab/tsconfig.json`
* Run E2E tests in mock mode: `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
* Run E2E tests in real database mode: `USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
* Open `apps/groovelab/src/components/CampusEventsBoard.tsx` and inspect the JSX return statement to verify that `handleDropOnTimeline`, `handleDropOnUnscheduledPool`, and `isManualEntryModalOpen` are not referenced.

---

# Detailed Quality & Adversarial Review Report

## Quality Review Report

### Findings

#### [Critical] Finding 1: INTEGRITY VIOLATION (Facade Implementation)
* **What**: The drag-and-drop board and manual entry modal are facade/dummy implementations.
* **Where**: `apps/groovelab/src/components/CampusEventsBoard.tsx`
* **Why**: The React handlers `handleDropOnTimeline` and `handleDropOnUnscheduledPool` and state `isManualEntryModalOpen` are defined, but never rendered in the JSX.
* **Suggestion**: Fully integrate the visual drag-and-drop zones and the manual entry modal into the TSX layout.

#### [Major] Finding 2: Real Database E2E Failures (83.7% success rate)
* **What**: 20 E2E test cases fail in real mode.
* **Where**: Database schema, RLS policies, and test runner interceptor.
* **Why**: The view `public.users` is defined with `security_invoker = true`. Functions like `get_current_user_role()` query this view without `SET row_security = off`, causing RLS to fail to evaluate correctly for non-admin users. This prevents updates and selects on `campus_event_program_points` table in real mode.
* **Suggestion**: Ensure all RLS helper functions are robust, bypass RLS where appropriate (`row_security = off`), and fix RLS policies for views.

#### [Major] Finding 3: Incomplete Conflict Checks for Sequential Shifts
* **What**: Sequential time shifts do not trigger conflict alerts for other affected points.
* **Where**: `CampusEventsBoard.tsx` (`handleDropOnTimeline` and `handleEditDuration`).
* **Why**: The handlers only check `conflicts[ppId]` (the modified point). Changing the duration or order of a point shifts all subsequent points on the stage, which can push them into lesson times. These conflicts are ignored.
* **Suggestion**: Check if `Object.keys(conflicts).length > 0` and block/alert if any point has a conflict.

#### [Minor] Finding 4: Canceled Lesson Status Typos
* **What**: Canceled lessons are not ignored in conflict checks.
* **Where**: `CampusEventsBoard.tsx` (`getConflictsMap`).
* **Why**: The check `lesson.status !== 'cancelled'` uses two 'l's, but other canceled statuses use one 'l' (`'canceled_by_student'`, `'canceled_by_teacher_sick'`), so they are processed as active.
* **Suggestion**: Exclude all canceled statuses using `.startsWith('cancel')` or checking an array of canceled statuses.

---

## Adversarial Challenge Report

### Challenges

#### [Critical] Challenge 1: Silent Staging Time Conflicts
* **Assumption challenged**: Modifying a program point only affects conflicts on that point.
* **Attack scenario**: A coordinator moves a 30-minute act to the start of the timeline. This shifts subsequent acts B and C by 30 minutes. Act B now overlaps with a teacher's scheduled lesson.
* **Blast radius**: The coordinator is not alerted because `conflicts[ppId]` is null (the moved act has no conflict). Act B is silently scheduled during the teacher's lesson, causing a double-booking.
* **Mitigation**: Update UI drop/edit handlers to check conflicts across all scheduled points on the timeline.

#### [High] Challenge 2: Canceled Lesson Conflicts
* **Assumption challenged**: Lesson status is checked correctly.
* **Attack scenario**: A lesson status is set to `'canceled_by_student'`. The conflict logic expects `'cancelled'`.
* **Blast radius**: The lesson is treated as active, and any program point overlapping with its original slot is blocked, even though the teacher is free.
* **Mitigation**: Standardize or loosely match lesson status in `getConflictsMap`.
