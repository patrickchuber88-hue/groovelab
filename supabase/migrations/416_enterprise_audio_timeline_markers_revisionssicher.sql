-- Migration: 416_enterprise_audio_timeline_markers_revisionssicher.sql
-- Description: Revisionssichere Audio-Timeline-Marker & Feedback-Punkte für Unterrichts- & Übe-Aufnahmen
-- Governance: OWASP ASVS Level 3, Multi-Tenancy (school_id), GoBD-Konformität & Revisionssicheres Audit-Logging

-- 1. Tabelle für Audio-Timeline-Marker erstellen
CREATE TABLE IF NOT EXISTS public.campus_audio_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users_raw(id) ON DELETE CASCADE,
    audio_key TEXT NOT NULL,
    time_seconds NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    title TEXT,
    text TEXT NOT NULL,
    tag TEXT NOT NULL DEFAULT 'tip' CHECK (tag IN ('tip', 'bar', 'highlight', 'general')),
    author_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    author_role TEXT NOT NULL CHECK (author_role IN ('teacher', 'student', 'admin')),
    author_name TEXT NOT NULL,
    loop_duration NUMERIC(4, 1) DEFAULT 4.0,
    is_practiced BOOLEAN NOT NULL DEFAULT FALSE,
    practiced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 2. Performance & Lookup Indizes
CREATE INDEX IF NOT EXISTS idx_campus_audio_markers_lookup
    ON public.campus_audio_markers (school_id, audio_key)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_campus_audio_markers_student
    ON public.campus_audio_markers (student_id)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_campus_audio_markers_timeline
    ON public.campus_audio_markers (audio_key, time_seconds)
    WHERE is_deleted = false;

-- 3. Row Level Security (RLS) aktivieren & Policies
ALTER TABLE public.campus_audio_markers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campus_audio_markers_select_policy" ON public.campus_audio_markers;
CREATE POLICY "campus_audio_markers_select_policy"
ON public.campus_audio_markers
FOR SELECT
TO authenticated, anon
USING (
    is_master_admin()
    OR (
        school_id = get_current_user_school_id()
        AND (
            get_current_user_role() IN ('teacher', 'admin', 'secretary')
            OR student_id = get_current_authenticated_user_id()
            OR student_id IS NULL
        )
    )
);

-- 4. Autoritativer RPC: Marker für eine Aufnahme abrufen
CREATE OR REPLACE FUNCTION public.get_audio_timeline_markers(
    p_audio_key TEXT,
    p_student_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_school_id UUID;
    v_clean_key TEXT;
    v_res JSONB;
BEGIN
    v_school_id := get_current_user_school_id();
    v_clean_key := trim(p_audio_key);

    IF v_clean_key IS NULL OR length(v_clean_key) = 0 THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', m.id::text,
            'audioKey', m.audio_key,
            'time', m.time_seconds,
            'title', m.title,
            'text', m.text,
            'tag', m.tag,
            'authorId', m.author_id::text,
            'authorRole', m.author_role,
            'authorName', m.author_name,
            'loopDuration', m.loop_duration,
            'isPracticed', m.is_practiced,
            'practicedAt', m.practiced_at,
            'createdAt', m.created_at,
            'updatedAt', m.updated_at
        ) ORDER BY m.time_seconds ASC, m.created_at ASC
    ), '[]'::jsonb) INTO v_res
    FROM public.campus_audio_markers m
    WHERE m.audio_key = v_clean_key
      AND m.is_deleted = false
      AND (
          is_master_admin()
          OR (v_school_id IS NOT NULL AND m.school_id = v_school_id)
      );

    RETURN v_res;
END;
$$;

