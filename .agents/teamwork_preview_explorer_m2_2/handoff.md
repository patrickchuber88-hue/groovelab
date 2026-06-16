# Handoff Report: M2 Database Migration Analysis

## 1. Observation
From inspecting the project structure and testing codebase, I directly observed the following requirements:

*   **Table Contracts (`PROJECT.md`, lines 29-53):**
    The contract for the new `campus_event_program_points` table specifies the following columns:
    *   `id` UUID (Primary Key, default `gen_random_uuid()`)
    *   `event_id` UUID (Foreign Key to `campus_events.id`, CASCADE ON DELETE)
    *   `school_id` UUID (Foreign Key to `schools.id`, CASCADE ON DELETE)
    *   `teacher_id` UUID (Foreign Key to `users.id`, nullable)
    *   `name` TEXT (Name of program point)
    *   `ensemble_band` TEXT (Nullable)
    *   `performer_count` INTEGER (Default 1)
    *   `duration` INTEGER (In minutes)
    *   `preferred_time` TEXT (Nullable)
    *   `title` TEXT (Nullable)
    *   `artist` TEXT (Nullable)
    *   `composer` TEXT (Nullable)
    *   `arranger` TEXT (Nullable)
    *   `publisher` TEXT (Nullable)
    *   `tech_requirements` TEXT (Nullable)
    *   `chairs_needed` INTEGER (Default 0)
    *   `music_stands_needed` INTEGER (Default 0)
    *   `remarks` TEXT (Nullable)
    *   `stage_number` INTEGER (Default 1)
    *   `sort_order` INTEGER (Default 0)
    *   `is_pause` BOOLEAN (Default FALSE)
    *   `status` TEXT (Default 'submitted', check constraint IN ('submitted', 'approved', 'rejected'))
    *   `additional_feedback_responses` JSONB (Default '{}')

*   **Event Configuration (`ORIGINAL_REQUEST.md`, lines 17-21):**
    Requirements state the secretary/admin dashboard must be able to configure:
    *   Number of stages (Anzahl der Bühnen)
    *   Total event duration (Gesamtdauer der Veranstaltung)
    *   Duration of concert program (Dauer des Konzertprogramms)

*   **E2E Test Specifications (`apps/groovelab/src/tests/e2e_test_cases.ts` & `run_e2e_tests.ts`):**
    *   `T1_F4_2`: `is_pause` must default to `false`, `sort_order` to `0`, `stage_number` to `1`, and `status` to `'submitted'`.
    *   `T2_F4_1` & `T2_F4_2`: Program point insertions/updates with `duration <= 0` must fail database validation.
    *   `T2_F4_3` & `T2_F4_4`: `performer_count < 1` must fail database validation.
    *   `T2_F5_1`: Valid statuses are restricted to `submitted`, `approved`, and `rejected`.
    *   `T2_F5_2`: `stage_number < 1` must fail validation.
    *   `T2_F5_3`: `sort_order < 0` must fail validation.
    *   `T2_F9_3`: `chairs_needed < 0` and `music_stands_needed < 0` must fail validation.
    *   `T2_F7_5`: In `additional_feedback_responses`, if `status = 'pending'`, the `questions` array cannot be empty.
    *   `T2_F8_5`: If `questions` and `answers` are both provided, their array lengths must match exactly.
    *   `T2_F4_5`: Teachers cannot modify the `name` column once a program point is `approved`.
    *   `T3_4` & `T2_F7_2`: Once a program point is `rejected`, teachers cannot rename it or submit feedback, and no user can modify `additional_feedback_responses`.
    *   `T2_F8_2`: A teacher cannot answer feedback if the questions array is empty (meaning feedback was deleted/not requested).
    *   `T3_3`: Teachers cannot submit program points to another user's private event.
    *   `T3_5`: Program points on private events are invisible to unrelated teachers.
    *   `T1_F7_5` & `run_e2e_tests.ts` (lines 181-184): Students are restricted from seeing the `additional_feedback_responses` JSON structure (it must return empty or `{}`).

## 2. Logic Chain
To satisfy the requirements from these observations:
1.  **Schema Adjustments:** `campus_events` needs columns for `stages_count`, `total_duration_minutes`, and `program_duration_minutes` to fulfill the event setup requirements (`ORIGINAL_REQUEST.md` R2).
2.  **Table Default Values & Check Constraints:** To meet boundary test constraints (`T2_F4_1` to `T2_F5_3`), the new `campus_event_program_points` table must enforce strict numeric bounds on `duration`, `performer_count`, `stage_number`, `sort_order`, `chairs_needed`, and `music_stands_needed`. A CHECK constraint on `status` will enforce the three valid states.
3.  **JSONB Check Constraint:** A JSONB-specific check constraint on `additional_feedback_responses` is designed to enforce:
    *   Question list length > 0 when status is `'pending'`.
    *   Question and Answer array length matching when both are present.
