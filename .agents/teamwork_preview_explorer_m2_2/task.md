# Explorer Task: M2 Database Migration Analysis - Instance 2

## Objective
Analyze the database requirements for Groovelab Event Coordinator Overhaul and design the migration file `supabase/migrations/173_event_coordinator_schema.sql`.

## Scope
- Examine `PROJECT.md` for shared data structures and table contracts.
- Examine `ORIGINAL_REQUEST.md` for functional requirements.
- Examine existing database schema and RLS policies.
- Design RLS policies and triggers for validation on `campus_event_program_points` table to prevent unauthorized modifications by teachers and students according to the E2E test cases in `apps/groovelab/src/tests/e2e_test_cases.ts`.

## Outputs
- Structured report in `handoff.md` within this directory including the recommended SQL schema, policies, triggers, and execution strategy.
