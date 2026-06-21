## 2026-06-21T09:52:19Z

Implement the Load and Logic Simulation in the Groovelab app repository.

1. Implement the simulation script at:
   `apps/groovelab/src/tests/simulate_load.ts`

2. Design of `simulate_load.ts`:
   - Load env variables from `apps/groovelab/.env.local` using `dotenv`.
   - Setup a Supabase client using `@supabase/supabase-js`.
   - Define a client creator function that instantiates a Supabase client for a specific user ID and school ID:
     ```typescript
     function getClient(userId: string, schoolId: string) {
       return createClient(supabaseUrl, supabaseAnonKey, {
         global: {
           fetch: async (input, init) => {
             const headers = new Headers(init?.headers);
             headers.set('x-user-id', userId);
             headers.set('x-invite-school-id', schoolId);
             return fetch(input, { ...init, headers });
           }
         }
       });
     }
     ```
   - **Provisioning Phase**:
     - Create a temporary school UUID (use `crypto.randomUUID()`).
     - Create 250 temporary users:
       - 10 Admins/Secretaries (role: 'admin' or 'secretary')
       - 40 Teachers (role: 'teacher')
       - 200 Students (role: 'student')
       - Insert them in batches into the `users` view. You must pass the header `x-invite-school-id` set to the temporary school ID when inserting to satisfy the `users_insert` RLS policy!
     - Create a few initial seed records for the temporary school (e.g., 2-3 songs in the `songs` table, 1 active event with `stage_count: 3` in `campus_events` created by one of the admin users).
     - Create lessons (e.g., 20 lessons in the `lessons` table) linking simulated teachers and students.
   - **Simulation Loop (R1)**:
     - Set a boolean flag `let running = true`.
     - Spawn 250 parallel async user routines.
     - Each user routine runs a `while (running)` loop with a random `sleep` interval (e.g., 10-30 seconds with jitter) between actions.
     - Choose random actions based on user roles:
       - **Students**: Fetch profile, fetch lessons, fetch public campus events, insert a song skill (`user_song_skills`).
       - **Teachers**: Fetch profile, fetch lessons, submit a program point for the active event, update their own program point name or duration, query program points list, check/respond to feedback requests, create bands and add students to them.
       - **Admins**: Fetch profile, list all program points, approve/reject program points, configure event settings (e.g. stages/duration), schedule approved program points (`is_scheduled = true`, set stage and sort order), request feedback on program points.
   - **Orchestration & Metric Tracking (R2)**:
     - Run a timer for exactly 10 minutes.
     - Wrap every database query in a timer to measure latency.
     - Write all database operations to a log file: `apps/groovelab/src/tests/simulation.log` in format: `${timestamp} [${role}] [${userId}] ${actionDescription} -> ${status} (${latency}ms)`.
     - In global metrics, track:
       - Total request count, success count, error count.
       - Latencies list (to calculate average, p50, p95, p99 at the end).
       - Database exceptions, RLS violations, and check constraint failures.
       - Logic conflicts:
         - Local check in Admin action: before scheduling a teacher, check if they are already scheduled at that time on a different stage or have a lesson conflict, and increment `logicConflicts` if found!
   - **Cleanup Phase**:
     - Trap `SIGINT`/`SIGTERM` and ensure cleanup runs even if interrupted.
     - Set `running = false` and wait for any active queries to finish.
     - Delete the temporary school UUID. Since all users, events, program points, lessons, songs, bands, and song skills reference the school or users by foreign key constraints with `ON DELETE CASCADE`, this single deletion instantly removes all test data, leaving the database perfectly clean.
     - Calculate statistics and write a summary JSON file: `apps/groovelab/src/tests/simulation_summary.json` containing total requests, throughput, average latency, p50, p95, p99 latencies, error breakdown, RLS violations, validation failures, and logic conflicts.
     - Output the summary clearly to the console.

3. Execution steps:
   - Perform a short dry-run (e.g. 5 parallel users for 30 seconds) to ensure that the code compiles, the Supabase client successfully connects, data is provisioned, logged, and cleaned up completely without RLS blocks. Run using: `npx tsx apps/groovelab/src/tests/simulate_load.ts --dry-run` or similar.
   - Once dry-run is successful, execute the FULL 10-minute simulation with 250 parallel sessions against the remote database!
   - Verify that the `simulation.log` and `simulation_summary.json` are written completely in the project directory.
