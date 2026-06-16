-- Migration: 173_event_coordinator_schema.sql
-- Description: Applies schema migrations for event config (campus_events) and program points (campus_event_program_points), enabling RLS, custom policies, and validation triggers.

-- 1. Configure existing campus_events table
-- Add columns for stage count, total duration, and program duration with appropriate constraints
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS stage_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS total_duration INTEGER;
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS program_duration INTEGER;

-- Drop constraints if they exist to ensure clean state
ALTER TABLE public.campus_events DROP CONSTRAINT IF EXISTS check_stage_count;
ALTER TABLE public.campus_events DROP CONSTRAINT IF EXISTS check_total_duration;
ALTER TABLE public.campus_events DROP CONSTRAINT IF EXISTS check_program_duration;

-- Add check constraints
ALTER TABLE public.campus_events ADD CONSTRAINT check_stage_count CHECK (stage_count >= 1);
ALTER TABLE public.campus_events ADD CONSTRAINT check_total_duration CHECK (total_duration IS NULL OR total_duration >= 0);
ALTER TABLE public.campus_events ADD CONSTRAINT check_program_duration CHECK (program_duration IS NULL OR program_duration >= 0);


-- 2. Create campus_event_program_points table
CREATE TABLE IF NOT EXISTS public.campus_event_program_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.campus_events(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    ensemble_band TEXT,
    performer_count INTEGER NOT NULL DEFAULT 1,
    duration INTEGER NOT NULL,
    preferred_time TEXT,
    title TEXT,
    artist TEXT,
    composer TEXT,
    arranger TEXT,
    publisher TEXT,
    tech_requirements TEXT,
    chairs_needed INTEGER NOT NULL DEFAULT 0,
    music_stands_needed INTEGER NOT NULL DEFAULT 0,
    remarks TEXT,
    stage_number INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_pause BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'submitted',
    additional_feedback_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_performer_count CHECK (performer_count >= 0),
    CONSTRAINT check_duration CHECK (duration >= 0),
    CONSTRAINT check_stage_number CHECK (stage_number >= 1),
    CONSTRAINT check_sort_order CHECK (sort_order >= 0),
    CONSTRAINT check_status CHECK (status IN ('submitted', 'approved', 'rejected')),
    CONSTRAINT check_chairs_needed CHECK (chairs_needed >= 0),
    CONSTRAINT check_music_stands_needed CHECK (music_stands_needed >= 0)
);


-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.campus_event_program_points ENABLE ROW LEVEL SECURITY;


-- 4. Create RLS Policies for campus_event_program_points

-- SELECT Policy:
-- Allow read access for master admins, or for teachers/admins/secretaries of the school.
-- (Students are excluded from accessing program points directly, protecting feedback details)
DROP POLICY IF EXISTS campus_event_program_points_select ON public.campus_event_program_points;
CREATE POLICY campus_event_program_points_select ON public.campus_event_program_points
FOR SELECT USING (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary')
    )
);

-- INSERT Policy:
-- Allow inserts for master admins, school admins/secretaries, and teachers (restricted to their own teacher_id)
DROP POLICY IF EXISTS campus_event_program_points_insert ON public.campus_event_program_points;
CREATE POLICY campus_event_program_points_insert ON public.campus_event_program_points
FOR INSERT WITH CHECK (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        AND (
            public.get_current_user_role() IN ('admin', 'secretary')
            OR teacher_id = public.get_current_user_id()
        )
    )
);

-- UPDATE Policy:
-- Allow updates for master admins, school admins/secretaries, and teachers (who are owners of the row)
DROP POLICY IF EXISTS campus_event_program_points_update ON public.campus_event_program_points;
CREATE POLICY campus_event_program_points_update ON public.campus_event_program_points
FOR UPDATE USING (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
    )
) WITH CHECK (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
    )
);

-- DELETE Policy:
-- Allow deletes for master admins, school admins/secretaries, and teachers (restricted to own points and status must not be approved)
DROP POLICY IF EXISTS campus_event_program_points_delete ON public.campus_event_program_points;
CREATE POLICY campus_event_program_points_delete ON public.campus_event_program_points
FOR DELETE USING (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        AND (
            public.get_current_user_role() IN ('admin', 'secretary')
            OR (
                teacher_id = public.get_current_user_id()
                AND status != 'approved'
            )
        )
    )
);


