# Hardening Review Handoff Report

## Review Summary

**Verdict**: REQUEST_CHANGES

## Findings

### Critical Finding 1: Compilation Failure due to TypeScript Type Check Error

- **What**: Compilation error when building the project.
- **Where**: `apps/groovelab/src/components/CampusEventsBoard.tsx` at lines 651 and 655.
- **Why**: 
  `totalDurationVal` and `programDurationVal` are typed as `number | null`. Passing these values into `isNaN()` and comparing them with `<=` triggers `TS2345` and `TS18047` because `null` is not assignable to type `number` and the values are possibly `null`.
- **Suggestion**:
  Refactor `handleSaveEventSettings` to parse and validate the duration variables inside conditional blocks where they are verified to be truthy, or use temporary local variables typed strictly as `number`.

**Suggested fix code**:
```typescript
  const handleSaveEventSettings = async () => {
    if (!selectedEvent) return;
    let totalDurationVal: number | null = null;
    if (totalDuration) {
      const parsed = parseInt(totalDuration, 10);
      if (isNaN(parsed) || parsed <= 0) {
        alert('Bitte geben Sie eine gültige Gesamtdauer ein (eine positive Zahl).');
        return;
      }
      totalDurationVal = parsed;
    }

    let programDurationVal: number | null = null;
    if (programDuration) {
      const parsed = parseInt(programDuration, 10);
      if (isNaN(parsed) || parsed <= 0) {
        alert('Bitte geben Sie eine gültige Programm-Dauer ein (eine positive Zahl).');
        return;
      }
      programDurationVal = parsed;
    }

    try {
      const { data, error } = await supabase
        .from('campus_events')
        .update({
          stage_count: stageCount,
          total_duration: totalDurationVal,
          program_duration: programDurationVal
        })
        ...
```

---

## 1. Observation

- **Implementation check of 8 fixes**:
  1. **Modal Blocker** (Line 4160) -> Verified: `selectedEvent && (!isAdminOrSecretary || selectedEvent.is_subscribed)` ensures full-screen details modal only blocks student/teacher or subscribed events.
  2. **Delete/Reset Actions** -> Verified: Admin/secretary delete button in Column 3 (line 3146), Column 2 (line 3831), and details modal (line 4388) allows admins/secretaries to delete custom events regardless of creator.
  3. **Sort Order Swap** (Lines 743, 2988, 2995) -> Verified: Reordering swaps sort orders using database update, avoiding duplicate values or negative numbers.
  4. **Stage Count Cap** (Lines 2760, 2763) -> Verified: Clamped between 1 and 10 in UI and state updates.
  5. **Type Validation** (Lines 648, 698, 3030) -> Verified: Input strings parsed, checked for `isNaN` / `<= 0`, and `min="1"` added on the pause duration input.
  6. **Timezone Weekday Lookup** (Line 1469) -> Verified: `new Date(date + 'T00:00:00')` evaluates weekday correctly in local timezone.
  7. **Private Event Visibility** (Line 1728) -> Verified: Private events visible to creator, admin, or secretary.
  8. **Student Band Matching** (Lines 124, 1427, 1446) -> Verified: State `studentBandIds` populated from `band_members` and integrated into `isAssignedToEvent`.

- **Run e2e tests command**: `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
  - **Result**: Successful execution of 115/115 tests passed.
  ```
  ====================================================
  TEST RUN SUMMARY:
  Total tests run: 115
  Passed:          115
  Failed:          0
  Success rate:    100.0%
  ====================================================
  ```

- **Run build command**: `npm run build:groovelab`
  - **Result**: FAILED with code 2.
  - **Verbatim Error Output**:
    ```
    src/components/CampusEventsBoard.tsx(651,33): error TS2345: Argument of type 'number | null' is not assignable to parameter of type 'number'.
      Type 'null' is not assignable to type 'number'.
    src/components/CampusEventsBoard.tsx(651,54): error TS18047: 'totalDurationVal' is possibly 'null'.
    src/components/CampusEventsBoard.tsx(655,35): error TS2345: Argument of type 'number | null' is not assignable to parameter of type 'number'.
      Type 'null' is not assignable to type 'number'.
    src/components/CampusEventsBoard.tsx(655,58): error TS18047: 'programDurationVal' is possibly 'null'.
    ```

---

## 2. Logic Chain

1. The instructions command that we review the work product, verify the 8 fixes, execute the tests, and build the project to ensure no regressions or compilation issues.
2. Direct inspection of `apps/groovelab/src/components/CampusEventsBoard.tsx` shows that all 8 fixes are logically implemented.
3. Execution of e2e tests succeeded with 100% success rate, verifying the runtime correctness of the code.
4. Execution of the build command (`npm run build:groovelab`) failed due to TypeScript type assertions failing in `handleSaveEventSettings`.
5. Therefore, a compilation regression has been introduced in the project codebase, preventing packaging and deployment.
6. The work product cannot be approved in its current state, and the verdict must be `REQUEST_CHANGES`.

---

## 3. Caveats

- The review is based on the mock-enabled e2e test suite and direct analysis of the TypeScript compiler outputs. Database schema definitions and live Supabase security rules were assumed correct based on test coverage.

---

## 4. Conclusion

The hardening changes are logically and functionally correct (115/115 tests passed), but they contain a TypeScript compile-time regression that breaks the build. The verdict is **REQUEST_CHANGES**. Resolving the type guard error in `handleSaveEventSettings` will compile the code successfully.

---

## 5. Verification Method

To independently verify this result:
1. Run the build command:
   ```bash
   npm run build:groovelab
   ```
   *Expected outcome: TypeScript compilation errors on lines 651 and 655 of CampusEventsBoard.tsx.*
2. Run the e2e test suite:
   ```bash
   USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts
   ```
   *Expected outcome: All 115 tests pass successfully.*

---

## 6. Challenge Report (Adversarial Review)

### Challenge 1: Out of Bounds Database State Injection
- **Assumption challenged**: `stageCount` is always bounded between 1 and 10.
- **Attack scenario**: If the database contains pre-existing `stage_count` values exceeding 10 (e.g. 500), loading the event will fetch and set `stageCount` to 500 without clamping. This leads to React trying to render 500 stages synchronously, crashing the browser tab.
- **Blast radius**: High (browser page freezes on event load).
- **Mitigation**: Clamp `selectedEvent.stage_count` when loading:
  ```typescript
  setStageCount(Math.min(10, Math.max(1, selectedEvent.stage_count || 1)));
  ```

### Challenge 2: Duplicate Calendar Event Title / Time Combination
- **Assumption challenged**: Subscribed calendar overrides are uniquely identified by a combination of normalized title, date, and normalized start time.
- **Attack scenario**: If multiple different events from the calendar share the same title, date, and start time, the matching logic inside `isOverride` and `filteredSubscribed` cannot distinguish them, leading to incorrect overrides or hidden events.
- **Blast radius**: Low (UI presentation mismatch for duplicate entries).
- **Mitigation**: Integrate a more robust UUID/UID from the calendar source to associate overrides.
