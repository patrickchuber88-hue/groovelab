-- Migration 141: Device-Pairing für Zwei-Wege-QR-Login (Anti-Theft)
-- Erstellt: 2026-06-10

-- 1. Tabelle für bekannte Geräte pro Nutzer
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, device_key)
);

-- RLS aktivieren (Tabelle ist via SECURITY DEFINER RPCs zugänglich, daher kein direkter Zugriff)
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- 2. RPC: Prüfen ob Gerät bereits gepairt ist
CREATE OR REPLACE FUNCTION public.check_qr_device(
  p_qr_token TEXT,
  p_device_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_paired BOOLEAN;
BEGIN
  -- Nutzer via QR-Token finden (UUID = student qr_token, anderes = teacher_qr_token)
  SELECT id INTO v_user_id
  FROM public.users
  WHERE qr_token = p_qr_token OR teacher_qr_token = p_qr_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('paired', false, 'error', 'user_not_found');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_devices
    WHERE user_id = v_user_id AND device_key = p_device_key
  ) INTO v_paired;

  -- Update last_seen_at wenn gepairt
  IF v_paired THEN
    UPDATE public.user_devices
    SET last_seen_at = now()
    WHERE user_id = v_user_id AND device_key = p_device_key;
  END IF;

  RETURN jsonb_build_object('paired', v_paired, 'user_id', v_user_id);
END;
$$;

-- 3. RPC: Geburtstags-PIN prüfen und Gerät registrieren
CREATE OR REPLACE FUNCTION public.verify_qr_device(
  p_qr_token TEXT,
  p_pin TEXT,
  p_device_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_expected_day TEXT;
BEGIN
  -- Nutzer finden
  SELECT id, first_name, birth_date
  INTO v_user
  FROM public.users
  WHERE qr_token = p_qr_token OR teacher_qr_token = p_qr_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  -- birth_date muss gesetzt sein
  IF v_user.birth_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_birth_date');
  END IF;

  -- Tag aus Geburtsdatum extrahieren (z.B. '1990-03-15' -> '15')
  v_expected_day := EXTRACT(DAY FROM v_user.birth_date::DATE)::TEXT;

  -- PIN vergleichen (tolerant gegen führende Nullen: "05" == "5")
  IF LPAD(p_pin, 2, '0') != LPAD(v_expected_day, 2, '0') THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_pin');
  END IF;

  -- Gerät registrieren (upsert)
  INSERT INTO public.user_devices (user_id, device_key, last_seen_at)
  VALUES (v_user.id, p_device_key, now())
  ON CONFLICT (user_id, device_key) DO UPDATE SET last_seen_at = now();

  RETURN jsonb_build_object('success', true, 'user_id', v_user.id, 'first_name', v_user.first_name);
END;
$$;

-- 4. RPC: Schlanke Schüler-Daten für QR-Landing-Page laden (ohne sensible Daten)
CREATE OR REPLACE FUNCTION public.get_qr_profile(
  p_qr_token TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_school_name TEXT;
  v_next_lesson RECORD;
BEGIN
  SELECT u.id, u.first_name, u.last_name, u.instrument, u.photo_url, u.role,
         u.is_campus_active, u.is_groovelab_active, u.school_id
  INTO v_user
  FROM public.users u
  WHERE u.qr_token = p_qr_token OR u.teacher_qr_token = p_qr_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'user_not_found');
  END IF;

  -- Schulname
  SELECT name INTO v_school_name
  FROM public.schools
  WHERE id = v_user.school_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'id', v_user.id,
    'first_name', v_user.first_name,
    'last_name', v_user.last_name,
    'instrument', v_user.instrument,
    'photo_url', v_user.photo_url,
    'role', v_user.role,
    'school_name', COALESCE(v_school_name, 'Campus Musikschule'),
    'is_campus_active', v_user.is_campus_active,
    'is_groovelab_active', v_user.is_groovelab_active
  );
END;
$$;
