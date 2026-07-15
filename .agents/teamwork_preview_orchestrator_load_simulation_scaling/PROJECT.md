# Project: Campus-Groovelab Load and Stress Simulation Scaling

## Architecture
- **Simulation Runner**: Node.js ESM script running from `scratch/` utilizing the Supabase JS client or direct HTTP API (PostgREST) to simulate user actions (Students, Teachers, Admins).
- **Database/Backend**: Supabase PostgreSQL database on VPS `178.105.10.2`.
- **Server Monitoring**: SSH client querying host resource stats (CPU, RAM, Disk, active connections) on the VPS during and after load cycles.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Database & Actions Exploration | Investigate tables for target actions (sickness report, rescheduling, room booking, homework, loopstation, XP/stickers, focus timer), and verify VPS SSH connection. | None | PLANNED |
| M2 | Simulation & Scaling Script | Develop script `scratch/simulate_load_scaling.mjs` that can execute simulated actions, query VPS resources, check scaling limits, and clean up. | M1 | PLANNED |
| M3 | Load Execution & Scaling Loop | Run the simulation starting with 8 schools, 50 teachers, 500 students/school. Iteratively double numbers if limits permit. | M2 | PLANNED |
| M4 | Synthesis & Cleanup | Generate `simulation_stress_report.md` in root and fully clean up created dummy data. | M3 | PLANNED |

## Interface Contracts
- **Simulation Script Command**: `node scratch/simulate_load_scaling.mjs --schools 8 --teachers 50 --students 500`
- **SSH Metrics Fetch**: `uptime`, `free -m`, `df -h`, `cat /proc/loadavg` on `178.105.10.2` via root user.
- **Scale Criteria**: CPU load < 8.0 AND p95 latency < 800ms AND error rate < 8%.
