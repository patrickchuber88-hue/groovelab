# Handoff Report - teamwork_preview_challenger_m3_2

This report presents a thorough analysis and stress-test evaluation of the UI implementation in `apps/groovelab/src/components/CampusEventsBoard.tsx` and the results of E2E test executions in mock mode.

---

## 1. Observation

### E2E Test Execution
We executed the mock E2E test suite using the following command:
```bash
USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts
```
The suite completed successfully with no regressions:
```
====================================================
TEST RUN SUMMARY:
Total tests run: 115
Passed:          115
Failed:          0
Success rate:    100.0%
====================================================
```

### Static Code Review Observations in `CampusEventsBoard.tsx`

1. **Stage Loop Performance (Line 2199):**
   ```typescript
   Array.from({ length: stageCount }, (_, i) => i + 1).map(stageNum => {
   ```
   *Context:* Renders stage containers. The input field in the settings does not cap `stageCount`.

2. **Decrementing Sort Order (Lines 2268-2275):**
   ```typescript
   <button
     disabled={idx === 0}
     onClick={() => handleUpdateProgramPointSort(pp.id, { sort_order: pp.sort_order - 1 })}
     style={{ border: 'none', background: '#f1f5f9', color: '#475569', padding: '4px 6px', borderRadius: '4px', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: '0.65rem', opacity: idx === 0 ? 0.5 : 1 }}
   >
     ▲
   </button>
   ```

3. **Timezone Shift in Weekday Lookup (Lines 1087-1089):**
   ```typescript
   const d = new Date(date);
   const rawDay = d.getDay();
   const dayOfWeek = rawDay === 0 ? 7 : rawDay;
   ```
   *Context:* Performed inside `fetchAvailableRooms` to find schedules matching `day_of_week`.

4. **Band vs. Ensemble Members Fetching Mismatch (Lines 1045-1066):**
   ```typescript
   const fetchStudentEnsembles = async () => {
     try {
       const { data, error } = await supabase
         .from('ensemble_members')
         .select('ensemble_id')
         ...
         setStudentEnsembleIds(data.map((m: any) => m.ensemble_id).filter(Boolean));
   ```
   And the assignment check:
   ```typescript
   const isAssignedToEvent = (ev: any) => {
     ...
     if (ev.ensemble_id && studentEnsembleIds.includes(ev.ensemble_id)) return true;
     if (ev.band_id && studentEnsembleIds.includes(ev.band_id)) return true;
     return false;
   };
   ```

5. **Private Event Lockout/Deadlock (Line 1346):**
   ```typescript
   const filteredCustom = customEvents.filter(ev => {
     // Exclude private copies of subscribed calendar events from Column 2
     if (ev.visibility === 'private') return false;
     ...
   ```

6. **Admin Privilege Deletion Restriction (Lines 3590-3606):**
   ```typescript
   {!isSubscribed && ev.isMyEvent && (role === 'admin' || role === 'secretary') && (
     <button onClick={() => { handleDeleteEvent(ev.id); setSelectedEvent(null); }} ...>
       {isOverride ? 'Sichtbarkeit zurücksetzen' : 'Termin löschen'}
     </button>
   )}
   ```

7. **Responsive Grid Minimum Width (Lines 2382-2387):**
   ```typescript
   gridTemplateColumns: showLessons 
     ? 'minmax(320px, 1.2fr) minmax(360px, 1.5fr) minmax(300px, 1fr)' 
     : 'minmax(360px, 1.8fr) minmax(320px, 1.2fr)',
   ```

8. **Lack of Scrollable Overlays in Modals (Lines 3397-3408, 3636-3651):**
   The detail modal and the iCal subscription modal lack explicit `maxHeight` or vertical scroll limits on their main wrapper containers, relying on fixed/absolute centering.

---

## 2. Logic Chain

1. **Stage Loop Performance:**
   - If an admin inputs a large number (e.g., `1000`) into the Stage Count field, `stageCount` updates.
   - `Array.from({ length: 1000 })` is evaluated, rendering 1000 separate stage DOM segments.
   - This leads directly to browser execution blocking, causing UI lag or crash.

2. **Decrementing Sort Order:**
   - Clicking "▲" reduces `sort_order` of the selected program point by 1. It does not increment the program point it swaps with.
   - Under ties, `idx` can be greater than `0` while `sort_order` is `0`.
   - Decrementing `sort_order` from `0` yields `-1`.
   - Database schemas assert `sort_order >= 0`. The database update fails with a check constraint error, triggering an alert.

3. **Timezone Shift in Weekday Lookup:**
   - `new Date("YYYY-MM-DD")` parses as UTC midnight.
   - Calling `.getDay()` evaluates the weekday in the user's *local* browser timezone.
   - If the user's timezone has a negative offset (e.g. UTC-5), the local date is shifted to the previous evening.
   - The evaluated `dayOfWeek` resolves to the wrong day of the week, yielding incorrect room availability.

