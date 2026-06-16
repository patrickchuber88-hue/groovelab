# Synthesis for Milestone M3 Hardening: UI & Coordinator Layout

This document outlines the detailed resolution design for the 7 critical interaction, UX, layout, and logic issues identified in the Milestone M3 reviews and Challenger reports. These changes will be applied directly to `apps/groovelab/src/components/CampusEventsBoard.tsx`.

---

## The 7 Hardening Issues & Resolution Design

### 1. Modal Blocker
- **Issue**: The `Event Detail Modal` is rendered unconditionally when a `selectedEvent` is set. Because the modal overlay is full-screen (`position: fixed`, `zIndex: 1000`), it blocks the entire page, rendering the Column 3 coordinator sidebar inaccessible to admins and secretaries.
- **Resolution**: Restrict the modal rendering condition in the main component return block so that the full-screen detail modal is only shown if the user is a student or teacher (or if it is a subscribed/iCal event, since subscribed events cannot be coordinated in Column 3).
- **Target Code**: Line 3909:
  ```typescript
  // From:
  {selectedEvent && (() => {
  // To:
  {selectedEvent && (!isAdminOrSecretary || selectedEvent.is_subscribed) && (() => {
  ```

### 2. Delete/Reset Actions
- **Issue**: Since the modal is hidden for admins/secretaries, they lose access to the "Termin löschen" / "Sichtbarkeit zurücksetzen" actions. Additionally, the deletion check requires `ev.isMyEvent` (checking if `created_by === userId`), which prevents admins/secretaries from deleting custom events created by other coordinators.
- **Resolution**:
  - Add a dedicated delete/reset button at the bottom of the Column 3 `renderCoordinatorPanel()`.
  - Fix the admin delete check in both Column 2 and Column 3 so that admins and secretaries can delete/reset *any* custom event, regardless of who created it (i.e. remove the strict `isMyEvent` requirement for admin/secretary roles).
- **Target Code**:
  - In `renderCoordinatorPanel()` (around line 3065):
    ```typescript
    const isOverride = subscribedEvents.some(sub => 
      normalizeTitle(sub.title) === normalizeTitle(selectedEvent.title) && 
      sub.event_date === selectedEvent.event_date && 
      normalizeTime(sub.start_time) === normalizeTime(selectedEvent.start_time)
    );
    // Render the delete/reset button...
    ```
  - In Column 2 event list (around line 3723):
    ```typescript
    // From:
    {!isSubscribed && isMyEvent && (
    // To:
    {!isSubscribed && (isMyEvent || role === 'admin' || role === 'secretary') && (
    ```

### 3. Sort Order Swap
- **Issue**: The `▲` and `▼` buttons only increment or decrement the selected program point's `sort_order` by 1. They do not swap sort orders with neighboring elements. This causes duplicate sort orders and checks constraint violations (`sort_order >= 0` rejection) in the database.
- **Resolution**: Introduce a robust `handleSwapProgramPoints(pp1, pp2)` handler which swaps the `sort_order` of the selected program point with its adjacent neighbor (the element at `idx - 1` or `idx + 1` in the sorted list of program points for that stage).
- **Target Code**:
  - Add the `handleSwapProgramPoints` helper:
    ```typescript
    const handleSwapProgramPoints = async (pp1: any, pp2: any) => {
      if (!pp1 || !pp2) return;
      try {
        const order1 = pp1.sort_order;
        const order2 = pp2.sort_order;
        const { error: err1 } = await supabase.from('campus_event_program_points').update({ sort_order: order2 }).eq('id', pp1.id);
        if (err1) throw err1;
        const { error: err2 } = await supabase.from('campus_event_program_points').update({ sort_order: order1 }).eq('id', pp2.id);
        if (err2) throw err2;
        setProgramPoints(prev => prev.map(pp => {
          if (pp.id === pp1.id) return { ...pp, sort_order: order2 };
          if (pp.id === pp2.id) return { ...pp, sort_order: order1 };
          return pp;
        }).sort((a,b) => {
          if (a.stage_number !== b.stage_number) return a.stage_number - b.stage_number;
          return a.sort_order - b.sort_order;
        }));
      } catch (err: any) {
        alert('Fehler beim Tauschen: ' + err.message);
      }
    };
    ```
  - Replace the click handlers for `▲` and `▼` buttons:
    ```typescript
    // ▲ Button:
    onClick={() => handleSwapProgramPoints(pp, stagePoints[idx - 1])}
    // ▼ Button:
    onClick={() => handleSwapProgramPoints(pp, stagePoints[idx + 1])}
    ```

