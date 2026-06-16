# Handoff Report — Event Planning Board Overhaul Architectural Discovery

This report outlines the architectural findings, database schemas, and technical strategy for implementing the event planning board overhaul in the Groovelab app.

---

## 1. Observation

### 1.1 Core UI Components and Entry Points
Through codebase search and directory listing, the following frontend UI components were found to be responsible for event, lesson, and administrative scheduling:
*   **`apps/groovelab/src/components/CampusEventsBoard.tsx`**: The main calendar and events board. It is used by students, teachers, admins, and secretaries.
    *   Line 30-36: Props interface definition:
        ```typescript
        interface CampusEventsBoardProps {
          userId: string;
          role: 'student' | 'teacher' | 'admin' | 'secretary';
          schoolId: string;
          supabase: any;
          brandColor: string;
        }
        ```
    *   Line 1326-1334: A three-column grid layout is rendered for all users:
        ```typescript
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(360px, 1.5fr) minmax(300px, 1fr)',
            gap: '24px',
            ...
        ```
        *   **Column 1**: "Unterrichtstermine" (My Lessons) displays individual schedules (lines 1356-1747).
        *   **Column 2**: "Schultermine & Events" (Public and school events timeline, lines 1748-2072).
        *   **Column 3**: "Termin anlegen" (Create Event Form sidebar, lines 2073-2826).
*   **`apps/groovelab/src/App.tsx`**: Handles role-based routing and shell layout.
    *   Line 5722-5733: Renders `<SecretaryDashboard>` for secretaries and admins.
    *   Line 8768-8780: Renders `<AdminDashboard>` for admins and teachers.
*   **`apps/groovelab/src/components/SecretaryDashboard.tsx`**:
    *   Line 13541-13552: Renders `<CampusEventsBoard>` when the active tab is `'events'`:
        ```typescript
        {campusSubTab === 'events' && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <CampusEventsBoard
              userId={userId || ''}
              role="secretary"
              schoolId={schoolId}
              supabase={supabase}
              brandColor="#34a853"
            />
          </div>
        )}
        ```
*   **`apps/groovelab/src/components/AdminDashboard.tsx`**:
    *   Line 12787-12795: Renders `<CampusEventsBoard>` when the active tab is `'events'`:
        ```typescript
        {activeTab === 'events' && (
          <CampusEventsBoard 
            userId={userId}
            role={admin?.role || 'teacher'}
            schoolId={admin?.school_id || ''}
            supabase={supabase}
            brandColor={brandColor}
          />
        )}
        ```
*   **`apps/groovelab/src/components/CampusTeacherDashboard.tsx`**:
    *   Imported in `SecretaryDashboard.tsx` (Line 17) but currently **not instantiated** in the main routing tree of `App.tsx`. Teachers in Campus mode are routed through `<AdminDashboard>` which mounts `TeacherDashboard` under the `'live'` tab.

### 1.2 Database Schema & Migrations
The database backend runs on Supabase (self-hosted PostgreSQL).
*   **`public.campus_events` Table**: Defined in `supabase/migrations/118_add_school_calendar_url.sql` (lines 5-17):
    ```sql
    CREATE TABLE IF NOT EXISTS public.campus_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        event_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME,
        category TEXT NOT NULL DEFAULT 'Sonstiges',
        created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ```
    *   `124_fix_campus_events_rls.sql`: Adds `is_public` (boolean, default true).
    *   `125_room_bookings.sql`: Adds `location_type` (text, default 'none'), `room_id` (UUID references rooms), `location_extern` (text).
    *   `127_campus_events_color_and_visibility.sql`: Adds `color` (text) and `visibility` (text, default 'all').
    *   `scratch/add_assigned_student_ids.js`: Adds `assigned_student_ids` (UUID[] default '{}').
