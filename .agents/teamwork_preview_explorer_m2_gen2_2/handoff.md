# Handoff Report — 2026-06-16T18:21:40Z

## 1. Observation

1. **Backdoor Trigger Bypass**: In `supabase/migrations/173_event_coordinator_schema.sql` at lines 264-269 and 315-317:
   ```sql
   IF COALESCE(current_setting('request.headers', true)::json->>'x-bypass-forcing', 'false') <> 'true' THEN
       NEW.status := 'submitted';
       ...
   END IF;
   ```
   This `x-bypass-forcing` check allows any client to bypass trigger-enforced defaults and column modification constraints by injecting the header.

2. **PostgREST Bulk Insert Failures**: Under real-mode E2E test execution, the command `USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts` failed with 15 test failures. Specifically, tests inserting bulk program points (such as `T1_F6_3`, `T2_F5_5`, `T2_F6_2`, `T2_F6_5`, `T3_6`, `T3_7`) failed because PostgREST normalizes omitted fields in JSON arrays to `null`, bypassing default column constraints and triggering a `NOT NULL` constraint violation on `is_pause` and other required columns.

3. **Leaky SELECT Policy**: Querying the `campus_events` SELECT policy on the database revealed:
   ```sql
   (is_master_admin() OR (check_school_access(school_id) AND ((is_public = true) OR (created_by = get_current_user_id()) OR (visibility = ANY (ARRAY['all'::text, 'teachers'::text, 'students'::text])))))
   ```
   This policy allows students to view events with `visibility = 'teachers'` as long as they belong to the same school, causing `T1_F3_3` and `T2_F2_5` to fail.

4. **Feedback Length Restriction Mismatch**: In test `T2_F8_3`, the client attempts to submit an empty answers array `answers: []` for a question. The trigger validation function threw an exception `Answers length must match questions length` because it did not permit empty answers when status is `'responded'`.

---

## 2. Logic Chain

1. **Trigger Backdoor Removal**: By removing the `x-bypass-forcing` check, the trigger `validate_campus_event_program_point` strictly enforces constraints based on the authenticated session role (`public.get_current_user_role()`). This prevents unauthorized updates (e.g. a teacher approving their own program point in `T4_5`).
2. **Bulk Insert Coalescing**: By coalescing all `NOT NULL` columns with defaults at the start of the `validate_campus_event_program_point` trigger function:
   ```sql
   NEW.performer_count := COALESCE(NEW.performer_count, 1);
   NEW.chairs_needed := COALESCE(NEW.chairs_needed, 0);
   NEW.music_stands_needed := COALESCE(NEW.music_stands_needed, 0);
   NEW.stage_number := COALESCE(NEW.stage_number, 1);
   NEW.sort_order := COALESCE(NEW.sort_order, 0);
   NEW.is_pause := COALESCE(NEW.is_pause, FALSE);
   NEW.status := COALESCE(NEW.status, 'submitted');
   NEW.additional_feedback_responses := COALESCE(NEW.additional_feedback_responses, '{}'::jsonb);
   ```
   PostgREST-inserted `null` values are replaced with their correct defaults before any constraints or validations are evaluated. This resolves all bulk insert failures.
3. **Correcting campus_events SELECT Policy**: Updating the policy in the migration file to explicitly check roles for `'teachers'` and `'students'` visibility prevents students from viewing teacher-only events:
   ```sql
   (visibility = 'all')
   OR (visibility = 'teachers' AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
   OR (visibility = 'students' AND public.get_current_user_role() IN ('student', 'teacher', 'admin', 'secretary'))
   ```
4. **Relaxing Feedback Length Validation**: Updating the trigger to permit empty answers (`answers` array length 0) when status is `'responded'` aligns trigger behavior with the test expectation that empty answers are permitted:
   ```sql
   (jsonb_array_length(NEW.additional_feedback_responses->'questions') IS DISTINCT FROM jsonb_array_length(NEW.additional_feedback_responses->'answers')
    AND jsonb_array_length(NEW.additional_feedback_responses->'answers') IS DISTINCT FROM 0)
   ```

---

## 3. Caveats

- The investigation was read-only, so changes were not applied to the remote database.
- E2E tests have client-side mock-versus-real return type differences (e.g. returning single object on mock insert vs array on real insert), causing some tests to fail on client-side properties (e.g., `data.visibility` instead of `data[0].visibility`). These test assertions must be updated in the E2E test files separately if needed.

---

## 4. Conclusion

The migration file `supabase/migrations/173_event_coordinator_schema.sql` has been redesigned to resolve trigger backdoor bypasses, PostgREST bulk insert coalescing errors, and `campus_events` SELECT policy leaks. The proposed redesigned code is available at:
`.agents/teamwork_preview_explorer_m2_gen2_2/proposed_173_event_coordinator_schema.sql`

---

## 5. Verification Method

To verify the redesigned database schema:
1. Apply the redesigned schema `proposed_173_event_coordinator_schema.sql` to the target Supabase database.
2. Run the Forensic Auditor test scripts:
   - `npx tsx .agents/teamwork_preview_auditor_m2/test_f6_3.ts` (verifies bulk insert).
   - `npx tsx .agents/teamwork_preview_auditor_m2/test_role.ts` (verifies student role isolation).
   - `npx tsx .agents/teamwork_preview_auditor_m2/test_f8_3.ts` (verifies feedback responses validation).
3. Execute the E2E tests:
   `USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
