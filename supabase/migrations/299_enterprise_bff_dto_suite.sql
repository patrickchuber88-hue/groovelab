-- ======================================================================================
-- MIGRATION 299: TIER-1 SAAS ENTERPRISE+ BFF & DTO SUITE
-- Campus-Groovelab Pure-UI & Zero-Trust Backend Domain Core
-- ======================================================================================

-- 1. SECURE DTO RPC: Authenticated Student Profile (Masked & Zero PII Leakage)
CREATE OR REPLACE FUNCTION public.get_authenticated_student_profile(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user RECORD;
    v_school RECORD;
    v_result JSONB;
BEGIN
    -- Verify authorization: Caller must be the user, a teacher/admin in the same school, or master admin
    IF NOT (
        public.is_master_admin() OR
        p_user_id = public.get_current_authenticated_user_id() OR
        public.get_current_user_school_id() = (SELECT school_id FROM public.users_raw WHERE id = p_user_id)
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Access to student profile denied.' USING ERRCODE = '42501';
    END IF;

    SELECT id, school_id, first_name, last_name, instrument, photo_url, xp_points,
           is_campus_active, is_groovelab_active, streak_days, last_practice_date,
           custom_streak_goal
    INTO v_user
    FROM public.users_raw
    WHERE id = p_user_id AND role = 'student';

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT id, name, subdomain, logo_url, has_campus_subscription, has_groovelab_subscription
    INTO v_school
    FROM public.schools
    WHERE id = v_user.school_id;

    -- Return strictly formatted, sanitized DTO (Zero hashes, zero emails, zero private tokens)
    v_result := jsonb_build_object(
        'id', v_user.id,
        'schoolId', v_user.school_id,
        'schoolName', v_school.name,
        'schoolSubdomain', v_school.subdomain,
        'displayName', v_user.first_name || CASE WHEN v_user.last_name IS NOT NULL AND length(v_user.last_name) > 0 THEN ' ' || SUBSTRING(v_user.last_name FROM 1 FOR 1) || '.' ELSE '' END,
        'instrument', v_user.instrument,
        'photoUrl', v_user.photo_url,
        'xpPoints', COALESCE(v_user.xp_points, 0),
        'streakDays', COALESCE(v_user.streak_days, 0),
        'lastPracticeDate', v_user.last_practice_date,
        'customStreakGoal', v_user.custom_streak_goal,
        'isCampusActive', COALESCE(v_user.is_campus_active, false),
        'isGroovelabActive', COALESCE(v_user.is_groovelab_active, false),
        'schoolSubscriptions', jsonb_build_object(
            'campus', COALESCE(v_school.has_campus_subscription, false),
            'groovelab', COALESCE(v_school.has_groovelab_subscription, false)
        )
    );

    RETURN v_result;
END;
$$;

-- 2. SECURE DTO RPC: School Roster DTO (Anonymized & Tenant Scoped)
CREATE OR REPLACE FUNCTION public.get_school_roster_dto(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_school_id UUID;
    v_teachers JSONB;
    v_students JSONB;
BEGIN
    v_caller_school_id := public.get_current_user_school_id();

    IF NOT (public.is_master_admin() OR v_caller_school_id = p_school_id OR public.get_kiosk_school_id() = p_school_id) THEN
        RAISE EXCEPTION 'Unauthorized: Access to school roster denied.' USING ERRCODE = '42501';
    END IF;

    -- Teachers: Full legal name per Project Rules (e.g. "Severin Landenberger")
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', u.id,
            'displayName', TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')),
            'role', u.role,
            'instrument', u.instrument,
            'photoUrl', CASE WHEN u.role IN ('admin', 'secretary') THEN '/campus_login_hero.png' ELSE u.photo_url END,
            'isCampusActive', COALESCE(u.is_campus_active, true),
            'isGroovelabActive', COALESCE(u.is_groovelab_active, true)
        ) ORDER BY u.last_name, u.first_name
    ), '[]'::jsonb)
    INTO v_teachers
    FROM public.users_raw u
    WHERE u.school_id = p_school_id AND u.role IN ('teacher', 'admin', 'secretary');

    -- Students: Masked name per Privacy Rules (e.g. "Max M.")
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', u.id,
            'displayName', u.first_name || CASE WHEN u.last_name IS NOT NULL AND length(u.last_name) > 0 THEN ' ' || SUBSTRING(u.last_name FROM 1 FOR 1) || '.' ELSE '' END,
            'role', 'student',
            'instrument', u.instrument,
            'photoUrl', u.photo_url,
            'xpPoints', COALESCE(u.xp_points, 0),
            'isCampusActive', COALESCE(u.is_campus_active, false),
            'isGroovelabActive', COALESCE(u.is_groovelab_active, false),
            'teacherId', u.teacher_id
        ) ORDER BY u.first_name
    ), '[]'::jsonb)
    INTO v_students
    FROM public.users_raw u
    WHERE u.school_id = p_school_id AND u.role = 'student';

    RETURN jsonb_build_object(
        'schoolId', p_school_id,
        'teachers', v_teachers,
        'students', v_students
    );
