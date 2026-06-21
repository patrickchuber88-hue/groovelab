# progress.md

Last visited: 2026-06-21T10:52:00Z

## Current Status
- [x] Milestone 1: Exploration & Database Check
- [x] Milestone 2: Load Simulation Script Development
- [x] Milestone 3: Load Simulation Dry Run & Execute
- [x] Milestone 4: Expert Evaluation
- [x] Milestone 5: Consolidated Report & Victory

## Victory & Retrospective

**Status**: VICTORY CLAIMED 🏆
The 15-minute realistic load simulation script was implemented, dry-run tested, executed for the full 15 minutes, logged to `simulation_realistic_15m.log`, evaluated by the 5-member expert team, and consolidated into the evaluation report `simulation_reports_15m_realistic.md`. All milestones are completed.

### Retrospective Notes:
- **What Worked**: 
  - Using direct PostgREST HTTP REST requests with standard `fetch` in the load simulation script was highly performant, lightweight, and simulated real API load accurately.
  - Offloading schedule conflicts to Postgres RPC `get_schedule_conflicts` saved significant client-side computing and bandwidth.
  - Multi-tenant partitioning (`school_id` isolation) verified 100% data security under load.
- **What Didn't Work**:
  - Direct connection to PostgreSQL without a transaction-level pooler (PgBouncer) caused connection starvation (5,241 timeouts) at 125.91 req/s.
  - Cryptographic decryption subqueries inside the `users` view without index mappings on split tables (`user_email_prefixes`) resulted in statement timeouts (`57014`).
- **Lessons Learned**:
  - Always install PgBouncer in transaction mode when scaling to thousands of active sessions.
  - Ensure any decrypted fields in high-frequency views have database indexes on parent keys.
  - Secure all `SECURITY DEFINER` trigger helper functions with explicit `SET search_path` constraints to prevent hijack exploits.
- **Process Improvements**:
  - Merge the secure registration invite-token migrations to prevent HTTP header client forgery.
  - Fix the secretary access regression in `is_teacher_or_admin()`.

## Iteration Status
Current iteration: 2 / 32

## Hang Log
- None
