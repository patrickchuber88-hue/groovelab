-- Migration: 188_harden_event_coordinator_db
-- Description: Hardens validate_campus_event_program_point and get_schedule_conflicts with search_path.

-- =========================================================================
-- 1. Redefine validate_campus_event_program_point with search_path
-- =========================================================================

CREATE OR REPLACE FUNCTION public.validate_campus_event_program_point()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
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


-- =========================================================================
-- 2. Package get_schedule_conflicts RPC with search_path hardening
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_schedule_conflicts(
  p_event_id UUID,
  p_transition_time INT DEFAULT 10
)
RETURNS TABLE (
  program_point_id UUID,
  conflict_type TEXT,
  conflict_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_event RECORD;
  v_start_min INT;
  v_stage_num INT;
  v_rec RECORD;
  v_current_min INT;
  v_idx INT;
  v_prev_is_pause BOOLEAN;
BEGIN
  -- Clear temp table if it exists
  DROP TABLE IF EXISTS temp_pp_times;

  -- 1. Fetch event info
  SELECT event_date, start_time 
  INTO v_event 
  FROM public.campus_events 
  WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  v_start_min := public.parse_time_to_minutes(coalesce(to_char(v_event.start_time, 'HH24:MI'), '14:00'));
  
  -- Create a temporary table to hold calculated times
  CREATE TEMP TABLE temp_pp_times (
    pp_id UUID,
    stage_number INT,
    teacher_id UUID,
    is_pause BOOLEAN,
    start_min INT,
    end_min INT
  ) ON COMMIT DROP;
  
  -- Loop through each stage
  FOR v_stage_num IN 
    SELECT DISTINCT stage_number 
    FROM public.campus_event_program_points 
    WHERE event_id = p_event_id 
      AND (is_scheduled = TRUE OR is_pause = TRUE)
    ORDER BY stage_number
  LOOP
    v_current_min := v_start_min;
    v_idx := 0;
    v_prev_is_pause := FALSE;
    
    FOR v_rec IN 
      SELECT id, duration, is_pause, teacher_id 
      FROM public.campus_event_program_points 
      WHERE event_id = p_event_id 
        AND stage_number = v_stage_num 
        AND (is_scheduled = TRUE OR is_pause = TRUE)
      ORDER BY sort_order
    LOOP
      IF v_idx > 0 AND NOT v_rec.is_pause AND NOT v_prev_is_pause THEN
        v_current_min := v_current_min + p_transition_time;
      END IF;
      
      INSERT INTO temp_pp_times (pp_id, stage_number, teacher_id, is_pause, start_min, end_min)
      VALUES (v_rec.id, v_stage_num, v_rec.teacher_id, v_rec.is_pause, v_current_min, v_current_min + v_rec.duration);
      
      v_current_min := v_current_min + v_rec.duration;
      v_idx := v_idx + 1;
      v_prev_is_pause := v_rec.is_pause;
    END LOOP;
  END LOOP;
  
  -- Now find conflicts
  RETURN QUERY
  -- 1. Lesson conflicts
  SELECT 
    t.pp_id AS program_point_id,
    'lesson'::TEXT AS conflict_type,
    ('Kollision mit Unterricht (' || to_char(l.start_time, 'HH24:MI') || ' - ' || public.format_minutes_to_time(public.parse_time_to_minutes(l.start_time::text) + l.duration) || ')')::TEXT AS conflict_message
  FROM temp_pp_times t
  JOIN public.lessons l ON l.teacher_id = t.teacher_id AND l.date = v_event.event_date
  WHERE NOT t.is_pause 
    AND t.teacher_id IS NOT NULL
    AND (l.status IS NULL OR (l.status NOT LIKE 'cancel%' AND l.status <> 'teacher_sick'))
    AND t.start_min < (public.parse_time_to_minutes(l.start_time::text) + l.duration)
    AND t.end_min > public.parse_time_to_minutes(l.start_time::text)
    
  UNION ALL
  
  -- 2. Stage conflicts
  SELECT 
    t1.pp_id AS program_point_id,
    'stage'::TEXT AS conflict_type,
    ('Kollision mit Beitrag auf Bühne ' || t2.stage_number || ' (' || public.format_minutes_to_time(t2.start_min) || ' - ' || public.format_minutes_to_time(t2.end_min) || ')')::TEXT AS conflict_message
  FROM temp_pp_times t1
  JOIN temp_pp_times t2 ON t1.teacher_id = t2.teacher_id 
  WHERE NOT t1.is_pause 
    AND NOT t2.is_pause
    AND t1.teacher_id IS NOT NULL
    AND t1.pp_id <> t2.pp_id
    AND t1.stage_number <> t2.stage_number
    AND t1.start_min < t2.end_min
    AND t1.end_min > t2.start_min;
    
  -- Clean up
  DROP TABLE IF EXISTS temp_pp_times;
END;
$$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
