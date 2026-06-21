# Quality Control & Database Constraint Analysis Report

This report analyzes the simulation logs (`simulation_realistic_15m.log`) and database schema constraints of the Groovelab application to evaluate system stability, identify root causes for database exceptions, and propose concrete UI/UX and server-side validation solutions.

---

## 1. Executive Summary & Metrics Analysis

During the 15-minute realistic load simulation, the application processed a total of **114,251 requests** with a **81.43% success rate** (93,040 successful requests vs. 21,211 failures).

The errors broke down into the following specific categories:

| Error Key / Exception Code | Count | Percentage of Total | Root Cause Summary |
| :--- | :--- | :--- | :--- |
| **DB_EXCEPTION_42703** | 10,370 | 9.08% | Querying non-existent columns `coach_notes` and `homework` on the `lessons` table. |
| **UNKNOWN_ERROR_504** (`PGRST003`) | 5,241 | 4.59% | Connection pool exhaustion (timeouts acquiring Postgres connections under load). |
| **UNKNOWN_ERROR_502** | 2,212 | 1.94% | Bad Gateway proxy/gateway timeouts during load spikes. |
| **DB_EXCEPTION_23514** | 1,466 | 1.28% | Check constraint violation: sending `'yes'`/`'no'` instead of `'approve'`/`'reject'` for votes. |
| **DB_EXCEPTION_23505** | 1,008 | 0.88% | Unique constraint violations on `band_song_slots` (921) and `lab_planning` (87). |
| **DB_EXCEPTION_PGRST204** | 305 | 0.27% | Schema cache mismatch: PATCH requests updating non-existent `coach_notes` on `lessons`. |
| **RLS_VIOLATION** (`[P0001] Unauthorized`) | 268 | 0.23% | Trigger-level authorization checks blocking students acting as teachers/admins in the simulation. |
| **UNKNOWN_ERROR_500** / **57014** | 283 | 0.25% | General server errors (189) and statement timeouts (94) where queries exceeded the DB timeout. |
| **DB_EXCEPTION_P0001** | 42 | 0.04% | Custom trigger check blocking teachers from adding program points to other users' private events. |

---

## 2. In-Depth Database Exception Analysis

### 2.1. `DB_EXCEPTION_42703` & `DB_EXCEPTION_PGRST204` (Undefined Column Mismatch)
* **Error Messages**:
  * `[42703] column lessons.coach_notes does not exist` (SELECT)
  * `[PGRST204] Could not find the 'coach_notes' column of 'lessons' in the schema cache` (PATCH)
* **Location in Codebase**:
  * GET query in `scratch/simulate_load_realistic_15m.mjs`:
    ```javascript
    await makeRequest(userId, schoolId, 'Student_FetchHomework', 'GET', `/rest/v1/lessons?student_id=eq.${userId}&select=coach_notes,homework`);
    ```
  * PATCH query in `scratch/simulate_load_realistic_15m.mjs`:
    ```javascript
    await makeRequest(userId, schoolId, 'Teacher_WriteNotes', 'PATCH', `/rest/v1/lessons?id=eq.${lessonId}`, {
      coach_notes: 'Highly motivated during simulation.',
      homework: 'Practice chords for next session.'
    });
    ```
* **Explanation of Mismatch**:
  * The database schema defines the `lessons` table without `coach_notes` or `homework` columns (see migration `173_event_coordinator_schema.sql` at line 77).
  * `coach_notes` actually lives on the `users` table, added via migration `11_coach_notes.sql`:
    ```sql
    ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_notes TEXT DEFAULT '...';
    ```
  * `homework` does not exist on the `lessons` table. Instead, homework feedback is managed in the `progress_matrix` table via the `homework_notes` column (added in migration `102_add_homework_notes_to_progress_matrix.sql`) or `teacher_notes` (defined in migration `54_meisterwerk_protocol.sql`).
  * **Consequence**: Every single `Student_FetchHomework` and `Teacher_WriteNotes` request failed because the client targeted the wrong table columns.

---

### 2.2. `DB_EXCEPTION_23514` (Check Constraint Violation)
* **Error Message**: `[23514] new row for relation "band_proposal_votes" violates check constraint "band_proposal_votes_vote_check"`
* **Location in Codebase**:
  * POST query in `scratch/simulate_load_realistic_15m.mjs`:
    ```javascript
    await makeRequest(userId, schoolId, 'Student_VoteOnProposal', 'POST', '/rest/v1/band_proposal_votes', {
      proposal_id: matchingProp.id,
      user_id: userId,
      vote: Math.random() > 0.3 ? 'yes' : 'no'
    });
    ```
