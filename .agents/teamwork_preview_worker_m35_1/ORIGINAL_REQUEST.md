## 2026-06-17T18:23:32Z
You are the UI Overhaul Worker (teamwork_preview_worker).
Your working directory is: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_m35_1

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement the frontend UI for the Event Coordinator Overhaul in `apps/groovelab/src/components/CampusEventsBoard.tsx`.

Follow these specific requirements:

1. **Role-Based Column Layout**:
   - For **Admins & Secretaries**:
     - Column 1: Campus & Schultermine (timeline of all events).
     - Column 2: Event-Planungs-Modul (detailed coordinator dashboard for the selected event). If no event is selected, render a styled placeholder (e.g. "Bitte ein Event aus der Timeline auswählen").
     - Column 3: Infos der Verwaltung (announcements).
     - CSS Grid layout style: `gridTemplateColumns: 'minmax(360px, 1.5fr) minmax(380px, 1.8fr) minmax(300px, 1.2fr)'`.
   - For **Teachers**:
     - Column 1: My Lessons (personal lessons list).
     - Column 2: Campus & Schultermine (timeline of all events).
     - Column 3: Event Planung (teacher planner for the selected event). If no event is selected, display "Keine aktiven Event-Planungen". If selected, show submission forms and feedback inline answers.
     - CSS Grid layout style: `gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(360px, 1.5fr) minmax(300px, 1fr)'`.
   - For **Students / Guests**:
     - Column 1: My Lessons.
     - Column 2: Campus & Schultermine.
     - Column 3: Infos der Verwaltung.
     - CSS Grid style: standard layout `'minmax(320px, 1.2fr) minmax(360px, 1.5fr) minmax(300px, 1fr)'`.

2. **Sequential 5-Tab Admin/Secretary Planner UI (Column 2)**:
   When an admin or secretary clicks on an event, render a panel with 5 navigation tabs:
   - **Tab 1: Eckdaten (Basic Info)**:
     - Form to edit event-specific settings:
       - Bühnenanzahl (`stage_count`): integer input (validated from 1 to 10).
       - Gesamtdauer (`total_duration`): integer input.
       - Programmdauer (`program_duration`): integer input.
     - Save button that calls Supabase client update on `campus_events` and updates local state.
   - **Tab 2: Rückmeldungen (Feedback Requests)**:
     - Show list of program points for the event.
     - Display questions and answers from `additional_feedback_responses` JSONB field.
     - Provide form to request feedback for a specific point: inputs to add/manage a list of questions (string array). Submitting updates the JSONB payload in the database with status `'pending'`, the questions list, and empty answers.
   - **Tab 3: Programmplanung (Program Timeline)**:
     - Group and render program points by stage (from 1 to `stage_count`).
     - Display action buttons for each program point: Approve (status='approved'), Reject (status='rejected'), change stage number.
     - Reordering buttons (Up/Down arrow icons) to swap `sort_order` values in the database for points on the same stage.
     - Add Pause button: form to insert a pause program point with `is_pause = true`, editable `duration` and `stage_number` (other fields set to reasonable defaults like name='Pause', status='approved').
     - Timeline math: calculate starting times chronologically per stage, starting at the event's `start_time` and adding durations cumulatively for all approved acts/pauses. Render these times clearly.
   - **Tab 4: Technikplanung (Technical Planning)**:
     - Display consolidated totals per stage and overall:
       - Total chairs needed (`chairs_needed`).
       - Total music stands needed (`music_stands_needed`).
       - Combined list of technical requirements (`tech_requirements`) and remarks (`remarks`).
   - **Tab 5: Export**:
     - Checkbox list for all customizable export columns.
     - "Export CSV" button: generates a CSV string using `;` (semicolon) delimiter, headers, and rows for approved acts and pauses (ordered by stage and sort_order). Trigger browser file download (e.g. `data:text/csv;charset=utf-8,...`).

3. **Teacher Event Planner UI (Column 3)**:
   When a teacher selects an event:
   - Provide a program point submission form: fields for Name, Ensemble/Band, Spieldauer, Wunschzeit, Technikbedarf, Stühle, Notenständer, Bemerkung, and publisher/composer fields. Submitting inserts a new point.
   - List the teacher's own program points for the event with their status (submitted/approved/rejected).
   - Display inline feedback response forms for points with status `'pending'` feedback: show questions and text inputs for the teacher to write answers. Submitting updates the answers and sets status to `'responded'`.
   - Announcement redirection: clicking on a coordinator announcement in the announcements widget must automatically select that event and open/focus/scroll to the program point submission form.

4. **Styling & TypeScript Compliance**:
   - Style all elements to match GrooveLab's modern, high-contrast, clean design (rounded cards, spacing, shadows, lucide icons).
   - Ensure the component compiles perfectly without TypeScript errors. Run:
     - `npx tsc --noEmit -p apps/groovelab/tsconfig.json` or `npm run build`
   - Run the E2E test suite in both Mock and Real modes to ensure all 115 tests still pass:
     - `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
     - `USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`

5. **Document your work**:
   - Write a detailed handoff report inside `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_m35_1/handoff.md` detailing the changes made, compilation results, and E2E test suite runs.
   - Send a message to the Orchestrator with the conversation ID 69ffd978-b35b-402e-a504-0da3b48bc6d2 informing them of completion.
