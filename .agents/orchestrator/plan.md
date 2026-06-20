# Plan - Groovelab Event Coordinator Overhaul

This document outlines the step-by-step plan to complete the Groovelab Event Coordinator Overhaul project, with strict alignment to the E2E testing requirements and database triggers.

## Plan & Milestones

### Milestone 1: E2E Test Suite Setup (Dual Track) [DONE]
- Design and implement the E2E test suite in `apps/groovelab/src/tests/e2e_test_cases.ts`.
- Implement a Postgrest-compliant mock database wrapper and client fetch interceptor in `apps/groovelab/src/tests/run_e2e_tests.ts`.
- Ensure 115 tests covering Tiers 1-4.

### Milestone 2: Database Migration [DONE]
- Define and apply migration schemas (`173_event_coordinator_schema.sql`) for event coordinator features, program points, triggers, validation checks, and RLS policies.
- Ensure that the triggers enforce role-based rules (e.g. teachers submit with status='submitted', admins/secretaries can approve/reject/resort).

### Milestone 3: UI & Layout Overhaul [DONE]
- Restructure `apps/groovelab/src/components/CampusEventsBoard.tsx` grid layout and visibility controls based on user role (Admin, Secretary, Teacher, Student).
- Build the secretary event coordinator scheduler dashboard, stage manager, and announcements widget.
- Build teacher program point submission and inline feedback/GEMA response widgets.

### Milestone 3.5: 5-Tab Admin & 4-Tab Teacher UI Implementation [DONE]
- Implement the 5 sequential process steps (tabs/phases) in the Admin/Secretary Column 2 Event Planner view of `CampusEventsBoard.tsx`:
  1. **Eckdaten (Basic Info)**: event settings (stages 1-10, durations).
  2. **Rückmeldungen (Feedback Requests)**: request status queries (GEMA, tech, custom).
  3. **Programmplanung (Program Timeline)**: reorder acts, calculate timeline offsets, insert pauses.
  4. **Technikplanung (Technical Planning)**: chairs, music stands, tech requirement consolidation.
  5. **Export**: CSV/Excel exporter checkboxed column selection.
- Implement the 4 sequential process steps (tabs/phases) in the Teacher Column 3 Event Planner view:
  1. **Einreichung & Eckdaten (Submission & Info)**: submit program points and search/select registered students to associate them with the acts (notifications and calendar syncing).
  2. **Rückmeldungen & Fragen (Feedback & Questions)**: reply to admin GEMA, tech, or helper queries.
  3. **Persönliche Packliste (Personal Equipment Packlist)**: checklist of chairs, stands, and tech gear to bring.
  4. **Auftritts-Zusammenfassung (Performance Summary)**: stage, times, instructions, local contact, and downloadable/printable info sheet.
- Ensure the UI matches GrooveLab's design standards.

### Milestone 4: E2E Real Mode Verification & Fixes [DONE]
- Verified and fixed all 115 tests in both Mock and Real modes. Passed forensic audit.

### Milestone 5: Drag-and-Drop Program Board & Conflict Prevention [IN_PROGRESS]
- **Step 5.1 (DB Schema)**: Write database migration to add `instrument TEXT NULL` and `is_scheduled BOOLEAN NOT NULL DEFAULT FALSE` to `campus_event_program_points`.
- **Step 5.2 (Mock DB & SDK Mocking)**: Update mock DB layer in `run_e2e_tests.ts` to include the new fields.
- **Step 5.3 (Timeline UI)**: Replace simple vertical list with the 2-column drag-and-drop board in the `timeline` tab.
  - Left column: sequentially calculated timeline starting at event start time. Snapping sequentially ("magnetic layout").
  - Right column: unscheduled approved/submitted program points + pauses list.
  - Switch/tab selector at the top to toggle stages if `stages > 1`.
  - Items display Ensemble/Band Name, Teacher Name, and Instrument.
- **Step 5.4 (Dnd & Shift logic)**: Implement HTML5 drag-and-drop to drop items from unscheduled to timeline, or reorder, or drag back.
  - Re-ordering/editing shifts subsequent program points sequentially.
  - Pauses can be added directly to the timeline (with custom durations).
- **Step 5.5 (Conflict Prevention)**: Validate that no teacher is scheduled at the same time on different stages. Block action and highlight in red.
- **Step 5.6 (Manual Entries)**: Implement a "Beitrag hinzufügen" button and modal form (Title, Ensemble, Teacher, Instrument, Duration) that saves the program point to the database, listing it under unscheduled.
- **Step 5.7 (Persistence)**: Instantly persist updates (`stage_number`, `sort_order`, `duration`, `is_scheduled`, `instrument`, etc.) to Supabase `campus_event_program_points` table.
- **Step 5.8 (E2E Tests)**: Add comprehensive E2E tests covering Tiers 1-4 for the new drag-and-drop scheduler, conflict checking, manual entry, and persistence.
- **Step 5.9 (Auditing)**: Run forensic audit to verify code correctness, integrity, and test coverage.

### Milestone 6: Final Validation & Hardening [PENDING]
- Pass 100% of E2E tests (including new tests) in both Mock and Real modes.
- Perform white-box code coverage analysis and run Tier 5 adversarial checks.
- Complete the project handoff.

