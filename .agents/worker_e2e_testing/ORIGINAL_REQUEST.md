## 2026-06-16T17:49:54Z

You are the E2E Test Implementation Worker.
Your working directory is: .agents/worker_e2e_testing/
Your task is to build the E2E test infrastructure and test cases (Tiers 1-4) for the Groovelab Event Coordinator Overhaul.

## Tasks:
1. Initialize your progress.md and BRIEFING.md in your working directory.
2. Create `apps/groovelab/src/tests/e2e_test_cases.ts`. This file must define 115 test cases:
   - Tier 1: Feature Coverage (50 test cases, 5 per feature for 10 features)
   - Tier 2: Boundary & Corner cases (50 test cases, 5 per feature)
   - Tier 3: Cross-Feature combinations (10 test cases)
   - Tier 4: Real-world application scenarios (5 test cases)
   Total: 115 test cases.
   The 10 features to cover are:
   - F1: Admin Dashboard Restructure (Hide Lessons for Admins)
   - F2: Event Configuration (Setup)
   - F3: Program Point Announcement (Send "Programmpunkt melden")
   - F4: Teacher Program Point Submission
   - F5: Secretary Program Point Review & Organizing
   - F6: Chronological Timeline Offset Calculation
   - F7: Request Additional Feedback
   - F8: Teacher Feedback Submission
   - F9: Equipment Packlist Consolidation
   - F10: Custom Excel/CSV Export
   Each test case should use a standard Supabase client or a mock client to verify CRUD operations, schema constraints, and business logic.
3. Create `apps/groovelab/src/tests/run_e2e_tests.ts`. This is the runner script. It must:
   - Load environment from `.env.local` if available.
   - Configure a mock/stub database layer if `process.env.USE_MOCK === 'true'`. The mock database layer should simulate the in-memory state of events and program points and implement a chainable Supabase client builder (`from`, `select`, `insert`, `update`, `delete`, `eq`, `single`, etc.) so that the 115 test cases run and pass successfully in mock mode.
   - Use the real Supabase client (with user-id headers) if `process.env.USE_MOCK !== 'true'`.
   - Run all 115 test cases, count passes/failures, and exit with code 0 if all pass, or 1 if any fail.
4. Create `TEST_INFRA.md` at the project root documenting the E2E test infrastructure.
5. Verify your work by running:
   - Command 1 (Mock mode): `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`. It should compile and 100% of the 115 tests should pass.
   - Command 2 (Real mode): `USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`. It should compile successfully, but fail on the real database queries due to missing tables/columns (since the migrations are not yet applied).
6. Provide a detailed handoff report when done.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
