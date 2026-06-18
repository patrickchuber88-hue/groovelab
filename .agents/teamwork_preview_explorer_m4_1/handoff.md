# Handoff Report: Real Mode E2E Test Failures Investigation

## Observation

1. **Mock Mode Test Run Results**
   - Command run: `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
   - Outcome: All 115 tests passed.
     ```
     TEST RUN SUMMARY:
     Total tests run: 115
     Passed:          115
     Failed:          0
     Success rate:    100.0%
     ```

2. **Real Mode Test Run Results**
   - Command run: `USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
   - Outcome: 95 passed, 20 failed.
     ```
     TEST RUN SUMMARY:
     Total tests run: 115
     Passed:          95
     Failed:          20
     ```

3. **Failed Test Cases & Error Outputs in Real Mode**
   - **T1_F2_3**: `F2: Admin can update configured event properties`
     - *Error*: `Error: Cannot read properties of undefined (reading 'title')`
   - **T1_F3_4**: `F3: Update announcement visibility to public`
     - *Error*: `Error: Cannot read properties of undefined (reading 'visibility')`
   - **T1_F4_4**: `F4: Teacher can update their program point before review`
     - *Error*: `Error: Cannot read properties of undefined (reading 'name')`
   - **T1_F5_2**: `F5: Secretary can approve a program point`
     - *Error*: `Error: Cannot read properties of undefined (reading 'status')`
   - **T1_F5_3**: `F5: Secretary can reject a program point`
     - *Error*: `Error: Cannot read properties of undefined (reading 'status')`
   - **T1_F5_4**: `F5: Secretary can assign stage number and sort order`
     - *Error*: `Error: Cannot read properties of undefined (reading 'stage_number')`
   - **T1_F7_1**: `F7: Secretary can request feedback on program point`
     - *Error*: `Error: Cannot read properties of undefined (reading 'additional_feedback_responses')`
   - **T1_F7_3**: `F7: Secretary can cancel a feedback request`
     - *Error*: `Error: Cannot read properties of undefined (reading 'additional_feedback_responses')`
   - **T1_F7_4**: `F7: Requesting feedback preserves other program point attributes`
     - *Error*: `Error: Cannot read properties of undefined (reading 'name')`
   - **T1_F8_1**: `F8: Teacher submits answers to feedback questions successfully`
     - *Error*: `Error: Cannot read properties of undefined (reading 'additional_feedback_responses')`
   - **T1_F8_3**: `F8: Teacher can overwrite their answers before finalization`
     - *Error*: `Error: Cannot read properties of undefined (reading 'additional_feedback_responses')`
   - **T1_F8_4**: `F8: Teacher response status updates to "responded"`
     - *Error*: `Error: Cannot read properties of undefined (reading 'additional_feedback_responses')`
   - **T1_F8_5**: `F8: Teacher can clear answers to start over`
     - *Error*: `Error: Cannot read properties of undefined (reading 'additional_feedback_responses')`
   - **T2_F7_1**: `F7 Boundary: Secretary requests feedback with extremely long questions list`
     - *Error*: `Error: Cannot read properties of undefined (reading 'additional_feedback_responses')`
   - **T2_F7_3**: `F7 Boundary: Requesting feedback updates status but merges existing data`
     - *Error*: `Error: Cannot read properties of undefined (reading 'additional_feedback_responses')`
   - **T2_F8_1**: `F8 Boundary: Teacher submits feedback responses with HTML characters (XSS check)`
     - *Error*: `Error: Cannot read properties of undefined (reading 'additional_feedback_responses')`
   - **T2_F8_3**: `F8 Boundary: Teacher submits empty answers array`
     - *Error*: `Error: Cannot read properties of undefined (reading 'additional_feedback_responses')`
   - **T3_1**: `T3: Event setup, announcement, submission, feedback loop, and approval pipeline`
     - *Error*: `Error: Cannot read properties of undefined (reading 'status')`
   - **T3_7**: `T3: Feedback updates prompt teacher duration changes which recalculate timeline offsets`
     - *Error*: `Error: Recalculated offset failed, got 15`
   - **T4_3**: `T4: Feedback loop with teachers and subsequent approval (Real Scenario)`
     - *Error*: `Error: Cannot read properties of undefined (reading 'status')`

4. **Leftover Changes from worker_e2e_real_fix**
   - Command run: `git status`
   - Output: No modified source files.
     ```
     On branch main
     Your branch is up to date with 'origin/main'.
     no changes added to commit (use "git add" and/or "git commit -a")
     ```
   - Inspection of `.agents/worker_e2e_real_fix/` shows only task management files, with no code patches, migrations, or script changes.

5. **Database Trigger Constraints (`supabase/migrations/173_event_coordinator_schema.sql`)**
   - Lines 295–299 in the trigger function `validate_campus_event_program_point`:
     ```sql
     -- Force correct defaults for teacher submissions (no x-bypass-forcing backdoor check!)
     NEW.status := 'submitted';
     NEW.is_pause := false;
     NEW.sort_order := 0;
     NEW.stage_number := 1;
     ```

---

## Logic Chain

