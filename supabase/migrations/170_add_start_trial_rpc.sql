-- Migration: 170_add_start_trial_rpc
-- Description: Create public.start_student_trial(p_qr_token text) SECURITY DEFINER to allow anonymous/authenticated users to activate trial phase.

CREATE OR REPLACE FUNCTION public.start_student_trial(p_qr_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user record;
  v_result jsonb;
BEGIN
  -- Find student by qr_token or teacher_qr_token
  SELECT * INTO v_user
  FROM public.users
  WHERE qr_token::text = p_qr_token OR teacher_qr_token = p_qr_token
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schüler mit diesem QR-Token wurde nicht gefunden.';
  END IF;

  -- Update user to active, trial = true, trial_ends_at = NOW() + 7 days
  UPDATE public.users
  SET 
    is_campus_active = true,
    is_trial = true,
    trial_ends_at = NOW() + INTERVAL '7 days',
    activated_at = NOW()
  WHERE id = v_user.id
  RETURNING * INTO v_user;

  -- Return updated user
  v_result := to_jsonb(v_user);
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_student_trial(text) TO anon, authenticated;
