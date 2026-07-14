# Handoff Report - Load Simulation Exploration

## 1. Observation

### Codebase Paths & Schema Definitions
The database schema and UI components for Campus-Groovelab interact with the following database tables, columns, and write operations:

#### Sickness Report (Krankheitsmeldung)
- **Tables affected**: `public.users`, `public.schedules`, `public.schedule_occurrences`, `public.crisis_notifications`, `public.system_alerts`
- **Table references**:
  - `public.users` fields: `sick_start` (DATE, added in migration `117_add_sick_start.sql:1`) and `sick_until` (TIMESTAMPTZ, added in migration `70_add_teacher_sick_until.sql:2`).
  - `public.schedules` status values: `'canceled_by_teacher_sick'` and `'approved'` (migration `65_add_pending_reschedule_status.sql:3`).
  - `public.schedule_occurrences` status values: `'cancelled'` and `'rescheduled_confirmed'` (migration `100_schedule_occurrences.sql:5`).
  - `public.crisis_notifications` inserts `{ teacher_id, student_id, slot_start_datetime, status }` for cancelled appointments (from `TeacherDashboard.tsx:1754`).
  - `public.system_alerts` inserts alerts of type `'Teacher Illness Alert'` with structure `{ school_id, teacher_id, type, message, resolved }` (from `TeacherDashboard.tsx:1780`).
- **Direct write quotes**:
  - Setting sick status:
    ```typescript
    // apps/groovelab/src/components/TeacherDashboard.tsx:1593
    const { error: userErr } = await supabase
      .from('users')
      .update({ 
        sick_until: sickUntilDate,
        sick_start: sickStartVal
      })
      .eq('id', userId);
    ```
  - Reverting sick status:
    ```typescript
    // apps/groovelab/src/components/TeacherDashboard.tsx:1853
    .update({ 
      sick_until: null,
      sick_start: null
    })
    ```

#### Reschedule (Terminverschiebung) & Room Booking (Räume buchen)
- **Tables affected**: `public.schedule_occurrences`, `public.reschedule_requests`, `public.room_bookings`, `public.schedules`
- **Table references**:
  - `public.schedule_occurrences` columns (migration `100_schedule_occurrences.sql:9`): `id`, `student_id`, `teacher_id`, `date`, `start_time`, `duration`, `status`, `original_date`.
  - `public.reschedule_requests` columns (migration `100_schedule_occurrences.sql:24`): `id`, `occurrence_id`, `proposed_date`, `proposed_start_time`, `status`, `created_at`, `updated_at`.
  - `public.room_bookings` columns (migration `125_room_bookings.sql:9`): `id`, `school_id`, `room_id`, `booked_by`, `campus_event_id`, `date`, `start_time`, `end_time`, `title`.
  - `public.schedules` columns (migration `56_schedule_engine_matrix.sql:7`): `id`, `school_id`, `teacher_id`, `student_id`, `day_of_week`, `time_slot`, `status`, `room_id`.
- **Direct write quotes**:
  - Updating occurrence date/time for reschedule:
    ```typescript
    // apps/groovelab/src/components/ScheduleCalendarView.tsx:1021
    const { error } = await supabase.from('schedule_occurrences')
      .update({
        date: change.date,
        start_time: change.start_time,
        status: finalStatus,
        original_date: origDateStr,
        student_acknowledged: false,
        student_id: change.student_id ? change.student_id : null,
        duration: change.duration
      })
      .eq('id', change.id);
    ```
  - Syncing room booking delete/insert:
    ```typescript
    // apps/groovelab/src/components/ScheduleCalendarView.tsx:1044 & 1095
    await supabase.from('room_bookings').delete().eq('booked_by', userId).eq('date', oldDate).eq('start_time', oldStartTime);
    ...
    await supabase.from('room_bookings').insert({
      school_id: schoolId,
      room_id: currentRoomId,
      booked_by: userId,
      date: change.date,
      start_time: change.start_time.length === 5 ? `${change.start_time}:00` : change.start_time,
      end_time: endTimeStr,
      title: `Unterricht: ${studentName}`
    });
    ```
  - Custom Room Bookings on Schedule Board:
    ```typescript
    // apps/groovelab/src/components/CampusTeacherDashboard.tsx:1702
    const { data, error } = await supabase
      .from('schedules')
      .insert(payload)
    ```

