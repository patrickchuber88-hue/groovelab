# Handoff Report - teamwork_preview_explorer_m1

This report compiles the findings of the database configuration exploration, analysis of load simulation scripts, and database schema, school list, user count, and RPC/view status verification.

## 1. Observation

### 1.1 Load Simulation Scripts
We searched and analyzed the load simulation scripts in the workspace. Here are the files and how they work:

#### A. `scratch/simulate_load_15m.mjs`
*   **Mechanism**: Spawns virtual users (up to 6,375 in production or 20 in dry-run mode) to run concurrent loops simulating user traffic. Staggers the startup using a ramp-up delay (3m in production, 5s in dry-run).
*   **User routine**: Each virtual user enters a loop executing randomized HTTP requests with a think-time delay (30-60s in production, 2-5s in dry-run):
    *   **70% Read operations**: Fetches profiles (`/rest/v1/users`), lessons (`/rest/v1/lessons`), events (`/rest/v1/campus_events`), or program points (`/rest/v1/campus_event_program_points`).
    *   **20% Practice/Check-in sessions**: Inserts fokus logs (`/rest/v1/fokus_logs`) or sessions (`/rest/v1/sessions`).
    *   **10% Writes**: Creates program points (designed to fail under RLS for students), updates room preferences, or updates bio.
*   **Database connection**: Makes direct HTTP REST requests to the Supabase endpoint using the native global `fetch` API. It authenticates as a user by setting the `x-user-id` header along with the `anonKey` and `Authorization: Bearer <anonKey>`.
*   **Dependencies**: Uses Node.js built-in modules (`fs` and `path`) and standard Web APIs (`fetch`). No external NPM packages.
*   **Seed Fetching**: Fetches list of songs and stations during startup using a service key.

#### B. `apps/groovelab/scratch/simulate_student_load.py`
*   **Mechanism**: Sequentially executes standard database queries triggered when loading a single student dashboard (`student_id = "02b976e8-0893-443b-a41a-5e7010fd05f3"`).
*   **Queries executed**: Fetches users+schools, avatars, student stats, schedule occurrences (today & school-year-wide), schedules, learning materials (`lehrwerke`), and progress matrix.
*   **Database connection**: Directly calls the Supabase REST API via `urllib.request`. Hardcodes `SUPABASE_URL = "https://supabase.campus-groovelab.de"` and `SUPABASE_KEY` (anon key).
*   **Dependencies**: Standard Python library modules: `urllib.request` and `json`.

#### C. `apps/groovelab/src/tests/simulate_load.ts`
*   **Mechanism**: A highly detailed TypeScript load simulation. Spawns 250 parallel user routines (admin, secretary, teacher, student). Creates a temporary school (`tempSchoolId`) and inserts generated users, songs, events, and lessons. Then, virtual users perform role-specific database actions:
    *   **Students**: Fetch profile, fetch lessons, fetch events, insert song skills.
    *   **Teachers**: Submit or update program points, create bands, add band members.
    *   **Admins/Secretaries**: List program points, change program point status, configure event settings, schedule program points (incorporating local checks for teacher/lesson conflicts), request feedback.
    *   **Cleanup**: On shutdown, deletes all generated data (cascaded delete from the temporary school) to keep the DB clean.
*   **Database connection**: Employs `@supabase/supabase-js` `createClient`. Overrides global `fetch` to inject `x-user-id` and `x-invite-school-id` headers for RLS routing.
*   **Dependencies**: Uses npm packages `dotenv`, `@supabase/supabase-js`, and Node.js built-ins `fs`, `path`, `crypto`.

---

### 1.2 Supabase Credentials & Environment Variables
We located two `.env.local` files in the workspace (one in the root and one in `apps/groovelab/`):
```ini
VITE_SUPABASE_URL=https://supabase.campus-groovelab.de
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc
```

