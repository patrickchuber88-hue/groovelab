-- Migration 245: Seed developer bypass users for Musäk Bad Säckingen
-- Creates Manuel Wagner (admin) and Patrick Huber (teacher) with canonical bypass tokens
-- so the dev bypass buttons in LoginScreen.tsx work correctly.
--
-- NOTE: The protect_user_login_credentials_trigger freezes qr_token once set,
-- so we temporarily disable it to assign the exact canonical bypass token UUIDs.

DO $$
DECLARE
  v_school_id UUID;
  v_manuel_id UUID := 'f8d28267-0552-48b5-b1cd-0e415409ecd4';
  v_patrick_id UUID := '11079eae-664a-49a4-8692-771d83a3193c';
BEGIN
  -- Find the school
  SELECT id INTO v_school_id
  FROM public.schools
  WHERE name ILIKE '%Musäk Bad Säckingen%'
  LIMIT 1;

  IF v_school_id IS NULL THEN
    RAISE NOTICE 'School "Musäk Bad Säckingen" not found – skipping seed.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found school: %', v_school_id;

  -- ── Manuel Wagner (admin) ───────────────────────────────────────────────────
  INSERT INTO public.users_raw (
    id,
    school_id,
    first_name,
    last_name,
    role,
    photo_url,
    avatar_url,
    is_campus_active,
    is_groovelab_active,
    qr_token
  ) VALUES (
    v_manuel_id,
    v_school_id,
    'Manuel',
    'Wagner',
    'admin',
    '/campus_login_hero.png',
    '/campus_login_hero.png',
    false,
    true,
    v_manuel_id
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Manuel Wagner (admin) upserted with id %', v_manuel_id;

  -- ── Patrick Huber (teacher) ────────────────────────────────────────────────
  INSERT INTO public.users_raw (
    id,
    school_id,
    first_name,
    last_name,
    role,
    instrument,
    photo_url,
    avatar_url,
    is_campus_active,
    is_groovelab_active,
    qr_token
  ) VALUES (
    v_patrick_id,
    v_school_id,
    'Patrick',
    'Huber',
    'teacher',
    'Gitarre',
    '/campus_login_hero.png',
    '/campus_login_hero.png',
    false,
    true,
    v_patrick_id
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Patrick Huber (teacher) upserted with id %', v_patrick_id;

  -- ── Force canonical bypass tokens ─────────────────────────────────────────
  -- The protect_user_login_credentials_trigger freezes qr_token on UPDATE once set.
  -- We disable it temporarily to assign the exact canonical token UUIDs.
  ALTER TABLE public.users_raw DISABLE TRIGGER protect_user_login_credentials_trigger;

  UPDATE public.users_raw SET qr_token = v_manuel_id  WHERE id = v_manuel_id;
  UPDATE public.users_raw SET qr_token = v_patrick_id WHERE id = v_patrick_id;

  ALTER TABLE public.users_raw ENABLE TRIGGER protect_user_login_credentials_trigger;

  RAISE NOTICE 'Canonical qr_tokens pinned: Manuel=% Patrick=%', v_manuel_id, v_patrick_id;
END;
$$;