* **Database Definition**:
  * Defined in `supabase/migrations/15_band_features.sql`:
    ```sql
    CREATE TABLE IF NOT EXISTS band_proposal_votes (
        ...
        vote TEXT CHECK (vote IN ('approve', 'reject')),
        ...
    );
    ```
* **Explanation**:
  * The simulation script submitted `'yes'` or `'no'` for the `vote` field, whereas the database CHECK constraint only permits `'approve'` or `'reject'`.

---

### 2.3. `DB_EXCEPTION_23505` (Unique Constraint Violations)
We observed two distinct unique constraint failures under load:

#### Case A: `band_song_slots_band_song_id_instrument_part_number_key`
* **Error Message**: `duplicate key value violates unique constraint "band_song_slots_band_song_id_instrument_part_number_key"`
* **Location in Codebase**:
  * POST query in `scratch/simulate_load_realistic_15m.mjs`:
    ```javascript
    await makeRequest(userId, schoolId, 'Student_JoinBandSongSlot', 'POST', '/rest/v1/band_song_slots', {
      band_song_id: bandSongId,
      user_id: userId,
      instrument: instrument,
      status: 'joined'
    });
    ```
* **Database Definition**:
  * Defined in `supabase/migrations/25_band_expansion.sql`:
    ```sql
    CREATE TABLE IF NOT EXISTS public.band_song_slots (
        ...
        instrument TEXT NOT NULL,
        part_number INTEGER DEFAULT 1,
        ...
        UNIQUE(band_song_id, instrument, part_number)
    );
    ```
* **Explanation**:
  * The database enforces that only one slot can exist per `(band_song_id, instrument, part_number)`.
  * The client request did not supply a `part_number`, causing it to default to `1`.
  * Under concurrent load, multiple users (or the same user submitting a duplicate request) attempted to join the same band song for the same instrument (e.g. `'Guitar'`). Both requests default to `part_number = 1`, resulting in a unique constraint collision.

#### Case B: `lab_planning_user_id_day_time_key`
* **Error Message**: `duplicate key value violates unique constraint "lab_planning_user_id_day_time_key"`
* **Location in Codebase**:
  * POST query in `scratch/simulate_load_realistic_15m.mjs`:
    ```javascript
    await makeRequest(userId, schoolId, 'Student_UpdateLabPlanning', 'POST', '/rest/v1/lab_planning', {
      user_id: userId,
      school_id: schoolId,
      day: 'Montag',
      time: '17:00'
    });
    ```
* **Database Definition**:
  * Defined in `supabase/migrations/24_lab_planning.sql`:
    ```sql
    CREATE TABLE IF NOT EXISTS lab_planning (
        ...
        UNIQUE(user_id, day, time)
    );
    ```
* **Explanation**:
  * The simulation hardcoded the payload `day: 'Montag', time: '17:00'`.
  * Whenever a simulated student loop selected this action more than once, it issued a plain POST (`INSERT`) for the same user, day, and time, violating the uniqueness constraint.

---

### 2.4. `DB_EXCEPTION_P0001` (Custom Trigger Exceptions)
* **Error Message**: `[P0001] Cannot submit program point for another user's private event`
* **Location in Codebase**:
  * POST query in `scratch/simulate_load_realistic_15m.mjs` (`Teacher_CreateProgramPoint`).
* **Database Definition**:
  * The custom trigger function `public.validate_campus_event_program_point()` in migration `173_event_coordinator_schema.sql` performs the following validation for teachers:
    ```sql
    IF v_role = 'teacher' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.campus_events
            WHERE id = NEW.event_id 
              AND (
                visibility IN ('teachers', 'all', 'students')
                OR (visibility = 'private' AND created_by = v_user_id)
              )
        ) THEN
            RAISE EXCEPTION 'Cannot submit program point for another user''s private event';
        END IF;
    ```
* **Explanation**:
  * In the simulation, teachers attempted to create a program point using `events[0]` from the active events array.
  * If the first event in the list had `visibility = 'private'` and was created by a different user, or if it was a mock UUID, the trigger blocked the insert to maintain access control integrity, raising Postgres exception code `P0001`.

---

### 2.5. `RLS_VIOLATION` (`[P0001] Unauthorized` in Logs)
* **Error Message**: `[P0001] Unauthorized`
* **Location in Codebase**:
  * Thrown during `Teacher_CreateProgramPoint` and `Admin_CreateProgramPoint` POST requests.