1. **Type A Failures (19 failures reading undefined fields on `data[0]`)**
   - **Observation**: 19 out of 20 failures occurred immediately after an `.update(...)` or `.insert(...)` command on the Supabase client when trying to read properties on `data[0]`.
   - **Reasoning**:
     - In `@supabase/supabase-js` v2, calling `.insert(...)` or `.update(...)` returns `{ data: null }` by default. To return the inserted/updated rows in the promise payload, `.select()` must be explicitly chained.
     - While `run_e2e_tests.ts` intercepts network calls and forces the PostgREST server to return the representation (`Prefer: return=representation`), the `@supabase/postgrest-js` client library still ignores the response body if `.select()` is not chained in the JavaScript query builder.
     - In mock mode, the mock database implementation in `run_e2e_tests.ts` bypasses the network layer entirely and returns the modified objects directly under `{ data }` regardless of whether `.select()` is chained.
     - In real mode, this results in `data` being `null`, and referencing `data[0]` throws a `TypeError`.

2. **Type B Failure (T3_7: Recalculated offset failed, got 15)**
   - **Observation**: `T3_7` failed with `Recalculated offset failed, got 15`.
   - **Reasoning**:
     - In `T3_7` (defined in `apps/groovelab/src/tests/e2e_test_cases.ts`), `sessionStorage.setItem('groovelab_user_id', 'teacher-1')` is called prior to inserting the program points.
     - This causes the database trigger `validate_campus_event_program_point` to execute under the `teacher` role.
     - The trigger enforces teacher defaults by setting `sort_order := 0` and `status := 'submitted'` for both program points (overwriting `sort_order: 1` and `sort_order: 2` specified in the test).
     - When the test performs a `select().order('sort_order', { ascending: true })`, both rows have `sort_order = 0`. The database returns them in a non-deterministic order, yielding Act B (duration 15) first instead of Act A (whose duration was updated to 20).
     - In mock mode, the mock database doesn't emulate the trigger's role-based defaults, preserving the custom sort orders `1` and `2`, and thus avoiding the sorting issue.

---

## Caveats

No caveats.

---

## Conclusion

1. The previous worker (`worker_e2e_real_fix`) did not leave any modifications or diffs in the repository.
2. The 19 Type A failures are caused by `@supabase/supabase-js` v2 client-side behavior where `data` is `null` on mutations unless `.select()` is chained.
3. The 1 Type B failure (`T3_7`) is caused by the test inserting program points as a teacher, triggering database defaults that overwrite custom sort orders and status values.

### Actionable Recommendations

- **Fix for Type A Failures**:
  Rather than modifying dozens of lines in `e2e_test_cases.ts` to add `.select()`, apply a Proxy wrapper in `run_e2e_tests.ts` inside the real client initialization block. This wrapper can intercept `insert`, `update`, and `delete` builder calls and automatically chain `.select()` onto them.
  *Proposed modification inside the `USE_MOCK=false` client creation in `apps/groovelab/src/tests/run_e2e_tests.ts`*:
  ```typescript
  const rawClient = createClient(supabaseUrl, supabaseAnonKey, { ... });
  client = new Proxy(rawClient, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (relation: string) => {
          const builder = target.from(relation);
          
          const originalInsert = builder.insert;
          builder.insert = function(...args: any[]) {
            return originalInsert.apply(this, args).select();
          };
          
          const originalUpdate = builder.update;
          builder.update = function(...args: any[]) {
            return originalUpdate.apply(this, args).select();
          };
          
          const originalDelete = builder.delete;
          builder.delete = function(...args: any[]) {
            return originalDelete.apply(this, args).select();
          };
          
          return builder;
        };
      }
      return Reflect.get(target, prop, receiver);
    }
  });
  ```

- **Fix for Type B Failure (`T3_7`)**:
  Modify `T3_7` in `apps/groovelab/src/tests/e2e_test_cases.ts` to perform the initial setup (inserting event and program points) as `admin-1` or `secretary-1`. Then, switch to `teacher-1` to perform the duration update.
  *Proposed change in `apps/groovelab/src/tests/e2e_test_cases.ts` (lines 2349-2358)*:
  ```typescript
  // Before
  sessionStorage.setItem('groovelab_user_id', 'teacher-1');
  const ppId = uuid();
  const eventId = uuid();
  await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Feedback Timeline Concert', event_date: '2026-07-23', start_time: '18:00', category: 'Konzert' });
  await client.from('campus_event_program_points').insert([
    { id: ppId, event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 10, sort_order: 1, status: 'approved' },
    { event_id: eventId, school_id: 'school-1', name: 'Act B', duration: 15, sort_order: 2, status: 'approved' }
  ]);
  
  sessionStorage.setItem('groovelab_user_id', 'teacher-1');

  // After
  sessionStorage.setItem('groovelab_user_id', 'admin-1'); // Perform inserts as Admin/Secretary to retain approved status and sort_order
  const ppId = uuid();
  const eventId = uuid();
  await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Feedback Timeline Concert', event_date: '2026-07-23', start_time: '18:00', category: 'Konzert' });
  await client.from('campus_event_program_points').insert([
    { id: ppId, event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 10, sort_order: 1, status: 'approved' },
    { event_id: eventId, school_id: 'school-1', name: 'Act B', duration: 15, sort_order: 2, status: 'approved' }
  ]);
  
  sessionStorage.setItem('groovelab_user_id', 'teacher-1'); // Switch to teacher to update duration
  ```

---

## Verification Method

1. **Independent Verification Command**:
   Run `USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts` in the workspace directory.
2. **Success Condition**:
   The test run output should print:
   ```
   TEST RUN SUMMARY:
   Total tests run: 115
   Passed:          115
   Failed:          0
   Success rate:    100.0%
   ```
3. **Failure Invalidation**:
   If any of the 20 test cases still fail or exit with a non-zero code, the fix is invalid.