*   **`public.campus_announcements` Table**: Defined in `supabase/migrations/72_add_band_shoutbox_is_announcement.sql`:
    ```sql
    CREATE TABLE IF NOT EXISTS public.campus_announcements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        target_type TEXT DEFAULT 'all' CHECK (target_type IN ('all', 'students', 'teachers')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ```
*   **Legacy API Controllers**: Inside `packages/shared/src/controllers/` (e.g. `campusTeacherController.ts`, `secretaryController.ts`), there are Express-based handlers. However, there is no Express package installed, and these controllers are never imported or called in `apps/groovelab`. Instead, the app interacts directly with the database using the client-side Supabase SDK.

### 1.3 Client Security & Authentication Headers
`apps/groovelab/src/lib/supabase.ts` sets up the Supabase JS client and wraps fetch to dynamically inject session identifiers:
*   Lines 20-34:
    ```typescript
    const userId = sessionStorage.getItem('groovelab_user_id');
    if (userId) {
      headers.set('x-user-id', userId);
    }
    const kioskToken = localStorage.getItem('groovelab_kiosk_token');
    if (kioskToken) {
      headers.set('x-kiosk-token', kioskToken);
    }
    const qrToken = sessionStorage.getItem('groovelab_qr_token');
    if (qrToken) {
      headers.set('x-qr-token', qrToken);
    }
    ```
These headers are utilized by Supabase RLS functions (like `public.get_current_user_id()`) to execute row-level security logic.

### 1.4 Build & Test Scripts
*   **Vite Build Command**:
    *   Root `package.json`: `"build:groovelab": "npm run build -w apps/groovelab"`
    *   `apps/groovelab/package.json`: `"build": "tsc && vite build"`
    *   Executing `npm run build:groovelab` compiles TypeScript and outputs production assets into `apps/groovelab/dist/` in ~7 seconds.
*   **Test Command**: No automated test suites (Jest/Vitest/Cypress) are configured in the workspaces. Developers execute verification scripts (e.g., `npx tsx test_query.ts`) to query database tables and test performance or security constraints.

---

## 2. Logic Chain

1.  **Component Mounting & Roles**:
    *   When a Secretary or Administrator logs in and navigates to "Termine" (events), `App.tsx` renders `SecretaryDashboard` or `AdminDashboard`. Both dashboards mount `CampusEventsBoard` with props `role="secretary"` or `role="admin"`.
    *   When a Teacher logs in and navigates to "Termine", `AdminDashboard` renders `CampusEventsBoard` with `role="teacher"`.
2.  **R1 Column Alterations**:
    *   By examining the layout grid of `CampusEventsBoard.tsx` (line 1327), we see it divides into three columns.
    *   Removing Column 1 (My Lessons) for `role === 'secretary' || role === 'admin'` means we conditionally bypass Column 1's JSX and change `gridTemplateColumns` to a two-column structure (e.g. `minmax(400px, 1.4fr) minmax(500px, 2.2fr)`).
    *   Column 2 (Timeline) then spans the left side, and Column 3 (Coordinator panel) occupies the right.
3.  **R2/R3 Event Coordination and Program Points**:
    *   To configure multiple stages and durations, `campus_events` needs to support configuration columns.
    *   A teacher-submitted program point consists of technical and artistic metadata. Storing this in a new table `campus_event_program_points` that references `campus_events` enables direct relationship indexing and isolation.
    *   Admins/secretaries need to order these points sequentially per stage. A `sort_order` (INTEGER) column allows sorting items.
    *   Since pauses act as placeholders in the timeline, they can be represented as rows in the same `campus_event_program_points` table with a flag `is_pause = TRUE`.
4.  **Consolidated Equipment Packlist**:
    *   As teachers specify `chairs_needed` (INT) and `music_stands_needed` (INT) for each act, summing these values for all approved acts on a specific stage yields the stage-level requirements. Summing across all approved acts yields the event-level requirements.
5.  **Export Logic (R4)**:
    *   Since Vite builds a single-page app with client-side routing, we can implement CSV generation entirely on the client. Checking which boxes are selected maps keys to columns, compiling rows from approved acts, and formatting it as a downloadable CSV Blob.

