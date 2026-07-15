# Load Simulation & Stress Test Plan

## Objective
Coordinate and execute the load and stress simulation for the Campus-Groovelab application starting at a base configuration of 8 schools, 400 teachers, and 4,000 students. Analyze resource utilization, scale iteratively, and ensure safe data cleanup.

## Decomposed Plan

### Phase 1: Exploration
- [x] Investigate target database tables and write operations.
- [x] Analyze previous load simulation scripts (`simulate_load_realistic_15m.mjs`).
- [x] Verify SSH connection parameters and VPS resource monitoring commands.

### Phase 2: Implementation & Scaling Loop
- [x] Implement database seed generator with strict anonymization rules.
- [x] Implement Supabase-client load simulator covering the 7 active usage actions.
- [x] Implement SSH metric collector and pg_stat_statements query tracker.
- [x] Implement iterative scaling logic with thresholds (CPU load < 8.0, p95 latency < 800ms, error rate < 8%).

### Phase 3: Verification & Cleanup
- [x] Perform forensic audit on implementation and logs (CLEAN verdict).
- [x] Execute database purge using trigger overrides.
- [x] Verify counts match original clean database counts.

### Phase 4: Final Reporting
- [x] Compile final `simulation_stress_report.md` in workspace root.
- [x] Report completion to sentinel.