### 4. Stage Count Cap
- **Issue**: The stage count input has no upper bound, allowing users to enter extremely large numbers (e.g. `5000`), which causes React to render thousands of stage segments synchronously, hanging the browser tab.
- **Resolution**: Cap the stage count value between `1` and `10` in the input `onChange` handler and add the `max="10"` HTML attribute.
- **Target Code**: Around line 2687:
  ```typescript
  // From:
  onChange={e => setStageCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
  // To:
  max="10"
  onChange={e => setStageCount(Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1)))}
  ```

### 5. Type Validation
- **Issue**: Non-numeric inputs parsed via `parseInt` can yield `NaN` when saving event settings, leading to database type conversion errors. Additionally, negative pause durations can be submitted, breaking timelines.
- **Resolution**: Validate that the input strings parse into positive integers (no `NaN` or negative values) before sending update queries to the database. Add `min="1"` to the pause duration HTML input.
- **Target Code**:
  - In `handleSaveEventSettings`:
    ```typescript
    const totalDurationVal = totalDuration ? parseInt(totalDuration, 10) : null;
    const programDurationVal = programDuration ? parseInt(programDuration, 10) : null;
    if (totalDuration && (isNaN(totalDurationVal) || totalDurationVal <= 0)) {
      alert('Bitte geben Sie eine gültige Gesamtdauer ein (eine positive Zahl).');
      return;
    }
    if (programDuration && (isNaN(programDurationVal) || programDurationVal <= 0)) {
      alert('Bitte geben Sie eine gültige Programm-Dauer ein (eine positive Zahl).');
      return;
    }
    ```
  - In `handleAddPause`:
    ```typescript
    const durationVal = parseInt(pauseDuration, 10);
    if (isNaN(durationVal) || durationVal <= 0) {
      alert('Bitte geben Sie eine gültige Pausendauer ein (eine positive Zahl).');
      return;
    }
    ```

### 6. Timezone Weekday Lookup
- **Issue**: Parsing a date string using `new Date("YYYY-MM-DD")` evaluates it at UTC midnight, which translates to the previous evening for negative timezone offsets, yielding incorrect weekdays in room availability checks.
- **Resolution**: Append `'T00:00:00'` to the date string so that it parses the date correctly in the user's local timezone.
- **Target Code**: Around line 1401:
  ```typescript
  // From:
  const d = new Date(date);
  // To:
  const d = new Date(date + 'T00:00:00');
  ```

### 7. Private Event Visibility
- **Issue**: Private events are filtered out completely in Column 2 (`getMergedTimelineEvents`), blocking the event creators and coordinators from ever seeing them to edit or delete them.
- **Resolution**: Modify the visibility filter so that private events are only excluded if the current user is NOT the creator AND is NOT an admin or secretary.
- **Target Code**: Around line 1660:
  ```typescript
  // From:
  if (ev.visibility === 'private') return false;
  // To:
  if (ev.visibility === 'private' && ev.created_by !== userId && role !== 'admin' && role !== 'secretary') return false;
  ```

---

## Additional Improvements

### Student Band Matching
- **Issue**: When evaluating `isAssignedToEvent`, student member associations are loaded only from `ensemble_members` and compared against both `ensemble_id` and `band_id`. This means students are never matched with events assigned to their bands.
- **Resolution**: Add `studentBandIds` state and fetch memberships from `band_members` table as well. Integrate `studentBandIds` inside `isAssignedToEvent`.
