## 2026-06-19T15:02:06Z
Implement and verify Milestone 5: Drag-and-Drop Program Board & Conflict Prevention based on the plan in `.agents/orchestrator/synthesis_m5.md`.

You must execute the following steps:

1. **Database Migration**:
   - Create a migration file `supabase/migrations/174_add_instrument_and_is_scheduled_to_program_points.sql` to add `instrument TEXT NULL` and `is_scheduled BOOLEAN DEFAULT FALSE NOT NULL` to `campus_event_program_points` table.
   - Update the trigger function `validate_campus_event_program_point` in the migration file to prevent teachers from modifying the `is_scheduled` column (adding it to the checks in update validations).
   - Write a temporary typescript/javascript script (similar to other execute migration scripts in `scratch/`) to execute this SQL query on the remote Supabase database, run it, verify success, and then delete the temporary script.

2. **Mock Database Update**:
   - Update `apps/groovelab/src/tests/run_e2e_tests.ts` in-memory `MockDatabase` to support these new fields and validation logic.

3. **React Layout & Controls**:
   - In `apps/groovelab/src/components/CampusEventsBoard.tsx`, replace the timeline list in `coordinatorTab === 'timeline'` with a two-column drag-and-drop scheduler:
     - **Left Column**: Pool of unscheduled program points (where `is_scheduled === false` and `status === 'approved'`).
     - **Right Column**: Stages side-by-side or stage select switcher (if `stage_count > 1`) that shows the timeline for the active stage.
     - Use native HTML5 Drag and Drop APIs (`draggable`, `onDragStart`, `onDragOver`, `onDrop`).
     - Dragging from unscheduled pool to active stage schedules it. Dragging back to unscheduled pool unschedules it.
     - Scheduled items show Ensemble/Band Name, Teacher Name, and Instrument (if set).
     - Support adding pauses with custom durations directly to the timeline.
     - Dynamically calculate and render sequential start/end times starting at the event's start time.
     - Shifting/re-ordering or editing durations dynamically adjusts all subsequent points on that stage.
     - **Teacher Conflict Double-Booking Checks**: Compare scheduled program point calculated times on active stage with lessons (from the `lessons` table on the same day) and other scheduled program points for the same teacher on other stages. If conflict is detected, visually flag it in red and block the action.
     - **Manual Entries**: Add a "Beitrag hinzufügen" button opening a modal form to create a point (Title, Ensemble, Teacher, Instrument, Duration) with status 'approved', `is_scheduled` false, and save immediately to the database.
     - **Persistence**: Immediately persist scheduling updates to Supabase (`campus_event_program_points` table).

4. **E2E Tests**:
   - Append E2E test cases `T3_M5_1` to `T3_M5_5` to `apps/groovelab/src/tests/e2e_test_cases.ts` to assert that database operations, trigger constraints, scheduling updates, overlapping program point conflicts, and lesson conflicts behave correctly.

5. **Compilation and Testing**:
   - Ensure the TypeScript code builds cleanly: `npx tsc --noEmit -p apps/groovelab/tsconfig.json`.
   - Run mock mode E2E tests: `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`.
   - Run real mode E2E tests: `USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`.
   - Verify that all tests pass.

## 2026-06-19T15:09:22Z
System message:
Command failed with exit code 1.
Passed: 98, Failed: 23.
Failed Tests:
  - T1_F2_3, T1_F3_4, T1_F4_4, T1_F5_2, T1_F5_3, T1_F5_4, T1_F7_1, T1_F7_3, T1_F7_4, T1_F8_1, T1_F8_3, T1_F8_4, T1_F8_5, T2_F7_1, T2_F7_3, T2_F8_1, T2_F8_3, T3_1, T3_7, T4_3, T3_M5_3, T3_M5_4, T3_M5_5.

## 2026-06-19T15:28:40Z
You are assigned to remediate the Milestone 5 implementation for the Event Program Planning Board in the secretary/admin dashboard of the Groovelab app.

### Context
A previous worker delivered a facade implementation where the javascript/typescript states and handlers are present but not rendered or bound to the JSX/TSX UI of `CampusEventsBoard.tsx`.
Your task is to replace this facade with the actual implementation of the drag-and-drop planning board, conflict prevention checks, manual entries, and database persistence.

### Required Changes
1. **React UI in `apps/groovelab/src/components/CampusEventsBoard.tsx`**:
   Replace the timeline tab container (`coordinatorTab === 'timeline'`) with a modern, clean, two-column layout:
   - **Left Column: Scheduled Timeline**:
     - Starting at the event's start time (e.g. from `eventStartTime` or `start_time` or defaulting to `14:00`).
     - Program points snap sequentially (reordered magnetically).
     - Support HTML5 drag-and-drop to drop items onto this column (both to schedule an unscheduled item, and to re-order scheduled items).
     - Dropping an item onto the container should append it to the end of the timeline. Dropping an item onto a specific card should insert it before that card (triggering `handleDropOnTimeline` with target ppId).
     - Each card must display: Time range (computed via `calculateTimelineTimes`), Name/Title, and (if not a pause) Ensemble/Band Name, Teacher Name (using `getTeacherName(teacher_id)`), and Instrument.
     - Display pauses as distinct blocks (e.g. yellow background, labeled "Pause").
     - Flag conflicts (returned from `getConflictsMap`) visually (e.g., in red background/border with warning text).
     - Include an editable duration input (or blur handler) that lets the user change the duration, triggering `handleEditDuration`.
   - **Right Column: Unscheduled submissions**:
     - Lists all unscheduled program points (where `is_scheduled` is false and `is_pause` is false).
     - These cards must be draggable (`draggable`, `onDragStart` setting `ppId` on `dataTransfer`).
     - Render the pause insertion form (`handleAddPause`) at the top of this column.
     - Support dropping items back onto this column to unschedule them (calls `handleDropOnUnscheduledPool`).
   - **Top Switch/Selector**:
     - Render a stage switch/toggle selector at the top of the tab if `stageCount > 1`. Clicking a stage updates the `activeStage` state to display that stage's scheduled timeline.
   - **Manual Entry Modal**:
     - Render the "Beitrag hinzufügen" modal when `isManualEntryModalOpen` is true.
     - Modal inputs: Title/Name (`manualTitle`), Ensemble/Band Name (`manualEnsemble`), Teacher/Responsible select dropdown (`manualTeacherId` - populated from `allUsers` where role is teacher/admin/secretary), Instrument (`manualInstrument`), and Duration in minutes (`manualDuration`).
     - Submitting the form calls `handleAddManualEntry`.

2. **Conflict Prevention Logic**:
   - In `getConflictsMap`, fix the lesson status check to ignore all canceled statuses. Since some canceled statuses are spelled with a single 'l' (`'canceled_by_student'`, `'canceled_by_teacher_sick'`), use `.startsWith('cancel')` or check an array of canceled statuses, rather than only checking `!== 'cancelled'`.
   - In `handleDropOnTimeline` and `handleEditDuration`, check if *any* program point on the event has a conflict (using `Object.keys(conflicts).length > 0`), and block/alert the action if so, rather than only checking the modified point (`conflicts[ppId]`).
   - In `useEffect` at lines 630-654, call `fetchEventDayLessons(activeEventForPanel.event_date)` when an event is selected, to load the lessons for conflict checks.

3. **Verify Your Work**:
   - Compile without errors: `npx tsc --noEmit -p apps/groovelab/tsconfig.json`
   - Run tests in mock mode: `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
   - Run tests in real mode: `USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
   Ensure 123/123 tests pass in both modes.
