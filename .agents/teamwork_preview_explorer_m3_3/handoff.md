# Handoff Report - Milestone M3 UI & Coordinator Layout Analysis (Instance 3)

## 1. Observation
In `apps/groovelab/src/components/CampusEventsBoard.tsx`, we directly observed the following:
* **User Role Retrieval**: The user's role is provided as a prop in the `CampusEventsBoardProps` interface on line 32:
  ```typescript
  interface CampusEventsBoardProps {
    userId: string;
    role: 'student' | 'teacher' | 'admin' | 'secretary';
    schoolId: string;
    supabase: any;
    brandColor: string;
  }
  ```
  It is destructured in the component definition on line 80 and is referenced within the component as `role`.
* **Lesson Column (COLUMN 1)**: The Unterrichtstermine column is rendered from line 1355 to 1746:
  ```typescript
  1355:       {/* COLUMN 1: MY LESSONS (Unterrichtstermine) */}
  1356:       <div style={{
  ...
  1746:       </div>
  ```
* **Timeline Column (COLUMN 2)**: The Campus & Schultermine timeline column is rendered from line 1748 to 2071.
* **Sidebar Column (COLUMN 3)**: The sidebar column is rendered from line 2073 to 2826:
  ```typescript
  2073:       {/* COLUMN 3: SIDEBAR - CREATE OWN EVENTS */}
  ```
* **Grid Layout Style**: The parent grid layout container style is defined on lines 1325–1334:
  ```typescript
  1325:     <div style={{
  1326:       display: 'grid',
  1327:       gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(360px, 1.5fr) minmax(300px, 1fr)',
  1328:       gap: '24px',
  1329:       alignItems: 'start',
  1330:       fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  1331:       width: '100%',
  1332:       boxSizing: 'border-box',
  1333:       padding: '0px'
  1334:     }} className="animation-fade-in">
  ```

## 2. Logic Chain
1. **Conditionally Hiding Column 1**: By wrapping Column 1 in a conditional statement checking `(role !== 'admin' && role !== 'secretary')`, we completely omit the lesson column from rendering when an administrator or secretary accesses the dashboard.
2. **Left Shift of Timeline Column**: By conditionally omitting Column 1, Column 2 ("Campus & Schultermine") becomes the first rendered child under the grid container, causing it to naturally shift to the leftmost position of the grid layout.
3. **Responsive Grid Sizing (`CLAUDE.md` Compliance)**: To prevent squishing on desktop and allow layout stacking on smaller screens as required by the `CLAUDE.md` layout guidelines, we declare a custom responsive style class in the local `<style>` block. On screens larger than `1200px`, the grid uses a proportional layout:
   * **Standard (Student/Teacher)**: `1.2fr 1.5fr 1fr`
   * **Coordinator (Admin/Secretary)**: `1.8fr 1.2fr` (timeline column expands to occupy the main space)
   On viewports below `1200px`, the layout automatically transitions to `repeat(auto-fit, minmax(320px, 1fr))` for fluid stacking and viewport adaptability.
4. **Coordinator Sidebar (R1)**: We design the central coordinator dashboard by adding a local state variable `const [coordinatorTab, setCoordinatorTab] = useState<'create' | 'dashboard'>('dashboard');` in the component. We replace the simple creation form for administrators/secretaries in Column 3 with a tabbed panel switcher. The "📊 Dashboard" tab displays high-level event statistics, a pending teacher submissions queue (with Approve/Reject buttons), stage/event settings, and an announcements broadcasting tool.

## 3. Caveats
* **Database Updates**: In this read-only investigation phase, we did not write any Supabase database queries or mutation functions to handle the actual approval actions or announcements in Supabase. These should be hooked up to their respective SUPABASE API endpoints in the implementation task.
* **Mock Submissions**: The pending submissions queue in the coordinator dashboard uses mock data placeholders representing the future Supabase schema (Milestone M4).

## 4. Conclusion
We recommend editing `apps/groovelab/src/components/CampusEventsBoard.tsx` with the following changes:

### Code Change 1: Add Coordinator Tab State
Add the following state declaration below the other component states (e.g., around line 150):
```typescript
  // Tab switcher state for Coordinator Sidebar (Admin/Secretary only)
  const [coordinatorTab, setCoordinatorTab] = useState<'create' | 'dashboard'>('dashboard');
```

### Code Change 2: CSS Responsive Grid styles
Add the layout classes to the local style block inside the return statement (around line 1335):
```typescript
        /* Responsive Layout Classes */
        .campus-events-grid {
          display: grid;
          gap: 24px;
          align-items: start;
          width: 100%;
          box-sizing: border-box;
          padding: 0px;
        }
        
        @media (min-width: 1200px) {
          .campus-events-grid.standard-layout {
            grid-template-columns: minmax(320px, 1.2fr) minmax(360px, 1.5fr) minmax(300px, 1fr);
          }
          .campus-events-grid.coordinator-layout {
            grid-template-columns: minmax(360px, 1.8fr) minmax(300px, 1.2fr);
          }
        }
        
        @media (max-width: 1199px) {
          .campus-events-grid {
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          }
        }
```

### Code Change 3: Update Grid Container Style
Replace the grid container style definition (lines 1325–1334) with the new responsive CSS class:
```typescript
  return (
    <div className={`campus-events-grid animation-fade-in ${(role === 'admin' || role === 'secretary') ? 'coordinator-layout' : 'standard-layout'}`}>
```

