-- ==============================================================================
-- Migration 538: Fokus Logs Metadata and Validation Mode
-- Standard: OWASP ASVS Level 3 / Zero-Trust Focus Session Governance
-- ==============================================================================

-- 1. Schema-Erweiterung: Metadata Spalte zu fokus_logs hinzufügen
ALTER TABLE public.fokus_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Autoritativer RPC: complete_focus_session aktualisieren (Persistiert p_metadata)
CREATE OR REPLACE FUNCTION public.complete_focus_session(
  p_student_id UUID,
  p_duration_seconds INTEGER,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
  v_caller_id UUID;
  v_is_master BOOLEAN;
  v_minutes INTEGER;
  v_xp INTEGER;
  v_flame TEXT;
  v_log_row RECORD;
BEGIN
  v_caller_id := public.get_current_authenticated_user_id();
  v_is_master := public.is_master_admin();

  IF NOT v_is_master AND v_caller_id IS NOT NULL AND p_student_id <> v_caller_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users_raw u
      WHERE u.id = p_student_id
        AND (public.get_current_user_school_id() IS NULL OR u.school_id = public.get_current_user_school_id())
    ) THEN
      RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_duration_seconds IS NULL OR p_duration_seconds < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session too short (< 10s)');
  END IF;

  IF p_duration_seconds > 10800 THEN
    p_duration_seconds := 10800; -- Maximal 3 Stunden cappen
  END IF;

  v_minutes := GREATEST(1, FLOOR(p_duration_seconds / 60));
  v_xp := v_minutes;

  IF v_minutes >= 30 THEN
    v_flame := 'Große Flamme';
  ELSIF v_minutes >= 15 THEN
    v_flame := 'Mittlere Flamme';
  ELSE
    v_flame := 'Kleine Flamme';
  END IF;

  INSERT INTO public.fokus_logs (
    user_id,
    duration_seconds,
    duration_minutes,
    is_extra,
    flame_level,
    xp_earned,
    metadata,
    created_at
  ) VALUES (
    p_student_id,
    p_duration_seconds,
    v_minutes,
    false,
    v_flame,
    v_xp,
    COALESCE(p_metadata, '{}'::jsonb),
    NOW()
  )
  RETURNING * INTO v_log_row;

  RETURN jsonb_build_object(
    'success', true,
    'log', row_to_json(v_log_row),
    'duration_minutes', v_minutes,
    'xp_earned', v_xp
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_focus_session(UUID, INTEGER, JSONB) TO authenticated, anon;
