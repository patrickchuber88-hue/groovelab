# Handoff Report - M3 UI & Coordinator Layout Analysis

This report outlines the structural analysis and layout design recommendations for Milestone M3 (Secretary UI redesign, lesson column hiding, timeline shift, and coordinator sidebar).

---

## 1. Observation

Direct observations from the `CampusEventsBoard.tsx` codebase and Supabase database structure:

### A. Layout Structure & Grid Columns
The main component renders a 3-column CSS Grid layout at lines 1325–1334:
```tsx
return (
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

### B. The Lesson Column (Column 1)
Column 1 displays the user's scheduled lessons (Unterrichtstermine). It begins at line 1355 and ends at line 1747:
```tsx
    {/* COLUMN 1: MY LESSONS (Unterrichtstermine) */}
    <div style={{
      background: '#ffffff',
      border: '1px solid rgba(0, 0, 0, 0.05)',
      borderRadius: '24px',
      padding: '24px',
      ...
    }}>
      ...
    </div>
```

### C. The Timeline Column (Column 2)
Column 2 starts at line 1748:
```tsx
    {/* COLUMN 2: PUBLIC EVENTS & SCHOOL CALENDAR (Schultermine, Konzerte, Proben) */}
```

### D. The Sidebar / Form Column (Column 3)
Column 3 starts at line 2073:
```tsx
    {/* COLUMN 3: SIDEBAR - CREATE OWN EVENTS */}