#### Homework Book (Digitales Hausaufgabenheft)
- **Tables affected**: `public.progress_matrix`, `public.lessons`
- **Table references**:
  - `public.progress_matrix` columns (migration `54_meisterwerk_protocol.sql:10`): `id`, `student_id`, `teacher_id`, `topic_name`, `status`, `is_current_homework`, `teacher_notes`, `homework_notes` (added in migration `102_add_homework_notes_to_progress_matrix.sql`).
  - `public.lessons` columns (from `TeacherDashboard.tsx:703`): `coach_notes`, `homework`.
- **Direct write quotes**:
  - Inserting/updating topics and homework in matrix:
    ```typescript
    // apps/groovelab/src/components/CampusTeacherDashboard.tsx:892
    .from('progress_matrix')
    .update({
      status: newDocStatus,
      is_current_homework: newDocHomework,
      teacher_notes: newDocNotes,
      updated_at: new Date().toISOString()
    })
    ```

#### Audio Recording & Loopstation Activities
- **Tables & Storage affected**: Supabase Storage bucket `'campus-assets'`, `public.progress_matrix` (`homework_notes` column)
- **Functional Description**: The core audio loopstation logic runs strictly in-memory (utilizing HTML5 `AudioContext` and local browser blobs in `GrooveLoopstation.tsx`). However, when export/mixing or recording feedback is sent to the homework book, files are uploaded to storage, and metadata is saved as string entries inside `progress_matrix.homework_notes`.
- **Direct write quotes**:
  - Storage upload:
    ```typescript
    // apps/groovelab/src/components/MeisterwerkDocumentationModal.tsx:553
    const { error: uploadErr } = await supabase.storage
      .from('campus-assets')
      .upload(filePath, blob);
    ```
  - Appending audio metadata with `AUDIO:` prefix:
    ```typescript
    // apps/groovelab/src/components/MeisterwerkDocumentationModal.tsx:535
    const audioMetaStr = `AUDIO:${audioUrlString}|${durationInSeconds}|${new Date().toISOString()}|${audioLabel.trim() || 'Aufnahme'}|${creatorRole}`;
    setHomeworkNotesList(prev => [...prev, audioMetaStr]);
    ```

#### XP Gathering, Sticker Rewards & Focus Timer
- **Tables affected**: `public.student_stats`, `public.avatars`, `public.users`, `public.fokus_logs`, `public.focus_sessions`, `public.progress_matrix` (`homework_notes`)
- **Table references**:
  - `public.student_stats` columns (migration `61_student_stats.sql`): `student_id`, `total_focus_minutes`, `monthly_focus_minutes`, `streak_flame`, `last_practice_date`, `current_xp`.
  - `public.avatars` columns (migration `60_detox_wrapped_matrix.sql:1`): `xp`, `streak_flame`, `last_focus_date`, `evolution_level`, `asset_path` (migration `52_campus_erp_integration.sql:909`).
  - `public.fokus_logs` columns (migration `60_detox_wrapped_matrix.sql:21` & `115_practice_logbook_columns.sql`): `id`, `user_id`, `song_id`, `duration_minutes`, `is_extra`, `duration_seconds`, `flame_level`, `created_at`.
  - `public.focus_sessions` columns (migration `103_display_down_focus_sessions.sql`): `id`, `school_id`, `student_id`, `goal_level`, `flame_tier`, `target_duration_seconds`, `streak_time_mastered`, `additional_practice_minutes`, `completed_streak`, `started_at`, `ended_at`.
- **Direct write quotes**:
  - Awarding XP (+50 XP) automatically for mastered songs:
    Trigger functions in `196_award_xp_for_mastered_songs.sql` listen to `user_song_skills` changes:
    ```sql
    UPDATE public.avatars SET xp = COALESCE(xp, 0) + 50 WHERE user_id = NEW.user_id;
    UPDATE public.student_stats SET current_xp = COALESCE(current_xp, 0) + 50 WHERE student_id = NEW.user_id;
    ```
  - Appending stickers inside the homework notes:
    Stickers are stored as text elements in `homework_notes` prefixed by `STICKER:`:
    ```typescript
    // apps/groovelab/src/components/MeisterwerkDocumentationModal.tsx:609
    const stickerMetaStr = `STICKER:${stickerId}|${targetTopic}|${dateStr}`;
    ```
  - Upserting stats & logging focus sessions:
    ```typescript
    // packages/shared/src/controllers/studentPracticeController.ts:97 & 113
    await supabase.from('student_stats').upsert({
      student_id: studentId,
      total_focus_minutes: totalFocus,
      monthly_focus_minutes: monthlyFocus,
      streak_flame: streakFlame,
      last_practice_date: todayStr,
      current_xp: currentXp,
      updated_at: new Date().toISOString()
    });
    await supabase.from('fokus_logs').insert({
      user_id: studentId,
      duration_minutes: durationMinutes,
      created_at: new Date().toISOString()
    });
    ```

