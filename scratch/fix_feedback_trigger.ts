import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

const sql = `
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
               OR OLD.is_scheduled IS DISTINCT FROM NEW.is_scheduled
            THEN
                RAISE EXCEPTION 'Unauthorized column modification';
            END IF;

            -- 4. Block teachers from responding to cleared/deleted feedback requests
            IF (OLD.additional_feedback_responses IS NULL 
                OR NOT (OLD.additional_feedback_responses ? 'questions')
                OR jsonb_typeof(OLD.additional_feedback_responses->'questions') <> 'array'
                OR jsonb_array_length(OLD.additional_feedback_responses->'questions') = 0)
            THEN
                -- Only raise exception if answers are modified when no questions exist
                IF COALESCE(NEW.additional_feedback_responses->'answers', '[]'::jsonb) IS DISTINCT FROM COALESCE(OLD.additional_feedback_responses->'answers', '[]'::jsonb) THEN
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
`;

async function run() {
  console.log("Updating database trigger public.validate_campus_event_program_point()...");
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) {
    console.error("FAILED to update trigger:", error);
  } else {
    console.log("SUCCESS: Trigger updated successfully!", data);
  }
}
run();