4.  **Database Trigger for Security Guards:** Since standard RLS only filters rows (silent failure) rather than throwing permission denied errors with custom messages, a `BEFORE INSERT OR UPDATE` trigger is necessary to raise exceptions with SQLSTATE `42501` to match the exact mock behavior:
    *   Preventing teachers from updating another teacher's point.
    *   Preventing teachers from changing the status of any point.
    *   Enforcing read-only locks on `name` for approved/rejected points.
    *   Preventing questions modification by teachers.
    *   Validating private event submissions.
5.  **Multi-tenant RLS Policies:** Access must check school boundaries utilizing the existing `public.check_school_access(school_id)`. SELECT visibility must hide private event program points from unrelated teachers and completely filter out teacher-only events for students.
6.  **Student Column Masking:** To implement the requirement where students should see `{}` for `additional_feedback_responses`, we can document a masked VIEW that conditionally returns `{}` for students, keeping the main table clean.

## 3. Caveats
*   **Existing SQL Helpers:** It is assumed that SQL functions `public.get_current_user_id()`, `public.get_current_user_role()`, `public.is_master_admin()`, and `public.check_school_access()` are correctly defined and populated by the Supabase headers.
*   **Cascade Deletes:** Foreign key constraints are designed with `ON DELETE CASCADE`. If an event is cascade-deleted, the BEFORE DELETE validation trigger allows this by checking if the deleting user is the owner of the event.

## 4. Conclusion
Below is the designed PostgreSQL script that should be placed in `supabase/migrations/173_event_coordinator_schema.sql`:

