# BRIEFING — 2026-06-21T10:23:42+02:00

## Mission
Implement database index, RLS/security upgrades, and server-side conflict RPC in the Groovelab app.

## 🔒 My Identity
- Archetype: Database & Security Implementer
- Roles: implementer, qa, specialist
- Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_improvements
- Original parent: edccf39a-8ba0-43f4-b02d-571b7b824a04
- Milestone: RLS and Database Upgrades

## 🔒 Key Constraints
- CODE_ONLY network mode: no external HTTP/HTTPS requests or internet lookup (no curl, wget, etc., targeting external URLs).
- DO NOT CHEAT: All implementations must be genuine. No hardcoded test results.
- Write only to own folder for agent metadata (plans, progress, handoffs), but code/tests go in the main workspace.

## Current Parent
- Conversation ID: edccf39a-8ba0-43f4-b02d-571b7b824a04
- Updated: not yet

## Task Summary
- **What to build**:
  - Run SQL script `scratch/apply_improvements.ts` connecting via `.env.local` to execute SQL upgrades.
  - Upgrade authenticator role search path.
  - Create compound index `idx_program_points_timeline`.
  - Create `invite_tokens` table, RLS, and `validate_invite_token` function.
  - Replace `users_insert` RLS policy on `public.users` view to check tokens via the function.
  - Create raw user insert trigger to mark token as used.
  - Redefine `public.handle_users_view_dml()` to use `extensions.pgp_sym_encrypt`.
  - Create helper functions `public.parse_time_to_minutes(p_time TEXT)` and `public.format_minutes_to_time(p_minutes INT)`.
  - Create `public.get_schedule_conflicts(p_event_id UUID, p_transition_time INT DEFAULT 10)`.
  - Update custom fetch wrapper in `apps/groovelab/src/lib/supabase.ts` to parse `token` query param and inject `x-invite-token` header.
  - Verify with `npx tsc --noEmit`.
- **Success criteria**:
  - Script runs successfully, database schemas updated.
  - Supabase client headers are correctly injected on client signups.
  - TypeScript compiles without errors.
- **Interface contracts**: TBD
- **Code layout**: TBD

## Key Decisions Made
- Executed the SQL database upgrades via an automated script (`apps/groovelab/scratch/apply_improvements.ts`) that runs with the Supabase `service_role` key.
- Targeting `public.users_raw` instead of `public.users` view for the `users_insert` RLS policy because PostgreSQL does not support RLS policies on views.
- Implemented a temporary table timeline logic in `get_schedule_conflicts` to sequentially compute stage timings using sort orders and transition times.
- Verified all database changes with a comprehensive local integration test `apps/groovelab/scratch/verify_improvements.ts` which inserts temporary schools/users/lessons, tests token validation/trigger marking, queries schedule conflicts, and cleans up completely.

## Artifact Index
- `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_improvements/ORIGINAL_REQUEST.md` — Original request documentation.
- `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_improvements/progress.md` — HEARTBEAT / progress log.
- `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_improvements/handoff.md` — The 5-component handoff report.

## Change Tracker
- **Files modified**:
  - `apps/groovelab/src/lib/supabase.ts` — Updated fetch wrapper to parse URL for `token` and inject `x-invite-token` header.
  - `apps/groovelab/scratch/apply_improvements.ts` — Created TypeScript database migration script.
  - `apps/groovelab/scratch/verify_improvements.ts` — Created TypeScript verification script.
- **Build status**: PASS (all TypeScript builds compile successfully).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: PASS. Run `npx tsc --noEmit` compiles cleanly. Run `npx tsx apps/groovelab/scratch/verify_improvements.ts` checks database logic.
- **Lint status**: 0 outstanding violations.
- **Tests added/modified**: Created a full system verification integration test script (`verify_improvements.ts`) verifying DB RLS, views, triggers, and conflict RPCs.

## Loaded Skills
- No specific Antigravity skill paths were loaded or requested.

