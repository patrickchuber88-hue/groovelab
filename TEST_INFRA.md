# Groovelab Event Coordinator Overhaul E2E Testing Infrastructure

This directory contains the testing framework and 115 end-to-end (E2E) test cases covering Tiers 1-4 of the Event Coordinator Overhaul. The infrastructure is designed to run in two modes:
1. **Mock Mode (`USE_MOCK=true`)**: Runs entirely in-memory using an custom Postgrest-compliant mock database layer, ensuring fast and isolated execution with 100% test pass rates.
2. **Real Mode (`USE_MOCK=false`)**: Integrates directly with the real Supabase backend, using `.env.local` configuration and authenticating users dynamically through standard security headers.

---

## Code Layout

- **Test Definition**: `apps/groovelab/src/tests/e2e_test_cases.ts` — Contains the 115 test cases mapping features, boundaries, cross-feature logic, and real scenarios.
- **Test Runner**: `apps/groovelab/src/tests/run_e2e_tests.ts` — Mock DB definitions, environment loader, client selector, test runner logic, and command entrypoint.
- **Environment**: `.env.local` / `apps/groovelab/.env.local` — Supabase URL and Anon Key config (used in real mode).

---

## Architecture & Mock Layer Design

### 1. Unified Client Interface
To allow the same test code to run seamlessly in both mock and real modes, we implement a chainable, Postgrest-compliant query builder for our mock client. It supports:
- `.from(table)`
- `.select(columns)`
- `.insert(data)`
- `.update(data)`
- `.delete()`
- `.eq(col, val)`
- `.single()`
- `.order(col, options)`
- Custom `then()` promise resolution.

### 2. In-Memory Database State (`MockDatabase`)
The mock database maintains simulated in-memory states of standard Postgres tables:
- `users`: Simulates roles (`student`, `teacher`, `admin`, `secretary`) and school assignments.
- `schools`: Configured schools.
- `lessons`: Target table for the Admin Restructure (R1) hiding lessons.
- `campus_events`: Main event configuration settings.
- `campus_event_program_points`: Individual submissions, intermission/pauses, and feedback states.

### 3. Business Rule Validation & Security (RLS)
The mock database actively enforces schema constraints, database triggers, check constraints, and Row-Level Security (RLS):
- **Role-Based Lesson Hiding**: Hides lesson occurrences for admins and secretaries to accommodate the restructured dashboard, while allowing teachers and students to retrieve only their own lessons.
- **Feature Constraints**: Checks that event `end_time` is after `start_time` and program point `duration > 0`, `performer_count >= 1`, `sort_order >= 0`, `stage_number >= 1`, and status is `submitted`, `approved`, or `rejected`.
- **Feedback Loop Restrictions**: Restricts teachers from modifying questions requested by the secretary, prevents requesting feedback on rejected points, and enforces matching lengths of questions and answers when submitting responses.
- **Multi-tenant isolation**: Ensures teachers cannot read or modify program points associated with other teachers' private events.

### 4. Test Isolation Strategy
Before executing each individual test case:
- The database is reset to its initial seeded state (in mock mode).
- The `sessionStorage` and `localStorage` states are completely cleared.
- The active user authentication token is simulated by updating `sessionStorage.setItem('groovelab_user_id', ...)` which is read dynamically by the custom fetch wrapper (real mode) and the mock executor (mock mode).

---

## Test Categorization (115 Test Cases)

### Tier 1: Feature Coverage (50 cases)
- **F1: Admin Dashboard Restructure (Hide Lessons for Admins)** — Tests verifying that teachers/students see lessons, but admins/secretaries see an empty list.
- **F2: Event Configuration (Setup)** — Basic CRUD setup of events by admins/secretaries.
- **F3: Program Point Announcement (Send "Programmpunkt melden")** — Creating teacher-visible announcements and verifying access visibility.
- **F4: Teacher Program Point Submission** — Submitting, updating, and deleting program points by teachers.
- **F5: Secretary Program Point Review & Organizing** — Secretary approval, rejection, staging, and inserting pauses.
- **F6: Chronological Timeline Offset Calculation** — Timeline math checks, cumulative durations, and stage splits.
- **F7: Request Additional Feedback** — Secretary requesting additional feedback questions via JSONB.
- **F8: Teacher Feedback Submission** — Teachers responding to feedback questions and status updates.
- **F9: Equipment Packlist Consolidation** — Verifying chairs/stands math and tech requirement merging.
- **F10: Custom Excel/CSV Export** — Retrieving fields, sorting, and structure verification.

### Tier 2: Boundary & Corner Cases (50 cases)
- Validates database limits, invalid inputs (negative duration, negative performers, invalid statuses, etc.), extreme text lengths, and edge security updates (e.g. teachers trying to edit approved program acts or inject questions).

### Tier 3: Cross-Feature Combinations (10 cases)
- End-to-end integration flows combining multiple features (e.g. event configuration change -> announcement update -> teacher submission -> secretary feedback query -> teacher response -> approval -> timeline offset shift -> consolidated packlist updates -> export).

### Tier 4: Real-World Scenarios (5 cases)
- Simulates realistic school events: a full school gala concert plan, last-minute schedule modifications, feedback loops, multi-stage music festival scheduling, and a security role audit.

---

## Verification & Execution Commands

Run the commands from the repository root:

### Command 1: Mock Mode (Expected 100% Pass)
```bash
USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts
```

### Command 2: Real Mode (Expected to fail queries due to missing tables/columns)
```bash
USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts
```
*(This command compiles successfully and initializes the Supabase JS client. It fails on queries because the postgres schema migrations for the coordinator overhaul are not yet applied).*
