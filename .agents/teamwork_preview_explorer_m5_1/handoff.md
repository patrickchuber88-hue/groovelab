# Handoff Report: Milestone 5 - Drag-and-Drop Program Board & Conflict Prevention

This handoff report summarizes the findings and recommendations for implementing the drag-and-drop timeline scheduler, teacher conflict checks, manual entries modal, and database migrations.

---

## 1. Observation

- **Database Schema**:
  - Found `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/supabase/migrations/173_event_coordinator_schema.sql` defining `campus_event_program_points` table (lines 34–70) and RLS/triggers.
  - Trigger function `public.validate_campus_event_program_point()` (lines 235–403) enforces that teachers cannot modify status or staging columns:
    ```sql
    IF OLD.status IS DISTINCT FROM NEW.status
       OR OLD.stage_number IS DISTINCT FROM NEW.stage_number
       OR OLD.sort_order IS DISTINCT FROM NEW.sort_order
       OR OLD.is_pause IS DISTINCT FROM NEW.is_pause
       OR OLD.event_id IS DISTINCT FROM NEW.event_id
       OR OLD.school_id IS DISTINCT FROM NEW.school_id
       OR OLD.teacher_id IS DISTINCT FROM NEW.teacher_id
    THEN
        RAISE EXCEPTION 'Unauthorized column modification';
    END IF;
    ```
- **Timeline rendering & UI state**:
  - Found `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/CampusEventsBoard.tsx`.
  - Staging UI currently displays a single list layout (lines 11160–11222) with up/down swap controls for program points, rather than a multi-stage board.
- **E2E Tests**:
  - Found `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/tests/e2e_test_cases.ts` and `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/tests/run_e2e_tests.ts`.
  - Tests simulate Supabase operations by running in two modes: `USE_MOCK` (mock client in-memory) or real Supabase client (lines 567–580 of `run_e2e_tests.ts`).

---

## 2. Logic Chain

1. **Database Migration Requirement**:
   - Because we need to track if a program point is scheduled on the drag-and-drop board and what instrument is played, we must add `is_scheduled` and `instrument` to `campus_event_program_points` via a database migration.
   - Because teachers are restricted from scheduling points (scheduling is an admin/secretary action), the database trigger `validate_campus_event_program_point()` must be updated to restrict mutations to the `is_scheduled` column when the user role is `teacher` (referencing lines 335–345 of the migration file).

2. **React Scheduler Board**:
   - The UI currently has basic up/down swapping buttons. To implement drag-and-drop, we can use HTML5 Drag and Drop APIs (`draggable={true}`, `onDragStart`, `onDragOver`, `onDrop`) which are lightweight, robust, and require no extra heavy NPM packages.
   - We must represent stages as separate container drop-zones so that program points can be dragged onto distinct stage timelines.

3. **Sequential Time & Snapping**:
   - Because the program schedule snaps sequentially ("magnetic snapping"), we do not need to save start and end times to the database. Instead, start and end times can be dynamically computed in the UI based on the event's start time and sequential durations of program points.

4. **Conflict Checks**:
   - Conflicts occur when a teacher has multiple overlapping commitments on the same day. By comparing calculated minutes-from-midnight boundaries, we can detect overlaps between program points and lesson occurrences retrieved from the `lessons` table on the same date.

5. **Manual Entries**:
   - Administrators need to insert announcements, guest acts, or breaks directly. We can support this with a dialog that inserts a program point with status `'approved'` and `is_scheduled = true` directly to the database.

6. **E2E Test Verification**:
   - We must verify the schema addition, trigger locks, scheduling actions, and conflict checks. We can write Node-based E2E test cases in `e2e_test_cases.ts` to be run using `run_e2e_tests.ts` in mock mode.

---

## 3. Caveats

- **Mock database updates**: We assumed that the implementation phase will update both `run_e2e_tests.ts` (the mock database representation class `MockDatabase`) and the actual Supabase database via the migration script, so that the tests pass in both local mock mode and remote mode.
- **Drag-and-Drop libraries**: We recommend HTML5 Drag and Drop API because it does not require external libraries. If the team prefers a library like `@dnd-kit/core` or `react-beautiful-dnd`, it would require adding dependencies to the package lock.

---

## 4. Conclusion

The path forward for Milestone 5 implementation is clear:
1. Run database migrations to add `instrument` and `is_scheduled`, and protect `is_scheduled` from teacher updates.
2. Build the two-column layout in `CampusEventsBoard.tsx` (Unscheduled Pool vs. Stage Columns) using HTML5 Drag and Drop handlers.
3. Compute sequential timelines dynamically to support snapping.
4. Implement a utility function to compute overlaps with lessons/other acts for teacher conflict indicators.
5. Create a simple manual entry modal to allow direct timeline additions.
6. Write test cases that verify these rules using the node test harness.

All detail has been fully specified in `analysis.md`.

---

## 5. Verification Method

To verify the recommendations independently:
1. Inspect `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_explorer_m5_1/analysis.md` for the exact code implementations and migration SQL.
2. Run the existing tests using the workspace test runner to confirm the baseline test suite functions correctly:
   ```bash
   npm run test:e2e
   ```
   (or whichever script is configured in `package.json`).
