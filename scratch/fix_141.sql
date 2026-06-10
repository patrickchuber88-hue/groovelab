
  -- 2. RPC: Prüfen ob Gerät bereits gepairt ist (mit UUID Typecast)
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
    -- Try to cast p_qr_token to UUID safely
    BEGIN
      SELECT id INTO v_user_id
      FROM public.users
      WHERE qr_token = p_qr_token::UUID
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      -- If it's not a UUID, check teacher_qr_token
      SELECT id INTO v_user_id
      FROM public.users
      WHERE teacher_qr_token = p_qr_token
      LIMIT 1;
    END;

    IF v_user_id IS NULL THEN
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

  -- 3. RPC: Geburtstags-PIN prüfen und Gerät registrieren (mit UUID Typecast)
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
    v_expected_day INT;
  BEGIN
    -- Resolve user_id and day_of_birth
    BEGIN
      SELECT u.id, u.first_name, ad.day_of_birth INTO v_user
      FROM public.users u
      LEFT JOIN public.activation_days ad ON u.id = ad.student_id
      WHERE u.qr_token = p_qr_token::UUID
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      SELECT u.id, u.first_name, ad.day_of_birth INTO v_user
      FROM public.users u
      LEFT JOIN public.activation_days ad ON u.id = ad.student_id
      WHERE u.teacher_qr_token = p_qr_token
      LIMIT 1;
    END;

    IF v_user.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
    END IF;

    -- day_of_birth muss gesetzt sein
    IF v_user.day_of_birth IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'no_birth_date');
    END IF;

    v_expected_day := v_user.day_of_birth;

    -- PIN vergleichen (tolerant gegen führende Nullen: "05" == "5")
    IF LPAD(p_pin, 2, '0') != LPAD(v_expected_day::TEXT, 2, '0') THEN
      RETURN jsonb_build_object('success', false, 'error', 'wrong_pin');
    END IF;

    -- Gerät registrieren (upsert)
    INSERT INTO public.user_devices (user_id, device_key, last_seen_at)
    VALUES (v_user.id, p_device_key, now())
    ON CONFLICT (user_id, device_key) DO UPDATE SET last_seen_at = now();

    RETURN jsonb_build_object('success', true, 'user_id', v_user.id, 'first_name', v_user.first_name);
  END;
  $$;

  -- 4. RPC: Schlanke Schüler-Daten für QR-Landing-Page laden (mit UUID Typecast)
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
  BEGIN
    BEGIN
      SELECT u.id, u.first_name, u.last_name, u.instrument, u.photo_url, u.role,
             u.is_campus_active, u.is_groovelab_active, u.school_id
      INTO v_user
      FROM public.users u
      WHERE u.qr_token = p_qr_token::UUID
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      SELECT u.id, u.first_name, u.last_name, u.instrument, u.photo_url, u.role,
             u.is_campus_active, u.is_groovelab_active, u.school_id
      INTO v_user
      FROM public.users u
      WHERE u.teacher_qr_token = p_qr_token
      LIMIT 1;
    END;

    IF v_user.id IS NULL THEN
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