### Code Change 4: Conditionally Hide Column 1
Wrap the entire Column 1 wrapper (lines 1356–1746) in a conditional expression:
```typescript
      {/* COLUMN 1: MY LESSONS (Unterrichtstermine) */}
      {(role !== 'admin' && role !== 'secretary') && (
        <div style={{
          background: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          height: 'calc(100vh - 120px)',
          overflow: 'hidden'
        }}>
          ... [entire content of column 1 remains unchanged] ...
        </div>
      )}
```

### Code Change 5: Coordinator Sidebar Design in Column 3
Update the header and content of Column 3 (lines 2087–2826) to include the tab switcher and the Coordinator Dashboard:
```typescript
        {/* Title */}
        {role === 'student' ? (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={20} color={brandColor} /> Meine Termine
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '4px 0 0 0', fontWeight: 550 }}>
              Termine, denen du zugeteilt bist
            </p>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {(role === 'admin' || role === 'secretary') ? <Settings size={20} color={brandColor} /> : <Plus size={20} color={brandColor} />}
              {(role === 'admin' || role === 'secretary') ? 'Event Koordination' : 'Eigene Termine'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '4px 0 0 0', fontWeight: 550 }}>
              {(role === 'admin' || role === 'secretary') ? 'Verwalte Schul-Events & Einreichungen' : 'Erstelle Vorspiele, Konzerte oder Proben'}
            </p>
          </div>
        )}

        {/* Tab switcher for admin/secretary in Column 3 */}
        {(role === 'admin' || role === 'secretary') && (
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '12px',
            gap: '4px',
            marginBottom: '4px'
          }}>
            <button
              onClick={() => setCoordinatorTab('dashboard')}
              style={{
                flex: 1.2,
                border: 'none',
                background: coordinatorTab === 'dashboard' ? '#ffffff' : 'transparent',
                color: coordinatorTab === 'dashboard' ? '#0f172a' : '#64748b',
                padding: '8px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.72rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: coordinatorTab === 'dashboard' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
              }}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setCoordinatorTab('create')}
              style={{
                flex: 1,
                border: 'none',
                background: coordinatorTab === 'create' ? '#ffffff' : 'transparent',
                color: coordinatorTab === 'create' ? '#0f172a' : '#64748b',
                padding: '8px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.72rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: coordinatorTab === 'create' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
              }}
            >
              ➕ Neuer Termin
            </button>
          </div>
        )}

        {/* Form or Assigned List or Coordinator Dashboard */}
        {role === 'student' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            ... [student assigned event list code unchanged] ...
          </div>
        ) : (role === 'admin' || role === 'secretary') && coordinatorTab === 'dashboard' ? (
          /* Coordinator Dashboard Content */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Submissions</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: brandColor, marginTop: '2px' }}>3 Offen</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Bühnen</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>2 Aktiv</div>
              </div>
            </div>

            {/* Pending Teacher Submissions */}
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Music size={14} color={brandColor} /> Programmpunkte zur Freigabe
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Mock Submission Card 1 */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Klavier-Vortrag (Silas)</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px' }}>Wartend</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                    Lehrkraft: Patrick H. • Dauer: 5 Min.
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button style={{
                      flex: 1, border: 'none', background: '#dcfce7', color: '#15803d',
                      fontSize: '0.68rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px',
                      cursor: 'pointer'
                    }}>Freigeben</button>
                    <button style={{
                      flex: 1, border: 'none', background: '#fee2e2', color: '#b91c1c',
                      fontSize: '0.68rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px',
                      cursor: 'pointer'
                    }}>Ablehnen</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Announcements section */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={14} color={brandColor} /> Ankündigung senden
              </h4>
              <textarea
                placeholder="Nachricht an alle Beteiligten des Events..."
                style={{
                  width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1',
                  fontSize: '0.8rem', outline: 'none', resize: 'none', height: '60px', boxSizing: 'border-box'
                }}
              />
              <button style={{
                width: '100%', border: 'none', background: brandColor, color: '#ffffff',
                fontSize: '0.78rem', fontWeight: 800, padding: '8px 12px', borderRadius: '8px',
                cursor: 'pointer', marginTop: '6px'
              }}>Ankündigung senden</button>
            </div>

            {/* Stage settings */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Settings size={14} color={brandColor} /> Event-Konfiguration
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Bühnen-Anzahl:</span>
                <select style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 700 }}>
                  <option value="1">1 Bühne</option>
                  <option value="2">2 Bühnen</option>
                  <option value="3">3 Bühnen</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            ... [create event form code unchanged] ...
          </form>
        )}
```

## 5. Verification Method
1. **Linter Validation**:
   Validate code format and imports by running:
   ```bash
   npm run lint -w apps/groovelab
   ```
2. **Build Validation**:
   Compile typescript and build Vite configuration to verify lack of layout syntax errors:
   ```bash
   npm run build -w apps/groovelab
   ```
3. **Test Suite Execution**:
   Verify the E2E integration test suite works correctly by executing:
   ```bash
   npx tsx apps/groovelab/src/tests/run_e2e_tests.ts
   ```
4. **Visual Layout Verification**:
   Inspect the grid rendering in `CampusEventsBoard.tsx` in a local preview.
   * If `role` is set to `'student'` or `'teacher'`, Column 1 should be fully visible, showing three columns side-by-side.
   * If `role` is set to `'admin'` or `'secretary'`, Column 1 should be absent, Column 2 ("Campus & Schultermine") should be positioned on the left side, and Column 3 ("Event Koordination") should be positioned on the right side.
