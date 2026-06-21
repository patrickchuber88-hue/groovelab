## 2026-06-21T10:16:36Z

You are teamwork_preview_worker_m2.
Your working directory is `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_m2`.

Please perform the following tasks:
1. Create your working directory and initialize `progress.md` and `BRIEFING.md` according to your protocol.
2. Connect to the Supabase database via the Postgres container (using SSH credentials: Host `178.105.10.2`, Port `22`, User `root`, SSH key `/Users/patrickhuber/.ssh/id_ed25519`, command `docker exec -i supabase-db psql -U postgres -d postgres`) and run a query to check:
   - What roles are present in the `users` table for the 10 newly created dummy schools:
     `3bf920b9-49b5-4aca-be79-42359fef3f1f`
     `01329036-22f0-4424-b9e5-9064df450841`
     `46bace52-2d7a-4a87-aae2-5778ded238cb`
     `532b4d91-67c8-4194-9cde-f231ecb12bdd`
     `41c07ebd-1b59-4f75-8359-408d957dd080`
     `109e83b3-a1ff-42f0-95b9-db6562f8e77d`
     `d5838bdd-d779-424b-94d3-878d12c60140`
     `5e0b8364-12dd-43b1-aeb5-17417d53e957`
     `6abb3e70-cd0f-420d-b963-64f977f66a64`
     `ca3c620a-7cde-4281-8522-ae278e137995`
   - Are there users with `teacher` and `admin` roles in these schools? If not, check if there are users with these roles in other schools, or if we need to assign some users as teachers/admins in our script.
3. Write the load simulation script `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/simulate_load_realistic_15m.mjs`.
   - The script must support a `--dry-run` flag (runs 30s with up to 20 concurrent users, logging to `simulation_dryrun.log`).
   - The script in production mode must run for 15 minutes, spawning up to ~6,500 active users (staggered ramp-up over 3 minutes), logging execution logs to `simulation_realistic_15m.log`.
   - The script must dynamically query users at startup using the service key, or load them from database/JSON, and classify them by role. If the dummy schools do not have enough teachers or admins in the database, your script can dynamically assign a small percentage of students (e.g. 5% as teachers, 1% as admins) to act as teachers and admins for the simulation.
   - It must implement role-specific pathways:
     - **Students**:
       - 70% Reads: Load Dashboard (GET `/rest/v1/users?id=eq.${userId}`), Fetch Lessons (GET `/rest/v1/lessons?student_id=eq.${userId}`), Fetch Events (GET `/rest/v1/campus_events?school_id=eq.${schoolId}`), Fetch Homework/Coach Notes (GET `/rest/v1/lessons?student_id=eq.${userId}&select=coach_notes,homework`), Fetch Help Requests (GET `/rest/v1/help_requests?user_id=eq.${userId}`), Fetch Bands & Song Slots (GET `/rest/v1/band_members?user_id=eq.${userId}`).
       - 20% Session Check-ins/Check-outs (POST `/rest/v1/sessions`).
       - 10% Writes: Log song progress (POST `/rest/v1/user_progress`), Create help requests (POST `/rest/v1/help_requests`), Join bands / song slots (POST `/rest/v1/band_members` or `/rest/v1/band_song_slots`), Create song proposals (POST `/rest/v1/band_song_proposals`), Vote on proposals (POST `/rest/v1/band_proposal_votes`), Room/time preferences (POST `/rest/v1/lab_planning`).
     - **Teachers**:
       - 70% Reads: Load Student Lists (GET `/rest/v1/users?school_id=eq.${schoolId}&role=eq.student`), Fetch Help Requests (GET `/rest/v1/help_requests?school_id=eq.${schoolId}`), Check Schedule Conflicts via RPC (POST `/rest/v1/rpc/get_schedule_conflicts` with `p_event_id`).
       - 20% Session Check-ins/Check-outs (GET or standard sessions insert).
       - 10% Writes: Write coach notes/homework (PATCH `/rest/v1/lessons?id=eq.${lessonId}`), Create program points (POST `/rest/v1/campus_event_program_points`), Resolve help requests (PATCH `/rest/v1/help_requests?id=eq.${requestId}`).
     - **Admins**:
       - 70% Reads: Retrieve statistics via View (GET `/rest/v1/school_user_statistics?school_id=eq.${schoolId}`).
       - 20% Session Check-ins/Check-outs (GETs or session inserts).
       - 10% Writes: Create event program points or update configs.
   - The query distribution across all users combined must maintain the 70% Read / 20% Session-Checkins / 10% Writes split.
   - Use direct REST calls using native `fetch` with authorization headers (`apikey`, `Authorization`, `x-user-id` for RLS, `Content-Type`) to ensure high performance and low overhead.
4. Execute a dry-run of the script:
   `node scratch/simulate_load_realistic_15m.mjs --dry-run`
   Verify it executes without errors and produces valid log entries in `simulation_dryrun.log`.
5. Document your database role count findings and the dry-run results in `handoff.md` in your working directory. Include a sample of `simulation_dryrun.log`.
6. Send a message to the parent (conversation ID: fdb74efc-ae01-4403-b586-27e9ccd426e2) with the results and confirmation of a successful dry-run.
