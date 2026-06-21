# Handoff Report — Event Coordinator Overhaul Discovery & Analysis

This report summarizes findings from the codebase exploration regarding `CampusEventsBoard.tsx` conflicts, SQL user registration triggers, `pgp_sym_encrypt` search path constraints, and E2E test structures.

---

## 1. Observation

### CampusEventsBoard.tsx:
- **Location**: `apps/groovelab/src/components/CampusEventsBoard.tsx`
- **Conflict Calculation**: `getConflictsMap` (lines 674-718) calls `calculateTimelineTimes` (lines 636-672) to map scheduled points and intermissions onto timeline slots.
- **Stage & Lesson Conflict Logic**:
  - Loops through program points (`points.forEach`).
  - Ignores unscheduled points, pauses, and points without a teacher:
    ```typescript
    if ((!pp.is_scheduled && !pp.is_pause) || pp.is_pause || !pp.teacher_id) return;
    ```
  - Lesson collision check (lines 683-696):
    ```typescript
    if (lesson.teacher_id === pp.teacher_id && !lesson.status?.startsWith('cancel') && lesson.status !== 'teacher_sick') { ... }
    ```
  - Stage collision check (lines 698-715):
    ```typescript
    if (otherPp.id !== pp.id && (otherPp.is_scheduled || otherPp.is_pause) && !otherPp.is_pause && otherPp.teacher_id === pp.teacher_id && otherPp.stage_number !== pp.stage_number) { ... }
    ```
- **Room Booking Overlap Logic**: `fetchAvailableRooms` (lines 2535-2635) extracts booked room IDs from `schedules`, `campus_events`, and `room_bookings` and filters availability using:
  ```typescript
  const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
    return aStart < bEnd && aEnd > bStart;
  };
  ```

### SQL Schema and Migrations:
- **User DML view trigger**: `172_split_user_emails_encrypted.sql` creates the view trigger:
  ```sql
  CREATE TRIGGER trg_users_view_dml
  INSTEAD OF INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_users_view_dml();
  ```
- **Unqualified Cryptography usage**: `172_split_user_emails_encrypted.sql` calls `pgp_sym_encrypt` unqualified on lines 49, 124, and 219:
  ```sql
  VALUES (r_id, pgp_sym_encrypt(email_prefix, public.get_encryption_key()));
  ```
- **`campus_event_program_points` table**: Defined in `173_event_coordinator_schema.sql` (lines 34-70) with check constraints:
  ```sql
  CONSTRAINT check_pp_name CHECK (name <> ''),
  CONSTRAINT check_pp_duration CHECK (duration > 0),
  CONSTRAINT check_pp_performer_count CHECK (performer_count >= 1),
  CONSTRAINT check_pp_stage_number CHECK (stage_number >= 1),
  CONSTRAINT check_pp_sort_order CHECK (sort_order >= 0),
  CONSTRAINT check_pp_status CHECK (status IN ('submitted', 'approved', 'rejected')),
  CONSTRAINT check_pp_chairs_needed CHECK (chairs_needed >= 0),
  CONSTRAINT check_pp_music_stands_needed CHECK (music_stands_needed >= 0)
  ```
  It has a trigger `validate_campus_event_program_point_trigger` calling `public.validate_campus_event_program_point()`.

### E2E Tests:
- **Location**: `apps/groovelab/src/tests/run_e2e_tests.ts`, `apps/groovelab/src/tests/e2e_test_cases.ts`
- **Execution profiles**: Mock mode (`USE_MOCK=true`) uses an in-memory client and table structure; Real mode (`USE_MOCK=false`) queries the live Supabase server.
- **Request Interceptor**: Custom `fetch` interceptor (lines 642-702 of `run_e2e_tests.ts`) replaces human-readable test IDs with database UUIDs and injects `x-user-id` header to mimic user login.
- **Auth helper function**: `get_current_user_id()` is defined in `124_fix_campus_events_rls.sql` (lines 8-30) and reads the `x-user-id` header from `request.headers`.

---

## 2. Logic Chain

1. **Conflict Calculation**: Based on the `CampusEventsBoard.tsx` code, program point conflicts are determined entirely client-side. The function `getConflictsMap` runs on the client by matching active lessons and other stages' program points against the calculated timeline windows.
2. **Encryption Search Path Issue**: In PostgreSQL, the `pgcrypto` extension is installed in the `extensions` schema. Calling `pgp_sym_encrypt` without qualifying the schema (e.g. `extensions.pgp_sym_encrypt`) requires that the executing role's search path includes `extensions`. Because PostgREST executing roles (`authenticator`, `anon`) do not include `extensions` in their search path, DML operations (such as registering a user/updating email in the `public.users` view) fail with a missing function error (`42883`).
3. **E2E Mocking & DB Interaction**: E2E test cases write the active user's ID to `sessionStorage` under `groovelab_user_id`. The client fetch proxy intercepts HTTP calls, extracts this user ID, translates it via `idMap`, and injects it into the request headers as `x-user-id`. In the database, RLS policies and triggers call `get_current_user_id()`, which reads `x-user-id` from the HTTP headers (`request.headers::json->>'x-user-id'`), establishing a unified session architecture for testing.

---

## 3. Caveats

- We assumed that all custom HTTP headers (such as `x-user-id`) are correctly configured and allowed in the Supabase/PostgREST API server gateway configuration.
- External SMTP or email integration during onboarding in `complete_onboarding` was not investigated as it is handled by the API layer rather than the database directly.

---

## 4. Conclusion

- To prevent client-side conflicts and establish transaction-level checks, a server-side database function (RPC) or trigger should be created mirroring `getConflictsMap` checks.
- The `pgp_sym_encrypt` search path bug can be solved either by setting `ALTER ROLE authenticator SET search_path TO public, extensions;` or by explicitly modifying triggers to use the qualified `extensions.pgp_sym_encrypt` function name.
- E2E tests are fully ready to support database upgrades. To run tests in real mode, the coordinator migrations must first be successfully applied to the database.

---

## 5. Verification Method

- **Verify tests**:
  Run the mock E2E test command to confirm mock integrity:
  ```bash
  USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts
  ```
- **Inspect trigger definition**:
  Review the `public.handle_users_view_dml` trigger function in `supabase/migrations/172_split_user_emails_encrypted.sql` to verify unqualified `pgp_sym_encrypt` calls.
- **Inspect timeline mapping**:
  Review the conflict checkers in `apps/groovelab/src/components/CampusEventsBoard.tsx`.