---

### Realistic Load Simulation Setup (simulate_load_realistic_15m.mjs)
- **Role Mocking Logic**:
  - Dynamically assigns simulation roles (`simRole`) to partitioned lists per school ID:
    - 1% of fetched student profiles are designated as `admin`.
    - 5% of fetched student profiles are designated as `teacher`.
    - The remaining profiles preserve their status as `student`.
    - Existing DB teachers/admins keep their roles.
- **Log Management**:
  - Staggered log events are accumulated in-memory by `BufferedLogger` (up to 200 items in a memory buffer) and written as batch chunks to file every 2 seconds via `setInterval`.
- **Database Seeding Logic**:
  - Seed records are fetched/upserted at startup (`initializeSeedData`):
    - Fetches existing `songs` and `stations`.
    - Fetches `campus_events`.
    - For each simulated school, verifies if a mock band exists (checks `/rest/v1/bands` and `/rest/v1/band_songs`), inserting default values if not.
    - If no concert event is active for a school, creates a mock `campus_events` record.
    - Inserts up to 5 mock lessons in `public.lessons` matching simulated student-teacher pairings.

---

### VPS Connection Credentials
SSH connections inside the script tooling execute SQL queries directly on the DB container via the following parameters (verified from `run_ssh_query.js` and `inspect_server.cjs`):
- **Host**: `178.105.10.2`
- **Port**: `22`
- **Username**: `root`
- **Password**: `LlYoQzfwy$v=`
- **SQL Execution Method**: `docker exec -i supabase-db psql -U postgres -d postgres`

---

## 2. Logic Chain

1. **Sickness report triggers workflow propagation**: A write to `users.sick_until` automatically cascades cancellations on `schedules` and `schedule_occurrences` for that timeframe in the application layer (`TeacherDashboard.tsx`). Simultaneously, new warning entries are appended to `crisis_notifications` (for the impacted student views) and `system_alerts` (for administrative secretary review boards).
2. **Rescheduling maps directly to room occupancy**: Moving an occurrence update triggers a deletion of the old `room_bookings` row and inserts a corresponding entry to `room_bookings` for the new slot, unless the lesson falls within the teacher's regular template hours.
3. **Loopstation storage bypasses DB bloat limits**: High-bandwidth audio blobs are kept strictly in-memory during editing, but upon completion, they are uploaded directly to the `'campus-assets'` storage bucket. The database table `progress_matrix` only stores a small reference string (`AUDIO:http...`) in the `homework_notes` column, complying with user rules banning base64 storage.
4. **Stickers and XP inherit a unified structure**: XP changes cascade down to `avatars` and `student_stats` via PostgreSQL trigger hooks, whereas Sticker rewards are encoded directly as `'STICKER:sticker_id|topic|date'` string entries in the student's `homework_notes` array column, keeping database schemas lightweight.

---

## 3. Caveats

- **Missing UI bindings for focus_sessions**: Although table `focus_sessions` is fully declared in migration `103_display_down_focus_sessions.sql`, it is currently only referenced inside the shared backend practice controller (`studentPracticeController.ts`). The main React frontend `StudentAvatarDashboard.tsx` uses `fokus_logs` instead. Both must be cleared during cleanup.
- **Production database write permission limits**: The RLS policies on production tables are historically disabled for MVP local dev, but the production VPS might enforce strict auth policies. Ensure `serviceKey` auth headers are used in load testing.

---

## 4. Conclusion

### Target Simulation Schemas & Fields
To safely run load simulations without contaminating production user metrics, the following mock structures and required fields must be utilized:

