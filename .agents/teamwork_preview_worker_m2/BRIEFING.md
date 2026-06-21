# BRIEFING — 2026-06-21T10:23:00Z

## Mission
Investigate dummy school user roles and implement/test a realistic 15-minute load simulation script.

## 🔒 My Identity
- Archetype: preview_worker
- Roles: implementer, qa, specialist
- Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_m2
- Original parent: fdb74efc-ae01-4403-b586-27e9ccd426e2
- Milestone: m2_load_simulation

## 🔒 Key Constraints
- CODE_ONLY network mode: No external internet access, no downloading of packages, use local tools/scripts.
- Connect to Postgres container via SSH at 178.105.10.2:22.
- Direct Supabase REST calls using native `fetch`.
- Query distribution: 70% Reads / 20% Session-Checkins / 10% Writes split.

## Current Parent
- Conversation ID: fdb74efc-ae01-4403-b586-27e9ccd426e2
- Updated: 2026-06-21T10:23:00Z

## Task Summary
- **What to build**: A realistic 15-minute load simulation script with student, teacher, and admin paths maintaining a 70/20/10 read/session/write split, supporting a `--dry-run` flag.
- **Success criteria**: Dry-run executes successfully and outputs correct logs. Postgres database queries return role information for the 10 dummy schools.
- **Interface contracts**: Supabase PostgREST endpoints.
- **Code layout**: scratch/simulate_load_realistic_15m.mjs.

## Key Decisions Made
- Dynamically assigned 1% of students as admins and 5% of students as teachers to satisfy the lack of admins and teachers in the database.
- Created `band_songs` mappings at startup to support join slot operations on `band_song_slots`.
- Used inner join to query sessions by school.

## Artifact Index
- scratch/simulate_load_realistic_15m.mjs — Load simulation script.
- simulation_dryrun.log — Log output from dry-run execution.
- .agents/teamwork_preview_worker_m2/handoff.md — Final handoff report.

## Change Tracker
- **Files modified**:
  - `scratch/simulate_load_realistic_15m.mjs` — Created load simulation script.
- **Build status**: N/A
- **Pending issues**: None

## Quality Status
- **Build/test result**: Dry-run execution succeeded with 92% response success rate.
- **Lint status**: 0 violations
- **Tests added/modified**: N/A

## Loaded Skills
- None
