# Codebase Discovery & Analysis Report — Event Coordinator Overhaul

This report documents the detailed codebase discovery and analysis of `CampusEventsBoard.tsx` conflicts, user registration database triggers, `pgp_sym_encrypt` usage, the structure of the `campus_event_program_points` table, and the design of the end-to-end (E2E) testing suite.

---

## 1. CampusEventsBoard.tsx Analysis

### File Path
`apps/groovelab/src/components/CampusEventsBoard.tsx`

### Conflict Calculation (`getConflictsMap`)
The conflict checking in `CampusEventsBoard.tsx` is performed in `getConflictsMap` (defined around line 674) to detect overlaps between scheduled program points and the teacher's lessons or other program points on different stages.

```typescript
const getConflictsMap = (points: any[], lessonsList: any[], activeEventStartTime: string) => {
  const timeMap = calculateTimelineTimes(points, activeEventStartTime);
  const conflicts: Record<string, string> = {};

  points.forEach(pp => {
    if ((!pp.is_scheduled && !pp.is_pause) || pp.is_pause || !pp.teacher_id) return;
    const ppTime = timeMap[pp.id];
    if (!ppTime) return;

    for (const lesson of lessonsList) {
      if (
        lesson.teacher_id === pp.teacher_id && 
        !lesson.status?.startsWith('cancel') && 
        lesson.status !== 'teacher_sick'
      ) {
        const lessonStart = parseTimeToMinutes(lesson.start_time);
        const lessonEnd = lessonStart + (lesson.duration || 0);
        if (ppTime.startMin < lessonEnd && ppTime.endMin > lessonStart) {
          conflicts[pp.id] = `Kollision mit Unterricht (${lesson.start_time} - ${formatMinutesToTime(lessonEnd)})`;
          return;
        }
      }
    }

    for (const otherPp of points) {
      if (
        otherPp.id !== pp.id &&
        (otherPp.is_scheduled || otherPp.is_pause) &&
        !otherPp.is_pause &&
        otherPp.teacher_id === pp.teacher_id &&
        otherPp.stage_number !== pp.stage_number
      ) {
        const otherTime = timeMap[otherPp.id];
        if (otherTime) {
          if (ppTime.startMin < otherTime.endMin && ppTime.endMin > otherTime.startMin) {
            conflicts[pp.id] = `Kollision mit Beitrag auf Bühne ${otherPp.stage_number} (${otherTime.start} - ${otherTime.end})`;
            return;
          }
        }
      }
    }
  });

  return conflicts;
};
```

#### Key Logic of `getConflictsMap`:
1. **Pre-requisite Time Mapping**: It calls `calculateTimelineTimes(points, activeEventStartTime)` to map each scheduled point to a timeline slot:
   - Parses the event's start time into minutes from midnight (defaults to `14:00` / 840 minutes).
   - Groups program points on each stage and sorts them chronologically by `sort_order`.
   - Iterates through the sorted list, adding each point's duration.
   - For consecutive non-pause program points, it injects a transition buffer/transition time (`transitionTime` state, default 10 minutes) before placing the next point.
2. **Ignored Cases**: It explicitly ignores:
   - Unscheduled program points (`!pp.is_scheduled`).
   - Intermission/pauses (`pp.is_pause`).
   - Program points without a teacher assigned (`!pp.teacher_id`).
3. **Lesson Collision Validation**:
   - Loops over the lessons list for the day (`lessonsList`).
   - Finds lessons taught by the same teacher (`lesson.teacher_id === pp.teacher_id`) that are active (ignores `cancel*` or `teacher_sick` statuses).
   - Flags an overlap if: `program_point_start < lesson_end` AND `program_point_end > lesson_start`.
4. **Stage Collision Validation**:
   - Loops over all other program points in the event.
   - Finds scheduled, non-pause points of the same teacher (`otherPp.teacher_id === pp.teacher_id`) that are assigned to a *different* stage (`otherPp.stage_number !== pp.stage_number`).
   - Flags an overlap if the time windows cross.

### Room Availability Overlaps (`fetchAvailableRooms`)
To verify room booking availability during custom event creation, `fetchAvailableRooms` (defined around line 2535) calculates room overlaps:

```typescript
const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
  return aStart < bEnd && aEnd > bStart;
};
```
It queries three database resources to compile a set of blocked room IDs:
1. **`schedules`**: Recurring lessons at the school on the same day of the week (`day_of_week`).
2. **`campus_events`**: Other scheduled events on the same calendar date.
3. **`room_bookings`**: Dedicated room bookings on the same calendar date.

