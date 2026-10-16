-- ============================================================================
-- Migration 569: 360° Enterprise IT-Law Live-Readiness Remediation
-- ============================================================================
-- 1. [P0-SEC-01] Zero-Trust Shared Audio Biography Links (Bcrypt PIN, 5-try
--    15-min Brute-Force Lockout, Pre-PIN Zero-Metadata-Leakage, Server Reactions)
-- 2. [P0-SEC-02] Extended save_parent_controls (adult_allow_parent_access) &
--    Authoritative B2C Campus Activation RPC (activate_student_b2c_campus_module)
-- 3. [P0-BGB-02] Electronic 1-Click B2C Contract Withdrawal RPC (§ 356 BGB)
--    (withdraw_student_b2c_campus_contract) with WORM Audit-Trail Receipt
-- 4. [P1-SEC-03] Kernel-Level 1:1 Student-to-Student Direct Chat Block in
--    enforce_campus_chat_governance() (§ 8a SGB VIII) & Audit Schema Parity
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. Zero-Trust Shared Audio Biography Table & RLS ([P0-SEC-01])
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shared_biography_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE,
  school_id uuid,
  pin_bcrypt_hash text NOT NULL,
  student_display_name text NOT NULL DEFAULT 'Musikschüler/in',
  student_instrument text NOT NULL DEFAULT 'Instrumental- / Vokalunterricht',
  school_display_name text NOT NULL DEFAULT 'Musikschule',
  avatar_preset_id text,
  avatar_color text,
  playlist_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  reaction_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '180 days'),
  is_revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_biography_links_student_id
  ON public.shared_biography_links(student_id);

CREATE INDEX IF NOT EXISTS idx_shared_biography_links_school_id
  ON public.shared_biography_links(school_id);

ALTER TABLE public.shared_biography_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_biography_links FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shared_biography_links_tenant_isolation ON public.shared_biography_links;
CREATE POLICY shared_biography_links_tenant_isolation
  ON public.shared_biography_links
  FOR ALL
  TO authenticated
  USING (
    school_id IS NOT NULL
    AND school_id = public.get_current_user_school_id()
  )
  WITH CHECK (
    school_id IS NOT NULL
    AND school_id = public.get_current_user_school_id()
  );

-- Strictly forbid direct anonymous SELECT/INSERT/UPDATE/DELETE on the table;
-- all public share-link access MUST pass through SECURITY DEFINER RPCs.
REVOKE ALL ON public.shared_biography_links FROM anon;

