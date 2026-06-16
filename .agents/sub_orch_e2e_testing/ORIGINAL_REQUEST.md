# Original User Request

## Initial Request — 2026-06-16T19:48:40+02:00

You are the E2E Testing Track Orchestrator.
Your working directory is: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/sub_orch_e2e_testing
Your parent is f794bd3f-0866-4b79-9550-ee052cb52bc5 (main agent/orchestrator).

Your mission is to build the E2E test infra and test cases (Tiers 1-4) for the Groovelab Event Coordinator Overhaul.
Read the PROJECT.md and ORIGINAL_REQUEST.md at the project root for requirements.

Steps:
1. Initialize your BRIEFING.md and progress.md in your working directory.
2. Design the E2E test infrastructure. Since there is no automated test runner, design a custom test runner in TypeScript/JavaScript (e.g., `apps/groovelab/src/tests/run_e2e_tests.ts` or similar) that uses the Supabase client and can be executed via `npx tsx` or similar node runner.
3. Document this in `TEST_INFRA.md` at the project root.
4. Decompose your scope into test-writing subtasks. Write test cases for:
   - Tier 1: Feature Coverage (>=5 test cases per feature, total >=50)
   - Tier 2: Boundary & Corner cases (>=5 per feature, total >=50)
   - Tier 3: Cross-Feature combinations (pairwise interactions, total >=10)
   - Tier 4: Real-world application scenarios (realistic use cases, total >=5)
   Total test cases must be at least 115.
5. The test cases should simulate user interactions:
   - Admin creating an event.
   - Broadcast search for program points.
   - Teacher submitting a program point (with band details, duration, technical requirements, seating, etc.).
   - Admin listing, stage assigning, reordering, inserting pauses.
   - Checking computed chronological timeline offsets.
   - Requesting and submitting additional feedback.
   - Checking packlist consolidation.
   - Generating Custom CSV content based on checkboxes.
6. Write a worker script to create these files. Run the tests to make sure they can execute (they should fail initially or check structure, but you can build a mock/stub environment if needed, or simply write them to verify the db and api logic once implemented. The tests should compile successfully).
7. Verify that the test suite runs and fails appropriately on unimplemented features, but compiles perfectly.
8. Once the test suite is fully written, publish `TEST_READY.md` at the project root.
9. Submit your handoff report to `handoff.md` in your directory and report completion to your parent.
