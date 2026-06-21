## 2026-06-19T17:50:13Z
You are assigned to adversarially verify the correctness of the final Milestone 5 correction (excluding sick teacher lessons from conflict map) in the Groovelab app.

### Scope
1. Verify that lessons with status `'teacher_sick'` are correctly treated as canceled and do not cause scheduling conflicts on the event day.
2. Verify that other boundary checks and features remain fully functional.

### Verification
Run the checks:
- TypeScript compiler: `npx tsc --noEmit -p apps/groovelab/tsconfig.json`
- Mock E2E tests: `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
- Real E2E tests: `USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
  (*Note*: If you get `duplicate key value violates unique constraint "campus_events_pkey"` setup errors, please wait 5-10 seconds and rerun to bypass staging database concurrent collisions.)

Report your findings.
