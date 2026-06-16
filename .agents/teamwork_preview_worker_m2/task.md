# Worker Task: M2 Database Migration Implementation

## Objective
Implement the database migration by creating `supabase/migrations/173_event_coordinator_schema.sql` and executing it on the Supabase database.

## Inputs
- Designed schema details in `.agents/sub_orch_implementation/synthesis_m2.md`.
- Original SQL designs in `.agents/teamwork_preview_explorer_m2_3/proposed_173_event_coordinator_schema.sql`.

## Scope & Instructions
1. Create `supabase/migrations/173_event_coordinator_schema.sql` using the design in `synthesis_m2.md`.
2. Write a migration execution script (e.g., `scratch/run_migration_173.js` or modify a helper) that reads the migration SQL file and executes it via the Supabase client RPC `exec_sql` or `execute_sql` using the URL and Anon Key from `apps/groovelab/.env.local`.
3. Run the execution script using Node/npx. Verify that the SQL executes successfully without errors.
4. Run the E2E test runner in Real Mode (`USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`) to verify that the table and columns exist on the database and queries compile and execute against the real client. Note down if the tests compile and run, and what fails (e.g. they should fail on UI/backend logic but not on missing schema).
5. Document all execution outputs, console logs, and test run outcomes in `handoff.md` in your directory.

## Integrity Warning (Verbatim)
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
