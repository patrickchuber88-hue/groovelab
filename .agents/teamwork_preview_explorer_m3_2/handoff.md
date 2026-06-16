# Handoff Report — CampusEventsBoard UI & Coordinator Layout Analysis

## 1. Observation

### 1.1 CampusEventsBoard Component Layout
The component responsible for the events board is located at `apps/groovelab/src/components/CampusEventsBoard.tsx`.
It renders a three-column layout utilizing inline CSS Grid styles on lines 1325-1334:
```typescript
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(360px, 1.5fr) minmax(300px, 1fr)',
      gap: '24px',
      alignItems: 'start',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      width: '100%',
      boxSizing: 'border-box',
      padding: '0px'
    }} className="animation-fade-in">
```
*   **Column 1 (Unterrichtstermine)**: Rendered at lines 1355-1747, displaying student/teacher lesson schedules. Its container has `height: 'calc(100vh - 120px)'` (line 1365).
*   **Column 2 (Campus & Schultermine)**: Rendered at lines 1748-2072, displaying timeline events. Its container has `height: 'calc(100vh - 120px)'` (line 1758).
*   **Column 3 (Eigene Termine / Sidebar)**: Rendered at lines 2073-2826, displaying the event creation form for teachers/admins or assigned events for students. Its container has `height: 'calc(100vh - 120px)'` (line 2083) and `overflowY: 'auto'` (line 2084).

### 1.2 Prop Structure and Roles
The component receives `role` as a prop in `CampusEventsBoardProps` (lines 30-36):
```typescript
interface CampusEventsBoardProps {
  userId: string;
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  schoolId: string;
  supabase: any;
  brandColor: string;
}
```
Currently, the component does not conditionally hide Column 1 or dynamically adjust column widths based on the user's role.

### 1.3 Supabase Coordinator Schema
The migration `supabase/migrations/173_event_coordinator_schema.sql` extends the database schema to support event coordination features:
*   Lines 8-11:
    ```sql
    ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS stage_count INTEGER DEFAULT 1 NOT NULL;
    ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS total_duration INTEGER;
    ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS program_duration INTEGER;
    ```
*   Lines 32-57: Creates the `public.campus_event_program_points` table which represents acts and pauses under an event, including columns for `stage_number` (default 1), `sort_order` (default 0), `is_pause` (default false), `chairs_needed`, `music_stands_needed`, `tech_requirements`, and `status` ('submitted', 'approved', 'rejected').

### 1.4 Layout Guidelines (CLAUDE.md)
The file `CLAUDE.md` specifies strict constraints for layout designs:
*   Line 8: `Viewport Adaptability: UI components must scale down gracefully without squishing content or causing text collisions on smaller viewports.`
*   Line 9-11: `Fluid Wrap standard: Always prefer responsive Flexbox layouts with wrapping enabled (...) or CSS Grid templates with auto-fit parameters (...). Use defensible flex-basis settings (...) so columns flow vertically on mobile screens.`
*   Line 12: `No Hardcoded Heights: Never hardcode fixed pixel heights (height: '250px') on text containers or text-wrapping cards. Use fluid sizing (minHeight, height: 'auto') combined with standard padding so that cards grow naturally when content increases.`

---

## 2. Logic Chain

1.  **Hide Lesson Column**: Because admins and secretaries do not have individual lesson schedules, Column 1 ("Unterrichtstermine") should be completely hidden when `role === 'admin' || role === 'secretary'`. This can be achieved by checking `const isVerwaltung = role === 'admin' || role === 'secretary';` and conditionally wrapping the Column 1 JSX block in `{!isVerwaltung && ( ... )}`.
2.  **Reposition Timeline and Adjust Grid**:
    *   For students and teachers, the layout must remain a 3-column grid.
    *   For admins/secretaries, Column 1 is hidden. To keep the timeline (Column 2) on the left side of the screen and the coordinator sidebar (Column 3) on the right side, the CSS grid container's `gridTemplateColumns` style must be adjusted conditionally:
        ```typescript
        gridTemplateColumns: isVerwaltung 
          ? 'minmax(360px, 1.8fr) minmax(300px, 1.2fr)' 
          : 'minmax(320px, 1.2fr) minmax(360px, 1.5fr) minmax(300px, 1fr)'
        ```
3.  **Ensure Responsiveness and Viewport Adaptability**:
    *   Currently, the 3 columns are forced side-by-side using CSS grid without media queries. On smaller viewports (widths < 1024px), this causes overflow and squishing.
    *   Adding media queries that collapse the grid to `grid-template-columns: 1fr` and reset heights to `height: auto` on small screens meets the `CLAUDE.md` viewport adaptability rules.
4.  **Design Coordinator Sidebar in Column 3**:
    *   In the sidebar (Column 3), admins and secretaries need to toggle between creating a new event ("Event erstellen") and coordinating a selected event ("Event-Koordination").
    *   When an event is clicked in Column 2, it should set an `activeCoordinatedEvent` state and switch the coordinator tab to `'coordinate'`.
    *   The coordinator panel will draw data from `campus_events` and `campus_event_program_points` tables to manage acts/pauses, order them per stage, view the aggregated equipment packlist (chairs and music stands), and trigger client-side CSV exports.

---

## 3. Caveats

*   **Teacher program point entry**: While the database schema supports program point submissions, this analysis concentrates on the admin/secretary coordinator dashboard and layout changes (Milestone M3). Teacher entry and submissions (Milestone M4) will be handled separately.
*   **Supabase Client Instance**: The component accesses the database via `supabase` prop directly. RLS policies established in migration 173 automatically govern access, but the front-end will need to handle authentication tokens correctly (e.g. injecting the header `x-user-id` as defined in `supabase.ts`).

