# BRIEFING — 2026-07-12T21:45:00+02:00

## Mission
Coordinate and execute the load and stress simulation for the Campus-Groovelab application.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_orchestrator_load_simulation_scaling
- Original parent: parent
- Original parent conversation ID: 11fe3ee6-f1b4-4fe8-a4b4-afc0faa3939c

## 🔒 My Workflow
- **Pattern**: Project Pattern (Orchestrator)
- **Scope document**: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_orchestrator_load_simulation_scaling/PROJECT.md
1. **Decompose**: Decompose load simulation implementation, execution, VPS monitoring, and scaling loops into milestones.
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: Spawn Explorer -> Worker -> Reviewer -> Challenger -> Auditor per milestone/task.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns. Write handoff.md, spawn successor, kill timers.
- **Work items**:
  1. Decompose requirements into PROJECT.md [done]
  2. Implement simulation scripts & verification [done]
  3. Execute load simulation & scale iteration [done]
  4. Final report and data cleanup [done]
- **Current phase**: 4
- **Current focus**: Completed final report and data cleanup.

## 🔒 Key Constraints
- Platform naming: Campus-Groovelab
- Avatar Display: Musician avatars only for teachers/students, administration/secretariat display briefing board `/campus_login_hero.png`.
- Billing & Pricing: Base license free, and specific module/active user rules.
- Data Privacy: Zero impact on real data, anonymized student names (First name + Last initial), no pupil SEPA/contract/email data.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh

## Current Parent
- Conversation ID: 11fe3ee6-f1b4-4fe8-a4b4-afc0faa3939c
- Updated: 2026-07-12T21:45:00+02:00

## Key Decisions Made
- Dispatched Explorer for Milestone 1.
- Dispatched Worker for Milestone 2 script development & scaling loop.
- Dispatched Forensic Auditor to verify code compliance and database cleanup.
- Cancelled heartbeat cron upon successful task completion.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_m1 | teamwork_preview_explorer | Explore database tables & actions for simulation | completed | 0a0eeac2-2d2f-45d5-8dbf-193756009738 |
| worker_m2 | teamwork_preview_worker | Develop and test simulation and scaling script | completed | 22b8964d-55f3-43f6-8eb0-d9e43bdb059b |
| auditor_m2 | teamwork_preview_auditor | Forensic audit of load simulation and scaling scripts | completed | ea210959-85c8-4f21-97e8-71de92992512 |

## Succession Status
- Succession required: no
- Spawn count: 3 / 16
- Pending subagents: none
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: stopped
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_orchestrator_load_simulation_scaling/ORIGINAL_REQUEST.md — Original user request
- /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_orchestrator_load_simulation_scaling/BRIEFING.md — Persistent memory
- /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_orchestrator_load_simulation_scaling/progress.md — Progress log
- /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_orchestrator_load_simulation_scaling/plan.md — Detailed plan
- /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_orchestrator_load_simulation_scaling/context.md — Context and results overview
- /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/simulation_stress_report.md — Final server stress-test report (workspace root)
