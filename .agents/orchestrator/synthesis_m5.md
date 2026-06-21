# Synthesis - Milestone 5: Drag-and-Drop Program Board & Conflict Prevention

This document synthesizes the recommendations from the three Explorer subagents for the implementation of the drag-and-drop planning board, conflict checks, manual entries, database persistence, and E2E testing.

## 1. Database Schema Changes
Create a new migration file `supabase/migrations/174_add_instrument_and_is_scheduled_to_program_points.sql` containing:
- Addition of `instrument TEXT NULL` column to `campus_event_program_points`.
- Addition of `is_scheduled BOOLEAN DEFAULT FALSE NOT NULL` column to `campus_event_program_points`.
- Re-creation of the `validate_campus_event_program_point` trigger function to include checks that teachers cannot modify the `is_scheduled` column.

## 2. React UI Implementation in `CampusEventsBoard.tsx`
Modify `coordinatorTab === 'timeline'` block in `apps/groovelab/src/components/CampusEventsBoard.tsx`:
- **Layout**: Two-column layout using a flexible CSS-grid or flexbox.
  - **Left Column**: Unscheduled Pool. Shows approved/submitted program points where `is_scheduled` is false, and allows dragging them.
  - **Right Column**: Stage Timeline. Displays a header with tab/switch controls to toggle between stages if `stage_count > 1`. Displays the list of scheduled program points for the active stage.
- **Sequential Timeline & Snapping**:
  - Dynamically calculate and display the start and end times of each program point on a stage starting from the event's `start_time` (fallback to "12:00" or "00:00" if undefined).
  - Shift all subsequent points sequentially on drag-and-drop staging, re-ordering, or duration updates.
- **Drag-and-Drop**:
  - Implement HTML5 Drag and Drop handlers: `draggable`, `onDragStart`, `onDragOver`, `onDrop`.
  - Dropping an item from the unscheduled pool to the stage timeline schedules it (`is_scheduled = true`, `stage_number = activeStage`, `sort_order = end_of_list`).
  - Dropping an item from the stage timeline back to the unscheduled pool unschedules it (`is_scheduled = false`).
  - Re-ordering is supported by dropping an item on top of another scheduled item in the stage timeline, triggering a recalculation of `sort_order` sequence.
- **Visuals**:
  - Scheduled acts in the timeline must show: Ensemble/Band Name, Teacher Name, and Instrument.
  - Display pauses as distinct visually styled blocks.
- **Conflict Checking**:
  - Retrieve lessons scheduled on the event date from the `lessons` table.
  - Compare computed time blocks of scheduled program points with:
    - Other scheduled program points for the same teacher on different stages.
    - Private lessons of the same teacher on the same day.
  - If a teacher overlap occurs, visually flag it (e.g. in red) and prevent the drop/action that causes it.
- **Manual Entries**:
  - Provide a "Beitrag hinzufügen" button in the timeline tab.
  - Open a modal form allowing the admin to enter: Title/Name, Ensemble/Band Name, Teacher, Instrument, and Duration.
  - On submit, insert the new program point with `status = 'approved'`, `is_scheduled = false`, and save immediately to the database.

## 3. Mock Database & E2E Verification
Update `apps/groovelab/src/tests/run_e2e_tests.ts`:
- Update `ProgramPoint` interface to include `instrument` and `is_scheduled`.
- Update `MockDatabase` insert and update query handling to support these columns and mock the validation trigger checking (throwing error if a teacher attempts to update `is_scheduled`).

Update `apps/groovelab/src/tests/e2e_test_cases.ts`:
- Add 5 E2E test cases (`T3_M5_1` to `T3_M5_5`) to verify columns, trigger checks, admin scheduling, overlapping program points, and lesson overlap conflicts.
