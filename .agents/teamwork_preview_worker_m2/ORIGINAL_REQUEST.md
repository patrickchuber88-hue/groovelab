## 2026-06-28T20:27:32Z
You are teamwork_preview_worker. Your working directory is /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_m2.

Your goals are:
1. Create directory `apps/groovelab/public/screenshots` if it does not exist.
2. Copy the 4 screenshot files from:
   - `/Users/patrickhuber/.gemini/antigravity/brain/51dc4a45-6c04-4394-8d1a-6997e87e668b/media__1782677535200.png`
   - `/Users/patrickhuber/.gemini/antigravity/brain/51dc4a45-6c04-4394-8d1a-6997e87e668b/media__1782677645630.png`
   - `/Users/patrickhuber/.gemini/antigravity/brain/51dc4a45-6c04-4394-8d1a-6997e87e668b/media__1782677784641.png`
   - `/Users/patrickhuber/.gemini/antigravity/brain/51dc4a45-6c04-4394-8d1a-6997e87e668b/media__1782677784662.png`
   into `apps/groovelab/public/screenshots/`.
3. Install `react-router-dom` dependency in `apps/groovelab` using `npm install react-router-dom -w apps/groovelab` (or run it inside the `apps/groovelab` directory). Make sure typescript types are also available.
4. Create the new React component `apps/groovelab/src/components/LandingPage.tsx` based on `landing_page_concept.md`.

STYLING & NAMING CONSTRAINTS:
- Refer to the platform as **Campus-Groovelab** in all UI elements, user communications, messages, and document descriptions. Precise spelling is mandatory.
- The software license is always 100% free of charge ("100% kostenlos").
- Primary Theme Colors:
  - In Administration/Secretariat, the primary color accents must be red (e.g. `#ea4335`, `#fce8e6` for backgrounds).
  - In the Campus module, the primary color accents must be green (e.g. `#137333`, `#e6f4ea`/`#d1fae5` for backgrounds).
- Emojis/icons in active UI components must be monochrome/single color. Avoid colored/multi-color graphics/emojis.
- Layout:
  - CSS Grid with `gap: 64px` for sections, flexbox layouts with `flex-wrap: wrap`.
  - No hardcoded heights. Use `height: auto` + padding.

LANDING PAGE DESIGN REQUIREMENTS:
- Header/Sticky navigation: Logo "Campus-Groovelab", Dropdowns (Funktionen, Zielgruppen, Preise), Login ("Anmelden") link, CTA ("Kostenlos registrieren").
- Hero section: H1 "Campus-Groovelab brings deine Musikschule zum Klingen. Einfach organisiert, voll vernetzt.", H2 "Die erste voll integrierte Plattform...", Email Input + "Jetzt kostenlos starten" CTA, schedule board screenshot mockup (`/screenshots/media__1782677535200.png`) with drop-shadow.
- Three Target Audience Columns (Secretariat - red; Teachers - green; Students/Parents - green).
- Interactive USP Detail Tabs: Dynamic state-controlled selector for the 3 USPs, changing description and image on the right.
- DSGVO-Sicherheit section ("Security by Design", Supabase RLS).
- Pricing section ("100% kostenlos" for software license).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your handoff.md in your working directory summarizing changes made and verification results.

## 2026-07-12T19:36:06Z
You are a teamwork_preview_worker.
Your working directory is: `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_m2`
Your mission is to develop and test the load simulation and scaling script.

### Requirements:
1. **R1. Check Database & Generate Mock Data**:
   - Check if there are already 8 schools, 400 teachers, and 4,000 students in the database.
   - If not, write a script to generate the required schools and users.
   - Ensure the student names are strictly anonymized: "Firstname Lastinitial" (e.g. "Lucas M."). No student email, SEPA, or contract data can be generated.
   - All generated data must be easily identifiable (e.g., using a prefix or a dedicated column/metadata) so it can be 100% cleaned up.
   - Ensure you follow the platform rules in `.agents/AGENTS.md` (specifically Campus-Groovelab platform name, no musician avatars for admin/secretary, free base license, zero data privacy leaks).

2. **R2. Implement Simulation Logic**:
   - Create a script `scratch/simulate_load_scaling.mjs` that uses the Supabase client connection (using details from `.env.local` and the service key/anon key).
   - The script must simulate active usage of the following actions:
     * Sickness report (Krankheitsmeldung): update teacher `sick_until`/`sick_start` in `users`, insert to `crisis_notifications` and `system_alerts`.
     * Reschedule (Terminverschiebung): update `schedule_occurrences` and delete/insert `room_bookings`.
     * Room booking (Räume buchen): insert into `room_bookings`.
     * Homework book (Digitales Hausaufgabenheft): update `progress_matrix` topic and notes.
     * Audio recording & Loopstation activities: upload mock audio blobs to `'campus-assets'` storage bucket under `avatars/` and update `progress_matrix` homework notes with `AUDIO:url...` format.
     * XP gathering & sticker rewards: update `student_stats`, `avatars` and append `STICKER:stickerId...` to `progress_matrix.homework_notes`.
     * Focus timer: insert into `fokus_logs` and `focus_sessions` and update `student_stats`.
   - The script should run the load simulation concurrently for the specified number of schools, teachers, and students.
   - Collect and calculate metrics: Total Requests, Success Rate, p95 Latency, Error Rate, and breakdown of errors (RLS, Database, Logic).

3. **R3. Implement VPS Monitoring**:
   - Connect to VPS `178.105.10.2` via SSH (port 22, user `root`, password `LlYoQzfwy$v=`).
   - Query uptime, CPU load (from `/proc/loadavg`), free memory (`free -m`), disk usage (`df -h`).
   - Identify the most resource-intensive database/API queries or functions.

4. **R4. Implement Scaling and Iteration Loop**:
   - Run the simulation starting with 8 schools, 50 teachers, 500 students per school.
   - Measure the metrics (CPU load on VPS, p95 latency, error rate).
   - If CPU load < 8.0 AND p95 latency < 800ms AND error rate < 8%, double the schools and user numbers (e.g., 16 schools, 100 teachers, 1000 students/school).
   - Repeat this check and scaling iteration until a limit is detected (i.e., one of the conditions is violated) or you reach a practical maximum.
   - Run a short test duration per scaling iteration (e.g., 1 to 2 minutes) to prevent long waiting times, but ensure there is enough load.

5. **R5. Implement Full Cleanup**:
   - Write a cleanup routine to completely purge all generated test data (schools, users, bookings, schedules, occurrences, notifications, alerts, progress_matrix rows, avatars, stats, logs, and files in Supabase storage).
   - Ensure the database is restored to its exact original state.

### MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please write the script, run a dry-run to verify it works, document the code and outputs, and write your progress to `progress.md` and handoff report to `handoff.md` in your working directory. Notify me when done.