```

### E. User Role Props & Access Checks
The `role` prop is supplied as a string matching `'student' | 'teacher' | 'admin' | 'secretary'` (line 32). Role-based security checks for administrative users (admins and secretaries) are performed using `role === 'admin' || role === 'secretary'`, as observed at:
* Line 1212: `if (role === 'admin' || role === 'secretary') return true;`
* Line 2698: `{(role === 'admin' || role === 'secretary') ? (`
* Line 2841: `const canEditVisibility = (role === 'admin' || role === 'secretary');`
* Line 2982: `{(role === 'admin' || role === 'secretary') && (`
* Line 3055: `{!isSubscribed && ev.isMyEvent && (role === 'admin' || role === 'secretary') && (`

### F.Supabase Event & Program Point Columns
From `supabase/migrations/173_event_coordinator_schema.sql`, we observe:
* `campus_events` has:
  * `stage_count`: default 1
  * `total_duration`: integer (max target duration)
  * `program_duration`: integer (target program duration)
* `campus_event_program_points` table columns:
  * `id`: UUID (PK)
  * `event_id`: UUID (FK to `campus_events.id`)
  * `teacher_id`: UUID (FK to `users.id`)
  * `name`, `ensemble_band`, `performer_count`, `duration`
  * `chairs_needed`, `music_stands_needed`
  * `stage_number`, `sort_order`, `is_pause`, `status` (`'submitted' | 'approved' | 'rejected'`)
  * `additional_feedback_responses`: JSONB for questions and answers.

---

## 2. Logic Chain

From these observations, we establish the following logic:
1. **Conditionally Hide Lesson Column**: Since lessons are personal student/teacher data, they are irrelevant to administrators (admins/secretaries). The E2E tests (`T1_F1_3` and `T1_F1_4`) assert that querying lessons as admin or secretary returns an empty list. To reflect this in the UI, Column 1 should only render if `role === 'student' || role === 'teacher'`.
2. **Shift Timeline to the Left**: By conditionally rendering Column 1, the grid has only 2 children left (the Timeline and the Sidebar). Since grid placement is sequential, the Timeline will naturally shift into the first grid slot.
3. **Adaptive Column Widths**: If we hide Column 1 but keep the 3-column `gridTemplateColumns`, the layout will break (leaving a blank column space). Therefore, we must compute `gridTemplateColumns` dynamically. When lessons are shown, we use 3 columns; when hidden, we use 2 columns (e.g. `minmax(360px, 1.8fr) minmax(320px, 1.2fr)`).
4. **Interactive Coordinator Sidebar**: Rather than using a modal dialog to inspect and edit events (which takes up the whole screen and disrupts the workflow), we can embed the event coordinator dashboard in Column 3 when `selectedEvent` is set and the user is an admin or secretary. If no event is selected, we provide tabs in the sidebar allowing the user to either "+ Termin anlegen" (Create Event) or select an existing event from a list of coordinate-able events.
5. **Layout Guideline Compliance (`CLAUDE.md`)**: The sidebar must use `overflowY: 'auto'` with dynamic, fluid wrapping on items (`flexDirection: 'row'`, `flexWrap: 'wrap'`) and no hardcoded heights on containers to prevent overlaps or collisions when content scales.

---

## 3. Caveats

* **Real Supabase DB Execution**: The E2E tests run successfully in mock mode (`USE_MOCK=true`). In real mode, queries targeting new tables/columns will fail until the migrations in `173_event_coordinator_schema.sql` are applied to the active database instance.
* **Component Size**: `CampusEventsBoard.tsx` is large (~3560 lines). Care must be taken to place new state variables and handlers in the correct scope at the top of the component body without breaking existing state hooks.

---

## 4. Conclusion & Recommended Edits

We recommend applying the following code modifications to `apps/groovelab/src/components/CampusEventsBoard.tsx`:

### Recommended Change 1: Define Helper Variable & New States
Add at the top of `CampusEventsBoard` component (around line 140, near other state definitions):

```tsx
  // --- M3 Coordinator Panel States ---
  const showLessons = role === 'student' || role === 'teacher';
  const isAdminOrSecretary = role === 'admin' || role === 'secretary';

  // Toggle tab in Column 3 when no event is selected (Admins/Secretaries only)
  const [selectedSidebarTab, setSelectedSidebarTab] = useState<'koordination' | 'create'>('koordination');

  // Program points loaded for the selected event
  const [programPoints, setProgramPoints] = useState<any[]>([]);
  const [loadingProgramPoints, setLoadingProgramPoints] = useState(false);

  // States for event meta parameters
  const [stageCount, setStageCount] = useState<number>(1);
  const [totalDuration, setTotalDuration] = useState<string>('');
  const [programDuration, setProgramDuration] = useState<string>('');

  // States for inline forms in coordinator sidebar
  const [pauseDuration, setPauseDuration] = useState<string>('');
  const [feedbackQuestion, setFeedbackQuestion] = useState<Record<string, string>>({}); // ppId -> question text
```

### Recommended Change 2: Fetch and Load Program Points
Add a `useEffect` and loading function to fetch submitted program points when `selectedEvent` is updated (around line 208):

```tsx
  const fetchProgramPoints = async (eventId: string) => {
    setLoadingProgramPoints(true);
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setProgramPoints(data || []);
    } catch (err) {
      console.error('Error fetching program points:', err);
    } finally {
      setLoadingProgramPoints(false);
    }
  };

  useEffect(() => {
    if (selectedEvent && !selectedEvent.is_subscribed) {
      fetchProgramPoints(selectedEvent.id);
      setStageCount(selectedEvent.stage_count || 1);
      setTotalDuration(selectedEvent.total_duration ? String(selectedEvent.total_duration) : '');
      setProgramDuration(selectedEvent.program_duration ? String(selectedEvent.program_duration) : '');
    } else {
      setProgramPoints([]);
    }
  }, [selectedEvent]);
```

### Recommended Change 3: CRUD Helpers for Coordinator Sidebar
Add handlers to modify event parameters, change program point status, insert intermissions, and request feedback:

```tsx
  const handleSaveEventSettings = async () => {
    if (!selectedEvent) return;
    try {
      const { data, error } = await supabase
        .from('campus_events')
        .update({
          stage_count: stageCount,
          total_duration: totalDuration ? parseInt(totalDuration, 10) : null,
          program_duration: programDuration ? parseInt(programDuration, 10) : null
        })
        .eq('id', selectedEvent.id)
        .select()
        .single();
      if (error) throw error;
      setCustomEvents(prev => prev.map(ev => ev.id === data.id ? { ...ev, ...data } : ev));
      alert('Event-Einstellungen erfolgreich gespeichert!');
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    }
  };

  const handleUpdateProgramPointStatus = async (ppId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .update({ status: newStatus })
        .eq('id', ppId)
        .select()
        .single();
      if (error) throw error;
      setProgramPoints(prev => prev.map(pp => pp.id === ppId ? data : pp));
    } catch (err: any) {
      alert('Fehler bei der Status-Aktualisierung: ' + err.message);
    }
  };

  const handleAddPause = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .insert({
          event_id: selectedEvent.id,
          school_id: schoolId,
          name: 'Pause / Unterbrechung',
          duration: parseInt(pauseDuration, 10) || 15,
          is_pause: true,
          status: 'approved',
          sort_order: programPoints.length
        })
        .select()
        .single();
      if (error) throw error;
      setProgramPoints(prev => [...prev, data]);
      setPauseDuration('');
    } catch (err: any) {
      alert('Fehler beim Einfügen der Pause: ' + err.message);
    }
  };

  const handleRequestFeedback = async (ppId: string) => {
    const question = feedbackQuestion[ppId];
    if (!question || !question.trim()) return;
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .update({
          additional_feedback_responses: {
            status: 'pending',
            questions: [question.trim()]
          }
        })
        .eq('id', ppId)
        .select()
        .single();
      if (error) throw error;
      setProgramPoints(prev => prev.map(pp => pp.id === ppId ? data : pp));
      setFeedbackQuestion(prev => ({ ...prev, [ppId]: '' }));
    } catch (err: any) {
      alert('Fehler beim Anfordern von Feedback: ' + err.message);
    }
  };

  const handleUpdateProgramPointSort = async (ppId: string, fields: { stage_number?: number; sort_order?: number }) => {
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .update(fields)
        .eq('id', ppId)
        .select()
        .single();
      if (error) throw error;
      setProgramPoints(prev => prev.map(pp => pp.id === ppId ? data : pp).sort((a,b) => a.sort_order - b.sort_order));
    } catch (err: any) {
      alert('Fehler beim Aktualisieren der Reihenfolge: ' + err.message);
    }
  };
