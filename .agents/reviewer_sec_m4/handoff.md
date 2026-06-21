# Handoff Report — Security Audit of GrooveLab

## 1. Observation
- File `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/supabase/migrations/171_fix_users_insert_rls_recursion.sql` lines 23-24:
  `OR (((current_setting('request.headers'::text, true))::json ->> 'x-invite-school-id'::text) = (school_id)::text)`
- File `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/supabase/migrations/172_split_user_emails_encrypted.sql` lines 49, 124, 219:
  - Calls `pgp_sym_encrypt` without a schema prefix (e.g., `extensions.pgp_sym_encrypt`).
  - Lines 73-74 & 235: Trigger function `public.handle_users_view_dml()` is defined with `SECURITY DEFINER` but has no `SET search_path` attribute.
- File `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/supabase/migrations/173_event_coordinator_schema.sql` lines 209-213:
  - Policy `lessons_select` does not include `check_school_access(school_id)` and lacks roles `'admin'` and `'secretary'`.
  - Trigger function `validate_campus_event_program_point()` (lines 235-240, 403) runs as `SECURITY DEFINER` without `SET search_path`.
- File `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/supabase/migrations/131_fix_rls_recursion.sql` lines 120:
  - `RETURN v_role IN ('teacher', 'admin');` under function `public.is_teacher_or_admin()`, which was run after migration 129 which included `'secretary'`.
- Command execution output: `grep -rn "invite_tokens" supabase/migrations/` returned no results.
- Command execution output: `grep 'status:400' "simulation_realistic_15m.log" | sed -E 's/.*Error: //g' | sort | uniq -c` returned:
  - `42 [P0001] Cannot submit program point for another user's private event`
  - `268 [P0001] Unauthorized`

## 2. Logic Chain
- Since `invite_tokens` is not mentioned in any file inside `supabase/migrations/`, the token-based signup feature was never officially integrated into the database migration files. This is supported by the fact that `users_insert` RLS policy in migration 171 still checks the header `x-invite-school-id`. Since this header is provided by the client and not cryptographically signed, a client can bypass registration restrictions and sign up as any user in any school by providing the matching header.
- Because `SECURITY DEFINER` trigger functions (`handle_users_view_dml`, `validate_campus_event_program_point`) and helper functions in migration 131 do not specify a `SET search_path` and call database functions (`pgp_sym_encrypt`, `gen_random_uuid`) without schema prefixes, they execute function lookup using the caller's search path. A caller with insert permissions could exploit this by defining a malicious function under a schema they control and setting their search path, leading to search path hijacking.
- Because `is_teacher_or_admin()` was redefined in migration 131 to check `v_role IN ('teacher', 'admin')` (reverting the change in migration 129 which added `'secretary'`), the secretary role is now blocked from any policy or logic that calls `is_teacher_or_admin()`, causing authorization issues for secretaries.
- Since the log violations are prefixed with `[P0001]`, which is the PostgreSQL SQLSTATE code for `raise_exception`, these errors represent PL/pgSQL database exceptions thrown by the trigger `validate_campus_event_program_point()` BEFORE RLS verification takes place, rather than raw RLS policy blocks (which would yield SQLSTATE `44000` for `WITH CHECK` violations).

## 3. Caveats
- This audit did not cover client-side application logic or network layer configuration (such as whether Kong strips `x-invite-school-id` headers at the API gateway). We assume that if the database allows these checks, the API gateway or backend is potentially vulnerable if it doesn't strip or override them.
- We did not apply any fixes to the codebase or database, as this is a review-only task.

## 4. Conclusion
The GrooveLab database has notable security vulnerabilities:
1. Registration bypass due to missing token migrations and reliance on client-supplied headers (`x-invite-school-id`).
2. Search path hijacking vulnerabilities due to unqualified function calls and lack of `SET search_path` in `SECURITY DEFINER` functions.
3. Access regression for the `'secretary'` role in `is_teacher_or_admin()`.
4. Student write escalation for campus events due to `campus_events_modify` RLS check on `created_by`.

## 5. Verification Method
- Execute the E2E tests in mock mode to verify system functionality:
  `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
- To verify the absence of `invite_tokens` table in migrations, run:
  `find supabase/migrations -name "*.sql" | xargs grep "invite_tokens"`
- To verify the lack of `SET search_path` on the trigger functions, inspect lines 235 of `supabase/migrations/172_split_user_emails_encrypted.sql` and line 12 of `supabase/migrations/174_add_instrument_and_is_scheduled_to_program_points.sql`.
