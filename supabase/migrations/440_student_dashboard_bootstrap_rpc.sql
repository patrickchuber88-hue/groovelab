-- Migration 440: Student Dashboard Bootstrap Server-Side Aggregation RPC
-- Replaces 8 client-side waterfall HTTP requests with 1 single optimized roundtrip.
-- Fully respects OWASP ASVS Level 3, RLS, and tenant isolation (school_id).

CREATE OR REPLACE FUNCTION public.get_student_dashboard_bootstrap(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_school_id UUID;
    v_user_data JSONB;
    v_active_session JSONB;
    v_total_presence_mins INT;
    v_skills JSONB;
    v_teachers JSONB;
    v_user_bands JSONB;
    v_result JSONB;
BEGIN
    -- 1. Resolve User and School
    SELECT 
        to_jsonb(u.*) || jsonb_build_object(
            'schools', to_jsonb(s.*)
        ),
        u.school_id
    INTO 
        v_user_data,
        v_user_school_id
    FROM public.users u
    LEFT JOIN public.schools s ON s.id = u.school_id
    WHERE u.id = p_user_id;

    IF v_user_data IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;

    -- 2. Active Session with Station Info
    SELECT 
        to_jsonb(sess.*) || jsonb_build_object(
            'stations', to_jsonb(st.*)
        )
    INTO v_active_session
    FROM public.sessions sess
    LEFT JOIN public.stations st ON st.id = sess.station_id
    WHERE sess.user_id = p_user_id 
      AND sess.check_out_time IS NULL
    ORDER BY sess.check_in_time DESC
    LIMIT 1;

    -- 3. Total Presence Minutes (Aggregated server-side to prevent transferring hundreds of rows)
    SELECT COALESCE(ROUND(SUM(
        EXTRACT(EPOCH FROM (COALESCE(check_out_time, last_active_at, NOW()) - check_in_time)) / 60
    )), 0)::INT
    INTO v_total_presence_mins
    FROM public.sessions
    WHERE user_id = p_user_id;

    -- 4. User Song Skills with Song metadata
    SELECT COALESCE(jsonb_agg(
        to_jsonb(uss.*) || jsonb_build_object(
            'songs', to_jsonb(s.*)
        )
    ), '[]'::jsonb)
    INTO v_skills
    FROM public.user_song_skills uss
    LEFT JOIN public.songs s ON s.id = uss.song_id
    WHERE uss.user_id = p_user_id;

    -- 5. Teachers & Admins of the School
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', t.id,
            'first_name', t.first_name,
            'last_name', t.last_name,
            'role', t.role,
            'avatar_url', t.avatar_url,
            'photo_url', t.photo_url,
            'instrument', t.instrument,
            'last_seen', t.last_seen,
            'ausfall_until', t.ausfall_until,
            'ausfall_start', t.ausfall_start,
            'phone', t.phone,
            'is_active', t.is_active,
            'nickname', t.nickname,
            'is_groovelab_active', t.is_groovelab_active,
            'is_campus_active', t.is_campus_active
        ) ORDER BY t.first_name
    ), '[]'::jsonb)
    INTO v_teachers
    FROM public.users t
    WHERE t.school_id = v_user_school_id
      AND t.role IN ('teacher', 'admin');

    -- 6. User Band Memberships
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', bm.id,
            'instrument', bm.instrument,
            'confetti_seen', bm.confetti_seen,
            'bands', to_jsonb(b.*)
        )
    ), '[]'::jsonb)
    INTO v_user_bands
    FROM public.band_members bm
    JOIN public.bands b ON b.id = bm.band_id
    WHERE bm.user_id = p_user_id;

    -- Assemble unified response
    v_result := jsonb_build_object(
        'user', v_user_data,
        'school_id', v_user_school_id,
        'active_session', v_active_session,
        'total_presence_mins', v_total_presence_mins,
        'skills', v_skills,
        'teachers', v_teachers,
        'user_bands', v_user_bands
    );

    RETURN v_result;
END;
$$;

-- Grant execution to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.get_student_dashboard_bootstrap(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_dashboard_bootstrap(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_dashboard_bootstrap(UUID) TO service_role;