-- 5. Validation Trigger Function
CREATE OR REPLACE FUNCTION public.validate_program_point()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_role public.user_role;
BEGIN
    -- Master admin bypasses all validations
    IF public.is_master_admin() THEN
        RETURN NEW;
    END IF;

    -- Get current user context
    v_user_id := public.get_current_user_id();
    v_role := public.get_current_user_role();

    -- If no user is logged in (e.g., direct psql execution in migration/seed), bypass checks
    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Enforce role-based validations
    IF v_role = 'student' THEN
        RAISE EXCEPTION 'Students are not authorized to modify program points';
        
    ELSIF v_role = 'teacher' THEN
        -- ON INSERT validation for teachers
        IF TG_OP = 'INSERT' THEN
            -- Teachers can only insert their own points
            IF NEW.teacher_id IS NULL THEN
                NEW.teacher_id := v_user_id;
            ELSIF NEW.teacher_id IS DISTINCT FROM v_user_id THEN
                RAISE EXCEPTION 'Teachers can only submit program points under their own teacher ID';
            END IF;

            -- Teachers can only insert with status 'submitted'
            IF NEW.status IS DISTINCT FROM 'submitted' THEN
                RAISE EXCEPTION 'Teachers can only submit program points with "submitted" status';
            END IF;
            
            -- Defaults for teacher submission
            NEW.stage_number := COALESCE(NEW.stage_number, 1);
            NEW.sort_order := COALESCE(NEW.sort_order, 0);
            NEW.is_pause := COALESCE(NEW.is_pause, FALSE);
        END IF;

        -- ON UPDATE validation for teachers
        IF TG_OP = 'UPDATE' THEN
            -- Ensure the teacher owns the program point
            IF OLD.teacher_id IS DISTINCT FROM v_user_id THEN
                RAISE EXCEPTION 'Teachers can only modify their own program points';
            END IF;

            -- Lock edits if the point has already been approved
            IF OLD.status = 'approved' THEN
                RAISE EXCEPTION 'Approved program points are locked and cannot be modified by teachers';
            END IF;

            -- Prevent teachers from changing admin-only columns
            IF NEW.status IS DISTINCT FROM OLD.status THEN
                RAISE EXCEPTION 'Teachers cannot change program point status';
            END IF;
            IF NEW.stage_number IS DISTINCT FROM OLD.stage_number THEN
                RAISE EXCEPTION 'Teachers cannot modify stage number';
            END IF;
            IF NEW.sort_order IS DISTINCT FROM OLD.sort_order THEN
                RAISE EXCEPTION 'Teachers cannot modify sort order';
            END IF;
            IF NEW.is_pause IS DISTINCT FROM OLD.is_pause THEN
                RAISE EXCEPTION 'Teachers cannot modify pause status';
            END IF;

            -- Check feedback responses modifications
            IF NEW.additional_feedback_responses IS DISTINCT FROM OLD.additional_feedback_responses THEN
                -- Teachers cannot modify the questions list
                IF NEW.additional_feedback_responses->'questions' IS DISTINCT FROM OLD.additional_feedback_responses->'questions' THEN
                    RAISE EXCEPTION 'Teachers cannot modify feedback questions';
                END IF;

                -- Teachers cannot respond if feedback request is cleared/deleted by secretary
                IF (OLD.additional_feedback_responses IS NULL 
                    OR OLD.additional_feedback_responses = '{}'::jsonb 
                    OR NOT (OLD.additional_feedback_responses ? 'questions')
                   ) AND (
                    NEW.additional_feedback_responses ? 'answers' 
                    OR NEW.additional_feedback_responses ? 'questions'
                   ) THEN
                    RAISE EXCEPTION 'Cannot respond to a feedback request that does not exist or has been cleared';
                END IF;

                -- Validation of answers length when marking status as 'responded'
                IF NEW.additional_feedback_responses->>'status' = 'responded' THEN
                    IF NOT (NEW.additional_feedback_responses ? 'answers') 
                       OR NEW.additional_feedback_responses->'answers' IS NULL 
                       OR jsonb_array_length(NEW.additional_feedback_responses->'answers') IS DISTINCT FROM jsonb_array_length(NEW.additional_feedback_responses->'questions') THEN
                        RAISE EXCEPTION 'Feedback answers length must match questions length exactly';
                    END IF;
                END IF;
            END IF;
        END IF;

    ELSIF v_role IN ('admin', 'secretary') THEN
        -- ON INSERT & UPDATE validation for admins/secretaries
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            -- Validate requested feedback questions array
            IF NEW.additional_feedback_responses ? 'questions' THEN
                IF NEW.additional_feedback_responses->'questions' IS NULL 
                   OR jsonb_array_length(NEW.additional_feedback_responses->'questions') = 0 THEN
                    RAISE EXCEPTION 'Questions list cannot be empty';
                END IF;
            END IF;

            -- Prevent requesting feedback on rejected program points
            IF TG_OP = 'UPDATE' THEN
                IF OLD.status = 'rejected' AND NEW.additional_feedback_responses IS DISTINCT FROM OLD.additional_feedback_responses THEN
                    -- Only allow if status is also changing to something other than 'rejected'
                    IF NEW.status = 'rejected' THEN
                        RAISE EXCEPTION 'Cannot request feedback on rejected program points';
                    END IF;
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Attach Trigger
DROP TRIGGER IF EXISTS validate_program_point_trigger ON public.campus_event_program_points;
CREATE TRIGGER validate_program_point_trigger
BEFORE INSERT OR UPDATE ON public.campus_event_program_points
FOR EACH ROW EXECUTE FUNCTION public.validate_program_point();


-- 7. Create Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_program_points_event_id ON public.campus_event_program_points(event_id);
CREATE INDEX IF NOT EXISTS idx_program_points_school_id ON public.campus_event_program_points(school_id);
CREATE INDEX IF NOT EXISTS idx_program_points_teacher_id ON public.campus_event_program_points(teacher_id);
CREATE INDEX IF NOT EXISTS idx_program_points_stage_sort ON public.campus_event_program_points(event_id, stage_number, sort_order);


-- 8. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
