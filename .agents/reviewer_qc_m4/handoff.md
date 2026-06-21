# Handoff Report — Quality Control Analysis

## 1. Observation
- Log file `simulation_realistic_15m.log` contains 114,251 requests, with 93,040 successes (81.43%) and 21,211 errors.
- `DB_EXCEPTION_42703` occurred 10,370 times during `Student_FetchHomework` due to:
  `GET Student_FetchHomework -> status:400 (19ms) | Error: [42703] column lessons.coach_notes does not exist`
- `DB_EXCEPTION_23514` occurred 1,466 times due to:
  `Error: [23514] new row for relation "band_proposal_votes" violates check constraint "band_proposal_votes_vote_check"`
- `DB_EXCEPTION_23505` occurred 1,008 times, consisting of:
  - 921 occurrences: `duplicate key value violates unique constraint "band_song_slots_band_song_id_instrument_part_number_key"`
  - 87 occurrences: `duplicate key value violates unique constraint "lab_planning_user_id_day_time_key"`
- `DB_EXCEPTION_P0001` occurred 42 times due to:
  `Error: [P0001] Cannot submit program point for another user's private event`
- `RLS_VIOLATION` (reported as `[P0001] Unauthorized` in logs) occurred 268 times on `Teacher_CreateProgramPoint` and `Admin_CreateProgramPoint`.
- The database schema for `lessons` in `supabase/migrations/173_event_coordinator_schema.sql` (lines 77–86) has:
  ```sql
  CREATE TABLE IF NOT EXISTS public.lessons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      teacher_id UUID REFERENCES public.users_raw(id) ON DELETE CASCADE,
      student_id UUID REFERENCES public.users_raw(id) ON DELETE CASCADE,
      school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      duration INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled'
  );
  ```
- The database schema for `band_proposal_votes` in `supabase/migrations/15_band_features.sql` (line 47) has:
  ```sql
  vote TEXT CHECK (vote IN ('approve', 'reject'))
  ```
- The database validation trigger in `supabase/migrations/173_event_coordinator_schema.sql` (lines 283–293) raises:
  ```sql
  RAISE EXCEPTION 'Cannot submit program point for another user''s private event';
  ```
- The simulation script `scratch/simulate_load_realistic_15m.mjs` has:
  - Line 543: `GET` query to `/rest/v1/lessons?student_id=eq.${userId}&select=coach_notes,homework`
  - Line 622: `vote: Math.random() > 0.3 ? 'yes' : 'no'`
  - Line 159–168: Promotes students to `'admin'` or `'teacher'` client-side via `simRole` without updating their database roles.

## 2. Logic Chain
- The query for `Student_FetchHomework` requests columns `coach_notes` and `homework` from table `lessons` (Obs 1). Since these columns are not on the `lessons` table (Obs 1), this mismatch triggers `DB_EXCEPTION_42703` (Obs 1).
- The `band_proposal_votes` check constraint requires `vote` to be either `'approve'` or `'reject'` (Obs 1). The simulation sends `'yes'` or `'no'` (Obs 1), violating the check constraint and triggering `DB_EXCEPTION_23514` (Obs 1).
- The `band_song_slots` unique constraint checks `(band_song_id, instrument, part_number)` (Obs 1). Since the client doesn't supply a part number, it defaults to 1. Concurrent inserts for the same instrument yield duplicates, causing `DB_EXCEPTION_23505` (Obs 1).
- The `lab_planning` unique constraint checks `(user_id, day, time)`. The simulation uses a hardcoded Montag 17:00 payload, triggering `DB_EXCEPTION_23505` on repeated runs (Obs 1).
- The validation trigger raises `Cannot submit program point for another user's private event` if a teacher attempts to create a program point for a private event they did not create (Obs 1). The simulation creates program points referencing arbitrary active events, triggering `DB_EXCEPTION_P0001` (Obs 1).
- The validation trigger raises `Unauthorized` if `v_role` is `'student'` or NULL (Obs 1). The simulation runs students as teachers/admins in client-side loops but authenticates them using their real student IDs (Obs 1), triggering trigger-level `Unauthorized` rejections (Obs 1).

## 3. Caveats
- The analysis assumes that the database schemas in the migration files correctly represent the active database during the simulation run.
- Network connection timeout errors (502 / 504 / PGRST003) were not debugged at the database engine level but are inferred as resource exhaustion.

## 4. Conclusion
The exceptions in the simulation log are caused by:
1. Client-to-database schema mismatches (missing columns `coach_notes`/`homework` on `lessons`, and invalid vote values `'yes'`/`'no'`).
2. Hardcoded values and concurrent race conditions on unique constraints.
3. Test framework role mismatches where database-level student profiles were used to simulate admin/teacher activities.
4. Transaction separation of the check-in process, leading to connection exhaustion.

Proposing RPC transactions, upserts, schema synchronization, and client-side validation is recommended to mitigate these issues.

## 5. Verification Method
1. Inspect the written QC report: `cat .agents/reviewer_qc_m4/feedback.md`
2. Run log validation helper: `python3 scratch/analyze_logs.py` to confirm the metrics match exactly.
