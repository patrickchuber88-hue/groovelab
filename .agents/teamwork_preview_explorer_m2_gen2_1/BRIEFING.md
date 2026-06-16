# BRIEFING — 2026-06-16T20:32:00+02:00

## Mission
Analyze the event coordinator database migration, redesign `supabase/migrations/173_event_coordinator_schema.sql` to fix RLS select leak, PostgREST bulk insert constraint violations, and remove backdoor bypasses. [COMPLETED]

## 🔒 My Identity
- Archetype: Explorer
- Roles: Read-only investigation, report synthesis
- Working directory: `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_explorer_m2_gen2_1/`
- Original parent: 6a297b37-5ad9-4266-832e-10be9f7ff2f6
- Milestone: M2

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Redesign without using backdoor bypasses
- Correct PostgREST bulk insert defaults
- Correct the leaky campus_events SELECT policy

## Current Parent
- Conversation ID: 6a297b37-5ad9-4266-832e-10be9f7ff2f6
- Updated: 2026-06-16T20:32:00+02:00

## Investigation State
- **Explored paths**: `supabase/migrations/173_event_coordinator_schema.sql`, `supabase/migrations/128_fix_campus_events_visibility_rls.sql`, `apps/groovelab/src/tests/e2e_test_cases.ts`, `apps/groovelab/src/tests/run_e2e_tests.ts`
- **Key findings**: 
  - Found trigger backdoor check for `x-bypass-forcing` HTTP header which allows any user/client to bypass teacher constraints and modify admin columns.
  - Found that PostgREST bulk insert fails with `NOT NULL` violations because omitted values in bulk inserts are mapped to `NULL` by PostgREST and trigger check does not coalesce all `NOT NULL` defaultable fields (`is_pause`, `performer_count`, `stage_number`, `sort_order`, `status`, `additional_feedback_responses`).
  - Found leaky database SELECT policy on `campus_events` that exposes teacher-only events to students by checking `visibility` matching without checking user role.
- **Unexplored areas**: None, the core issues have been fully identified and mapped to the test suite.

## Key Decisions Made
- Redesign the migration `173_event_coordinator_schema.sql` to explicitly drop the leaky `campus_events_select` policy and define a correct one checking user roles.
- Remove all `x-bypass-forcing` references in the trigger, enforcing constraints authentically.
- Add coalescing for all 8 `NOT NULL` columns with defaults at the beginning of the trigger.
- Refine feedback response length matching to permit empty answers array responses.

## Artifact Index
- `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_explorer_m2_gen2_1/handoff.md` — structured report with observations, logic chain, caveats, conclusion, verification method and the redesigned SQL.
