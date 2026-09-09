-- ==============================================================================
-- 🏛️ MIGRATION 390: ENTERPRISE PERFORMANCE & HIGH-SPEED COVERING INDEXES
-- Standard: OWASP ASVS Level 3 / Sub-Millisecond Multi-Tenant Scaling
-- Target Tables: invoices, students, schedule_occurrences, users_raw, session_leases
-- ==============================================================================

-- 1. INVOICES DELINQUENCY & DUNNING ACCELERATION
-- Accelerates computeSchoolDunningStatus lookups on Teacher & Secretary Dashboards:
-- Query: .from('invoices').select('id, type, amount, status, billing_date, due_date, items').eq('school_id', schoolId)
CREATE INDEX IF NOT EXISTS idx_invoices_school_status_covering
ON public.invoices(school_id, status)
INCLUDE (id, type, amount, billing_date, due_date);

-- 2. PENDING STUDENTS ONBOARDING ACCELERATION
-- Accelerates pending student roster queries in pending_students_decrypted view:
-- Query: FROM public.students s WHERE s.status = 'ausstehend' AND s.school_id = ...
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_students_school_status_covering ON public.students(school_id, status) INCLUDE (id, teacher_id, instrument, created_at)';
        EXECUTE 'ANALYZE public.students';
    END IF;
END $$;

-- 3. SCHEDULE OCCURRENCES MULTI-TENANT CALENDAR ACCELERATION
-- Accelerates school-wide schedule scans in ScheduleDesigner & SecretaryRoomsView:
-- Query: .from('schedule_occurrences').select(...).eq('school_id', schoolId).gte('date', start).lte('date', end)
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_school_date_covering
ON public.schedule_occurrences(school_id, date)
INCLUDE (id, teacher_id, student_id, start_time, duration, status);

-- 4. USERS_RAW TEACHER ASSIGNED ROSTER ACCELERATION
-- Accelerates teacher assigned active student roster queries in TeacherDashboard:
-- Query: .from('users').select(...).eq('school_id', schoolId).eq('role', 'student').eq('teacher_id', userId)
CREATE INDEX IF NOT EXISTS idx_users_raw_school_role_teacher
ON public.users_raw(school_id, role, teacher_id)
WHERE is_active = true;

-- 5. SESSION LEASES ACTIVE DEVICE SECURITY ACCELERATION
-- Accelerates token verification in get_current_authenticated_user_id:
-- Query: .from('session_leases').select(...).eq('id', token).eq('device_key', deviceKey).eq('is_revoked', false)
CREATE INDEX IF NOT EXISTS idx_session_leases_id_device_active
ON public.session_leases(id, device_key)
WHERE is_revoked = false;

-- 6. KIOSK STUDENT QR-TOKEN FAST LOOKUP ACCELERATION
-- Accelerates kiosk check-in lookups in kiosk_student_checkin_view / check-in RPCs:
-- Query: WHERE qr_token = p_token
CREATE INDEX IF NOT EXISTS idx_users_raw_qr_token_partial
ON public.users_raw(qr_token)
WHERE qr_token IS NOT NULL;

-- 7. REFRESH QUERY PLANNER STATISTICS
ANALYZE public.invoices;
ANALYZE public.schedule_occurrences;
ANALYZE public.users_raw;
ANALYZE public.session_leases;

-- 7. NOTIFY POSTGREST SCHEMA CACHE RELOAD
NOTIFY pgrst, 'reload schema';