```

### Recommended Change 4: Dynamic Grid Layout and Column 1 Hiding
Modify the main grid container starting at line 1324:

```tsx
  return (
    <div 
      style={{
        display: 'grid',
        gridTemplateColumns: showLessons 
          ? 'minmax(320px, 1.2fr) minmax(360px, 1.5fr) minmax(300px, 1fr)' 
          : 'minmax(360px, 1.8fr) minmax(320px, 1.2fr)',
        gap: '24px',
        alignItems: 'start',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        width: '100%',
        boxSizing: 'border-box',
        padding: '0px'
      }} 
      className="campus-grid-container animation-fade-in"
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes calendarPulse {
          0% { transform: scale(1); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35); }
          50% { transform: scale(1.08); box-shadow: 0 6px 20px rgba(239, 68, 68, 0.55); }
          100% { transform: scale(1); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35); }
        }
        .pulse-calendar { animation: calendarPulse 2s infinite ease-in-out; }
        
        /* Responsive Viewport Adaptability */
        @media (max-width: 1024px) {
          .campus-grid-container {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
          }
          .campus-column {
            height: auto !important;
            max-height: none !important;
          }
        }
      `}} />
      
      {/* COLUMN 1: MY LESSONS (Unterrichtstermine) */}
      {showLessons && (
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
        }} className="campus-column">
          ...
        </div>
      )}
```

### Recommended Change 5: Coordinator Dashboard in Column 3
Replace the contents of Column 3 (starting at line 2074) to conditionally render the Coordinator Panel or the Event Creation Form when `role === 'admin' || role === 'secretary'`:

