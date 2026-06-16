# Handoff Report — Milestone M3 Review and Verification

## 1. Observation
This review examines the implementation of the coordinator layout and logic in `apps/groovelab/src/components/CampusEventsBoard.tsx` based on the design requirements specified in `PROJECT.md` and `.agents/sub_orch_implementation/synthesis_m3.md`.

We ran the E2E test suite in mock mode:
- Command: `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
- Results:
  ```
  TEST RUN SUMMARY:
  Total tests run: 115
  Passed:          115
  Failed:          0
  Success rate:    100.0%
  ```
All 115 E2E tests pass without regressions.

During code review of `apps/groovelab/src/components/CampusEventsBoard.tsx`, several edge cases and role-based logic issues were found:

### A. Critical Interaction Blocker: Modal Overlay Blocks Column 3 Coordinator Panel
The Event Detail Modal is rendered unconditionally whenever `selectedEvent` is truthy (lines 3364-3389):
```typescript
      {/* ── Event Detail Modal ── */}
      {selectedEvent && (() => {
        const ev = selectedEvent;
        // ...
        return (
          <div
            onClick={() => setSelectedEvent(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15,23,42,0.55)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
              animation: 'fadeIn 0.15s ease'
            }}
          >
```
However, Column 3 relies on `selectedEvent` being set to display the `renderCoordinatorPanel()` (lines 3274-3278):
```typescript
          /* Admin or Secretary: Tab switcher and views */
          <>
            {/* If a custom event is selected, display the Coordinator Panel */}
            {selectedEvent && !selectedEvent.is_subscribed ? (
              renderCoordinatorPanel()
            ) : (
```
Since the Modal Overlay uses `position: 'fixed', inset: 0` and `zIndex: 1000`, it covers the entire screen, obscuring the sidebar and Column 3. To dismiss the modal and interact with the UI, the user must close it (clicking outside or the close button), which calls `setSelectedEvent(null)`. Dismissing the modal clears the selection, returning Column 3 to the default "no event selected" view. This makes the coordinator panel effectively inaccessible to admins/secretaries.

### B. Sort Order Logic Issue: Duplicate Sort Orders
When an admin/secretary changes the sort order of a program point using the `▲` or `▼` buttons (lines 2268-2282):
```typescript
                              {/* Reordering and Stage Switcher */}
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <button
                                  disabled={idx === 0}
                                  onClick={() => handleUpdateProgramPointSort(pp.id, { sort_order: pp.sort_order - 1 })}
                                  // ...
                                >
                                  ▲
                                </button>
                                <button
                                  disabled={idx === stagePoints.length - 1}
                                  onClick={() => handleUpdateProgramPointSort(pp.id, { sort_order: pp.sort_order + 1 })}
                                  // ...
                                >
                                  ▼
                                </button>
```
The click handler only modifies the selected item's `sort_order` up or down by 1 (e.g. `pp.sort_order - 1`). It does not swap sort orders with the neighboring element. If Element 0 has `sort_order = 0` and Element 1 has `sort_order = 1`, clicking `▲` on Element 1 sets its `sort_order` to `0`. Both elements now have `sort_order = 0` in the database, resulting in duplicate sort order values.

### C. Client-Side Denial of Service: Unvalidated Stage Count Input
The stage count input permits arbitrary numeric input (lines 2138-2144):
```typescript
              <input
                type="number"
                min="1"
                value={stageCount}
                onChange={e => setStageCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
              />
```
And the stages list renders stages in a map loop (lines 2199-2201):
```typescript
            Array.from({ length: stageCount }, (_, i) => i + 1).map(stageNum => {
              const stagePoints = programPoints.filter(pp => pp.stage_number === stageNum);
              return (
```
If a user enters an extremely large number (e.g., 500 or 1000), `Array.from` will generate a massive array, causing React to render hundreds/thousands of DOM containers, leading to the browser tab hanging, running out of memory, or crashing.

### D. Input Validation and Type Errors: NaN and Negative Durations
1. **NaN Type Error**: The `totalDuration` and `programDuration` inputs are text fields. When saving settings, the values are parsed via `parseInt` (lines 582-591):
   ```typescript
         .update({
           stage_count: stageCount,
           total_duration: totalDuration ? parseInt(totalDuration, 10) : null,
           program_duration: programDuration ? parseInt(programDuration, 10) : null
         })
   ```
   If a user enters a non-numeric string (e.g., "abc"), `parseInt` yields `NaN`. Sending `NaN` to the Supabase client-side library to update integer columns in PostgreSQL results in a database error.
2. **Negative Pause Duration**: The pause duration input has no `min="1"` attribute (lines 2311-2318). A user can type and submit a negative duration (e.g. `-10` or `0`), which inserts a program point with an invalid or negative duration.

---

## 2. Logic Chain
1. We executed `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts` and observed that 115 tests run and succeed (Observation 1). Thus, there are no test regressions.
2. In `CampusEventsBoard.tsx`, the state variable `selectedEvent` controls both the display of the **Event Detail Modal** (Observation A) and the **Coordinator Panel** in Column 3 (Observation A).
3. Because the modal has `position: fixed` and `inset: 0` style, it overlays the whole viewport, obscuring all underlying columns (including the sidebar). Closing the modal sets `selectedEvent` to `null`, which hides the coordinator panel.
4. Therefore, the coordinator panel cannot be interacted with by admins/secretaries unless they are locked out or they have to close the modal. This is a critical interaction bug.
5. For sort order updates, `handleUpdateProgramPointSort` only updates the fields on the selected item (Observation B) without performing a swap operation with its neighbor. Therefore, sort order updates create duplicate `sort_order` values in the database.
6. The `stageCount` input is bounded only below by `1` (Observation C) and is used to initialize an array of length `stageCount` for rendering. Therefore, entering a large number causes browser resource exhaustion/hangs.
7. Inputs for total/program durations are text fields parsed with `parseInt` without checking for `NaN` (Observation D). Thus, non-numeric strings cause database type conversion failures.
8. The pause duration input does not prevent negative inputs (Observation D). Thus, negative pauses can be added, breaking timeline calculations.

---

## 3. Caveats
- No caveats. Our analysis covers the direct UI/UX files, E2E tests, and stylesheet files.

---

## 4. Conclusion
While the E2E tests successfully pass with a 100% success rate, the current UI implementation of the Event Coordinator panel in `CampusEventsBoard.tsx` contains a **critical interaction blocker** that renders the panel inaccessible to admins/secretaries. Additionally, there are UX issues with sort-ordering and input validations that can lead to browser hangs, database errors, and invalid data entry (negative pause durations).

---

## 5. Verification Method
1. Run E2E tests in mock mode:
   ```bash
   USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts
   ```
2. Inspect `apps/groovelab/src/components/CampusEventsBoard.tsx` around lines 2138-2144, 2268-2282, 3274-3278, and 3364-3389 to confirm the observations.
