# Auditor Task: M2 Database Migration Verification (Gen 2 Audit)

## Objective
Verify the integrity of the applied database migration file `supabase/migrations/173_event_coordinator_schema.sql` and ensure there are no integrity violations (such as trigger backdoors or hardcoding).

## Scope
- Verify that `supabase/migrations/173_event_coordinator_schema.sql` does NOT contain any trigger backdoors or `x-bypass-forcing` checks.
- Verify that `apps/groovelab/src/tests/run_e2e_tests.ts` does NOT contain the bypass header injection line.
- Verify that PostgREST bulk insert works by using trigger coalescing.
- Check that RLS policies are correct and secure.

## Outputs
- Structured report in `handoff.md` with a clean or failed verdict.
