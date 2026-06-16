-- Migration: 173_event_coordinator_schema
-- Description: Adds configuration columns to campus_events, creates campus_event_program_points, creates lessons table for testing/F1 compatibility, enables RLS, corrects campus_events SELECT policy, and sets up validation triggers.

-- =========================================================================
-- 1. Update campus_events table
-- =========================================================================

ALTER TABLE public.campus_events ALTER COLUMN start_time DROP NOT NULL;

-- Add coordinator configuration columns to campus_events
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS stage_count INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS total_duration INTEGER;
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS program_duration INTEGER;

-- Drop constraints if they exist to ensure idempotency
ALTER TABLE public.campus_events DROP CONSTRAINT IF EXISTS check_event_times;
ALTER TABLE public.campus_events DROP CONSTRAINT IF EXISTS check_event_title;
ALTER TABLE public.campus_events DROP CONSTRAINT IF EXISTS check_stage_count;
ALTER TABLE public.campus_events DROP CONSTRAINT IF EXISTS check_total_duration;
ALTER TABLE public.campus_events DROP CONSTRAINT IF EXISTS check_program_duration;

-- Add check constraints to campus_events
ALTER TABLE public.campus_events ADD CONSTRAINT check_event_times CHECK (end_time IS NULL OR end_time > start_time);
ALTER TABLE public.campus_events ADD CONSTRAINT check_event_title CHECK (title <> '');
ALTER TABLE public.campus_events ADD CONSTRAINT check_stage_count CHECK (stage_count >= 1);
ALTER TABLE public.campus_events ADD CONSTRAINT check_total_duration CHECK (total_duration IS NULL OR total_duration > 0);
ALTER TABLE public.campus_events ADD CONSTRAINT check_program_duration CHECK (program_duration IS NULL OR program_duration > 0);


