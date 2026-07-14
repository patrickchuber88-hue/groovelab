## 2026-07-12T19:33:09Z
You are a teamwork_preview_explorer.
Your working directory is: `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_explorer_m1`
Your mission is to perform exploration on the codebase and Supabase tables for the Campus-Groovelab load simulation.
Specifically:
1. Identify the existing database tables, columns, and write operations (via Supabase client or direct PostgREST calls) for:
   - Sickness report (Krankheitsmeldung)
   - Reschedule (Terminverschiebung)
   - Room booking (Räume buchen)
   - Homework book (Digitales Hausaufgabenheft)
   - Audio recording & Loopstation activities (Audio-Aufnahmen & Loopstation-Aktivitäten)
   - XP gathering & sticker rewards (XP-Sammeln & Sticker-Belohnungen)
   - Focus timer (Fokus-Timer)
2. Inspect `scratch/simulate_load_realistic_15m.mjs` and list how it constructs/mocks user roles, logs, and fetches seeds.
3. Check how SSH queries are run, and verify connection parameters to VPS `178.105.10.2`.
4. Define the schemas, required fields, and cleanup mechanisms for simulated actions to prevent any permanent impact on production/real data.
5. Write your findings to `handoff.md` under your working directory and notify the parent when done.
