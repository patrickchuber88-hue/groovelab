-- Migration: 173_event_coordinator_schema
-- Description: Adds configuration columns to campus_events, creates campus_event_program_points, enables RLS, and sets up validation triggers.

-- =========================================================================
-- 1. Update campus_events table
-- =========================================================================

-- Add coordinator configuration columns to campus_events
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS stage_count INTEGER DEFAULT 1;
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
ALTER TABLE public.campus_events ADD CONSTRAINT check_stage_count CHECK (stage_count > 0);
ALTER TABLE public.campus_events ADD CONSTRAINT check_total_duration CHECK (total_duration IS NULL OR total_duration > 0);
ALTER TABLE public.campus_events ADD CONSTRAINT check_program_duration CHECK (program_duration IS NULL OR program_duration > 0);


-- =========================================================================
-- 2. Create campus_event_program_points table
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.campus_event_program_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.campus_events(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    ensemble_band TEXT,
    performer_count INTEGER DEFAULT 1,
    duration INTEGER NOT NULL,
    preferred_time TEXT,
    title TEXT,
    artist TEXT,
    composer TEXT,
    arranger TEXT,
    publisher TEXT,
    tech_requirements TEXT,
    chairs_needed INTEGER DEFAULT 0,
    music_stands_needed INTEGER DEFAULT 0,
    remarks TEXT,
    stage_number INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    is_pause BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'submitted',
    additional_feedback_responses JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Column Constraints
    CONSTRAINT check_pp_name CHECK (name <> ''),
    CONSTRAINT check_pp_duration CHECK (duration > 0),
    CONSTRAINT check_pp_performer_count CHECK (performer_count > 0),
    CONSTRAINT check_pp_stage_number CHECK (stage_number > 0),
    CONSTRAINT check_pp_sort_order CHECK (sort_order >= 0),
    CONSTRAINT check_pp_status CHECK (status IN ('submitted', 'approved', 'rejected'))
);


-- =========================================================================
-- 3. Row-Level Security (RLS) Policies
-- =========================================================================

-- Enable RLS
ALTER TABLE public.campus_event_program_points ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS campus_event_program_points_select ON public.campus_event_program_points;
DROP POLICY IF EXISTS campus_event_program_points_insert ON public.campus_event_program_points;
DROP POLICY IF EXISTS campus_event_program_points_update ON public.campus_event_program_points;
DROP POLICY IF EXISTS campus_event_program_points_delete ON public.campus_event_program_points;

-- SELECT: Admins, secretaries, and teachers from same school who have access to the parent event (respects private visibility)
CREATE POLICY campus_event_program_points_select ON public.campus_event_program_points 
FOR SELECT USING (
  public.is_master_admin()
  OR (
    public.check_school_access(school_id)
    AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
    AND EXISTS (
      SELECT 1 FROM public.campus_events ce
      WHERE ce.id = event_id
    )
  )
);

-- INSERT: Admins, secretaries, and teachers (teachers cannot submit to private events)
CREATE POLICY campus_event_program_points_insert ON public.campus_event_program_points 
FOR INSERT WITH CHECK (
  public.is_master_admin()
  OR (
    public.check_school_access(school_id)
    AND (
      public.get_current_user_role() IN ('admin', 'secretary')
      OR (
        public.get_current_user_role() = 'teacher'
        AND EXISTS (
          SELECT 1 FROM public.campus_events ce
          WHERE ce.id = event_id AND ce.visibility IN ('teachers', 'all')
        )
      )
    )
  )
);

-- UPDATE: Admins, secretaries, and owner teachers
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

-- DELETE: Admins, secretaries, and owner teachers (teachers can only delete if status is submitted)
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


-- =========================================================================
-- 4. Triggers & Functions for Advanced Business Logic & Validations
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
            -- Check that they are not submitting to a private event
            IF NOT EXISTS (
                SELECT 1 FROM public.campus_events
                WHERE id = NEW.event_id AND visibility IN ('teachers', 'all')
            ) THEN
                RAISE EXCEPTION 'Cannot submit program point for a private event';
            END IF;

            -- Force correct defaults for teacher submissions
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

            -- 3. Teachers cannot modify admin-only columns
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
    IF NEW.additional_feedback_responses->>'status' = 'responded' THEN
        IF NOT (NEW.additional_feedback_responses ? 'questions' AND jsonb_typeof(NEW.additional_feedback_responses->'questions') = 'array')
           OR NOT (NEW.additional_feedback_responses ? 'answers' AND jsonb_typeof(NEW.additional_feedback_responses->'answers') = 'array')
           OR jsonb_array_length(NEW.additional_feedback_responses->'questions') IS DISTINCT FROM jsonb_array_length(NEW.additional_feedback_responses->'answers')
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
-- 5. Reload PostgREST Cache
-- =========================================================================
NOTIFY pgrst, 'reload schema';
