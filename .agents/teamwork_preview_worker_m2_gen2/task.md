# Worker Task: M2 Database Migration Remediation

## Objective
Remediate the database migration by updating `supabase/migrations/173_event_coordinator_schema.sql`, executing it on the Supabase database, and reverting the bypass modification in `run_e2e_tests.ts`.

## Inputs
- Designed schema details in `.agents/sub_orch_implementation/synthesis_m2_gen2.md`.
- Original SQL designs in `.agents/teamwork_preview_explorer_m2_gen2_1/handoff.md`.

## Scope & Instructions
1. Overwrite `supabase/migrations/173_event_coordinator_schema.sql` with the redesigned SQL code from `synthesis_m2_gen2.md` and `handoff.md` of Explorer Gen 2.
2. Edit `apps/groovelab/src/tests/run_e2e_tests.ts` to remove the line adding the bypass header:
   `headers.set('x-bypass-forcing', 'true');` (revert it completely, ensuring no backdoor header is injected in the tests!).
3. Write a migration execution script (e.g., `scratch/run_migration_173_ssh.js` or modify the existing one) to apply this migration file via SSH.
4. Execute the migration on the remote database. Make sure that any notices or outputs are clean.
5. Run the E2E tests in Real Mode (`USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`) to verify.
   - Note: Tests should compile and run successfully.
   - Note: The security test case `T4_5` should now pass (or fail differently, but should not fail due to a trigger backdoor allowing the update) because the database trigger genuinely blocks unauthorized status changes without any bypasses!
6. Document all execution outputs, console logs, and test run outcomes in `handoff.md` in your directory.

## Integrity Warning (Verbatim)
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