```tsx
      {/* COLUMN 3: SIDEBAR - CREATE OWN EVENTS OR COORDINATOR PANEL */}
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
        overflowY: 'auto'
      }} className="campus-column">
        
        {/* Render Coordinator View if user is admin/secretary */}
        {isAdminOrSecretary ? (
          selectedEvent ? (
            /* Selected Event Coordinator Panel */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Back Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setSelectedEvent(null)}
                  style={{
                    background: '#f1f5f9', border: 'none', borderRadius: '50%',
                    width: '32px', height: '32px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <X size={14} color="#64748b" />
                </button>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    {selectedEvent.title}
                  </h4>
                  <p style={{ color: '#64748b', fontSize: '0.7rem', margin: 0, fontWeight: 550 }}>
                    Termin-Koordination
                  </p>
                </div>
              </div>

              {/* Event configuration card */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Einstellungen</span>
                
                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>Bühnen-Anzahl</label>
                  <input
                    type="number"
                    min={1}
                    value={stageCount}
                    onChange={e => setStageCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 650 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>Max. Dauer (Min)</label>
                    <input
                      type="number"
                      placeholder="n/a"
                      value={totalDuration}
                      onChange={e => setTotalDuration(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 650 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>Programm (Min)</label>
                    <input
                      type="number"
                      placeholder="n/a"
                      value={programDuration}
                      onChange={e => setProgramDuration(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 650 }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveEventSettings}
                  style={{ background: brandColor, color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Einstellungen speichern
                </button>
              </div>

              {/* Pause insert card */}
              <form onSubmit={handleAddPause} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fffbeb', padding: '16px', borderRadius: '16px', border: '1px solid #fde68a' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12}/> Pause einfügen</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    placeholder="Minuten (z.B. 15)"
                    value={pauseDuration}
                    onChange={e => setPauseDuration(e.target.value)}
                    required
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #fcd34d', fontSize: '0.8rem', fontWeight: 650 }}
                  />
                  <button type="submit" style={{ background: '#d97706', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
                    + Hinzufügen
                  </button>
                </div>
              </form>

              {/* Program points list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Programmpunkte ({programPoints.length})</span>
                
                {loadingProgramPoints ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '0.78rem' }}>Lade Beiträge...</div>
                ) : programPoints.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 16px', border: '1.5px dashed #e2e8f0', borderRadius: '16px', color: '#94a3b8', fontSize: '0.75rem' }}>Keine Programmpunkte vorhanden.</div>
                ) : (
                  programPoints.map(pp => {
                    const isPause = pp.is_pause;
                    const ppFeedback = pp.additional_feedback_responses || {};
                    const hasFeedbackPending = ppFeedback.status === 'pending';
                    const hasResponded = ppFeedback.status === 'responded';
                    const responseText = hasResponded && ppFeedback.answers && ppFeedback.answers[0] ? ppFeedback.answers[0] : '';
                    
                    let badgeColor = '#64748b';
                    let badgeBg = '#f1f5f9';
                    if (pp.status === 'approved') { badgeColor = '#10b981'; badgeBg = '#ecfdf5'; }
                    else if (pp.status === 'rejected') { badgeColor = '#ef4444'; badgeBg = '#fee2e2'; }
                    else if (pp.status === 'submitted') { badgeColor = '#f59e0b'; badgeBg = '#fef3c7'; }

                    return (
                      <div key={pp.id} style={{ padding: '14px', borderRadius: '16px', border: '1px solid rgba(0, 0, 0, 0.06)', background: isPause ? '#fffbeb' : '#ffffff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 850, color: badgeColor, background: badgeBg, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            {isPause ? 'Pause' : pp.status}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1f2937' }}>{pp.duration} Min.</span>
                        </div>

                        <div>
                          <h5 style={{ margin: '0 0 2px 0', fontSize: '0.82rem', fontWeight: 800 }}>{pp.name}</h5>
                          {!isPause && pp.ensemble_band && <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: 550 }}>Ensemble: {pp.ensemble_band}</p>}
                          {!isPause && pp.tech_requirements && <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: '#dc2626', fontWeight: 650 }}>🎹 Tech: {pp.tech_requirements}</p>}
                        </div>

                        {/* Stage & Order Assignment */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '8px', borderRadius: '10px' }}>
                          <div>
                            <span style={{ fontSize: '0.6rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Bühne</span>
                            <select
                              value={pp.stage_number}
                              onChange={e => handleUpdateProgramPointSort(pp.id, { stage_number: parseInt(e.target.value, 10) })}
                              style={{ width: '100%', fontSize: '0.7rem', padding: '2px', borderRadius: '4px' }}
                            >
                              {Array.from({ length: stageCount }, (_, i) => (
                                <option key={i + 1} value={i + 1}>Bühne {i + 1}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.6rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Reihenfolge</span>
                            <input
                              type="number"
                              min={0}
                              value={pp.sort_order}
                              onChange={e => handleUpdateProgramPointSort(pp.id, { sort_order: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                              style={{ width: '100%', fontSize: '0.7rem', padding: '2px', borderRadius: '4px' }}
                            />
                          </div>
                        </div>

                        {/* Status buttons */}
                        {pp.status === 'submitted' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleUpdateProgramPointStatus(pp.id, 'approved')}
                              style={{ flex: 1, padding: '6px', borderRadius: '8px', background: '#10b981', color: '#ffffff', border: 'none', fontWeight: 800, fontSize: '0.68rem', cursor: 'pointer' }}
                            >
                              Freigeben
                            </button>
                            <button
                              onClick={() => handleUpdateProgramPointStatus(pp.id, 'rejected')}
                              style={{ flex: 1, padding: '6px', borderRadius: '8px', background: '#ef4444', color: '#ffffff', border: 'none', fontWeight: 800, fontSize: '0.68rem', cursor: 'pointer' }}
                            >
                              Ablehnen
                            </button>
                          </div>
                        )}

                        {/* Feedback Loop UI */}
                        {!isPause && (
                          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {hasFeedbackPending && (
                              <div style={{ fontSize: '0.7rem', color: '#b45309', background: '#fffbeb', padding: '6px 8px', borderRadius: '6px' }}>
                                <strong>Feedback angefordert:</strong> {ppFeedback.questions[0]}
                              </div>
                            )}
                            {hasResponded && (
                              <div style={{ fontSize: '0.7rem', color: '#047857', background: '#ecfdf5', padding: '6px 8px', borderRadius: '6px' }}>
                                <strong>Antwort erhalten:</strong> {responseText}
                              </div>
                            )}
                            
                            {pp.status !== 'rejected' && !hasFeedbackPending && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input
                                  type="text"
                                  placeholder="Rückfrage stellen..."
                                  value={feedbackQuestion[pp.id] || ''}
                                  onChange={e => setFeedbackQuestion(prev => ({ ...prev, [pp.id]: e.target.value }))}
                                  style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.7rem' }}
                                />
                                <button
                                  onClick={() => handleRequestFeedback(pp.id)}
                                  style={{ padding: '6px 10px', borderRadius: '6px', background: '#475569', color: '#ffffff', border: 'none', fontWeight: 800, fontSize: '0.68rem', cursor: 'pointer' }}
                                >
                                  Fragen
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Gear packlist summary card */}
              {programPoints.some(pp => pp.status === 'approved' && !pp.is_pause) && (
                <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: '#334155' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Materialbedarf (Freigegeben)</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Stühle benötigt:</span>
                    <strong>{programPoints.filter(pp => pp.status === 'approved').reduce((acc, curr) => acc + (curr.chairs_needed || 0), 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Notenständer benötigt:</span>
                    <strong>{programPoints.filter(pp => pp.status === 'approved').reduce((acc, curr) => acc + (curr.music_stands_needed || 0), 0)}</strong>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* No Event Selected Dashboard */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Tabs selector */}
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                <button
                  onClick={() => setSelectedSidebarTab('koordination')}
                  style={{
                    flex: 1.2, border: 'none',
                    background: selectedSidebarTab === 'koordination' ? '#ffffff' : 'transparent',
                    color: selectedSidebarTab === 'koordination' ? '#0f172a' : '#64748b',
                    padding: '8px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
                    boxShadow: selectedSidebarTab === 'koordination' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
                  }}
                >
                  Koordination
                </button>
                <button
                  onClick={() => setSelectedSidebarTab('create')}
                  style={{
                    flex: 1, border: 'none',
                    background: selectedSidebarTab === 'create' ? '#ffffff' : 'transparent',
                    color: selectedSidebarTab === 'create' ? '#0f172a' : '#64748b',
                    padding: '8px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
                    boxShadow: selectedSidebarTab === 'create' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
                  }}
                >
                  + Neuer Termin
                </button>
              </div>

              {selectedSidebarTab === 'koordination' ? (
                /* List of events to coordinate */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Termine koordinieren</h4>
                  <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0, fontWeight: 550 }}>
                    Wähle einen Termin aus dem Hauptzeitplan oder der Liste, um Bühnen und Beiträge zu verwalten.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    {customEvents.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 16px', border: '1.5px dashed #e2e8f0', borderRadius: '16px', color: '#94a3b8', fontSize: '0.75rem' }}>Keine Termine angelegt.</div>
                    ) : (
                      customEvents.map(ev => (
                        <div
                          key={ev.id}
                          onClick={() => handleSelectEvent(ev)}
                          style={{
                            padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.05)',
                            background: '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                        >
                          <div>
                            <strong style={{ fontSize: '0.82rem', color: '#0f172a', display: 'block' }}>{ev.title}</strong>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{new Date(ev.event_date).toLocaleDateString('de-DE')}</span>
                          </div>
                          <ChevronRight size={16} color="#94a3b8" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* Create event form (existing layout logic, mapped back under tab) */
                <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* ... Existing Event creation form inputs (Title, Date, Times, Location, Category, etc.) ... */}
                </form>
              )}
            </div>
          )
        ) : (
          /* Student or Teacher standard Sidebar (Existing Sidebar View) */
          role === 'student' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* ... Existing student assigned events list ... */}
            </div>
          ) : (
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* ... Existing event creation form for teachers ... */}
            </form>
          )
        )}
      </div>
```

---

## 5. Verification Method

To independently verify the proposed styling and layout changes:

### A. Automatic Test Suite Execution
Execute the test cases in mock mode from the root directory:
```bash
USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts
```
All 115 tests must pass (100% success rate). Focus on ensuring `T1_F1_1` through `T1_F1_5` pass, as these assert the correct lesson-fetching behavior per role (lessons visible to teachers/students but completely empty for admins/secretaries).

### B. Viewport Adaptability Check
Resize the browser screen below `1024px`. The layout must transition from side-by-side columns to vertically stacked layout containers with automatic wrapping and fluid height scaling (`min-height` and `height: auto`), preventing text or card overlaps.