---

## 4. Conclusion

For Milestone M3, the `CampusEventsBoard.tsx` layout should be modified to support a dual-layout structure: a 3-column view for students/teachers and a 2-column coordinator view for admins/secretaries. Adding responsive CSS classes will prevent layout squishing on mobile screens.

Here are the exact recommended edits:

### Edit 1: State Initialization (Top of Component, around line 81)
Add the following states to track the coordinated event and program points:
```typescript
  const [activeCoordinatedEvent, setActiveCoordinatedEvent] = useState<any | null>(null);
  const [coordinatorTab, setCoordinatorTab] = useState<'create' | 'coordinate'>('create');
  const [programPoints, setProgramPoints] = useState<any[]>([]);
  const [loadingProgramPoints, setLoadingProgramPoints] = useState(false);
  const [isPublishingAnn, setIsPublishingAnn] = useState(false);

  const isVerwaltung = role === 'admin' || role === 'secretary';

  // Fetch program points for the coordinated event
  const fetchProgramPoints = async (eventId: string) => {
    setLoadingProgramPoints(true);
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .select('*')
        .eq('event_id', eventId)
        .order('stage_number', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setProgramPoints(data || []);
    } catch (err) {
      console.error('Error fetching program points:', err);
    } finally {
      setLoadingProgramPoints(false);
    }
  };
```

### Edit 2: Event Click Selection (around line 466)
Modify `handleSelectEvent` to automatically load the clicked event into the coordinator sidebar:
```typescript
  const handleSelectEvent = (ev: any) => {
    const colors = getEventColors(ev);
    const isMyEvent = ev.created_by === userId;
    setSelectedEvent({ ...ev, isMyEvent, catColor: colors.color, catBg: colors.bg });
    setEditVisibility(ev.visibility || 'all');
    
    if (isVerwaltung) {
      setActiveCoordinatedEvent(ev);
      setCoordinatorTab('coordinate');
      fetchProgramPoints(ev.id);
    }
  };
```

### Edit 3: Grid Container & Style Block (lines 1324-1354)
Update the container to use a dynamic columns grid and add responsive class overrides:
```typescript
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isVerwaltung 
        ? 'minmax(360px, 1.8fr) minmax(300px, 1.2fr)' 
        : 'minmax(320px, 1.2fr) minmax(360px, 1.5fr) minmax(300px, 1fr)',
      gap: '24px',
      alignItems: 'start',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      width: '100%',
      boxSizing: 'border-box',
      padding: '0px'
    }} className="animation-fade-in campus-events-grid">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes calendarPulse {
          0% { transform: scale(1); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35); }
          50% { transform: scale(1.08); box-shadow: 0 6px 20px rgba(239, 68, 68, 0.55); }
          100% { transform: scale(1); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35); }
        }
        .pulse-calendar {
          animation: calendarPulse 2s infinite ease-in-out;
        }
        @media (max-width: 1024px) {
          .campus-events-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .campus-events-column {
            height: auto !important;
            max-height: none !important;
          }
        }
      `}} />
```

### Edit 4: Hide Column 1 and Apply ClassNames
1.  Wrap **Column 1: My Lessons** JSX in `{!isVerwaltung && ( ... )}` and add `className="campus-events-column"`.
2.  Add `className="campus-events-column"` to **Column 2** and **Column 3** containers.

### Edit 5: Column 3 Coordinator Panel Design
Replace the non-student section of Column 3 (lines 2184-2824) with a toggle interface:
*   **Toggle bar** (only rendered if `isVerwaltung` is true):
    ```typescript
    {isVerwaltung && (
      <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
        <button 
          onClick={() => setCoordinatorTab('create')} 
          style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: coordinatorTab === 'create' ? '#ffffff' : 'transparent', fontWeight: 700 }}
        >
          Termin erstellen
        </button>
        <button 
          onClick={() => setCoordinatorTab('coordinate')} 
          style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: coordinatorTab === 'coordinate' ? '#ffffff' : 'transparent', fontWeight: 700 }}
        >
          Koordination
        </button>
      </div>
    )}
    ```
*   **Coordinate View**: If `coordinatorTab === 'coordinate'`:
    *   If `activeCoordinatedEvent` is null: Render a placeholder card: "Wähle einen Termin aus dem Zeitstrahl aus, um ihn zu koordinieren."
    *   If `activeCoordinatedEvent` is loaded:
        *   **Event Info & Settings**: Form fields for `stage_count`, `total_duration`, and `program_duration` with a save button to update the event's configurations.
        *   **Ausschreibung**: A button to insert a row in the `campus_announcements` table calling for program point submissions.
        *   **Programmpunkte list**: Iterates through stages 1 to `stage_count` and lists approved/pending program acts and pauses. Action buttons allow coordinators to approve/reject acts, adjust stage assignments, shift ordering (manipulating `sort_order`), and insert pauses (`is_pause = true`).
        *   **Packliste**: Calculated sums of chairs, stands, and collated tech requirements for the event.
        *   **CSV Exporter**: Selectable columns list and download button generating standard CSV blobs client-side.

---

## 5. Verification Method

### 5.1 Verification Commands
To test compile after applying layout changes, execute:
```bash
npm run build:groovelab
```
The application must compile successfully with zero TypeScript or syntax errors.

To run the E2E verification test suite, run:
```bash
npx tsx apps/groovelab/src/tests/run_e2e_tests.ts
```
The test run summary should output 0 failed tests.

### 5.2 Invalidation Conditions
The layout changes will be invalidated if:
*   A fixed height is applied to the columns when the viewport width is below `1024px`, resulting in overlapping containers.
*   Admin or secretary users are presented with the Unterrichtstermine column (Column 1), violating the R1 layout spec.