-- 5. Autoritativer RPC: Marker anlegen oder aktualisieren
CREATE OR REPLACE FUNCTION public.save_audio_timeline_marker(
    p_audio_key TEXT,
    p_time NUMERIC,
    p_text TEXT,
    p_tag TEXT DEFAULT 'tip',
    p_loop_duration NUMERIC DEFAULT 4.0,
    p_student_id UUID DEFAULT NULL,
    p_marker_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_school_id UUID;
    v_caller_role TEXT;
    v_caller_name TEXT;
    v_clean_key TEXT;
    v_clean_text TEXT;
    v_valid_tag TEXT;
    v_loop_dur NUMERIC;
    v_time NUMERIC;
    v_target_id UUID;
    v_row RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    v_caller_id := get_current_authenticated_user_id();
    v_school_id := get_current_user_school_id();
    v_caller_role := get_current_user_role();

    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Nicht authentifiziert' USING ERRCODE = '42501';
    END IF;

    -- Name des Autors ermitteln
    SELECT COALESCE(NULLIF(trim(u.first_name || ' ' || COALESCE(u.last_name, '')), ''), u.username, 'Benutzer')
    INTO v_caller_name
    FROM public.users_raw u
    WHERE u.id = v_caller_id;

    v_clean_key := trim(p_audio_key);
    v_clean_text := substring(trim(regexp_replace(p_text, '[\x00-\x1F\x7F]', '', 'g')) from 1 for 1000);
    
    IF v_clean_text IS NULL OR length(v_clean_text) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Notiztext darf nicht leer sein');
    END IF;

    v_valid_tag := CASE 
        WHEN p_tag IN ('tip', 'bar', 'highlight', 'general') THEN p_tag 
        ELSE 'tip' 
    END;

    v_time := GREATEST(0.00, ROUND(COALESCE(p_time, 0.00)::numeric, 2));
    v_loop_dur := LEAST(15.0, GREATEST(1.0, ROUND(COALESCE(p_loop_duration, 4.0)::numeric, 1)));

    IF p_marker_id IS NOT NULL THEN
        -- Update bestehenden Marker
        UPDATE public.campus_audio_markers
        SET text = v_clean_text,
            tag = v_valid_tag,
            time_seconds = v_time,
            loop_duration = v_loop_dur,
            updated_at = v_now
        WHERE id = p_marker_id
          AND is_deleted = false
          AND (
              is_master_admin()
              OR author_id = v_caller_id
              OR (school_id = v_school_id AND v_caller_role IN ('teacher', 'admin'))
          )
        RETURNING * INTO v_row;

        IF v_row.id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Marker nicht gefunden oder keine Berechtigung');
        END IF;

        v_target_id := v_row.id;
    ELSE
        -- Neuer Marker inserten
        INSERT INTO public.campus_audio_markers (
            school_id,
            student_id,
            audio_key,
            time_seconds,
            text,
            tag,
            author_id,
            author_role,
            author_name,
            loop_duration,
            created_at,
            updated_at
        ) VALUES (
            v_school_id,
            p_student_id,
            v_clean_key,
            v_time,
            v_clean_text,
            v_valid_tag,
            v_caller_id,
            CASE WHEN v_caller_role IN ('teacher', 'admin', 'student') THEN v_caller_role ELSE 'student' END,
            COALESCE(v_caller_name, 'Benutzer'),
            v_loop_dur,
            v_now,
            v_now
        )
        RETURNING * INTO v_row;

        v_target_id := v_row.id;
    END IF;

    -- Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        school_id,
        user_id,
        action,
        details
    ) VALUES (
        v_school_id,
        v_caller_id,
        'AUDIO_TIMELINE_MARKER_SAVED',
        jsonb_build_object(
            'marker_id', v_target_id,
            'audio_key', v_clean_key,
            'time_seconds', v_time,
            'tag', v_valid_tag,
            'author_role', v_caller_role,
            'timestamp', v_now
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'marker', jsonb_build_object(
            'id', v_row.id::text,
            'audioKey', v_row.audio_key,
            'time', v_row.time_seconds,
            'title', v_row.title,
            'text', v_row.text,
            'tag', v_row.tag,
            'authorId', v_row.author_id::text,
            'authorRole', v_row.author_role,
            'authorName', v_row.author_name,
            'loopDuration', v_row.loop_duration,
            'isPracticed', v_row.is_practiced,
            'practicedAt', v_row.practiced_at,
            'createdAt', v_row.created_at,
            'updatedAt', v_row.updated_at
        )
    );
END;
$$;

-- 6. Autoritativer RPC: 'Geübt'-Status toggeln (Didaktischer Schüler-Loop)
CREATE OR REPLACE FUNCTION public.toggle_audio_marker_practiced(
    p_marker_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_school_id UUID;
    v_row RECORD;
    v_next_state BOOLEAN;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    v_caller_id := get_current_authenticated_user_id();
    v_school_id := get_current_user_school_id();

    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Nicht authentifiziert' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_row
    FROM public.campus_audio_markers
    WHERE id = p_marker_id
      AND is_deleted = false
      AND (is_master_admin() OR school_id = v_school_id);

    IF v_row.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Marker nicht gefunden');
    END IF;

    v_next_state := NOT v_row.is_practiced;

    UPDATE public.campus_audio_markers
    SET is_practiced = v_next_state,
        practiced_at = CASE WHEN v_next_state THEN v_now ELSE NULL END,
        updated_at = v_now
    WHERE id = p_marker_id
    RETURNING * INTO v_row;

    -- Audit Logging
    INSERT INTO public.audit_logs (
        school_id,
        user_id,
        action,
        details
    ) VALUES (
        v_school_id,
        v_caller_id,
        'AUDIO_TIMELINE_MARKER_PRACTICE_TOGGLED',
        jsonb_build_object(
            'marker_id', p_marker_id,
            'is_practiced', v_next_state,
            'timestamp', v_now
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'marker', jsonb_build_object(
            'id', v_row.id::text,
            'isPracticed', v_row.is_practiced,
            'practicedAt', v_row.practiced_at
        )
    );
END;
$$;

-- 7. Autoritativer RPC: Marker soft-deleten (Revisionssicher)
CREATE OR REPLACE FUNCTION public.delete_audio_timeline_marker(
    p_marker_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_school_id UUID;
    v_caller_role TEXT;
    v_row RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    v_caller_id := get_current_authenticated_user_id();
    v_school_id := get_current_user_school_id();
    v_caller_role := get_current_user_role();

    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Nicht authentifiziert' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_row
    FROM public.campus_audio_markers
    WHERE id = p_marker_id
      AND is_deleted = false
      AND (
          is_master_admin()
          OR author_id = v_caller_id
          OR (school_id = v_school_id AND v_caller_role IN ('teacher', 'admin'))
      );

    IF v_row.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Marker nicht gefunden oder keine Berechtigung');
    END IF;

    UPDATE public.campus_audio_markers
    SET is_deleted = true,
        updated_at = v_now
    WHERE id = p_marker_id;

    -- Audit Logging
    INSERT INTO public.audit_logs (
        school_id,
        user_id,
        action,
        details
    ) VALUES (
        v_school_id,
        v_caller_id,
        'AUDIO_TIMELINE_MARKER_DELETED',
        jsonb_build_object(
            'marker_id', p_marker_id,
            'audio_key', v_row.audio_key,
            'deleted_at', v_now
        )
    );

    RETURN jsonb_build_object('success', true);
END;
$$;