* **Explanation**:
  * The simulation script loads raw users from the database (who are all seeded as `'student'` in the DB) and dynamically assigns them client-side roles:
    ```javascript
    assignedAdmins.forEach(u => allUsers.push({ ...u, simRole: 'admin' }));
    assignedTeachers.forEach(u => allUsers.push({ ...u, simRole: 'teacher' }));
    ```
  * However, when these users make requests, they authenticate sending `x-user-id` headers containing their real IDs.
  * The database trigger helper `get_current_user_role()` fetches their actual role from the `users` table (which is still `'student'`).
  * The trigger `validate_campus_event_program_point` blocks non-teachers and non-admins from inserting program points:
    ```sql
    IF v_role IS NULL OR v_role = 'student' THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    ```
  * Therefore, simulated teachers/admins whose database-level role was still `'student'` were correctly rejected as unauthorized.

---

### 2.6. Connection Pool Bottlenecks (`PGRST003` & `502`/`504` errors)
* **Error Messages**:
  * `[PGRST003] Timed out acquiring connection from connection pool.`
  * `Bad Gateway` / `Internal Server Error`
* **Explanation**:
  * Under heavy concurrent load, the PostgREST connection pool to Postgres was completely exhausted.
  * The high number of round-trips required by multi-step operations (like check-in) combined with connection pool exhaustion led to proxy timeouts (502 / 504) and statement timeouts (57014).

---

## 3. Proposed Resolutions & Remediation Plan

To eliminate these database errors, improve user experience, and secure the system under high loads, we propose the following changes:

### 3.1. Query & Schema Alignment
1. **Lessons Table Update**:
   * If coach notes and homework need to be tracked per-lesson, add `coach_notes TEXT` and `homework TEXT` columns directly to the `lessons` table via a new migration.
   * If they are intended to remain in `users` and `progress_matrix`, update the frontend and simulation queries to retrieve this data from the correct tables using PostgREST joins or separate queries:
     * For user-specific coach notes: `/rest/v1/users?id=eq.${userId}&select=coach_notes`
     * For homework notes: `/rest/v1/progress_matrix?student_id=eq.${userId}&is_current_homework=eq.true&select=homework_notes`

### 3.2. Server-Side Session Check-in Transaction (RPC)
Instead of executing sequential queries from the client (which increases round-trips and risks race conditions), implement a single database function wrapping the check-in transaction:

```sql
CREATE OR REPLACE FUNCTION public.check_in_student(
    p_user_id UUID,
    p_station_id UUID
)
RETURNS TABLE (
    session_id UUID,
    status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Check out any existing open session for the user
    UPDATE public.sessions
    SET check_out_time = NOW()
    WHERE user_id = p_user_id AND check_out_time IS NULL;

    -- 2. Check out any existing open session at the target station (freeing the physical kiosk slot)
    UPDATE public.sessions
    SET check_out_time = NOW()
    WHERE station_id = p_station_id AND check_out_time IS NULL;

    -- 3. Insert the new session
    INSERT INTO public.sessions (user_id, station_id, check_in_time, gps_verified)
    VALUES (p_user_id, p_station_id, NOW(), TRUE)
    RETURNING id INTO session_id;

    RETURN QUERY SELECT session_id, 'checked_in'::TEXT;
END;
$$;
```
* **Benefits**: Reduces client-to-server round-trips from 3 to 1, prevents duplicate active sessions, and relieves connection pool pressure.

### 3.3. Database Constraint Safeguards & Client Logic
1. **Uniqueness Handling (UPSERT)**:
   * For `/rest/v1/lab_planning`, use PostgREST `on_conflict` parameters to perform an UPSERT rather than a simple INSERT:
     * Request headers: `Prefer: resolution=merge-duplicates` (or query param `on_conflict=user_id,day,time`).
2. **Orchestration / Slot Conflicts (`band_song_slots`)**:
   * Prevent duplicate slot booking by letting the database auto-increment or dynamically calculate the next available `part_number` using a trigger, or require the client-side UI to select from a list of open slots with explicit part numbers.
3. **Check Constraint Enforcements**:
   * Align UI state options with the DB CHECK constraints (e.g. restrict voting buttons to only dispatch `'approve'` or `'reject'`).
   * Add a validation trigger on `band_proposal_votes` to raise clear validation messages before database constraints trigger.

### 3.4. UI/UX Error Handling Proposals
1. **Optimistic UI with Graceful Fallbacks**:
   * When a student joins a song slot, display a loading indicator. If the unique constraint fails (meaning another user grabbed it first), revert the UI state and display a toast notification: *"Dieser Platz wurde gerade von einem anderen Bandmitglied belegt. Bitte wähle einen anderen Part."*
2. **Preventing Double Submissions**:
   * Disable interaction buttons immediately upon click to prevent double check-ins or multiple votes.
3. **Gateway Error Recovery (502 / 504 / Connection Timeouts)**:
   * Implement retry logic with exponential backoff on the client for safe GET queries (e.g., loading dashboard or schedules).
   * For POST/PATCH actions, use idempotent transaction tokens to ensure retries do not result in double bookings.
