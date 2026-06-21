# context.md — Simulation Context

This file details the environment, credentials, and constraints for the Groovelab app database load simulation.

## Environment Details
- **Project Location**: `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/`
- **Database**: Supabase PostgreSQL (credentials and endpoint to be discovered)
- **Target Audience**: ~6,500 active users across 10 dummy schools.

## Workflow Parameters
- **Duration**: 15 minutes (900 seconds)
- **Target Load Distribution**:
  - 70% Reads (Dashboard, list loading, homework reading, schedules, statistics)
  - 20% Session Check-ins/Check-outs (Station check-ins/check-outs)
  - 10% Writes (Song progress logs, homework, coach notes, program points, help requests, band memberships, song proposals/votes/slots, lab planning preferences)

## Current Work Directory
- `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_orchestrator_load_simulation_realistic`