```sql
-- Migration: 173_event_coordinator_schema
-- Description: Sets up the database schema, check constraints, validation triggers, and RLS policies for the Event Coordinator Overhaul.

-- 1. Add event configuration columns to campus_events
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS stages_count INTEGER DEFAULT 1 NOT NULL CHECK (stages_count >= 1);
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS total_duration_minutes INTEGER CHECK (total_duration_minutes >= 0);
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS program_duration_minutes INTEGER CHECK (program_duration_minutes >= 0);

-- 2. Create the campus_event_program_points table
CREATE TABLE IF NOT EXISTS public.campus_event_program_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.campus_events(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    ensemble_band TEXT,
    performer_count INTEGER NOT NULL DEFAULT 1 CHECK (performer_count >= 1),
    duration INTEGER NOT NULL CHECK (duration > 0),
    preferred_time TEXT,
    title TEXT,
    artist TEXT,
    composer TEXT,
    arranger TEXT,
    publisher TEXT,
    tech_requirements TEXT,
    chairs_needed INTEGER NOT NULL DEFAULT 0 CHECK (chairs_needed >= 0),
    music_stands_needed INTEGER NOT NULL DEFAULT 0 CHECK (music_stands_needed >= 0),
    remarks TEXT,
    stage_number INTEGER NOT NULL DEFAULT 1 CHECK (stage_number >= 1),
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    is_pause BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
    additional_feedback_responses JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 3. Add CHECK constraint on additional_feedback_responses JSONB structure
ALTER TABLE public.campus_event_program_points DROP CONSTRAINT IF EXISTS additional_feedback_responses_check;
ALTER TABLE public.campus_event_program_points ADD CONSTRAINT additional_feedback_responses_check
CHECK (
    (additional_feedback_responses IS NULL) OR (
        -- If questions and answers are both present and answers is not empty, their lengths must match
        (
            NOT (additional_feedback_responses ? 'questions' AND additional_feedback_responses ? 'answers')
            OR jsonb_typeof(additional_feedback_responses->'answers') <> 'array'
            OR jsonb_array_length(additional_feedback_responses->'answers') = 0
            OR (
                jsonb_typeof(additional_feedback_responses->'questions') = 'array'
                AND jsonb_array_length(additional_feedback_responses->'questions') = jsonb_array_length(additional_feedback_responses->'answers')
            )
        )
        AND
        -- If questions is present and status is 'pending', questions cannot be empty
        (
            NOT (additional_feedback_responses ? 'questions' AND additional_feedback_responses->>'status' = 'pending')
            OR (
                jsonb_typeof(additional_feedback_responses->'questions') = 'array'
                AND jsonb_array_length(additional_feedback_responses->'questions') > 0
            )
        )
    )
);

-- 4. Enable RLS on the table
ALTER TABLE public.campus_event_program_points ENABLE ROW LEVEL SECURITY;

-- 5. Drop old policies if they exist
DROP POLICY IF EXISTS campus_event_program_points_select ON public.campus_event_program_points;
DROP POLICY IF EXISTS campus_event_program_points_insert ON public.campus_event_program_points;
DROP POLICY IF EXISTS campus_event_program_points_update ON public.campus_event_program_points;
DROP POLICY IF EXISTS campus_event_program_points_delete ON public.campus_event_program_points;

-- 6. Create RLS Policies
-- SELECT Policy
CREATE POLICY campus_event_program_points_select ON public.campus_event_program_points FOR SELECT USING (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND (
            public.get_current_user_role() IN ('admin', 'secretary')
            OR (
                public.get_current_user_role() = 'teacher'
                AND (
                    teacher_id = public.get_current_user_id()
                    OR EXISTS (
                        SELECT 1 FROM public.campus_events e
                        WHERE e.id = event_id AND e.visibility <> 'private'
                    )
                )
            )
            OR (
                public.get_current_user_role() = 'student'
                AND EXISTS (
                    SELECT 1 FROM public.campus_events e
                    WHERE e.id = event_id AND e.visibility IN ('all', 'students')
                )
            )
        )
    )
);

-- INSERT Policy
CREATE POLICY campus_event_program_points_insert ON public.campus_event_program_points FOR INSERT WITH CHECK (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        AND (
            public.get_current_user_role() IN ('admin', 'secretary')
            OR (
                public.get_current_user_role() = 'teacher'
                AND (teacher_id = public.get_current_user_id() OR teacher_id IS NULL)
                AND EXISTS (
                    SELECT 1 FROM public.campus_events e
                    WHERE e.id = event_id 
                    AND (e.visibility <> 'private' OR e.created_by = public.get_current_user_id())
                )
            )
        )
    )
);

-- UPDATE Policy
CREATE POLICY campus_event_program_points_update ON public.campus_event_program_points FOR UPDATE USING (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        AND (
            public.get_current_user_role() IN ('admin', 'secretary')
            OR (
                public.get_current_user_role() = 'teacher'
                AND teacher_id = public.get_current_user_id()
            )
        )
    )
) WITH CHECK (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        AND (
            public.get_current_user_role() IN ('admin', 'secretary')
            OR (
                public.get_current_user_role() = 'teacher'
                AND teacher_id = public.get_current_user_id()
            )
        )
    )
);

-- DELETE Policy
CREATE POLICY campus_event_program_points_delete ON public.campus_event_program_points FOR DELETE USING (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        AND (
            public.get_current_user_role() IN ('admin', 'secretary')
            OR (
                public.get_current_user_role() = 'teacher'
                AND teacher_id = public.get_current_user_id()
            )
        )
    )
);

-- 7. Trigger Functions
-- INSERT/UPDATE Validation Trigger Function
CREATE OR REPLACE FUNCTION public.validate_campus_event_program_point()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_current_user_role public.user_role;
    v_event_visibility TEXT;
    v_event_created_by UUID;
BEGIN
    v_current_user_id := public.get_current_user_id();
    v_current_user_role := public.get_current_user_role();

    -- Bypass for master admin
    IF public.is_master_admin() THEN
        RETURN NEW;
    END IF;

    -- Fetch the target event's visibility and creator
    SELECT visibility, created_by INTO v_event_visibility, v_event_created_by
    FROM public.campus_events
    WHERE id = NEW.event_id;

    -- A. General validations (apply to all roles)
    IF TG_OP = 'UPDATE' THEN
        -- Check if we are updating additional_feedback_responses on a rejected point
        IF OLD.status = 'rejected' AND NEW.additional_feedback_responses IS DISTINCT FROM OLD.additional_feedback_responses THEN
            RAISE EXCEPTION 'Cannot request feedback on a rejected program point' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- B. Role-specific validations
    IF v_current_user_role = 'teacher' THEN
        -- Check if modifying other teacher's program point
        IF TG_OP = 'UPDATE' THEN
            IF OLD.teacher_id IS DISTINCT FROM NEW.teacher_id OR OLD.teacher_id <> v_current_user_id THEN
                RAISE EXCEPTION 'Permission denied for modifying other teacher point' USING ERRCODE = '42501';
            END IF;
        ELSIF TG_OP = 'INSERT' THEN
            IF NEW.teacher_id IS NULL THEN
                NEW.teacher_id := v_current_user_id;
            ELSIF NEW.teacher_id <> v_current_user_id THEN
                RAISE EXCEPTION 'Permission denied for modifying other teacher point' USING ERRCODE = '42501';
            END IF;
        END IF;

        -- Teachers cannot approve or reject program points
        IF TG_OP = 'INSERT' THEN
            IF NEW.status <> 'submitted' THEN
                RAISE EXCEPTION 'Teachers cannot approve or reject program points' USING ERRCODE = '42501';
            END IF;
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'submitted' THEN
                RAISE EXCEPTION 'Teachers cannot approve or reject program points' USING ERRCODE = '42501';
            END IF;
        END IF;

        -- Teacher cannot submit to another user's private event
        IF TG_OP = 'INSERT' THEN
            IF v_event_visibility = 'private' AND v_event_created_by <> v_current_user_id THEN
                RAISE EXCEPTION 'Cannot submit to another user''s private event' USING ERRCODE = '42501';
            END IF;
        END IF;

        -- Status locking rules for teachers on update
        IF TG_OP = 'UPDATE' THEN
            -- Cannot edit name of an approved program point
            IF OLD.status = 'approved' AND NEW.name IS DISTINCT FROM OLD.name THEN
                RAISE EXCEPTION 'Cannot edit name of an approved program point' USING ERRCODE = '42501';
            END IF;

            -- Cannot edit name of a rejected program point
            IF OLD.status = 'rejected' AND NEW.name IS DISTINCT FROM OLD.name THEN
                RAISE EXCEPTION 'Cannot edit name of a rejected program point' USING ERRCODE = '42501';
            END IF;

            -- Teachers cannot modify or add feedback questions
            IF NEW.additional_feedback_responses->'questions' IS DISTINCT FROM OLD.additional_feedback_responses->'questions' THEN
                RAISE EXCEPTION 'Teachers cannot modify or add feedback questions' USING ERRCODE = '42501';
            END IF;

            -- Cannot submit answers when there are no pending questions
            IF (NEW.additional_feedback_responses->'answers' IS NOT NULL AND jsonb_array_length(NEW.additional_feedback_responses->'answers') > 0)
               AND (OLD.additional_feedback_responses->'questions' IS NULL OR jsonb_array_length(OLD.additional_feedback_responses->'questions') = 0) THEN
                RAISE EXCEPTION 'Cannot submit answers when there are no pending questions' USING ERRCODE = '42501';
            END IF;
        END IF;

    ELSIF v_current_user_role = 'student' THEN
        RAISE EXCEPTION 'Students cannot modify program points' USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

-- DELETE Validation Trigger Function
CREATE OR REPLACE FUNCTION public.validate_campus_event_program_point_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_current_user_role public.user_role;
BEGIN
    v_current_user_id := public.get_current_user_id();
    v_current_user_role := public.get_current_user_role();

    -- Bypass for master admin
    IF public.is_master_admin() THEN
        RETURN OLD;
    END IF;

    IF v_current_user_role = 'teacher' THEN
        -- Allow delete if they are the teacher of the point OR if the parent event was created by them (to support cascade deletes)
        IF OLD.teacher_id IS DISTINCT FROM v_current_user_id THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.campus_events e
                WHERE e.id = OLD.event_id AND e.created_by = v_current_user_id
            ) THEN
                RAISE EXCEPTION 'Permission denied for modifying other teacher point' USING ERRCODE = '42501';
            END IF;
        END IF;
        
        -- Lock if reviewed, unless cascade deleted by event owner
        IF OLD.status <> 'submitted' THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.campus_events e
                WHERE e.id = OLD.event_id AND e.created_by = v_current_user_id
            ) THEN
                RAISE EXCEPTION 'Cannot delete reviewed program point' USING ERRCODE = '42501';
            END IF;
        END IF;
    ELSIF v_current_user_role = 'student' THEN
        RAISE EXCEPTION 'Students cannot modify program points' USING ERRCODE = '42501';
    END IF;

    RETURN OLD;
END;
$$;

-- 8. Create Triggers
DROP TRIGGER IF EXISTS campus_event_program_points_validation_trigger ON public.campus_event_program_points;
CREATE TRIGGER campus_event_program_points_validation_trigger
BEFORE INSERT OR UPDATE ON public.campus_event_program_points
FOR EACH ROW EXECUTE FUNCTION public.validate_campus_event_program_point();

DROP TRIGGER IF EXISTS campus_event_program_points_delete_trigger ON public.campus_event_program_points;
CREATE TRIGGER campus_event_program_points_delete_trigger
BEFORE DELETE ON public.campus_event_program_points
FOR EACH ROW EXECUTE FUNCTION public.validate_campus_event_program_point_delete();

NOTIFY pgrst, 'reload schema';
```

## 5. Verification Method
1.  **Supabase CLI Verification:**
    Apply the designed migration to the development database by saving the SQL file in `supabase/migrations/173_event_coordinator_schema.sql` and executing:
    ```bash
    supabase db reset
    ```
2.  **E2E Tests Execution:**
    Run E2E tests against the real Supabase database client by setting:
    ```bash
    USE_MOCK=false npm run test
    ```
    Verify that all Tiers (1 to 4) test cases pass.
3.  **Adversarial Check:**
    Attempting to update an approved point's name as a teacher via the Supabase client should trigger the validation function and result in a PostgREST error:
    ```
    "message": "Cannot edit name of an approved program point",
    "code": "42501"
    ```
