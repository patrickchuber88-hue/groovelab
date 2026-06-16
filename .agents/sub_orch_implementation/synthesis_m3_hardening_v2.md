# Synthesis for Milestone M3 Hardening v2: UI & Coordinator Layout

This document outlines the additional resolution design to resolve the build errors (TypeScript type failures) and key bugs identified by the verification subagents. These changes will be applied directly to `apps/groovelab/src/components/CampusEventsBoard.tsx`.

## Additional Resolution Design

### 1. TypeScript Build Error Fix (Duration Checks)
- **Issue**: In `handleSaveEventSettings`, `totalDurationVal` and `programDurationVal` are inferred as `number | null`, which causes a compilation error when passed to `isNaN()`.
- **Fix**: Perform non-empty string checks and explicitly check for `null` before performing numeric validation.
- **Code Change**:
  ```typescript
  const totalDurationVal = totalDuration ? parseInt(totalDuration, 10) : null;
  const programDurationVal = programDuration ? parseInt(programDuration, 10) : null;

  if (totalDuration !== '') {
    if (totalDurationVal === null || isNaN(totalDurationVal) || totalDurationVal <= 0) {
      alert('Bitte geben Sie eine gültige Gesamtdauer ein (eine positive Zahl).');
      return;
    }
  }
  if (programDuration !== '') {
    if (programDurationVal === null || isNaN(programDurationVal) || programDurationVal <= 0) {
      alert('Bitte geben Sie eine gültige Programm-Dauer ein (eine positive Zahl).');
      return;
    }
  }
  if (totalDurationVal !== null && programDurationVal !== null && programDurationVal > totalDurationVal) {
    alert('Die Programm-Dauer darf nicht größer als die Gesamtdauer sein.');
    return;
  }
  ```

### 2. Normalization of Save Inputs
- **Issue**: Non-numeric trailing chars (like `"120abc"`) pass parsing but remain in the textbox state after a successful save.
- **Fix**: Update the state variables with normalized values returned from the database update call.
- **Code Change**:
  ```typescript
  if (data) {
    setTotalDuration(data.total_duration ? String(data.total_duration) : '');
    setProgramDuration(data.program_duration ? String(data.program_duration) : '');
  }
  ```

### 3. Participant Persistence Bug
- **Issue**: Selected participants from Column 3 create form (`selectedParticipants`) are cleared from state on submission but never included in `eventPayload` or database insert.
- **Fix**: Construct `assigned_student_ids`, `ensemble_id`, and `band_id` from `selectedParticipants` and pass them in the payload.
- **Code Change**:
  ```typescript
  const assignedStudentIds = selectedParticipants
    .filter(p => p.type === 'student')
    .map(p => p.id);
  const ensembleParticipant = selectedParticipants.find(p => p.type === 'ensemble');
  const bandParticipant = selectedParticipants.find(p => p.type === 'band');

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
    assigned_student_ids: assignedStudentIds.length > 0 ? assignedStudentIds : null,
    ensemble_id: ensembleParticipant ? ensembleParticipant.id : null,
    band_id: bandParticipant ? bandParticipant.id : null,
  };
  ```

### 4. Timezone Shift Bug in iCal Parser
- **Issue**: ICS floating local times are parsed as UTC, shifting the times locally.
- **Fix**: Only parse with `Date.UTC` if the timestamp ends in `'Z'`. Otherwise, parse in the user's local timezone.
- **Code Change**:
  ```typescript
  if (cleanStr.includes('T')) {
    const hour = parseInt(cleanStr.substring(9, 11));
    const min = parseInt(cleanStr.substring(11, 13));
    const sec = parseInt(cleanStr.substring(13, 15));
    if (cleanStr.endsWith('Z')) {
      return new Date(Date.UTC(year, month, day, hour, min, sec));
    } else {
      return new Date(year, month, day, hour, min, sec);
    }
  }
  ```

### 5. Timezone-Safety in Lesson Freeze Logic
- **Issue**: Lesson freeze check constructs a date using local timezone, causing inconsistencies between clients.
- **Fix**: Append `'Z'` to enforce parsing the timestamp in UTC, making it timezone-safe.
- **Code Change**:
  ```typescript
  const lessonDateTime = new Date(`${activeChatOcc.date}T${timePart}Z`);
  ```

### 6. Teacher Program Point Submission Validation
- **Issue**: Submitting negative values for performer count, duration, chairs, or stands is not checked on the client-side.
- **Fix**: Add a validation block to enforce positive numbers.
- **Code Change**:
  ```typescript
  const perfCount = parseInt(newPpPerformerCount, 10) || 1;
  const dur = parseInt(newPpDuration, 10) || 10;
  const chairs = parseInt(newPpChairs, 10) || 0;
  const stands = parseInt(newPpStands, 10) || 0;

  if (perfCount <= 0 || dur <= 0 || chairs < 0 || stands < 0) {
    alert('Bitte geben Sie gültige positive Werte für Teilnehmer, Dauer, Stühle und Notenständer ein.');
    return;
  }
  ```

### 7. End Time Validation on Event Creation
- **Issue**: Missing chronological check for `end_time` before `start_time` in `handleCreateEvent`.
- **Fix**: Validate that `end_time` is after `start_time`.
- **Code Change**:
  ```typescript
  if (formEndTime && formEndTime <= formStartTime) {
    alert('Die Endzeit muss nach der Startzeit liegen.');
    return;
  }
  ```