4. **Band vs. Ensemble Mismatch:**
   - The student's member associations are loaded exclusively from the `ensemble_members` table into `studentEnsembleIds`.
   - No query runs against `band_members`.
   - The assignment check compares `ev.band_id` against `studentEnsembleIds`. This comparison fails because `studentEnsembleIds` contains only ensemble IDs.
   - Consequently, students are never shown events assigned to their bands.

5. **Private Event Lockout:**
   - In `getMergedTimelineEvents`, `ev.visibility === 'private'` immediately returns `false`.
   - This hides all private events from Column 2 for all users, including the creator.
   - Since admins and secretaries have no other list view, they are completely deadlocked from selecting and coordinating private events.

6. **Admin Delete Restriction:**
   - The deletion buttons require `ev.isMyEvent` (checking if `created_by === userId`).
   - If Admin A creates an event, Admin B (or a Secretary) cannot delete or reset it via the UI, bypassing expected administrative control permissions.

7. **Responsive Grid & Modals:**
   - The grid columns specify minimum widths of 320px, 360px, and 300px. At viewports between 1024px and 1028px, the combined minimum widths + column gaps (48px) exceed the viewport width, causing layout breakage before the 1023px media query triggers.
   - The lack of scroll wrappers on the Event Detail modal blocks bottom actions (like "Sichtbarkeit speichern" or "Termin löschen") on short screens or landscape viewports.

---

## 3. Caveats

- We executed verification tests using mock Supabase client wrappers (`USE_MOCK=true`). Differences in RLS rules or actual Supabase edge cases in a real cloud environment were not evaluated.
- No third-party calendar feeds were queried; feed parsing was tested against CORS mock mock-responses and demo values.

---

## 4. Conclusion

The UI overhaul introduced in Milestone 3 successfully meets the visual structural requirements (timeline shift, hiding lessons for admin/secretary, coordinator layout tabs). However, it contains several critical functional bugs, performance vulnerabilities, and layout edge cases:

- **Stability/Performance:** Missing boundaries on stage configuration and modal dimensions.
- **Data Integrity:** Timezone date shifts in room booking checks and bad sort-order decrements violating database constraints.
- **Business Logic:** Missing band associations for student event assignment, and deadlock on private event coordination.
- **Administrative UX:** Admins cannot edit/delete events created by other admins/secretaries.

---

## 5. Adversarial Challenge Report

### Challenge Summary
**Overall risk assessment**: **MEDIUM**

### Challenges

#### [High] Challenge 1: Sort Order Constraint Violation
- **Assumption challenged:** The "▲" button can only be clicked when it is safe to decrement `sort_order`.
- **Attack scenario:** Under tie conditions or non-sequential sorting, an item at index `idx > 0` with `sort_order === 0` can be clicked, attempting to set `sort_order` to `-1`.
- **Blast radius:** The database rejects the request with a check constraint error, interrupting the user's workflow with a cryptic alert popup.
- **Mitigation:** Safely swap `sort_order` values between adjacent program points instead of blindly decrementing, or check `sort_order > 0` before decrementing.

#### [High] Challenge 2: Room Availability Timezone Shift
- **Assumption challenged:** `new Date(date).getDay()` returns the weekday represented by the date string.
- **Attack scenario:** A user in a negative offset timezone (e.g. America/New_York) opens the availability checker. The date is parsed as UTC midnight, shifting the local time to the previous day.
- **Blast radius:** Room availability filters bookings for the wrong day of the week, leading to double-bookings or false availability warnings.
- **Mitigation:** Use `new Date(date + 'T00:00:00')` or read UTC-based days with `getUTCDay()`.

#### [Medium] Challenge 3: Stage Count Browser Crash
- **Assumption challenged:** Users will only input reasonable stage counts.
- **Attack scenario:** An admin sets the stage count to a large number (e.g., `5000`).
- **Blast radius:** The React rendering loop creates 5000 DOM elements synchronously, freezing the browser tab.
- **Mitigation:** Cap `stageCount` to a reasonable maximum (e.g., `10`) in the UI input.

#### [Medium] Challenge 4: Private Event Coordinator Lockout
- **Assumption challenged:** Private events should be hidden from the public timeline.
- **Attack scenario:** An admin creates an event and changes its visibility to `'private'`.
- **Blast radius:** The event disappears entirely from the timeline. The admin has no way to select the event to coordinate or delete it.
- **Mitigation:** Allow event creators and admins to see private events in Column 2.

---

## 6. Verification Method

To verify these issues:
1. **Timezone bug:** Set system timezone to GMT-5, navigate to create event form, pick a room, and verify room bookings correspond to the weekday of the day before.
2. **Sort order bug:** Inject two program points with `sort_order: 0`, and attempt to click "▲" on the second one.
3. **Admin delete bug:** Insert an event with `created_by` set to a different user, log in as admin, and verify the "Termin löschen" button is missing.
