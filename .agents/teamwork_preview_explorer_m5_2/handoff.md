# Handoff Report - Milestone 5: Drag-and-Drop Program Board & Conflict Prevention

## 1. Observation
* In `apps/groovelab/src/components/CampusEventsBoard.tsx` at line 11141:
  ```tsx
  {coordinatorTab === 'timeline' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
  ```
  The timeline view currently displays a single-column static vertical list of program points with button-driven swapping (`handleSwapProgramPoints`), rather than a drag-and-drop board.
* In `supabase/migrations/173_event_coordinator_schema.sql` (lines 34-70):
  The `campus_event_program_points` table is created. It currently lacks the fields `instrument` and `is_scheduled`.
* In `supabase/migrations/173_event_coordinator_schema.sql` (lines 335-345):
  The database trigger restricts teachers from updating coordinator columns:
  ```sql
  IF OLD.status IS DISTINCT FROM NEW.status
     OR OLD.stage_number IS DISTINCT FROM NEW.stage_number
     OR OLD.sort_order IS DISTINCT FROM NEW.sort_order
     OR OLD.is_pause IS DISTINCT FROM NEW.is_pause
     -- no check for is_scheduled exists yet
  ```
* In `apps/groovelab/src/tests/run_e2e_tests.ts`, running `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts` completes successfully with:
  ```
  TEST RUN SUMMARY:
  Total tests run: 116
  Passed:          116
  Failed:          0
  Success rate:    100.0%
  ```

## 2. Logic Chain
1. To introduce staging drag-and-drop scheduling (as requested in the Milestone 5 specifications), we need to track if a program point is scheduled (`is_scheduled`) and what instrument is played (`instrument`) (Observation 2).
2. Because security rules prevent teachers from modifying coordination details (Observation 3), the database trigger must be updated to restrict modification of the `is_scheduled` status and to lock `instrument` values once a point is approved (Observation 3).
3. In React, the timeline tab (Observation 1) can be restructured into a two-column drag-and-drop board. We can use native HTML5 drag-and-drop APIs where the Left Column represents unscheduled program points (`is_scheduled = false`) and the Right Column displays stages side-by-side (1-indexed up to `stage_count`).
4. To implement the "magnetic snapping" timeline, program points on a stage must be sorted strictly by `sort_order`. Their start/end times can then be dynamically computed in memory relative to the event's `start_time` plus cumulative preceding durations.
5. Teacher conflicts/double-bookings can be resolved in React by checking each scheduled program point's computed time range against:
   * The teacher's lessons for that day in the `lessons` table.
   * Other program points scheduled for that teacher on the same day.
6. The E2E tests framework (Observation 4) must be extended to include these features under a new feature code (`F11`) to prevent regressions.

## 3. Caveats
* The E2E mock database `MockDatabase` implements custom column validation in JavaScript rather than running true SQL triggers. Therefore, updates to the database trigger must be manually synchronized in the mock class (`run_e2e_tests.ts`) to ensure the mock E2E tests behave identically to production.
* If an event does not have an explicit `start_time` defined, the timeline calculations assume a default starting hour (e.g., "12:00" or "00:00") to avoid failing with NaN.

## 4. Conclusion
Milestone 5 is fully analyzed. Implementation requires:
1. Creating migration `174_event_coordinator_drag_drop.sql` to add `instrument` and `is_scheduled` and updating the database trigger.
2. Restructuring the timeline tab in `CampusEventsBoard.tsx` into a two-column layout using HTML5 drag-and-drop.
3. Calculating sequential times in React using cumulative offsets for magnetic snapping.
4. Implementing lesson/program-point conflict checking in the React frontend.
5. Adding a manual entries modal to let coordinators insert approved scheduled acts directly.
6. Mocking and testing these features (Tier 1-3) in the E2E test suite.

Detailed recommendations and code outlines are documented in `analysis.md` in the agent's folder.

## 5. Verification Method
1. Inspect the detailed recommendations inside `analysis.md` in this directory:
   `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_explorer_m5_2/analysis.md`
2. Run the mock E2E tests command to verify baseline test suite health:
   `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
