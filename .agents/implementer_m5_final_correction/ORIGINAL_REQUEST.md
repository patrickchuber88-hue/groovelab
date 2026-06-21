## 2026-06-19T15:38:26Z
You are assigned to make a final correction to the Milestone 5 Event Program Planning Board implementation.

### Context
A reviewer identified a minor logic gap in the conflict checking function `getConflictsMap` in `apps/groovelab/src/components/CampusEventsBoard.tsx`:
- The status `'teacher_sick'` represents a canceled lesson because the teacher is sick, but since it does not start with `'cancel'`, it is incorrectly treated as an active lesson, causing false positive conflict flags.

### Required Change
1. Modify `getConflictsMap` in `apps/groovelab/src/components/CampusEventsBoard.tsx` (around line 304) to exclude the `'teacher_sick'` status:
   ```typescript
   if (
     lesson.teacher_id === pp.teacher_id && 
     !lesson.status?.startsWith('cancel') && 
     lesson.status !== 'teacher_sick'
   ) {
   ```
2. Verify TypeScript compilation:
   `npx tsc --noEmit -p apps/groovelab/tsconfig.json`
3. Run E2E tests in mock mode:
   `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
4. Run E2E tests in real mode:
   `USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
   (Note: If you get a duplicate key violation `duplicate key value violates unique constraint "campus_events_pkey"`, please wait 5-10 seconds and rerun to avoid concurrency collisions on the remote database).

### MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please report your completion and test results.