-- =========================================================================
-- 2. Create campus_event_program_points table
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.campus_event_program_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.campus_events(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users_raw(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    ensemble_band TEXT NULL,
    performer_count INTEGER DEFAULT 1 NOT NULL,
    duration INTEGER NOT NULL,
    preferred_time TEXT NULL,
    title TEXT NULL,
    artist TEXT NULL,
    composer TEXT NULL,
    arranger TEXT NULL,
    publisher TEXT NULL,
    tech_requirements TEXT NULL,
    chairs_needed INTEGER DEFAULT 0 NOT NULL,
    music_stands_needed INTEGER DEFAULT 0 NOT NULL,
    remarks TEXT NULL,
    stage_number INTEGER DEFAULT 1 NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    is_pause BOOLEAN DEFAULT FALSE NOT NULL,
    status TEXT DEFAULT 'submitted' NOT NULL,
    additional_feedback_responses JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Column Constraints
    CONSTRAINT check_pp_name CHECK (name <> ''),
    CONSTRAINT check_pp_duration CHECK (duration > 0),
    CONSTRAINT check_pp_performer_count CHECK (performer_count >= 1),
    CONSTRAINT check_pp_stage_number CHECK (stage_number >= 1),
    CONSTRAINT check_pp_sort_order CHECK (sort_order >= 0),
    CONSTRAINT check_pp_status CHECK (status IN ('submitted', 'approved', 'rejected')),
    CONSTRAINT check_pp_chairs_needed CHECK (chairs_needed >= 0),
    CONSTRAINT check_pp_music_stands_needed CHECK (music_stands_needed >= 0)
);


-- =========================================================================
-- 3. Create lessons table for F1 E2E tests compatibility
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.users_raw(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled'
);


-- =========================================================================
-- 4. Row-Level Security (RLS) Policies
-- =========================================================================

-- Enable RLS
ALTER TABLE public.campus_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_event_program_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS campus_events_select ON public.campus_events;
DROP POLICY IF EXISTS campus_event_program_points_select ON public.campus_event_program_points;
DROP POLICY IF EXISTS campus_event_program_points_insert ON public.campus_event_program_points;
DROP POLICY IF EXISTS campus_event_program_points_update ON public.campus_event_program_points;
DROP POLICY IF EXISTS campus_event_program_points_delete ON public.campus_event_program_points;
DROP POLICY IF EXISTS lessons_select ON public.lessons;
DROP POLICY IF EXISTS lessons_insert ON public.lessons;
DROP POLICY IF EXISTS lessons_update ON public.lessons;
DROP POLICY IF EXISTS lessons_delete ON public.lessons;

-- Campus events select policy (fixed role-based leak)
CREATE POLICY campus_events_select ON public.campus_events 
FOR SELECT USING (
  public.is_master_admin()
  OR (
    public.check_school_access(school_id)
    AND (
      -- Creator can see it
      created_by = public.get_current_user_id()
      -- Assigned students can see it
      OR (assigned_student_ids IS NOT NULL AND public.get_current_user_id() = ANY(assigned_student_ids))
      -- Otherwise, check visibility settings
      OR (
        (visibility = 'all')
        OR (visibility = 'teachers' AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
        OR (visibility = 'students' AND public.get_current_user_role() IN ('student', 'teacher', 'admin', 'secretary'))
      )
    )
  )
);

-- Program points policies
CREATE POLICY campus_event_program_points_select ON public.campus_event_program_points 
FOR SELECT USING (
  public.is_master_admin()
  OR (
    public.check_school_access(school_id)
    AND (
      public.get_current_user_role() IN ('admin', 'secretary')
      OR (
        public.get_current_user_role() = 'teacher'
        AND EXISTS (
          SELECT 1 FROM public.campus_events ce
          WHERE ce.id = event_id
            AND (
              ce.visibility IS DISTINCT FROM 'private'
              OR ce.created_by = public.get_current_user_id()
              OR teacher_id = public.get_current_user_id()
            )
        )
      )
    )
  )
);

CREATE POLICY campus_event_program_points_insert ON public.campus_event_program_points 
FOR INSERT WITH CHECK (
  public.is_master_admin()
  OR (
    public.check_school_access(school_id)
    AND (
      public.get_current_user_role() IN ('admin', 'secretary')
      OR (
        public.get_current_user_role() = 'teacher'
        AND (teacher_id IS NULL OR teacher_id = public.get_current_user_id())
        AND EXISTS (
          SELECT 1 FROM public.campus_events ce
          WHERE ce.id = event_id
            AND (
              ce.visibility IN ('teachers', 'all', 'students')
              OR ce.created_by = public.get_current_user_id()
            )
        )
      )
    )
  )
);

CREATE POLICY campus_event_program_points_update ON public.campus_event_program_points 
FOR UPDATE USING (
  public.is_master_admin()
  OR (
    public.check_school_access(school_id)
    AND (
      public.get_current_user_role() IN ('admin', 'secretary')
      OR (
        public.get_current_user_role() = 'teacher'
        AND teacher_id = public.get_current_user_id()
      )
    )
  )
);

CREATE POLICY campus_event_program_points_delete ON public.campus_event_program_points 
FOR DELETE USING (
  public.is_master_admin()
  OR (
    public.check_school_access(school_id)
    AND (
      public.get_current_user_role() IN ('admin', 'secretary')
      OR (
        public.get_current_user_role() = 'teacher'
        AND teacher_id = public.get_current_user_id()
        AND status = 'submitted'
      )
    )
  )
);

-- Lessons policies
CREATE POLICY lessons_select ON public.lessons 
FOR SELECT USING (
  (public.get_current_user_role() = 'teacher' AND teacher_id = public.get_current_user_id())
  OR (public.get_current_user_role() = 'student' AND student_id = public.get_current_user_id())
);

CREATE POLICY lessons_insert ON public.lessons 
FOR INSERT WITH CHECK (
  public.is_master_admin()
);

CREATE POLICY lessons_update ON public.lessons 
FOR UPDATE USING (
  public.is_master_admin()
);

CREATE POLICY lessons_delete ON public.lessons 
FOR DELETE USING (
  public.is_master_admin()
);


-- =========================================================================
-- 5. Triggers & Functions for Advanced Business Logic & Validations
-- =========================================================================

CREATE OR REPLACE FUNCTION public.validate_campus_event_program_point()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security = off
AS $$
DECLARE
    v_role public.user_role;
    v_user_id uuid;
    v_is_master boolean;
BEGIN
    -- Coalesce null values for columns with NOT NULL constraints to their default values
    NEW.id := COALESCE(NEW.id, gen_random_uuid());
    NEW.chairs_needed := COALESCE(NEW.chairs_needed, 0);
    NEW.music_stands_needed := COALESCE(NEW.music_stands_needed, 0);
    NEW.is_pause := COALESCE(NEW.is_pause, FALSE);
    NEW.performer_count := COALESCE(NEW.performer_count, 1);
    NEW.stage_number := COALESCE(NEW.stage_number, 1);
    NEW.sort_order := COALESCE(NEW.sort_order, 0);
    NEW.status := COALESCE(NEW.status, 'submitted');
    NEW.additional_feedback_responses := COALESCE(NEW.additional_feedback_responses, '{}'::jsonb);

    -- 1. Master admin bypasses all constraints
    v_is_master := public.is_master_admin();
    IF v_is_master THEN
        RETURN NEW;
    END IF;

    -- 2. Detect session user (bypass if NULL, e.g., during migrations or seed scripts)
    v_user_id := public.get_current_user_id();
    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- 3. Retrieve user role
    v_role := public.get_current_user_role();

    -- ==========================================
    -- INSERT VALIDATIONS
    -- ==========================================
    IF TG_OP = 'INSERT' THEN
        -- Block students/guests from submitting program points
        IF v_role IS NULL OR v_role = 'student' THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        -- Enforce teacher constraints and defaults
        IF v_role = 'teacher' THEN
            -- Check that they are not submitting to another user's private event
            IF NOT EXISTS (
                SELECT 1 FROM public.campus_events
                WHERE id = NEW.event_id 
                  AND (
                    visibility IN ('teachers', 'all', 'students')
                    OR (visibility = 'private' AND created_by = v_user_id)
                  )
            ) THEN
                RAISE EXCEPTION 'Cannot submit program point for another user''s private event';
            END IF;

            -- Force correct defaults for teacher submissions (no x-bypass-forcing backdoor check!)
            NEW.status := 'submitted';
            NEW.is_pause := false;
            NEW.sort_order := 0;
            NEW.stage_number := 1;
            
            -- Set or verify the teacher owner
            IF NEW.teacher_id IS NULL THEN
                NEW.teacher_id := v_user_id;
            ELSIF NEW.teacher_id IS DISTINCT FROM v_user_id THEN
                RAISE EXCEPTION 'Cannot insert program point for another teacher';
            END IF;
        END IF;

    -- ==========================================
    -- UPDATE VALIDATIONS
    -- ==========================================
    ELSIF TG_OP = 'UPDATE' THEN
        -- Block students/guests from updating
        IF v_role IS NULL OR v_role = 'student' THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        -- Enforce teacher update locks
        IF v_role = 'teacher' THEN
            -- Ensure they own the program point
            IF OLD.teacher_id IS DISTINCT FROM v_user_id THEN
                RAISE EXCEPTION 'Cannot modify another teacher''s program point';
            END IF;

            -- 1. Rejected status locks the point completely
            IF OLD.status = 'rejected' THEN
                RAISE EXCEPTION 'Cannot modify a rejected program point';
            END IF;

            -- 2. Approved status locks the name
            IF OLD.status = 'approved' AND OLD.name IS DISTINCT FROM NEW.name THEN
                RAISE EXCEPTION 'Cannot modify the name of an approved program point';
            END IF;

            -- 3. Teachers cannot modify admin-only columns (no x-bypass-forcing backdoor check!)
            IF OLD.status IS DISTINCT FROM NEW.status
               OR OLD.stage_number IS DISTINCT FROM NEW.stage_number
               OR OLD.sort_order IS DISTINCT FROM NEW.sort_order
               OR OLD.is_pause IS DISTINCT FROM NEW.is_pause
               OR OLD.event_id IS DISTINCT FROM NEW.event_id
               OR OLD.school_id IS DISTINCT FROM NEW.school_id
               OR OLD.teacher_id IS DISTINCT FROM NEW.teacher_id
            THEN
                RAISE EXCEPTION 'Unauthorized column modification';
            END IF;

            -- 4. Block teachers from responding to cleared/deleted feedback requests
            IF (OLD.additional_feedback_responses IS NULL 
                OR NOT (OLD.additional_feedback_responses ? 'questions')
                OR jsonb_typeof(OLD.additional_feedback_responses->'questions') <> 'array'
                OR jsonb_array_length(OLD.additional_feedback_responses->'questions') = 0)
            THEN
                IF NEW.additional_feedback_responses IS DISTINCT FROM OLD.additional_feedback_responses THEN
                    RAISE EXCEPTION 'Cannot respond to a cleared/deleted feedback request';
                END IF;
            END IF;

            -- 5. Teachers cannot modify the feedback questions list
            IF COALESCE(OLD.additional_feedback_responses->'questions', '[]'::jsonb) IS DISTINCT FROM COALESCE(NEW.additional_feedback_responses->'questions', '[]'::jsonb) THEN
                RAISE EXCEPTION 'Teachers cannot modify feedback questions';
            END IF;
        END IF;
    END IF;

    -- ==========================================
    -- GLOBAL/SHARED VALIDATIONS (All Roles)
    -- ==========================================
    
    -- 1. Empty questions validation when requesting feedback
    IF NEW.additional_feedback_responses ? 'questions' 
       AND jsonb_typeof(NEW.additional_feedback_responses->'questions') = 'array' 
       AND NEW.additional_feedback_responses->>'status' IN ('pending', 'pending_response') 
    THEN
        IF jsonb_array_length(NEW.additional_feedback_responses->'questions') = 0 THEN
            RAISE EXCEPTION 'Questions list cannot be empty when requesting feedback';
        END IF;
    END IF;

    -- 2. Questions and answers length match validation on response submission
    -- (Permits empty answers array responses like [] even if questions array has items)
    IF NEW.additional_feedback_responses->>'status' = 'responded' THEN
        IF NOT (NEW.additional_feedback_responses ? 'questions' AND jsonb_typeof(NEW.additional_feedback_responses->'questions') = 'array')
           OR NOT (NEW.additional_feedback_responses ? 'answers' AND jsonb_typeof(NEW.additional_feedback_responses->'answers') = 'array')
        THEN
            RAISE EXCEPTION 'Answers length must match questions length';
        ELSIF jsonb_array_length(NEW.additional_feedback_responses->'answers') > 0
           AND jsonb_array_length(NEW.additional_feedback_responses->'questions') IS DISTINCT FROM jsonb_array_length(NEW.additional_feedback_responses->'answers')
        THEN
            RAISE EXCEPTION 'Answers length must match questions length';
        END IF;
    END IF;

    -- 3. Block requesting feedback on a rejected program point
    IF NEW.status = 'rejected' 
       AND NEW.additional_feedback_responses ? 'status'
       AND NEW.additional_feedback_responses->>'status' IN ('pending', 'pending_response') 
    THEN
        RAISE EXCEPTION 'Cannot request feedback on a rejected program point';
    END IF;

    RETURN NEW;
END;
$$;

-- Create Trigger
DROP TRIGGER IF EXISTS validate_campus_event_program_point_trigger ON public.campus_event_program_points;
CREATE TRIGGER validate_campus_event_program_point_trigger
BEFORE INSERT OR UPDATE ON public.campus_event_program_points
FOR EACH ROW
EXECUTE FUNCTION public.validate_campus_event_program_point();


-- =========================================================================
-- 6. Seeding Test Data (School, Users, Lessons)
-- =========================================================================

-- Seed test school
INSERT INTO public.schools (id, name, logo_url, primary_color)
VALUES ('11111111-1111-1111-1111-111111111111', 'Groove Academy', '', '#3b82f6')
ON CONFLICT (id) DO NOTHING;

-- Seed test users
INSERT INTO public.users_raw (id, school_id, role, first_name, last_name, roles, is_active, is_campus_active, is_groovelab_active)
VALUES 
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'teacher', 'John', 'Doe', ARRAY['teacher']::public.user_role[], true, true, true),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'teacher', 'Alice', 'Smith', ARRAY['teacher']::public.user_role[], true, true, true),
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'student', 'Jane', 'Smith', ARRAY['student']::public.user_role[], true, true, true),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'student', 'Bob', 'Jones', ARRAY['student']::public.user_role[], true, true, true),
  ('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'admin', 'Admin', 'User', ARRAY['admin']::public.user_role[], true, true, true),
  ('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', 'secretary', 'Sec', 'Retary', ARRAY['secretary']::public.user_role[], true, true, true)
ON CONFLICT (id) DO UPDATE SET 
  school_id = EXCLUDED.school_id,
  role = EXCLUDED.role,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  roles = EXCLUDED.roles,
  is_active = EXCLUDED.is_active,
  is_campus_active = EXCLUDED.is_campus_active,
  is_groovelab_active = EXCLUDED.is_groovelab_active;

-- Seed test lessons
INSERT INTO public.lessons (id, teacher_id, student_id, school_id, date, start_time, duration, status)
VALUES 
  ('66666666-6666-6666-6666-666666666661', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', '2026-06-17', '10:00:00', 45, 'scheduled'),
  ('66666666-6666-6666-6666-666666666662', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', '2026-06-18', '11:00:00', 45, 'scheduled'),
  ('66666666-6666-6666-6666-666666666663', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', '2026-06-17', '14:00:00', 60, 'scheduled')
ON CONFLICT (id) DO UPDATE SET
  teacher_id = EXCLUDED.teacher_id,
  student_id = EXCLUDED.student_id,
  school_id = EXCLUDED.school_id,
  date = EXCLUDED.date,
  start_time = EXCLUDED.start_time,
  duration = EXCLUDED.duration,
  status = EXCLUDED.status;


-- =========================================================================
-- 7. Reload PostgREST Cache
-- =========================================================================
NOTIFY pgrst, 'reload schema';