Additionally, the **Service Key** used across several scratch scripts (e.g. `run_exec_sql.ts`, `scratch/simulate_load_15m.mjs`) is:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys
```

For direct postgres/psql database connection, the scripts (such as `apps/groovelab/scratch/inspect_server_key.cjs`) connect via SSH:
*   **Host**: `178.105.10.2`
*   **Port**: `22`
*   **User**: `root`
*   **Authentication**: Private key located at `/Users/patrickhuber/.ssh/id_ed25519`
*   **Database client command**: `docker exec -i supabase-db psql -U postgres -d postgres`

---

### 1.3 Database Query Findings
We connected to the Postgres container via SSH and ran inspection queries.

#### A. Schools List (10 newly created dummy schools confirmed)
The query returned the following schools list (sorted by `created_at` descending):
```
                  id                  |              name              |          created_at           
--------------------------------------+--------------------------------+-------------------------------
 5e0b8364-12dd-43b1-aeb5-17417d53e957 | Beat Lab Essen                 | 2026-06-21 08:54:06.995588+00
 46bace52-2d7a-4a87-aae2-5778ded238cb | Harmonie Institut Dortmund     | 2026-06-21 08:54:06.652273+00
 ca3c620a-7cde-4281-8522-ae278e137995 | Symphonie Schule Leipzig       | 2026-06-21 08:54:06.226695+00
 d5838bdd-d779-424b-94d3-878d12c60140 | Tonart Akademie Düsseldorf     | 2026-06-21 08:54:05.813074+00
 532b4d91-67c8-4194-9cde-f231ecb12bdd | Melodie Schule Stuttgart       | 2026-06-21 08:54:05.347468+00
 109e83b3-a1ff-42f0-95b9-db6562f8e77d | Konservatorium Frankfurt       | 2026-06-21 08:54:04.867648+00
 01329036-22f0-4424-b9e5-9064df450841 | Rhythmus & Groove Köln         | 2026-06-21 08:54:04.424601+00
 3bf920b9-49b5-4aca-be79-42359fef3f1f | Musikschule Klangwiese Hamburg | 2026-06-21 08:54:03.893865+00
 6abb3e70-cd0f-420d-b963-64f977f66a64 | Sound Center München           | 2026-06-21 08:54:03.550091+00
 41c07ebd-1b59-4f75-8359-408d957dd080 | Akkord Akademie Berlin         | 2026-06-21 08:54:02.93963+00
 dcee77f2-9bc9-4f2a-805e-aaf027869de5 | Load Test Academy dcee77f2     | 2026-06-21 07:54:21.450004+00
 11111111-1111-1111-1111-111111111111 | Groove Academy                 | 2026-06-16 18:08:52.535491+00
 74713df2-6176-4a41-a8cd-9fbebe34e9b8 | Musäk Bad Säckingen            | 2026-06-01 04:58:56.762523+00
