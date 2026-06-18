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

### Milestone 3.5: 5-Tab Admin & 4-Tab Teacher UI Implementation [PENDING]
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

### Milestone 4: E2E Real Mode Verification & Fixes [IN_PROGRESS]
- **Step 4.1**: Dispatch an Explorer agent to run E2E tests in both Mock and Real modes and analyze any remaining failures.
- **Step 4.2**: Verify that the database schema changes and trigger optimizations have been correctly applied.
- **Step 4.3**: Dispatch a Worker agent to fix the identified test failures:
  - Expect array response from fetch instead of single object in Real Mode.
  - Correct trigger to prevent PostgREST bulk-insert null padding ID failures.
  - Adjust session role switching in tests (run admin actions under admin role).
  - Use valid UUIDs in boundary/edge case tests.
- **Step 4.4**: Dispatch Reviewer and Challenger agents to verify the fixes.
- **Step 4.5**: Dispatch the Forensic Auditor to perform integrity checks.

### Milestone 5: Final Validation & Hardening [PENDING]
- Pass 100% of E2E tests (Tiers 1-4) in both Mock and Real modes.
- Perform white-box code coverage analysis and run Tier 5 adversarial checks.
- Complete the project handoff.
