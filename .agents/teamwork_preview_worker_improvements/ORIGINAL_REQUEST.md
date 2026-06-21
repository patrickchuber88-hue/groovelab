## 2026-06-21T08:23:42Z

You are the Database & Security Implementer. We need to implement database index, RLS/security upgrades, and server-side conflict RPC in the Groovelab app.
Your working directory is: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_improvements

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please execute these tasks:
1. Write and run a TypeScript script `scratch/apply_improvements.ts` that connects to the database using the credentials from `apps/groovelab/.env.local` and executes the following SQL statements:
   - `ALTER ROLE authenticator SET search_path TO public, extensions;`
   - Create compound index `idx_program_points_timeline` on `public.campus_event_program_points(event_id, stage_number, sort_order)`.
   - Create `public.invite_tokens` table with fields `id` (uuid, default gen_random_uuid(), primary key), `token` (text, not null, unique), `school_id` (uuid, not null, references public.schools(id) on delete cascade), `is_used` (boolean, not null, default false), `created_at` (timestamp with time zone, default now(), not null), `expired_at` (timestamp with time zone).
   - Enable RLS on `invite_tokens` and add policies:
     - `invite_tokens_master` for master admin (`USING (public.is_master_admin())`)
     - `invite_tokens_school_admin` for school admin/teacher (`USING (public.get_user_school_id() = school_id AND public.is_teacher_or_admin())`)
   - Create `public.validate_invite_token(p_token TEXT, p_school_id UUID)` function returning boolean with `SECURITY DEFINER` privilege.
   - Replace `users_insert` RLS policy on `public.users` view to check for a valid invite token in `invite_tokens` using `validate_invite_token` when not inserted by master admin, school admin, or first user.
   - Create an `AFTER INSERT ON public.users_raw` trigger function and trigger `trg_users_insert_after` to mark the used token as `is_used = TRUE` in `invite_tokens`.
   - Redefine `public.handle_users_view_dml()` function to use fully-qualified function name `extensions.pgp_sym_encrypt` instead of unqualified `pgp_sym_encrypt`.
   - Create helper functions `public.parse_time_to_minutes(p_time TEXT)` and `public.format_minutes_to_time(p_minutes INT)`.
   - Create `public.get_schedule_conflicts(p_event_id UUID, p_transition_time INT DEFAULT 10)` function returning a table of conflicts (`program_point_id UUID, conflict_type TEXT, conflict_message TEXT`).
2. Implement client-side support for invite tokens in user signup:
   - Update `apps/groovelab/src/lib/supabase.ts` custom fetch wrapper to check for a `token` query param in the URL (alongside `invite_school_id`) and inject it as header `x-invite-token`.
3. Ensure everything compiles by running `npx tsc --noEmit` in `apps/groovelab/`.
4. Write a handoff report in `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_improvements/handoff.md` and report completion back to the Orchestrator.