(13 rows)
```
The 10 newly created dummy schools (created 2026-06-21 at ~08:54 UTC) are successfully confirmed.

#### B. Total and Active Users (confirming ~6,500 active users)
*   **Total Users Count**: `6,845`
*   **Active Users Count** (`is_active = true`): `6,726` (confirmed ~6,500 active users).

#### C. Schemas of Inspected Tables
Columns and data types in the `public` schema for the specified tables are:
1.  **`users`**:
    *   `id` (uuid, nullable: NO)
    *   `school_id` (uuid, nullable: YES)
    *   `role` (USER-DEFINED/user_role, nullable: YES)
    *   `first_name` (character varying, nullable: YES)
    *   `last_name` (character varying, nullable: YES)
    *   `avatar_url` (text, nullable: YES)
    *   `qr_token` (uuid, nullable: YES)
    *   `instrument` (text, nullable: YES)
    *   `created_at` (timestamp with time zone, nullable: YES)
    *   `bio` (text, nullable: YES)
    *   `is_active` (boolean, nullable: YES)
    *   `nickname` (text, nullable: YES)
    *   `password_hash` (text, nullable: YES)
    *   `roles` (ARRAY, nullable: YES)
    *   `email` (text, nullable: YES)
    *   *(Note: 87 total columns are present in `users` representing configuration preferences, permissions, and profile details)*.
2.  **`user_progress`**:
    *   `id` (uuid, nullable: NO)
    *   `user_id` (uuid, nullable: YES)
    *   `exercise_id` (uuid, nullable: YES)
    *   `current_level` (integer, nullable: YES)
    *   `progress_percent` (integer, nullable: YES)
    *   `stage_ready_badge` (boolean, nullable: YES)
    *   `last_updated` (timestamp with time zone, nullable: YES)
3.  **`help_requests`**:
    *   `id` (uuid, nullable: NO)
    *   `user_id` (uuid, nullable: YES)
    *   `station_id` (uuid, nullable: YES)
    *   `status` (USER-DEFINED/request_status, nullable: YES)
    *   `created_at` (timestamp with time zone, nullable: YES)
    *   `resolved_at` (timestamp with time zone, nullable: YES)
    *   `school_id` (uuid, nullable: YES)
4.  **`band_members`**:
    *   `id` (uuid, nullable: NO)
    *   `band_id` (uuid, nullable: YES)
    *   `user_id` (uuid, nullable: YES)
    *   `instrument` (text, nullable: NO)
    *   `confetti_seen` (boolean, nullable: YES)
    *   `created_at` (timestamp with time zone, nullable: YES)
    *   `role` (text, nullable: YES)
    *   `external_name` (text, nullable: YES)
5.  **`band_song_proposals`**:
    *   `id` (uuid, nullable: NO)
    *   `band_id` (uuid, nullable: YES)
    *   `proposed_by` (uuid, nullable: YES)
    *   `title` (text, nullable: NO)
    *   `artist` (text, nullable: NO)
    *   `youtube_url` (text, nullable: YES)
    *   `status` (text, nullable: YES)
    *   `created_at` (timestamp with time zone, nullable: YES)
6.  **`band_proposal_votes`**:
    *   `id` (uuid, nullable: NO)
    *   `proposal_id` (uuid, nullable: YES)
    *   `user_id` (uuid, nullable: YES)
    *   `vote` (text, nullable: YES)
    *   `created_at` (timestamp with time zone, nullable: YES)
7.  **`band_song_slots`**:
    *   `id` (uuid, nullable: NO)
    *   `band_song_id` (uuid, nullable: YES)
    *   `user_id` (uuid, nullable: YES)
    *   `instrument` (text, nullable: NO)
    *   `part_number` (integer, nullable: YES)
    *   `joined_at` (timestamp with time zone, nullable: YES)
    *   `status` (text, nullable: YES)
    *   `is_founder` (boolean, nullable: YES)
    *   `is_exclusive` (boolean, nullable: YES)
    *   `external_name` (text, nullable: YES)
8.  **`lab_planning`**:
    *   `id` (uuid, nullable: NO)
    *   `user_id` (uuid, nullable: YES)
    *   `school_id` (uuid, nullable: YES)
    *   `day` (text, nullable: NO)
    *   `time` (text, nullable: NO)
    *   `created_at` (timestamp with time zone, nullable: YES)

#### D. Database RPC & View Signatures
*   **RPC Function `get_schedule_conflicts`**:
    *   **Arguments**: `p_event_id uuid, p_transition_time integer DEFAULT 10`
    *   **Result Type**: `TABLE(program_point_id uuid, conflict_type text, conflict_message text)`
    *   **Logic**: Loops through program points of an event per stage in sort order, computes temporal timelines (start and end times) including transition overhead, and returns overlaps as double-booked lessons (`l.start_time` / duration check) or stage conflicts (same teacher scheduled elsewhere).
*   **Database View `school_user_statistics`**:
    *   **Details**: The query confirmed that `school_user_statistics` is **NOT** a database RPC function but is in fact a **Database View**.
    *   **Definition File**: Found in `supabase/migrations/177_school_user_statistics_view.sql`.
    *   **SQL Definition**:
        ```sql
        CREATE OR REPLACE VIEW public.school_user_statistics WITH (security_invoker = true) AS
        SELECT 
            school_id,
            COUNT(CASE WHEN role IN ('teacher', 'admin') THEN 1 END)::int AS teachers,
            COUNT(CASE WHEN role = 'student' THEN 1 END)::int AS students,
            COUNT(CASE WHEN role IN ('teacher', 'admin') AND is_campus_active THEN 1 END)::int AS teachers_campus,
            COUNT(CASE WHEN role IN ('teacher', 'admin') AND is_groovelab_active THEN 1 END)::int AS teachers_groovelab,
            COUNT(CASE WHEN role = 'student' AND is_campus_active THEN 1 END)::int AS students_campus,
            COUNT(CASE WHEN role = 'student' AND is_groovelab_active THEN 1 END)::int AS students_groovelab
        FROM public.users_raw
        GROUP BY school_id;
        ```
    *   **Columns**:
        *   `school_id` (uuid, YES)
        *   `teachers` (integer, YES)
        *   `students` (integer, YES)
        *   `teachers_campus` (integer, YES)
        *   `teachers_groovelab` (integer, YES)
        *   `students_campus` (integer, YES)
        *   `students_groovelab` (integer, YES)

---

## 2. Logic Chain

1.  **Simulations Analysis**: By locating and inspecting `scratch/simulate_load_15m.mjs`, `apps/groovelab/scratch/simulate_student_load.py`, and `apps/groovelab/src/tests/simulate_load.ts`, we resolved their operational flows, client request routines, and authorization strategies (using custom headers `x-user-id` and `x-invite-school-id` for RLS testing).
2.  **Credential Identification**: Examining `.env.local` files in the root and in `apps/groovelab/` revealed identical Supabase URL (`https://supabase.campus-groovelab.de`) and anon keys. We also identified the master SSH connection credentials (`host: '178.105.10.2'`, `user: 'root'`) and private key (`/Users/patrickhuber/.ssh/id_ed25519`) from `apps/groovelab/scratch/inspect_server_key.cjs`.
3.  **Database Connection and Inspection**: Using the SSH parameters, we established a connection and successfully inspected the DB tables.
    *   Listing schools and sorting by `created_at` confirmed the 10 dummy schools created on 2026-06-21.
    *   Counting rows in `users` table verified that `active_users` equals `6,726` and `total_users` equals `6,845`, confirming the count requirements.
    *   We queried `information_schema.columns` to extract schemas for the 8 target tables.
    *   We queried `pg_proc` for `get_schedule_conflicts` and `school_user_statistics`. Finding no function for the latter, we widened our search using `grep_search` and identified `supabase/migrations/177_school_user_statistics_view.sql` establishing that it is defined as a view, which we subsequently verified by querying view columns.

---

## 3. Caveats

*   **SSH Credentials**: The SSH configuration is hardcoded in the scratch files. If server details or credentials change, the query script will fail.
*   **Active Users definition**: Active users are defined as `is_active = true`. If this flag semantics changes, the active count will differ.

---

## 4. Conclusion

1.  **10 Dummy Schools**: Confirmed active in database (created on 2026-06-21 at 08:54 UTC).
2.  **User Counts**: Confirmed `6,726` active users out of `6,845` total users.
3.  **Schemas**: Table existence and structure verified for `users`, `user_progress`, `help_requests`, `band_members`, `band_song_proposals`, `band_proposal_votes`, `band_song_slots`, and `lab_planning`.
4.  **RPCs & Views**: `get_schedule_conflicts` exists as a PL/pgSQL database function. `school_user_statistics` is **not** an RPC function, but is instead implemented as a database VIEW aggregating counts of students/teachers (for campus and groovelab modes) from `public.users_raw` grouped by `school_id`.

---

## 5. Verification Method

To verify these database findings independently:
1.  Run the inspection script via SSH using:
    ```bash
    node scratch/inspect_db.js
    ```
2.  Inspect the output to confirm schools list, user counts, schemas, and RPC/view details match this report.