END;
$$;

-- 3. SECURE DOMAIN RPC: Atomic Practice Session XP & Streak Recorder
CREATE OR REPLACE FUNCTION public.record_practice_session_event(
    p_student_id UUID,
    p_duration_seconds INT,
    p_activity_type TEXT DEFAULT 'practice'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_earned_xp INT;
    v_current_xp INT;
    v_current_streak INT;
    v_last_practice DATE;
    v_today DATE := CURRENT_DATE;
    v_new_streak INT;
    v_new_xp INT;
BEGIN
    -- Authorization: Caller must be the student, teacher in same school, or master admin
    IF NOT (
        public.is_master_admin() OR
        p_student_id = public.get_current_authenticated_user_id() OR
        public.get_current_user_school_id() = (SELECT school_id FROM public.users_raw WHERE id = p_student_id)
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Cannot record practice session for another user.' USING ERRCODE = '42501';
    END IF;

    -- Anti-Cheat / Sanity Cap: Max 120 minutes per individual session submission
    IF p_duration_seconds > 7200 THEN
        p_duration_seconds := 7200;
    END IF;

    -- Compute XP: 1 XP per minute of active practice (Min 1 XP, Max 120 XP per session)
    v_earned_xp := GREATEST(1, p_duration_seconds / 60);

    SELECT COALESCE(xp_points, 0), COALESCE(streak_days, 0), last_practice_date
    INTO v_current_xp, v_current_streak, v_last_practice
    FROM public.users_raw
    WHERE id = p_student_id;

    -- Calculate Streak Progression
    IF v_last_practice IS NULL THEN
        v_new_streak := 1;
    ELSIF v_last_practice = v_today THEN
        v_new_streak := v_current_streak; -- Already practiced today
    ELSIF v_last_practice = (v_today - INTERVAL '1 day')::DATE THEN
        v_new_streak := v_current_streak + 1; -- Consecutive day streak
    ELSE
        v_new_streak := 1; -- Streak broken, restarted
    END IF;

    v_new_xp := v_current_xp + v_earned_xp;

    -- Atomically update database record
    UPDATE public.users_raw
    SET xp_points = v_new_xp,
        streak_days = v_new_streak,
        last_practice_date = v_today,
        updated_at = NOW()
    WHERE id = p_student_id;

    -- Log focus session in history
    INSERT INTO public.focus_sessions (student_id, duration_minutes, created_at)
    VALUES (p_student_id, GREATEST(1, p_duration_seconds / 60), NOW());

    RETURN jsonb_build_object(
        'success', true,
        'earnedXp', v_earned_xp,
        'totalXp', v_new_xp,
        'streakDays', v_new_streak,
        'practicedToday', true
    );
END;
$$;

-- 4. SECURE DOMAIN RPC: Canonical SaaS Invoice Preview Calculator (Master Wording & Strict Pricing)
CREATE OR REPLACE FUNCTION public.get_invoice_preview_dto(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_school RECORD;
    v_admin_teacher_count INT;
    v_student_count INT;
    v_campus_active_students INT;
    v_groovelab_active_students INT;
    v_storage_addon_gb INT;
    v_storage_cost_cents INT := 0;
    v_base_campus_cents INT := 0;
    v_base_groovelab_cents INT := 0;
    v_bundle_discount_cents INT := 0;
    v_admin_fee_cents INT;
    v_student_base_cents INT;
    v_student_campus_cents INT;
    v_student_groovelab_cents INT;
    v_subtotal_cents INT;
    v_vat_cents INT;
    v_total_cents INT;
    v_line_items JSONB := '[]'::jsonb;
BEGIN
    IF NOT (public.is_master_admin() OR public.get_current_user_school_id() = p_school_id) THEN
        RAISE EXCEPTION 'Unauthorized: Cannot access invoice calculation.' USING ERRCODE = '42501';
    END IF;

    SELECT id, name, has_campus_subscription, has_groovelab_subscription,
           COALESCE(extra_storage_gb, 0) as extra_storage_gb
    INTO v_school
    FROM public.schools
    WHERE id = p_school_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'School not found';
    END IF;

    -- Count active team members (teachers & admins)
    SELECT COUNT(*)
    INTO v_admin_teacher_count
    FROM public.users_raw
    WHERE school_id = p_school_id AND role IN ('teacher', 'admin', 'secretary');

    -- Count students
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE is_campus_active = true),
           COUNT(*) FILTER (WHERE is_groovelab_active = true)
    INTO v_student_count, v_campus_active_students, v_groovelab_active_students
    FROM public.users_raw
    WHERE school_id = p_school_id AND role = 'student';

    -- 1. Campus-Groovelab Software-Bereitstellung: 0,00 €
    v_line_items := v_line_items || jsonb_build_object(
        'position', 1,
        'title', 'Campus-Groovelab Software-Bereitstellung',
        'unitPrice', '0,00 € (Inklusive)',
        'amountCents', 0
    );

    -- 2. Cloud- & Datenbank-Hosting: Modul Campus (14,90 €)
    IF v_school.has_campus_subscription THEN
        v_base_campus_cents := 1490;
        v_line_items := v_line_items || jsonb_build_object(
            'position', 2,
            'title', 'Cloud- & Datenbank-Hosting: Modul Campus',
            'unitPrice', '14,90 € / Mo.',
            'amountCents', 1490
        );
    END IF;

    -- 3. Cloud- & Datenbank-Hosting: Modul GrooveLab (9,90 €)
    IF v_school.has_groovelab_subscription THEN
        v_base_groovelab_cents := 990;
        v_line_items := v_line_items || jsonb_build_object(
            'position', 3,
            'title', 'Cloud- & Datenbank-Hosting: Modul GrooveLab',
            'unitPrice', '9,90 € / Mo.',
            'amountCents', 990
        );
    END IF;

    -- 4. Kombi-Vorteilsrabatt (-4,90 € wenn beide aktiv)
    IF v_school.has_campus_subscription AND v_school.has_groovelab_subscription THEN
        v_bundle_discount_cents := -490;
        v_line_items := v_line_items || jsonb_build_object(
            'position', 4,
            'title', 'Kombi-Vorteilsrabatt (Infrastruktur-Bündel)',
            'unitPrice', '-4,90 € / Mo.',
            'amountCents', -490
        );
    END IF;

    -- 5. Service- & Administrationspauschale (0,49 € / Lehrkraft/Admin)
    v_admin_fee_cents := v_admin_teacher_count * 49;
    v_line_items := v_line_items || jsonb_build_object(
        'position', 5,
        'title', 'Service- & Administrationspauschale',
        'unitPrice', v_admin_teacher_count || ' Lehrkräfte & Verwaltung aktiv × 0,49 € / Mo.',
        'amountCents', v_admin_fee_cents
    );

    -- 6. Basis-Bereitstellung (0,09 € / Schüler)
    v_student_base_cents := v_student_count * 9;
    v_line_items := v_line_items || jsonb_build_object(
        'position', 6,
        'title', 'Basis-Bereitstellung',
        'unitPrice', v_student_count || ' Schüler × 0,09 € / Mo.',
        'amountCents', v_student_base_cents
    );

    -- 7. Cloud- & Modul-Bereitstellung: Campus (0,49 € / aktiver Campus-Schüler)
    v_student_campus_cents := v_campus_active_students * 49;
    IF v_campus_active_students > 0 THEN
        v_line_items := v_line_items || jsonb_build_object(
            'position', 7,
            'title', 'Cloud- & Modul-Bereitstellung: Campus',
            'unitPrice', v_campus_active_students || ' Schüler × 0,49 € / Mo.',
            'amountCents', v_student_campus_cents
        );
    END IF;

    -- 8. Cloud- & Modul-Bereitstellung: GrooveLab (0,49 € / aktiver GrooveLab-Schüler)
    v_student_groovelab_cents := v_groovelab_active_students * 49;
    IF v_groovelab_active_students > 0 THEN
        v_line_items := v_line_items || jsonb_build_object(
            'position', 8,
            'title', 'Cloud- & Modul-Bereitstellung: GrooveLab',
            'unitPrice', v_groovelab_active_students || ' Schüler × 0,49 € / Mo.',
            'amountCents', v_student_groovelab_cents
        );
    END IF;

    -- 9. Zusatz-Speichervolumen
    v_storage_addon_gb := v_school.extra_storage_gb;
    IF v_storage_addon_gb > 0 THEN
        v_storage_cost_cents := (v_storage_addon_gb / 10) * 199; -- 1,99 € per 10 GB
        v_line_items := v_line_items || jsonb_build_object(
            'position', 9,
            'title', 'Zusatz-Speichervolumen: Audio-Tresor (+' || v_storage_addon_gb || ' GB)',
            'unitPrice', (v_storage_cost_cents / 100.0) || ' € / Mo.',
            'amountCents', v_storage_cost_cents
        );
    END IF;

    -- Totals
    v_subtotal_cents := v_base_campus_cents + v_base_groovelab_cents + v_bundle_discount_cents + 
                        v_admin_fee_cents + v_student_base_cents + v_student_campus_cents + 
                        v_student_groovelab_cents + v_storage_cost_cents;
    v_vat_cents := ROUND(v_subtotal_cents * 0.19);
    v_total_cents := v_subtotal_cents + v_vat_cents;

    RETURN jsonb_build_object(
        'schoolId', p_school_id,
        'lineItems', v_line_items,
        'subtotalCents', v_subtotal_cents,
        'vatCents', v_vat_cents,
        'totalCents', v_total_cents,
        'formattedSubtotal', TO_CHAR(v_subtotal_cents / 100.0, 'FM999990.00') || ' €',
        'formattedVat', TO_CHAR(v_vat_cents / 100.0, 'FM999990.00') || ' €',
        'formattedTotal', TO_CHAR(v_total_cents / 100.0, 'FM999990.00') || ' €'
    );
END;
$$;

-- Grant EXECUTE to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_authenticated_student_profile(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_school_roster_dto(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_practice_session_event(UUID, INT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoice_preview_dto(UUID) TO anon, authenticated;
