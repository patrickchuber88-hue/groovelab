# Challenge Report — Milestone 5 Forensic Review

## Challenge Summary

**Overall risk assessment**: CRITICAL

## Challenges

### [Critical] Challenge 1: Absence of Milestone 5 Logic in React UI Component

- **Assumption challenged**: The codebase has successfully implemented the Milestone 5 Program Board (drag-and-drop support, stage switcher, and conflict detection logic) inside `apps/groovelab/src/components/CampusEventsBoard.tsx`.
- **Attack scenario**: Due to git resets or cleanups during concurrent agent execution, all uncommitted Milestone 5 modifications made by `teamwork_preview_worker_m5_1` and `implementer_m5_final_correction` to `CampusEventsBoard.tsx` were completely discarded. The file on disk is in a clean baseline state and contains:
  - No `getConflictsMap` function.
  - No drag-and-drop handler functions.
  - No stage count switcher in the timeline UI.
  - No visual warning highlight or red border overlays for conflicts.
- **Blast radius**: The application does not actually possess any of the Milestone 5 features in the user interface.
- **Mitigation**: The code for the program board needs to be re-applied to `CampusEventsBoard.tsx` and committed so it is not lost.

### [Critical] Challenge 2: Test Case Facade / Client-Side Mocking Loophole

- **Assumption challenged**: The 123 E2E test cases verify the correctness of the front-end scheduling and conflict detection logic.
- **Attack scenario**: The E2E tests (`e2e_test_cases.ts`) bypass importing or testing the React component `CampusEventsBoard.tsx`. Instead, tests like `T3_M5_3` and `T3_M5_4` re-implement the conflict math locally inside the test runner using inline functions. This creates a facade where tests pass successfully (123/123) even when the actual application UI has zero scheduling board code or conflict checks.
- **Blast radius**: The test suite cannot detect front-end regressions or the complete absence of the front-end implementation.
- **Mitigation**: Integration or component tests (e.g., using React Testing Library or Playwright) should be introduced to verify the actual UI behavior and import the component directly.

### [High] Challenge 3: Missing Test Coverage for `'teacher_sick'` Status

- **Assumption challenged**: The E2E tests cover the boundary check ensuring that lessons with status `'teacher_sick'` are correctly treated as canceled and do not cause scheduling conflicts.
- **Attack scenario**: A search for `'teacher_sick'` in the E2E tests (`e2e_test_cases.ts` and `run_e2e_tests.ts`) shows no test case assertions or scenarios that use this status. The tests only check the `'cancelled'` status.
- **Blast radius**: The `'teacher_sick'` behavior remains untested at the E2E level, meaning regression of this specific fix will not be caught.
- **Mitigation**: Add a dedicated test case in `e2e_test_cases.ts` that specifically seeds a lesson with status `'teacher_sick'` and asserts that it does not trigger conflicts.

## Stress Test Results

- Run `npx tsc --noEmit` → Compiles successfully → PASS (Only because the broken modifications in `CampusEventsBoard.tsx` were reverted, leaving it clean).
- Run mock E2E tests → 123/123 tests pass → PASS (Tests pass but are blind to front-end component state).
- Run real E2E tests → 123/123 tests pass → PASS (Tests pass but are blind to front-end component state).
- Search for `getConflictsMap` in `CampusEventsBoard.tsx` → Not found → FAIL.
