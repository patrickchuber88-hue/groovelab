# Handoff Report — CampusEventsBoard Analysis & Verification

## 1. Observation
We analyzed the codebase of `apps/groovelab/src/components/CampusEventsBoard.tsx` and executed the E2E tests (`USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`).

### Test Execution Results
All 115 E2E tests passed successfully:
```
====================================================
TEST RUN SUMMARY:
Total tests run: 115
Passed:          115
Failed:          0
Success rate:    100.0%
====================================================
```

### Key Code Findings

1. **Omission of Participants in Event Creation Payload (`handleCreateEvent`)**:
   In `apps/groovelab/src/components/CampusEventsBoard.tsx`, line 118 defines `selectedParticipants`:
   ```typescript
   const [selectedParticipants, setSelectedParticipants] = useState<{id: string; name: string; type: 'student' | 'ensemble' | 'band'; detail?: string}[]>([]);
   ```
   In `handleCreateEvent` (lines 1558–1637), the `eventPayload` is created as follows:
   ```typescript
   const eventPayload: any = {
     school_id: schoolId,
     title: formTitle.trim(),
     description: formDescription.trim() || null,
     event_date: formDate,
     start_time: formStartTime + ':00',
     end_time: formEndTime ? formEndTime + ':00' : null,
     category: formCategory,
     created_by: userId,
     is_public: formVisibility === 'all',
     color: formColor || null,
     visibility: formVisibility,
     location_type: formLocationType,
     room_id: formLocationType === 'intern' && formRoomId ? formRoomId : null,
     location_extern: formLocationType === 'extern' && formLocationExtern.trim() ? formLocationExtern.trim() : null,
   };
   ```
   At the end of the success path (line 1625), the state is cleared:
   ```typescript
   setSelectedParticipants([]);
   ```
   However, the selected participants are **never** included in `eventPayload` or inserted into any mapping tables, meaning they are completely lost on submission.

2. **Timezone-safety in ICS Parsing (`parseICSDate`)**:
   In `parseICSDate` (lines 1090–1104):
   ```typescript
   const parseICSDate = (icsDateStr: string): Date => {
     // Clean parameter prefix e.g. VALUE=DATE:20260611
     const cleanStr = icsDateStr.includes(':') ? icsDateStr.split(':')[1] : icsDateStr;
     const year = parseInt(cleanStr.substring(0, 4));
     const month = parseInt(cleanStr.substring(4, 6)) - 1;
     const day = parseInt(cleanStr.substring(6, 8));

     if (cleanStr.includes('T')) {
       const hour = parseInt(cleanStr.substring(9, 11));
       const min = parseInt(cleanStr.substring(11, 13));
       const sec = parseInt(cleanStr.substring(13, 15));
       return new Date(Date.UTC(year, month, day, hour, min, sec));
     }
     return new Date(year, month, day);
   };
   ```
   When `icsDateStr` represents floating local time (e.g. `20260611T180000` without a `Z` or timezone specifier), the code parses it as UTC time (`Date.UTC(...)`). When this Date object is displayed locally (e.g. `d.toLocaleDateString(...)`), it will shift based on the browser's local timezone offset (e.g., 18:00 becomes 20:00 in UTC+2).

3. **Timezone-safety in lesson freeze logic**:
   In line 4703–4704:
   ```typescript
   const lessonDateTime = new Date(`${activeChatOcc.date}T${timePart}`);
   isFrozen = Date.now() > lessonDateTime.getTime() + 48 * 60 * 60 * 1000;
   ```
   Constructing `new Date("YYYY-MM-DDTHH:MM:SS")` parses the date as local time on the user's browser, which means the 48-hour freeze window depends on the viewer's local system timezone.

4. **UX Bug with Total & Program Duration Input Validation**:
   In `handleSaveEventSettings` (lines 645-677):
   ```typescript
   const parsedTotal = totalDuration !== '' ? parseInt(totalDuration, 10) : null;
   const parsedProgram = programDuration !== '' ? parseInt(programDuration, 10) : null;

   if (totalDuration !== '' && (parsedTotal === null || isNaN(parsedTotal) || parsedTotal < 0)) {
     alert("Bitte geben Sie eine gültige Gesamtdauer (>= 0) in Minuten ein.");
     return;
   }
   ```
   If a user types `"120abc"`, it passes validation (parsed as `120`), saves to the DB, but the input field continues to display `"120abc"` because the local state is not normalized on success. Furthermore, there is no check enforcing that `programDuration <= totalDuration`.

5. **Validation of Teacher Program Point Submissions**:
   In `handleTeacherSubmitProgramPoint` (lines 797-798):
   ```typescript
   performer_count: parseInt(newPpPerformerCount, 10) || 1,
   duration: parseInt(newPpDuration, 10) || 10,
   ```
   If a negative number (e.g. `-5`) is forced into the state, `parseInt("-5", 10)` returns `-5` which is truthy. The frontend does not validate this before inserting, relying entirely on the DB to throw a constraint violation error.

6. **Missing Client-side Validation on End Time**:
   In `handleCreateEvent`, there is no validation to ensure `end_time` is chronologically after `start_time`, leading to database failures and raw error alerts.

---

## 2. Logic Chain
- **Functional PERSISTENCE Bug**: We observed that `selectedParticipants` is cleared on event creation, but it is not added to the payload or saved via any other database query. Since the student dashboard checks `isAssignedToEvent(ev)` based on `assigned_student_ids`, `student_id`, `ensemble_id`, or `band_id`, student users will never see these custom events unless populated externally.
- **Timezone Shift Bug**: In `parseICSDate`, creating a Date object with `Date.UTC(...)` for floating local times (where no UTC timezone indicator `Z` is present in the iCal format) shifts the time when the browser displays it in local time format.
- **Visual State Normalization Gap**: In `handleSaveEventSettings`, parsing inputs like `"120abc"` as `120` without updating the textbox states (`totalDuration` and `programDuration`) leaves dirty data displayed in the UI until the event sidebar is closed and reopened.
- **Validation Gaps**: `handleCreateEvent` and `handleTeacherSubmitProgramPoint` do not perform safety checks on boundary limits (`end_time < start_time` or negative values) prior to inserting into the database, leaving it to DB constraint triggers.

---

## 3. Caveats
- We did not connect to a real live Supabase instance; the database behavior is inferred from the mock database in the test harness (`run_e2e_tests.ts`) and database constraints/RLS descriptions.
- We assumed typical iCal format behaviors where timezone descriptors are either absent (floating local) or present as `Z` (UTC).

---

## 4. Conclusion
While the hardened code correctly passes all 115 tests in the E2E mock test harness, several functional, validation, and timezone bugs remain in the UI component `CampusEventsBoard.tsx`.
Specifically, the **omission of selected participants in `handleCreateEvent`** represents a critical functional gap, and the **ICS parsing mechanism contains a timezone shift bug** for floating local times.

---

## 5. Verification Method
- **Run E2E Tests**:
  ```bash
  USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts
  ```
- **Inspect Files**:
  - `apps/groovelab/src/components/CampusEventsBoard.tsx`: Inspect `handleCreateEvent` (lines 1558-1637) to verify that `selectedParticipants` is never saved.
  - `apps/groovelab/src/components/CampusEventsBoard.tsx`: Inspect `parseICSDate` (lines 1090-1104) to verify the UTC conversion behavior.
