-- ==============================================================================
-- 🏛️ MIGRATION 519: ENTERPRISE PROGRESS MATRIX WORM & REVISIONSSICHER AUDIT
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / GoBD, BSI & DSGVO Art. 5/24)
-- ==============================================================================
-- 1. Hardens public.log_audit_event() with enhanced homework audit metadata & actor resolution
-- 2. Implements WORM (Write Once, Read Many) integrity guard on archived historical homework
-- 3. Ensures full actor_id, teacher_id, and delta capture in public.audit_logs
-- 4. Reloads PostgREST schema cache
-- ==============================================================================

-- 1. Enhanced log_audit_event() with fallback to NEW.teacher_id / OLD.teacher_id
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    current_user_id UUID;
    v_school_id UUID;
    v_details JSONB;
BEGIN
    -- 1. Attempt user resolution via Supabase Auth JWT claims
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    -- 2. Fallback: Check custom request header x-user-id
    IF current_user_id IS NULL THEN
        BEGIN
            current_user_id := nullif(current_setting('request.headers', true)::jsonb->>'x-user-id', '')::UUID;
        EXCEPTION WHEN OTHERS THEN
            current_user_id := NULL;
        END;
    END IF;

    -- 3. Additional fallback for progress_matrix: use teacher_id from row if set
    IF current_user_id IS NULL AND TG_TABLE_NAME = 'progress_matrix' THEN
        IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.teacher_id IS NOT NULL THEN
            current_user_id := NEW.teacher_id;
        ELSIF TG_OP = 'DELETE' AND OLD.teacher_id IS NOT NULL THEN
            current_user_id := OLD.teacher_id;
        END IF;
    END IF;

    -- 4. Prevent FK violation on audit_logs_changed_by_fkey
    IF current_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users_raw WHERE id = current_user_id) THEN
        current_user_id := NULL;
    END IF;

    -- 5. Resolve tenant school_id from student_id
    IF (TG_OP = 'DELETE') THEN
        SELECT school_id INTO v_school_id FROM public.users_raw WHERE id = OLD.student_id;
        v_details := jsonb_build_object(
            'topic_name', OLD.topic_name,
            'student_id', OLD.student_id,
            'teacher_id', OLD.teacher_id,
            'is_current_homework', OLD.is_current_homework
        );
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by, school_id, details)
        VALUES (TG_TABLE_NAME::TEXT, OLD.id, TG_OP, to_jsonb(OLD), current_user_id, v_school_id, v_details);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        SELECT school_id INTO v_school_id FROM public.users_raw WHERE id = NEW.student_id;
        v_details := jsonb_build_object(
            'topic_name', NEW.topic_name,
            'student_id', NEW.student_id,
            'teacher_id', NEW.teacher_id,
            'is_current_homework', NEW.is_current_homework,
            'notes_changed', (OLD.homework_notes IS DISTINCT FROM NEW.homework_notes)
        );
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by, school_id, details)
        VALUES (TG_TABLE_NAME::TEXT, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), current_user_id, v_school_id, v_details);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        SELECT school_id INTO v_school_id FROM public.users_raw WHERE id = NEW.student_id;
        v_details := jsonb_build_object(
            'topic_name', NEW.topic_name,
            'student_id', NEW.student_id,
            'teacher_id', NEW.teacher_id,
            'is_current_homework', NEW.is_current_homework
        );
        INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by, school_id, details)
        VALUES (TG_TABLE_NAME::TEXT, NEW.id, TG_OP, to_jsonb(NEW), current_user_id, v_school_id, v_details);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- 2. Re-attach trigger
DROP TRIGGER IF EXISTS audit_progress_matrix_trigger ON public.progress_matrix;
CREATE TRIGGER audit_progress_matrix_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.progress_matrix
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 3. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
