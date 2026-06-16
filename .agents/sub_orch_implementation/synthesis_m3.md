# Synthesis - Milestone M3: UI & Coordinator Layout

This document synthesizes the analysis and design recommendations for the Event Coordinator UI and Layout Overhaul.

## 1. Objectives
- **Remove Column 1 (My Lessons)**: Completely hide it when `role` is `'admin'` or `'secretary'`.
- **Shift Column 2 (Campus & Schultermine)**: Naturally shifts to the leftmost slot.
- **Dynamic Columns**: Change `gridTemplateColumns` dynamic value depending on whether lessons are rendered.
- **Responsive Layout (`CLAUDE.md` Compliance)**: Apply media queries to convert grid template to stacked columns (`flex-direction: column` or `grid-template-columns: 1fr`) on screen widths `< 1024px`, reset fixed heights, and avoid text overflows.
- **Event Coordinator Sidebar (Column 3)**:
  - Tab switcher between "Neuer Termin" (Create Event) and "Koordination" (Event Coordinator Panel) when no event is selected.
  - Switch to "Koordination" when a custom event is selected.
  - Implement dynamic states: `selectedEvent` (already exists, but we expand its use/tabs), stages configuration, list of program points per stage, consolidated gear packlist preview, and placeholder actions (to be fully hooked up in later milestones).

## 2. Layout Structure Changes in `CampusEventsBoard.tsx`

### A. New State Variables (at top of component)
```typescript
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

  // States for pause insertion
  const [pauseDuration, setPauseDuration] = useState<string>('');

  // States for additional feedback queries
  const [feedbackQuestion, setFeedbackQuestion] = useState<Record<string, string>>({}); // ppId -> question text
```

### B. Fetching and Mutation Handlers
We fetch the program points from `campus_event_program_points` table when a custom event is selected:
```typescript
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

We also support mutating status/stages/sort order:
```typescript
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
      setSelectedEvent(prev => prev ? { ...prev, ...data } : null);
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

  const handleUpdateProgramPointSort = async (ppId: string, fields: { stage_number?: number; sort_order?: number }) => {
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .update(fields)
        .eq('id', ppId)
        .select()
        .single();
      if (error) throw error;
      setProgramPoints(prev => prev.map(pp => pp.id === ppId ? data : pp).sort((a,b) => {
        if (a.stage_number !== b.stage_number) return a.stage_number - b.stage_number;
        return a.sort_order - b.sort_order;
      }));
    } catch (err: any) {
      alert('Fehler beim Aktualisieren der Reihenfolge: ' + err.message);
    }
  };
```

### C. Layout Grid Wrappers
We modify `gridTemplateColumns` depending on `showLessons`:
```typescript
  gridTemplateColumns: showLessons 
    ? 'minmax(320px, 1.2fr) minmax(360px, 1.5fr) minmax(300px, 1fr)' 
    : 'minmax(360px, 1.8fr) minmax(320px, 1.2fr)'
```
And add class name `campus-grid-container` and class names `campus-column` to each column wrapper to override styles via a media query on viewports `< 1024px` to achieve vertical stacking and fluid height.

## 3. Implementation Verification Checklist
1. Hide lesson column for admins/secretaries.
2. Shift timeline left.
3. Switch Column 3 to Coordinator tabs.
4. Correct CSS overrides for `< 1024px`.
5. Verify TypeScript compiles and E2E tests pass.
