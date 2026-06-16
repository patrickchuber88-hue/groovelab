# Synthesis Report: M2 Database Migration Schema & Constraints

We have consolidated the database schema recommendations from the three Explorer instances. Below is the finalized design for the `supabase/migrations/173_event_coordinator_schema.sql` migration file.

## Schema Changes

### 1. `campus_events` Table Alterations
- Add columns:
  - `stage_count` INTEGER DEFAULT 1 NOT NULL, with check constraint `>= 1`
  - `total_duration` INTEGER NULL, with check constraint `> 0`
  - `program_duration` INTEGER NULL, with check constraint `> 0`
- Add check constraints:
  - `check_event_times`: `CHECK (end_time IS NULL OR end_time > start_time)`
  - `check_event_title`: `CHECK (title <> '')`

### 2. `campus_event_program_points` Table Creation
Create the table with the following fields:
- `id` UUID PRIMARY KEY DEFAULT `gen_random_uuid()`
- `event_id` UUID NOT NULL REFERENCES `public.campus_events(id) ON DELETE CASCADE`
- `school_id` UUID NOT NULL REFERENCES `public.schools(id) ON DELETE CASCADE`
- `teacher_id` UUID REFERENCES `public.users(id) ON DELETE SET NULL`
- `name` TEXT NOT NULL
- `ensemble_band` TEXT NULL
- `performer_count` INTEGER DEFAULT 1 NOT NULL
- `duration` INTEGER NOT NULL
- `preferred_time` TEXT NULL
- `title` TEXT NULL
- `artist` TEXT NULL
- `composer` TEXT NULL
- `arranger` TEXT NULL
- `publisher` TEXT NULL
- `tech_requirements` TEXT NULL
- `chairs_needed` INTEGER DEFAULT 0 NOT NULL
- `music_stands_needed` INTEGER DEFAULT 0 NOT NULL
- `remarks` TEXT NULL
- `stage_number` INTEGER DEFAULT 1 NOT NULL
- `sort_order` INTEGER DEFAULT 0 NOT NULL
- `is_pause` BOOLEAN DEFAULT FALSE NOT NULL
- `status` TEXT DEFAULT 'submitted' NOT NULL
- `additional_feedback_responses` JSONB DEFAULT '{}'::jsonb NOT NULL
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()

Check constraints:
- `check_pp_name`: `name <> ''`
- `check_pp_duration`: `duration > 0`
- `check_pp_performer_count`: `performer_count >= 1`
- `check_pp_stage_number`: `stage_number >= 1`
- `check_pp_sort_order`: `sort_order >= 0`
- `check_pp_status`: `status IN ('submitted', 'approved', 'rejected')`
- `check_pp_chairs_needed`: `chairs_needed >= 0`
- `check_pp_music_stands_needed`: `music_stands_needed >= 0`

## Row-Level Security (RLS) Policies

### SELECT
- Allowed for master admin.
- Allowed for school admins/secretaries.
- Allowed for school teachers if the event is not private, or if the event was created by the teacher, or if the program point is owned by the teacher.
- Denied for students (satisfying student privacy).

### INSERT
- Allowed for master admin.
- Allowed for school admins/secretaries.
- Allowed for teachers inserting their own program point if they created the event or the event is public/teachers visible.

### UPDATE
- Allowed for master admin.
- Allowed for school admins/secretaries.
- Allowed for teachers if they are the owner of the program point (`teacher_id = get_current_user_id()`).

### DELETE
- Allowed for master admin.
- Allowed for school admins/secretaries.
- Allowed for teachers if they are the owner of the program point and its status is `'submitted'`.

## Advanced Validation Trigger (`validate_campus_event_program_point`)
A `BEFORE INSERT OR UPDATE` trigger enforces advanced constraints:
1. **Bypass**: Bypasses if master admin or if session user ID is NULL (enabling seed scripts/migrations).
2. **Teacher Insert Force**: Forces `status = 'submitted'`, `is_pause = false`, `sort_order = 0`, `stage_number = 1`, and `teacher_id = session_user_id`. Prevents inserting into another user's private event.
3. **Teacher Update Restrictions**:
   - Blocks any modifications if point is `'rejected'`.
   - Blocks editing the `name` column if point is `'approved'`.
   - Blocks modification of admin-only columns (`status`, `stage_number`, `sort_order`, `is_pause`, `event_id`, `school_id`, `teacher_id`).
   - Blocks modification of the `questions` list in `additional_feedback_responses`.
   - Blocks responding to feedback requests if there are no pending questions in the database.
4. **General Feedback Constraints**:
   - Blocks requesting feedback with empty questions array.
   - Blocks requesting feedback on rejected points.
   - Enforces matching lengths of questions and answers when status is `'responded'`.