It filters out any school rooms that overlap with the new event's start and end times, leaving only the truly available rooms in the selection list.

---

## 2. SQL Schema and Migrations Analysis

### User Registration Trigger & Encryption Path Issue
User registration and modifications are managed via the `public.users` view and its associated INSTEAD OF trigger `trg_users_view_dml` defined in `supabase/migrations/172_split_user_emails_encrypted.sql`.

#### The view definition:
```sql
CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS
SELECT 
    ur.*,
    (
        SELECT pgp_sym_decrypt(uep.prefix, public.get_encryption_key()) || '@' || ues.suffix
        FROM public.user_email_prefixes uep
        JOIN public.user_email_suffixes ues ON uep.user_id = ues.user_id
        WHERE uep.user_id = ur.id
        LIMIT 1
    ) AS email
FROM public.users_raw ur;
```

#### The trigger function `public.handle_users_view_dml()`:
It intercepts DML statements on `public.users`. In `INSERT` and `UPDATE` blocks, it handles email parsing, splitting, and encryption:
```sql
        -- E-Mail-Adresse splitten und verschlüsselt speichern (falls vorhanden)
        IF NEW.email IS NOT NULL AND NEW.email LIKE '%@%' THEN
            email_parts := string_to_array(NEW.email, '@');
            email_prefix := email_parts[1];
            email_suffix := email_parts[2];
            
            INSERT INTO public.user_email_prefixes (user_id, prefix)
            VALUES (r_id, pgp_sym_encrypt(email_prefix, public.get_encryption_key()));
            
            INSERT INTO public.user_email_suffixes (user_id, suffix)
            VALUES (r_id, email_suffix);
        END IF;
```

#### The `pgp_sym_encrypt` Search Path Bug:
In `172_split_user_emails_encrypted.sql`, calls to `pgp_sym_encrypt` (e.g. lines 49, 124, and 219) are **unqualified**. 
- The `pgcrypto` extension is installed in the `extensions` schema.
- PostgREST executes queries under the database roles `authenticator` or `anon` which do not have the `extensions` schema in their default `search_path`.
- When an insert or update containing an email is sent to `public.users`, PostgreSQL attempts to resolve `pgp_sym_encrypt` in the active search path (usually `public`), failing with:
  `function pgp_sym_encrypt(text, text) does not exist` (PostgreSQL Error Code `42883`).
- **Mitigation Options**:
  1. Qualify all calls in the migrations/triggers as `extensions.pgp_sym_encrypt` (like was done in `154_student_emails_header_auth.sql`), OR
  2. Alter the `authenticator` role's search path configuration:
     ```sql
     ALTER ROLE authenticator SET search_path TO public, extensions;
     ```

### campus_event_program_points Structure
Defined in `supabase/migrations/173_event_coordinator_schema.sql` (line 34) and amended by `174_add_instrument_and_is_scheduled_to_program_points.sql`.

#### Schema Definition:
| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Unique ID |
| `event_id` | `UUID` | `NOT NULL`, `REFERENCES public.campus_events ON DELETE CASCADE` | Link to parent event |
| `school_id` | `UUID` | `NOT NULL`, `REFERENCES public.schools ON DELETE CASCADE` | Tenant identification |
| `teacher_id` | `UUID` | `REFERENCES public.users_raw ON DELETE SET NULL` | Submitting teacher |
| `name` | `TEXT` | `NOT NULL`, `CHECK (name <> '')` | Performance act or segment name |
| `ensemble_band` | `TEXT` | `NULL` | Optional band/ensemble |
| `performer_count` | `INTEGER` | `DEFAULT 1 NOT NULL`, `CHECK (performer_count >= 1)` | Number of participants |
| `duration` | `INTEGER` | `NOT NULL`, `CHECK (duration > 0)` | Duration in minutes |
| `preferred_time` | `TEXT` | `NULL` | Desired performance time |
| `title` | `TEXT` | `NULL` | Song title |
| `artist` | `TEXT` | `NULL` | Artist name |
| `composer` | `TEXT` | `NULL` | Composer name |
| `arranger` | `TEXT` | `NULL` | Arranger name |
| `publisher` | `TEXT` | `NULL` | Publisher details |
| `tech_requirements` | `TEXT` | `NULL` | Detailed technical setup needs |
| `chairs_needed` | `INTEGER` | `DEFAULT 0 NOT NULL`, `CHECK (chairs_needed >= 0)` | Equipment load count |
| `music_stands_needed`| `INTEGER` | `DEFAULT 0 NOT NULL`, `CHECK (music_stands_needed >= 0)`| Equipment load count |
| `remarks` | `TEXT` | `NULL` | Custom remarks |
| `stage_number` | `INTEGER` | `DEFAULT 1 NOT NULL`, `CHECK (stage_number >= 1)` | Timeline stage assignment |
| `sort_order` | `INTEGER` | `DEFAULT 0 NOT NULL`, `CHECK (sort_order >= 0)` | Ordering position on timeline |
| `is_pause` | `BOOLEAN` | `DEFAULT FALSE NOT NULL` | Flags a pause slot (intermission) |
| `status` | `TEXT` | `DEFAULT 'submitted' NOT NULL`, `CHECK (status IN ('submitted', 'approved', 'rejected'))` | Validation workflow |
| `additional_feedback_responses` | `JSONB` | `DEFAULT '{}'::jsonb NOT NULL` | Schema-less secretary query / response storage |
| `instrument` | `TEXT` | `NULL` | Main instrument (added in migration 174) |
| `is_scheduled` | `BOOLEAN` | `DEFAULT FALSE NOT NULL` | Timeline visibility control (added in migration 174) |
| `created_at` | `TIMESTAMP WITH TZ` | `DEFAULT NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMP WITH TZ` | `DEFAULT NOW()` | Record last update timestamp |

