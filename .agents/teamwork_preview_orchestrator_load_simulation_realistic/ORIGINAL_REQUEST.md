# Original User Request

## 2026-06-21T12:14:04Z

Your identity is teamwork_preview_orchestrator.
Your working directory is /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_orchestrator_load_simulation_realistic.

Your mission:
Please read `.agents/ORIGINAL_REQUEST.md` (specifically the request from 2026-06-21T10:13:41Z) and orchestrate the team to fulfill it:
1. Create and execute a 15-minute realistic load simulation script targeting the Supabase database.
2. The simulation must simulate real user pathways for:
   - Students: loading dashboard, check-in/out at stations (sessions), logging song progress, reading homework, answering feedback.
   - Teachers: loading student lists, writing coach notes/homework, creating program points, checking for schedule conflicts via RPC `get_schedule_conflicts`.
   - Admins: retrieving statistics via `school_user_statistics`.
3. The load simulation should use the ~6,500 active users across the 10 newly created dummy schools.
4. Save the execution logs to `simulation_realistic_15m.log`.
5. Assemble the 5-member expert team (roles: Quality Control, Cyber-Security, Database, Server/Infrastructure, App Developer) to evaluate the logs/database state and write their feedback.
6. Generate the consolidated evaluation report `simulation_reports_15m_realistic.md`.
7. Once all acceptance criteria are met, write a final progress update to your `progress.md` file claiming victory, and send a message back to the sentinel (the main agent) to trigger the Victory Audit.

Ensure you write `plan.md`, `progress.md`, and `context.md` in your directory. Follow your own protocols strictly. Let me know when you are started.

## 2026-06-21T10:14:11Z

We received a follow-up request that you must incorporate into the planning:

Bitte erweitere das Lastsimulations-Skript so, dass ALLE Funktionen und Tabellen unserer App vollumfänglich einbezogen werden. Das bedeutet:
1. Übungsverlauf & Fortschrittstracking (Einträge in `user_progress`).
2. Hilferufe an Übestationen (Schüler erstellen `help_requests`, Lehrer lösen diese auf/setzen Status auf 'resolved').
3. Bands & Matching-Board (Beitreten von Mitgliedern zu Bands über `band_members`, Song-Vorschläge über `band_song_proposals`, Abstimmungen über `band_proposal_votes`, Belegen von Band-Song-Slots über `band_song_slots`).
4. Raum- & Zeitplanung (Einträge in `lab_planning` für Schüler-Präferenzen).

Stelle sicher, dass diese Workflows gleichmäßig in den Lasttest (70% Read / 20% Session-Checkins / 10% Writes) integriert werden, damit das gesamte Produktverhalten realitätsgetreu simuliert wird.
