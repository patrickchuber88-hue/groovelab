# Scope: E2E Test Suite for Groovelab Event Coordinator Overhaul

## Architecture
- Custom TypeScript E2E test runner: `apps/groovelab/src/tests/run_e2e_tests.ts`
- Runs under Node using `npx tsx` or similar.
- Uses `@supabase/supabase-js` to perform direct DB operations representing user actions (with appropriate `x-user-id` headers / auth logic matching the application's client-side SDK usage).
- Test cases located in `apps/groovelab/src/tests/` (e.g., `e2e_test_cases.ts` or separated files).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Test Infra & Runner | Custom TypeScript runner + `TEST_INFRA.md` | None | IN_PROGRESS |
| 2 | Tier 1 Tests | 50 feature coverage tests (5 per feature for 10 features) | M1 | IN_PROGRESS |
| 3 | Tier 2 Tests | 50 boundary & corner case tests (5 per feature) | M2 | IN_PROGRESS |
| 4 | Tier 3 & 4 Tests | 10 cross-feature + 5 real-world scenario tests | M3 | IN_PROGRESS |
| 5 | Validation & Publish | Verify compiler status, run tests (ensuring failure on unimplemented features), write `TEST_READY.md` | M4 | PLANNED |

## Feature Inventory (10 Features)
1. **F1: Admin Dashboard Restructure (Hide Lessons for Admins)** - hide lessons, move campus events.
2. **F2: Event Configuration** - create event with stages, total duration, program duration.
3. **F3: Program Point Announcement** - send "Programmpunkt melden" message to teachers.
4. **F4: Teacher Program Point Submission** - submit program point details.
5. **F5: Program Point Review & Organizing** - edit/list submissions, assign stages, reorder, insert pauses.
6. **F6: Chronological Timeline Calculation** - compute sequential start times.
7. **F7: Additional Feedback Request** - request specific custom feedback from teachers.
8. **F8: Additional Feedback Submission** - teacher responds to feedback.
9. **F9: Consolidated Packlist Generation** - count stands, chairs, tech items by stage or overall.
10. **F10: Custom Excel/CSV Export** - export matching selected columns.

## Interface Contracts
- The tests interact with the Supabase client-side SDK.
- The tests must mock or use real Supabase client calls.
- The DB operations should verify data model schema for `campus_events` and `campus_event_program_points`.
