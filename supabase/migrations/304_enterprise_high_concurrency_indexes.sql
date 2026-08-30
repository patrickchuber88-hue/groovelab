-- ==============================================================================
-- MIGRATION 304: ENTERPRISE HIGH-CONCURRENCY COMPOSITE INDEXING SUITE
-- Sub-Millisecond Multi-Tenant Scaling for 100,000+ Students & Live Events
-- ==============================================================================

-- 1. Users Multi-Tenant Indexing
CREATE INDEX IF NOT EXISTS idx_users_raw_school_active 
ON public.users_raw(school_id, is_active);

CREATE INDEX IF NOT EXISTS idx_users_raw_role_active 
ON public.users_raw(role, is_active);

CREATE INDEX IF NOT EXISTS idx_users_raw_teacher_school 
ON public.users_raw(teacher_id, school_id) WHERE teacher_id IS NOT NULL;

-- 2. Schedules & Occurrences Performance
CREATE INDEX IF NOT EXISTS idx_schedules_school_teacher_day 
ON public.schedules(school_id, teacher_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_schedules_student 
ON public.schedules(student_id) WHERE student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_teacher_date 
ON public.schedule_occurrences(teacher_id, date);

CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_student_date 
ON public.schedule_occurrences(student_id, date);

-- 3. Direct Messaging Indexing
CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_recipient_unread 
ON public.campus_direct_messages(recipient_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_sender 
ON public.campus_direct_messages(sender_id, created_at DESC);

-- 4. Progress Matrix & Gamification Performance
CREATE INDEX IF NOT EXISTS idx_student_progress_matrix_user_status 
ON public.student_progress_matrix(user_id, status);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_student_created 
ON public.focus_sessions(student_id, created_at DESC);

-- 5. Kiosk & Station Hardware Fast-Lookup
CREATE INDEX IF NOT EXISTS idx_kiosks_secret_token 
ON public.kiosks(secret_token);

CREATE INDEX IF NOT EXISTS idx_stations_room_id 
ON public.stations(room_id);

-- 6. Merkle Audit Logs Index
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_created 
ON public.audit_logs(school_id, created_at DESC);

-- Reload Schema
NOTIFY pgrst, 'reload schema';
