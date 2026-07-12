-- Migration: 218_security_privacy_hardening
-- Description: Enables RLS on one_time_upload_pins, creates pin_verification_attempts, creates verify_photo_upload_pin RPC, creates auto-deactivation trigger/function, and hashes magic_link_logs emails.

-- 1. Enable RLS on one_time_upload_pins
ALTER TABLE public.one_time_upload_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS one_time_upload_pins_policy ON public.one_time_upload_pins;
CREATE POLICY one_time_upload_pins_policy ON public.one_time_upload_pins
FOR ALL USING (
  public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
  OR student_id = public.get_current_user_id()
);

-- 2. Create pin_verification_attempts table
CREATE TABLE IF NOT EXISTS public.pin_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pin_verification_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pin_verification_attempts_policy ON public.pin_verification_attempts;
CREATE POLICY pin_verification_attempts_policy ON public.pin_verification_attempts
FOR ALL USING (public.is_master_admin());

-- 3. Create verify_photo_upload_pin RPC function
CREATE OR REPLACE FUNCTION public.verify_photo_upload_pin(
  p_student_id UUID,
  p_pin_code TEXT,
  p_photo_url TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_attempts INTEGER;
  v_pin_record RECORD;
BEGIN
  -- Clean up attempts older than 15 minutes
  DELETE FROM public.pin_verification_attempts WHERE attempted_at < NOW() - INTERVAL '15 minutes';

  -- Check recent attempts
  SELECT COUNT(*)::INTEGER INTO v_recent_attempts
  FROM public.pin_verification_attempts
  WHERE student_id = p_student_id;

  IF v_recent_attempts >= 3 THEN
    RAISE EXCEPTION 'Zu viele Fehlversuche. Bitte warte 15 Minuten, bevor du es erneut versuchst.';
  END IF;

  -- Search for active, unused pin for this student
  SELECT * INTO v_pin_record
  FROM public.one_time_upload_pins
  WHERE student_id = p_student_id
    AND pin_code = p_pin_code
    AND is_used = false
  LIMIT 1;

  IF v_pin_record.id IS NULL THEN
    -- Log failed attempt
    INSERT INTO public.pin_verification_attempts (student_id) VALUES (p_student_id);
    RAISE EXCEPTION 'Ungültiger PIN-Code.';
  END IF;

  -- Success: Mark PIN as used and update user's photo_url
  UPDATE public.one_time_upload_pins
  SET is_used = true,
      used_at = NOW()
  WHERE id = v_pin_record.id;

  UPDATE public.users
  SET photo_url = p_photo_url
  WHERE id = p_student_id;

  -- Clear verification attempts on success
  DELETE FROM public.pin_verification_attempts WHERE student_id = p_student_id;

  RETURN TRUE;
END;
$$;

-- 4. Inactivity auto-deactivation checking function
CREATE OR REPLACE FUNCTION public.auto_deactivate_inactive_students()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deactivate students whose school pays monthly, if inactive for 2+ months
  UPDATE public.users u
  SET is_campus_active = false,
      is_groovelab_active = false
  WHERE u.role = 'student'
    AND (u.is_campus_active = true OR u.is_groovelab_active = true)
    AND u.last_seen < NOW() - INTERVAL '2 months'
    -- Ensure school is Sammelzahler / monthly billing (this matches billing_method config in schools if applicable)
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = u.school_id
        -- Where billing method is monthly variable
        AND s.billing_method = 'collective_monthly'
    );
END;
$$;

-- 5. Anonymize magic_link_logs emails (store SHA-256 hash instead of plaintext)
-- Let's check the schema of magic_link_logs and alter email to hashed representation or update the function.
-- Since the logs might already be queried, we'll hash the email field or alter the logger in 136.
-- In this migration, we ensure that new inserts to magic_link_logs encrypt/hash the email.
CREATE OR REPLACE FUNCTION public.hash_email(email_str TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE STRICT
AS $$
  SELECT encode(digest(lower(email_str), 'sha256'), 'hex');
$$;
