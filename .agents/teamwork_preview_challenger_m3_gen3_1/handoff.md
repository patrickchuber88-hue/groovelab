# Handoff Report - CampusEventsBoard Hardening Analysis

## 1. Observation

- **E2E Tests Execution**:
  Ran E2E tests command: `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
  - Results: All 115 tests passed successfully.
  ```
  TEST RUN SUMMARY:
  Total tests run: 115
  Passed:          115
  Failed:          0
  Success rate:    100.0%
  ```

- **Build Execution Failure**:
  Ran build command: `npm run build:groovelab`
  - Result: Failed with exit code 2 due to TypeScript compiler (`tsc`) errors:
  ```
  src/components/CampusEventsBoard.tsx(651,33): error TS2345: Argument of type 'number | null' is not assignable to parameter of type 'number'.
    Type 'null' is not assignable to type 'number'.
  src/components/CampusEventsBoard.tsx(651,54): error TS18047: 'totalDurationVal' is possibly 'null'.
  src/components/CampusEventsBoard.tsx(655,35): error TS2345: Argument of type 'number | null' is not assignable to parameter of type 'number'.
    Type 'null' is not assignable to type 'number'.
  src/components/CampusEventsBoard.tsx(655,58): error TS18047: 'programDurationVal' is possibly 'null'.
  ```

- **Faulty Code Snippet in handleSaveEventSettings**:
  Located in `apps/groovelab/src/components/CampusEventsBoard.tsx` at lines 646-658:
  ```tsx
  const handleSaveEventSettings = async () => {
    if (!selectedEvent) return;
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

- **Timezone Mismatch Bug in Lesson Filtering**:
  Located in `apps/groovelab/src/components/CampusEventsBoard.tsx` at lines 1775-1777 and 1792-1793:
  ```tsx
  const getFilteredLessons = () => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const nowTimeStr = new Date().toTimeString().substring(0, 8);
    // ...
      const isPast = occ.date < todayStr || (occ.date === todayStr && occ.start_time < nowTimeStr);
      return lessonTab === 'upcoming' ? !isPast : isPast;
    });
  };
  ```

- **iCal CORS Proxy Fallback UX Issue**:
  Located in `apps/groovelab/src/components/CampusEventsBoard.tsx` at lines 1182-1188:
  ```tsx
  } catch (err) {
    console.warn('CORS feed load failed, displaying default/demo calendar entries for this school URL.');
    setCalendarError('Kalender-Feed konnte nicht direkt geladen werden (CORS). Zeige Demo-Kalenderdaten.');
    
    // Inject standard school demo calendar events to ensure a perfect aesthetic
    setSubscribedEvents([
      {
        id: 'sub-demo-1',
        title: 'Großes Sommerkonzert 2026',
        // ...
  ```

---

## 2. Logic Chain

1. **TypeScript Compilation Error Logic**:
   - `totalDurationVal` and `programDurationVal` are defined as `number | null` types.
   - The global `isNaN()` function under TypeScript's strict typechecking expects a parameter of type `number` only. Passing a `number | null` violates this constraint (TS2345).
   - Comparing `totalDurationVal <= 0` throws TS18047 because `totalDurationVal` can potentially be `null` at evaluation time.
   - Even though `totalDuration` is checked for truthiness in the conditional, TypeScript does not narrow `totalDurationVal` to `number` because it is a separate variable whose nullability is not structurally tied to `totalDuration`'s truthiness in control flow analysis.

2. **Timezone Mismatch Logic**:
   - `todayStr` is calculated from the UTC date (`new Date().toISOString().substring(0,10)`).
   - `nowTimeStr` is calculated from the local timezone time (`new Date().toTimeString().substring(0,8)`).
   - In a timezone like UTC+2 (Germany/CEST) at 01:00 AM local time on June 17, `todayStr` will be `'2026-06-16'` (UTC is still 11:00 PM June 16), while `nowTimeStr` is `'01:00:00'`.
   - Consider a lesson that occurred yesterday (June 16) at 10:00 AM (local time). Its `occ.date` is `'2026-06-16'` and `occ.start_time` is `'10:00:00'`.
   - The expression `occ.date < todayStr` evaluates to `'2026-06-16' < '2026-06-16'` (false).
   - The expression `occ.date === todayStr && occ.start_time < nowTimeStr` evaluates to `'2026-06-16' === '2026-06-16' && '10:00:00' < '01:00:00'` (false).
   - Therefore, `isPast` evaluates to false, misclassifying the past lesson as "upcoming".
   
3. **CORS Proxy Demo Data Logic**:
   - Client-side direct requests to external iCal URLs are blocked by CORS.
   - While proxy fallbacks are tried, if they also fail (or if the school feed is invalid/down), the component automatically injects hardcoded mock events.
   - This creates a bad UX because the interface populates itself with unrelated dummy events ("Sommerkonzert 2026", etc.) instead of keeping the feed empty and showing a clear error.

---

## 3. Caveats

- E2E testing was performed in the local development environment using mock states (`USE_MOCK=true`). E2E tests passed because `tsx` bypasses strict type-checking at execution time.
- No live Supabase connection was utilized to verify the database constraint execution directly, but migrations were audited.
- Because of the review-only constraint, no changes were applied to the implementation files.

---

## 4. Conclusion

While the E2E test suite reports a 100% success rate (115/115 passed), **the production build is broken** due to strict TypeScript compilation errors in `CampusEventsBoard.tsx`:
1. **TypeScript compiler error**: `totalDurationVal` and `programDurationVal` cannot be checked with `isNaN()` or `<` operators without explicit null guards or narrowing (e.g. `const totalVal = parseInt(totalDuration, 10); if (totalDuration && (isNaN(totalVal) || totalVal <= 0)) ...`).
2. **Critical timezone bug**: Rollover mismatches in `getFilteredLessons` will cause past lessons on the same UTC day to be displayed as "upcoming".
3. **UX Anomaly**: Mock calendar events are silently injected upon CORS proxy failures.

---

## 5. Verification Method

- **Build Command (Fails)**:
  ```bash
  npm run build:groovelab
  ```
- **E2E Tests Command (Passes)**:
  ```bash
  USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts
  ```
- **Files to Inspect**:
  - `apps/groovelab/src/components/CampusEventsBoard.tsx` (lines 646-658 for the TS syntax error, lines 1775-1777 for timezone mismatch).
