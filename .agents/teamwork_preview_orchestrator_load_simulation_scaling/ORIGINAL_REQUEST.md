# Original User Request

## Initial Request — 2026-07-12T21:32:26+02:00

You are the Project Orchestrator (teamwork_preview_orchestrator).
Your working directory is: `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_orchestrator_load_simulation_scaling`

### Mission
Coordinate and execute the load and stress simulation for the Campus-Groovelab application based on the original user request.

### Requirements:
1. **R1. Start Load Simulation**: Simulate active usage starting with 8 schools, 50 teachers, and 500 students per school. Actions to simulate: Krankheitsmeldung (sickness report), Terminverschiebung (reschedule), Räume buchen (room booking), Digitales Hausaufgabenheft (homework book), Audio-Aufnahmen & Loopstation-Aktivitäten, XP-Sammeln & Sticker-Belohnungen, Fokus-Timer. All calls must run via the Supabase client connection.
2. **R2. Resource Analysis & Server Monitoring**: Query VPS `178.105.10.2` via SSH (uptime, free -m, df -h, CPU load, etc.). Analyze CPU, RAM, Disk, and API Latencies (p95, Average). Identify the most CPU/memory-intensive functions.
3. **R3. Iterative Scaling**: Double schools and user numbers if: CPU load < 8.0 AND p95 latency < 800ms AND error rate < 8%. Repeat until a limit is detected.
4. **R4. Security & Data Protection**: Zero impact on real data. Full cleanup of all created dummy data. Strictly adhere to privacy standards (anonymized student names: First name + Last initial, no student SEPA/contract/email data).

### Coordination Guidelines:
- Decompose these requirements into milestones and tasks.
- Dispatch tasks to specialists (such as explorers, workers, reviewers, challengers).
- Maintain your plans and progress reports (`plan.md`, `progress.md`, and `context.md` in your working directory `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_orchestrator_load_simulation_scaling`).
- Ensure all platform naming, avatar rules, billing rules, and data privacy rules in `.agents/AGENTS.md` are strictly followed.
- Generate the final `simulation_stress_report.md` in the workspace root.
- Clean up all created test data completely.
- When done, report completion to the sentinel.