---

## 3. Caveats

*   **Deno Edge Functions**: The `ical-feed` edge function (written in Deno/TypeScript) parses calendar events. If we add custom fields to `campus_events`, it will not affect the `ical-feed` functionality unless we want these program points to also show up in the calendar feeds. For now, it is assumed program points are internal to the event coordinator board and do not need to be exported as distinct calendar events in the general iCal feed.
*   **Legacy Express Code**: The folder `packages/shared/src/controllers/` is unused in the active build. Strategy should focus strictly on React/Supabase client-side modifications and SQL migrations.

---

## 4. Recommendations / Technical Strategy

### 4.1 Suppress Column 1 & Reposition Timeline (R1)
In `apps/groovelab/src/components/CampusEventsBoard.tsx`:
*   Define a boolean helper: `const isVerwaltung = role === 'secretary' || role === 'admin';`
*   In the `return` statement, render `gridTemplateColumns` conditionally:
    ```typescript
    gridTemplateColumns: isVerwaltung 
      ? 'minmax(380px, 1.3fr) minmax(500px, 2.2fr)' 
      : 'minmax(320px, 1.2fr) minmax(360px, 1.5fr) minmax(300px, 1fr)'
    ```
*   Wrap the **Column 1: My Lessons** JSX block in a condition: `{!isVerwaltung && ( ... Column 1 JSX ... )}`.
*   The timeline (Column 2) becomes the left-hand column, and the coordinator panel (Column 3) becomes the right-hand column for administrative users.

### 4.2 Database Migrations (R2 & R3)
Create a new migration file `supabase/migrations/173_event_coordinator_schema.sql`:
```sql
-- 1. Extend campus_events with coordinator parameters
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS num_stages INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS total_duration INTEGER; -- overall duration in minutes
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS program_duration INTEGER; -- planned program duration in minutes
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS additional_feedback_requested TEXT[] DEFAULT '{}';

-- 2. Create program points table
CREATE TABLE IF NOT EXISTS public.campus_event_program_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.campus_events(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    ensemble_band TEXT,
    performer_count INTEGER DEFAULT 1,
    duration INTEGER NOT NULL DEFAULT 5, -- in minutes
    preferred_time TEXT,
    title TEXT,
    artist TEXT,
    composer TEXT,
    arranger TEXT,
    publisher TEXT,
    tech_requirements TEXT,
    chairs_needed INTEGER DEFAULT 0,
    music_stands_needed INTEGER DEFAULT 0,
    remarks TEXT,
    stage_number INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    is_pause BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
    additional_feedback_responses JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS and define policies
ALTER TABLE public.campus_event_program_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_program_points_select ON public.campus_event_program_points FOR SELECT USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
);

CREATE POLICY event_program_points_modify ON public.campus_event_program_points FOR ALL USING (
  public.is_master_admin()
  OR (
    public.check_school_access(school_id)
    AND (
      public.is_teacher_or_admin()
      OR teacher_id = public.get_current_user_id()
    )
  )
);

-- 4. Reload cache
NOTIFY pgrst, 'reload schema';
```

### 4.3 UI Component Implementation

#### A. Event Setup and Coordinator Panel (R2)
Inside the right column of `CampusEventsBoard.tsx` (for secretaries/admins):
1.  **Form Extension**: Add inputs for `num_stages` (Stages, default 1), `total_duration` (minutes), and `program_duration` (minutes) to the event creation form.
2.  **Coordinator UI State**: Add a state `const [selectedEventId, setSelectedEventId] = useState<string | null>(null);`
3.  **Announcements Message Hook**: Add a button "Ausschreiben" for selected events. Clicking it opens a form that triggers:
    ```typescript
    await supabase.from('campus_announcements').insert({
      school_id: schoolId,
      user_id: userId,
      title: `Programmpunkte gesucht für "${event.title}"`,
      message: `Bitte reicht eure Beiträge für das Event am ${event.event_date} ein. Geplante Dauer: ${event.program_duration} Min.`,
      target_type: 'teachers'
    });
    ```