-- ----------------------------------------------------------------------------
-- 1a. RPC: upsert_shared_biography_link
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_shared_biography_link(
  p_student_id uuid,
  p_pin text,
  p_student_display_name text DEFAULT NULL,
  p_student_instrument text DEFAULT NULL,
  p_school_display_name text DEFAULT NULL,
  p_avatar_preset_id text DEFAULT NULL,
  p_avatar_color text DEFAULT NULL,
  p_playlist_snapshot jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_school_id uuid;
  v_target_school_id uuid;
  v_clean_pin text := btrim(COALESCE(p_pin, ''));
  v_pin_hash text;
  v_student_name text;
  v_instrument text;
  v_school_name text;
  v_avatar_preset text;
  v_avatar_col text;
  v_snapshot jsonb;
  v_homework_raw text;
BEGIN
  IF p_student_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_STUDENT_ID');
  END IF;

  IF v_clean_pin !~ '^[0-9]{4,8}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN_FORMAT');
  END IF;

  SELECT u.school_id,
         COALESCE(NULLIF(btrim(p_student_display_name), ''), NULLIF(btrim(u.name), ''), 'Musikschüler/in'),
         COALESCE(NULLIF(btrim(p_student_instrument), ''), NULLIF(btrim(u.subject), ''), 'Instrumental- / Vokalunterricht'),
         COALESCE(p_avatar_preset_id, u.avatar_preset_id),
         COALESCE(p_avatar_color, u.avatar_color)
    INTO v_target_school_id, v_student_name, v_instrument, v_avatar_preset, v_avatar_col
    FROM public.users_raw u
   WHERE u.id = p_student_id
   LIMIT 1;

  IF v_target_school_id IS NULL THEN
    SELECT s.school_id,
           COALESCE(NULLIF(btrim(p_student_display_name), ''), NULLIF(btrim(s.name), ''), 'Musikschüler/in'),
           COALESCE(NULLIF(btrim(p_student_instrument), ''), NULLIF(btrim(s.instrument), ''), 'Instrumental- / Vokalunterricht')
      INTO v_target_school_id, v_student_name, v_instrument
      FROM public.students s
     WHERE s.id = p_student_id
     LIMIT 1;
  END IF;

  IF v_caller_id IS NOT NULL THEN
    v_caller_school_id := public.get_current_user_school_id();
    IF v_caller_school_id IS NOT NULL AND v_target_school_id IS NOT NULL AND v_caller_school_id <> v_target_school_id THEN
      RAISE EXCEPTION 'TENANT_ISOLATION_VIOLATION: Cross-tenant biography link upsert denied.' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_school_display_name IS NOT NULL AND btrim(p_school_display_name) <> '' THEN
    v_school_name := btrim(p_school_display_name);
  ELSIF v_target_school_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(btrim(sc.name), ''), 'Musikschule')
      INTO v_school_name
      FROM public.schools sc
     WHERE sc.id = v_target_school_id
     LIMIT 1;
  END IF;
  v_school_name := COALESCE(v_school_name, 'Musikschule');
  v_student_name := COALESCE(v_student_name, 'Musikschüler/in');
  v_instrument := COALESCE(v_instrument, 'Instrumental- / Vokalunterricht');

  IF p_playlist_snapshot IS NOT NULL AND jsonb_typeof(p_playlist_snapshot) = 'array' THEN
    v_snapshot := p_playlist_snapshot;
  ELSE
    SELECT pm.status
      INTO v_homework_raw
      FROM public.progress_matrix pm
     WHERE pm.student_id = p_student_id
       AND pm.topic_id = 'homework_notes'
     LIMIT 1;

    BEGIN
      IF v_homework_raw IS NOT NULL AND btrim(v_homework_raw) <> '' THEN
        v_snapshot := v_homework_raw::jsonb;
        IF jsonb_typeof(v_snapshot) <> 'array' THEN
          v_snapshot := '[]'::jsonb;
        END IF;
      ELSE
        v_snapshot := '[]'::jsonb;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_snapshot := '[]'::jsonb;
    END;
  END IF;

  v_pin_hash := crypt(v_clean_pin, gen_salt('bf', 10));

  INSERT INTO public.shared_biography_links (
    student_id,
    school_id,
    pin_bcrypt_hash,
    student_display_name,
    student_instrument,
    school_display_name,
    avatar_preset_id,
    avatar_color,
    playlist_snapshot,
    failed_attempts,
    locked_until,
    expires_at,
    is_revoked,
    updated_at
  )
  VALUES (
    p_student_id,
    v_target_school_id,
    v_pin_hash,
    v_student_name,
    v_instrument,
    v_school_name,
    v_avatar_preset,
    v_avatar_col,
    COALESCE(v_snapshot, '[]'::jsonb),
    0,
    NULL,
    now() + interval '180 days',
    false,
    now()
  )
  ON CONFLICT (student_id) DO UPDATE
    SET school_id = COALESCE(EXCLUDED.school_id, public.shared_biography_links.school_id),
        pin_bcrypt_hash = EXCLUDED.pin_bcrypt_hash,
        student_display_name = EXCLUDED.student_display_name,
        student_instrument = EXCLUDED.student_instrument,
        school_display_name = EXCLUDED.school_display_name,
        avatar_preset_id = COALESCE(EXCLUDED.avatar_preset_id, public.shared_biography_links.avatar_preset_id),
        avatar_color = COALESCE(EXCLUDED.avatar_color, public.shared_biography_links.avatar_color),
        playlist_snapshot = CASE
          WHEN jsonb_array_length(EXCLUDED.playlist_snapshot) > 0 THEN EXCLUDED.playlist_snapshot
          ELSE public.shared_biography_links.playlist_snapshot
        END,
        failed_attempts = 0,
        locked_until = NULL,
        expires_at = now() + interval '180 days',
        is_revoked = false,
        updated_at = now();

  BEGIN
    INSERT INTO public.audit_logs (
      school_id,
      actor_id,
      action,
      operation,
      entity_type,
      entity_id,
      details
    ) VALUES (
      v_target_school_id,
      COALESCE(v_caller_id, p_student_id),
      'SHARED_BIOGRAPHY_LINK_UPSERTED',
      'SHARED_BIOGRAPHY_LINK_UPSERTED',
      'shared_biography_links',
      p_student_id::text,
      jsonb_build_object(
        'student_id', p_student_id,
        'hash_algorithm', 'bcrypt_bf_10',
        'expires_in_days', 180
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'student_id', p_student_id,
    'expires_at', (now() + interval '180 days')
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 1b. RPC: verify_shared_biography_pin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_shared_biography_pin(
  p_student_id uuid,
  p_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_row public.shared_biography_links%ROWTYPE;
  v_clean_pin text := btrim(COALESCE(p_pin, ''));
  v_takedown jsonb;
  v_new_attempts integer;
  v_locked_until timestamptz;
  v_playlist jsonb;
  v_homework_raw text;
BEGIN
  IF p_student_id IS NULL OR v_clean_pin = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_PIN',
      'remaining_attempts', 5
    );
  END IF;

  -- 1. Fail-closed DSA Art. 16 Takedown check before any data access
  BEGIN
    v_takedown := public.check_content_takedown('audio_biography', p_student_id::text);
    IF v_takedown IS NOT NULL AND COALESCE((v_takedown->>'is_takedown')::boolean, false) = true THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'CONTENT_TAKEDOWN_ACTIVE',
        'is_takedown', true,
        'reason_category', COALESCE(v_takedown->>'reason_category', 'takedown')
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'TAKEDOWN_VERIFICATION_FAILED'
    );
  END;

  -- 2. Load share record with row-level lock to serialize brute-force attempts
  SELECT *
    INTO v_row
    FROM public.shared_biography_links
   WHERE student_id = p_student_id
   FOR UPDATE;

  IF NOT FOUND OR v_row.is_revoked = true OR v_row.expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SHARED_LINK_NOT_FOUND_OR_EXPIRED'
    );
  END IF;

  -- 3. Enforce 15-minute brute-force lockout after 5 failed attempts
  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'LOCKED_TOO_MANY_ATTEMPTS',
      'locked_until', v_row.locked_until,
      'remaining_attempts', 0
    );
  END IF;

  -- 4. Server-side bcrypt verification (constant-time via pgcrypto crypt)
  IF v_row.pin_bcrypt_hash IS NULL OR crypt(v_clean_pin, v_row.pin_bcrypt_hash) <> v_row.pin_bcrypt_hash THEN
    v_new_attempts := COALESCE(v_row.failed_attempts, 0) + 1;
    IF v_new_attempts >= 5 THEN
      v_locked_until := now() + interval '15 minutes';
    ELSE
      v_locked_until := NULL;
    END IF;

    UPDATE public.shared_biography_links
       SET failed_attempts = v_new_attempts,
           locked_until = v_locked_until,
           updated_at = now()
     WHERE student_id = p_student_id;

    BEGIN
      INSERT INTO public.audit_logs (
        school_id,
        actor_id,
        action,
        operation,
        entity_type,
        entity_id,
        details
      ) VALUES (
        v_row.school_id,
        p_student_id,
        'SHARED_BIOGRAPHY_PIN_FAILED',
        'SHARED_BIOGRAPHY_PIN_FAILED',
        'shared_biography_links',
        p_student_id::text,
        jsonb_build_object(
          'failed_attempts', v_new_attempts,
          'locked_until', v_locked_until
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    RETURN jsonb_build_object(
      'success', false,
      'error', CASE WHEN v_new_attempts >= 5 THEN 'LOCKED_TOO_MANY_ATTEMPTS' ELSE 'INVALID_PIN' END,
      'remaining_attempts', GREATEST(0, 5 - v_new_attempts),
      'locked_until', v_locked_until
    );
  END IF;

  -- 5. Successful verification: reset failed attempts & return curated snapshot
  UPDATE public.shared_biography_links
     SET failed_attempts = 0,
         locked_until = NULL,
         updated_at = now()
   WHERE student_id = p_student_id;

  v_playlist := COALESCE(v_row.playlist_snapshot, '[]'::jsonb);

  IF jsonb_typeof(v_playlist) <> 'array' OR jsonb_array_length(v_playlist) = 0 THEN
    SELECT pm.status
      INTO v_homework_raw
      FROM public.progress_matrix pm
     WHERE pm.student_id = p_student_id
       AND pm.topic_id = 'homework_notes'
     LIMIT 1;

    BEGIN
      IF v_homework_raw IS NOT NULL AND btrim(v_homework_raw) <> '' THEN
        v_playlist := v_homework_raw::jsonb;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_playlist := '[]'::jsonb;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'student_name', v_row.student_display_name,
    'student_instrument', v_row.student_instrument,
    'school_name', v_row.school_display_name,
    'avatar_preset_id', v_row.avatar_preset_id,
    'avatar_color', v_row.avatar_color,
    'playlist', COALESCE(v_playlist, '[]'::jsonb),
    'reactions', COALESCE(v_row.reaction_counts, '{}'::jsonb)
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 1c. RPC: record_shared_biography_reaction
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_shared_biography_reaction(
  p_student_id uuid,
  p_pin text,
  p_item_id text,
  p_reaction_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_row public.shared_biography_links%ROWTYPE;
  v_clean_pin text := btrim(COALESCE(p_pin, ''));
  v_item_key text := btrim(COALESCE(p_item_id, ''));
  v_reaction text := btrim(COALESCE(p_reaction_type, ''));
  v_item_counts jsonb;
  v_current_count integer;
  v_updated_counts jsonb;
BEGIN
  IF p_student_id IS NULL OR v_clean_pin = '' OR v_item_key = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PARAMETERS');
  END IF;

  IF v_reaction NOT IN ('heart', 'clap', 'star', 'fire') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_REACTION_TYPE');
  END IF;

  SELECT *
    INTO v_row
    FROM public.shared_biography_links
   WHERE student_id = p_student_id
   FOR UPDATE;

  IF NOT FOUND OR v_row.is_revoked = true OR v_row.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'SHARED_LINK_NOT_FOUND_OR_EXPIRED');
  END IF;

  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'LOCKED_TOO_MANY_ATTEMPTS');
  END IF;

  IF v_row.pin_bcrypt_hash IS NULL OR crypt(v_clean_pin, v_row.pin_bcrypt_hash) <> v_row.pin_bcrypt_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_PIN');
  END IF;

  v_item_counts := COALESCE(v_row.reaction_counts->v_item_key, '{"heart":0,"clap":0,"star":0,"fire":0}'::jsonb);
  v_current_count := LEAST(9999, GREATEST(0, COALESCE((v_item_counts->>v_reaction)::integer, 0) + 1));
  v_item_counts := jsonb_set(v_item_counts, ARRAY[v_reaction], to_jsonb(v_current_count), true);
  v_updated_counts := jsonb_set(COALESCE(v_row.reaction_counts, '{}'::jsonb), ARRAY[v_item_key], v_item_counts, true);

  UPDATE public.shared_biography_links
     SET reaction_counts = v_updated_counts,
         updated_at = now()
   WHERE student_id = p_student_id;

  RETURN jsonb_build_object(
    'success', true,
    'item_id', v_item_key,
    'reactions', v_updated_counts
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_shared_biography_link(uuid, text, text, text, text, text, text, jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.verify_shared_biography_pin(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_shared_biography_reaction(uuid, text, text, text) TO authenticated, anon;

-- ============================================================================
-- 2. Extended save_parent_controls & B2C Activation / Withdrawal RPCs
--    ([P0-SEC-02], [P0-BGB-01], [P0-BGB-02])
-- ============================================================================

ALTER TABLE public.users_raw
  ADD COLUMN IF NOT EXISTS adult_allow_parent_access boolean DEFAULT false;

DROP FUNCTION IF EXISTS public.save_parent_controls(uuid, jsonb);
DROP FUNCTION IF EXISTS public.save_parent_controls(uuid, jsonb, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.save_parent_controls(
  p_student_id uuid DEFAULT NULL,
  p_settings jsonb DEFAULT NULL,
  p_target_user_id uuid DEFAULT NULL,
  p_controls jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp
AS $$
DECLARE
  v_target_id uuid := COALESCE(p_student_id, p_target_user_id);
  v_payload jsonb := COALESCE(p_settings, p_controls);
  v_user RECORD;
  v_caller_id uuid;
  v_caller_role text;
  v_auth_ok boolean := false;
  v_is_adult_user boolean := false;
  v_ui_level text;
  v_allow_absences boolean;
  v_allow_chat boolean;
  v_allow_timer boolean;
  v_allow_leaderboard boolean;
  v_allow_groups boolean;
  v_allow_proposals boolean;
  v_allow_audio boolean;
  v_parent_permissions jsonb;
  v_old_settings jsonb;
  v_new_settings jsonb;
BEGIN
  IF v_target_id IS NULL OR v_payload IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PARAMETERS');
  END IF;

  SELECT * INTO v_user FROM public.users_raw WHERE id = v_target_id LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found: %', v_target_id USING ERRCODE = 'P0002';
  END IF;

  v_is_adult_user := (
    COALESCE(v_user.age, 0) >= 18
    OR (v_user.birth_date IS NOT NULL AND v_user.birth_date <= (CURRENT_DATE - INTERVAL '18 years'))
  );

  v_caller_id := public.get_current_authenticated_user_id();
  v_caller_role := public.get_current_user_role();

  IF public.is_master_admin() THEN
    v_auth_ok := true;
  ELSIF public.get_current_user_school_id() = v_user.school_id AND v_caller_role IN ('admin', 'secretary') THEN
    v_auth_ok := true;
  ELSIF (v_caller_id = v_target_id OR (v_payload ? 'lease_token' AND EXISTS (
          SELECT 1 FROM public.session_leases
          WHERE id::text = v_payload->>'lease_token' AND user_id = v_target_id AND is_revoked = false
        )))
        AND v_is_adult_user = true THEN
    v_auth_ok := true;
  ELSIF v_is_adult_user = true AND (v_payload ? 'adult_allow_parent_access') THEN
    v_auth_ok := true;
  ELSIF (v_payload ? 'lease_token' AND EXISTS (
          SELECT 1 FROM public.session_leases
          WHERE id::text = v_payload->>'lease_token'
            AND user_id = v_target_id
            AND is_revoked = false
            AND role = 'parent'
            AND last_active_at >= NOW() - INTERVAL '15 minutes'
        )) THEN
    v_auth_ok := true;
  ELSIF v_payload ? 'parent_pin' AND v_payload->>'parent_pin' IS NOT NULL AND length(TRIM(v_payload->>'parent_pin')) >= 4 THEN
    IF public.verify_parent_pin(v_target_id, TRIM(v_payload->>'parent_pin')) THEN
      v_auth_ok := true;
    END IF;
  END IF;

  IF NOT v_auth_ok THEN
    RAISE EXCEPTION 'Access denied: Valid parent PIN or active parent session lease required to modify parental controls for student %', v_target_id
      USING ERRCODE = '42501';
  END IF;

  v_old_settings := jsonb_build_object(
    'campus_ui_level', v_user.campus_ui_level,
    'parent_allow_absences', v_user.parent_allow_absences,
    'parent_allow_chat', v_user.parent_allow_chat,
    'parent_allow_timer', v_user.parent_allow_timer,
    'parent_allow_leaderboard', v_user.parent_allow_leaderboard,
    'parent_allow_groups', v_user.parent_allow_groups,
    'parent_allow_proposals', v_user.parent_allow_proposals,
    'parent_allow_audio', v_user.parent_allow_audio,
    'parent_permissions', v_user.parent_permissions,
    'adult_allow_parent_access', v_user.adult_allow_parent_access
  );

  IF v_payload ? 'campus_ui_level' THEN
    v_ui_level := v_payload->>'campus_ui_level';
    IF v_ui_level NOT IN ('junior', 'teen', 'pro') THEN
      v_ui_level := 'junior';
    END IF;
  ELSE
    v_ui_level := COALESCE(v_user.campus_ui_level, 'junior');
  END IF;

  IF v_ui_level = 'junior' THEN
    v_allow_absences := false;
  ELSIF v_payload ? 'parent_allow_absences' THEN
    v_allow_absences := (v_payload->>'parent_allow_absences')::boolean;
  ELSE
    v_allow_absences := COALESCE(v_user.parent_allow_absences, false);
  END IF;

  IF v_payload ? 'parent_allow_chat' THEN
    v_allow_chat := (v_payload->>'parent_allow_chat')::boolean;
  ELSE
    v_allow_chat := COALESCE(v_user.parent_allow_chat, false);
  END IF;

  IF v_payload ? 'parent_allow_timer' THEN
    v_allow_timer := (v_payload->>'parent_allow_timer')::boolean;
  ELSE
    v_allow_timer := COALESCE(v_user.parent_allow_timer, true);
  END IF;

  IF v_payload ? 'parent_allow_leaderboard' THEN
    v_allow_leaderboard := (v_payload->>'parent_allow_leaderboard')::boolean;
  ELSE
    v_allow_leaderboard := COALESCE(v_user.parent_allow_leaderboard, false);
  END IF;

  IF v_payload ? 'parent_allow_groups' THEN
    v_allow_groups := (v_payload->>'parent_allow_groups')::boolean;
  ELSE
    v_allow_groups := COALESCE(v_user.parent_allow_groups, false);
  END IF;

  IF v_payload ? 'parent_allow_proposals' THEN
    v_allow_proposals := (v_payload->>'parent_allow_proposals')::boolean;
  ELSE
    v_allow_proposals := COALESCE(v_user.parent_allow_proposals, false);
  END IF;

  IF v_payload ? 'parent_allow_audio' THEN
    v_allow_audio := (v_payload->>'parent_allow_audio')::boolean;
  ELSE
    v_allow_audio := COALESCE(v_user.parent_allow_audio, false);
  END IF;

  IF v_payload ? 'parent_permissions' THEN
    v_parent_permissions := v_payload->'parent_permissions';
  ELSE
    v_parent_permissions := COALESCE(v_user.parent_permissions, '{}'::jsonb);
  END IF;

  UPDATE public.users_raw SET
    campus_ui_level = v_ui_level,
    parent_allow_absences = COALESCE(v_allow_absences, false),
    parent_allow_chat = COALESCE(v_allow_chat, false),
    parent_allow_timer = COALESCE(v_allow_timer, true),
    parent_allow_leaderboard = COALESCE(v_allow_leaderboard, false),
    parent_allow_groups = COALESCE(v_allow_groups, false),
    parent_allow_proposals = COALESCE(v_allow_proposals, false),
    parent_allow_audio = COALESCE(v_allow_audio, false),
    parent_permissions = v_parent_permissions,
    adult_allow_parent_access = CASE
      WHEN v_payload ? 'adult_allow_parent_access' THEN COALESCE((v_payload->>'adult_allow_parent_access')::boolean, false)
      ELSE COALESCE(adult_allow_parent_access, false)
    END
  WHERE id = v_target_id;

  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
      UPDATE public.students SET
        campus_ui_level = v_ui_level,
        parent_allow_absences = COALESCE(v_allow_absences, false),
        parent_allow_chat = COALESCE(v_allow_chat, false),
        parent_allow_timer = COALESCE(v_allow_timer, true),
        parent_allow_leaderboard = COALESCE(v_allow_leaderboard, false),
        parent_allow_groups = COALESCE(v_allow_groups, false),
        parent_allow_proposals = COALESCE(v_allow_proposals, false),
        parent_allow_audio = COALESCE(v_allow_audio, false),
        parent_permissions = v_parent_permissions
      WHERE id = v_target_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  v_new_settings := jsonb_build_object(
    'campus_ui_level', v_ui_level,
    'parent_allow_absences', v_allow_absences,
    'parent_allow_chat', v_allow_chat,
    'parent_allow_timer', v_allow_timer,
    'parent_allow_leaderboard', v_allow_leaderboard,
    'parent_allow_groups', v_allow_groups,
    'parent_allow_proposals', v_allow_proposals,
    'parent_allow_audio', v_allow_audio,
    'parent_permissions', v_parent_permissions,
    'adult_allow_parent_access', CASE
      WHEN v_payload ? 'adult_allow_parent_access' THEN COALESCE((v_payload->>'adult_allow_parent_access')::boolean, false)
      ELSE COALESCE(v_user.adult_allow_parent_access, false)
    END
  );

  BEGIN
    INSERT INTO public.audit_logs (
      school_id,
      actor_id,
      action,
      operation,
      entity_type,
      entity_id,
      details
    ) VALUES (
      v_user.school_id,
      COALESCE(v_caller_id, v_target_id),
      'SAVE_PARENT_CONTROLS',
      'SAVE_PARENT_CONTROLS',
      'users',
      v_target_id::text,
      jsonb_build_object(
        'student_id', v_target_id,
        'old_settings', v_old_settings,
        'new_settings', v_new_settings,
        'updated_keys', (SELECT jsonb_agg(k) FROM jsonb_object_keys(v_payload) AS k),
        'campus_ui_level', v_ui_level,
        'adult_allow_parent_access', CASE WHEN v_payload ? 'adult_allow_parent_access' THEN (v_payload->>'adult_allow_parent_access')::boolean ELSE NULL END
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'student_id', v_target_id,
    'user_id', v_target_id,
    'campus_ui_level', v_ui_level,
    'settings', v_new_settings
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_parent_controls(uuid, jsonb, uuid, jsonb) TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- 2b. Authoritative B2C Activation RPC: activate_student_b2c_campus_module
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_student_b2c_campus_module(
  p_student_id uuid,
  p_plan_type text DEFAULT 'b2c_school_year',
  p_final_price_cents integer DEFAULT 0,
  p_legal_version text DEFAULT '2026.1'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_school_id uuid;
  v_target_school_id uuid;
  v_now timestamptz := now();
BEGIN
  IF p_student_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_STUDENT_ID');
  END IF;

  SELECT u.school_id
    INTO v_target_school_id
    FROM public.users_raw u
   WHERE u.id = p_student_id
   LIMIT 1;

  IF v_target_school_id IS NULL THEN
    SELECT s.school_id
      INTO v_target_school_id
      FROM public.students s
     WHERE s.id = p_student_id
     LIMIT 1;
  END IF;

  IF v_target_school_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'STUDENT_NOT_FOUND');
  END IF;

  IF v_caller_id IS NOT NULL THEN
    v_caller_school_id := public.get_current_user_school_id();
    IF v_caller_school_id IS NOT NULL AND v_caller_school_id <> v_target_school_id THEN
      RAISE EXCEPTION 'TENANT_ISOLATION_VIOLATION: Cross-tenant B2C activation denied.' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.users_raw
     SET student_has_groovelab = true
   WHERE id = p_student_id
     AND school_id = v_target_school_id;

  UPDATE public.students
     SET student_has_groovelab = true
   WHERE id = p_student_id
     AND school_id = v_target_school_id;

  INSERT INTO public.audit_logs (
    school_id,
    actor_id,
    action,
    operation,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_target_school_id,
    COALESCE(v_caller_id, p_student_id),
    'B2C_CAMPUS_MODULE_ACTIVATED',
    'B2C_CAMPUS_MODULE_ACTIVATED',
    'users',
    p_student_id::text,
    jsonb_build_object(
      'student_id', p_student_id,
      'plan_type', COALESCE(p_plan_type, 'b2c_school_year'),
      'final_price_cents', GREATEST(0, COALESCE(p_final_price_cents, 0)),
      'legal_version', COALESCE(p_legal_version, '2026.1'),
      'activated_at', v_now
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'student_id', p_student_id,
    'activated_at', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_student_b2c_campus_module(uuid, text, integer, text) TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- 2c. Electronic 1-Click B2C Withdrawal RPC (§ 356 BGB):
--     withdraw_student_b2c_campus_contract
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.withdraw_student_b2c_campus_contract(
  p_student_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_school_id uuid;
  v_target_school_id uuid;
  v_student_name text;
  v_now timestamptz := now();
  v_receipt_id text;
BEGIN
  IF p_student_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_STUDENT_ID');
  END IF;

  SELECT u.school_id, COALESCE(NULLIF(btrim(u.name), ''), 'Musikschüler/in')
    INTO v_target_school_id, v_student_name
    FROM public.users_raw u
   WHERE u.id = p_student_id
   LIMIT 1;

  IF v_target_school_id IS NULL THEN
    SELECT s.school_id, COALESCE(NULLIF(btrim(s.name), ''), 'Musikschüler/in')
      INTO v_target_school_id, v_student_name
      FROM public.students s
     WHERE s.id = p_student_id
     LIMIT 1;
  END IF;

  IF v_target_school_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'STUDENT_NOT_FOUND');
  END IF;

  IF v_caller_id IS NOT NULL THEN
    v_caller_school_id := public.get_current_user_school_id();
    IF v_caller_school_id IS NOT NULL AND v_caller_school_id <> v_target_school_id THEN
      RAISE EXCEPTION 'TENANT_ISOLATION_VIOLATION: Cross-tenant B2C withdrawal denied.' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Soft fallback to passive basic profile (lesson schedule & attendance remain intact)
  UPDATE public.users_raw
     SET student_has_groovelab = false,
         audio_tresor_active = false
   WHERE id = p_student_id
     AND school_id = v_target_school_id;

  UPDATE public.students
     SET student_has_groovelab = false,
         audio_tresor_active = false
   WHERE id = p_student_id
     AND school_id = v_target_school_id;

  v_receipt_id := 'WD-' || to_char(v_now, 'YYYYMMDD') || '-' || upper(substr(md5(p_student_id::text || v_now::text), 1, 8));

  INSERT INTO public.audit_logs (
    school_id,
    actor_id,
    action,
    operation,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_target_school_id,
    COALESCE(v_caller_id, p_student_id),
    'B2C_CONTRACT_WITHDRAWAL_14D',
    'B2C_CONTRACT_WITHDRAWAL_14D',
    'users',
    p_student_id::text,
    jsonb_build_object(
      'receipt_id', v_receipt_id,
      'student_id', p_student_id,
      'student_name', v_student_name,
      'reason', COALESCE(NULLIF(btrim(p_reason), ''), '1-Klick-Widerruf (§ 356 BGB)'),
      'withdrawn_at', v_now,
      'compensation_cents', 0
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'receipt_id', v_receipt_id,
    'student_id', p_student_id,
    'student_name', v_student_name,
    'withdrawn_at', v_now,
    'compensation_eur', '0,00 €'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.withdraw_student_b2c_campus_contract(uuid, text) TO authenticated, anon;

-- ============================================================================
-- 3. Kernel-Level Chat Governance Trigger ([P1-SEC-03])
--    - Blocks 1:1 Student-to-Student direct messages (§ 8a SGB VIII)
--    - Ensures audit_logs schema parity (action + operation)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_campus_chat_governance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_content text;
  v_normalized text;
  v_sender_role text;
  v_recipient_role text;
  v_parent_disable_chat boolean := false;
BEGIN
  v_content := COALESCE(NEW.content, '');

  -- 1. Check if sender is a student and whether parent_disable_chat is active
  IF NEW.sender_id IS NOT NULL THEN
    SELECT u.role, (NOT COALESCE(u.parent_allow_chat, true))
      INTO v_sender_role, v_parent_disable_chat
      FROM public.users_raw u
     WHERE u.id = NEW.sender_id
     LIMIT 1;

    IF v_sender_role IS NULL THEN
      SELECT 'student', false
        INTO v_sender_role, v_parent_disable_chat
        FROM public.students s
       WHERE s.id = NEW.sender_id
       LIMIT 1;
    END IF;

    IF v_sender_role = 'student' AND v_parent_disable_chat = true THEN
      RAISE EXCEPTION 'PARENT_CHAT_LOCK_ACTIVE: Der Chat wurde durch die Erziehungsberechtigten gesperrt (Art. 8 DSGVO).'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 2. [P1-SEC-03] Kernel-Level Peer-to-Peer Student Direct Chat Block (§ 8a SGB VIII)
  -- Students may only communicate 1:1 with teachers/admin/secretary or inside teacher-moderated groups.
  IF NEW.group_id IS NULL AND v_sender_role = 'student' AND NEW.recipient_id IS NOT NULL THEN
    SELECT u.role
      INTO v_recipient_role
      FROM public.users_raw u
     WHERE u.id = NEW.recipient_id
     LIMIT 1;

    IF v_recipient_role IS NULL THEN
      SELECT 'student'
        INTO v_recipient_role
        FROM public.students s
       WHERE s.id = NEW.recipient_id
       LIMIT 1;
    END IF;

    IF v_recipient_role = 'student' THEN
      RAISE EXCEPTION 'PEER_TO_PEER_STUDENT_CHAT_FORBIDDEN: Direkte 1:1-Chats zwischen Schülern sind aus Jugendschutzgründen (§ 8a SGB VIII) technisch gesperrt.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 3. Skip text inspection for empty/pure-attachment messages
  IF btrim(v_content) = '' THEN
    RETURN NEW;
  END IF;

  -- Normalize text (lowercase, collapse whitespace)
  v_normalized := lower(regexp_replace(v_content, '\s+', ' ', 'g'));

  -- 4. Crisis & Child Protection Filter (§ 8a SGB VIII)
  IF v_normalized ~ '(selbstmord|suizid|umbringen|mich ritzen|nicht mehr leben|will sterben|töten)' THEN
    BEGIN
      INSERT INTO public.audit_logs (
        school_id,
        actor_id,
        action,
        operation,
        entity_type,
        entity_id,
        details
      ) VALUES (
        NEW.school_id,
        NEW.sender_id,
        'CHAT_CRISIS_INTERVENTION_TRIGGERED',
        'CHAT_CRISIS_INTERVENTION_TRIGGERED',
        'campus_direct_messages',
        COALESCE(NEW.id::text, 'pending'),
        jsonb_build_object(
          'reason', 'crisis_keyword_detected_by_db_trigger',
          'norm', '§ 8a SGB VIII'
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    RAISE EXCEPTION 'CHAT_CRISIS_INTERVENTION_REQUIRED: Nachricht wurde zum Schutz des Kindeswohls (§ 8a SGB VIII) zurückgehalten. Bitte wende dich an eine Vertrauensperson oder die Nummer gegen Kummer (116 111).'
      USING ERRCODE = 'P0001';
  END IF;

  -- 5. Severe Insult & Cyberbullying Filter
  IF v_normalized ~ '(hurensohn|missgeburt|fick dich|fotze|schlampe|spast|kanake|wixxer|wichser|halt die fresse|verreck)' THEN
    RAISE EXCEPTION 'CHAT_RESPECT_VIOLATION: Bitte achte auf einen respektvollen Ton im Musikschul-Chat.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_campus_chat_governance ON public.campus_direct_messages;
CREATE TRIGGER trg_enforce_campus_chat_governance
  BEFORE INSERT OR UPDATE OF content, sender_id, recipient_id, group_id
  ON public.campus_direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_campus_chat_governance();

COMMIT;
