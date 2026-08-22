-- ==============================================================================
-- MIGRATION 283: Enterprise+ Performance, GIN & Composite Indexes
-- Accelerates JSONB filtering, calendar matrix lookups, push routing, and catalog lists.
-- ==============================================================================

-- 1. GIN Indexes for high-frequency JSONB operations
CREATE INDEX IF NOT EXISTS idx_progress_matrix_homework_notes_gin 
ON public.progress_matrix USING gin (homework_notes);

CREATE INDEX IF NOT EXISTS idx_users_raw_notification_preferences_gin 
ON public.users_raw USING gin (notification_preferences);

CREATE INDEX IF NOT EXISTS idx_event_program_points_feedback_gin 
ON public.campus_event_program_points USING gin (additional_feedback_responses);

-- 2. Composite & Coverage Indexes for Schedule Matrix & Calendars
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_school_date_time 
ON public.schedule_occurrences (school_id, date, start_time);

CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_student_date 
ON public.schedule_occurrences (student_id, date);

CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_teacher_date 
ON public.schedule_occurrences (teacher_id, date);

CREATE INDEX IF NOT EXISTS idx_schedules_school_day_time 
ON public.schedules (school_id, day_of_week, time_slot);

CREATE INDEX IF NOT EXISTS idx_campus_events_school_date 
ON public.campus_events (school_id, event_date, start_time);

-- 3. Catalogs, Bands & Push Subscriptions
CREATE INDEX IF NOT EXISTS idx_lehrwerke_school_sort 
ON public.lehrwerke (school_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_songs_school_title 
ON public.songs (school_id, title);

CREATE INDEX IF NOT EXISTS idx_band_songs_band_created 
ON public.band_songs (band_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user 
ON public.push_subscriptions (user_id);

-- 4. User activity and school lookup composite index
CREATE INDEX IF NOT EXISTS idx_users_raw_school_active_role 
ON public.users_raw (school_id, is_active, role);

-- 5. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
