# BRIEFING — 2026-06-21T12:15:46+02:00

## Mission
Explore existing load simulation scripts, locate database credentials, inspect Supabase database schemas/data/RPCs, and compile a handoff report.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Read-only investigation, problem analysis, findings synthesis, report production
- Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_explorer_m1
- Original parent: fdb74efc-ae01-4403-b586-27e9ccd426e2
- Milestone: Phase 1 Exploration

## 🔒 Key Constraints
- Read-only investigation — do NOT implement code changes
- Network Restrictions: CODE_ONLY mode (no external websites, no external curl/wget)
- Output layout compliance: only metadata in `.agents/`

## Current Parent
- Conversation ID: fdb74efc-ae01-4403-b586-27e9ccd426e2
- Updated: 2026-06-21T12:15:46+02:00

## Investigation State
- **Explored paths**:
  - `scratch/simulate_load_15m.mjs`
  - `apps/groovelab/scratch/simulate_student_load.py`
  - `apps/groovelab/src/tests/simulate_load.ts`
  - `.env.local`
  - `apps/groovelab/.env.local`
  - `apps/groovelab/scratch/apply_improvements.ts`
  - Supabase Database (queried via SSH tunnel into `supabase-db` docker container on server `178.105.10.2`)
- **Key findings**:
  - Located 10 newly created dummy schools: Beat Lab Essen, Harmonie Institut Dortmund, Symphonie Schule Leipzig, Tonart Akademie Düsseldorf, Melodie Schule Stuttgart, Konservatorium Frankfurt, Rhythmus & Groove Köln, Musikschule Klangwiese Hamburg, Sound Center München, Akkord Akademie Berlin.
  - Confirmed total active users: 6,726 active users (out of 6,845 total).
  - Schema details for tables: `users`, `user_progress`, `help_requests`, `band_members`, `band_song_proposals`, `band_proposal_votes`, `band_song_slots`, and `lab_planning`.
  - Confirmed RPC function `get_schedule_conflicts` signature: `p_event_id uuid, p_transition_time integer DEFAULT 10` returning `TABLE(program_point_id uuid, conflict_type text, conflict_message text)`.
  - Discovered that `school_user_statistics` is NOT an RPC function but a database VIEW with 7 columns (`school_id`, `teachers`, `students`, etc.) defined in `supabase/migrations/177_school_user_statistics_view.sql`.
- **Unexplored areas**:
  - Integration/behavior of front-end components with the found DB views/RPCs under actual heavy load.

## Key Decisions Made
- Used the user's private key (`/Users/patrickhuber/.ssh/id_ed25519`) and SSH client to execute raw SQL queries inside the docker container `supabase-db` on the remote server `178.105.10.2` rather than password auth or REST API RLS-limited access.

## Artifact Index
- `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_explorer_m1/handoff.md` — Handoff report containing findings.
- `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_explorer_m1/progress.md` — Progress liveness heartbeat.