4.  **Sequential Ordering & Program Points Grid**:
    *   Fetch program points:
        ```typescript
        const { data } = await supabase
          .from('campus_event_program_points')
          .select('*')
          .eq('event_id', selectedEvent.id)
          .order('stage_number', { ascending: true })
          .order('sort_order', { ascending: true });
        ```
    *   Map program points into columns by `stage_number`.
    *   Show act title, teacher name, instrument/ensemble, duration, and status (Submitted, Approved, Rejected).
    *   For acts: Approve/Reject buttons, Stage Selection dropdown, and Up/Down arrows to adjust `sort_order`.
    *   "Pause einfügen" Button: Inserts a record with `is_pause: true` and `name: "Pause"` at the end of the sorted list.
    *   Calculate cumulative timeline times starting from `event.start_time` by adding duration of each point sequentially.

#### B. Teacher Dashboard Submission Panel (R2)
When a teacher clicks on an event card in their timeline:
*   Show a form block in the Event Detail Modal: **"Beitrag anmelden"**.
*   Form fields map directly to `campus_event_program_points` table fields.
*   Once submitted, it inserts the record. The list of submissions by this teacher is displayed below the form, allowing them to review, edit, or delete items.

#### C. Packlist Component (R3)
Add a component tab in the Event Coordinator Panel: **"Packliste"**:
*   Filter approved points: `const approvedPoints = programPoints.filter(p => p.status === 'approved' && !p.is_pause);`
*   Aggregate:
    ```typescript
    const totalChairs = approvedPoints.reduce((sum, p) => sum + (p.chairs_needed || 0), 0);
    const totalStands = approvedPoints.reduce((sum, p) => sum + (p.music_stands_needed || 0), 0);
    const techReqs = approvedPoints.map(p => p.tech_requirements).filter(Boolean);
    ```
*   Perform similar aggregates grouped by stage (`stage_number`). Render this as a consolidated overview.

#### D. Custom Excel Export (R4)
Implement a client-side exporter:
1.  Render a checklist of columns (Uhrzeit, Bühne, Lehrer, Ensemble, Anzahl Auftretende, Titel, Interpret, Komponist, Arrangeur, Verlag, Technikbedarf, Stühle, Notenständer, Wunschzeit, Bemerkung).
2.  Generate a CSV string with a BOM header so that Microsoft Excel loads it without character issues:
    ```typescript
    const handleExport = (selectedCols: string[]) => {
      let csvContent = '\uFEFF'; // UTF-8 BOM
      csvContent += selectedCols.join(';') + '\n';
      
      programPoints.forEach(point => {
        const row = selectedCols.map(col => {
          switch (col) {
            case 'Uhrzeit': return point.calculated_time;
            case 'Bühne': return `Bühne ${point.stage_number}`;
            case 'Lehrer': return point.teacher_name;
            // Map other cases...
            default: return '';
          }
        });
        csvContent += row.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(';') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `programmablauf_${event.title}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    ```

---

## 5. Verification Method

To independently verify the implementation, follow these steps:

### 5.1 Compilation Verification
Execute the project's build command from the workspace root directory:
```bash
npm run build:groovelab
```
*Verification condition*: The command must terminate with `built in X.XXs` and report 0 TypeScript compilation or syntax errors.

### 5.2 Database and RLS Query Verification
Add a test block to `test_query.ts` to fetch program points:
```typescript
const { data, error } = await supabase
  .from('campus_event_program_points')
  .select('*')
  .eq('school_id', schoolId);
console.log(`Fetched ${data?.length} program points, error:`, error?.message);
```
Execute using the TypeScript runner:
```bash
npx tsx test_query.ts
```
*Verification condition*: The query must execute successfully without throwing Postgres RLS violations.
