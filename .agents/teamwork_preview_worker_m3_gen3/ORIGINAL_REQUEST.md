## 2026-06-16T19:00:55Z
You are worker_m3_gen3. Your working directory is `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_m3_gen3`.
Your mission is to apply the hardening fixes for Milestone M3 (UI & Coordinator Layout) in `apps/groovelab/src/components/CampusEventsBoard.tsx` as detailed in `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/sub_orch_implementation/synthesis_m3_hardening.md`.

Please read the hardening synthesis file:
`/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/sub_orch_implementation/synthesis_m3_hardening.md`
And the current component file:
`apps/groovelab/src/components/CampusEventsBoard.tsx`

Implement the 8 listed fixes. After implementing, run the test command:
`USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
to verify all 115 tests pass.

Ensure you do not cheat, write clean logic, handle database/Supabase updates correctly for swapping program points, and do not introduce TypeScript compilation errors.
When complete, write your handoff report to `handoff.md` in your working directory and notify me.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