| Action | Target Table / Path | Key Fields |
|---|---|---|
| **Krankmeldung** | `users` | `id` (UUID), `sick_start` (DATE), `sick_until` (TIMESTAMPTZ) |
| | `crisis_notifications` | `teacher_id` (UUID), `student_id` (UUID), `slot_start_datetime` (TIMESTAMPTZ), `status` ('UNREAD') |
| | `system_alerts` | `school_id`, `teacher_id`, `type` ('Teacher Illness Alert'), `message` (TEXT), `resolved` (false) |
| **Reschedule** | `schedule_occurrences` | `student_id` (UUID), `teacher_id` (UUID), `date` (DATE), `start_time` (TIME), `duration` (INT), `status` ('pending_reschedule'), `original_date` (DATE) |
| **Raumbuchung** | `room_bookings` | `school_id` (UUID), `room_id` (UUID), `booked_by` (UUID), `date` (DATE), `start_time` (TIME), `end_time` (TIME), `title` (TEXT) |
| **Hausaufgaben** | `progress_matrix` | `student_id` (UUID), `teacher_id` (UUID), `topic_name` (VARCHAR), `status` ('IN_PROGRESS'), `is_current_homework` (true), `teacher_notes` (TEXT), `homework_notes` (TEXT[]) |
| **Audio Feed** | Storage `campus-assets` | File Path: `avatars/audio_feedback_${studentId}_feedback_${timestamp}.mp3` |
| **Sticker Award** | `progress_matrix` | `homework_notes` appends: `'STICKER:stickerId\|topicName\|dateStr'` |
| **Focus Session** | `fokus_logs` | `user_id` (UUID), `duration_minutes` (INT), `is_extra` (bool), `duration_seconds` (INT) |
| | `focus_sessions` | `school_id`, `student_id`, `goal_level` (INT), `flame_tier` (VARCHAR), `target_duration_seconds` (INT), `started_at` (TIMESTAMPTZ), `ended_at` (TIMESTAMPTZ) |

### Non-Disruptive Cleanup Routines
After running load simulations, the following queries must be executed to remove mock entries and restore initial user profiles:

```sql
-- 1. Revert user sickness fields
UPDATE users SET sick_start = NULL, sick_until = NULL WHERE id IN (SELECT id FROM users WHERE is_simulation_user = true);

-- 2. Restore schedules and occurrences status
UPDATE schedules SET status = 'approved' WHERE status = 'canceled_by_teacher_sick' AND school_id = :sim_school_id;
UPDATE schedule_occurrences SET status = 'scheduled' WHERE status = 'cancelled' AND teacher_id IN (SELECT id FROM users WHERE is_simulation_user = true);

-- 3. Delete temporary warnings, bookings, and alerts
DELETE FROM crisis_notifications WHERE teacher_id IN (SELECT id FROM users WHERE is_simulation_user = true);
DELETE FROM system_alerts WHERE type = 'Teacher Illness Alert' AND school_id = :sim_school_id;
DELETE FROM room_bookings WHERE booked_by IN (SELECT id FROM users WHERE is_simulation_user = true);
DELETE FROM schedules WHERE status = 'approved' AND created_at >= :simulation_start;
DELETE FROM schedule_occurrences WHERE created_at >= :simulation_start;

-- 4. Clean up mock homework notes
DELETE FROM progress_matrix WHERE topic_name LIKE 'SimTopic_%';

-- 5. Delete focus logs and focus sessions
DELETE FROM fokus_logs WHERE created_at >= :simulation_start;
DELETE FROM focus_sessions WHERE created_at >= :simulation_start;

-- 6. Deduct XP and restore avatar stages
UPDATE student_stats SET current_xp = GREATEST(0, current_xp - :sim_xp_gained), total_focus_minutes = total_focus_minutes - :sim_focus_mins WHERE student_id IN (SELECT id FROM users WHERE is_simulation_user = true);
UPDATE avatars SET xp = GREATEST(0, xp - :sim_xp_gained), evolution_level = 1, asset_path = '/avatars/silhouette_default.png' WHERE user_id IN (SELECT id FROM users WHERE is_simulation_user = true);
UPDATE users SET avatar_url = '/avatars/silhouette_default.png' WHERE id IN (SELECT id FROM users WHERE is_simulation_user = true);
```

For Supabase Storage cleanup:
```typescript
// Remove all files matching the simulation pattern
const { data, error } = await supabase.storage.from('campus-assets').list('avatars');
const simFiles = data.filter(f => f.name.includes('_loopmix_') || f.name.includes('_feedback_')).map(f => `avatars/${f.name}`);
if (simFiles.length > 0) {
  await supabase.storage.from('campus-assets').remove(simFiles);
}
```

---

## 5. Verification Method

- **SSH Database Auditing**:
  To verify if the schemas exist and tables align with the documented types, connect to the database container using the SSH credentials:
  ```bash
  ssh -p 22 root@178.105.10.2
  # Inside host:
  docker exec -it supabase-db psql -U postgres -d postgres -c "\d"
  ```
- **Local Application Test Scripts**:
  Validate code consistency by running local tests:
  ```bash
  node tests/validate_groovelab.mjs
  node tests/security_rls_isolation.mjs
  ```