#### Business Logic Trigger:
A row validation trigger `validate_campus_event_program_point_trigger` executes the function `public.validate_campus_event_program_point()` before `INSERT` or `UPDATE` on the table to enforce coordinator rules:
- **Insert**:
  - Restricts students/guests from adding program points.
  - Teachers can only submit to visible events (or their own private events), must own the program point (sets `teacher_id := current_user`), and are forced to default values: `status = 'submitted'`, `is_pause = false`, `sort_order = 0`, `stage_number = 1`.
- **Update**:
  - Teachers can only edit points they own.
  - Rejected status locks editing completely.
  - Approved status locks modification of the `name` column.
  - Teachers cannot modify admin-only columns (`status`, `stage_number`, `sort_order`, `is_pause`, `event_id`, `school_id`, `teacher_id`, `is_scheduled`).
  - Enforces JSONB validation rules for questions/answers size and status transitions.

---

## 3. E2E Tests Architecture Analysis

### Framework Layout
- **Test cases**: `apps/groovelab/src/tests/e2e_test_cases.ts` (115 cases spanning Tiers 1-4).
- **Execution engine**: `apps/groovelab/src/tests/run_e2e_tests.ts`.
- **Configuration documentation**: `TEST_INFRA.md`.

### Execution Modes
E2E testing supports two execution profiles determined by `process.env.USE_MOCK`:

#### 1. Mock Mode (`USE_MOCK=true`)
Runs completely in-memory utilizing a custom Postgrest-compliant mock database client (`MockSupabaseClient` and `MockDatabase` classes).
- **Mock database tables**: Simulates `users`, `schools`, `lessons`, `campus_events`, and `campus_event_program_points`.
- **RLS replication**: Implements JavaScript filters inside the mock database query resolver to replicate role-based row visibility rules (e.g. hiding lessons from admins, filtering private events).
- **Constraint replication**: Throws DB-like errors on constraints (e.g., negative duration, invalid status).

#### 2. Real Mode (`USE_MOCK=false`)
Communicates directly with a live Supabase server. 
- **Request Proxying**: Wraps the Supabase Client's `fetch` function (lines 642-702 of `run_e2e_tests.ts`) to transparently intercept queries.
- **ID Translation (`idMap`)**: E2E test cases use human-readable mockup IDs (e.g., `teacher-1`, `event-1`). The fetch interceptor:
  - Maps human-readable request URLs and body payloads into real database UUIDs (e.g. `teacher-1` -> `22222222-2222-2222-2222-222222222221`) before sending the request.
  - Translates the server response JSON back, replacing real UUIDs with mock IDs so test assertions evaluate correctly.
- **Auth Simulation (`x-user-id` header)**: The proxy interceptor reads the logged-in user from the test's `sessionStorage.getItem('groovelab_user_id')` and injects it as an HTTP header `x-user-id`.
- **Prefer Header**: Forces PostgREST to return the modified record (`Prefer: return=representation`) to ensure test assertions have access to the returned payload.

### Test Isolation
- **Storage isolation**: `sessionStorage` and `localStorage` are cleared before each test case.
- **Database isolation**:
  - In mock mode, `mockDb.reset()` restores initial seeds.
  - In real mode, the runner cleans up by deleting all events belonging to `school-1` / Groove Academy UUID, then re-seeding the default event (`event-1`).
