-- ==============================================================================
-- MIGRATION 393: ORIGINAL_START_TIME SCHEMA ALIGNMENT & AUTHORITATIVE RESET RPC
-- Fixes:
-- 1. Adds missing column original_start_time to public.schedule_occurrences
-- 2. Implements authoritative reset_teacher_schedule_occurrences RPC with 
--    fail-closed history protection (never deletes past dates prior to CURRENT_DATE)
-- ==============================================================================

-- 1. Schema Alignment
ALTER TABLE public.schedule_occurrences 
  ADD COLUMN IF NOT EXISTS original_start_time TIME WITHOUT TIME ZONE;

-- 2. Performance Index for original dates
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_orig_date 
  ON public.schedule_occurrences(teacher_id, original_date);

-- 3. Authoritative Reset RPC
CREATE OR REPLACE FUNCTION public.reset_teacher_schedule_occurrences(
  p_teacher_id UUID,
  p_scope TEXT, -- 'week' or 'school_year'
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN := FALSE;
  v_deleted_count INTEGER := 0;
  v_today DATE := CURRENT_DATE;
  v_effective_start DATE;
BEGIN
  -- Security check: Authenticated caller
  v_caller_id := public.get_current_authenticated_user_id();
  v_is_admin := public.is_master_admin();

  IF v_caller_id IS NULL AND NOT v_is_admin THEN
    -- In kiosk or testing environments, allow if valid UUID
    IF p_teacher_id IS NULL THEN
      RAISE EXCEPTION 'Not authenticated and no teacher specified';
    END IF;
  ELSE
    -- Caller must be the teacher themselves or an authorized school admin/secretary
    IF v_caller_id IS NOT NULL AND v_caller_id <> p_teacher_id AND NOT v_is_admin THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.users_raw u1
        JOIN public.users_raw u2 ON u1.school_id = u2.school_id
        WHERE u1.id = v_caller_id 
          AND u1.role IN ('admin', 'secretary')
          AND u2.id = p_teacher_id
      ) THEN
        RAISE EXCEPTION 'Not authorized to reset schedule for this teacher';
      END IF;
    END IF;
  END IF;

  -- Fail-closed history protection: Never delete past occurrences prior to today
  v_effective_start := GREATEST(p_start_date, v_today);

  IF p_end_date < v_today THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Historien-Schutz: Termine vor dem heutigen Tag können nicht zurückgesetzt werden.',
      'deleted_count', 0
    );
  END IF;

  -- Delete matching schedule_occurrences
  WITH deleted_rows AS (
    DELETE FROM public.schedule_occurrences
    WHERE teacher_id = p_teacher_id
      AND (
        (date >= v_effective_start AND date <= p_end_date)
        OR
        (original_date >= v_effective_start AND original_date <= p_end_date)
      )
      AND (date IS NULL OR date >= v_today)
    RETURNING id, date, start_time
  )
  SELECT count(*) INTO v_deleted_count FROM deleted_rows;

  -- Clean up corresponding room bookings for deleted slots
  DELETE FROM public.room_bookings
  WHERE booked_by = p_teacher_id
    AND date >= v_effective_start
    AND date <= p_end_date;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'start_date', v_effective_start,
    'end_date', p_end_date
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_teacher_schedule_occurrences(UUID, TEXT, DATE, DATE) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
