# Project: 15-Minute Supabase Load Simulation

## Architecture
- **Target System**: Supabase PostgreSQL database defined in `.env.local`
- **Simulated Clients**: ~6,500 active users distributed across 10 dummy schools.
- **Client Behaviors**:
  - 70% Reads: fetching lessons, program points, campus events, user profiles.
  - 20% Check-ins: updating presence/check-in logs.
  - 10% Writes: creating/updating program points, sending feedback, registration triggers.
- **Log Output**: Executed request stats, latencies (p50, p95, p99), errors, RLS violations, logic conflicts.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Exploration | Inspect existing scratch scripts, database tables, and setup. | None | DONE (Conv ID: ef30f4d9-060d-452c-855c-f8a267603de8) |
| 2 | Implementation | Implement the 15-minute load simulation script supporting 6,500 users. | M1 | DONE (Conv ID: 1b849937-693b-459c-8694-0c71cd901058) |
| 3 | Execution | Run the simulation script for 15 minutes and save execution logs. | M2 | DONE (Conv ID: 46b11985-7b2a-42c5-9677-5cc652d136a1) |
| 4 | Reporting & Synthesis | Generate reports for the 5 agents and compile the consolidated simulation_reports_15m.md. | M3 | DONE (Conv ID: c9aa54ac-4392-473f-9ba6-e8c421889737) |

## Interface Contracts
- **Simulation Script Input**: `.env.local` Supabase URL, Anon Key, Service Role Key (if needed).
- **Simulation Log Format**: JSON or structured text detailing timestamps, response times, request counts, response codes, and error messages.
- **Report Output File**: `simulation_reports_15m.md` in the project root.
